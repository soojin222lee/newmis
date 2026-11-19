// ════════════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 디자인 E안 (시안 브랜치 feature/nj-e)                              작성: 남주
//  D안(budget-design-d.js) 뒤에 로드되어 덮어씁니다. 원본 파일은 고치지 않습니다.
//
//   · 레이아웃은 D안 그대로(계정 상세 = 왼쪽 예산 조정안 · 오른쪽 상세, 위 계정 폴더 탭)
//   · Agent와 대화를 화면 안 탭에서 빼서, 브라우저 「Gemini에게 물어보기」처럼 오른쪽 AI 패널로.
//       - 상단 오른쪽 [✦ AI에게 물어보기] 버튼으로 여닫음(Esc · ✕ 로도 닫힘)
//       - 옆에 붙이기: 패널이 오른쪽 자리를 차지하고 화면이 그만큼 좁아짐(넓은 모니터 기본)
//       - 띄우기(오버레이): 화면 위에 덮어서 뜸, 뒤 화면 폭은 그대로. 바깥을 누르면 닫힘
//       - 창이 좁으면(1360px 미만) 자동으로 띄우기
//       - 패널 왼쪽 경계를 끌어 폭 조절, 더블클릭 = 기본 폭
//   · 프로젝트 메인: 예산 조정안이 전체 폭. 계정 상세: 왼쪽 칸은 예산 조정안만(탭 없음)
//   · 대화 칸(.agga-col.chat)은 공유 렌더러가 그대로 그리고, 그린 직후 이 패널로 옮깁니다.
// ════════════════════════════════════════════════════════════════════════════════

var DDE_AI = { min: 340, def: 420, max: 680, narrow: 1360 };
var ddeAi = (function () {
  var d = { open: false, mode: 'dock', w: 0 };
  try {
    var s = JSON.parse(localStorage.getItem('dde-ai') || '{}');
    return { open: !!s.open, mode: s.mode === 'float' ? 'float' : 'dock', w: Number(s.w) || 0 };
  } catch (e) { return d; }
})();
function ddeSave() { try { localStorage.setItem('dde-ai', JSON.stringify(ddeAi)); } catch (e) { /* 저장 막힘 */ } }
function ddeNarrow() { return window.innerWidth < DDE_AI.narrow; }
function ddeMode() { return ddeNarrow() ? 'float' : ddeAi.mode; }           // 좁은 창은 늘 띄우기
function ddeWidth() {
  var max = Math.min(DDE_AI.max, Math.round(window.innerWidth * 0.5));
  return Math.min(Math.max(ddeAi.w || DDE_AI.def, DDE_AI.min), Math.max(DDE_AI.min, max));
}
function ddeOnScreen() { return !!document.querySelector('#s-budget.active .agent-ga'); }

// ── AI 패널 뼈대(대화 칸은 그린 뒤 옮겨 넣음) ──
function ddePanel() {
  var ga = document.querySelector('#s-budget .agent-ga');
  if (!ga) return null;
  var p = ga.querySelector(':scope > .dde-ai');
  if (p) return p;
  p = document.createElement('aside');
  p.className = 'dde-ai';
  p.setAttribute('aria-label', 'AI Agent');
  p.innerHTML = '<div class="dde-ai-split" role="separator" aria-orientation="vertical" title="끌어서 폭 조절 · 더블클릭하면 기본 폭"'
    + ' onpointerdown="ddeAiSplitStart(event)" ondblclick="ddeAiSplitReset()"><i></i></div>'
    + '<div class="dde-ai-head"><strong>✦ AI Agent</strong>'
    + '<span class="dde-ai-seg" role="group" aria-label="패널 방식">'
    + '<button type="button" data-mode="dock" onclick="ddeAiMode(\'dock\')" title="화면 옆에 붙여서 나란히 보기">옆에 붙이기</button>'
    + '<button type="button" data-mode="float" onclick="ddeAiMode(\'float\')" title="화면 위에 띄워서 보기(뒤 화면 폭 그대로)">띄우기</button></span>'
    + '<button type="button" class="dde-ai-x" onclick="ddeAiToggle(false)" title="AI 패널 닫기" aria-label="AI 패널 닫기">✕</button></div>'
    + '<div class="dde-ai-body"></div>';
  ga.appendChild(p);
  return p;
}

