---
title: AI/ML Question Bank & Practice Problems
description: 100 real AI/ML interview questions with concise model answers, organized by topic with difficulty ratings and which companies ask them.
---

> 🎯 **TL;DR** — 100 real AI/ML interview questions organized by topic, with concise model answers, difficulty ratings, and which companies ask each type. Use this as your daily drill bank — 10 questions per day for 10 days = full coverage.

---

## 📋 Question Bank Overview

<table>
<tr><th>Topic</th><th># Questions</th><th>Difficulty</th><th>Who Asks</th></tr>
<tr><td>ML Fundamentals</td><td>25</td><td>Easy–Medium</td><td>All companies</td></tr>
<tr><td>Deep Learning</td><td>20</td><td>Medium</td><td>Google, Meta, Anthropic</td></tr>
<tr><td>NLP / LLMs</td><td>20</td><td>Medium–Hard</td><td>Anthropic, OpenAI, any LLM team</td></tr>
<tr><td>AI Agents & RAG</td><td>15</td><td>Medium–Hard</td><td>AI startups, Anthropic, LangChain ecosystem</td></tr>
<tr><td>Python & SQL</td><td>20</td><td>Easy–Medium</td><td>All companies</td></tr>
</table>

---

## 🔢 How to Use This Bank

1. **Daily drill**: Pick one topic, answer 5 questions out loud without looking at answers.
2. **Spaced repetition**: Mark questions you got wrong. Review wrong answers 3 days later.
3. **Depth practice**: For starred (⭐) questions, prepare a 2-minute verbal answer.
4. **Coding practice**: For any question with a "Code it" tag, implement it in Python.
5. **Track progress**: Check off questions as you master them.

---

## 💡 ML Fundamentals — 25 Questions

### Easy (must nail these in seconds)

**Q1** ⭐ What are the three types of machine learning?

> **A**: Supervised (labeled data, predict output), Unsupervised (no labels, find structure), Reinforcement (agent learns from rewards/penalties). Semi-supervised and self-supervised are increasingly common in AI.

**Q2** What is overfitting? How do you detect and fix it?

> **A**: Model memorizes training data, fails on new data. Detect: large gap between train and validation accuracy. Fix: regularization (L1/L2), dropout, more data, early stopping, simpler model.

**Q3** ⭐ Explain bias-variance tradeoff.

> **A**: High bias = underfitting (model too simple to capture patterns). High variance = overfitting (model captures noise). Goal: find the sweet spot. Ensemble methods (random forest, boosting) help balance both.

**Q4** What is the difference between a parameter and a hyperparameter?

> **A**: Parameters are learned from data (weights, biases). Hyperparameters are set before training (learning rate, number of layers, regularization strength). Hyperparameters are tuned with grid search, random search, or Bayesian optimization.

**Q5** What is cross-validation and why do you use it?

> **A**: Split data into K folds. Train on K-1 folds, test on the remaining fold. Repeat K times, average results. More reliable than a single train/test split, especially on small datasets.

### Medium (practice verbal explanation)

**Q6** ⭐ Explain gradient descent. What are its variants?

> **A**: Iteratively updates parameters by moving in the direction that reduces loss. Variants: Batch GD (full dataset per step — stable but slow), Stochastic GD (one sample per step — noisy but fast), Mini-batch GD (standard — best of both). Adam = adaptive learning rates, most commonly used optimizer.

**Q7** L1 vs L2 regularization — when do you use each?

> **A**: L1 (Lasso): adds absolute value of weights to loss. Produces sparse models (many weights go to 0) — good for feature selection. L2 (Ridge): adds squared weights. Shrinks all weights but keeps all features. Use L1 when you suspect many irrelevant features.

**Q8** ⭐ How does Random Forest work? Why does it reduce variance?

> **A**: Trains many decision trees, each on a random subset of data (bootstrap sampling) and random subset of features. Averages their predictions. Variance cancels because individual trees are correlated — reducing correlation is key, which is what random feature selection achieves.

**Q9** How does XGBoost differ from Random Forest?

