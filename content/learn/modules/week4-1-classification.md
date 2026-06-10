---
title: Week 4.1 — Machine Learning: Classification
description: Classification maps inputs to discrete labels like spam/not-spam or disease/healthy. Learn its algorithms, metrics, and tuning strategies — the foundation of every supervised ML system.
---

> 🎯 TL;DR — Classification maps inputs to discrete labels (spam/not-spam, disease/healthy); mastering its algorithms, metrics, and tuning strategies is the foundation of every supervised ML system an AI Engineer builds.

---

## 🧠 Mental Model

Think of a classification algorithm as a sorting machine at a post office: each letter (data point) arrives with various features (weight, size, destination zip), and the machine routes it into exactly one bin (class). Different algorithms just use different sorting rules — a Decision Tree checks "is weight > 500g?", SVM draws the sharpest dividing line between bins, and KNN asks "which bin do my 5 nearest neighbours belong to?"

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Logistic Regression</td><td>Linear model outputting sigmoid probability</td><td>Fast baseline; coefficients are interpretable log-odds</td></tr>
<tr><td>Decision Tree</td><td>Recursive feature-threshold splits</td><td>Interpretable rules; prone to overfitting</td></tr>
<tr><td>Random Forest</td><td>Bagging of 100s of trees</td><td>High accuracy, robust, built-in feature importance</td></tr>
<tr><td>SVM</td><td>Maximise margin between classes</td><td>Excellent on high-dim data; slow on large datasets</td></tr>
<tr><td>KNN</td><td>Majority vote of K nearest neighbours</td><td>Zero training cost; slow at inference</td></tr>
<tr><td>Naive Bayes</td><td>Bayes' theorem + independence assumption</td><td>Best for text; extremely fast</td></tr>
<tr><td>Confusion Matrix</td><td>TP/FP/FN/TN breakdown</td><td>Foundation of every classification metric</td></tr>
<tr><td>Precision</td><td>TP / (TP+FP)</td><td>Use when false positives are costly (spam)</td></tr>
<tr><td>Recall</td><td>TP / (TP+FN)</td><td>Use when false negatives are costly (cancer)</td></tr>
<tr><td>F1-Score</td><td>Harmonic mean of P &amp; R</td><td>Best single metric for imbalanced classes</td></tr>
<tr><td>ROC-AUC</td><td>Area under TPR vs FPR curve</td><td>Threshold-independent ranking quality</td></tr>
<tr><td>SMOTE</td><td>Synthetic minority oversampling</td><td>Fix class imbalance without losing data</td></tr>
<tr><td>GridSearchCV</td><td>Exhaustive hyperparameter search with CV</td><td>Reproducible best-param selection</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Load & split data** — `train_test_split` before any preprocessing
2. **EDA** — check class balance, distributions, nulls, correlations
3. **Preprocess** — scale (SVM/KNN/LR need it), encode categoricals, impute nulls — all inside a Pipeline
4. **Establish baseline** — `DummyClassifier` gives the floor
5. **Train multiple algorithms** — Logistic Regression, Random Forest, SVM, KNN, Naive Bayes
6. **Evaluate with appropriate metric** — F1/AUC for imbalanced; accuracy only if balanced
7. **Handle class imbalance** — `class_weight='balanced'` or SMOTE on training data only
8. **Hyperparameter tuning** — `GridSearchCV` or `RandomizedSearchCV` with stratified CV
9. **Final evaluation** — test set used exactly once; report classification_report + confusion matrix + ROC-AUC
10. **Save pipeline** — `joblib.dump(pipeline, 'model.pkl')`

---

## 💻 Code Cheatsheet

