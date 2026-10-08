import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Restaurant, RestaurantWriteRequest } from '../api/types';
import type { OwnerDraft } from '../owner/drafts';
import { OwnerButton, OwnerField } from './OwnerControls';
import { OwnerCalendar, weekdays } from './OwnerCalendar';
import { CustomerNaverSearch } from './CustomerNaverSearch';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
type RestaurantFormMode = 'create' | 'hours' | 'location';
function ClosedDaysField({ value, onChange, busy }: { value: number[]; onChange: (days: number[]) => void; busy: boolean }) {
  return <View style={[styles.group, styles.closedGroup]}><Text style={t.body}>정기 휴무일</Text><View style={styles.days}>{weekdays.map((day, i) =>
    <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={`${day}요일 휴무`} accessibilityState={{ checked: value.includes(i), disabled: busy }} disabled={busy}
      onPress={() => onChange(value.includes(i) ? value.filter(d => d !== i) : [...value, i].sort((a, b) => a - b))}
      style={[styles.day, value.includes(i) && styles.selected]}><Text style={t.body}>{day}</Text></Pressable>)}</View>
    <Text style={[t.small, styles.secondaryText]}>{value.length ? `매주 ${value.map(day => weekdays[day]).join('·')}요일 휴무` : '정기 휴무 없음'}</Text>
  </View>;
}
function HoursField({ opening, closing, onOpeningChange, onClosingChange, busy }: {
  opening: string; closing: string; onOpeningChange: (value: string) => void; onClosingChange: (value: string) => void; busy: boolean;
}) {
  return <View style={styles.group}><Text style={t.body}>영업시간</Text><View style={styles.row}>
    <View style={styles.flex}><OwnerField label="시작 시간" placeholder="10:00" value={opening} onChangeText={onOpeningChange} editable={!busy} maxLength={5} keyboardType="numbers-and-punctuation" /></View>
    <View style={styles.flex}><OwnerField label="종료 시간" placeholder="21:00" value={closing} onChangeText={onClosingChange} editable={!busy} maxLength={5} keyboardType="numbers-and-punctuation" /></View>
  </View></View>;
}
export function RestaurantForm({ restaurant, busy, onSave, mode = restaurant ? 'hours' : 'create', closedDays = [] }: {
  restaurant: Restaurant | null; busy: boolean; mode?: RestaurantFormMode; closedDays?: number[];
  onSave: (value: RestaurantWriteRequest, closedDays: number[]) => void;
}) {
  const [name, setName] = useState(restaurant?.name ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [opening, setOpening] = useState(restaurant?.openingTime?.slice(0, 5) ?? '');
  const [closing, setClosing] = useState(restaurant?.closingTime?.slice(0, 5) ?? '');
  const [days, setDays] = useState(closedDays);
  const [search, setSearch] = useState(restaurant?.name ?? '');
  const [naverQuery, setNaverQuery] = useState('');
  const [error, setError] = useState('');
  const openSearch = () => {
    const query = (mode === 'create' ? name : search).trim();
    if (!query) { setError('검색할 식당 이름을 입력해 주세요.'); return; }
    setError(''); setNaverQuery(query);
  };
  const submit = () => {
    if (busy) return;
    if (mode === 'location' && restaurant) {
      if (!address.trim()) { setError('식당 주소를 입력해 주세요.'); return; }
      setError(''); onSave({ name: restaurant.name, address: address.trim(), openingTime: restaurant.openingTime, closingTime: restaurant.closingTime }, days);
      return;
    }
    if (mode === 'create' && (!name.trim() || !address.trim())) { setError('식당 이름과 주소를 입력해 주세요.'); return; }
    if (!timePattern.test(opening) || !timePattern.test(closing)) { setError('영업시간은 09:00처럼 시:분 형식으로 입력해 주세요.'); return; }
    setError(''); onSave({ name: mode === 'hours' && restaurant ? restaurant.name : name.trim(), address: mode === 'hours' && restaurant ? restaurant.address : address.trim(), openingTime: `${opening}:00`, closingTime: `${closing}:00` }, days);
  };
  return <View style={styles.form}><Text style={t.title}>{mode === 'create' ? '1단계\n식당 정보를 입력해주세요' : mode === 'hours' ? '영업시간 수정' : '식당 위치 수정'}</Text>
    {mode !== 'hours' && <>
      {mode === 'create' ? <OwnerField label="식당 이름" placeholder="식당·지점 이름" value={name} onChangeText={setName} editable={!busy} maxLength={100} returnKeyType="search" onSubmitEditing={openSearch} /> :
        <OwnerField label="식당 검색" placeholder="식당·지점 이름" value={search} onChangeText={setSearch} editable={!busy} maxLength={100} returnKeyType="search" onSubmitEditing={openSearch} />}
      <OwnerButton secondary disabled={busy} onPress={openSearch}>네이버에서 식당 검색</OwnerButton>
      <OwnerField label="식당 주소" placeholder="검색에서 확인한 도로명 주소와 상세 주소" value={address} onChangeText={setAddress} editable={!busy} maxLength={250} />
    </>}
    {mode !== 'location' && <HoursField opening={opening} closing={closing} onOpeningChange={setOpening} onClosingChange={setClosing} busy={busy} />}
    {mode === 'create' && <ClosedDaysField value={days} onChange={setDays} busy={busy} />}
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <OwnerButton disabled={busy} onPress={submit}>{busy ? '저장 중...' : mode === 'create' ? '확인' : '저장'}</OwnerButton>
    {Boolean(naverQuery) && <CustomerNaverSearch query={naverQuery} onClose={() => setNaverQuery('')} caption="검색에서 식당 주소를 확인한 뒤 입력해 주세요." />}
  </View>;
}
export function PerksForm({ draft, busy, onSave, initial }: { draft: OwnerDraft; busy: boolean; onSave: (perks: OwnerDraft['perks']) => void; initial: boolean }) {
  const [perks, setPerks] = useState(draft.perks);
  return <View style={styles.form}><Text style={t.title}>{initial ? '2단계\n프로모션을 설정해주세요' : '프로모션 수정'}</Text>
    {perks.map((value, i) => <OwnerField key={i} label={`${i + 1}단계`} placeholder={['예) 음료 서비스, 사리 추가', '예) 주먹밥 서비스', '예) 치즈볼 서비스'][i]}
      maxLength={80} value={value} editable={!busy} onChangeText={text => setPerks(previous => previous.map((p, index) => index === i ? text : p) as OwnerDraft['perks'])} />)}
    <OwnerButton disabled={busy} onPress={() => onSave(perks.map(p => p.trim()) as OwnerDraft['perks'])}>{busy ? '저장 중...' : '저장'}</OwnerButton>
  </View>;
}
export function ScheduleForm({ draft, mode, busy, onSave, restaurant }: {
  draft: OwnerDraft; mode: 'closed' | 'notice'; busy: boolean; onSave: (value: OwnerDraft) => void; restaurant?: Restaurant;
}) {
  const [days, setDays] = useState(draft.closedDays);
  const [date, setDate] = useState(draft.businessChange?.date ?? '');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED' | null>(draft.businessChange?.status ?? null);
  const [opening, setOpening] = useState(draft.businessChange?.status === 'OPEN' ? draft.businessChange.openingTime.slice(0, 5) : restaurant?.openingTime?.slice(0, 5) ?? '');
  const [closing, setClosing] = useState(draft.businessChange?.status === 'OPEN' ? draft.businessChange.closingTime.slice(0, 5) : restaurant?.closingTime?.slice(0, 5) ?? '');
  const [calendar, setCalendar] = useState(false);
  const [error, setError] = useState('');
  const submit = () => {
    if (busy) return;
    if (mode === 'closed') { onSave({ ...draft, closedDays: days }); return; }
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      setError('변경할 날짜를 달력에서 선택해 주세요.'); return;
    }
    if (!status) { setError('해당 날짜의 휴무 또는 영업을 선택해 주세요.'); return; }
    if (status === 'OPEN' && (!timePattern.test(opening) || !timePattern.test(closing))) {
      setError('영업시간은 09:00처럼 시:분 형식으로 입력해 주세요.'); return;
    }
    setError('');
    onSave({ ...draft, businessChange: { date, status, openingTime: status === 'OPEN' ? opening : '', closingTime: status === 'OPEN' ? closing : '' } });
  };
  return <View style={styles.form}><Text style={t.title}>{mode === 'closed' ? '정기 휴무일' : '영업 변경 사항'}</Text>
    {mode === 'closed' ? <ClosedDaysField value={days} onChange={setDays} busy={busy} /> : <>
      <Text style={t.body}>변경 날짜</Text>
      <OwnerButton secondary disabled={busy} onPress={() => setCalendar(true)}>{date || '달력에서 날짜 선택'}</OwnerButton>
      <Text style={t.body}>해당 날짜의 영업 여부를 선택해 주세요.</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>{(['CLOSED', 'OPEN'] as const).map(option =>
        <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option === 'CLOSED' ? '휴무' : '영업'} accessibilityState={{ checked: status === option, disabled: busy }}
          disabled={busy} onPress={() => { setStatus(option); setError(''); }} style={[styles.scheduleOption, status === option && styles.selected]}>
          <Text style={t.body}>{option === 'CLOSED' ? '휴무' : '영업'}</Text><Text style={t.small}>{status === option ? '선택됨' : '선택'}</Text>
        </Pressable>)}</View>
      {status === 'OPEN' && <HoursField opening={opening} closing={closing} onOpeningChange={setOpening} onClosingChange={setClosing} busy={busy} />}
    </>}
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <OwnerButton disabled={busy} onPress={submit}>{busy ? '저장 중...' : '저장'}</OwnerButton>
    {calendar && <OwnerCalendar value={date} onSelect={selectedDate => { setDate(selectedDate); setError(''); }} onClose={() => setCalendar(false)} />}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: px(24), paddingBottom: px(16) }, row: { flexDirection: 'row', gap: px(16) }, flex: { flex: 1 }, error: { ...t.small, color: c.danger },
  group: { gap: px(12), padding: px(16), borderWidth: 1, borderColor: c.border, borderRadius: px(12) }, closedGroup: { padding: px(10) }, secondaryText: { color: c.muted },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: px(4) }, day: { minWidth: px(44), minHeight: px(48), borderRadius: px(10), backgroundColor: c.brandYellow, alignItems: 'center', justifyContent: 'center' },
  scheduleOption: { flex: 1, gap: px(4), minHeight: px(72), backgroundColor: c.brandYellow, borderRadius: px(12), alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: c.edit, borderWidth: 1, borderColor: c.black },
});
