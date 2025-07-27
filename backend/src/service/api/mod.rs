use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post, put};

mod item;
mod result;
mod types;
mod user;

use crate::types::AppState;

pub fn make_router() -> Router<AppState> {
    Router::new()
        .route("/login", post(user::login))
        .route("/user-info", get(user::user_info))
        .route("/item/{path}", get(item::get_item))
        .route("/code_content/{path}", get(item::get_code))
        .route("/item/{path}", post(item::create_item))
        .route(
            "/file/{path}",
            // 对于文件上传允许最大 1GB 的请求体尺寸
            put(item::upload_file).layer(DefaultBodyLimit::max(1024 * 1024 * 1024 * 1024)),
        )
}
