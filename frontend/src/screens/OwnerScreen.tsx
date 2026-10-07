import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { createRestaurant, getRestaurants, updateRestaurant } from '../api/restaurants';
import { getCurrentCrowd, reportCrowd } from '../api/crowd';
import { createPromotion, deletePromotion, getManagedPromotions, updatePromotion } from '../api/promotions';
import { getApiErrorMessage } from '../api/errorMessage';
import type { CrowdReportResponse, CrowdStatusResponse, Promotion, PromotionWriteRequest, Restaurant, RestaurantWriteRequest, ReportableCrowdLevel } from '../api/types';
import { HeaderLogo } from '../components/BrandAssets';
import { CrowdBadge, crowdLabels } from '../components/CustomerControls';
import { CustomerDialog, type CustomerDialogState } from '../components/CustomerDialog';
import { OwnerBack, OwnerButton, OwnerInfoRow, OwnerNavigation, OwnerNotice, type OwnerTab } from '../components/OwnerControls';
import { DiscountForm, PerksForm, RestaurantForm, ScheduleForm } from '../components/OwnerForms';
import { OwnerAnalytics } from '../components/OwnerAnalytics';
import { weekdays } from '../components/OwnerCalendar';
import { emptyOwnerDraft, readOwnerDraft, writeOwnerDraft, type OwnerDraft } from '../owner/drafts';
import { ownerColors as c, ownerSpace as s, ownerType as t } from '../theme/ownerTokens';
import { metrics, px } from '../theme/tokens';

type Page = 'main' | 'create' | 'restaurant' | 'setupPerks' | 'perks' | 'closed' | 'notice' | 'submit' | 'discount' | 'switch';
const levels: ReportableCrowdLevel[] = ['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'];
function dateLabel(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '시간 정보 없음' : d.toLocaleString('ko-KR'); }

