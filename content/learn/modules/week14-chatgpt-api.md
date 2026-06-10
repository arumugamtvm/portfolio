---
title: Week 14 — ChatGPT API & Advanced Techniques
description: Learn how to call the ChatGPT and Claude APIs with a messages array, control output with temperature and max_tokens, and use streaming, structured output, function calling, and retry logic.
---

> 🎯 **TL;DR** — The ChatGPT/Claude API takes a `messages` array (system + user + assistant roles), returns a completion, and charges per token. Master: model selection, temperature, streaming, structured output, function calling, and error handling with exponential backoff. Anthropic Claude SDK is primary; OpenAI SDK is secondary.

---

## 🧠 Mental Model

Think of the API like a **walkie-talkie conversation log**. Every call sends the *entire conversation history* as a `messages` array. The model reads all previous turns and responds. You control creativity (temperature), length (max_tokens), and format (structured output). Tools/function calling let the model "reach out" and call your code mid-conversation.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Detail</th></tr>
<tr><td><strong>messages array</strong></td><td>Full conversation history sent every call</td><td><code>[{role, content}, ...]</code></td></tr>
<tr><td><strong>system role</strong></td><td>Permanent instructions for the model</td><td>Set personality, constraints</td></tr>
<tr><td><strong>user role</strong></td><td>Human turn input</td><td>Your question/prompt</td></tr>
<tr><td><strong>assistant role</strong></td><td>Previous model response (for multi-turn)</td><td>Inject past replies</td></tr>
<tr><td><strong>temperature</strong></td><td>Randomness 0.0–2.0</td><td>0=deterministic, 0.7=balanced, 1.5=creative</td></tr>
<tr><td><strong>top_p</strong></td><td>Nucleus sampling (alternative to temp)</td><td>Use one or the other, not both</td></tr>
<tr><td><strong>max_tokens</strong></td><td>Hard cap on output length</td><td>Truncates if hit — set generously</td></tr>
<tr><td><strong>streaming</strong></td><td>Get tokens as they arrive</td><td>Better UX, same cost</td></tr>
<tr><td><strong>structured output</strong></td><td>Force JSON schema on response</td><td>Use Pydantic + <code>parse()</code></td></tr>
<tr><td><strong>function calling / tools</strong></td><td>Model triggers your Python functions</td><td>Core of AI agents</td></tr>
<tr><td><strong>tiktoken</strong></td><td>OpenAI token counter library</td><td>Estimate cost before sending</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Install SDKs** — `pip install anthropic openai tiktoken`
2. **Set API key** — environment variable `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
3. **Build messages array** — system prompt first, then user message
4. **Call the API** — choose model, set temperature + max_tokens
5. **Extract response** — `.content[0].text` (Anthropic) or `.choices[0].message.content` (OpenAI)
6. **Handle errors** — rate limits → exponential backoff, connection errors → retry
7. **Count tokens** — use tiktoken to estimate cost before deployment
8. **Stream for UX** — use `stream=True` for real-time output in chat interfaces

---

## 💻 Code Cheatsheet

```python
# ============================================================
# ANTHROPIC CLAUDE — PRIMARY SDK
# pip install anthropic
# ============================================================
import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# --- 1. Basic Chat Completion ---
message = client.messages.create(
    model="claude-opus-4-5",           # Latest flagship model
    max_tokens=1024,
    system="You are an expert Python engineer. Be concise.",  # System prompt
    messages=[
        {"role": "user", "content": "Explain decorators in Python with an example"}
    ]
)
print(message.content[0].text)
print(f"Input tokens: {message.usage.input_tokens}")
print(f"Output tokens: {message.usage.output_tokens}")

# --- 2. Multi-turn Conversation ---
conversation = []

def chat(user_input: str) -> str:
    conversation.append({"role": "user", "content": user_input})
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system="You are a helpful coding tutor.",
        messages=conversation                 # Send full history every time
    )
    reply = response.content[0].text
    conversation.append({"role": "assistant", "content": reply})  # Save for next turn
    return reply

print(chat("What is a closure in Python?"))
print(chat("Can you give me an example?"))   # Model remembers context

# --- 3. Streaming Response ---
with client.messages.stream(
    model="claude-opus-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a Python web scraper"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)      # Tokens appear as they generate
print()  # newline after stream

# --- 4. Tool Use / Function Calling (Claude) ---
import json

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a city. Returns temperature and conditions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. Chennai"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"], "default": "celsius"}
            },
            "required": ["city"]
        }
    }
]

def get_weather(city: str, unit: str = "celsius") -> dict:
    # Real implementation would call a weather API
    return {"city": city, "temperature": "28°C", "conditions": "Sunny"}

response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in Chennai?"}]
)

