use axum::Router;
use axum::routing::{get, post};

mod item;
mod result;
mod types;
mod user;

use crate::types::AppState;

pub fn make_router() -> Router<AppState> {
    Router::new()
        .route("/login", post(user::login))
        .route("/item/{path}", get(item::get_item))
        .route("/code_content/{path}", get(item::get_code))
}
