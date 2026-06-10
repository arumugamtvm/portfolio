---
title: Technical Concepts & Resources — Master Reference
description: One-line definitions for 100+ AI terms, key papers, essential libraries, tool comparisons, and the best free learning resources in one place.
---

> 🎯 **TL;DR** — Your master quick-reference for every AI concept you need to know. One-line definitions for 100+ terms, key papers with one-line summaries, the best free resources, and a tools comparison table — everything in one place.

---

## 📋 Core Concept Map

<table>
<tr><th>Layer</th><th>Key Concepts</th><th>Tools / Frameworks</th></tr>
<tr><td>Data</td><td>Embeddings, tokenization, chunking, vector DB</td><td>Pandas, NumPy, HuggingFace Datasets</td></tr>
<tr><td>Models</td><td>LLM, fine-tuning, LoRA, RLHF, quantization</td><td>PyTorch, HuggingFace Transformers</td></tr>
<tr><td>Application</td><td>RAG, agents, function calling, prompt engineering</td><td>LangChain, LangGraph, LlamaIndex</td></tr>
<tr><td>Serving</td><td>FastAPI, Docker, cloud deployment, monitoring</td><td>FastAPI, Docker, AWS/GCP/Azure, MLflow</td></tr>
<tr><td>Evaluation</td><td>Metrics, RAGAs, A/B testing, model drift</td><td>RAGAs, Evidently AI, Weights & Biases</td></tr>
</table>

---

## 🔢 AI Engineer Learning Roadmap (9 Stages)

1. **Python & SQL** — pandas, numpy, sql queries, APIs
2. **Statistics** — probability, distributions, hypothesis testing, regression
3. **Classical ML** — sklearn, supervised/unsupervised, model evaluation
4. **Deep Learning** — PyTorch, neural nets, CNNs, backprop
5. **NLP** — tokenization, embeddings, transformers, HuggingFace
6. **LLMs** — prompt engineering, fine-tuning, LoRA, API usage
7. **AI Agents** — ReAct, LangChain, LangGraph, tool calling
8. **MLOps** — MLflow, Docker, FastAPI, deployment, monitoring
9. **Cloud** — AWS SageMaker / GCP Vertex AI / Azure ML

---

## 💡 Master Glossary — 100+ Terms (One-Line Definitions)

### Core AI/ML Terms

<table>
<tr><th>Term</th><th>One-Line Definition</th></tr>
<tr><td>Machine Learning</td><td>Systems that learn patterns from data without being explicitly programmed</td></tr>
<tr><td>Supervised Learning</td><td>Train on labeled (input, output) pairs to predict outputs for new inputs</td></tr>
<tr><td>Unsupervised Learning</td><td>Find structure in unlabeled data (clustering, dimensionality reduction)</td></tr>
<tr><td>Reinforcement Learning</td><td>Agent learns by taking actions and receiving rewards/penalties</td></tr>
<tr><td>Neural Network</td><td>Layers of interconnected nodes that learn hierarchical representations</td></tr>
<tr><td>Deep Learning</td><td>Neural networks with many layers — enables learning complex patterns</td></tr>
<tr><td>Feature Engineering</td><td>Transforming raw data into informative inputs for ML models</td></tr>
<tr><td>Overfitting</td><td>Model memorizes training data, fails to generalize to new data</td></tr>
<tr><td>Underfitting</td><td>Model too simple to capture the underlying patterns in data</td></tr>
<tr><td>Regularization</td><td>Technique to penalize model complexity and reduce overfitting (L1, L2, dropout)</td></tr>
<tr><td>Cross-Validation</td><td>Evaluate model performance on multiple train/test splits of the data</td></tr>
<tr><td>Gradient Descent</td><td>Optimization algorithm that minimizes loss by moving in the direction of steepest descent</td></tr>
<tr><td>Backpropagation</td><td>Algorithm to compute gradients of loss w.r.t. all model parameters via chain rule</td></tr>
<tr><td>Bias-Variance Tradeoff</td><td>Trade-off between underfitting (high bias) and overfitting (high variance)</td></tr>
<tr><td>Ensemble Method</td><td>Combine multiple models to get better predictions (Random Forest, XGBoost)</td></tr>
<tr><td>Bagging</td><td>Train models on random subsets of data in parallel, average results (reduces variance)</td></tr>
<tr><td>Boosting</td><td>Train models sequentially, each correcting previous errors (reduces bias)</td></tr>
<tr><td>Transfer Learning</td><td>Use pretrained model weights as starting point for a new, related task</td></tr>
<tr><td>Data Augmentation</td><td>Artificially expand training data by applying transformations (flip, crop, noise)</td></tr>
<tr><td>Class Imbalance</td><td>When one class has far fewer examples — requires special handling</td></tr>
</table>

