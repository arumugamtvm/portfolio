---
title: Week 13.1 — Advanced NLP + Deep Learning (Transformers & BERT)
description: Transformers replaced RNNs by processing all tokens at once with self-attention. BERT (encoder-only) is best for classification and QA, GPT (decoder-only) for generation, and you can fine-tune with the Hugging Face Trainer API in a few lines.
---

> 🎯 **TL;DR:** Transformers replaced RNNs by processing ALL tokens simultaneously via self-attention (Q·Kᵀ/√dₖ → softmax → ×V). BERT = encoder-only, trained with Masked LM → bidirectional context → best for classification/NER/QA. GPT = decoder-only, causal LM → best for generation. Fine-tune with Hugging Face Trainer API in ~10 lines. Use sentence-transformers for semantic embeddings.

## 🧠 Mental Model

Think of self-attention like **a committee meeting** where every attendee (token) gets to ask every other attendee a question. Each token has a "query" (what am I looking for?), a "key" (what do I contain?), and a "value" (what do I offer?). The attention weight between tokens i and j is determined by how much i's query matches j's key. Token "bank" in "river bank" will have high attention to "river" and "water"; in "bank account" it attends to "account" and "deposit." This dynamic context is why BERT beats Word2Vec — the same word gets a different vector depending on its neighbors.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Formula / Detail</th></tr>
<tr><td><strong>Self-Attention</strong></td><td>Each token attends to all others in sequence</td><td>Attention(Q,K,V) = softmax(QKᵀ/√dₖ)·V</td></tr>
<tr><td><strong>Multi-Head Attention</strong></td><td>Run attention h times in parallel with different projections</td><td>Each head learns different relationship types</td></tr>
<tr><td><strong>Positional Encoding</strong></td><td>Inject position info (Transformers have no order sense)</td><td>sin/cos at different frequencies added to embeddings</td></tr>
<tr><td><strong>BERT</strong></td><td>Encoder-only Transformer</td><td>Bidirectional; trained with MLM + NSP</td></tr>
<tr><td><strong>GPT</strong></td><td>Decoder-only Transformer</td><td>Left-to-right causal LM; masked self-attention</td></tr>
<tr><td><strong>MLM</strong></td><td>Masked Language Modeling (BERT training)</td><td>15% tokens masked → model predicts them</td></tr>
<tr><td><strong>[CLS] token</strong></td><td>Classification token — first token in BERT input</td><td>Its embedding used as sentence-level representation</td></tr>
<tr><td><strong>[SEP] token</strong></td><td>Separator between sentences in BERT input</td><td>[CLS] SentA [SEP] SentB [SEP]</td></tr>
<tr><td><strong>BPE / WordPiece</strong></td><td>Subword tokenization algorithms</td><td>Split rare words: "tokenization" → ["token", "##ization"]</td></tr>
<tr><td><strong>Fine-tuning</strong></td><td>Continue training BERT on task-specific data</td><td>lr=2e-5, 2-4 epochs, small dataset fine</td></tr>
<tr><td><strong>Sentence Transformers</strong></td><td>Siamese BERT for sentence embeddings</td><td>cos_sim(embed1, embed2) for semantic similarity</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Understand task** — classification, NER, QA, summarization, generation, or embeddings?
2. **Choose model family** — BERT/RoBERTa for understanding tasks; GPT for generation; T5 for text-to-text; SBERT for similarity
3. **Tokenize with AutoTokenizer** — includes padding, truncation, attention_mask
4. **Load model** — AutoModelForSequenceClassification, AutoModelForTokenClassification, etc.
5. **Prepare dataset** — HuggingFace Dataset object or custom DataLoader
6. **Set TrainingArguments** — lr=2e-5, epochs=3, batch_size=16, eval_strategy='epoch'
7. **Create Trainer** — model + args + datasets + compute_metrics
8. **Train** — trainer.train()
9. **Evaluate** — trainer.evaluate() on test set
10. **Save & push** — trainer.save_model() / tokenizer.save_pretrained()

## 💻 Code Cheatsheet

