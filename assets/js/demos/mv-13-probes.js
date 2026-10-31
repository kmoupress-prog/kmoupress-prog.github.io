/* MIT 머신비전 13강: PatQuick식 탐침 점 — 모델을 끌어다 맞춰 보는 데모 */
(function () {
  'use strict';
  var root = document.getElementById('mv-13-probes');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.link = v('--link-color', '#0056b2');
  }

  var IW = 160, IH = 100, S = 4, W = IW * S, H = IH * S;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '탐침 점을 장면 위에 올려 맞춰 보는 캔버스');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val, cb) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', cb); return i;
  }
  function button(text, cb) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    controls.appendChild(b); b.addEventListener('click', cb); return b;
  }
  var pose = { x: 50, y: 50, a: 0 };
  var sRot = slider('모델 회전', -180, 180, 1, 0, function () { pose.a = +sRot.value; draw(); });
  var sObj = slider('물건 밝기', 0.05, 0.95, 0.01, 0.8, function () { makeImage(); draw(); });
  var lPol = document.createElement('label');
  var cPol = document.createElement('input'); cPol.type = 'checkbox';
  lPol.appendChild(cPol); lPol.appendChild(document.createTextNode(' 밝기 반전도 허용'));
  controls.appendChild(lPol); cPol.addEventListener('change', draw);
  button('전부 훑어서 찾기', search);
  button('새 장면', function () { newScene(); makeImage(); draw(); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // ---- 모델: L 모양 다각형 → 탐침 점(위치 + 바깥 방향) ----
  var POLY = [[-1, -1], [1, -1], [1, -0.4], [-0.3, -0.4], [-0.3, 1], [-1, 1]];
  var MS = 20; // 모델 반 크기(픽셀)
  var probes = [];
  (function () {
    var area = 0, n = POLY.length, i;
    for (i = 0; i < n; i++) { var p = POLY[i], q = POLY[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
    var sg = area > 0 ? 1 : -1;
    for (i = 0; i < n; i++) {
      var a = POLY[i], b = POLY[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], ln = Math.hypot(dx, dy);
      var k = Math.max(1, Math.round(ln / 0.32));
      for (var j = 0; j < k; j++) {
        var t = (j + 0.5) / k;
        probes.push({ x: a[0] + dx * t, y: a[1] + dy * t, nx: sg * dy / ln, ny: -sg * dx / ln });
      }
    }
  })();

  // ---- 장면 ----
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var truth = {}, noise = new Float32Array(IW * IH);
  function newScene() {
    truth = { x: 40 + rnd() * 80, y: 30 + rnd() * 40, a: Math.round(rnd() * 360 - 180) };
    for (var i = 0; i < IW * IH; i++) noise[i] = (rnd() + rnd() + rnd() - 1.5) * 0.06;
    truth.cx = truth.x > 80 ? 30 : 130; truth.cy = 25 + rnd() * 50;
  }
  function inside(px, py, P) {
    var c = false;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (((P[i][1] > py) !== (P[j][1] > py)) && (px < (P[j][0] - P[i][0]) * (py - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c;
    }
    return c;
  }
  function placed(P, x, y, a, s) {
    var c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180);
    return P.map(function (p) { return [x + s * (c * p[0] - si * p[1]), y + s * (si * p[0] + c * p[1])]; });
  }
  var img = new Float32Array(IW * IH), gx = new Float32Array(IW * IH), gy = new Float32Array(IW * IH);
  var off = document.createElement('canvas'); off.width = IW; off.height = IH;
  function makeImage() {
    var obj = +sObj.value, bg = 0.45;
    var P = placed(POLY, truth.x, truth.y, truth.a, MS);
    var R = placed([[-1, -0.6], [1, -0.6], [1, 0.6], [-1, 0.6]], truth.cx, truth.cy, 30, 12);
    for (var y = 0; y < IH; y++) for (var x = 0; x < IW; x++) {
      var v = 0, ss = 0;
      for (var sy = 0; sy < 2; sy++) for (var sx = 0; sx < 2; sx++) {
        var px = x + 0.25 + 0.5 * sx, py = y + 0.25 + 0.5 * sy, u = bg;
        if (inside(px, py, P)) u = obj;
        else if (inside(px, py, R)) u = 0.75;
        else if ((px - 80) * (px - 80) + (py - (truth.y > 50 ? 20 : 80)) * (py - (truth.y > 50 ? 20 : 80)) < 120) u = 0.2;
        v += u; ss++;
      }
      img[y * IW + x] = v / ss + noise[y * IW + x];
    }
    for (y = 1; y < IH - 1; y++) for (x = 1; x < IW - 1; x++) {
      var i = y * IW + x;
      gx[i] = (img[i - IW + 1] + 2 * img[i + 1] + img[i + IW + 1] - img[i - IW - 1] - 2 * img[i - 1] - img[i + IW - 1]) / 8;
      gy[i] = (img[i + IW - 1] + 2 * img[i + IW] + img[i + IW + 1] - img[i - IW - 1] - 2 * img[i - IW] - img[i - IW + 1]) / 8;
    }
    var oc = off.getContext('2d'), im = oc.createImageData(IW, IH);
    for (i = 0; i < IW * IH; i++) {
      var g = Math.max(0, Math.min(255, Math.round(img[i] * 255)));
      im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = g; im.data[4 * i + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
  }

  // 탐침 하나의 점수: 그 자리의 밝기 변화 방향이 탐침 방향과 맞으면 1
  function probeScore(p, x, y, c, s, absPol) {
    var px = x + MS * (c * p.x - s * p.y), py = y + MS * (s * p.x + c * p.y);
    var ix = Math.round(px), iy = Math.round(py);
    if (ix < 1 || iy < 1 || ix >= IW - 1 || iy >= IH - 1) return 0;
    var k = iy * IW + ix, vx = gx[k], vy = gy[k], m = Math.hypot(vx, vy);
    if (m < 0.03) return 0;
    var nx = c * p.nx - s * p.ny, ny = s * p.nx + c * p.ny;
    var cs = -(vx * nx + vy * ny) / m; // 물건이 밝으면 기울기는 안쪽(-n)을 향함
    if (absPol) cs = Math.abs(cs);
    return Math.max(0, Math.min(1, (cs - 0.75) / 0.2));
  }
  function totalScore(x, y, a, absPol) {
    var c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), t = 0;
    for (var i = 0; i < probes.length; i++) t += probeScore(probes[i], x, y, c, s, absPol);
    return t / probes.length;
  }

  var searchInfo = '';
  function search() {
    var t0 = performance.now(), best = -1, bp = null, n = 0, absPol = cPol.checked;
    for (var a = -180; a < 180; a += 6) for (var y = 10; y < IH - 10; y += 2) for (var x = 10; x < IW - 10; x += 2) {
      var sc = totalScore(x, y, a, absPol); n++;
      if (sc > best) { best = sc; bp = { x: x, y: y, a: a }; }
    }
    pose = bp; sRot.value = bp.a;
    searchInfo = '훑어본 자세 ' + n.toLocaleString() + '가지 (위치 2픽셀, 각도 6° 간격) · ' + Math.round(performance.now() - t0) + 'ms';
    draw();
  }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, W, H);
    var c = Math.cos(pose.a * Math.PI / 180), s = Math.sin(pose.a * Math.PI / 180), absPol = cPol.checked, tot = 0, hit = 0;
    for (var i = 0; i < probes.length; i++) {
      var p = probes[i], sc = probeScore(p, pose.x, pose.y, c, s, absPol);
      tot += sc; if (sc > 0.5) hit++;
      var px = (pose.x + MS * (c * p.x - s * p.y) + 0.5) * S, py = (pose.y + MS * (s * p.x + c * p.y) + 0.5) * S;
      var nx = c * p.nx - s * p.ny, ny = s * p.nx + c * p.ny;
      var col = sc > 0.5 ? SERIES[2] : SERIES[1];
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * 14, py + ny * 14); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fill();
    }
    var hx = (pose.x + 0.5) * S, hy = (pose.y + 0.5) * S;
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = SERIES[0]; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 7); ctx.stroke();
    var score = tot / probes.length;
    readout.innerHTML = '점수 <b>' + Math.round(score * 100) + '%</b> · 맞은 탐침 ' + hit + ' / ' + probes.length +
      ' · 모델 각도 ' + Math.round(pose.a) + '°' + (searchInfo ? '<br>' + searchInfo : '');
  }

  // ---- 끌기 ----
  var drag = null;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W / S, y: (e.clientY - r.top) / r.height * H / S };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e); drag = { dx: pose.x - p.x, dy: pose.y - p.y };
    if (Math.hypot(pose.x - p.x, pose.y - p.y) > 30) { drag = { dx: 0, dy: 0 }; pose.x = p.x; pose.y = p.y; draw(); }
    canvas.setPointerCapture(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return; var p = pos(e);
    pose.x = Math.max(0, Math.min(IW, p.x + drag.dx)); pose.y = Math.max(0, Math.min(IH, p.y + drag.dy));
    searchInfo = ''; draw();
  });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); newScene(); makeImage(); draw();
  new MutationObserver(function () { readTheme(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var h = function () { readTheme(); draw(); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  }
})();
