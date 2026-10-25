/* MIT 머신비전 19강: 절대 방향 닫힌 해 (Horn) — 4×4 행렬 N의 최대 고유벡터 = 회전 사원수, 이상치와 RANSAC */
(function () {
  'use strict';
  var root = document.getElementById('mv-19-absor');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 360;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '두 좌표계에서 잰 점 구름과 맞춘 결과');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val, cb) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', cb); return i;
  }
  var sNoise = slider('잡음', 0, 0.15, 0.005, 0.02, function () { makeData(false); });
  var sOut = slider('이상치 개수', 0, 8, 1, 0, function () { makeData(false); });
  var lR = document.createElement('label'); var cR = document.createElement('input'); cR.type = 'checkbox';
  lR.appendChild(cR); lR.appendChild(document.createTextNode(' RANSAC 쓰기')); controls.appendChild(lR);
  cR.addEventListener('change', solveAndDraw);
  var bNew = document.createElement('button'); bNew.type = 'button'; bNew.textContent = '새 데이터'; controls.appendChild(bNew);
  bNew.addEventListener('click', function () { makeData(true); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // ---------- 수학 ----------
  function qmul(p, q) {
    return [p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3], p[0] * q[1] + p[1] * q[0] + p[2] * q[3] - p[3] * q[2],
      p[0] * q[2] - p[1] * q[3] + p[2] * q[0] + p[3] * q[1], p[0] * q[3] + p[1] * q[2] - p[2] * q[1] + p[3] * q[0]];
  }
  function qrot(q, v) { var r = qmul(qmul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]); return [r[1], r[2], r[3]]; }
  function jacobi4(A) { // 대칭 4×4 고유분해
    var a = A.map(function (r) { return r.slice(); }), V = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    for (var sweep = 0; sweep < 50; sweep++) {
      var off = 0; for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) off += a[i][j] * a[i][j];
      if (off < 1e-20) break;
      for (var p = 0; p < 4; p++) for (var q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (var k = 0; k < 4; k++) { var akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (k = 0; k < 4; k++) { var apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (k = 0; k < 4; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    return { val: [a[0][0], a[1][1], a[2][2], a[3][3]], vec: V };
  }
  function solve(L, R, idx) {
    var n = idx.length, cl = [0, 0, 0], cr = [0, 0, 0], k, i;
    idx.forEach(function (i) { for (k = 0; k < 3; k++) { cl[k] += L[i][k] / n; cr[k] += R[i][k] / n; } });
    var S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    idx.forEach(function (i) {
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) S[a][b] += (L[i][a] - cl[a]) * (R[i][b] - cr[b]);
    });
    var Sxx = S[0][0], Sxy = S[0][1], Sxz = S[0][2], Syx = S[1][0], Syy = S[1][1], Syz = S[1][2], Szx = S[2][0], Szy = S[2][1], Szz = S[2][2];
    var N = [[Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
      [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
      [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
      [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]];
    var e = jacobi4(N), best = 0;
    for (i = 1; i < 4; i++) if (e.val[i] > e.val[best]) best = i;
    var q = [e.vec[0][best], e.vec[1][best], e.vec[2][best], e.vec[3][best]];
    if (q[0] < 0) q = q.map(function (x) { return -x; });
    var rc = qrot(q, cl), t = [cr[0] - rc[0], cr[1] - rc[1], cr[2] - rc[2]];
    return { q: q, t: t, lam: e.val[best] };
  }
  function residual(sol, l, r) { var p = qrot(sol.q, l); return Math.hypot(p[0] + sol.t[0] - r[0], p[1] + sol.t[1] - r[1], p[2] + sol.t[2] - r[2]); }

  // ---------- 데이터 ----------
  var NP = 16, L = [], R = [], qT, tT, isOut = [], sol, inl = [];
  var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function gauss() { return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()); }
  var base = [];
  function makeData(fresh) {
    if (fresh || !base.length) {
      base = []; for (var i = 0; i < NP; i++) base.push([rnd() * 2 - 1, rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7]);
      var ax = [gauss(), gauss(), gauss()], an = Math.hypot(ax[0], ax[1], ax[2]), ang = 0.6 + rnd() * 1.6;
      qT = [Math.cos(ang / 2)].concat(ax.map(function (x) { return Math.sin(ang / 2) * x / an; }));
      tT = [2.2, 0.3 * (rnd() - 0.5), 0.3 * (rnd() - 0.5)];
      base.noise = base.map(function () { return [gauss(), gauss(), gauss()]; });
      base.junk = base.map(function () { return [rnd() * 2.4 - 1.2, rnd() * 2.4 - 1.2, rnd() * 1.6 - 0.8]; });
    }
    var sg = +sNoise.value, no = +sOut.value;
    L = base.map(function (p) { return p.slice(); });
    R = base.map(function (p, i) {
      var r = qrot(qT, p); return [r[0] + tT[0] + sg * base.noise[i][0], r[1] + tT[1] + sg * base.noise[i][1], r[2] + tT[2] + sg * base.noise[i][2]];
    });
    isOut = base.map(function (p, i) { return i < no; });
    for (var k = 0; k < no; k++) R[k] = [base.junk[k][0] + tT[0], base.junk[k][1] + tT[1], base.junk[k][2] + tT[2]];
    solveAndDraw();
  }
  function solveAndDraw() {
    var all = L.map(function (p, i) { return i; });
    if (!cR.checked) { sol = solve(L, R, all); inl = all; }
    else {
      var bestCnt = -1, bestSol = null, thr = Math.max(0.12, 4 * +sNoise.value);
      var s2 = 11;
      for (var it = 0; it < 60; it++) {
        var pick = []; while (pick.length < 3) { s2 = (s2 * 16807) % 2147483647; var j = s2 % NP; if (pick.indexOf(j) < 0) pick.push(j); }
        var sl = solve(L, R, pick), cnt = 0;
        for (var i = 0; i < NP; i++) if (residual(sl, L[i], R[i]) < thr) cnt++;
        if (cnt > bestCnt) { bestCnt = cnt; bestSol = sl; }
      }
      inl = all.filter(function (i) { return residual(bestSol, L[i], R[i]) < thr; });
      sol = solve(L, R, inl.length >= 3 ? inl : all);
    }
    draw();
  }

  // ---------- 그리기 ----------
  var VA = -0.55, VE = 0.38, SC = 95, CX = 205, CY = 190;
  function view(p) {
    var x = p[0] * Math.cos(VA) - p[1] * Math.sin(VA), y = p[0] * Math.sin(VA) + p[1] * Math.cos(VA), z = p[2];
    return [CX + SC * x, CY - SC * (y * Math.sin(VE) + z * Math.cos(VE))];
  }
  function dot(p, col, r, ring) {
    var s = view(p); ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 7);
    if (ring) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); }
  }
  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var A = L.map(function (p) { var r = qrot(sol.q, p); return [r[0] + sol.t[0], r[1] + sol.t[1], r[2] + sol.t[2]]; });
    for (var i = 0; i < NP; i++) {
      var a = view(L[i]), b = view(R[i]);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    L.forEach(function (p) { dot(p, SERIES[0], 4.5); });
    R.forEach(function (p, i) { dot(p, isOut[i] ? C.muted : SERIES[1], 4.5); });
    A.forEach(function (p, i) { dot(p, inl.indexOf(i) >= 0 ? SERIES[2] : SERIES[3], 7.5, true); });
    ctx.font = '12.5px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
    ctx.fillText('파랑: 왼쪽 좌표계 · 주황: 오른쪽 좌표계 (회색 = 이상치) · 초록 고리: 파랑을 추정한 R, t로 옮긴 위치', 8, 8);
    var dq = Math.abs(sol.q[0] * qT[0] + sol.q[1] * qT[1] + sol.q[2] * qT[2] + sol.q[3] * qT[3]);
    var err = 2 * Math.acos(Math.min(1, dq)) * 180 / Math.PI;
    var rms = 0, cnt = 0; for (i = 0; i < NP; i++) if (!isOut[i]) { rms += Math.pow(residual(sol, L[i], R[i]), 2); cnt++; }
    rms = Math.sqrt(rms / Math.max(1, cnt));
    function f(q) { return '(' + q.map(function (x) { return x.toFixed(3); }).join(', ') + ')'; }
    readout.innerHTML = '진짜 q = ' + f(qT) + ' · 추정 q = <b>' + f(sol.q) + '</b><br>' +
      '회전 오차 <b style="color:' + (err < 2 ? SERIES[2] : SERIES[1]) + '">' + err.toFixed(2) + '°</b> · 정상 점들의 평균 어긋남 ' + rms.toFixed(3) +
      (cR.checked ? ' · RANSAC이 고른 정상치 ' + inl.length + '/' + NP + '개' : '') + ' · 최대 고유값 λ = ' + sol.lam.toFixed(2);
  }

  readTheme(); makeData(true);
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
