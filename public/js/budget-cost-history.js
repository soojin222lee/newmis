// AI GUIDE: 수행원가 > 변경 이력 하위 메뉴 전용 컨트롤러입니다.
// - URL: #/budget-history
// - 역할: costMode를 'history'로 두고 s-budget 화면(공유 렌더러)을 변경 이력 뷰로 진입시킵니다.
//   openBudgetProjectScreen에서 costMode!=='adjust'이면 budgetSetupStage='history'로 진입합니다.
// - 공유 렌더링은 budget-status*.js가 담당하고, 이 파일은 "변경 이력" 진입점과 라우트 등록만 소유합니다.

// 상단 메뉴/직접 접속 진입: 목록 → 변경 이력 뷰
function showCostHistory() { costMode = 'history'; showBudget(); }
// 특정 프로젝트의 변경 이력으로 바로 이동(Budget Navi 버전 이력 확인 등에서 사용)
function openCostHistory(k) { costMode = 'history'; openBudgetProjectScreen(k || 'budgetMock'); }

// 라우트 등록 (#/budget-history[?pj=<프로젝트키>])
if (typeof ROUTE_ACTIONS !== 'undefined') {
  ROUTE_ACTIONS['budget-history'] = () => {
    const pj = (typeof routeQueryParam === 'function') ? routeQueryParam('pj') : null;
    if (pj) { costMode = 'history'; openBudgetProjectScreen(pj); }  // 딥링크: 그 프로젝트 변경이력 바로 진입
    else showCostHistory();
  };
}
