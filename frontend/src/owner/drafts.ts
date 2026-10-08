import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';
import { assertOwnerIds, emptyOwnerDraft, normalizeOwnerDraft, ownerServerKey, type OwnerDraft } from './draftModel';

export { emptyOwnerDraft } from './draftModel';
export type { BusinessChange, OwnerDraft } from './draftModel';

// 아직 서버 계약이 없는 정보만 사용자/식당별로 분리하여 기기에 보관한다.
const serverKey = ownerServerKey(API_BASE_URL);
const key = (userId: number, restaurantId: number) => `bapjul.owner.draft.v1.${serverKey}.${userId}.${restaurantId}`;
export async function readOwnerDraft(userId: number, restaurantId: number): Promise<OwnerDraft> {
  assertOwnerIds(userId, restaurantId);
  const raw = await SecureStore.getItemAsync(key(userId, restaurantId));
  if (raw === null) return emptyOwnerDraft();
  return normalizeOwnerDraft(JSON.parse(raw));
}
export async function writeOwnerDraft(userId: number, restaurantId: number, value: OwnerDraft): Promise<OwnerDraft> {
  // A failed/corrupt read is not an empty record and must never be overwritten.
  await readOwnerDraft(userId, restaurantId);
  const saved = normalizeOwnerDraft(value);
  await SecureStore.setItemAsync(key(userId, restaurantId), JSON.stringify(saved));
  return saved;
}
