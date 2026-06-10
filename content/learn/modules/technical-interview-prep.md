---
title: Technical Interview Preparation for AI/ML Roles
description: Interview formats at top AI companies, the ML theory questions interviewers actually ask, system design frameworks, and from-scratch coding problems with model answers.
---

> 🎯 **TL;DR** — This cheat sheet covers the exact format of AI/ML technical interviews at top companies, the 50 ML theory questions interviewers actually ask, system design frameworks for AI, and from-scratch coding problems — with model answers.

---

## 📋 Interview Format by Company Type

<table>
<tr><th>Company</th><th>Coding Round</th><th>ML Theory</th><th>System Design</th><th>Take-Home</th><th>Notes</th></tr>
<tr><td>Anthropic</td><td>Medium LeetCode</td><td>Heavy — transformers, RLHF</td><td>LLM system design</td><td>Yes (ML project)</td><td>Focus on safety + reasoning</td></tr>
<tr><td>Google / DeepMind</td><td>Hard LeetCode</td><td>Strong ML fundamentals</td><td>Large-scale ML systems</td><td>Rare</td><td>Strong DSA required</td></tr>
<tr><td>Meta AI</td><td>Medium LeetCode</td><td>NLP + Recommendation systems</td><td>Feed ranking, ads ML</td><td>Rare</td><td>Practical + scale-focused</td></tr>
<tr><td>OpenAI</td><td>Medium LeetCode</td><td>LLM internals, training</td><td>LLM deployment</td><td>Sometimes</td><td>Reasoning ability weighted high</td></tr>
<tr><td>Startups (Series A–C)</td><td>Easy–Medium</td><td>Practical ML knowledge</td><td>Simple API + ML design</td><td>Often</td><td>Code quality + shipping speed</td></tr>
<tr><td>Indian product cos</td><td>Easy LeetCode</td><td>ML basics + Python</td><td>Not always</td><td>Sometimes</td><td>Strong Python + SQL expected</td></tr>
</table>

---

## 🔢 Step-by-Step: How to Approach a Technical Interview

1. **Clarify** — Repeat the problem back, ask 1–2 clarifying questions before coding.
2. **Plan out loud** — Explain your approach before writing a single line. Say: "My approach is X because Y."
3. **Start simple** — Write the brute-force solution first, then optimize. Never start with the most complex version.
4. **Test as you write** — Walk through an example with your own code before saying "done."
5. **Communicate trade-offs** — "This is O(n²) time. We could improve it to O(n log n) with X, but I'll start here."
6. **Handle edge cases** — empty input, nulls, duplicates, very large inputs.
7. **Ask for feedback** — "Is this the direction you were looking for? Should I optimize further?"

---

## 💡 Templates & Scripts

### ML System Design Framework: "CRAP"

Use this structure for any ML system design question:

```
C — Clarify the problem
   • What is the exact ML task? (classification, ranking, generation, retrieval)
   • What is scale? (QPS, users, data volume)
   • What are the latency constraints?
   • Online (real-time) or offline (batch)?

R — Raw Data & Features
   • What data do we have? How is it collected and labeled?
   • What features matter most? How do we compute them at scale?
   • Feature store? Real-time vs precomputed?

A — Algorithm & Model
   • Which model family fits? (classical ML, deep learning, LLM, retrieval)
   • How do we train? (full training, fine-tuning, prompting)
   • How do we evaluate offline? (metrics, holdout set, A/B test)

P — Production & Monitoring
   • How do we serve? (API, batch, edge)
   • How do we handle model drift?
   • How do we roll back safely?
   • What are the failure modes?
```

### Design a RAG System (Model Answer)

```
Clarify: Document Q&A for [use case]. Need <2s latency, 10K users.

Ingestion Pipeline:
→ Documents parsed (PyMuPDF / Docling)
→ Chunked (512 tokens, 10% overlap)
→ Embedded (text-embedding-3-small or all-MiniLM)
→ Stored in vector DB (ChromaDB for dev, Pinecone for prod)

Query Pipeline:
→ User query → embed → cosine similarity search → top-K chunks retrieved
→ Chunks + query → LLM prompt → streamed response

Key Design Decisions:
• Chunk size: 512 tokens balances context window vs. precision
• Reranking: Add cross-encoder reranker after retrieval for accuracy
• Metadata filtering: Filter by date/source before vector search
• Hybrid search: BM25 + vector search (better than either alone)

Production:
• Cache frequent queries (Redis)
• Log queries + retrieved chunks for monitoring
• Measure: retrieval precision, answer faithfulness (RAGAs framework)
• Fallback: if confidence < threshold, say "I couldn't find this in the documents"
```

### Design an LLM-Powered Chatbot (Model Answer)

