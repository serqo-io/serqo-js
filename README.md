# Serqo JavaScript SDK

Official JavaScript and TypeScript client for the Serqo Search API. Requires Node.js 18 or later and uses built-in `fetch`; no runtime dependencies.

## Install

```sh
npm install serqo-sdk
```

## Quick start

```ts
import { Serqo } from 'serqo-sdk';

const serqo = new Serqo({ apiKey: process.env.SERQO_API_KEY! });
const response = await serqo.search({
  q: 'espresso machines',
  engine: 'google',
  type: 'web',
  gl: 'us',
  hl: 'en',
});

console.log(response.data.results);
console.log('Request ID:', response.requestId);
```

Keep API keys in server-side environment variables. Do not bundle a secret key into browser JavaScript.

## Methods

- `search(query, { idempotencyKey?, signal? })` sends `POST /v1/search`.
- `engines()` returns supported engines and search types.
- `me()` returns account and API key identifiers.
- `health()` checks the product API process and does not require a key.

`search` returns the API envelope. Read normalized results at `response.data.results`; use `response.data.pagination.nextStart` for pagination. See the [shared API reference](API.md) for all search parameters, response fields, and pagination behavior.

## Errors and retries

API failures throw `SerqoError` with `status`, `code`, `message`, `requestId`, `retryable`, `retryAfterMs`, and `details`. Network and abort errors from `fetch` are surfaced as runtime errors. The SDK does not retry automatically. For an uncertain outcome, retry identical parameters with the same `idempotencyKey` within 24 hours.
