import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandComposition } from '../components/BrandAssets';
import { FigmaButton, ScreenTitle } from '../components/Controls';
import { DesignScreen } from '../components/DesignScreen';
import { colors, fonts, metrics, px } from '../theme/tokens';

export function SignupCompleteScreen({ onLogin, onLater }: {
  onLogin: () => Promise<void>;
  onLater: () => void;
}) {
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    try {
      await onLogin();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return <DesignScreen onBack={onLater} backDisabled={loading}>
    <View style={styles.content}>
      <BrandComposition style={styles.brand} />
      <ScreenTitle style={styles.title}>회원가입이 완료됐어요</ScreenTitle>
      <Text style={styles.message}>로그인하시겠습니까?</Text>
      <Text style={styles.description}>방금 가입한 계정으로 바로 시작할 수 있어요.</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>
        가입은 완료됐지만 로그인하지 못했어요.{ '\n' }{error}
      </Text>}
      <FigmaButton loading={loading}
        onPress={() => void login()} style={styles.login} textStyle={styles.loginText}>
        {error ? '다시 로그인' : '바로 로그인'}
      </FigmaButton>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading }}
        disabled={loading} onPress={onLater} style={({ pressed }) => [styles.later, (loading || pressed) && styles.inactive]}>
        <Text style={styles.laterText}>나중에 로그인</Text>
      </Pressable>
    </View>
  </DesignScreen>;
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', paddingHorizontal: px(15) },
  brand: { marginTop: px(64) },
  title: { width: metrics.contentWidth, fontSize: px(28), marginTop: px(32) },
  message: { color: colors.black, fontFamily: fonts.koreanBold, fontSize: px(22), lineHeight: px(32), marginTop: px(16) },
  description: { color: colors.muted, fontFamily: fonts.koreanMedium, fontSize: px(16), lineHeight: px(24), marginTop: px(12), textAlign: 'center' },
  error: { color: colors.danger, fontFamily: fonts.koreanMedium, fontSize: px(16), lineHeight: px(24), marginTop: px(24), textAlign: 'center' },
  login: { marginTop: px(32) },
  loginText: { color: colors.black },
  later: { minHeight: px(48), justifyContent: 'center', marginTop: px(12), paddingHorizontal: px(16), borderRadius: px(12), backgroundColor: colors.brandYellow },
  laterText: { color: colors.black, fontFamily: fonts.koreanMedium, fontSize: px(16), lineHeight: px(24) },
  inactive: { backgroundColor: colors.neutralButton },
});
