---
title: "회전 표현의 특이점은 왜 생길까 | 짐벌 락부터 SO(3)의 위상까지"
description: "오일러각 짐벌 락을 손계산으로 확인하고, 오일러각 변화율-각속도 행렬의 행렬식이 cos θ가 되는 이유, 그리고 어떤 3-파라미터 회전 표현도 SO(3) 전체에서 특이점을 피할 수 없는 이유를 정리합니다. 쿼터니언과 Lie 방식(R ⊕ δ)의 해결책까지."
date: 2026-10-28 21:00:00 +0900
categories: [Research, 로보틱스]
math: true
---

> **한 줄 요약:** 회전은 3자유도인데, 숫자 3개로 **모든** 회전을 매끄럽게 1:1로 표현하는 방법은 존재하지 않습니다. 지구 전체를 종이 한 장에 찢지 않고 펼 수 없는 것과 같은 이유입니다. 그래서 어떤 3-파라미터 표현이든 어딘가에서 반드시 특이점이 생깁니다.
{: .prompt-info }

## 공부 흐름

1. **현상**: 오일러각 짐벌 락을 숫자로 직접 확인
2. **국소 원인**: 오일러각 변화율 → 각속도 행렬의 랭크가 떨어짐
3. **전역 원인**: 3-파라미터 표현은 *무엇을 쓰든* 특이점이 생김
4. **해결**: 쿼터니언, 그리고 Lie 방식 $R \oplus \delta$

## 1. 현상: 짐벌 락 손계산

**변수 정의**

- ZYX 오일러각: $R = R_z(\psi)\,R_y(\theta)\,R_x(\phi)$
- $\psi$ = yaw (Z축), $\theta$ = pitch (Y축), $\phi$ = roll (X축)

pitch를 $\theta = 90^\circ$로 고정하면

$$
R_y(90^\circ) = \begin{bmatrix}0&0&1\\0&1&0\\-1&0&0\end{bmatrix}
$$

먼저 $R_y(90^\circ)R_x(\phi)$를 계산하고 ($c=\cos,\ s=\sin$),

$$
R_y(90^\circ)R_x(\phi) = \begin{bmatrix}0 & s_\phi & c_\phi\\ 0 & c_\phi & -s_\phi\\ -1 & 0 & 0\end{bmatrix}
$$

여기에 $R_z(\psi)$를 왼쪽에서 곱하면 첫 행은 $c_\psi(0, s_\phi, c_\phi) - s_\psi(0, c_\phi, -s_\phi)$가 되고, 삼각함수 차 공식으로 정리됩니다.

$$
R = \begin{bmatrix}0 & \sin(\phi-\psi) & \cos(\phi-\psi)\\ 0 & \cos(\phi-\psi) & -\sin(\phi-\psi)\\ -1 & 0 & 0\end{bmatrix}
$$

$\psi$와 $\phi$가 따로 남지 않고 **$\phi - \psi$ 하나로만** 남았습니다.

| $(\psi,\ \theta,\ \phi)$ | $\phi-\psi$ | 결과 $R$ |
|---|---|---|
| $(0^\circ,\ 90^\circ,\ 0^\circ)$ | $0^\circ$ | A |
| $(30^\circ,\ 90^\circ,\ 30^\circ)$ | $0^\circ$ | A (같음) |
| $(0^\circ,\ 90^\circ,\ 30^\circ)$ | $30^\circ$ | B |
| $(50^\circ,\ 90^\circ,\ 80^\circ)$ | $30^\circ$ | B (같음) |

파라미터는 3개인데 실제로 회전을 바꾸는 자유도는 2개뿐입니다. 이 때문에

- $R$에서 $\psi, \phi$를 **따로 복원할 수 없고** (해가 무한히 많음)
- 이 자세에서는 **어떤 방향의 미소 회전은 아예 만들 수 없습니다.**

### 왜 $\phi - \psi$만 남을까

$R_z(\psi)$는 월드 Z축을 중심으로 돌립니다. 반면 $R_x(\phi)$의 축은 pitch를 거친 뒤의 X축, 즉 월드 좌표로 보면 $R_y(90^\circ)\,\hat x = (0, 0, -1)$입니다. **yaw 축과 roll 축이 같은 직선 위에 놓이게(반대 방향으로) 된 것**이죠. 같은 축으로 $\psi$만큼, 반대 방향으로 $\phi$만큼 돌리면 둘은 하나의 회전 $\phi-\psi$로 합쳐집니다. 이게 짐벌 세 개 중 두 개가 겹쳐 "잠기는" 짐벌 락입니다.

## 2. 국소 원인: 오일러각 속도 → 각속도 행렬

SLAM이나 IMU 적분에서는 자세 자체보다 **변화율**이 문제가 됩니다. 몸체 좌표계 각속도 $\omega$와 오일러각 변화율의 관계는 선형입니다.

**변수 정의**

- $\omega = (\omega_x, \omega_y, \omega_z)$ = 자이로가 재는 몸체 좌표계 각속도
- $\dot\phi, \dot\theta, \dot\psi$ = 오일러각이 시간에 따라 변하는 속도
- $E$ = 둘을 잇는 3×3 행렬 (자세에 따라 달라짐)

