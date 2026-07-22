const { chromium } = require('playwright');
const BASE = 'http://localhost:5173';
let PASS = 0, FAIL = 0;
const uid = Date.now().toString().slice(-8);

function T(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    console.log(`  \u2705 ${name}`);
    PASS++;
  }).catch(e => {
    console.log(`  \u274c ${name}: ${String(e.message || e).split('\n')[0].slice(0,120)}`);
    FAIL++;
  });
}

function go(page, url) {
  return page.goto(BASE + url).then(() => page.waitForLoadState('networkidle')).then(() => page.waitForTimeout(500));
}

async function login(page, email, pw) {
  // Clear auth state first
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
  // Also clear cookies
  const ctx = page.context();
  await ctx.clearCookies();
  
  await go(page, '/login');
  await page.waitForTimeout(300);
  // Wait for login form to render
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function logout(page) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
  await page.context().clearCookies();
  await go(page, '/login');
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // ===== 1.1 Signup =====
  await T('[UI_101-1] 회원가입 성공', async () => {
    await go(page, '/signup');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(`테${uid}`);
    await inputs[1].fill(`010-${uid.slice(0,4)}-${uid.slice(4)}`);
    await inputs[2].fill(`t${uid}@mobigen.com`);
    await inputs[3].fill('Test1234!');
    await page.locator('button').filter({ hasText: '회원가입' }).click();
    await page.waitForTimeout(2000);
    if (!page.url().includes('/login')) {
      const body = await page.innerText('body');
      throw new Error(`expected /login, url=${page.url()}, body=${body.slice(0,200)}`);
    }
  });

  await T('[UI_101-2] @mobigen.com 외 이메일 차단', async () => {
    await go(page, '/signup');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(`유2${uid}`);
    await inputs[1].fill(`010-${uid.slice(0,4)}-${uid.slice(4)}`);
    await inputs[2].fill('fail@gmail.com');
    await inputs[3].fill('Test1234!');
    await page.locator('button').filter({ hasText: '회원가입' }).click();
    await page.waitForTimeout(1000);
    const body = await page.innerText('body');
    if (!body.includes('@mobigen')) throw new Error('no mobigen error msg');
  });

  await T('[UI_101-3] 중복 이메일 차단', async () => {
    await go(page, '/signup');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(`테${uid}`);
    await inputs[1].fill(`010-${uid.slice(0,4)}-${uid.slice(4)}`);
    await inputs[2].fill(`t${uid}@mobigen.com`);
    await inputs[3].fill('Test1234!');
    await page.locator('button').filter({ hasText: '회원가입' }).click();
    await page.waitForTimeout(1000);
    const body = await page.innerText('body');
    if (!body.includes('이미') && !body.includes('중복')) throw new Error('no duplicate msg: ' + body.slice(0,100));
  });

  await T('[UI_101-4] 필수 누락 validation', async () => {
    await go(page, '/signup');
    await page.locator('button').filter({ hasText: '회원가입' }).click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/signup')) throw new Error('should stay on signup');
  });

  // ===== 1.2 Login =====
  await T('[UI_100-1] 승인된 사용자 로그인', async () => {
    await login(page, 'chulsoo@company.com', 'user1234!');
    if (page.url().includes('/login')) throw new Error(`still on login: ${page.url()}`);
  });

  await T('[UI_100-2] 잘못된 비밀번호 → 실패', async () => {
    await logout(page);
    await login(page, 'chulsoo@company.com', 'wrongpass!');
    await page.waitForTimeout(500);
    const body = await page.innerText('body');
    if (!body.includes('일치하지')) throw new Error('no error msg: ' + body.slice(0,100));
  });

  // ===== 1.3 MyPage =====
  await T('[UI_210-1] 로그인→마이페이지 이동', async () => {
    await login(page, 'chulsoo@company.com', 'user1234!');
    if (!page.url().includes('mypage')) throw new Error(`expected mypage, got ${page.url()}`);
  });

  // ===== 1.4 HomePage =====
  await T('HomePage 렌더링', async () => {
    await go(page, '/');
    await page.waitForTimeout(1000);
    const body = await page.innerText('body');
    if (!body.includes('주차')) throw new Error('no parking text');
  });

  // ===== 2. Admin =====
  await T('관리자 로그인', async () => {
    await login(page, 'admin@parkon.com', 'admin123!');
    if (page.url().includes('/login')) throw new Error('login failed');
  });

  await T('[UI_411] 신청현황', async () => {
    await go(page, '/admin/status');
    await page.waitForTimeout(1500);
    if (!page.url().includes('status')) throw new Error(`unexpected url: ${page.url()}`);
  });

  await T('[UI_301] 템플릿 목록', async () => {
    await go(page, '/admin/templates');
    await page.waitForTimeout(1000);
    if (!page.url().includes('template')) throw new Error(`unexpected url: ${page.url()}`);
  });

  await T('[UI_510] 화이트리스트', async () => {
    await go(page, '/admin/whitelist');
    await page.waitForTimeout(1000);
    const body = await page.innerText('body');
    if (!body.includes('화이트')) throw new Error('no whitelist text');
  });

  await T('[UI_540] 사용자 관리', async () => {
    await go(page, '/admin/users');
    await page.waitForTimeout(1000);
    const body = await page.innerText('body');
    if (!body.includes('사용자')) throw new Error('no users text: ' + body.slice(0,100));
  });

  // ===== 3. Edge =====
  await T('[H4] 비로그인 /admin 차단', async () => {
    await logout(page);
    await go(page, '/admin/status');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/login')) throw new Error(`expected login, got ${page.url()}`);
  });

  await T('[H5] 일반유저 /admin 차단', async () => {
    await login(page, 'chulsoo@company.com', 'user1234!');
    await go(page, '/admin/status');
    await page.waitForTimeout(1000);
    if (page.url().includes('/admin/status')) throw new Error('user should be blocked');
  });

  await browser.close();
  const total = PASS + FAIL;
  console.log(`\n \u2728 \uacb0\uacfc: ${PASS}/${total} \ud1b5\uacfc, ${FAIL} \uc2e4\ud328`);
  if (FAIL === 0) console.log('\u2705 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
