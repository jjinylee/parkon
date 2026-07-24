# 주차ON 인증 플로우 설계서

> 버전: v1.1 | 작성일: 2026-07-24
> 관련: API_SPEC.md §1 Auth, DB_SCHEMA.md §1 users

---

## 1. 전체 흐름

```
[회원가입] → status=pending (관리자 승인 대기)
                ↓
       [관리자 승인] → status=approved
                ↓
         [로그인] → JWT 발급
                ↓
   [토큰으로 API 요청] → auth 미들웨어 검증
                ↓
      [로그아웃] → 토큰 폐기 (선택)
```

---

## 2. 회원가입 (Signup)

```
POST /api/v1/auth/signup
Content-Type: application/json

{
  "name": "김철수",
  "phone": "010-1234-5678",
  "email": "chulsoo@company.com",
  "password": "password123!"
}
```

### 처리流程

| 단계 | 작업 | 설명 |
|:----:|:-----|:------|
| 1 | 입력 검증 | Joi: name(2-20자), phone(정규식), email(이메일 형식), password(8자 이상) |
| 2 | 중복 확인 | `SELECT id FROM users WHERE email=? OR phone=?` — 중복 시 409 |
| 3 | 비밀번호 해싱 | bcrypt.genSalt(10) → bcrypt.hash(password, salt) |
| 4 | 사용자 생성 | `INSERT INTO users (name, phone, email, password, role, status) VALUES (?, ?, ?, ?, 'user', 'pending')` |
| 5 | 응답 | `201 { success: true, message: "가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다." }` |

### 검증 규칙 (Joi)

| 필드 | 규칙 |
|:-----|:------|
| name | 문자열, 2~20자, 한글/영문/숫자만 |
| phone | `010-\d{4}-\d{4}` 형식 |
| email | 이메일 형식, `@company.com` 도메인 체크 (선택) |
| password | 8자 이상, 최소 1개 영문 + 1개 숫자 + 1개 특수문자 |

---

## 3. 관리자 승인 (Approve)

```
PUT /api/v1/users/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "approved"
}
```

### 처리流程

| 단계 | 작업 |
|:----:|:-----|
| 1 | JWT 인증 + role=admin/super_admin 확인 |
| 2 | 대상 user_id 존재 확인 (404 if not found) |
| 3 | `UPDATE users SET status='approved', updated_at=datetime('now','localtime') WHERE id=?` |
| 4 | 응답: `{ success: true, data: { id, name, status: "approved" } }` |

### 차단 (Block)

```
PUT /api/v1/users/:id/status
{
  "status": "blocked"
}
```

- `UPDATE users SET status='blocked', blocked_at=datetime('now','localtime') WHERE id=?`
- 차단된 사용자는 로그인 시 403 응답

---

## 4. 로그인 (Login)

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "chulsoo@company.com",
  "password": "password123!"
}
```

### 처리流程

| 단계 | 작업 | 설명 |
|:----:|:-----|:------|
| 1 | 입력 검증 | email + password 필수 |
| 2 | 사용자 조회 | `SELECT * FROM users WHERE email=? AND deleted_at IS NULL` |
| 3 | 존재 확인 | 없으면 401 "이메일 또는 비밀번호가 일치하지 않습니다." |
| 4 | 상태 확인 | `status=pending` → 403 "관리자 승인 대기중입니다." |
| 5 | 상태 확인 | `status=blocked` → 403 "차단된 계정입니다." |
| 6 | 비밀번호 검증 | bcrypt.compare(password, hash) — 실패 시 401 |
| 7 | JWT 생성 | payload: `{ userId: user.id, role: user.role }`, expiresIn: 24h |
| 8 | 응답 | `{ token, user: { id, name, email, role, status } }` |

### JWT Payload 구조

```json
{
  "userId": 1,
  "role": "user",
  "iat": 1687500000,
  "exp": 1687586400
}
```

### 응답 예시

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "김철수",
      "email": "chulsoo@company.com",
      "role": "user",
      "status": "approved"
    }
  }
}
```

---

## 5. JWT 인증 미들웨어

```js
// middleware/auth.js
headers: Authorization: Bearer <token>

1. Authorization 헤더 확인 → 없으면 401
2. "Bearer " 접두사 제거
3. jwt.verify(token, JWT_SECRET) → 실패 시 401 (만료/위변조)
4. req.user = decoded (userId, role)
5. next()
```

### 예외 경로 (인증 불필요)

```
POST /api/v1/auth/login
POST /api/v1/auth/signup
GET  /api/v1/health
```

---

## 5.1 토큰 블랙리스트 (로그아웃)

```js
// services/blacklist.service.js
- 로그아웃 시 JWT의 SHA-256 해시를 token_blacklist 테이블에 저장
- auth 미들웨어에서 blacklist.isBlacklisted(token) 확인
- 블랙리스트에 있으면 401 "로그아웃된 토큰입니다."
- 만료된 블랙리스트는 서버 시작 시 + 1시간마다 자동 정리
```

---

## 5.2 보안 헤더 (helmet)

Express `helmet` 미들웨어 적용:

| 헤더 | 값 |
|:-----|:----|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| Strict-Transport-Security | max-age=15552000 |
| X-XSS-Protection | 0 (브라우저 기본) |
| X-DNS-Prefetch-Control | off |
| Cross-Origin-Resource-Policy | cross-origin (파일 업로드용) |

---

## 5.3 Rate Limiting (express-rate-limit)

| 엔드포인트 | 제한 | 초과 시 |
|:-----------|:----:|:--------|
| POST /auth/login | 분당 10회 (IP 기준) | 429 RATE_LIMIT |
| POST /auth/signup | 분당 10회 (IP 기준) | 429 RATE_LIMIT |
| POST /auth/forgot-password | 분당 10회 (IP 기준) | 429 RATE_LIMIT |
| POST /auth/reset-password | 분당 10회 (IP 기준) | 429 RATE_LIMIT |

