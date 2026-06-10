/**
 * arumugamg.com — site copilot Gemini proxy (Cloudflare Worker, ES module).
 *
 * Role: THIN, HARDENED proxy that holds the Gemini API key as a secret and
 * forwards client chat turns to Google's Generative Language API, streaming
 * the SSE response back. The agentic loop, tool declarations, and tool
 * EXECUTION (window.AGENT scroll/navigate/theme/highlight) all stay in the
 * browser. This Worker never runs tools and never sees the key in source.
 *
 * Defends a FREE Gemini key + free Cloudflare plan against abuse:
 *   1. Origin allowlist (arumugamg.com / github.io / localhost) + strict CORS.
 *   2. Method/path allowlist: GET / (health), OPTIONS (preflight), POST /api/chat.
 *   3. Input caps: body bytes, message count, per-message chars, tool count.
 *   4. Per-IP burst limit via the native ratelimit binding (free, GA).
 *   5. Global daily call budget via a Durable Object + SQLite atomic counter.
 *   6. Server forces model allowlist + maxOutputTokens cap (ignores client).
 *   7. Gemini 4xx/5xx (esp. 429/403) mapped to clean JSON the client can show.
 *
 * Verified against Cloudflare docs (rate-limit binding GA 2025-09, DO SQLite
 * free since 2025-04) and the Gemini streamGenerateContent?alt=sse endpoint.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/* ── small config helpers ─────────────────────────────────────────────── */
const num = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const csv = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function loadConfig(env) {
  return {
    allowedModels: csv(env.ALLOWED_MODELS).length
      ? csv(env.ALLOWED_MODELS)
      : ["gemini-2.5-flash-lite"],
    defaultModel: env.DEFAULT_MODEL || "gemini-2.5-flash-lite",
    // OpenRouter (OpenAI-compatible) — the active default provider.
    openrouterModels: csv(env.OPENROUTER_MODELS).length ? csv(env.OPENROUTER_MODELS) : ["google/gemma-4-31b-it:free"],
    openrouterDefault: env.DEFAULT_OR_MODEL || "google/gemma-4-31b-it:free",
    nvidiaModel: env.NVIDIA_MODEL || "google/gemma-4-31b-it", // fallback model (no :free suffix)
    nvidiaFast: env.NVIDIA_MODEL_FAST || "meta/llama-3.1-8b-instruct", // last-resort racer: small, near-instant, tool-capable
    ollamaModel: env.OLLAMA_CLOUD_MODEL || "gemma4:31b-cloud", // Ollama Cloud (OLLAMA_API_KEY secret) — primary: ~0.7s first token, same gemma family
    maxOutputTokens: num(env.MAX_OUTPUT_TOKENS, 512),
    maxBodyBytes: num(env.MAX_BODY_BYTES, 32768),
    maxMessages: num(env.MAX_MESSAGES, 24),
    maxMessageChars: num(env.MAX_MESSAGE_CHARS, 6000),
    maxTools: num(env.MAX_TOOLS, 16),
    // Daily budget MUST sit below your AI-Studio dashboard RPD (Google no longer
    // publishes free numbers). 160 is a conservative default (~80% of a ~200 RPD
    // floor). Raise/lower in wrangler.toml [vars] to match YOUR dashboard.
    dailyBudget: num(env.DAILY_BUDGET, 160),
    // Global requests-per-minute gate (counts every hop). Keep < model RPM (~10-15).
    globalRpm: num(env.GLOBAL_RPM, 8),
    allowedOrigins: csv(env.ALLOWED_ORIGINS),
    // ── Contact form (Resend) ──
    contactTo: env.CONTACT_TO || "garumugamtvm@gmail.com",
    contactFrom: env.CONTACT_FROM || "onboarding@resend.dev",
    contactDaily: num(env.CONTACT_DAILY, 40), // < Resend free 100/day
    contactRpm: num(env.CONTACT_RPM, 3),
  };
}

/* ── HTML escape (contact message is rendered in an email body) ───────────── */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const looksLikeEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ""));

