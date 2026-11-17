// ═══════════════════════════════════════════════════════════════════════════
//  ui-system.js — 전 화면 버튼 · 글자 크기 체계                                 작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// 수행원가(budget-ui-unify.js)에서 정한 버튼 규칙을 나머지 화면에도 똑같이 적용합니다.
//   범위: .screen 중 수행원가(#s-budget — budget-ui-unify.js 가 담당)와 메인(#s-main — 버전2 히어로 디자인)을 뺀 전부.
//   공유 CSS(sk-theme.css)와 각 화면 파일은 고치지 않고, 이 파일이 <style> 을 맨 뒤에 넣어 덮습니다(접두사 uis-).
//
//  1) 버튼 크기 2단
//     · M 30px — 도구줄 · 검색 패널 · 화면 머리(목록·저장·신규·초기화·조회 …)   글자 12px · 굵기 800 · 모서리 8px
//     · S 26px — 표 행 · 카드 안(수정 · 삭제 · 상세 …)                            글자 11.5px · 모서리 7px
//  2) 역할 5종
//     · 주요(파랑 채움) 저장 · 신규 · 조회 · 결재선생성 · 종료 처리 →
//     · 보조(흰 바탕 회색 테두리) 목록 · 초기화 · 수정 · 상세 · 추가
//     · 위험(빨강 테두리) 삭제 · 선택삭제 · 강제종료      · 주의(주황 테두리) 재신청      · 엑셀(연초록) 엑셀 업로드/다운로드
//  3) 칩(필터 · 조건 · 프로젝트 선택) — 28px · 12px · 굵기 700 · 알약 모양
//  4) 글자 크기 단계 — 화면 제목 20 · 섹션(카드) 제목 18 · 소제목 15 · (본문 13 · 보조 11.5 는 기존 유지)
//  5) 버튼 앞 이모지(✏️ 🗑 ⬆ ⬇ ⚠)는 선 아이콘으로 바꿉니다. 버튼 글자(수정 · 삭제 …)는 그대로 둡니다(지니 CRUD 감지).
// ═══════════════════════════════════════════════════════════════════════════

(function uisInjectStyle() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('uis-style')) return;
  const S = '.screen:not(#s-budget):not(#s-main) ';
  const L = function (a) { return a.map(function (x) { return S + x; }).join(',\n  '); };
  const H = function (a) { return a.map(function (x) { return S + x + ':hover:not(:disabled)'; }).join(',\n  '); };

  const M = ['.save-btn', '.psv-btn', '.popen-btn:not(.warn)', '.pwx-btn', '.mc-add-btn', '.labor-main-btn', '.labor-sub-btn',
    '.sifr-btn:not(.sifr-btn-sm)', '.mc-back-btn', '.back-btn', '.ric-today-btn'];
  const SM = ['.row-act-btn', '.psv-link', '.popen-link', '.mc-edit-btn', '.mc-del-btn', '.sifr-btn-sm', '.popen-btn.warn'];

  const PRIMARY = ['.save-btn', '.psv-btn.pri', '.popen-btn.pri', '.pwx-btn.pri', '.labor-main-btn', '.sifr-btn-primary'];
  const SECOND = ['.psv-btn:not(.pri)', '.popen-btn:not(.pri):not(.del):not(.xls):not(.warn)', '.pwx-btn:not(.pri)', '.mc-add-btn',
    '.sifr-btn:not(.sifr-btn-primary):not(.pci-danger)', '.mc-back-btn', '.back-btn', '.ric-today-btn',
    '.row-act-btn:not(.del)', '.psv-link', '.popen-link', '.mc-edit-btn'];
  const DANGER = ['.row-act-btn.del', '.mc-del-btn', '.popen-btn.del', '.pci-danger'];
  const EXCEL = ['.popen-btn.xls', '.labor-sub-btn[onclick*="export"]'];
  const CHIP = ['.cr-cond-chip', '.cr-preset-ai', '.cr-op-toggle', '.ric-proj-pill'];

  const T1 = ['.page-title', '.psv-title', '.popen-title', '.setup-title'];
  const T2 = ['.card-title', '.custom-report-card-title', '.sd-compare-title', '.sd-effect-section-title'];
  const T3 = ['.mc-section-title', '.sd-effect-title', '.cr-ai-title', '.mc-env-group-title', '.interim-sb-title', '.interim-section-title'];

  const st = document.createElement('style');
  st.id = 'uis-style';
  st.textContent = `
  /* ── 공통 골격 ── */
  ${L(M.concat(SM))} {
    display:inline-flex !important; align-items:center; justify-content:center; gap:4px; box-sizing:border-box;
    font-family:inherit; font-weight:800 !important; line-height:1 !important; white-space:nowrap; cursor:pointer;
    border-width:1px !important; border-style:solid !important; box-shadow:none !important; text-decoration:none !important; }
  /* ── 크기 ── */
  ${L(M)} { height:30px !important; min-height:30px !important; padding:0 12px !important; font-size:12px !important; border-radius:8px !important; }
  ${L(SM)} { height:26px !important; min-height:26px !important; padding:0 10px !important; font-size:11.5px !important; border-radius:7px !important; }
  /* ── 역할 ── */
  ${L(PRIMARY)} { background:#2563eb !important; border-color:#2563eb !important; color:#fff !important; }
  ${H(PRIMARY)} { background:#1d4ed8 !important; border-color:#1d4ed8 !important; }
  ${L(SECOND)} { background:#fff !important; border-color:#cbd5e1 !important; color:#1c2432 !important; }
  ${H(SECOND)} { background:#f8fafc !important; border-color:#94a3b8 !important; }
  ${L(DANGER)} { background:#fff !important; border-color:#f3c2cc !important; color:#c40025 !important; }
  ${H(DANGER)} { background:#fff1f3 !important; border-color:#e88a9c !important; }
  ${L(EXCEL)} { background:#f0fdf4 !important; border-color:#86efac !important; color:#166534 !important; }
  ${H(EXCEL)} { background:#dcfce7 !important; border-color:#4ade80 !important; }
  ${S}.popen-btn.warn { background:#fff !important; border-color:#f5c56b !important; color:#b45309 !important; }
  ${S}.popen-btn.warn:hover:not(:disabled) { background:#fffbeb !important; }
  ${L(M.concat(SM).map(function (x) { return x + ':disabled'; }))} { opacity:.45; cursor:default; }
  /* 아이콘만 든 버튼 30×30 */
  ${S}.ric-nav-btn { width:30px !important; height:30px !important; padding:0 !important; display:inline-flex !important; align-items:center; justify-content:center;
    border-radius:8px !important; font-size:16px !important; }

  /* ── 칩 ── */
  ${L(CHIP)} { display:inline-flex !important; align-items:center; gap:4px; height:28px !important; min-height:28px; padding:0 12px !important;
    font-family:inherit; font-size:12px !important; font-weight:700 !important; line-height:1 !important; border-radius:999px !important;
    white-space:nowrap; box-shadow:none !important; }

  /* ── 글자 크기 단계 ── */
  ${L(T1)} { font-size:20px !important; font-weight:900 !important; }
  ${L(T2)} { font-size:18px !important; font-weight:800 !important; }
  ${L(T3)} { font-size:15px !important; font-weight:800 !important; }

  /* ── 선 아이콘 ── */
  ${S}.uis-ic { display:inline-block; flex:0 0 auto; width:14px; height:14px; vertical-align:-2px; }
  ${L(SM.map(function (x) { return x + ' .uis-ic'; }))} { width:13px; height:13px; }`;
  document.head.appendChild(st);
})();

