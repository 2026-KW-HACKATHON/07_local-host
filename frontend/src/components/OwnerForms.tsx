import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Promotion, PromotionWriteRequest, Restaurant, RestaurantWriteRequest } from '../api/types';
import type { OwnerDraft } from '../owner/drafts';
import { OwnerButton, OwnerField, OwnerNotice } from './OwnerControls';
import { OwnerCalendar, localDate, weekdays } from './OwnerCalendar';
import { ownerColors as c, ownerType as t } from '../theme/ownerTokens';
import { px } from '../theme/tokens';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export function RestaurantForm({ restaurant, busy, onSave }: { restaurant: Restaurant | null; busy: boolean; onSave: (value: RestaurantWriteRequest) => void }) {
  const [name, setName] = useState(restaurant?.name ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [opening, setOpening] = useState(restaurant?.openingTime?.slice(0, 5) ?? '');
  const [closing, setClosing] = useState(restaurant?.closingTime?.slice(0, 5) ?? '');
  const [error, setError] = useState('');
  const submit = () => {
    if (!name.trim() || !address.trim()) { setError('식당 이름과 주소를 입력해 주세요.'); return; }
    if (!timePattern.test(opening) || !timePattern.test(closing)) { setError('영업시간은 09:00처럼 시:분 형식으로 입력해 주세요.'); return; }
    setError(''); onSave({ name: name.trim(), address: address.trim(), openingTime: `${opening}:00`, closingTime: `${closing}:00` });
  };
  return <View style={styles.form}><Text style={t.title}>{restaurant ? '내 식당 정보 수정' : '1단계\n식당 정보를 입력해주세요'}</Text>
    <OwnerField label="식당 이름" placeholder="식당·지점 이름" value={name} onChangeText={setName} editable={!busy} maxLength={100} />
    <OwnerField label="식당 주소" placeholder="도로명 주소와 상세 주소" value={address} onChangeText={setAddress} editable={!busy} maxLength={250} />
    <View style={styles.row}><View style={styles.flex}><OwnerField label="영업 시작" placeholder="10:00" value={opening} onChangeText={setOpening} editable={!busy} maxLength={5} keyboardType="numbers-and-punctuation" /></View>
      <View style={styles.flex}><OwnerField label="영업 종료" placeholder="21:00" value={closing} onChangeText={setClosing} editable={!busy} maxLength={5} keyboardType="numbers-and-punctuation" /></View></View>
    <OwnerNotice>주소를 직접 입력해 주세요. 정기 휴무일과 임시 휴무는 My에서 설정할 수 있어요.</OwnerNotice>
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <OwnerButton disabled={busy} onPress={submit}>{busy ? '저장 중...' : restaurant ? '저장' : '확인'}</OwnerButton>
  </View>;
}
export function PerksForm({ draft, busy, onSave, initial }: { draft: OwnerDraft; busy: boolean; onSave: (perks: OwnerDraft['perks']) => void; initial: boolean }) {
  const [perks, setPerks] = useState(draft.perks);
  return <View style={styles.form}><Text style={t.title}>{initial ? '2단계\n프로모션을 설정해주세요' : '프로모션 수정'}</Text>
    {perks.map((value, i) => <OwnerField key={i} label={`${i + 1}단계`} placeholder={['예) 음료 서비스, 사리 추가', '예) 주먹밥 서비스', '예) 치즈볼 서비스'][i]}
      maxLength={80} value={value} editable={!busy} onChangeText={text => setPerks(previous => previous.map((p, index) => index === i ? text : p) as OwnerDraft['perks'])} />)}
    <OwnerNotice>단계별 혜택은 이 기기에 초안으로 저장돼요. 손님에게 공개하거나 쿠폰을 발급하는 기능은 준비 중이에요.</OwnerNotice>
    <OwnerButton disabled={busy} onPress={() => onSave(perks.map(p => p.trim()) as OwnerDraft['perks'])}>{busy ? '저장 중...' : '초안 저장'}</OwnerButton>
  </View>;
}
export function ScheduleForm({ draft, mode, busy, onSave }: { draft: OwnerDraft; mode: 'closed' | 'notice'; busy: boolean; onSave: (value: OwnerDraft) => void }) {
  const [value, setValue] = useState(draft);
  const [calendar, setCalendar] = useState(false);
  return <View style={styles.form}><Text style={t.title}>{mode === 'closed' ? '정기 휴무일' : '영업 변경 사항'}</Text>
    {mode === 'closed' ? <><Text style={t.body}>매주 쉬는 요일을 선택해 주세요.</Text><View style={styles.days}>{weekdays.map((day, i) =>
      <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={`${day}요일 휴무`} accessibilityState={{ checked: value.closedDays.includes(i), disabled: busy }} disabled={busy}
        onPress={() => setValue(v => ({ ...v, closedDays: v.closedDays.includes(i) ? v.closedDays.filter(d => d !== i) : [...v.closedDays, i].sort() }))}
        style={[styles.day, value.closedDays.includes(i) && styles.selected]}><Text style={t.body}>{day}</Text></Pressable>)}</View>
      <OwnerNotice>선택한 요일이 없으면 정기 휴무 없음으로 저장돼요.</OwnerNotice></> : <>
      <OwnerButton secondary disabled={busy} onPress={() => setCalendar(true)}>{value.noticeDate || '달력에서 날짜 선택'}</OwnerButton>
      <OwnerField label="변경 내용" placeholder="예) 추석 연휴 휴무, 오늘 18시 마감" value={value.notice} onChangeText={notice => setValue(v => ({ ...v, notice }))} maxLength={200} multiline editable={!busy} />
      <OwnerButton secondary disabled={busy} onPress={() => setValue(v => ({ ...v, notice: '', noticeDate: '' }))}>입력 내용 비우기</OwnerButton>
    </>}
    <OwnerNotice>이 기기에 초안으로 저장돼요. 영업 일정 공개 기능이 연결되기 전에는 손님 화면에 반영되지 않아요.</OwnerNotice>
    <OwnerButton disabled={busy || (mode === 'notice' && Boolean(value.notice.trim()) && !value.noticeDate)} onPress={() => onSave(value)}>{busy ? '저장 중...' : '초안 저장'}</OwnerButton>
    {calendar && <OwnerCalendar value={value.noticeDate} onSelect={noticeDate => setValue(v => ({ ...v, noticeDate }))} onClose={() => setCalendar(false)} />}
  </View>;
}
export function DiscountForm({ promotion, busy, onSave }: { promotion: Promotion | null; busy: boolean; onSave: (value: PromotionWriteRequest) => void }) {
  const [title, setTitle] = useState(promotion?.title ?? '');
  const [description, setDescription] = useState(promotion?.description ?? '');
  const [percent, setPercent] = useState(promotion ? String(promotion.discountPercent) : '');
  const [start, setStart] = useState(promotion?.startAt.slice(0, 10) ?? localDate(new Date()));
  const [end, setEnd] = useState(promotion?.endAt.slice(0, 10) ?? localDate(new Date(Date.now() + 86400000)));
  const [startTime, setStartTime] = useState(promotion?.startAt.slice(11, 16) ?? '09:00');
  const [endTime, setEndTime] = useState(promotion?.endAt.slice(11, 16) ?? '21:00');
  const [calendar, setCalendar] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState('');
  const submit = () => {
    if (!title.trim() || !/^\d{1,3}$/.test(percent) || Number(percent) < 1 || Number(percent) > 100) { setError('제목과 1~100 사이의 정수 할인율을 입력해 주세요.'); return; }
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) { setError('시간은 09:00처럼 시:분 형식으로 입력해 주세요.'); return; }
    const startAt = `${start}T${startTime}:00`; const endAt = `${end}T${endTime}:00`;
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) { setError('종료 시각은 시작 시각보다 뒤여야 해요.'); return; }
    if (new Date(endAt).getTime() <= Date.now()) { setError('종료 시각은 현재보다 뒤여야 해요.'); return; }
    setError(''); onSave({ title: title.trim(), description: description.trim(), discountPercent: Number(percent), startAt, endAt });
  };
  return <View style={styles.form}><Text style={t.title}>{promotion ? '할인 프로모션 수정' : '할인 프로모션 등록'}</Text>
    <OwnerField label="제목" value={title} onChangeText={setTitle} maxLength={100} editable={!busy} placeholder="예) 오후 방문 손님 할인" />
    <OwnerField label="혜택 설명" value={description} onChangeText={setDescription} maxLength={500} multiline editable={!busy} />
    <OwnerField label="할인율 (%)" value={percent} onChangeText={setPercent} maxLength={3} keyboardType="number-pad" editable={!busy} placeholder="1~100" />
    <Text style={t.body}>시작일</Text><OwnerButton secondary disabled={busy} onPress={() => setCalendar('start')}>{start}</OwnerButton>
    <OwnerField label="시작 시간" value={startTime} onChangeText={setStartTime} maxLength={5} editable={!busy} placeholder="09:00" />
    <Text style={t.body}>종료일</Text><OwnerButton secondary disabled={busy} onPress={() => setCalendar('end')}>{end}</OwnerButton>
    <OwnerField label="종료 시간" value={endTime} onChangeText={setEndTime} maxLength={5} editable={!busy} placeholder="21:00" />
    <OwnerNotice>기기 현지 시각 기준이에요. 활성 기간의 할인 혜택은 저장 후 손님 화면에 공개돼요.</OwnerNotice>
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <OwnerButton disabled={busy} onPress={submit}>{busy ? '저장 중...' : promotion ? '저장' : '등록'}</OwnerButton>
    {calendar && <OwnerCalendar value={calendar === 'start' ? start : end} onSelect={calendar === 'start' ? setStart : setEnd} onClose={() => setCalendar(null)} />}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: px(24), paddingBottom: px(16) }, row: { flexDirection: 'row', gap: px(16) }, flex: { flex: 1 }, error: { ...t.small, color: c.danger },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: px(8) }, day: { minWidth: px(44), minHeight: px(48), borderRadius: px(10), backgroundColor: c.row, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: c.edit, borderWidth: 1, borderColor: c.black },
});