// 상단 오른쪽 [✦ AI에게 물어보기] — 공유 셸을 고치지 않고 화면 위에 고정 버튼으로 띄움(Admin 버튼 왼쪽)
function ddeBtn() {
  var b = document.getElementById('dde-ai-btn');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.id = 'dde-ai-btn';
    b.setAttribute('onclick', 'ddeAiToggle()');
    b.innerHTML = '<span aria-hidden="true">✦</span> AI에게 물어보기';
    document.body.appendChild(b);
  }
  return b;
}

// 열림 · 방식 · 폭을 화면에 반영(여러 번 불려도 같은 결과)
function ddeAiPaint() {
  var on = ddeOnScreen();
  var b = ddeBtn();
  b.style.display = on ? '' : 'none';
  var adm = document.getElementById('admin-entry');
  if (adm && adm.getClientRects().length) {
    var r = adm.getBoundingClientRect();
    b.style.top = Math.round(r.top + (r.height - 32) / 2) + 'px';
    b.style.right = Math.round(window.innerWidth - r.left + 8) + 'px';
  }
  var open = on && ddeAi.open, mode = ddeMode(), w = ddeWidth();
  b.classList.toggle('on', open);
  b.setAttribute('aria-pressed', open ? 'true' : 'false');
  document.body.classList.toggle('dde-ai-dock', open && mode === 'dock');
  document.body.style.setProperty('--dde-ai-w', w + 'px');
  var p = on ? ddePanel() : null;
  if (!p) return;
  p.classList.toggle('open', open);
  p.classList.toggle('float', mode === 'float');
  p.querySelectorAll('.dde-ai-seg button').forEach(function (x) {
    var sel = x.getAttribute('data-mode') === mode;
    x.classList.toggle('on', sel);
    x.setAttribute('aria-pressed', sel ? 'true' : 'false');
    x.disabled = x.getAttribute('data-mode') === 'dock' && ddeNarrow();
    x.title = x.disabled ? '창이 좁아 띄우기로만 볼 수 있어요' : (x.getAttribute('data-mode') === 'dock' ? '화면 옆에 붙여서 나란히 보기' : '화면 위에 띄워서 보기(뒤 화면 폭 그대로)');
  });
}
// 화면 폭이 바뀌면 D안 칸 폭 · 숫자 크기도 다시 맞춤
function ddeRelayout() {
  try { if (typeof b2cPaint === 'function') b2cPaint(); } catch (e) { /* 무시 */ }
  try { if (typeof agentTopStickCheckFinal === 'function') agentTopStickCheckFinal(); } catch (e) { /* 무시 */ }
}

function ddeAiToggle(on) {                     // crud N — AI 패널 열기/닫기(상단 버튼 · ✕)
  ddeAi.open = (on === undefined) ? !ddeAi.open : !!on;
  ddeSave();
  ddeAiPaint();
  ddeRelayout();
  if (ddeAi.open) ddeAiFocus();
}
function ddeAiMode(mode) {                     // crud N — 패널 방식 전환(옆에 붙이기 · 띄우기)
  ddeAi.mode = mode === 'float' ? 'float' : 'dock';
  ddeSave();
  ddeAiPaint();
  ddeRelayout();
}
function ddeAiFocus() {
  var p = document.querySelector('#s-budget .dde-ai');
  if (!p) return;
  var body = p.querySelector('.agga-col-body.chat');
  if (body) body.scrollTop = body.scrollHeight;
  var inp = p.querySelector('.agga-input input');
  if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
}

