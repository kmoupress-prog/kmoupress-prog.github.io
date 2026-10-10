/* MIT 머신비전 15강: 차분으로 듬성듬성하게 만들어 빠르게 필터링하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-15-sparse');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.link = v('--link-color', '#0056b2');
  }

  var W = 640, H = 420;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '신호, 필터, 차분한 필터, 결과 그래프');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  var lK = document.createElement('label'); lK.textContent = '필터 모양 ';
  var sel = document.createElement('select');
  [['box', '상자 (평균)'], ['tri', '삼각형 (상자 두 번)']].forEach(function (o) {
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
  });
  lK.appendChild(sel); controls.appendChild(lK); sel.addEventListener('change', update);
  var lW = document.createElement('label'); lW.textContent = '필터 폭 ';
  var sW = document.createElement('input'); sW.type = 'range'; sW.min = 1; sW.max = 60; sW.step = 1; sW.value = 12;
  lW.appendChild(sW); controls.appendChild(lW); sW.addEventListener('input', update);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // 신호: 계단 + 물결 + 잡음
  var N = 300, f = new Float64Array(N), seed = 3;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i < N; i++) {
    f[i] = (i > 60 && i < 130 ? 1 : 0) + (i > 200 && i < 215 ? -0.8 : 0) + 0.35 * Math.sin(i / 9) + (rnd() - 0.5) * 0.5;
  }

  var kern, dk, taps, direct, sparseOut, mid, order, ops;
  function update() {
    var w = +sW.value, box = [], k;
    for (k = 0; k < 2 * w + 1; k++) box.push(1 / (2 * w + 1));
    if (sel.value === 'box') { kern = box; order = 1; }
    else { kern = conv(box, box); order = 2; }
    // 필터를 order번 차분 → 바늘 몇 개만 남음
    dk = kern.slice();
    for (var o = 0; o < order; o++) { var nd = [dk[0]]; for (k = 1; k < dk.length; k++) nd.push(dk[k] - dk[k - 1]); nd.push(-dk[dk.length - 1]); dk = nd; }
    taps = [];
    dk.forEach(function (v, j) { if (Math.abs(v) > 1e-12) taps.push([j, v]); });
    // 1) 직접 컨볼루션
    direct = conv(Array.prototype.slice.call(f), kern);
    // 2) 바늘과 컨볼루션(덧셈 몇 번) → order번 누적합
    var L = N + dk.length - 1;
    mid = new Float64Array(L);
    for (var n = 0; n < L; n++) {
      var s = 0;
      for (var t = 0; t < taps.length; t++) { var m = n - taps[t][0]; if (m >= 0 && m < N) s += taps[t][1] * f[m]; }
      mid[n] = s;
    }
    sparseOut = Array.prototype.slice.call(mid);
    for (o = 0; o < order; o++) for (n = 1; n < L; n++) sparseOut[n] += sparseOut[n - 1];
    var maxd = 0;
    for (n = 0; n < direct.length; n++) maxd = Math.max(maxd, Math.abs(direct[n] - sparseOut[n]));
    ops = { direct: kern.length, sparse: taps.length + order, err: maxd };
    draw();
  }
  function conv(a, b) {
    var out = new Array(a.length + b.length - 1).fill(0);
    for (var i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    return out;
  }

  function panel(y0, h, title) {
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText(title, 8, y0);
    ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, y0 + 18 + h / 2); ctx.lineTo(W - 8, y0 + 18 + h / 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  function plot(arr, start, x0, x1, y0, h, scale, col, lw, dash) {
    var n = arr.length;
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var x = x0 + (i + start) * (x1 - x0) / N, y = y0 + 18 + h / 2 - arr[i] * scale;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function stems(arr, x0, y0, h, dx, scale, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    var base = y0 + 18 + h / 2;
    for (var i = 0; i < arr.length; i++) {
      if (Math.abs(arr[i]) < 1e-12) continue;
      var x = x0 + i * dx, y = base - arr[i] * scale;
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
  }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var half = (kern.length - 1) / 2;
    // 1행: 신호와 결과
    panel(0, 130, '신호(회색)와 필터 결과: 파랑 = 그냥 계산, 주황 점선 = 바늘 + 누적합');
    plot(f, 0, 8, W - 8, 0, 130, 40, C.muted, 1);
    plot(direct.slice(half, half + N), 0, 8, W - 8, 0, 130, 40, SERIES[0], 4);
    plot(sparseOut.slice(half, half + N), 0, 8, W - 8, 0, 130, 40, SERIES[1], 2, [6, 4]);
    // 2행: 필터와 차분한 필터
    var y2 = 160, h2 = 100, dx = Math.min(4, 290 / dk.length);
    panel(y2, h2, '필터 (' + kern.length + '칸)');
    ctx.fillStyle = C.text; ctx.fillText(order === 1 ? '한 번 차분 → 바늘 ' + taps.length + '개' : '두 번 차분 → 바늘 ' + taps.length + '개', 330, y2);
    var km = Math.max.apply(null, kern);
    stems(kern, 20, y2, h2, dx, 40 / km, SERIES[0]);
    var dm = 0; dk.forEach(function (v) { dm = Math.max(dm, Math.abs(v)); });
    stems(dk, 340, y2, h2, dx, 40 / dm, SERIES[1]);
    // 3행: 바늘과 컨볼루션한 중간 결과(대부분 작음 = 압축된 모습)
    var y3 = 290, h3 = 110, mm = 1e-9;
    for (var i = 0; i < mid.length; i++) mm = Math.max(mm, Math.abs(mid[i]));
    panel(y3, h3, '바늘과 컨볼루션한 중간 결과 → 이것을 ' + (order === 1 ? '한 번' : '두 번') + ' 누적해 더하면 위의 주황 점선');
    plot(Array.prototype.slice.call(mid, half, half + N), 0, 8, W - 8, y3, h3, 45 / mm, SERIES[1], 1.5);
    readout.innerHTML = '출력 한 칸당 곱셈·덧셈: 그냥 계산 <b>' + ops.direct + '번</b> · 바늘 + 누적합 <b>' + ops.sparse +
      '번</b> · 두 결과의 최대 차이 ' + ops.err.toExponential(1);
  }

  readTheme(); update();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