> **A**: XGBoost is sequential (each tree corrects errors of previous — boosting). Random Forest is parallel (trees train independently — bagging). XGBoost typically outperforms RF on structured data; RF is more robust to hyperparameters.

**Q10** ⭐ What is data leakage? Give an example.

> **A**: When future or test data information leaks into the training process. Example: scaling features using the entire dataset before split — the scaler "knows" test set statistics. Fix: always fit preprocessing (scalers, encoders) ONLY on training data, then transform test data.

**Q11** How do you handle class imbalance?

> **A**: (1) Resample: oversample minority (SMOTE) or undersample majority. (2) Class weights: penalize wrong predictions on minority class more. (3) Threshold tuning: adjust decision threshold. (4) Use right metric: precision-recall instead of accuracy. (5) Try anomaly detection framing.

**Q12** What metrics would you use to evaluate a fraud detection model?

> **A**: Precision-Recall AUC (skewed classes make accuracy useless). Focus on Recall (don't miss fraud) and Precision (don't annoy legit users). Also F1 at chosen threshold. Business metric: expected cost = false negative cost × FN rate + false positive cost × FP rate.

**Q13** What is feature importance in tree-based models?

> **A**: Mean decrease in impurity (Gini/entropy) per feature across all trees (MDI). Or permutation importance: shuffle feature values, measure accuracy drop. MDI can be biased toward high-cardinality features; permutation importance is more reliable.

**Q14** When would you use a decision tree over logistic regression?

> **A**: Decision tree: when you need interpretability for non-linear decisions, feature interactions are important, mixed data types, no feature scaling needed. Logistic regression: when you need calibrated probabilities, interpretable coefficients, fast inference, limited data.

**Q15** What is the curse of dimensionality?

> **A**: As dimensions increase, data points become sparse — distance metrics lose meaning, models need exponentially more data. Fix: dimensionality reduction (PCA, UMAP), feature selection, regularization.

### Medium-Hard

**Q16** Explain the Naive Bayes "naive" assumption and when it still works.

> **A**: Assumes all features are conditionally independent given the class — almost never true in reality. Still works well for: text classification (word counts), spam filtering, when dataset is small. Feature correlation doesn't affect the ranking of class probabilities as much as you'd expect.

**Q17** ⭐ What is the difference between parametric and non-parametric models?

> **A**: Parametric: fixed number of parameters regardless of data size (linear regression, logistic regression, neural nets). Non-parametric: parameters grow with data (k-NN, decision trees, SVMs with kernel). Parametric: faster, more interpretable. Non-parametric: more flexible.

**Q18** How do SVMs find the optimal hyperplane?

> **A**: Maximizes the margin (distance between hyperplane and nearest data points — "support vectors"). Uses convex optimization (QP problem). The kernel trick maps data to higher dimensions implicitly, enabling non-linear boundaries without explicit transformation.

**Q19** What is the EM algorithm? Where is it used?

> **A**: Expectation-Maximization. E-step: estimate hidden variables given current parameters. M-step: update parameters to maximize likelihood. Repeat. Used in: Gaussian Mixture Models, topic modeling (LDA), handling missing data.

**Q20** ⭐ How do you select the right evaluation metric for a regression problem?

> **A**: MSE: penalizes large errors heavily (sensitive to outliers). MAE: more robust to outliers. RMSE: same scale as target variable, easier to interpret. R²: how much variance is explained (useful for comparison). MAPE: percentage error (good when target varies widely).

**Q21–Q25** (Quick-fire — know these cold)

- **Q21**: What is the difference between bagging and boosting? → Bagging: parallel, reduces variance. Boosting: sequential, reduces bias.
- **Q22**: What is k-fold stratified cross-validation? → Each fold preserves class distribution — essential for imbalanced datasets.
- **Q23**: What is the elbow method in K-Means? → Plot inertia vs. K, pick K where curve "elbows" — diminishing returns on adding clusters.
- **Q24**: What is PCA? → Linear dimensionality reduction. Projects data onto directions of maximum variance (principal components). Requires feature scaling first.
- **Q25**: What is the difference between discriminative and generative models? → Discriminative: models P(y|x) directly (logistic regression, SVM). Generative: models P(x|y) and P(y) (Naive Bayes, GMM). Generative can generate new samples.

