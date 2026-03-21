use crate::service::api::result::{ApiError, ApiResult};
use crate::service::api::types::{ApiList, ApiUser, ApiUserCreate};
use crate::types::{AppState, ToPermission, Token, UserPermission};
use crate::{fail, success};
use axum::Json;
use axum::extract::{Path, State};
use axum_extra::extract::PrivateCookieJar;
use axum_extra::extract::cookie::Cookie;
use cookie::time::Duration;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tracing::{debug, instrument};
use uuid::Uuid;

#[instrument(skip(state, jar))]
pub async fn login(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(payload): Json<Value>,
) -> ApiResult {
    if payload.is_object() && payload.get("email").is_some() && payload.get("password").is_some() {
        let email = payload
            .get("email")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ApiError::new(400, "Invalid email format".to_string()))?;
        let password = payload
            .get("password")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ApiError::new(400, "Invalid password format".to_string()))?;
        let user = state.database_accessor.get_user_by_email(email).await?;
        debug!("{:?}", user);
        if user.as_ref().is_some_and(|user| {
            user.password == format!("{:x}", Sha256::digest(password.as_bytes()))
        }) {
            let user = user.unwrap();
            let token = crate::util::random_password();
            let _ = state
                .user_tokens
                .insert(token.clone(), Token::new(user.id.clone(), false));
            let jar = jar.remove("token").add(
                Cookie::build(("token", token.clone()))
                    .max_age(Duration::new(600, 0))
                    .http_only(true)
                    .path("/")
                    .build(),
            );
            let api_user = ApiUser::from_user(user, &state.database_accessor).await?;
            success!(api_user, jar);
        }
        fail!(401, "Invalid email or password");
    }
    fail!(400, "Invalid request")
}

pub async fn logout(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    // 在服务器端的 hashmap 中移除 token（如果有）
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_some() {
        state.user_tokens.remove(&token.unwrap());
    }

    // 移除用户的 token cookie
    let jar = jar.remove("token");
    success!((), jar)
}

#[instrument(skip(state, jar))]
pub async fn user_info(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = token.unwrap();
    let user = state.user_tokens.get(&token);
    if user.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = user.unwrap();
    let user = state
        .database_accessor
        .get_user_by_id(&token.user_id)
        .await?;
    if user.is_none() {
        fail!(401, "Unauthorized");
    }
    let api_user = ApiUser::from_user(user.unwrap(), &state.database_accessor).await?;
    success!(api_user)
}

#[instrument(skip(state, jar))]
pub async fn get_users(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = state.user_tokens.get(&token.unwrap());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = state
        .database_accessor
        .get_user_by_id(&token.unwrap().user_id)
        .await?;
    if current_user.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = current_user.unwrap();
    if !current_user.descriptor.contains(UserPermission::Manage) {
        fail!(403, "Forbidden");
    }
    let raw_users = state.database_accessor.get_all_users().await?;
    let mut users = Vec::with_capacity(raw_users.len());
    for user in raw_users {
        users.push(ApiUser::from_user(user, &state.database_accessor).await?);
    }
    success!(ApiList {
        total: users.len() as i64,
        items: users,
    })
}

#[instrument(skip(state, jar))]
pub async fn remove_user(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Path(id): Path<String>,
) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = state.user_tokens.get(&token.unwrap());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = state
        .database_accessor
        .get_user_by_id(&token.unwrap().user_id)
        .await?;
    if current_user.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = current_user.unwrap();
    if !current_user.descriptor.contains(UserPermission::Manage) && current_user.id != id {
        fail!(403, "No sufficient permissions");
    }
    if id == "00000000-0000-0000-0000-000000000000" {
        // 不可以删除管理用户
        fail!(403, "Cannot remove root user");
    }
    let user = state.database_accessor.get_user_by_id(&id).await?;
    if user.is_none() {
        fail!(404, "User not found");
    }
    let user = user.unwrap();
    state.database_accessor.remove_user(&user.id).await?;
    let api_user = ApiUser::from_user(user, &state.database_accessor).await?;
    success!(api_user)
}

