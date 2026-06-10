---
title: Week 22 — Deployment on Google Cloud Platform
description: How to package an AI app with Docker and deploy it on Google Cloud Run, with secrets in Secret Manager and CI/CD through Cloud Build.
---

> 🎯 **TL;DR** — Deploy AI apps to GCP using: **Docker** to containerize → **Artifact Registry** to store images → **Cloud Run** for serverless auto-scaling deployment → **Secret Manager** for API keys → **Cloud Build** for CI/CD. The full pipeline: `Dockerfile` → `docker build` → `gcloud builds submit` → `gcloud run deploy`. Cloud Run scales to zero (no idle costs) and handles HTTPS, custom domains, and traffic splitting out of the box.

## 🧠 Mental Model

Deploying on GCP is like **setting up a restaurant**. Docker is your **recipe + kitchen equipment** — it packages exactly what you need to cook (run your app). Artifact Registry is the **cold storage** where you keep your packaged kitchen setups. Cloud Run is the **restaurant space** — you rent it only when customers arrive (auto-scales), pay nothing when empty (scale-to-zero). Secret Manager is the **safe** where you lock up the keys. Cloud Build is the **prep cook** that automatically prepares everything when you update the recipe (CI/CD).

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Service</th><th>Purpose</th><th>Key Command / API</th></tr>
<tr><td>Docker</td><td>Package app + dependencies into container</td><td><code>docker build</code>, <code>docker run</code></td></tr>
<tr><td>Artifact Registry</td><td>Store and version Docker images</td><td><code>gcloud artifacts repositories create</code></td></tr>
<tr><td>Cloud Run</td><td>Serverless container deployment (scales 0→N)</td><td><code>gcloud run deploy</code></td></tr>
<tr><td>Cloud Build</td><td>Managed CI/CD build pipeline</td><td><code>gcloud builds submit</code></td></tr>
<tr><td>Secret Manager</td><td>Store API keys, passwords securely</td><td><code>gcloud secrets create</code></td></tr>
<tr><td>Cloud Storage</td><td>Store models, datasets, artifacts</td><td><code>gcloud storage cp</code></td></tr>
<tr><td>Cloud SQL</td><td>Managed PostgreSQL/MySQL database</td><td><code>gcloud sql instances create</code></td></tr>
<tr><td>Cloud Monitoring</td><td>Metrics, alerts, dashboards</td><td><code>gcloud monitoring</code></td></tr>
<tr><td>Cloud Logging</td><td>Centralized logs from all services</td><td><code>gcloud logging read</code></td></tr>
<tr><td>Custom Domains</td><td>Map your domain to Cloud Run</td><td><code>gcloud run domain-mappings create</code></td></tr>
</table>

## 🔢 Key Steps / Process

1. **Write the app** — FastAPI (REST API) or Streamlit (UI) with health check endpoint
2. **Create Dockerfile** — `FROM python:3.11-slim` → install deps → copy code → `CMD uvicorn`
3. **Test locally** — `docker build -t myapp .` → `docker run -p 8080:8080 --env-file .env myapp`
4. **Create Artifact Registry** — `gcloud artifacts repositories create` (one-time setup)
5. **Build and push image** — `gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/REPO/IMAGE`
6. **Store secrets** — `gcloud secrets create openai-key --data-file=secret.txt`
7. **Deploy to Cloud Run** — `gcloud run deploy` with memory, CPU, scaling, and secret refs
8. **Set up CI/CD** — `cloudbuild.yaml` triggers on `git push` → build → deploy automatically
9. **Configure health checks** — `/health` endpoint returns 200; Cloud Run needs this for rolling deploys
10. **Monitor** — check Cloud Logging for errors, set billing alerts, review Cloud Monitoring dashboards

## 💻 Code Cheatsheet

