import type { User } from '../api/types';
import { clonePromotionSchedule, isWithinPromotionSchedule, validatePromotionSchedule, type PromotionSchedule } from './schedule';

export type CouponCost = number;
export const INITIAL_DEVICE_POINTS = 1000;
export const DEVICE_REPORT_POINTS = 1000;
export const COUPON_LIFETIME_MS = 72 * 60 * 60 * 1000;
export const ALLOW_REDOWNLOAD_AFTER_USE_OR_EXPIRY = true;

export interface DevicePromotion {
  id: string; ownerKey: string; restaurantId: number; restaurantName: string;
  stage: 1 | 2 | 3; benefit: string; schedule: PromotionSchedule; pointsCost: CouponCost;
  publishedAt: string; cancelledAt: string | null;
}
export interface DeviceCoupon {
  id: string; promotionId: string; restaurantId: number; restaurantName: string;
  stage: 1 | 2 | 3; benefit: string; schedule: PromotionSchedule; pointsCost: CouponCost;
  downloadedAt: string; expiresAt: string; usedAt: string | null;
}
export interface DevicePointTransaction { key: string; kind: 'WELCOME' | 'REPORT' | 'COUPON'; amount: number; createdAt: string }
export interface DeviceWallet {
  balance: number; coupons: DeviceCoupon[]; rewardedReportKeys: string[]; ledger: DevicePointTransaction[];
}
export interface DeviceCouponState {
  version: 1; serverUrl: string; nextPromotionId: number; nextCouponId: number;
  promotions: DevicePromotion[]; wallets: Record<string, DeviceWallet>;
}

const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const stageValid = (value: unknown): value is 1 | 2 | 3 => value === 1 || value === 2 || value === 3;
const boundedText = (value: unknown, maximum: number): value is string => typeof value === 'string' && Boolean(value.trim()) && value.length <= maximum && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const isoTime = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const accountKeyValid = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d*\|[^|]{1,800}$/.test(value);
const corruption = () => new Error('이 기기에 저장된 쿠폰·포인트 정보를 읽지 못했어요. 기존 정보는 변경하지 않았어요.');

export function deviceUserKey(user: User): string {
  if (!positiveId(user.id) || !boundedText(user.email, 254) || !['OWNER', 'CUSTOMER'].includes(user.role)) throw new Error('로그인 정보를 확인해 주세요.');
  // Keep the complete normalized email in the private state key: distinct identities
  // cannot collide merely because a short numeric hash matched.
  return `${user.id}|${encodeURIComponent(user.email.trim().toLowerCase())}`;
}
export function validateCouponCost(value: unknown): string | null {
  return positiveId(value) && value % 500 === 0 ? null : '쿠폰 포인트는 500P 이상, 500P 단위로 입력해 주세요.';
}
export function validatePromotionBenefit(value: unknown): string | null {
  return boundedText(value, 500) ? null : '프로모션 혜택을 1~500자로 입력해 주세요.';
}
export function isPromotionDownloadable(promotion: DevicePromotion, now = Date.now()): boolean {
  return promotion.cancelledAt === null && Date.parse(promotion.publishedAt) <= now &&
    isWithinPromotionSchedule(promotion.schedule, now, { ignoreWeeklyRestrictions: true });
}
export function couponStatus(coupon: DeviceCoupon, now = Date.now()): 'available' | 'outside-hours' | 'expired' | 'used' {
  if (coupon.usedAt !== null) return 'used';
  if (!Number.isFinite(now) || !Number.isFinite(Date.parse(coupon.expiresAt)) || now >= Date.parse(coupon.expiresAt)) return 'expired';
  if (now < Date.parse(coupon.downloadedAt) || !isWithinPromotionSchedule(coupon.schedule, now, { ignoreEndDate: true })) return 'outside-hours';
  return 'available';
}
export function emptyDeviceCouponState(serverUrl: string): DeviceCouponState {
  return { version: 1, serverUrl, nextPromotionId: 1, nextCouponId: 1, promotions: [], wallets: {} };
}
export function newDeviceWallet(now: number): DeviceWallet {
  return { balance: INITIAL_DEVICE_POINTS, coupons: [], rewardedReportKeys: [],
    ledger: [{ key: 'welcome', kind: 'WELCOME', amount: INITIAL_DEVICE_POINTS, createdAt: new Date(now).toISOString() }] };
}

