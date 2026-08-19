// AI GUIDE: 수행원가 > 원가조정 > 5대 비용계정 URL 라우팅(공통 기반)입니다.
// - 원가조정 화면은 비용계정(budgetSetupEditAccount)에 따라 한 뎁스 더 내려간 URL을 가집니다:
//     #/budget-adjust/labor    (인건비)
//     #/budget-adjust/outsource(외주비)
//     #/budget-adjust/material (재료비)
//     #/budget-adjust/expense  (경비)
//     #/budget-adjust/as       (A/S Cost)
// - 이 파일은 "계정↔슬러그 매핑 + 진입/닫기 시 URL 갱신 + 딥링크 라우트 등록"만 소유합니다.
//   각 계정의 렌더 로직은 계정별 전용 파일(budget-labor.js 등)로 분리해 나갑니다.
// - 반드시 budget-status-5.js / budget-cost-*.js 뒤에 로드해야 합니다(openBudgetAccountEditor 등 override).

// 계정 표시명 ↔ URL 슬러그
const BUDGET_AREA_SLUGS = { '인건비':'labor', '외주비':'outsource', '재료비':'material', '경비':'expense', 'A/S Cost':'as' };
const BUDGET_AREA_BY_SLUG = { labor:'인건비', outsource:'외주비', material:'재료비', expense:'경비', as:'A/S Cost' };

// 계정 선택/닫기 시 URL 해시를 함께 갱신 (기존 함수 위임 후 해시 반영)
var openBudgetAccountEditorBeforeRoute = openBudgetAccountEditor;
openBudgetAccountEditor = function(account) {
  openBudgetAccountEditorBeforeRoute(account);
  if (typeof updateHashForScreen === 'function') updateHashForScreen('s-budget');
};

var closeBudgetAccountEditorBeforeRoute = closeBudgetAccountEditor;
closeBudgetAccountEditor = function() {
  closeBudgetAccountEditorBeforeRoute();
  if (typeof updateHashForScreen === 'function') updateHashForScreen('s-budget');
};

// 특정 비용계정 편집기로 바로 이동(딥링크/직접 접속용)
function openCostArea(account, projectKey) {
  costMode = 'adjust';
  openBudgetProjectScreen(projectKey || 'budgetMock'); // 원가조정(edit) 단계로 진입
  openBudgetAccountEditor(account);                    // 계정 선택 + URL 갱신
}

// 라우트 등록 (#/budget-adjust/<slug>)
if (typeof ROUTE_ACTIONS !== 'undefined') {
  Object.keys(BUDGET_AREA_BY_SLUG).forEach(slug => {
    ROUTE_ACTIONS['budget-adjust/' + slug] = () => openCostArea(BUDGET_AREA_BY_SLUG[slug]);
  });
}
