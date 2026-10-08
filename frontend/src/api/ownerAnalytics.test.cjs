const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync(`${__dirname}/ownerAnalytics.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  reportDiagnostics: true,
});
assert.deepEqual(code.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error), []);
let actual;
const testExports = {};
vm.runInNewContext(code.outputText, {
  exports: testExports,
  require(name) {
    assert.equal(name, './client');
    return { apiRequest: (path, options) => { actual = { path, options }; return Promise.resolve({ ok: true }); } };
  },
});
const { getOwnerWeekdayAnalytics, validateOwnerWeekdayAnalytics } = testExports;
const fixture = () => ({
  restaurantId: 1, days: 28, from: '2026-09-11', through: '2026-10-08', total: 120,
  weekdays: [20, 22, 24, 20, 16, 10, 8].map((total, index) => ({
    weekday: index + 1, total,
    hours: Array.from({length: 24}, (_, hour) => ({
      hour, available: hour === 12 ? total : 0, fewSeats: 0, longWait: 0, unknown: 0,
      total: hour === 12 ? total : 0,
    })),
  })),
});
test('requests 28-day restaurant owner endpoint with a bearer token and cancellation signal', async () => {
  const signal = new AbortController().signal;
  await getOwnerWeekdayAnalytics(12, 'private-token', signal);
  assert.equal(actual.path, '/api/restaurants/12/owner/analytics/weekday-hourly?days=28');
  assert.equal(actual.options.token, 'private-token');
  assert.equal(actual.options.signal, signal);
});
test('accepts server sample counts and sorts weekdays and hours', () => {
  const response = fixture();
  response.weekdays.reverse(); response.weekdays[0].hours.reverse();
  const validated = validateOwnerWeekdayAnalytics(response, 1);
  assert.equal(validated.total, 120);
  assert.equal(validated.weekdays[0].weekday, 1);
  assert.equal(validated.weekdays[6].hours[0].hour, 0);
  assert.equal(validated.weekdays[6].hours[12].available, 8);
});
test('rejects responses for a different restaurant', () => {
  assert.throws(() => validateOwnerWeekdayAnalytics(fixture(), 2), /형식/);
});
test('rejects invalid hourly totals rather than silently substituting zero', () => {
  const response = fixture(); response.weekdays[0].hours[12].total++;
  assert.throws(() => validateOwnerWeekdayAnalytics(response, 1), /시간대별/);
});
test('rejects missing hourly buckets', () => {
  const response = fixture(); response.weekdays[3].hours.pop();
  assert.throws(() => validateOwnerWeekdayAnalytics(response, 1), /요일별/);
});
test('rejects mismatched total counts', () => {
  const response = fixture(); response.total++;
  assert.throws(() => validateOwnerWeekdayAnalytics(response, 1), /전체/);
});
