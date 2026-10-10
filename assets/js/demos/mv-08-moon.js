/* MIT 머신비전 8강 데모: 램버트 공 vs 하프케(달) 표면 — 위상각을 바꾸며 밝기 비교 */
(function () {
  'use strict';
  var root = document.getElementById('mv-08-moon');
  if (!root) return;

  var W = 640, H = 420;
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

  var gLab = document.createElement('label');
  gLab.textContent = '위상각 (해-달-나 사이 각)';
  var gIn = document.createElement('input');
  gIn.type = 'range'; gIn.min = '0'; gIn.max = '150'; gIn.step = '1'; gIn.value = '0';
  var gVal = document.createElement('span');
  gLab.appendChild(gIn); gLab.appendChild(gVal);
  controls.appendChild(gLab);
  var isoBox = document.createElement('input');
  isoBox.type = 'checkbox'; isoBox.checked = true;
  var l2 = document.createElement('label');
  l2.appendChild(isoBox); l2.appendChild(document.createTextNode('등광선 보기'));
  controls.appendChild(l2);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var RAD = 112, CY = 160, CXS = [165, 475];
  var N = 2 * RAD;
  var offs = [0, 1].map(function () {
    var c = document.createElement('canvas'); c.width = N; c.height = N;
    var x = c.getContext('2d');
    return { c: c, x: x, d: x.createImageData(N, N) };
  });
  var SCALE = 0.8; // display gain shared by both spheres so they can be compared
  var BLUE = [42, 120, 214];

  function bright(kind, x, y, z, s) {
    var ci = x * s[0] + y * s[1] + z * s[2];
    if (ci <= 0) return 0;
    if (kind === 0) return ci;                 // Lambert: cos(i)
    return Math.sqrt(ci / Math.max(z, 1e-3));  // Hapke (as in the notes): sqrt(cos i / cos e)
  }

  function render(kind, s, iso) {
    var o = offs[kind], d = o.d.data, bands = new Int16Array(N * N), i, j, k;
    var step = kind === 0 ? 0.125 : 0.15;
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      var x = (j + 0.5) / RAD - 1, y = 1 - (i + 0.5) / RAD, r2 = x * x + y * y;
      k = i * N + j;
      if (r2 >= 1) { d[4 * k + 3] = 0; bands[k] = -2; continue; }
      var z = Math.sqrt(1 - r2);
      var b = bright(kind, x, y, z, s);
      bands[k] = b <= 0 ? -1 : Math.floor(b / step);
      var g = Math.round(Math.min(1, 0.04 + 0.92 * b * SCALE) * 255);
      d[4 * k] = g; d[4 * k + 1] = g; d[4 * k + 2] = g; d[4 * k + 3] = 255;
    }
    if (iso) {
      for (i = 0; i < N - 1; i++) for (j = 0; j < N - 1; j++) {
        k = i * N + j;
        var bb = bands[k];
        if (bb < 0) continue;
        var br = bands[k + 1], bd = bands[k + N];
        if ((br >= 0 && br !== bb) || (bd >= 0 && bd !== bb)) {
          d[4 * k] = BLUE[0]; d[4 * k + 1] = BLUE[1]; d[4 * k + 2] = BLUE[2];
        }
      }
    }
    o.x.putImageData(o.d, 0, 0);
    ctx.drawImage(o.c, CXS[kind] - RAD, CY - RAD);
  }

  function draw() {
    var g = parseFloat(gIn.value) * Math.PI / 180;
    gVal.textContent = ' ' + gIn.value + '°' + (gIn.value === '0' ? ' (보름)' : gIn.value === '90' ? ' (반달)' : '');
    var s = [-Math.sin(g), 0, Math.cos(g)];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    render(0, s, isoBox.checked);
    render(1, s, isoBox.checked);
    ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = SERIES[0]; ctx.fillText('램버트 (석고 공)', CXS[0], 30);
    ctx.fillStyle = SERIES[1]; ctx.fillText('하프케 (달 표면)', CXS[1], 30);
    ctx.textAlign = 'start';
    ctx.fillStyle = SERIES[1]; ctx.font = '12px sans-serif';
    ctx.fillText('← 햇빛', 8, CY + 4);

    // equator brightness profile
    var PX0 = 60, PX1 = 600, PY0 = 300, PY1 = 404, BMAX = 1.6;
    function px(x) { return PX0 + (x + 1) / 2 * (PX1 - PX0); }
    function py(b) { return PY1 - Math.min(b, BMAX) / BMAX * (PY1 - PY0); }
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX0, PY0 - 4); ctx.lineTo(PX0, PY1); ctx.lineTo(PX1, PY1); ctx.stroke();
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif';
    ctx.fillText('가운데 가로줄의 밝기', PX0 + 6, PY0 - 8);
    ctx.textAlign = 'right'; ctx.fillText('1', PX0 - 6, py(1) + 4); ctx.fillText('0', PX0 - 6, PY1 + 4); ctx.textAlign = 'start';
    ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(PX0, py(1)); ctx.lineTo(PX1, py(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText('왼쪽 끝', PX0, PY1 + 14); ctx.textAlign = 'right'; ctx.fillText('오른쪽 끝', PX1, PY1 + 14); ctx.textAlign = 'start';
    var ratioL = 0, ratioH = 0;
    [0, 1].forEach(function (kind) {
      ctx.strokeStyle = SERIES[kind]; ctx.lineWidth = 2.5; ctx.beginPath();
      var first = true;
      for (var t = 0; t <= 200; t++) {
        var x = -0.995 + 1.99 * t / 200, z = Math.sqrt(1 - x * x);
        var b = bright(kind, x, 0, z, s);
        if (first) { ctx.moveTo(px(x), py(b)); first = false; } else ctx.lineTo(px(x), py(b));
      }
      ctx.stroke();
      // limb-to-centre ratio at x = -0.9 (sun side)
      var zz = Math.sqrt(1 - 0.81), bc = bright(kind, -0.9, 0, zz, s), b0 = bright(kind, 0, 0, 1, s);
      if (kind === 0) ratioL = b0 > 0 ? bc / b0 : NaN; else ratioH = b0 > 0 ? bc / b0 : NaN;
    });

    if (gIn.value === '0') {
      readout.innerHTML = '보름: 가장자리 근처(반지름의 90% 지점) 밝기가 가운데의 ' +
        '<span style="color:' + SERIES[0] + '">램버트 ' + Math.round(ratioL * 100) + '%</span> vs ' +
        '<span style="color:' + SERIES[1] + '">하프케 ' + Math.round(ratioH * 100) + '%</span> → 하프케 쪽은 공이 아니라 평평한 원판처럼 보입니다.';
    } else {
      readout.innerHTML = '파란 등광선을 보세요. 램버트는 빛 방향을 둘러싼 고리 모양, 하프케는 위아래 극을 잇는 <b>경도선</b> 모양입니다.';
    }
  }

  gIn.addEventListener('input', draw);
  isoBox.addEventListener('change', draw);
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
