/* MIT 머신비전 9강 데모: 바늘 그림(기울기)을 길 따라 더해서 높이 구하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-09-paths');
  if (!root) return;

  var W = 640, H = 420, N = 40, MAP = 400, OX = 10, OY = 10;
  var CELL = MAP / N;
  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var col = {};

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var x = cs.getPropertyValue(name).trim(); return x || fb; }
    col.text = v('--text-color', '#34343c');
    col.muted = v('--text-muted-color', '#757575');
    col.bg = v('--main-bg', '#fff');
    col.link = v('--link-color', '#0056b2');
  }

  // ---------- DOM ----------
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  root.appendChild(canvas);
  var controls = document.createElement('div');
  controls.className = 'mv-controls';
  root.appendChild(controls);
  var readout = document.createElement('div');
  readout.className = 'mv-readout';
  root.appendChild(readout);

  function addRange(label, min, max, step, value) {
    var l = document.createElement('label');
    l.textContent = label + ' ';
    var r = document.createElement('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
    l.appendChild(r);
    controls.appendChild(l);
    return r;
  }
  function addCheck(label) {
    var l = document.createElement('label');
    var c = document.createElement('input');
    c.type = 'checkbox';
    l.appendChild(c);
    l.appendChild(document.createTextNode(' ' + label));
    controls.appendChild(l);
    return c;
  }
  var noiseR = addRange('잡음', 0, 1.5, 0.05, 0.6);
  var curlC = addCheck('빙글 도는 성분 섞기');
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '잡음 다시 뽑기';
  controls.appendChild(btn);

  // ---------- data ----------
  var h = 2 / (N - 1);
  var Z = new Float64Array(N * N), P = new Float64Array(N * N), Q = new Float64Array(N * N);
  var nP = new Float64Array(N * N), nQ = new Float64Array(N * N);
  function surf(x, y) {
    return 0.8 * Math.exp(-((x + 0.3) * (x + 0.3) + (y + 0.2) * (y + 0.2)) / 0.15) +
      0.5 * Math.exp(-((x - 0.45) * (x - 0.45) + (y - 0.35) * (y - 0.35)) / 0.08);
  }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) Z[i * N + j] = surf(-1 + j * h, -1 + i * h);
  function redrawNoise() {
    for (var k = 0; k < N * N; k++) { nP[k] = gauss(); nQ[k] = gauss(); }
  }
  redrawNoise();
  function measure() {
    var s = +noiseR.value, curl = curlC.checked ? 0.3 : 0;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var k = i * N + j, x = -1 + j * h, y = -1 + i * h;
      P[k] = (j + 1 < N ? (Z[k + 1] - Z[k]) / h : 0) + s * nP[k] - curl * y;
      Q[k] = (i + 1 < N ? (Z[k + N] - Z[k]) / h : 0) + s * nQ[k] + curl * x;
    }
  }

  var start = { i: N - 3, j: 2 };
  var target = { i: 15, j: 14 };

  // path A: right then up; path B: up then right
  function pathA() {
    var pts = [], j, i;
    for (j = start.j; j !== target.j; j += Math.sign(target.j - start.j)) pts.push([start.i, j]);
    for (i = start.i; i !== target.i; i += Math.sign(target.i - start.i)) pts.push([i, target.j]);
    pts.push([target.i, target.j]);
    return pts;
  }
  function pathB() {
    var pts = [], j, i;
    for (i = start.i; i !== target.i; i += Math.sign(target.i - start.i)) pts.push([i, start.j]);
    for (j = start.j; j !== target.j; j += Math.sign(target.j - start.j)) pts.push([target.i, j]);
    pts.push([target.i, target.j]);
    return pts;
  }
  function walk(pts) {
    var z = 0;
    for (var n = 1; n < pts.length; n++) {
      var a = pts[n - 1], b = pts[n];
      if (b[1] === a[1] + 1) z += P[a[0] * N + a[1]] * h;
      else if (b[1] === a[1] - 1) z -= P[b[0] * N + b[1]] * h;
      else if (b[0] === a[0] + 1) z += Q[a[0] * N + a[1]] * h;
      else if (b[0] === a[0] - 1) z -= Q[b[0] * N + b[1]] * h;
    }
    return z;
  }

  // ---------- drawing ----------
  var off = document.createElement('canvas');
  off.width = N; off.height = N;
  var octx = off.getContext('2d');
  function blues(t) {
    t = Math.max(0, Math.min(1, t));
    var stops = [[242, 246, 251], [156, 192, 236], [42, 120, 214], [14, 53, 102]];
    var f = t * 3, k = Math.min(2, Math.floor(f)), u = f - k;
    var a = stops[k], b = stops[k + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  (function paintMap() {
    var img = octx.createImageData(N, N);
    for (var k = 0; k < N * N; k++) {
      var c = blues(Z[k] / 0.85);
      img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
  })();

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function cx(j) { return OX + (j + 0.5) * CELL; }
  function cy(i) { return OY + (i + 0.5) * CELL; }
  function drawPath(pts, color, shift) {
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var n = 0; n < pts.length; n++) {
      var x = cx(pts[n][1]) + shift, y = cy(pts[n][0]) + shift;
      if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw() {
    measure();
    var A = pathA(), B = pathB();
    var zA = walk(A), zB = walk(B);
    var zT = Z[target.i * N + target.j] - Z[start.i * N + start.j];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, OX, OY, MAP, MAP);
    drawPath(A, SERIES[1], 2);
    drawPath(B, SERIES[0], -2);
    // start / target
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath(); ctx.arc(cx(start.j), cy(start.i), 7, 0, 2 * Math.PI); ctx.fill();
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#0b0b0b';
    ctx.fillText('출발', cx(start.j) + 10, cy(start.i) - 6);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx(target.j), cy(target.i), 10, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // right panel: height scale
    var X0 = 450, top = 40, bot = 380;
    var zmin = -0.6, zmax = 1.4;
    function ys(z) { return bot - (Math.max(zmin, Math.min(zmax, z)) - zmin) / (zmax - zmin) * (bot - top); }
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, top); ctx.lineTo(X0, bot); ctx.stroke();
    ctx.font = '12px sans-serif'; ctx.fillStyle = col.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var t = -0.5; t <= 1.41; t += 0.5) {
      ctx.beginPath(); ctx.moveTo(X0 - 4, ys(t)); ctx.lineTo(X0, ys(t)); ctx.stroke();
      ctx.fillText(t.toFixed(1), X0 - 7, ys(t));
    }
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = col.text;
    ctx.fillText('도착점 높이', X0 - 30, top - 22);
    var marks = [[zT, col.text, '진짜'], [zA, SERIES[1], '길 A (→ 다음 ↑)'], [zB, SERIES[0], '길 B (↑ 다음 →)']];
    var used = [];
    marks.forEach(function (m) {
      var y = ys(m[0]);
      ctx.strokeStyle = m[1]; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X0 + 26, y); ctx.stroke();
      var ty = y;
      used.forEach(function (u) { if (Math.abs(u - ty) < 16) ty = u + (ty >= u ? 16 : -16); });
      used.push(ty);
      ctx.fillStyle = m[1]; ctx.font = (m[2] === '진짜' ? 'bold ' : '') + '13px sans-serif';
      ctx.fillText(m[2] + ' ' + (m[0] >= 0 ? '+' : '') + m[0].toFixed(2), X0 + 32, ty);
    });

    readout.textContent = '진짜 높이 ' + zT.toFixed(2) + ' · 길 A ' + zA.toFixed(2) + ' · 길 B ' + zB.toFixed(2) +
      ' · 두 길의 차이 ' + Math.abs(zA - zB).toFixed(2) + (curlC.checked && +noiseR.value === 0 ? ' (잡음 0인데도 다름: 도는 성분 때문)' : '');
  }

  // ---------- interaction ----------
  var dragging = false;
  function toCell(ev) {
    var r = canvas.getBoundingClientRect();
    var x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
    return { x: x, y: y, i: Math.floor((y - OY) / CELL), j: Math.floor((x - OX) / CELL) };
  }
  function setTarget(c) {
    target.i = Math.max(0, Math.min(N - 1, c.i));
    target.j = Math.max(0, Math.min(N - 1, c.j));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var c = toCell(ev);
    if (c.x < OX || c.x > OX + MAP || c.y < OY || c.y > OY + MAP) return;
    dragging = true;
    canvas.setPointerCapture(ev.pointerId);
    setTarget(c);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setTarget(toCell(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  noiseR.addEventListener('input', draw);
  curlC.addEventListener('change', draw);
  btn.addEventListener('click', function () { redrawNoise(); draw(); });

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
