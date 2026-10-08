export interface StayRestaurant {
  id: string; name: string; address: string; floor: string | null;
  latitude: number; longitude: number; distanceMeters: number;
}

export interface StayStatus {
  running: boolean;
  phase: 'unsupported' | 'stopped' | 'observing' | 'waiting' | 'loading' | 'ready' | 'error';
  message: string;
  /** Native monotonic GPS age is converted to an epoch timestamp when status is read. */
  lastObservationAt?: number;
  recommendationId?: string;
  notificationShown?: boolean;
  recommendation?: { count: number; radiusMeters: number; dwellDurationMillis: number; restaurants: StayRestaurant[] } | null;
}

export const MAX_STAY_SAMPLE_AGE_MS = 60_000;
export const REQUIRED_STAY_DURATION_MS = 300_000;
export const MAX_REPORT_DISTANCE_METERS = 50;

/** UI eligibility only; the report API must independently verify the same location proof. */
export function getEligibleStayRestaurants(status: StayStatus, now = Date.now()): StayRestaurant[] {
  const result = status.recommendation;
  const lastObservationAt = status.lastObservationAt;
  if (!status.running || status.phase !== 'ready' || !status.recommendationId || !result ||
      !Number.isFinite(lastObservationAt) || lastObservationAt! > now ||
      now - lastObservationAt! > MAX_STAY_SAMPLE_AGE_MS ||
      !Number.isFinite(result.dwellDurationMillis) || result.dwellDurationMillis < REQUIRED_STAY_DURATION_MS ||
      !Number.isFinite(result.radiusMeters) || result.radiusMeters <= 0 || !Array.isArray(result.restaurants)) return [];

  const radius = Math.min(result.radiusMeters, MAX_REPORT_DISTANCE_METERS);
  const ids = new Set<string>();
  return result.restaurants.filter(restaurant => {
    const id = String(restaurant.id ?? '');
    if (!id || ids.has(id) || !Number.isFinite(restaurant.distanceMeters) ||
        restaurant.distanceMeters < 0 || restaurant.distanceMeters > radius ||
        !Number.isFinite(restaurant.latitude) || Math.abs(restaurant.latitude) > 90 ||
        !Number.isFinite(restaurant.longitude) || Math.abs(restaurant.longitude) > 180) return false;
    ids.add(id);
    return true;
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function isStayReportLink(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^bapjul:\/\/report(?:\/?(?:\?|#|$))/.test(url);
}
