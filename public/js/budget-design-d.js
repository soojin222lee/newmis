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
//   · 왼쪽 칸 폭은 경계선을 끌어 조절(오른쪽 칸 폭과 따로 기억), 더블클릭 = 기본 폭.
// ════════════════════════════════════════════════════════════════════════════════

var DD_SIDE = { min: 360, def: 490, max: 600 };
var ddSideW = (function () { try { return Number(localStorage.getItem('dd-side-w')) || 0; } catch (e) { return 0; } })();
// 프로젝트 메인의 오른쪽(Agent와 대화) 폭 — 0 = 반반. 끌어서 바꾸면 따로 기억(계정 상세 왼쪽 칸 폭과 별개)
var ddMainW = (function () { try { return Number(localStorage.getItem('dd-main-w')) || 0; } catch (e) { return 0; } })();
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
function ddSideWidth(g) {
  var gw = g ? g.clientWidth : 1200;
  var max = Math.max(B2C_MIN.side, gw - B2C_MIN.main - 14);
  if (ddSideW) return Math.min(Math.max(ddSideW, B2C_MIN.side), max);
  var def = Math.min(DD_SIDE.def, Math.max(DD_SIDE.min, Math.round(gw * 0.35)));
  var need = Math.ceil(ddFigNeed() / ddFigK()) - 14;   // 칸 사이 간격(14px)만큼은 숫자 칸이 더 넓음
  return Math.min(Math.max(def, need), max);
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
  if (!base) return 1;
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
    if (prev === 'main' && b2cLastMode === 'detail' && b2cState.tab !== 'todo') { b2cState.tab = 'todo'; b2cPaint(); }
    return r;
  };
}

// 경계선 끌기 — 계정 상세에서는 칸이 왼쪽이라 오른쪽으로 끌면 넓어짐. 200px 아래로 밀면 접힘
if (typeof b2cSplitStart === 'function') {
  var ddSplitBefore = b2cSplitStart;
  b2cSplitStart = function (ev) {
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
    T + ' .agai-accts .agai-acct.on{background:#fff !important;top:1px;padding-bottom:11px !important;z-index:2;box-shadow:inset 0 3px 0 var(--acc,#475569) !important}',
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
