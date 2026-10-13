// ============================================================
//  shell-v2.js — 버전2 앱 셸 (전 화면 공통)                     작성: 정진
//
//  선행 오픈 시스템(AiPMO · Talent AX — AXGENTIC WIRE 브랜드)의 UI 사상을 실행예산
//  전 화면에 적용한다. 메인화면 버전2(dashboard.js 31~39차)를 앱 전체로 넓힌 것.
//
//  버전2 의 기조 — 메뉴를 드러내지 않는다
//    · 화면 이동은 ① AI 에이전트 질의·응답(네비게이터) ② 담당 프로젝트 항목 클릭으로 한다.
//    · 상단 메뉴 바는 숨긴다. 개발 테스트용으로만 레일의 "상단 메뉴 보기" 버튼으로 켜고 끈다.
//    · 레일에는 로고 · 담당 프로젝트 · 유틸 · 화면 버전 · 사용자만 둔다.
//
//  확정 사항
//    · 2026-10-07 상단 바 숨김(유틸·사용자는 레일 하단), 틀+공통 부품+대화 화면, 앱 전체 토글·기본 버전2
//    · 2026-10-08 레일의 메뉴 타일 제거(위 기조), 상단 메뉴 개발용 토글, 상세 화면 진입 시 레일 자동 축소,
//                 버전2 에서 예산관리 Agent 기본 ON
//
//  원칙
//    · 각 화면 파일(수진·석완 담당 포함)은 수정하지 않는다. 바깥 틀은 이 파일이 주입하고,
//      화면 안쪽 모양은 shell-v2.css 가 body.app-v2 범위에서만 덮는다.
//    · index.html 맨 마지막에 로드된다 → dashboard.js 의 같은 이름 정의를 덮는다.
//    · 버튼은 인라인 onclick (지니 CRUD 감지 규칙).
// ============================================================

// ── 기본값 버전2 — 저장된 선택이 없을 때만 ──
// homeVer 는 dashboard.js 의 최상위 let 이라 다른 스크립트에서도 같은 바인딩을 쓴다.
(function () {
  try { if (!localStorage.getItem('newmis.homeVer')) homeVer = 'v2'; } catch (e) {}
})();

// ── 예산관리 Agent 기본값 ──
// budget-agent-console.js 의 기본은 'draft'(전통 편집, 수진 2026-10). 버전2 는 Agent 가 조정안을
// 시뮬레이션해 제안하고 PM 이 확정·결재하는 흐름이 기준이므로 'agent'(ON)로 시작한다.
// 버전1 은 수진님 기본값('draft') 그대로 둔다. 원본 파일은 수정하지 않는다.
// agentSetViewFinal 은 곧바로 renderBudgetPage() 를 부른다. 로드 시점에는 데이터가 준비되기 전일 수
// 있어 값만 바꾸고, 수행원가 화면이 열려 있을 때(버전 전환 등)만 세터로 바꿔 다시 그린다.
// 'draft' → 'agent' 전환에서 세터가 추가로 하는 일(mini/sim 진입 플래그 초기화)은 기본값과 같다.
function v2ApplyAgentDefault(render) {
  if (typeof agentViewFinal === 'undefined') return;
  const want = (homeVer === 'v2') ? 'agent' : 'draft';
  if (agentViewFinal === want) return;
  if (render && document.querySelector('#s-budget.active') && typeof agentSetViewFinal === 'function') {
    agentSetViewFinal(want);
  } else {
    agentViewFinal = want;
  }
}
v2ApplyAgentDefault(false);