/* ── CORS ──────────────────────────────────────────────────────────────── */
function isAllowedOrigin(origin, cfg) {
  if (!origin) return false;
  if (cfg.allowedOrigins.includes(origin)) return true;
  // Allow any localhost / 127.0.0.1 port for local dev of the static site.
  try {
    const u = new URL(origin);
    if (
      (u.protocol === "http:" || u.protocol === "https:") &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    /* malformed origin → not allowed */
  }
  return false;
}

function corsHeaders(origin, allowed) {
  const h = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-wallet-key",
    "Access-Control-Max-Age": "86400",
  };
  // Only echo the Origin back when it is allowlisted. Never use "*" here so a
  // disallowed origin gets no CORS grant and the browser blocks the response.
  if (allowed && origin) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

/* ── JSON error helper (always CORS-tagged so the client can read it) ────── */
function jsonError(status, code, message, origin, allowed, extra = {}) {
  return new Response(JSON.stringify({ error: { code, message }, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin, allowed),
    },
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── first-token provider starter (for racing/hedging) ──────────────────────
 * POSTs to an OpenAI-compatible SSE endpoint and resolves only once a REAL
 * `data:` line arrives (queue keep-alive comments like ": PROCESSING" don't
 * count). Resolves with:
 *   { kind:"ok", stream }            — stream replays buffered bytes then pipes the rest
 *   { kind:"http", status, detail }  — endpoint returned an error response
 *   { kind:"net", detail }           — network failure
 *   { kind:"stall" }                 — accepted but produced no data within firstDataMs
 * Never rejects. abort() cancels the request (used to drop the race loser). */
function startSSEProvider(url, headers, bodyStr, firstDataMs, parentSignal) {
  const ctrl = new AbortController();
  const abort = () => { try { ctrl.abort(); } catch { /* already done */ } };
  if (parentSignal) {
    if (parentSignal.aborted) abort();
    else parentSignal.addEventListener("abort", abort, { once: true });
  }
  const promise = (async () => {
    let r;
    try {
      r = await fetch(url, { method: "POST", headers, body: bodyStr, signal: ctrl.signal });
    } catch (e) {
      return { kind: "net", detail: String(e && e.message).slice(0, 200) };
    }
    if (!r.ok) {
      let detail = "";
      try { detail = (await r.text()).slice(0, 400); } catch { /* ignore */ }
      abort();
      return { kind: "http", status: r.status, detail };
    }
    const reader = r.body.getReader();
    const deadline = Date.now() + firstDataMs;
    const chunks = [];
    let seen = "", total = 0;
    const dec = new TextDecoder();
    for (;;) {
      const left = deadline - Date.now();
      if (left <= 0) { abort(); return { kind: "stall" }; }
      let res;
      try {
        res = await Promise.race([reader.read(), sleep(left).then(() => ({ timedOut: true }))]);
      } catch {
        return { kind: "net", detail: "stream read failed" };
      }
      if (res.timedOut) { abort(); return { kind: "stall" }; }
      if (res.done) { abort(); return { kind: "net", detail: "stream ended before any data" }; }
      chunks.push(res.value);
      total += res.value.byteLength;
      seen += dec.decode(res.value, { stream: true });
      if (seen.includes("data:") || total > 65536) break; // real token (or oversized preamble — pass through)
    }
    const stream = new ReadableStream({
      start(c) { for (const ch of chunks) c.enqueue(ch); chunks.length = 0; },
      async pull(c) {
        try {
          const { value, done } = await reader.read();
          if (done) c.close(); else c.enqueue(value);
        } catch { try { c.close(); } catch { /* closed */ } }
      },
      cancel() { abort(); },
    });
    return { kind: "ok", stream };
  })();
  return { promise, abort };
}

/* ── provider health memory (isolate-local, zero-latency) ───────────────────
 * Remembers recent failures so a known-dead provider never gets the head
 * start again (e.g. OpenRouter free tier 429s for the REST OF THE DAY once
 * its 50-requests cap is hit — hedging on it would waste seconds every chat).
 * The most recent winner is promoted to the t=0 slot, so during an outage the
 * provider that actually answers becomes the instant primary automatically.
 * Isolate-local on purpose: no storage round-trips; resets on deploy/eviction
 * (worst case = one slow rediscovery request per isolate). */
const HEALTH = new Map(); // name → { cooldownUntil, reason }
let LAST_WINNER = null;
function msUntilUtcMidnight() {
  const d = new Date();
  return Math.min(12 * 3600e3, Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d.getTime());
}
function noteFail(name, res) {
  const detail = String(res.detail || "");
  const ms = res.kind === "http" && (res.status === 401 || res.status === 403) ? 3600e3 // key refused — long
    : res.kind === "http" && res.status === 429 ? (/per.?day|daily/i.test(detail) ? msUntilUtcMidnight() : 600e3)
    : res.kind === "stall" ? 120e3  // queue jam — retry in a couple of minutes
    : 30e3;                          // transient network blip
  HEALTH.set(name, { cooldownUntil: Date.now() + ms, reason: res.kind + (res.status ? ":" + res.status : "") });
}
function isCooling(name) { const h = HEALTH.get(name); return !!h && h.cooldownUntil > Date.now(); }
function noteWin(name) { HEALTH.delete(name); LAST_WINNER = name; }
function healthSnapshot() {
  const out = {};
  for (const [name, h] of HEALTH) {
    const left = h.cooldownUntil - Date.now();
    if (left > 0) out[name] = { coolingForSecs: Math.round(left / 1000), reason: h.reason };
  }
  return { lastWinner: LAST_WINNER, cooling: out };
}

/* ── request validation ──────────────────────────────────────────────────
 * Expected client body (Gemini-native shape, kept thin):
 *   {
 *     model?: string,                  // must be allowlisted, else default
 *     contents: [{ role, parts:[{text}|{functionCall}|{functionResponse}] }],
 *     systemInstruction?: { parts:[{text}] },
 *     tools?: [{ functionDeclarations:[...] }],
 *     generationConfig?: { temperature?, maxOutputTokens? }  // we cap this
 *   }
 */
function validateAndSanitize(body, cfg) {
  if (typeof body !== "object" || body === null) {
    return { error: "Body must be a JSON object." };
  }
  const contents = body.contents;
  if (!Array.isArray(contents) || contents.length === 0) {
    return { error: "`contents` must be a non-empty array." };
  }
  if (contents.length > cfg.maxMessages) {
    return { error: `Too many messages (max ${cfg.maxMessages}).` };
  }

  let totalChars = 0;
  for (const c of contents) {
    if (typeof c !== "object" || c === null || !Array.isArray(c.parts)) {
      return { error: "Each content item needs a `parts` array." };
    }
    for (const p of c.parts) {
      if (p && typeof p.text === "string") {
        totalChars += p.text.length;
        if (p.text.length > cfg.maxMessageChars) {
          return {
            error: `A message exceeds ${cfg.maxMessageChars} characters.`,
          };
        }
      }
    }
  }
  if (totalChars > cfg.maxMessageChars * cfg.maxMessages) {
    return { error: "Conversation payload too large." };
  }

  // Tools: cap count of declarations. Strip anything that isn't the expected
  // { functionDeclarations: [...] } shape.
  let tools;
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) {
      return { error: "`tools` must be an array." };
    }
    const declCount = body.tools.reduce(
      (n, t) =>
        n + (t && Array.isArray(t.functionDeclarations)
          ? t.functionDeclarations.length
          : 0),
      0,
    );
    if (declCount > cfg.maxTools) {
      return { error: `Too many tool declarations (max ${cfg.maxTools}).` };
    }
    tools = body.tools;
  }

  // Model: force allowlist. A client trying to set an unlisted/expensive model
  // is silently downgraded to the default rather than rejected.
  let model = typeof body.model === "string" ? body.model.trim() : "";
  if (!cfg.allowedModels.includes(model)) model = cfg.defaultModel;

  // generationConfig: keep client temperature (clamped) but FORCE our token
  // cap regardless of what the client sent (omitted, larger, or non-numeric).
  const inCfg =
    body.generationConfig && typeof body.generationConfig === "object"
      ? body.generationConfig
      : {};
  let temperature = Number(inCfg.temperature);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    temperature = 0.4;
  }
  const clientMax = num(inCfg.maxOutputTokens, cfg.maxOutputTokens);
  const maxOutputTokens = Math.min(
    Math.max(1, clientMax),
    cfg.maxOutputTokens,
  );

  // Rebuild the upstream payload from validated pieces only — never forward
  // arbitrary client keys to Gemini.
  const upstream = {
    contents,
    generationConfig: { temperature, maxOutputTokens },
  };
  if (
    body.systemInstruction &&
    typeof body.systemInstruction === "object" &&
    Array.isArray(body.systemInstruction.parts)
  ) {
    upstream.systemInstruction = body.systemInstruction;
  }
  if (tools) upstream.tools = tools;
  if (body.toolConfig && typeof body.toolConfig === "object") {
    upstream.toolConfig = body.toolConfig;
  }

  return { model, upstream };
}

