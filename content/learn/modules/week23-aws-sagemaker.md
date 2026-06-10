---
title: Week 23 — AWS SageMaker AI
description: How to train, deploy, and manage ML models on AWS SageMaker, and how to call managed LLMs like Claude through AWS Bedrock.
---

> 🎯 **TL;DR** — AWS SageMaker is the leading cloud ML platform. Use **Training Jobs** with `SKLearn`/`PyTorch` Estimators to train on managed GPU instances, **Endpoints** for real-time inference, **Batch Transform** for bulk scoring, **Pipelines** for MLOps automation, and **Bedrock** for managed LLMs (Claude, Llama, Titan). All data flows through **S3**. IAM roles control all access. Delete endpoints when not in use — they bill by the hour even when idle.

## 🧠 Mental Model

AWS SageMaker is like a **complete car manufacturing plant**. Raw materials (data) arrive at the loading dock (S3). Assembly lines (Training Jobs) build the cars (models) on managed machines. Quality control (Model Registry + Evaluation) approves each build. The showroom (Endpoints) displays finished cars for customers to test-drive (predictions). The conveyor belt (Pipelines) automates the whole factory flow. Bedrock is the premium car-sharing service — someone else built and maintains the luxury models (GPT, Claude), you just rent them by the mile (per token).

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Service</th><th>Purpose</th><th>Key SDK Class</th></tr>
<tr><td>SageMaker Studio</td><td>Full ML IDE in browser</td><td>UI only</td></tr>
<tr><td>Training Jobs</td><td>Train models on managed infrastructure</td><td><code>Estimator</code>, <code>SKLearn</code>, <code>PyTorch</code>, <code>HuggingFace</code></td></tr>
<tr><td>Endpoints</td><td>Real-time inference REST API</td><td><code>predictor = estimator.deploy()</code></td></tr>
<tr><td>Batch Transform</td><td>Offline bulk predictions (no endpoint needed)</td><td><code>estimator.transformer()</code></td></tr>
<tr><td>Model Registry</td><td>Version and approve models</td><td><code>ModelPackage</code>, <code>ModelPackageGroup</code></td></tr>
<tr><td>Pipelines</td><td>Automate ML workflows (CI/CD for ML)</td><td><code>Pipeline</code>, <code>TrainingStep</code>, <code>ProcessingStep</code></td></tr>
<tr><td>JumpStart</td><td>Pre-trained models ready to deploy</td><td><code>JumpStartModel</code></td></tr>
<tr><td>AWS Bedrock</td><td>Managed LLM API (Claude, Llama, Mistral)</td><td><code>boto3.client("bedrock-runtime")</code></td></tr>
<tr><td>S3</td><td>Store data, model artifacts</td><td><code>sess.upload_data()</code>, <code>boto3.client("s3")</code></td></tr>
<tr><td>ECR</td><td>Store custom Docker images</td><td><code>aws ecr push</code></td></tr>
<tr><td>CloudWatch</td><td>Logs, metrics, alerts</td><td>Auto-integrated with SageMaker</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Setup** — create IAM role with `AmazonSageMakerFullAccess`, configure AWS CLI with `aws configure`
2. **Prepare data** — upload CSVs/files to S3 with `sess.upload_data(path, key_prefix="data/")`
3. **Write training script** — `train.py` reads from `/opt/ml/input/data/`, saves model to `/opt/ml/model/`
4. **Create Estimator** — `SKLearn(entry_point="train.py", role=role, instance_type="ml.m5.xlarge")`
5. **Train** — `estimator.fit({"train": s3_train_path})` → runs on managed instance, auto-terminates
6. **Deploy endpoint** — `predictor = estimator.deploy(instance_type="ml.t2.medium")`
7. **Predict** — `predictor.predict(data)` → sends request to REST endpoint
8. **Delete endpoint** — `predictor.delete_endpoint()` → CRITICAL: endpoints bill until deleted
9. **Build Pipeline** — define `ProcessingStep` + `TrainingStep` + `RegisterModelStep` → `pipeline.start()`
10. **Use Bedrock** — `boto3.client("bedrock-runtime").invoke_model(modelId="anthropic.claude-3-5...", body=...)`

