import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

// 아직 서버 계약이 없는 정보만 사용자/식당별로 분리하여 기기에 보관한다.
export type OwnerDraft = { perks: [string, string, string]; closedDays: number[]; notice: string; noticeDate: string };
export const emptyOwnerDraft = (): OwnerDraft => ({ perks: ['', '', ''], closedDays: [], notice: '', noticeDate: '' });
const serverKey = Array.from(API_BASE_URL).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
const key = (userId: number, restaurantId: number) => `bapjul.owner.draft.v1.${serverKey}.${userId}.${restaurantId}`;
export async function readOwnerDraft(userId: number, restaurantId: number): Promise<OwnerDraft> {
  const raw = await SecureStore.getItemAsync(key(userId, restaurantId));
  if (!raw) return emptyOwnerDraft();
  const value = JSON.parse(raw);
  if (!Array.isArray(value.perks) || value.perks.length !== 3 || !value.perks.every((p: unknown) => typeof p === 'string') ||
      !Array.isArray(value.closedDays) || !value.closedDays.every((d: unknown) => Number.isInteger(d) && Number(d) >= 0 && Number(d) <= 6) ||
      typeof value.notice !== 'string' || typeof value.noticeDate !== 'string') throw new Error('Invalid owner draft');
  return value as OwnerDraft;
}
export function writeOwnerDraft(userId: number, restaurantId: number, value: OwnerDraft) {
  return SecureStore.setItemAsync(key(userId, restaurantId), JSON.stringify(value));
}
