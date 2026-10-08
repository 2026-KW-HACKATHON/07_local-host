const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/analytics.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: result.exports, Date });
const { aggregateOwnerCrowd, koreaObservationTime } = result.exports;
const endAt = Date.parse('2026-10-08T12:00:00+09:00');
const point = (time, level) => ({ time, level });

test('all 7 weekdays have exactly 24 empty hour buckets, no data is never AVAILABLE', () => {
  const week = aggregateOwnerCrowd([], { endAt });
  assert.equal(week.length, 7);
  for (const hours of week) {
    assert.equal(hours.length, 24);
    for (const bucket of hours) { assert.equal(bucket.score, null); assert.equal(bucket.sampleCount, 0); }
  }
});
test('mode uses categorical votes rather than a numeric average', () => {
  const values = ['AVAILABLE', 'AVAILABLE', 'LONG_WAIT'].map((level, i) => point(`2026-10-05T09:0${i}:00`, level));
  const bucket = aggregateOwnerCrowd(values, { endAt })[1][9];
  assert.equal(bucket.score, 0);
  assert.equal(bucket.sampleCount, 3);
  assert.deepEqual(Array.from(bucket.counts), [2, 0, 1]);
});
test('numeric score properties do not override the reported category', () => {
  const bucket = aggregateOwnerCrowd([{ ...point('2026-10-05T10:00:00', 'LONG_WAIT'), score: 0.1 }], { endAt })[1][10];
  assert.equal(bucket.score, 2);
});
test('four weeks of same weekday and hour are combined', () => {
  const values = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].map(date => point(`${date}T12:30:00`, 'FEW_SEATS'));
  const bucket = aggregateOwnerCrowd(values, { endAt })[1][12];
  assert.equal(bucket.score, 1); assert.equal(bucket.sampleCount, 4);
});
test('Korean local date-times and UTC offsets land in the same Korean weekday-hour', () => {
  const week = aggregateOwnerCrowd([
    point('2026-10-04T15:10:00Z', 'AVAILABLE'),
    point('2026-10-05T00:20:00+09:00', 'AVAILABLE'),
    point('2026-10-05T00:30:00', 'AVAILABLE'),
  ], { endAt });
  assert.equal(week[1][0].sampleCount, 3);
  assert.equal(week[0][15].sampleCount, 0);
});
test('28-day lower boundary, future, unknown and invalid observations are excluded', () => {
  const week = aggregateOwnerCrowd([
    point('2026-09-10T12:00:00+09:00', 'LONG_WAIT'),
    point('2026-09-10T12:00:01+09:00', 'AVAILABLE'),
    point('2026-10-08T12:00:01+09:00', 'LONG_WAIT'),
    point('2026-10-08T12:00:00+09:00', 'FEW_SEATS'),
    point('2026-10-05T09:00:00', 'UNKNOWN'),
    point('2026-09-31T09:00:00', 'AVAILABLE'),
    point('not-a-date', 'LONG_WAIT'),
  ], { endAt });
  assert.equal(week.flat().reduce((sum, b) => sum + b.sampleCount, 0), 2);
});
test('unspecified tie policy leaves tied cells unresolved', () => {
  const bucket = aggregateOwnerCrowd([
    point('2026-10-05T09:00:00', 'AVAILABLE'), point('2026-10-05T09:05:00', 'LONG_WAIT'),
  ], { endAt })[1][9];
  assert.equal(bucket.score, null); assert.equal(bucket.tied, true);
});
test('explicit crowded tie policy selects only the most crowded tied winner', () => {
  const bucket = aggregateOwnerCrowd([
    point('2026-10-05T09:00:00', 'AVAILABLE'), point('2026-10-05T09:05:00', 'FEW_SEATS'),
  ], { endAt, tieBreak: 'crowded' })[1][9];
  assert.equal(bucket.score, 1);
});
test('explicit latest tie policy uses newest observation among tied categories', () => {
  const bucket = aggregateOwnerCrowd([
    point('2026-10-05T09:05:00', 'AVAILABLE'), point('2026-10-05T09:00:00', 'LONG_WAIT'),
  ], { endAt, tieBreak: 'latest' })[1][9];
  assert.equal(bucket.score, 0);
});
test('same timestamp latest ties remain unresolved and do not depend on input order', () => {
  const points = [point('2026-10-05T09:00:00', 'AVAILABLE'), point('2026-10-05T09:00:00', 'LONG_WAIT')];
  for (const ordered of [points, [...points].reverse()]) {
    assert.equal(aggregateOwnerCrowd(ordered, { endAt, tieBreak: 'latest' })[1][9].score, null);
  }
});
test('time parser rejects impossible dates and hours', () => {
  for (const time of ['2026-02-30T09:00:00', '2026-10-08T24:00:00', '2026-13-01T10:00:00', 'invalid']) {
    assert.equal(Number.isNaN(koreaObservationTime(time)), true);
  }
  assert.equal(koreaObservationTime('2026-10-05T00:00:00.123456789'), Date.parse('2026-10-05T00:00:00.123+09:00'));
});
