/* MIT 머신비전 14강: 허프 변환으로 원 찾기 — 반지름을 바꾸며 투표가 모이는지 보기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-14-hough-circle');
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

  var W = 640, H = 400, G = 4, NX = W / G, NY = H / G;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '점을 찍으면 원의 중심 후보에 투표가 쌓이는 캔버스');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  var lR = document.createElement('label'); lR.textContent = '찾는 반지름 ';
  var sR = document.createElement('input'); sR.type = 'range'; sR.min = 20; sR.max = 140; sR.step = 1; sR.value = 60;
  lR.appendChild(sR); controls.appendChild(lR); sR.addEventListener('input', recompute);
  var lV = document.createElement('label'); var cV = document.createElement('input'); cV.type = 'checkbox'; cV.checked = true;
  lV.appendChild(cV); lV.appendChild(document.createTextNode(' 투표 원 보이기')); controls.appendChild(lV);
  cV.addEventListener('change', draw);
  function button(text, cb) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    controls.appendChild(b); b.addEventListener('click', cb); return b;
  }
  button('원 일부 + 잡음', preset);
  button('모두 지우기', function () { pts = []; recompute(); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var acc = new Float32Array(NX * NY), pts = [], peak = null, trueR = 0; // trueR: 예시 원의 반지름
  var off = document.createElement('canvas'); off.width = NX; off.height = NY;

  function recompute() {
    var R = +sR.value;
    acc.fill(0);
    var n = Math.ceil(4 * Math.PI * R / G), w = 0.5; // 칸 하나 지날 때 약 1표
    pts.forEach(function (p) {
      for (var k = 0; k < n; k++) {
        var a = 2 * Math.PI * k / n, x = (p.x + R * Math.cos(a)) / G - 0.5, y = (p.y + R * Math.sin(a)) / G - 0.5;
        var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
        if (x0 < 0 || y0 < 0 || x0 >= NX - 1 || y0 >= NY - 1) continue;
        var i = y0 * NX + x0;
        acc[i] += (1 - fx) * (1 - fy) * w; acc[i + 1] += fx * (1 - fy) * w;
        acc[i + NX] += (1 - fx) * fy * w; acc[i + NX + 1] += fx * fy * w;
      }
    });
    peak = null;
    if (pts.length >= 3) {
      var best = -1, bi = 0;
      for (var y = 1; y < NY - 1; y++) for (var x = 1; x < NX - 1; x++) {
        var j = y * NX + x;
        var s = acc[j] + 0.5 * (acc[j - 1] + acc[j + 1] + acc[j - NX] + acc[j + NX]);
        if (s > best) { best = s; bi = j; }
      }
      // 봉우리를 중심으로 반지름 R 원 위에 놓인 점 = 이 후보에 표를 준 점
      var cnt = 0, cx = bi % NX, cy = (bi - cx) / NX;
      pts.forEach(function (p) {
        var d = Math.hypot(p.x - (cx + 0.5) * G, p.y - (cy + 0.5) * G);
        if (Math.abs(d - R) < G * 1.5) cnt++;
      });
      peak = { x: (cx + 0.5) * G, y: (cy + 0.5) * G, votes: cnt };
    }
    paint(); draw();
  }
  function paint() {
    var mx = 1e-9; for (var i = 0; i < acc.length; i++) mx = Math.max(mx, acc[i]);
    var bg = toRGB(C.bg), fg = toRGB(SERIES[0]);
    var oc = off.getContext('2d'), im = oc.createImageData(NX, NY);
    for (i = 0; i < NX * NY; i++) {
      var v = Math.pow(acc[i] / mx, 0.8);
      for (var ch = 0; ch < 3; ch++) im.data[4 * i + ch] = Math.round(bg[ch] + (fg[ch] - bg[ch]) * v);
      im.data[4 * i + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
  }
  function draw() {
    var R = +sR.value;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H);
    if (cV.checked) {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6;
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 7); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    if (peak) {
      ctx.strokeStyle = SERIES[1]; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(peak.x, peak.y, R, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(peak.x - 7, peak.y); ctx.lineTo(peak.x + 7, peak.y);
      ctx.moveTo(peak.x, peak.y - 7); ctx.lineTo(peak.x, peak.y + 7); ctx.stroke();
    }
    pts.forEach(function (p) {
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, 7); ctx.fill();
    });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    var txt = '점 ' + pts.length + '개 · 찾는 반지름 ' + R;
    if (peak) txt += ' · 가장 많이 겹친 중심 후보에 점 ' + peak.votes + '개가 동의';
    else txt += ' · 점을 세 개 이상 찍어 보세요';
    readout.textContent = txt;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function preset() {
    pts = [];
    trueR = Math.round(rnd(45, 110));
    var cx = rnd(150, 490), cy = rnd(140, 260), a0 = rnd(0, 6.28);
    for (var i = 0; i < 14; i++) {
      var a = a0 + rnd(0, 3.6);
      pts.push({ x: cx + trueR * Math.cos(a) + rnd(-1.5, 1.5), y: cy + trueR * Math.sin(a) + rnd(-1.5, 1.5) });
    }
    for (i = 0; i < 8; i++) pts.push({ x: rnd(20, 620), y: rnd(20, 380) });
    recompute();
  }

  var dragIdx = -1;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e); dragIdx = -1;
    for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < 12) dragIdx = i;
    if (dragIdx < 0) { pts.push({ x: p.x, y: p.y }); dragIdx = pts.length - 1; }
    canvas.setPointerCapture(e.pointerId); e.preventDefault(); recompute();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragIdx < 0) return; var p = pos(e);
    pts[dragIdx].x = Math.max(0, Math.min(W, p.x)); pts[dragIdx].y = Math.max(0, Math.min(H, p.y)); recompute();
  });
  function end() { dragIdx = -1; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); preset();
  function retheme() { readTheme(); paint(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
