---
title: '부루마카이브 제작과정 #2'
date: 2026-10-31 16:00:00 +0900
categories: [Games, 부루마카이브]
description: 블루아카이브 게임개발부 다섯 명이 키보토스 보드 40칸을 도는 부루마블. 규칙서부터 쓴 10월 24일부터 온라인 QA를 돌린 10월 31일까지 8일의 제작 기록.
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
  <p class="lead">블루아카이브의 도시 키보토스에서 하는 부루마블입니다. 게임개발부 다섯 명이 말이 되어 보드 40칸을 돌고, 사람이 1~5명 들어오며 빈자리는 AI가 맡습니다. 2026년 10월 24일에 규칙서부터 쓰기 시작했고, 10월 31일에 온라인 QA를 돌렸습니다.</p>
  <figure>
    <img src="/assets/img/posts/buru-making-01.jpg" alt="판 가운데에 학원 여덟 곳의 건물과 지형이 모인 마름모꼴 보드 3D 렌더" width="1000" height="667">
    <figcaption>Blender 스크립트로 만든 판 가운데 디오라마. 칸 글자는 게임 안에서 그 위에 얹습니다.</figcaption>
  </figure>
  <div class="facts">
    <div><b>16,946줄</b><span>C# (테스트 3,742줄 포함)</span></div>
    <div><b>167개</b><span>EditMode 자동 테스트</span></div>
    <div><b>36개</b><span>그림·소리 제작 Python 도구 (6,933줄)</span></div>
    <div><b>238줄</b><span>온라인 중계 서버 (Node)</span></div>
  </div>
</header>

<section>
  <h2 id="docs-first">코드보다 문서 먼저</h2>
  <p>Unity 6에서 Claude Code와 함께 만들었습니다. 규칙을 바꿀 때는 언제나 같은 순서를 따랐습니다. 숫자는 설정 파일 한 곳에만 있어서, 보석금을 올리면 카드 설명까지 같이 바뀝니다.</p>
  <div class="flow" role="list">
    <div role="listitem"><b>규칙서</b><span>결정 목록과 각 절의 규칙</span></div>
    <div role="listitem"><b>데이터 표</b><span>모든 수치와 근거</span></div>
    <div role="listitem"><b>ConfigGame</b><span>코드가 읽는 유일한 값</span></div>
    <div role="listitem"><b>Flow 문서</b><span>코드 이름의 용어집</span></div>
    <div role="listitem"><b>코드·테스트</b><span>마지막에 맞춘다</span></div>
  </div>
  <p>규칙 엔진은 Unity에 묶이지 않은 순수 C#입니다. 같은 상태에 같은 행동을 넣으면 언제나 같은 결과가 나옵니다. 엔진이 사건 목록을 쌓으면 연출 큐가 순서를 정하고, 화면은 그걸 그리기만 합니다. 이 분리 덕분에 AI 200판 측정을 화면 없이 돌릴 수 있었고, 나중에 온라인도 얹을 수 있었습니다.</p>
</section>

<section>
  <h2 id="eight-days">8일의 기록</h2>
  <div class="days">
    <article class="day">
      <div class="date"><i>10월</i><b>24</b></div>
      <div>
        <h3>규칙 엔진에서 첫 화면까지</h3>
        <ul>
          <li>규칙서·데이터 표·Flow 문서와 규칙 엔진, 테스트 79개로 시작했습니다.</li>
          <li>44분 뒤 타이틀, 좌석 고르기, 대국 화면이 붙었습니다. 그림은 코드로 만든 도트 사각형이었습니다.</li>
          <li>주사위 연출, 합성 효과음, 칸 글꼴 교체, 배경음악, 음량 설정까지 이날 들어갔습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>25</b></div>
      <div>
        <h3>모노폴리 규칙과 그래픽</h3>
        <ul>
          <li>경매, 저당, 교통 칸 비례 통행료, 보석금, 파산 땅 넘기기, 균등 건설, 거래까지 규칙 7개를 더했습니다.</li>
          <li>화폐는 원에서 골드를 거쳐 청휘석이 됐습니다. 수치는 그대로 두고 이름만 바꿨습니다.</li>
          <li>보드 디오라마, 특별 칸 소품, 주사위 컷인, 대사 음성을 대량으로 넣었습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>26</b></div>
      <div>
        <h3>세계관 다듬기</h3>
        <ul>
          <li>무인도가 코우사기 공원 노숙에서 밀레니엄 반성실로 바뀌었습니다. 세미나에게 붙잡히면 코유키 카드가 뜹니다.</li>
          <li>돈을 벌거나 뺏길 때 뜨는 이모티콘과 GIF 컷인을 만들었습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>27</b></div>
      <div>
        <h3>브라우저에서 같이 하기</h3>
        <ul>
          <li>"다같이 부루마블 할때 할거니까"라는 결정으로 온라인을 붙였습니다. 웹 빌드, 중계 서버, 재접속, 선택당 30초 제한이 이때 들어갔습니다.</li>
        </ul>
      </div>
    </article>
    <article class="day">
      <div class="date"><i>10월</i><b>31</b></div>
      <div>
        <h3>QA, 그리고 고칠 것 목록</h3>
        <ul>
          <li>"토지만 가지면 건설"로 건설 규칙을 바꾸고, 독점 통행료 배수를 땅 ×1부터 빌딩 ×3까지로 나눴습니다.</li>
          <li>서버 1·2 선택, ESC 메뉴, 미도리 브이 영상 컷인을 넣었습니다.</li>
          <li>직접 해 보며 받아 적은 9개 항목을 한 번에 고쳤습니다. 아래에 자세히 적었습니다.</li>
        </ul>
      </div>
    </article>
  </div>
