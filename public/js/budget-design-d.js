// ════════════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 디자인 D안 (시안 브랜치 feature/nj-d)                              작성: 남주
//  budget-adjust-side.js · budget-flat-layers.js 뒤에 로드되어 덮어씁니다. 원본 파일은 고치지 않습니다.
//
//   · 프로젝트 메인: 그대로(왼쪽 예산 조정안 · 오른쪽 Agent와 대화)
//   · 계정 상세   : [예산 조정안 | Agent와 대화] 칸을 오른쪽 → 왼쪽으로. 오른쪽이 상세 예산내역.
//                   왼쪽에서 [반영]을 누르면 바로 오른쪽 위 계정 탭 금액 · 아래 표가 바뀌는 게 한 시선에 보임.
//                   상세로 들어오면 왼쪽 칸은 「예산 조정안」 탭부터.
//   · 위 요약     : 왼쪽 = 지금 수립 → 반영 시(아래 왼쪽 칸과 같은 폭), 오른쪽 = 계정 5개를 폴더 탭으로.
//                   고른 계정 탭은 흰 종이처럼 바로 아래 상세 카드와 이어짐(위아래가 따로 놀지 않게).
//   · 왼쪽 칸 폭은 고정(2026.11.26) — 표 자리의 37%, 「지금 수립 → 반영 시」 숫자가 줄지 않는 폭 이상, 560px 이하.
//     경계선 끌기 · 더블클릭은 없앰. 접기 · 펴기([«] 버튼)는 그대로.
// ════════════════════════════════════════════════════════════════════════════════

var DD_SIDE = { min: 360, def: 490, max: 600, ratio: 0.37, cap: 560 };
var ddSideW = (function () { try { return Number(localStorage.getItem('dd-side-w')) || 0; } catch (e) { return 0; } })();
// 프로젝트 메인의 오른쪽(Agent와 대화) 폭 — 0 = 반반. 끌어서 바꾸면 따로 기억(계정 상세 왼쪽 칸 폭과 별개)
var ddMainW = (function () { try { return Number(localStorage.getItem('dd-main-w')) || 0; } catch (e) { return 0; } })();
// [2026.11.26] 폭 고정 — 예전에 끌어서 저장해 둔 폭은 쓰지 않음(메인 = 반반, 계정 상세 = 고정 폭)
ddSideW = 0; ddMainW = 0;
function ddSave() {
  try { localStorage.setItem('dd-side-w', String(ddSideW || 0)); localStorage.setItem('dd-main-w', String(ddMainW || 0)); }
  catch (e) { /* 저장 막힘 */ }
}

// 「지금 수립 → 반영 시」가 실제로 차지하는 폭 — 반영해서 숫자가 생겨도 탭에 겹치지 않게 칸이 이보다 좁아지지 않음
//   (반영 전에도 「반영 시」 자리는 visibility 로 잡혀 있어 반영 전후 폭이 같음)
function ddFigNeed() {
  var figs = document.querySelector('#s-budget .agent-ga .agai-top:not(.compact) .agai-figs');
  if (!figs) return 0;
  var rg = document.createRange();
  // 칸 폭이 아니라 글자가 실제로 차지하는 폭 — 글자 조각(텍스트 노드)들의 왼쪽 끝 ~ 오른쪽 끝 + 칸 안쪽 여백
  var textW = function (el) {
    if (!el || getComputedStyle(el).display === 'none') return 0;
    var cs = getComputedStyle(el), l = Infinity, r = -Infinity, tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      if (!tw.currentNode.nodeValue.trim()) continue;
      rg.selectNodeContents(tw.currentNode);
      var b = rg.getBoundingClientRect();
      if (b.width) { l = Math.min(l, b.left); r = Math.max(r, b.right); }
    }
    return (r > l ? r - l : 0) + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  };
  // 「반영 시」 칸은 반영 전엔 숨어 있어 글자 폭이 다름 → 「지금 수립」 칸 폭으로 두 칸 자리를 미리 잡음
  //   (반영 시 숫자는 지금 수립과 자릿수가 같고 뒤에 「원」 · 라벨이 조금 더 길 수 있어 20% 여유)
  //   → 반영해도 칸 폭이 그대로라 탭이 움직이지 않음
  var now = textW(figs.querySelector(':scope > .agai-fig:not(.after):not(.idle)'));
  var arrow = textW(figs.querySelector(':scope > .agai-arrow'));
  var aft = figs.querySelector(':scope > .agai-fig.after:not(.idle)');
  var later = Math.max(now * 1.2, aft ? textW(aft) : 0);
  return now ? Math.ceil(now + arrow + later) + 20 : 0;
}
// 글꼴이 늦게 들어와 숫자 폭이 바뀌면 다시 맞춤
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { try { b2cPaint(); } catch (e) { /* Agent 화면이 아니면 무시 */ } });
}

// 왼쪽 칸 폭(계정 상세) — 위 요약의 「지금 수립 → 반영 시」 칸도 같은 폭을 씀(--dd-side)
//   경계선으로 자유롭게 조절(최소 280px). 기본 폭만 숫자가 다 들어가는 폭 이상으로 잡음
//   [2026.11.26] 고정 폭: 표 자리 × 37%(560px 이하) — 단, 「지금 수립 → 반영 시」 숫자가 줄지 않는 폭(need)보다 좁아지지 않음.
//   1600px ≈ 538 : 858, 1366px ≈ 435 : 727, 1920px ≈ 560 : 1156 (예산 조정안 : 예산내역)
function ddSideWidth(g) {
  var gw = g ? g.clientWidth : 1200;
  var max = Math.max(B2C_MIN.side, gw - B2C_MIN.main - 14);
  var need = Math.ceil(ddFigNeed() / ddFigK()) - 14;   // 칸 사이 간격(14px)만큼은 숫자 칸이 더 넓음
  var w = Math.min(Math.round(gw * DD_SIDE.ratio), DD_SIDE.cap);
  return Math.min(Math.max(w, need, B2C_MIN.side), max);
}
// 칸을 숫자보다 좁게 끌면 「지금 수립 → 반영 시」 전체를 그 폭에 맞춰 줄임(zoom) — 겹치지 않고 탭 줄도 그대로
function ddFigK() {
  var ga = document.querySelector('#s-budget .agent-ga');
  var k = ga ? parseFloat(ga.style.getPropertyValue('--dd-fig-k')) : NaN;
  return k > 0 ? k : 1;
}
function ddFigScale(g, w) {
  var gap = g ? (parseFloat(getComputedStyle(g).columnGap) || 0) : 14;
  var base = ddFigNeed() / ddFigK();                   // 줄이기 전(배율 1) 기준 필요한 폭
  // [2026.11.24] 위 요약이 작은 줄(compact — 아래로 스크롤한 상태)이면 숫자를 잴 수 없음(0) → 배율을 1로 되돌리지 말고 지금 값 유지.
  //   (아래로 내려 표에 입력 → 저장하면 이때 다시 그려져 배율이 1이 되고, 위로 올라오면 커진 숫자가 오른쪽 계정 탭 밑으로 깔리던 문제)
  if (!base) return ddFigK();
  return Math.max(0.55, Math.min(1, Math.floor((w + gap) / base * 100) / 100));
}

