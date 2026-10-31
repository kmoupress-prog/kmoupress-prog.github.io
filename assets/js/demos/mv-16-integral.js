/* MIT 머신비전 16강: 적분 영상(누적합 표)으로 상자 평균을 네 번의 덧셈·뺄셈만에 구하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-16-integral');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575'); C.bg = v('--main-bg', '#fff');
  }

  var N = 96, S = 3;                    // 96x96 영상, 화면에서 3배 확대
  var W = 640, H = N * S + 34;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '원본 영상과 적분 영상으로 흐린 영상');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  var lab = document.createElement('label'); lab.textContent = '상자 반지름 ';
  var sR = document.createElement('input'); sR.type = 'range'; sR.min = 0; sR.max = 20; sR.step = 1; sR.value = 4;
  lab.appendChild(sR); controls.appendChild(lab);
  var hint = document.createElement('span'); hint.textContent = '왼쪽 영상을 끌어 상자를 그려 보세요'; controls.appendChild(hint);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  // 원본 영상: 체커 + 원 + 잡음 (값 0~255)
  var img = new Float64Array(N * N);
  (function () {
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var v = ((x >> 3) + (y >> 3)) & 1 ? 200 : 60;
      var dx = x - 62, dy = y - 38; if (dx * dx + dy * dy < 400) v = 245;
      if (x > 14 && x < 40 && y > 58 && y < 84) v = 20;
      v += (rnd() - 0.5) * 50;
      img[y * N + x] = Math.max(0, Math.min(255, v));
    }
  })();
  // 적분 영상: (N+1)x(N+1), G[y][x] = 0..y-1, 0..x-1 합
  var M = N + 1, G = new Float64Array(M * M);
  for (var y = 1; y <= N; y++) {
    var row = 0;
    for (var x = 1; x <= N; x++) { row += img[(y - 1) * N + (x - 1)]; G[y * M + x] = G[(y - 1) * M + x] + row; }
  }
  // [x0,x1) x [y0,y1) 의 합: 네 모서리
  function boxSum(x0, y0, x1, y1) { return G[y1 * M + x1] - G[y0 * M + x1] - G[y1 * M + x0] + G[y0 * M + x0]; }

  var offA = document.createElement('canvas'); offA.width = N; offA.height = N;
  var offB = document.createElement('canvas'); offB.width = N; offB.height = N;
  function paint(off, data) {
    var oc = off.getContext('2d'), im = oc.createImageData(N, N);
    for (var i = 0; i < N * N; i++) { var v = data[i]; im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = v; im.data[4 * i + 3] = 255; }
    oc.putImageData(im, 0, 0);
  }
  paint(offA, img);

  var rect = { x0: 50, y0: 20, x1: 76, y1: 56 }, drag = null;
  var AX = 8, BX = W - N * S - 8, OY = 26;

  function blur() {
    var r = +sR.value, out = new Float64Array(N * N);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var x0 = Math.max(0, x - r), x1 = Math.min(N, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(N, y + r + 1);
      out[y * N + x] = boxSum(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0));
    }
    paint(offB, out);
    return r;
  }

  function draw() {
    var r = blur();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offA, AX, OY, N * S, N * S); ctx.drawImage(offB, BX, OY, N * S, N * S);
    ctx.font = '13px sans-serif'; ctx.fillStyle = C.text; ctx.textBaseline = 'bottom';
    ctx.fillText('원본 (상자 합 구하기)', AX, OY - 6);
    ctx.fillText('적분 영상으로 흐린 결과', BX, OY - 6);
    // rect
    var x0 = Math.min(rect.x0, rect.x1), x1 = Math.max(rect.x0, rect.x1), y0 = Math.min(rect.y0, rect.y1), y1 = Math.max(rect.y0, rect.y1);
    ctx.strokeStyle = SERIES[0]; ctx.lineWidth = 2; ctx.strokeRect(AX + x0 * S, OY + y0 * S, (x1 - x0) * S, (y1 - y0) * S);
    var corners = [[x1, y1, '+', SERIES[2]], [x0, y0, '+', SERIES[2]], [x1, y0, '−', SERIES[1]], [x0, y1, '−', SERIES[1]]];
    corners.forEach(function (c) {
      ctx.fillStyle = c[3]; ctx.beginPath(); ctx.arc(AX + c[0] * S, OY + c[1] * S, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    var n = (x1 - x0) * (y1 - y0), sum = boxSum(x0, y0, x1, y1);
    var k = 2 * r + 1;
    readout.innerHTML = '파란 상자: ' + (x1 - x0) + '×' + (y1 - y0) + ' = ' + n + '칸 · 평균 <b>' + (n ? (sum / n).toFixed(1) : '-') +
      '</b> · 그냥 더하면 덧셈 ' + Math.max(0, n - 1) + '번, 적분 영상은 <b>3번</b> (초록 +, 주황 −)<br>' +
      '흐리기 한 칸당 계산: 그냥 하면 ' + k + '×' + k + ' = ' + (k * k) + '번 · 적분 영상은 항상 모서리 4개로 <b>3번</b> (반지름과 무관)';
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H;
    return { x: Math.max(0, Math.min(N, Math.round((px - AX) / S))), y: Math.max(0, Math.min(N, Math.round((py - OY) / S))), inA: px < AX + N * S + 10 };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e); if (!p.inA) return;
    rect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; drag = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); draw();
  });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; var p = pos(e); rect.x1 = p.x; rect.y1 = p.y; draw(); });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  sR.addEventListener('input', draw);

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
