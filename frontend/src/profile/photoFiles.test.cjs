const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(`${__dirname}/photoFiles.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const maxBytes = 10 * 1024 * 1024;
const uri = 'file:///app/cache/DocumentPicker/picked.png';
const defaultAsset = { name: '사진.png', uri, mimeType: 'image/png', size: 1024 };

function fixture({ asset = defaultAsset, canceled = false, actualSize = 1024, exists = true, nativeAvailable = true, moduleFails = false, pickerFails = false, canDecode = true } = {}) {
  const exported = {};
  const calls = { loads: 0, selections: 0, reads: 0, decodes: 0, options: null };
  class File {
    constructor(value) { calls.reads++; assert.equal(value, asset.uri); }
    get exists() { return exists; }
    get size() { return actualSize; }
    delete() { assert.fail('Document selection must not delete an original or cached file'); }
  }
  vm.runInNewContext(compiled, { exports: exported, require(name) {
    if (name === 'expo-file-system') return { File };
    if (name === 'expo') return { requireOptionalNativeModule: () => nativeAvailable ? {} : null };
    if (name === 'react-native') return { Image: { getSize: async () => { calls.decodes++; if (!canDecode) throw new Error('Cannot decode'); return { width: 100, height: 100 }; } } };
    if (name === './profileModel') return { PROFILE_PHOTO_MAX_BYTES: maxBytes };
    if (name === 'expo-document-picker') {
      calls.loads++;
      if (!nativeAvailable) throw new Error('Cannot find native module ExpoDocumentPicker');
      if (moduleFails) throw new Error('Module evaluation failed');
      return { getDocumentAsync: async options => {
        calls.selections++; calls.options = options;
        if (pickerFails) throw new Error('Provider unavailable');
        return canceled ? { canceled: true, assets: null } : { canceled: false, assets: asset ? [asset] : [] };
      } };
    }
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { ...exported, calls };
}

test('document picker native module is loaded only after the file action and missing native support is recoverable', async () => {
  const app = fixture({ nativeAvailable: false });
  assert.equal(app.calls.loads, 0);
  await assert.rejects(app.pickProfilePhotoFile(), /새 버전.*설치/);
  assert.equal(app.calls.selections, 0);
  assert.equal(app.calls.loads, 0);
});
test('module loading failure is distinguished from missing native support', async () => {
  const app = fixture({ moduleFails: true });
  assert.equal(app.calls.loads, 0);
  await assert.rejects(app.pickProfilePhotoFile(), /기능을 불러오지 못했어요/);
  assert.equal(app.calls.loads, 1);
  assert.equal(app.calls.selections, 0);
});
test('file selection requests one image with immediate readable cache access', async () => {
  const app = fixture();
  assert.equal(await app.pickProfilePhotoFile(), uri);
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls.options)), { type: 'image/*', multiple: false, copyToCacheDirectory: true, base64: false });
  assert.equal(app.calls.decodes, 1);
});
test('cancellation preserves the caller photo by returning null without reading a file', async () => {
  const app = fixture({ canceled: true });
  assert.equal(await app.pickProfilePhotoFile(), null);
  assert.equal(app.calls.reads, 0);
  assert.equal(app.calls.decodes, 0);
});
test('non-image or missing MIME is rejected even with an image filename', async () => {
  for (const mimeType of ['application/pdf', 'application/octet-stream', undefined, 'text/plain', 'image/']) {
    const app = fixture({ asset: { ...defaultAsset, mimeType } });
    await assert.rejects(app.pickProfilePhotoFile(), /사진 파일만/);
    assert.equal(app.calls.decodes, 0);
  }
});
test('size limit checks provider metadata and actual cache file, permitting exactly 10 MB', async () => {
  await assert.rejects(fixture({ asset: { ...defaultAsset, size: maxBytes + 1 } }).pickProfilePhotoFile(), /10MB/);
  await assert.rejects(fixture({ asset: { ...defaultAsset, size: undefined }, actualSize: maxBytes + 1 }).pickProfilePhotoFile(), /10MB/);
  await assert.rejects(fixture({ asset: { ...defaultAsset, size: 1 }, actualSize: maxBytes + 1 }).pickProfilePhotoFile(), /10MB/);
  assert.equal(await fixture({ asset: { ...defaultAsset, size: maxBytes }, actualSize: maxBytes }).pickProfilePhotoFile(), uri);
});
test('missing, zero-byte and invalid cache files are rejected', async () => {
  await assert.rejects(fixture({ exists: false }).pickProfilePhotoFile(), /읽지 못했어요/);
  for (const actualSize of [0, -1, NaN, Infinity]) await assert.rejects(fixture({ actualSize }).pickProfilePhotoFile(), /읽지 못했어요/);
  await assert.rejects(fixture({ asset: null }).pickProfilePhotoFile(), /불러오지 못했어요/);
});
test('remote or permission-only URIs are not accepted in place of the cache copy', async () => {
  for (const value of ['https://example.invalid/photo.png', 'content://external/photos/1', 'data:image/png;base64,AAA']) {
    await assert.rejects(fixture({ asset: { ...defaultAsset, uri: value } }).pickProfilePhotoFile(), /불러오지 못했어요/);
  }
});
test('unreadable images and file provider errors return actionable Korean messages', async () => {
  await assert.rejects(fixture({ canDecode: false }).pickProfilePhotoFile(), /JPG 또는 PNG/);
  await assert.rejects(fixture({ pickerFails: true }).pickProfilePhotoFile(), /파일 접근 상태/);
});
