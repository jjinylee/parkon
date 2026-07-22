# 주차ON 시드 데이터 정의서

> 버전: v1.0 | 작성일: 2026-06-24
> 파일: `server/src/db/seeds/001_seed.sql`

---

## 1. 관리자 계정

```sql
-- super_admin (최고 관리자)
INSERT INTO users (name, phone, email, password, role, status, created_at)
VALUES ('최고관리자', '010-0000-0000', 'admin@parkon.com',
        '$2b$10$...bcrypt_hash_of_admin123!...', 'super_admin', 'approved',
        datetime('now','localtime'));

-- admin (일반 관리자)
INSERT INTO users (name, phone, email, password, role, status, created_at)
VALUES ('관리자A', '010-0000-0001', 'manager.a@parkon.com',
        '$2b$10$...bcrypt_hash_of_admin123!...', 'admin', 'approved',
        datetime('now','localtime'));
```

### 초기 계정 정보 (dev)

| 계정 | 이메일 | 비밀번호 | role |
|:-----|:-------|:---------|:-----|
| 최고관리자 | `admin@parkon.com` | `admin123!` | super_admin |
| 관리자A | `manager.a@parkon.com` | `admin123!` | admin |

---

## 2. 일반 사용자

```sql
INSERT INTO users (name, phone, email, password, role, status, created_at) VALUES
('김철수', '010-1234-5678', 'chulsoo@company.com',  '$2b$10$...', 'user', 'approved', datetime('now','localtime')),
('이영희', '010-2345-6789', 'younghee@company.com', '$2b$10$...', 'user', 'approved', datetime('now','localtime')),
('박지민', '010-3456-7890', 'jimin@company.com',    '$2b$10$...', 'user', 'pending',  datetime('now','localtime')),
('강하늘', '010-4567-8901', 'haneul@company.com',   '$2b$10$...', 'user', 'blocked',  datetime('now','localtime')),
('정수진', '010-5678-9012', 'sujin@company.com',    '$2b$10$...', 'user', 'approved', datetime('now','localtime'));
```

| 이름 | 이메일 | 비밀번호 | 상태 |
|:-----|:-------|:---------|:-----|
| 김철수 | `chulsoo@company.com` | `user1234!` | approved |
| 이영희 | `younghee@company.com` | `user1234!` | approved |
| 박지민 | `jimin@company.com` | `user1234!` | pending |
| 강하늘 | `haneul@company.com` | `user1234!` | blocked |
| 정수진 | `sujin@company.com` | `user1234!` | approved |

---

## 3. 템플릿 + 질문 + 옵션

```sql
-- 템플릿
INSERT INTO application_templates (title, description, start_date, end_date, allow_modify, status, created_by, created_at)
VALUES ('2026년 7월 월정기 주차 신청',
        '<p>2026년 7월 정기주차를 신청합니다.</p>',
        '2026-06-15', '2026-06-25', 0, 'published', 1, datetime('now','localtime'));

-- 질문 항목 (Q01~Q08)
INSERT INTO application_questions (template_id, question_text, input_type, is_required, score, sort_order) VALUES
(1, '귀하의 연락처를 기재해 주세요',         'text',     1, 0,  1),
(1, '귀하의 차량정보를 기재해 주세요',         'text',     1, 0,  2),
(1, '귀하의 직책을 체크해 주세요',            'radio',    1, 5,  3),
(1, '귀하의 입사 일자를 작성해 주세요',        'date',     1, 0,  4),
(1, '재직기간을 체크해 주세요',               'radio',    1, 25, 5),
(1, '귀하의 거주지 주소를 기재해 주세요',      'textarea', 1, 0,  6),
(1, '출근거리를 선택해 주세요',               'radio',    1, 35, 7),
(1, '출근 시 소요시간을 선택해 주세요',        'radio',    1, 35, 8);

-- Q03 옵션 (직책)
INSERT INTO question_options (question_id, option_text, score, sort_order) VALUES
(3, '사원',   1, 1),
(3, '대리',   2, 2),
(3, '과장',   3, 3),
(3, '차장',   4, 4),
(3, '부장',   5, 5);

-- Q05 옵션 (재직기간)
INSERT INTO question_options (question_id, option_text, score, sort_order) VALUES
(5, '1년 미만',   5,  1),
(5, '1년 이상 3년 미만', 10, 2),
(5, '3년 이상 5년 미만', 15, 3),
(5, '5년 이상 10년 미만', 20, 4),
(5, '10년 이상',  25, 5);

-- Q07 옵션 (출근거리)
INSERT INTO question_options (question_id, option_text, score, sort_order) VALUES
(7, '10km 미만',    5,  1),
(7, '10km 이상 20km 미만', 15, 2),
(7, '20km 이상 30km 미만', 25, 3),
(7, '30km 이상',    35, 4);

-- Q08 옵션 (소요시간)
INSERT INTO question_options (question_id, option_text, score, sort_order) VALUES
(8, '30분 미만',     5,  1),
(8, '30분 이상 1시간 미만', 15, 2),
(8, '1시간 이상 1시간 30분 미만', 25, 3),
(8, '1시간 30분 이상',    35, 4);
```

