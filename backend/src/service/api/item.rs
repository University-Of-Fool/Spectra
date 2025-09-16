use crate::service::api::result::{ApiError, ApiJson, ApiPath, ApiQuery, ApiResult};
use crate::service::api::types::{ApiCode, ApiItemFull, ApiItemUpload, ItemSimplified};
use crate::types::{AppState, ItemType, ToPermission, Token, User, UserPermission};
use crate::{fail, success};
use axum::extract::{Multipart, State};
use axum_extra::extract::PrivateCookieJar;
use cookie::Cookie;
use cookie::time::Duration;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tracing::{debug, info, instrument};
use uuid::Uuid;

async fn try_get_user(state: &AppState, jar: &PrivateCookieJar) -> Option<User> {
    let token = jar
        .get("token")
        .and_then(|token| state.user_tokens.get(token.value()))?;
    if token.is_expired() {
        return None;
    }
    state
        .database_accessor
        .get_user_by_id(&token.user_id)
        .await
        .ok()?
}

#[instrument(skip(state, jar))]
pub async fn get_item(
    ApiPath(item_path): ApiPath<String>,
    jar: PrivateCookieJar,
    State(state): State<AppState>,
    ApiQuery(params): ApiQuery<HashMap<String, String>>,
) -> ApiResult {
    info!("Attempting to get item with path: {}", item_path);
    let detailed = params.get("detailed").is_some_and(|x| x == "true");
    let item = state.database_accessor.get_item(&item_path).await?;

    if item.is_none() {
        fail!(404, "Item not found");
    }

    let item = item.unwrap();

    info!("Item found with path: {}", item_path);
    if item.password_hash.is_none() {
        if detailed {
            success!(ApiItemFull::from(item));
        } else {
            success!(ItemSimplified::from(item));
        };
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
            debug!(
                "Password authentication result for item {}: {}",
                item_path,
                match_result
            );
            match_result
        })
    } else {
        false
    };
    if user_auth || password_auth { info!("Authentication successful for item {}", item_path);
        if detailed {
            success!(ApiItemFull::from(item_clone));
        } else {
            success!(ItemSimplified::from(item_clone));
        }
    } else {
        info!("Authentication failed for item {}", item_path);
        fail!(401, "Authentication required");
    }
}

#[instrument(skip(state, jar))]
pub async fn get_code(
    ApiPath(item_path): ApiPath<String>,
    jar: PrivateCookieJar,
    State(state): State<AppState>,
    ApiQuery(params): ApiQuery<HashMap<String, String>>,
) -> ApiResult {
    let item = state.database_accessor.get_item(&item_path).await?;
    if item.is_none() {
        fail!(404, "Item not found");
    }
    let item = item.unwrap();
    if item.item_type != ItemType::Code {
        fail!(400, "Item is not a Code");
    }
    if item.password_hash.is_none() {
        success!(ApiCode::read_from(item, state.file_accessor.clone()).await);
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
        success!(ApiCode::read_from(item_clone, state.file_accessor.clone()).await)
    } else {
        fail!(401, "Authentication required");
    }
}

