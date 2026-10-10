/* MIT 머신비전 4강 데모: 사진을 줄일 때 생기는 거짓 무늬(앨리어싱)와 미리 뭉개기 */
(function () {
  'use strict';
  var root = document.getElementById('mv-04-aliasing');
  if (!root) return;

  var W = 640, H = 260, N = 192, SZ = 192, GAP = 22, TOP = 36;
  var ORANGE = '#eb6834', GREEN = '#1baf7a';
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

  var l1 = document.createElement('label'); l1.textContent = '줄무늬 간격 ';
  var pR = document.createElement('input'); pR.type = 'range'; pR.min = 2.2; pR.max = 24; pR.step = 0.1; pR.value = 5.6;
  l1.appendChild(pR); controls.appendChild(l1);
  var sel = document.createElement('select');
  sel.className = 'form-select form-select-sm'; sel.style.width = 'auto';
  [2, 4, 8].forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = '1/' + k + '로 줄이기'; sel.appendChild(o); });
  sel.value = 4;
  controls.appendChild(sel);

  function makeCanvas(n) { var c = document.createElement('canvas'); c.width = n; c.height = n; return c; }
  var src = new Float32Array(N * N), tmp = new Float32Array(N * N), blur = new Float32Array(N * N);

  function blit(buf, n, stride, dx) {
    var c = makeCanvas(n), cx = c.getContext('2d'), im = cx.createImageData(n, n), d = im.data;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var g = Math.max(0, Math.min(255, Math.round(buf[(j * stride) * N + i * stride] * 255))), k = 4 * (j * n + i);
      d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = n < N ? false : true;
    ctx.drawImage(c, dx, TOP, SZ, SZ);
    ctx.imageSmoothingEnabled = true;
  }

  var dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = W + ' / ' + H;
  }

  function draw() {
    var period = +pR.value, k = +sel.value, ang = 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++)
      src[j * N + i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * (i * ca + j * sa) / period);
    // separable gaussian blur, sigma = k/2 (wraps around the edges)
    var s = k / 2, R = Math.ceil(3 * s), w = [], sum = 0;
    for (var t = -R; t <= R; t++) { var v = Math.exp(-0.5 * t * t / (s * s)); w.push(v); sum += v; }
    w = w.map(function (v) { return v / sum; });
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var a = 0; for (t = -R; t <= R; t++) a += w[t + R] * src[j * N + ((i + t + N) % N)];
      tmp[j * N + i] = a;
    }
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var b = 0; for (t = -R; t <= R; t++) b += w[t + R] * tmp[((j + t + N) % N) * N + i];
      blur[j * N + i] = b;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    var x0 = 12, x1 = x0 + SZ + GAP, x2 = x1 + SZ + GAP;
    blit(src, N, 1, x0);
    blit(src, N / k, k, x1);
    blit(blur, N / k, k, x2);
    ctx.fillStyle = col.text; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('원본', x0, TOP - 8);
    ctx.fillText('띄엄띄엄 골라내기', x1, TOP - 8);
    ctx.fillText('먼저 뭉개고 줄이기', x2, TOP - 8);

    var after = period / k, bad = after < 2;
    ctx.font = 'bold 12px sans-serif'; ctx.textBaseline = 'top';
    ctx.fillStyle = bad ? ORANGE : GREEN;
    ctx.fillText(bad ? '거짓 무늬!' : '원래 무늬 그대로', x1, TOP + SZ + 8);
    ctx.fillStyle = bad ? GREEN : GREEN;
    ctx.fillText(bad ? '고르게 회색 (거짓 무늬 없음)' : '원래 무늬 (조금 흐려짐)', x2, TOP + SZ + 8);

    readout.textContent = '줄인 뒤 줄무늬 한 주기 = ' + period.toFixed(1) + ' ÷ ' + k + ' = ' + after.toFixed(2) + '픽셀 · ' +
      (bad ? '2픽셀보다 짧아서 표현할 수 없습니다 (나이퀴스트 한계)' : '2픽셀 이상이라 표현할 수 있습니다');
  }

  pR.addEventListener('input', draw);
  sel.addEventListener('change', draw);
  function retheme() { readColors(); draw(); }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retheme);
  }
  window.addEventListener('resize', function () { resize(); draw(); });

  readColors(); resize(); draw();
})();
