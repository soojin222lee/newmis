const customReportFields = [
  { key:'projectNo', label:'프로젝트번호', group:'프로젝트 기본정보' },
  { key:'projectName', label:'프로젝트명', group:'프로젝트 기본정보' },
  { key:'orderCompany', label:'발주처', group:'프로젝트 기본정보' },
  { key:'contractCompany', label:'계약처', group:'프로젝트 기본정보' },
  { key:'projectType', label:'프로젝트유형', group:'프로젝트 기본정보' },
  { key:'salesDivision', label:'매출귀속부문', group:'조직/PM' },
  { key:'salesHead', label:'매출귀속본부', group:'조직/PM' },
  { key:'salesDept', label:'매출귀속부서', group:'조직/PM' },
  { key:'pmNo', label:'PM사번', group:'조직/PM' },
  { key:'pmName', label:'PM명', group:'조직/PM' },
  { key:'startDate', label:'프로젝트시작일', group:'기간/상태' },
  { key:'endDate', label:'프로젝트종료일', group:'기간/상태' },
  { key:'projectStatus', label:'프로젝트상태', group:'기간/상태' },
  { key:'erpEndDate', label:'ERP종료일', group:'기간/상태' },
  { key:'freeMaintenanceYn', label:'무상하자보증여부', group:'계약/검수' },
  { key:'finalLaborCost', label:'최종예산인건비', group:'예산/실적' },
  { key:'overseasPmYn', label:'해외PM여부', group:'계약/검수' },
  { key:'relatedCompanyYn', label:'관계사여부', group:'계약/검수' },
  { key:'finalMaterialCost', label:'최종예산재료비', group:'예산/실적' },
  { key:'finalAsCost', label:'최종예산AS비', group:'예산/실적' },
  { key:'finalApprovedAt', label:'최종예산승인일자', group:'ERP/정산' },
  { key:'budgetVersion', label:'실행예산버전', group:'ERP/정산' },
  { key:'erpSendStatus', label:'ERP전송상태', group:'ERP/정산' },
];