#[instrument(skip(state, jar))]
pub async fn create_item(
    ApiPath(path): ApiPath<String>,
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    ApiQuery(query): ApiQuery<HashMap<String, String>>,
    ApiJson(body): ApiJson<ApiItemUpload>,
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
        fail!(409, "Item already exists");
    }

    // 如果 Turnstile 结果已提供且验证出错会直接返回；此值为 false 说明需要用户验证
    let turnstile = if state.turnstile.enabled {
        if let Some(token) = query.get("turnstile-token") {
            let resp = crate::util::check_turnstile(&state.turnstile.secret_key, token).await?;
            if resp.0 {
                true
            } else {
                fail!(422, "Turnstile error: {}", resp.1.join(", "));
            }
        } else {
            false
        }
    } else {
        false
    };

    if turnstile && path.as_str() != "__RANDOM__" {
        fail!(
            403,
            "Guest users are not allowed to create items at customized paths"
        );
    }

    let user = try_get_user(&state, &jar).await;
    if user.is_none() && !turnstile {
        fail!(401, "Unauthorized");
    }
    let user_id_clone = user.as_ref().map(|user| user.id.clone());
    if let Some(user) = user {
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
    let id = if turnstile {
        format!("guest-{}", Uuid::now_v7().as_hyphenated().to_string())
    } else {
        user_id_clone.unwrap()
    };

    let path = if path.as_str() != "__RANDOM__" {
        path
    } else {
        loop {
            let random_path = crate::util::random_string(
                4,
                Some("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ124567890"),
            );
            if state.database_accessor.item_exists(&random_path).await? {
                continue;
            }
            break random_path;
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
            Some(&id),
        )
        .await?;

    if turnstile && body.item_type == ItemType::File {
        info!("Guest user {} created item at path {}", id, path);
        let token = crate::util::random_password();
        let _ = state
            .user_tokens
            .insert(token.clone(), Token::new(id, true));
        let jar = jar.remove("token").add(
            Cookie::build(("token", token.clone()))
                .max_age(Duration::new(600, 0))
                .http_only(true)
                .path("/")
                .build(),
        );
        success!(ItemSimplified::from(item), jar)
    } else {
        success!(ItemSimplified::from(item))
    }
}

#[instrument(skip(state, jar, multipart))]
pub async fn upload_file(
    ApiPath(path): ApiPath<String>,
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    mut multipart: Multipart,
) -> ApiResult {
    info!("Attempting to upload file to item at path: {}", path);

    // 先消费 multipart，避免返回错误时客户端未传输完毕，导致出现 connection reset
    let mut field = None;
    while let Some(inner_field) = multipart.next_field().await? {
        if inner_field.name().unwrap_or("").to_string() != "file" {
            continue;
        }
        field = Some(inner_field.bytes().await?);
    }

    let item = state.database_accessor.get_item(&path).await?;
    if item.is_none() {
        fail!(404, "Item not found");
    }
    let item = item.unwrap();

    let token = if let Some(x) = jar.get("token") {
        x.value().to_string()
    } else {
        info!("No token found in cookie");
        fail!(401, "Unauthorized");
    };

    // 显式限制 user_token（which 是从哈希表里取出的）的作用域以避免产生死锁
    let token_temporary = {
        let user_token = state.user_tokens.get(&token);
        if user_token.is_none() {
            fail!(401, "Unauthorized");
        }
        let user_token = user_token.unwrap();
        let info = if !user_token.temporary {
            let user = state
                .database_accessor
                .get_user_by_id(&user_token.user_id)
                .await?;
            if user.is_none() {
                fail!(401, "Unauthorized");
            }
            let user = user.unwrap();
            (user.descriptor, user.id, false)
        } else {
            (0_i64, user_token.user_id.clone(), true)
        };

        info!(
            "User {} is attempting to upload file to path: {}",
            info.1, path
        );

        if !info.0.contains(UserPermission::Manage)
            && !item.creator.clone().is_some_and(|x| info.1 == x)
        {
            info!(
                "User {} has no sufficient permission to upload file to path: {}",
                info.1, path
            );
            fail!(403, "No sufficient permission");
        }

        info.2
    };

    let item_type_clone = item.item_type.clone();
    if item_type_clone != ItemType::File {
        debug!("Item at path {} is not a File, upload failed", path);
        fail!(409, "Item is not a File");
    }

    if field.is_none() {
        info!("No part named 'file' uploaded to item at path: {}", path);
        fail!(400, "No part named 'file' uploaded");
    }
    let data = Box::new(field.unwrap());
    let filename_id = Uuid::now_v7().as_hyphenated().to_string();
    let fa_clone = state.file_accessor.clone();
    let (ext, img) = infer::get(&data)
        .map(|x| (x.extension(), x.mime_type().starts_with("image")))
        .unwrap_or(("bin", false));
    let filename = format!("{}.{}", filename_id, ext);
    let filename_clone = filename.clone();
    info!("File uploaded successfully to item at path: {}", path);
    fa_clone.write_file(filename_clone, &data).await?;
    state
        .database_accessor
        .update_item_data(&item.id, &filename)
        .await?;
    state
        .database_accessor
        .update_item_img(&item.id, img)
        .await?;

    if !token_temporary {
        success!(ItemSimplified::from(item))
    } else {
        // 这里 token 是 cookie 的值，并且和 user_token 的键名一样
        state.user_tokens.remove(&token);
        let jar = jar.remove("token");
        success!(ItemSimplified::from(item), jar)
    }
}

#[instrument(skip(state, jar))]
pub async fn remove_item(
    ApiPath(path): ApiPath<String>,
    State(state): State<AppState>,
    jar: PrivateCookieJar,
) -> ApiResult {
    let item = state.database_accessor.get_item(&path).await?;
    if item.is_none() {
        fail!(404, "Item not found");
    }
    let item = item.unwrap();

    let user = try_get_user(&state, &jar).await;
    if user.is_none() {
        fail!(401, "Invalid token");
    }
    let user = user.unwrap();
    info!(
        "User {} is attempting to delete item at path: {}",
        user.id, path
    );
    if !user.descriptor.contains(UserPermission::Manage)
        && !item.creator.clone().is_some_and(|x| user.id == x)
    {
        info!(
            "User {} has no sufficient permission to delete item at path: {}",
            user.id, path
        );
        fail!(403, "No sufficient permission");
    }
    state.database_accessor.remove_item(&item.id).await?;
    if item.item_type == ItemType::File || item.item_type == ItemType::Code {
        state.file_accessor.remove_file(&item.data).await?;
    }
    success!(ItemSimplified::from(item))
}

#[instrument(skip(state, jar))]
pub async fn get_user_items(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    ApiQuery(params): ApiQuery<HashMap<String, String>>,
) -> ApiResult {
    let user=try_get_user(&state, &jar).await;
    if user.is_none() {
        fail!(401, "Invalid or missing token");
    }
    let user=user.unwrap();
    if params
        .get("user")
        .is_some_and(|x| &user.id != x && !user.descriptor.contains(UserPermission::Manage))
    {
        fail!(403, "Insufficient permission");
    }
    let items = state
        .database_accessor
        .get_user_items(params.get("user").unwrap_or(&user.id))
        .await?
        .into_iter()
        .map(|x| ItemSimplified::from(x))
        .collect::<Vec<_>>();
    success!(items)
}

#[instrument(skip(state, jar))]
pub async fn get_user_img_items(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    ApiQuery(params): ApiQuery<HashMap<String, String>>,
) -> ApiResult {
    let user=try_get_user(&state, &jar).await;
    if user.is_none() {
        fail!(401, "Invalid or missing token");
    }
    let user=user.unwrap();
    if params
        .get("user")
        .is_some_and(|x| &user.id != x && !user.descriptor.contains(UserPermission::Manage))
    {
        fail!(403, "Insufficient permission");
    }
    let items = state
        .database_accessor
        .get_user_img_items(params.get("user").unwrap_or(&user.id))
        .await?
        .into_iter()
        .map(|x| ItemSimplified::from(x))
        .collect::<Vec<_>>();
    success!(items)
}

#[instrument(skip(state, jar))]
pub async fn get_all_items(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    let user = try_get_user(&state, &jar).await;
    if user.is_none() {
        fail!(401, "Unauthorized");
    }
    if !user.unwrap().descriptor.contains(UserPermission::Manage) {
        fail!(403, "Insufficient permission");
    }
    let items = state
        .database_accessor
        .get_all_items()
        .await?
        .into_iter()
        .map(|x| ItemSimplified::from(x))
        .collect::<Vec<_>>();
    success!(items)
}
