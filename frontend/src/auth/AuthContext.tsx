import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  getCurrentUser,
  login as loginRequest,
  signup as signupRequest,
} from '../api/auth';
import type { SignupRequest, User } from '../api/types';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { getApiErrorMessage } from '../api/errorMessage';

const ACCESS_TOKEN_KEY = 'bapjul.accessToken.v1';

type AuthContextValue = {
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  signup: (request: SignupRequest) => Promise<User>;
  token: string | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveSession(accessToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

async function clearSession() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearSession();
      setToken(null);
      setUser(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      let storedToken: string | null = null;

      try {
        storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!storedToken || !active) return;

        const currentUser = await getCurrentUser(storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(currentUser);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await clearSession();
        } else if (active) {
          // 네트워크 장애에서는 유효할 수 있는 토큰을 지우지 않습니다.
          setToken(storedToken);
        }
      } finally {
        if (active) setBootstrapping(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginRequest({ email, password });

      if (!response?.accessToken) {
        throw new Error('로그인 응답에 accessToken이 없습니다. 백엔드 응답 DTO를 확인해 주세요.');
      }

      const currentUser = response.user;
      await saveSession(response.accessToken);
      setToken(response.accessToken);
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'login'));
    }
  };

  const signup = async (request: SignupRequest) => {
    try {
      return await signupRequest(request);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'signup'));
    }
  };

  const logout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ bootstrapping, login, logout, signup, token, user }),
    [bootstrapping, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
