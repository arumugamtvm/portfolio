---
title: Week 9.3 — Web Development for AI: FastAPI & Flask
description: FastAPI is the modern standard for serving ML models as REST APIs, with async support, auto docs, and Pydantic validation. Flask is simpler for small scripts; for production use FastAPI with uvicorn and Docker.
---

> 🎯 **TL;DR** — FastAPI is the modern standard for serving ML models as REST APIs: async-first, auto-generates OpenAPI docs, validates requests via Pydantic, and runs 2-3x faster than Flask. Flask is simpler for small scripts. For production ML APIs, use FastAPI + uvicorn + Docker. Test endpoints with `/docs` Swagger UI or `httpx`/`requests`.

## 🧠 Mental Model

Think of your ML model as a **chef in a kitchen**. FastAPI is the **restaurant** — it takes orders (HTTP requests), validates them (Pydantic models check the menu items), sends them to the chef (your model), and returns the plate (JSON response). The restaurant also auto-prints its menu (Swagger `/docs`) and handles many orders simultaneously (async). Flask is a **food truck** — simpler, quicker to set up, fine for small crowds, but no auto-menu and gets overwhelmed under load.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>FastAPI</th><th>Flask</th><th>Notes</th></tr>
<tr><td>Async support</td><td>Native (<code>async def</code>)</td><td>Limited (via extensions)</td><td>FastAPI built on Starlette/asyncio</td></tr>
<tr><td>Auto API docs</td><td><code>/docs</code> (Swagger) + <code>/redoc</code></td><td>No</td><td>Generated from type hints</td></tr>
<tr><td>Request validation</td><td>Pydantic (automatic)</td><td>Manual (<code>request.get_json()</code>)</td><td>FastAPI raises 422 on bad input</td></tr>
<tr><td>Path parameters</td><td><code>@app.get("/items/{id}")</code></td><td><code>@app.route("/items/&lt;id&gt;")</code></td><td></td></tr>
<tr><td>Query parameters</td><td>Function args with defaults</td><td><code>request.args.get()</code></td><td></td></tr>
<tr><td>Request body</td><td>Pydantic <code>BaseModel</code></td><td><code>request.get_json()</code></td><td></td></tr>
<tr><td>CORS</td><td><code>fastapi.middleware.cors</code></td><td><code>flask-cors</code></td><td></td></tr>
<tr><td>Production server</td><td>uvicorn / gunicorn+uvicorn</td><td>gunicorn</td><td></td></tr>
<tr><td>Dependency injection</td><td><code>Depends()</code></td><td>Manual</td><td>FastAPI built-in</td></tr>
<tr><td>Background tasks</td><td><code>BackgroundTasks</code></td><td>Celery (separate)</td><td></td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Install** — `pip install fastapi uvicorn pydantic httpx`
2. **Define Pydantic models** — input/output schemas with type hints
3. **Create FastAPI app** — `app = FastAPI(title="ML API")`
4. **Define lifespan** — load ML model once at startup via `@asynccontextmanager`
5. **Write endpoints** — `@app.get`, `@app.post` with typed parameters
6. **Add error handling** — raise `HTTPException(status_code=..., detail=...)`
7. **Add CORS** — `CORSMiddleware` for browser clients
8. **Test locally** — `uvicorn main:app --reload`, open `/docs`
9. **Write tests** — use `httpx.AsyncClient` + `pytest`
10. **Dockerize** — write `Dockerfile`, build image, run container

---

## 💻 Code Cheatsheet

