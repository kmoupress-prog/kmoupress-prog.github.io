/*
 * A public chat room in MomoTalk style (_includes/kchat.html): on the home page, and compact
 * (data-compact) in the post panel. All of them share one room, so messages show up everywhere.
 * Settings and Kei's pinned welcome come from _data/kei_chat.yml (JSON in #kchat-data).
 * Messages live in Firebase Realtime Database under chat/messages; each visitor signs in
 * anonymously, and a send writes chat/messages/<id> and chat/last/<uid> together so the
 * database rules can limit message size and rate.
 * Moderation: open any page with ?admin and sign in with Google; the database rules
 * let only the owner's account delete, and each message then gets a delete button.
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
  var isAdmin = false; // signed in with Google (the rules decide who may really delete)
  var adminNote = '';
  var removeMsg = null; // set once the database is ready
  var last = null; // { uid, ts, col } of the newest message group
  var lastDay = null;
  var msgs = {}; // message key -> message, as loaded from the room
  var newestTs = 0;

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
    if (isAdmin && key) {
      var del = el('button', 'kchat-del', '×');
      del.type = 'button';
      del.title = '이 메시지 지우기';
      del.addEventListener('click', function () {
        if (confirm('이 메시지를 지울까요?\n\n' + m.name + ': ' + m.text)) removeMsg(key);
      });
      line.appendChild(del);
    }
    last.col.appendChild(line);
    last.ts = m.ts || last.ts;

    if (stick || mine) {
      scrollDown();
      requestAnimationFrame(scrollDown); // again after layout (wrapped lines, late fonts)
    }
  }

  // Kei's pinned welcome
  function welcome() {
    (C.welcome || []).forEach(function (w) {
      add(typeof w === 'string' ? { kei: true, text: w } : { kei: true, sticker: w.sticker });
    });
    last = null;
  }

  // redraw everything in time order (after a removal, or a message that arrives out of order)
  function rerender() {
    var top = log.scrollTop;
    var atBottom = nearBottom();
    log.textContent = '';
    last = null;
    lastDay = null;
    welcome();
    Object.keys(msgs)
      .sort(function (a, b) {
        return (msgs[a].ts || 0) - (msgs[b].ts || 0);
      })
      .forEach(function (k) {
        add(msgs[k], k);
      });
    if (atBottom) scrollDown();
    else log.scrollTop = top;
  }

  welcome();

  // stay at the bottom while the reader hasn't scrolled up, even when late font subsets
  // (Pretendard loads glyphs on demand) or a resized panel change the layout
  var pinned = true;
  log.addEventListener('scroll', function () {
    pinned = nearBottom();
  });
  function keepPinned() {
    if (pinned) scrollDown();
  }
  if (document.fonts) document.fonts.addEventListener('loadingdone', keepPinned);
  if (window.ResizeObserver) new ResizeObserver(keepPinned).observe(log);

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

      var auth = A.getAuth(app);
      var wantAdmin = /[?&]admin\b/.test(location.search);

      removeMsg = function (key) {
        D.remove(D.ref(db, 'chat/messages/' + key)).catch(function () {
          setNote('지우지 못했어요. 관리자 계정으로 로그인했는지 확인해 주세요.', true);
        });
      };

      return new Promise(function (resolve) {
        var off = A.onAuthStateChanged(auth, function (u) {
          off();
          resolve(u);
        });
      })
        .then(function (u) {
          if (u && !u.isAnonymous) return u;
          if (wantAdmin) {
            return new Promise(function (resolve) {
              var b = el('button', 'kchat-admin', 'Google 계정으로 관리자 로그인');
              b.type = 'button';
              b.addEventListener('click', function () {
                A.signInWithPopup(auth, new A.GoogleAuthProvider())
                  .then(function (cred) {
                    b.remove();
                    resolve(cred.user);
                  })
                  .catch(function (err) {
                    var why = {
                      'auth/operation-not-allowed': 'Firebase에서 Google 로그인이 꺼져 있어요.',
                      'auth/unauthorized-domain': '이 블로그 주소가 Firebase 승인된 도메인에 없어요.',
                      'auth/popup-blocked': '브라우저가 로그인 팝업을 막았어요.',
                      'auth/popup-closed-by-user': '로그인 창이 닫혔어요.',
                      'auth/cancelled-popup-request': '로그인 창이 닫혔어요.'
                    }[err && err.code];
                    setNote(' ' + (why || '로그인하지 못했어요. (' + ((err && err.code) || '알 수 없는 오류') + ')'), true);
                    note.insertBefore(b, note.firstChild); // keep the button for another try
                  });
              });
              note.textContent = '';
              note.appendChild(b);
            });
          }
          return u || A.signInAnonymously(auth).then(function (cred) {
            return cred.user;
          });
        })
        .then(function (user) {
          uid = user.uid;
          isAdmin = !user.isAnonymous;
          if (isAdmin) adminNote = '관리자 모드 (' + (user.email || user.uid) + '): 메시지 옆 × 버튼으로 지울 수 있어요.';
          setNote(adminNote);

          var q = D.query(D.ref(db, 'chat/messages'), D.orderByChild('ts'), D.limitToLast(C.history || 100));
          D.onChildAdded(
            q,
            function (snap) {
              var m = snap.val();
              msgs[snap.key] = m;
              // an older message coming back (e.g. a refused delete) is redrawn in order
              if (m.ts < newestTs) rerender();
              else add(m, snap.key);
              newestTs = Math.max(newestTs, m.ts || 0);
            },
            function () {
              setEnabled(false, '채팅방에 연결하지 못했어요');
              setNote('잠시 뒤에 새로고침해 보세요.', true);
            }
          );
          D.onChildRemoved(q, function (snap) {
            delete msgs[snap.key];
            rerender();
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
                setNote(adminNote);
              })
              .catch(function () {
                input.value = text;
                setNote('보내지 못했어요. 메시지는 3초에 한 번씩 보낼 수 있어요.', true);
              });
          });
        });
    })
    .catch(function () {
      setEnabled(false, '채팅방에 연결하지 못했어요');
      setNote('잠시 뒤에 새로고침해 보세요.', true);
    });
})();
