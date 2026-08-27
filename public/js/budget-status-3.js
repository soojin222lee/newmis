/* ============================================================
   [budget-status 분할본 3/5] — 로드 순서 필수(앞 파트 뒤에 로드)
   원본 budget-status.js를 병렬작업용으로 5분할. 전역 스코프 공유.
   주요 영역: 기타외주/공사MA + 재료비 kind/감가상각 패널
   ============================================================ */
function renderOtherOutsourcePanel() {
  const rows = getOtherOutsourceRows();
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>기타외주비 계획</span></div>
      <p>출장비, 예산 이관, 일회성 지원비처럼 계약/PO보다 집행 예정월 중심으로 관리할 비용입니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-card-title">기타외주비 계획 입력</div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-os-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="other-os-amount" inputmode="numeric" placeholder="예: 6800000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-os-desc" rows="4" placeholder="예: 어느 프로젝트로부터 이관, 출장비 비용, 고객사 검수 대응비"></textarea></label>
        </div>
        <div class="labor-mm-guide">
          <strong>설명은 일단 텍스트로 쌓습니다.</strong>
          <span>데이터가 충분히 쌓이면 AI가 출장/이관/검수/기타 등으로 카테고리를 제안하는 흐름으로 확장할 수 있습니다.</span>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherOutsourceExpense()">기타외주비 저장</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status saved">${row.status}</i>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타외주비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function saveOtherOutsourceExpense() {
  const expectedMonth = document.getElementById('other-os-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-os-amount')?.value || 0);
  const description = document.getElementById('other-os-desc')?.value || '';

  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  const rows = getOtherOutsourceRows();
  const editing = editingOtherOutsourceId ? rows.find(row => row.id === editingOtherOutsourceId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 기타외주비는 수정할 수 없습니다.');
    return;
  }
  if (editing) {
    Object.assign(editing, { expectedMonth, amount, description, status:'계획' });
    showToast('기타외주비 계획이 수정되었습니다.');
  } else {
    rows.unshift({
      id:`oo-${Date.now()}`,
      expectedMonth,
      amount,
      description,
      status:'계획',
    });
    showToast('기타외주비 계획이 등록되었습니다.');
  }
  editingOtherOutsourceId = null;
  renderBudgetPage();
}

function editOtherOutsourceExpense(id) {
  const row = getOtherOutsourceRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 기타외주비는 수정할 수 없습니다.');
    return;
  }
  editingOtherOutsourceId = id;
  renderBudgetPage();
}

function cancelOtherOutsourceEdit() {
  editingOtherOutsourceId = null;
  renderBudgetPage();
}

