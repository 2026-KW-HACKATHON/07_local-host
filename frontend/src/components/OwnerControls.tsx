import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { AppIcon } from './AppIcon';
import { ownerColors as c, ownerSpace as s, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

export type OwnerTab = 'report' | 'promotion' | 'data' | 'my';
export function OwnerNavigation({ tab, onSelect, disabled }: { tab: OwnerTab; onSelect: (value: OwnerTab) => void; disabled: boolean }) {
  return <View accessibilityRole="tablist" style={styles.nav}>{([
    ['report', '제보', 'marketing'], ['promotion', '프로모션', 'point'], ['data', '데이터', 'data'], ['my', 'My', 'person'],
  ] as const).map(([value, label, icon]) => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label}
    accessibilityState={{ selected: tab === value, disabled }} disabled={disabled} testID={`owner-tab-${value}`}
    onPress={() => onSelect(value)} style={styles.tab}>
    <AppIcon name={icon} size={30} color={tab === value ? c.black : c.white} />
    <Text style={[t.small, { color: tab === value ? c.black : c.white }]}>{label}</Text>
  </Pressable>)}</View>;
}
export function OwnerButton({ children, onPress, disabled = false, secondary = false }: PropsWithChildren<{
  onPress: () => void; disabled?: boolean; secondary?: boolean;
}>) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && styles.dim]}>
    <Text style={[t.body, { color: secondary ? c.black : c.white, textAlign: 'center' }]}>{children}</Text>
  </Pressable>;
}
export function OwnerField({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.fieldGroup}><Text style={t.body}>{label}</Text><TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label}
    placeholderTextColor={c.placeholder} style={[styles.input, props.multiline && styles.multiline, props.style]} /></View>;
}
export function OwnerInfoRow({ label, value, onPress, action = '수정' }: { label: string; value: string; onPress: () => void; action?: string }) {
  return <View style={styles.info}><Text style={t.heading}>{label}</Text><View style={styles.infoRow}>
    <Text style={[t.body, styles.value]}>{value}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label} ${action}`} onPress={onPress} style={styles.edit}>
      <Text style={t.body}>{action}</Text></Pressable></View></View>;
}
export function OwnerNotice({ children }: PropsWithChildren) { return <Text style={[t.small, styles.note]}>{children}</Text>; }
export function OwnerBack({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로 돌아가기" disabled={disabled} onPress={onPress} style={styles.back}><Text style={t.body}>‹ 뒤로</Text></Pressable>;
}
const styles = StyleSheet.create({
  nav: { height: s.navigation, flexDirection: 'row', backgroundColor: c.neutralButton },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: px(5) },
  button: { minHeight: s.control, padding: px(12), backgroundColor: c.primary, borderRadius: s.radius, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: c.row }, dim: { opacity: 0.45 },
  fieldGroup: { gap: px(8) }, input: { ...t.body, minHeight: s.control, paddingHorizontal: px(18), paddingVertical: px(12), borderRadius: s.radius, backgroundColor: c.field, color: c.black },
  multiline: { minHeight: px(100), textAlignVertical: 'top' },
  info: { gap: px(6) }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: px(12), minHeight: s.control, padding: px(12), borderRadius: s.radius, backgroundColor: c.row },
  value: { flex: 1, color: c.muted }, edit: { minHeight: px(44), minWidth: px(50), paddingHorizontal: px(7), borderWidth: 1, borderColor: c.border, borderRadius: px(8), backgroundColor: c.edit, justifyContent: 'center', alignItems: 'center' },
  note: { color: c.muted }, back: { minHeight: px(44), justifyContent: 'center', alignSelf: 'flex-start' },
});