### LLM-Specific Terms

<table>
<tr><th>Term</th><th>One-Line Definition</th></tr>
<tr><td>LLM</td><td>Large Language Model — transformer trained on massive text to predict next tokens</td></tr>
<tr><td>Token</td><td>Smallest unit of text the model processes — roughly 0.75 words on average</td></tr>
<tr><td>Context Window</td><td>Maximum number of tokens (input + output) an LLM can process in one call</td></tr>
<tr><td>Temperature</td><td>Controls randomness of output — higher = more creative, lower = more deterministic</td></tr>
<tr><td>Top-p (Nucleus Sampling)</td><td>Sample from smallest set of tokens whose cumulative probability ≥ p</td></tr>
<tr><td>Tokenization</td><td>Splitting text into tokens (subwords) — BPE, WordPiece, SentencePiece</td></tr>
<tr><td>Embedding</td><td>Dense vector representation of text capturing semantic meaning</td></tr>
<tr><td>Attention Mechanism</td><td>Each token attends to all others — captures long-range dependencies</td></tr>
<tr><td>Self-Attention</td><td>Attention within the same sequence — computes Q, K, V from same input</td></tr>
<tr><td>Multi-Head Attention</td><td>Run attention multiple times in parallel with different projections, concatenate</td></tr>
<tr><td>Positional Encoding</td><td>Adds position information to tokens (transformers are permutation-invariant)</td></tr>
<tr><td>BERT</td><td>Bidirectional encoder — reads left and right context, good for understanding tasks</td></tr>
<tr><td>GPT</td><td>Generative Pretrained Transformer — decoder-only, causal, good for generation</td></tr>
<tr><td>T5</td><td>Text-to-Text Transfer Transformer — frames all NLP tasks as text-to-text</td></tr>
<tr><td>Instruction Tuning</td><td>Fine-tune base LLM on (instruction, response) pairs to follow user directions</td></tr>
<tr><td>RLHF</td><td>Reinforcement Learning from Human Feedback — trains LLMs to be helpful and safe</td></tr>
<tr><td>Constitutional AI</td><td>Anthropic's method: model critiques itself against a set of principles</td></tr>
<tr><td>Hallucination</td><td>Model generates plausible but factually incorrect information</td></tr>
<tr><td>Grounding</td><td>Tying LLM outputs to retrieved facts/documents to reduce hallucinations</td></tr>
<tr><td>System Prompt</td><td>Instructions set before user conversation — defines model role and behavior</td></tr>
<tr><td>Few-Shot Prompting</td><td>Give model 2–5 examples in the prompt to guide behavior</td></tr>
<tr><td>Chain-of-Thought</td><td>Prompt model to "think step by step" — improves multi-step reasoning</td></tr>
<tr><td>Prompt Engineering</td><td>Craft prompts to elicit specific, high-quality outputs from LLMs</td></tr>
<tr><td>Function Calling</td><td>Structured API for LLMs to output tool calls as JSON schemas</td></tr>
<tr><td>Structured Output</td><td>Force LLM to output valid JSON/XML matching a schema</td></tr>
</table>

### RAG & Vector DB Terms

