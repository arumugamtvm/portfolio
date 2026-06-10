---
title: Week 18 — LangChain
description: Build LLM applications with LangChain — LCEL pipe syntax, RAG pipelines with Chroma, conversation memory, ReAct agents with tools, and LangSmith tracing.
---

> 🎯 **TL;DR** — LangChain is the go-to framework for building LLM applications. Master the **LCEL pipe syntax** (`prompt | llm | parser`), build **RAG pipelines** with Chroma + retrievers, add **memory** for multi-turn conversations, and use **LangSmith** to debug everything. It connects LLMs to tools, data, and memory in modular, composable chains.

## 🧠 Mental Model

Think of LangChain like **LEGO for AI apps**. Each piece (LLM, Prompt, Retriever, Memory) snaps together via the `|` pipe operator. You build complex behavior by combining small, reusable blocks — just like Linux pipes (`cat file | grep word | sort`). The pipeline takes input on the left and passes results rightward through each component until you get your final answer.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Component</th><th>What It Does</th><th>Key Class</th></tr>
<tr><td>LLMs / Chat Models</td><td>Interface to GPT-4, Claude, Gemini</td><td><code>ChatOpenAI</code>, <code>ChatAnthropic</code></td></tr>
<tr><td>Prompt Templates</td><td>Structured, reusable prompts</td><td><code>ChatPromptTemplate</code></td></tr>
<tr><td>LCEL Chains</td><td>Pipe components together with <code>|</code></td><td><code>prompt | llm | parser</code></td></tr>
<tr><td>Output Parsers</td><td>Convert LLM text → structured data</td><td><code>StrOutputParser</code>, <code>JsonOutputParser</code></td></tr>
<tr><td>Memory</td><td>Store conversation history</td><td><code>ConversationBufferMemory</code>, <code>ConversationSummaryMemory</code></td></tr>
<tr><td>Document Loaders</td><td>Load PDFs, URLs, CSVs</td><td><code>PyPDFLoader</code>, <code>WebBaseLoader</code></td></tr>
<tr><td>Text Splitters</td><td>Chunk large documents</td><td><code>RecursiveCharacterTextSplitter</code></td></tr>
<tr><td>Vector Stores</td><td>Store & search embeddings</td><td><code>Chroma</code>, <code>FAISS</code>, <code>Pinecone</code></td></tr>
<tr><td>Retrievers</td><td>Fetch relevant chunks</td><td><code>.as_retriever()</code></td></tr>
<tr><td>Agents + Tools</td><td>LLM that decides what to call</td><td><code>create_react_agent</code>, <code>Tool</code></td></tr>
<tr><td>LangSmith</td><td>Trace, debug, evaluate chains</td><td><code>LANGCHAIN_TRACING_V2=true</code></td></tr>
</table>

## 🔢 Key Steps / Process

1. **Install packages** — `langchain`, `langchain-openai`, `langchain-community`, `langsmith`
2. **Create an LLM** — `ChatOpenAI(model="gpt-4o-mini", temperature=0)`
3. **Build a prompt** — `ChatPromptTemplate.from_messages([("system", "..."), ("human", "{input}")])`
4. **Compose a chain** — `chain = prompt | llm | StrOutputParser()`
5. **Load documents** — `PyPDFLoader`, `WebBaseLoader`, `CSVLoader`
6. **Split into chunks** — `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`
7. **Embed + store** — `Chroma.from_documents(chunks, OpenAIEmbeddings())`
8. **Build RAG chain** — `retriever | format_docs → context → llm → answer`
9. **Add memory** — `ConversationBufferMemory` for multi-turn conversations
10. **Enable tracing** — Set `LANGCHAIN_TRACING_V2=true` for LangSmith observability

## 💻 Code Cheatsheet

