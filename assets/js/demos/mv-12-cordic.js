/* MIT 머신비전 12강 데모: CORDIC - 덧셈과 반으로 나누기만으로 기울기의 각도와 크기 구하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-12-cordic');
  if (!root) return;

  var W = 640, H = 380, CX = 190, CY = 200, RAD = 150;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', VIOLET = '#6250d6', MAGENTA = '#e87ba4';
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
  var l = document.createElement('label'); l.textContent = '단계 수 ';
  var nR = document.createElement('input'); nR.type = 'range'; nR.min = 0; nR.max = 10; nR.step = 1; nR.value = 4;
  l.appendChild(nR); controls.appendChild(l);
  var playB = document.createElement('button'); playB.type = 'button'; playB.textContent = '처음부터 한 단계씩';
  controls.appendChild(playB);

  var ex = 0.62, ey = 0.48; // gradient vector (E_x, E_y), y up

  function cordic(n) {
    var ax = Math.abs(ex), ay = Math.abs(ey), swap = ay > ax;
    var x = swap ? ay : ax, y = swap ? ax : ay, z = 0, K = 1;
    var steps = [{ x: x, y: y }], rows = [];
    for (var i = 1; i <= n; i++) {
      var d = y >= 0 ? 1 : -1, sh = Math.pow(2, -i);
      var nx = x + d * y * sh, ny = y - d * x * sh;       // only add/subtract and halving
      var a = Math.atan(sh) * 180 / Math.PI;
      z += d * a; K *= Math.sqrt(1 + sh * sh);
      x = nx; y = ny;
      steps.push({ x: x, y: y });
      rows.push({ i: i, d: d, a: a, z: z });
    }
    // unfold the octant
    var q1 = swap ? 90 - z : z, ang = q1;
    if (ex < 0) ang = 180 - q1;
    if (ey < 0) ang = -ang;
    return { steps: steps, rows: rows, swap: swap, angle: ang, mag: x / K, K: K };
  }

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function arrow(x, y, c, w, alpha, dash) {
    var X = CX + x * RAD, Y = CY - y * RAD, ang = Math.atan2(Y - CY, X - CX);
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(X, Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(X, Y);
    ctx.lineTo(X - 11 * Math.cos(ang - 0.4), Y - 11 * Math.sin(ang - 0.4));
    ctx.lineTo(X - 11 * Math.cos(ang + 0.4), Y - 11 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  var shown = 4;
  function draw() {
    var n = +nR.value, r = cordic(n), k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // axes + octant wedge
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CX - RAD - 10, CY); ctx.lineTo(CX + RAD + 10, CY); ctx.moveTo(CX, CY - RAD - 10); ctx.lineTo(CX, CY + RAD + 10); ctx.stroke();
    ctx.fillStyle = VIOLET; ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, RAD, -Math.PI / 4, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '12px sans-serif'; ctx.fillStyle = col.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Ex', CX + RAD + 2, CY - 6); ctx.fillText('Ey', CX + 6, CY - RAD - 2);

    // original and folded vector, then CORDIC steps
    arrow(ex, ey, ORANGE, 3, 1);
    var s0 = r.steps[0];
    if (Math.abs(s0.x - ex) > 1e-9 || Math.abs(s0.y - ey) > 1e-9) arrow(s0.x, s0.y, VIOLET, 2, 0.9, [5, 4]);
    for (k = 1; k < r.steps.length; k++) {
      arrow(r.steps[k].x, r.steps[k].y, BLUE, k === r.steps.length - 1 ? 2.6 : 1.4, k === r.steps.length - 1 ? 1 : 0.35);
    }
    // drag handle
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(CX + ex * RAD, CY - ey * RAD, 9, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // table
    var tx = 390, ty = 34;
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText('단계', tx, ty); ctx.fillText('돌린 각도', tx + 50, ty); ctx.fillText('누적', tx + 150, ty);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = VIOLET;
    ctx.fillText('0', tx, ty + 22); ctx.fillText(r.swap ? '45° 안으로 접기(뒤집기)' : '45° 안으로 접기', tx + 50, ty + 22);
    for (k = 0; k < r.rows.length; k++) {
      var row = r.rows[k], y = ty + 44 + k * 20;
      ctx.fillStyle = k === r.rows.length - 1 ? BLUE : col.text;
      ctx.fillText(String(row.i), tx, y);
      ctx.fillText((row.d > 0 ? '+' : '-') + row.a.toFixed(2) + '°', tx + 50, y);
      ctx.fillText(row.z.toFixed(2) + '°', tx + 150, y);
    }
    var trueA = Math.atan2(ey, ex) * 180 / Math.PI, trueM = Math.hypot(ex, ey);
    var by = ty + 44 + 10 * 20 + 6;
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif';
    ctx.fillText('돌린 각도: tan = 1/2, 1/4, 1/8, …', tx, by);

    readout.textContent = '진짜 각도 ' + trueA.toFixed(2) + '° · CORDIC ' + r.angle.toFixed(2) + '° (오차 ' +
      Math.abs(r.angle - trueA).toFixed(2) + '°) · 진짜 크기 ' + trueM.toFixed(3) + ' · CORDIC 크기 ' + r.mag.toFixed(3) +
      ' (늘어난 비율 ' + r.K.toFixed(3) + '로 나눔)';
  }

  // ---------- interaction ----------
  var dragging = false, timer = 0;
  function pos(ev) {
    var rc = canvas.getBoundingClientRect();
    return { x: (ev.clientX - rc.left) * W / rc.width, y: (ev.clientY - rc.top) * H / rc.height };
  }
  function setVec(p) {
    var x = (p.x - CX) / RAD, y = (CY - p.y) / RAD, m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    if (m < 0.08) { var s = 0.08 / (m || 1); x *= s; y *= s; if (!m) x = 0.08; }
    ex = x; ey = y; draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x > 380) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setVec(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setVec(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  nR.addEventListener('input', draw);
  playB.addEventListener('click', function () {
    clearInterval(timer);
    nR.value = 0; draw();
    timer = setInterval(function () {
      if (+nR.value >= 10) { clearInterval(timer); return; }
      nR.value = +nR.value + 1; draw();
    }, 600);
  });

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