/* ── validation for the OpenRouter (OpenAI-compatible) path ────────────────
 * Expected client body:
 *   { provider:'openrouter', model?, messages:[{role,content,...}], tools?:[{type:'function',...}] }
 */
function validateOpenRouter(body, cfg) {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: "`messages` must be a non-empty array." };
  }
  if (messages.length > cfg.maxMessages) {
    return { error: `Too many messages (max ${cfg.maxMessages}).` };
  }
  let totalChars = 0;
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return { error: "Each message must be an object." };
    if (typeof m.content === "string") {
      totalChars += m.content.length;
      if (m.content.length > cfg.maxMessageChars) {
        return { error: `A message exceeds ${cfg.maxMessageChars} characters.` };
      }
    }
  }
  if (totalChars > cfg.maxMessageChars * cfg.maxMessages) {
    return { error: "Conversation payload too large." };
  }
  let tools;
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) return { error: "`tools` must be an array." };
    if (body.tools.length > cfg.maxTools) {
      return { error: `Too many tools (max ${cfg.maxTools}).` };
    }
    tools = body.tools;
  }
  // Force allowlisted model + token cap. Never forward arbitrary client keys.
  let model = typeof body.model === "string" ? body.model.trim() : "";
  if (!cfg.openrouterModels.includes(model)) model = cfg.openrouterDefault;
  const inCfg = body.generationConfig && typeof body.generationConfig === "object" ? body.generationConfig : {};
  let temperature = Number(inCfg.temperature);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) temperature = 0.4;
  const upstream = {
    model,
    messages,
    stream: true,
    temperature,
    max_tokens: cfg.maxOutputTokens,
  };
  if (tools) upstream.tools = tools;
  return { model, upstream };
}

