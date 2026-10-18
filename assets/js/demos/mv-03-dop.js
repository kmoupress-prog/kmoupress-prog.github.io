/* MIT 머신비전 3강 데모: GPS 위성 배치와 정밀도 저하(DOP)를 3D로 */
(function () {
  'use strict';
  var root = document.getElementById('mv-03-dop');
  if (!root) return;

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
  function load(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.onload = cb;
    s.onerror = function () { root.textContent = '3D 그림을 불러오지 못했습니다 (three.js).'; };
    document.head.appendChild(s);
  }
  function start() {
    if (window.THREE && window.THREE.OrbitControls) return init();
    if (window.THREE) return load(ORBIT_URL, init);
    load(THREE_URL, function () { load(ORBIT_URL, init); });
  }

  function init() {
    var R = 120;          // 하늘 반지름 (위성까지 거리)
    var K = 1.5;          // 오차 1 m 를 그림에서 몇 칸으로 그릴지
    var SLAB_R = 20;      // 수신기 둘레에 그릴 거리 판의 반지름
    var NEAR_DIST = 75;   // 확대 화면 카메라 거리
    var AXIS_MAX = 70;    // 타원체 반지름 그리기 상한
    var ORANGE = '#eb6834';
    var SAT_COLORS = ['#2a78d6', '#1baf7a', '#8e5cd9', '#d6a12a', '#d64f8a', '#3fb6c9', '#6b8e23', '#b5651d'];
    var PRESETS = {
      spread:   [[0, 15], [120, 15], [240, 15], [0, 90], [60, 45], [180, 45], [300, 45], [90, 30]],
      side:     [[110, 25], [135, 45], [155, 20], [125, 65], [140, 30], [115, 40], [160, 50], [100, 30]],
      overhead: [[0, 70], [120, 70], [240, 70], [60, 85], [180, 75], [300, 75], [90, 80], [270, 80]]
    };
    var state = { preset: 'spread', n: 4, sigma: 2, clock: false, shells: true, sats: [] };
    function usePreset(name) {
      state.preset = name;
      state.sats = PRESETS[name].map(function (p) { return { az: p[0], el: p[1] }; });
    }
    usePreset('spread');

    var col = {};
    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      function v(name, fb) { var x = cs.getPropertyValue(name).trim(); return x || fb; }
      col.text = v('--text-color', '#34343c');
      col.muted = v('--text-muted-color', '#757575');
      col.bg = v('--main-bg', '#fff');
    }
    readColors();

    // ---------- DOM ----------
    root.textContent = '';
    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    root.appendChild(wrap);
    function overlay() {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;font-size:12px;line-height:1.3;pointer-events:none;padding:2px 6px;border-radius:4px;';
      wrap.appendChild(d); return d;
    }
    var farTag = overlay(), nearTag = overlay();
    farTag.textContent = '하늘 전체 · 위성을 끌어 옮기고, 빈 곳을 끌어 돌려 보세요';
    nearTag.textContent = '수신기 주변 확대 · 주황 = 위치 후보';
    var divider = document.createElement('div');
    divider.style.cssText = 'position:absolute;pointer-events:none;';
    wrap.appendChild(divider);

    var controlsBox = document.createElement('div');
    controlsBox.className = 'mv-controls';
    root.appendChild(controlsBox);
    var readout = document.createElement('div');
    readout.className = 'mv-readout';
    root.appendChild(readout);

    var presetBtns = {};
    [['spread', '고르게 퍼짐'], ['side', '한쪽에 몰림'], ['overhead', '머리 위에 몰림']].forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-sm btn-outline-secondary'; b.textContent = p[1];
      b.addEventListener('click', function () { usePreset(p[0]); refresh(); });
      controlsBox.appendChild(b); presetBtns[p[0]] = b;
    });
    var lN = document.createElement('label'); lN.textContent = '위성 수 ';
    var nR = document.createElement('input'); nR.type = 'range'; nR.min = 3; nR.max = 8; nR.step = 1; nR.value = state.n;
    var nV = document.createElement('span'); lN.appendChild(nR); lN.appendChild(nV); controlsBox.appendChild(lN);
    var lS = document.createElement('label'); lS.textContent = '거리 오차 σ ';
    var sR = document.createElement('input'); sR.type = 'range'; sR.min = 1; sR.max = 5; sR.step = 0.5; sR.value = state.sigma;
    var sV = document.createElement('span'); lS.appendChild(sR); lS.appendChild(sV); controlsBox.appendChild(lS);
    var shellC = document.createElement('input'); shellC.type = 'checkbox'; shellC.checked = state.shells;
    var lSh = document.createElement('label'); lSh.appendChild(shellC); lSh.appendChild(document.createTextNode('거리 판 보이기')); controlsBox.appendChild(lSh);
    var clockC = document.createElement('input'); clockC.type = 'checkbox'; clockC.checked = state.clock;
    var lC = document.createElement('label'); lC.appendChild(clockC); lC.appendChild(document.createTextNode('수신기 시계 오차도 함께 풀기 (실제 GPS)')); controlsBox.appendChild(lC);

    // ---------- 3D ----------
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setScissorTest(true);
    var canvas = renderer.domElement;
    canvas.style.maxWidth = 'none';
    canvas.style.touchAction = 'none';
    wrap.insertBefore(canvas, farTag);

    var scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    var sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(80, 150, 60); scene.add(sun);

    var farCam = new THREE.PerspectiveCamera(42, 1, 1, 3000);
    farCam.layers.enable(1);
    var nearCam = new THREE.PerspectiveCamera(42, 1, 0.5, 3000);
    nearCam.layers.enable(2);
    farCam.position.set(190, 120, 250);
    var controls = new THREE.OrbitControls(farCam, canvas);
    controls.target.set(0, 30, 0);
    controls.enablePan = false;
    controls.minDistance = 160; controls.maxDistance = 650;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.update();

    function onLayer(obj, layer) { obj.traverse(function (o) { o.layers.set(layer); }); return obj; }

    function makeLabel(text, color, h) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 96;
      var g = c.getContext('2d');
      g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color; g.fillText(text, 128, 50);
      var tex = new THREE.CanvasTexture(c);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.scale.set(h * 256 / 96, h, 1);
      sp.renderOrder = 10;
      return sp;
    }

    function sph(az, el) {
      var a = az * Math.PI / 180, e = el * Math.PI / 180;
      return new THREE.Vector3(R * Math.cos(e) * Math.sin(a), R * Math.sin(e), R * Math.cos(e) * Math.cos(a));
    }

    // 바닥, 하늘 줄, 방위 글자 (테마가 바뀌면 다시 만든다)
    var themed = null;
    function buildThemed() {
      if (themed) { scene.remove(themed); themed.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
      themed = new THREE.Group();
      var muted = new THREE.Color(col.muted);
      var ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64),
        new THREE.MeshBasicMaterial({ color: muted, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
      ground.rotation.x = -Math.PI / 2; themed.add(ground);
      var grid = new THREE.GridHelper(300, 30, muted, muted);
      grid.material.transparent = true; grid.material.opacity = 0.28; grid.material.depthWrite = false;
      themed.add(grid);
      var domeMat = new THREE.LineBasicMaterial({ color: muted, transparent: true, opacity: 0.35 });
      var dome = new THREE.Group();
      [0, 30, 60].forEach(function (el) {
        var pts = [];
        for (var k = 0; k <= 96; k++) pts.push(sph(k * 360 / 96, el));
        dome.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), domeMat));
      });
      for (var az = 0; az < 360; az += 45) {
        var pts = [];
        for (var e = 0; e <= 90; e += 3) pts.push(sph(az, e));
        dome.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), domeMat));
      }
      themed.add(onLayer(dome, 1));
      [['북', 0], ['동', 90], ['남', 180], ['서', 270]].forEach(function (d) {
        var s = makeLabel(d[0], col.muted, 12);
        s.position.copy(sph(d[1], 0).multiplyScalar(1.12)); s.position.y = 4;
        themed.add(onLayer(s, 1));
      });
      var upPts = [new THREE.Vector3(0, -32, 0), new THREE.Vector3(0, 32, 0)];
      var up = new THREE.Line(new THREE.BufferGeometry().setFromPoints(upPts),
        new THREE.LineDashedMaterial({ color: muted, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.8 }));
      up.computeLineDistances();
      themed.add(onLayer(up, 2));
      var upLabel = makeLabel('위 (높이)', col.muted, 4);
      upLabel.position.set(0, 34, 0);
      themed.add(onLayer(upLabel, 2));
      scene.add(themed);
    }

    // 수신기
    var recvFar = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 12), new THREE.MeshLambertMaterial({ color: ORANGE }));
    scene.add(onLayer(recvFar, 1));
    var recvLabel = makeLabel('수신기', ORANGE, 11);
    recvLabel.position.set(0, -12, 0);
    scene.add(onLayer(recvLabel, 1));
    var recvNear = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10), new THREE.MeshLambertMaterial({ color: ORANGE }));
    scene.add(onLayer(recvNear, 2));

    // 위성, 신호선, 거리 껍질
    var Y_AXIS = new THREE.Vector3(0, 1, 0);
    var sats = SAT_COLORS.map(function (color, i) {
      var g = new THREE.Group();
      var bodyMat = new THREE.MeshLambertMaterial({ color: 0xd9b44a });
      var body = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 8), bodyMat);
      var panelMat = new THREE.MeshLambertMaterial({ color: color });
      var p1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 6), panelMat); p1.position.x = 12;
      var p2 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 6), panelMat); p2.position.x = -12;
      var dish = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3, 16, 1, true),
        new THREE.MeshLambertMaterial({ color: 0xeeeeee, side: THREE.DoubleSide }));
      dish.rotation.x = -Math.PI / 2; dish.position.z = 5.5;
      g.add(body, p1, p2, dish);
      var label = makeLabel(String(i + 1), color, 10);
      label.position.y = 11;
      g.add(label);
      onLayer(g, 1);
      g.userData.index = i;
      scene.add(g);

      var ray = new THREE.Line(new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({ color: color, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.85 }));
      scene.add(ray);

      var slab = new THREE.Mesh(undefined, new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
      var rim = new THREE.LineSegments(undefined, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9 }));
      slab.add(rim);
      scene.add(slab);
      return { group: g, picks: [body, p1, p2, dish], ray: ray, slab: slab, rim: rim };
    });
    var pickables = [];
    sats.forEach(function (s) { s.picks.forEach(function (m) { m.userData.index = s.group.userData.index; pickables.push(m); }); });

    // 거리 판: 위성을 중심으로 한 두께 2σ 공 껍질을 수신기 근처만 잘라 본 것 (반지름 120 에 비해 작아서 거의 평평)
    var slabSigma = -1, geoSlab = null, geoRim = null;

    var ell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24),
      new THREE.MeshPhongMaterial({ color: ORANGE, transparent: true, opacity: 0.6, shininess: 40 }));
    ell.renderOrder = 5;
    scene.add(ell);

    // ---------- 계산 ----------
    function invert(M) {
      var m = M.length, A = M.map(function (row, i) {
        var r = row.slice(); for (var j = 0; j < m; j++) r.push(i === j ? 1 : 0); return r;
      });
      for (var c = 0; c < m; c++) {
        var p = c;
        for (var r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        if (Math.abs(A[p][c]) < 1e-9) return null;
        var t = A[c]; A[c] = A[p]; A[p] = t;
        var d = A[c][c];
        for (var j = 0; j < 2 * m; j++) A[c][j] /= d;
        for (r = 0; r < m; r++) if (r !== c) {
          var f = A[r][c];
          for (j = 0; j < 2 * m; j++) A[r][j] -= f * A[c][j];
        }
      }
      return A.map(function (row) { return row.slice(m); });
    }

    function eigSym3(S) {
      var a = S.map(function (r) { return r.slice(); });
      var v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      for (var sweep = 0; sweep < 30; sweep++) {
        var off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
        if (off < 1e-12) break;
        [[0, 1], [0, 2], [1, 2]].forEach(function (pq) {
          var p = pq[0], q = pq[1];
          if (Math.abs(a[p][q]) < 1e-15) return;
          var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
          var c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (var k = 0; k < 3; k++) {
            var akp = a[k][p], akq = a[k][q];
            a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
          }
          for (k = 0; k < 3; k++) {
            var apk = a[p][k], aqk = a[q][k];
            a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
          }
          for (k = 0; k < 3; k++) {
            var vkp = v[k][p], vkq = v[k][q];
            v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
          }
        });
      }
      return {
        values: [a[0][0], a[1][1], a[2][2]],
        vectors: [0, 1, 2].map(function (j) { return new THREE.Vector3(v[0][j], v[1][j], v[2][j]); })
      };
    }

    // 위성 방향 → 위치(·시계) 오차 공분산 (단위 σ²)
    function solveDop() {
      var m = state.clock ? 4 : 3, N = [];
      for (var i = 0; i < m; i++) { N.push([]); for (var j = 0; j < m; j++) N[i].push(0); }
      for (var s = 0; s < state.n; s++) {
        var u = sph(state.sats[s].az, state.sats[s].el).normalize();
        var row = [u.x, u.y, u.z]; if (state.clock) row.push(1);
        for (i = 0; i < m; i++) for (j = 0; j < m; j++) N[i][j] += row[i] * row[j];
      }
      var Q = invert(N);
      if (!Q) return null;
      var P = [[Q[0][0], Q[0][1], Q[0][2]], [Q[1][0], Q[1][1], Q[1][2]], [Q[2][0], Q[2][1], Q[2][2]]];
      if (P[0][0] < 0 || P[1][1] < 0 || P[2][2] < 0 || P[0][0] + P[1][1] + P[2][2] > 1e6) return null;
      return { P: P, hdop: Math.sqrt(P[0][0] + P[2][2]), vdop: Math.sqrt(P[1][1]), pdop: Math.sqrt(P[0][0] + P[1][1] + P[2][2]) };
    }

    // ---------- 갱신 ----------
    function refresh() {
      if (state.clock && state.n < 4) state.n = 4;
      nR.min = state.clock ? 4 : 3; nR.value = state.n;
      nV.textContent = ' ' + state.n + '개';
      sV.textContent = ' ±' + state.sigma + ' m';
      Object.keys(presetBtns).forEach(function (k) { presetBtns[k].classList.toggle('active', state.preset === k); });

      var s = K * state.sigma;
      if (slabSigma !== state.sigma) {
        if (geoSlab) { geoSlab.dispose(); geoRim.dispose(); }
        geoSlab = new THREE.CylinderGeometry(SLAB_R, SLAB_R, 2 * s, 64);
        geoRim = new THREE.EdgesGeometry(geoSlab, 10);
        slabSigma = state.sigma;
      }
      var origin = new THREE.Vector3();
      sats.forEach(function (sat, i) {
        var on = i < state.n, pos = sph(state.sats[i].az, state.sats[i].el);
        sat.group.visible = on; sat.ray.visible = on;
        sat.slab.visible = on && state.shells;
        if (!on) return;
        sat.group.position.copy(pos); sat.group.lookAt(origin);
        sat.ray.geometry.setFromPoints([pos, origin]); sat.ray.computeLineDistances();
        sat.slab.geometry = geoSlab; sat.rim.geometry = geoRim;
        sat.slab.quaternion.setFromUnitVectors(Y_AXIS, pos.clone().normalize());
      });

      var dop = solveDop();
      if (!dop) {
        ell.visible = false;
        readout.textContent = '이 위성 배치로는 위치가 한 점으로 정해지지 않습니다 (행렬식 ≈ 0). 위성을 더 넓게 벌려 보세요.';
      } else {
        var eg = eigSym3(dop.P);
        var axes = eg.values.map(function (l) { return Math.min(AXIS_MAX, K * state.sigma * Math.sqrt(Math.max(l, 0))); });
        var v0 = eg.vectors[0].normalize(), v1 = eg.vectors[1].normalize();
        var v2 = new THREE.Vector3().crossVectors(v0, v1);
        ell.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(v0, v1, v2));
        ell.scale.set(Math.max(axes[0], 0.3), Math.max(axes[1], 0.3), Math.max(axes[2], 0.3));
        ell.visible = true;
        var lmax = Math.max.apply(null, eg.values), lmin = Math.max(1e-12, Math.min.apply(null, eg.values));
        readout.textContent = 'PDOP ' + dop.pdop.toFixed(1) + ' (수평 HDOP ' + dop.hdop.toFixed(1) + ', 높이 VDOP ' + dop.vdop.toFixed(1) + ')' +
          ' → 거리를 ±' + state.sigma + ' m로 잴 때 위치 오차는 수평 약 ' + (state.sigma * dop.hdop).toFixed(1) +
          ' m, 높이 약 ' + (state.sigma * dop.vdop).toFixed(1) + ' m. 주황 덩어리의 가장 긴 방향은 가장 짧은 방향의 ' +
          Math.sqrt(lmax / lmin).toFixed(1) + '배.' + (state.clock ? ' 시계 오차까지 풀어서 위성이 4개 이상 필요합니다.' : '');
      }
      requestDraw();
    }

    // ---------- 화면 배치·그리기 ----------
    var views = { far: null, near: null }, W = 640, H = 320;
    function layout() {
      W = wrap.clientWidth || 640;
      var vertical = W < 560;
      H = vertical ? Math.round(W * 1.25) : Math.round(W * 0.5);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(W, H, true);
      if (vertical) {
        var hf = Math.round(H * 0.55);
        views.far = { x: 0, y: 0, w: W, h: hf }; views.near = { x: 0, y: hf, w: W, h: H - hf };
        divider.style.cssText = 'position:absolute;pointer-events:none;left:0;right:0;top:' + hf + 'px;height:0;border-top:1px solid ' + col.muted + ';opacity:.4;';
      } else {
        var wf = Math.round(W / 2);
        views.far = { x: 0, y: 0, w: wf, h: H }; views.near = { x: wf, y: 0, w: W - wf, h: H };
        divider.style.cssText = 'position:absolute;pointer-events:none;top:0;bottom:0;left:' + wf + 'px;width:0;border-left:1px solid ' + col.muted + ';opacity:.4;';
      }
      [[farTag, views.far], [nearTag, views.near]].forEach(function (p) {
        p[0].style.left = (p[1].x + 6) + 'px'; p[0].style.top = (p[1].y + 6) + 'px';
        p[0].style.maxWidth = (p[1].w - 12) + 'px';
        p[0].style.color = col.muted; p[0].style.background = col.bg;
      });
    }

    var pending = false;
    function requestDraw() { if (!pending) { pending = true; requestAnimationFrame(draw); } }
    function draw() {
      pending = false;
      var dir = farCam.position.clone().sub(controls.target).normalize();
      nearCam.position.copy(dir.multiplyScalar(NEAR_DIST));
      nearCam.lookAt(0, 0, 0);
      renderer.setClearColor(new THREE.Color(col.bg), 1);
      [[farCam, views.far], [nearCam, views.near]].forEach(function (p) {
        var cam = p[0], v = p[1], yb = H - v.y - v.h;
        renderer.setViewport(v.x, yb, v.w, v.h);
        renderer.setScissor(v.x, yb, v.w, v.h);
        cam.aspect = v.w / v.h; cam.updateProjectionMatrix();
        renderer.render(scene, cam);
      });
    }

    // ---------- 위성 끌기 ----------
    var raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    function farRay(ev) {
      var r = canvas.getBoundingClientRect(), v = views.far;
      var x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
      if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) return null;
      raycaster.setFromCamera(new THREE.Vector2((x - v.x) / v.w * 2 - 1, -((y - v.y) / v.h * 2 - 1)), farCam);
      return raycaster.ray;
    }
    function pick(ev) {
      if (!farRay(ev)) return -1;
      var hits = raycaster.intersectObjects(pickables, false);
      for (var i = 0; i < hits.length; i++) if (hits[i].object.parent.visible) return hits[i].object.userData.index;
      return -1;
    }
    var dragging = -1;
    function moveSat(ev) {
      var ray = farRay(ev);
      if (!ray) return;
      var o = ray.origin, d = ray.direction, b = o.dot(d), c = o.lengthSq() - R * R, disc = b * b - c, p;
      if (disc >= 0) p = o.clone().addScaledVector(d, -b - Math.sqrt(disc));
      else p = o.clone().addScaledVector(d, -b).setLength(R);
      var el = Math.asin(Math.max(-1, Math.min(1, p.y / R))) * 180 / Math.PI;
      state.sats[dragging] = { az: Math.atan2(p.x, p.z) * 180 / Math.PI, el: Math.max(5, Math.min(90, el)) };
      state.preset = null;
      refresh();
    }
    wrap.addEventListener('pointerdown', function (ev) {
      var i = pick(ev);
      if (i < 0) return;
      dragging = i; controls.enabled = false;
      canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }, true);
    canvas.addEventListener('pointermove', function (ev) {
      if (dragging >= 0) { moveSat(ev); return; }
      canvas.style.cursor = pick(ev) >= 0 ? 'grab' : '';
    });
    function up() { if (dragging >= 0) { dragging = -1; controls.enabled = true; } }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    controls.addEventListener('change', requestDraw);
    nR.addEventListener('input', function () { state.n = +nR.value; refresh(); });
    sR.addEventListener('input', function () { state.sigma = +sR.value; refresh(); });
    shellC.addEventListener('change', function () { state.shells = shellC.checked; refresh(); });
    clockC.addEventListener('change', function () { state.clock = clockC.checked; refresh(); });

    function retheme() { readColors(); buildThemed(); layout(); requestDraw(); }
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', retheme);
    }
    window.addEventListener('resize', function () { layout(); requestDraw(); });

    buildThemed(); layout(); refresh();
  }

  start();
})();