// 패널 왼쪽 경계 끌기 — 왼쪽으로 끌면 넓어짐
function ddeAiSplitStart(ev) {                 // crud N — AI 패널 폭 조절 시작
  var p = document.querySelector('#s-budget .dde-ai');
  if (!p) return;
  ev.preventDefault();
  var x0 = ev.clientX, w0 = p.getBoundingClientRect().width;
  document.body.classList.add('b2c-resizing');
  var move = function (e) {
    ddeAi.w = Math.round(Math.max(DDE_AI.min, w0 - (e.clientX - x0)));
    ddeAiPaint();
    ddeRelayout();
  };
  var up = function () {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('b2c-resizing');
    ddeAi.w = ddeWidth();
    ddeSave();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}
function ddeAiSplitReset() {                   // crud N — AI 패널 기본 폭으로
  ddeAi.w = 0; ddeSave(); ddeAiPaint(); ddeRelayout();
}

// ── 그려질 때마다: 대화 칸을 AI 패널로 옮기고, 화면 안 Agent 탭은 숨김 ──
if (typeof b2cApply === 'function') {
  var ddeApplyBefore = b2cApply;
  b2cApply = function () {
    var g = b2cGrid();
    // 이미 옮겨 둔 상태(같은 그리드 · 대화 칸이 패널에 있음)에서 다시 불리면 칸 옮기기는 건너뜀
    //   — 원래 함수는 그리드 안에 대화 칸이 없으면 화면 전체를 다시 그려서, 입력 중인 글자가 사라짐
    var held = document.querySelector('#s-budget .agent-ga > .dde-ai .agga-col.chat');
    if (g && held && g.classList.contains('b2c-on') && !g.querySelector('.agga-col.chat')) {
      var todo = g.querySelector('.agga-col.todo');
      if (todo) { try { b2cCards(todo, !b2cIsMain(g)); b2cImpacts(todo); } catch (e) { /* 무시 */ } }
      b2cPaint(g);
      ddeAiPaint();
      return;
    }
    var r = ddeApplyBefore.apply(this, arguments);
    g = b2cGrid();
    if (!g) return r;
    var chat = g.querySelector('.agga-col.chat');
    var p = ddePanel();
    if (p && chat) {
      var body = p.querySelector('.dde-ai-body');
      var old = body.querySelector(':scope > .agga-col.chat');
      if (old && old !== chat) old.remove();
      if (chat.parentNode !== body) body.appendChild(chat);
    }
    if (b2cState.tab !== 'todo') { b2cState.tab = 'todo'; b2cPaint(); }
    ddeAiPaint();
    return r;
  };
}
// 예전 [💬 Agent와 대화] 처럼 대화 탭을 여는 곳은 AI 패널을 엽니다
if (typeof b2cTab === 'function') {
  var ddeTabBefore = b2cTab;
  b2cTab = function (tab) {
    if (tab === 'chat') { ddeAiToggle(true); return; }
    return ddeTabBefore.apply(this, arguments);
  };
}
// 프로젝트 메인: 오른쪽 칸(Agent 탭만 있던 자리)을 없애고 예산 조정안을 전체 폭으로
if (typeof b2cPaint === 'function') {
  var ddePaintBefore = b2cPaint;
  b2cPaint = function (g) {
    ddePaintBefore.apply(this, arguments);
    g = g || b2cGrid();
    if (g && b2cIsMain(g)) g.style.setProperty('grid-template-columns', 'minmax(0,1fr)', 'important');
  };
}

(function ddeWatch() {
  if (typeof document === 'undefined') return;
  var q = false;
  var sync = function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { ddeAiPaint(); } catch (e) { /* 무시 */ } }); };
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(sync);
    var start = function () { mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); sync(); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
  window.addEventListener('resize', function () { ddeAiPaint(); });
  window.addEventListener('hashchange', sync);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ddeAi.open || !ddeOnScreen()) return;
    // 다른 팝업이 떠 있으면 그 팝업이 먼저 닫히게 둠(보이는 팝업만 셈)
    var dlg = [].some.call(document.querySelectorAll('.modal-overlay, [role="dialog"]'), function (d) { return d.getClientRects().length && getComputedStyle(d).visibility !== 'hidden'; });
    if (!dlg) ddeAiToggle(false);
  });
  // 띄우기일 때 패널 바깥을 누르면 닫힘(상단 버튼 · 팝업 안 클릭은 제외)
  document.addEventListener('pointerdown', function (e) {
    if (!ddeAi.open || ddeMode() !== 'float' || !ddeOnScreen()) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.dde-ai, #dde-ai-btn, [role="dialog"], .modal-overlay')) return;
    ddeAiToggle(false);
  }, true);
})();

