---
title: Week 16 — RAG, Embeddings & Vector Databases
description: Turn private documents into a searchable vector database and inject the most relevant chunks into the LLM prompt at query time. Covers chunking, embeddings, vector DBs, reranking, and RAG evaluation.
---

> 🎯 **TL;DR** — RAG = turn your private documents into a searchable vector database, then inject the most relevant chunks into the LLM prompt at query time. Pipeline: Chunk → Embed → Store → Retrieve → Generate. Master embeddings, chunking strategy, vector DB choice, and reranking to go from naive to production RAG.

---

## 🧠 Mental Model

Think of RAG like a **open-book exam** — instead of memorising all facts (fine-tuning), the model can look up your documents (retrieval) before answering. The "librarian" (vector DB) finds the most relevant pages by comparing meaning (cosine similarity), not keywords. The model then reads those pages and writes its answer.

```
User Question
     ↓ embed question
Vector DB ← similarity search → Top-K Chunks
     ↓
[System Prompt] + [Retrieved Chunks] + [Question]
     ↓
LLM generates grounded answer
```

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Detail</th></tr>
<tr><td><strong>Embedding</strong></td><td>Dense vector representing semantic meaning</td><td>Similar text → similar vectors</td></tr>
<tr><td><strong>Chunk</strong></td><td>Small text segment from source document</td><td>Typical: 500–1000 chars, 200 overlap</td></tr>
<tr><td><strong>Vector DB</strong></td><td>Database optimised for similarity search</td><td>Stores vectors + metadata</td></tr>
<tr><td><strong>ANN search</strong></td><td>Approximate Nearest Neighbor</td><td>HNSW algorithm — fast at scale</td></tr>
<tr><td><strong>Cosine similarity</strong></td><td>Angle between vectors (ignores magnitude)</td><td>Range -1 to 1, higher = more similar</td></tr>
<tr><td><strong>Top-K retrieval</strong></td><td>Return K most similar chunks</td><td>Typically K=3–6</td></tr>
<tr><td><strong>Reranking</strong></td><td>Cross-encoder re-scores retrieved chunks</td><td>Slower but far more accurate</td></tr>
<tr><td><strong>HyDE</strong></td><td>Hypothetical Document Embeddings</td><td>Generate fake answer → embed that → search</td></tr>
<tr><td><strong>Chunk overlap</strong></td><td>Shared tokens between adjacent chunks</td><td>Prevents context loss at chunk boundaries</td></tr>
<tr><td><strong>Naive RAG</strong></td><td>Embed → retrieve → generate</td><td>Fast, simple, lower quality</td></tr>
<tr><td><strong>Advanced RAG</strong></td><td>Query rewriting, reranking, HyDE</td><td>Better precision + recall</td></tr>
<tr><td><strong>RAGAS</strong></td><td>RAG evaluation framework</td><td>Measures faithfulness, relevancy, recall</td></tr>
</table>

---

## 🔢 Key Steps / Process

**Indexing Phase (run once, or when docs change)**

1. **Load** documents — PDF, web pages, text files, database records
2. **Split** into chunks — RecursiveCharacterTextSplitter with overlap
3. **Embed** each chunk — OpenAI text-embedding-3-small or sentence-transformers
4. **Store** vectors + metadata in vector DB (Chroma, Pinecone, FAISS)

**Query Phase (per user question)**

1. **Embed** the user's question with the same embedding model
2. **Retrieve** top-K most similar chunks from vector DB
3. **Rerank** (optional) — cross-encoder for higher precision
4. **Augment** — inject chunks into prompt as `{context}`
5. **Generate** — LLM answers using only the provided context

---

## 💻 Code Cheatsheet

