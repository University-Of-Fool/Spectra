use clap::{Command, arg, crate_version, value_parser};
use sha2::{Digest, Sha256};
use shadow_rs::shadow;
use std::fs::{self, read_to_string};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};

mod data;
mod service;
mod types;
mod util;

use crate::data::{DatabaseAccessor, FileAccessor};
use crate::service::frontend::make_frontend_router;
use crate::service::main::main_service;
use crate::types::AppState;

shadow!(shadow);
const DEFAULT_CONFIG_FILE: &[u8] = include_bytes!("../assets/config_example.toml");

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
        .subcommand(Command::new("reset-admin-password").about("Reset the admin password"))
        .get_matches();

    if let Some(("init", subcommand)) = matches.subcommand() {
        let config = subcommand.get_one::<PathBuf>("PATH").unwrap();
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
            .unwrap() // 默认的配置文件一定是有效的 TOML 字符串，所以这里略过错误处理
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

    let state = {
        // 检查 service 键是否存在
        let service_table = match config.get("service") {
            Some(service) => match service.as_table() {
                Some(table) => table,
                None => {
                    error!("'service' key in config is not a table");
                    std::process::exit(1);
                }
            },
            None => {
                error!("'service' key not found in config");
                std::process::exit(1);
            }
        };

        // 检查 data_dir 键是否存在
        let data_dir = match service_table.get("data_dir") {
            Some(dir) => match dir.as_str() {
                Some(s) => s,
                None => {
                    error!("'data_dir' in config is not a string");
                    std::process::exit(1);
                }
            },
            None => {
                error!("'data_dir' key not found in 'service' table");
                std::process::exit(1);
            }
        };
        // 确保数据目录存在
        if let Err(e) = fs::create_dir_all(data_dir) {
            error!("Failed to create data directory '{}': {}", data_dir, e);
            std::process::exit(1);
        }
        let database_path = std::path::Path::new(data_dir).join("data.db");
        // 检查数据库文件是否可以访问，不存在则创建
        if !database_path.exists() {
            info!("Database file does not exist, creating...");
            fs::write(&database_path, &[]).unwrap_or_else(|e| {
                error!("Error happened during writing to database file: {:?}", e);
                std::process::exit(1);
            });
        }
        AppState {
            database_accessor: DatabaseAccessor::new(
                format!("sqlite:{}", database_path.to_str().unwrap()).as_str(),
            )
            .await
            .unwrap(),
            file_accessor: FileAccessor::new(data_dir.to_string()),
        }
    };

    if !state.database_accessor.admin_user_exists().await.unwrap() {
        let new_password = util::random_password();
        println!("[!] Generating new admin password: {}", new_password);
        let _ = state
            .database_accessor
            .create_user(
                "00000000-0000-0000-0000-000000000000",
                "admin",
                "admin@example.com",
                format!("{:x}", Sha256::digest(new_password.as_bytes())).as_str(),
                9223372036854775807,
            )
            .await
            .is_err_and(|e| {
                error!("Failed to create admin user: {}", e);
                std::process::exit(1);
            });
    } else if let Some(("reset-admin-password", _)) = matches.subcommand() {
        let new_password = util::random_password();
        println!("[!] Generating new admin password: {}", new_password);
        let _ = state
            .database_accessor
            .change_user_password(
                "00000000-0000-0000-0000-000000000000",
                format!("{:x}", Sha256::digest(new_password.as_bytes())).as_str(),
            )
            .await
            .is_err_and(|e| {
                error!("Failed to reset admin password: {}", e);
                std::process::exit(1);
            });
        std::process::exit(0);
    }

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
