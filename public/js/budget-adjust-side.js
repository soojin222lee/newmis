// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — Agent 화면 2칸 배치(왼쪽 본문 | 오른쪽 Agent 칸 고정)                  작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: [2026.11.16] 계정 상세를 [예산 조정안 | 상세 예산내역 | Agent와 대화하기] 세 칸으로 나누니
//   정작 입력하는 상세 예산내역이 좁았습니다. 위쪽 요약(지금 수립 · 계정 카드)은 그대로 두고 아래를 2칸으로 바꿉니다.
//     · 계정 상세  : 왼쪽 = 상세 예산내역(넓게) / 오른쪽 = 탭 [예산 조정안 N] [Agent와 대화]
//     · 프로젝트 메인: 왼쪽 = 예산 조정안(넓게) / 오른쪽 = [Agent와 대화]
//       → 오른쪽 칸은 두 화면에서 같은 자리 · 같은 폭 · 같은 높이라, 계정을 눌러도 오른쪽은 그대로 있고 왼쪽만 바뀝니다
//         (예전엔 메인 30:70 → 상세 3칸으로 두 칸이 한꺼번에 자리와 크기를 바꿔 부자연스러웠음).
//     · 칸 사이 경계선(늘 보임)을 끌어 오른쪽 폭을 자유롭게 조절 — 최소 280px, 왼쪽은 최소 560px.
//       끝까지(200px 아래로) 밀면 오른쪽이 얇은 세로 띠로 접히고, 띠를 누르면 다시 열립니다. 더블클릭 = 기본 폭(화면의 약 27%, 280~380px).
//       폭 · 탭 · 접힘은 두 화면이 함께 쓰고 브라우저에 기억합니다(localStorage — 막혀 있으면 이번 화면에서만).
//     · 오른쪽 예산 조정안 카드는 2줄형: 1줄 = 계정 · 영향 · 금액 / 2줄 = 제목(한 줄로 줄임) · [반영] · [자세히 ▾].
//       날짜 · 'Agent 제안' 표시 · 근거 · 삭제 · 1안/2안 고르기는 [자세히]로 펼쳤을 때만 보입니다.
//     · 영향 표시(모든 조정안 카드 1줄째): "반영 후 CP 여유 3.89억" — 그 계정 CP한도 − 수립 − 이번 증감(agentRollCacheFinal).
//       한도를 넘으면 빨간 "반영 시 CP 한도 2,000만 초과", 이관은 "재료비 → 외주비", 증감 0은 "총액 변동 없음",
//       1안/2안 카드는 "1안 여유 3.22억 · 2안 재료비 → 외주비".
//   공유 렌더러(budget-agent-console.js)는 고치지 않습니다 — 그려진 뒤 칸(.agga-col.todo · .chat)을
//   오른쪽 묶음(.b2c-side)으로 옮기고 모양만 덮습니다. 버튼은 원래 인라인 onclick 그대로 동작합니다.
//   예전 세 칸 폭 조절(budget-ui-unify.js buiSplitApply) · 메인 [넓게 ›](agentGaWideToggleFinal)는 이 배치로 대체합니다.
//   budget-ui-unify.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

var B2C_MIN = { side: 280, main: 560, fold: 200, def: 380, rail: 46 };
var b2cState = (function () {
  const d = { w: 0, tab: 'todo', fold: false };
  try { const s = JSON.parse(localStorage.getItem('b2c-side') || '{}'); return { w: Number(s.w) || 0, tab: s.tab === 'chat' ? 'chat' : 'todo', fold: !!s.fold }; }
  catch (e) { return d; }
})();
var b2cForcing = false;
var b2cLastMode = '';                         // 직전 화면(main · detail) — 메인에서 들어올 때 탭을 Agent 로
function b2cSave() { try { localStorage.setItem('b2c-side', JSON.stringify(b2cState)); } catch (e) { /* 저장 막힘 */ } }
// Agent 화면 그리드(계정 상세 · 프로젝트 메인). 대화 칸이 있거나 이미 옮겨 둔 그리드만
function b2cGrid() {
  const d = document.querySelector('#s-budget .agga-grid.detail');       // 계정 상세(양옆 칸이 아직 없어도)
  if (d) return d;
  const gs = document.querySelectorAll('#s-budget .agga-grid');
  for (let i = 0; i < gs.length; i++) if (gs[i].querySelector('.agga-col.chat, .agga-col.todo')) return gs[i];
  return null;
}
function b2cDetail() { return document.querySelector('#s-budget .agga-grid.detail'); }
function b2cIsMain(g) { return !!g && !g.classList.contains('detail'); }
function b2cNarrow() { return !!(window.matchMedia && window.matchMedia('(max-width: 1100px)').matches); }
function b2cCount() {
  try { if (typeof agentGaPendingCntFinal === 'function') return agentGaPendingCntFinal(); } catch (e) { /* 무시 */ }
  return document.querySelectorAll('#s-budget .agga-card').length;
}

