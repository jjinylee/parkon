# 주차ON 디자인 시스템 (design.md) — Luminous Integrity

> **Single Source of Truth** — 모든 컬러·타이포·컴포넌트 토큰은 이 파일이 기준입니다.
> DESIGN_0608.md + design.md 병합 완료 | 뱃지 C안 확정 | 최종 확정: 2026-06-08

---

## 1. 컬러 팔레트

### 1.1 브랜드 핵심 컬러

| 역할 | 변수명 | 색상값 | 사용처 |
|:-----|:-------|:-------|:-------|
| 주색 (Primary) | `--color-primary` | `#3B82F6` | 주요 버튼, 활성 메뉴, 카드 강조선 |
| 주색 컨테이너 | `--color-primary-container` | `#2170E4` | 강조 배경, 그라데이션 끝색 |
| 주색 연한색 | `--color-primary-light` | `#DBEAFE` | 배경 강조, 공개 뱃지 배경 |
| 보조색 (Secondary) | `--color-secondary` | `#60A5FA` | 로고 'ON', Hover, 보조 강조 |
| 보조색 컨테이너 | `--color-secondary-container` | `#64A8FE` | 보조 버튼 배경 |
| 보조색 연한색 | `--color-secondary-light` | `#E0F2FE` | 보조 배경 강조 |
| 3차색 (Tertiary) | `--color-tertiary` | `#545D62` | 보조 아이콘, 비강조 레이블 |
| 3차색 컨테이너 | `--color-tertiary-container` | `#6D767B` | 중립 버튼, 태그 |
| 성공 | `--color-success` | `#10B981` | 승인 완료, 활성 상태 |
| 위험 | `--color-danger` | `#BA1A1A` | 반려, 삭제, 경고 |
| 위험 컨테이너 | `--color-danger-container` | `#FFDAD6` | 위험 배경 |

### 1.2 서피스 & 배경 토큰

| 역할 | 변수명 | 색상값 |
|:-----|:-------|:-------|
| 기본 배경 | `--color-bg` | `#F6FAFE` |
| 카드/패널 | `--color-surface` | `#FFFFFF` |
| Surface Dim | `--color-surface-dim` | `#D6DADE` |
| Surface Container Low | `--color-surface-container-low` | `#F0F4F8` |
| Surface Container | `--color-surface-container` | `#EAEEF2` |
| Surface Container High | `--color-surface-container-high` | `#E4E9ED` |
| Surface Container Highest | `--color-surface-container-highest` | `#DFE3E7` |
| Inverse Surface | `--color-inverse-surface` | `#2C3134` |
| Inverse On-Surface | `--color-inverse-on-surface` | `#EDF1F5` |

### 1.3 텍스트 & 테두리 토큰

| 역할 | 변수명 | 색상값 |
|:-----|:-------|:-------|
| 본문 텍스트 | `--color-text` | `#171C1F` |
| 보조 텍스트 | `--color-text-sub` | `#424754` |
| Outline (테두리) | `--color-outline` | `#727785` |
| Outline Variant | `--color-outline-variant` | `#C2C6D6` |

### 1.4 상태 뱃지 색상 (C안 확정 — 2026-06-08)
> 규칙: **배경은 연하게, 글자색은 진하게 · 닷(●) 아이콘으로 미세 구분**
> 색수를 5개로 최소화. 의미가 유사한 상태는 같은 색으로 통합.

| 뱃지 상태 | 통합 대상 | 배경색 | 글자색 | 닷 색상 |
|:---------|:---------|:-------|:-------|:--------|
| 대기 | 대기 | `#FEF3C7` | `#92400E` | `#F59E0B` |
| 완료 | 배정완료 · 참여완료 | `#D1FAE5` | `#065F46` | `#10B981` |
| 반려 | 반려 | `#FEE2E2` | `#991B1B` | `#EF4444` |
| 활성 | 공개 · 활성 상태 | `#DBEAFE` | `#1D4ED8` | `#3B82F6` |
| 비활성 | 미공개 · 미참여 | `#F1F5F9` | `#475569` | `#94A3B8` |

**뱃지 렌더링 예시**
```html
<!-- 완료 -->
<span style="background:#D1FAE5; color:#065F46; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
  <span style="width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0;"></span>
  배정완료
</span>

<!-- 반려 -->
<span style="background:#FEE2E2; color:#991B1B; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
  <span style="width:6px;height:6px;border-radius:50%;background:#EF4444;flex-shrink:0;"></span>
  반려
</span>
```

---

## 2. 타이포그래피

기본 폰트: `'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif`

