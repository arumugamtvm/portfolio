---
title: Week 19.1 — Agentic AI Application (End-to-End Project)
description: Build a complete agentic app end to end — LangGraph orchestration, tools (web search, RAG, calculator), ChromaDB memory, a Streamlit or FastAPI UI, and Docker deployment with error handling and rate limiting.
---

> 🎯 **TL;DR** — An end-to-end agentic app combines: **LangGraph** for orchestration, **tools** (web search, RAG, calculator), **ChromaDB** for long-term memory, **FastAPI/Streamlit** for the UI, and **Docker + Cloud Run** for deployment. Structure your project in layers: tools → memory → agent → API → UI. Handle errors with retries, add logging, rate-limit users, and version your prompts.

## 🧠 Mental Model

Think of an agentic app like a **detective agency**. The client (user) submits a case (question). The lead detective (LLM orchestrator) assigns work to specialists (tools): the researcher searches the web, the archivist digs through files (RAG), the accountant does math (calculator). All findings flow back to the lead detective who synthesizes the final report (answer). The case file (state/memory) is shared by everyone throughout the investigation.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Layer</th><th>Purpose</th><th>Technologies</th></tr>
<tr><td>UI Layer</td><td>User-facing interface</td><td>Streamlit (prototype), FastAPI (production REST)</td></tr>
<tr><td>Orchestration Layer</td><td>Agent decision loop, state management</td><td>LangGraph <code>StateGraph</code>, <code>create_react_agent</code></td></tr>
<tr><td>Tool Layer</td><td>External capabilities the agent can call</td><td>Tavily (search), SQLAlchemy (DB), REST APIs</td></tr>
<tr><td>Memory Layer</td><td>Short-term chat + long-term semantic memory</td><td><code>ConversationBufferMemory</code>, ChromaDB</td></tr>
<tr><td>LLM Provider</td><td>Reasoning engine</td><td>OpenAI GPT-4o, Anthropic Claude, Gemini</td></tr>
<tr><td>Infrastructure</td><td>Containerization + deployment</td><td>Docker, Cloud Run, Streamlit Cloud</td></tr>
<tr><td>Observability</td><td>Tracing + debugging</td><td>LangSmith, Python logging, callbacks</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Design architecture** — draw the layer diagram; decide tools, memory type, LLM
2. **Build tools** — `@tool` decorated functions: web search, calculator, file reader, RAG search
3. **Set up memory** — ChromaDB vectorstore for RAG + `ConversationBufferMemory` for chat
4. **Build the agent** — `create_react_agent(llm, tools)` or full `StateGraph` for complex flows
5. **Write the system prompt** — instruct which tools to prefer, how to cite sources
6. **Build the UI** — Streamlit for quick prototype, FastAPI for production REST API
7. **Add error handling** — retry with `tenacity`, fallback agents, graceful error messages
8. **Add rate limiting** — prevent abuse; track calls per user per minute
9. **Containerize** — `Dockerfile` → `docker build` → `docker run --env-file .env`
10. **Deploy** — Streamlit Cloud (free), HuggingFace Spaces, or Google Cloud Run

## 💻 Code Cheatsheet