```python
import torch
import numpy as np
import pandas as pd
from transformers import (
    AutoTokenizer, AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    TrainingArguments, Trainer,
    pipeline, DataCollatorWithPadding,
    EarlyStoppingCallback
)
from datasets import Dataset, DatasetDict, load_dataset
from sentence_transformers import SentenceTransformer, util
import evaluate  # pip install evaluate

# ════════════════════════════════════════════════
# 1. TRANSFORMER ARCHITECTURE (ASCII Diagram)
# ════════════════════════════════════════════════

"""
ENCODER (BERT-style):
┌────────────────────────────────────────────┐
│  Input: [CLS] The cat sat [SEP]            │
│  ↓ Token Embeddings + Positional Encoding  │
│  ↓                                         │
│  ┌──────────────────────────────────┐      │
│  │  Layer N (×12 for BERT-base)     │      │
│  │  ┌─────────────────────────────┐ │      │
│  │  │  Multi-Head Self-Attention  │ │      │
│  │  │  Q = X·Wq, K = X·Wk,       │ │      │
│  │  │  V = X·Wv                   │ │      │
│  │  │  Attn = softmax(QKᵀ/√dₖ)·V │ │      │
│  │  └─────────────────────────────┘ │      │
│  │  Add & LayerNorm (residual)       │      │
│  │  ┌─────────────────────────────┐ │      │
│  │  │  Feed-Forward Network       │ │      │
│  │  │  FFN(x) = ReLU(xW₁+b₁)W₂+b₂│ │      │
│  │  └─────────────────────────────┘ │      │
│  │  Add & LayerNorm (residual)       │      │
│  └──────────────────────────────────┘      │
│  ↓ Contextual embeddings per token         │
│  [CLS] embedding → classification head     │
└────────────────────────────────────────────┘

BERT vs GPT:
  BERT:  [CLS] A B C [SEP] → bidirectional (all tokens attend to all)
  GPT:   A B C D →           causal (each token only attends to past)
"""

# ════════════════════════════════════════════════
# 2. HUGGINGFACE PIPELINE — Instant Inference
# ════════════════════════════════════════════════

# Sentiment Analysis (default: distilbert-sst2)
sentiment = pipeline("sentiment-analysis")
print(sentiment("I absolutely love this course!"))
# [{'label': 'POSITIVE', 'score': 0.9998}]
print(sentiment(["Amazing!", "Terrible experience."], batch_size=2))

# Named Entity Recognition
ner = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)
doc = "Elon Musk founded SpaceX in Hawthorne, California in 2002."
for ent in ner(doc):
    print(f"{ent['word']:20s} → {ent['entity_group']} ({ent['score']:.3f})")

# Summarization
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
article = """Your long article text here... multiple sentences... at least 100 tokens."""
summary = summarizer(article, max_length=100, min_length=30, do_sample=False)
print(summary[0]['summary_text'])

# Question Answering (extractive)
qa = pipeline("question-answering", model="deepset/roberta-base-squad2")
result = qa(
    question="What programming language does BERT use?",
    context="BERT is implemented in Python using TensorFlow and PyTorch frameworks."
)
print(f"Answer: {result['answer']} (score: {result['score']:.3f})")

# Zero-Shot Classification (no training needed!)
zsc = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
result = zsc(
    "The new iPhone has an improved camera and longer battery life.",
    candidate_labels=["technology", "sports", "politics", "finance"]
)
print({l: f"{s:.3f}" for l, s in zip(result['labels'], result['scores'])})

# Translation
translator = pipeline("translation_en_to_fr", model="Helsinki-NLP/opus-mt-en-fr")
print(translator("Good morning! How are you today?")[0]['translation_text'])

# Text Generation
generator = pipeline("text-generation", model="gpt2")
output = generator("The future of artificial intelligence", max_length=60,
                    num_return_sequences=2, temperature=0.8)
for i, gen in enumerate(output):
    print(f"[{i+1}] {gen['generated_text']}")

# ════════════════════════════════════════════════
# 3. TOKENIZER DEEP DIVE
# ════════════════════════════════════════════════

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

text = "Transformers changed NLP forever."
# Single string
enc = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
print("Input IDs:", enc['input_ids'])
print("Attention mask:", enc['attention_mask'])  # 1=real token, 0=padding
print("Tokens:", tokenizer.convert_ids_to_tokens(enc['input_ids'][0]))
# ['[CLS]', 'transformers', 'changed', 'nl', '##p', 'forever', '.', '[SEP]']
# Note: "NLP" → ["nl", "##p"] (WordPiece subword tokenization)

# Batch tokenization with padding
texts = ["Short text.", "A much longer sentence that has more tokens in it."]
batch = tokenizer(texts, return_tensors="pt", padding=True,
                  truncation=True, max_length=64)
print("Batch input shape:", batch['input_ids'].shape)  # [2, max_len]

# Decode back to text
decoded = tokenizer.decode(enc['input_ids'][0], skip_special_tokens=True)
print("Decoded:", decoded)

# ════════════════════════════════════════════════
# 4. BERT EMBEDDINGS — CLS vs Mean Pooling
# ════════════════════════════════════════════════

model = AutoModel.from_pretrained("bert-base-uncased")
model.eval()  # Disable dropout for inference

texts = [
    "The bank by the river flooded.",
    "I deposited money at the bank.",
]

with torch.no_grad():
    inputs = tokenizer(texts, return_tensors="pt", padding=True,
                       truncation=True, max_length=128)
    outputs = model(**inputs)

# outputs.last_hidden_state: [batch_size, seq_len, 768]
token_embs = outputs.last_hidden_state
print("Token embeddings shape:", token_embs.shape)

# Option A: [CLS] token embedding (position 0)
cls_emb = token_embs[:, 0, :]          # [batch_size, 768]
print("CLS embedding shape:", cls_emb.shape)

# Option B: Mean pooling (better for sentence similarity)
attention_mask = inputs['attention_mask']
mask_expanded = attention_mask.unsqueeze(-1).float()
sum_emb = (token_embs * mask_expanded).sum(dim=1)
sum_mask = mask_expanded.sum(dim=1).clamp(min=1e-9)
mean_emb = sum_emb / sum_mask           # [batch_size, 768]
print("Mean pooled shape:", mean_emb.shape)

# Cosine similarity between the two "bank" sentences
cos_sim = torch.nn.functional.cosine_similarity(mean_emb[0:1], mean_emb[1:2])
print(f"Cosine similarity (river bank vs financial bank): {cos_sim.item():.4f}")
# Should be < 1.0 because BERT gives contextual embeddings — different meanings

# ════════════════════════════════════════════════
# 5. FINE-TUNING BERT FOR TEXT CLASSIFICATION
# ════════════════════════════════════════════════

MODEL_NAME = "bert-base-uncased"
NUM_LABELS = 2      # binary: positive/negative
MAX_LEN = 128
BATCH_SIZE = 16
EPOCHS = 3
LR = 2e-5           # Standard BERT fine-tuning LR; range: 1e-5 to 5e-5

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=NUM_LABELS)

# Prepare dataset
texts = ["I love this!", "Terrible.", "It was okay.", "Absolutely amazing!", "Never buying again."]
labels = [1, 0, 1, 1, 0]

raw_dataset = Dataset.from_dict({"text": texts, "label": labels})
splits = raw_dataset.train_test_split(test_size=0.2, seed=42)
dataset = DatasetDict({"train": splits["train"], "test": splits["test"]})

# Tokenization function (applied to all splits)
def tokenize_fn(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",   # Pad to max_length for uniform tensor sizes
        truncation=True,
        max_length=MAX_LEN
    )

tokenized_dataset = dataset.map(tokenize_fn, batched=True)
tokenized_dataset = tokenized_dataset.remove_columns(["text"])
tokenized_dataset = tokenized_dataset.rename_column("label", "labels")
tokenized_dataset.set_format("torch")   # Return PyTorch tensors

# Metrics function
accuracy_metric = evaluate.load("accuracy")
f1_metric = evaluate.load("f1")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    acc = accuracy_metric.compute(predictions=predictions, references=labels)
    f1 = f1_metric.compute(predictions=predictions, references=labels, average="macro")
    return {**acc, **f1}

# Training configuration
training_args = TrainingArguments(
    output_dir="./bert-classifier",
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LR,
    weight_decay=0.01,               # L2 regularization
    warmup_ratio=0.1,                # Linear warmup for 10% of steps
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    logging_dir="./logs",
    logging_steps=10,
    fp16=torch.cuda.is_available(),  # Mixed precision training on GPU
    report_to="none",                # Disable wandb
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["test"],
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
)

trainer.train()
results = trainer.evaluate()
print(f"Test Accuracy: {results['eval_accuracy']:.4f}, F1: {results['eval_f1']:.4f}")

# Save model + tokenizer
trainer.save_model("./bert-final")
tokenizer.save_pretrained("./bert-final")

# Inference on new text
def predict(text, model, tokenizer, device="cpu"):
    model.eval()
    inputs = tokenizer(text, return_tensors="pt", truncation=True,
                       max_length=128, padding=True).to(device)
    with torch.no_grad():
        logits = model(**inputs).logits
    probs = torch.softmax(logits, dim=-1)
    pred = torch.argmax(probs).item()
    return pred, probs[0][pred].item()

pred, conf = predict("This is absolutely brilliant!", model, tokenizer)
print(f"Prediction: {'Positive' if pred==1 else 'Negative'} ({conf*100:.1f}%)")

# ════════════════════════════════════════════════
# 6. SENTENCE TRANSFORMERS — Semantic Similarity & Search
# ════════════════════════════════════════════════

# pip install sentence-transformers
sbert = SentenceTransformer("all-MiniLM-L6-v2")  # Fast, 384-dim, great quality

sentences = [
    "A dog is playing in the park.",
    "A puppy runs through the grass.",
    "Machine learning transforms industries.",
    "Deep learning uses neural networks.",
    "The stock market crashed today.",
]

# Encode all sentences → dense 384-dim vectors
embeddings = sbert.encode(sentences, convert_to_tensor=True, show_progress_bar=False)
print(f"Embeddings shape: {embeddings.shape}")  # [5, 384]

# Pairwise cosine similarity matrix
cos_scores = util.cos_sim(embeddings, embeddings)
print("\nSimilarity matrix (first 3 sentences):")
for i in range(3):
    for j in range(3):
        print(f"  [{i}]↔[{j}]: {cos_scores[i][j]:.3f}", end="  ")
    print()

# Semantic search — find most similar to a query
query = "How do animals behave outside?"
query_emb = sbert.encode(query, convert_to_tensor=True)
hits = util.semantic_search(query_emb, embeddings, top_k=3)[0]

print(f"\nQuery: '{query}'")
print("Top matches:")
for hit in hits:
    print(f"  Score {hit['score']:.4f}: {sentences[hit['corpus_id']]}")

# Document clustering with SBERT
from sklearn.cluster import KMeans
import numpy as np

np_embs = embeddings.cpu().numpy()
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
labels_cluster = kmeans.fit_predict(np_embs)
for sent, cluster in zip(sentences, labels_cluster):
    print(f"  Cluster {cluster}: {sent[:50]}")

# ════════════════════════════════════════════════
# 7. NER FINE-TUNING WITH BERT (Token Classification)
# ════════════════════════════════════════════════

from transformers import AutoModelForTokenClassification

# Label scheme: B-PER=0, I-PER=1, B-ORG=2, I-ORG=3, B-LOC=4, I-LOC=5, O=6
label_list = ["B-PER", "I-PER", "B-ORG", "I-ORG", "B-LOC", "I-LOC", "O"]
id2label = {i: l for i, l in enumerate(label_list)}
label2id = {l: i for i, l in enumerate(label_list)}

ner_model = AutoModelForTokenClassification.from_pretrained(
    "bert-base-uncased",
    num_labels=len(label_list),
    id2label=id2label,
    label2id=label2id
)
# Training follows same Trainer API as classification above
# Key difference: labels are per-token, not per-sentence

# Quick inference with pre-trained NER
ner_pipe = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)
result = ner_pipe("Tim Cook is the CEO of Apple Inc., based in Cupertino.")
for ent in result:
    print(f"  {ent['entity_group']:6s} | {ent['word']}")

# ════════════════════════════════════════════════
# 8. MODEL COMPARISON — Quick Selection
# ════════════════════════════════════════════════

"""
Architecture Summary:
┌──────────────┬──────────────────┬────────────────────────────────────────┐
│ Model        │ Type             │ Best For                               │
├──────────────┼──────────────────┼────────────────────────────────────────┤
│ BERT-base    │ Encoder-only     │ Classification, NER, QA                │
│ RoBERTa      │ Encoder-only     │ Better BERT (no NSP, more data)        │
│ DistilBERT   │ Encoder-only     │ Fast inference, 40% smaller than BERT  │
│ ALBERT       │ Encoder-only     │ Parameter sharing, memory efficient     │
│ GPT-2/3/4    │ Decoder-only     │ Text generation, completion, chat      │
│ T5           │ Encoder-Decoder  │ Any task as text-to-text (translate,   │
│              │                  │ summarize, QA, classify)               │
│ BART         │ Encoder-Decoder  │ Summarization, denoising               │
│ SBERT        │ Encoder (siamese)│ Semantic similarity, dense retrieval   │
│ XLM-RoBERTa  │ Encoder-only     │ Cross-lingual tasks (100+ languages)   │
└──────────────┴──────────────────┴────────────────────────────────────────┘
"""
```

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Where</th><th>Recommended Value</th><th>Effect</th></tr>
<tr><td><strong>learning_rate</strong></td><td>TrainingArguments</td><td>2e-5 (range: 1e-5–5e-5)</td><td>Too high destroys pre-trained weights</td></tr>
<tr><td><strong>num_train_epochs</strong></td><td>TrainingArguments</td><td>3–5 (text class), 2–3 (NER)</td><td>More epochs → overfit small datasets</td></tr>
<tr><td><strong>per_device_train_batch_size</strong></td><td>TrainingArguments</td><td>8–32 (GPU VRAM dependent)</td><td>Larger = faster but more GPU memory</td></tr>
<tr><td><strong>max_length</strong></td><td>tokenizer</td><td>128 (classification), 512 (QA)</td><td>Truncates longer texts; affects speed</td></tr>
<tr><td><strong>weight_decay</strong></td><td>TrainingArguments</td><td>0.01</td><td>L2 regularization to prevent overfitting</td></tr>
<tr><td><strong>warmup_ratio</strong></td><td>TrainingArguments</td><td>0.06–0.1</td><td>Linear LR warmup prevents early instability</td></tr>
<tr><td><strong>num_labels</strong></td><td>AutoModel</td><td>2 (binary), N (multi-class)</td><td>Sets classification head output size</td></tr>
<tr><td><strong>dₖ (attention head dim)</strong></td><td>BERT-base</td><td>64 (768/12 heads)</td><td>√dₖ scaling prevents vanishing gradients</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: Explain self-attention in plain language with the formula.**

