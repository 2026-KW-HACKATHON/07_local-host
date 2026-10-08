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
const defaults = () => ({ ...empty(), perks: ['음료', '사리', '치즈볼'] });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const deferred = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

/**
 * Minimal event/state fixture. Effects are not mounted: initial loading and
 * native lifecycle remain emulator coverage. Refresh is explicitly triggered
 * to deterministically test old-response races and mutation error handling.
 */
function fixture({ tab = 'report', page = 'main', draft = defaults(), selected = shop, level = null, description = '', api = {} } = {}) {
  const states = [tab, page, selected ? [selected] : [], selected?.id ?? null, [], draft, [], '', level, description, null, false, false, ''];
  const refs = [];
  let stateIndex = 0, refIndex = 0;
  const calls = { create: 0, report: 0, writeDraft: 0 };
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
    ...api,
  };
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
    if (id.endsWith('AuthContext')) return { useAuth: () => ({ user: { id: 2, nickname: '점주', email: 'owner@example.test' }, token: 'fixture-only', logout: async () => {} }) };
    if (id.endsWith('/restaurants') || id.endsWith('/crowd') || id.endsWith('/promotions')) return dependencies;
    if (id.endsWith('/errorMessage')) return { getApiErrorMessage: error => error.message };
    if (id.endsWith('/drafts')) return { ...dependencies, emptyOwnerDraft: empty };
    if (id.endsWith('/reports')) return dependencies;
    if (id.endsWith('/analytics')) return { koreaObservationTime: value => Date.parse(value) };
    if (id.endsWith('BrandAssets')) return { HeaderLogo: 'HeaderLogo' };
    if (id.endsWith('CustomerControls')) return { CrowdBadge: 'CrowdBadge', crowdLabels: { AVAILABLE: '여유', FEW_SEATS: '보통', LONG_WAIT: '혼잡' } };
    if (id.endsWith('CustomerDialog')) return { CustomerDialog: 'CustomerDialog' };
    if (id.endsWith('OwnerControls')) return Object.fromEntries(['OwnerBack', 'OwnerButton', 'OwnerField', 'OwnerInfoRow', 'OwnerNavigation'].map(name => [name, name]));
    if (id.endsWith('OwnerForms')) return Object.fromEntries(['PerksForm', 'RestaurantForm', 'ScheduleForm'].map(name => [name, name]));
    if (id.endsWith('OwnerAnalytics')) return { OwnerAnalytics: 'OwnerAnalytics' };
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
    states, calls, render, find,
    child: type => find(node => node.type === type)?.props,
    button(label) { const result = find(node => node.type === 'OwnerButton' && node.props.children === label); assert.ok(result, `Missing action: ${label}`); return result.props; },
    refresh() { const control = find(node => node.type === 'ScrollView').props.refreshControl; assert.ok(control); control.props.onRefresh(); },
  };
}

test('owner stage storage failure does not show a false running promotion', async () => {
  const form = fixture({ tab: 'promotion', api: { writeOwnerDraft: async () => { throw new Error('storage failed'); } } });
  form.button('프로모션 진행하기').onPress(); await settle(); form.render();
  assert.deepEqual(plain(form.states[5].activeStages), [false, false, false]);
  assert.equal(form.child('CustomerDialog').value.title, '처리하지 못했어요');
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

test('late refresh data cannot overwrite a promotion mutation saved after refresh started', async () => {
  const pendingDraft = deferred();
  const form = fixture({ tab: 'promotion', api: { readOwnerDraft: () => pendingDraft.promise } });
  form.refresh(); await settle(); form.render();
  form.button('프로모션 진행하기').onPress(); await settle(); form.render();
  assert.equal(form.states[5].activeStages[0], true);
  pendingDraft.resolve(defaults()); await settle(); form.render();
  assert.equal(form.states[5].activeStages[0], true);
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
