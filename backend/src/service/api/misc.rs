use crate::service::api::result::ApiResponse;
use crate::shadow;
use crate::types::AppState;
use axum::extract::State;
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
pub struct About {
    /// 构建时间
    build_date: String,
    /// 工作区是否干净
    clean: bool,
    /// 项目代码行数
    /// 使用 Value 是因为这个已经在编译时用 serde_json 序列化了，只要解析成 Value 就 ok
    code: Value,
    /// commit hash 前八位
    commit: String,
    /// 是否是 debug 构建
    debug: bool,
    /// 版本号
    version: String,
}

pub async fn get_information() -> axum::Json<ApiResponse<About>> {
    axum::Json(ApiResponse::from(About {
        build_date: shadow::BUILD_TIME_3339.to_string(),
        clean: shadow::GIT_CLEAN,
        code: serde_json::from_str(shadow::CODES).unwrap(),
        commit: shadow::SHORT_COMMIT.to_string(),
        debug: shadow_rs::is_debug(),
        version: shadow::PKG_VERSION.to_string(),
    }))
}

#[derive(Serialize)]
pub struct Config {
    turnstile_enabled: bool,
    turnstile_site_key: String,
}
pub async fn get_config(State(state): State<AppState>) -> axum::Json<ApiResponse<Config>> {
    let config = Config {
        turnstile_enabled: state.turnstile.enabled,
        turnstile_site_key: state.turnstile.site_key.clone(),
    };
    ApiResponse::from(config).into()
}
