import { useEffect, useRef } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { isRunningInExpoGo } from 'expo';

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

function showSettingsAlert(title: string, message: string): Promise<void> {
  return new Promise(resolve => Alert.alert(title, message, [
    { text: '나중에', style: 'cancel', onPress: () => resolve() },
    { text: '설정 열기', onPress: () => { void Linking.openSettings().catch(() => undefined).finally(resolve); } },
  ], { cancelable: false }));
}

function showPermissionError(title: string): Promise<void> {
  return new Promise(resolve => Alert.alert(title, '잠시 후 설정에서 다시 시도해 주세요.',
    [{ text: '확인', onPress: () => resolve() }], { cancelable: false }));
}

export function LocationPermissionScreen({ onDone }: { onDone: () => void }) {
  const request = useRef<Promise<Location.LocationPermissionResponse> | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        request.current ??= Location.getForegroundPermissionsAsync().then(result =>
          result.granted || !result.canAskAgain ? result : Location.requestForegroundPermissionsAsync());
        const result = await request.current;
        if (!active) return;

        if (result.status !== Location.PermissionStatus.GRANTED && !result.canAskAgain) {
          await showSettingsAlert(
            '위치 권한이 꺼져 있어요',
            '주변 맛집과 매장까지의 거리를 보려면 기기 설정에서 위치 권한을 허용해 주세요.',
          );
        }
      } catch {
        if (active) {
          await showPermissionError('위치 권한을 확인하지 못했어요');
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
  const request = useRef<Promise<{ granted: boolean; canAskAgain: boolean }> | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        request.current ??= (async () => {
          if (Platform.OS === 'android') {
            const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
            // Expo Go의 호스트 권한 요청과 앱의 요청이 겹치면 거절 뒤 Promise가 끝나지 않을 수 있다.
            // 미리보기에서는 호스트 권한을 새로 요청하지 않는다. 설치된 밥줄 APK는 아래 실제 요청을 사용한다.
            if (isRunningInExpoGo()) {
              return { granted: await PermissionsAndroid.check(permission), canAskAgain: true };
            }
            if (Number(Platform.Version) < 33 || await PermissionsAndroid.check(permission)) {
              return { granted: true, canAskAgain: true };
            }
            const result = await PermissionsAndroid.request(permission);
            return { granted: result === PermissionsAndroid.RESULTS.GRANTED,
              canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN };
          }
          const Notifications = await import('expo-notifications');
          const result = await Notifications.getPermissionsAsync();
          const resolved = result.ios?.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED
            ? await Notifications.requestPermissionsAsync() : result;
          const status = resolved.ios?.status;
          return {
            granted: status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
              status === Notifications.IosAuthorizationStatus.PROVISIONAL || status === Notifications.IosAuthorizationStatus.EPHEMERAL,
            canAskAgain: status !== Notifications.IosAuthorizationStatus.DENIED,
          };
        })();
        const result = await request.current;
        if (!active) return;
        if (!result.granted && !result.canAskAgain) {
          await showSettingsAlert('알림 권한이 꺼져 있어요',
            '대기와 프로모션 알림을 받으려면 기기 설정에서 알림 권한을 허용해 주세요.');
        }
      } catch {
        if (active) {
          await showPermissionError('알림 권한을 확인하지 못했어요');
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
