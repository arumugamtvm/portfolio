---
title: Week 6 — Bivariate Analysis
description: Bivariate analysis studies the relationship between two variables. Use correlation for number-number pairs, T-Test or ANOVA for category-number pairs, and Chi-Square for category-category pairs, always checking the p-value.
---

> 🎯 **TL;DR** — Bivariate analysis studies the relationship between two variables. Use **correlation + scatter plots** for num↔num, **T-Test / ANOVA** for cat↔num, and **Chi-Square** for cat↔cat. Always check p-value < 0.05 to confirm significance. VIF > 5 signals multicollinearity — drop or combine the offending feature.

## 🧠 Mental Model

Think of bivariate analysis like a **detective interview**: you're questioning two suspects (variables) to see if they have a secret relationship. Correlation is asking "do you move together?" T-Test asks "are your averages really different?" ANOVA extends that to a room full of suspects (3+ groups). The p-value is your **confidence level** — below 0.05 means the relationship is real, not just a coincidence.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Input Type</th><th>Output Type</th><th>Method</th><th>Key Metric</th></tr>
<tr><td>Numerical</td><td>Numerical</td><td>Pearson / Spearman / Kendall correlation, scatter plot</td><td>r (correlation coefficient)</td></tr>
<tr><td>Categorical</td><td>Numerical</td><td>T-Test (2 groups) or ANOVA (3+ groups)</td><td>t-stat / F-stat, p-value</td></tr>
<tr><td>Categorical</td><td>Categorical</td><td>Chi-Square test</td><td>chi2 statistic, p-value</td></tr>
<tr><td>Any</td><td>Any</td><td>Heatmap (correlation matrix)</td><td>r matrix</td></tr>
<tr><td>Numerical (predictors)</td><td>—</td><td>VIF (multicollinearity detection)</td><td>VIF value</td></tr>
<tr><td>Regression residuals</td><td>—</td><td>Residual vs Fitted plot (homoscedasticity)</td><td>Funnel shape = bad</td></tr>
</table>

**Correlation coefficient (r) strength guide:**

<table>
<tr><th>|r| range</th><th>Strength</th><th>VIF value</th><th>Multicollinearity</th></tr>
<tr><td>&gt; 0.7</td><td>Strong</td><td>1</td><td>None</td></tr>
<tr><td>0.4 – 0.7</td><td>Moderate</td><td>1 – 5</td><td>Acceptable</td></tr>
<tr><td>&lt; 0.4</td><td>Weak</td><td>5 – 10</td><td>High — investigate</td></tr>
<tr><td>0</td><td>No linear relation</td><td>&gt; 10</td><td>Severe — drop feature</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Identify variable types** — numerical or categorical for each pair
2. **Choose the right test** — correlation for num↔num, T-Test/ANOVA for cat↔num, Chi-Square for cat↔cat
3. **Visualise** — scatter plot, boxplot, or heatmap before running the test
4. **Run statistical test** — compute test statistic (r, t, F, chi2) and p-value
5. **Interpret p-value** — p < 0.05 → reject H₀ (significant relationship exists)
6. **Check multicollinearity** — compute VIF for all predictors; drop if VIF > 5–10
7. **Verify regression assumptions** — plot residuals vs fitted values for homoscedasticity
8. **Report findings** — state direction, strength, and significance

---

## 💻 Code Cheatsheet

