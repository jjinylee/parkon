#!/usr/bin/env node
/**
 * ParkON SMTP 연결 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-smtp.cjs                          # .env 설정으로 테스트
 *   node scripts/test-smtp.cjs --to test@company.com    # 수신자 지정
 *   node scripts/test-smtp.cjs --host=smtp.gmail.com --port=587 --user=... --pass=...
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const path = require('path');

// CLI 파싱
const args = {};
process.argv.slice(2).forEach(a => {
  if (a.startsWith('--to=')) args.to = a.slice(5);
  else if (a.startsWith('--host=')) args.host = a.slice(7);
  else if (a.startsWith('--port=')) args.port = parseInt(a.slice(6), 10);
  else if (a.startsWith('--user=')) args.user = a.slice(7);
  else if (a.startsWith('--pass=')) args.pass = a.slice(7);
  else if (a === '--help') { showHelp(); process.exit(0); }
  else if (a.startsWith('--to')) args.to = process.argv[process.argv.indexOf(a) + 1];
});

function showHelp() {
  console.log(`
사용법: node scripts/test-smtp.cjs [옵션]

옵션:
  --to=이메일           수신자 (기본: .env의 SMTP_FROM)
  --host=SMTP_HOST      SMTP 서버 (기본: .env)
  --port=PORT           SMTP 포트 (기본: .env)
  --user=USER           SMTP 사용자 (기본: .env)
  --pass=PASS           SMTP 비밀번호 (기본: .env)
  --help                도움말

.env 설정 우선, CLI 인자가 있으면 덮어씁니다.
`);
}

(async () => {
  const host = args.host || process.env.SMTP_HOST || 'localhost';
  const port = args.port || parseInt(process.env.SMTP_PORT || '1025', 10);
  const user = args.user || process.env.SMTP_USER || '';
  const pass = args.pass || process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'parkon@company.com';
  const to = args.to || from;

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ParkON SMTP 연결 테스트');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log(`  호스트:   ${host}`);
  console.log(`  포트:     ${port}`);
  console.log(`  사용자:   ${user || '(익명)'}`);
  console.log(`  발신자:   ${from}`);
  console.log(`  수신자:   ${to}`);
  console.log(`  보안:     ${port === 465 ? 'SSL (secure)' : user ? 'STARTTLS' : 'ignoreTLS'}`);
  console.log('');

  // 1. 연결 테스트
  console.log('  ▶ 1/4: 전송 객체 생성...');
  let transporter;
  try {
    if (!user && !pass) {
      transporter = nodemailer.createTransport({ host, port, ignoreTLS: true });
    } else {
      transporter = nodemailer.createTransport({
        host, port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    console.log('  ✔ 전송 객체 생성 완료');
  } catch (e) {
    console.log(`  ✘ 생성 실패: ${e.message}`);
    process.exit(1);
  }

  // 2. 연결 검증
  console.log('  ▶ 2/4: SMTP 연결 확인...');
  try {
    await transporter.verify();
    console.log('  ✔ SMTP 서버 연결 정상');
  } catch (e) {
    console.log(`  ✘ 연결 실패: ${e.message}`);
    console.log('');
    console.log('  🔍 예상 원인:');
    if (e.message.includes('ECONNREFUSED')) console.log('     - SMTP 서버가 실행 중인지 확인하세요');
    if (e.message.includes('ETIMEDOUT')) console.log('     - 방화벽에서 포트 아웃바운드를 허용했는지 확인하세요');
    if (e.message.includes('AUTH')) console.log('     - 사용자명/비밀번호를 확인하세요');
    if (e.message.includes('TLS')) console.log('     - 포트/보안 설정을 확인하세요 (587=STARTTLS, 465=SSL)');
    process.exit(1);
  }

  // 3. 테스트 메일 발송
  console.log('  ▶ 3/4: 테스트 메일 발송...');
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: '[ParkON] SMTP 연결 테스트',
      text: `SMTP 연결 테스트 메일입니다.\n\n보낸 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n호스트: ${host}:${port}`,
      html: `<h2>ParkON SMTP 연결 테스트</h2>
<p>SMTP 연결 테스트 메일입니다.</p>
<table border="1" cellpadding="8" style="border-collapse:collapse">
<tr><td>시간</td><td>${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
<tr><td>호스트</td><td>${host}:${port}</td></tr>
<tr><td>발신</td><td>${from}</td></tr>
</table>`,
    });
    console.log(`  ✔ 발송 완료 (messageId: ${info.messageId})`);
  } catch (e) {
    console.log(`  ✘ 발송 실패: ${e.message}`);
    process.exit(1);
  }

  // 4. MailHog 확인 안내
  if (host === 'localhost' && (port === 1025 || port === 3025)) {
    console.log('');
    console.log('  ▶ 4/4: MailHog 확인');
    console.log(`  웹 UI: http://localhost:8025`);
    try {
      const res = await fetch('http://localhost:8025/api/v2/messages');
      const data = await res.json();
      const count = data.items ? data.items.length : (Array.isArray(data) ? data.length : 0);
      console.log(`  MailHog 메일함: ${count}통`);
    } catch {
      console.log('  (MailHog API 연결 안 됨 — 웹 UI에서 직접 확인)');
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ✅ SMTP 테스트 완료');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log(`  수신자(${to})의 메일함을 확인하세요.`);
  console.log('');

  // .env에 반영할 설정 안내
  if (args.host || args.user) {
    console.log('');
    console.log('  .env 반영 예시:');
    console.log(`  SMTP_HOST=${host}`);
    console.log(`  SMTP_PORT=${port}`);
    console.log(`  SMTP_USER=${user}`);
    console.log(`  SMTP_PASS=${pass ? '***' : ''}`);
    console.log(`  SMTP_FROM=${from}`);
    console.log('');
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
