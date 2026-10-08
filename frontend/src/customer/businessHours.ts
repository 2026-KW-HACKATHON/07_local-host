export type BusinessHoursState = 'open' | 'closed' | 'unknown';
export type BusinessHoursInfo = { state: BusinessHoursState; statusLabel: string; hoursLabel: string };

function parseTime(value: unknown): { seconds: number; label: string } | null {
  if (typeof value !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d{1,9})?)?$/.exec(value);
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0);
  return { seconds, label: `${match[1]}:${match[2]}${Number(match[3] ?? 0) ? `:${match[3]}` : ''}` };
}

/** The restaurant contract provides daily hours, not holidays or exceptional schedules. */
export function getBusinessHours(openingTime: unknown, closingTime: unknown, now = Date.now()): BusinessHoursInfo {
  const opening = parseTime(openingTime);
  const closing = parseTime(closingTime);
  if (!opening || !closing) return { state: 'unknown', statusLabel: '영업상태 확인 필요', hoursLabel: '영업시간 확인 필요' };
  const overnight = closing.seconds < opening.seconds;
  const hoursLabel = `영업시간 ${opening.label} ~ ${overnight ? '다음날 ' : ''}${closing.label}`;
  // Matching endpoints cannot distinguish a closed restaurant from 24-hour operation.
  if (opening.seconds === closing.seconds || !Number.isFinite(now)) return { state: 'unknown', statusLabel: '영업상태 확인 필요', hoursLabel };
  const koreaTime = new Date(now + 9 * 3600 * 1000);
  if (Number.isNaN(koreaTime.getTime())) return { state: 'unknown', statusLabel: '영업상태 확인 필요', hoursLabel };
  const seconds = koreaTime.getUTCHours() * 3600 + koreaTime.getUTCMinutes() * 60 + koreaTime.getUTCSeconds() + koreaTime.getUTCMilliseconds() / 1000;
  const isOpen = overnight ? seconds >= opening.seconds || seconds < closing.seconds : seconds >= opening.seconds && seconds < closing.seconds;
  return { state: isOpen ? 'open' : 'closed', statusLabel: isOpen ? '영업 중' : '영업 종료', hoursLabel };
}
