use crate::types::Token;
use dashmap::DashMap;
use std::sync::Arc;
use tracing::{debug, info, instrument};

// 清除过期的令牌，每30分钟运行一次
#[instrument]
pub async fn clear_expired_token(map: Arc<DashMap<String, Token>>) -> () {
    info!("Clearing expired tokens...");
    let now = chrono::Local::now().naive_local();
    map.retain(|_, v| v.expires_at > now);
    debug!("{} token(s) remaining", map.len());
}
