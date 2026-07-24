CREATE TABLE IF NOT EXISTS privacy_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_admin ON privacy_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_created ON privacy_audit_log(created_at);
