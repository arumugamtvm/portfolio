---
title: Week 20 — MCP Server (Model Context Protocol)
description: MCP is Anthropic's open standard — "USB-C for AI" — that lets any AI model connect to any tool or data source. Build a Python MCP server with FastMCP decorators and plug it into Claude Desktop.
---

> 🎯 **TL;DR** — MCP (Model Context Protocol) is Anthropic's open standard — "USB-C for AI." It lets any AI model connect to any tool or data source through a unified protocol. Build a Python MCP server with `@mcp.tool()`, `@mcp.resource()`, `@mcp.prompt()` decorators using `FastMCP`, configure it in Claude Desktop's JSON config, and your tools become available to Claude instantly. MCP separates tool logic into a reusable, independently deployable server.

## 🧠 Mental Model

MCP is like **electrical outlets**. Before standardization, every device had a different plug (OpenAI function calling format, Anthropic tool_use, Google extensions — all different). MCP is the universal outlet standard. Your MCP Server is the wall socket (exposes tools/data), the AI model is the appliance (consumes them), and the MCP Client is the plug that bridges them. Now you build your tools once and any MCP-compatible AI can use them.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>Description</th><th>Python Decorator</th></tr>
<tr><td>MCP Server</td><td>The server that exposes tools, resources, prompts</td><td><code>FastMCP("name")</code></td></tr>
<tr><td>MCP Client</td><td>The AI/app that connects to and calls the server</td><td><code>ClientSession</code></td></tr>
<tr><td>Tool</td><td>A function the AI can call (like function calling)</td><td><code>@mcp.tool()</code></td></tr>
<tr><td>Resource</td><td>Data the AI can read (files, DB, APIs)</td><td><code>@mcp.resource("uri://path")</code></td></tr>
<tr><td>Prompt</td><td>Reusable prompt templates with arguments</td><td><code>@mcp.prompt()</code></td></tr>
<tr><td>stdio transport</td><td>Local process communication (Claude Desktop)</td><td><code>mcp.run(transport="stdio")</code></td></tr>
<tr><td>SSE transport</td><td>HTTP server for remote access</td><td><code>mcp.run(transport="sse", port=8080)</code></td></tr>
<tr><td>Tool Schema</td><td>JSON Schema describing tool inputs</td><td>Auto-generated from Python type hints</td></tr>
<tr><td>Resource URI</td><td>Identifier for a resource (<code>file://</code>, <code>db://</code>)</td><td>String URI passed to <code>@mcp.resource("uri")</code></td></tr>
<tr><td>Initialization</td><td>Client-server handshake to discover capabilities</td><td><code>await session.initialize()</code></td></tr>
</table>

## 🔢 Key Steps / Process

1. **Install SDK** — `pip install mcp` (Python) or `npm install @modelcontextprotocol/sdk`
2. **Create server** — `mcp = FastMCP("my-tools-server")`
3. **Define tools** — decorate Python functions with `@mcp.tool()` — type hints become schema
4. **Define resources** — decorate data-returning functions with `@mcp.resource("uri://path")`
5. **Define prompts** — decorate prompt factories with `@mcp.prompt()`
6. **Choose transport** — `stdio` for Claude Desktop; `sse` for HTTP remote access
7. **Run the server** — `mcp.run(transport="stdio")` or `mcp.run(transport="sse", port=8080)`
8. **Configure Claude Desktop** — edit `claude_desktop_config.json` to add your server
9. **Test with MCP Client** — write a test client using `ClientSession` to verify tools work
10. **Build real tools** — wrap real APIs, databases, file systems, and business logic

## 💻 Code Cheatsheet

```python
# ============================================================
# MCP SERVER COMPLETE CHEATSHEET — Production-ready patterns
# pip install mcp fastmcp httpx sqlalchemy python-dotenv
# ============================================================

# ── 1. FASTMCP SERVER (Recommended API) ──────────────────────
from mcp.server.fastmcp import FastMCP
import json, os, sqlite3
from pathlib import Path
from datetime import datetime
import httpx

# Create the MCP server with a descriptive name
mcp = FastMCP("Research Tools Server")

# ── 2. TOOLS — Functions the AI can call ─────────────────────
@mcp.tool()
def get_weather(city: str, unit: str = "celsius") -> str:
    """Get current weather conditions for any city.
    
    Args:
        city: Name of the city (e.g., 'Chennai', 'London')
        unit: Temperature unit — 'celsius' or 'fahrenheit'
    
    Returns:
        Weather description with temperature and conditions
    """
    # In production: call a real weather API like OpenWeatherMap
    temp = 28 if unit == "celsius" else 82
    return f"Weather in {city}: {temp}°{'C' if unit == 'celsius' else 'F'}, Partly cloudy, Humidity: 72%"

@mcp.tool()
def search_database(query: str, table: str = "products", limit: int = 10) -> str:
    """Search the company SQLite database for records.
    
    Args:
        query: Search text to match against records
        table: Database table to search (products, customers, orders)
        limit: Maximum number of results to return (1-50)
    
    Returns:
        JSON string of matching records
    """
    limit = min(max(1, limit), 50)  # Clamp between 1 and 50
    db_path = os.getenv("DATABASE_PATH", "./company.db")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # Safe parameterized query — no SQL injection
        cursor.execute(
            f"SELECT * FROM {table} WHERE name LIKE ? LIMIT ?",
            (f"%{query}%", limit)
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        conn.close()
        results = [dict(zip(columns, row)) for row in rows]
        return json.dumps(results, indent=2, default=str)
    except sqlite3.Error as e:
        return json.dumps({"error": str(e)})

@mcp.tool()
def read_local_file(file_path: str) -> str:
    """Read contents of a local file (text files only, max 10KB).
    
    Args:
        file_path: Absolute or relative path to the file
    
    Returns:
        File contents as string, or error message
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"Error: File not found — {file_path}"
        if path.stat().st_size > 10_000:
            return f"Error: File too large ({path.stat().st_size} bytes). Max 10KB."
        if path.suffix not in [".txt", ".md", ".py", ".json", ".csv", ".yaml", ".yml"]:
            return f"Error: Unsupported file type {path.suffix}. Text files only."
        return path.read_text(encoding="utf-8")
    except Exception as e:
        return f"Error reading file: {e}"

@mcp.tool()
def list_directory(directory: str = ".") -> str:
    """List files and subdirectories in a directory.
    
    Args:
        directory: Path to directory (default: current directory)
    
    Returns:
        JSON list of files with name, type, and size
    """
    try:
        path = Path(directory)
        if not path.is_dir():
            return f"Error: {directory} is not a directory"
        
        items = []
        for item in sorted(path.iterdir()):
            items.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size_bytes": item.stat().st_size if item.is_file() else None,
                "modified": datetime.fromtimestamp(item.stat().st_mtime).isoformat()
            })
        return json.dumps(items, indent=2)
    except Exception as e:
        return f"Error: {e}"

@mcp.tool()
async def fetch_url(url: str, method: str = "GET") -> str:
    """Fetch content from a URL (HTTP GET or POST).
    
    Args:
        url: The URL to fetch (must start with https://)
        method: HTTP method — GET or POST
    
    Returns:
        Response body as text (first 5000 chars)
    """
    if not url.startswith("https://"):
        return "Error: Only HTTPS URLs allowed for security"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url) if method == "GET" else await client.post(url)
            response.raise_for_status()
            return response.text[:5000]
    except httpx.TimeoutException:
        return "Error: Request timed out after 10 seconds"
    except httpx.HTTPStatusError as e:
        return f"Error: HTTP {e.response.status_code}"
    except Exception as e:
        return f"Error: {e}"

# ── 3. RESOURCES — Data the AI can read ──────────────────────
@mcp.resource("config://settings")
def get_app_settings() -> str:
    """Application configuration and settings."""
    settings = {
        "app_name": "Research Tools Server",
        "version": "1.0.0",
        "environment": os.getenv("APP_ENV", "development"),
        "database": os.getenv("DATABASE_PATH", "./company.db"),
        "max_results": 50,
        "supported_file_types": [".txt", ".md", ".py", ".json", ".csv"]
    }
    return json.dumps(settings, indent=2)

@mcp.resource("file://knowledge-base/{topic}")
def get_knowledge_base_article(topic: str) -> str:
    """Read an article from the knowledge base by topic name."""
    kb_path = Path(f"./knowledge_base/{topic}.txt")
    if kb_path.exists():
        return kb_path.read_text(encoding="utf-8")
    return f"No knowledge base article found for topic: {topic}"

@mcp.resource("db://customers/schema")
def get_customers_schema() -> str:
    """Database schema for the customers table."""
    return json.dumps({
        "table": "customers",
        "columns": [
            {"name": "id", "type": "INTEGER", "primary_key": True},
            {"name": "name", "type": "TEXT", "nullable": False},
            {"name": "email", "type": "TEXT", "unique": True},
            {"name": "created_at", "type": "TIMESTAMP"},
            {"name": "plan", "type": "TEXT", "values": ["free", "pro", "enterprise"]}
        ]
    }, indent=2)

# ── 4. PROMPTS — Reusable prompt templates ───────────────────
@mcp.prompt()
def code_review_prompt(language: str, code: str) -> str:
    """Generate a structured code review prompt."""
    return f"""You are an expert {language} developer. Review the following code for:
1. Correctness and bugs
2. Security vulnerabilities (SQL injection, XSS, etc.)
3. Performance issues
4. Code style and readability
5. Missing error handling

Code to review:
{code}

Provide specific line-by-line feedback with severity (Critical/Warning/Suggestion)."""

@mcp.prompt()
def data_analysis_prompt(dataset_description: str, goal: str) -> str:
    """Generate a data analysis prompt."""
    return f"""You are a data scientist. Analyze the following dataset:

Dataset: {dataset_description}
Goal: {goal}

Provide:
1. Data quality assessment
2. Key statistical insights
3. Recommended visualizations
4. Actionable conclusions
5. Python code using pandas/matplotlib to implement the analysis"""

# ── 5. RUN THE SERVER ─────────────────────────────────────────
if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    
    if transport == "sse":
        # Remote HTTP server mode
        port = int(os.getenv("MCP_PORT", "8080"))
        print(f"Starting MCP server via HTTP/SSE on port {port}")
        mcp.run(transport="sse", port=port)
    else:
        # Local stdio mode (for Claude Desktop)
        mcp.run(transport="stdio")


# ── 6. LOW-LEVEL MCP SERVER (Full control) ───────────────────
from mcp.server import Server
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types
import asyncio

low_level_app = Server("low-level-server")

@low_level_app.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Enumerate all tools this server exposes."""
    return [
        types.Tool(
            name="get_weather",
            description="Get weather for a city",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                },
                "required": ["city"]
            }
        )
    ]

@low_level_app.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """Dispatch tool calls to the appropriate handler."""
    if name == "get_weather":
        city = arguments["city"]
        unit = arguments.get("unit", "celsius")
        return [types.TextContent(type="text", text=f"Weather in {city}: 25°C, Sunny")]
    raise ValueError(f"Unknown tool: {name}")

async def run_low_level_server():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await low_level_app.run(
            read_stream, write_stream,
            InitializationOptions(
                server_name="low-level-server",
                server_version="1.0.0",
                capabilities=low_level_app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities={}
                )
            )
        )


# ── 7. MCP CLIENT — Test your server ─────────────────────────
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_mcp_server():
    """Test client to verify your MCP server works correctly."""
    server_params = StdioServerParameters(
        command="python",
        args=["my_mcp_server.py"],
        env={"DATABASE_PATH": "./test.db"}
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Handshake
            await session.initialize()
            print("Connected to MCP server")
            
            # Discover tools
            tools = await session.list_tools()
            print(f"\nAvailable tools ({len(tools.tools)}):")
            for tool in tools.tools:
                print(f"  {tool.name}: {tool.description}")
            
            # Call a tool
            result = await session.call_tool("get_weather", {"city": "Chennai", "unit": "celsius"})
            print(f"\nWeather result: {result.content[0].text}")
            
            # List resources
            resources = await session.list_resources()
            print(f"\nAvailable resources ({len(resources.resources)}):")
            for res in resources.resources:
                print(f"  {res.uri}: {res.name}")
            
            # Read a resource
            content = await session.read_resource("config://settings")
            print(f"\nSettings: {content.contents[0].text[:200]}")
            
            # List prompts
            prompts = await session.list_prompts()
            print(f"\nAvailable prompts: {[p.name for p in prompts.prompts]}")

# asyncio.run(test_mcp_server())


# ── 8. CLAUDE DESKTOP CONFIG ─────────────────────────────────
# File: ~/Library/Application Support/Claude/claude_desktop_config.json
# {
#   "mcpServers": {
#     "research-tools": {
#       "command": "python",
#       "args": ["/absolute/path/to/my_mcp_server.py"],
#       "env": {
#         "DATABASE_PATH": "/Users/me/data/company.db",
#         "APP_ENV": "production"
#       }
#     },
#     "filesystem": {
#       "command": "npx",
#       "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
#     },
#     "github": {
#       "command": "npx",
#       "args": ["-y", "@modelcontextprotocol/server-github"],
#       "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"}
#     },
#     "sqlite": {
#       "command": "uvx",
#       "args": ["mcp-server-sqlite", "--db-path", "/Users/me/data/app.db"]
#     }
#   }
# }
# Restart Claude Desktop after editing this file!


# ── 9. USE MCP TOOLS VIA ANTHROPIC API ───────────────────────
import anthropic

client = anthropic.Anthropic()

# Define tools manually (same schema as your MCP server)
tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["city"]
        }
    }
]

messages = [{"role": "user", "content": "What's the weather in Chennai?"}]

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=messages
)

# Handle tool use response
if response.stop_reason == "tool_use":
    tool_call = next(b for b in response.content if b.type == "tool_use")
    print(f"Claude wants to call: {tool_call.name}({tool_call.input})")
    
    # Execute the tool
    tool_result = get_weather(**tool_call.input)
    
    # Send result back to Claude
    messages.extend([
        {"role": "assistant", "content": response.content},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_call.id, "content": tool_result}]}
    ])
    
    final = client.messages.create(model="claude-3-5-sonnet-20241022", max_tokens=1024, tools=tools, messages=messages)
    print(final.content[0].text)
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Where</th><th>Description</th></tr>
<tr><td>Server name</td><td><code>FastMCP("name")</code></td><td>Identifies the server in Claude Desktop</td></tr>
<tr><td><code>transport</code></td><td><code>mcp.run(transport=...)</code></td><td><code>"stdio"</code> for local, <code>"sse"</code> for HTTP remote</td></tr>
<tr><td><code>port</code></td><td><code>mcp.run(port=8080)</code></td><td>HTTP port for SSE transport</td></tr>
<tr><td>Tool <code>description</code></td><td>Docstring</td><td>Critical — LLM uses this to decide when to call the tool</td></tr>
<tr><td>Type hints</td><td>Function params</td><td>Auto-generate JSON Schema for tool inputs</td></tr>
<tr><td>Resource URI</td><td><code>@mcp.resource("uri://path")</code></td><td>URI scheme (file://, db://, config://, custom://)</td></tr>
<tr><td><code>command</code></td><td>claude_desktop_config.json</td><td>Path to the interpreter (<code>python</code>, <code>node</code>, <code>npx</code>)</td></tr>
<tr><td><code>args</code></td><td>claude_desktop_config.json</td><td>Arguments to the command</td></tr>
<tr><td><code>env</code></td><td>claude_desktop_config.json</td><td>Environment variables (API keys, DB paths)</td></tr>
<tr><td><code>input_schema</code></td><td>Anthropic API tools</td><td>JSON Schema — must match MCP server tool schema</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What is MCP and why is it better than function calling?**

MCP (Model Context Protocol) is Anthropic's open standard for connecting AI models to tools. Unlike provider-specific function calling (each provider has different formats), MCP is a universal protocol — build your tools once in an MCP server and any MCP-compatible AI can use them. MCP also adds Resources (read-only data) and Prompts (templates) beyond just function calling.

**Q2: What are the three MCP primitives and when do you use each?**

Tools — callable functions (like REST POST endpoints); use when the AI needs to do something (search, calculate, save). Resources — readable data sources (like REST GET endpoints); use when the AI needs to read context (files, DB records, settings). Prompts — parameterized prompt templates; use to standardize common AI workflows that get reused across sessions.

**Q3: What is the difference between stdio and SSE transport?**

`stdio` communicates via stdin/stdout — used for local tools running as a subprocess (e.g., Claude Desktop spawning your Python server). `SSE` (Server-Sent Events over HTTP) runs your server as an HTTP service that remote clients connect to — used for shared team tools or cloud-deployed MCP servers. SSE enables one server to serve multiple clients simultaneously.

**Q4: How does Claude Desktop discover MCP tools?**

Claude Desktop reads `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) on startup. Each entry in `mcpServers` defines a command to spawn. Claude Desktop spawns the process via stdio and calls `initialize()` to discover the server's capabilities. After restart, all tools, resources, and prompts appear in Claude's interface automatically.

