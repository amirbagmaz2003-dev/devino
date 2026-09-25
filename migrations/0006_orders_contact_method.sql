-- Simplified order form (no shipping address; the team finalizes the
-- order through the contact channel the customer picks). `orders` only
-- holds test data, so it is recreated rather than migrated in place.
-- `order_submissions` (the rate-limit counter) is left untouched.

DROP TABLE orders;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Normalized Iranian mobile, always "09xxxxxxxxx".
  phone TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  -- Toman, integer.
  price_snapshot INTEGER NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (36, 38, 40)),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('phone', 'whatsapp', 'telegram')),
  -- Without the leading "@"; set only when contact_method = 'telegram'.
  telegram_username TEXT,
  note TEXT,
  locale TEXT NOT NULL CHECK (locale IN ('fa', 'en')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'confirmed', 'shipped', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