## 💻 Code Cheatsheet

```python
# ============================================================
# AWS SAGEMAKER COMPLETE CHEATSHEET — Production-ready patterns
# pip install sagemaker boto3 scikit-learn pandas
# aws configure  (set access key, secret key, region)
# ============================================================

import boto3
import sagemaker
import json
import os
import pandas as pd
import numpy as np
from pathlib import Path

# ── 1. SESSION AND ROLE SETUP ─────────────────────────────────
# In SageMaker Studio/Notebook — automatic role detection
sess = sagemaker.Session()
role = sagemaker.get_execution_role()  # IAM role ARN
region = sess.boto_region_name
bucket = sess.default_bucket()         # auto-created default S3 bucket

print(f"Role: {role}")
print(f"Region: {region}")
print(f"Default Bucket: {bucket}")

# Outside SageMaker (local machine)
boto_session = boto3.Session(
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)
sess = sagemaker.Session(boto_session=boto_session)
role = os.getenv("SAGEMAKER_ROLE_ARN")  # IAM role ARN

# ── 2. UPLOAD DATA TO S3 ──────────────────────────────────────
# Create sample data
df_train = pd.DataFrame({
    "feature1": np.random.randn(1000),
    "feature2": np.random.randn(1000),
    "feature3": np.random.rand(1000) * 100,
    "target": np.random.randint(0, 2, 1000)
})
df_test = df_train.sample(200)

df_train.to_csv("train.csv", index=False)
df_test.to_csv("test.csv", index=False)

# Upload to S3
train_s3 = sess.upload_data(path="train.csv", bucket=bucket, key_prefix="data/fraud/v1")
test_s3 = sess.upload_data(path="test.csv", bucket=bucket, key_prefix="data/fraud/v1")
print(f"Train data: {train_s3}")
print(f"Test data: {test_s3}")

# Direct S3 operations with boto3
s3_client = boto3.client("s3", region_name=region)

def upload_to_s3(local_path: str, bucket: str, s3_key: str) -> str:
    """Upload file to S3 and return s3:// URI."""
    s3_client.upload_file(local_path, bucket, s3_key)
    return f"s3://{bucket}/{s3_key}"

def download_from_s3(bucket: str, s3_key: str, local_path: str):
    """Download file from S3."""
    s3_client.download_file(bucket, s3_key, local_path)
    print(f"Downloaded s3://{bucket}/{s3_key} → {local_path}")

def list_s3_objects(bucket: str, prefix: str = "") -> list:
    """List objects in S3 bucket with prefix."""
    response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)
    return [obj["Key"] for obj in response.get("Contents", [])]


# ── 3. TRAINING SCRIPT (train.py) ────────────────────────────
# This file runs INSIDE the SageMaker training container
# Save as train.py and reference in entry_point

TRAIN_SCRIPT = """
import os, argparse, joblib, pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    # Hyperparameters passed by SageMaker
    parser.add_argument("--n_estimators", type=int, default=100)
    parser.add_argument("--max_depth", type=int, default=3)
    parser.add_argument("--learning_rate", type=float, default=0.1)
    
    # SageMaker passes these automatically
    parser.add_argument("--model_dir", type=str, default=os.environ.get("SM_MODEL_DIR", "/opt/ml/model"))
    parser.add_argument("--train", type=str, default=os.environ.get("SM_CHANNEL_TRAIN", "/opt/ml/input/data/train"))
    parser.add_argument("--test", type=str, default=os.environ.get("SM_CHANNEL_TEST", "/opt/ml/input/data/test"))
    args = parser.parse_args()
    
    # Load data from SageMaker input channels
    train_df = pd.read_csv(os.path.join(args.train, "train.csv"))
    test_df = pd.read_csv(os.path.join(args.test, "test.csv"))
    
    X_train = train_df.drop("target", axis=1)
    y_train = train_df["target"]
    X_test = test_df.drop("target", axis=1)
    y_test = test_df["target"]
    
    # Train model
    model = GradientBoostingClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    cv_scores = cross_val_score(model, X_train, y_train, cv=5)
    test_score = model.score(X_test, y_test)
    print(f"CV accuracy: {cv_scores.mean():.4f} (+/-{cv_scores.std():.4f})")
    print(f"Test accuracy: {test_score:.4f}")
    print(classification_report(y_test, model.predict(X_test)))
    
    # Save model to SageMaker model directory
    # SageMaker packages this as model.tar.gz to S3
    model_path = os.path.join(args.model_dir, "model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
"""

# Write training script
with open("train.py", "w") as f:
    f.write(TRAIN_SCRIPT)


# ── 4. SKLEARN ESTIMATOR + TRAINING JOB ──────────────────────
from sagemaker.sklearn import SKLearn

estimator = SKLearn(
    entry_point="train.py",
    role=role,
    instance_type="ml.m5.xlarge",    # CPU instance
    framework_version="1.2-1",
    py_version="py3",
    hyperparameters={
        "n_estimators": 200,
        "max_depth": 5,
        "learning_rate": 0.05
    },
    # Enable spot instances for ~70% cost savings
    use_spot_instances=True,
    max_wait=3600,        # max seconds to wait for spot
    max_run=1800,         # max training time
    output_path=f"s3://{bucket}/models/",
    base_job_name="fraud-detector"
)

# Submit training job (runs asynchronously on managed infra)
estimator.fit(
    inputs={
        "train": train_s3,
        "test": test_s3
    },
    wait=True,   # True = block until done; False = async
    logs="All"   # Print training logs
)

print(f"Training job: {estimator.latest_training_job.name}")
print(f"Model artifacts: {estimator.model_data}")  # s3://bucket/models/...


# ── 5. PYTORCH TRAINING JOB ───────────────────────────────────
from sagemaker.pytorch import PyTorch

pytorch_estimator = PyTorch(
    entry_point="train_pytorch.py",
    role=role,
    instance_type="ml.p3.2xlarge",    # GPU instance
    instance_count=1,
    framework_version="2.0.1",
    py_version="py310",
    hyperparameters={"epochs": 20, "batch_size": 64, "lr": 0.001},
    use_spot_instances=True,
    max_wait=7200,
    distribution={"torch_distributed": {"enabled": True}}  # multi-GPU
)
# pytorch_estimator.fit({"train": train_s3})


# ── 6. HUGGING FACE TRAINING ──────────────────────────────────
from sagemaker.huggingface import HuggingFace

hf_estimator = HuggingFace(
    entry_point="finetune.py",
    role=role,
    instance_type="ml.p3.2xlarge",
    transformers_version="4.36",
    pytorch_version="2.1",
    py_version="py310",
    hyperparameters={
        "model_name_or_path": "distilbert-base-uncased",
        "num_train_epochs": 3,
        "per_device_train_batch_size": 16,
        "output_dir": "/opt/ml/model"
    }
)


# ── 7. DEPLOY REAL-TIME ENDPOINT ──────────────────────────────
predictor = estimator.deploy(
    initial_instance_count=1,
    instance_type="ml.t2.medium",     # cheapest option for dev/testing
    # instance_type="ml.c5.large"     # CPU-optimized for production
    endpoint_name="fraud-detector-prod",
    serializer=sagemaker.serializers.CSVSerializer(),
    deserializer=sagemaker.deserializers.JSONDeserializer()
)
print(f"Endpoint: {predictor.endpoint_name}")

# Make predictions
test_data = [[1.5, -0.8, 45.2], [0.1, 2.3, 12.7]]
predictions = predictor.predict(test_data)
print(f"Predictions: {predictions}")

# IMPORTANT: Delete endpoint when done to stop billing!
predictor.delete_endpoint()
print("Endpoint deleted — billing stopped")

# Or update traffic/instance type without downtime:
# predictor.update_endpoint(instance_type="ml.c5.large", initial_instance_count=2)


# ── 8. SERVERLESS INFERENCE (scale-to-zero) ──────────────────
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=2048,    # 1024, 2048, 3072, 4096, 5120, 6144
    max_concurrency=10         # max simultaneous requests
)

serverless_predictor = estimator.deploy(
    serverless_inference_config=serverless_config,
    endpoint_name="fraud-serverless"
)
# Serverless: no idle cost, ~300ms cold start, pay per invocation
result = serverless_predictor.predict([[1.0, 2.0, 30.0]])
print(result)


# ── 9. BATCH TRANSFORM (no persistent endpoint) ──────────────
transformer = estimator.transformer(
    instance_count=1,
    instance_type="ml.m5.large",
    output_path=f"s3://{bucket}/batch_predictions/",
    accept="text/csv",
    assemble_with="Line"
)

# Run batch prediction on large dataset
transformer.transform(
    data=test_s3,
    content_type="text/csv",
    split_type="Line",    # process one line at a time
    wait=True
)
print(f"Batch predictions: {transformer.output_path}")


# ── 10. SAGEMAKER PIPELINES (MLOps) ──────────────────────────
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.steps import TrainingStep, ProcessingStep, TransformStep
from sagemaker.workflow.parameters import ParameterInteger, ParameterFloat, ParameterString
from sagemaker.workflow.model_step import ModelStep
from sagemaker.workflow.conditions import ConditionGreaterThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.functions import JsonGet
from sagemaker.processing import ScriptProcessor

# Pipeline parameters (can be overridden per run)
n_estimators = ParameterInteger(name="NEstimators", default_value=100)
accuracy_threshold = ParameterFloat(name="AccuracyThreshold", default_value=0.85)
instance_type = ParameterString(name="TrainingInstance", default_value="ml.m5.xlarge")

# Training step
step_train = TrainingStep(
    name="TrainFraudDetector",
    estimator=estimator,
    inputs={"train": sagemaker.inputs.TrainingInput(s3_data=train_s3)}
)

# Condition step — only register model if accuracy >= threshold
# (requires evaluation step to produce metrics JSON first)
# step_condition = ConditionStep(
#     name="CheckAccuracy",
#     conditions=[ConditionGreaterThanOrEqualTo(
#         left=JsonGet(step_train, property_file=eval_report, json_path="accuracy"),
#         right=accuracy_threshold
#     )],
#     if_steps=[step_register],
#     else_steps=[step_fail]
# )

pipeline = Pipeline(
    name="FraudDetectorMLOpsPipeline",
    parameters=[n_estimators, accuracy_threshold, instance_type],
    steps=[step_train],   # add more steps for full pipeline
    sagemaker_session=sess
)

pipeline.upsert(role_arn=role)   # create or update
execution = pipeline.start(
    parameters={"NEstimators": 200, "AccuracyThreshold": 0.90}
)
execution.wait()
print(f"Pipeline execution: {execution.arn}")


# ── 11. AWS BEDROCK — CLAUDE + OTHER LLMs ────────────────────
bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")

def call_claude_bedrock(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 1024,
    temperature: float = 0.1
) -> str:
    """Call Claude 3.5 Sonnet via AWS Bedrock."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    response = bedrock_client.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType="application/json",
        accept="application/json",
        body=body
    )
    
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]

# Basic call
answer = call_claude_bedrock("Explain SageMaker Pipelines in 3 sentences")
print(answer)

# Streaming response
def call_claude_streaming(prompt: str):
    """Stream Claude response token by token."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    response = bedrock_client.invoke_model_with_response_stream(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=body
    )
    
    for event in response["body"]:
        chunk = json.loads(event["chunk"]["bytes"])
        if chunk["type"] == "content_block_delta":
            print(chunk["delta"]["text"], end="", flush=True)
    print()

call_claude_streaming("Write a haiku about machine learning")

# List available foundation models
bedrock_mgmt = boto3.client("bedrock", region_name="us-east-1")
models = bedrock_mgmt.list_foundation_models(byProvider="Anthropic")
for m in models["modelSummaries"]:
    print(f"{m['modelId']}: {m['modelName']}")


# ── 12. LAMBDA FOR SERVERLESS LLM INFERENCE ──────────────────
# Save this as lambda_function.py and deploy as Lambda function
LAMBDA_CODE = """
import json, boto3, os

bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-east-1'))

def lambda_handler(event, context):
    # Parse input from API Gateway or direct invocation
    body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
    user_message = body.get('message', '')
    
    if not user_message:
        return {'statusCode': 400, 'body': json.dumps({'error': 'message is required'})}
    
    # Call Claude via Bedrock
    request_body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": user_message}]
    })
    
    try:
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=request_body
        )
        result = json.loads(response['body'].read())
        answer = result['content'][0]['text']
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'response': answer, 'model': 'claude-3-5-sonnet'})
        }
    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
"""

with open("lambda_function.py", "w") as f:
    f.write(LAMBDA_CODE)

# Deploy Lambda via CLI:
# zip function.zip lambda_function.py
# aws lambda create-function \
#   --function-name ai-chat-lambda \
#   --runtime python3.11 \
#   --handler lambda_function.lambda_handler \
#   --zip-file fileb://function.zip \
#   --role arn:aws:iam::ACCOUNT:role/lambda-bedrock-role \
#   --timeout 30 \
#   --memory-size 256


# ── 13. SAGEMAKER vs BEDROCK COMPARISON ──────────────────────
# SageMaker: Train, fine-tune, and deploy CUSTOM models
#   - You manage the model weights and training process
#   - Full control over training hyperparameters and architecture
#   - Can deploy any model (sklearn, PyTorch, HuggingFace, custom)
#   - Billed per training hour + endpoint uptime
#
# Bedrock: Use PRE-TRAINED foundation models as a managed API
#   - No training — just call the API with your prompt
#   - Models managed by providers (Anthropic, Meta, Amazon, etc.)
#   - No server management — fully serverless
#   - Billed per token (input + output)
#
# Rule of thumb:
#   → Bedrock: when you need Claude/Llama/Mistral for inference only
#   → SageMaker: when you need to train a custom model or fine-tune


# ── 14. COST MANAGEMENT ───────────────────────────────────────
# SageMaker Training: use spot instances (--use_spot_instances=True → 70% savings)
# SageMaker Endpoints: delete when not in use! ml.t2.medium = ~$0.05/hour = $36/month
# Serverless Inference: pay per invocation — no idle cost, ~300ms cold start
# Batch Transform: cheapest for large offline jobs — no persistent endpoint
# Bedrock: billed per token — use claude-3-haiku ($0.25/M tokens) vs sonnet ($3/M tokens)

# Set up billing alerts
cloudwatch = boto3.client("cloudwatch", region_name="us-east-1")
cloudwatch.put_metric_alarm(
    AlarmName="SageMaker-Monthly-Cost-Alert",
    ComparisonOperator="GreaterThanThreshold",
    EvaluationPeriods=1,
    MetricName="EstimatedCharges",
    Namespace="AWS/Billing",
    Period=86400,
    Statistic="Maximum",
    Threshold=50.0,   # Alert if charges exceed $50
    AlarmActions=["arn:aws:sns:us-east-1:ACCOUNT:billing-alerts"]
)
```

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Component</th><th>Options</th><th>Effect</th></tr>
<tr><td><code>instance_type</code></td><td>Training / Endpoint</td><td><code>ml.m5.xlarge</code> (CPU), <code>ml.p3.2xlarge</code> (GPU)</td><td>Compute power and cost</td></tr>
<tr><td><code>use_spot_instances</code></td><td>Estimator</td><td><code>True</code>/<code>False</code></td><td><code>True</code> = up to 70% cheaper, may be interrupted</td></tr>
<tr><td><code>max_wait</code></td><td>Estimator</td><td>seconds</td><td>Max time to wait for spot instance</td></tr>
<tr><td><code>framework_version</code></td><td>SKLearn/PyTorch</td><td><code>"1.2-1"</code>, <code>"2.0.1"</code></td><td>Must match your library version</td></tr>
<tr><td><code>initial_instance_count</code></td><td>deploy()</td><td><code>1</code>–<code>N</code></td><td>Number of endpoint instances</td></tr>
<tr><td><code>memory_size_in_mb</code></td><td>Serverless</td><td><code>1024</code>–<code>6144</code></td><td>Memory for serverless inference</td></tr>
<tr><td><code>max_concurrency</code></td><td>Serverless</td><td><code>1</code>–<code>200</code></td><td>Max parallel serverless requests</td></tr>
<tr><td><code>split_type</code></td><td>Batch Transform</td><td><code>"Line"</code>, <code>"TFRecord"</code></td><td>How to split input data</td></tr>
<tr><td><code>max_tokens</code></td><td>Bedrock</td><td><code>1</code>–<code>8192</code></td><td>Cap Claude response length</td></tr>
<tr><td><code>temperature</code></td><td>Bedrock</td><td><code>0.0</code>–<code>1.0</code></td><td>Determinism of Claude responses</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What is the difference between SageMaker and AWS Bedrock?**

