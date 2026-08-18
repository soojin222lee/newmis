/* ============================================================
   [budget-status 분할본 5/5] — 로드 순서 필수(앞 파트 뒤에 로드)
   원본 budget-status.js를 병렬작업용으로 5분할. 전역 스코프 공유.
   주요 영역: budget 화면 root + 수행원가 진입(showCost*) + 실행예산 override + 재료 검수
   ============================================================ */
var getMonthlyBudgetRowsBeforeExpenseMiddleFinal = getMonthlyBudgetRows;
getMonthlyBudgetRows = function(data, account) {
  if (account !== CATS[3]) return getMonthlyBudgetRowsBeforeExpenseMiddleFinal(data, account);
  return getExpenseMiddleRowsFinal().map(row => {
    const months = data.months.map(mo => {
      const idx = EXPENSE_PLAN_MONTHS.indexOf(mo.m);
      return idx >= 0 ? row.months[idx] : 0;
    });
    const plan = months.reduce((sum, value) => sum + value, 0);
    return { name:row.name, plan, actual:row.actual, remain:Math.max(plan - row.actual, 0), months };
  });
};

saveOtherMaterialExpense = function() {
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 이관재료비는 수정할 수 없습니다.');
    return;
  }
  const payload = {
    id: editing?.id || `om-${Date.now()}`,
    expectedMonth: document.getElementById('other-material-month')?.value || '2026-10',
    amount: parseBudgetAmount(document.getElementById('other-material-amount')?.value || 0),
    description: document.getElementById('other-material-desc')?.value || '이관재료비 계획',
    status: editing?.status || '계획',
    actualized: editing?.actualized || false,
  };
  if (!payload.amount) {
    showToast('이관재료비 금액을 입력해 주세요.');
    return;
  }
  if (editing) Object.assign(editing, payload);
  else rows.push(payload);
  editingOtherMaterialId = null;
  showToast(editing ? '이관재료비 계획이 수정되었습니다.' : '이관재료비 계획이 등록되었습니다.');
  renderBudgetPage();
};

function ensureBudgetScreenRootFinal() {
  const screen = document.getElementById('s-budget');
  if (!screen) return null;
  if (!document.getElementById('budget-body')) {
    screen.innerHTML = '<div id="budget-body"></div>';
  }
  return document.getElementById('budget-body');
}

function activateBudgetScreenFinal() {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const budgetScreen = document.getElementById('s-budget');
  if (budgetScreen) budgetScreen.classList.add('active');
  document.querySelectorAll('.nav-item, .nav-sub-item, .nav-sub2-item, .nav-group-btn').forEach(nav => nav.classList.remove('active'));
  const budgetNav = document.getElementById('nav-budget');
  if (budgetNav) budgetNav.classList.add('active');
}

// 수행원가 진입 모드: 'status'(원가현황) | 'adjust'(원가조정) | 'history'(변경 이력)
var costMode = 'history';
function showCostStatus() { costMode = 'status'; showBudget(); }
function showCostAdjust() { costMode = 'adjust'; showBudget(); }
function showCostHistory() { costMode = 'history'; showBudget(); }
// 특정 프로젝트의 원가현황으로 바로 이동(홈 인사이트 등에서 사용)
function openCostStatus(k) { costMode = 'status'; openBudgetProjectScreen(k || 'budgetMock'); }

openBudgetProjectScreen = function(projectKey) {
  const key = BUDGET_SOURCE[projectKey] ? projectKey : 'budgetMock';
  currentBudgetProj = key;
  budgetScreenView = 'detail';
  budgetDetailStep = 'setup';
  budgetSetupStage = (costMode === 'adjust') ? 'edit' : 'history';
  budgetSetupEditAccount = null;
  budgetTransferEditMode = false;
  editingLaborAssignmentId = null;
  editingOutsourceContractId = null;
  editingOtherOutsourceId = null;
  editingMaterialItemId = null;
  editingOtherMaterialId = null;
  materialItemEditorModeFinal = null;
  materialDirectInputOpenFinal = false;
  materialInspectionPopupOpenFinal = false;
  selectedLaborAssignmentId = (getLaborRows(key)[0] || {}).id || null;
  syncLaborAssignmentsToBudget(key);
  ensureBudgetScreenRootFinal();
  activateBudgetScreenFinal();
  renderBudgetPage();
  if (costMode === 'status') showBudgetSummaryGrid();
};

openAiProjectBudget = function(projectKey) {
  costMode = 'history';
  openBudgetProjectScreen(projectKey || 'budgetMock');
};

selectBudgetProj = function(projectKey) {
  openBudgetProjectScreen(projectKey || 'budgetMock');
};

selectBudgetProjFull = function(projectKey) {
  openBudgetProjectScreen(projectKey || 'budgetMock');
};

const materialDepreciationAccountsFinal = [
  { code:'713801', name:'감가상각비-IT자산(장비)' },
  { code:'713802', name:'감가상각비-IT자산(Tool)' },
  { code:'713803', name:'감가상각비-공기구비품' },
  { code:'713806', name:'감가상각비-시설물' },
];
var depreciationEditorModeFinal = null;
var depreciationAdjustPopupOpenFinal = false;
var depreciationMonthlyRowsFinal = [];
var depreciationAdjustPlanIdFinal = null;

