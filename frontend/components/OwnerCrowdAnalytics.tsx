import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../config/api';

type HourCount = {
  hour: number;
  available: number;
  fewSeats: number;
  longWait: number;
  unknown: number;
  total: number;
};
type WeekdayCount = { weekday: number; total: number; hours: HourCount[] };
type AnalyticsResponse = {
  restaurantId: number;
  days: number;
  from: string;
  through: string;
  total: number;
  weekdays: WeekdayCount[];
};

type Props = { restaurantId: number; token: string; refreshKey?: number };
const labels = ['월', '화', '수', '목', '금', '토', '일'];
const green = '#91F65C';
const red = '#E33B30';

export default function OwnerCrowdAnalytics({ restaurantId, token, refreshKey = 0 }: Props) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState(3); // Wednesday (ISO day)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!restaurantId || !token) {
      setData(null);
      setError('점주 로그인과 식당 선택이 필요합니다.');
      return () => controller.abort();
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/restaurants/${restaurantId}/owner/analytics/weekday-hourly?days=28`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(`서버 응답 ${response.status} — 점주 계정과 식당 ID를 확인하세요.`);
        return (await response.json()) as AnalyticsResponse;
      })
      .then(result => setData(result))
      .catch(e => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(e instanceof Error ? e.message : '통계 데이터를 가져오지 못했습니다.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [restaurantId, token, refreshKey]);

  if (loading && !data) return <ActivityIndicator size="small" style={{ marginVertical: 32 }} />;
  if (error) return <Text style={styles.message}>{error}</Text>;
  if (!data) return null;

  const maxDay = Math.max(1, ...data.weekdays.map(d => d.total));
  const current = data.weekdays.find(d => d.weekday === selectedDay);
  const hours = (current?.hours ?? []).filter(h => h.hour >= 10 && h.hour <= 21);
  const maxHour = Math.max(1, ...hours.map(h => h.total));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>최근 4주 데이터 분석</Text>
      <Text style={styles.subheading}>서버 손님 제보 · {data.from} ~ {data.through} · 총 {data.total}건</Text>
      <View style={styles.weekChart}>
        {data.weekdays.map(d => {
          const selected = d.weekday === selectedDay;
          return (
            <Pressable key={d.weekday} style={styles.day} onPress={() => setSelectedDay(d.weekday)}>
              <View style={styles.barTrack}>
                <View style={{
                  ...styles.bar,
                  height: d.total ? Math.max(5, (d.total / maxDay) * 164) : 0,
                  backgroundColor: d.weekday <= 5 ? green : red,
                  opacity: selected ? 1 : 0.82,
                }} />
              </View>
              <Text style={[styles.dayLabel, selected && styles.selectedLabel]}>{labels[d.weekday - 1]}</Text>
              <Text style={styles.count}>{d.total}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.detailsTitle}>{labels[selectedDay - 1]}요일 시간대별 제보</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.hourChart}>
          {hours.map(h => (
            <View key={h.hour} style={styles.hourItem}>
              <Text style={styles.hourCount}>{h.total || ''}</Text>
              <View style={styles.hourTrack}>
                <View style={{ ...styles.hourBar, height: h.total ? Math.max(4, (h.total / maxHour) * 92) : 0 }} />
              </View>
              <Text style={styles.hourLabel}>{h.hour}시</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.legend}>혼잡 분포: 여유 {current?.hours.reduce((sum, h) => sum + h.available, 0) ?? 0} · 보통 {current?.hours.reduce((sum, h) => sum + h.fewSeats, 0) ?? 0} · 혼잡 {current?.hours.reduce((sum, h) => sum + h.longWait, 0) ?? 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  heading: { color: '#302016', fontSize: 19, fontWeight: '800' },
  subheading: { color: '#777777', fontSize: 11, marginTop: 5 },
  message: { color: '#B03030', paddingVertical: 16 },
  weekChart: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  day: { flex: 1, alignItems: 'center' },
  barTrack: { height: 164, justifyContent: 'flex-end', width: '65%', alignItems: 'center' },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  dayLabel: { marginTop: 8, fontSize: 15, color: '#222222' },
  selectedLabel: { fontWeight: '800' },
  count: { fontSize: 11, color: '#666666', marginTop: 2 },
  detailsTitle: { fontWeight: '700', fontSize: 13, marginTop: 18, marginBottom: 10 },
  hourChart: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4 },
  hourItem: { width: 31, alignItems: 'center' },
  hourCount: { fontSize: 10, color: '#777777', height: 14 },
  hourTrack: { height: 92, width: 19, justifyContent: 'flex-end' },
  hourBar: { width: 19, backgroundColor: '#8DECC0', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  hourLabel: { fontSize: 10, color: '#555555', marginTop: 5 },
  legend: { fontSize: 10, color: '#777777', marginTop: 11 },
});
