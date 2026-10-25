---
title: "[MIT 머신비전 18강] 회전을 숫자 네 개로: 단위 사원수 | 로드리게스 공식·짐벌 락·회전의 공간"
description: "MIT 6.801 머신비전(Machine Vision, Berthold Horn) 18강 정리. 회전의 성질과 여러 표현(축-각도, 오일러 각, 회전 행렬, 로드리게스 공식), 해밀턴의 사원수(Quaternion)와 단위 사원수 회전 q r q*, 절대 방향을 고유벡터 문제로 푸는 법을 쉽게 설명합니다."
date: 2026-10-25 12:00:00 +0900
categories: [Research, 머신비전]
math: true
---

{% include embed/youtube.html id='uiG6KY0Cqd8' %}
_MIT OpenCourseWare 6.801 18강 원본 영상 (영어)_

> **한 줄 요약:** 회전은 순서를 바꾸면 결과가 달라지는 까다로운 대상입니다. 오일러 각이나 회전 행렬에도 저마다 약점이 있는데, **단위 사원수**(숫자 네 개, 길이 1)는 회전을 합치기도, 돌리기도, 최적화하기도 편합니다. 덕분에 지난 강의의 절대 방향 문제가 **4×4 행렬의 고유벡터 하나**로 풀립니다.
{: .prompt-info }

## 회전은 왜 까다로울까

[지난 글](/posts/mit-mv-17-photogrammetry/)에서 이동은 무게중심 차이로 쉽게 풀렸지만, 회전에서 막혔습니다. 회전이 이동과 다른 가장 큰 이유는 **순서를 바꾸면 결과가 다르다**는 점입니다.

![책 모양 상자를 x축 90° 다음 z축 90°로 돌린 결과와, z축 90° 다음 x축 90°로 돌린 결과가 서로 다른 모습](/assets/img/posts/mv/lec18-noncommute.png)
_책상 위의 책으로 직접 해 보세요. 같은 두 번의 90° 회전인데 순서만 바꿔도 책이 다른 자세가 됩니다._

이동은 "동쪽 1m, 북쪽 1m"를 어떤 순서로 해도 같은 곳에 도착하지만, 회전은 그렇지 않습니다. 그래서 데이터에 회전을 맞추는 일이 어렵습니다.

회전의 기본 성질 몇 가지입니다.

- **오일러 정리:** 어떤 회전이든 움직이지 않는 점들의 직선, 즉 **회전축**이 하나 있습니다.
- **평행축 정리:** 어떤 회전이든 원점을 지나는 회전 + 이동으로 나눌 수 있습니다. 그래서 회전과 이동을 따로 다룰 수 있습니다.
- **자유도:** $$n$$차원에서 $$n(n-1)/2$$개, 3D에서는 3개입니다.
- 회전은 거리, 각도, 내적, 삼중곱, 그리고 **좌우(손잡이 방향)**를 보존합니다. 반사, 기울임, 크기 변화는 들어 있지 않습니다.
- 아주 작은 회전 속도(각속도)는 벡터처럼 그냥 더해지지만, **유한한 회전**은 더해지지 않습니다.

## 회전을 나타내는 여러 방법

같은 회전을 적는 방법이 여럿 있고, 저마다 장단점이 있습니다.

| 표현 | 숫자 개수 | 약점 |
|---|---|---|
| 축 + 각도 $$(\hat{\omega}, \theta)$$ | 4 | 두 회전을 합치는 방법이 없음 |
| 깁스 벡터 $$\hat{\omega}\tan(\theta/2)$$ | 3 | $$\theta = 180°$$에서 무한대 |
| 오일러 각 (롤·피치·요) | 3 | 순서 정의가 24가지 넘음, 합치기 어려움, **짐벌 락** |
| 회전 행렬 $$R$$ | 9 | 자유도는 3인데 숫자가 9개, 조건 6개를 지켜야 함 |
| 단위 사원수 $$\mathring{q}$$ | 4 | 조건 하나(길이 1), $$\pm\mathring{q}$$가 같은 회전 |

**짐벌 락**은 오일러 각에서 두 축이 겹쳐 버려 자유도 하나를 잃는 현상입니다. 비행기가 기수를 90° 들면 "요"와 "롤"이 같은 방향의 회전이 되어 구별할 수 없게 됩니다. 제어 시스템에서는 큰 사고로 이어질 수 있습니다.

