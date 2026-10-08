module.exports = function configureBabel(api) {
  api.cache(true);

  return {
    // pnpm의 격리된 의존성 구조에서도 Expo에 포함된 프리셋을 찾습니다.
    presets: [require.resolve('babel-preset-expo', {
      paths: [require.resolve('expo/package.json')],
    })],
  };
};
