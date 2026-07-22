#!/usr/bin/env node
/**
 * ParkON 전체 플로우 E2E 테스트
 *   주차개설(템플릿) → 신청 → 승인 → 메일발송 → 메일확인
 *
 * 사용법:
 *   1. node scripts/seed-clean.js        # DB 초기화 + 사용자 2명
 *   2. node scripts/flow-test.mjs        # 플로우 테스트 실행
 *
 *   또는 한번에:
 *     node scripts/seed-clean.js && node scripts/flow-test.mjs
 */
const BASE = 'http://localhost:4000/api/v1';
const Database = require('better-sqlite3');
const db = new Database('./data/parkon.db');

const ADMIN = { name: '김광호', email: 'maniakim@mobigen.com', pw: 'admin1234!' };
const USER  = { name: '이광진', email: 'jjinylee@mobigen.com', pw: 'user1234!' };

let PASS = 0, FAIL = 0;
function T(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    console.log(`  \u2705 ${name}`); PASS++;
  }).catch(e => {
    console.log(`  \u274c ${name}: ${String(e.message || e).split('\n')[0].slice(0,150)}`);
    FAIL++;
  });
}

async function req(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, ...json };
}

async function login(email, pw) {
  const r = await req('POST', '/auth/login', { email, password: pw });
  if (!r.success) throw new Error('login failed: ' + r.message);
  return r.data.token || r.data.accessToken;
}

// 템플릿 질문/옵션 정보 미리 로드
const questions = db.prepare('SELECT id, sort_order FROM application_questions WHERE template_id = 1 ORDER BY sort_order').all();
const options = db.prepare(`
  SELECT qo.id, qo.sort_order as opt_order, q.sort_order as q_order
  FROM question_options qo
  JOIN application_questions q ON q.id = qo.question_id
  WHERE q.template_id = 1
  ORDER BY q.sort_order, qo.sort_order
`).all();

function getOptionId(qSortOrder, optIndex) {
  const q = questions.find(x => x.sort_order === qSortOrder);
  if (!q) throw new Error(`Question sort_order=${qSortOrder} not found`);
  const opts = options.filter(o => o.q_order === qSortOrder);
  return opts[optIndex]?.id;
}

