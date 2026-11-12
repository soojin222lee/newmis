// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 — 화면 정돈 (세 칸 높이 맞춤 · 버튼 통일)                         작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 공유 CSS(budget-agent-console.js 주입 스타일 · sk-theme.css)는 고치지 않고, 이 파일이 #s-budget 범위의
//   <style>을 뒤에 넣어 덮습니다(클래스 접두사 bui-, 중복 주입 방지).
//   1) 세 칸 높이 맞춤 — 계정 상세를 열면 [예산 조정안 | 상세 예산내역 | Agent와 대화하기] 세 칸 높이가 달랐습니다
//      (양옆은 화면 높이 고정, 가운데 상세는 내용만큼 늘어남). 세 칸을 같은 높이(화면 높이 기준)로 맞추고
//      각 칸 안에서 스크롤합니다. 한 칸만 열려 있어도 같은 높이 규칙을 씁니다.
//   2) 버튼 통일 — 원가조정 Agent 화면 · 원가현황 전체 현황의 버튼을 역할별 5종 + 크기 2단으로 맞춥니다.
//      · 주요(파랑 채움): 저장 · 기안 → · 예산 확정 화면 →        · 보조(흰 바탕 회색 테두리): 등록 · 전부 반영 · 접기 · 월별 보기 · 근거 · 수정 …
//      · 위험(빨강 테두리): 선택삭제 · 삭제 · 취소(입력 행)        · 긍정(초록 테두리): 반영        · 엑셀(연초록): .bxe-btn
//      · 크기: 칸 머리 · 표 위 · 도구줄 = 30px / 카드 · 표 행 안 = 26px. 글자 12px(작은 버튼 11.5px) · 굵기 800 · 모서리 8px(작은 버튼 7px)
//      · 계정 이동(← 프로젝트 메인)은 계정색, 💬대화 · 예산 조정안 펼치기는 기존 색을 두고 크기만 맞춥니다.
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

(function buiInjectButtons() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('bui-btn-style')) return;
  const S = '#s-budget ';
  const list = function (sels) { return sels.map(function (x) { return S + x; }).join(',\n  '); };
  // 크기 — 도구줄(30px)
  const BAR = ['.agga-all', '.agga-draft', '.agga-fold', '.agga-home', '.aglm-btn', '.aglb-add', '.aglb-bar .bie-delsel', '.agex-bar .bie-delsel',
    '.bie-savebar', '.bxe-btn', '.bmv-act', '.labor-main-btn', '.labor-sub-btn', '.budget-process-back', '.agos-add:not(.sm)'];
  // 크기 — 카드 · 행 안(26px)
  const SM = ['.agai-yes', '.agga-why', '.agga-del', '.agai-seg', '.agos-ed', '.agos-add.sm', '.agos-panel-head .bie-delsel',
    '.aglb td.aglb-act button', '.bie-cancel'];
  // 색 — 역할별
  const PRIMARY = ['.agga-draft', '.bie-savebar:not(.off)', '.labor-main-btn'];
  const SECOND = ['.agga-all', '.agga-fold:not(.chat):not(.todo)', '.aglm-btn', '.aglb-add', '.agga-why:not(.on)', '.agai-seg:not(.on)', '.agos-ed',
    '.agos-add', '.bmv-act', '.labor-sub-btn', '.budget-process-back', '.aglb td.aglb-act button:not(.del)'];
  const DANGER = ['.bie-delsel', '.agga-del', '.bie-cancel', '.aglb td.aglb-act button.del'];
  const st = document.createElement('style');
  st.id = 'bui-btn-style';
  st.textContent = `
  ${list(BAR.concat(SM))} {
    display:inline-flex !important; align-items:center; justify-content:center; gap:4px; box-sizing:border-box;
    font-family:inherit; font-weight:800 !important; line-height:1 !important; white-space:nowrap; cursor:pointer;
    border-width:1px !important; border-style:solid !important; box-shadow:none !important; }
  ${list(BAR)} { height:30px !important; min-height:30px; padding:0 12px !important; font-size:12px !important; border-radius:8px !important; }
  ${list(SM)} { height:26px !important; min-height:26px; padding:0 10px !important; font-size:11.5px !important; border-radius:7px !important; }

  ${list(PRIMARY)} { background:#2563eb !important; border-color:#2563eb !important; color:#fff !important; }
  ${list(PRIMARY.map(function (x) { return x + ':hover:not(:disabled)'; }))} { background:#1d4ed8 !important; border-color:#1d4ed8 !important; }
  ${list(SECOND)} { background:#fff !important; border-color:#cbd5e1 !important; color:#1c2432 !important; }
  ${list(SECOND.map(function (x) { return x + ':hover:not(:disabled)'; }))} { background:#f8fafc !important; border-color:#94a3b8 !important; }
  ${list(DANGER)} { background:#fff !important; border-color:#f3c2cc !important; color:#c40025 !important; }
  ${list(DANGER.map(function (x) { return x + ':hover:not(:disabled)'; }))} { background:#fff1f3 !important; border-color:#e88a9c !important; }
  ${S}.agai-yes { background:#fff !important; border-color:#86d7b0 !important; color:#0f7a4d !important; }
  ${S}.agai-yes:hover:not(:disabled) { background:#ecfdf5 !important; }
  ${S}.agai-yes.on, ${S}.agai-yes[aria-pressed="true"] { background:#0f9d63 !important; border-color:#0f9d63 !important; color:#fff !important; }
  ${S}.bie-savebar.off { background:#fff !important; border-color:#cbd5e1 !important; color:#94a3b8 !important; cursor:default; }
  ${S}.bie-savebar em { background:#fff; color:#2563eb; }
  ${S}.agga-draft:disabled, ${S}.agga-all:disabled { opacity:.4; cursor:default; }
  ${S}.agga-home { background:#fff !important; }
  /* 원가현황 도구줄 select 높이도 버튼과 같게 */
  ${S}.bmv-sel select { height:30px; padding:0 8px; border-radius:8px; font-size:12px; }
  ${S}.bmv-seg button { height:24px; padding:0 12px; font-size:12px; }`;
  document.head.appendChild(st);
})();
