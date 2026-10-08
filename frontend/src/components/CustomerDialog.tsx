import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { customerColors as c, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';
export type CustomerDialogState = { title: string; message: string; confirm: string; cancel?: string; onConfirm?: () => void };
export function CustomerDialog({ value, onClose }: { value: CustomerDialogState | null; onClose: () => void }) {
  return <Modal visible={Boolean(value)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}>
      <Text style={styles.title}>{value?.title}</Text><Text style={styles.message}>{value?.message}</Text>
      <View style={styles.actions}>
        {value?.cancel && <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.action, pressed && styles.inactive]}><Text style={t.body}>{value.cancel}</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => { const action = value?.onConfirm; onClose(); action?.(); }} style={({ pressed }) => [styles.action, pressed && styles.inactive]}><Text style={t.body}>{value?.confirm}</Text></Pressable>
      </View>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: px(36), backgroundColor: 'rgba(0,0,0,0.24)' },
  card: { width: '100%', maxWidth: px(340), borderRadius: px(20), backgroundColor: c.dialog, overflow: 'hidden' },
  title: { ...t.heading, textAlign: 'center', paddingTop: px(24), paddingHorizontal: px(20) },
  message: { ...t.body, textAlign: 'center', padding: px(24) },
  actions: { flexDirection: 'row', gap: px(8), padding: px(12) },
  action: { flex: 1, minHeight: px(58), borderRadius: px(12), backgroundColor: c.brandYellow, alignItems: 'center', justifyContent: 'center' },
  inactive: { backgroundColor: c.neutralButton },
});
