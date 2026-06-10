---
title: Week 8.1 — Feature Engineering & Selection
description: Feature engineering creates better model inputs; feature selection picks the best ones. Use SelectKBest, RFE, or tree importances, scale before PCA, and wrap everything in a sklearn Pipeline to stay leak-free.
---

> 🎯 **TL;DR** — Feature engineering creates better inputs; feature selection picks the best ones. Use **SelectKBest** for quick statistical filtering, **RFE** for model-driven elimination, and **tree feature importances** for intuitive ranking. Always **scale before PCA**, and wrap everything in a **sklearn Pipeline** so your preprocessing is reproducible and leak-free.

## 🧠 Mental Model

Think of raw features like raw ingredients in a kitchen. **Feature engineering** is the chef who chops, combines, and transforms them into better ingredients (log transforms, interaction terms, binning). **Feature selection** is the head chef who looks at the 50 ingredients prepared and says "we only need these 10 for the best dish." The **Pipeline** is the kitchen assembly line — everything flows in the right order, every time, no cross-contamination between train and test.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Technique</th><th>Category</th><th>When to Use</th><th>sklearn Class</th></tr>
<tr><td>Log transform</td><td>Feature Creation</td><td>Right-skewed features (income, price)</td><td>FunctionTransformer(np.log1p)</td></tr>
<tr><td>Polynomial features</td><td>Feature Creation</td><td>Capture non-linear relationships</td><td>PolynomialFeatures(degree=2)</td></tr>
<tr><td>Interaction terms</td><td>Feature Creation</td><td>Feature A × Feature B matters jointly</td><td>PolynomialFeatures(interaction_only=True)</td></tr>
<tr><td>Binning / Discretization</td><td>Feature Creation</td><td>Convert continuous to ordinal categories</td><td>pd.cut / KBinsDiscretizer</td></tr>
<tr><td>Label Encoding</td><td>Encoding</td><td>Ordinal categories (S &lt; M &lt; L &lt; XL)</td><td>LabelEncoder / OrdinalEncoder</td></tr>
<tr><td>One-Hot Encoding</td><td>Encoding</td><td>Nominal categories (no order)</td><td>OneHotEncoder / pd.get_dummies</td></tr>
<tr><td>Target Encoding</td><td>Encoding</td><td>High-cardinality categoricals</td><td>category_encoders.TargetEncoder</td></tr>
<tr><td>StandardScaler</td><td>Scaling</td><td>Normally distributed features; SVM, LR, PCA</td><td>StandardScaler()</td></tr>
<tr><td>MinMaxScaler</td><td>Scaling</td><td>Known bounded range; neural nets</td><td>MinMaxScaler()</td></tr>
<tr><td>RobustScaler</td><td>Scaling</td><td>Features with outliers</td><td>RobustScaler()</td></tr>
<tr><td>SelectKBest</td><td>Feature Selection</td><td>Quick statistical filter</td><td>SelectKBest(chi2 / f_classif, k=N)</td></tr>
<tr><td>RFE</td><td>Feature Selection</td><td>Model-driven recursive elimination</td><td>RFE(estimator, n_features_to_select=N)</td></tr>
<tr><td>Feature Importance</td><td>Feature Selection</td><td>Tree-based models</td><td>model.feature_importances_</td></tr>
<tr><td>Lasso (L1)</td><td>Feature Selection</td><td>Embedded — regularization zeroes weak features</td><td>LassoCV() / SelectFromModel</td></tr>
<tr><td>PCA</td><td>Dimensionality Reduction</td><td>High-dimensional data, multicollinear features</td><td>PCA(n_components=0.95)</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Explore raw features** — check distributions, skewness, missing values, dtypes
2. **Create new features** — log transforms, polynomial, interaction terms, date components, binning
3. **Encode categoricals** — Label/Ordinal for ordered categories; One-Hot for nominal
4. **Scale numerical features** — StandardScaler for most models; RobustScaler if outliers present
5. **Filter low-variance features** — remove near-constant columns (VarianceThreshold)
6. **Select features statistically** — SelectKBest with chi2 (classification) or f_regression (regression)
7. **Run RFE or check importances** — model-driven selection for more accurate ranking
8. **Build a Pipeline** — chain scaler + selector + model; fit only on training data

---

## 💻 Code Cheatsheet