| 토큰명 | 크기 | 두께 | Line-height | Letter-spacing | 사용처 |
|:-------|:-----|:-----|:------------|:---------------|:-------|
| display-lg | 56px | 700 | 1.1 | -0.04em | 대형 히어로 제목 |
| headline-xl | 32px | 600 | 1.2 | -0.02em | 섹션 대제목 |
| headline-lg (Page Header) | **28px** | 600 | 1.3 | -0.01em | **모든 화면 페이지 타이틀** |
| body-lg | 18px | 400 | 1.6 | 0.01em | 강조 본문 |
| body-md | 16px | 400 | 1.6 | 0.01em | 일반 본문 |
| label-md | 14px | 500 | 1.4 | 0.05em | 폼 레이블, 뱃지 |
| caption | 12px | 500 | 1.4 | 0.02em | 도움말, 메타 정보 |

> 그리드 헤더: label-md (14px / 500) 적용

---

## 3. 버튼 스타일

| 유형 | 배경 | 글자색 | 테두리 | 용도 |
|:-----|:-----|:-------|:-------|:-----|
| Primary | `#3B82F6` | `#FFFFFF` Bold | 없음 | 주요 액션 (저장, 제출, 적용) |
| Secondary | `#60A5FA` | `#FFFFFF` Bold | 없음 | 보조 액션 (등록, 다음) |
| Outlined | `transparent` | `#3B82F6` | `1px solid #DBEAFE` | 임시저장, 취소, 이전 |
| Danger | `#FFDAD6` | `#93000A` | 없음 | 삭제, 반려 |
| 비활성 | — | — | — | `opacity: 0.4; cursor: not-allowed` |

- **Hover**: Secondary(`#60A5FA`)로 부드럽게 전환
- **Radius**: 8px (모든 버튼 공통)
- **버튼 아이콘 규칙**: `표준레이아웃설계서.md` 섹션 6.1 참조

---

## 4. 컴포넌트 스타일

### 4.1 카드 (Bento Cell)
```css
background: rgba(255, 255, 255, 0.6);
border: 1px solid #C2C6D6;
border-radius: 12px;        /* 일반 카드 */
border-radius: 24px;        /* Bento 메인 셀 */
padding: 24px;
box-shadow: 0px 2px 4px rgba(59, 130, 246, 0.05);
```

### 4.2 입력 필드 (Neumorphic Recessed)
```css
/* 기본 */
border: 1px solid #C2C6D6;
border-radius: 8px;
background: #F0F4F8;
box-shadow: inset 2px 2px 4px rgba(59,130,246,0.06);

/* Focus */
border-color: #3B82F6;
background: #FFFFFF;
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
```

### 4.3 상태 뱃지
```css
padding: 2px 8px;
border-radius: 4px;
font-size: 12px;
font-weight: 600;
/* 색상은 1.4 상태 뱃지 색상 테이블 참조 */
```

### 4.4 도움말 아이콘
- `?` 아이콘, 호버/클릭 시 말풍선 툴팁
- 툴팁: `background: #171C1F; color: #EDF1F5; border-radius: 4px; font-size: 12px; padding: 6px 10px`

### 4.5 플로팅 버튼 (위로가기)
- 질문 항목 5개 이상일 때 표시
- 우측 하단 고정: `border-radius: 50%; background: #3B82F6; color: #fff`

### 4.6 GNB
```css
height: 64px;
background: #FFFFFF;
border-bottom: 1px solid #C2C6D6;
position: fixed;
top: 0;
left: 0;
width: 100%;
z-index: 100;
/* 좌측 200px: 로고 영역 + border-right: 1px solid #C2C6D6 */
/* 우측: flex-1, 사용자 컨트롤 우측 정렬 */
```

---

## 5. 스페이싱 & 형태

| 항목 | 값 |
|:-----|:---|
| 기본 radius | **8px** |
| 소형 radius | 4px |
| 카드 radius | 12px |
| Bento 셀 radius | 24px |
| 카드 패딩 | 24px |
| 그리드 row 높이 | 44px |
| GNB 높이 | **64px** |
| 버튼 높이 | 36px (기본) / 32px (소형) |
| 최소 여백 | 8px (미만 금지) |
| 간격 단위 | 4px 배수 (8, 16, 24, 32, 48, 64px) |
| Bento gutter | 24px |
| Bento margin | 32px |
| 최대 컨테이너 너비 | 1440px |
| 그리드 컬럼 | 12컬럼 |

---

## 6. Elevation (그림자 위계)

| 레벨 | 적용 요소 | Shadow |
|:-----|:----------|:-------|
| 0 | 전체 배경 | 없음 |
| 1 | 기본 카드, 검색바 | `0px 2px 4px rgba(59,130,246,0.05)` |
| 2 | 드롭다운, 팝오버 | `0px 4px 12px rgba(59,130,246,0.10)` |
| 3 | 모달, 긴급 팝업 | `0px 8px 24px rgba(59,130,246,0.15)` |

