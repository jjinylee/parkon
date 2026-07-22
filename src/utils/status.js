export function parseLocalDate(s) {
  return s ? new Date(s + 'T00:00:00') : null;
}

export function getToday() {
  return new Date(new Date().toDateString());
}

function getStatus(t, today) {
  if (!t || t.status !== 'published') return 'draft';
  const start = parseLocalDate(t.start_date);
  const end = parseLocalDate(t.end_date);
  if (end && end < today) return 'closed';
  if (start && start > today) return 'scheduled';
  return 'active';
}

const BADGE_CLASS = {
  draft: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-500',
  scheduled: 'bg-blue-100 text-blue-500',
  active: 'bg-blue-100 text-blue-700',
};

const BADGE_LABEL = {
  draft: '임시저장',
  closed: '마감',
  scheduled: '진행예정',
  active: '진행중',
};

export function getTemplateBadgeClass(t, today) {
  return BADGE_CLASS[getStatus(t, today || getToday())];
}

export function getTemplateBadgeLabel(t, today) {
  return BADGE_LABEL[getStatus(t, today || getToday())];
}

export function getTemplateStatus(t, today) {
  return getStatus(t, today || getToday());
}

export function isTemplateActive(t, today) {
  return getTemplateStatus(t, today) === 'active';
}