그 밖에 지수 함수 표현, 구를 복소평면에 펼쳐 계산하는 방법, 물리학의 파울리 스핀 행렬도 있지만, 강의의 주인공은 사원수입니다.

## 로드리게스 공식: 축 둘레로 돌리기

축 $$\hat{\omega}$$ 둘레로 $$\theta$$만큼 돌리는 공식부터 봅시다. 벡터 $$r$$을 **축 방향 성분**과 **축에 수직인 성분**으로 나누면 쉽습니다.

![축 ω̂ 둘레로 벡터 r이 θ만큼 돌아 r'이 되는 모습. 축 방향 성분은 그대로이고 수직 성분만 원을 따라 돈다](/assets/img/posts/mv/lec18-rodrigues.png)
_축 방향 성분은 회전해도 그대로이고, 수직 성분만 원을 따라 $$\theta$$만큼 돕니다._

$$
r' = (\cos\theta)\, r + (1 - \cos\theta)(\hat{\omega} \cdot r)\,\hat{\omega} + (\sin\theta)(\hat{\omega} \times r)
$$

- 둘째 항: 축 방향 성분 $$(\hat{\omega} \cdot r)\hat{\omega}$$은 그대로 살아남습니다.
- 첫째·셋째 항: 수직 성분이 원 위에서 $$\cos\theta$$, $$\sin\theta$$만큼 섞입니다. $$\hat{\omega} \times r$$은 수직 성분을 축 둘레로 90° 돌린 벡터입니다.

이 공식은 미분방정식에서도 나옵니다. 축 둘레로 돌 때 점의 속도는 $$\dot{r} = \hat{\omega} \times r$$이고, 이 외적을 행렬 $$\Omega$$로 쓰면 $$dR/d\theta = \Omega R$$, 즉 $$R = e^{\theta\Omega}$$입니다. 테일러 전개에서 $$\Omega^3 = -\Omega$$를 쓰면 무한급수가 사인과 코사인으로 묶여

$$
e^{\theta\Omega} = I + (\sin\theta)\,\Omega + (1 - \cos\theta)\,\Omega^2
$$

정확히 로드리게스 공식이 됩니다. 하지만 이 형태로는 **두 회전을 합치기**가 여전히 불편합니다.

## 우리가 바라는 것

회전 표현에 바라는 성질을 정리하면 이렇습니다.

1. 벡터나 좌표계를 돌릴 수 있을 것
2. 두 회전을 **합칠** 수 있을 것
3. 군더더기 없고 직관적일 것
4. 계산이 빠를 것
5. 두 자세 사이를 **보간**하고, 여러 회전을 **평균** 낼 수 있을 것
6. 회전에 대해 **미분**할 수 있을 것 (최적화용)
7. 회전을 고르게 **뽑을** 수 있고, "회전들의 공간"이라는 개념이 있을 것

이걸 거의 다 만족하는 것이 사원수입니다.

## 해밀턴의 사원수

해밀턴은 복소수 $$a + bi$$를 넓혀 더하기·빼기·곱하기·**나누기**가 다 되는 수 체계를 찾았습니다. 성분 3개로는 불가능하다는 것을 깨닫고, 허수 단위를 **세 개** 둔 4성분 수를 만들었습니다.

$$
i^2 = j^2 = k^2 = ijk = -1
$$

여기서 다음 규칙이 따라 나옵니다. **곱하는 순서를 바꾸면 부호가 바뀝니다.**

$$
ij = k,\quad jk = i,\quad ki = j, \qquad ji = -k,\quad kj = -i,\quad ik = -j
$$

사원수는 실수 하나와 벡터 하나의 묶음 $$\mathring{q} = (q, \mathbf{q})$$로 쓰면 편합니다. 곱셈은

$$
\mathring{p}\,\mathring{q} = (p, \mathbf{p})(q, \mathbf{q}) = \big(pq - \mathbf{p}\cdot\mathbf{q},\; p\mathbf{q} + q\mathbf{p} + \mathbf{p}\times\mathbf{q}\big)
$$

외적 $$\mathbf{p}\times\mathbf{q}$$ 때문에 순서를 바꾸면 결과가 다릅니다. 회전이 순서에 민감한 것과 딱 맞아떨어집니다.

자주 쓰는 성질들입니다.

- **켤레:** $$\mathring{q}^* = (q, -\mathbf{q})$$, 그리고 $$(\mathring{p}\mathring{q})^* = \mathring{q}^*\mathring{p}^*$$
- **길이:** $$\mathring{q}\mathring{q}^* = (q^2 + \mathbf{q}\cdot\mathbf{q},\, \mathbf{0})$$, 길이가 1이면 **단위 사원수**
- **역수:** $$\mathring{q}^{-1} = \mathring{q}^* / (\mathring{q}\cdot\mathring{q})$$. 0만 아니면 언제나 나눌 수 있습니다.
- **결합법칙:** $$(\mathring{p}\mathring{q})\mathring{r} = \mathring{p}(\mathring{q}\mathring{r})$$
- 보통 벡터 $$\mathbf{r}$$은 실수 부분이 0인 사원수 $$(0, \mathbf{r})$$로 씁니다.

## 사원수로 돌리기: $$\mathring{q}\,\mathring{r}\,\mathring{q}^*$$

벡터 $$\mathbf{r}$$을 돌리려면 앞에서 $$\mathring{q}$$를, 뒤에서 켤레 $$\mathring{q}^*$$를 곱합니다.

$$
\mathring{r}' = \mathring{q}\,\mathring{r}\,\mathring{q}^*, \qquad \mathring{q} = \left(\cos\frac{\theta}{2},\; \sin\frac{\theta}{2}\,\hat{\omega}\right)
$$

전개하면 벡터 부분이 $$(q^2 - \mathbf{q}\cdot\mathbf{q})\mathbf{r} + 2(\mathbf{q}\cdot\mathbf{r})\mathbf{q} + 2q(\mathbf{q}\times\mathbf{r})$$인데, $$q = \cos(\theta/2)$$, $$\mathbf{q} = \sin(\theta/2)\hat{\omega}$$를 넣고 배각 공식을 쓰면 **로드리게스 공식과 똑같아집니다.** 각도가 **절반**으로 들어가는 이유가 여기 있습니다. $$\mathring{q}$$가 양쪽에서 한 번씩, 두 번 작용하기 때문입니다.

**손으로 계산해 보면:** $$x$$축 방향 벡터 $$\hat{x}$$를 $$z$$축 둘레로 90° 돌려 봅시다. $$c = \cos 45° = s = \sin 45° \approx 0.707$$이므로 $$\mathring{q} = (c,\, s\hat{z})$$입니다.

1. 앞에서 곱하기: $$\mathring{q}(0, \hat{x}) = \big(-s\,\hat{z}\cdot\hat{x},\; c\hat{x} + s\,\hat{z}\times\hat{x}\big) = (0,\; c\hat{x} + s\hat{y})$$
2. 뒤에서 켤레 $$(c, -s\hat{z})$$ 곱하기: 실수 부분은 $$s(c\hat{x} + s\hat{y})\cdot\hat{z} = 0$$, 벡터 부분은 $$c(c\hat{x} + s\hat{y}) - s(c\hat{x} + s\hat{y})\times\hat{z} = (c^2 - s^2)\hat{x} + 2cs\,\hat{y}$$
3. 숫자를 넣으면 $$c^2 - s^2 = 0.5 - 0.5 = 0$$, $$2cs = 2 \times 0.5 = 1$$이므로 결과는 $$\hat{y}$$

$$x$$축이 정확히 $$y$$축으로 돌아갔습니다.

이 연산은 내적과 삼중곱을 보존합니다. 즉 진짜 회전입니다. 그리고 가장 큰 장점은 **합치기**입니다.

$$
\mathring{p}\,(\mathring{q}\,\mathring{r}\,\mathring{q}^*)\,\mathring{p}^* = (\mathring{p}\mathring{q})\,\mathring{r}\,(\mathring{p}\mathring{q})^*
$$

$$\mathring{q}$$로 먼저 돌리고 $$\mathring{p}$$로 다시 돌린 것은, 두 사원수의 곱 $$\mathring{p}\mathring{q}$$ 하나로 돌린 것과 같습니다. 결합법칙 덕분입니다.

## 반 바퀴의 비밀: $$\mathring{q}$$와 $$-\mathring{q}$$

$$-\mathring{q}$$로 돌려도 $$(-\mathring{q})\mathring{r}(-\mathring{q})^* = \mathring{q}\mathring{r}\mathring{q}^*$$로 결과가 같습니다. 부호가 두 번 곱해져 사라지니까요.

![회전 각 θ에 따른 cos(θ/2)와 sin(θ/2) 그래프: 360°에서 q가 −q가 되고 720°에서야 원래대로 돌아옴. 오른쪽은 4D 단위구 위 정반대 두 점이 같은 회전임을 보여 주는 그림](/assets/img/posts/mv/lec18-halfangle.png)
_물체를 한 바퀴(360°) 돌리면 제자리지만 사원수는 $$-\mathring{q}$$가 됩니다. 두 바퀴(720°)를 돌아야 사원수도 제자리입니다._

그래서 **회전들의 공간**은 이렇게 그릴 수 있습니다.

- 단위 사원수는 4D 공간의 **단위구** 위의 점입니다(3차원 곡면이라 $$S^3$$이라고 씁니다).
- 정반대 두 점 $$\pm\mathring{q}$$를 같은 회전으로 봅니다(수학에서는 사영 공간 $$P^3$$).
- 이 공간 위에서 회전을 고르게 뽑거나, 두 회전 사이의 거리를 잴 수 있습니다.

## 절대 방향을 사원수로 풀기

이제 지난 강의에서 막힌 문제로 돌아갑니다. 무게중심을 뺀 점들에 대해

$$
\max_R \sum_{i=1}^{n} \mathbf{r}'_{r,i} \cdot R(\mathbf{r}'_{l,i})
$$

