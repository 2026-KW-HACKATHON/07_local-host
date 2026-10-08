import { Pressable, StyleSheet, Text } from 'react-native';

import { HeaderLogo } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import { FigmaButton, ScreenTitle } from '../components/Controls';
import { colors, fonts, px } from '../theme/tokens';

export function WelcomeScreen({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <DesignScreen>
      <HeaderLogo style={styles.logo} />
      <ScreenTitle style={styles.title}>반가워요!</ScreenTitle>
      <FigmaButton onPress={onLogin} style={styles.loginButton} textStyle={styles.loginText}>
        로그인
      </FigmaButton>
      <Pressable accessibilityRole="button" onPress={onSignup} style={styles.signupButton}>
        <Text allowFontScaling={false} style={styles.signupText}>
          회원가입
        </Text>
      </Pressable>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    marginTop: px(19),
    marginLeft: px(15),
    alignSelf: 'flex-start',
  },
  title: {
    marginTop: px(68),
  },
  loginButton: {
    height: px(126),
    marginTop: px(68),
    marginLeft: px(15),
  },
  loginText: {
    fontFamily: fonts.koreanBold,
  },
  signupButton: {
    minHeight: px(44),
    marginTop: px(45),
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: px(20),
    borderRadius: px(12),
    backgroundColor: colors.brandYellow,
  },
  signupText: {
    color: colors.black,
    fontFamily: fonts.koreanBold,
    fontSize: px(24),
    lineHeight: px(29),
    includeFontPadding: false,
    letterSpacing: 0,
  },
});