```python
# ============================================================
# BIVARIATE ANALYSIS — COMPLETE CHEATSHEET
# Week 6: Correlation, Hypothesis Testing, VIF
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import ttest_ind, ttest_1samp, ttest_rel, f_oneway, chi2_contingency

# ----------------------------------------------------------
# 1. LOAD DATA
# ----------------------------------------------------------
# Use seaborn built-in dataset for demo
df = sns.load_dataset('tips')  # has numerical + categorical columns

# ----------------------------------------------------------
# 2. CORRELATION — NUMERICAL vs NUMERICAL
# ----------------------------------------------------------

# Pearson (linear relationship, normally distributed)
r_pearson, p_pearson = stats.pearsonr(df['total_bill'], df['tip'])
print(f"Pearson r: {r_pearson:.3f}, p-value: {p_pearson:.4f}")

# Spearman (monotonic, non-normal / ordinal data)
r_spearman, p_spearman = stats.spearmanr(df['total_bill'], df['tip'])
print(f"Spearman r: {r_spearman:.3f}, p-value: {p_spearman:.4f}")

# Kendall (rank-based, small samples, many ties)
r_kendall, p_kendall = stats.kendalltau(df['total_bill'], df['tip'])
print(f"Kendall tau: {r_kendall:.3f}, p-value: {p_kendall:.4f}")

# Full correlation matrix + covariance matrix
corr_matrix = df.select_dtypes(include='number').corr()
cov_matrix  = df.select_dtypes(include='number').cov()
print(corr_matrix)

# ----------------------------------------------------------
# 3. SCATTER PLOT WITH REGRESSION LINE
# ----------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Matplotlib version
axes[0].scatter(df['total_bill'], df['tip'], alpha=0.5, color='steelblue')
m, b = np.polyfit(df['total_bill'], df['tip'], 1)
x_line = np.linspace(df['total_bill'].min(), df['total_bill'].max(), 100)
axes[0].plot(x_line, m * x_line + b, color='red', lw=2, label=f'y={m:.2f}x+{b:.2f}')
axes[0].set(xlabel='Total Bill', ylabel='Tip', title=f'Scatter (r={r_pearson:.2f})')
axes[0].legend()

# Seaborn version (one-liner)
sns.regplot(data=df, x='total_bill', y='tip', ax=axes[1],
            scatter_kws={'alpha': 0.5}, line_kws={'color': 'red'})
axes[1].set_title('Seaborn regplot')

plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 4. HEATMAP — CORRELATION MATRIX
# ----------------------------------------------------------
plt.figure(figsize=(9, 6))
sns.heatmap(
    corr_matrix, annot=True, fmt='.2f', cmap='coolwarm',
    center=0, vmin=-1, vmax=1, linewidths=0.5, square=True
)
plt.title('Correlation Heatmap')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 5. VIF — VARIANCE INFLATION FACTOR (multicollinearity)
# ----------------------------------------------------------
from statsmodels.stats.outliers_influence import variance_inflation_factor

X = df.select_dtypes(include='number').drop('tip', axis=1)

vif_data = pd.DataFrame({
    'feature': X.columns,
    'VIF': [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
}).sort_values('VIF', ascending=False)

print(vif_data)
# Rule: VIF > 5 → investigate; VIF > 10 → drop or combine features
high_vif = vif_data[vif_data['VIF'] > 5]['feature'].tolist()
print(f"High VIF features: {high_vif}")

# ----------------------------------------------------------
# 6. T-TESTS — CATEGORICAL vs NUMERICAL (2 groups)
# ----------------------------------------------------------

# Independent two-sample T-Test
group_male   = df[df['sex'] == 'Male']['tip']
group_female = df[df['sex'] == 'Female']['tip']

t_stat, p_value = ttest_ind(group_male, group_female)
print(f"\nTwo-Sample T-Test — t={t_stat:.3f}, p={p_value:.4f}")
print("Significant difference" if p_value < 0.05 else "No significant difference")

# One-sample T-Test: Is mean tip = $3.00?
t_stat_1, p_val_1 = ttest_1samp(df['tip'], popmean=3.0)
print(f"One-Sample T-Test (mu=3.0) — t={t_stat_1:.3f}, p={p_val_1:.4f}")

# Paired T-Test: same subjects measured twice
before = np.array([5.2, 4.8, 6.0, 5.5, 4.9])
after  = np.array([5.5, 5.1, 6.3, 5.8, 5.2])
t_pair, p_pair = ttest_rel(before, after)
print(f"Paired T-Test — t={t_pair:.3f}, p={p_pair:.4f}")

# Visualise: boxplot of tip by sex
plt.figure(figsize=(7, 5))
sns.boxplot(data=df, x='sex', y='tip', palette='Set2')
plt.title(f'Tip by Sex | T-Test p={p_value:.4f}')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 7. ONE-WAY ANOVA — 3+ GROUPS
# ----------------------------------------------------------

# Does tip differ across days?
groups = [df[df['day'] == day]['tip'] for day in df['day'].unique()]
f_stat, p_anova = f_oneway(*groups)
print(f"\nOne-Way ANOVA — F={f_stat:.3f}, p={p_anova:.4f}")
print("At least one group differs" if p_anova < 0.05 else "No significant difference")

# Post-hoc: Tukey HSD (which pairs differ?)
from statsmodels.stats.multicomp import pairwise_tukeyhsd
tukey = pairwise_tukeyhsd(df['tip'], df['day'], alpha=0.05)
print(tukey.summary())

plt.figure(figsize=(8, 5))
sns.boxplot(data=df, x='day', y='tip', palette='muted', order=['Thur','Fri','Sat','Sun'])
plt.title(f'Tip by Day | ANOVA p={p_anova:.4f}')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 8. TWO-WAY ANOVA (using statsmodels)
# ----------------------------------------------------------
import statsmodels.formula.api as smf
from statsmodels.stats.anova import anova_lm

model = smf.ols('tip ~ C(sex) + C(day) + C(sex):C(day)', data=df).fit()
print(anova_lm(model, typ=2))

# ----------------------------------------------------------
# 9. CHI-SQUARE TEST — CATEGORICAL vs CATEGORICAL
# ----------------------------------------------------------

contingency = pd.crosstab(df['day'], df['time'])
print(contingency)

chi2_stat, p_chi2, dof, expected = chi2_contingency(contingency)
print(f"\nChi-Square — chi2={chi2_stat:.3f}, dof={dof}, p={p_chi2:.4f}")
print("Association exists" if p_chi2 < 0.05 else "No significant association")

plt.figure(figsize=(7, 4))
sns.heatmap(contingency, annot=True, fmt='d', cmap='Blues')
plt.title('Contingency Table: Day vs Time')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 10. HOMOSCEDASTICITY CHECK
# ----------------------------------------------------------
from sklearn.linear_model import LinearRegression

X_lr = df[['total_bill', 'size']].values
y_lr = df['tip'].values
model_lr  = LinearRegression().fit(X_lr, y_lr)
fitted    = model_lr.predict(X_lr)
residuals = y_lr - fitted

plt.figure(figsize=(8, 5))
plt.scatter(fitted, residuals, alpha=0.5, color='steelblue')
plt.axhline(y=0, color='red', linestyle='--', lw=2)
plt.xlabel('Fitted Values'); plt.ylabel('Residuals')
plt.title('Residuals vs Fitted\nRandom scatter = Homoscedastic (GOOD) | Funnel = Heteroscedastic (BAD)')
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 11. AUTO BIVARIATE ANALYSIS FUNCTION
# ----------------------------------------------------------
def bivariate_report(df, col1, col2, alpha=0.05):
    """Auto-detect types and run the right statistical test."""
    is_num = lambda c: df[c].dtype in ['int64', 'float64']
    t1 = 'num' if is_num(col1) else 'cat'
    t2 = 'num' if is_num(col2) else 'cat'
    print(f"\n{'='*50}\nBivariate: {col1} ({t1}) vs {col2} ({t2})")

    if t1 == 'num' and t2 == 'num':
        r, p = stats.pearsonr(df[col1].dropna(), df[col2].dropna())
        print(f"  Pearson r={r:.3f}, p={p:.4f} → {'Significant' if p < alpha else 'Not significant'}")
    elif t1 == 'cat' and t2 == 'num':
        grps = [df[df[col1] == v][col2].dropna() for v in df[col1].unique()]
        if len(grps) == 2:
            t, p = ttest_ind(*grps)
            print(f"  T-Test t={t:.3f}, p={p:.4f} → {'Significant' if p < alpha else 'Not significant'}")
        else:
            f, p = f_oneway(*grps)
            print(f"  ANOVA F={f:.3f}, p={p:.4f} → {'Significant' if p < alpha else 'Not significant'}")
    elif t1 == 'cat' and t2 == 'cat':
        ct = pd.crosstab(df[col1], df[col2])
        chi2, p, dof, _ = chi2_contingency(ct)
        print(f"  Chi-Square chi2={chi2:.3f}, dof={dof}, p={p:.4f} → {'Significant' if p < alpha else 'Not significant'}")

for col in df.select_dtypes(include='number').columns:
    if col != 'tip':
        bivariate_report(df, col, 'tip')

print("\nBivariate analysis complete!")
```