# Process tool use
if response.stop_reason == "tool_use":
    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            print(f"Model called tool: {block.name}({block.input})")
            result = get_weather(**block.input)         # Execute your function
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result)
            })
    # Send results back for final answer
    final = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "What's the weather in Chennai?"},
            {"role": "assistant", "content": response.content},
            {"role": "user", "content": tool_results}
        ]
    )
    print(final.content[0].text)

# ============================================================
# OPENAI — SECONDARY SDK
# pip install openai
# ============================================================
from openai import OpenAI
from pydantic import BaseModel

oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# --- 5. Basic OpenAI Completion ---
resp = oai.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain list comprehensions"}
    ],
    temperature=0.7,
    max_tokens=500,
    top_p=1.0,                          # Nucleus sampling (use OR temperature, not both)
    frequency_penalty=0.0,              # Penalise repeated tokens
    presence_penalty=0.0                # Penalise already-mentioned topics
)
print(resp.choices[0].message.content)

# --- 6. Structured Output with Pydantic ---
class CodeReview(BaseModel):
    issues: list[str]       # List of bugs/problems found
    suggestions: list[str]  # Improvement recommendations
    rating: int             # Quality score 1-10
    overall: str            # Summary verdict

completion = oai.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a senior code reviewer."},
        {"role": "user", "content": "Review: def add(a,b): return a+b"}
    ],
    response_format=CodeReview           # Forces structured JSON output
)
review = completion.choices[0].message.parsed
print(f"Rating: {review.rating}/10 | Issues: {review.issues}")

# --- 7. Token Counting & Cost Estimation ---
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))

def estimate_cost(prompt: str, expected_output: int = 500, model: str = "gpt-4o-mini") -> tuple:
    # Prices per 1M tokens — verify at platform.openai.com/pricing
    prices = {
        "gpt-4o-mini":  {"input": 0.15,  "output": 0.60},
        "gpt-4o":       {"input": 2.50,  "output": 10.00},
    }
    input_tokens = count_tokens(prompt, model)
    cost = (
        input_tokens / 1_000_000 * prices[model]["input"] +
        expected_output / 1_000_000 * prices[model]["output"]
    )
    return input_tokens, round(cost, 6)

tokens, cost = estimate_cost("Explain machine learning in detail")
print(f"Input tokens: {tokens} | Estimated cost: ${cost}")

# --- 8. Error Handling with Exponential Backoff ---
import time
from openai import RateLimitError, APIConnectionError, APITimeoutError

def call_with_retry(messages: list, max_retries: int = 3) -> str:
    for attempt in range(max_retries):
        try:
            resp = oai.chat.completions.create(model="gpt-4o-mini", messages=messages)
            return resp.choices[0].message.content
        except RateLimitError:
            wait = 2 ** attempt              # Exponential backoff: 1s, 2s, 4s
            print(f"Rate limited. Waiting {wait}s...")
            time.sleep(wait)
        except (APIConnectionError, APITimeoutError) as e:
            print(f"Connection error: {e}. Retrying...")
            time.sleep(1)
    raise Exception("Max retries exceeded")

# --- 9. Prompt Engineering Patterns ---

# Few-shot prompting: show examples before the real question
few_shot_messages = [
    {"role": "system", "content": "Classify sentiment as POSITIVE or NEGATIVE. Reply with one word only."},
    {"role": "user",   "content": "I love this product!"},
    {"role": "assistant", "content": "POSITIVE"},
    {"role": "user",   "content": "This is terrible."},
    {"role": "assistant", "content": "NEGATIVE"},
    {"role": "user",   "content": "The delivery was fast but packaging was damaged."},  # Real query
]

