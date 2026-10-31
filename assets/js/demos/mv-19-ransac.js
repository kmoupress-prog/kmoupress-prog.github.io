/* MIT 머신비전 19강: RANSAC — 최소 개수(2점)를 뽑아 직선을 세우고, 띠 안에 든 점 수로 겨룬다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-19-ransac');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 340;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '직선 위의 점들과 튀는 점들, 최소제곱 직선과 RANSAC 직선');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val, cb) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', cb); return i;
  }
  function button(text, cb) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; controls.appendChild(b); b.addEventListener('click', cb); return b; }
  var sOut = slider('이상치 비율', 0, 0.7, 0.05, 0.35, function () { gen(); });
  var sEps = slider('띠 반폭 ε', 4, 40, 1, 12, function () { reset(); draw(); });
  button('한 번 뽑기', function () { trial(); draw(); });
  button('50번 뽑기', function () { for (var i = 0; i < 50; i++) trial(); draw(); });
  button('새 데이터', function () { seed = (seed * 48271) % 2147483647; gen(); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var seed = 12345; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var P = [], best, last, tries;
  var TRUE = { m: -0.42, c: 230 };
  function gen() {
    P = []; var n = 40, no = Math.round(n * +sOut.value);
    for (var i = 0; i < n - no; i++) { var x = 30 + rnd() * (W - 60); P.push([x, TRUE.m * x + TRUE.c + (rnd() + rnd() + rnd() - 1.5) * 9, 0]); }
    for (i = 0; i < no; i++) P.push([30 + rnd() * (W - 60), 30 + rnd() * (H - 60), 1]);
    reset(); draw();
  }
  function reset() { best = null; last = null; tries = 0; }
  function lineFrom(a, b) { // ax + by + c = 0 정규화
    var nx = a[1] - b[1], ny = b[0] - a[0], L = Math.hypot(nx, ny); nx /= L; ny /= L;
    return { nx: nx, ny: ny, d: -(nx * a[0] + ny * a[1]) };
  }
  function inliers(l) { var eps = +sEps.value, r = []; P.forEach(function (p, i) { if (Math.abs(l.nx * p[0] + l.ny * p[1] + l.d) < eps) r.push(i); }); return r; }
  function trial() {
    var i = Math.floor(rnd() * P.length), j = Math.floor(rnd() * P.length); if (i === j) j = (j + 1) % P.length;
    var l = lineFrom(P[i], P[j]), inl = inliers(l); tries++;
    last = { l: l, i: i, j: j, inl: inl };
    if (!best || inl.length > best.inl.length) best = last;
  }
  // 수직 거리 최소제곱 직선 (15강의 무게중심 + tan2θ 방법)
  function fit(idx) {
    var n = idx.length, mx = 0, my = 0; idx.forEach(function (i) { mx += P[i][0] / n; my += P[i][1] / n; });
    var a = 0, b = 0, c = 0; idx.forEach(function (i) { var x = P[i][0] - mx, y = P[i][1] - my; a += x * x; b += x * y; c += y * y; });
    var th = 0.5 * Math.atan2(2 * b, a - c), ux = Math.cos(th), uy = Math.sin(th);
    return { nx: -uy, ny: ux, d: uy * mx - ux * my };
  }
  function drawLine(l, col, w, dash) {
    // nx x + ny y + d = 0 를 화면 끝까지
    var pts = [];
    if (Math.abs(l.ny) > 1e-6) { pts.push([0, -(l.d) / l.ny]); pts.push([W, -(l.nx * W + l.d) / l.ny]); }
    else { pts.push([-l.d / l.nx, 0]); pts.push([-l.d / l.nx, H]); }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke(); ctx.setLineDash([]);
  }
  function band(l, col) {
    var eps = +sEps.value;
    ctx.fillStyle = col; ctx.globalAlpha = 0.13; ctx.beginPath();
    var a = { nx: l.nx, ny: l.ny, d: l.d - eps }, b = { nx: l.nx, ny: l.ny, d: l.d + eps };
    function yAt(q, x) { return -(q.nx * x + q.d) / q.ny; }
    if (Math.abs(l.ny) > 0.05) {
      ctx.moveTo(0, yAt(a, 0)); ctx.lineTo(W, yAt(a, W)); ctx.lineTo(W, yAt(b, W)); ctx.lineTo(0, yAt(b, 0)); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var all = P.map(function (p, i) { return i; });
    var ls = fit(all);
    var show = best;
    if (show) band(show.l, SERIES[2]);
    drawLine(ls, SERIES[1], 2, [7, 5]);
    var inset = show ? show.inl : [];
    P.forEach(function (p, i) {
      ctx.fillStyle = inset.indexOf(i) >= 0 ? SERIES[0] : C.muted;
      ctx.beginPath(); ctx.arc(p[0], p[1], 4.5, 0, 7); ctx.fill();
    });
    if (last) { [last.i, last.j].forEach(function (k) { ctx.strokeStyle = SERIES[4]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P[k][0], P[k][1], 9, 0, 7); ctx.stroke(); }); drawLine(last.l, SERIES[4], 1, [2, 4]); }
    var fin = null;
    if (show && show.inl.length >= 2) { fin = fit(show.inl); drawLine(fin, SERIES[2], 2.6); }
    ctx.font = '12.5px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
    ctx.fillText('주황 점선: 모든 점 최소제곱 · 보라: 방금 뽑은 두 점 · 초록: 지금까지 가장 많은 표를 받은 직선', 8, 8);
    function angErr(l) { var a = Math.atan2(-l.nx, l.ny), t = Math.atan(TRUE.m), e = Math.abs(a - t) * 180 / Math.PI; e = e % 180; return Math.min(e, 180 - e); }
    readout.innerHTML = '뽑은 횟수 <b>' + tries + '</b>' + (last ? ' · 방금 직선의 정상치 ' + last.inl.length + '개' : '') +
      (best ? ' · 최고 기록 <b>' + best.inl.length + '</b>/' + P.length + '개' : ' · "한 번 뽑기"를 눌러 보세요') +
      '<br>기울기 오차: 최소제곱 <b style="color:' + SERIES[1] + '">' + angErr(ls).toFixed(1) + '°</b>' +
      (fin ? ' · RANSAC <b style="color:' + SERIES[2] + '">' + angErr(fin).toFixed(1) + '°</b>' : '');
  }

  readTheme(); gen();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
