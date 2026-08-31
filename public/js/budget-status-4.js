/* ============================================================
   [budget-status 분할본 4/5] — 로드 순서 필수(앞 파트 뒤에 로드)
   원본 budget-status.js를 병렬작업용으로 5분할. 전역 스코프 공유.
   주요 영역: 감가상각·재료계획 + renderBudgetAccountEditor + 인건비 상세 + 경비
   ============================================================ */
function editDepreciationPlan(id) {
  editingDepreciationPlanId = id;
  materialKind = 'depreciation';
  renderBudgetPage();
}

function saveDepreciationPlan() {
  const payload = {
    id: editingDepreciationPlanId || `dep-${Date.now()}`,
    asset: document.getElementById('dep-asset')?.value || '감가상각비 계획',
    start: document.getElementById('dep-start')?.value || '2026-07',
    end: document.getElementById('dep-end')?.value || '2027-11',
    monthly: parseBudgetAmount(document.getElementById('dep-monthly')?.value || 0),
    status: '계획',
    note: document.getElementById('dep-note')?.value || '',
  };
  if (!payload.monthly) {
    showToast('월상각액을 입력해 주세요.');
    return;
  }
  const idx = materialDepreciationPlans.findIndex(r => r.id === payload.id);
  if (idx >= 0) materialDepreciationPlans[idx] = payload;
  else materialDepreciationPlans.push(payload);
  editingDepreciationPlanId = null;
  showToast('감가상각비 계획이 저장되었습니다.');
  renderBudgetPage();
}

// [재료비 서브탭 분기 renderMaterialPlanPanel + 편집기 진입점은 budget-area-material.js로 이관되었습니다]

function renderBudgetAccountEditor(data, account) {
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  const subtitles = {
    [CATS[0]]:'인력 투입, MM, 승인요청 상태를 관리합니다.',
    [CATS[1]]:'실투입 외주비, 기타외주비, MA를 구분해 계획을 등록합니다.',
    [CATS[2]]:'상품재료비, 감가상각비, 기타재료비를 구분해 계획을 등록합니다.',
    [CATS[3]]:'계정별 월별 경비 계획을 입력하고 ERP 가용예산을 체크합니다.',
  };
  const body = account === CATS[0]
    ? renderLaborAssignmentPanel(data)
    : account === CATS[1]
      ? renderBpoOutsourcePanelFinal(data)
      : account === CATS[2]
        ? renderMaterialPlanPanel(data)
        : account === CATS[3]
          ? renderExpensePlanPanel(data)
          : renderSimpleAccountPlanEditor(data, account);

  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">${subtitles[account] || '미래 계획 금액을 수정합니다.'}</div>
        </div>
      </div>
      ${monthly}
      ${body}
    </div>`;
}

function isPastActualMonth(month) {
  return month < '2026-07';
}

function actualCellHtml(account, month, rowName, value) {
  if (isPastActualMonth(month)) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${account}','${month}','${rowName}')">${fmt(value)}</button>`;
  }
  if (account === CATS[0] && value > 0) {
    return `<button class="actual-month-link plan" onclick="showLaborPlanDetailModal('${month}','${rowName}')">${fmt(value)}</button>`;
  }
  return fmt(value);
}

function renderAccountMonthlyBudgetTable(data, account) {
  const rows = getMonthlyBudgetRows(data, account);
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  const totalRemain = Math.max(totalPlan - totalActual, 0);
  const monthTotals = data.months.map(mo => getMonthAccountValue(mo, account));
  const headMonths = data.months.map(mo => `<th>${mo.m}</th>`).join('');
  const bodyRows = rows.map(row => `
    <tr>
      <td class="acct-name">${row.name}</td>
      <td class="num">${fmt(row.plan)}</td>
      <td class="num">${fmt(row.actual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      ${row.months.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, row.name, v)}</td>`).join('')}
    </tr>`).join('');

  return `
    <div class="account-monthly-card">
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
            <tr>
              <th>구분</th><th>계획(전체)</th><th>실적(확정)</th><th>계획(미집행)</th>${headMonths}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            <tr class="total">
              <td>합계</td>
              <td class="num">${fmt(totalPlan)}</td>
              <td class="num">${fmt(totalActual)}</td>
              <td class="num">${fmt(totalRemain)}</td>
              ${monthTotals.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, '합계', v)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="account-monthly-note">※ 이전월 실적 금액은 파란색 링크로 표시되며, 클릭하면 전표/인력/계정 상세를 확인할 수 있습니다.</p>
    </div>`;
}

function getActualTabs(account) {
  if (account === CATS[0]) return ['사내인건비/사내간접비', '증업일급여-OT', '이관인건비'];
  if (account === CATS[1]) return ['실투입대상 외주비', '전문직수수료/제안/기타', '외주출장비', '공사MA', '이관외주비', '기타외주비'];
  if (account === CATS[2]) return ['상품재료비', '감가상각비', '기타재료비'];
  return ['경비 전체'];
}

function getActualDetailColumns(account) {
  if (account === CATS[0]) return ['NO', '실적발생월', '부서', '인건비전표번호', '간접비전표번호', '사번', '성명', '직위', '금액'];
  if (account === CATS[1]) return ['NO', '실적발생월', '전표번호', '성명', '기술등급', '회사', '소급여부', '실제 투입월', '금액'];
  if (account === CATS[2]) return ['NO', '실적발생월', '전표번호', '품목', '모델명', '수량', '상호', '금액'];
  return ['NO', '실적발생월', '계정', 'SAP전표번호', '요청자', '실적반영금액', '상호'];
}

function getActualDetailRows(account, month, detailName) {
  if (account === CATS[0]) {
    const people = [
      ['AI Architect팀','0300375522','0300375523','04490','손성호','Manager', 45800000],
      ['AI Architect팀','0300378442','0300378443','09744','전현영','Manager', 39200000],
      ['AI UX팀','0300378326','0300378327','09556','박혜리','Manager', 28400000],
      ['AX서비스1팀','0300376670','0300376671','06880','조인수','Manager', 33100000],
    ];
    return people.map((p, i) => [i + 1, month, ...p]);
  }
  if (account === CATS[1]) {
    const vouchers = [
      ['8800466220','TBD','고급상','펜타시스템테크놀러지(주)','정상','2026-06', 82000000],
      ['8800466223','TBD','특급','(주)인젠트','정상','2026-06', 64000000],
      ['8800466222','TBD','고급상','(주)디리아','정상','2026-06', 41000000],
      ['8800466219','TBD','고급상','(주)인픽스','정상','2026-06', 24968792],
    ];
    return vouchers.map((v, i) => [i + 1, month, ...v]);
  }
  if (account === CATS[2]) {
    const items = [
      ['7806057711','개발서버 장비','SRV-AX-01', 1, '한국델테크놀로지스', 3200000],
      ['7806057712','테스트 자동화 라이선스','QA-AUTO', 10, '에이아이솔루션', 1800000],
      ['7806057713','검수용 소프트웨어','SW-TEMP', 3, '오픈소프트', 1500000],
    ];
    return items.map((v, i) => [i + 1, month, ...v]);
  }
  const expenses = [
    ['석식대','7806056116','홍길표', 36091, '홍길표'],
    ['시내교통비','7806057671','문태기', 10100, '티머니택시'],
    ['의욕관리비','7806057670','문태기', 80913, '그랩오피스'],
    ['전산소모품비','7806058794','서주영', 22910, '서주영'],
  ];
  return expenses.map((v, i) => [i + 1, month, ...v]);
}

function showActualDetailModal(account, month, detailName) {
  let modal = document.getElementById('actual-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'actual-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  const columns = getActualDetailColumns(account);
  const rows = getActualDetailRows(account, month, detailName);
  const tabs = getActualTabs(account);
  const total = rows.reduce((sum, row) => sum + Number(row[row.length - 1] || 0), 0);
  modal.innerHTML = `
    <div class="actual-detail-modal">
      <div class="actual-detail-head">
        <strong>${account} 실적조회</strong>
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-filter">
        <label><span>${account === CATS[3] ? '경비계정' : '실적발생월'}</span><input value="${account === CATS[3] ? '- 전체 -' : month}" readonly></label>
        <label><span>조회기간</span><input value="${month}" readonly></label>
        <button class="labor-sub-btn">초기화</button>
        <button class="labor-main-btn teal">검색</button>
      </div>
      <div class="actual-detail-tabs">
        ${tabs.map((tab, idx) => `<button class="${idx === 0 || tab === detailName ? 'active' : ''}">${tab}</button>`).join('')}
      </div>
      <div class="actual-detail-toolbar"><button class="labor-sub-btn">엑셀</button></div>
      <div class="actual-detail-table-wrap">
        <table class="actual-detail-table">
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === row.length - 1 ? 'num' : ''}">${idx === row.length - 1 ? fmt(cell) : cell}</td>`).join('')}</tr>`).join('')}
            <tr class="total"><td colspan="${columns.length - 1}">합계</td><td class="num">${fmt(total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot">
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function switchMaterialQuoteSelectedYn(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpen = false;
  materialQuoteSelectedYn = 'Y';
  if (!selectedMaterialQuoteLineId) selectedMaterialQuoteLineId = materialQuoteLineRows[0]?.lineId || '';
  renderBudgetPage();
}

function applyMaterialPurchaseQuote(quoteNo) {
  const line = materialQuoteLineRows.find(row => row.quoteNo === quoteNo) || materialQuoteLineRows[0];
  if (line) selectMaterialQuoteLine(line.lineId);
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  materialDirectInputOpen = row.quoteSelectedYn === 'N';
  selectedMaterialQuoteLineId = row.quoteLineId || '';
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  materialDirectInputOpen = false;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }

  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpen ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;

  if (quoteYn === 'Y' && !document.getElementById('material-quote-line-id')?.value) {
    showToast('구매시스템에서 수신된 견적 라인을 먼저 선택해 주세요.');
    return;
  }
  if (!amount) {
    showToast('견적/예산 금액을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'Y' && !inspectionDueMonth) {
    showToast('검수예정일을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'N' && (!startMonth || !endMonth || startMonth > endMonth)) {
    showToast('직접입력은 예산 시작월과 종료월을 올바르게 입력해 주세요.');
    return;
  }

  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn: quoteYn,
    quoteLineId: document.getElementById('material-quote-line-id')?.value || '',
    itemNo: document.getElementById('material-item-no')?.value || '',
    itemCode: document.getElementById('material-item-code')?.value || '',
    categoryName: document.getElementById('material-category-name')?.value || '',
    standardName: document.getElementById('material-standard-name')?.value || '',
    manufacturer: document.getElementById('material-manufacturer')?.value || '',
    large: document.getElementById('material-category-name')?.value || '',
    middle: '',
    small: document.getElementById('material-standard-name')?.value || '',
    model: document.getElementById('material-model')?.value || '',
    productDetail: document.getElementById('material-standard-name')?.value || '',
    quantity: parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
    unit: document.getElementById('material-unit')?.value || 'EA',
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    quoteNo: document.getElementById('material-quote-no')?.value || '',
    poNo: document.getElementById('material-po-no')?.value || '',
    amount,
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
    status: '계획',
  };

  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) {
    showToast('품목코드, 분류명, 표준품명, 제조사, 모델명을 입력해 주세요.');
    return;
  }

  if (editing) {
    Object.assign(editing, item);
    showToast('상품재료비 계획을 수정했습니다.');
  } else {
    rows.unshift(item);
    showToast('상품재료비 계획을 등록했습니다.');
  }
  editingMaterialItemId = null;
  selectedMaterialQuoteLineId = '';
  materialDirectInputOpen = false;
  renderBudgetPage();
}

function renderMaterialAllocationPreview(source = {}) {
  const startMonth = source.startMonth || '';
  const endMonth = source.endMonth || '';
  const amount = Number(source.amount || 0);
  const allocations = source.allocations || buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    return '<div class="material-allocation-preview empty" id="material-allocation-preview">예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.</div>';
  }
  return `
    <div class="material-allocation-preview" id="material-allocation-preview">
      <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
      ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}
    </div>`;
}

