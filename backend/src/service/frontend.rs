use crate::types::AppState;
use axum::Router;

#[cfg(debug_assertions)]
pub fn make_frontend_router() -> Router<AppState> {
    use axum_reverse_proxy::ReverseProxy;
    use tracing::info;

    // 开发模式：反向代理到 Vite 开发服务器
    let vite_dev_server_url = "http://localhost:5173";
    info!(
        "Proxying non-API requests to Vite at {}",
        vite_dev_server_url
    );
    ReverseProxy::new("/", vite_dev_server_url).into()
}

#[cfg(not(debug_assertions))]
pub fn make_frontend_router() -> Router<AppState> {
    use axum::body::Body;
    use axum::extract::Request;
    use axum::http::HeaderMap;
    use axum::response::Response;
    use axum::routing::get;
    use rust_embed::RustEmbed;

    #[derive(RustEmbed)]
    #[folder = "../web/dist"]
    struct StaticAssets;

    async fn serve_static(req: Request<Body>) -> Response {
        use axum::http::{HeaderValue, StatusCode, header};
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
