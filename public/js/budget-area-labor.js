// AI GUIDE: 수행원가 > 원가조정 > 인건비(CATS[0]) 계정 전용 진입 소스입니다.
// - URL: #/budget-adjust/labor
// - 인건비 계정 편집기 진입점(데코레이터)을 이 파일이 소유합니다.
// - 상세 패널(실투입/이관/OT 탭 renderLaborKindTabsFinal, renderLaborDetailPlanPanelFinal,
//   SCM 팝업/이관 폼/OT 그리드 등)은 여러 파일(budget-status-4.js 등)에 있는 공유 코어를 런타임 호출합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).

// 인건비 계정 편집기 데코레이터: 자기 계정(CATS[0])만 처리하고 나머지는 이전 정의로 위임
var renderBudgetAccountEditorBeforeLaborDetailFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[0]) return renderBudgetAccountEditorBeforeLaborDetailFinal(data, account);
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">인건비 수정</div>
          <div class="setup-editor-sub">실투입인건비, 이관인건비, OT비를 구분해 계획을 등록하고 월별 예산내역에 반영합니다.</div>
        </div>
      </div>
      ${renderAccountMonthlyBudgetTable(data, account)}
      <div class="labor-panel">
        ${renderLaborKindTabsFinal()}
        ${renderLaborDetailPlanPanelFinal(data)}
      </div>
    </div>`;
};
