---
title: Week 2 — Python for AI & Data Science
description: Python's scientific stack — NumPy for computation, Pandas for data, Matplotlib for visualization — is the universal language of AI engineering. Master it to handle any dataset and build any model.
---

> 🎯 TL;DR — Python's scientific stack (NumPy for computation, Pandas for data, Matplotlib for visualization) is the universal language of AI engineering, and mastering it means you can manipulate any dataset, build any model, and ship any AI product.

---

## 🧠 Mental Model

NumPy is your calculator — fast, vectorized, unforgiving about shape. Pandas is your spreadsheet — flexible, labeled, SQL-like. Matplotlib is your whiteboard — show the data's story visually. Master these three and you hold the keys to every AI library built on top of them.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>NumPy ndarray</td><td>N-dimensional array with fixed dtype</td><td>100x faster than Python lists for math — all ML libraries use it internally</td></tr>
<tr><td>Broadcasting</td><td>Automatic shape alignment in operations</td><td>Lets you add a (3,) vector to a (100,3) matrix without loops</td></tr>
<tr><td>Boolean Indexing</td><td>Filter array with True/False mask</td><td>Core pattern for data cleaning and feature filtering</td></tr>
<tr><td>Pandas DataFrame</td><td>2D labeled table (like SQL table in Python)</td><td>The standard container for structured ML data</td></tr>
<tr><td><code>fit_transform</code> vs <code>transform</code></td><td>Former computes AND applies; latter only applies</td><td>Never call <code>fit_transform</code> on test data — causes data leakage</td></tr>
<tr><td>List Comprehension</td><td><code>[expr for item in iterable if cond]</code></td><td>Pythonic, faster than loops, used everywhere in data processing</td></tr>
<tr><td>Decorator</td><td>Function wrapper using <code>@syntax</code></td><td>Used in FastAPI routes, timing, logging — essential for production AI code</td></tr>
<tr><td>OOP for ML</td><td>Classes encapsulating model + data logic</td><td>Scikit-learn, PyTorch, and Keras all follow OOP patterns</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. Understand Python data structures (lists, dicts, sets, tuples) — all ML data starts as one of these
2. Master NumPy arrays: creation, slicing, reshaping, broadcasting, vectorized math
3. Master Pandas: loading CSV/Excel, exploring with `.describe()/.info()`, filtering, groupby, apply
4. Learn data cleaning: handle nulls (`fillna`, `dropna`), fix dtypes, remove duplicates
5. Visualize with Matplotlib: line, scatter, bar, histogram, heatmap — always explore before modeling
6. Write reusable functions with type hints, `*args`, `**kwargs`
7. Apply OOP — build a model class that encapsulates fit, predict, evaluate
8. Use virtual environments and requirements.txt for reproducible setups

---

## 💻 Code Cheatsheet

