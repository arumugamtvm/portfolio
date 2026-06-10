---
title: Week 4.2 — Machine Learning: Clustering
description: Clustering finds hidden groupings in unlabelled data without any target variable. It is the core unsupervised learning tool for customer segmentation, anomaly detection, and pre-labelling datasets.
---

> 🎯 TL;DR — Clustering finds hidden groupings in unlabelled data without any target variable; it is the core unsupervised learning tool AI Engineers use for customer segmentation, anomaly detection, and pre-labelling large datasets.

---

## 🧠 Mental Model

Imagine you pour a bag of mixed Skittles onto a white table. You don't know the flavour names — you just see colours. You naturally group red ones together, yellow ones together, and so on. That is clustering: you let the data's own geometry define the groups.

- **K-Means** is you deciding upfront "I'll make 5 piles" and sliding candies around until each pile is tightest.
- **Agglomerative** is you starting with every candy alone, then gluing the two closest ones together, again and again, until you have one big pile — then cutting the gluing history at a chosen height.
- **DBSCAN** notices that some candies are isolated — true outliers — and refuses to force them into a group.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>K-Means</td><td>Iteratively assign points to nearest centroid, recompute centroids</td><td>Fast, scalable; default choice for large data</td></tr>
<tr><td>Elbow Method</td><td>Plot inertia vs K; pick the "knee" where improvement slows</td><td>Practical way to choose K without labels</td></tr>
<tr><td>Silhouette Score</td><td>How similar a point is to its cluster vs nearest other cluster (-1 to 1)</td><td>Best single unsupervised quality metric</td></tr>
<tr><td>Inertia</td><td>Sum of squared distances from points to centroids</td><td>Lower = tighter clusters; used in elbow plot</td></tr>
<tr><td>Agglomerative</td><td>Bottom-up merging of clusters using a linkage rule</td><td>Works for any shape; shows full merge history</td></tr>
<tr><td>Dendrogram</td><td>Tree diagram of all merges</td><td>Visually pick K by drawing a horizontal cut</td></tr>
<tr><td>Ward Linkage</td><td>Minimise within-cluster variance at each merge</td><td>Best general-purpose linkage strategy</td></tr>
<tr><td>DBSCAN</td><td>Clusters = dense regions; noise points = outliers</td><td>Only algorithm that handles arbitrary shapes AND outliers</td></tr>
<tr><td>eps</td><td>DBSCAN: max distance between two points in same neighbourhood</td><td>Controls cluster radius; tune with k-distance plot</td></tr>
<tr><td>min_samples</td><td>DBSCAN: min points to form a core point</td><td>Controls density threshold</td></tr>
<tr><td>Davies-Bouldin</td><td>Ratio of within-cluster to between-cluster distances</td><td>Lower = better separation</td></tr>
<tr><td>k-means++</td><td>Smart centroid initialisation</td><td>Faster convergence, better results than random init</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Load & scale data** — clustering uses distance; always `StandardScaler` first
2. **Choose algorithm** — K-Means for large/spherical, Agglomerative for small/unknown K, DBSCAN for noise/arbitrary shape
3. **Find optimal K (K-Means)** — Elbow Method (inertia vs K) + Silhouette Score vs K; pick the elbow
4. **Find optimal K (Agglomerative)** — plot dendrogram; draw horizontal cut at biggest vertical gap
5. **Tune eps/min_samples (DBSCAN)** — k-distance plot (sort distances to kth neighbour; pick the "knee")
6. **Fit the model** — `fit_predict(X_scaled)` returns cluster label per point
7. **Evaluate** — Silhouette Score (>0.5 good), Davies-Bouldin (lower = better), Calinski-Harabasz (higher = better)
8. **Interpret clusters** — `groupby(cluster_label).mean()` to profile each segment
9. **Visualise** — scatter plot coloured by cluster label; plot centroids with 'X' marker

---

## 💻 Code Cheatsheet

