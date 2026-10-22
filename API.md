# Serqo Search API reference for SDKs

This reference covers the public endpoints exposed by the SDKs. Send API keys only in the `x-api-key` header; never put a key in a URL, source repository, or browser-side code.

## Search

`POST https://api.serqo.io/v1/search` consumes a JSON request body and returns the standard response envelope:

```json
{
  "success": true,
  "requestId": "req_...",
  "data": { "engine": "google", "type": "web", "results": [], "pagination": {} },
  "meta": { "cache": "miss" }
}
```

The SDK `search` method returns this full envelope. Results are in `data.results`; cache state is in `meta.cache`; the request ID can be used when contacting support.

| Field | Type | Meaning |
| --- | --- | --- |
| `q` | string, required | Search query. |
| `engine` | `google` or `bing` | Search engine; defaults to `google`. |
| `type` | `web`, `images`, `videos`, `news`, `shopping`, `forums`, `books`, `maps`, or `patents` | Search result type. Availability depends on the engine and can change. |
| `gl` | two-letter lowercase country code | Search market, for example `us`. Omitted markets are selected by the service. |
| `hl` | string | Search interface language code, for example `en`. |
| `device` | `desktop` or `mobile` | Device context where supported. |
| `start` | integer, 0–1,000,000 | Pagination offset. Use the `data.pagination.nextStart` returned by the API. |
| `safe` | `off` or `active` | Safe search setting. |
| `tbs` | string | Google time filter syntax such as `qdr:d`, `qdr:w`, or `qdr:m`. |

Example request body:

```json
{
  "q": "espresso machines",
  "engine": "google",
  "type": "web",
  "gl": "us",
  "hl": "en"
}
```

The normalized `data` object includes `engine`, `type`, `query`, `searchInformation`, `results`, `features`, `pagination`, and `meta`. Result fields vary by search type; use the common fields when available and preserve unknown fields for forward compatibility. `data.pagination.hasNext` indicates another page; pass `data.pagination.nextStart` as the next request's `start` without changing the other query fields.

## Idempotency

Search may consume credits when it succeeds. SDKs never retry automatically. If the connection ends before the response is known, the caller may retry the same parameters with the same `Idempotency-Key` value within 24 hours. The server then replays the first successful response. Reusing that key with different parameters returns `409 IDEMPOTENCY_KEY_REUSED`.

## Other endpoints

| SDK method | Endpoint | Authentication | Response data |
| --- | --- | --- | --- |
| `engines()` | `GET /v1/engines` | `x-api-key` | `data.engines`: engine IDs, display names, supported types, and pagination mode. |
| `me()` | `GET /v1/me` | `x-api-key` | `data.account` and `data.key` identifiers; never includes the secret key. |
| `health()` | `GET /v1/health` | None | Minimal product API process status; does not verify search-engine availability. |

## Errors

Error responses use the same envelope across the SDKs:

```json
{
  "success": false,
  "requestId": "req_...",
  "error": {
    "code": "SEARCH_TYPE_UNAVAILABLE",
    "message": "Search type \"maps\" for bing is temporarily unavailable due to maintenance",
    "retryable": true,
    "details": { "engine": "bing", "type": "maps" }
  }
}
```

Every SDK maps this to a language-specific exception and exposes the HTTP status, `code`, message, `requestId`, `retryable`, optional `retryAfterMs`, and optional `details`. Common status codes include 400/422 for invalid input, 401 for authentication, 402 for insufficient credits, 409 for idempotency conflicts, 429 for limits, 503 for temporarily unavailable search types, and 5xx for service or provider errors. Error text and available search types can change; branch on stable error codes rather than message text.
