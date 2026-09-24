-- Private fitting bookings (brief 02, §1).

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Normalized Iranian mobile, always "09xxxxxxxxx".
  phone TEXT NOT NULL,
  -- The piece the visitor wants to try; kept (as NULL) if the product is deleted.
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  -- ISO date (YYYY-MM-DD, Gregorian) regardless of the calendar the visitor used.
  preferred_date TEXT NOT NULL,
  note TEXT,
  locale TEXT NOT NULL CHECK (locale IN ('fa', 'en')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'done', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bookings_created ON bookings(created_at);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Accepted booking submissions per IP, for the 5-per-hour spam limit.
-- Pruned by the booking action itself.
CREATE TABLE booking_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  -- Unix epoch milliseconds (Date.now()).
  submitted_at INTEGER NOT NULL
);

CREATE INDEX idx_booking_submissions_ip_time ON booking_submissions(ip, submitted_at);

-- Chat that receives new-booking notifications, captured from the bot's
-- getUpdates by the admin settings "اتصال" button.
ALTER TABLE site_settings ADD COLUMN telegram_chat_id TEXT;
