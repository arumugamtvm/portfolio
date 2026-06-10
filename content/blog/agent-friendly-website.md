---
title: How to Build an Agent-Friendly Website — The Complete Guide
date: 2026-06-09
readtime: 12 min
description: Most websites are built for humans. AI agents interact with the web completely differently. 7 concrete patterns, copy-paste code, and an MCP server setup so your website works first-class with every AI agent that visits it.
---

> **TL;DR** — Most websites are built for humans. Browsers render pixels; humans read text. But AI agents — Claude, GPT, Gemini, and the next generation of autonomous tools — interact with the web completely differently. This guide covers 7 concrete patterns, copy-paste code, and an MCP server setup so your website works first-class with every AI agent that visits it.

## Why Build an Agent-Friendly Website?

In 2025, users started asking AI assistants to *do things on their behalf* — book appointments, fill forms, look up pricing, summarize docs. By 2026, agents routinely browse, interact, and take action across the web without any human in the loop.

If your website isn't agent-friendly, you're invisible to this wave:

- Agents fail to scrape your content because it's JavaScript-rendered with no SSR
- Agents can't find your actions because buttons have no semantic labels
- Agents hallucinate your API because there's no machine-readable spec
- Claude and other MCP-aware agents skip your site entirely because there's no `/mcp` endpoint

The good news: fixing all of this is straightforward. You don't need to rewrite anything. You add layers.

## The 7 Patterns

### Pattern 1 — llms.txt (Agent Discovery File)

Just like `robots.txt` tells crawlers what to index, `llms.txt` tells AI agents what your site does, where the key pages are, and how to interact with it. Place it at the root of your domain.

```
# llms.txt — place at https://yourdomain.com/llms.txt
name: YourApp
description: One-sentence description of what your site does
base_url: https://yourdomain.com

pages:
  /           → homepage
  /docs       → documentation
  /api        → API reference

api:
  GET  /api/context?page={slug}  → page content as JSON
  GET  /api/search?q={query}     → full-text search
  GET  /api/actions              → available agent actions
  GET  /mcp                      → MCP SSE endpoint

hints:
  - All interactive elements have data-action attributes
  - Site is fully server-side rendered — no JS execution needed
  - Rate limit: 100 req/min authenticated, 20 req/min public
```

**Why it works:** Agents fetch `llms.txt` before touching any page. It gives them the full map in one request instead of crawling 50 pages to build a mental model.

### Pattern 2 — Semantic HTML + ARIA Landmarks

Agents navigate pages by landmark role, not by CSS class. Use HTML5 semantic elements and add `aria-label` to every major region.

```html
<body>
  <header role="banner">
    <nav aria-label="Main navigation">
      <!-- links here -->
    </nav>
  </header>

  <main role="main" id="main-content">
    <section aria-labelledby="features-heading">
      <h2 id="features-heading">Features</h2>
      <article aria-label="Feature: Search">…</article>
    </section>
  </main>

  <aside role="complementary" aria-label="Sidebar">
    <!-- secondary content -->
  </aside>

  <footer role="contentinfo">…</footer>
</body>
```

**Why it works:** Agents use the accessibility tree (same as screen readers) to navigate. If `<main>` is present, an agent jumps straight to content without parsing headers and footers. If sections have `aria-labelledby`, the agent knows what each section is about without reading the body text.

**Common mistakes to avoid:**

- Using `<div class="header">` instead of `<header>`
- Forgetting `aria-label` on `<nav>` when you have multiple nav elements
- Omitting heading hierarchy (`h1` → `h2` → `h3`, never skip levels)

### Pattern 3 — JSON-LD Structured Data

Embed machine-readable metadata in `<head>` using Schema.org vocabulary. Agents parse this instantly without reading visible content.

```html
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "YourApp",
    "description": "What your app does in one sentence",
    "url": "https://yourdomain.com",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://yourdomain.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
  </script>
</head>
```

**Other useful Schema.org types:**

- `WebSite` — for general sites
- `Product` — for e-commerce
- `Organization` — for company pages
- `FAQPage` — for FAQ sections (agents extract Q&A pairs directly)
- `HowTo` — for step-by-step guides