// ── 레일 아이콘 (선 아이콘, currentColor) ──
const V2_IC = (function () {
  const s = function (d) {
    return '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"'
      + ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  return {
    pjts:    s('<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M6.4 8h7.2M6.4 11h4.6"/>'),
    book:    s('<path d="M4 4.4c2-.8 4-.6 6 .8 2-1.4 4-1.6 6-.8V15.4c-2-.8-4-.6-6 .8-2-1.4-4-1.6-6-.8z"/><path d="M10 5.2v11"/>'),
    rule:    s('<rect x="4" y="3" width="12" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h3.6"/>'),
    compass: s('<circle cx="10" cy="10" r="7"/><path d="m12.8 7.2-1.6 4-4 1.6 1.6-4z"/>'),
    chip:    s('<rect x="5.4" y="5.4" width="9.2" height="9.2" rx="1.6"/><path d="M8 2.8v2.6M12 2.8v2.6M8 14.6v2.6M12 14.6v2.6M2.8 8h2.6M2.8 12h2.6M14.6 8h2.6M14.6 12h2.6"/>'),
    apps:    s('<rect x="3.4" y="3.4" width="5" height="5" rx="1.2"/><rect x="11.6" y="3.4" width="5" height="5" rx="1.2"/><rect x="3.4" y="11.6" width="5" height="5" rx="1.2"/><rect x="11.6" y="11.6" width="5" height="5" rx="1.2"/>'),
    topmenu: s('<rect x="3" y="3.6" width="14" height="12.8" rx="2"/><path d="M3 7.4h14M6 5.5h.01M8.2 5.5h.01"/>'),
    folder:  s('<path d="M3 6.2c0-1 .8-1.8 1.8-1.8h3.4l1.6 1.8h5.4c1 0 1.8.8 1.8 1.8v6.6c0 1-.8 1.8-1.8 1.8H4.8c-1 0-1.8-.8-1.8-1.8z"/>'),
    coin:    s('<circle cx="10" cy="10" r="7"/><path d="M12.2 7.6c-.4-.7-1.2-1.1-2.2-1.1-1.3 0-2.2.7-2.2 1.7 0 2.4 4.6 1.2 4.6 3.6 0 1-1 1.7-2.4 1.7-1 0-1.9-.4-2.3-1.1M10 5.2v1.3M10 13.5v1.3"/>'),
    chart:   s('<path d="M3.6 16.4h12.8"/><rect x="5" y="10" width="2.4" height="4.4" rx=".6"/><rect x="8.8" y="6.6" width="2.4" height="7.8" rx=".6"/><rect x="12.6" y="8.6" width="2.4" height="5.8" rx=".6"/>'),
    archive: s('<rect x="3" y="4" width="14" height="3.6" rx="1"/><path d="M4.4 7.6v7c0 .8.6 1.4 1.4 1.4h8.4c.8 0 1.4-.6 1.4-1.4v-7M8.2 10.6h3.6"/>'),
  };
})();

// ── 브랜드 — "예산관리 시스템" + AiBudget, B 노드형 마크 (2026-10-13 사용자 결정) ──
// AXGENTIC WIRE 는 사용이 제한된 브랜드라 표기하지 않는다. 색(하늘색 → 진파랑 그라데이션)은 그대로 둔다.
// dashboard.js 의 같은 이름 정의를 덮는다(이 파일이 맨 마지막 로드).
function v2BrandMarkSvg() {
  // B 한 획(세로 기둥 + 위·아래 둥근 배) 위에 노드 3개 — 기존 '이어진 점' 마크의 느낌을 잇는다.
  return `<svg class="v2-mk" viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="v2mkB" x1="3" y1="2" x2="37" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#2ec8f5"/>
          <stop offset=".45" stop-color="#1f86e6"/>
          <stop offset="1" stop-color="#141fb4"/>
        </linearGradient>
      </defs>
      <path d="M12 6v28M12 6h9a7 7 0 0 1 0 14h-9M12 20h11a7 7 0 0 1 0 14h-11"
        stroke="url(#v2mkB)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <g fill="#141fb4">
        <circle cx="12" cy="6" r="4"/>
        <circle cx="12" cy="20" r="4.6"/>
        <circle cx="12" cy="34" r="4"/>
      </g>
    </svg>`;
}
function v2BrandHtml() {
  const min = (typeof homeV2Rail !== 'undefined') && homeV2Rail === 'min';
  return `
    <div class="v2-brand">
      <button class="v2-lock" onclick="showMain()" aria-label="예산관리 시스템 홈">
        ${v2BrandMarkSvg()}
        <span class="v2-lock-t">
          <span class="v2-wm v2-wm-ko"><b>예산관리 시스템</b></span>
          <span class="v2-sub">AiBudget</span>
        </span>
      </button>
      <button class="v2-collapse" onclick="toggleV2Rail()"
        aria-expanded="${!min}" aria-label="${min ? '메뉴 펴기' : '메뉴 접기'}"
        title="${min ? '메뉴 펴기' : '메뉴 접기'}">
        <span class="v2-collapse-ic" aria-hidden="true"></span>
      </button>
    </div>`;
}

// ── 개발용 상단 메뉴 토글 ──
// 버전2 는 메뉴를 드러내지 않지만, 개발 테스트 중에는 상단 메뉴로 바로 들어가야 할 때가 있다.
let v2TopMenu = (function () {
  try { return localStorage.getItem('newmis.v2TopMenu') === '1'; } catch (e) { return false; }
})();
function toggleV2TopMenu() {                      // crud N — 상단 메뉴 바 보이기/숨기기 (개발용)
  v2TopMenu = !v2TopMenu;
  try { localStorage.setItem('newmis.v2TopMenu', v2TopMenu ? '1' : '0'); } catch (e) {}
  v2ApplyTopMenu();
}
function v2ApplyTopMenu() {
  document.body.classList.toggle('v2-topmenu', v2TopMenu && homeVer === 'v2');
  const b = document.querySelector('#v2-app-rail .v2-dev-topmenu');
  if (b) {
    b.classList.toggle('on', v2TopMenu);
    b.setAttribute('aria-pressed', String(v2TopMenu));
    const t = b.querySelector('.v2-dev-t');
    if (t) t.textContent = v2TopMenu ? '상단 메뉴 숨기기' : '상단 메뉴 보기';
  }
}

// ── 레일 마크업 — 로고 · 담당 프로젝트 · 유틸 · 화면 버전 · 사용자 ──
function v2AppRailHtml() {
  const lead = (typeof homeUser !== 'undefined') && homeUser === 'lead';
  const list = (typeof homeCardPjts === 'function') ? homeCardPjts() : [];
  const util = function (ic, t, act) {
    return `<button onclick="${act}" title="${escAttr(t)}"><span>${V2_IC[ic]}</span>${escHtml(t)}<i>›</i></button>`;
  };
  return `
    <div class="v2-rail-top">${(typeof v2BrandHtml === 'function') ? v2BrandHtml() : ''}</div>

    <div class="v2-rail-scroll">
      <div class="v2-pjsec${v2PjSecOpen ? '' : ' shut'}" id="v2-pjsec">
        <button class="v2-sec v2-sec-btn" onclick="toggleV2PjSec()" aria-expanded="${v2PjSecOpen}" aria-controls="v2-rail-body">
          <i>${V2_IC.pjts}</i>${lead ? '팀 프로젝트' : '담당 프로젝트'}<em>${list.length}</em><u>›</u>
        </button>
        <div class="v2-card" id="v2-rail-body">${(typeof homeV2PjtListHtml === 'function') ? homeV2PjtListHtml() : ''}</div>
      </div>
      <nav class="v2-nav" id="v2-nav" aria-label="업무 메뉴">${v2NavHtml()}</nav>
    </div>

    <div class="v2-rail-bottom">
      <div class="v2-vtoggle" role="group" aria-label="화면 버전 선택">
        <span class="v2-vtoggle-l">화면 버전</span>
        <button class="v2-vt" onclick="setHomeVer('v1')" aria-pressed="false">버전1</button>
        <button class="v2-vt on" onclick="setHomeVer('v2')" aria-pressed="true">버전2</button>
        <button class="v2-vt-mini" onclick="setHomeVer('v1')" title="버전1로 전환" aria-label="버전1로 전환">V2</button>
      </div>
      ${(typeof v2MeHtml === 'function') ? v2MeHtml() : ''}
      <div class="v2-ref${v2RefOpen ? ' open' : ''}" id="v2-ref">
        <button class="v2-ref-h" onclick="toggleV2Ref()" aria-expanded="${v2RefOpen}" title="참고용 메뉴 — 개발 범위에서 빠질 예정">
          <span>${V2_IC.archive}</span><b>참고용 메뉴</b><em>삭제예정</em><i>›</i>
        </button>
        <div class="v2-util v2-ref-b">
          ${util('book', '화면 설명', 'toggleScreenDesc(this)')}
          ${util('rule', '그라운드 룰', 'openSetupGuide()')}
          ${util('compass', 'AI 네비게이터', "openAiChat('navi')")}
          ${util('chip', 'AI개발 Agent', 'openAgentModal()')}
          ${util('apps', '구매시스템 참고', 'openPurchaseReference()')}
          <button class="v2-dev-topmenu${v2TopMenu ? ' on' : ''}" onclick="toggleV2TopMenu()"
            aria-pressed="${v2TopMenu}" title="개발 테스트용 — 숨겨진 상단 메뉴 바를 보이거나 숨깁니다">
            <span>${V2_IC.topmenu}</span><span class="v2-dev-t">${v2TopMenu ? '상단 메뉴 숨기기' : '상단 메뉴 보기'}</span><em>개발용</em>
          </button>
        </div>
      </div>
    </div>`;
}

// ── 업무 메뉴 (담당 프로젝트 아래) ──
// 상단 가로 메뉴였던 프로젝트·수행원가·인사이트를 왼쪽 바로 옮긴다 (2026-10-13 사용자 결정).
// 프로젝트는 업무가 둘이라 나눠 보인다 — 연동(IF 수신: 수주형·제안) / 생성(신규: W/G·사내·투자·선투입).
// My Work 는 메인이라 넣지 않는다(로고를 누르면 메인). 그룹은 접기/펼치기, 지금 화면의 그룹은 자동으로 펼친다.
const V2_NAV = [
  { g: 'pjt', ic: 'folder', t: '프로젝트', items: [
    ['#', '연동 프로젝트', 'IF', '선행시스템(CRM 등)에서 IF 로 받은 프로젝트를 가져와 등록합니다'],
    ['si', '수주형 프로젝트', 'showSIProject()'],
    ['proposal', '제안 프로젝트', 'showProposalProject()'],
    ['#', '생성 프로젝트', '신규', '이 시스템에서 작성 → 결재 → ERP 로 IF 해 새로 만듭니다'],
    ['wg', 'W/G 프로젝트', 'showWGProject()'],
    ['internal', '사내 프로젝트', 'showInternalProject()'],
    ['investment', '투자프로젝트', 'showInvestmentProject()'],
    ['advance', '선투입 프로젝트', 'showAdvanceProject()'],
  ] },
  { g: 'cost', ic: 'coin', t: '수행원가', items: [
    ['cost-status', '원가현황', 'showCostStatus()'],
    ['cost-adjust', '원가조정', 'showCostAdjust()'],
    ['cost-history', '변경 이력', 'showCostHistory()'],
  ] },
  { g: 'ins', ic: 'chart', t: '인사이트', items: [
    ['ins', '종합 현황', "showInsights('overview')"],
    ['ai-report', 'AI 레포트', 'showAiReport()'],
    ['custom-report', '맞춤 레포트', 'showCustomReport()'],
  ] },
];
const V2_NAV_SCREEN = {
  's-si-project': 'si', 's-proposal-project': 'proposal', 's-wg-project': 'wg',
  's-internal-project': 'internal', 's-investment-project': 'investment', 's-advance-project': 'advance',
  's-insights': 'ins', 's-ai-report': 'ai-report', 's-custom-report': 'custom-report',
};
let v2NavOpen = {};                                // 펼친 그룹 { pjt: true, … }
let v2NavSubOpen = {};                             // 펼친 소묶음 { if: true, new: false }
let v2NavLastCur = '';

// 지금 화면이 어느 메뉴인가 — 수행원가는 한 화면(s-budget)이라 costMode 로 나눈다
function v2NavCur() {
  const s = document.querySelector('.screen.active');
  const id = s ? s.id : '';
  if (id === 's-budget') {
    const m = (typeof costMode !== 'undefined') ? costMode : '';
    return m === 'status' ? 'cost-status' : m === 'history' ? 'cost-history' : 'cost-adjust';
  }
  return V2_NAV_SCREEN[id] || '';
}
function v2NavGroupOf(k) {
  const g = V2_NAV.find(function (x) { return x.items.some(function (it) { return it[0] === k; }); });
  return g ? g.g : '';
}
function v2NavHtml() {
  const cur = v2NavCur();
  return V2_NAV.map(function (grp) {
    const open = !!v2NavOpen[grp.g];
    const has = v2NavGroupOf(cur) === grp.g;
    return `
      <div class="v2-ng${open ? ' open' : ''}${has ? ' has' : ''}" data-g="${grp.g}">
        <button class="v2-ng-h" onclick="v2NavToggle('${grp.g}')" aria-expanded="${open}" title="${escAttr(grp.t)}">
          <span>${V2_IC[grp.ic]}</span><b>${escHtml(grp.t)}</b><i>›</i>
        </button>
        <div class="v2-ng-b">${v2NavItemsHtml(grp, cur)}</div>
      </div>`;
  }).join('');
}
// 그룹 안 항목 — '#' 머리를 만나면 그 뒤 항목을 접히는 소묶음으로 감싼다 (프로젝트: 연동 IF / 생성 신규)
function v2NavItemsHtml(grp, cur) {
  let html = '', sub = null;
  const item = function (it) {
    return `<button class="v2-ni${it[0] === cur ? ' on' : ''}" data-k="${it[0]}" onclick="${it[2]}"
      ${it[0] === cur ? 'aria-current="page"' : ''}>${escHtml(it[1])}</button>`;
  };
  const flush = function () {
    if (!sub) return;
    const open = !!v2NavSubOpen[sub.key];
    html += `<div class="v2-nsg${open ? ' open' : ''}${sub.has ? ' has' : ''}" data-s="${sub.key}">
        <button class="v2-ns" onclick="v2NavSubToggle('${sub.key}')" aria-expanded="${open}" title="${escAttr(sub.head[3])}">
          <span>${escHtml(sub.head[1])}</span><em class="${sub.key}">${escHtml(sub.head[2])}</em><i>›</i>
        </button>
        <div class="v2-nsg-b">${sub.body}</div>
      </div>`;
    sub = null;
  };
  grp.items.forEach(function (it) {
    if (it[0] === '#') { flush(); sub = { key: v2NavSubKey(it), head: it, body: '', has: false }; return; }
    if (sub) { sub.body += item(it); if (it[0] === cur) sub.has = true; }
    else html += item(it);
  });
  flush();
  return html;
}
function v2NavSubKey(head) { return head[2] === 'IF' ? 'if' : 'new'; }
// 지금 화면이 든 소묶음 ('if' | 'new' | '')
function v2NavSubOf(k) {
  let key = '', found = '';
  V2_NAV.forEach(function (grp) {
    grp.items.forEach(function (it) {
      if (it[0] === '#') key = v2NavSubKey(it);
      else if (it[0] === k && key) found = key;
    });
    key = '';
  });
  return found;
}
function v2NavSubToggle(k) {                       // crud N — 연동 프로젝트 IF / 생성 프로젝트 신규 펼치기/접기
  v2NavSubOpen[k] = !v2NavSubOpen[k];
  v2NavRender();
}
function v2NavToggle(g) {                          // crud N — 업무 메뉴 그룹 펼치기/접기
  const min = document.body.classList.contains('v2-rail-min') || window.innerWidth <= 960;
  if (min) {
    if (window.innerWidth <= 960) {                // 좁은 화면은 레일을 펼 수 없으니 그룹 첫 화면으로 바로 간다
      const first = document.querySelector('#v2-nav .v2-ng[data-g="' + g + '"] .v2-ni');
      if (first) first.click();
      return;
    }
    v2NavOpen[g] = true;
    toggleV2Rail();                                // 접힌 레일 — 펴면서 그 그룹을 연다
  } else {
    v2NavOpen[g] = !v2NavOpen[g];
  }
  v2NavRender();
}
function v2NavRender() {
  const el = document.getElementById('v2-nav');
  if (el) el.innerHTML = v2NavHtml();
}
// 화면이 바뀌면 현재 표시를 옮기고, 그 화면의 그룹만 펼친다 (같은 화면에서 직접 연 그룹은 그대로)
function v2NavSync() {
  if (homeVer !== 'v2') return;
  const cur = v2NavCur();
  if (cur !== v2NavLastCur) {
    v2NavLastCur = cur;
    const g = v2NavGroupOf(cur);
    if (g) { v2NavOpen = {}; v2NavOpen[g] = true; }  // 화면을 옮기면 그 화면의 그룹만 펼친다
    const sk = v2NavSubOf(cur);
    if (sk) { v2NavSubOpen = {}; v2NavSubOpen[sk] = true; }
  }
  v2NavRender();
}

// ── 담당 프로젝트 접기/펼치기 — 기본 펼침, 선택은 브라우저에 기억 ──
let v2PjSecOpen = (function () { try { return localStorage.getItem('newmis.v2PjSec') !== '0'; } catch (e) { return true; } })();
function toggleV2PjSec() {                         // crud N — 담당 프로젝트 목록 펼치기/접기
  if (document.body.classList.contains('v2-rail-min') && window.innerWidth > 960) {
    toggleV2Rail();                                // 접힌 레일 — 펴면서 목록을 보인다
    if (v2PjSecOpen) return;
  }
  v2PjSecOpen = !v2PjSecOpen;
  try { localStorage.setItem('newmis.v2PjSec', v2PjSecOpen ? '1' : '0'); } catch (e) {}
  const el = document.getElementById('v2-pjsec');
  if (el) {
    el.classList.toggle('shut', !v2PjSecOpen);
    const b = el.querySelector('.v2-sec-btn');
    if (b) b.setAttribute('aria-expanded', String(v2PjSecOpen));
  }
}

// ── 참고용 메뉴(삭제예정) — 개발 범위에서 빠질 도구 모음, 왼쪽 바 맨 끝 ──
let v2RefOpen = (function () { try { return localStorage.getItem('newmis.v2Ref') === '1'; } catch (e) { return false; } })();
function toggleV2Ref() {                           // crud N — 참고용 메뉴 펼치기/접기
  if (document.body.classList.contains('v2-rail-min') && window.innerWidth > 960 && !v2RefOpen) toggleV2Rail();
  v2RefOpen = !v2RefOpen;
  try { localStorage.setItem('newmis.v2Ref', v2RefOpen ? '1' : '0'); } catch (e) {}
  const el = document.getElementById('v2-ref');
  if (el) {
    el.classList.toggle('open', v2RefOpen);
    const h = el.querySelector('.v2-ref-h');
    if (h) h.setAttribute('aria-expanded', String(v2RefOpen));
  }
}

// ── 레일 붙이기 / 갱신 ──
function v2MountRail() {
  let r = document.getElementById('v2-app-rail');
  if (homeVer !== 'v2') { if (r) r.remove(); return; }
  if (!r) {
    r = document.createElement('aside');
    r.id = 'v2-app-rail';
    r.className = 'v2-app-rail';
    r.setAttribute('aria-label', 'AiBudget 메뉴');
    document.body.appendChild(r);
  }
  const sc = r.querySelector('.v2-rail-scroll');
  const keep = sc ? sc.scrollTop : 0;              // 다시 그려도 스크롤 위치 유지
  r.innerHTML = v2AppRailHtml();
  v2NavSync();                                     // 지금 화면의 업무 메뉴 그룹 펼침
  const sc2 = r.querySelector('.v2-rail-scroll');
  if (sc2) sc2.scrollTop = keep;
}

// ── 레일 접기 ──
// 메인에서의 접힘(homeV2Rail)은 사용자가 고른 값으로 브라우저에 저장된다.
// 상세 화면에서는 들어갈 때마다 자동으로 접고(v2DetailMin), 메인으로 돌아오면 저장된 값으로 돌아간다.
let v2DetailMin = true;
function v2OnMain() { return !!document.querySelector('#s-main.active'); }
function v2RailIsMin() {
  return v2OnMain() ? ((typeof homeV2Rail !== 'undefined') && homeV2Rail === 'min') : v2DetailMin;
}
function v2ApplyRail() {
  const min = v2RailIsMin();
  document.body.classList.toggle('v2-rail-min', min && homeVer === 'v2');
  const b = document.querySelector('#v2-app-rail .v2-collapse');
  if (b) {
    b.setAttribute('aria-expanded', String(!min));
    b.setAttribute('aria-label', min ? '메뉴 펴기' : '메뉴 접기');
    b.title = min ? '메뉴 펴기' : '메뉴 접기';
  }
}
function toggleV2Rail() {                         // crud N — 좌측 레일 접기/펴기
  if (v2OnMain()) {
    homeV2Rail = (homeV2Rail === 'min') ? 'open' : 'min';
    try { localStorage.setItem('newmis.v2Rail', homeV2Rail); } catch (e) {}
  } else {
    v2DetailMin = !v2DetailMin;                    // 상세 화면에서 연 것은 저장하지 않는다
  }
  v2ApplyRail();
}

// 화면이 바뀌었는지 판단하는 열쇠 — 화면 id + 프로젝트(pj). 같은 프로젝트 안에서 계정만
// 바꾸는 이동(#/budget-adjust/labor → /outsource)은 "진입"으로 보지 않는다.
let v2LastPlace = '';
function v2PlaceKey() {
  const s = document.querySelector('.screen.active');
  const m = /[?&]pj=([^&]+)/.exec(location.hash || '');
  return (s ? s.id : '') + '|' + (m ? m[1] : '');
}
function v2OnPlaceChange() {
  const place = v2PlaceKey();
  if (place === v2LastPlace) return;
  v2LastPlace = place;
  if (!v2OnMain()) v2DetailMin = true;             // 상세 화면 진입 → 자동 축소
  else if (v2LastPlace && typeof initDashboard === 'function') initDashboard();  // 메인 복귀 — 상세에서 바뀐 건수(결재·처리)로 다시 그린다 (showMain 은 화면만 바꾼다)
  v2ApplyRail();
  v2ThreadOnPlace();
}

// ── 버전1 화면에서 쓰는 전환 버튼 ──
// 메인은 기존 우측 상단 탭(homeVerMount)을 그대로 두고, 다른 화면에만 좌하단에 띄운다.
function v2MountV1Pill() {
  let p = document.getElementById('v2-v1-pill');
  if (homeVer === 'v2' || v2OnMain()) { if (p) p.remove(); return; }
  if (p) return;
  p = document.createElement('div');
  p.id = 'v2-v1-pill';
  p.className = 'v2-v1-pill';
  p.setAttribute('role', 'group');
  p.setAttribute('aria-label', '화면 버전 선택');
  p.innerHTML = '<button class="v2-vt on" onclick="setHomeVer(\'v1\')" aria-pressed="true">버전1</button>'
              + '<button class="v2-vt" onclick="setHomeVer(\'v2\')" aria-pressed="false">버전2</button>';
  document.body.appendChild(p);
}

// ── 대화 화면 (Talent AX) — 입력창 안내 문구와 면책 문구 ──
const V2_CHAT_PH = '원가 관련 궁금한 점을 자연어로 질문해 주세요.';   // 메인 입력창과 같은 문구 (2026-10-13)
const V2_CHAT_DISC = 'AiBudget는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.';
function v2ChatDecorate() {
  const ov = document.getElementById('ai-chat-overlay');
  if (!ov) return;
  const inp = document.getElementById('ai-chat-query');
  const box = ov.querySelector('.ai-chat-input');
  if (homeVer === 'v2') {
    if (inp) {
      if (inp.dataset.v1ph === undefined) inp.dataset.v1ph = inp.getAttribute('placeholder') || '';
      inp.setAttribute('placeholder', V2_CHAT_PH);
    }
    if (box && !ov.querySelector('.v2-chat-disc')) {
      const d = document.createElement('p');
      d.className = 'v2-chat-disc';
      d.textContent = V2_CHAT_DISC;
      box.insertAdjacentElement('afterend', d);
    }
  } else {
    if (inp && inp.dataset.v1ph !== undefined) inp.setAttribute('placeholder', inp.dataset.v1ph);
    const d = ov.querySelector('.v2-chat-disc');
    if (d) d.remove();
  }
}

// ── 대화 한 줄기 — 메인 대화와 수행원가 "Agent와 대화하기"를 하나로 ──
// 메인에서 물어 상세로 넘어오면 오른쪽 대화창(AI 에이전트)과 가운데 대화(예산관리 Agent)가
// 겹쳐 보였다. 버전2 에서는 같은 업무의 대화 이력으로 보고 가운데 하나로 잇는다.
//   · 들어올 때 — 메인 대화를 가운데 대화 앞에 이어 붙이고, 오른쪽 창은 접는다
//   · 나갈 때   — 가운데에서 나눈 대화를 메인 대화 뒤에 이어 붙인다
//   · 메인에서 다시 물을 때 — 대화를 지우지 않고 이어서 묻는다
// 수행원가 Agent(budget-agent-console.js)는 고치지 않는다. 대화 칸을 그리는 함수만 감싼다.
// 버전1 은 이 구간이 하나도 동작하지 않는다.
let v2Thread = [];                                 // 메인에서 넘어온 대화 묶음 [{ at, place, items }]
let v2AgentSeen = (typeof AGENT_CHAT_FINAL !== 'undefined') ? AGENT_CHAT_FINAL.length : 0;  // 메인으로 넘긴 데까지
let v2WasCenter = false;                           // 직전에 가운데 대화가 떠 있었는지
let v2Absorbed = false;                            // 오른쪽 창을 가운데로 접어 넣었는지
let v2LastCenterPlace = '';
let v2VisitKey = '';                               // 장소 줄을 이미 단 곳 (화면 + 프로젝트)
let v2PendingAsk = null;                           // 메인에서 한 조정 질문 — 넘어가서 Agent 가 처리
let v2ThreadSig = '';                            // 마지막으로 끝까지 내려 준 대화 상태

function v2CenterChatOn() {
  return homeVer === 'v2' && !!document.querySelector('#s-budget.active .agga-col.chat');
}
// 지금 있는 곳 — "예산관리시스템 목업용 · 외주비 원가조정"
function v2PlaceLabel() {
  const h = location.hash || '';
  const pj = (/[?&]pj=([^&]+)/.exec(h) || [])[1] || '';
  const slug = (/#\/budget-adjust\/([^?]+)/.exec(h) || [])[1] || '';
  const name = (pj && typeof homeProjName === 'function') ? homeProjName(decodeURIComponent(pj)) : '';
  const acct = (slug && typeof BUDGET_AREA_BY_SLUG !== 'undefined') ? (BUDGET_AREA_BY_SLUG[slug] || '') : '';
  return [name, (acct ? acct + ' ' : '') + '원가조정'].filter(Boolean).join(' · ');
}

// 메인 대화창에서 아직 넘기지 않은 메시지를 모은다 (첫 안내·담당 배정 줄·입력 중 표시는 뺀다)
function v2CaptureMain() {
  const body = document.getElementById('ai-chat-body');
  if (!body) return [];
  const items = [];
  body.querySelectorAll('.ai-msg').forEach(function (m) {
    if (m.dataset.v2cap || m.dataset.v2mirror) return;
    if (m.querySelector('.ai-bubble.typing')) return;              // 답을 기다리는 중 — 다음에 넘긴다
    m.dataset.v2cap = '1';
    if (m.classList.contains('ai-orch') || m.querySelector('.ai-roster')) return;
    const b = m.querySelector('.ai-bubble');
    if (!b) return;
    if (m.classList.contains('me')) items.push({ who: 'pm', html: escHtml(b.textContent.trim()) });
    else items.push({ who: 'agent', html: b.innerHTML });
  });
  return items;
}

// 오른쪽 창(또는 팝업)에 있던 대화를 가운데로 접어 넣는다
function v2ThreadAbsorb() {
  if (!v2CenterChatOn()) return;
  v2WasCenter = true;
  v2LastCenterPlace = v2PlaceLabel();
  const ov = document.getElementById('ai-chat-overlay');
  if (ov && ov.classList.contains('open')) {
    ov.classList.remove('open', 'v2-navout');
    if (typeof undockAiChat === 'function') undockAiChat();
    v2Absorbed = true;
  }
  const body = document.getElementById('ai-chat-body');
  const waiting = !!(body && body.querySelector('.ai-bubble.typing'));   // 메인 AI 가 아직 답하는 중
  const items = v2CaptureMain();
  const ask = (v2PendingAsk && Date.now() - v2PendingAsk.t < 10000) ? v2PendingAsk : null;
  v2PendingAsk = null;
  const n = (typeof AGENT_CHAT_FINAL !== 'undefined') ? AGENT_CHAT_FINAL.length : 0;
  const key = v2PlaceKey();
  if (items.length || ask) {
    if (v2VisitKey === key) {                      // 같은 곳에서 이어진 말 — 장소 줄 없이 그대로 잇는다
      if (items.length) v2Thread.push({ at: n, inline: true, items: items });
    } else {
      v2VisitKey = key;
      const acct = v2AcctOfHash();
      const picked = (v2PickedItem && Date.now() - v2PickedItem.t < 10000) ? v2PickedItem : null;
      v2PickedItem = null;
      v2Thread.push({ at: n, place: v2LastCenterPlace, items: items,
        follow: (ask || waiting) ? '' : v2FollowText(acct, picked) });
    }
    if (waiting) v2CenterAsk = Date.now();         // 늦게 오는 답도 같은 대화로 가져온다
    if (ask && agentChatSendFinalBeforeShell) {     // 메인에서 한 조정 질문을 이 화면의 Agent 가 바로 처리
      const el = document.getElementById('agent-chat-input');
      if (el) { el.value = ask.text; agentChatSendFinalBeforeShell(); }
    } else if (typeof renderBudgetPage === 'function') renderBudgetPage();
  }
  if (typeof syncChatFab === 'function') syncChatFab();
}

// 지금 화면의 계정 (#/budget-adjust/<slug>)
function v2AcctOfHash() {
  const slug = (/#\/budget-adjust\/([^?]+)/.exec(location.hash || '') || [])[1] || '';
  return (slug && typeof BUDGET_AREA_BY_SLUG !== 'undefined') ? (BUDGET_AREA_BY_SLUG[slug] || '') : '';
}

// 넘어오자마자 Agent 가 잇는 말 — 고른 항목·그 계정의 조정안을 짚는다 (화면과 같은 데이터)
function v2FollowText(acct, picked) {
  let pend = [];
  try { pend = (typeof agentProposalsFinal === 'function') ? (agentProposalsFinal('pending') || []) : []; } catch (e) {}
  const legsOf = function (x) { return Array.isArray(x.legs) ? x.legs : []; };
  const touches = function (x) { return x.acct === acct || legsOf(x).some(function (l) { return l.acct === acct; }); };
  const delta = function (x) {
    const d = legsOf(x).filter(function (l) { return l.acct === acct; }).reduce(function (a, l) { return a + (l.delta || 0); }, 0)
      || ((x.to || 0) - (x.from || 0));
    return (typeof agentDeltaFinal === 'function') ? agentDeltaFinal(d) : String(d);
  };
  const first = function (t) { const m = /^.*?다\./.exec(String(t || '')); return m ? m[0] + ' ' : ''; };
  const how = '왼쪽 예산 조정안에서 [반영]을 누르시면 위 금액에 바로 반영됩니다.';
  if (acct && picked) {
    const hit = pend.find(function (x) { return x.title === picked.title; });
    if (hit) return '고르신 "' + hit.title + '" 건은 ' + acct + ' ' + delta(hit) + ' 조정안으로 올라와 있습니다. '
      + first(hit.why) + how + ' 금액을 바꾸시려면 "' + acct + ' 500만원 늘려줘"처럼 말씀해 주세요.';
  }
  if (acct) {
    const list = pend.filter(touches);
    const lead = picked ? '"' + picked.title + '" 건을 보러 ' + acct + ' 화면으로 왔습니다. ' : '';
    if (!list.length) return lead + acct + '에는 지금 검토할 조정안이 없습니다. 조정할 금액을 말씀하시면 바로 계산해 드립니다 — 예) "' + acct + ' 500만원 늘려줘"';
    return lead + acct + '에는 검토할 조정안이 ' + list.length + '건 있습니다 — '
      + list.slice(0, 3).map(function (x) { return x.title + '(' + delta(x) + ')'; }).join(' · ') + '. ' + how;
  }
  if (!pend.length) return '';
  const by = {};
  pend.forEach(function (x) { by[x.acct] = (by[x.acct] || 0) + 1; });
  return '이 프로젝트에는 검토할 조정안이 ' + pend.length + '건 있습니다 — '
    + Object.keys(by).map(function (k) { return k + ' ' + by[k] + '건'; }).join(' · ') + '. 어느 계정부터 볼까요?';
}

// 메인 답변의 할 일·이상징후 항목을 눌러 넘어오면 무엇을 골랐는지 기억해 둔다
let v2PickedItem = null;
document.addEventListener('click', function (e) {
  const b = e.target && e.target.closest && e.target.closest('.v2-ci');
  if (!b || homeVer !== 'v2') return;
  const t = b.querySelector('.v2-ci-t');
  if (!t) return;
  const c = t.cloneNode(true);
  c.querySelectorAll('em').forEach(function (x) { x.remove(); });
  v2PickedItem = { title: c.textContent.trim(), t: Date.now() };
  if (v2CenterChatOn()) {                          // 가운데 대화 안에서 고른 경우 — 계정만 바뀌므로 그 자리에서 잇는다
    setTimeout(function () {
      const pk = v2PickedItem; v2PickedItem = null;
      const say = v2FollowText(v2AcctOfHash(), pk);
      if (!say) return;
      const n = (typeof AGENT_CHAT_FINAL !== 'undefined') ? AGENT_CHAT_FINAL.length : 0;
      v2Thread.push({ at: n, inline: true, items: [{ who: 'agent', html: escHtml(say) }] });
      if (typeof renderBudgetPage === 'function') renderBudgetPage();
    }, 150);
  }
}, true);

// 가운데에서 나눈 대화를 메인 대화 뒤에 잇는다
function v2ThreadMirrorBack(place) {
  const body = document.getElementById('ai-chat-body');
  if (!body || typeof AGENT_CHAT_FINAL === 'undefined') return;
  const news = AGENT_CHAT_FINAL.slice(v2AgentSeen);
  v2AgentSeen = AGENT_CHAT_FINAL.length;
  if (!news.length) return;
  const line = document.createElement('div');
  line.className = 'v2-th-place';
  line.dataset.v2mirror = '1';
  line.innerHTML = '<span>' + escHtml(place || '원가조정') + '</span>';
  body.appendChild(line);
  news.forEach(function (d) {
    const me = d.who === 'pm';
    const m = document.createElement('div');
    m.className = 'ai-msg' + (me ? ' me' : '');
    m.dataset.v2mirror = '1';
    m.innerHTML = '<div class="ai-bubble' + (me ? ' me' : '') + '">' + escHtml(d.text || '') + '</div>';
    body.appendChild(m);
  });
}

// 화면이 바뀔 때 — 들어오면 접어 넣고, 나가면 메인 대화에 잇는다
function v2ThreadOnPlace() {
  if (homeVer !== 'v2') return;
  setTimeout(function () {
    if (v2CenterChatOn()) { v2ThreadAbsorb(); return; }
    if (v2WasCenter) {
      v2WasCenter = false;
      v2VisitKey = '';
      v2ThreadMirrorBack(v2LastCenterPlace);
      if (v2Absorbed && !v2OnMain() && typeof dockAiChat === 'function') dockAiChat();  // 다른 상세 화면이면 오른쪽에서 이어감
      v2Absorbed = false;
    }
    // 가운데 대화가 없는 상세 화면에 팝업이 덮인 채 남지 않게 (담당 프로젝트 "이동 →" 등)
    const ov = document.getElementById('ai-chat-overlay');
    if (!v2OnMain() && ov && ov.classList.contains('open') && !ov.classList.contains('docked')
        && typeof dockAiChat === 'function') dockAiChat();
  }, 60);
}

// 넘어온 대화를 가운데 대화 칸에 시간 순서대로 끼워 넣는다
function v2ThreadSay(who, html, pending) {
  return '<div class="agai-say ' + who + ' v2-th">'
    + '<span class="agai-who">' + (who === 'pm' ? '이봄(PM)' : '🤖 Agent') + '</span>'
    + '<div class="agai-bubble' + (pending ? ' pending' : '') + '">' + html + '</div></div>';
}
function v2ThreadSegHtml(seg) {
  const say = v2ThreadSay;
  if (seg.inline) return seg.items.map(function (it) { return say(it.who, it.html); }).join('');
  return seg.items.map(function (it) { return say(it.who, it.html); }).join('')
    + '<div class="v2-th-place"><span>' + escHtml(seg.place) + '</span></div>'
    + (seg.follow ? say('agent', escHtml(seg.follow)) : '');
}
function v2ThreadMerge(html) {
  const open = '<div class="agga-col-body chat">';
  const i = html.indexOf(open);
  const foot = (i < 0) ? -1 : html.indexOf('<div class="agga-col-foot">', i);
  if (foot < 0) return html;
  const end = html.lastIndexOf('</div>', foot);
  const parts = html.slice(i + open.length, end).split(/(?=<div class="agai-say )/);
  const n = parts.length - 1;
  let out = parts[0];
  if (typeof AGENT_CHAT_FINAL === 'undefined' || n !== AGENT_CHAT_FINAL.length) {
    out += v2Thread.map(v2ThreadSegHtml).join('') + parts.slice(1).join('');   // 모양이 다르면 앞에 모아 둔다
    if (v2CenterAsk) out += v2ThreadSay('agent', '…', true);
  } else {
    const segsAt = function (k) {
      return v2Thread.filter(function (g) { return (k < n) ? g.at === k : g.at >= n; }).map(v2ThreadSegHtml).join('');
    };
    for (let k = 0; k < n; k++) out += segsAt(k) + parts[k + 1];
    out += segsAt(n);
    if (v2CenterAsk) out += v2ThreadSay('agent', '…', true);      // 메인 AI 의 답을 기다리는 중
  }
  return html.slice(0, i + open.length) + out + html.slice(end);
}
var renderAgentGaChatFinalBeforeShell = (typeof renderAgentGaChatFinal === 'function') ? renderAgentGaChatFinal : null;
if (renderAgentGaChatFinalBeforeShell) {
  window.renderAgentGaChatFinal = function (roll) {
    const html = renderAgentGaChatFinalBeforeShell(roll);
    if (homeVer !== 'v2') return html;
    const ov = document.getElementById('ai-chat-overlay');
    if (ov && ov.classList.contains('docked')) setTimeout(v2ThreadAbsorb, 0);
    if (!v2Thread.length) return html;
    const sig = v2Thread.length + '|' + AGENT_CHAT_FINAL.length;
    if (sig !== v2ThreadSig) {                     // 대화가 새로 이어지면 끝으로 내린다
      v2ThreadSig = sig;
      setTimeout(function () {
        const el = document.querySelector('#s-budget .agga-col-body.chat');
        if (el) el.scrollTop = el.scrollHeight;
      }, 30);
    }
    return v2ThreadMerge(html);
  };
}

// 대화창이 오른쪽으로 접히는 순간 — 가운데 대화가 있는 화면이면 그쪽으로 넣는다
// (이동은 hash 변화라 한 박자 늦게 그려진다 → 두 번 확인)
var dockAiChatBeforeShell = (typeof dockAiChat === 'function') ? dockAiChat : null;
if (dockAiChatBeforeShell) {
  window.dockAiChat = function () {
    dockAiChatBeforeShell.apply(this, arguments);
    if (homeVer !== 'v2') return;
    setTimeout(v2ThreadAbsorb, 80);
    setTimeout(v2ThreadAbsorb, 400);
  };
}

// 가운데 대화가 떠 있으면 우하단 대화 버튼도 감춘다 (한 화면에 대화는 하나)
var syncChatFabBeforeShell = (typeof syncChatFab === 'function') ? syncChatFab : null;
if (syncChatFabBeforeShell) {
  window.syncChatFab = function () {
    if (v2CenterChatOn()) { if (typeof hideChatFab === 'function') hideChatFab(); return; }
    return syncChatFabBeforeShell.apply(this, arguments);
  };
}

// 메인에서 다시 물으면 지우지 않고 이어서 묻는다 (처음 여는 안내 문구만 빼고 원래 흐름 그대로)
var openAiChatBeforeShell = (typeof openAiChat === 'function') ? openAiChat : null;
if (openAiChatBeforeShell) {
  window.openAiChat = function (entry, initialQuery) {
    const body = document.getElementById('ai-chat-body');
    const keep = homeVer === 'v2' && body && body.querySelector('.ai-msg.me');
    if (!keep) return openAiChatBeforeShell.apply(this, arguments);
    const old = document.createDocumentFragment();
    while (body.firstChild) old.appendChild(body.firstChild);
    openAiChatBeforeShell.apply(this, arguments);
    const first = body.firstElementChild;
    if (first && first.querySelector('.ai-roster')) first.remove();
    body.insertBefore(old, body.firstChild);
    body.scrollTop = body.scrollHeight;
  };
}

// "외주비 원가조정 화면으로 가줘" — 계정까지 말했으면 그 계정 화면으로 바로 간다
// (화면 길잡이는 원가조정 첫 화면까지만 고른다)
let v2NavHint = null;
var chatNavigateBeforeShell = (typeof chatNavigate === 'function') ? chatNavigate : null;
if (chatNavigateBeforeShell) {
  window.chatNavigate = function (text) {
    v2NavHint = { text: String(text || ''), t: Date.now() };
    return chatNavigateBeforeShell.apply(this, arguments);
  };
}
var navGoBeforeShell = window.navGo;
window.navGo = function (key) {
  const h = v2NavHint;
  if (homeVer === 'v2' && key === 'budget-adjust' && h && Date.now() - h.t < 8000) {
    v2NavHint = null;
    const t = h.text.replace(/\s/g, '');
    const acct = ['인건비', '외주비', '재료비', '경비'].find(function (a) { return t.indexOf(a) >= 0; })
      || (/(A\/S|AS)/i.test(t) ? 'A/S Cost' : '');
    if (acct && typeof homePjtGo === 'function') {
      const pj = (typeof v2PjtFromText === 'function' && v2PjtFromText(h.text))
        || (typeof homeSelBudgetKey === 'function' && homeSelBudgetKey()) || 'budgetMock';
      homePjtGo(pj, acct);
      return;
    }
  }
  return navGoBeforeShell.apply(this, arguments);
};

// ── 가운데 입력을 질문 유형별로 나눈다 ──
// 대화를 가운데 하나로 합치면서 화면 이동·이상징후·할 일·데이터 분석 같은 질문을 할 곳이 없어졌다.
// 예산 조정·기안처럼 예산관리 Agent 가 알아듣는 말은 지금처럼 Agent 가, 나머지 일반 질문은
// 메인 AI(sendAiChat)가 답하고 그 답을 같은 대화 줄기에 잇는다.
let v2CenterAsk = 0;                               // 가운데에서 메인 AI 에게 넘긴 시각 (답을 기다리는 중)

// 예산관리 Agent 가 처리할 말인가 — Agent 자신의 해석기를 그대로 쓴다 (읽기만 함)
function v2IsBudgetAsk(q) {
  if (typeof agentSlotFinal !== 'undefined' && agentSlotFinal) return true;          // 업체·기간을 묻는 중
  try { if (typeof agentSimReadFinal === 'function' && agentSimReadFinal(q)) return true; } catch (e) {}
  try { if (typeof agentReadEvidenceFinal === 'function' && agentReadEvidenceFinal(q, 'cr-02')) return true; } catch (e) {}
  return /(CP|여유|제안|조정안|검토\s*대기|편성|기안|상신|결재|반영|해제|되돌|방안)/i.test(q);
}
// 메인 AI 가 처리할 일반 질문인가 — 메인 대화의 질문 분류기(routeIntents)를 그대로 쓴다
function v2IsMainAsk(q) {
  if (typeof routeIntents !== 'function') return false;
  let routes = [];
  try { routes = routeIntents(q) || []; } catch (e) { return false; }
  if (routes.some(function (r) { return r.agent === 'navi' || r.agent === 'risk' || r.agent === 'todo'; })) return true;
  const t = String(q).replace(/\s/g, '');          // 데이터 분석은 규칙에 걸린 질문만 (그 외 자유 질문은 Agent 가 예산 맥락으로 답한다)
  return (typeof INTENT_RULES !== 'undefined') && INTENT_RULES.some(function (r) {
    try { return r.agent === 'q' && r.test(t); } catch (e) { return false; }
  });
}

function v2AskMain(q) {
  const el = document.getElementById('agent-chat-input');
  if (el) el.value = '';
  v2ThreadMirrorBack(v2PlaceLabel());              // 앞서 Agent 와 나눈 대화를 먼저 메인 쪽에 이어 둬야 순서가 맞다
  v2CaptureMain();                                 // 이미 넘긴 메시지는 다시 넘기지 않게 표시만
  v2CenterAsk = Date.now();
  const inp = document.getElementById('ai-chat-query');
  if (!inp || typeof sendAiChat !== 'function') return;
  inp.value = q;
  sendAiChat();
  v2CenterPull();
}

// 메인 대화창에 쌓인 답을 가운데로 가져온다 (장소 줄·안내 없이 그대로 이어서)
function v2CenterPull() {
  if (!v2CenterAsk || !v2CenterChatOn()) return;
  const items = v2CaptureMain();
  if (items.length) {
    const n = (typeof AGENT_CHAT_FINAL !== 'undefined') ? AGENT_CHAT_FINAL.length : 0;
    v2Thread.push({ at: n, inline: true, items: items });
    v2AgentSeen = n;                               // 이 사이 Agent 대화는 없음 — 다음 넘김 기준점
  }
  const body = document.getElementById('ai-chat-body');
  const waiting = !!(body && body.querySelector('.ai-bubble.typing'));
  if (!waiting && items.some(function (it) { return it.who === 'agent'; })) v2CenterAsk = 0;
  if (Date.now() - v2CenterAsk > 20000) v2CenterAsk = 0;   // 답이 오지 않으면 기다림을 푼다
  if (items.length || !v2CenterAsk) {
    if (typeof renderBudgetPage === 'function') renderBudgetPage();
  }
}
(function v2WatchMainBody() {
  let t = null;
  function bind() {
    const body = document.getElementById('ai-chat-body');
    if (!body) { setTimeout(bind, 300); return; }
    new MutationObserver(function () {
      if (!v2CenterAsk) return;
      clearTimeout(t);
      t = setTimeout(v2CenterPull, 120);
    }).observe(body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

var agentChatSendFinalBeforeShell = (typeof agentChatSendFinal === 'function') ? agentChatSendFinal : null;
if (agentChatSendFinalBeforeShell) {
  window.agentChatSendFinal = function () {
    if (homeVer === 'v2' && v2CenterChatOn()) {
      const el = document.getElementById('agent-chat-input');
      const q = el ? el.value.trim() : '';
      if (q && !v2IsBudgetAsk(q) && v2IsMainAsk(q)) { v2AskMain(q); return; }
    }
    return agentChatSendFinalBeforeShell.apply(this, arguments);
  };
}

// 메인(또는 오른쪽 창)에서 프로젝트와 금액 조정을 함께 말하면 — 그 계정 화면으로 가서 Agent 가 바로 계산한다
// (예: "예산관리시스템 목업용 경비 300만원 줄여줘". 프로젝트를 특정할 수 없으면 기존처럼 메인 AI 가 답한다)
function v2BudgetActTarget(text) {
  let sim = null;
  try { sim = (typeof agentSimReadFinal === 'function') ? agentSimReadFinal(text) : null; } catch (e) {}
  if (!sim || ['delta', 'move', 'sub'].indexOf(sim.kind) < 0) return null;
  const acct = sim.acct || sim.to || sim.from;
  const pj = (typeof v2PjtFromText === 'function') ? v2PjtFromText(text) : null;
  if (!acct || !pj || pj === 'all') return null;
  return { pj: pj, acct: acct };
}
var sendAiChatBeforeShell = (typeof sendAiChat === 'function') ? sendAiChat : null;
if (sendAiChatBeforeShell) {
  window.sendAiChat = function () {
    if (homeVer === 'v2' && !v2CenterChatOn() && typeof homePjtGo === 'function') {
      const inp = document.getElementById('ai-chat-query');
      const text = inp ? String(inp.value || '').trim() : '';
      const go = text ? v2BudgetActTarget(text) : null;
      if (go) {
        inp.value = '';
        v2PendingAsk = { text: text, t: Date.now() };
        homePjtGo(go.pj, go.acct);
        return;
      }
    }
    return sendAiChatBeforeShell.apply(this, arguments);
  };
}

// 가운데에서 물은 분석 질문은 답만 하고 화면을 옮기지 않는다 (메인에서는 관련 화면으로 함께 이동)
var navToRelevantBeforeShell = (typeof navToRelevant === 'function') ? navToRelevant : null;
if (navToRelevantBeforeShell) {
  window.navToRelevant = function () {
    if (v2CenterAsk && v2CenterChatOn()) return;
    return navToRelevantBeforeShell.apply(this, arguments);
  };
}

// 가운데에서 물은 이상징후·할 일은 지금 보고 있는 프로젝트 기준으로 답한다
// (질문에 프로젝트 이름이 있거나 "전체"라고 하면 그대로 따른다)
var v2PjtFromTextBeforeShell = (typeof v2PjtFromText === 'function') ? v2PjtFromText : null;
if (v2PjtFromTextBeforeShell) {
  window.v2PjtFromText = function (text) {
    const cur = (/[?&]pj=([^&]+)/.exec(location.hash || '') || [])[1];
    if (!v2CenterAsk || !cur || !v2CenterChatOn() || /(전체|모든|전\s*프로젝트)/.test(String(text || ''))) {
      return v2PjtFromTextBeforeShell.apply(this, arguments);
    }
    const saved = homeV2Open;
    homeV2Open = decodeURIComponent(cur);           // 이름을 못 찾았을 때의 기본값만 바꾼다
    try { return v2PjtFromTextBeforeShell.apply(this, arguments); }
    finally { homeV2Open = saved; }
  };
}

// ── 전체 적용 ──
function v2ApplyShell() {
  const on = homeVer === 'v2';
  document.body.classList.toggle('app-v2', on);
  document.body.classList.toggle('home-v2', on);  // 메인 버전2 팔레트 토큰(home.css)도 함께
  v2MountRail();
  v2ApplyRail();
  v2ApplyTopMenu();
  v2MountV1Pill();
  v2ChatDecorate();
}

// ── 버전 전환 — 앱 전체 ──
function setHomeVer(v) {                          // crud N — 화면 버전 전환
  homeVer = (v === 'v2') ? 'v2' : 'v1';
  try { localStorage.setItem('newmis.homeVer', homeVer); } catch (e) {}
  v2ThreadSig = '';                                // 다시 그리면 대화 끝으로 내려 준다
  v2ApplyAgentDefault(true);                       // 수행원가 화면이 열려 있으면 그 자리에서 다시 그림
  v2ApplyShell();
  if (v2OnMain() && typeof initDashboard === 'function') initDashboard();
  if (document.querySelector('#s-budget.active') && typeof renderBudgetPage === 'function') renderBudgetPage();  // 이어 붙인 대화 넣기/빼기
  if (homeVer === 'v2') v2ThreadOnPlace();
  else if (v2Absorbed) {                           // 버전1 은 원래대로 오른쪽 창에서 이어감
    v2Absorbed = false; v2WasCenter = false;
    if (!v2OnMain() && typeof dockAiChat === 'function') dockAiChat();
  }
  window.scrollTo(0, 0);
}

// ── 메인화면 버전2 — 레일이 앱 셸로 나갔으므로 히어로만 그린다 ──
function renderHomeV2() {
  const h = homeV2Hero();
  return `
    <div class="v2-home">
      <section class="v2-hero">
        <span class="v2-mark" aria-hidden="true">✦</span>
        <p class="v2-greet">${escHtml(h.greet)}</p>
        <h1 class="v2-head">${h.head}</h1>
        <div class="v2-ask">
          <span class="v2-ask-ic" aria-hidden="true">✦</span>
          <input id="ai-main-query" type="text" placeholder="원가 관련 궁금한 점을 자연어로 질문해 주세요."
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="v2-ask-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>
        <p class="v2-foot">원하는 화면 이동·원가 분석·이상징후 확인을 자연어로 요청하면 AI가 처리합니다.</p>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

// 메인을 다시 그릴 때(사용자 전환·버전 전환 포함) 레일도 함께 갱신한다.
// dashboard.js 가 initDashboard 를 이미 런타임 교체해 두었으므로 그것을 붙잡고 감싼다.
var initDashboardBeforeShell = window.initDashboard;
window.initDashboard = function () {
  if (typeof initDashboardBeforeShell === 'function') initDashboardBeforeShell();
  v2ApplyShell();
};

// ── 화면 전환 감지 ──
// 공유 라우터(setScreen)를 덮지 않고, .screen 의 class 변화와 hash 변화만 관찰한다.
(function v2Watch() {
  let t = null;
  const kick = function () {
    clearTimeout(t);
    t = setTimeout(function () {
      if (homeVer === 'v2') { v2OnPlaceChange(); v2NavSync(); }
      v2MountV1Pill();
    }, 30);
  };
  function bind() {
    const content = document.querySelector('.content');
    if (!content) { setTimeout(bind, 200); return; }
    new MutationObserver(function (recs) {
      for (let i = 0; i < recs.length; i++) {
        const el = recs[i].target;
        if (el.classList && el.classList.contains('screen')) { kick(); return; }
      }
    }).observe(content, { attributes: true, attributeFilter: ['class'], subtree: true });
    window.addEventListener('hashchange', kick);
    v2LastPlace = v2PlaceKey();
    v2ApplyShell();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
