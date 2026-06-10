---
title: Week 13 — Natural Language Processing (NLP)
description: NLP turns text into numbers so ML models can learn from it. Follow the pipeline of preprocess, vectorize with TF-IDF, train a classifier like Naive Bayes or Logistic Regression, and tie it together with sklearn Pipelines.
---

> 🎯 **TL;DR:** NLP turns text into numbers so ML models can learn from it. The pipeline is: Raw Text → Preprocess (lowercase, remove stopwords, stem/lemmatize) → Vectorize (CountVectorizer or TF-IDF) → Train classifier → Predict. Naive Bayes is the fastest baseline; Logistic Regression + TF-IDF is usually best for production. Word2Vec/GloVe capture meaning; sklearn Pipelines tie it all together cleanly.

## 🧠 Mental Model

Think of NLP like **translating a library into a spreadsheet**. Each book (document) becomes a row. Each unique word in the library becomes a column. CountVectorizer fills cells with word counts ("how many times did 'finance' appear?"). TF-IDF adjusts those counts — common words like "the" get near-zero scores because they appear everywhere (not informative), while rare but important words like "arbitrage" get high scores. Your ML classifier then reads that spreadsheet and learns which word patterns signal "spam" vs "not spam."

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Does</th><th>Key Detail</th></tr>
<tr><td><strong>Tokenization</strong></td><td>Split text into words/tokens</td><td>"I love AI" → ["I", "love", "AI"]</td></tr>
<tr><td><strong>Stopword removal</strong></td><td>Remove high-frequency, low-info words</td><td>"the", "is", "a", "and" → removed</td></tr>
<tr><td><strong>Stemming</strong></td><td>Crude suffix chopping to root</td><td>"running" → "run", "studies" → "studi"</td></tr>
<tr><td><strong>Lemmatization</strong></td><td>Linguistically accurate base form</td><td>"better" → "good", "studies" → "study"</td></tr>
<tr><td><strong>Bag of Words (BoW)</strong></td><td>Word count matrix per document</td><td>Ignores word order and grammar</td></tr>
<tr><td><strong>TF-IDF</strong></td><td>Weight words by importance</td><td>TF × IDF; rare-in-corpus = high score</td></tr>
<tr><td><strong>n-grams</strong></td><td>Sequences of n consecutive words</td><td>"New York" is a bigram (n=2)</td></tr>
<tr><td><strong>Word2Vec</strong></td><td>Dense vector capturing word meaning</td><td>100–300 dim; "king"-"man"+"woman"≈"queen"</td></tr>
<tr><td><strong>Pipeline</strong></td><td>Chain vectorizer + classifier</td><td>Prevents data leakage; easy deployment</td></tr>
<tr><td><strong>NER</strong></td><td>Named Entity Recognition</td><td>Identify persons, orgs, locations in text</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Load data** — read CSV, check class balance, sample examples
2. **Preprocess** — lowercase, remove URLs/HTML/punctuation, strip digits
3. **Remove stopwords** — NLTK stopwords list for the target language
4. **Stem or lemmatize** — lemmatization preferred (real words, context-aware)
5. **Vectorize** — CountVectorizer (raw counts) or TfidfVectorizer (weighted)
6. **Train/test split** — stratify by class label to maintain class distribution
7. **Train classifier** — Naive Bayes (fast baseline), Logistic Regression (usually best), SVM
8. **Evaluate** — classification_report (precision, recall, F1 per class), confusion matrix
9. **Cross-validate** — cross_val_score to check stability
10. **Save with pickle** — always save vectorizer AND model together (or use Pipeline)

## 💻 Code Cheatsheet

