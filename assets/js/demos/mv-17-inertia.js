/* MIT 머신비전 17강: 점 구름의 관성 축 — 관성 행렬의 고유벡터, 대칭이면 축이 정해지지 않음 */
(function () {
  'use strict';
  var root = document.getElementById('mv-17-inertia');
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
  canvas.setAttribute('aria-label', '끌어서 옮길 수 있는 점들과 관성 축');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function button(text, cb) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    controls.appendChild(b); b.addEventListener('click', cb); return b;
  }
  var P = [];
  function preset(kind) {
    P = [];
    if (kind === 'long') {
      for (var i = 0; i < 14; i++) {
        var t = (i / 13 - 0.5) * 360, n = ((i * 37) % 11 - 5) * 9;
        var a = -0.45; P.push([W / 2 + t * Math.cos(a) - n * Math.sin(a), H / 2 + t * Math.sin(a) + n * Math.cos(a)]);
      }
    } else if (kind === 'square') {
      var s = 110;
      [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(function (q) { P.push([W / 2 + q[0] * s, H / 2 + q[1] * s]); });
    } else {
      for (var j = 0; j < 12; j++) P.push([120 + Math.random() * 400, 70 + Math.random() * 240]);
    }
    draw();
  }
  button('길쭉한 구름', function () { preset('long'); });
  button('정사각형 (대칭)', function () { preset('square'); });
  button('무작위', function () { preset('rand'); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  function analyse() {
    var n = P.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += P[i][0]; my += P[i][1]; }
    mx /= n; my /= n;
    var sxx = 0, syy = 0, sxy = 0;
    for (i = 0; i < n; i++) { var dx = P[i][0] - mx, dy = P[i][1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    // 관성 행렬 A = (r·r)I − r rᵀ 의 합 = [[syy, −sxy], [−sxy, sxx]]
    var a = syy, b = -sxy, c = sxx;
    var tr = a + c, det = a * c - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    var l1 = tr / 2 - disc, l2 = tr / 2 + disc;  // 최소, 최대
    // 최소 고유값의 고유벡터
    var vx, vy;
    if (Math.abs(b) > 1e-9) { vx = l1 - c; vy = b; } else if (a <= c) { vx = 1; vy = 0; } else { vx = 0; vy = 1; }
    var L = Math.hypot(vx, vy); vx /= L; vy /= L;
    return { mx: mx, my: my, lmin: l1, lmax: l2, vx: vx, vy: vy };
  }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var r = analyse(), ratio = r.lmin / r.lmax;
    var stable = ratio < 0.9;
    var L1 = 230, L2 = 230 * Math.sqrt(Math.max(0.02, 1 - (r.lmax - r.lmin) / r.lmax));
    function axisLine(ux, uy, len, col, w, dash) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(r.mx - ux * len, r.my - uy * len); ctx.lineTo(r.mx + ux * len, r.my + uy * len); ctx.stroke(); ctx.setLineDash([]);
    }
    if (stable) {
      axisLine(r.vx, r.vy, L1, SERIES[1], 2.6);
      axisLine(-r.vy, r.vx, Math.min(L1, 60 + 170 * ratio), SERIES[2], 2.6);
    } else {
      for (var k = 0; k < 8; k++) { var a = k * Math.PI / 8; axisLine(Math.cos(a), Math.sin(a), 170, SERIES[1], 1, [5, 5]); }
    }
    P.forEach(function (p) { ctx.fillStyle = SERIES[0]; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(r.mx - 9, r.my); ctx.lineTo(r.mx + 9, r.my); ctx.moveTo(r.mx, r.my - 9); ctx.lineTo(r.mx, r.my + 9); ctx.stroke();
    ctx.font = '13px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
    ctx.fillText('주황: 관성 최소 축 · 초록: 관성 최대 축 · +: 무게중심 (점을 끌어 보세요)', 8, 8);
    var ang = Math.atan2(-r.vy, r.vx) * 180 / Math.PI; if (ang < -90) ang += 180; if (ang > 90) ang -= 180;
    readout.innerHTML = '최소 관성 ' + (r.lmin / 1000).toFixed(1) + ' · 최대 관성 ' + (r.lmax / 1000).toFixed(1) +
      ' · 비율 <b>' + ratio.toFixed(2) + '</b> · ' +
      (stable ? '주축 각도 <b>' + ang.toFixed(1) + '°</b>' : '<b style="color:' + SERIES[1] + '">두 관성이 거의 같아 축을 정할 수 없음</b>');
  }

  var drag = -1;
  function pos(e) {
    var rr = canvas.getBoundingClientRect();
    return { x: (e.clientX - rr.left) / rr.width * W, y: (e.clientY - rr.top) / rr.height * H };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e), best = 400;
    P.forEach(function (q, i) { var d = (q[0] - p.x) * (q[0] - p.x) + (q[1] - p.y) * (q[1] - p.y); if (d < best) { best = d; drag = i; } });
    if (drag >= 0) { canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (drag < 0) return; var p = pos(e);
    P[drag] = [Math.max(5, Math.min(W - 5, p.x)), Math.max(28, Math.min(H - 5, p.y))]; draw();
  });
  function end() { drag = -1; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); preset('long');
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
