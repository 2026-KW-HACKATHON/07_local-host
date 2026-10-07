import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DesignScreen } from '../components/DesignScreen';
import { FigmaButton } from '../components/Controls';
import { colors, fonts, px } from '../theme/tokens';

const TERMS = [
  { label: '만 14세 이상입니다. (필수)', required: true },
  { label: '서비스 이용약관 동의 (필수)', required: true },
  { label: '개인정보 수집/이용 동의 (필수)', required: true },
  { label: '개인정보 제3자 제공 동의 (필수)', required: true },
  { label: '이벤트 혜택 및 광고성 정보 수신\n  동의 (선택)', required: false },
] as const;

export function TermsScreen({ onContinue }: { onContinue: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(TERMS.map(() => false));

  const toggle = (index: number) => {
    setChecked((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
  };

  const submit = () => {
    const allRequiredChecked = TERMS.every((term, index) => !term.required || checked[index]);
    if (!allRequiredChecked) {
      Alert.alert('필수 약관에 동의해 주세요', '필수 항목 네 개를 모두 선택해야 가입할 수 있어요.');
      return;
    }

    onContinue();
  };

  return (
    <DesignScreen>
      <Text allowFontScaling={false} style={styles.title}>
        서비스 이용을 위해{`\n`}약관에 동의해 주세요
      </Text>
      <View style={styles.termsList}>
        {TERMS.map((term, index) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checked[index] }}
            key={term.label}
            onPress={() => toggle(index)}
          >
            <Text allowFontScaling={false} style={styles.termText}>
              {checked[index] ? '■' : '□'} {term.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FigmaButton
        backgroundColor={colors.primary}
        onPress={submit}
        style={styles.startButton}
        textStyle={styles.startText}
      >
        시작하기
      </FigmaButton>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    width: px(263),
    height: px(72),
    marginTop: px(56),
    marginLeft: px(24),
    color: colors.black,
    fontFamily: fonts.bold,
    fontSize: px(30),
    lineHeight: px(36),
    includeFontPadding: false,
    letterSpacing: 0,
  },
  termsList: {
    width: px(367),
    height: px(234),
    marginTop: px(73),
    marginLeft: px(24),
  },
  termText: {
    color: colors.black,
    fontFamily: fonts.koreanMedium,
    fontSize: px(25),
    lineHeight: px(38.75),
    includeFontPadding: false,
    letterSpacing: 0,
  },
  startButton: {
    marginTop: px(330),
    marginLeft: px(15),
  },
  startText: {
    color: colors.white,
  },
});
