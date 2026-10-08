import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerButton, OwnerField } from './OwnerControls';
import { OwnerCalendar, weekdays } from './OwnerCalendar';
import { clonePromotionSchedule, emptyPromotionSchedule, isOvernightPromotionRange, koreaScheduleDate,
  validatePromotionSchedule, type PromotionSchedule, type PromotionTimeRange } from '../coupons/schedule';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

export type { PromotionSchedule } from '../coupons/schedule';
export interface PromotionOptionsFormProps {
  benefit: string;
  initial?: PromotionSchedule;
  initialPointsCost?: number;
  busy: boolean;
  onSave: (schedule: PromotionSchedule, pointsCost: number) => void;
  /** Optional product-approved explanation separating publication end from coupon expiry. */
  expiryDescription?: string;
}

const orderedDays = [1, 2, 3, 4, 5, 6, 0];
const pointPresets = Array.from({ length: 10 }, (_, index) => (index + 1) * 500);
const blankRange = (): PromotionTimeRange => ({ start: '', end: '' });

export function PromotionOptionsForm({ benefit, initial, initialPointsCost, busy, onSave, expiryDescription }: PromotionOptionsFormProps) {
  const [schedule, setSchedule] = useState(() => clonePromotionSchedule(initial ?? emptyPromotionSchedule()));
  const [pointsText, setPointsText] = useState(initialPointsCost === undefined ? '' : String(initialPointsCost));
  const [pointsOpen, setPointsOpen] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [error, setError] = useState('');
  const update = (change: Partial<PromotionSchedule>) => {
    if (busy) return;
    setSchedule(previous => ({ ...previous, ...change })); setError('');
  };
  const selectDay = (day: number) => {
    if (busy || schedule.unrestrictedDays) return;
    const days = schedule.days.includes(day) ? schedule.days.filter(value => value !== day) : [...schedule.days, day];
    update({ days, dailyRanges: schedule.dailyRanges[String(day)] ? schedule.dailyRanges : { ...schedule.dailyRanges, [day]: [blankRange()] } });
  };
  const save = () => {
    if (busy) return;
    const message = validatePromotionSchedule(schedule, { today: koreaScheduleDate() });
    if (message) { setError(message); return; }
    const pointsCost = Number(pointsText);
    if (!/^[1-9]\d*$/.test(pointsText) || !Number.isSafeInteger(pointsCost) || pointsCost < 500 || pointsCost % 500 !== 0) {
      setError('교환 포인트를 500P 이상의 500P 단위로 선택하거나 입력해 주세요.'); return;
    }
    setError(''); onSave(clonePromotionSchedule(schedule), pointsCost);
  };
  return <View style={styles.form}>
    <Text style={t.title}>프로모션 발행</Text>
    <View style={styles.benefit}><Text style={t.body}>{benefit}</Text></View>
    <View style={styles.section}>
      <Text style={t.heading}>쿠폰 교환 포인트</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="교환 포인트 선택" accessibilityState={{ expanded: pointsOpen, disabled: busy }} disabled={busy}
        onPress={() => setPointsOpen(!pointsOpen)} style={[styles.pointsSelector, busy && styles.disabled]}>
        <Text style={[t.body, styles.flex]}>{pointsText ? `${pointsText}P` : '포인트 선택'}</Text><Text style={t.body}>{pointsOpen ? '∧' : '∨'}</Text>
      </Pressable>
      {pointsOpen && <ScrollView nestedScrollEnabled style={styles.pointsMenu} contentContainerStyle={styles.pointsMenuContent}>
        {pointPresets.map(points => <Pressable key={points} accessibilityRole="radio" accessibilityLabel={`${points} 포인트`}
          accessibilityState={{ checked: pointsText === String(points), disabled: busy }} disabled={busy}
          onPress={() => { setPointsText(String(points)); setPointsOpen(false); setError(''); }} style={[styles.pointsOption, pointsText === String(points) && styles.selected]}>
          <Text style={t.body}>{points.toLocaleString('ko-KR')}P</Text>
        </Pressable>)}
      </ScrollView>}
      <OwnerField label="직접 입력 (500P 단위)" placeholder="예) 3500" value={pointsText} keyboardType="number-pad" maxLength={16} editable={!busy}
        onChangeText={text => { setPointsText(text); setError(''); }} />
    </View>
    <View style={styles.section}>
      <Text style={t.heading}>프로모션 발행 종료일</Text>
      {!!expiryDescription && <Text style={[t.small, styles.note]}>{expiryDescription}</Text>}
      <Option label="유효기간 없음" checked={schedule.noEndDate} disabled={busy} onPress={() => update({ noEndDate: !schedule.noEndDate })} />
      <OwnerButton secondary disabled={busy || schedule.noEndDate} onPress={() => setCalendar(true)}>{schedule.endDate || '종료일 선택'}</OwnerButton>
    </View>
    <View style={styles.section}>
      <Text style={t.heading}>쿠폰 사용 요일</Text>
      <Option label="요일 제한 없음" checked={schedule.unrestrictedDays} disabled={busy} onPress={() => update({ unrestrictedDays: !schedule.unrestrictedDays })} />
      <View style={[styles.days, schedule.unrestrictedDays && styles.disabled]}>{orderedDays.map(day => <Pressable key={day}
        accessibilityRole="checkbox" accessibilityLabel={`${weekdays[day]}요일 적용`} accessibilityState={{ checked: schedule.days.includes(day), disabled: busy || schedule.unrestrictedDays }}
        disabled={busy || schedule.unrestrictedDays} onPress={() => selectDay(day)} style={[styles.day, schedule.days.includes(day) && styles.selected]}>
        <Text style={t.body}>{weekdays[day]}</Text>
      </Pressable>)}</View>
    </View>
    <View style={styles.section}>
      <Text style={t.heading}>쿠폰 사용 시간</Text>
      <Option label="시간 제한 없음" checked={schedule.unrestrictedTimes} disabled={busy} onPress={() => update({ unrestrictedTimes: !schedule.unrestrictedTimes })} />
      {schedule.unrestrictedDays ? <RangesEditor title="매일 적용하는 시간" ranges={schedule.commonRanges}
        disabled={busy || schedule.unrestrictedTimes} onChange={commonRanges => update({ commonRanges })} />
        : orderedDays.filter(day => schedule.days.includes(day)).map(day => <RangesEditor key={day} title={`${weekdays[day]}요일`}
          ranges={schedule.dailyRanges[String(day)] ?? []} disabled={busy || schedule.unrestrictedTimes}
          onChange={ranges => update({ dailyRanges: { ...schedule.dailyRanges, [day]: ranges } })} />)}
      {!schedule.unrestrictedDays && !schedule.days.length && <Text style={[t.small, styles.note]}>적용할 요일을 먼저 선택해 주세요.</Text>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={[t.small, styles.error]}>{error}</Text>}
    <OwnerButton disabled={busy} onPress={save}>{busy ? '발행 중...' : '발행하기'}</OwnerButton>
    {calendar && <OwnerCalendar value={schedule.endDate} onSelect={endDate => update({ endDate })} onClose={() => setCalendar(false)} />}
  </View>;
}