```python
# ================================================================
# WEEK 2 — PYTHON FOR AI & DATA SCIENCE — COMPLETE CHEATSHEET
# ================================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter, defaultdict
import json, os, time

# ════════════════════════════════════════════════════════════════
# SECTION 1: NUMPY — THE ENGINE UNDER ALL AI
# ════════════════════════════════════════════════════════════════

# ── Array Creation ───────────────────────────────────────────────
a = np.array([1, 2, 3, 4, 5])                  # 1D
m = np.array([[1,2,3],[4,5,6],[7,8,9]])          # 2D matrix
z = np.zeros((3, 4))                             # 3x4 zeros
o = np.ones((2, 3))                              # 2x3 ones
e = np.eye(4)                                    # 4x4 identity
r = np.arange(0, 20, 2)                          # [0,2,4,...,18]
ls = np.linspace(0, 1, 5)                        # [0, .25, .5, .75, 1]
rnd = np.random.randn(4, 4)                      # random normal (mean=0, std=1)
rnd_int = np.random.randint(1, 100, (3, 3))      # random integers

# ── Shape & Reshape ──────────────────────────────────────────────
print(m.shape)           # (3, 3)
print(m.ndim)            # 2
print(m.dtype)           # int64
flat = m.flatten()       # → 1D array
col = a.reshape(-1, 1)   # (5,) → (5,1) — required by sklearn!
row = a.reshape(1, -1)   # (5,) → (1,5)
t   = m.T                # transpose: rows ↔ columns

# ── Indexing & Slicing ───────────────────────────────────────────
arr = np.array([10, 20, 30, 40, 50, 60])
print(arr[2])            # 30 — zero-indexed
print(arr[-1])           # 60 — last element
print(arr[1:4])          # [20 30 40] — end exclusive
print(arr[::2])          # [10 30 50] — every other

# 2D indexing
print(m[1, 2])           # 6 — row 1, col 2
print(m[:, 1])           # [2 5 8] — all rows, col 1
print(m[0, :])           # [1 2 3] — row 0, all cols
print(m[0:2, 1:3])       # [[2,3],[5,6]] — submatrix

# Boolean indexing — crucial for data filtering!
data = np.array([15, 42, 7, 88, 23, 95, 4, 61])
print(data[data > 50])           # [88 95 61]
print(data[(data>20) & (data<70)])  # [42 23 61]

# ── Vectorized Math (no loops needed!) ──────────────────────────
x = np.array([1., 2., 3., 4.])
print(x * 2)             # [2. 4. 6. 8.]
print(x ** 2)            # [1. 4. 9. 16.]
print(np.sqrt(x))        # [1. 1.41 1.73 2.]
print(np.exp(x))         # [2.71 7.38 20.08 54.59]
print(np.log(x))         # [0. 0.69 1.09 1.38]

# Broadcasting: (3,) + (3,3) works automatically
row_bias = np.array([10, 20, 30])
result = m + row_bias    # adds row_bias to EACH row of m

# ── Statistics ───────────────────────────────────────────────────
d = np.array([4, 7, 13, 2, 9, 1, 15, 8])
print(f"Mean  : {np.mean(d):.2f}")
print(f"Median: {np.median(d):.2f}")
print(f"Std   : {np.std(d):.2f}")
print(f"Var   : {np.var(d):.2f}")
print(f"Min/Max: {d.min()} / {d.max()}")
print(f"Argmax: {np.argmax(d)}")     # index of max value

# ── Matrix Multiplication (heart of neural networks) ─────────────
A = np.array([[1,2],[3,4]])
B = np.array([[5,6],[7,8]])
print(A @ B)             # [[19,22],[43,50]] — matrix multiply
print(np.dot(A, B))      # identical to A @ B
print(A * B)             # [[5,12],[21,32]] — element-wise

# ════════════════════════════════════════════════════════════════
# SECTION 2: PANDAS — DATA MANIPULATION
# ════════════════════════════════════════════════════════════════

# ── Create & Load ────────────────────────────────────────────────
data = {
    'Name':    ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
    'Age':     [25, 30, 35, 28, 32, None],
    'Salary':  [50000, 75000, 90000, 65000, 80000, 55000],
    'Dept':    ['IT', 'HR', 'IT', 'Finance', 'IT', 'HR'],
    'Score':   [88, 72, 91, 85, np.nan, 78]
}
df = pd.DataFrame(data)

# Load from files:
# df = pd.read_csv('data.csv')
# df = pd.read_excel('data.xlsx', sheet_name='Sheet1')
# df = pd.read_json('data.json')

# ── Explore ──────────────────────────────────────────────────────
print(df.head(3))               # first 3 rows
print(df.tail(2))               # last 2 rows
print(df.shape)                 # (6, 5) — rows, cols
print(df.dtypes)                # dtype per column
print(df.describe())            # count, mean, std, min, quartiles, max
print(df.info())                # non-null count + dtypes summary
print(df.isnull().sum())        # null count per column
print(df.nunique())             # unique value count per column
print(df['Dept'].value_counts()) # frequency count

# ── Select ───────────────────────────────────────────────────────
print(df['Name'])                    # Series (single column)
print(df[['Name', 'Salary']])        # DataFrame (multiple columns)
print(df.loc[0])                     # row by index label
print(df.iloc[1:4])                  # rows 1,2,3 by position
print(df.loc[df['Dept'] == 'IT'])    # filter by condition
print(df.loc[(df['Salary'] > 60000) & (df['Age'] < 33)])  # compound filter

# ── Clean ────────────────────────────────────────────────────────
df['Age'].fillna(df['Age'].median(), inplace=True)     # fill with median
df['Score'].fillna(df['Score'].mean(), inplace=True)   # fill with mean
df.dropna(inplace=True)                                # drop rows with any null
df.drop_duplicates(inplace=True)                       # remove duplicate rows
df['Dept'] = df['Dept'].str.strip().str.upper()        # strip whitespace, uppercase

# ── Add / Modify Columns ─────────────────────────────────────────
df['Salary_K'] = df['Salary'] / 1000                  # simple transform
df['Senior'] = df['Age'] > 30                          # boolean flag
df['Salary_Cat'] = df['Salary'].apply(
    lambda x: 'High' if x > 80000 else ('Mid' if x > 60000 else 'Low')
)

# ── GroupBy ──────────────────────────────────────────────────────
summary = df.groupby('Dept').agg({
    'Salary': ['mean', 'max', 'count'],
    'Age':    'mean',
    'Score':  'mean'
}).round(2)
print(summary)

# ── Sort & Rank ──────────────────────────────────────────────────
df_sorted = df.sort_values('Salary', ascending=False)
df['Salary_Rank'] = df['Salary'].rank(ascending=False)

# ── Merge & Join ─────────────────────────────────────────────────
dept_info = pd.DataFrame({'Dept': ['IT', 'HR', 'FINANCE'], 'Floor': [3, 1, 2]})
merged = df.merge(dept_info, on='Dept', how='left')   # SQL LEFT JOIN

# ── Save ─────────────────────────────────────────────────────────
df.to_csv('output.csv', index=False)
df.to_excel('output.xlsx', index=False, sheet_name='Data')

# ════════════════════════════════════════════════════════════════
# SECTION 3: MATPLOTLIB & SEABORN — VISUALIZATION
# ════════════════════════════════════════════════════════════════
fig, axes = plt.subplots(2, 3, figsize=(16, 10))
x = np.linspace(0, 10, 100)

# Line plot
axes[0,0].plot(x, np.sin(x), 'b-', label='sin(x)')
axes[0,0].plot(x, np.cos(x), 'r--', label='cos(x)')
axes[0,0].set_title('Line Plot'); axes[0,0].legend()

# Scatter
axes[0,1].scatter(np.random.randn(100), np.random.randn(100),
                   c='green', alpha=0.5)
axes[0,1].set_title('Scatter Plot')

# Bar chart
categories = ['NumPy', 'Pandas', 'Sklearn', 'PyTorch', 'FastAPI']
values = [92, 88, 85, 78, 70]
axes[0,2].bar(categories, values, color='steelblue')
axes[0,2].set_title('Library Proficiency')

# Histogram
axes[1,0].hist(np.random.normal(60, 15, 1000), bins=30,
               color='orange', edgecolor='black')
axes[1,0].set_title('Score Distribution')

# Box plot
axes[1,1].boxplot([np.random.randn(100) + i for i in range(4)],
                   labels=['Q1','Q2','Q3','Q4'])
axes[1,1].set_title('Quarterly Performance')

# Correlation heatmap (most important for ML EDA)
corr = pd.DataFrame(np.random.randn(5, 5), columns=['A','B','C','D','E'])
sns.heatmap(corr.corr(), annot=True, fmt='.2f', cmap='coolwarm', ax=axes[1,2])
axes[1,2].set_title('Correlation Heatmap')

plt.tight_layout()
plt.savefig('week2_plots.png', dpi=150, bbox_inches='tight')
plt.show()

# ════════════════════════════════════════════════════════════════
# SECTION 4: FUNCTIONS, LAMBDAS, DECORATORS
# ════════════════════════════════════════════════════════════════

# Type-hinted function (production standard)
def clean_dataframe(df: pd.DataFrame, drop_threshold: float = 0.5) -> pd.DataFrame:
    """
    Remove columns with more than drop_threshold missing values,
    fill remaining nulls with column median.
    """
    null_frac = df.isnull().mean()
    df = df.drop(columns=null_frac[null_frac > drop_threshold].index)
    return df.fillna(df.median(numeric_only=True))

# *args and **kwargs
def train_model(*datasets, **hyperparams):
    """Accept variable datasets and config"""
    print(f"Training on {len(datasets)} datasets")
    print(f"Config: {hyperparams}")
    # e.g. train_model(X_train, y_train, n_estimators=100, max_depth=5)

# Lambda — used with map/filter/apply
double    = lambda x: x * 2
normalize = lambda x, mn, mx: (x - mn) / (mx - mn)

nums = [1, 2, 3, 4, 5, 6, 7, 8]
squared  = list(map(lambda x: x**2, nums))
evens    = list(filter(lambda x: x % 2 == 0, nums))
print(squared)   # [1, 4, 9, 16, 25, 36, 49, 64]
print(evens)     # [2, 4, 6, 8]

# Decorator — timing wrapper (used in production logging)
import functools

def timer(func):
    """Decorator: logs how long a function takes"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"[TIMER] {func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def train_expensive_model(X, y):
    """Simulates slow training"""
    time.sleep(0.1)   # simulate work
    return {"accuracy": 0.95}

result = train_expensive_model(None, None)
# Output: [TIMER] train_expensive_model took 0.1003s

# ════════════════════════════════════════════════════════════════
# SECTION 5: OOP FOR ML
# ════════════════════════════════════════════════════════════════
class MLModel:
    """Reusable model wrapper following scikit-learn interface pattern"""
    
    _model_registry = []   # class variable — shared across instances
    
    def __init__(self, name: str, algorithm: str):
        self.name = name
        self.algorithm = algorithm
        self.is_trained = False
        self.metrics = {}
        MLModel._model_registry.append(name)
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train the model — returns self for method chaining"""
        if X is None or y is None:
            raise ValueError("X and y cannot be None")
        self.is_trained = True
        print(f"[{self.name}] Training with {self.algorithm}...")
        return self   # enables: model.fit(X, y).predict(X_test)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError(f"[{self.name}] Call fit() before predict()")
        return np.random.randint(0, 2, len(X))  # placeholder
    
    def evaluate(self, X: np.ndarray, y: np.ndarray) -> dict:
        y_pred = self.predict(X)
        acc = np.mean(y_pred == y)
        self.metrics = {"accuracy": acc}
        return self.metrics
    
    def __repr__(self):
        status = "trained" if self.is_trained else "untrained"
        return f"MLModel(name='{self.name}', algo='{self.algorithm}', {status})"
    
    @classmethod
    def list_models(cls):
        return cls._model_registry
    
    @staticmethod
    def validate_shapes(X, y):
        assert len(X) == len(y), f"X has {len(X)} rows but y has {len(y)}"

# Inheritance
class ClassifierModel(MLModel):
    def __init__(self, name, algorithm, n_classes: int):
        super().__init__(name, algorithm)
        self.n_classes = n_classes
    
    def predict_proba(self, X):
        """Return class probabilities"""
        raw = np.random.rand(len(X), self.n_classes)
        return raw / raw.sum(axis=1, keepdims=True)  # normalize to sum=1

# Usage
clf = ClassifierModel("SpamDetector", "Naive Bayes", n_classes=2)
print(clf)
clf.fit(np.random.randn(100, 5), np.random.randint(0,2,100))
proba = clf.predict_proba(np.random.randn(10, 5))
print("Proba shape:", proba.shape)  # (10, 2)
print("All models:", MLModel.list_models())

# ════════════════════════════════════════════════════════════════
# SECTION 6: ERROR HANDLING & FILE I/O
# ════════════════════════════════════════════════════════════════
class DataLoadError(Exception):
    """Custom exception for data loading failures"""
    pass

def safe_load_csv(filepath: str) -> pd.DataFrame:
    """Load CSV with full error handling"""
    try:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        df = pd.read_csv(filepath)
        if df.empty:
            raise DataLoadError("Loaded DataFrame is empty")
        print(f"Loaded {df.shape[0]} rows, {df.shape[1]} columns")
        return df
    except pd.errors.ParserError as e:
        raise DataLoadError(f"CSV parse error: {e}")
    except Exception as e:
        print(f"Unexpected error: {type(e).__name__}: {e}")
        raise
    finally:
        print("Data load attempt complete")

# JSON config management (common in ML projects)
config = {
    "model_name": "RandomForest",
    "n_estimators": 100,
    "max_depth": 5,
    "test_size": 0.2,
    "random_state": 42
}

with open("config.json", "w") as f:
    json.dump(config, f, indent=4)

with open("config.json", "r") as f:
    loaded_config = json.load(f)

print(loaded_config["model_name"])  # RandomForest

# ════════════════════════════════════════════════════════════════
# SECTION 7: COMPREHENSIONS — PYTHONIC DATA PROCESSING
# ════════════════════════════════════════════════════════════════

# List comprehension (replaces for loops)
squared = [x**2 for x in range(10)]
filtered = [x for x in range(50) if x % 3 == 0 and x % 5 == 0]
flat = [item for sublist in [[1,2],[3,4],[5,6]] for item in sublist]

# Dict comprehension
feature_stats = {col: df[col].mean() for col in df.select_dtypes('number').columns}

# Set comprehension (unique values)
unique_dept_lengths = {len(d) for d in ['IT', 'HR', 'Finance', 'IT']}

# Generator (memory-efficient for large datasets)
total = sum(x**2 for x in range(10_000_000))  # no list in memory!

# zip — process multiple sequences together
feature_names = ['age', 'salary', 'experience']
importances = [0.32, 0.51, 0.17]
feat_dict = dict(zip(feature_names, importances))
sorted_feats = sorted(feat_dict.items(), key=lambda x: x[1], reverse=True)
print(sorted_feats)  # [('salary', 0.51), ('age', 0.32), ('experience', 0.17)]
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td><code>axis=0</code></td><td>Operate along rows (down)</td><td><code>df.mean(axis=0)</code> = column means</td></tr>
<tr><td><code>axis=1</code></td><td>Operate along columns (across)</td><td><code>df.mean(axis=1)</code> = row means</td></tr>
<tr><td><code>inplace=True</code></td><td>Modify DataFrame in place, no copy</td><td>Use carefully — can't undo</td></tr>
<tr><td><code>reshape(-1, 1)</code></td><td>Convert 1D array to 2D column</td><td>Required by sklearn for 1-feature models</td></tr>
<tr><td><code>fillna(method)</code></td><td>Strategy for missing values</td><td><code>'mean'</code>, <code>'median'</code>, <code>'ffill'</code>, <code>0</code></td></tr>
<tr><td><code>drop_first=True</code></td><td>Remove one dummy column in get_dummies</td><td>Avoids dummy variable trap (multicollinearity)</td></tr>
<tr><td><code>n_jobs=-1</code></td><td>Use all CPU cores</td><td>In sklearn estimators for speed</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1:** What is the difference between a NumPy array and a Python list?

**A:** NumPy arrays are homogeneous (single dtype), fixed-size, and stored in contiguous memory — making vectorized operations 10–100x faster than equivalent Python list loops. They support broadcasting and matrix operations; Python lists do not.

**Q2:** What is broadcasting in NumPy?

**A:** Broadcasting allows NumPy to perform operations on arrays of different shapes by automatically expanding smaller arrays to match larger ones — without copying data. E.g., adding a (1,3) array to a (4,3) matrix works without a loop.

**Q3:** What is the difference between `loc` and `iloc` in Pandas?

**A:** `loc` selects by label (column name, index label); `iloc` selects by integer position (0-based). When index is default integers they look the same, but `loc` is inclusive on both ends, `iloc` is exclusive on the right.

**Q4:** What is data leakage and how does Pandas help prevent it?

**A:** Data leakage is when information from the test set influences training. In Pandas: always call `scaler.fit_transform(X_train)` then `scaler.transform(X_test)` — never `fit_transform` on test data.

**Q5:** What is a decorator in Python and where is it used in AI?

**A:** A decorator is a function that wraps another function to add behavior without modifying it. In AI/ML: timing decorators for profiling, caching decorators for memoizing expensive computations, and FastAPI uses `@app.post("/predict")` decorators to define API routes.

**Q6:** What is the difference between `map`, `filter`, and `apply` in Pandas?

**A:** `map` transforms a Series element-by-element using a function or dict. `filter` subsets columns/rows by name. `apply` runs a function on rows or columns — more flexible than `map`, works on DataFrames too.

**Q7:** Why use list comprehensions over for loops in data processing?

**A:** Comprehensions are faster (C-optimized under the hood), more readable, and idiomatic Python. They also make generator expressions easy, which process data lazily without storing everything in memory.

---

## ⚠️ Common Mistakes

- Calling `.fit_transform()` on test data — leaks test statistics into training, inflates metrics
- Forgetting `.reshape(-1, 1)` when passing 1D arrays to scikit-learn — causes `ValueError: Expected 2D array`
- Using `df[col]` vs `df[[col]]` — former returns Series, latter returns DataFrame; many operations need DataFrame
- Modifying a DataFrame inside a loop without `inplace=True` or reassignment — changes are silently lost
- Not resetting index after filtering/dropping rows — stale index causes confusing `.loc` behavior; fix with `df.reset_index(drop=True)`
- Chaining Pandas operations without copying — `df.dropna().sort_values(...)` modifies original in some cases; assign to new variable
- Using Python loops for large array math instead of NumPy vectorization — 100x performance penalty

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Fast numerical computation</td><td>NumPy array operations (no loops)</td></tr>
<tr><td>Tabular data manipulation</td><td>Pandas DataFrame</td></tr>
<tr><td>Load dataset from CSV</td><td><code>pd.read_csv('file.csv')</code></td></tr>
<tr><td>Handle missing values</td><td><code>df.fillna(median)</code> or <code>df.dropna()</code></td></tr>
<tr><td>Encode categorical columns</td><td><code>pd.get_dummies(df, drop_first=True)</code></td></tr>
<tr><td>Group and aggregate like SQL</td><td><code>df.groupby('col').agg({'col2': 'mean'})</code></td></tr>
<tr><td>Plot data distribution</td><td><code>df['col'].hist()</code> or <code>sns.histplot()</code></td></tr>
<tr><td>Find feature correlations</td><td><code>df.corr()</code> then <code>sns.heatmap()</code></td></tr>
<tr><td>Reusable ML code</td><td>OOP class with <code>fit()</code>, <code>predict()</code>, <code>evaluate()</code></td></tr>
<tr><td>Memory-efficient iteration</td><td>Generator expression <code>(x for x in ...)</code></td></tr>
</table>

---

## 📋 Completion Checklist

- Create a NumPy array, reshape it to 2D, and perform matrix multiplication
- Load a CSV with Pandas, check nulls, fill them, and filter rows by condition
- Write a GroupBy aggregation that calculates mean salary by department
- Plot a histogram, scatter plot, and correlation heatmap on a real dataset
- Write a function with `*args`, `**kwargs`, and type hints
- Write a decorator that times any function
- Build an OOP `MLModel` class with `fit()`, `predict()`, and `evaluate()` methods
- Write a list comprehension that filters and transforms data in one line
