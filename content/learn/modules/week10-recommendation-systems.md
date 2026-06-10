---
title: Week 10 — Recommendation Systems
description: Recommendation systems predict what a user will like next using collaborative filtering, content-based filtering, or a hybrid of both. Learn to build them with cosine similarity and SVD, and evaluate with Precision@K and NDCG.
---

> 🎯 **TL;DR** — Recommendation systems predict what a user will like next. Three approaches: **Collaborative Filtering** (similar users/items → ratings matrix + cosine similarity), **Content-Based** (item attributes → genre/feature vectors + dot product), **Hybrid** (combines both — Netflix, Spotify). Key challenge: cold start. Evaluate with Precision@K, Recall@K, NDCG. Build with `surprise` or `sklearn` + cosine similarity.

## 🧠 Mental Model

Imagine you're at a **library with a helpful librarian**:

- **User-Based CF**: The librarian finds readers with taste identical to yours and recommends what they loved that you haven't read yet.
- **Item-Based CF**: You loved "Dune" — the librarian finds books most often borrowed alongside "Dune" by many readers.
- **Content-Based**: You only like science fiction set in space — the librarian filters by genre tags on the books themselves, no other readers needed.
- **Hybrid**: The librarian uses your past reads (content) AND what similar readers enjoy (collaborative) — much more robust.
- **Cold Start problem**: A brand-new reader with no history — the librarian has nothing to go on. Solution: ask about preferences upfront (onboarding), use content-based until enough data accumulates.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>Description</th><th>Pros</th><th>Cons</th></tr>
<tr><td>User-Based CF</td><td>Find users similar to target, recommend their top items</td><td>Personalized, discovers new genres</td><td>Cold start, scales poorly (O(n²) users)</td></tr>
<tr><td>Item-Based CF</td><td>Find items similar to what user liked, recommend those</td><td>More stable (items >> users), scalable</td><td>Cold start for new items</td></tr>
<tr><td>Content-Based</td><td>Match items to user's feature preferences</td><td>No cold start for items, explainable</td><td>Needs rich metadata, filter bubble</td></tr>
<tr><td>Matrix Factorization (SVD)</td><td>Decompose ratings matrix into latent factors</td><td>Handles sparsity, captures hidden patterns</td><td>Less interpretable</td></tr>
<tr><td>Hybrid</td><td>Weighted/switching combination of methods</td><td>Best accuracy, robust to cold start</td><td>More complex to build/tune</td></tr>
<tr><td>Cosine Similarity</td><td>cos(θ) = (A·B) / (||A||·||B||) — angle between vectors</td><td>Scale-invariant, works well on sparse data</td><td>Ignores rating magnitude</td></tr>
<tr><td>Cold Start</td><td>New user/item with no interaction history</td><td>—</td><td>Biggest real-world challenge</td></tr>
<tr><td>Precision@K</td><td>Fraction of top-K recommendations that are relevant</td><td>Measures recommendation quality</td><td>Ignores ranking order</td></tr>
<tr><td>NDCG@K</td><td>Normalized Discounted Cumulative Gain</td><td>Penalizes relevant items ranked lower</td><td>More complex to compute</td></tr>
</table>

---

## 🔢 Key Steps / Process

**User-Based Collaborative Filtering:**

1. Build **User × Item ratings matrix** (pivot table, fill NaN with 0)
2. Compute **cosine similarity** between all user pairs → similarity matrix
3. For target user: find top-N most similar users
4. Collect items rated by similar users that target has NOT seen
5. Score each unseen item: weighted sum of (similarity × rating) across similar users
6. Rank by score → return top-K recommendations

**Item-Based Collaborative Filtering:**

1. Transpose matrix → **Item × User**
2. Compute **cosine similarity** between all item pairs
3. For target item (or items user liked): find top-N most similar items
4. Filter out items user already rated
5. Rank remaining by similarity score → return top-K

**Content-Based Filtering:**

1. Build **item feature matrix** (TF-IDF on genres/tags, or one-hot)
2. Build **user preference vector** from items they've rated (weighted average of feature vectors)
3. Compute **dot product** (or cosine similarity) of user vector × all item vectors
4. Filter out already-seen items → rank by score → return top-K

