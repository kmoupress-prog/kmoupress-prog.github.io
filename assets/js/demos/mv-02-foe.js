/* MIT 머신비전 2강 데모: 앞으로 나아갈 때의 움직임 그림과 확장 초점 */
(function () {
  'use strict';
  var root = document.getElementById('mv-02-foe');
  if (!root) return;

  var W = 640, H = 380, F = 320, NPTS = 260, ZFAR = 30;
  var BLUE = '#2a78d6', ORANGE = '#eb6834';
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

  var l1 = document.createElement('label'); l1.textContent = '속도 ';
  var sR = document.createElement('input'); sR.type = 'range'; sR.min = 2; sR.max = 12; sR.step = 0.5; sR.value = 6;
  l1.appendChild(sR); controls.appendChild(l1);
  var pause = document.createElement('input'); pause.type = 'checkbox'; pause.checked = false;
  var l2 = document.createElement('label'); l2.appendChild(pause); l2.appendChild(document.createTextNode('멈추고 화살표로 보기'));
  controls.appendChild(l2);
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.className = 'btn btn-sm btn-outline-secondary'; resetBtn.textContent = '똑바로 가기';
  controls.appendChild(resetBtn);

  // focus of expansion in image coordinates (pixels from the centre)
  var foe = { x: 90, y: 40 };
  var pts = [];
  function spawn(p, anyDepth) {
    p.Z = anyDepth ? 1 + Math.random() * (ZFAR - 1) : ZFAR * (0.8 + 0.2 * Math.random());
    var x = (Math.random() - 0.5) * W * 1.1, y = (Math.random() - 0.5) * H * 1.1;
    p.X = x * p.Z / F; p.Y = y * p.Z / F;
    p.px = null;
  }
  for (var i = 0; i < NPTS; i++) { var p = {}; spawn(p, true); pts.push(p); }

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function proj(p) { return { x: W / 2 + F * p.X / p.Z, y: H / 2 - F * p.Y / p.Z }; }

  function step(dt) {
    var Wv = +sR.value, U = foe.x / F * Wv, V = foe.y / F * Wv;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], before = proj(p);
      p.X -= U * dt; p.Y -= V * dt; p.Z -= Wv * dt;
      var q = p.Z > 0.6 ? proj(p) : null;
      if (!q || q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 20) { spawn(p, false); continue; }
      p.px = before;
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    var Wv = +sR.value, fx = W / 2 + foe.x, fy = H / 2 - foe.y;
    ctx.lineCap = 'round';
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = proj(p), near = Math.min(1, 6 / p.Z);
      if (pause.checked) {
        // image velocity: (x - x0) * W / Z, scaled for display
        var k = 0.35 * Wv / p.Z;
        var ux = (q.x - fx) * k, uy = (q.y - fy) * k;
        ctx.strokeStyle = BLUE; ctx.globalAlpha = 0.35 + 0.65 * near; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + ux, q.y + uy); ctx.stroke();
        var a = Math.atan2(uy, ux), L = Math.hypot(ux, uy);
        if (L > 4) {
          ctx.beginPath(); ctx.moveTo(q.x + ux, q.y + uy);
          ctx.lineTo(q.x + ux - 5 * Math.cos(a - 0.4), q.y + uy - 5 * Math.sin(a - 0.4));
          ctx.moveTo(q.x + ux, q.y + uy);
          ctx.lineTo(q.x + ux - 5 * Math.cos(a + 0.4), q.y + uy - 5 * Math.sin(a + 0.4)); ctx.stroke();
        }
      } else if (p.px) {
        ctx.strokeStyle = col.text; ctx.globalAlpha = 0.25 + 0.75 * near; ctx.lineWidth = 1 + 2.5 * near;
        ctx.beginPath(); ctx.moveTo(p.px.x, p.px.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
    // FOE handle
    ctx.fillStyle = ORANGE; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(fx, fy, 9, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('확장 초점', fx, fy + 13);
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('주황 점을 끌어 나아가는 방향을 바꿔 보세요', 10, 10);

    var ax = Math.atan(foe.x / F) * 180 / Math.PI, ay = Math.atan(foe.y / F) * 180 / Math.PI;
    readout.textContent = '나아가는 방향: 정면에서 ' + (ax >= 0 ? '오른쪽 ' : '왼쪽 ') + Math.abs(ax).toFixed(0) + '°, ' +
      (ay >= 0 ? '위 ' : '아래 ') + Math.abs(ay).toFixed(0) + '°  ·  가까운 점(굵은 선)일수록 빨리 움직입니다';
  }

  var last = null, raf = null;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    var dt = last === null ? 0 : Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!pause.checked && visible) step(dt);
    if (visible) draw();
  }

  var dragging = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setFoe(p) {
    foe.x = Math.max(-W / 2 + 15, Math.min(W / 2 - 15, p.x - W / 2));
    foe.y = Math.max(-H / 2 + 15, Math.min(H / 2 - 15, H / 2 - p.y));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) { dragging = true; canvas.setPointerCapture(ev.pointerId); setFoe(pos(ev)); });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setFoe(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  pause.addEventListener('change', draw);
  resetBtn.addEventListener('click', function () { foe.x = 0; foe.y = 0; draw(); });

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = null; }).observe(canvas);
  }

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
  raf = requestAnimationFrame(loop);
})();
