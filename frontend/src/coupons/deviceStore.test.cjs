// Entirely simulated storage and clock; no emulator, accounts, or backend are touched.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const plain = value => JSON.parse(JSON.stringify(value));
const owner = { id: 1, email: 'owner@example.invalid', nickname: '점주', role: 'OWNER' };
const customer = { id: 2, email: 'guest@example.invalid', nickname: '손님', role: 'CUSTOMER' };
const restaurant = { id: 11, ownerId: 1, name: '테스트 식당', address: '가상 주소', openingTime: '10:00:00', closingTime: '22:00:00' };
const unrestricted = () => ({ noEndDate: true, endDate: '', unrestrictedDays: true, unrestrictedTimes: true, days: [], dailyRanges: {}, commonRanges: [] });
const report = (id = 101, overrides = {}) => ({ id, restaurantId: 11, reporterId: 2, level: 'AVAILABLE', label: '바로 앉아요', reportedAt: '2026-10-05T10:00:00', ...overrides });

function fixture() {
  let now = Date.parse('2026-10-05T10:00:00+09:00');
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const files = new Map();
  let failMove = false;
  let failWrite = false;
  const modules = new Map();
  function load(relative, imports = {}) {
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(source, { module, exports: module.exports, Date: ClockDate, require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
      return imports[name];
    } });
    return module.exports;
  }
  const join = parts => parts.map(value => typeof value === 'string' ? value : value.uri).map((value, index) => index ? value.replace(/^\/+|\/+$/g, '') : value.replace(/\/$/, '')).join('/');
  class Directory { constructor(...parts) { this.uri = join(parts); } create() {} }
  class File {
    constructor(...parts) { this.uri = join(parts); }
    get exists() { return files.has(this.uri); }
    async text() { if (!this.exists) throw new Error('missing'); return files.get(this.uri); }
    write(value) { if (failWrite) throw new Error('write failed'); files.set(this.uri, value); }
    async move(target, options) {
      if (failMove) throw new Error('publication failed');
      assert.equal(options.overwrite, true);
      files.set(target.uri, files.get(this.uri)); files.delete(this.uri); this.uri = target.uri;
    }
    delete() { files.delete(this.uri); }
  }
  const schedule = load('schedule.ts');
  const model = load('model.ts', { './schedule': schedule });
  const draft = load('../owner/draftModel.ts');
  const analytics = load('../owner/analytics.ts');
  const serviceFor = (server = 'https://example.invalid') => load('deviceStore.ts', {
    'expo-file-system': { Directory, File, Paths: { document: new Directory('file:///documents') } },
    '../config/api': { API_BASE_URL: server }, '../owner/draftModel': draft,
    '../owner/analytics': analytics, './model': model, './schedule': schedule,
  });
  const service = serviceFor();
  const statePath = `file:///documents/device-coupons/${draft.ownerServerKey('https://example.invalid')}/state.json`;
  return { ...service, files, model, schedule, statePath, serviceFor,
    setNow: value => { now = typeof value === 'number' ? value : Date.parse(value); },
    now: () => now, failMove: value => { failMove = value; }, failWrite: value => { failWrite = value; },
    publish: (cost = 1000, settings = unrestricted(), stage = 1, benefit = '음료 서비스') => service.publishDevicePromotion(owner, restaurant, stage, benefit, settings, cost),
  };
}

test('customer receives 1000P once across rereads and fresh module reloads', async () => {
  const app = fixture();
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 1000);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 1000);
  const read = await app.serviceFor().readDeviceCouponState(customer);
  assert.equal(read.wallet.balance, 1000); assert.equal(read.wallet.ledger.length, 1);
  assert.equal((await app.readDeviceCouponState(owner)).wallet, null);
});

test('identity and server scopes isolate wallets while sharing same-device promotions', async () => {
  const app = fixture();
  const promotion = await app.publish();
  await app.downloadDeviceCoupon(customer, promotion.id);
  const other = { ...customer, id: 3, email: 'other@example.invalid' };
  const changedEmail = { ...customer, email: 'another@example.invalid' };
  assert.equal((await app.readDeviceCouponState(other)).wallet.balance, 1000);
  assert.equal((await app.readDeviceCouponState(changedEmail)).wallet.balance, 1000);
  const remote = await app.serviceFor('https://other.invalid').readDeviceCouponState(customer);
  assert.equal(remote.wallet.balance, 1000); assert.equal(remote.promotions.length, 0);
  assert.equal((await app.readDeviceCouponState(other)).promotions.length, 1);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 0);
});

