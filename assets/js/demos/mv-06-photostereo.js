/* MIT 머신비전 6강 데모: 포토메트릭 스테레오 — 조명 세 개로 표면 방향 구하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-06-photostereo');
  if (!root) return;

  var W = 640, H = 420;
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

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var controls = document.createElement('div');
  controls.className = 'mv-controls';
  var readout = document.createElement('div');
  readout.className = 'mv-readout';
  root.appendChild(canvas);
  root.appendChild(controls);
  root.appendChild(readout);

  var noiseLab = document.createElement('label');
  noiseLab.textContent = '카메라 잡음';
  var noise = document.createElement('input');
  noise.type = 'range'; noise.min = '0'; noise.max = '8'; noise.step = '0.5'; noise.value = '2';
  var noiseVal = document.createElement('span');
  noiseLab.appendChild(noise); noiseLab.appendChild(noiseVal);
  controls.appendChild(noiseLab);
  function button(text, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = text;
    b.className = 'btn btn-sm btn-outline-secondary';
    b.addEventListener('click', function () { fn(); draw(); });
    controls.appendChild(b);
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- the object: a dome and a bump, with a painted band ----
  var N = 64;
  var nTrue = new Float32Array(N * N * 3), alb = new Float32Array(N * N);
  (function build() {
    var h = new Float32Array(N * N), i, j;
    function X(j) { return -1 + 2 * j / (N - 1); }
    function Y(i) { return 1 - 2 * i / (N - 1); }
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      var x = X(j), y = Y(i);
      h[i * N + j] = 0.5 * Math.exp(-((x + 0.12) * (x + 0.12) + (y - 0.05) * (y - 0.05)) / 0.22) +
        0.22 * Math.exp(-((x - 0.55) * (x - 0.55) + (y + 0.5) * (y + 0.5)) / 0.05);
      alb[i * N + j] = (Math.abs(y - 0.05) < 0.08 && Math.abs(x + 0.12) < 0.5) ? 0.45 : (y < -0.8 ? 0.55 : 0.85);
    }
    var d = 2 / (N - 1);
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      var jl = Math.max(0, j - 1), jr = Math.min(N - 1, j + 1), iu = Math.max(0, i - 1), id = Math.min(N - 1, i + 1);
      var p = (h[i * N + jr] - h[i * N + jl]) / ((jr - jl) * d);
      var q = (h[iu * N + j] - h[id * N + j]) / ((id - iu) * d);
      var l = Math.sqrt(p * p + q * q + 1), k = (i * N + j) * 3;
      nTrue[k] = -p / l; nTrue[k + 1] = -q / l; nTrue[k + 2] = 1 / l;
    }
  })();
  // fixed noise fields (so dragging doesn't flicker)
  var seed = 12345;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 0.5) / 2147483647; }
  var nz = [0, 1, 2].map(function () {
    var a = new Float32Array(N * N);
    for (var k = 0; k < N * N; k++) a[k] = Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
    return a;
  });

  // ---- lights, as points in a top-view disk ----
  var DISK = { x: 118, y: 222, r: 100 };
  var lights;
  function setLights(arr) { lights = arr.map(function (a) { return { x: a[0], y: a[1] }; }); }
  var tilt = Math.sqrt(2 / 3); // mutually orthogonal: polar angle 54.7 deg
  function orthogonal() {
    setLights([0, 1, 2].map(function (k) {
      var t = Math.PI / 2 + k * 2 * Math.PI / 3 + 0.35;
      return [tilt * Math.cos(t), tilt * Math.sin(t)];
    }));
  }
  orthogonal();
  button('서로 직각으로', orthogonal);
  button('한데 모으기', function () { setLights([[-0.12, 0.08], [0.1, 0.1], [0.0, -0.1]]); });
  button('지평선에 늘어놓기', function () { setLights([[-0.97, 0.12], [0.96, 0.2], [0.1, -0.97]]); });

  function svec(L) {
    var r2 = L.x * L.x + L.y * L.y;
    return [L.x, L.y, Math.sqrt(Math.max(0, 1 - r2))];
  }
  function inv3(m) {
    var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
    var A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    var det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-9) return null;
    var r = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d];
    for (var k = 0; k < 9; k++) r[k] /= det;
    return { inv: r, det: det };
  }

  var off = document.createElement('canvas');
  off.width = N; off.height = N;
  var octx = off.getContext('2d');
  var idata = octx.createImageData(N, N);
  function blit(vals, x, y, size) {
    for (var k = 0; k < N * N; k++) {
      var v = Math.max(0, Math.min(1, vals[k])) * 255;
      idata.data[4 * k] = v; idata.data[4 * k + 1] = v; idata.data[4 * k + 2] = v; idata.data[4 * k + 3] = 255;
    }
    octx.putImageData(idata, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, x, y, size, size);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }
  var VIEW = (function () { var v = [0.35, 0.75, 0.56], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();

  function label(t, x, y, color, bold) {
    ctx.fillStyle = color || col.text; ctx.font = (bold ? 'bold ' : '') + '13px sans-serif'; ctx.fillText(t, x, y);
  }

  function draw() {
    var sigma = parseFloat(noise.value) / 100;
    noiseVal.textContent = ' ' + noise.value + '%';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // light disk
    label('조명 위치 (위에서 본 모습)', 18, 26, col.text, true);
    label('가운데 = 카메라 쪽, 테두리 = 지평선', 18, 46, col.muted);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(DISK.x, DISK.y, DISK.r, 0, 2 * Math.PI); ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(DISK.x, DISK.y, DISK.r * tilt, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = col.muted; ctx.beginPath(); ctx.arc(DISK.x, DISK.y, 3, 0, 2 * Math.PI); ctx.fill();

    var S = lights.map(svec);
    var M = [].concat(S[0], S[1], S[2]);
    var I = inv3(M);

    // render three inputs
    var imgs = [0, 1, 2].map(function (k) {
      var s = S[k], out = new Float32Array(N * N);
      for (var p = 0; p < N * N; p++) {
        var d = nTrue[3 * p] * s[0] + nTrue[3 * p + 1] * s[1] + nTrue[3 * p + 2] * s[2];
        out[p] = alb[p] * Math.max(0, d) + sigma * nz[k][p];
      }
      return out;
    });
    var X0 = 268, SZ = 112;
    label('카메라가 찍은 사진 세 장', X0, 26, col.text, true);
    for (var k = 0; k < 3; k++) {
      blit(imgs[k], X0 + k * (SZ + 8), 36, SZ);
      ctx.fillStyle = SERIES[k]; ctx.fillRect(X0 + k * (SZ + 8), 36 + SZ + 2, SZ, 4);
    }

    // solve per pixel
    var rec = new Float32Array(N * N), tru = new Float32Array(N * N);
    var errSum = 0, cnt = 0, shadow = 0;
    for (var p2 = 0; p2 < N * N; p2++) {
      var t0 = nTrue[3 * p2], t1 = nTrue[3 * p2 + 1], t2 = nTrue[3 * p2 + 2];
      tru[p2] = Math.max(0, t0 * VIEW[0] + t1 * VIEW[1] + t2 * VIEW[2]) * 0.9 + 0.05;
      if (!I) { rec[p2] = 0.5; continue; }
      var e0 = imgs[0][p2], e1 = imgs[1][p2], e2 = imgs[2][p2];
      if (e0 <= 0.001 || e1 <= 0.001 || e2 <= 0.001) shadow++;
      var g0 = I.inv[0] * e0 + I.inv[1] * e1 + I.inv[2] * e2;
      var g1 = I.inv[3] * e0 + I.inv[4] * e1 + I.inv[5] * e2;
      var g2 = I.inv[6] * e0 + I.inv[7] * e1 + I.inv[8] * e2;
      var l = Math.hypot(g0, g1, g2) || 1;
      g0 /= l; g1 /= l; g2 /= l;
      rec[p2] = Math.max(0, g0 * VIEW[0] + g1 * VIEW[1] + g2 * VIEW[2]) * 0.9 + 0.05;
      var c = Math.max(-1, Math.min(1, g0 * t0 + g1 * t1 + g2 * t2));
      errSum += Math.acos(c); cnt++;
    }
    var Y1 = 192, SZ2 = 176;
    label('계산으로 되찾은 모양', X0, Y1 - 10, col.text, true);
    blit(rec, X0, Y1, SZ2);
    label('정답 모양', X0 + SZ2 + 16, Y1 - 10, col.text, true);
    blit(tru, X0 + SZ2 + 16, Y1, SZ2);
    label('(색은 빼고 같은 조명으로 다시 그림)', X0, Y1 + SZ2 + 20, col.muted);

    // light handles (drawn last)
    for (var j = 0; j < 3; j++) {
      var hx = DISK.x + lights[j].x * DISK.r, hy = DISK.y - lights[j].y * DISK.r;
      ctx.strokeStyle = SERIES[j]; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(DISK.x, DISK.y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 2 * Math.PI);
      ctx.fillStyle = SERIES[j]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.bg; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(j + 1), hx, hy + 4); ctx.textAlign = 'start';
    }

    var gainTxt;
    if (!I) gainTxt = '조명 세 개가 한 평면에 놓여서 풀 수 없습니다';
    else {
      var G = 0;
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) G += I.inv[a * 3 + b] * I.inv[a * 3 + b];
      var gain = Math.sqrt(G) / Math.sqrt(3);
      gainTxt = '노이즈 증폭: 최적 배치의 <b>' + gain.toFixed(1) + '배</b>';
    }
    var msg = gainTxt;
    if (I) msg += ' · 평균 방향 오차 <b>' + (errSum / Math.max(cnt, 1) * 180 / Math.PI).toFixed(1) + '°</b>';
    if (I && shadow / (N * N) > 0.1) msg += '<br>그림자가 진 곳(' + Math.round(100 * shadow / (N * N)) + '%)은 밝기가 0이 되어 계산이 틀어집니다';
    readout.innerHTML = msg;
  }

  // ---- dragging ----
  var drag = -1;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev), bd = 24; drag = -1;
    for (var j = 0; j < 3; j++) {
      var d = Math.hypot(DISK.x + lights[j].x * DISK.r - p.x, DISK.y - lights[j].y * DISK.r - p.y);
      if (d < bd) { bd = d; drag = j; }
    }
    if (drag >= 0) { canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (drag < 0) return;
    var p = pos(ev);
    var x = (p.x - DISK.x) / DISK.r, y = -(p.y - DISK.y) / DISK.r, r = Math.hypot(x, y);
    if (r > 0.98) { x *= 0.98 / r; y *= 0.98 / r; }
    lights[drag].x = x; lights[drag].y = y;
    draw();
  });
  function end() { drag = -1; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  noise.addEventListener('input', draw);

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  readColors();
  resize();
  draw();
  window.addEventListener('resize', function () { resize(); draw(); });
})();
