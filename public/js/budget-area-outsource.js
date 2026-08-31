// AI GUIDE: 수행원가 > 원가조정 > 외주비(CATS[1]) 계정 전용 진입 소스입니다.
// - URL: #/budget-adjust/outsource
// - 외주비 계정 편집기 진입점(데코레이터)과 상세계정 분기(renderBpoOutsourcePanelFinal)를 이 파일이 소유합니다.
// - 상세계정 패널(외주출장 renderBpoTravelPanelV2 / 공사MA renderBpoMaPanelV2 / 이관 renderBpoTransferPanelV2 /
//   기타 renderBpoOtherPanelV2 / 탭 renderBpoKindTabsV2Final 등)은 budget-status-2.js에 있는 공유 코어를
//   런타임 호출합니다. 단 실투입('direct')의 등록/수정 폼은 공유 renderBpoContractFormV2(견적 연동 폼) 대신
//   이 파일의 osv3RenderVendorFormV3(업체 예산 4항목)을 사용합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).
//
// [이 파일이 소유한 외주비 전용 확장 — 접두사 osv3 / CSS 클래스 .osv3-*]
// 1) 예산내역 트리: renderAccountMonthlyBudgetTable 을 CATS[1]만 가로채, 상세계정 6개의 합계를 보여주는
//    "외주비" 부모행을 만들고 기본 접힘 + 화살표로 펼치기. (다른 계정은 이전 정의로 위임)
// 2) 실투입대상 외주비: renderBpoContractPanelV2('direct') 만 가로채, "업체별 예산 1행 + PO N건" 구조로 교체.
//    PO별 월별 검수계획(PM 입력) / 구매시스템 견적 팝업 / 분기 편중 예산 통제를 포함합니다.
//    'professional' 등 나머지 kind는 이전 정의로 위임하므로 기존 UI가 그대로 유지됩니다.
// - 전용 CSS는 공유 파일(css/sk-theme.css)을 건드리지 않기 위해 이 파일이 <style>로 직접 주입합니다.

/* ==========================================================================
   0. 전용 스타일 주입 (공유 CSS 미변경)
   ========================================================================== */
