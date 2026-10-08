import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { User } from '../api/types';
import { downloadDeviceCoupon, useDeviceCoupon } from '../coupons/deviceStore';
import { couponStatus, isPromotionDownloadable, type DeviceCoupon, type DevicePromotion, type DeviceWallet } from '../coupons/model';
import { scheduleSummary } from '../coupons/schedule';
import { CustomerButton } from './CustomerControls';
import { CustomerDialog, type CustomerDialogState } from './CustomerDialog';
import { customerColors as c, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';

function expiresLabel(date: string) {
  return new Date(date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CustomerPointBalance({ wallet, error, loading, onRefresh }: {
  wallet: DeviceWallet | null; error: string; loading: boolean; onRefresh: () => void;
}) {
  return <View style={styles.points}><Text style={t.body}>내 포인트</Text>
    {error ? <><Text accessibilityRole="alert" style={t.small}>{error}</Text><CustomerButton onPress={onRefresh}>다시 불러오기</CustomerButton></>
      : !wallet ? <ActivityIndicator accessibilityLabel="포인트 불러오는 중" />
        : <Text style={t.heading}>{wallet.balance.toLocaleString('ko-KR')}P</Text>}
    <Text style={[t.small, styles.muted]}>기기 테스트 · 1P = 1원 혜택 기준</Text>
    {loading && wallet && <ActivityIndicator accessibilityLabel="포인트 새로고침 중" />}
  </View>;
}

export function DownloadableCoupons({ user, promotions, wallet, now, disabled, onChanged }: {
  user: User; promotions: DevicePromotion[]; wallet: DeviceWallet | null; now: number; disabled: boolean; onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const lock = useRef(false);
  const download = async (promotion: DevicePromotion) => {
    if (lock.current) return;
    lock.current = true; setBusyId(promotion.id);
    try {
      await downloadDeviceCoupon(user, promotion.id);
      await onChanged();
      setDialog({ title: '쿠폰을 받았어요', message: 'My의 내 쿠폰함에서 확인해 주세요.\n다운로드한 시각부터 3일 동안 유효해요.', confirm: '확인' });
    } catch (failure) {
      setDialog({ title: '쿠폰을 받지 못했어요', message: failure instanceof Error ? failure.message : '잠시 후 다시 시도해 주세요.', confirm: '확인' });
    } finally { lock.current = false; setBusyId(null); }
  };
  const available = promotions.filter(p => isPromotionDownloadable(p, now));
  return <View style={styles.group}><Text style={t.heading}>받을 수 있는 쿠폰</Text>
    <Text style={[t.small, styles.muted]}>이 기기에서 발행한 쿠폰 · 거리 제한 없이 다운로드</Text>
    {!available.length && <Text style={t.body}>발행 중인 쿠폰이 없어요.</Text>}
    {available.map(promotion => {
      const owned = wallet?.coupons.some(coupon => coupon.promotionId === promotion.id && !['expired', 'used'].includes(couponStatus(coupon, now)));
      const insufficient = wallet !== null && wallet.balance < promotion.pointsCost;
      return <View key={promotion.id} style={styles.card}>
        <Text style={t.small}>{promotion.stage}단계 쿠폰</Text><Text style={t.heading}>{promotion.benefit}</Text>
        <Text style={t.small}>{scheduleSummary(promotion.schedule)}</Text>
        <Text style={t.small}>{promotion.pointsCost.toLocaleString('ko-KR')}P · 받은 후 3일</Text>
        <CustomerButton disabled={disabled || !!busyId || !wallet || owned || insufficient} onPress={() => setDialog({
          title: '쿠폰을 받을까요?', message: `${promotion.benefit}\n${promotion.pointsCost.toLocaleString('ko-KR')}P가 차감돼요.\n사용 가능 요일·시간을 확인해 주세요.`, cancel: '취소', confirm: '다운로드', onConfirm: () => { void download(promotion); },
        })}>{busyId === promotion.id ? '받는 중…' : owned ? '내 쿠폰함에 있어요' : insufficient ? '포인트가 부족해요' : '쿠폰 다운로드'}</CustomerButton>
      </View>;
    })}
    <CustomerDialog value={dialog} onClose={() => setDialog(null)} />
  </View>;
}

const statusLabels = { available: '사용 가능', 'outside-hours': '사용 시간 아님', expired: '기간 만료', used: '사용 완료' };
export function CustomerCouponWallet({ user, wallet, now, disabled, onChanged }: {
  user: User; wallet: DeviceWallet | null; now: number; disabled: boolean; onChanged: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<'available' | 'history'>('available');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const lock = useRef(false);
  const useCoupon = async (coupon: DeviceCoupon) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await useDeviceCoupon(user, coupon.id); await onChanged();
      setDialog({ title: '사용 완료', message: `${coupon.restaurantName}\n${coupon.benefit}\n쿠폰 사용을 기기에 기록했어요.`, confirm: '확인' });
    } catch (failure) {
      setDialog({ title: '쿠폰을 사용하지 못했어요', message: failure instanceof Error ? failure.message : '잠시 후 다시 시도해 주세요.', confirm: '확인' });
    } finally { lock.current = false; setBusy(false); }
  };
  const coupons = [...(wallet?.coupons ?? [])].sort((a, b) => Date.parse(b.downloadedAt) - Date.parse(a.downloadedAt))
    .filter(coupon => ['expired', 'used'].includes(couponStatus(coupon, now)) === (filter === 'history'));
  return <View style={styles.group}><Text style={t.heading}>내 쿠폰함</Text>
    <View style={styles.filters}>{(['available', 'history'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }}
      onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.selected]}><Text style={[t.small, filter === value && { color: c.white }]}>{value === 'available' ? '보유 쿠폰' : '사용·만료'}</Text></Pressable>)}</View>
    <Text style={[t.small, styles.muted]}>기기 테스트 · 받은 쿠폰은 3일간 유효</Text>
    {!coupons.length && <Text style={t.body}>{filter === 'available' ? '받은 쿠폰이 없어요.' : '사용·만료된 쿠폰이 없어요.'}</Text>}
    {coupons.map(coupon => {
      const status = couponStatus(coupon, now);
      return <View key={coupon.id} style={styles.card}><View style={styles.titleRow}><Text style={[t.body, styles.flex]}>{coupon.restaurantName}</Text><Text style={t.small}>{statusLabels[status]}</Text></View>
        <Text style={t.heading}>{coupon.benefit}</Text><Text style={t.small}>{scheduleSummary(coupon.schedule)}</Text>
        <Text style={t.small}>{expiresLabel(coupon.expiresAt)}까지</Text>
        {status !== 'used' && status !== 'expired' && <CustomerButton disabled={disabled || busy || status !== 'available'} onPress={() => setDialog({
          title: '쿠폰을 사용할까요?', message: `${coupon.restaurantName}\n${coupon.benefit}\n사용 완료로 바꾸면 되돌릴 수 없어요.`, cancel: '취소', confirm: '사용하기', onConfirm: () => { void useCoupon(coupon); },
        })}>{status === 'outside-hours' ? '지정된 요일·시간에 사용 가능' : busy ? '처리 중…' : '사용하기'}</CustomerButton>}
      </View>;
    })}
    <CustomerDialog value={dialog} onClose={() => setDialog(null)} />
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: px(16) }, points: { padding: px(20), borderRadius: px(16), backgroundColor: c.panel, gap: px(8) },
  card: { gap: px(12), padding: px(18), borderRadius: px(16), backgroundColor: c.guest },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: px(12) }, flex: { flex: 1 },
  muted: { color: c.muted }, filters: { flexDirection: 'row', gap: px(8) },
  filter: { flex: 1, minHeight: px(44), alignItems: 'center', justifyContent: 'center', borderRadius: px(12), backgroundColor: c.neutralButton },
  selected: { backgroundColor: c.black },
});
