const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/../components/OwnerForms.tsx`, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const plain = value => JSON.parse(JSON.stringify(value));
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree,
  ...[tree.props?.children].flat(Infinity).flatMap(nodes)];

// Minimal state/event fixture: tests form handlers without native rendering or a backend.
// Layout and native interaction remain covered by the emulator QA workflow.
function fixture(component, initialProps) {
  const states = [];
  let index = 0;
  const exported = {};
  const jsx = (type, props) => ({ type, props });
  const requireMock = id => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (id === 'react') return { useState: initial => {
      const i = index++;
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    } };
    if (id === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } };
    if (id.endsWith('OwnerControls')) return { OwnerButton: 'OwnerButton', OwnerField: 'OwnerField' };
    if (id.endsWith('OwnerCalendar')) return { OwnerCalendar: 'OwnerCalendar', weekdays: ['일', '월', '화', '수', '목', '금', '토'] };
    if (id.endsWith('CustomerNaverSearch')) return { CustomerNaverSearch: 'CustomerNaverSearch' };
    if (id.endsWith('ownerTokens')) return { ownerColors: {}, ownerType: {} };
    if (id.endsWith('/tokens')) return { px: value => value };
    throw new Error(`Unexpected form dependency: ${id}`);
  };
  vm.runInNewContext(compiled, { exports: exported, require: requireMock, Date });
  let props = initialProps;
  let tree;
  const render = () => { index = 0; tree = exported[component](props); return tree; };
  const find = predicate => nodes(tree).find(predicate);
  render();
  return {
    render,
    find,
    all: predicate => nodes(tree).filter(predicate),
    updateProps: patch => { props = { ...props, ...patch }; render(); },
    button(label) {
      const button = find(node => node.type === 'OwnerButton' && node.props.children === label);
      assert.ok(button, `Missing button: ${label}`);
      return button.props;
    },
    field(label) {
      const field = find(node => node.type === 'OwnerField' && node.props.label === label);
      assert.ok(field, `Missing field: ${label}`);
      return field.props;
    },
    child(name) {
      const child = find(node => node.type?.name === name);
      assert.ok(child, `Missing child: ${name}`);
      return child.props;
    },
    selectStatus(label) {
      const option = find(node => node.props?.accessibilityRole === 'radio' && node.props.accessibilityLabel === label);
      assert.ok(option, `Missing status: ${label}`);
      option.props.onPress(); render();
    },
    selectDate(date) {
      const button = find(node => node.type === 'OwnerButton' && node.props.secondary);
      assert.ok(button, 'Missing calendar button');
      button.props.onPress(); render();
      find(node => node.type === 'OwnerCalendar').props.onSelect(date); render();
    },
    error() { return find(node => node.props?.accessibilityRole === 'alert')?.props.children; },
    save() { this.button('저장').onPress(); render(); },
  };
}

const draft = () => ({ perks: ['음료', '사리', '치즈볼'], closedDays: [0], notice: '기존 공지 보존', noticeDate: '2025-01-01' });
const restaurant = () => ({ id: 1, ownerId: 2, name: ' 원래 식당 ', address: ' 서울 원래 주소 ', openingTime: '10:00:00', closingTime: '21:00:00' });

test('ScheduleForm requires a real date and an explicitly selected business status', () => {
  const saved = [];
  const form = fixture('ScheduleForm', { draft: draft(), mode: 'notice', busy: false, restaurant: restaurant(), onSave: value => saved.push(value) });
  assert.equal(form.all(node => node.props?.accessibilityRole === 'radio').some(node => node.props.accessibilityState.checked), false);
  form.save(); assert.match(form.error(), /날짜/); assert.equal(saved.length, 0);
  form.selectDate('2026-02-30'); form.save(); assert.match(form.error(), /날짜/); assert.equal(saved.length, 0);
  form.selectDate('2026-10-09'); form.save(); assert.match(form.error(), /휴무 또는 영업/); assert.equal(saved.length, 0);
});

test('ScheduleForm validates hours and saves an overnight OPEN schedule without losing legacy fields', () => {
  const original = draft();
  let saved;
  const form = fixture('ScheduleForm', { draft: original, mode: 'notice', busy: false, restaurant: restaurant(), onSave: value => saved = value });
  form.selectDate('2026-10-09'); form.selectStatus('영업');
  assert.equal(form.child('HoursField').opening, '10:00');
  assert.equal(form.child('HoursField').closing, '21:00');
  for (const invalid of ['25:00', '9:00', '10:60', '']) {
    form.child('HoursField').onOpeningChange(invalid); form.render(); form.save();
    assert.match(form.error(), /시:분/); assert.equal(saved, undefined);
  }
  form.child('HoursField').onOpeningChange('18:00');
  form.child('HoursField').onClosingChange('02:00'); form.render(); form.save();
  assert.deepEqual(plain(saved), { ...original, businessChange: { date: '2026-10-09', status: 'OPEN', openingTime: '18:00', closingTime: '02:00' } });
  assert.equal(original.businessChange, undefined);
});

test('ScheduleForm CLOSED hides the time inputs and clears only businessChange times', () => {
  const original = { ...draft(), businessChange: { date: '2026-10-09', status: 'OPEN', openingTime: '18:00', closingTime: '02:00' } };
  let saved;
  const form = fixture('ScheduleForm', { draft: original, mode: 'notice', busy: false, onSave: value => saved = value });
  assert.equal(form.child('HoursField').opening, '18:00');
  form.selectStatus('휴무');
  assert.equal(form.find(node => node.type?.name === 'HoursField'), undefined);
  form.save();
  assert.deepEqual(plain(saved), { ...original, businessChange: { date: '2026-10-09', status: 'CLOSED', openingTime: '', closingTime: '' } });
});

test('ScheduleForm regular days save preserves business changes and old notices', () => {
  const original = { ...draft(), businessChange: { date: '2026-10-09', status: 'CLOSED', openingTime: '', closingTime: '' } };
  let saved;
  const form = fixture('ScheduleForm', { draft: original, mode: 'closed', busy: false, onSave: value => saved = value });
  form.child('ClosedDaysField').onChange([1, 3]); form.render(); form.save();
  assert.deepEqual(plain(saved), { ...original, closedDays: [1, 3] });
  assert.deepEqual(original.closedDays, [0]);
});

test('RestaurantForm location changes only the address, preserving times including null values', () => {
  for (const times of [{ openingTime: '10:00:37', closingTime: '21:00:49' }, { openingTime: null, closingTime: null }]) {
    const original = { ...restaurant(), ...times };
    let saved, days;
    const form = fixture('RestaurantForm', { restaurant: original, mode: 'location', closedDays: [2], busy: false, onSave: (value, closedDays) => { saved = value; days = closedDays; } });
    assert.equal(form.find(node => node.type?.name === 'HoursField'), undefined);
    assert.equal(form.find(node => node.type === 'OwnerField' && node.props.label === '식당 이름'), undefined);
    form.field('식당 검색').onChangeText('다른 검색 이름');
    form.field('식당 주소').onChangeText('  서울 새 주소  '); form.render(); form.save();
    assert.deepEqual(plain(saved), { name: original.name, address: '서울 새 주소', ...times });
    assert.deepEqual(plain(days), [2]);
  }
});

test('RestaurantForm hours changes only times, preserving exact stored name and address', () => {
  const original = restaurant();
  let saved;
  const form = fixture('RestaurantForm', { restaurant: original, mode: 'hours', busy: false, onSave: value => saved = value });
  assert.equal(form.all(node => node.type === 'OwnerField').length, 0);
  assert.equal(form.find(node => node.type === 'CustomerNaverSearch'), undefined);
  form.child('HoursField').onOpeningChange('08:30'); form.child('HoursField').onClosingChange('22:15'); form.render(); form.save();
  assert.deepEqual(plain(saved), { name: original.name, address: original.address, openingTime: '08:30:00', closingTime: '22:15:00' });
});

test('RestaurantForm location rejects empty addresses and opens Naver without overwriting the restaurant', () => {
  let saved;
  const form = fixture('RestaurantForm', { restaurant: restaurant(), mode: 'location', busy: false, onSave: value => saved = value });
  form.field('식당 주소').onChangeText('   '); form.render(); form.save();
  assert.match(form.error(), /주소/); assert.equal(saved, undefined);
  form.field('식당 검색').onChangeText(' 밥 & 면 '); form.render();
  form.button('네이버에서 식당 검색').onPress(); form.render();
  assert.equal(form.find(node => node.type === 'CustomerNaverSearch').props.query, '밥 & 면');
  assert.equal(saved, undefined);
});

test('ScheduleForm and RestaurantForm cannot submit again while busy', () => {
  for (const [component, props] of [
    ['ScheduleForm', { draft: draft(), mode: 'closed' }],
    ['RestaurantForm', { restaurant: restaurant(), mode: 'location' }],
  ]) {
    let count = 0;
    const form = fixture(component, { ...props, busy: true, onSave: () => count++ });
    assert.equal(form.button('저장 중...').disabled, true);
    form.button('저장 중...').onPress();
    assert.equal(count, 0);
  }
});

test('PerksForm saves all three trimmed benefits using the single 저장 action', () => {
  let saved;
  const form = fixture('PerksForm', { draft: draft(), busy: false, initial: true, onSave: value => saved = value });
  form.field('1단계').onChangeText('  음료 한 잔  ');
  form.field('3단계').onChangeText('  치즈볼  '); form.render(); form.save();
  assert.deepEqual(plain(saved), ['음료 한 잔', '사리', '치즈볼']);
});

test('obsolete draft labels and unrelated schedule fields are absent from form source', () => {
  for (const phrase of ['초안', '변경 내용', '입력 내용 비우기', '할인 프로모션 등록', '할인율 (%)']) assert.equal(source.includes(phrase), false, phrase);
  assert.equal(source.includes('export function DiscountForm'), false);
});
