// AI GUIDE: 맞춤 레포트 화면 로직 파일입니다.
// - 레포트 유형은 프로젝트 현황과 실행예산 현황을 지원합니다.
// - 프로젝트번호(projectNo)는 조인 키이므로 항상 선택되고 해제할 수 없습니다.
// - 사용자가 필드를 체크한 순서가 조회 결과 컬럼 순서와 엑셀 다운로드 컬럼 순서가 됩니다.
// - 실행예산 현황은 예산버전, 승인일, 전버전 금액, 현재 수행비용 및 5대 비용 항목을 조회하는 컨셉입니다.
// - AI 화면 가이드는 필드 선택, 컬럼 순서, 레포트 유형별 데이터셋 차이를 우선 설명해야 합니다.

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

// ── AI 자연어 질의 (LLM → SQL → 실제 SQLite 실행) ──
let crNlQuery = '';
let crNlResult = null; // { state:'loading'|'done'|'error', sql, columns, rows, error, source }
let crShowSql = false; // 운영자 전용 SQL 표시 토글 (기본: 일반 사용자 = 숨김)
let crConditions = {}; // 선택 조건 { projectType:[...], salesDivision:[...], projectStatus:[...] }

// 조건 선택 항목 — 뭘 물어볼 수 있는지 힌트. 값은 실제 데이터(맞춤레포트 필드 일부)에서 도출.
const CR_COND_FACETS = [
  { key: 'projectType', label: '프로젝트 유형' },
  { key: 'salesDivision', label: '매출귀속부문' },
  { key: 'projectStatus', label: '프로젝트 상태' },
];
// 프로젝트 유형 — 실제 유형 코드 기준 예시(사용자가 뭘 고를 수 있는지 힌트)
const CR_PROJECT_TYPES = [
  '제안-본제안', 'SI-컨설팅', 'SI-AD', 'SI-H/W S/W 설치', 'SI-OE', 'SI-MA', 'SI-인력공급', 'SI-공사',
  'SI-용역보증', 'SI-인도기준', 'SI-Cloud개발', 'SI-AI/플랫폼 개발', 'SI-Cloud(V)', 'SI-AI/플랫폼(V)',
  'OS-S/W', 'OS-AD', 'OS-컨설팅', 'OS-인력공급', 'OS-운영', 'OS-AM SW 유지보수', '투자-개발', '원가-선투입',
];
function crDistinct(key) {
  if (key === 'projectType') return CR_PROJECT_TYPES;
  return [...new Set(customReportRows.map(r => r[key]).filter(v => v != null && v !== ''))];
}
function crSyncInput() { const inp = document.getElementById('cr-ai-input'); if (inp) crNlQuery = inp.value; }
function crToggleSql() { crSyncInput(); crShowSql = !crShowSql; renderAiReport(); }
function crToggleCond(facet, value) {
  if (!crConditions[facet]) crConditions[facet] = [];
  const i = crConditions[facet].indexOf(value);
  if (i >= 0) crConditions[facet].splice(i, 1); else crConditions[facet].push(value);
  crSyncInput(); renderAiReport();
}
// 선택 조건 → LLM에 전달할 WHERE 힌트 문구
function crConditionText() {
  const parts = [];
  CR_COND_FACETS.forEach(f => {
    const vals = crConditions[f.key];
    if (vals && vals.length) parts.push(`projects.${f.key}가 다음 문자열 값과 정확히 일치(= 또는 IN, 값을 쪼개지 말 것): ${vals.map(v => `'${v}'`).join(', ')}`);
  });
  return parts.length ? ` (반드시 다음 조건을 projects 테이블 컬럼으로 WHERE 적용하고, 조건에 필요 없으면 budget 테이블과 조인하지 마: ${parts.join(' 그리고 ')})` : '';
}
function crOperatorBarHtml() {
  return `<div class="cr-op-bar">
    <span class="cr-op-note">🔒 생성되는 SQL은 <b>일반 사용자에게 노출되지 않습니다.</b> 운영자만 확인용으로 볼 수 있어요.</span>
    <button class="cr-op-toggle ${crShowSql ? 'on' : ''}" onclick="crToggleSql()" role="switch" aria-checked="${crShowSql}"><i></i>운영자 보기 · SQL ${crShowSql ? '표시' : '숨김'}</button>
  </div>`;
}
function crConditionPanelHtml() {
  return `<div class="cr-cond">
    <div class="cr-cond-title">조건 선택 <span>선택한 조건은 질문에 자동 반영돼요 (복수 선택 가능)</span></div>
    ${CR_COND_FACETS.map(f => `
      <div class="cr-cond-row">
        <div class="cr-cond-label">${f.label}</div>
        <div class="cr-cond-chips">
          ${crDistinct(f.key).map(v => {
            const on = (crConditions[f.key] || []).includes(v);
            return `<button class="cr-cond-chip ${on ? 'on' : ''}" data-v="${v.replace(/"/g, '&quot;')}" onclick="crToggleCond('${f.key}', this.dataset.v)">${v}</button>`;
          }).join('')}
        </div>
      </div>`).join('')}
  </div>`;
}
function crFmtCell(v) {
  if (v == null) return '<span class="cr-ai-null">-</span>';
  if (typeof v === 'number') return v.toLocaleString('ko-KR');
  return String(v).replace(/</g, '&lt;');
}
function crNlResultHtml() {
  const r = crNlResult;
  if (!r) return '';
  if (r.state === 'loading') return `<div class="cr-ai-loading"><span class="cr-ai-spin"></span>AI가 SQL을 생성하고 실행 중이에요…</div>`;
  const srcTag = r.source === 'ai' ? `<span class="cr-ai-src ai">✦ AI 생성 SQL</span>` : (r.source === 'fallback' ? `<span class="cr-ai-src">샘플 (API 키 미설정)</span>` : '');
  // SQL 블록은 운영자 보기(crShowSql)일 때만 노출 — 일반 사용자에게는 숨김
  const sqlBlock = (crShowSql && r.sql) ? `<div class="cr-ai-sql"><div class="cr-ai-sql-h">생성된 SQL <span class="cr-ai-op-only">운영자 전용</span> ${srcTag}</div><pre>${String(r.sql).replace(/</g, '&lt;')}</pre></div>` : '';
  if (r.state === 'error') return sqlBlock + `<div class="cr-ai-err">${String(r.error || '오류가 발생했습니다.').replace(/</g, '&lt;')}</div>`;
  if (!r.columns || !r.columns.length) return sqlBlock + `<div class="cr-ai-err">조건에 맞는 결과가 없습니다.</div>`;
  const head = `<tr>${r.columns.map(c => `<th>${c}</th>`).join('')}</tr>`;
  const bodyRows = r.rows.map(row => `<tr>${r.columns.map(c => `<td>${crFmtCell(row[c])}</td>`).join('')}</tr>`).join('');
  return sqlBlock + `<div class="cr-ai-count">${r.rows.length}건 조회</div><div class="cr-ai-tablewrap"><table class="cr-ai-table"><thead>${head}</thead><tbody>${bodyRows}</tbody></table></div>`;
}
function aiReportPanelHtml() {
  return `
      <div class="cr-ai-panel">
        <div class="cr-ai-top">
          <span class="cr-ai-chip">✦ AI</span>
          <div class="cr-ai-title">자연어로 물어보면 <b>SQL로 변환해 실제 조회</b>합니다 <span class="cr-ai-tag2">LLM → SQL</span></div>
        </div>
        ${crOperatorBarHtml()}
        ${crConditionPanelHtml()}
        <div class="cr-ai-inputrow">
          <input id="cr-ai-input" value="${(crNlQuery || '').replace(/"/g, '&quot;')}" placeholder="예) 외주비가 4억 넘는 프로젝트 보여줘 / 재료비 큰 순서 3개" onkeydown="if(event.key==='Enter')runNl2Sql()">
          <button class="labor-main-btn" onclick="runNl2Sql()">질의 실행</button>
        </div>
        <div class="cr-ai-examples">
          ${['상태가 수행인 프로젝트의 PM과 인건비', '재료비가 가장 큰 프로젝트 3개', '김민수 PM이 맡은 프로젝트', '실행예산 외주비를 부문별 합계로'].map(q => `<button onclick="runNl2Sql(this.textContent)">${q}</button>`).join('')}
        </div>
        <div id="cr-ai-result" class="cr-ai-result">${crNlResultHtml()}</div>
      </div>`;
}
function renderAiReport() {
  const root = document.getElementById('s-ai-report');
  if (!root) return;
  root.innerHTML = `
    <div class="custom-report-page">
      <div class="custom-report-hero">
        <div>
          <div class="setup-eyebrow">AI 레포트</div>
          <div class="setup-title">자연어 데이터 질의</div>
          <p>질문을 한국어로 입력하면 AI가 SQL로 변환해 실제 데이터를 조회합니다. 생성된 SQL도 함께 확인할 수 있고, 안전하게 조회(SELECT) 전용으로만 실행됩니다.</p>
        </div>
        <div class="custom-report-ai">
          <span>LLM → SQL</span>
          <strong>생성된 SQL을 그대로 보여주고 실제 DB에서 조회합니다.</strong>
        </div>
      </div>
      ${aiReportPanelHtml()}
    </div>`;
}
async function runNl2Sql(preset) {
  const inp = document.getElementById('cr-ai-input');
  const userQ = String(preset != null ? preset : (inp ? inp.value : crNlQuery)).trim();
  const condText = crConditionText();
  if (!userQ && !condText) { showToast('질문을 입력하거나 조건을 선택하세요.'); return; }
  crNlQuery = userQ; if (inp && preset != null) inp.value = userQ;
  const question = (userQ || '조건에 해당하는 프로젝트를 조회해줘') + condText;
  crNlResult = { state: 'loading' };
  const box = document.getElementById('cr-ai-result'); if (box) box.innerHTML = crNlResultHtml();
  try {
    const r = await fetch('/api/nl2sql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
    const d = await r.json();
    if (d.error) crNlResult = { state: 'error', sql: d.sql, error: d.error, source: d.source };
    else crNlResult = { state: 'done', sql: d.sql, columns: d.columns, rows: d.rows, source: d.source };
  } catch (e) { crNlResult = { state: 'error', error: '요청 실패: ' + (e.message || e) }; }
  const box2 = document.getElementById('cr-ai-result'); if (box2) box2.innerHTML = crNlResultHtml();
}

// ── 맞춤 레포트 AI 도우미 채팅 (필드 설명 + 목적별 필드 추천) ──
let crChatMsgs = [];      // { role:'user'|'ai', text, fields? }
let crChatLoading = false;
function crEsc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); }
function reportChatHtml() {
  const body = crChatMsgs.length
    ? crChatMsgs.map(m => m.role === 'user'
        ? `<div class="rc-msg user">${crEsc(m.text)}</div>`
        : `<div class="rc-msg ai"><span class="rc-ai-ic">✦</span><div class="rc-ai-body">${crEsc(m.text)}${m.fields && m.fields.length ? `<div class="rc-applied">추천 필드 ${m.fields.length}개를 자동으로 선택했어요 ✓</div>` : ''}</div></div>`
      ).join('')
    : `<div class="rc-empty">필드가 뭘 의미하는지, 어떤 레포트가 필요한지 편하게 물어보세요.<br>목적을 말하면 <b>필요한 필드를 자동으로 골라드려요.</b></div>`;
  const loading = crChatLoading ? `<div class="rc-msg ai"><span class="rc-ai-ic">✦</span><div class="rc-ai-body rc-loading"><span class="cr-ai-spin"></span>생각하는 중…</div></div>` : '';
  return `
      <div class="report-chat">
        <div class="rc-head"><span class="cr-spark">✦</span> AI 레포트 도우미 <span class="rc-sub">필드 설명 · 목적별 필드 자동 추천</span></div>
        <div class="rc-body" id="rc-body">${body}${loading}</div>
        <div class="rc-examples">
          ${['프로젝트 기본정보엔 뭐가 있어?', '매출귀속부서가 무슨 뜻이야?', '팀 귀속 프로젝트 원가 변동 비교분석 레포트 추천해줘'].map(q => `<button onclick="sendReportChat(this.textContent)">${q}</button>`).join('')}
        </div>
        <div class="rc-inputrow">
          <input id="rc-input" placeholder="필드나 레포트에 대해 물어보세요 (예: 원가 비교분석용 레포트 추천)" onkeydown="if(event.key==='Enter')sendReportChat()">
          <button class="labor-main-btn" onclick="sendReportChat()">전송</button>
        </div>
      </div>`;
}
function crScrollChat() { const b = document.getElementById('rc-body'); if (b) b.scrollTop = b.scrollHeight; }
async function sendReportChat(preset) {
  const inp = document.getElementById('rc-input');
  const msg = String(preset != null ? preset : (inp ? inp.value : '')).trim();
  if (!msg || crChatLoading) return;
  crChatMsgs.push({ role: 'user', text: msg });
  crChatLoading = true;
  if (inp) inp.value = '';
  renderCustomReport(); crScrollChat();
  try {
    const fields = getCustomReportFields().map(f => ({ key: f.key, label: f.label, group: f.group }));
    const reportType = customReportType === 'budget' ? '실행예산 현황' : '프로젝트 현황';
    const r = await fetch('/api/report-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, reportType, fields }) });
    const d = await r.json();
    const validKeys = new Set(fields.map(f => f.key));
    const rec = Array.isArray(d.fields) ? d.fields.filter(k => validKeys.has(k)) : [];
    crChatMsgs.push({ role: 'ai', text: d.reply || '(응답이 없어요)', fields: rec });
    if (rec.length) {
      customReportSelectedFields = normalizeCustomReportFields([CUSTOM_REPORT_KEY_FIELD, ...rec]);
      customReportAppliedFields = [...customReportSelectedFields];
    }
  } catch (e) {
    crChatMsgs.push({ role: 'ai', text: '요청에 실패했어요. 잠시 후 다시 시도해 주세요.', fields: [] });
  }
  crChatLoading = false;
  renderCustomReport(); crScrollChat();
}

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
        <div class="cr-hero-main">
          <div class="cr-hero-eyebrow"><span class="cr-spark">✦</span>AI 맞춤 레포트</div>
          <div class="setup-title">맞춤 레포트 조회</div>
          <p>필요한 필드만 골라 조회하고 그대로 추출합니다. 보고 목적을 고르면 <b>AI가 필드를 추천</b>해드려요.</p>
        </div>
        <div class="custom-report-ai">
          <span><span class="cr-spark">✦</span>AI 필드 추천</span>
          <strong>보고 목적을 선택하면 필요한 필드를 자동으로 골라드려요.</strong>
        </div>
      </div>

      ${reportChatHtml()}

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
        <span class="cr-preset-ailabel"><span class="cr-spark">✦</span>AI 추천</span>
        <button class="cr-preset-ai" onclick="setCustomReportPreset('pm')">PM용</button>
        <button class="cr-preset-ai" onclick="setCustomReportPreset('leader')">팀장 보고용</button>
        <button class="cr-preset-ai" onclick="setCustomReportPreset('close')">종료·정산용</button>
        <span class="cr-preset-count">선택 필드 <b>${selectedCount}</b>개</span>
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
