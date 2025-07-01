use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

// 仅在 debug (开发) 构建中编译反向代理逻辑
#[cfg(debug_assertions)]
use axum_reverse_proxy::ReverseProxy;

// 仅在 release (生产) 构建中编译静态文件服务逻辑
#[cfg(not(debug_assertions))]
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::fmt::init();

    // 配置 CORS (对两种模式都适用)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 创建应用
    let app = create_app().layer(cors);

    // 绑定服务器地址
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("🚀 Server listening on http://{}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
fn create_app() -> Router {
    // 前端路由，对于开发环境是对 Vite 的反向代理，生产环境是文件系统
    let frontend_router: Router = fallback_service();

    frontend_router
    // TODO: .nest("/api", api_router)
}

// 使用条件编译来定义 fallback 服务
#[cfg(debug_assertions)]
fn fallback_service() -> Router {
    // 开发模式：反向代理到 Vite 开发服务器
    let vite_dev_server_url = "http://localhost:5173";
    tracing::info!(
        "Proxying non-API requests to Vite at {}",
        vite_dev_server_url
    );
    ReverseProxy::new("/", vite_dev_server_url).into()
}

#[cfg(not(debug_assertions))]
fn fallback_service() -> Router {
    // TODO
}
