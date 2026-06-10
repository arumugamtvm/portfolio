---
title: Month 2 — Real Applications (Wk 5–8)
description: Weeks 5 to 8 of the journey. Add memory to chatbots, build evaluation and guardrails, learn CS fundamentals with async Python, and deploy your first AI app to the cloud.
---

**Weeks 5–8 · Days 29–56**

> 🎯 **Theme:** Build Real Applications — Add memory, safety, infrastructure, and deploy to the cloud
> **Active Tracks:** AI · System Design (STARTS!) · Communication · CS

---

## 🎯 Month 2 Goals

- Deploy your first AI app publicly
- Understand AI system design basics
- Write and publish first blog post draft
- Complete 4 system design discussions
- Pass all 4 weekly quizzes

## 📋 Month 2 Milestone

> ✅ Deployed AI app + system design basics understood + first blog post draft ready

---

## 🧠 Week 5 — Memory & Stateful Conversations

> **One line:** By default LLMs have no memory — every call starts fresh. Memory = storing past messages and injecting them back into every new prompt.

**🎯 Analogy:** Imagine calling customer support where the agent forgets your entire history every time you call. Frustrating. Memory = giving the LLM a notebook that records the conversation and reads it at the start of each new turn.

**🔑 3 Types of Memory**

<table>
<tr><th>Type</th><th>How it works</th><th>Best for</th></tr>
<tr><td>Buffer Memory</td><td>Keep all messages in a growing list</td><td>Short conversations (< 20 turns)</td></tr>
<tr><td>Summary Memory</td><td>Summarize old messages to save space</td><td>Long conversations</td></tr>
<tr><td>Vector Memory</td><td>Store facts in a vector DB, retrieve relevant ones</td><td>Very long sessions or many users</td></tr>
</table>

**🔑 Message Format (How to Pass History to the LLM)**

```python
messages = [
  {"role": "system",    "content": "You are a helpful assistant."},
  {"role": "user",      "content": "My name is Arumugam."},
  {"role": "assistant", "content": "Nice to meet you, Arumugam!"},
  {"role": "user",      "content": "What is my name?"}   # LLM now knows!
]
```

**💻 Simple Buffer Memory in Python**

```python
history = []

def chat(user_input):
    history.append({"role": "user", "content": user_input})
    response = client.messages.create(
        model="claude-opus-4-6", messages=history, max_tokens=200
    )
    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    return reply
```

**🏗️ Build:** Multi-turn chatbot that remembers context across 10+ turns. Test it: say your name at turn 1, then ask "What is my name?" at turn 8 — it must remember.

---

## 🧠 Week 6 — Evaluation, Guardrails & Safety

> **One line:** Evaluation = measuring how good your AI outputs are. Guardrails = rules that prevent dangerous, wrong, or unwanted outputs.

**🎯 Analogy:** You built a car (your AI app). Evaluation = running quality checks before shipping. Guardrails = seat belts and airbags. They do not stop the car from working — they prevent disasters when something goes wrong.

**🔑 Key Concepts**

<table>
<tr><th>Concept</th><th>Meaning</th><th>Example</th></tr>
<tr><td>Hallucination</td><td>LLM states wrong facts confidently</td><td>"Paris is in Germany" said with confidence</td></tr>
<tr><td>Prompt Injection</td><td>User tricks LLM with malicious input</td><td>"Ignore all previous instructions and..."</td></tr>
<tr><td>Output Validation</td><td>Check if output matches expected format</td><td>Did the LLM return valid JSON?</td></tr>
<tr><td>LLM-as-Judge</td><td>Use another LLM to score outputs 1–5</td><td>"Rate this answer for accuracy: 1–5"</td></tr>
<tr><td>Guardrail</td><td>Rule that blocks or rewrites a bad output</td><td>Block any reply that contains a phone number</td></tr>
</table>

**💻 Simple LLM-as-Judge Evaluator**

```python
def evaluate(question, answer, ground_truth):
    prompt = f"""
    Question: {question}
    Answer given: {answer}
    Correct answer: {ground_truth}
    Rate the answer's accuracy from 1 (wrong) to 5 (perfect). Reply with only a number.
    """
    score = client.messages.create(
        model="claude-opus-4-6",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=5
    )
    return int(score.content[0].text.strip())
```

