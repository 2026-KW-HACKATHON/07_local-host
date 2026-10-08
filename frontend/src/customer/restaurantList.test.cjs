const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/restaurantList.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: result.exports, Date });
const { selectRestaurants, activeBenefits, naverSearchUrls, distanceLabel, RESTAURANT_PAGE_SIZE } = result.exports;
const promo = { id: 1, enabled: true, active: true, startAt: '2020-01-01T00:00:00Z', endAt: '2090-01-01T00:00:00Z' };
const rows = [
  { restaurant: { id: 1, name: '밥집', address: '노원' }, crowd: { level: 'LONG_WAIT' }, promotions: [promo] },
  { restaurant: { id: 2, name: '분식', address: '강남' }, crowd: { level: 'AVAILABLE' }, promotions: [] },
  { restaurant: { id: 3, name: '국밥', address: '노원' }, crowd: null, promotions: null },
  { restaurant: { id: 4, name: 'Pizza', address: '서울' }, crowd: { level: 'FEW_SEATS' }, promotions: [] },
  ...[5, 6, 7].map(id => ({ restaurant: { id, name: `식당${id}`, address: '서울' }, crowd: null, promotions: [] })),
];
const ids = values => Array.from(values, row => row.restaurant.id);
test('known distance before missing distance, no input mutation', () => {
  assert.deepEqual(ids(selectRestaurants(rows, '', '거리순', { 2: 45, 3: 12 })), [3, 2, 1, 4, 5, 6, 7]);
  assert.deepEqual(ids(rows), [1, 2, 3, 4, 5, 6, 7]);
});
test('unknown, invalid and negative distances never become zero meters', () => {
  assert.equal(distanceLabel(undefined), '거리 확인 전');
  assert.equal(distanceLabel(NaN), '거리 확인 전');
  assert.equal(distanceLabel(-1), '거리 확인 전');
  assert.equal(distanceLabel(1200), '1.2km');
});
test('crowd sort puts unknown last; ties sort by distance', () => {
  assert.deepEqual(ids(selectRestaurants(rows, '', '여유순', {})), [2, 4, 1, 3, 5, 6, 7]);
});
test('query matches restaurant names and addresses without case sensitivity', () => {
  assert.deepEqual(ids(selectRestaurants(rows, '노원', '거리순', {})), [1, 3]);
  assert.deepEqual(ids(selectRestaurants(rows, ' PIZZA ', '거리순', {})), [4]);
});
test('three rows initially then 6 then final 7', () => {
  assert.equal(RESTAURANT_PAGE_SIZE, 3);
  assert.equal(rows.slice(0, RESTAURANT_PAGE_SIZE).length, 3);
  assert.equal(rows.slice(0, RESTAURANT_PAGE_SIZE * 2).length, 6);
  assert.equal(rows.slice(0, RESTAURANT_PAGE_SIZE * 3).length, 7);
});
test('Naver query remains encoded inside HTTPS mobile search, blank does not navigate', () => {
  assert.equal(naverSearchUrls('  '), null);
  assert.equal(naverSearchUrls('밥 & 면').web, 'https://m.map.naver.com/search2/search.naver?query=%EB%B0%A5%20%26%20%EB%A9%B4');
});
test('only active, enabled, unexpired benefits are shown, never coupon ownership', () => {
  const expired = { ...promo, endAt: '2021-01-01T00:00:00Z' };
  assert.equal(activeBenefits([promo, expired, { ...promo, active: false }, { ...promo, enabled: false }]).length, 1);
  assert.equal(activeBenefits(null).length, 0);
  assert.deepEqual(ids(selectRestaurants(rows, '', '프로모션', {})), [1]);
});