// 그려질 때마다: 칸을 오른쪽 묶음으로 옮기고 폭 · 탭을 적용합니다(여러 번 불려도 같은 결과)
function b2cApply() {
  const g = b2cGrid();
  if (!g) return;
  const main = b2cIsMain(g);
  let todo = g.querySelector('.agga-col.todo'), chat = g.querySelector('.agga-col.chat');
  // 대화 칸(상세는 조정안 칸도)을 늘 그려 두고 탭으로 보여 줍니다 — 공유 상태가 닫힘이면 열림으로 맞춰 한 번 다시 그림
  if (!chat || (!main && !todo)) {
    if (b2cForcing) return;
    b2cForcing = true;
    if (!main) agentGaTodoOpenFinal = true;
    agentGaChatFoldFinal = false;
    setTimeout(function () { try { renderBudgetPage(); } finally { b2cForcing = false; } }, 0);
    return;
  }
  g.classList.add('b2c-on');
  g.classList.toggle('b2c-main', main);
  // 메인 → 계정 상세로 들어올 때는 오른쪽을 메인과 같은 Agent 탭으로 둡니다(오른쪽은 그대로, 왼쪽만 바뀜). 상세끼리 옮길 땐 고른 탭 유지
  if (!main && b2cLastMode === 'main') b2cState.tab = 'chat';
  b2cLastMode = main ? 'main' : 'detail';
  let side = g.querySelector(':scope > .b2c-side');
  if (!side) {
    side = document.createElement('div');
    side.className = 'b2c-side';
    side.innerHTML = '<div class="b2c-split" role="separator" aria-orientation="vertical" title="끌어서 폭 조절 · 더블클릭하면 기본 폭"'
      + ' onpointerdown="b2cSplitStart(event)" ondblclick="b2cSplitReset()"><i></i></div>'
      + '<div class="b2c-tabs" role="tablist">'
      + '<button type="button" class="b2c-tab" data-tab="todo" role="tab" onclick="b2cTab(\'todo\')">예산 조정안<em class="b2c-cnt"></em></button>'
      + '<button type="button" class="b2c-tab" data-tab="chat" role="tab" onclick="b2cTab(\'chat\')">Agent와 대화</button>'
      + '<button type="button" class="b2c-fold" onclick="b2cFold(true)" title="오른쪽 칸 접기" aria-label="오른쪽 칸 접기">' + ((typeof BUI_IC !== 'undefined') ? BUI_IC.right2 : '»') + '</button></div>'
      + '<div class="b2c-rail">'
      + '<button type="button" class="b2c-rail-btn" data-tab="todo" onclick="b2cTab(\'todo\')" title="예산 조정안 열기"><span>예산 조정안</span><em class="b2c-cnt"></em></button>'
      + '<button type="button" class="b2c-rail-btn" data-tab="chat" onclick="b2cTab(\'chat\')" title="Agent와 대화 열기"><span>Agent</span></button></div>'
      + '<div class="b2c-panes"></div>';
    g.appendChild(side);
  }
  const panes = side.querySelector('.b2c-panes');
  if (!main && todo && todo.parentNode !== panes) panes.appendChild(todo);
  if (chat.parentNode !== panes) panes.appendChild(chat);
  if (todo) { b2cCards(todo, !main); b2cImpacts(todo); }
  b2cPaint(g, side);
}

