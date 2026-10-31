/* MIT 머신비전 16강: 너무 듬성듬성 찍으면 빠른 물결이 느린 물결로 둔갑한다 (에일리어싱) + 찍기 전 흐리기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-16-alias');
  if (!root) return;

  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6'];
  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575');
    C.bg = v('--main-bg', '#fff'); C.grid = v('--main-border-color', '#e5e5e5');
  }

  var W = 640, H = 330;
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '물결 신호와 일정 간격으로 찍은 점, 그 점들로 다시 그린 신호');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val, cb) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', cb); return i;
  }
  var sF = slider('물결 빠르기 (번/칸)', 0.05, 1.6, 0.01, 0.8, draw);
  var sN = slider('찍기 전 상자 필터 횟수', 0, 4, 1, 0, draw);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var NS = 16;               // 화면에 보이는 샘플 칸 수
  var X0 = 30, X1 = W - 14, PX = (X1 - X0) / NS;
  var top = { y: 40, h: 120 }, bot = { y: 196, h: 120 };

  // 상자(폭 1칸) N번 = sinc^N 감쇠. 위상 변화 없음(대칭)
  function gain(f, n) {
    if (n === 0) return 1;
    var a = Math.PI * f, s = Math.abs(a) < 1e-9 ? 1 : Math.sin(a) / a;
    return Math.pow(s, n);
  }

  function axis(panel, label) {
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, panel.y + panel.h / 2); ctx.lineTo(X1, panel.y + panel.h / 2); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, X0, panel.y - 4);
  }
  function curve(panel, fn, color, lw, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (var px = X0; px <= X1; px++) {
      var t = (px - X0) / PX, y = panel.y + panel.h / 2 - fn(t) * panel.h * 0.42;
      if (px === X0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function draw() {
    var f = +sF.value, n = +sN.value, g = gain(f, n);
    // 찍었을 때 보이는 물결 빠르기: 0~0.5 사이로 접힘
    var fa = f - Math.round(f); var fAbs = Math.abs(fa);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    axis(top, '진짜 신호 (회색) · 필터를 거친 신호 (파랑) · 1칸마다 찍은 점 (주황)');
    axis(bot, '찍은 점만 보고 다시 그린 신호 (초록)');
    curve(top, function (t) { return Math.cos(2 * Math.PI * f * t); }, C.muted, 1, []);
    if (n > 0) curve(top, function (t) { return g * Math.cos(2 * Math.PI * f * t); }, SERIES[0], 2, []);
    // 샘플
    for (var k = 0; k <= NS; k++) {
      var v = g * Math.cos(2 * Math.PI * f * k), xk = X0 + k * PX;
      [top, bot].forEach(function (p) {
        var y = p.y + p.h / 2 - v * p.h * 0.42;
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(xk, p.y + p.h / 2); ctx.lineTo(xk, y); ctx.stroke();
        ctx.fillStyle = SERIES[1]; ctx.beginPath(); ctx.arc(xk, y, 4, 0, 7); ctx.fill();
      });
    }
    // 다시 그린 신호 = 0~0.5 대역의 같은 점을 지나는 물결
    curve(bot, function (t) { return g * Math.cos(2 * Math.PI * fAbs * t); }, SERIES[2], 2.2, []);
    if (f > 0.5) curve(bot, function (t) { return Math.cos(2 * Math.PI * f * t) * g; }, C.muted, 1, [4, 4]);
    var state = f < 0.5 ? '<b style="color:' + SERIES[2] + '">제대로 복원</b>' :
      (Math.abs(f - 0.5) < 0.011 ? '<b>경계 (딱 2번)</b>' : '<b style="color:' + SERIES[1] + '">둔갑!</b> ' + f.toFixed(2) + '번/칸 → ' + fAbs.toFixed(2) + '번/칸으로 보임');
    readout.innerHTML = '한 주기에 찍는 횟수 <b>' + (1 / f).toFixed(2) + '</b>번 · ' + state +
      ' · 필터 뒤 남은 세기 <b>' + Math.abs(g).toFixed(3) + '</b>';
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