$$
\omega = E(\phi, \theta)
\begin{bmatrix}\dot\phi\\ \dot\theta\\ \dot\psi\end{bmatrix},
\qquad
E = \begin{bmatrix}1 & 0 & -\sin\theta\\ 0 & \cos\phi & \sin\phi\cos\theta\\ 0 & -\sin\phi & \cos\phi\cos\theta\end{bmatrix}
$$

행렬식을 첫 열로 전개하면

$$
\det E = \cos\phi\cdot\cos\phi\cos\theta + \sin\phi\cdot\sin\phi\cos\theta = \cos\theta
$$

$\theta = 90^\circ$에서 $\det E = 0$, 즉 **랭크가 3에서 2로 떨어집니다.** $\phi=0$으로 놓고 보면 첫 열 $(1,0,0)$과 셋째 열 $(-1,0,0)$이 평행해집니다. 1절의 "yaw 축과 roll 축이 겹친다"는 말을 행렬로 쓴 것입니다.

### 손계산: $\theta = 89^\circ$에서 몸체 z축으로 1 rad/s 돌기

$\phi = 0$이면 $E = \begin{bmatrix}1&0&-\sin\theta\\0&1&0\\0&0&\cos\theta\end{bmatrix}$이고, $\omega = (0, 0, 1)$을 만들려면

$$
\dot\psi = \frac{1}{\cos 89^\circ} = \frac{1}{0.01745} \approx 57.3\ \text{rad/s},
\qquad
\dot\phi = \sin 89^\circ \cdot \dot\psi \approx 57.3\ \text{rad/s}
$$

실제 회전은 겨우 1 rad/s인데 오일러각은 **57배 빠르게** 돌아야 합니다. yaw와 roll이 서로를 거의 상쇄하면서 남는 작은 차이로 원하는 회전을 만드는 상황입니다. $\theta = 90^\circ$가 되면 아무리 빨라도 $\omega_z$를 만들 수 없습니다.

![pitch에 따른 필요한 yaw 속도](/assets/img/posts/euler-rate-blowup.png)
_$\dot\psi = 1/\cos\theta$. 80°만 넘어도 5.8배, 89°에선 57배로 폭주합니다._

실전에서는 이게 곧 문제입니다. 오일러각으로 IMU를 적분하거나 오일러각을 최적화 변수로 쓰면, 특이점 근처에서 수치 오차가 $1/\cos\theta$배로 증폭되고 야코비안이 불량조건(ill-conditioned)이 됩니다.

## 3. 전역 원인: 순서를 바꾸면 해결될까?

"ZYX가 문제면 다른 순서나 다른 3-파라미터 표현을 쓰면 되지 않나?" 안 됩니다. **특이점이 생기는 자세의 위치만 바뀔 뿐, 없어지지 않습니다.**

### 비유: 위도·경도

지구 위 점을 (위도 $\lambda$, 경도 $\mu$) 두 숫자로 표현하면 북극에서 경도가 정의되지 않습니다. 동쪽으로 1 m 걸을 때 경도 변화는

$$
\dot\mu = \frac{v_{\text{east}}}{R_\text{earth}\cos\lambda}
$$

오일러각의 $1/\cos\theta$와 **같은 모양**입니다. 극점을 적도로 옮기는 다른 좌표계를 쓰면 그 좌표계의 극점에서 같은 문제가 생깁니다. 구면을 평면 한 장에 찢지 않고 1:1로 펼 수 없기 때문입니다.

### SO(3)도 마찬가지인 이유

회전 전체의 집합 SO(3)는 **유계이고 닫혀 있는(compact)** 3차원 다양체입니다. 반면 숫자 3개짜리 공간 $\mathbb{R}^3$의 열린 영역은 compact가 아닙니다.

만약 SO(3) 전체를 $\mathbb{R}^3$의 어떤 영역 $U$와 연속적으로 1:1 대응시킬 수 있다면

1. compact 집합의 연속 상은 compact이므로 $U$는 **닫혀 있고 유계**여야 하고,
2. 3차원 다양체를 $\mathbb{R}^3$에 1:1로 연속하게 넣으면 영역 불변성(invariance of domain)에 의해 $U$는 **열린 집합**이어야 합니다.

$\mathbb{R}^3$에서 열려 있으면서 닫혀 있고 비어 있지 않은 집합은 $\mathbb{R}^3$ 전체뿐인데, 이건 유계가 아니므로 모순입니다. 따라서

> **어떤 3-파라미터 표현도 SO(3) 전체에서 1:1이면서 동시에 특이점이 없을 수 없다.** (Stuelpnagel, 1964)
{: .prompt-tip }

결국 3-파라미터 표현은 어딘가에서 **1:1이 깨지거나**(여러 파라미터가 같은 회전) **미분이 깨집니다**(야코비안 랭크 결손 또는 발산).

### 다른 3-파라미터 표현의 특이점

