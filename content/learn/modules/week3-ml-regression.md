---
title: Week 3 — Machine Learning: Regression
description: Regression predicts continuous values like salary, price, or temperature, using algorithms from simple straight lines to ensemble forests. Learn evaluation metrics, gradient descent, and the sklearn pipeline.
---

> 🎯 TL;DR — Regression predicts continuous values (salary, price, temperature) using algorithms from simple straight lines to ensemble forests; mastering evaluation metrics, gradient descent intuition, and the sklearn pipeline makes you ready for any regression problem in production.

---

## 🧠 Mental Model

Imagine you're a real estate agent estimating house prices. Simple Linear Regression draws one straight trend line through all your experience. MLR draws that line through dozens of features simultaneously. SVR wraps a tolerance tube around the line — anything inside is "good enough." Random Forest asks 100 agents independently and averages their guesses. XGBoost asks each new agent to specifically fix the mistakes of everyone before them. All are trying to find the same thing: the function that maps inputs to a number.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Simple Linear Regression</td><td><code>y = wX + b</code> — one feature → one number</td><td>Foundational: slope and intercept explain how one variable drives another</td></tr>
<tr><td>Multiple Linear Regression</td><td><code>y = w1X1 + w2X2 + ... + b</code> — many features</td><td>Most real problems have multiple drivers; MLR handles them simultaneously</td></tr>
<tr><td>Cost Function (MSE)</td><td>Mean of squared prediction errors</td><td>What the algorithm minimizes during training — the "score to beat"</td></tr>
<tr><td>Gradient Descent</td><td>Iteratively moves w and b downhill on the cost surface</td><td>How ALL neural networks and many ML models learn</td></tr>
<tr><td>R² Score</td><td>% of target variance explained by the model</td><td>Primary regression metric; 0.85 means model explains 85% of variance</td></tr>
<tr><td>Adjusted R²</td><td>R² penalized for useless features</td><td>Use instead of R² for MLR — prevents feature bloat</td></tr>
<tr><td>SVR (Support Vector Regression)</td><td>Fits within an epsilon-tube; penalizes outliers</td><td>Robust to outliers; powerful with kernel trick for non-linear patterns</td></tr>
<tr><td>Random Forest</td><td>Average of many decision trees on random subsets</td><td>Reduces variance, rarely overfits, handles non-linearity and interactions</td></tr>
<tr><td>Gradient Boosting / XGBoost</td><td>Sequential trees each fixing prior residuals</td><td>Highest accuracy on tabular data; winner of most Kaggle competitions</td></tr>
<tr><td>GridSearchCV</td><td>Exhaustive hyperparameter search with cross-validation</td><td>Systematic way to find the best model configuration</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. Identify: is the output continuous? If yes → Regression
2. Explore data: `.describe()`, nulls, outliers, correlation matrix
3. Clean: handle missing values, encode categoricals (ordinal → label, nominal → one-hot)
4. Split: 80% train / 20% test with `train_test_split(stratify=None for regression)`
5. Scale: StandardScaler on X (required for SVR; recommended for all)
6. Train model: start with Linear Regression → Random Forest → XGBoost
7. Evaluate: R², MAE, RMSE on test set; compare train vs test R² to detect overfitting
8. Tune: GridSearchCV on hyperparameters with 5-fold cross-validation
9. Deploy: save model + scaler with pickle; in production call `scaler.transform()` then `model.predict()`

---

## 💻 Code Cheatsheet

