---
title: Week 5 — Univariate Analysis (Data Science)
description: Univariate analysis is the first step of any EDA. You study each variable on its own — its type, distribution, center, spread, skewness, and outliers — before building any model.
---

> 🎯 TL;DR — Univariate analysis is the mandatory first step of any EDA: understand each variable in isolation — its type, distribution, central tendency, spread, skewness, and outliers — before you can trust any model you build on it.

---

## 🧠 Mental Model

Think of your dataset as a box of mystery chocolates. Before you mix them into a recipe (build a model), you open every slot and examine each chocolate alone: is it a nut (discrete) or a cream (continuous)? Is it sweet (right-skewed income) or bitter (left-skewed exam scores)? Are there any mouldy ones (outliers) that will ruin the batch? That one-chocolate-at-a-time inspection is univariate analysis.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Population</td><td>The entire group of interest</td><td>Target of all statistical inference</td></tr>
<tr><td>Sample</td><td>Subset drawn from population</td><td>What we actually measure and model</td></tr>
<tr><td>Discrete variable</td><td>Countable integers (students: 1, 2, 3)</td><td>Bar chart; mode meaningful</td></tr>
<tr><td>Continuous variable</td><td>Any real number (height: 5.612 m)</td><td>Histogram, KDE, box plot</td></tr>
<tr><td>Nominal variable</td><td>Unordered categories (country, colour)</td><td>One-hot encode; bar/pie chart</td></tr>
<tr><td>Ordinal variable</td><td>Ordered categories (S &lt; M &lt; L &lt; XL)</td><td>Label/ordinal encode; preserves order</td></tr>
<tr><td>Mean</td><td>Sum / count</td><td>Sensitive to outliers</td></tr>
<tr><td>Median</td><td>Middle value</td><td>Robust to outliers — prefer for skewed data</td></tr>
<tr><td>Mode</td><td>Most frequent value</td><td>Only measure for categorical data</td></tr>
<tr><td>Variance</td><td>Average squared deviation from mean</td><td>Measures spread; same unit² as data</td></tr>
<tr><td>Standard Deviation</td><td>√Variance</td><td>Same unit as data — most interpretable spread</td></tr>
<tr><td>IQR</td><td>Q3 − Q1</td><td>Middle 50% spread; outlier-robust</td></tr>
<tr><td>Z-Score</td><td>(x − μ) / σ</td><td>Standardises scale; detects outliers (|Z| &gt; 3)</td></tr>
<tr><td>Skewness</td><td>Asymmetry of distribution</td><td>Right skew → log-transform; left skew → reflect</td></tr>
<tr><td>Kurtosis</td><td>Tail heaviness</td><td>High kurtosis = more extreme outliers</td></tr>
<tr><td>Normal Distribution</td><td>Bell curve: mean = median = mode</td><td>68-95-99.7 rule; basis for many ML assumptions</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Load data** — `pd.read_csv()`; check `shape`, `dtypes`, `isnull().sum()`
2. **Classify each column** — quantitative (discrete/continuous) or qualitative (nominal/ordinal)
3. **Compute central tendency** — mean, median, mode; compare mean vs median to spot skew
4. **Compute dispersion** — std, variance, range, IQR; use `describe()` for quick overview
5. **Check skewness & kurtosis** — `col.skew()` and `col.kurtosis()`; decide on transforms
6. **Detect outliers** — Z-score method (|Z| > 3) AND IQR method (< Q1−1.5×IQR or > Q3+1.5×IQR)
7. **Visualise** — histogram + KDE for continuous; bar chart + pie for categorical; box plot for outliers
8. **Handle skewness** — log1p transform for right skew; sqrt for moderate right skew
9. **Handle outliers** — cap (winsorise), remove, or flag with indicator column
10. **Document findings** — note feature types, distributions, outlier counts, and planned transforms

---

## 💻 Code Cheatsheet

