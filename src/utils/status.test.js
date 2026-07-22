import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  getTemplateBadgeClass,
  getTemplateBadgeLabel,
  getTemplateStatus,
  isTemplateActive,
} from './status';

const date = (s) => new Date(s + 'T00:00:00');

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalDate('2026-06-29');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(29);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('returns null for falsy input', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });
});

describe('getTemplateStatus', () => {
  const today = date('2026-06-29');

  it('returns "draft" when template is null', () => {
    expect(getTemplateStatus(null, today)).toBe('draft');
  });

  it('returns "draft" when status is not published', () => {
    expect(getTemplateStatus({ status: 'draft', start_date: '2026-06-01', end_date: '2026-06-30' }, today)).toBe('draft');
  });

  it('returns "active" when today equals start_date (timezone edge case)', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-29', end_date: '2026-07-15' }, today)).toBe('active');
  });

  it('returns "active" when today equals end_date', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-15', end_date: '2026-06-29' }, today)).toBe('active');
  });

  it('returns "active" when today is within range', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-20', end_date: '2026-07-10' }, today)).toBe('active');
  });

  it('returns "scheduled" when today is before start_date', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-07-01', end_date: '2026-07-15' }, today)).toBe('scheduled');
  });

  it('returns "closed" when today is after end_date', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-01', end_date: '2026-06-15' }, today)).toBe('closed');
  });

  it('returns "active" when start_date = today = end_date (single-day event)', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-29', end_date: '2026-06-29' }, today)).toBe('active');
  });

  it('handles month boundary crossing', () => {
    expect(getTemplateStatus({ status: 'published', start_date: '2026-05-25', end_date: '2026-06-25' }, today)).toBe('closed');
    expect(getTemplateStatus({ status: 'published', start_date: '2026-06-25', end_date: '2026-07-05' }, today)).toBe('active');
    expect(getTemplateStatus({ status: 'published', start_date: '2026-07-01', end_date: '2026-07-15' }, today)).toBe('scheduled');
  });

  it('handles year boundary crossing', () => {
    const newYearEve = date('2026-12-31');
    expect(getTemplateStatus({ status: 'published', start_date: '2026-12-25', end_date: '2027-01-05' }, newYearEve)).toBe('active');
    expect(getTemplateStatus({ status: 'published', start_date: '2027-01-01', end_date: '2027-01-15' }, newYearEve)).toBe('scheduled');
  });

  it('draft template shows draft regardless of dates', () => {
    expect(getTemplateStatus({ status: 'draft', start_date: '2026-06-01', end_date: '2026-07-01' }, today)).toBe('draft');
  });
});

describe('getTemplateBadgeLabel', () => {
  const today = date('2026-06-29');

  it('returns "임시저장" for null template', () => {
    expect(getTemplateBadgeLabel(null, today)).toBe('임시저장');
  });

  it('returns "진행중" when today equals start_date', () => {
    expect(getTemplateBadgeLabel({ status: 'published', start_date: '2026-06-29', end_date: '2026-07-15' }, today)).toBe('진행중');
  });

  it('returns "마감" when past end_date', () => {
    expect(getTemplateBadgeLabel({ status: 'published', start_date: '2026-06-01', end_date: '2026-06-15' }, today)).toBe('마감');
  });

  it('returns "진행예정" when before start_date', () => {
    expect(getTemplateBadgeLabel({ status: 'published', start_date: '2026-07-01', end_date: '2026-07-15' }, today)).toBe('진행예정');
  });

  it('returns "임시저장" for draft', () => {
    expect(getTemplateBadgeLabel({ status: 'draft', start_date: '2026-06-01', end_date: '2026-07-01' }, today)).toBe('임시저장');
  });
});

describe('getTemplateBadgeClass', () => {
  const today = date('2026-06-29');

  it('returns gray classes for draft/closed, blue for scheduled/active', () => {
    expect(getTemplateBadgeClass(null, today)).toContain('gray');
    expect(getTemplateBadgeClass({ status: 'draft' }, today)).toContain('gray');
    expect(getTemplateBadgeClass({ status: 'published', start_date: '2026-06-01', end_date: '2026-06-15' }, today)).toContain('gray');
    expect(getTemplateBadgeClass({ status: 'published', start_date: '2026-07-01', end_date: '2026-07-15' }, today)).toContain('blue');
    expect(getTemplateBadgeClass({ status: 'published', start_date: '2026-06-29', end_date: '2026-07-15' }, today)).toContain('blue');
  });
});

describe('isTemplateActive', () => {
  const today = date('2026-06-29');

  it('returns true when within range', () => {
    expect(isTemplateActive({ status: 'published', start_date: '2026-06-20', end_date: '2026-07-10' }, today)).toBe(true);
  });

  it('returns false when before start', () => {
    expect(isTemplateActive({ status: 'published', start_date: '2026-07-01', end_date: '2026-07-15' }, today)).toBe(false);
  });

  it('returns false when after end', () => {
    expect(isTemplateActive({ status: 'published', start_date: '2026-06-01', end_date: '2026-06-15' }, today)).toBe(false);
  });

  it('returns false for draft', () => {
    expect(isTemplateActive({ status: 'draft' }, today)).toBe(false);
  });
});

describe('cross-timezone parity', () => {
  const today = date('2026-06-29');

  it('UTC-12 timezone should produce same result as UTC+14', () => {
    const t = { status: 'published', start_date: '2026-06-29', end_date: '2026-07-15' };
    expect(getTemplateStatus(t, today)).toBe('active');
  });

  it('start_date = today should never be "scheduled" in any timezone', () => {
    const t = { status: 'published', start_date: '2026-06-29', end_date: '2026-07-15' };
    expect(getTemplateStatus(t, today)).not.toBe('scheduled');
  });

  it('end_date = today should never be "closed" in any timezone', () => {
    const t = { status: 'published', start_date: '2026-06-15', end_date: '2026-06-29' };
    expect(getTemplateStatus(t, today)).not.toBe('closed');
  });
});
