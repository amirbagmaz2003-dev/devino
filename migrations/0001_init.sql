-- Replaces the Sanity schema (product/collection/mediaBox/siteSettings)
-- with an equivalent Cloudflare D1 schema. See sanity-to-d1-migration-brief.md.
-- IDs are app-generated UUIDs (crypto.randomUUID()), not D1 autoincrement,
-- so admin-panel writes never need a round trip just to learn an id.

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  -- Key of the object in the MEDIA R2 bucket; served publicly via
  -- GET /media/[id] (see src/app/media/[id]/route.ts).
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  -- Fractional focal point (0–1), set via the admin panel's
  -- click-on-the-image picker. Ignored for type = 'video'.
  focal_x REAL NOT NULL DEFAULT 0.5,
  focal_y REAL NOT NULL DEFAULT 0.5,
  alt_fa TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fa TEXT,
  description_en TEXT,
  cover_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fa TEXT,
  description_en TEXT,
  -- Price in Toman. Stock fields exist from day one so a future cart
  -- phase doesn't need a schema rewrite (see CLAUDE.md, "محدوده‌ی نسخه‌ی اول").
  price INTEGER NOT NULL,
  in_stock INTEGER NOT NULL DEFAULT 1,
  stock_count INTEGER,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Product <-> media is many-to-many (with order) rather than a column on
-- products, mirroring the old mediaBox array field.
CREATE TABLE product_media (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- Singleton row (id is always 1) — replaces Sanity's siteSettings document.
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  brand_name TEXT NOT NULL DEFAULT 'deVino',
  tagline_fa TEXT,
  tagline_en TEXT,
  contact_phone TEXT,
  telegram_url TEXT,
  instagram_url TEXT
);
INSERT INTO site_settings (id, brand_name) VALUES (1, 'deVino');

CREATE INDEX idx_products_collection ON products(collection_id);
CREATE INDEX idx_product_media_product ON product_media(product_id);
CREATE INDEX idx_collections_cover_media ON collections(cover_media_id);
