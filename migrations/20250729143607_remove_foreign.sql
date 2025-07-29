CREATE TABLE items_new
(
    id            TEXT PRIMARY KEY NOT NULL,
    short_path    TEXT UNIQUE      NOT NULL,
    item_type     TEXT             NOT NULL CHECK (item_type IN ('link', 'code', 'file')),
    data          TEXT             NOT NULL,
    expires_at    DATETIME,
    max_visits    INTEGER,
    visits        INTEGER          NOT NULL DEFAULT 0,
    password_hash TEXT,
    created_at    DATETIME         NOT NULL,
    extra_data    TEXT,
    creator       TEXT
);


INSERT INTO items_new (id, short_path, item_type, data, expires_at, max_visits, visits, password_hash, created_at,
                       extra_data, creator)
SELECT id,
       short_path,
       item_type,
       data,
       expires_at,
       max_visits,
       visits,
       password_hash,
       created_at,
       extra_data,
       creator
FROM items;

DROP TABLE items;

ALTER TABLE items_new
    RENAME TO items;

CREATE INDEX IF NOT EXISTS idx_items_creator ON items (creator);
CREATE INDEX IF NOT EXISTS idx_items_short_path ON items (short_path);
