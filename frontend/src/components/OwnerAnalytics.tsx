import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getOwnerWeekdayAnalytics, validateOwnerWeekdayAnalytics, type OwnerHourlyCount, type OwnerWeekdayAnalyticsResponse } from '../api/ownerAnalytics';
import { getApiErrorMessage } from '../api/errorMessage';
import { OwnerButton } from './OwnerControls';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

const weekdayNames = ['월', '화', '수', '목', '금', '토', '일'];
const colors = { available: c.available, fewSeats: c.few, longWait: c.wait, unknown: c.muted };
const fields = ['available', 'fewSeats', 'longWait', 'unknown'] as const;
type LevelKey = typeof fields[number];

interface OwnerAnalyticsProps {
  restaurantId: number;
  token: string;
  /** Incremented by parent on pull-to-refresh. */
  refreshKey?: number;
}

/** Actual server reports for the selected owner-owned restaurant (not device-local reports). */
export function OwnerAnalytics({ restaurantId, token, refreshKey = 0 }: OwnerAnalyticsProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [data, setData] = useState<OwnerWeekdayAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => setRetryCount(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    setLoading(true);
    void getOwnerWeekdayAnalytics(restaurantId, token, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) setData(validateOwnerWeekdayAnalytics(response, restaurantId));
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(err, 'request'));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [restaurantId, token, refreshKey, retryCount]);

  const maxDay = Math.max(1, ...(data?.weekdays.map(d => d.total) ?? []));
  const day = data?.weekdays.find(item => item.weekday === selectedDay);
  const hours = day?.hours.filter(bucket => bucket.hour >= 10 && bucket.hour <= 21) ?? [];
  const maxHour = Math.max(1, ...hours.map(bucket => bucket.total));
  const distribution = fields.map(key => ({ key, count: day?.hours.reduce((sum, h) => sum + h[key], 0) ?? 0 }));

  return <View style={styles.content}>
    <Text style={t.title}>최근 4주 데이터 분석</Text>
    <Text style={[t.small, styles.caption]}>서버 전체 제보 · 오늘 제외 · {data ? `${data.from} ~ ${data.through}` : '지난 28일'}</Text>
    {loading ? <View style={styles.state}><ActivityIndicator accessibilityLabel="통계 불러오는 중" color={c.black}/></View> :
      error ? <View style={styles.state}><Text style={[t.body, styles.stateText]}>{error}</Text>
        <OwnerButton onPress={retry}>다시 불러오기</OwnerButton></View> :
      data ? <>
        <Text style={[t.small, styles.caption]}>전체 {data.total}건 · 막대를 누르면 요일별 시간대를 볼 수 있어요.</Text>
        <View style={styles.weekChart}>{data.weekdays.map(d => <Pressable key={d.weekday}
          accessibilityRole="button" accessibilityLabel={`${weekdayNames[d.weekday - 1]}요일, 제보 ${d.total}건`}
          accessibilityState={{ selected: selectedDay === d.weekday }}
          onPress={() => setSelectedDay(d.weekday)} style={styles.day}>
          <View style={styles.weekTrack}><View style={[styles.weekBar, {
            height: d.total === 0 ? 0 : Math.max(px(4), d.total / maxDay * px(148)),
            backgroundColor: d.weekday <= 5 ? c.available : c.wait,
            opacity: selectedDay === d.weekday ? 1 : 0.8,
          }]} /></View>
          <Text style={[t.body, selectedDay === d.weekday && styles.selectedDay]}>{weekdayNames[d.weekday - 1]}</Text>
          <Text style={t.small}>{d.total}</Text>
        </Pressable>)}</View>
        <Text style={t.heading}>{weekdayNames[selectedDay - 1]}요일 시간대별 제보</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hours}
          accessibilityLabel={`${weekdayNames[selectedDay - 1]}요일 10시부터 21시까지 시간대별 제보`}>{hours.map(bucket =>
          <HourColumn key={bucket.hour} bucket={bucket} maxHour={maxHour}/>)}
        </ScrollView>
        <View style={styles.legend}>{distribution.map(({ key, count }) => <View key={key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors[key] }]}/><Text style={t.small}>
            {key === 'available' ? '바로 앉음' : key === 'fewSeats' ? '자리 적음' : key === 'longWait' ? '대기 길음' : '미확인'} {count}
          </Text></View>)}</View>
        {data.total === 0 && <Text style={[t.body, styles.stateText]}>최근 4주 제보가 없어요.</Text>}
        {data.total > 0 && day?.total === 0 && <Text style={[t.body, styles.stateText]}>이 요일에는 제보가 없어요.</Text>}
        <OwnerButton onPress={retry}>서버 데이터 새로고침</OwnerButton>
      </> : <View style={styles.state}><Text style={t.body}>통계 데이터가 없어요.</Text><OwnerButton onPress={retry}>다시 불러오기</OwnerButton></View>}
  </View>;
}

function HourColumn({ bucket, maxHour }: { bucket: OwnerHourlyCount; maxHour: number }) {
  const height = bucket.total === 0 ? 0 : Math.max(px(4), bucket.total / maxHour * px(110));
  const label = `${bucket.hour}시, 총 ${bucket.total}건, 바로 앉음 ${bucket.available}건, 자리 적음 ${bucket.fewSeats}건, 대기 길음 ${bucket.longWait}건`;
  return <View style={styles.hourColumn} accessible accessibilityLabel={label}>
    <Text style={t.small}>{bucket.total || '—'}</Text>
    <View style={styles.hourTrack}><View style={{ height, width: px(24), justifyContent: 'flex-end' }}>
      {fields.map((key: LevelKey) => bucket[key] > 0 ? <View key={key} style={{
        height: height * bucket[key] / bucket.total, backgroundColor: colors[key], width: '100%',
      }} /> : null)}
    </View></View>
    <Text style={t.small}>{bucket.hour}시</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: px(14), paddingBottom: px(10) },
  caption: { color: c.muted },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', gap: px(2) },
  day: { flex: 1, alignItems: 'center', minWidth: 0, gap: px(5) },
  weekTrack: { height: px(152), width: '70%', justifyContent: 'flex-end', alignItems: 'center' },
  weekBar: { width: '100%', borderTopLeftRadius: px(3), borderTopRightRadius: px(3) },
  selectedDay: { fontWeight: '800', color: c.black },
  hours: { alignItems: 'flex-end', gap: px(5), paddingVertical: px(6) },
  hourColumn: { width: px(38), alignItems: 'center', gap: px(6) },
  hourTrack: { height: px(116), width: px(26), justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderColor: c.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: px(9) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: px(4) },
  legendDot: { width: px(9), height: px(9), borderRadius: px(5) },
  state: { minHeight: px(220), justifyContent: 'center', gap: px(18) },
  stateText: { textAlign: 'center', color: c.muted },
});
