# 주차ON REST API 명세서

## 문서 정보

| 항목 | 내용 |
| :--- | :--- |
| 버전 | v1.5 |
| 작성일 | 2026-07-24 |
| Base URL | `/api/v1` |

---

## 공통 규칙

### 비즈니스 규칙

| 규칙 | 내용 |
|:-----|:------|
| 점수 산정 | `parking_applications.total_score` = 선택한 `question_options.score` 합계 (자동 계산) |
| 제출 후 수정 | `application_templates.allow_modify=0`이면 `submitted` 상태 이후 PUT 불가 |
| 마감일 처리 | 프론트: 마감일 지난 템플릿의 [제출] 버튼 비활성화 / 백엔드: `end_date` 경과 시 400 응답 |
| 상태 전이 | `draft` → [제출] → `submitted` / `submitted` 상태에선 [제출] 버튼 비활성화 |
| 임시저장 | [제출] 버튼 누르기 전까지는 항상 `draft` 상태로 PUT 가능 |
| 제출 취소 | 별도 API 없음 (관리자 반려만 허용) |

### 인증
- 모든 요청은 `Authorization: Bearer <token>` 헤더 필요 (로그인除外)
- JWT 기반 인증, 만료 24시간
- 로그아웃 시 토큰 블랙리스트 등록 (DB 기반, 만료 시 자동 정리)

### Rate Limiting
- 인증 관련 엔드포인트(`/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`): **분당 10회** 제한 (IP 기준)
- 초과 시 `429` 응답: `{ code: "RATE_LIMIT", message: "너무 많은 요청입니다." }`
- 계정 잠금: 로그인 **5회 연속 실패** 시 해당 계정 **5분간 잠금** (DB `login_attempts` + `locked_until`)