**Why it works:** Google has trained agents on Schema.org for years. When an agent sees `"@type": "SoftwareApplication"` with a `potentialAction`, it immediately knows how to search your site — no HTML parsing needed.

### Pattern 4 — Agent Data Attributes

Add `data-action`, `data-entity`, and `data-agent-readable` attributes to interactive elements. Agents target these instead of fragile CSS selectors or text matching.

```html
<!-- Forms and buttons -->
<button
  data-action="create-task"
  data-entity="task"
  aria-label="Create a new task"
>
  New Task
</button>

<form data-action="signup" data-entity="user">
  <input
    name="email"
    type="email"
    data-field="email"
    aria-label="Email address"
  />
  <button type="submit" data-action="submit-signup">Sign Up</button>
</form>

<!-- Readable content blocks -->
<section
  data-agent-readable="true"
  data-content-type="task-list"
  data-entity="tasks"
>
  <!-- task items -->
</section>

<!-- Navigation items -->
<a href="/pricing" data-nav-item="pricing" aria-label="View pricing plans">
  Pricing
</a>
```

**Naming convention:**

- `data-action` — what the element *does* (verb)
- `data-entity` — what it operates on (noun)
- `data-field` — field name for form inputs
- `data-agent-readable` — marks blocks safe to read/extract
- `data-content-type` — describes what kind of data is inside

**Why it works:** CSS classes change with design refactors. Text labels change with copy updates. Data attributes are stable contracts between your HTML and any agent that interacts with it.

### Pattern 5 — Agent-Ready API Endpoints

Expose dedicated API endpoints that return page content, available actions, and search results as clean JSON. Agents call these instead of parsing HTML.

**GET /api/context?page={slug}** — page as JSON:

```json
{
  "page": "home",
  "title": "YourApp — The best way to...",
  "summary": "YourApp helps teams...",
  "headings": [
    { "level": 1, "text": "The best way to manage tasks" },
    { "level": 2, "text": "Features" }
  ],
  "nav": [
    { "label": "Home",    "url": "/" },
    { "label": "Pricing", "url": "/pricing" }
  ],
  "actions": [
    { "id": "signup", "label": "Get Started", "method": "POST", "url": "/signup" },
    { "id": "search", "label": "Search",      "method": "GET",  "url": "/api/search" }
  ]
}
```

**GET /api/actions** — all available agent actions:

```json
{
  "actions": [
    {
      "id": "create_task",
      "description": "Create a new task",
      "method": "POST",
      "url": "/api/task",
      "auth": true,
      "params": {
        "title":    { "type": "string",  "required": true },
        "priority": { "type": "string",  "enum": ["high", "medium", "low"] },
        "due":      { "type": "string",  "format": "ISO8601" }
      }
    }
  ]
}
```

**Why it works:** Instead of the agent spending 3 round-trips parsing HTML, one call to `/api/context` gives everything. Agents are dramatically faster and more reliable when they can query structured data.

### Pattern 6 — Embedded Chat Widget (Anthropic API)

Add a chat widget that lets users (and agents) interact with your site in natural language. Connect it to the Anthropic API so it's powered by Claude.

> ⚠️ **Security note:** Never expose your Anthropic API key in client-side code for production. Instead, proxy the request through your backend — your server holds the key, the browser calls your server.

**Production pattern (backend proxy):**

```javascript
// Express.js backend proxy
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     process.env.ANTHROPIC_API_KEY, // server-side only
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'You are a site assistant.',
      messages: [{ role: 'user', content: message }]
    })
  });

  const data = await response.json();
  res.json({ reply: data.content[0].text });
});
```

This very site does exactly that — the chat copilot in the corner talks to a Cloudflare Worker that holds the API keys server-side.

### Pattern 7 — MCP Server (Model Context Protocol)

This is the most powerful pattern. MCP lets Claude and other MCP-compatible agents connect directly to your site's functions and call them as tools — no HTML, no scraping, no guessing. Pure, structured, two-way communication.

**What is MCP?**

