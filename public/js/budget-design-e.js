// ════════════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 디자인 E안 (시안 브랜치 feature/nj-e)                              작성: 남주
//  D안(budget-design-d.js) 뒤에 로드되어 덮어씁니다. 원본 파일은 고치지 않습니다.
//
//   · 레이아웃은 D안 그대로(계정 상세 = 왼쪽 예산 조정안 · 오른쪽 상세, 위 계정 폴더 탭)
//   · Agent와 대화를 화면 안 탭에서 빼서, 브라우저 「Gemini에게 물어보기」처럼 오른쪽 AI 패널로.
//       - 상단 오른쪽 [✦ AI에게 물어보기] 버튼으로 켜고 끔
//       - 켜면 사이드바: 패널이 오른쪽 자리를 차지하고 화면이 그만큼 좁아짐
//         창이 좁으면(1360px 미만) 화면을 줄이지 않고 오른쪽에 덮어서 뜸(오버레이)
//       - 패널 머리의 [⧉] 아이콘 = 새 창처럼 띄우기: 머리를 끌어 옮기고, 오른쪽 아래 모서리로 크기 조절
//       - 띄운 창의 ✕ = 다시 사이드바로. 사이드바의 ✕ = 패널 끄기
//       - 계정 탭을 바꾸거나 다른 메뉴 화면으로 옮겨도 꺼지지 않음(패널은 화면 밖 body 에 있음)
//       - 사이드바 왼쪽 경계를 끌어 폭 조절, 더블클릭 = 기본 폭
//   · 프로젝트 메인: 예산 조정안이 전체 폭. 계정 상세: 왼쪽 칸은 예산 조정안만(탭 없음)
//   · 대화 칸(.agga-col.chat)은 공유 렌더러가 그대로 그리고, 그린 직후 이 패널로 옮깁니다.
// ════════════════════════════════════════════════════════════════════════════════

var DDE_AI = { min: 340, def: 420, max: 680, narrow: 1360, top: 52, winMinW: 340, winMinH: 360 };
var ddeAi = (function () {
  var d = { open: false, win: false, w: 0, fx: null, fy: null, fw: 0, fh: 0 };
  try {
    var s = JSON.parse(localStorage.getItem('dde-ai') || '{}');
    return {
      open: !!s.open, win: !!s.win, w: Number(s.w) || 0,
      fx: (typeof s.fx === 'number') ? s.fx : null, fy: (typeof s.fy === 'number') ? s.fy : null,
      fw: Number(s.fw) || 0, fh: Number(s.fh) || 0
    };
  } catch (e) { return d; }
})();
function ddeSave() { try { localStorage.setItem('dde-ai', JSON.stringify(ddeAi)); } catch (e) { /* 저장 막힘 */ } }
function ddeNarrow() { return window.innerWidth < DDE_AI.narrow; }
// 보이는 방식: win = 띄운 창 · over = 좁은 창에서 오른쪽에 덮기 · dock = 사이드바(화면 줄임)
function ddeMode() { return ddeAi.win ? 'win' : (ddeNarrow() ? 'over' : 'dock'); }
function ddeWidth() {
  var max = Math.min(DDE_AI.max, Math.round(window.innerWidth * 0.5));
  return Math.min(Math.max(ddeAi.w || DDE_AI.def, DDE_AI.min), Math.max(DDE_AI.min, max));
}
// 띄운 창 위치 · 크기(화면 밖으로 나가지 않게)
function ddeWinRect() {
  var vw = window.innerWidth, vh = window.innerHeight;
  var w = Math.min(Math.max(ddeAi.fw || 440, DDE_AI.winMinW), vw - 16);
  var h = Math.min(Math.max(ddeAi.fh || Math.min(640, vh - 120), DDE_AI.winMinH), vh - 16);
  var x = (ddeAi.fx === null) ? vw - w - 40 : ddeAi.fx;
  var y = (ddeAi.fy === null) ? 90 : ddeAi.fy;
  x = Math.min(Math.max(8, x), vw - w - 8);
  y = Math.min(Math.max(8, y), vh - 48);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}
