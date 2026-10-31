/* MIT 머신비전 8강 데모: 하프케 표면에서 밝기만으로 지형 단면 되찾기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-08-profile');
  if (!root) return;

  var W = 640, H = 440;
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

  function slider(text, min, max, step, val, unit) {
    var lab = document.createElement('label');
    lab.textContent = text;
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    var sp = document.createElement('span');
    lab.appendChild(inp); lab.appendChild(sp);
    controls.appendChild(lab);
    inp.addEventListener('input', draw);
    return { inp: inp, sp: sp, unit: unit };
  }
  var sElev = slider('해의 고도', 10, 60, 1, 40, '°');
  var sNoise = slider('사진 잡음', 0, 6, 0.5, 0, '%');
  var newBtn = document.createElement('button');
  newBtn.type = 'button'; newBtn.className = 'btn btn-sm btn-outline-secondary';
  newBtn.textContent = '새 지형';
  controls.appendChild(newBtn);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- terrain ----
  var NX = 200, NY = 56, SC = 3;            // grid and display scale (600 x 168 px)
  var IMG = { x: 20, y: 34 };
  var h = new Float32Array(NX * NY), noise = new Float32Array(NX * NY);
  var seed = 3;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 0.5) / 2147483647; }
  function gauss() { return Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()); }
  function makeTerrain() {
    var i, j, k, craters = [];
    for (k = 0; k < 9; k++) craters.push({ x: rnd() * NX, y: rnd() * NY, r: 6 + rnd() * 16, d: 0.35 + rnd() * 0.25 });
    var w1 = 0.02 + rnd() * 0.03, w2 = 0.05 + rnd() * 0.04, ph = rnd() * 6;
    for (i = 0; i < NY; i++) for (j = 0; j < NX; j++) {
      var z = 4 * Math.sin(j * w1 + ph) + 2 * Math.sin(j * w2 + i * 0.07 + ph * 2) + 2 * Math.cos(i * 0.11 + ph);
      for (k = 0; k < craters.length; k++) {
        var c = craters[k], r = Math.hypot(j - c.x, i - c.y) / c.r;
        if (r < 1) z += c.d * c.r * (r * r - 1) * 0.3;
        z += 0.08 * c.r * Math.exp(-((r - 1) * (r - 1)) / 0.05);
      }
      h[i * NX + j] = z;
    }
    for (k = 0; k < NX * NY; k++) noise[k] = gauss();
  }
  makeTerrain();
  var row = 28;

  var off = document.createElement('canvas'); off.width = NX; off.height = NY;
  var octx = off.getContext('2d'), od = octx.createImageData(NX, NY);

  function slopeAt(i, j) { return j < NX - 1 ? h[i * NX + j + 1] - h[i * NX + j] : h[i * NX + j] - h[i * NX + j - 1]; }

  function draw() {
    var e = parseFloat(sElev.inp.value) * Math.PI / 180, sig = parseFloat(sNoise.inp.value) / 100;
    sElev.sp.textContent = ' ' + sElev.inp.value + sElev.unit;
    sNoise.sp.textContent = ' ' + sNoise.inp.value + sNoise.unit;
    var se = Math.sin(e), ce = Math.cos(e);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // Hapke image, sun from the left in the x-z plane: B^2 = sin(e) + p cos(e)  (independent of the y-slope q)
    var flat = Math.sqrt(se), i, j, k;
    var B = new Float32Array(NX * NY);
    for (i = 0; i < NY; i++) for (j = 0; j < NX; j++) {
      k = i * NX + j;
      var p = slopeAt(i, j);
      var b = Math.sqrt(Math.max(0, se + p * ce)) + sig * flat * noise[k] * 2;
      B[k] = Math.max(0, b);
      var g = Math.round(Math.max(0, Math.min(1, 0.5 * B[k] / flat)) * 255);
      od.data[4 * k] = g; od.data[4 * k + 1] = g; od.data[4 * k + 2] = g; od.data[4 * k + 3] = 255;
    }
    octx.putImageData(od, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, IMG.x, IMG.y, NX * SC, NY * SC);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = col.text; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('달 표면 사진 (햇빛은 왼쪽에서)', IMG.x, 22);
    // selected row
    var ry = IMG.y + (row + 0.5) * SC;
    ctx.strokeStyle = SERIES[1]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(IMG.x, ry); ctx.lineTo(IMG.x + NX * SC, ry); ctx.stroke();
    ctx.beginPath(); ctx.arc(IMG.x + NX * SC + 2, ry, 9, 0, 2 * Math.PI);
    ctx.fillStyle = SERIES[1]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.bg; ctx.stroke();

    // recover this row: p = (B^2 - sin e) / cos e, then add up the slopes from the left edge
    var tru = new Float32Array(NX), rec = new Float32Array(NX), shadow = 0;
    tru[0] = 0; rec[0] = 0;
    for (j = 0; j < NX; j++) {
      k = row * NX + j;
      if (j > 0) tru[j] = h[k] - h[row * NX];
      if (B[k] <= 0) shadow++;
      var pr = (B[k] * B[k] - se) / ce;
      if (j < NX - 1) rec[j + 1] = rec[j] + pr;
    }
    var lo = Infinity, hi = -Infinity, maxErr = 0;
    for (j = 0; j < NX; j++) {
      lo = Math.min(lo, tru[j], rec[j]); hi = Math.max(hi, tru[j], rec[j]);
      maxErr = Math.max(maxErr, Math.abs(tru[j] - rec[j]));
    }
    var span = Math.max(hi - lo, 1);
    var PY0 = 250, PY1 = 420;
    function X(j) { return IMG.x + (j + 0.5) * SC; }
    function Y(z) { return PY1 - (z - lo) / span * (PY1 - PY0); }
    ctx.fillStyle = col.text; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('주황 줄의 단면 (높이)', IMG.x, PY0 - 22);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = col.muted; ctx.fillText('— 실제 지형', IMG.x + 170, PY0 - 22);
    ctx.fillStyle = SERIES[1]; ctx.fillText('— 밝기만으로 되찾은 단면', IMG.x + 260, PY0 - 22);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
    ctx.beginPath(); for (j = 0; j < NX; j++) { if (j) ctx.lineTo(X(j), Y(tru[j])); else ctx.moveTo(X(j), Y(tru[j])); } ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = SERIES[1]; ctx.lineWidth = 1.8;
    ctx.beginPath(); for (j = 0; j < NX; j++) { if (j) ctx.lineTo(X(j), Y(rec[j])); else ctx.moveTo(X(j), Y(rec[j])); } ctx.stroke();
    ctx.fillStyle = col.muted;
    ctx.beginPath(); ctx.arc(X(0), Y(0), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('출발 높이는 알려 줘야 함', X(0) + 8, Y(0) - 8 < PY0 ? Y(0) + 16 : Y(0) - 8);

    var msg = '단면 길이 대비 최대 오차 <b>' + (100 * maxErr / span).toFixed(1) + '%</b>';
    if (shadow > 0) msg += ' · 그림자 ' + shadow + '칸: 밝기 0이라 기울기를 알 수 없어 오차가 생깁니다';
    else if (sig > 0) msg += ' · 잡음이 한 칸씩 더해지며 오른쪽으로 갈수록 오차가 쌓입니다';
    else msg += ' · 잡음과 그림자가 없으면 정확히 겹칩니다';
    readout.innerHTML = msg;
  }

  var drag = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setRow(p) {
    row = Math.max(0, Math.min(NY - 1, Math.floor((p.y - IMG.y) / SC)));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x >= IMG.x - 4 && p.x <= IMG.x + NX * SC + 16 && p.y >= IMG.y - 6 && p.y <= IMG.y + NY * SC + 6) {
      drag = true; canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); setRow(p);
    }
  });
  canvas.addEventListener('pointermove', function (ev) { if (drag) setRow(pos(ev)); });
  function end() { drag = false; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  newBtn.addEventListener('click', function () { makeTerrain(); draw(); });

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
