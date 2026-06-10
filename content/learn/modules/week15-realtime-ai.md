---
title: Week 15 — Real-Time AI Apps with ChatGPT API
description: Build real-time AI apps with streaming APIs, persistent conversation history, and smart context management using Streamlit, FastAPI, SSE, Whisper, and DALL-E.
---

> 🎯 **TL;DR** — Real-time AI apps = streaming API + persistent conversation history + smart context management. Use Streamlit for rapid UI, FastAPI for production backends, WebSockets or SSE for streaming, Whisper for voice, DALL-E for images. Key challenge: managing token limits as history grows.

---

## 🧠 Mental Model

Think of a real-time AI app as a **live phone call with a goldfish** — the model forgets everything between calls, so you must hand it the transcript each time. Streaming is like hearing words as they're spoken (not waiting for a full sentence). Context window management is like summarising old parts of the transcript so the call stays within the phone's memory limit.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Detail</th></tr>
<tr><td><strong>Streaming</strong></td><td>Tokens returned incrementally as generated</td><td><code>stream=True</code> / <code>.stream()</code> context manager</td></tr>
<tr><td><strong>SSE</strong></td><td>Server-Sent Events — unidirectional server→client push</td><td><code>text/event-stream</code> content type</td></tr>
<tr><td><strong>WebSocket</strong></td><td>Bidirectional real-time channel</td><td>Better for voice; more complex</td></tr>
<tr><td><strong>Conversation history</strong></td><td>List of all messages sent per session</td><td>Stored server-side, keyed by session_id</td></tr>
<tr><td><strong>Context window</strong></td><td>Max tokens model can process at once</td><td>gpt-4o: 128K, claude-opus-4-5: 200K</td></tr>
<tr><td><strong>Sliding window</strong></td><td>Keep only last N messages when limit approaches</td><td>Loses early context</td></tr>
<tr><td><strong>Summarisation</strong></td><td>Compress old messages into a summary</td><td>Preserves key info from early turns</td></tr>
<tr><td><strong>Streamlit chat_message</strong></td><td>Built-in chat UI component</td><td><code>st.chat_message("user")</code> / <code>"assistant"</code></td></tr>
<tr><td><strong>Whisper API</strong></td><td>OpenAI speech-to-text</td><td><code>client.audio.transcriptions.create()</code></td></tr>
<tr><td><strong>Vision API</strong></td><td>Send images alongside text</td><td>Base64 encode or URL</td></tr>
<tr><td><strong>DALL-E</strong></td><td>Text-to-image generation</td><td><code>client.images.generate()</code></td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Choose UI layer** — Streamlit (rapid prototype) or FastAPI + frontend (production)
2. **Initialise session state** — store `messages` list across rerenders (`st.session_state`)
3. **Capture user input** — text via `st.chat_input()`, voice via Whisper, image via file uploader
4. **Append user turn** — add `{role: "user", content: ...}` to history
5. **Stream API response** — iterate over chunks, display incrementally
6. **Append assistant turn** — save model reply to history for next turn
7. **Manage context** — check token count; summarise or slide window when approaching limit
8. **Optimise costs** — cache repeated queries, compress images, choose smaller model for non-critical paths

---

## 💻 Code Cheatsheet