# Chain-of-thought: ask model to reason step-by-step before answering
cot_system = """Solve problems by thinking step-by-step.
Format:
THINKING: <your reasoning>
ANSWER: <final answer>"""
```

---

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Type</th><th>Range</th><th>Default</th><th>Effect</th></tr>
<tr><td><code>model</code></td><td>string</td><td>—</td><td>—</td><td>Which LLM to use (affects quality + cost)</td></tr>
<tr><td><code>temperature</code></td><td>float</td><td>0.0–2.0</td><td>1.0</td><td>Randomness — 0=deterministic, 0.7=balanced</td></tr>
<tr><td><code>top_p</code></td><td>float</td><td>0.0–1.0</td><td>1.0</td><td>Nucleus sampling — use instead of temperature</td></tr>
<tr><td><code>max_tokens</code></td><td>int</td><td>1–model max</td><td>—</td><td>Hard output limit (truncates if hit)</td></tr>
<tr><td><code>frequency_penalty</code></td><td>float</td><td>-2.0–2.0</td><td>0.0</td><td>Penalise repeated words</td></tr>
<tr><td><code>presence_penalty</code></td><td>float</td><td>-2.0–2.0</td><td>0.0</td><td>Penalise already-mentioned topics</td></tr>
<tr><td><code>stream</code></td><td>bool</td><td>true/false</td><td>false</td><td>Return tokens incrementally</td></tr>
<tr><td><code>stop</code></td><td>list[str]</td><td>—</td><td>None</td><td>Stop generation at these strings</td></tr>
<tr><td><code>n</code></td><td>int</td><td>1–20</td><td>1</td><td>Number of completions to generate</td></tr>
<tr><td><code>seed</code></td><td>int</td><td>—</td><td>None</td><td>For reproducibility (OpenAI)</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the messages array and why does it matter?**

A: Every API call is stateless — the model has no memory. You must send the full conversation history as a `messages` array with `system`, `user`, and `assistant` roles. This lets you build multi-turn chat by appending each new turn to the array.

**Q2: When should you use temperature=0 vs temperature=0.7 vs temperature=1.5?**

A: `0` for classification, code generation, structured extraction (need consistency). `0.7` for Q&A, explanations, customer support. `1.5` for creative writing, brainstorming, diverse outputs.

**Q3: What is the difference between `top_p` and `temperature`?**

A: Both control randomness. Temperature scales the probability distribution of tokens. Top_p (nucleus sampling) cuts off tokens below a cumulative probability. Best practice: use one, not both. OpenAI recommends not altering both simultaneously.

**Q4: How does function calling / tool use work?**

A: You define tools with `name`, `description`, and `input_schema`. The model reads descriptions and decides when to call a tool. It returns a `tool_use` block — you execute the function and send results back in a `tool_result` block. The model then synthesises the final answer.

**Q5: How do you handle rate limit errors properly?**

A: Catch `RateLimitError` and implement exponential backoff — wait `2^attempt` seconds between retries. Never hammer the API in a tight loop. In production, use a queue + worker pattern.

**Q6: What is structured output and when should you use it?**

A: It forces the model to respond in a specific JSON schema (OpenAI's `response_format` or `parse()` with Pydantic). Use it when you need to parse the response programmatically — code review ratings, entity extraction, classification labels.

**Q7: How do you estimate API costs before deployment?**

A: Use `tiktoken` to count input tokens. Multiply by the price per 1M tokens for the model. Add estimated output tokens × output price. Budget 20% extra for variance. Always test with `gpt-4o-mini` before `gpt-4o`.

**Q8: What is the difference between Claude's API and OpenAI's API structure?**

A: Both use `messages` arrays but differ in: (1) Claude uses `system` as a top-level param, not a role in messages. (2) Claude returns `message.content[0].text`, OpenAI returns `choices[0].message.content`. (3) Tool schemas differ — Claude uses `input_schema`, OpenAI uses `parameters`.

---

## ⚠️ Common Mistakes

- **Forgetting the system prompt** — model behaves generically; always set persona and constraints explicitly
- **Not including conversation history** — each call is stateless; you must re-send all previous messages every turn
- **Using temperature AND top_p together** — redundant and unpredictable; use one or the other
- **Setting max_tokens too low** — model gets truncated mid-sentence; set it to 2x your expected output
- **No error handling for rate limits** — API calls will fail under load without retry logic
- **Counting tokens after the fact** — estimate before calling to avoid surprise costs at scale
- **Hardcoding API keys** — always use environment variables or secrets managers, never commit keys to git

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Model</th><th>Temperature</th><th>Strategy</th></tr>
<tr><td>Production chatbot</td><td>claude-opus-4-5 / gpt-4o-mini</td><td>0.7</td><td>Stream + history</td></tr>
<tr><td>Code generation</td><td>claude-opus-4-5</td><td>0.0–0.2</td><td>System prompt with examples</td></tr>
<tr><td>Data extraction</td><td>gpt-4o-mini</td><td>0.0</td><td>Structured output + Pydantic</td></tr>
<tr><td>Creative writing</td><td>claude-opus-4-5</td><td>1.0–1.5</td><td>High temp + long max_tokens</td></tr>
<tr><td>Classification</td><td>gpt-4o-mini</td><td>0.0</td><td>Few-shot + structured output</td></tr>
<tr><td>Agent with tools</td><td>claude-opus-4-5</td><td>0.3</td><td>Tool use + retry loop</td></tr>
<tr><td>Cost-sensitive batch</td><td>gpt-4o-mini</td><td>varies</td><td>tiktoken estimate first</td></tr>
<tr><td>Reasoning tasks</td><td>claude-opus-4-5</td><td>0.3</td><td>Chain-of-thought system prompt</td></tr>
</table>

---

## 📋 Completion Checklist

- Can call Anthropic Claude API with `client.messages.create()`
- Can call OpenAI Chat Completion API with proper messages array
- Understand system / user / assistant roles and multi-turn history
- Can stream responses for real-time UX
- Can use structured output with Pydantic (`beta.chat.completions.parse`)
- Can define and handle tools / function calling (Claude + OpenAI)
- Can estimate token costs with `tiktoken` before deployment
- Can implement exponential backoff for rate limit errors
