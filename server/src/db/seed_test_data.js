require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const db = require('../config/database');

function seedTestData() {
  const hash = bcrypt.hashSync('user1234!', 10);

  // 각 점수 조합에 해당하는 option_id 매핑 (template 1 기준)
  // Q03(직책): option_id 1=팀장/실장(5pt), 2=팀원(3pt)
  // Q05(재직기간): option_id 3=15년초과(5pt), 4=10-15년(4pt), 5=5-10년(3pt), 6=1-5년(2pt), 7=1년미만(1pt)
  // Q07(거리): option_id 8=30km초과(5pt), 9=20-30km(4pt), 10=10-20km(3pt), 11=5-10km(2pt), 12=5km미만(1pt)
  // Q08(시간): option_id 13=120분초과(5pt), 14=90-120분(4pt), 15=60-90분(3pt), 16=30-60분(2pt), 17=30분미만(1pt)

  const scoreProfiles = [
    // [Q03_opt, Q05_opt, Q07_opt, Q08_opt] = total_score
    [1, 3, 8, 13],  // 20점 (5+5+5+5)
    [1, 3, 8, 14],  // 19점 (5+5+5+4)
    [1, 3, 9, 13],  // 19점 (5+5+4+5)
    [1, 4, 8, 13],  // 19점 (5+4+5+5)
    [2, 3, 8, 13],  // 18점 (3+5+5+5)
    [1, 3, 9, 14],  // 18점 (5+5+4+4)
    [1, 4, 9, 13],  // 18점 (5+4+4+5)
    [1, 5, 8, 13],  // 18점 (5+3+5+5)
    [2, 4, 8, 13],  // 17점 (3+4+5+5)
    [1, 3, 10, 13], // 17점 (5+5+3+5) wait, 5+5+3+5=18
    [1, 3, 8, 15],  // 5+5+5+3=18
    [2, 3, 9, 14],  // 3+5+4+4=16
    [1, 4, 10, 13], // 5+4+3+5=17
    [2, 4, 9, 14],  // 3+4+4+4=15
    [1, 5, 9, 13],  // 5+3+4+5=17
    [2, 5, 10, 14], // 3+3+3+4=13
    [1, 6, 8, 13],  // 5+2+5+5=17
    [2, 6, 11, 15], // 3+2+2+3=10
    [1, 7, 12, 17], // 5+1+1+1=8
    [2, 3, 8, 14],  // 3+5+5+4=17
    [2, 4, 10, 15], // 3+4+3+3=13
    [1, 5, 10, 14], // 5+3+3+4=15
    [2, 6, 9, 16],  // 3+2+4+2=11
    [1, 4, 11, 16], // 5+4+2+2=13
    [2, 3, 11, 14], // 3+5+2+4=14
    [1, 7, 8, 17],  // 5+1+5+1=12
    [2, 7, 12, 17], // 3+1+1+1=6
    [1, 6, 10, 15], // 5+2+3+3=13
    [2, 5, 9, 16],  // 3+3+4+2=12
    [1, 7, 9, 14],  // 5+1+4+4=14
  ];

  const userData = [
    { name: '홍길동', email: 'hong.gd@company.com' },
    { name: '김영수', email: 'kim.ys@company.com' },
    { name: '이민호', email: 'lee.mh@company.com' },
    { name: '박서준', email: 'park.sj@company.com' },
    { name: '최수영', email: 'choi.sy@company.com' },
    { name: '강동원', email: 'kang.dw@company.com' },
    { name: '송중기', email: 'song.jk@company.com' },
    { name: '정해인', email: 'jung.hi@company.com' },
    { name: '김태리', email: 'kim.tr@company.com' },
    { name: '배수지', email: 'bae.sz@company.com' },
    { name: '아이유', email: 'ahn.iy@company.com' },
    { name: '김고은', email: 'kim.ge@company.com' },
    { name: '박보검', email: 'park.bg@company.com' },
    { name: '이준기', email: 'lee.jg@company.com' },
    { name: '유재석', email: 'yoo.js@company.com' },
    { name: '강호동', email: 'kang.hd@company.com' },
    { name: '신동엽', email: 'shin.dy@company.com' },
    { name: '이수근', email: 'lee.sg@company.com' },
    { name: '김희선', email: 'kim.hs@company.com' },
    { name: '송혜교', email: 'song.hk@company.com' },
    { name: '전지현', email: 'jun.jh@company.com' },
    { name: '하지원', email: 'ha.jw@company.com' },
    { name: '김혜수', email: 'kim.hs2@company.com' },
    { name: '손예진', email: 'son.yj@company.com' },
    { name: '한지민', email: 'han.jm@company.com' },
    { name: '서현진', email: 'seo.hj@company.com' },
    { name: '이나영', email: 'lee.ny@company.com' },
    { name: '문근영', email: 'moon.gy@company.com' },
    { name: '김아중', email: 'kim.aj@company.com' },
    { name: '고현정', email: 'ko.hj@company.com' },
  ];

  const phoneBases = [
    '010-1111-','010-2222-','010-3333-','010-4444-','010-5555-',
    '010-6666-','010-7777-','010-8888-','010-9999-','010-1234-',
    '010-2345-','010-3456-','010-4567-','010-5678-','010-6789-',
    '010-7890-','010-8901-','010-9012-','010-0123-','010-1357-',
    '010-2468-','010-3579-','010-4680-','010-5791-','010-6802-',
    '010-7913-','010-8024-','010-9135-','010-0246-','010-9753-',
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, phone, email, password, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'user', 'approved', datetime('now','localtime'))
  `);

  const insertApplication = db.prepare(`
    INSERT INTO parking_applications (user_id, template_id, total_score, status, submitted_at, created_at, updated_at)
    VALUES (?, 1, ?, 'submitted', datetime('now','localtime'), datetime('now','localtime'), datetime('now','localtime'))
  `);

  const insertQ3Answer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, option_id)
    VALUES (?, 3, ?)
  `);

  const insertQ5Answer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, option_id)
    VALUES (?, 5, ?)
  `);

  const insertQ7Answer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, option_id)
    VALUES (?, 7, ?)
  `);

  const insertQ8Answer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, option_id)
    VALUES (?, 8, ?)
  `);

  const insertTextAnswer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, answer_text)
    VALUES (?, ?, ?)
  `);

  // next available user id
  const maxUserId = db.prepare('SELECT COALESCE(MAX(id), 11) as max_id FROM users').get().max_id;
  let nextUserId = Math.max(maxUserId + 1, 12);

  const transaction = db.transaction(() => {
    const areas = ['강남구','서초구','송파구','마포구','종로구'];
    const details = ['역삼동','서초동','잠실동','합정동','광화문'];

    for (let i = 0; i < userData.length; i++) {
      const userId = nextUserId + i;
      const name = userData[i].name;
      const email = userData[i].email;
      const phoneBase = phoneBases[i];
      const phone = phoneBase + String(1000 + i).slice(-4);
      const [q03, q05, q07, q08] = scoreProfiles[i];

      insertUser.run(userId, name, phone, email, hash);

      const totalScore =
        (q03 === 1 ? 5 : 3) +
        (q05 === 3 ? 5 : q05 === 4 ? 4 : q05 === 5 ? 3 : q05 === 6 ? 2 : 1) +
        (q07 === 8 ? 5 : q07 === 9 ? 4 : q07 === 10 ? 3 : q07 === 11 ? 2 : 1) +
        (q08 === 13 ? 5 : q08 === 14 ? 4 : q08 === 15 ? 3 : q08 === 16 ? 2 : 1);

      const appResult = insertApplication.run(userId, totalScore);
      const appId = appResult.lastInsertRowid;

      insertQ3Answer.run(appId, q03);
      insertQ5Answer.run(appId, q05);
      insertQ7Answer.run(appId, q07);
      insertQ8Answer.run(appId, q08);
      insertTextAnswer.run(appId, 1, phone);
      insertTextAnswer.run(appId, 2, String(1000 + i) + '가 ' + String(1000 + i * 2).slice(-4));
      insertTextAnswer.run(appId, 4, `20${15 + (i % 10)}-0${(i % 9) + 1}-${10 + (i % 20)}`);
      insertTextAnswer.run(appId, 6, `서울시 ${areas[i % 5]} ${details[i % 5]}`);

      console.log(`  ✓ Created user #${userId}: ${name} (score: ${totalScore})`);
    }

    // template 2에도 몇 개 신청 추가
    const template2Questions = [49, 50, 51, 52, 53, 54, 55, 56];
    const t2Options = [null, null, 103, null, 108, null, 113, 115]; // 팀원(3) + 1-5년(2) + 5km미만(1) + 120분초과(5) = 11
    const t2UserId = nextUserId + userData.length;
    const t2Name = '김테스트';
    const t2Phone = '010-9999-9999';
    const t2Email = 'ktest@company.com';
    insertUser.run(t2UserId, t2Name, t2Phone, t2Email, hash);
    const t2AppResult = insertApplication.run(t2UserId, 11);
    const t2AppId = t2AppResult.lastInsertRowid;
    for (let j = 0; j < template2Questions.length; j++) {
      if (t2Options[j] !== null) {
        db.prepare('INSERT INTO application_answers (application_id, question_id, option_id) VALUES (?, ?, ?)')
          .run(t2AppId, template2Questions[j], t2Options[j]);
      } else {
        const texts = ['010-9999-9999', '999-9999', null, '2024-01-01', null, '서울 강남', null, null];
        db.prepare('INSERT INTO application_answers (application_id, question_id, answer_text) VALUES (?, ?, ?)')
          .run(t2AppId, template2Questions[j], texts[j]);
      }
    }
    console.log(`  ✓ Created template 2 test user: ${t2Name} (score: 11)`);
  });

  transaction();
  console.log(`\nTest data seeded successfully. Total users: ${db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt}`);
}

seedTestData();
process.exit(0);
