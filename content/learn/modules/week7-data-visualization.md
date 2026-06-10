---
title: Week 7 — Data Visualization (Matplotlib & Seaborn)
description: Use Matplotlib for full control, Seaborn for quick statistical plots, and Plotly for interactive charts. For ML work, always plot the confusion matrix, ROC curve, feature importances, and learning curves.
---

> 🎯 **TL;DR** — Use **Matplotlib** for full control (fig/ax API), **Seaborn** for statistical plots with one line of code, and **Plotly** for interactive charts. For ML: always plot confusion matrix, ROC curve, feature importances, and learning curves. The right chart tells a story — a scattered scatter with a regression line beats a table of numbers every time.

## 🧠 Mental Model

Think of visualization libraries as camera lenses: **Matplotlib** is a DSLR with manual controls — you can adjust every setting but it takes more code. **Seaborn** is a smartphone with scene modes — beautiful defaults, smart presets, less flexibility. **Plotly** is a video camera — everything is interactive, zoomable, and shareable. For EDA, use Seaborn; for presentations, polish with Matplotlib; for dashboards, use Plotly.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Library</th><th>Best For</th><th>Interactivity</th><th>Learning Curve</th></tr>
<tr><td>Matplotlib</td><td>Full control, publication figures, ML diagnostics</td><td>Static</td><td>Medium</td></tr>
<tr><td>Seaborn</td><td>Statistical EDA, heatmaps, pairplots, grouped plots</td><td>Static</td><td>Low</td></tr>
<tr><td>Plotly Express</td><td>Interactive dashboards, web-ready charts</td><td>Interactive</td><td>Low</td></tr>
<tr><td>Pandas .plot()</td><td>Quick DataFrame plots</td><td>Static</td><td>Very Low</td></tr>
</table>

**Chart type selector:**

<table>
<tr><th>Goal</th><th>Chart Type</th><th>Seaborn Function</th></tr>
<tr><td>Distribution of one variable</td><td>Histogram / KDE</td><td>histplot, kdeplot</td></tr>
<tr><td>Spread + outliers by group</td><td>Box plot / Violin</td><td>boxplot, violinplot</td></tr>
<tr><td>Relationship: num vs num</td><td>Scatter + regression</td><td>scatterplot, regplot</td></tr>
<tr><td>All feature pairs at once</td><td>Pair plot</td><td>pairplot</td></tr>
<tr><td>Correlation structure</td><td>Heatmap</td><td>heatmap</td></tr>
<tr><td>Category counts</td><td>Bar / Count plot</td><td>barplot, countplot</td></tr>
<tr><td>Classifier performance</td><td>Confusion matrix heatmap</td><td>heatmap(confusion_matrix)</td></tr>
<tr><td>Classifier threshold trade-off</td><td>ROC curve</td><td>ax.plot(fpr, tpr)</td></tr>
<tr><td>Model training progress</td><td>Line (learning curves)</td><td>ax.plot(epochs, loss)</td></tr>
<tr><td>Optimal cluster count</td><td>Elbow curve</td><td>ax.plot(k, inertias)</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. **Import libraries** — matplotlib, seaborn, plotly; set theme with `sns.set_theme()`
2. **Explore the data** — check dtypes, check for nulls, understand variable types
3. **Choose chart type** — use the table above; match chart to analytical goal
4. **Plot with explicit API** — `fig, ax = plt.subplots()` for Matplotlib control
5. **Label everything** — title, x-label, y-label, legend; add annotations for key values
6. **Customize aesthetics** — color palette, font size, grid, remove top/right spines
7. **Save high resolution** — `fig.savefig('chart.png', dpi=150, bbox_inches='tight')`
8. **Tell a story** — one chart should answer one specific question; add context in the title

---

## 💻 Code Cheatsheet

