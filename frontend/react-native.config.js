const path = require('node:path');
const webViewAndroid = path.join(path.dirname(require.resolve('react-native-webview/package.json')), 'android');
const shortCodegen = path.join(__dirname, 'node_modules/react-native-webview/android/build/generated/source/codegen/jni/CMakeLists.txt');

// Keep generated WebView C++ paths below Windows/Ninja's MAX_PATH limit with
// pnpm's virtual store. Use the public node_modules link instead of its long
// real path; this remains portable across checkouts and survives prebuild.
module.exports = {
  dependencies: {
    'react-native-webview': {
      platforms: {
        android: {
          cmakeListsPath: path.relative(webViewAndroid, shortCodegen).replace(/\\/g, '/'),
        },
      },
    },
  },
};
