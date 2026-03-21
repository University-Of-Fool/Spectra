use crate::service::api::result::{ApiResponse, ApiResult};
use crate::shadow;
use crate::types::{AppState, ToPermission, UserPermission};
use crate::{fail, success};
use axum::extract::State;
use axum_extra::extract::PrivateCookieJar;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::str::FromStr;

#[derive(Serialize)]
pub struct About {
    /// 构建时间
    build_date: String,
    /// 工作区是否干净
    clean: bool,
    /// 项目代码行数
    /// 使用 Value 是因为这个已经在编译时用 serde_json 序列化了，只要解析成 Value 就 ok
    code: Value,
    /// commit hash 前八位
    commit: String,
    /// 是否是 debug 构建
    debug: bool,
    /// 版本号
    version: String,
}

pub async fn get_information() -> axum::Json<ApiResponse<About>> {
    axum::Json(ApiResponse::from(About {
        build_date: shadow::BUILD_TIME_3339.to_string(),
        clean: shadow::GIT_CLEAN,
        code: serde_json::from_str(shadow::CODES).unwrap(),
        commit: shadow::SHORT_COMMIT.to_string(),
        debug: shadow_rs::is_debug(),
        version: shadow::PKG_VERSION.to_string(),
    }))
}

#[derive(Serialize)]
pub struct Config {
    turnstile_enabled: bool,
    turnstile_site_key: String,
}
pub async fn get_config(State(state): State<AppState>) -> axum::Json<ApiResponse<Config>> {
    let t_conf = state.runtime_config.load().turnstile.clone();
    let config = Config {
        turnstile_enabled: t_conf.enabled,
        turnstile_site_key: t_conf.site_key,
    };
    ApiResponse::from(config).into()
}

#[derive(Serialize)]
pub struct AdminConfig {
    setup: bool,
    cookie_key: String,
    refresh_time: String,
    domain: String,
    turnstile_enabled: bool,
    turnstile_site_key: String,
    turnstile_secret_key: String,
}

#[derive(Deserialize)]
pub struct AdminConfigUpdate {
    setup: Option<bool>,
    cookie_key: Option<String>,
    refresh_time: Option<String>,
    domain: Option<String>,
    turnstile_enabled: Option<bool>,
    turnstile_site_key: Option<String>,
    turnstile_secret_key: Option<String>,
}

pub async fn admin_get_config(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    let setup = state.runtime_config.load().setup;
    if setup {
        let token = jar.get("token").map(|c| c.value().to_string());
        if token.is_none() {
            fail!(401, "Unauthorized");
        }
        let user_token = state.user_tokens.get(&token.unwrap());
        if user_token.is_none() {
            fail!(401, "Unauthorized");
        }
        let current_user = state
            .database_accessor
            .get_user_by_id(&user_token.unwrap().user_id)
            .await
            .unwrap_or(None);
        if current_user.is_none()
            || !current_user
                .unwrap()
                .descriptor
                .contains(UserPermission::Manage)
        {
            fail!(403, "Forbidden");
        }
    }

    let rt = state.runtime_config.load();
    let config = AdminConfig {
        setup: rt.setup,
        cookie_key: rt.cookie_key.clone(),
        refresh_time: rt.refresh_time.clone(),
        domain: rt.domain.clone(),
        turnstile_enabled: rt.turnstile.enabled,
        turnstile_site_key: rt.turnstile.site_key.clone(),
        turnstile_secret_key: rt.turnstile.secret_key.clone(),
    };
    crate::success!(config)
}

pub async fn admin_set_config(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    axum::Json(update): axum::Json<AdminConfigUpdate>,
) -> ApiResult {
    let setup = state.runtime_config.load().setup;
    if setup {
        let token = jar.get("token").map(|c| c.value().to_string());
        if token.is_none() {
            fail!(401, "Unauthorized");
        }
        let user_token = state.user_tokens.get(&token.unwrap());
        if user_token.is_none() {
            fail!(401, "Unauthorized");
        }
        let current_user = state
            .database_accessor
            .get_user_by_id(&user_token.unwrap().user_id)
            .await
            .unwrap_or(None);
        if current_user.is_none()
            || !current_user
                .unwrap()
                .descriptor
                .contains(UserPermission::Manage)
        {
            fail!(403, "Forbidden");
        }
    }

    let mut new_config = (**state.runtime_config.load()).clone();
    let da = &state.database_accessor;

    if let Some(v) = update.setup {
        new_config.setup = v;
        let _ = da
            .set_sys_config("setup", if v { "true" } else { "false" })
            .await;
    }
    if let Some(ref v) = update.cookie_key {
        new_config.cookie_key = v.clone();
        let _ = da.set_sys_config("cookie_key", v).await;
        state
            .cookie_key
            .store(std::sync::Arc::new(axum_extra::extract::cookie::Key::from(
                v.as_bytes(),
            )));
    }
    if let Some(ref v) = update.domain {
        new_config.domain = v.clone();
        let _ = da.set_sys_config("domain", v).await;
    }
    if let Some(v) = update.turnstile_enabled {
        new_config.turnstile.enabled = v;
        let _ = da
            .set_sys_config("turnstile_enabled", if v { "true" } else { "false" })
            .await;
    }
    if let Some(ref v) = update.turnstile_site_key {
        new_config.turnstile.site_key = v.clone();
        let _ = da.set_sys_config("turnstile_site_key", v).await;
    }
    if let Some(ref v) = update.turnstile_secret_key {
        new_config.turnstile.secret_key = v.clone();
        let _ = da.set_sys_config("turnstile_secret_key", v).await;
    }
    if let Some(ref v) = update.refresh_time {
        let old_refresh = new_config.refresh_time.clone();
        new_config.refresh_time = v.clone();
        let _ = da.set_sys_config("refresh_time", v).await;

        if old_refresh != *v {
            if croner::Cron::from_str(v).is_ok() {
                let scheduler = state.cron_scheduler.clone();
                if let Some(old_job) = **state.cron_job_id.load() {
                    let _ = scheduler.remove(&old_job).await;
                }

                let da_clone = state.database_accessor.clone();
                let fa_clone = state.file_accessor.clone();
                if let Ok(job) = tokio_cron_scheduler::Job::new_async(v.as_str(), move |_, _| {
                    tracing::info!("Triggered scheduled task: refreshing database...");
                    let da = da_clone.clone();
                    let fa = fa_clone.clone();
                    Box::pin(async move {
                        let _ = da.refresh_db(fa).await;
                    })
                }) {
                    if let Ok(job_id) = scheduler.add(job).await {
                        state.cron_job_id.store(std::sync::Arc::new(Some(job_id)));
                    }
                }
            } else {
                fail!(400, "Invalid cron expression");
            }
        }
    }
    let c = new_config.clone();
    state.runtime_config.store(std::sync::Arc::new(new_config));
    success!(c)
}