function renderOtherOutsourcePanel() {
  const rows = getOtherOutsourceRows();
  const editing = editingOtherOutsourceId ? rows.find(row => row.id === editingOtherOutsourceId) : null;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>기타외주비 계획</span></div>
      <p>실적이 발생한 건은 잠기고, 아직 실적이 없는 계획 건만 신규 등록 또는 수정할 수 있습니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '기타외주비 계획 수정' : '기타외주비 계획 입력'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelOtherOutsourceEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-os-month" type="month" value="${editing ? editing.expectedMonth : '2026-09'}"></label>
          <label><span>금액</span><input id="other-os-amount" inputmode="numeric" value="${editing ? editing.amount : ''}" placeholder="예: 6800000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-os-desc" rows="4" placeholder="예: 어느 프로젝트로부터 이관, 출장비 비용, 고객사 검수 대응비">${editing ? editing.description : ''}</textarea></label>
        </div>
        <div class="labor-mm-guide">
          <strong>설명은 일단 텍스트로 쌓습니다.</strong>
          <span>추후 데이터가 쌓이면 AI가 이관/출장/검수/기타 카테고리를 제안하는 흐름으로 확장할 수 있습니다.</span>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherOutsourceExpense()">${editing ? '수정 저장' : '기타외주비 저장'}</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header with-action"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span><span></span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row with-action ${editingOtherOutsourceId === row.id ? 'active' : ''}">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status ${row.actualized ? 'done' : 'saved'}">${row.status}</i>
              <div class="labor-reg-actions">
                ${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editOtherOutsourceExpense('${row.id}')">수정</button>`}
              </div>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타외주비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function renderMaOutsourcePanel() {
  const rows = getMaOutsourceRows();
  const vendor = getSelectedOutsourceVendor();
  const quotes = (purchaseQuoteData[vendor?.id] || purchaseQuoteData['vd-bp'] || []).slice(0, 3);
  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>MA 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>MA 계획 금액</span></div>
      <p>MA는 견적 데이터를 불러온 뒤 대/중/소 분류, 손익인식 기준, 예상 납기일을 확정합니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 구매 견적 불러오기</div>
            <p>실투입 외주비처럼 최종 수취된 견적을 참고 데이터로 사용합니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="refreshPurchaseQuotes()">견적 새로고침</button>
        </div>
        <div class="os-quote-list compact">
          ${quotes.map(q => `
            <button class="os-quote-item" onclick="applyMaPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
              <strong>${q.quoteNo}</strong>
              <span>${q.title}</span>
              <b>${fmt(q.amount)}원</b>
              <em>수취 ${q.receivedAt}</em>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-card-title">2. MA 기본정보</div>
        <div class="labor-form os-ma-form">
          <label><span>대분류 *</span><input id="ma-large" value="솔루션"></label>
          <label><span>중분류 *</span><input id="ma-middle" value="MA"></label>
          <label><span>소분류 *</span><input id="ma-small" value="유지보수"></label>
          <label><span>모델명</span><input id="ma-model" value="NOVA-COST-AI"></label>
          <label class="wide"><span>제품상세</span><input id="ma-product-detail" value="${maQuoteTitle}"></label>
          <label><span>수량 *</span><input id="ma-qty" inputmode="numeric" value="1"></label>
          <label><span>단위</span><input id="ma-unit" value="식"></label>
          <label><span>손익인식기준 *</span>
            <select id="ma-revenue-basis">
              <option>월</option>
              <option>분기</option>
              <option>반기</option>
              <option>연</option>
            </select>
          </label>
          <label><span>시작일 *</span><input id="ma-start" type="date" value="2026-07-01"></label>
          <label><span>종료일 *</span><input id="ma-end" type="date" value="2027-06-30"></label>
          <label><span>견적번호</span><input id="ma-quote-no" value="${maQuoteNo}" readonly></label>
          <label><span>견적금액</span><input id="ma-amount" inputmode="numeric" value="${maQuoteAmount}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaOutsourceItem()">MA 등록</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head">
          <span>대분류</span><span>중분류</span><span>소분류</span><span>모델명</span><span>제품상세</span><span>수량</span><span>단위</span><span>손익인식기준</span><span>시작일</span><span>종료일</span><span>견적/금액</span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row">
            <span>${row.large}</span><span>${row.middle}</span><span>${row.small}</span><span>${row.model || '-'}</span><span>${row.productDetail || '-'}</span><span>${row.quantity}</span><span>${row.unit || '-'}</span><span>${row.revenueBasis}</span><span>${row.deliveryStart}</span><span>${row.deliveryEnd}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 MA 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function saveOutsourceContractDraft() {
  const rows = getOutsourceRows();
  const editing = editingOutsourceContractId ? rows.find(r => r.id === editingOutsourceContractId) : null;
  const vendor = editing ? outsourceVendorPool.find(v => v.id === editing.vendorId) : getSelectedOutsourceVendor();
  const title = document.getElementById('outsource-contract-title')?.value || '';
  const startDate = document.getElementById('outsource-start')?.value || '';
  const endDate = document.getElementById('outsource-end')?.value || '';
  const quoteNo = document.getElementById('outsource-quote-no')?.value || '';
  const contractAmount = parseBudgetAmount(document.getElementById('outsource-contract-amount')?.value || 0);
  const quoteYn = document.querySelector('input[name="outsource-quote-yn"]:checked')?.value || outsourceQuoteRequired;
  outsourceQuoteRequired = quoteYn === 'N' ? 'N' : 'Y';

  if (!vendor || !title || !startDate || !endDate || !contractAmount) {
    showToast('업체, 계약명, 기간, 계약금액을 입력해주세요.');
    return;
  }
  if (outsourceQuoteRequired === 'Y' && !quoteNo) {
    showToast('견적 있음(Y)인 경우 구매시스템 견적번호를 조회해 선택해주세요.');
    return;
  }
  if (!monthRangeByDate(startDate, endDate).length) {
    showToast('계약 시작일과 종료일을 올바르게 입력해주세요.');
    return;
  }

  const target = editing || {
    id:`os-${Date.now()}`,
    poNo:'',
    status:'계약작성중',
  };

  Object.assign(target, {
    vendorId: vendor.id,
    vendorName: vendor.name,
    title,
    startDate,
    endDate,
    quoteNo,
    contractAmount,
    inspectionPlan: quoteNo && outsourceQuoteBreakdownData[quoteNo]
      ? getOutsourceInspectionRows(quoteNo, startDate, endDate)
      : [],
  });

  if (!editing) rows.unshift(target);
  selectedOutsourceContractId = target.id;
  editingOutsourceContractId = target.id;
  outsourceRegistrationMode = 'edit';
  syncOutsourceContractsToBudget(currentBudgetProj);
  showToast('외주 계약 기본정보가 저장되었습니다.');
  renderBudgetPage();
}

function completeOutsourceContract(id) {
  const row = getOutsourceRows().find(r => r.id === id);
  if (!row) return;
  if (!row.poNo) {
    row.poNo = `4500${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  }
  row.status = '계약완료';
  syncOutsourceContractsToBudget(currentBudgetProj);
  showToast(`계약완료 처리되었습니다. PO번호 ${row.poNo}가 매핑되었습니다.`);
  renderBudgetPage();
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      if (inspectionPlan.length) {
        inspectionPlan.forEach(plan => {
          const planMonths = monthRangeByDate(`${plan.planStart}-01`, `${plan.planEnd}-01`);
          if (!planMonths.includes(mo.m)) return;
          const monthlyAmount = Math.round(plan.planAmount / planMonths.length);
          amount += monthlyAmount;
          nextDetails.push({
            type:'투입확정',
            vendor:row.vendorName,
            grade:plan.grade,
            amount:monthlyAmount,
            po:row.poNo,
            source:'outsourceContract',
          });
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function renderOutsourceContractPanelLegacyInline(data) {
  const rows = getOutsourceRows();
  const formOpen = outsourceRegistrationMode === 'new' || outsourceRegistrationMode === 'edit';
  const editing = editingOutsourceContractId ? rows.find(r => r.id === editingOutsourceContractId) : null;
  const vendor = editing ? outsourceVendorPool.find(v => v.id === editing.vendorId) : getSelectedOutsourceVendor();
  const query = outsourceSearchQuery.trim().toLowerCase();
  const vendors = outsourceVendorPool.filter(v => !query || `${v.name} ${v.specialty} ${v.owner}`.toLowerCase().includes(query));
  const quotes = purchaseQuoteData[vendor?.id] || [];
  const quoteYn = editing && !editing.quoteNo ? 'N' : outsourceQuoteRequired;
  const quoteSearchDisabled = quoteYn === 'N';

  const contractRows = rows.map(row => `
    <div class="os-reg-row ${selectedOutsourceContractId === row.id ? 'active' : ''}">
      <div class="os-reg-main"><strong>${row.vendorName}</strong><span>${row.title}</span></div>
      <div>${row.startDate} ~ ${row.endDate}</div>
      <div class="os-reg-num">${fmt(row.contractAmount)}원</div>
      <div>${row.quoteNo || '-'}</div>
      <div><b class="os-po">${row.poNo || 'PO 미매핑'}</b></div>
      <div><i class="labor-status ${row.status === '계약완료' ? 'done' : 'saved'}">${row.status}</i></div>
      <div class="labor-reg-actions">
        <button onclick="editOutsourceContract('${row.id}')">수정</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">업체별 계약 및 PO 매핑 현황</div>
        </div>
        <div class="labor-actions compact">
          <button class="labor-main-btn" onclick="openNewOutsourceContract()">신규 외주 계약 등록</button>
        </div>
      </div>

      <div class="os-registered-card">
        <div class="os-reg-header">
          <span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span><span></span>
        </div>
        <div class="os-reg-list">${contractRows || '<div class="labor-empty">등록된 외주 계약이 없습니다.</div>'}</div>
      </div>

      ${formOpen ? `
        <div class="labor-edit-flow-card">
          <div class="labor-flow-title">
            <strong>${outsourceRegistrationMode === 'new' ? '신규 외주 계약 등록' : '외주 계약 수정'}</strong>
            <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
          </div>
          <div class="labor-flow">
            <span>업체검색</span><span>계약정보 입력</span><span>견적 참고</span><span>계약완료</span><span>PO 매핑</span>
          </div>

          <div class="os-edit-grid">
            <div class="labor-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">1. 업체 선택</div>
                  <p>구매/SCM 기준 등록 업체를 검색해 선택합니다.</p>
                </div>
              </div>
              <div class="os-lookup-field">
                <div>
                  <strong>${vendor ? vendor.name : '업체를 선택해주세요'}</strong>
                  <span>${vendor ? `${vendor.specialty} · 담당 ${vendor.owner} · 등급 ${vendor.grade}` : '구매시스템 등록 BP만 선택할 수 있습니다.'}</span>
                </div>
                <button type="button" onclick="toggleOutsourceVendorLookup()" title="구매시스템 BP 검색">⌕</button>
              </div>
              ${outsourceVendorLookupOpen ? `
                <input class="labor-search-input" value="${outsourceSearchQuery}" placeholder="구매시스템 BP 검색"
                  oninput="updateOutsourceSearch(this.value)">
                <div class="labor-candidates">
                  ${vendors.map(v => `
                    <button class="labor-candidate ${vendor && vendor.id === v.id ? 'active' : ''}" onclick="selectOutsourceVendor('${v.id}')">
                      <strong>${v.name}</strong>
                      <span>${v.specialty} · 담당 ${v.owner}</span>
                      <em>평가등급 ${v.grade}</em>
                    </button>
                  `).join('') || '<div class="labor-empty">구매시스템에 등록된 BP가 없습니다.</div>'}
                </div>` : ''}
            </div>

            <div class="labor-card">
              <div class="labor-card-title">2. 계약 기본정보</div>
              <div class="labor-form">
                <label><span>계약 시작일</span><input id="outsource-start" type="date" value="${editing ? editing.startDate : '2026-07-01'}"></label>
                <label><span>계약 종료일</span><input id="outsource-end" type="date" value="${editing ? editing.endDate : '2026-12-31'}"></label>
                <label><span>계약명</span><input id="outsource-contract-title" value="${editing ? editing.title : (quoteYn === 'Y' ? (quotes[0]?.title || '') : '')}"></label>
                <label><span>계약금액</span><input id="outsource-contract-amount" inputmode="numeric" value="${editing ? editing.contractAmount : (quoteYn === 'Y' ? (quotes[0]?.amount || '') : '')}"></label>
                <label class="os-quote-yn"><span>견적 여부</span>
                  <div class="os-radio-row">
                    <label><input type="radio" name="outsource-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('Y')"> Y</label>
                    <label><input type="radio" name="outsource-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('N')"> N</label>
                  </div>
                </label>
                <label><span>견적번호</span>
                  <div class="os-lookup-input">
                    <input id="outsource-quote-no" value="${editing ? editing.quoteNo : (quoteYn === 'Y' ? (quotes[0]?.quoteNo || '') : '')}" ${quoteYn === 'Y' ? 'readonly' : ''} placeholder="${quoteYn === 'Y' ? '돋보기로 견적 선택' : '견적 없음'}">
                    <button type="button" ${quoteSearchDisabled ? 'disabled' : ''} onclick="toggleOutsourceQuoteLookup()" title="구매시스템 견적 검색">⌕</button>
                  </div>
                </label>
              </div>
              <div class="labor-mm-guide">
                <strong>계약금액이 등록 외주비 금액입니다.</strong>
                <span>계약완료 시 4500으로 시작하는 10자리 PO번호가 매핑됩니다.</span>
              </div>
              <div class="labor-actions">
                <button class="labor-main-btn" onclick="saveOutsourceContractDraft()">계약 기본정보 저장</button>
                ${editing ? `<button class="labor-main-btn teal" onclick="completeOutsourceContract('${editing.id}')">계약완료 / PO 매핑</button>` : ''}
              </div>
            </div>

            <div class="labor-card os-quote-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">3. 구매시스템 견적 참고</div>
                  <p>최종 수취된 견적 데이터를 참고해 계약금액에 반영합니다.</p>
                </div>
                <button class="labor-sync-btn" onclick="refreshPurchaseQuotes()">견적 불러오기</button>
              </div>
              <div class="labor-sync-note">${quoteYn === 'N' ? '견적 없음(N) 단계에서는 계약 정보를 직접 입력합니다.' : (purchaseQuoteLastSyncedAt ? `최근 조회 ${purchaseQuoteLastSyncedAt}` : '돋보기 또는 견적 불러오기로 구매시스템 견적을 선택합니다.')}</div>
              ${quoteYn === 'Y' && outsourceQuoteLookupOpen ? `
                <div class="os-quote-list">
                  ${quotes.map(q => `
                    <button class="os-quote-item" onclick="applyPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
                      <strong>${q.quoteNo}</strong>
                      <span>${q.title}</span>
                      <b>${fmt(q.amount)}원</b>
                      <em>수취 ${q.receivedAt}</em>
                    </button>
                  `).join('') || '<div class="labor-empty">구매시스템에 수취된 견적이 없습니다.</div>'}
                </div>` : ''}
            </div>
          </div>
        </div>` : ''}
    </div>`;
}

function renderMaterialKindTabs() {
  const tabs = [
    { id:'item', label:'재료비', desc:'견적/품목/납기' },
    { id:'other', label:'기타재료비', desc:'이관/임시/기타' },
  ];
  return `
    <div class="os-kind-tabs material">
      ${tabs.map(tab => `
        <button class="${materialKind === tab.id ? 'active' : ''}" onclick="switchMaterialKind('${tab.id}')">
          <strong>${tab.label}</strong>
          <span>${tab.desc}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel material-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">재료비 등록 / 수정</div>
          <div class="labor-title">${title}</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderMaterialKindTabs()}
      ${bodyHtml}
    </div>`;
}

function switchMaterialQuoteSelectedYn(value) {
  materialQuoteSelectedYn = value === 'N' ? 'N' : 'Y';
  if (materialQuoteSelectedYn === 'N') {
    materialQuoteNo = '';
    materialQuoteAmount = 0;
    materialQuoteTitle = '';
  }
  renderBudgetPage();
}

function applyMaterialPurchaseQuote(quoteNo, amount, title) {
  const quote = purchaseMaterialQuoteData.find(q => q.quoteNo === quoteNo) || {};
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = quoteNo;
  materialQuoteAmount = amount;
  materialQuoteTitle = title;
  const quoteEl = document.getElementById('material-quote-no');
  const amountEl = document.getElementById('material-amount');
  const detailEl = document.getElementById('material-product-detail');
  const itemNoEl = document.getElementById('material-item-no');
  const itemCodeEl = document.getElementById('material-item-code');
  const categoryEl = document.getElementById('material-category-name');
  const standardEl = document.getElementById('material-standard-name');
  const manufacturerEl = document.getElementById('material-manufacturer');
  const modelEl = document.getElementById('material-model');
  if (quoteEl) quoteEl.value = quoteNo;
  if (amountEl) amountEl.value = amount;
  if (detailEl) detailEl.value = title;
  if (itemNoEl) itemNoEl.value = quote.itemNo || '';
  if (itemCodeEl) itemCodeEl.value = quote.itemCode || '';
  if (categoryEl) categoryEl.value = quote.categoryName || '';
  if (standardEl) standardEl.value = quote.standardName || title || '';
  if (manufacturerEl) manufacturerEl.value = quote.manufacturer || '';
  if (modelEl) modelEl.value = quote.modelName || '';
  showToast('재료비 견적 데이터가 입력값에 반영되었습니다.');
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 재료비는 수정할 수 없습니다.');
    return;
  }

  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn:document.querySelector('input[name="material-quote-yn"]:checked')?.value || materialQuoteSelectedYn,
    itemNo:document.getElementById('material-item-no')?.value || '',
    itemCode:document.getElementById('material-item-code')?.value || '',
    categoryName:document.getElementById('material-category-name')?.value || '',
    standardName:document.getElementById('material-standard-name')?.value || '',
    manufacturer:document.getElementById('material-manufacturer')?.value || '',
    large:document.getElementById('material-large')?.value || '',
    middle:document.getElementById('material-middle')?.value || '',
    small:document.getElementById('material-small')?.value || '',
    model:document.getElementById('material-model')?.value || '',
    productDetail:document.getElementById('material-product-detail')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('material-qty')?.value || 0),
    unit:document.getElementById('material-unit')?.value || '',
    revenueBasis:document.getElementById('material-revenue-basis')?.value || '',
    deliveryStart:document.getElementById('material-start')?.value || '',
    deliveryEnd:document.getElementById('material-end')?.value || '',
    quoteNo:document.getElementById('material-quote-no')?.value || '',
    poNo:document.getElementById('material-po-no')?.value || '',
    amount:parseBudgetAmount(document.getElementById('material-amount')?.value || 0),
    status:'계획',
  };

  if (item.quoteSelectedYn === 'Y' && !item.quoteNo) {
    showToast('견적선정유무가 Y이면 구매시스템 견적 데이터를 선택해 주세요.');
    return;
  }

  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model || !item.quantity || !item.amount) {
    showToast('물품정보 필수값과 견적 금액을 입력해 주세요.');
    return;
  }

  if (editing) {
    Object.assign(editing, item);
    showToast('재료비 계획이 수정되었습니다.');
  } else {
    rows.unshift(item);
    showToast('재료비 계획이 등록되었습니다.');
  }
  editingMaterialItemId = null;
  renderBudgetPage();
}

function editOtherMaterialExpense(id) {
  const row = getOtherMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 기타재료비는 수정할 수 없습니다.');
    return;
  }
  editingOtherMaterialId = id;
  renderBudgetPage();
}

function cancelOtherMaterialEdit() {
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function saveOtherMaterialExpense() {
  const expectedMonth = document.getElementById('other-material-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-material-amount')?.value || 0);
  const description = document.getElementById('other-material-desc')?.value || '';
  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 기타재료비는 수정할 수 없습니다.');
    return;
  }
  if (editing) {
    Object.assign(editing, { expectedMonth, amount, description, status:'계획' });
    showToast('기타재료비 계획이 수정되었습니다.');
  } else {
    rows.unshift({ id:`om-${Date.now()}`, expectedMonth, amount, description, status:'계획' });
    showToast('기타재료비 계획이 등록되었습니다.');
  }
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const source = editing || {
    large:'솔루션',
    middle:'라이선스',
    small:'개발도구',
    model:'DEV-CLOUD-PRO',
    productDetail:materialQuoteTitle,
    quantity:1,
    unit:'식',
    revenueBasis:'월',
    deliveryStart:'2026-08-01',
    deliveryEnd:'2027-07-31',
    quoteNo:materialQuoteNo,
    amount:materialQuoteAmount,
  };
  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>상품재료비 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>상품재료비 계획 금액</span></div>
      <p>외주비 MA와 동일한 방식으로 견적 데이터를 불러오고, 분류/상품/손익인식 기준/납기 정보를 확정합니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 구매 견적 불러오기</div>
            <p>구매시스템에 수취된 재료비 견적을 선택해 기본 정보를 채웁니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="showToast('재료비 견적 데이터를 새로 조회했습니다.')">견적 새로고침</button>
        </div>
        <div class="os-quote-list compact">
          ${purchaseMaterialQuoteData.map(q => `
            <button class="os-quote-item" onclick="applyMaterialPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
              <strong>${q.quoteNo}</strong>
              <span>${q.title}</span>
              <b>${fmt(q.amount)}원</b>
              <em>수취 ${q.receivedAt}</em>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '상품재료비 수정' : '상품재료비 등록'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-ma-form">
          <label><span>대분류 *</span><input id="material-large" value="${source.large}"></label>
          <label><span>중분류 *</span><input id="material-middle" value="${source.middle}"></label>
          <label><span>소분류 *</span><input id="material-small" value="${source.small}"></label>
          <label><span>모델명</span><input id="material-model" value="${source.model || ''}"></label>
          <label class="wide"><span>제품상세</span><input id="material-product-detail" value="${source.productDetail || ''}"></label>
          <label><span>수량 *</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}"></label>
          <label><span>단위</span><input id="material-unit" value="${source.unit || '식'}"></label>
          <label><span>손익인식기준 *</span>
            <select id="material-revenue-basis">
              ${['월','분기','반기','연'].map(v => `<option ${source.revenueBasis === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
          <label><span>시작일 *</span><input id="material-start" type="date" value="${source.deliveryStart}"></label>
          <label><span>종료일 *</span><input id="material-end" type="date" value="${source.deliveryEnd}"></label>
          <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" readonly></label>
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '상품재료비 등록'}</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head with-action">
          <span>대분류</span><span>중분류</span><span>소분류</span><span>모델명</span><span>제품상세</span><span>수량</span><span>단위</span><span>손익인식기준</span><span>시작일</span><span>종료일</span><span>견적/금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action ${editingMaterialItemId === row.id ? 'active' : ''}">
            <span>${row.large}</span><span>${row.middle}</span><span>${row.small}</span><span>${row.model || '-'}</span><span>${row.productDetail || '-'}</span><span>${row.quantity}</span><span>${row.unit || '-'}</span><span>${row.revenueBasis}</span><span>${row.deliveryStart}</span><span>${row.deliveryEnd}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const defaultQuote = purchaseMaterialQuoteData.find(q => q.quoteNo === materialQuoteNo) || purchaseMaterialQuoteData[0] || {};
  const source = editing || {
    quoteSelectedYn: materialQuoteSelectedYn,
    itemNo: defaultQuote.itemNo || '10',
    itemCode: defaultQuote.itemCode || 'SW00014',
    categoryName: defaultQuote.categoryName || '소프트웨어-경영/인사',
    standardName: defaultQuote.standardName || 'HRMS(인사관리)',
    manufacturer: defaultQuote.manufacturer || '휴먼컨설팅그룹',
    model: defaultQuote.modelName || 'hunel',
    productDetail: defaultQuote.standardName || materialQuoteTitle,
    quantity: 1,
    unit: '식',
    revenueBasis: '월',
    deliveryStart: '2026-08-01',
    deliveryEnd: '2027-07-31',
    quoteNo: materialQuoteNo || defaultQuote.quoteNo || '',
    poNo: '',
    amount: materialQuoteAmount || defaultQuote.amount || 0,
  };
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : materialQuoteSelectedYn;

  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>상품재료비 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>상품재료비 계획 금액</span></div>
      <p>견적선정유무를 먼저 선택하고, Y인 경우 구매시스템 물품정보를 불러와 재료비 예산을 등록합니다. PO번호는 추후 구매 계약 확정 시 매핑됩니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 견적선정유무 선택</div>
            <p>Y를 선택하면 구매시스템에 수취된 물품정보를 조회해 입력값에 자동 세팅합니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="showToast('구매시스템 재료비 견적 데이터를 새로 조회했습니다.')">견적 새로고침</button>
        </div>
        <div class="os-quote-decision-card ma-new-quote-panel">
          <div class="os-quote-choice-row">
            <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 구매시스템 견적 사용</span></label>
            <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
          </div>
          ${quoteYn === 'Y' ? `
            <div class="os-quote-list compact ma-quote-choice">
              ${purchaseMaterialQuoteData.map(q => `
                <button class="os-quote-item ${source.quoteNo === q.quoteNo ? 'active' : ''}" onclick="applyMaterialPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
                  <strong>${q.quoteNo}</strong>
                  <span>${q.itemNo} · ${q.itemCode} · ${q.categoryName}</span>
                  <b>${q.standardName}</b>
                  <em>${q.manufacturer} / ${q.modelName} · ${fmt(q.amount)}원</em>
                </button>
              `).join('')}
            </div>` : `
            <div class="bpo-rule-note">
              <strong>직접 입력</strong>
              <span>견적이 아직 확정되지 않은 단계입니다. 물품정보와 금액을 직접 입력하고 PO번호는 추후 매핑합니다.</span>
            </div>`}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '상품재료비 수정' : '상품재료비 등록'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-ma-form">
          <label><span>항번</span><input id="material-item-no" value="${source.itemNo || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>품목코드 *</span><input id="material-item-code" value="${source.itemCode || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>분류명 *</span><input id="material-category-name" value="${source.categoryName || source.large || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>표준품명 *</span><input id="material-standard-name" value="${source.standardName || source.productDetail || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>제조사 *</span><input id="material-manufacturer" value="${source.manufacturer || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>모델명 *</span><input id="material-model" value="${source.model || source.modelName || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <input type="hidden" id="material-large" value="${source.large || source.categoryName || ''}">
          <input type="hidden" id="material-middle" value="${source.middle || ''}">
          <input type="hidden" id="material-small" value="${source.small || source.standardName || ''}">
          <input type="hidden" id="material-product-detail" value="${source.productDetail || source.standardName || ''}">
          <label><span>수량 *</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}"></label>
          <label><span>단위</span><input id="material-unit" value="${source.unit || '식'}"></label>
          <label><span>손익인식기준</span>
            <select id="material-revenue-basis">
              ${['월','분기','반기','연'].map(v => `<option ${source.revenueBasis === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
          <label><span>예산 시작일</span><input id="material-start" type="date" value="${source.deliveryStart || ''}"></label>
          <label><span>예산 종료일</span><input id="material-end" type="date" value="${source.deliveryEnd || ''}"></label>
          <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || ''}" placeholder="추후 PO 매핑"></label>
          <label><span>견적/예산금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '상품재료비 등록'}</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head with-action material-item-head">
          <span>견적</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>수량</span><span>PO번호</span><span>견적/금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}">
            <span>${row.quoteSelectedYn || (row.quoteNo ? 'Y' : 'N')}</span><span>${row.itemNo || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.categoryName || row.large || '-'}</span><span>${row.standardName || row.productDetail || '-'}</span><span>${row.manufacturer || '-'}</span><span>${row.model || '-'}</span><span>${row.quantity}</span><span>${row.poNo || '-'}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function renderOtherMaterialPanel() {
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>기타재료비 계획</span></div>
      <p>이관, 임시 라이선스, 검수용 소모품처럼 품목 견적과 별도로 잡아야 하는 재료비 계획입니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '기타재료비 계획 수정' : '기타재료비 계획 입력'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelOtherMaterialEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-material-month" type="month" value="${editing ? editing.expectedMonth : '2026-10'}"></label>
          <label><span>금액</span><input id="other-material-amount" inputmode="numeric" value="${editing ? editing.amount : ''}" placeholder="예: 6500000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-material-desc" rows="4" placeholder="예: 타 프로젝트에서 이관, 검수용 임시 라이선스, 소모품 구매">${editing ? editing.description : ''}</textarea></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherMaterialExpense()">${editing ? '수정 저장' : '기타재료비 저장'}</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header with-action"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span><span></span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row with-action ${editingOtherMaterialId === row.id ? 'active' : ''}">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status ${row.actualized ? 'done' : 'saved'}">${row.status}</i>
              <div class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editOtherMaterialExpense('${row.id}')">수정</button>`}</div>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타재료비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('재료비 품목 등록', 'MA와 동일한 견적/품목/납기 방식으로 관리합니다.', renderMaterialItemPanel());
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">업체별 계약금액과 PO 매핑 상태를 관리합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function saveLaborAssignmentDraft() {
  const rows = getLaborRows();
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const person = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  if (!person) return;

  const startEl = document.getElementById('labor-start');
  const endEl = document.getElementById('labor-end');
  const typeEl = document.getElementById('labor-work-type');
  const startDate = startEl ? startEl.value : '';
  const endDate = endEl ? endEl.value : '';
  const workType = typeEl ? typeEl.value : 'Full';
  const months = monthRangeByDate(startDate, endDate);

  if (!startDate || !endDate || !months.length) {
    showToast('투입 시작일과 종료일을 올바르게 입력해주세요.');
    return;
  }

  const monthly = {};
  months.forEach(m => {
    monthly[m] = editing && editing.monthly && typeof editing.monthly[m] === 'number'
      ? editing.monthly[m]
      : 0;
  });

  const personView = getLaborPersonView(person);
  const target = editing || {
    id: `lb-${Date.now()}`,
    personId: person.id,
    requestedAt: '',
    approvedAt: '',
    scmDocNo: '',
  };

  Object.assign(target, {
    name: personView.name,
    org: personView.org,
    role: personView.role,
    pLevel: person.pLevel,
    unitPrice: person.unitPrice,
    startDate,
    endDate,
    workType,
    monthly,
    totalMm: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0),
    amount: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0) * person.unitPrice,
    status: 'MM 입력중',
  });

  if (!editing) rows.unshift(target);
  selectedLaborAssignmentId = target.id;
  editingLaborAssignmentId = target.id;
  laborRegistrationMode = 'edit';
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('투입 기본정보가 저장되었습니다. 월별 MM을 입력해주세요.');
  renderBudgetPage();
}

function renderLaborAssignmentPanel(data) {
  const rows = getLaborRows();
  const formOpen = laborRegistrationMode === 'new' || laborRegistrationMode === 'edit';
  const selectedRaw = formOpen ? getSelectedLaborAssignment() : null;
  const selected = getLaborRowView(selectedRaw);
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const personRaw = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  const person = getLaborPersonView(personRaw);
  const query = laborSearchQuery.trim().toLowerCase();
  const candidates = laborCandidatePool
    .map(getLaborPersonView)
    .filter(p => !query || `${p.name} ${p.org} ${p.role} ${p.pLevel}`.toLowerCase().includes(query));
  const defaultStart = editing ? editing.startDate : '2026-07-01';
  const defaultEnd = editing ? editing.endDate : '2026-12-31';
  const defaultType = editing ? editing.workType : 'Full';
  const draftMonths = monthRangeByDate(defaultStart, defaultEnd).length;

  const registeredRows = rows.map(row => {
    const view = getLaborRowView(row);
    const isActive = selectedLaborAssignmentId === view.id;
    return `
      <div class="labor-reg-row ${isActive ? 'active' : ''}" onclick="selectLaborAssignment('${view.id}')">
        <div class="labor-reg-person">
          <strong>${view.name}</strong>
          <span>${view.org}</span>
        </div>
        <div>${view.role}</div>
        <div>${view.pLevel}</div>
        <div>${view.startDate} ~ ${view.endDate}</div>
        <div class="labor-reg-num">${view.totalMm || 0}MM</div>
        <div class="labor-reg-num">${fmt(view.amount || 0)}원</div>
        <div><i class="labor-status ${laborStatusClass(view.status)}">${getLaborStatusLabel(view.status)}</i></div>
        <div class="labor-reg-actions">
          <button onclick="event.stopPropagation();editLaborAssignment('${view.id}')">수정</button>
        </div>
      </div>`;
  }).join('');

  const monthInputs = selectedRaw
    ? Object.keys(selectedRaw.monthly || {}).map(month => `
      <label class="labor-mm-cell">
        <span>${month}</span>
        <input id="labor-mm-${selectedRaw.id}-${month}" type="number" min="0" max="1" step="0.1" value="${selectedRaw.monthly[month]}">
      </label>
    `).join('')
    : '';

  const selectedStatusClass = selectedRaw ? laborStatusClass(selectedRaw.status) : '';
  const canRequest = selectedRaw && selectedStatusClass === 'saved';
  const canApprove = selectedRaw && selectedStatusClass === 'wait';

  return `
    <div class="labor-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">등록 인력 현황</div>
        </div>
        <div class="labor-actions compact">
          <button class="labor-sub-btn labor-process-guide-btn" onclick="showLaborProcessGuide()">프로세스 안내</button>
          <button class="labor-main-btn" onclick="openNewLaborRegistration()">신규 인력 등록</button>
        </div>
      </div>

      <div class="labor-registered-card top">
        <div class="labor-reg-header">
          <span>인력</span><span>역할</span><span>P레벨</span><span>투입기간</span><span>총 MM</span><span>금액</span><span>상태</span><span></span>
        </div>
        <div class="labor-reg-list">${registeredRows || '<div class="labor-empty">등록된 인력이 없습니다.</div>'}</div>
      </div>

      ${formOpen ? `
        <div class="labor-edit-flow-card">
          <div class="labor-flow-title">
            <strong>${laborRegistrationMode === 'new' ? '신규 인력 등록' : '등록 인력 수정'}</strong>
            <button class="labor-sub-btn" onclick="cancelLaborEdit()">닫기</button>
          </div>
          <div class="labor-flow">
            <span>SCM 조회</span><span>인력선택</span><span>기본정보 저장</span><span>월별 MM</span><span>승인요청</span><span>승인완료</span>
          </div>

          ${renderLaborScmIfPanel(selectedRaw, selected, person)}

          <div class="labor-top-grid">
            <div class="labor-card labor-search-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">1. 인력 선택</div>
                  <p>SCM 기준 인력 리스트에서 투입 대상을 선택합니다.</p>
                </div>
                <button class="labor-sync-btn" onclick="refreshLaborCandidatesFromScm()">SCM 실시간 조회</button>
              </div>
              <input class="labor-search-input" value="${laborSearchQuery}" placeholder="이름, 조직, 역할, P레벨 검색"
                oninput="updateLaborSearch(this.value)">
              <div class="labor-sync-note">${laborScmLastSyncedAt ? `최근 조회 ${laborScmLastSyncedAt}` : 'SCM 조회 버튼으로 최신 인력 리스트를 불러올 수 있습니다.'}</div>
              <div class="labor-candidates">
                ${candidates.map(p => `
                  <button class="labor-candidate ${person && person.id === p.id ? 'active' : ''}" onclick="selectLaborCandidate('${p.id}')">
                    <strong>${p.name}</strong>
                    <span>${p.org} · ${p.role}</span>
                    <em>${p.pLevel} / ${fmt(p.unitPrice)}원</em>
                  </button>
                `).join('') || '<div class="labor-empty">검색된 인력이 없습니다.</div>'}
              </div>
            </div>

            <div class="labor-card">
              <div class="labor-card-title">2. 투입 기본정보</div>
              <div class="labor-form">
                <label><span>투입 시작일</span><input id="labor-start" type="date" value="${defaultStart}"></label>
                <label><span>투입 종료일</span><input id="labor-end" type="date" value="${defaultEnd}"></label>
                <label><span>투입유형</span>
                  <select id="labor-work-type">
                    <option value="Full" ${defaultType === 'Full' ? 'selected' : ''}>Full</option>
                    <option value="Part" ${defaultType === 'Part' ? 'selected' : ''}>Part</option>
                  </select>
                </label>
              </div>
              <div class="labor-summary labor-summary-basic">
                <div><span>P레벨</span><strong>${person ? person.pLevel : '-'}</strong></div>
                <div><span>단가</span><strong>${person ? fmt(person.unitPrice) : '-'}원</strong></div>
                <div><span>월 범위</span><strong>${draftMonths}개월</strong></div>
              </div>
              <div class="labor-mm-guide">
                <strong>총 MM / 금액은 4번 월별 MM 입력 후 자동 합산됩니다.</strong>
                <span>기본정보 저장 단계에서는 기간과 투입유형만 확정합니다.</span>
              </div>
              <div class="labor-actions">
                <button class="labor-main-btn" onclick="saveLaborAssignmentDraft()">${editing ? '기본정보 수정 저장' : '투입 기본정보 저장'}</button>
              </div>
            </div>
          </div>

          ${selectedRaw ? `
            <div class="labor-month-card">
              <div class="labor-month-head">
                <div>
                  <div class="labor-card-title">4. 월별 MM 입력 및 승인</div>
                  <div class="labor-selected">${selected.name} · ${selected.startDate} ~ ${selected.endDate} · ${selected.workType}</div>
                </div>
                <div class="labor-selected-total">
                  <small>월별 MM 합계</small>
                  <span>${selected.totalMm || 0}MM</span>
                  <strong>${fmt(selected.amount || 0)}원</strong>
                  <i class="labor-status ${selectedStatusClass}">${getLaborStatusLabel(selected.status)}</i>
                </div>
              </div>
              <div class="labor-mm-grid">${monthInputs}</div>
              <div class="labor-approval-line">
                <span class="${selectedStatusClass !== 'draft' ? 'on' : ''}">MM 저장</span>
                <span class="${['wait','done'].includes(selectedStatusClass) ? 'on' : ''}">SCM 전송</span>
                <span class="${selectedStatusClass === 'done' ? 'on' : ''}">승인완료</span>
                <em>${selected.scmDocNo || 'SCM 문서번호 미생성'}</em>
              </div>
              <div class="labor-actions right">
                <button class="labor-sub-btn" onclick="saveLaborMonthlyMm('${selected.id}')">월별 MM 저장</button>
                <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestLaborApproval('${selected.id}')">승인요청</button>
                <button class="labor-main-btn teal" ${canApprove ? '' : 'disabled'} onclick="completeLaborScmApproval('${selected.id}')">SCM 승인완료 반영</button>
              </div>
            </div>` : ''}
        </div>` : ''}
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '외주비 MA처럼 견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">실투입 외주비, 기타외주비, MA를 먼저 구분한 뒤 등록합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">상품재료비와 기타재료비를 구분해 계획을 등록합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderCategoryChoiceBoard(kind, tabs) {
  const label = kind === 'material' ? '재료비 상세 계정' : '외주비 상세 계정';
  return `
    <div class="cost-category-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>${label}을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong ${kind === 'material' ? 'material' : ''}">
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

function renderOutsourceKindTabs() {
  return renderCategoryChoiceBoard('outsource', [
    { step:'01', label:'실투입 외주비', desc:'업체/계약/PO', active:outsourceKind === 'direct', action:"switchOutsourceKind('direct')" },
    { step:'02', label:'기타외주비', desc:'출장비/이관/기타', active:outsourceKind === 'other', action:"switchOutsourceKind('other')" },
    { step:'03', label:'MA', desc:'견적/납기/손익', active:outsourceKind === 'ma', action:"switchOutsourceKind('ma')" },
  ]);
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${title}</div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적등록/납기', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'기타재료비', desc:'이관/임시/기타', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ]);
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel material-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">재료비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderMaterialKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${title}</div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '외주비 MA처럼 견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

const renderOutsourceContractPanelWithSelector = renderOutsourceContractPanel;
renderOutsourceContractPanel = function(data) {
  const html = renderOutsourceContractPanelWithSelector(data);
  if (outsourceKind !== 'direct') return html;
  return html.replace(
    '<div class="os-registered-card">',
    '<div class="cost-selected-detail"><div class="cost-selected-title">실투입 외주비 계획 등록</div></div><div class="os-registered-card">'
  );
};

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺' || r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      if (inspectionPlan.length) {
        inspectionPlan.filter(plan => plan.month === mo.m).forEach(plan => {
          amount += plan.planAmount;
          nextDetails.push({
            type:'투입확정',
            vendor:row.vendorName,
            grade:plan.grade,
            amount:plan.planAmount,
            po:row.poNo,
            source:'outsourceContract',
          });
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function getOutsourceInspectionMonthSummary(planRows) {
  const grouped = {};
  planRows.forEach(row => {
    if (!row.month) return;
    if (!grouped[row.month]) {
      grouped[row.month] = { month: row.month, planMm: 0, planAmount: 0, count: 0 };
    }
    grouped[row.month].planMm += Number(row.planMm || 0);
    grouped[row.month].planAmount += Number(row.planAmount || 0);
    grouped[row.month].count += 1;
  });
  return Object.values(grouped)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => ({
      ...row,
      planMm: Math.round(row.planMm * 100) / 100,
    }));
}

function getOutsourceInspectionDetailRows(quoteNo, month, startDate, endDate) {
  const selected = getOutsourceRows().find(row => row.id === selectedOutsourceContractId);
  const savedRows = selected && selected.quoteNo === quoteNo && selected.inspectionPlan && selected.inspectionPlan.length
    ? selected.inspectionPlan
    : null;
  const rows = savedRows || getOutsourceInspectionRows(quoteNo, startDate, endDate);
  return rows.filter(row => row.month === month);
}

function showOutsourceInspectionMonthDetail(quoteNo, month, startDate, endDate) {
  const rows = getOutsourceInspectionDetailRows(quoteNo, month, startDate, endDate);
  const total = rows.reduce((sum, row) => sum + Number(row.planAmount || 0), 0);
  let modal = document.getElementById('outsource-inspection-month-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-month-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal os-inspection-detail-modal">
      <div class="actual-detail-head">
        <strong>${month} 검수계획 상세</strong>
        <button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-body">
        <div class="os-inspection-title">기술등급별 월별 검수금액 <em>합계 ${fmt(total)}원</em></div>
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수금액</span><span>상태</span></div>
          ${rows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${Number(row.planMm || 0).toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
            </div>
          `).join('') || '<div class="os-inspection-empty">상세 내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span>${fmt(total)}원</span><span></span></div>
        </div>
      </div>
      <div class="actual-detail-actions">
        <button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function renderOutsourceQuoteBreakdownPanel(quoteNo, startDate, endDate, generated, savedRows) {
  if (!quoteNo) {
    return `
      <div class="os-inspection-card muted">
        <div class="os-inspection-head">
          <div><strong>4. 견적 산출내역 / 검수계획</strong><span>견적번호를 선택하면 기술등급별 산출내역이 표시됩니다.</span></div>
        </div>
      </div>`;
  }
  const quoteRows = outsourceQuoteBreakdownData[quoteNo] || [];
  const planRows = savedRows || (generated ? getOutsourceInspectionRows(quoteNo, startDate, endDate) : []);
  const monthlyRows = getOutsourceInspectionMonthSummary(planRows);
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = monthlyRows.reduce((sum, row) => sum + row.planAmount, 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 실투입(검수)계획</strong>
          <span>최종 검수계획은 검수월 기준 합계 1줄로 관리하고, 월 클릭 시 기술등급별 상세를 확인합니다.</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-sub-btn" onclick="showOutsourceInspectionAdjustGuide()">검수 금액 보정</button>
          <button class="labor-main-btn" onclick="generateOutsourceInspectionPlanPreview()">실투입(검수)계획 생성</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span></div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.mm.toFixed(3)}</span><span>${fmt(row.amount)}원</span>
            </div>
          `).join('') || '<div class="labor-empty">견적 산출내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalQuote)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">생성된 월별 실투입(검수)계획 <em>${generated || savedRows ? '월별 합계 / 구매 전송 예정' : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan monthly-summary">
            <div class="os-inspection-row head"><span>검수월</span><span>월별 검수금액</span><span>상세건수</span><span>상태</span></div>
            ${monthlyRows.map(row => `
              <div class="os-inspection-row">
                <span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${quoteNo}','${row.month}','${startDate}','${endDate}')">${row.month}</button></span>
                <span>${fmt(row.planAmount)}원</span><span>${row.count}건</span><span><b>구매전송 대기</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span>${fmt(totalPlan)}원</span><span></span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 검수월별 합계 계획이 생성됩니다.</div>'}
      </div>
    </div>`;
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺' || r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      const monthlyRows = getOutsourceInspectionMonthSummary(inspectionPlan);
      const monthly = monthlyRows.find(plan => plan.month === mo.m);
      if (monthly) {
        amount += monthly.planAmount;
        nextDetails.push({
          type:'투입확정',
          vendor:row.vendorName,
          amount:monthly.planAmount,
          po:row.poNo,
          source:'outsourceContract',
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function openBudgetAccountEditor(account) {
  budgetSetupEditAccount = account;
  renderBudgetPage();
}

function closeBudgetAccountEditor() {
  budgetSetupEditAccount = null;
  editingLaborAssignmentId = null;
  renderBudgetPage();
}

// ── 계정 요약 타일(신선 디자인) ──
// 계정별 컬러 액센트 + 좌측정렬 금액 + 총액 대비 비중 바. 총액은 다크(잉크) 타일.
const ACCT_TILE_COLOR = { '인건비':'a-blue', '외주비':'a-red', '재료비':'a-yellow', '경비':'a-green', 'A/S비':'a-sky' };
function renderAcctTile({ label, value, total, maxVal, active, onclick, isTotal, rate, rateTip, foot }) {
  if (isTotal) {
    return `
      <button class="acct-tile acct-tile-total ${active ? 'active' : ''}" onclick="${onclick}">
        <div class="acct-tile-top"><span class="acct-tile-name">${label}</span><span class="acct-tile-arrow">→</span></div>
        <strong class="acct-tile-val">${fmt(value)}<em>원</em></strong>
        <div class="acct-tile-foot">${foot || '전체 합계 · 100%'}</div>
      </button>`;
  }
  // rate가 넘어오면 "집행률"(실적 ÷ 수립예산)을 보여주고, 없으면 예전처럼 전체 대비 비중을 씁니다.
  const pct = (rate === undefined || rate === null)
    ? (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)
    : Math.round(rate * 10) / 10;
  const barW = (rate === undefined || rate === null)
    ? (maxVal > 0 ? Math.round((value / maxVal) * 100) : 0)
    : Math.min(pct, 100);
  const cls = ACCT_TILE_COLOR[label] || 'a-blue';
  const tip = rateTip ? ` title="${rateTip}"` : '';
  return `
    <button class="acct-tile ${cls} ${active ? 'active' : ''}" onclick="${onclick}"${tip}>
      <div class="acct-tile-top"><span class="acct-tile-dot"></span><span class="acct-tile-name">${label}</span><span class="acct-tile-share">${pct}%</span></div>
      <strong class="acct-tile-val">${fmt(value)}<em>원</em></strong>
      <div class="acct-tile-bar"><i style="width:${barW}%"></i></div>
    </button>`;
}

function renderBudgetSetupOverview(data, actual, quasi) {
  const accounts = [
    { key:'인건비' },
    { key:'외주비' },
    { key:'재료비' },
    { key:'경비' },
  ];

  const totalBudget = accounts.reduce((sum, { key }) => sum + (data.plan[key] || 0), 0);
  const maxVal = Math.max(...accounts.map(({ key }) => data.plan[key] || 0), 1);
  const rows = accounts.map(({ key }) => renderAcctTile({
    label: key,
    value: data.plan[key] || 0,
    total: totalBudget,
    maxVal,
    active: budgetSetupEditAccount === key,
    onclick: `openBudgetAccountEditor('${key}')`,
  })).join('');
  const expanded = budgetSetupEditAccount
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(data, budgetSetupEditAccount)}</div>`
    : '';

  return `
    <div class="setup-overview compact">
      <div class="setup-version-pill">
        <strong>V1.0 2026-07-21</strong>
        <span>승인완료</span>
      </div>
      <div class="acct-tile-group">
        ${renderAcctTile({ label:'프로젝트 총 실행 비용', value: totalBudget, isTotal:true, active:false, onclick:`showBudgetSummaryGrid()` })}
        ${rows}
      </div>
      ${expanded}
    </div>`;
}

function renderBudgetAccountEditorOldC(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }

  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획 금액만 간단히 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderSimpleAccountPlanEditor(data, account) {
  const rows = data.months
    .map((mo, idx) => ({ mo, idx }))
    .filter(({ mo }) => mo.type === 'plan' && mo[account])
    .map(({ mo, idx }) => {
      const plan = mo[account].p || 0;
      const confirmed = mo[account].q || 0;
      const status = confirmed > 0 ? '투입확정 포함' : '계획';
      return `
        <tr>
          <td>${mo.m}</td>
          <td><input class="setup-plan-input" id="simple-plan-${idx}" value="${plan}" inputmode="numeric"></td>
          <td>${fmt(confirmed)}원</td>
          <td><span class="setup-status ${confirmed > 0 ? 'fixed' : ''}">${status}</span></td>
        </tr>`;
    }).join('');

  return `
    <div class="setup-plan-card">
      <table class="setup-plan-table">
        <thead>
          <tr>
            <th>월</th>
            <th>계획금액</th>
            <th>투입확정</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="setup-plan-actions">
        <button class="labor-main-btn" onclick="saveSimpleAccountPlan('${account}')">${account} 계획 저장</button>
      </div>
    </div>`;
}

function saveSimpleAccountPlan(account) {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  let changed = 0;
  let invalidMessage = '';
  data.months.forEach((mo, idx) => {
    if (mo.type !== 'plan' || !mo[account]) return;
    if (invalidMessage) return;
    const el = document.getElementById(`simple-plan-${idx}`);
    if (!el) return;
    const next = parseBudgetAmount(el.value);
    const confirmed = mo[account].q || 0;
    if (next < confirmed) {
      invalidMessage = `${mo.m} ${account} 계획은 투입확정 ${fmt(confirmed)}원보다 작을 수 없습니다.`;
      return;
    }
    if ((mo[account].p || 0) !== next) {
      mo[account].p = next;
      changed++;
    }
  });
  if (invalidMessage) {
    showToast(invalidMessage);
    return;
  }
  if (!changed) {
    showToast('변경된 계획 금액이 없습니다.');
    return;
  }
  persistBudgetPlanState();
  showToast(`${account} 계획 금액 ${changed}건이 저장되었습니다.`);
  renderBudgetPage();
}

function initBudgetStatus() {
  restoreBudgetTransferState();
  restoreBudgetPlanState();
  restoreBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  document.getElementById('s-budget').innerHTML = `
    <div id="budget-body"></div>
  `;
  // 상세 모달 주입
  const m = document.createElement('div');
  m.className = 'budget-detail-overlay';
  m.id = 'budget-detail-overlay';
  m.onclick = e => { if(e.target===m) closeBudgetDetail(); };
  m.innerHTML = `
    <div class="budget-detail-modal">
      <div class="bdetail-head">
        <div class="bdetail-title" id="bdetail-title"></div>
        <div class="bdetail-right">
          <span class="bdetail-cat-tag" id="bdetail-cat"></span>
          <button class="bdetail-close" onclick="closeBudgetDetail()">닫기</button>
        </div>
      </div>
      <div class="bdetail-body" id="bdetail-body"></div>
    </div>`;
  document.body.appendChild(m);
}

// ════════════════════════════════════════
//  메인 렌더
// ════════════════════════════════════════

function buildBudgetProjectCards() {
  return Object.entries(BUDGET_PROJ_META).map(([k, m]) => {
    const src = Object.values(BUDGET_SOURCE).find(s => s.projName === m.name) ||
                Object.values(BUDGET_SOURCE)[Object.keys(BUDGET_PROJ_META).indexOf(k)];
    const budget  = m.budget;
    const spent   = m.spent;
    const remain  = Math.max(0, budget - spent);
    const rate    = budget > 0 ? Math.round(spent / budget * 100) : 0;
    const barColor = rate >= 90 ? '#dc2626' : rate >= 70 ? '#d97706' : '#1d4ed8';
    return `
      <div class="init-proj-card" onclick="openBudgetProjectScreen('${k}')" style="cursor:pointer">
        <div class="ipc-header">
          <div class="ipc-name">${m.name}</div>
          <span class="ipc-stage" style="${m.stageSt}">${m.stage}</span>
        </div>
        <div style="margin:12px 0 4px;font-size:14px;color:#64748b;display:flex;justify-content:space-between">
          <span>집행률</span><span style="font-weight:700;color:${barColor}">${rate}%</span>
        </div>
        <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:14px">
          <div style="height:100%;width:${rate}%;background:${barColor};border-radius:3px;transition:width .3s"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">총예산</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b">${fmt(budget)}원</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">집행액</div>
            <div style="font-size:15px;font-weight:700;color:#1d4ed8">${fmt(spent)}원</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">투입미정</div>
            <div style="font-size:15px;font-weight:700;color:${remain < budget*0.1 ? '#dc2626' : '#166534'}">${fmt(remain)}원</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;color:#94a3b8">${m.start} ~ ${m.end}</span>
          <span style="font-size:13px;padding:3px 8px;border-radius:20px;${m.riskSt}">${m.riskChip}</span>
        </div>
      </div>`;
  }).join('');
}

function renderBudgetListView() {
  const q = budgetSearchQuery.trim().toLowerCase();
  const customerQ = budgetCustomerQuery.trim().toLowerCase();
  const salesOrgQ = budgetSalesOrgQuery.trim().toLowerCase();
  const pmQ = budgetPmQuery.trim().toLowerCase();
  const entries = EXEC_BUDGET_PROJECTS.filter(p => {
    const matchText = !q || p.no.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    const matchType = !budgetTypeFilter || p.type === budgetTypeFilter;
    const matchStatus = !budgetStatusFilter || p.status === budgetStatusFilter;
    const matchCustomer = !customerQ || p.customer.toLowerCase().includes(customerQ);
    const matchSalesOrg = !salesOrgQ || p.salesOrg.toLowerCase().includes(salesOrgQ);
    const matchPm = !pmQ || p.pm.toLowerCase().includes(pmQ);
    return matchText && matchType && matchStatus && matchCustomer && matchSalesOrg && matchPm;
  });

  const typeOptions = ['', ...new Set(EXEC_BUDGET_PROJECTS.map(p => p.type))].map(v =>
    `<option value="${v}" ${v===budgetTypeFilter?'selected':''}>${v || '전체'}</option>`
  ).join('');
  const statusOptions = ['', ...new Set(EXEC_BUDGET_PROJECTS.map(p => p.status))].map(v =>
    `<option value="${v}" ${v===budgetStatusFilter?'selected':''}>${v || '전체'}</option>`
  ).join('');

  const rows = entries.map(p => {
    return `
      <tr onclick="openBudgetProjectScreen('${p.key}')">
        <td class="eb-no">${p.no}</td>
        <td><div class="pt-name">${p.name}</div></td>
        <td class="pt-center"><span class="exec-chip type-${execTypeClass(p.type)}">${p.type}</span></td>
        <td class="pt-center"><span class="exec-chip status-${execStatusClass(p.status)}">${p.status}</span></td>
        <td class="pt-center">${p.pm}</td>
        <td class="pt-center">${p.salesOrg}</td>
        <td class="pt-center">${p.customer || ''}</td>
        <td class="pt-center">${p.period}</td>
      </tr>`;
  }).join('');

  const noResult = entries.length === 0
    ? `<tr><td colspan="8"><div class="proj-no-result">검색 결과가 없습니다.</div></td></tr>` : '';

  document.getElementById('budget-body').innerHTML = `
    <div class="exec-budget-page">
      <div class="exec-budget-title"><span class="exec-title-dot"></span>실행예산</div>
      <div class="exec-filter-panel">
        <label class="exec-filter-field exec-filter-code">
          <span>프로젝트 번호/명</span>
          <input type="text" value="${budgetSearchQuery}"
            oninput="budgetSearchQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>프로젝트 유형</span>
          <select onchange="budgetTypeFilter=this.value;renderBudgetListView()">${typeOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>프로젝트 상태</span>
          <select onchange="budgetStatusFilter=this.value;renderBudgetListView()">${statusOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>고객사</span>
          <input type="text" value="${budgetCustomerQuery}"
            oninput="budgetCustomerQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>매출귀속조직</span>
          <input type="text" value="${budgetSalesOrgQuery}"
            oninput="budgetSalesOrgQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>수행PM</span>
          <input type="text" value="${budgetPmQuery}"
            oninput="budgetPmQuery=this.value;renderBudgetListView()">
        </label>
        <div class="exec-filter-actions">
          <button class="exec-reset-btn" onclick="resetBudgetListFilters()" title="초기화">↻</button>
          <button class="exec-search-btn" onclick="renderBudgetListView()">검색</button>
        </div>
      </div>
      <div class="exec-list-head">
        <div class="exec-total">총 <strong>${fmt(40624)}</strong> 건</div>
        <div class="exec-actions">
          <button class="exec-text-btn">엑셀</button>
          <button class="exec-primary-btn">프로젝트 등록</button>
          <button class="exec-icon-btn">＋</button>
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
            <th class="pt-center">상태</th>
            <th class="pt-center">수행PM</th>
            <th class="pt-center">매출귀속조직</th>
            <th class="pt-center">고객사</th>
            <th class="pt-center">프로젝트기간</th>
          </tr>
        </thead>
        <tbody>${rows || noResult}</tbody>
      </table>
    </div>`;
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">실투입 외주비, 기타외주비, MA를 먼저 구분한 뒤 등록합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">상품재료비와 기타재료비를 구분해 계획을 등록합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  if (account === '경비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">경비 수정</div>
            <div class="setup-editor-sub">계정별/월별 경비 계획을 입력하고, 통제 계정은 ERP 가용예산을 체크합니다.</div>
          </div>
        </div>
        ${renderExpensePlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const planTot  = CATS.reduce((o,c)=>({...o,[c]:calcPlanTotal(data,c)}),{});
  const planQ    = CATS.reduce((o,c)=>({...o,[c]:calcPlanQuasi(data,c)}),{});
  const bnr0 = budgetBannerTotalsFinal(data, actual, quasi);
  const totBudget = bnr0.budget, totActual = bnr0.actual, totQuasi = bnr0.quasi, totRemain = bnr0.remain;

  const projOpts = Object.entries(BUDGET_SOURCE).map(([k,v])=>
    `<option value="${k}" ${k===currentBudgetProj?'selected':''}>${v.projName}</option>`
  ).join('');

  const detailTable = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 핵심 현황만 확인하고 필요한 계정만 수정합니다.</div>
      </div>
    </div>

    ${budgetSetupEditAccount
      ? renderBudgetAccountEditor(data, budgetSetupEditAccount)
      : renderBudgetSetupOverview(data, actual, quasi)}`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='overview';renderBudgetPage()">← 목록으로</button>

    ${SHOW_TOTAL_BUDGET_BAR_FINAL ? renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage) : ''}

    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 집행 현황 확인 후 월별 실행예산 상세를 수립합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : detailTable}
  `;
}

// ── 총합 예산 배너 (컴팩트 가로형) ──
// 상단 배너 4개 카드의 값 — CP총액을 세 조각으로 나눠 보여줍니다(합계 = CP총액).
//   계획예산 = PM이 수립한 예산 (하단 [프로젝트 총 실행 비용]과 동일)
//   실집행   = 실적/확정이 발생한 금액 (하단 계정별 "실적/확정" 합계)
//   투입확정 = 계획예산 - 실집행       (계획은 섰지만 아직 실적이 없는 금액)
//   투입미정 = CP총액   - 계획예산     (원가총액 안에서 계획조차 세우지 않은 금액)
// budgetRollupFinal(budget-status-4.js)이 아직 안 실렸으면 예전 계산으로 물러납니다.
// CP 대비 정보는 [CP총액 한도] 막대로 대체되어 상단 배너를 숨긴 상태입니다.
// 되돌리려면 이 값을 true로 바꾸면 배너가 그대로 다시 나옵니다(계산 로직은 그대로 보존).
var SHOW_TOTAL_BUDGET_BAR_FINAL = false;

function budgetBannerTotalsFinal(data, actual, quasi) {
  if (typeof budgetRollupFinal === 'function' && typeof getSelectedExecBudgetVersionFinal === 'function') {
    const viewData = applyExecBudgetVersionSnapshotFinal(data, getSelectedExecBudgetVersionFinal(data));
    const roll = budgetRollupFinal(viewData, data);
    return {
      budget: roll.plan,
      actual: roll.done,
      quasi:  roll.plan - roll.done,
      remain: roll.cp - roll.plan,
    };
  }
  const budget = CATS.reduce((s, c) => s + (data.plan[c] || 0), 0);
  const a = CATS.reduce((s, c) => s + actual[c], 0);
  const q = CATS.reduce((s, c) => s + quasi[c], 0);
  return { budget, actual: a, quasi: q, remain: budget - a - q };
}

function renderTotalBudgetBar(budget, actual, quasi, remain, projName='', dplus=0, stage='') {
  const rate     = budget > 0 ? (actual / budget * 100).toFixed(1) : 0;
  const quaRate  = budget > 0 ? (quasi  / budget * 100).toFixed(1) : 0;
  const remRate  = budget > 0 ? (Math.max(remain, 0) / budget * 100).toFixed(1) : 0;
  // 레퍼런스 대시보드 스타일 KPI 카드(라벨 + 큰 컬러 숫자 + 카드별 진행바 + %)
  const card = (label, val, sub, pct, cls, pctText) => `
    <div class="tbb-kpi tbb-kpi-${cls}">
      <div class="tbb-kpi-head">
        <span class="tbb-kpi-label">${label}</span>
        <span class="tbb-kpi-val">${val}<em>원</em></span>
      </div>
      <div class="tbb-kpi-sub">${sub}</div>
      <div class="tbb-kpi-barrow">
        <div class="tbb-kpi-bar"><div class="tbb-kpi-fill" style="width:${Math.min(parseFloat(pct) || 0, 100)}%"></div></div>
        <span class="tbb-kpi-pct">${pctText}</span>
      </div>
    </div>`;

  return `
    <div class="tbb-card">
      <div class="tbb-top">
        <div class="tbb-top-left">
          <div class="tbb-proj-info">
            <span class="tbb-proj-name">${projName}</span>
            <span class="tbb-stage-badge">${stage}</span>
            <span class="tbb-dplus">D+${dplus}일</span>
          </div>
        </div>
      </div>
      <div class="tbb-kpis">
        ${card('계획예산', fmt(budget), '프로젝트 총액', 100, 'plan', '기준')}
        ${card('실집행', fmt(actual), '계획 대비 집행률', rate, 'act', rate + '%')}
        ${card('투입확정', fmt(quasi), '계획 대비 확정률', quaRate, 'qua', quaRate + '%')}
        ${card('투입미정', fmt(Math.max(remain, 0)), '계획 대비 잔여율', remRate, 'rem', remRate + '%')}
      </div>
    </div>`;
}

// ── 계정별 예산 이관현황 테이블 ──
function renderAccountTransferTable(data, actual, quasi, remain) {
  const ACCT_LABELS = ['인건비', '외주비', '재료비', '경비'];
  const transfer = data.transfer || {};

  const rows = ACCT_LABELS.map(acct => {
    const init     = data.plan[acct] || 0;
    const tr       = transfer[acct] || 0;
    const adjusted = init + tr;
    const act      = actual[acct]  || 0;
    const qua      = quasi[acct]   || 0;
    const rem      = adjusted - act - qua;

    const trSign   = tr > 0 ? '+' : '';
    const trColor  = tr > 0 ? '#16a34a' : tr < 0 ? '#dc2626' : '#94a3b8';
    const trVal    = tr !== 0
      ? `<span style="color:${trColor};font-weight:600">${trSign}${fmt(tr)}</span>`
      : `<span style="color:#94a3b8">—</span>`;

    const remColor = rem < 0 ? '#dc2626' : '#1e293b';

    const isExpense = acct === '경비';
    const rowExtra  = isExpense
      ? ` class="actr-row actr-row-clickable" onclick="showExpenseDetailModal(${act + qua})" title="경비 소계정 상세 조회"`
      : ` class="actr-row"`;
    const labelExtra = isExpense
      ? `<span class="actr-expense-hint">상세 ▾</span>`
      : '';

    return `
      <tr${rowExtra}>
        <td class="actr-td actr-label">${acct}${labelExtra}</td>
        <td class="actr-td actr-num">${fmt(init)}</td>
        <td class="actr-td actr-num actr-transfer">${trVal}</td>
        <td class="actr-td actr-num actr-adjusted">${fmt(adjusted)}</td>
        <td class="actr-td actr-num">${fmt(act)}</td>
        <td class="actr-td actr-num actr-quasi">${fmt(qua)}</td>
        <td class="actr-td actr-num" style="color:${remColor}">${fmt(Math.max(rem,0))}</td>
      </tr>`;
  }).join('');

  // 합계 행
  const sumInit     = ACCT_LABELS.reduce((s,c) => s+(data.plan[c]||0), 0);
  const sumTr       = ACCT_LABELS.reduce((s,c) => s+(transfer[c]||0), 0);
  const sumAdj      = sumInit + sumTr;
  const sumAct      = ACCT_LABELS.reduce((s,c) => s+(actual[c]||0), 0);
  const sumQua      = ACCT_LABELS.reduce((s,c) => s+(quasi[c]||0), 0);
  const sumRem      = sumAdj - sumAct - sumQua;
  const sumTrSign   = sumTr > 0 ? '+' : '';
  const sumTrColor  = sumTr > 0 ? '#16a34a' : sumTr < 0 ? '#dc2626' : '#94a3b8';

  return `
    <div class="actr-wrap">
      <div class="actr-header">
        <span class="actr-title">계정별 예산 집행 현황</span>
        <span class="actr-notice">ℹ️ 계정 간 예산 이관이 가능합니다. 초기배분은 참고치이며 조정배분이 실질 기준입니다.</span>
      </div>
      <div class="actr-table-wrap">
        <table class="actr-table">
          <thead>
            <tr>
              <th class="actr-th actr-th-label">계정</th>
              <th class="actr-th actr-th-num">초기배분(Cost)</th>
              <th class="actr-th actr-th-num actr-th-transfer">이관(+/-)</th>
              <th class="actr-th actr-th-num actr-th-adjusted">조정배분</th>
              <th class="actr-th actr-th-num">실집행</th>
              <th class="actr-th actr-th-num">투입확정</th>
              <th class="actr-th actr-th-num">투입미정</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="actr-sum-row">
              <td class="actr-td actr-label" style="font-weight:700">합 계</td>
              <td class="actr-td actr-num">${fmt(sumInit)}</td>
              <td class="actr-td actr-num actr-transfer">
                ${sumTr !== 0
                  ? `<span style="color:${sumTrColor};font-weight:700">${sumTrSign}${fmt(sumTr)}</span>`
                  : `<span style="color:#94a3b8">—</span>`}
              </td>
              <td class="actr-td actr-num actr-adjusted" style="font-weight:700">${fmt(sumAdj)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(sumAct)}</td>
              <td class="actr-td actr-num actr-quasi" style="font-weight:700">${fmt(sumQua)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(Math.max(sumRem,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="actr-transfer-log">
        <span class="actr-log-title">📋 이관 내역</span>
        ${ACCT_LABELS.filter(c => (transfer[c]||0) !== 0).map(c => {
          const v = transfer[c];
          const sign = v > 0 ? '+' : '';
          const color = v > 0 ? '#16a34a' : '#dc2626';
          const dir = v > 0 ? '← 이관 수취' : '→ 이관 지급';
          return `<span class="actr-log-chip" style="color:${color};border-color:${color}">${c} <strong>${sign}${fmt(v)}</strong> <span class="actr-log-dir">${dir}</span></span>`;
        }).join('')}
        ${ACCT_LABELS.every(c => (transfer[c]||0) === 0)
          ? '<span style="color:#94a3b8;font-size:15px">이관 내역 없음</span>' : ''}
      </div>
    </div>`;
}

// ── KPI 카드 ──
function renderAccountTransferTable(data, actual, quasi, remain) {
  const ACCT_LABELS = BUDGET_ACCT_LABELS;
  const transfer = data.transfer || {};

  const rows = ACCT_LABELS.map((acct, idx) => {
    const init = data.plan[acct] || 0;
    const tr = transfer[acct] || 0;
    const adjusted = init + tr;
    const act = actual[acct] || 0;
    const qua = quasi[acct] || 0;
    const min = act + qua;
    const rem = adjusted - min;
    const trSign = tr > 0 ? '+' : '';
    const trColor = tr > 0 ? '#16a34a' : tr < 0 ? '#dc2626' : '#94a3b8';
    const trVal = tr !== 0
      ? `<span style="color:${trColor};font-weight:700">${trSign}${fmt(tr)}</span>`
      : `<span style="color:#94a3b8">-</span>`;
    const adjustedCell = budgetTransferEditMode
      ? `<input class="actr-edit-input" id="actr-adjust-${idx}" value="${adjusted}" inputmode="numeric">`
      : fmt(adjusted);
    const rowExtra = acct === '경비' && !budgetTransferEditMode
      ? ` class="actr-row actr-row-clickable" onclick="showExpenseDetailModal(${min})" title="경비 회계별 상세 조회"`
      : ` class="actr-row"`;
    const labelExtra = acct === '경비' && !budgetTransferEditMode
      ? `<span class="actr-expense-hint">상세</span>`
      : '';

    return `
      <tr${rowExtra}>
        <td class="actr-td actr-label">${acct}${labelExtra}</td>
        <td class="actr-td actr-num">${fmt(init)}</td>
        <td class="actr-td actr-num actr-transfer">${trVal}</td>
        <td class="actr-td actr-num actr-adjusted">${adjustedCell}${budgetTransferEditMode ? `<div class="actr-min-hint">최소 ${fmt(min)}</div>` : ''}</td>
        <td class="actr-td actr-num">${fmt(act)}</td>
        <td class="actr-td actr-num actr-quasi">${fmt(qua)}</td>
        <td class="actr-td actr-num" style="color:${rem < 0 ? '#dc2626' : '#1e293b'}">${fmt(Math.max(rem, 0))}</td>
      </tr>`;
  }).join('');

  const sumInit = ACCT_LABELS.reduce((s,c) => s + (data.plan[c] || 0), 0);
  const sumTr = ACCT_LABELS.reduce((s,c) => s + (transfer[c] || 0), 0);
  const sumAdj = sumInit + sumTr;
  const sumAct = ACCT_LABELS.reduce((s,c) => s + (actual[c] || 0), 0);
  const sumQua = ACCT_LABELS.reduce((s,c) => s + (quasi[c] || 0), 0);
  const sumRem = sumAdj - sumAct - sumQua;
  const sumTrSign = sumTr > 0 ? '+' : '';
  const sumTrColor = sumTr > 0 ? '#16a34a' : sumTr < 0 ? '#dc2626' : '#94a3b8';
  const history = budgetTransferHistory[currentBudgetProj] || [];
  const actionButtons = budgetTransferEditMode
    ? `<div class="actr-actions">
        <button class="actr-cancel-btn" onclick="cancelBudgetTransferEdit()">취소</button>
        <button class="actr-save-btn" onclick="saveBudgetTransfer()">저장</button>
      </div>`
    : `<button class="actr-edit-btn" onclick="startBudgetTransferEdit()">예산 이관 수정</button>`;

  const transferLog = ACCT_LABELS.filter(c => (transfer[c] || 0) !== 0).map(c => {
    const v = transfer[c];
    const sign = v > 0 ? '+' : '';
    const color = v > 0 ? '#16a34a' : '#dc2626';
    const dir = v > 0 ? '수취' : '지급';
    return `<span class="actr-log-chip" style="color:${color};border-color:${color}">${c} <strong>${sign}${fmt(v)}</strong> <span class="actr-log-dir">${dir}</span></span>`;
  }).join('');

  const selectedHistory = history.find(h => h.version === budgetHistorySelectedVersion) || history[0];
  const historyRows = history.length
    ? `
      <div class="actr-history-tabs">
        ${history.map(h => `
          <button class="actr-history-tab ${selectedHistory && h.version === selectedHistory.version ? 'active' : ''}"
            onclick="selectBudgetHistoryVersion(${h.version})">
            <span class="actr-tab-version">v${h.version}</span>
            <span class="actr-tab-meta">${h.changedBy}</span>
            <span class="actr-tab-date">${h.changedAt}</span>
          </button>
        `).join('')}
      </div>
      <div class="actr-history-panel">
        <div class="actr-history-panel-head">
          <span class="actr-version">v${selectedHistory.version}</span>
          <strong>${selectedHistory.changedBy}</strong>
          <span>${selectedHistory.changedAt}</span>
        </div>
        <div class="actr-history-change-table">
          <div class="actr-hrow actr-hhead">
            <span>계정</span><span>변경 전</span><span>변경 후</span><span>증감</span>
          </div>
          ${selectedHistory.changes.map(c => {
            const diffSign = c.diff > 0 ? '+' : '';
            const diffColor = c.diff > 0 ? '#16a34a' : '#dc2626';
            return `
              <div class="actr-hrow">
                <span class="actr-hacct">${c.acct}</span>
                <span>${fmt(c.oldAdjusted)}</span>
                <span>${fmt(c.newAdjusted)}</span>
                <span style="color:${diffColor};font-weight:900">${diffSign}${fmt(c.diff)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`
    : `<div class="actr-history-empty">아직 저장된 이관 변경 이력이 없습니다.</div>`;

  return `
    <div class="actr-wrap">
      <div class="actr-header">
        <div>
          <span class="actr-title">계정별 예산 집행 현황</span>
          <div class="actr-rule">PM은 총액 내에서 계정 간 예산을 이관할 수 있으며, 조정배분은 실집행+투입확정보다 작을 수 없습니다.</div>
        </div>
        ${actionButtons}
      </div>
      <div class="actr-cost-guide">
        <div>
          <strong>총액 변경이 필요하다면?</strong>
          <span>이 화면에서는 총액 내 계정 간 이관만 가능합니다. 프로젝트 전체 Cost가 바뀌는 경우 AI PMO로 돌아가 Cost 산정부터 다시 진행해야 합니다.</span>
        </div>
        <button class="actr-cost-guide-btn" onclick="showBudgetCostGuide()">AI PMO Cost 재산정</button>
      </div>
      <div class="actr-table-wrap">
        <table class="actr-table">
          <thead>
            <tr>
              <th class="actr-th actr-th-label">계정</th>
              <th class="actr-th actr-th-num">초기배분(Cost)</th>
              <th class="actr-th actr-th-num actr-th-transfer">이관(+/-)</th>
              <th class="actr-th actr-th-num actr-th-adjusted">조정배분</th>
              <th class="actr-th actr-th-num">실집행</th>
              <th class="actr-th actr-th-num">투입확정</th>
              <th class="actr-th actr-th-num">투입미정</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="actr-sum-row">
              <td class="actr-td actr-label" style="font-weight:700">합계</td>
              <td class="actr-td actr-num">${fmt(sumInit)}</td>
              <td class="actr-td actr-num actr-transfer">${sumTr !== 0 ? `<span style="color:${sumTrColor};font-weight:700">${sumTrSign}${fmt(sumTr)}</span>` : `<span style="color:#94a3b8">-</span>`}</td>
              <td class="actr-td actr-num actr-adjusted" style="font-weight:700">${fmt(sumAdj)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(sumAct)}</td>
              <td class="actr-td actr-num actr-quasi" style="font-weight:700">${fmt(sumQua)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(Math.max(sumRem,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${budgetTransferEditMode ? `<div class="actr-edit-guide">조정배분 금액을 수정한 뒤 저장하세요. 합계는 ${fmt(sumInit)}원으로 유지되어야 합니다.</div>` : ''}
      <div class="actr-transfer-log">
        <span class="actr-log-title">이관 내역</span>
        ${transferLog || '<span style="color:#94a3b8;font-size:15px">이관 내역 없음</span>'}
      </div>
      <div class="actr-history">
        <div class="actr-history-title">버전 변경 히스토리</div>
        ${historyRows}
      </div>
    </div>`;
}

function kpiCard(title, budget, actual, quasi, remain, isTotal=false, extraBtn='') {
  const tc = isTotal ? ' total-card' : '';
  const rate = budget > 0 ? (actual / budget * 100).toFixed(1) : 0;
  const rateColor = rate >= 90 ? '#dc2626' : rate >= 70 ? '#d97706' : '#1d4ed8';
  const rateZero  = rate == 0;
  const bigEl = `
    <div class="bkpi-rate-wrap">
      <span class="bkpi-rate-label">실적집행률</span>
      <span class="bkpi-total${rateZero?' zero':''}" style="${rateZero?'':'color:'+rateColor}">${rate}%</span>
    </div>`;
  return `
    <div class="budget-kpi-card${tc}">
      <div class="bkpi-header">
        <span class="bkpi-title">${title}</span>
        ${extraBtn}
      </div>
      <div class="bkpi-rows">
        <div class="bkpi-row"><span class="bkpi-row-label">계획예산</span><span class="bkpi-row-val">${fmt(budget)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">실적</span><span class="bkpi-row-val">${fmt(actual)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">투입확정</span><span class="bkpi-row-val quasi">${fmt(quasi)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">투입미정</span><span class="bkpi-row-val remain">${fmt(Math.max(remain,0))}원</span></div>
      </div>
      <hr class="bkpi-divider">
      ${bigEl}
    </div>`;
}

// ── 경비 소계정 상세 모달 ──
function showExpenseDetailModal(expTotal) {
  const CATS = [
    { key:'비통제',   ratio:0.35, color:'#ef4444', bg:'#fee2e2', desc:'통제 불가 발생 비용' },
    { key:'통제',     ratio:0.30, color:'#3b82f6', bg:'#dbeafe', desc:'절감 가능 관리 비용' },
    { key:'인비례성', ratio:0.22, color:'#8b5cf6', bg:'#ede9fe', desc:'인력 규모 비비례 비용' },
    { key:'WLB',      ratio:0.13, color:'#10b981', bg:'#d1fae5', desc:'구성원 복지 관련 비용' },
  ];

  // 마지막 항목에 나머지 금액 배분 (반올림 오차 처리)
  let rem = expTotal;
  const items = CATS.slice(0,-1).map(c => {
    const v = Math.round(expTotal * c.ratio);
    rem -= v;
    return { ...c, v };
  });
  items.push({ ...CATS[CATS.length-1], v: Math.max(0, rem) });

  const rows = items.map(({key, color, bg, desc, v}) => {
    const pct = expTotal > 0 ? (v / expTotal * 100).toFixed(0) : 0;
    return `
      <div class="expm-row">
        <div class="expm-name-wrap">
          <span class="expm-cat-badge" style="background:${bg};color:${color}">${key}</span>
          <span class="expm-desc">${desc}</span>
        </div>
        <div class="expm-bar-bg">
          <div class="expm-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="expm-pct" style="color:${color}">${pct}%</span>
        <span class="expm-val">${fmt(v)}원</span>
      </div>`;
  }).join('');

  let modal = document.getElementById('expense-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'expense-detail-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="expm-box">
      <div class="expm-header">
        <div>
          <div class="expm-title">경비 소계정 상세</div>
          <div class="expm-total">총 집행액 ${fmt(expTotal)}원</div>
        </div>
        <button class="expm-close" onclick="document.getElementById('expense-detail-modal').classList.remove('open')">✕</button>
      </div>
      <div class="expm-body">${rows}</div>
    </div>`;
  modal.classList.add('open');
}

// ── 외부 시스템 바로가기 팝업 ──
function showExtLink(label, sysFullName) {
  let modal = document.getElementById('extlink-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'extlink-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="aipmo-link-box">
      <div class="aipmo-link-icon">🔗</div>
      <div class="aipmo-link-msg">
        <strong>${sysFullName}</strong> 바로가기입니다.<br>
        해당 시스템으로 연결됩니다.
      </div>
      <button class="aipmo-link-close" onclick="document.getElementById('extlink-modal').classList.remove('open')">확인</button>
    </div>`;
  modal.classList.add('open');
}

// ── 5Tier 모달 ──
function showLaborProcessGuide() {
  let modal = document.getElementById('labor-process-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'labor-process-guide-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="labor-process-guide-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>인건비 등록 프로세스</span>
          <strong>SCM 연동 기준으로 인력 투입 계획을 확정합니다</strong>
        </div>
        <button onclick="document.getElementById('labor-process-guide-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="labor-process-guide-flow">
          <div><i>1</i><b>SCM 인력 조회</b><em>SCM 기준 인력 리스트를 실시간으로 불러오고 투입 대상을 선택합니다.</em></div>
          <div><i>2</i><b>투입 기본정보 저장</b><em>투입 시작일, 종료일, Full/Part 여부를 입력합니다. P레벨과 단가는 HR/SCM 기준 정보를 사용합니다.</em></div>
          <div><i>3</i><b>월별 MM 입력</b><em>저장된 투입 기간 기준으로 월별 MM이 열리고, PM이 계획 MM을 입력합니다.</em></div>
          <div><i>4</i><b>SCM 결재요청</b><em>월별 MM 저장 후 승인요청을 누르면 SCM으로 결재 요청 데이터가 전송됩니다.</em></div>
          <div><i>5</i><b>SCM 확정 반영</b><em>SCM에서 승인 완료되면 실행예산의 투입확정 금액으로 반영됩니다.</em></div>
        </div>
        <div class="labor-process-guide-rules">
          <strong>확정 룰</strong>
          <p>SCM 확정 전 데이터는 계획 상태이며, 변경 시 다시 저장 후 SCM 결재요청을 진행합니다.</p>
          <p>SCM 확정 완료된 투입 건만 예산 집행/잔여예산 계산의 투입확정 금액으로 반영합니다.</p>
          <p>실적이 발생한 과거월은 수정하지 않고, 미래월 계획 MM 중심으로 조정합니다.</p>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-secondary" onclick="document.getElementById('labor-process-guide-modal').classList.remove('open')">닫기</button>
        <button class="budget-cost-primary" onclick="showExtLink('AI SCM','AI SCM 시스템')">SCM 바로가기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBudgetCostGuide() {
  const data = BUDGET_SOURCE[currentBudgetProj] || {};
  let modal = document.getElementById('budget-cost-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'budget-cost-guide-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="budget-cost-guide-modal">
      <div class="budget-cost-guide-head">
        <span>AI PMO</span>
        <button onclick="document.getElementById('budget-cost-guide-modal').classList.remove('open')">×</button>
      </div>
      <div class="budget-cost-guide-body">
        <strong>총액 변경은 Cost 재산정 프로세스로 진행합니다.</strong>
        <p>계정별 이관은 현재 총액 안에서만 가능합니다. 인력, 외주, 재료, 기간 변경으로 프로젝트 총액이 달라지면 AI PMO에서 Cost를 다시 산정한 뒤 실행예산으로 재반영해야 합니다.</p>
        <div class="budget-cost-guide-project">
          <span>대상 프로젝트</span>
          <b>${data.projNo || '-'} ${data.projName || ''}</b>
        </div>
        <div class="budget-cost-guide-steps">
          <div><span>1</span><b>AI PMO 복귀</b><em>변경 사유와 기준 정보를 확인</em></div>
          <div><span>2</span><b>Cost 재산정</b><em>총액, 계정별 배분, 기간 기준 재계산</em></div>
          <div><span>3</span><b>실행예산 재수립</b><em>승인된 Cost 기준으로 예산 상세 재작성</em></div>
        </div>
      </div>
      <div class="budget-cost-guide-actions">
        <button class="budget-cost-secondary" onclick="document.getElementById('budget-cost-guide-modal').classList.remove('open')">현재 화면 유지</button>
        <button class="budget-cost-primary" onclick="showExtLink('AI PMO','AI PMO Cost 산정')">AI PMO로 이동</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function show5Tier() {
  let overlay = document.getElementById('fivetier-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fivetier-overlay';
    overlay.className = 'fivetier-overlay';
    overlay.onclick = e => { if (e.target === overlay) close5Tier(); };
    document.body.appendChild(overlay);
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  const projName = data ? data.projName : '';

  // 5tier 구성 (stub — 기준 확정 후 실데이터 연결 예정)
  const tiers = [
    { no:'1', tier:'정직원',  구분:'인건비', budgetNote:'계획 기준', mmNote:'투입 계획 기준', color:'#1d4ed8', bg:'#eff6ff' },
    { no:'2', tier:'ATS',    구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#0f766e', bg:'#f0fdfa' },
    { no:'3', tier:'AGS',    구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#7c3aed', bg:'#f5f3ff' },
    { no:'4', tier:'K-BP',   구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#d97706', bg:'#fffbeb' },
    { no:'5', tier:'AI',     구분:'외주비', budgetNote:'계획 기준',    mmNote:'투입 계획 기준', color:'#dc2626', bg:'#fff1f2' },
  ];

  const rows = tiers.map(t => `
    <tr>
      <td style="text-align:center">
        <span class="fivetier-num" style="background:${t.bg};color:${t.color}">${t.no}</span>
      </td>
      <td><span class="fivetier-name" style="color:${t.color}">${t.tier}</span></td>
      <td style="text-align:center">
        <span class="fivetier-cat">${t.구분}</span>
      </td>
      <td class="fivetier-stub">
        <span class="fivetier-stub-val">— 원</span>
        <span class="fivetier-stub-note">${t.budgetNote}</span>
      </td>
      <td class="fivetier-stub">
        <span class="fivetier-stub-val">— MM</span>
        <span class="fivetier-stub-note">${t.mmNote}</span>
      </td>
    </tr>`).join('');

  overlay.innerHTML = `
    <div class="fivetier-modal">
      <div class="fivetier-head">
        <div>
          <div class="fivetier-tag">인건비 + 외주비</div>
          <div class="fivetier-title">5Tier 예산·MM 조회</div>
          <div class="fivetier-sub">${projName} · Tier별 예산 및 투입 인력 현황</div>
        </div>
        <button class="fivetier-close" onclick="close5Tier()">닫기</button>
      </div>
      <div class="fivetier-notice">
        ⚠️ 5Tier 기준이 확정되지 않아 현재 조회 기능 구성 단계입니다. 기준 확정 후 실데이터가 연결됩니다.
      </div>
      <table class="fivetier-table">
        <thead>
          <tr>
            <th style="width:60px">No.</th>
            <th style="width:130px">Tier</th>
            <th style="width:100px">구분</th>
            <th style="width:260px">예산</th>
            <th style="width:200px">MM</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  overlay.classList.add('open');
}

function close5Tier() {
  const overlay = document.getElementById('fivetier-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ════════════════════════════════════════
//  요약 테이블 — 과거 월별 + 잔여계획 1컬럼
// ════════════════════════════════════════
function renderSummaryTable(data, actual, planTot, planQ) {
  const pastMs = data.months.filter(m => m.type === 'actual');
  const rows   = [...CATS, '합계'];
  const proj   = currentBudgetProj;

  const monthHeaders = pastMs.map(m => {
    const cls = m.m === data.current ? 'mh-current' : 'mh-past';
    return `<th class="${cls}">${m.m}</th>`;
  }).join('');

  const subrow = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastMs.map(m=>`<th class="${m.m===data.current?'th-future':'th-past'}">${m.m===data.current?'당월':'실적'}</th>`).join('')}
      <th class="th-future">계획 (잔여)</th>
    </tr>`;

  const thead = `
    <tr class="month-head-row">
      <th class="mh-cat">구분</th>
      <th class="mh-plan">예산계획</th>
      ${monthHeaders}
      <th class="mh-remain">잔여계획</th>
    </tr>
    ${subrow}`;

  const tbody = rows.map(cat => {
    const isTotal = cat === '합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);

    const pastCells = pastMs.map(mo => {
      const isCur = mo.m === data.current;
      const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
      const cls2 = isCur ? 'td-current' : 'td-actual';
      const z = v===0 ? ' zero' : '';
      // clickable only for non-total, non-zero cells (or zero with details)
      const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length > 0;
      const clickAttr = hasDetail ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"` : `class="${cls2}${z}"`;
      return `<td ${clickAttr}>${v===0?'—':fmt(v)}</td>`;
    }).join('');

    const rPlan = isTotal ? CATS.reduce((s,c)=>s+planTot[c],0) : (planTot[cat]||0);
    const rQ    = isTotal ? CATS.reduce((s,c)=>s+planQ[c],0)   : (planQ[cat]||0);
    const remainCell = rPlan===0
      ? `<td class="td-remain" style="color:#d6d3d1">—</td>`
      : `<td class="td-remain">${fmt(rPlan)}${rQ>0?`<span class="quasi-badge">투입확정 ${fmt(rQ)}원</span>`:''}</td>`;

    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'—':fmt(planV)}</td>
        ${pastCells}
        ${remainCell}
      </tr>`;
  }).join('');

  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ════════════════════════════════════════
//  상세 테이블 — 전 월 개별 컬럼
// ════════════════════════════════════════
function renderDetailTable(data) {
  const allMs   = data.months;
  const rows    = [...CATS, '합계'];
  const proj    = currentBudgetProj;
  const pastCnt = allMs.filter(m=>m.type==='actual').length;
  const futCnt  = allMs.filter(m=>m.type==='plan').length;

  const typeSubhead = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastCnt>0?`<th class="th-past" colspan="${pastCnt}">실 적</th>`:''}
      ${futCnt>0?`<th class="th-future" colspan="${futCnt}">계 획</th>`:''}
    </tr>`;

  const monthCols = allMs.map(m=>{
    const cls = m.type==='plan'?(m[CATS[0]]&&m[CATS[0]].q>0?'mh-remain':'mh-future'):'mh-past';
    return `<th class="${m.m===data.current?'mh-current':cls}">${m.m}</th>`;
  }).join('');

  const thead = `
    ${typeSubhead}
    <tr class="month-head-row">
      <th class="mh-cat">구분</th>
      <th class="mh-plan">예산계획</th>
      ${monthCols}
    </tr>`;

  const tbody = rows.map(cat => {
    const isTotal = cat==='합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);

    const moCells = allMs.map(mo => {
      const isCur = mo.m === data.current;
      let v, q;
      if (mo.type === 'actual') {
        v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
        q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
        const cls2 = isCur ? 'td-current' : 'td-actual';
        const z = v===0&&q===0 ? ' zero' : '';
        const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length>0;
        const clickAttr = hasDetail
          ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="${cls2}${z}"`;
        return `<td ${clickAttr}>${v===0?'—':fmt(v)}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
      } else {
        v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].p||0:0),0) : (mo[cat]?mo[cat].p||0:0);
        q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
        const z = v===0 ? ' zero' : '';
        const allQuasi = q>0 && q===v;
        const bg = allQuasi ? 'background:#fffbeb;' : '';
        const hasDetail = !isTotal && q>0 && mo[cat] && (mo[cat].details||[]).length>0;
        const clickAttr = hasDetail
          ? `class="td-future${z} clickable" style="${bg}" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="td-future${z}" style="${bg}"`;
        return `<td ${clickAttr}>${v===0?'—':fmt(v)}${q>0?`<span class="quasi-indicator">▶ 투입확정 ${fmt(q)}</span>`:''}</td>`;
      }
    }).join('');

    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'—':fmt(planV)}</td>
        ${moCells}
      </tr>`;
  }).join('');

  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ════════════════════════════════════════
//  상세 드릴다운 모달
// ════════════════════════════════════════
function renderDetailTable(data) {
  const allMs = data.months;
  const rows = [...CATS, '합계'];
  const proj = currentBudgetProj;
  const pastCnt = allMs.filter(m=>m.type==='actual').length;
  const futCnt = allMs.filter(m=>m.type==='plan').length;
  const typeSubhead = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastCnt>0?`<th class="th-past" colspan="${pastCnt}">실적</th>`:''}
      ${futCnt>0?`<th class="th-future" colspan="${futCnt}">계획</th>`:''}
    </tr>`;
  const monthCols = allMs.map(m => `<th class="${m.type==='plan'?'mh-future':m.m===data.current?'mh-current':'mh-past'}">${m.m}</th>`).join('');
  const thead = `
    ${typeSubhead}
    <tr class="month-head-row">
      <th class="mh-cat">계정</th>
      <th class="mh-plan">계획예산</th>
      ${monthCols}
    </tr>`;
  const tbody = rows.map(cat => {
    const isTotal = cat === '합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);
    const moCells = allMs.map((mo, mi) => {
      if (mo.type === 'actual') {
        const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
        const cls2 = mo.m === data.current ? 'td-current' : 'td-actual';
        const z = v === 0 ? ' zero' : '';
        const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length > 0;
        const clickAttr = hasDetail
          ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="${cls2}${z}"`;
        return `<td ${clickAttr}>${v===0?'-':fmt(v)}</td>`;
      }
      const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].p||0:0),0) : (mo[cat]?mo[cat].p||0:0);
      const q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
      if (isTotal) {
        return `<td class="td-future">${v===0?'-':fmt(v)}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
      }
      const input = `<input class="budget-plan-input" id="plan-${mi}-${CATS.indexOf(cat)}" value="${v}" inputmode="numeric" title="${mo.m} ${cat} 계획">`;
      return `<td class="td-future editable-plan">${input}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
    }).join('');
    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'-':fmt(planV)}</td>
        ${moCells}
      </tr>`;
  }).join('');
  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function saveBudgetPlanEdits() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  let changed = 0;
  for (let mi = 0; mi < data.months.length; mi++) {
    const mo = data.months[mi];
    if (mo.type !== 'plan') continue;
    for (let ci = 0; ci < CATS.length; ci++) {
      const cat = CATS[ci];
      const el = document.getElementById(`plan-${mi}-${ci}`);
      if (!el || !mo[cat]) continue;
      const next = parseBudgetAmount(el.value);
      const confirmed = mo[cat].q || 0;
      if (next < confirmed) {
        showToast(`${mo.m} ${cat} 계획은 투입확정 ${fmt(confirmed)}원보다 작을 수 없습니다.`);
        return;
      }
      if ((mo[cat].p || 0) !== next) {
        mo[cat].p = next;
        changed++;
      }
    }
  }
  if (!changed) {
    showToast('변경된 계획 금액이 없습니다.');
    return;
  }
  persistBudgetPlanState();
  showToast(`계획 금액 ${changed}건이 저장되었습니다.`);
  renderBudgetPage();
}

function openBudgetDetail(month, cat, proj) {
  const data = BUDGET_SOURCE[proj || currentBudgetProj];
  const mo   = data && data.months.find(m => m.m === month);
  if (!mo || !mo[cat]) return;

  const details = mo[cat].details || [];
  const schema  = DETAIL_SCHEMA[cat];

  document.getElementById('bdetail-title').textContent = `${month} 상세`;
  document.getElementById('bdetail-cat').textContent   = cat;

  if (!details.length) {
    document.getElementById('bdetail-body').innerHTML =
      `<div class="bdetail-empty">📭 상세 내역이 없습니다.</div>`;
  } else {
    const poAmts  = PO_AMOUNTS[proj || currentBudgetProj] || {};
    const total   = schema.total(details);
    const colsHtml = schema.cols.map(c => {
      const isNum = ['MM','단가','금액','실적금액','PO금액'].includes(c);
      return `<th class="${isNum?'num':''}">${c}</th>`;
    }).join('');
    const rowsHtml = details.map(r=>`<tr>${schema.row(r, poAmts)}</tr>`).join('');
    const totalHtml = schema.hasPO
      ? `<tr class="bdetail-total-row">
          <td colspan="2" style="text-align:right;font-weight:700;padding-right:12px">합계</td>
          <td class="td-amount">${fmt(total)} 원</td>
          <td class="td-amount" style="color:#475569">${fmt(schema.totalPO(details, poAmts))} 원</td>
        </tr>`
      : `<tr class="bdetail-total-row">
          <td colspan="${schema.totalCols-1}" style="text-align:right;font-weight:700;padding-right:12px">합계</td>
          <td class="td-amount">${fmt(total)} 원</td>
        </tr>`;

    document.getElementById('bdetail-body').innerHTML = `
      <table class="bdetail-table">
        <thead><tr>${colsHtml}</tr></thead>
        <tbody>${rowsHtml}${totalHtml}</tbody>
      </table>`;
  }

  document.getElementById('budget-detail-overlay').classList.add('open');
}

function closeBudgetDetail() {
  document.getElementById('budget-detail-overlay').classList.remove('open');
}

// ── 이벤트 핸들러 ──
function selectBudgetProj(proj) { openBudgetProjectScreen(proj); }
function switchBudgetView(view) { budgetView = view; renderBudgetPage(); }

function getLaborStatusLabel(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

let laborScmLastSyncedAt = '';

const laborPersonDisplay = {
  'emp-lee': { name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계' },
  'emp-kim': { name:'김서린', org:'AX 개발1팀', role:'Vue Front' },
  'emp-park': { name:'박정우', org:'AX 개발2팀', role:'Java Backend' },
  'emp-choi': { name:'최유진', org:'품질혁신팀', role:'QA/검증' },
  'emp-jung': { name:'정다온', org:'Data Platform팀', role:'Oracle DBA' },
  'emp-han': { name:'한지훈', org:'SCM 등록인력', role:'Java Backend' },
};

function getLaborPersonView(person) {
  if (!person) return null;
  const clean = laborPersonDisplay[person.id] || {};
  return {
    ...person,
    name: clean.name || person.name,
    org: clean.org || person.org,
    role: clean.role || person.role,
  };
}

function getLaborRowView(row) {
  if (!row) return null;
  const clean = laborPersonDisplay[row.personId] || {};
  return {
    ...row,
    name: clean.name || row.name,
    org: clean.org || row.org,
    role: clean.role || row.role,
  };
}

function getLaborStatusLabelLegacy2(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

function refreshLaborCandidatesFromScm() {
  if (!laborCandidatePool.some(p => p.id === 'emp-han')) {
    laborCandidatePool.push({
      id:'emp-han',
      name:'한지훈',
      org:'SCM 등록인력',
      role:'Java Backend',
      pLevel:'P4',
      unitPrice:17500000,
    });
  }
  selectedLaborCandidateId = 'emp-han';
  laborScmLastSyncedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  showToast('SCM에서 최신 인력 리스트를 불러왔습니다.');
  renderBudgetPage();
}

function renderLaborAssignmentPanelLegacy2(data) {
  const rows = getLaborRows();
  const selectedRaw = getSelectedLaborAssignment();
  const selected = getLaborRowView(selectedRaw);
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const personRaw = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  const person = getLaborPersonView(personRaw);
  const query = laborSearchQuery.trim().toLowerCase();
  const candidates = laborCandidatePool
    .map(getLaborPersonView)
    .filter(p => !query || `${p.name} ${p.org} ${p.role} ${p.pLevel}`.toLowerCase().includes(query));
  const defaultStart = editing ? editing.startDate : '2026-07-01';
  const defaultEnd = editing ? editing.endDate : '2026-12-31';
  const defaultType = editing ? editing.workType : 'Full';
  const draftMonths = monthRangeByDate(defaultStart, defaultEnd).length;

  const assignmentRows = rows.map(row => {
    const view = getLaborRowView(row);
    const isActive = selected && selected.id === view.id;
    return `
      <button class="labor-row ${isActive ? 'active' : ''}" onclick="selectLaborAssignment('${view.id}')">
        <span>
          <strong>${view.name}</strong>
          <em>${view.org} · ${view.role} · ${view.pLevel}</em>
        </span>
        <span class="labor-row-right">
          <b>${view.totalMm || 0}MM</b>
          <i class="labor-status ${laborStatusClass(view.status)}">${getLaborStatusLabel(view.status)}</i>
        </span>
      </button>`;
  }).join('');

  const monthInputs = selectedRaw
    ? Object.keys(selectedRaw.monthly || {}).map(month => `
      <label class="labor-mm-cell">
        <span>${month}</span>
        <input id="labor-mm-${selectedRaw.id}-${month}" type="number" min="0" max="1" step="0.1" value="${selectedRaw.monthly[month]}">
      </label>
    `).join('')
    : '';

  const selectedStatusClass = selectedRaw ? laborStatusClass(selectedRaw.status) : '';
  const canRequest = selectedRaw && selectedStatusClass === 'saved';
  const canApprove = selectedRaw && selectedStatusClass === 'wait';

  return `
    <div class="labor-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">SCM 인력 조회부터 승인완료까지</div>
        </div>
        <div class="labor-flow">
          <span>SCM 조회</span><span>인력선택</span><span>기본정보 저장</span><span>월별 MM</span><span>승인요청</span><span>승인완료</span>
        </div>
      </div>

      <div class="labor-top-grid">
        <div class="labor-card labor-search-card">
          <div class="labor-card-headline">
            <div>
              <div class="labor-card-title">1. 인력 선택</div>
              <p>SCM 기준 인력 리스트에서 투입 대상을 선택합니다.</p>
            </div>
            <button class="labor-sync-btn" onclick="refreshLaborCandidatesFromScm()">SCM 실시간 조회</button>
          </div>
          <input class="labor-search-input" value="${laborSearchQuery}" placeholder="이름, 조직, 역할, P레벨 검색"
            oninput="updateLaborSearch(this.value)">
          <div class="labor-sync-note">${laborScmLastSyncedAt ? `최근 조회 ${laborScmLastSyncedAt}` : 'SCM 조회 버튼으로 최신 인력 리스트를 불러올 수 있습니다.'}</div>
          <div class="labor-candidates">
            ${candidates.map(p => `
              <button class="labor-candidate ${person && person.id === p.id ? 'active' : ''}" onclick="selectLaborCandidate('${p.id}')">
                <strong>${p.name}</strong>
                <span>${p.org} · ${p.role}</span>
                <em>${p.pLevel} / ${fmt(p.unitPrice)}원</em>
              </button>
            `).join('') || '<div class="labor-empty">검색된 인력이 없습니다.</div>'}
          </div>
        </div>

        <div class="labor-card">
          <div class="labor-card-title">2. 투입 기본정보</div>
          <div class="labor-form">
            <label><span>투입 시작일</span><input id="labor-start" type="date" value="${defaultStart}"></label>
            <label><span>투입 종료일</span><input id="labor-end" type="date" value="${defaultEnd}"></label>
            <label><span>투입유형</span>
              <select id="labor-work-type">
                <option value="Full" ${defaultType === 'Full' ? 'selected' : ''}>Full</option>
                <option value="Part" ${defaultType === 'Part' ? 'selected' : ''}>Part</option>
              </select>
            </label>
          </div>
          <div class="labor-summary labor-summary-basic">
            <div><span>P레벨</span><strong>${person ? person.pLevel : '-'}</strong></div>
            <div><span>단가</span><strong>${person ? fmt(person.unitPrice) : '-'}원</strong></div>
            <div><span>월 범위</span><strong>${draftMonths}개월</strong></div>
          </div>
          <div class="labor-mm-guide">
            <strong>총 MM / 금액은 4번 월별 MM 입력 후 자동 합산됩니다.</strong>
            <span>기본정보 저장 단계에서는 기간과 투입유형만 확정합니다.</span>
          </div>
          <div class="labor-actions">
            ${editing ? '<button class="labor-sub-btn" onclick="cancelLaborEdit()">수정취소</button>' : ''}
            <button class="labor-main-btn" onclick="saveLaborAssignmentDraft()">${editing ? '기본정보 수정 저장' : '투입 기본정보 저장'}</button>
          </div>
        </div>
      </div>

      <div class="labor-registered-card">
        <div class="labor-card-title">3. 등록 인력</div>
        <div class="labor-registered-grid">${assignmentRows || '<div class="labor-empty">등록된 인력이 없습니다.</div>'}</div>
      </div>

      ${selectedRaw ? `
        <div class="labor-month-card">
          <div class="labor-month-head">
            <div>
              <div class="labor-card-title">4. 월별 MM 입력 및 승인</div>
              <div class="labor-selected">${selected.name} · ${selected.startDate} ~ ${selected.endDate} · ${selected.workType}</div>
            </div>
            <div class="labor-selected-total">
              <small>월별 MM 합계</small>
              <span>${selected.totalMm || 0}MM</span>
              <strong>${fmt(selected.amount || 0)}원</strong>
              <i class="labor-status ${selectedStatusClass}">${getLaborStatusLabel(selected.status)}</i>
            </div>
          </div>
          <div class="labor-mm-grid">${monthInputs}</div>
          <div class="labor-approval-line">
            <span class="${selectedStatusClass !== 'draft' ? 'on' : ''}">MM 저장</span>
            <span class="${['wait','done'].includes(selectedStatusClass) ? 'on' : ''}">SCM 전송</span>
            <span class="${selectedStatusClass === 'done' ? 'on' : ''}">승인완료</span>
            <em>${selected.scmDocNo || 'SCM 문서번호 미생성'}</em>
          </div>
          <div class="labor-actions right">
            <button class="labor-sub-btn" onclick="editLaborAssignment('${selected.id}')">기본정보 수정</button>
            <button class="labor-sub-btn" onclick="saveLaborMonthlyMm('${selected.id}')">월별 MM 저장</button>
            <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestLaborApproval('${selected.id}')">승인요청</button>
            <button class="labor-main-btn teal" ${canApprove ? '' : 'disabled'} onclick="completeLaborScmApproval('${selected.id}')">SCM 승인완료 반영</button>
          </div>
        </div>` : ''}
    </div>`;
}

let budgetSummaryExpanded = { labor:true, outsource:true, material:false, expense:false };
const budgetConfirmState = {};

function getBudgetConfirm(proj = currentBudgetProj) {
  if (!budgetConfirmState[proj]) {
    budgetConfirmState[proj] = {
      version: 2,
      status: '작성중',
      erpStatus: '미전송',
      confirmedAt: '',
      sentAt: '',
      mailTo: '팀장 김도윤',
      mailStatus: '대기',
    };
  }
  return budgetConfirmState[proj];
}

function toggleBudgetSummaryAccount(key) {
  budgetSummaryExpanded[key] = !budgetSummaryExpanded[key];
  renderBudgetPage();
}

function getExecPlanAccounts(data, actual, quasi) {
  const defs = [
    { key:'labor', acct:'인건비', desc:'실투입 인건비, 이관 인건비, 증업/OT', edit:'인건비' },
    { key:'outsource', acct:'외주비', desc:'실투입대상, 전문직수수료, 출장비, 공사MA, 이관, 기타', edit:'외주비' },
    { key:'material', acct:'재료비', desc:'상품재료비, 감가상각비', edit:'재료비' },
    { key:'expense', acct:'경비', desc:'통제/비통제 경비, A/S Cost', edit:'경비' },
  ];
  return defs.map(def => {
    const budget = getBudgetAdjusted(data, def.acct);
    const used = (actual[def.acct] || 0) + (quasi[def.acct] || 0);
    const remain = Math.max(budget - used, 0);
    const months = data.months.filter(m => m.type === 'plan' && m[def.acct]).length;
    return { ...def, budget, used, remain, months, rate: budget ? Math.round(used / budget * 100) : 0 };
  });
}

function splitAccountChildren(account) {
  const b = account.budget;
  const u = account.used;
  const r = account.remain;
  const mk = (name, ratio, note) => ({
    name,
    budget: Math.round(b * ratio),
    used: Math.round(u * ratio),
    remain: Math.round(r * ratio),
    note,
  });
  if (account.key === 'labor') {
    return [mk('실투입인건비', .72, 'SCM 승인/투입확정 기준'), mk('이관인건비', .18, '타 프로젝트 이관 인건비'), mk('증업일급여-OT', .10, '월별 OT 계획')];
  }
  if (account.key === 'outsource') {
    return [
      mk('실투입대상 외주비', .45, '업체/계약/PO/검수'),
      mk('전문직수수료/제안/기타', .12, '업체/계약/PO'),
      mk('외주출장비', .05, '출장비/집행월'),
      mk('공사MA', .25, '공사/MA 계약'),
      mk('이관외주비', .05, '이관월/금액/사유'),
      mk('기타외주비', .08, '집행월/금액/설명'),
    ];
  }
  if (account.key === 'material') {
    return [mk('상품재료비', .78, '견적 기반 상품재료비'), mk('감가상각비', .22, '장비/라이선스 상각')];
  }
  return [mk('통제 경비', .64, 'ERP 가용예산 체크'), mk('비통제 경비', .24, '프로젝트 운영성 비용'), mk('A/S Cost', .12, '사후지원 예산')];
}

function renderProjectPlanSummaryLegacyCards(data, actual, quasi) {
  const accounts = getExecPlanAccounts(data, actual, quasi);
  const totalBudget = accounts.reduce((s, a) => s + a.budget, 0);
  const totalUsed = accounts.reduce((s, a) => s + a.used, 0);
  const totalRemain = accounts.reduce((s, a) => s + a.remain, 0);
  const rows = accounts.map(acc => {
    const open = !!budgetSummaryExpanded[acc.key];
    const children = splitAccountChildren(acc).map(child => `
      <div class="bps-child-row">
        <span class="bps-child-indent"></span>
        <span class="bps-child-name"><i></i><strong>${child.name}</strong></span>
        <b>${fmt(child.budget)}원</b>
        <b>${fmt(child.used)}원</b>
        <b>${fmt(child.remain)}원</b>
        <em>${child.note}</em>
      </div>`).join('');
    return `
      <div class="bps-account-block">
        <div class="bps-parent-row">
          <button class="bps-toggle" onclick="toggleBudgetSummaryAccount('${acc.key}')">${open ? '−' : '+'}</button>
          <div>
            <strong>${acc.acct}</strong>
            <span>${acc.desc}</span>
          </div>
          <b>${fmt(acc.budget)}원</b>
          <b>${fmt(acc.used)}원</b>
          <b>${fmt(acc.remain)}원</b>
          <button class="bps-edit-btn" onclick="openBudgetAccountEditor('${acc.edit}')">${acc.acct} 수정</button>
        </div>
        ${open ? `<div class="bps-child-list">${children}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="budget-plan-summary">
      <div class="bps-head">
        <div>
          <div class="setup-eyebrow">전체 프로젝트 실행예산 수립</div>
          <div class="setup-title">전체 계획 요약을 확인하세요</div>
          <p>4대 계정을 펼쳐 상세 항목까지 확인한 뒤, 확정 화면에서 버전 비교 후 ERP로 전송합니다.</p>
        </div>
        <div class="bps-actions">
          <button class="labor-sub-btn" onclick="Object.keys(budgetSummaryExpanded).forEach(k=>budgetSummaryExpanded[k]=true);renderBudgetPage()">전체 펼침</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="bps-total-strip">
        <div><span>실행예산</span><strong>${fmt(totalBudget)}원</strong></div>
        <div><span>확정/실적</span><strong>${fmt(totalUsed)}원</strong></div>
        <div><span>잔여예산</span><strong>${fmt(totalRemain)}원</strong></div>
        <div><span>확정 버전</span><strong>v${getBudgetConfirm().version}</strong></div>
      </div>
      <div class="bps-table-head">
        <span></span><span>구분</span><span>실행예산</span><span>ERP 실적/확정</span><span>잔여예산</span><span></span>
      </div>
      <div class="bps-table">${rows}</div>
    </div>`;
}

function getConfirmCompareRows(data, actual, quasi) {
  const accounts = getExecPlanAccounts(data, actual, quasi);
  const rows = [];
  accounts.forEach((acc, idx) => {
    const delta = [6084954, 9791533, -3706579, 0][idx] || 0;
    rows.push({ name:acc.acct, level:0, before:acc.budget - delta, after:acc.budget, erp:actual[acc.acct] || 0, remainBefore:acc.remain - delta, remainAfter:acc.remain });
    splitAccountChildren(acc).forEach((c, cidx) => {
      const childDelta = cidx === 0 ? delta : 0;
      rows.push({ name:c.name, level:1, before:c.budget - childDelta, after:c.budget, erp:Math.round((actual[acc.acct] || 0) * (c.budget / Math.max(acc.budget, 1))), remainBefore:c.remain - childDelta, remainAfter:c.remain });
    });
  });
  return rows.map(r => ({ ...r, diff:r.after - r.before, remainDiff:r.remainAfter - r.remainBefore }));
}

function confirmBudgetVersion() {
  const state = getBudgetConfirm();
  state.status = '확정완료';
  state.confirmedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  state.version += 1;
  showToast(`실행예산 v${state.version}이 확정되었습니다. ERP 전송 대기 상태입니다.`);
  renderBudgetPage();
}

function sendBudgetToErp() {
  const state = getBudgetConfirm();
  if (state.status !== '확정완료') {
    showToast('예산 확정 후 ERP 전송이 가능합니다.');
    return;
  }
  state.erpStatus = '전송완료';
  state.sentAt = new Date().toLocaleString('ko-KR', { hour12:false });
  state.mailStatus = '팀장 메일 발송완료';
  showToast(`${state.mailTo}에게 확정/ERP 전송 안내 메일을 발송했습니다.`);
  renderBudgetPage();
}

function renderBudgetConfirmScreen(data, actual, quasi) {
  const state = getBudgetConfirm();
  const rows = getConfirmCompareRows(data, actual, quasi).map(r => {
    const sign = r.diff > 0 ? '+' : '';
    const color = r.diff > 0 ? '#0284c7' : r.diff < 0 ? '#dc2626' : '#64748b';
    return `
      <tr class="${r.level ? 'child' : 'parent'}">
        <td>${r.level ? '└ ' : ''}${r.name}</td>
        <td class="num">${fmt(r.before)}</td>
        <td class="num">${fmt(r.after)}</td>
        <td class="num" style="color:${color};font-weight:900">${sign}${fmt(r.diff)}</td>
        <td class="num">${fmt(r.erp)}</td>
        <td class="num">${fmt(r.remainBefore)}</td>
        <td class="num">${fmt(r.remainAfter)}</td>
        <td class="num" style="color:${color};font-weight:900">${sign}${fmt(r.remainDiff)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="budget-confirm-page">
      <div class="bcp-head">
        <button class="budget-process-back" onclick="budgetDetailStep='setup';renderBudgetPage()">← 전체 계획 요약</button>
        <div>
          <div class="setup-eyebrow">실행예산 확정</div>
          <div class="setup-title">이전 버전 대비 변동 내역 확인</div>
          <p>확정 전 변경전/변경후/증감과 ERP 실적, 잔여예산 변동을 확인합니다.</p>
        </div>
        <div class="bcp-status">
          <span>v${state.version}</span>
          <strong>${state.status}</strong>
          <em>ERP ${state.erpStatus}</em>
        </div>
      </div>
      <div class="bcp-flow">
        <div class="on"><b>1</b><span>계획 요약 확인</span></div>
        <div class="${state.status === '확정완료' || state.erpStatus === '전송완료' ? 'on' : ''}"><b>2</b><span>예산 확정</span></div>
        <div class="${state.erpStatus === '전송완료' ? 'on' : ''}"><b>3</b><span>ERP 전송/팀장 메일</span></div>
      </div>
      <div class="bcp-mail-card">
        <div><span>메일 수신</span><strong>${state.mailTo}</strong></div>
        <div><span>메일 상태</span><strong>${state.mailStatus}</strong></div>
        <div><span>확정일시</span><strong>${state.confirmedAt || '-'}</strong></div>
        <div><span>ERP 전송일시</span><strong>${state.sentAt || '-'}</strong></div>
      </div>
      <div class="bcp-table-wrap">
        <table class="bcp-table">
          <thead>
            <tr>
              <th rowspan="2">구분</th>
              <th colspan="3">실행예산</th>
              <th rowspan="2">ERP 실적<br>(누계)</th>
              <th colspan="3">잔여예산</th>
            </tr>
            <tr>
              <th>변경전(A)</th><th>변경후(B)</th><th>증감(B-A)</th>
              <th>변경전(A)</th><th>변경후(B)</th><th>증감(B-A)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="bcp-actions">
        <button class="labor-sub-btn" onclick="budgetDetailStep='setup';renderBudgetPage()">계획 다시 보기</button>
        <button class="labor-main-btn" onclick="confirmBudgetVersion()">예산 확정</button>
        <button class="labor-main-btn teal" onclick="sendBudgetToErp()">ERP 전송 및 팀장 메일</button>
      </div>
    </div>`;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  // 상단 배너는 하단 계정별 예산내역 표의 합계를 그대로 씁니다(같은 화면에서 숫자가 갈리지 않게).
  //   계획예산 = Σ 계정 계획, 실집행+투입확정 = Σ "실적/확정", 투입미정 = Σ 잔여예산
  const bnr = budgetBannerTotalsFinal(data, actual, quasi);
  const totBudget = bnr.budget, totActual = bnr.actual, totQuasi = bnr.quasi, totRemain = bnr.remain;

  const setupBody = renderBudgetSetupOverview(data, actual, quasi);

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='overview';renderBudgetPage()">← 목록으로</button>
    ${SHOW_TOTAL_BUDGET_BAR_FINAL ? renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage) : ''}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">전체 프로젝트 계획 요약과 상세 계정 계획을 확인한 뒤 예산을 확정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : setupBody}
  `;
}

var materialDepreciationPlans = [
  { id:'dep-001', asset:'개발서버 장비 감가상각', start:'2026-07', end:'2027-06', monthly:2600000, status:'계획', note:'개발/테스트 서버 자산 월상각' },
  { id:'dep-002', asset:'테스트 자동화 라이선스 상각', start:'2026-09', end:'2027-11', monthly:1800000, status:'계획', note:'프로젝트 전용 라이선스 상각' },
];
var editingDepreciationPlanId = null;

function getAccountDetailRows(account) {
  if (account === CATS[0]) return [
    { name:'실투입인건비', ratio:.72 },
    { name:'이관인건비', ratio:.18 },
    { name:'증업일급여-OT', ratio:.10 },
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
  ];
  return [
    { name:'통제 경비', ratio:.64 },
    { name:'비통제 경비', ratio:.24 },
    { name:'A/S Cost', ratio:.12 },
  ];
}

function getMonthAccountValue(monthData, account) {
  const bucket = monthData?.[account] || {};
  return monthData.type === 'actual' ? (bucket.a || 0) : ((bucket.q || 0) || (bucket.p || 0));
}

function getDepreciationAmountForMonth(month) {
  return materialDepreciationPlans.reduce((sum, row) => {
    if (month >= row.start && month <= row.end) return sum + (row.monthly || 0);
    return sum;
  }, 0);
}

function getMonthlyBudgetRows(data, account) {
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  return getAccountDetailRows(account).map(detail => {
    const months = data.months.map(mo => {
      const base = getMonthAccountValue(mo, account);
      if (account === CATS[2]) {
        const depreciation = getDepreciationAmountForMonth(mo.m);
        return detail.name === '감가상각비' ? depreciation : Math.max(base - depreciation, 0);
      }
      return Math.round(base * detail.ratio);
    });
    const plan = account === CATS[2]
      ? (detail.name === '감가상각비'
          ? months.reduce((s, v) => s + v, 0)
          : Math.max(totalPlan - months.reduce((s, v) => s + v, 0), 0))
      : Math.round(totalPlan * detail.ratio);
    const actual = account === CATS[2]
      ? (detail.name === '감가상각비' ? 0 : totalActual)
      : Math.round(totalActual * detail.ratio);
    return { name:detail.name, plan, actual, remain:Math.max(plan - actual, 0), months };
  });
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
      ${row.months.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
    </tr>`).join('');

  return `
    <div class="account-monthly-card">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-main-btn teal">${account} 실적조회</button>
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
              ${monthTotals.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="account-monthly-note">※ 7월 이전은 실적(확정) 기준, 이후는 현재 수립된 계획 기준으로 표시됩니다.</p>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적등록/납기', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'감가상각비', desc:'자산/라이선스 월상각', active:materialKind === 'depreciation', action:"switchMaterialKind('depreciation')" },
    { step:'03', label:'기타재료비', desc:'이관/임시/기타', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ], 'material');
}

function renderMaterialDepreciationPanel() {
  const editing = materialDepreciationPlans.find(r => r.id === editingDepreciationPlanId);
  const rows = materialDepreciationPlans.map(row => `
    <tr>
      <td>${row.asset}</td>
      <td>${row.start} ~ ${row.end}</td>
      <td class="num">${fmt(row.monthly)}원</td>
      <td>${row.status}</td>
      <td>${row.note}</td>
      <td><button class="labor-sub-btn" onclick="editDepreciationPlan('${row.id}')">수정</button></td>
    </tr>`).join('');

  return `
    <div class="material-dep-grid">
      <div class="material-dep-list">
        <div class="labor-section-title">등록된 감가상각 계획</div>
        <table class="material-dep-table">
          <thead><tr><th>자산/비용명</th><th>상각기간</th><th>월상각액</th><th>상태</th><th>설명</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="material-dep-form">
        <div class="labor-section-title">${editing ? '감가상각비 수정' : '감가상각비 등록'}</div>
        <div class="os-form-grid">
          <label class="wide"><span>자산/비용명</span><input id="dep-asset" value="${editing ? editing.asset : ''}" placeholder="예: 개발서버 장비 감가상각"></label>
          <label><span>시작월</span><input id="dep-start" type="month" value="${editing ? editing.start : '2026-07'}"></label>
          <label><span>종료월</span><input id="dep-end" type="month" value="${editing ? editing.end : '2027-11'}"></label>
          <label><span>월상각액</span><input id="dep-monthly" inputmode="numeric" value="${editing ? editing.monthly : ''}" placeholder="예: 2500000"></label>
          <label class="wide"><span>설명</span><textarea id="dep-note" rows="3" placeholder="예: 견적 데이터 기반 라이선스 월상각">${editing ? editing.note : ''}</textarea></label>
        </div>
        <div class="os-form-actions">
          <button class="labor-main-btn" onclick="saveDepreciationPlan()">${editing ? '수정 저장' : '감가상각비 등록'}</button>
          ${editing ? `<button class="labor-sub-btn" onclick="editingDepreciationPlanId=null;renderBudgetPage()">취소</button>` : ''}
        </div>
      </div>
    </div>`;
}

