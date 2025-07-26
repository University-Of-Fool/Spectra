use crate::types::{Item, ItemType, User, UserPermission};
use chrono::NaiveDateTime;
use serde::Serialize;
use crate::data::{DatabaseAccessor, FileAccessor};

#[derive(Serialize)]
pub struct ItemSimplified {
    pub id: String,
    pub short_path: String,
    pub item_type: ItemType,
    pub visits: i64,
    pub created_at: NaiveDateTime,
    pub creator: Option<String>,
}

impl From<Item> for ItemSimplified {
    fn from(item: Item) -> Self {
        Self {
            id: item.id,
            short_path: item.short_path,
            item_type: item.item_type,
            visits: item.visits,
            created_at: item.created_at,
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
    pub created_at: NaiveDateTime,
    pub descriptor: Vec<UserPermission>,
}

impl From<User> for ApiUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            created_at: user.created_at,
            descriptor: UserPermission::from_i64(user.descriptor),
        }
    }
}

#[derive(Serialize)]
pub struct ApiCode {
    pub id:String,
    pub path:String,
    pub content:String,
    pub language:Option<String>
}

impl ApiCode{
    pub async fn read_from(item:Item, fa:FileAccessor)->Self{
        let content=fa.get_string(item.data).await.unwrap_or("null".to_string()).into();
        Self{
            id:item.id,
            path:item.short_path,
            content,
            language:item.extra_data
        }
    }
}
