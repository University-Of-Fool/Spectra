use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use sqlx::types::chrono::{NaiveDateTime, Utc};
use sqlx::{Pool, Sqlite, sqlite::SqlitePoolOptions};
use std::path::PathBuf;
use tokio_util::io::ReaderStream;
use uuid::Uuid;

// 项目类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "item_type", rename_all = "snake_case")]
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
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub short_path: String,
    pub item_type: ItemType,
    pub data: String,
    pub expires_at: Option<NaiveDateTime>, // 将DateTime<Utc>改为NaiveDateTime
    pub max_visits: Option<i64>,
    pub visits: i64,
    pub password_hash: Option<String>,
    pub created_at: NaiveDateTime, // 将DateTime<Utc>改为NaiveDateTime
}

// 访问日志结构
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct AccessLog {
    pub id: String,
    pub item_id: String,
    pub accessed_at: NaiveDateTime, // 将DateTime<Utc>改为NaiveDateTime
    pub path: String,
    pub operation: OperationType,
    pub success: bool,
    pub ip_address: String,
}

// 数据库访问器
#[derive(Clone)]
pub struct DatabaseAccessor {
    pool: Pool<Sqlite>,
}

impl DatabaseAccessor {
    pub async fn new(db_url: &str) -> Result<Self> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await
            .context("Failed to connect to database")?;

        // 执行sqlx迁移
        sqlx::migrate!("../migrations").run(&pool).await?;

        Ok(Self { pool })
    }

    pub async fn create_item(
        &self,
        short_path: &str,
        item_type: ItemType,
        data: &str,
        expires_at: Option<NaiveDateTime>,
        max_visits: Option<i64>,
        password_hash: Option<String>,
    ) -> anyhow::Result<Item> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().naive_utc();
        let item = sqlx::query_as!(
            Item,
            r#"
            INSERT INTO items (id, short_path, item_type, data, expires_at, max_visits, visits, password_hash, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
            RETURNING *
            "#,
            id,
            short_path,
            item_type,
            data,
            expires_at,
            max_visits,
            password_hash,
            now,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn get_item(&self, short_path: &str) -> anyhow::Result<Option<Item>> {
        let item = sqlx::query_as!(
            Item,
            r#"
            SELECT * FROM items
            WHERE short_path = $1
            "#,
            short_path
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn increment_visits(&self, short_path: &str) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
            UPDATE items
            SET visits = visits + 1
            WHERE short_path = $1
            "#,
            short_path
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn log_access(
        &self,
        item_id: String,
        path: &str,
        operation: OperationType,
        success: bool,
        ip_address: &str,
    ) -> anyhow::Result<AccessLog> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().naive_utc();
        let log = sqlx::query_as!(
            AccessLog,
            r#"
            INSERT INTO access_logs (id, item_id, accessed_at, path, operation, success, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
            id,
            item_id,
            now,
            path,
            operation,
            success,
            ip_address
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(log)
    }

    pub async fn get_item_access_logs(&self, short_path: &str) -> anyhow::Result<Vec<AccessLog>> {
        let logs = sqlx::query_as!(
            AccessLog,
            r#"
            SELECT al.*
            FROM access_logs al
            JOIN items i ON al.item_id = i.id
            WHERE i.short_path = $1
            ORDER BY al.accessed_at DESC
            "#,
            short_path
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }
}

#[derive(Clone)]
pub struct FileAccessor {
    data_dir: PathBuf,
}
impl FileAccessor {
    pub fn new(data_dir: String) -> Self {
        Self {
            data_dir: PathBuf::from(data_dir),
        }
    }
    pub async fn get_string(&self, path: String) -> Option<String> {
        let path = self.data_dir.join(path);
        if path.exists() {
            let content = tokio::fs::read_to_string(path).await.unwrap();
            Some(content)
        } else {
            None
        }
    }
    pub async fn get_stream(&self, path: String) -> Option<ReaderStream<tokio::fs::File>> {
        let path = self.data_dir.join(path);
        if path.exists() {
            let file = tokio::fs::File::open(path).await.unwrap();
            let stream = ReaderStream::new(file);
            Some(stream)
        } else {
            None
        }
    }
}