```
Components:
1. Conversation memory: last N turns in context window (short-term), 
   summarized history in vector DB (long-term)
2. Tool use: web search, calculator, code execution (via function calling)
3. Safety layer: input filtering + output moderation
4. Response streaming: SSE or WebSockets for real-time feel

Serving: FastAPI → Anthropic/OpenAI API → SSE response → React frontend
Scaling: Stateless API + session state in Redis. Rate limit per user.
Monitoring: Log all turns. Track: latency, token usage, user ratings.
```

### From-Scratch Coding: K-Means (Python)

```python
import numpy as np

def kmeans(X, k, max_iters=100):
    # Initialize centroids randomly from data points
    centroids = X[np.random.choice(len(X), k, replace=False)]
    
    for _ in range(max_iters):
        # Assign each point to nearest centroid
        distances = np.linalg.norm(X[:, None] - centroids, axis=2)
        labels = np.argmin(distances, axis=1)
        
        # Update centroids
        new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(k)])
        
        # Check for convergence
        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids
    
    return labels, centroids
```

### From-Scratch Coding: Gradient Descent (Python)

```python
def gradient_descent(X, y, lr=0.01, epochs=1000):
    m, n = X.shape
    theta = np.zeros(n)
    
    for _ in range(epochs):
        predictions = X @ theta
        errors = predictions - y
        gradient = (X.T @ errors) / m
        theta -= lr * gradient
    
    return theta
```

### From-Scratch Coding: Linear Regression with MSE

```python
def linear_regression_fit(X, y):
    # Closed-form: theta = (X^T X)^(-1) X^T y
    return np.linalg.pinv(X.T @ X) @ X.T @ y

def predict(X, theta):
    return X @ theta

def mse(y_true, y_pred):
    return np.mean((y_true - y_pred) ** 2)
```

---

## 🎤 Practice Q&A — Top 50 ML Theory Questions

### ML Fundamentals (Must Know)

<table>
<tr><th>Question</th><th>Model Answer (1–3 lines)</th></tr>
<tr><td>Bias-variance trade-off</td><td>High bias = underfitting (too simple). High variance = overfitting (too complex). Goal: minimize both. Regularization reduces variance; more data / more complex model reduces bias.</td></tr>
<tr><td>What is gradient descent?</td><td>Optimization algorithm that iteratively moves model parameters in the direction that decreases loss. Step size = learning rate.</td></tr>
<tr><td>L1 vs L2 regularization?</td><td>L1 (Lasso) produces sparse weights (feature selection). L2 (Ridge) shrinks all weights. L1 good when you suspect many irrelevant features.</td></tr>
<tr><td>What is cross-validation?</td><td>Split data into K folds. Train on K-1, test on 1. Repeat K times. More reliable than single train/test split.</td></tr>
<tr><td>How do you handle imbalanced data?</td><td>Resample (oversample minority / undersample majority), use class weights, use precision-recall metrics instead of accuracy, try SMOTE.</td></tr>
<tr><td>What is data leakage?</td><td>When information from test/future data leaks into training. Fix: apply all preprocessing (scaling, encoding) inside the CV fold, never on the full dataset.</td></tr>
<tr><td>Precision vs Recall?</td><td>Precision = "of all predicted positives, how many are real?" Recall = "of all real positives, how many did I catch?" High recall for fraud/cancer detection. High precision for spam filters.</td></tr>
<tr><td>What is ROC-AUC?</td><td>AUC = area under the ROC curve. Measures model's ability to distinguish classes at all thresholds. AUC 0.5 = random, 1.0 = perfect.</td></tr>
<tr><td>How does Random Forest reduce variance?</td><td>Trains many decision trees on random data subsets with random feature subsets (bagging + feature randomness), then averages predictions. Variance cancels out.</td></tr>
<tr><td>What is XGBoost?</td><td>Gradient boosted trees — each tree corrects errors of the previous. Faster and more regularized than vanilla gradient boosting.</td></tr>
</table>

### Deep Learning

<table>
<tr><th>Question</th><th>Model Answer</th></tr>
<tr><td>What is backpropagation?</td><td>Algorithm to compute gradients of loss with respect to all parameters using the chain rule. Propagates error signal backward through the network.</td></tr>
<tr><td>What is the vanishing gradient problem?</td><td>Gradients become extremely small in early layers of deep networks (especially with sigmoid/tanh), making learning stall. Fixed by: ReLU, residual connections (ResNets), batch norm.</td></tr>
<tr><td>What is batch normalization?</td><td>Normalizes activations within each mini-batch. Speeds training, reduces sensitivity to initialization, acts as light regularizer.</td></tr>
<tr><td>What is dropout?</td><td>Randomly zeroes out neurons during training (e.g., 20% of neurons per forward pass). Forces redundancy, reduces overfitting. Disabled at inference.</td></tr>
<tr><td>CNN vs RNN?</td><td>CNN: good for local spatial/temporal patterns (images, short sequences). RNN: good for long sequences but struggles with long-range dependencies. Transformers now outperform both.</td></tr>
</table>