계정 잠금 (DB 기반, IP 무관):

| 조건 | 결과 |
|:-----|:------|
| 5회 연속 로그인 실패 | `locked_until` = now + 5분 |
| 잠금 상태에서 로그인 시도 | 403 "5회 연속 로그인 실패로 ... 이후 로그인이 가능합니다." |
| 잠금 만료 | `login_attempts = 0`, `locked_until = NULL` 초기화 |
| 비밀번호 재설정 시 | lock 자동 해제 |

---

## 6. 관리자 권한 미들웨어

```js
// middleware/admin.js
1. req.user.role 확인 (admin 또는 super_admin)
2. role이 user면 403
```

### 권한 계층

| role | 설명 | 접근 가능 |
|:-----|:-----|:---------|
| super_admin | 최고 관리자 | 모든 관리자 API + 관리자 지정/해제 |
| admin | 일반 관리자 | 사용자 관리, 신청 승인, 템플릿 관리 등 |
| user | 일반 사용자 | 본인 신청, 마이페이지 |

---

## 7. 로그아웃 (Logout)

```
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### 처리 방식

**DB 블랙리스트 (Phase 2 적용)**
- 로그아웃한 JWT의 SHA-256 해시를 `token_blacklist` 테이블에 저장
- auth 미들웨어에서 `blacklist.isBlacklisted(token)` 확인
- `tokenHash` + `userId` + `expiresAt` 함께 저장
- 만료된 토큰은 서버 시작 시 + 1시간마다 `cleanExpired()`로 정리
- 클라이언트도 localStorage에서 토큰/사용자 정보 삭제

---

## 8. 회원 탈퇴 (Withdraw)

```
POST /api/v1/auth/withdraw
Authorization: Bearer <token>
```

### 처리流程

| 단계 | 작업 |
|:----:|:------|
| 1 | JWT 인증 확인 |
| 2 | `deleted_at IS NULL` 확인 |
| 3 | 개인정보 비식별화: name='탈퇴한사용자', phone='', car_number='', email=더미 |
| 4 | `deleted_at = datetime('now','localtime')` 설정, 로그인 불가 |

---

## 9. 비밀번호 변경 (Change Password)

```
PUT /api/v1/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "oldPassword1!",
  "new_password": "newPassword1!"
}
```

### 처리流程

| 단계 | 작업 |
|:----:|:------|
| 1 | JWT 인증 확인 + Joi 검증 (8자 이상, 영문+숫자+특수문자) |
| 2 | 현재 비밀번호 bcrypt.compare 확인 (불일치 시 401) |
| 3 | 새 비밀번호 bcrypt.hash 후 UPDATE |
| 4 | 클라이언트에서 logout() 호출하여 재로그인 유도 |

---

## 10. 비밀번호 재설정 (Forgot / Reset Password)

```
POST /api/v1/auth/forgot-password    → 이메일 발송
POST /api/v1/auth/reset-password     → 토큰 검증 후 변경
```

### 처리流程

| 단계 | 작업 |
|:----:|:------|
| 1 | 이메일 입력 → users 조회 (존재하지 않아도 동일 메시지 반환, 사용자 존재 여부 노출 방지) |
| 2 | crypto.randomBytes(32) 토큰 생성, `reset_token`/`reset_expires`(1시간) 저장 |
| 3 | DB SMTP 설정(from_email)으로 재설정 링크 이메일 발송 |
| 4 | 토큰 검증 → 만료 확인 → bcrypt hash 후 password UPDATE |
| 5 | `login_attempts = 0, locked_until = NULL` 초기화 (잠금 해제) |

---

## 11. 토큰 갱신 전략

> Phase 2에서는 refresh token 없이 access token만 사용
> Phase 4에서 refresh token 도입 검토

| 항목 | Phase 2 | Phase 4 (예정) |
|:-----|:--------|:---------------|
| access token | 24h | 30m |
| refresh token | 없음 | 14d (DB 저장) |
| 갱신 방식 | 재로그인 | /auth/refresh |

---

## 12. 상태 다이어그램

```
                    ┌──────────┐
                    │  가입    │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
              ┌─────│  pending │←──── 회원가입 직후
              │     └────┬─────┘
              │          │ 관리자 승인
              │     ┌────▼─────┐
              │     │ approved │←──── 로그인 가능
              │     └────┬─────┘
              │          │ 관리자 차단
              │     ┌────▼─────┐
              └─────│ blocked  │←──── 로그인 불가
                    └──────────┘
```

---

## 13. 보안 고려사항

| 항목 | 적용 |
|:-----|:------|
| 비밀번호 해싱 | bcrypt (salt rounds: 10) |
| JWT 시크릿 | 환경변수, 프로덕션에서 64바이트 랜덤 문자열 |
| 토큰 만료 | 24h |
| 토큰 블랙리스트 | 로그아웃 시 DB 저장, auth 미들웨어에서 차단 |
| rate limiting | 인증 API 분당 10회 (express-rate-limit) |
| 계정 잠금 | 5회 연속 실패 시 5분 lock (login_attempts) |
| 보안 헤더 | helmet 미들웨어 (HSTS, X-Frame-Options 등) |
| PII 암호화 | 전화번호/차량번호 AES-256-CBC 암호화 저장 |
| 개인정보 열람 로그 | privacy_audit_log에 모든 조회 기록 |
| 입력 검증 | 모든 입력 Joi 검증 (SQL Injection 방지) |
| HTTPS | 프로덕션에서 필수 |
| 민감 정보 로깅 금지 | 비밀번호/토큰/복호화된 PII는 로그에 포함 금지 |
