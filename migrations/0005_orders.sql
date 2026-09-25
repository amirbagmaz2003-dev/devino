-- Order requests replace private-fitting bookings (brief 04, Part A).
-- `bookings` only ever held test data, so it is dropped outright.

DROP TABLE bookings;

-- Same per-IP rate-limit counter, now counting order submissions.
ALTER TABLE booking_submissions RENAME TO order_submissions;
DROP INDEX idx_booking_submissions_ip_time;
CREATE INDEX idx_order_submissions_ip_time ON order_submissions(ip, submitted_at);

-- One row per order request. A future `payments` table can reference
-- orders(id); the price and product name are snapshotted at order time
-- (from the DB, never from the form) so later edits don't change them.
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Normalized Iranian mobile, always "09xxxxxxxxx".
  phone TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  -- Toman, integer.
  price_snapshot INTEGER NOT NULL,
  size INTEGER NOT NULL,
  -- Persian province name, whatever the visitor's language.
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  -- Exactly 10 ASCII digits.
  postal_code TEXT NOT NULL CHECK (length(postal_code) = 10),
  note TEXT,
  locale TEXT NOT NULL CHECK (locale IN ('fa', 'en')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'confirmed', 'shipped', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
