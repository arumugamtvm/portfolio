---
title: Week 10.1 — MySQL for Data Science & AI
description: SQL is a must-have skill for data scientists. Master filtering, joins, subqueries, CTEs, and window functions, and connect MySQL to Python with pandas and SQLAlchemy.
---

> 🎯 **TL;DR** — SQL is non-negotiable for data scientists. Master SELECT/WHERE/GROUP BY/HAVING, all JOIN types (INNER/LEFT/RIGHT/FULL/SELF), subqueries, CTEs (WITH), and Window Functions (ROW_NUMBER/RANK/LAG/LEAD/PARTITION BY). Connect MySQL to Python via `mysql-connector`, `pandas.read_sql`, or `SQLAlchemy`. The top 20 interview questions all test JOINs, window functions, CTEs, and aggregations.

## 🧠 Mental Model

Think of a SQL query as an **assembly line that processes a table in a fixed order**:

1. **FROM / JOIN** — pick up the raw materials (rows from tables)
2. **WHERE** — quality control: discard rows that don't meet the spec
3. **GROUP BY** — sort materials into bins
4. **HAVING** — quality control on the bins themselves
5. **SELECT** — stamp and label the final product
6. **ORDER BY** — arrange on the conveyor belt
7. **LIMIT** — only ship the first N items

Window Functions run **after SELECT** but before ORDER BY, so they can see the full dataset while computing per-row analytics. CTEs (WITH) are like **named staging areas** that make complex queries readable by breaking them into named steps.

---

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>Syntax</th><th>Purpose</th></tr>
<tr><td>Filter rows</td><td><code>WHERE col = val</code></td><td>Before aggregation</td></tr>
<tr><td>Filter groups</td><td><code>HAVING COUNT(*) > 5</code></td><td>After GROUP BY</td></tr>
<tr><td>Deduplicate</td><td><code>SELECT DISTINCT col</code></td><td>Unique values only</td></tr>
<tr><td>Alias</td><td><code>col AS alias</code></td><td>Rename output column</td></tr>
<tr><td>All JOIN types</td><td><code>INNER / LEFT / RIGHT / CROSS / SELF</code></td><td>Combine tables</td></tr>
<tr><td>Subquery</td><td><code>WHERE col = (SELECT ...)</code></td><td>Nested query</td></tr>
<tr><td>CTE</td><td><code>WITH cte AS (SELECT ...)</code></td><td>Named subquery, reusable</td></tr>
<tr><td>Row numbering</td><td><code>ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)</code></td><td>Sequential rank, no ties</td></tr>
<tr><td>Rank with gaps</td><td><code>RANK() OVER (ORDER BY col DESC)</code></td><td>Ties get same rank, gap after</td></tr>
<tr><td>Rank no gaps</td><td><code>DENSE_RANK() OVER (ORDER BY col DESC)</code></td><td>Ties same rank, no gap</td></tr>
<tr><td>Previous row</td><td><code>LAG(col, n) OVER (ORDER BY ...)</code></td><td>Access n rows back</td></tr>
<tr><td>Next row</td><td><code>LEAD(col, n) OVER (ORDER BY ...)</code></td><td>Access n rows ahead</td></tr>
<tr><td>Running total</td><td><code>SUM(col) OVER (ORDER BY ... ROWS UNBOUNDED PRECEDING)</code></td><td>Cumulative sum</td></tr>
<tr><td>Rolling avg</td><td><code>AVG(col) OVER (ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)</code></td><td>Moving average</td></tr>
<tr><td>Conditional</td><td><code>CASE WHEN cond THEN val ELSE other END</code></td><td>If-else in SQL</td></tr>
<tr><td>View</td><td><code>CREATE VIEW v AS SELECT ...</code></td><td>Saved query, reusable</td></tr>
<tr><td>Index</td><td><code>CREATE INDEX idx ON t(col)</code></td><td>Speed up lookups</td></tr>
</table>

---

## 🔢 Key Steps / Process

**Writing a complex SQL query:**

