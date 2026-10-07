import { Platform } from 'react-native';

const LOCAL_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080',
  ios: 'http://localhost:8080',
  default: 'http://localhost:8080',
});

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const developmentFallback = __DEV__ ? LOCAL_API_BASE_URL : undefined;

/**
 * Set EXPO_PUBLIC_API_BASE_URL when running on a physical device or against a
 * deployed server. Android emulators reach the host machine through 10.0.2.2.
 */
export const API_BASE_URL = (configuredBaseUrl || developmentFallback || '').replace(/\/+$/, '');

export const API_TIMEOUT_MS = 15_000;
