---
title: PyTorch 기초 정리 — 텐서, autograd, 그리고 선형회귀
date: 2026-10-10 14:20:00 +0900
categories: [딥러닝, PyTorch]
tags: [pytorch, autograd, linear-regression, gradient-descent]
math: true
---

예전에 공부하면서 만든 노트북([Mastercheifs/Deeplearning](https://github.com/Mastercheifs/Deeplearning))을 정리한 글입니다.
텐서 다루기부터 autograd, `nn.Linear`, 그리고 키–몸무게 선형회귀를 직접 경사하강법으로 푸는 데까지 갑니다.

## 1. 텐서 기본

```python
import torch

A = torch.tensor([[1, 2, 3], [3, 4, 5]])
print(A.shape, A.ndim, A.numel())   # torch.Size([2, 3]) 2 6

torch.zeros(3, 3); torch.ones(5); torch.zeros_like(A)
torch.arange(3, 10, 2)              # tensor([3, 5, 7, 9])
torch.linspace(0, 1, 10)

A @ A.T                              # 행렬 곱 (* 는 원소별 곱)
```

정수로 만들면 `int64`, 소수가 하나라도 있으면 `float32`가 됩니다.
뒤에 나오는 미분은 실수 텐서에서만 되므로 `torch.tensor([1.])`처럼 소수점을 붙여야 합니다.

### 인덱싱

```python
A = torch.tensor([[1, 2, 3], [4, 5, 6], [6, 7, 8]])
A[0, 2]          # 3
A[1, :]          # 1행 전체
A[:, 2]          # 2열 전체
A[1, 0:3:2]      # 1행의 0, 2열
A[A > 3]         # 조건을 만족하는 원소만 1차원으로
```

`A[:][2]`는 `A[:, 2]`와 다릅니다.
`A[:]`가 A 전체를 돌려주고 거기에 `[2]`를 하므로 결과는 **2행**입니다.

### 모양 바꾸기와 쌓기

```python
A = torch.ones(3, 4); B = torch.zeros(3, 4)
torch.cat([A, B], dim=0).shape     # (6, 4)  — 기존 축으로 이어 붙임
torch.stack([A, B]).shape          # (2, 3, 4) — 새 축을 만들어 쌓음
A.unsqueeze(0).shape               # (1, 3, 4)
torch.randint(1, 5, (12,)).reshape(2, 2, 3)
```

`stack`은 `unsqueeze` 후 `cat`을 한 것과 같습니다.

## 2. autograd

`requires_grad=True`인 텐서로 계산하면 PyTorch가 계산 그래프를 기록하고, `backward()`가 연쇄법칙으로 기울기를 채워 줍니다.

```python
x = torch.tensor([1.], requires_grad=True)
y = x ** 2
z = 3 * y
z.backward()
print(x.grad)        # tensor([6.])  — dz/dx = 6x
```

자주 쓰는 도구 세 가지입니다.

| 도구 | 하는 일 | 쓰는 곳 |
|---|---|---|
| `y.retain_grad()` | 중간 텐서의 `.grad`도 남김 | 디버깅 |
| `y.detach()` | 그래프에서 떼어 낸 상수로 만듦 | 값은 쓰되 미분은 막을 때 |
| `with torch.no_grad():` | 그 안의 계산은 그래프를 만들지 않음 | 추론, 파라미터 수동 업데이트 |

`detach` 예시: `w = x**2 + (x**2).detach()`를 미분하면 앞의 항만 미분되어 `x.grad = 2`가 됩니다.

## 3. nn.Linear와 모델 만들기

`nn.Linear(in, out)`은 $$y = xW^\top + b$$입니다. 입력의 **마지막 차원**을 특징(채널)으로 봅니다.

```python
from torch import nn

model = nn.Linear(2, 3)
x = torch.randn(5, 2)       # (데이터 개수, 특징 수) — 예: 사람 5명의 키, 몸무게
model(x).shape              # (5, 3)
```

층을 쌓을 때는 `nn.Sequential`이나 `nn.Module` 상속을 씁니다.

```python
class MyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(2, 5), nn.Sigmoid(),
            nn.Linear(5, 10), nn.Sigmoid(),
            nn.Linear(10, 3),
        )

    def forward(self, x):
        return self.net(x)
```

## 4. 선형회귀를 손으로 풀기

키 $$x$$로 몸무게 $$y$$를 예측하는 $$y = ax + b$$를 찾습니다.

```python
x = torch.tensor([150., 160., 170., 175., 185.])
y = torch.tensor([55., 70., 65., 80., 75.])
```

손실은 평균제곱오차 $$L = \frac{1}{N}\sum (y_i - (ax_i + b))^2$$입니다.
노트북에서는 먼저 $$(a, b)$$ 격자 위에서 $$L$$을 전부 계산해 최솟값을 찾아 보고, 그다음 autograd로 경사하강법을 돌렸습니다.

```python
def fit(x, y, lr, epochs):
    a = torch.tensor(0.0, requires_grad=True)
    b = torch.tensor(0.0, requires_grad=True)
    for _ in range(epochs):
        L = ((y - (a * x + b)) ** 2).mean()
        L.backward()
        with torch.no_grad():      # 업데이트 자체는 그래프에 넣지 않음
            a -= lr * a.grad
            b -= lr * b.grad
        a.grad.zero_()              # 기울기는 누적되므로 매번 비워야 함
        b.grad.zero_()
    return a.item(), b.item(), L.item()
```

### 학습률을 1e-6까지 낮춰야 했던 이유

처음에는 학습률을 조금만 키워도 발산해서 `1e-6`까지 낮췄습니다.
원인은 입력 스케일입니다. $$x$$가 150~185라서 $$\partial L/\partial a$$가 $$\partial L/\partial b$$보다 약 170배 크고, 손실 곡면이 한쪽으로 아주 길쭉해집니다.
$$a$$에 맞춰 학습률을 줄이면 $$b$$는 거의 움직이지 않습니다.

입력을 표준화하면 바로 해결됩니다.

```python
xm, xs = x.mean(), x.std()
a_n, b_n, _ = fit((x - xm) / xs, y, lr=0.1, epochs=100)
a = a_n / xs
b = b_n - a_n * xm / xs           # 원래 스케일로 되돌림
```

| 방법 | 반복 | $$a$$ | $$b$$ | MSE |
|---|---|---|---|---|
| 원래 입력, lr 1e-5 | 1000 | 0.4115 | −0.0003 | 30.43 |
| 표준화 입력, lr 0.1 | 100 | 0.5685 | −26.507 | 26.82 |
| 최소제곱 닫힌 해 (`torch.linalg.lstsq`) | – | 0.5685 | −26.507 | 26.82 |

원래 입력으로는 1000번을 돌려도 $$b$$가 0에서 거의 안 움직이지만, 표준화하면 100번 만에 닫힌 해와 같아집니다.

> 특징마다 스케일이 크게 다르면 경사하강법이 느려지거나 발산합니다. 실제 모델에서 입력 정규화와 BatchNorm/LayerNorm을 쓰는 이유도 같은 맥락입니다.
{: .prompt-info }

## 정리

- 텐서: `shape`/`dtype`부터 확인하고, `cat`과 `stack`의 차이를 구분합니다.
- autograd: `backward()` 뒤에는 `.grad`를 비우고, 업데이트는 `no_grad` 안에서 합니다.
- 경사하강법이 이상하게 느리면 학습률보다 입력 스케일을 먼저 봅니다.
