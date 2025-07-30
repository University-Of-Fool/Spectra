use axum::Json;
use axum::extract::FromRequest;
use axum::extract::multipart::MultipartError;
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use axum::extract::{FromRequestParts, Path, Query};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use tracing::{error, info};

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

pub enum ApiError {
    // status: StatusCode,
    // error: String,
    Anyhow(anyhow::Error),
    Other((StatusCode, String)),
}

impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        error!("Internal error: {}", err);
        Self::Anyhow(err)
    }
}
impl From<JsonRejection> for ApiError {
    fn from(err: JsonRejection) -> Self {
        info!("JSON error: {}", err);
        // Json 提取器在某些情况下会返回 422 状态码，不符合预期的逻辑，所以这里手动覆盖
        Self::Other((StatusCode::BAD_REQUEST, err.body_text()))
    }
}

impl From<PathRejection> for ApiError {
    fn from(err: PathRejection) -> Self {
        info!("Path error: {}", err);
        Self::Other((err.status(), err.body_text()))
    }
}

impl From<QueryRejection> for ApiError {
    fn from(err: QueryRejection) -> Self {
        info!("Query error: {}", err);
        Self::Other((err.status(), err.body_text()))
    }
}

impl From<MultipartError> for ApiError {
    fn from(err: MultipartError) -> Self {
        info!("Multipart error: {}", err);
        Self::Other((StatusCode::BAD_REQUEST, err.to_string()))
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error) = match self {
            Self::Anyhow(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
            Self::Other((status, err)) => (status, err),
        };
        let payload = ApiResponse {
            success: false,
            payload: error,
        };
        (status, Json(payload)).into_response()
    }
}

impl ApiError {
    pub fn new(status: u16, error: String) -> Self {
        info!("{}", error);
        Self::Other((
            // 因为状态码一定是完全可控的所以忽略错误处理，panic 说明代码确实有问题
            StatusCode::from_u16(status).unwrap(),
            error,
        ))
    }
}

pub type ApiResult = Result<Response, ApiError>;

#[macro_export]
macro_rules! success {
    ($payload:expr) => {
            return Ok(axum::response::IntoResponse::into_response(
                axum::Json(crate::service::api::result::ApiResponse::from($payload))
            ))
    };
    ($payload:expr, $( $x:expr ),* ) => {
            return Ok(axum::response::IntoResponse::into_response(
                ($($x),*, axum::Json(crate::service::api::result::ApiResponse::from($payload)))
            ))
    };
}

#[macro_export]
macro_rules! fail {
    ($status:expr, $message:expr) => {
        return Err(
            crate::service::api::result::ApiError::new($status, $message.to_string())
        )
    };
    ($status:expr, $message:expr, $( $arg:tt )* ) => {
        return Err(
            crate::service::api::result::ApiError::new($status, format!($message, $( $arg )*))
        )
    };
}

#[derive(FromRequest)]
#[from_request(via(Json), rejection(ApiError))]
pub struct ApiJson<T>(pub T);

#[derive(FromRequestParts)]
#[from_request(via(Query), rejection(ApiError))]
pub struct ApiQuery<T>(pub T);

#[derive(FromRequestParts)]
#[from_request(via(Path), rejection(ApiError))]
pub struct ApiPath<T>(pub T);