```python
import pandas as pd
import numpy as np
import re
import string
import pickle
import matplotlib.pyplot as plt
from collections import Counter

import nltk
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)

from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.tokenize import word_tokenize

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, ComplementNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay
import seaborn as sns

# ════════════════════════════════════════════════
# 1. TEXT PREPROCESSING PIPELINE
# ════════════════════════════════════════════════

stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()
lemmatizer = WordNetLemmatizer()

def preprocess_text(text, method='lemmatize'):
    """Full NLP preprocessing pipeline — returns cleaned string."""
    # Step 1: Lowercase
    text = str(text).lower()

    # Step 2: Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)

    # Step 3: Remove HTML tags
    text = re.sub(r'<.*?>', ' ', text)

    # Step 4: Remove email addresses
    text = re.sub(r'\S+@\S+', ' ', text)

    # Step 5: Remove punctuation and special characters (keep letters and spaces)
    text = re.sub(r'[^a-z\s]', ' ', text)

    # Step 6: Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Step 7: Tokenize
    tokens = text.split()

    # Step 8: Remove stopwords and short tokens
    tokens = [t for t in tokens if t not in stop_words and len(t) > 2]

    # Step 9: Stem or Lemmatize
    if method == 'stem':
        tokens = [stemmer.stem(t) for t in tokens]       # Fast, crude: "studies"→"studi"
    elif method == 'lemmatize':
        tokens = [lemmatizer.lemmatize(t) for t in tokens]  # Accurate: "studies"→"study"

    return ' '.join(tokens)

# Example usage
texts = [
    "I LOVE Python programming! It's AMAZING!!!",
    "This movie was absolutely terrible. Worst film ever.",
    "The quick brown fox jumps over the lazy dog."
]

for t in texts:
    print(f"Original : {t}")
    print(f"Processed: {preprocess_text(t)}\n")

# Apply to full dataframe
df = pd.read_csv('data.csv')          # Must have 'text' and 'label' columns
df['clean_text'] = df['text'].apply(preprocess_text)

print(f"\nClass distribution:\n{df['label'].value_counts()}")
print(f"\nSample:\n{df[['text','clean_text']].head(3)}")

# ════════════════════════════════════════════════
# 2. VECTORIZATION — BoW vs TF-IDF
# ════════════════════════════════════════════════

# --- CountVectorizer (Bag of Words) ---
cv = CountVectorizer(
    max_features=10000,    # Keep only top 10K most frequent terms
    ngram_range=(1, 2),    # Include unigrams AND bigrams ("not good" captured as one feature)
    min_df=2,              # Ignore terms appearing in fewer than 2 documents
    max_df=0.95,           # Ignore terms in more than 95% of documents (too common)
)

# Toy example to understand BoW
toy_docs = ["I love python", "I love AI", "python is great"]
cv_toy = CountVectorizer()
X_toy = cv_toy.fit_transform(toy_docs).toarray()
print("Vocabulary:", cv_toy.get_feature_names_out())
print("BoW matrix:\n", X_toy)
# Each row = one document, each column = one word, value = count

# --- TF-IDF Vectorizer ---
tfidf = TfidfVectorizer(
    max_features=10000,
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.95,
    sublinear_tf=True,    # Apply log(1+tf) to compress high-frequency term dominance
)
# TF = term_count / doc_length
# IDF = log(total_docs / docs_containing_term)
# TF-IDF = TF × IDF → rare-but-relevant words score highest

# ════════════════════════════════════════════════
# 3. TRAIN / TEST SPLIT
# ════════════════════════════════════════════════

X = df['clean_text']
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y    # IMPORTANT: maintain class proportions in both splits
)

print(f"Train: {len(X_train)}, Test: {len(X_test)}")
print(f"Train class dist:\n{y_train.value_counts(normalize=True)}")

# ════════════════════════════════════════════════
# 4. TEXT CLASSIFICATION WITH PIPELINES
# ════════════════════════════════════════════════
# Pipeline = vectorizer + classifier in one object
# Benefits: no data leakage, single object to save/load, easy CV

# ---- Naive Bayes (fast, strong baseline for NLP) ----
nb_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=10000, ngram_range=(1,2), sublinear_tf=True)),
    ('clf',   MultinomialNB(alpha=0.1))   # alpha = Laplace smoothing (0.1 usually better than 1.0)
])
nb_pipe.fit(X_train, y_train)
nb_preds = nb_pipe.predict(X_test)
print("\n=== Naive Bayes ===")
print(classification_report(y_test, nb_preds))

# ---- Logistic Regression (usually best for text) ----
lr_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=10000, ngram_range=(1,2), sublinear_tf=True)),
    ('clf',   LogisticRegression(C=1.0, max_iter=1000, solver='lbfgs', multi_class='auto'))
])
lr_pipe.fit(X_train, y_train)
lr_preds = lr_pipe.predict(X_test)
print("\n=== Logistic Regression ===")
print(classification_report(y_test, lr_preds))

# ---- SVM — often best accuracy on text ----
svm_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1,2), sublinear_tf=True)),
    ('clf',   LinearSVC(C=1.0, max_iter=2000))
])
svm_pipe.fit(X_train, y_train)
svm_preds = svm_pipe.predict(X_test)
print("\n=== Linear SVM ===")
print(classification_report(y_test, svm_preds))

# ════════════════════════════════════════════════
# 5. CROSS-VALIDATION FOR ROBUST EVALUATION
# ════════════════════════════════════════════════

cv_scores = cross_val_score(lr_pipe, X_train, y_train, cv=5, scoring='f1_macro', n_jobs=-1)
print(f"\nLR CV F1-macro: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
# Std < 0.01 → stable; Std > 0.05 → high variance, check data

# ════════════════════════════════════════════════
# 6. CONFUSION MATRIX VISUALIZATION
# ════════════════════════════════════════════════

cm = confusion_matrix(y_test, lr_preds)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=lr_pipe.classes_)
disp.plot(cmap='Blues', colorbar=False)
plt.title('Logistic Regression — Confusion Matrix')
plt.show()

# ════════════════════════════════════════════════
# 7. SENTIMENT ANALYSIS — COMPLETE EXAMPLE
# ════════════════════════════════════════════════

# Assumes df has columns 'review' and 'sentiment' ('positive'/'negative')
df_sent = pd.read_csv('reviews.csv')
df_sent['clean'] = df_sent['review'].apply(preprocess_text)

X_s = df_sent['clean']
y_s = df_sent['sentiment']

X_tr, X_te, y_tr, y_te = train_test_split(X_s, y_s, test_size=0.2,
                                            random_state=42, stratify=y_s)

sent_pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=10000, ngram_range=(1,2), sublinear_tf=True)),
    ('lr',    LogisticRegression(C=1.0, max_iter=1000))
])

sent_pipeline.fit(X_tr, y_tr)
print(classification_report(y_te, sent_pipeline.predict(X_te)))

# Predict with probability
def predict_sentiment(text, pipeline):
    clean = preprocess_text(text)
    pred = pipeline.predict([clean])[0]
    proba = pipeline.predict_proba([clean])[0]
    confidence = max(proba)
    print(f"Text: {text[:60]}...")
    print(f"Sentiment: {pred.upper()} ({confidence*100:.1f}% confidence)")
    return pred, confidence

predict_sentiment("This product exceeded all my expectations! Absolutely love it.", sent_pipeline)
predict_sentiment("Terrible quality, broke after one day. Waste of money.", sent_pipeline)

# Save the full pipeline (vectorizer + model — no separate saving needed)
with open('sentiment_model.pkl', 'wb') as f:
    pickle.dump(sent_pipeline, f)

# Reload and use
with open('sentiment_model.pkl', 'rb') as f:
    loaded_model = pickle.load(f)
print(loaded_model.predict(["I love this!"]))

# ════════════════════════════════════════════════
# 8. WORD FREQUENCY ANALYSIS & WORD CLOUD
# ════════════════════════════════════════════════

all_words = ' '.join(df['clean_text']).split()
freq = Counter(all_words)
top_20 = freq.most_common(20)

words, counts = zip(*top_20)
plt.figure(figsize=(12, 5))
plt.barh(words, counts, color='steelblue')
plt.xlabel('Frequency')
plt.title('Top 20 Most Common Words')
plt.gca().invert_yaxis()
plt.tight_layout()
plt.show()

# Word cloud (pip install wordcloud)
from wordcloud import WordCloud
wc = WordCloud(width=900, height=450, background_color='white',
               max_words=150, colormap='viridis')
wc.generate(' '.join(df['clean_text']))
plt.figure(figsize=(14, 7))
plt.imshow(wc, interpolation='bilinear')
plt.axis('off')
plt.title('Word Cloud')
plt.show()

# ════════════════════════════════════════════════
# 9. REGEX FOR NLP — Quick Patterns
# ════════════════════════════════════════════════

import re

text = "Call us at +1-800-555-0123 or email support@company.com. Visit https://example.com"

# Extract phone numbers
phones = re.findall(r'\+?[\d\-]{10,15}', text)
# Extract emails
emails = re.findall(r'\b[\w.+-]+@[\w-]+\.[\w.]+\b', text)
# Extract URLs
urls = re.findall(r'https?://\S+', text)
# Remove non-alphabetic chars
clean = re.sub(r'[^a-zA-Z\s]', '', text)

print(f"Phones: {phones}\nEmails: {emails}\nURLs: {urls}")

# ════════════════════════════════════════════════
# 10. spaCy vs NLTK — NER & Parsing
# ════════════════════════════════════════════════

# --- spaCy (faster, industrial-strength) ---
# pip install spacy && python -m spacy download en_core_web_sm
import spacy
nlp = spacy.load('en_core_web_sm')

doc = nlp("Apple Inc. was founded by Steve Jobs in Cupertino, California in 1976.")
print("\nNamed Entities:")
for ent in doc.ents:
    print(f"  {ent.text:25s} → {ent.label_} ({spacy.explain(ent.label_)})")
# Apple Inc. → ORG, Steve Jobs → PERSON, Cupertino → GPE, 1976 → DATE

# Lemmatization with spaCy
tokens_info = [(token.text, token.lemma_, token.pos_, token.is_stop)
               for token in doc if not token.is_punct]
print("\nTokens:", tokens_info[:5])

# --- NLTK NER ---
import nltk
from nltk import ne_chunk, pos_tag, word_tokenize
sentence = "Barack Obama was born in Hawaii and became the 44th President."
tokens = word_tokenize(sentence)
tagged = pos_tag(tokens)                 # Part-of-speech tagging
tree = ne_chunk(tagged)                  # Named entity chunking
print("\nNLTK NE chunks:", tree)

# ════════════════════════════════════════════════
# 11. WORD2VEC EMBEDDINGS (Gensim)
# ════════════════════════════════════════════════

# pip install gensim
from gensim.models import Word2Vec

# Tokenized sentences (list of lists of words)
sentences = [text.split() for text in df['clean_text']]

w2v = Word2Vec(
    sentences,
    vector_size=100,    # Embedding dimensions
    window=5,           # Context window size
    min_count=2,        # Ignore words appearing fewer than 2 times
    workers=4,          # Parallel training
    epochs=10
)

# Use the model
print("Similarity 'good' vs 'great':", w2v.wv.similarity('good', 'great'))
print("Most similar to 'python':", w2v.wv.most_similar('python', topn=5))
print("Doesn't match:", w2v.wv.doesnt_match(['python', 'java', 'football']))

# Get vector for a word
vec = w2v.wv['python']  # shape: (100,)
```

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Tool</th><th>Typical Values</th><th>Effect</th></tr>
<tr><td><strong>max_features</strong></td><td>TfidfVectorizer</td><td>5000–15000</td><td>Vocabulary size; more = richer but slower</td></tr>
<tr><td><strong>ngram_range</strong></td><td>TfidfVectorizer</td><td>(1,1) or (1,2)</td><td>(1,2) captures bigrams like "not good"</td></tr>
<tr><td><strong>min_df</strong></td><td>TfidfVectorizer</td><td>2–5</td><td>Filter ultra-rare noise words</td></tr>
<tr><td><strong>sublinear_tf</strong></td><td>TfidfVectorizer</td><td>True</td><td>Apply log(1+tf), prevents high-freq dominance</td></tr>
<tr><td><strong>alpha</strong></td><td>MultinomialNB</td><td>0.1–1.0</td><td>Laplace smoothing; smaller = less smoothing</td></tr>
<tr><td><strong>C</strong></td><td>LogisticRegression / LinearSVC</td><td>0.1–10</td><td>Regularization strength; higher = less regularization</td></tr>
<tr><td><strong>vector_size</strong></td><td>Word2Vec</td><td>100–300</td><td>Embedding dimensionality; larger = richer</td></tr>
<tr><td><strong>window</strong></td><td>Word2Vec</td><td>5</td><td>Context window for training</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What's the difference between CountVectorizer and TF-IDF?**

