/* Home: GitHub contribution calendar for the last year (data from github-contributions-api.jogruber.de) */
(function () {
  'use strict';
  var root = document.getElementById('gh-contrib');
  if (!root) return;
  var user = root.getAttribute('data-user');
  var profile = 'https://github.com/' + user;
  var LEVELS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var CELL = 11, GAP = 3, LEFT = 30, TOP = 18;

  var style = document.createElement('style');
  style.textContent =
    '.gh-contrib-box{border:1px solid #d0d7de;border-radius:6px;padding:14px 16px 10px;background:#fff}' +
    '.gh-contrib-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-bottom:8px}' +
    '.gh-contrib-total{font-size:1rem;color:#1f2328}' +
    '.gh-contrib-head a{font-size:.85rem}' +
    '.gh-contrib-scroll{overflow-x:auto}' +
    '.gh-contrib-scroll svg{display:block;min-width:700px;width:100%;height:auto}' +
    '.gh-contrib-foot{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:.75rem;color:#59636e;margin-top:6px}' +
    '.gh-contrib-foot i{display:inline-block;width:10px;height:10px;border-radius:2px}';
  document.head.appendChild(style);

  function fallback() {
    root.innerHTML = '<p><a href="' + profile + '">GitHub에서 활동 기록 보기</a></p>';
  }

  function parse(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function render(data) {
    var days = data.contributions || [];
    if (!days.length) { fallback(); return; }
    // pad the front so the first column starts on Sunday, like GitHub
    var first = parse(days[0].date), pad = first.getDay();
    var cells = [];
    for (var i = 0; i < pad; i++) cells.push(null);
    days.forEach(function (d) { cells.push(d); });
    var weeks = Math.ceil(cells.length / 7);
    var W = LEFT + weeks * (CELL + GAP), H = TOP + 7 * (CELL + GAP);
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'GitHub contributions in the last year');
    function text(x, y, s) {
      var t = document.createElementNS(ns, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y);
      t.setAttribute('font-size', '10'); t.setAttribute('fill', '#59636e');
      t.textContent = s; svg.appendChild(t);
    }
    [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']].forEach(function (r) { text(0, TOP + r[0] * (CELL + GAP) + CELL - 2, r[1]); });
    var lastMonth = -1;
    for (var k = 0; k < cells.length; k++) {
      var d = cells[k];
      var col = Math.floor(k / 7), row = k % 7;
      if (!d) continue;
      var dt = parse(d.date);
      if (row === 0 || k === pad) {
        var m = dt.getMonth();
        // label the first column, then each column where a new month begins
        if (k === pad || (m !== lastMonth && dt.getDate() <= 7)) {
          text(LEFT + col * (CELL + GAP), TOP - 6, MONTHS[m]);
          lastMonth = m;
        }
      }
      var r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', LEFT + col * (CELL + GAP)); r.setAttribute('y', TOP + row * (CELL + GAP));
      r.setAttribute('width', CELL); r.setAttribute('height', CELL);
      r.setAttribute('rx', 2); r.setAttribute('fill', LEVELS[d.level] || LEVELS[0]);
      var title = document.createElementNS(ns, 'title');
      title.textContent = d.date + ': ' + (d.count ? d.count + ' contribution' + (d.count > 1 ? 's' : '') : 'No contributions');
      r.appendChild(title);
      svg.appendChild(r);
    }

    var total = (data.total && data.total.lastYear) || days.reduce(function (a, d) { return a + d.count; }, 0);
    root.innerHTML = '';
    var box = document.createElement('div'); box.className = 'gh-contrib-box';
    var head = document.createElement('div'); head.className = 'gh-contrib-head';
    var t = document.createElement('span'); t.className = 'gh-contrib-total';
    t.textContent = total + ' contributions in the last year';
    var a = document.createElement('a'); a.href = profile; a.textContent = '@' + user + ' →';
    head.appendChild(t); head.appendChild(a);
    var sc = document.createElement('div'); sc.className = 'gh-contrib-scroll'; sc.appendChild(svg);
    var foot = document.createElement('div'); foot.className = 'gh-contrib-foot';
    foot.appendChild(document.createTextNode('Less'));
    LEVELS.forEach(function (c) { var i = document.createElement('i'); i.style.background = c; foot.appendChild(i); });
    foot.appendChild(document.createTextNode('More'));
    box.appendChild(head); box.appendChild(sc); box.appendChild(foot);
    root.appendChild(box);
    sc.scrollLeft = sc.scrollWidth; // on narrow screens show the most recent weeks first
  }

  fetch('https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(user) + '?y=last')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(fallback);
})();
