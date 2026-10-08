import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { createRestaurant, getRestaurants, updateRestaurant } from '../api/restaurants';
import { reportCrowd } from '../api/crowd';
import { getManagedPromotions } from '../api/promotions';
import { getApiErrorMessage } from '../api/errorMessage';
import type { Promotion, Restaurant, RestaurantWriteRequest, ReportableCrowdLevel } from '../api/types';
import { isTemporaryPromotion } from '../customer/restaurantList';
import { HeaderLogo } from '../components/BrandAssets';
import { CrowdBadge, crowdLabels } from '../components/CustomerControls';
import { CustomerDialog, type CustomerDialogState } from '../components/CustomerDialog';
import { OwnerBack, OwnerButton, OwnerField, OwnerInfoRow, OwnerNavigation, type OwnerTab } from '../components/OwnerControls';
import { PerksForm, RestaurantForm, ScheduleForm } from '../components/OwnerForms';
import { OwnerAnalytics } from '../components/OwnerAnalytics';
import { PromotionOptionsForm } from '../components/PromotionOptionsForm';
import { useDeviceCoupons } from '../coupons/useDeviceCoupons';
import { cancelDevicePromotion, publishDevicePromotion } from '../coupons/deviceStore';
import { deviceUserKey, isPromotionDownloadable, type DevicePromotion } from '../coupons/model';
import { scheduleSummary, type PromotionSchedule } from '../coupons/schedule';
import { weekdays } from '../components/OwnerCalendar';
import { emptyOwnerDraft, readOwnerDraft, writeOwnerDraft, type OwnerDraft } from '../owner/drafts';
import { readOwnerReports, writeOwnerReport, type StoredOwnerReport } from '../owner/reports';
import { koreaObservationTime } from '../owner/analytics';
import { ownerColors as c, ownerSpace as s, ownerType as t } from '../theme/ownerTokens';
import { metrics, px } from '../theme/tokens';

type Page = 'main' | 'create' | 'hours' | 'location' | 'setupPerks' | 'perks' | 'closed' | 'notice' | 'submit' | 'publish';
const levels: ReportableCrowdLevel[] = ['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'];
function dateLabel(value: string) { const d = new Date(koreaObservationTime(value)); return Number.isNaN(d.getTime()) ? '시간 정보 없음' : d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }

