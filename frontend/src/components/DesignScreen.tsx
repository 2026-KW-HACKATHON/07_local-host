import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, metrics, px } from '../theme/tokens';

type DesignScreenProps = PropsWithChildren<{
  backgroundColor?: string;
  keyboardAware?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
}>;

export function DesignScreen({
  backgroundColor = colors.white,
  children,
  keyboardAware = false,
  onBack,
  backDisabled = false,
}: DesignScreenProps) {
  const canvas = (
    <View style={[styles.canvas, keyboardAware && styles.scrollCanvas, { backgroundColor }]}>
      {onBack && <View style={styles.backRow}><Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로 돌아가기"
        accessibilityState={{ disabled: backDisabled }} disabled={backDisabled}
        onPress={() => { Keyboard.dismiss(); onBack(); }} style={({ pressed }) => [styles.backButton, (pressed || backDisabled) && styles.dimmed]}>
        <Text style={styles.backText}>‹ 뒤로</Text>
      </Pressable></View>}
      {children}
    </View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.root, { backgroundColor }]}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {canvas}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.root, { backgroundColor }]}>{canvas}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  scrollContent: {
    minWidth: '100%',
    minHeight: metrics.canvasHeight,
    alignItems: 'center',
  },
  canvas: {
    width: metrics.canvasWidth,
    height: metrics.canvasHeight,
    overflow: 'hidden',
  },
  scrollCanvas: { height: undefined, minHeight: metrics.canvasHeight },
  backRow: { paddingHorizontal: px(15), paddingTop: px(8) },
  backButton: { alignSelf: 'flex-start', minWidth: px(80), minHeight: px(44), justifyContent: 'center', paddingHorizontal: px(8) },
  backText: { color: colors.black, fontFamily: fonts.koreanMedium, fontSize: px(18), lineHeight: px(28) },
  dimmed: { opacity: 0.45 },
});
