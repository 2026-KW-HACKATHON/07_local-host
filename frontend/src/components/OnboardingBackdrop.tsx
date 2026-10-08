import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingBrand } from './BrandAssets';
import { colors, design } from '../theme/tokens';

/** Shared start and native-permission background, adapted from frontend-b. */
export function OnboardingBackdrop({ onPress }: { onPress?: () => void }) {
  const brand = <OnboardingBrand style={styles.brand} />;

  return <View style={styles.root}>
    <View style={styles.screen}>
      {onPress ? <Pressable
        accessibilityHint="다음 화면으로 이동합니다"
        accessibilityLabel="밥줄 시작 화면"
        accessibilityRole="button"
        onPress={onPress}
        style={styles.fill}
      >{brand}</Pressable> : brand}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: colors.onboardingYellow },
  screen: { flex: 1, width: '100%', maxWidth: design.width, backgroundColor: colors.onboardingYellow },
  fill: { flex: 1 },
  brand: { position: 'absolute', left: '14%', top: '39.6%' },
});
