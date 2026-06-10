---
title: Month 4 — Advanced AI + Portfolio (Wk 13–16)
description: Weeks 13 to 16 of the journey. Learn fine-tuning with LoRA, production observability, embeddings, and AI safety — while career prep begins.
---

**Weeks 13–16 · Days 85–112**

> 🎯 **Theme:** Advanced AI + Career Prep — Fine-tuning, production observability, embeddings, AI safety
> **Active Tracks:** All tracks + Career Prep (STARTS!)

---

## 🎯 Month 4 Goals

- Understand fine-tuning (LoRA, PEFT) — run on Google Colab
- Complete 60 total DSA problems
- Do 2 full mock phone screens
- Polish resume first draft
- Understand AI safety and Constitutional AI

## 📋 Month 4 Milestone

> ✅ 60 DSA problems + AI system design fluency + 2 mock phone screens completed

---

## 🧠 Week 13 — Fine-Tuning vs RAG vs Prompting

> **One line:** Three ways to customize an LLM's behavior. Each has different cost, complexity, and use cases. Choose based on your specific problem.

**🎯 Analogy:** Think of it like choosing transport. Walking = prompting (free, instant, works for short simple trips). Renting a car = RAG (flexible, low upfront cost, ideal for most journeys). Buying and fully customising a car = fine-tuning (total control, expensive, only worth it for specific long-term needs).

**🎯 Decision Tree**

```
Need custom LLM behavior?
├── Just need different style or format?           → Prompt Engineering (free, instant)
├── Need to answer from your own documents/data?  → RAG (cheap, no training needed)
└── Need the model itself to behave differently?  → Fine-tuning (expensive, powerful)
```

**🔑 Side-by-Side Comparison**

<table>
<tr><th>Method</th><th>What changes</th><th>Cost</th><th>When to use</th></tr>
<tr><td>Prompt Engineering</td><td>Your prompt text</td><td>Free</td><td>Style changes, simple tasks</td></tr>
<tr><td>RAG</td><td>What the model reads at query time</td><td>Low (storage only)</td><td>Domain Q&A, private documents</td></tr>
<tr><td>Fine-tuning</td><td>The model's weights</td><td>High (GPU compute)</td><td>Specialized tone, domain-specific tasks</td></tr>
<tr><td>LoRA</td><td>A small adapter layer added on top of weights</td><td>Medium</td><td>Fine-tune without full retraining</td></tr>
<tr><td>PEFT</td><td>Parameter-Efficient Fine-Tuning (LoRA is one type)</td><td>Medium</td><td>Same as LoRA</td></tr>
</table>

**💻 LoRA Fine-Tuning Flow (Conceptual)**

```
1. Start with a base model (e.g., Llama 3.2 1B)
2. Prepare dataset:  [{"prompt": "...", "completion": "..."}]  — 100s to 1000s of examples
3. Train LoRA adapter — only ~1% of weights updated (fast, cheap)
4. Merge adapter with base model
5. Test and deploy the merged model
```

**🏗️ Build:** Fine-tune Llama 3.2 1B on Google Colab using LoRA (via HuggingFace PEFT) on a domain-specific FAQ dataset. Compare answers before and after fine-tuning.

---

## 🧠 Week 14 — LLM Observability & Production Patterns

> **One line:** In production, you must log, trace, monitor, and debug every LLM call — just like any other software service. If you can not see it, you can not fix it.

**🎯 Analogy:** You would never run a production web server with no logs or dashboards. LLM apps are the same — you need to see what prompts were sent, what came back, what failed, how long it took, and how much it cost.

**🔑 Key Observability Concepts**

<table>
<tr><th>Concept</th><th>Meaning</th><th>Tool</th></tr>
<tr><td>Tracing</td><td>Record every LLM call — inputs, outputs, latency</td><td>LangSmith, Langfuse, Helicone</td></tr>
<tr><td>Token Counting</td><td>Track tokens used per call</td><td>Anthropic / OpenAI usage field in response</td></tr>
<tr><td>Cost Monitoring</td><td>Track $ spent per user or feature</td><td>LangSmith, Helicone dashboards</td></tr>
<tr><td>Latency Tracking</td><td>Measure how long each LLM call takes</td><td>Spans in tracing tools</td></tr>
<tr><td>Error Logging</td><td>Capture failed calls and timeouts</td><td>Sentry, custom Python logging</td></tr>
</table>

**🔑 Production Patterns Every AI Engineer Knows**