Neumorphic Lift (활성 카드):
```css
box-shadow:
  -8px -8px 16px rgba(255,255,255,0.8),
   8px  8px 16px rgba(59,130,246,0.12);
```

---

## 7. 그리드 강조 (승인 가능 인원 적용 시)

- 배정 가능 인원 N명 → 상위 N행 배경: `#DBEAFE`
- 좌측 경계선: `border-left: 3px solid #3B82F6`

---

## 8. 반응형

### 8.1 브레이크포인트

| 이름 | 너비 | 기준 |
|:----|:-----|:-----|
| Desktop | ≥1440px | 최대 컨테이너 1440px |
| Tablet Landscape | 1024~1439px | LNB 고정, 그리드 축소 |
| Tablet Portrait | 768~1023px | LNB 고정, 콘텐츠 스택 |
| Mobile | <768px | LNB 숨김, 햄버거 메뉴 |
| Small Mobile | <480px | 최소 여백, 핵심 정보만 |

### 8.2 레이아웃 전환 규칙

| 브레이크포인트 | 컬럼 | 여백 | 레이아웃 |
|:-------------|:-----|:-----|:---------|
| ≥1440px | 12컬럼 | 32px | 고정 LNB + 와이드 콘텐츠 |
| 1024~1439px | 12컬럼 | 24px | 고정 LNB, 콘텐츠 패딩 축소 |
| 768~1023px | 6컬럼 | 24px | 고정 LNB, Bento 셀 수직 스택 |
| 480~767px | 2컬럼 | 16px | LNB 오버레이, 전체 폭 |
| <480px | 1컬럼 | 12px | 최소 패딩, 아이콘 위주 |

### 8.3 사용자 페이지 (UI_200, UI_201, UI_210)

| 요소 | ≥768px | <768px |
|:-----|:-------|:-------|
| GNB 높이 | 64px | 56px |
| 진행중 카드 | 3열 (`lg:grid-cols-3`) | 1열 |
| 기본정보 그리드 | 2열 (`grid-cols-2`) | 1열 |
| 페이지 패딩 | 32px | 16px |
| 그리드 | 전체 컬럼 | `overflow-x-auto` 스크롤 |
| 타이틀 크기 | 28px | 22px |

### 8.4 관리자 페이지 (UI_300~UI_540)

| 요소 | ≥768px | <768px |
|:-----|:-------|:-------|
| LNB | 200px 고정, 항상 노출 | 오버레이 (transform), 햄버거 토글 |
| 메인 여백 | `ml-[200px]` | `ml-0` |
| GNB 로고 영역 | 200px | 140px, ADMIN 뱃지 숨김 |
| 사용자 이름 | 표시 | 숨김 (아이콘만) |
| Header Band 패딩 | `px-6 py-3` | `px-4 py-2` |
| 검색 영역 | 인라인 1줄 | 세로 스택 |
| 액션 버튼 | 인라인 | 세로 스택, 전체 폭 |
| 페이지 패딩 | 32px | 16px |
| 그리드 | 전체 컬럼 | `overflow-x-auto` 또는 카드형 리스트 |

### 8.5 table 반응형 처리

```css
/* 768px 이상: 기본 테이블 */
@media (min-width: 768px) {
  .responsive-table { width: 100%; }
}

/* 768px 미만: 수평 스크롤 */
@media (max-width: 767px) {
  .responsive-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .responsive-table { min-width: 640px; }
}

/* 480px 미만: 카드형 리스트 */
@media (max-width: 479px) {
  .responsive-table { display: none; }
  .responsive-card-list { display: flex; }
}
```

### 8.6 LNB 햄버거 메뉴

```css
/* <768px 에서 LNB 숨김 */
@media (max-width: 767px) {
  .lnb-desktop { display: none; }
  .lnb-mobile-overlay {
    display: block;
    position: fixed;
    top: 64px; left: 0;
    width: 200px;
    height: calc(100vh - 64px);
    background: #FFFFFF;
    z-index: 90;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
  }
  .lnb-mobile-overlay.open { transform: translateX(0); }
  .hamburger-btn { display: flex; }
}

/* ≥768px 에서 햄버거 숨김 */
@media (min-width: 768px) {
  .hamburger-btn { display: none; }
}
```

---

## 9. 로고 컬러 규칙

- `주차` → `#171C1F` (기본 텍스트, 다크 네이비)
- `ON` → `#3B82F6` (Primary, Bold 강조)

---

## 10. Do's and Don'ts

**Do's**
- 텍스트와 배경 간 높은 대비 유지 (가독성 최우선)
- 아이콘과 텍스트 중앙 정렬
- 정의된 팔레트 내에서만 채도 조절

**Don'ts**
- 8px 미만의 여백 사용 금지
- 팔레트 외 색상 하드코딩 금지
- 원색의 원색적 사용 지양
