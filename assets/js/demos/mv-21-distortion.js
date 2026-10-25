/* MIT 머신비전 21강: 방사 왜곡 δ = r·(k1 r² + k2 r⁴) — 곧은 다림줄이 휘어 보인다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-21-distortion');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 380;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '방사 왜곡이 적용된 격자와 다림줄');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  var sK1 = slider('k₁', -0.2, 0.2, 0.01, -0.08);
  var sK2 = slider('k₂', -0.05, 0.05, 0.005, 0);
  var sDx = slider('왜곡 중심 어긋남', 0, 0.3, 0.01, 0);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var S = 150, CX = W / 2, CY = H / 2 + 6;   // 정규 좌표 1 = 150px
  function dist(x, y, k1, k2, dx) {
    var u = x - dx, v = y, r2 = u * u + v * v, f = k1 * r2 + k2 * r2 * r2;
    return [x + u * f, y + v * f];
  }
  function draw() {
    var k1 = +sK1.value, k2 = +sK2.value, dx = +sDx.value;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // 원래 격자(흐리게)
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (var g = -1.6; g <= 1.601; g += 0.2) {
      ctx.beginPath(); ctx.moveTo(CX + g * S, CY - 1.1 * S); ctx.lineTo(CX + g * S, CY + 1.1 * S); ctx.stroke();
      if (Math.abs(g) <= 1.1) { ctx.beginPath(); ctx.moveTo(CX - 1.6 * S, CY + g * S); ctx.lineTo(CX + 1.6 * S, CY + g * S); ctx.stroke(); }
    }
    function poly(fn, col, w) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      for (var t = -1; t <= 1.0001; t += 0.02) { var p = fn(t); if (t === -1) ctx.moveTo(CX + p[0] * S, CY + p[1] * S); else ctx.lineTo(CX + p[0] * S, CY + p[1] * S); }
      ctx.stroke();
    }
    var maxBow = 0;
    for (var gx = -1.4; gx <= 1.401; gx += 0.2) poly(function (t) { return dist(gx, t * 1.05, k1, k2, dx); }, SERIES[0], 1);
    for (var gy = -1.0; gy <= 1.001; gy += 0.2) poly(function (t) { return dist(t * 1.45, gy, k1, k2, dx); }, SERIES[0], 1);
    // 다림줄 두 개
    [-1.2, 1.2].forEach(function (gx) {
      poly(function (t) { return dist(gx, t * 1.05, k1, k2, dx); }, SERIES[2], 3);
      var top = dist(gx, -1.05, k1, k2, dx), mid = dist(gx, 0, k1, k2, dx);
      maxBow = Math.max(maxBow, Math.abs(top[0] - mid[0]) * S);
    });
    ctx.strokeStyle = SERIES[4]; ctx.lineWidth = 2;
    var cx = CX + dx * S; ctx.beginPath(); ctx.moveTo(cx - 9, CY); ctx.lineTo(cx + 9, CY); ctx.moveTo(cx, CY - 9); ctx.lineTo(cx, CY + 9); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = '12.5px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('회색: 원래 격자 · 파랑: 렌즈를 지난 격자 · 초록: 곧아야 할 다림줄 · 보라 +: 왜곡 중심', 8, 6);
    var corner = dist(1.4, 1.0, k1, k2, dx), shift = Math.hypot(corner[0] - 1.4, corner[1] - 1.0) * S;
    readout.innerHTML = (k1 < -0.005 ? '<b style="color:' + SERIES[0] + '">술통형</b>' : k1 > 0.005 ? '<b style="color:' + SERIES[1] + '">바늘꽂이형</b>' : '거의 없음') +
      ' · 다림줄 휨 <b>' + maxBow.toFixed(1) + '</b>px · 모서리 점이 밀린 거리 <b>' + shift.toFixed(1) + '</b>px (중심에서 반지름 1 = ' + S + 'px)';
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