### NLP / LLMs

<table>
<tr><th>Question</th><th>Model Answer</th></tr>
<tr><td>What is the transformer architecture?</td><td>Encoder-decoder (or decoder-only) architecture using self-attention. Each token attends to all other tokens. Parallelizable — replaced RNNs for NLP.</td></tr>
<tr><td>What is self-attention?</td><td>Each token computes a weighted sum of all other tokens' values. Weights = softmax(QKᵀ/√d). Allows model to capture relationships between any two tokens regardless of distance.</td></tr>
<tr><td>BERT vs GPT?</td><td>BERT = encoder only, bidirectional, good for classification/understanding. GPT = decoder only, autoregressive, good for generation.</td></tr>
<tr><td>What is RLHF?</td><td>Reinforcement Learning from Human Feedback. Humans rank model outputs → reward model trained on rankings → LLM fine-tuned with RL to maximize reward. Makes models more helpful and safe.</td></tr>
<tr><td>What is RAG?</td><td>Retrieve relevant documents from a knowledge base at query time, inject them into the LLM prompt. Reduces hallucinations, enables up-to-date and private knowledge.</td></tr>
<tr><td>What is fine-tuning vs prompting?</td><td>Fine-tuning: updates model weights on new data (expensive, better for specialized tasks). Prompting: no weight update (cheap, good for general tasks). LoRA/QLoRA = parameter-efficient fine-tuning.</td></tr>
<tr><td>What is LoRA?</td><td>Low-Rank Adaptation — instead of updating all weights, adds small trainable rank-decomposition matrices. 100x fewer parameters to train. Standard method for fine-tuning LLMs.</td></tr>
</table>

### AI Agents & RAG

<table>
<tr><th>Question</th><th>Model Answer</th></tr>
<tr><td>What is the ReAct pattern?</td><td>Reasoning + Acting. LLM iterates: Think → Act (call tool) → Observe (see result) → repeat. Allows multi-step problem solving.</td></tr>
<tr><td>What is LangGraph?</td><td>Framework for building stateful AI agent workflows as directed graphs. Each node is an agent/tool step. Good for multi-agent, branching, and loop-based workflows.</td></tr>
<tr><td>RAG vs fine-tuning — when to use each?</td><td>RAG: when knowledge changes frequently or is large. Fine-tuning: when you need a specific style, format, or reasoning pattern baked into the model.</td></tr>
<tr><td>What is chunking strategy?</td><td>How you split documents for embedding. Key choices: chunk size (128–1024 tokens), overlap (10–20%), semantic vs. fixed-size splitting. Larger chunks = more context; smaller = more precision.</td></tr>
</table>

---

## ⚠️ Common Mistakes to Avoid

- **Jumping to code without clarifying** — spend 2 minutes clarifying before writing anything
- **Silence during thinking** — narrate your thought process, even when uncertain
- **Only knowing theory, not implementation** — practice writing k-means, GD from scratch
- **Ignoring system design** — companies at all levels now expect ML system design
- **LeetCode Hard obsession** — most AI roles test Medium-level DSA; depth in ML matters more
- **Not knowing your own resume projects** — expect deep follow-up on anything you listed
- **Saying "I haven't used that"** — follow with "but here's how I'd approach learning/using it"

---

## 🚀 Quick Reference: DSA Topics for AI Interviews

<table>
<tr><th>Must Know</th><th>Nice to Know</th><th>Skip (for AI roles)</th></tr>
<tr><td>Arrays, strings, hash maps</td><td>Trees and graphs (BFS/DFS)</td><td>Advanced graph algorithms</td></tr>
<tr><td>Sorting (merge sort, quick sort)</td><td>Two pointers, sliding window</td><td>Segment trees, Fenwick trees</td></tr>
<tr><td>Binary search</td><td>Dynamic programming (basic)</td><td>Bit manipulation</td></tr>
<tr><td>Recursion</td><td>Heap / priority queue</td><td>Advanced DP</td></tr>
</table>

**Target**: 30 LeetCode Mediums + 10 Easys before interviews. Track in a spreadsheet.

---

## 📋 Action Checklist

- Memorize the CRAP framework and apply it to 3 system design questions
- Answer all 10 ML Fundamentals questions without looking at answers
- Implement K-Means, Gradient Descent, and Linear Regression from scratch (no libraries)
- Design a RAG system on paper — draw the architecture diagram
- Complete 20 LeetCode Easy/Medium problems (focus: arrays, hash maps, binary search)
- Do one timed mock interview with a friend (45 minutes, whiteboard-style)
- Study transformer architecture until you can explain self-attention in 60 seconds
- Research the specific interview style of your top 3 target companies
