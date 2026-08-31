/* ============================================================
   [budget-status 분할본 2/5] — 로드 순서 필수(앞 파트 뒤에 로드)
   원본 budget-status.js를 병렬작업용으로 5분할. 전역 스코프 공유.
   주요 영역: 재료비 아이템/할당 + 외주비(outsource) 등록·계약·PO
   ============================================================ */
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

// Final outsource rebuild override - keep this block at EOF so older mock variants cannot overwrite it.
var BPO_OUTSOURCE_KINDS_V2 = [
  { id:'direct', no:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'professional', no:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', no:'03', label:'외주출장비', desc:'출장비/집행월' },
  { id:'construction', no:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', no:'05', label:'이관외주비', desc:'이관월/금액/사유' },
  { id:'other', no:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

var bpoFormOpenV2 = false;
var bpoEditingIdV2 = null;
var bpoQuoteConfirmedV2 = 'Y';
var bpoSelectedQuoteV2 = 'Q-202607-001';
var bpoPoPopupOpenV2 = false;
var bpoMaQuoteNoV2 = 'MA-Q-202607-001';
var bpoInspectionFilterV2 = { month:'', grade:'', voucher:'' };
var bpoMonthlyCostReadyV2 = { direct:false, professional:false };
var bpoInspectionAdjustKindV2 = 'direct';

var bpoVendorRowsV2 = [
  { id:'bp', name:'BP Korea', owner:'최성훈', grade:'A', specialty:'Java/Vue/Oracle' },
  { id:'mirae', name:'미래정보기술', owner:'박지훈', grade:'A-', specialty:'전문직 컨설팅' },
  { id:'global', name:'Global AX Partners', owner:'Tran Minh', grade:'B+', specialty:'운영/유지보수' },
];

var bpoQuoteRowsV2 = {
  direct: [
    { quoteNo:'Q-202607-001', vendor:'BP Korea', contract:'예산관리시스템 구축 실투입 외주', poNo:'4500123456', start:'2026-09-01', end:'2027-10-31', amount:675350000, status:'견적확정' },
  ],
  professional: [
    { quoteNo:'Q-202607-901', vendor:'미래정보기술', contract:'전문직수수료/제안/기타 계획', poNo:'4500987654', start:'2026-08-01', end:'2026-12-31', amount:125000000, status:'견적확정' },
  ],
};

var bpoDirectQuoteDetailsV2 = [
  { workType:'개발/운영', grade:'특급기술자', start:'2026-09-01', end:'2027-03-31', mm:7.000, amount:77000000 },
  { workType:'개발/운영', grade:'고급기술자-상', start:'2026-09-01', end:'2027-03-31', mm:27.300, amount:259350000 },
  { workType:'개발/운영', grade:'고급기술자-하', start:'2026-11-01', end:'2027-10-31', mm:37.000, amount:339000000 },
];

var bpoProfessionalQuoteDetailsV2 = [
  { role:'PMO', start:'2026-08-01', end:'2026-12-31', assignType:'Full', people:1, mm:5.0, amount:55000000 },
  { role:'제안전략', start:'2026-08-01', end:'2026-10-31', assignType:'Part', people:2, mm:3.0, amount:36000000 },
  { role:'품질검토', start:'2026-09-01', end:'2026-12-31', assignType:'Part', people:1, mm:2.5, amount:34000000 },
];

var bpoDirectPlansV2 = [
  { id:'dir-1', vendor:'BP Korea', contract:'예산관리시스템 구축 실투입 외주', period:'2026.09 ~ 2027.10', amount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료' },
  { id:'dir-2', vendor:'Vietnam Front Team', contract:'Vue 화면 개발 1차', period:'2026.08 ~ 2027.02', amount:240000000, quoteNo:'Q-202607-002', poNo:'', status:'계획작성중' },
];

var bpoProfessionalPlansV2 = [
  { id:'pro-1', vendor:'미래정보기술', contract:'전문직수수료/제안/기타 계획', period:'2026.08 ~ 2026.12', amount:125000000, quoteNo:'Q-202607-901', poNo:'4500987654', status:'계획확정' },
];

var bpoTravelPlansV2 = [
  { id:'tr-1', requestNo:'7000003088', status:'요청', contractNo:'4500311570', buyer:'최성훈', person:'이승우 차장', detail:'Wuxi 출장', month:'2026-08', amount:4935405, air:831000, hotel:1654163, traffic:0, day:2285242, etc:165000, etcText:'비자수수료', actualized:false },
  { id:'tr-2', requestNo:'7000003112', status:'계획', contractNo:'4500123456', buyer:'최성훈', person:'김도윤 책임', detail:'베트남 개발센터 점검', month:'2026-10', amount:3280000, air:1200000, hotel:980000, traffic:250000, day:700000, etc:150000, etcText:'통역지원', actualized:false },
];

var bpoTransferPlansV2 = [
  { id:'tf-1', direction:'Receiver Project', month:'2026-09', amount:12000000, reason:'타 프로젝트 잔여 외주비 이관 수취', status:'계획' },
  { id:'tf-2', direction:'Sender Project', month:'2026-07', amount:-4500000, reason:'공통 개발센터 비용 타 프로젝트 배부', status:'집행완료' },
];

var bpoOtherPlansV2 = [
  { id:'ot-1', month:'2026-10', amount:6800000, description:'단기 기술지원 외주비 계획', status:'계획', actualized:false },
  { id:'ot-2', month:'2027-02', amount:4500000, description:'고객사 검수 대응 기타 외주성 비용', status:'계획', actualized:false },
];

var bpoMaQuoteRowsV2 = [
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-01-01', end:'2026-03-31', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-04-01', end:'2026-06-30', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-07-01', end:'2026-09-30', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-10-01', end:'2026-12-31', cycle:'분기', unitPrice:870000, amount:870000 },
];

var bpoMaPlansV2 = [
  { id:'ma-1', vendor:'BP Korea', contract:'AI 원가관리 모듈 MA', quoteNo:'MA-Q-202607-001', period:'2026.01 ~ 2026.12', amount:3480000 },
  { id:'ma-2', vendor:'Global AX Partners', contract:'운영 안정화 MA', quoteNo:'MA-Q-202607-002', period:'2026.07 ~ 2027.06', amount:96000000 },
];

function bpoWonV2(value) {
  return `${fmt(Number(value || 0))}원`;
}

function bpoMonthRangeByDateV2(start, end) {
  if (typeof monthRangeByDate === 'function') return monthRangeByDate(start, end);
  const months = [];
  let d = new Date(`${start.slice(0, 7)}-01T00:00:00`);
  const e = new Date(`${end.slice(0, 7)}-01T00:00:00`);
  while (d <= e) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function bpoKindMetaV2(kind = outsourceKind) {
  return BPO_OUTSOURCE_KINDS_V2.find(item => item.id === kind) || BPO_OUTSOURCE_KINDS_V2[0];
}

function switchBpoKindV2Final(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS_V2.some(item => item.id === kind) ? kind : 'direct';
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  renderBudgetPage();
}

function renderBpoKindTabsV2Final() {
  return `
    <div class="cost-category-board bpo-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>외주비 상세 계정을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
        <b>견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</b>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
        ${BPO_OUTSOURCE_KINDS_V2.map(item => `
          <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchBpoKindV2Final('${item.id}')">
            <em>${item.no}</em>
            <strong>${item.label}</strong>
            <span>${item.desc}</span>
            ${outsourceKind === item.id ? '' : ''}
          </button>`).join('')}
      </div>
    </div>`;
}

// [외주비 진입 패널 renderBpoOutsourcePanelFinal + 편집기 진입점은 budget-area-outsource.js로 이관되었습니다]

function bpoOpenNewV2(kind = outsourceKind) {
  outsourceKind = kind || 'direct';
  bpoFormOpenV2 = true;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  if (outsourceKind === 'direct' || outsourceKind === 'professional') bpoMonthlyCostReadyV2[outsourceKind] = false;
  renderBudgetPage();
}

function bpoEditV2(kind, id) {
  outsourceKind = kind || outsourceKind;
  bpoFormOpenV2 = true;
  bpoEditingIdV2 = id || null;
  renderBudgetPage();
}

function bpoCloseFormV2() {
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  bpoMonthlyCostReadyV2.direct = false;
  bpoMonthlyCostReadyV2.professional = false;
  renderBudgetPage();
}

function switchOutsourceKind(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS_V2.some(item => item.id === kind) ? kind : 'direct';
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  renderBudgetPage();
}

function renderOutsourceKindTabs() {
  return `
    <div class="cost-category-board bpo-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>외주비 상세 계정을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
        <b>견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</b>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
        ${BPO_OUTSOURCE_KINDS_V2.map(item => `
          <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
            <em>${item.no}</em>
            <strong>${item.label}</strong>
            <span>${item.desc}</span>
            ${outsourceKind === item.id ? '' : ''}
          </button>`).join('')}
      </div>
    </div>`;
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  const meta = bpoKindMetaV2();
  return `
    <div class="outsource-panel bpo-panel">
      <div class="labor-panel-head bpo-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle || meta.desc}</span>
        </div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail bpo-detail">
        <div class="bpo-detail-title">
          <div>
            <div class="cost-selected-title">${title}</div>
            <span>선택한 상세계정의 신규 계획을 등록하거나 기존 내역을 수정합니다.</span>
          </div>
          <button class="labor-main-btn" onclick="bpoOpenNewV2('${outsourceKind}')">신규등록</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderOutsourceContractPanel(data) {
  const meta = bpoKindMetaV2();
  if (outsourceKind === 'direct') return renderOutsourceShell('실투입대상 외주비 계획 등록', meta.desc, renderBpoContractPanelV2('direct'));
  if (outsourceKind === 'professional') return renderOutsourceShell('전문직수수료/제안/기타 계획 등록', meta.desc, renderBpoContractPanelV2('professional'));
  if (outsourceKind === 'travel') return renderOutsourceShell('외주출장비 계획 등록', meta.desc, renderBpoTravelPanelV2());
  if (outsourceKind === 'construction') return renderOutsourceShell('공사MA 계획 등록', meta.desc, renderBpoMaPanelV2());
  if (outsourceKind === 'transfer') return renderOutsourceShell('이관외주비 계획 등록', meta.desc, renderBpoTransferPanelV2());
  return renderOutsourceShell('기타외주비 계획 등록', meta.desc, renderBpoOtherPanelV2());
}

function renderBpoListTableV2(kind, rows) {
  const headers = kind === 'travel'
    ? ['요청번호','계약번호','출장내역','집행예정월','출장금액','상태','']
    : kind === 'transfer'
      ? ['구분','이관예정월','계획금액','사유','상태','']
      : kind === 'other'
        ? ['집행예정월','계획금액','설명','상태','']
        : kind === 'construction'
          ? ['업체/계약명','계약기간','계약금액','견적번호','']
          : ['업체 / 계약명','계약기간','계약금액','견적번호','PO번호','상태',''];
  const body = rows.map(row => {
    if (kind === 'travel') return `<tr><td>${row.requestNo}</td><td>${row.contractNo}</td><td>${row.detail}</td><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('travel','${row.id}')">수정</button></td></tr>`;
    if (kind === 'transfer') {
      const locked = row.direction === 'Sender Project' || row.status === '집행완료';
      return `<tr><td>${row.direction}</td><td>${row.month}</td><td class="num ${row.amount < 0 ? 'danger' : 'good'}">${bpoWonV2(row.amount)}</td><td>${row.reason}</td><td>${row.status}</td><td>${locked ? '<span class="bpo-readonly-text">조회</span>' : `<button class="labor-sub-btn" onclick="bpoEditV2('transfer','${row.id}')">수정</button>`}</td></tr>`;
    }
    if (kind === 'other') return `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.description}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('other','${row.id}')">수정</button></td></tr>`;
    if (kind === 'construction') return `<tr><td><b>${row.vendor}</b><br><span>${row.contract}</span></td><td>${row.period}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.quoteNo}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('construction','${row.id}')">수정</button></td></tr>`;
    return `<tr><td><b>${row.vendor}</b><br><span>${row.contract}</span></td><td>${row.period}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.quoteNo}</td><td>${row.poNo || '-'}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('${kind}','${row.id}')">수정</button></td></tr>`;
  }).join('');
  return `
    <div class="bpo-list-card">
      <table class="bpo-list-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${body || `<tr><td colspan="${headers.length}" class="labor-empty">등록된 계획이 없습니다.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function renderBpoContractPanelV2(kind) {
  const isProfessional = kind === 'professional';
  const rows = isProfessional ? bpoProfessionalPlansV2 : bpoDirectPlansV2;
  const form = bpoFormOpenV2 ? renderBpoContractFormV2(kind) : '';
  return `
    ${renderBpoListTableV2(kind, rows)}
    ${form}`;
}

function bpoSelectedQuoteV2(kind) {
  const quoteNo = kind === 'professional' ? 'Q-202607-901' : bpoSelectedQuoteV2;
  const pool = kind === 'professional' ? bpoQuoteRowsV2.professional : bpoQuoteRowsV2.direct;
  return pool.find(q => q.quoteNo === quoteNo) || pool[0];
}

function renderBpoContractFormV2(kind) {
  const isProfessional = kind === 'professional';
  const title = isProfessional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입대상 외주 계약 등록';
  const quote = isProfessional ? bpoQuoteRowsV2.professional[0] : bpoQuoteRowsV2.direct[0];
  const readonly = bpoQuoteConfirmedV2 === 'Y' ? 'readonly' : '';
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head">
        <div><strong>${title}</strong><span>견적 확정 여부를 먼저 선택한 뒤 계획을 수립합니다.</span></div>
        <button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button>
      </div>
      <div class="bpo-choice-line">
        <span>1. 견적선정 여부</span>
        <label><input type="radio" name="bpo-quote-yn" value="Y" ${bpoQuoteConfirmedV2 === 'Y' ? 'checked' : ''} onchange="bpoSetQuoteConfirmedV2('Y')"> Y</label>
        <label><input type="radio" name="bpo-quote-yn" value="N" ${bpoQuoteConfirmedV2 === 'N' ? 'checked' : ''} onchange="bpoSetQuoteConfirmedV2('N')"> N</label>
      </div>
      <div class="bpo-contract-grid">
        <label><span>업체명</span><input value="${quote.vendor}" ${readonly}></label>
        <label><span>계약명</span><input value="${quote.contract}" ${readonly}></label>
        <label><span>계약기간</span><input value="${quote.start} ~ ${quote.end}" ${readonly}></label>
        <label><span>계약금액</span><input value="${bpoWonV2(quote.amount)}" ${readonly}></label>
        <label><span>견적번호</span><div class="bpo-input-button"><input value="${quote.quoteNo}" ${readonly}><button title="구매시스템 견적 검색">⌕</button></div></label>
        <label><span>PO번호</span><input value="${quote.poNo || '-'}" ${readonly}></label>
      </div>
      ${renderBpoQuoteBreakdownV2(kind)}
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function bpoSetQuoteConfirmedV2(value) {
  bpoQuoteConfirmedV2 = value === 'N' ? 'N' : 'Y';
  renderBudgetPage();
}

function renderBpoQuoteBreakdownV2(kind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const quoteTotal = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '견적 총액을 기간 내 월별로 N분할하고 확정금액을 직접 보정합니다.' : '견적 산출내역 기준으로 월별 원가 등록대상 금액을 계산합니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showBpoInspectionAdjustV2('${kind}')">월별 검수계획금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead>
            <tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액(VAT별도)'] : ['업무구분','기술등급','투입시작일','투입종료일','투입MM','견적금액(VAT별도)']).map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${quoteRows.map(row => isProfessional
              ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${row.mm.toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
              : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${row.mm.toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="${isProfessional ? 6 : 5}">합계</td><td class="num">${bpoWonV2(quoteTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="os-inspection-title">월별 원가 등록 대상 <em>월별 1줄 기준</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr>${(isProfessional ? ['검수월','월별 원가금액','검수금액'] : ['검수월','월별 원가금액','실투입 전표번호','검수상태']).map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${monthly.map(row => isProfessional
              ? `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
              : `<tr><td><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`).join('')}
            <tr class="total"><td>합계</td><td class="num">${bpoWonV2(monthly.reduce((s,r)=>s+r.amount,0))}</td><td colspan="${isProfessional ? 1 : 2}"></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderBpoQuoteBreakdownV2(kind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const monthlyCostReady = bpoMonthlyCostReadyV2[isProfessional ? 'professional' : 'direct'];
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '견적 총액을 월별 금액으로 배분하고 확정금액을 직접 보정합니다.' : '견적 산출내역을 월 단위 금액으로 풀어 확인하고, 월별 확정금액을 보정합니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showBpoInspectionAdjustV2('${kind}')">월별 검수계획금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead>
            <tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액(VAT별도)'] : ['업무구분','기술등급','투입시작일','투입종료일','투입MM','견적금액(VAT별도)']).map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${quoteRows.map(row => isProfessional
              ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${Number(row.mm).toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
              : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${Number(row.mm).toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="${isProfessional ? 6 : 5}">합계</td><td class="num">${bpoWonV2(quoteTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      ${monthlyCostReady ? `
        <div class="os-inspection-title">월별 원가 등록 대상 <em>${isProfessional ? '월별 금액 기준' : '월별 검수계획금액 확정 후 조회'}</em></div>
        <div class="bpo-table-scroll">
          <table class="bpo-list-table">
            <thead><tr>${(isProfessional ? ['검수월','기본 배분금액','확정금액','검수금액'] : ['검수월','월별 원가금액','실투입 전표번호','검수상태']).map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${monthly.map(row => {
                const confirmed = Number(row.confirmedAmount || row.amount || 0);
                return isProfessional
                  ? `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(confirmed)}</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
                  : `<tr><td><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></td><td class="num">${bpoWonV2(confirmed)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`;
              }).join('')}
              <tr class="total"><td>합계</td><td class="num">${bpoWonV2(monthly.reduce((s,r)=>s+Number(r.confirmedAmount || r.amount || 0),0))}</td><td colspan="${isProfessional ? 2 : 2}"></td></tr>
            </tbody>
          </table>
        </div>`
        : `<div class="bpo-cost-pending">
            <strong>월별 원가 등록 대상은 아직 생성되지 않았습니다.</strong>
            <span>[월별 검수계획금액 확정] 버튼을 눌러 견적 산출내역을 월별로 확정하면 아래에 월별 원가 등록 대상 표가 조회됩니다.</span>
          </div>`}
    </div>`;
}

function bpoDirectMonthlyRowsV2() {
  const months = ['2026-09','2026-10','2026-11','2026-12'];
  const amounts = [48050000, 48050000, 76300000, 76300000];
  return months.map((month, idx) => ({ month, amount:amounts[idx], voucher: idx === 0 ? '880012345' : '', status: idx === 0 ? '검수완료' : '미완료' }));
}

function bpoProfessionalMonthlyRowsV2() {
  const months = ['2026-08','2026-09','2026-10','2026-11','2026-12'];
  return months.map(month => ({ month, amount:25000000, inspectionAmount:0, ratio:20 }));
}

function bpoDirectMonthlyRowsV2() {
  const grouped = {};
  bpoDirectQuoteDetailsV2.forEach(row => {
    const months = bpoMonthRangeByDateV2(row.start, row.end);
    const monthlyAmount = months.length ? Math.round(Number(row.amount || 0) / months.length) : Number(row.amount || 0);
    months.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, amount:0, confirmedAmount:0, details:[], voucher:'', status:'미완료' };
      grouped[month].amount += monthlyAmount;
      grouped[month].confirmedAmount += monthlyAmount;
      grouped[month].details.push({ ...row, monthlyAmount });
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

function showBpoMonthDetailV2(month) {
  const rows = bpoDirectQuoteDetailsV2.map((row, idx) => ({
    ...row,
    month,
    amount: idx < 2 && ['2026-09','2026-10'].includes(month) ? Math.round(row.amount / 7) : Math.round(row.amount / 12),
    voucher: month === '2026-09' ? '880012345' : '',
    status: month === '2026-09' ? '검수완료' : '미완료',
  }));
  let modal = document.getElementById('bpo-month-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bpo-month-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head"><strong>${month} 검수계획 상세</strong><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">×</button></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>업무구분</th><th>기술등급</th><th>MM</th><th>금액</th><th>실투입 전표번호</th><th>검수상태</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.mm.toFixed(2)}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  bpoInspectionAdjustKindV2 = kind || outsourceKind || 'direct';
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head">
        <strong>월별 검수계획금액 확정</strong>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="bpo-modal-summary">
        <b>견적내용</b>
        <span>견적번호 ${isProfessional ? 'Q-202607-901' : 'Q-202607-001'} · 총액 ${bpoWonV2(quoteRows.reduce((s,r)=>s+r.amount,0))}</span>
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table compact">
          <thead><tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액'] : ['업무구분','기술등급','시작일','종료일','MM','견적금액']).map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${quoteRows.map(row => isProfessional
            ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${row.mm.toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
            : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${row.mm.toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="bpo-filter-row">
        <label>검수월 <select onchange="filterBpoInspectionRowsV2(this.value)"><option value="">전체</option>${monthly.map(r=>`<option>${r.month}</option>`).join('')}</select></label>
        ${isProfessional ? '<label>검수금액 <select><option>전체</option><option>0원</option></select></label>' : '<label>실투입 생성여부 <select><option>전체</option><option>880012345</option><option>N</option></select></label>'}
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr>${(isProfessional ? ['월','기본 배분금액','확정금액','비중','검수금액'] : ['검수월','실투입 생성여부','MM','확정금액','검수상태']).map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody id="bpo-inspection-adjust-rows">
            ${monthly.map(row => isProfessional
              ? `<tr data-month="${row.month}"><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td><input value="${row.amount}" inputmode="numeric"></td><td>${row.ratio}%</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
              : `<tr data-month="${row.month}"><td>${row.month}</td><td>${row.voucher || 'N'}</td><td><input ${row.voucher ? 'disabled' : ''} value="${row.month === '2026-09' ? '4.90' : '7.98'}"></td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.status}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button class="labor-main-btn" onclick="bpoConfirmInspectionV2()">저장 및 확정</button></div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>${isProfessional ? '전문직수수료/제안/기타' : '실투입대상 외주비'}</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${isProfessional ? 'Q-202607-901' : 'Q-202607-001'}</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 내용</div>
        <div class="os-inspection-table quote ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>시작일</span><span>종료일</span><span>총MM</span><span>견적금액</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span>`
                : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span>`}
            </div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 확정</div>
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRowsV2(this.value)">
            <option value="">월 전체</option>
            ${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}
          </select>
          ${isProfessional
            ? '<select><option>검수금액 전체</option><option>0원</option></select>'
            : '<select><option>실투입 생성여부 전체</option><option>880012345</option><option>N</option></select>'}
        </div>
        <div class="os-inspection-table plan monthly-cost ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}
          </div>
          <div id="bpo-inspection-adjust-rows">
            ${monthly.map(row => `
              <div class="os-inspection-row" data-month="${row.month}">
                ${isProfessional
                  ? `<span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span>`
                  : `<span>${row.month}</span><span>${row.voucher || 'N'}</span><span><input class="restore-amount-input" ${row.voucher ? 'disabled' : ''} value="${row.month === '2026-09' ? '4.90' : '7.98'}"></span><span>${bpoWonV2(row.amount)}</span><span>${row.status}</span>`}
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>${isProfessional ? '전문직수수료/제안/기타' : '실투입대상 외주비'}</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${isProfessional ? 'Q-202607-901' : 'Q-202607-001'}</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '월별 금액 직접 보정' : '견적 월배분 금액 직접 보정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 산출내역</div>
        <div class="os-inspection-table quote ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span>`
                : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span>`}
            </div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 검수계획금액 확정</div>
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRowsV2(this.value)">
            <option value="">월 전체</option>
            ${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}
          </select>
          ${isProfessional
            ? '<select><option>검수금액 전체</option><option>0원</option></select>'
            : '<select><option>실투입 생성여부 전체</option><option>N</option><option>880012345</option></select>'}
        </div>
        <div class="os-inspection-table plan monthly-cost ${isProfessional ? 'professional' : 'direct-amount'}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>견적기준 월금액</span><span>확정금액</span><span>실투입 생성여부</span><span>검수상태</span>'}
          </div>
          <div id="bpo-inspection-adjust-rows">
            ${monthly.map(row => {
              return `
                <div class="os-inspection-row" data-month="${row.month}">
                  ${isProfessional
                    ? `<span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span>`
                    : `<span><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" ${row.voucher ? 'disabled' : ''} value="${row.confirmedAmount || row.amount}" inputmode="numeric"></span><span>${row.voucher || 'N'}</span><span>${row.status}</span>`}
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBpoMonthDetailV2(month) {
  const summary = bpoDirectMonthlyRowsV2().find(row => row.month === month);
  const rows = summary ? summary.details : [];
  const total = rows.reduce((sum, row) => sum + Number(row.monthlyAmount || 0), 0);
  let modal = document.getElementById('bpo-month-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bpo-month-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head">
        <strong>${month} 견적기준 월금액 상세</strong>
        <button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>업무구분</th><th>기술등급</th><th>투입기간</th><th>견적MM</th><th>견적총액</th><th>해당월 금액</th></tr></thead>
          <tbody>
            ${rows.map(row => `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start} ~ ${row.end}</td><td>${Number(row.mm).toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(row.monthlyAmount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="5">합계</td><td class="num">${bpoWonV2(total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function filterBpoInspectionRowsV2(month) {
  document.querySelectorAll('#bpo-inspection-adjust-rows [data-month]').forEach(row => {
    row.style.display = !month || row.dataset.month === month ? '' : 'none';
  });
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  showToast('월별 검수계획금액이 저장 및 확정되었습니다.');
  renderBudgetPage();
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  showToast('월별 검수계획금액이 확정되었습니다.');
  renderBudgetPage();
}

function bpoDirectInspectionRowsFromQuoteV22() {
  const rows = [];
  bpoDirectQuoteDetailsV2.forEach((quote, quoteIndex) => {
    const months = bpoMonthRangeByDateV2(quote.start, quote.end);
    const monthlyMm = months.length ? Number(quote.mm || 0) / months.length : Number(quote.mm || 0);
    const monthlyAmount = months.length ? Math.round(Number(quote.amount || 0) / months.length) : Number(quote.amount || 0);
    months.forEach((month, monthIndex) => {
      const hasVoucher = quoteIndex === 0 && monthIndex === 0;
      rows.push({
        key: `${quoteIndex}-${month}`,
        month,
        workType: quote.workType,
        grade: quote.grade,
        quoteStart: quote.start,
        quoteEnd: quote.end,
        quoteMm: Number(quote.mm || 0),
        quoteAmount: Number(quote.amount || 0),
        monthMm: Math.round(monthlyMm * 100) / 100,
        monthAmount: monthlyAmount,
        confirmedAmount: monthlyAmount,
        voucher: hasVoucher ? '880012345' : '',
        inspectionStatus: hasVoucher ? '검수완료' : '미완료',
      });
    });
  });
  return rows.sort((a, b) => a.month.localeCompare(b.month) || a.grade.localeCompare(b.grade));
}

function filterBpoInspectionRowsV22() {
  const work = (document.getElementById('bpo-filter-work')?.value || '').toLowerCase();
  const grade = (document.getElementById('bpo-filter-grade')?.value || '').toLowerCase();
  const month = (document.getElementById('bpo-filter-month')?.value || '').toLowerCase();
  const voucher = document.getElementById('bpo-filter-voucher')?.value || '';
  const status = document.getElementById('bpo-filter-status')?.value || '';
  document.querySelectorAll('#bpo-inspection-adjust-rows [data-os-adjust-row]').forEach(row => {
    const matchesWork = !work || row.dataset.work === work;
    const matchesGrade = !grade || row.dataset.grade === grade;
    const matchesMonth = !month || row.dataset.month === month;
    const matchesVoucher = !voucher || (voucher === '88' ? row.dataset.voucher.startsWith('88') : row.dataset.voucher === 'n');
    const matchesStatus = !status || row.dataset.status === status;
    row.style.display = matchesWork && matchesGrade && matchesMonth && matchesVoucher && matchesStatus ? '' : 'none';
  });
}

function recalcBpoInspectionAmountV22(input) {
  const row = input.closest('[data-os-adjust-row]');
  if (!row) return;
  const unit = Number(row.dataset.unit || 0);
  const mm = Math.max(0, Number(input.value || 0));
  const amount = Math.round(unit * mm);
  const amountEl = row.querySelector('[data-confirmed-amount]');
  if (amountEl) amountEl.textContent = bpoWonV2(amount);
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  if (isProfessional) {
    const quoteRows = bpoProfessionalQuoteDetailsV2;
    const monthly = bpoProfessionalMonthlyRowsV2();
    const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    let modal = document.getElementById('outsource-inspection-adjust-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'outsource-inspection-adjust-modal';
      modal.className = 'aipmo-link-overlay';
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
        <div class="labor-process-guide-head">
          <div><span>전문직수수료/제안/기타</span><strong>월별 검수계획금액 확정</strong></div>
          <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
        </div>
        <div class="labor-process-guide-body">
          <div class="os-adjust-summary">
            <div><span>견적번호</span><strong>Q-202607-901</strong></div>
            <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
            <div><span>보정방식</span><strong>금액 직접 보정</strong></div>
          </div>
          <div class="os-inspection-title">견적 산출내역</div>
          <div class="os-inspection-table quote professional">
            <div class="os-inspection-row head"><span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span></div>
            ${quoteRows.map(row => `<div class="os-inspection-row"><span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span></div>`).join('')}
          </div>
          <div class="os-inspection-title">월별 확정</div>
          <div class="os-adjust-filterbar month-only">
            <label><span>검수월</span><select onchange="filterBpoInspectionRowsV2(this.value)"><option value="">전체</option>${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select></label>
          </div>
          <div class="os-inspection-table plan monthly-cost professional">
            <div class="os-inspection-row head"><span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span></div>
            <div id="bpo-inspection-adjust-rows">
              ${monthly.map(row => `<div class="os-inspection-row" data-month="${row.month}"><span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="labor-process-guide-actions"><button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button></div>
      </div>`;
    modal.classList.add('open');
    return;
  }

  const quoteRows = bpoDirectQuoteDetailsV2;
  const rows = bpoDirectInspectionRowsFromQuoteV22();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const baseTotal = rows.reduce((sum, row) => sum + Number(row.monthAmount || 0), 0);
  const workOptions = [...new Set(rows.map(row => row.workType))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  const gradeOptions = [...new Set(rows.map(row => row.grade))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  const monthOptions = [...new Set(rows.map(row => row.month))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>실투입대상 외주비</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>Q-202607-001</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>월별 배분합계</span><strong>${bpoWonV2(baseTotal)}</strong></div>
          <div><span>보정방식</span><strong>월 MM 보정 후 금액 자동산정</strong></div>
        </div>
        <div class="os-inspection-title">견적 산출내역</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액</span></div>
          ${quoteRows.map(row => `<div class="os-inspection-row"><span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span></div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 검수계획금액 확정</div>
        <div class="os-adjust-filterbar">
          <label><span>업무구분</span><select id="bpo-filter-work" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${workOptions}</select></label>
          <label><span>기술등급</span><select id="bpo-filter-grade" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${gradeOptions}</select></label>
          <label><span>검수월</span><select id="bpo-filter-month" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${monthOptions}</select></label>
          <label><span>실투입</span><select id="bpo-filter-voucher" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option><option value="88">전표 있음</option><option value="n">전표 없음</option></select></label>
          <label><span>검수상태</span><select id="bpo-filter-status" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option><option value="검수완료">검수완료</option><option value="미완료">미완료</option></select></label>
        </div>
        <div class="os-inspection-table plan monthly-cost">
          <div class="os-inspection-row head"><span>검수월</span><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수계획금액</span><span>실투입 전표</span><span>검수상태</span></div>
          <div id="bpo-inspection-adjust-rows">
            ${rows.map((row, index) => {
              const unit = row.monthMm ? Math.round(row.monthAmount / row.monthMm) : 0;
              return `
                <div class="os-inspection-row" data-os-adjust-row data-work="${row.workType.toLowerCase()}" data-grade="${row.grade.toLowerCase()}" data-month="${row.month.toLowerCase()}" data-voucher="${row.voucher ? row.voucher : 'n'}" data-status="${row.inspectionStatus}" data-base-amount="${row.monthAmount}" data-unit="${unit}">
                  <span>${row.month}</span>
                  <span>${row.workType}</span>
                  <span>${row.grade}</span>
                  <span><input class="restore-amount-input" value="${row.monthMm.toFixed(2)}" ${row.voucher ? 'disabled' : ''} oninput="recalcBpoInspectionAmountV22(this)"></span>
                  <span data-confirmed-amount>${bpoWonV2(row.confirmedAmount)}</span>
                  <span>${row.voucher || '-'}</span>
                  <span>${row.inspectionStatus}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="labor-sub-btn" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">닫기</button>
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  if (bpoInspectionAdjustKindV2 === 'direct' || bpoInspectionAdjustKindV2 === 'professional') {
    bpoMonthlyCostReadyV2[bpoInspectionAdjustKindV2] = true;
  }
  showToast('월별 검수계획금액이 저장 및 확정되었습니다. 월별 외주비 원가 등록 대상에 반영되었습니다.');
  renderBudgetPage();
}

function renderBpoTravelPanelV2() {
  return `${renderBpoListTableV2('travel', bpoTravelPlansV2)}${bpoFormOpenV2 ? renderBpoTravelFormV2() : ''}`;
}

function renderBpoTravelFormV2() {
  const row = bpoEditingIdV2 ? bpoTravelPlansV2.find(r => r.id === bpoEditingIdV2) : bpoTravelPlansV2[0];
  return `
    <div class="bpo-form-card full">
      <div class="bpo-form-head"><div><strong>외주출장비 계획 입력</strong><span>프로젝트에 매핑된 PO를 선택하고 출장비 확보 계획을 등록합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid wide travel-fields">
        <label><span>계약번호</span><div class="bpo-input-button"><input value="${row.contractNo || '4500311570'}"><button onclick="bpoTogglePoPopupV2()" title="PO 리스트 검색">⌕</button></div></label>
        <label><span>출장내역</span><input value="${row.detail || ''}" placeholder="예: Wuxi 출장"></label>
        <label><span>집행 예정월</span><input type="month" value="${row.month || '2026-08'}"></label>
        <label><span>출장금액</span><input value="${row.amount || ''}" placeholder="예: 4935405"></label>
      </div>
      ${bpoPoPopupOpenV2 ? renderBpoPoPopupInlineV2() : ''}
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function bpoTogglePoPopupV2() {
  bpoPoPopupOpenV2 = !bpoPoPopupOpenV2;
  renderBudgetPage();
}

function renderBpoPoPopupInlineV2() {
  const rows = ['4500311570','4500123456','4500987654'].map((po, idx) => ({ po, vendor:['BP Korea','BP Korea','미래정보기술'][idx], amount:[930300000,675350000,125000000][idx] }));
  return `<div class="bpo-popup-list"><strong>프로젝트 매핑 PO 리스트</strong>${rows.map(r=>`<button onclick="bpoPoPopupOpenV2=false;showToast('PO ${r.po}가 선택되었습니다.');renderBudgetPage()"><b>${r.po}</b><span>${r.vendor} · ${bpoWonV2(r.amount)}</span></button>`).join('')}</div>`;
}

function renderBpoTransferPanelV2() {
  return `
    <div class="bpo-rule-note">
      <strong>이관외주비 등록 기준</strong>
      <span>신규 계획 등록은 Receiver Project만 가능합니다. Sender Project는 타 시스템에서 집행이 완료된 뒤 이관 결과로 수신되어 리스트에서 조회만 가능합니다.</span>
    </div>
    ${renderBpoListTableV2('transfer', bpoTransferPlansV2)}
    ${bpoFormOpenV2 ? renderBpoTransferFormV2() : ''}`;
}

function renderBpoTransferFormV2() {
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>이관외주비 계획 입력</strong><span>신규 등록은 Receiver Project만 가능하며, Sender Project는 집행완료 후 조회 전용으로 반영됩니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid">
        <label><span>Project Type</span><input value="Receiver Project" readonly></label>
        <label><span>이관예정월</span><input type="month" value="2026-09"></label>
        <label><span>계획금액</span><input value="12000000"></label>
        <label><span>이관 사유</span><input value="타 프로젝트 잔여 외주비 이관"></label>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function renderBpoOtherPanelV2() {
  return `${renderBpoListTableV2('other', bpoOtherPlansV2)}${bpoFormOpenV2 ? `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>기타외주비 계획 입력</strong><span>실적 발생 전 계획만 수정 가능합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid">
        <label><span>집행예정월</span><input type="month" value="2026-10"></label>
        <label><span>계획금액</span><input value="6800000"></label>
        <label><span>예산 설명</span><input value="단기 기술지원 외주비 계획"></label>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>` : ''}`;
}

function renderBpoMaPanelV2() {
  return `${renderBpoListTableV2('construction', bpoMaPlansV2)}${bpoFormOpenV2 ? renderBpoMaFormV2() : ''}`;
}

function renderBpoMaFormV2() {
  const lockedRows = bpoMaQuoteRowsV2.map((row, idx) => ({ ...row, month:row.end.slice(0,7), inspected:idx === 0 }));
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>공사MA 계획 상세</strong><span>구매시스템에서 전송받은 견적데이터 중 선택해 계획을 수립합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-choice-line">
        <span>1. 견적 선택</span>
        <select onchange="bpoMaQuoteNoV2=this.value;renderBudgetPage()"><option>MA-Q-202607-001</option><option>MA-Q-202607-002</option></select>
      </div>
      <div class="os-inspection-title">2. 공사MA 계획 상세 <em>검수 이력이 있으면 검수집행월 수정 불가</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>표준품명</th><th>단위</th><th>수량</th><th>유지보수 시작일</th><th>유지보수 종료일</th><th>공급단가</th><th>검수집행월</th><th>검수여부</th></tr></thead>
          <tbody>${lockedRows.map(row => `<tr><td>${row.standard}</td><td>${row.unit}</td><td>${row.qty}</td><td>${row.start}</td><td>${row.end}</td><td class="num">${bpoWonV2(row.unitPrice)}</td><td><input type="month" value="${row.month}" ${row.inspected ? 'disabled' : ''}></td><td>${row.inspected ? '검수완료' : '미검수'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">최종확정</button></div>
    </div>`;
}

function bpoSaveMockV2() {
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  showToast('목업 계획이 등록되었습니다.');
  renderBudgetPage();
}

// ---------------------------------------------------------------------------
// Final outsource rebuild override
// ---------------------------------------------------------------------------
var BPO_OUTSOURCE_KINDS = [
  { id:'direct', step:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'indirect', step:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', step:'03', label:'외주출장비', desc:'출장비/집행월' },
  { id:'construction', step:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', step:'05', label:'이관외주비', desc:'Sender/Receiver' },
  { id:'other', step:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

var bpoOutsourceState = {
  mode: null,
  editId: null,
  selectedQuoteDirect: 'Q-202607-001',
  selectedQuoteIndirect: 'Q-202607-P01',
  selectedQuoteMa: 'Q-202607-MA01',
  vendorPopup: false,
  quotePopup: false,
  filterMonth: '',
};

var bpoOutsourceRows = {
  direct: [
    { id:'direct-001', vendorName:'BP Korea', title:'예산관리시스템 외주 실투입', startDate:'2026-09-01', endDate:'2027-03-31', amount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계획확정' },
  ],
  indirect: [
    { id:'indirect-001', vendorName:'NOVA Partners', title:'전문직수수료/제안/기타 계획', startDate:'2026-09-01', endDate:'2026-12-31', amount:102000000, quoteNo:'Q-202607-P01', poNo:'4500678901', status:'계획확정' },
  ],
  travel: [
    { id:'travel-001', requestNo:'7000003088', poNo:'4500311570', buyer:'최성훈', inputPerson:'이승우 차장', expectedMonth:'2026-08', amount:4935405, air:831000, lodging:1654163, traffic:0, daily:2285242, etc:165000, description:'Wuxi 출장', status:'계획' },
  ],
  construction: [
    { id:'ma-001', vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-MA01', amount:3480000, status:'계획확정' },
  ],
  transfer: [
    { id:'transfer-001', transferType:'Receiver Project', expectedMonth:'2026-11', amount:12000000, description:'타 프로젝트 잔여 외주비 이관', status:'계획' },
  ],
  other: [
    { id:'other-001', expectedMonth:'2027-02', amount:4500000, description:'검수 대응 외부 지원 비용', status:'계획' },
  ],
};

var bpoVendors = [
  { id:'bp', name:'BP Korea', owner:'김민재', grade:'A', specialty:'Java/Vue 구축' },
  { id:'nova', name:'NOVA Partners', owner:'이정민', grade:'A', specialty:'전문직수수료/제안 컨설팅' },
  { id:'vn', name:'Vietnam Front Team', owner:'Tran Minh', grade:'A-', specialty:'Vue 화면개발' },
];

var bpoDirectQuoteRows = [
  { workType:'개발/운영', grade:'특급기술자', startDate:'2026-09-01', endDate:'2027-03-31', mm:7, amount:77000000 },
  { workType:'개발/운영', grade:'고급기술자-상', startDate:'2026-09-01', endDate:'2027-03-31', mm:27.3, amount:259350000 },
  { workType:'개발/운영', grade:'고급기술자-하', startDate:'2026-11-01', endDate:'2027-10-31', mm:37, amount:339000000 },
];

var bpoIndirectQuoteRows = [
  { role:'PMO 자문', startDate:'2026-09-01', endDate:'2026-12-31', assignType:'Full', headCount:1, mm:4, amount:48000000 },
  { role:'원가관리 컨설팅', startDate:'2026-10-01', endDate:'2026-12-31', assignType:'Part', headCount:1, mm:2, amount:36000000 },
  { role:'제안/검수 지원', startDate:'2026-11-01', endDate:'2026-12-31', assignType:'Part', headCount:2, mm:2, amount:18000000 },
];

var bpoMaQuoteRows = [
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-01-01', endDate:'2026-03-31', unitPrice:870000, executionMonth:'2026-03', inspected:true },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-04-01', endDate:'2026-06-30', unitPrice:870000, executionMonth:'2026-06', inspected:true },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-07-01', endDate:'2026-09-30', unitPrice:870000, executionMonth:'2026-09', inspected:false },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-10-01', endDate:'2026-12-31', unitPrice:870000, executionMonth:'2026-12', inspected:false },
];

function bpoKindMeta(kind) {
  return BPO_OUTSOURCE_KINDS.find(k => k.id === kind) || BPO_OUTSOURCE_KINDS[0];
}

function bpoMoney(value) {
  return `${fmt(Math.round(Number(value || 0)))}원`;
}

function bpoRows(kind = outsourceKind) {
  if (!bpoOutsourceRows[kind]) bpoOutsourceRows[kind] = [];
  return bpoOutsourceRows[kind];
}

function bpoQuoteRows(kind = outsourceKind) {
  return kind === 'indirect' ? bpoIndirectQuoteRows : bpoDirectQuoteRows;
}

function bpoMonthsBetween(startDate, endDate) {
  if (typeof monthRangeByDate === 'function') return monthRangeByDate(startDate, endDate);
  const result = [];
  let [y, m] = String(startDate).slice(0, 7).split('-').map(Number);
  const end = String(endDate).slice(0, 7);
  while (`${y}-${String(m).padStart(2, '0')}` <= end) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { y += 1; m = 1; }
  }
  return result;
}

function bpoMonthlyRows(kind = outsourceKind) {
  const quoteRows = bpoQuoteRows(kind);
  if (kind === 'indirect') {
    const starts = quoteRows.map(r => r.startDate).sort();
    const ends = quoteRows.map(r => r.endDate).sort();
    const months = bpoMonthsBetween(starts[0], ends[ends.length - 1]);
    const total = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const base = months.length ? Math.floor(total / months.length) : 0;
    return months.map((month, idx) => {
      const amount = idx === months.length - 1 ? total - base * (months.length - 1) : base;
      return {
        month,
        baseAmount: amount,
        confirmedAmount: amount,
        percent: total ? Math.round(amount / total * 1000) / 10 : 0,
        inspectionAmount: month < '2026-07' ? amount : 0,
      };
    });
  }

  const grouped = {};
  quoteRows.forEach(row => {
    const months = bpoMonthsBetween(row.startDate, row.endDate);
    months.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, mm:0, amount:0, detailCount:0, voucherNo:'', inspectionStatus:'미완료' };
      grouped[month].mm += Number(row.mm || 0) / months.length;
      grouped[month].amount += Number(row.amount || 0) / months.length;
      grouped[month].detailCount += 1;
      if (month < '2026-07') {
        grouped[month].voucherNo = '880012345';
        grouped[month].inspectionStatus = '검수완료';
      }
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).map(row => ({
    ...row,
    mm: Math.round(row.mm * 100) / 100,
    amount: Math.round(row.amount),
  }));
}

function renderOutsourceKindTabs() {
  return `
    <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
      ${BPO_OUTSOURCE_KINDS.map(item => `
        <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
          <span class="os-kind-step">${item.step}</span>
          <strong>${item.label}</strong>
          <em>${item.desc}</em>
          ${outsourceKind === item.id ? '' : ''}
        </button>`).join('')}
    </div>`;
}

function switchOutsourceKind(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS.some(item => item.id === kind) ? kind : 'direct';
  bpoOutsourceState.mode = null;
  bpoOutsourceState.editId = null;
  bpoOutsourceState.vendorPopup = false;
  bpoOutsourceState.quotePopup = false;
  renderBudgetPage();
}

function openNewOutsourceContract() {
  bpoOutsourceState.mode = 'new';
  bpoOutsourceState.editId = null;
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  bpoOutsourceState.mode = null;
  bpoOutsourceState.editId = null;
  renderBudgetPage();
}

function editBpoOutsourceRow(kind, id) {
  bpoOutsourceState.mode = 'edit';
  bpoOutsourceState.editId = id;
  outsourceKind = kind;
  renderBudgetPage();
}

function toggleBpoVendorPopup() {
  bpoOutsourceState.vendorPopup = !bpoOutsourceState.vendorPopup;
  renderBudgetPage();
}

function toggleBpoQuotePopup() {
  bpoOutsourceState.quotePopup = !bpoOutsourceState.quotePopup;
  renderBudgetPage();
}

function selectBpoQuote(kind, quoteNo) {
  if (kind === 'indirect') bpoOutsourceState.selectedQuoteIndirect = quoteNo;
  else if (kind === 'construction') bpoOutsourceState.selectedQuoteMa = quoteNo;
  else bpoOutsourceState.selectedQuoteDirect = quoteNo;
  bpoOutsourceState.quotePopup = false;
  showToast('구매시스템 견적 데이터가 반영되었습니다.');
  renderBudgetPage();
}

function renderBpoRegisteredList(kind) {
  const rows = bpoRows(kind);
  if (kind === 'travel' || kind === 'transfer' || kind === 'other') {
    return `
      <div class="bpo-list-card">
        <div class="bpo-list-head"><span>No</span><span>예정월</span><span>금액</span><span>구분/설명</span><span>상태</span><span></span></div>
        ${rows.map((row, index) => `
          <div class="bpo-list-row">
            <span class="bpo-row-seq">${index + 1}</span>
            <span>${row.expectedMonth || '-'}</span>
            <strong>${bpoMoney(row.amount)}</strong>
            <span>${row.transferType ? `${row.transferType} / ` : ''}${row.description || ''}</span>
            <em>${row.status}</em>
            <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
          </div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
      </div>`;
  }
  if (kind === 'construction') {
    return `
      <div class="bpo-list-card">
        <div class="bpo-list-head contract ma"><span>No</span><span>업체 / 계약명</span><span>견적번호</span><span>금액</span><span>상태</span><span></span></div>
        ${rows.map((row, index) => `
          <div class="bpo-list-row contract ma">
            <span class="bpo-row-seq">${index + 1}</span>
            <span><strong>${row.vendorName}</strong><i>${row.title}</i></span>
            <span>${row.quoteNo}</span>
            <strong>${bpoMoney(row.amount)}</strong>
            <em>${row.status}</em>
            <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
          </div>`).join('')}
      </div>`;
  }
  return `
    <div class="bpo-list-card">
      <div class="bpo-list-head contract"><span>No</span><span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span><span></span></div>
      ${rows.map((row, index) => `
        <div class="bpo-list-row contract">
          <span class="bpo-row-seq">${index + 1}</span>
          <span><strong>${row.vendorName}</strong><i>${row.title}</i></span>
          <span>${row.startDate} ~ ${row.endDate}</span>
          <strong>${bpoMoney(row.amount)}</strong>
          <span>${row.quoteNo || '-'}</span>
          <span>${row.poNo || '-'}</span>
          <em>${row.status}</em>
          <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
        </div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>`;
}

function renderBpoQuoteTable(kind) {
  const rows = bpoQuoteRows(kind);
  const professional = kind === 'indirect';
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="os-inspection-table-wrap">
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${rows.length}</em></div>
      <div class="os-inspection-table quote ${professional ? 'professional' : ''}">
        <div class="os-inspection-row head">
          ${professional
            ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
            : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span>'}
        </div>
        ${rows.map(row => `
          <div class="os-inspection-row">
            ${professional
              ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoMoney(row.amount)}</span>`
              : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoMoney(row.amount)}</span>`}
          </div>`).join('')}
        <div class="os-inspection-row total">${professional ? '<span>합계</span><span></span><span></span><span></span><span></span><span></span>' : '<span>합계</span><span></span><span></span><span></span><span></span>'}<span>${bpoMoney(total)}</span></div>
      </div>
    </div>`;
}

function renderBpoMonthlyTarget(kind) {
  const professional = kind === 'indirect';
  const rows = bpoMonthlyRows(kind);
  return `
    <div class="os-inspection-table-wrap">
      <div class="os-inspection-title">월별 원가 등록 대상 <em>${professional ? '검수금액 기준' : '검수월 기준 1줄 합계'}</em></div>
      <div class="os-inspection-table plan monthly-cost ${professional ? 'professional' : ''}">
        <div class="os-inspection-row head">
          ${professional
            ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
            : '<span>검수월</span><span>월별 원가금액</span><span>실투입 전표 번호</span><span>검수상태</span>'}
        </div>
        ${rows.map(row => `
          <div class="os-inspection-row">
            ${professional
              ? `<span>${row.month}</span><span>${bpoMoney(row.baseAmount)}</span><span>${bpoMoney(row.confirmedAmount)}</span><span>${row.percent}%</span><span>${bpoMoney(row.inspectionAmount)}</span>`
              : `<span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${kind}','${row.month}')">${row.month}</button></span><span>${bpoMoney(row.amount)}</span><span>${row.voucherNo || '-'}</span><span>${row.inspectionStatus}</span>`}
          </div>`).join('')}
      </div>
    </div>`;
}

function renderBpoContractForm(kind) {
  const professional = kind === 'indirect';
  const quoteNo = professional ? bpoOutsourceState.selectedQuoteIndirect : bpoOutsourceState.selectedQuoteDirect;
  const title = professional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입 외주 계약 등록';
  return `
    <div class="labor-card bpo-form-card">
      <div class="labor-flow-title">
        <strong>${title}</strong>
        <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
      </div>
      <div class="bpo-step-note">1. 견적확정 여부를 먼저 선택한 뒤, 확정 견적이면 구매시스템 데이터를 불러오고 미확정이면 직접 입력합니다.</div>
      <div class="labor-form os-contract-form bpo-contract-form">
        <label><span>견적확정 여부</span><select id="bpo-quote-confirmed"><option>Y</option><option>N</option></select></label>
        <label><span>견적번호</span><div class="bpo-input-button"><input id="bpo-quote-no" value="${quoteNo}" ${professional ? '' : 'readonly'}><button type="button" onclick="toggleBpoQuotePopup()">⌕</button></div></label>
        <label><span>업체</span><div class="bpo-input-button"><input id="bpo-vendor" value="${professional ? 'NOVA Partners' : 'BP Korea'}" ${professional ? '' : 'readonly'}><button type="button" onclick="toggleBpoVendorPopup()">⌕</button></div></label>
        <label class="wide"><span>계약명</span><input id="bpo-title" value="${professional ? '전문직수수료/제안/기타 계획' : '예산관리시스템 외주 실투입'}" ${professional ? '' : 'readonly'}></label>
        <label><span>시작일</span><input id="bpo-start" type="date" value="2026-09-01" ${professional ? '' : 'readonly'}></label>
        <label><span>종료일</span><input id="bpo-end" type="date" value="${professional ? '2026-12-31' : '2027-03-31'}" ${professional ? '' : 'readonly'}></label>
        <label><span>계약금액</span><input id="bpo-amount" value="${professional ? '102000000' : '675350000'}" ${professional ? '' : 'readonly'}></label>
        <label><span>PO번호</span><input id="bpo-po" value="${professional ? '4500678901' : '4500123456'}"></label>
      </div>
      ${bpoOutsourceState.vendorPopup ? `
        <div class="bpo-popup-list">
          ${bpoVendors.map(v => `<button onclick="toggleBpoVendorPopup()"><strong>${v.name}</strong><span>${v.specialty} / ${v.owner} / ${v.grade}</span></button>`).join('')}
        </div>` : ''}
      ${bpoOutsourceState.quotePopup ? `
        <div class="bpo-popup-list">
          <button onclick="selectBpoQuote('${kind}','${professional ? 'Q-202607-P01' : 'Q-202607-001'}')"><strong>${professional ? 'Q-202607-P01' : 'Q-202607-001'}</strong><span>${professional ? '전문직수수료/제안/기타 견적' : '외주 실투입 견적'}</span></button>
        </div>` : ''}
      <div class="os-inspection-card">
        <div class="os-inspection-head">
          <div>
            <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
            <span>${professional ? '견적 전체 금액을 기간 월수로 N등분하고 확정금액은 사용자가 직접 보정합니다.' : '견적 산출내역으로 월별 원가 등록 대상이 계산됩니다.'}</span>
          </div>
          <div class="os-inspection-actions">
            <button class="labor-main-btn" onclick="showOutsourceInspectionAdjustGuide('${kind}')">월별 검수금액 확정</button>
          </div>
        </div>
        ${renderBpoQuoteTable(kind)}
        ${renderBpoMonthlyTarget(kind)}
      </div>
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveBpoContract('${kind}')">등록</button>
      </div>
    </div>`;
}

function saveBpoContract(kind) {
  const rows = bpoRows(kind);
  rows.unshift({
    id:`${kind}-${Date.now()}`,
    vendorName: document.getElementById('bpo-vendor')?.value || (kind === 'indirect' ? 'NOVA Partners' : 'BP Korea'),
    title: document.getElementById('bpo-title')?.value || bpoKindMeta(kind).label,
    startDate: document.getElementById('bpo-start')?.value || '2026-09-01',
    endDate: document.getElementById('bpo-end')?.value || '2026-12-31',
    amount: parseBudgetAmount(document.getElementById('bpo-amount')?.value || 0),
    quoteNo: document.getElementById('bpo-quote-no')?.value || '',
    poNo: document.getElementById('bpo-po')?.value || '',
    status:'계획',
  });
  bpoOutsourceState.mode = null;
  showToast(`${bpoKindMeta(kind).label} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderBpoDirectIndirectPanel(kind) {
  return `
    <div class="bpo-section-head">
      <div>
        <h3>${bpoKindMeta(kind).label} 계획 등록</h3>
        <p>기등록 계획을 확인하고, 신규등록 버튼으로 구매시스템 견적 기반 계획을 추가합니다.</p>
      </div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList(kind)}
    ${bpoOutsourceState.mode ? renderBpoContractForm(kind) : ''}`;
}

function renderBpoTravelPanel() {
  const rows = bpoRows('travel');
  return `
    <div class="bpo-section-head">
      <div><h3>외주출장비 계획 등록</h3><p>프로젝트에 매핑된 PO를 검색해 출장비 확보 계획을 등록합니다.</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList('travel')}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-form os-contract-form bpo-contract-form">
          <label><span>요청번호</span><input value="7000003088"></label>
          <label><span>진행상태</span><input value="요청"></label>
          <label><span>계약번호</span><div class="bpo-input-button"><input id="bpo-travel-po" value="4500311570"><button type="button">⌕</button></div></label>
          <label><span>구매담당자</span><input value="최성훈"></label>
          <label><span>투입인력</span><input value="이승우 차장"></label>
          <label class="wide"><span>출장내역</span><input id="bpo-travel-desc" value="Wuxi 출장"></label>
          <label><span>집행 예정월</span><input id="bpo-simple-month" type="month" value="2026-08"></label>
          <label><span>출장금액</span><input id="bpo-simple-amount" value="4935405"></label>
          <label><span>항공료</span><input value="831000"></label>
          <label><span>숙박비</span><input value="1654163"></label>
          <label><span>교통비</span><input value="0"></label>
          <label><span>일비</span><input value="2285242"></label>
          <label><span>기타비용</span><input value="165000"></label>
          <label><span>기타비용내역</span><input value="비자수수료"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoSimple('travel')">등록</button></div>
      </div>` : ''}`;
}

function saveBpoSimple(kind) {
  const month = document.getElementById('bpo-simple-month')?.value || '2026-09';
  const rawAmount = parseBudgetAmount(document.getElementById('bpo-simple-amount')?.value || 0);
  const transferType = document.getElementById('bpo-transfer-type')?.value || '';
  const amount = kind === 'transfer' && transferType === 'Sender Project' ? -Math.abs(rawAmount) : rawAmount;
  bpoRows(kind).unshift({
    id:`${kind}-${Date.now()}`,
    expectedMonth: month,
    amount,
    transferType,
    description: document.getElementById('bpo-simple-desc')?.value || bpoKindMeta(kind).label,
    status:'계획',
  });
  bpoOutsourceState.mode = null;
  showToast(`${bpoKindMeta(kind).label} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderBpoSimplePanel(kind) {
  const isTransfer = kind === 'transfer';
  return `
    <div class="bpo-section-head">
      <div><h3>${bpoKindMeta(kind).label} 계획 등록</h3><p>${isTransfer ? 'Sender Project는 마이너스, Receiver Project는 플러스 금액으로 계획에 반영합니다.' : '집행 예정월과 금액, 설명 중심으로 계획을 등록합니다.'}</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList(kind)}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-form os-contract-form bpo-contract-form">
          ${isTransfer ? '<label><span>Sender/Receiver</span><select id="bpo-transfer-type"><option>Receiver Project</option><option>Sender Project</option></select></label>' : ''}
          <label><span>${isTransfer ? '이관예정월' : '집행 예정월'}</span><input id="bpo-simple-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="bpo-simple-amount" value="${isTransfer ? '12000000' : '4500000'}"></label>
          <label class="wide"><span>설명</span><input id="bpo-simple-desc" value="${isTransfer ? '타 프로젝트 잔여 외주비 이관' : '검수 대응 외부 지원 비용'}"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoSimple('${kind}')">등록</button></div>
      </div>` : ''}`;
}

function renderBpoConstructionPanel() {
  return `
    <div class="bpo-section-head">
      <div><h3>공사MA 계획 등록</h3><p>구매시스템에서 전송받은 MA 견적데이터를 선택해 검수집행월 기준 계획을 수립합니다.</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList('construction')}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-flow-title"><strong>1. 구매 견적 선택</strong><button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button></div>
        <div class="bpo-popup-list static">
          <button onclick="selectBpoQuote('construction','Q-202607-MA01')"><strong>Q-202607-MA01</strong><span>SW 유지보수 / 분기 검수 / 총 ${bpoMoney(3480000)}</span></button>
        </div>
        <div class="labor-section-title">2. 공사MA 계획 상세</div>
        <div class="os-inspection-table quote ma">
          <div class="os-inspection-row head"><span>표준품명</span><span>단위</span><span>수량</span><span>유지보수 시작일</span><span>유지보수 종료일</span><span>공급단가</span><span>검수집행월</span><span>검수여부</span></div>
          ${bpoMaQuoteRows.map((row, idx) => `
            <div class="os-inspection-row">
              <span>${row.item}</span><span>${row.unit}</span><span>${row.qty}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${bpoMoney(row.unitPrice)}</span>
              <span><input type="month" value="${row.executionMonth}" ${row.inspected ? 'disabled' : ''}></span><span>${row.inspected ? '검수완료' : '미검수'}</span>
            </div>`).join('')}
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoMa()">등록</button></div>
      </div>` : ''}`;
}

function saveBpoMa() {
  bpoRows('construction').unshift({ id:`ma-${Date.now()}`, vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-MA01', amount:3480000, status:'계획' });
  bpoOutsourceState.mode = null;
  showToast('공사MA 계획이 등록되었습니다.');
  renderBudgetPage();
}

function renderOutsourceContractPanel(data) {
  const meta = bpoKindMeta(outsourceKind);
  let body = '';
  if (outsourceKind === 'direct' || outsourceKind === 'indirect') body = renderBpoDirectIndirectPanel(outsourceKind);
  else if (outsourceKind === 'travel') body = renderBpoTravelPanel();
  else if (outsourceKind === 'construction') body = renderBpoConstructionPanel();
  else body = renderBpoSimplePanel(outsourceKind);
  return `
    <div class="outsource-panel bpo-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact"><span class="os-kind-caption">견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</span></div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail bpo-selected-detail">
        <div class="cost-selected-title">${meta.label} 계획 등록</div>
        ${body}
      </div>
    </div>`;
}

function showOutsourceInspectionMonthDetail(kind, month) {
  const rows = bpoQuoteRows(kind).filter(row => bpoMonthsBetween(row.startDate, row.endDate).includes(month));
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
      <div class="actual-detail-head"><strong>${month} 검수계획 상세</strong><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">×</button></div>
      <div class="actual-detail-body">
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>해당월 금액</span><span>실투입 전표</span><span>검수상태</span></div>
          ${rows.map(row => {
            const months = bpoMonthsBetween(row.startDate, row.endDate);
            const amount = months.length ? Math.round(row.amount / months.length) : row.amount;
            return `<div class="os-inspection-row"><span>${row.workType}</span><span>${row.grade}</span><span>${bpoMoney(amount)}</span><span>${month < '2026-07' ? '880012345' : '-'}</span><span>${month < '2026-07' ? '검수완료' : '미완료'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showOutsourceInspectionAdjustGuide(kind = outsourceKind) {
  const professional = kind === 'indirect';
  const quoteRows = bpoQuoteRows(kind);
  const monthlyRows = bpoMonthlyRows(kind);
  const total = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div><span>${bpoKindMeta(kind).label}</span><strong>월별 검수금액 확정</strong></div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${professional ? bpoOutsourceState.selectedQuoteIndirect : bpoOutsourceState.selectedQuoteDirect}</strong></div>
          <div><span>견적총액</span><strong>${bpoMoney(total)}</strong></div>
          <div><span>보정방식</span><strong>${professional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        ${renderBpoQuoteTable(kind)}
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRows(this.value)"><option value="">월 전체</option>${monthlyRows.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select>
        </div>
        <div class="os-inspection-table plan monthly-cost ${professional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${professional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}
          </div>
          ${monthlyRows.map(row => `
            <div class="os-inspection-row" data-bpo-month="${row.month}">
              ${professional
                ? `<span>${row.month}</span><span>${bpoMoney(row.baseAmount)}</span><span><input value="${Math.round(row.confirmedAmount)}"></span><span>${row.percent}%</span><span>${bpoMoney(row.inspectionAmount)}</span>`
                : `<span>${row.month}</span><span>${row.voucherNo || 'N'}</span><span><input value="${row.mm}" ${row.voucherNo ? 'disabled' : ''}></span><span>${bpoMoney(row.amount)}</span><span>${row.inspectionStatus}</span>`}
            </div>`).join('')}
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open');showToast('월별 검수금액이 저장 및 확정되었습니다.');">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function filterBpoInspectionRows(month) {
  document.querySelectorAll('#outsource-inspection-adjust-modal [data-bpo-month]').forEach(row => {
    row.style.display = !month || row.dataset.bpoMonth === month ? '' : 'none';
  });
}

// ---------------------------------------------------------------------------
// 2026-07-23 restore patch
// Re-applies the outsource detail-account flow that was lost during recovery.
// ---------------------------------------------------------------------------
const RESTORE_OUTSOURCE_KINDS = [
  { id:'direct', step:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'indirect', step:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', step:'03', label:'외주출장비', desc:'출장기간/출장금액' },
  { id:'construction', step:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', step:'05', label:'이관외주비', desc:'이관월/금액/사유' },
  { id:'other', step:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

const restoreProfessionalQuoteRows = [
  { role:'PMO 자문', grade:'고급', assignType:'Full', startDate:'2026-09-01', endDate:'2026-12-31', headCount:1, mm:4, amount:48000000 },
  { role:'원가관리 컨설팅', grade:'특급', assignType:'Part', startDate:'2026-10-01', endDate:'2026-12-31', headCount:1, mm:2, amount:36000000 },
  { role:'제안/검수 지원', grade:'중급', assignType:'Part', startDate:'2026-11-01', endDate:'2026-12-31', headCount:2, mm:2, amount:18000000 },
];

function getRestoreOutsourceLabel(kind = outsourceKind) {
  return (RESTORE_OUTSOURCE_KINDS.find(item => item.id === kind) || RESTORE_OUTSOURCE_KINDS[0]).label;
}

function getRestoreOutsourceRows(kind = outsourceKind) {
  if (!window.restoreOutsourcePlanRows) {
    window.restoreOutsourcePlanRows = {
      direct: [
        { id:'rd-1001', vendorName:'BP Korea', title:'예산관리시스템 외주 실투입', startDate:'2026-09-01', endDate:'2027-03-31', contractAmount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료', inspectionConfirmed:true },
      ],
      indirect: [
        { id:'ri-1001', vendorName:'NOVA Partners', title:'전문직수수료/제안 지원', startDate:'2026-09-01', endDate:'2026-12-31', contractAmount:102000000, quoteNo:'Q-202607-P01', poNo:'4500678901', status:'계획확정', inspectionConfirmed:true },
      ],
      travel: [
        { id:'rt-1001', expectedMonth:'2026-08', amount:4935405, description:'Wuxi 출장비', status:'계획' },
      ],
      transfer: [
        { id:'rf-1001', transferType:'Receiver Project', expectedMonth:'2026-11', amount:12000000, description:'타 프로젝트 잔여 외주비 이관', status:'계획' },
      ],
      construction: [
        { id:'rc-1001', vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-004', amount:3480000, executionMonth:'2026-12', status:'계획확정' },
      ],
      other: [],
    };
  }
  if (!window.restoreOutsourcePlanRows[kind]) window.restoreOutsourcePlanRows[kind] = [];
  return window.restoreOutsourcePlanRows[kind];
}

function renderOutsourceKindTabs() {
  return `
    <div class="os-kind-tabs os-kind-tabs-strong">
      ${RESTORE_OUTSOURCE_KINDS.map(item => `
        <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
          <span class="os-kind-step">${item.step}</span>
          <strong>${item.label}</strong>
          <em>${item.desc}</em>
          ${outsourceKind === item.id ? '' : ''}
        </button>
      `).join('')}
    </div>`;
}

function switchOutsourceKind(kind) {
  outsourceKind = RESTORE_OUTSOURCE_KINDS.some(item => item.id === kind) ? kind : 'direct';
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  editingOtherOutsourceId = null;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function openNewOutsourceContract() {
  outsourceRegistrationMode = 'new';
  editingOutsourceContractId = null;
  selectedOutsourceContractId = '';
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceInspectionPreviewStartDate = '';
  outsourceInspectionPreviewEndDate = '';
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  renderBudgetPage();
}

function getRestoreDirectQuoteRows(kind = outsourceKind) {
  if (kind === 'indirect') return restoreProfessionalQuoteRows;
  return (outsourceQuoteBreakdownData[selectedOutsourceQuoteNo] || outsourceQuoteBreakdownData['Q-202607-001'] || []).map(row => ({
    role: row.workType || '개발/운영',
    grade: row.grade || '고급',
    assignType: 'Full',
    startDate: row.startDate,
    endDate: row.endDate,
    headCount: 1,
    mm: row.mm,
    amount: row.amount,
  }));
}

function getRestoreInspectionMonths(kind = outsourceKind) {
  const rows = getRestoreDirectQuoteRows(kind);
  if (!rows.length) return [];
  const starts = rows.map(row => row.startDate).sort();
  const ends = rows.map(row => row.endDate).sort();
  const months = monthRangeByDate(starts[0], ends[ends.length - 1]);
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (kind === 'indirect') {
    const base = months.length ? Math.floor(total / months.length) : 0;
    return months.map((month, idx) => {
      const amount = idx === months.length - 1 ? total - base * (months.length - 1) : base;
      return { month, baseAmount: amount, confirmedAmount: month < '2026-07' ? amount : 0, percent: total ? Math.round(amount / total * 1000) / 10 : 0, inspectionAmount: month < '2026-07' ? amount : 0 };
    });
  }
  const grouped = {};
  rows.forEach(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const mmPerMonth = rowMonths.length ? row.mm / rowMonths.length : 0;
    const amountPerMonth = rowMonths.length ? row.amount / rowMonths.length : 0;
    rowMonths.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, mm:0, baseAmount:0, confirmedAmount:0, voucherNo:'', inspectionStatus:'미완료' };
      grouped[month].mm += mmPerMonth;
      grouped[month].baseAmount += amountPerMonth;
      grouped[month].confirmedAmount += amountPerMonth;
      if (month <= '2026-06') {
        grouped[month].voucherNo = '880012345';
        grouped[month].inspectionStatus = '검수완료';
      }
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).map(row => ({
    ...row,
    mm: Math.round(row.mm * 100) / 100,
    baseAmount: Math.round(row.baseAmount),
    confirmedAmount: Math.round(row.confirmedAmount),
  }));
}

function renderRestoreQuoteBreakdown(kind = outsourceKind) {
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const monthlyRows = getRestoreInspectionMonths(kind);
  const isProfessional = kind === 'indirect';
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '전문직수수료는 견적 전체 금액을 기간 월수로 배분하고, 사용자가 확정금액을 직접 보정합니다.' : '견적 산출내역 기준으로 월별 검수금액 확정 대상이 계산됩니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showOutsourceInspectionAdjustGuide('${kind}')">월별 검수금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>`
                : `<span>${row.role}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(3)}</span><span>${fmt(row.amount)}원</span>`}
            </div>
          `).join('')}
          <div class="os-inspection-row total">${isProfessional ? '<span>합계</span><span></span><span></span><span></span><span></span><span></span>' : '<span>합계</span><span></span><span></span><span></span><span></span>'}<span>${fmt(quoteTotal)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">월별 원가 등록 대상 <em>${isProfessional ? '검수금액 기준' : '검수월 기준 합계'}</em></div>
        <div class="os-inspection-table plan monthly-summary">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>월별 원가금액</span><span>실투입 전표 번호</span><span>검수상태</span>'}
          </div>
          ${monthlyRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.month}</span><span>${fmt(row.baseAmount)}원</span><span>${fmt(row.confirmedAmount)}원</span><span>${row.percent}%</span><span>${row.inspectionAmount ? fmt(row.inspectionAmount) + '원' : '0원'}</span>`
                : `<span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${kind}','${row.month}')">${row.month}</button></span><span>${fmt(row.confirmedAmount)}원</span><span>${row.voucherNo || '-'}</span><span>${row.inspectionStatus}</span>`}
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function showOutsourceInspectionMonthDetail(kind, month) {
  const isProfessional = kind === 'indirect';
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const rows = isProfessional ? getRestoreInspectionMonths(kind).filter(row => row.month === month) : quoteRows.filter(row => monthRangeByDate(row.startDate, row.endDate).includes(month));
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
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head">${isProfessional ? '<span>월</span><span>확정금액</span><span>검수금액</span>' : '<span>업무구분</span><span>기술등급</span><span>해당월 금액</span><span>검수상태</span>'}</div>
          ${rows.map(row => {
            if (isProfessional) return `<div class="os-inspection-row"><span>${row.month}</span><span>${fmt(row.confirmedAmount)}원</span><span>${fmt(row.inspectionAmount)}원</span></div>`;
            const months = monthRangeByDate(row.startDate, row.endDate);
            const amount = months.length ? Math.round(row.amount / months.length) : row.amount;
            return `<div class="os-inspection-row"><span>${row.role}</span><span>${row.grade}</span><span>${fmt(amount)}원</span><span>${month <= '2026-06' ? '검수완료' : '미완료'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showOutsourceInspectionAdjustGuide(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const monthlyRows = getRestoreInspectionMonths(kind);
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide">
      <div class="labor-process-guide-head">
        <div>
          <span>${getRestoreOutsourceLabel(kind)}</span>
          <strong>월별 검수금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${kind === 'indirect' ? 'Q-202607-P01' : (selectedOutsourceQuoteNo || 'Q-202607-001')}</strong></div>
          <div><span>견적총액</span><strong>${fmt(quoteTotal)}원</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 내용</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head">${isProfessional ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>' : '<span>업무구분</span><span>기술등급</span><span>시작일</span><span>종료일</span><span>총MM</span><span>견적금액</span>'}</div>
          ${quoteRows.map(row => `<div class="os-inspection-row">${isProfessional ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>` : `<span>${row.role}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>`}</div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 확정</div>
        <div class="os-filter-row">
          <select onchange="filterRestoreInspectionRows(this.value)"><option value="">월 전체</option>${monthlyRows.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select>
        </div>
        <div class="os-inspection-table plan">
          <div class="os-inspection-row head">${isProfessional ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>' : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}</div>
          ${monthlyRows.map(row => `<div class="os-inspection-row" data-restore-month="${row.month}">${isProfessional ? `<span>${row.month}</span><span>${fmt(row.baseAmount)}원</span><span><input class="restore-amount-input" value="${row.confirmedAmount}"></span><span>${row.percent}%</span><span>${row.inspectionAmount ? fmt(row.inspectionAmount) + '원' : '0원'}</span>` : `<span>${row.month}</span><span>${row.voucherNo || 'N'}</span><span><input class="restore-amount-input" ${row.voucherNo ? 'disabled' : ''} value="${row.mm}"></span><span>${fmt(row.confirmedAmount)}원</span><span>${row.inspectionStatus}</span>`}</div>`).join('')}
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open');showToast('월별 검수금액이 저장 및 확정되었습니다.');">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function filterRestoreInspectionRows(month) {
  document.querySelectorAll('#outsource-inspection-adjust-modal [data-restore-month]').forEach(row => {
    row.style.display = !month || row.dataset.restoreMonth === month ? '' : 'none';
  });
}

function saveRestoreOutsourceContract(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const rows = getRestoreOutsourceRows(kind);
  rows.unshift({
    id:`r-${kind}-${Date.now()}`,
    vendorName: document.getElementById('restore-os-vendor')?.value || (isProfessional ? 'NOVA Partners' : 'BP Korea'),
    title: document.getElementById('restore-os-title')?.value || (isProfessional ? '전문직수수료/제안/기타 계획' : '실투입대상 외주비 계획'),
    startDate: document.getElementById('restore-os-start')?.value || '2026-09-01',
    endDate: document.getElementById('restore-os-end')?.value || '2026-12-31',
    contractAmount: parseBudgetAmount(document.getElementById('restore-os-amount')?.value || (isProfessional ? 102000000 : 675350000)),
    quoteNo: document.getElementById('restore-os-quote')?.value || (isProfessional ? 'Q-202607-P01' : 'Q-202607-001'),
    poNo: document.getElementById('restore-os-po')?.value || '',
    status:'계획',
  });
  outsourceRegistrationMode = null;
  showToast(`${getRestoreOutsourceLabel(kind)} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderRestoreDirectProfessionalPanel(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const rows = getRestoreOutsourceRows(kind);
  const title = isProfessional ? '전문직수수료/제안/기타 계획 등록' : '실투입대상 외주비 계획 등록';
  const button = `<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>`;
  return `
    <div class="labor-panel-head restore-os-head">
      <div>
        <div class="labor-title">${title}</div>
        <div class="setup-editor-sub">선택한 상세계정의 신규 계획을 등록하거나 기존 내역을 수정합니다.</div>
      </div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : button}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-contract-grid-head"><span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span></div>
      ${rows.map(row => `
        <div class="os-contract-grid-row">
          <span><strong>${row.vendorName}</strong><em>${row.title}</em></span>
          <span>${row.startDate} ~ ${row.endDate}</span>
          <span>${fmt(row.contractAmount)}원</span>
          <span>${row.quoteNo || '-'}</span>
          <span>${row.poNo || '-'}</span>
          <span><i class="labor-status saved">${row.status}</i></span>
        </div>
      `).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card restore-os-form-card">
        <div class="labor-flow-title">
          <strong>${isProfessional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입 외주 계약 등록'}</strong>
          <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
        </div>
        <div class="labor-form os-contract-form">
          <label><span>1. 견적확정 여부</span><select id="restore-os-quote-confirmed"><option>Y</option><option>N</option></select></label>
          <label><span>견적번호</span><input id="restore-os-quote" value="${isProfessional ? 'Q-202607-P01' : 'Q-202607-001'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>업체</span><input id="restore-os-vendor" value="${isProfessional ? 'NOVA Partners' : 'BP Korea'}" ${isProfessional ? '' : 'readonly'}></label>
          <label class="wide"><span>계약명</span><input id="restore-os-title" value="${isProfessional ? '전문직수수료/제안/기타 계획' : '예산관리시스템 외주 실투입'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>시작일</span><input id="restore-os-start" type="date" value="2026-09-01" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>종료일</span><input id="restore-os-end" type="date" value="2026-12-31" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>계약금액</span><input id="restore-os-amount" value="${isProfessional ? '102000000' : '675350000'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>PO번호</span><input id="restore-os-po" value="${isProfessional ? '4500678901' : '4500123456'}"></label>
        </div>
        ${renderRestoreQuoteBreakdown(kind)}
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreOutsourceContract('${kind}')">등록</button></div>
      </div>` : ''}
  `;
}

function saveRestoreSimpleOutsource(kind) {
  const rows = getRestoreOutsourceRows(kind);
  const amount = parseBudgetAmount(document.getElementById('restore-simple-amount')?.value || 0);
  const month = document.getElementById('restore-simple-month')?.value || '2026-09';
  if (!amount) {
    showToast('금액을 입력해 주세요.');
    return;
  }
  rows.unshift({
    id:`rs-${kind}-${Date.now()}`,
    expectedMonth: month,
    amount: kind === 'transfer' && document.getElementById('restore-transfer-type')?.value === 'Sender Project' ? -Math.abs(amount) : amount,
    description: document.getElementById('restore-simple-desc')?.value || getRestoreOutsourceLabel(kind),
    transferType: document.getElementById('restore-transfer-type')?.value || '',
    status:'계획',
  });
  outsourceRegistrationMode = null;
  showToast(`${getRestoreOutsourceLabel(kind)} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderRestoreSimplePanel(kind) {
  const rows = getRestoreOutsourceRows(kind);
  const label = getRestoreOutsourceLabel(kind);
  const isTransfer = kind === 'transfer';
  return `
    <div class="labor-panel-head restore-os-head">
      <div><div class="labor-title">${label} 계획 등록</div><div class="setup-editor-sub">${label} 계획을 등록하거나 기등록 내역을 확인합니다.</div></div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-other-header with-action"><span>예정월</span><span>금액</span><span>설명</span><span>상태</span><span></span></div>
      ${rows.map(row => `<div class="os-other-row with-action"><strong>${row.expectedMonth || row.executionMonth || '-'}</strong><b>${fmt(row.amount || 0)}원</b><span>${row.transferType ? row.transferType + ' / ' : ''}${row.description || row.title || ''}</span><i class="labor-status saved">${row.status}</i><span></span></div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card">
        <div class="labor-card-title">${label} 신규 등록</div>
        <div class="labor-form os-other-form">
          ${isTransfer ? '<label><span>Sender/Receiver</span><select id="restore-transfer-type"><option>Receiver Project</option><option>Sender Project</option></select></label>' : ''}
          <label><span>${isTransfer ? '이관예정월' : '집행 예정월'}</span><input id="restore-simple-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="restore-simple-amount" inputmode="numeric" placeholder="예: 12000000"></label>
          <label class="wide"><span>설명</span><input id="restore-simple-desc" placeholder="${label} 계획 설명"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreSimpleOutsource('${kind}')">등록</button></div>
      </div>` : ''}
  `;
}

function renderRestoreConstructionPanel() {
  const rows = getRestoreOutsourceRows('construction');
  return `
    <div class="labor-panel-head restore-os-head">
      <div><div class="labor-title">공사MA 계획 등록</div><div class="setup-editor-sub">구매시스템 견적데이터를 선택해 검수집행월 기준으로 MA 계획을 수립합니다.</div></div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-contract-grid-head"><span>업체 / 계약명</span><span>견적번호</span><span>금액</span><span>상태</span><span></span><span></span></div>
      ${rows.map(row => `<div class="os-contract-grid-row"><span><strong>${row.vendorName}</strong><em>${row.title}</em></span><span>${row.quoteNo}</span><span>${fmt(row.amount)}원</span><span><i class="labor-status saved">${row.status}</i></span><span></span><span></span></div>`).join('')}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card">
        <div class="labor-card-title">2. 공사MA 계획 상세</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>표준품명</span><span>단위</span><span>수량</span><span>유지보수 시작일</span><span>유지보수 종료일</span><span>공급단가</span><span>검수집행월</span></div>
          ${['2026-03','2026-06','2026-09','2026-12'].map((m, idx) => `<div class="os-inspection-row"><span>SW 유지보수</span><span>AU</span><span>1</span><span>2026-${String(idx*3+1).padStart(2,'0')}-01</span><span>${m}-30</span><span>${fmt(870000)}원</span><span><input type="month" value="${m}"></span></div>`).join('')}
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreSimpleOutsource('construction')">등록</button></div>
      </div>` : ''}
  `;
}

function renderOutsourceContractPanel(data) {
  const meta = RESTORE_OUTSOURCE_KINDS.find(item => item.id === outsourceKind) || RESTORE_OUTSOURCE_KINDS[0];
  let body = '';
  if (outsourceKind === 'direct' || outsourceKind === 'indirect') body = renderRestoreDirectProfessionalPanel(outsourceKind);
  else if (outsourceKind === 'construction') body = renderRestoreConstructionPanel();
  else body = renderRestoreSimplePanel(outsourceKind);
  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact"><span class="os-kind-caption">견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</span></div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${meta.label} 계획 등록</div>
        ${body}
      </div>
    </div>`;
}

function showBudgetSummaryGrid() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  const actual = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const totBudget = CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual = CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain = totBudget - totActual - totQuasi;
  budgetDetailStep = 'summaryGrid';
  budgetSetupEditAccount = null;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${(typeof SHOW_TOTAL_BUDGET_BAR_FINAL === 'undefined' || SHOW_TOTAL_BUDGET_BAR_FINAL) ? renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage) : ''}
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
      <div>
        <div class="budget-process-title">전체 현황</div>
        <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
      </div>
    </div>
    ${renderProjectPlanSummary(data, actual, quasi)}
  `;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }
  if (budgetDetailStep === 'overview') budgetDetailStep = 'setup';

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const setupBody = renderBudgetSetupOverview(data, actual, quasi);

  const setupHeader = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 상세 계획을 선택해 수정합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-sub-btn" onclick="showBudgetSummaryGrid()">전체 현황 보기</button>
      </div>
    </div>`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${(typeof SHOW_TOTAL_BUDGET_BAR_FINAL === 'undefined' || SHOW_TOTAL_BUDGET_BAR_FINAL) ? renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage) : ''}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 예산 집행 현황을 확인한 뒤 필요한 계정의 상세 계획을 수정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : budgetDetailStep === 'summaryGrid'
          ? `
          <div class="budget-process-head">
            <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
            <div>
              <div class="budget-process-title">전체 현황</div>
              <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
            </div>
            <div class="budget-process-actions">
              <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
            </div>
          </div>
          ${renderProjectPlanSummary(data, actual, quasi)}`
        : budgetDetailStep === 'summaryGrid'
          ? `
            <div class="budget-process-head">
              <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
              <div>
                <div class="budget-process-title">전체 현황</div>
                <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
              </div>
              <div class="budget-process-actions">
                <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
              </div>
            </div>
            ${renderProjectPlanSummary(data, actual, quasi)}`
          : `${setupHeader}${setupBody}`}
  `;
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
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const setupBody = renderBudgetSetupOverview(data, actual, quasi);

  const setupHeader = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 상세 계획을 선택해 수정합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-sub-btn" onclick="budgetDetailStep='summaryGrid';budgetSetupEditAccount=null;renderBudgetPage()">프로젝트 수행비용 보기</button>
      </div>
    </div>`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${(typeof SHOW_TOTAL_BUDGET_BAR_FINAL === 'undefined' || SHOW_TOTAL_BUDGET_BAR_FINAL) ? renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage) : ''}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 예산 집행 현황을 확인한 뒤 필요한 계정의 상세 계획을 수정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : budgetDetailStep === 'summaryGrid'
          ? `
            <div class="budget-process-head">
              <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
              <div>
                <div class="budget-process-title">프로젝트 수행비용</div>
                <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
              </div>
              <div class="budget-process-actions">
                <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
              </div>
            </div>
            ${renderProjectPlanSummary(data, actual, quasi)}`
          : `${setupHeader}${setupBody}`}
  `;
}

function renderProjectPlanSummary(data, actual, quasi) {
  const rows = getProjectSummaryGridRows(data, actual, quasi);
  const total = rows[0];
  const monthHeaders = data.months.map(mo => `<th colspan="2">${mo.m}</th>`).join('');
  const monthSubHeaders = data.months.map(() => '<th>계획</th><th>실적</th>').join('');
  const body = rows.map(row => `
    <tr class="pps-level-${row.level}">
      <td class="pps-name"><span>${row.level === 0 ? '⊟' : row.level === 1 ? '⊟' : '○'}</span>${row.name}</td>
      <td class="num">${fmt(row.totalPlan)}</td>
      <td class="num">${fmt(row.totalActual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      <td>
        <div class="pps-progress"><i style="width:${Math.min(row.rate, 100)}%"></i></div>
        <b class="pps-rate">${row.rate}%</b>
      </td>
      ${row.months.map(item => `
        <td class="num">${fmt(item.plan)}</td>
        <td class="num">${summaryActualCell(row, item)}</td>
      `).join('')}
    </tr>`).join('');

  return `
    <div class="project-plan-summary">
      <div class="pps-titlebar">
        <div><span></span><strong>프로젝트 수행비용</strong></div>
        <div class="pps-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-sub-btn">월별</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="pps-top">
        <div>
          <span>총 계획예산</span>
          <strong>${fmt(total.totalPlan)}원</strong>
        </div>
        <div class="pps-top-progress">
          <span>실행예산 진행률</span>
          <div><i style="width:${Math.min(total.rate, 100)}%"></i><b>${total.rate}%</b></div>
        </div>
        <ul>
          <li><span>실적</span><strong>${fmt(total.totalActual)}원</strong></li>
          <li><span>잔여예산</span><strong>${fmt(total.remain)}원</strong></li>
        </ul>
      </div>
      <div class="pps-grid-wrap">
        <table class="pps-grid">
          <thead>
            <tr>
              <th rowspan="2">계정</th>
              <th colspan="4">종합</th>
              ${monthHeaders}
            </tr>
            <tr>
              <th>계획</th><th>실적</th><th>잔여예산</th><th>진행률</th>
              ${monthSubHeaders}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="pps-note">※ 실적 구간의 파란색 금액을 클릭하면 계정별 상세 실적 내역을 확인할 수 있습니다.</p>
    </div>`;
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

function getSummaryMonthValue(data, account, monthData, kind) {
  const bucket = monthData?.[account] || {};
  if (kind === 'actual') {
    return (bucket.a || 0) + (bucket.q || 0);
  }
  if (monthData.type === 'actual') {
    return bucket.a || 0;
  }
  return bucket.p || bucket.q || 0;
}

function makeSummaryRow(name, level, account, ratio, data, actual, quasi) {
  const totalPlan = account
    ? Math.round(getBudgetAdjusted(data, account) * ratio)
    : CATS.reduce((sum, cat) => sum + getBudgetAdjusted(data, cat), 0);
  const totalActual = account
    ? Math.round(((actual[account] || 0) + (quasi[account] || 0)) * ratio)
    : CATS.reduce((sum, cat) => sum + (actual[cat] || 0) + (quasi[cat] || 0), 0);
  const remain = Math.max(totalPlan - totalActual, 0);
  const rate = totalPlan ? Math.round(totalActual / totalPlan * 10000) / 100 : 0;
  const months = data.months.map(mo => {
    if (!account) {
      return {
        month: mo.m,
        plan: CATS.reduce((sum, cat) => sum + getSummaryMonthValue(data, cat, mo, 'plan'), 0),
        actual: CATS.reduce((sum, cat) => sum + getSummaryMonthValue(data, cat, mo, 'actual'), 0),
      };
    }
    return {
      month: mo.m,
      plan: Math.round(getSummaryMonthValue(data, account, mo, 'plan') * ratio),
      actual: Math.round(getSummaryMonthValue(data, account, mo, 'actual') * ratio),
    };
  });
  return { name, level, account, ratio, totalPlan, totalActual, remain, rate, months };
}

function getProjectSummaryGridRows(data, actual, quasi) {
  const rows = [makeSummaryRow('프로젝트 총 실행비용', 0, null, 1, data, actual, quasi)];
  const defs = [
    { account:CATS[0], children:[['실투입인건비', .72], ['이관인건비', .18], ['증업일급여-OT', .10]] },
    { account:CATS[1], children:[['실투입외주비', .62], ['공사/MA외주비', .25], ['기타외주비', .13]] },
    { account:CATS[2], children:[['재료비', .78], ['감가상각비', .22]] },
    { account:CATS[3], children:[['A/S Cost', .12]] },
  ];
  defs.forEach(def => {
    rows.push(makeSummaryRow(def.account, 1, def.account, 1, data, actual, quasi));
    def.children.forEach(([name, ratio]) => rows.push(makeSummaryRow(name, 2, def.account, ratio, data, actual, quasi)));
  });
  return rows;
}

function summaryActualCell(row, item) {
  if (row.account && isPastActualMonth(item.month) && item.actual > 0) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${row.account}','${item.month}','${row.name}')">${fmt(item.actual)}</button>`;
  }
  return fmt(item.actual);
}

function renderProjectPlanSummary(data, actual, quasi) {
  const rows = getProjectSummaryGridRows(data, actual, quasi);
  const total = rows[0];
  const monthHeaders = data.months.map(mo => `<th colspan="2">${mo.m}</th>`).join('');
  const monthSubHeaders = data.months.map(() => '<th>계획</th><th>실적</th>').join('');
  const body = rows.map(row => `
    <tr class="pps-level-${row.level}">
      <td class="pps-name"><span>${row.level === 0 ? '⊟' : row.level === 1 ? '⊟' : '○'}</span>${row.name}</td>
      <td class="num">${fmt(row.totalPlan)}</td>
      <td class="num">${fmt(row.totalActual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      <td>
        <div class="pps-progress"><i style="width:${Math.min(row.rate, 100)}%"></i></div>
        <b class="pps-rate">${row.rate}%</b>
      </td>
      ${row.months.map(item => `
        <td class="num">${fmt(item.plan)}</td>
        <td class="num">${summaryActualCell(row, item)}</td>
      `).join('')}
    </tr>`).join('');

  return `
    <div class="project-plan-summary">
      <div class="pps-titlebar">
        <div><span></span><strong>프로젝트 수행비용</strong></div>
        <div class="pps-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-sub-btn">월별</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="pps-top">
        <div>
          <span>총 계획예산</span>
          <strong>${fmt(total.totalPlan)}원</strong>
        </div>
        <div class="pps-top-progress">
          <span>실행예산 진행률</span>
          <div><i style="width:${Math.min(total.rate, 100)}%"></i><b>${total.rate}%</b></div>
        </div>
        <ul>
          <li><span>실적</span><strong>${fmt(total.totalActual)}원</strong></li>
          <li><span>잔여예산</span><strong>${fmt(total.remain)}원</strong></li>
        </ul>
      </div>
      <div class="pps-grid-wrap">
        <table class="pps-grid">
          <thead>
            <tr>
              <th rowspan="2">계정</th>
              <th colspan="4">종합</th>
              ${monthHeaders}
            </tr>
            <tr>
              <th>계획</th><th>실적</th><th>잔여예산</th><th>진행률</th>
              ${monthSubHeaders}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="pps-note">※ 실적 구간의 파란색 금액을 클릭하면 계정별 상세 실적 내역을 확인할 수 있습니다.</p>
    </div>`;
}

function getLaborPlanDetailRows(month) {
  const rows = getLaborRows()
    .filter(row => row.monthly && Number(row.monthly[month] || 0) > 0)
    .map((row, idx) => {
      const mm = Number(row.monthly[month] || 0);
      const amount = Math.round(mm * Number(row.unitPrice || 0));
      return [
        idx + 1,
        month,
        row.org || '-',
        row.name || '-',
        row.role || '-',
        row.pLevel || '-',
        row.workType || 'Full',
        mm,
        row.unitPrice || 0,
        amount,
        getLaborStatusLabel(row.status || 'MM 입력중'),
      ];
    });

  if (rows.length) return rows;
  return [
    [1, month, 'AI Architect팀', '손성호', 'Backend', 'P3', 'Full', 1, 13500000, 13500000, '계획'],
    [2, month, 'AX서비스1팀', '박혜리', 'Frontend', 'P2', 'Part', 0.6, 11200000, 6720000, '계획'],
    [3, month, 'AI UX팀', '전현영', 'UI/UX', 'P2', 'Part', 0.4, 10800000, 4320000, '계획'],
  ];
}

function showLaborPlanDetailModal(month, detailName) {
  let modal = document.getElementById('actual-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'actual-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  const columns = ['NO', '계획월', '조직', '성명', '역할', 'P레벨', '투입유형', '월 MM', '기준단가', '계획금액', '상태'];
  const rows = getLaborPlanDetailRows(month);
  const totalMm = rows.reduce((sum, row) => sum + Number(row[7] || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row[9] || 0), 0);
  modal.innerHTML = `
    <div class="actual-detail-modal">
      <div class="actual-detail-head">
        <strong>인건비 투입계획 조회</strong>
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-filter">
        <label><span>계획월</span><input value="${month}" readonly></label>
        <label><span>상세구분</span><input value="${detailName || '전체'}" readonly></label>
        <button class="labor-sub-btn">초기화</button>
        <button class="labor-main-btn teal">검색</button>
      </div>
      <div class="actual-detail-tabs">
        <button class="active">투입계획</button>
        <button>승인요청</button>
        <button>SCM 승인완료</button>
      </div>
      <div class="actual-detail-toolbar"><button class="labor-sub-btn">엑셀</button></div>
      <div class="actual-detail-table-wrap">
        <table class="actual-detail-table">
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, idx) => {
                  const numeric = [7, 8, 9].includes(idx);
                  const value = idx === 7 ? cell : numeric ? fmt(cell) : cell;
                  return `<td class="${numeric ? 'num' : ''}">${value}</td>`;
                }).join('')}
              </tr>`).join('')}
            <tr class="total">
              <td colspan="7">합계</td>
              <td class="num">${Math.round(totalMm * 100) / 100}</td>
              <td></td>
              <td class="num">${fmt(totalAmount)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot">
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
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

function getLaborStatusLabel(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

function renderBudgetAccountEditorOldA(data, account) {
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

let outsourceRegistrationMode = null;
let outsourceSearchQuery = '';
let selectedOutsourceVendorId = 'vd-bp';
let selectedOutsourceContractId = 'os-1001';
let editingOutsourceContractId = null;
let purchaseQuoteLastSyncedAt = '';
let outsourceVendorLookupOpen = false;
let outsourceQuoteLookupOpen = false;
let outsourceQuoteRequired = 'Y';
let selectedOutsourceQuoteNo = 'Q-202607-001';
let outsourceInspectionPlanPreviewQuoteNo = '';
let outsourceInspectionPreviewStartDate = '';
let outsourceInspectionPreviewEndDate = '';
let outsourceKind = 'direct';
let editingOtherOutsourceId = null;
let maQuoteNo = 'Q-202607-004';
let maQuoteAmount = 145000000;
let maQuoteTitle = 'MA service estimate';
let materialKind = 'item';
let editingMaterialItemId = null;
let editingOtherMaterialId = null;
let materialQuoteNo = 'MQ-202607-001';
let materialQuoteAmount = 52000000;
let materialQuoteTitle = '개발/테스트 솔루션 라이선스';
let materialQuoteSelectedYn = 'Y';

const outsourceVendorPool = [
  { id:'vd-bp', name:'BP Korea', grade:'A', owner:'김민재', specialty:'Java/Vue 구축' },
  { id:'vd-vn', name:'Vietnam Front Team', grade:'A-', owner:'Tran Minh', specialty:'Vue 화면개발' },
  { id:'vd-ats', name:'ATS 주식회사', grade:'A', owner:'박소연', specialty:'인터페이스 개발' },
  { id:'vd-ags', name:'AGS 솔루션', grade:'B+', owner:'이준호', specialty:'Oracle/배치' },
];

const purchaseQuoteData = {
  'vd-bp': [
    { quoteNo:'Q-202607-001', title:'국내 분석/설계 및 Java 개발', amount:380000000, receivedAt:'2026-07-01 14:20' },
    { quoteNo:'Q-202607-004', title:'현장대리인 및 품질관리 지원', amount:145000000, receivedAt:'2026-07-02 10:05' },
  ],
  'vd-vn': [
    { quoteNo:'Q-202607-002', title:'Vue 화면개발 1차', amount:240000000, receivedAt:'2026-07-01 16:40' },
    { quoteNo:'Q-202607-005', title:'퍼블리싱 및 화면 수정', amount:90000000, receivedAt:'2026-07-02 13:10' },
  ],
  'vd-ats': [
    { quoteNo:'Q-202607-003', title:'인터페이스 10종 개발', amount:210000000, receivedAt:'2026-07-01 17:30' },
  ],
  'vd-ags': [
    { quoteNo:'Q-202607-006', title:'Oracle 배치/마이그레이션 지원', amount:180000000, receivedAt:'2026-07-02 15:45' },
  ],
};

const outsourceQuoteBreakdownData = {
  'Q-202607-001': [
    { workType:'개발/운영', grade:'특급기술자', startDate:'2026-09-01', endDate:'2027-03-31', mm:7, amount:77000000 },
    { workType:'개발/운영', grade:'고급기술자-상', startDate:'2026-09-01', endDate:'2027-03-31', mm:27.3, amount:259350000 },
    { workType:'개발/운영', grade:'고급기술자-하', startDate:'2026-11-01', endDate:'2027-10-31', mm:37, amount:339000000 },
  ],
  'Q-202607-002': [
    { workType:'화면개발', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-02-28', mm:18, amount:162000000 },
    { workType:'화면개발', grade:'중급기술자', startDate:'2026-08-01', endDate:'2027-02-28', mm:14, amount:78000000 },
  ],
  'Q-202607-003': [
    { workType:'인터페이스', grade:'특급기술자', startDate:'2026-08-01', endDate:'2027-01-31', mm:6, amount:66000000 },
    { workType:'인터페이스', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-04-30', mm:16, amount:144000000 },
  ],
  'Q-202607-004': [
    { workType:'현장지원', grade:'고급기술자-상', startDate:'2026-07-01', endDate:'2027-06-30', mm:12, amount:108000000 },
    { workType:'현장지원', grade:'중급기술자', startDate:'2026-07-01', endDate:'2027-06-30', mm:7.4, amount:37000000 },
  ],
  'Q-202607-005': [
    { workType:'리블리싱', grade:'고급기술자-하', startDate:'2026-09-01', endDate:'2027-01-31', mm:8, amount:68000000 },
    { workType:'리블리싱', grade:'중급기술자', startDate:'2026-09-01', endDate:'2027-01-31', mm:4, amount:22000000 },
  ],
  'Q-202607-006': [
    { workType:'Oracle/배치', grade:'특급기술자', startDate:'2026-08-01', endDate:'2027-03-31', mm:8, amount:88000000 },
    { workType:'Oracle/배치', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-03-31', mm:10, amount:92000000 },
  ],
};

const budgetOutsourceContracts = {
  budgetMock: [
    {
      id:'os-1001', vendorId:'vd-bp', vendorName:'BP Korea', title:'국내 분석/설계 및 Java 개발',
      startDate:'2026-07-01', endDate:'2027-03-31', contractAmount:380000000,
      quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료',
    },
    {
      id:'os-1002', vendorId:'vd-vn', vendorName:'Vietnam Front Team', title:'Vue 화면개발 1차',
      startDate:'2026-08-01', endDate:'2027-02-28', contractAmount:240000000,
      quoteNo:'Q-202607-002', poNo:'', status:'계약작성중',
    },
  ],
};

const budgetOtherOutsourceExpenses = {
  budgetMock: [
    { id:'oo-actual-1000', expectedMonth:'2026-06', amount:3900000, description:'고객사 검수 출장비 실적 반영분', status:'실적', actualized:true },
    { id:'oo-1001', expectedMonth:'2026-09', amount:6800000, description:'출장비 비용 - 베트남 개발팀 온사이트 지원', status:'계획' },
    { id:'oo-1002', expectedMonth:'2026-11', amount:12000000, description:'30131234-D001 프로젝트에서 이관 예정 예산', status:'계획' },
    { id:'oo-1003', expectedMonth:'2027-02', amount:4500000, description:'고객사 검수 대응 교통/숙박성 경비', status:'계획' },
  ],
};

const purchaseMaterialQuoteData = [
  { quoteNo:'MQ-202607-001', itemNo:'10', itemCode:'SW00014', categoryName:'소프트웨어-경영/인사', standardName:'HRMS(인사관리)', manufacturer:'휴먼컨설팅그룹', modelName:'hunel', title:'HRMS(인사관리)', amount:52000000, receivedAt:'2026-07-01 11:10', poNo:'' },
  { quoteNo:'MQ-202607-002', itemNo:'20', itemCode:'SW00021', categoryName:'소프트웨어-개발도구', standardName:'테스트 자동화 도구', manufacturer:'QA Tech', modelName:'QA-AUTO-STD', title:'테스트 자동화 도구', amount:28000000, receivedAt:'2026-07-02 09:35', poNo:'' },
  { quoteNo:'MQ-202607-003', itemNo:'30', itemCode:'SW00033', categoryName:'소프트웨어-보안', standardName:'보안 점검 패키지', manufacturer:'SecureOne', modelName:'SEC-PACK-PRO', title:'보안 점검 패키지', amount:17000000, receivedAt:'2026-07-02 16:20', poNo:'' },
];

const budgetMaterialItems = {
  budgetMock: [
    {
      id:'mi-actual-1000',
      large:'솔루션',
      middle:'라이선스',
      small:'테스트도구',
      model:'QA-AUTO-STD',
      productDetail:'검수 자동화 도구 실적 반영분',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-06-01',
      deliveryEnd:'2026-06-30',
      quoteNo:'MQ-202606-009',
      amount:9000000,
      status:'실적',
      actualized:true,
    },
    {
      id:'mi-1001',
      large:'솔루션',
      middle:'라이선스',
      small:'개발도구',
      model:'DEV-CLOUD-PRO',
      productDetail:'개발/테스트 솔루션 라이선스',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-08-01',
      deliveryEnd:'2027-07-31',
      quoteNo:'MQ-202607-001',
      amount:52000000,
      status:'계획',
    },
  ],
};

const budgetOtherMaterialExpenses = {
  budgetMock: [
    { id:'om-actual-1000', expectedMonth:'2026-06', amount:1800000, description:'PoC 장비 임대 실적 반영분', status:'실적', actualized:true },
    { id:'om-1001', expectedMonth:'2026-10', amount:6500000, description:'타 프로젝트 잔여 재료비 이관 예정', status:'계획' },
    { id:'om-1002', expectedMonth:'2027-03', amount:3200000, description:'최종 검수용 임시 라이선스 구매 계획', status:'계획' },
  ],
};

const budgetMaOutsourceItems = {
  budgetMock: [
    {
      id:'ma-1001',
      large:'솔루션',
      middle:'MA',
      small:'유지보수',
      model:'NOVA-COST-AI',
      productDetail:'AI 원가관리 모듈 MA',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-07-01',
      deliveryEnd:'2027-06-30',
      quoteNo:'Q-202607-004',
      amount:145000000,
      status:'견적반영',
    },
  ],
};

function getOutsourceRows(proj = currentBudgetProj) {
  if (!budgetOutsourceContracts[proj]) budgetOutsourceContracts[proj] = [];
  return budgetOutsourceContracts[proj];
}

function getOtherOutsourceRows(proj = currentBudgetProj) {
  if (!budgetOtherOutsourceExpenses[proj]) budgetOtherOutsourceExpenses[proj] = [];
  return budgetOtherOutsourceExpenses[proj];
}

function getMaOutsourceRows(proj = currentBudgetProj) {
  if (!budgetMaOutsourceItems[proj]) budgetMaOutsourceItems[proj] = [];
  return budgetMaOutsourceItems[proj];
}

function getMaterialRows(proj = currentBudgetProj) {
  if (!budgetMaterialItems[proj]) budgetMaterialItems[proj] = [];
  return budgetMaterialItems[proj];
}

function getOtherMaterialRows(proj = currentBudgetProj) {
  if (!budgetOtherMaterialExpenses[proj]) budgetOtherMaterialExpenses[proj] = [];
  return budgetOtherMaterialExpenses[proj];
}

function switchOutsourceKind(kind) {
  outsourceKind = kind || 'direct';
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  editingOtherOutsourceId = null;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function switchMaterialKind(kind) {
  materialKind = kind || 'item';
  editingMaterialItemId = null;
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function renderOutsourceKindTabs() {
  const tabs = [
    { id:'direct', label:'실투입외주비', desc:'업체/계약/PO' },
    { id:'other', label:'기타외주비', desc:'집행월/금액' },
    { id:'ma', label:'MA', desc:'견적/납기/손익' },
  ];
  return `
    <div class="os-kind-tabs">
      ${tabs.map(tab => `
        <button class="${outsourceKind === tab.id ? 'active' : ''}" onclick="switchOutsourceKind('${tab.id}')">
          <strong>${tab.label}</strong>
          <span>${tab.desc}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">${title}</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderOutsourceKindTabs()}
      ${bodyHtml}
    </div>`;
}

function getSelectedOutsourceVendor() {
  return outsourceVendorPool.find(v => v.id === selectedOutsourceVendorId) || outsourceVendorPool[0];
}

function getSelectedOutsourceContract() {
  const rows = getOutsourceRows();
  return rows.find(r => r.id === selectedOutsourceContractId) || rows[0] || null;
}

function updateOutsourceSearch(value) {
  outsourceSearchQuery = value || '';
  renderBudgetPage();
}

function selectOutsourceVendor(id) {
  selectedOutsourceVendorId = id;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function toggleOutsourceVendorLookup() {
  outsourceVendorLookupOpen = !outsourceVendorLookupOpen;
  renderBudgetPage();
}

function toggleOutsourceQuoteLookup() {
  outsourceQuoteLookupOpen = !outsourceQuoteLookupOpen;
  if (outsourceQuoteLookupOpen) refreshPurchaseQuotes();
  else renderBudgetPage();
}

function setOutsourceQuoteRequired(value) {
  outsourceQuoteRequired = value === 'N' ? 'N' : 'Y';
  outsourceQuoteLookupOpen = outsourceQuoteRequired === 'Y';
  if (outsourceQuoteRequired === 'N') {
    selectedOutsourceQuoteNo = '';
    outsourceInspectionPlanPreviewQuoteNo = '';
  }
  renderBudgetPage();
}

function openNewOutsourceContract() {
  outsourceRegistrationMode = 'new';
  editingOutsourceContractId = null;
  selectedOutsourceContractId = '';
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceInspectionPreviewStartDate = '';
  outsourceInspectionPreviewEndDate = '';
  renderBudgetPage();
}

function editOutsourceContract(id) {
  selectedOutsourceContractId = id;
  editingOutsourceContractId = id;
  outsourceRegistrationMode = 'edit';
  const row = getOutsourceRows().find(r => r.id === id);
  if (row) selectedOutsourceVendorId = row.vendorId;
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  renderBudgetPage();
}

function refreshPurchaseQuotes() {
  purchaseQuoteLastSyncedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  showToast('구매시스템에서 최종 수취 견적 데이터를 불러왔습니다.');
  renderBudgetPage();
}

function applyPurchaseQuote(quoteNo, amount, title) {
  const amountEl = document.getElementById('outsource-contract-amount');
  const titleEl = document.getElementById('outsource-contract-title');
  const quoteEl = document.getElementById('outsource-quote-no');
  if (amountEl) amountEl.value = amount;
  if (titleEl) titleEl.value = title;
  if (quoteEl) quoteEl.value = quoteNo;
  selectedOutsourceQuoteNo = quoteNo;
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceQuoteLookupOpen = false;
  showToast('견적 금액을 계약정보에 반영했습니다.');
  renderBudgetPage();
}

function getSelectedOutsourceQuote(vendor, editing) {
  const quotes = purchaseQuoteData[vendor?.id] || [];
  const quoteNo = editing?.quoteNo || selectedOutsourceQuoteNo || quotes[0]?.quoteNo || '';
  return quotes.find(q => q.quoteNo === quoteNo) || quotes[0] || null;
}

function getOutsourceInspectionRows(quoteNo, startDate, endDate) {
  const rows = outsourceQuoteBreakdownData[quoteNo] || [];
  const contractMonths = monthRangeByDate(startDate, endDate);
  return rows.map(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const targetMonths = rowMonths.filter(m => contractMonths.includes(m));
    const ratio = rowMonths.length ? targetMonths.length / rowMonths.length : 0;
    const planAmount = Math.round(row.amount * ratio);
    const planMm = Math.round(row.mm * ratio * 100) / 100;
    return {
      ...row,
      planStart: targetMonths[0] || row.startDate.slice(0, 7),
      planEnd: targetMonths[targetMonths.length - 1] || row.endDate.slice(0, 7),
      planMm,
      planAmount,
      status: targetMonths.length ? '생성대상' : '계약기간 외',
    };
  });
}

function generateOutsourceInspectionPlanPreview() {
  const quoteNo = document.getElementById('outsource-quote-no')?.value || selectedOutsourceQuoteNo;
  const startDate = document.getElementById('outsource-start')?.value || '';
  const endDate = document.getElementById('outsource-end')?.value || '';
  if (!quoteNo || !outsourceQuoteBreakdownData[quoteNo]) {
    showToast('검수계획을 생성할 견적 산출내역이 없습니다.');
    return;
  }
  if (!monthRangeByDate(startDate, endDate).length) {
    showToast('계약 시작일과 종료일을 먼저 입력해 주세요.');
    return;
  }
  selectedOutsourceQuoteNo = quoteNo;
  outsourceInspectionPlanPreviewQuoteNo = quoteNo;
  outsourceInspectionPreviewStartDate = startDate;
  outsourceInspectionPreviewEndDate = endDate;
  showToast('견적 산출내역 기준 실투입(검수)계획을 생성했습니다.');
  renderBudgetPage();
}

function showOutsourceInspectionAdjustGuide() {
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>검수 금액 보정</span>
          <strong>자동 생성된 검수계획 금액을 구매 전송 전에 보정합니다</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="labor-process-guide-rules">
          <strong>보정 기준</strong>
          <p>견적 산출내역으로 생성된 기술등급별 금액은 기본 검수계획입니다.</p>
          <p>검수 금액 보정은 월별 검수금액, 반올림 차액, 계약 범위 조정이 필요한 경우에만 수행합니다.</p>
          <p>보정 이력은 구매 전송 시 함께 남기고, 전송 후에는 구매시스템 기준 데이터로 관리합니다.</p>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">확인</button>
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
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = planRows.reduce((sum, row) => sum + row.planAmount, 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 실투입(검수)계획</strong>
          <span>견적 산출내역을 기준으로 계약 시작월~종료월에 해당하는 검수계획 금액을 생성합니다.</span>
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
        <div class="os-inspection-title">생성된 실투입(검수)계획 <em>${generated || savedRows ? '구매 전송 예정 데이터' : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan">
            <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>시작월</span><span>종료월</span><span>계획MM</span><span>검수계획금액</span><span>상태</span></div>
            ${planRows.map(row => `
              <div class="os-inspection-row">
                <span>${row.workType}</span><span>${row.grade}</span><span>${row.planStart}</span><span>${row.planEnd}</span><span>${row.planMm.toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalPlan)}원</span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 기술등급별 계획이 생성됩니다.</div>'}
      </div>
    </div>`;
}

function getOutsourceInspectionRows(quoteNo, startDate, endDate) {
  const rows = outsourceQuoteBreakdownData[quoteNo] || [];
  const contractMonths = monthRangeByDate(startDate, endDate);
  return rows.flatMap(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const targetMonths = rowMonths.filter(m => contractMonths.includes(m));
    const monthlyAmount = rowMonths.length ? Math.round(row.amount / rowMonths.length) : 0;
    const monthlyMm = rowMonths.length ? Math.round((row.mm / rowMonths.length) * 100) / 100 : 0;
    return targetMonths.map(month => ({
      ...row,
      month,
      planMm: monthlyMm,
      planAmount: monthlyAmount,
      status: '구매전송 대기',
    }));
  });
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
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = planRows.reduce((sum, row) => sum + row.planAmount, 0);
  const planMonths = [...new Set(planRows.map(row => row.month))];
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 실투입(검수)계획</strong>
          <span>실투입(검수)계획 생성 시 견적 라인을 월별 검수계획으로 펼쳐서 생성합니다.</span>
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
        <div class="os-inspection-title">생성된 월별 실투입(검수)계획 <em>${generated || savedRows ? `${planMonths.join(', ')} / 구매 전송 예정` : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan monthly">
            <div class="os-inspection-row head"><span>검수월</span><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수금액</span><span>상태</span></div>
            ${planRows.map(row => `
              <div class="os-inspection-row">
                <span>${row.month}</span><span>${row.workType}</span><span>${row.grade}</span><span>${row.planMm.toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span>${fmt(totalPlan)}원</span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 견적 라인의 월별 계획 금액이 생성됩니다.</div>'}
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

function saveOtherOutsourceExpense() {
  const expectedMonth = document.getElementById('other-os-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-os-amount')?.value || 0);
  const description = document.getElementById('other-os-desc')?.value || '';

  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  getOtherOutsourceRows().unshift({
    id:`oo-${Date.now()}`,
    expectedMonth,
    amount,
    description,
    status:'계획',
  });
  showToast('기타외주비 계획이 등록되었습니다.');
  renderBudgetPage();
}

function applyMaPurchaseQuote(quoteNo, amount, title) {
  maQuoteNo = quoteNo;
  maQuoteAmount = amount;
  maQuoteTitle = title;
  const quoteEl = document.getElementById('ma-quote-no');
  const amountEl = document.getElementById('ma-amount');
  const detailEl = document.getElementById('ma-product-detail');
  if (quoteEl) quoteEl.value = quoteNo;
  if (amountEl) amountEl.value = amount;
  if (detailEl) detailEl.value = title;
  showToast('MA 견적 데이터가 입력값에 반영되었습니다.');
}

function saveMaOutsourceItem() {
  const item = {
    id:`ma-${Date.now()}`,
    large:document.getElementById('ma-large')?.value || '',
    middle:document.getElementById('ma-middle')?.value || '',
    small:document.getElementById('ma-small')?.value || '',
    model:document.getElementById('ma-model')?.value || '',
    productDetail:document.getElementById('ma-product-detail')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('ma-qty')?.value || 0),
    unit:document.getElementById('ma-unit')?.value || '',
    revenueBasis:document.getElementById('ma-revenue-basis')?.value || '',
    deliveryStart:document.getElementById('ma-start')?.value || '',
    deliveryEnd:document.getElementById('ma-end')?.value || '',
    quoteNo:document.getElementById('ma-quote-no')?.value || '',
    amount:parseBudgetAmount(document.getElementById('ma-amount')?.value || 0),
    status:'견적반영',
  };

  if (!item.large || !item.middle || !item.small || !item.quantity || !item.revenueBasis || !item.deliveryStart || !item.deliveryEnd || !item.amount) {
    showToast('MA 필수값과 견적 금액을 입력해 주세요.');
    return;
  }

  getMaOutsourceRows().unshift(item);
  showToast('MA 외주비 계획이 등록되었습니다.');
  renderBudgetPage();
}

