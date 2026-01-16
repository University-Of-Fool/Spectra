use axum::extract::DefaultBodyLimit;
use axum::http::header;
use axum_extra::extract::cookie::Key;
use clap::{Command, arg, crate_version, value_parser};
use dashmap::DashMap;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use shadow_rs::shadow;
use std::fs::{self, read_to_string};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use tokio_cron_scheduler::{Job, JobScheduler};
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::util::SubscriberInitExt;

mod data;
mod service;
mod types;
mod util;

use crate::data::{DatabaseAccessor, FileAccessor};
use crate::service::frontend::make_frontend_router;
use crate::service::main::main_service;
use crate::types::{AppState, TurnstileConfig};

shadow!(shadow);
const DEFAULT_CONFIG_FILE: &str = include_str!("../assets/config_example.toml");
const DEFAULT_SYSTEMD_UNIT_FILE: &str = include_str!("../assets/spectra.service");

#[derive(Deserialize)]
struct ServiceConfig {
    data_dir: String,
    cookie_key: String,
    refresh_time: String,
    domain: String,
    host: String,
    port: u16,
}

#[derive(Deserialize)]
struct TurnstileConfigFile {
    enabled: bool,
    site_key: String,
    secret_key: String,
}

#[derive(Deserialize)]
struct AppConfig {
    service: ServiceConfig,
    turnstile: TurnstileConfigFile,
}