```python
# ============================================================
# FEATURE ENGINEERING & SELECTION — COMPLETE CHEATSHEET
# Week 8.1: Creation, Encoding, Scaling, Selection, Pipeline
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_breast_cancer, fetch_california_housing
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, RobustScaler,
    LabelEncoder, OrdinalEncoder, OneHotEncoder,
    PolynomialFeatures, FunctionTransformer
)
from sklearn.feature_selection import (
    SelectKBest, chi2, f_classif, mutual_info_classif,
    f_regression, mutual_info_regression,
    RFE, RFECV, SelectFromModel, VarianceThreshold
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LassoCV
from sklearn.pipeline import Pipeline
from sklearn.decomposition import PCA
from sklearn.metrics import classification_report

np.random.seed(42)

# ----------------------------------------------------------
# 1. FEATURE CREATION — Engineering better inputs
# ----------------------------------------------------------

# Synthetic dataset for demo
df = pd.DataFrame({
    'age':      np.random.randint(18, 65, 200),
    'income':   np.random.exponential(50000, 200),   # right-skewed
    'size':     np.random.randint(1, 5, 200),
    'city':     np.random.choice(['Mumbai','Delhi','Chennai','Kolkata'], 200),
    'grade':    np.random.choice(['Low','Medium','High'], 200),
    'target':   np.random.randint(0, 2, 200)
})

# Log transform — fixes right-skewed distributions
df['log_income'] = np.log1p(df['income'])  # log1p handles zero values safely
print(f"Income skew: {df['income'].skew():.2f} → {df['log_income'].skew():.2f}")

# Polynomial features — capture non-linear relationships
df['age_squared']   = df['age'] ** 2
df['income_x_size'] = df['income'] * df['size']  # interaction term

# Binning — convert continuous to ordinal categories
df['age_group'] = pd.cut(
    df['age'], bins=[0, 25, 40, 55, 100],
    labels=['Young','Adult','Middle','Senior']
)
# Equal-width binning alternative:
from sklearn.preprocessing import KBinsDiscretizer
kbd = KBinsDiscretizer(n_bins=4, encode='ordinal', strategy='quantile')
df['income_bin'] = kbd.fit_transform(df[['income']])

# Date feature extraction (example)
df['date'] = pd.date_range(start='2023-01-01', periods=200, freq='D')
df['day_of_week'] = df['date'].dt.dayofweek   # 0=Monday, 6=Sunday
df['month']       = df['date'].dt.month
df['is_weekend']  = (df['day_of_week'] >= 5).astype(int)

# Using sklearn PolynomialFeatures
from sklearn.preprocessing import PolynomialFeatures
X_num = df[['age', 'income']].values
poly  = PolynomialFeatures(degree=2, include_bias=False)
X_poly = poly.fit_transform(X_num)
print(f"Original features: {X_num.shape[1]}, After poly(2): {X_poly.shape[1]}")
print(f"Feature names: {poly.get_feature_names_out(['age','income'])}")

# ----------------------------------------------------------
# 2. ENCODING CATEGORICAL FEATURES
# ----------------------------------------------------------

# Label Encoding — for ORDINAL categories (order matters)
le = LabelEncoder()
df['grade_encoded'] = le.fit_transform(df['grade'])  # Low=0, Medium=1, High=2
# WARNING: LabelEncoder assigns arbitrary numbers — only use for ordinal data

# Ordinal Encoding — explicitly specify the order
oe = OrdinalEncoder(categories=[['Low','Medium','High']])
df['grade_ordinal'] = oe.fit_transform(df[['grade']])

# One-Hot Encoding — for NOMINAL categories (no order)
# Method 1: pandas
df_ohe = pd.get_dummies(df[['city']], drop_first=True, dtype=int)  # N-1 columns (avoid dummy trap)
df = pd.concat([df, df_ohe], axis=1)
print(df_ohe.head())

# Method 2: sklearn OneHotEncoder
ohe = OneHotEncoder(drop='first', sparse_output=False)
city_encoded = ohe.fit_transform(df[['city']])
city_df = pd.DataFrame(city_encoded, columns=ohe.get_feature_names_out(['city']))
print(city_df.head())

# Target Encoding (high-cardinality categories) — install: pip install category_encoders
# import category_encoders as ce
# te = ce.TargetEncoder(cols=['city'])
# df['city_target_enc'] = te.fit_transform(df['city'], df['target'])

# ----------------------------------------------------------
# 3. SCALING
# ----------------------------------------------------------

X = df[['age', 'income', 'size']].values
X_train, X_test = X[:160], X[160:]

# StandardScaler: mean=0, std=1 (use for: LR, SVM, PCA, neural nets)
scaler_std = StandardScaler()
X_train_std = scaler_std.fit_transform(X_train)  # fit ONLY on train
X_test_std  = scaler_std.transform(X_test)       # transform test separately

# MinMaxScaler: range [0,1] (use for: neural nets, KNN)
scaler_mm = MinMaxScaler()
X_train_mm = scaler_mm.fit_transform(X_train)
X_test_mm  = scaler_mm.transform(X_test)

# RobustScaler: uses median + IQR (use when: heavy outliers present)
scaler_rb = RobustScaler()
X_train_rb = scaler_rb.fit_transform(X_train)
X_test_rb  = scaler_rb.transform(X_test)

# Visual comparison
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, X_scaled, title in zip(axes,
    [X_train_std, X_train_mm, X_train_rb],
    ['StandardScaler', 'MinMaxScaler', 'RobustScaler']):
    ax.boxplot(X_scaled, tick_labels=['age','income','size'])
    ax.set_title(title); ax.set_ylabel('Scaled Value')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 4. SELECTKBEST — STATISTICAL FEATURE SELECTION
# ----------------------------------------------------------

# Load a real classification dataset
X_bc, y_bc = load_breast_cancer(return_X_y=True)
feature_names = load_breast_cancer().feature_names
X_tr, X_te, y_tr, y_te = train_test_split(X_bc, y_bc, test_size=0.2, random_state=42)

# Scale first (chi2 requires non-negative — use MinMaxScaler)
mm = MinMaxScaler()
X_tr_mm = mm.fit_transform(X_tr)
X_te_mm = mm.transform(X_te)

# chi2 for classification
selector_chi2 = SelectKBest(score_func=chi2, k=10)
X_tr_chi2 = selector_chi2.fit_transform(X_tr_mm, y_tr)
X_te_chi2 = selector_chi2.transform(X_te_mm)

# See scores
scores_df = pd.DataFrame({
    'feature': feature_names,
    'chi2_score': selector_chi2.scores_,
    'p_value':    selector_chi2.pvalues_
}).sort_values('chi2_score', ascending=False)
print(scores_df.head(10))

selected = feature_names[selector_chi2.get_support()]
print(f"\nSelected features: {selected.tolist()}")

# f_classif (ANOVA F-test) for classification — works with StandardScaler
selector_f = SelectKBest(score_func=f_classif, k=10)
X_tr_f = selector_f.fit_transform(StandardScaler().fit_transform(X_tr), y_tr)

# mutual_info_classif — captures non-linear relationships
selector_mi = SelectKBest(score_func=mutual_info_classif, k=10)
X_tr_mi = selector_mi.fit_transform(X_tr, y_tr)

# For REGRESSION: use f_regression or mutual_info_regression
# selector_reg = SelectKBest(score_func=f_regression, k=10)

# Plot feature scores
plt.figure(figsize=(12, 5))
scores_df_plot = pd.DataFrame({'feature': feature_names, 'score': selector_chi2.scores_})
scores_df_plot = scores_df_plot.sort_values('score', ascending=True).tail(15)
plt.barh(scores_df_plot['feature'], scores_df_plot['score'], color='steelblue')
plt.xlabel('Chi2 Score'); plt.title('SelectKBest: Top Feature Scores')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 5. RFE — RECURSIVE FEATURE ELIMINATION
# ----------------------------------------------------------

# RFE with fixed number of features
model_rfe = RandomForestClassifier(n_estimators=50, random_state=42)
rfe = RFE(estimator=model_rfe, n_features_to_select=10, step=1)
rfe.fit(X_tr, y_tr)

ranking_df = pd.DataFrame({
    'feature': feature_names,
    'rank':    rfe.ranking_,
    'selected': rfe.support_
}).sort_values('rank')
print(ranking_df.head(15))
print(f"\nRFE selected: {feature_names[rfe.support_].tolist()}")

# Transform data
X_tr_rfe = rfe.transform(X_tr)
X_te_rfe = rfe.transform(X_te)

# RFECV: automatically find optimal number of features
rfecv = RFECV(
    estimator=RandomForestClassifier(n_estimators=50, random_state=42),
    step=1,
    cv=StratifiedKFold(5),
    scoring='accuracy',
    min_features_to_select=5
)
rfecv.fit(X_tr, y_tr)
print(f"Optimal features: {rfecv.n_features_}")
print(f"Selected: {feature_names[rfecv.support_].tolist()}")

# Plot RFECV results
plt.figure(figsize=(9, 5))
plt.plot(range(1, len(rfecv.cv_results_['mean_test_score']) + 1),
         rfecv.cv_results_['mean_test_score'], 'bo-')
plt.xlabel('Number of Features'); plt.ylabel('CV Accuracy')
plt.title('RFECV: Accuracy vs Number of Features')
plt.axvline(rfecv.n_features_, color='red', linestyle='--', label=f'Optimal = {rfecv.n_features_}')
plt.legend(); plt.grid(alpha=0.3)
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 6. TREE FEATURE IMPORTANCE
# ----------------------------------------------------------

rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_tr, y_tr)

importance_df = pd.DataFrame({
    'feature':    feature_names,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print(importance_df.head(10))

# Plot
plt.figure(figsize=(10, 6))
plt.barh(importance_df['feature'][:15][::-1],
         importance_df['importance'][:15][::-1], color='steelblue')
plt.xlabel('Importance Score')
plt.title('Random Forest Feature Importances (Top 15)')
plt.tight_layout(); plt.show()

# Select top N by importance
top_features = importance_df.head(10)['feature'].tolist()
X_top = X_bc[:, [np.where(feature_names == f)[0][0] for f in top_features]]

# ----------------------------------------------------------
# 7. LASSO FOR FEATURE SELECTION (embedded method)
# ----------------------------------------------------------

lasso = LassoCV(cv=5, random_state=42)
lasso.fit(StandardScaler().fit_transform(X_tr), y_tr)

# Features with non-zero coefficients are selected
lasso_importance = pd.DataFrame({
    'feature':     feature_names,
    'coefficient': np.abs(lasso.coef_)
}).sort_values('coefficient', ascending=False)

print(lasso_importance)
selected_lasso = lasso_importance[lasso_importance['coefficient'] > 0]['feature'].tolist()
print(f"Lasso selected {len(selected_lasso)} features: {selected_lasso}")

# Using SelectFromModel with Lasso
from sklearn.feature_selection import SelectFromModel
sfm = SelectFromModel(lasso, prefit=True)
X_lasso_selected = sfm.transform(StandardScaler().fit_transform(X_tr))
print(f"Shape after Lasso selection: {X_lasso_selected.shape}")

# ----------------------------------------------------------
# 8. PCA IN FEATURE ENGINEERING
# ----------------------------------------------------------

# Always StandardScale before PCA
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_tr)

# Find optimal components (95% variance threshold)
pca_full = PCA()
pca_full.fit(X_scaled)
cumvar = np.cumsum(pca_full.explained_variance_ratio_)
n_95   = np.argmax(cumvar >= 0.95) + 1
print(f"Components for 95% variance: {n_95}")

# Apply PCA
pca = PCA(n_components=0.95)  # automatically select components for 95% variance
X_pca_tr = pca.fit_transform(X_scaled)
X_pca_te = pca.transform(scaler.transform(X_te))
print(f"Shape: {X_tr.shape} → {X_pca_tr.shape}")

# Scree plot
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].bar(range(1, len(pca_full.explained_variance_ratio_)+1),
            pca_full.explained_variance_ratio_, color='steelblue', alpha=0.8)
axes[0].set(title='Scree Plot', xlabel='PC', ylabel='Variance Explained')
axes[1].plot(range(1, len(cumvar)+1), cumvar, 'bo-')
axes[1].axhline(0.95, color='red', linestyle='--', label='95% threshold')
axes[1].set(title='Cumulative Variance', xlabel='Components', ylabel='Cumulative Var')
axes[1].legend()
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 9. SKLEARN PIPELINE — THE RIGHT WAY
# ----------------------------------------------------------

X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_bc, y_bc, test_size=0.2, random_state=42)

# Pipeline 1: Scale + SelectKBest + Model
pipeline_kbest = Pipeline([
    ('scaler',   MinMaxScaler()),
    ('selector', SelectKBest(chi2, k=10)),
    ('model',    RandomForestClassifier(100, random_state=42))
])
pipeline_kbest.fit(X_tr2, y_tr2)
print(f"SelectKBest Pipeline Accuracy: {pipeline_kbest.score(X_te2, y_te2):.4f}")

# Pipeline 2: Scale + PCA + Logistic Regression
pipeline_pca = Pipeline([
    ('scaler', StandardScaler()),
    ('pca',    PCA(n_components=0.95)),        # keep 95% variance
    ('model',  LogisticRegression(max_iter=1000))
])
pipeline_pca.fit(X_tr2, y_tr2)
n_comp = pipeline_pca.named_steps['pca'].n_components_
print(f"PCA Pipeline Accuracy: {pipeline_pca.score(X_te2, y_te2):.4f} | Components used: {n_comp}")

# Pipeline 3: Scale + RFE + Model
pipeline_rfe = Pipeline([
    ('scaler', StandardScaler()),
    ('rfe',    RFE(RandomForestClassifier(50, random_state=42), n_features_to_select=10)),
    ('model',  LogisticRegression(max_iter=1000))
])
pipeline_rfe.fit(X_tr2, y_tr2)
print(f"RFE Pipeline Accuracy: {pipeline_rfe.score(X_te2, y_te2):.4f}")

# Cross-validate pipelines fairly
for name, pipe in [('KBest', pipeline_kbest), ('PCA', pipeline_pca), ('RFE', pipeline_rfe)]:
    scores = cross_val_score(pipe, X_bc, y_bc, cv=5, scoring='accuracy')
    print(f"{name}: CV Accuracy = {scores.mean():.4f} ± {scores.std():.4f}")

print("\nFeature engineering & selection complete!")
```

