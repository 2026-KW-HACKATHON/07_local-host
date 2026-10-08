// Run with: node --test src/profile/localProfile.test.cjs
// Storage is simulated; this test never reads or changes a real app account.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTypeScript(file, imports) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require(name) {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return module.exports;
}

const model = loadTypeScript('profileModel.ts', {});
const user = { id: 11, email: 'profile-test@example.invalid', nickname: '원래이름', role: 'CUSTOMER' };

function fixture() {
  const files = new Map();
  const records = new Map();
  let failWrite = false;
  const uri = (...parts) => parts.map(value => typeof value === 'string' ? value : value.uri)
    .map((value, index) => index === 0 ? value.replace(/\/$/, '') : value.replace(/^\/+|\/+$/g, '')).join('/');
  class Directory {
    constructor(...parts) { this.uri = uri(...parts); }
    create() {}
  }
  class File {
    constructor(...parts) { this.uri = uri(...parts); }
    get name() { return this.uri.split('/').at(-1); }
    get extension() { return path.extname(this.name); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.size ?? 0; }
    delete() { files.delete(this.uri); }
    copy(target) { files.set(target.uri, { ...files.get(this.uri) }); }
  }
  const service = loadTypeScript('localProfile.ts', {
    'expo-file-system': { Directory, File, Paths: { document: new Directory('file:///app/documents') } },
    'expo-secure-store': {
      getItemAsync: async key => records.get(key) ?? null,
      setItemAsync: async (key, value) => { if (failWrite) throw new Error('storage unavailable'); records.set(key, value); },
    },
    '../config/api': { API_BASE_URL: 'https://example.invalid' },
    './profileModel': model,
  });
  return { ...service, files, records, failWrite: () => { failWrite = true; } };
}

test('nickname boundaries and control characters are validated', () => {
  assert.ok(model.validateProfileNickname(' 가 '));
  assert.ok(model.validateProfileNickname('가'.repeat(31)));
  assert.ok(model.validateProfileNickname('손님\n이름'));
  assert.equal(model.validateProfileNickname('  새이름  '), null);
  assert.equal(model.validateProfileNickname('가'.repeat(30)), null);
});

test('scope separates users, email identities and API servers', () => {
  const key = model.profileScope('https://a.invalid', 1, 'a@example.invalid');
  assert.notEqual(key, model.profileScope('https://a.invalid', 2, 'a@example.invalid'));
  assert.notEqual(key, model.profileScope('https://a.invalid', 1, 'b@example.invalid'));
  assert.notEqual(key, model.profileScope('https://b.invalid', 1, 'a@example.invalid'));
  assert.equal(key, model.profileScope('https://a.invalid/', 1, ' A@EXAMPLE.INVALID '));
});

test('stored photo filenames cannot escape the account directory', () => {
  assert.throws(() => model.parseProfilePreference(JSON.stringify({ nickname: '손님', photoFile: '../../other-account.jpg' })));
  assert.throws(() => model.parseProfilePreference(JSON.stringify({ nickname: '손님', photoFile: 'file:///private.jpg' })));
  assert.throws(() => model.parseProfilePreference('null'));
});

test('default profile is the authenticated nickname without altering the account', async () => {
  const app = fixture();
  const profile = await app.readCustomerProfile(user);
  assert.equal(profile.nickname, '원래이름');
  assert.equal(profile.photoUri, null);
  assert.equal(app.records.size, 0);
});

test('nickname saves and reloads separately per user', async () => {
  const app = fixture();
  await app.saveCustomerProfile(user, { nickname: '  바뀐이름  ', photoUri: null });
  assert.equal((await app.readCustomerProfile(user)).nickname, '바뀐이름');
  assert.equal((await app.readCustomerProfile({ ...user, id: 22 })).nickname, '원래이름');
  assert.equal(user.nickname, '원래이름');
});

test('photo is copied to durable app storage and survives picker cache removal', async () => {
  const app = fixture();
  const source = 'file:///cache/picked.png';
  app.files.set(source, { size: 1000 });
  const saved = await app.saveCustomerProfile(user, { nickname: '사진손님', photoUri: source });
  assert.match(saved.photoUri, /^file:\/\/\/app\/documents\/customer-profiles\/11\./);
  assert.notEqual(saved.photoUri, source);
  app.files.delete(source);
  assert.equal((await app.readCustomerProfile(user)).photoUri, saved.photoUri);
});

test('replacing and removing a photo never removes the source image', async () => {
  const app = fixture();
  const firstSource = 'file:///cache/first.png';
  const secondSource = 'file:///cache/second.jpg';
  app.files.set(firstSource, { size: 1000 }); app.files.set(secondSource, { size: 1500 });
  const first = await app.saveCustomerProfile(user, { nickname: '손님', photoUri: firstSource });
  const second = await app.saveCustomerProfile(user, { nickname: '손님', photoUri: secondSource });
  assert.equal(app.files.has(first.photoUri), false);
  assert.equal(app.files.has(second.photoUri), true);
  await app.saveCustomerProfile(user, { nickname: '손님', photoUri: null });
  assert.equal(app.files.has(second.photoUri), false);
  assert.equal(app.files.has(firstSource), true); assert.equal(app.files.has(secondSource), true);
  assert.equal((await app.readCustomerProfile(user)).photoUri, null);
});

test('changing only the nickname keeps the existing durable photo', async () => {
  const app = fixture();
  app.files.set('file:///cache/picked.png', { size: 1000 });
  const first = await app.saveCustomerProfile(user, { nickname: '손님', photoUri: 'file:///cache/picked.png' });
  const second = await app.saveCustomerProfile(user, { nickname: '새손님', photoUri: first.photoUri });
  assert.equal(second.photoUri, first.photoUri); assert.equal(app.files.size, 2);
});

test('a failed preference write preserves the old photo and removes only the new copy', async () => {
  const app = fixture();
  app.files.set('file:///cache/first.png', { size: 1000 });
  app.files.set('file:///cache/second.jpg', { size: 1000 });
  const first = await app.saveCustomerProfile(user, { nickname: '원래이름', photoUri: 'file:///cache/first.png' });
  app.failWrite();
  await assert.rejects(app.saveCustomerProfile(user, { nickname: '새이름', photoUri: 'file:///cache/second.jpg' }));
  assert.equal((await app.readCustomerProfile(user)).photoUri, first.photoUri);
  assert.equal((await app.readCustomerProfile(user)).nickname, '원래이름');
  assert.equal(app.files.size, 3);
});

test('oversized, missing and remote photos cannot be saved', async () => {
  const app = fixture();
  app.files.set('file:///cache/large.jpg', { size: model.PROFILE_PHOTO_MAX_BYTES + 1 });
  await assert.rejects(app.saveCustomerProfile(user, { nickname: '손님', photoUri: 'file:///cache/large.jpg' }), /10MB/);
  await assert.rejects(app.saveCustomerProfile(user, { nickname: '손님', photoUri: 'file:///cache/missing.jpg' }));
  await assert.rejects(app.saveCustomerProfile(user, { nickname: '손님', photoUri: 'https://example.invalid/photo.jpg' }));
  assert.equal(app.records.size, 0);
});