function refreshMaterialAllocationPreview() {
  const target = document.getElementById('material-allocation-preview');
  if (!target) return;
  const startMonth = document.getElementById('material-budget-start')?.value || '';
  const endMonth = document.getElementById('material-budget-end')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const allocations = buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    target.className = 'material-allocation-preview empty';
    target.innerHTML = '예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.';
    return;
  }
  target.className = 'material-allocation-preview';
  target.innerHTML = `
    <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
    ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}`;
}

function renderMaterialItemForm(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const inspectionDueMonth = source.inspectionDueMonth || source.revenueBasis || source.deliveryEnd?.slice(0, 7) || '2026-08';
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
  const readonly = isQuote ? 'readonly' : '';
  return `
    <div class="labor-card material-entry-card">
      <div class="labor-flow-title">
        <strong>${editing ? '상품재료비 계획 수정' : '상품재료비 계획 등록'}</strong>
        ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
      </div>
      <input type="hidden" id="material-quote-line-id" value="${source.quoteLineId || selectedMaterialQuoteLineId || ''}">
      <div class="labor-form os-ma-form material-item-form">
        <label><span>견적선정유무</span><input value="${quoteYn}" readonly></label>
        <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" readonly></label>
        <label><span>항번</span><input id="material-item-no" value="${source.itemNo || ''}" ${readonly}></label>
        <label><span>품목코드 *</span><input id="material-item-code" value="${source.itemCode || ''}" ${readonly}></label>
        <label><span>분류명 *</span><input id="material-category-name" value="${source.categoryName || ''}" ${readonly}></label>
        <label><span>표준품명 *</span><input id="material-standard-name" value="${source.standardName || source.productDetail || ''}" ${readonly}></label>
        <label><span>제조사 *</span><input id="material-manufacturer" value="${source.manufacturer || ''}" ${readonly}></label>
        <label><span>모델명 *</span><input id="material-model" value="${source.model || ''}" ${readonly}></label>
        <label><span>수량</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${source.unit || 'EA'}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label><span>검수예정일 *</span><input id="material-inspection-due" type="month" value="${inspectionDueMonth}"></label>
          <input type="hidden" id="material-budget-start" value="${inspectionDueMonth}">
          <input type="hidden" id="material-budget-end" value="${inspectionDueMonth}">
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" readonly></label>
        ` : `
          <label><span>예산 시작월 *</span><input id="material-budget-start" type="month" value="${startMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산 종료월 *</span><input id="material-budget-end" type="month" value="${endMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산금액 *</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" oninput="refreshMaterialAllocationPreview()"></label>
          <input type="hidden" id="material-inspection-due" value="${endMonth}">
        `}
      </div>
      ${isQuote ? `
        <div class="bpo-rule-note">
          <strong>견적 사용 등록</strong>
          <span>구매시스템에서 받은 물품정보는 수정하지 않고, 실행예산에서는 검수예정일만 조정합니다.</span>
        </div>` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>`;
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedLine = selectedMaterialQuoteLineId ? getMaterialQuoteLine(selectedMaterialQuoteLineId) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpen ? 'N' : 'Y');
  const source = editing || (quoteYn === 'Y' && selectedLine ? {
    ...selectedLine,
    quoteLineId:selectedLine.lineId,
    model:selectedLine.model,
    deliveryStart:monthStartDate(selectedLine.inspectionDueMonth),
    deliveryEnd:monthEndDate(selectedLine.inspectionDueMonth),
    revenueBasis:selectedLine.inspectionDueMonth,
  } : {
    quoteSelectedYn:'N',
    itemNo:'',
    itemCode:'',
    categoryName:'',
    standardName:'',
    manufacturer:'',
    model:'',
    quantity:1,
    unit:'EA',
    deliveryStart:'2026-08-01',
    deliveryEnd:'2026-12-31',
    quoteNo:'',
    poNo:'',
    amount:0,
  });
  const shouldShowForm = !!editing || materialDirectInputOpen || !!selectedLine;

  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 계획</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매시스템에서 수신된 견적 라인 단위로 등록합니다. 견적 없이 등록하는 경우에는 예산 기간과 금액을 입력해 월별 계획을 배분합니다.</p>
    </div>

    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div>
          <div class="labor-card-title">1. 견적선정유무 선택</div>
          <p>Y는 구매시스템 견적 라인을 선택해서 등록하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p>
        </div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `
        <div class="material-quote-line-table">
          <div class="material-quote-line-head">
            <span>견적번호</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>금액</span>
          </div>
          ${materialQuoteLineRows.map(line => `
            <button class="material-quote-line ${selectedMaterialQuoteLineId === line.lineId ? 'active' : ''}" onclick="selectMaterialQuoteLine('${line.lineId}')">
              <span>${line.quoteNo}</span><span>${line.itemNo}</span><span>${line.itemCode}</span><span>${line.categoryName}</span><span>${line.standardName}</span><span>${line.manufacturer}</span><span>${line.model}</span><strong>${fmt(line.amount)}원</strong>
            </button>
          `).join('')}
        </div>` : `
        <div class="bpo-rule-note">
          <strong>직접입력 등록</strong>
          <span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span>
        </div>`}
    </div>

    ${shouldShowForm ? renderMaterialItemForm(source, quoteYn, editing) : '<div class="labor-empty material-form-empty">견적 라인을 선택하면 상품재료비 등록 영역이 열립니다.</div>'}

    <div class="os-ma-table-wrap">
      <div class="os-ma-table material-item-plan-table">
        <div class="os-ma-head with-action material-item-head">
          <span>구분</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>검수예정일</span><span>PO번호</span><span>금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}" onclick="editMaterialItem('${row.id}')">
            <span>${row.quoteSelectedYn === 'N' ? '직접' : '견적'}</span><span>${row.itemNo || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.categoryName || row.large || '-'}</span><span>${row.standardName || row.productDetail || '-'}</span><span>${row.manufacturer || '-'}</span><span>${row.model || '-'}</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span>${row.poNo || '-'}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function selectLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = id;
  laborRegistrationMode = 'edit';
  renderBudgetPage();
}

function editLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = id;
  laborRegistrationMode = 'edit';
  renderBudgetPage();
}

function cancelLaborEdit() {
  editingLaborAssignmentId = null;
  laborRegistrationMode = null;
  renderBudgetPage();
}
selectMaterialQuoteLine = function(quoteNo) {
  const group = getMaterialQuoteGroupFinal(quoteNo);
  if (!group) return;
  materialSelectedQuoteNoFinal = group.quoteNo;
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = group.quoteNo;
  materialQuoteAmount = materialQuoteAmountFinal(group);
  materialQuoteTitle = group.purchaseName;
  editingMaterialItemId = null;
  renderBudgetPage();
};

startMaterialDirectInput = function() {
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = true;
  materialQuoteSelectedYn = 'N';
  materialQuoteNo = '';
  materialQuoteAmount = 0;
  materialQuoteTitle = '';
  editingMaterialItemId = null;
  renderBudgetPage();
};

switchMaterialQuoteSelectedYn = function(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  if (!materialSelectedQuoteNoFinal) materialSelectedQuoteNoFinal = materialPurchaseQuoteGroupsFinal[0]?.quoteNo || '';
  renderBudgetPage();
};

editMaterialItem = function(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  materialDirectInputOpenFinal = row.quoteSelectedYn === 'N';
  materialSelectedQuoteNoFinal = row.quoteNo || '';
  renderBudgetPage();
};

cancelMaterialItemEdit = function() {
  editingMaterialItemId = null;
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
};

saveMaterialItem = function() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpenFinal ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;
  const group = quoteYn === 'Y' ? getMaterialQuoteGroupFinal(document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || [];
  const main = lines[0] || {};
  if (quoteYn === 'Y' && !group) return showToast('구매시스템에서 수신된 견적 1건을 먼저 선택해 주세요.');
  if (!amount) return showToast('견적/예산 금액을 입력해 주세요.');
  if (quoteYn === 'Y' && !inspectionDueMonth) return showToast('검수예정일을 입력해 주세요.');
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
  const item = {
    id: editing?.id || `mi-${Date.now()}`,
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
    model: quoteYn === 'Y' ? `${lines.length}개 품목` : directLine.model,
    productDetail: group?.purchaseName || directLine.standardName,
    quantity: quoteYn === 'Y' ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : directLine.quantity,
    unit: quoteYn === 'Y' ? 'SET' : directLine.unit,
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    amount,
    itemCount: quoteYn === 'Y' ? lines.length : 1,
    detailLines: quoteYn === 'Y' ? lines : [directLine],
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
    status:'계획',
  };
  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) return showToast('품목 정보를 입력해 주세요.');
  if (editing) Object.assign(editing, item);
  else rows.unshift(item);
  showToast(editing ? '상품재료비 계획을 수정했습니다.' : '상품재료비 계획을 등록했습니다.');
  editingMaterialItemId = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
};

renderMaterialItemForm = function(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const group = isQuote ? getMaterialQuoteGroupFinal(source.quoteNo || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || source.detailLines || [];
  const main = lines[0] || source;
  const inspectionDueMonth = source.inspectionDueMonth || source.revenueBasis || group?.inspectionDueMonth || source.deliveryEnd?.slice(0, 7) || '2026-08';
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
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
        <label><span>품목 수</span><input id="material-model" value="${isQuote ? `${lines.length}개 품목` : (source.model || '')}" ${readonly}></label>
        <label><span>수량 합계</span><input id="material-qty" inputmode="numeric" value="${isQuote ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : (source.quantity || 1)}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${isQuote ? 'SET' : (source.unit || 'EA')}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || group?.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label><span>검수예정일 *</span><input id="material-inspection-due" type="month" value="${inspectionDueMonth}"></label>
          <input type="hidden" id="material-budget-start" value="${inspectionDueMonth}">
          <input type="hidden" id="material-budget-end" value="${inspectionDueMonth}">
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
      ${isQuote ? `<div class="bpo-rule-note"><strong>견적 1건 기준 등록</strong><span>1개의 견적/구매건 아래 여러 항번이 존재합니다. 실행예산에는 구매건 1건으로 등록하고 상세 물품 라인은 아래에서 확인합니다.</span></div>${renderMaterialQuoteDetailFinal(lines)}` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions"><button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button></div>
    </div>`;
};

