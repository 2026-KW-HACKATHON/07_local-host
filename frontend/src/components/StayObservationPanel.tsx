import { useEffect, useState } from 'react';
import { AppState, Alert, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../auth/AuthContext';
import { getEligibleStayRestaurants, getStayStatus, hasNativeStayService, startStayService, type StayRestaurant } from '../location/stayService';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { CustomerButton } from './CustomerControls';
import type { Restaurant } from '../api/types';
import { RestaurantBusinessHours } from './RestaurantBusinessHours';

export function StayObservationPanel({ onSelect, restaurants = [] }: { onSelect: (restaurant: StayRestaurant) => void; restaurants?: Restaurant[] }) {
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
    {!status.running && hasNativeStayService ? <CustomerButton disabled={busy} onPress={() => Alert.alert(
      'GPS 체류 확인을 시작할까요?',
      '화면을 끄거나 다른 앱을 사용하는 동안에도 정확한 위치를 관측해요. 같은 곳에서 5분 체류하면 그 구간의 GPS 위치를 밥줄 서버로 보내 50m 안의 식당을 조회하고 제보 알림을 보내요. 원본 위치는 기기에 저장하지 않아요. 수집 중 알림의 중지 버튼 또는 로그아웃으로 언제든 중지할 수 있어요.',
      [{ text: '취소', style: 'cancel' }, { text: '동의하고 시작', onPress: () => { void start(); } }],
    )}>{busy ? '시작 중...' : '동의하고 체류 확인 시작'}</CustomerButton> : null}
    {getEligibleStayRestaurants(status).map(restaurant => {
      const registered = restaurants.find(item => String(item.id) === restaurant.id);
      return <Pressable key={restaurant.id} accessibilityRole="button"
      style={styles.candidate} onPress={() => onSelect(restaurant)}>
      <Text style={t.body}>{restaurant.name}</Text><Text style={t.small}>{restaurant.address} {restaurant.floor ?? ''}</Text>
      <RestaurantBusinessHours openingTime={registered?.openingTime} closingTime={registered?.closingTime} />
      <Text style={t.small}>현재 위치에서 {restaurant.distanceMeters}m · 입장 확인하기</Text>
    </Pressable>; })}
    {status.running && <Text style={[t.small, styles.note]}>같은 곳에서 5분 머무르면 50m 안의 식당을 제보할 수 있어요. 수집 중 알림이나 로그아웃으로 관측을 중지할 수 있어요. 강제 종료·전원 꺼짐·권한 취소 시에도 중단돼요.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: m.rowPadding, gap: m.sectionGap, backgroundColor: c.panel, borderRadius: m.panelRadius },
  candidate: { padding: m.rowPadding, borderRadius: m.searchRadius },
  note: { color: c.muted },
});
