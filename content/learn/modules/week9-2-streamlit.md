---
title: Week 9.2 — Web Development for AI: Quick Start (Streamlit)
description: Streamlit turns a Python script into a shareable web app in minutes. Add widgets, cache data and models, manage state, and deploy free on Streamlit Cloud with no HTML, CSS, or JavaScript.
---

> 🎯 **TL;DR** — Streamlit turns a Python script into a shareable web app in minutes. Add widgets, display data/charts, cache expensive calls with `@st.cache_data`, manage state with `st.session_state`, load ML models with `@st.cache_resource`, and deploy free on Streamlit Cloud. No HTML/CSS/JS required.

## 🧠 Mental Model

Think of Streamlit like **a live Jupyter notebook that anyone can use in a browser**. Every time a user interacts with a widget (slider, button, text input), the entire script re-runs top to bottom — Streamlit only redraws what changed. `session_state` is your sticky notepad across re-runs; `@st.cache_data` is your memoizer so you don't reload CSVs on every interaction.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>Function / Decorator</th><th>Purpose</th></tr>
<tr><td>Display text</td><td><code>st.title / st.header / st.write / st.markdown</code></td><td>Render headings and text</td></tr>
<tr><td>Show data</td><td><code>st.dataframe / st.table / st.json</code></td><td>Render tabular or structured data</td></tr>
<tr><td>Charts</td><td><code>st.line_chart / st.bar_chart / st.plotly_chart</code></td><td>Visualize data</td></tr>
<tr><td>Input widgets</td><td><code>st.text_input / st.number_input / st.selectbox / st.slider / st.button / st.file_uploader</code></td><td>Collect user input</td></tr>
<tr><td>Sidebar</td><td><code>st.sidebar.*</code></td><td>Navigation / config panel</td></tr>
<tr><td>State</td><td><code>st.session_state</code></td><td>Persist values across re-runs</td></tr>
<tr><td>Cache data</td><td><code>@st.cache_data</code></td><td>Cache serializable return values (DataFrames, dicts)</td></tr>
<tr><td>Cache model</td><td><code>@st.cache_resource</code></td><td>Cache non-serializable objects (ML models, DB connections)</td></tr>
<tr><td>Layout</td><td><code>st.columns / st.tabs / st.expander</code></td><td>Multi-column and tabbed layouts</td></tr>
<tr><td>Alerts</td><td><code>st.success / st.error / st.warning / st.info</code></td><td>Feedback messages</td></tr>
<tr><td>Media</td><td><code>st.image / st.video / st.audio</code></td><td>Embed media</td></tr>
<tr><td>Progress</td><td><code>st.spinner / st.progress</code></td><td>Loading indicators</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Install** — `pip install streamlit` and create `app.py`
2. **Add display elements** — `st.title`, `st.write`, `st.markdown`
3. **Add input widgets** — `st.text_input`, `st.selectbox`, `st.slider`, `st.button`
4. **Display outputs** — `st.dataframe`, `st.line_chart`, `st.plotly_chart`
5. **Cache expensive operations** — decorate data loaders with `@st.cache_data`, model loaders with `@st.cache_resource`
6. **Manage state** — use `st.session_state` for counters, history, or multi-step flows
7. **Structure with layout** — use `st.sidebar`, `st.columns`, `st.tabs`
8. **Connect to APIs** — call OpenAI / HuggingFace inside widget callbacks
9. **Build multi-page app** — create `pages/` folder with numbered Python files
10. **Deploy** — push to GitHub → connect at [share.streamlit.io](http://share.streamlit.io) → click Deploy

---

## 💻 Code Cheatsheet

```python
# ============================================================
# STREAMLIT COMPLETE CHEATSHEET — runnable app skeleton
# Run: streamlit run app.py
# ============================================================

import streamlit as st
import pandas as pd
import numpy as np
import pickle
import requests
from pathlib import Path

# ----------------------------------------------------------
# PAGE CONFIG (must be first Streamlit call)
# ----------------------------------------------------------
st.set_page_config(
    page_title="AI Dashboard",
    page_icon="🤖",
    layout="wide",          # "centered" or "wide"
    initial_sidebar_state="expanded"
)

# ----------------------------------------------------------
# 1. DISPLAY ELEMENTS
# ----------------------------------------------------------
st.title("🤖 AI Dashboard")
st.header("Section Header")
st.subheader("Sub-section")
st.write("Renders text, DataFrames, dicts, lists — smart auto-display")
st.markdown("**Bold**, *italic*, `code`, [link](https://streamlit.io)")
st.code("import streamlit as st", language="python")
st.latex(r"E = mc^2")

# ----------------------------------------------------------
# 2. INPUT WIDGETS
# ----------------------------------------------------------
with st.sidebar:
    st.header("⚙️ Configuration")
    model_choice = st.selectbox("Choose model", ["Logistic Regression", "Random Forest", "XGBoost"])
    threshold = st.slider("Decision threshold", 0.0, 1.0, 0.5, step=0.05)
    debug_mode = st.checkbox("Enable debug mode", value=False)
    st.divider()

name       = st.text_input("Your name", placeholder="e.g. Alice")
age        = st.number_input("Age", min_value=0, max_value=120, value=25)
uploaded   = st.file_uploader("Upload CSV", type=["csv"])
text_block = st.text_area("Paste text for NLP", height=150)
col1, col2 = st.columns(2)
with col1:
    feature_1 = st.number_input("Feature 1", value=0.0)
with col2:
    feature_2 = st.number_input("Feature 2", value=0.0)

# ----------------------------------------------------------
# 3. CACHING — data and models
# ----------------------------------------------------------
@st.cache_data                          # cache serializable: DataFrames, lists, dicts
def load_data(path: str) -> pd.DataFrame:
    """Runs once; subsequent calls return cached DataFrame instantly."""
    return pd.read_csv(path)

@st.cache_resource                      # cache non-serializable: ML models, DB connections
def load_model(model_path: str):
    """Load sklearn/PyTorch/ONNX model — loaded once, shared across sessions."""
    with open(model_path, "rb") as f:
        return pickle.load(f)

# Only load if file exists (so demo runs without files)
df = load_data("data.csv") if Path("data.csv").exists() else pd.DataFrame(
    {"feature_1": np.random.randn(100), "feature_2": np.random.randn(100), "label": np.random.randint(0,2,100)}
)

# ----------------------------------------------------------
# 4. DISPLAY DATA & CHARTS
# ----------------------------------------------------------
tab1, tab2, tab3 = st.tabs(["📊 Data", "📈 Charts", "🤖 Prediction"])

with tab1:
    st.subheader("Raw Data")
    st.dataframe(df, use_container_width=True)              # interactive, sortable
    st.metric("Total rows", len(df), delta="+10 vs last week")

with tab2:
    st.subheader("Feature Distribution")
    st.line_chart(df[["feature_1", "feature_2"]])           # quick chart
    # For custom plots:
    import plotly.express as px
    fig = px.scatter(df, x="feature_1", y="feature_2", color="label",
                     title="Feature Space", template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)

with tab3:
    # ----------------------------------------------------------
    # 5. ML PREDICTION WORKFLOW
    # ----------------------------------------------------------
    st.subheader("🔮 Real-time Prediction")
    
    if st.button("Run Prediction", type="primary"):
        with st.spinner("Running model..."):
            X = np.array([[feature_1, feature_2]])
            
            # Simulate prediction (replace with real model)
            prediction = int(np.random.randint(0, 2))
            confidence = float(np.random.uniform(0.5, 0.99))
            
            # Display results
            if prediction == 1:
                st.success(f"✅ Prediction: **Positive** (class 1)")
            else:
                st.warning(f"⚠️ Prediction: **Negative** (class 0)")
            
            st.info(f"Confidence: **{confidence:.1%}** | Threshold: **{threshold:.2f}**")
            st.progress(confidence)
            
            if debug_mode:
                st.json({"input": X.tolist(), "prediction": prediction, "confidence": confidence})

# ----------------------------------------------------------
# 6. SESSION STATE — persist values across re-runs
# ----------------------------------------------------------
if "history" not in st.session_state:
    st.session_state.history = []
if "click_count" not in st.session_state:
    st.session_state.click_count = 0

if st.button("Log Prediction to History"):
    st.session_state.history.append({"run": st.session_state.click_count, "score": np.random.rand()})
    st.session_state.click_count += 1

if st.session_state.history:
    st.subheader("📋 Prediction History")
    st.dataframe(pd.DataFrame(st.session_state.history))
    if st.button("Clear History"):
        st.session_state.history = []
        st.rerun()                              # force page refresh

# ----------------------------------------------------------
# 7. FILE UPLOAD HANDLING
# ----------------------------------------------------------
if uploaded is not None:
    uploaded_df = pd.read_csv(uploaded)
    st.success(f"Uploaded: {uploaded.name} — {uploaded_df.shape[0]} rows, {uploaded_df.shape[1]} cols")
    st.dataframe(uploaded_df.head(10))

# ----------------------------------------------------------
# 8. OPENAI API INTEGRATION
# ----------------------------------------------------------
def call_openai(prompt: str, api_key: str) -> str:
    """Call OpenAI Chat Completions API."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload  = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}]}
    response = requests.post("https://api.openai.com/v1/chat/completions",
                             headers=headers, json=payload, timeout=30)
    return response.json()["choices"][0]["message"]["content"]

# Use Streamlit secrets for API keys (secrets.toml in .streamlit/ folder)
# api_key = st.secrets["OPENAI_API_KEY"]
# response = call_openai("Summarize this text: " + text_block, api_key)

# ----------------------------------------------------------
# 9. MULTI-PAGE APP STRUCTURE
# ----------------------------------------------------------
# Create folder: pages/
#   pages/1_Home.py
#   pages/2_Predict.py
#   pages/3_About.py
# Each file is a standalone Streamlit app — Streamlit auto-creates the sidebar nav
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Where Used</th><th>Description</th><th>Default</th></tr>
<tr><td><code>page_title</code></td><td><code>st.set_page_config</code></td><td>Browser tab title</td><td>None</td></tr>
<tr><td><code>layout</code></td><td><code>st.set_page_config</code></td><td><code>"centered"</code> or <code>"wide"</code></td><td><code>"centered"</code></td></tr>
<tr><td><code>ttl</code></td><td><code>@st.cache_data(ttl=3600)</code></td><td>Cache time-to-live in seconds</td><td>None (forever)</td></tr>
<tr><td><code>max_entries</code></td><td><code>@st.cache_data(max_entries=10)</code></td><td>Max cached function calls</td><td>None</td></tr>
<tr><td><code>use_container_width</code></td><td><code>st.dataframe / st.plotly_chart</code></td><td>Expand to full column width</td><td><code>False</code></td></tr>
<tr><td><code>type="primary"</code></td><td><code>st.button</code></td><td>Highlighted button style</td><td><code>"secondary"</code></td></tr>
<tr><td><code>height</code></td><td><code>st.text_area</code></td><td>Widget height in pixels</td><td>Auto</td></tr>
<tr><td><code>min_value / max_value</code></td><td><code>st.slider / st.number_input</code></td><td>Widget bounds</td><td>None</td></tr>
<tr><td><code>step</code></td><td><code>st.slider / st.number_input</code></td><td>Increment step</td><td>1</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is Streamlit and why is it used for AI/ML?**

Streamlit is an open-source Python library that converts Python scripts into interactive web apps with zero front-end code. It's used for AI/ML because you can deploy a trained model as a live demo in minutes — no Flask/React knowledge needed.

**Q2: What is the difference between `@st.cache_data` and `@st.cache_resource`?**

`@st.cache_data` caches serializable return values (DataFrames, lists, dicts) — each session gets its own copy. `@st.cache_resource` caches non-serializable global objects (ML models, DB connections) and shares one instance across all sessions/users, saving memory.

**Q3: How does Streamlit handle state between interactions?**

By default Streamlit re-runs the entire script on each interaction, so local variables are reset. `st.session_state` is a persistent dictionary (per browser session) that survives re-runs. You initialize keys with `if "key" not in st.session_state:` to avoid overwriting on re-runs.

**Q4: How do you deploy a Streamlit app?**

Push code to a public (or private) GitHub repo → go to [share.streamlit.io](http://share.streamlit.io) → connect the repo → set the entry file → click Deploy. Streamlit Cloud auto-builds, hosts, and provides a public URL. For production, you can also deploy via Docker on AWS/GCP/Azure.

**Q5: How do you prevent an ML model from being loaded on every page refresh?**

Use `@st.cache_resource` on the load function. The model is loaded once at startup and the cached object is returned for all subsequent calls — including across users and sessions.

**Q6: What is the re-run model and how do you force a refresh?**

Every widget interaction triggers a full top-to-bottom script re-run. To force a refresh programmatically (e.g., after clearing state), call `st.rerun()`. To avoid expensive side-effects, wrap logic in `if st.button("Run"):` blocks.

**Q7: How do you build a multi-page Streamlit app?**

Create a `pages/` directory next to your main `app.py`. Each `.py` file inside `pages/` becomes a separate page — Streamlit auto-generates sidebar navigation. Files are sorted alphabetically, so prefix with numbers (`1_Home.py`, `2_Predict.py`).

**Q8: How do you securely pass API keys to a Streamlit app?**

Use `st.secrets` — create `.streamlit/secrets.toml` locally (gitignored) and add secrets in the Streamlit Cloud dashboard. Access with `st.secrets["MY_API_KEY"]`. Never hardcode secrets in the script.

---

## ⚠️ Common Mistakes

- **Not using `@st.cache_resource` for models** — the model reloads on every user interaction, causing massive latency; always cache model loading functions.
- **Mutating `st.session_state` values directly in conditionals** — initialize all keys at the top with `if "key" not in st.session_state:` to avoid `KeyError` and unintended resets.
- **Calling `st.set_page_config` after other Streamlit calls** — it must be the very first Streamlit command in the script, or it raises an error.
- **Not handling the `uploaded_file is None` case** — always check `if uploaded_file is not None:` before reading, or the app crashes on startup.
- **Using `st.write` for large DataFrames without limiting rows** — renders slowly; use `st.dataframe(df.head(100))` or add pagination.
- **Hardcoding API keys** — use `st.secrets` or environment variables; never commit keys to GitHub.
- **Ignoring the `use_container_width=True` flag** — charts and tables appear tiny in wide layout without it.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Tool</th><th>Why</th></tr>
<tr><td>Rapid ML demo / prototype</td><td>Streamlit</td><td>Fastest path from model to browser</td></tr>
<tr><td>Production REST API</td><td>FastAPI</td><td>Performance, type safety, OpenAPI docs</td></tr>
<tr><td>Shareable NLP / vision demo</td><td>Gradio on HuggingFace Spaces</td><td>Built-in model hub integration</td></tr>
<tr><td>Dashboard with auth / DB</td><td>Streamlit + secrets + SQLAlchemy</td><td>Session state + caching + DB connector</td></tr>
<tr><td>Display tabular data</td><td><code>st.dataframe</code></td><td>Interactive, sortable, filterable</td></tr>
<tr><td>Display static table</td><td><code>st.table</code></td><td>Non-interactive, cleaner look</td></tr>
<tr><td>Quick built-in chart</td><td><code>st.line_chart / st.bar_chart</code></td><td>One-liner, no Plotly needed</td></tr>
<tr><td>Custom interactive plot</td><td><code>st.plotly_chart(fig)</code></td><td>Full Plotly control</td></tr>
<tr><td>Expensive computation</td><td><code>@st.cache_data</code></td><td>Runs once, cached for all re-runs</td></tr>
<tr><td>Shared ML model</td><td><code>@st.cache_resource</code></td><td>One model instance for all users</td></tr>
</table>

---

## 📋 Completion Checklist

- Built and ran first Streamlit app with `streamlit run app.py`
- Used at least 4 different input widgets (text_input, selectbox, slider, button)
- Displayed a DataFrame and a chart (`st.dataframe`, `st.plotly_chart`)
- Implemented `@st.cache_data` for CSV loading and `@st.cache_resource` for model loading
- Used `st.session_state` to persist values across widget interactions
- Built sidebar navigation with `st.sidebar`
- Deployed a working app to Streamlit Cloud from a GitHub repo
- Connected app to an external API (OpenAI or HuggingFace) using `st.secrets`
