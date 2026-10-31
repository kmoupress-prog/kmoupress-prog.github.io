/* MIT 머신비전 23강: 방향 히스토그램의 칸 모양 — 같은 넓이면 육각형 칸이 정사각형 칸보다 둥글다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-23-cells');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 320;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '정사각형 칸과 육각형 칸에 점을 넣어 비교');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function button(text, cb) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; controls.appendChild(b); b.addEventListener('click', cb); return b; }
  button('점 500개 뿌리기', function () { for (var i = 0; i < 500; i++) add([Math.random() * 280, 20 + Math.random() * 280]); draw(); });
  button('지우기', function () { pts = []; draw(); });
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var A = 2400;                                  // 칸 넓이(px²) — 두 격자 같음
  var SQ = Math.sqrt(A), HX = Math.sqrt(2 * A / (3 * Math.sqrt(3)));   // 정사각형 한 변, 육각형 한 변
  var OXs = 10, OXh = 340, OY = 20, PW = 280, PH = 280;
  var pts = [], mouse = null;
  function sqCell(p) { var i = Math.floor(p[0] / SQ), j = Math.floor(p[1] / SQ); return { c: [(i + 0.5) * SQ, (j + 0.5) * SQ], key: i + ',' + j }; }
  function hexCell(p) { // 꼭짓점이 옆을 향한 육각형(flat-top), 축 좌표 반올림
    var q = (2 / 3 * p[0]) / HX, r = (-1 / 3 * p[0] + Math.sqrt(3) / 3 * p[1]) / HX;
    var x = q, z = r, y = -x - z, rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    var dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    return { c: [HX * 1.5 * rx, HX * Math.sqrt(3) * (rz + rx / 2)], key: rx + ',' + rz };
  }
  function add(p) { pts.push(p); }
  function drawGrid(ox, hex) {
    ctx.save(); ctx.beginPath(); ctx.rect(ox, OY, PW, PH); ctx.clip();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    if (!hex) {
      for (var x = 0; x <= PW; x += SQ) { ctx.beginPath(); ctx.moveTo(ox + x, OY); ctx.lineTo(ox + x, OY + PH); ctx.stroke(); }
      for (var y = 0; y <= PH; y += SQ) { ctx.beginPath(); ctx.moveTo(ox, OY + y); ctx.lineTo(ox + PW, OY + y); ctx.stroke(); }
    } else {
      for (var i = -1; i < PW / (1.5 * HX) + 2; i++) for (var j = -2; j < PH / (Math.sqrt(3) * HX) + 2; j++) {
        var cx = HX * 1.5 * i, cy = HX * Math.sqrt(3) * (j + (i & 1 ? 0.5 : 0));
        ctx.beginPath();
        for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k, X = ox + cx + HX * Math.cos(a), Y = OY + cy + HX * Math.sin(a); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    drawGrid(OXs, false); drawGrid(OXh, true);
    ctx.strokeStyle = C.muted; ctx.strokeRect(OXs, OY, PW, PH); ctx.strokeRect(OXh, OY, PW, PH);
    var ds = 0, dh = 0, ms = 0, mh = 0;
    pts.forEach(function (p) {
      var q = [p[0], p[1] - OY], s = sqCell(q), h = hexCell(q);
      var a = Math.hypot(q[0] - s.c[0], q[1] - s.c[1]), b = Math.hypot(q[0] - h.c[0], q[1] - h.c[1]);
      ds += a; dh += b; ms = Math.max(ms, a); mh = Math.max(mh, b);
      ctx.fillStyle = SERIES[0]; ctx.globalAlpha = 0.5; ctx.fillRect(OXs + p[0] - 1, p[1] - 1, 2.5, 2.5); ctx.fillRect(OXh + p[0] - 1, p[1] - 1, 2.5, 2.5); ctx.globalAlpha = 1;
    });
    if (mouse) {
      var q = [mouse[0], mouse[1] - OY], s = sqCell(q), h = hexCell(q);
      [[OXs, s.c, SERIES[1]], [OXh, h.c, SERIES[2]]].forEach(function (o) {
        ctx.strokeStyle = o[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o[0] + mouse[0], mouse[1]); ctx.lineTo(o[0] + o[1][0], OY + o[1][1]); ctx.stroke();
        ctx.fillStyle = o[2]; ctx.beginPath(); ctx.arc(o[0] + o[1][0], OY + o[1][1], 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(o[0] + mouse[0], mouse[1], 4, 0, 7); ctx.fill();
      });
    }
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'bottom';
    ctx.fillText('정사각형 칸', OXs, OY - 3); ctx.fillText('육각형 칸 (같은 넓이)', OXh, OY - 3);
    var n = pts.length;
    readout.innerHTML = '마우스를 올리면 그 점이 들어가는 칸의 중심까지 선을 그립니다' + (mouse ? ' · 정사각형 ' + Math.hypot(mouse[0] - sqCell([mouse[0], mouse[1] - OY]).c[0], mouse[1] - OY - sqCell([mouse[0], mouse[1] - OY]).c[1]).toFixed(1) + 'px, 육각형 ' + Math.hypot(mouse[0] - hexCell([mouse[0], mouse[1] - OY]).c[0], mouse[1] - OY - hexCell([mouse[0], mouse[1] - OY]).c[1]).toFixed(1) + 'px' : '') +
      (n ? '<br>점 ' + n + '개 · 칸 중심까지 평균 거리: 정사각형 <b style="color:' + SERIES[1] + '">' + (ds / n).toFixed(2) + '</b>px, 육각형 <b style="color:' + SERIES[2] + '">' + (dh / n).toFixed(2) + '</b>px · 최대: ' + ms.toFixed(1) + ' vs ' + mh.toFixed(1) + 'px (이론 ' + (SQ / Math.SQRT2).toFixed(1) + ' vs ' + HX.toFixed(1) + ')' : '');
  }
  function pos(e) {
    var r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (y < OY || y > OY + PH) return null;
    if (x >= OXs && x <= OXs + PW) return [x - OXs, y]; if (x >= OXh && x <= OXh + PW) return [x - OXh, y]; return null;
  }
  canvas.addEventListener('pointermove', function (e) { mouse = pos(e); draw(); });
  canvas.addEventListener('pointerdown', function (e) { var p = pos(e); if (p) { add(p); mouse = p; draw(); } });
  canvas.addEventListener('pointerleave', function () { mouse = null; draw(); });

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