```python
# ============================================================
# WEEK 5 — COMPLETE UNIVARIATE ANALYSIS CHEATSHEET
# All code is copy-paste runnable. Requires:
# pip install pandas numpy matplotlib seaborn scipy
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import zscore, skewnorm

# ─── 0. Load Data ────────────────────────────────────────────
# Using a realistic mixed dataset
np.random.seed(42)
n = 500
df = pd.DataFrame({
    'age':          np.random.randint(18, 80, n),
    'income':       np.random.exponential(scale=50000, size=n),  # right-skewed
    'exam_score':   100 - np.random.exponential(scale=15, size=n).clip(0, 100),  # left-skewed
    'height_cm':    np.random.normal(170, 10, n),
    'city':         np.random.choice(['Mumbai','Delhi','Chennai','Kolkata'], n),
    'edu_level':    np.random.choice(['High School','Bachelor','Master','PhD'], n),
    'has_car':      np.random.choice([0, 1], n, p=[0.6, 0.4])
})
df.loc[df.sample(20).index, 'income'] = np.nan   # introduce some nulls

# ─── 1. Quick Dataset Overview ───────────────────────────────
print("Shape:", df.shape)
print("\nDtypes + Nulls:")
print(df.info())
print("\nDescriptive Statistics:")
print(df.describe(include='all').T)  # .T for wide datasets

# ─── 2. Variable Type Classification ─────────────────────────
def classify_variable(series):
    if series.dtype == 'object':
        print(f"  {series.name}: QUALITATIVE NOMINAL (categories: {series.nunique()})")
    elif series.nunique() < 15 and series.dtype in ['int64', 'float64']:
        print(f"  {series.name}: QUANTITATIVE DISCRETE (unique values: {series.nunique()})")
    else:
        print(f"  {series.name}: QUANTITATIVE CONTINUOUS (range: {series.min():.1f} – {series.max():.1f})")

print("\nVariable Types:")
for col in df.columns:
    classify_variable(df[col])

# ─── 3. Central Tendency & Dispersion ────────────────────────
def central_tendency(series):
    col = series.dropna()
    print(f"\n{'─'*45}")
    print(f"  Column: {col.name}")
    print(f"{'─'*45}")
    print(f"  Count    : {len(col)}")
    print(f"  Nulls    : {series.isnull().sum()}")
    print(f"  Mean     : {col.mean():.2f}")
    print(f"  Median   : {col.median():.2f}")
    try:
        print(f"  Mode     : {col.mode()[0]:.2f}")
    except Exception:
        print(f"  Mode     : {col.mode()[0]}")
    print(f"  Std Dev  : {col.std():.2f}")
    print(f"  Variance : {col.var():.2f}")
    print(f"  Range    : {col.max() - col.min():.2f}  ({col.min():.2f} to {col.max():.2f})")
    Q1, Q3 = col.quantile(0.25), col.quantile(0.75)
    print(f"  IQR      : {Q3-Q1:.2f}  (Q1={Q1:.2f}, Q3={Q3:.2f})")
    print(f"  Skewness : {col.skew():.3f}  {'(right-skewed ▶)' if col.skew()>1 else '(left-skewed ◀)' if col.skew()<-1 else '(≈ normal)'}")
    print(f"  Kurtosis : {col.kurtosis():.3f}")

central_tendency(df['income'])
central_tendency(df['height_cm'])

# ─── 4. Z-Score — Standardisation & Outlier Detection ────────
# Z = (X - μ) / σ
# Z=0 → at mean | Z=1 → 1 SD above | |Z|>3 → outlier

df['income_zscore'] = zscore(df['income'].fillna(df['income'].median()))

# Detect outliers
z_outliers = df[df['income_zscore'].abs() > 3]
print(f"\nZ-Score Outliers (|Z|>3): {len(z_outliers)} rows")
print(z_outliers[['income', 'income_zscore']].head())

# Manual Z-score
mean_inc = df['income'].mean()
std_inc  = df['income'].std()
df['income_zscore_manual'] = (df['income'] - mean_inc) / std_inc

# Key rules: 68% within ±1σ, 95% within ±2σ, 99.7% within ±3σ
for sigma in [1, 2, 3]:
    pct = (df['income_zscore'].abs() <= sigma).mean() * 100
    print(f"  Within ±{sigma}σ: {pct:.1f}%")

# ─── 5. IQR Outlier Detection ────────────────────────────────
def detect_outliers_iqr(series, col_name=None):
    col = series.dropna()
    Q1, Q3 = col.quantile(0.25), col.quantile(0.75)
    IQR    = Q3 - Q1
    lower  = Q1 - 1.5 * IQR
    upper  = Q3 + 1.5 * IQR
    outliers = col[(col < lower) | (col > upper)]
    print(f"\nIQR Outliers in '{col_name or col.name}':")
    print(f"  Lower fence: {lower:.2f} | Upper fence: {upper:.2f}")
    print(f"  Outliers: {len(outliers)} ({len(outliers)/len(col)*100:.1f}%)")
    return lower, upper

lo, hi = detect_outliers_iqr(df['income'], 'income')
df_clean = df[(df['income'] >= lo) & (df['income'] <= hi)]
print(f"  Rows after removing outliers: {len(df_clean)}")

# ─── 6. All Visualisations ───────────────────────────────────
def full_univariate_plot(df, col):
    series = df[col].dropna()
    is_numeric = pd.api.types.is_numeric_dtype(series)

    if is_numeric:
        fig, axes = plt.subplots(1, 3, figsize=(18, 5))
        fig.suptitle(f'Univariate Analysis: {col}', fontsize=14, fontweight='bold')

        # Histogram + KDE
        axes[0].hist(series, bins=30, edgecolor='black', color='steelblue', alpha=0.7, density=True)
        series.plot.kde(ax=axes[0], color='red', linewidth=2)
        axes[0].axvline(series.mean(),   color='green', linestyle='--', label=f'Mean={series.mean():.1f}')
        axes[0].axvline(series.median(), color='orange',linestyle='--', label=f'Median={series.median():.1f}')
        axes[0].legend(); axes[0].set_title('Histogram + KDE')

        # Box Plot
        axes[1].boxplot(series, vert=True, patch_artist=True,
                        boxprops=dict(facecolor='lightblue'))
        axes[1].set_title(f'Box Plot  (IQR={series.quantile(0.75)-series.quantile(0.25):.1f})')

        # QQ Plot (check normality)
        stats.probplot(series, dist='norm', plot=axes[2])
        axes[2].set_title('Q-Q Plot (Normal)')

    else:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.suptitle(f'Univariate Analysis: {col}', fontsize=14, fontweight='bold')
        vc = series.value_counts()
        vc.plot.bar(ax=axes[0], color='coral', edgecolor='black')
        axes[0].set_title('Bar Chart'); axes[0].tick_params(axis='x', rotation=30)
        vc.plot.pie(ax=axes[1], autopct='%1.1f%%', startangle=90)
        axes[1].set_title('Pie Chart'); axes[1].set_ylabel('')

    plt.tight_layout(); plt.show()

# Run for all columns
for col in df.select_dtypes(include='number').columns[:4]:
    full_univariate_plot(df, col)
for col in df.select_dtypes(include='object').columns:
    full_univariate_plot(df, col)

# ─── 7. Skewness Detection & Treatment ───────────────────────
# Rule: skew > 1 → right-skewed; skew < -1 → left-skewed; else ≈ normal
print("\nSkewness check:")
for col in df.select_dtypes(include='number').columns:
    sk = df[col].dropna().skew()
    print(f"  {col:20s}: skew={sk:+.3f}  {'→ right-skewed, try log' if sk>1 else '→ left-skewed' if sk<-1 else '→ approximately normal'}")

# Fix right skew (e.g., income)
df['income_log']  = np.log1p(df['income'])    # log1p = log(1+x), handles zeros safely
df['income_sqrt'] = np.sqrt(df['income'].clip(0))

print(f"\nIncome skew before: {df['income'].skew():.3f}")
print(f"After log1p       : {df['income_log'].skew():.3f}")
print(f"After sqrt        : {df['income_sqrt'].skew():.3f}")

# Compare distributions
fig, axes = plt.subplots(1, 3, figsize=(18, 4))
df['income'].plot.hist(bins=50, ax=axes[0], title='Original (right-skewed)', color='salmon')
df['income_log'].plot.hist(bins=50, ax=axes[1], title='After log1p', color='steelblue')
df['income_sqrt'].plot.hist(bins=50, ax=axes[2], title='After sqrt', color='green')
plt.tight_layout(); plt.show()

# ─── 8. Population vs Sample Demonstration ───────────────────
# True population mean (we rarely know this in practice)
population_heights = np.random.normal(170, 10, 100000)
pop_mean = population_heights.mean()    # μ (population parameter)

# Sample statistics (what we compute from data)
samples = [np.random.choice(population_heights, 100) for _ in range(500)]
sample_means = [s.mean() for s in samples]  # x̄ (sample statistics)

print(f"\nPopulation mean (μ)      : {pop_mean:.2f}")
print(f"Average of 500 sample means: {np.mean(sample_means):.2f}  (≈ μ by CLT)")
print(f"Std of sample means (SEM): {np.std(sample_means):.2f}  (= σ/√n = {10/np.sqrt(100):.2f})")

# ─── 9. Normal Distribution & 68-95-99.7 Rule ────────────────
mu, sigma = 170, 10
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 300)
y_norm = stats.norm.pdf(x, mu, sigma)

plt.figure(figsize=(10, 5))
plt.plot(x, y_norm, 'k-', linewidth=2)

# Shade regions
for n_sigma, color, label in [(1,'#3498db','68%'), (2,'#2ecc71','95%'), (3,'#e74c3c','99.7%')]:
    mask = (x >= mu - n_sigma*sigma) & (x <= mu + n_sigma*sigma)
    plt.fill_between(x[mask], y_norm[mask], alpha=0.3, color=color, label=f'±{n_sigma}σ ({label})')
plt.axvline(mu, color='black', linestyle='--', label=f'Mean={mu}')
plt.xlabel('Height (cm)'); plt.ylabel('Density')
plt.title('Normal Distribution — 68-95-99.7 Rule')
plt.legend(); plt.tight_layout(); plt.show()

# ─── 10. Complete EDA Function ───────────────────────────────
def full_univariate_eda(df, column):
    col = df[column].dropna()
    print(f"\n{'='*55}\n  UNIVARIATE EDA: {column}\n{'='*55}")
    print(f"  Dtype     : {df[column].dtype}")
    print(f"  Count     : {len(col)}  |  Nulls: {df[column].isnull().sum()}")
    if pd.api.types.is_numeric_dtype(col):
        print(f"  Mean/Med  : {col.mean():.2f} / {col.median():.2f}")
        print(f"  Std / IQR : {col.std():.2f} / {col.quantile(0.75)-col.quantile(0.25):.2f}")
        print(f"  Skewness  : {col.skew():.3f}  |  Kurtosis: {col.kurtosis():.3f}")
        z = zscore(col)
        print(f"  Z outliers: {(abs(z)>3).sum()}")
    else:
        print(f"  Unique    : {col.nunique()}")
        print(col.value_counts().to_string())
    full_univariate_plot(df, column)

full_univariate_eda(df, 'income')
full_univariate_eda(df, 'city')
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td><code>describe()</code></td><td>Summary stats: mean, std, min, quartiles, max</td><td>Include <code>include='all'</code> for categoricals</td></tr>
<tr><td><code>skew()</code> threshold</td><td>Flag skewed distributions needing transform</td><td>|skew| &gt; 1</td></tr>
<tr><td>Z-score threshold</td><td>Outlier boundary</td><td>3 (standard); 2 for stricter</td></tr>
<tr><td>IQR multiplier</td><td>Outlier fence width</td><td>1.5 (standard); 3.0 (only extreme outliers)</td></tr>
<tr><td><code>bins</code> in histogram</td><td>Granularity of distribution view</td><td>20–50 for numeric</td></tr>
<tr><td><code>np.log1p</code></td><td>Log transform for right-skewed positive data</td><td>Use when min value ≥ 0</td></tr>
<tr><td><code>np.sqrt</code></td><td>Moderate right-skew fix</td><td>Use for less severe skew</td></tr>
<tr><td><code>StandardScaler</code></td><td>Z-score normalisation for ML</td><td>After EDA, before distance-based models</td></tr>
<tr><td><code>MinMaxScaler</code></td><td>Scale to [0,1]</td><td>Neural networks; when bounded range needed</td></tr>
<tr><td><code>RobustScaler</code></td><td>Median/IQR-based scaling</td><td>When outliers can't be removed</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: When would you use median instead of mean to describe a dataset?**

A1: When the data is skewed or has outliers. The mean is pulled towards extreme values — e.g., Bill Gates walking into a room raises the average income enormously. The median (middle value) is not affected by extremes. Use mean for symmetric, approximately normal distributions; median for skewed or outlier-heavy data.

**Q2: What is the difference between variance and standard deviation?**

A2: Variance is the average squared distance from the mean — it's in units². Standard deviation is the square root of variance, so it's in the same unit as the data. Standard deviation is more interpretable: "heights vary by ±10 cm from the mean."

**Q3: Explain the Z-Score and its three main uses.**

A3: Z = (X − μ) / σ. (1) Standardisation: puts features on the same scale for algorithms like SVM/KNN that are distance-based. (2) Probability: Z-table gives the probability of observing a value — e.g., P(Z < 1.96) = 97.5%. (3) Outlier detection: any point with |Z| > 3 is more than 3 standard deviations from the mean, which happens less than 0.3% of the time in a normal distribution.

**Q4: What is skewness and how do you fix it?**

A4: Skewness measures asymmetry. Right-skewed (tail on right): mean > median (e.g., income, house prices) — fix with log1p or sqrt transform. Left-skewed (tail on left): mean < median (e.g., exam scores) — fix by reflecting (max − x) then log. After transforming, check skew is between -0.5 and 0.5.

**Q5: What is IQR and how do you use it for outlier detection?**

A5: IQR = Q3 − Q1 (the middle 50% of data). Outlier fences: Lower = Q1 − 1.5×IQR; Upper = Q3 + 1.5×IQR. Values outside these fences are potential outliers. IQR is more robust than Z-score when data is not normally distributed.

**Q6: What is the difference between discrete and continuous variables and why does it matter for EDA?**

A6: Discrete variables take countable, integer values (number of children: 0, 1, 2, 3). Continuous variables can take any real value in a range (height: 170.5, 170.51 cm). It matters because: discrete variables use bar charts and mode; continuous variables use histograms, KDE, and box plots. Discrete variables often need different statistical tests and encoding strategies.

---

## ⚠️ Common Mistakes

- **Using mean for skewed data** — income with a few billionaires gives a misleading average; always report median alongside mean.
- **Not checking for nulls before computing statistics** — `mean()` silently skips nulls, which can misrepresent distributions; always report `isnull().sum()`.
- **Treating ordinal variables as nominal** — size (S < M < L) has order information that one-hot encoding destroys; use OrdinalEncoder.
- **Removing all IQR outliers blindly** — some "outliers" are real and important (top customers, fraud cases); investigate before removing.
- **Applying log transform when values include zero or negative** — `log(0)` is undefined; use `np.log1p(x)` which computes log(1+x).
- **Skipping the Q-Q plot** — histogram alone doesn't confirm normality; a Q-Q plot clearly shows deviations from the normal distribution.
- **Not documenting transforms for production** — if you log-transform in EDA and train on transformed data, inference must apply the same transform; track this in your Pipeline.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Summarise all columns at once</td><td><code>df.describe(include='all')</code></td></tr>
<tr><td>View distribution of continuous variable</td><td>Histogram + KDE + Box Plot</td></tr>
<tr><td>View distribution of categorical variable</td><td>Bar chart + <code>value_counts()</code></td></tr>
<tr><td>Check skewness numerically</td><td><code>col.skew()</code> — flag if |skew| &gt; 1</td></tr>
<tr><td>Fix right-skewed data (income, prices)</td><td><code>np.log1p(col)</code></td></tr>
<tr><td>Fix moderate right skew</td><td><code>np.sqrt(col)</code></td></tr>
<tr><td>Detect outliers (normal distribution)</td><td>Z-score: |Z| &gt; 3</td></tr>
<tr><td>Detect outliers (any distribution)</td><td>IQR method: &lt; Q1−1.5×IQR or &gt; Q3+1.5×IQR</td></tr>
<tr><td>Scale features before distance-based ML</td><td><code>StandardScaler</code> (after splitting)</td></tr>
<tr><td>Scale when outliers present</td><td><code>RobustScaler</code></td></tr>
<tr><td>Check normality visually</td><td>Q-Q plot (<code>scipy.stats.probplot</code>)</td></tr>
</table>

---

## 📋 Completion Checklist

- Classify all columns as discrete/continuous/nominal/ordinal — explain the difference
- Compute mean, median, mode, std, IQR, skewness for at least 3 columns
- Detect outliers using both Z-score AND IQR method; compare the counts
- Apply log1p transform to a right-skewed column; confirm skew reduces
- Plot histogram + KDE + box plot for a continuous column; bar + pie for a categorical column
- Explain why median is preferred over mean for skewed income data
- Run `full_univariate_eda()` on every column in a real dataset
- Compute population mean vs sample mean; explain the Central Limit Theorem intuition
