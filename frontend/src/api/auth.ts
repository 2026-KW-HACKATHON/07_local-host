import { apiRequest } from './client';
import type {
  AuthResponse,
  LoginRequest,
  SignupRequest,
  User,
} from './types';

export function signup(request: SignupRequest): Promise<User> {
  return apiRequest<User>('/api/auth/signup', {
    method: 'POST',
    body: request,
  });
}

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: request,
  });
}

export function getCurrentUser(token: string): Promise<User> {
  return apiRequest<User>('/api/auth/me', { token });
}

export type { AuthResponse, LoginRequest, SignupRequest, User } from './types';