function ddeOnBudget() { return !!document.querySelector('#s-budget.active .agent-ga'); }

var DDE_ICON_POP = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="2" y="4.5" width="9.5" height="9.5" rx="1.5"/><path d="M7 2h7v7"/><path d="M14 2 8 8"/></svg>';
var DDE_ICON_DOCK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M10 2.5v11" /><path d="M10 2.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-3z" fill="currentColor" stroke="none"/></svg>';

// ── AI 패널 뼈대 — 화면이 바뀌어도 남도록 body 에 둠(대화 칸은 그린 뒤 옮겨 넣음) ──
function ddePanel() {
  var p = document.getElementById('dde-ai');
  if (p) return p;
  if (!document.body) return null;
  p = document.createElement('aside');
  p.id = 'dde-ai';
  p.className = 'dde-ai';
  p.setAttribute('aria-label', 'AI Agent');
  p.innerHTML = '<div class="dde-ai-split" role="separator" aria-orientation="vertical" title="끌어서 폭 조절 · 더블클릭하면 기본 폭"'
    + ' onpointerdown="ddeAiSplitStart(event)" ondblclick="ddeAiSplitReset()"><i></i></div>'
    + '<div class="dde-ai-head" onpointerdown="ddeAiDragStart(event)"><strong>✦ AI Agent</strong>'
    + '<button type="button" class="dde-ai-ico dde-ai-pop" onclick="ddeAiPop()"></button>'
    + '<button type="button" class="dde-ai-ico dde-ai-x" onclick="ddeAiClose()">✕</button></div>'
    + '<div class="dde-ai-body"><div class="dde-ai-empty">프로젝트의 <b>원가조정</b> 화면을 한 번 열면<br>여기서 Agent와 대화할 수 있어요.</div></div>'
    + '<div class="dde-ai-grip" title="끌어서 창 크기 조절" onpointerdown="ddeAiGripStart(event)"></div>';
  document.body.appendChild(p);
  return p;
}

// 상단 오른쪽 [✦ AI에게 물어보기] — 공유 셸을 고치지 않고 화면 위에 고정 버튼으로 띄움(Admin 버튼 왼쪽)
function ddeBtn() {
  var b = document.getElementById('dde-ai-btn');
  if (!b && document.body) {
    b = document.createElement('button');
    b.type = 'button';
    b.id = 'dde-ai-btn';
    b.setAttribute('onclick', 'ddeAiToggle()');
    b.innerHTML = '<span aria-hidden="true">✦</span> AI에게 물어보기';
    document.body.appendChild(b);
  }
  return b;
}