export function OwnerScreen({ onLogout }: { onLogout: () => void }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<OwnerTab>('report');
  const [page, setPage] = useState<Page>('main');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [draft, setDraft] = useState<OwnerDraft | null>(null);
  const [reports, setReports] = useState<StoredOwnerReport[]>([]);
  const [reportsError, setReportsError] = useState('');
  const [level, setLevel] = useState<ReportableCrowdLevel | null>(null);
  const [description, setDescription] = useState('');
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [publishingStage, setPublishingStage] = useState<1 | 2 | 3>(1);
  const coupons = useDeviceCoupons(user);
  const lock = useRef(false);
  const request = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const selected = restaurants.find(r => r.id === selectedId) ?? null;

  const changeRestaurant = useCallback((id: number) => {
    // 늦게 도착한 이전 식당 응답도 무효화한다.
    request.current++;
    setPromotions(null); setDraft(null); setReports([]); setReportsError('');
    setLoading(true); setSelectedId(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !token) return;
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      const all = (await getRestaurants()).filter(r => r.ownerId === user.id);
      if (version !== request.current) return;
      setRestaurants(all);
      const restaurant = all.find(r => r.id === selectedId) ?? all[0];
      if (!restaurant) { setSelectedId(null); setPromotions([]); setDraft(null); setReports([]); setReportsError(''); setPage('create'); return; }
      if (restaurant.id !== selectedId) { changeRestaurant(restaurant.id); return; }
      const results = await Promise.allSettled([getManagedPromotions(restaurant.id, token), readOwnerDraft(user.id, restaurant.id), readOwnerReports(user.id, restaurant.id)]);
      if (version !== request.current) return;
      setPromotions(results[0].status === 'fulfilled' ? results[0].value : null);
      setDraft(results[1].status === 'fulfilled' ? results[1].value : null);
      if (results[2].status === 'fulfilled') { setReports(results[2].value); setReportsError(''); }
      else setReportsError('제보 내역을 불러오지 못했어요.');
      if (results.some(r => r.status === 'rejected')) setError('일부 정보를 불러오지 못했어요. 다시 시도해 주세요.');
    } catch (e) { if (version === request.current) setError(getApiErrorMessage(e, 'request')); }
    finally { if (version === request.current) setLoading(false); }
  }, [selectedId, token, user?.id, changeRestaurant]);
  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page, tab, selectedId]);

  const back = () => {
    if (lock.current) return true;
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; }
    if (page !== 'main' && selected) { Keyboard.dismiss(); setPage('main'); setLevel(null); return true; }
    if (tab !== 'report') { setTab('report'); return true; }
    return false;
  };
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', back); return () => subscription.remove(); }, [page, tab, selectedId]);
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
  const saveRestaurant = (value: RestaurantWriteRequest, closedDays: number[]) => { void mutate(async () => {
    const creating = page === 'create';
    const result = creating ? await createRestaurant(value, token!) : await updateRestaurant(selected!.id, value, token!);
    setRestaurants(previous => [...previous.filter(r => r.id !== result.id), result]);
    if (creating) {
      // Keep the existing per-user/per-restaurant device storage contract. Never
      // allow the following automatic refresh to race a pending initial write.
      const preferences = { ...emptyOwnerDraft(), closedDays };
      try { await writeOwnerDraft(user!.id, result.id, preferences); }
      catch {
        // The restaurant already exists on the server: do not leave the create
        // form open and accidentally POST a duplicate when the user retries.
        changeRestaurant(result.id); setPage('main'); setTab('my');
        setDialog({ title: '식당은 등록됐어요', message: '정기 휴무일을 저장하지 못했어요. My에서 다시 설정해 주세요.', confirm: '확인' });
        return;
      }
      changeRestaurant(result.id); setDraft(preferences); setPage('setupPerks');
    }
    else { setPage('main'); setTab('my'); }
    setDialog({ title: creating ? '식당이 등록됐어요' : '식당 정보를 저장했어요', message: creating ? '이어서 단계별 프로모션을 입력해주세요.' : '손님 화면에도 변경한 정보가 반영돼요.', confirm: '확인' });
  }); };
  const saveDraft = (value: OwnerDraft) => { void mutate(async () => {
    if (!selected) return;
    const saved = await writeOwnerDraft(user!.id, selected.id, value); setDraft(saved);
    if (page === 'setupPerks' || page === 'perks') setTab('promotion');
    setPage('main');
  }); };
  const submit = () => {
    if (!level || !selected) return;
    const id = selected.id; const submittedLevel = level; const submittedDescription = description.trim();
    setDialog({ title: '혼잡도 제보', message: `${selected.name}\n${crowdLabels[level]} 상태로 제보할까요?${submittedDescription ? '\n추가 설명도 함께 저장돼요.' : ''}`, cancel: '아니요', confirm: '예', onConfirm: () => { void mutate(async () => {
      const result = await reportCrowd(id, { level: submittedLevel }, token!);
      const saved = { ...result, description: submittedDescription };
      setReports(previous => [saved, ...previous.filter(r => r.id !== saved.id)]); setLevel(null); setDescription(''); setPage('main');
      try { await writeOwnerReport(user!.id, id, saved); }
      catch {
        setDialog({ title: '혼잡도는 전송됐어요', message: '제보 내역과 추가 설명을 저장하지 못했어요. 혼잡도를 다시 전송할 필요는 없어요.', confirm: '확인' });
        return;
      }
      await refresh(); setDialog({ title: '제보가 완료됐어요', message: submittedDescription ? '혼잡도와 추가 설명을 저장했어요.' : '가게 혼잡도에 반영했어요.', confirm: '확인' });
    }); } });
  };
  const signOut = () => setDialog({ title: '로그아웃', message: '로그아웃할까요?', cancel: '취소', confirm: '로그아웃', onConfirm: () => { void mutate(async () => { await logout(); onLogout(); }); } });
  const editDraft = (next: 'perks' | 'closed' | 'notice') => {
    if (draft) setPage(next);
    else setDialog({ title: '정보 확인 필요', message: '저장한 정보를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.', confirm: '확인' });
  };
  const publish = (schedule: PromotionSchedule, pointsCost: number) => { void mutate(async () => {
    if (!selected || !draft) return;
    await publishDevicePromotion(user!, selected, publishingStage, draft.perks[publishingStage - 1], schedule, pointsCost);
    await coupons.refresh(); setPage('main'); setTab('promotion');
  }); };
  const cancelPublished = (promotion: DevicePromotion) => setDialog({ title: '프로모션 발행을 취소할까요?',
    message: `${promotion.benefit}\n새 다운로드가 중단돼요. 이미 받은 쿠폰은 각자의 만료 시각까지 사용할 수 있어요.`, cancel: '돌아가기', confirm: '발행 취소',
    onConfirm: () => { void mutate(async () => { await cancelDevicePromotion(user!, promotion.id); await coupons.refresh(); }); } });
  const published = coupons.promotions.filter(p => p.ownerKey === (user ? deviceUserKey(user) : '') && p.restaurantId === selectedId && isPromotionDownloadable(p, coupons.now));
  const activeOffers = promotions?.filter(p => !isTemporaryPromotion(p) && p.enabled && koreaObservationTime(p.startAt) <= Date.now() && koreaObservationTime(p.endAt) >= Date.now()) ?? [];
  const activeStages = published.map(p => `${p.stage}단계 · ${p.benefit}`);
  const activeLabels = [...activeStages, ...activeOffers.map(p => p.title)];
  const businessChange = draft?.businessChange;

  return <View style={styles.root}><KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={page === 'main' ? <RefreshControl refreshing={loading || coupons.loading} onRefresh={() => { if (!lock.current) { void refresh(); void coupons.refresh(); } }} /> : undefined}>
      <View style={styles.header}><HeaderLogo />{tab === 'my' && page === 'main' && <Pressable accessibilityRole="button" disabled={busy} onPress={signOut} style={styles.headerAction}><Text style={t.small}>로그아웃</Text></Pressable>}</View>
      <View style={styles.section}>
        {page !== 'main' && selected && page !== 'setupPerks' && <OwnerBack onPress={back} disabled={busy} />}
        {page === 'main' && selected && <View style={styles.restaurantSelector}>
          <Text numberOfLines={2} style={[t.small, styles.flex]}>{selected.name}</Text></View>}
        {Boolean(error) && <View style={styles.errorBox}><Text style={t.small}>{error}</Text><OwnerButton secondary disabled={busy || loading} onPress={() => { void refresh(); }}>다시 시도</OwnerButton></View>}
        {page === 'create' || page === 'hours' || page === 'location' ? <RestaurantForm key={page} mode={page} restaurant={page === 'create' ? null : selected} closedDays={draft?.closedDays} busy={busy} onSave={saveRestaurant} /> :
          !selected ? loading ? <ActivityIndicator color={c.black} /> : null :
          page === 'setupPerks' || page === 'perks' ? draft ? <PerksForm draft={draft} initial={page === 'setupPerks'} busy={busy} onSave={perks => saveDraft({ ...draft, perks })} /> : <ActivityIndicator color={c.black} /> :
          page === 'closed' || page === 'notice' ? draft ? <ScheduleForm key={page} draft={draft} restaurant={selected} mode={page} busy={busy} onSave={saveDraft} /> : <ActivityIndicator color={c.black} /> :
          page === 'publish' ? draft ? <PromotionOptionsForm key={publishingStage} benefit={draft.perks[publishingStage - 1]} busy={busy} onSave={publish}
            expiryDescription="게시 기간과 별개로, 받은 쿠폰은 다운로드 후 3일 동안 유효해요." /> : <ActivityIndicator color={c.black} /> :
          page === 'submit' ? <>
            <Text style={t.title}>사장님의{ '\n' }혼잡도 제보가 필요해요</Text>
            <View style={styles.reportCard}><Text style={[t.heading, styles.center]}>혼잡도를 제보해주세요!</Text><View style={styles.levels}>
              {levels.map((value, i) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: level === value, disabled: busy }} disabled={busy}
                onPress={() => setLevel(value)} style={[styles.level, level === value && styles.checked]}><Text style={[t.small, styles.center]}>{crowdLabels[value]}</Text>
                <View style={[styles.dot, { backgroundColor: [c.available, c.few, c.wait][i] }]} /><Text style={t.small}>{level === value ? '선택됨' : '선택'}</Text></Pressable>)}
            </View><OwnerField label="추가 설명 (선택)" placeholder="예) 현재 대기 3팀" value={description} onChangeText={setDescription} multiline maxLength={200} editable={!busy} /></View>
            <View style={styles.submitSpace}><OwnerButton disabled={!level || busy} onPress={submit}>{busy ? '제보 중...' : '완료'}</OwnerButton></View>
          </> : tab === 'report' ? <>
            <Text style={t.title}>가게 혼잡도 제보</Text><View style={styles.actions}>
              <Text style={[t.small, styles.offerTag]}>{activeLabels.length ? activeLabels.join('\n') : coupons.error ? '프로모션 확인 실패' : promotions === null || coupons.loading ? '프로모션 확인 중' : '진행 중인 프로모션이 없어요.'}</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setLevel(null); setDescription(''); setPage('submit'); }} style={styles.reportButton}><Text style={t.body}>점주가 제보하기</Text></Pressable></View>
            <View style={styles.reportPanel}><Text style={t.heading}>최근 제보</Text><Text style={[t.small, { color: c.muted }]}>내가 작성한 제보</Text>
              {!!reportsError && <Text style={t.small}>{reportsError}</Text>}
              {reports.filter(r => r.restaurantId === selectedId).sort((a, b) => koreaObservationTime(b.reportedAt) - koreaObservationTime(a.reportedAt)).map(r => <View key={r.id} style={styles.reportRow}><Text style={t.body}>{user?.nickname} · 점주</Text><CrowdBadge level={r.level} />{!!r.description && <Text style={t.body}>{r.description}</Text>}<Text style={t.small}>{dateLabel(r.reportedAt)}</Text></View>)}
            </View>
          </> : tab === 'promotion' ? <>
            <View style={styles.titleRow}><Text style={[t.title, styles.flex]}>프로모션</Text><Pressable accessibilityRole="button" accessibilityLabel="프로모션 수정" disabled={busy} onPress={() => editDraft('perks')} style={styles.smallAction}><Text style={t.body}>수정</Text></Pressable></View>
            {!!coupons.error && <View style={styles.errorBox}><Text style={t.small}>{coupons.error}</Text><OwnerButton secondary disabled={busy} onPress={() => { void coupons.refresh(); }}>다시 불러오기</OwnerButton></View>}
            {[0, 1, 2].map(i => {
              const active = published.find(p => p.stage === i + 1);
              return <View key={i} style={styles.stage}><View style={styles.titleRow}><Text style={[t.heading, styles.flex]}>{i + 1}단계</Text>{active && <Text style={t.small}>발행 중</Text>}</View>
                <View style={styles.stageBox}><Text style={t.body}>{active?.benefit || draft?.perks[i] || '아직 설정하지 않았어요'}</Text></View>
                {active && <><Text style={t.small}>{active.pointsCost.toLocaleString('ko-KR')}P · {scheduleSummary(active.schedule)}</Text><Text style={t.small}>{active.schedule.noEndDate ? '게시 종료일 없음' : `${active.schedule.endDate}까지 다운로드 가능`}</Text>
                  {draft?.perks[i] !== active.benefit && <Text style={t.small}>수정한 혜택은 발행 취소 후 다시 발행할 때 적용돼요.</Text>}</>}
                <OwnerButton secondary={!!active} disabled={busy || coupons.loading || !!coupons.error || (!active && !draft?.perks[i].trim())}
                  onPress={() => { if (active) cancelPublished(active); else { setPublishingStage((i + 1) as 1 | 2 | 3); setPage('publish'); } }}>{active ? '발행 취소' : '발행하기'}</OwnerButton>
              </View>;
            })}
          </> : tab === 'data' ? <OwnerAnalytics key={selected.id} restaurantId={selected.id} points={reports.map(r => ({ time: r.reportedAt, level: r.level }))} tieBreak="latest"
            dataScope="내가 작성한 제보 기준" emptyMessage="최근 4주에 작성한 제보가 없어요." loading={loading} error={reportsError} /> : <>
            <Text style={t.title}>내 식당 정보</Text>
            <OwnerInfoRow label="정기 휴무일" value={draft ? draft.closedDays.length ? `매주 ${draft.closedDays.map(d => weekdays[d]).join('·')}요일` : '설정된 정기 휴무 없음' : '정보 확인 필요'} onPress={() => editDraft('closed')} />
            <OwnerInfoRow label="영업 시간" value={`${selected.openingTime?.slice(0, 5) ?? '미등록'} ~ ${selected.closingTime?.slice(0, 5) ?? '미등록'}`} onPress={() => setPage('hours')} />
            <OwnerInfoRow label="식당 위치" value={selected.address} onPress={() => setPage('location')} />
            <OwnerInfoRow label="영업 변경 사항" value={businessChange ? `${businessChange.date} · ${businessChange.status === 'CLOSED' ? '휴무' : `영업 ${businessChange.openingTime} ~ ${businessChange.closingTime}`}` : draft?.notice ? `${draft.noticeDate} ${draft.notice}` : '등록된 변경 사항 없음'} action="입력" onPress={() => editDraft('notice')} />
            <Text style={t.small}>{user?.nickname} · {user?.email}</Text>
          </>}
      </View>
    </ScrollView>
    {selected && page !== 'setupPerks' && <OwnerNavigation tab={tab} onSelect={selectTab} disabled={busy} />}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: px(12) }, stage: { gap: px(10) }, stageBox: { minHeight: px(74), padding: px(16), borderRadius: s.radius, backgroundColor: c.row, justifyContent: 'center' },
  reportButton: { minHeight: px(44), justifyContent: 'center', backgroundColor: c.brandYellow, borderRadius: px(12), padding: px(8), borderWidth: 1, borderColor: c.border },
  reportPanel: { minHeight: px(350), backgroundColor: c.panel, padding: px(20), borderRadius: s.radius, gap: px(16) },
  reportRow: { gap: px(6), paddingVertical: px(12), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  reportCard: { backgroundColor: c.dialog, borderWidth: 1, borderColor: c.border, borderRadius: px(20), padding: px(14), gap: px(24) },
  levels: { flexDirection: 'row' }, level: { flex: 1, backgroundColor: c.brandYellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: px(3), paddingVertical: px(12), gap: px(10), borderWidth: 1, borderColor: c.row },
  checked: { backgroundColor: c.edit, borderColor: c.black }, dot: { width: px(20), height: px(20), borderRadius: px(10) }, center: { textAlign: 'center' }, submitSpace: { paddingTop: px(40) },
  smallAction: { minHeight: px(44), minWidth: px(66), alignItems: 'center', justifyContent: 'center', borderRadius: px(8), backgroundColor: c.brandYellow, paddingHorizontal: px(12) },
});