A: Self-attention allows each token to look at all other tokens to build context. Each token creates 3 vectors via learned weight matrices: Q (query = "what I'm searching for"), K (key = "what I contain"), V (value = "what I contribute"). Similarity between token i and j = QᵢKⱼᵀ/√dₖ. Softmax converts similarities to weights (sum to 1). Final output = weighted sum of V vectors. The √dₖ scaling prevents dot products from growing too large in high dimensions.

**Q2: Why does BERT use [CLS] and [SEP] tokens?**

A: [CLS] is prepended to every input and after fine-tuning its embedding aggregates the entire sequence's meaning — used as input to the classification head. [SEP] separates sentence pairs (for NSP and QA tasks) and marks sequence end. Both are special tokens the model learns to use meaningfully during pre-training.

**Q3: What is Masked Language Modeling (MLM) and why does it make BERT bidirectional?**

A: During BERT pre-training, 15% of input tokens are randomly replaced with [MASK]. The model must predict the original token using ALL surrounding context — both left AND right. This is unlike GPT's causal LM which only sees left context. Bidirectionality makes BERT superior for understanding tasks (classification, NER, QA) where full context is available.

**Q4: What's the difference between BERT and GPT architectures?**

A: BERT uses only the Transformer encoder stack with bidirectional self-attention (each token attends to all others). GPT uses only the decoder stack with masked (causal) self-attention (each token attends only to past tokens). BERT excels at understanding (classification, extraction). GPT excels at generation (text completion, chat).

