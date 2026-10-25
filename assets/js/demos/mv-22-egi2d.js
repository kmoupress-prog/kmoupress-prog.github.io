/* MIT 머신비전 22강: 다각형의 확장 원 영상 — 변마다 바깥 법선 방향에 변 길이만큼의 질량, 합은 언제나 0 */
(function () {
  'use strict';
  var root = document.getElementById('mv-22-egi2d');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6', '#2f9fb8', '#c9a227', '#8a5cc2'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 340;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '끌어서 바꿀 수 있는 다각형과 그 확장 원 영상');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  var lab = document.createElement('label'); lab.textContent = '다각형 돌리기 ';
  var sRot = document.createElement('input'); sRot.type = 'range'; sRot.min = -180; sRot.max = 180; sRot.step = 1; sRot.value = 0;
  lab.appendChild(sRot); controls.appendChild(lab); sRot.addEventListener('input', draw);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var BASE = [[-90, 60], [40, 85], [110, 10], [60, -80], [-60, -70]];
  var off = [170, 175];
  function verts() {
    var a = +sRot.value * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return BASE.map(function (p) { return [off[0] + c * p[0] - s * p[1], off[1] + s * p[0] + c * p[1]]; });
  }
  function area(P) { var A = 0; for (var i = 0; i < P.length; i++) { var a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } return A / 2; }
  function draw() {
    var P = verts();
    var ccw = area(P) > 0; // 화면 좌표(y 아래)에서의 방향
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = SERIES[0]; ctx.globalAlpha = 0.1; ctx.beginPath();
    P.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = SERIES[0]; ctx.lineWidth = 2; ctx.stroke();
    var EX = 470, EY = 175, ER = 55, sum = [0, 0], perim = 0;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(EX, EY, ER, 0, 7); ctx.stroke();
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
      var nx = ccw ? ey : -ey, ny = ccw ? -ex : ex; nx /= L; ny /= L;   // 바깥 법선
      sum[0] += nx * L; sum[1] += ny * L; perim += L;
      var col = SERIES[i % SERIES.length], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + nx * 22, my + ny * 22); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(EX + nx * ER, EY + ny * ER); ctx.lineTo(EX + nx * (ER + L * 0.45), EY + ny * (ER + L * 0.45)); ctx.stroke();
    }
    P.forEach(function (p) { ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke(); });
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('꼭짓점을 끌어 보세요 (볼록하게)', 8, 8); ctx.fillText('확장 원 영상: 막대 길이 = 그 방향 변의 길이', 360, 8);
    var convex = true;
    for (i = 0; i < P.length; i++) {
      var p0 = P[i], p1 = P[(i + 1) % P.length], p2 = P[(i + 2) % P.length];
      var cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
      if ((cr > 0) !== ccw) convex = false;
    }
    readout.innerHTML = '법선 × 길이의 합 = (' + sum[0].toFixed(2) + ', ' + sum[1].toFixed(2) + ') → <b>항상 0</b> (닫힌 도형) · 둘레 ' + perim.toFixed(0) + 'px' +
      (convex ? '' : ' · <b style="color:' + SERIES[1] + '">볼록하지 않음: 같은 확장 원 영상을 갖는 다른 모양이 생길 수 있음</b>');
  }

  var drag = -1, moveAll = null;
  function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e), P = verts(), best = 400; drag = -1;
    P.forEach(function (q, i) { var d = (q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]); if (d < best) { best = d; drag = i; } });
    if (drag < 0 && p[0] < 340) moveAll = [p[0] - off[0], p[1] - off[1]];
    if (drag >= 0 || moveAll) { canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = pos(e);
    if (drag >= 0) {
      var a = -(+sRot.value) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x = Math.max(10, Math.min(330, p[0])) - off[0], y = Math.max(30, Math.min(H - 10, p[1])) - off[1];
      BASE[drag] = [c * x - s * y, s * x + c * y]; draw();
    } else if (moveAll) { off = [Math.max(60, Math.min(280, p[0] - moveAll[0])), Math.max(80, Math.min(H - 70, p[1] - moveAll[1]))]; draw(); }
  });
  function end() { drag = -1; moveAll = null; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
