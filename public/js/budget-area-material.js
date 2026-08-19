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
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">재료비 수정</div>
          <div class="setup-editor-sub">상품재료비, 감가상각비, 기타재료비를 구분해 계획을 등록합니다.</div>
        </div>
      </div>
      ${monthly}
      ${renderMaterialPlanPanel(data)}
    </div>`;
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
