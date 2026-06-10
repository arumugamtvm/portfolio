---
title: Week 8.2 — Dimensionality Reduction (PCA, t-SNE, UMAP)
description: Use PCA for linear compression before modeling, t-SNE only for 2D/3D visualization, UMAP for fast reduction that can transform new data, and LDA when you have labels. The goal is fewer dimensions with the information kept.
---

> 🎯 **TL;DR** — Use **PCA** for linear compression before modeling (always scale first), **t-SNE** for 2D/3D visualization of cluster structure (never for preprocessing), and **UMAP** when t-SNE is too slow or you need to transform new data. Use **LDA** when you have class labels and want maximum class separability. The goal: fewer dimensions, preserved information, faster models.

## 🧠 Mental Model

Think of a 3D sculpture photographed from the best angle — you get a 2D image that captures most of what matters. **PCA** finds the camera angle that captures maximum variance (the "best view" of your data). **t-SNE** is like a magic lens that pulls clusters apart so you can see them clearly — but it distorts distances between clusters. **UMAP** is a faster, smarter lens that better preserves both local clusters and global structure. **LDA** is a lens that specifically maximizes the gap between labeled groups.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Method</th><th>Type</th><th>Linear?</th><th>Speed</th><th>Preserves Global</th><th>Transform New Data?</th><th>Best Use Case</th></tr>
<tr><td>PCA</td><td>Unsupervised</td><td>Yes</td><td>Fast</td><td>Yes</td><td>Yes</td><td>Preprocessing, compression, multicollinearity</td></tr>
<tr><td>Kernel PCA</td><td>Unsupervised</td><td>No (kernel trick)</td><td>Medium</td><td>Partial</td><td>Partial</td><td>Non-linear data, circular/manifold structures</td></tr>
<tr><td>t-SNE</td><td>Unsupervised</td><td>No</td><td>Slow O(n²)</td><td>No</td><td>No</td><td>2D/3D visualization only (&lt; 10k samples)</td></tr>
<tr><td>UMAP</td><td>Unsupervised</td><td>No</td><td>Fast</td><td>Better than t-SNE</td><td>Yes</td><td>Visualization + preprocessing, large datasets</td></tr>
<tr><td>LDA</td><td>Supervised</td><td>Yes</td><td>Fast</td><td>Yes</td><td>Yes</td><td>Classification preprocessing, max class separation</td></tr>
</table>

**PCA vs LDA comparison:**

<table>
<tr><th>Property</th><th>PCA</th><th>LDA</th></tr>
<tr><td>Requires labels?</td><td>No (unsupervised)</td><td>Yes (supervised)</td></tr>
<tr><td>Maximizes</td><td>Total data variance</td><td>Between-class / within-class variance ratio</td></tr>
<tr><td>Max components</td><td>min(n_features, n_samples-1)</td><td>n_classes - 1</td></tr>
<tr><td>Interpretability</td><td>Low (abstract components)</td><td>Low (linear discriminants)</td></tr>
<tr><td>Assumption</td><td>Linear structure</td><td>Normal distribution per class</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Standardize the data** — always required for PCA and LDA (scale-sensitive); recommended for t-SNE and UMAP
2. **Decide method** — use the table above; PCA for preprocessing, t-SNE/UMAP for visualization, LDA for supervised reduction
3. **Find optimal components (PCA)** — plot scree plot + cumulative variance; use 95% threshold rule
4. **Fit and transform** — `fit_transform` on training data; `transform` on test (PCA, LDA, UMAP support this; t-SNE does not)
5. **Visualize the embedding** — scatter plot colored by class/cluster to evaluate separation quality
6. **Evaluate downstream performance** — train a classifier on reduced data and compare accuracy to full-feature baseline
7. **Tune key parameters** — perplexity (t-SNE), n_neighbors + min_dist (UMAP), n_components (all)

---

## 💻 Code Cheatsheet