---

## ⚙️ Key Parameters / Hyperparameters Table

<table>
<tr><th>Parameter / Concept</th><th>What it Controls</th><th>Default / Threshold</th><th>Notes</th></tr>
<tr><td>alpha (α)</td><td>Significance level — Type I error probability</td><td>0.05 standard</td><td>Use 0.01 for stricter tests</td></tr>
<tr><td>p-value</td><td>Probability of observing result by chance under H₀</td><td>&lt; 0.05 → reject H₀</td><td>Does NOT measure effect size</td></tr>
<tr><td>Pearson r</td><td>Linear correlation strength and direction</td><td>-1 to +1</td><td>Sensitive to outliers</td></tr>
<tr><td>Spearman r</td><td>Monotonic (rank-based) correlation</td><td>-1 to +1</td><td>Robust to outliers, non-normal data</td></tr>
<tr><td>Kendall tau</td><td>Rank-based concordance</td><td>-1 to +1</td><td>Better for small samples with ties</td></tr>
<tr><td>VIF</td><td>Multicollinearity severity</td><td>&lt; 5 acceptable</td><td>&gt; 10 → must drop or combine</td></tr>
<tr><td>t-statistic</td><td>Signal-to-noise ratio between group means</td><td>|t| &gt; ~2 for p &lt; 0.05</td><td>Larger |t| = more different groups</td></tr>
<tr><td>F-statistic</td><td>Ratio of between-group to within-group variance</td><td>F &gt; 1 generally significant</td><td>Use post-hoc (Tukey) to identify which groups</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between Pearson, Spearman, and Kendall correlation?**

