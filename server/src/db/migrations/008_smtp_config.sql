CREATE TABLE IF NOT EXISTS smtp_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    host TEXT NOT NULL DEFAULT 'localhost',
    port INTEGER NOT NULL DEFAULT 1025,
    user TEXT NOT NULL DEFAULT '',
    encrypted_pass TEXT NOT NULL DEFAULT '',
    from_email TEXT NOT NULL DEFAULT 'parkon@company.com',
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO smtp_config (id, host, port, user, encrypted_pass, from_email)
VALUES (1, 'localhost', 1025, '', '', 'parkon@company.com');
