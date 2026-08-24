//! Version Manager
use futures_util::TryStreamExt;
use tracing::{info, warn};
pub async fn perform_updates(
    da: &crate::data::DatabaseAccessor,
    fa: &crate::data::FileAccessor,
) -> anyhow::Result<()> {
    info!("Checking for pending version updates...");
    let pending_updates = da.get_pending_version_updates().await?;

    for update in pending_updates {
        match update.name.as_str() {
            "file_metadata" => {
                info!("Applying version: file_metadata");
                file_metadata(da, fa).await?;
            }
            _ => {
                warn!("Unknown version update: {}", update.name);
            }
        }

        da.mark_version_as_applied(&update.name).await?;
    }

    Ok(())
}

async fn file_metadata(
    da: &crate::data::DatabaseAccessor,
    fa: &crate::data::FileAccessor,
) -> anyhow::Result<()> {
    let mut items = sqlx::query!(
        r#"
      SELECT id, data
      FROM items
      WHERE (item_type = 'file')
      AND NOT EXISTS (
        SELECT 1 FROM file_metadata 
        WHERE item_id = items.id
      )
      "#
    )
    .fetch(&da.pool);

    while let Some(i) = items.try_next().await? {
        let f = fa.get_file(i.data.clone()).await;
        if f.is_none() {
            continue;
        }
        let size = f.unwrap().metadata().await?.len() as i64;
        let guess = mime_guess::from_path(i.data);
        let img = guess
            .first()
            .map(|m| m.type_() == mime_guess::mime::IMAGE)
            .unwrap_or(false);
        sqlx::query!(
            r#"
          INSERT INTO file_metadata (item_id, img, size)
          VALUES ($1, $2, $3)
          "#,
            i.id,
            img,
            size
        )
        .execute(&da.pool)
        .await?;
    }

    Ok(())
}