(async () => {
  console.log(`\n\u2500\u2500\u2500 \uC8FC\uCC28ON \uC804\uCCB4 \uD50C\uB85C\uC6B0 \uD14C\uC2A4\uD2B8\u2500\u2500\u2500\n`);

  let adminToken, userToken;

  // 1. 관리자 로그인
  await T('슈퍼 관리자 로그인', async () => {
    adminToken = await login(ADMIN.email, ADMIN.pw);
  });

  // 2. 일반 사용자 로그인
  await T('일반 사용자 로그인', async () => {
    userToken = await login(USER.email, USER.pw);
  });

  // 3. 마이페이지 저장
  await T('마이페이지 정보 저장', async () => {
    const r = await req('PUT', '/mypage', {
      phone: '010-1111-2222',
      car_number: '12가3456',
      answers: JSON.stringify([
        { question_no: 3, answer_text: '팀장/실장' },
        { question_no: 5, answer_text: '5년 초과 10년 미만' },
        { question_no: 7, answer_text: '20km 초과 30km 미만' },
        { question_no: 8, answer_text: '60분 초과 90분 미만' },
      ]),
    }, userToken);
    if (!r.success) throw new Error(r.message);
  });

  // 4. 주차 신청 생성 (draft)
  let appId;
  await T('주차 신청 생성 (draft)', async () => {
    const r = await req('POST', '/applications', { template_id: 1 }, userToken);
    if (!r.success) throw new Error(r.message);
    appId = r.data.id;
  });

  // 5. 답변 저장 + 제출
  await T('신청 답변 저장 및 제출', async () => {
    const answers = [
      { question_id: questions.find(q => q.sort_order === 3).id, option_id: getOptionId(3, 0) },  // 팀장/실장 (5점)
      { question_id: questions.find(q => q.sort_order === 5).id, option_id: getOptionId(5, 2) },  // 5년초과10년미만 (3점)
      { question_id: questions.find(q => q.sort_order === 7).id, option_id: getOptionId(7, 1) },  // 20km초과30km미만 (4점)
      { question_id: questions.find(q => q.sort_order === 8).id, option_id: getOptionId(8, 2) },  // 60분초과90분미만 (3점)
    ];
    const r = await req('PUT', `/applications/${appId}`, {
      action: 'submit',
      answers,
      consent_agreed: true,
    }, userToken);
    if (!r.success) throw new Error(r.message);
    if (r.data.status !== 'submitted') throw new Error(`status: ${r.data.status}`);
  });

  // 6. 관리자 신청 목록 조회
  let adminAppId;
  await T('관리자 신청 목록 조회', async () => {
    const r = await req('GET', '/applications/admin/list?status=all', null, adminToken);
    if (!r.success) throw new Error(r.message);
    const items = r.data.items || [];
    const submitted = items.find(a => a.status === 'submitted');
    if (!submitted) throw new Error('no submitted applications');
    adminAppId = submitted.id;
  });

  // 7. 관리자 승인
  await T('관리자 승인 처리', async () => {
    const r = await req('PUT', `/applications/${adminAppId}/approve`, { approved_count: 1 }, adminToken);
    if (!r.success) throw new Error(r.message);
    if (r.data.status !== 'approved') throw new Error(`status: ${r.data.status}`);
  });

  // 8. 메일 발송
  await T('메일 발송 (승인 안내)', async () => {
    const r = await req('POST', '/mail-templates/send', {
      template_id: 1,
      application_ids: [adminAppId],
      type: 'approved',
    }, adminToken);
    if (!r.success) throw new Error(r.message);
  });

  // 9. 메일 발송 기록 확인
  await T('mail_logs 테이블에서 발송 기록 확인', async () => {
    const logs = db.prepare(`
      SELECT ml.*, u.email, u.name FROM mail_logs ml
      JOIN parking_applications pa ON pa.id = ml.application_id
      JOIN users u ON u.id = pa.user_id
      WHERE ml.application_id = ?
      ORDER BY ml.id DESC
    `).all(adminAppId);
    if (!logs.length) throw new Error('no mail logs');
    const found = logs.find(l => l.recipient_email === USER.email);
    if (!found) throw new Error(`mail to ${USER.email} not found`);
    if (found.status === 'failed') {
      console.log(`    (SMTP: ${found.error_message || 'unknown'})`);
    }
  });

  // 9b. MailHog에서 실제 메일 수신 확인
  await T('MailHog 메일 수신 확인', async () => {
    const res = await fetch('http://localhost:8025/api/v2/messages');
    const data = await res.json();
    const items = data.items || [];
    const received = items.find(m =>
      m.Content?.Headers?.To?.some(h => h.includes(USER.email))
    );
    if (!received) throw new Error(`mail to ${USER.email} not found in MailHog`);
    console.log(`    제목: ${received.Content?.Headers?.Subject?.[0] || ''}`);
    console.log(`    수신: ${USER.email}`);
  });

  // 10. 사용자 신청 내역 확인
  await T('사용자 신청 상태 확인 (approved)', async () => {
    const r = await req('GET', '/applications', null, userToken);
    if (!r.success) throw new Error(r.message);
    const apps = r.data || [];
    const mine = apps.find(a => a.id === appId);
    if (!mine) throw new Error('application not found');
    if (mine.status !== 'approved') throw new Error(`expected approved, got ${mine.status}`);
  });

  db.close();

  const total = PASS + FAIL;
  console.log(`\n\u2500\u2500\u2500 \uACB0\uACFC: ${PASS}/${total} \uD1B5\uACFC, ${FAIL} \uC2E4\ud328 \u2500\u2500\u2500`);
  if (FAIL === 0) console.log('\u2705 \uC804\uCCB4 \uD50C\uB85C\uC6B0 \uC815\uC0C1!');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