function Option({ label, checked, disabled, onPress }: { label: string; checked: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled}
    onPress={onPress} style={[styles.option, disabled && styles.disabled]}>
    <View style={[styles.checkbox, checked && styles.selected]}><Text style={t.body}>{checked ? '✓' : ''}</Text></View>
    <Text style={[t.body, styles.flex]}>{label}</Text>
  </Pressable>;
}

function RangesEditor({ title, ranges, disabled, onChange }: { title: string; ranges: PromotionTimeRange[]; disabled: boolean; onChange: (ranges: PromotionTimeRange[]) => void }) {
  const change = (index: number, key: keyof PromotionTimeRange, value: string) => {
    if (!disabled) onChange(ranges.map((range, i) => i === index ? { ...range, [key]: value } : range));
  };
  return <View style={[styles.ranges, disabled && styles.disabled]}>
    <Text style={t.body}>{title}</Text>
    {ranges.map((range, index) => <View key={index} style={styles.range}>
      <View style={styles.row}>
        <View style={styles.flex}><OwnerField label={`시작 ${index + 1}`} accessibilityLabel={`${title} 시작 ${index + 1}`} placeholder="HH:mm" value={range.start} onChangeText={value => change(index, 'start', value)} maxLength={5} keyboardType="numbers-and-punctuation" editable={!disabled} /></View>
        <Text style={[t.body, styles.tilde]}>~</Text>
        <View style={styles.flex}><OwnerField label={`종료 ${index + 1}`} accessibilityLabel={`${title} 종료 ${index + 1}`} placeholder="HH:mm" value={range.end} onChangeText={value => change(index, 'end', value)} maxLength={5} keyboardType="numbers-and-punctuation" editable={!disabled} /></View>
      </View>
      <View style={styles.rangeFooter}>{isOvernightPromotionRange(range) && <Text style={[t.small, styles.note]}>다음 날 {range.end}까지</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${index + 1}번 시간 구간 삭제`} disabled={disabled}
          onPress={() => onChange(ranges.filter((_, i) => i !== index))} style={styles.remove}><Text style={[t.small, styles.note]}>구간 삭제</Text></Pressable>
      </View>
    </View>)}
    <OwnerButton secondary disabled={disabled} onPress={() => onChange([...ranges, blankRange()])}>+ 시간 구간 추가</OwnerButton>
  </View>;
}

const styles = StyleSheet.create({
  form: { gap: px(24), paddingBottom: px(16) },
  benefit: { backgroundColor: c.row, borderRadius: px(16), padding: px(16) },
  section: { gap: px(12) },
  pointsSelector: { flexDirection: 'row', gap: px(8), minHeight: px(58), alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: px(12), paddingHorizontal: px(16) },
  pointsMenu: { maxHeight: px(190), borderWidth: 1, borderColor: c.border, borderRadius: px(12) },
  pointsMenuContent: { padding: px(4) },
  pointsOption: { minHeight: px(48), paddingHorizontal: px(12), justifyContent: 'center', borderRadius: px(8) },
  days: { flexDirection: 'row', gap: px(4) },
  day: { flex: 1, minHeight: px(44), alignItems: 'center', justifyContent: 'center', borderRadius: px(8), backgroundColor: c.row, borderWidth: 1, borderColor: c.row },
  selected: { backgroundColor: c.edit, borderColor: c.black },
  option: { flexDirection: 'row', alignItems: 'center', gap: px(10), minHeight: px(44) },
  checkbox: { width: px(26), height: px(26), borderWidth: 1, borderColor: c.border, borderRadius: px(4), alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: px(8) },
  flex: { flex: 1 },
  tilde: { paddingBottom: px(18) },
  ranges: { borderWidth: 1, borderColor: c.border, borderRadius: px(12), padding: px(12), gap: px(12) },
  range: { gap: px(4) },
  rangeFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: px(8) },
  remove: { marginLeft: 'auto', minHeight: px(44), justifyContent: 'center', paddingHorizontal: px(4) },
  disabled: { opacity: 0.45 },
  note: { color: c.muted },
  error: { color: c.danger },
});