test('report rewards require server-shaped own report and apply once per report ID', async () => {
  const app = fixture();
  assert.deepEqual(plain(await app.awardDeviceReportPoints(customer, report())), { awarded: 1000, balance: 2000 });
  assert.deepEqual(plain(await app.awardDeviceReportPoints(customer, report())), { awarded: 0, balance: 2000 });
  assert.equal((await app.awardDeviceReportPoints(customer, report(101, { restaurantId: 12 }))).awarded, 0);
  assert.equal((await app.awardDeviceReportPoints(customer, report(102))).balance, 3000);
  for (const value of [report(0), report(103, { reporterId: 8 }), report(103, { level: 'UNKNOWN' }), report(103, { reportedAt: 'bad' })]) {
    await assert.rejects(app.awardDeviceReportPoints(customer, value));
  }
});

test('roles and ownership prevent unauthorized issue, cancel, reward and use', async () => {
  const app = fixture();
  await assert.rejects(app.publishDevicePromotion(customer, restaurant, 1, '혜택', unrestricted(), 500));
  await assert.rejects(app.publishDevicePromotion(owner, { ...restaurant, ownerId: 7 }, 1, '혜택', unrestricted(), 500));
  const promotion = await app.publish(500);
  await assert.rejects(app.cancelDevicePromotion({ ...owner, id: 9 }, promotion.id));
  await assert.rejects(app.downloadDeviceCoupon(owner, promotion.id));
  await assert.rejects(app.awardDeviceReportPoints(owner, report()));
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  await assert.rejects(app.useDeviceCoupon({ ...customer, id: 3 }, coupon.id));
  await assert.rejects(app.useDeviceCoupon(owner, coupon.id));
});

test('cost is a positive safe 500-point multiple with no arbitrary 3000P cap', async () => {
  const app = fixture();
  for (const cost of [0, -500, 501, 500.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(app.publish(cost));
  assert.equal((await app.publish(4500)).pointsCost, 4500);
  assert.equal(app.model.validateCouponCost(500), null);
  await assert.rejects(app.publish(500, unrestricted(), 2, ' '.repeat(10)));
  await assert.rejects(app.publish(500, unrestricted(), 2, '가'.repeat(501)));
});

test('same active stage returns identical publication once but rejects changed conditions', async () => {
  const app = fixture();
  const first = await app.publish();
  assert.equal((await app.publish()).id, first.id);
  await assert.rejects(app.publish(1500));
  await app.cancelDevicePromotion(owner, first.id);
  const second = await app.publish(1500);
  assert.notEqual(second.id, first.id);
});

test('download subtracts cost once and expiry is exactly 72 elapsed hours', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  const first = await app.downloadDeviceCoupon(customer, promotion.id);
  const second = await app.downloadDeviceCoupon(customer, promotion.id);
  assert.equal(first.id, second.id);
  assert.equal(Date.parse(first.expiresAt) - Date.parse(first.downloadedAt), 72 * 60 * 60 * 1000);
  const wallet = (await app.readDeviceCouponState(customer)).wallet;
  assert.equal(wallet.balance, 500); assert.equal(wallet.coupons.length, 1); assert.equal(wallet.ledger.length, 2);
});

test('insufficient points cannot create a coupon or negative balance', async () => {
  const app = fixture();
  const promotion = await app.publish(1500);
  await app.readDeviceCouponState(customer);
  const old = app.files.get(app.statePath);
  await assert.rejects(app.downloadDeviceCoupon(customer, promotion.id), /포인트가 부족/);
  assert.equal(app.files.get(app.statePath), old);
});

test('download ignores weekly usage windows but use respects them', async () => {
  const app = fixture();
  const schedule = { ...unrestricted(), unrestrictedDays: false, unrestrictedTimes: false, days: [1], dailyRanges: { '1': [{ start: '12:00', end: '14:00' }] } };
  const promotion = await app.publish(500, schedule);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id); // Monday 10am KST
  assert.equal(app.model.couponStatus(coupon, app.now()), 'outside-hours');
  await assert.rejects(app.useDeviceCoupon(customer, coupon.id), /사용 요일/);
  app.setNow('2026-10-05T12:00:00+09:00');
  assert.equal((await app.useDeviceCoupon(customer, coupon.id)).usedAt, '2026-10-05T03:00:00.000Z');
});

test('cancelled publication blocks new download without invalidating held snapshot', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  await app.cancelDevicePromotion(owner, promotion.id);
  await assert.rejects(app.downloadDeviceCoupon({ ...customer, id: 3 }, promotion.id));
  assert.equal(app.model.couponStatus(coupon, app.now()), 'available');
  assert.ok((await app.useDeviceCoupon(customer, coupon.id)).usedAt);
  await assert.rejects(app.downloadDeviceCoupon(customer, promotion.id));
});

test('publication end date blocks new download, not an unexpired held coupon', async () => {
  const app = fixture();
  const promotion = await app.publish(500, { ...unrestricted(), noEndDate: false, endDate: '2026-10-05' });
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  app.setNow('2026-10-06T10:00:00+09:00');
  await assert.rejects(app.downloadDeviceCoupon({ ...customer, id: 3 }, promotion.id));
  assert.equal(app.model.couponStatus(coupon, app.now()), 'available');
  assert.ok((await app.useDeviceCoupon(customer, coupon.id)).usedAt);
});