1. Identify the tables and how they relate (JOINs)
2. Determine what to filter (WHERE conditions)
3. Decide if aggregation is needed (GROUP BY + aggregate functions)
4. Apply post-aggregation filters (HAVING)
5. Select only needed columns (avoid SELECT *)
6. Use CTEs for readability when >2 nested levels
7. Add Window Functions for ranking/running totals without collapsing rows
8. EXPLAIN the query to check index usage
9. Add LIMIT for exploration / pagination

**Connecting Python to MySQL:**

1. Install: `pip install mysql-connector-python pandas sqlalchemy pymysql`
2. Create connection with `mysql.connector.connect(...)` or SQLAlchemy engine
3. Use parameterized queries (`%s` placeholders) — never f-strings with user input
4. Use `pd.read_sql(query, conn)` to load results directly into DataFrame
5. Always `conn.commit()` after DML (INSERT/UPDATE/DELETE)
6. Always close cursor and connection (or use context manager)

---

## 💻 Code Cheatsheet

```sql
-- ============================================================
-- MYSQL COMPLETE CHEATSHEET FOR DATA SCIENCE & AI
-- ============================================================

-- ============================================================
-- 1. DDL — Data Definition Language
-- ============================================================

CREATE TABLE employees (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    department  VARCHAR(50),
    salary      DECIMAL(10, 2),
    manager_id  INT,
    hire_date   DATE,
    is_active   BOOLEAN             DEFAULT TRUE,
    created_at  DATETIME            DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

ALTER TABLE employees ADD COLUMN email VARCHAR(150);
ALTER TABLE employees MODIFY COLUMN salary DECIMAL(12, 2);
ALTER TABLE employees RENAME COLUMN notes TO bio;
DROP TABLE IF EXISTS employees;

-- ============================================================
-- 2. DML — Data Manipulation Language
-- ============================================================

INSERT INTO employees (name, department, salary, hire_date)
VALUES ('Alice Johnson', 'Engineering', 95000.00, '2022-03-15');

INSERT INTO employees (name, department, salary, hire_date) VALUES
    ('Bob Smith',   'Marketing',    72000.00, '2021-07-01'),
    ('Carol White', 'Engineering', 105000.00, '2020-01-20'),
    ('David Brown', 'Sales',        68000.00, '2023-05-10'),
    ('Eve Davis',   'AI Research', 115000.00, '2019-11-30');

UPDATE employees SET salary = salary * 1.10 WHERE department = 'Engineering';
DELETE FROM employees WHERE is_active = FALSE;

-- ============================================================
-- 3. SELECT & FILTERING
-- ============================================================

-- Basic SELECT
SELECT name, department, salary
FROM   employees
WHERE  salary > 80000
ORDER  BY salary DESC
LIMIT  10;

-- WHERE with AND, OR, NOT, BETWEEN, IN, LIKE, IS NULL
SELECT * FROM employees
WHERE  department IN ('Engineering', 'AI Research')
  AND  salary BETWEEN 90000 AND 130000
  AND  name LIKE 'A%'            -- starts with A
  AND  manager_id IS NOT NULL;

-- Aliases and computed columns
SELECT
    name                                    AS employee_name,
    salary * 12                             AS annual_salary,
    DATEDIFF(NOW(), hire_date)              AS days_employed,
    ROUND(salary / 1000, 1)                 AS salary_k
FROM employees AS e
WHERE e.salary > 80000;

-- DISTINCT
SELECT DISTINCT department FROM employees;

-- ============================================================
-- 4. AGGREGATION — GROUP BY & HAVING
-- ============================================================

-- Aggregate functions
SELECT
    COUNT(*)                AS total_employees,
    COUNT(DISTINCT department) AS unique_depts,
    SUM(salary)             AS total_payroll,
    AVG(salary)             AS avg_salary,
    MIN(salary)             AS min_salary,
    MAX(salary)             AS max_salary
FROM employees
WHERE is_active = TRUE;

-- GROUP BY
SELECT
    department,
    COUNT(*)                AS headcount,
    ROUND(AVG(salary), 2)   AS avg_salary,
    SUM(salary)             AS dept_payroll
FROM   employees
GROUP  BY department
ORDER  BY avg_salary DESC;

-- HAVING — filter AFTER aggregation (WHERE filters before)
SELECT
    department,
    COUNT(*) AS headcount,
    AVG(salary) AS avg_salary
FROM   employees
WHERE  is_active = TRUE          -- filter rows first
GROUP  BY department
HAVING COUNT(*) >= 2             -- then filter groups
   AND AVG(salary) > 80000
ORDER  BY avg_salary DESC;

-- CASE WHEN in aggregation (pivot-style)
SELECT
    department,
    SUM(CASE WHEN salary >= 100000 THEN 1 ELSE 0 END) AS senior_count,
    SUM(CASE WHEN salary <  100000 THEN 1 ELSE 0 END) AS junior_count,
    ROUND(AVG(salary), 2)                              AS avg_salary
FROM employees
GROUP BY department;

-- ============================================================
-- 5. ALL JOIN TYPES
-- ============================================================

-- Setup: assume departments(id, department_name, budget)
-- INNER JOIN — only matching rows in BOTH tables
SELECT e.name, d.department_name, e.salary
FROM   employees e
INNER  JOIN departments d ON e.department = d.department_name;

-- LEFT JOIN — ALL rows from left + matching from right (NULL if no match)
SELECT e.name, d.department_name, d.budget
FROM   employees e
LEFT   JOIN departments d ON e.department = d.department_name;
-- Employees without a matching department appear with NULL department_name

-- RIGHT JOIN — ALL rows from right + matching from left
SELECT e.name, d.department_name
FROM   employees e
RIGHT  JOIN departments d ON e.department = d.department_name;
-- Departments with no employees appear with NULL name

-- FULL OUTER JOIN — MySQL workaround with UNION
SELECT e.name, d.department_name
FROM   employees e
LEFT   JOIN departments d ON e.department = d.department_name
UNION
SELECT e.name, d.department_name
FROM   employees e
RIGHT  JOIN departments d ON e.department = d.department_name;

-- SELF JOIN — employee and their manager from same table
SELECT
    e.name       AS employee,
    e.salary     AS emp_salary,
    m.name       AS manager,
    m.salary     AS mgr_salary
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- CROSS JOIN — Cartesian product (all combinations)
SELECT p.product_name, c.color_name
FROM   products p
CROSS  JOIN colors c;
-- 10 products × 5 colors = 50 rows

-- ============================================================
-- 6. SUBQUERIES
-- ============================================================

-- Non-correlated: runs once, independent of outer query
SELECT name, salary
FROM   employees
WHERE  salary > (SELECT AVG(salary) FROM employees);

-- IN subquery
SELECT name FROM employees
WHERE  department IN (
    SELECT department_name FROM departments WHERE budget > 500000
);

-- Correlated: runs once per outer row
SELECT name, salary, department
FROM   employees e1
WHERE  salary = (
    SELECT MAX(salary)
    FROM   employees e2
    WHERE  e2.department = e1.department    -- references outer query
);
-- Returns the top earner in each department

-- EXISTS — often faster than IN for large tables
SELECT name FROM employees e
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.manager_id = e.id
);

-- ============================================================
-- 7. CTEs — Common Table Expressions (WITH)
-- ============================================================

-- Single CTE — readable alternative to subquery
WITH high_earners AS (
    SELECT name, department, salary
    FROM   employees
    WHERE  salary > 90000
)
SELECT department, COUNT(*) AS count, AVG(salary) AS avg_sal
FROM   high_earners
GROUP  BY department;

-- Multiple chained CTEs
WITH
dept_stats AS (
    SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS headcount
    FROM   employees
    GROUP  BY department
),
top_depts AS (
    SELECT department
    FROM   dept_stats
    WHERE  avg_sal > 85000 AND headcount >= 2
),
ranked_employees AS (
    SELECT e.name, e.salary, e.department,
           RANK() OVER (PARTITION BY e.department ORDER BY e.salary DESC) AS dept_rank
    FROM   employees e
    INNER  JOIN top_depts t ON e.department = t.department
)
SELECT * FROM ranked_employees WHERE dept_rank <= 3
ORDER  BY department, dept_rank;

-- Recursive CTE — org chart traversal
WITH RECURSIVE org_chart AS (
    -- Anchor: top-level managers (no manager)
    SELECT id, name, manager_id, 0 AS depth
    FROM   employees
    WHERE  manager_id IS NULL

    UNION ALL

    -- Recursive: employees reporting to already-found managers
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM   employees e
    INNER  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT depth, name FROM org_chart ORDER BY depth, name;

-- ============================================================
-- 8. WINDOW FUNCTIONS
-- ============================================================

-- ROW_NUMBER: unique sequential rank per partition (no ties)
SELECT name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num
FROM employees;

-- RANK: ties get same rank, then gap  (1,1,3,4...)
-- DENSE_RANK: ties same rank, no gap  (1,1,2,3...)
SELECT name, salary,
    RANK()       OVER (ORDER BY salary DESC) AS salary_rank,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank
FROM employees;

-- LAG / LEAD — access adjacent rows
SELECT
    order_date,
    revenue,
    LAG(revenue, 1)  OVER (ORDER BY order_date) AS prev_revenue,
    LEAD(revenue, 1) OVER (ORDER BY order_date) AS next_revenue,
    revenue - LAG(revenue, 1) OVER (ORDER BY order_date) AS mom_change
FROM daily_revenue;

-- Running total
SELECT order_date, revenue,
    SUM(revenue) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS running_total
FROM daily_revenue;

-- 7-day rolling average
SELECT order_date, revenue,
    ROUND(
        AVG(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
        2
    ) AS rolling_7day_avg
FROM daily_revenue;

-- Partition by dept: each row sees dept-level aggregates
SELECT name, department, salary,
    AVG(salary)  OVER (PARTITION BY department) AS dept_avg,
    MAX(salary)  OVER (PARTITION BY department) AS dept_max,
    salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_avg,
    ROUND(salary / SUM(salary) OVER (PARTITION BY department) * 100, 1) AS pct_of_dept
FROM employees;

-- Percent of total (across all depts)
SELECT department, SUM(salary) AS dept_total,
    ROUND(SUM(salary) / SUM(SUM(salary)) OVER () * 100, 2) AS pct_of_total
FROM employees
GROUP BY department;

-- ============================================================
-- 9. VIEWS & INDEXES
-- ============================================================

-- Create a reusable view
CREATE VIEW active_engineers AS
SELECT id, name, salary, hire_date
FROM   employees
WHERE  department = 'Engineering' AND is_active = TRUE;

SELECT * FROM active_engineers WHERE salary > 90000;
DROP VIEW IF EXISTS active_engineers;

-- Indexes — dramatically speed up WHERE, JOIN, ORDER BY
CREATE INDEX        idx_department     ON employees(department);
CREATE INDEX        idx_dept_salary    ON employees(department, salary);  -- composite
CREATE UNIQUE INDEX idx_email          ON employees(email);

-- Query execution plan
EXPLAIN SELECT * FROM employees WHERE department = 'Engineering';
-- Check: "type" should be "ref" or "range" (not "ALL" = full scan)
-- Check: "key" should show your index name

EXPLAIN ANALYZE SELECT * FROM employees WHERE salary > 80000;   -- MySQL 8.0+

-- ============================================================
-- 10. QUERY EXECUTION ORDER (mental model)
-- ============================================================
-- 1. FROM / JOIN   — assemble rows
-- 2. WHERE         — filter rows
-- 3. GROUP BY      — group rows
-- 4. HAVING        — filter groups
-- 5. SELECT        — compute output columns
-- 6. WINDOW FUNCS  — over the SELECT result set
-- 7. ORDER BY      — sort
-- 8. LIMIT/OFFSET  — paginate
```

