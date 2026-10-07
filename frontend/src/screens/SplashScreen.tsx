import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BrandComposition } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import { colors, px } from '../theme/tokens';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 900);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <DesignScreen backgroundColor={colors.brandYellow}>
      <Pressable
        accessibilityHint="위치 권한 안내로 이동합니다"
        accessibilityLabel="밥줄 시작 화면"
        accessibilityRole="button"
        onPress={onDone}
        style={styles.pressArea}
      >
        <BrandComposition style={styles.brand} />
      </Pressable>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  pressArea: {
    flex: 1,
    alignItems: 'center',
  },
  brand: {
    marginTop: px(337),
  },
});
