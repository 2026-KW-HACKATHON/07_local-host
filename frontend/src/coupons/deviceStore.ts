import { Directory, File, Paths } from 'expo-file-system';
import type { CrowdReportResponse, Restaurant, User } from '../api/types';
import { API_BASE_URL } from '../config/api';
import { ownerServerKey } from '../owner/draftModel';
import { koreaObservationTime } from '../owner/analytics';
import { koreaScheduleDate, validatePromotionSchedule, type PromotionSchedule } from './schedule';
import { ALLOW_REDOWNLOAD_AFTER_USE_OR_EXPIRY, COUPON_LIFETIME_MS, DEVICE_REPORT_POINTS,
  couponStatus, deviceUserKey, emptyDeviceCouponState, isPromotionDownloadable, newDeviceWallet, parseDeviceCouponState,
  snapshotSchedule, validateCouponCost, validatePromotionBenefit,
  type CouponCost, type DeviceCoupon, type DeviceCouponState, type DevicePromotion, type DeviceWallet } from './model';

export { deviceUserKey } from './model';
const directory = () => new Directory(Paths.document, 'device-coupons', ownerServerKey(API_BASE_URL));
let pending: Promise<unknown> = Promise.resolve();
let temporarySequence = 0;

function serial<T>(action: () => Promise<T>): Promise<T> {
  const current = pending.then(action);
  pending = current.then(() => undefined, () => undefined);
  return current;
}
function assertRole(user: User, role: User['role']): string {
  const key = deviceUserKey(user);
  if (user.role !== role) throw new Error(role === 'OWNER' ? '점주 계정에서만 프로모션을 관리할 수 있어요.' : '손님 계정에서만 쿠폰과 포인트를 사용할 수 있어요.');
  return key;
}
async function read(): Promise<DeviceCouponState> {
  const file = new File(directory(), 'state.json');
  if (!file.exists) return emptyDeviceCouponState(API_BASE_URL);
  return parseDeviceCouponState(await file.text(), API_BASE_URL);
}
async function persist(state: DeviceCouponState): Promise<void> {
  const raw = JSON.stringify(state);
  parseDeviceCouponState(raw, API_BASE_URL);
  const folder = directory();
  folder.create({ intermediates: true, idempotent: true });
  const target = new File(folder, 'state.json');
  const temporary = new File(folder, `.state-${Date.now()}-${++temporarySequence}.tmp`);
  const temporaryUri = temporary.uri;
  let published = false;
  try {
    temporary.write(raw);
    await temporary.move(target, { overwrite: true });
    published = true;
  } finally {
    if (!published) {
      try { if (temporary.uri === temporaryUri && temporary.exists) temporary.delete(); } catch { /* Preserve failed-save temp; never delete the published wallet. */ }
    }
  }
}
function walletFor(state: DeviceCouponState, key: string, now: number): DeviceWallet {
  return state.wallets[key] ?? (state.wallets[key] = newDeviceWallet(now));
}

export function readDeviceCouponState(user: User): Promise<{ promotions: DevicePromotion[]; wallet: DeviceWallet | null }> {
  return serial(async () => {
    const key = deviceUserKey(user);
    const state = await read();
    let wallet: DeviceWallet | null = null;
    if (user.role === 'CUSTOMER') {
      const existed = Boolean(state.wallets[key]);
      wallet = walletFor(state, key, Date.now());
      if (!existed) await persist(state);
    }
    return { promotions: state.promotions, wallet };
  });
}

export function publishDevicePromotion(user: User, restaurant: Restaurant, stage: 1 | 2 | 3,
  benefit: string, schedule: PromotionSchedule, pointsCost: CouponCost): Promise<DevicePromotion> {
  return serial(async () => {
    const ownerKey = assertRole(user, 'OWNER');
    if (!Number.isSafeInteger(restaurant.id) || restaurant.id < 1 || restaurant.ownerId !== user.id) throw new Error('내 식당에만 프로모션을 게시할 수 있어요.');
    if (![1, 2, 3].includes(stage)) throw new Error('프로모션 단계를 확인해 주세요.');
    const error = validatePromotionBenefit(benefit) || validateCouponCost(pointsCost) || validatePromotionSchedule(schedule, { today: koreaScheduleDate() });
    if (error) throw new Error(error);
    const state = await read();
    const now = Date.now();
    const existing = state.promotions.find(p => p.ownerKey === ownerKey && p.restaurantId === restaurant.id && p.stage === stage && isPromotionDownloadable(p, now));
    const savedSchedule = snapshotSchedule(schedule);
    if (existing) {
      if (existing.benefit === benefit.trim() && existing.pointsCost === pointsCost && JSON.stringify(existing.schedule) === JSON.stringify(savedSchedule)) return existing;
      throw new Error('이 단계는 이미 진행 중이에요. 기존 프로모션을 중지한 뒤 새 조건으로 진행해 주세요.');
    }
    const promotion: DevicePromotion = { id: `promotion-${state.nextPromotionId++}`, ownerKey, restaurantId: restaurant.id,
      restaurantName: restaurant.name, stage, benefit: benefit.trim(), schedule: savedSchedule, pointsCost,
      publishedAt: new Date(now).toISOString(), cancelledAt: null };
    state.promotions.push(promotion);
    await persist(state);
    return promotion;
  });
}

