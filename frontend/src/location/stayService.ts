import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { API_BASE_URL } from '../config/api';

export interface StayRestaurant {
  id: string; name: string; address: string; floor: string | null;
  latitude: number; longitude: number; distanceMeters: number;
}
export interface StayStatus {
  running: boolean;
  phase: 'unsupported' | 'stopped' | 'observing' | 'waiting' | 'loading' | 'ready' | 'error';
  message: string;
  recommendation?: { count: number; radiusMeters: number; dwellDurationMillis: number; restaurants: StayRestaurant[] } | null;
}
interface NativeStay {
  getStatus(): string;
  start(baseUrl: string, token: string): Promise<void>;
  stop(): Promise<void>;
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeStay>('BapjulStay') : null;
export const hasNativeStayService = Boolean(native) && Number(Platform.Version) >= 26;
export function getStayStatus(): StayStatus {
  if (native && !hasNativeStayService) return { running: false, phase: 'unsupported', message: 'GPS 체류 확인에는 Android 8 이상이 필요해요.' };
  if (!native) return { running: false, phase: 'unsupported', message: '체류 확인은 밥줄 Android APK에서 사용할 수 있어요. Expo Go에서는 지원하지 않아요.' };
  try { return JSON.parse(native.getStatus()) as StayStatus; }
  catch { return { running: false, phase: 'error', message: '위치 수집 상태를 확인하지 못했어요.' }; }
}
export async function startStayService(token: string) {
  if (!native || !hasNativeStayService) throw new Error('Android 8 이상 기기에 밥줄 APK로 설치한 후 사용해 주세요.');
  await native.start(API_BASE_URL, token);
}
export async function stopStayService() { await native?.stop(); }
