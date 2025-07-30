use crate::service::api::result::ApiResult;
use crate::service::api::types::ApiUser;
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

#[instrument(skip(state, jar))]
pub async fn login(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(payload): Json<Value>,
) -> ApiResult {
    if payload.is_object() && payload.get("email").is_some() && payload.get("password").is_some() {
        let email = payload.get("email").unwrap().as_str().unwrap();
        let password = payload.get("password").unwrap().as_str().unwrap();
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
                    .build(),
            );
            success!(ApiUser::from(user), jar);
        }
        fail!(403, "Invalid email or password");
    }
    fail!(400, "Invalid request")
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
    success!(ApiUser::from(user.unwrap()))
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
    let users = state.database_accessor.get_all_users().await?;
    success!(users.into_iter().map(ApiUser::from).collect::<Vec<_>>())
}

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
    success!(ApiUser::from(user))
}

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
    success!(ApiUser::from(user.unwrap()))
}
