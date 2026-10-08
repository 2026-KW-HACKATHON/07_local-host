import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';
export const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
export function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function OwnerCalendar({ value, onSelect, onClose }: { value: string; onSelect: (date: string) => void; onClose: () => void }) {
  const [month, setMonth] = useState(() => { const d = value ? new Date(`${value}T12:00:00`) : new Date(); return Number.isNaN(d.getTime()) ? new Date() : d; });
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + count) / 7) * 7 }, (_, i) => i - first + 1);
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.card} accessibilityViewIsModal>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="이전 달" style={styles.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={t.heading}>‹</Text></Pressable>
      <Text style={t.body}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="다음 달" style={styles.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={t.heading}>›</Text></Pressable></View>
    <View style={styles.grid}>{weekdays.map(day => <View style={styles.cell} key={day}><Text style={t.small}>{day}</Text></View>)}
      {cells.map((day, i) => { const valid = day > 0 && day <= count; const date = localDate(new Date(month.getFullYear(), month.getMonth(), day));
        return <Pressable key={i} disabled={!valid} accessibilityRole="button" accessibilityLabel={valid ? `${date} 선택` : undefined}
          accessibilityState={{ selected: valid && value === date, disabled: !valid }} onPress={() => { onSelect(date); onClose(); }} style={({ pressed }) => [styles.cell, valid && (value === date || pressed) && styles.selected]}>
          <Text style={t.body}>{valid ? day : ''}</Text></Pressable>; })}</View>
    <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.selected]}><Text style={t.body}>닫기</Text></Pressable>
  </View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.24)', justifyContent: 'center', alignItems: 'center', padding: px(20) },
  card: { backgroundColor: c.white, width: '100%', maxWidth: px(380), borderRadius: px(20), padding: px(12) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, arrow: { minWidth: px(44), minHeight: px(44), alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.2857%', minHeight: px(44), alignItems: 'center', justifyContent: 'center', borderRadius: px(8) },
  selected: { backgroundColor: c.neutralButton }, close: { minHeight: px(48), borderRadius: px(12), backgroundColor: c.brandYellow, alignItems: 'center', justifyContent: 'center' },
});
