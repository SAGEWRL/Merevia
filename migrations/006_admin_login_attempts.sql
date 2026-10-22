CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count >= 0),
  window_ends_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_expiry_idx ON admin_login_attempts(window_ends_at);
