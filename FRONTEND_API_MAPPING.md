# 주차ON 프론트-API 데이터 매핑

## 문서 정보

| 항목 | 내용 |
| :--- | :--- |
| 버전 | v1.4 |
| 작성일 | 2026-07-01 |
| Base URL | `/api/v1` |

---

## 인증

| 화면 | ID | API | 메서드 |
|:-----|:---|:----|:------|
| 로그인 | UI_100 | `/auth/login` | POST |
| 회원가입 | UI_101 | `/auth/signup` | POST |

---

## 사용자 페이지

### HomePage — UI_200 (주차 신청 목록)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 진행 중인 신청 건 | `GET /templates?status=published` | 공개된 템플릿 중 현재 진행중인 것 |
| 최근 신청 이력 테이블 | `GET /applications` | 내 신청 목록, 최근순 정렬 |

### RegisterPage — UI_201 (주차 신청 입력)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 폼 구조 + 배너 정보 로드 | `GET /templates/:id` | 질문 항목, 기간, 제목, 첨부파일 포함 |
| 첨부파일 다운로드 | `GET /files/:id/download` | (사용자도 다운로드 가능) |
| 임시저장 | `POST /applications` | 최초 생성, status=draft |
| 수정/제출 | `PUT /applications/:id` | `action: "submit"` 시 점수 자동 산정 |
| MyPage 데이터 로드 | `GET /mypage` | 마이페이지 저장값 → 텍스트 매칭(label↔option_text)으로 폼 복원 |
| MyPage 저장 | `PUT /mypage` | 제출 시 마이페이지 answers 업데이트 (텍스트 매칭) |

### MyPage — UI_210 (마이페이지)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 내 정보 + 저장된 신청 항목 + 마이페이지 질문답변 조회 | `GET /mypage` | 응답에 `mypage_answers` 객체 포함 |
| 정보 수정 | `PUT /mypage` | phone, car_number, email, answers(JSON string) |
| 질문 전역 설정 조회 | `GET /config/questions` | 점수 폼 readonly 표시용 |

---

## 관리자 페이지

### AdminDashboard — UI_300 (신청 개설 목록)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 템플릿 목록 테이블 | `GET /templates` | `?status=all` |
| 신청폼 관리 모달 (질문 목록) | `GET /templates/:id/questions` | |
| 템플릿 삭제 | `DELETE /templates/:id` | |

### AdminCreate — UI_301 (신청 개설 등록 1단계)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 템플릿 생성 | `POST /templates` | 응답으로 받은 id를 step2로 전달 |
| 파일 첨부 선택 | — | 로컬 state에 File 객체 저장, step2에서 일괄 업로드 |

### AdminCreateStep2 — UI_302 (JSON 설정)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 질문 항목 저장 | `POST /templates/:id/questions` | JSON 업로드/적용 |
| 파일 업로드 | `POST /templates/:id/files` | multipart/form-data, template 생성 직후 호출 |
| 질문 수정 | `PUT /questions/:id` | |
| 질문 삭제 | `DELETE /questions/:id` | |
| 템플릿 공개 | `PUT /templates/:id` | `status: "published"` |

### AdminQuestionConfig — UI_304 (질문 전역 설정)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 질문 설정 조회 | `GET /config/questions` | 기본설정 불러오기(parking_score_config.json) |
| 질문 설정 저장 | `PUT /config/questions` | body: `{ version, description, questions[] }` |

### AdminCopyPage — UI_303 (신청 개설 복사)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 원본 템플릿 정보 로드 | `GET /templates/:id` | location.state 우선, fallback |
| 기존 첨부파일 로드 (edit mode) | `GET /templates/:id/files` | editMode에서 기존 파일 목록 표시 |
| 첨부파일 삭제 (edit mode) | `DELETE /templates/:id/files/:fileId` | `filesToDelete` Set으로 관리 |
| 복사본 생성 | `POST /templates` | |
| 질문 항목 복사 | `POST /templates/:id/questions` | 원본 질문 일괄 등록 |

### AdminDetailPage — UI_412 (신청 상세)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 신청 상세 조회 (답변 포함) | `GET /applications/admin/:id` | 사용자 정보 + 답변 + 점수 |
| 승인 처리 | `PUT /applications/:id/approve` | |
| 반려 처리 | `PUT /applications/:id/reject` | body: `{ reason }` |

### AdminDetailTemplate — UI_304 (템플릿 상세)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 템플릿 상세 + 질문 + 첨부파일 | `GET /templates/:id` | 응답에 `attachments[]` 포함 |
| 첨부파일 다운로드 | `GET /files/:id/download` | 파일 바이너리 다운로드 |
| 템플릿 수정 | `navigate(/admin/copy)` | location.state로 전달 |
| 템플릿 삭제 | `DELETE /templates/:id` | |

### AdminStatus — UI_411 (신청 현황)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 템플릿 목록 | `GET /templates` | `?status=all` (연도 필터는 프론트에서 처리) |
| 신청 목록 (상세 뷰) | `GET /applications/admin/list` | `?template_id=N&sort_by=total_score&sort_order=desc&limit=500` |
| 승인 처리 | `PUT /applications/:id/approve` | body: `{}` (선택적 `approved_count`) |
| 반려 처리 | `PUT /applications/:id/reject` | body: `{ reason }` |
| 다중선택 승인 | `PUT /applications/:id/approve` | 체크박스 선택 후 순차 호출 |

**응답 추가 필드 (v1.4)**:
- `position`: 직책 (sort_order=3 radio, option_text)
- `join_date`: 입사연월 (sort_order=4 date, answer_text)
- `special_reason`: "있음"/"없음" (sort_order=9 존재 여부)
- `special_reason_text`: 특수사유 원문 (sort_order=9 textarea, answer_text)

### AdminHistory — UI_421 (승인 이력)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 승인 통계 + 월별 데이터 | `GET /stats/approval?months=6` | |

### AdminWhitelist — UI_510 (화이트리스트)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 목록 조회 | `GET /whitelist` | `?search=&page=&limit=` |
| 항목 추가 | `POST /whitelist` | body: `{ name, car_number, phone }` |
| 엑셀 업로드 | `POST /whitelist/upload` | multipart/form-data |
| 선택 삭제 | `DELETE /whitelist` | body: `{ ids }` |

### AdminMail — UI_520 (메일 설정)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 목록 조회 | `GET /mail-templates` | |
| 삭제 | `DELETE /mail-templates/:id` | |

### AdminMailCreate — UI_521 (메일 설정 등록)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 생성 | `POST /mail-templates` | body: `{ title, content }` |
| 수정 | `PUT /mail-templates/:id` | |

### AdminUsers — UI_540 (사용자 관리)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 사용자 목록 | `GET /users` | `?status=&search=&page=&limit=` |
| 승인/차단 | `PUT /users/:id/status` | body: `{ status }` |

### AdminManagers — UI_530/531 (관리자 관리)

| 목적 | API | 비고 |
|:-----|:----|:-----|
| 관리자 목록 | `GET /admin/managers` | |
| 관리자 지정 | `POST /admin/managers` | body: `{ user_id }` |
| 권한 해제 | `DELETE /admin/managers/:userId` | |
