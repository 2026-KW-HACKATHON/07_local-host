import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { px } from '../theme/tokens';

type AssetSlotProps = {
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
};

function AssetSlot({ accessibilityLabel, style }: AssetSlotProps) {
  return (
    <View
      accessibilityLabel={`${accessibilityLabel} 원본 에셋 자리`}
      accessible
      style={style}
    />
  );
}

export function BrandComposition({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityLabel="밥줄 조합 로고 자리" style={[styles.composition, style]}>
      <AssetSlot accessibilityLabel="밥그릇 이미지" style={styles.bowl} />
      <AssetSlot accessibilityLabel="밥줄 워드마크" style={styles.wordmark} />
    </View>
  );
}

export function HeaderLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  return <AssetSlot accessibilityLabel="밥줄 헤더 로고" style={[styles.headerLogo, style]} />;
}

const styles = StyleSheet.create({
  composition: {
    position: 'relative',
    width: px(319),
    height: px(159),
  },
  bowl: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: px(159),
    height: px(159),
  },
  wordmark: {
    position: 'absolute',
    top: px(38),
    left: px(128),
    width: px(191),
    height: px(95),
  },
  headerLogo: {
    width: px(159),
    height: px(79),
  },
});