```python
# ============================================================
# DATA VISUALIZATION COMPLETE CHEATSHEET
# Week 7: Matplotlib, Seaborn, Plotly, ML Diagnostics
# ============================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
from sklearn.metrics import confusion_matrix, roc_curve, auc
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris, make_classification, make_blobs
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.cluster import KMeans

# Global style
sns.set_theme(style='whitegrid', palette='muted', font_scale=1.1)
np.random.seed(42)

# Load sample datasets
tips = sns.load_dataset('tips')
iris = sns.load_dataset('iris')

# ----------------------------------------------------------
# 1. MATPLOTLIB FUNDAMENTALS — fig/ax OOP API
# ----------------------------------------------------------

# Always prefer explicit fig, ax over plt.* directly
fig, ax = plt.subplots(figsize=(8, 5))          # single plot
fig, axes = plt.subplots(2, 2, figsize=(12, 8)) # 2x2 grid

# Line plot
x = np.linspace(0, 10, 100)
fig, ax = plt.subplots(figsize=(9, 5))
ax.plot(x, np.sin(x), color='steelblue', lw=2, linestyle='-',  label='sin(x)')
ax.plot(x, np.cos(x), color='salmon',    lw=2, linestyle='--', label='cos(x)')
ax.set_title('Sine & Cosine', fontsize=15)
ax.set_xlabel('X'); ax.set_ylabel('Y')
ax.legend(fontsize=11)
ax.grid(True, alpha=0.3)
ax.spines[['top', 'right']].set_visible(False)  # cleaner look
plt.tight_layout()
plt.savefig('line_plot.png', dpi=150, bbox_inches='tight')  # save before show
plt.show()

# Scatter plot with color + size encoding
fig, ax = plt.subplots(figsize=(8, 6))
sc = ax.scatter(
    tips['total_bill'], tips['tip'],
    c=tips['size'], cmap='viridis', s=tips['size']*20,
    alpha=0.7, edgecolors='white', lw=0.5
)
plt.colorbar(sc, ax=ax, label='Party Size')
ax.set(title='Bill vs Tip (color=party size)', xlabel='Total Bill', ylabel='Tip')
plt.tight_layout(); plt.show()

# Bar chart with value labels
categories = ['Random Forest', 'XGBoost', 'Logistic Reg', 'SVM']
accuracies  = [0.93, 0.95, 0.87, 0.90]

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(categories, accuracies,
              color=['#4C72B0','#DD8452','#55A868','#C44E52'],
              edgecolor='white', alpha=0.9)
# Add value labels on top of bars
for bar, val in zip(bars, accuracies):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.003,
            f'{val:.2%}', ha='center', va='bottom', fontsize=11, fontweight='bold')
ax.set_ylim(0.8, 1.0)
ax.set_title('Model Accuracy Comparison', fontsize=14)
ax.set_ylabel('Test Accuracy')
ax.grid(axis='y', alpha=0.3)
plt.tight_layout(); plt.show()

# Histogram (overlapping distributions)
fig, ax = plt.subplots(figsize=(9, 5))
ax.hist(tips[tips['sex']=='Male']['tip'],   bins=25, alpha=0.6, color='steelblue', label='Male')
ax.hist(tips[tips['sex']=='Female']['tip'], bins=25, alpha=0.6, color='salmon',    label='Female')
ax.set(title='Tip Distribution by Gender', xlabel='Tip ($)', ylabel='Count')
ax.legend(); ax.grid(axis='y', alpha=0.3)
plt.tight_layout(); plt.show()

# 2x2 subplot grid
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
axes[0,0].plot(x, np.sin(x), 'b-');  axes[0,0].set_title('Line: sin(x)')
axes[0,1].scatter(np.random.randn(80), np.random.randn(80), alpha=0.6); axes[0,1].set_title('Scatter')
axes[1,0].bar(['A','B','C','D'], [4,7,3,9], color='salmon'); axes[1,0].set_title('Bar')
axes[1,1].hist(np.random.randn(400), bins=20, color='purple', alpha=0.7); axes[1,1].set_title('Histogram')
plt.suptitle('Matplotlib Subplot Grid', fontsize=16, fontweight='bold')
plt.tight_layout(); plt.show()

# Saving options
# fig.savefig('plot.png', dpi=150, bbox_inches='tight')    # PNG raster
# fig.savefig('plot.pdf', bbox_inches='tight')             # PDF vector
# fig.savefig('plot.svg', bbox_inches='tight')             # SVG vector

# ----------------------------------------------------------
# 2. SEABORN — HIGH-LEVEL STATISTICAL PLOTS
# ----------------------------------------------------------

# --- Distribution plots ---
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# histplot with KDE overlay
sns.histplot(tips['total_bill'], bins=20, kde=True, ax=axes[0], color='steelblue')
axes[0].set_title('histplot: Total Bill')

# histplot grouped by category
sns.histplot(data=tips, x='total_bill', hue='sex', bins=15, ax=axes[1])
axes[1].set_title('histplot: Grouped by Sex')

# kdeplot (smooth density)
sns.kdeplot(data=tips, x='total_bill', hue='time', fill=True, alpha=0.4, ax=axes[2])
axes[2].set_title('kdeplot: By Meal Time')

plt.tight_layout(); plt.show()

# --- Box + Violin side by side ---
fig, axes = plt.subplots(1, 2, figsize=(13, 5))

sns.boxplot(data=tips, x='day', y='total_bill', hue='sex',
            order=['Thur','Fri','Sat','Sun'], ax=axes[0], palette='Set2')
axes[0].set_title('Boxplot: Bill by Day and Sex')

sns.violinplot(data=tips, x='day', y='total_bill', hue='sex',
               split=True, order=['Thur','Fri','Sat','Sun'], ax=axes[1])
axes[1].set_title('Violin: Bill by Day and Sex')

plt.tight_layout(); plt.show()

# --- Scatter with regression ---
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
sns.scatterplot(data=tips, x='total_bill', y='tip', hue='sex', size='size',
                sizes=(40, 200), ax=axes[0])
axes[0].set_title('Scatterplot')

sns.regplot(data=tips, x='total_bill', y='tip', ax=axes[1],
            scatter_kws={'alpha': 0.5}, line_kws={'color': 'red', 'lw': 2})
axes[1].set_title('Regression Plot')
plt.tight_layout(); plt.show()

# --- Heatmap (correlation matrix) ---
corr = iris.select_dtypes(include='number').corr()
fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm',
            center=0, square=True, linewidths=0.5, ax=ax)
ax.set_title('Feature Correlation Matrix')
plt.tight_layout(); plt.show()

# --- Pairplot (all feature combinations) ---
g = sns.pairplot(iris, hue='species', diag_kind='kde',
                 plot_kws={'alpha': 0.6}, height=2.5)
g.fig.suptitle('Iris Pairplot', y=1.02)
plt.show()

# --- Count + bar plots ---
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
sns.countplot(data=tips, x='day', hue='sex', order=['Thur','Fri','Sat','Sun'], ax=axes[0])
axes[0].set_title('Count Plot: Visits by Day')
sns.barplot(data=tips, x='day', y='total_bill', hue='sex',
            order=['Thur','Fri','Sat','Sun'], ax=axes[1])
axes[1].set_title('Bar Plot: Mean Bill by Day')
plt.tight_layout(); plt.show()

# --- FacetGrid (small multiples) ---
g = sns.FacetGrid(tips, col='time', row='sex', height=4, aspect=1.2)
g.map_dataframe(sns.histplot, x='total_bill', bins=15, kde=True)
g.set_titles(col_template='{col_name}', row_template='{row_name}')
g.set_axis_labels('Total Bill ($)', 'Count')
plt.suptitle('FacetGrid: Distribution by Time and Sex', y=1.03)
plt.show()

# ----------------------------------------------------------
# 3. ML DIAGNOSTIC PLOTS
# ----------------------------------------------------------

# --- Confusion Matrix ---
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

X, y = load_iris(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
clf = RandomForestClassifier(100, random_state=42).fit(X_tr, y_tr)
y_pred = clf.predict(X_te)
cm = confusion_matrix(y_te, y_pred)

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', square=True,
            xticklabels=['setosa','versicolor','virginica'],
            yticklabels=['setosa','versicolor','virginica'], ax=ax)
ax.set(xlabel='Predicted', ylabel='Actual', title='Confusion Matrix')
plt.tight_layout(); plt.show()

# --- ROC Curve (binary classification) ---
from sklearn.metrics import roc_curve, auc

X_bin, y_bin = make_classification(n_samples=1000, random_state=42)
X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_bin, y_bin, test_size=0.3, random_state=42)
lr = LogisticRegression().fit(X_tr2, y_tr2)
fpr, tpr, _ = roc_curve(y_te2, lr.predict_proba(X_te2)[:, 1])
roc_auc = auc(fpr, tpr)

fig, ax = plt.subplots(figsize=(7, 6))
ax.plot(fpr, tpr, color='darkorange', lw=2, label=f'AUC = {roc_auc:.3f}')
ax.plot([0, 1], [0, 1], 'navy', lw=1.5, linestyle='--', label='Random (AUC=0.5)')
ax.fill_between(fpr, tpr, alpha=0.1, color='darkorange')
ax.set(xlim=[0,1], ylim=[0,1.05],
       xlabel='False Positive Rate', ylabel='True Positive Rate',
       title='ROC Curve')
ax.legend(loc='lower right'); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()

# --- Feature Importance Bar Chart ---
importances = clf.feature_importances_
feat_names  = load_iris().feature_names
idx = np.argsort(importances)[::-1]

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(range(4), importances[idx], color='steelblue', edgecolor='white', alpha=0.85)
ax.set_xticks(range(4))
ax.set_xticklabels([feat_names[i] for i in idx], rotation=25, ha='right')
ax.set(title='Random Forest Feature Importances', ylabel='Importance Score')
ax.grid(axis='y', alpha=0.3)
for bar, imp in zip(bars, importances[idx]):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.002,
            f'{imp:.3f}', ha='center', va='bottom', fontsize=10)
plt.tight_layout(); plt.show()

# --- Learning Curves (Train vs Validation Loss) ---
epochs     = np.arange(1, 51)
train_loss = 0.8 * np.exp(-0.10 * epochs) + 0.05 + 0.01 * np.random.randn(50)
val_loss   = 0.9 * np.exp(-0.07 * epochs) + 0.08 + 0.02 * np.random.randn(50)

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].plot(epochs, train_loss, 'b-o', ms=3, label='Train Loss')
axes[0].plot(epochs, val_loss,   'r-o', ms=3, label='Val Loss')
axes[0].set(title='Loss Curves', xlabel='Epoch', ylabel='Loss')
axes[0].legend(); axes[0].grid(alpha=0.3)
axes[1].plot(epochs, 1 - train_loss, 'b-o', ms=3, label='Train Acc')
axes[1].plot(epochs, 1 - val_loss,   'r-o', ms=3, label='Val Acc')
axes[1].set(title='Accuracy Curves', xlabel='Epoch', ylabel='Accuracy')
axes[1].legend(); axes[1].grid(alpha=0.3)
plt.suptitle('Model Training Progress', fontsize=14, fontweight='bold')
plt.tight_layout(); plt.show()

# --- Elbow Curve for K-Means ---
X_blobs, _ = make_blobs(n_samples=500, centers=4, random_state=42)
inertias = [KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_blobs).inertia_
            for k in range(1, 11)]

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(range(1, 11), inertias, 'bo-', ms=7, lw=2)
ax.axvline(x=4, color='red', linestyle='--', alpha=0.7, label='Optimal K=4')
ax.set(title='Elbow Curve: Optimal K', xlabel='Number of Clusters K',
       ylabel='Inertia (Within-Cluster SSE)')
ax.set_xticks(range(1, 11)); ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()

# --- Residual Plot (regression) ---
from sklearn.linear_model import LinearRegression
from sklearn.datasets import make_regression

X_reg, y_reg = make_regression(n_samples=200, n_features=1, noise=30, random_state=42)
X_tr3, X_te3, y_tr3, y_te3 = train_test_split(X_reg, y_reg, test_size=0.3, random_state=42)
lr_reg  = LinearRegression().fit(X_tr3, y_tr3)
y_pred3 = lr_reg.predict(X_te3)
residuals = y_te3 - y_pred3

fig, axes = plt.subplots(1, 2, figsize=(12, 5))
axes[0].scatter(y_pred3, residuals, alpha=0.6, color='steelblue')
axes[0].axhline(0, color='red', lw=2, linestyle='--')
axes[0].set(title='Residuals vs Fitted', xlabel='Fitted', ylabel='Residuals')
axes[0].grid(alpha=0.3)
axes[1].hist(residuals, bins=20, color='steelblue', edgecolor='white', alpha=0.8)
axes[1].set(title='Residual Distribution', xlabel='Residual', ylabel='Frequency')
axes[1].grid(axis='y', alpha=0.3)
plt.suptitle('Regression Residual Analysis', fontsize=14)
plt.tight_layout(); plt.show()

# ----------------------------------------------------------
# 4. PLOTLY — INTERACTIVE CHARTS
# ----------------------------------------------------------
import plotly.express as px

df_plotly = px.data.tips()

# Interactive scatter
fig = px.scatter(df_plotly, x='total_bill', y='tip', color='sex',
                 size='size', hover_data=['day','time'],
                 title='Interactive Scatter: Bill vs Tip')
fig.update_layout(template='plotly_white')
fig.show()

# Interactive bar
avg_bill = df_plotly.groupby(['day','sex'])['total_bill'].mean().reset_index()
fig = px.bar(avg_bill, x='day', y='total_bill', color='sex',
             barmode='group', title='Average Bill by Day',
             category_orders={'day': ['Thur','Fri','Sat','Sun']})
fig.show()

# Interactive histogram
fig = px.histogram(df_plotly, x='total_bill', color='sex', nbins=25,
                   barmode='overlay', opacity=0.7, title='Bill Distribution')
fig.show()

# Interactive box plot
fig = px.box(df_plotly, x='day', y='total_bill', color='sex',
             notched=True, title='Box Plot by Day',
             category_orders={'day': ['Thur','Fri','Sat','Sun']})
fig.show()

print("All visualizations complete!")
```

