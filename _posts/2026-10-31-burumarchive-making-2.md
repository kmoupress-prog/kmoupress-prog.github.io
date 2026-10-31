---
title: '부루마카이브 제작과정 #2'
date: 2026-10-31 16:00:00 +0900
categories: [Games, 부루마카이브]
description: 블루아카이브 게임개발부 다섯 명이 키보토스 보드 40칸을 도는 부루마블. 판과 건물이 어떻게 바뀌었는지, 8일 동안 화면에 무엇이 생겼는지 그림으로 정리했습니다.
---

<style>
/* 게임 화면과 같은 세계: 밤색 판 + 타이틀 분홍 + 황금카드 금색 */
.buru {
  --ground: #1c1d2b; --panel: #2a2e45; --line: #4a5070;
  --text: #eceaf4; --dim: #a9acc4; --pink: #f59ac8; --gold: #f3c94f;
  --card: #fbf1cf; --card-ink: #3a2f12; --sky: #5db4f2;
  --display: "Do Hyeon", "Pretendard Variable", "Noto Sans KR", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: var(--text);
  display: grid; gap: 3.5rem;
  font-size: 1rem; line-height: 1.75;
}
.buru * { box-sizing: border-box; }
.buru h2, .buru h3 { font-family: var(--display); font-weight: 400; margin: 0; text-wrap: balance; }
.buru h2 { font-size: clamp(1.7rem, 4.5vw, 2.25rem); line-height: 1.2; color: var(--pink); }
.buru h3 { font-size: 1.35rem; line-height: 1.3; color: var(--text); }
.buru p { margin: 0; max-width: 65ch; }
.buru a { color: var(--sky); }
.buru code { font: 500 .88em var(--mono); color: var(--sky); background: transparent; padding: 0; }
.buru section { display: grid; gap: 1.3rem; min-width: 0; }
.buru img { display: block; max-width: 100%; height: auto; margin: 0; }
.buru figure { margin: 0; display: grid; gap: .5rem; min-width: 0; }
.buru figcaption { font-size: .875rem; color: var(--dim); text-align: left; }
.buru .lead { font-size: 1.15rem; }
.buru .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.buru .facts div { background: var(--panel); padding: .75rem .9rem; display: grid; gap: 2px; align-content: start; }
.buru .facts b { font: 400 1.55rem/1.2 var(--display); color: var(--gold); font-variant-numeric: tabular-nums; }
.buru .facts span { font-size: .8rem; line-height: 1.45; color: var(--dim); }
.buru .flow { display: flex; flex-wrap: wrap; gap: .5rem; }
.buru .flow > div { flex: 1 1 130px; min-width: 0; background: var(--panel); border: 1px solid var(--line); padding: .6rem .75rem; display: grid; gap: 2px; align-content: start; }
.buru .flow b { font: 400 1.1rem/1.3 var(--display); color: var(--gold); }
.buru .flow span { font-size: .84rem; line-height: 1.5; color: var(--dim); }
.buru .days { display: grid; gap: .9rem; }
.buru .day { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 1rem; align-items: start; }
.buru .date { background: var(--card); color: var(--card-ink); border: 2px solid var(--gold); text-align: center; font-family: var(--display); }
.buru .date i { display: block; font-style: normal; background: var(--gold); font-size: .8rem; line-height: 1.5; }
.buru .date b { display: block; font-weight: 400; font-size: 1.55rem; line-height: 1.5; font-variant-numeric: tabular-nums; }
.buru .day ul { margin: .4rem 0 0; padding-left: 1.1em; display: grid; gap: .25rem; }
.buru .day li { margin: 0; max-width: 62ch; }
.buru .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.buru .sprites { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; background: var(--panel); border: 1px solid var(--line); padding: 1rem; }
.buru .sprites img { image-rendering: pixelated; height: 96px; width: auto; }
.buru .steps { margin: 0; padding-left: 1.3em; display: grid; gap: .5rem; max-width: 65ch; }
.buru .steps li { margin: 0; }
.buru .chart { display: grid; gap: 7px; background: var(--panel); border: 1px solid var(--line); padding: 1rem; }
.buru .bar-row { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 10px; align-items: center; font: 500 .875rem var(--mono); font-variant-numeric: tabular-nums; }
.buru .bar-row > span:first-child { text-align: right; color: var(--dim); }
.buru .bar-track { display: flex; align-items: center; gap: 8px; min-width: 0; }
.buru .bar { height: 16px; background: var(--pink); flex: none; }
.buru .bar-row.pick > span:first-child, .buru .bar-row.pick .bar-track { color: var(--gold); }
.buru .cases-wrap { overflow-x: auto; border: 1px solid var(--line); }
.buru table { border-collapse: collapse; width: 100%; min-width: 640px; margin: 0; font-size: .9rem; line-height: 1.6; color: var(--text); background: transparent; }
.buru th, .buru td { padding: .6rem .75rem; text-align: left; vertical-align: top; border: 0; border-bottom: 1px solid var(--line); background: transparent; }
.buru th { font: 400 1rem var(--display); color: var(--gold); background: var(--panel); }
.buru tr:last-child td { border-bottom: 0; }
.buru td:first-child { font-weight: 500; white-space: nowrap; }
.buru .foot { font-size: .875rem; color: var(--dim); border-top: 1px solid var(--line); padding-top: 1.1rem; display: grid; gap: .4rem; }
@media (max-width: 480px) {
  .buru .day { grid-template-columns: 70px minmax(0, 1fr); gap: .75rem; }
  .buru .date b { font-size: 1.25rem; }
}
</style>

