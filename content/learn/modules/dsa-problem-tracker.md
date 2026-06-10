---
title: Problem Tracker
description: A tracker of classic DSA problems with optimal solutions. Each problem has the approach, a visual walkthrough, Python code, and time and space complexity.
---

## ✅ DSA Problem Tracker — Optimal Solutions

> **How to use**: Study the approach and visual diagram first. Try to code it yourself. Then compare with the optimal solution. Check off when you can solve it from memory.

---

## 🔢 Arrays

### Best Time to Buy and Sell Stock — LeetCode #121

**Difficulty**: Easy | **Optimal**: Greedy, One Pass | **Time**: O(n) · **Space**: O(1)

**Approach**: Track the minimum price seen so far. For each price, compute profit = price - min_price. Update max profit.

```javascript
Prices: [7, 1, 5, 3, 6, 4]
         7  1  5  3  6  4
min_so_far: 7  1  1  1  1  1
max_profit: 0  0  4  4  5  5
                      ↑
                 Answer = 5 (buy at 1, sell at 6)
```

```python
def max_profit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit
```

- Solved ✓

---

### Product of Array Except Self — LeetCode #238

**Difficulty**: Medium | **Optimal**: Prefix × Suffix | **Time**: O(n) · **Space**: O(1)

**Approach**: For each index, result = product of all elements to its left × product of all elements to its right.

```javascript
Input:  [1, 2, 3, 4]
Prefix: [1, 1, 2, 6]   (product of all elements to the LEFT)
Suffix: [24,12, 4, 1]  (product of all elements to the RIGHT)
Result: [24,12, 8, 6]  = prefix[i] × suffix[i]
```

```python
def product_except_self(nums):
    n = len(nums)
    result = [1] * n
    # Left pass: result[i] = product of all nums[0..i-1]
    prefix = 1
    for i in range(n):
        result[i] = prefix
        prefix *= nums[i]
    # Right pass: multiply by product of all nums[i+1..n-1]
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result
```

- Solved ✓

---

### Majority Element — LeetCode #169

**Difficulty**: Easy | **Optimal**: Boyer-Moore Voting | **Time**: O(n) · **Space**: O(1)

**Approach**: Majority element appears > n/2 times. Cancel out non-majority with majority: net count stays positive.

```javascript
nums = [2,2,1,1,1,2,2]
candidate=2, count=1
         2   ↑   1 count: 1→2
             1   ↓   count: 2→1
                 1   ↓   count: 1→0
                     1   new candidate=1, count=1
                         2   ↓   count=0
                             2   new candidate=2, count=1
Result: candidate = 2 ✓
```

```python
def majority_element(nums):
    candidate, count = None, 0
    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1
    return candidate
```

- Solved ✓

---

### Rotate Array — LeetCode #189

**Difficulty**: Medium | **Optimal**: Triple Reverse | **Time**: O(n) · **Space**: O(1)

**Approach**: Reverse entire array → reverse first k → reverse rest.

```javascript
nums=[1,2,3,4,5,6,7], k=3
Step 1 reverse all:  [7,6,5,4,3,2,1]
Step 2 reverse [0,k): [5,6,7,4,3,2,1]
Step 3 reverse [k,n): [5,6,7,1,2,3,4]  ← Answer!
```

```python
def rotate(nums, k):
    n = len(nums)
    k %= n
    def reverse(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1; hi -= 1
    reverse(0, n-1)
    reverse(0, k-1)
    reverse(k, n-1)
```

- Solved ✓

---

### Subarray Sum Equals K — LeetCode #560

**Difficulty**: Medium | **Optimal**: Prefix Sum + HashMap | **Time**: O(n) · **Space**: O(n)

**Approach**: For each index j, count number of indices i where prefix[j] - prefix[i] = k, i.e., prefix[i] = prefix[j] - k.

```javascript
nums=[1,1,1], k=2
prefix sums: 0→1→2→3
At prefix=2: need prefix=0 (seen 1 time) → count+=1
At prefix=3: need prefix=1 (seen 1 time) → count+=1
Answer: 2 subarrays ([1,1] starting at index 0, starting at index 1)
```

