---
title: Week 1 — Travel Path (AI Foundations)
description: AI is software that learns patterns from data instead of following hand-coded rules. Learn the AI stack, the types of ML, and how LLMs tokenize and embed text.
---

> 🎯 TL;DR — AI is software that learns patterns from data instead of following hand-coded rules; understanding the AI stack, ML types, and how LLMs tokenize and embed text is the conceptual foundation every AI Engineer builds everything else on.

---

## 🧠 Mental Model

Traditional programming is a recipe — the chef (programmer) writes every step explicitly. Machine Learning is a restaurant critic — you show it thousands of meals (data), and it learns to judge quality on its own. Deep Learning is that critic after tasting ten million meals and developing an almost instinctive palate.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Supervised Learning</td><td>Training on labeled input-output pairs</td><td>Most production ML is supervised: spam detection, price prediction, image classification</td></tr>
<tr><td>Unsupervised Learning</td><td>Finding hidden structure in unlabeled data</td><td>Customer segmentation, anomaly detection, dimensionality reduction</td></tr>
<tr><td>Reinforcement Learning</td><td>Agent learns via reward/penalty signals</td><td>Powers game AI (AlphaGo), robotics, recommendation tuning</td></tr>
<tr><td>Neural Network</td><td>Layers of weighted connections that transform inputs</td><td>Building block of all deep learning and LLMs</td></tr>
<tr><td>Token</td><td>Smallest unit an LLM processes (~0.75 words)</td><td>LLM cost and context window limits are measured in tokens, not words</td></tr>
<tr><td>Embedding</td><td>Dense numeric vector representing meaning</td><td>Enables semantic search, RAG, and similarity comparisons</td></tr>
<tr><td>AI Engineer Role</td><td>Builds products using AI APIs and models</td><td>Distinct from ML Engineer (trains models); AI Engineers integrate and ship</td></tr>
<tr><td>Traditional vs ML</td><td>Rules + Data → Output vs Data + Output → Rules</td><td>ML inverts programming — the algorithm finds the rules</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. Identify problem type: regression (continuous output), classification (categorical output), clustering (no labels)
2. Collect and understand your data — quality data beats sophisticated algorithms every time
3. Choose the right ML paradigm: supervised, unsupervised, or reinforcement
4. Select a model appropriate to data size and problem type
5. Train: expose model to data, algorithm adjusts internal weights to minimize error
6. Evaluate on held-out test data — never evaluate on training data
7. Deploy: save model, build API, send new inputs → receive predictions
8. Monitor: models degrade as real-world data drifts from training data

---

## 💻 Code Cheatsheet

