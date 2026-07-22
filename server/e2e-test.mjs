const BASE = 'http://localhost:4000/api/v1';

let passed = 0, failed = 0;

async function req(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, ...json };
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  \u2705 ${name}`);
      passed++;
    } catch (e) {
      console.log(`  \u274c ${name}: ${e.message}`);
      failed++;
    }
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

const tests = [];

// ============================================================
// SCENARIO A: Auth Flow
// ============================================================
tests.push(test('A1. 일반사용자 회원가입 (pending)', async () => {
  const r = await req('POST', '/auth/signup', {
    name: '테스트유저', email: 'test@mobigen.com', password: 'test1234!', phone: '010-9999-8888',
  });
  eq(r.success, true, 'signup failed');
  eq(r.data.status, 'pending', 'new user should be pending');
}));

tests.push(test('A2. 두번째 계정 회원가입', async () => {
  const r = await req('POST', '/auth/signup', {
    name: '테스트유저2', email: 'test2@mobigen.com', password: 'test1234!', phone: '010-8888-7777',
  });
  eq(r.success, true);
}));

tests.push(test('A3. pending 상태 유저 로그인 불가 (승인 필요)', async () => {
  const r = await req('POST', '/auth/login', { email: 'test@mobigen.com', password: 'test1234!' });
  eq(r.success, false, 'pending user should NOT be able to login');
  eq(r.status, 403);
}));

tests.push(test('A4. super_admin 로그인', async () => {
  const r = await req('POST', '/auth/login', { email: 'admin@parkon.com', password: 'admin123!' });
  eq(r.success, true);
  eq(r.data.user.role, 'super_admin');
  global.adminToken = r.data.token;
}));

tests.push(test('A5. admin 로그인', async () => {
  const r = await req('POST', '/auth/login', { email: 'manager.a@parkon.com', password: 'admin123!' });
  eq(r.success, true);
  eq(r.data.user.role, 'admin');
}));

tests.push(test('A6. 일반유저 로그인 (김철수)', async () => {
  const r = await req('POST', '/auth/login', { email: 'chulsoo@company.com', password: 'user1234!' });
  eq(r.success, true);
  eq(r.data.user.status, 'approved');
  global.userToken = r.data.token;
}));

tests.push(test('A7. 관리자가 신규 유저 승인', async () => {
  const r1 = await req('GET', '/users', null, global.adminToken);
  const users = r1.data.items;
  const newUser = users.find(u => u.email === 'test@mobigen.com');
  assert(newUser, 'new user not found');
  const r2 = await req('PUT', `/users/${newUser.id}/status`, { status: 'approved' }, global.adminToken);
  eq(r2.success, true);
}));

tests.push(test('A8. 승인 후 로그인 → status=approved', async () => {
  const r = await req('POST', '/auth/login', { email: 'test@mobigen.com', password: 'test1234!' });
  eq(r.success, true);
  eq(r.data.user.status, 'approved');
  global.testUserToken = r.data.token;
}));

// ============================================================
// SCENARIO B: User Application Flow
// ============================================================
tests.push(test('B1. 템플릿 목록 조회 (published)', async () => {
  const r = await req('GET', '/templates?status=published', null, global.testUserToken);
  eq(r.success, true);
  assert(r.data.length >= 1, 'no published templates');
  const seedTemplate = r.data.find(t => t.id === 1);
  global.templateId = seedTemplate ? seedTemplate.id : r.data[0].id;
}));

tests.push(test('B2. 템플릿 상세 + 질문 조회', async () => {
  const r = await req('GET', `/templates/${global.templateId}`, null, global.testUserToken);
  eq(r.success, true);
  assert(r.data.questions.length >= 8, 'expected at least 8 questions');
}));

tests.push(test('B3. 신청 생성 (임시저장 draft)', async () => {
  const r = await req('POST', '/applications', { template_id: global.templateId }, global.testUserToken);
  eq(r.success, true);
  assert(r.data.id > 0, 'no application id');
  global.appId = r.data.id;
}));

tests.push(test('B4. 답변 저장 (draft)', async () => {
  const answers = [
    { question_id: 1, option_id: null, answer_text: '010-9999-8888' },
    { question_id: 2, option_id: null, answer_text: '123가 4567' },
    { question_id: 3, option_id: 1, answer_text: null },
    { question_id: 4, option_id: null, answer_text: '2015-01-01' },
    { question_id: 5, option_id: 3, answer_text: null },
    { question_id: 6, option_id: null, answer_text: '서울시 강남구' },
    { question_id: 7, option_id: 8, answer_text: null },
    { question_id: 8, option_id: 13, answer_text: null },
  ];
  const r = await req('PUT', `/applications/${global.appId}`, { answers }, global.testUserToken);
  eq(r.success, true);
  eq(r.data.status, 'draft');
}));

tests.push(test('B5. 신청 제출 (submit) + 점수 = 20', async () => {
  const answers = [
    { question_id: 1, option_id: null, answer_text: '010-9999-8888' },
    { question_id: 2, option_id: null, answer_text: '123가 4567' },
    { question_id: 3, option_id: 1, answer_text: null },
    { question_id: 4, option_id: null, answer_text: '2015-01-01' },
    { question_id: 5, option_id: 3, answer_text: null },
    { question_id: 6, option_id: null, answer_text: '서울시 강남구' },
    { question_id: 7, option_id: 8, answer_text: null },
    { question_id: 8, option_id: 13, answer_text: null },
  ];
  const r = await req('PUT', `/applications/${global.appId}`, { action: 'submit', answers }, global.testUserToken);
  eq(r.success, true);
  eq(r.data.status, 'submitted');
  eq(r.data.total_score, 20, 'score mismatch (5+5+5+5=20)');
}));

tests.push(test('B6. 중복 신청 불가 (이미 제출됨)', async () => {
  const r = await req('POST', '/applications', { template_id: global.templateId }, global.testUserToken);
  eq(r.success, false, 'should reject duplicate');
}));

tests.push(test('B7. 내 신청 목록 조회', async () => {
  const r = await req('GET', '/applications', null, global.testUserToken);
  eq(r.success, true);
  assert(r.data.length >= 1, 'no applications');
  const app = r.data.find(a => a.id === global.appId);
  assert(app, 'submitted app not found');
  eq(app.status, 'submitted');
}));

tests.push(test('B8. 신청 상세 조회 (답변 포함)', async () => {
  const r = await req('GET', `/applications/${global.appId}`, null, global.testUserToken);
  eq(r.success, true);
  assert(r.data.answers.length >= 8, 'expected 8 answers');
  eq(r.data.status, 'submitted');
  eq(r.data.total_score, 20);
}));

// ============================================================
// SCENARIO C: Admin Approval
// ============================================================
tests.push(test('C1. 관리자 신청 목록 조회', async () => {
  const r = await req('GET', '/applications/admin/list?status=all', null, global.adminToken);
  eq(r.success, true);
  assert(r.data.items.length >= 1, 'no applications');
  global.adminAppId = r.data.items[0].id;
}));

tests.push(test('C2. 관리자 승인 처리', async () => {
  const r = await req('PUT', `/applications/${global.adminAppId}/approve`, { approved_count: 1 }, global.adminToken);
  eq(r.success, true);
  eq(r.data.status, 'approved');
}));

tests.push(test('C3. 반려 테스트용 신청 생성 + 제출', async () => {
  const r1 = await req('POST', '/auth/signup', {
    name: '반려테스트', email: 'reject@mobigen.com', password: 'test1234!', phone: '010-7777-6666',
  });
  eq(r1.success, true);
  const uid = r1.data.id;

  const r2 = await req('PUT', `/users/${uid}/status`, { status: 'approved' }, global.adminToken);
  eq(r2.success, true);

  const r3 = await req('POST', '/auth/login', { email: 'reject@mobigen.com', password: 'test1234!' });
  eq(r3.success, true);
  global.rejectToken = r3.data.token;

  const r4 = await req('POST', '/applications', { template_id: global.templateId }, global.rejectToken);
  eq(r4.success, true);
  global.rejectAppId = r4.data.id;

  const answers = [
    { question_id: 1, option_id: null, answer_text: '010-7777-6666' },
    { question_id: 2, option_id: null, answer_text: '999가 8888' },
    { question_id: 3, option_id: 1, answer_text: null },
    { question_id: 4, option_id: null, answer_text: '2020-01-01' },
    { question_id: 5, option_id: 6, answer_text: null },
    { question_id: 6, option_id: null, answer_text: '서울시' },
    { question_id: 7, option_id: 11, answer_text: null },
    { question_id: 8, option_id: 15, answer_text: null },
  ];
  const r5 = await req('PUT', `/applications/${global.rejectAppId}`, { action: 'submit', answers }, global.rejectToken);
  eq(r5.success, true);
  eq(r5.data.status, 'submitted');
}));

tests.push(test('C4. 관리자 반려 처리', async () => {
  const r = await req('PUT', `/applications/${global.rejectAppId}/reject`, { reason: '정원 초과' }, global.adminToken);
  eq(r.success, true);
  eq(r.data.status, 'rejected');
}));

tests.push(test('C5. 통계 조회', async () => {
  const r = await req('GET', '/stats/approval', null, global.adminToken);
  eq(r.success, true);
  assert(Array.isArray(r.data.monthly), 'no monthly data');
}));

// ============================================================
// SCENARIO D: Admin Management
// ============================================================
tests.push(test('D1. 사용자 목록 조회', async () => {
  const r = await req('GET', '/users', null, global.adminToken);
  eq(r.success, true);
  assert(r.data.items.length >= 5, 'expected >= 5 users');
}));

tests.push(test('D2. 사용자 차단 → 로그인 불가 → 복구', async () => {
  const r1 = await req('GET', '/users', null, global.adminToken);
  const target = r1.data.items.find(u => u.email === 'younghee@company.com');
  assert(target, 'user not found');
  const r2 = await req('PUT', `/users/${target.id}/status`, { status: 'blocked' }, global.adminToken);
  eq(r2.success, true);

  const r3 = await req('POST', '/auth/login', { email: 'younghee@company.com', password: 'user1234!' });
  eq(r3.success, false, 'blocked user login should fail');

  // 복구
  await req('PUT', `/users/${target.id}/status`, { status: 'approved' }, global.adminToken);
}));

tests.push(test('D3. 화이트리스트 등록', async () => {
  const r = await req('POST', '/whitelist', {
    name: 'E2E테스트', car_number: '111가 2222', phone: '010-1111-2222', position: '과장',
  }, global.adminToken);
  eq(r.success, true);
  global.wid = r.data.id;
}));

tests.push(test('D4. 화이트리스트 목록 + 검색', async () => {
  const r = await req('GET', '/whitelist', null, global.adminToken);
  eq(r.success, true);
  assert(r.data.items && r.data.items.length >= 1, 'whitelist empty');
  const r2 = await req('GET', '/whitelist?search=E2E', null, global.adminToken);
  eq(r2.success, true);
  assert(r2.data.items.some(w => w.name === 'E2E테스트'), 'search failed');
}));

tests.push(test('D5. 화이트리스트 삭제', async () => {
  const r = await req('DELETE', '/whitelist', { ids: [global.wid] }, global.adminToken);
  eq(r.success, true);
}));

tests.push(test('D6. 메일 템플릿 생성', async () => {
  const r = await req('POST', '/mail-templates', {
    title: 'E2E 테스트 메일', content: '<p>테스트</p>',
  }, global.adminToken);
  eq(r.success, true);
  global.mailId = r.data.id;
}));

tests.push(test('D7. 메일 템플릿 목록', async () => {
  const r = await req('GET', '/mail-templates', null, global.adminToken);
  eq(r.success, true);
  assert(r.data.length >= 1, 'no mail templates');
}));

tests.push(test('D8. 메일 템플릿 삭제', async () => {
  const r = await req('DELETE', `/mail-templates/${global.mailId}`, null, global.adminToken);
  eq(r.success, true);
}));

// ============================================================
// SCENARIO E: MyPage
// ============================================================
tests.push(test('E1. 마이페이지 조회', async () => {
  const r = await req('GET', '/mypage', null, global.testUserToken);
  eq(r.success, true);
  eq(r.data.user.name, '테스트유저');
}));

tests.push(test('E2. 마이페이지 수정', async () => {
  const r = await req('PUT', '/mypage', { phone: '010-1111-3333' }, global.testUserToken);
  eq(r.success, true);
  const r2 = await req('GET', '/mypage', null, global.testUserToken);
  eq(r2.data.user.phone, '010-1111-3333', 'phone not updated');
}));

// ============================================================
// SCENARIO F: Template CRUD
// ============================================================
tests.push(test('F1. 템플릿 생성 (step 1)', async () => {
  const r = await req('POST', '/templates', {
    title: 'E2E 테스트 템플릿', start_date: '2026-08-01', end_date: '2026-08-15',
    allow_modify: true, description: 'E2E test',
  }, global.adminToken);
  eq(r.success, true);
  global.ntid = r.data.id;
}));

tests.push(test('F2. 질문 저장 (step 2) — 전역 config 반영', async () => {
  const config = await req('GET', '/config/questions', null, global.adminToken);
  eq(config.success, true);
  assert(config.data && config.data.questions && config.data.questions.length > 0, 'no global questions config');

  const questions = config.data.questions.map(q => ({
    question_text: q.label,
    input_type: q.type,
    is_required: q.required,
    score: q.scored ? Math.max(...(q.options || []).map(o => o.score), 0) : 0,
    sort_order: q.question_no,
    placeholder: q.placeholder || '',
    options: (q.options || []).map((o, idx) => ({
      option_text: o.label,
      score: o.score,
      sort_order: idx + 1,
    })),
  }));

  const r = await req('POST', `/templates/${global.ntid}/questions`, questions, global.adminToken);
  eq(r.success, true);
  eq(r.data.count, questions.length);
  global.lastConfigQuestionCount = questions.length;
}));

tests.push(test('F3. 템플릿 공개', async () => {
  const r = await req('PUT', `/templates/${global.ntid}`, { status: 'published' }, global.adminToken);
  eq(r.success, true);
}));

tests.push(test('F4. 공개된 템플릿 질문 확인 (전역 config 반영)', async () => {
  const r = await req('GET', `/templates/${global.ntid}`, null, global.testUserToken);
  eq(r.success, true);
  eq(r.data.questions.length, global.lastConfigQuestionCount, 'question count should match config');
  eq(r.data.status, 'published');
}));

// ============================================================
// SCENARIO G: Admin Managers
// ============================================================
tests.push(test('G1. 관리자 목록', async () => {
  const r = await req('GET', '/admin/managers', null, global.adminToken);
  eq(r.success, true);
  assert(r.data.items && Array.isArray(r.data.items), 'expected items array');
}));

tests.push(test('G2. 관리자 지정', async () => {
  const r1 = await req('GET', '/users', null, global.adminToken);
  const target = r1.data.items.find(u => u.email === 'test@mobigen.com');
  assert(target, 'user not found');
  const r2 = await req('POST', '/admin/managers', { user_id: target.id }, global.adminToken);
  eq(r2.success, true);
}));

tests.push(test('G3. 중복 지정 방지', async () => {
  const r1 = await req('GET', '/users', null, global.adminToken);
  const target = r1.data.items.find(u => u.email === 'test@mobigen.com');
  const r2 = await req('POST', '/admin/managers', { user_id: target.id }, global.adminToken);
  eq(r2.success, false, 'duplicate should fail');
}));

tests.push(test('G4. 관리자 해제', async () => {
  const r1 = await req('GET', '/users', null, global.adminToken);
  const target = r1.data.items.find(u => u.email === 'test@mobigen.com');
  const r2 = await req('DELETE', `/admin/managers/${target.id}`, null, global.adminToken);
  eq(r2.success, true);
}));

// ============================================================
// SCENARIO H: Validation & Errors
// ============================================================
tests.push(test('H1. 잘못된 로그인', async () => {
  const r = await req('POST', '/auth/login', { email: 'no@exists.com', password: 'wrong' });
  eq(r.success, false);
  eq(r.status, 401);
}));

tests.push(test('H2. 중복 이메일 회원가입', async () => {
  const r = await req('POST', '/auth/signup', {
    name: '중복', email: 'admin@parkon.com', password: 'test1234!', phone: '010-0000-9999',
  });
  eq(r.success, false);
}));

tests.push(test('H3. 마감일 지난 신청 제출 불가', async () => {
  const r1 = await req('POST', '/templates', {
    title: '마감템플릿', start_date: '2025-01-01', end_date: '2025-01-15', allow_modify: false,
  }, global.adminToken);
  await req('PUT', `/templates/${r1.data.id}`, { status: 'published' }, global.adminToken);

  const r3 = await req('POST', '/applications', { template_id: r1.data.id }, global.testUserToken);
  eq(r3.success, true);
  const aid = r3.data.id;

  const r4 = await req('PUT', `/applications/${aid}`, { action: 'submit', answers: [] }, global.testUserToken);
  eq(r4.success, false, 'past deadline should fail');
}));

tests.push(test('H4. 인증 없이 접근 차단', async () => {
  const r = await req('GET', '/users');
  eq(r.success, false);
  eq(r.status, 401);
}));

tests.push(test('H5. 일반유저 admin API 차단 (403)', async () => {
  const r = await req('PUT', '/users/999/status', { status: 'blocked' }, global.testUserToken);
  eq(r.success, false);
  eq(r.status, 403);
}));

// ============================================================
// SCENARIO I: Config API Validation
// ============================================================
tests.push(test('I1. config/questions - questions 키 누락', async () => {
  const r = await req('PUT', '/config/questions', { version: '1.0' }, global.adminToken);
  eq(r.success, false, 'should reject missing questions');
  eq(r.status, 400);
}));

tests.push(test('I2. config/questions - question_no 누락', async () => {
  const r = await req('PUT', '/config/questions', {
    questions: [{ question_id: 'Q01', label: 'test', required: true, type: 'text', scored: false }],
  }, global.adminToken);
  eq(r.success, false);
  eq(r.status, 400);
}));

tests.push(test('I3. config/questions - label 누락', async () => {
  const r = await req('PUT', '/config/questions', {
    questions: [{ question_no: 1, question_id: 'Q01', required: true, type: 'text', scored: false }],
  }, global.adminToken);
  eq(r.success, false);
  eq(r.status, 400);
}));

tests.push(test('I4. config/questions - 잘못된 type 값', async () => {
  const r = await req('PUT', '/config/questions', {
    questions: [{ question_no: 1, question_id: 'Q01', label: 'test', required: true, type: 'checkbox', scored: false }],
  }, global.adminToken);
  eq(r.success, false);
  eq(r.status, 400);
}));

tests.push(test('I5. config/questions - 올바른 저장', async () => {
  const r = await req('PUT', '/config/questions', {
    questions: [{ question_no: 1, question_id: 'Q01_TEST', label: '테스트', required: true, type: 'text', scored: false }],
  }, global.adminToken);
  eq(r.success, true, 'valid config should save');
  const restore = await req('PUT', '/config/questions', {
    version: '1.1.0',
    questions: [
      { question_no: 1, question_id: 'Q01_PHONE', info_type: 'basic', title: '연락처', label: '귀하의 연락처를 기재해 주세요', placeholder: '예) 010-4225-3461', required: true, type: 'text', scored: false, grid_view: true },
      { question_no: 2, question_id: 'Q02_CAR_NUMBER', info_type: 'basic', title: '차량정보', label: '귀하의 차량정보를 기재해 주세요', placeholder: '예) 222러8861', required: true, type: 'text', scored: false, grid_view: true },
      { question_no: 3, question_id: 'Q03_POSITION', info_type: 'apply', title: '직책', label: '귀하의 직책을 체크해 주세요', required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q03_A', label: '팀장/실장', score: 5 }, { option_id: 'Q03_B', label: '팀원', score: 3 }] },
      { question_no: 4, question_id: 'Q04_JOIN_DATE', info_type: 'apply', title: '입사 일자', label: '귀하의 입사 일자를 작성해 주세요', placeholder: '예) 2018-02-19', required: true, type: 'date', scored: false, grid_view: true },
      { question_no: 5, question_id: 'Q05_TENURE', info_type: 'apply', title: '재직기간', label: '귀하의 입사 일자로부터 현재까지의 재직기간을 체크해 주세요', required: true, type: 'radio', scored: true, options: [{ option_id: 'Q05_A', label: '15년 초과', score: 5 }, { option_id: 'Q05_B', label: '10년 초과 15년 미만', score: 4 }, { option_id: 'Q05_C', label: '5년 초과 10년 미만', score: 3 }, { option_id: 'Q05_D', label: '1년 초과 5년 미만', score: 2 }, { option_id: 'Q05_E', label: '1년 미만', score: 1 }] },
      { question_no: 6, question_id: 'Q06_ADDRESS', info_type: 'apply', title: '주소지', label: '귀하의 거주 중인 주소지를 기재해 주세요', placeholder: '예) 서울시 송파구 송파대로', hint: '도로명, 시/군/구 형식으로 입력해 주세요', required: true, type: 'text', scored: false },
      { question_no: 7, question_id: 'Q07_DISTANCE', info_type: 'apply', title: '출근 편도거리', label: "귀하의 거주 중인 주소지로부터 회사까지 '출근' 편도거리(네이버지도, 자동차, 최단거리 기준)를 체크해 주세요", required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q07_A', label: '30km 초과', score: 5 }, { option_id: 'Q07_B', label: '20km 초과 30km 미만', score: 4 }, { option_id: 'Q07_C', label: '10km 초과 20km 미만', score: 3 }, { option_id: 'Q07_D', label: '5km 초과 10km 미만', score: 2 }, { option_id: 'Q07_E', label: '5km 미만', score: 1 }] },
      { question_no: 8, question_id: 'Q08_COMMUTE_TIME', info_type: 'apply', title: '출근 편도시간', label: "귀하의 거주 중인 주소지로부터 회사까지 '출근' 편도시간(엔진시동 - 건물주차)을 체크해 주세요", required: true, type: 'radio', scored: true, grid_view: true, options: [{ option_id: 'Q08_A', label: '120분 초과', score: 5 }, { option_id: 'Q08_B', label: '90분 이상 120분 미만', score: 4 }, { option_id: 'Q08_C', label: '60분 초과 90분 미만', score: 3 }, { option_id: 'Q08_D', label: '30분 초과 60분 미만', score: 2 }, { option_id: 'Q08_E', label: '30분 미만', score: 1 }] },
    ],
  }, global.adminToken);
  eq(restore.success, true, 'config restore failed');
}));

// ============================================================
// Run
// ============================================================
async function main() {
  console.log('\n E2E \ud14c\uc2a4\ud2b8 \uc2dc\uc791\n');

  for (const t of tests) {
    await t();
  }

  const total = passed + failed;
  console.log(`\n \u2728 \uacb0\uacfc: ${passed}/${total} \ud1b5\uacfc, ${failed} \uc2e4\ud328`);

  if (failed > 0) {
    console.log('\n\u274c \uc77c\ubd80 \ud14c\uc2a4\ud2b8\uac00 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.');
    process.exit(1);
  } else {
    console.log('\n\u2705 \ubaa8\ub4e0 E2E \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!');
    process.exit(0);
  }
}

main();
