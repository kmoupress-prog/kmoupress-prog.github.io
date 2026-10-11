/* MIT 머신비전 1강 데모: 바늘구멍 사진기와 원근 투영 x/f = X/Z */
(function () {
  'use strict';
  var root = document.getElementById('mv-01-pinhole');
  if (!root) return;

  var W = 640, H = 360, PX = 230, PY = 190;
  var BLUE = '#2a78d6', ORANGE = '#eb6834', GREEN = '#1baf7a';
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

  var l1 = document.createElement('label'); l1.textContent = '초점거리 f ';
  var fR = document.createElement('input'); fR.type = 'range'; fR.min = 40; fR.max = 160; fR.step = 1; fR.value = 90;
  l1.appendChild(fR); controls.appendChild(l1);
  var flip = document.createElement('input'); flip.type = 'checkbox'; flip.checked = false;
  var l2 = document.createElement('label'); l2.appendChild(flip); l2.appendChild(document.createTextNode('사진 면을 앞으로 옮겨 그리기'));
  controls.appendChild(l2);
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.className = 'btn btn-sm btn-outline-secondary'; resetBtn.textContent = '처음으로';
  controls.appendChild(resetBtn);

  var obj;
  function reset() { obj = { Z: 250, Y: 110 }; }
  reset();

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }

  function draw() {
    var f = +fR.value, front = flip.checked;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // optical axis
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(10, PY); ctx.lineTo(W - 10, PY); ctx.stroke(); ctx.setLineDash([]);

    // camera box (only in the real, behind-the-hole layout)
    if (!front) {
      ctx.globalAlpha = 0.1; ctx.fillStyle = col.text; ctx.fillRect(PX - f, PY - 160, f, 320); ctx.globalAlpha = 1;
      ctx.strokeStyle = col.text; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(PX, PY - 160); ctx.lineTo(PX - f, PY - 160); ctx.lineTo(PX - f, PY + 160); ctx.lineTo(PX, PY + 160); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(PX, PY - 160); ctx.lineTo(PX, PY - 4); ctx.moveTo(PX, PY + 4); ctx.lineTo(PX, PY + 160); ctx.stroke();
    }

    // object: stick from the axis up to (Z, Y)
    var ox = PX + obj.Z, oy = PY - obj.Y;
    ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, PY); ctx.lineTo(ox, oy); ctx.stroke(); ctx.lineCap = 'butt';

    // image of the tip
    var yImg = f * obj.Y / obj.Z;
    var ix = front ? PX + f : PX - f;
    var iy = front ? PY - yImg : PY + yImg;
    // one ray through the pinhole for every point on the stick, 1 unit apart
    var n = Math.floor(Math.abs(obj.Y)), s = obj.Y < 0 ? -1 : 1;
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (var k = 0; k <= n; k++) {
      var y = s * k, yi = f * y / obj.Z;
      ctx.moveTo(ox, PY - y); ctx.lineTo(PX, PY); ctx.lineTo(ix, front ? PY - yi : PY + yi);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = ORANGE;
    for (k = 0; k <= n; k++) ctx.fillRect(ox - 1, PY - s * k - 1, 2, 2);
    // the tip's ray stays solid
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(PX, PY); ctx.lineTo(ix, iy); ctx.stroke();

    // image plane
    ctx.strokeStyle = BLUE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ix, PY - 150); ctx.lineTo(ix, PY + 150); ctx.stroke();
    ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ix, PY); ctx.lineTo(ix, iy); ctx.stroke(); ctx.lineCap = 'butt';
    dot(ix, iy, 5, ORANGE);

    dot(PX, PY, 5, col.text);
    ctx.fillStyle = col.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('바늘구멍', PX + 8, PY + 8);
    ctx.fillStyle = BLUE; ctx.textAlign = 'center';
    ctx.fillText('사진 면', ix, PY + 154);

    // drag handle on the tip
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = col.text; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ox, oy, 9, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('흰 점을 끌어 물체를 옮겨 보세요', W - 12, 10);

    readout.textContent = '물체 높이 Y = ' + obj.Y.toFixed(0) + ', 거리 Z = ' + obj.Z.toFixed(0) +
      '  →  사진 속 높이 y = f·Y/Z = ' + f + ' × ' + obj.Y.toFixed(0) + ' / ' + obj.Z.toFixed(0) + ' = ' + yImg.toFixed(1) +
      (front ? '' : ' (뒷벽에는 거꾸로 맺힘)');
  }

  var dragging = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setObj(p) {
    var f = +fR.value;
    obj.Z = Math.max(f + 40, Math.min(W - PX - 20, p.x - PX));
    obj.Y = Math.max(-150, Math.min(150, PY - p.y));
    if (Math.abs(obj.Y) < 8) obj.Y = obj.Y < 0 ? -8 : 8;
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x < PX + 20) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setObj(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setObj(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  fR.addEventListener('input', function () { obj.Z = Math.max(+fR.value + 40, obj.Z); draw(); });
  flip.addEventListener('change', draw);
  resetBtn.addEventListener('click', function () { reset(); fR.value = 90; flip.checked = false; draw(); });

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