**Matrix Factorization (SVD):**

1. Fill or treat sparse ratings matrix
2. Decompose: `R ≈ U · Σ · Vᵀ` (or learn P, Q such that `R ≈ P · Qᵀ`)
3. Predicted rating: `r̂(u,i) = Pᵤ · Qᵢᵀ`
4. Use predicted ratings to rank unseen items

---

## 💻 Code Cheatsheet

```python
# ============================================================
# RECOMMENDATION SYSTEMS — Complete Runnable Cheatsheet
# pip install pandas numpy scikit-learn scikit-surprise matplotlib
# Dataset: MovieLens ml-latest-small  https://files.grouplens.org/datasets/movielens/ml-latest-small.zip
# ============================================================

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

# ----------------------------------------------------------
# 1. LOAD DATA
# ----------------------------------------------------------
# ratings.csv: userId, movieId, rating, timestamp
# movies.csv:  movieId, title, genres  (genres pipe-separated: "Action|Comedy")

ratings = pd.read_csv("ratings.csv")
movies  = pd.read_csv("movies.csv")

print(f"Ratings: {ratings.shape} | Users: {ratings.userId.nunique()} | Movies: {ratings.movieId.nunique()}")
print(f"Rating range: {ratings.rating.min()} – {ratings.rating.max()}")
print(ratings.head())

# Sparsity check
n_users  = ratings.userId.nunique()
n_movies = ratings.movieId.nunique()
sparsity = 1 - len(ratings) / (n_users * n_movies)
print(f"Matrix sparsity: {sparsity:.2%}")   # typically >99% sparse

# ----------------------------------------------------------
# 2. USER-BASED COLLABORATIVE FILTERING
# ----------------------------------------------------------
# Step 1: Build User × Movie pivot table
pivot = ratings.pivot_table(index="userId", columns="movieId", values="rating")
pivot_filled = pivot.fillna(0)              # fill missing ratings with 0
print(f"Pivot shape: {pivot_filled.shape}")  # (n_users, n_movies)

# Step 2: Cosine similarity between users
user_sim = cosine_similarity(pivot_filled)  # (n_users, n_users)
user_sim_df = pd.DataFrame(user_sim, index=pivot_filled.index, columns=pivot_filled.index)

def user_based_recommend(user_id, top_n_users=10, top_k=10):
    """
    Recommend movies to a user based on similar users' ratings.
    Returns: pd.Series of {movie_id: predicted_score} sorted descending
    """
    if user_id not in user_sim_df.index:
        return f"User {user_id} not found"

    # Step 3: Find top-N similar users (exclude self)
    similar_users = (user_sim_df[user_id]
                     .drop(user_id)
                     .sort_values(ascending=False)
                     .head(top_n_users))

    # Step 4: Movies already watched by target user
    watched = set(pivot.loc[user_id].dropna().index)

    # Step 5: Weighted score for each unseen movie
    scores = {}
    for sim_user, sim_score in similar_users.items():
        rated = pivot.loc[sim_user].dropna()
        for movie_id, rating in rated.items():
            if movie_id not in watched:
                scores[movie_id] = scores.get(movie_id, 0) + sim_score * rating

    # Step 6: Sort and return top-K
    result = pd.Series(scores).sort_values(ascending=False).head(top_k)
    return result

recs = user_based_recommend(user_id=1)
# Map movie IDs to titles
rec_titles = movies.set_index("movieId").loc[recs.index, "title"]
print("\n=== User-Based Recommendations for User 1 ===")
for movie_id, score in recs.items():
    print(f"  {movies.set_index('movieId').loc[movie_id,'title']:50s}  score={score:.2f}")

# ----------------------------------------------------------
# 3. ITEM-BASED COLLABORATIVE FILTERING
# ----------------------------------------------------------
# Step 1: Transpose → Item × User
item_pivot = pivot_filled.T                    # (n_movies, n_users)

# Step 2: Item similarity matrix
item_sim = cosine_similarity(item_pivot)       # (n_movies, n_movies)
item_sim_df = pd.DataFrame(item_sim, index=item_pivot.index, columns=item_pivot.index)

def item_based_recommend(movie_id, top_k=10):
    """Find movies most similar to a given movie."""
    if movie_id not in item_sim_df.index:
        return f"Movie {movie_id} not found"
    similar = (item_sim_df[movie_id]
               .drop(movie_id)
               .sort_values(ascending=False)
               .head(top_k))
    result = pd.DataFrame({"movieId": similar.index, "similarity": similar.values})
    result = result.merge(movies[["movieId","title"]], on="movieId")
    return result

print("\n=== Item-Based: Movies similar to Toy Story (movieId=1) ===")
print(item_based_recommend(movie_id=1).to_string(index=False))

# ----------------------------------------------------------
# 4. CONTENT-BASED FILTERING
# ----------------------------------------------------------
# Step 1: TF-IDF on genres (pipe-separated → space-separated for sklearn)
movies["genres_clean"] = movies["genres"].str.replace("|", " ", regex=False)

tfidf = TfidfVectorizer(stop_words=None, token_pattern=r"[^\s]+")
genre_matrix = tfidf.fit_transform(movies["genres_clean"])  # (n_movies, n_genres)
print(f"\nGenre TF-IDF shape: {genre_matrix.shape}")

# Step 2: Movie-movie content similarity
content_sim = cosine_similarity(genre_matrix, genre_matrix)
content_sim_df = pd.DataFrame(content_sim,
                               index=movies["movieId"],
                               columns=movies["movieId"])

def content_based_recommend(movie_id, top_k=10):
    """Find movies with similar genre profile."""
    if movie_id not in content_sim_df.index:
        return f"Movie {movie_id} not found"
    similar = (content_sim_df[movie_id]
               .drop(movie_id)
               .sort_values(ascending=False)
               .head(top_k))
    return movies.set_index("movieId").loc[similar.index, "title"].reset_index()

print("\n=== Content-Based: Movies similar to Toy Story (genres: Animation|Children|Comedy) ===")
print(content_based_recommend(1))

# Step 3: Build user preference vector from watch history
def build_user_vector(user_id, ratings_df, genre_mat, movies_df):
    """Weighted average of genre vectors for movies the user has rated."""
    user_ratings = ratings_df[ratings_df["userId"] == user_id][["movieId","rating"]]
    genre_mat_dense = pd.DataFrame(genre_mat.toarray(), index=movies_df["movieId"])
    
    user_vec = np.zeros(genre_mat.shape[1])
    total_weight = 0
    
    for _, row in user_ratings.iterrows():
        mid, rating = int(row["movieId"]), row["rating"]
        if mid in genre_mat_dense.index:
            user_vec    += genre_mat_dense.loc[mid].values * rating
            total_weight += rating
    
    if total_weight > 0:
        user_vec /= total_weight         # weighted average
    norm = np.linalg.norm(user_vec)
    return user_vec / norm if norm > 0 else user_vec

def content_recommend_for_user(user_id, top_k=10):
    """Full content-based pipeline for a user."""
    user_vec = build_user_vector(user_id, ratings, genre_matrix, movies)
    scores = genre_matrix.toarray().dot(user_vec)   # cosine-like content scores
    
    watched = set(ratings[ratings["userId"]==user_id]["movieId"])
    result  = movies.copy()
    result["score"] = scores
    result = result[~result["movieId"].isin(watched)]
    return result.sort_values("score", ascending=False)[["movieId","title","score"]].head(top_k)

print("\n=== Content-Based for User 1 ===")
print(content_recommend_for_user(1))

# ----------------------------------------------------------
# 5. MATRIX FACTORIZATION WITH SURPRISE LIBRARY
# ----------------------------------------------------------
"""
pip install scikit-surprise

from surprise import SVD, Dataset, Reader, accuracy
from surprise.model_selection import cross_validate, train_test_split as s_split

# Load data
reader = Reader(rating_scale=(0.5, 5.0))
data   = Dataset.load_from_df(ratings[["userId","movieId","rating"]], reader)

# Train/test split
trainset, testset = s_split(data, test_size=0.2, random_state=42)

# SVD (matrix factorization)
svd = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02, random_state=42)
svd.fit(trainset)

# Evaluate
predictions = svd.test(testset)
print(f"RMSE: {accuracy.rmse(predictions):.4f}")
print(f"MAE:  {accuracy.mae(predictions):.4f}")

# Cross-validation
cv_results = cross_validate(SVD(), data, measures=["RMSE","MAE"], cv=5, verbose=True)

# Predict rating for a specific user-item pair
pred = svd.predict(uid=1, iid=50)          # user 1, movie 50
print(f"Predicted rating: {pred.est:.2f}")

# Generate top-K recommendations for a user
def svd_recommend(user_id, model, ratings_df, movies_df, top_k=10):
    all_movie_ids = movies_df["movieId"].tolist()
    watched       = set(ratings_df[ratings_df["userId"]==user_id]["movieId"])
    unseen        = [mid for mid in all_movie_ids if mid not in watched]
    
    preds = [(mid, model.predict(user_id, mid).est) for mid in unseen]
    preds.sort(key=lambda x: x[1], reverse=True)
    top   = preds[:top_k]
    
    result = pd.DataFrame(top, columns=["movieId","predicted_rating"])
    return result.merge(movies_df[["movieId","title"]], on="movieId")

print(svd_recommend(user_id=1, model=svd, ratings_df=ratings, movies_df=movies))
"""

# ----------------------------------------------------------
# 6. EVALUATION METRICS
# ----------------------------------------------------------
def precision_at_k(recommended: list, relevant: set, k: int = 10) -> float:
    """Fraction of top-K recommendations that are relevant."""
    rec_k = recommended[:k]
    hits  = len(set(rec_k) & relevant)
    return hits / k

def recall_at_k(recommended: list, relevant: set, k: int = 10) -> float:
    """Fraction of relevant items that appear in top-K recommendations."""
    rec_k = recommended[:k]
    hits  = len(set(rec_k) & relevant)
    return hits / len(relevant) if relevant else 0.0

def dcg_at_k(recommended: list, relevant: set, k: int = 10) -> float:
    """Discounted Cumulative Gain — rewards relevant items ranked higher."""
    score = 0.0
    for i, item in enumerate(recommended[:k], start=1):
        if item in relevant:
            score += 1.0 / np.log2(i + 1)
    return score

def ndcg_at_k(recommended: list, relevant: set, k: int = 10) -> float:
    """Normalized DCG — DCG divided by ideal DCG."""
    dcg_val  = dcg_at_k(recommended, relevant, k)
    ideal    = dcg_at_k(list(relevant), relevant, k)    # best possible ranking
    return dcg_val / ideal if ideal > 0 else 0.0

# Example evaluation
recommended = [1, 5, 3, 10, 7, 2, 8, 4, 6, 9]   # movie IDs ranked by model
relevant     = {1, 3, 7, 12, 15}                  # movies user actually liked

print(f"\n=== Evaluation Metrics ===")
print(f"Precision@10: {precision_at_k(recommended, relevant, 10):.2%}")
print(f"Recall@10:    {recall_at_k(recommended, relevant, 10):.2%}")
print(f"NDCG@10:      {ndcg_at_k(recommended, relevant, 10):.4f}")

# RMSE for rating prediction
from sklearn.metrics import mean_squared_error
y_true = [4.0, 3.5, 5.0, 2.0, 4.5]
y_pred = [3.8, 3.2, 4.7, 2.3, 4.1]
rmse   = np.sqrt(mean_squared_error(y_true, y_pred))
print(f"RMSE: {rmse:.4f}")

# ----------------------------------------------------------
# 7. HYBRID RECOMMENDATION (weighted blend)
# ----------------------------------------------------------
def hybrid_recommend(user_id, collab_weight=0.6, content_weight=0.4, top_k=10):
    """
    Blend collaborative and content-based scores.
    collab_weight + content_weight should = 1.0
    """
    # Get collaborative scores (user-based CF)
    collab_scores = user_based_recommend(user_id, top_k=50)
    # Normalize to [0, 1]
    if len(collab_scores) > 0:
        collab_scores = (collab_scores - collab_scores.min()) / (collab_scores.max() - collab_scores.min() + 1e-8)
    
    # Get content scores
    content_result = content_recommend_for_user(user_id, top_k=50)
    content_scores = content_result.set_index("movieId")["score"]
    if len(content_scores) > 0:
        content_scores = (content_scores - content_scores.min()) / (content_scores.max() - content_scores.min() + 1e-8)
    
    # Combine into unified index
    all_movies = set(collab_scores.index) | set(content_scores.index)
    hybrid = {}
    for mid in all_movies:
        c = collab_scores.get(mid, 0)
        t = content_scores.get(mid, 0)
        hybrid[mid] = collab_weight * c + content_weight * t
    
    result = pd.Series(hybrid).sort_values(ascending=False).head(top_k)
    return movies.set_index("movieId").loc[result.index, "title"].reset_index()

print("\n=== Hybrid Recommendations for User 1 ===")
print(hybrid_recommend(user_id=1))
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Algorithm</th><th>Description</th><th>Typical Values</th></tr>
<tr><td><code>top_n_users</code></td><td>User-Based CF</td><td>Number of similar users to consider</td><td>5–20</td></tr>
<tr><td><code>top_k</code></td><td>All methods</td><td>Number of recommendations to return</td><td>5–20</td></tr>
<tr><td><code>n_factors</code></td><td>SVD / MF</td><td>Number of latent factors</td><td>20–200</td></tr>
<tr><td><code>n_epochs</code></td><td>SVD</td><td>Training iterations</td><td>10–50</td></tr>
<tr><td><code>lr_all</code></td><td>SVD</td><td>Learning rate</td><td>0.001–0.01</td></tr>
<tr><td><code>reg_all</code></td><td>SVD</td><td>Regularization (prevent overfitting)</td><td>0.01–0.1</td></tr>
<tr><td><code>collab_weight</code></td><td>Hybrid</td><td>Weight given to CF score</td><td>0.5–0.8</td></tr>
<tr><td><code>content_weight</code></td><td>Hybrid</td><td>Weight given to content score</td><td>0.2–0.5</td></tr>
<tr><td><code>threshold</code></td><td>Any</td><td>Minimum score to include in results</td><td>0.5–0.7</td></tr>
<tr><td><code>similarity_metric</code></td><td>CF</td><td><code>cosine</code>, <code>pearson</code>, <code>msd</code></td><td>cosine most common</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between User-Based and Item-Based Collaborative Filtering?**

User-Based CF finds users with similar rating patterns and recommends what those users liked. Item-Based CF finds items that are frequently rated similarly by the same users and recommends items similar to what the target user has rated. Item-based is generally preferred in practice because item relationships are more stable over time than user preferences, and it scales better when users >> items.

**Q2: What is the Cold Start problem and how do you solve it?**

Cold start occurs when a new user or new item has little or no interaction history, making it impossible for CF methods to generate recommendations. Solutions: (1) **New user**: show popular items, ask preference questions during onboarding, use demographic features; (2) **New item**: use content-based filtering on item metadata; (3) **Hybrid**: switch to content-based until enough data accumulates, then blend in CF.

**Q3: Explain cosine similarity and why it's used in recommender systems.**

Cosine similarity measures the angle between two vectors: `cos(θ) = (A·B)/(||A||·||B||)`, returning a value in [0, 1]. It's preferred over Euclidean distance because it's scale-invariant — a user who rated 5 movies all 5 stars is treated similarly to one who rated the same 5 movies all 4 stars. This matters in sparse rating matrices where the magnitude of the vector is less meaningful than its direction.

**Q4: What is Matrix Factorization and why does it outperform basic CF?**

Matrix Factorization (e.g., SVD) decomposes the ratings matrix R ≈ P·Qᵀ, where P captures user latent factors and Q captures item latent factors. It handles sparsity better than memory-based CF (which struggles with users/items that have few ratings), captures hidden patterns (e.g., a user's taste for "cerebral sci-fi" without that being an explicit feature), and generalizes well. SVD typically achieves lower RMSE than basic CF.

**Q5: What is Precision@K vs NDCG@K? When would you use each?**

Precision@K measures what fraction of your top-K recommendations are actually relevant — simple and interpretable but ignores ranking order. NDCG@K (Normalized Discounted Cumulative Gain) penalizes relevant items that appear lower in the list — a relevant item at rank 1 contributes more than one at rank 10. Use Precision@K for business metrics (click-through), NDCG@K for research/benchmarking where ranking quality matters.

**Q6: How does content-based filtering differ from collaborative filtering?**

Content-based uses item attributes (genres, tags, descriptions) to match items to a user's expressed preference profile — it doesn't need other users. CF uses the collective behavior of many users (ratings) to find patterns. CF can recommend items outside a user's known preferences (serendipity); content-based tends toward a "filter bubble" (only recommending more of the same genres).

**Q7: What evaluation metrics do you use for recommendation systems?**

For rating prediction: RMSE, MAE. For ranking quality (top-K lists): Precision@K (fraction relevant in top-K), Recall@K (fraction of all relevant items captured), NDCG@K (ranking-order-aware), MAP (Mean Average Precision across all users). In production also track click-through rate, conversion rate, and diversity/serendipity.

**Q8: How would you scale a recommendation system to millions of users?**

(1) Switch from user-based to item-based CF (items more stable, smaller matrix). (2) Use Approximate Nearest Neighbors (FAISS, Annoy) instead of exact cosine similarity. (3) Use Matrix Factorization (ALS on Spark) for offline training. (4) Pre-compute recommendations nightly and serve from a cache (Redis). (5) Use a two-stage architecture: retrieval (fast ANN to get top 500 candidates) + ranking (ML model to rerank).

---

## ⚠️ Common Mistakes

- **Not handling the cold start problem** — deploying pure CF without a fallback for new users/items causes empty recommendation lists; always have a popularity-based fallback.
- **Filling NaN ratings with 0 in the pivot table** — 0 is interpreted as an explicit "no interest" rating, biasing similarity; better to use mean-centered ratings or keep NaN and use only observed ratings in similarity computation.
- **Evaluating with random train/test split** — for time-series data (interactions), you must use temporal split (train on past, test on future); random split leaks future data into training.
- **Using Precision@K without checking for trivially popular items** — a system that always recommends blockbusters can achieve decent Precision@K while providing zero personalization; also measure coverage and diversity.
- **Ignoring data sparsity** — real datasets are >99% sparse; always check sparsity before choosing a method; basic CF degrades significantly above 99.5% sparsity.
- **Not normalizing scores before blending in hybrid systems** — CF scores and content scores are on different scales; normalize both to [0,1] before applying weights.
- **Recommending items the user has already interacted with** — always filter out previously seen/purchased/rated items from the candidate pool before ranking.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>Method</th><th>Why</th></tr>
<tr><td>Enough user-item interactions, stable user base</td><td>Item-Based CF</td><td>Stable similarities, scalable</td></tr>
<tr><td>Rich item metadata (genres, descriptions, tags)</td><td>Content-Based</td><td>No cold start for items, explainable</td></tr>
<tr><td>New user, no history</td><td>Popularity-based or Content-Based</td><td>CF has nothing to work with</td></tr>
<tr><td>Best accuracy, production system</td><td>Hybrid (CF + Content)</td><td>Combines strengths of both</td></tr>
<tr><td>Very large scale (millions of users)</td><td>Matrix Factorization + ANN</td><td>SVD/ALS + FAISS for retrieval</td></tr>
<tr><td>Academic research / benchmarking</td><td>SVD via <code>surprise</code></td><td>Industry-standard baseline</td></tr>
<tr><td>Explicit ratings (1-5 stars)</td><td>SVD / User-CF</td><td>Designed for explicit feedback</td></tr>
<tr><td>Implicit feedback (clicks, views)</td><td>ALS / LightFM</td><td>Better suited for binary signals</td></tr>
<tr><td>Need to explain recommendations</td><td>Content-Based</td><td>"Because you liked Action movies..."</td></tr>
<tr><td>Cold start new items</td><td>Content-Based</td><td>Uses metadata, not interactions</td></tr>
</table>

---

## 📋 Completion Checklist

- Understand the 3 core types: User-Based CF, Item-Based CF, Content-Based
- Built a User × Item pivot table and computed cosine similarity matrix
- Implemented user-based recommendation function with watched-item filtering
- Implemented item-based recommendation function
- Built TF-IDF genre matrix and content-based recommendation
- Computed Precision@K and NDCG@K evaluation metrics
- Used `scikit-surprise` SVD for matrix factorization and evaluated with RMSE
- Built a hybrid recommender blending CF and content-based scores