**Q5: How do you write good tool descriptions for MCP?**

The description is used by the LLM to decide when to call the tool — write it like documentation for a fellow developer. Be explicit: what it does, when to use it vs other tools, what the inputs mean, and what the output format is. Bad: "Search database." Good: "Search company product database by name. Use before web_search for internal product questions. Returns JSON array of matching records with id, name, price, stock fields."

**Q6: How do you secure an MCP server?**

For stdio: the server only runs locally, trust is at OS level. For SSE: add authentication (API key in headers or OAuth), validate all inputs (parameterized queries, path traversal prevention), restrict resource URIs to whitelisted paths, add rate limiting, and log all tool calls. Never expose raw file system or database write operations without explicit human approval steps.

**Q7: How do FastMCP and the low-level MCP Server differ?**

`FastMCP` is a high-level wrapper that auto-generates tool schemas from Python type hints and docstrings — faster to build, less boilerplate. The low-level `Server` class gives full control over the protocol — manually define schemas, handle streaming, custom initialization. Start with FastMCP, drop to low-level when you need custom behavior.

**Q8: Can you use MCP tools with the Anthropic API programmatically (not just Claude Desktop)?**

Yes — define the same JSON Schema in the `tools` list of `client.messages.create()`. The API returns `tool_use` blocks when Claude wants to call a tool; you execute the function and return a `tool_result` message. This is the standard function-calling loop — MCP just standardizes how the tool server is built and discovered, but the API protocol is the same.