### 응답 형식
```json
{
  "success": true,
  "data": { ... },
  "message": "요청 성공"
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

---

## 1. Auth (인증)

### POST /auth/login
로그인

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| email | string | Y | 회사 이메일 |
| password | string | Y | 비밀번호 |

**Response**
```json
{
  "token": "jwt_token_string",
  "user": { "id": 1, "name": "김철수", "role": "user", "status": "approved" }
}
```

**에러**: `401` 이메일/비밀번호 불일치, `403` 계정이 승인되지 않음(pending/blocked)

---

### POST /auth/signup
회원가입

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| name | string | Y | 이름 |
| phone | string | Y | 전화번호 (010-1234-5678) |
| email | string | Y | 회사 이메일 |
| password | string | Y | 비밀번호 (8자 이상) |

**Response**: `201` 가입 성공 (status=pending)

---

### POST /auth/logout
로그아웃 (토큰 블랙리스트 등록)

**Headers**: Authorization: Bearer \<token\>

**처리**: 해당 JWT를 `token_blacklist` 테이블에 SHA-256 해시로 저장, 만료 시 자동 정리

---

## 2. Users (사용자 관리) — 관리자 전용

### GET /users
사용자 목록 조회 (관리자)

| Query | 타입 | 필수 | 설명 |
|:------|:-----|:----:|:-----|
| status | string | N | 필터: all / pending / approved / blocked |
| search | string | N | 이름 또는 이메일 검색 |
| page | int | N | 페이지 번호 (default 1) |
| limit | int | N | 페이지 크기 (default 20) |

**Response**
```json
{
  "total": 50,
  "page": 1,
  "limit": 20,
  "items": [
    { "id": 1, "name": "김철수", "email": "test@company.com", "phone": "010-1234-5678", "role": "user", "status": "pending", "created_at": "2026-06-20T10:00:00Z" }
  ]
}
```

---

### PUT /users/:id/status
사용자 상태 변경 (승인/차단)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| status | string | Y | approved / blocked |

---

### GET /users/export
사용자 목록 CSV 다운로드 (관리자)

**Response**: `Content-Type: text/csv` — UTF-8 BOM 포함

**컬럼**: 이름, 이메일, 전화번호, 권한, 상태, 가입일

---

### POST /auth/withdraw
회원 탈퇴 (본인)

**Headers**: Authorization: Bearer \<token\>

**처리**: 이름→'탈퇴한사용자', 전화번호/차량번호 삭제, 이메일 더미처리, `deleted_at` 설정

---

### PUT /auth/password
비밀번호 변경 (본인)

**Headers**: Authorization: Bearer \<token\>

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| current_password | string | Y | 현재 비밀번호 |
| new_password | string | Y | 새 비밀번호 (8자 이상, 영문+숫자+특수문자) |

---

## 3. Admin Managers (관리자 지정) — 슈퍼관리자 전용

### GET /admin/managers
관리자 목록 조회

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| page | int | 페이지 번호 |
| limit | int | 페이지 크기 |

---

### POST /admin/managers
사용자를 관리자로 지정

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| user_id | int | Y | 관리자로 지정할 사용자 ID |

---

### DELETE /admin/managers/:userId
관리자 권한 해제 (soft: revoked_at 갱신)

---

## 4. Application Templates (신청 템플릿)

### GET /templates
템플릿 목록 조회

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| status | string | draft / published / closed / all |

---

### GET /templates/:id
템플릿 상세 조회 (질문 항목 포함)

---

### POST /templates
템플릿 생성 (UI_301)

---

### PUT /templates/:id
템플릿 수정

---

### DELETE /templates/:id
템플릿 삭제

---

## 5. Application Questions (질문 항목) — 관리자 전용

### POST /templates/:id/questions
질문 항목 추가 (JSON 설정 업로드)

### GET /templates/:id/questions
질문 항목 목록 조회

### PUT /questions/:id
질문 수정

### DELETE /questions/:id
질문 삭제

---

## 6. Parking Applications (주차 신청)

> **상태 전이 규칙**: `draft` → [제출] → `submitted` → [승인] → `approved` / [반려] → `rejected`
> **점수**: `action=submit` 시 서버가 `application_answers.option_id` 기준으로 `total_score` 자동 합산
> **수정 제한**: 템플릿의 `allow_modify=0`이고 신청이 `submitted` 상태면 PUT 거절 (400)
> **마감일**: 템플릿 `end_date` 경과 시 제출/수정 거절 (400)

### GET /applications
내 신청 목록 조회 (사용자)

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| status | string | N | draft / submitted / approved / rejected |

---

### POST /applications
신청 생성 (임시저장, status=draft)

---

### PUT /applications/:id
신청 수정 / 제출

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| action | string | N | `submit` 시 최종 제출 처리 (total_score 자동 산정), 기본값=draft 유지 |
| answers | array | Y | 질문 답변 배열 `[{ question_id, option_id?, answer_text? }]` |

**에러**:
- `400` 마감일 경과
- `400` allow_modify=0이고 이미 submitted 상태
- `400` 필수 질문 미응답

---

### GET /applications/admin/list
모든 신청 조회 (관리자용, UI_411)

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| template_id | int | N | 특정 템플릿 필터 |
| status | string | N | 상태 필터 |
| search | string | N | 신청자명 검색 |
| sort_by | string | N | 정렬 컬럼 (total_score, name, created_at, submitted_at, position, join_date, special_reason) |
| sort_order | string | N | asc / desc |
| page | int | N | 페이지 |
| limit | int | N | 페이지 크기 |

**Response**
```json
{
  "total": 100,
  "page": 1,
  "limit": 500,
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "name": "김철수",
      "phone": "010-1234-5678",
      "car_number": "123가4567",
      "template_id": 1,
      "template_title": "2026년 7월 월정기 주차 신청",
      "total_score": 18,
      "status": "submitted",
      "submitted_at": "2026-07-01 09:00:00",
      "position": "팀장",
      "join_date": "2020-03-15",
      "special_reason": "있음",
      "special_reason_text": "장애인 등록"
    }
  ]
}
```

> `position`/`join_date`/`special_reason`/`special_reason_text`는 `application_answers` EAV 데이터를 sort_order 기준 PIVOT JOIN하여 조회 (sort_order=3=직책, 4=입사일자, 9=특수사유)

---

### GET /applications/admin/export
신청 목록 CSV 다운로드 (관리자)

| Query | 타입 | 필수 | 설명 |
|:------|:-----|:----:|:-----|
| template_id | int | Y | 템플릿 ID |

**Response**: `Content-Type: text/csv` — UTF-8 BOM 포함

**컬럼**: 순번, 이름, 전화번호, 차량번호, 총점, 상태, 화이트리스트, 제출일

---

### PUT /applications/:id/approve
신청 승인 (관리자)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| approved_count | int | N | 승인 가능 인원 수 (상위 N명 자동 강조) |

---

### PUT /applications/:id/reject
신청 반려 (관리자)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| reason | string | Y | 반려 사유 |

---

### 엑셀 업로드/다운로드 포맷

업로드 파일은 `.xlsx` 또는 `.xls`, 아래 컬럼 순서 준수:

| A | B | C | D |
|:--|:--|:--|:--|
| 이름 | 차량번호 | 휴대폰번호 | 직책 |
| 김철수 | 123가 4567 | 010-1234-5678 | 부장 |

- 헤더 행 포함 필수 (첫 행은 컬럼명)
- 다운로드 시 동일한 포맷으로 출력

---

## 7. Whitelist (화이트리스트)

### GET /whitelist
목록 조회

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| search | string | 이름 또는 차량번호 검색 |
| page | int | |
| limit | int | |

---

### POST /whitelist
항목 추가

| 필드 | 타입 | 설명 |
|:-----|:-----|:-----|
| name | string | 이름 |
| car_number | string | 차량번호 |
| phone | string | 전화번호 |

---

### POST /whitelist/upload
엑셀 업로드 (multipart/form-data)

---

### DELETE /whitelist
선택 항목 삭제

| 필드 | 타입 | 설명 |
|:-----|:-----|:-----|
| ids | array | 삭제할 ID 배열 |

---

## 8. Mail Templates (메일 설정)

### GET /mail-templates
목록 조회

---

### POST /mail-templates
템플릿 생성

---

### PUT /mail-templates/:id
템플릿 수정

---

### DELETE /mail-templates/:id
템플릿 삭제

---

## 9. Statistics (통계)

### GET /stats/approval
승인 통계 (UI_421)

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| months | int | 조회 기간 개월 수 (default 6) |

**Response**
```json
{
  "total_applicants": 12482,
  "total_approved": 9120,
  "avg_approval_rate": 73.1,
  "monthly": [
    { "month": "2026-01", "applicants": 1200, "approved": 720, "new": 340 }
  ]
}
```

---

## 10. MyPage (마이페이지)

### GET /mypage
내 정보 + 저장된 주차신청 항목 + 마이페이지 질문답변 조회

**Response**
```json
{
  "user": {
    "id": 1,
    "name": "김철수",
    "phone": "010-1234-5678",
    "email": "test@company.com",
    "role": "user",
    "status": "approved"
  },
  "saved_answers": [
    {
      "id": 1,
      "application_id": 1,
      "question_id": 1,
      "option_id": null,
      "answer_text": "30km",
      "question_text": "통근거리",
      "input_type": "radio",
      "sort_order": 1
    }
  ],
  "mypage_answers": {
    "car_number": "123가 4567",
    "answers": {
      "question_001": "30km",
      "question_002": "2020-03-15",
      ...
    }
  }
}
```

---

### PUT /mypage
내 정보 수정 (연락처, 차량번호, 마이페이지 질문답변)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| phone | string | N | 전화번호 (010-1234-5678) |
| car_number | string | N | 차량번호 (users.car_number에 저장) |
| email | string | N | 이메일 |
| answers | string | N | 마이페이지 질문답변 JSON string (users.mypage_answers에 저장) |

---

## 11. Config (전역 설정) — 관리자 전용

### GET /config/questions
질문 전역 설정 조회 (RegisterPage Step 2에서 readonly로 표시)

**Response**: `parking_score_config.json` 구조의 질문 설정 객체

---

### PUT /config/questions
질문 전역 설정 저장 (AdminQuestionConfig 화면)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| version | string | N | 설정 버전 |
| description | string | N | 설명 |
| questions | array | Y | 질문 항목 배열 (question_no, question_id, label, type, options 등) |

**Response**: 저장된 설정 객체

---

## 12. Files (파일 첨부)

### POST /templates/:id/files
파일 업로드 (관리자, 신청 개설 시)

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| files | multipart | Y | 최대 5개, 최대 100MB (field name: `files`) |

**Headers**: `Authorization: Bearer <token>` (Content-Type 미설정 — multipart/form-data 자동)

---

### GET /templates/:id/files
템플릿 첨부파일 목록 조회

**Response**
```json
[
  { "id": 1, "template_id": 1, "original_name": "문서.pdf", "mime_type": "application/pdf", "size": 1024000, "created_at": "2026-06-26 10:00:00" }
]
```

---

### GET /files/:id/download
첨부파일 다운로드

**Headers**: `Authorization: Bearer <token>`

**Response**: 파일 바이너리 (`Content-Disposition: attachment`)

---

### DELETE /templates/:id/files/:fileId
첨부파일 삭제 (관리자)

---

## 13. SMTP Config (SMTP 설정) — 슈퍼관리자 전용

### GET /config/smtp
SMTP 설정 조회 (비밀번호는 masked 처리)

**Response**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "admin@company.com",
  "from_email": "parkon@company.com",
  "password": "****"
}
```