export function cancelDevicePromotion(user: User, promotionId: string): Promise<void> {
  return serial(async () => {
    const ownerKey = assertRole(user, 'OWNER');
    const state = await read();
    const promotion = state.promotions.find(p => p.id === promotionId);
    if (!promotion || promotion.ownerKey !== ownerKey) throw new Error('내 프로모션만 중지할 수 있어요.');
    if (promotion.cancelledAt !== null) return;
    promotion.cancelledAt = new Date(Date.now()).toISOString();
    await persist(state);
  });
}

export function downloadDeviceCoupon(user: User, promotionId: string): Promise<DeviceCoupon> {
  return serial(async () => {
    const key = assertRole(user, 'CUSTOMER');
    const state = await read();
    const now = Date.now();
    const promotion = state.promotions.find(p => p.id === promotionId);
    if (!promotion || !isPromotionDownloadable(promotion, now)) throw new Error('지금은 다운로드할 수 없는 프로모션이에요.');
    const wallet = walletFor(state, key, now);
    const previous = wallet.coupons.filter(coupon => coupon.promotionId === promotionId);
    const held = previous.find(coupon => coupon.usedAt === null && now < Date.parse(coupon.expiresAt));
    if (held) return held;
    if (!ALLOW_REDOWNLOAD_AFTER_USE_OR_EXPIRY && previous.length) throw new Error('이미 다운로드한 프로모션이에요.');
    if (wallet.balance < promotion.pointsCost) throw new Error('포인트가 부족해요.');
    const downloadedAt = new Date(now).toISOString();
    const coupon: DeviceCoupon = { id: `coupon-${state.nextCouponId++}`, promotionId,
      restaurantId: promotion.restaurantId, restaurantName: promotion.restaurantName, stage: promotion.stage,
      benefit: promotion.benefit, schedule: snapshotSchedule(promotion.schedule), pointsCost: promotion.pointsCost,
      downloadedAt, expiresAt: new Date(now + COUPON_LIFETIME_MS).toISOString(), usedAt: null };
    wallet.balance -= coupon.pointsCost;
    wallet.coupons.push(coupon);
    wallet.ledger.push({ key: coupon.id, kind: 'COUPON', amount: -coupon.pointsCost, createdAt: downloadedAt });
    await persist(state);
    return coupon;
  });
}

export function useDeviceCoupon(user: User, couponId: string): Promise<DeviceCoupon> {
  return serial(async () => {
    const key = assertRole(user, 'CUSTOMER');
    const state = await read();
    const coupon = state.wallets[key]?.coupons.find(value => value.id === couponId);
    if (!coupon) throw new Error('내 쿠폰함에서 쿠폰을 확인해 주세요.');
    const now = Date.now();
    const status = couponStatus(coupon, now);
    if (status === 'used') throw new Error('이미 사용한 쿠폰이에요.');
    if (status === 'expired') throw new Error('사용 기한이 지난 쿠폰이에요.');
    if (status === 'outside-hours') throw new Error('이 쿠폰의 사용 요일·시간을 확인해 주세요.');
    coupon.usedAt = new Date(now).toISOString();
    await persist(state);
    return coupon;
  });
}

export function awardDeviceReportPoints(user: User, report: CrowdReportResponse): Promise<{ awarded: number; balance: number }> {
  return serial(async () => {
    const key = assertRole(user, 'CUSTOMER');
    if (!Number.isSafeInteger(report.id) || report.id < 1 || !Number.isSafeInteger(report.restaurantId) || report.restaurantId < 1 ||
        report.reporterId !== user.id || !['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'].includes(report.level) ||
        typeof report.reportedAt !== 'string' || !Number.isFinite(koreaObservationTime(report.reportedAt))) throw new Error('서버에 저장된 내 제보 정보를 확인해 주세요.');
    const state = await read();
    const now = Date.now();
    const wallet = walletFor(state, key, now);
    // Server CrowdSnapshot IDs are globally unique within this API server.
    const rewardKey = String(report.id);
    if (wallet.rewardedReportKeys.includes(rewardKey)) return { awarded: 0, balance: wallet.balance };
    if (!Number.isSafeInteger(wallet.balance + DEVICE_REPORT_POINTS)) throw new Error('포인트 잔액을 확인해 주세요.');
    wallet.balance += DEVICE_REPORT_POINTS;
    wallet.rewardedReportKeys.push(rewardKey);
    wallet.ledger.push({ key: `report:${rewardKey}`, kind: 'REPORT', amount: DEVICE_REPORT_POINTS, createdAt: new Date(now).toISOString() });
    await persist(state);
    return { awarded: DEVICE_REPORT_POINTS, balance: wallet.balance };
  });
}
