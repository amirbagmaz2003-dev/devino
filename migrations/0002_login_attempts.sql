-- Failed /admin login attempts, for per-IP rate limiting (brief 01, §2):
-- 5 failures from one IP within 15 minutes lock that IP out for 15
-- minutes. Rows are pruned by the login action itself; a successful login
-- clears that IP's rows.
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  -- Unix epoch milliseconds (Date.now()), so window math is plain integers.
  attempted_at INTEGER NOT NULL
);

CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);
