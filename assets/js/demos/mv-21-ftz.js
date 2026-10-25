/* MIT 머신비전 21강: 정면 과녁으로는 f와 t_z를 가를 수 없다 — 줌하면서 뒤로 물러나기(돌리 줌) */
(function () {
  'use strict';
  var root = document.getElementById('mv-21-ftz');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 330;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '보정 과녁을 찍은 사진과 기준 사진의 비교');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  var sZoom = slider('줌 배율 (f와 t_z를 같이 키움)', 0.5, 3, 0.01, 1.8);
  var sTilt = slider('과녁 기울기', 0, 70, 1, 0);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var F0 = 190, T0 = 2.5;                        // 기준: f = 190px, t_z = 2.5
  var PTS = []; for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) PTS.push([i * 0.25, j * 0.25, 0]);
  function image(f, tz, tilt) {
    var c = Math.cos(tilt), s = Math.sin(tilt);
    return PTS.map(function (p) { var y = c * p[1], z = s * p[1] + tz; return [f * p[0] / z, f * y / z]; });
  }
  function panel(x0, title, pts, ref) {
    var cx = x0 + 150, cy = 175;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(x0, 40, 300, 270);
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText(title, x0, 34);
    if (ref) ref.forEach(function (p) { ctx.strokeStyle = SERIES[0]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], 5, 0, 7); ctx.stroke(); });
    pts.forEach(function (p) { ctx.fillStyle = ref ? SERIES[1] : SERIES[0]; ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], ref ? 2.8 : 4, 0, 7); ctx.fill(); });
  }
  function draw() {
    var k = +sZoom.value, tilt = +sTilt.value * Math.PI / 180;
    var ref = image(F0, T0, tilt), cur = image(F0 * k, T0 * k, tilt);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    panel(10, '기준: f = ' + F0 + 'px, t_z = ' + T0, ref, null);
    panel(W - 310, '지금: f = ' + (F0 * k).toFixed(0) + 'px, t_z = ' + (T0 * k).toFixed(2) + ' (파랑 고리 = 기준)', cur, ref);
    var e = 0; for (var i = 0; i < ref.length; i++) e += Math.pow(ref[i][0] - cur[i][0], 2) + Math.pow(ref[i][1] - cur[i][1], 2);
    e = Math.sqrt(e / ref.length);
    readout.innerHTML = 'f / t_z = ' + (F0 / T0).toFixed(1) + ' 그대로 · 두 사진의 평균 차이 <b style="color:' + (e < 0.05 ? SERIES[1] : SERIES[2]) + '">' + e.toFixed(2) + 'px</b>' +
      (e < 0.05 ? ' → 사진이 똑같아서 f와 t_z를 따로 알 수 없음' : ' → 깊이 차이 덕분에 f와 t_z가 구별됨');
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