function validatePromotion(value: unknown): asserts value is DevicePromotion {
  if (!value || typeof value !== 'object') throw corruption();
  const p = value as DevicePromotion;
  if (!/^promotion-[1-9]\d*$/.test(p.id) || !accountKeyValid(p.ownerKey) || !positiveId(p.restaurantId) ||
      !boundedText(p.restaurantName, 250) || !stageValid(p.stage) || validatePromotionBenefit(p.benefit) || validateCouponCost(p.pointsCost) ||
      validatePromotionSchedule(p.schedule) || !isoTime(p.publishedAt) ||
      !(p.cancelledAt === null || (isoTime(p.cancelledAt) && Date.parse(p.cancelledAt) >= Date.parse(p.publishedAt)))) throw corruption();
}
function validateCoupon(value: unknown): asserts value is DeviceCoupon {
  if (!value || typeof value !== 'object') throw corruption();
  const coupon = value as DeviceCoupon;
  if (!/^coupon-[1-9]\d*$/.test(coupon.id) || !/^promotion-[1-9]\d*$/.test(coupon.promotionId) ||
      !positiveId(coupon.restaurantId) || !boundedText(coupon.restaurantName, 250) || !stageValid(coupon.stage) ||
      validatePromotionBenefit(coupon.benefit) || validateCouponCost(coupon.pointsCost) || validatePromotionSchedule(coupon.schedule) ||
      !isoTime(coupon.downloadedAt) || !isoTime(coupon.expiresAt) || Date.parse(coupon.expiresAt) - Date.parse(coupon.downloadedAt) !== COUPON_LIFETIME_MS ||
      !(coupon.usedAt === null || (isoTime(coupon.usedAt) && Date.parse(coupon.usedAt) >= Date.parse(coupon.downloadedAt) && Date.parse(coupon.usedAt) < Date.parse(coupon.expiresAt)))) throw corruption();
}

/** Full structural + balance validation. Corrupt storage is never silently reset. */
export function parseDeviceCouponState(raw: string, serverUrl: string): DeviceCouponState {
  let state: DeviceCouponState;
  try { state = JSON.parse(raw); } catch { throw corruption(); }
  if (!state || state.version !== 1 || state.serverUrl !== serverUrl || !positiveId(state.nextPromotionId) || !positiveId(state.nextCouponId) ||
      !Array.isArray(state.promotions) || !state.wallets || typeof state.wallets !== 'object' || Array.isArray(state.wallets)) throw corruption();
  const promotionIds = new Set<string>();
  const couponIds = new Set<string>();
  for (const promotion of state.promotions) {
    validatePromotion(promotion);
    const serial = Number(promotion.id.slice('promotion-'.length));
    if (!positiveId(serial) || serial >= state.nextPromotionId || promotionIds.has(promotion.id)) throw corruption();
    promotionIds.add(promotion.id);
  }
  for (const [accountKey, wallet] of Object.entries(state.wallets)) {
    if (!accountKeyValid(accountKey) || !wallet || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0 ||
        !Array.isArray(wallet.coupons) || !Array.isArray(wallet.rewardedReportKeys) || !Array.isArray(wallet.ledger)) throw corruption();
    const reportKeys = new Set<string>();
    for (const key of wallet.rewardedReportKeys) {
      if (typeof key !== 'string' || !/^[1-9]\d*$/.test(key) || reportKeys.has(key)) throw corruption();
      reportKeys.add(key);
    }
    for (const coupon of wallet.coupons) {
      validateCoupon(coupon);
      const serial = Number(coupon.id.slice('coupon-'.length));
      if (!positiveId(serial) || serial >= state.nextCouponId || couponIds.has(coupon.id) || !promotionIds.has(coupon.promotionId)) throw corruption();
      couponIds.add(coupon.id);
    }
    const keys = new Set<string>();
    let balance = 0;
    let welcomeCount = 0;
    for (const entry of wallet.ledger) {
      if (!entry || typeof entry.key !== 'string' || keys.has(entry.key) || !Number.isSafeInteger(entry.amount) || !isoTime(entry.createdAt)) throw corruption();
      keys.add(entry.key);
      if (entry.kind === 'WELCOME') {
        if (entry.key !== 'welcome' || entry.amount !== INITIAL_DEVICE_POINTS) throw corruption();
        welcomeCount++;
      } else if (entry.kind === 'REPORT') {
        if (!entry.key.startsWith('report:') || !reportKeys.has(entry.key.slice(7)) || entry.amount !== DEVICE_REPORT_POINTS) throw corruption();
      } else if (entry.kind === 'COUPON') {
        const coupon = wallet.coupons.find(value => value.id === entry.key);
        if (!coupon || entry.amount !== -coupon.pointsCost || entry.createdAt !== coupon.downloadedAt) throw corruption();
      } else throw corruption();
      balance += entry.amount;
      if (!Number.isSafeInteger(balance) || balance < 0) throw corruption();
    }
    if (welcomeCount !== 1 || balance !== wallet.balance || [...reportKeys].some(key => !keys.has(`report:${key}`)) ||
        wallet.coupons.some(coupon => !keys.has(coupon.id))) throw corruption();
  }
  return state;
}

export function snapshotSchedule(schedule: PromotionSchedule): PromotionSchedule {
  const error = validatePromotionSchedule(schedule);
  if (error) throw new Error(error);
  return clonePromotionSchedule(schedule);
}
