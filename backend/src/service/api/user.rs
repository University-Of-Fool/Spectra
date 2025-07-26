use crate::service::api::result::{ApiError, ApiResult};
use crate::service::api::types::ApiUser;
use crate::success;
use crate::types::{AppState, Token};
use axum::extract::State;
use axum::Json;
use axum_extra::extract::cookie::Cookie;
use axum_extra::extract::PrivateCookieJar;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tracing::{debug, instrument};

#[instrument(skip(state))]
pub async fn login(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(payload): Json<Value>,
) -> ApiResult {
    if payload.is_object() && payload.get("email").is_some() && payload.get("password").is_some() {
        let email = payload.get("email").unwrap().as_str().unwrap();
        let password = payload.get("password").unwrap().as_str().unwrap();
        let user = state.database_accessor.get_user_by_email(email).await;
        debug!("{:?}", user);
        if user
            .as_ref()
            .is_ok_and(|user| user.password == format!("{:x}", Sha256::digest(password.as_bytes())))
        {
            let user = user?;
            let token = crate::util::random_password();
            let _ = state
                .user_tokens
                .insert(token.clone(), Token::new(user.id.clone()));
            let jar = jar.remove("token").add(Cookie::new("token", token.clone()));
            return Ok(success!(ApiUser::from(user), jar));
        }
        return Err(ApiError::new(403, "Invalid email or password".to_string()).into());
    }
    Err(ApiError::new(400, "Invalid request".to_string()).into())
}