---

## ⚙️ Key Parameters / Hyperparameters Table

<table>
<tr><th>Parameter</th><th>Class / Method</th><th>What it Controls</th><th>Common Values</th></tr>
<tr><td>degree</td><td>PolynomialFeatures</td><td>Polynomial order</td><td>2 (quadratic), rarely 3</td></tr>
<tr><td>k</td><td>SelectKBest</td><td>Number of top features to keep</td><td>5–20; use RFECV to auto-find</td></tr>
<tr><td>score_func</td><td>SelectKBest</td><td>Statistical test for scoring</td><td>chi2 (classif), f_regression (regr), mutual_info_*</td></tr>
<tr><td>n_features_to_select</td><td>RFE</td><td>Final number of features after elimination</td><td>~10–20% of total features</td></tr>
<tr><td>step</td><td>RFE</td><td>Features removed per iteration</td><td>1 (accurate) or 0.1 (10%, faster)</td></tr>
<tr><td>n_components</td><td>PCA</td><td>Output dimensions or variance retained</td><td>0.95 (95% variance) or integer count</td></tr>
<tr><td>n_bins</td><td>KBinsDiscretizer</td><td>Number of bins for discretization</td><td>4–10</td></tr>
<tr><td>drop='first'</td><td>OneHotEncoder</td><td>Drop first dummy to avoid dummy variable trap</td><td>Always use in regression</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between feature selection and dimensionality reduction?**

