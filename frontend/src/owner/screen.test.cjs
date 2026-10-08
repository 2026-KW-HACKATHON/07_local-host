const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const compiled = ts.transpileModule(fs.readFileSync(`${__dirname}/../screens/OwnerScreen.tsx`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const plain = value => JSON.parse(JSON.stringify(value));
const empty = () => ({ perks: ['', '', ''], activeStages: [false, false, false], closedDays: [], notice: '', noticeDate: '' });
const shop = { id: 5, ownerId: 2, name: '식당', address: '서울', openingTime: '10:00:00', closingTime: '21:00:00' };
const savedReport = { id: 20, restaurantId: 5, reporterId: 2, level: 'AVAILABLE', label: '여유', reportedAt: '2026-10-08T12:00:00' };
const schedule = () => ({ noEndDate: true, endDate: '', unrestrictedDays: true, unrestrictedTimes: true, days: [], dailyRanges: {}, commonRanges: [] });
const issued = () => ({ id: 'promotion-1', ownerKey: '2|owner%40example.test', restaurantId: 5, restaurantName: '식당', stage: 1, benefit: '음료',
  schedule: schedule(), pointsCost: 1000, publishedAt: '2026-10-08T00:00:00.000Z', cancelledAt: null });
const defaults = () => ({ ...empty(), perks: ['음료', '사리', '치즈볼'] });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const text = tree => nodes(tree).filter(node => node.type === 'Text').map(node => String(node.props?.children ?? '')).join(' ');
const deferred = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

/**
 * Minimal event/state fixture. Effects are not mounted: initial loading and
 * native lifecycle remain emulator coverage. Refresh is explicitly triggered
 * to deterministically test old-response races and mutation error handling.
 */
function fixture({ tab = 'report', page = 'main', draft = defaults(), selected = shop, level = null, description = '', couponPromotions = [], couponError = '', managedPromotions = [], api = {} } = {}) {
  const states = [tab, page, selected ? [selected] : [], selected?.id ?? null, [], draft, managedPromotions, '', level, description, null, false, false, '', 1];
  const refs = [];
  let stateIndex = 0, refIndex = 0;
  const calls = { create: 0, report: 0, writeDraft: 0, publish: [], cancel: [], couponRefresh: 0 };
  let storedPromotions = [...couponPromotions];
  const coupons = { promotions: [...couponPromotions], wallet: null, error: couponError, loading: false, now: Date.parse('2026-10-08T12:00:00Z') };
  const dependencies = {
    getRestaurants: async () => selected ? [selected] : [],
    createRestaurant: async value => { calls.create++; return { ...value, id: 5, ownerId: 2 }; },
    updateRestaurant: async (id, value) => ({ ...value, id, ownerId: 2 }),
    getManagedPromotions: async () => [],
    readOwnerDraft: async () => draft,
    writeOwnerDraft: async (_userId, _restaurantId, value) => { calls.writeDraft++; return value; },
    readOwnerReports: async () => [],
    writeOwnerReport: async () => {},
    reportCrowd: async () => { calls.report++; return savedReport; },
    publishDevicePromotion: async (_user, restaurant, stage, benefit, options, pointsCost) => {
      const promotion = { ...issued(), restaurantId: restaurant.id, stage, benefit, schedule: options, pointsCost };
      storedPromotions = [...storedPromotions, promotion]; return promotion;
    },
    cancelDevicePromotion: async (_user, id) => { storedPromotions = storedPromotions.map(p => p.id === id ? { ...p, cancelledAt: '2026-10-08T12:00:00.000Z' } : p); },
    refreshCoupons: async () => { coupons.promotions = [...storedPromotions]; },
    ...api,
  };
  coupons.refresh = async () => { calls.couponRefresh++; await dependencies.refreshCoupons(); };
  const jsx = (type, props) => ({ type, props });
  const req = id => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (id === 'react') return {
      useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef(value) { const i = refIndex++; return refs[i] ??= { current: value }; },
      useCallback: fn => fn,
      useEffect() {},
    };
    if (id === 'react-native') return {
      ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView', Pressable: 'Pressable', RefreshControl: 'RefreshControl', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
      Keyboard: { dismiss() {}, isVisible: () => false }, Platform: { OS: 'android' }, StyleSheet: { create: value => value }, BackHandler: {},
    };
    if (id.endsWith('AuthContext')) return { useAuth: () => ({ user: { id: 2, nickname: '점주', email: 'owner@example.test', role: 'OWNER' }, token: 'fixture-only', logout: async () => {} }) };
    if (id.endsWith('/restaurants') || id.endsWith('/crowd') || id.endsWith('/promotions')) return dependencies;
    if (id.endsWith('/customer/restaurantList')) return { isTemporaryPromotion: () => false };
    if (id.endsWith('/errorMessage')) return { getApiErrorMessage: error => error.message };
    if (id.endsWith('/drafts')) return { ...dependencies, emptyOwnerDraft: empty };
    if (id.endsWith('/reports')) return dependencies;
    if (id.endsWith('/analytics')) return { koreaObservationTime: value => Date.parse(value) };
    if (id.endsWith('useDeviceCoupons')) return { useDeviceCoupons: () => coupons };
    if (id.endsWith('coupons/deviceStore')) return {
      publishDevicePromotion: async (...args) => { calls.publish.push(args); return dependencies.publishDevicePromotion(...args); },
      cancelDevicePromotion: async (...args) => { calls.cancel.push(args); return dependencies.cancelDevicePromotion(...args); },
    };
    if (id.endsWith('coupons/model')) return {
      deviceUserKey: user => `${user.id}|${encodeURIComponent(user.email)}`,
      isPromotionDownloadable: promotion => promotion.cancelledAt === null,
    };
    if (id.endsWith('coupons/schedule')) return { scheduleSummary: () => '매일 · 시간 제한 없음' };
    if (id.endsWith('BrandAssets')) return { HeaderLogo: 'HeaderLogo' };
    if (id.endsWith('CustomerControls')) return { CrowdBadge: 'CrowdBadge', crowdLabels: { AVAILABLE: '여유', FEW_SEATS: '보통', LONG_WAIT: '혼잡' } };
    if (id.endsWith('CustomerDialog')) return { CustomerDialog: 'CustomerDialog' };
    if (id.endsWith('OwnerControls')) return Object.fromEntries(['OwnerBack', 'OwnerButton', 'OwnerField', 'OwnerInfoRow', 'OwnerNavigation'].map(name => [name, name]));
    if (id.endsWith('OwnerForms')) return Object.fromEntries(['PerksForm', 'RestaurantForm', 'ScheduleForm'].map(name => [name, name]));
    if (id.endsWith('OwnerAnalytics')) return { OwnerAnalytics: 'OwnerAnalytics' };
    if (id.endsWith('PromotionOptionsForm')) return { PromotionOptionsForm: 'PromotionOptionsForm' };
    if (id.endsWith('OwnerCalendar')) return { weekdays: ['일', '월', '화', '수', '목', '금', '토'] };
    if (id.endsWith('ownerTokens')) return { ownerColors: {}, ownerSpace: {}, ownerType: {} };
    if (id.endsWith('/tokens')) return { metrics: { canvasWidth: 390 }, px: value => value };
    throw new Error(`Unexpected OwnerScreen dependency: ${id}`);
  };
  const exported = {};
  vm.runInNewContext(compiled, { exports: exported, require: req, Date });
  let tree;
  const render = () => { stateIndex = 0; refIndex = 0; tree = exported.OwnerScreen({ onLogout() {} }); };
  render();
  const find = predicate => nodes(tree).find(predicate);
  return {
    states, calls, coupons, render, find, text: () => text(tree),
    child: type => find(node => node.type === type)?.props,
    button(label) { const result = find(node => node.type === 'OwnerButton' && node.props.children === label); assert.ok(result, `Missing action: ${label}`); return result.props; },
    buttons: label => nodes(tree).filter(node => node.type === 'OwnerButton' && node.props.children === label).map(node => node.props),
    refresh() { const control = find(node => node.type === 'ScrollView').props.refreshControl; assert.ok(control); control.props.onRefresh(); },
  };
}

test('owner stage action opens options for that stage without immediately publishing', () => {
  const form = fixture({ tab: 'promotion' });
  form.buttons('발행하기')[1].onPress(); form.render();
  assert.equal(form.states[1], 'publish');
  assert.equal(form.states[14], 2);
  assert.equal(form.child('PromotionOptionsForm').benefit, '사리');
  assert.equal(form.calls.publish.length, 0);
  assert.equal(form.calls.writeDraft, 0);
  assert.equal(form.child('PromotionOptionsForm').expiryDescription.includes('3일'), true);
});

test('temporary lunch promotion is hidden and empty state is shown', () => {
  const form = fixture({ managedPromotions: [{ id: 99, restaurantId: 5, title: '점심 10%할인', description: '임시 데이터', discountPercent: 10,
    startAt: '2026-01-01T00:00:00Z', endAt: '2090-01-01T00:00:00Z', enabled: true, active: true }] });
  const rendered = form.text();
  assert.doesNotMatch(rendered, /점심 10%할인/);
  assert.match(rendered, /진행 중인 프로모션이 없어요\./);
});

test('owner publication failure does not show a false published promotion', async () => {
  const form = fixture({ tab: 'promotion', api: { publishDevicePromotion: async () => { throw new Error('storage failed'); } } });
  form.button('발행하기').onPress(); form.render();
  form.child('PromotionOptionsForm').onSave(schedule(), 1500); await settle(); form.render();
  assert.equal(form.states[1], 'publish');
  assert.equal(form.calls.publish.length, 1);
  assert.equal(form.coupons.promotions.length, 0);
  assert.deepEqual(plain(form.states[5].activeStages), [false, false, false]);
  assert.equal(form.child('CustomerDialog').value.title, '처리하지 못했어요');
  assert.equal(form.states[12], false);
});

test('publication success shows stored stage and passes selected schedule and 500-step cost', async () => {
  const form = fixture({ tab: 'promotion' });
  form.buttons('발행하기')[2].onPress(); form.render();
  const options = schedule();
  form.child('PromotionOptionsForm').onSave(options, 3500); await settle(); form.render();
  assert.equal(form.states[1], 'main');
  assert.equal(form.states[0], 'promotion');
  assert.equal(form.calls.publish[0][2], 3);
  assert.equal(form.calls.publish[0][3], '치즈볼');
  assert.equal(form.calls.publish[0][5], 3500);
  assert.deepEqual(plain(form.calls.publish[0][4]), options);
  assert.equal(form.coupons.promotions[0].stage, 3);
  assert.equal(form.buttons('발행 취소').length, 1);
  assert.equal(form.calls.writeDraft, 0);
});

test('publication cancel requires confirmation and failure leaves published state intact', async () => {
  const form = fixture({ tab: 'promotion', couponPromotions: [issued()], api: { cancelDevicePromotion: async () => { throw new Error('disk full'); } } });
  form.button('발행 취소').onPress(); form.render();
  assert.equal(form.calls.cancel.length, 0);
  assert.equal(form.child('CustomerDialog').value.message.includes('이미 받은 쿠폰'), true);
  form.child('CustomerDialog').value.onConfirm(); await settle(); form.render();
  assert.equal(form.calls.cancel.length, 1);
  assert.equal(form.coupons.promotions[0].cancelledAt, null);
  assert.equal(form.buttons('발행 취소').length, 1);
  assert.equal(form.child('CustomerDialog').value.title, '처리하지 못했어요');
});

test('repeated publication callback while storage is pending publishes only once', async () => {
  const pending = deferred();
  const form = fixture({ tab: 'promotion', api: { publishDevicePromotion: () => pending.promise } });
  form.button('발행하기').onPress(); form.render();
  const save = form.child('PromotionOptionsForm').onSave;
  save(schedule(), 500); save(schedule(), 500); await settle();
  assert.equal(form.calls.publish.length, 1);
  pending.resolve(issued()); await settle(); form.render();
  assert.equal(form.states[12], false);
});

test('server-accepted report with local storage failure is not left on the resubmit form', async () => {
  const form = fixture({ page: 'submit', level: 'AVAILABLE', description: ' 대기 없음 ', api: { writeOwnerReport: async () => { throw new Error('disk full'); } } });
  form.button('완료').onPress(); form.render();
  form.child('CustomerDialog').value.onConfirm(); await settle(); form.render();
  assert.equal(form.calls.report, 1);
  assert.equal(form.states[1], 'main');
  assert.equal(form.states[8], null);
  assert.equal(form.states[9], '');
  assert.equal(form.states[6][0].description, '대기 없음');
  assert.equal(form.child('CustomerDialog').value.title, '혼잡도는 전송됐어요');
  assert.equal(form.find(node => node.type === 'OwnerField'), undefined);
});

test('new restaurant creation does not remain retryable after only the local schedule write fails', async () => {
  const form = fixture({ page: 'create', selected: null, draft: null, api: { writeOwnerDraft: async () => { throw new Error('storage failed'); } } });
  form.child('RestaurantForm').onSave(shop, [0]); await settle(); form.render();
  assert.equal(form.calls.create, 1);
  assert.equal(form.states[3], 5);
  assert.equal(form.states[1], 'main');
  assert.equal(form.states[0], 'my');
  assert.equal(form.child('RestaurantForm'), undefined);
  assert.equal(form.child('CustomerDialog').value.title, '식당은 등록됐어요');
});

test('new restaurant selection waits for initial schedule storage before allowing automatic refresh', async () => {
  const pending = deferred();
  const form = fixture({ page: 'create', selected: null, draft: null, api: { writeOwnerDraft: () => pending.promise } });
  form.child('RestaurantForm').onSave(shop, [1, 3]); await settle(); form.render();
  assert.equal(form.states[3], null);
  assert.equal(form.states[12], true);
  pending.resolve({ ...empty(), closedDays: [1, 3] }); await settle(); form.render();
  assert.equal(form.states[3], 5);
  assert.equal(form.states[1], 'setupPerks');
  assert.deepEqual(plain(form.states[5].closedDays), [1, 3]);
});

test('late refresh data cannot overwrite changed benefits saved after refresh started', async () => {
  const pendingDraft = deferred();
  const form = fixture({ tab: 'promotion', api: { readOwnerDraft: () => pendingDraft.promise } });
  form.refresh(); await settle(); form.render();
  form.find(node => node.props?.accessibilityLabel === '프로모션 수정').props.onPress(); form.render();
  form.child('PerksForm').onSave(['추가 음료', '사리', '치즈볼']); await settle(); form.render();
  assert.equal(form.states[5].perks[0], '추가 음료');
  pendingDraft.resolve(defaults()); await settle(); form.render();
  assert.equal(form.states[5].perks[0], '추가 음료');
  assert.equal(form.states[11], false);
});

test('repeated report confirmation while the first request is pending sends only once', async () => {
  const pending = deferred();
  let count = 0;
  const form = fixture({ page: 'submit', level: 'AVAILABLE', api: { reportCrowd: () => { count++; return pending.promise; } } });
  form.button('완료').onPress(); form.render();
  const confirm = form.child('CustomerDialog').value.onConfirm;
  confirm(); confirm(); await settle();
  assert.equal(count, 1);
  pending.resolve(savedReport); await settle(); form.render();
  assert.equal(form.states[1], 'main');
  assert.equal(form.states[12], false);
});
