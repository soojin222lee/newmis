// ═══════════════════════════════════════════════════════════════════════════
//  프로젝트 > 수주형 · 제안 프로젝트 — 상세 주소(딥링크) 유지                     작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 상세를 열면 주소에 프로젝트 id 를 남기고(#/si-project?id=SI-001 · #/proposal-project?id=PP-001),
//   새로고침 · 주소 공유 · 뒤로 가기 때 그 상세를 다시 엽니다. 이전엔 새로고침하면 늘 목록으로 돌아갔습니다(2026.11.12).
//   - 공유 라우터(app.js)는 고치지 않고 ROUTE_ACTIONS 항목과 열기/닫기 함수만 감쌉니다.
//   - 주소를 바꿀 때는 app.js 와 같은 방식(_suppressNextHash)으로 hashchange 재진입을 막습니다.
//   proposal-project.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

function pdrSetHash(route, id) {
  const target = '#/' + route + (id ? '?id=' + encodeURIComponent(id) : '');
  if (location.hash === target) return;
  if (typeof _suppressNextHash !== 'undefined') _suppressNextHash = true;   // 이 주소 변경으로 라우터가 다시 돌지 않게
  location.hash = target;
}
function pdrWrap(name, after) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function () {
    const r = before.apply(this, arguments);
    try { after.apply(this, arguments); } catch (e) { /* 주소만 못 바꿈 */ }
    return r;
  };
}

/* ── 화면 주소 갱신 — 상세가 열려 있으면 id 를 붙임 ─────────────────────────
   setScreen → updateHashForScreen 은 budget-agent-console.js 가 한 박자 늦게(setTimeout) 실행하도록 감쌌습니다.
   그래서 주소를 바꾸는 "그 순간"의 상태를 보고 정해야 합니다 → 실제로 주소를 쓰는 안쪽 함수를 감쌉니다. */
function pdrHashFor(id) {
  if (id === 's-si-project' && typeof siView !== 'undefined' && siView === 'detail' && siSelectedId) { pdrSetHash('si-project', siSelectedId); return true; }
  if (id === 's-proposal-project' && typeof ppView !== 'undefined' && ppView === 'detail' && ppSelectedId) { pdrSetHash('proposal-project', ppSelectedId); return true; }
  return false;
}
if (typeof updateHashForScreenBeforeAgentFinal === 'function') {
  var pdrHashInner = updateHashForScreenBeforeAgentFinal;
  updateHashForScreenBeforeAgentFinal = function (id) { if (pdrHashFor(id)) return; return pdrHashInner.apply(this, arguments); };
} else if (typeof updateHashForScreen === 'function') {
  var pdrHashOuter = updateHashForScreen;
  updateHashForScreen = function (id) { if (pdrHashFor(id)) return; return pdrHashOuter.apply(this, arguments); };
}

/* ── 수주형 ────────────────────────────────────────────────────────────── */
pdrWrap('openSIDetail', function (id) { pdrSetHash('si-project', id); });
pdrWrap('closeSIDetail', function () { pdrSetHash('si-project', ''); });
if (typeof ROUTE_ACTIONS !== 'undefined') {
  ROUTE_ACTIONS['si-project'] = function () {                 // crud R — #/si-project[?id=]
    const id = (typeof routeQueryParam === 'function') ? routeQueryParam('id') : null;
    if (id && typeof SI_PROJECTS !== 'undefined' && SI_PROJECTS[id]) { siSelectedId = id; siView = 'detail'; }
    else if (!id && typeof siView !== 'undefined') siView = 'list';
    showSIProject();
  };
}

/* ── 제안 ─────────────────────────────────────────────────────────────── */
pdrWrap('openProposalDetail', function (id) { pdrSetHash('proposal-project', id); });
pdrWrap('closeProposalDetail', function () { pdrSetHash('proposal-project', ''); });
if (typeof ROUTE_ACTIONS !== 'undefined') {
  ROUTE_ACTIONS['proposal-project'] = function () {           // crud R — #/proposal-project[?id=]
    const id = (typeof routeQueryParam === 'function') ? routeQueryParam('id') : null;
    showProposalProject();                                    // 목록으로 초기화한 뒤
    if (id && typeof PROPOSAL_PROJECTS !== 'undefined' && PROPOSAL_PROJECTS[id]) openProposalDetail(id);   // 상세를 다시 엶
  };
}

/* ── 상세 열 때 스크롤 맨 위부터 · 목록으로 돌아오면 보던 자리로 (2026.11.16) ──────────────
   목록을 아래로 내린 채 [상세 조회]를 누르면 창 스크롤이 그대로 남아 상세가 중간부터 보였습니다
   (프로젝트 현황 목록 아래쪽에 몰린 '수행(임시종료)' 건에서 특히 눈에 띔).
   유형 6종(수주형·제안·W/G·사내·투자·선투입)의 열기/닫기를 감쌉니다. W/G 이하 파일은 이 파일보다 뒤에 로드되므로
   모든 스크립트가 실행된 뒤(DOMContentLoaded) 감쌉니다 — 프로젝트 현황(project-status.js)의 [목록] 분기 래퍼도 그대로 안쪽에 남습니다. */
var PDR_LIST_SCROLL = {};
function pdrScrollTop() {
  window.scrollTo(0, 0);
  const se = document.scrollingElement || document.documentElement;
  if (se) se.scrollTop = 0;
  const act = document.querySelector('.screen.active');
  if (act) act.scrollTop = 0;
}
function pdrWireScroll() {
  [['openSIDetail', 'closeSIDetail'], ['openProposalDetail', 'closeProposalDetail'], ['openWGDetail', 'closeWGDetail'],
   ['openIPDetail', 'closeIPDetail'], ['openInvDetail', 'closeInvDetail'], ['openAdvDetail', 'closeAdvDetail']].forEach(function (t) {
    const open = window[t[0]], close = window[t[1]];
    if (typeof open === 'function' && !open.pdrScroll) {
      window[t[0]] = function () {
        const act = document.querySelector('.screen.active');
        if (act) PDR_LIST_SCROLL[act.id] = window.scrollY;      // 목록에서 보던 자리 기억
        const r = open.apply(this, arguments);
        pdrScrollTop();
        return r;
      };
      window[t[0]].pdrScroll = true;
    }
    if (typeof close === 'function' && !close.pdrScroll) {
      window[t[1]] = function () {
        const r = close.apply(this, arguments);
        const act = document.querySelector('.screen.active');
        const y = act && PDR_LIST_SCROLL[act.id];
        if (y) window.scrollTo(0, y);                             // 보던 목록으로 돌아오면 보던 자리
        else pdrScrollTop();
        return r;
      };
      window[t[1]].pdrScroll = true;
    }
  });
  // 프로젝트 현황 [상세 조회]: 유형 화면으로 먼저 바뀐 뒤 상세가 열리므로, 현황 목록 자리를 따로 기억합니다
  const psv = window.psvOpenDetail;
  if (typeof psv === 'function' && !psv.pdrScroll) {
    window.psvOpenDetail = function () {
      const y = window.scrollY;
      const r = psv.apply(this, arguments);
      const act = document.querySelector('.screen.active');
      if (act) delete PDR_LIST_SCROLL[act.id];                  // 유형 목록 자리로 잘못 기억된 값 지움
      PDR_LIST_SCROLL['s-project-status'] = y;
      pdrScrollTop();
      return r;
    };
    window.psvOpenDetail.pdrScroll = true;
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pdrWireScroll);
else pdrWireScroll();