A: Feature selection keeps a subset of original features unchanged — interpretability is preserved. Dimensionality reduction (PCA) creates new features as linear combinations of originals — original feature meaning is lost but all variance is compressed efficiently.

**Q2: When would you use SelectKBest vs RFE?**

A: SelectKBest is fast and model-agnostic — good for quick filtering as a first pass. RFE is slower but incorporates model performance — better when you want features ranked by actual predictive contribution rather than statistical correlation with the target.

**Q3: Why must you fit scalers only on training data?**

A: Fitting on the entire dataset (including test) causes data leakage — test statistics (mean, std) contaminate training, leading to overly optimistic validation scores. Always `fit_transform` on train, `transform` only on test. sklearn Pipelines enforce this automatically.

**Q4: Which scaler should you use and when?**

A: StandardScaler (mean=0, std=1) for most models including LR, SVM, PCA. MinMaxScaler ([0,1]) for neural networks and KNN. RobustScaler (median/IQR) when features have heavy outliers — it's not influenced by extreme values.

**Q5: What is the dummy variable trap and how do you avoid it?**

A: When one-hot encoding N categories, using all N columns creates perfect multicollinearity (columns sum to 1). Use `drop='first'` in OneHotEncoder or `drop_first=True` in pd.get_dummies to keep N-1 columns and avoid the trap.