---

## ⚙️ Key Parameters / Hyperparameters Table

<table>
<tr><th>Parameter</th><th>Library / Function</th><th>What it Controls</th><th>Common Values</th></tr>
<tr><td>figsize</td><td>plt.subplots()</td><td>Canvas width × height in inches</td><td>(8,5) single, (12,8) grid</td></tr>
<tr><td>dpi</td><td>fig.savefig()</td><td>Resolution (dots per inch)</td><td>72 screen, 150 HD, 300 print</td></tr>
<tr><td>alpha</td><td>ax.scatter / ax.hist</td><td>Point/bar transparency</td><td>0.5–0.8 for overlapping data</td></tr>
<tr><td>bins</td><td>ax.hist / sns.histplot</td><td>Number of histogram bars</td><td>20–30 for most distributions</td></tr>
<tr><td>kde=True</td><td>sns.histplot</td><td>Adds smooth density curve overlay</td><td>True for distribution insight</td></tr>
<tr><td>hue</td><td>sns.*</td><td>Color-codes by categorical column</td><td>Column name string</td></tr>
<tr><td>palette</td><td>sns.set_theme</td><td>Color scheme</td><td>muted, Set2, coolwarm, viridis</td></tr>
<tr><td>cmap</td><td>sns.heatmap</td><td>Colormap for continuous values</td><td>coolwarm (diverging), Blues (sequential)</td></tr>
<tr><td>annot=True</td><td>sns.heatmap</td><td>Show numeric values in cells</td><td>True for correlation heatmaps</td></tr>
<tr><td>template</td><td>plotly fig.update_layout</td><td>Overall visual theme</td><td>plotly_white, plotly_dark, simple_white</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between Figure and Axes in Matplotlib?**

