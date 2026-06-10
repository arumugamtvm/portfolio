---
title: Month 3 — Agentic AI + DSA Begins (Wk 9–12)
description: Weeks 9 to 12 of the journey. Build ReAct agents, multi-agent pipelines, and a custom MCP server, plus advanced RAG — while DSA practice starts.
---

**Weeks 9–12 · Days 57–84**

> 🎯 **Theme:** Agentic AI — Build agents that plan, reason, and take actions autonomously
> **Active Tracks:** AI (Agents) · Communication · System Design · DSA (STARTS!)

---

## 🎯 Month 3 Goals

- Build a working ReAct agent
- Build a multi-agent pipeline
- Build and deploy a custom MCP server
- Solve 30 DSA problems (arrays → graphs)
- Polish 5 STAR behavioral stories

## 📋 Month 3 Milestone

> ✅ ReAct agent built + MCP server live + multi-agent pipeline built + 30 DSA problems + 5 STAR stories

---

## 🧠 Week 9 — The ReAct Loop: Your First Agent

> **One line:** ReAct = Reason + Act. The agent thinks about what tool to use, uses it, observes the result, thinks again — looping until the problem is solved.

**🎯 Analogy:** ReAct agent = a detective. Sherlock does not just answer immediately. He reasons ("I need to check the lab"), acts (goes to lab), observes ("fingerprints found"), reasons again ("check the suspect database"), acts again — until he solves the case.

**🔑 The ReAct Loop (Visual)**

```
User: "What is the capital of France and what is 25°C in Fahrenheit?"

[THOUGHT]     I need two tools: one for facts, one for unit conversion.
[ACTION]      search("capital of France")
[OBSERVATION] "Paris is the capital of France"
[THOUGHT]     Now I need temperature conversion.
[ACTION]      convert_temp(25, "C", "F")
[OBSERVATION] "77°F"
[ANSWER]      "The capital is Paris. 25°C = 77°F."
```

**🔑 Key Terms**

<table>
<tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Thought</td><td>LLM reasons about what to do next</td></tr>
<tr><td>Action</td><td>LLM calls a tool</td></tr>
<tr><td>Observation</td><td>Result your code returns after running the tool</td></tr>
<tr><td>Trajectory</td><td>The full sequence of thought → action → observation steps</td></tr>
<tr><td>Stopping Condition</td><td>When the agent decides it has the final answer</td></tr>
</table>

**🏗️ Build:** ReAct agent with 4 tools (search, calculator, weather, time zone). Give it multi-step questions: "Is it warmer in Chennai or Paris right now? By how many degrees?"

---

## 🧠 Week 10 — Multi-Agent Systems

> **One line:** Instead of one LLM doing everything, you split work across multiple specialized agents — each an expert in one domain — that pass work to each other.

**🎯 Analogy:** A hospital. One doctor does not do everything. The GP refers to a specialist → specialist runs tests → lab sends results → GP gives diagnosis. Multi-agent = a medical team working together, not a solo doctor doing everything.

**🔑 Common Multi-Agent Patterns**

<table>
<tr><th>Pattern</th><th>How it works</th><th>When to use</th></tr>
<tr><td>Orchestrator + Workers</td><td>One agent breaks the task and assigns to workers</td><td>Complex tasks with clear sub-tasks</td></tr>
<tr><td>Pipeline</td><td>Agent A → Agent B → Agent C in sequence</td><td>Data processing workflows</td></tr>
<tr><td>Debate</td><td>Two agents argue a point, third judge decides</td><td>Fact-checking, decisions</td></tr>
<tr><td>Parallel Specialists</td><td>Each agent works on one domain simultaneously</td><td>Research + writing + QA at same time</td></tr>
</table>

**🔑 Key Terms**

<table>
<tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Orchestrator</td><td>The manager agent — plans, delegates, collects results</td></tr>
<tr><td>Worker Agent</td><td>Specialist agent with one specific job</td></tr>
<tr><td>Handoff</td><td>Passing task context from one agent to the next</td></tr>
<tr><td>Shared Memory</td><td>A common store all agents can read from and write to</td></tr>
</table>

**🔑 Agent Handoff Flow (Visual)**

