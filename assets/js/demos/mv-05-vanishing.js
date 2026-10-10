/* MIT 머신비전 5강 데모: 여러 선의 교점(소실점) 찾기 — 최소제곱 vs RANSAC */
(function () {
  'use strict';
  var root = document.getElementById('mv-05-vanishing');
  if (!root) return;

  var W = 640, H = 400;
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

  function button(text, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = 'btn btn-sm btn-outline-secondary';
    b.addEventListener('click', fn);
    controls.appendChild(b);
    return b;
  }
  var showLs = document.createElement('input');
  showLs.type = 'checkbox'; showLs.checked = true;
  var lab1 = document.createElement('label');
  lab1.appendChild(showLs); lab1.appendChild(document.createTextNode('최소제곱 결과 보기'));
  var showR = document.createElement('input');
  showR.type = 'checkbox'; showR.checked = true;
  var lab2 = document.createElement('label');
  lab2.appendChild(showR); lab2.appendChild(document.createTextNode('RANSAC 결과 보기'));

  button('엉뚱한 선 추가', function () { addOutlier(); draw(); });
  button('처음으로', function () { reset(); draw(); });
  controls.appendChild(lab1);
  controls.appendChild(lab2);
  showLs.addEventListener('change', draw);
  showR.addEventListener('change', draw);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- data: each line is two draggable endpoints ----
  var VP = { x: 380, y: 150 };
  var HOR = 150;
  var lines = [];
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function segToward(x0, y0, frac, jitter) {
    // segment on the line from (x0,y0) to VP, covering [0, frac] of the way, with angle jitter
    var tx = VP.x + jitter, ty = VP.y + jitter * 0.4;
    return {
      a: { x: x0, y: y0 },
      b: { x: x0 + (tx - x0) * frac, y: y0 + (ty - y0) * frac },
      bad: false
    };
  }
  function reset() {
    seed = 7;
    lines = [
      segToward(40, 400, 0.55, 3),
      segToward(250, 400, 0.6, -4),
      segToward(640, 360, 0.5, 2),
      segToward(640, 250, 0.55, -3),
      segToward(0, 230, 0.6, 2),
      segToward(0, 120, 0.5, -2),
      segToward(560, 30, 0.45, 4)
    ];
  }
  function addOutlier() {
    if (lines.length >= 14) return;
    var x = 60 + rnd() * 520, y = 40 + rnd() * 320;
    var ang = rnd() * Math.PI;
    var len = 70 + rnd() * 80;
    lines.push({
      a: { x: x - Math.cos(ang) * len / 2, y: y - Math.sin(ang) * len / 2 },
      b: { x: x + Math.cos(ang) * len / 2, y: y + Math.sin(ang) * len / 2 },
      bad: true
    });
  }

  // line in normal form: n·p = rho, |n| = 1
  function normalForm(L) {
    var dx = L.b.x - L.a.x, dy = L.b.y - L.a.y;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    return { nx: nx, ny: ny, rho: nx * L.a.x + ny * L.a.y };
  }
  function lsq(list) {
    var a = 0, b = 0, c = 0, d = 0, e = 0;
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      a += n.nx * n.nx; b += n.nx * n.ny; c += n.ny * n.ny;
      d += n.nx * n.rho; e += n.ny * n.rho;
    }
    var det = a * c - b * b;
    if (Math.abs(det) < 1e-6 * (a + c) * (a + c) + 1e-12) return null;
    return { x: (c * d - b * e) / det, y: (a * e - b * d) / det };
  }
  function dist(n, p) { return Math.abs(n.nx * p.x + n.ny * p.y - n.rho); }

  function ransac(nf) {
    var TH = 8, best = null, bestCnt = 0, bestErr = Infinity;
    for (var i = 0; i < nf.length; i++) {
      for (var j = i + 1; j < nf.length; j++) {
        var p = lsq([nf[i], nf[j]]);
        if (!p || Math.abs(p.x) > 1e5 || Math.abs(p.y) > 1e5) continue;
        var inl = [], err = 0;
        for (var k = 0; k < nf.length; k++) {
          var dd = dist(nf[k], p);
          if (dd < TH) { inl.push(k); err += dd; }
        }
        if (inl.length > bestCnt || (inl.length === bestCnt && err < bestErr)) {
          best = inl; bestCnt = inl.length; bestErr = err;
        }
      }
    }
    if (!best || best.length < 2) return null;
    var p2 = lsq(best.map(function (k) { return nf[k]; }));
    return p2 ? { p: p2, inl: best } : null;
  }

  function extend(L) {
    var dx = L.b.x - L.a.x, dy = L.b.y - L.a.y;
    var s = 3000 / (Math.hypot(dx, dy) || 1);
    return [L.a.x - dx * s, L.a.y - dy * s, L.b.x + dx * s, L.b.y + dy * s];
  }

  function cross(x, y, r, color) {
    ctx.strokeStyle = col.bg; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  }
  function arrowTo(x, y, color) {
    // point is off-canvas: draw an arrow at the border pointing to it
    var cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy;
    var s = Math.min((W / 2 - 18) / Math.abs(dx || 1e-9), (H / 2 - 18) / Math.abs(dy || 1e-9));
    var px = cx + dx * s, py = cy + dy * s, ang = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(ang) * 12, py + Math.sin(ang) * 12);
    ctx.lineTo(px + Math.cos(ang + 2.5) * 12, py + Math.sin(ang + 2.5) * 12);
    ctx.lineTo(px + Math.cos(ang - 2.5) * 12, py + Math.sin(ang - 2.5) * 12);
    ctx.closePath(); ctx.fill();
  }
  function onCanvas(p) { return p.x > -5 && p.x < W + 5 && p.y > -5 && p.y < H + 5; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // background "photo": sky + ground
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.08; ctx.fillStyle = SERIES[0]; ctx.fillRect(0, 0, W, HOR);
    ctx.fillStyle = col.muted; ctx.fillRect(0, HOR, W, H - HOR); ctx.globalAlpha = 1;
    ctx.setLineDash([2, 4]); ctx.strokeStyle = col.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(W, HOR); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.fillText('지평선', 8, HOR - 6);

    var nf = lines.map(normalForm);
    var pLs = lsq(nf);
    var R = ransac(nf);
    var inSet = {};
    if (R) R.inl.forEach(function (k) { inSet[k] = true; });

    // extended lines (faint)
    ctx.lineWidth = 1;
    lines.forEach(function (L, i) {
      var e = extend(L);
      ctx.strokeStyle = (R && !inSet[i] && showR.checked) ? SERIES[1] : col.muted;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // segments + handles
    lines.forEach(function (L, i) {
      var c = (R && !inSet[i] && showR.checked) ? SERIES[1] : SERIES[0];
      ctx.strokeStyle = c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L.a.x, L.a.y); ctx.lineTo(L.b.x, L.b.y); ctx.stroke();
      [L.a, L.b].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = col.bg; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke();
      });
    });
    var txt = [];
    if (pLs && showLs.checked) {
      if (onCanvas(pLs)) cross(pLs.x, pLs.y, 9, SERIES[1]); else arrowTo(pLs.x, pLs.y, SERIES[1]);
    }
    if (R && showR.checked) {
      var p = R.p;
      if (onCanvas(p)) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 2 * Math.PI);
        ctx.lineWidth = 3; ctx.strokeStyle = SERIES[2]; ctx.stroke();
      } else arrowTo(p.x, p.y, SERIES[2]);
    }
    if (pLs) txt.push('<span style="color:' + SERIES[1] + '">✕ 최소제곱 교점</span> (' + pLs.x.toFixed(0) + ', ' + pLs.y.toFixed(0) + ')');
    else txt.push('최소제곱: 선이 모두 평행해서 교점이 없습니다');
    if (R) txt.push('<span style="color:' + SERIES[2] + '">◯ RANSAC 교점</span> (' + R.p.x.toFixed(0) + ', ' + R.p.y.toFixed(0) + ') · 선 ' +
      lines.length + '개 중 ' + R.inl.length + '개가 다수결에 들어감');
    readout.innerHTML = txt.join('<br>');
  }

  // ---- pointer dragging ----
  var drag = null;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev), best = null, bd = 22;
    lines.forEach(function (L) {
      [L.a, L.b].forEach(function (q) {
        var d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bd) { bd = d; best = q; }
      });
    });
    if (best) { drag = best; canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var p = pos(ev);
    drag.x = Math.max(0, Math.min(W, p.x)); drag.y = Math.max(0, Math.min(H, p.y));
    draw();
  });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---- theme ----
  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }

  readColors();
  resize();
  reset();
  draw();
  window.addEventListener('resize', function () { resize(); draw(); });
})();
