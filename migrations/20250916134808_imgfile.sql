-- 不考虑以往数据的 backfill 了，因为目前 Spectra 还没投入生产（
ALTER TABLE items ADD COLUMN img BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_items_img ON items (img);
CREATE INDEX idx_items_creator_img ON items (creator, img);