---

## 💡 Deep Learning — 20 Questions

**Q26** ⭐ What is backpropagation?

> **A**: Algorithm to compute gradients of loss with respect to all parameters using the chain rule. Forward pass: compute loss. Backward pass: compute ∂loss/∂w for each weight by chaining partial derivatives from output layer back to input. Parameters updated by optimizer using these gradients.

**Q27** What are activation functions? Why do we need non-linearity?

> **A**: Non-linear functions applied after each layer. Without them, stacking layers collapses to a single linear transformation. Common: ReLU (default, fast, avoids vanishing gradient), Sigmoid (output layer for binary classification), Softmax (multi-class probabilities), GELU (used in transformers).

**Q28** ⭐ What is the vanishing gradient problem?

> **A**: During backpropagation through deep networks, gradients are multiplied repeatedly. If they're < 1 (like sigmoid derivatives), they exponentially shrink → early layers get near-zero gradient → don't learn. Fix: ReLU activations, residual connections (ResNets), batch normalization, LSTM/GRU for sequences.

**Q29** What is batch normalization? What does it actually do?

> **A**: Normalizes layer inputs to zero mean, unit variance within each mini-batch, then applies learned scale (γ) and shift (β). Reduces internal covariate shift — layers don't have to adjust to shifting input distributions. Speeds training by ~10x, allows higher learning rates, slight regularization effect.

**Q30** ⭐ What is dropout? How does it work at inference?

> **A**: Randomly sets neurons to 0 during training with probability p (typically 0.2–0.5). Forces network to learn redundant representations — reduces co-adaptation. At inference: ALL neurons are active, but their activations are scaled by (1-p) to match expected training behavior (or use inverted dropout during training).

**Q31** What is transfer learning? Name 3 strategies.

> **A**: Use pretrained model weights (trained on large dataset) for new task. Strategies: (1) Feature extraction: freeze all layers, train only new head. (2) Fine-tuning: unfreeze top layers, train with low LR. (3) Full fine-tuning: update all weights (only if you have lots of data).

**Q32** Explain CNNs — what do different layers learn?

> **A**: Convolutional layers detect local patterns with shared weights. Early layers: edges, textures. Mid layers: shapes, patterns. Deep layers: semantic concepts (faces, objects). Pooling layers downsample, providing spatial invariance. Dramatically fewer parameters than fully connected via weight sharing.

**Q33** ⭐ What is the transformer architecture?

> **A**: Multi-head self-attention + feed-forward layers, repeated N times. Self-attention: each token attends to all other tokens (attention = softmax(QKᵀ/√d_k) × V). Positional encoding added since attention is permutation-invariant. Encoder-only (BERT), decoder-only (GPT), or encoder-decoder (T5).

**Q34** What is the difference between RNNs, LSTMs, and Transformers?

> **A**: RNN: sequential processing, vanishing gradient on long sequences. LSTM: gates (forget, input, output) control information flow — handles longer dependencies. Transformer: full self-attention, processes all tokens in parallel, scales better, handles long-range dependencies — now dominant.

**Q35** What is weight initialization? Why does it matter?

> **A**: Poor initialization → vanishing or exploding gradients before training even starts. Xavier/Glorot: scales by √(1/fan_in) — good for tanh. He initialization: scales by √(2/fan_in) — designed for ReLU. Batch norm reduces sensitivity to initialization.

**Q36–Q45** (Quick-fire)