```python
# ============================================================
# PYTHON + MYSQL — Complete Runnable Cheatsheet
# pip install mysql-connector-python pandas sqlalchemy pymysql
# ============================================================

import mysql.connector
import pandas as pd
from sqlalchemy import create_engine, text

# ----------------------------------------------------------
# 1. mysql-connector-python — basic connection
# ----------------------------------------------------------
conn = mysql.connector.connect(
    host     = "localhost",
    port     = 3306,
    user     = "root",
    password = "your_password",
    database = "my_database"
)
cursor = conn.cursor()

# Simple SELECT
cursor.execute("SELECT name, salary FROM employees WHERE department = 'Engineering'")
rows = cursor.fetchall()        # list of tuples
for row in rows:
    print(row)                  # ('Alice Johnson', 95000.0)

# cursor.fetchone()             # single tuple
# cursor.fetchmany(10)          # next 10 rows

cursor.close()
conn.close()

# ----------------------------------------------------------
# 2. PARAMETERIZED QUERIES — prevent SQL injection
# ----------------------------------------------------------
conn   = mysql.connector.connect(host="localhost", user="root",
                                  password="your_password", database="my_database")
cursor = conn.cursor()

# NEVER: f"SELECT * FROM employees WHERE dept = '{user_input}'"  ← SQL INJECTION
# ALWAYS: use %s placeholders
dept       = "Engineering"
min_salary = 90000

cursor.execute(
    "SELECT name, salary FROM employees WHERE department = %s AND salary > %s",
    (dept, min_salary)          # tuple of values — connector escapes them safely
)
print(cursor.fetchall())

# INSERT with parameters
cursor.execute(
    "INSERT INTO employees (name, department, salary, hire_date) VALUES (%s, %s, %s, %s)",
    ("Frank Lee", "AI Research", 120000.00, "2024-06-01")
)
conn.commit()                   # REQUIRED: commit DML changes to DB

# UPDATE / DELETE
cursor.execute("UPDATE employees SET salary = %s WHERE name = %s", (125000, "Frank Lee"))
conn.commit()

cursor.execute("DELETE FROM employees WHERE name = %s", ("Frank Lee",))
conn.commit()

cursor.close()
conn.close()

# ----------------------------------------------------------
# 3. pandas read_sql — query directly into DataFrame
# ----------------------------------------------------------
conn = mysql.connector.connect(host="localhost", user="root",
                                password="your_password", database="my_database")

query = """
    SELECT
        department,
        AVG(salary)     AS avg_salary,
        COUNT(*)        AS headcount,
        MAX(salary)     AS max_salary
    FROM   employees
    WHERE  is_active = TRUE
    GROUP  BY department
    ORDER  BY avg_salary DESC
"""
df = pd.read_sql(query, conn)
print(df)
print(df.dtypes)

# Further analysis in pandas
df["salary_rank"] = df["avg_salary"].rank(ascending=False).astype(int)
df["pct_of_total"] = df["avg_salary"] / df["avg_salary"].sum() * 100

conn.close()

# ----------------------------------------------------------
# 4. SQLAlchemy — ORM-style connection (recommended for production)
# ----------------------------------------------------------
# dialect+driver://user:password@host:port/database
engine = create_engine(
    "mysql+pymysql://root:your_password@localhost:3306/my_database",
    echo  = False,              # set True to log SQL
    pool_size = 5,              # connection pool size
    pool_recycle = 3600         # recycle connections after 1 hour
)

# Read with pandas (preferred)
df = pd.read_sql("SELECT * FROM employees LIMIT 100", engine)

# Execute raw SQL with named parameters
with engine.connect() as connection:
    result = connection.execute(
        text("SELECT name, salary FROM employees WHERE salary > :min_sal AND department = :dept"),
        {"min_sal": 90000, "dept": "Engineering"}
    )
    for row in result:
        print(dict(row))

# Write DataFrame to MySQL
df_new = pd.DataFrame({
    "name":       ["Grace Kim",   "Henry Park"],
    "department": ["Data Science","AI Research"],
    "salary":     [98000.0,       112000.0],
    "hire_date":  ["2024-01-15",  "2024-02-01"]
})
df_new.to_sql("employees", engine,
              if_exists = "append",   # "replace" to overwrite table
              index     = False)      # don't write DataFrame index as column

# ----------------------------------------------------------
# 5. CONTEXT MANAGER — auto-close connection
# ----------------------------------------------------------
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    conn = mysql.connector.connect(host="localhost", user="root",
                                    password="your_password", database="my_database")
    try:
        yield conn
    finally:
        conn.close()

with get_db_connection() as conn:
    df = pd.read_sql("SELECT * FROM employees", conn)
    print(df.head())
```

