# 주차ON 서버 아키텍처 설계서

> 버전: v1.2 | 작성일: 2026-06-26 | 스택: Node.js + Express + SQLite

---

## 0. 비즈니스 규칙

| 규칙 | 설명 | 적용 위치 |
|:-----|:------|:---------|
| 점수 산정 | `applications.service`에서 `action=submit` 시 `question_options.score` 합계 → `total_score` 저장 | Service |
| 제출 후 수정 | `allow_modify=0`이고 `status=submitted`면 400 | Controller → Service |
| 마감일 체크 | `end_date`가 현재 시간보다 이전이면 제출/수정 거절 (400) | Middleware 또는 Service |
| 상태 전이 | `draft→submitted`만 허용 (approved/rejected는 관리자 전용) | Service |
| 중복 신청 | 동일 사용자 + 동일 템플릿에 2개 이상 `draft` 생성 불가 (409) | Service |
| 필수 질문 | `is_required=1`인 질문 미응답 시 submit 거절 (400) | Service |

## 1. 기술 스택

| 계층 | 기술 | 버전 |
|:-----|:-----|:----:|
| 런타임 | Node.js | 18.x LTS |
| 프레임워크 | Express | 4.x |
| DB | SQLite (better-sqlite3) | 3.x |
| 인증 | jsonwebtoken + bcrypt | 최신 |
| 검증 | Joi / express-validator | - |
| 로깅 | morgan + winston | - |
| CORS | cors 패키지 | - |

---

## 2. 프로젝트 구조

```
server/
├── package.json
├── .env                      # 환경변수 (PORT, JWT_SECRET 등)
├── .env.example
├── src/
│   ├── index.js              # 엔트리 포인트 (서버 시작)
│   ├── app.js                # Express 앱 설정 (미들웨어, 라우트 마운트)
│   ├── config/
│   │   ├── database.js       # SQLite 연결/초기화
│   │   └── auth.js           # JWT 시크릿, 토큰 만료시간 등
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_init.sql  # 초기 테이블 생성
│   │   │   └── 002_mypage_answers.sql  # users 컬럼 추가 (car_number, mypage_answers)
│   │   └── seeds/
│   │       └── 001_seed.sql  # 개발용 시드 데이터
│   ├── middleware/
│   │   ├── auth.js           # JWT 인증 미들웨어
│   │   ├── admin.js          # 관리자 권한 확인 미들웨어
│   │   ├── validate.js       # 요청 검증 미들웨어 (Joi)
│   │   ├── upload.js         # Multer 파일 업로드 미들웨어
│   │   └── errorHandler.js   # 전역 에러 핸들러
│   ├── routes/
│   │   ├── index.js          # 라우트 집계 (/api/v1)
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── mypage.routes.js
│   │   ├── templates.routes.js  # + 파일 업로드/목록/삭제
│   │   ├── questions.routes.js
│   │   ├── files.routes.js      # 파일 다운로드
│   │   ├── applications.routes.js
│   │   ├── whitelist.routes.js
│   │   ├── mail.routes.js
│   │   ├── managers.routes.js
│   │   ├── config.routes.js
│   │   └── stats.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── mypage.controller.js
│   │   ├── templates.controller.js
│   │   ├── applications.controller.js
│   │   ├── config.controller.js
│   │   ├── files.controller.js      # 파일 업로드/다운로드/삭제
│   │   ├── whitelist.controller.js
│   │   ├── mail.controller.js
│   │   ├── managers.controller.js
│   │   └── stats.controller.js
│   ├── services/
│   │   ├── auth.service.js       # 비즈니스 로직 (비밀번호 해싱, 토큰 생성)
│   │   ├── users.service.js
│   │   ├── mypage.service.js
│   │   ├── templates.service.js  # + 첨부파일 목록 포함
│   │   ├── applications.service.js
│   │   ├── config.service.js
│   │   ├── files.service.js      # 파일 메타데이터 CRUD + 디스크 삭제
│   │   ├── whitelist.service.js
│   │   ├── mail.service.js
│   │   ├── managers.service.js
│   │   └── stats.service.js
│   └── utils/
│       ├── response.js       # 공통 응답 포맷 ({ success, data, message })
│       ├── errors.js         # 커스텀 에러 클래스 (AppError, AuthError 등)
│       └── logger.js         # winston 로거 설정
└── tests/                    # API 테스트
    ├── auth.test.js
    ├── users.test.js
    └── ...
```

---

## 3. 계층별 역할

```
Route → Validation (Joi) → Controller → Service → DB
                                        ↓
                                  에러 발생 시 → errorHandler
```

| 계층 | 역할 |
|:-----|:------|
| **Route** | HTTP 메서드 + 경로 매핑, 미들웨어 연결 |
| **Middleware** | 인증/권한/검증/로깅 — 요청 전처리 |
| **Controller** | 요청 파싱, Service 호출, 응답 반환 (req/res 직접 다룸) |
| **Service** | 비즈니스 로직, 트랜잭션, DB 쿼리 (순수 함수 지향) |
| **DB** | SQLite 직접 쿼리 (better-sqlite3 동기 API) |

---

## 4. 미들웨어 체인 (요청 생명주기)

```
Request
  → morgan (로그)
  → cors
  → express.json()
  → router
      → auth 미들웨어 (JWT 검증, 예외: /auth/*)
      → admin 미들웨어 (관리자 전용, role 확인)
      → validate 미들웨어 (Joi 스키마 검증)
      → controller
  → errorHandler (에러 발생 시 통일된 포맷으로 응답)
  → Response
```

---

## 5. 공통 응답 포맷

### 성공
```json
{
  "success": true,
  "data": { ... },
  "message": "요청 성공"
}
```

### 실패
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적 메시지"
  }
}
```

### 에러 코드 목록

| HTTP | code | 의미 |
|:----:|:-----|:-----|
| 400 | VALIDATION_ERROR | 요청 데이터 검증 실패 |
| 401 | UNAUTHORIZED | 토큰 없음/만료/유효하지 않음 |
| 403 | FORBIDDEN | 권한 부족 (관리자 전용 접근) |
| 404 | NOT_FOUND | 리소스 없음 |
| 409 | CONFLICT | 중복 (이메일, 차량번호 등) |
| 429 | RATE_LIMITED | 요청 제한 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

---

## 6. 데이터 흐름 규칙

1. **Controller는 Service 반환값을 그대로 응답** (가공 금지)
2. **Service는 DB 결과를 비즈니스 로직에 맞게 가공**
3. **트랜잭션은 Service 계층에서 관리** (better-sqlite3 transaction)
4. **에러는 Service에서 `throw new AppError()` → errorHandler가 일괄 처리**
5. **비밀번호 등 민감 정보는 Service 계층 밖으로 유출 금지**

---

## 7. 환경변수 (.env)

```
PORT=4000
NODE_ENV=development

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

DB_PATH=./data/parkon.db

CORS_ORIGIN=http://localhost:5173
```

---

## 8. 패키지 의존성

```json
{
  "dependencies": {
    "express": "^4.18",
    "better-sqlite3": "^11",
    "jsonwebtoken": "^9",
    "bcrypt": "^5",
    "joi": "^17",
    "cors": "^2",
    "morgan": "^1",
    "winston": "^3",
    "dotenv": "^16",
    "multer": "^1"
  },
  "devDependencies": {
    "vitest": "^2",
    "supertest": "^7",
    "nodemon": "^3"
  }
}
```