MCP (Model Context Protocol) is an open standard by Anthropic. Think of it as a USB-C port for AI agents — a universal way for agents to connect to tools, APIs, and data sources. Your website exposes an MCP server; Claude connects to it and can call your tools directly.

**Minimal MCP Server in Node.js:**

```javascript
// mcp-server.mjs
// Install: npm install @modelcontextprotocol/sdk express

import { McpServer }          from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z }                  from 'zod';
import express                from 'express';

const app    = express();
const server = new McpServer({ name: 'my-site', version: '1.0.0' });

server.tool(
  'search_content',
  'Search the site for pages and articles',
  { query: z.string().describe('Search query') },
  async ({ query }) => {
    const results = await db.search(query); // your search logic
    return {
      content: [{ type: 'text', text: JSON.stringify(results) }]
    };
  }
);

server.tool(
  'get_page',
  'Get the content of a specific page as JSON',
  { slug: z.string().describe('Page slug, e.g. "home" or "pricing"') },
  async ({ slug }) => {
    const page = await db.pages.findBySlug(slug);
    return {
      content: [{ type: 'text', text: JSON.stringify(page) }]
    };
  }
);

// ---- SSE transport (agents connect via GET /mcp) ----

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res);
  await server.connect(transport);
});

app.listen(3000, () => console.log('MCP server running on :3000/mcp'));
```

**Connecting Claude to your MCP Server** — add this to your Claude Code config:

```json
{
  "mcpServers": {
    "my-site": {
      "url": "https://yourdomain.com/mcp",
      "transport": "sse"
    }
  }
}
```

**Why MCP beats all other patterns for agent interaction:**

<table>
<tr><th>Approach</th><th>Reliability</th><th>Speed</th><th>Agent effort</th></tr>
<tr><td>Scrape HTML</td><td>Low</td><td>Slow</td><td>High</td></tr>
<tr><td>REST API (undocumented)</td><td>Medium</td><td>Medium</td><td>High</td></tr>
<tr><td>REST API + llms.txt</td><td>Good</td><td>Fast</td><td>Low</td></tr>
<tr><td>MCP Server</td><td>Excellent</td><td>Fastest</td><td>Zero</td></tr>
</table>

With MCP, the agent doesn't need to figure out your URL structure, parse responses, or handle auth complexity. It just calls a named function with typed parameters.

## Putting It All Together

```
yourdomain.com/
├── /llms.txt              ← Agent discovery (Pattern 1)
├── /robots.txt            ← Crawler rules (traditional)
├── /sitemap.xml           ← Page index (traditional)
│
├── index.html             ← Semantic HTML + JSON-LD + data attrs
│                             (Patterns 2, 3, 4)
│
├── /api/
│   ├── /context           ← Page content as JSON (Pattern 5)
│   ├── /search            ← Full-text search (Pattern 5)
│   ├── /actions           ← Available agent actions (Pattern 5)
│   └── /chat              ← Backend proxy for Anthropic API (Pattern 6)
│
└── /mcp                   ← MCP SSE endpoint (Pattern 7)
```

## Implementation Checklist

- Add `llms.txt` at domain root
- Convert `<div>` layout to semantic HTML5 elements
- Add `aria-label` and `role=` to all landmark regions
- Add JSON-LD `<script>` block to every page `<head>`
- Add `data-action` / `data-entity` to buttons and forms
- Mark readable content blocks with `data-agent-readable="true"`
- Build `/api/context`, `/api/search`, `/api/actions` endpoints
- Wire up chat widget → backend proxy → Anthropic API
- Build and deploy MCP server at `/mcp`
- Test with Claude: connect to `/mcp`, try natural language commands

## Resources

- [Model Context Protocol docs](https://modelcontextprotocol.io) — official MCP specification
- [Anthropic API docs](https://docs.anthropic.com) — Claude API reference
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — Node.js MCP SDK
- [Schema.org](https://schema.org) — JSON-LD vocabulary reference
- [llms.txt standard](https://llmstxt.org) — community standard for the llms.txt format
- [ARIA Landmark Roles](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/) — W3C ARIA guide
