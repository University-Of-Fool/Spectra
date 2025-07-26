use crate::service::api::result::{ApiError, ApiResult};
use crate::service::api::types::{ApiCode, ItemSimplified};
use crate::success;
use crate::types::{AppState, ItemType};
use axum::extract::{Path, Query, State};
use axum_extra::extract::PrivateCookieJar;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tracing::{debug, info, instrument};

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
    let user_auth = jar.get("token").is_some_and(|token| {
        let auth_result = state.user_tokens.get(token.value()).is_some_and(|user| {
            !user.is_expired()
                && (item.creator.is_some_and(|creator| creator == user.user_id)
                    || &user.user_id == "00000000-0000-0000-0000-000000000000")
            // 空 UUID 是管理员用户，有访问所有项目的权限
        });
        // 记录用户认证结果
        tracing::debug!(
            "User authentication result for token {}: {}",
            token.value(),
            auth_result
        );
        auth_result
    });
    let password_auth = if !user_auth {
        let password_check = params.get("password").is_some_and(|password| {
            let password_hash = format!("{:x}", Sha256::digest(password.as_bytes()));
            let match_result = &password_hash == item.password_hash.as_ref().unwrap();
            // 记录密码认证结果
            tracing::debug!(
                "Password authentication result for item {}: {}",
                item_path,
                match_result
            );
            match_result
        });
        password_check
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
    let user_auth = jar.get("token").is_some_and(|token| {
        state.user_tokens.get(token.value()).is_some_and(|user| {
            !user.is_expired() && (item.creator.is_some_and(|creator| creator == user.user_id)
                || &user.user_id == "00000000-0000-0000-0000-000000000000")
        })
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
