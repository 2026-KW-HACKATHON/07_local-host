import { useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { HeaderLogo } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import {
  FigmaButton,
  FigmaTextField,
  ScreenTitle,
  SocialButton,
} from '../components/Controls';
import { colors, px } from '../theme/tokens';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

function showSocialSetup(provider: 'Google' | '네이버') {
  Alert.alert(
    `${provider} 로그인 설정이 필요해요`,
    '현재 백엔드 가이드에는 소셜 OAuth 엔드포인트와 앱 키가 없습니다. 이메일 로그인을 이용해 주세요.',
  );
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('로그인 정보를 확인해 주세요', '이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      await onLogin(normalizedEmail, password);
    } catch (error) {
      Alert.alert(
        '로그인하지 못했어요',
        error instanceof Error ? error.message : '이메일 또는 비밀번호를 확인해 주세요.',
      );
    } finally {
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
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    marginTop: px(17),
    marginLeft: px(-2),
  },
  title: {
    marginTop: px(47),
  },
  form: {
    marginTop: px(47),
    marginLeft: px(15),
    gap: px(44),
  },
  loginButton: {
    marginTop: px(44),
    marginLeft: px(15),
  },
  loginButtonText: {
    color: colors.white,
  },
  socials: {
    marginTop: px(47),
    marginLeft: px(15),
    gap: px(29),
  },
});