---

### PUT /config/smtp
SMTP 설정 저장

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| host | string | Y | SMTP 호스트 |
| port | int | Y | 포트 |
| secure | boolean | Y | SSL 사용 여부 |
| user | string | Y | SMTP 사용자 |
| password | string | Y | SMTP 비밀번호 |
| from_email | string | Y | 발신 이메일 |

> `password`는 AES-256-CBC 암호화하여 `smtp_config` 테이블에 저장

---

### POST /config/smtp/test
SMTP 연결 테스트 (설정 저장 후 테스트 메일 발송)

---

## 14. Audit Log (개인정보 열람 로그) — 슈퍼관리자 전용

### GET /admin/audit
개인정보 열람 이력 조회

| Query | 타입 | 설명 |
|:------|:-----|:-----|
| page | int | 페이지 번호 |
| limit | int | 페이지 크기 |

**Response**
```json
{
  "total": 100,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "admin_name": "김광호",
      "action": "VIEW_USER_LIST",
      "target_type": "users",
      "target_id": null,
      "detail": "검색: 전체",
      "ip_address": "::1",
      "created_at": "2026-07-01 09:00:00"
    }
  ]
}
```

> 개인정보(전화번호, 차량번호)를 조회/복호화하는 모든 관리자 액션은 자동 기록됨

---

## 15. Admin Managers (관리자 관리) — 슈퍼관리자 전용

### POST /admin/managers
관리자 등록

| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| user_id | int | Y | 사용자 ID |
| role | string | Y | `admin` 또는 `super_admin` |

> managers.routes.js는 requireSuperAdmin 미들웨어 적용
