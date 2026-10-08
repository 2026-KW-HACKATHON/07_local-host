const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

test('visible wordmark starts at the same left edge as the content below it', () => {
  const brand = source('BrandAssets.tsx');
  assert.match(brand, /headerLogoImage:[\s\S]*translateX: px\(-28\)/);
  assert.match(brand, /headerLogo:[\s\S]*width: px\(131\)[\s\S]*overflow: 'hidden'/);

  for (const screen of ['../screens/LoginScreen.tsx', '../screens/WelcomeScreen.tsx', '../screens/RoleScreen.tsx', '../screens/SignupScreen.tsx']) {
    assert.match(source(screen), /logo:[\s\S]*?marginLeft: px\(15\)/, screen);
  }

  assert.match(source('../screens/CustomerScreen.tsx'), /searchWrap: \{ alignItems: 'flex-start'/);
});

test('customer and owner screens do not expose local device-test labels', () => {
  const ui = [
    'CustomerCoupons.tsx',
    'CustomerProfile.tsx',
    '../screens/CustomerScreen.tsx',
    '../screens/OwnerScreen.tsx',
  ].map(source).join('\n');

  assert.doesNotMatch(ui, /기기 테스트|이 기기에 저장|이 기기의 손님|\(기기\)|기기 프로모션|이 기기로 작성/);
});
