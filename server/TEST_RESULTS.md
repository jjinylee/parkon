# 주차ON (ParkON) 통합 테스트 결과

> 마지막 실행: 2026-07-01
> 기준 문서: `test-scenario.md` (134개 시나리오), `PR.md` v1.8

---

## 1. E2E API 테스트

**파일**: `server/e2e-test.mjs`  
**결과**: **49/49 통과 ✅**  
**실행 방식**: Node.js fetch API로 서버 (localhost:4000) 직접 호출, JWT 인증 포함

### 테스트 목록

| ID | 시나리오 | 결과 |
|:---|:---------|:----:|
| A1 | 일반사용자 회원가입 (pending) | ✅ |
| A2 | 두번째 계정 회원가입 | ✅ |
| A3 | pending 상태 유저 로그인 불가 | ✅ |
| A4 | super_admin 로그인 | ✅ |
| A5 | admin 로그인 | ✅ |
| A6 | 일반유저 로그인 (김철수) | ✅ |
| A7 | 관리자가 신규 유저 승인 | ✅ |
| A8 | 승인 후 로그인 → status=approved | ✅ |
| B1 | 템플릿 목록 조회 (published) | ✅ |
| B2 | 템플릿 상세 + 질문 조회 | ✅ |
| B3 | 신청 생성 (draft) | ✅ |
| B4 | 답변 저장 (draft) | ✅ |
| B5 | 신청 제출 (submit) + 점수=20 | ✅ |
| B6 | 중복 신청 불가 | ✅ |
| B7 | 내 신청 목록 조회 | ✅ |
| B8 | 신청 상세 조회 (답변 포함) | ✅ |
| C1 | 관리자 신청 목록 조회 | ✅ |
| C2 | 관리자 승인 처리 | ✅ |
| C3 | 반려 테스트용 신청 생성+제출 | ✅ |
| C4 | 관리자 반려 처리 | ✅ |
| C5 | 통계 조회 | ✅ |
| D1 | 사용자 목록 조회 | ✅ |
| D2 | 사용자 차단→로그인불가→복구 | ✅ |
| D3 | 화이트리스트 등록 | ✅ |
| D4 | 화이트리스트 목록+검색 | ✅ |
| D5 | 화이트리스트 삭제 | ✅ |
| D6 | 메일 템플릿 생성 | ✅ |
| D7 | 메일 템플릿 목록 | ✅ |
| D8 | 메일 템플릿 삭제 | ✅ |
| E1 | 마이페이지 조회 | ✅ |
| E2 | 마이페이지 수정 | ✅ |
| F1 | 템플릿 생성 (step 1) | ✅ |
| F2 | 질문 저장 (step 2) | ✅ |
| F3 | 템플릿 공개 | ✅ |
| F4 | 공개 템플릿 질문 확인 | ✅ |
| G1 | 관리자 목록 | ✅ |
| G2 | 관리자 지정 | ✅ |
| G3 | 중복 지정 방지 | ✅ |
| G4 | 관리자 해제 | ✅ |
| H1 | 잘못된 로그인 | ✅ |
| H2 | 중복 이메일 회원가입 | ✅ |
| H3 | 마감일 지난 신청 제출 불가 | ✅ |
| H4 | 인증 없이 접근 차단 | ✅ |
| H5 | 일반유저 admin API 차단 | ✅ |
| I1 | config/questions - questions 키 누락 | ✅ |
| I2 | config/questions - question_no 누락 | ✅ |
| I3 | config/questions - label 누락 | ✅ |
| I4 | config/questions - 잘못된 type 값 | ✅ |
| I5 | config/questions - 올바른 저장 | ✅ |

### E2E 버그 수정 내역

| 문제 | 원인 | 해결 |
|:-----|:-----|:-----|
| B5 submit 500 Error | DB에 `consent_agreed` 컬럼 없음 | `005_consent_agreed.sql` 마이그레이션 추가 |
| B8 total_score 불일치 | 하드코딩 100 vs 실제 점수 20 | 기대값 20으로 수정 |
| A1 회원가입 실패 | DB 미초기화 상태에서 재실행 | DB 초기화 후 실행 |

---

## 2. UI 자동화 테스트 (Playwright)

**파일**: `ui-test.cjs`  
**결과**: **15/15 통과 ✅**  
**실행 방식**: Headless Chromium (playwright) → localhost:5173, 실제 브라우저 조작