| 표현 | 정의 | 특이점 |
|---|---|---|
| 오일러각 (ZYX) | $(\psi,\theta,\phi)$ | $\theta = \pm 90^\circ$ (짐벌 락) |
| 회전 벡터 (축-각) | $\theta\,\mathbf n$ | $\theta = \pi$에서 $\pm$ 두 값이 같은 회전, $\theta = 2\pi$에서 야코비안 특이 |
| 깁스 벡터 (로드리게스 파라미터) | $\tan(\theta/2)\,\mathbf n$ | $\theta = \pi$에서 무한대로 발산 |
| MRP | $\tan(\theta/4)\,\mathbf n$ | $\theta = 2\pi$에서 발산 |

**손계산 1: 회전 벡터, $\theta = \pi$**

$\omega = (\pi, 0, 0)$이면 축 $\mathbf n = \hat x$, $K = \hat x^\wedge$이고 로드리게스 공식으로

$$
R = I + \sin\pi\,K + (1-\cos\pi)K^2 = I + 2K^2,
\quad
K^2 = \begin{bmatrix}0&0&0\\0&-1&0\\0&0&-1\end{bmatrix}
\;\Rightarrow\;
R = \mathrm{diag}(1,-1,-1)
$$

$\omega = (-\pi, 0, 0)$를 넣으면 $K \to -K$이지만 $K^2$는 그대로라 **같은 $R$**이 나옵니다. 두 점이 같은 회전을 가리키므로 여기서 1:1이 깨집니다.

**손계산 2: 깁스 벡터의 발산**

| $\theta$ | $\tan(\theta/2)$ |
|---|---|
| $170^\circ$ | 11.4 |
| $179^\circ$ | 114.6 |
| $179.9^\circ$ | 1145.9 |
| $180^\circ$ | $\infty$ |

## 4. 해결: 차원을 늘리거나, 지도를 매번 새로 펴거나

### (a) 쿼터니언: 숫자 4개 + 제약 1개

단위 쿼터니언 $q$는 4차원 공간의 단위 구면 $S^3$ 위에 있습니다. 숫자가 하나 더 많은 대신 **특이점이 전혀 없습니다.** 대가는 두 가지입니다.

- $\|q\| = 1$ 제약을 유지해야 함 (정규화)
- $q$와 $-q$가 같은 회전 (이중 덮개)

3절의 정리가 금지한 건 "숫자 3개"였으니, 4개를 쓰면 빠져나갈 수 있습니다. 자세한 쿼터니언 이야기는 [MIT 머신비전 18강 정리](/posts/mit-mv-18-quaternions/)에 있습니다.

### (b) Lie 방식: 전역 상태는 그대로, 업데이트만 3개

SLAM/VIO 최적화가 실제로 쓰는 방법입니다.

$$
R \leftarrow R \oplus \delta = R\,\exp(\delta^\wedge),
\qquad \delta \in \mathbb{R}^3
$$

**변수 정의**

- $R$ = 현재 자세. 회전 행렬(또는 쿼터니언) 그대로 저장하므로 특이점이 없음
- $\delta$ = 이번 반복의 작은 보정량. 최적화 변수는 이 3개뿐
- $\exp(\cdot^\wedge)$ = 회전 벡터 $\delta$를 회전 행렬로 바꾸는 지수 사상

핵심은 $\delta$가 **매 반복마다 0 근처에서 새로 시작**한다는 점입니다. 회전 벡터의 특이점은 $\|\delta\| = \pi, 2\pi$에 있으니, $\|\delta\|$가 작은 한 절대 닿지 않습니다. 지구 전체를 지도 한 장으로 덮으려 하지 않고, **지금 서 있는 곳 주변의 작은 지도를 매번 새로 펴는** 셈입니다. 3자유도 최적화의 효율과 특이점 없는 전역 표현을 둘 다 얻습니다.

왜 $R + \Delta$가 아니라 곱셈으로 덧붙여야 하는지는 [회전은 왜 그냥 더할 수 없을까](/posts/why-rotations-dont-add/)에서 다뤘습니다.

## 정리

- 오일러각은 $\theta = 90^\circ$에서 yaw 축과 roll 축이 겹쳐 자유도 하나를 잃습니다 (짐벌 락).
- 이를 행렬로 보면 오일러각 속도 → 각속도 행렬의 $\det E = \cos\theta$가 0이 되고, 근처에서는 필요한 각속도가 $1/\cos\theta$배로 폭주합니다.
- 순서를 바꾸거나 다른 3-파라미터 표현을 써도 소용없습니다. SO(3)는 compact라서 $\mathbb{R}^3$의 한 영역과 매끄럽게 1:1 대응할 수 없기 때문입니다.
- 해결책은 **차원을 늘리거나**(쿼터니언) **전역 상태는 그대로 두고 0 근처의 작은 보정만 3-파라미터로 다루는 것**($R \oplus \delta$)입니다.

### 더 읽을거리

- J. Stuelpnagel, *On the Parametrization of the Three-Dimensional Rotation Group*, SIAM Review 6(4), 1964: 3-파라미터 표현이 전역적으로 특이점을 피할 수 없음을 보인 논문입니다.
- J. Solà 외, *A micro Lie theory for state estimation in robotics* (arXiv:1812.01537)
