---
title: DSA Patterns — The Complete Guide
description: Every core data-structures-and-algorithms pattern with plain-English explanations, visuals, Python templates, and the signal words that tell you which pattern a problem wants. Target — NeetCode 150 / Blind 75.
---

> **Format:** 1 problem/day minimum · **Target:** NeetCode 150 / Blind 75
> **Rule:** Attempt for 25 min first → if stuck, read one hint → after solving, always state time + space complexity out loud.

Learn each pattern fully before solving its problems. Knowing *when* to use a pattern matters more than memorizing solutions.

## 🔢 Arrays

A list of items stored in order. The most fundamental data structure — your default choice unless you have a specific reason to use something else.

<table>
<tr><th>Operation</th><th>Time Complexity</th></tr>
<tr><td>Access by index</td><td>O(1)</td></tr>
<tr><td>Search (unsorted)</td><td>O(n)</td></tr>
<tr><td>Insert at end</td><td>O(1) amortized</td></tr>
<tr><td>Insert at middle</td><td>O(n) — all items after shift</td></tr>
</table>

**Signal words:** "subarray", "contiguous elements", "prefix sum", "rearrange in-place"

**Top problems:** Two Sum · Contains Duplicate · Product of Array Except Self · Maximum Subarray · Best Time to Buy and Sell Stock

## 🗺️ Hash Maps

A key-value store with O(1) average lookup. Trades memory for speed.

**When to use:** "Find if X exists", "Count occurrences of X", "Group items by property", "Two elements that sum to X"

```
"apple"  → 3    (key → value)
"banana" → 1
"cherry" → 5

lookup("apple") → 3 in O(1)  ✅
vs array linear search → O(n)  ❌
```

**Signal words:** "frequency", "count", "find duplicate", "two sum", "group by"

**Top problems:** Two Sum · Valid Anagram · Group Anagrams · Top K Frequent Elements · Longest Consecutive Sequence

## 👉👈 Two Pointer

Place two pointers (left + right, or slow + fast) and move them toward each other or at different speeds. Turns O(n²) into O(n).

```
[1,  2,  3,  4,  5,  6]   Target = 7
 ↑                   ↑
left               right

sum = 1+6 = 7 ✅ FOUND

If sum < target → move left pointer right
If sum > target → move right pointer left
```

```python
def two_pointer(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        total = arr[left] + arr[right]
        if total == target:
            return [left, right]   # found
        elif total < target:
            left += 1              # need bigger sum
        else:
            right -= 1             # need smaller sum
    return []  # not found
```

**Signal words:** "sorted array", "pair that sums to", "palindrome", "linked list cycle", "remove duplicates in-place"

**Top problems:** Valid Palindrome · 3Sum · Container With Most Water · Trapping Rain Water

## 🪟 Sliding Window

Maintain a window that slides across the array. Reuse computation from the previous window — only add the new element and remove the old one.

```
[1,  3,  5,  2,  8,  4]   window size 3 — find max sum

[1  3  5] 2  8  4    sum = 9
 1 [3  5  2] 8  4    sum = 10
 1  3 [5  2  8] 4    sum = 15  ← max
 1  3  5 [2  8  4]   sum = 14
```

```python
def sliding_window(s):
    left = 0
    freq = {}
    result = 0
    for right in range(len(s)):
        freq[s[right]] = freq.get(s[right], 0) + 1   # expand window
        while len(freq) > k:                          # shrink if invalid
            freq[s[left]] -= 1
            if freq[s[left]] == 0: del freq[s[left]]
            left += 1
        result = max(result, right - left + 1)        # update answer
    return result
```

**Signal words:** "longest", "shortest", "minimum window", "subarray/substring with condition", "at most K distinct"

**Top problems:** Best Time to Buy and Sell Stock · Longest Substring Without Repeating Characters · Minimum Window Substring

## 🔤 Strings

A sequence of characters. In Python strings are immutable — convert to a list for in-place changes. Most string problems reduce to Two Pointer or Sliding Window on characters.