```python
# ============================================================
# FASTAPI COMPLETE ML SERVING CHEATSHEET
# Install: pip install fastapi uvicorn pydantic httpx pytest
# Run:     uvicorn main:app --reload --port 8000
# Docs:    http://localhost:8000/docs
# ============================================================

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import pickle, numpy as np, logging, asyncio, time
from pathlib import Path as FilePath

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------------------------------------
# 1. PYDANTIC MODELS — request/response schemas
# ----------------------------------------------------------
class PredictRequest(BaseModel):
    features: List[float] = Field(..., min_length=1, description="Input feature vector")
    model_version: str    = Field(default="v1", description="Model version to use")
    
    @field_validator("features")
    @classmethod
    def features_must_be_finite(cls, v):
        if any(not np.isfinite(f) for f in v):
            raise ValueError("All features must be finite numbers")
        return v

class PredictResponse(BaseModel):
    prediction: int
    confidence: Optional[float] = None
    model_version: str
    latency_ms: float
    status: str = "success"

class BatchPredictRequest(BaseModel):
    samples: List[List[float]] = Field(..., description="List of feature vectors")

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    uptime_seconds: float

# ----------------------------------------------------------
# 2. APP LIFESPAN — load model once at startup
# ----------------------------------------------------------
ml_models: Dict[str, Any] = {}
start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: load model into shared dict
    logger.info("Loading ML model...")
    model_path = FilePath("model.pkl")
    if model_path.exists():
        with open(model_path, "rb") as f:
            ml_models["classifier"] = pickle.load(f)
        logger.info("Model loaded successfully")
    else:
        # Demo: create a fake predictor
        class FakeModel:
            def predict(self, X): return [int(np.random.randint(0, 2)) for _ in X]
            def predict_proba(self, X): return [[np.random.rand(), np.random.rand()] for _ in X]
        ml_models["classifier"] = FakeModel()
        logger.warning("No model.pkl found — using demo predictor")
    yield
    # SHUTDOWN: cleanup
    ml_models.clear()
    logger.info("Model unloaded, shutdown complete")

# ----------------------------------------------------------
# 3. FASTAPI APP — with lifespan, metadata
# ----------------------------------------------------------
app = FastAPI(
    title="ML Prediction API",
    description="Serve scikit-learn models via REST API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
)

# ----------------------------------------------------------
# 4. CORS MIDDLEWARE — allow browser clients
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # In production: ["https://yourdomain.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# 5. DEPENDENCY INJECTION — reusable model getter
# ----------------------------------------------------------
def get_model():
    """Dependency: ensures model is loaded before serving requests."""
    if "classifier" not in ml_models:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return ml_models["classifier"]

# ----------------------------------------------------------
# 6. ENDPOINTS
# ----------------------------------------------------------

# GET /health — health check
@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
def health_check():
    return HealthResponse(
        status="healthy",
        model_loaded="classifier" in ml_models,
        uptime_seconds=round(time.time() - start_time, 2)
    )

# GET /items/{item_id} — path parameter example
@app.get("/items/{item_id}", tags=["Examples"])
def get_item(
    item_id: int = Path(..., ge=1, description="Item ID must be >= 1"),
    include_meta: bool = Query(default=False, description="Include metadata")
):
    result = {"item_id": item_id, "name": f"Item {item_id}"}
    if include_meta:
        result["meta"] = {"created": "2024-01-01", "version": "v1"}
    return result

# POST /predict — single prediction
@app.post("/predict", response_model=PredictResponse, tags=["Predictions"])
def predict(
    request: PredictRequest,
    model = Depends(get_model)          # inject model via dependency
):
    t0 = time.time()
    try:
        X = np.array(request.features).reshape(1, -1)
        prediction = int(model.predict(X)[0])
        confidence = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X)[0]
            confidence = float(max(probs))
        latency_ms = round((time.time() - t0) * 1000, 2)
        return PredictResponse(
            prediction=prediction,
            confidence=confidence,
            model_version=request.model_version,
            latency_ms=latency_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# POST /predict/batch — batch prediction
@app.post("/predict/batch", tags=["Predictions"])
def batch_predict(
    request: BatchPredictRequest,
    model = Depends(get_model)
):
    try:
        X = np.array(request.samples)
        predictions = model.predict(X).tolist()
        return {"predictions": predictions, "count": len(predictions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /predict/async — async endpoint (non-blocking)
@app.post("/predict/async", tags=["Predictions"])
async def predict_async(request: PredictRequest, model = Depends(get_model)):
    await asyncio.sleep(0)              # yield to event loop — keeps server responsive
    X = np.array(request.features).reshape(1, -1)
    prediction = int(model.predict(X)[0])
    return {"prediction": prediction}

# POST /predict/background — background task logging
def log_prediction(prediction: int, features: List[float]):
    logger.info(f"Prediction: {prediction}, Features: {features}")
    # In production: write to DB, send to monitoring service, etc.

@app.post("/predict/logged", tags=["Predictions"])
def predict_with_logging(
    request: PredictRequest,
    background_tasks: BackgroundTasks,
    model = Depends(get_model)
):
    X = np.array(request.features).reshape(1, -1)
    prediction = int(model.predict(X)[0])
    background_tasks.add_task(log_prediction, prediction, request.features)
    return {"prediction": prediction, "logged": True}


# ============================================================
# FLASK COMPARISON — equivalent Flask ML API
# ============================================================
# pip install flask
"""
from flask import Flask, request, jsonify
import pickle, numpy as np

flask_app = Flask(__name__)
with open("model.pkl", "rb") as f:
    model = pickle.load(f)          # loaded at import time (no lifespan)

@flask_app.route("/")
def home():
    return jsonify({"status": "Flask ML API running"})

@flask_app.route("/predict", methods=["POST"])
def predict():
    try:
        data     = request.get_json(force=True)         # manual JSON parsing
        features = np.array(data["features"]).reshape(1, -1)
        pred     = int(model.predict(features)[0])
        return jsonify({"prediction": pred, "status": "success"})
    except KeyError:
        return jsonify({"error": "Missing 'features' key"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    flask_app.run(debug=True, port=5000)
"""

# ============================================================
# TESTING WITH httpx — pytest async client
# ============================================================
"""
# test_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_predict():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/predict", json={"features": [1.0, 2.0, 3.0]})
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert data["status"] == "success"

@pytest.mark.asyncio
async def test_predict_invalid_input():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/predict", json={"features": []})  # empty list
    assert response.status_code == 422    # Pydantic validation error
"""
```