var ddRecheckQueued = false;
// 위 요약 줄은 따로 다시 그려지기도 하고 글꼴이 늦게 들어오면 숫자 폭이 나중에 커짐
//   → 화면이 바뀔 때마다(프레임당 한 번) 필요한 폭 · 배율이 지금 값과 다르면 다시 맞춤
function ddSyncSide() {
  var ga = document.querySelector('#s-budget .agent-ga'), g = b2cGrid();
  if (!ga || !g || typeof b2cPaint !== 'function') return;
  var w = ddSideWidth(g);
  var want = (w + (parseFloat(getComputedStyle(g).columnGap) || 0)) + 'px';
  if (ga.style.getPropertyValue('--dd-side') !== want || Math.abs(ddFigScale(g, w) - ddFigK()) > 0.015) b2cPaint(g);
}
(function ddWatch() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var q = false;
  var mo = new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { ddSyncSide(); } catch (e) { /* 무시 */ } }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { try { ddSyncSide(); } catch (e) { /* 무시 */ } });
  // [2026.11.24] 위 요약이 작은 줄 ↔ 큰 줄로 바뀌는 건 class만 바뀌어 위 감시자가 못 봄 → 스크롤할 때도 (프레임당 한 번) 다시 맞춤
  var qs = false;
  window.addEventListener('scroll', function () { if (qs) return; qs = true; requestAnimationFrame(function () { qs = false; try { ddSyncSide(); } catch (e) { /* 무시 */ } }); }, { passive: true });
})();
if (typeof b2cPaint === 'function') {
  var ddPaintBefore = b2cPaint;
  b2cPaint = function (g, side) {
    ddPaintBefore.apply(this, arguments);
    g = g || b2cGrid(); side = side || (g && g.querySelector(':scope > .b2c-side'));
    var ga = document.querySelector('#s-budget .agent-ga');
    if (!ga) return;
    var detail = !!g && !b2cIsMain(g);
    ga.classList.toggle('dd-detail', detail);
    var gap = g ? (parseFloat(getComputedStyle(g).columnGap) || 0) : 14;
    var w = ddSideWidth(g);
    ga.style.setProperty('--dd-side', (w + gap) + 'px');
    ga.style.setProperty('--dd-fig-k', String(ddFigScale(g, w)));
    // 처음 그릴 땐 숫자가 아직 자리를 잡기 전이라 폭이 덜 나올 수 있음 → 그린 직후 한 번 더 재서 다르면 다시 맞춤
    if (!ddRecheckQueued) {
      ddRecheckQueued = true;
      requestAnimationFrame(function () {
        ddRecheckQueued = false;
        var g2 = b2cGrid();
        if (g2 && ddSideWidth(g2) !== w) b2cPaint(g2);
      });
    }
    if (!side || b2cNarrow()) return;
    // 프로젝트 메인: 기본은 예산 조정안 | Agent와 대화 반반. 경계선을 끌었으면 그 폭
    if (!detail) {
      if (b2cState.fold) return;
      var mmax = Math.max(B2C_MIN.side, g.clientWidth - gap - B2C_MIN.main);
      g.style.setProperty('grid-template-columns', ddMainW
        ? 'minmax(' + B2C_MIN.main + 'px,1fr) ' + Math.min(Math.max(ddMainW, B2C_MIN.side), mmax) + 'px'
        : 'minmax(0,1fr) minmax(0,1fr)', 'important');
      return;
    }
    var cw = b2cState.fold ? B2C_MIN.rail : w;
    g.style.setProperty('grid-template-columns', cw + 'px minmax(' + B2C_MIN.main + 'px,1fr)', 'important');
  };
}

// 메인 → 계정 상세로 들어오면 왼쪽 칸은 「예산 조정안」 탭부터(반영하며 오른쪽 표 변화를 보게)
if (typeof b2cApply === 'function') {
  var ddApplyBefore = b2cApply;
  b2cApply = function () {
    var prev = b2cLastMode;
    var r = ddApplyBefore.apply(this, arguments);
    // [2026.11.26] 처음 계정 탭을 눌러 들어오면 예산 조정안 칸도 펼친 채로(전에 접어 둔 상태가 남아 있어도)
    if (prev === 'main' && b2cLastMode === 'detail' && (b2cState.tab !== 'todo' || b2cState.fold)) {
      b2cState.tab = 'todo'; b2cState.fold = false;
      if (typeof b2cSave === 'function') b2cSave();
      b2cPaint();
    }
    return r;
  };
}

