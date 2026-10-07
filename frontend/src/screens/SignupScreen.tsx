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

export type PendingSignup = {
  email: string;
  nickname: string;
  password: string;
};

export function SignupScreen({
  onContinue,
}: {
  onContinue: (signup: PendingSignup) => void;
}) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const nicknameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedNickname = nickname.trim();

    if (!normalizedEmail.includes('@')) {
      Alert.alert('이메일을 확인해 주세요', '로그인에 사용할 이메일 주소를 입력해 주세요.');
      return;
    }

    if (trimmedNickname.length < 2 || trimmedNickname.length > 30) {
      Alert.alert('닉네임을 확인해 주세요', '닉네임은 2자 이상 30자 이하로 입력해 주세요.');
      return;
    }

    if (password.length < 8 || password.length > 50) {
      Alert.alert('비밀번호를 확인해 주세요', '비밀번호는 8자 이상 50자 이하로 입력해 주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('비밀번호가 일치하지 않아요', '두 비밀번호를 다시 확인해 주세요.');
      return;
    }

    onContinue({ email: normalizedEmail, nickname: trimmedNickname, password });
  };

  const showSocialSetup = (provider: 'Google' | '네이버') => {
    Alert.alert(
      `${provider} 회원가입 설정이 필요해요`,
      '현재 백엔드에는 소셜 OAuth 엔드포인트가 없어 이메일 회원가입만 연결되어 있습니다.',
    );
  };

  return (
    <DesignScreen keyboardAware>
      <HeaderLogo style={styles.logo} />
      <ScreenTitle style={styles.title}>회원가입</ScreenTitle>
      <View style={styles.form}>
        <FigmaTextField
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={() => nicknameRef.current?.focus()}
          placeholder="이메일"
          returnKeyType="next"
          value={email}
        />
        <FigmaTextField
          autoCapitalize="words"
          inputRef={nicknameRef}
          onChangeText={setNickname}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="닉네임"
          returnKeyType="next"
          value={nickname}
        />
        <FigmaTextField
          inputRef={passwordRef}
          onChangeText={setPassword}
          onSubmitEditing={() => confirmRef.current?.focus()}
          placeholder="비밀번호"
          returnKeyType="next"
          secureTextEntry
          value={password}
        />
        <View style={styles.confirmField}>
          <FigmaTextField
            inputRef={confirmRef}
            onChangeText={setPasswordConfirm}
            onSubmitEditing={submit}
            placeholder="비밀번호 확인"
            returnKeyType="done"
            secureTextEntry
            value={passwordConfirm}
          />
        </View>
      </View>
      <View style={styles.socials}>
        <SocialButton onPress={() => showSocialSetup('Google')} provider="google" />
        <SocialButton onPress={() => showSocialSetup('네이버')} provider="naver" />
      </View>
      <FigmaButton
        backgroundColor={colors.primary}
        onPress={submit}
        style={styles.confirmButton}
        textStyle={styles.confirmText}
      >
        확인
      </FigmaButton>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    marginTop: px(18),
    marginLeft: px(7),
  },
  title: {
    marginTop: px(23),
  },
  form: {
    marginTop: px(47),
    marginLeft: px(15),
    gap: px(25),
  },
  confirmField: {
    marginTop: px(3),
  },
  socials: {
    marginTop: px(79),
    marginLeft: px(14),
    gap: px(12),
  },
  confirmButton: {
    marginTop: px(69),
    marginLeft: px(15),
  },
  confirmText: {
    color: colors.white,
  },
});
