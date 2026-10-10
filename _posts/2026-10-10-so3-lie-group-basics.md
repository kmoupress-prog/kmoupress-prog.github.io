---
title: 회전은 왜 더할 수 없을까 — SO(3)와 Lie 대수 입문
date: 2026-10-10 14:10:00 +0900
categories: [머신비전, SLAM]
tags: [lie-theory, so3, se3, optimization, gauss-newton, slam]
math: true
---

SLAM이나 카메라 자세 추정 코드를 보면 회전을 업데이트할 때 `R = R + dR` 대신 `R = R @ Exp(delta)` 같은 식이 꼭 나옵니다.
이 글에서는 그 이유를 SO(3)와 Lie 대수로 정리하고, 마지막에 numpy로 회전을 직접 최적화해 봅니다.

## 1. 회전 행렬은 벡터 공간이 아니다

3차원 회전 행렬의 집합은 다음과 같습니다.

$$
SO(3) = \{ R \in \mathbb{R}^{3\times3} \mid R^\top R = I,\ \det R = 1 \}
$$

곱셈에는 닫혀 있지만(회전 두 번은 회전) 덧셈에는 닫혀 있지 않습니다.
예를 들어 $$R_1 + R_2$$는 일반적으로 $$R^\top R = I$$를 만족하지 않습니다.
$$2I$$만 봐도 회전이 아닙니다.

그래서 경사하강법처럼 $$R \leftarrow R - \alpha \nabla$$로 업데이트하면, 한 번만 지나도 $$R$$은 회전 행렬이 아니게 됩니다.
매번 SVD로 다시 직교화하는 방법도 있지만, 그러면 최적화가 실제로 어떤 방향으로 움직였는지가 흐려집니다.

> 핵심: 회전은 9개 숫자로 적지만 자유도는 3개입니다. 업데이트도 3차원 벡터로 하고, 그 벡터를 회전으로 바꿔서 **곱해야** 합니다.
{: .prompt-tip }

## 2. 접공간: so(3)

단위행렬 근처에서 회전이 어떻게 움직이는지 봅니다. $$R(t)^\top R(t) = I$$를 $$t$$로 미분하면

$$
\dot R^\top R + R^\top \dot R = 0
$$

이고, $$t=0$$에서 $$R = I$$이므로 $$\dot R^\top + \dot R = 0$$, 즉 $$\dot R$$는 **반대칭 행렬**입니다.
반대칭 3×3 행렬은 숫자 3개로 정해지므로 3차원 벡터 $$\phi$$와 일대일로 대응합니다.

$$
\phi^\wedge =
\begin{bmatrix}
0 & -\phi_3 & \phi_2 \\
\phi_3 & 0 & -\phi_1 \\
-\phi_2 & \phi_1 & 0
\end{bmatrix},
\qquad \phi^\wedge v = \phi \times v
$$

이 반대칭 행렬들의 공간이 Lie 대수 $$\mathfrak{so}(3)$$입니다.
$$\wedge$$(hat)는 벡터를 행렬로, $$\vee$$(vee)는 반대로 행렬을 벡터로 바꿉니다.
$$\phi$$의 방향은 회전축, 크기 $$\theta = \lVert\phi\rVert$$는 회전각입니다.

## 3. Exp와 Log: 벡터 ↔ 회전

접공간의 벡터를 회전으로 보내는 것이 지수 사상입니다.
행렬 지수 $$\exp(\phi^\wedge) = \sum_k (\phi^\wedge)^k / k!$$를 $$(\phi^\wedge)^3 = -\theta^2 \phi^\wedge$$를 이용해 정리하면 Rodrigues 공식이 나옵니다.

$$
\mathrm{Exp}(\phi) = I + \frac{\sin\theta}{\theta}\phi^\wedge + \frac{1-\cos\theta}{\theta^2}(\phi^\wedge)^2
$$

반대 방향인 로그 사상은 대각합과 반대칭 부분으로 구합니다.

$$
\theta = \arccos\frac{\operatorname{tr}(R) - 1}{2},
\qquad
\mathrm{Log}(R) = \frac{\theta}{2\sin\theta}\,(R - R^\top)^\vee
$$

$$\theta \to 0$$이면 두 식 모두 0/0 꼴이 되므로 코드에서는 1차 근사 $$\mathrm{Exp}(\phi) \approx I + \phi^\wedge$$로 처리합니다.
($$\theta$$가 $$\pi$$에 가까울 때도 $$\sin\theta \to 0$$이라 따로 처리해야 하지만, 이 글의 예제에서는 생략합니다.)

## 4. ⊕와 ⊖: 회전 위에서의 덧셈과 뺄셈

Exp/Log가 있으면 "회전 + 작은 벡터"와 "회전 − 회전"을 정의할 수 있습니다.
여기서는 오른쪽(local) 버전을 씁니다.

$$
R \oplus \tau = R\,\mathrm{Exp}(\tau),
\qquad
R_2 \ominus R_1 = \mathrm{Log}(R_1^\top R_2)
$$

$$\tau$$는 $$R$$의 **자기 좌표계**에서 본 작은 회전입니다.
$$\mathrm{Exp}(\tau) R$$처럼 왼쪽에 곱하면 세계 좌표계 기준 섭동이 되고, 둘은 adjoint로 바꿀 수 있습니다.

$$
R\,\mathrm{Exp}(\tau)\,R^\top = \mathrm{Exp}(R\tau)
\quad\Rightarrow\quad
\mathrm{Ad}_R = R
$$

라이브러리마다 왼쪽/오른쪽 관례가 달라서, 남의 Jacobian을 가져다 쓸 때 가장 많이 틀리는 부분입니다.

## 5. Jacobian: 회전에 대해 미분하기

