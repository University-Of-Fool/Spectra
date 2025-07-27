use anyhow::{Context, Result};
use chrono::Local;
use sqlx::types::chrono::NaiveDateTime;
use sqlx::{Pool, Sqlite, sqlite::SqlitePoolOptions};
use std::path::PathBuf;
use tracing::debug;
use uuid::Uuid;

use crate::types::*;

// 数据库访问器
#[derive(Clone)]
pub struct DatabaseAccessor {
    pool: Pool<Sqlite>,
}
impl std::fmt::Debug for DatabaseAccessor {
    // 输出空字符串
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "A.N.D.A.") // A Normal Database Accessor
    }
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

        debug!("Successfully initialized database pool at: {}", db_url);

        Ok(Self { pool })
    }

    pub async fn create_user(
        &self,
        id: &str,
        name: &str,
        email: &str,
        password: &str,
        descriptor: i64,
        avatar: Option<String>,
    ) -> Result<User> {
        let now = Local::now().naive_local();
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, name, email, password, created_at, descriptor, avatar)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
            id,
            name,
            email,
            password,
            now,
            descriptor,
            avatar
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn admin_user_exists(&self) -> Result<bool> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT * FROM users
            WHERE id = $1
            "#,
            "00000000-0000-0000-0000-000000000000"
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(user.is_some())
    }
    pub async fn change_user_password(&self, id: &str, password: &str) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            UPDATE users
            SET password = $1
            WHERE id = $2
            RETURNING *
            "#,
            password,
            id
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    pub async fn get_user_by_id(&self, id: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT * FROM users
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT * FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    pub async fn create_item(
        &self,
        short_path: &str,
        item_type: ItemType,
        data: &str,
        expires_at: Option<NaiveDateTime>,
        max_visits: Option<i64>,
        password_hash: Option<&str>,
        extra_data: Option<&str>,
        creator: Option<&str>,
    ) -> anyhow::Result<Item> {
        // 因为 Spectra 不是分布式的，使用 UUID v7 是一个十分经济、完全保证唯一并且有序的选择
        let id = Uuid::now_v7().to_string();
        let now = Local::now().naive_local();
        let item = sqlx::query_as!(
            Item,
            r#"
            INSERT INTO items (id, short_path, item_type, data, expires_at, max_visits, visits, password_hash, created_at, extra_data, creator)
            VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)
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
            extra_data,
            creator
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

    pub async fn item_exists(&self, path: &str) -> Result<bool> {
        let item = sqlx::query_as!(
            Item,
            r#"
            SELECT * FROM items
            WHERE short_path = $1
            "#,
            path
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(item.is_some())
    }

    pub async fn remove_item(&self, id: &str) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
            DELETE FROM items
            WHERE id = $1
            "#,
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_item_data(&self, id: &str, data: &str) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
            UPDATE items
            SET data = $1
            WHERE id = $2
            "#,
            data,
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn log_access(
        &self,
        item_id: &str,
        path: &str,
        operation: OperationType,
        success: bool,
        ip_address: &str,
        initiator: Option<&str>,
    ) -> anyhow::Result<AccessLog> {
        let id = Uuid::now_v7().to_string();
        let now = Local::now().naive_local();
        let log = sqlx::query_as!(
            AccessLog,
            r#"
            INSERT INTO access_logs (id, item_id, accessed_at, path, operation, success, ip_address, initiator)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
            id,
            item_id,
            now,
            path,
            operation,
            success,
            ip_address,
            initiator
        )
        .fetch_one(&self.pool)
        .await?;
        if success {
            let path = path.trim_start_matches('/');
            sqlx::query!(
                r#"
            UPDATE items
            SET visits = visits + 1
            WHERE short_path = $1
            "#,
                path
            )
            .execute(&self.pool)
            .await?;
        }
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

#[derive(Debug, Clone)]
pub struct FileAccessor {
    data_dir: PathBuf,
}
impl FileAccessor {
    pub fn new(data_dir: String) -> Self {
        debug!("Successfully initialized file accessor at: {}", &data_dir);
        let path = PathBuf::from(&data_dir).join("dummy_file.txt");
        if !path.exists() {
            debug!("dummy_file.txt not found, creating...");
            // 这里用 std 而不是 tokio 的 fs 模块是因为目前服务器还没有启动，不需要异步执行
            std::fs::write(path, "This file is not uploaded yet, please wait!").unwrap();
        }
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

    pub async fn get_file(&self, path: String) -> Option<tokio::fs::File> {
        let path = self.data_dir.join(path);
        if path.exists() {
            let file = tokio::fs::File::open(path).await.unwrap();
            Some(file)
        } else {
            None
        }
    }

    pub async fn write_file(&self, path: String, content: &[u8]) -> anyhow::Result<()> {
        let path = self.data_dir.join(path);
        let mut file = tokio::fs::File::create(path).await?;
        tokio::io::AsyncWriteExt::write_all(&mut file, content).await?;
        Ok(())
    }
}