## ⚠️ Common Mistakes

- **Vague tool descriptions** — "do stuff with data" won't help Claude decide when to call the tool; write explicit, detailed docstrings that explain use case and output format
- **Missing error handling in tools** — unhandled exceptions crash the MCP server; wrap all tool logic in `try/except` and return structured error strings
- **Forgetting to restart Claude Desktop** — config changes only take effect after a full restart; check the MCP server icon in Claude Desktop to confirm connection
- **Using relative paths in claude_desktop_config.json** — Claude Desktop's working directory is unpredictable; always use absolute paths for `command` and `args`
- **SQL injection in database tools** — always use parameterized queries (`?` placeholders), never string interpolation with user input
- **Allowing path traversal in file tools** — validate that file paths are within an allowed directory; never allow `../` traversal to access system files
- **Not testing with MCP client first** — build a test client using `ClientSession` to verify tool schemas and outputs before connecting to Claude Desktop

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Use This</th></tr>
<tr><td>Tool the AI should call (action)</td><td><code>@mcp.tool()</code> with explicit description</td></tr>
<tr><td>Data the AI should read (context)</td><td><code>@mcp.resource("uri://path")</code></td></tr>
<tr><td>Reusable prompt pattern</td><td><code>@mcp.prompt()</code></td></tr>
<tr><td>Local tools for Claude Desktop</td><td><code>mcp.run(transport="stdio")</code></td></tr>
<tr><td>Shared team tools / cloud</td><td><code>mcp.run(transport="sse", port=8080)</code></td></tr>
<tr><td>Rapid development</td><td><code>FastMCP</code> high-level API</td></tr>
<tr><td>Custom protocol behavior</td><td>Low-level <code>Server</code> class</td></tr>
<tr><td>Database access</td><td>Parameterized queries in tool, schema as resource</td></tr>
<tr><td>File system access</td><td><code>read_local_file</code> tool with path validation</td></tr>
<tr><td>External API wrapper</td><td>Async <code>fetch_url</code> tool with HTTPS-only validation</td></tr>
</table>

## 📋 Completion Checklist

- Explain MCP vs function calling: open standard, reusability, three primitives (Tools/Resources/Prompts)
- Build a `FastMCP` server with at least 3 tools using type hints and docstrings
- Add a resource with `@mcp.resource("uri://path")` and a prompt with `@mcp.prompt()`
- Run the server with `mcp.run(transport="stdio")` and verify it starts without errors
- Write an MCP test client using `ClientSession` to list tools and call each one
- Configure the server in `claude_desktop_config.json` and verify it appears in Claude Desktop
- Implement input validation and error handling in every tool function
- Understand the full tool-use loop with the Anthropic API: tool_use → execute → tool_result → final response
