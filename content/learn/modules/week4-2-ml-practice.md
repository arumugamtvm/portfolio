---
title: Week 4.2 — ML Important Practice & Interview Prep
description: An end-to-end ML interview arsenal covering bias-variance, regularisation, cross-validation, feature engineering, model selection, and full pipeline patterns.
---

> 🎯 TL;DR — This page is your end-to-end ML interview arsenal: bias-variance, regularisation, cross-validation, feature engineering, model selection, and full pipeline patterns — the exact knowledge gaps that separate junior from senior ML candidates.

---

## 🧠 Mental Model

ML model quality is like tuning a guitar: too tight (high variance/overfitting) and the string snaps on new songs; too loose (high bias/underfitting) and it plays the wrong notes. Cross-validation is your tuning fork — it tells you where you are on the dial. Pipelines are your guitar case: everything (scaler + model) travels together safely, preventing data leakage (your most expensive mistake).

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Bias</td><td>Error from wrong assumptions (model too simple)</td><td>Causes underfitting — misses real patterns</td></tr>
<tr><td>Variance</td><td>Error from sensitivity to training noise (model too complex)</td><td>Causes overfitting — fails on new data</td></tr>
<tr><td>Cross-Validation</td><td>Rotate held-out fold K times, average scores</td><td>Reliable estimate without wasting data</td></tr>
<tr><td>Stratified K-Fold</td><td>CV that preserves class ratios per fold</td><td>Required for imbalanced classification</td></tr>
<tr><td>L1 (Lasso)</td><td>Regularisation adding sum of absolute weights</td><td>Drives weak features to exactly 0 (feature selection)</td></tr>
<tr><td>L2 (Ridge)</td><td>Regularisation adding sum of squared weights</td><td>Shrinks all weights; handles correlated features</td></tr>
<tr><td>ElasticNet</td><td>L1 + L2 combined</td><td>Best of both: selection + shrinkage</td></tr>
<tr><td>Data Leakage</td><td>Test info contaminating training (e.g., scaling before split)</td><td>Gives falsely optimistic metrics; model fails in production</td></tr>
<tr><td>SMOTE</td><td>Synthetic minority oversampling inside pipeline</td><td>Safe way to fix class imbalance without leakage</td></tr>
<tr><td>GridSearchCV</td><td>Exhaustive hyperparameter search with CV</td><td>Reproducible best-param selection</td></tr>
<tr><td>RandomizedSearchCV</td><td>Random sample from param distributions</td><td>Faster; often comparable to grid search</td></tr>
<tr><td>Feature Importance</td><td>Tree-model weight per feature</td><td>Identify which features drive predictions</td></tr>
<tr><td>Pipeline</td><td>Chain of preprocessing + model steps</td><td>Prevents leakage; enables clean CV and serialisation</td></tr>
<tr><td>Learning Curve</td><td>Train vs val score vs training set size</td><td>Diagnoses overfitting/underfitting visually</td></tr>
<tr><td>Ensemble Bagging</td><td>Train models on bootstrap samples, average</td><td>Reduces variance (Random Forest)</td></tr>
<tr><td>Ensemble Boosting</td><td>Sequentially correct previous model errors</td><td>Reduces bias (XGBoost, LightGBM)</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **EDA** — distributions, nulls, class balance, correlations; decide metrics upfront
2. **Split** — `train_test_split(stratify=y)` before any preprocessing
3. **Baseline** — `DummyClassifier(strategy='most_frequent')` to establish floor
4. **Preprocess inside Pipeline** — imputer → scaler → encoder → model (no leakage)
5. **Model selection** — try LR, RF, GBM; evaluate with Stratified K-Fold CV
6. **Handle imbalance** — SMOTE inside pipeline or `class_weight='balanced'`
7. **Hyperparameter tuning** — RandomizedSearchCV first, then GridSearchCV to narrow
8. **Diagnose bias/variance** — plot learning curves; overfitting → regularise; underfitting → more features/complexity
9. **Final evaluation** — test set used exactly once; report F1, AUC, confusion matrix
10. **Serialise & document** — `joblib.dump(best_pipeline, 'model.pkl')`; log feature list, metrics, training date

---

## 💻 Code Cheatsheet

