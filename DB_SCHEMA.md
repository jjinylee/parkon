# 주차ON 데이터베이스 스키마 (SQLite)

> 버전: v1.5 | 작성일: 2026-07-24 | DB: SQLite 3.x

---

## 1. users — 회원

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 사용자 고유 ID |
| name | TEXT | NOT NULL | 이름 |
| phone | TEXT | NOT NULL | 전화번호 (AES-256-CBC 암호화) |
| phone_hash | TEXT | NULL | phone SHA-256 해시 (중복체크/whitelist 조인용) |
| email | TEXT | NOT NULL, UNIQUE | 회사 이메일 |
| password | TEXT | NOT NULL | 비밀번호 (bcrypt 해시) |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK(role IN ('user','admin','super_admin')) | 권한 |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK(status IN ('pending','approved','blocked')) | 가입 상태 |
| car_number | TEXT | NULL | 차량번호 (AES-256-CBC 암호화) |
| car_number_hash | TEXT | NULL | car_number SHA-256 해시 |
| mypage_answers | TEXT | NULL | 마이페이지 질문답변 JSON |
| login_attempts | INTEGER | DEFAULT 0 | 로그인 실패 횟수 |
| locked_until | TEXT | NULL | 계정 잠금 만료 시간 |
| reset_token | TEXT | NULL | 비밀번호 재설정 토큰 |
| reset_expires | TEXT | NULL | 재설정 토큰 만료 시간 |
| blocked_at | TEXT | NULL | 차단일 (ISO 8601) |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 가입일 |
| updated_at | TEXT | NULL | 수정일 |
| deleted_at | TEXT | NULL | 삭제일 (소프트 삭제) |

> **status 설명**: `pending`=가입대기, `approved`=승인완료, `blocked`=차단
> `phone`/`car_number`는 AES-256-CBC 암호화 저장, 중복체크와 whitelist 조인은 SHA-256 hash 사용
> `login_attempts` >= 5 시 `locked_until` 설정, 해당 시간까지 로그인 불가
> `reset_token`/`reset_expires`는 비밀번호 찾기 시 1시간 유효

```sql
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

---

## 2. application_templates — 신청 템플릿

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 템플릿 ID |
| title | TEXT | NOT NULL | 제목 (예: 2026년 7월 월정기 주차 신청) |
| description | TEXT | NULL | 신청 안내 설명 (리치 텍스트 HTML) |
| start_date | TEXT | NOT NULL | 참여 시작일 (ISO 8601) |
| end_date | TEXT | NOT NULL | 참여 종료일 (ISO 8601) |
| allow_modify | INTEGER | NOT NULL, DEFAULT 1 | 제출 후 수정 허용 여부 (0=false, 1=true) |
| status | TEXT | NOT NULL, DEFAULT 'draft', CHECK(status IN ('draft','published','closed')) | 상태 |
| created_by | INTEGER | FK → users.id | 작성자 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 생성일 |
| updated_at | TEXT | NULL | 수정일 |

```sql
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
CREATE INDEX idx_templates_status ON application_templates(status);
```

---

## 3. application_questions — 신청 질문 항목

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 질문 ID |
| template_id | INTEGER | FK → application_templates.id, ON DELETE CASCADE | 소속 템플릿 |
| question_text | TEXT | NOT NULL | 질문 내용 |
| input_type | TEXT | NOT NULL, CHECK(input_type IN ('text','radio','date','textarea')) | 입력 유형 |
| is_required | INTEGER | NOT NULL, DEFAULT 1 (0=false, 1=true) | 필수 여부 |
| score | INTEGER | NOT NULL, DEFAULT 0 | 항목 배점 (0=배점없음) |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 정렬 순서 |
| placeholder | TEXT | NULL | 안내 문구 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 생성일 |

```sql
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
```

---

## 4. question_options — 질문 선택 옵션 (radio 전용)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 옵션 ID |
| question_id | INTEGER | FK → application_questions.id, ON DELETE CASCADE | 소속 질문 |
| option_text | TEXT | NOT NULL | 옵션 텍스트 (예: 30km 초과) |
| score | INTEGER | NOT NULL, DEFAULT 0 | 배점 (예: 5) |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 정렬 순서 |

```sql
CREATE TABLE IF NOT EXISTS question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES application_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);
```

---

## 5. parking_applications — 주차 신청 (사용자 제출)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 신청 ID |
| user_id | INTEGER | FK → users.id | 신청자 |
| template_id | INTEGER | FK → application_templates.id | 신청 템플릿 |
| total_score | INTEGER | NOT NULL, DEFAULT 0 | 총점 (자동 합산) |
| status | TEXT | NOT NULL, DEFAULT 'draft', CHECK(status IN ('draft','submitted','approved','rejected')) | 처리 상태 |
| consent_agreed | INTEGER | NULL | 동의 확인 (0=미동의, 1=동의, NULL=미선택) |
| admin_memo | TEXT | NULL | 관리자 메모 |
| submitted_at | TEXT | NULL | 최종 제출일 |
| approved_at | TEXT | NULL | 승인/반려 처리일 |
| approved_by | INTEGER | NULL, FK → users.id | 처리 관리자 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 생성일 |
| updated_at | TEXT | NULL | 수정일 |

```sql
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
CREATE INDEX idx_applications_user ON parking_applications(user_id);
CREATE INDEX idx_applications_template ON parking_applications(template_id);
CREATE INDEX idx_applications_score ON parking_applications(total_score DESC);
```

---

## 6. application_answers — 신청 항목 답변

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 답변 ID |
| application_id | INTEGER | FK → parking_applications.id, ON DELETE CASCADE | 소속 신청 |
| question_id | INTEGER | FK → application_questions.id | 질문 |
| option_id | INTEGER | NULL, FK → question_options.id | 선택한 옵션 (radio의 경우) |
| answer_text | TEXT | NULL | 입력 텍스트 (text/textarea/date의 경우) |

```sql
CREATE TABLE IF NOT EXISTS application_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES application_questions(id),
    option_id INTEGER REFERENCES question_options(id),
    answer_text TEXT
);
```

---

## 7. whitelist — 화이트리스트

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 항목 ID |
| name | TEXT | NOT NULL | 이름 |
| car_number | TEXT | NOT NULL | 차량 번호 |
| phone | TEXT | NOT NULL | 휴대폰 번호 |
| created_by | INTEGER | FK → users.id | 등록 관리자 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 등록일 |

```sql
CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    car_number TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

