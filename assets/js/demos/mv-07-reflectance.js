/* MIT 머신비전 7강 데모: 반사 지도 — 빛을 끌면 공의 음영과 기울기 지도의 등광선이 함께 바뀜 */
(function () {
  'use strict';
  var root = document.getElementById('mv-07-reflectance');
  if (!root) return;

  var W = 640, H = 360;
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

  var isoBox = document.createElement('input');
  isoBox.type = 'checkbox'; isoBox.checked = true;
  var l1 = document.createElement('label');
  l1.appendChild(isoBox); l1.appendChild(document.createTextNode('등광선(같은 밝기 선) 보기'));
  controls.appendChild(l1);
  var resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.className = 'btn btn-sm btn-outline-secondary';
  resetBtn.textContent = '빛을 정면으로';
  controls.appendChild(resetBtn);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var SPH = { x: 160, y: 196, r: 132 };
  var MAP = { x: 336, y: 64, s: 280, range: 3 };
  var light = { u: -0.8, v: 0.6 };      // display coords (u, v) = (-p, -q)
  var probe = { x: 0.35, y: -0.3 };     // point on the sphere image (unit disk)

  function R(u, v) {
    return (1 + u * light.u + v * light.v) /
      (Math.sqrt(1 + u * u + v * v) * Math.sqrt(1 + light.u * light.u + light.v * light.v));
  }

  var offS = document.createElement('canvas'), offM = document.createElement('canvas');
  var NS = 2 * SPH.r, NM = MAP.s;
  offS.width = NS; offS.height = NS; offM.width = NM; offM.height = NM;
  var cS = offS.getContext('2d'), cM = offM.getContext('2d');
  var dS = cS.createImageData(NS, NS), dM = cM.createImageData(NM, NM);
  var BLUE = [42, 120, 214], ORANGE = [235, 104, 52];

  function band(r) { return r <= 0 ? -1 : Math.min(9, Math.floor(r * 10)); }
  function put(d, k, rgb, a) { d.data[k] = rgb[0]; d.data[k + 1] = rgb[1]; d.data[k + 2] = rgb[2]; d.data[k + 3] = a; }

  function renderSphere(iso) {
    var bands = new Int8Array(NS * NS), i, j, k;
    for (i = 0; i < NS; i++) for (j = 0; j < NS; j++) {
      var x = (j + 0.5) / SPH.r - 1, y = 1 - (i + 0.5) / SPH.r, r2 = x * x + y * y;
      k = i * NS + j;
      if (r2 >= 1) { bands[k] = -2; put(dS, 4 * k, [0, 0, 0], 0); continue; }
      var z = Math.sqrt(1 - r2);
      var e = (x * light.u + y * light.v + z) / Math.sqrt(1 + light.u * light.u + light.v * light.v);
      bands[k] = band(e);
      var g = Math.round((0.05 + 0.9 * Math.max(0, e)) * 255);
      put(dS, 4 * k, [g, g, g], 255);
    }
    if (iso) markEdges(dS, bands, NS);
    cS.putImageData(dS, 0, 0);
  }
  function renderMap(iso) {
    var bands = new Int8Array(NM * NM), i, j, k;
    for (i = 0; i < NM; i++) for (j = 0; j < NM; j++) {
      var u = ((j + 0.5) / NM * 2 - 1) * MAP.range, v = (1 - (i + 0.5) / NM * 2) * MAP.range;
      var e = R(u, v);
      k = i * NM + j;
      bands[k] = band(e);
      var g = Math.round((0.05 + 0.9 * Math.max(0, e)) * 255);
      put(dM, 4 * k, [g, g, g], 255);
    }
    if (iso) markEdges(dM, bands, NM);
    cM.putImageData(dM, 0, 0);
  }
  function markEdges(d, bands, n) {
    for (var i = 0; i < n - 1; i++) for (var j = 0; j < n - 1; j++) {
      var k = i * n + j, b = bands[k];
      if (b === -2) continue;
      var br = bands[k + 1], bd = bands[k + n];
      if ((br !== b && br !== -2) || (bd !== b && bd !== -2)) {
        var shadowEdge = (b === -1 || br === -1 || bd === -1) && Math.max(b, br, bd) <= 0;
        put(d, 4 * k, shadowEdge ? ORANGE : BLUE, 255);
      }
    }
  }

  function toMap(u, v) {
    return { x: MAP.x + (u / MAP.range + 1) / 2 * MAP.s, y: MAP.y + (1 - v / MAP.range) / 2 * MAP.s };
  }
  function handle(x, y, color, r) {
    ctx.beginPath(); ctx.arc(x, y, r || 9, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  function star(x, y, r, color) {
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  function draw() {
    var iso = isoBox.checked;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    renderSphere(iso); renderMap(iso);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offS, SPH.x - SPH.r, SPH.y - SPH.r);
    ctx.drawImage(offM, MAP.x, MAP.y);
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.strokeRect(MAP.x + 0.5, MAP.y + 0.5, MAP.s - 1, MAP.s - 1);
    ctx.fillStyle = col.text; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('공 사진', 20, 34);
    ctx.fillText('반사 지도 (기울기 → 밝기)', MAP.x, 34);
    ctx.font = '12px sans-serif'; ctx.fillStyle = col.muted;
    ctx.fillText('가운데 = 정면을 보는 면, 바깥 = 많이 기운 면', MAP.x, 52);
    // centre mark on map
    var c0 = toMap(0, 0);
    ctx.fillStyle = SERIES[4]; ctx.beginPath(); ctx.arc(c0.x, c0.y, 3, 0, 2 * Math.PI); ctx.fill();

    // probe on sphere and its image on the map
    var pr2 = probe.x * probe.x + probe.y * probe.y, pz = Math.sqrt(Math.max(1e-6, 1 - pr2));
    var pu = probe.x / pz, pv = probe.y / pz;
    var pm = toMap(pu, pv);
    var inside = pm.x >= MAP.x && pm.x <= MAP.x + MAP.s && pm.y >= MAP.y && pm.y <= MAP.y + MAP.s;
    var ps = { x: SPH.x + probe.x * SPH.r, y: SPH.y - probe.y * SPH.r };
    ctx.setLineDash([4, 4]); ctx.strokeStyle = SERIES[2]; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ps.x, ps.y);
    var tx = Math.max(MAP.x, Math.min(MAP.x + MAP.s, pm.x)), ty = Math.max(MAP.y, Math.min(MAP.y + MAP.s, pm.y));
    ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    handle(ps.x, ps.y, SERIES[2], 10);
    if (inside) handle(pm.x, pm.y, SERIES[2], 7);

    // light star on the map (draggable)
    var lm = toMap(light.u, light.v);
    star(lm.x, lm.y, 13, SERIES[1]);

    var e = Math.max(0, R(pu, pv));
    var tiltL = Math.atan(Math.hypot(light.u, light.v)) * 180 / Math.PI;
    var tiltP = Math.atan(Math.hypot(pu, pv)) * 180 / Math.PI;
    readout.innerHTML = '<span style="color:' + SERIES[1] + '">★ 빛</span>: 정면에서 ' + tiltL.toFixed(0) + '° 기울어진 쪽 · ' +
      '<span style="color:' + SERIES[2] + '">● 공 위의 점</span>: 표면이 ' + tiltP.toFixed(0) + '° 기울어짐, 밝기 <b>' + (e * 100).toFixed(0) + '%</b>' +
      (inside ? '' : ' (지도 바깥: 너무 많이 기울어서 지도 밖에 있음)');
  }

  var drag = null;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev);
    var lm = toMap(light.u, light.v);
    var ps = { x: SPH.x + probe.x * SPH.r, y: SPH.y - probe.y * SPH.r };
    if (Math.hypot(p.x - lm.x, p.y - lm.y) < 22) drag = 'light';
    else if (Math.hypot(p.x - ps.x, p.y - ps.y) < 22) drag = 'probe';
    else if (p.x >= MAP.x && p.x <= MAP.x + MAP.s && p.y >= MAP.y && p.y <= MAP.y + MAP.s) drag = 'light';
    else if (Math.hypot(p.x - SPH.x, p.y - SPH.y) < SPH.r) drag = 'probe';
    else drag = null;
    if (drag) { canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); move(p); }
  });
  function move(p) {
    if (drag === 'light') {
      light.u = Math.max(-1, Math.min(1, ((p.x - MAP.x) / MAP.s) * 2 - 1)) * MAP.range;
      light.v = Math.max(-1, Math.min(1, 1 - ((p.y - MAP.y) / MAP.s) * 2)) * MAP.range;
    } else if (drag === 'probe') {
      var x = (p.x - SPH.x) / SPH.r, y = -(p.y - SPH.y) / SPH.r, r = Math.hypot(x, y);
      if (r > 0.97) { x *= 0.97 / r; y *= 0.97 / r; }
      probe.x = x; probe.y = y;
    }
    draw();
  }
  canvas.addEventListener('pointermove', function (ev) { if (drag) move(pos(ev)); });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  isoBox.addEventListener('change', draw);
  resetBtn.addEventListener('click', function () { light.u = 0; light.v = 0; draw(); });

  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  readColors();
  resize();
  draw();
  window.addEventListener('resize', function () { resize(); draw(); });
})();
