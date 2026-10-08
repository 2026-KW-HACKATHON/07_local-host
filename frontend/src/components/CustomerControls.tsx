import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CrowdLevel } from '../api/types';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';
import { AppIcon } from './AppIcon';

export type CustomerTab = 'home' | 'report' | 'my';
const tabs: { key: CustomerTab; label: string }[] = [
  { key: 'home', label: '홈' }, { key: 'report', label: '제보' }, { key: 'my', label: 'My' },
];

export function CustomerNavigation({ selected, onSelect }: {
  selected: CustomerTab; onSelect: (tab: CustomerTab) => void;
}) {
  return <View style={styles.navigation} accessibilityRole="tablist">
    {tabs.map(({ key, label }) => <Pressable key={key} testID={`customer-tab-${key}`}
      accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: selected === key }}
      onPress={() => onSelect(key)} style={styles.tab}>
      <View style={styles.iconSlot} pointerEvents="none"><AppIcon name={key === 'home' ? 'home' : key === 'report' ? 'marketing' : 'person'} size={30} color={selected === key ? c.black : c.white} /></View>
      <Text style={[styles.tabLabel, { color: selected === key ? c.black : c.white }]}>{label}</Text>
    </Pressable>)}
  </View>;
}

export function CustomerSearch({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit?: () => void }) {
  return <View style={styles.search}><AppIcon name="search" size={24} color={c.searchText} /><TextInput accessibilityLabel="식당 검색" testID="customer-search" placeholder="식당 검색..."
    placeholderTextColor={c.searchText} value={value} onChangeText={onChange}
    returnKeyType="search" onSubmitEditing={onSubmit} autoCorrect={false} style={styles.searchInput} />
    {onSubmit && <Pressable accessibilityRole="button" accessibilityLabel="네이버 지도에서 식당 검색" onPress={onSubmit} style={styles.searchAction}>
      <Text style={t.small}>검색</Text>
    </Pressable>}</View>;
}

export const crowdLabels: Record<CrowdLevel, string> = {
  AVAILABLE: '바로 앉아요', FEW_SEATS: '자리가 적어요', LONG_WAIT: '대기가 길어요', UNKNOWN: '아직 제보가 없어요',
};

export function CrowdBadge({ level }: { level: CrowdLevel }) {
  const color = { AVAILABLE: c.available, FEW_SEATS: c.fewSeats, LONG_WAIT: c.longWait, UNKNOWN: c.muted }[level];
  return <View style={styles.badge}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={t.body}>{crowdLabels[level]}</Text>
  </View>;
}

export function CustomerButton({ children, onPress, disabled = false }: PropsWithChildren<{
  onPress: () => void; disabled?: boolean;
}>) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
    <Text style={[t.body, styles.buttonLabel]}>{children}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  navigation: { height: m.navigationHeight, flexDirection: 'row', backgroundColor: c.neutralButton },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: px(4) },
  iconSlot: { width: m.iconSlot, height: m.iconSlot, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { ...t.small, fontWeight: '400' },
  search: { width: m.searchWidth, maxWidth: '100%', minHeight: m.searchHeight, flexDirection: 'row', alignItems: 'center', gap: px(12),
    borderRadius: m.searchRadius, backgroundColor: c.neutralButton, paddingHorizontal: px(20) },
  searchInput: { ...t.heading, flex: 1, minHeight: m.searchHeight, paddingVertical: px(12), color: c.black, includeFontPadding: false, textAlignVertical: 'center' },
  searchAction: { minWidth: px(44), minHeight: px(48), alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: px(8), flexShrink: 1 },
  dot: { width: px(18), height: px(18), borderRadius: px(9) },
  button: { minHeight: px(62), backgroundColor: c.primary, borderRadius: px(16), justifyContent: 'center', alignItems: 'center', padding: px(12) },
  disabled: { opacity: 0.45 },
  buttonLabel: { color: c.white, textAlign: 'center' },
});
