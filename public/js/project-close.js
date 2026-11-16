// AI GUIDE: 프로젝트 종료 화면 로직 파일입니다.
// - 실행예산 프로젝트 목록과 유사한 방식으로 종료 대상 프로젝트를 조회합니다.
// - 상세 화면에서는 구매 검수 완료 여부, 산출물 등록 여부, 계약 종료일, 프로젝트 종료일을 확인합니다.
// - 종료 가능 판단은 현행 종료 조건(ClosingProject.vue validateSave: 구매 검수 / 빌링 / 진행 중 실행예산 없음)에
//   TO-BE 세션 자료(11.11)의 입금 / 인력 투입 / 경비 확인을 더합니다.
// - TO-BE 자동종료 (PM 답변 11.05)
//     ① 종료일 +30일 : 상태 '수행(임시종료)' 표시. ERP 종료 전송 없음. 종료일 연장 안내. 종료일이 바뀌면 일정 재계산
//     ② 종료일 +60일 : 연장 / 예외 등록이 없으면 자동종료 대상 → 종료 조건 충족 시 수동 종료와 같은 방식으로 ERP 종료 전송
//                      조건 미충족이면 자동종료 보류(조건을 채우면 다음 처리 때 종료)
//     ③ 수동 종료    : 자동종료 예정일 전에도 [종료 신청] 가능. 이미 종료된 건은 자동종료 대상에서 제외
//     자동종료 예외  : 회계처리 등으로 ERP 프로젝트를 Active 로 유지해야 할 때 신규 등록 (신규 개발)
// - 대상은 상태 '수행'(ERP Active) 프로젝트입니다. 착수완료 건은 ERP에 예산이 없어 이 목록에 나오지 않습니다.

let projectCloseView = 'list';
let projectCloseCurrentKey = '';
let projectCloseSearchQuery = '';
let projectCloseTypeFilter = '';
let projectCloseStatusFilter = '';
let projectCloseCustomerQuery = '';
let projectCloseSalesOrgQuery = '';
let projectClosePmQuery = '';

// 목업 기준일
const PC_TODAY = '2026-11-05';

// 프로젝트별 종료 정보 (번호 기준) — 목록 원본(EXEC_BUDGET_PROJECTS)에 없는 값
const PROJECT_CLOSE_EXTRA = {
  '30131234-D001': { no:'30133728-D001', name:'SK바이오팜_26년_외화 펌뱅킹 MX 전문 전환', contractEnd:'2026-10-23', projectEnd:'2026-10-23', deliverables:'미완료', billing:'미완료' },
  'IV107785': { projectEnd:'2026-09-25', staffing:'미완료' },
  'IV107782': { projectEnd:'2026-10-01', payment:'미완료', expense:'미완료' },
  'IV107779': { exception:{ reason:'회계처리', until:'2026-12-31', memo:'12월 결산 전표 정리 후 종료', by:'전종희', at:'2026-09-10' } },
  'IV107778': { closed:{ date:'2026-09-14', by:'자동종료' } },
  'IV107776': { purchaseInspection:'미완료' },
  'IV107775': { closed:{ date:'2026-08-05', by:'수동 종료' } },
  'IV107773': { projectEnd:'2026-10-28' },
  '30140055-D001': { rentalEquip:true },
};