**Q5: Why is fine-tuning BERT better than training from scratch?**

A: BERT was pre-trained on 3.3B words, learning rich general representations of English (syntax, semantics, world knowledge). Fine-tuning leverages this and requires only 2-4 epochs on hundreds to thousands of task-specific examples. Training from scratch would require millions of examples and days of compute. Fine-tuned BERT also generalizes better.

**Q6: What is the difference between CLS pooling and mean pooling for sentence embeddings?**

A: CLS pooling takes only the [CLS] token's embedding as the sentence representation. Mean pooling averages all token embeddings (excluding padding). For sentence-level semantic similarity, mean pooling generally outperforms CLS pooling because it incorporates information from all tokens. Sentence-BERT (SBERT) is specifically trained with mean pooling for similarity tasks.

**Q7: When would you use SBERT vs fine-tuned BERT for similarity?**

A: BERT's CLS embeddings were not trained for direct comparison — cosine similarity of two BERT CLS embeddings performs poorly out-of-the-box. SBERT was specifically fine-tuned with a siamese network on semantic similarity pairs, making cosine similarity of SBERT embeddings highly meaningful. Use SBERT for semantic search, clustering, and similarity without fine-tuning; use BERT and fine-tune when you have labeled task-specific data.

**Q8: What is BPE/WordPiece tokenization and why does it matter?**

