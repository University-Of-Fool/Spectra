use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::{delete, get, post};

mod item;
mod misc;
mod result;
mod types;
mod user;

use crate::types::AppState;

pub fn make_router() -> Router<AppState> {
    #[allow(unused_mut)]
    let mut r = Router::new()
        .route("/login", post(user::login))
        .route("/user-info", get(user::user_info))
        .route("/code-content/{path}", get(item::get_code))
        .route("/item/{path}", post(item::create_item))
        .route("/item/{path}", delete(item::remove_item))
        .route("/item/{path}", get(item::get_item))
        .route(
            "/file/{path}",
            // 对于文件上传允许最大 1GB 的请求体尺寸
            post(item::upload_file).layer(DefaultBodyLimit::max(1024 * 1024 * 1024 * 1024)),
        )
        .route("/items", get(item::get_user_items))
        .route("/items/all", get(item::get_all_items))
        .route("/items/img", get(item::get_user_img_items))
        .route("/users", get(user::get_users))
        .route("/user/{id}", delete(user::remove_user))
        .route("/user/{id}", get(user::get_user))
        .route("/about", get(misc::get_information))
        .route("/config", get(misc::get_config));

    #[cfg(debug_assertions)]
    {
        r = r.route("/db-refresh", get(trigger_db_refresh));
    }

    r
}

#[cfg(debug_assertions)]
use axum::extract::State;

#[cfg(debug_assertions)]
async fn trigger_db_refresh(State(state): State<AppState>) {
    state
        .database_accessor
        .refresh_db(state.file_accessor.clone())
        .await
        .unwrap();
}
