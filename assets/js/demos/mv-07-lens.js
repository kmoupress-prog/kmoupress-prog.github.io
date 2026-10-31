/* MIT 머신비전 7강 데모: 얇은 렌즈 — 물체를 끌면 상의 위치와 크기가 1/a + 1/b = 1/f 로 바뀜 */
(function () {
  'use strict';
  var root = document.getElementById('mv-07-lens');
  if (!root) return;

  var W = 640, H = 320;
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

  var fLab = document.createElement('label');
  fLab.textContent = '초점거리 f';
  var fIn = document.createElement('input');
  fIn.type = 'range'; fIn.min = '2'; fIn.max = '6'; fIn.step = '0.1'; fIn.value = '3';
  var fVal = document.createElement('span');
  fLab.appendChild(fIn); fLab.appendChild(fVal);
  controls.appendChild(fLab);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var PX = 20;              // pixels per cm
  var LX = 300, AY = 165;   // lens x, optical axis y
  var obj = { a: 8, h: 2.5 }; // distance (cm, left of lens), height (cm)

  function X(cm) { return LX + cm * PX; }
  function Y(cm) { return AY - cm * PX; }
  function line(x0, y0, x1, y1, c, w, dash) {
    ctx.strokeStyle = c; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
  }
  function arrow(x, y0, y1, c, w) {
    line(x, y0, x, y1, c, w || 3);
    var d = y1 < y0 ? 1 : -1;
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x, y1); ctx.lineTo(x - 7, y1 + d * 11); ctx.lineTo(x + 7, y1 + d * 11); ctx.closePath(); ctx.fill();
  }
  // extend a ray from (x0,y0) through (x1,y1) to the canvas edge
  function ray(x0, y0, x1, y1, c, dash) {
    var dx = x1 - x0, dy = y1 - y0, s = 2000 / (Math.hypot(dx, dy) || 1);
    line(x0, y0, x1 + dx * s, y1 + dy * s, c, 2, dash);
  }

  function draw() {
    var f = parseFloat(fIn.value);
    fVal.textContent = ' ' + f.toFixed(1) + ' cm';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    line(0, AY, W, AY, col.muted, 1);
    // lens
    ctx.fillStyle = SERIES[0]; ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.ellipse(LX, AY, 8, 130, 0, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = SERIES[0]; ctx.lineWidth = 1.5; ctx.stroke();
    // focal points
    [-f, f].forEach(function (x) {
      ctx.fillStyle = col.text; ctx.beginPath(); ctx.arc(X(x), AY, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('F', X(x), AY + 18); ctx.textAlign = 'start';
    });

    var a = obj.a, h = obj.h;
    var ox = X(-a), oy = Y(h);
    var real = a > f + 1e-6;
    var b = Math.abs(a - f) < 1e-6 ? Infinity : 1 / (1 / f - 1 / a); // b<0 => virtual image on the left
    var m = -b / a, hi = m * h;
    var lensTop = Y(h);
    var y3 = h * f / (f - a); // height at lens of the ray through the front focal point
    var c1 = SERIES[2], c2 = SERIES[1], c3 = SERIES[4];
    // ray 1: through the centre
    ray(ox, oy, LX, AY, c1);
    // ray 2: parallel, then through back focal point
    line(ox, oy, LX, lensTop, c2);
    ray(LX, lensTop, X(f), AY, c2);
    // ray 3: through front focal point (or from its direction), then parallel
    if (Math.abs(a - f) > 0.05) {
      line(ox, oy, LX, Y(y3), c3);
      line(LX, Y(y3), W, Y(y3), c3);
    }
    if (!real && isFinite(b)) {
      // virtual image: extend outgoing rays backwards (dashed)
      ray(X(f), AY, LX, lensTop, c2, [4, 4]);
      ray(LX, AY, ox, oy, c1, [4, 4]);
      line(LX, Y(y3), 0, Y(y3), c3, 2, [4, 4]);
    }
    // object arrow
    arrow(ox, AY, oy, col.text, 3);
    ctx.beginPath(); ctx.arc(ox, oy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = col.bg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col.text; ctx.stroke();
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.fillText('물체 (끌어 보세요)', Math.max(4, ox - 60), Math.max(16, oy - 16));
    // image arrow
    var txt;
    if (isFinite(b) && Math.abs(b) < 60) {
      var ix = X(b), iy = Y(hi);
      ctx.globalAlpha = real ? 1 : 0.6;
      arrow(ix, AY, iy, SERIES[0], 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = SERIES[0]; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(real ? '상 (거꾸로)' : '허상 (돋보기처럼 보임)', Math.min(W - 150, ix + 8), Math.min(H - 8, Math.max(16, iy + (real ? 18 : -10))));
    }
    if (!isFinite(b)) txt = '물체가 초점 위에 있어 빛이 나란히 나갑니다 (상이 무한히 멀리)';
    else if (real) txt = 'a = ' + a.toFixed(1) + ' cm → b = <b>' + b.toFixed(1) + ' cm</b> · 상의 크기 ' + Math.abs(m).toFixed(2) + '배, 거꾸로' +
      '<br>1/a + 1/b = ' + (1 / a + 1 / b).toFixed(3) + ' = 1/f (' + (1 / f).toFixed(3) + ')';
    else txt = 'a = ' + a.toFixed(1) + ' cm로 초점보다 가까움 → 렌즈 반대편에 상이 맺히지 않고, 같은 쪽에 ' + Math.abs(m).toFixed(1) + '배 커진 허상이 보입니다 (돋보기)';
    readout.innerHTML = txt;
  }

  var drag = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (Math.hypot(p.x - X(-obj.a), p.y - Y(obj.h)) < 26 || (Math.abs(p.x - X(-obj.a)) < 14 && p.y > Math.min(AY, Y(obj.h)) - 10 && p.y < AY + 10)) {
      drag = true; canvas.setPointerCapture(ev.pointerId); ev.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var p = pos(ev);
    obj.a = Math.max(0.8, Math.min((LX - 12) / PX, (LX - p.x) / PX));
    obj.h = Math.max(0.8, Math.min((AY - 14) / PX, (AY - p.y) / PX));
    draw();
  });
  function end() { drag = false; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  fIn.addEventListener('input', draw);

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
