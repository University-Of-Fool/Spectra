use crate::service::api::result::{ApiError, ApiResult};
use crate::service::api::types::ApiUser;
use crate::success;
use crate::types::{AppState, Token};
use axum::Json;
use axum::extract::State;
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
                .insert(token.clone(), Token::new(user.id.clone()));
            let jar = jar.remove("token").add(
                Cookie::build(("token", token.clone()))
                    .max_age(Duration::new(600, 0))
                    .http_only(true)
                    .build(),
            );
            return Ok(success!(ApiUser::from(user), jar));
        }
        return Err(ApiError::new(403, "Invalid email or password".to_string()).into());
    }
    Err(ApiError::new(400, "Invalid request".to_string()).into())
}

#[instrument(skip(state, jar))]
pub async fn user_info(State(state): State<AppState>, jar: PrivateCookieJar) -> ApiResult {
    let token = jar.get("token").map(|c| c.value().to_string());
    if token.is_none() {
        return Err(ApiError::new(401, "Unauthorized".to_string()).into());
    }
    let token = token.unwrap();
    let user = state.user_tokens.get(&token);
    if user.is_none() {
        return Err(ApiError::new(401, "Unauthorized".to_string()).into());
    }
    let token = user.unwrap();
    let user = state
        .database_accessor
        .get_user_by_id(&token.user_id)
        .await?;
    if user.is_none() {
        return Err(ApiError::new(401, "Unauthorized".to_string()).into());
    }
    Ok(success!(ApiUser::from(user.unwrap())))
}