```python
# ============================================================
# 1. EMBEDDINGS — OPENAI (API) + SENTENCE-TRANSFORMERS (Free)
# pip install openai sentence-transformers numpy
# ============================================================
import numpy as np
from openai import OpenAI

oai = OpenAI()

def embed_openai(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Embed text using OpenAI API — best quality, costs money."""
    response = oai.embeddings.create(input=text, model=model)
    return response.data[0].embedding

def cosine_similarity(v1: list, v2: list) -> float:
    """Measure semantic similarity. Returns -1 to 1 (higher = more similar)."""
    a, b = np.array(v1), np.array(v2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# Compare two sentences
q_vec = embed_openai("What is machine learning?")
doc_vec = embed_openai("ML is a branch of AI that learns from data")
print(f"Similarity: {cosine_similarity(q_vec, doc_vec):.3f}")  # ~0.85

# --- Free local embeddings ---
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")   # 384 dims, free, runs locally

sentences = [
    "Machine learning learns patterns from data",
    "Deep learning uses neural networks",
    "Python is a programming language",               # Unrelated
]
embeddings = model.encode(sentences)                  # Shape: (3, 384)
query_emb = model.encode("What is deep learning?")

scores = util.cos_sim(query_emb, embeddings)[0]
best_idx = scores.argmax().item()
print(f"Best match: '{sentences[best_idx]}' (score: {scores[best_idx]:.3f})")


# ============================================================
# 2. CHROMADB — LOCAL VECTOR DATABASE
# pip install chromadb sentence-transformers
# ============================================================
import chromadb
from chromadb.utils import embedding_functions

# Persistent local DB (survives restarts)
chroma_client = chromadb.PersistentClient(path="./chroma_store")

emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

collection = chroma_client.get_or_create_collection(
    name="knowledge_base",
    embedding_function=emb_fn
)

# Add documents with metadata for filtering
collection.add(
    documents=[
        "RAG stands for Retrieval-Augmented Generation",
        "Vector databases enable fast similarity search",
        "LangChain is a framework for LLM applications",
        "Anthropic built Claude, an AI assistant",
    ],
    ids=["doc1", "doc2", "doc3", "doc4"],
    metadatas=[
        {"source": "textbook", "chapter": 1, "topic": "RAG"},
        {"source": "textbook", "chapter": 2, "topic": "vectors"},
        {"source": "blog",     "chapter": 0, "topic": "frameworks"},
        {"source": "blog",     "chapter": 0, "topic": "models"},
    ]
)

# Semantic search
results = collection.query(
    query_texts=["What is RAG?"],
    n_results=3,
    where={"source": "textbook"}         # Filter by metadata
)
for doc, dist, meta in zip(results["documents"][0], results["distances"][0], results["metadatas"][0]):
    print(f"Score: {1-dist:.3f} | Source: {meta['source']} | {doc[:60]}")


# ============================================================
# 3. COMPLETE RAG PIPELINE WITH LANGCHAIN
# pip install langchain langchain-community langchain-openai chromadb pypdf
# ============================================================
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# --- INDEXING ---

# Step 1: Load document (swap loader as needed)
loader = PyPDFLoader("your_document.pdf")
# loader = WebBaseLoader("https://docs.anthropic.com/")
# loader = TextLoader("notes.txt")
documents = loader.load()
print(f"Loaded {len(documents)} pages")

# Step 2: Split into chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,           # Characters per chunk
    chunk_overlap=200,         # Shared chars between adjacent chunks — prevents context loss
    separators=["\n\n", "\n", ". ", " ", ""]   # Try these separators in order
)
chunks = splitter.split_documents(documents)
print(f"Split into {len(chunks)} chunks")

# Step 3: Embed and store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./rag_store"
)
print(f"Stored {vectorstore._collection.count()} vectors")

# --- QUERYING ---

# Step 4: Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",              # or "mmr" for diverse results
    search_kwargs={"k": 4}                 # Return top 4 chunks
)

# Step 5: Custom RAG prompt — grounding prevents hallucination
prompt_template = """You are a helpful assistant. Use ONLY the provided context to answer.
If the context doesn't contain the answer, say "I don't have that information."

Context:
{context}

Question: {question}

Answer:"""

prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

# Step 6: Build QA chain
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    chain_type="stuff",                    # Stuff all chunks into prompt (vs map_reduce)
    chain_type_kwargs={"prompt": prompt},
    return_source_documents=True           # Return which chunks were used
)

# Step 7: Query
result = qa_chain.invoke({"query": "What are the main topics covered?"})
print("Answer:", result["result"])
print("Sources:", [doc.metadata for doc in result["source_documents"]])


# ============================================================
# 4. FAISS — FAST IN-MEMORY VECTOR SEARCH
# pip install faiss-cpu langchain-community langchain-openai
# ============================================================
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings()
texts = ["First document", "Second document", "Third document"]
metadatas = [{"id": i, "source": f"doc{i}"} for i in range(3)]

# Create FAISS index
faiss_store = FAISS.from_texts(texts, embeddings, metadatas=metadatas)

# Persist to disk
faiss_store.save_local("faiss_index")

# Load from disk (next session)
loaded_store = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)

# Search with scores
docs_and_scores = loaded_store.similarity_search_with_score("document query", k=3)
for doc, score in docs_and_scores:
    print(f"Score (L2 distance): {score:.3f} | {doc.page_content[:50]}")


# ============================================================
# 5. RERANKING — IMPROVE PRECISION AFTER RETRIEVAL
# pip install sentence-transformers
# ============================================================
from sentence_transformers import CrossEncoder

# Cross-encoder reads (query, document) pairs together — much more accurate than bi-encoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_documents(query: str, documents: list[str], top_k: int = 3) -> list[str]:
    """Rerank retrieved documents by relevance. Best when you retrieve 10-20 candidates."""
    pairs = [(query, doc) for doc in documents]
    scores = reranker.predict(pairs)       # Compare query to each doc simultaneously
    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in ranked[:top_k]]

# Retrieve many candidates, rerank to get best 3
initial_docs = retriever.get_relevant_documents("What is RAG?")  # Get top 10
initial_texts = [d.page_content for d in initial_docs]
reranked_docs = rerank_documents("What is RAG?", initial_texts, top_k=3)


# ============================================================
# 6. RAG EVALUATION WITH RAGAS
# pip install ragas datasets
# ============================================================
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall, context_precision
from datasets import Dataset

# Build evaluation dataset
eval_data = {
    "question": [
        "What is RAG?",
        "What embedding models does OpenAI provide?"
    ],
    "answer": [
        "RAG is Retrieval-Augmented Generation, combining retrieval with LLM generation.",
        "OpenAI provides text-embedding-3-small (1536 dims) and text-embedding-3-large (3072 dims)."
    ],
    "contexts": [
        ["RAG stands for Retrieval-Augmented Generation..."],
        ["text-embedding-3-small has 1536 dimensions..."]
    ],
    "ground_truth": [
        "RAG is Retrieval-Augmented Generation",
        "OpenAI has text-embedding-3-small and text-embedding-3-large"
    ]
}

dataset = Dataset.from_dict(eval_data)
results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall]
)
print(results)   # Scores 0-1; aim for faithfulness > 0.8, relevancy > 0.7
```

