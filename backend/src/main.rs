use axum::{
    Router,
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use clap::{Command, arg, crate_version, value_parser};
use shadow_rs::shadow;
use std::fs::{self, read_to_string};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};

// 对于 debug 反向代理
#[cfg(debug_assertions)]
use axum_reverse_proxy::ReverseProxy;

// 对于 release 使用文件服务器
#[cfg(not(debug_assertions))]
use tower_http::services::{ServeDir, ServeFile};

mod data;

shadow!(shadow);

const DEFAULT_CONFIG_FILE: &[u8] = include_bytes!("../assets/config_example.toml");

#[derive(Clone)]
struct AppState {
    database_accessor: data::DatabaseAccessor,
}

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::fmt::init();

    // 解析命令行参数
    let matches = Command::new("Spectra")
        .version(crate_version!())
        .long_version(shadow::CLAP_LONG_VERSION)
        .author("University of Fool")
        .about("Spectrum of online tools")
        .long_about("An online service focusing on personal sharing and co-working")
        .arg(
            arg!(-c --config <FILE> "The path to the configuration file")
                .value_parser(value_parser!(PathBuf))
                .required(false)
                .default_value("./config.toml"),
        )
        .arg(
            arg!(-p --port <PORT> "The port on which the service listens")
                .value_parser(value_parser!(u16))
                .required(false)
                .default_value("3000"),
        )
        .arg(
            arg!(-H --host <IP> "The ip address on which the service listens")
                .value_parser(value_parser!(IpAddr))
                .required(false)
                .default_value("127.0.0.1"),
        )
        .arg(arg!(-v --verbose "Enable more detailed output"))
        .subcommand(
            Command::new("init")
                .about("Write the default configuration file to the specified path")
                .arg(arg!(<PATH>).value_parser(value_parser!(PathBuf))),
        )
        .get_matches();

    if let Some(("init", subm)) = matches.subcommand() {
        let config = subm.get_one::<PathBuf>("PATH").unwrap();
        fs::write(&config, DEFAULT_CONFIG_FILE).unwrap_or_else(|e| {
            error!("Error happened during writing to config file: {:?}", e);
            std::process::exit(1);
        });
        std::process::exit(0);
    }

    // 读取配置文件
    let config_path = matches.get_one::<PathBuf>("config").unwrap();
    info!("Reading configuration from {}", config_path.display());

    let config = if !config_path.exists() {
        warn!("The specified configuration file does not exist, using the default values...");
        String::from_utf8_lossy(DEFAULT_CONFIG_FILE)
            .parse::<toml::Table>()
            .unwrap() // 默认的配置文件一定是 TOML 字符串，所以这里略过错误处理
    } else {
        match read_to_string(config_path) {
            Ok(config_content) => match config_content.parse::<toml::Table>() {
                Ok(config_table) => config_table,
                Err(e) => {
                    error!(
                        "The specified configuration file ({}) cannot be parsed: {}",
                        config_path.display(),
                        e
                    );
                    std::process::exit(1);
                }
            },
            Err(e) => {
                error!(
                    "The specified configuration file ({}) cannot be read: {}",
                    config_path.display(),
                    e
                );
                std::process::exit(1);
            }
        }
    };

    let state = AppState {
        database_accessor: data::DatabaseAccessor::new(
            format!("sqlite:{}/data.db", &config["service"]["data_path"],).as_str(),
        )
        .await
        .unwrap(),
    };

    // 前端路由，开发环境是对 Vite 的反向代理，生产环境是文件系统
    let app = make_frontend_router()
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            main_service,
        ))
        .layer(CompressionLayer::new())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // 绑定服务器地址
    let addr = SocketAddr::from((
        *matches.get_one::<IpAddr>("host").unwrap(),
        *matches.get_one::<u16>("port").unwrap(),
    ));
    println!("🚀 Server listening on http://{}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[cfg(debug_assertions)]
fn make_frontend_router() -> Router<AppState> {
    // 开发模式：反向代理到 Vite 开发服务器
    let vite_dev_server_url = "http://localhost:5173";
    info!(
        "Proxying non-API requests to Vite at {}",
        vite_dev_server_url
    );
    ReverseProxy::new("/", vite_dev_server_url).into()
}

#[cfg(not(debug_assertions))]
fn make_frontend_router() -> Router<AppState> {
    // TODO
}

async fn main_service(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let response = next.run(request).await;
    if response.status() != 200 {
        // 说明不是前端，进入后端处理逻辑
    }
    response
}