(function injectOutsourceStyleV3() {
  if (document.getElementById('osv3-style')) return;
  const style = document.createElement('style');
  style.id = 'osv3-style';
  style.textContent = `
  /* ── 0-1. 외주비 화면의 겉박스 제거 ──
     "외주비 수정"(.setup-editor)과 "외주비 예산내역"(.account-monthly-card)의 테두리·배경·패딩을 없앱니다.
     두 클래스는 인건비·재료비·경비·A/S 화면도 함께 쓰므로 전역으로 손대지 않고, 외주비 데코레이터가 붙이는
     .osv3-flat 마커와 조합한 선택자(클래스 2개)로만 적용합니다 → sk-theme의 !important 규칙을 특이도로 이깁니다. */
  .setup-editor.osv3-flat,
  .account-monthly-card.osv3-flat {
    border:0 !important; border-radius:0 !important; background:transparent !important;
    box-shadow:none !important; padding:0 !important;
  }
  /* 겉박스가 사라져도 표 자체는 흰 바탕을 유지합니다(페이지 배경이 미색이라 행이 묻히지 않게) */
  .account-monthly-card.osv3-flat .account-monthly-table,
  .osv3-shell .bpo-list-table { background:#fff; }

  /* ── 1. 예산내역 트리 ── */
  .account-monthly-table tr.osv3-parent td { background:#f7f9fc; font-weight:700; }
  .account-monthly-table tr.osv3-parent td.acct-name { cursor:pointer; }
  .osv3-toggle {
    display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px;
    margin-right:6px; border:1px solid var(--sk-border-strong); border-radius:5px;
    background:#fff; color:var(--sk-muted); font-size:11px; line-height:1; cursor:pointer; padding:0;
  }
  .osv3-toggle:hover { border-color:var(--sk-blue); color:var(--sk-blue); }
  .osv3-count { margin-left:6px; font-weight:600; font-size:11px; color:var(--sk-muted); }
  .account-monthly-table tr.osv3-child td.acct-name { padding-left:30px; font-weight:500; }
  .osv3-ico { display:inline-block; width:14px; margin-right:6px; text-align:center; font-size:11px; }

  /* ── 2. 실투입대상 외주비 보드 ── */
  /* 래퍼는 테두리 없이 간격만 담당합니다(박스 중첩 방지). 보이는 테두리는 탭 버튼과 본문 카드뿐입니다. */
  .osv3-shell { margin:0 0 16px; }

  /* 헤드 라인 — 6개 탭 공통. [탭별 안내] [요약] [신규등록]을 한 줄에 담고 높이를 고정해
     어느 탭을 선택해도 아래 표가 같은 높이에서 시작하도록 합니다. */
  .osv3-board { margin-top:0; }
  .osv3-headrow { display:flex; align-items:center; gap:12px; margin:14px 0 0; min-height:54px; }
  .osv3-headrow > .osv3-headinfo { flex:1 1 auto; min-width:0; }
  .osv3-headrow > .labor-main-btn { flex:0 0 auto; margin-left:auto; }
  .osv3-headrow .osv3-board-sum { flex:0 0 auto; }
  /* 안내 박스(경고/등록 기준)는 한 줄 높이로 통일하고, 넘치는 문장은 title 툴팁으로 넘깁니다 */
  .osv3-headrow .osv3-alert,
  .osv3-headrow .bpo-rule-note {
    display:flex; align-items:center; gap:10px; margin:0; padding:9px 14px;
    border-radius:12px; font-size:14px; line-height:1.4; white-space:nowrap; overflow:hidden;
  }
  .osv3-headrow .osv3-alert > div,
  .osv3-headrow .bpo-rule-note span {
    flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis;
    font-size:14px; text-align:left;
  }
  .osv3-headrow .bpo-rule-note { cursor:help; }
  .osv3-headrow .bpo-rule-note strong { flex:0 0 auto; }
  .osv3-board-sum { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:700; color:var(--sk-muted); white-space:nowrap; }
  .osv3-board-sum b { color:var(--sk-text); }

  .osv3-alert { display:flex; gap:12px; align-items:flex-start; padding:12px 14px; border-radius:14px; font-size:14px; font-weight:700; margin-bottom:8px; border:1px solid; line-height:1.5; }
  .osv3-alert em { font-style:normal; font-weight:700; white-space:nowrap; }
  .osv3-alert.ok    { background:#eefaf5; border-color:#bfe8d8; color:#146c50; }
  .osv3-alert.warn  { background:#fff8e8; border-color:#f3ddad; color:#8a5b06; }

  /* AI 예산 알림 해설 (원가조정 계정 공용) */
  .budget-ai-btn {
    flex:0 0 auto; border:1px solid currentColor; border-radius:8px; background:#fff;
    padding:6px 12px; font-size:13px; font-weight:800; color:inherit; cursor:pointer; white-space:nowrap;
  }
  .budget-ai-btn:hover { background:currentColor; color:#fff; }
  .budget-ai-slot { display:block; }
  .budget-ai-slot:empty { display:none; }
  .budget-ai-loading { display:block; margin-top:8px; font-size:13px; font-weight:600; opacity:.75; }
  .budget-ai-error { display:block; margin-top:8px; font-size:13px; font-weight:600; color:var(--sk-red-deep); }
  .budget-ai-result { margin:9px 0 0; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,.75); border:1px solid rgba(0,0,0,.06); }
  .budget-ai-result > div { display:flex; gap:8px; margin-bottom:5px; }
  .budget-ai-result dt { flex:0 0 34px; font-size:12px; font-weight:800; opacity:.7; }
  .budget-ai-result dd { margin:0; font-size:13px; font-weight:600; line-height:1.5; }
  .budget-ai-meta { margin:7px 0 0; font-size:11px; font-weight:600; opacity:.6; }

  .osv3-hint { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; margin-left:6px; flex:0 0 auto;
    border-radius:50%; border:1px solid var(--sk-border-strong); background:#fff; color:var(--sk-muted);
    font-size:11px; font-weight:700; cursor:help; vertical-align:middle; }
  .osv3-hint:hover { border-color:var(--sk-blue); color:var(--sk-blue); }

  /* 각 상세계정 표를 감싸던 노란 박스(.bpo-list-card = border 1px #fed7aa + padding 14px) 제거.
     이 클래스는 인건비·재료비의 이관 목록(budget-status-4/5.js)에서도 쓰이므로 전역으로 손대지 않고
     외주비 영역(.osv3-shell) 안쪽으로만 한정합니다. 가로 스크롤은 표가 넓으므로 유지합니다. */
  .osv3-shell .bpo-list-card {
    border:0; padding:0; background:transparent; border-radius:0;
    margin-top:14px; overflow-x:auto;
  }

  /* 업체 표는 다른 상세계정(외주출장비 등)과 같은 .bpo-list-table 을 함께 걸어
     글자 크기·행 높이(15px / padding 12·14px)를 공유합니다. 여기서는 색과 배치만 덧입힙니다. */
  .osv3-table { background:#fff; }
  .osv3-table th, .osv3-table td { text-align:left; vertical-align:middle; }
  .osv3-table th { white-space:nowrap; }
  .osv3-table td.num, .osv3-table th.num { text-align:right; white-space:nowrap; }
  .osv3-table tr.osv3-vendor > td { background:#fffaf0; border-top:1px solid #f0dcb4; }
  .osv3-table tr.osv3-vendor.open > td { background:#fff6e2; }
  .osv3-vendor-name { display:flex; align-items:center; gap:8px; }
  .osv3-vendor-name small { display:block; margin-top:2px; color:var(--sk-muted); font-size:13px; font-weight:500; }
  .osv3-good { color:var(--sk-green); font-weight:700; }
  .osv3-plan-amt { color:var(--sk-blue); font-weight:700; }

  .osv3-bar { position:relative; height:5px; margin-top:5px; border-radius:3px; background:#e9edf4; overflow:hidden; }
  .osv3-bar > i { display:block; height:100%; border-radius:3px; background:var(--sk-blue); }
  .osv3-bar.warn > i { background:var(--sk-yellow); }

  .osv3-mini { border:1px solid var(--sk-border-strong); background:#fff; border-radius:7px; padding:5px 10px; font-size:13px; font-weight:700; cursor:pointer; color:var(--sk-text); white-space:nowrap; }
  .osv3-mini:hover { border-color:var(--sk-blue); color:var(--sk-blue); }
  .osv3-mini.danger:hover { border-color:var(--sk-red); color:var(--sk-red); }
  .osv3-mini.round { border-radius:50%; width:28px; height:28px; padding:0; }
  .osv3-mini[disabled] { opacity:.45; cursor:not-allowed; }
  .osv3-mini.active { background:var(--sk-yellow); border-color:var(--sk-yellow); color:#fff; font-weight:700; }
  .osv3-actions { display:flex; gap:5px; justify-content:flex-end; align-items:center; }

  /* 외주구매 계획 블록 */
  .osv3-po-wrap > td { background:#fbfcfe !important; padding:0 !important; border-bottom:2px solid var(--sk-border-strong) !important; }
  .osv3-po-head { display:flex; align-items:center; gap:8px; padding:7px 12px; border-bottom:1px solid var(--sk-border); }
  .osv3-badge { background:var(--sk-blue-soft); color:var(--sk-blue-deep); border-radius:5px; padding:3px 9px; font-size:13px; font-weight:800; white-space:nowrap; }
  .osv3-po-head b { font-size:13px; color:#55617a; white-space:nowrap; margin-left:auto; }
  .osv3-po-table { width:100%; border-collapse:collapse; }
  .osv3-po-table th, .osv3-po-table td { border-bottom:1px solid var(--sk-border); padding:10px 12px; font-size:14px; text-align:left; }
  .osv3-po-table th { background:#f4f6fa; font-size:13px; color:#6b7689; font-weight:800; white-space:nowrap; }
  .osv3-po-table td.num, .osv3-po-table th.num { text-align:right; white-space:nowrap; font-weight:800; }
  .osv3-po-no b { color:var(--sk-text); }
  .osv3-po-no small { display:block; color:var(--sk-muted); font-size:12px; font-weight:500; }
  /* 계획 라인: 계약 전(초안)은 입력 가능, 계약 후(확정)는 조회 전용 */
  .osv3-po-table tr.osv3-line-fixed > td { background:#fbfcfe; }
  .osv3-inline-range { display:flex; align-items:center; gap:6px; }
  .osv3-inline-range input { border:1px solid var(--sk-yellow); border-radius:6px; padding:5px 7px;
    font-size:13px; font-weight:700; background:#fff; color:var(--sk-text); font-family:inherit; }
  .osv3-inline-range em { flex:0 0 auto; font-style:normal; color:var(--sk-muted); font-weight:700; }
  .osv3-line-amt { width:132px !important; max-width:132px; box-sizing:border-box; border:1px solid var(--sk-yellow); border-radius:6px;
    padding:6px 9px; font-size:14px; font-weight:800; text-align:right; background:#fff; color:var(--sk-text); }
  .osv3-wait { color:var(--sk-muted); font-size:13px; font-weight:700; }
  .osv3-empty { color:#c3cad6; }
  .osv3-po-table tr.osv3-line-open > td { background:#fff9ec; border-top:1px dashed #e5c98a;
    color:#8a6a1f; font-size:13px; font-weight:700; }
  .osv3-po-table tr.osv3-line-open > td b { color:#7a5a12; }
  .osv3-line-none { color:var(--sk-muted); font-size:13px; font-weight:700; text-align:center !important; }

  .osv3-q { background:#eef2f7; border-radius:5px; padding:3px 9px; font-size:13px; font-weight:800; color:#55617a; white-space:nowrap; }

  /* 월별 검수계획 조정 */
  .osv3-plan { padding:14px; background:#fff; border-top:1px dashed var(--sk-border-strong); }
  .osv3-plan-head { display:flex; align-items:center; gap:6px; margin-bottom:9px; }
  .osv3-plan-head strong { font-size:14px; color:var(--sk-blue-deep); }
  .osv3-help { display:inline-flex; align-items:center; justify-content:center; width:17px; height:17px; border-radius:50%; border:1px solid var(--sk-border-strong); font-size:11px; color:var(--sk-muted); cursor:help; }
  .osv3-plan-grid { display:flex; flex-wrap:wrap; gap:10px; }
  .osv3-cell { width:132px; }
  .osv3-cell label { display:block; font-size:12px; color:var(--sk-muted); margin-bottom:4px; white-space:nowrap; }
  .osv3-cell label em { font-style:normal; color:var(--sk-green); font-weight:700; }
  .osv3-cell input { width:100%; box-sizing:border-box; border:1px solid var(--sk-border-strong); border-radius:6px; padding:7px 9px; font-size:14px; font-weight:700; text-align:right; margin-bottom:4px; background:#fff; color:var(--sk-text); }
  .osv3-cell input.mm { font-size:13px; font-weight:500; color:#55617a; }
  .osv3-cell input[readonly] { background:#f4f6fa; color:var(--sk-muted); }
  .osv3-cell.edit input:not([readonly]) { border-color:var(--sk-yellow); }
  .osv3-plan-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; flex-wrap:wrap; }
  .osv3-chip { border-radius:999px; padding:6px 14px; font-size:13px; font-weight:700; }
  .osv3-chip.ok  { background:#eefaf5; color:#146c50; border:1px solid #bfe8d8; }
  .osv3-chip.bad { background:#fdecef; color:var(--sk-red-deep); border:1px solid #f6c3ce; }

  /* 업체별 예산 편집기 */
  /* 기간 입력은 다른 탭의 복합 셀과 같은 .bpo-input-button(flex/gap:6px)을 재사용하고, 구분자만 여기서 정의합니다 */
  .osv3-range { align-items:center; }
  .osv3-range em { flex:0 0 auto; font-style:normal; color:var(--sk-muted); font-weight:700; }
  .osv3-hangul { display:block; min-height:16px; color:var(--sk-blue-deep); font-size:12px; font-weight:700; }
  .osv3-form-note { margin:12px 0 0; padding:9px 12px; border-radius:8px; background:var(--sk-blue-soft); border:1px solid #cfe0fb; color:var(--sk-blue-deep); font-size:12px; line-height:1.6; }

  /* 견적 팝업 */
  .osv3-overlay { position:fixed; inset:0; background:rgba(17,22,33,.45); display:flex; align-items:center; justify-content:center; z-index:120; padding:24px; }
  .osv3-modal { background:#fff; border-radius:14px; width:min(620px,100%); max-height:88vh; overflow:auto; box-shadow:0 24px 60px rgba(15,23,42,.28); padding:20px 22px; }
  .osv3-modal-ico { width:34px; height:34px; border-radius:9px; background:#fff2df; color:#c1770a; display:flex; align-items:center; justify-content:center; font-size:16px; margin-bottom:12px; }
  .osv3-modal h4 { margin:0 0 5px; font-size:15px; color:var(--sk-text); }
  .osv3-modal p.sub { margin:0 0 16px; font-size:13px; color:var(--sk-muted); line-height:1.5; }
  .osv3-modal h5 { margin:16px 0 6px; font-size:14px; color:var(--sk-text); }
  .osv3-qt { width:100%; border-collapse:collapse; }
  .osv3-qt th, .osv3-qt td { border-bottom:1px solid var(--sk-border); padding:9px 10px; font-size:14px; text-align:left; }
  .osv3-qt th { color:#6b7689; font-size:13px; font-weight:800; }
  .osv3-qt td.num, .osv3-qt th.num { text-align:right; }
  .osv3-qt tr.total td { background:#f4f6fa; font-weight:700; }
  .osv3-modal-foot { display:grid; gap:8px; margin-top:18px; }
  .osv3-btn-ghost { border:1px solid var(--sk-border); background:#f7f8fb; border-radius:9px; padding:11px; font-size:13px; cursor:pointer; color:var(--sk-text); }
  .osv3-btn-primary { border:0; background:#4b45d6; color:#fff; border-radius:9px; padding:12px; font-size:13px; font-weight:700; cursor:pointer; }
  .osv3-btn-primary:hover { background:#3b36ad; }
  `;
  document.head.appendChild(style);
})();

/* ==========================================================================
   0-2. AI 예산 알림 해설 클라이언트 (원가조정 계정 파일 공용)
   ==========================================================================
   서버의 /api/ai/explain 을 불러 "원인 / 영향 / 조치" 3줄을 받아옵니다.
   API 키는 서버(.env)에만 있고 브라우저로 내려오지 않습니다 — 여기서는 숫자·상황만 보냅니다.
   budget-area-outsource.js 가 budget-area-labor.js 보다 먼저 로드되므로, 인건비 알림도 이 함수를
   그대로 씁니다(같은 담당자 파일). 다른 계정에서 쓰려면 로드 순서만 확인하면 됩니다. */

// 알림 요소별 결과 캐시 — 같은 알림을 다시 펼칠 때 서버를 또 부르지 않습니다.
var budgetAiCacheV1 = {};

function budgetAiEscapeV1(text) {
  return String(text == null ? '' : text).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

function budgetAiRenderV1(slotId, state, data) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  if (state === 'loading') {
    slot.innerHTML = '<span class="budget-ai-loading">AI가 이 알림을 해설하고 있습니다…</span>';
    return;
  }
  if (state === 'error') {
    slot.innerHTML = `<span class="budget-ai-error">${budgetAiEscapeV1(data)}</span>`;
    return;
  }
  // source: 'ai' = LLM 생성 / 'fallback' = 키 없음·호출 실패 시 서버의 규칙 기반 기본 해설
  const isAi = data.source === 'ai';
  const origin = isAi
    ? `${budgetAiEscapeV1(data.model || 'AI')} 생성${data.cached ? ' · 캐시' : ''}`
    : '기본 해설(AI 미연결)';
  slot.innerHTML = `
    <dl class="budget-ai-result">
      <div><dt>원인</dt><dd>${budgetAiEscapeV1(data.cause)}</dd></div>
      <div><dt>영향</dt><dd>${budgetAiEscapeV1(data.impact)}</dd></div>
      <div><dt>조치</dt><dd>${budgetAiEscapeV1(data.action)}</dd></div>
      <p class="budget-ai-meta">${origin} · 참고용이며 수치는 화면 값을 확인하세요${data.note ? ` · ${budgetAiEscapeV1(data.note)}` : ''}</p>
    </dl>`;
}