---

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Context</th><th>Description</th><th>Example</th></tr>
<tr><td><code>PARTITION BY</code></td><td>Window Functions</td><td>Reset window calculation per group</td><td><code>PARTITION BY department</code></td></tr>
<tr><td><code>ORDER BY</code> (in OVER)</td><td>Window Functions</td><td>Defines ordering within window</td><td><code>ORDER BY salary DESC</code></td></tr>
<tr><td><code>ROWS BETWEEN</code></td><td>Window Functions</td><td>Frame bounds for rolling calculations</td><td><code>ROWS BETWEEN 6 PRECEDING AND CURRENT ROW</code></td></tr>
<tr><td><code>ROWS UNBOUNDED PRECEDING</code></td><td>Window Functions</td><td>From start of partition to current row</td><td>Running total</td></tr>
<tr><td><code>if_exists</code></td><td><code>df.to_sql</code></td><td>Behavior when table exists: <code>append</code>/<code>replace</code>/<code>fail</code></td><td><code>"append"</code></td></tr>
<tr><td><code>pool_size</code></td><td>SQLAlchemy</td><td>Number of connections in connection pool</td><td><code>5</code></td></tr>
<tr><td><code>echo</code></td><td>SQLAlchemy</td><td>Log all SQL queries (debugging)</td><td><code>False</code> in production</td></tr>
<tr><td><code>force=True</code></td><td>Flask <code>request.get_json</code></td><td>Parse body as JSON even without Content-Type header</td><td>—</td></tr>
</table>

