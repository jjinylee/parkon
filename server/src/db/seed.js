require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const db = require('../config/database');

function seed() {
  const hash = bcrypt.hashSync('admin123!', 10);
  const userHash = bcrypt.hashSync('user1234!', 10);

  db.exec(`
    -- super_admin
    INSERT OR IGNORE INTO users (id, name, phone, email, password, role, status, created_at)
    VALUES (1, '최고관리자', '010-0000-0000', 'admin@parkon.com', '${hash}', 'super_admin', 'approved', datetime('now','localtime'));

    -- admin
    INSERT OR IGNORE INTO users (id, name, phone, email, password, role, status, created_at)
    VALUES (2, '관리자A', '010-0000-0001', 'manager.a@parkon.com', '${hash}', 'admin', 'approved', datetime('now','localtime'));

    -- 일반 사용자
    INSERT OR IGNORE INTO users (id, name, phone, email, password, role, status, created_at) VALUES
    (3, '김철수', '010-1234-5678', 'chulsoo@company.com',  '${userHash}', 'user', 'approved', datetime('now','localtime')),
    (4, '이영희', '010-2345-6789', 'younghee@company.com', '${userHash}', 'user', 'approved', datetime('now','localtime')),
    (5, '박지민', '010-3456-7890', 'jimin@company.com',    '${userHash}', 'user', 'pending',  datetime('now','localtime')),
    (6, '강하늘', '010-4567-8901', 'haneul@company.com',   '${userHash}', 'user', 'blocked',  datetime('now','localtime')),
    (7, '정수진', '010-5678-9012', 'sujin@company.com',    '${userHash}', 'user', 'approved', datetime('now','localtime'));

    -- 템플릿
    INSERT OR IGNORE INTO application_templates (id, title, description, start_date, end_date, allow_modify, status, created_by, created_at)
    VALUES (1, '2026년 7월 월정기 주차 신청',
            '<p>2026년 7월 정기주차를 신청합니다.</p>',
            '2026-07-01', '2026-07-25', 0, 'published', 1, datetime('now','localtime'));

    -- 질문 Q01~Q08
    INSERT OR IGNORE INTO application_questions (id, template_id, question_text, input_type, is_required, score, sort_order) VALUES
    (1, 1, '귀하의 연락처를 기재해 주세요',            'text',     1, 0, 1),
    (2, 1, '귀하의 차량정보를 기재해 주세요',            'text',     1, 0, 2),
    (3, 1, '귀하의 직책을 체크해 주세요',               'radio',    1, 5, 3),
    (4, 1, '귀하의 입사 일자를 작성해 주세요',           'date',     1, 0, 4),
    (5, 1, '귀하의 입사 일자로부터 현재까지의 재직기간을 체크해 주세요', 'radio', 1, 5, 5),
    (6, 1, '귀하의 거주 중인 주소지를 기재해 주세요',     'textarea', 1, 0, 6),
    (7, 1, '귀하의 거주지로부터 회사까지 출근 편도거리를 선택해 주세요', 'radio', 1, 5, 7),
    (8, 1, '귀하의 거주지로부터 회사까지 출근 편도시간을 선택해 주세요', 'radio', 1, 5, 8),
    (9, 1, '귀하의 신체, 업무 기타 사정으로 불가피하게 자기차량을 이용하여야 하는 사유가 있을 경우 기재해 주세요.', 'text', 0, 5, 9);

    -- Q03 옵션 (config: 팀장/실장 5pt, 팀원 3pt)
    INSERT OR IGNORE INTO question_options (id, question_id, option_text, score, sort_order) VALUES
    (1, 3, '팀장/실장', 5, 1),
    (2, 3, '팀원',     3, 2);

    -- Q05 옵션 (config: 15년 초과 5pt → 1년 미만 1pt)
    INSERT OR IGNORE INTO question_options (id, question_id, option_text, score, sort_order) VALUES
    (3,  5, '15년 초과',              5, 1),
    (4,  5, '10년 초과 15년 미만',    4, 2),
    (5,  5, '5년 초과 10년 미만',     3, 3),
    (6,  5, '1년 초과 5년 미만',      2, 4),
    (7,  5, '1년 미만',               1, 5);

    -- Q07 옵션 (config: 30km 초과 5pt → 5km 미만 1pt)
    INSERT OR IGNORE INTO question_options (id, question_id, option_text, score, sort_order) VALUES
    (8,  7, '30km 초과',              5, 1),
    (9,  7, '20km 초과 30km 미만',    4, 2),
    (10, 7, '10km 초과 20km 미만',    3, 3),
    (11, 7, '5km 초과 10km 미만',     2, 4),
    (12, 7, '5km 미만',               1, 5);

    -- Q08 옵션 (config: 120분 초과 5pt → 30분 미만 1pt)
    INSERT OR IGNORE INTO question_options (id, question_id, option_text, score, sort_order) VALUES
    (13, 8, '120분 초과',              5, 1),
    (14, 8, '90분 이상 120분 미만',    4, 2),
    (15, 8, '60분 초과 90분 미만',     3, 3),
    (16, 8, '30분 초과 60분 미만',     2, 4),
    (17, 8, '30분 미만',               1, 5);

    -- 관리자 지정
    INSERT OR IGNORE INTO admin_managers (user_id, created_by, created_at)
    VALUES (2, 1, datetime('now','localtime'));

    -- 화이트리스트
    INSERT OR IGNORE INTO whitelist (id, name, car_number, phone, position, created_by, created_at) VALUES
    (1, '김철수', '123가 4567', '010-1234-5678', '부장', 1, datetime('now','localtime')),
    (2, '이영희', '98나 7654', '010-9876-5432', '대리', 1, datetime('now','localtime')),
    (3, '박지민', '45다 1029', '010-5555-1234', '사원', 1, datetime('now','localtime'));

    -- 메일 템플릿
    INSERT OR IGNORE INTO mail_templates (id, title, content, status, created_by, created_at) VALUES
    (1, '주차 신청 승인 안내',
     '<p>안녕하세요, {name}님.</p><p>귀하의 주차 신청이 <strong>승인</strong>되었습니다.</p>',
     'active', 1, datetime('now','localtime')),
    (2, '주차 신청 반려 안내',
     '<p>안녕하세요, {name}님.</p><p>귀하의 주차 신청이 <strong>반려</strong>되었습니다.</p><p>사유: {reason}</p>',
     'active', 1, datetime('now','localtime'));

  `);

  // 전역 질문 설정 (parking_score_config.json 기반) — 개별 INSERT로 처리 (SQL quote 충돌 방지)
  const configJson = JSON.stringify({
    version: '1.1.0',
    description: '주차ON 월정기 주차신청 질문 및 점수 배점 설정 (전체 1~8번)',
    questions: [
      { question_no: 1, question_id: 'Q01_PHONE', info_type: 'basic', title: '연락처', label: '귀하의 연락처를 기재해 주세요', placeholder: '예) 010-4225-3461', required: true, type: 'text', scored: false, grid_view: true },
      { question_no: 2, question_id: 'Q02_CAR_NUMBER', info_type: 'basic', title: '차량정보', label: '귀하의 차량정보를 기재해 주세요', placeholder: '예) 222러8861', required: true, type: 'text', scored: false, grid_view: true },
      { question_no: 3, question_id: 'Q03_POSITION', info_type: 'apply', title: '직책', label: '귀하의 직책을 체크해 주세요', required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q03_A', label: '팀장/실장', score: 5 }, { option_id: 'Q03_B', label: '팀원', score: 3 }] },
      { question_no: 4, question_id: 'Q04_JOIN_DATE', info_type: 'apply', title: '입사 일자', label: '귀하의 입사 일자를 작성해 주세요', placeholder: '예) 2018-02-19', required: true, type: 'date', scored: false, note: 'Q05 재직기간 자동 계산에 활용됩니다', grid_view: true },
      { question_no: 5, question_id: 'Q05_TENURE', info_type: 'apply', title: '재직기간', label: '귀하의 입사 일자로부터 현재까지의 재직기간을 체크해 주세요', required: true, type: 'radio', scored: true, options: [{ option_id: 'Q05_A', label: '15년 초과', score: 5 }, { option_id: 'Q05_B', label: '10년 초과 15년 미만', score: 4 }, { option_id: 'Q05_C', label: '5년 초과 10년 미만', score: 3 }, { option_id: 'Q05_D', label: '1년 초과 5년 미만', score: 2 }, { option_id: 'Q05_E', label: '1년 미만', score: 1 }] },
      { question_no: 6, question_id: 'Q06_ADDRESS', info_type: 'apply', title: '주소지', label: '귀하의 거주 중인 주소지를 기재해 주세요', placeholder: '예) 서울시 송파구 송파대로', hint: '도로명, 시/군/구 형식으로 입력해 주세요', required: true, type: 'text', scored: false, note: 'Q07 편도거리 / Q08 편도시간 계산의 기준 주소로 활용됩니다' },
      { question_no: 7, question_id: 'Q07_DISTANCE', info_type: 'apply', title: '출근 편도거리', label: "귀하의 거주 중인 주소지로부터 회사까지 '출근' 편도거리(네이버지도, 자동차, 최단거리 기준)를 체크해 주세요", required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q07_A', label: '30km 초과', score: 5 }, { option_id: 'Q07_B', label: '20km 초과 30km 미만', score: 4 }, { option_id: 'Q07_C', label: '10km 초과 20km 미만', score: 3 }, { option_id: 'Q07_D', label: '5km 초과 10km 미만', score: 2 }, { option_id: 'Q07_E', label: '5km 미만', score: 1 }] },
      { question_no: 8, question_id: 'Q08_COMMUTE_TIME', info_type: 'apply', title: '출근 편도시간', label: "귀하의 거주 중인 주소지로부터 회사까지 '출근' 편도시간(엔진시동 - 건물주차)을 체크해 주세요", required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q08_A', label: '120분 초과', score: 5 }, { option_id: 'Q08_B', label: '90분 이상 120분 미만', score: 4 }, { option_id: 'Q08_C', label: '60분 초과 90분 미만', score: 3 }, { option_id: 'Q08_D', label: '30분 초과 60분 미만', score: 2 }, { option_id: 'Q08_E', label: '30분 미만', score: 1 }] },
      { question_no: 9, question_id: 'Q09_REASON', info_type: 'basic', title: '특수 사유', label: '귀하의 신체, 업무 기타 사정으로 불가피하게 자기차량을 이용하여야 하는 사유가 있을 경우 기재해 주세요.', placeholder: '(예: 임신, 부상/장애, 치료 등 특수한 사정으로 제한, 필요한 경우 관련 증빙 제출 요구할 수 있음)', required: false, type: 'text', scored: true, score: 5, grid_view: true },
    ],
  });

  const existingConfig = db.prepare("SELECT key FROM app_config WHERE key = 'question_config'").get();
  if (!existingConfig) {
    db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)').run('question_config', configJson);
  }

  console.log('Seed completed successfully.');
}

seed();
process.exit(0);