SageMaker: for training, fine-tuning, and deploying custom models — you control everything about the model. Bedrock: managed API for pre-trained foundation models (Claude, Llama, Titan) — no training, just inference via API. Use SageMaker for custom ML, use Bedrock when you need Claude or Llama out-of-the-box for LLM inference.

**Q2: How does a SageMaker Training Job work?**

You define an `Estimator` pointing to your `train.py` script, an S3 path for training data, and an EC2 instance type. SageMaker: (1) spins up the instance, (2) pulls the framework container from ECR, (3) downloads data from S3 to `/opt/ml/input/data/`, (4) runs your script, (5) packages `/opt/ml/model/` as `model.tar.gz` and uploads to S3, (6) terminates the instance. You only pay while it runs.

**Q3: What are spot instances in SageMaker and when should you use them?**

Spot instances use unused AWS capacity at up to 70% discount but can be interrupted mid-training. SageMaker handles interruptions via checkpointing — set `checkpoint_s3_uri` and your training script saves progress periodically. Use for any training job > 30 minutes where the savings outweigh the interruption risk. Not for endpoints (real-time inference requires stability).

**Q4: What is the difference between SageMaker Endpoints and Serverless Inference?**

Endpoints: persistent instances (ml.t2.medium costs ~$0.05/hour) that stay running — low latency (~50ms), bill even when idle. Serverless Inference: scale-to-zero, bill per invocation, ~300ms cold start for first request after idle. Use endpoints when you have steady traffic (>1000 req/day); use serverless for sporadic or dev/test workloads.

