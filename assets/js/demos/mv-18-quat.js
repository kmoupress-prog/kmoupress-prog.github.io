/* MIT 머신비전 18강: 축과 각도 → 단위 사원수 q = (cos θ/2, sin θ/2 ω̂), q r q* 로 물체 돌리기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-18-quat');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575'); C.bg = v('--main-bg', '#fff');
  }

  var W = 640, H = 360;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '회전축 둘레로 돌아가는 상자');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  var sAz = slider('축 방위각', 0, 360, 1, 30);
  var sEl = slider('축 높이각', -90, 90, 1, 50);
  var sTh = slider('회전 각 θ', -360, 720, 1, 120);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // ---- 사원수 ----
  function qmul(p, q) {
    return [p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3],
      p[0] * q[1] + p[1] * q[0] + p[2] * q[3] - p[3] * q[2],
      p[0] * q[2] - p[1] * q[3] + p[2] * q[0] + p[3] * q[1],
      p[0] * q[3] + p[1] * q[2] - p[2] * q[1] + p[3] * q[0]];
  }
  function qrot(q, v) { // q (0,v) q*
    var r = qmul(qmul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]);
    return [r[1], r[2], r[3]];
  }
  // ---- 그리기: 고정 시점 ----
  var VA = -0.9, VE = 0.42; // 시점 방위/높이(라디안)
  function view(p) { // 세계(x,y,z; z 위) → 화면
    var x = p[0] * Math.cos(VA) - p[1] * Math.sin(VA), y = p[0] * Math.sin(VA) + p[1] * Math.cos(VA), z = p[2];
    var yy = y * Math.cos(VE) - z * Math.sin(VE), zz = y * Math.sin(VE) + z * Math.cos(VE);
    return { x: x, y: -zz, d: yy };
  }
  var BOX = (function () {
    var sx = 1.3, sy = 0.9, sz = 0.32, V = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { V.push([a * sx, b * sy, c * sz]); }); }); });
    return { V: V, F: [[0, 1, 3, 2, 'side'], [4, 5, 7, 6, 'spine'], [0, 1, 5, 4, 'side'], [2, 3, 7, 6, 'side'], [0, 2, 6, 4, 'side'], [1, 3, 7, 5, 'cover']] };
  })();

  function drawScene(q, cx, cy, sc, axis) {
    var P = BOX.V.map(function (v) { return view(qrot(q, v)); });
    var faces = BOX.F.map(function (f) {
      var d = 0; for (var k = 0; k < 4; k++) d += P[f[k]].d; return { f: f, d: d / 4 };
    }).sort(function (a, b) { return b.d - a.d; });
    faces.forEach(function (o) {
      var f = o.f; ctx.beginPath();
      for (var k = 0; k < 4; k++) { var p = P[f[k]]; if (k) ctx.lineTo(cx + p.x * sc, cy + p.y * sc); else ctx.moveTo(cx + p.x * sc, cy + p.y * sc); }
      ctx.closePath();
      ctx.fillStyle = f[4] === 'cover' ? SERIES[1] : f[4] === 'spine' ? SERIES[0] : '#c4c4c4';
      ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
    });
    if (axis) {
      var a = view([axis[0] * 2.1, axis[1] * 2.1, axis[2] * 2.1]), b = view([-axis[0] * 2.1, -axis[1] * 2.1, -axis[2] * 2.1]);
      ctx.strokeStyle = SERIES[4]; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(cx + b.x * sc, cy + b.y * sc); ctx.lineTo(cx + a.x * sc, cy + a.y * sc); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = SERIES[4]; ctx.beginPath(); ctx.arc(cx + a.x * sc, cy + a.y * sc, 5, 0, 7); ctx.fill();
      ctx.font = '13px sans-serif'; ctx.fillText('ω̂', cx + a.x * sc + 8, cy + a.y * sc);
    }
  }

  function fmt(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(3); }
  function draw() {
    var az = +sAz.value * Math.PI / 180, el = +sEl.value * Math.PI / 180, th = +sTh.value;
    var w = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    var h = th * Math.PI / 360, s = Math.sin(h);
    var q = [Math.cos(h), s * w[0], s * w[1], s * w[2]];
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = '12px sans-serif'; ctx.fillStyle = C.muted; ctx.textBaseline = 'top';
    ctx.fillText('처음 상태', 70, 10); ctx.fillText('q 로 돌린 결과 (보라 점선 = 회전축)', 330, 10);
    drawScene([1, 0, 0, 0], 150, 190, 62, null);
    drawScene(q, 450, 190, 62, w);
    var t = ((th % 360) + 360) % 360; var other = t > 180 ? t - 360 : t;
    readout.innerHTML = 'q = (' + fmt(q[0]) + ', ' + fmt(q[1]) + ', ' + fmt(q[2]) + ', ' + fmt(q[3]) + ') · 길이 ' +
      Math.hypot(q[0], q[1], q[2], q[3]).toFixed(3) + '<br>' +
      '−q = (' + fmt(-q[0]) + ', ' + fmt(-q[1]) + ', ' + fmt(-q[2]) + ', ' + fmt(-q[3]) + ')도 <b>똑같은 회전</b> · ' +
      '−q는 같은 축으로 θ − 360° = ' + (th - 360) + '° 돌린 것' + (other !== th ? ' · θ = ' + th + '°는 θ = ' + other + '°와 같은 자세' : '') + (th !== 0 && th % 360 === 0 ? ' · <b>물체는 제자리인데 q는 ' + (Math.abs(th / 360) % 2 === 1 ? '(−1, 0, 0, 0)으로 뒤집혀 있음' : '(+1, 0, 0, 0)으로 돌아옴') + '</b>' : '');
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