/* ── main fetch handler ──────────────────────────────────────────────────── */
export default {
  async fetch(request, env, ctx) {
    const cfg = loadConfig(env);
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = isAllowedOrigin(origin, cfg);

    // CORS preflight — answer for any path; grant only to allowed origins.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: corsHeaders(origin, allowed),
      });
    }

    // Health check (the client probe hits this). MUST carry CORS — the probe is
    // ALWAYS cross-origin (localhost:8755->:8787 in dev, arumugamg.com->workers.dev
    // in prod). Without ...corsHeaders the browser rejects the fetch and the
    // Gemini provider would show "offline" on every page load.
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        JSON.stringify({ ok: true, service: "arumugamg-copilot", providers: healthSnapshot() }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...corsHeaders(origin, allowed),
          },
        },
      );
    }

    // ── Contact form → Resend email (own tighter limits; protects the free Resend key) ──
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST")
        return jsonError(405, "method_not_allowed", "Use POST.", origin, allowed);
      if (!allowed)
        return jsonError(403, "origin_forbidden", "Origin not allowed.", origin, false);
      if (num(request.headers.get("Content-Length"), 0) > cfg.maxBodyBytes)
        return jsonError(413, "payload_too_large", "Request body too large.", origin, allowed);
      let cbody;
      try {
        const rawc = await request.arrayBuffer();
        if (rawc.byteLength > cfg.maxBodyBytes)
          return jsonError(413, "payload_too_large", "Request body too large.", origin, allowed);
        cbody = JSON.parse(new TextDecoder().decode(rawc));
      } catch {
        return jsonError(400, "bad_json", "Invalid JSON.", origin, allowed);
      }
      // Honeypot: bots fill the hidden "company" field. Pretend success — don't email, don't tip them off.
      if (cbody && typeof cbody.company === "string" && cbody.company.trim() !== "") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin, allowed) },
        });
      }
      const name = String((cbody && cbody.name) || "").trim();
      const email = String((cbody && cbody.email) || "").trim();
      const message = String((cbody && cbody.message) || "").trim();
      if (name.length < 1 || name.length > 80)
        return jsonError(400, "invalid_request", "Please enter your name.", origin, allowed);
      if (!looksLikeEmail(email) || email.length > 120)
        return jsonError(400, "invalid_request", "Please enter a valid email.", origin, allowed);
      if (message.length < 1 || message.length > 2000)
        return jsonError(400, "invalid_request", "Message must be 1 to 2000 characters.", origin, allowed);

      const cip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (env.CONTACT_RL) {
        const { success } = await env.CONTACT_RL.limit({ key: `contact:${cip}` });
        if (!success)
          return jsonError(429, "rate_limited", "Too many messages — please wait a moment.", origin, allowed, { retryable: true });
      }
      if (env.BUDGET) {
        const stub = env.BUDGET.get(env.BUDGET.idFromName("global-contact-daily"));
        const gate = await (
          await stub.fetch("https://do/consume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget: cfg.contactDaily, rpm: cfg.contactRpm }),
          })
        ).json();
        if (!gate.allowed)
          return jsonError(429, "contact_limited", `The contact form is busy or has hit today's limit — please email ${cfg.contactTo} directly.`, origin, allowed, { retryable: gate.reason === "rpm" });
      }
      if (!env.RESEND_API_KEY)
        return jsonError(500, "misconfigured", "Email is not configured on the server.", origin, allowed);

      let rr;
      try {
        rr = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: cfg.contactFrom,
            to: [cfg.contactTo],
            reply_to: email, // so a reply goes to the visitor
            subject: `New message from arumugamg.com — ${name}`.slice(0, 120),
            html: `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; wrote via arumugamg.com:</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`,
            text: `${name} <${email}> wrote via arumugamg.com:\n\n${message}`,
          }),
          signal: request.signal,
        });
      } catch (e) {
        return jsonError(502, "email_unreachable", `Could not send right now — please email ${cfg.contactTo} directly.`, origin, allowed);
      }
      if (!rr.ok) {
        let d = "";
        try { d = JSON.stringify(await rr.json()); } catch {}
        return jsonError(502, "email_failed", `Could not send right now — please email ${cfg.contactTo} directly.`, origin, allowed, { upstream: d.slice(0, 300) });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin, allowed) },
      });
    }

    // Everything below is the chat endpoint.
    // ── Wallet: owner-only money tracker. Data lives in a Durable Object;
    //    every request must present the WALLET_KEY secret. Nothing public. ──
    if (url.pathname === "/api/wallet") {
      if (!allowed)
        return jsonError(403, "origin_forbidden", "Origin not allowed.", origin, false);
      if (!env.WALLET_KEY || !env.WALLET)
        return jsonError(500, "misconfigured", "Wallet is not configured.", origin, allowed);
      const given = request.headers.get("x-wallet-key") || "";
      // constant-time compare via digests — never leak key length/prefix timing
      const dig = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
      const [a, b] = await Promise.all([dig(given), dig(env.WALLET_KEY)]);
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      if (diff !== 0)
        return jsonError(401, "unauthorized", "Wrong wallet key.", origin, allowed);
      const wip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (env.CHAT_RL) {
        const { success } = await env.CHAT_RL.limit({ key: `wallet:${wip}` });
        if (!success)
          return jsonError(429, "rate_limited", "Too fast — wait a moment.", origin, allowed, { retryable: true });
      }
      const stub = env.WALLET.get(env.WALLET.idFromName("owner-wallet"));
      let fwdBody = null;
      if (request.method === "POST") {
        try {
          const raw = await request.arrayBuffer();
          if (raw.byteLength > 4096) return jsonError(413, "payload_too_large", "Too large.", origin, allowed);
          fwdBody = new TextDecoder().decode(raw);
          JSON.parse(fwdBody); // must be valid JSON
        } catch { return jsonError(400, "bad_json", "Invalid JSON.", origin, allowed); }
      }
      const resp = await stub.fetch("https://do/wallet" + url.search, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        ...(fwdBody ? { body: fwdBody } : {}),
      });
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(origin, allowed) },
      });
    }

    if (url.pathname !== "/api/chat") {
      return jsonError(404, "not_found", "Not found.", origin, allowed);
    }
    if (request.method !== "POST") {
      return jsonError(
        405,
        "method_not_allowed",
        "Use POST.",
        origin,
        allowed,
      );
    }

    // Origin gate — reject cross-origin callers that aren't allowlisted. This
    // is the primary defence against other sites burning the free key.
    if (!allowed) {
      return jsonError(
        403,
        "origin_forbidden",
        "Origin not allowed.",
        origin,
        false,
      );
    }

    // Body-size ceiling: cheap pre-check on Content-Length, then a hard cap
    // while reading (clients can lie about / omit Content-Length).
    const declaredLen = num(request.headers.get("Content-Length"), 0);
    if (declaredLen > cfg.maxBodyBytes) {
      return jsonError(
        413,
        "payload_too_large",
        "Request body too large.",
        origin,
        allowed,
      );
    }
    let raw;
    try {
      raw = await request.arrayBuffer();
    } catch {
      return jsonError(400, "bad_body", "Could not read body.", origin, allowed);
    }
    if (raw.byteLength > cfg.maxBodyBytes) {
      return jsonError(
        413,
        "payload_too_large",
        "Request body too large.",
        origin,
        allowed,
      );
    }

    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return jsonError(400, "bad_json", "Invalid JSON.", origin, allowed);
    }

    // Provider: OpenRouter (default, OpenAI-compatible) or Gemini. The client
    // tells us which; Ollama is talked to directly by the browser, never here.
    const provider = body.provider === "gemini" ? "gemini" : "openrouter";
    const sanitized = provider === "gemini"
      ? validateAndSanitize(body, cfg)
      : validateOpenRouter(body, cfg);
    if (sanitized.error) {
      return jsonError(
        400,
        "invalid_request",
        sanitized.error,
        origin,
        allowed,
      );
    }

    // (4) Per-IP burst limit. Token bucket keyed on the real client IP.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.CHAT_RL) {
      const { success } = await env.CHAT_RL.limit({ key: `chat:${ip}` });
      if (!success) {
        return jsonError(
          429,
          "rate_limited",
          "Too many requests — slow down a moment.",
          origin,
          allowed,
          { retryable: true },
        );
      }
    }

    // (5) Global gate in ONE Durable Object round-trip: RPM (checked first) +
    // daily budget. Both are global (the DO is a single named instance), so this
    // is the real backstop the per-location per-IP limit can't provide.
    if (env.BUDGET) {
      const stub = env.BUDGET.get(env.BUDGET.idFromName("global-daily"));
      const res = await stub.fetch("https://do/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: cfg.dailyBudget, rpm: cfg.globalRpm }),
      });
      const gate = await res.json();
      if (!gate.allowed) {
        if (gate.reason === "rpm") {
          return jsonError(
            429,
            "global_rate_limited",
            "The assistant is busy right now — try again in a moment, or switch to local Ollama.",
            origin,
            allowed,
            { retryable: true },
          );
        }
        return jsonError(
          429,
          "daily_budget_exhausted",
          "The assistant has hit today's usage cap. Try again tomorrow, or switch the provider to local Ollama.",
          origin,
          allowed,
          { retryable: false },
        );
      }
    }

    // Inject the right secret and proxy to the chosen provider's SSE endpoint.
    let upstreamResp;
    if (provider === "openrouter") {
      if (!env.OPENROUTER_API_KEY && !env.NVIDIA_API_KEY) {
        return jsonError(500, "misconfigured", "Server missing chat API keys.", origin, allowed);
      }
      // First-token racing ladder: a provider that ACCEPTS the request but
      // stalls in a queue is as useless as one that errors. Stages launch at
      // staggered times; the first stream to produce a real SSE `data:` token
      // wins and every other in-flight request is aborted. If everything
      // launched so far has hard-failed, the next stage launches immediately.
      // Canonical priority (re-ranked each request by health memory — last
      // winner first, cooling providers last; slot times 0, hedge, +5s, +5s):
      //   1. Ollama Cloud gemma (~0.7s first token, no queue)
      //   2. OpenRouter gemma   (free 50/day, separate quota)
      //   3. NVIDIA gemma       (separate quota, queue can stall)
      //   4. NVIDIA llama-8b    (small + near-instant — bounded worst case)
      const hedgeMs = Math.max(1000, parseInt(env.HEDGE_MS || "6000", 10));
      const patienceMs = Math.max(hedgeMs * 3, parseInt(env.PATIENCE_MS || "65000", 10));
      const nvHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${env.NVIDIA_API_KEY}` };
      // thinking OFF → straight to the answer (faster, doesn't burn the token cap on reasoning).
      const nvBody = (model) => JSON.stringify({ ...sanitized.upstream, model, chat_template_kwargs: { enable_thinking: false } });
      const stages = []; // canonical priority order; launch times assigned after health ranking
      if (env.OLLAMA_API_KEY) {
        stages.push({ name: "ollama_cloud", go: () => startSSEProvider("https://ollama.com/v1/chat/completions", {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
        }, JSON.stringify({ ...sanitized.upstream, model: cfg.ollamaModel }), patienceMs, request.signal) });
      }
      if (env.OPENROUTER_API_KEY) {
        stages.push({ name: "openrouter", go: () => startSSEProvider("https://openrouter.ai/api/v1/chat/completions", {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, // secret never reaches the client
          "HTTP-Referer": "https://arumugamg.com",
          "X-Title": "arumugamg.com site copilot",
        }, JSON.stringify(sanitized.upstream), patienceMs, request.signal) });
      }
      if (env.NVIDIA_API_KEY) {
        stages.push({ name: "nvidia", go: () => startSSEProvider(
          "https://integrate.api.nvidia.com/v1/chat/completions", nvHeaders, nvBody(cfg.nvidiaModel), patienceMs, request.signal) });
        if (cfg.nvidiaFast && cfg.nvidiaFast !== cfg.nvidiaModel) {
          stages.push({ name: "nvidia_fast", go: () => startSSEProvider(
            "https://integrate.api.nvidia.com/v1/chat/completions", nvHeaders, nvBody(cfg.nvidiaFast), patienceMs, request.signal) });
        }
      }
      if (!stages.length) return jsonError(500, "misconfigured", "Server missing chat API keys.", origin, allowed);

      // Health-aware ordering: the latest proven winner gets the t=0 slot;
      // providers in failure cooldown are demoted to the back of the ladder
      // (still launched last, so a wrong memory can never lose availability).
      const rank = (s) => (isCooling(s.name) ? 2 : s.name === LAST_WINNER ? 0 : 1);
      stages.sort((a, b) => rank(a) - rank(b)); // stable → canonical order kept within each rank
      stages.forEach((s, i) => { s.at = i === 0 ? 0 : hedgeMs + (i - 1) * 5000; });

      const racers = [], fails = {};
      let winner = null, resolveWin;
      const winP = new Promise((r) => { resolveWin = r; });
      const launch = (s) => {
        const req = s.go();
        racers.push({ name: s.name, req });
        req.promise.then((res) => {
          if (res.kind === "ok") resolveWin({ ...res, name: s.name, req });
          else {
            noteFail(s.name, res); // remember: skip its head start while it cools down
            fails[s.name] = { kind: res.kind, status: res.status };
            if (Object.keys(fails).length === stages.length) resolveWin(null); // everyone lost
          }
        });
      };
      const t0 = Date.now();
      for (let i = 0; i < stages.length && !winner; i++) {
        launch(stages[i]);
        const nextAt = i + 1 < stages.length ? stages[i + 1].at : patienceMs;
        while (!winner) {
          if (racers.every((x) => fails[x.name])) break; // all launched failed → next stage now
          const left = nextAt - (Date.now() - t0);
          if (left <= 0) break;
          winner = await Promise.race([winP, sleep(Math.min(left, 250)).then(() => null)]);
        }
      }
      if (!winner) winner = await winP; // all stages launched — first token or total failure
      if (!winner) {
        const st = (fails.ollama_cloud && fails.ollama_cloud.status) || (fails.openrouter && fails.openrouter.status) || (fails.nvidia && fails.nvidia.status) || 504;
        const code = st === 429 ? "openrouter_rate_limited" : "fallback_failed";
        return jsonError(st, code, "The assistant is unavailable right now. Please try again shortly.", origin, allowed, { providers: fails });
      }
      for (const { req } of racers) if (req !== winner.req) req.abort(); // drop the losers
      noteWin(winner.name); // promote: next request starts here at t=0
      upstreamResp = { ok: true, body: winner.stream };
    } else {
      const key = env.GEMINI_API_KEY;
      if (!key) {
        return jsonError(500, "misconfigured", "Server missing Gemini key.", origin, allowed);
      }
      const upstreamUrl =
        `${GEMINI_BASE}/${encodeURIComponent(sanitized.model)}:streamGenerateContent?alt=sse`;
      try {
        upstreamResp = await fetch(upstreamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(sanitized.upstream),
          signal: request.signal,
        });
      } catch (e) {
        return jsonError(502, "upstream_unreachable", "Could not reach the model service.", origin, allowed, { detail: String(e && e.message) });
      }
    }

    // Map upstream errors to clean JSON the client UI can render (401/403 = key
    // refused, 429 = provider quota). Each suggests switching provider.
    if (!upstreamResp.ok) {
      let detail = "";
      try {
        const eb = await upstreamResp.json();
        detail = (eb && eb.error && (eb.error.message || eb.error)) || JSON.stringify(eb);
        if (typeof detail !== "string") detail = JSON.stringify(detail);
      } catch {
        try { detail = await upstreamResp.text(); } catch { /* ignore */ }
      }
      const s = upstreamResp.status;
      const pfx = provider === "openrouter" ? "openrouter" : "gemini";
      const code = s === 429 ? pfx + "_rate_limited"
        : (s === 403 || s === 401) ? pfx + "_forbidden"
        : pfx + "_error";
      const message = s === 429
        ? "The assistant is rate-limited right now. Please try again shortly, or switch the model in settings."
        : (s === 403 || s === 401)
          ? "The model key was refused. Try a different provider in settings."
          : "The model service returned an error.";
      return jsonError(s, code, message, origin, allowed, { upstream: detail.slice(0, 500) });
    }

    // Success → stream the provider's SSE ReadableStream straight back, tagged
    // with CORS + SSE headers. The client adapter parses its own `data:` format.
    return new Response(upstreamResp.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...corsHeaders(origin, allowed),
      },
    });
  },
};

/* ── Durable Object: global RPM gate + per-day call budget ─────────────────
 * One named instance ("global-daily") holds the whole site's limits. SQLite
 * backend → free on the Workers Free plan, atomic (single-threaded), and not
 * subject to KV's ~1,000 writes/day cap. Two buckets:
 *   - day  : keyed on the AMERICA/LOS_ANGELES date to match Google's RPD reset
 *            (midnight Pacific), NOT UTC.
 *   - min  : floor(now/60000) minute bucket for a GLOBAL requests-per-minute cap
 *            (the per-location per-IP binding can't enforce a global RPM).
 * Both buckets are checked first; both increment ONLY if both pass.
 */
export class DailyBudget {
  constructor(ctx) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS counter (day TEXT PRIMARY KEY, n INTEGER NOT NULL)",
      );
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS minute (m INTEGER PRIMARY KEY, n INTEGER NOT NULL)",
      );
    });
  }

  // Date in America/Los_Angeles ("YYYY-MM-DD") so the budget resets when Google's
  // free RPD resets (midnight Pacific), regardless of the DO's wall clock.
  pacificDate() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()); // en-CA → YYYY-MM-DD
    } catch {
      return new Date().toISOString().slice(0, 10); // fallback: UTC
    }
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("method", { status: 405 });
    }
    let budget = Infinity;
    let rpm = Infinity;
    try {
      const b = await request.json();
      if (b && Number.isFinite(b.budget)) budget = b.budget;
      if (b && Number.isFinite(b.rpm)) rpm = b.rpm;
    } catch {
      /* defaults */
    }

    const today = this.pacificDate();
    const minuteKey = Math.floor(Date.now() / 60000);

    // RPM check first (cheaper to recover from; "slow down" vs "come back tomorrow").
    const mRow = this.sql
      .exec("SELECT n FROM minute WHERE m = ?", minuteKey)
      .toArray()[0];
    const minuteCount = mRow ? mRow.n : 0;
    if (minuteCount >= rpm) {
      return Response.json({ allowed: false, reason: "rpm", used: minuteCount, rpm });
    }

    // Daily budget check.
    const dRow = this.sql
      .exec("SELECT n FROM counter WHERE day = ?", today)
      .toArray()[0];
    const dayCount = dRow ? dRow.n : 0;
    if (dayCount >= budget) {
      return Response.json({ allowed: false, reason: "budget", used: dayCount, budget });
    }

    // Both pass → increment both. Single-threaded DO ⇒ no interleave between the
    // reads above and these writes (no await in between).
    this.sql.exec(
      "INSERT INTO minute (m, n) VALUES (?, 1) ON CONFLICT(m) DO UPDATE SET n = n + 1",
      minuteKey,
    );
    this.sql.exec(
      "INSERT INTO counter (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1",
      today,
    );
    // Keep both tables tiny: drop stale rows.
    this.sql.exec("DELETE FROM minute WHERE m <> ?", minuteKey);
    this.sql.exec("DELETE FROM counter WHERE day <> ?", today);

    return Response.json({
      allowed: true,
      reason: "ok",
      day: dayCount + 1,
      minute: minuteCount + 1,
    });
  }
}

/* ── Durable Object: the owner's private secrets vault ──────────────────────
 * One named instance ("owner-wallet") stores the owner's secrets (API keys,
 * passwords) in SQLite. Values arrive ALREADY ENCRYPTED client-side
 * (AES-GCM; key derived from the master passphrase that never reaches this
 * server — auth uses a one-way hash of it). This object only ever sees
 * ciphertext. The Worker layer has verified WALLET_KEY before forwarding. */
export class Wallet {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS vault (
         id TEXT PRIMARY KEY,
         ts INTEGER NOT NULL,
         name TEXT NOT NULL,
         username TEXT NOT NULL DEFAULT '',
         ct TEXT NOT NULL
       )`,
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET") {
      const items = this.sql.exec("SELECT * FROM vault ORDER BY ts DESC LIMIT 500").toArray();
      return Response.json({ ok: true, count: items.length, items });
    }
    if (request.method === "POST") {
      let b;
      try { b = await request.json(); } catch { return Response.json({ error: { code: "bad_json", message: "Invalid JSON." } }, { status: 400 }); }
      const name = String(b.name || "").trim().slice(0, 60);
      const username = String(b.username || "").trim().slice(0, 120);
      const ct = String(b.ct || "");
      if (!name) return Response.json({ error: { code: "invalid", message: "Name is required." } }, { status: 400 });
      if (!ct || ct.length > 8192 || !/^[A-Za-z0-9+/=]+$/.test(ct))
        return Response.json({ error: { code: "invalid", message: "Bad ciphertext." } }, { status: 400 });
      const id = crypto.randomUUID();
      this.sql.exec("INSERT INTO vault (id, ts, name, username, ct) VALUES (?, ?, ?, ?, ?)",
        id, Date.now(), name, username, ct);
      return Response.json({ ok: true, id });
    }
    if (request.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      this.sql.exec("DELETE FROM vault WHERE id = ?", id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: { code: "method_not_allowed", message: "Use GET, POST or DELETE." } }, { status: 405 });
  }
}
