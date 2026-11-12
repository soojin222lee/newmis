// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 — 화면 정돈 (세 칸 높이 맞춤)                                     작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 공유 CSS(budget-agent-console.js 주입 스타일 · sk-theme.css)는 고치지 않고, 이 파일이 #s-budget 범위의
//   <style>을 뒤에 넣어 덮습니다(클래스 접두사 bui-, 중복 주입 방지).
//   1) 세 칸 높이 맞춤 — 계정 상세를 열면 [예산 조정안 | 상세 예산내역 | Agent와 대화하기] 세 칸 높이가 달랐습니다
//      (양옆은 화면 높이 고정, 가운데 상세는 내용만큼 늘어남). 세 칸을 같은 높이(화면 높이 기준)로 맞추고
//      각 칸 안에서 스크롤합니다. 한 칸만 열려 있어도 같은 높이 규칙을 씁니다.
// ═══════════════════════════════════════════════════════════════════════════

(function buiInjectLayout() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('bui-layout-style')) return;
  const st = document.createElement('style');
  st.id = 'bui-layout-style';
  st.textContent = `
  /* 계정 상세 화면 — 세 칸 같은 높이, 각자 안쪽 스크롤 */
  #s-budget .agga-grid.detail { align-items:stretch; }
  #s-budget .agga-grid.detail > .agga-col {
    height:clamp(480px, calc(100vh - 270px), 1200px) !important;
    height:clamp(480px, calc(100dvh - 270px), 1200px) !important;
    min-height:0 !important; }
  #s-budget .agga-grid.detail > .agga-col.detail > .agga-col-body.detail { overflow-y:auto !important; overscroll-behavior:contain; }
  @media (max-width: 1100px) {
    #s-budget .agga-grid.detail > .agga-col { height:auto !important; }
    #s-budget .agga-grid.detail > .agga-col.detail { max-height:none !important; }
    #s-budget .agga-grid.detail > .agga-col.detail > .agga-col-body.detail { overflow:visible !important; }
  }`;
  document.head.appendChild(st);
})();
