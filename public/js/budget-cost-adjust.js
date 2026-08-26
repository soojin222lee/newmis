// AI GUIDE: 수행원가 > 원가조정 하위 메뉴 전용 컨트롤러입니다.
// - URL: #/budget-adjust
// - 역할: costMode를 'adjust'로 두고 s-budget 화면(공유 렌더러)을 원가조정(편집) 뷰로 진입시킵니다.
//   openBudgetProjectScreen에서 costMode==='adjust'이면 budgetSetupStage='edit'로 진입합니다.
// - 공유 렌더링은 budget-status*.js가 담당하고, 이 파일은 "원가조정" 진입점과 라우트 등록만 소유합니다.

// 상단 메뉴/직접 접속 진입: 목록 → 원가조정 뷰
function showCostAdjust() { costMode = 'adjust'; showBudget(); }
// 특정 프로젝트의 원가조정으로 바로 이동(홈 Work Feed 반영 핸드오프 등에서 사용)
function openCostAdjust(k) { costMode = 'adjust'; openBudgetProjectScreen(k || 'budgetMock'); }

// 라우트 등록 (#/budget-adjust[?pj=<프로젝트키>])
if (typeof ROUTE_ACTIONS !== 'undefined') {
  ROUTE_ACTIONS['budget-adjust'] = () => {
    const pj = (typeof routeQueryParam === 'function') ? routeQueryParam('pj') : null;
    if (pj) { costMode = 'adjust'; openBudgetProjectScreen(pj); }  // 딥링크: 그 프로젝트 원가조정 바로 진입
    else showCostAdjust();
  };
}
