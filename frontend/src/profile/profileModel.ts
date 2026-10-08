export type CustomerProfilePreference = { nickname: string; photoUri: string | null };
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function validateProfileNickname(value: string): string | null {
  const nickname = value.trim();
  if (nickname.length < 2 || nickname.length > 30) return '닉네임은 2자 이상 30자 이하로 입력해 주세요.';
  if (/[\r\n\t\u0000-\u001f\u007f]/.test(nickname)) return '닉네임에는 줄바꿈이나 제어 문자를 사용할 수 없어요.';
  return null;
}

export function profileScope(serverUrl: string, userId: number, email: string): string {
  const identity = `${serverUrl.replace(/\/+$/, '')}|${userId}|${email.trim().toLowerCase()}`;
  const hash = Array.from(identity).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return `${userId}.${hash.toString(16)}`;
}

export type StoredProfilePreference = { nickname: string; photoFile: string | null };
export function parseProfilePreference(raw: string): StoredProfilePreference {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('nickname' in value) || !('photoFile' in value) ||
      typeof value.nickname !== 'string' || validateProfileNickname(value.nickname) ||
      (value.photoFile !== null && (typeof value.photoFile !== 'string' || !/^photo-\d+-[a-z0-9]+\.(?:jpg|jpeg|png|webp|heic|heif|avif)$/i.test(value.photoFile)))) {
    throw new Error('저장된 프로필 정보를 읽지 못했어요.');
  }
  return { nickname: value.nickname.trim(), photoFile: value.photoFile as string | null };
}