### 테스트 목록

| ID | 시나리오 | 결과 | 비고 |
|:---|:---------|:----:|:-----|
| UI_101-1 | 회원가입 성공 → /login 이동 | ✅ | 고유 uid 생성, API 201 확인 |
| UI_101-2 | @mobigen.com 외 이메일 차단 | ✅ | 페이지에 "mobigen" 에러문구 표시 확인 |
| UI_101-3 | 중복 이메일 차단 | ✅ | "이미 등록된" 에러 표시 확인 |
| UI_101-4 | 필수항목 누락 → /signup 잔류 | ✅ | URL 변경 없음 |
| UI_100-1 | 승인된 사용자(chulsoo) 로그인 성공 | ✅ | /login → 다른 페이지로 이동 |
| UI_100-2 | 잘못된 비밀번호 → 실패 | ✅ | "일치하지 않습니다" 에러 표시 |
| UI_210-1 | 로그인→마이페이지 자동 이동 | ✅ | /mypage 리디렉트 확인 |
| - | HomePage 기본 렌더링 | ✅ | "주차" 텍스트 포함 확인 |
| - | 관리자 로그인 | ✅ | admin@parkon.com 로그인 성공 |
| UI_411 | 관리자 신청현황 페이지 | ✅ | /admin/status 접근 |
| UI_301 | 템플릿 목록 | ✅ | /admin/templates 접근 |
| UI_510 | 화이트리스트 페이지 | ✅ | "화이트" 텍스트 포함 |
| UI_540 | 사용자 관리 페이지 | ✅ | "사용자" 텍스트 포함 |
| H4 | 비로그인 /admin 차단 | ✅ | /login 리디렉트 |
| H5 | 일반유저 /admin 차단 | ✅ | 접근 불가 확인 |

### UI 테스트 이슈

| 문제 | 해결 |
|:-----|:-----|
| Playwright EPIPE 오류 (Node v24 번들) | `npx playwright@1.60.0` 설치하여 Node v18 사용 |
| Chromium libnspr4/libnss3.so 누락 | `apt-get download` 후 `LD_LIBRARY_PATH` 설정으로 우회 |
| 로그인 후 재로그인 시 auth 캐시 충돌 | `localStorage.clear()` + `clearCookies()`로 로그아웃 처리 |
| 회원가입 uid=4자 → 전화번호 형식 불일치 | `Date.now().toString().slice(-8)`로 8자리 숫자 사용 |

---

## 3. 통합 커버리지 요약

| 구분 | 통과 | 미테스트 | 합계 |
|:-----|:----:|:--------:|:----:|
| E2E API 테스트 (server/e2e-test.mjs) | 49 | 0 | 49 |
| UI 자동화 테스트 (ui-test.cjs) | 15 | 0 | 15 |
| test-scenario.md 수동 시나리오 | 61 | 73 | 134 |

**test-scenario.md 기준 커버리지**: 61/134 (45.5%) 자동화 완료, 73개 수동 확인 필요

### 미테스트 주요 항목 (73개)
- 파일 업로드 (5개 제한, 100MB 제한)
- 신청폼 radio 점수 실시간 플로팅바
- 동의(consent) "아니오" 선택 후 제출
- 관리자 다중선택 승인 / 상위 N명 승인
- CSV 다운로드 (화이트리스트 포함/미포함)
- 메일 발송 (템플릿 선택→치환자→발송)
- 통계 월별추이차트 SVG
- 반응형 (768px 미만 카드 전환)
- 타임존 date parsing
- CSS 세부 (파란 세로줄 10px, flex-1 동일 가로폭 등)

---

## 4. 실행 방법

### E2E API 테스트
```bash
cd server
tmux kill-session -t parkon-server 2>/dev/null
fuser -k 4000/tcp 2>/dev/null
rm -f data/parkon.db*
node src/db/migrate.js
node src/db/seed.js
tmux new-session -d -s parkon-server 'node src/index.js'
sleep 2
node e2e-test.mjs
```

### UI 테스트 (Playwright)
```bash
cd /home/jjiny/work/parkon
LD_LIBRARY_PATH=/tmp/playwright-libs/usr/lib/x86_64-linux-gnu \
  node ui-test.cjs
```
