import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { BrandComposition } from '../components/BrandAssets';
import { DesignScreen } from '../components/DesignScreen';
import { colors, px } from '../theme/tokens';

function PermissionBackdrop() {
  return (
    <DesignScreen backgroundColor={colors.brandYellow}>
      <BrandComposition style={styles.brand} />
    </DesignScreen>
  );
}

function showSettingsAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: '나중에', style: 'cancel' },
    { text: '설정 열기', onPress: () => void Linking.openSettings() },
  ]);
}

export function LocationPermissionScreen({ onDone }: { onDone: () => void }) {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    let active = true;

    void (async () => {
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        if (!active) return;

        if (result.status !== Location.PermissionStatus.GRANTED && !result.canAskAgain) {
          showSettingsAlert(
            '위치 권한이 꺼져 있어요',
            '주변 맛집과 매장까지의 거리를 보려면 기기 설정에서 위치 권한을 허용해 주세요.',
          );
        }
      } catch {
        if (active) {
          Alert.alert('위치 권한을 확인하지 못했어요', '잠시 후 설정에서 다시 시도해 주세요.');
        }
      } finally {
        if (active) onDone();
      }
    })();

    return () => {
      active = false;
    };
  }, [onDone]);

  return <PermissionBackdrop />;
}

export function NotificationPermissionScreen({ onDone }: { onDone: () => void }) {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    let active = true;

    void (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: '기본 알림',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const result = await Notifications.requestPermissionsAsync();
        if (!active) return;

        if (!result.granted && !result.canAskAgain) {
          showSettingsAlert(
            '알림 권한이 꺼져 있어요',
            '대기와 프로모션 알림을 받으려면 기기 설정에서 알림 권한을 허용해 주세요.',
          );
        }
      } catch {
        if (active) {
          Alert.alert('알림 권한을 확인하지 못했어요', '잠시 후 설정에서 다시 시도해 주세요.');
        }
      } finally {
        if (active) onDone();
      }
    })();

    return () => {
      active = false;
    };
  }, [onDone]);

  return <PermissionBackdrop />;
}

const styles = StyleSheet.create({
  brand: {
    alignSelf: 'center',
    marginTop: px(337),
  },
});