---

## 8. mail_templates — 메일 템플릿

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 템플릿 ID |
| title | TEXT | NOT NULL | 제목 |
| content | TEXT | NOT NULL | 본문 (리치 텍스트 HTML) |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK(status IN ('active','inactive')) | 상태 |
| created_by | INTEGER | FK → users.id | 작성자 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 생성일 |
| updated_at | TEXT | NULL | 수정일 |

```sql
CREATE TABLE IF NOT EXISTS mail_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT
);
```

---

## 9. admin_managers — 관리자 지정 (권한 부여 이력)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | ID |
| user_id | INTEGER | FK → users.id, UNIQUE | 관리자로 지정된 사용자 |
| created_by | INTEGER | FK → users.id | 지정한 슈퍼관리자 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 지정일 |
| revoked_at | TEXT | NULL | 해제일 (NULL=현재 관리자) |

> `users.role`이 'admin'이고 `admin_managers.revoked_at IS NULL`인 사용자가 현재 관리자

```sql
CREATE TABLE IF NOT EXISTS admin_managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    revoked_at TEXT
);
```

---

## 10. app_config — 전역 설정 (Key-Value)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| key | TEXT | PK | 설정 키 (예: `question_config`) |
| value | TEXT | NOT NULL | 설정값 (JSON 문자열) |
| updated_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 수정일 |

> `question_config`: 주차신청 질문 전역 설정 (RegisterPage Step 2에서 readonly 표시, AdminQuestionConfig에서 관리)

