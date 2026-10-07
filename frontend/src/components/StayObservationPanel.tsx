import { useEffect, useState } from 'react';
import { AppState, Alert, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../auth/AuthContext';
import { getStayStatus, hasNativeStayService, startStayService, stopStayService, type StayRestaurant } from '../location/stayService';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { CustomerButton } from './CustomerControls';

export function StayObservationPanel({ onSelect }: { onSelect: (restaurant: StayRestaurant) => void }) {
  const { token } = useAuth();
  const [status, setStatus] = useState(getStayStatus);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setStatus(getStayStatus()), 3000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setStatus(getStayStatus()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const start = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (!foreground.granted || (Platform.OS === 'android' && foreground.android?.accuracy !== 'fine')) {
        Alert.alert('정확한 위치 권한이 필요해요', '기기 설정에서 밥줄의 정확한 위치를 허용해 주세요.',
          [{ text: '취소', style: 'cancel' }, { text: '설정 열기', onPress: () => { void Linking.openSettings(); } }]);
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) throw new Error('기기의 위치 기능을 켜 주세요.');
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('수집 중 알림을 표시하려면 알림 권한을 허용해 주세요.');
      }
      await startStayService(token); setStatus(getStayStatus());
    } catch (error) {
      Alert.alert('체류 확인을 시작하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.', [{ text: '확인' }]);
    } finally { setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={t.body}>GPS 식당 체류 확인</Text>
    <Text style={t.small}>{status.message}</Text>
    {status.running ? <CustomerButton disabled={busy} onPress={() => {
      setBusy(true); void stopStayService().then(() => setStatus(getStayStatus()))
        .catch(() => Alert.alert('중지하지 못했어요', '수집 중 알림의 중지 버튼을 이용해 주세요.', [{ text: '확인' }]))
        .finally(() => setBusy(false));
    }}>위치 수집 중지</CustomerButton> : hasNativeStayService ? <CustomerButton disabled={busy} onPress={() => Alert.alert(
      'GPS 체류 확인을 시작할까요?',
      '화면을 끄거나 다른 앱을 사용하는 동안에도 정확한 위치를 관측해요. 같은 곳에서 5분 체류하면 그 구간의 GPS 위치를 밥줄 서버로 보내 근처 식당을 조회해요. 원본 위치는 기기에 저장하지 않으며, 앱 또는 수집 중 알림에서 언제든 중지할 수 있어요.',
      [{ text: '취소', style: 'cancel' }, { text: '동의하고 시작', onPress: () => { void start(); } }],
    )}>{busy ? '시작 중...' : '동의하고 체류 확인 시작'}</CustomerButton> : null}
    {status.recommendation?.restaurants.map(restaurant => <Pressable key={restaurant.id} accessibilityRole="button"
      style={styles.candidate} onPress={() => onSelect(restaurant)}>
      <Text style={t.body}>{restaurant.name}</Text><Text style={t.small}>{restaurant.address} {restaurant.floor ?? ''}</Text>
      <Text style={t.small}>현재 위치에서 {restaurant.distanceMeters}m · 입장 확인하기</Text>
    </Pressable>)}
    {status.running && <Text style={[t.small, styles.note]}>강제 종료·전원 꺼짐·권한 취소 시 관측은 중단돼요. GPS만으로 입장을 확정하지 않아요.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: m.rowPadding, gap: m.sectionGap, backgroundColor: c.panel, borderRadius: m.panelRadius },
  candidate: { padding: m.rowPadding, borderWidth: StyleSheet.hairlineWidth, borderColor: c.divider, borderRadius: m.searchRadius },
  note: { color: c.muted },
});