- **Q36**: What is learning rate scheduling? → Reduce LR over training (step decay, cosine annealing, warm-up + decay). Prevents overshooting minima.
- **Q37**: Adam optimizer — how does it work? → Adaptive learning rates per parameter. Maintains running averages of gradient (momentum) and squared gradient (RMSprop). Usually best default choice.
- **Q38**: What is an autoencoder? → Encoder compresses input to latent space; decoder reconstructs. Used for: dimensionality reduction, anomaly detection, denoising.
- **Q39**: What is a GAN? → Generator creates fake samples; discriminator distinguishes real from fake. Both trained adversarially. Used for: image generation, data augmentation.
- **Q40**: What is the difference between model capacity and model complexity? → Capacity = ability to learn diverse functions (more params = more capacity). Complexity = how complex the actual learned function is. High capacity + regularization ≠ high complexity.
- **Q41**: What is early stopping? → Stop training when validation loss stops improving. Use patience parameter (e.g., stop if no improvement for 5 epochs).
- **Q42**: What is knowledge distillation? → Train small "student" model to mimic large "teacher" model's output probabilities. Gets close to teacher performance with much smaller model.
- **Q43**: What is the difference between generalization and memorization? → Generalization: model learns underlying patterns. Memorization: model learns noise/specific examples. Test set performance measures generalization.
- **Q44**: What is residual connection (skip connection)? → Add input of a layer directly to its output: output = F(x) + x. Allows gradients to flow directly, enables training of very deep networks (ResNet).
- **Q45**: What is mixed precision training? → Use 16-bit floats for forward/backward pass, 32-bit for weight updates. 2–3x faster on modern GPUs, reduces memory by ~50%.

---

## 💡 NLP / LLMs — 20 Questions

**Q46** ⭐ What is self-attention? Walk me through the computation.

> **A**: Each token creates Query (Q), Key (K), Value (V) vectors via learned weight matrices. Attention scores = Q × Kᵀ / √d_k. Apply softmax → attention weights. Output = weighted sum of V vectors. Multi-head: run attention H times in parallel with different weight matrices, concatenate.

**Q47** What is tokenization? What is BPE?

> **A**: Tokenization splits text into subword units. BPE (Byte Pair Encoding): starts with characters, iteratively merges the most frequent adjacent pair. "playing" → ["play", "ing"]. Handles rare/novel words gracefully. WordPiece (BERT) is similar but merges pairs that maximize language model likelihood.

**Q48** ⭐ What is RLHF and why is it used?

> **A**: Reinforcement Learning from Human Feedback. Step 1: supervised fine-tuning on demonstrations. Step 2: humans rank model outputs → train reward model. Step 3: use PPO (RL algorithm) to fine-tune LLM to maximize reward. Makes models helpful, harmless, and honest — standard training for Claude, GPT-4.

**Q49** What are hallucinations in LLMs? How do you mitigate them?

> **A**: Model generates plausible but factually wrong content. Mitigations: RAG (ground output in retrieved documents), chain-of-thought prompting (reason step by step), temperature=0 for factual tasks, self-consistency (sample multiple times, pick majority), calibration training (RLHF with honesty reward).

**Q50** ⭐ RAG vs fine-tuning — when to choose each?

> **A**: RAG: when knowledge is dynamic (changes frequently), knowledge is too large for context window, you need citations/sources, latency is acceptable. Fine-tuning: when you need a specific response style/format, task is very specialized, need fastest possible inference, knowledge is stable.

**Q51–Q65** (Quick-fire — know these cold)

