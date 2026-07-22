---
name: parkingon
description: >
  주차ON 사내 주차신청 시스템의 풀스택 개발 스킬.
  프론트엔드(React+Vite+Tailwind) 및 백엔드(Node.js+Express+SQLite) 모든 개발 작업에 사용.
  "화면 그려줘", "UI 만들어줘", "API 만들어줘", "로그인 구현", "DB 변경" 등
  주차ON 시스템의 모든 개발 요청이 오면 무조건 이 스킬을 사용할 것.
  작업 전 반드시 참조 파일을 순서대로 로드할 것:
    1. design.md              → 컬러 팔레트, 타이포, 컴포넌트 CSS 토큰
    2. 표준레이아웃설계서.md   → GNB·LNB·브레드크럼·타이틀·그리드·버튼 UX 구조
    3. PR.md                  → IA(화면 ID 원본), 화면별 기능 스펙
    4. DB_SCHEMA.md           → SQLite 테이블 구조
    5. API_SPEC.md            → REST API 명세 + 비즈니스 규칙
    6. AUTH_FLOW.md           → 인증 플로우
    7. SERVER_ARCHITECTURE.md → 서버 계층 구조
    8. FRONTEND_API_MAPPING.md→ 페이지-API 매핑
---

# 주차ON 개발 스킬

주차ON(사내 주차신청 시스템)의 풀스택 개발을 위한 스킬입니다.

---

## 1. 작업 시작 전 필수 체크 (3단계)

### Step 1 — 디자인 가이드 로드
`design.md`를 **반드시 먼저 읽을 것.**
컬러 팔레트, 타이포, 버튼·카드·입력창·뱃지 CSS 토큰을 로드한다.

### Step 2 — 레이아웃 규칙 로드
`표준레이아웃설계서.md`를 읽어 GNB·LNB·브레드크럼·타이틀·그리드·버튼 아이콘 규칙을 확인한다.

### Step 3 — 요청 분석
`PR.md` 섹션 4.1의 IA 테이블에서 화면 ID를 확인한다.

1. **화면 ID 확인** — 요청에 UI_XXX가 명시되면 해당 화면만 작업한다.
   명시되지 않은 경우, requirement IA 테이블을 참조해 적합한 화면 ID를 찾아 사용자에게 확인한다.
2. **작업 유형 판단**
   - 신규 화면 생성 → 아래 화면 생성 규칙 적용
   - 기존 화면 수정 → 해당 화면 ID의 스펙만 수정, 다른 화면 변경 금지
   - 컴포넌트 추가 → 기존 컴포넌트 규칙 상속

> IA 테이블·메뉴 구조·화면별 스펙 원본은 `PR.md` 섹션 4 참조

---

## 2. 화면 생성 규칙

### 2.1 신규 화면 추가 시
1. `PR.md` 섹션 4.1 IA 테이블에서 화면 ID 확인 — 반드시 명시
2. `design.md` 컬러 토큰만 사용 (하드코딩 금지)
3. `표준레이아웃설계서.md`의 GNB·브레드크럼·타이틀·그리드·버튼 규칙 준수
4. 기존 화면의 Padding/Margin/radius/폰트 비율 상속
5. 화면 상단에 `<!-- 화면 ID: UI_XXX | 화면명 -->` 주석 표기

### 2.2 기존 화면 수정 시
- 요청된 화면 ID에 해당하는 부분만 수정
- 다른 화면 ID의 코드·스타일 변경 금지
- 변경된 컴포넌트는 `<!-- 수정: 변경 내용 요약 -->` 주석 표기

### 2.3 화면 레이아웃 구조 (전 화면 공통)
> 상세 스펙은 `표준레이아웃설계서.md` 참조
```
[GNB — 64px 고정]
[브레드크럼 + 페이지 타이틀 (28px / 600)]
[본문 — 1줄:검색/필터 | 2줄:그리드타이틀+버튼 | 본문:컨텐츠 | 하단:페이지네이션 or 액션버튼]
```

---

## 3. 코드 출력 형식

- **단일 화면 목업**: HTML 아티팩트 (`<style>` 태그)
- **React 컴포넌트**: `.jsx` 아티팩트, CSS 변수 사용
- **전체 시스템**: 화면별 섹션을 `<!-- UI_XXX -->` 주석으로 구분

### 출력 전 체크리스트
- [ ] 화면 ID 주석 포함? (`<!-- 화면 ID: UI_XXX | 화면명 -->`)
- [ ] `design.md` 컬러 토큰만 사용? (하드코딩 없음)
- [ ] GNB 높이 64px / 배경 #FFFFFF / 테두리 #C2C6D6?
- [ ] GNB 구조 준수? (좌:로고 200px 영역, 우:사용자정보)
- [ ] 관리자 페이지 타이틀 20px / weight 600 / color #171C1F?
- [ ] 브레드크럼 13px / color #424754 / 최하위 bold?
- [ ] 상태 뱃지 C안 5종 준수? (대기·완료·반려·활성·비활성)
- [ ] radius 8px 일관 적용?
- [ ] 버튼 아이콘 규칙 준수? (조회=material-symbols search, 등록=+, 다운로드=⬇, 업로드=⬆)
- [ ] 로고: 주차 #171C1F / ON #3B82F6 Bold?

