/* MIT 머신비전 18강: 회전 합치기 = 사원수 곱하기. 순서를 바꾸면 결과가 다르다 (q_B q_A ≠ q_A q_B) */
(function () {
  'use strict';
  var root = document.getElementById('mv-18-order');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575'); C.bg = v('--main-bg', '#fff');
  }

  var W = 640, H = 320;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '두 회전을 서로 다른 순서로 적용한 두 상자');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function pick(label, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var s = document.createElement('select');
    ['x', 'y', 'z'].forEach(function (a) { [90, -90, 180, 45].forEach(function (d) { var o = document.createElement('option'); o.value = a + d; o.textContent = a + '축 ' + d + '°'; s.appendChild(o); }); });
    s.value = val; l.appendChild(s); controls.appendChild(l); s.addEventListener('change', draw); return s;
  }
  var pA = pick('회전 A', 'x90'), pB = pick('회전 B', 'z90');
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  function qmul(p, q) {
    return [p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3],
      p[0] * q[1] + p[1] * q[0] + p[2] * q[3] - p[3] * q[2],
      p[0] * q[2] - p[1] * q[3] + p[2] * q[0] + p[3] * q[1],
      p[0] * q[3] + p[1] * q[2] - p[2] * q[1] + p[3] * q[0]];
  }
  function qrot(q, v) { var r = qmul(qmul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]); return [r[1], r[2], r[3]]; }
  function qOf(code) {
    var ax = code[0], d = +code.slice(1) * Math.PI / 360, s = Math.sin(d);
    return [Math.cos(d), ax === 'x' ? s : 0, ax === 'y' ? s : 0, ax === 'z' ? s : 0];
  }
  var VA = -0.9, VE = 0.42;
  function view(p) {
    var x = p[0] * Math.cos(VA) - p[1] * Math.sin(VA), y = p[0] * Math.sin(VA) + p[1] * Math.cos(VA), z = p[2];
    return { x: x, y: -(y * Math.sin(VE) + z * Math.cos(VE)), d: y * Math.cos(VE) - z * Math.sin(VE) };
  }
  var V = [], F = [[0, 1, 3, 2, 's'], [4, 5, 7, 6, 'b'], [0, 1, 5, 4, 's'], [2, 3, 7, 6, 's'], [0, 2, 6, 4, 's'], [1, 3, 7, 5, 'c']];
  [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { V.push([a * 1.2, b * 0.85, c * 0.3]); }); }); });
  function scene(q, cx, cy, title) {
    var sc = 58;
    // 좌표축
    [[1.9, 0, 0, 'x'], [0, 1.9, 0, 'y'], [0, 0, 1.6, 'z']].forEach(function (a) {
      var p = view(a); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + p.x * sc, cy + p.y * sc); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.fillText(a[3], cx + p.x * sc + 3, cy + p.y * sc);
    });
    var P = V.map(function (v) { return view(qrot(q, v)); });
    F.map(function (f) { var d = 0; for (var k = 0; k < 4; k++) d += P[f[k]].d; return { f: f, d: d }; })
      .sort(function (a, b) { return b.d - a.d; })
      .forEach(function (o) {
        var f = o.f; ctx.beginPath();
        for (var k = 0; k < 4; k++) { var p = P[f[k]]; if (k) ctx.lineTo(cx + p.x * sc, cy + p.y * sc); else ctx.moveTo(cx + p.x * sc, cy + p.y * sc); }
        ctx.closePath(); ctx.fillStyle = f[4] === 'c' ? SERIES[1] : f[4] === 'b' ? SERIES[0] : '#c4c4c4';
        ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
      });
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(title, cx, 10); ctx.textAlign = 'left';
  }
  function f3(x) { return (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3); }
  function qs(q) { return '(' + q.map(f3).join(', ') + ')'; }
  function draw() {
    var qA = qOf(pA.value), qB = qOf(pB.value);
    var AB = qmul(qB, qA), BA = qmul(qA, qB);   // A 먼저 → q_B q_A
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    scene([1, 0, 0, 0], 105, 175, '처음');
    scene(AB, 320, 175, 'A 먼저, 그다음 B');
    scene(BA, 535, 175, 'B 먼저, 그다음 A');
    var dot = AB[0] * BA[0] + AB[1] * BA[1] + AB[2] * BA[2] + AB[3] * BA[3];
    var same = Math.abs(Math.abs(dot) - 1) < 1e-6;
    var why = pA.value[0] === pB.value[0] ? '같은 축끼리는 순서를 바꿔도 됨' : (dot < 0 ? '두 곱이 서로 −q 관계라서 같은 회전' : '');
    readout.innerHTML = 'q_A = ' + qs(qA) + ' · q_B = ' + qs(qB) + '<br>' +
      'A 먼저: q_B q_A = <b>' + qs(AB) + '</b><br>B 먼저: q_A q_B = <b>' + qs(BA) + '</b><br>' +
      (same ? '<b style="color:' + SERIES[2] + '">이 경우는 순서와 상관없이 같은 회전</b>' + (why ? ' (' + why + ')' : '') : '<b style="color:' + SERIES[1] + '">순서에 따라 다른 회전</b>');
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
