---
title: '부루마카이브 제작과정 #3: 멀티'
date: 2026-10-31 17:00:00 +0900
categories: [Games, 부루마카이브]
description: 혼자 AI와 두던 부루마카이브에 멀티를 붙였습니다. 링크만 열면 각자 브라우저에서 같은 판에 앉는 방법과, 같이 해 보고 고친 장면들을 정리했습니다.
---

<style>
/* 게임 화면과 같은 세계: 밤색 판 + 타이틀 분홍 + 황금카드 금색 (제작과정 #2 와 같은 틀) */
.buru {
  --ground: #1c1d2b; --panel: #2a2e45; --line: #4a5070;
  --text: #eceaf4; --dim: #a9acc4; --pink: #f59ac8; --gold: #f3c94f;
  --sky: #5db4f2;
  --display: "Do Hyeon", "Pretendard Variable", "Noto Sans KR", sans-serif;
  color: var(--text);
  display: grid; gap: 3.5rem;
  font-size: 1rem; line-height: 1.75;
}
.buru * { box-sizing: border-box; }
.buru h2 { font-family: var(--display); font-weight: 400; margin: 0; text-wrap: balance; font-size: clamp(1.7rem, 4.5vw, 2.25rem); line-height: 1.2; color: var(--pink); }
.buru p { margin: 0; max-width: 65ch; }
.buru a { color: var(--sky); }
.buru section { display: grid; gap: 1.3rem; min-width: 0; }
.buru img { display: block; max-width: 100%; height: auto; margin: 0; }
.buru figure { margin: 0; display: grid; gap: .5rem; min-width: 0; align-content: start; }
.buru figcaption { font-size: .875rem; color: var(--dim); text-align: left; }
.buru .lead { font-size: 1.15rem; }
.buru .flow { display: flex; flex-wrap: wrap; gap: .5rem; }
.buru .flow > div { flex: 1 1 130px; min-width: 0; background: var(--panel); border: 1px solid var(--line); padding: .6rem .75rem; display: grid; gap: 2px; align-content: start; }
.buru .flow b { font: 400 1.1rem/1.3 var(--display); color: var(--gold); }
.buru .flow span { font-size: .84rem; line-height: 1.5; color: var(--dim); }
.buru .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.buru .cases-wrap { overflow-x: auto; border: 1px solid var(--line); }
.buru table { border-collapse: collapse; width: 100%; min-width: 640px; margin: 0; font-size: .9rem; line-height: 1.6; color: var(--text); background: transparent; }
.buru th, .buru td { padding: .6rem .75rem; text-align: left; vertical-align: top; border: 0; border-bottom: 1px solid var(--line); background: transparent; }
.buru th { font: 400 1rem var(--display); color: var(--gold); background: var(--panel); }
.buru tr:last-child td { border-bottom: 0; }
.buru td:first-child { font-weight: 500; white-space: nowrap; }
.buru .foot { font-size: .875rem; color: var(--dim); border-top: 1px solid var(--line); padding-top: 1.1rem; display: grid; gap: .4rem; }
</style>

<div class="buru">

<header style="display:grid;gap:1.3rem">
  <p class="lead">부루마카이브는 처음에 혼자 AI 네 명과 두는 게임이었습니다. 그런데 부루마블은 역시 사람끼리 해야 재미있어서, 링크만 열면 각자 브라우저에서 같은 판에 앉도록 멀티를 붙였습니다. 판과 건물 이야기는 <a href="/posts/burumarchive-making-2/">지난 글</a>에 있고, 이번 글은 멀티 이야기입니다.</p>
  <div class="pair">
    <figure>
      <img src="/assets/img/posts/buru-online-tab1.jpg" alt="모모이 자리 브라우저. 모모이 이름 옆에 나 표시가 있고 주사위 굴리기 버튼이 떠 있다" width="495" height="280">
      <figcaption>모모이를 고른 브라우저. 내 차례라 버튼이 떠 있습니다.</figcaption>
    </figure>
    <figure>
      <img src="/assets/img/posts/buru-online-tab2.jpg" alt="미도리 자리 브라우저. 같은 판이 보이지만 버튼은 없다" width="654" height="372">
      <figcaption>같은 순간 미도리를 고른 브라우저. 판은 같고 버튼만 없습니다. 모모이가 띄운 이모티콘도 똑같이 보입니다.</figcaption>
    </figure>
  </div>
</header>

<section>
  <h2 id="enter">서버를 고르고, 자리에 앉습니다</h2>
  <p>타이틀에서 온라인을 누르면 서버 1과 서버 2가 나옵니다. 고른 서버에서 캐릭터 카드를 누르면 그 자리에 앉습니다. 아무도 안 고른 자리는 AI가 맡고, 먼저 들어온 사람이 방장이 되어 대국을 시작합니다.</p>
  <div class="pair">
    <figure>
      <img src="/assets/img/posts/buru-online-servers.jpg" alt="서버 1, 서버 2, 뒤로 버튼이 있는 화면" width="230" height="135">
      <figcaption>서버는 두 개입니다. 한 무리가 대국 중이어도 다른 무리가 따로 할 수 있습니다.</figcaption>
    </figure>
    <figure>
      <img src="/assets/img/posts/buru-online-lobby.jpg" alt="캐릭터 카드 다섯 장. 모모이에 나, 미도리에 P 표시가 있고 나머지는 AI" width="450" height="225">
      <figcaption>내 자리는 '나', 다른 사람 자리는 'P', 빈자리는 AI로 표시됩니다.</figcaption>
    </figure>
  </div>