---

## 🎤 Top Interview Q&A

**Q1: What is the difference between WHERE and HAVING?**

WHERE filters individual rows **before** GROUP BY aggregation — it operates on raw column values. HAVING filters groups **after** GROUP BY — it can use aggregate functions like `COUNT(*) > 5` or `AVG(salary) > 80000`. You cannot use aggregate functions in WHERE. Use WHERE to reduce the dataset first (better performance), then HAVING to filter the grouped results.

**Q2: What is the difference between RANK(), DENSE_RANK(), and ROW_NUMBER()?**

All three assign rank numbers within a window partition. `ROW_NUMBER()`: always unique, no ties (1,2,3,4). `RANK()`: ties get the same rank, then gaps (1,1,3,4). `DENSE_RANK()`: ties get the same rank, no gaps (1,1,2,3). Use `DENSE_RANK()` when you want "2nd highest salary" without skipping numbers due to ties.

**Q3: What is a CTE and when should you use it instead of a subquery?**

A CTE (Common Table Expression) defined with `WITH name AS (...)` creates a named, reusable temporary result set for the duration of a query. Use CTEs when: (1) you need to reference the same subquery multiple times, (2) the query has multiple levels of nesting that hurt readability, (3) you need recursion (Recursive CTEs). CTEs are not materialized by default in MySQL — they're equivalent to inline views in terms of performance.

