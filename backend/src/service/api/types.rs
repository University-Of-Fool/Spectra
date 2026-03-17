use crate::data::FileAccessor;
use crate::types::{Item, ItemType, User, UserPermission};
use chrono::{DateTime, Local, TimeZone, Utc};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct ItemSimplified {
    pub id: String,
    pub short_path: String,
    pub item_type: ItemType,
    pub visits: i64,
    pub created_at: DateTime<Utc>,
    pub creator: Option<String>,
    pub available: bool,
}

impl From<Item> for ItemSimplified {
    fn from(item: Item) -> Self {
        Self {
            id: item.id,
            short_path: item.short_path,
            item_type: item.item_type,
            visits: item.visits,
            created_at: Local
                .from_local_datetime(&item.created_at)
                .unwrap()
                .with_timezone(&Utc),
            creator: item.creator,
            available: item.available,
        }
    }
}

#[derive(Serialize)]
pub struct ApiUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub avatar: Option<String>,
    pub created_at: DateTime<Utc>,
    pub descriptor: Vec<UserPermission>,
    pub item_count: i64,
}

impl ApiUser {
    pub async fn from_user(user: User, db: &crate::data::DatabaseAccessor) -> anyhow::Result<Self> {
        let item_count = db.count_user_items(&user.id).await?;
        Ok(Self {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            created_at: Local
                .from_local_datetime(&user.created_at)
                .unwrap()
                .with_timezone(&Utc),
            descriptor: UserPermission::from_i64(user.descriptor),
            item_count,
        })
    }
}

#[derive(Deserialize)]
pub struct ApiUserCreate {
    pub name: String,
    pub email: String,
    pub password: String,
    pub descriptor: Vec<UserPermission>,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct ApiCode {
    pub id: String,
    pub path: String,
    pub content: String,
    pub language: Option<String>,
}

impl ApiCode {
    pub async fn read_from(item: Item, fa: FileAccessor) -> Self {
        let content = fa
            .get_string(item.data)
            .await
            .unwrap_or("null".to_string())
            .into();
        Self {
            id: item.id,
            path: item.short_path,
            content,
            language: item.extra_data,
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct ApiItemUpload {
    pub data: String,
    pub expires_at: Option<String>,
    pub extra_data: Option<String>,
    pub item_type: ItemType,
    pub max_visits: Option<i64>,
    pub password: Option<String>,
}

#[derive(Serialize)]
pub struct ApiItemFull {
    pub id: String,
    pub short_path: String,
    pub item_type: ItemType,
    pub data: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub max_visits: Option<i64>,
    pub visits: i64,
    pub created_at: DateTime<Utc>,
    pub extra_data: Option<String>,
    pub creator: Option<String>,
    pub available: bool,
}

impl From<Item> for ApiItemFull {
    fn from(item: Item) -> Self {
        Self {
            id: item.id,
            short_path: item.short_path,
            item_type: item.item_type,
            data: item.data,
            expires_at: item
                .expires_at
                .map(|x| Local.from_local_datetime(&x).unwrap().with_timezone(&Utc)),
            max_visits: item.max_visits,
            visits: item.visits,
            created_at: Local
                .from_local_datetime(&item.created_at)
                .unwrap()
                .with_timezone(&Utc),
            extra_data: item.extra_data,
            creator: item.creator,
            available: item.available,
        }
    }
}

#[derive(Serialize)]
pub struct ApiList<T> {
    pub total: i64,
    pub items: Vec<T>,
}
