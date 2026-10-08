const { withDangerousMod, withProjectBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// backend-a의 판정 코어를 복제 구현하지 않고 빌드마다 동일 Java 소스를 사용합니다.
module.exports = function withBapjulStay(config) {
  config = withProjectBuildGradle(config, mod => {
    if (!mod.modResults.contents.includes('// bapjul: short CMake staging')) {
      mod.modResults.contents += `
// bapjul: short CMake staging (Windows + pnpm의 긴 의존성 경로 대응)
subprojects { project ->
  project.plugins.withId('com.android.library') {
    if (project.name == 'expo-modules-core') {
      project.android.externalNativeBuild.cmake.buildStagingDirectory = rootProject.file('.bapjul-cxx/expo-modules-core')
    }
  }
}
`;
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const root = mod.modRequest.projectRoot;
    const destination = path.join(root, 'modules/bapjul-stay/android/src/main/java');
    const core = path.resolve(root, '../backend/src/main/java/bapjul/stay');
    const target = path.join(destination, 'bapjul/stay');
    fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(core).filter(file => file.endsWith('.java'))) {
      fs.copyFileSync(path.join(core, file), path.join(target, file));
    }
    const adapters = path.resolve(root, '../android-integration');
    const adapterTarget = path.join(destination, 'bapjul/location/android');
    fs.mkdirSync(adapterTarget, { recursive: true });
    fs.copyFileSync(path.join(adapters, 'StayApiClient.java'), path.join(adapterTarget, 'StayApiClient.java'));
    return mod;
  }]);
};
