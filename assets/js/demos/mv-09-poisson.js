/* MIT 머신비전 9강 데모: 잡음 섞인 바늘 그림 → 높이 지도 (한 줄씩 더하기 vs 최소제곱 반복) */
(function () {
  'use strict';
  var root = document.getElementById('mv-09-poisson');
  if (!root) return;

  var W = 640, H = 300, N = 48, MAP = 190, TOP = 40;
  var XS = [15, 225, 435];
  var MAXIT = 1500, PER_FRAME = 4;
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
  lab.textContent = '잡음 ';
  var noiseR = document.createElement('input');
  noiseR.type = 'range'; noiseR.min = 0; noiseR.max = 1.5; noiseR.step = 0.05; noiseR.value = 0.6;
  lab.appendChild(noiseR); controls.appendChild(lab);
  function addBtn(t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; controls.appendChild(b); return b; }
  var playB = addBtn('멈춤');
  var resetB = addBtn('처음부터');

  var h = 2 / (N - 1), NN = N * N;
  var Z = new Float64Array(NN), P = new Float64Array(NN), Q = new Float64Array(NN);
  var Zrow = new Float64Array(NN), Zls = new Float64Array(NN);
  var nP = new Float64Array(NN), nQ = new Float64Array(NN);
  var iter = 0, playing = true, raf = 0;

  function surf(x, y) {
    return 0.8 * Math.exp(-((x + 0.3) * (x + 0.3) + (y + 0.2) * (y + 0.2)) / 0.15) +
      0.5 * Math.exp(-((x - 0.45) * (x - 0.45) + (y - 0.35) * (y - 0.35)) / 0.08);
  }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  var i, j, k;
  for (i = 0; i < N; i++) for (j = 0; j < N; j++) Z[i * N + j] = surf(-1 + j * h, -1 + i * h);
  for (k = 0; k < NN; k++) { nP[k] = gauss(); nQ[k] = gauss(); }

  function setup() {
    var s = +noiseR.value;
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      k = i * N + j;
      P[k] = (j + 1 < N ? (Z[k + 1] - Z[k]) / h : 0) + s * nP[k];
      Q[k] = (i + 1 < N ? (Z[k + N] - Z[k]) / h : 0) + s * nQ[k];
    }
    // row by row: down the first column, then along each row
    Zrow[0] = 0;
    for (i = 1; i < N; i++) Zrow[i * N] = Zrow[(i - 1) * N] + Q[(i - 1) * N] * h;
    for (i = 0; i < N; i++) for (j = 1; j < N; j++) Zrow[i * N + j] = Zrow[i * N + j - 1] + P[i * N + j - 1] * h;
    Zls.fill(0);
    iter = 0;
  }

  // one Gauss-Seidel sweep of the least-squares equations:
  // new z = average over neighbours of (neighbour height -/+ measured step)
  function sweep() {
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      k = i * N + j;
      var s = 0, c = 0;
      if (j + 1 < N) { s += Zls[k + 1] - P[k] * h; c++; }
      if (j > 0) { s += Zls[k - 1] + P[k - 1] * h; c++; }
      if (i + 1 < N) { s += Zls[k + N] - Q[k] * h; c++; }
      if (i > 0) { s += Zls[k - N] + Q[k - N] * h; c++; }
      Zls[k] = s / c;
    }
    iter++;
  }

  function mean(a) { var s = 0; for (var n = 0; n < NN; n++) s += a[n]; return s / NN; }
  var zMean = mean(Z);
  function rms(a) {
    var m = mean(a), s = 0;
    for (var n = 0; n < NN; n++) { var d = (a[n] - m) - (Z[n] - zMean); s += d * d; }
    return Math.sqrt(s / NN);
  }

  var off = document.createElement('canvas');
  off.width = N; off.height = N;
  var octx = off.getContext('2d');
  var img = octx.createImageData(N, N);
  var stops = [[242, 246, 251], [156, 192, 236], [42, 120, 214], [14, 53, 102]];
  function paint(a, x0) {
    var m = mean(a) - zMean; // align the unknown constant with the truth
    for (var n = 0; n < NN; n++) {
      var t = (a[n] - m + 0.1) / 0.95;
      t = Math.max(0, Math.min(1, t));
      var f = t * 3, s = Math.min(2, Math.floor(f)), u = f - s, A = stops[s], B = stops[s + 1];
      img.data[4 * n] = A[0] + (B[0] - A[0]) * u;
      img.data[4 * n + 1] = A[1] + (B[1] - A[1]) * u;
      img.data[4 * n + 2] = A[2] + (B[2] - A[2]) * u;
      img.data[4 * n + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, x0, TOP, MAP, MAP);
  }

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    paint(Z, XS[0]); paint(Zrow, XS[1]); paint(Zls, XS[2]);
    var titles = ['진짜 모양', '한 줄씩 더하기', '최소제곱 반복 ' + iter + '번'];
    var errs = ['', '오차 ' + rms(Zrow).toFixed(3), '오차 ' + rms(Zls).toFixed(3)];
    ctx.textAlign = 'center';
    for (var n = 0; n < 3; n++) {
      ctx.fillStyle = col.text; ctx.font = 'bold 14px sans-serif'; ctx.textBaseline = 'bottom';
      ctx.fillText(titles[n], XS[n] + MAP / 2, TOP - 10);
      ctx.fillStyle = n === 2 ? '#2a78d6' : col.muted; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText(errs[n], XS[n] + MAP / 2, TOP + MAP + 10);
    }
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('진할수록 높은 곳 · 오차 = 진짜 모양과의 평균 차이', W / 2, TOP + MAP + 34);
    readout.textContent = '반복 ' + iter + '번 · 한 줄씩 더하기 오차 ' + rms(Zrow).toFixed(3) +
      ' · 최소제곱 오차 ' + rms(Zls).toFixed(3) + (iter >= MAXIT ? ' (수렴)' : '');
  }

  function loop() {
    raf = 0;
    if (!playing) return;
    for (var n = 0; n < PER_FRAME && iter < MAXIT; n++) sweep();
    draw();
    if (iter < MAXIT) raf = requestAnimationFrame(loop);
    else { playing = false; playB.textContent = '재생'; }
  }
  function play() {
    playing = true; playB.textContent = '멈춤';
    if (!raf) raf = requestAnimationFrame(loop);
  }

  playB.addEventListener('click', function () {
    if (playing) { playing = false; playB.textContent = '재생'; }
    else { if (iter >= MAXIT) setup(); play(); }
  });
  resetB.addEventListener('click', function () { setup(); draw(); play(); });
  noiseR.addEventListener('input', function () { setup(); draw(); play(); });

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); setup(); draw(); play();
})();
