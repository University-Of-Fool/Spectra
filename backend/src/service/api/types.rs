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
}

impl From<Item> for ItemSimplified {
    fn from(item: Item) -> Self {
        Self {
            id: item.id,
            short_path: item.short_path,
            item_type: item.item_type,
            visits: item.visits,
            created_at: item.created_at.and_utc(),
            creator: item.creator,
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
}

impl From<User> for ApiUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            created_at: user.created_at.and_utc(),
            descriptor: UserPermission::from_i64(user.descriptor),
        }
    }
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
//
// /// 将 NaiveDateTime（本地时间）转换为 UTC 时间
// pub fn to_utc(naive: NaiveDateTime) -> DateTime<Utc> {
//     let local_dt = Local.from_local_datetime(&naive).unwrap();
//     local_dt.with_timezone(&Utc)
// }
//
// /// 将 UTC 时间转换为当前系统时区下的 NaiveDateTime
// pub fn from_utc(utc: DateTime<Utc>) -> NaiveDateTime {
//     utc.with_timezone(&Local).naive_local()
// }

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
        }
    }
}