#[instrument(skip(state, jar))]
pub async fn get_user(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Path(id): Path<String>,
) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = state.user_tokens.get(&token.unwrap());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = state
        .database_accessor
        .get_user_by_id(&token.unwrap().user_id)
        .await?;
    if current_user.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = current_user.unwrap();
    if !current_user.descriptor.contains(UserPermission::Manage) && current_user.id != id {
        fail!(403, "No sufficient permissions");
    }
    let user = state.database_accessor.get_user_by_id(&id).await?;
    if user.is_none() {
        fail!(404, "User not found");
    }
    let api_user = ApiUser::from_user(user.unwrap(), &state.database_accessor).await?;
    success!(api_user)
}

pub async fn create_user(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(user): Json<ApiUserCreate>,
) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let token = state.user_tokens.get(&token.unwrap());
    if token.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = state
        .database_accessor
        .get_user_by_id(&token.unwrap().user_id)
        .await?;
    if current_user.is_none() {
        fail!(401, "Unauthorized");
    }
    let current_user = current_user.unwrap();
    if !current_user.descriptor.contains(UserPermission::Manage) {
        fail!(403, "Forbidden");
    }
    let descriptor_sum: i64 = user
        .descriptor
        .into_iter()
        .map(|permission| permission.into_i64())
        .sum();
    let id = Uuid::new_v4().to_string();
    let user = state
        .database_accessor
        .create_user(
            &id,
            &user.name,
            &user.email,
            &user.password,
            descriptor_sum,
            user.avatar,
        )
        .await?;
    let api_user = ApiUser::from_user(user, &state.database_accessor).await?;
    success!(api_user)
}

#[derive(serde::Deserialize, Debug)]
pub struct UserUpdatePayload {
    name: Option<String>,
    email: Option<String>,
    avatar: Option<String>,
    password: Option<String>,
}

#[instrument(skip(state, jar))]
pub async fn update_user(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UserUpdatePayload>,
) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        crate::fail!(401, "Unauthorized");
    }
    let token = state.user_tokens.get(&token.unwrap());
    if token.is_none() {
        crate::fail!(401, "Unauthorized");
    }
    let current_user = state
        .database_accessor
        .get_user_by_id(&token.unwrap().user_id)
        .await
        .unwrap_or(None);
    if current_user.is_none() {
        crate::fail!(401, "Unauthorized");
    }
    let current_user = current_user.unwrap();

    let root_id = "00000000-0000-0000-0000-000000000000";
    if id == root_id && current_user.id != root_id {
        crate::fail!(403, "Cannot modify root user");
    }

    if current_user.id != id && !current_user.descriptor.contains(UserPermission::Manage) {
        crate::fail!(403, "No sufficient permissions");
    }

    let target_user = state
        .database_accessor
        .get_user_by_id(&id)
        .await
        .unwrap_or(None);
    if target_user.is_none() {
        crate::fail!(404, "Target user not found");
    }
    let target_user = target_user.unwrap();

    let name = payload.name.unwrap_or(target_user.name);
    let email = payload.email.unwrap_or(target_user.email);
    let avatar = if payload.avatar.is_some() {
        payload.avatar
    } else {
        target_user.avatar
    };
    let password_hash = if let Some(p) = payload.password {
        format!("{:x}", Sha256::digest(p.as_bytes()))
    } else {
        target_user.password
    };

    match state
        .database_accessor
        .update_user_info(&id, &name, &email, avatar, &password_hash)
        .await
    {
        Ok(updated_user) => {
            if let Ok(api_user) = ApiUser::from_user(updated_user, &state.database_accessor).await {
                crate::success!(api_user)
            } else {
                crate::fail!(500, "Internal error converting user")
            }
        }
        Err(e) => {
            tracing::error!("Failed to update user: {}", e);
            crate::fail!(500, "Database error")
        }
    }
}
