use axum::extract::FromRef;
use axum_extra::extract::cookie::Key;
use chrono::Local;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use sqlx::types::chrono::NaiveDateTime;
use std::sync::Arc;
use strum::IntoEnumIterator;
use strum_macros::{Display, EnumIter};

#[derive(Clone, Debug)]
pub struct TurnstileConfig {
    pub enabled: bool,
    pub site_key: String,
    pub secret_key: String,
}

// 应用状态
#[derive(Clone, Debug)]
pub struct AppState {
    pub database_accessor: crate::data::DatabaseAccessor,
    pub file_accessor: crate::data::FileAccessor,
    pub user_tokens: Arc<DashMap<String, Token>>,
    pub cookie_key: Key,
    pub turnstile: TurnstileConfig,
}

// this impl tells `PrivateCookieJar` how to access the key from our state
impl FromRef<AppState> for Key {
    fn from_ref(state: &AppState) -> Self {
        state.cookie_key.clone()
    }
}

// 给 Code 页面注入的信息
#[derive(Serialize)]
pub struct CodeInformation {
    pub language: String,
}

// 给 Password 页面注入的信息
#[derive(Serialize)]
pub struct PasswordInformation {
    pub error: bool,
    pub path_name: String,
}

// 用户令牌，令牌的实际表示由 State 中的哈希表键名决定
#[derive(Debug, Clone)]
pub struct Token {
    pub user_id: String,
    pub expires_at: NaiveDateTime,
    pub temporary: bool, // 临时令牌：用于游客通过 Turnstile 正确验证后上传文件的操作
}

impl Token {
    pub fn new(user_id: String, temporary: bool) -> Self {
        let expires_at = Local::now().naive_local() + chrono::Duration::minutes(10);
        Self {
            user_id,
            expires_at,
            temporary,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.expires_at < Local::now().naive_local()
    }
}

// 用户权限，以一个数字存储。
// 下面枚举后注释中的数字是代表该权限的二进制位（从低到高）
// 如 3 -> 0100 （从低到高第三位）
#[derive(Serialize, Debug, Clone, PartialEq, EnumIter)]
pub enum UserPermission {
    Manage, // 1
    Link,   // 2
    Code,   // 3
    File,   // 4
}

impl UserPermission {
    // i64 是因为这是 SQLite INTEGER 的等价物（即使可能占的空间大了点）
    pub fn into_i64(self) -> i64 {
        match self {
            Self::Manage => 0b0001,
            Self::Link => 0b0010,
            Self::Code => 0b0100,
            Self::File => 0b1000,
        }
    }

    pub fn as_i64(&self) -> i64 {
        self.clone().into_i64()
    }

    pub fn from_i64(i: i64) -> Vec<Self> {
        let mut result = Vec::new();
        for permission in Self::iter() {
            if i & permission.as_i64() != 0 {
                result.push(permission.clone());
            }
        }
        result
    }
}

pub trait ToPermission {
    fn contains(self, permission: UserPermission) -> bool;
}
impl ToPermission for i64 {
    fn contains(self, permission: UserPermission) -> bool {
        self & permission.into_i64() != 0
    }
}

#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub password: String,
    pub avatar: Option<String>,
    pub created_at: NaiveDateTime,
    pub descriptor: i64,
}

// 项目类型枚举
#[derive(Display, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize, Debug)]
#[sqlx(type_name = "item_type", rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ItemType {
    Link,
    Code,
    File,
}

impl From<String> for ItemType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "link" => Self::Link,
            "code" => Self::Code,
            "file" => Self::File,
            _ => panic!("Invalid item type: {}", s),
        }
    }
}

// 修改后
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "operation_type", rename_all = "snake_case")]
pub enum OperationType {
    Get,
    Set,
}

impl From<String> for OperationType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "get" => Self::Get,
            "set" => Self::Set,
            _ => panic!("Invalid operation type: {}", s),
        }
    }
}

// 项目结构
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub short_path: String,
    pub item_type: ItemType,
    pub data: String,
    pub expires_at: Option<NaiveDateTime>,
    pub max_visits: Option<i64>,
    pub visits: i64,
    pub password_hash: Option<String>,
    pub created_at: NaiveDateTime,
    pub extra_data: Option<String>,
    pub creator: Option<String>,
    pub available: bool,
    pub should_drop_at: Option<NaiveDateTime>,
}

// 访问日志结构
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct AccessLog {
    pub id: String,
    pub item_id: String,
    pub accessed_at: NaiveDateTime,
    pub path: String,
    pub operation: OperationType,
    pub success: bool,
    pub ip_address: String,
    pub initiator: Option<String>,
}
