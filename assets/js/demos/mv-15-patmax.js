/* MIT 머신비전 15강: PatMax식 끌어당기기 — 거리 지도 위에서 점들이 스프링에 끌려 맞춰짐 */
(function () {
  'use strict';
  var root = document.getElementById('mv-15-patmax');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.link = v('--link-color', '#0056b2');
  }
  var pc = document.createElement('canvas').getContext('2d');
  function toRGB(col) {
    pc.clearRect(0, 0, 1, 1); pc.fillStyle = '#fff'; pc.fillStyle = col; pc.fillRect(0, 0, 1, 1);
    var d = pc.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
  }

  var W = 640, H = 400;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '모델 경계의 거리 지도 위에 놓인 점 묶음');
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
  var pose = { x: 360, y: 230, a: 20, s: 1.12 }, iter = 0, anim = 0;
  var sRot = slider('회전', -180, 180, 1, 20, function () { stop(); pose.a = +sRot.value; iter = 0; draw(); });
  var sScl = slider('크기', 0.7, 1.4, 0.01, 1.12, function () { stop(); pose.s = +sScl.value; iter = 0; draw(); });
  var lS = document.createElement('label'); var cS = document.createElement('input'); cS.type = 'checkbox'; cS.checked = true;
  lS.appendChild(cS); lS.appendChild(document.createTextNode(' 크기도 맞추기 (4자유도)')); controls.appendChild(lS);
  button('한 번 당기기', function () { stop(); attract(); draw(); });
  button('계속 당기기', function () { stop(); run(30); });
  button('흐트러뜨리기', function () {
    stop(); pose.x = 320 + (Math.random() - 0.5) * 80; pose.y = 200 + (Math.random() - 0.5) * 60;
    pose.a = Math.round((Math.random() - 0.5) * 50); pose.s = 0.9 + Math.random() * 0.25; iter = 0; syncSliders(); draw();
  });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // ---- 모델(학습한 경계): 열쇠 모양 다각형 ----
  var MODEL = [[-150, -40], [40, -40], [40, -90], [150, -90], [150, 90], [40, 90], [40, 40], [-60, 40], [-60, 10], [-100, 10], [-100, 40], [-150, 40]];
  MODEL = MODEL.map(function (p) { return [320 + p[0], 200 + p[1]]; });
  var CX = 320, CY = 200;
  // 실행 영상에서 찾은 경계 점(모델 기준 좌표)
  var BASE = [];
  (function () {
    for (var i = 0; i < MODEL.length; i++) {
      var a = MODEL[i], b = MODEL[(i + 1) % MODEL.length], ln = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var k = Math.max(1, Math.round(ln / 22));
      for (var j = 0; j < k; j++) {
        var t = (j + 0.5) / k;
        BASE.push([a[0] + (b[0] - a[0]) * t - CX + (Math.random() - 0.5) * 2, a[1] + (b[1] - a[1]) * t - CY + (Math.random() - 0.5) * 2]);
      }
    }
  })();

  function nearest(px, py) { // 모델 경계 위 가장 가까운 점
    var best = 1e18, bx = 0, by = 0;
    for (var i = 0; i < MODEL.length; i++) {
      var a = MODEL[i], b = MODEL[(i + 1) % MODEL.length], dx = b[0] - a[0], dy = b[1] - a[1];
      var t = ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      var qx = a[0] + t * dx, qy = a[1] + t * dy, d = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      if (d < best) { best = d; bx = qx; by = qy; }
    }
    return [bx, by, Math.sqrt(best)];
  }

  // 거리 지도 이미지 (한 번만 계산)
  var G = 2, NX = W / G, NY = H / G, dist = new Float32Array(NX * NY);
  for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) dist[y * NX + x] = nearest((x + 0.5) * G, (y + 0.5) * G)[2];
  var off = document.createElement('canvas'); off.width = NX; off.height = NY;
  function paintField() {
    var bg = toRGB(C.bg), fg = toRGB(SERIES[0]);
    var oc = off.getContext('2d'), im = oc.createImageData(NX, NY);
    for (var i = 0; i < NX * NY; i++) {
      var d = dist[i], v = Math.exp(-d / 45) * 0.85;
      if (d > 3) v = Math.min(1, v + 0.16 * Math.pow(Math.cos(Math.PI * d / 20), 16)); // 같은 거리 선
      for (var ch = 0; ch < 3; ch++) im.data[4 * i + ch] = Math.round(bg[ch] + (fg[ch] - bg[ch]) * v);
      im.data[4 * i + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
  }

  function points() {
    var c = Math.cos(pose.a * Math.PI / 180), s = Math.sin(pose.a * Math.PI / 180);
    return BASE.map(function (p) { return [pose.x + pose.s * (c * p[0] - s * p[1]), pose.y + pose.s * (s * p[0] + c * p[1])]; });
  }

  // 한 번 당기기: 힘의 평균 → 이동, 돌림힘 → 회전, 바깥쪽 힘 → 크기 (강의 노트의 가중 평균식, 가중치는 모두 1)
  function attract() {
    var P = points(), n = P.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += P[i][0]; my += P[i][1]; }
    mx /= n; my /= n;
    var Fx = 0, Fy = 0, tq = 0, sc = 0, rr = 0;
    for (i = 0; i < n; i++) {
      var q = nearest(P[i][0], P[i][1]), fx = q[0] - P[i][0], fy = q[1] - P[i][1];
      var rx = P[i][0] - mx, ry = P[i][1] - my;
      Fx += fx; Fy += fy; tq += rx * fy - ry * fx; sc += rx * fx + ry * fy; rr += rx * rx + ry * ry;
    }
    Fx /= n; Fy /= n;
    var dth = tq / rr, ds = cS.checked ? sc / rr : 0;
    // 점 묶음의 중심(mx,my)을 기준으로 회전·확대 후 이동
    var c = Math.cos(dth), s = Math.sin(dth), ox = pose.x - mx, oy = pose.y - my;
    pose.x = mx + Fx + (1 + ds) * (c * ox - s * oy);
    pose.y = my + Fy + (1 + ds) * (s * ox + c * oy);
    pose.a += dth * 180 / Math.PI; pose.s *= 1 + ds;
    if (pose.a > 180) pose.a -= 360; if (pose.a < -180) pose.a += 360;
    iter++; syncSliders();
  }
  function syncSliders() { sRot.value = Math.round(pose.a); sScl.value = pose.s.toFixed(2); }
  function run(k) {
    if (k <= 0) { anim = 0; return; }
    attract(); draw();
    anim = setTimeout(function () { run(k - 1); }, 90);
  }
  function stop() { if (anim) clearTimeout(anim); anim = 0; }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H);
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath();
    MODEL.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.stroke();
    var P = points(), sum = 0;
    ctx.strokeStyle = SERIES[1]; ctx.lineWidth = 1.2;
    P.forEach(function (p) {
      var q = nearest(p[0], p[1]); sum += q[2];
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    });
    ctx.fillStyle = SERIES[1];
    P.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(pose.x, pose.y, 11, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = SERIES[4]; ctx.beginPath(); ctx.arc(pose.x, pose.y, 11, 0, 7); ctx.stroke();
    ctx.font = '13px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
    ctx.fillText('검은 선: 학습한 모양 · 파란 지도: 경계까지 거리 · 주황: 찾은 경계 점과 스프링', 8, 8);
    readout.innerHTML = '당긴 횟수 <b>' + iter + '</b> · 스프링 평균 길이 <b>' + (sum / P.length).toFixed(2) +
      '</b>픽셀 · 회전 ' + pose.a.toFixed(1) + '° · 크기 ×' + pose.s.toFixed(3);
  }

  var drag = null;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  canvas.addEventListener('pointerdown', function (e) {
    stop(); var p = pos(e); drag = { dx: pose.x - p.x, dy: pose.y - p.y };
    canvas.setPointerCapture(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return; var p = pos(e);
    pose.x = Math.max(0, Math.min(W, p.x + drag.dx)); pose.y = Math.max(0, Math.min(H, p.y + drag.dy)); iter = 0; draw();
  });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); paintField(); draw();
  function retheme() { readTheme(); paintField(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