<table>
<tr><th>Term</th><th>One-Line Definition</th></tr>
<tr><td>RAG</td><td>Retrieval-Augmented Generation — retrieve relevant docs, inject into LLM prompt</td></tr>
<tr><td>Vector Database</td><td>Database optimized for ANN search over high-dimensional embedding vectors</td></tr>
<tr><td>ANN Search</td><td>Approximate Nearest Neighbor — fast (not exact) similarity search</td></tr>
<tr><td>Cosine Similarity</td><td>Dot product of normalized vectors — measures angle between embeddings</td></tr>
<tr><td>Chunking</td><td>Splitting documents into smaller pieces for embedding and retrieval</td></tr>
<tr><td>Semantic Search</td><td>Search by meaning (embedding similarity) rather than keyword matching</td></tr>
<tr><td>Hybrid Search</td><td>Combine keyword (BM25) + semantic (vector) search for better retrieval</td></tr>
<tr><td>Reranking</td><td>Second-pass model that re-scores retrieved chunks for relevance</td></tr>
<tr><td>ChromaDB</td><td>Open-source vector DB — great for local/development RAG pipelines</td></tr>
<tr><td>Pinecone</td><td>Managed cloud vector DB — enterprise-scale RAG deployments</td></tr>
<tr><td>FAISS</td><td>Facebook's library for fast ANN search — used inside many vector DBs</td></tr>
<tr><td>pgvector</td><td>PostgreSQL extension for vector storage and search</td></tr>
<tr><td>RAGAs</td><td>Framework for evaluating RAG systems: faithfulness, precision, recall, relevance</td></tr>
</table>

### Agent & Framework Terms

<table>
<tr><th>Term</th><th>One-Line Definition</th></tr>
<tr><td>AI Agent</td><td>LLM that autonomously takes actions (calls tools, observes results) to achieve goals</td></tr>
<tr><td>ReAct</td><td>Reasoning + Acting loop: Think → Act (tool) → Observe → repeat</td></tr>
<tr><td>LangChain</td><td>Framework for building LLM applications — chains, tools, memory, agents</td></tr>
<tr><td>LangGraph</td><td>Graph-based agent orchestration framework — handles branching, loops, multi-agent</td></tr>
<tr><td>LlamaIndex</td><td>Framework focused on RAG — document loading, indexing, querying</td></tr>
<tr><td>Tool Use</td><td>Agent ability to call external functions (search, code, APIs, databases)</td></tr>
<tr><td>Agent Memory</td><td>Store conversation history, summaries, or facts for later retrieval</td></tr>
<tr><td>MCP</td><td>Model Context Protocol — Anthropic's standard for connecting LLMs to tools/data</td></tr>
<tr><td>Multi-Agent</td><td>Multiple specialized LLM agents collaborating on a task</td></tr>
<tr><td>Orchestrator</td><td>Agent that routes tasks to specialized sub-agents</td></tr>
</table>

### Fine-Tuning & Efficiency Terms

<table>
<tr><th>Term</th><th>One-Line Definition</th></tr>
<tr><td>Fine-Tuning</td><td>Update model weights on domain-specific data to improve performance on that task</td></tr>
<tr><td>LoRA</td><td>Low-Rank Adaptation — train small adapter matrices instead of full weights</td></tr>
<tr><td>QLoRA</td><td>Quantized LoRA — 4-bit quantization + LoRA, fits 70B fine-tuning on 1 GPU</td></tr>
<tr><td>PEFT</td><td>Parameter-Efficient Fine-Tuning — umbrella term for LoRA, prefix tuning, adapters</td></tr>
<tr><td>Quantization</td><td>Reduce weight precision (32-bit → 8-bit or 4-bit) to shrink model size</td></tr>
<tr><td>GGUF</td><td>File format for quantized models — used with llama.cpp for local inference</td></tr>
<tr><td>Ollama</td><td>Run quantized LLMs locally — <code>ollama run llama3</code></td></tr>
<tr><td>Distillation</td><td>Train small student model to mimic large teacher model's outputs</td></tr>
<tr><td>Model Drift</td><td>Model performance degrades over time as real-world data distribution shifts</td></tr>
<tr><td>A/B Testing</td><td>Deploy two model versions to different user groups, compare business metrics</td></tr>
</table>

---

## 💡 Key Papers to Know (with one-line summaries)