```python
# ============================================================
# 1. STREAMLIT CHAT APP WITH STREAMING (Anthropic — Primary)
# pip install streamlit anthropic
# Run: streamlit run app.py
# ============================================================
import streamlit as st
import anthropic

st.title("💬 Claude Chat")

client = anthropic.Anthropic()           # Reads ANTHROPIC_API_KEY from env

# Persist conversation across rerenders
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display existing conversation
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Get new user input
if prompt := st.chat_input("Message Claude..."):
    # Show user message
    st.chat_message("user").markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Stream Claude's response
    with st.chat_message("assistant"):
        response_placeholder = st.empty()
        full_response = ""

        with client.messages.stream(
            model="claude-opus-4-5",
            max_tokens=1024,
            system="You are a helpful AI assistant.",
            messages=st.session_state.messages   # Full history every call
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                response_placeholder.markdown(full_response + "▌")  # Cursor effect

        response_placeholder.markdown(full_response)

    st.session_state.messages.append({"role": "assistant", "content": full_response})


# ============================================================
# 2. CONTEXT WINDOW MANAGEMENT
# ============================================================
import anthropic

def count_tokens_in_history(messages: list, model: str = "claude-opus-4-5") -> int:
    """Approximate token count for conversation history."""
    client = anthropic.Anthropic()
    # Use the token counting API
    response = client.messages.count_tokens(
        model=model,
        messages=messages
    )
    return response.input_tokens

def manage_context(messages: list, max_tokens: int = 150_000) -> list:
    """Sliding window: drop oldest messages when approaching limit."""
    while count_tokens_in_history(messages) > max_tokens and len(messages) > 2:
        messages.pop(0)              # Remove oldest user message
        if messages and messages[0]["role"] == "assistant":
            messages.pop(0)          # Remove its paired assistant reply
    return messages

def summarise_old_context(messages: list, keep_recent: int = 6) -> list:
    """Summarise early messages to preserve context without tokens."""
    client = anthropic.Anthropic()
    if len(messages) <= keep_recent:
        return messages

    old_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]

    # Ask Claude to summarise the old context
    summary_resp = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=512,
        messages=[
            {"role": "user", "content": f"Summarise this conversation in 3 sentences:\n\n{old_messages}"}
        ]
    )
    summary = summary_resp.content[0].text

    # Inject summary as a system-style user message
    return [
        {"role": "user", "content": f"[Earlier conversation summary]: {summary}"},
        {"role": "assistant", "content": "Understood, I'll keep that context in mind."},
        *recent_messages
    ]


# ============================================================
# 3. FASTAPI STREAMING BACKEND (SSE)
# pip install fastapi uvicorn anthropic
# Run: uvicorn main:app --reload
# ============================================================
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic, json
from uuid import uuid4

app = FastAPI(title="Real-Time AI Chat API")
client = anthropic.Anthropic()

# In-memory session store (use Redis in production)
sessions: dict[str, list] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming SSE endpoint — tokens arrive as they generate."""
    session_id = req.session_id or str(uuid4())

    if session_id not in sessions:
        sessions[session_id] = []

    sessions[session_id].append({"role": "user", "content": req.message})

    def generate():
        full_reply = ""
        # Stream from Anthropic
        with client.messages.stream(
            model="claude-opus-4-5",
            max_tokens=1024,
            system="You are a helpful assistant.",
            messages=sessions[session_id]
        ) as stream:
            for text in stream.text_stream:
                full_reply += text
                # SSE format: "data: <json>\n\n"
                yield f"data: {json.dumps({'text': text})}\n\n"

        # Save assistant reply to history
        sessions[session_id].append({"role": "assistant", "content": full_reply})
        yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    return {"messages": sessions.get(session_id, [])}


# ============================================================
# 4. VOICE INPUT WITH WHISPER + VISION API
# pip install openai streamlit
# ============================================================
import openai
import base64

oai_client = openai.OpenAI()

def transcribe_audio(audio_file_path: str) -> str:
    """Convert speech to text using Whisper."""
    with open(audio_file_path, "rb") as audio:
        transcript = oai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio,
            language="en"                    # Specify language for accuracy
        )
    return transcript.text

def analyse_image(image_path: str, question: str) -> str:
    """Send image + text question to GPT-4o Vision."""
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    resp = oai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/jpeg;base64,{image_data}",
                    "detail": "high"         # "low" = cheaper, "high" = better for charts/text
                }}
            ]
        }]
    )
    return resp.choices[0].message.content

def generate_image(prompt: str, size: str = "1024x1024") -> str:
    """Generate image with DALL-E 3. Returns URL."""
    response = oai_client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size=size,                           # "1024x1024" | "1792x1024" | "1024x1792"
        quality="standard",                  # "standard" | "hd"
        n=1                                  # DALL-E 3 only supports n=1
    )
    return response.data[0].url


# ============================================================
# 5. ASYNC BATCH PROCESSING (parallel API calls)
# ============================================================
import asyncio
import anthropic

async def process_single(client: anthropic.AsyncAnthropic, text: str) -> str:
    """Process one document asynchronously."""
    resp = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": f"Summarise in 2 sentences: {text}"}]
    )
    return resp.content[0].text

async def batch_process(texts: list[str]) -> list[str]:
    """Process all texts in parallel — much faster than sequential."""
    async_client = anthropic.AsyncAnthropic()
    tasks = [process_single(async_client, text) for text in texts]
    return await asyncio.gather(*tasks)      # All API calls fire simultaneously

# Run 10 summarisations in parallel
documents = [f"Document {i}: Long article content here..." for i in range(10)]
summaries = asyncio.run(batch_process(documents))
print(f"Processed {len(summaries)} documents in parallel")
```

---

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Tool/API</th><th>Value</th><th>Effect</th></tr>
<tr><td><code>stream=True</code></td><td>OpenAI</td><td>boolean</td><td>Return tokens incrementally</td></tr>
<tr><td><code>.stream()</code> context manager</td><td>Anthropic</td><td>—</td><td>Iterator over <code>text_stream</code></td></tr>
<tr><td><code>media_type="text/event-stream"</code></td><td>FastAPI</td><td>string</td><td>SSE response type</td></tr>
<tr><td><code>detail="high"/"low"</code></td><td>Vision</td><td>string</td><td>Image analysis accuracy vs cost</td></tr>
<tr><td><code>language="en"</code></td><td>Whisper</td><td>string</td><td>Force language for accuracy</td></tr>
<tr><td><code>quality="hd"</code></td><td>DALL-E 3</td><td>string</td><td>Higher quality image</td></tr>
<tr><td><code>size="1792x1024"</code></td><td>DALL-E 3</td><td>string</td><td>Landscape format</td></tr>
<tr><td><code>k=5</code> (keep_recent)</td><td>Context mgmt</td><td>int</td><td>Number of recent turns to preserve</td></tr>
<tr><td><code>max_tokens=150_000</code></td><td>Context limit</td><td>int</td><td>When to trigger summarisation</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: How does streaming work with Server-Sent Events?**