---

## 4. 개발 규칙 (전체 공통)

### 4.1 변수명 컨벤션
- **JavaScript/Node.js**: `camelCase` (변수, 함수)
- **SQLite 컬럼명**: `snake_case`
- **React 컴포넌트**: `PascalCase`
- **상수/환경변수**: `UPPER_SNAKE_CASE`
- **boolean**: `is*`, `has*`, `can*` 접두사 (예: `isOpen`, `hasError`, `canSubmit`)

### 4.2 import 순서
1. 외부 라이브러리 (`react`, `express`)
2. 내부 모듈 (`../../components/`, `../services/`)
3. 스타일/설정 파일

```js
// React 예시
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

// Node.js 예시
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { AppError } = require('../utils/errors');
```

### 4.3 비동기 처리
- `async/await`만 사용 (`.then()/.catch()` 금지)
- 에러는 `try/catch` 또는 `next(err)`로 전파
- 서버 컨트롤러는 항상 `async (req, res, next) => { try { ... } catch (err) { next(err); } }` 패턴

### 4.4 Git 커밋 메시지
```
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 구조 변경 (기능 변화 없음)
style: CSS/UI 변경 (로직 변화 없음)
docs: 문서만 변경
chore: 빌드/패키지/설정 변경
```
예: `feat: Auth API 로그인/회원가입 구현`

---

## 5. 백엔드 개발 규칙

### 5.1 계층 구조 (필수)
```
Route → Controller → Service → DB
```
- **Route**: HTTP 메서드 + 경로 + 미들웨어 연결만 (로직 금지)
- **Controller**: 요청 파싱 + 검증(Joi) + Service 호출 + 응답 (req/res 직접 다룸)
- **Service**: 비즈니스 로직 + DB 쿼리 + 트랜잭션 (순수 함수, req/res 접근 금지)
- **에러 처리**: Service에서 `throw new AppError()` → errorHandler가 일괄 응답

### 5.2 API 응답 포맷 (필수)
```json
// 성공
{ "success": true, "data": { ... }, "message": "요청 성공" }
// 실패
{ "success": false, "error": { "code": "ERROR_CODE", "message": "에러 메시지" } }
```
- Controller는 `success(res, data, message, status)` 헬퍼 사용
- 무조건 위 포맷 준수 (다른 형식 금지)

### 5.3 인증/권한
- `Authorization: Bearer <token>` 헤더 필수 (auth 미들웨어)
- 관리자 전용: `requireAdmin` 미들웨어
- `req.user = { userId, role }` (auth 미들웨어가 주입)

### 5.4 DB 쿼리 규칙
- better-sqlite3 동기 API 사용 (await 불필요)
- `db.prepare('SQL').run()` / `.get()` / `.all()`
- 트랜잭션: `db.transaction(() => { ... })()`
- 사용자 입력은 반드시 `?` 플레이스홀더 사용 (SQL 인젝션 방지)
- `INSERT OR IGNORE` 사용 시 UNIQUE 충돌 방지

### 5.5 Joi 검증
- Controller에서 검증, Service는 검증된 데이터만 받음
- 스키마는 Controller 파일 상단에 정의
- 에러 메시지는 한글로, 사용자 친화적

---

## 6. 프론트엔드 규칙

### 6.1 API 호출 패턴
```js
// 기본 fetch (추후 axios로 전환 가능)
async function apiCall(url, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '요청 실패');
  return json.data;
}
```

### 6.2 상태 관리
- 전역 상태 없음 (props drilling 최소화)
- 페이지별 `useState` + `useEffect`로 자체 관리
- 공통 상태(로그인 등)는 `localStorage`에 token 저장

### 6.3 에러 처리 (프론트)
- API 호출 실패 시 `alert()` 또는 토스트 메시지
- 폼 validation은 submit 시점에 일괄 검증
- 네트워크 에러: `try/catch`로 잡아 사용자 안내

### 6.4 컴포넌트 스타일 순서
1. `import` (외부 → 내부)
2. mock data (개발용)
3. `export default function Component()` 
4. `useState` / `useEffect` / hooks
5. handlers (`handleXxx`)
6. `return ( JSX )`

---

## 7. 마이그레이션/시드 작업 규칙

### 7.1 DB 변경 시
1. `migrations/`에 새로운 `.sql` 파일 생성 (예: `002_add_column.sql`)
2. `DB_SCHEMA.md` 함께 업데이트
3. `npm run migrate`로 실행

### 7.2 시드 데이터 추가 시
1. `db/seed.js`에 INSERT 구문 추가
2. `SEED_DATA.md` 함께 업데이트
3. `npm run seed`로 실행 (중복 방지를 위해 `INSERT OR IGNORE` 사용)