</section>

<section>
  <h2 id="art-as-code">그림도 코드로</h2>
  <p>3D 모델은 대부분 Blender 파이썬 스크립트가 만듭니다. 렌더 결과를 도구가 줄이고 잘라 Unity 폴더에 넣으면, 임포터가 도트 그림은 점 필터로, 컷인은 부드러운 필터로 읽습니다. 수정은 스크립트를 고치고 다시 돌리면 끝입니다.</p>
  <div class="pair">
    <figure>
      <img src="/assets/img/posts/buru-making-02.jpg" alt="초기 게임 화면의 보드. 판 가운데 지형이 지금보다 단순하다" loading="lazy" width="853" height="357">
      <figcaption>초기 판. 돈 단위가 아직 원이던 시기의 화면입니다.</figcaption>
    </figure>
    <figure>
      <img src="/assets/img/posts/buru-making-03.jpg" alt="현재 판 디오라마 렌더" loading="lazy" width="760" height="507">
      <figcaption>현재 판. 학원마다 건물 묶음이 따로 있습니다.</figcaption>
    </figure>
  </div>
  <figure>
    <img src="/assets/img/posts/buru-making-04.jpg" alt="주택, 유리 오피스텔, 원통형 타워 건물 세 채의 3D 렌더" loading="lazy" width="1000" height="333">
    <figcaption>건물 1·2·3단계. 게임에서는 32×64 도트로 렌더하고, 구름을 일으키며 솟는 설치 애니메이션 24장(64×64)을 붙입니다.</figcaption>
  </figure>
  <figure>
    <div class="sprites">
      <img src="/assets/img/posts/buru-making-05.png" alt="도트 비행선" loading="lazy" width="128" height="96">
      <img src="/assets/img/posts/buru-making-06.png" alt="도트 기차" loading="lazy" width="128" height="128">
      <img src="/assets/img/posts/buru-making-07.png" alt="도트 주택" loading="lazy" width="32" height="64">
      <img src="/assets/img/posts/buru-making-08.png" alt="도트 타워" loading="lazy" width="32" height="64">
    </div>
    <figcaption>판 위를 움직이는 비행선과 기차, 칸 옆에 서는 건물. 모두 같은 방식으로 렌더한 도트입니다.</figcaption>
  </figure>
</section>

<section>
  <h2 id="server">서버는 규칙을 모릅니다</h2>
  <p>온라인은 행동 기록만 맞추는 방식(lockstep)입니다. 주사위 결과나 돈을 서버가 계산하지 않아서, 서버는 238줄로 끝났습니다.</p>
  <ol class="steps">
    <li>대국이 시작되면 서버가 시드 하나를 정해 모든 브라우저에 줍니다. 브라우저마다 같은 판을 만듭니다.</li>
    <li>내 행동도 바로 적용하지 않습니다. 서버로 보내고, 서버가 모두에게 돌려준 순서대로 적용합니다.</li>
    <li>AI 차례는 보내지 않습니다. 같은 상태에서 브라우저마다 같은 답을 계산합니다.</li>
    <li>행동마다 <code>step_index</code>를 붙입니다. 늦게 온 행동은 버리고, 아직 그 자리에 못 온 행동은 기다립니다. 그래서 연출 속도가 달라도 판이 어긋나지 않습니다.</li>
    <li>끊겼다 들어오면 같은 좌석을 돌려주고, 기록을 연출 없이 다시 적용해 따라잡습니다.</li>
  </ol>
</section>

