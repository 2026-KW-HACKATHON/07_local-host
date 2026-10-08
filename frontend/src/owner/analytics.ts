import type { CrowdLevel } from '../api/types';

export type CrowdTieBreak = 'latest' | 'crowded';
export interface AnalyticsObservation { time: string; level: CrowdLevel }
export interface HourlyCrowdBucket {
  hour: number;
  score: 0 | 1 | 2 | null;
  counts: [number, number, number];
  sampleCount: number;
  /** No tie is resolved unless the caller explicitly supplies a policy. */
  tied: boolean;
}

const dayMs = 24 * 60 * 60 * 1000;
const koreaOffsetMs = 9 * 60 * 60 * 1000;
const levelScores: Partial<Record<CrowdLevel, 0 | 1 | 2>> = { AVAILABLE: 0, FEW_SEATS: 1, LONG_WAIT: 2 };

/** Backend LocalDateTime strings are interpreted as Korean local time, independently of the device timezone. */
export function koreaObservationTime(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = '00', fraction = '', zone] = match;
  const lastDay = new Date(Date.UTC(+year, +month, 0)).getUTCDate();
  if (+month < 1 || +month > 12 || +day < 1 || +day > lastDay || +hour > 23 || +minute > 59 || +second > 59) return NaN;
  // Normalize Java nanosecond fractions for the same ISO parser behavior in Hermes and Node.
  const milliseconds = fraction.slice(0, 3).padEnd(3, '0');
  return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds}${zone ?? '+09:00'}`);
}

/**
 * Counts categorical observations in each Korean weekday/hour over a rolling 28 days.
 * Averages and unknown observations are never converted into votes. The caller must
 * provide raw observations or an equivalent lossless categorical dataset.
 */
export function aggregateOwnerCrowd(points: readonly AnalyticsObservation[], {
  endAt = Date.now(), tieBreak,
}: { endAt?: number; tieBreak?: CrowdTieBreak } = {}): HourlyCrowdBucket[][] {
  const week = Array.from({ length: 7 }, () => Array.from({ length: 24 }, (_, hour): HourlyCrowdBucket => ({
    hour, score: null, counts: [0, 0, 0], sampleCount: 0, tied: false,
  })));
  const latest = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => [-Infinity, -Infinity, -Infinity]));
  if (!Number.isFinite(endAt)) return week;
  const startAt = endAt - 28 * dayMs;
  for (const point of points) {
    const score = levelScores[point.level];
    const time = koreaObservationTime(point.time);
    if ((score !== 0 && score !== 1 && score !== 2) || !Number.isFinite(time) || time <= startAt || time > endAt) continue;
    const local = new Date(time + koreaOffsetMs);
    const day = local.getUTCDay();
    const hour = local.getUTCHours();
    const bucket = week[day][hour];
    bucket.counts[score]++;
    bucket.sampleCount++;
    latest[day][hour][score] = Math.max(latest[day][hour][score], time);
  }
  week.forEach((hours, day) => hours.forEach(bucket => {
    if (!bucket.sampleCount) return;
    const maximum = Math.max(...bucket.counts);
    const winners = ([0, 1, 2] as const).filter(score => bucket.counts[score] === maximum);
    bucket.tied = winners.length > 1;
    if (winners.length === 1) bucket.score = winners[0];
    else if (tieBreak === 'crowded') bucket.score = winners[winners.length - 1];
    else if (tieBreak === 'latest') {
      const latestTime = Math.max(...winners.map(score => latest[day][bucket.hour][score]));
      const latestWinners = winners.filter(score => latest[day][bucket.hour][score] === latestTime);
      // Same-timestamp ties remain unselected; array order is not a product policy.
      if (latestWinners.length === 1) bucket.score = latestWinners[0];
    }
  }));
  return week;
}