```python
def subarray_sum(nums, k):
    prefix_freq = {0: 1}  # prefix_sum: count
    prefix_sum = count = 0
    for num in nums:
        prefix_sum += num
        count += prefix_freq.get(prefix_sum - k, 0)
        prefix_freq[prefix_sum] = prefix_freq.get(prefix_sum, 0) + 1
    return count
```

- Solved ✓

---

## 🔡 Strings

### Valid Palindrome — LeetCode #125

**Difficulty**: Easy | **Optimal**: Two Pointers | **Time**: O(n) · **Space**: O(1)

```javascript
"A man, a plan, a canal: Panama"
 ↑                             ↑  → a==a, move inward
   ↑                         ↑    → m==m, move inward
     ↑                     ↑      → ... continue
→ All match → True ✓
```

```python
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1; right -= 1
    return True
```

- Solved ✓

---

### Longest Substring Without Repeating Characters — LeetCode #3

**Difficulty**: Medium | **Optimal**: Sliding Window + HashMap | **Time**: O(n) · **Space**: O(k)

```javascript
"abcabcbb"
[a b c] size=3 ← max
a[b c a] - 'a' seen at 0, move left to 1
  [b c a b] - 'b' seen at 1, move left to 2
    [c a b c] - 'c' seen at 2, move left to 3
      [a b c b] - 'b' seen at 4, move left to 5
        [c b b] - 'b' seen at 5, move to 6
          [c b] done. Max = 3
```

```python
def length_of_longest_substring(s):
    char_idx = {}
    left = res = 0
    for right, c in enumerate(s):
        if c in char_idx and char_idx[c] >= left:
            left = char_idx[c] + 1
        char_idx[c] = right
        res = max(res, right - left + 1)
    return res
```

- Solved ✓

---

### Minimum Window Substring — LeetCode #76

**Difficulty**: Hard | **Optimal**: Sliding Window + Counter | **Time**: O(n+m) · **Space**: O(m)

```javascript
s="ADOBECODEBANC", t="ABC"
Expand right until window contains all of t:
  ADOBEC → contains A,B,C → try shrink
  DOBECODEBA → shrink from left: OBECODEBA → BECODEBA → ECODEBA → CODEBA → ODEBANC → DEBANC → EBANC → BANC ← minimum!
Answer: "BANC"
```

```python
from collections import Counter
def min_window(s, t):
    need = Counter(t)
    missing = len(t)
    left = start = end = 0
    for right, c in enumerate(s, 1):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        if missing == 0:
            while need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            if end == 0 or right - left < end - start:
                start, end = left, right
            need[s[left]] += 1
            missing += 1
            left += 1
    return s[start:end]
```

- Solved ✓

---

## #️⃣ Hashing

### Two Sum — LeetCode #1

**Difficulty**: Easy | **Optimal**: HashMap | **Time**: O(n) · **Space**: O(n)

```javascript
nums=[2,7,11,15], target=9
i=0: num=2, need=7 → not in map, add {2:0}
i=1: num=7, need=2 → IN MAP at index 0! → return [0,1]
```

```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```

- Solved ✓

---

### Longest Consecutive Sequence — LeetCode #128

**Difficulty**: Medium | **Optimal**: HashSet | **Time**: O(n) · **Space**: O(n)

```javascript
nums=[100,4,200,1,3,2]
set={100,4,200,1,3,2}
Only start sequence if n-1 NOT in set:
  1: 1-1=0 not in set → start! 1→2→3→4 = length 4
  100: 99 not in set → 100→101 not in set = length 1
  200: 199 not in set → 200 = length 1
Answer: 4
```

```python
def longest_consecutive(nums):
    num_set = set(nums)
    best = 0
    for n in num_set:
        if n - 1 not in num_set:  # sequence start
            length = 1
            while n + length in num_set:
                length += 1
            best = max(best, length)
    return best
```

- Solved ✓

---

## 🔍 Binary Search

### Search in Rotated Sorted Array — LeetCode #33

**Difficulty**: Medium | **Optimal**: Modified Binary Search | **Time**: O(log n) · **Space**: O(1)

