import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getRestaurants } from '../api/restaurants';
import { getCurrentCrowd, reportCrowd } from '../api/crowd';
import { getActivePromotions, getManagedPromotions, updatePromotion } from '../api/promotions';
import { getApiErrorMessage } from '../api/errorMessage';
import type { Restaurant, Promotion, CrowdStatusResponse, ReportableCrowdLevel } from '../api/types';
import { colors, fonts, px } from '../theme/tokens';

const levels: [ReportableCrowdLevel, string][] = [
  ['AVAILABLE', '바로 앉아요'], ['FEW_SEATS', '자리가 적어요'], ['LONG_WAIT', '대기가 길어요'],
];

export function RestaurantHomeScreen({ onLogout }: { onLogout: () => void }) {
  const { user, token, logout } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [crowd, setCrowd] = useState<CrowdStatusResponse | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const owner = user?.role === 'OWNER';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (selected) {
        const [status, offers] = await Promise.all([
          getCurrentCrowd(selected.id),
          owner && token ? getManagedPromotions(selected.id, token) : getActivePromotions(selected.id),
        ]);
        setCrowd(status);
        setPromotions(offers);
      } else {
        const all = await getRestaurants();
        setRestaurants(owner ? all.filter(item => item.ownerId === user?.id) : all);
      }
    } catch (e) { setError(getApiErrorMessage(e, 'request')); }
    finally { setLoading(false); }
  }, [selected, owner, token, user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); await refresh(); }
    catch (e) { Alert.alert('처리하지 못했어요', getApiErrorMessage(e, 'request'), [{ text: '확인' }]); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.heading}>{owner ? '내 식당 관리' : '식당 둘러보기'}</Text>
        <Pressable onPress={() => void logout().then(onLogout)}><Text style={styles.link}>로그아웃</Text></Pressable>
      </View>
      <Text style={styles.text}>{user?.nickname}님, 환영해요.</Text>
      {selected && <Pressable onPress={() => { setSelected(null); setCrowd(null); setPromotions([]); }}><Text style={styles.link}>목록으로</Text></Pressable>}
      {loading ? <ActivityIndicator color={colors.primary} /> : error ? (
        <View style={styles.card}><Text style={styles.text}>{error}</Text><Pressable onPress={() => void refresh()}><Text style={styles.link}>다시 시도</Text></Pressable></View>
      ) : selected ? (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>{selected.name}</Text>
            <Text style={styles.text}>{selected.address}</Text>
            <Text style={styles.text}>{selected.openingTime} ~ {selected.closingTime}</Text>
            <Text style={styles.text}>현재 혼잡도: {crowd?.label ?? '정보 없음'}</Text>
            <Text style={styles.text}>최근 제보 {crowd?.reportCount ?? 0}건</Text>
            {levels.map(([level, label]) => <Pressable key={level} disabled={busy || !token} style={({ pressed }) => [styles.button, (busy || !token || pressed) && styles.inactive]}
              onPress={() => void mutate(() => reportCrowd(selected.id, { level }, token!))}>
              <Text style={styles.text}>{label} · 제보</Text>
            </Pressable>)}
          </View>
          <Text style={styles.heading}>{owner ? '프로모션 관리' : '진행 중인 프로모션'}</Text>
          {!promotions.length && <Text style={styles.text}>등록된 프로모션이 없어요.</Text>}
          {promotions.map(p => <View style={styles.card} key={p.id}>
            <Text style={styles.heading}>{p.title}</Text><Text style={styles.text}>{p.description}</Text>
            <Text style={styles.text}>{p.discountPercent}% 할인</Text>
            {owner && <Pressable disabled={busy || !token} onPress={() => void mutate(() => updatePromotion(selected.id, p.id, {
              title: p.title, description: p.description, discountPercent: p.discountPercent,
              startAt: p.startAt, endAt: p.endAt, enabled: !p.enabled,
            }, token!))}><Text style={styles.link}>{p.enabled ? '프로모션 끄기' : '프로모션 켜기'}</Text></Pressable>}
          </View>)}
        </>
      ) : restaurants.length ? restaurants.map(r => <Pressable key={r.id} style={styles.card} onPress={() => setSelected(r)}>
        <Text style={styles.heading}>{r.name}</Text><Text style={styles.text}>{r.address}</Text><Text style={styles.link}>상세 보기</Text>
      </Pressable>) : <Text style={styles.text}>등록된 식당이 없어요.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.white, padding: px(20), paddingTop: px(48), gap: px(20) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontFamily: fonts.bold, fontSize: px(24), lineHeight: px(32), color: colors.black },
  text: { fontFamily: fonts.regular, fontSize: px(18), lineHeight: px(26), color: colors.black },
  link: { fontFamily: fonts.medium, fontSize: px(18), lineHeight: px(26), color: colors.primary },
  card: { backgroundColor: colors.guest, padding: px(20), borderRadius: px(16), gap: px(12) },
  button: { backgroundColor: colors.brandYellow, padding: px(12), borderRadius: px(16) },
  inactive: { backgroundColor: colors.unselectedButton },
});
