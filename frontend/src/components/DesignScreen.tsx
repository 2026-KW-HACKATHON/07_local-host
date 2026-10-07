import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { colors, metrics } from '../theme/tokens';

type DesignScreenProps = PropsWithChildren<{
  backgroundColor?: string;
  keyboardAware?: boolean;
}>;

export function DesignScreen({
  backgroundColor = colors.white,
  children,
  keyboardAware = false,
}: DesignScreenProps) {
  const canvas = (
    <View style={[styles.canvas, keyboardAware && styles.scrollCanvas, { backgroundColor }]}>{children}</View>
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
});
