const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/businessHours.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: result.exports, Date });
const { getBusinessHours } = result.exports;
const at = value => Date.parse(`2026-10-08T${value}+09:00`);

test('daily opening is inclusive; closing is exclusive', () => {
  assert.equal(getBusinessHours('09:00:00', '21:00:00', at('08:59:59')).state, 'closed');
  assert.equal(getBusinessHours('09:00:00', '21:00:00', at('09:00:00')).state, 'open');
  assert.equal(getBusinessHours('09:00:00', '21:00:00', at('20:59:59')).state, 'open');
  assert.equal(getBusinessHours('09:00:00', '21:00:00', at('21:00:00')).state, 'closed');
});
test('status uses Korean time regardless of device timezone', () => {
  assert.equal(getBusinessHours('09:00', '21:00', Date.parse('2026-10-08T01:00:00Z')).statusLabel, '영업 중');
  assert.equal(getBusinessHours('09:00', '21:00', Date.parse('2026-10-08T14:00:00Z')).statusLabel, '영업 종료');
});
test('overnight business spans midnight and ends the next morning', () => {
  assert.equal(getBusinessHours('18:00', '02:00', at('17:59:59')).state, 'closed');
  assert.equal(getBusinessHours('18:00', '02:00', at('18:00:00')).state, 'open');
  assert.equal(getBusinessHours('18:00', '02:00', at('00:00:00')).state, 'open');
  assert.equal(getBusinessHours('18:00', '02:00', at('01:59:59')).state, 'open');
  assert.equal(getBusinessHours('18:00', '02:00', at('02:00:00')).state, 'closed');
  assert.equal(getBusinessHours('18:00', '02:00', at('23:00:00')).hoursLabel, '영업시간 18:00 ~ 다음날 02:00');
});
test('missing, malformed, equal, or invalid timestamp never assumes open or 24 hours', () => {
  for (const [opening, closing] of [[null, null], [undefined, '21:00'], ['', '21:00'], ['24:00', '21:00'], ['09:60', '21:00'], ['09:00:99', '21:00'], ['09:00', '09:00'], ['00:00', '00:00']]) {
    assert.equal(getBusinessHours(opening, closing, at('12:00:00')).state, 'unknown');
  }
  assert.equal(getBusinessHours('09:00', '21:00', NaN).state, 'unknown');
  assert.equal(getBusinessHours('09:00', '21:00', Infinity).state, 'unknown');
});
test('midnight closing and seconds in backend LocalTime are handled', () => {
  assert.equal(getBusinessHours('09:00', '00:00', at('23:59:59')).state, 'open');
  assert.equal(getBusinessHours('09:00', '00:00', at('00:00:00')).state, 'closed');
  assert.equal(getBusinessHours('09:00:30', '21:00:30', at('09:00:29')).state, 'closed');
  assert.equal(getBusinessHours('09:00:30', '21:00:30', at('09:00:30')).state, 'open');
  assert.equal(getBusinessHours('09:00:00.000000000', '21:00:00.000000000', at('12:00:00')).hoursLabel, '영업시간 09:00 ~ 21:00');
});