export function OwnerScreen({ onLogout }: { onLogout: () => void }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<OwnerTab>('report');
  const [page, setPage] = useState<Page>('main');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<CrowdStatusResponse | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [draft, setDraft] = useState<OwnerDraft | null>(null);
  const [reports, setReports] = useState<CrowdReportResponse[]>([]);
  const [level, setLevel] = useState<ReportableCrowdLevel | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const request = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const selected = restaurants.find(r => r.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    if (!user || !token) return;
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      const all = (await getRestaurants()).filter(r => r.ownerId === user.id);
      if (version !== request.current) return;
      setRestaurants(all);
      const restaurant = all.find(r => r.id === selectedId) ?? all[0];
      if (!restaurant) { setSelectedId(null); setCrowd(null); setPromotions([]); setDraft(null); return; }
      if (restaurant.id !== selectedId) { setSelectedId(restaurant.id); return; }
      const results = await Promise.allSettled([getCurrentCrowd(restaurant.id), getManagedPromotions(restaurant.id, token), readOwnerDraft(user.id, restaurant.id)]);
      if (version !== request.current) return;
      setCrowd(results[0].status === 'fulfilled' ? results[0].value : null);
      setPromotions(results[1].status === 'fulfilled' ? results[1].value : null);
      setDraft(results[2].status === 'fulfilled' ? results[2].value : null);
      if (results.some(r => r.status === 'rejected')) setError('일부 정보를 불러오지 못했어요. 다시 시도해 주세요.');
    } catch (e) { if (version === request.current) setError(getApiErrorMessage(e, 'request')); }
    finally { if (version === request.current) setLoading(false); }
  }, [selectedId, token, user?.id]);
  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page, tab, selectedId]);

  const back = () => {
    if (lock.current) return true;
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; }
    if (page !== 'main') { Keyboard.dismiss(); setPage('main'); setLevel(null); return true; }
    if (tab !== 'report') { setTab('report'); return true; }
    return false;
  };
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', back); return () => subscription.remove(); }, [page, tab]);
  const mutate = async (action: () => Promise<void>) => {
    if (lock.current || !token || !user) return;
    lock.current = true; request.current++; setLoading(false); setBusy(true); Keyboard.dismiss();
    try { await action(); }
    catch (e) { setDialog({ title: '처리하지 못했어요', message: getApiErrorMessage(e, 'request'), confirm: '확인' }); }
    finally { lock.current = false; setBusy(false); }
  };
  const selectTab = (value: OwnerTab) => {
    if (lock.current) return;
    Keyboard.dismiss(); setPage('main'); setTab(value); setLevel(null);
  };
  const saveRestaurant = (value: RestaurantWriteRequest) => { void mutate(async () => {
    const creating = page === 'create';
    const result = creating ? await createRestaurant(value, token!) : await updateRestaurant(selected!.id, value, token!);
    setRestaurants(previous => [...previous.filter(r => r.id !== result.id), result]); setSelectedId(result.id);
    if (creating) { setDraft(emptyOwnerDraft()); setPage('setupPerks'); }
    else { setPage('main'); setTab('my'); }
    setDialog({ title: creating ? '식당이 등록됐어요' : '식당 정보를 저장했어요', message: creating ? '이어서 단계별 프로모션 초안을 설정해 주세요.' : '손님 화면에도 변경한 정보가 반영돼요.', confirm: '확인' });
  }); };
  const saveDraft = (value: OwnerDraft) => { void mutate(async () => {
    if (!selected) return;
    await writeOwnerDraft(user!.id, selected.id, value); setDraft(value);
    if (page === 'setupPerks' || page === 'perks') setTab('promotion');
    setPage('main'); setDialog({ title: '초안을 저장했어요', message: '이 기기에서 다시 확인할 수 있어요.\n손님에게는 아직 공개되지 않아요.', confirm: '확인' });
  }); };
  const submit = () => {
    if (!level || !selected) return;
    const id = selected.id; const submittedLevel = level;
    setDialog({ title: '혼잡도 제보', message: `${selected.name}\n${crowdLabels[level]} 상태로 제보할까요?`, cancel: '아니요', confirm: '예', onConfirm: () => { void mutate(async () => {
      const result = await reportCrowd(id, { level: submittedLevel }, token!);
      setReports(previous => [result, ...previous]); setLevel(null); setPage('main');
      await refresh(); setDialog({ title: '제보가 완료됐어요', message: '가게 혼잡도에 반영했어요.', confirm: '확인' });
    }); } });
  };
  const saveDiscount = (value: PromotionWriteRequest) => { void mutate(async () => {
    if (!selected) return;
    const saved = editingPromotion ? await updatePromotion(selected.id, editingPromotion.id, { ...value, enabled: editingPromotion.enabled }, token!) : await createPromotion(selected.id, value, token!);
    setPromotions(previous => [saved, ...(previous ?? []).filter(p => p.id !== saved.id)]); setPage('main');
    setDialog({ title: '프로모션을 저장했어요', message: saved.active ? '진행 중인 할인 혜택이 손님 화면에 표시돼요.' : '활성 상태와 설정한 기간에 따라 손님 화면에 표시돼요.', confirm: '확인' });
  }); };
  const togglePromotion = (promotion: Promotion) => setDialog({ title: promotion.enabled ? '프로모션을 중지할까요?' : '프로모션을 게시할까요?',
    message: `${promotion.title}\n${promotion.discountPercent}% 할인\n${dateLabel(promotion.startAt)} ~ ${dateLabel(promotion.endAt)}`, cancel: '아니요', confirm: '예',
    onConfirm: () => { void mutate(async () => { await updatePromotion(selected!.id, promotion.id, { title: promotion.title, description: promotion.description,
      discountPercent: promotion.discountPercent, startAt: promotion.startAt, endAt: promotion.endAt, enabled: !promotion.enabled }, token!); await refresh(); }); } });
  const removePromotion = (promotion: Promotion) => setDialog({ title: '프로모션 삭제', message: `“${promotion.title}”을 삭제할까요?\n삭제하면 복구할 수 없어요.`, cancel: '취소', confirm: '삭제',
    onConfirm: () => { void mutate(async () => { await deletePromotion(selected!.id, promotion.id, token!); setPromotions(previous => previous?.filter(p => p.id !== promotion.id) ?? []); }); } });
  const signOut = () => setDialog({ title: '로그아웃', message: '로그아웃할까요?', cancel: '취소', confirm: '로그아웃', onConfirm: () => { void mutate(async () => { await logout(); onLogout(); }); } });
  const editDraft = (next: 'perks' | 'closed' | 'notice') => {
    if (draft) setPage(next);
    else setDialog({ title: '초안 확인 필요', message: '초안을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.', confirm: '확인' });
  };
  const activeOffers = promotions?.filter(p => p.enabled && new Date(p.startAt).getTime() <= Date.now() && new Date(p.endAt).getTime() >= Date.now()) ?? [];

  return <View style={styles.root}><KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={page === 'main' ? <RefreshControl refreshing={loading} onRefresh={() => { if (!lock.current) void refresh(); }} /> : undefined}>
      <View style={styles.header}><HeaderLogo /><Pressable accessibilityRole="button" disabled={busy} onPress={signOut} style={styles.headerAction}><Text style={t.small}>로그아웃</Text></Pressable></View>
      <View style={styles.section}>
        {page !== 'main' && <OwnerBack onPress={back} disabled={busy} />}
        {page === 'main' && selected && <Pressable accessibilityRole="button" accessibilityLabel="관리할 식당 선택" disabled={busy} onPress={() => setPage('switch')} style={styles.restaurantSelector}>
          <Text numberOfLines={2} style={[t.small, styles.flex]}>{selected.name}</Text><Text style={t.small}>변경 ▾</Text></Pressable>}
        {Boolean(error) && <View style={styles.errorBox}><Text style={t.small}>{error}</Text><OwnerButton secondary disabled={busy || loading} onPress={() => { void refresh(); }}>다시 시도</OwnerButton></View>}
        {page === 'create' || page === 'restaurant' ? <RestaurantForm key={page} restaurant={page === 'create' ? null : selected} busy={busy} onSave={saveRestaurant} /> :
          page === 'switch' ? <><Text style={t.title}>내 식당 선택</Text>{restaurants.map(r => <OwnerButton secondary key={r.id} onPress={() => {
            if (r.id !== selectedId) { setCrowd(null); setPromotions(null); setDraft(null); setSelectedId(r.id); }
            setPage('main');
          }}>{r.name}{r.id === selectedId ? ' · 선택됨' : ''}</OwnerButton>)}<OwnerButton onPress={() => setPage('create')}>새 식당 등록</OwnerButton></> :
          !selected ? loading ? <ActivityIndicator color={c.black} /> : <><Text style={t.title}>내 식당을 등록해주세요</Text><OwnerNotice>식당을 등록하면 혼잡도 제보와 프로모션을 관리할 수 있어요.</OwnerNotice>
            <OwnerButton disabled={Boolean(error)} onPress={() => setPage('create')}>식당 등록하기</OwnerButton></> :
          page === 'setupPerks' || page === 'perks' ? draft ? <PerksForm draft={draft} initial={page === 'setupPerks'} busy={busy} onSave={perks => saveDraft({ ...draft, perks })} /> : <OwnerNotice>초안을 불러오는 중이에요. 오류가 있으면 다시 시도해 주세요.</OwnerNotice> :
          page === 'closed' || page === 'notice' ? draft ? <ScheduleForm key={page} draft={draft} mode={page} busy={busy} onSave={saveDraft} /> : <OwnerNotice>초안을 불러오지 못했어요.</OwnerNotice> :
          page === 'discount' ? <DiscountForm promotion={editingPromotion} busy={busy} onSave={saveDiscount} /> :
          page === 'submit' ? <>
            <Text style={t.title}>사장님의{ '\n' }혼잡도 제보가 필요해요</Text>
            <View style={styles.reportCard}><Text style={[t.heading, styles.center]}>혼잡도를 제보해주세요!</Text><View style={styles.levels}>
              {levels.map((value, i) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: level === value, disabled: busy }} disabled={busy}
                onPress={() => setLevel(value)} style={[styles.level, level === value && styles.checked]}><Text style={[t.small, styles.center]}>{crowdLabels[value]}</Text>
                <View style={[styles.dot, { backgroundColor: [c.available, c.few, c.wait][i] }]} /><Text style={t.small}>{level === value ? '선택됨' : '선택'}</Text></Pressable>)}
            </View><OwnerNotice>추가 설명 작성 기능은 준비 중이에요. 현재는 혼잡도 상태만 전송돼요.</OwnerNotice></View>
            <View style={styles.submitSpace}><OwnerButton disabled={!level || busy} onPress={submit}>{busy ? '제보 중...' : '완료'}</OwnerButton></View>
          </> : tab === 'report' ? <>
            <Text style={t.title}>가게 혼잡도 제보</Text><View style={styles.actions}>
              <Text style={[t.small, styles.offerTag]}>{promotions === null ? '프로모션 확인 중' : activeOffers.length ? `프로모션 ${activeOffers.length}개 진행 중` : '현재 프로모션 없음'}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setLevel(null); setPage('submit'); }} style={styles.reportButton}><Text style={t.body}>점주가 제보하기</Text></Pressable></View>
            <View style={styles.reportPanel}><Text style={t.heading}>현재 혼잡도</Text>{crowd ? <><CrowdBadge level={crowd.level} /><Text style={t.small}>최근 30분 제보 {crowd.reportCount}건</Text>
              <Text style={t.small}>{crowd.updatedAt ? `최근 제보 ${dateLabel(crowd.updatedAt)}` : '아직 제보가 없어요.'}</Text></> : <OwnerNotice>{loading ? '혼잡도를 불러오고 있어요.' : '혼잡도를 불러오지 못했어요.'}</OwnerNotice>}
              <View style={styles.divider} /><OwnerNotice>손님별 제보 목록은 준비 중이에요.</OwnerNotice>
              {reports.filter(r => r.restaurantId === selectedId).map(r => <View key={r.id} style={styles.reportRow}><Text style={t.body}>{user?.nickname} · 점주</Text><CrowdBadge level={r.level} /><Text style={t.small}>{dateLabel(r.reportedAt)}</Text></View>)}
              <OwnerNotice>제보 내역은 현재 로그인 중 직접 작성한 내용만 표시돼요.</OwnerNotice>
            </View>
          </> : tab === 'promotion' ? <>
            <Text style={t.title}>프로모션</Text>
            {[0, 1, 2].map(i => <OwnerInfoRow key={i} label={`${i + 1}단계`} value={draft?.perks[i] || '아직 설정하지 않았어요'} onPress={() => editDraft('perks')} />)}
            <OwnerNotice>단계별 혜택은 이 기기의 초안이에요. 자동 쿠폰 게시 기능은 준비 중이에요.</OwnerNotice>
            <View style={styles.divider} /><Text style={t.heading}>할인 프로모션</Text><OwnerNotice>할인율을 정한 프로모션은 손님 화면에 공개할 수 있어요.</OwnerNotice>
            <OwnerButton disabled={busy} onPress={() => { setEditingPromotion(null); setPage('discount'); }}>할인 프로모션 등록</OwnerButton>
            {promotions === null ? <OwnerNotice>프로모션 정보를 불러오지 못했어요.</OwnerNotice> : promotions.length === 0 ? <OwnerNotice>등록된 할인 프로모션이 없어요.</OwnerNotice> : promotions.map(p => <View key={p.id} style={styles.promotionCard}>
              <Text style={t.heading}>{p.title}</Text><Text style={t.body}>{p.description}</Text><Text style={t.body}>{p.discountPercent}% 할인</Text>
              <Text style={t.small}>{dateLabel(p.startAt)} ~ {dateLabel(p.endAt)}</Text><Text style={t.small}>{!p.enabled ? '게시 중지' : new Date(p.endAt).getTime() < Date.now() ? '기간 종료' : new Date(p.startAt).getTime() > Date.now() ? '시작 예정' : '진행 중'}</Text>
              <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={`${p.title} 수정`} disabled={busy} onPress={() => { setEditingPromotion(p); setPage('discount'); }} style={styles.smallAction}><Text style={t.body}>수정</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => togglePromotion(p)} style={styles.smallAction}><Text style={t.body}>{p.enabled ? '중지' : '게시'}</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${p.title} 삭제`} disabled={busy} onPress={() => removePromotion(p)} style={styles.smallAction}><Text style={[t.body, { color: c.danger }]}>삭제</Text></Pressable></View>
            </View>)}
          </> : tab === 'data' ? <OwnerAnalytics key={selected.id} restaurantId={selected.id} /> : <>
            <Text style={t.title}>내 식당 정보</Text>
            <OwnerInfoRow label="정기 휴무일" value={draft ? draft.closedDays.length ? `매주 ${draft.closedDays.map(d => weekdays[d]).join('·')}요일` : '설정된 정기 휴무 없음' : '초안 확인 필요'} onPress={() => editDraft('closed')} />
            <OwnerInfoRow label="영업 시간" value={`${selected.openingTime?.slice(0, 5) ?? '미등록'} ~ ${selected.closingTime?.slice(0, 5) ?? '미등록'}`} onPress={() => setPage('restaurant')} />
            <OwnerInfoRow label="식당 위치" value={selected.address} onPress={() => setPage('restaurant')} />
            <OwnerInfoRow label="영업 변경 사항" value={draft?.notice ? `${draft.noticeDate} ${draft.notice}` : '등록된 변경 사항 없음'} action="입력" onPress={() => editDraft('notice')} />
            <OwnerNotice>정기 휴무일과 영업 변경 사항은 기기에 저장한 초안이에요. 손님에게는 아직 공개되지 않아요.</OwnerNotice>
            <Text style={t.small}>{user?.nickname} · {user?.email}</Text><OwnerButton secondary onPress={() => setPage('create')}>다른 식당 추가</OwnerButton>
          </>}
      </View>
    </ScrollView>
    <OwnerNavigation tab={tab} onSelect={selectTab} disabled={busy} />
    <CustomerDialog value={dialog} onClose={() => setDialog(null)} />
  </KeyboardAvoidingView></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.white, alignItems: 'center' }, shell: { flex: 1, width: '100%', maxWidth: metrics.canvasWidth }, scroll: { flex: 1 }, content: { flexGrow: 1 },
  header: { paddingTop: px(20), paddingHorizontal: s.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { minHeight: px(44), justifyContent: 'center' }, section: { paddingHorizontal: s.gutter, paddingTop: px(12), paddingBottom: px(28), gap: s.gap },
  restaurantSelector: { flexDirection: 'row', alignItems: 'center', minHeight: px(44), gap: px(12), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.row }, flex: { flex: 1 },
  errorBox: { gap: px(12), padding: px(12), borderRadius: s.radius, backgroundColor: c.guest },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: px(8) }, offerTag: { padding: px(8), borderWidth: 1, borderColor: c.border },
  reportButton: { minHeight: px(44), justifyContent: 'center', backgroundColor: c.guest, borderRadius: px(12), padding: px(8), borderWidth: 1, borderColor: c.border },
  reportPanel: { minHeight: px(350), backgroundColor: c.panel, padding: px(20), borderRadius: s.radius, gap: px(16) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: px(8) }, reportRow: { gap: px(6), paddingVertical: px(12), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  reportCard: { backgroundColor: c.dialog, borderWidth: 1, borderColor: c.border, borderRadius: px(20), padding: px(14), gap: px(24) },
  levels: { flexDirection: 'row' }, level: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: px(3), paddingVertical: px(12), gap: px(10), borderWidth: 1, borderColor: c.row },
  checked: { backgroundColor: c.edit, borderColor: c.black }, dot: { width: px(20), height: px(20), borderRadius: px(10) }, center: { textAlign: 'center' }, submitSpace: { paddingTop: px(40) },
  promotionCard: { backgroundColor: c.guest, borderRadius: s.radius, padding: px(16), gap: px(12) }, smallAction: { minHeight: px(44), minWidth: px(66), alignItems: 'center', justifyContent: 'center', borderRadius: px(8), backgroundColor: c.white, paddingHorizontal: px(12) },
});
