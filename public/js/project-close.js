let projectCloseView = 'list';
let projectCloseCurrentKey = 'budgetMock';
let projectCloseSearchQuery = '';
let projectCloseTypeFilter = '';
let projectCloseStatusFilter = '';
let projectCloseCustomerQuery = '';
let projectCloseSalesOrgQuery = '';
let projectClosePmQuery = '';

const PROJECT_CLOSE_EXTRA = {
  budgetMock: {
    no:'30133728-D001',
    name:'SK바이오팜_26년_외화 펌뱅킹 MX 전문 전환',
    purchaseInspection:'완료',
    deliverables:'미완료',
    billing:'미완료',
    contractEnd:'2026-10-23',
    projectEnd:'2026-10-23',
    declaredAt:'',
    reportStatus:'계획',
  },
};

function getProjectCloseRows() {
  const base = typeof EXEC_BUDGET_PROJECTS !== 'undefined' ? EXEC_BUDGET_PROJECTS : [];
  return base.map((p, idx) => ({
    ...p,
    closeNo: idx === 0 ? '30133728-D001' : p.no,
    closeName: idx === 0 ? 'SK바이오팜_26년_외화 펌뱅킹 MX 전문 전환' : p.name,
    closeState: idx % 4 === 0 ? '종료준비' : idx % 4 === 1 ? '정산확인' : idx % 4 === 2 ? '보고서계획' : '대기',
  }));
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
  const statusOptions = ['', ...new Set(allRows.map(p => p.closeState))].map(v =>
    `<option value="${v}" ${v === projectCloseStatusFilter ? 'selected' : ''}>${v || '전체'}</option>`
  ).join('');
  const rows = entries.map(p => `
    <tr onclick="openProjectCloseDetail('${p.key}')">
      <td class="eb-no">${p.closeNo}</td>
      <td><div class="pt-name">${p.closeName}</div></td>
      <td class="pt-center"><span class="exec-chip type-${execTypeClass(p.type)}">${p.type}</span></td>
      <td class="pt-center"><span class="exec-chip status-${execStatusClass(p.status)}">${p.closeState}</span></td>
      <td class="pt-center">${p.pm}</td>
      <td class="pt-center">${p.salesOrg}</td>
      <td class="pt-center">${p.customer || ''}</td>
      <td class="pt-center">${p.period}</td>
    </tr>`).join('');

  return `
    <div class="exec-budget-page project-close-page">
      <div class="exec-budget-title"><span class="exec-title-dot"></span>프로젝트 종료</div>
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
            <th class="pt-center">수행PM</th>
            <th class="pt-center">매출귀속조직</th>
            <th class="pt-center">고객사</th>
            <th class="pt-center">프로젝트기간</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="8"><div class="proj-no-result">검색 결과가 없습니다.</div></td></tr>`}</tbody>
      </table>
    </div>`;
}

function getProjectCloseDetailData() {
  const row = getProjectCloseRows().find(p => p.key === projectCloseCurrentKey) || getProjectCloseRows()[0];
  return {
    ...row,
    ...(PROJECT_CLOSE_EXTRA[projectCloseCurrentKey] || {}),
    no: PROJECT_CLOSE_EXTRA[projectCloseCurrentKey]?.no || row.closeNo,
    name: PROJECT_CLOSE_EXTRA[projectCloseCurrentKey]?.name || row.closeName,
  };
}

function renderProjectCloseDetail() {
  const p = getProjectCloseDetailData();
  return `
    <div class="project-close-detail">
      <div class="pcd-head">
        <div>
          <strong>${p.no}</strong>
          <span>${p.name}</span>
        </div>
        <button onclick="closeProjectCloseDetail()">목록</button>
      </div>

      <section class="pcd-box">
        <div class="pcd-section-title"><i></i>종료 정보</div>
        <div class="pcd-info-grid">
          ${renderProjectCloseField('구매 검수완료', p.purchaseInspection || '완료')}
          ${renderProjectCloseField('산출물등록(선택)', p.deliverables || '미완료', '산출물 등록')}
          ${renderProjectCloseField('빌링 여부', p.billing || '미완료', '빌링 이력조회')}
          ${renderProjectCloseField('계약 종료일', p.contractEnd || getPeriodEnd(p.period))}
          ${renderProjectCloseField('프로젝트 종료일', p.projectEnd || getPeriodEnd(p.period))}
          ${renderProjectCloseField('종료 선언일', p.declaredAt || '')}
        </div>
        <div class="pcd-help">
          <p>※ 구매검수 “미완료” 시 : POP 시스템의 “검수/정산 &gt; 검수/대금지급현황” 메뉴에서 AP번호가 채번되었는지 확인바랍니다. AP번호가 없다면, 검수 후 AP전표처리가 아직 완료되지 않은 상태입니다.</p>
          <p>※ 산출물 등록 후 프로젝트 종료가 가능하며, 등록할 수 없는 경우 산출물관리 화면에서 제외사유 입력 바랍니다.</p>
          <p>※ 등록 시 Biz/Industry/고객 등 측면에서 향후 활용될 수 있는 산출물 중심으로 등록 부탁드립니다.</p>
        </div>
      </section>

      <section class="pcd-box pcd-report-box">
        <div class="pcd-section-title"><i></i>사후점검 결과보고서(${p.reportStatus || '계획'})</div>
        <div class="pcd-report-line"></div>
      </section>
    </div>`;
}

function renderProjectCloseField(label, value, buttonLabel) {
  return `
    <div class="pcd-field">
      <span>${label}</span>
      <div>
        <strong>${value || ''}</strong>
        ${buttonLabel ? `<button>${buttonLabel}</button>` : ''}
      </div>
    </div>`;
}

function getPeriodEnd(period) {
  const parts = String(period || '').split('~');
  return parts[1] ? parts[1].trim() : '';
}