<table>
<tr><th>Paper</th><th>Year</th><th>One-Line Summary</th></tr>
<tr><td>Attention Is All You Need</td><td>2017</td><td>Introduced the transformer architecture — replaced RNNs for NLP</td></tr>
<tr><td>BERT</td><td>2018</td><td>Bidirectional transformer encoder — pretraining for understanding tasks</td></tr>
<tr><td>Language Models are Few-Shot Learners (GPT-3)</td><td>2020</td><td>175B model can do few-shot tasks from examples alone</td></tr>
<tr><td>LoRA: Low-Rank Adaptation</td><td>2021</td><td>Fine-tune LLMs efficiently by training only small adapter matrices</td></tr>
<tr><td>Retrieval-Augmented Generation (RAG)</td><td>2020</td><td>Combine retrieval from a knowledge base with generation — reduces hallucinations</td></tr>
<tr><td>ReAct: Synergizing Reasoning and Acting</td><td>2022</td><td>LLMs can reason + use tools iteratively to solve complex problems</td></tr>
<tr><td>Chain-of-Thought Prompting</td><td>2022</td><td>Prompt model to think step by step — dramatically improves reasoning</td></tr>
<tr><td>Constitutional AI (Anthropic)</td><td>2022</td><td>Use model to critique itself against principles — scales alignment</td></tr>
<tr><td>InstructGPT / RLHF</td><td>2022</td><td>RLHF makes language models helpful, honest, and harmless</td></tr>
<tr><td>Llama 2</td><td>2023</td><td>Open-source LLM competitive with proprietary models — enabled local AI</td></tr>
</table>

**How to read a paper**: Read abstract → intro → conclusion → figures/tables → methods. Rarely need to read word for word.

---

## 💡 Essential Libraries Reference

<table>
<tr><th>Library</th><th>Category</th><th>What It Does</th><th>Install</th></tr>
<tr><td>numpy</td><td>Data</td><td>Arrays, linear algebra, math</td><td><code>pip install numpy</code></td></tr>
<tr><td>pandas</td><td>Data</td><td>DataFrames, CSV/SQL, data manipulation</td><td><code>pip install pandas</code></td></tr>
<tr><td>matplotlib / seaborn</td><td>Viz</td><td>Static plots and statistical visualizations</td><td><code>pip install matplotlib seaborn</code></td></tr>
<tr><td>scikit-learn</td><td>ML</td><td>Classical ML algorithms + preprocessing</td><td><code>pip install scikit-learn</code></td></tr>
<tr><td>xgboost / lightgbm</td><td>ML</td><td>Gradient boosting — best for tabular data</td><td><code>pip install xgboost</code></td></tr>
<tr><td>torch (PyTorch)</td><td>Deep Learning</td><td>Neural network training — industry standard</td><td><code>pip install torch</code></td></tr>
<tr><td>tensorflow / keras</td><td>Deep Learning</td><td>Alternative DL framework (Google)</td><td><code>pip install tensorflow</code></td></tr>
<tr><td>transformers</td><td>NLP/LLM</td><td>HuggingFace models, pipelines, tokenizers</td><td><code>pip install transformers</code></td></tr>
<tr><td>datasets</td><td>NLP/LLM</td><td>HuggingFace dataset hub</td><td><code>pip install datasets</code></td></tr>
<tr><td>langchain</td><td>LLM Apps</td><td>Chains, agents, tools, memory</td><td><code>pip install langchain</code></td></tr>
<tr><td>langgraph</td><td>Agents</td><td>Graph-based agent orchestration</td><td><code>pip install langgraph</code></td></tr>
<tr><td>anthropic</td><td>LLM API</td><td>Claude API client</td><td><code>pip install anthropic</code></td></tr>
<tr><td>openai</td><td>LLM API</td><td>OpenAI API client</td><td><code>pip install openai</code></td></tr>
<tr><td>chromadb</td><td>Vector DB</td><td>Local vector database for RAG</td><td><code>pip install chromadb</code></td></tr>
<tr><td>pinecone</td><td>Vector DB</td><td>Cloud vector database</td><td><code>pip install pinecone-client</code></td></tr>
<tr><td>fastapi</td><td>Serving</td><td>Production REST API</td><td><code>pip install fastapi uvicorn</code></td></tr>
<tr><td>streamlit</td><td>UI</td><td>Quick ML demo web apps</td><td><code>pip install streamlit</code></td></tr>
<tr><td>mlflow</td><td>MLOps</td><td>Experiment tracking, model registry</td><td><code>pip install mlflow</code></td></tr>
<tr><td>docker</td><td>MLOps</td><td>Containerize ML apps</td><td>(install separately)</td></tr>
</table>

---

## 💡 Tools Comparison Table