- **Q51**: What is prompt engineering? → Crafting inputs to elicit better LLM outputs. Techniques: zero-shot, few-shot, chain-of-thought, role prompting, structured output (JSON mode).
- **Q52**: What is chain-of-thought prompting? → Ask model to "think step by step" before answering. Dramatically improves multi-step reasoning. Emerges in models >100B parameters.
- **Q53**: What is temperature in LLMs? → Controls randomness. T=0: deterministic (always highest probability token). T=1: standard sampling. T>1: more random/creative. Use T=0 for factual tasks, T=0.7–1.0 for creative.
- **Q54**: What is the context window? → Maximum tokens (input + output) the model can process in one call. GPT-4: 128K. Claude 3.5: 200K. Longer context = more expensive + slower.
- **Q55**: What is LoRA? → Adds low-rank trainable matrices to frozen pretrained weights. Trains only ~0.1% of parameters. Standard method for efficient LLM fine-tuning. QLoRA: 4-bit quantized LoRA — fine-tune 70B models on a single GPU.
- **Q56**: What is the difference between BERT and GPT architectures? → BERT: encoder-only, bidirectional attention, good for understanding tasks (classification, NER). GPT: decoder-only, causal attention, good for generation tasks.
- **Q57**: What is semantic search vs keyword search? → Keyword: exact string matching (BM25, TF-IDF). Semantic: embeds text to vectors, searches by meaning similarity (cosine distance). Semantic better for paraphrase/synonyms; hybrid search often best.
- **Q58**: What is a vector database? → Database optimized for storing and querying high-dimensional embeddings using approximate nearest neighbor (ANN) search. Examples: Pinecone, ChromaDB, Weaviate, pgvector.
- **Q59**: What is embedding? → Dense vector representation of text (or image) capturing semantic meaning. Similar meanings → similar vectors (close in vector space). GPT models use 1536-dim embeddings; BERT uses 768-dim.
- **Q60**: What is instruction tuning? → Fine-tune a base LLM on (instruction, response) pairs to follow user instructions. Without it, LLMs just complete text; with it, they answer questions and follow directions.
- **Q61**: What is PEFT? → Parameter-Efficient Fine-Tuning. Fine-tunes a small subset of parameters instead of all. Includes LoRA, prefix tuning, prompt tuning, adapter methods.
- **Q62**: What is the difference between GPT-3.5 and GPT-4? → GPT-4 is multimodal, better at reasoning (especially math/coding), fewer hallucinations, larger context window. GPT-3.5 is faster and cheaper.
- **Q63**: What is token prediction? How do LLMs generate text? → LLMs predict the next token probability distribution over vocabulary. Sample or argmax to select next token. Repeat until EOS token or max length.
- **Q64**: What is Constitutional AI (Anthropic)? → Training approach where model critiques and revises own outputs according to a set of principles, reducing need for human feedback at scale.
- **Q65**: What is the difference between LLM completion and chat APIs? → Completion: single text in, text out. Chat: structured conversation with system/user/assistant roles. Chat API enables multi-turn conversations with maintained context.

---

## 💡 AI Agents & RAG — 15 Questions

**Q66** ⭐ What is an AI agent?

> **A**: An LLM that can take actions — call tools (web search, code execution, API calls), observe results, and decide next action — autonomously until a goal is achieved. Key components: LLM (brain), tools (hands), memory (context), planning loop (ReAct, CoT).

**Q67** ⭐ What is the ReAct framework?

> **A**: Thought → Action → Observation loop. LLM: (1) Thinks about what to do next, (2) Calls a tool, (3) Receives observation, (4) Updates its thinking. Enables multi-step reasoning with real-world grounding via tools.

**Q68** What is LangGraph and when would you use it over LangChain?

> **A**: LangGraph builds agents as directed graphs (nodes = LLM/tool calls, edges = routing logic). Use when: you need branching logic, multi-agent systems, cycles/loops, persistent state across turns. LangChain chains are linear; LangGraph handles complex agent flows.

**Q69** ⭐ What is chunking strategy in RAG? What chunk size do you use?

> **A**: Splitting documents for embedding. Fixed-size (most common): 256–1024 tokens with ~10–20% overlap. Semantic chunking: split at sentence/paragraph boundaries. Larger chunks: more context, but lower retrieval precision. Smaller chunks: more precise retrieval, but might miss context. 512 tokens + 10% overlap is a solid default.

**Q70** How do you evaluate a RAG system?

> **A**: Use the RAGAs framework: (1) Context Precision: were retrieved chunks actually relevant? (2) Context Recall: were all relevant chunks retrieved? (3) Answer Faithfulness: does the answer stick to the retrieved context? (4) Answer Relevance: does the answer address the question? Track all 4 metrics in a regression test suite.

**Q71** What is hybrid search in RAG?

> **A**: Combine sparse retrieval (BM25 — keyword matching) with dense retrieval (vector similarity). Weighted combination of both scores (RRF — Reciprocal Rank Fusion is common). Outperforms either alone because: BM25 is great for exact terms/names, vector search handles semantic similarity.

**Q72** What is an agent tool? Give 3 examples.

> **A**: Functions the agent can call to interact with the world. Examples: web_search (get current information), code_interpreter (run Python), read_file (access documents), send_email (take action), sql_query (query database). Tools are defined with a name, description, and parameter schema (JSON Schema).

