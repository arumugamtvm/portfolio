---
title: Week 0 — Ground Work
description: Set up your tools, mindset, and professional presence before writing any AI code. A ready environment means you never lose momentum on setup problems later.
---

> 🎯 TL;DR — Week 0 is your launchpad: configure your environment, mindset, and professional presence BEFORE writing a single line of AI code so you never waste momentum on setup friction later.

---

## 🧠 Mental Model

Think of Week 0 like a chef's *mise en place* — every tool sharpened, every ingredient in its place — because once the cooking (coding) starts, stopping to find your knife kills the flow.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Why It Matters</th></tr>
<tr><td>Growth Mindset</td><td>Treating bugs and confusion as data, not failure</td><td>AI has a steep curve — quitters leave, learners stay</td></tr>
<tr><td>Spaced Repetition</td><td>Reviewing material at increasing intervals</td><td>Moves facts from working memory to long-term recall</td></tr>
<tr><td>Public Learning</td><td>Posting your progress on LinkedIn weekly</td><td>Builds portfolio AND accountability simultaneously</td></tr>
<tr><td>Conda Environment</td><td>Isolated Python environment per project</td><td>Prevents library version conflicts across projects</td></tr>
<tr><td>Jupyter Notebook</td><td>Browser-based interactive Python REPL</td><td>Industry standard for data exploration and prototyping</td></tr>
<tr><td>Git Portfolio</td><td>Version-controlled project history on GitHub</td><td>Recruiters judge AI engineers by their GitHub, not resumes</td></tr>
<tr><td>Cornell Note Method</td><td>Cues / Notes / Summary layout per lecture</td><td>Forces active recall, not passive re-reading</td></tr>
</table>

---

## 🔢 Key Steps / Process

1. Install Anaconda (or miniconda) — gives Python, Jupyter, and 200+ scientific packages in one shot
2. Create a dedicated conda environment for this course (`conda create -n hopeai python=3.11`)
3. Install all AI libraries in one command (see cheatsheet below)
4. Configure VS Code with Python + Jupyter extensions
5. Set up Git globally and create your AI portfolio repo on GitHub
6. Update your LinkedIn profile with AI keywords before Week 1 (recruiters search now, not later)
7. Establish your daily study schedule — block calendar time like a meeting
8. Set up your note-taking system (Cornell method or Notion pages like this one)
9. Post your "Starting my AI journey" LinkedIn update to create public accountability

---

## 💻 Code Cheatsheet

