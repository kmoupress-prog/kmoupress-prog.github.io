/* MIT 머신비전 11강 데모: 흐린 경계의 위치를 픽셀보다 정밀하게 (포물선 보간) */
(function () {
  'use strict';
  var root = document.getElementById('mv-11-subpixel');
  if (!root) return;

  var W = 640, H = 470, N = 13, X0 = 30, PW = (W - 2 * X0) / N;
  var A_TOP = 34, A_BOT = 150, B_TOP = 190, B_BOT = 310, C_TOP = 352, C_BOT = 450;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', AQUA = '#1baf7a', MAGENTA = '#e87ba4';
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
  function addRange(label, min, max, step, value) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
    l.appendChild(r); controls.appendChild(l); return r;
  }
  var blurR = addRange('흐림', 0.3, 2.5, 0.05, 1.0);
  var noiseR = addRange('잡음', 0, 0.05, 0.002, 0);
  var lab = document.createElement('label'); lab.textContent = '봉우리 맞추기 ';
  var sel = document.createElement('select');
  [['parabola', '포물선'], ['triangle', '삼각형']].forEach(function (o) {
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
  });
  lab.appendChild(sel); controls.appendChild(lab);

  // ---------- model ----------
  function erf(x) { // Abramowitz-Stegun 7.1.26
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function Phi(t) { return 0.5 * (1 + erf(t / Math.SQRT2)); }
  function g(t) { return t * Phi(t) + Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI); }
  var LO = 0.15, HI = 0.85;
  // pixel value = average of the blurred step over the pixel (box sensor)
  function pixel(i, e, sig) { return LO + (HI - LO) * sig * (g((i + 0.5 - e) / sig) - g((i - 0.5 - e) / sig)); }
  function cont(x, e, sig) { return LO + (HI - LO) * Phi((x - e) / sig); }

  var noise = [];
  for (var k = 0; k < N; k++) {
    var u = 1 - Math.random(), v = Math.random();
    noise.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  }
  var edge = 6.3;

  function analyse(e, sig, nz, mode) {
    var E = [], G = [], i;
    for (i = 0; i < N; i++) E.push(pixel(i, e, sig) + nz * noise[i]);
    for (i = 0; i < N; i++) G.push(i > 0 && i < N - 1 ? Math.abs(E[i + 1] - E[i - 1]) / 2 : 0);
    var best = 2;
    for (i = 2; i < N - 2; i++) if (G[i] > G[best]) best = i;
    var gm = G[best - 1], g0 = G[best], gp = G[best + 1], s;
    if (mode === 'parabola') s = (gp - gm) / (2 * (2 * g0 - gp - gm));
    else s = (gp - gm) / (2 * (g0 - Math.min(gp, gm)));
    if (!isFinite(s)) s = 0;
    return { E: E, G: G, i0: best, s: s, est: best + s, gm: gm, g0: g0, gp: gp };
  }

  // ---------- drawing ----------
  function px(x) { return X0 + (x + 0.5) * PW; } // pixel index -> canvas x (pixel centre)
  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function label(t, x, y, c, bold, align) {
    ctx.fillStyle = c; ctx.font = (bold ? 'bold ' : '') + '13px sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(t, x, y);
  }

  function draw() {
    var sig = +blurR.value, nz = +noiseR.value, mode = sel.value;
    var r = analyse(edge, sig, nz, mode), i;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // panel A: brightness
    label('① 픽셀 밝기 (위의 흰 원을 좌우로 끌어 경계를 옮기세요)', X0, A_TOP - 8, col.text, true);
    var ah = A_BOT - A_TOP;
    for (i = 0; i < N; i++) {
      var v = Math.max(0, Math.min(1, r.E[i]));
      var gv = Math.round(255 * v);
      ctx.fillStyle = 'rgb(' + gv + ',' + gv + ',' + gv + ')';
      ctx.fillRect(X0 + i * PW + 1, A_TOP, PW - 2, ah);
    }
    ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.beginPath();
    for (var x = -0.5; x <= N - 0.5; x += 0.05) {
      var yy = A_BOT - cont(x, edge, sig) * ah;
      if (x === -0.5) ctx.moveTo(px(x), yy); else ctx.lineTo(px(x), yy);
    }
    ctx.stroke();

    // true edge line through all panels
    ctx.setLineDash([3, 3]); ctx.strokeStyle = col.text; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px(edge), A_TOP); ctx.lineTo(px(edge), B_BOT); ctx.stroke();
    ctx.setLineDash([]);

    // panel B: gradient magnitude
    label('② 기울기 크기 (이웃 픽셀의 차이)', X0, B_TOP - 8, col.text, true);
    var gmax = 0;
    for (i = 0; i < N; i++) gmax = Math.max(gmax, r.G[i]);
    var bh = B_BOT - B_TOP, gs = gmax > 0 ? (bh - 18) / gmax : 1;
    for (i = 0; i < N; i++) {
      var hl = Math.abs(i - r.i0) <= 1;
      ctx.fillStyle = hl ? BLUE : (col.muted);
      ctx.globalAlpha = hl ? 1 : 0.35;
      ctx.fillRect(X0 + i * PW + PW * 0.2, B_BOT - r.G[i] * gs, PW * 0.6, r.G[i] * gs);
    }
    ctx.globalAlpha = 1;
    // fitted curve
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.4; ctx.beginPath();
    var first = true;
    for (var t = -1.3; t <= 1.3001; t += 0.02) {
      var gt;
      if (mode === 'parabola') {
        var a = (r.gp + r.gm - 2 * r.g0) / 2, b = (r.gp - r.gm) / 2;
        gt = a * t * t + b * t + r.g0;
      } else {
        var slope = r.g0 - Math.min(r.gp, r.gm), peak = r.g0 + slope * Math.abs(r.s);
        gt = peak - slope * Math.abs(t - r.s);
      }
      if (gt < 0) { first = true; continue; }
      var cx = px(r.i0 + t), cy = B_BOT - gt * gs;
      if (first) { ctx.moveTo(cx, cy); first = false; } else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px(r.est), A_BOT + 6); ctx.lineTo(px(r.est), B_BOT); ctx.stroke();
    label('추정', px(r.est) + 4, B_TOP + 16, ORANGE, true);
    label('진짜', px(edge) + 4, A_BOT + 20, col.text, false);

    // handle
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = MAGENTA; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px(edge), A_TOP + 14, 10, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // panel C: error vs sub-pixel offset (noise-free sweep)
    label('③ 경계가 픽셀 안 어디에 있느냐에 따른 오차 (잡음 없을 때)', X0, C_TOP - 10, col.text, true);
    var cx0 = X0 + 40, cw = W - X0 - 40 - cx0, ch = C_BOT - C_TOP, ymax = 0.15;
    function ex(o) { return cx0 + (o + 0.5) * cw; }
    function ey(err) { return C_TOP + ch / 2 - Math.max(-ymax, Math.min(ymax, err)) / ymax * ch / 2; }
    ctx.fillStyle = AQUA; ctx.globalAlpha = 0.18;
    ctx.fillRect(cx0, ey(0.025), cw, ey(-0.025) - ey(0.025));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.strokeRect(cx0, C_TOP, cw, ch);
    ctx.beginPath(); ctx.moveTo(cx0, ey(0)); ctx.lineTo(cx0 + cw, ey(0)); ctx.stroke();
    ctx.font = '11px sans-serif'; ctx.fillStyle = col.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('+0.15', cx0 - 4, C_TOP + 6); ctx.fillText('0', cx0 - 4, ey(0)); ctx.fillText('-0.15', cx0 - 4, C_BOT - 6);
    ctx.textAlign = 'left'; ctx.fillStyle = AQUA;
    ctx.fillText('±1/40 픽셀', cx0 + 4, ey(-0.025) + 9);
    ctx.textAlign = 'center'; ctx.fillStyle = col.muted; ctx.textBaseline = 'top';
    ctx.fillText('픽셀 왼쪽 끝', ex(-0.5) + 30, C_BOT + 3); ctx.fillText('픽셀 가운데', ex(0), C_BOT + 3); ctx.fillText('픽셀 오른쪽 끝', ex(0.5) - 34, C_BOT + 3);
    var base = Math.round(edge);
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 2; ctx.beginPath();
    for (var n = 0; n <= 100; n++) {
      var o = -0.5 + n / 100, rr = analyse(base + o, sig, 0, mode);
      var yv = ey(rr.est - (base + o));
      if (n === 0) ctx.moveTo(ex(o), yv); else ctx.lineTo(ex(o), yv);
    }
    ctx.stroke();
    var cur = analyse(edge, sig, 0, mode);
    ctx.fillStyle = MAGENTA;
    ctx.beginPath(); ctx.arc(ex(edge - base), ey(cur.est - edge), 6, 0, 2 * Math.PI); ctx.fill();

    var err = r.est - edge;
    readout.textContent = '진짜 경계 ' + edge.toFixed(3) + ' · 추정 ' + r.est.toFixed(3) + ' · 오차 ' +
      (err >= 0 ? '+' : '') + err.toFixed(3) + ' 픽셀' + (Math.abs(err) > 1e-4 ? ' (약 1/' + Math.round(1 / Math.abs(err)) + ' 픽셀)' : '');
  }

  // ---------- interaction ----------
  var dragging = false;
  function toX(ev) {
    var rc = canvas.getBoundingClientRect();
    return { x: (ev.clientX - rc.left) * W / rc.width, y: (ev.clientY - rc.top) * H / rc.height };
  }
  function setEdge(p) {
    edge = Math.max(3, Math.min(N - 4, (p.x - X0) / PW - 0.5));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = toX(ev);
    if (p.y > B_BOT + 10) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setEdge(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setEdge(toX(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  blurR.addEventListener('input', draw);
  noiseR.addEventListener('input', draw);
  sel.addEventListener('change', draw);

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
