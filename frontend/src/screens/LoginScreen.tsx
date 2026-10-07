import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HeaderLogo } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import {
  FigmaButton,
  FigmaTextField,
  ScreenTitle,
  SocialButton,
} from '../components/Controls';
import { colors, fonts, px } from '../theme/tokens';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: () => void;
};

function showSocialSetup(provider: 'Google' | '네이버') {
  Alert.alert(
    `${provider} 로그인 설정이 필요해요`,
    '소셜 로그인은 준비 중이에요. 아이디와 비밀번호로 로그인해 주세요.',
    [{ text: '확인' }],
  );
}

export function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const submitting = useRef(false);

  const submit = async () => {
    if (submitting.current) return;
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      Alert.alert('로그인 정보를 확인해 주세요', '가입한 이메일과 비밀번호를 모두 입력해 주세요.', [{ text: '확인' }]);
      return;
    }

    try {
      submitting.current = true;
      setLoading(true);
      await onLogin(normalizedEmail, password);
    } catch (error) {
      Alert.alert(
        '로그인하지 못했어요',
        error instanceof Error ? error.message : '아이디 또는 비밀번호를 확인해 주세요.',
        [{ text: '확인' }],
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <DesignScreen keyboardAware>
      <HeaderLogo style={styles.logo} />
      <ScreenTitle style={styles.title}>로그인</ScreenTitle>
      <View style={styles.form}>
        <FigmaTextField
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="이메일"
          returnKeyType="next"
          value={email}
        />
        <FigmaTextField
          inputRef={passwordRef}
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="비밀번호"
          returnKeyType="done"
          secureTextEntry
          value={password}
        />
      </View>
      <FigmaButton
        backgroundColor={colors.primary}
        loading={loading}
        onPress={() => void submit()}
        style={styles.loginButton}
        textStyle={styles.loginButtonText}
      >
        로그인
      </FigmaButton>
      <View style={styles.socials}>
        <SocialButton onPress={() => showSocialSetup('Google')} provider="google" />
        <SocialButton onPress={() => showSocialSetup('네이버')} provider="naver" />
      </View>
      <Pressable accessibilityRole="button" disabled={loading} onPress={onSignup} style={styles.signupLink}>
        <Text style={styles.signupText}>계정이 없으신가요? 회원가입</Text>
      </Pressable>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    marginTop: px(17),
    alignSelf: 'center',
  },
  title: {
    marginTop: px(24),
  },
  form: {
    marginTop: px(32),
    marginLeft: px(15),
    gap: px(16),
  },
  loginButton: {
    marginTop: px(24),
    marginLeft: px(15),
  },
  loginButtonText: {
    color: colors.white,
  },
  socials: {
    marginTop: px(32),
    marginLeft: px(15),
    gap: px(12),
  },
  signupLink: { alignSelf: 'center', marginTop: px(29) },
  signupText: { color: colors.black, fontFamily: fonts.koreanMedium, fontSize: px(16), lineHeight: px(24) },
});
