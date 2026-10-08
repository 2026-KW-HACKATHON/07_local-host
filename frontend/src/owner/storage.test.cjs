// Storage mocks only. No real app account or device data is read or modified.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(`${__dirname}/${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Date, require(name) {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return module.exports;
}
const model = load('draftModel');
const analytics = load('analytics');
const reportModel = load('reportModel', { './draftModel': model, './analytics': analytics });
const legacy = () => ({ perks: ['음료', '사리', ''], closedDays: [1, 5], notice: '기존 공지', noticeDate: '2026-10-09' });
const json = value => JSON.parse(JSON.stringify(value));

function draftFixture() {
  const records = new Map();
  let failWrite = false;
  const service = load('drafts', {
    'expo-secure-store': {
      getItemAsync: async key => records.get(key) ?? null,
      setItemAsync: async (key, value) => { if (failWrite) throw new Error('write failure'); records.set(key, value); },
    },
    '../config/api': { API_BASE_URL: 'https://example.invalid' }, './draftModel': model,
  });
  const key = (user = 1, restaurant = 2) => `bapjul.owner.draft.v1.${model.ownerServerKey('https://example.invalid')}.${user}.${restaurant}`;
  return { ...service, records, key, failWrite: () => { failWrite = true; } };
}

test('legacy settings migrate on read without rewriting or losing text/days', async () => {
  const app = draftFixture();
  app.records.set(app.key(), JSON.stringify(legacy()));
  const saved = await app.readOwnerDraft(1, 2);
  assert.deepEqual(json(saved), { ...legacy(), activeStages: [false, false, false] });
  assert.deepEqual(JSON.parse(app.records.get(app.key())), legacy());
});

test('blank stage benefits can never remain active and original text is preserved', () => {
  const normalized = model.normalizeOwnerDraft({ ...legacy(), perks: ['  음료  ', '  ', ''], activeStages: [true, true, true] });
  assert.deepEqual(json(normalized.activeStages), [true, false, false]);
  assert.deepEqual(json(normalized.perks), ['  음료  ', '  ', '']);
});

test('saving returns normalized settings, uses existing key and separates owner/restaurant/server', async () => {
  const app = draftFixture();
  const saved = await app.writeOwnerDraft(1, 2, { ...legacy(), activeStages: [true, false, true] });
  assert.deepEqual(json(saved.activeStages), [true, false, false]);
  assert.equal(app.records.has(app.key()), true);
  assert.deepEqual(json((await app.readOwnerDraft(2, 2)).perks), ['', '', '']);
  assert.deepEqual(json((await app.readOwnerDraft(1, 3)).perks), ['', '', '']);
  assert.notEqual(model.ownerServerKey('https://a.invalid'), model.ownerServerKey('https://b.invalid'));
});

test('business changes preserve both the new fields and previous free-form notice', async () => {
  const app = draftFixture();
  const value = { ...legacy(), activeStages: [false, false, false], futureField: { keep: true },
    businessChange: { date: '2026-10-10', status: 'OPEN', openingTime: '10:00', closingTime: '22:00:30' } };
  await app.writeOwnerDraft(1, 2, value);
  assert.deepEqual(json(await app.readOwnerDraft(1, 2)), value);
  assert.doesNotThrow(() => model.normalizeOwnerDraft({ ...value, businessChange: { date: '2026-10-10', status: 'CLOSED', openingTime: '', closingTime: '' } }));
});

test('invalid business dates, status, open hours and malformed stages are rejected', () => {
  const change = { date: '2026-10-10', status: 'OPEN', openingTime: '10:00', closingTime: '22:00' };
  for (const update of [{ date: '2026-02-30' }, { status: 'MAYBE' }, { openingTime: '' }, { closingTime: '24:00' }]) {
    assert.throws(() => model.normalizeOwnerDraft({ ...legacy(), businessChange: { ...change, ...update } }));
  }
  for (const activeStages of [null, [true], [true, false, 'false']]) assert.throws(() => model.normalizeOwnerDraft({ ...legacy(), activeStages }));
});

test('corrupt settings never become empty and cannot be overwritten', async () => {
  const app = draftFixture();
  for (const raw of ['{broken', '', 'null', JSON.stringify({ ...legacy(), closedDays: [7] })]) {
    app.records.set(app.key(), raw);
    await assert.rejects(app.readOwnerDraft(1, 2));
    await assert.rejects(app.writeOwnerDraft(1, 2, model.emptyOwnerDraft()));
    assert.equal(app.records.get(app.key()), raw);
  }
});

test('failed settings save preserves the old record', async () => {
  const app = draftFixture();
  app.records.set(app.key(), JSON.stringify(legacy()));
  app.failWrite();
  await assert.rejects(app.writeOwnerDraft(1, 2, model.emptyOwnerDraft()));
  assert.deepEqual(JSON.parse(app.records.get(app.key())), legacy());
});

