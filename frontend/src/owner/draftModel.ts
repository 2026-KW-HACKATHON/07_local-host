export type BusinessChange = {
  date: string;
  status: 'OPEN' | 'CLOSED';
  openingTime: string;
  closingTime: string;
};
export type OwnerDraft = {
  perks: [string, string, string];
  activeStages: [boolean, boolean, boolean];
  closedDays: number[];
  notice: string;
  noticeDate: string;
  businessChange?: BusinessChange;
};

export const emptyOwnerDraft = (): OwnerDraft => ({
  perks: ['', '', ''], activeStages: [false, false, false], closedDays: [], notice: '', noticeDate: '',
});

export function ownerServerKey(server: string): string {
  // Keep the exact v1 scope algorithm so existing device-only settings survive.
  return Array.from(server).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
}

export function assertOwnerIds(userId: number, restaurantId: number): void {
  if (!Number.isSafeInteger(userId) || userId < 1 || !Number.isSafeInteger(restaurantId) || restaurantId < 1) {
    throw new Error('사용자 또는 식당 정보를 확인해 주세요.');
  }
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

/** Validate before saving, preserving legacy text and any unrecognized future fields. */
export function normalizeOwnerDraft(value: unknown): OwnerDraft {
  const invalid = () => new Error('저장한 식당 설정을 읽지 못했어요. 기존 정보는 변경하지 않았어요.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.perks) || record.perks.length !== 3 || !record.perks.every(p => typeof p === 'string') ||
      !Array.isArray(record.closedDays) || !record.closedDays.every(d => Number.isInteger(d) && d >= 0 && d <= 6) ||
      typeof record.notice !== 'string' || typeof record.noticeDate !== 'string') throw invalid();
  const active = record.activeStages === undefined ? [false, false, false] : record.activeStages;
  const perks = record.perks as OwnerDraft['perks'];
  if (!Array.isArray(active) || active.length !== 3 || !active.every(v => typeof v === 'boolean')) throw invalid();
  if (record.businessChange !== undefined) {
    const change = record.businessChange as BusinessChange | null;
    if (!change || typeof change !== 'object' || !validDate(change.date) ||
        (change.status !== 'OPEN' && change.status !== 'CLOSED') ||
        !(validTime(change.openingTime) || (change.status === 'CLOSED' && change.openingTime === '')) ||
        !(validTime(change.closingTime) || (change.status === 'CLOSED' && change.closingTime === ''))) throw invalid();
  }
  return {
    ...record,
    perks: [...record.perks] as OwnerDraft['perks'],
    activeStages: active.map((enabled, index) => enabled && perks[index].trim().length > 0) as OwnerDraft['activeStages'],
    closedDays: [...record.closedDays],
    notice: record.notice,
    noticeDate: record.noticeDate,
    ...(record.businessChange !== undefined ? { businessChange: { ...(record.businessChange as BusinessChange) } } : {}),
  } as OwnerDraft;
}