// [2026.11.26] 폭 고정 — 경계선 끌기 · 더블클릭(기본 폭) 없앰. 아래 예전 끌기 코드는 남겨 두지만 쓰지 않음(DD_FIXED=false 로 바꾸면 다시 끌림)
var DD_FIXED = true;
if (typeof b2cSplitStart === 'function') {
  var ddSplitBefore = b2cSplitStart;
  b2cSplitStart = function (ev) {
    if (DD_FIXED) return;
    var g = b2cGrid();
    var side = g && g.querySelector(':scope > .b2c-side');
    if (!g || !side || b2cNarrow()) return ddSplitBefore.apply(this, arguments);
    var main = b2cIsMain(g);
    ev.preventDefault();
    var x0 = ev.clientX, w0 = side.getBoundingClientRect().width;
    document.body.classList.add('b2c-resizing');
    var move = function (e) {
      // 메인은 칸이 오른쪽(왼쪽으로 끌면 넓어짐), 계정 상세는 칸이 왼쪽(오른쪽으로 끌면 넓어짐)
      var w = main ? w0 - (e.clientX - x0) : w0 + (e.clientX - x0);
      if (w < B2C_MIN.fold) b2cState.fold = true;
      else if (main) { b2cState.fold = false; ddMainW = Math.round(Math.max(w, B2C_MIN.side)); }
      else { b2cState.fold = false; ddSideW = Math.round(Math.max(w, B2C_MIN.side)); }
      b2cPaint(g, side);
    };
    var up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.classList.remove('b2c-resizing');
      ddSave(); b2cSave();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
}
if (typeof b2cSplitReset === 'function') {
  var ddResetBefore = b2cSplitReset;
  b2cSplitReset = function () {
    if (DD_FIXED) return;
    var g = b2cGrid();
    if (!g) return ddResetBefore.apply(this, arguments);
    if (b2cIsMain(g)) ddMainW = 0; else ddSideW = 0;      // 메인 = 반반, 계정 상세 = 기본 폭
    ddSave(); b2cState.fold = false; b2cSave(); b2cPaint();
  };
}

(function ddInjectStyle() {
  if (typeof document === 'undefined' || document.getElementById('dd-style')) return;
  var st = document.createElement('style');
  st.id = 'dd-style';
  // 기존 접힌 상태(.compact) 규칙보다 이기도록 같은 클래스를 겹쳐 우선순위를 올림
  var T = '#s-budget .agent-ga.agent-ga .agai-top.agai-top';
  var G = '#s-budget .agent-ga.dd-detail .agga-grid.b2c-on.detail';
  st.textContent = [
    // ── 계정 상세: 왼쪽 칸 ↔ 오른쪽 상세 자리 바꾸기 ──
    G + ' > .b2c-side{grid-column:1 !important;grid-row:1}',
    G + ' > .agga-col.detail{grid-column:2 !important;grid-row:1}',
    G + ' > .b2c-side .b2c-split{left:auto !important;right:-12px !important}',
    // [2026.11.26] 폭 고정 — 경계선(끌기 손잡이) 숨김. 접기 · 펴기 버튼은 그대로
    '#s-budget .agent-ga .agga-grid.b2c-on .b2c-split{display:none !important}',
    G + ' > .b2c-side .b2c-fold svg{transform:rotate(180deg)}',
    //   상세 카드: 위 탭과 이어지도록 위 모서리 각지게
    G + ' > .agga-col.detail{border-radius:0 0 8px 8px !important;border:1px solid #dde2e9 !important}',

    // ── 예산 조정안 카드: 출처(Agent 제안 · 수기 입력 · 대화로 추가)를 접힌 카드 첫 줄에도 늘 표시 ──
    //   (원래는 [자세히]로 펼쳐야 보였음) 계정 · 출처는 줄지 않고, 길면 「반영 후 CP 여유」 쪽이 말줄임
    '#s-budget .agent-ga .agga-grid.b2c-on .b2c-side .agga-card .agai-tag{display:inline-flex !important;flex:0 0 auto;white-space:nowrap;align-items:center}',
    '#s-budget .agent-ga .agga-grid.b2c-on .b2c-side .agga-card .agai-tag.agent{color:#3730a3 !important;font-weight:700 !important}',
    //   「반영 후 CP 여유 ○억」 · 「총액 변동 없음」 · 「재료비 → 외주비」는 숨기고, CP 한도를 넘을 때만 빨간 경고로
    //   (출처 표시와 한 줄에 있어 빽빽함 — budget-adjust-side.js b2cImpacts 는 그대로, 보이는 것만 줄임)
    '#s-budget .agent-ga .agga-card .agga-head .b2c-imp:not(.over){display:none !important}',
    '#s-budget .agent-ga .agga-card .agga-head .b2c-imp.over{font-weight:800 !important}',
    '#s-budget .agent-ga .agga-grid.b2c-on .b2c-side .agga-card .agai-tag.manual,#s-budget .agent-ga .agga-grid.b2c-on .b2c-side .agga-card .agai-tag.sim{font-size:11.5px !important;padding:1px 6px !important}',

    // ── 위 요약: 카드 테두리를 없애고 [지금 수립 → 반영 시 | 계정 탭] 두 칸 ──
    T + '{border:0 !important;border-radius:0 !important;box-shadow:none !important;background:#fff !important;padding:0 !important;margin-bottom:14px !important}',
    '#s-budget .agent-ga.dd-detail .agai-top.agai-top{margin-bottom:0 !important}',
    T + ' .agai-top-line{padding:2px 2px 8px !important;margin:0 !important}',
    T + ' .agai-figs{display:grid !important;grid-template-columns:auto auto minmax(0,1fr) calc(100% - var(--dd-side,454px)) !important;align-items:end !important;column-gap:0 !important;margin:0 !important;padding:0 !important;border:0 !important}',
    T + ' .agai-figs > .agai-fig{padding:0 0 14px !important;min-width:0}',
    T + ' .agai-figs > .agai-fig b{font-size:28px !important;white-space:nowrap;letter-spacing:-.3px}',
    T + ' .agai-figs > .agai-fig > span{font-size:13.5px !important;font-weight:700 !important;color:#334155 !important}',
    T + ' .agai-figs > .agai-fig > em{font-size:14px !important;font-weight:800 !important}',
    T + ' .agai-figs > .agai-fig b i{font-size:14px !important}',
    T + ' .agai-figs > .agai-arrow{padding:0 8px 26px !important;font-size:20px !important}',
    T + ' .agai-figs > .agai-accts{grid-column:4 !important}',
    //   왼쪽 칸을 좁히면 숫자 묶음 전체를 같은 비율로 줄임(--dd-fig-k, 0.55~1)
    T + ':not(.compact) .agai-figs > .agai-fig, ' + T + ':not(.compact) .agai-figs > .agai-arrow{zoom:var(--dd-fig-k,1)}',
    //   계정 탭
    T + ' .agai-accts{display:flex !important;gap:4px !important;align-items:flex-end !important;align-self:end !important;margin:0 !important;padding:0 !important;border:0 !important;background:transparent !important;box-shadow:none !important}',
    T + ' .agai-accts .agai-acct{flex:1 1 0 !important;min-width:0 !important;display:flex !important;flex-direction:column !important;align-items:flex-start !important;justify-content:flex-start !important;gap:2px !important;text-align:left !important;'
      + 'padding:10px 16px 10px !important;border:1px solid #dde2e9 !important;border-bottom:0 !important;border-radius:8px 8px 0 0 !important;background:#eef0f3 !important;box-shadow:none !important;opacity:1 !important;min-height:0 !important;position:relative;cursor:pointer}',
    T + ' .agai-accts .agai-acct::after{display:none !important}',
    T + ' .agai-accts .agai-acct:hover{background:#e4e8ed !important}',
    T + ' .agai-accts .agai-acct em{font-size:14px !important;font-weight:800 !important;color:#1c2432 !important;padding:0 !important}',
    T + ' .agai-accts .agai-acct b{display:block !important;font-size:22px !important;font-weight:800 !important;color:#1c2432 !important;font-variant-numeric:tabular-nums;white-space:nowrap}',
    T + ' .agai-accts .agai-acct > span{display:block !important;min-height:18px;font-size:13px !important;font-weight:700}',
    T + ' .agai-accts .agai-acct .agai-viewing{display:none !important}',
    //   고른 계정 탭 = 흰 종이 + 계정 색 윗선, 아래 카드 테두리를 1px 덮어 하나로 이어짐
    T + ' .agai-accts .agai-acct.on{background:#fff !important;top:1px;padding-bottom:11px !important;z-index:2;box-shadow:none !important;border-color:#c9ced6 !important;padding-top:14px !important;margin-top:-6px !important}',
    //   [2026.11.24] 고른 계정 = 흰 폴더가 살짝 올라와 아래 패널과 이어짐(색 윗선 없음 — 아래 세부 탭 밑줄과 선이 두 겹 되지 않게).
    //   안 고른 계정 = 한 단계 어두운 회색 칸 + 진한 회색 이름 · 금액(대비 6.2 — 읽기는 편하고 고른 칸의 검정만 튀게). 계정색은 이름 앞 점에만
    T + ' .agai-accts .agai-acct:not(.on){background:#e6e9ee !important}',
    T + ' .agai-accts .agai-acct:not(.on) em{color:#4b5563 !important;font-weight:600 !important}',
    T + ' .agai-accts .agai-acct:not(.on) b{color:#4b5563 !important;font-weight:700 !important}',
    T + ' .agai-accts .agai-acct.on em, ' + T + ' .agai-accts .agai-acct.on b{color:#1c2432 !important}',
    //   프로젝트 메인(아직 계정을 안 고름): 아래가 열린 탭이 떠 보이지 않게 테두리 다 있는 흰 카드로. 누르면 탭으로 열림
    '#s-budget .agent-ga.agent-ga:not(.dd-detail) .agai-top.agai-top .agai-accts{gap:10px !important}',
    '#s-budget .agent-ga.agent-ga:not(.dd-detail) .agai-top.agai-top .agai-accts .agai-acct{background:#fff !important;border-bottom:1px solid #dde2e9 !important;border-radius:8px !important;padding-bottom:10px !important}',
    '#s-budget .agent-ga.agent-ga:not(.dd-detail) .agai-top.agai-top .agai-accts .agai-acct:hover{background:#f7f8fa !important;border-color:#c5ccd6 !important}',
    '#s-budget .agent-ga.agent-ga:not(.dd-detail) .agai-top.agai-top .agai-figs > .agai-fig{padding-bottom:4px !important}',
    '#s-budget .agent-ga.agent-ga:not(.dd-detail) .agai-top.agai-top .agai-figs > .agai-arrow{padding-bottom:12px !important}',

    // ── 스크롤해서 위에 붙은 상태: 탭 줄만 남기고, 왼쪽엔 프로젝트명 ──
    T + '.compact{display:block !important;padding:8px 0 0 !important;position:sticky}',
    T + '.compact .agai-ctitle{position:absolute !important;left:2px;bottom:12px;max-width:calc(var(--dd-side,454px) - 24px) !important}',
    T + '.compact .agai-figs{grid-template-columns:var(--dd-side,454px) minmax(0,1fr) !important}',
    T + '.compact .agai-figs > .agai-accts{grid-column:2 !important}',
    T + '.compact .agai-accts .agai-acct{padding:8px 14px !important}',
    T + '.compact .agai-accts .agai-acct b{font-size:15px !important}',
    T + '.compact .agai-accts .agai-acct > span{display:none !important}',
    T + '.compact .agai-accts .agai-acct em::before{display:inline-block !important}',
    T + '.compact .agai-accts .agai-acct em{font-size:12.5px !important}',
    T + '.compact .agai-accts .agai-acct.up b::after{content:"▲";color:#d1242f;font-size:10px;margin-left:4px}',
    T + '.compact .agai-accts .agai-acct.down b::after{content:"▼";color:#1d5bd8;font-size:10px;margin-left:4px}',
    // ── 좁은 화면(1366px 노트북): 「지금 수립 → 반영 시」가 탭에 닿지 않고, 계정 금액이 탭 안에 들어가게 (위 규칙보다 뒤에 둬야 이김) ──
    '@media (max-width:1500px){'
      + T + ' .agai-figs > .agai-fig b{font-size:22px !important}'
      + T + ' .agai-figs > .agai-arrow{padding:0 6px 20px !important}}',
    // ── 계정 탭 글씨는 탭 줄 폭에 맞춰 늘고 줄어듦(cqi = 탭 줄 폭의 1%) ──
    //   왼쪽 칸을 넓혀 탭이 좁아져도 금액이 넘치거나 깨지지 않게. 탭 한 칸 ≈ 줄 폭의 20%라
    //   금액(11자리) 폭 ≈ 글씨 6.6배 + 좌우 여백 → 글씨 = 3cqi − 6px (13~22px 사이)
    T + ' .agai-figs > .agai-accts{container-type:inline-size}',
    T + ' .agai-accts .agai-acct{padding-left:clamp(8px, 1.2cqi, 16px) !important;padding-right:clamp(6px, 1cqi, 16px) !important}',
    T + ':not(.compact) .agai-accts .agai-acct b{font-size:clamp(13px, calc(3cqi - 6px), 22px) !important}',
    T + ':not(.compact) .agai-accts .agai-acct em{font-size:clamp(12px, calc(1.4cqi + 3px), 14px) !important}',
    T + ':not(.compact) .agai-accts .agai-acct > span{font-size:clamp(11px, calc(1.8cqi - 1px), 13px) !important}',
    T + '.compact .agai-accts .agai-acct b{font-size:clamp(12px, calc(2.4cqi - 5px), 15px) !important}',
    //   그래도 모자라면(아주 좁을 때) 끝을 「…」로 — 옆 탭으로 넘치지 않게
    T + ' .agai-accts .agai-acct em, ' + T + ' .agai-accts .agai-acct b, ' + T + ' .agai-accts .agai-acct > span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();

// ── [2026.11.19] 팝업의 [닫음] · [닫기] 버튼 없애기 — 오른쪽 위 ✕ 와 같은 일을 하는 버튼이 두 개라 하나로 ──
//   수행원가 화면(#s-budget)에 떠 있는 팝업만, 그리고 그 팝업 안에 ✕ 버튼이 따로 있을 때만 숨깁니다
//   (✕ 가 없는 팝업은 닫을 방법이 없어지므로 그대로). 버튼만 숨기고 남은 줄이 비면 그 줄도 숨김.
//   팝업 코드는 여러 공유 파일에 흩어져 있어 고치지 않고, 그려진 뒤 화면에서 찾아 숨깁니다.
// ✕ 버튼 — 글자 ✕ · × 이거나, 글자 없이 아이콘만 있고 이름(aria-label · title · class)이 닫기 · close · x 인 것
function ddIsX(b) {
  var t = (b.textContent || '').replace(/\s+/g, '');
  if (t === '✕' || t === '×' || t === 'X' || t === 'x') return true;
  if (t) return false;
  var name = (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.className && b.className.baseVal !== undefined ? b.className.baseVal : (b.className || ''));
  return /닫기|닫음|close|(^|[\s_-])x($|[\s_-])/i.test(name);
}
// 팝업 = 화면 위에 고정으로 떠 있는 겹창(position:fixed) — 버튼에서 위로 올라가며 처음 만나는 것
function ddPopOf(b) {
  for (var el = b.parentElement; el && el !== document.body; el = el.parentElement) {
    if (getComputedStyle(el).position === 'fixed') return el;
  }
  return null;
}
function ddHidePopClose() {
  if (!document.querySelector('#s-budget.active')) return;
  var btns = document.querySelectorAll('button');
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    if (b.getAttribute('data-dd-close') === '1') continue;
    var t = (b.textContent || '').replace(/\s+/g, '');
    if (t !== '닫음' && t !== '닫기') continue;
    if (b.closest('#setup-guide-overlay')) continue;             // 팀 그라운드 룰 팝업은 화면 밖 공용 팝업
    var pop = ddPopOf(b);
    if (!pop) continue;
    // ✕ 가 같은 팝업 안에 있어야 함
    var hasX = Array.prototype.some.call(pop.querySelectorAll('button'), function (x) { return x !== b && ddIsX(x); });
    if (!hasX) continue;
    b.setAttribute('data-dd-close', '1');
    b.style.setProperty('display', 'none', 'important');
    var row = b.parentElement;
    if (row && row !== pop) {
      // 줄에 다른 버튼 · 글자가 남아 있으면 줄은 그대로(팝업이 아직 안 보일 때도 판단되도록 화면 표시 대신 내용으로 봄)
      var left = Array.prototype.some.call(row.children, function (c) {
        return c !== b && c.getAttribute('data-dd-close') !== '1' && c.style.display !== 'none' && (c.tagName === 'BUTTON' || (c.textContent || '').trim());
      }) || Array.prototype.some.call(row.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
      if (!left) row.style.setProperty('display', 'none', 'important');
    }
  }
}
(function ddWatchPopClose() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var q = false;
  var mo = new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { ddHidePopClose(); } catch (e) { /* 무시 */ } }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); ddHidePopClose(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

// ── [2026.11.19] 화면 정리 — 겹치는 숫자 · 가끔 쓰는 버튼 덜어 내기(디자인시안_7) ──────────────────────
//   ① 계정 상세 제목 옆 「실적(확정) ○원 · CP 승인액 ○원」 문구 → 숨기고 제목에 마우스를 올리면 보임
//   ② 가끔 쓰는 버튼 → [⋯] 메뉴로: 예산 조정안 [전부 해제] / 계정 상세 [전체 펼치기] · [엑셀 다운로드] · 맨 위 [이력](계정 상세에서만)
//   ③ 인력 투입 일정(막대그래프) → 기본 접힘, [▸ 인력 투입 일정 펼치기]로 열기(펼침 여부 기억)
//   ④ 예산 조정안 상태 탭 [전체] [검토 대기] [반영] → ☐ 반영한 것만 보기 + 「검토 대기 N · 반영 N」
//   원래 버튼 · 탭은 지우지 않고 숨긴 채 두고, 새 버튼이 그것을 대신 눌러 줌(동작 · 엑셀 · 이력 팝업은 원래 그대로)
var ddGanttOpen = (function () { try { return localStorage.getItem('dd-gantt') === '1'; } catch (e) { return false; } })();
var ddMoreSeq = 0;
var DD_DETAIL_MORE = false;   // [2026.11.27] 계정 상세 [⋯ 더보기] 안 씀 — 버튼을 꺼내 둠
function ddHideEl(el, key) {
  if (!el) return;
  if (el.getAttribute('data-dd-more') !== key) el.setAttribute('data-dd-more', key);
  if (!el.getAttribute('data-dd-key')) el.setAttribute('data-dd-key', 'k' + (++ddMoreSeq));
  if (el.style.getPropertyValue('display') !== 'none') el.style.setProperty('display', 'none', 'important');
}
function ddSimplify() {
  var ga = document.querySelector('#s-budget .agent-ga');
  if (!ga) return;
  var detail = ga.querySelector('.agga-col.detail');
  // ① 제목 옆 문구 → 제목 툴팁
  if (detail) {
    var sub = detail.querySelector('.agga-col-head .agga-dsub');
    var tt = detail.querySelector('.agga-col-head > strong');
    if (sub && tt && tt.title !== sub.textContent.trim()) { tt.title = sub.textContent.trim(); tt.style.cursor = 'help'; }
  }
  // ② 예산 조정안 [전부 해제]는 [⋯]에 숨기지 않고 그대로 둠(2026.11.20 — [전부 반영] 옆에 바로 보이는 게 낫다)
  // ⑤ 예산 조정안 카드 — 간결하게 + 근거 한 줄(디자인시안_13)
  ga.querySelectorAll('.agga-col.todo .agga-card').forEach(ddCardTidy);
  ga.querySelectorAll('.agai-tag').forEach(ddTagLabel);   // 계정 상세 반영 목록 등 다른 곳의 태그도 같은 이름
  ddManualFirst(ga);
  // ② 계정 상세 [전체 펼치기] · [엑셀 다운로드] · 맨 위 [이력] → [⋯ 더보기]
  //   [2026.11.27] [⋯ 더보기]에 숨기지 않고 원래 버튼(전체 펼치기 · 엑셀 다운로드 · 이력)을 그대로 꺼내 둠(사용자 요청).
  //   예전 동작은 남겨 둠 — DD_DETAIL_MORE 를 true 로 바꾸면 다시 [⋯ 더보기]로 모음
  if (!DD_DETAIL_MORE) {
    ga.querySelectorAll('[data-dd-more="detail"]').forEach(function (el) { el.removeAttribute('data-dd-more'); el.style.removeProperty('display'); });
    ga.querySelectorAll('.dd-more[data-for="detail"]').forEach(function (el) { el.remove(); });
  } else if (detail) {
    var body = detail.querySelector('.agga-col-body.detail') || detail;
    var xls = Array.prototype.filter.call(body.querySelectorAll('button'), function (b) { return /엑셀/.test(b.textContent); });
    var xp = body.querySelector('.aglb-xpand-btn');
    var hidden = [];
    if (xp) { ddHideEl(xp, 'detail'); hidden.push(xp); }
    xls.forEach(function (b) { ddHideEl(b, 'detail'); hidden.push(b); });
    var hist = ga.querySelector('.agai-hist');
    if (hist) ddHideEl(hist, 'detail');
    var anchor = hidden[hidden.length - 1];
    if (anchor && !anchor.parentNode.querySelector(':scope > .dd-more[data-for="detail"]')) {
      var mm = document.createElement('button');
      mm.type = 'button'; mm.className = 'dd-more wide'; mm.setAttribute('data-for', 'detail');
      mm.setAttribute('onclick', "ddMoreOpen(this,'detail')"); mm.title = '전체 펼치기 · 엑셀 다운로드 · 이력';
      mm.textContent = '⋯ 더보기';
      anchor.parentNode.insertBefore(mm, anchor.nextSibling);
    }
  } else {
    var h2 = ga.querySelector('.agai-hist[data-dd-more]');     // 프로젝트 메인에서는 [이력] 그대로
    if (h2) { h2.removeAttribute('data-dd-more'); h2.style.removeProperty('display'); }
  }
  // ③ 인력 투입 일정 접기
  ga.querySelectorAll('.agga-col.detail .aglg').forEach(function (g) {
    var bar = g.previousElementSibling;
    if (!bar || !bar.classList.contains('dd-gantt-tog')) {
      bar = document.createElement('button');
      bar.type = 'button'; bar.className = 'dd-gantt-tog'; bar.setAttribute('onclick', 'ddGanttToggle()');
      g.parentNode.insertBefore(bar, g);
    }
    var hd = g.querySelector('.aglg-head');
    var title = hd && hd.querySelector('b') ? hd.querySelector('b').textContent.trim() : '인력 투입 일정';
    var range = hd && hd.querySelector('span') ? hd.querySelector('span').textContent.trim() : '';
    var html = (ddGanttOpen ? '▾ ' + title + ' 접기' : '▸ ' + title + ' 펼치기') + (range ? '<span>' + range + '</span>' : '');
    if (bar.innerHTML !== html) bar.innerHTML = html;
    bar.setAttribute('aria-expanded', ddGanttOpen ? 'true' : 'false');
    if (ddGanttOpen) { if (g.style.getPropertyValue('display')) g.style.removeProperty('display'); }
    else if (g.style.getPropertyValue('display') !== 'none') g.style.setProperty('display', 'none', 'important');
  });
  // ④ 상태 탭 → 반영한 것만 보기
  ga.querySelectorAll('.bap-tabs').forEach(function (tabs) {
    var cnt = function (k) { var e = tabs.querySelector('.bap-tab.' + k + ' em'); return e ? e.textContent.trim() : '0'; };
    var on = typeof bapTodoFilter !== 'undefined' && bapTodoFilter === 'on';
    var row = tabs.nextElementSibling;
    if (!row || !row.classList.contains('dd-onlyon')) {
      row = document.createElement('label');
      row.className = 'dd-onlyon';
      row.innerHTML = '<input type="checkbox" onchange="ddOnlyOn(this.checked)"> <span>반영한 것만 보기</span><em></em>';
      tabs.parentNode.insertBefore(row, tabs.nextSibling);
    }
    var inp = row.querySelector('input');
    if (inp.checked !== on) inp.checked = on;
    var t = '검토 대기 ' + cnt('wait') + ' · 반영 ' + cnt('on');
    var em = row.querySelector('em');
    if (em.textContent !== t) em.textContent = t;
  });
  //   빈 목록 안내도 탭 이름([검토 대기]) 대신 체크 기준으로
  ga.querySelectorAll('.bap-empty').forEach(function (e) {
    if (/\[검토 대기\]에서/.test(e.textContent)) e.textContent = '반영한 조정안이 없습니다. 체크를 풀고 조정안의 [반영]을 눌러 주세요.';
  });
}
// ── [2026.11.20] 예산 조정안 카드 정리 — 정진 매니저(정보량) · 석완 매니저(근거는 간소하게, 궁금할 때만 펼치기) 의견 ──
//   근거를 3단계로: ① 카드에 늘 보이는 「근거 한 줄」(출처 꼬리표 + 핵심 숫자) ② [자세히 ▾] 펼치기(판단 이유 · 영향) ③ 원본 화면(다음 단계)
//   카드에서 덜어 낸 것: 「🤖 Agent 제안」 표시(거의 다 Agent라 — 직접 입력 표시는 그대로) · 날짜(제목에 마우스를 올리면) · [삭제](→ [⋯])
//   원래 버튼은 숨긴 채 두고 [⋯]가 대신 누름(삭제 확인 팝업 등 동작은 원래 그대로)
//   목업 데이터의 근거 한 줄 — Agent가 근거(evidence)에서 뽑아 줄 한 줄을 미리 적어 둠. 없는 제안은 판단 이유(why) 첫 문장으로
var DD_WHY_SHORT = {
  'ap-01': '확정 인력 2명 · 11.0MM 수신 (김도윤 P4 · 박서연 P3)',
  'ap-02': '설계 2명 투입 종료 10월 → 9월로 변경',
  'ap-03': '확정 견적 30,000,000원 · 가용 20,000,000원 → 10,000,000원 부족',
  'ap-04': '가용 10,300,000원 · 11~12월 필요 10,900,000원 → 600,000원 부족',
  'ap-05': '재료비 집행률 22% · 남은 기간 대비 10,000,000원 과다',
  'ap-06': '7~10월 미사용 13,000,000원 · 재수립 때 감액될 수 있음'
};
function ddWhySource(p) {                       // 근거 출처 꼬리표 — 어디서 온 신호인지
  if (p.manual || p.hand) return '직접';   // hand = 계정 상세에서 직접 등록 · 수정 · 삭제
  var t = String(p.trigger || '');
  if (/SCM/.test(t)) return 'SCM';
  if (/구매|견적|PO/.test(t)) return '구매';
  if (/ERP/.test(t)) return 'ERP';
  if (/마감/.test(t)) return '마감';
  if (/실적|추세/.test(t)) return '실적';
  if (/대화|지시/.test(t)) return '대화';
  return 'Agent';
}
function ddWhyLine(p) {
  if (DD_WHY_SHORT[p.id]) return DD_WHY_SHORT[p.id];
  if (p.short) return p.short;
  var s = String(p.why || '').split(/(?<=[.다])\s/)[0] || '';
  return s.length > 64 ? s.slice(0, 62) + '…' : s;
}
// [2026.11.24] 직접 입력(PM 수동 조정) 카드 — 공유 코드는 목록 끝에 붙여서, 카드가 많으면 스크롤해야 보였다.
//   → 직접 입력 카드는 늘 예산 조정안 목록 맨 위. 새로 생긴 순간엔 노란 바탕으로 몇 초 표시 + 목록을 맨 위로 + 안내 한 줄(40~50대 사용자가 놓치지 않게)
var DD_MANUAL_SEEN = null;   // 이미 본 직접 입력 카드 id (처음 그릴 때 있던 것은 새것으로 치지 않음)
var DD_MANUAL_NEW = {};      // id → 새로 생긴 시각(ms). 다시 그려져도 몇 초간 노란 표시 유지
function ddManualFirst(ga) {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined') return;
  var cards = Array.prototype.slice.call(ga.querySelectorAll('.agga-col.todo .agga-card'));
  var manual = cards.filter(function (c) {
    var id = ddCardId(c);
    var p = id && AGENT_PROPOSALS_FINAL.find(function (x) { return x.id === id; });
    return !!(p && (p.hand || p.manual));   // hand = 계정 상세에서 등록 · 수정 · 삭제 후 저장(✎ 수기 입력), manual = 수동 개입
  });
  // 맨 위로 — 같은 목록(부모) 안에서, 이미 맨 위에 순서대로 있으면 건드리지 않음(감시자가 다시 부르는 무한 반복 방지)
  var byParent = new Map();
  manual.forEach(function (c) { if (!byParent.has(c.parentNode)) byParent.set(c.parentNode, []); byParent.get(c.parentNode).push(c); });
  byParent.forEach(function (list, par) {
    var all = Array.prototype.filter.call(par.children, function (e) { return e.classList.contains('agga-card'); });
    var ok = list.every(function (c, i) { return all[i] === c; });
    if (ok) return;
    var anchor = all.find(function (e) { return list.indexOf(e) < 0; });   // 첫 번째 일반(Agent) 카드 앞에 직접 입력 카드를 순서대로
    if (anchor) list.forEach(function (c) { par.insertBefore(c, anchor); });
  });
  // 새로 생긴 카드 표시
  var first = DD_MANUAL_SEEN === null;
  if (first) DD_MANUAL_SEEN = new Set();
  var now = Date.now(), fresh = null, present = new Set();
  manual.forEach(function (c) {
    var id = ddCardId(c); present.add(id);
    if (!DD_MANUAL_SEEN.has(id)) { DD_MANUAL_SEEN.add(id); if (!first) { DD_MANUAL_NEW[id] = now; fresh = c; } }
    var isNew = DD_MANUAL_NEW[id] && now - DD_MANUAL_NEW[id] < 6000;
    if (isNew && !c.classList.contains('dd-new')) c.classList.add('dd-new');
  });
  DD_MANUAL_SEEN.forEach(function (id) { if (!present.has(id)) DD_MANUAL_SEEN.delete(id); });   // 지웠다가 다시 생기면 또 새것
  if (fresh) {
    try { fresh.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    if (typeof showToast === 'function') showToast('직접 고친 내용이 예산 조정안 맨 위에 추가됐습니다.');
  }
  if (!document.getElementById('dd-new-style')) {
    var st = document.createElement('style'); st.id = 'dd-new-style';
    st.textContent = '#s-budget .agent-ga .agga-col.todo .agga-card.dd-new{background:#fff6d6 !important;box-shadow:inset 4px 0 0 #e0a800 !important;animation:ddNewFade 6s ease forwards}'
      + '@keyframes ddNewFade{0%,60%{background:#fff6d6}100%{background:transparent}}';
    document.head.appendChild(st);
  }
}
function ddCardId(card) {
  var b = card.querySelector('.agga-why, .agai-yes, .agai-seg, .agga-del');
  var m = b && (b.getAttribute('onclick') || '').match(/'([^']+)'/);
  return m ? m[1] : '';
}
var DD_TAG_LABEL = { agent: '🤖 Agent 제안', sim: '💬 Agent 대화', manual: '✎ 수기 입력' };
function ddTagLabel(t) {
  if (!t) return;
  var k = ['sim', 'manual', 'agent'].find(function (c) { return t.classList.contains(c); });
  if (k && t.textContent !== DD_TAG_LABEL[k]) t.textContent = DD_TAG_LABEL[k];
}
function ddCardTidy(card) {
  var id = ddCardId(card);
  if (!id) return;
  var p = (typeof AGENT_PROPOSALS_FINAL !== 'undefined') ? AGENT_PROPOSALS_FINAL.find(function (x) { return x.id === id; }) : null;
  card.classList.add('dd-c');
  // 날짜 → 제목 툴팁
  var at = card.querySelector('.agga-at'), title = card.querySelector('.agga-title');
  if (at && title && !title.title) title.title = at.textContent.trim();
  // 근거 한 줄
  if (p && title && !card.querySelector('.dd-why')) {
    var line = ddWhyLine(p);
    if (line) {
      var d = document.createElement('div');
      d.className = 'dd-why';
      d.innerHTML = '<i>' + escHtml(ddWhySource(p)) + '</i><span>' + escHtml(line) + '</span>';
      title.parentNode.insertBefore(d, title.nextSibling);
    }
  }
  // [2026.11.27] 출처 태그 이름 — Agent 제안(SCM · 구매 등 신호를 Agent가 분석해 제안) / Agent 대화(PM과 대화로 생김) / 수기 입력
  //   자리: 첫 줄(계정 · 금액 · 버튼)은 좁은 칸에서 꽉 차므로 둘째 줄 제목 앞에 둠
  var tg = card.querySelector('.agai-tag');
  ddTagLabel(tg);
  if (tg && title && tg.parentNode !== title) title.insertBefore(tg, title.firstChild);
  // [근거 ▾] → [자세히 ▾]
  var why = card.querySelector('.agga-why');
  if (why && why.firstChild && why.firstChild.nodeType === 3 && why.firstChild.nodeValue.trim() === '근거') why.firstChild.nodeValue = '자세히';
  // [삭제] → [⋯]
  var del = card.querySelector('.agga-del');
  if (del) {
    ddHideEl(del, 'card-' + id);
    if (!del.parentNode.querySelector(':scope > .dd-more[data-for="card-' + id + '"]')) {
      var m = document.createElement('button');
      m.type = 'button'; m.className = 'dd-more dd-card-more'; m.setAttribute('data-for', 'card-' + id);
      m.setAttribute('onclick', "ddMoreOpen(this,'card-" + id + "')"); m.title = '더보기(삭제)'; m.setAttribute('aria-label', '더보기');
      m.textContent = '⋯';
      del.parentNode.insertBefore(m, del.nextSibling);
    }
  }
}
function ddOnlyOn(on) {                       // crud R — 예산 조정안을 반영한 것만 / 전체 보기
  if (typeof bapTodoFilterSet === 'function') bapTodoFilterSet(on ? 'on' : 'all');
}
function ddGanttToggle() {                    // crud N — 인력 투입 일정(막대그래프) 펼치기/접기
  ddGanttOpen = !ddGanttOpen;
  try { localStorage.setItem('dd-gantt', ddGanttOpen ? '1' : '0'); } catch (e) { /* 저장 막힘 */ }
  ddSimplify();
}
// [⋯] 메뉴 — 숨긴 원래 버튼들을 글자 그대로 나열, 누르면 원래 버튼을 대신 누름
function ddMoreClose() { var m = document.getElementById('dd-more-menu'); if (m) m.remove(); }
function ddMoreOpen(btn, key) {               // crud N — 더보기 메뉴 열기
  var open = document.getElementById('dd-more-menu');
  if (open && open.getAttribute('data-for') === key) { ddMoreClose(); return; }
  ddMoreClose();
  var items = Array.prototype.filter.call(document.querySelectorAll('#s-budget [data-dd-more="' + key + '"]'), function (el) { return el.isConnected; });
  if (!items.length) return;
  //   [이력]은 화면 맨 위에 있어 먼저 잡히지만 메뉴에서는 맨 끝으로(표 관련 기능부터)
  items.sort(function (a, b) { return (a.classList.contains('agai-hist') ? 1 : 0) - (b.classList.contains('agai-hist') ? 1 : 0); });
  var menu = document.createElement('div');
  menu.id = 'dd-more-menu'; menu.className = 'dd-more-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('data-for', key);
  menu.innerHTML = items.map(function (el) {
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim().replace(/^[⬇▾▴]\s*/, '');
    var dis = el.disabled ? ' disabled' : '';
    return '<button type="button" role="menuitem"' + dis + ' onclick="ddMoreRun(\'' + el.getAttribute('data-dd-key') + '\')">' + label + '</button>';
  }).join('');
  document.body.appendChild(menu);
  var r = btn.getBoundingClientRect();
  var w = menu.offsetWidth;
  menu.style.top = Math.round(r.bottom + 4) + 'px';
  menu.style.left = Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + 'px';
}
function ddMoreRun(k) {                       // crud N — 메뉴 항목 실행(원래 버튼을 대신 누름)
  ddMoreClose();
  var el = document.querySelector('#s-budget [data-dd-key="' + k + '"]');
  if (el && !el.disabled) el.click();
}
(function ddWatchSimplify() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var q = false;
  var mo = new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { ddSimplify(); } catch (e) { /* 무시 */ } }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); ddSimplify(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('pointerdown', function (e) {
    var m = document.getElementById('dd-more-menu');
    if (m && !m.contains(e.target) && !(e.target.closest && e.target.closest('.dd-more'))) ddMoreClose();
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ddMoreClose(); });
  window.addEventListener('scroll', function (e) { if (!(e.target && e.target.id === 'dd-more-menu')) ddMoreClose(); }, true);
  window.addEventListener('resize', ddMoreClose);
})();
(function ddSimplifyStyle() {
  if (typeof document === 'undefined' || document.getElementById('dd-simplify-style')) return;
  var st = document.createElement('style');
  st.id = 'dd-simplify-style';
  var CB = '#s-budget#s-budget#s-budget .agga-card.dd-c > .agga-body';   // 카드 한 줄 줄이기(아래)
  st.textContent = [
    '#s-budget .agent-ga .agga-col.detail .agga-col-head .agga-dsub{display:none !important}',
    '#s-budget .agent-ga .bap-tabs{display:none !important}',
    '#s-budget .dd-more{height:32px;min-width:34px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;font-size:14px;font-weight:800;color:#334155;cursor:pointer;white-space:nowrap;flex:0 0 auto}',
    '#s-budget .dd-more.wide{font-size:13px;padding:0 12px}',
    '#s-budget .dd-more:hover{border-color:#94a3b8;background:#f8fafc}',
    '.dd-more-menu{position:fixed;z-index:3000;min-width:160px;padding:6px;background:#fff;border:1px solid #cfd6df;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.16);display:flex;flex-direction:column}',
    '.dd-more-menu button{border:0;background:none;text-align:left;padding:9px 12px;border-radius:7px;font:inherit;font-size:14px;font-weight:700;color:#1c2432;cursor:pointer;white-space:nowrap}',
    '.dd-more-menu button:hover:not(:disabled){background:#f1f5f9}',
    '.dd-more-menu button:disabled{color:#b6bec9;cursor:default}',
    '#s-budget .dd-gantt-tog{display:flex;align-items:center;gap:10px;width:100%;margin:14px 0 10px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font:inherit;font-size:14px;font-weight:800;color:#334155;cursor:pointer;text-align:left}',
    '#s-budget .dd-gantt-tog:hover{border-color:#94a3b8;background:#f1f5f9}',
    '#s-budget .dd-gantt-tog span{font-weight:600;color:#64748b;font-size:13px}',
    '#s-budget .dd-onlyon{display:flex;align-items:center;gap:8px;padding:4px 2px 10px;font-size:14px;font-weight:700;color:#334155;cursor:pointer;user-select:none}',
    '#s-budget .dd-onlyon input{width:16px;height:16px;margin:0;cursor:pointer;accent-color:#2f5bea}',
    '#s-budget .dd-onlyon em{font-style:normal;margin-left:auto;font-weight:600;color:#64748b;font-size:13px}',
    // 예산 조정안 카드 정리(⑤)
    '#s-budget#s-budget#s-budget .agga-card.dd-c .agga-at{display:none !important}',
    // [2026.11.27] 출처 태그 3가지를 다시 늘 보이게 — Agent 제안(남색) · Agent 대화(청록) · 수기 입력(주황). 같은 크기 · 모양
    '#s-budget#s-budget#s-budget .agga-card.dd-c .agai-tag{display:inline-flex !important;align-items:center;flex:0 0 auto;white-space:nowrap;font-style:normal;font-size:11.5px !important;font-weight:700 !important;line-height:18px;padding:0 6px !important;border-radius:5px !important;border:1px solid transparent !important;margin:0 7px 0 0 !important;vertical-align:2px}',
    '#s-budget#s-budget#s-budget .agga-card.dd-c .agai-tag.agent{color:#3730a3 !important;background:#eef2ff !important;border-color:#dfe4fb !important}',
    '#s-budget#s-budget#s-budget .agga-card.dd-c .agai-tag.sim{color:#0f6b63 !important;background:#e7f6f3 !important;border-color:#cdebe5 !important}',
    '#s-budget#s-budget#s-budget .agga-card.dd-c .agai-tag.manual{color:#a45b06 !important;background:#fff5e5 !important;border-color:#f7e3c2 !important}',
    '#s-budget .agga-card.dd-c .agga-title{line-height:1.45 !important;margin-top:4px !important}',
    '#s-budget .agga-card.dd-c .dd-why{display:flex;align-items:flex-start;gap:7px;margin-top:6px;font-size:13px;line-height:1.5;color:#444b59;font-weight:600}',
    '#s-budget .agga-card.dd-c .dd-why i{flex:0 0 auto;font-style:normal;font-size:11.5px;font-weight:800;color:#5f6675;background:#f1f3f5;border:1px solid #e4e7eb;border-radius:5px;padding:0 6px;line-height:18px;margin-top:1px}',
    '#s-budget .agga-card.dd-c .dd-card-more{height:30px;min-width:30px;padding:0 6px;font-size:13px}',
    // [2026.11.26] 카드 한 줄 줄이기 — [반영] · [자세히] · [⋯] 을 첫 줄(● 계정 · 금액) 오른쪽으로 올림, 제목은 둘째 줄 전체 폭
    //   왼쪽(계정 줄 · 제목 · 근거) / 오른쪽(금액 · 버튼) 묶음을 풀어(display:contents) 한 격자에 다시 배치. 펼친 내용 등 나머지는 전체 폭
    //   (오른쪽 칸 카드는 budget-adjust-side.js 가 칸 이름(grid-area)을 붙여 두어 #s-budget 을 겹쳐 우선순위를 올리고 !important)
    CB + '{display:grid !important;grid-template-columns:minmax(0,1fr) auto auto !important;grid-template-areas:none !important;column-gap:10px !important;align-items:center}',
    CB + ' > .agga-left, ' + CB + ' > .agga-right{display:contents !important}',
    CB + ' > .agga-left > *, ' + CB + ' > .agga-right > *{grid-column:1 / -1 !important;grid-row:auto;min-width:0}',
    CB + ' > .agga-left > .agga-head{grid-column:1 !important;grid-row:1 !important;min-width:0}',
    CB + ' > .agga-right > .agga-amt, ' + CB + ' > .agga-right > .agga-hint{grid-column:2 !important;grid-row:1 !important;margin:0 !important;white-space:nowrap;text-align:right}',
    CB + ' > .agga-right > .agga-acts{grid-column:3 !important;grid-row:1 !important;margin:0 !important;flex-wrap:nowrap !important}',
    CB + ' > .agga-left > .agga-title{grid-row:2 !important}',
    CB + ' > .agga-left > .dd-why{grid-row:3 !important}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
