// AI GUIDE: 수행원가 > 원가조정 > 재료비(CATS[2]) 계정 전용 진입 소스입니다.
// - URL: #/budget-adjust/material
// - 재료비 계정 편집기 진입점(데코레이터)과 서브탭 분기(renderMaterialPlanPanel)를 이 파일이 소유합니다.
// - 세부 패널(상품재료비 renderMaterialItemPanel / 감가상각비 renderMaterialDepreciationPanel /
//   기타·이관재료비 renderOtherMaterialPanel / renderMaterialShell 등)은 여러 파일에 중복 정의된
//   레거시라 공유 코어(budget-status-*.js)에 그대로 두고 런타임 호출합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).

// 재료비 계정 편집기 데코레이터: 자기 계정(CATS[2])만 처리하고 나머지는 이전 정의로 위임
var renderBudgetAccountEditorBeforeMaterial = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[2]) return renderBudgetAccountEditorBeforeMaterial(data, account);
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  // 편집기 헤드([← 계정 선택] 버튼 + "재료비 수정" 제목/설명)는 제거했습니다(5개 계정 공통 정책).
  // 계정 선택으로 돌아가는 경로는 브라우저 뒤로가기(#/budget-adjust)로 유지됩니다.
  return `
    <div class="setup-editor">
      ${monthly}
      ${renderMaterialPlanPanel(data)}
    </div>`;
};

// 재료비 예산내역 겉박스 제거(5개 계정 공통 정책).
// .account-monthly-card 는 인건비·A/S도 함께 쓰므로 공유 CSS를 건드리지 않고, 반환된 HTML에
// 인라인 !important 스타일만 덧붙여 자기 계정에서만 테두리·배경·패딩을 무력화합니다.
var renderAccountMonthlyBudgetTableBeforeMaterialFlat = renderAccountMonthlyBudgetTable;
renderAccountMonthlyBudgetTable = function(data, account) {
  const html = renderAccountMonthlyBudgetTableBeforeMaterialFlat(data, account);
  if (account !== CATS[2]) return html;
  return html
    .replace('class="account-monthly-card"',
      'class="account-monthly-card" style="border:0 !important;background:transparent !important;padding:0 !important;border-radius:0 !important"')
    .replace('class="account-monthly-table"', 'class="account-monthly-table" style="background:#fff"');
};

// 재료비 서브탭 분기(상품재료비/감가상각비/기타재료비) — 원래 budget-status-4.js:34
function renderMaterialPlanPanel(data) {
  if (materialKind === 'depreciation') {
    return renderMaterialShell('감가상각비 계획 등록', '자산/라이선스 기준으로 월상각액을 입력하고 재료비 월별 예산에 반영합니다.', renderMaterialDepreciationPanel());
  }
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}