const customReportRows = [
  { projectNo:'IV107817', projectName:'SKALA 2.0 지역 확대', orderCompany:'SK Telecom', contractCompany:'SK Telecom', projectType:'투자-개발', salesDivision:'기업문화부문', salesHead:'HR추진담당', salesDept:'AX교육사업1팀', pmNo:'09764', pmName:'김영욱', startDate:'2026-05-23', endDate:'2027-01-31', projectStatus:'착수완료', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:0, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:0, finalAsCost:0, finalApprovedAt:'', budgetVersion:'V1.0', erpSendStatus:'전송대기' },
  { projectNo:'IV107816', projectName:'SK에코플랜트 매터리얼즈 구축', orderCompany:'SK에코플랜트', contractCompany:'SK에코플랜트', projectType:'원가-선투입', salesDivision:'', salesHead:'AIM본부(제조컨설팅)', salesDept:'AIM본부(제조컨설팅)', pmNo:'60019', pmName:'정병용', startDate:'2026-08-03', endDate:'2026-10-02', projectStatus:'수행', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:77244819, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:0, finalAsCost:0, finalApprovedAt:'2026-07-28', budgetVersion:'V1.2', erpSendStatus:'미전송' },
  { projectNo:'IV107815', projectName:'SKI ES 26년 Enterprise Cloud 전환', orderCompany:'SKI ES', contractCompany:'SKI ES', projectType:'원가-선투입', salesDivision:'Cloud부문', salesHead:'Cloud Tech본부', salesDept:'제조Cloud PM팀', pmNo:'04022', pmName:'신동우', startDate:'2026-07-22', endDate:'2026-08-21', projectStatus:'착수완료', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:0, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:0, finalAsCost:0, finalApprovedAt:'', budgetVersion:'V1.0', erpSendStatus:'전송완료' },
  { projectNo:'IV107814', projectName:'ISC 26년 AI PMO', orderCompany:'ISC', contractCompany:'ISC', projectType:'원가-선투입', salesDivision:'', salesHead:'AI SCM본부(SCM컨설팅)', salesDept:'AI SCM본부(SCM컨설팅)', pmNo:'60087', pmName:'안정준', startDate:'2026-07-20', endDate:'2026-08-14', projectStatus:'착수완료', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:0, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:0, finalAsCost:0, finalApprovedAt:'', budgetVersion:'V1.0', erpSendStatus:'전송대기' },
  { projectNo:'IV107813', projectName:'그룹 통합 API 운영체계 구축', orderCompany:'SK AX', contractCompany:'SK AX', projectType:'투자-개발', salesDivision:'제조서비스부문', salesHead:'제조서비스2본부', salesDept:'Digital SHE/ESG서비스팀', pmNo:'03445', pmName:'여인성', startDate:'2026-07-01', endDate:'2026-12-31', projectStatus:'수행', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:1169109563, overseasPmYn:'N', relatedCompanyYn:'Y', finalMaterialCost:100000000, finalAsCost:0, finalApprovedAt:'2026-07-27', budgetVersion:'V1.1', erpSendStatus:'미전송' },
  { projectNo:'IV107812', projectName:'SKT 26년 Tdic EOS 보안 고도화', orderCompany:'SKT', contractCompany:'SKT', projectType:'원가-선투입', salesDivision:'Cloud부문', salesHead:'Cyber보안사업본부', salesDept:'보안사업개발팀', pmNo:'08014', pmName:'김민수', startDate:'2026-07-15', endDate:'2026-10-31', projectStatus:'수행', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:810880000, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:810880000, finalAsCost:0, finalApprovedAt:'2026-07-23', budgetVersion:'V1.2', erpSendStatus:'전송완료' },
  { projectNo:'IV107811', projectName:'SKT 26년 Tdic EOS 보안 운영', orderCompany:'SKT', contractCompany:'SKT', projectType:'원가-선투입', salesDivision:'Cloud부문', salesHead:'Cyber보안사업본부', salesDept:'보안사업개발팀', pmNo:'08014', pmName:'김민수', startDate:'2026-07-15', endDate:'2026-10-31', projectStatus:'수행', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:1998457000, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:1998457000, finalAsCost:0, finalApprovedAt:'2026-07-23', budgetVersion:'V1.2', erpSendStatus:'전송완료' },
  { projectNo:'IV107810', projectName:'이엔에스 시티가스 Skyline 구축', orderCompany:'E&S', contractCompany:'E&S', projectType:'원가-선투입', salesDivision:'Enterprise서비스부문', salesHead:'Enterprise Solution1본부', salesDept:'AX ERP사업개발팀', pmNo:'05360', pmName:'이정호', startDate:'2026-07-21', endDate:'2026-08-31', projectStatus:'수행', erpEndDate:'', freeMaintenanceYn:'N', finalLaborCost:660812211, overseasPmYn:'N', relatedCompanyYn:'N', finalMaterialCost:6297997200, finalAsCost:0, finalApprovedAt:'2026-07-23', budgetVersion:'V1.1', erpSendStatus:'미전송' },
];