```python
# ============================================================
# GCP DEPLOYMENT COMPLETE CHEATSHEET
# FastAPI + Docker + Artifact Registry + Cloud Run + Secret Manager + CI/CD
# ============================================================

# ── 1. FASTAPI APP (main.py) ──────────────────────────────────
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os, time, logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Global app state (loaded once at startup) ─────────────────
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavy resources at startup, clean up at shutdown."""
    logger.info("Starting up — loading model...")
    from langchain_openai import ChatOpenAI
    app_state["llm"] = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    logger.info("Model loaded successfully")
    yield
    logger.info("Shutting down...")
    app_state.clear()

app = FastAPI(
    title="AI Research API",
    description="Production AI API with FastAPI + Cloud Run",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production!
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

class QueryRequest(BaseModel):
    question: str
    max_tokens: int = 512

class QueryResponse(BaseModel):
    answer: str
    model: str
    processing_time_ms: float

@app.get("/health")
async def health_check():
    """Health check endpoint — Cloud Run requires this for rolling deploys."""
    return {"status": "healthy", "version": "1.0.0", "model": "gpt-4o-mini"}

@app.get("/")
async def root():
    return {"message": "AI Research API is running", "docs": "/docs"}

@app.post("/query", response_model=QueryResponse)
async def query_agent(request: QueryRequest):
    """Main inference endpoint."""
    start = time.time()
    
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if len(request.question) > 2000:
        raise HTTPException(status_code=400, detail="Question too long (max 2000 chars)")
    
    try:
        llm = app_state.get("llm")
        if not llm:
            raise HTTPException(status_code=503, detail="Model not loaded yet")
        
        response = llm.invoke(request.question)
        elapsed_ms = (time.time() - start) * 1000
        
        logger.info(f"Query processed in {elapsed_ms:.0f}ms | Q: {request.question[:50]}")
        return QueryResponse(
            answer=response.content,
            model="gpt-4o-mini",
            processing_time_ms=round(elapsed_ms, 2)
        )
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/metrics")
async def get_metrics():
    """Basic metrics endpoint for monitoring."""
    import psutil
    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "status": "healthy"
    }


# ── 2. DOCKERFILE ─────────────────────────────────────────────
# FROM python:3.11-slim
#
# WORKDIR /app
#
# # Install system deps (only what's needed)
# RUN apt-get update && apt-get install -y \
#     build-essential curl \
#     && rm -rf /var/lib/apt/lists/*
#
# # Install Python deps first (layer caching)
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
#
# # Copy application code
# COPY . .
#
# # Expose Cloud Run's required port
# EXPOSE 8080
#
# # Health check (optional but recommended)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
#     CMD curl -f http://localhost:8080/health || exit 1
#
# # Run with uvicorn (production ASGI server)
# CMD ["uvicorn", "main:app", \
#      "--host", "0.0.0.0", \
#      "--port", "8080", \
#      "--workers", "1", \
#      "--timeout-keep-alive", "75"]


# ── 3. REQUIREMENTS.TXT ───────────────────────────────────────
# fastapi==0.115.0
# uvicorn[standard]==0.31.0
# langchain==0.3.0
# langchain-openai==0.2.0
# google-cloud-secret-manager==2.20.0
# google-cloud-storage==2.18.0
# pydantic==2.9.0
# python-dotenv==1.0.0
# psutil==6.0.0


# ── 4. LOCAL DOCKER BUILD & TEST ─────────────────────────────
# docker build -t ai-api:latest .
# docker run -p 8080:8080 --env-file .env ai-api:latest
# curl http://localhost:8080/health
# curl -X POST http://localhost:8080/query \
#   -H "Content-Type: application/json" \
#   -d '{"question": "What is LangChain?"}'


# ── 5. ARTIFACT REGISTRY SETUP (one-time) ────────────────────
# gcloud auth configure-docker us-central1-docker.pkg.dev
# gcloud artifacts repositories create ai-apps \
#   --repository-format=docker \
#   --location=us-central1 \
#   --description="AI application Docker images"


# ── 6. BUILD & PUSH WITH CLOUD BUILD ─────────────────────────
# gcloud builds submit \
#   --tag us-central1-docker.pkg.dev/PROJECT_ID/ai-apps/ai-api:latest \
#   --machine-type e2-highcpu-8


# ── 7. DEPLOY TO CLOUD RUN ────────────────────────────────────
# gcloud run deploy ai-api \
#   --image us-central1-docker.pkg.dev/PROJECT_ID/ai-apps/ai-api:latest \
#   --platform managed \
#   --region us-central1 \
#   --allow-unauthenticated \
#   --memory 2Gi \
#   --cpu 2 \
#   --min-instances 0 \
#   --max-instances 10 \
#   --concurrency 80 \
#   --timeout 300 \
#   --set-secrets OPENAI_API_KEY=openai-api-key:latest \
#   --set-env-vars APP_ENV=production,LOG_LEVEL=INFO
#
# Get deployed URL:
# gcloud run services describe ai-api --region us-central1 --format "value(status.url)"


# ── 8. SECRET MANAGER ─────────────────────────────────────────
from google.cloud import secretmanager
import os

def create_secret(project_id: str, secret_id: str, secret_value: str):
    """Create a new secret in Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{project_id}"
    
    secret = client.create_secret(
        request={
            "parent": parent,
            "secret_id": secret_id,
            "secret": {"replication": {"automatic": {}}}
        }
    )
    
    client.add_secret_version(
        request={
            "parent": secret.name,
            "payload": {"data": secret_value.encode("UTF-8")}
        }
    )
    print(f"Created secret: {secret_id}")

def get_secret(project_id: str, secret_id: str, version: str = "latest") -> str:
    """Retrieve a secret value from Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Create secrets (run once from CLI or script)
# create_secret("my-project", "openai-api-key", "sk-...")
# create_secret("my-project", "anthropic-api-key", "sk-ant-...")

# Retrieve at runtime
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "my-project")
try:
    openai_key = get_secret(PROJECT_ID, "openai-api-key")
    os.environ["OPENAI_API_KEY"] = openai_key
    print("Secrets loaded from Secret Manager")
except Exception as e:
    # Fall back to env var (for local dev)
    print(f"Using env var (Secret Manager unavailable): {e}")

# CLI commands for secrets:
# gcloud secrets create openai-api-key --data-file=./openai_key.txt
# gcloud secrets versions access latest --secret=openai-api-key
# gcloud secrets versions add openai-api-key --data-file=./new_key.txt  # rotation


# ── 9. CLOUD STORAGE FOR MODELS ──────────────────────────────
from google.cloud import storage as gcs

def upload_model(local_path: str, bucket: str, blob_name: str) -> str:
    """Upload model file to GCS."""
    client = gcs.Client()
    bucket_obj = client.bucket(bucket)
    blob = bucket_obj.blob(blob_name)
    blob.upload_from_filename(local_path)
    uri = f"gs://{bucket}/{blob_name}"
    print(f"Uploaded to {uri}")
    return uri

def download_model(bucket: str, blob_name: str, local_path: str):
    """Download model file from GCS."""
    client = gcs.Client()
    bucket_obj = client.bucket(bucket)
    blob = bucket_obj.blob(blob_name)
    blob.download_to_filename(local_path)
    print(f"Downloaded to {local_path}")

def list_bucket_files(bucket: str, prefix: str = "") -> list:
    """List files in a GCS bucket with optional prefix filter."""
    client = gcs.Client()
    blobs = client.list_blobs(bucket, prefix=prefix)
    return [blob.name for blob in blobs]

# Save and upload a model
import joblib
# joblib.dump(my_model, "model.pkl")
# upload_model("model.pkl", "my-ml-bucket", "models/v1/classifier.pkl")

# Download at startup in Cloud Run
# download_model("my-ml-bucket", "models/v1/classifier.pkl", "/tmp/model.pkl")
# model = joblib.load("/tmp/model.pkl")

# GCS CLI:
# gcloud storage buckets create gs://my-ml-bucket --location=us-central1
# gcloud storage cp model.pkl gs://my-ml-bucket/models/v1/


# ── 10. CLOUD BUILD CI/CD (cloudbuild.yaml) ──────────────────
# steps:
#   # Step 1: Build Docker image
#   - name: 'gcr.io/cloud-builders/docker'
#     args:
#       - 'build'
#       - '-t'
#       - 'us-central1-docker.pkg.dev/$PROJECT_ID/ai-apps/ai-api:$COMMIT_SHA'
#       - '-t'
#       - 'us-central1-docker.pkg.dev/$PROJECT_ID/ai-apps/ai-api:latest'
#       - '.'
#
#   # Step 2: Push image to Artifact Registry
#   - name: 'gcr.io/cloud-builders/docker'
#     args:
#       - 'push'
#       - 'us-central1-docker.pkg.dev/$PROJECT_ID/ai-apps/ai-api:$COMMIT_SHA'
#
#   # Step 3: Run tests (optional)
#   - name: 'python:3.11'
#     entrypoint: 'pip'
#     args: ['install', '-r', 'requirements.txt', '-q']
#   - name: 'python:3.11'
#     entrypoint: 'python'
#     args: ['-m', 'pytest', 'tests/', '-v']
#
#   # Step 4: Deploy to Cloud Run
#   - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
#     entrypoint: 'gcloud'
#     args:
#       - 'run'
#       - 'deploy'
#       - 'ai-api'
#       - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/ai-apps/ai-api:$COMMIT_SHA'
#       - '--region=us-central1'
#       - '--platform=managed'
#
# images:
#   - 'us-central1-docker.pkg.dev/$PROJECT_ID/ai-apps/ai-api:$COMMIT_SHA'
#
# # Trigger: connect Cloud Build to GitHub in GCP Console
# # Every push to 'main' branch triggers this pipeline


# ── 11. TRAFFIC SPLITTING (Canary Deployments) ────────────────
# Deploy new version alongside old:
# gcloud run deploy ai-api --image NEW_IMAGE --no-traffic  # deploy without traffic
# gcloud run services update-traffic ai-api \
#   --to-revisions=ai-api-00002-xyz=10,LATEST=90  # 10% canary
# Monitor metrics, then:
# gcloud run services update-traffic ai-api --to-latest  # 100% to new version


# ── 12. CUSTOM DOMAIN SETUP ───────────────────────────────────
# gcloud run domain-mappings create \
#   --service ai-api \
#   --domain api.yourdomain.com \
#   --region us-central1
# Then add the DNS records shown to your domain registrar


# ── 13. COST OPTIMIZATION ────────────────────────────────────
# Cloud Run is billed per request + compute (CPU × memory × time)
# 
# Reduce costs:
# - --min-instances=0 (scale to zero when idle — best for dev/staging)
# - --min-instances=1 (keep warm for production — ~$15/month per instance)
# - --concurrency=80 (handle 80 simultaneous requests per instance)
# - Use gpt-4o-mini instead of gpt-4o for LLM calls (90% cheaper)
# - Cache responses: @functools.lru_cache or Redis for repeated queries
# - Set --memory=512Mi if model loads in memory are small
# 
# Monitor spend:
# gcloud billing budgets create --billing-account=ACCOUNT_ID \
#   --display-name="AI App Budget" \
#   --budget-amount=50USD --threshold-rule=percent=0.8
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Command</th><th>Recommended Value</th><th>Effect</th></tr>
<tr><td><code>--memory</code></td><td><code>gcloud run deploy</code></td><td><code>1Gi</code>–<code>4Gi</code></td><td>RAM for the container instance</td></tr>
<tr><td><code>--cpu</code></td><td><code>gcloud run deploy</code></td><td><code>1</code>–<code>4</code></td><td>vCPUs per instance</td></tr>
<tr><td><code>--min-instances</code></td><td><code>gcloud run deploy</code></td><td><code>0</code> (dev), <code>1</code> (prod)</td><td><code>0</code> = scale to zero; <code>1</code> = always warm</td></tr>
<tr><td><code>--max-instances</code></td><td><code>gcloud run deploy</code></td><td><code>10</code>–<code>100</code></td><td>Max parallel instances</td></tr>
<tr><td><code>--concurrency</code></td><td><code>gcloud run deploy</code></td><td><code>80</code></td><td>Requests per instance before scaling</td></tr>
<tr><td><code>--timeout</code></td><td><code>gcloud run deploy</code></td><td><code>300</code></td><td>Request timeout in seconds (max 3600)</td></tr>
<tr><td><code>--set-secrets</code></td><td><code>gcloud run deploy</code></td><td><code>KEY=secret-name:latest</code></td><td>Mount Secret Manager secret as env var</td></tr>
<tr><td><code>--allow-unauthenticated</code></td><td><code>gcloud run deploy</code></td><td>Public APIs</td><td>Allows unauthenticated access</td></tr>
<tr><td><code>--no-allow-unauthenticated</code></td><td><code>gcloud run deploy</code></td><td>Internal APIs</td><td>Requires Google IAM auth token</td></tr>
<tr><td><code>--region</code></td><td>all commands</td><td><code>us-central1</code></td><td>Lowest latency from most regions</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: Why use Cloud Run instead of a VM or App Engine?**

Cloud Run is serverless containers — it scales from zero to hundreds of instances automatically and bills only for requests processed (not idle time). vs VMs: no OS management, no patching, auto-scaling built in. vs App Engine: more flexible (any Docker container), explicit resource control, no vendor lock-in. Cloud Run is the default choice for stateless AI APIs.

**Q2: How do you store API keys securely in GCP?**

Use Secret Manager — never put API keys in Dockerfile, code, or environment variables committed to git. Create secrets with `gcloud secrets create`, then reference them in Cloud Run with `--set-secrets API_KEY=secret-name:latest`. The secret value is injected at runtime as an environment variable; Cloud Run service accounts need `roles/secretmanager.secretAccessor` permission.

**Q3: What is the difference between `--min-instances=0` and `--min-instances=1`?**

`min-instances=0` (scale-to-zero): when no requests come in, Cloud Run terminates all instances — costs nothing when idle, but the first request after idle takes 1–5 seconds (cold start). `min-instances=1`: one instance stays warm at all times — ~$15/month but zero cold starts. Use `0` for dev/staging, `1` for production APIs where latency matters.

**Q4: How does Cloud Build CI/CD work?**

Cloud Build triggers on git push (connect via GCP Console → Cloud Build → Triggers → connect GitHub). It runs `cloudbuild.yaml` steps as containers: build image, run tests, push to Artifact Registry, deploy to Cloud Run. Each step runs in isolation. Use `$COMMIT_SHA` as the image tag for traceability. The entire pipeline runs on GCP-managed infrastructure.

**Q5: How do you do canary deployments on Cloud Run?**

Deploy the new version with `--no-traffic` so no requests hit it. Then split traffic: `gcloud run services update-traffic --to-revisions=new=10,old=90` (10% canary). Monitor error rates and latency in Cloud Monitoring. If stable, shift to 100%: `--to-latest`. If issues, instant rollback: `--to-revisions=old=100`. Cloud Run maintains full revision history.

**Q6: How do you handle database connections in Cloud Run?**

Use Cloud SQL with the **Cloud SQL Auth Proxy** — add the proxy as a sidecar or use the built-in Unix socket connection. In Cloud Run: `--add-cloudsql-instances PROJECT:REGION:INSTANCE` and connect via `/cloudsql/PROJECT:REGION:INSTANCE`. Use connection pooling (SQLAlchemy `pool_size=5`) since Cloud Run instances can spin up many replicas — each needs its own connection pool.

**Q7: How do you keep Docker images small?**

Use `python:3.11-slim` (not full), install only required system packages, combine `apt-get` commands into one `RUN` to reduce layers, use `.dockerignore` to exclude `.git`, `__pycache__`, test files, and `.env`. Use multi-stage builds for compiled languages. Smaller images = faster deployments and less Artifact Registry storage cost.

**Q8: How do you monitor a Cloud Run service in production?**

Cloud Run auto-exports logs to Cloud Logging — use `logger.info()`/`logger.error()` in your Python code. Set up Cloud Monitoring alert policies on: request count, latency (p95 > 2s), error rate (5xx > 1%), and instance count. Add a `/health` and `/metrics` endpoint. Set billing budget alerts so unexpected traffic spikes don't cause bill shock.

## ⚠️ Common Mistakes

- **Hardcoding secrets** — never put API keys in Dockerfile or source code; use Secret Manager and `--set-secrets`
- **Not adding `/health` endpoint** — Cloud Run uses health checks during rolling deploys; without it, failed deploys may not be detected
- **Using `python:3.11` (full image)** — use `python:3.11-slim` to reduce image size from ~1GB to ~200MB; faster builds and deploys
- **Forgetting `.dockerignore`** — without it, `.git/`, `__pycache__/`, `.env`, and test data all get copied into the image, bloating it
- **Setting `--min-instances=0` for production LLM APIs** — cold starts on LLM-heavy apps can take 5–10 seconds, unacceptable for users; use `--min-instances=1`
- **Not using `--no-traffic` for canary** — deploying directly replaces all traffic; always deploy new versions with `--no-traffic` first, then shift gradually
- **Ignoring `--concurrency`** — default is 80; if your LLM calls take 5+ seconds each, set concurrency lower (e.g., 10) to prevent instance overload

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Service / Command</th></tr>
<tr><td>Deploy FastAPI/Streamlit app</td><td>Cloud Run + Docker</td></tr>
<tr><td>Store model files</td><td>Cloud Storage (<code>gs://bucket/path</code>)</td></tr>
<tr><td>Store API keys securely</td><td>Secret Manager + <code>--set-secrets</code></td></tr>
<tr><td>Automated build on git push</td><td>Cloud Build + <code>cloudbuild.yaml</code></td></tr>
<tr><td>Store Docker images</td><td>Artifact Registry</td></tr>
<tr><td>Production database</td><td>Cloud SQL (PostgreSQL)</td></tr>
<tr><td>High traffic Kubernetes</td><td>GKE (upgrade from Cloud Run)</td></tr>
<tr><td>Event-triggered functions</td><td>Cloud Functions</td></tr>
<tr><td>Async job queue</td><td>Cloud Pub/Sub</td></tr>
<tr><td>Monitor costs</td><td>Cloud Billing budgets + alerts</td></tr>
</table>

## 📋 Completion Checklist

- Write a FastAPI app with `/health`, `/`, and `/query` endpoints plus startup/shutdown lifespan
- Create a `Dockerfile` using `python:3.11-slim`, install deps, copy code, expose 8080, CMD uvicorn
- Build and run locally: `docker build -t myapp . && docker run -p 8080:8080 --env-file .env myapp`
- Create an Artifact Registry repo and push image with `gcloud builds submit`
- Store API keys in Secret Manager and reference them with `--set-secrets` in deploy command
- Deploy to Cloud Run with `--min-instances=1`, `--max-instances=10`, `--memory=2Gi`, `--cpu=2`
- Write `cloudbuild.yaml` with build → test → push → deploy steps and connect to GitHub
- Verify deployment: curl `/health` endpoint, test `/query`, check Cloud Logging for any errors