A: CountVectorizer simply counts how many times each word appears in a document. TF-IDF divides the count by document length (TF) and multiplies by the log of inverse document frequency (IDF). Words appearing in almost every document (like "the") get low IDF and near-zero TF-IDF scores. Rare but meaningful words get high scores. TF-IDF usually outperforms raw counts.

**Q2: Why is stemming vs lemmatization important — which should you use?**

A: Stemming is faster but crude — "studies" → "studi" (not a real word). Lemmatization uses vocabulary/grammar rules to produce real base forms — "studies" → "study". Use lemmatization for production NLP where output quality matters; stemming for speed-critical pipelines.

**Q3: Why use sklearn Pipeline instead of fitting vectorizer separately?**

A: Pipelines prevent data leakage. If you fit the vectorizer on all data before splitting, vocabulary statistics (IDF) from the test set leak into training, inflating performance metrics. Pipeline.fit() applies the vectorizer only to training data; .transform() applies learned vocab to test data.

**Q4: When does Naive Bayes outperform Logistic Regression for NLP?**

A: Naive Bayes works well with very small datasets and high-dimensional sparse features. It's extremely fast and handles class imbalance well with ComplementNB. Logistic Regression generally wins with larger datasets and benefits from feature interactions (via bigrams). Start with NB as a fast baseline, then upgrade to LR or SVM.