</section>

<section>
  <h2 id="same-board">서버는 규칙을 모릅니다</h2>
  <p>보통은 서버가 주사위도 굴리고 돈도 계산할 것 같지만, 부루마카이브의 서버는 우편배달부에 가깝습니다. 규칙을 하나도 모르고, 누가 무엇을 눌렀는지만 모두에게 같은 순서로 전해 줍니다.</p>
  <div class="flow" role="list">
    <div role="listitem"><b>내가 누른다</b><span>바로 움직이지 않고 서버로 보냅니다</span></div>
    <div role="listitem"><b>서버가 순서를 매긴다</b><span>먼저 도착한 것부터 번호를 붙입니다</span></div>
    <div role="listitem"><b>모두에게 돌려준다</b><span>나한테도 똑같이 돌아옵니다</span></div>
    <div role="listitem"><b>각자 계산한다</b><span>같은 순서로 적용하니 판이 같아집니다</span></div>
  </div>
  <p>이게 되는 이유는 판을 시작할 때 모두가 같은 주사위 순서표를 받기 때문입니다. 같은 판에서 같은 행동을 하면 언제나 같은 결과가 나옵니다. AI 차례도 보내지 않습니다. 같은 판을 보고 있으니 브라우저마다 같은 답을 냅니다.</p>
  <p>컷인이 끝나는 속도는 브라우저마다 조금씩 다를 수 있습니다. 앞선 브라우저가 보낸 행동은 늦은 브라우저가 그 자리에 올 때까지 기다렸다가 적용합니다. 인터넷이 끊겨도 다시 들어오면 같은 자리로 돌아오고, 그동안의 기록을 연출 없이 빠르게 따라잡습니다.</p>
  <p>사람을 기다리다 판이 멈추면 안 되니 선택마다 30초 제한도 넣었습니다. 시간이 지나면 주사위를 굴리고, 땅은 사지 않는 기본 선택으로 넘어갑니다.</p>
</section>

<section>
  <h2 id="auction">경매는 서로 모르게</h2>
  <p>멀티를 하고 나니 경매가 싱거웠습니다. 정해진 금액 네 개 중에 고르는 방식이라 눈치 싸움이 안 됐습니다. 지금은 금액을 직접 칩니다. 앞사람이 얼마를 불렀는지는 끝날 때까지 보이지 않습니다.</p>
  <div class="pair">
    <figure>
      <img src="/assets/img/posts/buru-online-bid.jpg" alt="모모이 화면. 입찰 칸에 3500을 입력했다" loading="lazy" width="988" height="557">
      <figcaption>모모이가 3,500을 불렀습니다.</figcaption>
    </figure>
    <figure>
      <img src="/assets/img/posts/buru-online-bid-other.jpg" alt="미도리 화면. 입찰 칸이 비어 있고 앞사람 금액은 보이지 않는다" loading="lazy" width="523" height="298">
      <figcaption>다음 차례 미도리에게는 그 금액이 보이지 않습니다.</figcaption>
    </figure>
  </div>
</section>

<section>
  <h2 id="qa">같이 해 보고 고친 것</h2>
  <figure>
    <img src="/assets/img/posts/buru-online-esc.jpg" alt="어두워진 판 위에 음량 설정과 돌아가기 버튼이 떠 있고 뒤에서 주사위가 보인다" loading="lazy" width="988" height="557">
    <figcaption>멀티에서는 ESC 메뉴를 열어도 뒤에서 판이 계속 갑니다.</figcaption>
  </figure>
  <div class="cases-wrap">
    <table>
      <thead><tr><th>장면</th><th>전에는</th><th>지금은</th></tr></thead>
      <tbody>
        <tr><td>온라인 입장</td><td>앞 판이 서버에 남아 있어, 누르자마자 지난 판으로 들어갔습니다.</td><td>서버를 고르고 캐릭터 고르기로 갑니다. 사람이 다 나가면 그 서버는 처음으로 돌아갑니다. 연결만 끊긴 거라면 5초 기다려 줍니다.</td></tr>
        <tr><td>ESC</td><td>ESC 키가 아무 일도 안 했습니다.</td><td>대국 중 ESC로 메뉴를 열고 닫습니다.</td></tr>
        <tr><td>메뉴 열기</td><td>메뉴를 열면 내 판만 멈춰서, 다른 사람이 전부 기다리게 될 수 있었습니다.</td><td>멀티에서는 멈추지 않습니다. 메뉴를 연 채 내 차례가 지나면 기본 선택으로 넘어갑니다.</td></tr>
        <tr><td>말 걸기</td><td>대국 중에 표현할 방법이 없었습니다.</td><td>이모티콘을 고르면 모두의 화면에서 내 프로필 옆에 뜹니다.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <h2 id="left">아직 남은 것</h2>
  <p>지금 주소는 임시라 켤 때마다 바뀔 수 있고, 제 컴퓨터가 켜져 있어야 접속됩니다. 언제든 들어올 수 있는 고정 주소는 아직 없습니다.</p>
</section>

<footer class="foot">
  <span>블루아카이브의 캐릭터와 세계관 저작권은 NEXON Games / Yostar에 있습니다. 개인 팬 프로젝트로 공개 배포는 하지 않으며, 이 글의 화면 캡처에는 게임 그림이 들어 있습니다.</span>
</footer>

</div>