<div class="buru">

<header class="buru-hero" style="display:grid;gap:1.3rem">
  <p class="lead">블루아카이브의 도시 키보토스에서 하는 부루마블입니다. 게임개발부 다섯 명이 말이 되어 보드 40칸을 돌고, 사람이 1~5명 들어오며 빈자리는 AI가 맡습니다. 10월 24일에 만들기 시작해 10월 31일에 친구들과 온라인으로 돌려 봤습니다.</p>
  <figure>
    <img src="/assets/img/posts/buru-making-01.jpg" alt="판 가운데에 학원 여덟 곳의 건물과 지형이 모인 마름모꼴 보드 3D 렌더" width="1000" height="667">
    <figcaption>판 가운데 디오라마. 학원 여덟 곳의 건물과 지형이 한 판에 모여 있습니다.</figcaption>
  </figure>
</header>

<section>
  <h2 id="board">판은 이렇게 바뀌었습니다</h2>
  <div class="pair">
    <figure>
      <img src="/assets/img/posts/buru-making-02.jpg" alt="초기 게임 화면의 보드. 판 가운데 지형이 지금보다 단순하다" loading="lazy" width="853" height="357">
      <figcaption>처음 판. 가운데가 비어 있고, 돈 단위도 아직 '원'이었습니다.</figcaption>
    </figure>
    <figure>
      <img src="/assets/img/posts/buru-making-03.jpg" alt="현재 판 디오라마 렌더" loading="lazy" width="760" height="507">
      <figcaption>지금 판. 학원마다 건물 묶음이 따로 서 있습니다.</figcaption>
    </figure>
  </div>
</section>

<section>
  <h2 id="buildings">땅을 사면 건물이 솟습니다</h2>
  <figure>
    <img src="/assets/img/posts/buru-making-04.jpg" alt="주택, 유리 오피스텔, 원통형 타워 건물 세 채의 3D 렌더" loading="lazy" width="1000" height="333">
    <figcaption>건물 1·2·3단계. 지을 때마다 구름을 일으키며 땅에서 솟아오릅니다.</figcaption>
  </figure>
  <figure>
    <div class="sprites">
      <img src="/assets/img/posts/buru-making-05.png" alt="도트 비행선" loading="lazy" width="128" height="96">
      <img src="/assets/img/posts/buru-making-06.png" alt="도트 기차" loading="lazy" width="128" height="128">
      <img src="/assets/img/posts/buru-making-07.png" alt="도트 주택" loading="lazy" width="32" height="64">
      <img src="/assets/img/posts/buru-making-08.png" alt="도트 타워" loading="lazy" width="32" height="64">
    </div>
    <figcaption>판 위를 지나가는 비행선과 기차, 칸 옆에 서는 건물. 모두 도트로 그렸습니다.</figcaption>
  </figure>