**Q5: What are n-grams and when are they useful?**

A: n-grams are contiguous sequences of n words treated as features. Bigrams (n=2) capture phrases like "not good" or "very bad" that unigrams miss. Use ngram_range=(1,2) to include both unigrams and bigrams. Trigrams rarely help and increase dimensionality significantly.

**Q6: What is Word2Vec and how is it different from TF-IDF?**

A: TF-IDF creates sparse, high-dimensional vectors where each dimension = one vocabulary word. Word2Vec creates dense, low-dimensional vectors (100-300 dims) that capture semantic meaning via neural networks. "king" - "man" + "woman" ≈ "queen" works in Word2Vec space. TF-IDF is better for classification tasks with sklearn; Word2Vec is better for semantic similarity.

**Q7: How do you handle class imbalance in text classification?**

A: Use stratify=y in train_test_split. Use ComplementNB instead of MultinomialNB for imbalanced data. Set class_weight='balanced' in LogisticRegression or LinearSVC. Evaluate with F1-macro instead of accuracy.

## ⚠️ Common Mistakes

- **Fitting vectorizer on all data before splitting** — Fit ONLY on training data. Test data must be strictly unseen during any fitting step. Use Pipeline to prevent this automatically.
- **Forgetting to apply the same preprocessing at inference time** — The preprocessing function used at training MUST be applied identically when predicting on new text.
- **Saving only the model, not the vectorizer** — Always save Pipeline (which includes both), or save vectorizer and model separately. Loading a model without its vectorizer is useless.
- **Using accuracy with imbalanced classes** — 95% of emails are ham → 95% accuracy by always predicting ham. Use F1, precision, recall, and confusion matrix.
- **Keeping stopwords in TF-IDF** — TF-IDF already downweights common words somewhat, but explicit stopword removal before vectorization further cleans features and reduces vocabulary size.
- **Applying lemmatization after vectorization** — Lemmatize BEFORE vectorizing. The vectorizer should receive pre-cleaned text, not raw text.
- **Using word_tokenize from NLTK without downloading punkt** — Always call `nltk.download('punkt')` before using word_tokenize, or the tokenizer will crash at runtime.

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Recommended Approach</th></tr>
<tr><td>Fast baseline text classifier</td><td>TF-IDF + MultinomialNB Pipeline</td></tr>
<tr><td>Best accuracy, text classification</td><td>TF-IDF (ngram 1-2) + LinearSVC or LogisticRegression</td></tr>
<tr><td>Semantic similarity, word meaning</td><td>Word2Vec (Gensim) or GloVe embeddings</td></tr>
<tr><td>Need real words after normalization</td><td>Lemmatization (spaCy or NLTK WordNetLemmatizer)</td></tr>
<tr><td>Speed over quality for normalization</td><td>Stemming (PorterStemmer)</td></tr>
<tr><td>Named entity extraction</td><td>spaCy NER (faster) or NLTK ne_chunk</td></tr>
<tr><td>Capture multi-word phrases</td><td>TfidfVectorizer(ngram_range=(1,2))</td></tr>
<tr><td>Deploy model to production</td><td>sklearn Pipeline + pickle save</td></tr>
<tr><td>State-of-the-art accuracy</td><td>Hugging Face Transformers (BERT/RoBERTa)</td></tr>
</table>

## 📋 Completion Checklist

- Build full preprocessing function: lowercase, remove URLs/punctuation, remove stopwords, lemmatize
- Explain TF-IDF formula (TF × IDF) and why it beats raw word counts
- Implement CountVectorizer and TF-IDF on a toy corpus and inspect the matrix
- Build spam detector: TF-IDF + Naive Bayes Pipeline, train, evaluate with classification_report
- Build sentiment analyzer: TF-IDF + LogisticRegression, use cross_val_score for stability
- Explain when to use stemming vs lemmatization with concrete examples
- Save and reload a full sklearn Pipeline with pickle; predict on new text
- Run spaCy NER on a sentence and extract PERSON, ORG, GPE entities
- Train Word2Vec on tokenized corpus and compute word similarity
- Handle class imbalance: stratified split + class_weight='balanced' + F1-macro evaluation