```docker
# ============================================================
# Dockerfile — containerize FastAPI ML app
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Production: use multiple workers with gunicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```bash
# Build and run
docker build -t ml-api .
docker run -p 8000:8000 -v $(pwd)/model.pkl:/app/model.pkl ml-api

# docker-compose.yml
# services:
#   api:
#     build: .
#     ports: ["8000:8000"]
#     volumes: ["./model.pkl:/app/model.pkl"]

# Test with curl
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [1.2, 3.4, 5.6, 7.8]}'
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Location</th><th>Description</th><th>Example</th></tr>
<tr><td><code>--reload</code></td><td>uvicorn CLI</td><td>Auto-reload on code changes (dev only)</td><td><code>uvicorn main:app --reload</code></td></tr>
<tr><td><code>--workers</code></td><td>uvicorn CLI</td><td>Number of worker processes</td><td><code>--workers 4</code></td></tr>
<tr><td><code>--host</code></td><td>uvicorn CLI</td><td>Bind address</td><td><code>--host 0.0.0.0</code></td></tr>
<tr><td><code>status_code</code></td><td><code>HTTPException</code></td><td>HTTP error code returned to client</td><td><code>404</code>, <code>422</code>, <code>500</code></td></tr>
<tr><td><code>response_model</code></td><td><code>@app.post(...)</code></td><td>Pydantic model for response serialization/validation</td><td><code>PredictResponse</code></td></tr>
<tr><td><code>tags</code></td><td><code>@app.get(...)</code></td><td>Group endpoints in Swagger UI</td><td><code>["Predictions"]</code></td></tr>
<tr><td><code>allow_origins</code></td><td><code>CORSMiddleware</code></td><td>Allowed origin domains</td><td><code>["*"]</code> or specific URLs</td></tr>
<tr><td><code>ge / le</code></td><td><code>Path(..., ge=1)</code></td><td>Pydantic numeric constraints (≥, ≤)</td><td><code>ge=1, le=1000</code></td></tr>
<tr><td><code>min_length</code></td><td><code>Field(..., min_length=1)</code></td><td>Pydantic list length constraint</td><td><code>min_length=1</code></td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What are the main advantages of FastAPI over Flask for ML APIs?**

FastAPI offers: (1) native async/await for non-blocking I/O, (2) automatic OpenAPI docs at `/docs`, (3) automatic request validation via Pydantic — invalid inputs return 422 without any manual code, (4) significantly better performance (Starlette-based), (5) built-in dependency injection. Flask is simpler for tiny scripts but requires manual validation and doesn't scale as well.

**Q2: What is a Pydantic model and why is it important?**

A Pydantic `BaseModel` subclass defines the schema of your request/response data using Python type hints. FastAPI uses it to: validate incoming JSON (raises HTTP 422 if invalid), serialize Python objects to JSON, and generate OpenAPI documentation. It eliminates an entire class of runtime bugs from missing or wrong-typed fields.

**Q3: What is the difference between `async def` and `def` in FastAPI endpoints?**

`async def` endpoints run on FastAPI's async event loop — ideal when the endpoint does I/O (DB calls, external API calls, file reads) because the server can handle other requests while waiting. `def` endpoints run in a thread pool so they don't block the event loop, but they're less efficient for high concurrency. Use `async def` when you `await` something; `def` for CPU-bound or blocking operations.

**Q4: How do you load an ML model efficiently in FastAPI?**