---

## 4. 테스트 신청 데이터

```sql
-- 김철수의 신청 (total_score 예: 사원1 + 10년이상25 + 30km이상35 + 1시간30분이상35 = 96)
INSERT INTO parking_applications (user_id, template_id, total_score, status, submitted_at, created_at)
VALUES (3, 1, 96, 'submitted', datetime('now','localtime'), datetime('now','localtime'));

INSERT INTO application_answers (application_id, question_id, option_id, answer_text) VALUES
(1, 1, NULL, '010-1234-5678'),
(1, 2, NULL, '123가 4567'),
(1, 3, 1,   NULL),    -- 사원
(1, 4, NULL, '2018-03-15'),
(1, 5, 5,   NULL),    -- 10년 이상
(1, 6, NULL, '서울시 강남구 역삼동'),
(1, 7, 4,   NULL),    -- 30km 이상
(1, 8, 4,   NULL);    -- 1시간 30분 이상

-- 이영희의 신청 (total_score 예: 부장5 + 5년이상15 + 10~20km15 + 30분~1시간15 = 50)
INSERT INTO parking_applications (user_id, template_id, total_score, status, submitted_at, created_at)
VALUES (4, 1, 50, 'submitted', datetime('now','localtime'), datetime('now','localtime'));

INSERT INTO application_answers (application_id, question_id, option_id, answer_text) VALUES
(2, 1, NULL, '010-2345-6789'),
(2, 2, NULL, '98나 7654'),
(2, 3, 5,   NULL),    -- 부장
(2, 4, NULL, '2020-07-01'),
(2, 5, 3,   NULL),    -- 3년 이상 5년 미만
(2, 6, NULL, '경기도 성남시 분당구'),
(2, 7, 2,   NULL),    -- 10km 이상 20km 미만
(2, 8, 2,   NULL);    -- 30분 이상 1시간 미만

-- 정수진의 신청 (draft, 미제출)
INSERT INTO parking_applications (user_id, template_id, total_score, status, created_at)
VALUES (7, 1, 0, 'draft', datetime('now','localtime'));
```

---

## 5. 화이트리스트

```sql
INSERT INTO whitelist (name, car_number, phone, created_by, created_at) VALUES
('김철수', '123가 4567', '010-1234-5678', 1, datetime('now','localtime')),
('이영희', '98나 7654', '010-9876-5432', 1, datetime('now','localtime')),
('박지민', '45다 1029', '010-5555-1234', 1, datetime('now','localtime'));
```

---

## 6. 메일 템플릿

```sql
INSERT INTO mail_templates (title, content, status, created_by, created_at) VALUES
('주차 신청 승인 안내',
 '<p>안녕하세요, {name}님.</p><p>귀하의 주차 신청이 <strong>승인</strong>되었습니다.</p>',
 'active', 1, datetime('now','localtime')),
('주차 신청 반려 안내',
 '<p>안녕하세요, {name}님.</p><p>귀하의 주차 신청이 <strong>반려</strong>되었습니다.</p><p>사유: {reason}</p>',
 'active', 1, datetime('now','localtime'));
```

---

## 7. 관리자 지정

```sql
INSERT INTO admin_managers (user_id, created_by, created_at) VALUES
(2, 1, datetime('now','localtime'));  -- 관리자A를 admin으로 지정
```
