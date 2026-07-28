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

const customReportPresets = {
  all: customReportFields.map(field => field.key),
  pm: ['projectNo','projectName','projectType','pmName','startDate','endDate','projectStatus','budgetVersion','finalApprovedAt'],
  leader: ['projectNo','projectName','salesDept','pmName','projectStatus','finalLaborCost','finalMaterialCost','finalAsCost','erpSendStatus'],
  close: ['projectNo','projectName','endDate','projectStatus','erpEndDate','freeMaintenanceYn','finalApprovedAt','erpSendStatus'],
};

let customReportType = 'project';
let customReportSelectedFields = [...customReportPresets.all];
let customReportAppliedFields = [...customReportSelectedFields];
let customReportQuery = '';

function getReportFieldGroups() {
  return customReportFields.reduce((acc, field) => {
    acc[field.group] = acc[field.group] || [];
    acc[field.group].push(field);
    return acc;
  }, {});
}

function setCustomReportType(value) {
  customReportType = value;
  renderCustomReport();
}

function toggleCustomReportField(key) {
  if (customReportSelectedFields.includes(key)) {
    customReportSelectedFields = customReportSelectedFields.filter(fieldKey => fieldKey !== key);
  } else {
    customReportSelectedFields = [...customReportSelectedFields, key];
  }
  renderCustomReport();
}

function setCustomReportPreset(type) {
  customReportSelectedFields = [...(customReportPresets[type] || customReportPresets.all)];
  showToast(type === 'all' ? '전체 필드를 선택했습니다.' : 'AI가 목적에 맞는 필드를 추천했습니다.');
  renderCustomReport();
}

function toggleCustomReportGroup(group, checked) {
  const keys = customReportFields.filter(field => field.group === group).map(field => field.key);
  customReportSelectedFields = checked
    ? Array.from(new Set([...customReportSelectedFields, ...keys]))
    : customReportSelectedFields.filter(key => !keys.includes(key));
  renderCustomReport();
}

function applyCustomReportSearch() {
  customReportAppliedFields = customReportFields
    .filter(field => customReportSelectedFields.includes(field.key))
    .map(field => field.key);
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
  if (!q) return customReportRows;
  return customReportRows.filter(row => Object.values(row).join(' ').toLowerCase().includes(q));
}

function renderCustomReportFieldSelector() {
  const groups = getReportFieldGroups();
  return Object.entries(groups).map(([group, fields]) => {
    const allChecked = fields.every(field => customReportSelectedFields.includes(field.key));
    return `
      <div class="custom-report-field-group">
        <label class="custom-report-group-head">
          <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleCustomReportGroup('${group}', this.checked)">
          <strong>${group}</strong>
          <span>${fields.filter(field => customReportSelectedFields.includes(field.key)).length}/${fields.length}</span>
        </label>
        <div class="custom-report-field-list">
          ${fields.map(field => `
            <label>
              <input type="checkbox" ${customReportSelectedFields.includes(field.key) ? 'checked' : ''} onchange="toggleCustomReportField('${field.key}')">
              <span>${field.label}</span>
            </label>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderCustomReportTable() {
  const fields = customReportFields.filter(field => customReportAppliedFields.includes(field.key));
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
  const selectedCount = customReportSelectedFields.length;
  root.innerHTML = `
    <div class="custom-report-page">
      <div class="custom-report-hero">
        <div>
          <div class="setup-eyebrow">AI 레포트</div>
          <div class="setup-title">맞춤 레포트 조회</div>
          <p>필요한 필드만 선택해서 조회하고, 조회된 컬럼 그대로 추출합니다. 기본값은 전체 필드 선택입니다.</p>
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
        <button onclick="customReportSelectedFields=[];renderCustomReport()">전체 해제</button>
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