Use the `lifespan` context manager (`@asynccontextmanager`). The model loads once on startup and is stored in a shared dict (e.g., `ml_models`). Endpoints access it via a `Depends()` dependency. This avoids reloading on every request and ensures cleanup on shutdown.

**Q5: What is CORS and when do you need it?**

Cross-Origin Resource Sharing — a browser security policy that blocks JavaScript on `domainA.com` from calling an API on `domainB.com` unless the API explicitly permits it. Add `CORSMiddleware` to FastAPI whenever a frontend app (React, Streamlit, etc.) running on a different origin needs to call your API.

**Q6: How do you test FastAPI endpoints without running a real server?**

Use `httpx.AsyncClient` with `ASGITransport(app=app)` — it sends requests directly to the ASGI app in-process without any network. Works with `pytest-asyncio`. For sync tests, use `fastapi.testclient.TestClient` (wraps `requests`).

**Q7: What HTTP status code does FastAPI return for Pydantic validation errors?**

**422 Unprocessable Entity** — FastAPI automatically catches `ValidationError` from Pydantic and returns a detailed 422 response listing which fields failed and why. You don't write any validation error handling code.

**Q8: What is Docker and why is it used for ML API deployment?**

Docker packages your app + Python runtime + dependencies into an immutable container image. This guarantees the app runs identically in dev, staging, and production regardless of the host OS. For ML APIs, it also makes scaling easy (spin up N containers behind a load balancer) and simplifies model file management via volume mounts.

---

## ⚠️ Common Mistakes

- **Loading the model at module level** — `model = pickle.load(...)` at the top of `main.py` loads the model on every import (including tests and workers), not during startup. Use the `lifespan` context manager instead.
- **Using `def` instead of `async def` for I/O-bound endpoints** — blocks the event loop, eliminating FastAPI's concurrency advantage; always `await` I/O operations in `async def`.
- **Not adding CORS middleware** — browser-based frontends will fail with CORS errors silently; add `CORSMiddleware` from day one.
- **Catching all exceptions and returning 200** — swallowing errors with `except: return {"error": ...}` with status 200 breaks API clients that check status codes; use `raise HTTPException` with proper codes.
- **Forgetting `conn.commit()` in Flask** — DML operations (INSERT/UPDATE/DELETE) are silently rolled back if you forget to commit the DB transaction.
- **Using `docker run` without volume mounts for model files** — the model file must be copied into the image during build (`COPY model.pkl .`) or mounted at runtime (`-v ./model.pkl:/app/model.pkl`), otherwise the container starts with no model.
- **Running uvicorn with `--reload` in production** — `--reload` watches the filesystem and restarts workers, which is a performance and security issue in production.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Choice</th><th>Why</th></tr>
<tr><td>Production ML REST API</td><td>FastAPI + uvicorn</td><td>Async, Pydantic validation, auto-docs</td></tr>
<tr><td>Quick throwaway script / internal tool</td><td>Flask</td><td>Less boilerplate</td></tr>
<tr><td>High-throughput inference</td><td>FastAPI + multiple workers</td><td>Async + worker pool</td></tr>
<tr><td>Browser frontend calling API</td><td>FastAPI + CORS middleware</td><td>Required for cross-origin browser requests</td></tr>
<tr><td>Background jobs (logging, DB writes)</td><td>FastAPI <code>BackgroundTasks</code></td><td>Fire-and-forget without blocking response</td></tr>
<tr><td>Heavy async tasks (email, image processing)</td><td>Celery + Redis</td><td>Distributed task queue</td></tr>
<tr><td>Containerized deployment</td><td>Docker + uvicorn</td><td>Reproducible environment</td></tr>
<tr><td>Multi-service deployment</td><td>docker-compose</td><td>Orchestrate API + DB + cache together</td></tr>
<tr><td>API testing without server</td><td><code>httpx.AsyncClient</code> • pytest</td><td>In-process ASGI testing</td></tr>
<tr><td>Manual API exploration</td><td><code>/docs</code> (Swagger UI)</td><td>Auto-generated, always in sync</td></tr>
</table>

---

## 📋 Completion Checklist

- Built a FastAPI app with at least one GET and one POST endpoint
- Defined Pydantic request and response models with field validation
- Loaded an ML model using the `lifespan` context manager
- Used `Depends()` for dependency injection (model getter)
- Added CORS middleware for browser access
- Tested endpoints via Swagger UI at `/docs`
- Written at least 2 pytest tests using `httpx.AsyncClient`
- Built a Docker image and ran the API in a container