A: Figure is the overall canvas/window — the outermost container. Axes is the actual plot area inside the Figure where data is drawn (with x/y axis, ticks, labels). One Figure can contain multiple Axes (subplots). Always use `fig, ax = plt.subplots()` for clean, reusable code.

**Q2: When would you choose Seaborn over Matplotlib?**

A: Seaborn when you need statistically-aware plots (distribution, regression, categorical groupings) with minimal code and beautiful defaults. Use Matplotlib when you need pixel-level control over every element, or when building custom/composite figures not supported by Seaborn.

**Q3: What is a pairplot and when is it useful?**

A: A pairplot shows scatter plots for every combination of numerical features plus distribution plots on the diagonal. It's ideal for EDA — quickly reveals which feature pairs have strong correlations, clusters by class, or linear separability before modeling.

**Q4: How do you interpret an ROC curve and AUC?**

A: The ROC curve plots True Positive Rate (sensitivity) vs False Positive Rate at every classification threshold. AUC (Area Under Curve) summarizes overall discriminative ability: AUC=1.0 is perfect, AUC=0.5 is random. A curve hugging the top-left corner is a strong classifier.

**Q5: What does a funnel shape in a residual plot mean?**

A: Heteroscedasticity — the variance of residuals increases (or changes) with fitted values. This violates linear regression's constant-variance assumption and means predictions will be unreliable. Fix: apply log transformation to the target or use weighted regression.