```sql
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

---

## 11. template_attachments — 템플릿 첨부 파일

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 파일 ID |
| template_id | INTEGER | FK → application_templates.id, ON DELETE CASCADE | 소속 템플릿 |
| original_name | TEXT | NOT NULL | 원본 파일명 |
| stored_name | TEXT | NOT NULL, UNIQUE | 서버 저장 파일명 (UUID) |
| mime_type | TEXT | NULL | MIME 타입 |
| size | INTEGER | NOT NULL, DEFAULT 0 | 파일 크기 (bytes) |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 업로드일 |

```sql
CREATE TABLE IF NOT EXISTS template_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES application_templates(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_template ON template_attachments(template_id);
```

---

## 12. ER 다이어그램 (텍스트)

```
users (1) ───< parking_applications (N)
users (1) ───< application_templates (N)     [created_by]
users (1) ───< admin_managers (N)             [user_id + created_by]
users (1) ───< mail_templates (N)             [created_by]
users (1) ───< whitelist (N)                  [created_by]

application_templates (1) ───< application_questions (N)
application_templates (1) ───< template_attachments (N)
application_questions (1) ───< question_options (N)

parking_applications (1) ───< application_answers (N)
application_questions (1) ───< application_answers (N)
question_options (1) ───< application_answers (N)
```

---

## 13. SQLite 마이그레이션 스크립트

```sql
-- migrations/001_init.sql
-- 주차ON 초기 테이블 생성

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
    consent_agreed INTEGER,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON parking_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_template ON parking_applications(template_id);
CREATE INDEX IF NOT EXISTS idx_applications_score ON parking_applications(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_templates_status ON application_templates(status);
```

```sql
-- migrations/002_mypage_answers.sql
-- 마이페이지 차량번호 + 질문답변 컬럼 추가

ALTER TABLE users ADD COLUMN car_number TEXT;
ALTER TABLE users ADD COLUMN mypage_answers TEXT;
```

```sql
-- migrations/003_template_attachments.sql
-- 템플릿 첨부파일 테이블 생성

CREATE TABLE IF NOT EXISTS template_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES application_templates(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_template ON template_attachments(template_id);
```

---

## 14. token_blacklist — 로그아웃 토큰 블랙리스트

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | ID |
| token_hash | TEXT | NOT NULL | JWT SHA-256 해시 |
| user_id | INTEGER | NOT NULL | 소유 사용자 ID |
| expires_at | TEXT | NOT NULL | 토큰 만료 시간 |
| created_at | TEXT | NOT NULL, DEFAULT (datetime('now','localtime')) | 로그아웃 시간 |

```sql
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
```

> auth 미들웨어에서 blacklist 조회 후 블랙리스트에 있으면 401 응답
> 만료된 토큰은 서버 시작 시 + 1시간마다 자동 정리

---

## 15. smtp_config — SMTP 설정 (single-row)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, DEFAULT 1 | 단일 행 고정 (id=1) |
| host | TEXT | NOT NULL | SMTP 호스트 |
| port | INTEGER | NOT NULL | 포트 |
| secure | INTEGER | NOT NULL, DEFAULT 0 | SSL 사용 여부 |
| user | TEXT | NOT NULL | SMTP 계정 |
| password | TEXT | NOT NULL | AES-256-CBC 암호화 저장 |
| from_email | TEXT | NOT NULL | 발신 이메일 |
| updated_at | TEXT | NOT NULL | 수정일 |

> 슈퍼관리자만 CRUD 가능, `mail-send.service.js`에서 DB 설정 우선 사용

---

## 16. privacy_audit_log — 개인정보 열람 로그

| 컬럼명 | 타입 | 제약조건 | 설명 |
|:-------|:-----|:---------|:-----|
| id | INTEGER | PK, AUTOINCREMENT | 로그 ID |
| user_id | INTEGER | NOT NULL | 수행 관리자 ID |
| action | TEXT | NOT NULL | 액션 코드 |
| target_type | TEXT | NULL | 대상 테이블명 |
| target_id | INTEGER | NULL | 대상 레코드 ID |
| detail | TEXT | NULL | 상세 내용 |
| ip_address | TEXT | NULL | 요청 IP |
| created_at | TEXT | NOT NULL | 시간 |

> 개인정보(phone/car_number)를 복호화/조회하는 모든 관리자 동작 기록

---

## 17. MySQL → SQLite 변환 참고

| MySQL | SQLite |
|:------|:-------|
| BIGINT | INTEGER |
| VARCHAR(n) | TEXT |
| ENUM('a','b') | TEXT + CHECK(col IN ('a','b')) |
| BOOLEAN / TINYINT(1) | INTEGER + CHECK(col IN (0,1)) |
| DATETIME | TEXT (ISO 8601: '2026-06-23 12:00:00') |
| AUTO_INCREMENT | AUTOINCREMENT |
| DEFAULT NOW() | DEFAULT (datetime('now','localtime')) |
| ON UPDATE NOW() | 애플리케이션 코드에서 처리 |
| COMMENT '설명' | 별도 문서로 관리 (본 파일) |
| FOREIGN KEY ... ON DELETE | ON DELETE CASCADE 지원 |
