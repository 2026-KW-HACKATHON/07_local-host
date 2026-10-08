import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../api/types';
import { API_BASE_URL } from '../config/api';
import { parseProfilePreference, PROFILE_PHOTO_MAX_BYTES, profileScope, validateProfileNickname } from './profileModel';
import type { CustomerProfilePreference, StoredProfilePreference } from './profileModel';

// Profile update/upload endpoints do not exist yet. Never alter the auth identity
// or represent these device-only preferences as server-saved member information.
const scope = (user: User) => profileScope(API_BASE_URL, user.id, user.email);
const storageKey = (user: User) => `bapjul.customer.profile.v1.${scope(user)}`;
const photoDirectory = (user: User) => new Directory(Paths.document, 'customer-profiles', scope(user));

async function readStored(user: User): Promise<StoredProfilePreference | null> {
  const raw = await SecureStore.getItemAsync(storageKey(user));
  return raw ? parseProfilePreference(raw) : null;
}

function removePhoto(file: File | null) {
  // Only references constructed inside this account's app-owned directory are
  // passed here. Never delete the user's original or the photo picker's source.
  try { if (file?.exists) file.delete(); } catch { /* A cleanup failure must not undo a successful save. */ }
}

export async function readCustomerProfile(user: User): Promise<CustomerProfilePreference> {
  const stored = await readStored(user);
  const photo = stored?.photoFile ? new File(photoDirectory(user), stored.photoFile) : null;
  return { nickname: stored?.nickname ?? user.nickname, photoUri: photo?.exists ? photo.uri : null };
}

export async function saveCustomerProfile(user: User, draft: CustomerProfilePreference): Promise<CustomerProfilePreference> {
  const error = validateProfileNickname(draft.nickname);
  if (error) throw new Error(error);
  const previous = await readStored(user);
  const directory = photoDirectory(user);
  const oldPhoto = previous?.photoFile ? new File(directory, previous.photoFile) : null;
  let newPhoto: File | null = null;
  let photoFile: string | null = null;

  try {
    if (draft.photoUri) {
      if (oldPhoto?.uri === draft.photoUri && oldPhoto.exists) {
        photoFile = oldPhoto.name;
      } else {
        if (!/^(file|content):\/\//.test(draft.photoUri)) throw new Error('휴대폰에서 선택한 사진을 사용해 주세요.');
        const source = new File(draft.photoUri);
        if (!source.exists || source.size <= 0) throw new Error('선택한 사진을 읽지 못했어요. 다시 선택해 주세요.');
        if (source.size > PROFILE_PHOTO_MAX_BYTES) throw new Error('사진은 10MB 이하로 선택해 주세요.');
        const extension = /^\.(jpg|jpeg|png|webp|heic|heif|avif)$/i.test(source.extension) ? source.extension.toLowerCase() : '.jpg';
        photoFile = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
        directory.create({ intermediates: true, idempotent: true });
        newPhoto = new File(directory, photoFile);
        source.copy(newPhoto);
      }
    }
    const saved = { nickname: draft.nickname.trim(), photoFile };
    await SecureStore.setItemAsync(storageKey(user), JSON.stringify(saved));
    if (oldPhoto && oldPhoto.name !== photoFile) removePhoto(oldPhoto);
    return { nickname: saved.nickname, photoUri: photoFile ? new File(directory, photoFile).uri : null };
  } catch (error) {
    removePhoto(newPhoto);
    throw error;
  }
}
