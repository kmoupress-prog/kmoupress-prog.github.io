/* MIT 머신비전 14강: 허프 변환으로 직선 찾기 — 점을 찍으면 투표함이 반응 */
(function () {
  'use strict';
  var root = document.getElementById('mv-14-hough-line');
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

  var W = 640, H = 350, BOX = 300, IX = 8, AX = 332, TOP = 34;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '왼쪽은 점을 찍는 사진, 오른쪽은 허프 투표함');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function button(text, cb) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    controls.appendChild(b); b.addEventListener('click', cb); return b;
  }
  button('끊어진 직선 + 잡음', function () { preset(1); });
  button('직선 두 개', function () { preset(2); });
  button('모두 지우기', function () { pts = []; last = -1; recompute(); });
  var l2 = document.createElement('label'); var c2 = document.createElement('input'); c2.type = 'checkbox';
  l2.appendChild(c2); l2.appendChild(document.createTextNode(' 두 번째 봉우리도 찾기')); controls.appendChild(l2);
  c2.addEventListener('change', recompute);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var NT = 180, NR = 150, RMAX = BOX * 0.72;
  var acc = new Float32Array(NT * NR);
  var COS = [], SIN = [];
  for (var t = 0; t < NT; t++) { COS.push(Math.cos(t * Math.PI / NT)); SIN.push(Math.sin(t * Math.PI / NT)); }
  var pts = [], last = -1, peaks = [], hover = null;
  var off = document.createElement('canvas'); off.width = NT; off.height = NR;

  function rhoOf(p, t) { return (p.x - BOX / 2) * COS[t] + (p.y - BOX / 2) * SIN[t]; }
  function recompute() {
    acc.fill(0);
    pts.forEach(function (p) {
      for (var t = 0; t < NT; t++) {
        var r = (rhoOf(p, t) + RMAX) / (2 * RMAX) * (NR - 1), r0 = Math.floor(r), f = r - r0;
        if (r0 >= 0 && r0 < NR - 1) { acc[r0 * NT + t] += 1 - f; acc[(r0 + 1) * NT + t] += f; }
      }
    });
    // 봉우리: 이웃 칸을 조금 묶어서 센 값이 가장 큰 곳
    peaks = [];
    var want = c2.checked ? 2 : 1;
    for (var k = 0; k < want && pts.length >= 2; k++) {
      var best = -1, bt = 0, br = 0;
      for (var r = 1; r < NR - 1; r++) for (var tt = 0; tt < NT; tt++) {
        var s = acc[r * NT + tt] + 0.5 * (acc[(r - 1) * NT + tt] + acc[(r + 1) * NT + tt]);
        var skip = false;
        for (var q = 0; q < peaks.length; q++) {
          var dt = Math.abs(tt - peaks[q].t); dt = Math.min(dt, NT - dt);
          if (dt < 12 && Math.abs(r - peaks[q].r) < 12) skip = true;
        }
        if (!skip && s > best) { best = s; bt = tt; br = r; }
      }
      peaks.push({ t: bt, r: br, v: acc[br * NT + bt] });
    }
    paintAcc(); draw();
  }
  function paintAcc() {
    var mx = 1e-9; for (var i = 0; i < acc.length; i++) mx = Math.max(mx, acc[i]);
    var bg = toRGB(C.bg), fg = toRGB(SERIES[0]);
    var oc = off.getContext('2d'), im = oc.createImageData(NT, NR);
    for (var r = 0; r < NR; r++) for (var t = 0; t < NT; t++) {
      var v = Math.pow(acc[r * NT + t] / mx, 0.6), j = 4 * ((NR - 1 - r) * NT + t);
      for (var ch = 0; ch < 3; ch++) im.data[j + ch] = Math.round(bg[ch] + (fg[ch] - bg[ch]) * v);
      im.data[j + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
  }
  function accXY(t, r) { return [AX + (t + 0.5) / NT * BOX, TOP + BOX - (r + 0.5) / NR * BOX]; }
  function lineInImage(t, r, col, dash, lw) {
    var th = t * Math.PI / NT, rho = r / (NR - 1) * 2 * RMAX - RMAX;
    var fx = BOX / 2 + rho * Math.cos(th), fy = BOX / 2 + rho * Math.sin(th), dx = -Math.sin(th), dy = Math.cos(th);
    ctx.save(); ctx.beginPath(); ctx.rect(IX, TOP, BOX, BOX); ctx.clip();
    ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = lw || 2.5;
    ctx.beginPath(); ctx.moveTo(IX + fx - dx * 500, TOP + fy - dy * 500); ctx.lineTo(IX + fx + dx * 500, TOP + fy + dy * 500); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = '14px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'bottom';
    ctx.fillText('사진 (눌러서 점 찍기, 점은 끌 수 있음)', IX, TOP - 8);
    ctx.fillText('투표함 (가로: 각도 θ, 세로: 거리 ρ)', AX, TOP - 8);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.strokeRect(IX + 0.5, TOP + 0.5, BOX, BOX); ctx.strokeRect(AX + 0.5, TOP + 0.5, BOX, BOX);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, AX + 1, TOP + 1, BOX - 1, BOX - 1);
    if (last >= 0 && pts[last]) { // 방금 찍은 점의 곡선
      ctx.strokeStyle = SERIES[3]; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var t = 0; t < NT; t++) {
        var r = (rhoOf(pts[last], t) + RMAX) / (2 * RMAX) * (NR - 1), q = accXY(t, r);
        if (t === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    var pcol = [SERIES[1], SERIES[2]];
    peaks.forEach(function (p, i) {
      lineInImage(p.t, p.r, pcol[i]);
      var q = accXY(p.t, p.r);
      ctx.strokeStyle = pcol[i]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, 7); ctx.stroke();
    });
    if (hover) {
      lineInImage(hover.t, hover.r, C.muted, [6, 5], 1.5);
      var h = accXY(hover.t, hover.r);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(h[0], h[1], 6, 0, 7); ctx.stroke();
    }
    pts.forEach(function (p, i) {
      ctx.fillStyle = i === last ? SERIES[3] : C.text;
      ctx.beginPath(); ctx.arc(IX + p.x, TOP + p.y, 4.5, 0, 7); ctx.fill();
    });
    var txt = '점 ' + pts.length + '개';
    peaks.forEach(function (p, i) {
      txt += ' · ' + (i ? '두 번째' : '최고') + ' 봉우리: θ = ' + Math.round(p.t * 180 / NT) + '°, 표 약 ' + p.v.toFixed(1) + '개';
    });
    if (pts.length < 2) txt += ' · 점을 두 개 이상 찍으면 직선을 찾습니다';
    readout.textContent = txt;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function addLine(x0, y0, x1, y1, n, gaps) {
    for (var i = 0; i < n; i++) {
      var s = Math.random();
      if (gaps && s > 0.35 && s < 0.6) continue;
      pts.push({ x: x0 + (x1 - x0) * s + rnd(-2, 2), y: y0 + (y1 - y0) * s + rnd(-2, 2) });
    }
  }
  function preset(k) {
    pts = [];
    var a = rnd(0, Math.PI);
    addLine(150 - 130 * Math.cos(a), 150 - 130 * Math.sin(a), 150 + 130 * Math.cos(a), 150 + 130 * Math.sin(a), 18, true);
    if (k === 2) addLine(rnd(20, 80), rnd(200, 280), rnd(220, 280), rnd(20, 100), 14, false);
    for (var i = 0; i < 10; i++) pts.push({ x: rnd(10, 290), y: rnd(10, 290) });
    last = -1; c2.checked = k === 2; recompute();
  }

  var dragIdx = -1;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e);
    if (p.x < IX || p.x > IX + BOX || p.y < TOP || p.y > TOP + BOX) return;
    var x = p.x - IX, y = p.y - TOP;
    dragIdx = -1;
    for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - x, pts[i].y - y) < 12) dragIdx = i;
    if (dragIdx < 0) { pts.push({ x: x, y: y }); dragIdx = pts.length - 1; }
    last = dragIdx; canvas.setPointerCapture(e.pointerId); e.preventDefault(); recompute();
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = pos(e);
    if (dragIdx >= 0) {
      pts[dragIdx].x = Math.max(0, Math.min(BOX, p.x - IX)); pts[dragIdx].y = Math.max(0, Math.min(BOX, p.y - TOP));
      recompute(); return;
    }
    if (p.x >= AX && p.x <= AX + BOX && p.y >= TOP && p.y <= TOP + BOX) {
      hover = { t: Math.min(NT - 1, Math.floor((p.x - AX) / BOX * NT)), r: (TOP + BOX - p.y) / BOX * NR - 0.5 };
    } else hover = null;
    draw();
  });
  function end() { dragIdx = -1; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', function () { if (hover) { hover = null; draw(); } });

  readTheme(); preset(1);
  function retheme() { readTheme(); paintAcc(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