```python
# ============================================================
# DIMENSIONALITY REDUCTION — COMPLETE CHEATSHEET
# Week 8.2: PCA, Kernel PCA, t-SNE, UMAP, LDA
# ============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_iris, make_circles, make_moons, load_breast_cancer
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA, KernelPCA
from sklearn.manifold import TSNE
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

np.random.seed(42)

# Helper: color palette for 3-class datasets
COLORS = ['navy', 'turquoise', 'darkorange']

# ----------------------------------------------------------
# 1. PCA — PRINCIPAL COMPONENT ANALYSIS
# ----------------------------------------------------------

# Load dataset
X, y = load_iris(return_X_y=True)
target_names = load_iris().target_names
feature_names = load_iris().feature_names

# STEP 1: Standardize — MANDATORY before PCA
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# STEP 2: Fit full PCA to see all variance
pca_full = PCA()
pca_full.fit(X_scaled)

evr        = pca_full.explained_variance_ratio_
cumvar     = np.cumsum(evr)
n_comps    = range(1, len(evr) + 1)

print("Explained Variance Ratio per PC:")
for i, (ev, cv) in enumerate(zip(evr, cumvar)):
    print(f"  PC{i+1}: {ev:.4f} ({ev:.1%}) | Cumulative: {cv:.1%}")

# STEP 3: Scree plot + Cumulative variance plot
fig, axes = plt.subplots(1, 2, figsize=(13, 5))

# Scree plot (individual variance)
axes[0].bar(n_comps, evr, color='steelblue', alpha=0.85, edgecolor='white')
axes[0].plot(n_comps, evr, 'ro-', ms=7)
axes[0].set(title='Scree Plot', xlabel='Principal Component', ylabel='Explained Variance Ratio')
axes[0].set_xticks(n_comps)

# Cumulative variance
axes[1].plot(n_comps, cumvar, 'bo-', ms=7, lw=2)
axes[1].axhline(y=0.95, color='red',   linestyle='--', label='95% threshold')
axes[1].axhline(y=0.90, color='orange',linestyle='--', label='90% threshold')
axes[1].set(title='Cumulative Explained Variance',
            xlabel='Number of Components', ylabel='Cumulative Variance')
axes[1].set_xticks(n_comps); axes[1].legend(); axes[1].grid(alpha=0.3)

plt.suptitle('PCA: How Many Components to Keep?', fontsize=14)
plt.tight_layout(); plt.show()

# Find number of components for 95% variance
n_95 = np.argmax(cumvar >= 0.95) + 1
print(f"\nComponents for 95% variance: {n_95}")

# STEP 4: Apply PCA with chosen components
pca_2d = PCA(n_components=2)
X_pca  = pca_2d.fit_transform(X_scaled)

print(f"Shape: {X_scaled.shape} → {X_pca.shape}")
print(f"PC1 variance: {pca_2d.explained_variance_ratio_[0]:.1%}")
print(f"PC2 variance: {pca_2d.explained_variance_ratio_[1]:.1%}")
print(f"Total variance retained: {pca_2d.explained_variance_ratio_.sum():.1%}")

# PCA components (loading vectors — which original features drive each PC)
loadings = pd.DataFrame(
    pca_2d.components_.T,
    index=feature_names,
    columns=['PC1', 'PC2']
)
print("\nPCA Loadings (feature contribution to each PC):")
print(loadings)

# STEP 5: 2D visualization
fig, ax = plt.subplots(figsize=(8, 6))
for color, i, name in zip(COLORS, [0, 1, 2], target_names):
    ax.scatter(X_pca[y == i, 0], X_pca[y == i, 1],
               color=color, alpha=0.8, s=60, label=name)
ax.set(xlabel=f'PC1 ({pca_2d.explained_variance_ratio_[0]:.1%} variance)',
       ylabel=f'PC2 ({pca_2d.explained_variance_ratio_[1]:.1%} variance)',
       title='PCA — 2D Projection of Iris Dataset')
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()

# Transform new unseen data (only transform — never re-fit!)
X_new = np.array([[5.1, 3.5, 1.4, 0.2]])
X_new_scaled = scaler.transform(X_new)      # use same scaler fitted on train
X_new_pca    = pca_2d.transform(X_new_scaled)  # use same PCA fitted on train
print(f"\nNew sample in PCA space: {X_new_pca}")

# Reconstruction (inverse transform — check information loss)
X_reconstructed = pca_2d.inverse_transform(X_pca)
reconstruction_error = np.mean((X_scaled - X_reconstructed) ** 2)
print(f"Reconstruction error with 2 PCs: {reconstruction_error:.4f}")

# 3D PCA visualization
from mpl_toolkits.mplot3d import Axes3D
pca_3d = PCA(n_components=3)
X_3d   = pca_3d.fit_transform(X_scaled)

fig = plt.figure(figsize=(9, 7))
ax  = fig.add_subplot(111, projection='3d')
for color, i, name in zip(COLORS, [0, 1, 2], target_names):
    ax.scatter(X_3d[y==i,0], X_3d[y==i,1], X_3d[y==i,2],
               color=color, alpha=0.7, s=50, label=name)
ax.set(xlabel='PC1', ylabel='PC2', zlabel='PC3', title='PCA — 3D Projection')
ax.legend(); plt.show()

# ----------------------------------------------------------
# 2. KERNEL PCA — NON-LINEAR DATA
# ----------------------------------------------------------

# Create non-linearly separable data (circles)
X_circles, y_circles = make_circles(n_samples=400, factor=0.3, noise=0.05, random_state=42)

# Standard PCA fails on non-linear data
pca_lin = PCA(n_components=2)
X_pca_lin = pca_lin.fit_transform(X_circles)

# Kernel PCA with RBF kernel
kpca_rbf = KernelPCA(n_components=2, kernel='rbf', gamma=10)
X_kpca   = kpca_rbf.fit_transform(X_circles)

fig, axes = plt.subplots(1, 3, figsize=(16, 5))
for ax, data, title in zip(axes,
    [X_circles, X_pca_lin, X_kpca],
    ['Original (Circles)', 'Standard PCA (fails)', 'Kernel PCA RBF (works!)']):
    ax.scatter(data[:, 0], data[:, 1], c=y_circles, cmap='coolwarm', alpha=0.7, s=30)
    ax.set_title(title, fontsize=12)
plt.suptitle('Kernel PCA: Separating Non-Linear Data', fontsize=14)
plt.tight_layout(); plt.show()

# Available kernels: 'linear', 'poly', 'rbf', 'sigmoid', 'cosine'
for kernel in ['rbf', 'poly', 'sigmoid']:
    kpca = KernelPCA(n_components=2, kernel=kernel, gamma=10)
    X_k  = kpca.fit_transform(X_circles)
    # Each kernel creates different separations

# ----------------------------------------------------------
# 3. t-SNE — VISUALIZATION ONLY
# ----------------------------------------------------------

# Load breast cancer for more interesting t-SNE
X_bc, y_bc = load_breast_cancer(return_X_y=True)
scaler_bc   = StandardScaler()
X_bc_scaled = scaler_bc.fit_transform(X_bc)

# Basic t-SNE with default settings
tsne = TSNE(
    n_components=2,
    perplexity=30,       # try 5, 15, 30, 50 — see how structure changes
    learning_rate=200,   # 'auto' in newer sklearn versions
    n_iter=1000,
    random_state=42      # IMPORTANT: set for reproducibility
)
X_tsne = tsne.fit_transform(X_bc_scaled)

plt.figure(figsize=(9, 6))
colors_bc = ['steelblue' if c == 0 else 'salmon' for c in y_bc]
plt.scatter(X_tsne[:, 0], X_tsne[:, 1], c=colors_bc, alpha=0.7, s=30)
plt.title('t-SNE: Breast Cancer Dataset (perplexity=30)')
plt.xlabel('t-SNE Dim 1'); plt.ylabel('t-SNE Dim 2')
# Add legend manually
from matplotlib.patches import Patch
plt.legend(handles=[Patch(color='steelblue', label='Malignant'),
                    Patch(color='salmon',    label='Benign')])
plt.tight_layout(); plt.show()

# Effect of perplexity — key hyperparameter experiment
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
for ax, perp in zip(axes, [5, 30, 50]):
    tsne_p = TSNE(n_components=2, perplexity=perp, random_state=42)
    X_t    = tsne_p.fit_transform(X_bc_scaled)
    for color, cls, label in [('steelblue', 0, 'Malignant'), ('salmon', 1, 'Benign')]:
        ax.scatter(X_t[y_bc==cls, 0], X_t[y_bc==cls, 1],
                   color=color, label=label, alpha=0.7, s=20)
    ax.set_title(f't-SNE perplexity={perp}')
    ax.legend()
plt.suptitle('t-SNE: Effect of Perplexity Parameter', fontsize=13)
plt.tight_layout(); plt.show()

# IMPORTANT t-SNE rules:
# 1. ONLY for visualization — never use as preprocessing for ML models
# 2. Cannot transform new data — must refit on full dataset
# 3. Inter-cluster distances are NOT meaningful
# 4. Always set random_state for reproducibility

# ----------------------------------------------------------
# 4. UMAP — FAST, GENERAL-PURPOSE REDUCTION
# ----------------------------------------------------------
# Install: pip install umap-learn
import umap

# Basic UMAP
reducer = umap.UMAP(
    n_components=2,
    n_neighbors=15,       # local vs global balance (low=local, high=global)
    min_dist=0.1,         # tightness of clusters in embedding
    metric='euclidean',
    random_state=42
)
X_umap = reducer.fit_transform(X_bc_scaled)

plt.figure(figsize=(9, 6))
plt.scatter(X_umap[y_bc==0, 0], X_umap[y_bc==0, 1], color='steelblue', label='Malignant', alpha=0.7, s=30)
plt.scatter(X_umap[y_bc==1, 0], X_umap[y_bc==1, 1], color='salmon',    label='Benign',    alpha=0.7, s=30)
plt.title('UMAP: Breast Cancer Dataset')
plt.xlabel('UMAP Dim 1'); plt.ylabel('UMAP Dim 2')
plt.legend(); plt.tight_layout(); plt.show()

# UMAP hyperparameter effect
fig, axes = plt.subplots(2, 3, figsize=(18, 10))

for i, n_neighbors in enumerate([5, 15, 50]):
    um = umap.UMAP(n_neighbors=n_neighbors, min_dist=0.1, random_state=42)
    X_u = um.fit_transform(X_bc_scaled)
    axes[0, i].scatter(X_u[y_bc==0,0], X_u[y_bc==0,1], color='steelblue', s=15, alpha=0.7, label='Malignant')
    axes[0, i].scatter(X_u[y_bc==1,0], X_u[y_bc==1,1], color='salmon',    s=15, alpha=0.7, label='Benign')
    axes[0, i].set_title(f'UMAP n_neighbors={n_neighbors}')
    axes[0, i].legend()

for i, min_dist in enumerate([0.01, 0.1, 0.5]):
    um = umap.UMAP(n_neighbors=15, min_dist=min_dist, random_state=42)
    X_u = um.fit_transform(X_bc_scaled)
    axes[1, i].scatter(X_u[y_bc==0,0], X_u[y_bc==0,1], color='steelblue', s=15, alpha=0.7, label='Malignant')
    axes[1, i].scatter(X_u[y_bc==1,0], X_u[y_bc==1,1], color='salmon',    s=15, alpha=0.7, label='Benign')
    axes[1, i].set_title(f'UMAP min_dist={min_dist}')
    axes[1, i].legend()

plt.suptitle('UMAP: Effect of n_neighbors and min_dist', fontsize=14)
plt.tight_layout(); plt.show()

# UMAP can transform new data (unlike t-SNE)
X_tr_bc, X_te_bc, y_tr_bc, y_te_bc = train_test_split(X_bc_scaled, y_bc, test_size=0.2, random_state=42)
reducer_train = umap.UMAP(n_components=2, random_state=42)
X_tr_umap = reducer_train.fit_transform(X_tr_bc)
X_te_umap = reducer_train.transform(X_te_bc)  # This works! Unlike t-SNE
print(f"UMAP train shape: {X_tr_umap.shape}, test shape: {X_te_umap.shape}")

# ----------------------------------------------------------
# 5. LDA — LINEAR DISCRIMINANT ANALYSIS (supervised)
# ----------------------------------------------------------

# LDA requires class labels; max components = n_classes - 1
X_iris, y_iris = load_iris(return_X_y=True)
X_iris_scaled  = StandardScaler().fit_transform(X_iris)

lda = LinearDiscriminantAnalysis(n_components=2)  # max = 3 classes - 1 = 2
X_lda = lda.fit_transform(X_iris_scaled, y_iris)  # NOTE: y is required!

print(f"LDA explained variance ratio: {lda.explained_variance_ratio_}")
print(f"LD1 captures: {lda.explained_variance_ratio_[0]:.1%}")
print(f"LD2 captures: {lda.explained_variance_ratio_[1]:.1%}")

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# LDA visualization
for color, i, name in zip(COLORS, [0,1,2], target_names):
    axes[0].scatter(X_lda[y_iris==i,0], X_lda[y_iris==i,1],
                    color=color, alpha=0.8, s=60, label=name)
axes[0].set(xlabel='LD1', ylabel='LD2', title='LDA — Iris (Supervised)')
axes[0].legend(); axes[0].grid(alpha=0.3)

# PCA visualization side by side
pca_iris = PCA(n_components=2)
X_pca_iris = pca_iris.fit_transform(X_iris_scaled)
for color, i, name in zip(COLORS, [0,1,2], target_names):
    axes[1].scatter(X_pca_iris[y_iris==i,0], X_pca_iris[y_iris==i,1],
                    color=color, alpha=0.8, s=60, label=name)
axes[1].set(xlabel='PC1', ylabel='PC2', title='PCA — Iris (Unsupervised)')
axes[1].legend(); axes[1].grid(alpha=0.3)

plt.suptitle('LDA vs PCA: Class Separation Quality', fontsize=14)
plt.tight_layout(); plt.show()

# Compare classification accuracy: PCA vs LDA vs raw features
X_tr_i, X_te_i, y_tr_i, y_te_i = train_test_split(X_iris_scaled, y_iris,
                                                     test_size=0.2, random_state=42)
lda_fitted = LinearDiscriminantAnalysis(n_components=2).fit(X_tr_i, y_tr_i)
pca_fitted = PCA(n_components=2).fit(X_tr_i)

results = []
for name, X_tr_r, X_te_r in [
    ('Raw (4 features)',  X_tr_i, X_te_i),
    ('PCA (2 components)',pca_fitted.transform(X_tr_i), pca_fitted.transform(X_te_i)),
    ('LDA (2 components)',lda_fitted.transform(X_tr_i), lda_fitted.transform(X_te_i))
]:
    lr = LogisticRegression(max_iter=1000).fit(X_tr_r, y_tr_i)
    acc = lr.score(X_te_r, y_te_i)
    results.append({'Method': name, 'Test Accuracy': acc})

print("\nAccuracy comparison:")
print(pd.DataFrame(results).to_string(index=False))

# ----------------------------------------------------------
# 6. RECONSTRUCTION ERROR (PCA information loss)
# ----------------------------------------------------------

X_large, y_large = load_breast_cancer(return_X_y=True)
X_large_sc = StandardScaler().fit_transform(X_large)

errors = []
variance_retained = []
for n in range(1, X_large.shape[1] + 1):
    p = PCA(n_components=n)
    X_r = p.fit_transform(X_large_sc)
    X_rec = p.inverse_transform(X_r)
    errors.append(np.mean((X_large_sc - X_rec) ** 2))
    variance_retained.append(p.explained_variance_ratio_.sum())

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].plot(range(1, X_large.shape[1]+1), errors, 'bo-', ms=5)
axes[0].set(title='Reconstruction Error vs Components',
            xlabel='Number of Components', ylabel='MSE')
axes[0].grid(alpha=0.3)

axes[1].plot(range(1, X_large.shape[1]+1), variance_retained, 'go-', ms=5)
axes[1].axhline(0.95, color='red', linestyle='--', label='95% variance')
axes[1].set(title='Variance Retained vs Components',
            xlabel='Number of Components', ylabel='Variance Retained')
axes[1].legend(); axes[1].grid(alpha=0.3)
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 7. PIPELINES — DIMENSIONALITY REDUCTION BEFORE ML
# ----------------------------------------------------------

X_bc2, y_bc2 = load_breast_cancer(return_X_y=True)
X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_bc2, y_bc2, test_size=0.2, random_state=42)

# Pipeline: StandardScale → PCA → Logistic Regression
pipeline_pca = Pipeline([
    ('scaler', StandardScaler()),
    ('pca',    PCA(n_components=0.95)),          # keep 95% variance
    ('clf',    LogisticRegression(max_iter=1000))
])
pipeline_pca.fit(X_tr2, y_tr2)
n_comp_used = pipeline_pca.named_steps['pca'].n_components_
print(f"\nPCA Pipeline: {X_bc2.shape[1]} features → {n_comp_used} components")
print(f"Accuracy: {pipeline_pca.score(X_te2, y_te2):.4f}")

# Pipeline: StandardScale → LDA → Logistic Regression
pipeline_lda = Pipeline([
    ('scaler', StandardScaler()),
    ('lda',    LinearDiscriminantAnalysis(n_components=1)),  # binary: max 1
    ('clf',    LogisticRegression())
])
pipeline_lda.fit(X_tr2, y_tr2)
print(f"LDA Pipeline Accuracy: {pipeline_lda.score(X_te2, y_te2):.4f}")

# Cross-validation comparison
for name, pipe in [('Raw', LogisticRegression(max_iter=1000)),
                   ('PCA', pipeline_pca), ('LDA', pipeline_lda)]:
    scores = cross_val_score(pipe, X_bc2, y_bc2, cv=5)
    print(f"{name}: {scores.mean():.4f} ± {scores.std():.4f}")

print("\nDimensionality reduction complete!")
```