```python
# ============================================================
# END-TO-END AGENTIC AI APP — Research Assistant
# Structure: tools.py / memory.py / agent.py / app.py
# pip install langchain langchain-openai langgraph streamlit chromadb tavily-python python-dotenv
# ============================================================

# ── tools.py ─────────────────────────────────────────────────
import os
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

@tool
def web_search(query: str) -> str:
    """Search the web for current, up-to-date information.
    Use for recent events, facts not in the knowledge base."""
    search = TavilySearchResults(max_results=5)
    results = search.invoke(query)
    formatted = [f"Source: {r['url']}\n{r['content']}" for r in results]
    return "\n\n---\n\n".join(formatted)

@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely.
    Examples: '2 ** 10', '(15 * 8) / 4', 'sum([1,2,3,4,5])'"""
    try:
        # Restrict to safe math operations only
        allowed_names = {"__builtins__": {}}
        import math
        allowed_names.update(vars(math))
        result = eval(expression, allowed_names)
        return str(result)
    except Exception as e:
        return f"Calculation error: {e}"

@tool
def read_file(file_path: str) -> str:
    """Read contents of a local text file. Returns first 4000 chars."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read(4000)
    except FileNotFoundError:
        return f"File not found: {file_path}"
    except Exception as e:
        return f"Error: {e}"

def build_rag_tool(vectorstore: Chroma):
    """Factory: create a RAG tool bound to a specific vectorstore."""
    @tool
    def search_knowledge_base(query: str) -> str:
        """Search internal knowledge base for domain-specific information.
        ALWAYS use this before web_search for domain questions."""
        docs = vectorstore.similarity_search(query, k=3)
        if not docs:
            return "No relevant documents found in knowledge base."
        return "\n\n---\n\n".join(
            f"[Doc {i+1} | {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
            for i, doc in enumerate(docs)
        )
    return search_knowledge_base

def get_all_tools(vectorstore=None) -> list:
    """Return all available tools, optionally including RAG."""
    tools = [web_search, calculator, read_file]
    if vectorstore:
        tools.append(build_rag_tool(vectorstore))
    return tools


# ── memory.py ────────────────────────────────────────────────
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

def build_vectorstore(docs_dir: str = "./knowledge_base") -> Chroma:
    """Load .txt files from directory, embed, and store in ChromaDB."""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Load documents
    loader = DirectoryLoader(docs_dir, glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()
    print(f"Loaded {len(documents)} documents from {docs_dir}")
    
    # Chunk documents
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks")
    
    # Embed and persist
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    return vectorstore

def load_vectorstore() -> Chroma:
    """Load existing persisted ChromaDB (run build_vectorstore first)."""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    return Chroma(persist_directory="./chroma_db", embedding_function=embeddings)


# ── agent.py ─────────────────────────────────────────────────
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert Research Assistant AI.

Available tools:
- search_knowledge_base: ALWAYS check internal knowledge base FIRST
- web_search: Use for current events and info not in knowledge base
- calculator: For any mathematical calculations
- read_file: To read local documents

Rules:
1. Check knowledge base BEFORE web search
2. Always cite sources at the end: [Source: URL or Doc Name]
3. Be concise but comprehensive
4. If uncertain, say so — never hallucinate
5. For follow-up questions, leverage prior conversation context"""

def build_agent(use_rag: bool = True):
    """Build the LangGraph ReAct research agent."""
    llm = ChatOpenAI(model="gpt-4o", temperature=0.1, streaming=True)
    
    vectorstore = load_vectorstore() if use_rag else None
    tools = get_all_tools(vectorstore)
    
    agent = create_react_agent(
        model=llm,
        tools=tools,
        state_modifier=SystemMessage(content=SYSTEM_PROMPT)
    )
    logger.info(f"Agent ready with {len(tools)} tools: {[t.name for t in tools]}")
    return agent

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def run_agent(agent, question: str, chat_history: list = None) -> str:
    """Run the agent with retry on transient errors."""
    if chat_history is None:
        chat_history = []
    
    messages = chat_history + [HumanMessage(content=question)]
    try:
        logger.info(f"Running agent: {question[:80]}...")
        result = agent.invoke({"messages": messages})
        response = result["messages"][-1].content
        logger.info("Agent completed successfully")
        return response
    except Exception as e:
        logger.error(f"Agent error: {e}")
        return f"I encountered an error: {str(e)}. Please try again."

def run_agent_with_fallback(question: str, history: list) -> str:
    """Primary agent with fallback to cheaper model on failure."""
    primary_agent = build_agent(use_rag=True)
    try:
        return run_agent(primary_agent, question, history)
    except Exception as e:
        logger.error(f"Primary agent failed: {e}. Using fallback (gpt-4o-mini).")
        fallback_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        from langchain.schema import HumanMessage as HM
        response = fallback_llm.invoke(history + [HM(content=question)])
        return response.content


# ── app.py (Streamlit UI) ─────────────────────────────────────
import streamlit as st
from dotenv import load_dotenv
from collections import defaultdict
from datetime import datetime, timedelta

load_dotenv()

st.set_page_config(page_title="AI Research Assistant", page_icon="🔬", layout="wide")
st.title("🔬 AI Research Assistant Agent")
st.caption("Powered by GPT-4o + LangGraph + ChromaDB")

# ── Rate Limiter ─────────────────────────────────────────────
class RateLimiter:
    def __init__(self, max_calls: int = 10, period_seconds: int = 60):
        self.max_calls = max_calls
        self.period = period_seconds
        self.calls = defaultdict(list)
    
    def is_allowed(self, user_id: str) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.period)
        self.calls[user_id] = [t for t in self.calls[user_id] if t > cutoff]
        if len(self.calls[user_id]) >= self.max_calls:
            return False
        self.calls[user_id].append(now)
        return True

if "rate_limiter" not in st.session_state:
    st.session_state.rate_limiter = RateLimiter(max_calls=10, period_seconds=60)

# ── Sidebar Settings ─────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")
    use_rag = st.toggle("Use Knowledge Base (RAG)", value=True)
    max_history = st.slider("Max conversation history", 5, 30, 20)
    if st.button("🗑️ Clear Conversation"):
        for key in ["messages", "chat_history"]:
            st.session_state[key] = []
        st.rerun()
    st.divider()
    st.caption("Rate limit: 10 questions per minute")

# ── Initialize Session State ─────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "agent" not in st.session_state:
    with st.spinner("🚀 Loading agent..."):
        st.session_state.agent = build_agent(use_rag=use_rag)

# ── Chat Interface ────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Ask me anything to research..."):
    # Rate limit check
    if not st.session_state.rate_limiter.is_allowed("default_user"):
        st.error("Rate limit: 10 questions/min. Please wait.")
        st.stop()
    
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    with st.chat_message("assistant"):
        with st.spinner("🔍 Researching..."):
            response = run_agent(
                st.session_state.agent,
                prompt,
                st.session_state.chat_history
            )
        st.markdown(response)
    
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.session_state.chat_history.extend([
        HumanMessage(content=prompt),
        AIMessage(content=response)
    ])
    
    # Prune history to control token usage
    if len(st.session_state.chat_history) > max_history:
        st.session_state.chat_history = st.session_state.chat_history[-max_history:]


# ── Dockerfile ───────────────────────────────────────────────
# FROM python:3.11-slim
# WORKDIR /app
# RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .
# EXPOSE 8501
# HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health
# CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]

# ── Build & Run Docker ────────────────────────────────────────
# docker build -t research-agent .
# docker run -p 8501:8501 --env-file .env research-agent
# open http://localhost:8501

# ── Deploy to Streamlit Cloud ─────────────────────────────────
# 1. Push repo to GitHub (ensure .env is in .gitignore)
# 2. Go to share.streamlit.io → New app → connect repo → select app.py
# 3. Add secrets under Advanced settings > Secrets
# 4. Click Deploy — live in ~2 minutes

# ── LangSmith Observability ──────────────────────────────────
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-key"
os.environ["LANGCHAIN_PROJECT"] = "research-agent-prod"
# All calls now traced at https://smith.langchain.com
# Monitor: latency, token counts, tool calls, error rates

# ── Custom Logging Callback ───────────────────────────────────
from langchain.callbacks.base import BaseCallbackHandler

class AgentStepLogger(BaseCallbackHandler):
    def on_agent_action(self, action, **kwargs):
        logger.info(f"TOOL CALL: {action.tool} | INPUT: {str(action.tool_input)[:100]}")
    
    def on_tool_end(self, output, **kwargs):
        logger.info(f"TOOL RESULT: {str(output)[:150]}")
    
    def on_agent_finish(self, finish, **kwargs):
        logger.info("AGENT: Completed — final answer delivered")

# Use: agent.with_config(callbacks=[AgentStepLogger()])
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Where</th><th>Recommended Value</th><th>Purpose</th></tr>
<tr><td><code>model</code></td><td>ChatOpenAI</td><td><code>gpt-4o</code> (complex), <code>gpt-4o-mini</code> (simple)</td><td>Balance quality vs cost</td></tr>
<tr><td><code>temperature</code></td><td>ChatOpenAI</td><td><code>0.1</code> for agents</td><td>Low temp = more deterministic reasoning</td></tr>
<tr><td><code>max_tokens</code></td><td>ChatOpenAI</td><td><code>1024–2048</code></td><td>Prevent runaway costs</td></tr>
<tr><td><code>chunk_size</code></td><td>TextSplitter</td><td><code>500</code></td><td>Smaller = more precise retrieval</td></tr>
<tr><td><code>chunk_overlap</code></td><td>TextSplitter</td><td><code>50</code></td><td>Context preservation at boundaries</td></tr>
<tr><td><code>k</code></td><td>Retriever</td><td><code>3</code></td><td>Chunks per RAG query</td></tr>
<tr><td><code>max_calls</code></td><td>RateLimiter</td><td><code>10/min</code></td><td>Per-user rate limit</td></tr>
<tr><td><code>max_history</code></td><td>Chat history</td><td><code>20 messages</code></td><td>Control token usage in long sessions</td></tr>
<tr><td><code>stop_after_attempt</code></td><td>tenacity retry</td><td><code>3</code></td><td>Retry transient API errors</td></tr>
<tr><td><code>streaming</code></td><td>ChatOpenAI</td><td><code>True</code></td><td>Show tokens in real time in UI</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: How do you structure a production agentic application?**

Five layers: (1) UI — Streamlit/FastAPI, (2) Orchestration — LangGraph StateGraph, (3) Tools — search, calculator, RAG, (4) Memory — conversation buffer + ChromaDB, (5) LLM Provider — OpenAI/Anthropic. Each layer is independently testable and swappable.

**Q2: How do you handle errors in agentic systems?**

Three-tier strategy: (1) Retry transient failures with `tenacity` (exponential backoff, 3 attempts), (2) Fallback to a cheaper/simpler model if primary fails, (3) Graceful degradation — return a helpful error message rather than crashing. Log every tool call and error for debugging.

**Q3: How do you control costs in an LLM application?**

Cache repeated queries with `@st.cache_data`, prune conversation history (keep last 20 messages), route simple queries to `gpt-4o-mini` (90% cheaper), use RAG to answer from local knowledge before calling the LLM with web search context, set `max_tokens` limits, and monitor spend in the OpenAI dashboard.

**Q4: Why check the knowledge base before web search?**

RAG over internal documents is free (no external API calls) and faster. Web search costs money (Tavily API credits) and introduces latency. If the answer exists in the knowledge base, you never need to hit the web. Always instruct the agent to try RAG first in the system prompt.

**Q5: How do you version system prompts in production?**

Store prompt versions in environment variables or a config file with semantic version IDs (v1, v2). Use a factory function `get_system_prompt(version=os.getenv("PROMPT_VERSION", "v2"))`. This enables A/B testing, instant rollback, and tracking which prompt version produced which outputs in LangSmith.

**Q6: How do you rate-limit users in a Streamlit app?**

Implement a simple in-memory `RateLimiter` class that tracks timestamps per `user_id` and rejects requests exceeding the limit. For production with multiple workers, use Redis-backed rate limiting (e.g., `slowapi` in FastAPI). Always give users clear feedback about the limit.

**Q7: What is the difference between Streamlit and FastAPI for agentic apps?**

Streamlit is best for rapid prototyping and internal tools — minimal code, built-in session state, easy deployment. FastAPI is better for production APIs consumed by other services or custom frontends — async support, OpenAPI docs, proper auth, horizontal scaling. Start with Streamlit, graduate to FastAPI when you need API contracts.

**Q8: How do you test an agentic application?**

Unit test each tool function in isolation with mocked external calls. Integration test the agent with a fixed set of 10–20 benchmark questions and expected tool sequences. Use LangSmith to compare responses across prompt versions. Test error paths: what happens when the web search API is down, when the LLM returns no tool calls, when rate limits are hit.

## ⚠️ Common Mistakes

- **Hardcoding API keys** — always use `.env` + `python-dotenv`; add `.env` to `.gitignore` before first commit
- **No error handling in tools** — tool errors bubble up and crash the agent; always wrap tool code in `try/except` and return informative error strings
- **Unbounded chat history** — sending the full conversation to the LLM on every turn; prune to last 10–20 messages to control token costs
- **Not testing the agent end-to-end** — testing tools in isolation misses agent routing bugs; always run integration tests with real agent invocations
- **Ignoring rate limits** — LLM APIs have rate limits; without retry logic, transient errors cause permanent failures for users
- **Rebuilding embeddings on every startup** — use `persist_directory` in Chroma and call `load_vectorstore()` on subsequent runs, not `build_vectorstore()`
- **Overly broad system prompts** — vague instructions lead to inconsistent behavior; be explicit about tool preference order, output format, and citation style

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Decision</th><th>Options</th><th>Choose</th></tr>
<tr><td>UI for internal tool</td><td>Streamlit vs FastAPI</td><td>Streamlit — 10x faster to build</td></tr>
<tr><td>UI for production API</td><td>Streamlit vs FastAPI</td><td>FastAPI — proper REST, auth, scaling</td></tr>
<tr><td>Simple queries</td><td>GPT-4o vs GPT-4o-mini</td><td>GPT-4o-mini (90% cheaper)</td></tr>
<tr><td>Complex reasoning</td><td>GPT-4o vs GPT-4o-mini</td><td>GPT-4o</td></tr>
<tr><td>Knowledge in documents</td><td>RAG vs fine-tuning</td><td>RAG (faster, cheaper, updatable)</td></tr>
<tr><td>Multi-step agent</td><td>AgentExecutor vs LangGraph</td><td>LangGraph (full control, checkpointing)</td></tr>
<tr><td>Retry failures</td><td><code>try/except</code> vs <code>tenacity</code></td><td><code>tenacity</code> (backoff, cleaner code)</td></tr>
<tr><td>Short conversation</td><td><code>ConversationBufferMemory</code></td><td>Buffer (no extra LLM calls)</td></tr>
<tr><td>Long conversation</td><td><code>ConversationSummaryMemory</code></td><td>Summary (bounded token usage)</td></tr>
<tr><td>Debug tool calls</td><td>print vs LangSmith</td><td>LangSmith (visual traces, shareable)</td></tr>
</table>

## 📋 Completion Checklist

- Project structure created: `tools.py`, `memory.py`, `agent.py`, `app.py`, `Dockerfile`, `.env`
- Tools implemented: `web_search`, `calculator`, `read_file`, and RAG tool with `@tool` decorator
- ChromaDB vectorstore built from `knowledge_base/` directory and persisted to disk
- LangGraph ReAct agent built with system prompt prioritizing knowledge base before web search
- Streamlit UI with chat interface, sidebar settings, and session state management
- Error handling: `tenacity` retry on agent, `try/except` in every tool function, fallback agent
- Rate limiter: `RateLimiter` class enforcing 10 requests/minute per user
- Deployment: Dockerfile written, `docker build` + `docker run --env-file .env` tested locally
