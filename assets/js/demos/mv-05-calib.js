/* MIT 머신비전 5강 데모: 소실점 세 개로 주점과 초점거리 구하기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-05-calib');
  if (!root) return;

  var W = 640, H = 420;
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

  var resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn btn-sm btn-outline-secondary';
  resetBtn.textContent = '처음으로';
  controls.appendChild(resetBtn);
  var showAlt = document.createElement('input');
  showAlt.type = 'checkbox'; showAlt.checked = true;
  var lab = document.createElement('label');
  lab.appendChild(showAlt); lab.appendChild(document.createTextNode('수선 보기'));
  controls.appendChild(lab);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // photo frame (the actual picture) in the middle of the extended image plane
  var PH = { x: 200, y: 130, w: 240, h: 160 };
  var C = { x: PH.x + PH.w / 2, y: PH.y + PH.h / 2 };
  var vps;
  function reset() {
    vps = [{ x: 325, y: 54 }, { x: 609, y: 393 }, { x: 120, y: 378 }];
  }
  reset();
  resetBtn.addEventListener('click', function () { reset(); draw(); });
  showAlt.addEventListener('change', draw);

  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function orthocenter(a, b, c) {
    // (b-a)·p = (b-a)·c ; (c-b)·p = (c-b)·a
    var u = sub(b, a), w = sub(c, b);
    var r1 = dot(u, c), r2 = dot(w, a);
    var det = u.x * w.y - u.y * w.x;
    if (Math.abs(det) < 1e-9) return null;
    return { x: (r1 * w.y - u.y * r2) / det, y: (u.x * r2 - r1 * w.x) / det };
  }
  function foot(p, a, b) {
    var e = sub(b, a), t = dot(sub(p, a), e) / dot(e, e);
    return { x: a.x + e.x * t, y: a.y + e.y * t };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    // photo frame
    ctx.globalAlpha = 0.1; ctx.fillStyle = col.muted; ctx.fillRect(PH.x, PH.y, PH.w, PH.h); ctx.globalAlpha = 1;
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.strokeRect(PH.x, PH.y, PH.w, PH.h); ctx.setLineDash([]);
    ctx.fillStyle = col.muted; ctx.font = '12px sans-serif';
    ctx.fillText('사진 테두리', PH.x + 6, PH.y + 16);
    // image center (small plus)
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(C.x - 7, C.y); ctx.lineTo(C.x + 7, C.y); ctx.moveTo(C.x, C.y - 7); ctx.lineTo(C.x, C.y + 7); ctx.stroke();

    // triangle
    ctx.strokeStyle = col.text; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(vps[0].x, vps[0].y); ctx.lineTo(vps[1].x, vps[1].y); ctx.lineTo(vps[2].x, vps[2].y); ctx.closePath(); ctx.stroke();

    var o = orthocenter(vps[0], vps[1], vps[2]);
    var f2 = o ? -dot(sub(vps[0], o), sub(vps[1], o)) : -1;
    var ok = o && f2 > 0;
    var obtuse = -1;
    for (var i = 0; i < 3; i++) {
      var a = vps[i], b = vps[(i + 1) % 3], c = vps[(i + 2) % 3];
      if (dot(sub(b, a), sub(c, a)) <= 0) obtuse = i;
    }
    if (showAlt.checked && o) {
      ctx.strokeStyle = SERIES[4]; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      for (var k = 0; k < 3; k++) {
        var ft = foot(vps[k], vps[(k + 1) % 3], vps[(k + 2) % 3]);
        ctx.beginPath(); ctx.moveTo(vps[k].x, vps[k].y); ctx.lineTo(ft.x, ft.y);
        ctx.lineTo(o.x, o.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (ok) {
      var f = Math.sqrt(f2);
      // circle of radius f around principal point: "how far the lens sits above the picture"
      ctx.strokeStyle = SERIES[4]; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, f, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = SERIES[4];
      ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('주점', o.x + 9, o.y - 8);
    } else if (o) {
      ctx.strokeStyle = SERIES[1]; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(o.x - 7, o.y - 7); ctx.lineTo(o.x + 7, o.y + 7); ctx.moveTo(o.x + 7, o.y - 7); ctx.lineTo(o.x - 7, o.y + 7); ctx.stroke();
    }
    // handles
    for (var j = 0; j < 3; j++) {
      ctx.beginPath(); ctx.arc(vps[j].x, vps[j].y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = SERIES[j]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = col.bg; ctx.stroke();
      ctx.fillStyle = SERIES[j]; ctx.font = 'bold 13px sans-serif';
      var gx = (vps[0].x + vps[1].x + vps[2].x) / 3, gy = (vps[0].y + vps[1].y + vps[2].y) / 3;
      var ux = vps[j].x - gx, uy = vps[j].y - gy, ul = Math.hypot(ux, uy) || 1;
      var lx = vps[j].x + ux / ul * 34, ly = vps[j].y + uy / ul * 22;
      lx = Math.max(32, Math.min(W - 32, lx)); if (ly > H - 8) ly = vps[j].y - 18; if (ly < 14) ly = vps[j].y + 26;
      ctx.textAlign = 'center';
      ctx.fillText('소실점 ' + (j + 1), lx, ly + 4);
      ctx.textAlign = 'start';
    }

    if (ok) {
      var off = Math.hypot(o.x - C.x, o.y - C.y);
      readout.innerHTML = '주점 위치: 사진 중심에서 <b>' + off.toFixed(0) + ' px</b> 떨어짐' +
        (off > 25 ? ' → 사진 한쪽이 잘려 나갔을 수 있습니다' : ' → 자르지 않은 사진과 잘 맞습니다') +
        '<br>초점거리 f ≈ <b>' + Math.sqrt(f2).toFixed(0) + ' px</b> (보라색 원의 반지름: 렌즈가 사진 위 이만큼 떠 있음)';
    } else {
      readout.innerHTML = '<span style="color:' + SERIES[1] + '">둔각 삼각형</span>입니다' +
        (obtuse >= 0 ? ' (소실점 ' + (obtuse + 1) + '의 각이 90° 이상)' : '') +
        '. 서로 직각인 세 방향은 이런 소실점을 만들 수 없어서 f를 구할 수 없습니다.';
    }
  }

  var drag = -1;
  function pos(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var p = pos(ev), bd = 24;
    drag = -1;
    for (var i = 0; i < 3; i++) {
      var d = Math.hypot(vps[i].x - p.x, vps[i].y - p.y);
      if (d < bd) { bd = d; drag = i; }
    }
    if (drag >= 0) { canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (drag < 0) return;
    var p = pos(ev);
    vps[drag].x = Math.max(8, Math.min(W - 8, p.x));
    vps[drag].y = Math.max(8, Math.min(H - 8, p.y));
    draw();
  });
  function end() { drag = -1; }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

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
