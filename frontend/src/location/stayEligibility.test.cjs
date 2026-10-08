const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getEligibleStayRestaurants, isStayReportLink } = require('./stayEligibility.ts');

const now = 1_800_000_000_000;
const restaurant = (id, distanceMeters) => ({ id, name: `식당 ${id}`, address: '가상 테스트 주소', floor: null,
  latitude: 37.6, longitude: 127.05, distanceMeters });
const status = () => ({ running: true, phase: 'ready', message: '확인', lastObservationAt: now - 15_000,
  recommendationId: 'synthetic-stay-1', recommendation: { count: 3, radiusMeters: 50,
    dwellDurationMillis: 300_000, restaurants: [restaurant('1', 49), restaurant('2', 10), restaurant('3', 50)] } });

test('fresh five-minute candidates within 50m are available in distance order', () => {
  assert.deepEqual(getEligibleStayRestaurants(status(), now).map(row => row.id), ['2', '1', '3']);
});

test('not ready, stopped, missing native proof and stale/future observations are denied', () => {
  for (const patch of [{ running: false }, { phase: 'observing' }, { phase: 'error' },
    { recommendationId: undefined }, { lastObservationAt: undefined }, { lastObservationAt: now - 60_001 },
    { lastObservationAt: now + 1 }, { lastObservationAt: NaN }]) {
    assert.deepEqual(getEligibleStayRestaurants({ ...status(), ...patch }, now), []);
  }
});

test('five-minute duration and location boundary cannot be bypassed', () => {
  const snapshot = status();
  snapshot.recommendation.dwellDurationMillis = 299_999;
  assert.deepEqual(getEligibleStayRestaurants(snapshot, now), []);
  snapshot.recommendation.dwellDurationMillis = 300_000;
  snapshot.recommendation.radiusMeters = 999;
  snapshot.recommendation.restaurants = [restaurant('ok', 50), restaurant('far', 50.01),
    restaurant('negative', -1), restaurant('invalid', NaN), { ...restaurant('bad-coord', 2), latitude: 91 }];
  assert.deepEqual(getEligibleStayRestaurants(snapshot, now).map(row => row.id), ['ok']);
});

test('server narrower radius is respected and duplicate IDs are removed', () => {
  const snapshot = status();
  snapshot.recommendation.radiusMeters = 20;
  snapshot.recommendation.restaurants.push(restaurant('2', 11));
  assert.deepEqual(getEligibleStayRestaurants(snapshot, now).map(row => row.id), ['2']);
});

test('only the exact report route and its query/hash variants open reports', () => {
  for (const value of ['bapjul://report', 'bapjul://report?stayId=123', 'bapjul://report/', 'bapjul://report/#x']) {
    assert.equal(isStayReportLink(value), true, value);
  }
  for (const value of [null, '', 'https://report', 'bapjul://reports', 'bapjul://report/other', 'bapjul://report.example.com']) {
    assert.equal(isStayReportLink(value), false, String(value));
  }
});
