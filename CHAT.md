# Local AI chat (Ollama) — running it

The portfolio has a built-in **site copilot**: an assistant that *controls the page* (navigate,
switch theme, highlight sections, run commands) using a **local Ollama model**. It answers
questions about Arumugam grounded in `profile.json`, and turns instructions like
"show me your projects" into real page actions.

It runs only when the site is opened **from localhost** — the deployed https site can't reach a
localhost model because Ollama's default CORS allows only localhost origins and Chrome's Local
Network Access gates public→localhost requests. (This is **not** a mixed-content rule:
`http://localhost` is a trustworthy loopback origin.) On the deployed site the chat shows a
friendly local-only notice plus a scripted guided tour that still navigates the page.

## Run it

1. Install [Ollama](https://ollama.com), then pull a tool-capable model:
   ```bash
   ollama pull qwen3-coder:30b
   ```
2. Start Ollama (it listens on `http://localhost:11434`).
3. Build and serve the site from localhost:
   ```bash
   npm run build
   (cd dist && python3 -m http.server 8755)
   ```
   Open `http://localhost:8755`.
4. Click the **✦** button (bottom-right) or press **⌘K / Ctrl+K → "Chat with this site"**.
   Try: *"show me your projects"*, *"switch to midnight theme"*, *"what can you build?"*.

## Models

Any tool-capable Ollama model works. Verified: **qwen3-coder:30b** (emits proper tool calls).
Pick a different one from the ⚙ settings inside the chat (the picker reads `/api/tags`; models
without the `tools` capability can chat but can't drive the page).

## CORS

Ollama reflects localhost origins by default (verified on v0.30.7) — no config needed for
localhost. To serve from a non-localhost origin, set `OLLAMA_ORIGINS`, e.g.:
```bash
OLLAMA_ORIGINS="http://192.168.1.10:8755" ollama serve
```

## Privacy

All inference is **local**. Your conversation and the page context never leave the machine —
no cloud, no API keys, no tracking. That's the whole point.