```python
# ================================================================
# WEEK 0 — COMPLETE SETUP CHEATSHEET
# ================================================================

# ── 1. VERIFY INSTALLATION ──────────────────────────────────────
import sys
import numpy as np
import pandas as pd
import sklearn
import matplotlib

print(f"Python  : {sys.version}")
print(f"NumPy   : {np.__version__}")
print(f"Pandas  : {pd.__version__}")
print(f"Sklearn : {sklearn.__version__}")
print(f"Matplotlib: {matplotlib.__version__}")
# Expected: Python 3.10+, NumPy 1.24+, Pandas 2.0+

# ── 2. JUPYTER MAGIC COMMANDS ───────────────────────────────────
# Run these inside a Jupyter cell:

# %time model.fit(X_train, y_train)   → time a single statement
# %timeit np.dot(A, B)                → benchmark (runs many times)
# %matplotlib inline                  → render plots in notebook
# %who                                → list all variables in scope
# %history                            → show command history
# %%time                              → time the ENTIRE cell
# !pip install xgboost                → run shell commands from notebook
# ?pd.DataFrame                       → show docstring for any object

# ── 3. JUPYTER KEYBOARD SHORTCUTS ───────────────────────────────
# (Command mode = press Esc first)
# Shift+Enter  → Run cell, move to next
# Ctrl+Enter   → Run cell, stay in cell
# A            → Insert cell Above
# B            → Insert cell Below
# DD           → Delete cell (press D twice)
# M            → Convert cell to Markdown
# Y            → Convert cell to Code
# Ctrl+/       → Toggle comment on selected lines
# Tab          → Autocomplete
# Shift+Tab    → Show function signature / docstring

# ── 4. CONDA ENVIRONMENT SETUP ──────────────────────────────────
# (Run in terminal, not Python)
"""
# Create isolated environment
conda create -n hopeai python=3.11 -y
conda activate hopeai

# Install all AI/ML libraries at once
pip install numpy pandas matplotlib seaborn scikit-learn \
            xgboost lightgbm scipy \
            jupyter jupyterlab \
            tensorflow torch torchvision \
            transformers \
            fastapi uvicorn \
            joblib

# Verify core installs
python -c "import numpy, pandas, sklearn, matplotlib; print('All systems go!')"

# Save environment (so teammates can reproduce it)
conda env export > environment.yml

# Recreate from file on another machine
conda env create -f environment.yml
"""

# ── 5. GIT PORTFOLIO SETUP ──────────────────────────────────────
"""
# One-time global config
git config --global user.name "Your Name"
git config --global user.email "you@email.com"

# Create AI portfolio repo
mkdir hope-ai-portfolio && cd hope-ai-portfolio
git init
echo "# Hope AI — ML & DS Portfolio" > README.md
git add . && git commit -m "Initial commit"

# Connect to GitHub (create repo on github.com first)
git remote add origin https://github.com/USERNAME/hope-ai-portfolio.git
git branch -M main
git push -u origin main

# Daily workflow
git add .
git commit -m "Week 2: NumPy array operations and broadcasting"
git push

# .gitignore for AI projects
cat > .gitignore << EOF
*.pkl
*.h5
*.pt
.env
__pycache__/
.ipynb_checkpoints/
venv/
*.csv
*.xlsx
data/
EOF
"""

# ── 6. PROJECT FOLDER STRUCTURE ─────────────────────────────────
"""
hope-ai-portfolio/
├── week01_foundations/
│   └── ai_basics.ipynb
├── week02_python/
│   └── numpy_pandas.ipynb
├── week03_regression/
│   ├── linear_regression.ipynb
│   └── models/
│       ├── model.pkl
│       └── scaler.pkl
├── datasets/
├── environment.yml
└── README.md
"""

# ── 7. NORMALIZE + STANDARDIZE (preview of Week 3 concepts) ─────
import numpy as np

def min_max_normalize(arr):
    """Scale values to [0, 1] range"""
    return (arr - arr.min()) / (arr.max() - arr.min())

def z_score_standardize(arr):
    """Scale to mean=0, std=1"""
    return (arr - arr.mean()) / arr.std()

scores = np.array([45, 67, 89, 23, 91, 55, 78])
print("Original  :", scores)
print("Normalized:", np.round(min_max_normalize(scores), 3))
print("Std-scored:", np.round(z_score_standardize(scores), 3))
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>What It Does</th><th>Typical Values</th></tr>
<tr><td><code>python=3.11</code></td><td>Python version in conda env</td><td>3.10 or 3.11 (stable for AI libs)</td></tr>
<tr><td><code>test_size=0.2</code></td><td>Fraction of data held out for testing</td><td>0.2 (80/20 split)</td></tr>
<tr><td><code>random_state=42</code></td><td>Seed for reproducibility</td><td>Any integer; 42 is convention</td></tr>
<tr><td><code>n_jobs=-1</code></td><td>Use all CPU cores for parallel work</td><td>-1 = all cores</td></tr>
<tr><td>Jupyter kernel</td><td>Python environment a notebook runs in</td><td>Select your <code>hopeai</code> conda env</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1:** Why use conda instead of plain pip/venv?

**A:** Conda manages both Python versions AND non-Python C/C++ dependencies (like those needed by TensorFlow and SciPy), making environment reproduction across machines far more reliable.

**Q2:** What is the difference between `fit_transform` and `transform`?

**A:** `fit_transform` computes statistics (mean, std, min, max) from the data AND applies the transformation — use on training data only. `transform` applies previously computed statistics — use on test/new data to prevent data leakage.

**Q3:** Why is `random_state=42` everywhere in ML code?

**A:** It seeds the random number generator so experiments are reproducible. Any fixed integer works; 42 is a community convention.

**Q4:** What is the AI Engineer role vs Data Scientist vs ML Engineer?

**A:** Data Scientist focuses on analysis and insights; ML Engineer focuses on training and optimizing models; AI Engineer focuses on integrating models into production systems and building AI-powered products (often using APIs like OpenAI/Anthropic).

**Q5:** Why post on LinkedIn during the learning phase?

**A:** Public documentation builds a portfolio of timestamps showing consistent learning, signals seriousness to recruiters, and forces you to explain concepts clearly — which deepens your own understanding (the Feynman Technique).

**Q6:** What does `git commit -m` mean and why should every project have commits?

**A:** Each commit is a snapshot of your project at a point in time. Recruiters and hiring managers read commit histories to assess how you think, how incrementally you work, and how seriously you treat your projects.

**Q7:** What is Jupyter's `%timeit` used for in AI?

**A:** Benchmarking code performance — especially important when choosing between NumPy operations, comparing vectorized vs loop-based code, or profiling model training speed.

---

## ⚠️ Common Mistakes

- Installing packages globally instead of in a project-specific environment — causes version conflicts that are hell to debug weeks later
- Skipping the LinkedIn update until "the project is done" — recruiters search keywords continuously; being invisible costs opportunities
- Copy-pasting code from lectures instead of typing it — muscle memory and debugging intuition only come from writing code yourself
- Not committing to Git regularly — a single push at the end of the week loses the incremental story of your learning
- Using `fit_transform` on test data — this leaks information from test set into the scaler and inflates your evaluation metrics
- Not using a virtual environment — system Python packages conflict with project requirements as the course progresses
- Watching lecture videos without a Jupyter notebook open — passive watching retains ~10% vs active typing retaining ~70%

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Use This</th></tr>
<tr><td>Starting a new AI project</td><td><code>conda create -n projectname python=3.11</code></td></tr>
<tr><td>Installing many packages at once</td><td><code>pip install numpy pandas scikit-learn ...</code></td></tr>
<tr><td>Sharing environment with teammate</td><td><code>conda env export &gt; environment.yml</code></td></tr>
<tr><td>Running Python interactively</td><td>Jupyter Lab (<code>jupyter lab</code>)</td></tr>
<tr><td>Writing production scripts</td><td>VS Code with Python extension</td></tr>
<tr><td>Saving model progress</td><td><code>git add . &amp;&amp; git commit -m "..."</code></td></tr>
<tr><td>Timing a slow cell</td><td><code>%%time</code> at top of cell</td></tr>
<tr><td>Seeing what variables exist</td><td><code>%who</code> or <code>%whos</code> for details</td></tr>
</table>

---

## 📋 Completion Checklist

- Anaconda/Miniconda installed and `conda` command works in terminal
- `hopeai` conda environment created and activated
- All core libraries installed: numpy, pandas, sklearn, matplotlib, jupyter
- Jupyter Lab opens and runs a Python cell successfully
- VS Code installed with Python and Jupyter extensions
- Git configured globally with name and email
- GitHub portfolio repo created and first commit pushed
- LinkedIn headline updated with AI/ML/Python keywords
- Daily study schedule blocked in calendar
- First LinkedIn post published: "Starting my AI engineering journey"
