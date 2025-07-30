use crate::data::DatabaseAccessor;
use crate::types::AppState;
use axum::body::Body;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use chrono::Local;
use futures_util::stream::StreamExt;
use http_body_util::BodyExt;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use tokio::io::AsyncSeekExt;
use tokio_util::io::ReaderStream;
use tracing::{debug, error, info, instrument};

async fn to_frontend(
    next: Next,
    frontend_path: &str,
    replace_patterns: Vec<(&str, String)>,
) -> Response {
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
}

async fn resp_404(next: Next) -> Response {
    let mut resp = next
        .run(
            Request::builder()
                .method("GET")
                .uri("/not_found/index.html")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
    *resp.status_mut() = axum::http::status::StatusCode::NOT_FOUND;
    resp
}

async fn log_access(
    da: DatabaseAccessor,
    item_id: String,
    (parts, body): (Parts, Body),
    success: bool,
) -> Request<Body> {
    let db_res = da
        .log_access(
            &item_id,
            parts.uri.path(),
            crate::types::OperationType::Get,
            success,
            &parts
                .extensions
                .get::<SocketAddr>()
                .cloned()
                .map_or("unknown".to_string(), |addr| addr.ip().to_string()),
            None,
        )
        .await;
    let request = Request::from_parts(parts, body);
    if db_res.is_err() {
        error!("Failed to log access: {:?}", db_res.err());
    }
    request
}
#[async_recursion::async_recursion]
#[instrument(skip(state, request, next))]
pub async fn main_service(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let item = state
        .database_accessor
        .get_item(request.uri().path().trim_start_matches('/'))
        .await
        .unwrap();
    if let Some(item) = item {
        debug!("Item {} queried from the database: {:?}", item.id, item);
        let item_id_clone = item.id.clone();
        let da_clone = state.database_accessor.clone();
        // 检查项目是否过期
        if item.expires_at.is_some() && item.expires_at.unwrap() < Local::now().naive_local()
            || item.max_visits.is_some() && item.visits >= item.max_visits.unwrap()
        {
            let item_id = item.id.clone();
            info!("Item {} is expired. Marking as unavailable...", item_id);
            let _ = state
                .database_accessor
                .update_item_available(&item_id, false)
                .await;
            return resp_404(next).await;
        }

        // 将下面被解析参数消耗了的 request 恢复
        let request = if let Some(password) = item.password_hash.clone() {
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
                    debug!("No password provided for a protected item {}", item.id);
                    return to_frontend(
                        next,
                        "/password/",
                        vec![(
                            "\"{{{#JSON#}}}\"",
                            serde_json::to_string(&crate::types::PasswordInformation {
                                error: false,
                                path_name: item.short_path,
                            })
                            .unwrap_or("{}".to_string()),
                        )],
                    )
                    .await;
                } else if format!("{:x}", Sha256::digest(input_password.unwrap())) != password {
                    // 如果上面跳到了这里的 else，说明密码已提供，但不正确
                    debug!("Incorrect password provided for item {}", item.id,);
                    log_access(da_clone, item_id_clone, (parts, body), false).await;
                    return to_frontend(
                        next,
                        "/password/",
                        vec![(
                            "\"{{{#JSON#}}}\"",
                            serde_json::to_string(&crate::types::PasswordInformation {
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
            debug!("Password authentication passed for {}", item.id);
            Request::from_parts(parts, body)
        } else {
            request
        };
        let request = log_access(da_clone, item_id_clone, request.into_parts(), true).await;
        debug!("Incoming request to {} {}", item.item_type, item.id);
        match item.item_type {
            crate::types::ItemType::Link => Response::builder()
                .status(302)
                .header("Location", item.data)
                .body(Body::empty())
                .unwrap(),
            crate::types::ItemType::Code => {
                if let Some(code_content) = state.file_accessor.get_string(item.data).await {
                    to_frontend(
                        next,
                        "/code/",
                        vec![
                            ("\"{{{#CODE#}}}\"", code_content),
                            (
                                "\"{{{#JSON#}}}\"",
                                serde_json::to_string(&crate::types::CodeInformation {
                                    language: item.extra_data.unwrap_or("text".to_string()),
                                })
                                .unwrap_or("{}".to_string()),
                            ),
                        ],
                    )
                    .await
                } else {
                    resp_404(next).await
                }
            }
            crate::types::ItemType::File => {
                let item_data_clone = item.data.clone();
                if let Some(mut file) = state.file_accessor.get_file(item_data_clone.clone()).await
                {
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

                    let mime = mime_guess::from_path(&item_data_clone)
                        .first_or(mime_guess::mime::APPLICATION_OCTET_STREAM);

                    // 构建响应
                    let response_builder = Response::builder()
                        .header(
                            "Content-Disposition",
                            if let Some(filename) = &item.extra_data {
                                format!("attachment; filename=\"{}\"", filename)
                            } else {
                                // 不设置文件名时，比如说，如果是图片，也有可能不想被下载
                                "inline".to_string()
                            },
                        )
                        .header("Content-Length", content_length.to_string())
                        .header("Accept-Ranges", "bytes")
                        .header("Content-Type", mime.to_string());

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
                    resp_404(next).await
                }
            }
        }
    } else {
        // 既不是 API，也在数据库里不存在，于是将项目路由给前端
        next.run(request).await
    }
}
