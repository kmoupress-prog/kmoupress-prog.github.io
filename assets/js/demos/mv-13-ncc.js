/* MIT 머신비전 13강: 차이 제곱 vs 정규화 상관 — 밝기/대비를 바꿔 보는 데모 */
(function () {
  'use strict';
  var root = document.getElementById('mv-13-ncc');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c');
    C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff');
    C.link = v('--link-color', '#0056b2');
  }

  var W = 640, H = 465;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '장면, 템플릿, 두 가지 점수 지도');
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div');
  controls.className = 'mv-controls';
  root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label');
    l.textContent = label + ' ';
    var i = document.createElement('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l);
    i.addEventListener('input', update);
    return i;
  }
  var sBright = slider('밝기', -0.3, 0.3, 0.01, 0);
  var sContrast = slider('대비', 0.3, 1.5, 0.01, 1);
  var sNoise = slider('잡음', 0, 0.15, 0.005, 0.02);
  var lOcc = document.createElement('label');
  var cOcc = document.createElement('input'); cOcc.type = 'checkbox';
  lOcc.appendChild(cOcc); lOcc.appendChild(document.createTextNode(' 물건 일부 가리기'));
  controls.appendChild(lOcc);
  cOcc.addEventListener('change', update);
  var bReset = document.createElement('button');
  bReset.type = 'button'; bReset.textContent = '처음으로';
  controls.appendChild(bReset);
  bReset.addEventListener('click', function () {
    sBright.value = 0; sContrast.value = 1; sNoise.value = 0.02; cOcc.checked = false; update();
  });
  var readout = document.createElement('div');
  readout.className = 'mv-readout';
  root.appendChild(readout);

  // ---- 장면 만들기 ----
  var SW = 80, SH = 50, T = 16;
  var base = new Float32Array(SW * SH);
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function gauss() { var u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var noiseField = new Float32Array(SW * SH);
  for (var k = 0; k < SW * SH; k++) noiseField[k] = gauss();
  function inL(x, y, cx, cy, s, rot) { // L 모양 (위쪽 세로, 아래 가로)
    var dx = x - cx, dy = y - cy;
    if (rot) { var t = dx; dx = dy; dy = -t; }
    dx /= s; dy /= s;
    if (dx < -1 || dx > 1 || dy < -1 || dy > 1) return false;
    return dx < -0.3 || dy > 0.4;
  }
  var TX = 56, TY = 24; // 정답 위치(템플릿 중심)
  for (var y = 0; y < SH; y++) {
    for (var x = 0; x < SW; x++) {
      var v = 0.3 + 0.12 * x / SW;
      if (inL(x + 0.5, y + 0.5, TX, TY, 6.5, false)) v = 0.72;
      if (inL(x + 0.5, y + 0.5, 22, 14, 5.5, true)) v = 0.55;
      if (x >= 10 && x < 24 && y >= 30 && y < 44) v = 0.7;
      if ((x - 40) * (x - 40) + (y - 38) * (y - 38) < 30) v = 0.62;
      base[y * SW + x] = v;
    }
  }
  var tmpl = new Float32Array(T * T);
  var tx0 = TX - T / 2, ty0 = TY - T / 2;
  for (y = 0; y < T; y++) for (x = 0; x < T; x++) tmpl[y * T + x] = base[(ty0 + y) * SW + tx0 + x] + 0.02 * noiseField[(ty0 + y) * SW + tx0 + x];
  var tMean = 0, tVar = 0;
  for (k = 0; k < T * T; k++) tMean += tmpl[k];
  tMean /= T * T;
  for (k = 0; k < T * T; k++) tVar += (tmpl[k] - tMean) * (tmpl[k] - tMean);
  var tNorm = Math.sqrt(tVar);

  var MW = SW - T + 1, MH = SH - T + 1;
  var scene = new Float32Array(SW * SH);
  var ssd = new Float32Array(MW * MH), ncc = new Float32Array(MW * MH);
  var best = { ssd: [0, 0], ncc: [0, 0] }, vals = {};

  function compute() {
    var b = +sBright.value, c = +sContrast.value, n = +sNoise.value;
    for (var i = 0; i < SW * SH; i++) {
      var v = (base[i] - 0.5) * c + 0.5 + b + n * noiseField[i];
      scene[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    if (cOcc.checked) {
      for (var y = TY - 8; y < TY + 9; y++) for (var x = TX; x < TX + 9; x++) scene[y * SW + x] = 0.92;
    }
    var bs = 1e9, bn = -2;
    for (var my = 0; my < MH; my++) {
      for (var mx = 0; mx < MW; mx++) {
        var s = 0, sm = 0, sq = 0, cr = 0;
        for (var yy = 0; yy < T; yy++) {
          var row = (my + yy) * SW + mx, trow = yy * T;
          for (var xx = 0; xx < T; xx++) {
            var p = scene[row + xx], q = tmpl[trow + xx];
            var d = p - q; s += d * d; sm += p; sq += p * p; cr += p * (q - tMean);
          }
        }
        var N = T * T;
        var pv = sq - sm * sm / N;
        var r = pv > 1e-9 ? cr / (Math.sqrt(pv) * tNorm) : 0;
        s /= N;
        var id = my * MW + mx;
        ssd[id] = s; ncc[id] = r;
        if (s < bs) { bs = s; best.ssd = [mx, my]; }
        if (r > bn) { bn = r; best.ncc = [mx, my]; }
      }
    }
    vals.ssdBest = bs; vals.nccBest = bn;
    vals.ssdTrue = ssd[ty0 * MW + tx0]; vals.nccTrue = ncc[ty0 * MW + tx0];
  }

  var pc = document.createElement('canvas').getContext('2d');
  function toRGB(col) { // 어떤 CSS 색이든 [r,g,b]로
    pc.clearRect(0, 0, 1, 1); pc.fillStyle = '#fff'; pc.fillStyle = col; pc.fillRect(0, 0, 1, 1);
    var d = pc.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
  }
  function grayImage(arr, w, h) {
    var off = document.createElement('canvas'); off.width = w; off.height = h;
    var oc = off.getContext('2d'), im = oc.createImageData(w, h);
    for (var i = 0; i < w * h; i++) {
      var g = Math.round(arr[i] * 255);
      im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = g; im.data[4 * i + 3] = 255;
    }
    oc.putImageData(im, 0, 0); return off;
  }
  function mapImage(arr, w, h, f, color) { // f: 값 -> 0..1 (1 = 닮음)
    var off = document.createElement('canvas'); off.width = w; off.height = h;
    var oc = off.getContext('2d'), im = oc.createImageData(w, h);
    var bg = toRGB(C.bg), fg = toRGB(color);
    for (var i = 0; i < w * h; i++) {
      var t = Math.max(0, Math.min(1, f(arr[i])));
      for (var ch = 0; ch < 3; ch++) im.data[4 * i + ch] = Math.round(bg[ch] + (fg[ch] - bg[ch]) * t);
      im.data[4 * i + 3] = 255;
    }
    oc.putImageData(im, 0, 0); return off;
  }

  function box(x, y, w, h, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h);
  }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.font = '14px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'bottom';
    var S = 5; // 장면 400x250
    ctx.fillText('장면 (밝기·대비를 바꿔 보세요)', 0, 18);
    ctx.drawImage(grayImage(scene, SW, SH), 0, 22, SW * S, SH * S);
    box(tx0 * S, 22 + ty0 * S, T * S, T * S, C.muted, 1);
    box(best.ssd[0] * S + 2, 22 + best.ssd[1] * S + 2, T * S - 4, T * S - 4, SERIES[1], 3);
    box(best.ncc[0] * S - 3, 22 + best.ncc[1] * S - 3, T * S + 6, T * S + 6, SERIES[0], 3);

    ctx.fillStyle = C.text;
    ctx.fillText('템플릿 (고정)', 430, 18);
    ctx.drawImage(grayImage(tmpl, T, T), 430, 22, T * 6, T * 6);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = SERIES[1]; ctx.fillRect(430, 140, 14, 4);
    ctx.fillStyle = C.text; ctx.fillText('차이 제곱이 고른 곳', 450, 148);
    ctx.fillStyle = SERIES[0]; ctx.fillRect(430, 166, 14, 4);
    ctx.fillStyle = C.text; ctx.fillText('정규화 상관이 고른 곳', 450, 174);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(430, 186, 14, 8);
    ctx.fillText('진짜 위치', 450, 198);

    var MS = 4.5, my0 = 300;
    ctx.font = '14px sans-serif';
    ctx.fillText('차이 제곱 점수 지도 (진할수록 닮음)', 0, my0 - 6);
    var lo = 1e9, hi = -1e9;
    for (var i = 0; i < ssd.length; i++) { lo = Math.min(lo, ssd[i]); hi = Math.max(hi, ssd[i]); }
    ctx.drawImage(mapImage(ssd, MW, MH, function (v) { return 1 - (v - lo) / (hi - lo + 1e-9); }, SERIES[1]), 0, my0, MW * MS, MH * MS);
    ctx.fillText('정규화 상관 점수 지도', 330, my0 - 6);
    ctx.drawImage(mapImage(ncc, MW, MH, function (v) { return v; }, SERIES[0]), 330, my0, MW * MS, MH * MS);
    ctx.lineWidth = 2;
    ctx.strokeStyle = SERIES[1];
    ctx.beginPath(); ctx.arc((best.ssd[0] + 0.5) * MS, my0 + (best.ssd[1] + 0.5) * MS, 8, 0, 7); ctx.stroke();
    ctx.strokeStyle = SERIES[0];
    ctx.beginPath(); ctx.arc(330 + (best.ncc[0] + 0.5) * MS, my0 + (best.ncc[1] + 0.5) * MS, 8, 0, 7); ctx.stroke();
  }

  function ok(p) { return Math.abs(p[0] - tx0) <= 1 && Math.abs(p[1] - ty0) <= 1 ? '맞음' : '틀림'; }
  function update() {
    compute(); draw();
    readout.innerHTML = '진짜 위치에서 · 차이 제곱 평균 <b>' + vals.ssdTrue.toFixed(3) + '</b> (0이면 완벽) · 정규화 상관 <b>' +
      vals.nccTrue.toFixed(2) + '</b> (1이면 완벽)<br>찾은 결과 · 차이 제곱: <b>' + ok(best.ssd) +
      '</b> · 정규화 상관: <b>' + ok(best.ncc) + '</b>';
  }

  readTheme(); update();
  new MutationObserver(function () { readTheme(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var h = function () { readTheme(); draw(); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  }
})();
