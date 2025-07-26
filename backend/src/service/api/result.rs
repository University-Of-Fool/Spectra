use axum::body::Body;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use tracing::error;

#[derive(Serialize)]
pub struct ApiResponse<T>
where
    T: Serialize,
{
    pub success: bool,
    pub payload: T,
}

impl<T> From<T> for ApiResponse<T>
where
    T: Serialize,
{
    fn from(payload: T) -> Self {
        Self {
            success: true,
            payload,
        }
    }
}

impl<T> IntoResponse for ApiResponse<T>
where
    T: Serialize,
{
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[macro_export]
macro_rules! success {
    ($payload:expr) => {
        {
            axum::response::IntoResponse::into_response(
                crate::service::api::result::ApiResponse::from($payload)
            )
        }
    };
    ($payload:expr, $( $x:expr ),* ) => {
        {
            axum::response::IntoResponse::into_response(
                ($($x),*, crate::service::api::result::ApiResponse::from($payload))
            )
        }
    };
}

pub struct ApiError {
    status: StatusCode,
    error: String,
}

impl<E> From<E> for ApiError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            error: err.into().to_string(),
        }
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        error!("{}", self.error);
        Response::builder()
            .status(self.status)
            .body(Body::from(
                serde_json::to_string(&ApiResponse::<String> {
                    success: false,
                    payload: self.error,
                })
                .unwrap(),
            ))
            .unwrap()
    }
}
impl ApiError {
    pub fn new(status: u16, error: String) -> Self {
        Self {
            // 因为状态码一定是完全可控的所以忽略错误处理，panic 说明代码确实有问题
            status: StatusCode::from_u16(status).unwrap(),
            error,
        }
    }
}

pub type ApiResult = Result<Response, ApiError>;