```python
from collections import Counter

def is_anagram(s, t):
    return Counter(s) == Counter(t)   # O(n) time, O(n) space

# Constant-space version (only lowercase letters):
def is_anagram_v2(s, t):
    if len(s) != len(t): return False
    count = [0] * 26
    for c in s: count[ord(c) - ord('a')] += 1
    for c in t: count[ord(c) - ord('a')] -= 1
    return all(x == 0 for x in count)
```

**Signal words:** "palindrome", "anagram", "valid", "reverse", "substring match", "character frequency"

**Top problems:** Valid Anagram · Valid Palindrome · Longest Palindromic Substring · Find All Anagrams in a String

## 📚 Stacks

LIFO — Last In, First Out. Like a stack of plates: add and remove from the top.

```
Push 1 → [1]
Push 2 → [1, 2]
Push 3 → [1, 2, 3]
Pop    → [1, 2]     (returns 3 — last in, first out)
Peek   → 2          (look without removing)
```

```python
def monotonic_stack(nums):
    stack = []     # stores indices
    result = []
    for i, num in enumerate(nums):
        # Pop while top of stack is smaller than current
        while stack and nums[stack[-1]] < num:
            result.append(stack.pop())
        stack.append(i)   # push current index
    return result
```

**Signal words:** "valid parentheses", "next greater element", "largest rectangle", "undo/redo", "evaluate expression"

**Top problems:** Valid Parentheses · Min Stack · Daily Temperatures · Largest Rectangle in Histogram

## 📬 Queues

FIFO — First In, First Out. Use Python's `deque` for O(1) operations at both ends.

```python
from collections import deque

def level_order(root):
    if not root: return []
    queue = deque([root])
    result = []
    while queue:
        node = queue.popleft()          # O(1) dequeue from front
        result.append(node.val)
        if node.left:  queue.append(node.left)
        if node.right: queue.append(node.right)
    return result
```

**Signal words:** BFS, "level order", "sliding window maximum", "stream processing"

**Top problems:** Sliding Window Maximum · Design Circular Queue · Number of Recent Calls

## 🌳 Trees — BFS and DFS

A hierarchy of nodes. **BFS** = level by level using a queue. **DFS** = go deep on one path first using recursion or a stack.

```
        1          ← level 0
       / \
      2   3        ← level 1
     / \
    4   5          ← level 2

BFS order: [1, 2, 3, 4, 5]
DFS preorder: [1, 2, 4, 5, 3]
```

**When BFS:** "Shortest path", "Level order traversal", "Node closest to root"
**When DFS:** "All paths", "Max depth", "Subtree problems", "Path sum"

```python
def dfs(node):
    if not node:
        return
    print(node.val)     # process current node
    dfs(node.left)
    dfs(node.right)
```

**Top problems:** Maximum Depth · Level Order Traversal · Invert Binary Tree · Lowest Common Ancestor · Path Sum

## 🔍 Binary Search

Search a **sorted** array by repeatedly halving the search space. O(log n).

```
Array: [1,  3,  5,  7,  9,  11,  13]   Target = 5
                    ↑ mid = 7
5 < 7 → search left half: [1, 3, 5]
              ↑ mid = 3
5 > 3 → search right half: [5]  ← FOUND ✅
```

```python
left, right = 0, len(arr) - 1

while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        return mid          # found
    elif arr[mid] < target:
        left = mid + 1      # go right
    else:
        right = mid - 1     # go left

return -1  # not found
```

**Signal words:** "sorted array", "find minimum that satisfies", "search in rotated", "find peak element"

**Top problems:** Binary Search · Search in Rotated Sorted Array · Koko Eating Bananas · Search a 2D Matrix

## 🕸️ Graphs

Nodes connected by edges — directed or undirected, weighted or unweighted.

```python
graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0],
    3: [1]
}

from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    distance = {start: 0}
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                distance[neighbor] = distance[node] + 1
                queue.append(neighbor)
    return distance
```

**Signal words:** "connected components", "shortest path", "cycle detection", "islands", "topological sort"

**Top problems:** Number of Islands · Clone Graph · Course Schedule · Pacific Atlantic Water Flow · Word Ladder

## 📈 Dynamic Programming

Break a large problem into overlapping sub-problems. Solve each once, store the result, never recompute.

