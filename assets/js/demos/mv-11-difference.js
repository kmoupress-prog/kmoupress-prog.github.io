/* MIT 머신비전 11강 데모: 앞으로/뒤로/가운데 차이로 기울기 추정하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-11-difference');
  if (!root) return;

  var W = 640, H = 360, PL = 20, PR = 450, PT = 20, PB = 330;
  var XMIN = 0, XMAX = 6.4, YMIN = -1.9, YMAX = 1.9;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', MAGENTA = '#e87ba4';
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
  var l = document.createElement('label'); l.textContent = '픽셀 간격 δ ';
  var dR = document.createElement('input'); dR.type = 'range'; dR.min = 0.05; dR.max = 1.2; dR.step = 0.01; dR.value = 0.6;
  l.appendChild(dR); controls.appendChild(l);

  function f(x) { return Math.sin(x) + 0.35 * Math.sin(2.2 * x); }
  function df(x) { return Math.cos(x) + 0.77 * Math.cos(2.2 * x); }
  var x0 = 1.6;

  function sx(x) { return PL + (x - XMIN) / (XMAX - XMIN) * (PR - PL); }
  function sy(y) { return PB - (y - YMIN) / (YMAX - YMIN) * (PB - PT); }
  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function line(slope, c, dash, w) {
    var a = x0 - 1.4, b = x0 + 1.4, y0 = f(x0);
    ctx.save();
    ctx.beginPath(); ctx.rect(PL, PT, PR - PL, PB - PT); ctx.clip();
    ctx.strokeStyle = c; ctx.lineWidth = w || 2.4; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(sx(a), sy(y0 + slope * (a - x0))); ctx.lineTo(sx(b), sy(y0 + slope * (b - x0))); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    var d = +dR.value;
    var tr = df(x0);
    var fw = (f(x0 + d) - f(x0)) / d, bw = (f(x0) - f(x0 - d)) / d, ce = (f(x0 + d) - f(x0 - d)) / (2 * d);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // pixel grid: samples every d around x0
    ctx.fillStyle = col.muted; ctx.globalAlpha = 0.5;
    for (var k = -20; k <= 20; k++) {
      var xs = x0 + k * d;
      if (xs < XMIN || xs > XMAX) continue;
      ctx.beginPath(); ctx.arc(sx(xs), sy(f(xs)), 2.5, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // curve
    ctx.strokeStyle = col.text; ctx.lineWidth = 2.4; ctx.beginPath();
    for (var x = XMIN; x <= XMAX; x += 0.02) { if (x === XMIN) ctx.moveTo(sx(x), sy(f(x))); else ctx.lineTo(sx(x), sy(f(x))); }
    ctx.stroke();
    line(fw, ORANGE); line(bw, MAGENTA); line(ce, BLUE); line(tr, col.text, [6, 5], 1.8);
    [x0 - d, x0 + d].forEach(function (xx) {
      ctx.fillStyle = col.text; ctx.beginPath(); ctx.arc(sx(xx), sy(f(xx)), 5, 0, 2 * Math.PI); ctx.fill();
    });
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = col.text; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx(x0), sy(f(x0)), 10, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // error bars on the right
    var bx = 480, bw0 = 140, top = 40, rowH = 62, emax = 1.2;
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('추정 오차 (작을수록 좋음)', bx - 10, top - 12);
    [['앞으로 차이', fw, ORANGE], ['뒤로 차이', bw, MAGENTA], ['가운데 차이', ce, BLUE]].forEach(function (r, n) {
      var e = Math.abs(r[1] - tr), y = top + n * rowH;
      ctx.fillStyle = col.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText(r[0], bx, y);
      ctx.fillStyle = r[2];
      ctx.fillRect(bx, y + 20, Math.max(2, Math.min(1, e / emax) * bw0), 16);
      ctx.fillStyle = col.muted; ctx.font = '12px sans-serif';
      ctx.fillText(e.toFixed(3), bx + Math.min(1, e / emax) * bw0 + 6, y + 21);
    });
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('점선: 진짜 기울기', bx, top + 3 * rowH + 6);
    ctx.fillText('흰 점: 끌어서 옮기기', bx, top + 3 * rowH + 24);

    readout.textContent = '진짜 기울기 ' + tr.toFixed(3) + ' · 앞으로 ' + fw.toFixed(3) + ' · 뒤로 ' + bw.toFixed(3) +
      ' · 가운데 ' + ce.toFixed(3) + ' (δ = ' + d.toFixed(2) + ')';
  }

  var dragging = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setX(p) {
    var x = XMIN + (p.x - PL) / (PR - PL) * (XMAX - XMIN);
    x0 = Math.max(XMIN + 1.2, Math.min(XMAX - 1.2, x));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x > PR + 10) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setX(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setX(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  dR.addEventListener('input', draw);

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
