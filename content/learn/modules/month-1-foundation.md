---
title: Month 1 — Foundation (Wk 1–4)
description: The first four weeks of the journey. Learn how LLMs work, master prompt engineering, build a RAG pipeline, and use tool calling — with one project each week.
---

**Weeks 1–4 · Days 1–28**

> 🎯 **Theme:** Build Your Foundation — Learn how LLMs work and call your first AI API
> **Active Tracks:** AI Engineering · Communication · CS Fundamentals (light)

---

## 🎯 Month 1 Goals

- Build and run 4 GitHub projects
- Master 30 core AI vocabulary words
- Prepare 3 STAR behavioral stories
- Pass all 4 weekly quizzes (score at least 67% on each)
- Complete all communication exercises

## 📋 Month 1 Milestone

> ✅ 4 GitHub projects + 3 STAR stories + 30 vocab words mastered

---

## 🧠 Week 1 — What is an LLM?

> **One line:** An LLM is a massive neural network trained on billions of web pages. It predicts the next word — over and over — to produce text.

**🎯 Analogy:** LLM = super-powered phone autocomplete. Your phone suggests "good morning" after you type "have a". An LLM was trained on all of the internet — so it can autocomplete anything: code, essays, answers, stories.

**🔑 5 Terms You Must Know**

<table>
<tr><th>Term</th><th>Simple Meaning</th><th>Example</th></tr>
<tr><td>Token</td><td>A chunk of text (not always a word)</td><td>"unhappy" = 2 tokens: "un" + "happy"</td></tr>
<tr><td>Context Window</td><td>How much text the LLM reads at once</td><td>128k tokens ≈ reading 300 pages at once</td></tr>
<tr><td>Temperature</td><td>Controls creativity of output</td><td>0 = safe & exact · 1 = creative & risky</td></tr>
<tr><td>Parameters</td><td>Numbers the model learned during training</td><td>GPT-4 ≈ 1 trillion parameters</td></tr>
<tr><td>Inference</td><td>Running the model to get a response</td><td>You send prompt → model runs → reply appears</td></tr>
</table>

**💻 Your First API Call**

```python
import anthropic

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY from env

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=200,
    messages=[{"role": "user", "content": "What is AI in one sentence?"}]
)
print(response.content[0].text)
```

**🏗️ Build:** Simple terminal chatbot — user types → gets AI reply → loops. Push to GitHub.

---

## 🧠 Week 2 — Prompt Engineering Mastery

> **One line:** Prompt engineering = writing better instructions to get better outputs from an LLM. It is a skill, not a trick.

**🎯 Analogy:** You hired the smartest intern on earth. But they do exactly what you say. Vague instruction → vague output. Clear, structured instruction → perfect output. That is prompt engineering.

**🔑 5 Core Techniques**

<table>
<tr><th>Technique</th><th>What it does</th><th>When to use</th></tr>
<tr><td>System Prompt</td><td>Sets the role and rules for the LLM</td><td>Always — sets the stage</td></tr>
<tr><td>Zero-shot</td><td>Ask directly, no examples</td><td>Simple straightforward tasks</td></tr>
<tr><td>Few-shot</td><td>Give 2–3 examples before asking</td><td>Complex or structured tasks</td></tr>
<tr><td>Chain-of-Thought</td><td>Add "Think step by step"</td><td>Math, logic, multi-step reasoning</td></tr>
<tr><td>Role Prompting</td><td>"Act as a doctor..."</td><td>When domain expertise is needed</td></tr>
</table>

**💻 Before vs After — The Difference Prompt Engineering Makes**

```
❌ Bad:   "Summarize this."

✅ Good:  "You are a technical writer. Summarize the following article
           in exactly 3 bullet points. Each point max 15 words.
           Focus only on technical decisions made."
```

**🏗️ Build:** Prompt Template Library — 5 Python functions each wrapping a different prompt style: summarize, review code, write email, answer FAQ, generate unit tests.

---