const report = (id = 7, changes = {}) => ({ id, restaurantId: 2, reporterId: 1, level: 'AVAILABLE', label: '바로 앉아요', reportedAt: '2026-10-08T12:00:00.123456789', description: '창가석 가능', ...changes });
function reportFixture() {
  const files = new Map();
  const dirs = new Set();
  let failMove = false;
  const uri = parts => parts.map(value => typeof value === 'string' ? value : value.uri).map((value, index) => index ? value.replace(/^\/+|\/+$/g, '') : value.replace(/\/$/, '')).join('/');
  class Directory {
    constructor(...parts) { this.uri = uri(parts); }
    get exists() { return dirs.has(this.uri) || [...files.keys()].some(key => key.startsWith(`${this.uri}/`)); }
    get name() { return this.uri.split('/').at(-1); }
    create() { dirs.add(this.uri); }
    list() { return [...files.keys()].filter(key => key.startsWith(`${this.uri}/`) && !key.slice(this.uri.length + 1).includes('/')).map(key => new File(key)); }
  }
  class File {
    constructor(...parts) { this.uri = uri(parts); }
    get name() { return this.uri.split('/').at(-1); }
    get exists() { return files.has(this.uri); }
    async text() { if (!this.exists) throw new Error('missing'); return files.get(this.uri); }
    write(value) { files.set(this.uri, value); }
    async move(target, options) {
      if (failMove) throw new Error('move failed');
      if (files.has(target.uri) && !options?.overwrite) throw new Error('exists');
      files.set(target.uri, files.get(this.uri)); files.delete(this.uri); this.uri = target.uri;
    }
    delete() { files.delete(this.uri); }
  }
  const serviceFor = server => load('reports', { 'expo-file-system': { Directory, File, Paths: { document: new Directory('file:///documents') } },
    '../config/api': { API_BASE_URL: server }, './draftModel': model, './analytics': analytics, './reportModel': reportModel });
  const service = serviceFor('https://example.invalid');
  const scope = `file:///documents/owner-reports/${model.ownerServerKey('https://example.invalid')}/1/2`;
  return { ...service, files, scope, serviceFor, failMove: () => { failMove = true; } };
}

test('reports persist in individual numeric-id files and survive rereads', async () => {
  const app = reportFixture();
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), []);
  await app.writeOwnerReport(1, 2, report());
  assert.equal(app.files.size, 1);
  assert.equal(app.files.has(`${app.scope}/7.json`), true);
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), [report()]);
});

test('report storage separates server, owner and restaurant', async () => {
  const app = reportFixture();
  await app.writeOwnerReport(1, 2, report());
  assert.deepEqual(json(await app.readOwnerReports(2, 2)), []);
  assert.deepEqual(json(await app.readOwnerReports(1, 3)), []);
  assert.deepEqual(json(await app.serviceFor('https://other.invalid').readOwnerReports(1, 2)), []);
});

test('report list is newest first and repeat save changes description without duplicating', async () => {
  const app = reportFixture();
  await app.writeOwnerReport(1, 2, report(7));
  await app.writeOwnerReport(1, 2, report(8, { reportedAt: '2026-10-08T14:00:00' }));
  await app.writeOwnerReport(1, 2, report(7, { description: '설명 수정' }));
  const read = await app.readOwnerReports(1, 2);
  assert.deepEqual(json(read.map(value => value.id)), [8, 7]);
  assert.equal(read[1].description, '설명 수정');
  assert.equal(app.files.size, 2);
});

test('invalid report identity, date, level and long description cannot be stored', async () => {
  const app = reportFixture();
  for (const changes of [{ id: '../7' }, { id: 0 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { reporterId: 2 }, { restaurantId: 3 }, { level: 'UNKNOWN' }, { description: '가'.repeat(201) }, { reportedAt: '2026-02-30T12:00:00' }]) {
    await assert.rejects(app.writeOwnerReport(1, 2, report(7, changes)));
  }
  await assert.rejects(app.readOwnerReports(-1, 2));
  await assert.rejects(app.writeOwnerReport(1, 0, report()));
  assert.equal(app.files.size, 0);
});

test('corrupt report files fail both read and write without overwriting', async () => {
  const app = reportFixture();
  app.files.set(`${app.scope}/7.json`, '{broken');
  await assert.rejects(app.readOwnerReports(1, 2));
  await assert.rejects(app.writeOwnerReport(1, 2, report()));
  assert.equal(app.files.get(`${app.scope}/7.json`), '{broken');
});

test('filename/identity mismatch and cross-owner contents are corruption', async () => {
  const app = reportFixture();
  for (const value of [report(8), report(7, { reporterId: 2 }), report(7, { restaurantId: 3 })]) {
    app.files.set(`${app.scope}/7.json`, JSON.stringify(value));
    await assert.rejects(app.readOwnerReports(1, 2));
  }
});

test('upsert cannot replace a saved server response with different immutable fields', async () => {
  const app = reportFixture();
  await app.writeOwnerReport(1, 2, report());
  await assert.rejects(app.writeOwnerReport(1, 2, report(7, { level: 'LONG_WAIT' })));
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), [report()]);
});

test('failed publication preserves the old report and removes only temporary new contents', async () => {
  const app = reportFixture();
  await app.writeOwnerReport(1, 2, report());
  app.failMove();
  await assert.rejects(app.writeOwnerReport(1, 2, report(7, { description: '새 설명' })));
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), [report()]);
  assert.equal(app.files.size, 1);
});

test('orphaned unpublished temporary files do not become report entries', async () => {
  const app = reportFixture();
  app.files.set(`${app.scope}/.7.123-1.tmp`, '{incomplete');
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), []);
  await app.writeOwnerReport(1, 2, report());
  assert.deepEqual(json(await app.readOwnerReports(1, 2)), [report()]);
});