renderMaterialItemPanel = function() {
  ensureMaterialItemMockRowsFinal();
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedGroup = materialSelectedQuoteNoFinal ? getMaterialQuoteGroupFinal(materialSelectedQuoteNoFinal) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpenFinal ? 'N' : 'Y');
  const source = editing || (quoteYn === 'Y' && selectedGroup ? {
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
  const shouldShowForm = !!editing || materialDirectInputOpenFinal || !!selectedGroup;
  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 구매건</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매건/PO 단위로 등록하고, 1개의 견적 안에 여러 항번의 물품 상세가 포함됩니다.</p>
    </div>
    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div><div class="labor-card-title">1. 견적선정유무 선택</div><p>Y는 구매시스템 견적 1건을 선택하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p></div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `<div class="material-quote-line-table quote-group">
        <div class="material-quote-group-head"><span>견적번호</span><span>구매건명</span><span>업체</span><span>항번 수</span><span>PO번호</span><span>수신일시</span><span>총 금액</span></div>
        ${materialPurchaseQuoteGroupsFinal.map(group => `<button class="material-quote-group ${materialSelectedQuoteNoFinal === group.quoteNo ? 'active' : ''}" onclick="selectMaterialQuoteLine('${group.quoteNo}')"><span>${group.quoteNo}</span><span>${group.purchaseName}</span><span>${group.vendor}</span><span>${group.lines.length}줄</span><span>${group.poNo || '-'}</span><span>${group.receivedAt}</span><strong>${fmt(materialQuoteAmountFinal(group))}원</strong></button>`).join('')}
      </div>` : `<div class="bpo-rule-note"><strong>직접입력 등록</strong><span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span></div>`}
    </div>
    ${shouldShowForm ? renderMaterialItemForm(source, quoteYn, editing) : '<div class="labor-empty material-form-empty">견적 1건을 선택하면 상품재료비 등록 영역과 상세 항번이 열립니다.</div>'}
    <div class="os-ma-table-wrap"><div class="os-ma-table material-item-plan-table">
      <div class="os-ma-head with-action material-item-head"><span>구분</span><span>견적번호</span><span>구매건명</span><span>업체</span><span>대표 품목</span><span>항번 수</span><span>검수예정일</span><span>PO번호</span><span>금액</span><span>상태</span><span></span></div>
      ${rows.map(row => `<div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}" onclick="editMaterialItem('${row.id}')"><span>${row.quoteSelectedYn === 'N' ? '직접' : '견적'}</span><span>${row.quoteNo || '-'}</span><span>${row.purchaseName || row.standardName || row.productDetail || '-'}</span><span>${row.vendor || row.manufacturer || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.itemCount || row.detailLines?.length || 1}줄</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span>${row.poNo || '-'}</span><span><b>${fmt(row.amount)}원</b></span><span>${row.status || '계획'}</span><span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span></div>`).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
    </div></div>`;
};

var materialSelectedPlanIdFinal = '';
var materialItemEditorModeFinal = null;

function selectMaterialPlanFinal(id) {
  materialSelectedPlanIdFinal = id;
  materialItemEditorModeFinal = null;
  editingMaterialItemId = null;
  renderBudgetPage();
}

function openMaterialItemNewFinal() {
  materialItemEditorModeFinal = 'new';
  editingMaterialItemId = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  renderBudgetPage();
}

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
  renderBudgetPage();
};

switchMaterialQuoteSelectedYn = function(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpenFinal = false;
  materialItemEditorModeFinal = materialItemEditorModeFinal || 'new';
  materialQuoteSelectedYn = 'Y';
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
  renderBudgetPage();
};

cancelMaterialItemEdit = function() {
  editingMaterialItemId = null;
  materialItemEditorModeFinal = null;
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
};

saveMaterialItem = function() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpenFinal ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;
  const group = quoteYn === 'Y' ? getMaterialQuoteGroupFinal(document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || [];
  const main = lines[0] || {};
  if (quoteYn === 'Y' && !group) return showToast('등록할 구매 견적 1건을 먼저 선택해 주세요.');
  if (!amount) return showToast('견적/예산 금액을 입력해 주세요.');
  if (quoteYn === 'Y' && !inspectionDueMonth) return showToast('검수예정일을 입력해 주세요.');
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
    model: quoteYn === 'Y' ? `${lines.length}개 품목` : directLine.model,
    productDetail: group?.purchaseName || directLine.standardName,
    quantity: quoteYn === 'Y' ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : directLine.quantity,
    unit: quoteYn === 'Y' ? 'SET' : directLine.unit,
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    amount,
    itemCount: quoteYn === 'Y' ? lines.length : 1,
    detailLines: quoteYn === 'Y' ? lines : [directLine],
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
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
  showToast(editing ? '상품재료비 계획을 수정했습니다.' : '상품재료비 계획을 등록했습니다.');
  renderBudgetPage();
};

function renderMaterialQuoteSelectorFinal(quoteYn) {
  return `
    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div>
          <div class="labor-card-title">1. 견적선정유무 선택</div>
          <p>Y는 구매시스템 견적 1건을 선택하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p>
        </div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `<div class="material-quote-line-table quote-group">
        <div class="material-quote-group-head"><span>견적번호</span><span>구매건명</span><span>업체</span><span>항번 수</span><span>PO번호</span><span>수신일시</span><span>총 금액</span></div>
        ${materialPurchaseQuoteGroupsFinal.map(group => `<button class="material-quote-group ${materialSelectedQuoteNoFinal === group.quoteNo ? 'active' : ''}" onclick="selectMaterialQuoteLine('${group.quoteNo}')"><span>${group.quoteNo}</span><span>${group.purchaseName}</span><span>${group.vendor}</span><span>${group.lines.length}줄</span><span>${group.poNo || '-'}</span><span>${group.receivedAt}</span><strong>${fmt(materialQuoteAmountFinal(group))}원</strong></button>`).join('')}
      </div>` : `<div class="bpo-rule-note"><strong>직접입력 등록</strong><span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span></div>`}
    </div>`;
}

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

  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 구매건</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매건/PO 기준으로 1줄씩 관리하고, 라인을 클릭하면 항번별 상세 물품을 확인합니다.</p>
    </div>

    <div class="os-registered-card material-plan-list-card">
      <div class="labor-flow-title">
        <strong>상품계획 목록</strong>
        <button class="labor-main-btn" onclick="openMaterialItemNewFinal()">신규 등록</button>
      </div>
      <div class="os-ma-table-wrap">
        <div class="os-ma-table material-item-plan-table">
          <div class="os-ma-head with-action material-item-head">
            <span>PO번호</span><span>견적번호</span><span>구매건명</span><span>업체</span><span>대표 품목</span><span>항번 수</span><span>검수예정일</span><span>금액</span><span>상태</span><span></span><span></span>
          </div>
          ${rows.map(row => `<div class="os-ma-row with-action material-item-row ${materialSelectedPlanIdFinal === row.id ? 'active' : ''}" onclick="selectMaterialPlanFinal('${row.id}')"><span>${row.poNo || '-'}</span><span>${row.quoteNo || '-'}</span><span>${row.purchaseName || row.standardName || row.productDetail || '-'}</span><span>${row.vendor || row.manufacturer || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.itemCount || row.detailLines?.length || 1}줄</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span><b>${fmt(row.amount)}원</b></span><span>${row.status || '계획'}</span><span>${materialSelectedPlanIdFinal === row.id ? '선택됨' : ''}</span><span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span></div>`).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
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
      </div>` : '<div class="labor-empty material-form-empty">상품계획 라인을 클릭하면 항번별 상세 내역이 표시됩니다.</div>'}

    ${editorOpen ? `
      <div class="material-entry-section">
        ${materialItemEditorModeFinal === 'new' ? renderMaterialQuoteSelectorFinal(quoteYn) : ''}
        ${materialItemEditorModeFinal === 'edit' || materialDirectInputOpenFinal || selectedGroup ? renderMaterialItemForm(formSource, quoteYn, editing) : '<div class="labor-empty material-form-empty">등록할 견적 1건을 선택하면 입력 화면이 표시됩니다.</div>'}
      </div>` : ''}
  `;
};

var laborScmLookupOpenFinal = false;
var selectedLaborScmCandidateIdFinal = 'scm-labor-01';

const laborScmConfirmedPoolFinal = [
  { id:'scm-labor-01', scmNo:'SCM-HR-202607-001', name:'박지훈', pLevel:'P4', role:'PM/분석설계', org:'NOVA PMO팀', startDate:'2026-07-01', endDate:'2026-12-31', totalMm:6.0, unitPrice:18000000 },
  { id:'scm-labor-02', scmNo:'SCM-HR-202607-002', name:'김서린', pLevel:'P3', role:'Vue Front', org:'AX 개발1팀', startDate:'2026-08-01', endDate:'2027-02-28', totalMm:3.5, unitPrice:14500000 },
  { id:'scm-labor-03', scmNo:'SCM-HR-202607-003', name:'정다은', pLevel:'P5', role:'Oracle DBA', org:'Data Platform팀', startDate:'2026-09-01', endDate:'2027-03-31', totalMm:2.8, unitPrice:21000000 },
  { id:'scm-labor-04', scmNo:'SCM-HR-202607-004', name:'최유진', pLevel:'P2', role:'QA/검증', org:'품질혁신팀', startDate:'2026-10-01', endDate:'2027-01-31', totalMm:2.0, unitPrice:12000000 },
  { id:'scm-labor-05', scmNo:'SCM-HR-202607-005', name:'한서우', pLevel:'P3', role:'Java Backend', org:'AX 개발2팀', startDate:'2026-08-15', endDate:'2027-05-31', totalMm:5.0, unitPrice:15000000 },
];

function buildScmLaborMonthlyMmFinal(startDate, endDate, totalMm) {
  const months = monthRangeByDate(startDate, endDate);
  if (!months.length) return {};
  const total = Number(totalMm || 0);
  const base = Math.floor((total / months.length) * 100) / 100;
  let used = 0;
  return months.reduce((acc, month, idx) => {
    const mm = idx === months.length - 1 ? Number((total - used).toFixed(2)) : base;
    used = Number((used + mm).toFixed(2));
    acc[month] = mm;
    return acc;
  }, {});
}

function openLaborScmCandidatePopupFinal() {
  laborScmLookupOpenFinal = true;
  laborScmLastSyncedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  renderBudgetPage();
}

function closeLaborScmCandidatePopupFinal() {
  laborScmLookupOpenFinal = false;
  renderBudgetPage();
}

function selectLaborScmCandidateFinal(id) {
  selectedLaborScmCandidateIdFinal = id;
  renderBudgetPage();
}

function registerSelectedScmLaborFinal() {
  const candidate = laborScmConfirmedPoolFinal.find(row => row.id === selectedLaborScmCandidateIdFinal);
  if (!candidate) {
    showToast('등록할 인력을 선택해주세요.');
    return;
  }
  const rows = getLaborRows();
  if (rows.some(row => row.scmNo === candidate.scmNo)) {
    showToast('이미 등록된 SCM 확정 인력입니다.');
    laborScmLookupOpenFinal = false;
    renderBudgetPage();
    return;
  }
  const monthly = buildScmLaborMonthlyMmFinal(candidate.startDate, candidate.endDate, candidate.totalMm);
  const amount = Math.round(Number(candidate.totalMm || 0) * Number(candidate.unitPrice || 0));
  const row = {
    id:`lb-scm-${Date.now()}`,
    personId:candidate.id,
    scmNo:candidate.scmNo,
    name:candidate.name,
    org:candidate.org,
    role:candidate.role,
    pLevel:candidate.pLevel,
    unitPrice:candidate.unitPrice,
    startDate:candidate.startDate,
    endDate:candidate.endDate,
    workType:'SCM 확정',
    totalMm:candidate.totalMm,
    amount,
    monthly,
    status:'SCM 확정완료',
    requestedAt:'SCM 확정 데이터 수신',
    approvedAt:laborScmLastSyncedAt || new Date().toLocaleString('ko-KR', { hour12:false }),
    scmDocNo:candidate.scmNo,
  };
  rows.unshift(row);
  selectedLaborAssignmentId = row.id;
  editingLaborAssignmentId = null;
  laborRegistrationMode = null;
  laborScmLookupOpenFinal = false;
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('SCM 확정완료 인력이 인건비 계획에 등록되었습니다.');
  renderBudgetPage();
}

laborStatusClass = function(status) {
  const text = String(status || '');
  if (text.includes('확정완료') || text.includes('승인완료') || text.includes('꾨즺')) return 'done';
  if (text.includes('대기') || text.includes('湲')) return 'wait';
  if (text.includes('저장') || text.includes('?μ')) return 'saved';
  return 'draft';
};

getLaborStatusLabel = function(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 확정완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return '저장완료';
  return status || '등록';
};

syncLaborAssignmentsToBudget = function(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const laborCat = CATS && CATS[0] ? CATS[0] : BUDGET_ACCT_LABELS[0];
  const approved = getLaborRows(proj).filter(row => laborStatusClass(row.status) === 'done');
  data.months.filter(month => month.type === 'plan' && month[laborCat]).forEach(month => {
    const baseDetails = (month[laborCat].details || []).filter(detail => detail.source !== 'laborAssignment');
    let amount = 0;
    const nextDetails = [];
    approved.forEach(row => {
      const mm = row.monthly && row.monthly[month.m] ? Number(row.monthly[month.m]) : 0;
      if (!mm) return;
      const rowAmount = Math.round(mm * Number(row.unitPrice || 0));
      amount += rowAmount;
      nextDetails.push({
        type:'투입확정',
        name:row.name,
        org:row.org,
        role:row.role,
        mm,
        unitPrice:row.unitPrice,
        amount:rowAmount,
        source:'laborAssignment',
      });
    });
    month[laborCat].q = amount;
    month[laborCat].details = [...baseDetails, ...nextDetails];
  });
};

function selectLaborAssignmentSimpleFinal(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = null;
  laborRegistrationMode = null;
  renderBudgetPage();
}

function renderLaborScmPopupFinal() {
  if (!laborScmLookupOpenFinal) return '';
  const registeredScmNos = new Set(getLaborRows().map(row => row.scmNo).filter(Boolean));
  return `
    <div class="os-popup-backdrop" onclick="if(event.target===this)closeLaborScmCandidatePopupFinal()">
      <div class="os-popup labor-scm-popup">
        <div class="os-popup-head">
          <strong>투입가능 인력 리스트</strong>
          <button onclick="closeLaborScmCandidatePopupFinal()">×</button>
        </div>
        <div class="labor-sync-note">SCM에서 확정완료된 인력만 조회됩니다. 선택 후 등록하면 인건비 계획에 바로 반영됩니다.</div>
        <div class="labor-scm-table">
          <div class="labor-scm-head">
            <span>선택</span><span>이름</span><span>P레벨</span><span>역할</span><span>투입기간</span><span>총MM</span><span>상태</span>
          </div>
          ${laborScmConfirmedPoolFinal.map(row => {
            const selected = selectedLaborScmCandidateIdFinal === row.id;
            const registered = registeredScmNos.has(row.scmNo);
            return `
              <button class="labor-scm-row ${selected ? 'active' : ''}" onclick="selectLaborScmCandidateFinal('${row.id}')" ${registered ? 'disabled' : ''}>
                <span><input type="radio" ${selected ? 'checked' : ''} ${registered ? 'disabled' : ''}></span>
                <strong>${row.name}</strong>
                <span>${row.pLevel}</span>
                <span>${row.role}</span>
                <span>${row.startDate} ~ ${row.endDate}</span>
                <b>${row.totalMm}MM</b>
                <i>${registered ? '등록완료' : '확정완료'}</i>
              </button>`;
          }).join('')}
        </div>
        <div class="labor-actions right">
          <button class="labor-sub-btn" onclick="closeLaborScmCandidatePopupFinal()">닫기</button>
          <button class="labor-main-btn" onclick="registerSelectedScmLaborFinal()">등록</button>
        </div>
      </div>
    </div>`;
}

renderLaborAssignmentPanel = function(data) {
  const rows = getLaborRows();
  if (!selectedLaborAssignmentId && rows.length) selectedLaborAssignmentId = rows[0].id;
  const selected = rows.find(row => row.id === selectedLaborAssignmentId) || rows[0] || null;
  const totalMm = rows.reduce((sum, row) => sum + Number(row.totalMm || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const registeredRows = rows.map(row => {
    const active = selected && selected.id === row.id;
    return `
      <div class="labor-reg-row scm-simple ${active ? 'active' : ''}" onclick="selectLaborAssignmentSimpleFinal('${row.id}')">
        <div class="labor-reg-person">
          <strong>${row.name}</strong>
          <span>${row.org || '-'}</span>
        </div>
        <div>${row.role || '-'}</div>
        <div>${row.pLevel || '-'}</div>
        <div>${row.startDate || '-'} ~ ${row.endDate || '-'}</div>
        <div class="labor-reg-num">${row.totalMm || 0}MM</div>
        <div class="labor-reg-num">${fmt(row.amount || 0)}원</div>
        <div><i class="labor-status ${laborStatusClass(row.status)}">${getLaborStatusLabel(row.status)}</i></div>
        <div>${row.scmDocNo || row.scmNo || '-'}</div>
      </div>`;
  }).join('');
  const selectedMonths = selected ? Object.entries(selected.monthly || {}).map(([month, mm]) => `
    <span><b>${month}</b><em>${mm}MM</em><strong>${fmt(Math.round(Number(mm || 0) * Number(selected.unitPrice || 0)))}원</strong></span>
  `).join('') : '';

  return `
    <div class="labor-panel labor-scm-simple-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">SCM 확정 인력 등록</div>
          <p class="labor-simple-caption">SCM에서 확정완료된 인력을 그대로 선택해 등록합니다. 시작일, 종료일, P레벨, 역할, 총MM은 SCM 수신값을 기준으로 반영됩니다.</p>
        </div>
        <div class="labor-actions compact">
          <button class="labor-main-btn" onclick="openLaborScmCandidatePopupFinal()">신규인력투입</button>
        </div>
      </div>

      <div class="os-sub-summary labor-scm-summary">
        <div><strong>${rows.length}</strong><span>등록 인력</span></div>
        <div><strong>${Number(totalMm.toFixed(2))}MM</strong><span>총 MM</span></div>
        <div><strong>${fmt(totalAmount)}원</strong><span>SCM 확정 금액</span></div>
        <p>인건비 신규 등록은 SCM 확정완료 인력만 가능합니다. 목록에서 인력을 선택하고 등록하면 월별 MM과 금액이 자동 배분됩니다.</p>
      </div>

      <div class="labor-registered-card top">
        <div class="labor-reg-header scm-simple">
          <span>인력</span><span>역할</span><span>P레벨</span><span>투입기간</span><span>총MM</span><span>금액</span><span>상태</span><span>SCM문서</span>
        </div>
        <div class="labor-reg-list">${registeredRows || '<div class="labor-empty">등록된 SCM 확정 인력이 없습니다. 투입가능 인력 리스트에서 등록해주세요.</div>'}</div>
      </div>

      ${selected ? `
        <div class="labor-card labor-scm-detail-card">
          <div class="labor-flow-title">
            <strong>${selected.name} 월별 반영 내역</strong>
            <span class="os-kind-caption">${selected.role || '-'} · ${selected.pLevel || '-'} · ${selected.startDate || '-'} ~ ${selected.endDate || '-'}</span>
          </div>
          <div class="labor-scm-month-grid">${selectedMonths}</div>
        </div>` : ''}
      ${renderLaborScmPopupFinal()}
    </div>`;
};

// [경비 계정 편집기 데코레이터는 budget-area-expense.js로 이관되었습니다]

function getMaterialTransferAmountForMonthFinal(month) {
  return getOtherMaterialRows().reduce((sum, row) => row.expectedMonth === month ? sum + Number(row.amount || 0) : sum, 0);
}

function getMaterialTransferPlanTotalFinal() {
  return getOtherMaterialRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function getMaterialTransferActualTotalFinal() {
  return getOtherMaterialRows().reduce((sum, row) => row.actualized ? sum + Number(row.amount || 0) : sum, 0);
}

getAccountDetailRows = function(account) {
  if (account === CATS[0]) return [
    { name:'실투입인건비', ratio:.72 },
    { name:'이관인건비', ratio:.18 },
    { name:'종업원급여-OT', ratio:.10 },
  ];
  if (account === CATS[1]) return [
    { name:'실투입대상 외주비', ratio:.45 },
    { name:'전문직수수료/제안/기타', ratio:.12 },
    { name:'외주출장비', ratio:.05 },
    { name:'공사MA', ratio:.25 },
    { name:'이관외주비', ratio:.05 },
    { name:'기타외주비', ratio:.08 },
  ];
  if (account === CATS[2]) return [
    { name:'상품재료비', ratio:null },
    { name:'감가상각비', ratio:null },
    { name:'이관재료비', ratio:null },
  ];
  return [
    { name:'통제 경비', ratio:.64 },
    { name:'비통제 경비', ratio:.24 },
    { name:'A/S Cost', ratio:.12 },
  ];
};

getMonthlyBudgetRows = function(data, account) {
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  if (account !== CATS[2]) {
    return getAccountDetailRows(account).map(detail => {
      const months = data.months.map(mo => Math.round(getMonthAccountValue(mo, account) * detail.ratio));
      const plan = Math.round(totalPlan * detail.ratio);
      const actual = Math.round(totalActual * detail.ratio);
      return { name:detail.name, plan, actual, remain:Math.max(plan - actual, 0), months };
    });
  }

  const materialRows = getAccountDetailRows(account).map(detail => {
    const months = data.months.map(mo => {
      const base = getMonthAccountValue(mo, account);
      const depreciation = getDepreciationAmountForMonth(mo.m);
      const transfer = getMaterialTransferAmountForMonthFinal(mo.m);
      if (detail.name === '감가상각비') return depreciation;
      if (detail.name === '이관재료비') return transfer;
      return Math.max(base - depreciation - transfer, 0);
    });
    const plan = months.reduce((sum, value) => sum + value, 0);
    const actual = detail.name === '이관재료비'
      ? getMaterialTransferActualTotalFinal()
      : detail.name === '감가상각비'
        ? 0
        : Math.max(totalActual - getMaterialTransferActualTotalFinal(), 0);
    return { name:detail.name, plan, actual, remain:Math.max(plan - actual, 0), months };
  });
  return materialRows;
};

renderMaterialKindTabs = function() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적등록/납기', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'감가상각비', desc:'자산/라이선스 월상각', active:materialKind === 'depreciation', action:"switchMaterialKind('depreciation')" },
    { step:'03', label:'이관재료비', desc:'이관월/금액/사유', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ], 'material');
};

renderMaterialPlanPanel = function(data) {
  if (materialKind === 'depreciation') {
    return renderMaterialShell('감가상각비 계획 등록', '자산/라이선스 기준으로 월상각액을 입력하고 재료비 월별 예산에 반영합니다.', renderMaterialDepreciationPanel());
  }
  if (materialKind === 'other') {
    return renderMaterialShell('이관재료비 계획 등록', '타 프로젝트 또는 시스템에서 이관되는 재료비 계획을 관리합니다. 실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
};

getActualTabs = function(account) {
  if (account === CATS[0]) return ['사내인건비/사내간접비', '종업원급여-OT', '이관인건비'];
  if (account === CATS[1]) return ['실투입대상 외주비', '전문직수수료/제안/기타', '외주출장비', '공사MA', '이관외주비', '기타외주비'];
  if (account === CATS[2]) return ['상품재료비', '감가상각비', '이관재료비'];
  return ['경비 전체'];
};

renderOtherMaterialPanel = function() {
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0))}원</strong><span>이관재료비 계획</span></div>
      <p>타 프로젝트 또는 시스템에서 재료비가 이관되는 계획입니다. 실적이 발생한 건은 수정할 수 없고, 미실적 계획만 조정합니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '이관재료비 계획 수정' : '이관재료비 계획 입력'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelOtherMaterialEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-other-form">
          <label><span>이관 예정월</span><input id="other-material-month" type="month" value="${editing ? editing.expectedMonth : '2026-10'}"></label>
          <label><span>금액</span><input id="other-material-amount" inputmode="numeric" value="${editing ? editing.amount : ''}" placeholder="예: 6500000"></label>
          <label class="wide"><span>이관 사유</span><textarea id="other-material-desc" rows="4" placeholder="예: 타 프로젝트 잔여 재료비 이관, 임시 라이선스 비용 이관">${editing ? editing.description : ''}</textarea></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherMaterialExpense()">${editing ? '수정 저장' : '이관재료비 저장'}</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header with-action"><span>이관 예정월</span><span>금액</span><span>이관 사유</span><span>상태</span><span></span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row with-action ${editingOtherMaterialId === row.id ? 'active' : ''}">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status ${row.actualized ? 'done' : 'saved'}">${row.status}</i>
              <div class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editOtherMaterialExpense('${row.id}')">수정</button>`}</div>
            </div>
          `).join('') || '<div class="labor-empty">등록된 이관재료비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
};

// [A/S비(A/S Cost) 데이터·패널 로직은 budget-area-as.js로 이관되었습니다]

var renderBudgetSetupOverviewBeforeAsCost = renderBudgetSetupOverview;
var selectedExecBudgetVersionFinal = 'v3';
var execBudgetApprovalStateFinal = {
  v3: { status:'작성중', approvalStatus:'미요청', requestedAt:'', approver:'김도윤 팀장', comment:'' },
  v2: { status:'승인요청', approvalStatus:'결재중', requestedAt:'2026-07-24 14:20:00', approver:'김도윤 팀장', comment:'외주비 검수계획 보정 승인 요청' },
  v1: { status:'승인완료', approvalStatus:'완료', requestedAt:'2026-07-21 10:10:00', approver:'김도윤 팀장', comment:'최초 실행예산 승인' },
};

function getExecBudgetVersionSnapshotsFinal(data) {
  ensureAsCostPlanAmount(data);
  return [
    {
      key:'v3',
      label:'V3',
      date:'2026-07-28',
      status:execBudgetApprovalStateFinal.v3.status,
      owner:'이봄',
      memo:'인건비 SCM 확정 인력과 A/S비가 반영된 최신 수립안',
      budgets:{
        [CATS[0]]:770000000,
        [CATS[1]]:1195000000,
        [CATS[2]]:155000000,
        [CATS[3]]:92000000,
        [CATS[4]]:48918351,
      },
    },
    {
      key:'v2',
      label:'V2',
      date:'2026-07-24',
      status:execBudgetApprovalStateFinal.v2.status,
      owner:'이봄',
      memo:'외주비 검수계획과 재료비 상품계획 일부 보정',
      budgets:{
        [CATS[0]]:755000000,
        [CATS[1]]:1175000000,
        [CATS[2]]:145000000,
        [CATS[3]]:88000000,
        [CATS[4]]:48918351,
      },
    },
    {
      key:'v1',
      label:'V1',
      date:'2026-07-21',
      status:execBudgetApprovalStateFinal.v1.status,
      owner:'이봄',
      memo:'최초 실행예산 승인 버전',
      budgets:{
        [CATS[0]]:760000000,
        [CATS[1]]:1160000000,
        [CATS[2]]:150000000,
        [CATS[3]]:90000000,
        [CATS[4]]:48918351,
      },
    },
  ];
}

function getSelectedExecBudgetVersionFinal(data) {
  const versions = getExecBudgetVersionSnapshotsFinal(data);
  return versions.find(version => version.key === selectedExecBudgetVersionFinal) || versions[0];
}

function applyExecBudgetVersionSnapshotFinal(data, version) {
  const copy = JSON.parse(JSON.stringify(data));
  copy.transfer = { ...(copy.transfer || {}) };
  Object.entries(version.budgets || {}).forEach(([acct, budget]) => {
    const previousBudget = Number(copy.plan?.[acct] || 0) || 1;
    const ratio = Number(budget || 0) / previousBudget;
    copy.plan[acct] = Number(budget || 0);
    copy.transfer[acct] = 0;
    (copy.months || []).forEach(month => {
      if (!month[acct] || month.type !== 'plan') return;
      if (typeof month[acct].p === 'number') month[acct].p = Math.round(month[acct].p * ratio);
      if (typeof month[acct].q === 'number') month[acct].q = Math.round(month[acct].q * ratio);
      if (Array.isArray(month[acct].details)) {
        month[acct].details = month[acct].details.map(detail => ({
          ...detail,
          amount: Math.round(Number(detail.amount || 0) * ratio),
        }));
      }
    });
  });
  copy.versionSnapshot = version;
  return copy;
}

function selectExecBudgetVersionFinal(versionKey) {
  selectedExecBudgetVersionFinal = versionKey;
  budgetSetupEditAccount = null;
  renderBudgetPage();
}

function getPreviousExecBudgetVersionFinal(data, versionKey = selectedExecBudgetVersionFinal) {
  const versions = getExecBudgetVersionSnapshotsFinal(data);
  const idx = versions.findIndex(version => version.key === versionKey);
  return idx >= 0 ? versions[idx + 1] || null : null;
}

function requestExecBudgetApprovalFinal() {
  const state = execBudgetApprovalStateFinal[selectedExecBudgetVersionFinal];
  const data = BUDGET_SOURCE[currentBudgetProj];
  const selected = getSelectedExecBudgetVersionFinal(data);
  if (!state || !selected) return;
  if (state.status !== '작성중') {
    showToast('작성중 버전만 결재요청할 수 있습니다.');
    return;
  }
  state.status = '승인요청';
  state.approvalStatus = '결재중';
  state.requestedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  state.comment = `${selected.label} 실행예산 변경분 결재요청`;
  showToast(`${selected.label} 실행예산 결재요청을 상신했습니다.`);
  renderBudgetPage();
}

function renderExecBudgetVersionDiffRowsFinal(data) {
  const current = getSelectedExecBudgetVersionFinal(data);
  const previous = getPreviousExecBudgetVersionFinal(data, current.key);
  const labels = [
    { key:CATS[0], label:'인건비' },
    { key:CATS[1], label:'외주비' },
    { key:CATS[2], label:'재료비' },
    { key:CATS[3], label:'경비' },
    { key:CATS[4], label:'A/S비' },
  ];
  if (!previous) {
    return `<tr><td colspan="5" class="center">이전 버전이 없는 최초 실행예산입니다.</td></tr>`;
  }
  return labels.map(item => {
    const before = Number(previous.budgets[item.key] || 0);
    const after = Number(current.budgets[item.key] || 0);
    const diff = after - before;
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
    return `
      <tr>
        <td>${item.label}</td>
        <td class="num">${fmt(before)}원</td>
        <td class="num">${fmt(after)}원</td>
        <td class="num ${cls}">${diff > 0 ? '+' : ''}${fmt(diff)}원</td>
        <td>${diff === 0 ? '변경 없음' : diff > 0 ? '계획 증액' : '계획 감액'}</td>
      </tr>`;
  }).join('');
}

function renderExecBudgetApprovalSummaryFinal(data) {
  const current = getSelectedExecBudgetVersionFinal(data);
  const previous = getPreviousExecBudgetVersionFinal(data, current.key);
  const state = execBudgetApprovalStateFinal[current.key] || {};
  const total = Object.values(current.budgets || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const previousTotal = previous ? Object.values(previous.budgets || {}).reduce((sum, value) => sum + Number(value || 0), 0) : 0;
  const diff = previous ? total - previousTotal : total;
  const canRequest = state.status === '작성중';
  return `
    <div class="exec-approval-panel">
      <div class="exec-approval-head">
        <div>
          <div class="setup-eyebrow">작성중 실행예산 결재</div>
          <div class="setup-title">${current.label} 써머리 및 변경사항 확인</div>
          <p>${previous ? `${previous.label} 승인 버전과 비교한 뒤 결재요청을 진행합니다.` : '최초 버전으로 이전 비교 없이 결재요청을 진행합니다.'}</p>
        </div>
        <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestExecBudgetApprovalFinal()">결재요청</button>
      </div>
      <div class="exec-approval-flow">
        <div class="on"><b>1</b><span>써머리 확인</span></div>
        <div class="${state.approvalStatus && state.approvalStatus !== '미요청' ? 'on' : ''}"><b>2</b><span>결재요청</span></div>
        <div class="${state.approvalStatus === '완료' ? 'on' : ''}"><b>3</b><span>승인완료</span></div>
        <div><b>4</b><span>ERP 전송</span></div>
      </div>
      <div class="exec-approval-kpis">
        <div><span>현재 버전 총액</span><strong>${fmt(total)}원</strong></div>
        <div><span>이전 버전 총액</span><strong>${previous ? `${fmt(previousTotal)}원` : '-'}</strong></div>
        <div class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}"><span>총 증감</span><strong>${diff > 0 ? '+' : ''}${fmt(diff)}원</strong></div>
        <div><span>결재상태</span><strong>${state.approvalStatus || '-'}</strong></div>
      </div>
      <div class="exec-approval-meta">
        <span>상신자 이봄</span>
        <span>결재자 ${state.approver || '김도윤 팀장'}</span>
        <span>상신일시 ${state.requestedAt || '-'}</span>
        <span>${state.comment || '써머리 확인 후 결재요청 대기'}</span>
      </div>
      <div class="exec-approval-table-wrap">
        <table class="exec-approval-table">
          <thead><tr><th>계정</th><th>이전 버전</th><th>작성중 버전</th><th>증감</th><th>변경 요약</th></tr></thead>
          <tbody>${renderExecBudgetVersionDiffRowsFinal(data)}</tbody>
        </table>
      </div>
    </div>`;
}

// ── 실행예산 상세: 이력 → 계정별 작성 → 결재 3단계 흐름 ──
var budgetSetupStage = 'history'; // 'history' | 'edit' | 'approval'

function goBudgetSetupStage(stage) {
  // 전 계정 합계가 CP총액을 넘으면 결재로 넘어갈 수 없습니다(계정 단위 초과는 허용).
  if (stage === 'approval' && typeof budgetRollupFinal === 'function') {
    const data = BUDGET_SOURCE[currentBudgetProj];
    if (data) {
      const viewData = applyExecBudgetVersionSnapshotFinal(data, getSelectedExecBudgetVersionFinal(data));
      const roll = budgetRollupFinal(viewData, data);
      if (roll.overCp) {
        showToast(`수립 예산 합계가 CP총액을 ${fmt(-roll.cpRemain)}원 초과했습니다. 계정 예산을 줄인 뒤 상신할 수 있습니다.`);
        cpTotalPopupOpenFinal = true;
        renderBudgetPage();
        return;
      }
    }
  }
  budgetSetupStage = stage;
  if (stage !== 'edit') budgetSetupEditAccount = null;
  renderBudgetPage();
}

// 신규 버전 생성(목업): 작성중 버전이 있으면 이어서 작성, 없으면 최신 승인본 복제 안내
function createBudgetVersionFinal() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  const versions = getExecBudgetVersionSnapshotsFinal(data);
  const draft = versions.find(v => v.status === '작성중');
  budgetSetupEditAccount = null;
  budgetSetupStage = 'edit';
  if (draft) {
    selectedExecBudgetVersionFinal = draft.key;
    showToast(`${draft.label} 작성중 버전에서 계정별 작성을 이어갑니다.`);
  } else {
    showToast('최신 승인본을 복제한 신규 작성중 버전을 생성했습니다.');
  }
  renderBudgetPage();
}

function renderBudgetFlowStepperFinal() {
  const steps = [
    { key:'history',  no:'1', label:'이력' },
    { key:'edit',     no:'2', label:'계정별 작성' },
    { key:'approval', no:'3', label:'결재' },
  ];
  return `
    <div class="budget-flow-stepper" role="tablist" aria-label="실행예산 진행 단계">
      ${steps.map(s => `
        <button class="bfs-step ${budgetSetupStage === s.key ? 'active' : ''}" onclick="goBudgetSetupStage('${s.key}')">
          <span class="bfs-no">${s.no}</span><span class="bfs-label">${s.label}</span>
        </button>`).join('<span class="bfs-arrow" aria-hidden="true">→</span>')}
    </div>`;
}

// 결재라인: 기안자 → 팀장승인
function renderBudgetApprovalLineFinal(data) {
  const current = getSelectedExecBudgetVersionFinal(data);
  const state = execBudgetApprovalStateFinal[current.key] || {};
  const requested = state.approvalStatus && state.approvalStatus !== '미요청';
  const approved = state.approvalStatus === '완료';
  return `
    <div class="exec-approval-line" aria-label="결재라인">
      <div class="eal-node done">
        <span class="eal-role">기안자</span>
        <strong>이봄</strong>
        <em>${state.requestedAt ? '상신 ' + state.requestedAt : '작성중'}</em>
      </div>
      <span class="eal-arrow" aria-hidden="true">→</span>
      <div class="eal-node ${approved ? 'done' : requested ? 'active' : 'wait'}">
        <span class="eal-role">팀장 승인</span>
        <strong>${state.approver || '김도윤 팀장'}</strong>
        <em>${approved ? '승인완료' : requested ? '결재중' : '대기'}</em>
      </div>
    </div>`;
}

function budgetVersionTotalFinal(version) {
  return Object.values(version.budgets || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

// 선택 버전 상세 내역(읽기 전용): 계정별 금액 + 총액
function renderBudgetVersionDetailFinal(version) {
  const accounts = [
    { key:CATS[0], label:'인건비' },
    { key:CATS[1], label:'외주비' },
    { key:CATS[2], label:'재료비' },
    { key:CATS[3], label:'경비' },
    { key:CATS[4], label:'A/S비' },
  ];
  const total = budgetVersionTotalFinal(version);
  const approved = version.status === '승인완료';
  const rows = accounts.map(item => `
    <div class="vdc-row">
      <span>${item.label}</span>
      <strong>${fmt(version.budgets[item.key] || 0)}원</strong>
    </div>`).join('');
  return `
    <div class="version-detail-card">
      <div class="vdc-head">
        <div>
          <strong>${version.label} 상세 내역</strong>
          <span class="vdc-meta">${version.date} · 작성자 ${version.owner}</span>
        </div>
        <span class="vdc-status ${approved ? 'done' : ''}">${version.status}</span>
      </div>
      <div class="vdc-memo">${version.memo}</div>
      <div class="vdc-rows">${rows}</div>
      <div class="vdc-total">
        <span>${approved ? '승인 총액' : '작성 총액'}</span>
        <strong>${fmt(total)}원</strong>
      </div>
    </div>`;
}

/* ── CP총액(선행 시스템 승인 한도) vs 실제 수립 예산 ──────────────────────
   - CP총액   : data.plan[계정] — 선행 시스템에서 승인받은 계정별 편성 한도(참고용)
   - 수립 예산 : 계정별 예산내역 표에 실제로 쌓인 금액(Σ getMonthlyBudgetRows.plan)
   PM은 계정 단위로는 CP총액을 넘길 수 있지만, 전 계정 합계는 CP 합계를 넘길 수 없습니다. */
const CP_ACCOUNTS_FINAL = [CATS[0], CATS[1], CATS[2], CATS[3], CATS[4]];

// 계정 하나의 "하단 예산내역 표" 합계 — 상단 배너·타일이 모두 이 값을 씁니다.
function accountRollupFinal(viewData, acct) {
  const rows = getMonthlyBudgetRows(viewData, acct) || [];
  const plan = rows.reduce((s, r) => s + (r.plan || 0), 0);
  const done = rows.reduce((s, r) => s + (r.actual || 0), 0);   // 실적 + 확정(= 표의 "실적/확정" 열)
  return { plan, done, remain: Math.max(plan - done, 0) };
}

// 전 계정 롤업 + CP총액 비교 결과를 한 번에 돌려줍니다.
function budgetRollupFinal(viewData, data) {
  const src = data || viewData;
  const rows = CP_ACCOUNTS_FINAL.map(acct => {
    const roll = accountRollupFinal(viewData, acct);
    const cp = viewData.plan[acct] || 0;
    // 상세계정 비율 배분에서 생기는 몇 원짜리 반올림 차이는 "초과"로 보지 않습니다.
    const diff = roll.plan - cp;
    return Object.assign({ acct, cp, over: Math.abs(diff) < 1000 ? 0 : diff }, roll);
  });
  const plan = rows.reduce((s, r) => s + r.plan, 0);
  const done = rows.reduce((s, r) => s + r.done, 0);
  const cp = rows.reduce((s, r) => s + r.cp, 0);
  // 투입확정은 기존 확정 소스를 그대로 쓰고, 실집행은 표 합계에서 확정분을 뺀 값으로 맞춥니다.
  // → 실집행 + 투입확정 = 하단 "실적/확정" 합계, 투입미정 = 하단 "잔여예산" 합계가 정확히 성립합니다.
  const quasi = Math.min(CP_ACCOUNTS_FINAL.reduce((s, c) => s + calcQuasi(src, c), 0), done);
  return {
    rows, cp, plan, done,
    actual: Math.max(done - quasi, 0),
    quasi,
    remain: plan - done,
    cpRemain: cp - plan,
    overCp: plan - cp >= 1000,      // 반올림 오차(원 단위)로 상신이 막히지 않게 합니다

  };
}

var cpTotalPopupOpenFinal = false;
function openCpTotalPopupFinal() { cpTotalPopupOpenFinal = true; renderBudgetPage(); }
function closeCpTotalPopupFinal() { cpTotalPopupOpenFinal = false; renderBudgetPage(); }

// 계정 단위 초과는 허용하고, 전 계정 합계가 CP 합계를 넘는 것만 막습니다.
function renderCpLimitBarFinal(roll) {
  const used = roll.cp > 0 ? Math.min((roll.plan / roll.cp) * 100, 100) : 0;
  const overAccts = roll.rows.filter(r => r.over > 0);
  return `
    <div class="cp-limit ${roll.overCp ? 'over' : ''}">
      <div class="cp-limit-head">
        <b>${roll.overCp ? '⚠ CP총액 초과' : 'CP총액 한도'}</b>
        <span>수립 <b>${fmt(roll.plan)}</b>원 / CP총액 <b>${fmt(roll.cp)}</b>원</span>
        <em class="${roll.overCp ? 'bad' : 'ok'}">${roll.overCp
          ? `합계 ${fmt(-roll.cpRemain)}원 초과 — 결재 상신할 수 없습니다`
          : `여유 ${fmt(roll.cpRemain)}원`}</em>
      </div>
      <div class="cp-limit-row">
        <div class="cp-limit-bar"><i style="width:${used}%"></i></div>
        <button class="cp-ref-btn ${roll.overCp ? 'over' : ''}" onclick="openCpTotalPopupFinal()"
          title="선행 시스템에서 승인받은 계정별 편성 한도(참고용)">▣ CP총액 ${fmt(roll.cp)}원</button>
      </div>
      ${overAccts.length
        ? `<div class="cp-limit-note">계정 초과 ${overAccts.length}건(${overAccts.map(r => `${r.acct} +${fmt(r.over)}원`).join(', ')})</div>`
        : ''}
    </div>`;
}

function renderCpTotalPopupFinal(roll, version) {
  const body = roll.rows.map(r => `
    <tr class="${r.over > 0 ? 'over' : ''}">
      <td>${r.acct}</td>
      <td class="num">${fmt(r.cp)}</td>
      <td class="num">${fmt(r.plan)}</td>
      <td class="num ${r.over > 0 ? 'bad' : 'ok'}">${r.over > 0 ? '+' + fmt(r.over) : fmt(-r.over)}</td>
    </tr>`).join('');
  return `
    <div class="cp-pop-dim" onclick="if(event.target===this)closeCpTotalPopupFinal()">
      <div class="cp-pop" role="dialog" aria-modal="true" aria-label="CP총액">
        <div class="cp-pop-head">
          <div>
            <strong>CP총액 (선행 시스템 승인 한도)</strong>
            <span>${version.label} 기준 · 참고용입니다. 계정 단위 초과는 허용되고, 합계만 넘길 수 없습니다.</span>
          </div>
          <button class="labor-sub-btn" onclick="closeCpTotalPopupFinal()">닫기</button>
        </div>
        <table class="cp-pop-table">
          <thead><tr><th>계정</th><th class="num">CP총액(한도)</th><th class="num">수립 예산</th><th class="num">한도 대비</th></tr></thead>
          <tbody>${body}</tbody>
          <tfoot>
            <tr>
              <td>합계</td>
              <td class="num">${fmt(roll.cp)}</td>
              <td class="num">${fmt(roll.plan)}</td>
              <td class="num ${roll.overCp ? 'bad' : 'ok'}">${roll.overCp ? '+' + fmt(-roll.cpRemain) + ' 초과' : fmt(roll.cpRemain) + ' 여유'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

/* ── [프로젝트 총 실행 비용] 탭 — 계정별 합계표 ─────────────────────────
   계정 / 계획(전체) / 실적(확정) / 계획(미집행) / 월별 금액.
   경비는 월단위가 아니라 연단위로 계획을 세우므로 그 계정만 연도로 묶어 한 칸에 표시합니다. */
function renderTotalCostTableFinal(viewData, data) {
  const roll = budgetRollupFinal(viewData, data);
  const months = viewData.months.map(mo => mo.m);

  // 경비는 연도별 묶음 — 월 헤더 대신 연도 헤더 하나가 여러 달을 덮습니다.
  const expenseYears = (typeof expensePlanYearsFinal === 'function') ? expensePlanYearsFinal() : [];
  const yearOfMonth = m => m.slice(0, 4);
  const years = [...new Set(months.map(yearOfMonth))];

  const monthCell = (acct, m) => {
    if (acct === CATS[3] && expenseYears.length) return null;   // 경비는 아래에서 연도로 합산
    const v = (typeof osv3MonthPlanTotalV3 === 'function' && acct === CATS[1])
      ? osv3MonthPlanTotalV3(m)
      : getMonthAccountValue(viewData.months.find(mo => mo.m === m) || {}, acct);
    return Math.round(v || 0);
  };

  const bodyRows = roll.rows.map(r => {
    const isExpense = r.acct === CATS[3];
    const cells = isExpense
      // 경비: 그 연도에 속한 달들을 하나로 합쳐 colspan으로 덮습니다.
      ? years.map(y => {
          const span = months.filter(m => yearOfMonth(m) === y).length;
          const idxs = (expenseYears.find(e => e.year === y) || {}).idxs || [];
          const v = (typeof getExpenseRows === 'function' && idxs.length)
            ? getExpenseRows().reduce((sum, row) => sum + expenseYearPlan(row, idxs), 0)
            : months.filter(m => yearOfMonth(m) === y).reduce((sum, m) => sum + (monthCell(r.acct, m) || 0), 0);
          return `<td class="num tct-year" colspan="${span}" title="${y}년 연단위 계획">${fmt(v)}</td>`;
        }).join('')
      : months.map(m => `<td class="num">${fmt(monthCell(r.acct, m))}</td>`).join('');
    return `
      <tr>
        <td class="tct-acct">${r.acct}${isExpense ? '<em>연단위</em>' : ''}</td>
        <td class="num">${fmt(r.plan)}</td>
        <td class="num tct-done">${fmt(r.done)}</td>
        <td class="num tct-open">${fmt(r.remain)}</td>
        ${cells}
      </tr>`;
  }).join('');

  const monthTotals = months.map(m =>
    roll.rows.reduce((sum, r) => sum + (r.acct === CATS[3] ? 0 : (monthCell(r.acct, m) || 0)), 0));

  return `
    <div class="total-cost-table">
      <div class="tct-head">
        <strong>계정별 합계</strong>
        <span>계획(전체)은 PM이 수립한 예산, 실적(확정)은 이미 발생한 금액, 계획(미집행)은 계획은 섰지만 아직 실적이 없는 금액입니다.</span>
      </div>
      <div class="tct-scroll">
        <table class="tct-table">
          <thead>
            <tr>
              <th>계정</th><th class="num">계획(전체)</th><th class="num">실적(확정)</th><th class="num">계획(미집행)</th>
              ${months.map(m => `<th class="num">${m}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr>
              <td class="tct-acct">합계<em class="tct-foot-hint">월별은 경비 제외</em></td>
              <td class="num">${fmt(roll.plan)}</td>
              <td class="num tct-done">${fmt(roll.done)}</td>
              <td class="num tct-open">${fmt(roll.plan - roll.done)}</td>
              ${monthTotals.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="tct-note">※ 경비는 월단위가 아니라 연단위로 계획을 수립하므로, 월 칸을 연도 단위로 병합해 그 해 전체금액을 표시합니다. 특정 월에 귀속시킬 수 없어 하단 월별 합계에서는 제외됩니다.</p>
    </div>`;
}

// 실행예산 화면 맨 위 — 어떤 프로젝트의 예산을 보고 있는지 한 줄로 밝힙니다.
// 코드/프로젝트명/기간/PM/유형은 프로젝트 목록(EXEC_BUDGET_PROJECTS)이 원본이고,
// 목록에 없는 키면 BUDGET_SOURCE의 값으로 채웁니다.
function renderBudgetProjectInfoFinal(data) {
  const row = (typeof EXEC_BUDGET_PROJECTS !== 'undefined')
    ? EXEC_BUDGET_PROJECTS.find(p => p.key === currentBudgetProj) : null;
  const name = (row && row.name) || data.projName || '';
  const code = (row && row.no) || '';
  const period = (row && row.period) || [data.start, data.end].filter(Boolean).join(' ~ ');
  const pm = (row && row.pm) || '';
  const type = (row && row.type) || '';
  const status = (row && row.status) || data.stage || '';
  const item = (label, value) => value
    ? `<div class="bpi-item"><span>${label}</span><b>${value}</b></div>` : '';
  // 코드 · 프로젝트명 · 상태 · 기간 · PM · 유형을 가로 한 줄로 나열합니다.
  return `
    <div class="budget-proj-info">
      ${code ? `<span class="bpi-code">${code}</span>` : ''}
      <strong class="bpi-name">${name}</strong>
      ${status ? `<em class="bpi-status">${status}</em>` : ''}
      ${data.dplus ? `<em class="bpi-dplus">D+${data.dplus}일</em>` : ''}
      ${item('기간', period)}
      ${item('수행PM', pm)}
      ${item('유형', type)}
    </div>`;
}

renderBudgetSetupOverview = function(data, actual, quasi) {
  ensureAsCostPlanAmount(data);
  const versions = getExecBudgetVersionSnapshotsFinal(data);
  const selectedVersion = getSelectedExecBudgetVersionFinal(data);
  const viewData = applyExecBudgetVersionSnapshotFinal(data, selectedVersion);
  const accounts = [
    { key:CATS[0], label:'인건비' },
    { key:CATS[1], label:'외주비' },
    { key:CATS[2], label:'재료비' },
    { key:CATS[3], label:'경비' },
    { key:CATS[4], label:'A/S비' },
  ];
  const totalBudget = accounts.reduce((sum, item) => sum + (viewData.plan[item.key] || 0), 0);
  const stepper = renderBudgetFlowStepperFinal();
  const projInfo = renderBudgetProjectInfoFinal(data);   // 탭 줄보다 위에 놓습니다

  // ── ① 이력 ──
  if (budgetSetupStage === 'history') {
    return `
      <div class="setup-overview compact">
        ${projInfo}
        ${stepper}
        <div class="setup-stage-head">
          <div>
            <div class="setup-title">실행예산 이력</div>
            <div class="setup-editor-sub">버전을 선택해 열람하거나, 신규 버전을 생성해 작성을 시작합니다.</div>
          </div>
          <button class="labor-main-btn" onclick="createBudgetVersionFinal()">＋ 신규 버전 생성</button>
        </div>
        <div class="setup-version-tabs vertical" aria-label="실행예산 버전 목록">
          ${versions.map(version => `
            <button class="setup-version-pill ${selectedVersion.key === version.key ? 'active' : ''}" onclick="selectExecBudgetVersionFinal('${version.key}')">
              <strong>${version.label} · ${version.date}</strong>
              <span class="svp-total">${version.status === '승인완료' ? '승인 총액' : '총액'} ${fmt(budgetVersionTotalFinal(version))}원</span>
              <span class="svp-status">${version.status}</span>
            </button>`).join('')}
        </div>
        ${renderBudgetVersionDetailFinal(selectedVersion)}
        <div class="setup-stage-actions">
          ${selectedVersion.status === '작성중'
            ? `<button class="labor-main-btn" onclick="goBudgetSetupStage('edit')">이 버전 계정별 작성 →</button>`
            : `<button class="labor-sub-btn" onclick="goBudgetSetupStage('edit')">계정 내역 보기 →</button>`}
        </div>
      </div>`;
  }

  // ── ③ 결재 ──
  if (budgetSetupStage === 'approval') {
    return `
      <div class="setup-overview compact">
        ${projInfo}
        ${stepper}
        ${renderBudgetApprovalLineFinal(data)}
        ${renderExecBudgetApprovalSummaryFinal(data)}
      </div>`;
  }

  // ── ② 계정별 작성 ──
  // 타일 금액 = PM이 실제로 수립한 예산(하단 예산내역 표 합계), 퍼센티지 = 그 계정의 집행률.
  // CP총액(선행 승인 한도)은 금액 자리를 차지하지 않고 [CP총액] 팝업에서 참고합니다.
  const roll = budgetRollupFinal(viewData, data);
  const byAcct = {};
  roll.rows.forEach(r => { byAcct[r.acct] = r; });
  const builtTotal = roll.plan;
  const rows = accounts.map(item => {
    const r = byAcct[item.key] || { plan:0, done:0, cp:0 };
    return renderAcctTile({
      label: item.label,
      value: r.plan,
      total: builtTotal,
      maxVal: 1,
      rate: r.plan > 0 ? (r.done / r.plan) * 100 : 0,
      rateTip: `집행률 = 실적/확정 ${fmt(r.done)}원 ÷ 수립 예산 ${fmt(r.plan)}원`
        + ` · CP총액(한도) ${fmt(r.cp)}원`,
      active: budgetSetupEditAccount === item.key,
      onclick: `openBudgetAccountEditor('${item.key}')`,
    });
  }).join('');
  const expanded = budgetSetupEditAccount
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, budgetSetupEditAccount)}</div>`
    : `<div class="setup-expanded-detail">${renderTotalCostTableFinal(viewData, data)}</div>`;

  return `
    <div class="setup-overview compact">
      ${projInfo}
      <div class="setup-top-actions">
        <button class="labor-sub-btn" onclick="showToast('임시저장했어요.')">임시저장</button>
        <button class="labor-main-btn" onclick="goBudgetSetupStage('approval')">결재 상신 →</button>
      </div>
      ${stepper}
      <div class="setup-version-note">
        <strong>${selectedVersion.label} 계정별 작성</strong>
        <span>${selectedVersion.memo}</span>
        <em>작성자 ${selectedVersion.owner} · 상태 ${selectedVersion.status}</em>
      </div>
      ${cpTotalPopupOpenFinal ? renderCpTotalPopupFinal(roll, selectedVersion) : ''}
      <div class="acct-tile-group">
        ${renderAcctTile({
          label:'프로젝트 총 실행 비용',
          value: builtTotal,
          isTotal:true,
          foot: `집행률 ${builtTotal > 0 ? Math.round((roll.done / builtTotal) * 1000) / 10 : 0}% · 실적/확정 ${fmt(roll.done)}원`,
          active: budgetSetupEditAccount === null,
          onclick:`budgetSetupEditAccount=null;renderBudgetPage()` })}
        ${rows}
      </div>
      ${renderCpLimitBarFinal(roll)}
      ${expanded}
    </div>`;
};

// [A/S 계정편집기·월별표 데코레이터는 budget-area-as.js로 이관되었습니다]

// AI GUIDE: 인건비 상세 계정 목업입니다.
// - 실투입인건비: SCM 확정완료 인력을 선택 등록하는 기존 화면을 그대로 사용합니다.
// - 이관인건비: 이관외주비/이관재료비와 동일하게 Receiver Project만 신규 등록하고 Sender Project는 조회 전용입니다.
// - OT비: 경비 자원계획처럼 월별 금액을 직접 키인해 인건비 예산내역에 반영합니다.
var laborKindFinal = 'direct';
var laborTransferEditorOpenFinal = false;
var editingLaborTransferIdFinal = null;

const laborTransferRowsByProjectFinal = {};
const laborOtRowsByProjectFinal = {};

function getLaborTransferRowsFinal(proj = currentBudgetProj) {
  if (!laborTransferRowsByProjectFinal[proj]) {
    laborTransferRowsByProjectFinal[proj] = [
      { id:'lt-001', transferType:'Receiver Project', expectedMonth:'2026-09', amount:18000000, description:'PMO 분석설계 인력비 이관 수취', status:'계획', actualized:false },
      { id:'lt-002', transferType:'Receiver Project', expectedMonth:'2027-02', amount:12500000, description:'타 프로젝트 잔여 인건비 이관 수취', status:'계획', actualized:false },
      { id:'lt-003', transferType:'Sender Project', expectedMonth:'2026-06', amount:-7200000, description:'선행 검증 인력비 타 프로젝트 배부', status:'집행완료', actualized:true },
    ];
  }
  return laborTransferRowsByProjectFinal[proj];
}

function getLaborOtRowsFinal(proj = currentBudgetProj) {
  if (!laborOtRowsByProjectFinal[proj]) {
    laborOtRowsByProjectFinal[proj] = [
      { id:'ot-01', accountCode:'701301', accountName:'종업원급여-OT', carried:0, actual:3200000, monthly:[0, 0, 0, 5200000, 5800000, 6200000, 6400000, 4500000, 3000000, 0] },
      { id:'ot-02', accountCode:'701302', accountName:'월별 OT 계획', carried:0, actual:0, monthly:[0, 0, 0, 1800000, 2200000, 2400000, 2500000, 1600000, 900000, 0] },
    ];
  }
  return laborOtRowsByProjectFinal[proj];
}

function getLaborTransferAmountForMonthFinal(month) {
  return getLaborTransferRowsFinal().reduce((sum, row) => row.expectedMonth === month ? sum + Number(row.amount || 0) : sum, 0);
}

function getLaborTransferPlanTotalFinal() {
  return getLaborTransferRowsFinal().reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function getLaborTransferActualTotalFinal() {
  return getLaborTransferRowsFinal().reduce((sum, row) => row.actualized ? sum + Number(row.amount || 0) : sum, 0);
}

function getLaborOtAmountForMonthFinal(month) {
  const idx = EXPENSE_PLAN_MONTHS.indexOf(month);
  if (idx < 0) return 0;
  return getLaborOtRowsFinal().reduce((sum, row) => sum + Number(row.monthly[idx] || 0), 0);
}

function getLaborOtPlanTotalFinal() {
  return getLaborOtRowsFinal().reduce((sum, row) => sum + row.monthly.reduce((s, v) => s + Number(v || 0), 0), 0);
}

function getLaborOtActualTotalFinal() {
  return getLaborOtRowsFinal().reduce((sum, row) => sum + Number(row.actual || 0), 0);
}

function switchLaborKindFinal(kind) {
  laborKindFinal = ['direct', 'transfer', 'ot'].includes(kind) ? kind : 'direct';
  laborTransferEditorOpenFinal = false;
  editingLaborTransferIdFinal = null;
  renderBudgetPage();
}

function renderLaborKindTabsFinal() {
  const tabs = [
    { step:'01', label:'실투입인건비', desc:'SCM 확정 인력', active:laborKindFinal === 'direct', action:"switchLaborKindFinal('direct')" },
    { step:'02', label:'이관인건비', desc:'Receiver/Sender 이관', active:laborKindFinal === 'transfer', action:"switchLaborKindFinal('transfer')" },
    { step:'03', label:'OT비', desc:'월별 금액 키인', active:laborKindFinal === 'ot', action:"switchLaborKindFinal('ot')" },
  ];
  return `
    <div class="cost-category-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>인건비 상세 계정을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
        <p>인건비는 실투입인건비, 이관인건비, OT비로 나누어 계획과 실적을 관리합니다.</p>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong material labor-kind-tabs">
        ${tabs.map(tab => `
          <button class="${tab.active ? 'active' : ''}" onclick="${tab.action}">
            <em>${tab.step}</em>
            <strong>${tab.label}</strong>
            <span>${tab.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

function openLaborTransferNewFinal() {
  laborKindFinal = 'transfer';
  editingLaborTransferIdFinal = null;
  laborTransferEditorOpenFinal = true;
  renderBudgetPage();
}

function closeLaborTransferEditorFinal() {
  editingLaborTransferIdFinal = null;
  laborTransferEditorOpenFinal = false;
  renderBudgetPage();
}

function editLaborTransferFinal(id) {
  const row = getLaborTransferRowsFinal().find(item => item.id === id);
  if (!row) return;
  if (row.transferType === 'Sender Project' || row.actualized || row.status === '집행완료') {
    showToast('Sender Project 또는 집행완료 건은 조회만 가능합니다.');
    return;
  }
  editingLaborTransferIdFinal = id;
  laborTransferEditorOpenFinal = true;
  laborKindFinal = 'transfer';
  renderBudgetPage();
}

function saveLaborTransferFinal() {
  const rows = getLaborTransferRowsFinal();
  const editing = editingLaborTransferIdFinal ? rows.find(row => row.id === editingLaborTransferIdFinal) : null;
  if (editing && (editing.transferType === 'Sender Project' || editing.actualized || editing.status === '집행완료')) {
    showToast('Sender Project 또는 집행완료 건은 수정할 수 없습니다.');
    return;
  }
  const amount = parseBudgetAmount(document.getElementById('labor-transfer-amount')?.value || 0);
  if (!amount) {
    showToast('이관인건비 금액을 입력해 주세요.');
    return;
  }
  const payload = {
    id: editing?.id || `lt-${Date.now()}`,
    transferType:'Receiver Project',
    expectedMonth: document.getElementById('labor-transfer-month')?.value || '2026-10',
    amount: Math.abs(amount),
    description: document.getElementById('labor-transfer-desc')?.value || '타 프로젝트 잔여 인건비 이관 수취',
    status: editing?.status || '계획',
    actualized:false,
  };
  if (editing) Object.assign(editing, payload);
  else rows.unshift(payload);
  editingLaborTransferIdFinal = null;
  laborTransferEditorOpenFinal = false;
  showToast('이관인건비 계획이 저장되었습니다.');
  renderBudgetPage();
}

function renderLaborTransferFormFinal(editing) {
  return `
    <div class="labor-card material-transfer-form-card">
      <div class="bpo-form-head">
        <div>
          <strong>${editing ? '이관인건비 계획 수정' : '이관인건비 계획 입력'}</strong>
          <span>신규 등록은 Receiver Project만 가능하며, Sender Project는 집행완료 후 조회 전용으로 반영됩니다.</span>
        </div>
        <button class="labor-sub-btn" onclick="closeLaborTransferEditorFinal()">닫기</button>
      </div>
      <div class="labor-form os-other-form material-transfer-form">
        <label><span>Project Type</span><input value="Receiver Project" readonly></label>
        <label><span>이관예정월</span><input id="labor-transfer-month" type="month" value="${editing?.expectedMonth || '2026-10'}"></label>
        <label><span>금액</span><input id="labor-transfer-amount" inputmode="numeric" value="${editing ? Math.abs(editing.amount || 0) : ''}" placeholder="예: 18000000"></label>
        <label class="wide"><span>이관 사유</span><input id="labor-transfer-desc" value="${editing?.description || ''}" placeholder="예: 타 프로젝트 잔여 인건비 이관 수취"></label>
      </div>
      <div class="bpo-rule-note">
        <strong>Receiver Project 기준</strong>
        <span>이관인건비 신규 계획은 수취 프로젝트 기준 플러스 금액으로 등록됩니다. Sender Project 건은 집행 완료 후 조회 데이터로만 표시합니다.</span>
      </div>
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveLaborTransferFinal()">${editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>`;
}

function renderLaborTransferPanelFinal() {
  const rows = getLaborTransferRowsFinal();
  const editing = editingLaborTransferIdFinal ? rows.find(row => row.id === editingLaborTransferIdFinal) : null;
  const editorOpen = laborTransferEditorOpenFinal || !!editing;
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const listRows = rows.map((row, idx) => {
    const locked = row.transferType === 'Sender Project' || row.actualized || row.status === '집행완료';
    const amountClass = row.amount < 0 ? 'danger' : 'good';
    return `
      <div class="bpo-list-row material-transfer-row ${editingLaborTransferIdFinal === row.id ? 'active' : ''}">
        <span>${idx + 1}</span>
        <span>${row.transferType || 'Receiver Project'}</span>
        <span>${row.expectedMonth || '-'}</span>
        <strong class="${amountClass}">${fmt(row.amount || 0)}원</strong>
        <span>${row.description || '-'}</span>
        <em>${row.status || '계획'}</em>
        ${locked
          ? '<span class="bpo-readonly-text">조회</span>'
          : `<button class="labor-sub-btn" onclick="editLaborTransferFinal('${row.id}')">수정</button>`}
      </div>`;
  }).join('');

  return `
    <div class="os-sub-summary ma material-transfer-summary">
      <div><strong>${rows.length}</strong><span>이관인건비 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>순 이관금액</span></div>
      <p>신규 계획 등록은 Receiver Project만 가능합니다. Sender Project는 타 시스템에서 집행 완료 후 이관 결과로 수신되어 리스트에서 조회만 가능합니다.</p>
    </div>
    <div class="os-registered-card material-transfer-list-card">
      <div class="labor-flow-title">
        <strong>이관인건비 계획 등록</strong>
        ${editorOpen ? '' : '<button class="labor-main-btn" onclick="openLaborTransferNewFinal()">신규등록</button>'}
      </div>
      <div class="bpo-list-card material-transfer-list labor-transfer-list">
        <div class="bpo-list-head material-transfer-head">
          <span>No</span><span>Project Type</span><span>이관예정월</span><span>금액</span><span>이관 사유</span><span>상태</span><span></span>
        </div>
        ${listRows || '<div class="labor-empty">등록된 이관인건비 계획이 없습니다.</div>'}
      </div>
    </div>
    ${editorOpen ? renderLaborTransferFormFinal(editing) : ''}`;
}

function saveLaborOtPlanFinal() {
  getLaborOtRowsFinal().forEach(row => {
    row.monthly = EXPENSE_PLAN_MONTHS.map((month, idx) => {
      const el = document.getElementById(`labor-ot-${row.id}-${idx}`);
      return parseBudgetAmount(el ? el.value : row.monthly[idx] || 0);
    });
  });
  showToast('OT비 월별 계획이 저장되었습니다.');
  renderBudgetPage();
}

function renderLaborOtPanelFinal() {
  const rows = getLaborOtRowsFinal();
  const body = rows.map(row => {
    const plan = row.monthly.reduce((sum, value) => sum + Number(value || 0), 0);
    return `
      <tr>
        <td>${row.accountCode}</td>
        <td><strong>${row.accountName}</strong></td>
        <td class="num">${fmt(row.carried || 0)}</td>
        <td class="num">${fmt(plan)}</td>
        <td class="num">${fmt(row.actual || 0)}</td>
        ${EXPENSE_PLAN_MONTHS.map((month, idx) => `
          <td><input class="expense-month-input" id="labor-ot-${row.id}-${idx}" value="${row.monthly[idx] || 0}" inputmode="numeric"></td>
        `).join('')}
      </tr>`;
  }).join('');
  return `
    <div class="expense-plan-panel labor-ot-panel">
      <div class="expense-plan-head">
        <div>
          <div class="expense-plan-title">OT비 월별 계획 <span>총 ${rows.length}건</span></div>
          <p>OT비는 경비 자원계획과 동일하게 월별 계획금액을 직접 입력합니다. 저장 후 인건비 예산내역의 OT비 행에 반영됩니다.</p>
        </div>
        <div class="expense-plan-actions">
          <button class="labor-main-btn" onclick="saveLaborOtPlanFinal()">계획 저장</button>
        </div>
      </div>
      <div class="expense-grid-wrap">
        <table class="expense-grid-table expense-grid-table-final">
          <thead>
            <tr>
              <th rowspan="2">계정코드</th>
              <th rowspan="2">계정명</th>
              <th rowspan="2">이전계획</th>
              <th rowspan="2">계획</th>
              <th rowspan="2">실적</th>
              <th colspan="${EXPENSE_PLAN_MONTHS.length}">월별 계획</th>
            </tr>
            <tr>${EXPENSE_PLAN_MONTHS.map(m => `<th>${m}</th>`).join('')}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

function renderLaborDetailPlanPanelFinal(data) {
  if (laborKindFinal === 'transfer') return renderLaborTransferPanelFinal();
  if (laborKindFinal === 'ot') return renderLaborOtPanelFinal();
  return renderLaborAssignmentPanel(data);
}

var getMonthlyBudgetRowsBeforeLaborDetailFinal = getMonthlyBudgetRows;
getMonthlyBudgetRows = function(data, account) {
  if (account !== CATS[0]) return getMonthlyBudgetRowsBeforeLaborDetailFinal(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  const transferMonths = data.months.map(mo => getLaborTransferAmountForMonthFinal(mo.m));
  const otMonths = data.months.map(mo => getLaborOtAmountForMonthFinal(mo.m));
  const directMonths = data.months.map((mo, idx) => Math.max(getMonthAccountValue(mo, account) - transferMonths[idx] - otMonths[idx], 0));
  const directPlan = directMonths.reduce((sum, value) => sum + value, 0);
  const transferPlan = transferMonths.reduce((sum, value) => sum + value, 0);
  const otPlan = otMonths.reduce((sum, value) => sum + value, 0);
  const transferActual = getLaborTransferActualTotalFinal();
  const otActual = getLaborOtActualTotalFinal();
  return [
    { name:'실투입인건비', plan:directPlan, actual:Math.max(totalActual - transferActual - otActual, 0), remain:Math.max(directPlan - Math.max(totalActual - transferActual - otActual, 0), 0), months:directMonths },
    { name:'이관인건비', plan:transferPlan, actual:transferActual, remain:Math.max(transferPlan - transferActual, 0), months:transferMonths },
    { name:'OT비', plan:otPlan, actual:otActual, remain:Math.max(otPlan - otActual, 0), months:otMonths },
  ];
};

// [인건비 계정 편집기 진입점(데코레이터)은 budget-area-labor.js로 이관되었습니다]

// [A/S 집행계획 행·상세행 데코레이터는 budget-area-as.js로 이관되었습니다]

// [경비 데이터/그리드/검증/패널 로직은 budget-area-expense.js로 이관되었습니다]