## 🧠 Week 3 — RAG: Retrieval-Augmented Generation

> **One line:** RAG = search your own documents first, inject the relevant pieces into the prompt, then let the LLM answer using that fresh context.

**🎯 Analogy:** Open-book exam. The LLM is the student. Your PDFs are the book. Without RAG, the student answers from memory alone (may hallucinate). With RAG, they look up the relevant page first — much more accurate.

**🔑 The RAG Pipeline (Visual)**

```
User Question
    ↓
[Embed the question into a vector]
    ↓
[Search vector DB → find top 3 similar document chunks]
    ↓
[Build prompt: "Context: {chunks} \n\n Question: {question}"]
    ↓
[Send to LLM → Get grounded answer]
```

**🔑 5 Key Terms**

<table>
<tr><th>Term</th><th>Meaning</th><th>Example</th></tr>
<tr><td>Chunking</td><td>Split doc into small pieces</td><td>1 PDF → 50 chunks of ~500 words</td></tr>
<tr><td>Embedding</td><td>Convert text to a vector (numbers)</td><td>"hello" → [0.23, -0.45, 0.78, ...]</td></tr>
<tr><td>Vector Store</td><td>DB that stores and searches vectors</td><td>ChromaDB, Pinecone, FAISS</td></tr>
<tr><td>Similarity Search</td><td>Find chunks closest to the question</td><td>Cosine distance between vectors</td></tr>
<tr><td>Context Injection</td><td>Add found chunks into the prompt</td><td>"Based on: {doc_chunk}... Answer: ..."</td></tr>
</table>

**💻 RAG in 8 Lines**

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Step 1: Embed and store your document chunks
db = Chroma.from_documents(chunks, OpenAIEmbeddings())

# Step 2: At query time — search for relevant chunks
docs = db.similarity_search("What is RAG?", k=3)

# Step 3: Inject into prompt and call LLM
context = "\n".join([d.page_content for d in docs])
# prompt = f"Context: {context}\n\nAnswer: {user_question}"
```

**🏗️ Build:** PDF Q&A Bot — upload any PDF, ask questions, get answers grounded in the document. Use LangChain + ChromaDB.

---

## 🧠 Week 4 — Tool Use & Function Calling

> **One line:** You give the LLM a menu of tools (Python functions) it can call. It decides when to use them, your code runs them, and the LLM forms the final answer using the results.

**🎯 Analogy:** Without tools, the LLM is locked in a room with only its memory. Give it tools = give it a phone, calculator, and web browser. It decides when to use each one — you never have to tell it when.

**🔑 How Tool Calling Works (Step by Step)**

```
1. You define tools as JSON schemas
2. User asks: "What is the weather in Chennai?"
3. LLM decides: "I need get_weather(city='Chennai')"
4. Your code runs get_weather("Chennai") → {"temp": "34°C", "humidity": "80%"}
5. LLM sees result → writes: "It is currently 34°C in Chennai."
```

**🔑 4 Key Terms**

<table>
<tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Tool Schema</td><td>JSON description of a function (name, params, description)</td></tr>
<tr><td>Tool Selection</td><td>LLM reads all tool descriptions and picks the right one</td></tr>
<tr><td>Tool Result</td><td>Your code runs the function and returns the output</td></tr>
<tr><td>Parallel Tool Use</td><td>LLM calls multiple tools in one single turn</td></tr>
</table>

**💻 Tool Definition Example**

```python
tools = [{
    "name": "get_weather",
    "description": "Get current weather for a city",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "The city name"}
        },
        "required": ["city"]
    }
}]
```

**🏗️ Build:** Multi-tool assistant with 3 tools — get_weather, search_web, convert_currency. LLM picks the right tool for every question automatically.

---

## 📅 Week Pages — Detailed Daily Checklists

- 📆 Week 1 — What is an LLM?
- 📆 Week 2 — Prompt Engineering Mastery
- 📆 Week 3 — RAG: Retrieval-Augmented Generation
- 📆 Week 4 — Tool Use & Function Calling