var UIS_IC = {
  edit: '<path d="M10.8 3.2l2 2L6 12l-2.7.7.7-2.7z M9.6 4.4l2 2"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M6.8 7v4M9.2 7v4"/>',
  up: '<path d="M8 11.5V4M4.8 7 8 3.8 11.2 7M3 13h10"/>',
  down: '<path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 13h10"/>',
  warn: '<path d="M8 2.8l5.6 9.8H2.4z M8 6.5v3 M8 11.1h.01"/>'
};
function uisIcNode(kind) {
  const t = document.createElement('template');
  t.innerHTML = '<svg class="uis-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + UIS_IC[kind] + '</svg>';
  return t.content.firstChild;
}
// 버튼 첫 글자 마디의 이모지 → 선 아이콘
var UIS_EMOJI = [[/^\s*✏️?\s*/, 'edit'], [/^\s*🗑️?\s*/, 'trash'], [/^\s*⬆️?\s*/, 'up'], [/^\s*⬇️?\s*/, 'down'], [/^\s*⚠️?\s*/, 'warn']];
function uisIconize() {
  document.querySelectorAll('.screen:not(#s-budget):not(#s-main) button:not([data-uis-ic])').forEach(function (b) {
    const first = Array.prototype.find.call(b.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
    if (!first) return;
    for (let i = 0; i < UIS_EMOJI.length; i++) {
      const m = UIS_EMOJI[i][0].exec(first.nodeValue);
      if (!m) continue;
      first.nodeValue = first.nodeValue.slice(m[0].length);
      b.insertBefore(uisIcNode(UIS_EMOJI[i][1]), first);
      b.setAttribute('data-uis-ic', '1');
      return;
    }
  });
}
(function uisWatch() {
  if (typeof document === 'undefined') return;
  let t = null;
  const run = function () { t = null; try { uisIconize(); } catch (e) { /* 무시 */ } };
  const start = function () {
    run();
    new MutationObserver(function () { if (!t) t = setTimeout(run, 30); }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// ── 6) 화면 이동 시 스크롤 맨 위로 (2026.11.17) ─────────────────────────────
// 페이지 스크롤은 window 에 있는데, 화면(메뉴 카테고리)을 바꿔도 아무도 되돌리지 않아 아래로 내린 자리가 남았습니다.
// 화면 id 가 바뀌거나 주소의 화면 부분(#/xxx, ? 앞)이 바뀌면 맨 위로 올립니다.
// 상세 → [목록]으로 "보던 자리"를 되돌리는 코드(project-detail-route.js)는 uisScrollHold() 로 잠깐 막아 둡니다.
var uisScrollHoldAt = 0;
function uisScrollHold() { uisScrollHoldAt = Date.now(); }
function uisScrollTop() {
  if (Date.now() - uisScrollHoldAt < 700) return;
  window.scrollTo(0, 0);
  document.querySelectorAll('.main, .content, .screen.active').forEach(function (e) { if (e.scrollTop) e.scrollTop = 0; });
}
(function uisNavScroll() {
  if (typeof window === 'undefined') return;
  const wrap = function () {
    const before = window.setScreen;
    if (typeof before !== 'function' || before.uisScroll) return;
    window.setScreen = function (id) {
      const cur = document.querySelector('.screen.active');
      const r = before.apply(this, arguments);
      if (!cur || cur.id !== id) uisScrollTop();
      return r;
    };
    window.setScreen.uisScroll = true;
  };
  wrap();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrap);
  let lastBase = (location.hash || '').split('?')[0];
  window.addEventListener('hashchange', function () {
    const b = (location.hash || '').split('?')[0];
    if (b === lastBase) return;
    lastBase = b;
    uisScrollTop();
  });
})();