이제 "회전에 대한 미분"을 접공간 벡터 $$\delta$$에 대한 미분으로 정의합니다.
점 $$p$$를 회전시키는 $$f(R) = Rp$$를 예로 들면

$$
f(R \oplus \delta) = R\,\mathrm{Exp}(\delta)\,p
\approx R(I + \delta^\wedge)p
= Rp + R(\delta \times p)
= Rp - R\,p^\wedge \delta
$$

이므로

$$
\frac{\partial f(R\oplus\delta)}{\partial \delta}\bigg|_{\delta=0} = -R\,p^\wedge
$$

입니다. 3×3 행렬이고, 9×9가 아닙니다.
변수의 실제 자유도에 맞는 크기의 Jacobian이 나온다는 점이 이 방식의 장점입니다.

## 6. 예제: Gauss–Newton으로 회전 추정

점 집합 $$P$$를 미지의 회전 $$R^{*}$$로 돌린 뒤 잡음을 더한 $$Q$$가 있을 때, 잔차 $$r_i = Rp_i - q_i$$의 제곱합을 최소화하는 $$R$$을 찾습니다.
매 반복마다

1. $$J_i = -R\,p_i^\wedge$$로 정규방정식 $$\left(\sum J_i^\top J_i\right)\delta = -\sum J_i^\top r_i$$를 풀고
2. $$R \leftarrow R \oplus \delta = R\,\mathrm{Exp}(\delta)$$로 업데이트합니다.

```python
import numpy as np

def hat(phi):
    x, y, z = phi
    return np.array([[0, -z, y],
                     [z, 0, -x],
                     [-y, x, 0]])

def vee(Phi):
    return np.array([Phi[2, 1], Phi[0, 2], Phi[1, 0]])

def Exp(phi):
    theta = np.linalg.norm(phi)
    K = hat(phi)
    if theta < 1e-8:
        return np.eye(3) + K
    return (np.eye(3) + np.sin(theta) / theta * K
            + (1 - np.cos(theta)) / theta**2 * K @ K)

def Log(R):
    cos_t = np.clip((np.trace(R) - 1) / 2, -1.0, 1.0)
    theta = np.arccos(cos_t)
    if theta < 1e-8:
        return vee(R - R.T) / 2
    return theta / (2 * np.sin(theta)) * vee(R - R.T)

rng = np.random.default_rng(0)
R_true = Exp(np.array([0.3, -1.2, 0.8]))
P = rng.normal(size=(50, 3))
Q = P @ R_true.T + 0.01 * rng.normal(size=(50, 3))

R = np.eye(3)
for it in range(10):
    H = np.zeros((3, 3))
    g = np.zeros(3)
    for p, q in zip(P, Q):
        r = R @ p - q          # 잔차
        J = -R @ hat(p)        # 오른쪽 섭동 Jacobian
        H += J.T @ J
        g += J.T @ r
    delta = np.linalg.solve(H, -g)
    R = R @ Exp(delta)         # R ⊕ delta
    if np.linalg.norm(delta) < 1e-10:
        break

print("error (rad):", np.linalg.norm(Log(R_true.T @ R)))
```

실행 결과입니다. 단위행렬(약 1.5 rad 떨어진 곳)에서 시작해 4번 만에 잡음 수준까지 수렴하고, 마지막까지 $$R^\top R = I$$, $$\det R = 1$$이 유지됩니다.

| 반복 | 비용 | $$\lVert\delta\rVert$$ |
|---|---|---|
| 0 | 181.30 | 9.96e-01 |
| 1 | 22.85 | 4.65e-01 |
| 2 | 0.0615 | 2.12e-02 |
| 3 | 0.0170 | 4.25e-05 |
| 4 | 0.0170 | 8.36e-08 |

최종 오차는 $$\lVert R \ominus R^{*} \rVert = \lVert \mathrm{Log}(R^{*\top} R) \rVert \approx 0.002$$ rad로, 넣어 준 잡음(σ = 0.01)에 맞는 수준입니다.

## 7. SE(3)로 확장

자세(회전 + 이동)는 4×4 행렬 $$T = \begin{bmatrix} R & t \\ 0 & 1 \end{bmatrix}$$의 집합 $$SE(3)$$이고, 접공간은 6차원 $$\xi = (\rho, \phi)$$입니다.
지수 사상에서 회전 부분은 SO(3)와 같고, 이동 부분에는 $$V$$ 행렬이 붙습니다.

$$
\mathrm{Exp}(\xi) =
\begin{bmatrix} \mathrm{Exp}(\phi) & V\rho \\ 0 & 1 \end{bmatrix},
\qquad
V = I + \frac{1-\cos\theta}{\theta^2}\phi^\wedge + \frac{\theta - \sin\theta}{\theta^3}(\phi^\wedge)^2
$$

$$t = \rho$$가 아니라 $$t = V\rho$$라는 점을 주의해야 합니다.
⊕, ⊖, Jacobian을 만드는 방법은 SO(3)와 똑같아서, bundle adjustment나 pose graph 최적화도 결국 위 예제의 반복문을 크게 만든 것입니다.

## 정리

- 회전은 덧셈에 닫혀 있지 않으므로 업데이트는 3차원 접공간에서 계산하고 $$\mathrm{Exp}$$로 바꿔 곱합니다.
- $$\oplus$$, $$\ominus$$와 Jacobian은 왼쪽/오른쪽 섭동 관례를 먼저 확인합니다.
- 이 틀은 SE(3), 나아가 SLAM 최적화 전반에 그대로 쓰입니다.

### 참고

- J. Solà, J. Deray, D. Atchuthan, *A micro Lie theory for state estimation in robotics*, arXiv:1812.01537
- T. Barfoot, *State Estimation for Robotics*, Cambridge University Press
