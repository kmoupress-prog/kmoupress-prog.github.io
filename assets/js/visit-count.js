/*
 * Visitor counter in the footer (TODAY / TOTAL).
 * Counts each browser once per day (Korean date), stored in the chat room's Firebase
 * Realtime Database under stats/total and stats/days/<YYYY-MM-DD>. Uses the REST API with
 * a server-side increment, so pages don't need the Firebase SDK; the database rules only
 * accept +1 steps.
 */
(function () {
  var box = document.querySelector('[data-visits]');
  if (!box) return;
  var db = box.getAttribute('data-db');
  if (!db) return;

  var KEY = 'keilab.visit.day';
  var today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST
  var url = db.replace(/\/$/, '') + '/stats';

  function show(t, total) {
    box.querySelector('[data-today]').textContent = (t || 0).toLocaleString('ko-KR');
    box.querySelector('[data-total]').textContent = (total || 0).toLocaleString('ko-KR');
    box.hidden = false;
  }

  function read() {
    return Promise.all([
      fetch(url + '/days/' + today + '.json').then(function (r) {
        return r.json();
      }),
      fetch(url + '/total.json').then(function (r) {
        return r.json();
      })
    ]).then(function (v) {
      show(v[0], v[1]);
    });
  }

  var counted = false;
  try {
    counted = localStorage.getItem(KEY) === today;
  } catch (e) {}

  var step = counted
    ? Promise.resolve()
    : fetch(url + '.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: { '.sv': { increment: 1 } },
          ['days/' + today]: { '.sv': { increment: 1 } }
        })
      }).then(function (r) {
        if (r.ok) {
          try {
            localStorage.setItem(KEY, today);
          } catch (e) {}
        }
      });

  step
    .catch(function () {})
    .then(read)
    .catch(function () {});
})();