function pcDays(from, to) { return Math.floor((new Date(to) - new Date(from)) / 86400000); }
function pcAddDays(dateStr, n) { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// 종료 조건 (현행 ClosingProject.vue:1019-1139 요약 + TO-BE 세션 자료 11.11: 청구 / 입금 / 인력 투입 / 검수 / 경비 완료 확인)
function pcConditions(p) {
  return [
    { label:'빌링 완료', ok: p.billing === '완료', msg:'프로젝트 종료선언은 구매 검수완료, 빌링여부 완료 후에 가능합니다.' },
    { label:'입금 완료', ok: p.payment === '완료', msg:'입금이 완료되지 않아 프로젝트를 종료할 수 없습니다.' },
    { label:'인력 투입 종료', ok: p.staffing === '완료', msg:'투입 중인 인력이 있어 프로젝트를 종료할 수 없습니다.' },
    { label:'구매 검수 완료', ok: p.purchaseInspection === '완료', msg:'프로젝트 종료선언은 구매 검수완료, 빌링여부 완료 후에 가능합니다.' },
    { label:'경비 정산 완료', ok: p.expense === '완료', msg:'정산되지 않은 경비가 있어 프로젝트를 종료할 수 없습니다.' },
    { label:'진행 중인 실행예산 없음', ok: !p.budgetInProgress, msg:'실행예산리뷰 저장 또는 결재 진행 상태로 프로젝트 종료할 수 없습니다.' },
  ];
}

// 종료 상태 계산
function pcStatus(p) {
  if (p.closed) return '종료';
  if (p.exception) return '자동종료 예외';
  const passed = pcDays(p.projectEnd, PC_TODAY);
  if (passed < 30) return '수행';
  if (passed < 60) return '수행(임시종료)';
  return pcConditions(p).every(c => c.ok) ? '자동종료 대상' : '자동종료 보류';
}

const PC_STATUS_COLOR = {
  '수행':'#1d4ed8', '수행(임시종료)':'#b45309', '자동종료 대상':'#b91c1c', '자동종료 보류':'#7c2d12',
  '자동종료 예외':'#0f766e', '종료':'#166534',
};

function getProjectCloseRows() {
  const base = typeof EXEC_BUDGET_PROJECTS !== 'undefined' ? EXEC_BUDGET_PROJECTS : [];
  return base.filter(p => p.status === '수행').map(p => {
    const ex = PROJECT_CLOSE_EXTRA[p.no] || {};
    const end = ex.projectEnd || getPeriodEnd(p.period);
    const row = {
      ...p,
      key: p.no,
      closeNo: ex.no || p.no,
      closeName: ex.name || p.name,
      purchaseInspection: ex.purchaseInspection || '완료',
      deliverables: ex.deliverables || '완료',
      billing: ex.billing || '완료',
      payment: ex.payment || '완료',
      staffing: ex.staffing || '완료',
      expense: ex.expense || '완료',
      budgetInProgress: !!ex.budgetInProgress,
      rentalEquip: !!ex.rentalEquip,
      contractEnd: ex.contractEnd || end,
      projectEnd: end,
      exception: ex.exception || null,
      closed: ex.closed || null,
      reportStatus: '계획',
    };
    row.tmpCloseDt = pcAddDays(end, 30);
    row.autoCloseDt = pcAddDays(end, 60);
    row.closeState = pcStatus(row);
    return row;
  });
}

function renderProjectClose() {
  const el = document.getElementById('s-project-close');
  if (!el) return;
  el.innerHTML = projectCloseView === 'detail'
    ? renderProjectCloseDetail()
    : renderProjectCloseList();
}

function resetProjectCloseFilters() {
  projectCloseSearchQuery = '';
  projectCloseTypeFilter = '';
  projectCloseStatusFilter = '';
  projectCloseCustomerQuery = '';
  projectCloseSalesOrgQuery = '';
  projectClosePmQuery = '';
  renderProjectClose();
}

function openProjectCloseDetail(key) {
  projectCloseCurrentKey = key;
  projectCloseView = 'detail';
  renderProjectClose();
}

function closeProjectCloseDetail() {
  projectCloseView = 'list';
  renderProjectClose();
}

function pcStatusChip(s) {
  return `<span style="display:inline-block;font-size:11.5px;font-weight:800;color:${PC_STATUS_COLOR[s] || '#475569'};white-space:nowrap">${s}</span>`;
}

function renderProjectCloseList() {
  const q = projectCloseSearchQuery.trim().toLowerCase();
  const customerQ = projectCloseCustomerQuery.trim().toLowerCase();
  const salesOrgQ = projectCloseSalesOrgQuery.trim().toLowerCase();
  const pmQ = projectClosePmQuery.trim().toLowerCase();
  const allRows = getProjectCloseRows();
  const entries = allRows.filter(p => {
    const matchText = !q || p.closeNo.toLowerCase().includes(q) || p.closeName.toLowerCase().includes(q);
    const matchType = !projectCloseTypeFilter || p.type === projectCloseTypeFilter;
    const matchStatus = !projectCloseStatusFilter || p.closeState === projectCloseStatusFilter;
    const matchCustomer = !customerQ || (p.customer || '').toLowerCase().includes(customerQ);
    const matchSalesOrg = !salesOrgQ || (p.salesOrg || '').toLowerCase().includes(salesOrgQ);
    const matchPm = !pmQ || (p.pm || '').toLowerCase().includes(pmQ);
    return matchText && matchType && matchStatus && matchCustomer && matchSalesOrg && matchPm;
  });

  const typeOptions = ['', ...new Set(allRows.map(p => p.type))].map(v =>
    `<option value="${v}" ${v === projectCloseTypeFilter ? 'selected' : ''}>${v || '전체'}</option>`
  ).join('');
  const statusOptions = ['', '수행', '수행(임시종료)', '자동종료 대상', '자동종료 보류', '자동종료 예외', '종료'].map(v =>
    `<option value="${v}" ${v === projectCloseStatusFilter ? 'selected' : ''}>${v || '전체'}</option>`
  ).join('');
  const rows = entries.map(p => `
    <tr onclick="openProjectCloseDetail('${p.key}')">
      <td class="eb-no">${p.closeNo}</td>
      <td><div class="pt-name">${p.closeName}</div></td>
      <td class="pt-center"><span class="exec-chip type-${execTypeClass(p.type)}">${p.type}</span></td>
      <td class="pt-center">${pcStatusChip(p.closeState)}${p.closed ? `<div style="font-size:10.5px;color:#64748b">${p.closed.by} ${p.closed.date}</div>` : ''}</td>
      <td class="pt-center">${p.projectEnd}</td>
      <td class="pt-center">${p.closed ? '-' : p.tmpCloseDt}</td>
      <td class="pt-center">${p.closed ? '-' : p.exception ? '제외' : p.autoCloseDt}</td>
      <td class="pt-center">${p.pm}</td>
      <td class="pt-center">${p.salesOrg}</td>
    </tr>`).join('');

  return `
    <div class="exec-budget-page project-close-page">
      <div class="exec-budget-title"><span class="exec-title-dot"></span>프로젝트 종료</div>
      <div class="pc-rule">
        <b>자동종료 규칙</b>
        <span><i>종료일 +30일</i> 수행(임시종료) 표시, ERP 종료 전송 없음</span>
        <span><i>종료일 +60일</i> 종료 조건을 충족하면 자동종료 (ERP 종료 전송)</span>
        <span><i>예외</i> 종료일 연장(종료연기) 또는 자동종료 예외 등록 건은 제외</span>
      </div>
      <div class="exec-filter-panel">
        <label class="exec-filter-field exec-filter-code">
          <span>프로젝트 번호/명</span>
          <input type="text" value="${projectCloseSearchQuery}"
            oninput="projectCloseSearchQuery=this.value;renderProjectClose()">
        </label>
        <label class="exec-filter-field">
          <span>프로젝트 유형</span>
          <select onchange="projectCloseTypeFilter=this.value;renderProjectClose()">${typeOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>종료 상태</span>
          <select onchange="projectCloseStatusFilter=this.value;renderProjectClose()">${statusOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>고객사</span>
          <input type="text" value="${projectCloseCustomerQuery}"
            oninput="projectCloseCustomerQuery=this.value;renderProjectClose()">
        </label>
        <label class="exec-filter-field">
          <span>매출귀속조직</span>
          <input type="text" value="${projectCloseSalesOrgQuery}"
            oninput="projectCloseSalesOrgQuery=this.value;renderProjectClose()">
        </label>
        <label class="exec-filter-field">
          <span>수행PM</span>
          <input type="text" value="${projectClosePmQuery}"
            oninput="projectClosePmQuery=this.value;renderProjectClose()">
        </label>
        <div class="exec-filter-actions">
          <button class="exec-reset-btn" onclick="resetProjectCloseFilters()" title="초기화">↻</button>
          <button class="exec-search-btn" onclick="renderProjectClose()">검색</button>
        </div>
      </div>
      <div class="exec-list-head">
        <div class="exec-total">총 <strong>${fmt(entries.length)}</strong> 건</div>
        <div class="exec-actions">
          <button class="exec-text-btn">엑셀</button>
        </div>
      </div>
    </div>
    <div class="proj-table-card exec-table-card">
      <table class="proj-table exec-budget-table">
        <thead>
          <tr>
            <th class="pt-center">프로젝트번호</th>
            <th>프로젝트명</th>
            <th class="pt-center">프로젝트유형</th>
            <th class="pt-center">종료상태</th>
            <th class="pt-center">프로젝트 종료일</th>
            <th class="pt-center">임시종료일</th>
            <th class="pt-center">자동종료 예정일</th>
            <th class="pt-center">수행PM</th>
            <th class="pt-center">매출귀속조직</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="9"><div class="proj-no-result">검색 결과가 없습니다.</div></td></tr>`}</tbody>
      </table>
    </div>`;
}

function getProjectCloseDetailData() {
  const rows = getProjectCloseRows();
  return rows.find(p => p.key === projectCloseCurrentKey) || rows[0];
}

function renderProjectCloseDetail() {
  const p = getProjectCloseDetailData();
  const st = p.closeState;
  const closed = !!p.closed;
  const conds = pcConditions(p);
  let banner = '';
  if (st === '수행(임시종료)') {
    banner = `<div class="pc-banner warn">종료일(${p.projectEnd})이 30일 지나 <b>수행(임시종료)</b> 상태입니다. 기간 연장이 필요하면 [종료연기]로 종료일을 바꾸세요. 별도 조치가 없으면 <b>${p.autoCloseDt}</b>에 종료 조건을 확인해 자동종료됩니다.</div>`;
  } else if (st === '자동종료 대상') {
    banner = `<div class="pc-banner danger">종료일 +60일이 지나 <b>자동종료 대상</b>입니다. 종료 조건을 모두 충족해 다음 자동종료 처리 때 ERP에 종료가 전송됩니다.</div>`;
  } else if (st === '자동종료 보류') {
    banner = `<div class="pc-banner danger">종료일 +60일이 지났지만 종료 조건을 충족하지 못해 <b>자동종료가 보류</b>됐습니다. 아래 미충족 조건을 처리하면 다음 자동종료 처리 때 종료됩니다.</div>`;
  } else if (st === '자동종료 예외') {
    banner = `<div class="pc-banner ok"><b>자동종료 예외</b> 등록 건입니다. ${p.exception.until}까지 ERP 프로젝트를 Active로 유지합니다. (사유: ${p.exception.reason} / ${p.exception.memo})</div>`;
  } else if (closed) {
    banner = `<div class="pc-banner ok">${p.closed.date}에 <b>${p.closed.by}</b>된 프로젝트입니다. ERP에 종료 정보를 전송했습니다.</div>`;
  }
  const condRows = conds.map(c => `<span class="pc-cond ${c.ok ? 'ok' : 'ng'}">${c.ok ? '✔' : '✖'} ${c.label}</span>`).join('');

  return `
    <div class="project-close-detail">
      <div class="pcd-head">
        <div>
          <strong>${p.closeNo}</strong>
          <span>${p.closeName}</span>
        </div>
        <button onclick="closeProjectCloseDetail()">목록</button>
      </div>
      ${banner}

      <section class="pcd-box">
        <div class="pcd-section-title"><i></i>종료 정보</div>
        <div class="pcd-info-grid">
          ${renderProjectCloseField('프로젝트 상태', st)}
          ${renderProjectCloseField('구매 검수완료', p.purchaseInspection)}
          ${renderProjectCloseField('산출물등록(선택)', p.deliverables, '산출물 등록')}
          ${renderProjectCloseField('빌링 여부', p.billing, '빌링 이력조회')}
          ${renderProjectCloseField('입금 여부', p.payment)}
          ${renderProjectCloseField('인력 투입 종료', p.staffing)}
          ${renderProjectCloseField('경비 정산', p.expense)}
          ${renderProjectCloseField('계약 종료일', p.contractEnd)}
          ${renderProjectCloseField('프로젝트 종료일', p.projectEnd)}
          ${renderProjectCloseField('임시종료일 (종료일 +30일)', closed ? '-' : p.tmpCloseDt)}
          ${renderProjectCloseField('자동종료 예정일 (종료일 +60일)', closed ? '-' : p.exception ? '예외 등록으로 제외' : p.autoCloseDt)}
          ${renderProjectCloseField('종료 선언일', closed ? p.closed.date + ' (' + p.closed.by + ')' : '')}
        </div>
        <div class="pc-conds"><b>종료 조건</b>${condRows}</div>
        <div class="pcd-help">
          <p>※ 구매검수 “미완료” 시 : POP 시스템의 “검수/정산 &gt; 검수/대금지급현황” 메뉴에서 AP번호가 채번되었는지 확인바랍니다. AP번호가 없다면, 검수 후 AP전표처리가 아직 완료되지 않은 상태입니다.</p>
          <p>※ 산출물 등록 후 프로젝트 종료가 가능하며, 등록할 수 없는 경우 산출물관리 화면에서 제외사유 입력 바랍니다.</p>
          <p>※ 자동종료도 위 종료 조건을 똑같이 확인합니다. 조건을 채우지 못하면 자동종료가 보류됩니다.</p>
        </div>
      </section>

      <section class="pcd-box">
        <div class="pcd-section-title"><i></i>자동종료 예외</div>
        ${p.exception ? `
          <div class="pcd-info-grid">
            ${renderProjectCloseField('예외 사유', p.exception.reason)}
            ${renderProjectCloseField('ERP 유지 기한', p.exception.until)}
            ${renderProjectCloseField('상세 사유', p.exception.memo)}
            ${renderProjectCloseField('등록', p.exception.by + ' / ' + p.exception.at)}
          </div>` : `<div class="pc-empty">등록된 예외가 없습니다. 회계처리 / 전표 처리 등으로 종료일이 지나도 ERP 프로젝트를 Active로 유지해야 하면 예외를 등록하세요.</div>`}
      </section>

      <section class="pcd-box pcd-report-box">
        <div class="pcd-section-title"><i></i>사후점검 결과보고서(${p.reportStatus || '계획'})</div>
        <div class="pcd-report-line"></div>
        <div style="margin-top:10px"><button class="pc-action-btn" onclick="pcWriteReport()">📝 결과보고서 작성</button></div>
      </section>

      <div class="pcd-foot" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="pc-action-btn ghost" onclick="closeProjectCloseDetail()">취소</button>
        ${closed ? '' : `
          ${p.rentalEquip ? `<button class="pc-action-btn" onclick="pcRentalCheck()">대여장비확인</button>` : ''}
          <button class="pc-action-btn" onclick="pcForceClose('${p.key}')" title="PMO / 시스템관리자만 보임">⚠ 강제종료</button>
          <button class="pc-action-btn" onclick="pcOpenDelay('${p.key}')">📅 종료연기</button>
          ${p.exception
            ? `<button class="pc-action-btn" onclick="pcClearException('${p.key}')">자동종료 예외 해제</button>`
            : `<button class="pc-action-btn" onclick="pcOpenException('${p.key}')">자동종료 예외 등록</button>`}
          <button class="pc-action-btn primary" onclick="pcDeclareClose('${p.key}')">💾 종료 신청</button>`}
      </div>
    </div>`;
}

// ── 프로젝트 종료 C/U/D 핸들러 (목업 스텁) ──
(function pcInjectStyle() {
  if (typeof document === 'undefined' || document.getElementById('pc-crud-style')) return;
  var st = document.createElement('style'); st.id = 'pc-crud-style';
  st.textContent = '.pc-action-btn{font-size:14px;font-weight:700;border-radius:8px;padding:8px 16px;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151}.pc-action-btn.primary{background:#0B6E55;border-color:#0B6E55;color:#fff}.pc-action-btn.ghost{color:#6b7280}.pc-action-btn:hover{filter:brightness(0.97)}'
    + '.pc-rule{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin:10px 0 12px;font-size:12.5px;color:#78350f}.pc-rule b{font-weight:900;margin-right:4px}.pc-rule i{font-style:normal;font-weight:800;background:#fef3c7;border-radius:6px;padding:1px 7px;margin-right:5px}'
    + '.pc-banner{border-radius:10px;padding:11px 14px;margin:0 0 12px;font-size:13px;line-height:1.55}.pc-banner.warn{background:#fffbeb;border:1px solid #fcd34d;color:#78350f}.pc-banner.danger{background:#fef2f2;border:1px solid #fca5a5;color:#7f1d1d}.pc-banner.ok{background:#f0fdf4;border:1px solid #86efac;color:#14532d}'
    + '.pc-conds{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 4px;font-size:12.5px}.pc-conds b{font-weight:900;margin-right:4px}.pc-cond{padding:3px 10px;border-radius:99px;font-weight:700}.pc-cond.ok{background:#dcfce7;color:#166534}.pc-cond.ng{background:#fee2e2;color:#991b1b}'
    + '.pc-empty{font-size:12.5px;color:#64748b;padding:6px 2px}'
    + '.pc-ov{position:fixed;inset:0;z-index:300;background:rgba(11,18,32,.45);display:flex;align-items:center;justify-content:center;padding:20px}.pc-modal{background:#fff;border-radius:14px;width:100%;max-width:460px;padding:18px 20px;box-shadow:0 24px 60px -20px rgba(11,18,32,.5)}.pc-modal h3{margin:0 0 4px;font-size:16px}.pc-modal p{margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5}.pc-modal label{display:block;font-size:12px;font-weight:800;color:#334155;margin:10px 0 4px}.pc-modal input,.pc-modal select,.pc-modal textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit}.pc-modal .foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}';
  document.head.appendChild(st);
})();

function pcFindExtra(key) {
  if (!PROJECT_CLOSE_EXTRA[key]) PROJECT_CLOSE_EXTRA[key] = {};
  return PROJECT_CLOSE_EXTRA[key];
}

function pcCloseModal() {
  var ov = document.getElementById('pc-ov');
  if (ov) ov.remove();
}

function pcShowModal(html) {
  pcCloseModal();
  var ov = document.createElement('div');
  ov.id = 'pc-ov'; ov.className = 'pc-ov';
  ov.innerHTML = '<div class="pc-modal">' + html + '</div>';
  document.body.appendChild(ov);
}

// 종료연기 — 현행 [종료연기](종료일 변경 결재). 승인되면 임시종료 / 자동종료 일정을 새 종료일로 다시 계산
function pcOpenDelay(key) {
  var p = getProjectCloseRows().find(function (r) { return r.key === key; });
  pcShowModal('<h3>종료연기</h3>'
    + '<p>현재 종료일 ' + p.projectEnd + '. 결재가 승인되면 종료일이 바뀌고, 임시종료일 / 자동종료 예정일을 새 종료일 기준으로 다시 계산합니다.</p>'
    + '<label>변경 종료일</label><input type="date" id="pc-delay-dt" min="' + PC_TODAY + '">'
    + '<label>연기 사유</label><textarea id="pc-delay-memo" rows="3"></textarea>'
    + '<div class="foot"><button class="pc-action-btn ghost" onclick="pcCloseModal()">취소</button><button class="pc-action-btn primary" onclick="pcSaveDelay(\'' + key + '\')">결재 요청</button></div>');
}
function pcSaveDelay(key) {
  var dt = document.getElementById('pc-delay-dt').value;
  var memo = document.getElementById('pc-delay-memo').value.trim();
  if (!dt) { alert('변경 종료일을 입력하세요.'); return; }
  if (dt <= PC_TODAY) { alert('변경 종료일은 오늘 이후여야 합니다.'); return; }
  if (!memo) { alert('연기 사유를 입력하세요.'); return; }
  pcFindExtra(key).projectEnd = dt;
  pcCloseModal();
  renderProjectClose();
  if (typeof showToast === 'function') showToast('종료연기 결재가 승인됐다고 보고 종료일을 ' + dt + '로 바꿨습니다. 임시종료일 / 자동종료 예정일을 다시 계산했습니다. (목업)');
}

// 자동종료 예외 등록 (신규 개발)
function pcOpenException(key) {
  pcShowModal('<h3>자동종료 예외 등록</h3>'
    + '<p>종료일이 지나도 ERP 프로젝트를 Active로 유지합니다. 기한까지 자동종료 대상에서 빠집니다.</p>'
    + '<label>예외 사유</label><select id="pc-exc-reason"><option value="">선택</option><option>회계처리</option><option>전표 처리</option><option>기타</option></select>'
    + '<label>ERP 유지 기한</label><input type="date" id="pc-exc-until" min="' + PC_TODAY + '">'
    + '<label>상세 사유</label><textarea id="pc-exc-memo" rows="3"></textarea>'
    + '<div class="foot"><button class="pc-action-btn ghost" onclick="pcCloseModal()">취소</button><button class="pc-action-btn primary" onclick="pcSaveException(\'' + key + '\')">등록</button></div>');
}
function pcSaveException(key) {
  var reason = document.getElementById('pc-exc-reason').value;
  var until = document.getElementById('pc-exc-until').value;
  var memo = document.getElementById('pc-exc-memo').value.trim();
  if (!reason) { alert('예외 사유를 선택하세요.'); return; }
  if (!until) { alert('ERP 유지 기한을 입력하세요.'); return; }
  if (until <= PC_TODAY) { alert('ERP 유지 기한은 오늘 이후여야 합니다.'); return; }
  if (!memo) { alert('상세 사유를 입력하세요.'); return; }
  pcFindExtra(key).exception = { reason: reason, until: until, memo: memo, by: '이봄', at: PC_TODAY };
  pcCloseModal();
  renderProjectClose();
  if (typeof showToast === 'function') showToast('자동종료 예외를 등록했습니다.');
}
function pcClearException(key) {
  if (!confirm('자동종료 예외를 해제하시겠습니까?\n해제하면 종료일 기준으로 다시 자동종료 대상이 됩니다.')) return;
  pcFindExtra(key).exception = null;
  renderProjectClose();
  if (typeof showToast === 'function') showToast('자동종료 예외를 해제했습니다.');
}

// 종료 신청 — 수동 종료. 현행 종료 조건을 확인한 뒤 ERP 종료 전송
function pcDeclareClose(key) {
  var p = getProjectCloseRows().find(function (r) { return r.key === key; });
  if (p.rentalEquip) { pcRentalAlert(); return; }
  var ng = pcConditions(p).find(function (c) { return !c.ok; });
  if (ng) { alert(ng.msg); return; }
  if (!confirm('프로젝트 ' + p.closeNo + ' 종료를 신청하시겠습니까?')) return;
  pcFindExtra(key).closed = { date: PC_TODAY, by: '수동 종료' };
  renderProjectClose();
  if (typeof showToast === 'function') showToast('프로젝트를 종료하고 ERP에 종료 정보를 전송했습니다. 자동종료 대상에서 제외됩니다.');
}
// 강제종료 — 현행: PMO / 시스템관리자가 종료 조건 검사 없이 종료 (대여장비가 있으면 반납 안내만)
function pcForceClose(key) {
  var p = getProjectCloseRows().find(function (r) { return r.key === key; });
  if (p.rentalEquip) { pcRentalAlert(); return; }
  if (!confirm('[프로젝트 종료선언]\n※ 종료선언 : 프로젝트 종료일은 등록하신 후 수정 할 수 없습니다.\n※ 종료선언 이후 불가능한 업무 1. Billing Request 2. 신규 구매요청\n\n종료 조건 검사 없이 강제종료합니다.')) return;
  pcFindExtra(key).closed = { date: PC_TODAY, by: '강제종료' };
  renderProjectClose();
  if (typeof showToast === 'function') showToast('저장했습니다. ERP에 종료 정보를 전송했습니다.');
}
// 대여장비 — 현행: OS 장비 5개 유형 + 대여장비가 남아 있으면 [대여장비확인](ServiceFLOW), 종료 대신 반납 안내
function pcRentalCheck() {
  if (typeof showToast === 'function') showToast('ServiceFLOW 대여장비 화면을 새 창으로 엽니다. (목업)');
}
function pcRentalAlert() {
  alert('[프로젝트 지원 자산 반납안내]\nServiceFLOW에서 프로젝트 변경 또는 반납 처리 후 종료할 수 있습니다.');
}
function pcWriteReport() {
  if (typeof showToast === 'function') showToast('사후점검 결과보고서 작성 화면을 엽니다. (목업)');
}
function pcFieldAction(btn) {
  var label = (btn.textContent || '').trim();
  if (typeof showToast === 'function') showToast(label + ' — 화면을 엽니다. (목업)');
}

function renderProjectCloseField(label, value, buttonLabel) {
  return `
    <div class="pcd-field">
      <span>${label}</span>
      <div>
        <strong>${value || ''}</strong>
        ${buttonLabel ? `<button onclick="pcFieldAction(this)">${buttonLabel}</button>` : ''}
      </div>
    </div>`;
}

function getPeriodEnd(period) {
  const parts = String(period || '').split('~');
  return parts[1] ? parts[1].trim() : '';
}
