use axum::body::Body;
use axum::extract::FromRequestParts;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use futures_util::stream::StreamExt;
use http_body_util::BodyExt;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use tokio::io::AsyncSeekExt;
use tokio_util::io::ReaderStream;
use tracing::error;

use crate::types::AppState;

pub async fn main_service(State(state): State<AppState>, request: Request, next: Next) -> Response {
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
            Request::from_parts(parts, body)
        } else {
            request
        };

        if let Err(e) = state
            .database_accessor
            .log_access(
                item.id.as_str(),
                request.uri().path(),
                crate::types::OperationType::Get,
                true,
                &request
                    .extensions()
                    .get::<SocketAddr>()
                    .cloned()
                    .map_or("unknown".to_string(), |addr| addr.ip().to_string()),
                None,
            )
            .await
        {
            error!("Failed to log access: {:?}", e);
        }

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
                    resp_404()
                }
            }
            crate::types::ItemType::File => {
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
