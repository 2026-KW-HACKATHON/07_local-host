import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { API_BASE_URL } from '../config/api';
import type { StayStatus } from './stayEligibility';
export { getEligibleStayRestaurants, isStayReportLink } from './stayEligibility';
export type { StayRestaurant, StayStatus } from './stayEligibility';

interface NativeStay {
  getStatus(): string;
  setAppActive?(active: boolean): void;
  start(baseUrl: string, token: string): Promise<void>;
  stop(): Promise<void>;
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeStay>('BapjulStay') : null;
export const hasNativeStayService = Boolean(native) && Number(Platform.Version) >= 26;
export function getStayStatus(): StayStatus {
  if (native && !hasNativeStayService) return { running: false, phase: 'unsupported', message: 'GPS 체류 확인에는 Android 8 이상이 필요해요.' };
  if (!native) return { running: false, phase: 'unsupported', message: '이 환경에서는 체류 확인을 사용할 수 없어요.' };
  try { return JSON.parse(native.getStatus()) as StayStatus; }
  catch { return { running: false, phase: 'error', message: '위치 수집 상태를 확인하지 못했어요.' }; }
}
export async function startStayService(token: string) {
  if (!native || !hasNativeStayService) throw new Error('이 환경에서는 체류 확인을 사용할 수 없어요.');
  await native.start(API_BASE_URL, token);
}
export async function stopStayService() { await native?.stop(); }
export function setStayAppActive(active: boolean) { native?.setAppActive?.(active); }
