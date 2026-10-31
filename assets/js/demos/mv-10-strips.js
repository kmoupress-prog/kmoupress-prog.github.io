/* MIT 머신비전 10강 데모: 특성 띠 펼치기 (shape from shading) */
(function () {
  'use strict';
  var root = document.getElementById('mv-10-strips');
  if (!root) return;

  var W = 640, H = 420;
  var MX = 10, MY = 10, MS = 400;          // image map
  var PX = 425, PY = 40, PSZ = 205;         // gradient-space panel
  var L = 1.5, G = 121, h = 2 * L / (G - 1);
  var PQR = 2.5;                            // gradient space shown: [-PQR, PQR]
  var NSTRIP = 32, EPS = 0.06, DS = 0.012, MAXSTEP = 420, PER_FRAME = 2, FRONT = 25;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', AQUA = '#1baf7a', MAGENTA = '#e87ba4';
  var col = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var x = cs.getPropertyValue(name).trim(); return x || fb; }
    col.text = v('--text-color', '#34343c');
    col.muted = v('--text-muted-color', '#757575');
    col.bg = v('--main-bg', '#fff');
  }

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  root.appendChild(canvas);
  var controls = document.createElement('div');
  controls.className = 'mv-controls';
  root.appendChild(controls);
  var readout = document.createElement('div');
  readout.className = 'mv-readout';
  root.appendChild(readout);

  var lab = document.createElement('label');
  lab.textContent = '한 걸음의 기준 ';
  var sel = document.createElement('select');
  [['image', '사진 위 거리'], ['height', '높이 변화'], ['brightness', '밝기 변화']].forEach(function (o) {
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
  });
  lab.appendChild(sel); controls.appendChild(lab);
  var againB = document.createElement('button');
  againB.type = 'button'; againB.textContent = '다시 펼치기';
  controls.appendChild(againB);

  // ---------- surface & image ----------
  function surf(x, y) { return 1 - 0.4 * x * x - 0.8 * y * y + 0.15 * x * y - 0.05 * x * x * x * x; }
  function sp(x, y) { return -0.8 * x + 0.15 * y - 0.2 * x * x * x; }
  function sq(x, y) { return -1.6 * y + 0.15 * x; }
  var ps = 0, qs = 0, ns = 1, bx = 0.39, by = 0.16;
  var E = new Float64Array(G * G), Ex = new Float64Array(G * G), Ey = new Float64Array(G * G);
  function R(p, q) { return Math.max(0, (1 + p * ps + q * qs) / (Math.sqrt(1 + p * p + q * q) * ns)); }
  function Rgrad(p, q) {
    var n2 = 1 + p * p + q * q, num = 1 + p * ps + q * qs, d = Math.pow(n2, 1.5) * ns;
    return [(ps * n2 - p * num) / d, (qs * n2 - q * num) / d];
  }
  var offE = document.createElement('canvas'); offE.width = G; offE.height = G;
  var offR = document.createElement('canvas'); offR.width = 100; offR.height = 100;

  function makeImage() {
    ps = sp(bx, by); qs = sq(bx, by); ns = Math.sqrt(1 + ps * ps + qs * qs);
    var i, j, k;
    for (i = 0; i < G; i++) for (j = 0; j < G; j++) {
      var x = -L + j * h, y = -L + i * h;
      E[i * G + j] = R(sp(x, y), sq(x, y));
    }
    // brightness gradient measured from the image itself (central differences)
    for (i = 0; i < G; i++) for (j = 0; j < G; j++) {
      k = i * G + j;
      var jl = Math.max(0, j - 1), jr = Math.min(G - 1, j + 1), iu = Math.max(0, i - 1), id = Math.min(G - 1, i + 1);
      Ex[k] = (E[i * G + jr] - E[i * G + jl]) / ((jr - jl) * h);
      Ey[k] = (E[id * G + j] - E[iu * G + j]) / ((id - iu) * h);
    }
    var ctxE = offE.getContext('2d'), im = ctxE.createImageData(G, G);
    for (k = 0; k < G * G; k++) {
      var g = Math.round(255 * Math.min(1, E[k]));
      im.data[4 * k] = g; im.data[4 * k + 1] = g; im.data[4 * k + 2] = g; im.data[4 * k + 3] = 255;
    }
    ctxE.putImageData(im, 0, 0);
    var ctxR = offR.getContext('2d'), imR = ctxR.createImageData(100, 100);
    for (i = 0; i < 100; i++) for (j = 0; j < 100; j++) {
      var p = -PQR + (j + 0.5) * 2 * PQR / 100, q = -PQR + (i + 0.5) * 2 * PQR / 100;
      var gg = Math.round(255 * Math.min(1, R(p, q))), kk = 4 * (i * 100 + j);
      imR.data[kk] = gg; imR.data[kk + 1] = gg; imR.data[kk + 2] = gg; imR.data[kk + 3] = 255;
    }
    ctxR.putImageData(imR, 0, 0);
  }
  function bil(A, x, y) {
    var fx = (x + L) / h, fy = (y + L) / h, j = Math.floor(fx), i = Math.floor(fy);
    if (i < 0 || j < 0 || i >= G - 1 || j >= G - 1) return NaN;
    var u = fx - j, v = fy - i, k = i * G + j;
    return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + G] * (1 - u) * v + A[k + G + 1] * u * v;
  }

  // ---------- strips ----------
  var strips = [], steps = 0, running = false, raf = 0;
  function startStrips() {
    strips = [];
    for (var n = 0; n < NSTRIP; n++) {
      var a = 2 * Math.PI * n / NSTRIP;
      var x = bx + EPS * Math.cos(a), y = by + EPS * Math.sin(a);
      // the small cap: here we read it off the true surface (in practice: from brightness curvature)
      var s = { x: x, y: y, z: surf(x, y), p: sp(x, y), q: sq(x, y), pts: [], alive: true, sgn: 1 };
      var g = Rgrad(s.p, s.q);
      s.sgn = (g[0] * (x - bx) + g[1] * (y - by)) > 0 ? 1 : -1;
      s.pts.push([x, y, s.z, s.p, s.q]);
      strips.push(s);
    }
    steps = 0;
  }
  function stepAll() {
    var rule = sel.value, any = false;
    strips.forEach(function (s) {
      if (!s.alive) return;
      var ex = bil(Ex, s.x, s.y), ey = bil(Ey, s.x, s.y), e = bil(E, s.x, s.y);
      if (isNaN(ex) || e < 0.03) { s.alive = false; return; }
      var g = Rgrad(s.p, s.q), Rp = g[0], Rq = g[1], gl = Math.hypot(Rp, Rq);
      var f = rule === 'image' ? gl : rule === 'height' ? Math.abs(s.p * Rp + s.q * Rq) : Math.abs(ex * Rp + ey * Rq);
      if (f < 1e-7 || gl < 1e-9) { s.alive = false; return; }
      var t = DS / f, lim = 0.03 / gl;
      if (t > lim) t = lim;
      t *= s.sgn;
      // the five ODEs
      var nx = s.x + t * Rp, ny = s.y + t * Rq, nz = s.z + t * (s.p * Rp + s.q * Rq);
      var np = s.p + t * ex, nq = s.q + t * ey;
      s.x = nx; s.y = ny; s.z = nz; s.p = np; s.q = nq;
      if (Math.abs(nx) > L - 0.02 || Math.abs(ny) > L - 0.02 || s.pts.length > MAXSTEP) { s.alive = false; return; }
      s.pts.push([nx, ny, nz, np, nq]);
      any = true;
    });
    steps++;
    return any;
  }

  // ---------- drawing ----------
  function mx(x) { return MX + (x + L) / (2 * L) * MS; }
  function my(y) { return MY + (y + L) / (2 * L) * MS; }
  function gx(p) { return PX + (p + PQR) / (2 * PQR) * PSZ; }
  function gy(q) { return PY + (q + PQR) / (2 * PQR) * PSZ; }

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offE, MX, MY, MS, MS);
    ctx.drawImage(offR, PX, PY, PSZ, PSZ);

    // wavefronts
    ctx.setLineDash([5, 4]); ctx.strokeStyle = ORANGE; ctx.lineWidth = 1.4;
    for (var k = FRONT; k < MAXSTEP; k += FRONT) {
      var ok = strips.every(function (s) { return s.pts.length > k; });
      if (!ok) break;
      ctx.beginPath();
      strips.forEach(function (s, n) {
        var P = s.pts[k];
        if (n === 0) ctx.moveTo(mx(P[0]), my(P[1])); else ctx.lineTo(mx(P[0]), my(P[1]));
      });
      ctx.closePath(); ctx.stroke();
    }
    ctx.setLineDash([]);

    // strips in image and in gradient space
    var errSum = 0, errN = 0;
    ctx.lineWidth = 1.6; ctx.strokeStyle = BLUE;
    strips.forEach(function (s) {
      ctx.beginPath();
      s.pts.forEach(function (P, n) { if (n === 0) ctx.moveTo(mx(P[0]), my(P[1])); else ctx.lineTo(mx(P[0]), my(P[1])); });
      ctx.stroke();
      s.pts.forEach(function (P) { errSum += Math.abs(P[2] - surf(P[0], P[1])); errN++; });
    });
    ctx.save();
    ctx.beginPath(); ctx.rect(PX, PY, PSZ, PSZ); ctx.clip();
    ctx.strokeStyle = AQUA; ctx.lineWidth = 1.4;
    strips.forEach(function (s) {
      ctx.beginPath();
      s.pts.forEach(function (P, n) { if (n === 0) ctx.moveTo(gx(P[3]), gy(P[4])); else ctx.lineTo(gx(P[3]), gy(P[4])); });
      ctx.stroke();
    });
    ctx.fillStyle = MAGENTA;
    ctx.beginPath(); ctx.arc(gx(ps), gy(qs), 6, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
    // heads
    ctx.fillStyle = BLUE;
    strips.forEach(function (s) {
      var P = s.pts[s.pts.length - 1];
      ctx.beginPath(); ctx.arc(mx(P[0]), my(P[1]), 2.5, 0, 2 * Math.PI); ctx.fill();
    });
    // bright-point handle
    ctx.strokeStyle = MAGENTA; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(mx(bx), my(by), 11, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // labels
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('기울기 공간 (p, q)', PX, PY - 8);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.strokeRect(PX, PY, PSZ, PSZ);
    ctx.font = '12px sans-serif'; ctx.fillStyle = col.muted; ctx.textBaseline = 'top';
    var ly = PY + PSZ + 10;
    [['파란 선: 사진 위 특성 띠', BLUE], ['주황 점선: 같은 걸음 수의 앞줄', ORANGE], ['청록 선: 띠가 지나며 바뀐 (p, q)', AQUA], ['분홍: 가장 밝은 점 / 그 기울기', MAGENTA]].forEach(function (t, n) {
      ctx.fillStyle = t[1]; ctx.fillRect(PX, ly + n * 20 + 4, 10, 10);
      ctx.fillStyle = col.text; ctx.fillText(t[0], PX + 16, ly + n * 20 + 1);
    });
    var err = errN ? errSum / errN : 0;
    readout.textContent = '걸음 ' + steps + ' · 띠 ' + NSTRIP + '개 · 되살린 높이와 진짜 높이의 평균 차이 ' + err.toFixed(3) +
      ' (높이 범위 약 2)';
  }

  function loop() {
    raf = 0;
    var any = false;
    for (var n = 0; n < PER_FRAME; n++) any = stepAll() || any;
    draw();
    if (any && running) raf = requestAnimationFrame(loop);
    else running = false;
  }
  function restart() {
    startStrips();
    running = true;
    if (!raf) raf = requestAnimationFrame(loop);
    draw();
  }

  // ---------- interaction ----------
  var dragging = false;
  function toWorld(ev) {
    var r = canvas.getBoundingClientRect();
    var cx = (ev.clientX - r.left) * W / r.width, cy = (ev.clientY - r.top) * H / r.height;
    return { cx: cx, cy: cy, x: (cx - MX) / MS * 2 * L - L, y: (cy - MY) / MS * 2 * L - L };
  }
  function setBright(w) {
    bx = Math.max(-1.0, Math.min(1.0, w.x));
    by = Math.max(-0.75, Math.min(0.75, w.y));
    makeImage(); restart();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var w = toWorld(ev);
    if (w.cx < MX || w.cx > MX + MS || w.cy < MY || w.cy > MY + MS) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setBright(w);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setBright(toWorld(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  sel.addEventListener('change', restart);
  againB.addEventListener('click', restart);

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); makeImage(); restart();
})();
