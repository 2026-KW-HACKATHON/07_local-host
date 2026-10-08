const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const transpile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const scheduleExports = {};
vm.runInNewContext(transpile(`${__dirname}/schedule.ts`), { exports: scheduleExports, Date });
const compiled = transpile(`${__dirname}/../components/PromotionOptionsForm.tsx`);
const plain = value => JSON.parse(JSON.stringify(value));
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const unrestricted = () => ({ noEndDate: true, endDate: '', unrestrictedDays: true, unrestrictedTimes: true,
  days: [], dailyRanges: {}, commonRanges: [] });

/** Event/state tests execute the real form and its stateless option/range components.
 * Native layout, date modal gestures, and nested scrolling remain emulator coverage.
 */
function fixture(props = {}) {
  const states = [];
  const saved = [];
  let cursor = 0, tree;
  const jsx = (type, properties) => typeof type === 'function' ? type(properties) : { type, props: properties };
  const req = id => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (id === 'react') return { useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    } };
    if (id === 'react-native') return { Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value } };
    if (id.endsWith('OwnerControls')) return { OwnerButton: 'OwnerButton', OwnerField: 'OwnerField' };
    if (id.endsWith('OwnerCalendar')) return { OwnerCalendar: 'OwnerCalendar', weekdays: ['일', '월', '화', '수', '목', '금', '토'] };
    if (id.endsWith('/schedule')) return scheduleExports;
    if (id.endsWith('ownerTokens')) return { ownerColors: {}, ownerType: {} };
    if (id.endsWith('/tokens')) return { px: value => value };
    throw new Error(`Unexpected form dependency: ${id}`);
  };
  const exported = {};
  vm.runInNewContext(compiled, { exports: exported, require: req, Date });
  const input = { benefit: '음료 서비스', busy: false, onSave: (schedule, points) => saved.push({ schedule, points }), ...props };
  const render = () => { cursor = 0; tree = exported.PromotionOptionsForm(input); };
  const find = predicate => nodes(tree).find(predicate);
  const button = label => { const node = find(value => value.type === 'OwnerButton' && value.props.children === label); assert.ok(node, `Missing action ${label}`); return node.props; };
  const field = label => { const node = find(value => value.type === 'OwnerField' && (value.props.accessibilityLabel ?? value.props.label) === label); assert.ok(node, `Missing field ${label}`); return node.props; };
  const accessible = label => { const node = find(value => value.props?.accessibilityLabel === label); assert.ok(node, `Missing accessible control ${label}`); return node.props; };
  render();
  return {
    states, saved, input, render, find, button, field, accessible,
    press(label) { const action = accessible(label); assert.equal(Boolean(action.disabled), false); action.onPress(); render(); },
    edit(label, value) { const control = field(label); assert.notEqual(control.editable, false); control.onChangeText(value); render(); },
    save() { button('발행하기').onPress(); render(); },
    error() { return find(node => node.props?.accessibilityRole === 'alert')?.props.children ?? ''; },
  };
}

test('fresh form leaves points, publication end and recurring conditions unselected', () => {
  const form = fixture();
  assert.equal(form.field('직접 입력 (500P 단위)').value, '');
  for (const label of ['유효기간 없음', '요일 제한 없음', '시간 제한 없음', '월요일 적용']) {
    assert.equal(form.accessible(label).accessibilityState.checked, false);
  }
  form.save();
  assert.equal(form.saved.length, 0);
  assert.equal(form.error(), '프로모션 발행 종료일을 선택해 주세요.');
});

test('explicit end/day/time choices are all required before publishing', () => {
  const form = fixture();
  form.press('유효기간 없음'); form.save();
  assert.equal(form.error().includes('요일'), true);
  form.press('월요일 적용'); form.save();
  assert.equal(form.error().includes('시작·종료'), true);
  form.edit('월요일 시작 1', '10:00'); form.edit('월요일 종료 1', '12:00'); form.save();
  assert.equal(form.error().includes('500P'), true);
  form.edit('직접 입력 (500P 단위)', '1500'); form.save();
  assert.equal(form.saved.length, 1);
  assert.equal(form.saved[0].points, 1500);
  assert.deepEqual(plain(form.saved[0].schedule.days), [1]);
});

test('points picker is scrollable and selection uses a 500-point preset without auto publishing', () => {
  const form = fixture({ initial: unrestricted() });
  form.press('교환 포인트 선택');
  assert.equal(form.find(node => node.type === 'ScrollView').props.nestedScrollEnabled, true);
  form.press('2500 포인트');
  assert.equal(form.field('직접 입력 (500P 단위)').value, '2500');
  assert.equal(form.accessible('교환 포인트 선택').accessibilityState.expanded, false);
  assert.equal(form.saved.length, 0);
  form.save();
  assert.equal(form.saved[0].points, 2500);
});

test('manual point cost accepts larger 500 multiples without a preset maximum', () => {
  for (const points of ['500', '3500', '5500', '12500', '100000']) {
    const form = fixture({ initial: unrestricted() });
    form.edit('직접 입력 (500P 단위)', points); form.save();
    assert.equal(form.saved[0]?.points, Number(points));
  }
});