**Q6: How do you make a Matplotlib figure presentation-ready?**

A: Remove top and right spines (`ax.spines[['top','right']].set_visible(False)`), increase font sizes (`fontsize=13`), use `tight_layout()`, set a clear descriptive title, label all axes with units, save as PDF or PNG at ≥150 DPI, and use a consistent color palette.

**Q7: What is the purpose of `bbox_inches='tight'` when saving figures?**

A: It prevents labels and titles from being clipped at the figure boundary. Without it, long axis labels or suptitles that extend beyond the default figure bounds are cut off in the saved file.

**Q8: When should you use Plotly over Seaborn?**

A: Use Plotly when the chart needs to be interactive (hover tooltips, zoom, pan, legend toggling) or embedded in a web app / Streamlit dashboard. Seaborn is better for static EDA in Jupyter notebooks and for publication-quality static figures.

---

## ⚠️ Common Mistakes

- **Using `plt.show()` before `fig.savefig()`** — `show()` clears the figure; always save first, then show.
- **Not calling `plt.tight_layout()`** — labels and subplots overlap without it; always call before savefig/show.
- **Using the wrong chart for the data type** — bar chart for numerical distributions (should be histogram), pie chart for too many categories (should be horizontal bar).
- **Forgetting to set random_state** — stochastic plots (t-SNE, UMAP, K-Means) produce different results each run without a seed.
- **Over-encoding with too many hue/size/shape mappings** — one or two visual variables (color + shape) is the maximum readable encoding; adding more causes confusion.
- **Plotting raw correlated features in pairplot without scaling** — different scales make the diagonal distributions misleading; standardize or note the scale difference.
- **Using 3D plots for actual analysis** — 3D charts are hard to read and often misleading; prefer 2D with color/size encoding instead.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Goal</th><th>Best Tool</th><th>One-Liner</th></tr>
<tr><td>Quick EDA distribution</td><td>Seaborn histplot</td><td>sns.histplot(df['col'], kde=True)</td></tr>
<tr><td>Group comparison</td><td>Seaborn boxplot</td><td>sns.boxplot(data=df, x='cat', y='num')</td></tr>
<tr><td>Feature correlations</td><td>Seaborn heatmap</td><td>sns.heatmap(df.corr(), annot=True)</td></tr>
<tr><td>All feature pairs</td><td>Seaborn pairplot</td><td>sns.pairplot(df, hue='target')</td></tr>
<tr><td>Publication figure</td><td>Matplotlib explicit API</td><td>fig, ax = plt.subplots()</td></tr>
<tr><td>Classifier performance</td><td>sns.heatmap(confusion_matrix)</td><td>cm = confusion_matrix(y_true, y_pred)</td></tr>
<tr><td>Threshold trade-off</td><td>Matplotlib ROC curve</td><td>ax.plot(fpr, tpr)</td></tr>
<tr><td>Model training progress</td><td>Matplotlib line plot</td><td>ax.plot(epochs, train_loss)</td></tr>
<tr><td>Interactive web chart</td><td>Plotly Express</td><td>px.scatter(df, x=, y=, color=)</td></tr>
<tr><td>Optimal K clusters</td><td>Matplotlib elbow curve</td><td>ax.plot(range(1,11), inertias)</td></tr>
</table>

---

## 📋 Completion Checklist

- Can use `fig, ax = plt.subplots()` to create single and multi-panel figures
- Can create line, scatter, bar, and histogram plots with full labels and styling
- Can produce correlation heatmap with `sns.heatmap(df.corr(), annot=True)`
- Can create pairplot with `sns.pairplot(df, hue='target')`
- Can plot confusion matrix heatmap using sklearn's `confusion_matrix`
- Can produce and interpret an ROC curve with AUC score
- Can plot feature importances from a trained Random Forest
- Can create an interactive Plotly chart with `px.scatter` / `px.box`
