/* MIT 머신비전 12강 데모: 계산 분자(커널)로 경계 찾기 + 문턱값 + 비최대 억제 + 흐리기(스케일) */
(function () {
  'use strict';
  var root = document.getElementById('mv-12-stencils');
  if (!root) return;

  var W = 640, H = 340, N = 100, PS = 300, TOP = 30, LX = 10, RX = 330;
  var BLUE = '#2a78d6';
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
  function addRange(label, min, max, step, value) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
    l.appendChild(r); controls.appendChild(l); return r;
  }
  var lab = document.createElement('label'); lab.textContent = '계산 분자 ';
  var sel = document.createElement('select');
  [['sobel', '소벨 (기울기)'], ['roberts', '로버츠 십자 (기울기)'], ['lap5', '라플라시안 + 모양'], ['lap9', '라플라시안 섞은 것']].forEach(function (o) {
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
  });
  lab.appendChild(sel); controls.appendChild(lab);
  var thrR = addRange('문턱값', 0, 0.6, 0.01, 0.2);
  var noiseR = addRange('잡음', 0, 0.12, 0.005, 0.02);
  var blurR = addRange('흐리기(스케일)', 0, 3, 0.1, 0);
  var nl = document.createElement('label');
  var nmsC = document.createElement('input'); nmsC.type = 'checkbox'; nmsC.checked = true;
  nl.appendChild(nmsC); nl.appendChild(document.createTextNode(' 비최대 억제 (기울기 분자일 때)'));
  controls.appendChild(nl);

  // ---------- synthetic scene ----------
  var NN = N * N, base = new Float64Array(NN), noise = new Float64Array(NN);
  function smooth(d, w) { return 1 / (1 + Math.exp(-d / w)); }
  (function build() {
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var x = j + 0.5, y = i + 0.5, v = 0.3;
      v += 0.5 * smooth(22 - Math.hypot(x - 32, y - 34), 0.35);                         // bright disc, sharp
      var dr = Math.min(16 - Math.abs(x - 76), 24 - Math.abs(y - 36));
      v += 0.12 * smooth(dr, 0.35);                                                      // faint rectangle
      var db = Math.min(30 - Math.abs(x - 40), 6 - Math.abs(y - 80));
      v -= 0.22 * smooth(db, 0.35);                                                      // dark bar
      v += 0.35 * smooth(13 - Math.hypot(x - 78, y - 80), 3.0);                          // blurry blob
      base[i * N + j] = v;
      var u = 1 - Math.random(), w = Math.random();
      noise[i * N + j] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
    }
  })();

  var img = new Float64Array(NN), tmp = new Float64Array(NN), resp = new Float64Array(NN);
  var gxA = new Float64Array(NN), gyA = new Float64Array(NN), edge = new Uint8Array(NN);
  function at(a, i, j) { i = i < 0 ? 0 : i >= N ? N - 1 : i; j = j < 0 ? 0 : j >= N ? N - 1 : j; return a[i * N + j]; }

  function blur(sig) {
    if (sig < 0.05) return;
    var r = Math.ceil(3 * sig), k = [], s = 0, i, j, t;
    for (t = -r; t <= r; t++) { var e = Math.exp(-t * t / (2 * sig * sig)); k.push(e); s += e; }
    for (t = 0; t < k.length; t++) k[t] /= s;
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      var acc = 0; for (t = -r; t <= r; t++) acc += k[t + r] * at(img, i, j + t); tmp[i * N + j] = acc;
    }
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      var acc2 = 0; for (t = -r; t <= r; t++) acc2 += k[t + r] * at(tmp, i + t, j); img[i * N + j] = acc2;
    }
  }

  var count = 0;
  function compute() {
    var i, j, k, nz = +noiseR.value, op = sel.value;
    for (k = 0; k < NN; k++) img[k] = base[k] + nz * noise[k];
    blur(+blurR.value);
    var mx = 0;
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      k = i * N + j;
      var gx = 0, gy = 0, L = 0;
      if (op === 'sobel') {
        gx = (at(img, i - 1, j + 1) + 2 * at(img, i, j + 1) + at(img, i + 1, j + 1) - at(img, i - 1, j - 1) - 2 * at(img, i, j - 1) - at(img, i + 1, j - 1)) / 8;
        gy = (at(img, i + 1, j - 1) + 2 * at(img, i + 1, j) + at(img, i + 1, j + 1) - at(img, i - 1, j - 1) - 2 * at(img, i - 1, j) - at(img, i - 1, j + 1)) / 8;
      } else if (op === 'roberts') {
        var d1 = at(img, i + 1, j + 1) - at(img, i, j), d2 = at(img, i + 1, j) - at(img, i, j + 1);
        gx = (d1 - d2) / 2; gy = (d1 + d2) / 2;
      } else if (op === 'lap5') {
        L = at(img, i - 1, j) + at(img, i + 1, j) + at(img, i, j - 1) + at(img, i, j + 1) - 4 * img[k];
      } else {
        L = (at(img, i - 1, j - 1) + at(img, i - 1, j + 1) + at(img, i + 1, j - 1) + at(img, i + 1, j + 1) +
          4 * (at(img, i - 1, j) + at(img, i + 1, j) + at(img, i, j - 1) + at(img, i, j + 1)) - 20 * img[k]) / 6;
      }
      gxA[k] = gx; gyA[k] = gy;
      resp[k] = op === 'sobel' || op === 'roberts' ? Math.hypot(gx, gy) : L;
      mx = Math.max(mx, Math.abs(resp[k]));
    }
    var thr = +thrR.value * mx;
    count = 0;
    var isLap = op === 'lap5' || op === 'lap9';
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      k = i * N + j;
      var on = 0;
      if (isLap) {
        // zero crossing of the Laplacian with enough jump across it
        var a = resp[k];
        if (j + 1 < N) { var b = resp[k + 1]; if (a * b < 0 && Math.abs(a - b) > thr && Math.abs(a) <= Math.abs(b)) on = 1; }
        if (j > 0) { var c = resp[k - 1]; if (a * c < 0 && Math.abs(a - c) > thr && Math.abs(a) < Math.abs(c)) on = 1; }
        if (i + 1 < N) { var d = resp[k + N]; if (a * d < 0 && Math.abs(a - d) > thr && Math.abs(a) <= Math.abs(d)) on = 1; }
        if (i > 0) { var e = resp[k - N]; if (a * e < 0 && Math.abs(a - e) > thr && Math.abs(a) < Math.abs(e)) on = 1; }
      } else {
        var m = resp[k];
        if (m > thr) {
          on = 1;
          if (nmsC.checked) {
            // quantise gradient direction to 8 neighbours and keep only the local peak
            var ang = Math.atan2(gyA[k], gxA[k]);
            var q = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
            var di = [0, 1, 1, 1, 0, -1, -1, -1][q], dj = [1, 1, 0, -1, -1, -1, 0, 1][q];
            if (!(m > at(resp, i + di, j + dj) && m >= at(resp, i - di, j - dj))) on = 0;
          }
        }
      }
      edge[k] = on; count += on;
    }
    return mx;
  }

  // ---------- drawing ----------
  var offA = document.createElement('canvas'); offA.width = N; offA.height = N;
  var offB = document.createElement('canvas'); offB.width = N; offB.height = N;
  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function hexRGB(c) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c.trim());
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  }

  function draw() {
    var mx = compute(), k, op = sel.value;
    var isLap = op === 'lap5' || op === 'lap9';
    var a = offA.getContext('2d'), ia = a.createImageData(N, N);
    for (k = 0; k < NN; k++) {
      var g = Math.max(0, Math.min(255, Math.round(255 * img[k])));
      ia.data[4 * k] = g; ia.data[4 * k + 1] = g; ia.data[4 * k + 2] = g; ia.data[4 * k + 3] = 255;
    }
    a.putImageData(ia, 0, 0);
    var b = offB.getContext('2d'), ib = b.createImageData(N, N);
    var bg = hexRGB(col.bg), fg = hexRGB(col.text), dark = (bg[0] + bg[1] + bg[2]) < 384;
    for (k = 0; k < NN; k++) {
      var t = Math.min(1, Math.abs(resp[k]) / (mx || 1)) * 0.35;
      var r = bg[0] + (fg[0] - bg[0]) * t, gg = bg[1] + (fg[1] - bg[1]) * t, bb = bg[2] + (fg[2] - bg[2]) * t;
      if (edge[k]) { r = dark ? 120 : 42; gg = dark ? 175 : 120; bb = dark ? 245 : 214; }
      ib.data[4 * k] = r; ib.data[4 * k + 1] = gg; ib.data[4 * k + 2] = bb; ib.data[4 * k + 3] = 255;
    }
    b.putImageData(ib, 0, 0);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offA, LX, TOP, PS, PS);
    ctx.drawImage(offB, RX, TOP, PS, PS);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.strokeRect(RX + 0.5, TOP + 0.5, PS - 1, PS - 1);
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('입력 사진 (잡음·흐리기 적용)', LX, TOP - 8);
    ctx.fillText(isLap ? '0을 지나는 곳 = 경계 (파랑)' : '경계로 뽑힌 픽셀 (파랑)', RX, TOP - 8);
    readout.textContent = '경계 픽셀 ' + count + '개 · 회색 바탕은 분자 응답의 크기' +
      (isLap ? ' · 라플라시안은 비최대 억제 대신 0을 지나는 곳을 찾습니다' : (nmsC.checked ? ' · 비최대 억제 켬' : ' · 비최대 억제 끔'));
  }

  [thrR, noiseR, blurR].forEach(function (r) { r.addEventListener('input', draw); });
  sel.addEventListener('change', draw);
  nmsC.addEventListener('change', draw);

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