```python
# ================================================================
# WEEK 1 — AI FOUNDATIONS CODE CHEATSHEET
# ================================================================

# ── 1. AI DOMAIN HIERARCHY (as code structure) ──────────────────
"""
AI (Artificial Intelligence)
├── Machine Learning — learns patterns from structured data
│   ├── Supervised Learning   → labeled data, predict target
│   │   ├── Regression        → continuous output (salary, price)
│   │   └── Classification    → categorical output (spam/ham, disease/healthy)
│   ├── Unsupervised Learning → no labels, find structure
│   │   ├── Clustering        → group similar items
│   │   └── Dimensionality Reduction → compress features
│   └── Reinforcement Learning → reward-based, agent + environment
├── Deep Learning — multi-layer neural networks
│   ├── CNN → images, video
│   ├── RNN/LSTM → sequences, time series
│   └── Transformers → NLP, LLMs (GPT, Claude, Gemini)
├── NLP — text understanding and generation
└── Data Science — statistics + ML + visualization + business insight
"""

# ── 2. TRADITIONAL vs ML APPROACH ───────────────────────────────
# Traditional: you write the rules
def spam_traditional(email_text):
    """Programmer manually codes every rule"""
    keywords = ["free money", "click here", "winner", "lottery"]
    return any(kw in email_text.lower() for kw in keywords)

# ML: the algorithm LEARNS the rules from labeled examples
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import CountVectorizer

emails = [
    "Win free money now click here",
    "Meeting tomorrow at 9am",
    "Claim your lottery prize today",
    "Project update attached for review",
    "Free winner selected you have won"
]
labels = [1, 0, 1, 0, 1]  # 1=spam, 0=not spam

vectorizer = CountVectorizer()
X = vectorizer.fit_transform(emails)

model = MultinomialNB()
model.fit(X, labels)

# Model learned the rules — we didn't hardcode them
test = vectorizer.transform(["Free prize click now"])
print("Spam probability:", model.predict_proba(test)[0][1])  # ~0.95

# ── 3. THREE TYPES OF ML — QUICK DEMO ───────────────────────────
import numpy as np
from sklearn.datasets import make_classification, make_blobs
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans

# Supervised: labeled data → predict label
X_sup, y_sup = make_classification(n_samples=200, n_features=4, random_state=42)
clf = LogisticRegression()
clf.fit(X_sup[:160], y_sup[:160])
print("Supervised accuracy:", clf.score(X_sup[160:], y_sup[160:]))

# Unsupervised: no labels → find groups
X_unsup, _ = make_blobs(n_samples=300, centers=3, random_state=42)
kmeans = KMeans(n_clusters=3, random_state=42, n_init='auto')
kmeans.fit(X_unsup)
print("Cluster centers:\n", kmeans.cluster_centers_)

# ── 4. HOW LLMs WORK — TOKEN + EMBEDDING DEMO ───────────────────
# Tokenization: text → integer IDs
text = "AI Engineers build powerful products"

# Simplified tokenization (real LLMs use BPE/SentencePiece)
words = text.split()
vocab = {word: i for i, word in enumerate(set(words))}
token_ids = [vocab[w] for w in words]
print(f"Text   : {text}")
print(f"Tokens : {words}")
print(f"IDs    : {token_ids}")
# Real GPT-4: "AI" → token 15836, " Engineers" → 34780 (subword units)

# Embeddings: tokens → dense vectors (simplified demo)
import numpy as np
np.random.seed(42)
EMBEDDING_DIM = 4  # real models use 768, 1536, or 4096 dimensions

# Each token gets a vector; similar words have similar vectors
word_embeddings = {word: np.random.randn(EMBEDDING_DIM) for word in vocab}
for word, vec in word_embeddings.items():
    print(f"  '{word}': {np.round(vec, 2)}")

# In real LLMs: embeddings capture semantic meaning
# "king" - "man" + "woman" ≈ "queen" (famous Word2Vec example)

# ── 5. AI ENGINEER ROLE — CALLING AN LLM API ────────────────────
# This is what AI Engineers do daily — build apps on top of models
import json

def call_openai_api(prompt: str, api_key: str = "YOUR_KEY") -> str:
    """Template for calling any LLM API"""
    import urllib.request
    
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 200
    }).encode()
    
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
    return result["choices"][0]["message"]["content"]

# Usage (with real key):
# response = call_openai_api("Explain machine learning in one sentence")
# print(response)

# ── 6. PYTHON LIBRARIES FOR THE AI STACK ────────────────────────
"""
LAYER              LIBRARY              USE CASE
─────────────────────────────────────────────────────
Data Layer         numpy                Arrays, math
                   pandas               DataFrames, CSV/Excel
Visualization      matplotlib           Static charts
                   seaborn              Statistical plots
ML Layer           scikit-learn         Classical ML algorithms
Deep Learning      pytorch              Research + production DL
                   tensorflow/keras     Production DL
LLM APIs           openai               GPT-4 API
                   anthropic            Claude API
LLM Frameworks     langchain            LLM app pipelines
                   llama-index          RAG (retrieval augmented gen)
Deployment         fastapi              Serve models as REST APIs
                   docker               Containerize and ship
"""

# ── 7. THE COMPLETE ML DATA FLOW ─────────────────────────────────
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Step 1: Simulate real-world data
np.random.seed(42)
n = 500
df = pd.DataFrame({
    'age':         np.random.randint(22, 60, n),
    'salary':      np.random.randint(30000, 150000, n),
    'experience':  np.random.randint(0, 30, n),
    'hired':       np.random.randint(0, 2, n)  # target
})

# Step 2: Features and Target
X = df.drop('hired', axis=1)
y = df['hired']

# Step 3: Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Step 4: Scale
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)  # fit + transform on train
X_test_sc  = scaler.transform(X_test)       # transform ONLY on test

# Step 5: Train
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X_train_sc, y_train)

# Step 6: Evaluate
y_pred = model.predict(X_test_sc)
print(classification_report(y_test, y_pred, target_names=['Not Hired', 'Hired']))
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td><code>test_size</code></td><td>Fraction of data for testing</td><td>0.2 (20%) standard</td></tr>
<tr><td><code>random_state</code></td><td>Reproducibility seed</td><td>Any int; 42 is convention</td></tr>
<tr><td><code>n_estimators</code></td><td>Trees in random forest</td><td>50–500; start with 100</td></tr>
<tr><td><code>max_tokens</code></td><td>Max LLM output length</td><td>256 for answers, 2048 for essays</td></tr>
<tr><td><code>temperature</code></td><td>LLM creativity (0=deterministic, 2=wild)</td><td>0.7 for balanced responses</td></tr>
<tr><td><code>embedding_dim</code></td><td>Vector size for semantic representations</td><td>768 (BERT), 1536 (OpenAI)</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1:** What is the difference between AI, ML, and Deep Learning?

**A:** AI is the broad field of making machines intelligent. ML is a subset where machines learn from data without being explicitly programmed. Deep Learning is a subset of ML using multi-layer neural networks — it powers all modern LLMs and computer vision systems.

**Q2:** What are the three types of Machine Learning?

**A:** Supervised (labeled data → predict labels), Unsupervised (unlabeled data → find structure), and Reinforcement Learning (agent learns via reward/penalty signals from an environment).

**Q3:** What is a token in the context of LLMs?

**A:** A token is the smallest unit of text an LLM processes — roughly 0.75 words or 4 characters on average. "ChatGPT" is one token; "artificial intelligence" is three tokens. Token count determines API cost and fits within the model's context window limit.

**Q4:** What is an embedding?

**A:** A dense numerical vector (list of floats) that represents the semantic meaning of text. Similar meanings produce similar vectors, enabling operations like semantic search ("find documents about ML pricing" returns results even if none contain those exact words).

**Q5:** What is the fundamental difference between traditional programming and ML?

**A:** Traditional: Rules + Data → Output (programmer writes all logic). ML: Data + Output → Rules (algorithm discovers the rules automatically from labeled examples).

**Q6:** What does an AI Engineer do vs an ML Engineer?

**A:** ML Engineers build and train models. AI Engineers build products and systems using pre-trained models (via APIs like OpenAI, Anthropic). AI Engineers are more product-focused: RAG pipelines, chatbots, agents, integrations.

**Q7:** Why is Python the dominant language for AI?

**A:** Simple readable syntax, the largest scientific computing ecosystem (NumPy, Pandas, PyTorch, TensorFlow, Scikit-learn, HuggingFace), interactive Jupyter notebooks for exploration, and the largest community of AI practitioners and tutorials.

**Q8:** What is "garbage in, garbage out" in AI?

**A:** The quality of an ML model's output is bounded by the quality of its training data. A sophisticated algorithm trained on noisy, biased, or insufficient data will consistently produce poor predictions.

---

## ⚠️ Common Mistakes

- Confusing AI, ML, and DL — use precise language in interviews; they test whether you know the hierarchy
- Thinking more data always helps — bad data at scale makes models confidently wrong
- Evaluating model performance on training data — always evaluate on held-out test data
- Choosing the wrong ML type — applying classification algorithms to regression problems or vice versa
- Ignoring feature scaling — distance-based algorithms (SVM, KNN) require features on the same scale
- Skipping exploratory data analysis — building models before understanding the data distribution leads to wasted iteration
- Assuming LLMs "understand" — they predict statistically likely next tokens; they don't reason like humans

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Predict a number (salary, price, temperature)</td><td>Regression (Linear, Random Forest, XGBoost)</td></tr>
<tr><td>Predict a category (spam/ham, yes/no, disease type)</td><td>Classification (Logistic Regression, SVM, Neural Network)</td></tr>
<tr><td>Find groups in data without labels</td><td>Clustering (K-Means, DBSCAN, Hierarchical)</td></tr>
<tr><td>Build a chatbot or text product</td><td>LLM API (OpenAI, Anthropic) + LangChain</td></tr>
<tr><td>Search by meaning, not keywords</td><td>Embeddings + vector database</td></tr>
<tr><td>Process images or video</td><td>CNN (Convolutional Neural Network)</td></tr>
<tr><td>Time-series forecasting</td><td>LSTM, Transformer, or classical ARIMA</td></tr>
</table>

---

## 📋 Completion Checklist

- Explain AI vs ML vs DL in your own words in under 60 seconds
- List the 3 types of ML with one real-world example each
- Draw the AI domain hierarchy from memory
- Explain traditional vs ML approach with the spam detection example
- Run the spam classifier code above and see predictions
- Describe what a token is and estimate token count for a sentence
- Describe what an embedding is and one use case
- State the AI Engineer role vs ML Engineer vs Data Scientist clearly
