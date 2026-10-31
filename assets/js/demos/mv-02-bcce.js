/* MIT 머신비전 2강 데모: 밝기 변화 제약식으로 속도 구하기 (속도 공간의 직선들) */
(function () {
  'use strict';
  var root = document.getElementById('mv-02-bcce');
  if (!root) return;

  var W = 640, H = 350, N = 120, PS = 2.5, IMX = 15, IMY = 25;
  var VX = 360, VY = 25, VS = 280, VR = 2.2; // velocity panel: origin box, size, range
  var NS = 12;
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

  var sel = document.createElement('select');
  sel.className = 'form-select form-select-sm'; sel.style.width = 'auto';
  [['blobs', '점박이 무늬'], ['curved', '살짝 휜 줄무늬'], ['stripes', '곧은 줄무늬']].forEach(function (o) {
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
  });
  controls.appendChild(sel);
  var l1 = document.createElement('label'); l1.textContent = '측정 잡음 ';
  var nR = document.createElement('input'); nR.type = 'range'; nR.min = 0; nR.max = 0.3; nR.step = 0.01; nR.value = 0.08;
  l1.appendChild(nR); controls.appendChild(l1);

  var off = document.createElement('canvas'); off.width = N; off.height = N;
  var octx = off.getContext('2d');
  var img = octx.createImageData(N, N);

  // textures with analytic gradients; coordinates in pixels
  var TEX = {
    blobs: function (x, y) {
      var a = 0.09, b = 0.13, c = 0.07;
      var e = 0.5 + 0.17 * Math.sin(a * x) * Math.cos(b * y) + 0.13 * Math.sin(c * x + b * y + 1) + 0.12 * Math.cos(0.11 * x - 0.05 * y);
      var ex = 0.17 * a * Math.cos(a * x) * Math.cos(b * y) + 0.13 * c * Math.cos(c * x + b * y + 1) - 0.12 * 0.11 * Math.sin(0.11 * x - 0.05 * y);
      var ey = -0.17 * b * Math.sin(a * x) * Math.sin(b * y) + 0.13 * b * Math.cos(c * x + b * y + 1) + 0.12 * 0.05 * Math.sin(0.11 * x - 0.05 * y);
      return [e, ex, ey];
    },
    curved: function (x, y) {
      var k = 0.16, s = k * (0.8 * x + 0.6 * y + 0.0035 * (x - 60) * (x - 60));
      var c = 0.4 * Math.cos(s);
      return [0.5 + 0.4 * Math.sin(s), c * k * (0.8 + 0.007 * (x - 60)), c * k * 0.6];
    },
    stripes: function (x, y) {
      var k = 0.16, s = k * (0.8 * x + 0.6 * y);
      var c = 0.4 * Math.cos(s);
      return [0.5 + 0.4 * Math.sin(s), c * k * 0.8, c * k * 0.6];
    }
  };

  var vTrue = { u: 1.2, v: 0.6 };
  var shift = { x: 0, y: 0 };
  var samples = [], noiseDraw = [];
  function seed() {
    samples = []; noiseDraw = [];
    var s = 7;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < NS; i++) {
      samples.push({ x: 10 + rnd() * (N - 20), y: 10 + rnd() * (N - 20) });
      // fixed gaussian-ish noise per sample so the picture is steady
      noiseDraw.push((rnd() + rnd() + rnd() - 1.5) * 1.4);
    }
  }
  seed();

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function vs(u, v) { return { x: VX + VS / 2 + u / VR * VS / 2, y: VY + VS / 2 - v / VR * VS / 2 }; }

  function solve() {
    var tex = TEX[sel.value], noise = +nR.value;
    var a = 0, b = 0, c = 0, p = 0, q = 0, lines = [];
    for (var i = 0; i < NS; i++) {
      var s = samples[i], t = tex(s.x, s.y);
      // texture rows run downward, but v points up in the velocity panel
      var gx = t[1], gy = -t[2];
      // per-pixel measured brightness change, image moving by vTrue (pixels per frame)
      var et = -(gx * vTrue.u + gy * vTrue.v) + noise * 0.1 * noiseDraw[i];
      lines.push([gx, gy, et]);
      a += gx * gx; b += gx * gy; c += gy * gy; p += -gx * et; q += -gy * et;
    }
    var det = a * c - b * b, tr = a + c;
    var quality = det / (tr * tr / 4 + 1e-12); // 1 = all directions, 0 = all parallel
    var est = null;
    if (quality > 1e-4) est = { u: (c * p - b * q) / det, v: (a * q - b * p) / det };
    return { lines: lines, est: est, quality: quality };
  }

  function draw() {
    var tex = TEX[sel.value];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

    // texture patch (moving)
    var d = img.data;
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var e = tex(i - shift.x, j - shift.y)[0], g = Math.max(0, Math.min(255, Math.round(e * 255))), k = 4 * (j * N + i);
      d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, IMX, IMY, N * PS, N * PS);
    ctx.imageSmoothingEnabled = true;
    var r = solve();
    // sample pixels
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 1.5;
    samples.forEach(function (s) {
      ctx.strokeRect(IMX + (s.x - 2) * PS, IMY + (s.y - 2) * PS, 4 * PS, 4 * PS);
    });
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('주황 네모: 계산에 쓰는 픽셀 ' + NS + '개', IMX, IMY + N * PS + 6);

    // velocity panel
    ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
    ctx.strokeRect(VX, VY, VS, VS);
    var o = vs(0, 0);
    ctx.beginPath(); ctx.moveTo(VX, o.y); ctx.lineTo(VX + VS, o.y); ctx.moveTo(o.x, VY); ctx.lineTo(o.x, VY + VS); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.muted; ctx.fillText('u', VX + VS - 12, o.y + 4); ctx.fillText('v', o.x + 5, VY + 2);
    ctx.save(); ctx.beginPath(); ctx.rect(VX, VY, VS, VS); ctx.clip();
    ctx.strokeStyle = BLUE; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
    r.lines.forEach(function (L) {
      var gx = L[0], gy = L[1], et = L[2], n = Math.hypot(gx, gy);
      if (n < 1e-9) return;
      var nx = gx / n, ny = gy / n, c0 = -et / n;
      var p1 = vs(c0 * nx - 5 * ny, c0 * ny + 5 * nx), p2 = vs(c0 * nx + 5 * ny, c0 * ny - 5 * nx);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    var t = vs(vTrue.u, vTrue.v);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, 2 * Math.PI); ctx.stroke();
    if (r.est) {
      var e2 = vs(r.est.u, r.est.v);
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(e2.x - 6, e2.y - 6); ctx.lineTo(e2.x + 6, e2.y + 6); ctx.moveTo(e2.x + 6, e2.y - 6); ctx.lineTo(e2.x - 6, e2.y + 6); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('속도 공간 (u, v)', VX, VY - 20 < 0 ? 2 : VY - 20);
    ctx.font = '12px sans-serif'; ctx.fillStyle = col.muted; ctx.textAlign = 'left';
    ctx.fillText('초록 ◯: 진짜 속도 (끌어서 바꾸기)', VX, VY + VS + 6);
    ctx.fillText('주황 ✕: 최소제곱 답', VX, VY + VS + 22);

    var msg;
    if (!r.est) msg = '파란 선이 모두 나란해서 답을 하나로 고를 수 없습니다 (줄 방향 움직임이 안 보임)';
    else {
      var err = Math.hypot(r.est.u - vTrue.u, r.est.v - vTrue.v);
      msg = '진짜 (' + vTrue.u.toFixed(2) + ', ' + vTrue.v.toFixed(2) + ') · 추정 (' + r.est.u.toFixed(2) + ', ' + r.est.v.toFixed(2) +
        ') · 오차 ' + err.toFixed(2) + ' · 선들이 엇갈린 정도 ' + (100 * r.quality).toFixed(1) + '%';
    }
    readout.textContent = msg;
  }

  var dragging = false;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  function setV(p) {
    vTrue.u = Math.max(-2, Math.min(2, (p.x - VX - VS / 2) / (VS / 2) * VR));
    vTrue.v = Math.max(-2, Math.min(2, -(p.y - VY - VS / 2) / (VS / 2) * VR));
    draw();
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    if (p.x < VX || p.x > VX + VS || p.y < VY || p.y > VY + VS) return;
    dragging = true; canvas.setPointerCapture(ev.pointerId); setV(p);
  });
  canvas.addEventListener('pointermove', function (ev) { if (dragging) setV(pos(ev)); });
  function up() { dragging = false; }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  sel.addEventListener('change', draw);
  nR.addEventListener('input', draw);

  var visible = true, last = null;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = null; }).observe(canvas);
  }
  function loop(t) {
    requestAnimationFrame(loop);
    if (!visible) return;
    var dt = last === null ? 0 : Math.min(0.05, (t - last) / 1000);
    last = t;
    // the patch drifts at the true velocity (scaled so it is easy to follow); v is "up" in the panel
    shift.x += vTrue.u * dt * 6; shift.y -= vTrue.v * dt * 6;
    draw();
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
