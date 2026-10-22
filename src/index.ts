/** Public client for the Serqo Search API. Uses the runtime's built-in fetch. */

export type SearchType = 'web' | 'images' | 'videos' | 'news' | 'shopping' | 'forums' | 'books' | 'maps' | 'patents';
export type SearchEngine = 'google' | 'bing';

/** Parameters accepted by `POST /v1/search`. */
export interface SearchRequest {
  q: string;
  engine?: SearchEngine;
  type?: SearchType;
  gl?: string;
  hl?: string;
  device?: 'desktop' | 'mobile';
  start?: number;
  safe?: 'off' | 'active';
  tbs?: string;
}

/** API response envelope. `data` follows the selected endpoint's schema. */
export interface ApiResponse<T> {
  success: true;
  requestId: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface SearchData {
  engine: string;
  type: SearchType;
  query: Record<string, unknown>;
  searchInformation: Record<string, unknown>;
  results: Array<Record<string, unknown>>;
  features: Record<string, unknown>;
  pagination: { page: number; start: number; hasNext: boolean; nextStart: number | null; [key: string]: unknown };
  meta: { elapsedMs: number | null; [key: string]: unknown };
  [key: string]: unknown;
}

export interface EngineCapability {
  id: SearchEngine;
  displayName: string;
  verticals: SearchType[];
  pagination: string;
}

export interface AccountData {
  account: { id: string; email: string; role: string };
  key: { id: string; prefix: string };
}

export interface HealthData { status: 'ok' | string }

export interface SerqoClientOptions {
  /** Secret API key. Keep it on the server; do not expose it in browser code. */
  apiKey: string;
  /** API origin, without a trailing slash. Defaults to `https://api.serqo.io`. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 60 seconds. */
  timeoutMs?: number;
  /** Optional fetch implementation for proxies, instrumentation, or runtimes. */
  fetch?: typeof fetch;
}

export interface SearchOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface SerqoErrorBody {
  code?: string;
  message?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  details?: unknown;
}

/** Error returned by the API. `requestId` can be shared with support. */
export class SerqoError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly details?: unknown;

  constructor(status: number, body: SerqoErrorBody, requestId?: string) {
    super(body.message || `Serqo API request failed with HTTP ${status}`);
    this.name = 'SerqoError';
    this.status = status;
    this.code = body.code || 'UNKNOWN_ERROR';
    this.requestId = requestId;
    this.retryable = body.retryable ?? false;
    this.retryAfterMs = body.retryAfterMs;
    this.details = body.details;
  }
}

/**
 * Create a Serqo client. Search calls are not retried automatically because a
 * successful search may consume credits; use an idempotency key for safe retry.
 */
export class Serqo {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SerqoClientOptions) {
    if (!options.apiKey.trim()) throw new Error('apiKey is required');
    this.baseUrl = (options.baseUrl || 'https://api.serqo.io').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Run one search. Pass `idempotencyKey` when retrying the same request. */
  search(query: SearchRequest, options: SearchOptions = {}): Promise<ApiResponse<SearchData>> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    return this.request('/v1/search', { method: 'POST', body: query, headers, signal: options.signal });
  }

  /** Read the current engine and search-type capability list. */
  engines(): Promise<ApiResponse<{ engines: EngineCapability[] }>> {
    return this.request('/v1/engines');
  }

  /** Read the account and key identifiers associated with this API key. */
  me(): Promise<ApiResponse<AccountData>> {
    return this.request('/v1/me');
  }

  /** Check whether the product API responds. This does not test search engines. */
  health(): Promise<ApiResponse<HealthData>> {
    return this.request('/v1/health', { authenticated: false });
  }

  private async request<T>(path: string, options: {
    method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>;
    signal?: AbortSignal; authenticated?: boolean;
  } = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('Serqo request timed out')), this.timeoutMs);
    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const headers = new Headers(options.headers);
    if (options.authenticated !== false) headers.set('x-api-key', this.options.apiKey);
    if (options.body !== undefined) headers.set('content-type', 'application/json');
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET', headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal,
      });
      const requestId = response.headers.get('x-request-id') ?? undefined;
      let payload: any;
      try { payload = await response.json(); } catch { payload = undefined; }
      if (!response.ok) {
        const error = payload?.error ?? {};
        throw new SerqoError(response.status, error, payload?.requestId ?? requestId);
      }
      if (!payload || payload.success !== true) {
        throw new SerqoError(response.status, { code: 'INVALID_RESPONSE', message: 'Serqo API returned an invalid response' }, requestId);
      }
      return payload as ApiResponse<T>;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}