```python
# ============================================================
# LANGCHAIN COMPLETE CHEATSHEET — Runnable, production patterns
# pip install langchain langchain-openai langchain-anthropic langchain-community chromadb
# ============================================================

import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.messages import HumanMessage, SystemMessage

# ── 1. MODELS ────────────────────────────────────────────────
openai_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
claude_llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

# Simple invoke
response = openai_llm.invoke("What is LangChain?")
print(response.content)

# ── 2. PROMPT TEMPLATES ──────────────────────────────────────
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert {role}. Be concise."),
    ("human", "{question}")
])

chain = prompt | openai_llm | StrOutputParser()
result = chain.invoke({"role": "AI engineer", "question": "What is RAG?"})
print(result)  # plain string output

# MessagesPlaceholder for chat history
from langchain_core.prompts import MessagesPlaceholder
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),  # inject past messages
    ("human", "{input}")
])

# ── 3. OUTPUT PARSERS ────────────────────────────────────────
from pydantic import BaseModel, Field

class MovieReview(BaseModel):
    title: str = Field(description="Movie title")
    rating: float = Field(description="Rating 0–10")
    summary: str = Field(description="One-line summary")

# Modern: with_structured_output (preferred)
structured_llm = openai_llm.with_structured_output(MovieReview)
review = structured_llm.invoke("Review the movie Inception")
print(review.title, review.rating, review.summary)

# JSON parser alternative
parser = JsonOutputParser(pydantic_object=MovieReview)
review_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a movie critic. {format_instructions}"),
    ("human", "Review: {movie}")
])
json_chain = review_prompt | openai_llm | parser
result = json_chain.invoke({
    "movie": "Interstellar",
    "format_instructions": parser.get_format_instructions()
})
print(result)  # dict with title, rating, summary

# ── 4. DOCUMENT LOADING ──────────────────────────────────────
from langchain_community.document_loaders import (
    PyPDFLoader, WebBaseLoader, CSVLoader, TextLoader, DirectoryLoader
)

# PDF loader
pdf_loader = PyPDFLoader("research_paper.pdf")
pages = pdf_loader.load()
print(f"{len(pages)} pages | First 200 chars: {pages[0].page_content[:200]}")
print(pages[0].metadata)  # {'source': '...', 'page': 0}

# Web page
web_loader = WebBaseLoader("https://docs.langchain.com/docs/")
web_docs = web_loader.load()

# CSV
csv_loader = CSVLoader("data.csv")
rows = csv_loader.load()

# Full directory
dir_loader = DirectoryLoader("./docs/", glob="**/*.pdf", loader_cls=PyPDFLoader)
all_docs = dir_loader.load()

# ── 5. TEXT SPLITTING ────────────────────────────────────────
from langchain.text_splitter import RecursiveCharacterTextSplitter

# RecursiveCharacterTextSplitter: tries ["\n\n", "\n", " ", ""] in order
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # target chunk size in chars
    chunk_overlap=200,     # overlap to preserve context across chunks
    length_function=len
)

chunks = splitter.split_documents(pages)
print(f"{len(chunks)} chunks | avg size: {sum(len(c.page_content) for c in chunks)//len(chunks)} chars")

# ── 6. VECTOR STORE + RETRIEVER ──────────────────────────────
from langchain_community.vectorstores import Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Create vector store from chunks
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"  # persist to disk
)

# Load existing store
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings
)

# Retriever — returns top-k relevant chunks
retriever = vectorstore.as_retriever(
    search_type="similarity",   # or "mmr" for diversity
    search_kwargs={"k": 4}
)

docs = retriever.invoke("What is the main topic?")
print(f"Retrieved {len(docs)} docs")

# ── 7. COMPLETE RAG CHAIN (LCEL) ─────────────────────────────
rag_prompt = ChatPromptTemplate.from_template("""
Answer the question using ONLY the context below.
If you don't know, say "I don't know."

Context:
{context}

Question: {question}
""")

def format_docs(docs):
    """Concatenate retrieved chunks into one context string."""
    return "\n\n---\n\n".join(d.page_content for d in docs)

# Full LCEL RAG pipeline
rag_chain = (
    {
        "context": retriever | format_docs,  # retrieve → format
        "question": RunnablePassthrough()    # pass question through unchanged
    }
    | rag_prompt
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)

answer = rag_chain.invoke("What is the main topic of this document?")
print(answer)

# RAG with source documents
from langchain.chains import RetrievalQA
qa_chain = RetrievalQA.from_chain_type(
    llm=openai_llm,
    retriever=retriever,
    return_source_documents=True   # include sources in response
)
result = qa_chain.invoke({"query": "Explain the key concepts"})
print(result["result"])
for doc in result["source_documents"]:
    print(doc.metadata["source"], doc.metadata.get("page", ""))

# ── 8. CONVERSATION MEMORY ───────────────────────────────────
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.chains import ConversationChain

# Buffer Memory — stores full history
memory = ConversationBufferMemory(return_messages=True)
conv_chain = ConversationChain(llm=openai_llm, memory=memory, verbose=False)

conv_chain.predict(input="My name is Arumugam")
conv_chain.predict(input="I want to become an AI Engineer")
response = conv_chain.predict(input="What's my name and goal?")
print(response)  # Correctly recalls name and goal

# Summary Memory — summarizes old messages (saves tokens)
summary_memory = ConversationSummaryMemory(llm=openai_llm, return_messages=True)
summary_chain = ConversationChain(llm=openai_llm, memory=summary_memory)

# ── 9. TOOLS + AGENTS ────────────────────────────────────────
from langchain.tools import Tool
from langchain.agents import create_react_agent, AgentExecutor
from langchain import hub

def search_web(query: str) -> str:
    """Simulated web search tool."""
    return f"Search results for: {query} — [result1, result2, result3]"

def calculate(expression: str) -> str:
    """Evaluate a math expression safely."""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

tools = [
    Tool(name="WebSearch", func=search_web, description="Search the web for current info"),
    Tool(name="Calculator", func=calculate, description="Evaluate math expressions"),
]

# ReAct agent (Reason + Act loop)
react_prompt = hub.pull("hwchase17/react")
agent = create_react_agent(llm=openai_llm, tools=tools, prompt=react_prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)

result = agent_executor.invoke({"input": "What is 25 * 48 + 100?"})
print(result["output"])

# ── 10. STREAMING ────────────────────────────────────────────
streaming_llm = ChatOpenAI(model="gpt-4o-mini", streaming=True)

# Stream tokens in real time
for chunk in streaming_llm.stream("Explain transformers in simple terms"):
    print(chunk.content, end="", flush=True)
print()  # newline at end

# Stream with LCEL chain
stream_chain = prompt | streaming_llm | StrOutputParser()
for chunk in stream_chain.stream({"role": "teacher", "question": "What is attention mechanism?"}):
    print(chunk, end="", flush=True)

# ── 11. LANGSMITH OBSERVABILITY ──────────────────────────────
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-api-key"
os.environ["LANGCHAIN_PROJECT"] = "my-rag-project"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"

# All LangChain calls now auto-traced at https://smith.langchain.com
# View latency, token counts, chain steps, errors — all in one dashboard
result = rag_chain.invoke("What is RAG?")
print(result)

# ── 12. SEQUENTIAL CHAINS (LCEL) ─────────────────────────────
# Chain 1: Generate a blog title
title_prompt = ChatPromptTemplate.from_template("Generate a catchy blog title about: {topic}")
title_chain = title_prompt | openai_llm | StrOutputParser()

# Chain 2: Write intro based on title
intro_prompt = ChatPromptTemplate.from_template("Write a 2-sentence intro for this blog: {title}")
intro_chain = intro_prompt | openai_llm | StrOutputParser()

# Compose sequentially
full_chain = title_chain | RunnableLambda(lambda title: {"title": title}) | intro_chain

blog_intro = full_chain.invoke({"topic": "LangChain for beginners"})
print(blog_intro)
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Component</th><th>Default</th><th>Effect</th></tr>
<tr><td><code>temperature</code></td><td>ChatOpenAI</td><td><code>0.7</code></td><td>0 = deterministic, 1 = creative</td></tr>
<tr><td><code>model</code></td><td>ChatOpenAI</td><td><code>gpt-3.5-turbo</code></td><td>Model to use (gpt-4o-mini recommended)</td></tr>
<tr><td><code>chunk_size</code></td><td>TextSplitter</td><td><code>1000</code></td><td>Characters per chunk</td></tr>
<tr><td><code>chunk_overlap</code></td><td>TextSplitter</td><td><code>200</code></td><td>Overlap between chunks for context</td></tr>
<tr><td><code>k</code></td><td>Retriever</td><td><code>4</code></td><td>Number of chunks to retrieve</td></tr>
<tr><td><code>search_type</code></td><td>Retriever</td><td><code>"similarity"</code></td><td><code>"similarity"</code> or <code>"mmr"</code> (diversity)</td></tr>
<tr><td><code>streaming</code></td><td>ChatOpenAI</td><td><code>False</code></td><td>Enable token-by-token streaming</td></tr>
<tr><td><code>max_iterations</code></td><td>AgentExecutor</td><td><code>15</code></td><td>Max tool-call cycles before stopping</td></tr>
<tr><td><code>return_messages</code></td><td>Memory</td><td><code>False</code></td><td>Return as Message objects vs string</td></tr>
<tr><td><code>verbose</code></td><td>Chains/Agents</td><td><code>False</code></td><td>Print chain steps for debugging</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What is LCEL and why does it replace old LangChain chains?**

LCEL (LangChain Expression Language) uses the `|` pipe operator to compose Runnables. It replaces `LLMChain`/`SequentialChain` with a streaming-first, type-safe API that supports batch, async, and streaming out of the box. Every component in LCEL implements the `Runnable` interface with `.invoke()`, `.stream()`, `.batch()`, `.ainvoke()`.

**Q2: What's the difference between ConversationBufferMemory and ConversationSummaryMemory?**

`ConversationBufferMemory` stores the full verbatim history — simple but grows token usage linearly. `ConversationSummaryMemory` uses an LLM to summarize older messages, keeping token count bounded at the cost of one extra LLM call per summary update. Use Buffer for short sessions, Summary for long-running conversations.

**Q3: How does a RAG pipeline work end-to-end?**

1) Load documents → 2) Split into chunks → 3) Embed chunks → 4) Store in vector DB → 5) At query time: embed question → 6) Retrieve top-k similar chunks → 7) Inject into prompt as context → 8) LLM generates grounded answer.

**Q4: What is RunnablePassthrough used for?**

It passes the input through unchanged in a parallel dict construction. Used in RAG: `{"context": retriever | format_docs, "question": RunnablePassthrough()}` — the question flows unchanged while context is retrieved in parallel.

**Q5: How do you add tools to an agent vs a chain?**

Chains follow a fixed execution path. Agents dynamically decide which tool to call based on the LLM's reasoning (ReAct loop: Thought → Action → Observation → repeat). Use chains when the flow is known; use agents when the flow depends on the input.

**Q6: What is LangSmith and when should you use it?**

LangSmith is the observability platform for LangChain apps. It traces every chain step, logs token usage, latency, and errors. Use it from day 1 in development — set `LANGCHAIN_TRACING_V2=true` and all calls auto-trace. Critical for debugging retrieval quality and agent loops.

**Q7: How does `with_structured_output()` differ from `JsonOutputParser`?**

`with_structured_output()` is the modern API — it uses native function-calling under the hood (OpenAI tool_use / Anthropic tool_use), guaranteeing structured output. `JsonOutputParser` parses text responses, which can fail if the LLM doesn't follow format instructions. Prefer `with_structured_output()` whenever possible.

**Q8: What is chunk_overlap and why does it matter?**

Overlap preserves context at chunk boundaries. Without overlap, a sentence split across chunks loses meaning. With `chunk_overlap=200`, consecutive chunks share 200 characters, ensuring retrieval always returns coherent context even when the answer spans a chunk boundary.

## ⚠️ Common Mistakes

- **Using old `LLMChain` / `SequentialChain` API** — these are deprecated; always use LCEL pipe syntax instead
- **Forgetting `RunnablePassthrough()`** in RAG — if you don't pass the question through the parallel dict, it gets dropped from the prompt
- **chunk_size too large** — chunks > 1500 chars often dilute retrieval precision; stay in 500–1000 char range
- **No chunk_overlap** — splitting without overlap causes answers that span chunk boundaries to be missed
- **Retrieving k=1** — too few chunks miss context; retrieve 4–6 and let the LLM synthesize
- **Not persisting vector store** — recreating embeddings on every run wastes money; use `persist_directory` in Chroma
- **Ignoring LangSmith** — debugging agent loops without tracing is nearly impossible; enable tracing from the start

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Use This</th></tr>
<tr><td>Simple Q&A with one LLM call</td><td><code>prompt | llm | StrOutputParser()</code></td></tr>
<tr><td>Structured JSON/Pydantic output</td><td><code>llm.with_structured_output(MyModel)</code></td></tr>
<tr><td>Q&A over PDF/web documents</td><td>RAG: <code>PyPDFLoader → Splitter → Chroma → retriever → rag_chain</code></td></tr>
<tr><td>Multi-turn conversation</td><td><code>ConversationChain</code> + <code>ConversationBufferMemory</code></td></tr>
<tr><td>Long conversation (token saving)</td><td><code>ConversationSummaryMemory</code></td></tr>
<tr><td>Dynamic tool use (web search, calc)</td><td><code>create_react_agent</code> + <code>AgentExecutor</code></td></tr>
<tr><td>Real-time streaming responses</td><td><code>streaming=True</code> + <code>.stream()</code></td></tr>
<tr><td>Chaining multiple prompts</td><td>LCEL pipe: <code>chain1 | chain2</code></td></tr>
<tr><td>Debug/trace production chains</td><td>LangSmith with <code>LANGCHAIN_TRACING_V2=true</code></td></tr>
<tr><td>Load multiple file types</td><td><code>DirectoryLoader</code> with appropriate <code>loader_cls</code></td></tr>
</table>

## 📋 Completion Checklist

- Write LCEL chains using `|` pipe syntax with `invoke()`, `stream()`, `batch()`
- Use `ChatPromptTemplate` with system + human messages and `MessagesPlaceholder`
- Parse LLM output with `StrOutputParser` and `llm.with_structured_output(PydanticModel)`
- Load PDFs and web pages, split with `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`
- Build complete RAG chain: load → split → embed → Chroma → retriever → LCEL rag_chain
- Add `ConversationBufferMemory` for multi-turn and `ConversationSummaryMemory` for long sessions
- Build a ReAct agent with custom tools using `create_react_agent` + `AgentExecutor`
- Enable LangSmith tracing with env vars and review a trace in [smith.langchain.com](http://smith.langchain.com)
