const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/schedule.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: result.exports, Date });
const { emptyPromotionSchedule, clonePromotionSchedule, validatePromotionSchedule, isWithinPromotionSchedule,
  isOvernightPromotionRange, koreaScheduleDate, scheduleSummary } = result.exports;
const range = (start, end) => ({ start, end });
const base = () => ({ noEndDate: true, endDate: '', unrestrictedDays: false, unrestrictedTimes: false,
  days: [1], dailyRanges: { 1: [range('09:00', '17:00')] }, commonRanges: [] });
const at = value => Date.parse(value);
const invalid = schedule => assert.equal(typeof validatePromotionSchedule(schedule), 'string');

test('new schedules do not preselect days, hours, dates, or unrestricted options', () => {
  const schedule = emptyPromotionSchedule();
  assert.equal(schedule.days.length, 0);
  assert.equal(schedule.endDate, '');
  assert.equal(schedule.noEndDate || schedule.unrestrictedDays || schedule.unrestrictedTimes, false);
  assert.equal(schedule.commonRanges[0].start + schedule.commonRanges[0].end, '');
  invalid(schedule);
});
test('explicitly unrestricted schedule can be saved without inactive field values', () => {
  assert.equal(validatePromotionSchedule({ ...emptyPromotionSchedule(), noEndDate: true, unrestrictedDays: true, unrestrictedTimes: true }), null);
});
test('end date is required, rejects impossible dates and rejects past dates when saving', () => {
  for (const endDate of ['', '2026-02-30', '2026-13-01', '2026-1-1']) invalid({ ...base(), noEndDate: false, endDate });
  assert.equal(validatePromotionSchedule({ ...base(), noEndDate: false, endDate: '2026-10-12' }, { today: '2026-10-12' }), null);
  assert.equal(typeof validatePromotionSchedule({ ...base(), noEndDate: false, endDate: '2026-10-11' }, { today: '2026-10-12' }), 'string');
});
test('inactive date is not validated or removed', () => {
  const schedule = { ...base(), endDate: 'old selection' };
  assert.equal(validatePromotionSchedule(schedule), null);
  assert.equal(schedule.endDate, 'old selection');
});
test('at least one day is needed unless days are unrestricted', () => {
  invalid({ ...base(), days: [] });
  invalid({ ...base(), days: [1, 1] });
  invalid({ ...base(), days: [7] });
});
test('each selected day requires a valid HH:mm range', () => {
  invalid({ ...base(), dailyRanges: {} });
  invalid({ ...base(), dailyRanges: { 1: [] } });
  for (const start of ['', '9:00', '24:00', '12:60', '09:00:00']) invalid({ ...base(), dailyRanges: { 1: [range(start, '17:00')] } });
});
test('same-time endpoints rejected; 24-hour operation uses explicit unrestricted times', () => {
  invalid({ ...base(), dailyRanges: { 1: [range('00:00', '00:00')] } });
  assert.equal(validatePromotionSchedule({ ...base(), unrestrictedTimes: true, dailyRanges: { 1: [range('', '')] } }), null);
});
test('overlapping or duplicate ranges rejected but touching ranges allowed', () => {
  invalid({ ...base(), dailyRanges: { 1: [range('09:00', '12:00'), range('11:00', '15:00')] } });
  invalid({ ...base(), dailyRanges: { 1: [range('09:00', '12:00'), range('09:00', '12:00')] } });
  assert.equal(validatePromotionSchedule({ ...base(), dailyRanges: { 1: [range('09:00', '12:00'), range('12:00', '15:00')] } }), null);
});
test('overnight overlap across adjacent selected days rejected', () => {
  invalid({ ...base(), days: [1, 2], dailyRanges: { 1: [range('22:00', '02:00')], 2: [range('01:00', '03:00')] } });
  assert.equal(validatePromotionSchedule({ ...base(), days: [1, 2], dailyRanges: { 1: [range('22:00', '02:00')], 2: [range('02:00', '03:00')] } }), null);
});
test('Sunday overnight overlap with Monday is rejected at weekly wrap', () => {
  invalid({ ...base(), days: [0, 1], dailyRanges: { 0: [range('22:00', '02:00')], 1: [range('01:00', '03:00')] } });
});
test('unrestricted days use common ranges and detect repeated overnight overlap', () => {
  invalid({ ...base(), unrestrictedDays: true, commonRanges: [] });
  invalid({ ...base(), unrestrictedDays: true, commonRanges: [range('22:00', '02:00'), range('01:00', '03:00')] });
  assert.equal(validatePromotionSchedule({ ...base(), unrestrictedDays: true, commonRanges: [range('22:00', '02:00'), range('03:00', '04:00')] }), null);
});
test('disabled time/day restrictions retain values without treating them as enabled', () => {
  const schedule = { ...base(), days: [], unrestrictedDays: true, unrestrictedTimes: true, dailyRanges: { 1: [range('', '')] }, commonRanges: [] };
  assert.equal(validatePromotionSchedule(schedule), null);
  assert.equal(schedule.dailyRanges[1][0].start, '');
});
test('schedule clones isolate nested arrays and preserve inactive selections', () => {
  const original = { ...base(), unrestrictedTimes: true, commonRanges: [range('01:00', '02:00')] };
  const clone = clonePromotionSchedule(original);
  clone.days.push(2); clone.dailyRanges[1][0].start = '08:00'; clone.commonRanges[0].end = '03:00';
  assert.equal(original.days.length, 1); assert.equal(original.dailyRanges[1][0].start, '09:00'); assert.equal(original.commonRanges[0].end, '02:00');
});
test('Korean weekday/hour start is inclusive and end is exclusive independent of device timezone', () => {
  const schedule = base();
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-11T23:59:59.999Z')), false);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T00:00:00Z')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T07:59:59.999Z')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T08:00:00Z')), false);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T00:00:00Z')), false);
});
test('selected Monday overnight interval includes Tuesday early hours, not unrelated days', () => {
  const schedule = { ...base(), dailyRanges: { 1: [range('22:00', '02:00')] } };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T22:00:00+09:00')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T01:59:59+09:00')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T02:00:00+09:00')), false);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-14T01:00:00+09:00')), false);
});
test('Sunday overnight eligibility wraps into Monday', () => {
  const schedule = { ...base(), days: [0], dailyRanges: { 0: [range('22:00', '02:00')] } };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T01:00:00+09:00')), true);
});
test('unrestricted times cover selected days only', () => {
  const schedule = { ...base(), unrestrictedTimes: true };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T00:00:00+09:00')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T23:59:59.999+09:00')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T00:00:00+09:00')), false);
});
test('publication end date includes that entire Korean day and does not allow spill after expiry', () => {
  const schedule = { ...base(), noEndDate: false, endDate: '2026-10-12', unrestrictedDays: true, unrestrictedTimes: true };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T23:59:59.999+09:00')), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T00:00:00+09:00')), false);
});
test('download-period checks can ignore use-day/time restrictions but still honor end date', () => {
  const schedule = { ...base(), noEndDate: false, endDate: '2026-10-14' };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T03:00:00+09:00')), false);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-13T03:00:00+09:00'), { ignoreWeeklyRestrictions: true }), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-15T03:00:00+09:00'), { ignoreWeeklyRestrictions: true }), false);
});
test('owned-coupon use checks can ignore publication end while preserving weekly conditions', () => {
  const schedule = { ...base(), noEndDate: false, endDate: '2026-10-11' };
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T10:00:00+09:00')), false);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T10:00:00+09:00'), { ignoreEndDate: true }), true);
  assert.equal(isWithinPromotionSchedule(schedule, at('2026-10-12T18:00:00+09:00'), { ignoreEndDate: true }), false);
});
test('invalid input or invalid current time never grants eligibility', () => {
  assert.equal(isWithinPromotionSchedule(emptyPromotionSchedule()), false);
  assert.equal(isWithinPromotionSchedule(base(), NaN), false);
  for (const invalidShape of [null, [], {}, { ...base(), noEndDate: 'true' }, { ...base(), commonRanges: null }]) invalid(invalidShape);
});
test('Korean calendar date crosses the UTC date boundary correctly', () => {
  assert.equal(koreaScheduleDate(at('2026-10-11T15:00:00Z')), '2026-10-12');
  assert.equal(koreaScheduleDate(NaN), '');
});
test('overnight label uses next-day only for valid lower end time', () => {
  assert.equal(isOvernightPromotionRange(range('22:00', '02:00')), true);
  assert.equal(isOvernightPromotionRange(range('09:00', '17:00')), false);
  assert.equal(isOvernightPromotionRange(range('00:00', '00:00')), false);
  assert.equal(isOvernightPromotionRange(range('', '02:00')), false);
});
test('summary groups equal weekdays, shows next-day, and never includes publication dates', () => {
  const schedule = { ...base(), noEndDate: false, endDate: '2026-10-31', days: [3, 1, 0],
    dailyRanges: { 1: [range('14:00', '16:00')], 3: [range('14:00', '16:00')], 0: [range('22:00', '02:00')] } };
  const text = scheduleSummary(schedule);
  assert.equal(text, '월·수 · 14:00 ~ 16:00\n일 · 22:00 ~ 다음 날 02:00');
  assert.equal(text.includes('2026-10-31'), false);
});
test('summary supports every day and unrestricted times', () => {
  assert.equal(scheduleSummary({ ...base(), unrestrictedDays: true, unrestrictedTimes: true }), '매일 · 시간 제한 없음');
  assert.equal(scheduleSummary({ ...base(), days: [0, 1], unrestrictedTimes: true }), '월·일 · 시간 제한 없음');
  assert.equal(scheduleSummary(emptyPromotionSchedule()), '사용 조건 확인 필요');
});
