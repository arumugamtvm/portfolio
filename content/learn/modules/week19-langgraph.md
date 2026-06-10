---
title: Week 19 — LangGraph
description: Model agents as directed graphs with LangGraph — nodes are Python functions, state is a shared TypedDict, with loops, conditional branching, human-in-the-loop interrupts, and persistent checkpointing.
---

> 🎯 **TL;DR** — LangGraph models agents as **directed graphs**: nodes are Python functions, edges are transitions, and state is a shared `TypedDict` passed through every node. Use it to build agents with loops, conditional branching, human-in-the-loop interrupts, and persistent checkpointing. It replaces the black-box `AgentExecutor` with full, explicit control over multi-agent workflows.

## 🧠 Mental Model

Think of LangGraph like an **airport control tower**. Planes (state) move between gates (nodes) following routes (edges). The control tower (conditional edges) decides which gate to send a plane to next. If a safety check is needed, planes can be held at a gate (interrupt) until a human approves. The flight log (checkpointer) records every plane's history so you can resume from exactly where it paused. Every plane carries a full manifest (state) that every gate can read and update.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>Description</th><th>Key API</th></tr>
<tr><td><code>StateGraph</code></td><td>The graph definition with typed state schema</td><td><code>StateGraph(MyState)</code></td></tr>
<tr><td>State (TypedDict)</td><td>Shared data passed between all nodes</td><td><code>class State(TypedDict)</code></td></tr>
<tr><td>Node</td><td>Python function that reads & updates state</td><td><code>graph.add_node("name", fn)</code></td></tr>
<tr><td>Edge</td><td>Unconditional transition A → B</td><td><code>graph.add_edge("a", "b")</code></td></tr>
<tr><td>Conditional Edge</td><td>Route based on function output</td><td><code>graph.add_conditional_edges("a", router, {...})</code></td></tr>
<tr><td>Entry Point</td><td>Starting node</td><td><code>graph.set_entry_point("node")</code></td></tr>
<tr><td><code>END</code></td><td>Terminal node (graph stops)</td><td><code>from langgraph.graph import END</code></td></tr>
<tr><td>Checkpointer</td><td>Save/restore state for persistence</td><td><code>MemorySaver()</code>, <code>SqliteSaver()</code></td></tr>
<tr><td>Interrupt</td><td>Pause before/after a node for human review</td><td><code>interrupt_before=["node"]</code></td></tr>
<tr><td><code>ToolNode</code></td><td>Pre-built node that executes tool calls</td><td><code>from langgraph.prebuilt import ToolNode</code></td></tr>
<tr><td>Subgraph</td><td>A compiled graph used as a node</td><td><code>graph.add_node("sub", subgraph.compile())</code></td></tr>
<tr><td>thread_id</td><td>Identifies a conversation session</td><td><code>{"configurable": {"thread_id": "user_1"}}</code></td></tr>
</table>

## 🔢 Key Steps / Process

1. **Define State** — `TypedDict` with `Annotated[list, operator.add]` for append semantics
2. **Create tools** — decorate with `@tool`, bind to LLM with `llm.bind_tools(tools)`
3. **Write node functions** — each takes `state: State`, returns partial state dict
4. **Create `StateGraph(State)`** — add nodes, set entry point
5. **Add edges** — unconditional (`add_edge`) and conditional (`add_conditional_edges`)
6. **Add checkpointer** — `MemorySaver()` for in-memory, `SqliteSaver()` for persistence
7. **Compile** — `app = graph.compile(checkpointer=..., interrupt_before=[...])`
8. **Invoke or stream** — `app.invoke({"messages": [...]}, config={"configurable": {"thread_id": "x"}})`
9. **Inspect state** — `app.get_state(config)` to see current state at interrupt
10. **Resume** — `app.stream(None, config)` to continue after human approval

## 💻 Code Cheatsheet

