/* MIT 머신비전 20강: 위험한 곡면의 2D 그림 — 두 표지를 같은 각으로 보는 위치는 원 위에 늘어서 있다 (원주각) */
(function () {
  'use strict';
  var root = document.getElementById('mv-20-valley');
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
  canvas.setAttribute('aria-label', '두 표지와 비행기, 같은 각을 주는 원');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function button(text, cb) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; controls.appendChild(b); b.addEventListener('click', cb); return b; }
  var anim = 0, mode = '';
  button('원 따라 날기', function () { start('circle'); });
  button('직선으로 날기', function () { start('line'); });
  button('멈춤', function () { stop(); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var A = [230, 292], Bp = [410, 292], plane = [300, 150];
  var hist = [];
  function angleAt(p) {
    var ax = A[0] - p[0], ay = A[1] - p[1], bx = Bp[0] - p[0], by = Bp[1] - p[1];
    return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by)))) * 180 / Math.PI;
  }
  function circleThrough(p) { // A, B, p를 지나는 원
    var ax = A[0], ay = A[1], bx = Bp[0], by = Bp[1], cx = p[0], cy = p[1];
    var d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-6) return null;
    var ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    var uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { x: ux, y: uy, r: Math.hypot(ax - ux, ay - uy) };
  }
  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // 땅
    ctx.fillStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 8) ctx.lineTo(x, 302 - 0.0011 * Math.pow(x - 320, 2));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    var c = circleThrough(plane);
    if (c) {
      ctx.strokeStyle = SERIES[0]; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    // 지나온 자취와 각
    hist.forEach(function (h) { ctx.fillStyle = mode === 'circle' ? SERIES[0] : SERIES[2]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(h[0], h[1], 2.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plane[0], plane[1]); ctx.lineTo(A[0], A[1]); ctx.moveTo(plane[0], plane[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke();
    [A, Bp].forEach(function (q, i) {
      ctx.fillStyle = SERIES[1]; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill();
      ctx.fillStyle = C.text; ctx.font = '12px sans-serif'; ctx.textBaseline = 'top'; ctx.fillText('표지 ' + (i + 1), q[0] - 18, q[1] + 10);
    });
    // 비행기 (삼각형)
    ctx.fillStyle = SERIES[4]; ctx.beginPath();
    ctx.moveTo(plane[0], plane[1] - 9); ctx.lineTo(plane[0] - 8, plane[1] + 6); ctx.lineTo(plane[0] + 8, plane[1] + 6); ctx.closePath(); ctx.fill();
    var ang = angleAt(plane);
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('보라 삼각형(비행기)을 끌어 보세요 · 파란 점선 = 같은 각으로 보이는 위치들', 8, 8);
    ctx.font = 'bold 14px sans-serif'; ctx.fillText(ang.toFixed(1) + '°', plane[0] + 12, plane[1] - 18);
    var spread = '';
    if (hist.length > 3) {
      var mn = 1e9, mx = -1e9; hist.forEach(function (h) { var a = angleAt(h); mn = Math.min(mn, a); mx = Math.max(mx, a); });
      spread = ' · 지나오는 동안 각의 변화 폭 <b style="color:' + (mx - mn < 0.5 ? SERIES[1] : SERIES[2]) + '">' + (mx - mn).toFixed(2) + '°</b>' +
        (mx - mn < 0.5 ? ' → 각만으로는 어디쯤인지 알 수 없음' : ' → 각으로 위치를 구별할 수 있음');
    }
    readout.innerHTML = '두 표지 사이의 각 <b>' + ang.toFixed(1) + '°</b>' + spread;
  }
  var t0 = 0;
  function start(m) {
    stop(); mode = m; hist = []; t0 = 0;
    var c = circleThrough(plane);
    var base = plane.slice(), a0 = c ? Math.atan2(plane[1] - c.y, plane[0] - c.x) : 0;
    function step() {
      t0 += 1;
      if (m === 'circle' && c) {
        var a = a0 + 0.9 * Math.sin(t0 / 40);
        plane = [c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)];
        if (plane[1] > 282) { plane = hist.length ? hist[hist.length - 1].slice() : base; }
      } else {
        plane = [base[0] + 160 * Math.sin(t0 / 40), base[1]];
      }
      hist.push(plane.slice()); if (hist.length > 200) hist.shift();
      draw(); anim = requestAnimationFrame(step);
    }
    step();
  }
  function stop() { if (anim) cancelAnimationFrame(anim); anim = 0; }

  var drag = false;
  function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e); if (Math.hypot(p[0] - plane[0], p[1] - plane[1]) < 30) { stop(); hist = []; drag = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; var p = pos(e); plane = [Math.max(10, Math.min(W - 10, p[0])), Math.max(30, Math.min(282, p[1]))]; draw(); });
  canvas.addEventListener('pointerup', function () { drag = false; }); canvas.addEventListener('pointercancel', function () { drag = false; });

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
