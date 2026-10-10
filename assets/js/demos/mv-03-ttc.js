/* MIT 머신비전 3강 데모: 밝기 미분만으로 충돌 시간(TTC)과 확장 초점 직접 계산하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-03-ttc');
  if (!root) return;

  var W = 640, H = 330, N = 96, HALF = 0.5, PS = 3, IX = 12, IY = 22;
  var PL = 370, PR = 625, PT = 30, PB = 290, TMAX = 9, YMAX = 12;
  var Z0 = 10, WV = 1, DT = 0.05;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', GREEN = '#1baf7a';
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

  var playBtn = document.createElement('button');
  playBtn.type = 'button'; playBtn.className = 'btn btn-sm btn-outline-secondary'; playBtn.textContent = '일시정지';
  controls.appendChild(playBtn);
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.className = 'btn btn-sm btn-outline-secondary'; resetBtn.textContent = '처음부터';
  controls.appendChild(resetBtn);
  var l1 = document.createElement('label'); l1.textContent = '사진 잡음 ';
  var nR = document.createElement('input'); nR.type = 'range'; nR.min = 0; nR.max = 0.06; nR.step = 0.002; nR.value = 0.01;
  l1.appendChild(nR); controls.appendChild(l1);

  var off = document.createElement('canvas'); off.width = N; off.height = N;
  var octx = off.getContext('2d');
  var img = octx.createImageData(N, N);

  function texture(X, Y) {
    return 0.5 + 0.18 * Math.sin(1.7 * X + 0.4) * Math.cos(1.3 * Y - 0.2) + 0.12 * Math.sin(3.1 * X - 2.3 * Y) +
      0.1 * Math.cos(2.6 * X + 3.4 * Y + 1.0) + 0.08 * Math.sin(5.3 * X + 0.7 * Y);
  }
  function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }

  var E1 = new Float32Array(N * N), E2 = new Float32Array(N * N);
  // camera heads for the wall point that appears at image position foe (f = 1)
  function render(buf, Z, foe, noise) {
    var cx = foe.x * (Z0 - Z), cy = foe.y * (Z0 - Z);
    for (var j = 0; j < N; j++) {
      var y = HALF - (2 * HALF) * j / (N - 1);
      for (var i = 0; i < N; i++) {
        var x = -HALF + (2 * HALF) * i / (N - 1);
        buf[j * N + i] = texture(cx + x * Z, cy + y * Z) + (noise ? noise * gauss() : 0);
      }
    }
  }

  function estimate() {
    var h = 2 * HALF / (N - 1);
    var sxx = 0, sxy = 0, syy = 0, sxg = 0, syg = 0, sgg = 0, bx = 0, by = 0, bg = 0;
    for (var j = 0; j < N - 1; j++) {
      for (var i = 0; i < N - 1; i++) {
        var a = j * N + i, b = a + 1, c = a + N, d = c + 1;
        // brightness derivatives averaged over the 2x2x2 cube (Horn's estimator)
        var ex = ((E1[b] - E1[a]) + (E1[d] - E1[c]) + (E2[b] - E2[a]) + (E2[d] - E2[c])) / (4 * h);
        var ey = -((E1[c] - E1[a]) + (E1[d] - E1[b]) + (E2[c] - E2[a]) + (E2[d] - E2[b])) / (4 * h); // rows go down, y goes up
        var et = ((E2[a] - E1[a]) + (E2[b] - E1[b]) + (E2[c] - E1[c]) + (E2[d] - E1[d])) / (4 * DT);
        var x = -HALF + (i + 0.5) * h, y = HALF - (j + 0.5) * h;
        var g = x * ex + y * ey;
        sxx += ex * ex; sxy += ex * ey; syy += ey * ey; sxg += ex * g; syg += ey * g; sgg += g * g;
        bx -= ex * et; by -= ey * et; bg -= g * et;
      }
    }
    var cOnly = bg / sgg;
    // 3x3 solve by Cramer's rule: [sxx sxy sxg; sxy syy syg; sxg syg sgg] [A B C] = [bx by bg]
    var m = [[sxx, sxy, sxg], [sxy, syy, syg], [sxg, syg, sgg]], r = [bx, by, bg];
    function det3(q) {
      return q[0][0] * (q[1][1] * q[2][2] - q[1][2] * q[2][1]) - q[0][1] * (q[1][0] * q[2][2] - q[1][2] * q[2][0]) +
        q[0][2] * (q[1][0] * q[2][1] - q[1][1] * q[2][0]);
    }
    var D = det3(m), sol = [];
    for (var k = 0; k < 3; k++) {
      var q = m.map(function (row, ri) { return row.map(function (v, ci) { return ci === k ? r[ri] : v; }); });
      sol.push(det3(q) / D);
    }
    return { cOnly: cOnly, A: sol[0], B: sol[1], C: sol[2] };
  }

  var foe = { x: 0.18, y: 0.08 };
  var t, hist, running = true;
  function reset() { t = 0; hist = []; }
  reset();

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function px(tt) { return PL + tt / TMAX * (PR - PL); }
  function py(v) { return PB - Math.min(YMAX, Math.max(0, v)) / YMAX * (PB - PT); }
  function imgPos(x, y) { return { x: IX + (x + HALF) / (2 * HALF) * N * PS, y: IY + (HALF - y) / (2 * HALF) * N * PS }; }

  var cur = null;
  function compute() {
    var Z = Z0 - WV * t, noise = +nR.value;
    render(E1, Z, foe, noise);
    render(E2, Z - WV * DT, foe, noise);
    var e = estimate();
    cur = { t: t, truth: (Z - WV * DT / 2) / WV, c: 1 / e.cOnly, abc: 1 / e.C, fx: -e.A / e.C, fy: -e.B / e.C };
    hist.push(cur);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    // image
    var d = img.data;
    for (var k = 0; k < N * N; k++) {
      var g = Math.max(0, Math.min(255, Math.round(E1[k] * 255)));
      d[4 * k] = d[4 * k + 1] = d[4 * k + 2] = g; d[4 * k + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, IX, IY, N * PS, N * PS);
    ctx.imageSmoothingEnabled = true;
    var f = imgPos(foe.x, foe.y);
    ctx.fillStyle = ORANGE; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    if (cur && Math.abs(cur.fx) < HALF && Math.abs(cur.fy) < HALF) {
      var e = imgPos(cur.fx, cur.fy);
      ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.x - 7, e.y); ctx.lineTo(e.x + 7, e.y); ctx.moveTo(e.x, e.y - 7); ctx.lineTo(e.x, e.y + 7); ctx.stroke();
    }
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('주황 점: 실제로 향하는 곳 (끌어서 바꾸기) · 초록 +: 계산한 확장 초점', IX, IY + N * PS + 6);

    // plot
    ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, PT); ctx.lineTo(PL, PB); ctx.lineTo(PR, PB); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = col.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 4, 8, 12].forEach(function (v) { ctx.fillText(v + '초', PL - 4, py(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 3, 6, 9].forEach(function (v) { ctx.fillText(v, px(v), PB + 4); });
    ctx.fillText('흐른 시간 (초)', (PL + PR) / 2, PB + 18);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = col.text; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px(0), py(Z0 / WV)); ctx.lineTo(px(TMAX), py(Z0 / WV - TMAX)); ctx.stroke(); ctx.setLineDash([]);
    function series(key, c) {
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath();
      hist.forEach(function (h, i) { var v = h[key]; if (!isFinite(v)) v = YMAX; if (i === 0) ctx.moveTo(px(h.t), py(v)); else ctx.lineTo(px(h.t), py(v)); });
      ctx.stroke();
    }
    series('c', BLUE); series('abc', GREEN);
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = col.text; ctx.fillText('- - 진짜 남은 시간', PL + 120, PT - 18);
    ctx.fillStyle = BLUE; ctx.fillText('C만 추정', PL + 10, PT - 18);
    ctx.fillStyle = GREEN; ctx.fillText('A, B, C 추정', PL + 10, PT - 2);

    if (cur) {
      readout.textContent = '진짜 ' + cur.truth.toFixed(2) + '초 · C만 ' + cur.c.toFixed(2) + '초 · A, B, C ' + cur.abc.toFixed(2) +
        '초 · 계산한 확장 초점 (' + cur.fx.toFixed(2) + ', ' + cur.fy.toFixed(2) + '), 실제 (' + foe.x.toFixed(2) + ', ' + foe.y.toFixed(2) + ')';
    }
  }

  var last = null, acc = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!visible) { last = null; return; }
    var dt = last === null ? 0 : Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (running && t < TMAX - 0.6) {
      acc += dt;
      if (acc >= 0.1) { acc = 0; t += 0.1; compute(); draw(); }
    }
  }

  var dragging = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setFoe(p) {
    var x = (p.x - IX) / (N * PS) * 2 * HALF - HALF, y = HALF - (p.y - IY) / (N * PS) * 2 * HALF;
    foe.x = Math.max(-0.4, Math.min(0.4, x)); foe.y = Math.max(-0.4, Math.min(0.4, y));
    reset(); compute(); draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x > IX + N * PS || p.y > IY + N * PS) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setFoe(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setFoe(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  playBtn.addEventListener('click', function () {
    running = !running; playBtn.textContent = running ? '일시정지' : '재생';
    if (running && t >= TMAX - 0.6) { reset(); compute(); draw(); }
  });
  resetBtn.addEventListener('click', function () { reset(); compute(); draw(); });
  nR.addEventListener('change', function () { reset(); compute(); draw(); });

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
  }

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); compute(); draw();
  requestAnimationFrame(loop);
})();
