-- 项目表
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY NOT NULL,
    short_path TEXT UNIQUE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('link', 'code', 'file')),
    data TEXT NOT NULL,
    expires_at DATETIME,
    max_visits INTEGER,
    visits INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    created_at DATETIME NOT NULL
);

-- 访问记录表
CREATE TABLE IF NOT EXISTS access_logs (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL,
    accessed_at DATETIME NOT NULL,
    path TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('get', 'set')),
    success BOOLEAN NOT NULL,
    ip_address TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_items_short_path ON items (short_path);
CREATE INDEX IF NOT EXISTS idx_access_logs_item_id ON access_logs (item_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs (accessed_at);