const customBudgetReportFields = [
  { key:'projectNo', label:'프로젝트번호', group:'프로젝트 기본정보' },
  { key:'customer', label:'고객사', group:'프로젝트 기본정보' },
  { key:'projectName', label:'프로젝트명', group:'프로젝트 기본정보' },
  { key:'ossReviewYn', label:'오픈소스라이선스 검토대상여부', group:'프로젝트 기본정보' },
  { key:'budgetVersionNo', label:'예산버전', group:'버전/상태' },
  { key:'projectType', label:'프로젝트유형', group:'프로젝트 기본정보' },
  { key:'salesDivision', label:'매출귀속부문', group:'조직/PM' },
  { key:'salesHead', label:'매출귀속본부', group:'조직/PM' },
  { key:'projectStatus', label:'프로젝트상태', group:'버전/상태' },
  { key:'relatedCompanyYn', label:'관계사여부', group:'프로젝트 기본정보' },
  { key:'pmName', label:'PM', group:'조직/PM' },
  { key:'approvalRequestedAt', label:'예산승인 요청일', group:'버전/상태' },
  { key:'approvalCompletedAt', label:'예산승인 완료일', group:'버전/상태' },
  { key:'previousTotalCost', label:'전버전 수행비용', group:'전버전 금액' },
  { key:'previousLaborCost', label:'전버전 인건비', group:'전버전 금액' },
  { key:'previousOtCost', label:'전버전 OT비', group:'전버전 금액' },
  { key:'previousOutsourceCost', label:'전버전 외주비', group:'전버전 금액' },
  { key:'previousMaterialCost', label:'전버전 재료비', group:'전버전 금액' },
  { key:'previousExpenseCost', label:'전버전 경비', group:'전버전 금액' },
  { key:'previousPjtReserve', label:'전버전 PJT손실예비비', group:'전버전 금액' },
  { key:'previousAsCost', label:'전버전 AS비', group:'전버전 금액' },
  { key:'previousWlbCost', label:'전버전 WLB', group:'전버전 금액' },
  { key:'previousInternalMm', label:'전버전 내부MM', group:'전버전 금액' },
  { key:'executionCost', label:'수행비용', group:'현재 실행예산' },
  { key:'laborCost', label:'인건비', group:'현재 실행예산' },
  { key:'otCost', label:'OT비', group:'현재 실행예산' },
  { key:'outsourceCost', label:'외주비', group:'현재 실행예산' },
  { key:'materialCost', label:'재료비', group:'현재 실행예산' },
  { key:'expenseCost', label:'경비', group:'현재 실행예산' },
  { key:'pjtReserve', label:'PJT손실예비비', group:'현재 실행예산' },
  { key:'asCost', label:'AS비', group:'현재 실행예산' },
  { key:'wlbCost', label:'WLB', group:'현재 실행예산' },
  { key:'internalMm', label:'내부MM', group:'현재 실행예산' },
];