<section>
  <h2 id="qa">QA가 찾아낸 것</h2>
  <h3 id="qa-ai-selling">AI가 초반에 땅을 파는 이유</h3>
  <p>"초반에 땅 파는 건 자살행위"라는 제보에서 시작했습니다. 코드를 보니 AI는 스스로 팔지 않고, 빚을 못 갚을 때만 팔았습니다. AI 5명 200판을 측정하니 빚 2,161건 중 2,073건(96%)이 통행료였습니다. 예비금 10,000청휘석만 남기고 건물을 3단계까지 몰아 짓다가, 15,000~96,000짜리 통행료를 만나 건물째 팔고 있었습니다.</p>
  <p>고친 뒤에는 건물을 지어도 일정 현금과 남의 땅 중 가장 비싼 통행료 중 더 큰 금액을 남깁니다. 그 금액을 바꿔 가며 다시 쟀습니다.</p>
  <figure>
    <div class="chart" role="img" aria-label="남길 현금별 5라운드까지 매각 건수. 10,000은 70건, 20,000은 68건, 30,000은 58건, 40,000은 34건, 50,000은 11건, 70,000은 0건">
      <div class="bar-row"><span>10,000</span><span class="bar-track"><span class="bar" style="width:78.0%"></span><span>70건</span></span></div>
      <div class="bar-row"><span>20,000</span><span class="bar-track"><span class="bar" style="width:75.8%"></span><span>68건</span></span></div>
      <div class="bar-row"><span>30,000</span><span class="bar-track"><span class="bar" style="width:64.6%"></span><span>58건</span></span></div>
      <div class="bar-row"><span>40,000</span><span class="bar-track"><span class="bar" style="width:37.9%"></span><span>34건</span></span></div>
      <div class="bar-row"><span>50,000</span><span class="bar-track"><span class="bar" style="width:12.3%"></span><span>11건</span></span></div>
      <div class="bar-row pick"><span>70,000</span><span class="bar-track"><span class="bar" style="width:0.0%"></span><span>0건</span></span></div>
    </div>
    <figcaption>건물을 지은 뒤 남길 최저 현금별, 5라운드까지 땅을 판 횟수 (200판 합계). 70,000을 골랐고, 전체 건설은 10,000일 때의 74%(5,653회)가 남았습니다.</figcaption>
  </figure>
  <h3 id="qa-others">그 밖의 항목</h3>
  <div class="cases-wrap">
    <table>
      <thead><tr><th>항목</th><th>문제</th><th>결과</th></tr></thead>
      <tbody>
        <tr><td>경매</td><td>토지값의 0.5·0.75·1·1.25배만 부를 수 있어 눈치 싸움이 안 됐습니다.</td><td>현금 안에서 금액을 직접 타이핑합니다.</td></tr>
        <tr><td>땅 목록</td><td>버튼 4개까지만 보여 나머지는 고르기 어려웠습니다.</td><td>"다음 쪽" 버튼으로 전부 고릅니다. 건설·저당도 같습니다.</td></tr>
        <tr><td>AI 거래</td><td>케이가 항구를 같은 24,000에 계속 사려고 했습니다.</td><td>거절될 때마다 30,000, 36,000으로 올리고, 7번 거절되면 그만둡니다.</td></tr>
        <tr><td>게임개발부 칸</td><td>개발비만 내는 칸이었습니다.</td><td>먼저 온 사람과 만나면 주사위 맞다이로 10,000을 뺏습니다.</td></tr>
        <tr><td>금액 조정</td><td>보석금 1,700, 생텀 타워 통행료 67,000, 크로니클 카드 330.</td><td>보석금 10,000, 통행료 20,000, 카드는 한 명당 10,000.</td></tr>
        <tr><td>ESC</td><td>키가 없었고, 설정을 열면 내 브라우저만 멈춰 전원이 기다릴 수 있었습니다.</td><td>ESC로 열고 닫으며, 온라인에서는 메뉴를 열어도 판이 계속 갑니다.</td></tr>
        <tr><td>온라인 입장</td><td>앞 판이 서버에 남아 누르자마자 그 판으로 들어갔습니다.</td><td>서버 1·2를 고르고, 사람이 다 나가면 초기화합니다. 연결만 끊겼으면 5초 기다립니다.</td></tr>
        <tr><td>미도리 컷인</td><td>9.37초 영상을 프레임으로 넣으면 약 249MB입니다 (계산값).</td><td>H.264 영상으로 틀어 3.1MB. 끝의 브이 포즈를 잠깐 잡아 둡니다.</td></tr>
        <tr><td>이모티콘</td><td>대국 중에 말을 걸 방법이 없었습니다.</td><td>6개 묶음 515개를 골라 내 프로필 옆에 띄웁니다. 온라인이면 모두에게 보입니다.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <h2 id="todo">아직 남은 일</h2>
  <ul class="steps">
    <li>주소가 임시 터널이라, 터널을 다시 켜면 바뀝니다.</li>
    <li>맞다이 연출과 땅 목록 쪽 넘기기는 자동 테스트만 거쳤고 화면으로는 아직 보지 못했습니다.</li>
    <li>여러 사람이 함께한 판의 이모티콘 표시도 더 해 봐야 합니다.</li>
  </ul>
</section>

<footer class="foot">
  <span>수치는 2026년 10월 31일 작업 폴더 기준입니다. 측정값은 AI 5명 자동 대국 200판(시드 1~200)입니다.</span>
  <span>블루아카이브의 캐릭터와 세계관 저작권은 NEXON Games / Yostar에 있습니다. 개인 팬 프로젝트이며, 이 글에는 직접 렌더한 그림만 실었습니다.</span>
</footer>

</div>
