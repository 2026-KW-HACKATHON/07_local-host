const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports) {
  const exported = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports: exported, Date, require(name) {
    if (!(name in imports)) throw new Error(`Unexpected coupon UI dependency: ${name}`);
    return imports[name];
  } });
  return exported;
}
const scheduleModel = load('schedule.ts', {});
const model = load('model.ts', { './schedule': scheduleModel });
const now = Date.parse('2026-10-08T12:00:00+09:00');
const user = { id: 7, email: 'coupon-ui@example.invalid', nickname: '테스트손님', role: 'CUSTOMER' };
const schedule = { noEndDate: true, endDate: '', unrestrictedDays: true, unrestrictedTimes: true, days: [], dailyRanges: {}, commonRanges: [] };
const promotion = { id: 'promotion-1', ownerKey: '2|owner%40example.invalid', restaurantId: 5, restaurantName: '테스트식당', stage: 1, benefit: '음료 한 잔', schedule, pointsCost: 500, publishedAt: new Date(now - 60000).toISOString(), cancelledAt: null };
const coupon = { id: 'coupon-1', promotionId: promotion.id, restaurantId: 5, restaurantName: '테스트식당', stage: 1, benefit: '음료 한 잔', schedule, pointsCost: 500, downloadedAt: new Date(now - 60000).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), usedAt: null };
const wallet = (coupons = [], balance = 1000) => ({ balance, coupons, rewardedReportKeys: [], ledger: [] });
const nodes = value => !value || typeof value !== 'object' ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)];
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

function fixture(component, initialProps = {}, store = {}) {
  const states = [], refs = [];
  let stateIndex = 0, refIndex = 0;
  const calls = { downloads: 0, uses: 0, refreshes: 0 };
  const jsx = (type, props) => ({ type, props });
  const components = load('../components/CustomerCoupons.tsx', {
    react: {
      useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => states[i] = typeof value === 'function' ? value(states[i]) : value]; },
      useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    '../coupons/deviceStore': {
      downloadDeviceCoupon: async (account, id) => { calls.downloads++; assert.equal(account, user); assert.equal(id, promotion.id); return store.download ? store.download(account, id) : coupon; },
      useDeviceCoupon: async (account, id) => { calls.uses++; assert.equal(account, user); assert.equal(id, coupon.id); return store.use ? store.use(account, id) : { ...coupon, usedAt: new Date(now).toISOString() }; },
    },
    '../coupons/model': model,
    '../coupons/schedule': scheduleModel,
    './CustomerControls': { CustomerButton: 'CustomerButton' },
    './CustomerDialog': { CustomerDialog: 'CustomerDialog' },
    '../theme/customerTokens': { customerColors: {}, customerType: {} },
    '../theme/tokens': { px: value => value },
  });
  let props = { user, promotions: [promotion], wallet: wallet(), now, disabled: false, onChanged: async () => calls.refreshes++, ...initialProps };
  let tree;
  const render = () => { stateIndex = 0; refIndex = 0; tree = components[component](props); };
  render();
  const find = predicate => nodes(tree).find(predicate);
  return {
    calls, render, find,
    update(patch) { props = { ...props, ...patch }; render(); },
    button(label) { const button = find(node => node.type === 'CustomerButton' && node.props.children === label); assert.ok(button, `Missing button: ${label}`); return button.props; },
    dialog() { return find(node => node.type === 'CustomerDialog')?.props.value; },
    selectFilter(selected) { const tabs = nodes(tree).filter(node => node.props?.accessibilityRole === 'tab'); tabs[selected].props.onPress(); render(); },
    text() { return nodes(tree).filter(node => node.type === 'Text').flatMap(node => [node.props.children].flat(Infinity)).filter(value => typeof value === 'string').join('\n'); },
  };
}

test('download action is disabled for missing balance, insufficient points, or an owned coupon', () => {
  assert.equal(fixture('DownloadableCoupons', { wallet: null }).button('쿠폰 다운로드').disabled, true);
  assert.equal(fixture('DownloadableCoupons', { wallet: wallet([], 499) }).button('포인트가 부족해요').disabled, true);
  assert.equal(fixture('DownloadableCoupons', { wallet: wallet([coupon]) }).button('내 쿠폰함에 있어요').disabled, true);
  assert.equal(fixture('DownloadableCoupons', { disabled: true }).button('쿠폰 다운로드').disabled, true);
});