를 풀어야 했습니다. 회전을 사원수로 바꾸고, 내적의 성질 $$(\mathring{p}\mathring{q})\cdot\mathring{r} = \mathring{p}\cdot(\mathring{r}\mathring{q}^*)$$를 쓰면

$$
\sum_i (\mathring{q}\,\mathring{r}'_{l,i}\,\mathring{q}^*)\cdot\mathring{r}'_{r,i}
= \sum_i (\mathring{q}\,\mathring{r}'_{l,i})\cdot(\mathring{r}'_{r,i}\,\mathring{q})
= \mathring{q}^T \underbrace{\left(\sum_i \bar{R}_{l,i}^T R_{r,i}\right)}_{N} \mathring{q}
$$

사원수 곱셈은 4×4 행렬 곱으로 쓸 수 있어서($$\mathring{p}\mathring{q} = P\mathring{q} = \bar{Q}\mathring{p}$$), 측정값으로 만든 **4×4 대칭 행렬 $$N$$** 하나로 정리됩니다.

이제 문제는 "길이 1인 $$\mathring{q}$$ 중에서 $$\mathring{q}^T N \mathring{q}$$를 가장 크게"입니다. 라그랑주 승수로 조건을 넣고 미분하면

$$
\max_{\mathring{q}}\; \mathring{q}^T N \mathring{q} + \lambda(1 - \mathring{q}\cdot\mathring{q}) \quad\Longrightarrow\quad N\mathring{q} = \lambda\mathring{q}
$$

**$$N$$의 가장 큰 고유값에 해당하는 고유벡터가 답**입니다. 17강의 관성 축처럼 또 고유벡터 문제가 되었습니다.

- $$N$$은 점들의 곱을 모은 3×3 행렬 $$M = \sum_i \mathbf{r}'_{l,i}\mathbf{r}'^T_{r,i}$$의 성분들로 만듭니다.
- 고유값은 4차 방정식 $$\lambda^4 + c_3\lambda^3 + c_2\lambda^2 + c_1\lambda + c_0 = 0$$의 근인데, $$c_3 = \text{tr}(N) = 0$$, $$c_2 = -2\,\text{tr}(M^TM)$$, $$c_1 = -8\det M$$, $$c_0 = \det N$$로 깔끔하게 나옵니다.
- 4차 방정식까지는 근의 공식이 있으니 **반복 없이 닫힌 해**가 나옵니다.

같은 방법이 상대 방향, 카메라 보정, 로봇 팔 운동학, 우주선 자세 제어에도 쓰입니다.

## 계산 비용

![회전 두 개를 합칠 때 사원수 16번·행렬 27번, 벡터 하나를 돌릴 때 사원수 15번·행렬 9번의 곱셈이 필요함을 비교한 막대그래프](/assets/img/posts/mv/lec18-cost.png)
_합치기는 사원수가 빠르고, 벡터 하나 돌리기는 행렬이 빠릅니다._

- **합치기**: 사원수 곱셈 16번·덧셈 12번 vs 행렬 곱셈 27번·덧셈 18번
- **벡터 돌리기**: 사원수 15번·12번(효율적인 식 $$\mathbf{r}' = \mathbf{r} + 2q(\mathbf{q}\times\mathbf{r}) + 2\mathbf{q}\times(\mathbf{q}\times\mathbf{r})$$ 기준) vs 행렬 9번·6번. 점을 많이 돌릴 때는 행렬로 바꿔 쓰면 됩니다.
- **다시 정규화하기**: 회전을 여러 번 합치다 보면 반올림 오차로 조건이 조금씩 깨집니다. 사원수는 $$\mathring{q}/\sqrt{\mathring{q}\cdot\mathring{q}}$$로 끝이지만, 행렬은 $$M(M^TM)^{-1/2}$$처럼 훨씬 무거운 계산이 필요합니다.

정다면체의 회전 대칭은 유한한 회전 묶음(군)이 됩니다. 정사면체 12개, 정육면체·정팔면체 24개, 정십이면체·정이십면체 60개입니다. 이 묶음들은 회전의 공간을 고르게 나눠 뽑을 때 쓰이는데, 다음 두 강의에서 다시 나옵니다.

## 직접 해 보기

**① 축과 각도로 돌리기.** 축의 방향과 회전 각을 바꿔 보세요. 아래에 사원수 네 숫자가 바로 나옵니다.

<div class="mv-demo" id="mv-18-quat"></div>
<script src="/assets/js/demos/mv-18-quat.js" defer></script>

회전 각을 360°로 놓으면 상자는 처음과 똑같은데 사원수는 $$(-1, 0, 0, 0)$$입니다. 720°까지 가야 $$(+1, 0, 0, 0)$$으로 돌아옵니다. 어떤 각도든 사원수의 길이는 늘 1.000입니다.

**② 순서 바꿔 합치기.** 회전 A와 B를 고르면, "A 먼저"는 $$\mathring{q}_B\mathring{q}_A$$, "B 먼저"는 $$\mathring{q}_A\mathring{q}_B$$로 합쳐집니다.

<div class="mv-demo" id="mv-18-order"></div>
<script src="/assets/js/demos/mv-18-order.js" defer></script>

처음 설정(x축 90°, z축 90°)에서는 두 곱이 (0.5, 0.5, 0.5, 0.5)와 (0.5, 0.5, −0.5, 0.5)로 다릅니다. 둘 다 축이 대각선 방향인 120° 회전이지만 축이 서로 다릅니다. 같은 축끼리 고르면 순서와 상관없이 같아지고, x축 180°와 y축 180°처럼 두 곱이 서로 $$-\mathring{q}$$ 관계가 되어 결국 같은 회전이 되는 경우도 있습니다.

## 정리

- 회전은 **순서에 민감**하고, 오일러 각·회전 행렬·깁스 벡터는 각각 짐벌 락, 군더더기, 특이점 같은 약점이 있습니다.
- 단위 사원수 $$\mathring{q} = (\cos\frac{\theta}{2}, \sin\frac{\theta}{2}\hat{\omega})$$로 $$\mathring{q}\mathring{r}\mathring{q}^*$$를 계산하면 회전이 되고, 두 회전은 **곱하기 한 번**으로 합쳐집니다.
- $$\mathring{q}$$와 $$-\mathring{q}$$는 같은 회전이고, 회전의 공간은 정반대 점을 같게 본 4D 단위구입니다.
- 절대 방향의 회전은 4×4 대칭 행렬 $$N$$의 **가장 큰 고유값의 고유벡터**로 닫힌 해가 나옵니다.

_참고: MIT 6.801/6.866 Machine Vision (Fall 2020), Berthold Horn · Ryan Sander · Tadayuki Yoshitake 강의 노트 (MIT OpenCourseWare, CC BY-NC-SA 4.0)_