```python
# ============================================================
# WEEK 4.2 — ML INTERVIEW PREP: COMPLETE CODE CHEATSHEET
# All code is copy-paste runnable. Requires:
# pip install scikit-learn imbalanced-learn shap scipy matplotlib seaborn
# ============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import make_classification
from sklearn.model_selection import (train_test_split, StratifiedKFold,
                                     cross_val_score, cross_validate,
                                     GridSearchCV, RandomizedSearchCV,
                                     learning_curve)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_auc_score, roc_curve,
                             precision_recall_curve, average_precision_score,
                             f1_score, precision_score, recall_score)
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression, Lasso, Ridge, ElasticNet

# ─── 0. Generate Imbalanced Sample Data ──────────────────────
X, y = make_classification(n_samples=1000, n_features=20, n_informative=10,
                           n_classes=2, weights=[0.7, 0.3], random_state=42)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ─── 1. Stratified K-Fold Cross-Validation ───────────────────
skf   = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42)

# Single metric
scores = cross_val_score(model, X_train, y_train, cv=skf, scoring='f1')
print(f"F1 (5-fold): {scores.mean():.4f} +/- {scores.std():.4f}")

# Multiple metrics at once
results = cross_validate(model, X_train, y_train, cv=skf,
                         scoring=['f1', 'roc_auc', 'precision', 'recall'])
for metric, vals in results.items():
    if metric.startswith('test_'):
        print(f"  {metric}: {vals.mean():.4f} +/- {vals.std():.4f}")

# ─── 2. Regularisation — L1, L2, ElasticNet ──────────────────
from sklearn.datasets import make_regression
X_reg, y_reg = make_regression(n_samples=500, n_features=30, noise=0.1, random_state=42)
X_tr, X_te, y_tr, y_te = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

# L1 (Lasso) — drives weak coefficients to exactly 0
lasso = Lasso(alpha=0.1)
lasso.fit(X_tr, y_tr)
print(f"Lasso zero coefficients: {(lasso.coef_ == 0).sum()}")

# L2 (Ridge) — shrinks all coefficients
ridge = Ridge(alpha=1.0)
ridge.fit(X_tr, y_tr)

# ElasticNet — combines L1 + L2
enet = ElasticNet(alpha=0.1, l1_ratio=0.5)   # l1_ratio=1 → pure Lasso; =0 → pure Ridge
enet.fit(X_tr, y_tr)

# Logistic Regression with regularisation (classification)
lr_l1 = LogisticRegression(penalty='l1', C=0.1, solver='saga', max_iter=500)
lr_l2 = LogisticRegression(penalty='l2', C=0.1, solver='lbfgs', max_iter=500)
# Note: C = 1/lambda; smaller C = stronger regularisation

# ─── 3. Feature Scaling — Which Scaler When ──────────────────
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

# StandardScaler: (x-mean)/std — for SVM, LR, KNN, PCA
sc = StandardScaler()
X_std = sc.fit_transform(X_train)   # fit ONLY on train
X_tst = sc.transform(X_test)        # transform test

# MinMaxScaler: (x-min)/(max-min) → [0,1] — for neural networks
mm = MinMaxScaler()

# RobustScaler: (x-median)/IQR — when outliers present
rb = RobustScaler()
# Tree-based models (RF, XGBoost) do NOT need scaling

# ─── 4. Missing Value Imputation ─────────────────────────────
from sklearn.impute import SimpleImputer, KNNImputer

# Median imputation (robust to outliers)
imputer = SimpleImputer(strategy='median')
X_imp = imputer.fit_transform(X_train)

# KNN imputation (uses feature relationships)
knn_imp = KNNImputer(n_neighbors=5)
X_knn = knn_imp.fit_transform(X_train)

# ─── 5. Class Imbalance — SMOTE + class_weight ───────────────
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

print(f"Before SMOTE: {np.bincount(y_train)}")
sm = SMOTE(sampling_strategy='minority', random_state=42)
X_res, y_res = sm.fit_resample(X_train, y_train)
print(f"After SMOTE : {np.bincount(y_res)}")

# SMOTE inside CV-safe pipeline (correct approach)
imb_pipe = ImbPipeline([
    ('smote', SMOTE(random_state=42)),
    ('sc', StandardScaler()),
    ('clf', LogisticRegression(max_iter=500))
])
imb_pipe.fit(X_res, y_res)
print(classification_report(y_test, imb_pipe.predict(X_test)))

# ─── 6. All Classification Metrics ───────────────────────────
model.fit(X_train, y_train)
y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

print(classification_report(y_test, y_pred))

# Confusion matrix heatmap
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Neg','Pos'], yticklabels=['Neg','Pos'])
plt.ylabel('Actual'); plt.xlabel('Predicted'); plt.title('Confusion Matrix')
plt.tight_layout(); plt.show()

# ROC Curve
fpr, tpr, _ = roc_curve(y_test, y_proba)
auc = roc_auc_score(y_test, y_proba)
plt.figure(figsize=(6,5))
plt.plot(fpr, tpr, label=f'AUC = {auc:.4f}')
plt.plot([0,1],[0,1],'--', color='grey')
plt.xlabel('FPR'); plt.ylabel('TPR'); plt.title('ROC Curve'); plt.legend(); plt.show()

# Precision-Recall Curve (better than ROC for imbalanced data)
prec, rec, _ = precision_recall_curve(y_test, y_proba)
ap = average_precision_score(y_test, y_proba)
plt.figure(figsize=(6,5))
plt.plot(rec, prec, label=f'AP = {ap:.4f}')
plt.xlabel('Recall'); plt.ylabel('Precision'); plt.title('PR Curve'); plt.legend(); plt.show()

# ─── 7. GridSearchCV + RandomizedSearchCV ────────────────────
from scipy.stats import randint, uniform

# GridSearchCV — exhaustive
param_grid = {'n_estimators': [100, 200], 'max_depth': [3, 5, None],
              'min_samples_leaf': [1, 5]}
grid = GridSearchCV(RandomForestClassifier(random_state=42),
                    param_grid, cv=skf, scoring='f1', n_jobs=-1, verbose=1)
grid.fit(X_train, y_train)
print(f"Grid best: {grid.best_params_}  F1={grid.best_score_:.4f}")

# RandomizedSearchCV — faster, comparable quality
param_dist = {'n_estimators': randint(50, 500), 'max_depth': randint(2, 20),
              'min_samples_leaf': randint(1, 20), 'max_features': uniform(0.3, 0.7)}
rand = RandomizedSearchCV(RandomForestClassifier(random_state=42),
                          param_dist, n_iter=50, cv=skf, scoring='f1',
                          n_jobs=-1, random_state=42)
rand.fit(X_train, y_train)
print(f"Rand best: {rand.best_params_}  F1={rand.best_score_:.4f}")

# ─── 8. Feature Importance + SHAP ────────────────────────────
importances = model.feature_importances_
feature_names = [f'feat_{i}' for i in range(X.shape[1])]
indices = np.argsort(importances)[::-1]

plt.figure(figsize=(10, 5))
plt.bar(range(15), importances[indices[:15]])
plt.xticks(range(15), [feature_names[i] for i in indices[:15]], rotation=45, ha='right')
plt.title('Top 15 Feature Importances'); plt.tight_layout(); plt.show()

# SHAP (pip install shap)
import shap
explainer  = shap.TreeExplainer(model)
shap_vals  = explainer.shap_values(X_test)
shap.summary_plot(shap_vals[1], X_test, feature_names=feature_names)

# ─── 9. Learning Curves — Diagnose Bias vs Variance ──────────
def plot_learning_curve(estimator, X, y, cv=5, scoring='f1'):
    sizes, tr_sc, va_sc = learning_curve(
        estimator, X, y, cv=cv, scoring=scoring,
        train_sizes=np.linspace(0.1, 1.0, 10), n_jobs=-1
    )
    tr_m, tr_s = tr_sc.mean(1), tr_sc.std(1)
    va_m, va_s = va_sc.mean(1), va_sc.std(1)
    plt.figure(figsize=(8,5))
    plt.plot(sizes, tr_m, 'o-', color='royalblue', label='Train')
    plt.fill_between(sizes, tr_m-tr_s, tr_m+tr_s, alpha=0.15, color='royalblue')
    plt.plot(sizes, va_m, 'o-', color='tomato', label='Validation')
    plt.fill_between(sizes, va_m-va_s, va_m+va_s, alpha=0.15, color='tomato')
    plt.xlabel('Training Size'); plt.ylabel(scoring); plt.title('Learning Curve')
    plt.legend(); plt.tight_layout(); plt.show()
    # Interpretation:
    # Large gap (train >> val): OVERFITTING → regularise, add data, reduce complexity
    # Both low: UNDERFITTING → more features, more complex model

plot_learning_curve(RandomForestClassifier(n_estimators=100, random_state=42), X, y)

# ─── 10. Full Production ML Pipeline ─────────────────────────
from sklearn.compose import ColumnTransformer

numeric_features     = [0, 1, 2, 3, 4]         # column indices or names
categorical_features = []                        # none in this example

numeric_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler',  StandardScaler())
])

preprocessor = ColumnTransformer([
    ('num', numeric_transformer, numeric_features)
])

full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier',   GradientBoostingClassifier(random_state=42))
])

param_grid_full = {
    'classifier__n_estimators':  [100, 200],
    'classifier__max_depth':     [3, 5],
    'classifier__learning_rate': [0.05, 0.1]
}

cv_full = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid_full = GridSearchCV(full_pipeline, param_grid_full,
                         cv=cv_full, scoring='roc_auc', n_jobs=-1)
grid_full.fit(X_train, y_train)

print(f"Best params : {grid_full.best_params_}")
print(f"Best AUC-ROC: {grid_full.best_score_:.4f}")
print(classification_report(y_test, grid_full.predict(X_test)))

# Save and load
import joblib
joblib.dump(grid_full.best_estimator_, 'best_pipeline.pkl')
loaded_model = joblib.load('best_pipeline.pkl')
preds = loaded_model.predict(X_test)

# ─── 11. Categorical Encoding ────────────────────────────────
import pandas as pd
df = pd.DataFrame({'city': ['NY','LA','NY','Chicago','LA'],
                   'size': ['S','M','L','M','XL'],
                   'target': [1,0,1,0,1]})

# One-Hot Encoding (nominal, low cardinality)
df_ohe = pd.get_dummies(df, columns=['city'], drop_first=True)

# Label Encoding (ordinal)
from sklearn.preprocessing import OrdinalEncoder
oe = OrdinalEncoder(categories=[['S','M','L','XL']])
df[['size_encoded']] = oe.fit_transform(df[['size']])

# Target Encoding (high cardinality — use inside CV to avoid leakage)
# pip install category_encoders
from category_encoders import TargetEncoder
te = TargetEncoder(cols=['city'])
df_te = te.fit_transform(df[['city']], df['target'])
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td>LR: <code>C</code></td><td>Inverse regularisation (lower = stronger)</td><td>0.001, 0.01, 0.1, 1, 10</td></tr>
<tr><td>Lasso/Ridge: <code>alpha</code></td><td>Regularisation strength (higher = stronger)</td><td>0.001 to 100 (log scale)</td></tr>
<tr><td>ElasticNet: <code>l1_ratio</code></td><td>Mix of L1 vs L2</td><td>0 (Ridge) to 1 (Lasso)</td></tr>
<tr><td>RF/GBM: <code>n_estimators</code></td><td>Number of trees</td><td>100, 200, 500</td></tr>
<tr><td>GBM: <code>learning_rate</code></td><td>Step size per tree</td><td>0.01, 0.05, 0.1 (smaller = better with more trees)</td></tr>
<tr><td>GBM: <code>max_depth</code></td><td>Tree depth per iteration</td><td>3–6</td></tr>
<tr><td>GridSearchCV: <code>scoring</code></td><td>Metric to optimise</td><td>'f1', 'roc_auc', 'f1_weighted'</td></tr>
<tr><td>GridSearchCV: <code>cv</code></td><td>CV strategy</td><td>StratifiedKFold(5)</td></tr>
<tr><td>RandomizedSearchCV: <code>n_iter</code></td><td>How many param combos to try</td><td>50–200</td></tr>
<tr><td>SMOTE: <code>sampling_strategy</code></td><td>Ratio to resample to</td><td>'minority', 0.5, 1.0</td></tr>
<tr><td>SimpleImputer: <code>strategy</code></td><td>How to fill nulls</td><td>'mean', 'median', 'most_frequent'</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: Explain the bias-variance tradeoff. How does regularisation help?**

A1: Bias = error from oversimplifying the pattern; variance = error from sensitivity to training data noise. A simple model (e.g., linear) has high bias, low variance — it underfits. A complex model (e.g., deep tree) has low bias, high variance — it overfits. Regularisation (L1/L2) adds a penalty on model complexity, reducing variance at the cost of slight bias increase.

**Q2: What is data leakage and how do you prevent it?**

A2: Leakage occurs when information from outside the training set (including the test set) influences the model. Examples: fitting the scaler on all data before splitting, applying SMOTE before the train/test split, or using future features. Prevention: always split first, then fit ALL preprocessing inside a Pipeline using only training data.

**Q3: Why use Stratified K-Fold instead of regular K-Fold for classification?**

A3: Regular K-Fold splits randomly, so some folds might have very few or zero samples of the minority class. Stratified K-Fold ensures each fold has the same class proportion as the full dataset — critical for imbalanced problems.

**Q4: When would you use RandomizedSearchCV over GridSearchCV?**

A4: When the hyperparameter space is large or when some parameters are continuous. RandomizedSearchCV samples a fixed number of random combinations (`n_iter=50`), making it far faster while often finding equally good results. Use GridSearchCV to fine-tune once you've narrowed the range.

**Q5: How do you detect and fix overfitting?**

A5: Detection: large gap between train and validation scores in learning curves or CV. Fixes: add regularisation (L1/L2), get more training data, reduce model complexity (fewer layers/trees/depth), use dropout (neural nets), or apply early stopping (boosting). Cross-validation must confirm improvement.

**Q6: What is the difference between Bagging and Boosting?**

A6: Bagging trains independent models on bootstrap samples and averages predictions — reduces variance (Random Forest). Boosting trains models sequentially, where each focuses on errors of the previous — reduces bias (XGBoost, LightGBM). Bagging is more robust to noise; Boosting typically achieves higher accuracy with proper tuning.

---

## ⚠️ Common Mistakes

- **Scaling before train/test split** — scaler learns test statistics, inflating performance; always split first, scale inside Pipeline.
- **Evaluating on validation set and calling it "test set"** — the true test set must be used exactly once at the very end.
- **SMOTE on full data before CV** — synthetic points from the same neighbourhood appear in both train and validation folds, causing leakage.
- **Using accuracy for imbalanced data** — 99% accuracy possible by predicting all majority class; use F1, AUC-ROC, or PR-AUC.
- **Skipping baseline model** — without `DummyClassifier`, you don't know if your complex model is actually better than a trivial rule.
- **Feature selection outside CV** — selecting features on all training data then cross-validating introduces target leakage from feature selection step.
- **Not saving the full pipeline** — if you save only the model weights, you lose scaler parameters and predictions on new data will be wrong.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Fast interpretable baseline</td><td>Logistic Regression with Pipeline</td></tr>
<tr><td>Max accuracy on tabular data</td><td>GradientBoostingClassifier or XGBoost</td></tr>
<tr><td>Need to detect/fix overfitting</td><td>Learning curve + regularisation (L1/L2)</td></tr>
<tr><td>Imbalanced classes</td><td>SMOTE inside Pipeline + class_weight='balanced'</td></tr>
<tr><td>Large hyperparameter space</td><td>RandomizedSearchCV first, then GridSearchCV</td></tr>
<tr><td>Need probability calibration</td><td>Logistic Regression or Platt scaling on SVM</td></tr>
<tr><td>Feature selection needed</td><td>L1 (Lasso) regularisation</td></tr>
<tr><td>Correlated features</td><td>L2 (Ridge) regularisation</td></tr>
<tr><td>Production model serving</td><td><code>joblib.dump(full_pipeline, 'model.pkl')</code></td></tr>
<tr><td>Understanding model decisions</td><td>SHAP TreeExplainer + summary_plot</td></tr>
</table>

---

## 📋 Completion Checklist

- Explain bias-variance tradeoff; draw the U-shaped test error curve from memory
- Implement Stratified K-Fold CV with multiple metrics (`cross_validate`)
- Apply L1, L2, ElasticNet regularisation and explain what each does to coefficients
- Build a full `Pipeline` with imputer + scaler + model; confirm no data leakage
- Handle class imbalance using SMOTE inside a pipeline-safe manner
- Run `GridSearchCV` AND `RandomizedSearchCV`; compare results
- Plot learning curves and correctly diagnose overfitting vs underfitting
- Plot ROC curve, PR curve, and confusion matrix heatmap; choose the right one per scenario