---

## ⚙️ Key Parameters / Configuration Table

<table>
<tr><th>Parameter</th><th>Tool</th><th>Recommended Value</th><th>Effect</th></tr>
<tr><td><code>chunk_size</code></td><td>TextSplitter</td><td>500–1000 chars</td><td>Smaller = more precise retrieval</td></tr>
<tr><td><code>chunk_overlap</code></td><td>TextSplitter</td><td>10–20% of chunk_size</td><td>Prevents context loss at boundaries</td></tr>
<tr><td><code>k</code> (top_k)</td><td>Retriever</td><td>3–6</td><td>More chunks = more context but more noise</td></tr>
<tr><td><code>search_type</code></td><td>Chroma/FAISS</td><td><code>"similarity"</code> or <code>"mmr"</code></td><td>MMR = Maximum Marginal Relevance (diversity)</td></tr>
<tr><td>model</td><td>OpenAI Embeddings</td><td><code>text-embedding-3-small</code></td><td>Best cost/quality ratio</td></tr>
<tr><td>dims</td><td>sentence-transformers</td><td>384 (MiniLM) / 768 (BGE)</td><td>Higher = more accurate, slower</td></tr>
<tr><td><code>temperature</code></td><td>LLM</td><td>0 for RAG</td><td>Deterministic — follow context precisely</td></tr>
<tr><td><code>chain_type</code></td><td>RetrievalQA</td><td><code>"stuff"</code> / <code>"map_reduce"</code></td><td>Stuff=simple; map_reduce=many chunks</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: Explain the RAG pipeline end to end.**

A: Four indexing steps: Load docs → Split into chunks → Embed chunks → Store in vector DB. Four query steps: Embed question → Similarity search for top-K chunks → Inject chunks into prompt → LLM generates grounded answer. The same embedding model must be used in both phases.

**Q2: What is chunking and why does chunk_overlap matter?**

A: Chunking splits long documents into retrievable segments. Overlap (200 chars on a 1000-char chunk) ensures that a sentence spanning two chunks doesn't get cut in half — both adjacent chunks contain context for that boundary sentence, preventing retrieval gaps.

**Q3: When would you choose RAG over fine-tuning?**

