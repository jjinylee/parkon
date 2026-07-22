const db = require('../config/database');

function approval(months = 6) {
  const totalApplicants = db.prepare('SELECT COUNT(*) as cnt FROM parking_applications WHERE status != ?').get('draft').cnt;
  const totalApproved = db.prepare("SELECT COUNT(*) as cnt FROM parking_applications WHERE status = 'approved'").get().cnt;
  const avgApprovalRate = totalApplicants > 0 ? Math.round((totalApproved / totalApplicants) * 1000) / 10 : 0;

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', COALESCE(submitted_at, created_at)) AS month,
           COUNT(*) AS applicants,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved
    FROM parking_applications
    WHERE status != 'draft'
      AND COALESCE(submitted_at, created_at) >= date('now', ?)
    GROUP BY month
    ORDER BY month ASC
  `).all(`-${months} months`);

  return { total_applicants: totalApplicants, total_approved: totalApproved, avg_approval_rate: avgApprovalRate, monthly };
}

function trendByReferenceDate(referenceDate) {
  const months = db.prepare(`
    WITH RECURSIVE seq(m) AS (
      SELECT date(?, 'start of month', '-5 months')
      UNION ALL
      SELECT date(m, '+1 month')
      FROM seq
      WHERE m < date(?, 'start of month')
    )
    SELECT strftime('%Y-%m', seq.m) AS month,
           COALESCE(COUNT(pa.id), 0) AS applicants,
           COALESCE(SUM(CASE WHEN pa.status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
           COALESCE(SUM(CASE WHEN pa.status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
    FROM seq
    LEFT JOIN parking_applications pa
      ON strftime('%Y-%m', COALESCE(pa.submitted_at, pa.created_at)) = strftime('%Y-%m', seq.m)
      AND pa.status != 'draft'
    GROUP BY seq.m
    ORDER BY seq.m ASC
  `).all(referenceDate, referenceDate);
  return months;
}

module.exports = { approval, trendByReferenceDate };
