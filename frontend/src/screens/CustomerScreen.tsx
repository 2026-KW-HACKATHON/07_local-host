import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, KeyboardAvoidingView, Linking, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRestaurants } from '../api/restaurants';
import { getCurrentCrowd, getCrowdChart, reportCrowd } from '../api/crowd';
import { getActivePromotions } from '../api/promotions';
import type { CrowdChartResponse, CrowdReportResponse, Restaurant, ReportableCrowdLevel } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { HeaderLogo } from '../components/BrandAssets';
import { CustomerDialog, type CustomerDialogState } from '../components/CustomerDialog';
import { CrowdChart } from '../components/CrowdChart';
import { CustomerRestaurantSheet } from '../components/CustomerRestaurantSheet';
import { CustomerProfile } from '../components/CustomerProfile';
import { CustomerNaverSearch } from '../components/CustomerNaverSearch';
import { StayObservationPanel } from '../components/StayObservationPanel';
import { getEligibleStayRestaurants, getStayStatus, isStayReportLink } from '../location/stayService';
import { useStayReportPrompt } from '../location/useStayReportPrompt';
import { activeBenefits, distanceLabel, naverSearchUrls, RESTAURANT_PAGE_SIZE, selectRestaurants, type RestaurantSort, type RestaurantSummary } from '../customer/restaurantList';
import { CustomerButton, CustomerNavigation, CustomerSearch, CrowdBadge, crowdLabels, type CustomerTab } from '../components/CustomerControls';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { metrics, px } from '../theme/tokens';

type Report = CrowdReportResponse & { restaurantName: string };
const levels: ReportableCrowdLevel[] = ['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'];

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '시간 정보 없음' : date.toLocaleString('ko-KR');
}

