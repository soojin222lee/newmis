// ════════════════════════════════════════
//  수행원가 > 원가조정 — Agent 화면 예산 조정안 · 계정 상세 화면 정리       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 Agent 화면(budget-agent-console.js)의 화면 구성을 바꾸는 전용 파일입니다.
// - 공유 파일은 고치지 않고, 이 파일이 뒤에 로드되어 함수를 덮어씁니다.
// - 바꾸는 것
//   1) 계정 상세 맨 위 "예산 조정안 반영 내역" 칸을 뺍니다(renderAgentAcctAppliedFinal → 빈 문자열).
//      계정 상세는 바로 상세계정 탭 · 표로 시작합니다. 반영한 조정안은 [예산 조정안] 칸에서 확인합니다.
//   2) [예산 조정안] 칸 머리의 "검토 대기 N · 반영 N" 을 [전체] [검토 대기] [반영] 탭으로 바꿔, 누른 상태의 카드만 보이게 합니다.

/* ── 1. 계정 상세 맨 위 "예산 조정안 반영 내역" 빼기 ─────────────────────── */
renderAgentAcctAppliedFinal = function () { return ''; };

/* ── 2. [예산 조정안] 상태 탭 — [전체] [검토 대기] [반영] ─────────────────────
   원래는 머리에 "검토 대기 N · 반영 N" 숫자만 있고 카드가 섞여 있었습니다.
   그 자리를 탭으로 바꿔, 누른 상태의 카드만 보이게 합니다(기본 = 전체).
   카드가 반영됐는지는 카드의 on 표시(renderAgentGaCardFinal 의 .agga-card.on)로 가립니다. */
var bapTodoFilter = 'all';        // all | wait | on
function bapTodoFilterSet(k) { bapTodoFilter = k; renderBudgetPage(); }

var bapTodoBefore = renderAgentGaTodoFinal;
renderAgentGaTodoFinal = function () {
  const html = bapTodoBefore.apply(this, arguments);
  if (!html || typeof document === 'undefined' || !document.createElement) return html;
  const tpl = document.createElement('template');
  if (!tpl.content) return html;
  tpl.innerHTML = html;
  const group = tpl.content.querySelector('.agga-group');
  const head = group && group.querySelector('.agga-group-head');
  if (!head) return html;
  bapInjectStyle();
  const cards = Array.prototype.slice.call(group.children).filter(function (el) { return el.classList.contains('agga-card'); });
  const nOn = cards.filter(function (c) { return c.classList.contains('on'); }).length;
  const n = { all: cards.length, wait: cards.length - nOn, on: nOn };
  const tabs = [['all', '전체'], ['wait', '검토 대기'], ['on', '반영']];
  head.className = 'agga-group-head bap-tabs';
  head.setAttribute('role', 'tablist');
  head.innerHTML = tabs.map(function (t) {
    const sel = bapTodoFilter === t[0];
    return `<button class="bap-tab ${t[0]} ${sel ? 'sel' : ''}" role="tab" aria-selected="${sel}"
      onclick="bapTodoFilterSet('${t[0]}')">${t[1]}<em>${n[t[0]]}</em></button>`;
  }).join('');
  if (bapTodoFilter !== 'all') {
    const want = bapTodoFilter === 'on';
    cards.forEach(function (c) { if (c.classList.contains('on') !== want) c.remove(); });
    if (!n[bapTodoFilter]) {
      const e = document.createElement('div');
      e.className = 'ag-empty bap-empty';
      e.textContent = want ? '반영한 조정안이 없습니다. [검토 대기]에서 [반영]을 눌러 주세요.' : '검토 대기 중인 조정안이 없습니다.';
      group.appendChild(e);
    }
  }
  return tpl.innerHTML;
};

function bapInjectStyle() {
  if (document.getElementById('bap-style')) return;
  const st = document.createElement('style');
  st.id = 'bap-style';
  st.textContent = `
  .agga-group-head.bap-tabs { display:flex; gap:4px; padding:3px; margin:0 0 9px; background:#f1f5f9; border-radius:10px; }
  .bap-tab { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px; border:0; background:transparent;
    border-radius:8px; padding:6px 8px; font:inherit; font-size:12px; font-weight:800; color:#64748b; cursor:pointer; white-space:nowrap; }
  .bap-tab:hover { color:#1c2432; }
  .bap-tab em { font-style:normal; font-size:10.5px; font-weight:900; min-width:18px; padding:1px 6px; border-radius:999px;
    background:#e2e8f0; color:#475569; }
  .bap-tab.sel { background:#fff; color:#0b1220; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .bap-tab.wait.sel em { background:#f59e0b; color:#fff; }
  .bap-tab.on.sel em { background:#0f9d63; color:#fff; }
  .bap-tab.all.sel em { background:#1c2432; color:#fff; }
  .bap-empty { margin:6px 0 2px; }
  `;
  document.head.appendChild(st);
}
