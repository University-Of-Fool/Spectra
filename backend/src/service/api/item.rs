use crate::service::api::result::{ApiError, ApiResult};
use crate::service::api::types::{ApiCode, ApiItemUpload, ItemSimplified};
use crate::success;
use crate::types::{AppState, ItemType, ToPermission, User, UserPermission};
use axum::Json;
use axum::extract::{Multipart, Path, Query, State};
use axum_extra::extract::PrivateCookieJar;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tracing::{debug, info, instrument};
use uuid::Uuid;

async fn try_get_user(state: &AppState, jar: &PrivateCookieJar) -> Option<User> {
    let token = jar
        .get("token")
        .and_then(|token| state.user_tokens.get(token.value()));
    if token.is_none() {
        return None;
    }
    let token = token.unwrap();
    if token.is_expired() {
        return None;
    }
    // 真是搞不懂所有权规则有些时候真的莫名其妙明明可以用一个 if 完成的要拆成两个
    if let Ok(user) = state.database_accessor.get_user_by_id(&token.user_id).await {
        user
    } else {
        None
    }
}

#[instrument(skip(state, jar))]
pub async fn get_item(
    Path(item_path): Path<String>,
    jar: PrivateCookieJar,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> ApiResult {
    info!("Attempting to get item with path: {}", item_path);

    let item = state.database_accessor.get_item(&item_path).await?;

    if item.is_none() {
        return Err(ApiError::new(404, "Item not found".to_string()));
    }

    let item = item.unwrap();

    info!("Item found with path: {}", item_path);
    if item.password_hash.is_none() {
        return Ok(success!(ItemSimplified::from(item)));
    }

    debug!("Item has a password hash, checking authentication");
    let item_clone = item.clone();
    // 使用 try_get_user 函数进行用户认证
    let user = try_get_user(&state, &jar).await;
    let user_auth = user.is_some_and(|user| {
        item.creator.is_some_and(|creator| creator == user.id)
            || &user.id == "00000000-0000-0000-0000-000000000000"
    });
    let password_auth = if !user_auth {
        params.get("password").is_some_and(|password| {
            let password_hash = format!("{:x}", Sha256::digest(password.as_bytes()));
            let match_result = &password_hash == item.password_hash.as_ref().unwrap();
            // 记录密码认证结果
            tracing::debug!(
                "Password authentication result for item {}: {}",
                item_path,
                match_result
            );
            match_result
        })
    } else {
        false
    };
    if user_auth || password_auth {
        tracing::info!("Authentication successful for item {}", item_path);
        Ok(success!(ItemSimplified::from(item_clone)))
    } else {
        tracing::info!("Authentication failed for item {}", item_path);
        Err(ApiError::new(401, "Authentication required".to_string()))
    }
}

#[instrument(skip(state, jar))]
pub async fn get_code(
    Path(item_path): Path<String>,
    jar: PrivateCookieJar,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> ApiResult {
    let item = state.database_accessor.get_item(&item_path).await?;
    if item.is_none() {
        return Err(ApiError::new(404, "Item not found".to_string()));
    }
    let item = item.unwrap();
    if item.item_type != ItemType::Code {
        return Err(ApiError::new(400, "Item is not a Code".to_string()));
    }
    if item.password_hash.is_none() {
        return Ok(success!(
            ApiCode::read_from(item, state.file_accessor.clone()).await
        ));
    }
    let item_clone = item.clone();
    // 使用 try_get_user 函数进行用户认证
    let user = try_get_user(&state, &jar).await;
    let user_auth = user.is_some_and(|user| {
        item.creator.is_some_and(|creator| creator == user.id)
            || &user.id == "00000000-0000-0000-0000-000000000000"
    });
    let password_auth = if !user_auth {
        params.get("password").is_some_and(|password| {
            let password_hash = format!("{:x}", Sha256::digest(password.as_bytes()));
            &password_hash == item.password_hash.as_ref().unwrap()
        })
    } else {
        false
    };
    if user_auth || password_auth {
        Ok(success!(
            ApiCode::read_from(item_clone, state.file_accessor.clone()).await
        ))
    } else {
        Err(ApiError::new(401, "Authentication required".to_string()))
    }
}

#[instrument(skip(state, jar))]
pub async fn create_item(
    Path(path): Path<String>,
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(body): Json<ApiItemUpload>,
) -> ApiResult {
    info!("Attempting to create item at path: {}", path);
    let expires_at = if let Some(x) = body.expires_at {
        // 这里不用 .map 是因为在闭包里用不了 ? 操作符
        Some(
            x.parse::<chrono::DateTime<chrono::Utc>>()
                .map_err(|e| ApiError::new(400, e.to_string()))?
                .with_timezone(&chrono::Local)
                .naive_local(),
        )
    } else {
        None
    };

    if state.database_accessor.item_exists(&path).await? {
        info!("Item already exists at path: {}", path);
        return Err(ApiError::new(409, "Item already exists".to_string()));
    }

    let user = try_get_user(&state, &jar).await;
    if user.is_none() {
        return Err(ApiError::new(401, "Unauthorized".to_string()));
    }
    let user = user.unwrap();
    info!(
        "User {} is attempting to create item at path: {}",
        user.id, path
    );
    // 权限鉴定，如果不符合条件会直接返回 Err
    if !user.descriptor.contains(UserPermission::Manage) {
        fn check_permission(user: &User, item_type: ItemType) -> Result<(), ApiError> {
            let required_permission = match item_type {
                ItemType::Code => UserPermission::Code,
                ItemType::File => UserPermission::File,
                ItemType::Link => UserPermission::Link,
            };

            if !user.descriptor.contains(required_permission) {
                return Err(ApiError::new(403, "Forbidden".to_string()));
            }
            Ok(())
        }
        check_permission(&user, body.item_type)?;
    }

    // 权限鉴定通过，继续处理创建逻辑
    let data = match body.item_type {
        ItemType::Code => {
            let filename = format!("{}.txt", Uuid::now_v7());
            state
                .file_accessor
                .write_file(filename.clone(), body.data.as_bytes())
                .await?;
            debug!("File {} written for Code item at path {}", filename, path);
            filename
        }
        ItemType::File => {
            let filename = "dummy_file.txt".to_string();
            debug!(
                "Using dummy file {} for File item at path {}",
                filename, path
            );
            filename
        }
        ItemType::Link => {
            debug!(
                "Using provided link {} for Link item at path {}",
                body.data, path
            );
            body.data
        }
    };
    let item = state
        .database_accessor
        .create_item(
            &path,
            body.item_type,
            &data,
            expires_at,
            body.max_visits,
            body.password
                .map(|x| format!("{:x}", Sha256::digest(x.as_bytes())))
                .as_deref(),
            body.extra_data.as_deref(),
            Some(&user.id),
        )
        .await?;
    Ok(success!(ItemSimplified::from(item)))
}

#[instrument(skip(state, jar, multipart))]
pub(crate) async fn upload_file(
    Path(path): Path<String>,
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    mut multipart: Multipart,
) -> ApiResult {
    info!("Attempting to upload file to item at path: {}", path);

    let item = state.database_accessor.get_item(&path).await?;
    if item.is_none() {
        return Err(ApiError::new(404, "Item not found".to_string()));
    }
    let item = item.unwrap();

    let user = try_get_user(&state, &jar).await;
    if user.is_none() {
        return Err(ApiError::new(401, "Unauthorized".to_string()));
    }
    let user = user.unwrap();
    info!(
        "User {} is attempting to upload file to path: {}",
        user.id, path
    );

    if !user.descriptor.contains(UserPermission::Manage)
        && !item.creator.clone().is_some_and(|x| user.id == x)
    {
        info!(
            "User {} has no sufficient permission to upload file to path: {}",
            user.id, path
        );
        return Err(ApiError::new(403, "No sufficient permission".to_string()));
    }

    let item_type_clone = item.item_type.clone();
    if item_type_clone != ItemType::File {
        debug!("Item at path {} is not a File, upload failed", path);
        return Err(ApiError::new(409, "Item is not a File".to_string()));
    }

    while let Some(field) = multipart.next_field().await? {
        if field.name().unwrap().to_string() == "file" {
            let filename_id = Uuid::now_v7().as_hyphenated().to_string();
            let fa_clone = state.file_accessor.clone();
            let data = Box::new(field.bytes().await?);
            let ext = infer::get(&data).map(|x| x.extension()).unwrap_or("bin");
            let filename = format!("{}.{}", filename_id, ext);
            let filename_clone = filename.clone();
            info!("File uploaded successfully to item at path: {}", path);
            tokio::spawn(async move { fa_clone.write_file(filename_clone, &data).await });
            state
                .database_accessor
                .update_item_data(&item.id, &filename)
                .await?;
            // 因为能到这里已经保证 item 存在，所以unwrap 是安全的
            return Ok(success!(ItemSimplified::from(item)));
        }
    }
    info!("No part named 'file' uploaded to item at path: {}", path);
    Err(ApiError::new(
        400,
        "No part named 'file' uploaded".to_string(),
    ))
}
