/* MIT 머신비전 22강: 외부 방향의 2D판 — 표지 세 개 사이의 두 각만으로 내 위치 찾기 (두 원의 교점), 위험한 원 */
(function () {
  'use strict';
  var root = document.getElementById('mv-22-resection');
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
  canvas.setAttribute('aria-label', '표지 세 개와 카메라, 각도로 정해지는 두 원');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  var lab = document.createElement('label'); lab.textContent = '각도 측정 오차 (°) ';
  var sE = document.createElement('input'); sE.type = 'range'; sE.min = 0; sE.max = 2; sE.step = 0.05; sE.value = 0.5;
  lab.appendChild(sE); controls.appendChild(lab); sE.addEventListener('input', draw);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var L = [[190, 125], [320, 50], [450, 125]], cam = [330, 285];
  function ang(p, a, b) {
    var ax = a[0] - p[0], ay = a[1] - p[1], bx = b[0] - p[0], by = b[1] - p[1];
    return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by))));
  }
  function locus(A, B, th, side) { // 현 AB를 각 th로 보는 원 (카메라 쪽)
    var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], c = Math.hypot(dx, dy);
    var ux = -dy / c, uy = dx / c; if ((ux * (side[0] - mx) + uy * (side[1] - my)) < 0) { ux = -ux; uy = -uy; }
    var d = (c / 2) / Math.tan(th);
    return { x: mx + ux * d, y: my + uy * d, r: c / (2 * Math.sin(th)) };
  }
  function reflect(P, o1, o2) { // P를 직선 o1o2에 대해 뒤집기
    var dx = o2.x - o1.x, dy = o2.y - o1.y, L2 = dx * dx + dy * dy;
    var t = ((P[0] - o1.x) * dx + (P[1] - o1.y) * dy) / L2, fx = o1.x + t * dx, fy = o1.y + t * dy;
    return [2 * fx - P[0], 2 * fy - P[1]];
  }
  function circ3(a, b, c) {
    var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    var ux = ((a[0] * a[0] + a[1] * a[1]) * (b[1] - c[1]) + (b[0] * b[0] + b[1] * b[1]) * (c[1] - a[1]) + (c[0] * c[0] + c[1] * c[1]) * (a[1] - b[1])) / d;
    var uy = ((a[0] * a[0] + a[1] * a[1]) * (c[0] - b[0]) + (b[0] * b[0] + b[1] * b[1]) * (a[0] - c[0]) + (c[0] * c[0] + c[1] * c[1]) * (b[0] - a[0])) / d;
    return { x: ux, y: uy, r: Math.hypot(a[0] - ux, a[1] - uy) };
  }
  function draw() {
    var e = +sE.value * Math.PI / 180;
    var t12 = ang(cam, L[0], L[1]), t23 = ang(cam, L[1], L[2]);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var danger = circ3(L[0], L[1], L[2]);
    ctx.strokeStyle = SERIES[1]; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(danger.x, danger.y, danger.r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    var c1 = locus(L[0], L[1], t12, cam), c2 = locus(L[1], L[2], t23, cam);
    [[c1, SERIES[0]], [c2, SERIES[2]]].forEach(function (o) {
      ctx.strokeStyle = o[1]; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(o[0].x, o[0].y, o[0].r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    });
    // 오차가 있을 때의 추정 (네 가지 부호 조합 중 가장 나쁜 것)
    var worst = 0, ests = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (sg) {
      var a = locus(L[0], L[1], t12 + sg[0] * e, cam), b = locus(L[1], L[2], t23 + sg[1] * e, cam), p = reflect(L[1], a, b);
      if (isFinite(p[0])) { ests.push(p); worst = Math.max(worst, Math.hypot(p[0] - cam[0], p[1] - cam[1])); }
    });
    ests.forEach(function (p) { ctx.fillStyle = SERIES[3]; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    L.forEach(function (q) { ctx.beginPath(); ctx.moveTo(cam[0], cam[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
    L.forEach(function (q, i) {
      ctx.fillStyle = SERIES[1]; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill();
      ctx.fillStyle = C.text; ctx.font = '12px sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText('표지 ' + (i + 1), q[0] - 18, q[1] - 9);
    });
    ctx.fillStyle = SERIES[4]; ctx.beginPath(); ctx.moveTo(cam[0], cam[1] - 10); ctx.lineTo(cam[0] - 9, cam[1] + 7); ctx.lineTo(cam[0] + 9, cam[1] + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.text; ctx.font = '12.5px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('보라 삼각형(카메라)을 끌어 보세요 · 파랑/초록 점선: 각 θ12, θ23이 주는 원 · 주황 굵은 원: 위험한 원', 8, 8);
    var dd = Math.abs(Math.hypot(cam[0] - danger.x, cam[1] - danger.y) - danger.r);
    readout.innerHTML = 'θ12 = ' + (t12 * 180 / Math.PI).toFixed(1) + '°, θ23 = ' + (t23 * 180 / Math.PI).toFixed(1) + '° · 각을 ±' + (+sE.value).toFixed(2) + '° 틀리면 위치 오차 최대 <b style="color:' +
      (worst > 40 ? SERIES[1] : SERIES[2]) + '">' + (worst > 999 ? '∞에 가까움' : worst.toFixed(1) + 'px') + '</b> (분홍 점들)' +
      (dd < 12 ? ' · <b style="color:' + SERIES[1] + '">세 표지를 지나는 원 위: 두 원이 겹쳐 위치를 못 정함</b>' : '');
  }

  var drag = false;
  function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  canvas.addEventListener('pointerdown', function (e) { var p = pos(e); if (Math.hypot(p[0] - cam[0], p[1] - cam[1]) < 30) { drag = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); } });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; var p = pos(e); cam = [Math.max(10, Math.min(W - 10, p[0])), Math.max(30, Math.min(H - 10, p[1]))]; draw(); });
  canvas.addEventListener('pointerup', function () { drag = false; }); canvas.addEventListener('pointercancel', function () { drag = false; });

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