```
Without DP:  fib(5) calls fib(4) AND fib(3)
             fib(4) calls fib(3) AGAIN → wasted work
             Time: O(2^n) — exponential 🐌

With DP:     fib(3) computed once, stored, never recomputed
             Time: O(n) — linear ⚡
```

```python
# Top-down: memoization
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

# Bottom-up: tabulation
dp = [0, 1]
for i in range(2, n+1):
    dp.append(dp[-1] + dp[-2])
```

**Signal words:** "number of ways", "minimum cost", "maximum profit", "can you reach", "longest subsequence"

**Top problems:** Climbing Stairs · House Robber · Coin Change · Longest Common Subsequence · 0/1 Knapsack · Edit Distance

## 🔙 Backtracking

Build a solution step by step. When a partial solution can't lead to a valid answer, abandon it and try the next option.

```
Subsets of [1, 2, 3]:
Start: []
├── [1]
│   ├── [1,2] → [1,2,3] ✅
│   └── [1,3] ✅
├── [2]
│   └── [2,3] ✅
└── [3] ✅
Total: 8 subsets (2^3)
```

```python
result = []

def backtrack(start, current):
    result.append(current[:])       # record valid state
    for i in range(start, len(nums)):
        current.append(nums[i])     # choose
        backtrack(i + 1, current)   # explore
        current.pop()               # un-choose (backtrack)

backtrack(0, [])
```

**Top problems:** Subsets · Permutations · Combination Sum · N-Queens · Word Search · Sudoku Solver

## 🏔️ Heaps (Priority Queue)

A binary tree where the parent is always smaller (min-heap) or larger (max-heap) than its children. Min/max in O(1), insert/remove in O(log n).

```python
import heapq

nums = [3, 1, 4, 1, 5, 9]
heapq.heapify(nums)              # list → min-heap in O(n)
smallest = heapq.heappop(nums)   # smallest in O(log n)
heapq.heappush(nums, 2)          # insert in O(log n)

# Max heap trick: negate the values
heapq.heappush(max_heap, -value)
max_val = -heapq.heappop(max_heap)
```

**Signal words:** "Kth largest/smallest", "merge K sorted lists", "top K frequent", "task scheduling by priority"

**Top problems:** Kth Largest Element · Top K Frequent Elements · Merge K Sorted Lists · Find Median from Data Stream

## 📐 Pattern Roadmap

<table>
<tr><th>Pattern</th><th>Week starts</th><th>Target problems</th></tr>
<tr><td>Arrays</td><td>Week 9</td><td>15</td></tr>
<tr><td>Hash Maps</td><td>Week 9</td><td>10</td></tr>
<tr><td>Two Pointer</td><td>Week 9</td><td>8</td></tr>
<tr><td>Sliding Window</td><td>Week 9</td><td>8</td></tr>
<tr><td>Strings</td><td>Week 10</td><td>8</td></tr>
<tr><td>Stacks</td><td>Week 10</td><td>8</td></tr>
<tr><td>Queues</td><td>Week 10</td><td>5</td></tr>
<tr><td>Trees (BFS/DFS)</td><td>Week 11</td><td>15</td></tr>
<tr><td>Binary Search</td><td>Week 11</td><td>8</td></tr>
<tr><td>Graphs</td><td>Week 12</td><td>12</td></tr>
<tr><td>Dynamic Programming</td><td>Week 13</td><td>20</td></tr>
<tr><td>Backtracking</td><td>Week 14</td><td>10</td></tr>
<tr><td>Heaps</td><td>Week 15</td><td>8</td></tr>
<tr><td>Hard Problems</td><td>Week 17</td><td>10</td></tr>
</table>

## 💡 5 Golden Rules for DSA Practice

1. **Understand before coding.** Spend 5 minutes re-reading the problem. Get crystal clear on input, output, and constraints.
2. **Think out loud.** Before typing, say "I will use a hash map because lookup is O(1) and I need to check if a complement exists."
3. **Start with brute force.** Get a working O(n²) solution first. Then optimize step by step.
4. **Always test edge cases.** Empty input? Single element? Negative numbers? Duplicates? Very large input?
5. **State complexity after solving.** Always say the time and space complexity before moving on. This is what interviewers listen for.
