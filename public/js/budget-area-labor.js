// AI GUIDE: 수행원가 > 원가조정 > 인건비(CATS[0]) 계정 전용 진입 소스입니다.
// - URL: #/budget-adjust/labor
// - 인건비 계정 편집기 진입점(데코레이터)과 예산내역 표, 상세계정 탭을 이 파일이 소유합니다.
// - 상세 패널(renderLaborDetailPlanPanelFinal, SCM 팝업/이관 폼/OT 그리드 등)은
//   여러 파일(budget-status-4.js 등)에 있는 공유 코어를 런타임 호출합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).
//
// [외주비(budget-area-outsource.js)와 맞춘 표시 규칙]
// 1) 예산내역 겉박스 없음: .account-monthly-card 의 테두리·배경·패딩을 인라인 !important 로 무력화합니다.
//    이 클래스는 재료비·A/S도 함께 쓰므로 CSS 파일을 건드리지 않고 인건비 렌더에서만 처리합니다.
// 2) "인건비" 합계 부모행 + 기본 접힘: 상세 3계정(실투입/이관/OT)을 화살표로 펼치고 접습니다.
// 3) 상세계정 탭은 구분 버튼만 남기고, 감싸는 보드와 "상세 계정 선택"·설명 문구는 제거합니다.

/* ==========================================================================
   1. 인건비 예산내역 — 겉박스 제거 + "인건비" 합계 부모행 + 접기/펼치기
   ========================================================================== */

// 기본값 false = 화면 진입 시 "인건비" 합계 한 줄만 보이고, 화살표로 상세 3계정을 펼칩니다.
var laborBudgetTreeOpenFinal = false;

// 상세계정별 구분 아이콘
var LABOR_DETAIL_ICONS_FINAL = {
  '실투입인건비': { ico:'◍', color:'#2f6bed' },
  '이관인건비': { ico:'⤵', color:'#ea002c' },
  'OT비': { ico:'◔', color:'#f5a623' },
  '종업원급여-OT': { ico:'◔', color:'#f5a623' },
};

function toggleLaborBudgetTreeFinal() {
  laborBudgetTreeOpenFinal = !laborBudgetTreeOpenFinal;
  renderBudgetPage();
}

function laborNumFinal(value) {
  return Number(value || 0);
}