**Q6: How does Lasso perform feature selection?**

A: Lasso (L1 regularization) adds a penalty proportional to the absolute value of coefficients. As the regularization strength increases, Lasso drives weak feature coefficients exactly to zero — effectively removing them. `SelectFromModel(lasso)` extracts the non-zero features.

**Q7: When should you use PCA vs feature selection?**

A: Use PCA when features are highly correlated (multicollinearity), when dealing with very high-dimensional data (images, text), or when interpretability is not required. Use feature selection when you need to understand which original features drive the model or when domain interpretability matters.

**Q8: What is RFECV and how is it better than RFE?**

A: RFECV (Recursive Feature Elimination with Cross-Validation) automatically finds the optimal number of features by evaluating model performance with cross-validation for each feature count. RFE requires you to specify `n_features_to_select` manually — RFECV removes that guesswork.

---

## ⚠️ Common Mistakes

- **Fitting the scaler on the full dataset** — always fit only on training data to prevent data leakage; sklearn Pipelines prevent this automatically.
- **Using Label Encoding for nominal (unordered) categories** — this implies false ordinal relationships (e.g., Paris=2 > London=1). Use One-Hot Encoding for nominal data.
- **Forgetting the dummy variable trap** — always use `drop='first'` when one-hot encoding in regression models.
- **Not scaling before PCA** — PCA is variance-based; features on larger scales dominate. StandardScaler is mandatory.
- **Using chi2 with negative values** — chi2 requires non-negative inputs. Use MinMaxScaler before applying chi2 in SelectKBest.
- **Selecting features before cross-validation split** — running SelectKBest on the full dataset, then splitting, leaks information from test fold into feature scores. Always put selection inside a Pipeline.
- **Creating too many polynomial features** — degree=3 or higher on many features creates exponential feature explosion and overfitting. Prefer degree=2 and validate carefully.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Technique</th><th>Notes</th></tr>
<tr><td>Right-skewed numerical feature</td><td>Log transform (np.log1p)</td><td>Reduces skewness, helps LR and linear models</td></tr>
<tr><td>Non-linear feature relationships</td><td>PolynomialFeatures(degree=2)</td><td>Capture x², xy interactions</td></tr>
<tr><td>Ordered categorical (S/M/L)</td><td>OrdinalEncoder with explicit order</td><td>Never use LabelEncoder blindly</td></tr>
<tr><td>Nominal categorical (city, color)</td><td>OneHotEncoder with drop='first'</td><td>N-1 columns; use target encoding for high cardinality</td></tr>
<tr><td>Features for SVM / LR / PCA</td><td>StandardScaler</td><td>Zero mean, unit variance</td></tr>
<tr><td>Features for neural network</td><td>MinMaxScaler</td><td>Bounded [0,1] range</td></tr>
<tr><td>Features with heavy outliers</td><td>RobustScaler</td><td>Uses median/IQR instead of mean/std</td></tr>
<tr><td>Quick feature ranking (classif)</td><td>SelectKBest(chi2 or f_classif)</td><td>Fast, model-agnostic</td></tr>
<tr><td>Model-driven feature ranking</td><td>RFE / RFECV</td><td>RFECV auto-selects optimal count</td></tr>
<tr><td>Tree model feature ranking</td><td>feature_importances_</td><td>Fast, intuitive, tree-specific</td></tr>
<tr><td>Embedded selection with linear model</td><td>LassoCV + SelectFromModel</td><td>Zeroes out weak features via L1</td></tr>
<tr><td>High-dimensional / correlated features</td><td>PCA(n_components=0.95)</td><td>Scale first; loses interpretability</td></tr>
</table>

---

## 📋 Completion Checklist

- Can apply log transform, polynomial features, and binning to create new features
- Know when to use Label/Ordinal vs One-Hot encoding and why (dummy variable trap)
- Can apply StandardScaler, MinMaxScaler, and RobustScaler and explain when to use each
- Can run SelectKBest with chi2 (classification) and f_regression (regression)
- Can run RFE and RFECV and identify optimal feature count from the CV curve
- Can extract and plot tree feature importances from RandomForest
- Can use Lasso + SelectFromModel for embedded feature selection
- Can build a complete sklearn Pipeline (scaler + selector + model) and cross-validate it correctly