```python
# ============================================================
# WEEK 4.1 — COMPLETE CLASSIFICATION CHEATSHEET
# All code is copy-paste runnable. Requires:
# pip install scikit-learn imbalanced-learn matplotlib seaborn
# ============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import (train_test_split, GridSearchCV,
                                     StratifiedKFold, cross_val_score)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, confusion_matrix, classification_report,
                             roc_auc_score, roc_curve)

# ─── 0. Load Data ───────────────────────────────────────────
data = load_breast_cancer()
X, y = data.data, data.target          # 569 samples, 30 features, binary

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ─── 1. Utility: Evaluate Any Classifier ────────────────────
def evaluate(model, X_test, y_test, name):
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
    print(f"\n{'='*50}\n  {name}\n{'='*50}")
    print(classification_report(y_test, y_pred, target_names=data.target_names))
    if y_proba is not None:
        print(f"  ROC-AUC : {roc_auc_score(y_test, y_proba):.4f}")

# ─── 2. Confusion Matrix Plot ────────────────────────────────
def plot_cm(y_test, y_pred, labels=None):
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=labels or ['Neg','Pos'],
                yticklabels=labels or ['Neg','Pos'])
    plt.xlabel('Predicted'); plt.ylabel('Actual'); plt.title('Confusion Matrix')
    plt.show()
    if cm.shape == (2,2):
        TP, FP, FN, TN = cm[1,1], cm[0,1], cm[1,0], cm[0,0]
        print(f"TP={TP}  FP={FP}  FN={FN}  TN={TN}")
        print(f"Precision = {TP/(TP+FP):.4f} | Recall = {TP/(TP+FN):.4f}")
        print(f"F1 = {2*TP/(2*TP+FP+FN):.4f} | Accuracy = {(TP+TN)/cm.sum():.4f}")

# ─── 3. Logistic Regression ──────────────────────────────────
from sklearn.linear_model import LogisticRegression

lr_pipe = Pipeline([
    ('sc', StandardScaler()),
    ('lr', LogisticRegression(C=1.0, max_iter=500, random_state=42))
])
lr_pipe.fit(X_train, y_train)
evaluate(lr_pipe, X_test, y_test, "Logistic Regression")

# Custom decision threshold (lower = higher recall for medical use)
y_proba_lr = lr_pipe.predict_proba(X_test)[:, 1]
y_pred_90recall = (y_proba_lr > 0.3).astype(int)   # lower threshold → more recall
print(f"Recall @threshold=0.3: {recall_score(y_test, y_pred_90recall):.4f}")

# ─── 4. KNN — Find Optimal K ────────────────────────────────
from sklearn.neighbors import KNeighborsClassifier

k_scores = []
for k in range(1, 21):
    pipe_k = Pipeline([('sc', StandardScaler()),
                       ('knn', KNeighborsClassifier(n_neighbors=k))])
    scores = cross_val_score(pipe_k, X_train, y_train, cv=5, scoring='f1')
    k_scores.append(scores.mean())

best_k = list(range(1, 21))[k_scores.index(max(k_scores))]
print(f"Best K = {best_k}")

knn_pipe = Pipeline([
    ('sc', StandardScaler()),
    ('knn', KNeighborsClassifier(n_neighbors=best_k, metric='euclidean'))
])
knn_pipe.fit(X_train, y_train)
evaluate(knn_pipe, X_test, y_test, f"KNN (K={best_k})")

# ─── 5. Naive Bayes (Gaussian for continuous features) ───────
from sklearn.naive_bayes import GaussianNB, MultinomialNB
from sklearn.feature_extraction.text import CountVectorizer

gnb = GaussianNB()
gnb.fit(X_train, y_train)
evaluate(gnb, X_test, y_test, "Gaussian Naive Bayes")

# MultinomialNB: text/spam example
emails = ["Free money click now", "Meeting tomorrow 3pm",
          "Win a prize limited time", "Please send report"]
labels = [1, 0, 1, 0]
text_pipe = Pipeline([('vec', CountVectorizer()),
                      ('mnb', MultinomialNB(alpha=1.0))])  # alpha=Laplace smoothing
text_pipe.fit(emails[:3], labels[:3])
print(text_pipe.predict(["Congratulations you won"]))      # → [1]

# ─── 6. Decision Tree, Random Forest, SVM ────────────────────
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC

models = {
    "Decision Tree": Pipeline([
        ('dt', DecisionTreeClassifier(max_depth=5, criterion='gini', random_state=42))
    ]),
    "Random Forest": Pipeline([
        ('rf', RandomForestClassifier(n_estimators=100, max_depth=5, n_jobs=-1, random_state=42))
    ]),
    "SVM (RBF)": Pipeline([
        ('sc', StandardScaler()),
        ('svm', SVC(kernel='rbf', C=10, gamma='scale', probability=True))
    ]),
}

for name, pipe in models.items():
    pipe.fit(X_train, y_train)
    evaluate(pipe, X_test, y_test, name)

# ─── 7. GridSearchCV — All Classifiers ──────────────────────
from sklearn.model_selection import RandomizedSearchCV

# Random Forest GridSearch
rf_params = {
    'rf__n_estimators': [50, 100, 200],
    'rf__max_depth':    [None, 5, 10],
    'rf__criterion':    ['gini', 'entropy']
}
rf_grid = GridSearchCV(
    Pipeline([('rf', RandomForestClassifier(random_state=42))]),
    rf_params, cv=StratifiedKFold(5), scoring='f1', n_jobs=-1
)
rf_grid.fit(X_train, y_train)
print(f"Best RF: {rf_grid.best_params_}  F1={rf_grid.best_score_:.4f}")

# SVM GridSearch (scaler inside pipeline — no leakage)
svm_params = {
    'svm__C':      [0.1, 1, 10],
    'svm__kernel': ['rbf', 'linear'],
    'svm__gamma':  ['scale', 'auto']
}
svm_grid = GridSearchCV(
    Pipeline([('sc', StandardScaler()), ('svm', SVC(probability=True))]),
    svm_params, cv=5, scoring='f1'
)
svm_grid.fit(X_train, y_train)
print(f"Best SVM: {svm_grid.best_params_}  F1={svm_grid.best_score_:.4f}")

# ─── 8. Handle Class Imbalance ───────────────────────────────
from imblearn.over_sampling import SMOTE

# Option A: class_weight='balanced'
rf_bal = RandomForestClassifier(class_weight='balanced', n_estimators=100, random_state=42)
rf_bal.fit(X_train, y_train)

# Option B: SMOTE — only on training data
sm = SMOTE(random_state=42)
X_res, y_res = sm.fit_resample(X_train, y_train)
print(f"Before SMOTE: {np.bincount(y_train)}")
print(f"After SMOTE : {np.bincount(y_res)}")

# ─── 9. ROC Curve ────────────────────────────────────────────
y_proba = rf_grid.predict_proba(X_test)[:, 1]
fpr, tpr, _ = roc_curve(y_test, y_proba)
auc = roc_auc_score(y_test, y_proba)

plt.figure(figsize=(6,5))
plt.plot(fpr, tpr, label=f'AUC = {auc:.3f}')
plt.plot([0,1],[0,1],'k--', label='Random')
plt.xlabel('FPR'); plt.ylabel('TPR'); plt.title('ROC Curve')
plt.legend(); plt.tight_layout(); plt.show()
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td>LR: <code>C</code></td><td>Inverse regularisation strength — higher = less regularisation</td><td>0.01, 0.1, 1, 10, 100</td></tr>
<tr><td>LR: <code>max_iter</code></td><td>Max gradient steps to convergence</td><td>200–2000</td></tr>
<tr><td>KNN: <code>n_neighbors</code></td><td>K — number of neighbours to vote</td><td>3, 5, 7, 11 (odd for binary)</td></tr>
<tr><td>KNN: <code>metric</code></td><td>Distance function</td><td>'euclidean', 'manhattan'</td></tr>
<tr><td>DT: <code>max_depth</code></td><td>Depth cap to prevent overfitting</td><td>3, 5, 10, None</td></tr>
<tr><td>DT: <code>criterion</code></td><td>Split quality measure</td><td>'gini', 'entropy'</td></tr>
<tr><td>RF: <code>n_estimators</code></td><td>Number of trees</td><td>100, 200, 500</td></tr>
<tr><td>RF: <code>max_features</code></td><td>Features sampled per split</td><td>'sqrt' (default), 'log2'</td></tr>
<tr><td>SVM: <code>C</code></td><td>Margin-error tradeoff — higher = tighter fit</td><td>0.1, 1, 10, 100</td></tr>
<tr><td>SVM: <code>kernel</code></td><td>Decision surface shape</td><td>'rbf' (default), 'linear', 'poly'</td></tr>
<tr><td>SVM: <code>gamma</code></td><td>RBF kernel width</td><td>'scale', 'auto', 0.001–1</td></tr>
<tr><td>NB: <code>alpha</code></td><td>Laplace smoothing (prevents zero probability)</td><td>0.5, 1.0, 2.0</td></tr>
<tr><td>GridSearchCV: <code>scoring</code></td><td>Metric to optimise</td><td>'f1', 'roc_auc', 'f1_weighted'</td></tr>
<tr><td>GridSearchCV: <code>cv</code></td><td>Cross-validation folds</td><td>StratifiedKFold(5)</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between Precision and Recall?**

A1: Precision = TP/(TP+FP) — of all predicted positives, how many were actually positive. Recall = TP/(TP+FN) — of all actual positives, how many did we catch. Use Precision when false positives are costly (spam filter); use Recall when false negatives are costly (cancer detection).

**Q2: Why is Logistic Regression a classification algorithm despite "regression" in its name?**

A2: It uses the sigmoid function to squash a linear combination of features into a probability between 0 and 1, then applies a threshold (default 0.5) to assign a class. The output is a probability, but the task is classification.

**Q3: Why does KNN require feature scaling?**

A3: KNN uses Euclidean distance. Without scaling, features with larger ranges (e.g., income in thousands) dominate features with smaller ranges (e.g., age 0–100), making distance meaningless.

**Q4: What is the "naive" assumption in Naive Bayes and when does it fail?**

A4: It assumes all features are conditionally independent given the class. It fails when features are highly correlated (e.g., word "New York" — "New" and "York" are strongly correlated). Despite this, it often works well in practice for text.

**Q5: How do you choose the right metric for an imbalanced dataset?**

A5: Avoid accuracy — it can be 99% by predicting all majority class. Use F1-score (balance of precision/recall), ROC-AUC (ranking quality), or Precision-Recall AUC (better than ROC when positives are very rare).

**Q6: What is the purpose of `probability=True` in SVM?**

A6: SVM natively outputs a decision score, not a probability. Setting `probability=True` fits a Platt scaling model on top to calibrate outputs to [0,1] probabilities, enabling `predict_proba()`. This adds training time.

---

## ⚠️ Common Mistakes

- **Scaling test data with test statistics** — always `fit` the scaler on training data only, then `transform` both. Use Pipeline to enforce this.
- **Using accuracy for imbalanced classes** — a model predicting all 0 on 95/5 split gets 95% accuracy but zero recall on the minority class.
- **Applying SMOTE before the train/test split** — synthetic points from training leak into validation/test folds, inflating metrics.
- **Not using stratified splits** — `train_test_split` without `stratify=y` can put all rare-class samples in one split.
- **Choosing K=1 for KNN** — memorises training noise; always cross-validate K selection.
- **Forgetting `max_iter` for Logistic Regression** — ConvergenceWarning means the model didn't optimise fully; increase to 500–2000.
- **Skipping baseline model** — always fit `DummyClassifier(strategy='most_frequent')` first to have a floor reference.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Need a fast interpretable baseline</td><td>Logistic Regression</td></tr>
<tr><td>Text classification (spam, sentiment)</td><td>Multinomial Naive Bayes</td></tr>
<tr><td>General-purpose high accuracy</td><td>Random Forest or XGBoost</td></tr>
<tr><td>High-dimensional data, small-medium size</td><td>SVM with RBF kernel</td></tr>
<tr><td>Interpretable rules for non-technical stakeholders</td><td>Decision Tree (max_depth ≤ 5)</td></tr>
<tr><td>Very large datasets, speed matters</td><td>Logistic Regression, LightGBM</td></tr>
<tr><td>Multi-class with probability calibration</td><td>Logistic Regression (softmax)</td></tr>
<tr><td>Imbalanced classes</td><td>RF/LR with <code>class_weight='balanced'</code> • SMOTE</td></tr>
<tr><td>Unknown best model</td><td>GridSearchCV across multiple algorithms</td></tr>
</table>

---

## 📋 Completion Checklist

- Can build and read a confusion matrix; derive Precision, Recall, F1 manually
- Explain when to optimise Precision vs Recall with a real-world example
- Implement all 6 classifiers (LR, KNN, NB, DT, RF, SVM) in scikit-learn
- Build a `Pipeline` that scales + classifies without data leakage
- Run `GridSearchCV` with `StratifiedKFold` and select best hyperparameters
- Handle class imbalance using both `class_weight='balanced'` and SMOTE
- Plot and interpret a ROC curve; explain what AUC = 0.5 vs 0.95 means
- Compare all models on F1 and AUC, then explain the winning choice
