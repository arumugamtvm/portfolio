# arumugamg.com — site copilot Worker (Gemini + contact email)

A small, hardened Cloudflare Worker that powers two things on the site, while
keeping all secrets server-side:

1. **Chat** — proxies chat turns to Google Gemini (`/api/chat`, streams SSE back).
   The agentic loop and tool execution stay in the browser; this only holds the
   key and enforces limits.
2. **Contact** — `/api/contact` sends the contact form to your inbox via Resend.

The Gemini and Resend API keys are **secrets** — never in this repo.

## Abuse / cost protection (free keys)
- Origin allowlist + strict CORS (no `*`).
- Per-IP burst limits (native rate-limit binding) for chat and contact.
- Global per-minute + per-day caps via a Durable Object (Pacific reset) — the
  real backstop so a free key can't be drained. Tune `DAILY_BUDGET` / `GLOBAL_RPM`
  (chat) and `CONTACT_DAILY` / `CONTACT_RPM` (email) in `wrangler.toml`.
- Input caps (body size, message count/length, tool count), model allowlist,
  forced `maxOutputTokens`. Contact form has a honeypot + validation.

## Local dev
```bash
cd worker
cp .dev.vars.example .dev.vars     # paste real keys (this file is gitignored)
npx wrangler dev                   # http://localhost:8787
```
In the site chat ⚙: assistant = Gemini (online), backend url = `http://localhost:8787`.

## Deploy
```bash
cd worker
npx wrangler secret put GEMINI_API_KEY   # paste a working AI-Studio key (AIza...)
npx wrangler secret put RESEND_API_KEY   # paste your Resend key (re_...)
npx wrangler deploy
```
Secrets set with `wrangler secret put` **persist across deploys**, so CI only needs
`CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID`) — never the API keys.

After the first deploy, copy your `*.workers.dev` URL and set it in `script.js`
(`CFG.workerUrl` default — replace `WORKERS_SUBDOMAIN`) or via the chat ⚙ settings.

## Before going live
- Confirm the model id with a working key: `GET /v1beta/models`. Update
  `ALLOWED_MODELS` / `DEFAULT_MODEL` in `wrangler.toml` if needed.
- Set `DAILY_BUDGET` to ~80% of your AI Studio dashboard's RPD.
- For contact email, optionally verify your domain in Resend and change
  `CONTACT_FROM` from `onboarding@resend.dev` to e.g. `hello@arumugamg.com`.

## Notes
- `gemini-2.0-*` models were shut down 2026-06-01 — don't list them.
- Per-IP limits are per Cloudflare location; the DO global caps are the real limit.
- The contact form emails `CONTACT_TO` (garumugamtvm@gmail.com) with `reply_to` set
  to the sender, so you can reply directly.
