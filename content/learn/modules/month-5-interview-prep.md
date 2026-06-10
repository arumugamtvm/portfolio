---
title: Month 5 — Full Interview Prep (Wk 17–20)
description: Weeks 17 to 20 of the journey. Practice traditional and AI-specific system design, run full mock interview loops, and finish your portfolio and online presence.
---

**Weeks 17–20 · Days 113–140**

> 🎯 **Theme:** Full Interview Prep Mode — System design, mock interviews, portfolio, online presence
> **Active Tracks:** ALL tracks at full intensity

---

## 🎯 Month 5 Goals

- Design 3 traditional systems (URL shortener, Twitter, Netflix)
- Design 2 AI-specific systems at scale
- Complete 5 full mock interview loops
- Finalize portfolio (3 flagship projects live)
- Publish 2 technical blog posts
- LinkedIn profile overhaul complete

## 📋 Month 5 Milestone

> ✅ 100+ DSA problems + full mock loops done + portfolio live + 2 blog posts published

---

## 🧠 Week 17 — Traditional System Design

> **One line:** System design interviews test your ability to architect large-scale software — starting from a vague requirement and turning it into a detailed, scalable blueprint.

**🎯 Analogy:** Designing a new airport from scratch. You must figure out: how many runways? How many gates? How does luggage flow? What happens when one runway is closed? System design = architectural planning for software at scale.

**🔑 The ACED Framework for Every System Design Interview**

```
A — Ask + Clarify   Requirements (how many users? read vs write ratio? latency target?)
C — Capacity        Estimate scale (QPS, storage in GB/TB, bandwidth)
E — Entities        Define core data models and APIs
D — Design          Draw the architecture (load balancer → servers → DB → cache)
+ Deep Dive         Pick one component and go deep (sharding, replication, failure handling)
```

**🔑 Core Building Blocks — Know These Cold**

<table>
<tr><th>Component</th><th>Purpose</th><th>When to use</th></tr>
<tr><td>Load Balancer</td><td>Distribute traffic across servers</td><td>Always, for any scaled system</td></tr>
<tr><td>CDN</td><td>Serve static content from edge locations</td><td>Media files, global users</td></tr>
<tr><td>Cache (Redis)</td><td>Fast reads, reduce database load</td><td>Hot data, session state, rate limiting</td></tr>
<tr><td>Message Queue</td><td>Async processing, decouple services</td><td>Email sending, notifications, heavy jobs</td></tr>
<tr><td>Database Sharding</td><td>Split data across multiple machines</td><td>> 1TB data or very high write QPS</td></tr>
<tr><td>Read Replicas</td><td>Scale read traffic horizontally</td><td>Read-heavy systems (social feeds, news)</td></tr>
</table>

**🔑 Classic Problems — Practice All 5**

