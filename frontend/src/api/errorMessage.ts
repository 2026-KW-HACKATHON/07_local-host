import { API_BASE_URL } from '../config/api';
import { ApiError } from './client';

export function getApiErrorMessage(error: unknown, action: 'login' | 'signup' | 'request') {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.';
  }

  if (error.status === 0) {
    if (!API_BASE_URL) {
      return '배포용 API 주소가 설정되지 않았어요. EXPO_PUBLIC_API_BASE_URL을 확인해 주세요.';
    }

    return `서버에 연결할 수 없어요. 백엔드 실행 여부와 API 주소(${API_BASE_URL})를 확인해 주세요.`;
  }

  if (error.status === 401 && action === 'login') {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }

  if (error.status === 409 && action === 'signup') {
    return '이미 사용 중인 이메일 또는 닉네임이에요.';
  }

  if (error.status === 400) {
    return error.message || '입력한 내용을 다시 확인해 주세요.';
  }

  if (error.status === 403) {
    return '이 작업을 수행할 권한이 없어요.';
  }

  if (error.status >= 500) {
    return '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }

  return error.message || '요청을 처리하지 못했어요.';
}