export function CustomerScreen({ onLogout }: { onLogout: () => void }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<CustomerTab>('home');
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const [query, setQuery] = useState('');
  const [naverQuery, setNaverQuery] = useState<string | null>(null);
  const [sort, setSort] = useState<RestaurantSort>('거리순');
  const [visibleCount, setVisibleCount] = useState(RESTAURANT_PAGE_SIZE);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [sortOpen, setSortOpen] = useState(false);
  const [rows, setRows] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [level, setLevel] = useState<ReportableCrowdLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [history, setHistory] = useState<Report[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chart, setChart] = useState<CrowdChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');
  const request = useRef(0);
  const reportInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError('');
    try {
      const restaurants = await getRestaurants();
      const summaries = await Promise.all(restaurants.map(async restaurant => {
        const [crowd, promotions] = await Promise.allSettled([
          getCurrentCrowd(restaurant.id), getActivePromotions(restaurant.id),
        ]);
        return { restaurant, crowd: crowd.status === 'fulfilled' ? crowd.value : null,
          promotions: promotions.status === 'fulfilled' ? promotions.value : null };
      }));
      if (current === request.current) setRows(summaries);
    } catch { if (current === request.current) setError('식당 목록을 불러오지 못했어요. 서버 연결을 확인하고 다시 시도해 주세요.'); }
    finally { if (current === request.current) setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  useEffect(() => {
    const openReport = (url: string | null) => {
      if (isStayReportLink(url)) { setNaverQuery(null); setDialog(null); setTab('report'); setSelectedId(null); setReportId(null); setLevel(null); }
    };
    void Linking.getInitialURL().then(openReport);
    const subscription = Linking.addEventListener('url', ({ url }) => openReport(url));
    return () => subscription.remove();
  }, []);
  const isConfirmedCandidate = (id: number) => {
    const status = getStayStatus();
    return getEligibleStayRestaurants(status).some(restaurant => restaurant.id === String(id));
  };
  useEffect(() => {
    const update = () => {
      setGpsVerified(reportId !== null && isConfirmedCandidate(reportId));
      const status = getStayStatus();
      const next = Object.fromEntries(getEligibleStayRestaurants(status).map(item => [item.id, item.distanceMeters]));
      setDistances(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const timer = setInterval(update, 3000);
    return () => clearInterval(timer);
  }, [reportId]);
  useEffect(() => {
    let active = true;
    setChart(null); setChartError('');
    if (!showChart || selectedId === null) return;
    setChartLoading(true);
    void getCrowdChart(selectedId, 24).then(result => { if (active) setChart(result); })
      .catch(() => { if (active) setChartError('통계 정보를 불러오지 못했어요.'); })
      .finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [showChart, selectedId]);

  const selectTab = (next: CustomerTab) => {
    if (reportInFlight.current) return;
    setTab(next); setQuery(''); setSelectedId(null); setShowChart(false);
    setSortOpen(false); setShowHistory(false); setReportId(null); setLevel(null);
    setVisibleCount(RESTAURANT_PAGE_SIZE);
  };
  useStayReportPrompt(() => { setNaverQuery(null); setDialog(null); selectTab('report'); });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showChart) { setShowChart(false); return true; }
      if (selectedId !== null) { setSelectedId(null); return true; }
      if (showHistory) { setShowHistory(false); return true; }
      if (tab !== 'home') { selectTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [selectedId, showHistory, showChart, tab]);

  const filtered = useMemo(() => selectRestaurants(rows, query, sort, distances), [rows, query, sort, distances]);
  useEffect(() => { setVisibleCount(RESTAURANT_PAGE_SIZE); }, [query, sort]);
  const selected = rows.find(row => row.restaurant.id === selectedId);
  const reportRestaurant = rows.find(row => row.restaurant.id === reportId)?.restaurant;
  const selectedBenefits = activeBenefits(selected?.promotions ?? null);

  const submit = async () => {
    if (!token || !reportRestaurant || !level || reportInFlight.current) return;
    if (!isConfirmedCandidate(reportRestaurant.id)) {
      Alert.alert('GPS 체류 확인이 필요해요', '체류 확인을 시작하고 5분 후 추천된 식당을 선택해 주세요. Expo Go에서는 제보 화면을 미리볼 수 있지만 GPS 확인과 제출은 APK가 필요해요.', [{ text: '확인' }]);
      return;
    }
    reportInFlight.current = true;
    setSubmitting(true);
    try {
      const response = await reportCrowd(reportRestaurant.id, { level }, token);
      setHistory(previous => [{ ...response, restaurantName: reportRestaurant.name }, ...previous]);
      setLevel(null); setReportId(null);
      setDialog({ title: '제보가 완료됐어요', message: '식당의 혼잡도를 알려주셔서 고마워요.\n포인트 적립 서비스는 준비 중이에요.', confirm: '확인' });
      await refresh();
    } catch { Alert.alert('제보하지 못했어요', '로그인 상태와 서버 연결을 확인하고 다시 시도해 주세요.', [{ text: '확인' }]); }
    finally { reportInFlight.current = false; setSubmitting(false); }
  };
  const confirmSubmit = () => {
    if (!reportRestaurant || !level) return;
    setDialog({ title: '혼잡도 제보', message: `${reportRestaurant.name}\n${crowdLabels[level]} 상태로 제보할까요?`,
      cancel: '아니요', confirm: '예', onConfirm: () => { void submit(); } });
  };
  const openMap = async (restaurant: Restaurant) => {
    await searchNaver(`${restaurant.name} ${restaurant.address}`);
  };
  const searchNaver = async (text = query) => {
    const urls = naverSearchUrls(text);
    if (!urls) { Alert.alert('검색어를 입력해 주세요', '식당 이름이나 지역을 입력하면 네이버 지도에서 검색할 수 있어요.'); return; }
    Keyboard.dismiss();
    setNaverQuery(text.trim());
  };
  const beginReport = (restaurant: Restaurant) => {
    if (!isConfirmedCandidate(restaurant.id)) {
      Alert.alert('근처 식당에서만 제보할 수 있어요', '위치 확인을 시작하고 같은 곳에 5분 동안 머물러 주세요. 근처 식당이 확인되면 제보 알림이 도착해요.', [
        { text: '취소', style: 'cancel' }, { text: '체류 확인하기', onPress: () => selectTab('report') },
      ]);
      return;
    }
    setDialog({ title: '입장 확인', message: `${restaurant.name}에 입장하셨나요?\n직접 확인한 혼잡도를 알려 주세요.`,
      cancel: '아니요', confirm: '예', onConfirm: () => {
        if (!isConfirmedCandidate(restaurant.id)) { selectTab('report'); return; }
        setTab('report'); setReportId(restaurant.id); setLevel(null); setSelectedId(null); setQuery('');
      } });
  };

  const empty = <View style={styles.message}>
    <Text style={t.body}>{rows.length ? '검색 결과가 없어요.' : '아직 등록된 식당이 없어요.'}</Text>
    <Text style={[t.small, styles.muted]}>{query.trim() ? '검색 버튼을 누르면 네이버 지도에서 더 많은 식당을 찾을 수 있어요.' : '점주가 식당을 등록하면 이곳에 표시돼요.'}</Text>
  </View>;
  const list = <>
    {filtered.length ? filtered.slice(0, visibleCount).map(row => <Pressable key={row.restaurant.id} accessibilityRole="button"
      accessibilityLabel={`${row.restaurant.name}, ${row.crowd ? crowdLabels[row.crowd.level] : '혼잡도 확인 실패'}`}
      onPress={() => setSelectedId(row.restaurant.id)}
      style={[styles.restaurant, reportId === row.restaurant.id && styles.selectedRestaurant]}>
      <View style={styles.rowTitle}><Text style={[t.heading, styles.flexText]}>{row.restaurant.name}</Text>
        <Text style={[t.small, styles.muted]}>{distanceLabel(distances[String(row.restaurant.id)])}</Text></View>
      <Text style={[t.small, styles.muted]}>{row.restaurant.address}</Text>
      {row.crowd ? <CrowdBadge level={row.crowd.level} /> : <Text style={t.small}>혼잡도를 불러오지 못했어요.</Text>}
      {activeBenefits(row.promotions).length > 0 && <Text style={t.small}>진행 중인 할인 혜택 {activeBenefits(row.promotions).length}개</Text>}
    </Pressable>) : empty}
    {filtered.length > 0 && <View style={styles.moreArea}>
      <Text style={[t.small, styles.muted]}>{Math.min(visibleCount, filtered.length)} / {filtered.length}개 식당</Text>
      {visibleCount < filtered.length && <CustomerButton onPress={() => setVisibleCount(count => count + RESTAURANT_PAGE_SIZE)}>
        식당 {Math.min(RESTAURANT_PAGE_SIZE, filtered.length - visibleCount)}개 더 보기
      </CustomerButton>}
    </View>}
  </>;
  const stayPanel = <StayObservationPanel onSelect={candidate => {
    const restaurant = rows.find(row => String(row.restaurant.id) === candidate.id)?.restaurant;
    if (restaurant) beginReport(restaurant);
    else Alert.alert('식당 정보 확인 필요', '식당 목록을 새로고침한 뒤 다시 선택해 주세요.', [{ text: '확인', onPress: () => { void refresh(); } }]);
  }} />;
  const logoutAction = () => Alert.alert('로그아웃', '로그아웃할까요?', [
    { text: '취소', style: 'cancel' }, { text: '로그아웃', onPress: () => { void logout().then(onLogout).catch(() => Alert.alert('로그아웃하지 못했어요', '다시 시도해 주세요.')); } },
  ]);
  const homeList = tab === 'home' && !selected;

  return <View style={styles.root}><KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {homeList ? <CustomerRestaurantSheet refreshing={loading} onRefresh={() => { void refresh(); }} resetKey={`${query}|${sort}`}
      header={<><View style={styles.header}><HeaderLogo /></View>
        <View style={styles.searchWrap}><CustomerSearch value={query} onChange={setQuery} onSubmit={() => { void searchNaver(); }} />
          <Text style={[t.small, styles.searchHint]}>검색하면 앱 안에서 네이버 결과를 볼 수 있어요</Text></View></>}
      title={<><Pressable accessibilityRole="button" accessibilityLabel="식당 정렬 선택" onPress={() => setSortOpen(!sortOpen)} style={styles.panelTitle}>
        <Text style={t.heading}>식당 둘러보기</Text><Text style={t.small}>{sort} ▾</Text></Pressable>
        {sortOpen && <View style={styles.sortOptions}>{(['거리순', '여유순', '프로모션'] as RestaurantSort[]).map(value =>
          <Pressable key={value} accessibilityRole="button" onPress={() => { setSort(value); setSortOpen(false); }} style={styles.sortOption}>
            <Text style={[t.body, sort === value && styles.selectedText]}>{value}</Text>
          </Pressable>)}</View>}</>}>
      <Text style={[t.small, styles.listNote]}>{sort === '거리순' ? '거리가 확인된 식당부터 보여드려요. 아직 거리 정보가 없는 식당은 아래에 표시돼요.' : sort === '여유순' ? '최근 제보를 기준으로 여유 있는 식당부터 보여드려요.' : '현재 할인 혜택이 있는 식당을 보여드려요.'}</Text>
      {error ? <View style={styles.message}><Text style={t.body}>{error}</Text><CustomerButton onPress={() => { void refresh(); }}>다시 시도</CustomerButton></View>
        : loading && !rows.length ? <ActivityIndicator color={c.black} /> : list}
    </CustomerRestaurantSheet> : <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }} />}>
      <View style={styles.header}><HeaderLogo />{tab === 'my' && <Pressable accessibilityRole="button" onPress={logoutAction} style={styles.logout}><Text style={t.small}>로그아웃</Text></Pressable>}</View>
      {tab === 'home' && selected && <View style={styles.section}>
        <Pressable accessibilityRole="button" onPress={() => showChart ? setShowChart(false) : setSelectedId(null)}><Text style={t.body}>‹ {showChart ? '식당으로 돌아가기' : '식당 목록'}</Text></Pressable>
        <View style={styles.rowTitle}><Text style={[t.heading, styles.flexText]}>{selected.restaurant.name}</Text>
          <Pressable accessibilityRole="link" onPress={() => { void openMap(selected.restaurant); }}><Text style={t.small}>(지도 보기)</Text></Pressable></View>
        <Text style={t.body}>{selected.restaurant.address}</Text>
        <Text style={t.small}>영업시간 {selected.restaurant.openingTime} ~ {selected.restaurant.closingTime}</Text>
        {showChart ? <View style={styles.panel}>
          <Text style={[t.heading, styles.panelTitle]}>최근 24시간 혼잡도</Text>
          {chartLoading ? <ActivityIndicator /> : chartError ? <Text style={t.body}>{chartError}</Text> : chart ? <CrowdChart chart={chart} /> : <Text style={t.body}>아직 통계가 없어요.</Text>}
        </View> : <>
          {selected.promotions === null ? <Text style={t.small}>할인 혜택을 불러오지 못했어요. 화면을 아래로 당겨 다시 확인해 주세요.</Text> : selectedBenefits.map(promotion => <View key={promotion.id} style={styles.promotion}>
            <Text style={t.body}>{promotion.title}</Text><Text style={t.small}>{promotion.description}</Text>
            <Text style={t.small}>{promotion.discountPercent}% 할인 · {dateLabel(promotion.endAt)}까지</Text>
            <Text style={[t.small, styles.muted]}>현재는 할인 안내만 제공해요. 쿠폰 발급·보유 기능은 아직 연결되지 않았어요.</Text>
            <CustomerButton disabled onPress={() => undefined}>쿠폰 발급 준비 중</CustomerButton>
          </View>)}
          <View style={[styles.panel, styles.statusPanel]}><Text style={t.heading}>현재 혼잡도</Text>
            {selected.crowd ? <><CrowdBadge level={selected.crowd.level} /><Text style={t.small}>제보 {selected.crowd.reportCount}건</Text>
              <Text style={t.small}>{selected.crowd.updatedAt ? `마지막 제보 ${dateLabel(selected.crowd.updatedAt)}` : '아직 제보가 없어요.'}</Text></> : <Text style={t.body}>혼잡도를 불러오지 못했어요.</Text>}
            <Text style={[t.small, styles.muted]}>개별 제보자 목록은 아직 제공되지 않아요.</Text>
          </View>
          <CustomerButton onPress={() => beginReport(selected.restaurant)}>이 식당 제보하기</CustomerButton>
          <Pressable accessibilityRole="button" onPress={() => setShowChart(true)}><Text style={[t.small, styles.link]}>이전 제보는 통계표를 확인하세요</Text></Pressable>
        </>}
      </View>}
      {tab === 'report' && <View style={styles.section}>
        <Text style={t.heading}>가게 혼잡도 제보</Text>
        {!reportRestaurant && stayPanel}
        {reportRestaurant ? <>
          <Pressable accessibilityRole="button" disabled={submitting} onPress={() => { setReportId(null); setLevel(null); }}><Text style={t.body}>‹ 다른 식당 선택</Text></Pressable>
          <Text style={t.heading}>{reportRestaurant.name}</Text><Text style={t.small}>{reportRestaurant.address}</Text>
          <View style={styles.reportCard}><Text style={[t.heading, styles.centerText]}>혼잡도를 제보해 주세요!</Text>
            <View style={styles.levelChoices}>
            {levels.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: level === value, disabled: submitting }}
              disabled={submitting} onPress={() => setLevel(value)} style={[styles.levelOption, level === value && styles.selectedRestaurant]}>
              <View style={[styles.levelDot, { backgroundColor: value === 'AVAILABLE' ? c.available : value === 'FEW_SEATS' ? c.fewSeats : c.longWait }]} />
              <Text style={[t.small, styles.centerText]}>{crowdLabels[value]}</Text>
              <Text style={styles.choiceState}>{level === value ? '선택됨' : '선택'}</Text>
            </Pressable>)}
            </View>
          </View>
          {!gpsVerified && <Text style={[t.small, styles.muted]}>위치 확인이 만료되었거나 식당에서 벗어났어요. 체류 확인 후 다시 선택해 주세요.</Text>}
          <CustomerButton disabled={!level || submitting || !gpsVerified} onPress={confirmSubmit}>{submitting ? '제보 중...' : '완료'}</CustomerButton>
          {stayPanel}
        </> : <Text style={[t.small, styles.muted]}>현재 위치에서 5분 체류가 확인된 근처 식당만 위에 표시돼요. 다른 지역의 식당에는 제보할 수 없어요.</Text>}
      </View>}
      {tab === 'my' && <View style={styles.section}>
        {showHistory ? <>
          <Pressable accessibilityRole="button" onPress={() => setShowHistory(false)}><Text style={t.body}>‹ My</Text></Pressable>
          <Text style={t.heading}>내 제보 보기</Text><Text style={[t.small, styles.muted]}>현재 로그인 중 작성한 제보만 표시돼요.</Text>
          {history.length ? history.map(report => <View key={report.id} style={styles.restaurant}><Text style={t.small}>{dateLabel(report.reportedAt)}</Text>
            <Text style={t.body}>{report.restaurantName}</Text><CrowdBadge level={report.level} /></View>) : <Text style={t.body}>아직 작성한 제보가 없어요.</Text>}
        </> : <>
          {user && <CustomerProfile user={user} />}
          <View style={styles.historyActionRow}><Pressable accessibilityRole="button" onPress={() => setShowHistory(true)} style={styles.historyAction}><Text style={t.small}>내 제보 보기</Text></Pressable></View>
          <Text style={t.heading}>받은 쿠폰</Text><View style={styles.couponEmpty}><Text style={t.body}>쿠폰 보관함 준비 중</Text>
            <Text style={[t.small, styles.muted]}>쿠폰 발급과 보유 내역 조회가 아직 연결되지 않았어요. 식당에 올라온 할인 안내는 홈에서 확인할 수 있어요.</Text></View>
        </>}
      </View>}
    </ScrollView>}
    <CustomerNavigation selected={tab} onSelect={selectTab} />
    <CustomerDialog value={dialog} onClose={() => setDialog(null)} />
    {naverQuery !== null && <CustomerNaverSearch query={naverQuery} onClose={() => setNaverQuery(null)} />}
  </KeyboardAvoidingView></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: c.white },
  shell: { flex: 1, width: '100%', maxWidth: metrics.canvasWidth, backgroundColor: c.white },
  scroll: { flex: 1 }, content: { flexGrow: 1 },
  header: { paddingTop: m.headerTop, paddingHorizontal: m.gutter, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logout: { minHeight: px(48), paddingLeft: px(16), justifyContent: 'center' },
  searchWrap: { alignItems: 'center', marginTop: m.headerGap, paddingHorizontal: m.gutter },
  section: { paddingHorizontal: m.gutter, gap: m.sectionGap, paddingTop: m.sectionGap, paddingBottom: m.sectionGap },
  panel: { backgroundColor: c.panel, borderRadius: m.panelRadius, overflow: 'hidden' },
  panelTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: m.gutter, paddingVertical: px(12), gap: px(8) },
  searchHint: { color: c.muted, marginTop: px(8) },
  moreArea: { padding: m.gutter, gap: px(12) },
  listNote: { color: c.muted, paddingHorizontal: m.gutter, paddingBottom: px(12) },
  restaurant: { paddingHorizontal: m.gutter, paddingVertical: m.rowPadding, gap: px(4), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: px(8) }, flexText: { flex: 1 },
  promotion: { backgroundColor: c.guest, padding: m.rowPadding, borderRadius: px(10), gap: px(8) },
  message: { padding: m.gutter, gap: m.sectionGap }, muted: { color: c.muted },
  sortOptions: { paddingHorizontal: m.gutter, backgroundColor: c.white }, sortOption: { paddingVertical: px(12) },
  selectedText: { textDecorationLine: 'underline' },
  statusPanel: { padding: m.rowPadding, gap: px(12) },
  reportCard: { backgroundColor: c.dialog, padding: px(20), borderRadius: px(20), gap: px(24), borderWidth: StyleSheet.hairlineWidth, borderColor: c.divider },
  levelChoices: { flexDirection: 'row', gap: px(8) },
  levelOption: { flex: 1, minHeight: px(126), alignItems: 'center', justifyContent: 'center', padding: px(8), gap: px(8), borderRadius: px(12), borderWidth: 1, borderColor: c.divider },
  levelDot: { width: px(24), height: px(24), borderRadius: px(12) },
  choiceState: { ...t.small, color: c.muted }, centerText: { textAlign: 'center' },
  selectedRestaurant: { backgroundColor: c.neutralButton, borderColor: c.black },
  historyActionRow: { alignItems: 'flex-end', marginTop: px(-12) },
  historyAction: { minHeight: px(44), paddingHorizontal: px(16), justifyContent: 'center', borderWidth: 1, borderColor: c.divider, borderRadius: px(8) },
  couponEmpty: { backgroundColor: c.guest, borderRadius: px(10), padding: m.rowPadding, gap: px(8) },
  link: { ...t.small, color: c.black, textDecorationLine: 'underline', paddingVertical: px(12) },
});