```python
# ============================================================
# WEEK 4.2 — COMPLETE CLUSTERING CHEATSHEET
# All code is copy-paste runnable. Requires:
# pip install scikit-learn scipy matplotlib seaborn
# ============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (silhouette_score, davies_bouldin_score,
                              calinski_harabasz_score)

# ─── 0. Generate or Load Data ────────────────────────────────
from sklearn.datasets import make_blobs
X_raw, y_true = make_blobs(n_samples=400, centers=4, cluster_std=0.9, random_state=42)

# ALWAYS scale before clustering — distance-based algorithms
scaler  = StandardScaler()
X       = scaler.fit_transform(X_raw)

# ─── 1. Utility: Evaluate Any Clustering ─────────────────────
def evaluate_clustering(X, labels, name="Model"):
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise    = (labels == -1).sum()
    if n_clusters < 2:
        print(f"{name}: Only {n_clusters} cluster found — can't evaluate."); return
    s  = silhouette_score(X, labels)
    db = davies_bouldin_score(X, labels)
    ch = calinski_harabasz_score(X, labels)
    print(f"\n{'='*50}\n  {name}\n{'='*50}")
    print(f"  Clusters           : {n_clusters}  |  Noise points: {n_noise}")
    print(f"  Silhouette Score   : {s:.4f}  (-1 to 1,  HIGHER = better)")
    print(f"  Davies-Bouldin     : {db:.4f}  (0 to inf, LOWER  = better)")
    print(f"  Calinski-Harabasz  : {ch:.2f}  (0 to inf, HIGHER = better)")

# ─── 2. K-Means — Full Implementation ───────────────────────
from sklearn.cluster import KMeans

# Step 1: Find optimal K (Elbow + Silhouette)
inertias     = []
silhouettes  = []
K_range      = range(2, 11)

for k in K_range:
    km  = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42)
    lbl = km.fit_predict(X)
    inertias.append(km.inertia_)
    silhouettes.append(silhouette_score(X, lbl))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
ax1.plot(K_range, inertias,    'bo-'); ax1.set(xlabel='K', ylabel='Inertia',         title='Elbow Method')
ax2.plot(K_range, silhouettes, 'rs-'); ax2.set(xlabel='K', ylabel='Silhouette Score', title='Silhouette vs K')
plt.tight_layout(); plt.show()

# Step 2: Train with optimal K
optimal_k = 4
km_final  = KMeans(
    n_clusters=optimal_k,
    init='k-means++',   # smarter than random — avoids bad initialisations
    n_init=10,          # run 10 times, keep best (lowest inertia)
    max_iter=300,       # max iterations per run
    random_state=42
)
labels_km = km_final.fit_predict(X)
centers   = km_final.cluster_centers_

print(f"Inertia          : {km_final.inertia_:.2f}")
print(f"Cluster sizes    : {np.bincount(labels_km)}")
evaluate_clustering(X, labels_km, f"K-Means K={optimal_k}")

# Step 3: Visualise clusters
colors = ['#e74c3c','#3498db','#2ecc71','#f39c12']
plt.figure(figsize=(8,6))
for i in range(optimal_k):
    mask = labels_km == i
    plt.scatter(X_raw[mask,0], X_raw[mask,1], c=colors[i], alpha=0.6, label=f'Cluster {i}')
centers_orig = scaler.inverse_transform(centers)
plt.scatter(centers_orig[:,0], centers_orig[:,1],
            c='black', marker='X', s=200, zorder=5, label='Centroids')
plt.legend(); plt.title(f'K-Means (K={optimal_k})'); plt.show()

# ─── 3. Agglomerative (Hierarchical) Clustering ─────────────
from sklearn.cluster import AgglomerativeClustering
from scipy.cluster.hierarchy import dendrogram, linkage

# Step 1: Dendrogram — choose K visually
Z = linkage(X, method='ward')    # ward minimises within-cluster variance

plt.figure(figsize=(14, 6))
dendrogram(Z, truncate_mode='lastp', p=20, leaf_rotation=45,
           leaf_font_size=10, show_contracted=True)
plt.title('Dendrogram — Cut the horizontal line to choose K')
plt.xlabel('Sample (cluster size)'); plt.ylabel('Merge Distance')
plt.axhline(y=4.0, color='red', linestyle='--', label='Cut → K=4')
plt.legend(); plt.show()

# Step 2: Fit with chosen K
agg        = AgglomerativeClustering(n_clusters=4, linkage='ward')
labels_agg = agg.fit_predict(X)
evaluate_clustering(X, labels_agg, "Agglomerative (Ward, K=4)")

# Step 3: Compare linkage methods
fig, axes = plt.subplots(1, 4, figsize=(20, 5))
for ax, method in zip(axes, ['ward', 'complete', 'average', 'single']):
    lbl = AgglomerativeClustering(n_clusters=4, linkage=method).fit_predict(X)
    sc  = silhouette_score(X, lbl)
    for i in range(4): ax.scatter(X[lbl==i,0], X[lbl==i,1], alpha=0.6)
    ax.set_title(f'{method}\nSilhouette: {sc:.3f}')
plt.tight_layout(); plt.show()

# ─── 4. DBSCAN — Density-Based Clustering ───────────────────
from sklearn.cluster import DBSCAN

# Tune eps using k-distance plot (elbow = good eps)
from sklearn.neighbors import NearestNeighbors
nn = NearestNeighbors(n_neighbors=5)
nn.fit(X)
distances, _ = nn.kneighbors(X)
distances = np.sort(distances[:, -1])    # distance to 5th neighbour
plt.plot(distances); plt.title('k-distance Plot — Pick eps at the knee')
plt.ylabel('5th-NN Distance'); plt.show()

dbscan    = DBSCAN(eps=0.4, min_samples=5, metric='euclidean')
labels_db = dbscan.fit_predict(X)

n_clusters = len(set(labels_db)) - (1 if -1 in labels_db else 0)
n_noise    = (labels_db == -1).sum()
print(f"DBSCAN: {n_clusters} clusters, {n_noise} noise points")
evaluate_clustering(X, labels_db, "DBSCAN")

# Visualise (noise in black X)
cmap = plt.cm.tab10
plt.figure(figsize=(8,6))
for i in range(n_clusters):
    mask = labels_db == i
    plt.scatter(X[mask,0], X[mask,1], color=cmap(i/n_clusters), alpha=0.7, label=f'Cluster {i}')
noise = labels_db == -1
plt.scatter(X[noise,0], X[noise,1], c='black', marker='x', s=60, label='Noise')
plt.legend(); plt.title(f'DBSCAN: {n_clusters} clusters, {n_noise} outliers'); plt.show()

# ─── 5. Real-World: Customer Segmentation ───────────────────
np.random.seed(42)
customers = pd.DataFrame({
    'Age':              np.random.randint(18, 70, 300),
    'Annual_Income_k':  np.random.randint(15, 150, 300),
    'Spending_Score':   np.random.randint(1, 100, 300)
})

X_cust   = StandardScaler().fit_transform(customers)
km_cust  = KMeans(n_clusters=5, init='k-means++', n_init=10, random_state=42)
customers['Segment'] = km_cust.fit_predict(X_cust)

# Profile each segment
profile = customers.groupby('Segment').agg(['mean', 'count'])
print(profile)

# Name segments based on patterns
names = {0:'Budget Shoppers', 1:'High Value', 2:'Young Low Spend',
         3:'Senior Moderate', 4:'Middle Income'}
customers['Segment_Name'] = customers['Segment'].map(names)
print(customers['Segment_Name'].value_counts())
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td>KMeans: <code>n_clusters</code></td><td>Number of clusters K</td><td>Use elbow + silhouette to find</td></tr>
<tr><td>KMeans: <code>init</code></td><td>Centroid initialisation strategy</td><td>'k-means++' (default, smart)</td></tr>
<tr><td>KMeans: <code>n_init</code></td><td>Times to run with different seeds</td><td>10 (keep best)</td></tr>
<tr><td>KMeans: <code>max_iter</code></td><td>Max iterations per run</td><td>300</td></tr>
<tr><td>Agglomerative: <code>linkage</code></td><td>How to measure cluster distance</td><td>'ward' (best default), 'complete', 'average', 'single'</td></tr>
<tr><td>Agglomerative: <code>n_clusters</code></td><td>Number of clusters K (or set threshold)</td><td>From dendrogram visual</td></tr>
<tr><td>DBSCAN: <code>eps</code></td><td>Max distance to be in same neighbourhood</td><td>Tune with k-distance plot knee</td></tr>
<tr><td>DBSCAN: <code>min_samples</code></td><td>Min points for a core point</td><td>5 (rule of thumb: 2×features)</td></tr>
<tr><td>DBSCAN: <code>metric</code></td><td>Distance function</td><td>'euclidean' (default)</td></tr>
<tr><td>silhouette_score</td><td>Eval metric — no labels needed</td><td>&gt;0.5 = good; &gt;0.7 = strong</td></tr>
<tr><td>davies_bouldin_score</td><td>Eval metric — lower = better</td><td>&lt;1.0 is good</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between supervised and unsupervised learning?**

A1: Supervised learning trains on labelled data (input + correct output) to predict a target. Unsupervised learning has no labels — it finds hidden structure in data. Clustering is unsupervised: we find natural groups without any ground-truth class.

**Q2: Walk me through the K-Means algorithm step by step.**

A2: (1) Choose K. (2) Randomly initialise K centroids (k-means++ does this smartly). (3) Assign every point to its nearest centroid. (4) Recompute each centroid as the mean of its assigned points. (5) Repeat 3–4 until centroids stop moving (convergence).

**Q3: How do you choose K in K-Means?**

A3: Two methods together: (a) Elbow Method — plot inertia vs K; pick the K at the "elbow" where improvement plateaus. (b) Silhouette Score vs K — pick the K with the highest silhouette score. When both agree, that K is reliable.

**Q4: What is a dendrogram and how do you use it?**

A4: A dendrogram is a tree diagram of all merges in hierarchical clustering. The y-axis is the merge distance. To choose K, draw a horizontal line where the vertical gaps are largest — the number of lines it cuts equals K.

**Q5: When would you choose DBSCAN over K-Means?**

A5: When clusters have arbitrary shapes (not spherical), when you don't know K upfront, or when you need to detect outliers. DBSCAN labels noise points as -1 automatically — K-Means forces every point into a cluster.

**Q6: What evaluation metrics can you use for clustering (no labels)?**

A6: Silhouette Score (-1 to 1, higher is better — measures cohesion vs separation), Davies-Bouldin Index (lower is better — ratio of within to between cluster distances), and Calinski-Harabasz Index (higher is better — ratio of between to within cluster variance). Inertia (K-Means only) measures tightness.

---

## ⚠️ Common Mistakes

- **Not scaling before clustering** — distance metrics are meaningless when features have different ranges; always `StandardScaler` first.
- **Always using K-Means for everything** — K-Means assumes spherical, equal-sized clusters; DBSCAN or Agglomerative handle arbitrary shapes.
- **Forgetting `n_init > 1`** — K-Means with a single random init can converge to a local minimum; `n_init=10` runs 10 times and keeps the best.
- **Ignoring noise points in DBSCAN output** — `labels_db == -1` are outliers, not a cluster; treat them separately or adjust eps.
- **Evaluating clustering with accuracy** — there are no ground-truth labels; use Silhouette, Davies-Bouldin, or Calinski-Harabasz.
- **Applying PCA after clustering instead of before** — reduce dimensions first so distance metrics work in a lower-dimensional, less noisy space.
- **Cutting the dendrogram arbitrarily** — always look for the largest vertical gap; that is where the natural number of clusters lies.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Large dataset (&gt;10k samples), spherical clusters</td><td>K-Means with k-means++</td></tr>
<tr><td>Unknown K, small dataset (&lt;5k samples)</td><td>Agglomerative + dendrogram</td></tr>
<tr><td>Arbitrary cluster shapes</td><td>DBSCAN</td></tr>
<tr><td>Need to detect outliers</td><td>DBSCAN (labels noise as -1)</td></tr>
<tr><td>Customer / market segmentation</td><td>K-Means (interpretable centroids)</td></tr>
<tr><td>Gene / document hierarchical grouping</td><td>Agglomerative (Ward)</td></tr>
<tr><td>Visualising cluster hierarchy</td><td>Agglomerative + dendrogram</td></tr>
<tr><td>Noisy data with varying density</td><td>DBSCAN with tuned eps</td></tr>
</table>

---

## 📋 Completion Checklist

- Implement K-Means from scratch; explain convergence criterion
- Use Elbow Method AND Silhouette Score together to pick optimal K
- Plot and interpret a dendrogram; use it to choose K for Agglomerative clustering
- Compare all four linkage methods (Ward, Complete, Average, Single) on the same dataset
- Run DBSCAN; identify noise points and explain eps/min_samples effect
- Evaluate clustering using Silhouette, Davies-Bouldin, and Calinski-Harabasz scores
- Apply clustering to a real-world segmentation problem and interpret each segment
- Explain why StandardScaler is required before any distance-based algorithm