---

## ⚙️ Key Parameters / Hyperparameters Table

<table>
<tr><th>Parameter</th><th>Method</th><th>What it Controls</th><th>Guidance</th></tr>
<tr><td>n_components</td><td>PCA / LDA / UMAP</td><td>Output dimensions</td><td>PCA: use 0.95 (95% variance); LDA: max = n_classes-1</td></tr>
<tr><td>n_components (float)</td><td>PCA</td><td>Auto-select to retain X% variance</td><td>PCA(n_components=0.95) selects automatically</td></tr>
<tr><td>kernel</td><td>KernelPCA</td><td>Type of non-linear mapping</td><td>'rbf' most common; 'poly' for polynomial; 'sigmoid'</td></tr>
<tr><td>gamma</td><td>KernelPCA (rbf/poly)</td><td>Kernel bandwidth</td><td>Larger gamma = tighter clusters; tune with CV</td></tr>
<tr><td>perplexity</td><td>t-SNE</td><td>Effective number of neighbors considered</td><td>Range 5–50; default 30; try multiple values</td></tr>
<tr><td>learning_rate</td><td>t-SNE</td><td>Step size for gradient descent optimization</td><td>100–1000; 'auto' in sklearn &gt;= 1.2</td></tr>
<tr><td>n_iter</td><td>t-SNE</td><td>Number of optimization iterations</td><td>1000 (minimum); 2000+ for better results</td></tr>
<tr><td>n_neighbors</td><td>UMAP</td><td>Local vs global structure balance</td><td>Low (5) = local clusters; high (50) = global shape</td></tr>
<tr><td>min_dist</td><td>UMAP</td><td>Minimum distance between points in embedding</td><td>Low (0.01) = tight clusters; high (0.5) = spread out</td></tr>
<tr><td>metric</td><td>UMAP</td><td>Distance metric for neighbor graph</td><td>'euclidean' (default), 'cosine' (text/high-dim)</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is PCA and what problem does it solve?**