// payload: { kind, title, summary, facts:{라벨:값} }
function budgetAiExplainV1(slotId, payload) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  // 이미 펼쳐져 있으면 접기(토글)
  if (slot.dataset.open === '1') {
    slot.dataset.open = '0';
    slot.innerHTML = '';
    return;
  }
  slot.dataset.open = '1';
  const cached = budgetAiCacheV1[slotId];
  if (cached) { budgetAiRenderV1(slotId, 'ok', cached); return; }

  budgetAiRenderV1(slotId, 'loading');
  fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(res => res.json())
    .then(json => {
      if (!json || json.ok !== true) {
        budgetAiRenderV1(slotId, 'error', (json && json.message) || 'AI 해설을 가져오지 못했습니다.');
        return;
      }
      budgetAiCacheV1[slotId] = json;
      budgetAiRenderV1(slotId, 'ok', json);
    })
    .catch(() => budgetAiRenderV1(slotId, 'error', '서버에 연결할 수 없습니다. npm start 로 서버가 실행 중인지 확인하세요.'));
}

/* ==========================================================================
   1. 외주비 예산내역 — "외주비" 합계 부모행 + 접기/펼치기
   ========================================================================== */

// 기본값 false = 화면 진입 시 "외주비" 합계 한 줄만 보이고, 화살표로 상세계정 6개를 펼칩니다.
var outsourceBudgetTreeOpenV3 = false;

// 상세계정별 구분 아이콘(설계안의 트리 아이콘 대응)
var OSV3_DETAIL_ICONS = {
  '실투입대상 외주비': { ico:'◍', color:'#2f6bed' },
  '전문직수수료/제안/기타': { ico:'◎', color:'#7c5cff' },
  '외주출장비': { ico:'✈', color:'#22b07d' },
  '공사MA': { ico:'⚙', color:'#f5a623' },
  '이관외주비': { ico:'⤵', color:'#ea002c' },
  '기타외주비': { ico:'⋯', color:'#8a94a6' },
};

function toggleOutsourceBudgetTreeV3() {
  outsourceBudgetTreeOpenV3 = !outsourceBudgetTreeOpenV3;
  renderBudgetPage();
}

var renderAccountMonthlyBudgetTableBeforeOutsourceV3 = renderAccountMonthlyBudgetTable;
renderAccountMonthlyBudgetTable = function(data, account) {
  if (account !== CATS[1]) return renderAccountMonthlyBudgetTableBeforeOutsourceV3(data, account);

  const rows = getMonthlyBudgetRows(data, account);
  // 부모 "외주비" 행은 상세계정 6개의 합계입니다(실투입 행이 실데이터로 바뀌어도 합이 어긋나지 않게 직접 합산).
  const totalPlan = rows.reduce((s, r) => s + osv3NumV3(r.plan), 0);
  const totalActual = rows.reduce((s, r) => s + osv3NumV3(r.actual), 0);
  const totalRemain = Math.max(totalPlan - totalActual, 0);
  const monthTotals = data.months.map((mo, idx) => rows.reduce((s, r) => s + osv3NumV3(r.months[idx]), 0));
  const headMonths = data.months.map(mo => `<th>${mo.m}</th>`).join('');
  const open = outsourceBudgetTreeOpenV3;

  // 부모행: 상세계정 6개의 합계 = 외주비 계정 총액
  const parentRow = `
    <tr class="osv3-parent">
      <td class="acct-name" onclick="toggleOutsourceBudgetTreeV3()">
        <button class="osv3-toggle" aria-expanded="${open}" title="${open ? '접기' : '펼치기'}"
          onclick="event.stopPropagation();toggleOutsourceBudgetTreeV3()">${open ? '∧' : '∨'}</button>
        외주비<span class="osv3-count">상세계정 ${rows.length}</span>
      </td>
      <td class="num">${fmt(totalPlan)}</td>
      <td class="num">${fmt(totalActual)}</td>
      <td class="num">${fmt(totalRemain)}</td>
      ${monthTotals.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, '합계', v)}</td>`).join('')}
    </tr>`;

  const childRows = !open ? '' : rows.map(row => {
    const meta = OSV3_DETAIL_ICONS[row.name] || { ico:'·', color:'var(--sk-muted)' };
    return `
      <tr class="osv3-child">
        <td class="acct-name"><span class="osv3-ico" style="color:${meta.color}">${meta.ico}</span>${row.name}</td>
        <td class="num">${fmt(row.plan)}</td>
        <td class="num">${fmt(row.actual)}</td>
        <td class="num">${fmt(row.remain)}</td>
        ${row.months.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, row.name, v)}</td>`).join('')}
      </tr>`;
  }).join('');

  return `
    <div class="account-monthly-card osv3-flat">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-main-btn teal" onclick="showActualDetailModal('${account}','2026-06','전체')">${account} 실적조회</button>
        </div>
      </div>
      <div class="account-monthly-scroll">
        <table class="account-monthly-table">
          <thead>
            <tr><th>구분</th><th>계획(전체)</th><th>실적(확정)</th><th>계획(미집행)</th>${headMonths}</tr>
          </thead>
          <tbody>
            ${parentRow}
            ${childRows}
          </tbody>
        </table>
      </div>
    </div>`;
};

/* ==========================================================================
   2. 실투입대상 외주비 — 업체별 예산 1행 + 외주구매 계획 N라인 + 예산 통제
   ========================================================================== */

// 업체별로 프로젝트 전체기간 예산을 1줄로 편성하고, PM은 그 안에서 "외주구매 계획" 라인을
// 실제 구매견적에 맞춰 직접 수립합니다(투입 기간 + 금액). 구매계약 전에 계획 라인이 먼저 있어야 합니다.
// PO번호·실적(검수)·집행예정(미검수)은 그 라인에 구매계약이 발생한 뒤 구매시스템에서 채워집니다.
// 전체기간 예산 - 계획 금액 합계 = 아직 계획이 수립되지 않은 금액이며, 잔여 기간에 균등 배분해 보여줍니다.
var osv3VendorsV3 = [
  {
    id:'v-acro', vendor:'아크로디자인랩', contract:'UI/UX 디자인',
    budget:50000000, start:'2026-01-01', end:'2026-12-31',
    pos:[
      { poNo:'45000091', fx:'USD 11,000', start:'2026-04-01', end:'2026-06-30',
        amount:15000000, mm:3.0, actual:15000000, planned:0,
        plan:{ '2026-04':{ amount:5000000, mm:1.0 }, '2026-05':{ amount:5000000, mm:1.0 }, '2026-06':{ amount:5000000, mm:1.0 } },
        quote:{
          grades:[
            { grade:'특급', mm:0.8, unitPrice:7500000, amount:6000000 },
            { grade:'고급', mm:1.4, unitPrice:5000000, amount:7000000 },
            { grade:'중급', mm:0.8, unitPrice:2500000, amount:2000000 },
          ],
          monthly:[
            { month:'2026-04', mms:[0.33, 0.47, 0.20], amount:5325000 },
            { month:'2026-05', mms:[0.14, 0.47, 0.40], amount:4400000 },
            { month:'2026-06', mms:[0.33, 0.47, 0.20], amount:5275000 },
          ],
        } },
      { poNo:'45000104', fx:'USD 10,900', start:'2026-07-01', end:'2026-09-30',
        amount:15000000, mm:2.5, actual:5000000, planned:10000000,
        plan:{ '2026-07':{ amount:6000000, mm:1.0 }, '2026-08':{ amount:5000000, mm:0.8 }, '2026-09':{ amount:4000000, mm:0.7 } },
        quote:{
          grades:[
            { grade:'특급', mm:1.0, unitPrice:7500000, amount:7500000 },
            { grade:'고급', mm:1.5, unitPrice:5000000, amount:7500000 },
          ],
          monthly:[
            { month:'2026-07', mms:[0.40, 0.50], amount:5500000 },
            { month:'2026-08', mms:[0.35, 0.50], amount:5125000 },
            { month:'2026-09', mms:[0.25, 0.50], amount:4375000 },
          ],
        } },
      // 구매계약 전 단계 — PM이 구매견적에 맞춰 먼저 세운 계획 라인입니다(PO번호 이후 값은 계약 시 채워집니다).
      { poNo:'', fx:'', start:'2026-10-01', end:'2026-12-31',
        amount:12000000, mm:2.4, actual:0, planned:0, plan:{}, quote:null },
    ],
  },
  {
    id:'v-penta', vendor:'펜타시스템테크놀러지(주)', contract:'백엔드 개발',
    budget:120000000, start:'2026-01-01', end:'2026-12-31',
    pos:[
      { poNo:'45000077', fx:'USD 21,800', start:'2026-01-01', end:'2026-03-31',
        amount:30000000, mm:6.0, actual:30000000, planned:0,
        plan:{ '2026-01':{ amount:10000000, mm:2.0 }, '2026-02':{ amount:10000000, mm:2.0 }, '2026-03':{ amount:10000000, mm:2.0 } },
        quote:{ grades:[{ grade:'고급', mm:6.0, unitPrice:5000000, amount:30000000 }],
          monthly:[
            { month:'2026-01', mms:[2.0], amount:10000000 },
            { month:'2026-02', mms:[2.0], amount:10000000 },
            { month:'2026-03', mms:[2.0], amount:10000000 },
          ] } },
      { poNo:'45000088', fx:'USD 21,800', start:'2026-04-01', end:'2026-06-30',
        amount:30000000, mm:6.0, actual:15000000, planned:15000000,
        plan:{ '2026-04':{ amount:10000000, mm:2.0 }, '2026-05':{ amount:10000000, mm:2.0 }, '2026-06':{ amount:10000000, mm:2.0 } },
        quote:{ grades:[{ grade:'고급', mm:6.0, unitPrice:5000000, amount:30000000 }],
          monthly:[
            { month:'2026-04', mms:[2.0], amount:10000000 },
            { month:'2026-05', mms:[2.0], amount:10000000 },
            { month:'2026-06', mms:[2.0], amount:10000000 },
          ] } },
    ],
  },
  {
    id:'v-injent', vendor:'(주)인젠트', contract:'데이터 마이그레이션',
    budget:38000000, start:'2026-01-01', end:'2026-09-30',
    pos:[
      { poNo:'45000065', fx:'USD 13,100', start:'2026-01-01', end:'2026-03-31',
        amount:18000000, mm:3.6, actual:18000000, planned:0,
        plan:{ '2026-01':{ amount:6000000, mm:1.2 }, '2026-02':{ amount:6000000, mm:1.2 }, '2026-03':{ amount:6000000, mm:1.2 } },
        quote:{ grades:[{ grade:'고급', mm:3.6, unitPrice:5000000, amount:18000000 }],
          monthly:[
            { month:'2026-01', mms:[1.2], amount:6000000 },
            { month:'2026-02', mms:[1.2], amount:6000000 },
            { month:'2026-03', mms:[1.2], amount:6000000 },
          ] } },
      { poNo:'45000082', fx:'USD 10,200', start:'2026-04-01', end:'2026-06-30',
        amount:14000000, mm:2.8, actual:10000000, planned:4000000,
        plan:{ '2026-04':{ amount:5000000, mm:1.0 }, '2026-05':{ amount:5000000, mm:1.0 }, '2026-06':{ amount:4000000, mm:0.8 } },
        quote:{ grades:[{ grade:'고급', mm:2.8, unitPrice:5000000, amount:14000000 }],
          monthly:[
            { month:'2026-04', mms:[1.0], amount:5000000 },
            { month:'2026-05', mms:[1.0], amount:5000000 },
            { month:'2026-06', mms:[0.8], amount:4000000 },
          ] } },
    ],
  },
];

