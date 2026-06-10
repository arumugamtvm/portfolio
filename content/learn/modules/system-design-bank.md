---
title: System Design Bank
description: A question bank for system design interview practice, covering AI-specific and traditional questions plus a simple framework and key concepts reference.
---

> **Starts:** Week 5 · 1 question per session · Draw + talk approach

---

## 💡 Framework: How to Answer Any System Design Question

1. **Clarify requirements** (ask 3 questions first — always)
2. **Estimate scale** (back-of-envelope math)
3. **High-level architecture** (draw the boxes)
4. **Deep dive** on 2 key components
5. **Discuss tradeoffs** and alternatives
6. **Talk through failure modes**

---

## 🤖 AI-Specific System Design Questions

<table>
<tr><th>Question</th><th>Week</th><th>Status</th><th>Notes</th></tr>
<tr><td>Design a simple conversation storage system</td><td>5</td><td>⭕</td><td>Memory types, scale</td></tr>
<tr><td>Design monitoring for a RAG system</td><td>6</td><td>⭕</td><td>LangSmith, latency SLAs</td></tr>
<tr><td>Database choice for a RAG system</td><td>7</td><td>⭕</td><td>SQL vs NoSQL vs Vector DB</td></tr>
<tr><td>Architecture of deployed RAG bot as API</td><td>8</td><td>⭕</td><td>FastAPI + Docker + HuggingFace</td></tr>
<tr><td>Design a multi-agent system</td><td>10</td><td>⭕</td><td>Supervisor-worker pattern</td></tr>
<tr><td>MCP at scale</td><td>11</td><td>⭕</td><td>Anthropic's design decisions</td></tr>
<tr><td>Production RAG system</td><td>12</td><td>⭕</td><td>Hybrid search, reranking</td></tr>
<tr><td>Fine-tune vs RAG vs few-shot decision</td><td>13</td><td>⭕</td><td>Decision framework</td></tr>
<tr><td>Production LLM serving system</td><td>14</td><td>⭕</td><td>Latency, cost, scale</td></tr>
<tr><td>Vector database at scale</td><td>15</td><td>⭕</td><td>Pinecone vs Weaviate vs Chroma</td></tr>
<tr><td>Safe AI application with guardrails</td><td>16</td><td>⭕</td><td>Constitutional AI</td></tr>
<tr><td>Design ChatGPT/Claude at 10M users</td><td>18</td><td>⭕</td><td>Full scale AI system</td></tr>
<tr><td>RAG for 100M-document enterprise</td><td>18</td><td>⭕</td><td>Chunking, indexing, retrieval</td></tr>
<tr><td>Multi-agent pipeline with human-in-loop</td><td>18</td><td>⭕</td><td>Agent orchestration</td></tr>
<tr><td>Real-time AI coding assistant</td><td>18</td><td>⭕</td><td>GitHub Copilot style</td></tr>
</table>

## 🏗️ Traditional System Design Questions

<table>
<tr><th>Question</th><th>Week</th><th>Status</th><th>Key Concepts</th></tr>
<tr><td>Design URL Shortener</td><td>17</td><td>⭕</td><td>Hashing, caching, CDN</td></tr>
<tr><td>Design Rate Limiter</td><td>17</td><td>⭕</td><td>Token bucket, sliding window</td></tr>
<tr><td>Design Notification System</td><td>17</td><td>⭕</td><td>Queues, fanout, push vs pull</td></tr>
</table>

---

## 📚 Key Concepts Reference

<table>
<tr><th>Concept</th><th>When to Use</th></tr>
<tr><td>CAP Theorem</td><td>Any distributed system tradeoff</td></tr>
<tr><td>SQL vs NoSQL</td><td>Data storage decisions</td></tr>
<tr><td>Redis</td><td>Caching, session storage, pub/sub</td></tr>
<tr><td>Message Queues</td><td>Async processing, decoupling</td></tr>
<tr><td>CDN</td><td>Static assets, global latency</td></tr>
<tr><td>Load Balancers</td><td>Horizontal scaling</td></tr>
<tr><td>Horizontal vs Vertical Scaling</td><td>Traffic growth questions</td></tr>
<tr><td>Circuit Breakers</td><td>LLM failure handling</td></tr>
</table>
