CREATE TABLE IF NOT EXISTS version_history (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO version_history (name, applied)
VALUES ('initial', TRUE);

INSERT INTO version_history (name, applied)
VALUES ('file_metadata', FALSE);

CREATE TABLE IF NOT EXISTS file_metadata (
  id INTEGER PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  size INTEGER NOT NULL DEFAULT 0,
  img BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_metadata_item_id ON file_metadata (item_id);

-- 删除原有的 img 字段和相关索引
DROP INDEX IF EXISTS idx_items_img;

DROP INDEX IF EXISTS idx_items_creator_img;

ALTER TABLE items DROP COLUMN img;