**Q4: Explain the difference between INNER JOIN and LEFT JOIN.**

INNER JOIN returns only rows where the join condition is met in BOTH tables — unmatched rows are discarded. LEFT JOIN returns ALL rows from the left table plus matching rows from the right — unmatched right columns are NULL. Use LEFT JOIN to find rows in A that have no match in B: `WHERE b.id IS NULL`.

**Q5: How do you find the Nth highest salary?**

Use `DENSE_RANK()`: `SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk = N LIMIT 1;` — handles ties correctly. Alternative with subquery: `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` — this only works for N=2.

**Q6: What are Window Functions and how do they differ from GROUP BY?**

Window Functions compute aggregate values across a set of rows related to the current row (the "window") WITHOUT collapsing rows — every input row produces an output row. GROUP BY collapses all rows in a group into one output row. Example: `AVG(salary) OVER (PARTITION BY department)` adds each employee's department average as a column alongside their individual row — GROUP BY would return just one row per department.

**Q7: What is a SQL injection and how do you prevent it in Python?**

SQL injection is when user input contains SQL syntax that modifies the query structure — e.g., input `' OR '1'='1` appended to a query can return all rows or drop tables. Prevent it by always using parameterized queries: `cursor.execute("SELECT * FROM users WHERE name = %s", (user_input,))`. The connector escapes the input, treating it as data not SQL syntax. Never use f-strings or string concatenation with user input.

