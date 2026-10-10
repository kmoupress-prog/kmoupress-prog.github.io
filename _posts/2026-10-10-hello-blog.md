---
title: 블로그 시작 — 수식 렌더링 테스트
date: 2026-10-10 14:00:00 +0900
categories: [머신비전]
tags: [chirpy, latex]
math: true
---

공부 기록을 남기는 블로그입니다.

## 수식 테스트

인라인 수식: $R \in SO(3)$, $\phi \in \mathbb{R}^3$

블록 수식 (Rodrigues 공식):

$$
\exp(\phi^\wedge) = I + \frac{\sin\theta}{\theta}\phi^\wedge + \frac{1-\cos\theta}{\theta^2}(\phi^\wedge)^2, \quad \theta = \lVert \phi \rVert
$$

## 코드 테스트

```python
import numpy as np

def hat(phi):
    x, y, z = phi
    return np.array([[0, -z, y],
                     [z, 0, -x],
                     [-y, x, 0]])
```
