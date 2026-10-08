import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body' | 'headers' | 'signal'> {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  token?: string | null;
}

interface ApiErrorOptions {
  status: number;
  statusText?: string;
  data?: unknown;
  method: string;
  path: string;
  timedOut?: boolean;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText?: string;
  readonly data?: unknown;
  readonly method: string;
  readonly path: string;
  readonly timedOut: boolean;
  readonly cause?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.data = options.data;
    this.method = options.method;
    this.path = options.path;
    this.timedOut = options.timedOut ?? false;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function getErrorMessage(
  payload: unknown,
  status: number,
  statusText: string,
): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    for (const key of ['message', 'error', 'detail'] as const) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return statusText || `Request failed with status ${status}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function createRequestUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required in preview and production builds');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Shared JSON client for the Spring API. A status of 0 on ApiError represents
 * a timeout, cancellation, or another network-level failure before a response.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    headers: customHeaders,
    signal: callerSignal,
    timeoutMs = API_TIMEOUT_MS,
    token,
    ...requestInit
  } = options;
  const method = requestInit.method?.toUpperCase() ?? 'GET';
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (body !== undefined && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(createRequestUrl(path), {
      ...requestInit,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      if (response.status === 401 && token && unauthorizedHandler) {
        void unauthorizedHandler();
      }

      throw new ApiError(
        getErrorMessage(responseBody, response.status, response.statusText),
        {
          status: response.status,
          statusText: response.statusText,
          data: responseBody,
          method,
          path,
        },
      );
    }

    return responseBody as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = timedOut
      ? `Request timed out after ${timeoutMs}ms`
      : callerSignal?.aborted
        ? 'Request was cancelled'
        : error instanceof Error
          ? error.message
          : 'Network request failed';

    throw new ApiError(message, {
      status: 0,
      method,
      path,
      timedOut,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