const customBudgetReportRows = [
  { projectNo:'IV107816', customer:'SK에코플랜트', projectName:'SK에코플랜트 매터리얼즈 26년 기준정보 관리체계 전환_선투입', ossReviewYn:'', budgetVersionNo:1, projectType:'IV62', salesDivision:'Ackerton Partners', salesHead:'AIM본부(제조컨설팅)', projectStatus:'수행', relatedCompanyYn:'N', pmName:'정병용', approvalRequestedAt:'2026-07-28', approvalCompletedAt:'2026-07-28', previousTotalCost:0, previousLaborCost:0, previousOtCost:0, previousOutsourceCost:0, previousMaterialCost:0, previousExpenseCost:0, previousPjtReserve:0, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:0, laborCost:0, otCost:0, outsourceCost:0, materialCost:0, expenseCost:0, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
  { projectNo:'IV107813', customer:'', projectName:'그룹 통합 API운영체계 구축', ossReviewYn:'', budgetVersionNo:1, projectType:'IV50', salesDivision:'제조서비스2본부', salesHead:'Digital SHE/ESG서비스팀', projectStatus:'수행', relatedCompanyYn:'Y', pmName:'여인성', approvalRequestedAt:'2026-07-27', approvalCompletedAt:'2026-07-27', previousTotalCost:0, previousLaborCost:0, previousOtCost:0, previousOutsourceCost:0, previousMaterialCost:0, previousExpenseCost:0, previousPjtReserve:0, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:1169109563, laborCost:528109563, otCost:0, outsourceCost:461000000, materialCost:100000000, expenseCost:17000000, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
  { projectNo:'IV107812', customer:'SKT', projectName:'SKT 26년 Tdic EOS 보안취약점 대응 대체체계', ossReviewYn:'', budgetVersionNo:2, projectType:'IV62', salesDivision:'Cyber보안사업본부', salesHead:'보안사업개발팀', projectStatus:'수행', relatedCompanyYn:'N', pmName:'김민수', approvalRequestedAt:'2026-07-23', approvalCompletedAt:'2026-07-23', previousTotalCost:810880000, previousLaborCost:0, previousOtCost:0, previousOutsourceCost:0, previousMaterialCost:810880000, previousExpenseCost:0, previousPjtReserve:0, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:810880000, laborCost:0, otCost:0, outsourceCost:0, materialCost:810880000, expenseCost:0, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
  { projectNo:'IV107810', customer:'', projectName:'이엔에스 시티가스 Skyline IT 구축 Project', ossReviewYn:'', budgetVersionNo:3, projectType:'IV62', salesDivision:'Enterprise Solution본부', salesHead:'AX ERP사업개발팀', projectStatus:'수행', relatedCompanyYn:'N', pmName:'이정호', approvalRequestedAt:'2026-07-23', approvalCompletedAt:'2026-07-23', previousTotalCost:6608122711, previousLaborCost:135243039, previousOtCost:0, previousOutsourceCost:171882472, previousMaterialCost:6297997200, previousExpenseCost:3000000, previousPjtReserve:0, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:6608122711, laborCost:135243039, otCost:0, outsourceCost:171882472, materialCost:6297997200, expenseCost:3000000, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
  { projectNo:'IV107808', customer:'', projectName:'프로젝트 예산관리 시스템 구축', ossReviewYn:'', budgetVersionNo:1, projectType:'IV52', salesDivision:'전략기획부문', salesHead:'경영정보 AX CoE', projectStatus:'수행', relatedCompanyYn:'N', pmName:'홍서연', approvalRequestedAt:'2026-07-21', approvalCompletedAt:'2026-07-21', previousTotalCost:88785272, previousLaborCost:77785272, previousOtCost:0, previousOutsourceCost:0, previousMaterialCost:0, previousExpenseCost:11000000, previousPjtReserve:0, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:88785272, laborCost:77785272, otCost:0, outsourceCost:0, materialCost:0, expenseCost:11000000, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
  { projectNo:'IV107805', customer:'', projectName:'AX向 To-Be 조직구조 프로젝트', ossReviewYn:'', budgetVersionNo:2, projectType:'IV56', salesDivision:'HR추진담당', salesHead:'AX교육사업2팀', projectStatus:'수행', relatedCompanyYn:'N', pmName:'조승민', approvalRequestedAt:'2026-07-22', approvalCompletedAt:'2026-07-22', previousTotalCost:91200000, previousLaborCost:0, previousOtCost:0, previousOutsourceCost:90000000, previousMaterialCost:0, previousExpenseCost:1200000, previousPjtReserve:21910000, previousAsCost:0, previousWlbCost:0, previousInternalMm:0, executionCost:94315492, laborCost:73335492, otCost:0, outsourceCost:0, materialCost:0, expenseCost:20980000, pjtReserve:0, asCost:0, wlbCost:0, internalMm:0 },
];

const customReportPresets = {
  all: customReportFields.map(field => field.key),
  pm: ['projectNo','projectName','projectType','pmName','startDate','endDate','projectStatus','budgetVersion','finalApprovedAt'],
  leader: ['projectNo','projectName','salesDept','pmName','projectStatus','finalLaborCost','finalMaterialCost','finalAsCost','erpSendStatus'],
  close: ['projectNo','projectName','endDate','projectStatus','erpEndDate','freeMaintenanceYn','finalApprovedAt','erpSendStatus'],
};

const customBudgetReportPresets = {
  all: customBudgetReportFields.map(field => field.key),
  pm: ['projectNo','projectName','projectType','pmName','projectStatus','budgetVersionNo','approvalCompletedAt','executionCost'],
  leader: ['projectNo','projectName','salesDivision','salesHead','projectStatus','executionCost','laborCost','outsourceCost','materialCost','expenseCost'],
  close: ['projectNo','projectName','projectStatus','approvalRequestedAt','approvalCompletedAt','previousTotalCost','executionCost'],
};

let customReportType = 'project';
let customReportSelectedFields = [...customReportPresets.all];
let customReportAppliedFields = [...customReportSelectedFields];
let customReportQuery = '';
const CUSTOM_REPORT_KEY_FIELD = 'projectNo';

function normalizeCustomReportFields(fields) {
  return Array.from(new Set([CUSTOM_REPORT_KEY_FIELD, ...(fields || [])]));
}

function getCustomReportFields() {
  return customReportType === 'budget' ? customBudgetReportFields : customReportFields;
}

function getCustomReportPresets() {
  return customReportType === 'budget' ? customBudgetReportPresets : customReportPresets;
}

function getCustomReportDataset() {
  return customReportType === 'budget' ? customBudgetReportRows : customReportRows;
}

function getReportFieldGroups() {
  return getCustomReportFields().reduce((acc, field) => {
    acc[field.group] = acc[field.group] || [];
    acc[field.group].push(field);
    return acc;
  }, {});
}

function setCustomReportType(value) {
  customReportType = value;
  const presets = getCustomReportPresets();
  customReportSelectedFields = normalizeCustomReportFields(presets.all);
  customReportAppliedFields = [...customReportSelectedFields];
  renderCustomReport();
}

function toggleCustomReportField(key) {
  if (key === CUSTOM_REPORT_KEY_FIELD) return;
  if (customReportSelectedFields.includes(key)) {
    customReportSelectedFields = customReportSelectedFields.filter(fieldKey => fieldKey !== key);
  } else {
    customReportSelectedFields = [...customReportSelectedFields, key];
  }
  renderCustomReport();
}

function setCustomReportPreset(type) {
  const presets = getCustomReportPresets();
  customReportSelectedFields = normalizeCustomReportFields(presets[type] || presets.all);
  showToast(type === 'all' ? '전체 필드를 선택했습니다.' : 'AI가 목적에 맞는 필드를 추천했습니다.');
  renderCustomReport();
}

function toggleCustomReportGroup(group, checked) {
  const keys = getCustomReportFields().filter(field => field.group === group).map(field => field.key);
  customReportSelectedFields = checked
    ? normalizeCustomReportFields([...customReportSelectedFields, ...keys])
    : normalizeCustomReportFields(customReportSelectedFields.filter(key => key === CUSTOM_REPORT_KEY_FIELD || !keys.includes(key)));
  renderCustomReport();
}

function applyCustomReportSearch() {
  const activeFieldKeys = new Set(getCustomReportFields().map(field => field.key));
  customReportAppliedFields = normalizeCustomReportFields(customReportSelectedFields).filter(key => activeFieldKeys.has(key));
  if (!customReportAppliedFields.length) {
    showToast('최소 1개 이상의 필드를 선택해주세요.');
    customReportAppliedFields = ['projectNo', 'projectName'];
  }
  showToast(`${customReportAppliedFields.length}개 필드 기준으로 조회했습니다.`);
  renderCustomReport();
}

function updateCustomReportQuery(value) {
  customReportQuery = value;
  renderCustomReport();
}

function exportCustomReport() {
  showToast('현재 조회된 필드 기준으로 엑셀 다운로드를 생성했습니다.');
}

function getCustomReportRows() {
  const q = customReportQuery.trim().toLowerCase();
  const rows = getCustomReportDataset();
  if (!q) return rows;
  return rows.filter(row => Object.values(row).join(' ').toLowerCase().includes(q));
}

function renderCustomReportFieldSelector() {
  const groups = getReportFieldGroups();
  return Object.entries(groups).map(([group, fields]) => {
    const selectableFields = fields.filter(field => field.key !== CUSTOM_REPORT_KEY_FIELD);
    const allChecked = selectableFields.length
      ? selectableFields.every(field => customReportSelectedFields.includes(field.key))
      : true;
    return `
      <div class="custom-report-field-group">
        <label class="custom-report-group-head">
          <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleCustomReportGroup('${group}', this.checked)">
          <strong>${group}</strong>
          <span>${fields.filter(field => customReportSelectedFields.includes(field.key)).length}/${fields.length}</span>
        </label>
        <div class="custom-report-field-list">
          ${fields.map(field => `
            <label class="${field.key === CUSTOM_REPORT_KEY_FIELD ? 'locked' : ''}">
              <input type="checkbox" ${customReportSelectedFields.includes(field.key) ? 'checked' : ''} ${field.key === CUSTOM_REPORT_KEY_FIELD ? 'disabled' : ''} onchange="toggleCustomReportField('${field.key}')">
              <span>${field.label}</span>
              ${field.key === CUSTOM_REPORT_KEY_FIELD ? '<em>키값</em>' : customReportSelectedFields.includes(field.key) ? `<em>${customReportSelectedFields.indexOf(field.key) + 1}</em>` : ''}
            </label>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderCustomReportTable() {
  const fieldMap = Object.fromEntries(getCustomReportFields().map(field => [field.key, field]));
  const fields = normalizeCustomReportFields(customReportAppliedFields)
    .map(key => fieldMap[key])
    .filter(Boolean);
  const rows = getCustomReportRows();
  const headers = fields.map(field => `<th>${field.label}</th>`).join('');
  const body = rows.map(row => `
    <tr>
      ${fields.map(field => {
        const value = row[field.key];
        const isNumber = typeof value === 'number';
        return `<td class="${isNumber ? 'num' : ''}">${isNumber ? fmt(value) : (value || '-')}</td>`;
      }).join('')}
    </tr>
  `).join('');
  return `
    <div class="custom-report-result-card">
      <div class="custom-report-result-head">
        <div>
          <strong>조회 결과</strong>
          <span>${rows.length}건 · ${fields.length}개 필드</span>
        </div>
        <button class="labor-sub-btn" onclick="exportCustomReport()">엑셀 다운로드</button>
      </div>
      <div class="custom-report-table-scroll">
        <table class="custom-report-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

function renderCustomReport() {
  const root = document.getElementById('s-custom-report');
  if (!root) return;
  const activeFieldKeys = new Set(getCustomReportFields().map(field => field.key));
  customReportSelectedFields = normalizeCustomReportFields(customReportSelectedFields).filter(key => activeFieldKeys.has(key));
  customReportAppliedFields = normalizeCustomReportFields(customReportAppliedFields).filter(key => activeFieldKeys.has(key));
  const selectedCount = customReportSelectedFields.length;
  root.innerHTML = `
    <div class="custom-report-page">
      <div class="custom-report-hero">
        <div>
          <div class="setup-eyebrow">AI 레포트</div>
          <div class="setup-title">맞춤 레포트 조회</div>
          <p>필요한 필드만 선택해서 조회하고, 조회된 컬럼 그대로 추출합니다. 프로젝트번호는 키값이라 고정되고, 나머지는 선택한 순서대로 컬럼이 배치됩니다.</p>
        </div>
        <div class="custom-report-ai">
          <span>AI 적용 아이디어</span>
          <strong>보고 목적을 선택하면 필요한 필드를 자동 추천합니다.</strong>
        </div>
      </div>

      <div class="custom-report-toolbar">
        <label>
          <span>레포트 유형</span>
          <select onchange="setCustomReportType(this.value)">
            <option value="project" ${customReportType === 'project' ? 'selected' : ''}>프로젝트 현황</option>
            <option value="budget" ${customReportType === 'budget' ? 'selected' : ''}>실행예산 현황</option>
            <option value="outsource" ${customReportType === 'outsource' ? 'selected' : ''}>외주계약 현황</option>
            <option value="labor" ${customReportType === 'labor' ? 'selected' : ''}>인건비 투입 현황</option>
          </select>
        </label>
        <label class="wide">
          <span>검색어</span>
          <input value="${customReportQuery}" placeholder="프로젝트번호, 프로젝트명, PM명 검색" oninput="updateCustomReportQuery(this.value)">
        </label>
        <button class="labor-main-btn" onclick="applyCustomReportSearch()">조회</button>
      </div>

      <div class="custom-report-presets">
        <button onclick="setCustomReportPreset('all')">전체 선택</button>
        <button onclick="customReportSelectedFields=[CUSTOM_REPORT_KEY_FIELD];renderCustomReport()">전체 해제</button>
        <button onclick="setCustomReportPreset('pm')">AI 추천: PM용</button>
        <button onclick="setCustomReportPreset('leader')">AI 추천: 팀장 보고용</button>
        <button onclick="setCustomReportPreset('close')">AI 추천: 종료/정산용</button>
        <span>선택 필드 ${selectedCount}개</span>
      </div>

      <div class="custom-report-layout">
        <div class="custom-report-field-card">
          <div class="custom-report-card-title">필드 선택</div>
          ${renderCustomReportFieldSelector()}
        </div>
        ${renderCustomReportTable()}
      </div>
    </div>`;
}