**Q73** What is memory in AI agents?

> **A**: (1) In-context memory: conversation history in the context window — simple but limited by context length. (2) External memory: store summaries or full history in vector DB, retrieve relevant memories. (3) Entity memory: extract and store key facts (user preferences, names, facts). (4) Episodic memory: store past interaction summaries.

**Q74** What is a multi-agent system?

> **A**: Multiple specialized agents collaborating — each handles a subtask. Example: orchestrator agent routes queries → researcher agent searches web → writer agent drafts response → editor agent reviews. Reduces complexity per agent, enables parallelism, improves specialization.

**Q75** What are the failure modes of AI agents?

> **A**: (1) Tool call errors (agent keeps retrying in a loop). (2) Hallucinated tool arguments (passes wrong parameters). (3) Context window overflow (too many tool results fill the context). (4) Infinite loops (no clear termination condition). Mitigations: max iterations, structured output for tool calls, summarize tool results.

**Q76–Q80** (Quick-fire)

- **Q76**: What is function calling in LLMs? → Structured way for LLMs to output tool calls. You define available functions as JSON schemas; model outputs JSON instead of natural language to call them.
- **Q77**: What is a system prompt? → Instructions given to the LLM before user conversation. Sets role, behavior, output format, tools available. Persistent across turns in chat.
- **Q78**: What is query expansion in RAG? → Rephrase user query into multiple variants before retrieval to improve recall. Use LLM to generate synonyms or sub-questions.
- **Q79**: What is a guardrail in AI agents? → Input/output validation that blocks harmful, off-topic, or malformed content. Examples: Anthropic's Constitutional AI, Nvidia NeMo Guardrails, custom regex/classifier checks.
- **Q80**: What is the difference between a workflow and an agent? → Workflow: predefined, deterministic sequence of steps. Agent: LLM decides the next step dynamically. Workflows are predictable; agents are flexible but less reliable.

---

## 💡 Python & SQL — 20 Questions

**Q81** What is the GIL in Python?

> **A**: Global Interpreter Lock — CPython only allows one thread to execute Python bytecode at a time. Limits CPU parallelism for CPU-bound tasks. Fix: use multiprocessing (separate processes), or async/await for I/O-bound tasks. NumPy operations release the GIL.

**Q82** ⭐ What is a decorator? Write one.

> **A**: Function that wraps another function to add behavior. Classic example:

```python
import time
def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time()-start:.2f}s")
        return result
    return wrapper

@timer
def my_function(): pass
```

**Q83** What is the difference between a list and a generator in Python?

> **A**: List: stores all items in memory at once. Generator: produces items one at a time on demand (lazy evaluation). Generators use far less memory for large sequences. Use `yield` instead of `return`.

**Q84** ⭐ Explain list comprehension and dictionary comprehension.

> **A**: `squares = [x**2 for x in range(10) if x % 2 == 0]` → list. `sq_dict = {x: x**2 for x in range(10)}` → dict. Faster than equivalent for loops due to Python internals.

**Q85** What are `*args` and `**kwargs`?

> **A**: `*args`: captures variable positional arguments as tuple. `**kwargs`: captures variable keyword arguments as dict. Allows flexible function signatures. Commonly used in wrappers and decorators.

**Q86** What is the difference between `is` and `==`?

> **A**: `==` checks value equality. `is` checks identity (same object in memory). `a = [1,2]; b = [1,2]; a == b` is True, but `a is b` is False. Exception: small integers and strings are cached — `1 is 1` is True.

**Q87** ⭐ Write SQL to find the 2nd highest salary.

> **A**: `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);` Or: `SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;`

**Q88** What is a window function in SQL?

> **A**: Performs calculation across related rows without collapsing them into groups. Example: `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` — ranks employees within department without losing individual rows.

**Q89** ⭐ Write SQL to find duplicate records.

> **A**: `SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1;`

**Q90** What is the difference between JOIN types?

> **A**: INNER JOIN: only matching rows. LEFT JOIN: all left rows + matching right (null if no match). RIGHT JOIN: opposite. FULL OUTER JOIN: all rows from both. CROSS JOIN: cartesian product. For AI: LEFT JOIN is most common — keep all records, flag missing.