**Q5: How do you call Claude via AWS Bedrock from Python?**

Use `boto3.client("bedrock-runtime")` then `invoke_model(modelId="anthropic.claude-3-5-sonnet-20241022-v2:0", body=json.dumps({...}))`. The body must include `anthropic_version`, `max_tokens`, and `messages`. Parse response with `json.loads(response["body"].read())["content"][0]["text"]`. IAM role needs `bedrock:InvokeModel` permission.

**Q6: What is SageMaker Pipelines and why use it instead of a Python script?**

Pipelines define ML workflows as DAGs (directed acyclic graphs) of steps (Processing, Training, Evaluation, Register, Deploy). Unlike scripts: steps are cached (re-use output if inputs unchanged), runs are versioned and auditable in SageMaker Studio, can be triggered by EventBridge on a schedule, and each step runs in its own managed container. Essential for production MLOps.

**Q7: How do you version and manage models in SageMaker?**

Use the **Model Registry** — register models with `RegisterModel` step in a pipeline. Models have an approval status (`PendingManualApproval`, `Approved`, `Rejected`). Only approved models get deployed. Each version tracks its training job, metrics, and artifact URI. Use model groups to organize versions of the same model family.

**Q8: How do you reduce SageMaker costs in production?**

(1) Spot instances for training (70% savings). (2) Delete endpoints when not needed — they bill 24/7. (3) Use Serverless Inference for low-traffic endpoints. (4) Use Batch Transform for non-realtime scoring. (5) Choose smaller instance types — start with `ml.t2.medium` for endpoints, upgrade only if needed. (6) Use `gzip` compression on training data in S3. (7) Set CloudWatch billing alerts.