var renderAccountMonthlyBudgetTableBeforeLaborTreeFinal = renderAccountMonthlyBudgetTable;
renderAccountMonthlyBudgetTable = function(data, account) {
  if (account !== CATS[0]) return renderAccountMonthlyBudgetTableBeforeLaborTreeFinal(data, account);

  const rows = getMonthlyBudgetRows(data, account);
  // 부모 "인건비" 행은 상세 3계정의 합계입니다.
  const totalPlan = rows.reduce((s, r) => s + laborNumFinal(r.plan), 0);
  const totalActual = rows.reduce((s, r) => s + laborNumFinal(r.actual), 0);
  const totalRemain = Math.max(totalPlan - totalActual, 0);
  const monthTotals = data.months.map((mo, idx) => rows.reduce((s, r) => s + laborNumFinal(r.months[idx]), 0));
  const headMonths = data.months.map(mo => `<th>${mo.m}</th>`).join('');
  const open = laborBudgetTreeOpenFinal;

  const parentRow = `
    <tr class="labor-acct-parent">
      <td class="acct-name" onclick="toggleLaborBudgetTreeFinal()">
        <button class="labor-acct-toggle" aria-expanded="${open}" title="${open ? '접기' : '펼치기'}"
          onclick="event.stopPropagation();toggleLaborBudgetTreeFinal()">${open ? '∧' : '∨'}</button>
        인건비<span class="labor-acct-count">상세계정 ${rows.length}</span>
      </td>
      <td class="num">${fmt(totalPlan)}</td>
      <td class="num">${fmt(totalActual)}</td>
      <td class="num">${fmt(totalRemain)}</td>
      ${monthTotals.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, '합계', v)}</td>`).join('')}
    </tr>`;

  const childRows = !open ? '' : rows.map(row => {
    const meta = LABOR_DETAIL_ICONS_FINAL[row.name] || { ico:'·', color:'#8a94a6' };
    return `
      <tr class="labor-acct-child">
        <td class="acct-name"><span class="labor-acct-ico" style="color:${meta.color}">${meta.ico}</span>${row.name}</td>
        <td class="num">${fmt(row.plan)}</td>
        <td class="num">${fmt(row.actual)}</td>
        <td class="num">${fmt(row.remain)}</td>
        ${row.months.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, row.name, v)}</td>`).join('')}
      </tr>`;
  }).join('');

  // 겉박스 제거: 공유 CSS(sk-theme의 .account-monthly-card !important)를 인라인 !important 로만 무력화합니다.
  return `
    <div class="account-monthly-card" style="border:0 !important;background:transparent !important;padding:0 !important;border-radius:0 !important">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-main-btn teal" onclick="showActualDetailModal('${account}','2026-06','전체')">${account} 실적조회</button>
        </div>
      </div>
      <div class="account-monthly-scroll" style="border-top:0 !important;border-radius:0 !important">
        <table class="account-monthly-table" style="background:#fff">
          <thead>
            <tr><th>구분</th><th>계획</th><th>실적/확정</th><th>잔여예산</th>${headMonths}</tr>
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
   2. 상세계정 탭 — 구분 버튼만 (보드/헤더 문구 제거)
   ========================================================================== */

// 공유 budget-status-4.js 의 renderLaborKindTabsFinal 은 .cost-category-board 안에
// "상세 계정 선택" 제목과 설명 문구 2개를 함께 렌더합니다. 그 문구들을 없애기 위해 이 파일에서 재정의합니다.
//
// 탭 모양은 외주비와 동일하게 맞춥니다. 컨테이너 클래스를 .labor-kind-tabs → .bpo-kind-tabs 로 바꾸는 것이
// 전부입니다 — sk-theme.css:602 에 "외주비 상세 계정 선택" 전용 재정의(풀폭 그리드 + 번호칩 노출 +
// 계정별 빨강 shade + 선택 시 컬러 테두리)가 .bpo-kind-tabs 에만 걸려 있기 때문입니다.
// .labor-kind-tabs 는 sk-theme.css:466 의 기본 세그먼트 스타일(다크 필 + 번호칩 숨김)을 받습니다.
// grid-auto-flow:column 이라 탭이 3개든 6개든 폭을 균등 분할합니다.
renderLaborKindTabsFinal = function() {
  const tabs = [
    { step:'01', label:'실투입인건비', desc:'SCM 확정 인력', active:laborKindFinal === 'direct', action:"switchLaborKindFinal('direct')" },
    { step:'02', label:'이관인건비', desc:'Receiver/Sender 이관', active:laborKindFinal === 'transfer', action:"switchLaborKindFinal('transfer')" },
    { step:'03', label:'OT비', desc:'월별 금액 키인', active:laborKindFinal === 'ot', action:"switchLaborKindFinal('ot')" },
  ];
  return `
    <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
      ${tabs.map(tab => `
        <button class="${tab.active ? 'active' : ''}" onclick="${tab.action}">
          <em>${tab.step}</em>
          <strong>${tab.label}</strong>
          <span>${tab.desc}</span>
        </button>`).join('')}
    </div>`;
};

/* ==========================================================================
   2-1. 인건비 알림 — 외주비 "분기 편중 주의"에 대응하는 계정 시그널 3종
   ========================================================================== */

// 목업 데이터. 실제로는 OT 정산 실적, P레벨 단가 마스터, SCM I/F 수신함에서 옵니다.
var laborSignalsFinal = {
  // Case1. 계획 없이 OT 정산으로 실적이 먼저 발생한 건
  otUnplanned: { count:12, amount:8400000, from:'2026-05', to:'2026-06' },
  // Case2. P레벨 단가는 매년 5월경 확정 → 인력·MM 변동이 없어도 계획 대비 예산이 초과될 수 있음
  pGradeRate: { year:2026, confirmedOn:'2026-05-15', rate:4.2, impact:26800000, planBasedOn:'2025년 단가' },
  // Case3. SCM에서 확정(승인)되어 I/F로 수신된 인력 — "등록"해야 인건비로 예산화됨
  scmInbox: [
    { id:'scm-1', name:'김도윤', grade:'P4', role:'백엔드 개발', mm:6.0, start:'2026-09-01', end:'2027-02-28', receivedOn:'2026-08-21' },
    { id:'scm-2', name:'박서연', grade:'P3', role:'UI 개발', mm:4.5, start:'2026-09-01', end:'2026-12-31', receivedOn:'2026-08-23' },
  ],
};

function laborGoKindFinal(kind) {
  switchLaborKindFinal(kind);
}

function laborOpenScmInboxFinal() {
  const inbox = laborSignalsFinal.scmInbox;
  showToast(`SCM 확정 인력 ${inbox.length}명(${inbox.map(p => p.name).join(', ')})을 등록 목록으로 불러옵니다.`);
  switchLaborKindFinal('direct');
}

function renderLaborAlertsFinal() {
  const s = laborSignalsFinal;
  const won = v => `₩${fmt(Math.round(Number(v || 0)))}`;
  const items = [];

  // Case3(가장 주요) — SCM 확정 → I/F 수신 → 등록 필요
  if (s.scmInbox && s.scmInbox.length) {
    const totalMm = s.scmInbox.reduce((sum, p) => sum + Number(p.mm || 0), 0);
    items.push(`
      <div class="labor-alert info">
        <em>SCM 인력 확정 수신</em>
        <div>SCM에서 투입계획이 확정(승인)된 인력 <b>${s.scmInbox.length}명 · ${totalMm.toFixed(1)}MM</b>이 I/F로 수신됐습니다
          (${s.scmInbox.map(p => `${p.name} ${p.grade}`).join(', ')}). 등록해야 인건비로 예산화됩니다.</div>
        <button class="labor-alert-btn" onclick="laborOpenScmInboxFinal()">확정 인력 등록</button>
      </div>`);
  }

  // Case1 — 계획 없이 OT 실적이 먼저 발생
  if (s.otUnplanned && s.otUnplanned.amount > 0) {
    items.push(`
      <div class="labor-alert warn">
        <em>OT비 실적 발생</em>
        <div>계획에 없던 OT 정산 <b>${s.otUnplanned.count}건 · ${won(s.otUnplanned.amount)}</b>이
          ${s.otUnplanned.from}~${s.otUnplanned.to} 실적으로 반영되어 인건비가 그만큼 증가했습니다. OT비 계획을 보정하세요.</div>
        <button class="labor-alert-btn" onclick="laborGoKindFinal('ot')">OT비 계획 열기</button>
      </div>`);
  }

  // Case2 — P레벨 단가 확정으로 인한 예산 초과
  if (s.pGradeRate && s.pGradeRate.impact > 0) {
    const p = s.pGradeRate;
    items.push(`
      <div class="labor-alert danger">
        <em>P레벨 단가 확정</em>
        <div>${p.year}년 P레벨 단가가 <b>${p.confirmedOn}</b>에 확정되어 전년 대비 <b>${p.rate}%</b> 인상됐습니다.
          계획은 ${p.planBasedOn} 기준으로 수립되어, 투입 인력·MM 변동이 없어도 예산이 <b>${won(p.impact)}</b> 초과될 수 있습니다.</div>
      </div>`);
  }

  return items.length ? `<div class="labor-alerts">${items.join('')}</div>` : '';
}

/* ==========================================================================
   3. 전용 스타일 주입 (공유 CSS 미변경)
   ========================================================================== */
(function injectLaborTreeStyleFinal() {
  if (document.getElementById('labor-tree-style')) return;
  const style = document.createElement('style');
  style.id = 'labor-tree-style';
  style.textContent = `
  .account-monthly-table tr.labor-acct-parent td { background:#f7f9fc; font-weight:700; }
  .account-monthly-table tr.labor-acct-parent td.acct-name { cursor:pointer; }
  .labor-acct-toggle {
    display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px;
    margin-right:6px; border:1px solid var(--sk-border-strong); border-radius:5px;
    background:#fff; color:var(--sk-muted); font-size:11px; line-height:1; cursor:pointer; padding:0;
  }
  .labor-acct-toggle:hover { border-color:var(--sk-blue); color:var(--sk-blue); }
  .labor-acct-count { margin-left:6px; font-weight:600; font-size:11px; color:var(--sk-muted); }
  .account-monthly-table tr.labor-acct-child td.acct-name { padding-left:30px; font-weight:500; }
  .labor-acct-ico { display:inline-block; width:14px; margin-right:6px; text-align:center; font-size:11px; }

  /* 인건비 계정 시그널 알림 (외주비 .osv3-alert 와 같은 시각 언어) */
  .labor-alerts { display:flex; flex-direction:column; gap:8px; margin:14px 0 4px; }
  .labor-alert {
    display:flex; align-items:center; gap:12px; padding:12px 14px;
    border:1px solid; border-radius:14px; font-size:14px; font-weight:700; line-height:1.5;
  }
  .labor-alert em { flex:0 0 auto; font-style:normal; font-weight:800; white-space:nowrap; }
  .labor-alert > div { flex:1 1 auto; min-width:0; font-weight:600; }
  .labor-alert b { font-weight:800; }
  .labor-alert.info   { background:var(--sk-blue-soft); border-color:#cfe0fb; color:var(--sk-blue-deep); }
  .labor-alert.warn   { background:#fff8e8; border-color:#f3ddad; color:#8a5b06; }
  .labor-alert.danger { background:#fdecef; border-color:#f6c3ce; color:var(--sk-red-deep); }
  .labor-alert-btn {
    flex:0 0 auto; border:1px solid currentColor; border-radius:8px; background:#fff;
    padding:6px 12px; font-size:13px; font-weight:800; color:inherit; cursor:pointer;
  }
  .labor-alert-btn:hover { background:currentColor; }
  .labor-alert-btn:hover { color:#fff; }
  .labor-alert.info .labor-alert-btn:hover { background:var(--sk-blue-deep); }
  .labor-alert.warn .labor-alert-btn:hover { background:#8a5b06; }
  `;
  document.head.appendChild(style);
})();

// 인건비 계정 편집기 데코레이터: 자기 계정(CATS[0])만 처리하고 나머지는 이전 정의로 위임
var renderBudgetAccountEditorBeforeLaborDetailFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[0]) return renderBudgetAccountEditorBeforeLaborDetailFinal(data, account);
  // 편집기 헤드([← 계정 선택] 버튼 + "인건비 수정" 제목/설명)는 제거했습니다(5개 계정 공통 정책).
  // 계정 선택으로 돌아가는 경로는 브라우저 뒤로가기(#/budget-adjust)로 유지됩니다.
  // "SCM 확정 인력 등록" 패널 겉박스 제거:
  //  ① 탭+패널을 감싸던 바깥 .labor-panel 래퍼를 없애고(테두리 1겹),
  //  ② 공유 renderLaborAssignmentPanel 이 자기 루트에 붙이는 .labor-panel 클래스도 떼어냅니다(1겹 더).
  //     .labor-scm-simple-panel 은 CSS가 없어 클래스만 남겨도 박스가 생기지 않습니다.
  //     이관/OT 패널은 .labor-panel 을 쓰지 않으므로 영향이 없습니다.
  const detail = renderLaborDetailPlanPanelFinal(data)
    .replace('class="labor-panel labor-scm-simple-panel"', 'class="labor-scm-simple-panel"');
  return `
    <div class="setup-editor">
      ${renderAccountMonthlyBudgetTable(data, account)}
      ${renderLaborAlertsFinal()}
      ${renderLaborKindTabsFinal()}
      ${detail}
    </div>`;
};
