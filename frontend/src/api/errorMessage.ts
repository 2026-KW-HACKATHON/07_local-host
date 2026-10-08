import { ApiError } from './client';

export function getApiErrorMessage(error: unknown, action: 'login' | 'signup' | 'request') {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && /[가-힣]/.test(error.message)
      ? error.message
      : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 0) {
    return '서버에 연결할 수 없어요. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 401 && action === 'login') {
    return '가입한 이메일 또는 비밀번호가 올바르지 않아요.';
  }

  if (error.status === 409 && action === 'signup') {
    return '이미 사용 중인 이메일 또는 닉네임이에요.';
  }

  if (error.status === 400) {
    return '입력한 내용을 다시 확인해 주세요.';
  }

  if (error.status === 403) {
    return '이 작업을 수행할 권한이 없어요.';
  }

  if (error.status >= 500) {
    return '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 401) {
    return '로그인이 만료됐어요. 다시 로그인해 주세요.';
  }

  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