A: RAG for private/updatable knowledge (company docs, recent events), lower cost, transparent sourcing. Fine-tuning for changing model behaviour/style/format, not for adding facts. Rule of thumb: fine-tune changes *how* the model responds; RAG changes *what* it knows.

**Q4: What is cosine similarity and why use it over Euclidean distance?**

A: Cosine similarity measures the angle between vectors — it's magnitude-agnostic. A short and long document with the same topic score identically. Euclidean distance penalises length. For text embeddings where document length varies, cosine is almost always preferred.

**Q5: What is HyDE and when does it help?**

A: Hypothetical Document Embeddings. When a query is short/vague, the LLM first generates a hypothetical ideal answer, then embeds that answer for retrieval. The hypothesis is longer and richer, so it matches document embeddings better than the raw short query.

**Q6: What is reranking and why is it better than pure vector search?**

A: Vector search uses bi-encoders — query and document are embedded separately. Reranking uses cross-encoders — query and document are processed together, enabling richer comparison. Standard practice: retrieve 20 candidates with vector search, rerank to top 5 with cross-encoder.

**Q7: What are the 4 RAGAS evaluation metrics?**

A: (1) **Faithfulness** — is the answer grounded in retrieved context? (2) **Answer Relevancy** — does the answer address the question? (3) **Context Precision** — are retrieved docs relevant to the question? (4) **Context Recall** — did we retrieve all relevant docs? Target >0.8 for faithfulness in production.

**Q8: How do you handle documents with tables, images, and mixed formats?**

A: Use multimodal loaders — `unstructured` library for PDFs with tables, GPT-4o Vision to extract image content as text, then embed. For tables, extract as markdown. Chunk tables separately from prose. Tag metadata with content type for filtered retrieval.

---

## ⚠️ Common Mistakes

- **Different embedding models at index and query time** — embeddings are incompatible; always use the same model for both phases
- **No chunk overlap** — sentences at chunk boundaries lose context; use 10-20% overlap
- **Chunk size too large** — retrieval gets noisy; 500-1000 chars per chunk is the sweet spot for most prose
- **No source attribution in prompt** — model may hallucinate; always tell it "use ONLY the provided context"
- **Skipping reranking** — raw vector search precision is ~70%; reranking pushes it to ~90%
- **Not evaluating RAG quality** — use RAGAS to measure faithfulness and relevancy before production
- **Embedding the full document** — a 50-page PDF embedded as one vector loses granularity; always chunk first

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Tool / Strategy</th><th>Notes</th></tr>
<tr><td>Local dev / prototyping</td><td>ChromaDB + MiniLM</td><td>Free, no API key needed</td></tr>
<tr><td>Production at scale</td><td>Pinecone or Qdrant</td><td>Managed, serverless, fast</td></tr>
<tr><td>Existing Postgres DB</td><td>pgvector extension</td><td>No new infra needed</td></tr>
<tr><td>Research / custom</td><td>FAISS</td><td>Max control, no server</td></tr>
<tr><td>Best embedding quality</td><td>text-embedding-3-large</td><td>3072 dims, most expensive</td></tr>
<tr><td>Cost-optimised embeddings</td><td>text-embedding-3-small</td><td>1536 dims, 5x cheaper</td></tr>
<tr><td>Free local embeddings</td><td>all-MiniLM-L6-v2</td><td>384 dims, runs on CPU</td></tr>
<tr><td>Improving retrieval precision</td><td>Cross-encoder reranking</td><td>Retrieve 20, rerank to 5</td></tr>
<tr><td>Short/vague queries</td><td>HyDE technique</td><td>Generate hypothesis → embed</td></tr>
<tr><td>Measuring RAG quality</td><td>RAGAS library</td><td>Faithfulness, relevancy, recall</td></tr>
</table>

---

## 📋 Completion Checklist

- Understand what embeddings are and why cosine similarity works for semantic search
- Can embed text with both OpenAI API and sentence-transformers (free)
- Can build a ChromaDB collection, add documents with metadata, and query it
- Can build a full RAG pipeline: Load → Split → Embed → Store → Retrieve → Generate
- Know chunking strategies and why chunk_overlap matters
- Can compare vector DB options: Chroma (dev), Pinecone (prod), FAISS (research)
- Understand advanced RAG: HyDE, query rewriting, reranking, multi-query
- Can evaluate RAG quality with RAGAS metrics (faithfulness, relevancy, precision, recall)
