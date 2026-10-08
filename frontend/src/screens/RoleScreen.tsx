import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { HeaderLogo } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import { FigmaButton } from '../components/Controls';
import { fonts, px } from '../theme/tokens';

export type UserRole = 'CUSTOMER' | 'OWNER';

type RoleScreenProps = {
  allowedRole?: UserRole;
  creatingAccount: boolean;
  onSelect: (role: UserRole) => Promise<void>;
  onBack: () => void;
};

export function RoleScreen({ allowedRole, creatingAccount, onSelect, onBack }: RoleScreenProps) {
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const requestInFlight = useRef(false);

  const selectRole = async (role: UserRole) => {
    if (requestInFlight.current) return;

    if (allowedRole && role === 'OWNER' && allowedRole !== 'OWNER') {
      Alert.alert('점주 권한이 필요해요', '이 계정은 일반 사용자 계정입니다.', [{ text: '확인' }]);
      return;
    }

    try {
      requestInFlight.current = true;
      setLoadingRole(role);
      await onSelect(role);
    } catch (error) {
      Alert.alert(
        creatingAccount ? '회원가입하지 못했어요' : '버전을 열지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
        [{ text: '확인' }],
      );
    } finally {
      requestInFlight.current = false;
      setLoadingRole(null);
    }
  };

  const busy = loadingRole !== null;

  return (
    <DesignScreen onBack={onBack} backDisabled={busy}>
      <HeaderLogo style={styles.logo} />
      <View style={styles.actions}>
        <FigmaButton
          disabled={busy}
          loading={loadingRole === 'CUSTOMER'}
          onPress={() => void selectRole('CUSTOMER')}
          style={styles.roleButton}
          textStyle={styles.roleText}
        >
          {creatingAccount ? '손님으로 가입' : '손님 버전'}
        </FigmaButton>
        <FigmaButton
          disabled={busy || Boolean(allowedRole && allowedRole !== 'OWNER')}
          loading={loadingRole === 'OWNER'}
          onPress={() => void selectRole('OWNER')}
          style={styles.roleButton}
          textStyle={styles.roleText}
        >
          {creatingAccount ? '점주로 가입' : '점주 버전'}
        </FigmaButton>
      </View>
    </DesignScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    marginTop: px(18),
    marginLeft: px(15),
    alignSelf: 'flex-start',
  },
  actions: {
    marginTop: px(204),
    marginLeft: px(15),
    gap: px(69),
  },
  roleButton: {
    height: px(126),
  },
  roleText: {
    fontFamily: fonts.koreanBold,
  },
});
