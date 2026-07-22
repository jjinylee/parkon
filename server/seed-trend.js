const Database = require('better-sqlite3');
require('dotenv').config();
const db = new Database(process.env.DB_PATH || './data/parkon.db', {});
db.pragma('journal_mode = WAL');

const ts = db.transaction(() => {
  const insT = db.prepare('INSERT OR IGNORE INTO application_templates (id, title, description, start_date, end_date, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\',\'localtime\'))');
  const insA = db.prepare('INSERT OR IGNORE INTO parking_applications (id, template_id, user_id, status, total_score, created_at, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const templates = [
    [10, '2026년 1월 월정기 주차 신청', '2026-01-15', '2026-01-25'],
    [11, '2026년 2월 월정기 주차 신청', '2026-02-15', '2026-02-25'],
    [12, '2026년 3월 월정기 주차 신청', '2026-03-15', '2026-03-25'],
    [13, '2026년 4월 월정기 주차 신청', '2026-04-15', '2026-04-25'],
    [14, '2026년 5월 월정기 주차 신청', '2026-05-15', '2026-05-25'],
    [15, '2026년 6월 월정기 주차 신청', '2026-06-15', '2026-06-25'],
  ];
  for (const t of templates) insT.run(t[0], t[1], '<p>test</p>', t[2], t[3], 'published', 1);

  let aid = 100;
  const apps = [
    { t:10, items:[[3,'approved',15,'2026-01-14 10:00:00'],[4,'rejected',9,'2026-01-15 10:00:00'],[7,'approved',12,'2026-01-16 10:00:00']] },
    { t:11, items:[[3,'approved',14,'2026-02-10 10:00:00'],[4,'approved',11,'2026-02-12 10:00:00'],[7,'rejected',8,'2026-02-14 10:00:00']] },
    { t:12, items:[[3,'approved',13,'2026-03-12 10:00:00'],[4,'approved',10,'2026-03-14 10:00:00']] },
    { t:13, items:[[3,'approved',15,'2026-04-10 10:00:00'],[4,'rejected',7,'2026-04-11 10:00:00'],[7,'approved',12,'2026-04-12 10:00:00'],[3,'submitted',11,'2026-04-13 10:00:00']] },
    { t:14, items:[[4,'approved',14,'2026-05-08 10:00:00'],[7,'approved',11,'2026-05-10 10:00:00'],[3,'rejected',9,'2026-05-12 10:00:00']] },
    { t:15, items:[[3,'approved',15,'2026-06-10 10:00:00'],[4,'rejected',8,'2026-06-12 10:00:00'],[7,'approved',13,'2026-06-15 10:00:00'],[3,'submitted',10,'2026-06-16 10:00:00'],[4,'submitted',9,'2026-06-17 10:00:00']] },
  ];
  for (const m of apps) {
    for (const a of m.items) {
      insA.run(aid, m.t, a[0], a[1], a[2], a[3], a[3]);
      aid++;
    }
  }
});

ts();
console.log('Trend seed data inserted');
db.close();
