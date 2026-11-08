/* MIT 머신비전 17강: 스프링으로 두 점 구름 맞추기 — 회전 θ와 이동 t를 손으로 바꿔 Σ‖e_i‖²를 줄여 본다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-17-springs');
  if (!root) return;

  var BLUE = '#2a78d6', GREEN = '#1baf7a', PURPLE = '#6250d6';
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 380, S = 46, CX = W / 2, CY = H / 2 + 14;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '스프링으로 연결된 두 점 구름');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  function button(text, cb) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    controls.appendChild(b); b.addEventListener('click', cb); return b;
  }
  var sTh = slider('회전 θ', -180, 180, 1, 0);
  var sTx = slider('이동 t_x', -4, 4, 0.05, 0);
  var sTy = slider('이동 t_y', -3, 3, 0.05, 0);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // 왼쪽 좌표계에서 잰 점 r_l, 오른쪽 좌표계에서 잰 점 r_r = R* r_l + t* + 잡음
  var RL = [[-2.2, -0.6], [-1.1, 1.3], [0.2, 1.8], [1.6, 0.9], [2.1, -0.8], [0.3, -1.4]];
  var NOISE = [[0.05, -0.04], [-0.06, 0.03], [0.02, 0.07], [0.04, -0.05], [-0.03, -0.06], [-0.05, 0.04]];
  var TH_TRUE = -40 * Math.PI / 180, T_TRUE = [1.3, -0.4];
  function apply(th, t, p) {
    var c = Math.cos(th), s = Math.sin(th);
    return [c * p[0] - s * p[1] + t[0], s * p[0] + c * p[1] + t[1]];
  }
  var RR = RL.map(function (p, i) { var q = apply(TH_TRUE, T_TRUE, p); return [q[0] + NOISE[i][0], q[1] + NOISE[i][1]]; });

  // 에너지 최소 자세 (무게중심을 뺀 뒤 회전각을 닫힌 꼴로)
  function best() {
    var n = RL.length, ml = [0, 0], mr = [0, 0], i;
    for (i = 0; i < n; i++) { ml[0] += RL[i][0] / n; ml[1] += RL[i][1] / n; mr[0] += RR[i][0] / n; mr[1] += RR[i][1] / n; }
    var sc = 0, ss = 0;
    for (i = 0; i < n; i++) {
      var a = [RL[i][0] - ml[0], RL[i][1] - ml[1]], b = [RR[i][0] - mr[0], RR[i][1] - mr[1]];
      sc += a[0] * b[0] + a[1] * b[1]; ss += a[0] * b[1] - a[1] * b[0];
    }
    var th = Math.atan2(ss, sc), rm = apply(th, [0, 0], ml);
    return { th: th, t: [mr[0] - rm[0], mr[1] - rm[1]] };
  }
  function energy(th, t) {
    var E = 0;
    RL.forEach(function (p, i) { var q = apply(th, t, p); E += Math.pow(q[0] - RR[i][0], 2) + Math.pow(q[1] - RR[i][1], 2); });
    return E;
  }
  var B = best(), EMIN = energy(B.th, B.t);
  button('에너지 최소 자세 보기', function () {
    sTh.value = Math.round(B.th * 180 / Math.PI); sTx.value = B.t[0].toFixed(2); sTy.value = B.t[1].toFixed(2); draw();
  });
  button('처음으로', function () { sTh.value = 0; sTx.value = 0; sTy.value = 0; draw(); });

  function X(p) { return [CX + p[0] * S, CY - p[1] * S]; }
  function spring(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    if (L > 4) {
      var ux = dx / L, uy = dy / L, vx = -uy, vy = ux, amp = Math.min(6, 0.25 * L), n = 8;
      ctx.lineTo(a[0] + 0.15 * dx, a[1] + 0.15 * dy);
      for (var k = 0; k < n; k++) {
        var s = 0.15 + 0.7 * (k + 0.5) / n, sg = k % 2 ? -1 : 1;
        ctx.lineTo(a[0] + s * dx + sg * amp * vx, a[1] + s * dy + sg * amp * vy);
      }
      ctx.lineTo(a[0] + 0.85 * dx, a[1] + 0.85 * dy);
    }
    ctx.lineTo(b[0], b[1]); ctx.stroke();
  }

  function draw() {
    var th = +sTh.value * Math.PI / 180, t = [+sTx.value, +sTy.value];
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (var gx = -6; gx <= 6; gx++) { var a = X([gx, -4]), b = X([gx, 4]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (var gy = -4; gy <= 4; gy++) { var c = X([-7, gy]), d = X([7, gy]); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }

    var moved = RL.map(function (p) { return apply(th, t, p); });
    ctx.strokeStyle = PURPLE; ctx.lineWidth = 1.6;
    moved.forEach(function (q, i) { spring(X(q), X(RR[i])); });
    RR.forEach(function (p) { var q = X(p); ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill(); });
    moved.forEach(function (p) {
      var q = X(p); ctx.strokeStyle = BLUE; ctx.lineWidth = 2.4; ctx.fillStyle = C.bg;
      ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill(); ctx.stroke();
    });

    ctx.font = '13px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'top';
    ctx.fillText('초록: 오른쪽 점 r_r · 파란 고리: 왼쪽 점을 R, t로 옮긴 위치 · 보라: 스프링(길이 = 오차 e_i)', 8, 8);
    var E = energy(th, t), done = E < EMIN * 1.15 + 0.01;
    readout.innerHTML = 'θ = ' + (+sTh.value) + '° · t = (' + t[0].toFixed(2) + ', ' + t[1].toFixed(2) + ')' +
      ' · 에너지 합 Σ‖e<sub>i</sub>‖² = <b>' + E.toFixed(2) + '</b> (가장 작은 값 ' + EMIN.toFixed(2) + ')' +
      (done ? ' · <b style="color:' + GREEN + '">거의 최소입니다</b>' : '');
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