// 열림 · 방식 · 폭 · 창 위치를 화면에 반영(여러 번 불려도 같은 결과)
function ddeAiPaint() {
  var b = ddeBtn();
  if (!b) return;
  var adm = document.getElementById('admin-entry');
  if (adm && adm.getClientRects().length) {
    var r = adm.getBoundingClientRect();
    b.style.top = Math.round(r.top + (r.height - 32) / 2) + 'px';
    b.style.right = Math.round(window.innerWidth - r.left + 8) + 'px';
  }
  var open = ddeAi.open, mode = ddeMode(), w = ddeWidth();
  b.classList.toggle('on', open);
  b.setAttribute('aria-pressed', open ? 'true' : 'false');
  b.title = open ? 'AI 패널 끄기' : 'AI 패널 켜기';
  document.body.classList.toggle('dde-ai-dock', open && mode === 'dock');
  document.body.style.setProperty('--dde-ai-w', w + 'px');
  var p = ddePanel();
  if (!p) return;
  p.classList.toggle('open', open);
  p.classList.toggle('over', mode === 'over');
  p.classList.toggle('win', mode === 'win');
  if (mode === 'win') {
    var R = ddeWinRect();
    p.style.left = R.x + 'px'; p.style.top = R.y + 'px';
    p.style.width = R.w + 'px'; p.style.height = R.h + 'px';
  } else {
    p.style.left = ''; p.style.top = ''; p.style.width = ''; p.style.height = '';
  }
  var pop = p.querySelector('.dde-ai-pop'), x = p.querySelector('.dde-ai-x');
  var popTip = mode === 'win' ? '오른쪽 사이드바로 다시 붙이기' : '새 창으로 띄우기 — 끌어서 옮겨 가며 볼 수 있어요';
  if (pop && pop.getAttribute('data-m') !== mode) {
    pop.setAttribute('data-m', mode);
    pop.innerHTML = mode === 'win' ? DDE_ICON_DOCK : DDE_ICON_POP;
    pop.title = popTip; pop.setAttribute('aria-label', popTip);
    var xTip = mode === 'win' ? '창 닫기 — 오른쪽 사이드바로 돌아가요' : 'AI 패널 끄기';
    x.title = xTip; x.setAttribute('aria-label', xTip);
  }
  // 대화 칸이 아직 없을 때만 안내 문구
  var empty = p.querySelector('.dde-ai-empty');
  if (empty) empty.style.display = p.querySelector('.dde-ai-body > .agga-col.chat') ? 'none' : '';
}
// 화면 폭이 바뀌면 D안 칸 폭 · 숫자 크기도 다시 맞춤
function ddeRelayout() {
  if (!ddeOnBudget()) return;
  try { if (typeof b2cPaint === 'function') b2cPaint(); } catch (e) { /* 무시 */ }
  try { if (typeof agentTopStickCheckFinal === 'function') agentTopStickCheckFinal(); } catch (e) { /* 무시 */ }
}

function ddeAiToggle(on) {                     // crud N — AI 패널 켜기/끄기(상단 버튼). 켜면 늘 사이드바로 시작
  ddeAi.open = (on === undefined) ? !ddeAi.open : !!on;
  ddeAi.win = false;
  ddeSave();
  ddeAiPaint();
  ddeRelayout();
  if (ddeAi.open) ddeAiFocus();
}
function ddeAiClose() {                        // crud N — ✕: 띄운 창이면 사이드바로 돌아가고, 사이드바면 끔
  if (ddeAi.win) { ddeAi.win = false; ddeSave(); ddeAiPaint(); ddeRelayout(); return; }
  ddeAiToggle(false);
}
function ddeAiPop() {                          // crud N — [⧉] 새 창으로 띄우기 ↔ 사이드바로 붙이기
  ddeAi.win = !ddeAi.win;
  ddeAi.open = true;
  ddeSave();
  ddeAiPaint();
  ddeRelayout();
}
function ddeAiFocus() {
  var p = document.getElementById('dde-ai');
  if (!p) return;
  var body = p.querySelector('.agga-col-body.chat');
  if (body) body.scrollTop = body.scrollHeight;
  var inp = p.querySelector('.agga-input input');
  if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
}