// 탭 · 접힘 · 폭을 화면에 반영(메인은 왼쪽에 조정안이 있으므로 오른쪽은 늘 Agent 탭)
function b2cPaint(g, side) {
  g = g || b2cGrid(); side = side || (g && g.querySelector(':scope > .b2c-side'));
  if (!g || !side) return;
  const tab = b2cIsMain(g) ? 'chat' : b2cState.tab;
  const n = b2cCount();
  side.querySelectorAll('.b2c-cnt').forEach(function (e) { const t = n ? String(n) : ''; if (e.textContent !== t) e.textContent = t; });
  side.classList.toggle('folded', b2cState.fold);
  if (side.getAttribute('data-tab') !== tab) side.setAttribute('data-tab', tab);
  side.querySelectorAll('[data-tab]').forEach(function (b) {
    const on = b.getAttribute('data-tab') === tab;
    b.classList.toggle('on', on);
    if (b.classList.contains('b2c-tab')) b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (b2cNarrow()) { g.style.removeProperty('grid-template-columns'); return; }
  const gap = parseFloat(getComputedStyle(g).columnGap) || 0;
  const max = Math.max(B2C_MIN.side, g.clientWidth - gap - B2C_MIN.main);
  const def = Math.min(B2C_MIN.def, Math.max(B2C_MIN.side, Math.round(g.clientWidth * 0.27)));   // 기본 폭: 화면의 약 27%(280~380px)
  const w = b2cState.fold ? B2C_MIN.rail : Math.min(Math.max(b2cState.w || def, B2C_MIN.side), max);
  g.style.setProperty('grid-template-columns', 'minmax(' + B2C_MIN.main + 'px,1fr) ' + w + 'px', 'important');
}

function b2cTab(tab) {                        // crud N — 오른쪽 탭 전환(예산 조정안 · Agent와 대화), 접혀 있으면 펼침
  if (!b2cIsMain(b2cGrid())) b2cState.tab = tab === 'chat' ? 'chat' : 'todo';
  b2cState.fold = false;
  b2cSave();
  b2cPaint();
  const g = b2cGrid();
  if (b2cIsMain(g) || b2cState.tab === 'chat') {
    const body = document.querySelector('#s-budget .b2c-side .agga-col-body.chat');
    if (body) body.scrollTop = body.scrollHeight;
    const inp = document.querySelector('#s-budget .b2c-side .agga-input input, #s-budget .b2c-side .agga-input textarea');
    if (inp && tab === 'chat') try { inp.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
}
function b2cFold(on) {                        // crud N — 오른쪽 칸 접기/펼치기(접으면 세로 띠)
  b2cState.fold = !!on;
  b2cSave();
  b2cPaint();
}

// 경계선 끌기 — 오른쪽 폭 조절, 200px 아래로 밀면 접힘
function b2cSplitStart(ev) {                  // crud N — 칸 사이 경계 끌기 시작
  const g = b2cGrid();
  const side = g && g.querySelector(':scope > .b2c-side');
  if (!side || b2cNarrow()) return;
  ev.preventDefault();
  const x0 = ev.clientX, w0 = side.getBoundingClientRect().width;
  document.body.classList.add('b2c-resizing');
  const move = function (e) {
    const w = w0 - (e.clientX - x0);
    if (w < B2C_MIN.fold) { b2cState.fold = true; }
    else { b2cState.fold = false; b2cState.w = Math.round(Math.max(w, B2C_MIN.side)); }
    b2cPaint(g, side);
  };
  const up = function () {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('b2c-resizing');
    b2cSave();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}
function b2cSplitReset() {                    // crud N — 기본 폭(화면의 약 27%)으로
  b2cState.w = 0; b2cState.fold = false;
  b2cSave();
  b2cPaint();
}

// 예산 조정안 카드 2줄형(오른쪽 칸) — [근거] 버튼을 [자세히 ▾]로(1안/2안 카드는 [안 고르기 ▾]), 제목을 눌러도 펼침
function b2cCards(todo, compact) {
  todo.querySelectorAll('.agga-card').forEach(function (c) {
    const why = c.querySelector('.agga-why');
    if (!why) return;
    const open = why.classList.contains('on');
    c.classList.toggle('b2c-open', open);
    if (!compact) return;
    const pick = !!c.querySelector('.agai-seg');
    const label = open ? '접기' : (pick ? '안 고르기' : '자세히');
    if (why.getAttribute('data-b2c') !== label) {          // 꺾쇠는 선 아이콘(budget-ui-unify.js BUI_IC)으로 — 글자 기호를 쓰지 않음
      why.innerHTML = label + ((typeof BUI_IC !== 'undefined') ? BUI_IC[open ? 'up' : 'down'] : (open ? ' ▴' : ' ▾'));
      why.setAttribute('data-b2c', label);
      why.setAttribute('data-bui-ic', '1');
    }
    const t = c.querySelector('.agga-title');
    if (t && !t.getAttribute('onclick')) {
      t.setAttribute('onclick', why.getAttribute('onclick'));
      t.setAttribute('title', open ? '' : t.textContent.trim());
    }
  });
}

/* ── 영향 표시 — 반영하면 그 계정 CP 여유가 얼마 남는지 ──────────────────────
   CP 여유 = 계정 CP한도 − 지금 수립 − 이번 조정 증감(agentRollCacheFinal.rows · 조정안 legs). 반영을 골라도 수립 값은
   기안 전까지 그대로라 같은 식으로 "반영 후" 값을 보여 줍니다. */
function b2cWon(v) {
  const a = Math.abs(Math.round(Number(v) || 0));
  if (a >= 100000000) return (Math.round(a / 1000000) / 100) + '억';
  if (a >= 10000) return fmt(Math.round(a / 10000)) + '만';
  return fmt(a) + '원';
}
function b2cImpactOf(id) {
  const p = (typeof agentFindProposalFinal === 'function') ? agentFindProposalFinal(id) : null;
  if (!p) return null;
  const legs = (p.legs || []).filter(function (l) { return l && l.acct; });
  const net = legs.reduce(function (t, l) { return t + (Number(l.delta) || 0); }, 0);
  if (legs.length > 1 && !net) {
    const from = legs.filter(function (l) { return l.delta < 0; }).map(function (l) { return l.acct; }).join('·');
    const to = legs.filter(function (l) { return l.delta > 0; }).map(function (l) { return l.acct; }).join('·');
    return { t: from + ' → ' + to, s: from + ' → ' + to, cls: 'move' };
  }
  if (!legs.length || !net) return { t: '총액 변동 없음', s: '총액 ±0', cls: '' };
  const rows = ((typeof agentRollCacheFinal !== 'undefined' && agentRollCacheFinal) || {}).rows || [];
  const acct = legs.length === 1 ? legs[0].acct : p.acct;
  const r = rows.find(function (x) { return x.acct === acct; });
  if (!r || !r.cp) return null;
  const room = r.cp - r.plan - net;
  if (room < 0) return { t: '반영 시 CP 한도 ' + b2cWon(room) + ' 초과', s: 'CP ' + b2cWon(room) + ' 초과', cls: 'over' };
  return { t: '반영 후 CP 여유 ' + b2cWon(room), s: '여유 ' + b2cWon(room), cls: '' };
}
function b2cImpacts(todo) {
  todo.querySelectorAll('.agga-card').forEach(function (c) {
    const head = c.querySelector('.agga-head');
    if (!head) return;
    const idOf = function (b) { const m = /'([^']+)'/.exec((b && b.getAttribute('onclick')) || ''); return m ? m[1] : ''; };
    const segs = c.querySelectorAll('.agai-seg');
    let imp = null;
    if (segs.length) {                         // 1안 / 2안 — 안마다 짧게
      const parts = Array.prototype.map.call(segs, function (b, i) { const x = b2cImpactOf(idOf(b)); return x ? { t: (i + 1) + '안 ' + x.s, cls: x.cls } : null; })
        .filter(Boolean);
      if (parts.length) imp = { t: parts.map(function (x) { return x.t; }).join(' · '), cls: parts.some(function (x) { return x.cls === 'over'; }) ? 'over' : '' };
    } else {
      imp = b2cImpactOf(idOf(c.querySelector('.agai-yes, .agga-why')));
    }
    let el = head.querySelector(':scope > .b2c-imp');
    if (!imp) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('span'); head.appendChild(el); }
    const cls = 'b2c-imp' + (imp.cls ? ' ' + imp.cls : '');
    if (el.className !== cls) el.className = cls;
    if (el.textContent !== imp.t) { el.textContent = imp.t; el.title = imp.t; }
  });
}

// 예전 세 칸 폭 조절 대신 이 배치를 씁니다(budget-ui-unify.js 의 MutationObserver · resize 가 이 이름을 부름)
buiSplitApply = function () { b2cApply(); };

// 깜박임 방지 — 계정 상세로 들어갈 때 공유 코드(agentAiSheetOpenFinal)가 양옆 칸을 '닫힘'으로 두고 그리면
//   내역이 전체 폭으로 한 번 그려졌다가 다시 그려지며 레이아웃이 깜박였습니다(+ 칸 옮기기도 한 박자 늦게 실행).
//   → 그리기 직전에 두 칸을 '열림'으로 맞추고(접기는 이 배치의 세로 띠가 맡음), 그린 직후 같은 순간에 칸을 옮깁니다.
if (typeof renderBudgetPage === 'function') {
  var b2cRenderBefore = renderBudgetPage;
  renderBudgetPage = function () {
    if (typeof agentGaTodoOpenFinal !== 'undefined') agentGaTodoOpenFinal = true;
    if (typeof agentGaChatFoldFinal !== 'undefined') agentGaChatFoldFinal = false;
    const r = b2cRenderBefore.apply(this, arguments);
    try { b2cApply(); } catch (e) { /* Agent 화면이 아니면 무시 */ }
    return r;
  };
}

// 예전 [‹ 접기] · [접기 ›] · [› 예산 조정안] · [💬 대화] 를 부르는 곳이 있으면 오른쪽 탭 동작으로 바꿔 줍니다(계정 상세일 때만)
(function b2cWrapLegacy() {
  if (typeof agentGaTodoOpenSetFinal === 'function') {
    const todoBefore = agentGaTodoOpenSetFinal;
    agentGaTodoOpenSetFinal = function (on) {
      if (!b2cDetail()) return todoBefore.apply(this, arguments);
      if (on) b2cTab('todo'); else b2cFold(true);
    };
  }
  if (typeof agentGaChatFoldSetFinal === 'function') {
    const chatBefore = agentGaChatFoldSetFinal;
    agentGaChatFoldSetFinal = function (on) {
      if (!b2cGrid()) return chatBefore.apply(this, arguments);
      if (!on) b2cTab('chat'); else b2cFold(true);
    };
  }
})();
if (typeof window !== 'undefined') window.addEventListener('resize', function () { try { b2cPaint(); } catch (e) { /* 무시 */ } });

(function b2cInjectStyle() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('b2c-style')) return;
  const S = '#s-budget .agga-grid.b2c-on ';
  const M = '#s-budget .agga-grid.b2c-main ';
  const P = S + '.b2c-side ';
  const H = 'clamp(480px, calc(100dvh - 270px), 1200px)';
  const st = document.createElement('style');
  st.id = 'b2c-style';
  st.textContent = `
  ${S}{ column-gap:14px !important; align-items:stretch; }
  ${S}> .agga-col.detail { grid-column:1; grid-row:1; }
  ${S}> .b2c-side { grid-column:2; grid-row:1; position:relative; display:flex; flex-direction:column; min-width:0;
    height:${H}; background:#fff; border:1px solid #dbe3ee; border-radius:14px; }
  /* 프로젝트 메인 — 왼쪽 예산 조정안(넓게), 오른쪽은 Agent 탭만 */
  ${M}> .agga-col.todo { grid-column:1; grid-row:1; height:${H} !important; min-height:0 !important; max-height:none !important;
    display:flex; flex-direction:column; }
  ${M}> .agga-col.todo > .agga-col-body { flex:1 1 auto; min-height:0; overflow-y:auto; }
  ${M}.agga-swap { display:none !important; }
  ${M}.b2c-side [data-tab="todo"] { display:none !important; }
  /* 경계선 — 늘 보이는 선 + 가운데 손잡이 */
  ${P}.b2c-split { position:absolute; top:0; bottom:0; left:-12px; width:10px; cursor:col-resize; touch-action:none; z-index:6; }
  ${P}.b2c-split::before { content:''; position:absolute; top:12px; bottom:12px; left:4px; width:2px; border-radius:2px; background:#e2e8f0; transition:background .15s; }
  ${P}.b2c-split i { position:absolute; top:50%; left:1px; width:8px; height:40px; margin-top:-20px; border-radius:99px; background:#fff;
    border:1px solid #cbd5e1; box-shadow:0 1px 2px rgba(15,23,42,.06); }
  ${P}.b2c-split i::after { content:''; position:absolute; left:2px; right:2px; top:13px; bottom:13px;
    background:repeating-linear-gradient(#94a3b8 0 2px, transparent 2px 5px); }
  ${P}.b2c-split:hover::before, body.b2c-resizing ${P}.b2c-split::before { background:#2563eb; }
  ${P}.b2c-split:hover i, body.b2c-resizing ${P}.b2c-split i { border-color:#2563eb; }
  body.b2c-resizing { cursor:col-resize !important; user-select:none !important; }
  body.b2c-resizing * { cursor:col-resize !important; }
  /* 탭 */
  ${P}.b2c-tabs { display:flex; align-items:stretch; gap:2px; padding:0 6px 0 10px; border-bottom:1px solid #e2e8f0; flex:0 0 auto; }
  ${P}.b2c-tab { position:relative; display:inline-flex; align-items:center; gap:6px; height:46px; padding:0 12px; border:0; background:none;
    font:inherit; font-size:14px; font-weight:800; color:#64748b; cursor:pointer; }
  ${P}.b2c-tab:hover { color:#1c2432; }
  ${P}.b2c-tab.on { color:#1d4ed8; }
  ${P}.b2c-tab.on::after { content:''; position:absolute; left:8px; right:8px; bottom:-1px; height:3px; border-radius:3px 3px 0 0; background:#2563eb; }
  ${P}.b2c-cnt:empty { display:none; }
  ${P}.b2c-cnt { font-style:normal; min-width:20px; height:20px; padding:0 6px; border-radius:99px; background:#ef4444; color:#fff;
    font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; }
  ${P}.b2c-fold { margin-left:auto; align-self:center; width:30px; height:30px; border:1px solid #cbd5e1; border-radius:8px; background:#fff;
    color:#475569; font-size:15px; font-weight:800; cursor:pointer; }
  ${P}.b2c-fold:hover { background:#f8fafc; border-color:#94a3b8; }
  /* 칸 — 탭에 따라 하나만 */
  ${P}.b2c-panes { flex:1 1 auto; min-height:0; display:flex; }
  ${P}.b2c-panes > .agga-col { flex:1 1 auto; min-width:0; height:auto !important; max-height:none !important; border:0 !important;
    box-shadow:none !important; border-radius:0 0 14px 14px !important; background:transparent !important; display:flex; flex-direction:column; }
  ${P}.b2c-panes > .agga-col > .agga-col-body { flex:1 1 auto; min-height:0; overflow-y:auto; }
  #s-budget .b2c-side[data-tab="todo"] .b2c-panes > .agga-col.chat,
  #s-budget .b2c-side[data-tab="chat"] .b2c-panes > .agga-col.todo { display:none !important; }
  ${P}.agga-col.chat > .agga-col-head { display:none !important; }
  ${P}.agga-col.todo > .agga-col-head > strong, ${P}.agga-col.todo > .agga-col-head > .agga-fold { display:none !important; }
  ${P}.agga-col.todo > .agga-col-head { justify-content:flex-start; flex-wrap:wrap; gap:6px; padding:10px 12px !important; min-height:0 !important; }
  ${P}.agga-col.todo > .agga-col-head > .agga-draft { margin-left:auto; }
  ${P}.bui-split { display:none !important; }
  /* 접힘 — 얇은 세로 띠 */
  ${S}> .b2c-side.folded .b2c-tabs, ${S}> .b2c-side.folded .b2c-panes { display:none !important; }
  ${P}.b2c-rail { display:none; }
  ${S}> .b2c-side.folded .b2c-rail { display:flex; flex-direction:column; align-items:center; gap:8px; padding:10px 0; }
  ${P}.b2c-rail-btn .b2c-cnt { min-width:18px; height:18px; padding:0 4px; font-size:10.5px; }
  ${P}.b2c-rail-btn { display:flex; flex-direction:column; align-items:center; gap:6px; width:34px; padding:10px 0; border:1px solid #cbd5e1;
    border-radius:10px; background:#fff; font:inherit; font-size:12.5px; font-weight:800; color:#334155; cursor:pointer; }
  ${P}.b2c-rail-btn span { writing-mode:vertical-rl; letter-spacing:1px; }
  ${P}.b2c-rail-btn:hover { border-color:#2563eb; color:#1d4ed8; }
  /* 영향 표시(모든 조정안 카드) */
  ${S}.agga-card .agga-head .b2c-imp { min-width:0; flex:0 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    font-size:12px; font-weight:700; color:#475569; }
  ${S}.agga-card .agga-head .b2c-imp.move { color:#6d28d9; }
  ${S}.agga-card .agga-head .b2c-imp.over { color:#c40025; }
  ${S}.agga-card .agga-head .agp-acct { flex:0 0 auto; }
  /* 예산 조정안 카드 2줄형(오른쪽 칸) */
  ${P}.agga-group { gap:8px !important; }
  ${P}.agga-card { padding:10px 12px !important; }
  ${P}.agga-card .agga-body { display:grid !important; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"head amt" "title acts";
    column-gap:10px; row-gap:6px; align-items:center; }
  ${P}.agga-card .agga-left, ${P}.agga-card .agga-right { display:contents !important; }
  ${P}.agga-card .agga-head { grid-area:head; display:flex; flex-wrap:nowrap !important; align-items:center; gap:6px; margin:0 !important; min-width:0; overflow:hidden; }
  ${P}.agga-card .agga-head .agp-acct { font-size:12px !important; }
  ${P}.agga-card .agai-tag, ${P}.agga-card .agga-at { display:none !important; }
  ${P}.agga-card .agga-amt, ${P}.agga-card .agga-hint { grid-area:amt; justify-self:end; margin:0 !important; font-size:14.5px !important;
    font-weight:800; font-style:normal; white-space:nowrap; }
  ${P}.agga-card .agga-hint { font-size:12.5px !important; color:#b45309; }
  ${P}.agga-card .agga-title { grid-area:title; min-width:0; margin:0 !important; font-size:13.5px !important; line-height:1.4 !important;
    font-weight:700; color:#1c2432; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
  ${P}.agga-card .agga-title:hover { color:#1d4ed8; }
  ${P}.agga-card .agga-acts { grid-area:acts; display:flex !important; align-items:center; gap:4px; justify-content:flex-end; margin:0 !important; flex-wrap:nowrap; }
  ${P}.agga-card:not(.b2c-open) .agga-acts .agga-del, ${P}.agga-card:not(.b2c-open) .agga-acts .agai-seg { display:none !important; }
  ${P}.agga-card .agga-why { padding:0 8px !important; }
  /* 펼침 — 제목 전체 · 날짜 · Agent 제안 · 근거 · 모든 버튼 */
  ${P}.agga-card.b2c-open .agga-body { grid-template-areas:"head amt" "title title" "at at" "acts acts"; }
  ${P}.agga-card.b2c-open .agga-title { white-space:normal; overflow:visible; }
  ${P}.agga-card.b2c-open .agga-head { flex-wrap:wrap !important; overflow:visible; }
  ${P}.agga-card.b2c-open .agga-head .b2c-imp { white-space:normal; }
  ${P}.agga-card.b2c-open .agai-tag { display:inline-flex !important; }
  ${P}.agga-card.b2c-open .agga-at { display:block !important; grid-area:at; margin:0 !important; font-size:12px; color:#94a3b8; }
  ${P}.agga-card.b2c-open .agga-acts { justify-content:flex-start; flex-wrap:wrap; }
  ${P}.agga-card.b2c-open .agga-acts .agga-del { margin-left:auto; }
  ${P}.agga-card .agga-whybox { margin-top:8px !important; font-size:12.5px; line-height:1.55; }
  @media (max-width: 1100px) {
    ${S}> .b2c-side { grid-column:1; grid-row:auto; height:auto; min-height:420px; }
    ${M}> .agga-col.todo { height:auto !important; }
    ${P}.b2c-split { display:none; }
  }`;
  document.head.appendChild(st);
})();
