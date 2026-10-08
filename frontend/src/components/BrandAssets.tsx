import type { StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';

import { px } from '../theme/tokens';

// The supplied SVG contains this exact PNG. Keep its pixels and transparency intact.
const bowl = require('../../assets/brand/bapjul-logo.png');
const wordmark = require('../../assets/brand/bapjul-wordmark.png');

export function BrandComposition({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="밥줄" style={[styles.composition, style]}>
      <Image accessible={false} source={bowl} resizeMode="contain" style={styles.bowl} />
      <Image accessible={false} source={wordmark} resizeMode="contain" style={styles.wordmark} />
    </View>
  );
}

export function HeaderLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View accessible accessibilityRole="image" accessibilityLabel="밥줄" style={[styles.headerLogo, style]}>
    <Image accessible={false} source={wordmark} resizeMode="contain" style={styles.headerLogoImage} />
  </View>;
}

const styles = StyleSheet.create({
  composition: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: px(319),
    height: px(159),
  },
  bowl: {
    flexShrink: 0,
    width: px(159),
    height: px(159),
  },
  wordmark: {
    marginLeft: px(-31),
    marginTop: px(38),
    width: px(191),
    height: px(95),
    flexShrink: 0,
  },
  headerLogo: {
    // The supplied wordmark has transparent padding on both sides. Crop that
    // padding so the visible first letter aligns with the content below it.
    width: px(131),
    height: px(79),
    overflow: 'hidden',
  },
  headerLogoImage: {
    width: px(159),
    height: px(79),
    transform: [{ translateX: px(-28) }],
  },
});