test('download requires confirmation and repeated confirmation does not double charge', async () => {
  const pending = deferred();
  const app = fixture('DownloadableCoupons', {}, { download: () => pending.promise });
  app.button('쿠폰 다운로드').onPress(); app.render();
  assert.equal(app.calls.downloads, 0);
  assert.match(app.dialog().message, /500P가 차감/);
  const confirm = app.dialog().onConfirm;
  confirm(); confirm(); app.render();
  assert.equal(app.calls.downloads, 1);
  assert.equal(app.button('받는 중…').disabled, true);
  pending.resolve(coupon); await settle(); app.render();
  assert.equal(app.calls.refreshes, 1);
  assert.equal(app.dialog().title, '쿠폰을 받았어요');
  app.update({ wallet: wallet([coupon], 500) });
  assert.equal(app.button('내 쿠폰함에 있어요').disabled, true);
});

test('a failed download does not show success or force a wallet refresh', async () => {
  const app = fixture('DownloadableCoupons', {}, { download: async () => { throw new Error('저장 실패'); } });
  app.button('쿠폰 다운로드').onPress(); app.render(); app.dialog().onConfirm(); await settle(); app.render();
  assert.equal(app.dialog().title, '쿠폰을 받지 못했어요');
  assert.equal(app.calls.refreshes, 0);
  assert.equal(app.button('쿠폰 다운로드').disabled, false);
});

test('cancelled or future promotions are absent while weekly use restrictions do not block downloading', () => {
  const hidden = [{ ...promotion, cancelledAt: new Date(now).toISOString() }, { ...promotion, id: 'promotion-2', publishedAt: new Date(now + 1).toISOString() }];
  const absent = fixture('DownloadableCoupons', { promotions: hidden });
  assert.equal(absent.find(node => node.type === 'CustomerButton'), undefined);
  assert.match(absent.text(), /발행 중인 쿠폰이 없어요/);
  const restricted = { ...promotion, schedule: { ...schedule, unrestrictedTimes: false, commonRanges: [{ start: '18:00', end: '20:00' }] } };
  assert.equal(fixture('DownloadableCoupons', { promotions: [restricted] }).button('쿠폰 다운로드').disabled, false);
});

test('wallet separates available/outside-hours from used/expired and prevents out-of-hours use', () => {
  const outside = { ...coupon, schedule: { ...schedule, unrestrictedTimes: false, commonRanges: [{ start: '18:00', end: '20:00' }] } };
  const expired = { ...coupon, id: 'coupon-2', expiresAt: new Date(now).toISOString() };
  const used = { ...coupon, id: 'coupon-3', usedAt: new Date(now - 1).toISOString() };
  const app = fixture('CustomerCouponWallet', { wallet: wallet([outside, expired, used]) });
  assert.match(app.text(), /사용 시간 아님/);
  assert.equal(app.button('지정된 요일·시간에 사용 가능').disabled, true);
  assert.doesNotMatch(app.text(), /기간 만료|사용 완료/);
  app.selectFilter(1);
  assert.match(app.text(), /기간 만료/); assert.match(app.text(), /사용 완료/);
  assert.equal(app.find(node => node.type === 'CustomerButton'), undefined);
});

test('use requires confirmation and repeated taps submit only once before moving to history', async () => {
  const pending = deferred();
  const app = fixture('CustomerCouponWallet', { wallet: wallet([coupon]) }, { use: () => pending.promise });
  app.button('사용하기').onPress(); app.render();
  assert.equal(app.calls.uses, 0); assert.match(app.dialog().message, /되돌릴 수 없어요/);
  const confirm = app.dialog().onConfirm;
  confirm(); confirm(); app.render();
  assert.equal(app.calls.uses, 1);
  assert.equal(app.button('처리 중…').disabled, true);
  const used = { ...coupon, usedAt: new Date(now).toISOString() };
  pending.resolve(used); await settle(); app.render();
  assert.equal(app.dialog().title, '사용 완료');
  app.update({ wallet: wallet([used]) });
  assert.match(app.text(), /받은 쿠폰이 없어요/);
  app.selectFilter(1); assert.match(app.text(), /사용 완료/);
});

test('point read failure is not presented as zero balance', () => {
  let reloads = 0;
  const app = fixture('CustomerPointBalance', { wallet: wallet([], 2500), error: '저장소 확인 필요', loading: false, onRefresh: () => reloads++ });
  assert.match(app.text(), /저장소 확인 필요/);
  assert.match(app.text(), /1P = 1원 혜택 기준/);
  assert.doesNotMatch(app.text(), /2,500P|0P/);
  app.button('다시 불러오기').onPress(); assert.equal(reloads, 1);
});

test('coupon UI uses the concise three-day expiry wording', () => {
  const app = fixture('DownloadableCoupons', {
    user: 'guest', promotions: [promotion], wallet: wallet([], 2500), now,
    disabled: false, onChanged: async () => {},
  });
  assert.match(app.text(), /유효기한: 다운 후 3일 이내/);
  assert.doesNotMatch(app.text(), /받은 후 3일|이 기기에서 발행한 쿠폰|거리 제한 없이 다운로드/);
});