## ⚠️ Common Mistakes

- **Not deleting endpoints** — SageMaker endpoints bill continuously (24/7) even with zero traffic; always call `predictor.delete_endpoint()` after testing
- **Using on-demand instances for training** — spot instances save 70% for identical compute; always use `use_spot_instances=True` for jobs > 30 minutes
- **Hardcoding S3 paths** — use `sess.default_bucket()` and `sess.upload_data()` instead of hardcoded bucket names; this breaks across accounts and regions
- **Wrong IAM role permissions** — your SageMaker execution role needs `AmazonSageMakerFullAccess` + S3 read/write on your data bucket + `bedrock:InvokeModel` for Bedrock
- **Not reading from `/opt/ml/input/data/` in train.py** — SageMaker downloads S3 data to this path; hardcoding local paths means the training job fails
- **Not saving model to `/opt/ml/model/` in train.py** — SageMaker packages this directory as the model artifact; models saved elsewhere are lost when the instance terminates
- **Using `wait=False` without tracking job** — async training (`wait=False`) is fine, but you must track the job name and poll status; use `estimator.latest_training_job.wait()` before deploying

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>SageMaker Service</th></tr>
<tr><td>Train custom sklearn/XGBoost model</td><td><code>SKLearn</code> or <code>XGBoost</code> Estimator</td></tr>
<tr><td>Fine-tune HuggingFace transformer</td><td><code>HuggingFace</code> Estimator</td></tr>
<tr><td>Train on GPU</td><td><code>ml.p3.2xlarge</code> instance type</td></tr>
<tr><td>Real-time REST API inference</td><td><code>estimator.deploy()</code> → Endpoint</td></tr>
<tr><td>Scale-to-zero (no idle cost)</td><td><code>ServerlessInferenceConfig</code></td></tr>
<tr><td>Large offline batch scoring</td><td><code>estimator.transformer()</code> → Batch Transform</td></tr>
<tr><td>Automate train → eval → deploy</td><td>SageMaker Pipelines</td></tr>
<tr><td>Use Claude/Llama without training</td><td>AWS Bedrock <code>invoke_model</code></td></tr>
<tr><td>Serverless event-triggered inference</td><td>AWS Lambda + Bedrock</td></tr>
<tr><td>Cost-saving training</td><td><code>use_spot_instances=True</code></td></tr>
</table>

## 📋 Completion Checklist

- Configure AWS CLI and SageMaker session; print role ARN, region, and default bucket
- Upload training data to S3 with `sess.upload_data()` and verify the S3 URI
- Write a `train.py` that reads from `/opt/ml/input/data/` and saves model to `/opt/ml/model/`
- Train with `SKLearn` Estimator using spot instances (`use_spot_instances=True`)
- Deploy to an endpoint and make predictions, then delete the endpoint
- Run a Batch Transform job on test data and verify output in S3
- Call Claude via `boto3.client("bedrock-runtime")` with streaming response
- Build a Lambda function that calls Bedrock and returns a JSON response
