CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin','super_admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','blocked')),
    blocked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS application_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    allow_modify INTEGER NOT NULL DEFAULT 1 CHECK(allow_modify IN (0,1)),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS application_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES application_templates(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK(input_type IN ('text','radio','date','textarea')),
    is_required INTEGER NOT NULL DEFAULT 1 CHECK(is_required IN (0,1)),
    score INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    placeholder TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES application_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parking_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    template_id INTEGER NOT NULL REFERENCES application_templates(id),
    total_score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rejected')),
    admin_memo TEXT,
    submitted_at TEXT,
    approved_at TEXT,
    approved_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS application_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES application_questions(id),
    option_id INTEGER REFERENCES question_options(id),
    answer_text TEXT
);

CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    car_number TEXT NOT NULL,
    phone TEXT NOT NULL,
    position TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS mail_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON parking_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_template ON parking_applications(template_id);
CREATE INDEX IF NOT EXISTS idx_applications_score ON parking_applications(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_templates_status ON application_templates(status);

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