```
[Orchestrator] receives: "Write an article on RAG"
       │
       ├──► [Research Agent]  searches web  ──► findings
       │                                             │
       ├──► findings ──► [Writer Agent]    ──► draft article
       │                                             │
       └──► draft ──► [QA Agent]          ──► verified output ──► FILE SAVED
```

**🏗️ Build:** Research pipeline — Orchestrator receives a topic → Research Agent searches the web → Writer Agent drafts an article → QA Agent checks facts → final output saved to a file.

---

## 🧠 Week 11 — MCP: Model Context Protocol

> **One line:** MCP is a standard protocol for connecting LLMs to external data sources and tools — like USB-C, but for AI apps. Any LLM, any data source, one standard.

**🎯 Analogy:** Before USB-C, every device needed a different charger — a mess. MCP = USB-C for AI. Any LLM (Claude, GPT, Gemini) connects to any data source (your database, Google Drive, GitHub, Slack) using the same standard interface.

**🔑 MCP Architecture**

```
[Claude / LLM]  ←→  [MCP Client]  ←→  [MCP Server]  ←→  [Your Data / Tool]
```

**🔑 Key Concepts**

<table>
<tr><th>Term</th><th>Meaning</th><th>Example</th></tr>
<tr><td>MCP Server</td><td>Exposes your data and tools via a standard interface</td><td>A Python server wrapping your database</td></tr>
<tr><td>MCP Client</td><td>The LLM-side connector (built into Claude Desktop)</td><td>Claude Desktop reads your MCP server</td></tr>
<tr><td>Resource</td><td>Read-only data the LLM can access</td><td>Your files, database rows, API responses</td></tr>
<tr><td>Tool</td><td>A function the LLM can call</td><td><code>run_sql_query()</code>, <code>list_files()</code></td></tr>
<tr><td>Prompt</td><td>Pre-built prompt templates the LLM can use</td><td><code>/summarize_document</code> command</td></tr>
</table>

**💻 Minimal MCP Server (5 lines)**

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool()
def get_user_data(user_id: str) -> dict:
    """Fetch user info from the database"""
    return {"id": user_id, "name": "Arumugam", "plan": "Pro"}

if __name__ == "__main__":
    mcp.run()
```

**🏗️ Build:** MCP server that exposes 3 tools from your own data (read local files, query a SQLite DB, get system info). Connect it to Claude Desktop and test it.

---

## 🧠 Week 12 — Advanced RAG & Vector Search

> **One line:** Basic RAG does a simple vector search. Advanced RAG adds smarter chunking, hybrid search, re-ranking, and query rewriting to get dramatically more accurate answers.

**🎯 Analogy:** Basic RAG = Google in 2000 (keyword match only). Advanced RAG = Google in 2024 (semantic understanding, page rank, spell correction, personalization, result re-ranking). Same idea, massively better results.

**🔑 Advanced RAG Techniques**

<table>
<tr><th>Technique</th><th>Problem It Solves</th><th>How</th></tr>
<tr><td>Hybrid Search</td><td>Pure vector search misses exact keywords</td><td>Combine keyword search (BM25) + vector search</td></tr>
<tr><td>Re-ranking</td><td>Top 3 results may not be the most relevant</td><td>Use a cross-encoder to re-score retrieved chunks</td></tr>
<tr><td>Query Rewriting</td><td>User's question is vague or ambiguous</td><td>LLM rewrites the query before searching</td></tr>
<tr><td>Parent-Child Chunks</td><td>Small chunks retrieved, but need more context</td><td>Retrieve small chunk, inject its full parent paragraph</td></tr>
<tr><td>HyDE</td><td>No good match exists for the query</td><td>Generate a hypothetical answer, search with that instead</td></tr>
</table>

**🔑 Hybrid Search (Visual)**

```
Query: "What does the CEO earn?"

BM25 (keyword):   finds "CEO", "earn", "salary" — exact word match
Vector Search:    finds "executive compensation" — semantic match
Hybrid result:    BOTH types merged → much better recall
```

**🏗️ Build:** Upgrade your Week 3 PDF bot with hybrid search + re-ranking. Test accuracy on 20 questions before vs after — you should see a clear improvement.

---

## 📅 Week Pages — Detailed Daily Checklists

- Week 9 — The ReAct Loop: Your First Agent
- Week 10 — Multi-Agent Systems
- Week 11 — MCP: Model Context Protocol
- Week 12 — Advanced RAG & Vector Search
