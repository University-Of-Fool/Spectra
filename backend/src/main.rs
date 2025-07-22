use axum::body::Body;
use axum::extract::FromRequestParts;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
    Router,
};
use clap::{arg, crate_version, value_parser, Command};
use futures_util::stream::StreamExt;
use http_body_util::BodyExt;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use shadow_rs::shadow;
use std::fs::{self, read_to_string};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use tokio::io::AsyncSeekExt;
use tokio_util::io::ReaderStream;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};

#[cfg(not(debug_assertions))]
use axum::http::HeaderMap;
#[cfg(not(debug_assertions))]
use axum::routing::get;
#[cfg(not(debug_assertions))]
use rust_embed::RustEmbed;

#[cfg(debug_assertions)]
use axum_reverse_proxy::ReverseProxy;

mod data;
use crate::data::{DatabaseAccessor, FileAccessor};

shadow!(shadow);

const DEFAULT_CONFIG_FILE: &[u8] = include_bytes!("../assets/config_example.toml");

#[derive(Clone)]
struct AppState {
    database_accessor: DatabaseAccessor,
    file_accessor: FileAccessor,
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
    #[derive(RustEmbed)]
    #[folder = "../web/dist"]
    struct StaticAssets;

    async fn serve_static(req: Request<Body>) -> Response {
        use axum::http::{header, HeaderValue, StatusCode};
        use mime_guess::from_path;

        let path = req.uri().path().trim_start_matches('/');
        // 修改为 String 类型，以便能拥有所有权
        let mut asset_path = if path.is_empty() {
            "index.html".to_string()
        } else {
            path.to_string()
        };

        // 检查路径是否为文件夹
        if !asset_path.contains('.') {
            let folder_path = if asset_path.ends_with('/') {
                asset_path.clone()
            } else {
                format!("{}/", asset_path)
            };
            let index_path = format!("{}index.html", folder_path);

            let has_index = StaticAssets::iter().any(|p| p.as_ref() == index_path);

            if has_index {
                asset_path = index_path;
            }
        }

        let asset_exists = StaticAssets::get(asset_path.as_str()).is_some();
        let content = StaticAssets::get(asset_path.as_str())
            .unwrap_or(StaticAssets::get("not_found/index.html").unwrap());
        let mime = from_path(asset_path).first_or_octet_stream();
        let mut headers = HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_str(if asset_exists {
                mime.as_ref()
            } else {
                "text/html"
            })
            .unwrap(),
        );
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=3600"),
        );

        // Range 支持
        if let Some(range_header) = req.headers().get(header::RANGE) {
            if let Ok(range_str) = range_header.to_str() {
                if let Some((start, end)) = parse_range(range_str, content.data.len()) {
                    let slice = &content.data[start..end];
                    headers.insert(
                        header::CONTENT_RANGE,
                        HeaderValue::from_str(&format!(
                            "bytes {}-{}/{}",
                            start,
                            end - 1,
                            content.data.len()
                        ))
                        .unwrap(),
                    );
                    let mut builder = Response::builder().status(StatusCode::PARTIAL_CONTENT);
                    {
                        let builder_headers = builder.headers_mut().unwrap();
                        builder_headers.extend(headers);
                    }
                    return builder.body(Body::from(slice.to_vec())).unwrap();
                }
            }
        }

        let body = Body::from(content.data);

        let mut builder = Response::builder().status(if asset_exists {
            StatusCode::OK
        } else {
            StatusCode::NOT_FOUND
        });
        {
            let builder_headers = builder.headers_mut().unwrap();
            builder_headers.extend(headers);
        }
        builder.body(body).unwrap()
    }

    fn parse_range(range: &str, total_len: usize) -> Option<(usize, usize)> {
        if !range.starts_with("bytes=") {
            return None;
        }
        let parts: Vec<&str> = range[6..].split('-').collect();
        if parts.len() != 2 {
            return None;
        }
        let start = parts[0].parse::<usize>().ok()?;
        let end = parts[1].parse::<usize>().ok().unwrap_or(total_len - 1);
        if start >= total_len || end >= total_len || start > end {
            return None;
        }
        Some((start, end + 1))
    }

    Router::new().fallback(get(serve_static))
}

