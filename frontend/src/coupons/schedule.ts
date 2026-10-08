export type PromotionTimeRange = { start: string; end: string };
export type PromotionSchedule = {
  noEndDate: boolean;
  endDate: string;
  unrestrictedDays: boolean;
  unrestrictedTimes: boolean;
  days: number[];
  dailyRanges: Record<string, PromotionTimeRange[]>;
  commonRanges: PromotionTimeRange[];
};

const minuteInDay = 24 * 60;
const minuteInWeek = 7 * minuteInDay;
const koreaOffsetMs = 9 * 60 * 60 * 1000;
const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

export const emptyPromotionSchedule = (): PromotionSchedule => ({
  noEndDate: false, endDate: '', unrestrictedDays: false, unrestrictedTimes: false,
  days: [], dailyRanges: {}, commonRanges: [{ start: '', end: '' }],
});

export function clonePromotionSchedule(value: PromotionSchedule): PromotionSchedule {
  return { ...value, days: [...value.days],
    dailyRanges: Object.fromEntries(Object.entries(value.dailyRanges).map(([day, ranges]) => [day, ranges.map(range => ({ ...range }))])),
    commonRanges: value.commonRanges.map(range => ({ ...range })),
  };
}

export function koreaScheduleDate(now = Date.now()): string {
  const local = new Date(now + koreaOffsetMs);
  return Number.isFinite(local.getTime()) ? local.toISOString().slice(0, 10) : '';
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function timeMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}
export function isOvernightPromotionRange(range: PromotionTimeRange): boolean {
  const start = timeMinutes(range.start);
  const end = timeMinutes(range.end);
  return start !== null && end !== null && end < start;
}
function rangesShape(value: unknown): value is PromotionTimeRange[] {
  return Array.isArray(value) && value.every(range => range && typeof range === 'object' &&
    typeof range.start === 'string' && typeof range.end === 'string');
}

/** Split weekly intervals at the Sunday/Monday boundary for overlap and eligibility checks. */
function weeklyIntervals(schedule: PromotionSchedule): [number, number][] {
  const days = schedule.unrestrictedDays ? [1, 2, 3, 4, 5, 6, 0] : schedule.days;
  const intervals: [number, number][] = [];
  for (const day of days) {
    const dayStart = ((day + 6) % 7) * minuteInDay;
    if (schedule.unrestrictedTimes) { intervals.push([dayStart, dayStart + minuteInDay]); continue; }
    const ranges = schedule.unrestrictedDays ? schedule.commonRanges : schedule.dailyRanges[String(day)];
    for (const range of ranges ?? []) {
      const start = timeMinutes(range.start)!;
      const end = timeMinutes(range.end)!;
      const from = dayStart + start;
      const to = dayStart + end + (end < start ? minuteInDay : 0);
      if (to > minuteInWeek) { intervals.push([from, minuteInWeek], [0, to - minuteInWeek]); }
      else intervals.push([from, to]);
    }
  }
  return intervals;
}

/** Validate only the enabled restrictions; disabled date/time values are retained unchanged. */
export function validatePromotionSchedule(value: unknown, { today }: { today?: string } = {}): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '프로모션 발행 조건을 확인해 주세요.';
  const schedule = value as PromotionSchedule;
  if (typeof schedule.noEndDate !== 'boolean' || typeof schedule.endDate !== 'string' ||
      typeof schedule.unrestrictedDays !== 'boolean' || typeof schedule.unrestrictedTimes !== 'boolean' ||
      !Array.isArray(schedule.days) || !schedule.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) ||
      new Set(schedule.days).size !== schedule.days.length ||
      !schedule.dailyRanges || typeof schedule.dailyRanges !== 'object' || Array.isArray(schedule.dailyRanges) ||
      !Object.values(schedule.dailyRanges).every(rangesShape) || !rangesShape(schedule.commonRanges)) {
    return '프로모션 발행 조건을 확인해 주세요.';
  }
  if (!schedule.noEndDate) {
    if (!validDate(schedule.endDate)) return '프로모션 발행 종료일을 선택해 주세요.';
    if (today && (!validDate(today) || schedule.endDate < today)) return '프로모션 발행 종료일은 오늘 이후로 선택해 주세요.';
  }
  if (!schedule.unrestrictedDays && schedule.days.length === 0) return '적용할 요일을 선택하거나 요일 제한 없음을 선택해 주세요.';
  if (schedule.unrestrictedTimes) return null;
  const groups = schedule.unrestrictedDays ? [['매일', schedule.commonRanges] as const]
    : schedule.days.map(day => [`${dayLabels[day]}요일`, schedule.dailyRanges[String(day)] ?? []] as const);
  for (const [label, ranges] of groups) {
    if (!ranges.length) return `${label}의 시간 구간을 추가해 주세요.`;
    for (const range of ranges) {
      const start = timeMinutes(range.start);
      const end = timeMinutes(range.end);
      if (start === null || end === null) return `${label}의 시작·종료 시간을 09:00처럼 입력해 주세요.`;
      if (start === end) return '시작과 종료 시간을 다르게 입력해 주세요. 종일 적용하려면 시간 제한 없음을 선택해 주세요.';
    }
  }
  const intervals = weeklyIntervals(schedule).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) return '시간 구간이 겹쳐요. 다음 날로 이어지는 구간도 확인해 주세요.';
  }
  return null;
}

/** True only during a valid weekly schedule and on/before its Korean-calendar end date. */
export function isWithinPromotionSchedule(schedule: PromotionSchedule, now = Date.now(), {
  ignoreEndDate = false, ignoreWeeklyRestrictions = false,
}: { ignoreEndDate?: boolean; ignoreWeeklyRestrictions?: boolean } = {}): boolean {
  if (!Number.isFinite(now) || validatePromotionSchedule(schedule)) return false;
  if (!ignoreEndDate && !schedule.noEndDate && koreaScheduleDate(now) > schedule.endDate) return false;
  const local = new Date(now + koreaOffsetMs);
  if (!Number.isFinite(local.getTime())) return false;
  if (ignoreWeeklyRestrictions) return true;
  const minute = ((local.getUTCDay() + 6) % 7) * minuteInDay + local.getUTCHours() * 60 + local.getUTCMinutes()
    + local.getUTCSeconds() / 60 + local.getUTCMilliseconds() / 60000;
  return weeklyIntervals(schedule).some(([start, end]) => minute >= start && minute < end);
}

/** Coupon-use conditions only; publication end dates must be displayed separately. */
export function scheduleSummary(schedule: PromotionSchedule): string {
  if (validatePromotionSchedule(schedule)) return '사용 조건 확인 필요';
  const rangeLabel = (ranges: PromotionTimeRange[]) => ranges.map(range =>
    `${range.start} ~ ${isOvernightPromotionRange(range) ? '다음 날 ' : ''}${range.end}`).join(', ');
  if (schedule.unrestrictedDays) return `매일 · ${schedule.unrestrictedTimes ? '시간 제한 없음' : rangeLabel(schedule.commonRanges)}`;
  const groups = new Map<string, string[]>();
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    if (!schedule.days.includes(day)) continue;
    const label = schedule.unrestrictedTimes ? '시간 제한 없음' : rangeLabel(schedule.dailyRanges[String(day)]);
    groups.set(label, [...(groups.get(label) ?? []), dayLabels[day]]);
  }
  return Array.from(groups, ([range, days]) => `${days.join('·')} · ${range}`).join('\n');
}