#[tokio::main]
async fn main() {
    // 解析命令行参数
    // 因为 mut 是为了在 debug 模式下添加 Turnstile 相关参数
    // 所以在 release 模式下会有未使用的 mut 警告
    #[allow(unused_mut)]
    let mut cmd_builder = Command::new("Spectra")
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
        .arg(arg!(-v --verbose "Enable more detailed output"))
        .arg(arg!(-d --debug "Enable debug output"))
        .subcommand(
            Command::new("init")
                .about("Write the default configuration file to the specified path")
                .arg(
                    arg!([PATH])
                        .value_parser(value_parser!(PathBuf))
                        .default_value("config.toml"),
                ),
        )
        .subcommand(Command::new("reset-admin-password").about("Reset the admin password"))
        .subcommand(
            Command::new("generate-cookie-key")
                .about("Generate a random string appropriate to use as cookie key"),
        );
    #[cfg(debug_assertions)]
    {
        cmd_builder = cmd_builder.arg(
            arg!(-T --turnstile <TOKEN> "Turnstile secret token")
                .value_parser(value_parser!(String))
                .required(false)
                .default_value("1x0000000000000000000000000000000AA"),
        );
    }
    if std::env::consts::OS == "linux" {
        cmd_builder = cmd_builder.subcommand(
            Command::new("systemd")
                .about("Generate systemd unit file")
                .arg(
                    arg!(-o --output <FILE> "The path to the systemd unit file")
                        .value_parser(value_parser!(PathBuf))
                        .required(false)
                        .default_value("/etc/systemd/system/spectra.service"),
                ),
        );
    }
    let matches = cmd_builder.get_matches();

    let filter = std::env::var("RUST_LOG").unwrap_or(
        // 默认情况下，只允许Spectra自身输出日志
        format!(
            "{crate_name}={log_level}",
            crate_name = env!("CARGO_PKG_NAME"),
            log_level = if matches.get_flag("verbose") {
                "info"
            } else if matches.get_flag("debug") {
                "debug"
            } else {
                "warn"
            }
        ),
    );
    let env_filter = EnvFilter::new(filter);
    let subscriber = tracing_subscriber::fmt().with_env_filter(env_filter);
    if matches.get_flag("debug") {
        subscriber.with_file(true).pretty().finish().init();
    } else {
        subscriber.finish().init();
    }

    if let Some(("init", subcommand)) = matches.subcommand() {
        let config = subcommand.get_one::<PathBuf>("PATH").unwrap();
        fs::write(
            &config,
            DEFAULT_CONFIG_FILE
                .replace("{SPECTRA_COOKIE_KEY}", &util::random_string(64, None))
                .replace("{SPECTRA_CURRENT_VERSION}", shadow::PKG_VERSION),
        )
        .unwrap_or_else(|e| {
            error!("Error happened during writing to config file: {:?}", e);
            std::process::exit(1);
        });
        std::process::exit(0);
    }

    if let Some(("generate-cookie-key", _)) = matches.subcommand() {
        eprintln!("New cookie key generated below:\n");
        println!("{}", util::random_string(64, None));
        eprintln!(
            "\nNote that this command did not modify the configuration.\nYou may need to manually edit the file to use the new key."
        );
        std::process::exit(0);
    }

    if let Some(("systemd", subcommand)) = matches.subcommand() {
        let output = subcommand.get_one::<PathBuf>("output").unwrap();
        fs::write(
            &output,
            DEFAULT_SYSTEMD_UNIT_FILE
                .replace(
                    "{SPECTRA_BIN_PATH}",
                    std::env::current_exe().unwrap().to_str().unwrap(),
                )
                .replace(
                    "{SPECTRA_CONFIG_PATH}",
                    std::env::current_exe()
                        .unwrap()
                        .parent()
                        .unwrap()
                        .join("config.toml")
                        .to_str()
                        .unwrap(),
                )
                .replace(
                    "{SPECTRA_WORKING_DIR}",
                    std::env::current_exe()
                        .unwrap()
                        .parent()
                        .unwrap()
                        .to_str()
                        .unwrap(),
                ),
        )
        .unwrap_or_else(|e| {
            error!(
                "Error happened during writing to systemd unit file: {:?}",
                e
            );
            std::process::exit(1);
        });
        println!(
            "Systemd unit file generated successfully: {}",
            output.display()
        );
        println!(
            "Note that the unit file sets the configuration file to {}",
            std::env::current_exe()
                .unwrap()
                .parent()
                .unwrap()
                .join("config.toml")
                .to_str()
                .unwrap()
        );
        println!("You may edit it on your demand.\n");
        println!("Please reload systemd daemon or it will not work:");
        println!("$ sudo systemctl daemon-reload");
        std::process::exit(0);
    }

    // 读取配置文件
    let config_path = matches.get_one::<PathBuf>("config").unwrap();
    info!("Reading configuration from {}", config_path.display());

    let config_str = if !config_path.exists() {
        warn!("The specified configuration file does not exist, using the default values...");
        warn!("Warning: a NEW cookie key is being generated...");
        DEFAULT_CONFIG_FILE.replace("{SPECTRA_COOKIE_KEY}", &util::random_string(64, None))
    } else {
        match read_to_string(config_path) {
            Ok(content) => content,
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

    let app_config: AppConfig = match toml::from_str(&config_str) {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to parse configuration: {}", e);
            std::process::exit(1);
        }
    };

    // 验证配置内容
    let service_config = &app_config.service;
    let turnstile_file_config = &app_config.turnstile;

    // 检查 service.refresh_time 是否为有效的 Cron 字符串
    if croner::Cron::from_str(&service_config.refresh_time).is_err() {
        error!("'refresh_time' in config is not a valid cron expression");
        std::process::exit(1);
    }

    // 检查 service.cookie_key 长度
    if service_config.cookie_key.len() < 64 {
        error!("The length of 'cookie_key' must be at least 64 bytes");
        error!("hint: you can use 'spectra generate-cookie-key' to generate a new appropriate key");
        std::process::exit(1);
    }

    // 检查 service.host 是否为有效的 IP 地址
    let host_addr: IpAddr = match service_config.host.parse() {
        Ok(addr) => addr,
        Err(_) => {
            error!(
                "'host' in config is not a valid IP address: {}",
                service_config.host
            );
            std::process::exit(1);
        }
    };

    // 确保数据目录存在
    let data_dir = &service_config.data_dir;
    if let Err(e) = fs::create_dir_all(data_dir) {
        error!("Failed to create data directory '{}': {}", data_dir, e);
        std::process::exit(1);
    }

    let state = {
        let database_path = std::path::Path::new(data_dir).join("data.db");
        // 检查数据库文件是否可以访问，不存在则创建
        if !database_path.exists() {
            info!("Database file does not exist, creating...");
            fs::write(&database_path, &[]).unwrap_or_else(|e| {
                error!("Error happened during writing to database file: {:?}", e);
                std::process::exit(1);
            });
        }

        let turnstile_config = TurnstileConfig {
            enabled: turnstile_file_config.enabled,
            site_key: turnstile_file_config.site_key.clone(),
            // 在开发时动态指定 Turnstile secret key，因为两个 Dummy key（总是允许/总是拒绝）
            // 的不同点在 secret key 而不是 site key 上
            secret_key: if cfg!(debug_assertions) {
                matches.get_one::<String>("turnstile").unwrap().to_string()
            } else {
                turnstile_file_config.secret_key.clone()
            },
        };

        AppState {
            database_accessor: DatabaseAccessor::new(
                format!("sqlite:{}", database_path.to_str().unwrap()).as_str(),
            )
            .await
            .unwrap(),
            file_accessor: FileAccessor::new(data_dir.to_string()),
            user_tokens: Arc::new(DashMap::new()),
            cookie_key: Key::from(service_config.cookie_key.as_bytes()),
            turnstile: turnstile_config,
            domain: service_config.domain.clone(),
        }
    };

    info!("Successfully initialized application state");

    if state
        .database_accessor
        .admin_user_exists()
        .await
        .is_ok_and(|x| !x)
    {
        // 使用固定密码，方便自动化 API 测试
        let new_password = if cfg!(debug_assertions) {
            "1234567890".to_string()
        } else {
            util::random_password()
        };
        println!("[!] Generating new admin password: {}", new_password);
        let _ = state
            .database_accessor
            .create_user(
                "00000000-0000-0000-0000-000000000000",
                "admin",
                "admin@example.com",
                &new_password,
                9223372036854775807,
                None,
            )
            .await
            .is_err_and(|e| {
                error!("Failed to create admin user: {}", e);
                std::process::exit(1);
            });
    } else if let Some(("reset-admin-password", _)) = matches.subcommand() {
        let new_password = if cfg!(debug_assertions) {
            "1234567890".to_string()
        } else {
            util::random_password()
        };
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

    if let Ok(scheduler) = JobScheduler::new().await {
        let outer_tokens = Arc::clone(&state.user_tokens);
        if let Err(e) = scheduler
            .add(
                Job::new_async("0 0/30 * * * ?", move |_, _| {
                    info!("Triggered scheduled task: clearing expired tokens...");
                    let inner_tokens = Arc::clone(&outer_tokens);
                    Box::pin(async move {
                        service::scheduled::clear_expired_token(inner_tokens).await;
                    })
                })
                .unwrap(),
            )
            .await
        {
            error!("Failed to add token clearing job to scheduler: {}", e);
        }
        let da_clone = state.database_accessor.clone();
        let fa_clone = state.file_accessor.clone();
        if let Err(e) = scheduler
            .add(
                Job::new_async(&service_config.refresh_time, move |_, _| {
                    info!("Triggered scheduled task: refreshing database...");
                    let da = da_clone.clone();
                    let fa = fa_clone.clone();
                    Box::pin(async move {
                        if let Err(e) = da.refresh_db(fa).await {
                            error!("Failed to refresh database: {}", e);
                        }
                    })
                })
                .unwrap(),
            )
            .await
        {
            error!("Failed to add database refresh job to scheduler: {}", e);
        }

        if let Err(e) = scheduler.start().await {
            error!("Failed to start scheduler: {}", e);
        }
    } else {
        error!("Failed to create job scheduler");
    }

    let origins = [
        "http://localhost:3000".parse().unwrap(),
        "http://127.0.0.1:3000".parse().unwrap(),
        service_config.domain.as_str().parse().unwrap(),
    ];

    let cors = CorsLayer::new()
        .allow_credentials(true)
        .allow_origin(origins)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::HEAD,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    let app = make_frontend_router()
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            main_service,
        ))
        .nest("/api", service::api::make_router())
        .layer(CompressionLayer::new())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(1024 * 1024 * 1024 * 1024))
        .with_state(state);

    // 绑定服务器地址
    let addr = SocketAddr::from((host_addr, service_config.port));

    println!("🚀 Server listening on http://{}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
