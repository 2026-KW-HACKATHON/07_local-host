import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { aggregateOwnerCrowd, type AnalyticsObservation, type CrowdTieBreak, type HourlyCrowdBucket } from '../owner/analytics';
import { OwnerButton } from './OwnerControls';
import { weekdays } from './OwnerCalendar';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

const days = [1, 2, 3, 4, 5, 6, 0];
const levelColors = [c.available, c.few, c.wait];
const levelLabels = ['여유', '보통', '혼잡'];
const noPoints: readonly AnalyticsObservation[] = [];

export interface OwnerAnalyticsProps {
  restaurantId: number;
  /** Raw categorical observations covering the requested 28-day period, not hourly averages. */
  points?: readonly AnalyticsObservation[];
  tieBreak?: CrowdTieBreak;
  windowEnd?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
}

/** The existing seven-day API cannot supply this view's four-week dataset. */
export function OwnerAnalytics({ restaurantId, points, tieBreak = 'latest', windowEnd,
  loading = false, error = null, onRetry, emptyMessage = '최근 4주 데이터가 없어요.' }: OwnerAnalyticsProps) {
  const [day, setDay] = useState(1);
  const week = useMemo(() => aggregateOwnerCrowd(points ?? noPoints, { endAt: windowEnd, tieBreak }),
    [points, tieBreak, windowEnd, restaurantId]);
  const hours = week[day];
  const hasData = week.some(buckets => buckets.some(bucket => bucket.sampleCount > 0));

  return <View style={styles.content}>
    <Text style={t.title}>데이터</Text>
    <View accessibilityRole="tablist" style={styles.days}>{days.map(value => <Pressable key={value}
      accessibilityRole="tab" accessibilityLabel={`${weekdays[value]}요일`} accessibilityState={{ selected: day === value }}
      onPress={() => setDay(value)} style={[styles.day, day === value && styles.selectedDay]}>
      <Text style={[t.body, day === value && styles.selectedDayText]}>{weekdays[value]}</Text>
    </Pressable>)}</View>
    <Text style={t.heading}>{weekdays[day]}요일 시간대별 혼잡도</Text>
    {loading ? <View style={styles.state}><ActivityIndicator accessibilityLabel="혼잡도 불러오는 중" /></View>
      : error ? <View style={styles.state}><Text style={[t.body, styles.stateText]}>{error}</Text>
        {onRetry && <OwnerButton secondary onPress={onRetry}>다시 시도</OwnerButton>}</View>
      : points === undefined ? <View style={styles.state}><Text style={[t.body, styles.stateText]}>4주 통계가 연결되지 않았어요.</Text></View>
      : <>
        <View style={styles.chartRow}>
          <View style={styles.axis} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={t.small}>혼잡</Text><Text style={t.small}>보통</Text><Text style={t.small}>여유</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.plot}
            accessibilityLabel={`${weekdays[day]}요일, 0시부터 23시까지 시간대별 혼잡도`}>
            {hours.map(bucket => <HourColumn key={bucket.hour} bucket={bucket} day={day} />)}
          </ScrollView>
        </View>
        {!hasData && <Text style={[t.body, styles.stateText]}>{emptyMessage}</Text>}
        {hasData && hours.every(bucket => bucket.sampleCount === 0) &&
          <Text style={[t.body, styles.stateText]}>{weekdays[day]}요일 데이터가 없어요.</Text>}
        <View style={styles.legend}>{levelLabels.map((label, score) => <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: levelColors[score] }]} /><Text style={t.small}>{label}</Text>
        </View>)}</View>
      </>}
  </View>;
}

function HourColumn({ bucket, day }: { bucket: HourlyCrowdBucket; day: number }) {
  const description = bucket.score !== null ? levelLabels[bucket.score] : bucket.tied ? '동률' : '데이터 없음';
  return <View accessible accessibilityLabel={`${weekdays[day]}요일 ${bucket.hour}시, ${description}`} style={styles.column}>
    <View style={styles.track}>
      {bucket.score === null ? <Text style={[t.small, styles.missing]}>{bucket.tied ? '동률' : '—'}</Text>
        : bucket.score === 0 ? <View style={[styles.zeroMarker, { backgroundColor: levelColors[0] }]} />
          : <View style={[styles.bar, { height: px(bucket.score * 88), backgroundColor: levelColors[bucket.score] }]} />}
    </View>
    <Text style={[t.small, styles.hourLabel]}>{bucket.hour}시</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: px(20) },
  days: { flexDirection: 'row', gap: px(4) },
  day: { flex: 1, minHeight: px(44), alignItems: 'center', justifyContent: 'center', borderRadius: px(12), backgroundColor: c.unselectedButton },
  selectedDay: { backgroundColor: c.selectedButton },
  selectedDayText: { color: c.black },
  chartRow: { flexDirection: 'row', gap: px(10) },
  axis: { height: px(190), paddingBottom: px(1), justifyContent: 'space-between' },
  plot: { paddingRight: px(10) },
  column: { width: px(42), gap: px(8), alignItems: 'center' },
  track: { height: px(190), width: '100%', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderColor: c.border },
  bar: { width: px(24), borderTopLeftRadius: px(4), borderTopRightRadius: px(4) },
  zeroMarker: { width: px(24), height: px(4), borderRadius: px(2) },
  missing: { color: c.muted, paddingBottom: px(4) },
  hourLabel: { color: c.muted },
  state: { minHeight: px(220), justifyContent: 'center', gap: px(20) },
  stateText: { color: c.muted, textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: px(20) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: px(6) },
  legendDot: { width: px(10), height: px(10), borderRadius: px(5) },
});
