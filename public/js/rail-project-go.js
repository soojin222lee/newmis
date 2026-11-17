// ============================================================
//  rail-project-go.js — 레일 담당 프로젝트: 이름 클릭 = 프로젝트로 이동      작성: 남주
//
//  요청(매니저님): 레일의 담당 프로젝트에서 프로젝트로 바로 이동할 수 있어야 한다.
//  기존: 행 전체가 버튼 하나 → 누르면 그 자리에서 펼침만(toggleHomeV2Pjt), 이동은 펼친 안의 항목으로만.
//
//  변경: 한 행을 두 영역으로 나눈다.
//    [▸]  왼쪽 네모 칸   = 업무 펼치기/접기 (기존 toggleHomeV2Pjt 그대로)
//    이름 ↗ 배지         = 프로젝트로 이동 (railPjtGo → 그 프로젝트의 원가조정 화면)
//  이동임을 알리는 장치
//    · 이름 끝 ↗ 아이콘을 항상 표시
//    · hover — 이름 영역: 파랑 + 밑줄 + 화살표 살짝 이동, 툴팁 "프로젝트로 이동"
//              ▸ 칸: 그 칸만 진한 배경, 툴팁 "업무 펼치기"
//
//  원칙: dashboard.js(정진)·shell-v2.js 는 수정하지 않는다.
//        homeV2PjtListHtml 이 부르는 homeV2PjtRowHtml 을 감싸 머리줄 마크업만 바꾼다.
//        (스크립트는 전역 스코프 공유 — 이 파일이 뒤에 로드되므로 감싼 정의가 이긴다)
// ============================================================

(function injectRpgStyle() {
  if (document.getElementById('rpg-style')) return;
  const st = document.createElement('style');
  st.id = 'rpg-style';
  st.textContent = `
  .v2-pjt-h.rpg-h { display: flex; align-items: stretch; gap: 2px; padding: 3px; cursor: default; }
  .v2-pjt-h.rpg-h:hover { background: transparent; }
  .rpg-tog, .rpg-go { border: 0; background: transparent; font-family: inherit; cursor: pointer; border-radius: 8px; }
  .rpg-tog {
    flex: 0 0 26px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
    background: #f1f4f9; color: #8a94a6;
    transition: background .15s, color .15s;
  }
  .rpg-tog:hover { background: #d6e2fb; color: var(--v2-blue, #2f6bed); }
  .rpg-tog .v2-pjt-ic { display: inline-flex; color: inherit; }
  .rpg-ic svg { width: 13px; height: 13px; }
  .v2-pjt.open .rpg-tog { background: #e3ecfd; color: var(--v2-blue, #2f6bed); }
  .rpg-go {
    flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px;
    padding: 0 8px 0 7px; text-align: left;
    transition: background .15s;
  }
  .rpg-go:hover { background: var(--v2-blue-soft, #eaf1fe); }
  .rpg-go .v2-row-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rpg-go:hover .v2-row-t { color: var(--v2-blue, #2f6bed); text-decoration: underline; text-underline-offset: 3px; }
  .rpg-arr {
    flex: 0 0 auto; margin-right: auto; display: inline-flex; color: #a3adbd;
    transition: transform .18s, color .15s;
  }
  .rpg-arr svg { width: 12px; height: 12px; }
  .rpg-go:hover .rpg-arr { color: var(--v2-blue, #2f6bed); transform: translate(2px, -2px); }
  .rpg-go:focus-visible, .rpg-tog:focus-visible { outline: 2px solid var(--v2-blue, #2f6bed); outline-offset: -2px; }
  `;
  document.head.appendChild(st);
})();

const RPG_CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
const RPG_ARROW ='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5"/></svg>';

// 프로젝트로 이동 — 그 프로젝트의 원가조정 화면. 페르소나는 homePjtGo 와 같은 규칙.
function railPjtGo(pj) {                          // crud N — 프로젝트로 이동
  try {
    if (typeof agentPersonaFinal !== 'undefined') {
      agentPersonaFinal = (typeof homeUser !== 'undefined' && homeUser === 'lead') ? 'exec' : 'pm';
    }
  } catch (e) {}
  if (typeof openCostAdjust === 'function') openCostAdjust(pj);
  else if (typeof homePjtGo === 'function') homePjtGo(pj);
}

