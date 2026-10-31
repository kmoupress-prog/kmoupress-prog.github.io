/* MIT 머신비전 17강: 두 눈으로 거리 재기 — 시차 d = x_l − x_r, 거리 Z = b·f / d */
(function () {
  'use strict';
  var root = document.getElementById('mv-17-stereo');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 400;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '두 카메라와 점 하나를 위에서 내려다본 그림');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val, cb) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', cb); return i;
  }
  var sB = slider('기준선 b (cm)', 4, 40, 1, 12, draw);
  var sE = slider('픽셀 오차 (px)', 0, 3, 0.5, 1, draw);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // 세계 좌표: cm. 초점거리는 픽셀 단위 f = 800px (보통 웹캠 정도)
  var F = 800, PXCM = 4.0;            // 화면 1cm = 4px (가로), 깊이는 아래 스케일
  var P = { X: 10, Z: 150 };          // 점 위치 (cm)
  var CY = H - 60, ZS = (CY - 85) / 300; // 깊이 300cm까지 표시
  function sx(X) { return W / 2 + X * PXCM; }
  function sy(Z) { return CY - Z * ZS; }

  function draw() {
    var b = +sB.value, err = +sE.value;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // 깊이 눈금
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.font = '11px sans-serif'; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
    for (var z = 50; z <= 300; z += 50) {
      ctx.beginPath(); ctx.moveTo(40, sy(z)); ctx.lineTo(W - 20, sy(z)); ctx.stroke();
      ctx.fillText(z + 'cm', 4, sy(z));
    }
    var cl = -b / 2, cr = b / 2;
    // 영상 좌표 (픽셀): x = f (X - c) / Z
    var xl = F * (P.X - cl) / P.Z, xr = F * (P.X - cr) / P.Z, d = xl - xr;
    var Zest = b * F / d;
    // 오차 범위: 시차가 ±err 픽셀 틀렸을 때
    var Znear = b * F / (d + err), Zfar = d - err > 0 ? b * F / (d - err) : Infinity;
    // 오차 막대
    if (err > 0) {
      var y1 = sy(Math.min(Zfar, 320)), y2 = sy(Znear);
      ctx.fillStyle = SERIES[1]; ctx.globalAlpha = 0.18;
      ctx.fillRect(sx(P.X) - 9, y1, 18, y2 - y1); ctx.globalAlpha = 1;
    }
    // 광선
    [[cl, SERIES[0]], [cr, SERIES[2]]].forEach(function (c) {
      ctx.strokeStyle = c[1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx(c[0]), sy(0)); ctx.lineTo(sx(P.X), sy(P.Z)); ctx.stroke();
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(sx(c[0]), sy(0), 5, 0, 7); ctx.fill();
    });
    ctx.strokeStyle = C.text; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx(cl), sy(0) + 18); ctx.lineTo(sx(cr), sy(0) + 18); ctx.stroke();
    ctx.fillStyle = C.text; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.font = '12px sans-serif';
    ctx.fillText('b = ' + b + 'cm', W / 2, sy(0) + 22); ctx.textAlign = 'left';
    // 점
    ctx.fillStyle = SERIES[1]; ctx.beginPath(); ctx.arc(sx(P.X), sy(P.Z), 8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // 두 장의 작은 사진(가로줄)
    function strip(x0, label, xi, col) {
      var w = 150, y = 14;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(x0, y, w, 26);
      var px = x0 + w / 2 + xi * (w / 2) / 400;
      ctx.fillStyle = col; if (px > x0 && px < x0 + w) { ctx.beginPath(); ctx.arc(px, y + 13, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.textBaseline = 'top'; ctx.fillText(label + ' ' + xi.toFixed(1) + 'px', x0, y + 30);
    }
    strip(W / 2 - 170, '왼쪽 사진 x_l =', xl, SERIES[0]);
    strip(W / 2 + 20, '오른쪽 사진 x_r =', xr, SERIES[2]);
    ctx.fillStyle = C.text; ctx.font = '12px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('주황 점을 끌어 보세요', W - 140, H - 22);
    readout.innerHTML = '시차 d = x_l − x_r = <b>' + d.toFixed(1) + '</b>px · 거리 Z = b·f/d = <b>' + Zest.toFixed(1) + '</b>cm' +
      (err > 0 ? ' · 시차를 ±' + err + 'px 틀리면 <b style="color:' + SERIES[1] + '">' + Znear.toFixed(0) + ' ~ ' + (isFinite(Zfar) ? Zfar.toFixed(0) : '∞') + 'cm</b>' : '') +
      ' (f = ' + F + 'px)';
  }

  var drag = false;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  canvas.addEventListener('pointerdown', function (e) { drag = true; canvas.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
  function move(e) {
    if (!drag) return; var p = pos(e);
    P.X = Math.max(-75, Math.min(75, (p.x - W / 2) / PXCM));
    P.Z = Math.max(30, Math.min(300, (CY - p.y) / ZS)); draw();
  }
  canvas.addEventListener('pointermove', move);
  function end() { drag = false; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
