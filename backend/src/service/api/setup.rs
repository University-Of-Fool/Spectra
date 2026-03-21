use crate::fail;
use crate::service::api::result::ApiError;
use crate::service::api::result::ApiResult;
use crate::types::AppRuntimeConfig;
use crate::types::AppState;
use axum::body::Body;
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::IntoResponse;
use axum::response::Response;
use axum::{Json, extract::State};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::str::FromStr;

pub async fn setup_interceptor(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    if state.runtime_config.load().setup {
        ApiError::new(
            410,
            "This server is already set up. Access to setup api endpoints is forbidden."
                .to_string(),
        )
        .into_response()
    } else {
        next.run(request).await
    }
}

pub async fn get_existing_config() -> ApiResult {
    // use of wait() - i dont think when this function is called the config would not be loaded so theres no performance issue
    crate::success!(crate::CONFIG_STR.wait())
}

#[derive(Deserialize)]
pub struct ConfigUpdatePayload {
    refresh_time: String,
    domain: String,
    turnstile_enabled: bool,
    turnstile_site_key: String,
    turnstile_secret_key: String,
}

pub async fn update_config(
    State(state): State<AppState>,
    Json(payload): Json<ConfigUpdatePayload>,
) -> ApiResult {
    if state.runtime_config.load().setup {
        fail!(
            410,
            "This server is already set up. Access to setup api endpoints is forbidden."
        );
    }

    let mut new_config = (**state.runtime_config.load()).clone();
    let da = &state.database_accessor;

    // setup shouldnt be set now

    // new_config.setup = payload.setup;
    // let _ = da
    //     .set_sys_config("setup", if payload.setup { "true" } else { "false" })
    //     .await;

    // new_config.cookie_key = payload.cookie_key.clone();
    let cookie_key = crate::util::random_string(
        64,
        Some("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"),
    );
    let _ = da.set_sys_config("cookie_key", &cookie_key).await;
    state
        .cookie_key
        .store(std::sync::Arc::new(axum_extra::extract::cookie::Key::from(
            cookie_key.as_bytes(),
        )));

    new_config.domain = payload.domain.clone();
    let _ = da.set_sys_config("domain", &payload.domain).await;

    new_config.turnstile.enabled = payload.turnstile_enabled;
    let _ = da
        .set_sys_config(
            "turnstile_enabled",
            if payload.turnstile_enabled {
                "true"
            } else {
                "false"
            },
        )
        .await;

    new_config.turnstile.site_key = payload.turnstile_site_key.clone();
    let _ = da
        .set_sys_config("turnstile_site_key", &payload.turnstile_site_key)
        .await;

    new_config.turnstile.secret_key = payload.turnstile_secret_key.clone();
    let _ = da
        .set_sys_config("turnstile_secret_key", &payload.turnstile_secret_key)
        .await;

    if new_config.refresh_time != payload.refresh_time {
        if croner::Cron::from_str(&payload.refresh_time).is_ok() {
            let scheduler = state.cron_scheduler.clone();
            if let Some(old_job) = **state.cron_job_id.load() {
                let _ = scheduler.remove(&old_job).await;
            }

            let da_clone = state.database_accessor.clone();
            let fa_clone = state.file_accessor.clone();
            if let Ok(job) =
                tokio_cron_scheduler::Job::new_async(payload.refresh_time.as_str(), move |_, _| {
                    tracing::info!("Triggered scheduled task: refreshing database...");
                    let da = da_clone.clone();
                    let fa = fa_clone.clone();
                    Box::pin(async move {
                        let _ = da.refresh_db(fa).await;
                    })
                })
            {
                if let Ok(job_id) = scheduler.add(job).await {
                    state.cron_job_id.store(std::sync::Arc::new(Some(job_id)));
                }
            }
            new_config.refresh_time = payload.refresh_time.clone();
            let _ = da
                .set_sys_config("refresh_time", &payload.refresh_time)
                .await;
        } else {
            crate::fail!(400, "Invalid cron expression");
        }
    }

    state.runtime_config.store(std::sync::Arc::new(new_config));
    crate::success!(())
}