// 머리줄 [버튼 하나] → [▸ 칸 버튼][이름 ↗ 배지 버튼]
(function wrapRailRow() {
  if (typeof homeV2PjtRowHtml !== 'function') return;
  const before = homeV2PjtRowHtml;
  const RE = /<button class="v2-pjt-h" onclick="toggleHomeV2Pjt\('([^']*)'\)" aria-expanded="(\w+)">\s*(<span class="v2-pjt-ic">[^<]*<\/span>)\s*(<span class="v2-row-t">[^<]*<\/span>)([\s\S]*?)<\/button>/;
  homeV2PjtRowHtml = function (p) {
    const html = rpgMoneyLabel(before.apply(this, arguments));
    return html.replace(RE, function (m, id, exp, ic, name, badge) {
      const nm = (p && p.name) ? escAttr(p.name) : '';
      return `<div class="v2-pjt-h rpg-h">`
        + `<button class="rpg-tog" onclick="toggleHomeV2Pjt('${id}')" aria-expanded="${exp}" title="업무 펼치기" aria-label="${nm} 업무 펼치기"><span class="v2-pjt-ic rpg-ic">${RPG_CHEV}</span></button>`
        + `<button class="rpg-go" onclick="railPjtGo('${id}')" title="프로젝트로 이동" aria-label="${nm} 프로젝트로 이동">`
        + `${name}<span class="rpg-arr">${RPG_ARROW}</span>${badge.trim()}</button>`
        + `</div>`;
    });
  };
  // 이미 그려진 레일이 있으면 새 모양으로 다시 그린다
  const el = document.getElementById('v2-rail-body');
  if (el && typeof homeV2PjtListHtml === 'function') el.innerHTML = homeV2PjtListHtml();
})();

// ── 금액 요약 이름 (2026.11.17 PM 답변) ─────────────────────────────────────
// "수행원가총액 N · 소진율 N%" → AS-IS 와 같은 "총 계획예산 N · 진행률 N%".
//   총 계획예산 = 지금 버전 5개 계정 계획 합(저장 후엔 DB 값 그대로), 진행률 = 실적 ÷ 총 계획예산.
//   월 구분은 회계 마감일 기준(마감된 달 실적 / 마감 전 당월 실적+계획 / 이후 계획) — 관리자 > 회계결산일자.
function rpgMoneyLabel(s) {
  return String(s).replace(/수행원가총액 /g, '총 계획예산 ').replace(/ · 소진율 /g, ' · 진행률 ');
}
(function wrapHeroMoney() {
  if (typeof homeV2Hero !== 'function' || homeV2Hero.rpgMoney) return;
  const before = homeV2Hero;
  homeV2Hero = function () {
    const h = before.apply(this, arguments);
    if (h && typeof h === 'object') ['note', 'extra', 'head'].forEach(function (k) { if (typeof h[k] === 'string') h[k] = rpgMoneyLabel(h[k]); });
    return h;
  };
  homeV2Hero.rpgMoney = true;
})();
// 숫자도 원가 현황(05) 상단 요약과 같은 계산으로 — 5개 계정(A/S Cost 포함) 계획 합 · 실적 ÷ 계획
function rpgPlanRate(id) {
  try {
    const d = (typeof BUDGET_SOURCE !== 'undefined') ? BUDGET_SOURCE[id] : null;
    if (!d || typeof getProjectSummaryGridRows !== 'function' || typeof CATS === 'undefined') return null;
    if (typeof leadCostBreak === 'function' && !leadCostBreak(id).plan) return null;   // 편성 전
    const keep = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : undefined;
    if (keep !== undefined) currentBudgetProj = id;               // 원가 현황 계산은 "지금 프로젝트" 기준이라 잠깐 바꿔 계산
    try {
    if (typeof syncLaborAssignmentsToBudget === 'function') syncLaborAssignmentsToBudget(id);   // 원가 현황을 열 때와 같은 인력 반영
    if (typeof ensureAsCostPlanAmount === 'function') ensureAsCostPlanAmount(d);        // A/S Cost 계획도 원가 현황과 같게
    const act = CATS.reduce(function (o, c) { o[c] = calcActual(d, c); return o; }, {});
    const qua = CATS.reduce(function (o, c) { o[c] = calcQuasi(d, c); return o; }, {});
    const t = getProjectSummaryGridRows(d, act, qua)[0];
      return (t && t.totalPlan) ? { plan: t.totalPlan, rate: Number(t.rate) || 0 } : null;
    } finally { if (keep !== undefined) currentBudgetProj = keep; }
  } catch (e) { return null; }
}
(function wrapRailMoney() {
  if (typeof homeV2PjtRowHtml !== 'function') return;
  const before = homeV2PjtRowHtml;
  homeV2PjtRowHtml = function (p) {
    const html = before.apply(this, arguments);
    const r = p && rpgPlanRate(p.id);
    if (!r) return html;
    return html.replace(/총 계획예산 [^<·]+ · 진행률 [0-9.]+%/, '총 계획예산 ' + homeWon(r.plan) + ' · 진행률 ' + r.rate.toFixed(1) + '%');
  };
})();
(function wrapHeroPlan() {
  if (typeof homeV2Hero !== 'function') return;
  const before = homeV2Hero;
  homeV2Hero = function () {
    const h = before.apply(this, arguments);
    if (!h || typeof h.note !== 'string' || h.note.indexOf('총 계획예산') < 0 || typeof homeCardPjts !== 'function') return h;
    const sum = homeCardPjts().reduce(function (s, p) { const r = rpgPlanRate(p.id); return s + (r ? r.plan : 0); }, 0);
    h.note = h.note.replace(/총 계획예산 [^<·]+$/, '총 계획예산 ' + homeWon(sum));
    return h;
  };
})();