```javascript
[4,5,6,7,0,1,2], target=0
lo=0, hi=6, mid=3 → arr[3]=7
  Left half [4,5,6,7] is sorted (arr[lo]=4 ≤ arr[mid]=7)
  Is target=0 in [4,7]? No → search right: lo=4
lo=4, hi=6, mid=5 → arr[5]=1
  Left half [0,1] is sorted (arr[lo]=0 ≤ arr[mid]=1)
  Is target=0 in [0,1]? Yes → search left: hi=4
lo=4, hi=4, mid=4 → arr[4]=0 == target ✓
```

```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # left half sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # right half sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

- Solved ✓

---

## 📚 Stack

### Valid Parentheses — LeetCode #20

**Difficulty**: Easy | **Optimal**: Stack | **Time**: O(n) · **Space**: O(n)

```javascript
Input: "({[]})"
( → push
{ → push        stack: [(, {]
[ → push        stack: [(, {, []
] → pop [, match? [ matches ] ✓  stack: [(, {]
} → pop {, match? { matches } ✓  stack: [(]
) → pop (, match? ( matches ) ✓  stack: []
Empty stack → True ✓
```

```python
def is_valid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in mapping:
            if not stack or stack[-1] != mapping[c]:
                return False
            stack.pop()
        else:
            stack.append(c)
    return not stack
```

- Solved ✓

---

### Daily Temperatures — LeetCode #739

**Difficulty**: Medium | **Optimal**: Monotonic Stack | **Time**: O(n) · **Space**: O(n)

```javascript
Temperatures: [73,74,75,71,69,72,76,73]
Monotonic Decreasing Stack stores indices:

i=0 T=73: stack=[] → push 0.   stack:[0]
i=1 T=74: 74>T[0]=73 → pop 0, ans[0]=1-0=1. push 1. stack:[1]
i=2 T=75: 75>T[1]=74 → pop 1, ans[1]=2-1=1. push 2. stack:[2]
i=3 T=71: 71<T[2]=75 → push 3. stack:[2,3]
i=4 T=69: push 4.     stack:[2,3,4]
i=5 T=72: 72>T[4]=69 → pop 4, ans[4]=5-4=1
          72>T[3]=71 → pop 3, ans[3]=5-3=2
          72<T[2]=75 → push 5. stack:[2,5]
i=6 T=76: 76>T[5]=72 → pop 5, ans[5]=6-5=1
          76>T[2]=75 → pop 2, ans[2]=6-2=4. push 6.
i=7 T=73: push 7
Result: [1,1,4,2,1,1,0,0]
```

```python
def daily_temperatures(temps):
    ans = [0] * len(temps)
    stack = []  # indices, decreasing temps
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans
```

- Solved ✓

---

## 🔗 Linked List

### Reverse Linked List — LeetCode #206

**Difficulty**: Easy | **Optimal**: Iterative (O(1) space) | **Time**: O(n) · **Space**: O(1)

```javascript
1 → 2 → 3 → 4 → 5 → None
↑
prev=None, curr=1

Step 1: next=2, curr.next=None, prev=1, curr=2
None ← 1   2 → 3 → 4 → 5

Step 2: next=3, curr.next=1, prev=2, curr=3
None ← 1 ← 2   3 → 4 → 5

...until curr=None
None ← 1 ← 2 ← 3 ← 4 ← 5
                          ↑ prev = new head
```

```python
def reverse_list(head):
    prev, curr = None, head
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev
```

- Solved ✓

---

### Linked List Cycle — LeetCode #141

**Difficulty**: Easy | **Optimal**: Floyd's Tortoise & Hare | **Time**: O(n) · **Space**: O(1)

```javascript
1 → 2 → 3 → 4 → 5
            ↑       |
            └───────┘
slow: 1→2→3→4→5→3→4→5
fast: 1→3→5→4→3→5→4→3
slow meets fast at some node → CYCLE detected!

No cycle: fast reaches None → return False
```

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

- Solved ✓

---

### Merge Two Sorted Lists — LeetCode #21

**Difficulty**: Easy | **Optimal**: Iterative with dummy node | **Time**: O(m+n) · **Space**: O(1)

```javascript
L1: 1 → 2 → 4
L2: 1 → 3 → 4

dummy → ?
  1(L1) vs 1(L2): tie → take L1: dummy→1(L1)→?
  2(L1) vs 1(L2): 1<2 → take L2: →1(L2)→?
  2(L1) vs 3(L2): 2<3 → take L1: →2(L1)→?
  4(L1) vs 3(L2): 3<4 → take L2: →3(L2)→?
  L1 remains → append all: →4(L1)→4(L2)
Result: 1→1→2→3→4→4
```

```python
def merge_two_lists(l1, l2):
    dummy = curr = ListNode(0)
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1; l1 = l1.next
        else:
            curr.next = l2; l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
```

- Solved ✓

---

## 🌀 Recursion

### Generate Parentheses — LeetCode #22

**Difficulty**: Medium | **Optimal**: Backtracking | **Time**: O(4ⁿ/√n) · **Space**: O(n)

```javascript
n=2, build valid combinations:
                    ""
              /          \
           "("            (can't start with ')')
         /     \
       "(("    "()"
        |      /   \
      "(()"  "()("  (close if open==0? no)
        |      |
     "(())"  "()()"
Both valid! Answer: ["(())", "()()"]

Rule: Add '(' if open < n, add ')' if close < open
```

```python
def generate_parenthesis(n):
    result = []
    def backtrack(s, open_count, close_count):
        if len(s) == 2 * n:
            result.append(s)
            return
        if open_count < n:
            backtrack(s + '(', open_count + 1, close_count)
        if close_count < open_count:
            backtrack(s + ')', open_count, close_count + 1)
    backtrack('', 0, 0)
    return result
```

- Solved ✓

---

## 🔄 Backtracking

### Permutations — LeetCode #46

**Difficulty**: Medium | **Optimal**: Backtracking | **Time**: O(n·n!) · **Space**: O(n)

```javascript
nums=[1,2,3]
Decision Tree:
         []
    /    |    \
  [1]   [2]   [3]
  / \   / \   / \
[1,2][1,3][2,1][2,3][3,1][3,2]
  |    |    |    |    |    |
[1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]

At each step: choose unused number, add to path, recurse, remove (backtrack)
```

```python
def permute(nums):
    result = []
    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return
        for i in range(len(remaining)):
            path.append(remaining[i])
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()
    backtrack([], nums)
    return result
```

- Solved ✓

---

## 🗃️ Heap

### K Closest Points to Origin — LeetCode #973

**Difficulty**: Medium | **Optimal**: Max-Heap of size K | **Time**: O(n log k) · **Space**: O(k)

```javascript
points=[[1,3],[-2,2]], k=1
Distances: √(1+9)=√10, √(4+4)=√8
√8 < √10 → closest is [-2,2]

Max-heap approach (keep k smallest):
Push (-dist, x, y) so we can pop the farthest
When heap size > k, pop the largest distance
```

```python
import heapq
def k_closest(points, k):
    # Max-heap: negate distance to use min-heap as max-heap
    heap = []
    for x, y in points:
        dist = -(x*x + y*y)
        heapq.heappush(heap, (dist, x, y))
        if len(heap) > k:
            heapq.heappop(heap)  # remove farthest
    return [[x, y] for _, x, y in heap]
```

- Solved ✓

---

## 🌲 Trees

### Maximum Depth of Binary Tree — LeetCode #104

**Difficulty**: Easy | **Optimal**: DFS Recursion | **Time**: O(n) · **Space**: O(h)

```javascript
        3
       / \
      9   20
         /  \
        15   7

DFS:
depth(3) = 1 + max(depth(9), depth(20))
         = 1 + max(1, 1 + max(depth(15), depth(7)))
         = 1 + max(1, 1 + max(1, 1))
         = 1 + max(1, 2) = 3
```

```python
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

- Solved ✓

---

### Invert Binary Tree — LeetCode #226

**Difficulty**: Easy | **Optimal**: DFS Recursion | **Time**: O(n) · **Space**: O(h)

```javascript
Before:        After:
    4              4
   / \            / \
  2   7    →    7   2
 / \ / \       / \ / \
1  3 6  9     9  6 3  1
```

```python
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

- Solved ✓

---

### Lowest Common Ancestor — LeetCode #236

**Difficulty**: Medium | **Optimal**: Recursive DFS | **Time**: O(n) · **Space**: O(h)

```javascript
Find LCA of 5 and 1 in tree:
        3
       / \
      5   1
     / \ / \
    6  2 0  8

DFS: if node is p or q → return node
     if both subtrees return non-None → current node is LCA
     else return whichever subtree returned non-None
```

```python
def lowest_common_ancestor(root, p, q):
    if not root or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root  # p and q in different subtrees
    return left or right
```

- Solved ✓

---

## 🕸️ Graphs

### Number of Islands — LeetCode #200

**Difficulty**: Medium | **Optimal**: DFS/BFS | **Time**: O(m×n) · **Space**: O(m×n)

```javascript
Grid:
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

DFS from each unvisited '1':
  Start at (0,0) → flood fill → marks all connected 1s as visited
  Count = 1
  Start at (2,2) → Count = 2
  Start at (3,3) → Count = 3
Answer: 3 islands
```

```python
def num_islands(grid):
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # mark visited
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
```

- Solved ✓

---

### Course Schedule — LeetCode #207

**Difficulty**: Medium | **Optimal**: Topological Sort (BFS/Kahn's) | **Time**: O(V+E) · **Space**: O(V+E)

```javascript
numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]
Graph: 0→1, 0→2, 1→3, 2→3
In-degrees: [0:0, 1:1, 2:1, 3:2]
Queue: [0] (in-degree 0)
  Process 0: reduce in-degree of 1,2 → [1:0, 2:0]
  Queue: [1,2]
  Process 1: reduce 3 → [3:1]. Process 2: reduce 3 → [3:0]
  Queue: [3]. Process 3.
Completed 4 courses == numCourses → True ✓
```

```python
from collections import deque, defaultdict
def can_finish(numCourses, prerequisites):
    in_degree = [0] * numCourses
    graph = defaultdict(list)
    for a, b in prerequisites:
        graph[b].append(a)
        in_degree[a] += 1

    queue = deque(c for c in range(numCourses) if in_degree[c] == 0)
    completed = 0
    while queue:
        course = queue.popleft()
        completed += 1
        for next_course in graph[course]:
            in_degree[next_course] -= 1
            if in_degree[next_course] == 0:
                queue.append(next_course)
    return completed == numCourses
```

- Solved ✓

---

## 🧮 Dynamic Programming

### Climbing Stairs — LeetCode #70

**Difficulty**: Easy | **Optimal**: 1D DP / Fibonacci | **Time**: O(n) · **Space**: O(1)

```javascript
n=5 stairs, can take 1 or 2 steps
ways(1)=1, ways(2)=2
ways(n) = ways(n-1) + ways(n-2)  ← Fibonacci!

n:    1  2  3  4  5
ways: 1  2  3  5  8
```

```python
def climb_stairs(n):
    if n <= 2: return n
    prev2, prev1 = 1, 2
    for _ in range(3, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1
```

- Solved ✓

---

### Coin Change — LeetCode #322

**Difficulty**: Medium | **Optimal**: Bottom-Up DP | **Time**: O(amount × n) · **Space**: O(amount)

```javascript
coins=[1,2,5], amount=11
dp[i] = min coins to make amount i

dp = [0, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞]
      0   1   2   3   4   5   6   7   8   9  10  11

After processing coin=1: dp[i]=i
After processing coin=2: dp[2]=1, dp[3]=2...
After processing coin=5: dp[5]=1, dp[6]=2, dp[10]=2, dp[11]=3

Answer: dp[11] = 3 (use 5+5+1)
```

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

- Solved ✓

---

### House Robber — LeetCode #198

**Difficulty**: Medium | **Optimal**: 1D DP | **Time**: O(n) · **Space**: O(1)

```javascript
nums=[2,7,9,3,1]
rob(0)=2, rob(1)=max(2,7)=7
rob(2)=max(7, 2+9)=11
rob(3)=max(11, 7+3)=11
rob(4)=max(11, 11+1)=12
Answer: 12 (rob houses 0,2,4: 2+9+1=12)
```

```python
def rob(nums):
    prev2 = prev1 = 0
    for num in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + num)
    return prev1
```

- Solved ✓

---

### Longest Increasing Subsequence — LeetCode #300

**Difficulty**: Medium | **Optimal**: DP + Binary Search | **Time**: O(n log n) · **Space**: O(n)

```javascript
nums=[10,9,2,5,3,7,101,18]
tails[] = []  (tails[i] = smallest tail of IS of length i+1)

10 → [10]
9  → [9]   (replace 10 with 9, smaller tail)
2  → [2]
5  → [2,5]
3  → [2,3] (replace 5 with 3)
7  → [2,3,7]
101→ [2,3,7,101]
18 → [2,3,7,18] (replace 101)
Length = 4 ✓
```

```python
import bisect
def length_of_lis(nums):
    tails = []
    for num in nums:
        pos = bisect.bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)
```

- Solved ✓

---

## 🔤 Tries

### Implement Trie — LeetCode #208

**Difficulty**: Medium | **Optimal**: TrieNode with dict | **Time**: O(L) per op · **Space**: O(n·L)

```javascript
Trie after inserting "app", "apple", "apt":
root
└── a
    └── p
        ├── p [end]
        │   └── l
        │       └── e [end]
        └── t [end]

search("app") → traverse a→p→p → is_end=True ✓
startsWith("ap") → traverse a→p → exists ✓
search("ap") → traverse a→p → is_end=False ✗
```

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
        node.is_end = True

    def search(self, word):
        node = self.root
        for c in word:
            if c not in node.children:
                return False
            node = node.children[c]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for c in prefix:
            if c not in node.children:
                return False
            node = node.children[c]
        return True
```

- Solved ✓

---

## 🔢 Bit Manipulation

### Single Number — LeetCode #136

**Difficulty**: Easy | **Optimal**: XOR | **Time**: O(n) · **Space**: O(1)

```javascript
XOR properties:
  a ^ a = 0  (same number cancels)
  a ^ 0 = a  (XOR with 0 = itself)
  Commutative & Associative

[4,1,2,1,2]
4 ^ 1 = 5
5 ^ 2 = 7
7 ^ 1 = 6
6 ^ 2 = 4  ← The single number!
```

```python
def single_number(nums):
    result = 0
    for num in nums:
        result ^= num
    return result
```

- Solved ✓

---

## ⚙️ Design

### LRU Cache — LeetCode #146

**Difficulty**: Medium | **Optimal**: OrderedDict | **Time**: O(1) per op · **Space**: O(capacity)

```javascript
LRU Cache capacity=3:
put(1,1): {1:1}
put(2,2): {1:1, 2:2}
put(3,3): {1:1, 2:2, 3:3}
get(1):   {2:2, 3:3, 1:1}  ← 1 moved to end (most recent)
put(4,4): evict LRU (2) → {3:3, 1:1, 4:4}

Key insight: Most recently used = rightmost in OrderedDict
             Least recently used = leftmost → evict
```

```python
from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # mark as recently used
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # evict LRU
```

- Solved ✓

---

## 🔢 Math

### Count Primes — LeetCode #204

**Difficulty**: Medium | **Optimal**: Sieve of Eratosthenes | **Time**: O(n log log n) · **Space**: O(n)

```javascript
Sieve for n=10:
is_prime = [T,T,T,T,T,T,T,T,T,T]  (indices 0-9)
Start: mark 0,1 as not prime
i=2 (prime): mark 4,6,8 as not prime
i=3 (prime): mark 6,9 as not prime
i=4 (not prime): skip
Result: primes = [2,3,5,7] → count = 4
```

```python
def count_primes(n):
    if n < 2: return 0
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            for j in range(i*i, n, i):
                is_prime[j] = False
    return sum(is_prime)
```

- Solved ✓

---

> 💡 **Study Tips**:
> 1. Read the problem → identify the pattern (sorting? two pointers? DP?)
> 2. State the approach out loud before coding
> 3. Write the time/space complexity before coding
> 4. Test with the visual diagram example
> 5. Code the solution
> 6. Check edge cases: empty input, single element, duplicates, negative numbers
