CREATE TABLE users
(
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT             NOT NULL,
    email      TEXT             NOT NULL UNIQUE,
    password   TEXT             NOT NULL,
    created_at DATETIME         NOT NULL,
    descriptor INTEGER          NOT NULL DEFAULT 0
);

DROP INDEX IF EXISTS idx_items_short_path;
DROP INDEX IF EXISTS idx_access_logs_item_id;
DROP INDEX IF EXISTS idx_access_logs_accessed_at;

CREATE TABLE items_n
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
    creator       TEXT,
    FOREIGN KEY (creator) REFERENCES users (id)
);
INSERT INTO items_n (id, short_path, item_type, data, expires_at, max_visits, visits, password_hash, created_at,
                     extra_data)
SELECT id,
       short_path,
       item_type,
       data,
       expires_at,
       max_visits,
       visits,
       password_hash,
       created_at,
       extra_data
FROM items;
DROP TABLE items;
ALTER TABLE items_n
    RENAME TO items;

CREATE TABLE IF NOT EXISTS access_logs_n
(
    id          TEXT PRIMARY KEY NOT NULL,
    item_id     TEXT             NOT NULL,
    accessed_at DATETIME         NOT NULL,
    path        TEXT             NOT NULL,
    operation   TEXT             NOT NULL CHECK (operation IN ('get', 'set')),
    success     BOOLEAN          NOT NULL,
    ip_address  TEXT             NOT NULL,
    initiator   TEXT,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
    FOREIGN KEY (initiator) REFERENCES users (id) ON DELETE CASCADE
);
INSERT INTO access_logs_n (id, item_id, accessed_at, path, operation, success, ip_address)
SELECT id,
       item_id,
       accessed_at,
       path,
       operation,
       success,
       ip_address
FROM access_logs;
DROP TABLE access_logs;
ALTER TABLE access_logs_n
    RENAME TO access_logs;

CREATE INDEX IF NOT EXISTS idx_items_short_path ON items (short_path);
CREATE INDEX IF NOT EXISTS idx_access_logs_item_id ON access_logs (item_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs (accessed_at);
CREATE INDEX IF NOT EXISTS idx_items_creator ON items (creator);
CREATE INDEX IF NOT EXISTS idx_access_logs_initiator ON access_logs (initiator);