**Q8: What is the execution order of a SQL query?**

FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW FUNCTIONS → ORDER BY → LIMIT. This explains why you can't use a SELECT alias in WHERE (alias doesn't exist yet at WHERE evaluation time), but you can use it in ORDER BY (which runs after SELECT).

---

## ⚠️ Common Mistakes

- **Using WHERE instead of HAVING for aggregate filters** — `WHERE COUNT(*) > 5` raises an error; aggregate conditions must go in HAVING after GROUP BY.
- **SELECT * in production queries** — returns all columns including unused ones, wastes network/memory, breaks when schema changes; always name the columns you need.
- **Forgetting `conn.commit()` after DML** — INSERT/UPDATE/DELETE changes are silently discarded without commit; autocommit is OFF by default in mysql-connector.
- **Using functions on indexed columns in WHERE** — `WHERE YEAR(hire_date) = 2023` cannot use an index on `hire_date`; rewrite as `WHERE hire_date BETWEEN '2023-01-01' AND '2023-12-31'`.
- **String concatenation for parameterized queries** — `f"...WHERE name = '{name}'"` is a SQL injection vulnerability; always use `%s` placeholders with the connector.
- **Confusing RANK vs DENSE_RANK** — using RANK() for "find the 2nd highest" can return no rows if there are ties at rank 1 that create a gap to rank 3; use DENSE_RANK() for this pattern.
- **Not adding LIMIT when exploring large tables** — a bare `SELECT * FROM large_table` on a 100M-row table will time out or crash the notebook; always add `LIMIT 100` while exploring.

---

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Scenario</th><th>SQL Tool</th><th>Example</th></tr>
<tr><td>Filter individual rows</td><td>WHERE</td><td><code>WHERE salary > 80000</code></td></tr>
<tr><td>Filter after aggregation</td><td>HAVING</td><td><code>HAVING COUNT(*) > 5</code></td></tr>
<tr><td>All rows from left, optional right</td><td>LEFT JOIN</td><td>Find unmatched records</td></tr>
<tr><td>Only rows with matches in both</td><td>INNER JOIN</td><td>Standard join</td></tr>
<tr><td>Rank without collapsing rows</td><td>Window Function</td><td><code>RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code></td></tr>
<tr><td>Collapse rows to one per group</td><td>GROUP BY</td><td>Aggregate per department</td></tr>
<tr><td>Reusable named subquery</td><td>CTE (WITH)</td><td>Complex multi-step queries</td></tr>
<tr><td>Previous/next row value</td><td>LAG / LEAD</td><td>Month-over-month growth</td></tr>
<tr><td>Cumulative total</td><td>SUM OVER UNBOUNDED PRECEDING</td><td>Running revenue</td></tr>
<tr><td>Rolling window</td><td>AVG OVER ROWS BETWEEN N PRECEDING</td><td>7-day moving average</td></tr>
<tr><td>Conditional column values</td><td>CASE WHEN</td><td>Salary band classification</td></tr>
<tr><td>Speed up WHERE / JOIN lookups</td><td>CREATE INDEX</td><td>High-cardinality filter columns</td></tr>
<tr><td>Saved reusable query</td><td>CREATE VIEW</td><td>Frequently queried subsets</td></tr>
<tr><td>Load SQL result into pandas</td><td><code>pd.read_sql(query, conn)</code></td><td>Feature engineering from DB</td></tr>
<tr><td>Write DataFrame to MySQL</td><td><code>df.to_sql("table", engine)</code></td><td>Store predictions or features</td></tr>
</table>

---

## 📋 Completion Checklist

- Written SELECT queries with WHERE, ORDER BY, LIMIT, and aliases
- Used GROUP BY with COUNT/SUM/AVG and HAVING to filter groups
- Practiced all JOIN types: INNER, LEFT, RIGHT, FULL (UNION), SELF, CROSS
- Written correlated and non-correlated subqueries
- Used CTEs (WITH) to simplify a multi-step query
- Implemented ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, and running totals
- Connected MySQL to Python using mysql-connector and `pd.read_sql`
- Solved at least 10 of the 20 interview questions without looking at the answer
