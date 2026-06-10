---
title: Week 21 — Vertex AI Agent Platform
description: How to use Google Cloud's Vertex AI platform to call Gemini models, deploy custom models to endpoints, build RAG apps with Agent Builder, and run ML pipelines.
---

> 🎯 **TL;DR** — Vertex AI is Google Cloud's managed ML platform. Use `vertexai.init(project, location)` to access **Gemini models**, deploy custom models to **Endpoints** with auto-scaling, orchestrate ML with **Pipelines**, build RAG with **Agent Builder**, and monitor everything via **Cloud Logging**. It's the enterprise path for deploying AI at scale with GCP IAM, VPC, and compliance built in.

## 🧠 Mental Model

Vertex AI is like a **fully-equipped AI factory floor**. The raw materials (data) come in from Cloud Storage. Workers (ML Pipelines) transform them into trained models. Quality control (evaluation) checks the models. Finished products (models) go to the shipping department (Endpoints) where they're packaged for delivery. The factory manager (Vertex AI Studio) can inspect and test everything via a UI. GCP IAM is the badge system — every worker needs the right role to access each area.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Service</th><th>Purpose</th><th>When to Use</th></tr>
<tr><td>Vertex AI Studio</td><td>UI to test prompts, tune models</td><td>Interactive exploration, no-code prompting</td></tr>
<tr><td>Gemini API on Vertex</td><td>Access Gemini models programmatically</td><td>Production LLM calls with GCP billing</td></tr>
<tr><td>Agent Builder</td><td>Build RAG apps and search agents</td><td>Enterprise search, document Q&amp;A</td></tr>
<tr><td>Model Garden</td><td>100+ open/closed source models</td><td>Find and deploy Llama, Claude, Mistral</td></tr>
<tr><td>Vertex AI Pipelines</td><td>Orchestrate ML training workflows</td><td>Automated MLOps, reproducible training</td></tr>
<tr><td>Endpoints</td><td>Serve models for online prediction</td><td>Real-time REST API inference</td></tr>
<tr><td>Batch Prediction</td><td>Offline bulk inference</td><td>Large-scale scoring without latency needs</td></tr>
<tr><td>Feature Store</td><td>Managed feature storage and serving</td><td>Consistent features across training/serving</td></tr>
<tr><td>Agent Engine</td><td>Deploy LangChain/LangGraph agents</td><td>Managed agent hosting on GCP</td></tr>
<tr><td>Cloud Logging</td><td>Monitor logs and metrics</td><td>Debugging, cost tracking, alerts</td></tr>
</table>

## 🔢 Key Steps / Process

1. **GCP Setup** — create project, enable Vertex AI API, set up billing account
2. **Authentication** — `gcloud auth application-default login` or service account key
3. **Install SDK** — `pip install google-cloud-aiplatform vertexai`
4. **Initialize** — `vertexai.init(project="my-project", location="us-central1")`
5. **Call Gemini** — `GenerativeModel("gemini-1.5-flash").generate_content("...")`
6. **Train/upload model** — `aiplatform.Model.upload(artifact_uri="gs://...")` or use Training Job
7. **Deploy endpoint** — `model.deploy(machine_type="n1-standard-4", min_replica_count=1)`
8. **Build RAG with Agent Builder** — create data store, ingest documents, query via API
9. **Set up Pipelines** — define KFP components, compile, submit pipeline run
10. **Monitor** — set up alerts in Cloud Monitoring, review logs in Cloud Logging

## 💻 Code Cheatsheet