// 공용 끌기 도우미 — 움직이는 동안 move(dx,dy), 놓으면 저장
function ddeDrag(ev, move) {
  ev.preventDefault();
  var x0 = ev.clientX, y0 = ev.clientY;
  document.body.classList.add('b2c-resizing');
  var mv = function (e) { move(e.clientX - x0, e.clientY - y0); };
  var up = function () {
    document.removeEventListener('pointermove', mv);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('b2c-resizing');
    ddeSave();
  };
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', up);
}
// 사이드바 왼쪽 경계 끌기 — 왼쪽으로 끌면 넓어짐
function ddeAiSplitStart(ev) {                 // crud N — AI 사이드바 폭 조절
  var p = document.getElementById('dde-ai');
  if (!p || ddeAi.win) return;
  var w0 = p.getBoundingClientRect().width;
  ddeDrag(ev, function (dx) {
    ddeAi.w = Math.round(Math.max(DDE_AI.min, w0 - dx));
    ddeAiPaint(); ddeRelayout();
    ddeAi.w = ddeWidth();
  });
}
function ddeAiSplitReset() {                   // crud N — AI 사이드바 기본 폭으로
  ddeAi.w = 0; ddeSave(); ddeAiPaint(); ddeRelayout();
}
// 띄운 창: 머리를 끌어 옮기기
function ddeAiDragStart(ev) {                  // crud N — 띄운 창 옮기기
  if (!ddeAi.win || ev.button !== 0) return;
  if (ev.target.closest && ev.target.closest('button')) return;
  var R = ddeWinRect();
  ddeDrag(ev, function (dx, dy) {
    ddeAi.fx = R.x + dx; ddeAi.fy = R.y + dy;
    ddeAiPaint();
    var N = ddeWinRect(); ddeAi.fx = N.x; ddeAi.fy = N.y;
  });
}
// 띄운 창: 오른쪽 아래 모서리로 크기 조절
function ddeAiGripStart(ev) {                  // crud N — 띄운 창 크기 조절
  if (!ddeAi.win) return;
  var R = ddeWinRect();
  ddeAi.fx = R.x; ddeAi.fy = R.y;
  ddeDrag(ev, function (dx, dy) {
    ddeAi.fw = Math.max(DDE_AI.winMinW, R.w + dx);
    ddeAi.fh = Math.max(DDE_AI.winMinH, R.h + dy);
    ddeAiPaint();
    var N = ddeWinRect(); ddeAi.fw = N.w; ddeAi.fh = N.h;
  });
}

