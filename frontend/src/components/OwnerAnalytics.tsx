import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCrowdChart } from '../api/crowd';
import type { CrowdChartPoint } from '../api/types';
import { OwnerBack, OwnerButton, OwnerNotice } from './OwnerControls';
import { weekdays } from './OwnerCalendar';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

const days = [1, 2, 3, 4, 5, 6, 0];
export function OwnerAnalytics({ restaurantId }: { restaurantId: number }) {
  const [period, setPeriod] = useState<7 | 28>(28);
  const [day, setDay] = useState<number | null>(null);
  const [points, setPoints] = useState<CrowdChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (day === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setDay(null); return true; });
    return () => sub.remove();
  }, [day]);
  useEffect(() => {
    let active = true;
    setPoints([]); setError(false); setLoading(false);
    if (period === 28) return;
    setLoading(true);
    void getCrowdChart(restaurantId, 168).then(result => { if (active) setPoints(result.data); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, restaurantId, reload]);
  const valid = period === 28 ? [] : points.filter(p => p.level !== 'UNKNOWN' && Number.isFinite(p.score) && p.score >= 0 && p.score <= 2 && !Number.isNaN(new Date(p.time).getTime()));
  return <View style={styles.content}>
    {day !== null && <OwnerBack onPress={() => setDay(null)} />}
    <Text style={t.title}>{day === null ? `최근 ${period === 28 ? '4주' : '7일'} 데이터 분석` : `${weekdays[day]}요일 시간대 분석`}</Text>
    <View style={styles.switch}>{([28, 7] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: period === value }}
      onPress={() => { setPeriod(value); setDay(null); }} style={[styles.period, period === value && styles.selected]}><Text style={t.small}>{value === 28 ? '최근 4주' : '최근 7일'}</Text></Pressable>)}</View>
    {loading ? <ActivityIndicator /> : error ? <><OwnerNotice>통계를 불러오지 못했어요.</OwnerNotice><OwnerButton onPress={() => setReload(v => v + 1)}>다시 시도</OwnerButton></> : <>
      {day === null ? <View style={styles.plot}>{days.map(value => {
        const items = valid.filter(p => new Date(p.time).getDay() === value);
        const score = items.length ? items.reduce((sum, p) => sum + p.score, 0) / items.length : null;
        return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${weekdays[value]}요일 시간대 분석${score === null ? ', 데이터 없음' : `, 혼잡도 ${score.toFixed(1)}`}`}
          onPress={() => setDay(value)} style={styles.column}>
          <View style={styles.track}>{score === null ? <Text style={t.small}>—</Text> : <>
            <Text style={t.small}>{score.toFixed(1)}</Text><View style={[styles.bar, { height: px(24 + score * 110), backgroundColor: score < 0.5 ? c.available : score < 1.5 ? c.few : c.wait }]} /></>}</View>
          <Text style={t.heading}>{weekdays[value]}</Text>
        </Pressable>;
      })}</View> : <HourlyLine points={valid.filter(p => new Date(p.time).getDay() === day)} />}
      <OwnerNotice>{period === 28 ? '최근 4주 분석은 준비 중이에요. 현재는 최근 7일의 데이터를 확인할 수 있어요.' :
        '시간별 혼잡도 점수의 평균이에요. 0은 여유, 1은 보통, 2는 혼잡을 뜻해요. 제보가 없는 시간은 평균에서 제외해요.'}</OwnerNotice>
      {day === null && <OwnerNotice>요일을 누르면 시간대별 혼잡도를 확인할 수 있어요.</OwnerNotice>}
    </>}
  </View>;
}

// 선 그래프 안의 좌표만 절대 배치한다. 화면/카드 배치는 Flex를 사용한다.
function HourlyLine({ points }: { points: CrowdChartPoint[] }) {
  const [width, setWidth] = useState(0);
  const height = px(240);
  const values = Array.from({ length: 24 }, (_, hour) => {
    const group = points.filter(p => new Date(p.time).getHours() === hour);
    return group.length ? group.reduce((sum, p) => sum + p.score, 0) / group.length : null;
  });
  const plotWidth = Math.max(0, width - px(12));
  const x = (i: number) => px(6) + i / 23 * plotWidth;
  const y = (v: number) => height - px(8) - v / 2 * (height - px(16));
  return <View style={styles.lineWrap}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[styles.linePlot, { height }]} accessibilityLabel="시간별 혼잡도 선 그래프">
      {width > 0 && values.map((value, i) => {
        if (value === null) return null;
        const next = values[i + 1];
        const dx = x(i + 1) - x(i); const dy = next === null || next === undefined ? 0 : y(next) - y(value);
        const length = Math.sqrt(dx * dx + dy * dy);
        return <View key={i}>
          <View style={[styles.dot, { left: x(i) - px(3), top: y(value) - px(3) }]} />
          {next !== null && next !== undefined && <View style={[styles.line, { width: length, left: (x(i) + x(i + 1)) / 2 - length / 2,
            top: (y(value) + y(next)) / 2, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }]} />}
        </View>;
      })}
      {!points.length && <View style={styles.empty}><Text style={t.body}>아직 분석할 데이터가 없어요.</Text></View>}
    </View>
    <View style={styles.labels}>{[0, 6, 12, 18, 23].map(hour => <Text key={hour} style={t.small}>{hour}시</Text>)}</View>
    {points.length > 0 && <Text style={t.small}>{values.flatMap((v, i) => v === null ? [] : [`${i}시 ${v.toFixed(1)}`]).join(' · ')}</Text>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: px(20) }, switch: { flexDirection: 'row', gap: px(10) }, period: { paddingHorizontal: px(18), minHeight: px(44), justifyContent: 'center', borderRadius: px(12), backgroundColor: c.row },
  selected: { backgroundColor: c.edit, borderWidth: 1, borderColor: c.black }, plot: { flexDirection: 'row', gap: px(8), paddingTop: px(20) },
  column: { flex: 1, alignItems: 'center', gap: px(10) }, track: { width: '100%', height: px(300), justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderColor: c.border },
  bar: { width: '80%', marginTop: px(8) }, lineWrap: { gap: px(12), paddingTop: px(32) }, linePlot: { borderBottomWidth: 1, borderLeftWidth: 1, borderColor: c.border },
  line: { position: 'absolute', height: px(3), backgroundColor: c.black }, dot: { position: 'absolute', width: px(6), height: px(6), borderRadius: px(3), backgroundColor: c.black },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' }, labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
