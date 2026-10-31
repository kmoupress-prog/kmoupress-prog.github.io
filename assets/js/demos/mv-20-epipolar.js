/* MIT 머신비전 20강: 에피폴라 선 — 왼쪽 사진의 한 점에 대응하는 짝은 오른쪽 사진의 한 직선 위에만 있다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-20-epipolar');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 300;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '왼쪽 사진과 오른쪽 사진, 그리고 에피폴라 선');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  var sZ = slider('점까지 거리', 1.2, 12, 0.05, 4);
  var sY = slider('카메라 모으기 각도', 0, 25, 1, 12);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var B = 1.0, F = 260;                   // 기준선(m), 초점거리(px)
  var PW = 300, PH = 230, PY = 36, LX = 10, RX = W - PW - 10;
  var sel = { u: 40, v: -30 };            // 왼쪽 사진에서 고른 점 (사진 중심 기준 px)

  function camPose(sign) { // sign=-1 왼쪽, +1 오른쪽
    var yaw = -sign * (+sY.value) * Math.PI / 180;  // 안쪽으로 모음
    return { o: [sign * B / 2, 0, 0], c: Math.cos(yaw), s: Math.sin(yaw) };
  }
  function toCam(cam, p) { // 세계 → 카메라 (y축 둘레 회전)
    var x = p[0] - cam.o[0], y = p[1] - cam.o[1], z = p[2] - cam.o[2];
    return [cam.c * x - cam.s * z, y, cam.s * x + cam.c * z];
  }
  function fromCamDir(cam, d) { return [cam.c * d[0] + cam.s * d[2], d[1], -cam.s * d[0] + cam.c * d[2]]; }
  function proj(cam, p) { var q = toCam(cam, p); return q[2] > 0.05 ? [F * q[0] / q[2], F * q[1] / q[2], q[2]] : null; }

  function panel(x0, title) {
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(x0, PY, PW, PH);
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText(title, x0, PY - 6);
  }
  function inside(u, v) { return Math.abs(u) <= PW / 2 && Math.abs(v) <= PH / 2; }
  function draw() {
    var L = camPose(-1), R = camPose(1), Z = +sZ.value;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    panel(LX, '왼쪽 사진 (점을 눌러 고르세요)'); panel(RX, '오른쪽 사진');
    // 고른 화소의 광선
    var dir = fromCamDir(L, [sel.u / F, sel.v / F, 1]);
    function along(t) { return [L.o[0] + dir[0] * t, L.o[1] + dir[1] * t, L.o[2] + dir[2] * t]; }
    // 거리 Z(카메라 앞 방향 깊이) → t
    var P = along(Z / 1);
    // 에피폴라 선: 광선 위 여러 깊이를 오른쪽에 투영
    ctx.save(); ctx.beginPath(); ctx.rect(RX, PY, PW, PH); ctx.clip();
    ctx.strokeStyle = SERIES[4]; ctx.lineWidth = 2; ctx.beginPath();
    var started = false;
    for (var t = 0.3; t <= 60; t *= 1.04) {
      var q = proj(R, along(t)); if (!q) continue;
      var X = RX + PW / 2 + q[0], Y = PY + PH / 2 + q[1];
      if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    // 깊이 눈금
    [1.5, 2, 3, 5, 8, 12].forEach(function (d) {
      var q = proj(R, along(d)); if (!q) return;
      ctx.fillStyle = SERIES[4]; ctx.beginPath(); ctx.arc(RX + PW / 2 + q[0], PY + PH / 2 + q[1], 2.5, 0, 7); ctx.fill();
      ctx.font = '10px sans-serif'; ctx.fillText(d + 'm', RX + PW / 2 + q[0] + 3, PY + PH / 2 + q[1] - 3);
    });
    // 에피폴 (왼쪽 카메라 중심이 오른쪽 사진에 찍히는 곳)
    var e = proj(R, L.o);
    ctx.restore();
    var eTxt = '';
    if (e && inside(e[0], e[1])) {
      ctx.fillStyle = SERIES[1]; ctx.fillRect(RX + PW / 2 + e[0] - 4, PY + PH / 2 + e[1] - 4, 8, 8);
      eTxt = '에피폴이 사진 안 (' + e[0].toFixed(0) + ', ' + e[1].toFixed(0) + ')';
    } else if (e) eTxt = '에피폴은 사진 밖 u = ' + e[0].toFixed(0) + 'px'; else eTxt = '에피폴은 무한히 멂 (두 카메라가 나란함 → 에피폴라 선이 가로줄)';
    // 왼쪽: 고른 점
    ctx.fillStyle = SERIES[0]; ctx.beginPath(); ctx.arc(LX + PW / 2 + sel.u, PY + PH / 2 + sel.v, 6, 0, 7); ctx.fill();
    // 오른쪽: 실제 짝
    var qp = proj(R, P), msg = '';
    if (qp && inside(qp[0], qp[1])) {
      ctx.fillStyle = SERIES[2]; ctx.beginPath(); ctx.arc(RX + PW / 2 + qp[0], PY + PH / 2 + qp[1], 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      msg = '오른쪽에서의 짝 (' + qp[0].toFixed(1) + ', ' + qp[1].toFixed(1) + ')px';
    } else msg = '짝이 오른쪽 사진 밖으로 나감';
    readout.innerHTML = '왼쪽에서 고른 점 (' + sel.u.toFixed(0) + ', ' + sel.v.toFixed(0) + ')px · 거리 ' + Z.toFixed(2) + 'm → <b style="color:' + SERIES[2] + '">' + msg + '</b><br>' +
      '보라 선 = 에피폴라 선 (거리를 몰라도 짝은 이 선 위) · ' + eTxt;
  }

  function pick(e) {
    var r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (x < LX || x > LX + PW || y < PY || y > PY + PH) return;
    sel = { u: x - LX - PW / 2, v: y - PY - PH / 2 }; draw();
  }
  var down = false;
  canvas.addEventListener('pointerdown', function (e) { down = true; pick(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', function (e) { if (down) pick(e); });
  canvas.addEventListener('pointerup', function () { down = false; }); canvas.addEventListener('pointercancel', function () { down = false; });

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