// ── 그려질 때마다: 대화 칸을 AI 패널로 옮기고, 화면 안 Agent 탭은 숨김 ──
if (typeof b2cApply === 'function') {
  var ddeApplyBefore = b2cApply;
  b2cApply = function () {
    var g = b2cGrid();
    // 이미 옮겨 둔 상태(같은 그리드 · 대화 칸이 패널에 있음)에서 다시 불리면 칸 옮기기는 건너뜀
    //   — 원래 함수는 그리드 안에 대화 칸이 없으면 화면 전체를 다시 그려서, 입력 중인 글자가 사라짐
    var held = document.querySelector('#dde-ai .dde-ai-body > .agga-col.chat');
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
// 예전 [💬 Agent와 대화] 처럼 대화 탭을 여는 곳은 AI 패널을 엽니다(이미 켜져 있으면 그대로)
if (typeof b2cTab === 'function') {
  var ddeTabBefore = b2cTab;
  b2cTab = function (tab) {
    if (tab === 'chat') {
      if (!ddeAi.open) ddeAiToggle(true); else ddeAiFocus();
      return;
    }
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
  // 창 폭이 바뀌면: 넓으면 사이드바(화면 줄임) · 좁으면 오버레이로 자동 전환
  var lastNarrow = null;
  window.addEventListener('resize', function () {
    ddeAiPaint();
    var n = ddeNarrow();
    if (n !== lastNarrow) { lastNarrow = n; ddeRelayout(); }
  });
  window.addEventListener('hashchange', sync);
})();

(function ddeInjectStyle() {
  if (typeof document === 'undefined' || document.getElementById('dde-style')) return;
  var st = document.createElement('style');
  st.id = 'dde-style';
  var P = '#dde-ai';
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

    // ── 사이드바: 본문이 패널 폭만큼 좁아짐 ──
    'body.dde-ai-dock .main .content{margin-right:calc(var(--dde-ai-w) + 8px) !important;transition:margin-right .15s}',
    'body.b2c-resizing.dde-ai-dock .main .content{transition:none}',
    'body.b2c-resizing{user-select:none}',

    // ── 패널(사이드바 기본) ──
    P + '{position:fixed;top:' + DDE_AI.top + 'px;right:0;bottom:0;width:var(--dde-ai-w);z-index:1100;display:none;flex-direction:column;'
      + 'background:#fff;border-left:1px solid #cfd6df;border-top:1px solid #dde2e9;border-radius:12px 0 0 0;font-size:14px}',
    P + '.open{display:flex}',
    //   패널이 원가조정 화면(.agent-ai · .agent-ga) 밖 body 에 있어서, 그 안에만 걸린 대화 색 · 말풍선 규칙을 여기서 다시 줌
    //   (없으면 내 말풍선 배경이 빠져 흰 글자가 안 보임)
    P + '{--ai-ink:#0b1220;--ai-line:#e7ebf3;--ai-soft:#f6f8fc}',
    P + ' .agai-bubble{max-width:82%;font-size:13.5px}',
    //   좁은 창: 화면 위에 덮어서(뒤 화면 폭 그대로)
    P + '.over{box-shadow:-10px 0 28px rgba(15,23,42,.22);border-left-color:#b9c1cc}',
    //   띄운 창: 옮길 수 있는 창
    P + '.win{right:auto;bottom:auto;z-index:1150;border:1px solid #b9c1cc;border-radius:12px;box-shadow:0 18px 48px rgba(15,23,42,.28)}',
    P + '.win .dde-ai-head{cursor:move;border-radius:12px 12px 0 0;background:#f6f8fb}',
    P + '.win .dde-ai-split{display:none}',
    P + ':not(.win) .dde-ai-grip{display:none}',

    P + ' .dde-ai-head{display:flex;align-items:center;gap:6px;padding:9px 10px 9px 16px;border-bottom:1px solid #e3e7ed;flex:0 0 auto;touch-action:none}',
    P + ' .dde-ai-head strong{font-size:15px;font-weight:800;color:#1c2432;margin-right:auto;white-space:nowrap}',
    P + ' .dde-ai-ico{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:7px;'
      + 'background:transparent;color:#475569;font-size:14px;font-weight:700;cursor:pointer;flex:0 0 auto;padding:0}',
    P + ' .dde-ai-ico:hover{background:#eef1f5;border-color:#d3d9e2;color:#1c2432}',
    P + ' .dde-ai-body{flex:1 1 auto;min-height:0;display:flex}',
    P + ' .dde-ai-empty{margin:auto;padding:24px;text-align:center;color:#64748b;line-height:1.7}',
    P + ' .dde-ai-body > .agga-col.chat{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;height:auto !important;max-height:none !important;'
      + 'border:0 !important;box-shadow:none !important;border-radius:0 !important;background:transparent !important;margin:0 !important}',
    P + ' .dde-ai-body > .agga-col.chat > .agga-col-head{display:none !important}',
    P + ' .dde-ai-body > .agga-col.chat > .agga-col-body{flex:1 1 auto;min-height:0;overflow-y:auto}',
    P + ' .agga-chips{flex-wrap:wrap}',
    //   사이드바 폭 조절 손잡이(왼쪽 경계)
    P + ' .dde-ai-split{position:absolute;top:0;bottom:0;left:-6px;width:12px;cursor:col-resize;touch-action:none;z-index:2}',
    P + ' .dde-ai-split i{position:absolute;top:50%;left:2px;width:8px;height:40px;margin-top:-20px;border-radius:99px;background:#fff;border:1px solid #cbd5e1;box-shadow:0 1px 2px rgba(15,23,42,.06)}',
    P + ' .dde-ai-split i::after{content:"";position:absolute;left:2px;right:2px;top:13px;bottom:13px;background:repeating-linear-gradient(#94a3b8 0 2px,transparent 2px 5px)}',
    P + ' .dde-ai-split:hover i, body.b2c-resizing ' + P + ' .dde-ai-split i{border-color:#2563eb}',
    //   띄운 창 크기 조절 손잡이(오른쪽 아래 모서리)
    P + ' .dde-ai-grip{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;touch-action:none;z-index:2;'
      + 'background:linear-gradient(135deg,transparent 0 50%,#94a3b8 50% 58%,transparent 58% 68%,#94a3b8 68% 76%,transparent 76%);border-radius:0 0 12px 0}'
  ].join('\n');
  document.head.appendChild(st);
})();
