/*
 * Home hero: a MomoTalk-style chat with Kei.
 * The script (messages, stickers, choices) is _data/kei_chat.yml, embedded by
 * _layouts/home.html as JSON in #kchat-data. The visitor answers with choice buttons.
 */
(function () {
  var root = document.querySelector('[data-kchat]');
  var dataEl = document.getElementById('kchat-data');
  if (!root || !dataEl) return;

  var D = JSON.parse(dataEl.textContent);
  var log = root.querySelector('.kchat-log');
  var choicesEl = root.querySelector('.kchat-choices');
  var waitingEl = root.querySelector('.kchat-waiting');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var visited = {};
  var keiCol = null; // bubble column of the current Kei message group
  var player = null; // the voice message that is playing

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, reduce ? 0 : ms);
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function currentKeiCol() {
    if (keiCol) return keiCol;
    var row = el('div', 'kchat-row is-kei');
    var av = el('img', 'kchat-avatar');
    av.src = D.avatar;
    av.alt = '';
    var col = el('div', 'kchat-col');
    col.appendChild(el('div', 'kchat-name', D.name));
    row.appendChild(av);
    row.appendChild(col);
    log.appendChild(row);
    keiCol = col;
    return col;
  }

  function voiceBubble(m) {
    var box = el('div', 'kchat-bubble kchat-voice');
    var btn = el('button', 'kchat-play');
    btn.type = 'button';
    btn.setAttribute('aria-label', '음성 메시지 재생');
    btn.innerHTML = '<i class="fas fa-play"></i>';
    var wave = el('span', 'kchat-wave');
    var bars = [];
    for (var i = 0; i < 24; i++) {
      var b = el('span');
      var h = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45));
      b.style.height = Math.round(h * 100) + '%';
      wave.appendChild(b);
      bars.push(b);
    }
    var dur = el('span', 'kchat-dur', '0:00');
    box.appendChild(btn);
    box.appendChild(wave);
    box.appendChild(dur);

    var audio = new Audio();
    audio.preload = 'metadata';
    audio.src = m.audio;
    audio.addEventListener('loadedmetadata', function () {
      dur.textContent = '0:' + ('0' + Math.round(audio.duration)).slice(-2);
    });
    audio.addEventListener('timeupdate', function () {
      var on = Math.round((audio.currentTime / (audio.duration || 1)) * bars.length);
      bars.forEach(function (b, i) {
        b.classList.toggle('on', i < on);
      });
    });
    function setIcon(playing) {
      btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
    audio.addEventListener('pause', function () {
      setIcon(false);
    });
    audio.addEventListener('ended', function () {
      setIcon(false);
      bars.forEach(function (b) {
        b.classList.remove('on');
      });
    });
    btn.addEventListener('click', function () {
      if (audio.paused) {
        if (player && player !== audio) player.pause();
        player = audio;
        audio.play();
        setIcon(true);
      } else {
        audio.pause();
      }
    });

    var wrap = el('div', 'kchat-voice-wrap');
    wrap.appendChild(box);
    if (m.text) wrap.appendChild(el('div', 'kchat-caption', '“' + m.text + '”'));
    return wrap;
  }

  function render(m) {
    if (typeof m === 'string') return el('div', 'kchat-bubble', m);
    if (m.sticker) {
      var s = el('img', 'kchat-sticker');
      s.src = D.stickers + 'sticker-' + m.sticker + '.webp';
      s.alt = '케이 스티커';
      s.addEventListener('load', scrollDown);
      return s;
    }
    if (m.audio) return voiceBubble(m);
    if (m.link) {
      var a = el('a', 'kchat-link');
      a.href = encodeURI(m.link);
      a.appendChild(el('strong', null, m.title));
      if (m.desc) a.appendChild(el('span', null, m.desc));
      return a;
    }
    return el('div', 'kchat-bubble', String(m));
  }

  async function say(msgs) {
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      var col = currentKeiCol();
      var typing = el('div', 'kchat-bubble is-typing');
      typing.innerHTML = '<span></span><span></span><span></span>';
      col.appendChild(typing);
      scrollDown();
      await wait(typeof m === 'string' ? Math.min(1500, 380 + m.length * 32) : 700);
      col.replaceChild(render(m), typing);
      scrollDown();
      await wait(250);
    }
  }

  function me(text) {
    keiCol = null;
    var row = el('div', 'kchat-row is-me');
    row.appendChild(el('div', 'kchat-bubble', text));
    log.appendChild(row);
    scrollDown();
  }

  function showChoices(list) {
    choicesEl.innerHTML = '';
    list.forEach(function (c) {
      var b = el('button', 'kchat-choice', c.text);
      b.type = 'button';
      b.addEventListener('click', function () {
        pick(c);
      });
      choicesEl.appendChild(b);
    });
    waitingEl.hidden = true;
  }

  function clearChoices() {
    choicesEl.innerHTML = '';
    waitingEl.hidden = false;
  }

  async function pick(c) {
    clearChoices();
    if (c.go === 'restart') {
      if (player) player.pause();
      log.innerHTML = '';
      keiCol = null;
      visited = {};
      await wait(300);
      return run(D.start);
    }
    me(c.text);
    keiCol = null;
    await wait(600);
    run(c.go);
  }

  async function run(id) {
    var n = D.nodes[id];
    visited[id] = true;
    await say(n.kei);
    if (n.choices) return showChoices(n.choices);

    var left = D.menu.filter(function (c) {
      return !visited[c.go];
    });
    if (n.back !== false) await say([pickOne(left.length ? D.back : D.back_done)]);
    showChoices(left.concat([D.bye]));
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    wait(500).then(function () {
      run(D.start);
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(root);
  } else {
    start();
  }
})();