</section>

<section>
  <h2 id="eight-days">8일 동안 화면에 생긴 것</h2>
  <div class="days">
    <article class="day">
      <div class="date"><i>10월</i><b>24</b></div>
      <div>
        <h3>첫 화면</h3>
        <ul>
          <li>타이틀, 좌석 고르기, 대국 화면이 생겼습니다. 이때 말은 아직 도트 네모였습니다.</li>
          <li>주사위가 굴러가는 연출, 효과음, 배경음악이 들어갔습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>25</b></div>
      <div>
        <h3>판과 컷인</h3>
        <ul>
          <li>판 가운데 디오라마와 특별 칸 소품, 주사위 컷인, 캐릭터 대사 음성이 붙었습니다.</li>
          <li>경매, 저당, 거래가 생겨 진짜 부루마블처럼 땅을 두고 싸울 수 있게 됐습니다.</li>
          <li>돈 이름이 원에서 골드를 거쳐 청휘석이 됐습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>26</b></div>
      <div>
        <h3>키보토스다운 장면</h3>
        <ul>
          <li>무인도 칸이 밀레니엄 반성실이 됐습니다. 세미나에게 붙잡히면 코유키 카드가 뜹니다.</li>
          <li>돈을 벌거나 뺏길 때 이모티콘과 GIF 컷인이 터집니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>27</b></div>
      <div>
        <h3>브라우저에서 같이</h3>
        <ul>
          <li>"다같이 부루마블 할 때 할 거니까" 온라인을 붙였습니다. 링크만 열면 각자 브라우저에서 같은 판에 앉습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>31</b></div>
      <div>
        <h3>직접 해 보고 고친 날</h3>
        <ul>
          <li>미도리가 브이 포즈를 하는 영상 컷인이 들어갔습니다.</li>
          <li>게임개발부 칸에서 두 사람이 만나면 주사위 맞다이를 합니다.</li>
          <li>친구들과 돌려 보며 나온 불만을 받아 적고 한 번에 고쳤습니다. 아래에 정리했습니다.</li>
        </ul>
      </div>
    </article>
  </div>
</section>

<section>
  <h2 id="qa">같이 해 보고 바꾼 것</h2>
  <div class="cases-wrap">
    <table>
      <thead><tr><th>장면</th><th>전에는</th><th>지금은</th></tr></thead>
      <tbody>
        <tr><td>경매</td><td>정해진 배수만 부를 수 있어 눈치 싸움이 안 됐습니다.</td><td>가진 돈 안에서 금액을 직접 쳐서 부릅니다.</td></tr>
        <tr><td>AI의 땅 매각</td><td>AI가 건물을 몰아 짓다가 통행료 한 번에 초반부터 땅을 팔았습니다.</td><td>통행료를 낼 돈을 남겨 두고 짓습니다.</td></tr>
        <tr><td>케이의 거래</td><td>케이가 항구를 같은 값에 계속 사려고 졸랐습니다.</td><td>거절당할 때마다 값을 올리고, 일곱 번 거절되면 포기합니다.</td></tr>
        <tr><td>게임개발부 칸</td><td>개발비만 내고 지나가는 칸이었습니다.</td><td>먼저 온 사람과 주사위 맞다이를 해서 10,000을 뺏습니다.</td></tr>
        <tr><td>미도리 컷인</td><td>없었습니다.</td><td>브이 포즈 영상이 나오고, 마지막 포즈에서 잠깐 멈춥니다.</td></tr>
        <tr><td>이모티콘</td><td>대국 중에 말을 걸 방법이 없었습니다.</td><td>이모티콘 515개 중 골라 내 프로필 옆에 띄우면 모두에게 보입니다.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<footer class="foot">
  <span>블루아카이브의 캐릭터와 세계관 저작권은 NEXON Games / Yostar에 있습니다. 개인 팬 프로젝트이며, 이 글에는 직접 렌더한 그림만 실었습니다.</span>
</footer>

</div>