// 계획 라인 키 — PO번호는 구매계약이 발생한 뒤에 채워지므로 라인 식별자로 쓸 수 없습니다.
var osv3LineSeqV3 = 0;
osv3VendorsV3.forEach(v => v.pos.forEach(line => { line.lineId = `pl-${++osv3LineSeqV3}`; }));

var osv3OpenVendorV3 = '';         // 외주구매 계획이 펼쳐진 업체 (기본값 = 전부 접힘)
var osv3OpenPlanV3 = '';           // 월별 검수계획이 펼쳐진 PO번호
var osv3QuoteOpenV3 = '';          // 견적 팝업이 열린 PO번호

/* ── 헬퍼 ── */
function osv3NumV3(value) {
  return Number(String(value == null ? '' : value).replace(/[^0-9.-]/g, '')) || 0;
}
function osv3WonV3(value) {
  return `₩${fmt(Math.round(Number(value || 0)))}`;
}
function osv3FindVendorV3(id) {
  return osv3VendorsV3.find(v => v.id === id) || null;
}
function osv3FindLineV3(lineId) {
  for (const vendor of osv3VendorsV3) {
    const line = vendor.pos.find(l => l.lineId === lineId);
    if (line) return { vendor, line };
  }
  return null;
}
function osv3FindPoV3(poNo) {
  for (const vendor of osv3VendorsV3) {
    const po = vendor.pos.find(p => p.poNo === poNo);
    if (po) return { vendor, po };
  }
  return null;
}
function osv3PoMonthsV3(po) {
  return bpoMonthRangeByDateV2(po.start, po.end);
}
// 실적이 확정된 과거월은 검수계획을 고칠 수 없습니다(공유 코어의 isPastActualMonth 기준과 동일).
function osv3LockedV3(month) {
  return typeof isPastActualMonth === 'function' ? isPastActualMonth(month) : month < '2026-07';
}
function osv3PlanCellV3(po, month) {
  if (!po.plan) po.plan = {};
  if (!po.plan[month]) po.plan[month] = { amount:0, mm:0 };
  return po.plan[month];
}
function osv3PlanTotalV3(po) {
  return osv3PoMonthsV3(po).reduce((sum, m) => sum + osv3NumV3(osv3PlanCellV3(po, m).amount), 0);
}
function osv3PlanMmTotalV3(po) {
  return osv3PoMonthsV3(po).reduce((sum, m) => sum + osv3NumV3(osv3PlanCellV3(po, m).mm), 0);
}
function osv3QuarterOfV3(yyyymm) {
  return `${yyyymm.slice(0, 4)} Q${Math.floor((Number(yyyymm.slice(5, 7)) - 1) / 3) + 1}`;
}
function osv3QuarterListV3(start, end) {
  const list = [];
  let y = Number(start.slice(0, 4));
  let q = Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1;
  const ey = Number(end.slice(0, 4));
  const eq = Math.floor((Number(end.slice(5, 7)) - 1) / 3) + 1;
  while (y < ey || (y === ey && q <= eq)) {
    list.push(`${y} Q${q}`);
    q += 1;
    if (q > 4) { q = 1; y += 1; }
  }
  return list;
}
function osv3TodayMonthV3() {
  return '2026-06';   // 목업 기준월(공유 코어 isPastActualMonth의 경계와 맞춤)
}
// 잔여 기간 = 기준월 다음 달 ~ 계약 종료월. 미계획 금액을 여기에 균등하게 뿌립니다.
function osv3RestMonthsV3(vendor) {
  const months = bpoMonthRangeByDateV2(vendor.start, vendor.end);
  const rest = months.filter(m => m > osv3TodayMonthV3());
  return rest.length ? rest : months.slice(-1);
}
// 전체기간 예산 - 외주구매 계획 금액 합계 = 아직 계획이 수립되지 않은 금액.
function osv3UnplannedV3(vendor) {
  const planned = vendor.pos.reduce((s, line) => s + osv3NumV3(line.amount), 0);
  const amount = osv3NumV3(vendor.budget) - planned;
  const months = osv3RestMonthsV3(vendor);
  return { amount, months, perMonth: amount > 0 && months.length ? Math.round(amount / months.length) : 0 };
}
// 균등 배분 — 나머지는 마지막 월에 실어 월 합계가 원금과 정확히 맞게 합니다.
function osv3EvenShareV3(total, months, month) {
  if (!months.length || !months.includes(month)) return 0;
  const unit = Math.round(total / months.length);
  return month === months[months.length - 1] ? total - unit * (months.length - 1) : unit;
}
// 계획 라인의 월별 금액 — 구매계약이 붙어 월별 검수계획이 있으면 그 값을, 없으면 투입기간에 균등 배분합니다.
function osv3LineMonthAmountV3(line, month) {
  const months = bpoMonthRangeByDateV2(line.start, line.end);
  if (!months.includes(month)) return 0;
  const detailed = line.plan && months.some(m => line.plan[m] && osv3NumV3(line.plan[m].amount) > 0);
  if (detailed) return line.plan[month] ? osv3NumV3(line.plan[month].amount) : 0;
  return osv3EvenShareV3(osv3NumV3(line.amount), months, month);
}
// 미계획 금액을 잔여 기간에 균등 배분한 해당 월 금액.
function osv3UnplannedMonthV3(vendor, month) {
  const un = osv3UnplannedV3(vendor);
  return un.amount > 0 ? osv3EvenShareV3(un.amount, un.months, month) : 0;
}
function osv3VendorSumV3(vendor) {
  return vendor.pos.reduce((acc, po) => ({
    issued: acc.issued + osv3NumV3(po.amount),
    actual: acc.actual + osv3NumV3(po.actual),
    planned: acc.planned + osv3NumV3(po.planned),
    mm: acc.mm + osv3NumV3(po.mm),
  }), { issued:0, actual:0, planned:0, mm:0 });
}

// 예산 통제: 업체 예산은 전체기간 1건인데 외주구매 계획은 기간을 나눠 여러 라인으로 세우므로,
// 앞선 기간에 과도하게 계획하면 잔여 기간에 쓸 예산이 부족해집니다. 기간 경과율 대비 계획 편성율로 판정합니다.
// 계획 합계가 예산을 넘는 상태는 라인 입력 시점에 상한을 걸어 막으므로 → 판정은 ok/warn 2단계.
function osv3ControlV3(vendor) {
  const sum = osv3VendorSumV3(vendor);
  const remain = vendor.budget - sum.issued;
  const quarters = osv3QuarterListV3(vendor.start, vendor.end);
  const nowQ = osv3QuarterOfV3(osv3TodayMonthV3());
  const elapsed = quarters.filter(q => q <= nowQ).length;
  const restQuarters = Math.max(quarters.length - elapsed, 0);
  const timeRatio = quarters.length ? elapsed / quarters.length : 0;
  const paceRatio = vendor.budget ? sum.issued / vendor.budget : 0;
  const level = paceRatio - timeRatio > 0.15 ? 'warn' : 'ok';
  return Object.assign({}, sum, { remain, quarters, elapsed, restQuarters, timeRatio, paceRatio, level });
}