test('manual point cost rejects empty, zero, negative, fractions, other increments and unsafe integers', () => {
  for (const points of ['', '0', '-500', '100', '750', '1000.5', '1e3', ' 1000 ', '9007199254741000']) {
    const form = fixture({ initial: unrestricted() });
    form.edit('직접 입력 (500P 단위)', points); form.save();
    assert.equal(form.saved.length, 0, `Unexpectedly accepted ${points}`);
    assert.equal(form.error().includes('500P'), true);
  }
});

test('disabling end date, days and times preserves previous field selections', () => {
  const initial = { noEndDate: false, endDate: '2099-12-31', unrestrictedDays: false, unrestrictedTimes: false,
    days: [1], dailyRanges: { 1: [{ start: '10:00', end: '12:00' }] }, commonRanges: [{ start: '14:00', end: '15:00' }] };
  const form = fixture({ initial, initialPointsCost: 1000 });
  form.press('유효기간 없음');
  assert.equal(form.button('2099-12-31').disabled, true);
  form.press('요일 제한 없음');
  assert.equal(form.accessible('월요일 적용').disabled, true);
  assert.equal(form.field('매일 적용하는 시간 시작 1').value, '14:00');
  form.press('시간 제한 없음');
  assert.equal(form.field('매일 적용하는 시간 시작 1').editable, false);
  assert.equal(form.button('+ 시간 구간 추가').disabled, true);
  form.save();
  assert.equal(form.saved[0].schedule.endDate, '2099-12-31');
  assert.deepEqual(plain(form.saved[0].schedule.days), [1]);
  form.press('시간 제한 없음'); form.press('요일 제한 없음'); form.press('유효기간 없음');
  assert.equal(form.field('월요일 시작 1').value, '10:00');
  assert.equal(form.field('월요일 종료 1').value, '12:00');
  assert.equal(form.button('2099-12-31').disabled, false);
  assert.equal(initial.noEndDate, false);
  assert.equal(initial.unrestrictedDays, false);
});

test('day deselection and re-selection restore its saved ranges', () => {
  const form = fixture();
  form.press('월요일 적용');
  form.edit('월요일 시작 1', '22:00'); form.edit('월요일 종료 1', '02:00');
  assert.ok(form.find(node => node.type === 'Text' && Array.isArray(node.props.children) && node.props.children.includes('다음 날 ')));
  form.press('월요일 적용'); form.press('월요일 적용');
  assert.equal(form.field('월요일 시작 1').value, '22:00');
  assert.equal(form.field('월요일 종료 1').value, '02:00');
});

test('ranges can be added and deleted, and the real schedule validator blocks overlaps', () => {
  const form = fixture({ initial: { ...unrestricted(), unrestrictedDays: false, unrestrictedTimes: false, days: [1], dailyRanges: { 1: [{ start: '10:00', end: '12:00' }] } }, initialPointsCost: 1000 });
  form.button('+ 시간 구간 추가').onPress(); form.render();
  form.edit('월요일 시작 2', '11:00'); form.edit('월요일 종료 2', '13:00'); form.save();
  assert.equal(form.saved.length, 0);
  assert.equal(form.error().includes('겹쳐요'), true);
  form.press('월요일 2번 시간 구간 삭제'); form.save();
  assert.equal(form.saved.length, 1);
  assert.equal(form.saved[0].schedule.dailyRanges[1].length, 1);
});

test('calendar selection supplies publication end without changing coupon lifetime wording', () => {
  const description = '프로모션 게시 기간과 별개로, 손님 쿠폰은 다운로드 후 3일 동안 유효해요.';
  const form = fixture({ initial: { ...unrestricted(), noEndDate: false }, initialPointsCost: 500, expiryDescription: description });
  form.button('종료일 선택').onPress(); form.render();
  const calendar = form.find(node => node.type === 'OwnerCalendar').props;
  calendar.onSelect('2099-12-31'); calendar.onClose(); form.render(); form.save();
  assert.equal(form.saved[0].schedule.endDate, '2099-12-31');
  assert.ok(form.find(node => node.type === 'Text' && node.props.children === description));
});

test('busy form disables editing and prevents the submit callback', () => {
  const form = fixture({ initial: unrestricted(), initialPointsCost: 1000, busy: true });
  assert.equal(form.field('직접 입력 (500P 단위)').editable, false);
  for (const label of ['유효기간 없음', '요일 제한 없음', '시간 제한 없음', '교환 포인트 선택']) {
    assert.equal(form.accessible(label).disabled, true);
  }
  assert.equal(form.button('발행 중...').disabled, true);
  form.button('발행 중...').onPress();
  assert.equal(form.saved.length, 0);
});

test('successful callback receives a detached copy of the editable schedule', () => {
  const initial = unrestricted();
  const form = fixture({ initial, initialPointsCost: 1000 });
  form.save();
  form.saved[0].schedule.days.push(1);
  assert.equal(initial.days.length, 0);
  form.save();
  assert.equal(form.saved[1].schedule.days.length, 0);
});