A: PCA (Principal Component Analysis) is an unsupervised technique that transforms correlated features into uncorrelated principal components ordered by the variance they capture. It solves multicollinearity, speeds up training by reducing dimensions, and enables visualization of high-dimensional data.

**Q2: How does PCA work mathematically?**

A: PCA standardizes the data → computes the covariance matrix → performs eigendecomposition to get eigenvalues (variance per component) and eigenvectors (directions) → sorts by descending eigenvalue → projects data onto the top-k eigenvectors. The result: k orthogonal dimensions capturing maximum variance.

**Q3: What is the explained variance ratio and how do you use it?**

A: It's the fraction of total variance captured by each principal component. Use the cumulative explained variance plot (scree plot) to choose k: pick the "elbow" or the point where cumulative variance reaches 95%. In sklearn: `PCA(n_components=0.95)` does this automatically.

**Q4: When should you NOT use t-SNE?**

A: Never use t-SNE for preprocessing ML models — it cannot transform new/unseen data without refitting, inter-cluster distances are meaningless, and results are stochastic. Use t-SNE only for 2D/3D exploratory visualization of cluster structure on datasets < 10k samples.

**Q5: What is the key advantage of UMAP over t-SNE?**

A: UMAP is significantly faster (sub-linear vs O(n²)), better preserves global structure (relative distances between clusters are more meaningful), and crucially supports `transform()` on new data — enabling its use as a preprocessing step in ML pipelines.