/* ── 액션 ── */
// PM은 구매계약에 앞서 반드시 외주구매 계획 라인을 신규로 만들어 수립해야 합니다.
function osv3AddPlanLineV3(vendorId) {
  const vendor = osv3FindVendorV3(vendorId);
  if (!vendor) return;
  const un = osv3UnplannedV3(vendor);
  if (un.amount <= 0) {
    showToast(`${vendor.vendor}는 전체기간 예산 ${osv3WonV3(vendor.budget)}을 모두 계획으로 편성했습니다. 예산 증액 후 추가할 수 있습니다.`);
    return;
  }
  const last = vendor.pos[vendor.pos.length - 1];
  const start = last && last.end < vendor.end ? osv3NextDayV3(last.end) : (last ? vendor.end : vendor.start);
  vendor.pos.push({
    lineId:`pl-${++osv3LineSeqV3}`, poNo:'', fx:'',
    start, end:vendor.end, amount:0, mm:0, actual:0, planned:0, plan:{}, quote:null,
  });
  osv3OpenVendorV3 = vendorId;
  showToast(`외주구매 계획 라인을 추가했습니다. 투입 기간과 금액을 구매견적과 맞춰 입력하세요(미계획 ${osv3WonV3(un.amount)}).`);
  renderBudgetPage();
}
function osv3NextDayV3(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 구매계약(PO)이 붙은 라인은 계약이 곧 확정값이므로 기간·금액을 고칠 수 없습니다.
function osv3SetLineFieldV3(lineId, field, value) {
  const found = osv3FindLineV3(lineId);
  if (!found) return;
  const { vendor, line } = found;
  if (line.poNo) {
    showToast(`구매계약(${line.poNo})이 발생한 계획 라인은 수정할 수 없습니다.`);
    renderBudgetPage();
    return;
  }
  if (field === 'amount') {
    const others = vendor.pos.reduce((s, l) => s + (l.lineId === lineId ? 0 : osv3NumV3(l.amount)), 0);
    const max = Math.max(osv3NumV3(vendor.budget) - others, 0);
    const next = osv3NumV3(value);
    line.amount = Math.min(next, max);
    if (next > max) showToast(`전체기간 예산을 넘습니다. 이 라인에 세울 수 있는 최대 금액은 ${osv3WonV3(max)}입니다.`);
  } else if (field === 'start' || field === 'end') {
    if (value < vendor.start || value > vendor.end) {
      showToast(`투입 기간은 업체 전체기간(${vendor.start} ~ ${vendor.end}) 안에 있어야 합니다.`);
      renderBudgetPage();
      return;
    }
    line[field] = value;
    if (line.end < line.start) line.end = line.start;
  }
  renderBudgetPage();
}

function osv3DeletePlanLineV3(lineId) {
  const found = osv3FindLineV3(lineId);
  if (!found) return;
  if (found.line.poNo) {
    showToast(`구매계약(${found.line.poNo})이 발생한 계획 라인은 삭제할 수 없습니다.`);
    return;
  }
  found.vendor.pos = found.vendor.pos.filter(l => l.lineId !== lineId);
  showToast('외주구매 계획 라인을 삭제했습니다.');
  renderBudgetPage();
}

function osv3ToggleVendorV3(id) {
  osv3OpenVendorV3 = osv3OpenVendorV3 === id ? '' : id;
  osv3OpenPlanV3 = '';
  renderBudgetPage();
}
function osv3TogglePlanV3(poNo) {
  osv3OpenPlanV3 = osv3OpenPlanV3 === poNo ? '' : poNo;
  renderBudgetPage();
}
function osv3OpenQuoteV3(poNo) {
  osv3QuoteOpenV3 = poNo;
  renderBudgetPage();
}
function osv3CloseQuoteV3() {
  osv3QuoteOpenV3 = '';
  renderBudgetPage();
}
function osv3SetPlanAmountV3(poNo, month, value) {
  const found = osv3FindPoV3(poNo);
  if (!found || osv3LockedV3(month)) return;
  osv3PlanCellV3(found.po, month).amount = osv3NumV3(value);
  renderBudgetPage();
}
function osv3SetPlanMmV3(poNo, month, value) {
  const found = osv3FindPoV3(poNo);
  if (!found || osv3LockedV3(month)) return;
  osv3PlanCellV3(found.po, month).mm = osv3NumV3(value);
  renderBudgetPage();
}

// 균등분배: 실적확정 월은 그대로 두고, 남은 금액/MM을 나머지 월에 균등 배분합니다.
function osv3ResetEvenV3(poNo) {
  const found = osv3FindPoV3(poNo);
  if (!found) return;
  const po = found.po;
  const months = osv3PoMonthsV3(po);
  const free = months.filter(m => !osv3LockedV3(m));
  if (!free.length) {
    showToast('실적이 확정된 월만 있어 검수계획을 재분배할 수 없습니다.');
    return;
  }
  const locked = months.filter(m => osv3LockedV3(m));
  const lockedAmount = locked.reduce((s, m) => s + osv3NumV3(osv3PlanCellV3(po, m).amount), 0);
  const lockedMm = locked.reduce((s, m) => s + osv3NumV3(osv3PlanCellV3(po, m).mm), 0);
  const restAmount = Math.max(osv3NumV3(po.amount) - lockedAmount, 0);
  const restMm = Math.max(osv3NumV3(po.mm) - lockedMm, 0);
  const unit = Math.floor(restAmount / free.length / 1000) * 1000;
  free.forEach((month, idx) => {
    const cell = osv3PlanCellV3(po, month);
    cell.amount = idx === free.length - 1 ? restAmount - unit * (free.length - 1) : unit;
    cell.mm = Math.round((restMm / free.length) * 100) / 100;
  });
  showToast(`${poNo} 월별 검수계획을 균등분배로 재설정했습니다.`);
  renderBudgetPage();
}

// 견적대로 채우기: 실적확정 월은 유지하고, 남은 금액을 견적의 월별 비중대로 배분합니다.
function osv3ApplyQuoteV3(poNo) {
  const found = osv3FindPoV3(poNo);
  if (!found) return;
  const po = found.po;
  const suggestion = (po.quote && po.quote.monthly) || [];
  const free = suggestion.filter(row => !osv3LockedV3(row.month));
  if (!free.length) {
    showToast('견적 대상 월이 모두 실적확정 상태라 검수계획을 변경할 수 없습니다.');
    osv3CloseQuoteV3();
    return;
  }
  const lockedAmount = osv3PoMonthsV3(po)
    .filter(m => osv3LockedV3(m))
    .reduce((s, m) => s + osv3NumV3(osv3PlanCellV3(po, m).amount), 0);
  const restAmount = Math.max(osv3NumV3(po.amount) - lockedAmount, 0);
  const freeQuoteSum = free.reduce((s, row) => s + osv3NumV3(row.amount), 0) || 1;
  let assigned = 0;
  free.forEach((row, idx) => {
    const cell = osv3PlanCellV3(po, row.month);
    const value = idx === free.length - 1
      ? restAmount - assigned
      : Math.round((restAmount * osv3NumV3(row.amount)) / freeQuoteSum / 1000) * 1000;
    assigned += value;
    cell.amount = value;
    cell.mm = Math.round((row.mms || []).reduce((s, v) => s + osv3NumV3(v), 0) * 100) / 100;
  });
  osv3QuoteOpenV3 = '';
  osv3OpenPlanV3 = poNo;
  showToast(lockedAmount > 0
    ? '실적확정 월은 유지하고, 남은 금액을 견적 비중대로 배분했습니다.'
    : '견적의 월별 제안 금액대로 검수계획을 채웠습니다.');
  renderBudgetPage();
}

// PO 수신(구매시스템 연동 목업) — 구매계약 시점에 업체 예산을 체크하므로 잔여예산이 계약 상한이 됩니다.
function osv3ReceivePoV3(vendorId) {
  const vendor = osv3FindVendorV3(vendorId);
  if (!vendor) return;
  const ctrl = osv3ControlV3(vendor);
  if (ctrl.remain <= 0) {
    showToast(`${vendor.vendor}는 전체기간 예산을 모두 PO로 발행했습니다. 추가 계약은 예산 증액 후 가능합니다.`);
    return;
  }
  if (ctrl.restQuarters <= 0) {
    showToast(`[기간 종료] ${vendor.vendor}의 계약기간(${vendor.end})이 지나 신규 PO를 수신할 수 없습니다.`);
    return;
  }
  const usedQuarters = vendor.pos.map(po => osv3QuarterOfV3(po.start.slice(0, 7)));
  const nextQuarter = ctrl.quarters.find(q => !usedQuarters.includes(q));
  showToast(nextQuarter
    ? `구매시스템에서 ${nextQuarter} PO를 조회합니다. 계약 가능 한도는 잔여예산 ${osv3WonV3(ctrl.remain)}입니다.`
    : `모든 분기에 PO가 있습니다. 추가 계약 한도는 잔여예산 ${osv3WonV3(ctrl.remain)}입니다.`);
}

// 업체별 예산 편집기 열기 — 공유 상태(bpoFormOpenV2/bpoEditingIdV2)를 그대로 재사용합니다.
// bpoEditingIdV2 가 업체 id면 수정, null(= 상세계정 헤더의 [신규등록] 버튼이 호출하는 bpoOpenNewV2)이면 신규입니다.
function osv3EditVendorV3(vendorId) {
  bpoFormOpenV2 = true;
  bpoEditingIdV2 = vendorId || null;
  renderBudgetPage();
}
function osv3DeleteVendorV3(vendorId) {
  const vendor = osv3FindVendorV3(vendorId);
  const ctrl = vendor ? osv3ControlV3(vendor) : null;
  if (ctrl && ctrl.actual > 0) {
    showToast(`실적이 발생한 업체(${vendor.vendor})는 삭제할 수 없습니다. 외주구매 계획과 구매계약을 먼저 정리해야 합니다.`);
    return;
  }
  showToast('업체별 예산을 삭제했습니다.');
}

/* ── 예산내역 연동 ──
   "외주비 예산내역" 표의 [실투입대상 외주비] 행을 비율 추정값이 아니라 아래에서 편집 중인
   업체별 예산 / PO / 월별 검수계획 실데이터로 대체합니다. 나머지 5개 상세계정은 기존 비율 로직을 그대로 씁니다.
   - 계획      = Σ 업체별 전체기간 예산
   - 실적(확정) = Σ 계약 라인 실적
   - 월별      = Σ 계획 라인의 월별 금액 + Σ 미계획 금액을 잔여 기간에 균등 배분한 금액
                 (계획 라인은 월별 검수계획이 있으면 그 값, 없으면 투입기간 균등 배분) */
function osv3MonthPlanTotalV3(month) {
  return osv3VendorsV3.reduce((sum, vendor) => {
    const lines = vendor.pos.reduce((s, line) => s + osv3LineMonthAmountV3(line, month), 0);
    return sum + lines + osv3UnplannedMonthV3(vendor, month);
  }, 0);
}

function osv3TotalsV3() {
  return osv3VendorsV3.reduce((acc, vendor) => {
    const sum = osv3VendorSumV3(vendor);
    return {
      budget: acc.budget + osv3NumV3(vendor.budget),
      issued: acc.issued + sum.issued,
      actual: acc.actual + sum.actual,
      planned: acc.planned + sum.planned,
    };
  }, { budget:0, issued:0, actual:0, planned:0 });
}

var getMonthlyBudgetRowsBeforeOutsourceV3 = getMonthlyBudgetRows;
getMonthlyBudgetRows = function(data, account) {
  const rows = getMonthlyBudgetRowsBeforeOutsourceV3(data, account);
  if (account !== CATS[1]) return rows;
  const totals = osv3TotalsV3();
  return rows.map(row => {
    if (row.name !== '실투입대상 외주비') return row;
    return {
      name: row.name,
      plan: totals.budget,
      actual: totals.actual,
      remain: Math.max(totals.budget - totals.actual, 0),
      months: data.months.map(mo => osv3MonthPlanTotalV3(mo.m)),
    };
  });
};

/* ── 업체별 예산 편집기 (업체명 / 업무명 / 전체기간 / 전체기간 예산) ── */
// PO(구매계약)와 1:1로 매핑되는 견적 정보는 PO 하위 레벨이라, 상위 레벨인 업체 예산 편성에는 끌어오지 않습니다.
function osv3FormValueV3(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// 금액을 한글로 읽어줍니다 (예: 50000000 → "오천만원").
function osv3HangulAmountV3(value) {
  let n = Math.floor(Number(value) || 0);
  if (n <= 0) return '';
  const DIGIT = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const SMALL = ['', '십', '백', '천'];
  const BIG = ['', '만', '억', '조', '경'];
  let out = '';
  let group = 0;
  while (n > 0 && group < BIG.length) {
    const chunk = n % 10000;
    if (chunk) {
      let text = '';
      let rest = chunk;
      for (let i = 0; rest > 0; i += 1, rest = Math.floor(rest / 10)) {
        const digit = rest % 10;
        if (digit) text = DIGIT[digit] + SMALL[i] + text;
      }
      out = text.replace(/^일(?=[십백천])/, '') + BIG[group] + out;
    }
    n = Math.floor(n / 10000);
    group += 1;
  }
  return `${out}원`;
}

// 입력 중에도 콤마와 한글 금액이 바로 보이도록 갱신합니다(재렌더 없이 DOM만 갱신 → 포커스 유지).
function osv3FormatBudgetInputV3(input) {
  const digits = String(input.value || '').replace(/[^0-9]/g, '');
  const amount = Number(digits || 0);
  input.value = digits ? fmt(amount) : '';
  const hint = document.getElementById('osv3-f-budget-hangul');
  if (hint) hint.textContent = digits ? osv3HangulAmountV3(amount) : '';
}

function osv3SaveVendorV3() {
  const editing = bpoEditingIdV2 ? osv3FindVendorV3(bpoEditingIdV2) : null;
  const vendorName = osv3FormValueV3('osv3-f-vendor');
  const contract = osv3FormValueV3('osv3-f-contract');
  const start = osv3FormValueV3('osv3-f-start');
  const end = osv3FormValueV3('osv3-f-end');
  const budget = osv3NumV3(osv3FormValueV3('osv3-f-budget'));

  if (!vendorName || !contract || !start || !end) {
    showToast('업체명, 업무명, 전체기간을 모두 입력해야 합니다.');
    return;
  }
  if (end < start) {
    showToast('전체기간 종료월이 시작월보다 앞설 수 없습니다.');
    return;
  }
  if (budget <= 0) {
    showToast('전체기간 예산을 입력해야 합니다.');
    return;
  }

  // 이미 수립된 외주구매 계획 합계보다 작은 예산은 저장 즉시 초과 상태가 되므로 막습니다.
  if (editing) {
    const issued = osv3VendorSumV3(editing).issued;
    if (budget < issued) {
      showToast(`전체기간 예산(${osv3WonV3(budget)})이 이미 수립된 외주구매 계획 합계(${osv3WonV3(issued)})보다 작습니다. 계획 라인을 먼저 조정해야 합니다.`);
      return;
    }
    const outside = editing.pos.filter(line => line.start < start || line.end > end);
    if (outside.length) {
      showToast(`전체기간(${start} ~ ${end}) 밖에 있는 외주구매 계획 ${outside.length}건(${outside.map(line => line.poNo || `${line.start}~${line.end}`).join(', ')})이 있어 기간을 좁힐 수 없습니다.`);
      return;
    }
    Object.assign(editing, { vendor:vendorName, contract, start, end, budget });
    showToast(`${vendorName} 업체별 예산을 수정했습니다.`);
  } else {
    osv3VendorsV3.push({
      id:`v-${Date.now().toString(36)}`,
      vendor:vendorName, contract, start, end, budget, pos:[],
    });
    showToast(`${vendorName} 업체별 예산을 등록했습니다. 이제 [＋ 계획 라인]으로 구매견적에 맞춘 외주구매 계획을 수립하세요.`);
  }
  bpoCloseFormV2();
}

function osv3RenderVendorFormV3() {
  const editing = bpoEditingIdV2 ? osv3FindVendorV3(bpoEditingIdV2) : null;
  const sum = editing ? osv3VendorSumV3(editing) : null;
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head">
        <div>
          <strong>${editing ? '외주업체 예산 수정' : '외주업체 예산 신규 등록'}</strong>
          <span>업체별로 프로젝트 전체기간 예산만 편성합니다. 투입 기간·금액은 아래 [외주구매 계획] 라인에서 구매견적에 맞춰 수립하고, PO번호·실적·집행예정은 구매계약이 발생하면 채워집니다.</span>
        </div>
        <button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button>
      </div>
      <div class="bpo-contract-grid wide travel-fields">
        <label><span>업체명</span>
          <input id="osv3-f-vendor" value="${editing ? editing.vendor : ''}" placeholder="예: 아크로디자인랩"></label>
        <label><span>업무명</span>
          <input id="osv3-f-contract" value="${editing ? editing.contract : ''}" placeholder="예: UI/UX 디자인"></label>
        <label><span>전체기간</span>
          <div class="bpo-input-button osv3-range">
            <input id="osv3-f-start" type="date" value="${editing ? editing.start : ''}">
            <em>~</em>
            <input id="osv3-f-end" type="date" value="${editing ? editing.end : ''}">
          </div></label>
        <label><span>전체기간 예산</span>
          <input id="osv3-f-budget" inputmode="numeric" value="${editing ? fmt(editing.budget) : ''}"
            placeholder="예: 50,000,000" oninput="osv3FormatBudgetInputV3(this)">
          <span class="osv3-hangul" id="osv3-f-budget-hangul">${editing ? osv3HangulAmountV3(editing.budget) : ''}</span></label>
      </div>
      ${editing ? `
        <p class="osv3-form-note">현재 이 업체에 PO ${editing.pos.length}건이 발행되어 있습니다 —
          발행액 <b>${osv3WonV3(sum.issued)}</b> · 실적 <b>${osv3WonV3(sum.actual)}</b>.
          전체기간 예산은 발행액(${osv3WonV3(sum.issued)}) 미만으로 줄일 수 없습니다.</p>` : ''}
      <div class="bpo-form-actions">
        <button class="labor-main-btn" onclick="osv3SaveVendorV3()">${editing ? '수정' : '등록'}</button>
      </div>
    </div>`;
}

/* ── 렌더 ── */
function osv3RenderAlertV3(vendor, ctrl) {
  const time = Math.round(ctrl.timeRatio * 100);
  const pace = Math.round(ctrl.paceRatio * 100);
  if (ctrl.level === 'warn') {
    const slot = `osv3-ai-${vendor.id}`;
    const summary = `${vendor.vendor} · 계약기간 ${time}% 경과 / 예산 ${pace}% 계획 편성 · 미계획 ${osv3WonV3(ctrl.remain)}`;
    const facts = {
      '업체': vendor.vendor, '업무': vendor.contract,
      '전체기간': `${vendor.start} ~ ${vendor.end}`,
      '전체기간 예산': osv3WonV3(vendor.budget),
      '계획 금액': osv3WonV3(ctrl.issued),
      '미계획 금액': osv3WonV3(ctrl.remain),
      '실적(검수)': osv3WonV3(ctrl.actual),
      '기간 경과율': `${time}%`, '계획 편성율': `${pace}%`,
      '계획 라인': `${vendor.pos.length}건(계약 ${vendor.pos.filter(l => l.poNo).length}건)`,
      '남은 분기 수': `${ctrl.restQuarters}개`,
    };
    const payload = budgetAiEscapeV1(JSON.stringify({ kind:'outsource-pace', title:'분기 편중 주의', summary, facts }));
    return `<div class="osv3-alert warn">
      <em>분기 편중 주의</em>
      <div>${vendor.vendor} · 계약기간은 <b>${time}%</b> 경과했는데 예산은 <b>${pace}%</b>가 이미 계획으로 편성됐습니다.
        잔여 기간에 계획을 세울 수 있는 금액은 <b>${osv3WonV3(ctrl.remain)}</b>뿐입니다.
        <span class="budget-ai-slot" id="${slot}"></span></div>
      <button class="budget-ai-btn" onclick='budgetAiExplainV1("${slot}", ${payload})'>AI 해설</button>
    </div>`;
  }
  return `<div class="osv3-alert ok">
    <em>정상</em>
    <div>${vendor.vendor} · 기간 ${time}% 경과 / 예산 ${pace}% 계획 편성.
    잔여 기간에 ${osv3WonV3(ctrl.remain)} 만큼 계획을 세울 수 있습니다.</div>
  </div>`;
}

// 경고·요약·신규등록을 한 줄에 담기 위해, 경고가 2건 이상이면 한 개 배너로 합치고 상세는 툴팁으로 넘깁니다.
function osv3RenderAlertRowV3(list) {
  if (!list.length) return '';
  if (list.length === 1) return osv3RenderAlertV3(list[0].vendor, list[0].ctrl);
  const names = list.map(item => {
    const time = Math.round(item.ctrl.timeRatio * 100);
    const pace = Math.round(item.ctrl.paceRatio * 100);
    return `<b title="계약기간 ${time}% 경과 / 예산 ${pace}% 발행 · 잔여 기간동안 ${osv3WonV3(item.ctrl.remain)} 사용 가능">${item.vendor.vendor}</b>`;
  }).join(', ');
  return `<div class="osv3-alert warn">
    <em>분기 편중 주의 ${list.length}건</em>
    <div>${names} — 계획 편성이 기간 경과보다 앞서 있습니다. 업체명에 마우스를 올리면 상세가 표시됩니다.</div>
  </div>`;
}

function osv3RenderPlanPanelV3(po) {
  const months = osv3PoMonthsV3(po);
  const planTotal = osv3PlanTotalV3(po);
  const planMm = osv3PlanMmTotalV3(po);
  const diff = planTotal - osv3NumV3(po.amount);
  const free = months.filter(m => !osv3LockedV3(m));
  const cells = months.map(month => {
    const cell = osv3PlanCellV3(po, month);
    const locked = osv3LockedV3(month);
    return `
      <div class="osv3-cell ${locked ? '' : 'edit'}">
        <label>${month}${locked ? ' · <em>실적확정</em>' : ''}</label>
        <input value="${fmt(osv3NumV3(cell.amount))}" ${locked ? 'readonly' : ''}
          onchange="osv3SetPlanAmountV3('${po.poNo}','${month}',this.value)">
        <input class="mm" value="${osv3NumV3(cell.mm)}" ${locked ? 'readonly' : ''}
          onchange="osv3SetPlanMmV3('${po.poNo}','${month}',this.value)">
      </div>`;
  }).join('');

  return `
    <div class="osv3-plan">
      <div class="osv3-plan-head">
        <strong>월별 검수 계획 조정</strong>
        <span class="osv3-help" title="위 칸은 검수(대금지급) 금액, 아래 칸은 투입 MM입니다. 실적이 확정된 과거월은 수정할 수 없습니다.">?</span>
      </div>
      <div class="osv3-plan-grid">${cells}</div>
      <div class="osv3-plan-foot">
        <button class="osv3-mini" ${free.length ? '' : 'disabled'} onclick="osv3ResetEvenV3('${po.poNo}')">균등분배로 재설정</button>
        <span class="osv3-chip ${diff === 0 ? 'ok' : 'bad'}">
          ${diff === 0
            ? `✓ 월별 합계 ${osv3WonV3(planTotal)} · PO금액과 일치해요`
            : `! 월별 합계 ${osv3WonV3(planTotal)} · PO금액보다 ${osv3WonV3(Math.abs(diff))} ${diff > 0 ? '많아요' : '적어요'}`}
          · ${planMm.toFixed(1)}MM
        </span>
      </div>
    </div>`;
}

function osv3RenderPoBlockV3(vendor) {
  const sum = osv3VendorSumV3(vendor);
  const un = osv3UnplannedV3(vendor);
  const contracted = vendor.pos.filter(line => line.poNo).length;

  const rows = vendor.pos.map(line => {
    const fixed = !!line.poNo;              // 구매계약 발생 → 계획 확정(조회 전용)
    const planOpen = fixed && osv3OpenPlanV3 === line.poNo;
    return `
      <tr class="${fixed ? 'osv3-line-fixed' : 'osv3-line-draft'}">
        <td>
          ${fixed
            ? `${line.start} ~ ${line.end}`
            : `<div class="osv3-inline-range">
                 <input type="date" value="${line.start}" min="${vendor.start}" max="${vendor.end}"
                   onchange="osv3SetLineFieldV3('${line.lineId}','start',this.value)">
                 <em>~</em>
                 <input type="date" value="${line.end}" min="${vendor.start}" max="${vendor.end}"
                   onchange="osv3SetLineFieldV3('${line.lineId}','end',this.value)">
               </div>`}
        </td>
        <td class="num">
          ${fixed
            ? osv3WonV3(line.amount)
            : `<input class="osv3-line-amt" value="${fmt(osv3NumV3(line.amount))}"
                 onchange="osv3SetLineFieldV3('${line.lineId}','amount',this.value)">`}
        </td>
        <td class="osv3-po-no">
          ${fixed
            ? `<b>${line.poNo}</b><small>${line.fx}</small>`
            : '<span class="osv3-wait">계약 대기</span>'}
        </td>
        <td class="num ${fixed ? 'osv3-good' : 'osv3-empty'}">${fixed ? osv3WonV3(line.actual) : '–'}</td>
        <td class="num ${fixed ? 'osv3-plan-amt' : 'osv3-empty'}">${fixed ? osv3WonV3(line.planned) : '–'}</td>
        <td>
          <div class="osv3-actions">
            ${fixed ? `<button class="osv3-mini" onclick="osv3OpenQuoteV3('${line.poNo}')">▦ 견적</button>` : ''}
            <button class="osv3-mini round danger" ${fixed ? 'disabled' : ''}
              title="${fixed ? '구매계약이 발생한 계획은 삭제할 수 없습니다' : '계획 라인 삭제'}"
              onclick="osv3DeletePlanLineV3('${line.lineId}')">×</button>
          </div>
        </td>
      </tr>
      ${planOpen ? `<tr><td colspan="6" style="padding:0">${osv3RenderPlanPanelV3(line)}</td></tr>` : ''}`;
  }).join('');

  // 계획이 수립되지 않은 금액은 잔여 기간에 균등 배분한 상태로 보여줍니다(라인으로 확정되면 여기서 빠집니다).
  const restLabel = un.months.length
    ? `${un.months[0]} ~ ${un.months[un.months.length - 1]} · ${un.months.length}개월`
    : '잔여 기간 없음';
  const unRow = un.amount > 0 ? `
    <tr class="osv3-line-open">
      <td>${restLabel}</td>
      <td class="num">${osv3WonV3(un.amount)}</td>
      <td colspan="4">계획 미수립 — 잔여 기간에 월 <b>${osv3WonV3(un.perMonth)}</b>씩 균등 배분 중입니다. 구매견적이 나오면 계획 라인으로 확정하세요.</td>
    </tr>` : '';
  const emptyRow = vendor.pos.length ? '' : `
    <tr><td colspan="6" class="osv3-line-none">외주구매 계획이 없습니다. 구매계약 전에 [＋ 계획 라인]으로 먼저 계획을 수립해야 합니다.</td></tr>`;

  return `
    <tr class="osv3-po-wrap">
      <td colspan="7">
        <div class="osv3-po-head">
          <span class="osv3-badge">외주구매 계획</span>
          <button class="osv3-mini" onclick="osv3AddPlanLineV3('${vendor.id}')">＋ 계획 라인</button>
          <b>계획 ${vendor.pos.length}건(계약 ${contracted}건) · 합계 ${osv3WonV3(sum.issued)} · 미계획 ${osv3WonV3(Math.max(un.amount, 0))}</b>
        </div>
        <table class="osv3-po-table">
          <thead>
            <tr>
              <th>투입 기간</th><th class="num">금액</th><th>PO번호</th>
              <th class="num">실적(검수)</th><th class="num">집행예정(미검수)</th>
              <th style="text-align:right">관리</th>
            </tr>
          </thead>
          <tbody>${rows}${emptyRow}${unRow}</tbody>
        </table>
      </td>
    </tr>`;
}

function osv3RenderQuoteModalV3() {
  if (!osv3QuoteOpenV3) return '';
  const found = osv3FindPoV3(osv3QuoteOpenV3);
  if (!found) return '';
  const po = found.po;
  const grades = (po.quote && po.quote.grades) || [];
  const monthly = (po.quote && po.quote.monthly) || [];
  const gradeMm = grades.reduce((s, g) => s + osv3NumV3(g.mm), 0);
  const gradeAmount = grades.reduce((s, g) => s + osv3NumV3(g.amount), 0);
  return `
    <div class="osv3-overlay" onclick="if(event.target===this)osv3CloseQuoteV3()">
      <div class="osv3-modal">
        <div class="osv3-modal-ico">▤</div>
        <h4>구매시스템 견적 · PO ${po.poNo}</h4>
        <p class="sub">등급 단위로 투입 MM과 단가가 정해져 있어요. 등급별 월별 투입 비중에 따라 검수 제안 금액을 계산했어요.</p>
        <table class="osv3-qt">
          <thead><tr><th>등급</th><th class="num">MM</th><th class="num">단가</th><th class="num">합계금액</th></tr></thead>
          <tbody>
            ${grades.map(g => `<tr><td>${g.grade}</td><td class="num">${osv3NumV3(g.mm).toFixed(1)}MM</td><td class="num">${osv3WonV3(g.unitPrice)}</td><td class="num">${osv3WonV3(g.amount)}</td></tr>`).join('')}
            <tr class="total"><td>합계</td><td class="num">${gradeMm.toFixed(1)}MM</td><td class="num">-</td><td class="num">${osv3WonV3(gradeAmount)}</td></tr>
          </tbody>
        </table>
        <h5>월별 검수 제안 금액</h5>
        <table class="osv3-qt">
          <thead><tr><th>월</th>${grades.map(g => `<th class="num">${g.grade} MM</th>`).join('')}<th class="num">검수 제안 금액</th></tr></thead>
          <tbody>
            ${monthly.map(row => `<tr>
              <td>${row.month}${osv3LockedV3(row.month) ? ' <span style="color:var(--sk-muted);font-size:10.5px">실적확정</span>' : ''}</td>
              ${grades.map((g, idx) => `<td class="num">${osv3NumV3((row.mms || [])[idx]).toFixed(2)}MM</td>`).join('')}
              <td class="num">${osv3WonV3(row.amount)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="osv3-modal-foot">
          <button class="osv3-btn-ghost" onclick="osv3CloseQuoteV3()">닫기</button>
          <button class="osv3-btn-primary" onclick="osv3ApplyQuoteV3('${po.poNo}')">✓ 이 견적대로 검수계획 채우기</button>
        </div>
      </div>
    </div>`;
}

// 실투입 탭의 헤드 라인 좌측 정보 = 분기 편중 경고 + 전체 요약.

// 모든 탭이 같은 .osv3-headrow 한 줄을 공유하도록, 이 정보만 떼어내 renderBpoOutsourcePanelFinal 이 조립합니다.
function osv3DirectHeadInfoV3() {
  const totalBudget = osv3VendorsV3.reduce((s, v) => s + osv3NumV3(v.budget), 0);
  const totalIssued = osv3VendorsV3.reduce((s, v) => s + osv3VendorSumV3(v).issued, 0);
  const risky = osv3VendorsV3
    .map(v => ({ vendor:v, ctrl:osv3ControlV3(v) }))
    .filter(item => item.ctrl.level !== 'ok');
  return `
    <div class="osv3-headinfo">${osv3RenderAlertRowV3(risky)}</div>
    <div class="osv3-board-sum">
      <span class="osv3-hint"
        title="업체별로 프로젝트 전체기간 예산을 1줄로 편성하고, PM이 그 안에서 구매견적에 맞춘 외주구매 계획 라인을 세웁니다. PO번호·실적·집행예정은 그 라인에 구매계약이 발생하면 채워집니다.">?</span>
      업체 ${osv3VendorsV3.length}곳 · 예산 <b>${osv3WonV3(totalBudget)}</b> ·
      계획 편성 <b>${osv3WonV3(totalIssued)}</b> (${totalBudget ? Math.round((totalIssued / totalBudget) * 100) : 0}%)
    </div>`;
}

function osv3RenderVendorBoardV3() {
  const body = osv3VendorsV3.map(vendor => {
    const ctrl = osv3ControlV3(vendor);
    const open = osv3OpenVendorV3 === vendor.id;
    const barPct = Math.min(ctrl.paceRatio, 1) * 100;
    return `
      <tr class="osv3-vendor ${open ? 'open' : ''}">
        <td>
          <div class="osv3-vendor-name">
            <button class="osv3-toggle" title="${open ? '외주구매 계획 접기' : '외주구매 계획 펼치기'}" onclick="osv3ToggleVendorV3('${vendor.id}')">${open ? '∧' : '∨'}</button>
            <div><b>${vendor.vendor}</b><small>${vendor.contract} · 계획 ${vendor.pos.length}건(계약 ${vendor.pos.filter(l => l.poNo).length}건) · ${vendor.start} ~ ${vendor.end}</small></div>
          </div>
        </td>
        <td class="num">${osv3WonV3(vendor.budget)}</td>
        <td class="num">
          ${osv3WonV3(ctrl.issued)}
          <div class="osv3-bar ${ctrl.level}"><i style="width:${barPct}%"></i></div>
        </td>
        <td class="num">${osv3WonV3(ctrl.remain)}</td>
        <td class="num osv3-good">${osv3WonV3(ctrl.actual)}</td>
        <td class="num osv3-plan-amt">${osv3WonV3(ctrl.planned)}</td>
        <td>
          <div class="osv3-actions">
            <button class="osv3-mini round" title="업체별 예산 수정" onclick="osv3EditVendorV3('${vendor.id}')">✎</button>
            <button class="osv3-mini round danger" title="삭제" onclick="osv3DeleteVendorV3('${vendor.id}')">×</button>
          </div>
        </td>
      </tr>
      ${open ? osv3RenderPoBlockV3(vendor) : ''}`;
  }).join('');

  return `
    <div class="osv3-board">
      <div class="bpo-list-card">
        <table class="bpo-list-table osv3-table">
          <thead>
            <tr>
              <th>업체명</th><th class="num">전체기간 예산</th><th class="num">계획 금액</th>
              <th class="num">미계획 금액</th><th class="num">실적(검수)</th><th class="num">집행예정(미검수)</th>
              <th style="text-align:right">관리</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${osv3RenderQuoteModalV3()}
    </div>`;
}

// 실투입대상('direct')만 새 구조로 교체하고, 나머지 kind는 이전 정의로 위임합니다.
// 편집 폼도 공유 코어의 renderBpoContractFormV2(견적 연동 폼) 대신 업체 예산 4항목 폼으로 교체합니다.
// PO와 1:1 매핑되는 견적은 PO 하위 정보라, PO 상위 레벨인 업체 예산 편성에는 필요하지 않습니다.
var renderBpoContractPanelV2BeforeOutsourceV3 = renderBpoContractPanelV2;
renderBpoContractPanelV2 = function(kind) {
  if (kind !== 'direct') return renderBpoContractPanelV2BeforeOutsourceV3(kind);
  return `
    ${osv3RenderVendorBoardV3()}
    ${bpoFormOpenV2 ? osv3RenderVendorFormV3() : ''}`;
};

/* ==========================================================================
   3. 외주비 계정 편집기 진입점 (데코레이터) — 기존 구조 유지
   ========================================================================== */

// 외주비 계정 편집기 데코레이터: 자기 계정(CATS[1])만 처리하고 나머지는 이전 정의로 위임
var renderBudgetAccountEditorBeforeOutsource = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[1]) return renderBudgetAccountEditorBeforeOutsource(data, account);
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  // 편집기 헤드([← 계정 선택] 버튼 + "외주비 수정" 제목/설명)는 요청에 따라 제거했습니다.
  // 계정 선택으로 돌아가는 경로는 브라우저 뒤로가기(#/budget-adjust)로 유지됩니다.
  return `
    <div class="setup-editor osv3-flat">
      ${monthly}
      ${renderBpoOutsourcePanelFinal(data)}
    </div>`;
};

// 외주비 상세계정 분기(실투입/전문직/출장/공사MA/이관/기타) — 원래 budget-status-2.js:403
//
// 박스 중첩 정리: 예전에는 .outsource-panel(테두리) > .cost-category-board(테두리) > .cost-selected-detail 3중
// 래퍼에 각자 헤더 문구를 달고 있었습니다. 헤더 문구를 전부 걷어내면서 래퍼도 테두리 없는 .osv3-shell 하나로
// 합쳤습니다. 이제 화면에 보이는 테두리는 "탭 버튼"과 "본문 카드"뿐입니다.
// 탭은 공유 renderBpoKindTabsV2Final() 대신 여기서 직접 렌더합니다(그 함수가 삭제 대상 문구 3개를 품고 있어서).
// 버튼 클래스(.os-kind-tabs .os-kind-tabs-strong .bpo-kind-tabs)는 그대로 재사용하므로 탭 모양은 동일합니다.
// 실투입('direct')은 [신규등록]을 경고·요약과 한 줄에 묶어 보드(.osv3-headrow)가 직접 그리므로 여기선 툴바를 생략합니다.
function renderBpoOutsourcePanelFinal(data) {
  // info = 헤드 라인(.osv3-headrow) 좌측에 들어갈 탭별 안내. body = 표 + 폼.
  // 모든 탭이 같은 한 줄을 쓰고 그 줄 높이가 고정(min-height)이라, 어느 탭을 골라도 표가 같은 높이에서 시작합니다.
  let info = '';
  let body = '';
  if (outsourceKind === 'professional') {
    body = renderBpoContractPanelV2('professional');
  } else if (outsourceKind === 'travel') {
    body = renderBpoTravelPanelV2();
  } else if (outsourceKind === 'construction') {
    body = renderBpoMaPanelV2();
  } else if (outsourceKind === 'transfer') {
    // 공유 renderBpoTransferPanelV2()는 [등록 기준 박스 + 표 + 폼]을 한 덩어리로 반환해 박스가 표 위에 한 줄을
    // 더 차지합니다. 그 박스를 헤드 라인으로 올리기 위해 여기서 직접 조립합니다(표·폼은 공유 함수 그대로 호출).
    info = `
      <div class="osv3-headinfo">
        <div class="bpo-rule-note" title="신규 계획 등록은 Receiver Project만 가능합니다. Sender Project는 타 시스템에서 집행이 완료된 뒤 이관 결과로 수신되어 리스트에서 조회만 가능합니다.">
          <strong>이관외주비 등록 기준</strong>
          <span>신규 등록은 Receiver Project만 가능 · Sender Project는 집행완료 후 조회 전용</span>
        </div>
      </div>`;
    body = `${renderBpoListTableV2('transfer', bpoTransferPlansV2)}${bpoFormOpenV2 ? renderBpoTransferFormV2() : ''}`;
  } else if (outsourceKind === 'other') {
    body = renderBpoOtherPanelV2();
  } else {
    info = osv3DirectHeadInfoV3();
    body = renderBpoContractPanelV2('direct');
  }

  return `
    <div class="osv3-shell">
      <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
        ${BPO_OUTSOURCE_KINDS_V2.map(item => `
          <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchBpoKindV2Final('${item.id}')">
            <em>${item.no}</em>
            <strong>${item.label}</strong>
            <span>${item.desc}</span>
          </button>`).join('')}
      </div>
      <div class="osv3-headrow">
        ${info}
        <button class="labor-main-btn" onclick="bpoOpenNewV2('${outsourceKind}')">신규등록</button>
      </div>
      ${body}
    </div>`;
}
