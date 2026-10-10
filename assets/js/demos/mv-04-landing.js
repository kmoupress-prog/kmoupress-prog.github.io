/* MIT 머신비전 4강 데모: 충돌 시간만 보고 착륙선 내려앉히기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-04-landing');
  if (!root) return;

  var W = 640, H = 340, Z0 = 100, T0 = 10, G = 1.62, TCAP = 60;
  var GX = 20, GW = 110, GT = 30, GB = 300;              // lander view
  var PL = 185, PR = 625, P1T = 26, P1B = 150, P2T = 186, P2B = 300; // plots
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

  var l1 = document.createElement('label'); l1.textContent = '충돌 시간을 1초마다 줄이는 양 k ';
  var kR = document.createElement('input'); kR.type = 'range'; kR.min = 0; kR.max = 1; kR.step = 0.05; kR.value = 0.5;
  var kV = document.createElement('span'); kV.style.minWidth = '2.5em';
  l1.appendChild(kR); l1.appendChild(kV); controls.appendChild(l1);
  var playBtn = document.createElement('button');
  playBtn.type = 'button'; playBtn.className = 'btn btn-sm btn-outline-secondary'; playBtn.textContent = '내려가기';
  controls.appendChild(playBtn);

  // descent with measured time-to-contact T(t) = T0 - k t  =>  Z(t) = Z0 (1 - k t / T0)^(1/k)
  function traj(k) {
    var tEnd = k > 0 ? Math.min(TCAP, T0 / k) : TCAP, n = 600, pts = [];
    for (var i = 0; i <= n; i++) {
      var t = tEnd * i / n, Z, T;
      if (k > 0) { T = T0 - k * t; Z = T > 1e-9 ? Z0 * Math.pow(T / T0, 1 / k) : 0; }
      else { T = T0; Z = Z0 * Math.exp(-t / T0); }
      var v = T > 1e-9 ? Z / T : (k === 1 ? Z0 / T0 : 0); // descent speed
      pts.push({ t: t, Z: Z, T: T, v: v });
    }
    var amax = 0;
    for (var j = 1; j < pts.length - 1; j++) {
      var a = (pts[j - 1].v - pts[j + 1].v) / (pts[j + 1].t - pts[j - 1].t);
      if (a > amax) amax = a;
    }
    var landed = k > 0 && T0 / k <= TCAP;
    var vEnd = pts[pts.length - 1].v;
    return { pts: pts, tEnd: tEnd, landed: landed, vEnd: vEnd, amax: amax, fuel: G * tEnd + (Z0 / T0 - vEnd) };
  }

  var cur, tAnim = 0, playing = false;
  function update() { cur = traj(+kR.value); kV.textContent = (+kR.value).toFixed(2); }
  update();

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  function tx(t) { return PL + t / TCAP * (PR - PL); }

  function zAt(t) {
    var p = cur.pts, i = Math.min(p.length - 1, Math.floor(t / cur.tEnd * (p.length - 1)));
    return p[Math.max(0, i)];
  }

  function axes(top, bot, ymax, ticks, label) {
    ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, top); ctx.lineTo(PL, bot); ctx.lineTo(PR, bot); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = col.muted; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ticks.forEach(function (v) { ctx.fillText(v, PL - 4, bot - v / ymax * (bot - top)); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = col.text; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label, PL + 6, top - 2);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // lander view
    var now = zAt(Math.min(tAnim, cur.tEnd));
    ctx.fillStyle = col.muted; ctx.globalAlpha = 0.35; ctx.fillRect(GX, GB, GW, 8); ctx.globalAlpha = 1;
    var ly = GB - now.Z / Z0 * (GB - GT);
    ctx.fillStyle = col.text;
    ctx.beginPath(); ctx.moveTo(GX + GW / 2 - 14, ly - 4); ctx.lineTo(GX + GW / 2 + 14, ly - 4); ctx.lineTo(GX + GW / 2 + 9, ly - 22);
    ctx.lineTo(GX + GW / 2 - 9, ly - 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(GX + GW / 2 - 12, ly - 4); ctx.lineTo(GX + GW / 2 - 18, ly); ctx.moveTo(GX + GW / 2 + 12, ly - 4); ctx.lineTo(GX + GW / 2 + 18, ly); ctx.stroke();
    if (playing && now.Z > 0.05) {
      ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(GX + GW / 2 - 6, ly); ctx.lineTo(GX + GW / 2 + 6, ly);
      ctx.lineTo(GX + GW / 2, ly + 10 + Math.random() * 8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = col.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(now.Z.toFixed(1) + ' m', GX + GW / 2, GB + 12);
    ctx.fillText(Math.min(tAnim, cur.tEnd).toFixed(1) + ' 초', GX + GW / 2, GB + 26);

    // height plot
    axes(P1T, P1B, Z0, [0, 50, 100], '높이 (m)');
    ctx.strokeStyle = BLUE; ctx.lineWidth = 2.2; ctx.beginPath();
    cur.pts.forEach(function (p, i) { var y = P1B - p.Z / Z0 * (P1B - P1T); if (i === 0) ctx.moveTo(tx(p.t), y); else ctx.lineTo(tx(p.t), y); });
    ctx.stroke();
    // TTC plot
    axes(P2T, P2B, T0, [0, 5, 10], '카메라가 재는 충돌 시간 (초)');
    ctx.strokeStyle = GREEN; ctx.lineWidth = 2.2; ctx.beginPath();
    cur.pts.forEach(function (p, i) { var y = P2B - Math.max(0, p.T) / T0 * (P2B - P2T); if (i === 0) ctx.moveTo(tx(p.t), y); else ctx.lineTo(tx(p.t), y); });
    ctx.stroke();
    ctx.fillStyle = col.muted; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 20, 40, 60].forEach(function (v) { ctx.fillText(v + '초', tx(v), P2B + 4); });
    // time cursor
    var tc = tx(Math.min(tAnim, cur.tEnd));
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tc, P1T); ctx.lineTo(tc, P2B); ctx.stroke(); ctx.setLineDash([]);

    var k = +kR.value, verdict;
    if (!cur.landed) verdict = '60초가 지나도 아직 ' + cur.pts[cur.pts.length - 1].Z.toFixed(1) + ' m 위에 떠 있습니다';
    else if (k >= 0.999) verdict = cur.tEnd.toFixed(0) + '초에 초속 ' + cur.vEnd.toFixed(1) + ' m로 부딪힙니다';
    else if (k > 0.5 + 1e-9) verdict = cur.tEnd.toFixed(0) + '초에 닿지만, 마지막 순간 감속이 매우 큽니다 (최대 ' + cur.amax.toFixed(1) + ' m/s²)';
    else if (Math.abs(k - 0.5) < 1e-9) verdict = cur.tEnd.toFixed(0) + '초에 부드럽게 착지, 감속이 내내 ' + cur.amax.toFixed(2) + ' m/s²로 일정';
    else verdict = cur.tEnd.toFixed(0) + '초에 부드럽게 착지하지만 오래 걸립니다';
    readout.textContent = verdict + ' · 연료(중력 버티기 포함) ' + cur.fuel.toFixed(0) + ' m/s 어치';
  }

  var last = null;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!playing || !visible) { last = null; return; }
    var dt = last === null ? 0 : Math.min(0.1, (ts - last) / 1000);
    last = ts;
    tAnim += dt * 6;
    if (tAnim >= cur.tEnd) { tAnim = cur.tEnd; playing = false; playBtn.textContent = '다시 내려가기'; }
    draw();
  }

  playBtn.addEventListener('click', function () {
    if (!playing) { if (tAnim >= cur.tEnd) tAnim = 0; playing = true; playBtn.textContent = '멈추기'; }
    else { playing = false; playBtn.textContent = '내려가기'; }
  });
  kR.addEventListener('input', function () { update(); tAnim = 0; playing = false; playBtn.textContent = '내려가기'; draw(); });

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
  }

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
  requestAnimationFrame(loop);
})();