**Q6: What is the curse of dimensionality?**

A: As dimensions increase, data becomes exponentially sparse. Points that seem close in low dimensions become equidistant in high dimensions (distances lose meaning). Models need exponentially more training data, overfit easily, and suffer slow training. Dimensionality reduction directly addresses this.

**Q7: What is the difference between PCA and LDA?**

A: PCA is unsupervised and maximizes total data variance — it finds the directions where data spreads most. LDA is supervised and maximizes the ratio of between-class to within-class variance — it finds directions that best separate the labeled classes. LDA is better for classification preprocessing when labels are available.

**Q8: What is reconstruction error in PCA?**

A: After projecting data to k components and inverting back to original space, reconstruction error (MSE) measures information lost by the compression. Lower components = higher error. Plot reconstruction error vs number of components to find the knee point — the sweet spot between compression and information loss.

---

## ⚠️ Common Mistakes

- **Not standardizing before PCA** — PCA is scale-sensitive; features with larger ranges dominate the components. Always apply StandardScaler first.
- **Using t-SNE for preprocessing** — t-SNE cannot transform new data and doesn't preserve global structure. It's visualization-only; use UMAP or PCA for preprocessing.
- **Ignoring random_state in t-SNE and UMAP** — both are stochastic; without a fixed seed, results differ between runs and aren't reproducible.
- **Choosing n_components = 2 for PCA without checking variance** — 2 components might retain only 60% of variance. Always check the cumulative explained variance plot first.
- **Fitting PCA on the full dataset before train/test split** — this causes data leakage. Fit only on training data; transform test separately (or use a Pipeline).
- **Comparing inter-cluster distances in t-SNE** — t-SNE distorts global distances; only local neighborhood structure (within clusters) is preserved. Distances between clusters are not meaningful.
- **Applying LDA with n_components > n_classes - 1** — LDA can produce at most (n_classes - 1) discriminant components. For 3-class problems, maximum is 2 components regardless of n_features.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Best Method</th><th>Why</th></tr>
<tr><td>Preprocessing before ML model</td><td>PCA</td><td>Fast, transforms new data, removes multicollinearity</td></tr>
<tr><td>Classification preprocessing (with labels)</td><td>LDA</td><td>Maximizes class separation, supervised</td></tr>
<tr><td>Visualize cluster structure (&lt; 10k samples)</td><td>t-SNE</td><td>Best local neighborhood preservation for viz</td></tr>
<tr><td>Visualize large datasets (&gt; 10k samples)</td><td>UMAP</td><td>Much faster, scales to millions</td></tr>
<tr><td>Non-linear, circular, or manifold data</td><td>Kernel PCA (RBF)</td><td>Maps non-linear structure to separable space</td></tr>
<tr><td>Need to transform new/unseen data</td><td>PCA / LDA / UMAP</td><td>All support .transform(); t-SNE does NOT</td></tr>
<tr><td>High-dimensional text or image features</td><td>PCA or UMAP</td><td>UMAP with cosine metric for text embeddings</td></tr>
<tr><td>Find optimal component count automatically</td><td>PCA(n_components=0.95)</td><td>Retains 95% variance; sklearn handles it</td></tr>
</table>

---

## 📋 Completion Checklist

- Understand PCA intuition: covariance matrix, eigenvalues (variance), eigenvectors (direction)
- Can run full PCA, plot scree plot + cumulative variance, choose optimal components
- Can apply PCA in a sklearn Pipeline and fit/transform train and test separately
- Know t-SNE's limitations (viz only, no new data, non-deterministic, slow)
- Can run t-SNE and experiment with perplexity values (5, 15, 30, 50)
- Can install and use UMAP and tune n_neighbors + min_dist
- Can implement LDA, visualize class separation, and compare with PCA on same data
- Understand reconstruction error and how to use it to select number of PCA components