A: Pearson measures *linear* correlation and assumes normality — sensitive to outliers. Spearman is rank-based (monotonic) and robust to outliers. Kendall is also rank-based but more reliable for small samples and tied data. Use Pearson for clean numerical data, Spearman/Kendall for non-normal or ordinal data.

**Q2: What does a p-value of 0.03 mean?**

A: There is only a 3% chance of observing a result at least this extreme if the null hypothesis were true. Since 0.03 < 0.05 (alpha), we reject H₀ and conclude the finding is statistically significant.

**Q3: What is multicollinearity and why is it a problem?**

A: Multicollinearity occurs when two or more independent variables are highly correlated with each other. It inflates coefficient standard errors, makes it hard to isolate individual feature effects, and produces unstable regression models.

**Q4: How do you detect and fix multicollinearity?**

A: Detect using VIF (> 5–10) or a correlation matrix (|r| > 0.8 between predictors). Fix by dropping one of the correlated features, combining them (e.g., average), or applying PCA.

**Q5: When do you use T-Test vs ANOVA?**

A: T-Test compares means of exactly 2 groups. ANOVA compares means of 3 or more groups simultaneously. Running multiple T-Tests inflates Type I error (false positives) — ANOVA avoids this.

**Q6: What is homoscedasticity and how do you check it?**

A: Homoscedasticity means residual variance is constant across all fitted values — a key linear regression assumption. Check with a residual vs fitted plot: random scatter is good; a funnel shape indicates heteroscedasticity (violation).

**Q7: What does ANOVA's post-hoc test (Tukey HSD) tell you?**

A: ANOVA only tells you *at least one* group mean differs. Tukey's HSD performs pairwise comparisons between all group combinations and identifies *which specific pairs* are significantly different, with p-value adjustment for multiple comparisons.

**Q8: Can Chi-Square measure the strength of an association?**

A: Chi-Square only tests *whether* an association exists. For strength, use Cramer's V (0 to 1 scale), computed from the chi-square statistic normalized by sample size and table dimensions.

---

## ⚠️ Common Mistakes

- **Running T-Test for 3+ groups** — inflates Type I error. Use ANOVA followed by Tukey HSD post-hoc test instead.
- **Confusing correlation with causation** — high r only means the variables move together, not that one causes the other.
- **Ignoring effect size** — p < 0.05 is not proof of a large effect. Always report effect size (Cohen's d, Cramer's V, r²) alongside p-value.
- **Using Pearson on non-normal or ordinal data** — Pearson assumes normality and linearity. Use Spearman for non-normal distributions or ordinal variables.
- **Forgetting to encode categoricals before VIF** — always convert categorical variables to numeric before computing VIF.
- **Ignoring multicollinearity before regression** — high VIF features cause unreliable coefficient estimates even if model R² looks fine.
- **Using Chi-Square with very small expected frequencies** — requires expected cell counts ≥ 5. For small samples, use Fisher's Exact Test instead.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th><th>Key Output</th></tr>
<tr><td>Two numerical variables</td><td>Pearson / Spearman correlation</td><td>r, p-value</td></tr>
<tr><td>Non-normal or ordinal data</td><td>Spearman / Kendall</td><td>r, p-value</td></tr>
<tr><td>Categorical (2 groups) vs numerical</td><td>Independent T-Test</td><td>t-stat, p-value</td></tr>
<tr><td>Categorical (3+ groups) vs numerical</td><td>One-way ANOVA + Tukey HSD</td><td>F-stat, p-value, pairwise diff</td></tr>
<tr><td>Two categorical variables</td><td>Chi-Square test</td><td>chi2, p-value</td></tr>
<tr><td>Same subjects, two time points</td><td>Paired T-Test</td><td>t-stat, p-value</td></tr>
<tr><td>Predictors correlated with each other</td><td>VIF analysis</td><td>VIF per feature</td></tr>
<tr><td>Check regression linearity assumption</td><td>Residual vs Fitted plot</td><td>Visual (funnel = bad)</td></tr>
<tr><td>Visualise all feature correlations at once</td><td>Correlation heatmap</td><td>Color-coded r matrix</td></tr>
</table>

---

## 📋 Completion Checklist

- Can identify the right test for each variable type combination (num↔num, cat↔num, cat↔cat)
- Understand correlation coefficient range and strength thresholds (weak / moderate / strong)
- Can compute Pearson, Spearman, and Kendall correlations in Python with scipy.stats
- Know the difference between one-sample, two-sample, and paired T-Tests
- Can run One-Way ANOVA and interpret the F-statistic + p-value
- Can apply Tukey HSD post-hoc test to identify which groups differ
- Can compute VIF and identify multicollinear features (VIF > 5–10)
- Can produce a correlation heatmap and residual vs fitted plot in seaborn / matplotlib