function addMonthsFinal(month, offset) {
  const [year, monthNo] = String(month || '2026-07').split('-').map(Number);
  const date = new Date(year, (monthNo || 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildDepreciationMonthlyRowsFinal(startMonth, monthCount, totalAmount) {
  const count = Math.max(1, Number(monthCount || 1));
  const total = Number(totalAmount || 0);
  const base = Math.floor(total / count);
  let allocated = 0;
  return Array.from({ length:count }).map((_, idx) => {
    const amount = idx === count - 1 ? total - allocated : base;
    allocated += amount;
    return { month:addMonthsFinal(startMonth, idx), amount };
  });
}

function getDepPlanMonthlyRowsFinal(plan) {
  if (plan?.monthlyAllocations?.length) return plan.monthlyAllocations;
  if (!plan) return [];
  const start = plan.start || '2026-07';
  const months = Number(plan.months || monthRange(plan.start, plan.end).length || 1);
  const total = Number(plan.totalAmount || plan.monthly * months || plan.monthly || 0);
  return buildDepreciationMonthlyRowsFinal(start, months, total);
}

getDepreciationAmountForMonth = function(month) {
  return materialDepreciationPlans.reduce((sum, row) => {
    const allocation = getDepPlanMonthlyRowsFinal(row).find(item => item.month === month);
    if (allocation) return sum + Number(allocation.amount || 0);
    if (month >= row.start && month <= row.end) return sum + Number(row.monthly || 0);
    return sum;
  }, 0);
};

function openDepreciationNewFinal() {
  depreciationEditorModeFinal = 'new';
  editingDepreciationPlanId = null;
  depreciationMonthlyRowsFinal = [];
  renderBudgetPage();
}

function cancelDepreciationEditFinal() {
  depreciationEditorModeFinal = null;
  editingDepreciationPlanId = null;
  depreciationMonthlyRowsFinal = [];
  renderBudgetPage();
}

editDepreciationPlan = function(id) {
  editingDepreciationPlanId = id;
  depreciationEditorModeFinal = 'edit';
  materialKind = 'depreciation';
  const plan = materialDepreciationPlans.find(row => row.id === id);
  depreciationMonthlyRowsFinal = getDepPlanMonthlyRowsFinal(plan).map(row => ({ ...row }));
  renderBudgetPage();
};

function refreshDepreciationPreviewFinal() {
  const start = document.getElementById('dep-start')?.value || '2026-07';
  const count = parseBudgetAmount(document.getElementById('dep-months')?.value || 1);
  const total = parseBudgetAmount(document.getElementById('dep-total')?.value || 0);
  depreciationMonthlyRowsFinal = buildDepreciationMonthlyRowsFinal(start, count, total);
  renderBudgetPage();
}

function openDepreciationAdjustPopupFinal() {
  const editing = editingDepreciationPlanId ? materialDepreciationPlans.find(row => row.id === editingDepreciationPlanId) : null;
  const start = document.getElementById('dep-start')?.value || editing?.start || '2026-07';
  const count = parseBudgetAmount(document.getElementById('dep-months')?.value || editing?.months || 1);
  const total = parseBudgetAmount(document.getElementById('dep-total')?.value || editing?.totalAmount || editing?.monthly || 0);
  if (!total) {
    showToast('상각총액을 먼저 입력해 주세요.');
    return;
  }
  depreciationMonthlyRowsFinal = depreciationMonthlyRowsFinal.length
    ? depreciationMonthlyRowsFinal.map(row => ({ ...row }))
    : buildDepreciationMonthlyRowsFinal(start, count, total);
  depreciationAdjustPlanIdFinal = editing?.id || null;
  depreciationAdjustPopupOpenFinal = true;
  renderBudgetPage();
}

function closeDepreciationAdjustPopupFinal() {
  depreciationAdjustPopupOpenFinal = false;
  renderBudgetPage();
}

function saveDepreciationAdjustPopupFinal() {
  depreciationMonthlyRowsFinal = depreciationMonthlyRowsFinal.map((row, idx) => ({
    ...row,
    amount: parseBudgetAmount(document.getElementById(`dep-adjust-amount-${idx}`)?.value || row.amount),
  }));
  depreciationAdjustPopupOpenFinal = false;
  showToast('월별 감가상각 금액이 보정되었습니다.');
  renderBudgetPage();
}

function renderDepreciationAdjustPopupFinal() {
  if (!depreciationAdjustPopupOpenFinal) return '';
  const total = depreciationMonthlyRowsFinal.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="actual-detail-overlay open material-dep-adjust-overlay">
      <div class="actual-detail-modal material-dep-adjust-modal">
        <div class="actual-detail-head">
          <strong>월별 감가상각 금액 보정</strong>
          <button onclick="closeDepreciationAdjustPopupFinal()">×</button>
        </div>
        <p class="material-inspection-guide">기본 배분된 월별 감가상각 금액을 필요 시 수기로 조정한 뒤 저장합니다.</p>
        <div class="material-inspection-table-wrap">
          <table class="material-inspection-table material-dep-adjust-table">
            <thead><tr><th>월</th><th>기본/확정 금액</th><th>비고</th></tr></thead>
            <tbody>
              ${depreciationMonthlyRowsFinal.map((row, idx) => `
                <tr>
                  <td>${row.month}</td>
                  <td><input id="dep-adjust-amount-${idx}" inputmode="numeric" value="${row.amount}"></td>
                  <td>${idx === 0 ? '시작월' : ''}</td>
                </tr>`).join('')}
              <tr class="total"><td>합계</td><td class="num">${fmt(total)}원</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div class="actual-detail-foot">
          <button onclick="closeDepreciationAdjustPopupFinal()">취소</button>
          <button class="labor-main-btn" onclick="saveDepreciationAdjustPopupFinal()">보정 금액 저장</button>
        </div>
      </div>
    </div>`;
}

function renderDepreciationMonthlyPreviewFinal(rows) {
  if (!rows?.length) return '<div class="material-allocation-preview empty">상각 시작월, 개월수, 상각총액 입력 후 월별 금액 보정 버튼을 눌러 월별 계획을 확인하세요.</div>';
  return `
    <div class="material-allocation-preview dep-preview">
      <div class="material-allocation-head"><span>상각월</span><span>월별 금액</span></div>
      ${rows.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}
    </div>`;
}

function renderDepreciationFormFinal(editing) {
  const accountCode = editing?.accountCode || materialDepreciationAccountsFinal[0].code;
  const accountOptions = materialDepreciationAccountsFinal.map(account =>
    `<option value="${account.code}" ${account.code === accountCode ? 'selected' : ''}>${account.code} ${account.name}</option>`
  ).join('');
  const rows = depreciationMonthlyRowsFinal.length ? depreciationMonthlyRowsFinal : getDepPlanMonthlyRowsFinal(editing);
  const totalAmount = editing?.totalAmount || rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) || '';
  return `
    <div class="labor-card material-dep-form-card">
      <div class="labor-flow-title">
        <strong>${editing ? '감가상각비 계획 수정' : '감가상각비 신규 등록'}</strong>
        <button class="labor-sub-btn" onclick="cancelDepreciationEditFinal()">닫기</button>
      </div>
      <div class="labor-form os-ma-form material-dep-entry-form">
        <label class="wide"><span>감가상각 계정</span><select id="dep-account">${accountOptions}</select></label>
        <label><span>감가상각 시작월</span><input id="dep-start" type="month" value="${editing?.start || '2026-07'}" onchange="refreshDepreciationPreviewFinal()"></label>
        <label><span>감가상각 개월수</span><input id="dep-months" inputmode="numeric" value="${editing?.months || rows.length || 12}" oninput="refreshDepreciationPreviewFinal()"></label>
        <label><span>상각총액</span><input id="dep-total" inputmode="numeric" value="${totalAmount}" placeholder="예: 31200000" oninput="refreshDepreciationPreviewFinal()"></label>
        <label class="wide"><span>자산/비용명</span><input id="dep-asset" value="${editing?.asset || ''}" placeholder="예: 개발서버 장비 감가상각"></label>
        <label class="wide"><span>설명</span><textarea id="dep-note" rows="3" placeholder="예: 견적 데이터 기반 라이선스 월상각">${editing?.note || ''}</textarea></label>
      </div>
      <div class="labor-actions">
        <button class="labor-sub-btn" onclick="openDepreciationAdjustPopupFinal()">월별 금액 보정</button>
        <button class="labor-main-btn" onclick="saveDepreciationPlan()">${editing ? '수정 저장' : '감가상각비 등록'}</button>
      </div>
      ${renderDepreciationMonthlyPreviewFinal(rows)}
    </div>`;
}

renderMaterialDepreciationPanel = function() {
  const editing = editingDepreciationPlanId ? materialDepreciationPlans.find(row => row.id === editingDepreciationPlanId) : null;
  const editorOpen = depreciationEditorModeFinal === 'new' || depreciationEditorModeFinal === 'edit';
  const rows = materialDepreciationPlans.map(row => {
    const monthlyRows = getDepPlanMonthlyRowsFinal(row);
    const account = materialDepreciationAccountsFinal.find(item => item.code === row.accountCode);
    const total = monthlyRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return `
      <tr class="${editingDepreciationPlanId === row.id ? 'active' : ''}">
        <td>${row.accountCode || account?.code || '-'}</td>
        <td>${account?.name || row.accountName || row.asset}</td>
        <td>${row.asset}</td>
        <td>${row.start} ~ ${row.end}</td>
        <td class="num">${row.months || monthlyRows.length}개월</td>
        <td class="num">${fmt(total)}원</td>
        <td>${row.status}</td>
        <td><button class="labor-sub-btn" onclick="editDepreciationPlan('${row.id}')">수정</button></td>
      </tr>`;
  }).join('');

  return `
    <div class="material-dep-page">
      <div class="os-sub-summary ma material-dep-summary">
        <div><strong>${materialDepreciationPlans.length}</strong><span>감가상각 계획</span></div>
        <div><strong>${fmt(materialDepreciationPlans.reduce((sum, row) => sum + getDepPlanMonthlyRowsFinal(row).reduce((s, item) => s + Number(item.amount || 0), 0), 0))}원</strong><span>상각총액</span></div>
        <p>감가상각 계정 4개 중 하나를 선택하고 시작월/개월수/총액을 기준으로 월별 감가상각 계획을 생성합니다.</p>
      </div>
      <div class="os-registered-card material-dep-list-card">
        <div class="labor-flow-title">
          <strong>기등록 감가상각 계획리스트</strong>
          <button class="labor-main-btn" onclick="openDepreciationNewFinal()">신규등록</button>
        </div>
        <div class="material-dep-table-wrap">
          <table class="material-dep-table material-dep-list-table">
            <thead><tr><th>계정코드</th><th>감가상각 계정</th><th>자산/비용명</th><th>상각기간</th><th>개월수</th><th>상각총액</th><th>상태</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      ${editorOpen ? renderDepreciationFormFinal(editing) : ''}
      ${renderDepreciationAdjustPopupFinal()}
    </div>`;
};

saveDepreciationPlan = function() {
  const rows = depreciationMonthlyRowsFinal.length
    ? depreciationMonthlyRowsFinal.map(row => ({ ...row }))
    : buildDepreciationMonthlyRowsFinal(
        document.getElementById('dep-start')?.value || '2026-07',
        parseBudgetAmount(document.getElementById('dep-months')?.value || 1),
        parseBudgetAmount(document.getElementById('dep-total')?.value || 0)
      );
  const accountCode = document.getElementById('dep-account')?.value || materialDepreciationAccountsFinal[0].code;
  const account = materialDepreciationAccountsFinal.find(item => item.code === accountCode) || materialDepreciationAccountsFinal[0];
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const months = Number(document.getElementById('dep-months')?.value || rows.length || 1);
  const start = document.getElementById('dep-start')?.value || rows[0]?.month || '2026-07';
  const end = rows[rows.length - 1]?.month || addMonthsFinal(start, months - 1);
  if (!totalAmount) {
    showToast('상각총액을 입력해 주세요.');
    return;
  }
  const payload = {
    id: editingDepreciationPlanId || `dep-${Date.now()}`,
    accountCode,
    accountName: account.name,
    asset: document.getElementById('dep-asset')?.value || account.name,
    start,
    end,
    months,
    totalAmount,
    monthly: Math.round(totalAmount / Math.max(months, 1)),
    monthlyAllocations: rows,
    status:'계획',
    note: document.getElementById('dep-note')?.value || '',
  };
  const idx = materialDepreciationPlans.findIndex(row => row.id === payload.id);
  if (idx >= 0) materialDepreciationPlans[idx] = payload;
  else materialDepreciationPlans.unshift(payload);
  editingDepreciationPlanId = null;
  depreciationEditorModeFinal = null;
  depreciationMonthlyRowsFinal = [];
  showToast('감가상각비 계획이 저장되었습니다.');
  renderBudgetPage();
};

var materialTransferEditorOpenFinal = false;

function ensureMaterialTransferMockRowsFinal() {
  const rows = getOtherMaterialRows();
  rows.forEach(row => {
    if (!row.transferType) row.transferType = row.amount < 0 ? 'Sender Project' : 'Receiver Project';
    if (!row.description) row.description = row.transferType === 'Sender Project' ? '타 프로젝트로 재료비 이관' : '타 프로젝트 잔여 재료비 이관 수취';
  });
  if (!rows.some(row => row.id === 'mt-sender-actual-001')) {
    rows.push({
      id:'mt-sender-actual-001',
      transferType:'Sender Project',
      expectedMonth:'2026-07',
      amount:-2800000,
      description:'공통 테스트 장비 비용 타 프로젝트 배부',
      status:'집행완료',
      actualized:true,
    });
  }
}

function openMaterialTransferNewFinal() {
  materialTransferEditorOpenFinal = true;
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function closeMaterialTransferEditorFinal() {
  materialTransferEditorOpenFinal = false;
  editingOtherMaterialId = null;
  renderBudgetPage();
}

editOtherMaterialExpense = function(id) {
  const row = getOtherMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.transferType === 'Sender Project' || row.actualized || row.status === '집행완료') {
    showToast('Sender Project 또는 집행완료 건은 조회만 가능합니다.');
    return;
  }
  editingOtherMaterialId = id;
  materialTransferEditorOpenFinal = true;
  materialKind = 'other';
  renderBudgetPage();
};

cancelOtherMaterialEdit = function() {
  closeMaterialTransferEditorFinal();
};

renderOtherMaterialPanel = function() {
  ensureMaterialTransferMockRowsFinal();
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  const editorOpen = materialTransferEditorOpenFinal || !!editing;
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const listRows = rows.map(row => {
    const locked = row.transferType === 'Sender Project' || row.actualized || row.status === '집행완료';
    const amountClass = row.amount < 0 ? 'danger' : 'good';
    return `
      <div class="bpo-list-row material-transfer-row ${editingOtherMaterialId === row.id ? 'active' : ''}">
        <span>${row.transferType || 'Receiver Project'}</span>
        <span>${row.expectedMonth || '-'}</span>
        <strong class="${amountClass}">${fmt(row.amount || 0)}원</strong>
        <span>${row.description || '-'}</span>
        <em>${row.status || '계획'}</em>
        ${locked
          ? '<span class="bpo-readonly-text">조회</span>'
          : `<button class="labor-sub-btn" onclick="editOtherMaterialExpense('${row.id}')">수정</button>`}
      </div>`;
  }).join('');

  return `
    <div class="os-sub-summary ma material-transfer-summary">
      <div><strong>${rows.length}</strong><span>이관재료비 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>순 이관금액</span></div>
      <p>신규 계획 등록은 Receiver Project만 가능합니다. Sender Project는 타 시스템에서 집행이 완료된 뒤 이관 결과로 수신되어 리스트에서 조회만 가능합니다.</p>
    </div>
    <div class="os-registered-card material-transfer-list-card">
      <div class="labor-flow-title">
        <strong>이관재료비 계획 등록</strong>
        ${editorOpen ? '' : '<button class="labor-main-btn" onclick="openMaterialTransferNewFinal()">신규등록</button>'}
      </div>
      <div class="bpo-list-card material-transfer-list">
        <div class="bpo-list-head material-transfer-head">
          <span>Project Type</span><span>이관예정월</span><span>금액</span><span>이관 사유</span><span>상태</span><span></span>
        </div>
        ${listRows || '<div class="labor-empty">등록된 이관재료비 계획이 없습니다.</div>'}
      </div>
    </div>
    ${editorOpen ? renderMaterialTransferFormFinal(editing) : ''}`;
};

function renderMaterialTransferFormFinal(editing) {
  return `
    <div class="labor-card material-transfer-form-card">
      <div class="bpo-form-head">
        <div>
          <strong>${editing ? '이관재료비 계획 수정' : '이관재료비 계획 입력'}</strong>
          <span>신규 등록은 Receiver Project만 가능하며, Sender Project는 집행완료 후 조회 전용으로 반영됩니다.</span>
        </div>
        <button class="labor-sub-btn" onclick="closeMaterialTransferEditorFinal()">닫기</button>
      </div>
      <div class="labor-form os-other-form material-transfer-form">
        <label><span>Project Type</span><input id="other-material-transfer-type" value="Receiver Project" readonly></label>
        <label><span>이관예정월</span><input id="other-material-month" type="month" value="${editing?.expectedMonth || '2026-10'}"></label>
        <label><span>금액</span><input id="other-material-amount" inputmode="numeric" value="${editing ? Math.abs(editing.amount || 0) : ''}" placeholder="예: 6500000"></label>
        <label class="wide"><span>이관 사유</span><input id="other-material-desc" value="${editing?.description || ''}" placeholder="예: 타 프로젝트 잔여 재료비 이관 수취"></label>
      </div>
      <div class="bpo-rule-note">
        <strong>Receiver Project 기준</strong>
        <span>이관재료비 신규 계획은 수취 프로젝트 기준 플러스 금액으로 등록됩니다. 비용을 보내는 Sender Project 건은 집행 완료 후 조회 데이터로만 표시합니다.</span>
      </div>
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveOtherMaterialExpense()">${editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>`;
}

saveOtherMaterialExpense = function() {
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  if (editing && (editing.transferType === 'Sender Project' || editing.actualized || editing.status === '집행완료')) {
    showToast('Sender Project 또는 집행완료 건은 수정할 수 없습니다.');
    return;
  }
  const amount = parseBudgetAmount(document.getElementById('other-material-amount')?.value || 0);
  if (!amount) {
    showToast('이관재료비 금액을 입력해 주세요.');
    return;
  }
  const payload = {
    id: editing?.id || `om-${Date.now()}`,
    transferType:'Receiver Project',
    expectedMonth: document.getElementById('other-material-month')?.value || '2026-10',
    amount: Math.abs(amount),
    description: document.getElementById('other-material-desc')?.value || '타 프로젝트 잔여 재료비 이관 수취',
    status: editing?.status || '계획',
    actualized: false,
  };
  if (editing) Object.assign(editing, payload);
  else rows.unshift(payload);
  editingOtherMaterialId = null;
  materialTransferEditorOpenFinal = false;
  showToast(editing ? '이관재료비 계획이 수정되었습니다.' : '이관재료비 계획이 등록되었습니다.');
  renderBudgetPage();
};

renderDepreciationFormFinal = function(editing) {
  const accountCode = editing?.accountCode || materialDepreciationAccountsFinal[0].code;
  const accountOptions = materialDepreciationAccountsFinal.map(account =>
    `<option value="${account.code}" ${account.code === accountCode ? 'selected' : ''}>${account.code} ${account.name}</option>`
  ).join('');
  const rows = depreciationMonthlyRowsFinal.length ? depreciationMonthlyRowsFinal : getDepPlanMonthlyRowsFinal(editing);
  const totalAmount = editing?.totalAmount || rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) || '';
  return `
    <div class="labor-card material-dep-form-card">
      <div class="labor-flow-title">
        <strong>${editing ? '감가상각비 계획 수정' : '감가상각비 신규 등록'}</strong>
        <button class="labor-sub-btn" onclick="cancelDepreciationEditFinal()">닫기</button>
      </div>
      <div class="labor-form os-ma-form material-dep-entry-form">
        <label class="wide"><span>감가상각 계정</span><select id="dep-account">${accountOptions}</select></label>
        <label><span>감가상각 시작월</span><input id="dep-start" type="month" value="${editing?.start || '2026-07'}" onchange="refreshDepreciationPreviewFinal()"></label>
        <label><span>감가상각 개월수</span><input id="dep-months" inputmode="numeric" value="${editing?.months || rows.length || 12}" oninput="refreshDepreciationPreviewFinal()"></label>
        <label><span>상각총액</span><input id="dep-total" inputmode="numeric" value="${totalAmount}" placeholder="예: 31200000" oninput="refreshDepreciationPreviewFinal()"></label>
        <label class="wide"><span>자산/비용명</span><input id="dep-asset" value="${editing?.asset || ''}" placeholder="예: 개발서버 장비 감가상각"></label>
      </div>
      <div class="labor-actions">
        <button class="labor-sub-btn" onclick="openDepreciationAdjustPopupFinal()">월별 금액 보정</button>
        <button class="labor-main-btn" onclick="saveDepreciationPlan()">${editing ? '수정 저장' : '감가상각비 등록'}</button>
      </div>
      ${renderDepreciationMonthlyPreviewFinal(rows)}
    </div>`;
};

saveDepreciationPlan = function() {
  const rows = depreciationMonthlyRowsFinal.length
    ? depreciationMonthlyRowsFinal.map(row => ({ ...row }))
    : buildDepreciationMonthlyRowsFinal(
        document.getElementById('dep-start')?.value || '2026-07',
        parseBudgetAmount(document.getElementById('dep-months')?.value || 1),
        parseBudgetAmount(document.getElementById('dep-total')?.value || 0)
      );
  const accountCode = document.getElementById('dep-account')?.value || materialDepreciationAccountsFinal[0].code;
  const account = materialDepreciationAccountsFinal.find(item => item.code === accountCode) || materialDepreciationAccountsFinal[0];
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const months = Number(document.getElementById('dep-months')?.value || rows.length || 1);
  const start = document.getElementById('dep-start')?.value || rows[0]?.month || '2026-07';
  const end = rows[rows.length - 1]?.month || addMonthsFinal(start, months - 1);
  if (!totalAmount) {
    showToast('상각총액을 입력해 주세요.');
    return;
  }
  const payload = {
    id: editingDepreciationPlanId || `dep-${Date.now()}`,
    accountCode,
    accountName: account.name,
    asset: document.getElementById('dep-asset')?.value || account.name,
    start,
    end,
    months,
    totalAmount,
    monthly: Math.round(totalAmount / Math.max(months, 1)),
    monthlyAllocations: rows,
    status:'계획',
  };
  const idx = materialDepreciationPlans.findIndex(row => row.id === payload.id);
  if (idx >= 0) materialDepreciationPlans[idx] = payload;
  else materialDepreciationPlans.unshift(payload);
  editingDepreciationPlanId = null;
  depreciationEditorModeFinal = null;
  depreciationMonthlyRowsFinal = [];
  showToast('감가상각비 계획이 저장되었습니다.');
  renderBudgetPage();
};

var materialInspectionPlanQuoteNoFinal = '';

openMaterialInspectionPlanPopupFinal = function() {
  const context = getMaterialInspectionSourceFinal();
  if (!context.group && !context.editing) {
    showToast('검수 계획을 등록할 견적을 먼저 선택해 주세요.');
    return;
  }
  const sameQuoteRows = materialInspectionPlanQuoteNoFinal === context.quoteNo ? materialInspectionPlanRowsFinal : [];
  const existingRows = context.editing?.inspectionPlanRows || sameQuoteRows;
  materialInspectionPlanRowsFinal = existingRows?.length
    ? existingRows.map(row => ({ ...row }))
    : buildMaterialInspectionRowsFinal(context.lines, context.baseMonth);
  materialInspectionPlanQuoteNoFinal = context.quoteNo || context.editing?.quoteNo || '';
  materialInspectionPlanContextFinal = context;
  materialInspectionPopupOpenFinal = true;
  renderBudgetPage();
};

openMaterialItemNewFinal = function() {
  materialItemEditorModeFinal = 'new';
  editingMaterialItemId = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  materialInspectionPlanRowsFinal = [];
  materialInspectionPlanQuoteNoFinal = '';
  renderBudgetPage();
};

selectMaterialQuoteLine = function(quoteNo) {
  const group = getMaterialQuoteGroupFinal(quoteNo);
  if (!group) return;
  materialSelectedQuoteNoFinal = group.quoteNo;
  materialDirectInputOpenFinal = false;
  materialItemEditorModeFinal = 'new';
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = group.quoteNo;
  materialQuoteAmount = materialQuoteAmountFinal(group);
  materialQuoteTitle = group.purchaseName;
  materialInspectionPlanRowsFinal = [];
  materialInspectionPlanQuoteNoFinal = group.quoteNo;
  renderBudgetPage();
};

startMaterialDirectInput = function() {
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = true;
  materialItemEditorModeFinal = 'new';
  materialQuoteSelectedYn = 'N';
  materialQuoteNo = '';
  materialQuoteAmount = 0;
  materialQuoteTitle = '';
  editingMaterialItemId = null;
  materialInspectionPlanRowsFinal = [];
  materialInspectionPlanQuoteNoFinal = '';
  renderBudgetPage();
};

editMaterialItem = function(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  materialSelectedPlanIdFinal = id;
  editingMaterialItemId = id;
  materialItemEditorModeFinal = 'edit';
  materialDirectInputOpenFinal = row.quoteSelectedYn === 'N';
  materialSelectedQuoteNoFinal = row.quoteNo || '';
  materialInspectionPlanRowsFinal = (row.inspectionPlanRows || []).map(plan => ({ ...plan }));
  materialInspectionPlanQuoteNoFinal = row.quoteNo || '';
  renderBudgetPage();
};

// Final override: material item inspection planning popup.
var materialInspectionPopupOpenFinal = false;
var materialInspectionPlanRowsFinal = [];
var materialInspectionPlanContextFinal = null;

function addMonthsToMonthFinal(month, offset) {
  const [year, monthNo] = String(month || '2026-08').split('-').map(Number);
  const date = new Date(year, (monthNo || 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function materialInspectionLabelFinal(rows, fallback) {
  const months = [...new Set((rows || []).map(row => row.month).filter(Boolean))].sort();
  if (!months.length) return fallback || '-';
  return months.length === 1 ? months[0] : `${months[0]} 외 ${months.length - 1}개월`;
}

function getMaterialInspectionSourceFinal() {
  const editing = editingMaterialItemId ? getMaterialRows().find(row => row.id === editingMaterialItemId) : null;
  const quoteNo = document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal || editing?.quoteNo || '';
  const group = getMaterialQuoteGroupFinal(quoteNo);
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || editing?.amount || materialQuoteAmountFinal(group));
  const baseMonth = editing?.inspectionDueMonth || group?.inspectionDueMonth || '2026-08';
  return {
    editing,
    group,
    quoteNo,
    amount,
    baseMonth,
    lines: group?.lines || editing?.detailLines || [],
  };
}

function buildMaterialInspectionRowsFinal(lines, baseMonth) {
  const rows = [];
  (lines || []).forEach((line, lineIndex) => {
    const qty = Math.max(1, Math.round(Number(line.quantity || 1)));
    const unitAmount = Math.floor(Number(line.amount || 0) / qty);
    let allocated = 0;
    for (let idx = 0; idx < qty; idx += 1) {
      const isLast = idx === qty - 1;
      const amount = isLast ? Number(line.amount || 0) - allocated : unitAmount;
      allocated += amount;
      rows.push({
        id: `${line.itemNo || lineIndex + 1}-${idx + 1}`,
        itemNo: line.itemNo || String((lineIndex + 1) * 10),
        itemCode: line.itemCode || '',
        standardName: line.standardName || '',
        model: line.model || '',
        unit: line.unit || 'EA',
        sequence: idx + 1,
        month: addMonthsToMonthFinal(baseMonth, rows.length),
        quantity: 1,
        amount,
      });
    }
  });
  return rows;
}

function openMaterialInspectionPlanPopupFinal() {
  const context = getMaterialInspectionSourceFinal();
  if (!context.group && !context.editing) {
    showToast('검수 계획을 등록할 견적을 먼저 선택해 주세요.');
    return;
  }
  const existingRows = context.editing?.inspectionPlanRows || materialInspectionPlanRowsFinal;
  materialInspectionPlanRowsFinal = existingRows?.length
    ? existingRows.map(row => ({ ...row }))
    : buildMaterialInspectionRowsFinal(context.lines, context.baseMonth);
  materialInspectionPlanContextFinal = context;
  materialInspectionPopupOpenFinal = true;
  renderBudgetPage();
}

function closeMaterialInspectionPlanPopupFinal() {
  materialInspectionPopupOpenFinal = false;
  renderBudgetPage();
}

function updateMaterialInspectionMonthFinal(rowId, value) {
  materialInspectionPlanRowsFinal = materialInspectionPlanRowsFinal.map(row => row.id === rowId ? { ...row, month:value } : row);
}

function saveMaterialInspectionPlanFinal() {
  const rows = materialInspectionPlanRowsFinal.map(row => ({
    ...row,
    month: document.getElementById(`material-inspection-month-${row.id}`)?.value || row.month,
  }));
  if (rows.some(row => !row.month)) {
    showToast('검수 예정월을 모두 입력해 주세요.');
    return;
  }
  materialInspectionPlanRowsFinal = rows;
  const hidden = document.getElementById('material-inspection-due');
  if (hidden) hidden.value = rows.map(row => row.month).sort()[0] || '';
  materialInspectionPopupOpenFinal = false;
  showToast('검수 계획이 등록되었습니다.');
  renderBudgetPage();
}

function renderMaterialInspectionPlanPopupFinal() {
  if (!materialInspectionPopupOpenFinal) return '';
  const context = materialInspectionPlanContextFinal || getMaterialInspectionSourceFinal();
  const quoteAmount = context.amount || materialQuoteAmountFinal(context.group);
  const rows = materialInspectionPlanRowsFinal || [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="actual-detail-overlay open material-inspection-overlay">
      <div class="actual-detail-modal material-inspection-modal">
        <div class="actual-detail-head">
          <strong>상품재료비 검수 계획 등록</strong>
          <button onclick="closeMaterialInspectionPlanPopupFinal()">×</button>
        </div>
        <div class="material-inspection-quote">
          <div><span>견적번호</span><strong>${context.group?.quoteNo || context.quoteNo || '-'}</strong></div>
          <div><span>구매건명</span><strong>${context.group?.purchaseName || context.editing?.purchaseName || '-'}</strong></div>
          <div><span>업체</span><strong>${context.group?.vendor || context.editing?.vendor || '-'}</strong></div>
          <div><span>견적금액</span><strong>${fmt(quoteAmount)}원</strong></div>
        </div>
        <p class="material-inspection-guide">물품정보의 수량만큼 검수 예정월 행이 생성됩니다. 월 조정 후 저장하면 상품재료비 계획에 반영됩니다.</p>
        <div class="material-inspection-table-wrap">
          <table class="material-inspection-table">
            <thead>
              <tr>
                <th>항번</th><th>품목코드</th><th>표준품명</th><th>모델명</th><th>수량순번</th><th>검수 예정월</th><th>검수수량</th><th>검수금액</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.itemNo}</td>
                  <td>${row.itemCode || '-'}</td>
                  <td>${row.standardName || '-'}</td>
                  <td>${row.model || '-'}</td>
                  <td>${row.sequence}</td>
                  <td><input id="material-inspection-month-${row.id}" type="month" value="${row.month || ''}" onchange="updateMaterialInspectionMonthFinal('${row.id}', this.value)"></td>
                  <td class="num">${row.quantity}</td>
                  <td class="num">${fmt(row.amount)}원</td>
                </tr>`).join('')}
              <tr class="total"><td colspan="7">합계</td><td class="num">${fmt(total)}원</td></tr>
            </tbody>
          </table>
        </div>
        <div class="actual-detail-foot">
          <button onclick="closeMaterialInspectionPlanPopupFinal()">취소</button>
          <button class="labor-main-btn" onclick="saveMaterialInspectionPlanFinal()">검수 계획 저장</button>
        </div>
      </div>
    </div>`;
}

renderMaterialItemForm = function(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const group = isQuote ? getMaterialQuoteGroupFinal(source.quoteNo || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || source.detailLines || [];
  const main = lines[0] || source;
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
  const inspectionRows = editing?.inspectionPlanRows || materialInspectionPlanRowsFinal || [];
  const inspectionDueMonth = materialInspectionLabelFinal(inspectionRows, source.inspectionDueMonth || group?.inspectionDueMonth || '');
  const readonly = isQuote ? 'readonly' : '';
  return `
    <div class="labor-card material-entry-card">
      <div class="labor-flow-title">
        <strong>${editing ? '상품재료비 계획 수정' : '상품재료비 계획 등록'}</strong>
        ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
      </div>
      <div class="labor-form os-ma-form material-item-form">
        <label><span>견적선정유무</span><input value="${quoteYn}" readonly></label>
        <label><span>견적번호</span><input id="material-quote-no" value="${group?.quoteNo || source.quoteNo || ''}" readonly></label>
        <label><span>구매건명</span><input id="material-standard-name" value="${group?.purchaseName || source.purchaseName || source.standardName || ''}" ${readonly}></label>
        <label><span>업체</span><input id="material-manufacturer" value="${group?.vendor || source.vendor || source.manufacturer || ''}" ${readonly}></label>
        <label><span>대표 품목코드</span><input id="material-item-code" value="${main.itemCode || source.itemCode || ''}" ${readonly}></label>
        <label><span>대표 분류명</span><input id="material-category-name" value="${main.categoryName || source.categoryName || ''}" ${readonly}></label>
        <label><span>품목 수</span><input id="material-model" value="${isQuote ? `${lines.length}개 항목` : (source.model || '')}" ${readonly}></label>
        <label><span>수량 합계</span><input id="material-qty" inputmode="numeric" value="${isQuote ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : (source.quantity || 1)}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${isQuote ? 'SET' : (source.unit || 'EA')}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || group?.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label class="material-inspection-plan-field"><span>검수 계획 *</span><button type="button" class="labor-main-btn" onclick="openMaterialInspectionPlanPopupFinal()">검수 계획 등록</button><em>${inspectionDueMonth === '-' ? '수량 기준 검수 예정월을 등록하세요' : inspectionDueMonth}</em></label>
          <input type="hidden" id="material-inspection-due" value="${inspectionRows[0]?.month || source.inspectionDueMonth || group?.inspectionDueMonth || ''}">
          <input type="hidden" id="material-budget-start" value="${inspectionRows[0]?.month || source.inspectionDueMonth || group?.inspectionDueMonth || ''}">
          <input type="hidden" id="material-budget-end" value="${inspectionRows[0]?.month || source.inspectionDueMonth || group?.inspectionDueMonth || ''}">
          <input type="hidden" id="material-item-no" value="복수">
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || materialQuoteAmountFinal(group)}" readonly></label>
        ` : `
          <label><span>항번</span><input id="material-item-no" value="${source.itemNo || '10'}"></label>
          <label><span>예산 시작월 *</span><input id="material-budget-start" type="month" value="${startMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산 종료월 *</span><input id="material-budget-end" type="month" value="${endMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산금액 *</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" oninput="refreshMaterialAllocationPreview()"></label>
          <input type="hidden" id="material-inspection-due" value="${endMonth}">
        `}
      </div>
      ${isQuote ? `<div class="bpo-rule-note"><strong>견적 1건 기준 등록</strong><span>구매시스템 물품정보는 수정하지 않고, 실행예산에서는 검수 계획만 별도 팝업에서 등록합니다.</span></div>${renderMaterialQuoteDetailFinal(lines)}` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions"><button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button></div>
    </div>`;
};

saveMaterialItem = function() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpenFinal ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const startMonth = document.getElementById('material-budget-start')?.value || '';
  const endMonth = document.getElementById('material-budget-end')?.value || startMonth;
  const group = quoteYn === 'Y' ? getMaterialQuoteGroupFinal(document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || [];
  const main = lines[0] || {};
  const inspectionPlanRows = quoteYn === 'Y' ? (materialInspectionPlanRowsFinal || []).map(row => ({ ...row })) : [];
  const inspectionDueMonth = quoteYn === 'Y' ? (inspectionPlanRows.map(row => row.month).sort()[0] || '') : endMonth;
  if (quoteYn === 'Y' && !group) return showToast('등록할 구매 견적 1건을 먼저 선택해 주세요.');
  if (!amount) return showToast('견적/예산 금액을 입력해 주세요.');
  if (quoteYn === 'Y' && !inspectionPlanRows.length) return showToast('검수 계획 등록 팝업에서 검수 예정월을 먼저 저장해 주세요.');
  if (quoteYn === 'Y' && inspectionPlanRows.some(row => !row.month)) return showToast('검수 예정월을 모두 입력해 주세요.');
  if (quoteYn === 'N' && (!startMonth || !endMonth || startMonth > endMonth)) return showToast('예산 시작월과 종료월을 확인해 주세요.');

  const directLine = {
    itemNo:document.getElementById('material-item-no')?.value || '10',
    itemCode:document.getElementById('material-item-code')?.value || '',
    categoryName:document.getElementById('material-category-name')?.value || '',
    standardName:document.getElementById('material-standard-name')?.value || '',
    manufacturer:document.getElementById('material-manufacturer')?.value || '',
    model:document.getElementById('material-model')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
    unit:document.getElementById('material-unit')?.value || 'EA',
    amount,
  };
  const id = editing?.id || `mi-${Date.now()}`;
  const monthlyAllocations = quoteYn === 'Y'
    ? Object.values(inspectionPlanRows.reduce((acc, row) => {
        acc[row.month] = acc[row.month] || { month:row.month, amount:0 };
        acc[row.month].amount += Number(row.amount || 0);
        return acc;
      }, {})).sort((a, b) => a.month.localeCompare(b.month))
    : buildMaterialAllocations(startMonth, endMonth, amount);
  const item = {
    id,
    quoteSelectedYn: quoteYn,
    quoteLineId: group?.quoteNo || '',
    quoteNo: group?.quoteNo || '',
    purchaseName: group?.purchaseName || directLine.standardName || '직접입력 상품재료비',
    vendor: group?.vendor || directLine.manufacturer,
    poNo: document.getElementById('material-po-no')?.value || group?.poNo || '',
    itemNo: quoteYn === 'Y' ? '복수' : directLine.itemNo,
    itemCode: main.itemCode || directLine.itemCode,
    categoryName: main.categoryName || directLine.categoryName,
    standardName: group?.purchaseName || directLine.standardName,
    manufacturer: group?.vendor || directLine.manufacturer,
    large: main.categoryName || directLine.categoryName,
    small: group?.purchaseName || directLine.standardName,
    model: quoteYn === 'Y' ? `${lines.length}개 항목` : directLine.model,
    productDetail: group?.purchaseName || directLine.standardName,
    quantity: quoteYn === 'Y' ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : directLine.quantity,
    unit: quoteYn === 'Y' ? 'SET' : directLine.unit,
    revenueBasis: materialInspectionLabelFinal(inspectionPlanRows, inspectionDueMonth),
    inspectionDueMonth,
    inspectionPlanLabel: materialInspectionLabelFinal(inspectionPlanRows, inspectionDueMonth),
    inspectionPlanRows,
    deliveryStart: monthStartDate(startMonth || inspectionDueMonth),
    deliveryEnd: monthEndDate(endMonth || inspectionDueMonth),
    amount,
    itemCount: quoteYn === 'Y' ? lines.length : 1,
    detailLines: quoteYn === 'Y' ? lines : [directLine],
    monthlyAllocations,
    status:'계획',
  };
  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) return showToast('품목 정보를 입력해 주세요.');
  if (editing) Object.assign(editing, item);
  else rows.unshift(item);
  materialSelectedPlanIdFinal = id;
  editingMaterialItemId = null;
  materialItemEditorModeFinal = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  materialInspectionPlanRowsFinal = [];
  materialInspectionPlanQuoteNoFinal = '';
  showToast(editing ? '상품재료비 계획이 수정되었습니다.' : '상품재료비 계획이 등록되었습니다.');
  renderBudgetPage();
};

renderMaterialItemPanel = function() {
  ensureMaterialItemMockRowsFinal();
  const rows = getMaterialRows();
  if (!materialSelectedPlanIdFinal && rows.length) materialSelectedPlanIdFinal = rows[0].id;
  const selectedPlan = rows.find(row => row.id === materialSelectedPlanIdFinal) || null;
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedGroup = materialSelectedQuoteNoFinal ? getMaterialQuoteGroupFinal(materialSelectedQuoteNoFinal) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpenFinal ? 'N' : 'Y');
  const formSource = editing || (quoteYn === 'Y' && selectedGroup ? {
    quoteSelectedYn:'Y',
    quoteNo:selectedGroup.quoteNo,
    purchaseName:selectedGroup.purchaseName,
    vendor:selectedGroup.vendor,
    poNo:selectedGroup.poNo,
    inspectionDueMonth:selectedGroup.inspectionDueMonth,
    detailLines:selectedGroup.lines,
    ...materialQuoteMainLineFinal(selectedGroup),
    deliveryStart:monthStartDate(selectedGroup.inspectionDueMonth),
    deliveryEnd:monthEndDate(selectedGroup.inspectionDueMonth),
    amount:materialQuoteAmountFinal(selectedGroup),
  } : { quoteSelectedYn:'N', itemNo:'10', itemCode:'', categoryName:'', standardName:'', manufacturer:'', model:'', quantity:1, unit:'EA', deliveryStart:'2026-08-01', deliveryEnd:'2026-12-31', quoteNo:'', poNo:'', amount:0 });
  const editorOpen = materialItemEditorModeFinal === 'new' || materialItemEditorModeFinal === 'edit';
  const detailInspection = selectedPlan?.inspectionPlanRows || [];

  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 구매건</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매건/PO 기준으로 1줄씩 관리하고, 라인을 클릭하면 항번별 상세와 검수 계획을 확인합니다.</p>
    </div>

    <div class="os-registered-card material-plan-list-card">
      <div class="labor-flow-title">
        <strong>상품계획 목록</strong>
        <button class="labor-main-btn" onclick="openMaterialItemNewFinal()">신규 등록</button>
      </div>
      <div class="os-ma-table-wrap">
        <div class="os-ma-table material-item-plan-table">
          <div class="os-ma-head with-action material-item-head">
            <span>PO번호</span><span>견적번호</span><span>구매건명</span><span>업체</span><span>대표 품목</span><span>항번 수</span><span>검수계획</span><span>금액</span><span>상태</span><span></span><span></span>
          </div>
          ${rows.map(row => `<div class="os-ma-row with-action material-item-row ${materialSelectedPlanIdFinal === row.id ? 'active' : ''}" onclick="selectMaterialPlanFinal('${row.id}')"><span>${row.poNo || '-'}</span><span>${row.quoteNo || '-'}</span><span>${row.purchaseName || row.standardName || row.productDetail || '-'}</span><span>${row.vendor || row.manufacturer || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.itemCount || row.detailLines?.length || 1}줄</span><span>${row.inspectionPlanLabel || row.inspectionDueMonth || row.revenueBasis || '-'}</span><span><b>${fmt(row.amount)}원</b></span><span>${row.status || '계획'}</span><span>${materialSelectedPlanIdFinal === row.id ? '선택됨' : ''}</span><span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span></div>`).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>

    ${selectedPlan ? `
      <div class="labor-card material-detail-card">
        <div class="labor-flow-title">
          <strong>상품계획 상세 내역</strong>
          <span class="os-kind-caption">${selectedPlan.poNo || selectedPlan.quoteNo || '-'} · ${selectedPlan.purchaseName || selectedPlan.standardName || ''}</span>
        </div>
        ${renderMaterialQuoteDetailFinal(selectedPlan.detailLines || [])}
        ${detailInspection.length ? `
          <div class="material-inspection-mini">
            <div class="labor-section-title">검수 계획</div>
            <div class="material-inspection-mini-grid">
              <span>항번</span><span>품목</span><span>수량순번</span><span>검수 예정월</span><span>검수금액</span>
              ${detailInspection.map(row => `<span>${row.itemNo}</span><span>${row.standardName || row.itemCode || '-'}</span><span>${row.sequence}</span><span>${row.month}</span><strong>${fmt(row.amount)}원</strong>`).join('')}
            </div>
          </div>` : ''}
      </div>` : '<div class="labor-empty material-form-empty">상품계획 라인을 클릭하면 항번별 상세 내역을 표시합니다.</div>'}

    ${editorOpen ? `
      <div class="material-entry-section">
        ${materialItemEditorModeFinal === 'new' ? renderMaterialQuoteSelectorFinal(quoteYn) : ''}
        ${materialItemEditorModeFinal === 'edit' || materialDirectInputOpenFinal || selectedGroup ? renderMaterialItemForm(formSource, quoteYn, editing) : '<div class="labor-empty material-form-empty">등록할 견적 1건을 선택하면 입력 화면이 표시됩니다.</div>'}
      </div>` : ''}
    ${renderMaterialInspectionPlanPopupFinal()}
  `;
};
