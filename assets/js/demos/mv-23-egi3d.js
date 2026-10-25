/* MIT 머신비전 23강: 타원체와 그 확장 가우스 영상 — 물체를 돌리면 EGI도 똑같이 돈다 */
(function () {
  'use strict';
  var root = document.getElementById('mv-23-egi3d');
  if (!root) return;

  var C = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { var x = cs.getPropertyValue(n).trim(); return x || f; }
    C.text = v('--text-color', '#34343c'); C.muted = v('--text-muted-color', '#757575'); C.bg = v('--main-bg', '#fff');
  }

  var W = 640, H = 300, S = 220;           // 두 그림 각각 S×S 픽셀
  var canvas = document.createElement('canvas');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.setAttribute('aria-label', '타원체와 그 확장 가우스 영상 구');
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  root.appendChild(canvas);

  var controls = document.createElement('div'); controls.className = 'mv-controls'; root.appendChild(controls);
  function slider(label, min, max, step, val) {
    var l = document.createElement('label'); l.textContent = label + ' ';
    var i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    l.appendChild(i); controls.appendChild(l); i.addEventListener('input', draw); return i;
  }
  var sA = slider('a', 0.4, 2, 0.05, 1.6), sB = slider('b', 0.4, 2, 0.05, 1.0), sC = slider('c', 0.4, 2, 0.05, 0.6);
  var sY = slider('돌리기 (z축)', -180, 180, 1, 30), sX = slider('기울이기 (x축)', -90, 90, 1, 20);
  var readout = document.createElement('div'); readout.className = 'mv-readout'; root.appendChild(readout);

  var offA = document.createElement('canvas'); offA.width = S; offA.height = S;
  var offB = document.createElement('canvas'); offB.width = S; offB.height = S;
  // 색: 밝음 → 파랑 → 남색 (로그 밀도)
  var STOPS = [[243, 246, 251], [158, 195, 239], [42, 120, 214], [29, 63, 122]];
  function cmap(t) { t = Math.max(0, Math.min(1, t)) * 3; var i = Math.min(2, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  function rotM() {
    var y = +sY.value * Math.PI / 180, x = +sX.value * Math.PI / 180, cy = Math.cos(y), sy = Math.sin(y), cx = Math.cos(x), sx = Math.sin(x);
    // R = Rx · Rz (물체 → 시점)
    return [[cy, -sy, 0], [cx * sy, cx * cy, -sx], [sx * sy, sx * cy, cx]];
  }
  function mulT(R, v) { return [R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2], R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2], R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2]]; }
  function draw() {
    var a = +sA.value, b = +sB.value, c = +sC.value, R = rotM();
    var Gx = Math.pow(b * c / a, 2), Gy = Math.pow(a * c / b, 2), Gz = Math.pow(a * b / c, 2);
    var gmin = Math.min(Gx, Gy, Gz), gmax = Math.max(Gx, Gy, Gz), lr = Math.log(gmax / gmin) || 1;
    function G(n) { var d = a * a * n[0] * n[0] + b * b * n[1] * n[1] + c * c * n[2] * n[2]; return Math.pow(a * b * c, 2) / (d * d); }
    // 시점: 화면 x 오른쪽, 화면 y 위가 시점 z, 보는 방향 = 시점 y축 (앞에서 −y 쪽을 봄)
    var light = [-0.4, -0.7, 0.6], ll = Math.hypot(light[0], light[1], light[2]); light = light.map(function (x) { return x / ll; });
    var ia = offA.getContext('2d').createImageData(S, S), ib = offB.getContext('2d').createImageData(S, S);
    var sc = S / 2 / 2.1;
    for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
      var k = 4 * (py * S + px);
      // ---- 타원체: 광선 (X, −t, Z) 시점 좌표, 물체 좌표로 바꿔 교차 ----
      var X = (px - S / 2) / sc, Z = (S / 2 - py) / sc;
      var o = mulT(R, [X, -10, Z]), d = mulT(R, [0, 1, 0]);
      var A2 = d[0] * d[0] / (a * a) + d[1] * d[1] / (b * b) + d[2] * d[2] / (c * c);
      var B2 = 2 * (o[0] * d[0] / (a * a) + o[1] * d[1] / (b * b) + o[2] * d[2] / (c * c));
      var C2 = o[0] * o[0] / (a * a) + o[1] * o[1] / (b * b) + o[2] * o[2] / (c * c) - 1, disc = B2 * B2 - 4 * A2 * C2;
      if (disc >= 0) {
        var t = (-B2 - Math.sqrt(disc)) / (2 * A2), p = [o[0] + t * d[0], o[1] + t * d[1], o[2] + t * d[2]];
        var n = [p[0] / (a * a), p[1] / (b * b), p[2] / (c * c)], nl = Math.hypot(n[0], n[1], n[2]); n = n.map(function (q) { return q / nl; });
        var col = cmap(Math.log(G(n) / gmin) / lr);
        // 시점 좌표 법선으로 음영
        var nv = [R[0][0] * n[0] + R[0][1] * n[1] + R[0][2] * n[2], R[1][0] * n[0] + R[1][1] * n[1] + R[1][2] * n[2], R[2][0] * n[0] + R[2][1] * n[1] + R[2][2] * n[2]];
        var sh = 0.55 + 0.45 * Math.max(0, nv[0] * light[0] + nv[1] * light[1] + nv[2] * light[2]);
        ia.data[k] = col[0] * sh; ia.data[k + 1] = col[1] * sh; ia.data[k + 2] = col[2] * sh; ia.data[k + 3] = 255;
      }
      // ---- EGI 구: 화면 원 위의 점 = 시점 좌표 법선 → 물체 좌표 법선 ----
      var u = (px - S / 2) / (S / 2 - 6), w = (S / 2 - py) / (S / 2 - 6), r2 = u * u + w * w;
      if (r2 <= 1) {
        var nvw = [u, -Math.sqrt(1 - r2), w], no = mulT(R, nvw);
        var col2 = cmap(Math.log(G(no) / gmin) / lr), sh2 = 0.7 + 0.3 * Math.sqrt(1 - r2);
        ib.data[k] = col2[0] * sh2; ib.data[k + 1] = col2[1] * sh2; ib.data[k + 2] = col2[2] * sh2; ib.data[k + 3] = 255;
      }
    }
    offA.getContext('2d').putImageData(ia, 0, 0); offB.getContext('2d').putImageData(ib, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(offA, 60, 50); ctx.drawImage(offB, 360, 50);
    ctx.fillStyle = C.text; ctx.font = '13px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('타원체 (색 = 그 점의 밀도)', 60, 14); ctx.fillText('확장 가우스 영상 (같은 법선 방향에 밀도)', 360, 14);
    ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.fillText('짙을수록 밀도가 큼 = 평평함', 60, 30);
    readout.innerHTML = '축 방향 밀도: x축 (bc/a)² = <b>' + Gx.toFixed(2) + '</b>, y축 (ac/b)² = <b>' + Gy.toFixed(2) + '</b>, z축 (ab/c)² = <b>' + Gz.toFixed(2) + '</b>' +
      (gmax / gmin < 1.05 ? ' · <b>거의 구: 밀도가 고르게 퍼져 방향을 정할 수 없음</b>' : '');
  }

  readTheme(); draw();
  function retheme() { readTheme(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme); else if (mq.addListener) mq.addListener(retheme);
  }
})();