```python
# ================================================================
# WEEK 3 — REGRESSION — COMPLETE CODE CHEATSHEET
# ================================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LinearRegression
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor, plot_tree
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.pipeline import Pipeline
import pickle

# ════════════════════════════════════════════════════════════════
# HELPER: Evaluate any regression model
# ════════════════════════════════════════════════════════════════
def evaluate(model, X_train, y_train, X_test, y_test, name="Model"):
    y_train_pred = model.predict(X_train)
    y_pred       = model.predict(X_test)
    print(f"\n{'='*50}")
    print(f"  {name}")
    print(f"{'='*50}")
    print(f"  Train R²  : {r2_score(y_train, y_train_pred):.4f}")
    print(f"  Test  R²  : {r2_score(y_test, y_pred):.4f}")
    print(f"  MAE       : {mean_absolute_error(y_test, y_pred):.2f}")
    print(f"  RMSE      : {np.sqrt(mean_squared_error(y_test, y_pred)):.2f}")
    gap = r2_score(y_train, y_train_pred) - r2_score(y_test, y_pred)
    if gap > 0.1:
        print("  ⚠️  OVERFITTING detected (train >> test)")
    return r2_score(y_test, y_pred)

# ════════════════════════════════════════════════════════════════
# SECTION 1: SIMPLE LINEAR REGRESSION (SLR)
# Equation: y = wX + b
# ════════════════════════════════════════════════════════════════
# Synthetic dataset: years of experience → salary
np.random.seed(42)
experience = np.random.uniform(1, 15, 200)
salary = 30000 + 5000 * experience + np.random.normal(0, 8000, 200)

X_slr = experience.reshape(-1, 1)   # sklearn needs 2D input
y_slr = salary

X_train, X_test, y_train, y_test = train_test_split(
    X_slr, y_slr, test_size=0.2, random_state=42
)

slr = LinearRegression()
slr.fit(X_train, y_train)

print(f"Slope (w)   : {slr.coef_[0]:.2f}")    # salary increase per year
print(f"Intercept(b): {slr.intercept_:.2f}")   # base salary at 0 years
evaluate(slr, X_train, y_train, X_test, y_test, "Simple Linear Regression")

# Plot regression line
plt.figure(figsize=(8, 5))
plt.scatter(X_test, y_test, color='blue', alpha=0.5, label='Actual')
plt.plot(X_test, slr.predict(X_test), 'r-', linewidth=2, label='Predicted')
plt.xlabel('Years Experience'); plt.ylabel('Salary')
plt.title('Simple Linear Regression'); plt.legend(); plt.show()

# ════════════════════════════════════════════════════════════════
# SECTION 2: MULTIPLE LINEAR REGRESSION (MLR) + ENCODING
# ════════════════════════════════════════════════════════════════
data = {
    'YearsExp':   np.random.uniform(1, 15, 300),
    'Department': np.random.choice(['IT', 'HR', 'Finance', 'Marketing'], 300),
    'Level':      np.random.choice(['Junior', 'Mid', 'Senior'], 300),
    'Certifications': np.random.randint(0, 5, 300),
    'Salary':     None
}
df = pd.DataFrame(data)

# Add salary with some realism
level_bonus = {'Junior': 0, 'Mid': 20000, 'Senior': 45000}
df['Salary'] = (30000
    + 4500 * df['YearsExp']
    + df['Level'].map(level_bonus)
    + 3000 * df['Certifications']
    + np.random.normal(0, 7000, 300))

# Ordinal Encoding (has natural order: Junior < Mid < Senior)
level_map = {'Junior': 1, 'Mid': 2, 'Senior': 3}
df['Level_enc'] = df['Level'].map(level_map)

# Nominal Encoding / One-Hot (no natural order: IT, HR, Finance)
df = pd.get_dummies(df, columns=['Department'], drop_first=True)
# drop_first=True avoids multicollinearity (dummy variable trap)

X_mlr = df.drop(['Salary', 'Level'], axis=1)
y_mlr = df['Salary']

X_train, X_test, y_train, y_test = train_test_split(
    X_mlr, y_mlr, test_size=0.2, random_state=42
)

mlr = LinearRegression()
mlr.fit(X_train, y_train)
evaluate(mlr, X_train, y_train, X_test, y_test, "Multiple Linear Regression")

# Feature coefficients
coef_df = pd.DataFrame({
    'Feature': X_mlr.columns,
    'Coefficient': mlr.coef_
}).sort_values('Coefficient', ascending=False)
print(coef_df.to_string())

# ════════════════════════════════════════════════════════════════
# SECTION 3: SUPPORT VECTOR REGRESSION (SVR)
# Key rule: MUST standardize features before SVR
# ════════════════════════════════════════════════════════════════
X = X_slr  # reuse experience data
y = y_slr

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# StandardScaler: z = (x - mean) / std → mean=0, std=1
scaler_X = StandardScaler()
scaler_y = StandardScaler()

X_train_sc = scaler_X.fit_transform(X_train)      # fit + transform on train
X_test_sc  = scaler_X.transform(X_test)           # transform ONLY on test
y_train_sc = scaler_y.fit_transform(y_train.reshape(-1,1)).ravel()

svr = SVR(kernel='rbf', C=100, epsilon=0.1, gamma='scale')
svr.fit(X_train_sc, y_train_sc)

# Inverse transform predictions back to original scale
y_pred_sc = svr.predict(X_test_sc)
y_pred    = scaler_y.inverse_transform(y_pred_sc.reshape(-1,1)).ravel()

print(f"\nSVR Test R²: {r2_score(y_test, y_pred):.4f}")
# SVR kernels: 'linear' (linear data), 'rbf' (non-linear, default), 'poly', 'sigmoid'

# ════════════════════════════════════════════════════════════════
# SECTION 4: DECISION TREE REGRESSION
# ════════════════════════════════════════════════════════════════
X_train, X_test, y_train, y_test = train_test_split(X_slr, y_slr, test_size=0.2, random_state=42)

dt = DecisionTreeRegressor(
    max_depth=4,           # limit tree depth → prevents overfitting
    min_samples_split=10,  # minimum samples to split a node
    min_samples_leaf=5,    # minimum samples in a leaf
    random_state=42
)
dt.fit(X_train, y_train)
evaluate(dt, X_train, y_train, X_test, y_test, "Decision Tree (max_depth=4)")

# Compare overfitting with unlimited depth
dt_deep = DecisionTreeRegressor(random_state=42)  # no depth limit
dt_deep.fit(X_train, y_train)
evaluate(dt_deep, X_train, y_train, X_test, y_test, "Decision Tree (unlimited depth)")

# Visualize the tree
plt.figure(figsize=(20, 6))
plot_tree(dt, feature_names=['YearsExp'], filled=True, max_depth=3)
plt.title('Decision Tree (max_depth=4)'); plt.show()

# ════════════════════════════════════════════════════════════════
# SECTION 5: RANDOM FOREST REGRESSION
# Bagging: parallel trees on random data subsets → average predictions
# ════════════════════════════════════════════════════════════════
rf = RandomForestRegressor(
    n_estimators=200,      # number of trees (more = better, slower)
    max_depth=8,           # max depth per tree
    max_features='sqrt',   # features per split: 'sqrt'=√n, 'log2'=log₂n
    min_samples_leaf=3,
    random_state=42,
    n_jobs=-1              # use all CPU cores
)
rf.fit(X_train, y_train)
evaluate(rf, X_train, y_train, X_test, y_test, "Random Forest (200 trees)")

# Feature importance
feat_imp = pd.Series(rf.feature_importances_, index=['YearsExp'])
feat_imp.sort_values().plot(kind='barh', color='steelblue')
plt.title('Feature Importance'); plt.show()

# ════════════════════════════════════════════════════════════════
# SECTION 6: BOOSTING — GBM & XGBOOST
# Sequential: each tree corrects residuals of the previous
# ════════════════════════════════════════════════════════════════

# Gradient Boosting (sklearn)
gbm = GradientBoostingRegressor(
    n_estimators=300,
    learning_rate=0.05,    # step size — lower = slower but better generalization
    max_depth=3,
    subsample=0.8,          # fraction of samples per tree (reduces overfitting)
    min_samples_leaf=5,
    random_state=42
)
gbm.fit(X_train, y_train)
evaluate(gbm, X_train, y_train, X_test, y_test, "Gradient Boosting")

# XGBoost (pip install xgboost)
try:
    from xgboost import XGBRegressor
    xgb = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        colsample_bytree=0.8,  # fraction of features per tree
        subsample=0.8,
        reg_alpha=0.1,          # L1 regularization
        reg_lambda=1.0,         # L2 regularization
        random_state=42,
        verbosity=0
    )
    xgb.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    evaluate(xgb, X_train, y_train, X_test, y_test, "XGBoost")
except ImportError:
    print("Install xgboost: pip install xgboost")

# ════════════════════════════════════════════════════════════════
# SECTION 7: CROSS-VALIDATION
# More reliable than single train/test split
# ════════════════════════════════════════════════════════════════
models_cv = {
    "Linear Regression": LinearRegression(),
    "Random Forest":     RandomForestRegressor(n_estimators=100, random_state=42),
}

print("\n── Cross-Validation Results (5-fold) ──")
for name, model in models_cv.items():
    scores = cross_val_score(model, X_slr, y_slr, cv=5, scoring='r2')
    print(f"{name:25s}: {scores.mean():.4f} ± {scores.std():.4f}")

# ════════════════════════════════════════════════════════════════
# SECTION 8: GRIDSEARCHCV — HYPERPARAMETER TUNING
# ════════════════════════════════════════════════════════════════

# Random Forest GridSearch
rf_params = {
    'n_estimators': [50, 100, 200],
    'max_depth':    [None, 5, 10],
    'max_features': ['sqrt', 'log2'],
    'min_samples_leaf': [1, 3, 5]
}
rf_grid = GridSearchCV(
    RandomForestRegressor(random_state=42),
    rf_params,
    cv=5,
    scoring='r2',
    n_jobs=-1,
    verbose=1
)
rf_grid.fit(X_train, y_train)
print(f"\nBest RF Params: {rf_grid.best_params_}")
print(f"Best CV R²    : {rf_grid.best_score_:.4f}")
print(f"Test R²       : {r2_score(y_test, rf_grid.predict(X_test)):.4f}")

# SVR GridSearch (remember to scale data first!)
svr_params = {
    'C':       [0.1, 1, 10, 100],
    'epsilon': [0.01, 0.1, 0.5],
    'kernel':  ['rbf', 'linear']
}
svr_grid = GridSearchCV(SVR(), svr_params, cv=5, scoring='r2', n_jobs=-1)
svr_grid.fit(X_train_sc, y_train_sc)
print(f"Best SVR Params: {svr_grid.best_params_}")

# ════════════════════════════════════════════════════════════════
# SECTION 9: SKLEARN PIPELINE (best practice for deployment)
# Chains preprocessing + model into ONE object — no leakage risk
# ════════════════════════════════════════════════════════════════
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model',  RandomForestRegressor(random_state=42))
])

# GridSearch on the whole pipeline
pipe_params = {
    'model__n_estimators': [50, 100, 200],
    'model__max_depth':    [5, 10, None]
}
pipe_grid = GridSearchCV(pipeline, pipe_params, cv=5, scoring='r2', n_jobs=-1)
pipe_grid.fit(X_train, y_train)

print(f"\nPipeline Best Params: {pipe_grid.best_params_}")
print(f"Pipeline Test R²    : {r2_score(y_test, pipe_grid.predict(X_test)):.4f}")

# ════════════════════════════════════════════════════════════════
# SECTION 10: SAVE & LOAD FOR DEPLOYMENT
# ════════════════════════════════════════════════════════════════

# --- TRAINING PHASE ---
scaler_X = StandardScaler()
X_train_sc = scaler_X.fit_transform(X_train)
best_model = rf_grid.best_estimator_
best_model.fit(X_train_sc, y_train)

with open('model.pkl',  'wb') as f: pickle.dump(best_model, f)
with open('scaler.pkl', 'wb') as f: pickle.dump(scaler_X, f)
print("Saved model.pkl and scaler.pkl")

# --- PREDICTION PHASE (in API/production) ---
with open('model.pkl',  'rb') as f: loaded_model  = pickle.load(f)
with open('scaler.pkl', 'rb') as f: loaded_scaler = pickle.load(f)

new_input = np.array([[8.5]])    # 8.5 years experience
# ⚠️ CRITICAL: TRANSFORM only — never fit_transform on new data!
new_scaled = loaded_scaler.transform(new_input)
prediction = loaded_model.predict(new_scaled)
print(f"Predicted Salary: ₹{prediction[0]:,.0f}")

# Save entire pipeline (cleaner — scaler + model in one file)
with open('pipeline.pkl', 'wb') as f:
    pickle.dump(pipe_grid.best_estimator_, f)
# In production: loaded_pipeline.predict([[8.5]]) — no manual scaling needed!
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td><code>n_estimators</code></td><td>Number of trees in RF/GBM/XGB</td><td>100–500; start 100, tune up</td></tr>
<tr><td><code>max_depth</code></td><td>Max depth per tree</td><td>3–10; None=unlimited (overfits)</td></tr>
<tr><td><code>learning_rate</code></td><td>Step size in boosting</td><td>0.01–0.3; lower = better, slower</td></tr>
<tr><td><code>C</code> (SVR/SVM)</td><td>Regularization strength (higher = less regularization)</td><td>0.1, 1, 10, 100</td></tr>
<tr><td><code>epsilon</code> (SVR)</td><td>Width of tolerance tube</td><td>0.01–0.5</td></tr>
<tr><td><code>subsample</code></td><td>Fraction of samples per tree</td><td>0.6–0.9 for regularization</td></tr>
<tr><td><code>max_features</code></td><td>Features considered per split</td><td><code>'sqrt'</code> for RF, tune for GBM</td></tr>
<tr><td><code>cv</code></td><td>Number of cross-validation folds</td><td>5 or 10</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1:** What is the difference between R² and Adjusted R²?

**A:** R² always increases (or stays the same) when you add features, even useless ones. Adjusted R² penalizes each additional feature — if it doesn't meaningfully reduce error, Adjusted R² decreases. Always use Adjusted R² for MLR with multiple features.

**Q2:** What is gradient descent and why is it important?

**A:** Gradient descent is the optimization algorithm that trains most ML models. It iteratively updates weights (w, b) by moving in the direction of steepest descent on the cost function surface — like walking downhill in fog, always stepping in the direction that goes down fastest. It is the core learning algorithm of all neural networks.

**Q3:** What is overfitting and how do you detect and fix it?

**A:** Overfitting occurs when a model memorizes training data instead of learning generalizable patterns — high train R², low test R². Detect by comparing train vs test scores. Fix with: reducing model complexity (max_depth), regularization (C, lambda), more training data, cross-validation, or ensemble methods (Random Forest).

**Q4:** Why must you standardize features for SVR but not for Linear Regression?

**A:** SVR is distance-based — it minimizes a margin, so features on different scales (e.g., salary in 100,000s vs age in 20s) make the optimization meaningless. Linear Regression uses closed-form least squares which is scale-invariant. However, standardizing for Linear Regression is still good practice.

**Q5:** What is the difference between Bagging and Boosting?

**A:** Bagging (Random Forest) trains trees in parallel on random data subsets and averages predictions — reduces variance. Boosting (XGBoost, GBM) trains trees sequentially where each new tree focuses on correcting the residual errors of all previous trees — reduces bias. Bagging is less prone to overfitting; Boosting achieves higher accuracy but needs careful tuning.

**Q6:** Why do you use `drop_first=True` in `pd.get_dummies`?

**A:** To avoid the dummy variable trap (multicollinearity). If you have 3 departments (IT, HR, Finance), 2 dummy columns fully encode all 3 states — the third is always inferrable. Including all 3 makes them linearly dependent, which can cause numerical instability in linear models.

**Q7:** What is a scikit-learn Pipeline and why use it?

**A:** A Pipeline chains preprocessing steps and a model into a single object. Benefits: (1) eliminates data leakage — scaler is fit only on training fold during CV, (2) single `.fit()` / `.predict()` call, (3) one pickle file contains everything needed for deployment, (4) works seamlessly with GridSearchCV.

**Q8:** What evaluation metric should you use for regression?

**A:** R² for general model quality (% variance explained). RMSE when you need error in the same unit as the target (penalizes large errors more). MAE when outliers are present and you want a more robust metric. Always report all three in interviews.

---

## ⚠️ Common Mistakes

- Calling `scaler.fit_transform(X_test)` — this leaks test statistics and makes your model look better than it is in production
- Forgetting to inverse_transform SVR predictions — comparing scaled predictions to original-scale y_test gives nonsensical R²
- Using R² alone for MLR evaluation — always report Adjusted R², otherwise adding random features looks like improvement
- Not checking train vs test R² — missing overfitting means you ship a model that fails in production
- Saving model but not scaler — in production, new data must be scaled with the SAME scaler used in training
- Using `GridSearchCV` on the full dataset — it must be on training data only; test set should be completely held out
- Setting `max_depth=None` in production Decision Trees — unlimited trees memorize training data and fail generalization

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Small dataset, interpretability needed</td><td>Simple/Multiple Linear Regression</td></tr>
<tr><td>Non-linear data, outliers present</td><td>SVR with RBF kernel (after scaling)</td></tr>
<tr><td>Complex non-linear data, interpretability OK</td><td>Random Forest</td></tr>
<tr><td>Maximum accuracy, tabular data</td><td>XGBoost or LightGBM</td></tr>
<tr><td>Quick baseline</td><td>Linear Regression — always start here</td></tr>
<tr><td>Need feature importance</td><td>Random Forest or XGBoost (both provide <code>.feature_importances_</code>)</td></tr>
<tr><td>Hyperparameter tuning</td><td>GridSearchCV with 5-fold CV on training data</td></tr>
<tr><td>Production deployment</td><td>sklearn Pipeline (scaler + model in one object)</td></tr>
</table>

---

## 📋 Completion Checklist

- Build SLR from scratch: plot data, fit, evaluate R²/RMSE, plot regression line
- Build MLR with one-hot encoding for categorical features using `pd.get_dummies`
- Build SVR: scale features, train, inverse-transform predictions, evaluate
- Compare Decision Tree with max_depth=4 vs unlimited depth (witness overfitting)
- Build Random Forest and plot feature importances
- Run GridSearchCV on Random Forest or SVR and find best hyperparameters
- Build a sklearn Pipeline that chains StandardScaler + RandomForest
- Save model and scaler with pickle; load and predict on new data