1. URL Shortener (like [bit.ly](http://bit.ly)) — core CRUD + hashing
2. Twitter / X Feed — fan-out on write vs read
3. Netflix Streaming — CDN + chunked video delivery
4. WhatsApp Messaging — message queues + delivery receipts
5. Uber Ride Matching — geo-indexing + real-time matching

**🏗️ Do:** Design URL Shortener end-to-end. Draw the full diagram. Estimate for 100M users and 10M new URLs/day. Present it out loud for 45 minutes as if in a real interview.

---

## 🧠 Week 18 — AI-Specific System Design

> **One line:** AI systems have unique design challenges — LLM latency, token costs, streaming responses, vector search, model versioning, and safety layers all need specific solutions.

**🎯 Analogy:** An AI system is like a hospital with a specialist referral chain. The API gateway is reception (checks credentials), the rate limiter is triage (manages the queue), the semantic cache is a returning patient's file (skip the queue if we've seen this before), the LLM is the specialist (does the real diagnostic work), and the safety filter is the pharmacist (checks the prescription before dispensing). Every visit is logged.

**🎯 AI System Request Flow (Visual)**

```
User Request
    ↓
[API Gateway]  →  [Rate Limiter]  →  [Semantic Cache — check if seen before]
    ↓  (cache miss)
[Prompt Builder]  ←  [Context Fetcher (RAG pipeline / conversation memory)]
    ↓
[LLM API — Claude / GPT]  →  [Output Safety Filter]  →  [Output Validator]
    ↓
[Response streamed to user]  +  [Full trace logged to observability platform]
```

**🔑 AI-Specific Design Challenges and Solutions**

<table>
<tr><th>Challenge</th><th>Best Solution</th></tr>
<tr><td>LLM latency (2–10 sec per call)</td><td>Streaming, request pre-warming, async processing</td></tr>
<tr><td>Token cost at scale</td><td>Semantic caching, prompt compression, route simple queries to cheaper models</td></tr>
<tr><td>Hallucination in production</td><td>RAG with grounding, output validation, human review for high-stakes outputs</td></tr>
<tr><td>Model versioning</td><td>A/B test model versions, shadow deployment before full rollout</td></tr>
<tr><td>Prompt injection from users</td><td>Input sanitization, strict separation of system and user prompt contexts</td></tr>
<tr><td>Cold start latency</td><td>Keep model warm with periodic pings, use provisioned concurrency</td></tr>
</table>

**🏗️ Design Challenge:** Design an "AI Customer Support System" for 1M users/day. Cover: full request flow, RAG pipeline, safety layer, cost estimation per query, and what happens when the LLM API is down.

---

## 🧠 Week 19 — Mock Interview Week

> **One line:** A mock interview is a full simulation — coding + system design + behavioral — run exactly like a real interview. The goal: expose every weakness before you face a real interviewer.

**🎯 Standard Interview Loop Structure**

```
[0–5 min]    Intro and rapport building
[5–35 min]    Technical: 1–2 LeetCode-style problems (talk out loud while coding)
[35–80 min]   System design: Design an AI system from scratch (45 min — matches real rounds)
[80–100 min]  Behavioral: 3–5 STAR-format questions
[100–110 min] Your questions for the interviewer
```

**🔑 What Interviewers Actually Score**

<table>
<tr><th>Dimension</th><th>What they are really looking for</th></tr>
<tr><td>Problem Solving</td><td>Do you break the problem down clearly before typing?</td></tr>
<tr><td>Communication</td><td>Do you think out loud? Do you explain your trade-offs?</td></tr>
<tr><td>Coding Quality</td><td>Clean code, handles edge cases, no obvious bugs</td></tr>
<tr><td>System Design</td><td>Do you handle scale, failure scenarios, and trade-offs?</td></tr>
<tr><td>Behavioral</td><td>Specific real examples, STAR format, genuine self-awareness</td></tr>
</table>

**📋 Mock Interview Checklist**

- Use a timer — 35 min for coding, 45 min for system design
- Record yourself (or use Pramp / [Interviewing.io](http://Interviewing.io) with a partner)
- Debrief immediately after: what went well, what to improve
- Do at least 2 full mocks per week this month

**🏗️ Do:** Schedule 2 mock sessions this week on Pramp or [Interviewing.io](http://Interviewing.io). Record both. Write a one-page debrief immediately after each: what went well, what to fix, and your top 3 practice areas before the next session.

---

## 🧠 Week 20 — Portfolio & Online Presence

> **One line:** Your portfolio is your proof of work. Recruiters spend 30 seconds scanning it. Every element must earn its place.

**🔑 The 5-Item Portfolio Checklist**

<table>
<tr><th>Item</th><th>Standard to hit</th><th>What it proves</th></tr>
<tr><td>GitHub</td><td>5+ pinned repos, good READMEs, commits in last 30 days</td><td>You can code and you are active</td></tr>
<tr><td>Portfolio Site</td><td>Clean, fast, 3 flagship AI projects with demos</td><td>You can build and ship</td></tr>
<tr><td>Blog</td><td>2+ technical posts (500–1000 words each)</td><td>You can think deeply and communicate clearly</td></tr>
<tr><td>LinkedIn</td><td>Updated headline, 500+ connections, AI-specific keywords</td><td>Recruiters can discover you</td></tr>
<tr><td>Resume</td><td>1 page, results-focused, ATS-friendly keywords</td><td>Gets past the initial filter</td></tr>
</table>

**🔑 Project README Formula — Copy This**

```markdown
# Project Name — One-line description of what it does

## What Problem It Solves
[2 sentences max. What pain, what solution, what result.]

## Live Demo
[Screenshot or GIF — show it working]

## Tech Stack
Python · FastAPI · Claude API · ChromaDB · Docker

## How to Run
git clone ...
pip install -r requirements.txt
python main.py

## Architecture
[Simple diagram or bullet points]
```

**🏗️ Build:** Publish your portfolio site on Vercel (Next.js or plain HTML). Pin your 3 best AI projects. Write one 600-word blog post explaining how you built your most interesting project.

---

## 📅 Week Pages — Detailed Daily Checklists

- Week 17 — Traditional System Design
- Week 18 — AI-Specific System Design Advanced
- Week 19 — Mock Interview Week 1
- Week 20 — Portfolio & Online Presence
