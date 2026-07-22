CREATE TABLE IF NOT EXISTS mail_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES mail_templates(id),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('approved','rejected')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed')),
    error_message TEXT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_mail_logs_application ON mail_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_sent_at ON mail_logs(sent_at);