```python
# ============================================================
# LANGGRAPH COMPLETE CHEATSHEET — Runnable, production patterns
# pip install langgraph langchain-openai langchain-anthropic
# ============================================================

from typing import TypedDict, Annotated, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
import operator

# ── 1. STATE SCHEMA ──────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]  # APPEND semantics
    # Without Annotated, new value REPLACES old value
    # With operator.add, new messages are appended to the list

# Extended state for complex agents
class ResearchState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    task: str
    research_results: list[str]
    draft: str
    iteration: int
    approved: bool

# ── 2. TOOLS ─────────────────────────────────────────────────
@tool
def search_web(query: str) -> str:
    """Search the web for current information about a topic."""
    # In production: use Tavily, SerpAPI, or DuckDuckGo
    return f"Search results for '{query}': Found 5 relevant articles about {query}."

@tool
def calculate(expression: str) -> str:
    """Evaluate a safe mathematical expression."""
    try:
        allowed = set("0123456789+-*/()., ")
        if not all(c in allowed for c in expression):
            return "Error: Only basic math allowed"
        return str(eval(expression))
    except Exception as e:
        return f"Calculation error: {e}"

@tool
def save_to_file(content: str, filename: str) -> str:
    """Save content to a local file."""
    with open(filename, "w") as f:
        f.write(content)
    return f"Saved {len(content)} chars to {filename}"

tools = [search_web, calculate, save_to_file]

# ── 3. BASIC REACT AGENT ─────────────────────────────────────
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools(tools)  # LLM can now call tools

def call_model(state: AgentState) -> dict:
    """Node: send messages to LLM, get response."""
    system = SystemMessage(content="You are a helpful AI assistant with access to tools.")
    messages = [system] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}  # Appended to state["messages"]

tool_node = ToolNode(tools)  # Pre-built: executes tool_calls in last AIMessage

def should_continue(state: AgentState) -> Literal["use_tools", "end"]:
    """Conditional edge: route based on whether LLM made tool calls."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "use_tools"
    return "end"

# Build the graph
graph = StateGraph(AgentState)
graph.add_node("call_model", call_model)
graph.add_node("use_tools", tool_node)

graph.set_entry_point("call_model")
graph.add_conditional_edges(
    "call_model",
    should_continue,
    {"use_tools": "use_tools", "end": END}  # map return values to nodes
)
graph.add_edge("use_tools", "call_model")  # always loop back after tool use

# Compile without checkpointer (stateless)
app = graph.compile()

# Run
result = app.invoke({
    "messages": [HumanMessage(content="Search for LangGraph and calculate 15 * 24")]
})
for msg in result["messages"]:
    print(f"{msg.__class__.__name__}: {str(msg.content)[:100]}")

# ── 4. STREAMING RESPONSES ───────────────────────────────────
for event in app.stream(
    {"messages": [HumanMessage(content="What is 100 * 99?")]},
    stream_mode="values"   # emit full state after each node
):
    last = event["messages"][-1]
    print(f"[{last.__class__.__name__}]: {str(last.content)[:80]}")

# ── 5. CHECKPOINTING — PERSISTENT MEMORY ─────────────────────
checkpointer = MemorySaver()  # In-memory (dev/testing)

# For production persistence:
# from langgraph.checkpoint.sqlite import SqliteSaver
# checkpointer = SqliteSaver.from_conn_string("./agent_state.db")

app_with_memory = graph.compile(checkpointer=checkpointer)

# thread_id identifies the conversation session
config = {"configurable": {"thread_id": "user_arumugam_session_1"}}

# Turn 1
result1 = app_with_memory.invoke(
    {"messages": [HumanMessage(content="My name is Arumugam and I'm learning LangGraph.")]},
    config=config
)
print(result1["messages"][-1].content)

# Turn 2 — same thread_id, state is restored from checkpointer
result2 = app_with_memory.invoke(
    {"messages": [HumanMessage(content="What's my name and what am I learning?")]},
    config=config
)
print(result2["messages"][-1].content)  # Correctly recalls context!

# Inspect full state history
state_history = list(app_with_memory.get_state_history(config))
print(f"Total checkpoints: {len(state_history)}")

# ── 6. HUMAN-IN-THE-LOOP (INTERRUPT) ─────────────────────────
app_hitl = graph.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["use_tools"]  # PAUSE before executing tools
    # interrupt_after=["call_model"]  # or pause AFTER a node
)

config = {"configurable": {"thread_id": "hitl_session_1"}}

# Run until interrupt
events = []
for event in app_hitl.stream(
    {"messages": [HumanMessage(content="Search for the latest AI news")]},
    config=config,
    stream_mode="values"
):
    events.append(event)

# Graph is now PAUSED at "use_tools"
current_state = app_hitl.get_state(config)
print("Paused at:", current_state.next)  # ('use_tools',)
print("Pending tool calls:", current_state.values["messages"][-1].tool_calls)

# Human reviews and decides
human_approval = input("Approve tool execution? (yes/no): ")

if human_approval.lower() == "yes":
    # Resume from checkpoint — pass None to continue
    for event in app_hitl.stream(None, config=config, stream_mode="values"):
        print(event["messages"][-1].content[:100])
else:
    # Override state to skip tools
    app_hitl.update_state(
        config,
        {"messages": [AIMessage(content="Action cancelled by user.")]},
        as_node="call_model"
    )

# ── 7. MULTI-AGENT SUPERVISOR PATTERN ────────────────────────
class SupervisorState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    next: str    # which agent to call next
    task: str

supervisor_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def supervisor(state: SupervisorState) -> dict:
    """Supervisor decides which agent to call next."""
    system = """You are a supervisor coordinating agents: researcher, writer, reviewer.
    Based on the conversation, decide who should act next.
    Reply with ONLY one word: researcher, writer, reviewer, or FINISH."""
    
    response = supervisor_llm.invoke(
        [SystemMessage(content=system)] + state["messages"]
    )
    next_agent = response.content.strip().lower()
    if "finish" in next_agent:
        next_agent = "FINISH"
    return {"next": next_agent}

def researcher(state: SupervisorState) -> dict:
    """Research agent: gathers information."""
    response = llm.invoke([
        SystemMessage(content="You are a research specialist. Provide factual information."),
        HumanMessage(content=f"Research: {state['task']}")
    ])
    return {"messages": [AIMessage(content=f"[Researcher]: {response.content}")]}

def writer(state: SupervisorState) -> dict:
    """Writer agent: drafts content."""
    last_research = next(
        (m.content for m in reversed(state["messages"]) if "[Researcher]" in m.content),
        "No research available"
    )
    response = llm.invoke([
        SystemMessage(content="You are a professional writer. Create polished content."),
        HumanMessage(content=f"Write based on: {last_research}")
    ])
    return {"messages": [AIMessage(content=f"[Writer]: {response.content}")]}

def reviewer(state: SupervisorState) -> dict:
    """Reviewer agent: critiques and approves."""
    last_draft = next(
        (m.content for m in reversed(state["messages"]) if "[Writer]" in m.content),
        "No draft found"
    )
    response = llm.invoke([
        SystemMessage(content="You are an editor. Evaluate the draft. End with APPROVED or REVISION_NEEDED."),
        HumanMessage(content=f"Review: {last_draft}")
    ])
    return {"messages": [AIMessage(content=f"[Reviewer]: {response.content}")]}

def route_supervisor(state: SupervisorState) -> Literal["researcher", "writer", "reviewer", "__end__"]:
    """Route based on supervisor's decision."""
    next_agent = state.get("next", "FINISH")
    if next_agent == "FINISH":
        return END
    return next_agent

# Build supervisor graph
supervisor_graph = StateGraph(SupervisorState)
supervisor_graph.add_node("supervisor", supervisor)
supervisor_graph.add_node("researcher", researcher)
supervisor_graph.add_node("writer", writer)
supervisor_graph.add_node("reviewer", reviewer)

supervisor_graph.set_entry_point("supervisor")
supervisor_graph.add_conditional_edges("supervisor", route_supervisor)
# All agents report back to supervisor
supervisor_graph.add_edge("researcher", "supervisor")
supervisor_graph.add_edge("writer", "supervisor")
supervisor_graph.add_edge("reviewer", "supervisor")

supervisor_app = supervisor_graph.compile(checkpointer=MemorySaver())

result = supervisor_app.invoke(
    {"task": "Write a short article about LangGraph", "messages": [], "next": ""},
    config={"configurable": {"thread_id": "supervisor_1"}}
)
for msg in result["messages"]:
    print(msg.content[:100])

# ── 8. SUBGRAPHS ─────────────────────────────────────────────
# A compiled graph can be used as a node in a parent graph
sub_graph = StateGraph(AgentState)
sub_graph.add_node("sub_node", call_model)
sub_graph.set_entry_point("sub_node")
sub_graph.add_edge("sub_node", END)
compiled_sub = sub_graph.compile()

parent_graph = StateGraph(AgentState)
parent_graph.add_node("preprocessing", lambda s: s)  # pass-through
parent_graph.add_node("sub_agent", compiled_sub)    # subgraph as node
parent_graph.set_entry_point("preprocessing")
parent_graph.add_edge("preprocessing", "sub_agent")
parent_graph.add_edge("sub_agent", END)
parent_app = parent_graph.compile()

# ── 9. VISUALIZE THE GRAPH ───────────────────────────────────
# In Jupyter notebook:
from IPython.display import Image, display
try:
    display(Image(app.get_graph().draw_mermaid_png()))
except Exception:
    pass

# As text (works everywhere)
print(app.get_graph().draw_mermaid())
# Output: Mermaid diagram syntax you can paste at mermaid.live

# ── 10. ASYNC INVOCATION ─────────────────────────────────────
import asyncio

async def run_agent_async():
    result = await app_with_memory.ainvoke(
        {"messages": [HumanMessage(content="Search for Python tips")]},
        config={"configurable": {"thread_id": "async_session"}}
    )
    return result["messages"][-1].content

# asyncio.run(run_agent_async())  # Use in async context
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Where Used</th><th>Default</th><th>Effect</th></tr>
<tr><td><code>interrupt_before</code></td><td><code>graph.compile()</code></td><td><code>[]</code></td><td>List of nodes to pause BEFORE executing</td></tr>
<tr><td><code>interrupt_after</code></td><td><code>graph.compile()</code></td><td><code>[]</code></td><td>List of nodes to pause AFTER executing</td></tr>
<tr><td><code>checkpointer</code></td><td><code>graph.compile()</code></td><td><code>None</code></td><td>Enables state persistence; required for memory</td></tr>
<tr><td><code>thread_id</code></td><td><code>config</code> dict</td><td>required</td><td>Identifies conversation; same ID = same session</td></tr>
<tr><td><code>stream_mode</code></td><td><code>.stream()</code></td><td><code>"updates"</code></td><td><code>"values"</code> = full state, <code>"updates"</code> = node deltas</td></tr>
<tr><td><code>operator.add</code></td><td><code>Annotated</code></td><td>replaces</td><td>Makes list fields append-only instead of replace</td></tr>
<tr><td><code>max_iterations</code></td><td>N/A</td><td>graph loops</td><td>Control via conditional edge returning END</td></tr>
<tr><td><code>recursion_limit</code></td><td><code>config</code></td><td><code>25</code></td><td>Max graph steps before <code>GraphRecursionError</code></td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What problem does LangGraph solve that AgentExecutor doesn't?**

`AgentExecutor` is a black box — no control over branching, no checkpointing, no human-in-the-loop, no multi-agent coordination. LangGraph models agents as explicit directed graphs, giving full control over state, transitions, loops, interrupts, and persistence. It's the difference between a pipeline and a programmable workflow engine.

**Q2: What is `Annotated[list, operator.add]` in state and why is it needed?**

By default, returning `{"messages": [...]}` from a node replaces the entire list. `Annotated[list, operator.add]` tells LangGraph to use `operator.add` as the reducer — new messages are appended to the existing list, preserving conversation history. Without this, every node would wipe the message history.

**Q3: How does checkpointing enable multi-turn conversations?**

Each `compile(checkpointer=...)` call wraps the graph with state persistence. When you call `invoke` with a `thread_id`, LangGraph loads the previous state from the checkpointer, appends new messages, runs the graph, and saves the updated state. Same `thread_id` = same conversation context across invocations.

**Q4: How does `interrupt_before` work for human-in-the-loop?**

The graph pauses before executing the specified node and saves state to the checkpointer. The app returns control to the caller. The human inspects `app.get_state(config)`, optionally calls `app.update_state()` to modify state, then calls `app.stream(None, config)` to resume from the saved checkpoint.

**Q5: What is the supervisor pattern in multi-agent systems?**

A supervisor agent (LLM) reads the conversation and decides which specialized agent (researcher, writer, reviewer) to call next. Each worker executes its task and reports back to the supervisor. The supervisor routes again until it decides the task is complete (`FINISH`). This creates flexible, LLM-directed multi-agent pipelines.

**Q6: What is a subgraph and when would you use one?**

A compiled LangGraph can be used as a node inside a parent graph. This enables modular, reusable agent components — e.g., a "research" subgraph that is a full agent with its own state, nodes, and loops, used as a single step in a larger orchestration graph.

**Q7: What is the difference between `stream_mode="values"` and `"updates"`?**

`"values"` emits the complete state after each node — useful for monitoring full conversation state. `"updates"` emits only what changed (the dict returned by each node) — more efficient for large states. Use `"values"` for debugging, `"updates"` for production streaming UIs.

**Q8: How do you handle infinite loops in LangGraph?**

Set `config={"recursion_limit": 10}` to cap the number of steps. Design conditional edges so the agent can always reach `END` — e.g., an iteration counter in state that routes to END after N cycles. Always test that every path through the graph eventually terminates.

## ⚠️ Common Mistakes

- **Forgetting `operator.add` on message lists** — state returns replace the list; without the reducer, each node wipes conversation history
- **Not setting `thread_id` in config** — without a thread_id, checkpointing doesn't work and you get a `MissingConfigError`
- **Infinite loops** — conditional edge never returns END; always add an iteration counter or recursion_limit guard
- **Modifying state in place** — never mutate `state` directly; always return a new dict with updated values
- **Compiling without checkpointer for HITL** — `interrupt_before` requires a checkpointer; without it, there's nowhere to save state for resumption
- **Using AgentExecutor when you need loops** — AgentExecutor has no graph control; switch to LangGraph when you need branching, retries, or multi-agent routing
- **Ignoring `state.next`** — after an interrupt, check `app.get_state(config).next` to confirm where the graph is paused before resuming

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Use This</th></tr>
<tr><td>Simple linear chain</td><td>LangChain LCEL, not LangGraph</td></tr>
<tr><td>Agent with tools + loops</td><td><code>StateGraph</code> + <code>ToolNode</code> + conditional edges</td></tr>
<tr><td>Multi-turn conversation memory</td><td><code>compile(checkpointer=MemorySaver())</code> + <code>thread_id</code></td></tr>
<tr><td>Human approval before tool execution</td><td><code>compile(interrupt_before=["use_tools"])</code></td></tr>
<tr><td>Multiple specialized agents</td><td>Supervisor pattern with routing conditional edge</td></tr>
<tr><td>Reusable agent as a step</td><td>Compiled subgraph as a node</td></tr>
<tr><td>Streaming agent output to UI</td><td><code>app.stream(..., stream_mode="values")</code></td></tr>
<tr><td>Long-running production agent</td><td><code>SqliteSaver</code> checkpointer + async invocation</td></tr>
<tr><td>Debug graph structure</td><td><code>app.get_graph().draw_mermaid()</code></td></tr>
<tr><td>Cap runaway agent loops</td><td><code>config={"recursion_limit": 10}</code></td></tr>
</table>

## 📋 Completion Checklist

- Define a `TypedDict` state with `Annotated[list, operator.add]` for message fields
- Build a ReAct agent: `call_model` node + `ToolNode` + `should_continue` conditional edge
- Compile with `MemorySaver()` and use `thread_id` for multi-turn conversations
- Implement `interrupt_before` for human-in-the-loop and resume with `stream(None, config)`
- Build a supervisor multi-agent system with routing between specialized agent nodes
- Use `app.get_graph().draw_mermaid()` to visualize the graph structure
- Handle edge cases: recursion limit, no tool calls path always reaching END
- Stream agent output with `stream_mode="values"` and handle each event in a UI