A: Instead of splitting on spaces (word-level) or characters, BPE/WordPiece learns a vocabulary of common subwords. "tokenization" → ["token", "##ization"]. "##" prefix means "continue previous word." This handles out-of-vocabulary words (any word can be built from subwords), keeps vocabulary manageable (30K tokens for BERT), and represents rare words efficiently. Every text maps to a sequence of known token IDs — no UNK tokens.

## ⚠️ Common Mistakes

- **Using raw BERT embeddings for semantic similarity** — Out-of-the-box BERT CLS embeddings perform poorly for cosine similarity. Use sentence-transformers (SBERT) specifically designed for this, or fine-tune with a similarity objective.
- **Fine-tuning with too high a learning rate** — Standard Adam LR (1e-3) will destroy pre-trained weights. Always use 1e-5 to 5e-5 for fine-tuning Transformers.
- **Not masking padding tokens during loss computation** — In NER and token classification, padding tokens must be labeled -100 so the loss function ignores them. Forgetting this inflates apparent performance.
- **Forgetting to call model.eval() during inference** — Training mode keeps dropout active, causing non-deterministic predictions. Always call model.eval() and use `torch.no_grad()` for inference.
- **Using max_length=512 when 128 is sufficient** — BERT's attention is O(n²) in sequence length. max_length=512 is 16× slower than 128. Use 128 for most classification tasks, 512 only when long context is essential.
- **Not saving the tokenizer with the model** — The tokenizer contains the vocabulary and special token config. Saving only model weights without the tokenizer makes the saved checkpoint unusable.
- **Confusing AutoModel vs AutoModelForSequenceClassification** — AutoModel returns raw hidden states (no task head). Task-specific classes add the appropriate head (classifier, token classifier, etc.) and compute task loss automatically.

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Task</th><th>Model</th><th>HF Class</th></tr>
<tr><td>Text classification (sentiment, spam, topic)</td><td>bert-base-uncased or distilbert</td><td>AutoModelForSequenceClassification</td></tr>
<tr><td>Named Entity Recognition</td><td>dslim/bert-base-NER or bert-base</td><td>AutoModelForTokenClassification</td></tr>
<tr><td>Extractive Question Answering</td><td>deepset/roberta-base-squad2</td><td>AutoModelForQuestionAnswering</td></tr>
<tr><td>Abstractive Summarization</td><td>facebook/bart-large-cnn</td><td>pipeline("summarization")</td></tr>
<tr><td>Machine Translation</td><td>Helsinki-NLP/opus-mt-en-{lang}</td><td>pipeline("translation")</td></tr>
<tr><td>Semantic Similarity / Search</td><td>all-MiniLM-L6-v2</td><td>SentenceTransformer</td></tr>
<tr><td>Zero-Shot Classification</td><td>facebook/bart-large-mnli</td><td>pipeline("zero-shot-classification")</td></tr>
<tr><td>Text Generation</td><td>gpt2 / meta-llama models</td><td>pipeline("text-generation")</td></tr>
<tr><td>Fast inference, limited GPU</td><td>distilbert-base-uncased</td><td>AutoModelForSequenceClassification</td></tr>
<tr><td>Multilingual tasks</td><td>xlm-roberta-base</td><td>AutoModel*</td></tr>
</table>

## 📋 Completion Checklist

- Explain self-attention with the formula Attention(Q,K,V) = softmax(QKᵀ/√dₖ)·V and why √dₖ scaling is needed
- Explain why BERT is bidirectional and GPT is causal; give a task suited to each
- Describe BERT's pre-training: MLM (15% mask) + NSP; explain [CLS] and [SEP] tokens
- Use pipeline() for at least 4 tasks: sentiment, NER, QA, summarization
- Tokenize text with AutoTokenizer; inspect input_ids, attention_mask, and decoded tokens
- Extract BERT embeddings; compare CLS pooling vs mean pooling for sentence representation
- Fine-tune BERT for binary classification using Trainer API with proper TrainingArguments
- Use SBERT (SentenceTransformer) to encode sentences and compute cosine similarity
- Run semantic search with util.semantic_search() on a corpus of sentences
- Explain BPE/WordPiece tokenization and what ## prefix means in BERT tokens