async fn main_service(State(state): State<AppState>, request: Request, next: Next) -> Response {
    fn resp_404() -> Response<Body> {
        Response::builder().status(404).body(Body::empty()).unwrap()
    }
    let to_frontend =
        async |next: Next, frontend_path: &str, replace_patterns: Vec<(&str, String)>| {
            let next_req = Request::builder()
                .method("GET")
                .uri(frontend_path)
                .body(Body::empty())
                .unwrap();
            let orig_response = next.run(next_req).await;
            let mut body = String::from_utf8(
                orig_response
                    .into_body()
                    .collect()
                    .await
                    .unwrap()
                    .to_bytes()
                    .to_vec(),
            )
            .unwrap();
            for (pattern, replacement) in replace_patterns {
                body = body.replace(&pattern, &replacement);
            }
            Response::builder()
                .status(200)
                .body(Body::from(body))
                .unwrap()
        };
    if request.uri().path().starts_with("/api") {
        return match request.uri().path() {
            _ => resp_404(),
        };
    }
    let item = state
        .database_accessor
        .get_item(request.uri().path().trim_start_matches('/'))
        .await
        .unwrap();
    if let Some(item) = item {
        // 将下面被解析参数消耗了的 request 恢复
        let request = if let Some(password) = item.password_hash {
            #[derive(Deserialize)]
            struct PasswordForm {
                password: Option<String>,
            }

            // 使用 from_request_parts 提取密码
            let (mut parts, body) = request.into_parts();
            let query =
                axum::extract::Query::<PasswordForm>::from_request_parts(&mut parts, &()).await;

            if let Ok(form) = query {
                let input_password = form.0.password;
                if !input_password.is_some() {
                    // 密码未提供
                    return to_frontend(
                        next,
                        "/password/",
                        vec![(
                            "\"{{{#JSON#}}}\"",
                            serde_json::to_string(&data::PasswordInformation {
                                error: false,
                                path_name: item.short_path,
                            })
                            .unwrap_or("{}".to_string()),
                        )],
                    )
                    .await;
                } else if format!("{:x}", Sha256::digest(input_password.unwrap())) != password {
                    // 如果上面跳到了这里的 else，说明密码已提供，但不正确
                    return to_frontend(
                        next,
                        "/password/",
                        vec![(
                            "\"{{{#JSON#}}}\"",
                            serde_json::to_string(&data::PasswordInformation {
                                error: true,
                                path_name: item.short_path,
                            })
                            .unwrap_or("{}".to_string()),
                        )],
                    )
                    .await;
                }
            }
            // 如果密码正确则进入下一步
            Request::from_parts(parts, body)
        } else {
            request
        };

        if let Err(e) = state
            .database_accessor
            .log_access(
                item.id,
                request.uri().path(),
                data::OperationType::Get,
                true,
                request
                    .extensions()
                    .get::<SocketAddr>()
                    .cloned()
                    .map_or("unknown".to_string(), |addr| addr.to_string())
                    .as_str(),
            )
            .await
        {
            error!("Failed to log access: {:?}", e);
        }

        match item.item_type {
            data::ItemType::Link => Response::builder()
                .status(302)
                .header("Location", item.data)
                .body(Body::empty())
                .unwrap(),
            data::ItemType::Code => {
                if let Some(code_content) = state.file_accessor.get_string(item.data).await {
                    to_frontend(
                        next,
                        "/code/",
                        vec![
                            ("\"{{{#CODE#}}}\"", code_content),
                            (
                                "\"{{{#JSON#}}}\"",
                                serde_json::to_string(&data::CodeInformation {
                                    language: item.extra_data.unwrap_or("text".to_string()),
                                })
                                .unwrap_or("{}".to_string()),
                            ),
                        ],
                    )
                    .await
                } else {
                    resp_404()
                }
            }
            data::ItemType::File => {
                if let Some(mut file) = state.file_accessor.get_file(item.data).await {
                    // 获取文件大小用于范围请求处理
                    let file_size = file.metadata().await.unwrap().len();

                    // 解析Range请求头
                    let range_header = request.headers().get("Range").and_then(|h| h.to_str().ok());

                    // 处理范围请求
                    let (start, end) = if let Some(range) = range_header {
                        if range.starts_with("bytes=") {
                            let parts: Vec<&str> = range[6..].split('-').collect();
                            let start = parts[0].parse::<u64>().unwrap_or(0);
                            let end = if parts.len() > 1 && !parts[1].is_empty() {
                                parts[1].parse().unwrap_or(file_size - 1)
                            } else {
                                file_size - 1
                            };
                            (start.min(file_size - 1), end.min(file_size - 1))
                        } else {
                            (0, file_size - 1)
                        }
                    } else {
                        (0, file_size - 1)
                    };

                    // 定位到请求的起始位置
                    let _ = file.seek(std::io::SeekFrom::Start(start)).await;

                    // 计算要发送的内容长度
                    let content_length = end - start + 1;

                    // 构建响应
                    let response_builder = Response::builder()
                        .header(
                            "Content-Disposition",
                            if let Some(filename) = &item.extra_data {
                                format!("attachment; filename=\"{}\"", filename)
                            } else {
                                "attachment".to_string()
                            },
                        )
                        .header("Content-Length", content_length.to_string())
                        .header("Accept-Ranges", "bytes");

                    let response = if range_header.is_some() {
                        response_builder
                            .status(206)
                            .header(
                                "Content-Range",
                                format!("bytes {}-{}/{}", start, end, file_size),
                            )
                            .body(Body::from_stream(
                                ReaderStream::new(file).take(content_length as usize),
                            ))
                            .unwrap()
                    } else {
                        response_builder
                            .status(200)
                            .body(Body::from_stream(ReaderStream::new(file)))
                            .unwrap()
                    };
                    response
                } else {
                    resp_404()
                }
            }
        }
    } else {
        // 既不是 API，也在数据库里不存在，于是将项目路由给前端
        next.run(request).await
    }
}
