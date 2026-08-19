// AI GUIDE: 수행원가 > 원가현황 하위 메뉴 전용 컨트롤러입니다.
// - URL: #/budget-status
// - 역할: costMode를 'status'로 두고 s-budget 화면(공유 렌더러)을 원가현황 뷰로 진입시킵니다.
// - 공유 렌더링(renderBudgetPage / showBudgetSummaryGrid 등)은 budget-status*.js가 담당합니다.
//   이 파일은 "원가현황" 진입점과 라우트 등록만 소유합니다.

// 상단 메뉴/직접 접속 진입: 목록 → 원가현황 뷰
function showCostStatus() { costMode = 'status'; showBudget(); }
// 특정 프로젝트의 원가현황으로 바로 이동(홈 Work Feed 등에서 사용)
function openCostStatus(k) { costMode = 'status'; openBudgetProjectScreen(k || 'budgetMock'); }

// 라우트 등록 (#/budget-status)
if (typeof ROUTE_ACTIONS !== 'undefined') {
  ROUTE_ACTIONS['budget-status'] = () => showCostStatus();
}