<table>
<tr><th>Task</th><th>Beginner Choice</th><th>Production Choice</th><th>Why</th></tr>
<tr><td>LLM API</td><td>OpenAI GPT-3.5</td><td>Anthropic Claude 3.5 Sonnet</td><td>Claude better reasoning + longer context</td></tr>
<tr><td>Local LLM</td><td>Ollama + Llama3</td><td>llama.cpp</td><td>Ollama easiest UX</td></tr>
<tr><td>Vector DB</td><td>ChromaDB</td><td>Pinecone</td><td>Pinecone managed, scales automatically</td></tr>
<tr><td>RAG Framework</td><td>LangChain</td><td>LlamaIndex</td><td>LlamaIndex deeper RAG tooling</td></tr>
<tr><td>Agent Framework</td><td>LangChain</td><td>LangGraph</td><td>LangGraph handles complex multi-agent</td></tr>
<tr><td>Experiment Tracking</td><td>MLflow</td><td>Weights & Biases</td><td>W&B better UI + team collaboration</td></tr>
<tr><td>ML serving</td><td>Streamlit demo</td><td>FastAPI + Docker</td><td>FastAPI for production</td></tr>
<tr><td>Cloud ML</td><td>Google Colab</td><td>AWS SageMaker</td><td>SageMaker for enterprise pipelines</td></tr>
<tr><td>Fine-tuning</td><td>HuggingFace + LoRA</td><td>Axolotl + QLoRA</td><td>Axolotl more configurable</td></tr>
</table>

---

## 🎤 Best Free Resources

### YouTube Channels (watch in this order)

1. **3Blue1Brown** — Neural networks and backprop visualized (math made beautiful)
2. **Andrej Karpathy** — Build GPT from scratch — the best deep learning tutorial
3. **StatQuest** — Statistics and ML concepts explained clearly with visuals
4. **Yannic Kilcher** — AI paper reviews (intermediate–advanced)
5. **Two Minute Papers** — AI research highlights (fast overview)
6. **Sentdex** — Python, pandas, ML projects

### Courses (all free unless noted)

- **fast.ai Practical Deep Learning** — Best hands-on DL course, free
- **Stanford CS229** — ML theory by Andrew Ng, lecture notes on web
- **Stanford CS224N** — NLP with deep learning, lecture videos on YouTube
- **HuggingFace NLP Course** — Transformers, fine-tuning, RAG — practical
- **DeepLearning.AI short courses** — LangChain, RAG, Agents (2–4 hour courses, free)
- **Andrej Karpathy's Neural Networks: Zero to Hero** — YouTube playlist

### Key GitHub Repos to Study

- `huggingface/transformers` — model implementations
- `langchain-ai/langchain` — LLM application patterns
- `langchain-ai/langgraph` — agent graph patterns
- `anthropics/anthropic-sdk-python` — Claude API examples
- `run-llama/llama_index` — RAG patterns

### Must-Read Blogs

- Simon Willison's Weblog — practical LLM engineering
- Lilian Weng's Blog (lilianweng.github.io) — deep technical LLM guides
- Anthropic Research Blog — AI safety and frontier models
- HuggingFace Blog — state-of-the-art model releases

---

## ⚠️ Common Mistakes to Avoid

- **Jumping to LLMs without ML foundations** — you'll hit a wall when interviewers go deep
- **Watching courses without building** — every concept needs a coding project to stick
- **Using GPT-4 API for everything** — learn to use Claude, open-source models, and local LLMs too
- **No MLflow/W&B habit** — never run experiments without experiment tracking
- **Skipping mathematics** — can't explain backprop or attention without linear algebra and calculus

---

## 📋 Action Checklist

- Install all libraries in the reference table and verify with `import` in a notebook
- Read the Attention Is All You Need paper (abstract + figures — 30 minutes)
- Watch Andrej Karpathy's "Build GPT from scratch" (2 hours — most valuable DL resource)
- Complete one HuggingFace short course (NLP course or RAG course)
- Star all 5 key GitHub repos and browse their examples directories
- Build one project using each layer of the stack (data → model → RAG → agent → serving)
- Subscribe to Simon Willison's blog and Lilian Weng's blog
- Read the RAGAs paper and implement basic RAG evaluation on one of your projects
