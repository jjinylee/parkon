#!/usr/bin/env node
/**
 * ParkON 클린 시드 — 운영/테스트용
 * - 기존 데이터 모두 초기화
 * - 관리자(maniakim@mobigen.com) + 사용자(jjinylee@mobigen.com)만 생성
 * - 템플릿 1개 + 질문 + 옵션 + 점수
 * - 메일템플릿 1개
 */
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const DB_PATH = path.resolve(process.env.DB_PATH || './data/parkon.db');
const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log('[SEED] 초기화 중...');

// 기존 데이터 정리
db.exec(`
  DELETE FROM mail_logs;
  DELETE FROM mail_templates;
  DELETE FROM application_answers;
  DELETE FROM parking_applications;
  DELETE FROM question_options;
  DELETE FROM application_questions;
  DELETE FROM application_templates;
  DELETE FROM template_attachments;
  DELETE FROM admin_managers;
  DELETE FROM whitelist;
  DELETE FROM app_config;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

const hash = bcrypt.hashSync('admin1234!', 10);
const userHash = bcrypt.hashSync('user1234!', 10);

// 사용자
db.prepare(`
  INSERT INTO users (id, name, phone, email, password, role, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`).run(1, '김광호', '010-0000-0001', 'maniakim@mobigen.com', hash, 'super_admin', 'approved');

db.prepare(`
  INSERT INTO users (id, name, phone, email, password, role, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`).run(2, '이광진', '010-0000-0002', 'jjinylee@mobigen.com', userHash, 'user', 'approved');

// 템플릿
db.prepare(`
  INSERT INTO application_templates (id, title, description, start_date, end_date, allow_modify, status, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`).run(1, '2026년 하반기 주차배정 신청', '2026년 하반기 주차 배정을 위한 신청입니다.', '2026-07-01', '2026-07-31', 1, 'published', 1);

// 질문
const questions = [
  { sort_order: 3, text: '귀하의 직책을 선택해주세요', input_type: 'radio', score: 5, options: ['팀장/실장', '팀원'] },
  { sort_order: 5, text: '귀하의 재직기간을 선택해주세요', input_type: 'radio', score: 5, options: ['15년 초과', '10년 초과 15년 미만', '5년 초과 10년 미만', '1년 초과 5년 미만', '1년 미만'] },
  { sort_order: 7, text: '출근 편도거리를 선택해주세요', input_type: 'radio', score: 5, options: ['30km 초과', '20km 초과 30km 미만', '10km 초과 20km 미만', '5km 초과 10km 미만', '5km 미만'] },
  { sort_order: 8, text: '출근 편도시간을 선택해주세요', input_type: 'radio', score: 5, options: ['120분 초과', '90분 이상 120분 미만', '60분 초과 90분 미만', '30분 초과 60분 미만', '30분 미만'] },
  { sort_order: 9, text: '귀하의 신체, 업무 기타 사정으로 불가피하게 자기차량을 이용하여야 하는 사유가 있을 경우 기재해 주세요.', input_type: 'text', score: 5, options: [] },
];

const insQ = db.prepare(`
  INSERT INTO application_questions (template_id, question_text, input_type, is_required, score, sort_order)
  VALUES (?, ?, ?, 1, ?, ?)
`);
const insOpt = db.prepare(`
  INSERT INTO question_options (question_id, option_text, score, sort_order)
  VALUES (?, ?, ?, ?)
`);

for (const q of questions) {
  const r = insQ.run(1, q.text, q.input_type, q.score, q.sort_order);
  const qId = r.lastInsertRowid;
  q.options.forEach((opt, i) => {
    const score = q.score - i; // 첫번째=5, 두번째=4, ...
    insOpt.run(qId, opt, Math.max(score, 1), i + 1);
  });
}

// 메일 템플릿 (승인용)
db.prepare(`
  INSERT INTO mail_templates (id, title, content, status, created_by, created_at)
  VALUES (?, ?, ?, 'active', ?, datetime('now','localtime'))
`).run(1, '주차 배정 완료 안내', '<p>{name}님, 주차 배정 결과를 안내드립니다.</p><p>신청하신 주차가 <strong>배정 완료</strong>되었습니다.</p><p>문의사항은 관리자에게 연락바랍니다.</p>', 1);

// 메일 템플릿 (반려용)
db.prepare(`
  INSERT INTO mail_templates (id, title, content, status, created_by, created_at)
  VALUES (?, ?, ?, 'active', ?, datetime('now','localtime'))
`).run(2, '주차 배정 반려 안내', '<p>{name}님, 주차 배정 결과를 안내드립니다.</p><p>죄송합니다. 주차 배정이 <strong>반려</strong>되었습니다.</p><p>반려 사유: {reason}</p><p>문의사항은 관리자에게 연락바랍니다.</p>', 1);

// 화이트리스트 (관리자 테스트용)
db.prepare(`
  INSERT INTO whitelist (id, name, car_number, phone, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))
`).run(1, '김광호', '12가3456', '010-0000-0001', 1);

console.log('[SEED] 완료!');
console.log('  관리자: maniakim@mobigen.com / admin1234!');
console.log('  사용자: jjinylee@mobigen.com / user1234!');
db.close();
