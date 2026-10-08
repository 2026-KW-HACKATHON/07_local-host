import { File } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo';
import { Image } from 'react-native';
import { PROFILE_PHOTO_MAX_BYTES } from './profileModel';

/**
 * Ask Android/iOS for one image document, with a cache copy retaining read access.
 * Do not eagerly load the new native module: an older APK must still open My.
 */
export async function pickProfilePhotoFile(): Promise<string | null> {
  let picker: typeof import('expo-document-picker');
  // Check without evaluating expo-document-picker's eager requireNativeModule.
  if (!requireOptionalNativeModule('ExpoDocumentPicker')) {
    throw new Error('파일 선택을 사용하려면 새 버전의 밥줄 앱을 설치해 주세요. 앨범에서 사진 선택은 계속 사용할 수 있어요.');
  }
  try {
    // Evaluate only on button press, but keep the module in Metro's main bundle.
    // import() can require an unreachable split-bundle URL on a debug APK.
    picker = require('expo-document-picker') as typeof import('expo-document-picker');
  } catch { throw new Error('사진 파일 선택 기능을 불러오지 못했어요. 앱을 다시 열고 시도해 주세요.'); }

  let result: Awaited<ReturnType<typeof picker.getDocumentAsync>>;
  try {
    result = await picker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true, base64: false });
  } catch { throw new Error('사진 파일을 열지 못했어요. 파일 접근 상태를 확인하고 다시 선택해 주세요.'); }
  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri || !/^file:\/\//.test(asset.uri)) throw new Error('사진 파일을 기기로 불러오지 못했어요. 다시 선택해 주세요.');
  if (typeof asset.mimeType !== 'string' || !/^image\/[a-z0-9.+-]+$/i.test(asset.mimeType)) {
    throw new Error('사진 파일만 선택할 수 있어요. JPG 또는 PNG 사진을 선택해 주세요.');
  }
  if (typeof asset.size === 'number' && asset.size > PROFILE_PHOTO_MAX_BYTES) throw new Error('사진은 10MB 이하로 선택해 주세요.');
  let fileSize: number;
  try {
    const source = new File(asset.uri);
    if (!source.exists) throw new Error('Missing cache copy');
    fileSize = source.size;
  } catch { throw new Error('선택한 사진 파일을 읽지 못했어요. 다시 선택해 주세요.'); }
  if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error('선택한 사진 파일을 읽지 못했어요. 다시 선택해 주세요.');
  // Provider metadata can omit or understate the size. Check the actual cache file.
  if (fileSize > PROFILE_PHOTO_MAX_BYTES) throw new Error('사진은 10MB 이하로 선택해 주세요.');
  try {
    const size = await Image.getSize(asset.uri);
    if (!(size.width > 0 && size.height > 0)) throw new Error('Invalid image dimensions');
  } catch { throw new Error('이 사진 파일을 표시할 수 없어요. JPG 또는 PNG 사진으로 다시 선택해 주세요.'); }
  // saveCustomerProfile copies this cache file into account-scoped durable storage.
  // Neither selection nor cancellation removes the user's original document.
  return asset.uri;
}
