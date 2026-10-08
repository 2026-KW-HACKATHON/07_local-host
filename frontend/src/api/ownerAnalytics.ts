import { apiRequest } from './client';

/** Server-side counts of every crowd report; unlike device-only owner report history. */
export interface OwnerHourlyCount {
  hour: number;
  available: number;
  fewSeats: number;
  longWait: number;
  unknown: number;
  total: number;
}

export interface OwnerWeekdayCount {
  /** ISO-8601: Monday = 1, ..., Sunday = 7. */
  weekday: number;
  total: number;
  hours: OwnerHourlyCount[];
}

export interface OwnerWeekdayAnalyticsResponse {
  restaurantId: number;
  days: number;
  from: string;
  through: string;
  total: number;
  weekdays: OwnerWeekdayCount[];
}

/** Fetches completed days (excluding today), with the current owner's JWT. */
export function getOwnerWeekdayAnalytics(
  restaurantId: number,
  token: string,
  signal?: AbortSignal,
): Promise<OwnerWeekdayAnalyticsResponse> {
  return apiRequest<OwnerWeekdayAnalyticsResponse>(
    `/api/restaurants/${encodeURIComponent(String(restaurantId))}/owner/analytics/weekday-hourly?days=28`,
    { token, signal },
  );
}

/** Refuse malformed backend responses rather than silently showing made-up zeros. */
export function validateOwnerWeekdayAnalytics(
  data: OwnerWeekdayAnalyticsResponse,
  requestedRestaurantId: number,
): OwnerWeekdayAnalyticsResponse {
  if (!data || data.restaurantId !== requestedRestaurantId || data.days !== 28 ||
      !Number.isInteger(data.total) || data.total < 0 ||
      typeof data.from !== 'string' || typeof data.through !== 'string' ||
      !Array.isArray(data.weekdays) || data.weekdays.length !== 7) {
    throw new Error('서버의 통계 응답 형식이 올바르지 않아요.');
  }
  const week = [...data.weekdays].sort((a, b) => a.weekday - b.weekday);
  let sum = 0;
  for (let day = 1; day <= 7; day++) {
    const item = week[day - 1];
    if (!item || item.weekday !== day || !Number.isInteger(item.total) || item.total < 0 ||
        !Array.isArray(item.hours) || item.hours.length !== 24) {
      throw new Error('요일별 서버 통계가 올바르지 않아요.');
    }
    const hours = [...item.hours].sort((a, b) => a.hour - b.hour);
    let daySum = 0;
    for (let hour = 0; hour < 24; hour++) {
      const bucket = hours[hour];
      if (!bucket || bucket.hour !== hour ||
          ![bucket.available, bucket.fewSeats, bucket.longWait, bucket.unknown, bucket.total]
            .every(n => Number.isSafeInteger(n) && n >= 0) ||
          bucket.available + bucket.fewSeats + bucket.longWait + bucket.unknown !== bucket.total) {
        throw new Error('시간대별 서버 통계가 올바르지 않아요.');
      }
      daySum += bucket.total;
    }
    if (daySum !== item.total) throw new Error('요일별 제보 건수가 서버 응답과 일치하지 않아요.');
    item.hours = hours;
    sum += item.total;
  }
  if (sum !== data.total) throw new Error('전체 제보 건수가 서버 응답과 일치하지 않아요.');
  return { ...data, weekdays: week };
}