**Q91–Q100** (Quick-fire Python/SQL)

- **Q91**: What is vectorization in NumPy? → Replace Python loops with array operations — runs in C, 100x faster. `np.sum(arr)` vs `sum(arr)`.
- **Q92**: What is the difference between `.loc` and `.iloc` in pandas? → `.loc`: label-based indexing (row name/column name). `.iloc`: integer position-based indexing.
- **Q93**: How do you handle missing values in pandas? → `df.isnull().sum()` to find. Fill: `df.fillna(value)`. Drop: `df.dropna()`. Impute with median/mean for ML pipelines.
- **Q94**: What is multiprocessing vs multithreading in Python? → Multithreading: same process, shared memory, limited by GIL. Multiprocessing: separate processes, separate memory, true parallelism. Use multiprocessing for CPU-bound ML tasks.
- **Q95**: What is async/await in Python? → Asynchronous programming for I/O-bound tasks. `async def` defines coroutine; `await` pauses execution until I/O completes without blocking. Essential for high-throughput LLM API calls.
- **Q96**: Write a Python function to calculate cosine similarity. → `def cosine(a, b): return np.dot(a,b) / (np.linalg.norm(a) * np.linalg.norm(b))`
- **Q97**: What is the difference between `deepcopy` and `copy`? → `copy`: shallow copy — copies object but references nested objects. `deepcopy`: recursively copies everything. Critical when working with nested data structures in ML pipelines.
- **Q98**: How do you write efficient SQL for large tables? → Use indexes, avoid SELECT *, filter early with WHERE before JOIN, use EXPLAIN to check query plan, avoid functions on indexed columns in WHERE clause.
- **Q99**: What is CTEs (Common Table Expressions) in SQL? → `WITH cte AS (SELECT ...) SELECT * FROM cte`. Named subquery that improves readability. Can be recursive.
- **Q100**: What is the difference between GROUP BY and PARTITION BY? → GROUP BY collapses rows to one per group. PARTITION BY (in window functions) keeps all rows but adds a grouping context for calculations.

---

## ⚠️ Common Mistakes to Avoid

- **Memorizing answers without understanding** — interviewers always ask "why" or "what if" follow-ups
- **Skipping easy questions** — hiring decisions are often made on how you handle basics, not just hard questions
- **Not knowing your own resume** — any project or skill you listed is fair game for deep-dive
- **Python-only focus** — SQL is tested at almost every company; don't neglect it
- **No practical examples** — every theory answer should end with "in practice, this is used for..."

---

## 🚀 Quick Reference: Key Formulas

<table>
<tr><th>Formula</th><th>Expression</th></tr>
<tr><td>MSE</td><td>(1/n) × Σ(y_pred - y_true)²</td></tr>
<tr><td>Precision</td><td>TP / (TP + FP)</td></tr>
<tr><td>Recall</td><td>TP / (TP + FN)</td></tr>
<tr><td>F1 Score</td><td>2 × (Precision × Recall) / (Precision + Recall)</td></tr>
<tr><td>Cosine Similarity</td><td>(A·B) / (‖A‖ × ‖B‖)</td></tr>
<tr><td>Attention Score</td><td>softmax(QKᵀ / √d_k) × V</td></tr>
<tr><td>Softmax</td><td>e^x_i / Σe^x_j</td></tr>
<tr><td>Cross-Entropy Loss</td><td>-Σ y_true × log(y_pred)</td></tr>
</table>

---

## 📋 Action Checklist

- Answer all 10 ML Fundamentals questions (Q1–Q10) out loud without notes
- Work through all 5 deep learning starred questions (Q26, Q28, Q30, Q33, Q34)
- Answer the 5 LLM starred questions (Q46, Q48, Q49, Q50, Q55)
- Write the cosine similarity and softmax functions from memory
- Practice the 3 SQL questions (Q87, Q88, Q89) in a live SQL environment
- Write a Python decorator from scratch (Q82)
- Review all quick-fire answers and mark which ones need more study
- Do a 30-minute timed drill: pick 10 random questions, answer out loud
