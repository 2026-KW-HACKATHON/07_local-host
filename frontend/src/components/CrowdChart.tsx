import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CrowdChartResponse, CrowdLevel } from '../api/types';
import { customerColors as c, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';
const heights: Record<CrowdLevel, number> = { AVAILABLE: 54, FEW_SEATS: 110, LONG_WAIT: 166, UNKNOWN: 0 };
const colors: Record<CrowdLevel, string> = { AVAILABLE: c.available, FEW_SEATS: c.fewSeats, LONG_WAIT: c.longWait, UNKNOWN: c.neutralButton };
export function CrowdChart({ chart }: { chart: CrowdChartResponse }) {
  if (!chart.data.length) return <Text style={t.body}>아직 통계가 없어요.</Text>;
  return <View style={styles.container}>
    <Text style={[t.small, styles.note]}>낮은 막대일수록 여유로워요 · 회색은 제보 없음</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.plot}>{chart.data.map((point, index) => {
      const date = new Date(point.time);
      const label = Number.isNaN(date.getTime()) ? '—' : `${date.getHours()}시`;
      return <View key={`${point.time}-${index}`} accessibilityLabel={`${label}, ${point.label}`} style={styles.column}>
        <View style={styles.track}><View style={[styles.bar, { height: px(heights[point.level] || 6), backgroundColor: colors[point.level] }]} /></View>
        <Text style={t.small}>{label}</Text>
      </View>;
    })}</View></ScrollView>
    <View style={styles.legend}>{(['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'] as const).map((level, index) =>
      <View key={level} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors[level] }]} /><Text style={t.small}>{['여유', '보통', '혼잡'][index]}</Text></View>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  container: { padding: px(20), gap: px(16) }, note: { color: c.muted },
  plot: { flexDirection: 'row', gap: px(10), paddingBottom: px(8) }, column: { width: px(36), alignItems: 'center', gap: px(8) },
  track: { height: px(180), width: '100%', justifyContent: 'flex-end', borderBottomWidth: 1, borderColor: c.divider },
  bar: { width: px(20), alignSelf: 'center', borderTopLeftRadius: px(4), borderTopRightRadius: px(4) },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: px(20) }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: px(6) },
  dot: { width: px(10), height: px(10), borderRadius: px(5) },
});
