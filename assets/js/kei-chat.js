/*
 * Home: a public chat room in MomoTalk style.
 * Settings and Kei's pinned welcome come from _data/kei_chat.yml (JSON in #kchat-data).
 * Messages live in Firebase Realtime Database under chat/messages; each visitor signs in
 * anonymously, and a send writes chat/messages/<id> and chat/last/<uid> together so the
 * database rules can limit message size and rate.
 */
(function () {
  var root = document.querySelector('[data-kchat]');
  var dataEl = document.getElementById('kchat-data');
  if (!root || !dataEl) return;

  var C = JSON.parse(dataEl.textContent);
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var NICK_KEY = 'keilab.chat.nick';
  var GROUP_MS = 3 * 60 * 1000; // consecutive messages within 3 min share one name/avatar
  var COOLDOWN_MS = 3000;

  var log = root.querySelector('.kchat-log');
  var form = root.querySelector('.kchat-form');
  var nick = root.querySelector('.kchat-nick');
  var input = root.querySelector('.kchat-input');
  var send = root.querySelector('.kchat-send');
  var note = root.querySelector('.kchat-note');

  var uid = null;
  var last = null; // { uid, ts, col } of the newest message group
  var lastDay = null;
  var lines = {}; // message key -> element, for removals

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function nearBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  }

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function hue(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }

  function timeLabel(ts) {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  }

  function dayLabel(ts) {
    return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }

  function setNote(text, isError) {
    note.textContent = text;
    note.classList.toggle('is-error', !!isError);
  }

  function avatar(m) {
    if (m.kei) {
      var img = el('img', 'kchat-avatar');
      img.src = C.kei_avatar;
      img.alt = '';
      return img;
    }
    var a = el('div', 'kchat-avatar is-initial', Array.from(m.name || '?')[0]);
    a.style.background = 'hsl(' + hue(m.uid || m.name || '') + ', 45%, 62%)';
    return a;
  }

  function content(m) {
    if (m.sticker) {
      var s = el('img', 'kchat-sticker');
      s.src = C.stickers + 'sticker-' + m.sticker + '.webp';
      s.alt = '케이 스티커';
      s.addEventListener('load', function () {
        if (nearBottom()) scrollDown();
      });
      return s;
    }
    return el('div', 'kchat-bubble', m.text);
  }

  function add(m, key) {
    var stick = nearBottom();
    var mine = !!uid && m.uid === uid;

    if (m.ts) {
      var day = new Date(m.ts).toDateString();
      if (day !== lastDay) {
        log.appendChild(el('div', 'kchat-day', dayLabel(m.ts)));
        lastDay = day;
        last = null;
      }
    }

    var who = m.kei ? 'kei' : m.uid;
    if (!last || last.uid !== who || (m.ts && last.ts && m.ts - last.ts > GROUP_MS)) {
      var row = el('div', 'kchat-row ' + (mine ? 'is-me' : 'is-other'));
      var col = el('div', 'kchat-col');
      if (!mine) {
        row.appendChild(avatar(m));
        col.appendChild(el('div', 'kchat-name', m.kei ? C.kei_name : m.name));
      }
      row.appendChild(col);
      log.appendChild(row);
      last = { uid: who, ts: m.ts, col: col };
    }

    var line = el('div', 'kchat-line');
    line.appendChild(content(m));
    if (m.ts) line.appendChild(el('span', 'kchat-time', timeLabel(m.ts)));
    last.col.appendChild(line);
    last.ts = m.ts || last.ts;
    if (key) lines[key] = line;

    if (stick || mine) scrollDown();
  }

  // Kei's pinned welcome
  (C.welcome || []).forEach(function (w) {
    add(typeof w === 'string' ? { kei: true, text: w } : { kei: true, sticker: w.sticker });
  });
  last = null;

  // nickname, remembered in this browser
  try {
    nick.value = localStorage.getItem(NICK_KEY) || '';
  } catch (e) {}
  if (!nick.value) nick.value = '선생님' + Math.floor(1000 + Math.random() * 9000);
  nick.addEventListener('change', function () {
    try {
      localStorage.setItem(NICK_KEY, nick.value.trim());
    } catch (e) {}
  });

  function setEnabled(on, placeholder) {
    input.disabled = !on;
    send.disabled = !on;
    if (placeholder) input.placeholder = placeholder;
  }

  var fb = C.firebase || {};
  if (!fb.apiKey || !fb.databaseURL) {
    setEnabled(false, '채팅방 준비 중이에요');
    return;
  }

  setEnabled(false, '연결 중…');
  Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-database.js')
  ])
    .then(function (mods) {
      var app = mods[0].initializeApp(fb);
      var A = mods[1];
      var D = mods[2];
      var db = D.getDatabase(app);

      return A.signInAnonymously(A.getAuth(app)).then(function (cred) {
        uid = cred.user.uid;

        var q = D.query(D.ref(db, 'chat/messages'), D.orderByChild('ts'), D.limitToLast(C.history || 100));
        D.onChildAdded(q, function (snap) {
          add(snap.val(), snap.key);
        });
        D.onChildRemoved(q, function (snap) {
          var line = lines[snap.key];
          if (!line) return;
          var col = line.parentNode;
          line.remove();
          if (col && !col.querySelector('.kchat-line')) col.parentNode.remove();
          delete lines[snap.key];
        });

        setEnabled(true, '메시지를 입력하세요');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var text = input.value.trim();
          var name = nick.value.trim().slice(0, 16) || '익명';
          if (!text || send.disabled) return;

          var key = D.push(D.ref(db, 'chat/messages')).key;
          var up = {};
          up['messages/' + key] = { name: name, text: text.slice(0, 300), ts: D.serverTimestamp(), uid: uid };
          up['last/' + uid] = D.serverTimestamp();

          input.value = '';
          send.disabled = true;
          setTimeout(function () {
            send.disabled = false;
          }, COOLDOWN_MS);

          D.update(D.ref(db, 'chat'), up)
            .then(function () {
              setNote('');
            })
            .catch(function () {
              input.value = text;
              setNote('조금 천천히 보내 주세요. 3초에 한 번씩 보낼 수 있어요.', true);
            });
        });
      });
    })
    .catch(function () {
      setEnabled(false, '채팅방에 연결하지 못했어요');
      setNote('잠시 뒤에 새로고침해 보세요.', true);
    });
})();
