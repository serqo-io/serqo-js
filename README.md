# Serqo JavaScript & TypeScript SDK

Official JavaScript and TypeScript client for the [Serqo Search API](https://serqo.io). Access real-time Google and Bing SERP data in clean, structured JSON with zero proxy management.

Get **500 free requests** on [serqo.io](https://serqo.io).

[![npm](https://img.shields.io/npm/v/serqo-sdk.svg)](https://www.npmjs.com/package/serqo-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Universal & Lightweight**: Works in Node.js 18+, Bun, Deno, Cloudflare Workers, and modern browser runtimes using native `fetch`.
- **Full TypeScript Definitions**: Strongly-typed request parameters, response envelopes, pagination metadata, and error codes.
- **Drop-in SerpApi Alternative**: Sub-second latency, transparent pay-as-you-go pricing from $0.001/query, and no mandatory monthly subscriptions.
- **AI Agent Ready**: Easily wrapped as tools in LangChain.js, LlamaIndex, or the Vercel AI SDK.
- **Multi-Round Autocomplete**: Real-time search suggestions with A-Z alphabet soup and question keyword expansion.

---

## Installation

```sh
npm install serqo-sdk
```

---

## Quick Start

```typescript
import { Serqo } from 'serqo-sdk';

// 1. Initialize client with your API key from https://serqo.io/console/keys
const client = new Serqo({
  apiKey: process.env.SERP_API_KEY!,
});

// 2. Fetch Google search results
const response = await client.search({
  q: 'open source vector databases',
  engine: 'google',
  type: 'web',
  gl: 'us',
  hl: 'en',
});

// 3. Print organic results
for (const item of response.data.results.slice(0, 5)) {
  console.log(`- ${item.title}: ${item.link}`);
}
```

---

## Real-Time Search Suggestions (Autocomplete)

```typescript
// Instant suggestions
const direct = await client.autocomplete({
  q: 'typescript',
  strategy: 'normal',
});
console.log(direct.data.suggestions);

// 26-Letter A-Z Alphabet Soup Expansion
const alphabet = await client.autocomplete({
  q: 'nextjs',
  strategy: 'alphabet',
  gl: 'us',
  hl: 'en',
});
console.log(`Discovered ${alphabet.meta?.totalKeywords} keywords across 26 letters:`);
for (const item of alphabet.data.suggestions.slice(0, 10)) {
  console.log(`[${item.group}] ${item.keyword}`);
}
```

---

## Using with Vercel AI SDK & Tool Calling

Serqo's lightweight payloads fit directly into LLM function-calling workflows:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Serqo } from 'serqo-sdk';

const serqo = new Serqo({ apiKey: process.env.SERP_API_KEY! });

export const googleSearchTool = tool({
  description: 'Search Google for real-time information, recent news, or documentation.',
  parameters: z.object({
    query: z.string().describe('The search query string'),
  }),
  execute: async ({ query }) => {
    const res = await serqo.search({ q: query, engine: 'google', type: 'web' });
    return res.data.results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  },
});
```

---

## Pagination & Advanced Parameters

```typescript
// First page
const page1 = await client.search({ q: 'coffee roasters', engine: 'google', type: 'web' });

// Next page using nextStart token
if (page1.data.pagination.hasNext && page1.data.pagination.nextStart !== null) {
  const page2 = await client.search({
    q: 'coffee roasters',
    engine: 'google',
    type: 'web',
    start: page1.data.pagination.nextStart,
  });
}
```

---

## Error Handling & Retries

API errors throw `SerqoError` with HTTP status and machine-readable error codes:

```typescript
import { Serqo, SerqoError } from 'serqo-sdk';

try {
  const res = await client.search({ q: 'test', engine: 'google', type: 'web' });
} catch (error) {
  if (error instanceof SerqoError) {
    console.error(`Status: ${error.status}, Code: ${error.code}, RequestId: ${error.requestId}`);
    if (error.retryable) {
      console.log(`Retry allowed after ${error.retryAfterMs}ms`);
    }
  }
}
```

---

## Documentation & Support

- **Web Documentation**: [https://serqo.io/docs](https://serqo.io/docs)
- **Interactive Playground**: [https://serqo.io/console/playground](https://serqo.io/console/playground)
- **Get API Key (500 Free Credits)**: [https://serqo.io](https://serqo.io)
- **License**: MIT