```python
# ============================================================
# VERTEX AI COMPLETE CHEATSHEET — Production-ready patterns
# pip install google-cloud-aiplatform vertexai kfp google-cloud-storage
# gcloud auth application-default login
# ============================================================

import os
import vertexai
from vertexai.generative_models import (
    GenerativeModel, Part, Content, FunctionDeclaration, Tool,
    GenerationConfig, SafetySetting, HarmCategory, HarmBlockThreshold
)
from google.cloud import aiplatform
from google.cloud import storage

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "my-project-id")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# ── 1. INITIALIZE ─────────────────────────────────────────────
vertexai.init(project=PROJECT_ID, location=LOCATION)
aiplatform.init(project=PROJECT_ID, location=LOCATION)

# ── 2. GEMINI — TEXT GENERATION ──────────────────────────────
model = GenerativeModel(
    "gemini-1.5-flash",   # fast and cheap
    # "gemini-1.5-pro"    # most capable
    # "gemini-2.0-flash"  # latest
    system_instruction="You are a helpful AI assistant. Be concise and accurate."
)

# Basic generation
response = model.generate_content("Explain how RAG works in 3 sentences")
print(response.text)

# With generation config
config = GenerationConfig(
    temperature=0.2,          # determinism (0=greedy, 1=creative)
    top_p=0.8,                # nucleus sampling
    top_k=40,                 # top-k sampling
    max_output_tokens=1024,   # cap output length
    stop_sequences=["END"]    # stop at this token
)
response = model.generate_content(
    "Write a haiku about machine learning",
    generation_config=config
)
print(response.text)

# Safety settings
safety_settings = {
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}
response = model.generate_content(
    "Summarize this text: ...",
    safety_settings=safety_settings
)

# ── 3. MULTI-TURN CHAT ────────────────────────────────────────
chat = model.start_chat(history=[])

r1 = chat.send_message("I am building a recommendation system for e-commerce")
print(f"Response 1: {r1.text}")

r2 = chat.send_message("What algorithm should I start with for cold start?")
print(f"Response 2: {r2.text}")  # Has context from r1

r3 = chat.send_message("Show me Python code for collaborative filtering")
print(f"Response 3: {r3.text}")

# View full chat history
for msg in chat.history:
    print(f"[{msg.role}]: {str(msg.parts[0].text)[:100]}")

# ── 4. MULTIMODAL — IMAGE + TEXT ──────────────────────────────
# From Cloud Storage
image_part = Part.from_uri(
    uri="gs://my-bucket/charts/revenue_q4.png",
    mime_type="image/png"
)
response = model.generate_content([
    image_part,
    "Describe the trend shown in this chart and extract the key numbers"
])
print(response.text)

# From local bytes
with open("diagram.jpg", "rb") as f:
    image_data = f.read()

image_part = Part.from_data(data=image_data, mime_type="image/jpeg")
response = model.generate_content([image_part, "What is shown in this diagram?"])

# PDF document understanding
pdf_part = Part.from_uri(uri="gs://my-bucket/reports/annual_report.pdf", mime_type="application/pdf")
response = model.generate_content([pdf_part, "Summarize the key financial metrics"])
print(response.text)

# ── 5. FUNCTION CALLING ON VERTEX ────────────────────────────
get_weather_func = FunctionDeclaration(
    name="get_weather",
    description="Get the current weather for a specific city",
    parameters={
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "City name"},
            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
        },
        "required": ["city"]
    }
)

search_flights_func = FunctionDeclaration(
    name="search_flights",
    description="Search for available flights between two cities",
    parameters={
        "type": "object",
        "properties": {
            "origin": {"type": "string"},
            "destination": {"type": "string"},
            "date": {"type": "string", "description": "Date in YYYY-MM-DD format"}
        },
        "required": ["origin", "destination", "date"]
    }
)

tools = Tool(function_declarations=[get_weather_func, search_flights_func])
model_with_tools = GenerativeModel("gemini-1.5-flash", tools=[tools])

response = model_with_tools.generate_content(
    "Find flights from Mumbai to London on 2026-06-15"
)

# Check if model made a function call
for part in response.candidates[0].content.parts:
    if hasattr(part, "function_call") and part.function_call:
        fc = part.function_call
        print(f"Function: {fc.name}")
        print(f"Args: {dict(fc.args)}")
        
        # Execute the function
        # result = search_flights(**fc.args)
        result = {"flights": [{"airline": "Air India", "price": 450, "duration": "9h"}]}
        
        # Return result to model
        function_response = Part.from_function_response(
            name=fc.name,
            response={"content": result}
        )
        final_response = model_with_tools.generate_content([
            Content(role="user", parts=[Part.from_text("Find flights from Mumbai to London on 2026-06-15")]),
            Content(role="model", parts=response.candidates[0].content.parts),
            Content(role="user", parts=[function_response])
        ])
        print(final_response.text)

# ── 6. STREAMING ──────────────────────────────────────────────
print("Streaming response: ", end="")
for chunk in model.generate_content("Explain LLMs in detail", stream=True):
    if chunk.text:
        print(chunk.text, end="", flush=True)
print()

# ── 7. EMBEDDINGS ─────────────────────────────────────────────
from vertexai.language_models import TextEmbeddingModel

embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-004")

# Single text
embeddings = embedding_model.get_embeddings(["What is machine learning?"])
vector = embeddings[0].values
print(f"Embedding dimensions: {len(vector)}")  # 768

# Batch embeddings
texts = ["LangChain overview", "Vertex AI setup", "MCP protocol"]
embeddings = embedding_model.get_embeddings(texts)
for text, emb in zip(texts, embeddings):
    print(f"'{text[:30]}': {len(emb.values)}d vector")

# ── 8. DEPLOY CUSTOM MODEL TO ENDPOINT ───────────────────────
# Step 1: Upload model artifacts to GCS
# gs://my-bucket/model_artifacts/ should contain model.pkl, etc.

# Step 2: Upload model to Vertex AI Model Registry
sklearn_model = aiplatform.Model.upload(
    display_name="fraud-detector-v2",
    artifact_uri="gs://my-bucket/model_artifacts/",
    serving_container_image_uri=(
        "us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-3:latest"
    ),
    labels={"team": "ml-platform", "version": "2.0"}
)
print(f"Model uploaded: {sklearn_model.resource_name}")

# Step 3: Create endpoint
endpoint = aiplatform.Endpoint.create(
    display_name="fraud-detector-endpoint",
    labels={"env": "production"}
)

# Step 4: Deploy model to endpoint with auto-scaling
deployed_model = endpoint.deploy(
    model=sklearn_model,
    machine_type="n1-standard-4",
    min_replica_count=1,
    max_replica_count=5,      # auto-scales up to 5 replicas
    traffic_percentage=100,    # send 100% traffic here
    accelerator_type=None      # set to "NVIDIA_TESLA_T4" for GPU
)

# Step 5: Online prediction
predictions = endpoint.predict(
    instances=[
        {"amount": 1500.0, "merchant": "gas_station", "hour": 23},
        {"amount": 50.0, "merchant": "grocery", "hour": 14}
    ]
)
print(f"Predictions: {predictions.predictions}")
print(f"Model used: {predictions.deployed_model_id}")

# Step 6: Undeploy to stop billing
# endpoint.undeploy_all()

# ── 9. VERTEX AI PIPELINES (MLOps) ───────────────────────────
import kfp
from kfp import dsl
from kfp.dsl import component, pipeline, Input, Output, Dataset, Model, Metrics

@component(
    packages_to_install=["pandas", "scikit-learn"],
    base_image="python:3.10"
)
def preprocess_data(
    raw_data_gcs_path: str,
    processed_data: Output[Dataset]
):
    """Download and preprocess training data from GCS."""
    import pandas as pd
    from google.cloud import storage
    
    # Download from GCS
    storage_client = storage.Client()
    bucket_name, blob_name = raw_data_gcs_path.replace("gs://", "").split("/", 1)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename("/tmp/raw_data.csv")
    
    df = pd.read_csv("/tmp/raw_data.csv")
    df = df.dropna()  # simple preprocessing
    df.to_csv(processed_data.path, index=False)
    print(f"Processed {len(df)} rows")

@component(packages_to_install=["pandas", "scikit-learn"])
def train_model(
    processed_data: Input[Dataset],
    trained_model: Output[Model],
    metrics: Output[Metrics],
    n_estimators: int = 100
):
    """Train a RandomForest classifier."""
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    import joblib
    
    df = pd.read_csv(processed_data.path)
    X = df.drop("target", axis=1)
    y = df["target"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    clf = RandomForestClassifier(n_estimators=n_estimators, random_state=42)
    clf.fit(X_train, y_train)
    
    acc = accuracy_score(y_test, clf.predict(X_test))
    metrics.log_metric("accuracy", acc)
    print(f"Accuracy: {acc:.4f}")
    
    joblib.dump(clf, trained_model.path + ".pkl")

@pipeline(name="fraud-detection-pipeline", description="Train and evaluate fraud detector")
def fraud_pipeline(raw_data_path: str = "gs://my-bucket/data/raw.csv", n_estimators: int = 100):
    preprocess_task = preprocess_data(raw_data_gcs_path=raw_data_path)
    train_task = train_model(
        processed_data=preprocess_task.outputs["processed_data"],
        n_estimators=n_estimators
    )

# Compile and run
from kfp import compiler
compiler.Compiler().compile(fraud_pipeline, "fraud_pipeline.yaml")

job = aiplatform.PipelineJob(
    display_name="fraud-pipeline-run-1",
    template_path="fraud_pipeline.yaml",
    parameter_values={"raw_data_path": "gs://my-bucket/data/raw.csv", "n_estimators": 200}
)
job.submit()
print(f"Pipeline submitted: {job.resource_name}")

# ── 10. AGENT BUILDER — RAG SEARCH ───────────────────────────
# Via REST API (Agent Builder UI creates the data store and engine)
import requests

PROJECT = "my-project"
LOCATION_GLOBAL = "global"
ENGINE_ID = "my-search-engine"
DATA_STORE_ID = "my-data-store"

def search_vertex_rag(query: str, page_size: int = 5) -> list:
    """Query Vertex AI Agent Builder for RAG-powered search."""
    from google.auth import default
    from google.auth.transport.requests import Request
    
    credentials, _ = default()
    credentials.refresh(Request())
    
    url = (
        f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT}"
        f"/locations/{LOCATION_GLOBAL}/collections/default_collection"
        f"/engines/{ENGINE_ID}/servingConfigs/default_config:search"
    )
    
    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json"
    }
    payload = {
        "query": query,
        "pageSize": page_size,
        "queryExpansionSpec": {"condition": "AUTO"},
        "spellCorrectionSpec": {"mode": "AUTO"}
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    results = response.json().get("results", [])
    return [r["document"].get("derivedStructData", {}) for r in results]

results = search_vertex_rag("What is the company refund policy?")
for r in results:
    print(r.get("link", ""), r.get("snippets", [{}])[0].get("snippet", "")[:100])

# ── 11. CLOUD STORAGE OPERATIONS ─────────────────────────────
gcs_client = storage.Client(project=PROJECT_ID)

def upload_to_gcs(local_path: str, bucket_name: str, blob_name: str) -> str:
    """Upload a file to Google Cloud Storage."""
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)
    gcs_uri = f"gs://{bucket_name}/{blob_name}"
    print(f"Uploaded to: {gcs_uri}")
    return gcs_uri

def download_from_gcs(bucket_name: str, blob_name: str, local_path: str):
    """Download a file from GCS."""
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(local_path)
    print(f"Downloaded to: {local_path}")

# Upload model artifacts
gcs_uri = upload_to_gcs("./model.pkl", "my-ml-bucket", "models/v2/model.pkl")

# ── 12. IAM ROLES (needed permissions) ───────────────────────
# roles/aiplatform.user         — call Vertex AI APIs
# roles/aiplatform.admin        — full Vertex AI management
# roles/storage.objectViewer    — read GCS objects
# roles/storage.objectCreator   — write GCS objects
# roles/ml.developer            — ML Engine legacy
# 
# Service account setup:
# gcloud iam service-accounts create vertex-ai-sa
# gcloud projects add-iam-policy-binding PROJECT \
#   --member="serviceAccount:vertex-ai-sa@PROJECT.iam.gserviceaccount.com" \
#   --role="roles/aiplatform.user"
# export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Service</th><th>Options / Values</th><th>Effect</th></tr>
<tr><td><code>model</code></td><td>GenerativeModel</td><td><code>gemini-1.5-flash</code>, <code>gemini-1.5-pro</code>, <code>gemini-2.0-flash</code></td><td>Speed vs capability tradeoff</td></tr>
<tr><td><code>temperature</code></td><td>GenerationConfig</td><td><code>0.0</code>–<code>1.0</code></td><td>0 = deterministic, 1 = creative</td></tr>
<tr><td><code>max_output_tokens</code></td><td>GenerationConfig</td><td><code>256</code>–<code>8192</code></td><td>Caps response length and cost</td></tr>
<tr><td><code>machine_type</code></td><td>Endpoint deploy</td><td><code>n1-standard-2</code>, <code>n1-standard-4</code>, <code>n1-highmem-8</code></td><td>CPU/RAM for inference</td></tr>
<tr><td><code>min_replica_count</code></td><td>Endpoint deploy</td><td><code>1</code>–<code>N</code></td><td>Min instances (set &gt; 0 to avoid cold start)</td></tr>
<tr><td><code>max_replica_count</code></td><td>Endpoint deploy</td><td><code>1</code>–<code>N</code></td><td>Auto-scales up to this count</td></tr>
<tr><td><code>location</code></td><td>vertexai.init</td><td><code>us-central1</code>, <code>europe-west1</code>, <code>asia-southeast1</code></td><td>Region for all resources</td></tr>
<tr><td><code>traffic_percentage</code></td><td>deploy()</td><td><code>0</code>–<code>100</code></td><td>Canary deployments (split traffic)</td></tr>
<tr><td><code>accelerator_type</code></td><td>deploy()</td><td><code>NVIDIA_TESLA_T4</code>, <code>NVIDIA_A100_80GB</code></td><td>GPU for deep learning</td></tr>
<tr><td><code>page_size</code></td><td>Agent Builder search</td><td><code>1</code>–<code>100</code></td><td>Results per RAG query</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What is Vertex AI and how does it differ from using the Gemini API directly?**

Vertex AI is Google Cloud's managed ML platform that hosts Gemini (and other models) alongside training, serving, pipelines, and monitoring infrastructure. Calling Gemini via Vertex uses GCP billing, IAM, VPC security, and audit logs — required for enterprise compliance. The direct Gemini API is simpler for prototyping but lacks enterprise features like private networking, CMEK encryption, and usage controls.

**Q2: What is Vertex AI Agent Builder?**

Agent Builder is a managed RAG and search platform. You ingest documents into a Data Store (GCS, BigQuery, websites), and Agent Builder automatically chunks, embeds, and indexes them. You query via REST API and get back relevant passages + citations. It's the GCP-native alternative to building your own ChromaDB + retriever pipeline.

**Q3: How does auto-scaling work on Vertex AI Endpoints?**

Set `min_replica_count` (always-on instances) and `max_replica_count` (scale ceiling). Vertex AI monitors CPU/GPU utilization and scales replicas up or down automatically. Set `min_replica_count=0` for scale-to-zero (saves cost, adds cold start latency of ~30s); set `min_replica_count=1+` for low-latency production endpoints.

**Q4: What is Vertex AI Pipelines and why use it over a simple Python script?**

Pipelines (powered by Kubeflow Pipelines) run each step as an isolated container in the cloud. Benefits: automatic caching of expensive steps (re-use output if inputs unchanged), parallel execution of independent steps, full audit trail of runs, reproducibility, and scalability. Use for production MLOps — training, evaluation, deployment — not for exploration scripts.

**Q5: What IAM roles does a Vertex AI application need?**

Minimum: `roles/aiplatform.user` (call APIs) + `roles/storage.objectViewer` (read GCS data). For training jobs that write models: add `roles/storage.objectCreator`. For managing endpoints: `roles/aiplatform.admin`. Follow least privilege — grant only the roles needed for each service account.

**Q6: How do you do A/B testing on Vertex AI Endpoints?**

Deploy two models to the same endpoint with `traffic_percentage` split (e.g., 90/10). Vertex AI routes requests probabilistically. Monitor metrics in Cloud Monitoring to compare latency, accuracy, and error rates. Gradually shift traffic to the better model using `endpoint.deploy()` with updated `traffic_percentage`.

**Q7: What is the difference between online prediction and batch prediction?**

Online prediction (Endpoints) serves real-time requests via REST API — low latency (~100ms), suitable for user-facing apps. Batch prediction runs inference over large datasets asynchronously — outputs go to GCS/BigQuery, no latency requirement, significantly cheaper. Use batch for overnight scoring, reporting, or when you have millions of records to process.

**Q8: How do you monitor Vertex AI costs?**

Use Cloud Billing with budget alerts. In Vertex AI, costs come from: Endpoint hours (machine_type × replicas × hours), prediction requests, training compute (GPU hours), and Gemini API tokens. Set `max_replica_count` conservatively, use `scale-to-zero` for dev environments, and prefer `gemini-1.5-flash` over `gemini-1.5-pro` where quality allows (10x cost difference).

## ⚠️ Common Mistakes

- **Wrong location** — Vertex AI resources must be in the same location; mixing `us-central1` and `europe-west1` causes `NotFound` errors
- **Forgetting `vertexai.init()`** — every script must call this before any Vertex AI SDK calls; not needed for `google.cloud.aiplatform` (legacy SDK)
- **Using `min_replica_count=0` in production** — scale-to-zero causes 30+ second cold starts; set `min_replica_count=1` for user-facing endpoints
- **No `generation_config`** — default temperature=1.0 makes Gemini unpredictable for structured tasks; always set temperature=0 for agents
- **Ignoring safety settings** — default safety filters may block legitimate requests; configure `HarmBlockThreshold` appropriately for your use case
- **Not using service accounts** — running as personal credentials (ADC from `gcloud auth login`) is fine for dev but fails in CI/CD; always use dedicated service accounts with minimum required roles in production
- **Uploading model artifacts without serving container** — you must specify a `serving_container_image_uri` that matches your model type (sklearn, XGBoost, TF, custom)

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Service</th></tr>
<tr><td>Call Gemini in Python</td><td><code>GenerativeModel("gemini-1.5-flash").generate_content(...)</code></td></tr>
<tr><td>Multi-turn conversation</td><td><code>model.start_chat()</code> → <code>.send_message()</code></td></tr>
<tr><td>Image/PDF understanding</td><td><code>Part.from_uri(gcs_uri)</code> • text in <code>generate_content</code> list</td></tr>
<tr><td>LLM function calling</td><td><code>FunctionDeclaration</code> • <code>Tool</code> • <code>generate_content</code></td></tr>
<tr><td>Deploy sklearn/XGBoost model</td><td><code>aiplatform.Model.upload()</code> → <code>.deploy()</code></td></tr>
<tr><td>Real-time inference REST API</td><td><code>Endpoint.predict(instances=[...])</code></td></tr>
<tr><td>Large batch scoring</td><td><code>model.batch_predict(gcs_source=...)</code></td></tr>
<tr><td>Automated ML training pipeline</td><td>Vertex AI Pipelines + KFP components</td></tr>
<tr><td>Enterprise RAG search</td><td>Vertex AI Agent Builder</td></tr>
<tr><td>Find open-source models</td><td>Model Garden (Llama, Mistral, etc.)</td></tr>
</table>

## 📋 Completion Checklist

- Call `vertexai.init(project=..., location=...)` and generate text with `gemini-1.5-flash`
- Use `model.start_chat()` for multi-turn conversation with context retention
- Add images/PDFs with `Part.from_uri()` for multimodal generation
- Implement function calling with `FunctionDeclaration` + `Tool` and handle `function_call` in response
- Upload a model to Vertex AI Model Registry with `aiplatform.Model.upload()`
- Deploy to an Endpoint with `min_replica_count=1`, `max_replica_count=3`, and call `endpoint.predict()`
- Build at least one KFP Pipeline component and submit a pipeline job
- Query Vertex AI Agent Builder for RAG search via REST API