**🏗️ Build:** Add an eval layer to your Week 3 PDF Q&A bot — score each answer for accuracy + relevance and log results to a CSV file.

---

## 🧠 Week 7 — OS, Networking, DB Fundamentals + Async Python

> **One line:** As an AI engineer you need to know how computers, networks, and databases work — plus how to write non-blocking async Python to call multiple AI APIs in parallel.

**🎯 Analogy:** You can drive a car without knowing the engine. But to make it faster or fix it, you need to understand what is under the hood. These fundamentals = understanding the engine of every AI app you build.

**🔑 What You Need to Know**

<table>
<tr><th>Topic</th><th>Key Concept</th><th>Why It Matters for AI</th></tr>
<tr><td>OS</td><td>Processes, threads, memory</td><td>LLM inference uses GPU memory and CPU threads</td></tr>
<tr><td>Networking</td><td>HTTP, REST, APIs, TCP/IP</td><td>You call AI APIs over HTTP — understand requests, responses, headers</td></tr>
<tr><td>Databases</td><td>SQL vs NoSQL, indexing, queries</td><td>Store chat history, user data, embeddings</td></tr>
<tr><td>Async Python</td><td>async/await, event loop, concurrency</td><td>Call 10 AI APIs simultaneously without waiting for each one</td></tr>
</table>

**💻 Async API Calls — 3× Faster Than Sequential**

```python
import asyncio
import anthropic

async def ask(question):
    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-opus-4-6", max_tokens=100,
        messages=[{"role": "user", "content": question}]
    )
    return response.content[0].text

# Run 5 questions in parallel — same time as running 1
questions = ["Q1", "Q2", "Q3", "Q4", "Q5"]
answers = asyncio.run(asyncio.gather(*[ask(q) for q in questions]))
```

**🏗️ Build:** Async batch processor — read 20 questions from a CSV, answer all in parallel using async, save results to an output CSV. Measure time vs sequential to see the speedup.

---

## 🧠 Week 8 — Cloud, DevOps & Deployment

> **One line:** You need to deploy your AI apps so others can use them. This means Docker (packaging), FastAPI (REST API), and Railway or Render (cloud hosting).

**🎯 Analogy:** You baked a cake (your app). Deployment = delivering it to everyone's home. Docker = sealing the cake in a box so it doesn't break in transit. Cloud = the delivery truck. CI/CD = automatically re-baking every time you update the recipe.

**🔑 Key Tools**

<table>
<tr><th>Tool</th><th>What it does</th><th>One-line command</th></tr>
<tr><td>Docker</td><td>Packages your app + all dependencies</td><td><code>docker build . && docker run -p 8000:8000 app</code></td></tr>
<tr><td>FastAPI</td><td>Turns Python functions into REST API endpoints</td><td><code>@app.post("/chat")</code> → HTTP endpoint</td></tr>
<tr><td>Railway / Render</td><td>One-click cloud deployment from GitHub</td><td>Push to GitHub → auto-deploys in 2 min</td></tr>
<tr><td>GitHub Actions</td><td>Auto-test and deploy on every code push</td><td>YAML file in <code>.github/workflows/</code></td></tr>
<tr><td>Environment Variables</td><td>Keep API keys out of your code</td><td><code>os.getenv("ANTHROPIC_API_KEY")</code></td></tr>
</table>

**💻 FastAPI + Docker in 5 Minutes**

```python
# main.py
from fastapi import FastAPI
import anthropic

app = FastAPI()
client = anthropic.Anthropic()

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat(request: ChatRequest):
    response = client.messages.create(
        model="claude-opus-4-6", max_tokens=200,
        messages=[{"role": "user", "content": request.message}]
    )
    return {"reply": response.content[0].text}
```

```docker
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install fastapi anthropic uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**🏗️ Build:** Deploy your PDF Q&A bot as a live REST API on Railway. Share the public URL. This is your first publicly deployed AI app. 🚀

---

## 📅 Week Pages — Detailed Daily Checklists

- 📆 Week 5 — Memory & Stateful Conversations
- 📆 Week 6 — Evaluation, Guardrails & Safety
- 📆 Week 7 — OS, Networking, DB Fundamentals + Async Python
- 📆 Week 8 — Cloud, DevOps & Deployment
