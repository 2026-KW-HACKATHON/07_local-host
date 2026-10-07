import type { PropsWithChildren, RefObject } from 'react';
import type {
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleProp,
  TextInput as NativeTextInput,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts, metrics, px, typography } from '../theme/tokens';

type FigmaButtonProps = PropsWithChildren<{
  accessibilityLabel?: string;
  backgroundColor?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}>;

export function FigmaButton({
  accessibilityLabel,
  backgroundColor = colors.neutralButton,
  children,
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
}: FigmaButtonProps) {
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        style,
        pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text allowFontScaling={false} style={[styles.buttonText, textStyle]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

type FigmaTextFieldProps = {
  actionLabel?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  inputRef?: RefObject<NativeTextInput | null>;
  keyboardType?: KeyboardTypeOptions;
  onActionPress?: () => void;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: ReturnKeyTypeOptions;
  secureTextEntry?: boolean;
  value: string;
};

export function FigmaTextField({
  actionLabel,
  autoCapitalize = 'none',
  inputRef,
  keyboardType = 'default',
  onActionPress,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType,
  secureTextEntry = false,
  value,
}: FigmaTextFieldProps) {
  return (
    <View style={styles.field}>
      <TextInput
        allowFontScaling={false}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={colors.black}
        ref={inputRef}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        selectionColor={colors.primary}
        style={styles.fieldInput}
        value={value}
      />
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={px(4)}
          onPress={onActionPress}
          style={({ pressed }) => [styles.fieldAction, pressed && styles.pressed]}
        >
          <Text allowFontScaling={false} numberOfLines={1} style={styles.fieldActionText}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SocialButton({
  onPress,
  provider,
}: {
  onPress: () => void;
  provider: 'google' | 'naver';
}) {
  const isGoogle = provider === 'google';

  return (
    <FigmaButton
      backgroundColor={isGoogle ? colors.google : colors.naver}
      onPress={onPress}
    >
      {isGoogle ? 'Google로 계속하기' : '네이버로 계속하기'}
    </FigmaButton>
  );
}

export function ScreenTitle({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return (
    <Text allowFontScaling={false} style={[styles.title, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: {
    width: metrics.contentWidth,
    height: metrics.controlHeight,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: metrics.controlRadius,
  },
  buttonText: {
    ...typography.control,
    color: colors.black,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.52,
  },
  field: {
    width: metrics.contentWidth,
    height: metrics.controlHeight,
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    borderRadius: metrics.controlRadius,
    backgroundColor: colors.field,
    paddingLeft: px(20),
    paddingRight: px(14),
  },
  fieldInput: {
    ...typography.control,
    flex: 1,
    height: '100%',
    margin: 0,
    padding: 0,
    color: colors.black,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fieldAction: {
    width: px(84),
    height: px(40),
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: metrics.controlRadius,
    backgroundColor: colors.white,
  },
  fieldActionText: {
    color: colors.black,
    fontFamily: fonts.bold,
    fontSize: px(20),
    lineHeight: px(24),
    includeFontPadding: false,
    letterSpacing: 0,
    textAlign: 'center',
  },
  title: {
    ...typography.title,
    height: px(54),
    color: colors.black,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
