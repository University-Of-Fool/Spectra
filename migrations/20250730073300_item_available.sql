ALTER TABLE items
    ADD COLUMN available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE items
    ADD COLUMN should_drop_at DATETIME;

CREATE INDEX idx_items_check_expiry ON items (expires_at) WHERE available = 1;
CREATE INDEX idx_items_cleanup ON items (should_drop_at) WHERE available = 0;