test('expiry boundary prevents use and permits a new paid download if publication is active', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  app.setNow(Date.parse(coupon.expiresAt));
  assert.equal(app.model.couponStatus(coupon, app.now()), 'expired');
  await assert.rejects(app.useDeviceCoupon(customer, coupon.id), /기한/);
  const second = await app.downloadDeviceCoupon(customer, promotion.id);
  assert.notEqual(second.id, coupon.id);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 0);
});

test('used coupons cannot be reused but can be downloaded again with another payment', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  await app.useDeviceCoupon(customer, coupon.id);
  await assert.rejects(app.useDeviceCoupon(customer, coupon.id), /이미 사용/);
  const second = await app.downloadDeviceCoupon(customer, promotion.id);
  assert.notEqual(second.id, coupon.id);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 0);
});

test('coupons snapshot terms rather than sharing the caller schedule object', async () => {
  const app = fixture();
  const schedule = unrestricted();
  const promotion = await app.publish(500, schedule);
  schedule.noEndDate = false; schedule.endDate = '2020-01-01';
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  assert.equal(coupon.schedule.noEndDate, true);
  promotion.benefit = '외부 변경';
  assert.equal((await app.readDeviceCouponState(customer)).wallet.coupons[0].benefit, '음료 서비스');
});

test('concurrent initial reads, duplicate reward and duplicate downloads are serialized', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  await Promise.all(Array.from({ length: 5 }, () => app.readDeviceCouponState(customer)));
  const rewards = await Promise.all(Array.from({ length: 5 }, () => app.awardDeviceReportPoints(customer, report())));
  assert.equal(rewards.reduce((sum, value) => sum + value.awarded, 0), 1000);
  const coupons = await Promise.all(Array.from({ length: 8 }, () => app.downloadDeviceCoupon(customer, promotion.id)));
  assert.equal(new Set(coupons.map(value => value.id)).size, 1);
  const wallet = (await app.readDeviceCouponState(customer)).wallet;
  assert.equal(wallet.balance, 1500); assert.equal(wallet.ledger.length, 3);
});

test('corrupt storage is never interpreted as empty or overwritten', async () => {
  const app = fixture();
  for (const raw of ['{broken', '', 'null', '{"version":2}', '[]']) {
    app.files.set(app.statePath, raw);
    await assert.rejects(app.readDeviceCouponState(customer));
    await assert.rejects(app.publish());
    await assert.rejects(app.awardDeviceReportPoints(customer, report()));
    assert.equal(app.files.get(app.statePath), raw);
  }
});

test('balance or ledger tampering is treated as corruption', async () => {
  const app = fixture();
  await app.readDeviceCouponState(customer);
  const state = JSON.parse(app.files.get(app.statePath));
  state.wallets[app.model.deviceUserKey(customer)].balance += 1000;
  const raw = JSON.stringify(state);
  app.files.set(app.statePath, raw);
  await assert.rejects(app.readDeviceCouponState(customer));
  await assert.rejects(app.awardDeviceReportPoints(customer, report()));
  assert.equal(app.files.get(app.statePath), raw);
});

test('failed atomic publication rolls back coupon and charge, then queued retry succeeds', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  await app.readDeviceCouponState(customer);
  const before = app.files.get(app.statePath);
  app.failMove(true);
  await assert.rejects(app.downloadDeviceCoupon(customer, promotion.id));
  assert.equal(app.files.get(app.statePath), before); assert.equal(app.files.size, 1);
  app.failMove(false);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  assert.equal(coupon.id, 'coupon-1');
  assert.equal((await app.readDeviceCouponState(customer)).wallet.balance, 500);
});

test('failed write rolls back welcome points and report reward; retry grants each once', async () => {
  const app = fixture();
  app.failWrite(true);
  await assert.rejects(app.awardDeviceReportPoints(customer, report()));
  assert.equal(app.files.size, 0);
  app.failWrite(false);
  assert.equal((await app.awardDeviceReportPoints(customer, report())).balance, 2000);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.ledger.length, 2);
});

test('failed coupon-use save preserves the unused coupon', async () => {
  const app = fixture();
  const promotion = await app.publish(500);
  const coupon = await app.downloadDeviceCoupon(customer, promotion.id);
  app.failMove(true);
  await assert.rejects(app.useDeviceCoupon(customer, coupon.id));
  app.failMove(false);
  assert.equal((await app.readDeviceCouponState(customer)).wallet.coupons[0].usedAt, null);
  assert.ok((await app.useDeviceCoupon(customer, coupon.id)).usedAt);
});