#[derive(Deserialize)]
pub struct AdminSetupPayload {
    name: String,
    email: String,
    password: Option<String>,
    avatar: Option<String>,
}

pub async fn admin_setup(
    State(state): State<AppState>,
    Json(payload): Json<AdminSetupPayload>,
) -> ApiResult {
    if state.runtime_config.load().setup {
        fail!(
            410,
            "This server is already set up. Access to setup api endpoints is forbidden."
        );
    }

    let root_id = "00000000-0000-0000-0000-000000000000";
    let existing_user = state
        .database_accessor
        .get_user_by_id(root_id)
        .await
        .unwrap_or(None);

    if let Some(user) = existing_user {
        let password_hash = if let Some(p) = payload.password {
            format!("{:x}", Sha256::digest(p.as_bytes()))
        } else {
            user.password
        };

        match state
            .database_accessor
            .update_user_info(
                root_id,
                &payload.name,
                &payload.email,
                payload.avatar,
                &password_hash,
            )
            .await
        {
            Ok(_) => crate::success!(()),
            Err(e) => {
                tracing::error!("Failed to update root user: {}", e);
                crate::fail!(500, "Database error")
            }
        }
    } else {
        crate::fail!(404, "Root user not found")
    }
}

pub async fn upload_setup_avatar(
    State(state): State<AppState>,
    mut multipart: axum::extract::Multipart,
) -> ApiResult {
    let mut field = None;
    let mut original_filename = String::new();
    while let Some(inner_field) = multipart.next_field().await.unwrap_or(None) {
        if inner_field.name().unwrap_or("") != "file" {
            continue;
        }
        if let Some(name) = inner_field.file_name() {
            original_filename = name.to_string();
        }
        if let Ok(bytes) = inner_field.bytes().await {
            field = Some(bytes);
        }
    }

    if field.is_none() {
        fail!(400, "No 'file' field found in multipart");
    }

    let data = Box::new(field.unwrap());
    let (ext, img) = infer::get(&data)
        .map(|x| (x.extension(), x.mime_type().starts_with("image")))
        .unwrap_or(("bin", false));

    if !img {
        fail!(400, "Avatar must be an image");
    }

    let short_path = loop {
        let p = crate::util::random_string(
            4,
            Some("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"),
        );
        if state
            .database_accessor
            .item_exists(&p)
            .await
            .unwrap_or(true)
            == false
        {
            break p;
        }
    };

    let filename_id = uuid::Uuid::now_v7().as_hyphenated().to_string();
    let filename = format!("{}.{}", filename_id, ext);
    let fa_clone = state.file_accessor.clone();

    if let Err(e) = fa_clone.write_file(filename.clone(), &data).await {
        tracing::error!("Failed to write file: {}", e);
        crate::fail!(500, "Failed to write file");
    }

    let item = match state
        .database_accessor
        .create_item(
            &short_path,
            crate::types::ItemType::File,
            &filename,
            None,
            None,
            None,
            Some(&original_filename),
            Some("00000000-0000-0000-0000-000000000000"),
        )
        .await
    {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to create item in db: {}", e);
            crate::fail!(500, "Database error");
        }
    };

    let _ = state
        .database_accessor
        .update_item_img(&item.id, true)
        .await;

    #[derive(serde::Serialize)]
    struct UploadResult {
        short_path: String,
    }

    crate::success!(UploadResult { short_path })
}

// Set `setup` to true
pub async fn finish_setup(State(state): State<AppState>) -> ApiResult {
    let a = AppRuntimeConfig {
        setup: true,
        ..state.runtime_config.load_full().as_ref().clone()
    };
    state.runtime_config.store(std::sync::Arc::new(a));
    state
        .database_accessor
        .set_sys_config("setup", "true")
        .await?;
    crate::success!(())
}