(function ddeInjectStyle() {
  if (typeof document === 'undefined' || document.getElementById('dde-style')) return;
  var st = document.createElement('style');
  st.id = 'dde-style';
  var P = '#s-budget .agent-ga > .dde-ai';
  var M = '#s-budget .agga-grid.b2c-main';
  st.textContent = [
    // ── 화면 안 Agent 탭 없애기 ──
    M + ' > .b2c-side{display:none !important}',
    M + ' > .agga-col.todo{grid-column:1 / -1 !important}',
    '#s-budget .b2c-side [data-tab="chat"]{display:none !important}',
    //   계정 상세 왼쪽 칸: 탭이 하나뿐이라 밑줄 없이 제목처럼
    '#s-budget .b2c-side .b2c-tab.on::after{display:none !important}',
    '#s-budget .b2c-side .b2c-tab.on{color:#1c2432 !important;cursor:default}',

    // ── 상단 버튼 ──
    '#dde-ai-btn{position:fixed;top:12px;right:120px;z-index:1200;height:32px;padding:0 14px;border-radius:16px;border:1.5px solid #2f5bea;'
      + 'background:#fff;color:#2f5bea;font:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}',
    '#dde-ai-btn:hover{background:#eef3ff}',
    '#dde-ai-btn.on{background:#2f5bea;color:#fff}',
    '#dde-ai-btn.on:hover{background:#2449c7}',

    // ── 옆에 붙이기: 본문이 패널 폭만큼 좁아짐 ──
    'body.dde-ai-dock .main .content{margin-right:calc(var(--dde-ai-w) + 8px) !important;transition:margin-right .15s}',
    'body.b2c-resizing.dde-ai-dock .main .content{transition:none}',

    // ── 패널 ──
    P + '{position:fixed;top:52px;right:0;bottom:0;width:var(--dde-ai-w);z-index:1100;display:none;flex-direction:column;'
      + 'background:#fff;border-left:1px solid #cfd6df;border-top:1px solid #dde2e9;border-radius:12px 0 0 0}',
    P + '.open{display:flex}',
    P + '.float{box-shadow:-10px 0 28px rgba(15,23,42,.22);border-left-color:#b9c1cc}',
    P + ' .dde-ai-head{display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;border-bottom:1px solid #e3e7ed;flex:0 0 auto}',
    P + ' .dde-ai-head strong{font-size:15px;font-weight:800;color:#1c2432;margin-right:auto;white-space:nowrap}',
    P + ' .dde-ai-seg{display:inline-flex;border:1px solid #cfd6df;border-radius:7px;overflow:hidden;flex:0 0 auto}',
    P + ' .dde-ai-seg button{border:0;background:#fff;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer;white-space:nowrap}',
    P + ' .dde-ai-seg button + button{border-left:1px solid #cfd6df}',
    P + ' .dde-ai-seg button.on{background:#1c2432;color:#fff}',
    P + ' .dde-ai-seg button:disabled{color:#b6bec9;cursor:not-allowed}',
    P + ' .dde-ai-x{width:30px;height:30px;border:1px solid #d3d9e2;border-radius:7px;background:#fff;color:#334155;font-size:14px;font-weight:700;cursor:pointer;flex:0 0 auto}',
    P + ' .dde-ai-x:hover{background:#f4f6f9;border-color:#94a3b8}',
    P + ' .dde-ai-body{flex:1 1 auto;min-height:0;display:flex}',
    P + ' .dde-ai-body > .agga-col.chat{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;height:auto !important;max-height:none !important;'
      + 'border:0 !important;box-shadow:none !important;border-radius:0 !important;background:transparent !important;margin:0 !important}',
    P + ' .dde-ai-body > .agga-col.chat > .agga-col-head{display:none !important}',
    P + ' .dde-ai-body > .agga-col.chat > .agga-col-body{flex:1 1 auto;min-height:0;overflow-y:auto}',
    P + ' .agga-chips{flex-wrap:wrap}',
    //   폭 조절 손잡이(왼쪽 경계)
    P + ' .dde-ai-split{position:absolute;top:0;bottom:0;left:-6px;width:12px;cursor:col-resize;touch-action:none;z-index:2}',
    P + ' .dde-ai-split i{position:absolute;top:50%;left:2px;width:8px;height:40px;margin-top:-20px;border-radius:99px;background:#fff;border:1px solid #cbd5e1;box-shadow:0 1px 2px rgba(15,23,42,.06)}',
    P + ' .dde-ai-split i::after{content:"";position:absolute;left:2px;right:2px;top:13px;bottom:13px;background:repeating-linear-gradient(#94a3b8 0 2px,transparent 2px 5px)}',
    P + ' .dde-ai-split:hover i, body.b2c-resizing ' + P + ' .dde-ai-split i{border-color:#2563eb}'
  ].join('\n');
  document.head.appendChild(st);
})();