<table>
<tr><th>Pattern</th><th>Problem it solves</th></tr>
<tr><td>Retry with exponential backoff</td><td>API rate limits and temporary failures</td></tr>
<tr><td>Semantic caching</td><td>Same or similar prompts → return cached response</td></tr>
<tr><td>Streaming</td><td>Long responses → stream tokens as they arrive (better UX)</td></tr>
<tr><td>Fallback model</td><td>Primary model down → auto-switch to backup model</td></tr>
<tr><td>Circuit breaker</td><td>Stop hitting a broken API — fail fast, recover gracefully</td></tr>
</table>

**🏗️ Build:** Add LangSmith tracing to your best project. Run 50 real queries. Analyze: average latency, most expensive prompts, and most common errors.

---

## 🧠 Week 15 — Embeddings Deep Dive

> **One line:** Embeddings convert text (or images, audio) into lists of numbers that capture semantic meaning. Similar meaning = similar numbers = nearby in vector space.

**🎯 Analogy:** Imagine a giant map where every word and sentence has a location. "King" and "Queen" live close together. "Cat" and "Dog" live close together. "King" and "Cat" live far apart. Embeddings = GPS coordinates on a map of meaning.

**🔑 Key Concepts**

<table>
<tr><th>Term</th><th>Meaning</th><th>Example</th></tr>
<tr><td>Vector</td><td>A list of numbers that represents meaning</td><td>[0.23, -0.41, 0.88, ...] (1536 dimensions)</td></tr>
<tr><td>Cosine Similarity</td><td>Measures how similar two vectors are (0 to 1)</td><td>0 = opposite meaning · 1 = identical meaning</td></tr>
<tr><td>Embedding Model</td><td>The model that creates vectors from text</td><td>text-embedding-3-small, all-MiniLM-L6-v2</td></tr>
<tr><td>Semantic Search</td><td>Search by meaning, not just keywords</td><td>Query "car" finds "automobile" results</td></tr>
<tr><td>Clustering</td><td>Group similar documents by vector proximity</td><td>All "ML research papers" cluster together</td></tr>
</table>

**💻 Embeddings in Action**

```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')

sentences = ["I love programming", "Coding is my passion", "I enjoy cooking"]
embeddings = model.encode(sentences)

# Sentences 0 and 1 have similar meaning → high similarity
print(cosine_similarity([embeddings[0]], [embeddings[1]]))  # ~0.85
# Sentences 0 and 2 have different meaning → low similarity
print(cosine_similarity([embeddings[0]], [embeddings[2]]))  # ~0.25
```

**🏗️ Build:** Semantic document search — take 100 blog posts, embed them all, build a search box where you type any question and instantly get the top 5 most relevant articles.

---

## 🧠 Week 16 — AI Safety & Alignment Fundamentals

> **One line:** AI safety = making sure AI systems do what we actually want, safely and reliably, without harmful unintended side effects.

**🎯 Analogy:** A powerful genie that grants wishes literally. You wish for "a million dollars" and it robs a bank. The genie did what you said — not what you meant. AI alignment = making AI do what you meant, not just what you literally said.

**🔑 Key Concepts**

<table>
<tr><th>Concept</th><th>Simple Meaning</th></tr>
<tr><td>Alignment</td><td>Making AI goals match human values and real intentions</td></tr>
<tr><td>RLHF</td><td>Reinforcement Learning from Human Feedback — how ChatGPT was trained to be helpful</td></tr>
<tr><td>Constitutional AI</td><td>Anthropic's method — LLM critiques its own outputs against a set of principles, then revises</td></tr>
<tr><td>Hallucination</td><td>LLM states incorrect facts with total confidence — a core safety risk</td></tr>
<tr><td>Jailbreaking</td><td>Tricking an LLM to bypass its safety guardrails</td></tr>
<tr><td>Red-teaming</td><td>Proactively trying to break your own AI system before it ships</td></tr>
</table>

**🔑 Constitutional AI — How Anthropic Does It**

```
Step 1: LLM generates a response
Step 2: LLM reads its own response against a Constitution (list of principles)
         e.g., "Does this response assist with harmful activities?"
Step 3: LLM critiques and rewrites its response to fix any violations
Step 4: Repeat until the response passes all principles
Result: Safer, more aligned responses — without human labeling of every example
```

**🏗️ Build:** Mini red-team exercise — take your best project, write 20 adversarial prompts (prompt injections, jailbreak attempts, misleading questions). Document which ones succeed and how you would fix each one.

---

## 📅 Week Pages — Detailed Daily Checklists

- Week 13 — Fine-Tuning vs RAG vs Prompting
- Week 14 — LLM Observability & Production Patterns
- Week 15 — Embeddings Deep Dive
- Week 16 — AI Safety & Alignment Fundamentals