A: The server keeps an HTTP connection open and pushes chunks prefixed with `data: `. Each chunk is a JSON object with a text fragment. The client listens with `EventSource` in JS or reads the stream in Python. FastAPI's `StreamingResponse` with `media_type="text/event-stream"` handles this natively.

**Q2: How do you maintain conversation history in a stateless HTTP API?**

A: Assign each user a `session_id` (UUID). Store their `messages` list server-side (Redis or DB in production, dict for development). Every new message appends to the session's list and sends the full list to the API.

**Q3: What happens when conversation history exceeds the context window?**

A: The API throws a `context_length_exceeded` error. Solutions: (1) Sliding window — drop oldest messages. (2) Summarisation — ask the model to compress old turns into a paragraph and inject as a system message. (3) Use a model with larger context window (claude-opus-4-5 = 200K tokens).

**Q4: When should you use WebSockets vs SSE for streaming?**

A: SSE is simpler and sufficient for one-way streaming (server→client) — perfect for chat. Use WebSockets when you need true bidirectional, low-latency communication (e.g., voice calls, collaborative editing, multiplayer apps).

**Q5: How do you handle image uploads in a chat app?**

A: Accept the file, base64-encode it, and embed it in the messages array as `image_url` content block. For large images, resize first to reduce tokens and cost. Use `detail="low"` for visual descriptions, `detail="high"` for reading text in images.

**Q6: What is the cheapest way to scale a streaming chat app?**

A: (1) Use `gpt-4o-mini` or `claude-haiku` for simple turns. (2) Cache repeated queries with exact-match or semantic cache. (3) Limit `max_tokens` aggressively — most replies need <300 tokens. (4) Implement async batch processing for bulk operations.

**Q7: How does Whisper handle different languages?**

A: Whisper is multilingual by default — it auto-detects language. Specify `language="ta"` for Tamil, `language="en"` for English etc. to improve accuracy and speed. It supports 100+ languages with varying accuracy.

---

## ⚠️ Common Mistakes

- **Re-sending messages without full history** — model loses context; always append and send the entire `messages` list
- **No session_id management** — all users share one history; always key sessions by UUID
- **Blocking the event loop** — use `AsyncAnthropic` / `AsyncOpenAI` for async frameworks, not the sync client
- **Not streaming for long responses** — users wait 10+ seconds for a blank box; stream always for chat UIs
- **Ignoring context limits** — no sliding window means the app crashes when conversations get long
- **Storing large images in session history** — base64 images inflate history; store URL references instead
- **Not compressing audio before Whisper** — Whisper has a 25MB file limit; convert to MP3/OPUS first

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Need</th><th>Tool</th><th>Notes</th></tr>
<tr><td>Quick chat prototype</td><td>Streamlit + <code>st.chat_input</code></td><td>30 lines, instant deploy</td></tr>
<tr><td>Production backend</td><td>FastAPI + SSE</td><td>Scalable, session management</td></tr>
<tr><td>Bidirectional streaming</td><td>WebSockets</td><td>More complex, needed for voice</td></tr>
<tr><td>Speech input</td><td>OpenAI Whisper</td><td><code>audio.transcriptions.create()</code></td></tr>
<tr><td>Image analysis</td><td>GPT-4o Vision</td><td>Base64 or URL, detail param</td></tr>
<tr><td>Image generation</td><td>DALL-E 3</td><td>Best quality; n=1 only</td></tr>
<tr><td>Parallel batch jobs</td><td>asyncio.gather + AsyncAnthropic</td><td>10x faster than sequential</td></tr>
<tr><td>Long sessions</td><td>Summarisation strategy</td><td>Preserves context without token bloat</td></tr>
</table>

---

## 📋 Completion Checklist

- Build a Streamlit chat app with streaming and `st.session_state` history
- Implement SSE streaming endpoint with FastAPI
- Manage multi-turn conversation history keyed by session_id
- Handle context window overflow with sliding window or summarisation
- Add voice input using Whisper API
- Analyse images using GPT-4o Vision with base64 encoding
- Generate images with DALL-E 3
- Use `AsyncAnthropic` with `asyncio.gather` for parallel batch processing
