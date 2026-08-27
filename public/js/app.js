// ── 공통 상수 ──
const PROJ_NAMES = { cloud:'클라우드 인프라 고도화', erp:'ERP 고도화', mobile:'모바일 앱 리뉴얼', sec:'보안 시스템 구축' };
const PM_NAMES   = { cloud:'김은지', erp:'이강혁', mobile:'최우진', sec:'정미래' };
const LEVEL_STYLE = {
  '높음': { bg:'#fee2e2', color:'#991b1b' },
  '주의': { bg:'#fef3c7', color:'#92400e' },
  '중간': { bg:'#fef3c7', color:'#92400e' },
  '낮음': { bg:'#dcfce7', color:'#166534' },
};

// AI GUIDE: 공통 화면 전환 컨트롤러입니다.
// - index.html의 단일 페이지 안에서 .screen 영역을 show/hide 합니다.
// - 각 show* 함수는 화면 id, 좌측 메뉴 active 상태, 화면별 render 함수를 연결합니다.
// - 화면 업무 가이드 챗봇은 현재 .screen.active와 nav active 값을 읽어 화면 컨텍스트를 판단합니다.
// - 신규 화면을 추가할 때는 index.html의 screen div, 좌측 메뉴 onclick, 이 파일의 show* 함수,
//   screen-guide-chatbot.js의 screenGuideKnowledge를 함께 추가해야 합니다.

let risks = [];

// ── 데이터 로드 ──
async function loadRisks() {
  try {
    const res = await fetch('/api/risks');
    risks = await res.json();
  } catch(e) { risks = []; }
}

// ── 네비게이션 ──
function setScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  updateHashForScreen(id);
}
function setNav(id) {
  document.querySelectorAll('.nav-item, .nav-sub-item, .nav-sub2-item, .nav-group-btn').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── 개발 에이전트 그리드 (구글 앱 런처 스타일) ──
// 에이전트 추가 시 아래 배열에 한 줄만 추가하면 됩니다.
const AGENT_APPS = [
  { name: '요구사항 Agent', sub: '10.250.98.122:8502', icon: '📑', url: 'http://10.250.98.122:8502' },
  { name: 'PROMIS 참고',    sub: '10.250.98.122:8501', icon: '🗂️', url: 'http://10.250.98.122:8501' },
  // { name: '세번째 Agent', sub: '...:8503', icon: '🧭', url: 'http://10.250.98.122:8503' },
];
function toggleAgentGrid(btn) {
  let pop = document.getElementById('agent-grid-pop');
  if (pop && pop.classList.contains('open')) { pop.classList.remove('open'); return; }
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'agent-grid-pop';
    pop.className = 'agent-grid-pop';
    document.body.appendChild(pop);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#agent-grid-pop') && !e.target.closest('.tb-agents')) pop.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') pop.classList.remove('open'); });
  }
  const tiles = AGENT_APPS.map(function (a) {
    return `<button class="agent-tile" onclick="window.open('${a.url}','_blank','noopener')" title="${a.name} · ${a.url}">
        <span class="agent-tile-ic">${a.icon}</span>
        <span class="agent-tile-name">${a.name}</span>
        <span class="agent-tile-sub">${a.sub || ''}</span>
      </button>`;
  }).join('');
  pop.innerHTML = `<div class="agent-grid-head">AI개발 Agent</div><div class="agent-grid">${tiles}</div>`;
  const b = btn || document.querySelector('.tb-agents');
  const r = b.getBoundingClientRect();
  pop.style.top = (r.bottom + 8) + 'px';
  pop.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  pop.classList.add('open');
}

// ── URL 라우팅 (해시 = 소스파일명) ──
const SCREEN_ROUTES = {
  's-main': 'dashboard',
  // 수행원가는 한 화면(s-budget)에 3개 하위 메뉴가 있으므로 costMode로 라우트명을 결정한다.
  // 각 하위 메뉴의 라우트 액션은 전용 파일(budget-cost-*.js)에서 ROUTE_ACTIONS에 등록한다.
  // 원가조정(adjust)은 선택된 비용계정(budgetSetupEditAccount)에 따라 한 뎁스 더 내려간다:
  //   #/budget-adjust/labor · /outsource · /material · /expense · /as
  //   (계정↔슬러그 매핑 BUDGET_AREA_SLUGS와 라우트 액션은 budget-area-*.js가 소유한다.)
  's-budget': () => {
    let base;
    if (typeof costMode !== 'undefined' && costMode === 'adjust') {
      const acc = (typeof budgetSetupEditAccount !== 'undefined') ? budgetSetupEditAccount : null;
      const slug = (acc && typeof BUDGET_AREA_SLUGS !== 'undefined') ? BUDGET_AREA_SLUGS[acc] : null;
      base = slug ? ('budget-adjust/' + slug) : 'budget-adjust';
    } else {
      base = (typeof costMode !== 'undefined' && costMode === 'history') ? 'budget-history' : 'budget-status';
    }
    // 상세(프로젝트) 화면이면 끝에 프로젝트 키를 파라미터로 — 딥링크로 그 프로젝트 화면 바로 진입
    const detail = (typeof budgetScreenView !== 'undefined' && budgetScreenView === 'detail');
    const pj = (detail && typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : null;
    return pj ? (base + '?pj=' + pj) : base;
  },
  // 인사이트 딥링크(AI 바로가기): 경로는 메뉴명(탭)까지, 프로젝트는 끝에 파라미터로 → insights/<탭>?pj=<프로젝트ID>
  's-insights': () => {
    const id = (typeof insRouteId === 'function') ? insRouteId() : null;
    const tab = (typeof insTab !== 'undefined') ? insTab : 'overview';
    return id ? ('insights/' + tab + '?pj=' + id) : ('insights/' + tab);
  },
  's-custom-report': 'custom-report',
  's-ai-report': 'ai-report',
  's-si-project': 'si-project',
  's-proposal-project': 'proposal-project',
  's-wg-project': 'wg-project',
  's-internal-project': 'internal-project',
  's-investment-project': 'investment-project',
  's-advance-project': 'advance-project',
  's-system-desc': 'system-desc',
  's-master-config': 'master-config',
  's-hist': 'risk-history',
  's-cp-briefing': 'checkpoint', 's-cp-status': 'checkpoint', 's-cp-history': 'checkpoint',
  's-monthly-close': 'monthly-close',
  's-initiation': 'initiation-report',
  's-interim': 'interim-report',
  's-closure': 'closure-report',
  's-phase-history': 'phase-report',
  's-project-close': 'project-close',
};
const ROUTE_ACTIONS = {
  'dashboard': () => showMain(),
  // 'budget-status' / 'budget-adjust' / 'budget-history'는 budget-cost-*.js에서 등록한다.
  'insights': () => (typeof gotoInsights === 'function' ? gotoInsights(routeQueryParam('pj'), 'overview') : (typeof showInsights === 'function' ? showInsights('overview') : null)),
  'custom-report': () => showCustomReport(),
  'ai-report': () => showAiReport(),
  'si-project': () => showSIProject(),
  'proposal-project': () => showProposalProject(),
  'wg-project': () => showWGProject(),
  'internal-project': () => showInternalProject(),
  'investment-project': () => showInvestmentProject(),
  'advance-project': () => showAdvanceProject(),
  'system-desc': () => showSysDescConcept(),
  'master-config': () => showMasterBudgetRate(),
  'risk-history': () => showCpCurrent(),
  'checkpoint': () => showCpBriefing(),
  'monthly-close': () => showMonthlyClose(),
  'initiation-report': () => showInitiation(),
  'interim-report': () => showInterim(),
  'closure-report': () => showClosure(),
  'phase-report': () => showPhaseHistory(),
  'project-close': () => showProjectClose(),
};
let _suppressNextHash = false;
function updateHashForScreen(id) {
  let r = SCREEN_ROUTES[id];
  if (typeof r === 'function') r = r();
  if (!r) return;
  const target = '#/' + r;
  if (location.hash !== target) { _suppressNextHash = true; location.hash = target; }
}
function routeName() { return (location.hash || '').replace(/^#\/?/, '').split('?')[0]; }
// 해시의 쿼리 파라미터 읽기 (예: #/insights/progress?pj=xxx → routeQueryParam('pj'))
function routeQueryParam(k) {
  const h = location.hash || '';
  const qi = h.indexOf('?');
  if (qi < 0) return null;
  return new URLSearchParams(h.slice(qi + 1)).get(k);
}
// 동적 라우트 (딥링크). 정적 ROUTE_ACTIONS에 없을 때만 매칭한다.
//   insights[/<탭>]?pj=<프로젝트ID>  → gotoInsights(pj, tab)
const DYNAMIC_ROUTES = [
  { re: /^insights(?:\/([^/?]+))?$/, run: m => (typeof gotoInsights === 'function' ? gotoInsights(routeQueryParam('pj'), m[1]) : null) },
];
function resolveAction(name) {
  if (ROUTE_ACTIONS[name]) return ROUTE_ACTIONS[name];
  for (const d of DYNAMIC_ROUTES) { const m = name.match(d.re); if (m) return () => d.run(m); }
  return null;
}
function routeFromHash() {
  if (_suppressNextHash) { _suppressNextHash = false; return; }
  const action = resolveAction(routeName());
  if (action) action();
}
function routeInitial() {
  const action = resolveAction(routeName());
  if (action) action(); else showMain();
}
window.addEventListener('hashchange', routeFromHash);

// 프로젝트 상황실 그룹 토글
function toggleNavGroup(subId) {
  const sub = document.getElementById(subId);
  const btn = document.getElementById('ngbtn-' + subId);
  if (!sub) return;
  sub.classList.toggle('open');
  if (btn) btn.classList.toggle('open');
}

function openNavGroup(subId) {
  const sub = document.getElementById(subId);
  const btn = document.getElementById('ngbtn-' + subId);
  if (sub && !sub.classList.contains('open')) {
    sub.classList.add('open');
    if (btn) btn.classList.add('open');
  }
}

// ── 화면 전환 ──
function showMain() {
  setScreen('s-main');
  setNav('nav-main');
  updateKpiMain();
}

function toggleSideMenu() {
  document.body.classList.toggle('menu-open');
  const btn = document.getElementById('menu-open-button');
  if (btn) btn.textContent = document.body.classList.contains('menu-open') ? '메뉴닫기' : '메뉴열기';
}

function showBudget() {
  budgetScreenView = 'list';
  setScreen('s-budget');
  setNav('nav-budget');
  renderBudgetPage();
}

function showProjectClose() {
  projectCloseView = 'list';
  setScreen('s-project-close');
  setNav('nav-project-close');
  renderProjectClose();
}

function showCustomReport() {
  setScreen('s-custom-report');
  setNav('nav-custom-report');
  renderCustomReport();
}
function showAiReport() {
  setScreen('s-ai-report');
  setNav('nav-ai-report');
  renderAiReport();
}

function showSysDescConcept() {
  openNavGroup('sub-sysdesc');
  setScreen('s-system-desc');
  setNav('nav-sysdesc-concept');
  renderSysDescConcept();
}
function showSysDescProcess() {
  openNavGroup('sub-sysdesc');
  setScreen('s-system-desc');
  setNav('nav-sysdesc-process');
  renderSysDescProcess();
}
function showSysDescData() {
  openNavGroup('sub-sysdesc');
  setScreen('s-system-desc');
  setNav('nav-sysdesc-data');
  renderSysDescData();
}
function showSysDescDepts() {
  openNavGroup('sub-sysdesc');
  setScreen('s-system-desc');
  setNav('nav-sysdesc-depts');
  renderSysDescDepts();
}

function showSIProject() {
  openNavGroup('sub-ops');
  setScreen('s-si-project');
  setNav('nav-si-project');
  renderSIProject();
}

function showProposalProject() {
  openNavGroup('sub-ops');
  ppView = 'list';
  setScreen('s-proposal-project');
  setNav('nav-proposal-project');
  renderProposalProject();
}

function showWGProject() {
  openNavGroup('sub-ops');
  setScreen('s-wg-project');
  setNav('nav-wg-project');
  renderWGProject();
}

function showInternalProject() {
  openNavGroup('sub-ops');
  setScreen('s-internal-project');
  setNav('nav-internal-project');
  renderInternalProject();
}

function showInvestmentProject() {
  openNavGroup('sub-ops');
  setScreen('s-investment-project');
  setNav('nav-investment-project');
  renderInvestmentProject();
}

function showAdvanceProject() {
  openNavGroup('sub-ops');
  setScreen('s-advance-project');
  setNav('nav-advance-project');
  renderAdvanceProject();
}

function showInitiation() {
  initView = 'list';
  openNavGroup('sub-phase');
  setScreen('s-initiation');
  setNav('nav-initiation');
  renderInitiation();
}

function showInterim() {
  interimView = 'list';
  openNavGroup('sub-phase');
  setScreen('s-interim');
  setNav('nav-interim');
  renderInterim();
}

function showClosure() {
  closureView = 'list';
  openNavGroup('sub-phase');
  setScreen('s-closure');
  setNav('nav-closure');
  renderClosure();
}

function showPhaseHistory() {
  openNavGroup('sub-phase');
  setScreen('s-phase-history');
  setNav('nav-phase-history');
  renderPhaseHistory();
}

function showMonthlyClose() {
  setScreen('s-monthly-close');
  setNav('nav-monthly');
  renderMonthlyClose();
}

// ── 구형 호환 ──
function showRiskInsight() { showCpCurrent(); }

// ── 프로젝트 체크포인트 4개 화면 ──
function showCpCurrent() {
  openNavGroup('sub-cp');
  riskCalProj   = 'all';
  riskCalLevel  = 'all';
  riskCalStatus = 'all';
  riskCalQuery  = '';
  riskCalYear   = new Date().getFullYear();
  riskCalMonth  = new Date().getMonth();
  setScreen('s-hist');
  setNav('nav-cp-current');
  renderRiskInsightCalendar();
}

function showCpBriefing() {
  openNavGroup('sub-cp');
  setScreen('s-cp-briefing');
  setNav('nav-cp-briefing');
  renderCpBriefing();
}

function showCpStatus() {
  openNavGroup('sub-cp');
  setScreen('s-cp-status');
  setNav('nav-cp-status');
  renderCpStatus();
}

function showCpHistory() {
  openNavGroup('sub-cp');
  setScreen('s-cp-history');
  setNav('nav-cp-history');
  renderCpHistory();
}

// 대시보드 체크포인트 칩 → 현황 이동
function goHistory(proj) {
  openNavGroup('sub-cp');
  setScreen('s-hist');
  setNav('nav-cp-current');
  riskCalProj  = proj;
  riskCalYear  = new Date().getFullYear();
  riskCalMonth = new Date().getMonth();
  renderRiskInsightCalendar();
}

// 조치 저장 후 현재 활성 체크포인트 화면 갱신
function refreshCurrentCpScreen() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  switch (active.id) {
    case 's-hist':         renderRiskInsightCalendar(); break;
    case 's-cp-briefing':  renderCpBriefing();          break;
    case 's-cp-status':    renderCpStatus();            break;
    case 's-cp-history':   renderCpHistory();           break;
  }
  updateKpiMain();
}

function showMasterBudgetRate() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-budget');
  renderMasterConfig('budget-rate');
}
function showMasterReportLayout() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-report');
  renderMasterConfig('report-layout');
}
function showMasterMethodology() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-method');
  renderMasterConfig('methodology');
}
function showMasterDevEnv() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-devenv');
  renderMasterConfig('dev-env');
}
function showMasterMMRate() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-mmrate');
  renderMasterConfig('mm-rate');
}
function showMasterPhase() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-phase');
  renderMasterConfig('phase-def');
}
function showMasterRiskCriteria() {
  openNavGroup('sub-master');
  setScreen('s-master-config');
  setNav('nav-master-risk');
  renderMasterConfig('risk-criteria');
}

// ============================================================
//  통합 AI Agent (Navi / Q / Pilot) — 하나의 대화 surface,
//  메인 입력이 진입점, intent 라우팅 + agent 간 handoff.
//  aiAgentReply 부분이 추후 실제 LLM 호출로 교체 가능한 지점.
// ============================================================
const AGENTS = {
  navi:  { name:'Budget Navi',  role:'업무·메뉴 찾아가기',  ex:'실행예산 변경 어디서 해?' },
  q:     { name:'Budget Q',     role:'데이터에 질문하기',   ex:'왜 원가율이 올랐어?' },
  pilot: { name:'Budget Pilot', role:'AI 프로젝트 관리',    ex:'오늘 확인할 업무 알려줘.' },
};

function escHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function openQuickShortcut(kind) { openAiChat(kind); }
function askFromHome() {
  const input = document.getElementById('ai-main-query');
  const q = input ? input.value.trim() : '';
  if (input) input.value = '';
  openAiChat('main', q || undefined);
}
function askExample(text) { openAiChat('main', text); }

function openAiChat(entry, initialQuery) {
  document.getElementById('ai-chat-title').textContent = 'AI 어시스턴트';
  document.getElementById('ai-chat-sub').textContent = 'New MIS · 묻고 → 분석하고 → 실행까지';
  setChatAvatar(entry);
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');

  if (entry === 'pilot') {
    aiAgentMsg('pilot', pilotBriefingHtml());
  } else if (entry === 'navi') {
    document.getElementById('ai-chat-title').textContent = 'Budget Navi';
    document.getElementById('ai-chat-sub').textContent = '지금 어디까지 했고, 다음에 뭘 하면 되는지 안내해요';
    aiAgentMsg('navi', naviGuideHtml());
  } else if (entry === 'q') {
    aiAgentMsg('q', '데이터에 무엇이든 물어보세요. 숫자의 의미와 원인까지 근거와 함께 설명해 드릴게요.'
      + examplesHtml(['SKON 외주비 왜 늘었어?', '원가율 80% 넘는 프로젝트 있어?']));
  } else {
    aiAgentMsg('ai', '무엇을 도와드릴까요? 프로젝트를 <b>찾거나</b>, 숫자의 <b>이유를 묻거나</b>, 다음 <b>업무를 요청</b>해보세요.'
      + examplesHtml(['SKON 외주비가 왜 늘었어?', '실행예산 변경 화면 찾아줘', '오늘 내가 처리해야 할 업무 알려줘']));
  }
  const input = document.getElementById('ai-chat-query');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  if (initialQuery) { input.value = initialQuery; sendAiChat(); }
}
function closeAiChat() { document.getElementById('ai-chat-overlay').classList.remove('open'); }

// ── 팀 개발 셋업 가이드 (상단 우측 버튼) ──
function openSetupGuide() { const el = document.getElementById('setup-guide-overlay'); if (el) el.classList.add('open'); }
function closeSetupGuide() { const el = document.getElementById('setup-guide-overlay'); if (el) el.classList.remove('open'); }
function copySetupText(text, btn) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => flashCopied(btn)).catch(() => {});
}
function copySetupCode(btn) {
  const pre = btn.parentElement.querySelector('pre');
  if (pre) copySetupText(pre.innerText, btn);
}
function flashCopied(btn) { if (!btn) return; const t = btn.textContent; btn.textContent = '복사됨'; setTimeout(() => { btn.textContent = t; }, 1200); }

// ── 메시지 렌더 ──
function aiUserMsg(text) {
  const body = document.getElementById('ai-chat-body');
  const d = document.createElement('div'); d.className = 'ai-msg me';
  d.innerHTML = `<div class="ai-bubble me">${escHtml(text)}</div>`;
  body.appendChild(d); body.scrollTop = body.scrollHeight;
}
function aiAgentMsg(agent, html) {
  const body = document.getElementById('ai-chat-body');
  const d = document.createElement('div'); d.className = 'ai-msg';
  const chip = (agent === 'ai') ? '' :
    `<div class="ai-agent-chip ag-${agent}"><span class="ai-agent-dot"></span>${AGENTS[agent].name}</div>`;
  d.innerHTML = `${chip}<div class="ai-bubble">${html}</div>`;
  body.appendChild(d); body.scrollTop = body.scrollHeight;
}
function aiTyping(agent) {
  const body = document.getElementById('ai-chat-body');
  const d = document.createElement('div'); d.className = 'ai-msg';
  d.innerHTML = `<div class="ai-agent-chip ag-${agent}"><span class="ai-agent-dot"></span>${AGENTS[agent].name}</div><div class="ai-bubble typing">● ● ●</div>`;
  body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
}
function examplesHtml(list) {
  return `<div class="ai-examples">${list.map(x => `<button onclick="askExample('${escAttr(x)}')">${escHtml(x)}</button>`).join('')}</div>`;
}

function sendAiChat() {
  const input = document.getElementById('ai-chat-query');
  const text = (input.value || '').trim();
  if (!text) return;
  aiUserMsg(text); input.value = '';
  const route = routeIntent(text);
  const t = aiTyping(route.agent);
  setTimeout(() => { t.remove(); route.render(); }, 560);
}

// ── Intent 라우팅 (사용자는 Agent를 몰라도 됨) ──
function routeIntent(text) {
  const t = text.replace(/\s/g, '');
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐|초과)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  if (/(오늘|처리|해야|확인할|업무|리스크|브리핑|briefing)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotBriefingHtml()) };
  if (/(찾아|어디|어떻게|화면|이동|바로가기)/.test(t) || /(변경|수정).*(시작|하고싶|할래|할게|화면)/.test(t)) return { agent:'navi', render: () => aiAgentMsg('navi', naviExecHtml()) };
  if (/(왜|늘|줄|증가|감소|차이|비교|원가율|얼마|달라|초과|이유)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
  return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
}

// ── Budget Q — 데이터 분석(숫자/비교/근거) ──
function qOutsourceHtml() {
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag red">결론</span> 8월 외주비가 계획 대비 <b class="up">+18%</b>, <b>4,200만원</b> 증가했습니다.</div>
    <div class="ai-r-cause">주요 원인 · 개발 외주 인력 <b>3명</b>의 투입기간 연장</div>
    <div class="ai-kpis">
      <div><span>계획</span><strong>2.30억</strong></div>
      <div><span>현재 예상</span><strong>2.72억</strong></div>
      <div><span>차이</span><strong class="up">+0.42억 (+18%)</strong></div>
    </div>
    <div class="ai-break">
      <div class="ai-break-row"><span>개발 외주</span><i><em style="width:86%"></em></i><b class="up">+3,600만원</b></div>
      <div class="ai-break-row"><span>기타 외주</span><i><em style="width:14%"></em></i><b class="up">+600만원</b></div>
    </div>
    <button class="ai-evi-btn" onclick="aiToggleEvidence(this)">🔎 근거 확인</button>
    <div class="ai-evidence" hidden>
      <div class="ai-evi-step"><span>1 · 계산 근거</span>계획 230,000,000 → 현재 예상 272,000,000 → 차이 42,000,000 (+18%)</div>
      <div class="ai-evi-step"><span>2 · 사용 데이터</span>외주 계획 6건 · 실투입 확정 3건 · 승인 실행예산 V3</div>
      <div class="ai-evi-step"><span>3 · 원천 데이터</span>실행예산 / 외주계획 / 실투입 데이터 (MIS 원장)</div>
    </div>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec-outsource')">월별 외주비 보기</button>
      <button class="ai-act" onclick="agentGoto('exec-outsource')">변경내역 보기</button>
      <button class="ai-act pri" onclick="agentHandoffPilot()">실행예산 영향 분석 →</button>
    </div>
  </div>`;
}
function qGenericHtml(text) {
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ink">분석</span> "${escHtml(text)}" 에 대한 데이터를 조회했어요.</div>
    <div class="ai-r-cause">관련 지표: 계획 대비 실적, 계정별 차이, 원가율 추이를 함께 볼 수 있습니다.</div>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec')">실행예산에서 보기</button>
      <button class="ai-act pri" onclick="agentHandoffPilot()">이 수치의 영향 분석 →</button>
    </div>
  </div>`;
}

// ── Handoff: Q → Pilot (영향/권장) ──
function agentHandoffPilot() {
  const t = aiTyping('pilot');
  setTimeout(() => { t.remove(); aiAgentMsg('pilot', pilotRecoHtml()); }, 620);
}
function pilotRecoHtml() {
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag amber">영향 분석</span> 현재 추세가 유지되면 프로젝트 <b class="up">예상원가율 +1.7%p</b> 상승이 예상됩니다.</div>
    <p class="ai-r-note">정산 진입 전 <b>실행예산 변경 검토</b>를 권장합니다.</p>
    <div class="ai-actions">
      <button class="ai-act pri" onclick="agentHandoffNavi()">실행예산 변경 검토 →</button>
    </div>
  </div>`;
}

// ── Handoff: Pilot → Navi (업무 안내/실행) ──
function agentHandoffNavi() {
  const t = aiTyping('navi');
  setTimeout(() => { t.remove(); aiAgentMsg('navi', naviExecHtml()); }, 620);
}
function naviExecHtml() {
  return `<div class="ai-result">
    <div class="ai-r-lead">SKON 통합 관제 플랫폼의 <b>외주 실행예산 변경</b> 화면으로 안내할게요.</div>
    <div class="ai-navi-meta">
      <div><span>현재 승인 실행예산</span><strong>12.4억</strong></div>
      <div><span>최근 변경</span><strong>2026.07.28</strong></div>
    </div>
    <div class="ai-steps"><span class="on">1 계정 선택</span><i>→</i><span>2 변경 입력</span><i>→</i><span>3 결재 상신</span></div>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec')">변경 절차 보기</button>
      <button class="ai-act pri" onclick="agentGoto('exec-outsource')">실행예산 변경 시작</button>
    </div>
  </div>`;
}

// ── 채팅 헤더 아바타(agent별 아이콘) ──
const CHAT_AVATAR_ROBOT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="8" width="16" height="12" rx="3.2"/><path d="M12 4.4V8"/>
  <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
  <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
  <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>`;
const CHAT_AVATAR_COMPASS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="#2f6bed" stroke="none"/></svg>`;
function setChatAvatar(entry) {
  const el = document.querySelector('#ai-chat-overlay .ai-chat-avatar');
  if (el) el.innerHTML = (entry === 'navi') ? CHAT_AVATAR_COMPASS : CHAT_AVATAR_ROBOT;
}

// ── Budget Navi — 예산편성 진행 가이드 ("지금 어디까지 / 다음 뭘") ──
const NAVI_STEPS = [
  { t:'프로젝트 예산 기준 확인', s:'done',   d:'CP총액과 계정별 배정 예산을 먼저 확인해요. 여기서 벗어나는 편성은 승인 단계에서 반려돼요.' },
  { t:'인건비 계획 입력',        s:'done',   d:'투입 인력과 기간(MM)을 등록해요. SCM에서 확정된 인력은 자동으로 넘어오고, 나머지는 직접 추가하면 돼요.' },
  { t:'외주비 계약 등록',        s:'done',   d:'업체·계약금액·검수 일정을 등록해요. 금액이 크면 분기 단위로 나눠 편성하는 편이 승인받기 쉬워요.' },
  { t:'재료비·경비 반영',        s:'done',   d:'장비·라이선스 구매와 여비·회의비 같은 경비를 채워요. 문장으로 맡기면 Pilot이 대신 채워줘요.' },
  { t:'검토 후 승인 요청',        s:'active', d:'4개 계정이 모두 채워지면 새 버전으로 고정하고 승인을 요청해요. 승인 후에는 변경 이력이 버전으로 남아요.' },
];
function naviGuideHtml() {
  const doneN = NAVI_STEPS.filter(x => x.s === 'done').length;
  const histBtn = `<button class="navi-btn" onclick="closeAiChat(); openCostHistory('budgetMock')">버전 이력 확인</button>`;
  const active = NAVI_STEPS.find(x => x.s === 'active');
  const rows = NAVI_STEPS.map((x, i) => {
    const badge = x.s === 'done' ? '<span class="navi-badge done">완료</span>'
                : x.s === 'active' ? '<span class="navi-badge active">진행 중</span>' : '';
    const ic = x.s === 'done' ? '<span class="navi-ic done">✓</span>'
             : x.s === 'active' ? `<span class="navi-ic active">${i + 1}</span>`
             : `<span class="navi-ic">${i + 1}</span>`;
    const cta = x.s === 'active' ? `<div class="navi-step-cta">${histBtn}</div>` : '';
    return `<div class="navi-step ${x.s}">${ic}
      <div class="navi-step-main">
        <div class="navi-step-h"><b>${x.t}</b>${badge}</div>
        <div class="navi-step-d">${x.d}</div>${cta}
      </div>
    </div>`;
  }).join('');
  return `<div class="navi-guide">
    <div class="navi-next">
      <div class="navi-next-l">다음 할 일 · ${active ? active.t : ''}</div>
      <div class="navi-next-d">${active ? active.d : ''}</div>
      ${histBtn}
    </div>
    <div class="navi-steps-t">예산편성 <b>5단계</b> <em>${doneN}/5 완료</em></div>
    <div class="navi-steps">${rows}</div>
  </div>`;
}

// ── Budget Pilot — 선제 브리핑 + Alert 상세 ──
function pilotBriefingHtml() {
  const items = (typeof HOME_FEED !== 'undefined') ? HOME_FEED : [];
  const urgent = items.filter(i => i.sev === 'danger').length;
  const soft = items.length - urgent;
  const rows = items.map((it, i) => `
    <button class="ai-brief-item" onclick="pilotAlert(${i})">
      <span class="ai-brief-dot ${it.sev}"></span>
      <span class="ai-brief-tt">${escHtml(it.title)}</span>
      <span class="ai-brief-proj">${escHtml(homeProjName(it.proj))}</span>
      <span class="ai-brief-arrow">›</span>
    </button>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ink">오늘의 Project Briefing</span></div>
    <div class="ai-brief-sum"><b class="red">긴급 ${urgent}건</b> · <b class="amber">권장·확인 ${soft}건</b></div>
    ${rows}
  </div>`;
}
function pilotAlert(i) {
  const it = HOME_FEED[i];
  if (it) aiAgentMsg('pilot', pilotAlertHtml(it));
}
function pilotAlertHtml(it) {
  const tag = it.sub || it.tag || '점검';
  const cause = it.note || (it.impact ? it.impact.label + ' ' + it.impact.value : '') || (it.flow ? it.flow.iL + ' ' + it.flow.iVal : '');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ${it.sev === 'danger' ? 'red' : it.sev === 'warning' ? 'amber' : 'ink'}">${escHtml(tag)}</span> ${escHtml(it.title)}</div>
    <div class="ai-r-cause">${escHtml(homeProjName(it.proj))}${cause ? ' · ' + escHtml(cause) : ''}</div>
    <button class="ai-evi-btn" onclick="aiToggleEvidence(this)">🔎 근거 확인</button>
    <div class="ai-evidence" hidden>
      <div class="ai-evi-step"><span>1 · 계산 근거</span>수행원가 계획/실적/계약 데이터 대사</div>
      <div class="ai-evi-step"><span>2 · 사용 데이터</span>수행원가 V4 · 계약 마스터 · SCM/ERP 확정</div>
      <div class="ai-evi-step"><span>3 · 원천 데이터</span>MIS 원장</div>
    </div>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec-outsource')">원가 상세</button>
      <button class="ai-act pri" onclick="agentHandoffNavi()">수행원가 검토 →</button>
    </div>
  </div>`;
}

// 메인 "확인이 필요한 것" 항목 → Pilot 상세로 연결
function openPilotForInsight(i) {
  document.getElementById('ai-chat-title').textContent = 'AI 어시스턴트';
  document.getElementById('ai-chat-sub').textContent = 'New MIS · Budget Pilot 분석';
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');
  if (typeof HOME_FEED !== 'undefined' && HOME_FEED[i]) aiAgentMsg('pilot', pilotAlertHtml(HOME_FEED[i]));
}

// ── 근거 Drill-down 토글 ──
function aiToggleEvidence(btn) {
  const sib = btn.nextElementSibling;
  const evi = (sib && sib.classList.contains('ai-evidence')) ? sib : btn.parentElement.querySelector('.ai-evidence');
  if (!evi) return;
  const show = evi.hasAttribute('hidden');
  if (show) { evi.removeAttribute('hidden'); btn.classList.add('on'); }
  else { evi.setAttribute('hidden', ''); btn.classList.remove('on'); }
}

// ── 앱 화면으로 이동(Navi 실행) ──
function agentGoto(dest) {
  closeAiChat();
  if (dest === 'exec' || dest === 'exec-outsource') {
    if (typeof showBudget === 'function') showBudget();
    if (typeof openBudgetProjectScreen === 'function') openBudgetProjectScreen('budgetMock');
    if (typeof goBudgetSetupStage === 'function') goBudgetSetupStage('edit');
    if (dest === 'exec-outsource' && typeof openBudgetAccountEditor === 'function') openBudgetAccountEditor('외주비');
  }
}

// 메인 검색 focus 시 예시 프롬프트 노출
function showHomeExamples(show) {
  const el = document.getElementById('home-search-ex');
  if (el) el.toggleAttribute('hidden', !show);
}

// ── 토스트 ──
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── 숫자 포맷 ──
function fmt(n) {
  if (!n) return '0';
  return n.toLocaleString('ko-KR');
}

// ── 초기화 ──
// app.js가 가장 먼저 로드되지만, 아래 init은 다른 화면 스크립트(dashboard/budget-status 등)의
// 정의를 필요로 한다. DOMContentLoaded 시점에는 모든 동기 스크립트가 실행 완료되므로,
// 그때 초기화해 로드 순서/지연에 관계없이 안전하게 만든다.
function bootstrapApp() {
  (async function init() {
    await loadRisks();
    initDashboard();
    initRiskHistory();
    initBudgetStatus();
    initMonthlyClose();
    routeInitial();
  })();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}

// ============================================================
//  AI Agent 4차 — 에이전트별 특성 강화 (프롬프트 · 답변 구체화)
//  ※ 공유 파일이므로 위 원본은 수정하지 않고 여기서 override 한다.
//    (프로젝트 규칙: 뒤에 로드/정의된 코드가 앞을 override)
//  - Budget Navi  : 길안내 — 어디서 · 어떤 순서로 · 무엇을 준비해서
//  - Budget Q     : 데이터 분석 — 숫자 · 원인 · 근거
//  - Budget Pilot : AI PM — 선제 제안 · 영향 분석 · 위임 등급 · What-if
// ============================================================

Object.assign(AGENTS.navi,  { desc:'화면과 절차를 찾아드려요', ex2:['원가 조정 어디서 해?', '변경 이력 화면 찾아줘', '실행예산 승인 절차 알려줘'] });
Object.assign(AGENTS.q,     { desc:'숫자의 이유를 근거와 함께 설명해요', ex2:['SKON 외주비 왜 늘었어?', '원가율 높은 프로젝트 알려줘', '인건비 계획 대비 실적 차이는?'] });
Object.assign(AGENTS.pilot, { desc:'해야 할 일을 먼저 제시해요', ex2:['오늘 확인할 업무 알려줘', 'AI가 자동 처리한 내역 보여줘', '개발자 2명 더 투입하면 어떻게 돼?'] });

// ── Intent 라우팅 강화 — 에이전트 특성이 드러나도록 세분화 ──
function routeIntent(text) {
  const t = text.replace(/\s/g, '');

  // Pilot — What-if 가정 시뮬레이션
  if (/(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotWhatIfHtml(text)) };
  // Pilot — 자동 처리 내역
  if (/(자동|자동반영|자동처리|AI가처리|알아서)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotAutoHtml()) };
  // Pilot — 위임 등급 / 신뢰도
  if (/(위임|자동조종|등급|얼마나믿|신뢰|정확)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotTrustHtml()) };
  // Pilot — 오늘 브리핑
  if (/(오늘|처리|해야|확인할|업무|리스크|브리핑|briefing)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotBriefingHtml()) };

  // Q — 외주비 증가 원인 (기존 상세 분석 유지)
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐|초과)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  // Q — 원가율 조회
  if (/원가율/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qCostRateHtml()) };
  // Q — 계획 대비 실적 비교
  if (/(계획대비|실적|차이|비교|대비)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qComparePlanHtml()) };

  // Navi — 화면/절차 길안내
  if (/(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴)/.test(t) || /(변경|수정).*(시작|하고싶|할래|할게|화면)/.test(t)) {
    return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };
  }

  if (/(왜|늘|줄|증가|감소|얼마|달라|초과|이유)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
  return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
}

// ── 에이전트 소개 헤더 (특성 부각) ──
function agentIntroHtml(k) {
  const a = AGENTS[k];
  return `<div class="ai-intro ag-${k}">
      <div class="ai-intro-h"><b>${a.name}</b><span>${a.role}</span></div>
      <div class="ai-intro-d">${a.desc}</div>
    </div>` + examplesHtml(a.ex2);
}

// ── 진입 시 에이전트별 인사 — 특성이 드러나게 ──
function openAiChat(entry, initialQuery) {
  document.getElementById('ai-chat-title').textContent = 'AI 어시스턴트';
  document.getElementById('ai-chat-sub').textContent = 'New MIS · 묻고 → 분석하고 → 실행까지';
  setChatAvatar(entry);
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');

  if (entry === 'pilot') {
    document.getElementById('ai-chat-title').textContent = 'Budget Pilot';
    document.getElementById('ai-chat-sub').textContent = 'AI가 처리한 결과에서 해야 할 일을 먼저 제시해요';
    aiAgentMsg('pilot', agentIntroHtml('pilot'));
    aiAgentMsg('pilot', pilotBriefingHtml());
  } else if (entry === 'navi') {
    document.getElementById('ai-chat-title').textContent = 'Budget Navi';
    document.getElementById('ai-chat-sub').textContent = '지금 어디까지 했고, 다음에 뭘 하면 되는지 안내해요';
    aiAgentMsg('navi', agentIntroHtml('navi'));
    aiAgentMsg('navi', naviGuideHtml());
  } else if (entry === 'q') {
    document.getElementById('ai-chat-title').textContent = 'Budget Q';
    document.getElementById('ai-chat-sub').textContent = '숫자의 의미와 원인을 근거와 함께 설명해요';
    aiAgentMsg('q', agentIntroHtml('q'));
  } else {
    aiAgentMsg('ai', '무엇을 도와드릴까요? 프로젝트를 <b>찾거나</b>, 숫자의 <b>이유를 묻거나</b>, 다음 <b>업무를 요청</b>해보세요.'
      + examplesHtml(['SKON 외주비가 왜 늘었어?', '원가 조정 어디서 해?', '오늘 확인할 업무 알려줘', '개발자 2명 더 투입하면?']));
  }
  const input = document.getElementById('ai-chat-query');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  if (initialQuery) { input.value = initialQuery; sendAiChat(); }
}

// ── Budget Q — 원가율 조회 ──
function qCostRateHtml() {
  const rows = [
    ['SKON 통합 관제 플랫폼', '88.3%', 'up',   '계약 30.8억 · 수행원가 27.2억'],
    ['차세대 물류 실행계',    '78.9%', 'flat', '계약 21.4억 · 수행원가 16.9억'],
    ['SKON 데이터 마이그레이션', '84.2%', 'up', '계약 32.3억 · 수행원가 27.2억'],
  ].map(r => `<div class="ai-rank-row">
      <span class="ai-rank-n">${r[0]}</span>
      <b class="ai-rank-v ${r[1] >= '85' ? 'up' : ''}">${r[1]}</b>
      <span class="ai-rank-d">${r[3]}</span>
    </div>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag red">결론</span> 원가율 <b>85% 초과</b> 프로젝트가 <b class="up">1건</b> 있습니다.</div>
    <div class="ai-r-cause">사업부 관리 기준선 85% · 초과 시 손익 조기경보 대상</div>
    ${rows}
    <button class="ai-evi-btn" onclick="aiToggleEvidence(this)">🔎 근거 확인</button>
    <div class="ai-evidence" hidden>
      <div class="ai-evi-step"><span>1 · 계산 근거</span>원가율 = 수행원가 ÷ 계약금액 (계약변경 반영 후 기준)</div>
      <div class="ai-evi-step"><span>2 · 사용 데이터</span>수행원가 V5 · 계약 마스터(CRM 확정) · ERP 확정 실적</div>
      <div class="ai-evi-step"><span>3 · 데이터 등급</span>D · 확정 — 후행 BIX 전송 가능</div>
    </div>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec')">원가 현황 보기</button>
      <button class="ai-act pri" onclick="agentHandoffPilot()">손익 영향 분석 →</button>
    </div>
  </div>`;
}

// ── Budget Q — 계획 대비 실적 ──
function qComparePlanHtml() {
  const rows = [
    ['인건비',  '9.20억', '9.05억', '-1,500만원', 'down'],
    ['외주비',  '2.30억', '2.72억', '+4,200만원', 'up'],
    ['재료비',  '1.40억', '1.38억', '-200만원',   'down'],
    ['경비',    '0.32억', '0.40억', '+840만원',   'up'],
  ].map(r => `<div class="ai-break-row2">
      <span>${r[0]}</span><i>${r[1]}</i><em>→</em><i>${r[2]}</i><b class="${r[4]}">${r[3]}</b>
    </div>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag amber">분석</span> 계정 4개 중 <b class="up">2개</b>가 계획을 초과했습니다.</div>
    <div class="ai-r-cause">초과 합계 <b class="up">+5,040만원</b> · 절감 합계 <b class="down">-1,700만원</b> · 순증 <b class="up">+3,340만원</b></div>
    ${rows}
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec')">계정별 상세</button>
      <button class="ai-act pri" onclick="agentHandoffPilot()">이 차이의 영향 분석 →</button>
    </div>
  </div>`;
}

// ── Budget Navi — 화면 길안내 (경로 · 준비물 · 소요) ──
const NAVI_ROUTES = [
  { k:/(원가조정|조정|변경입력)/, t:'수행원가 조정', path:['수행원가', '원가조정'], go:'exec-outsource',
    need:'변경 사유 · 근거 자료(계약서·확정 인력)', min:'약 5분', note:'승인된 예산은 조정 시 새 버전(Draft)으로 남고, 확정 전까지 ERP에 전송되지 않아요.' },
  { k:/(이력|버전|히스토리|변경내역)/, t:'변경 이력 확인', path:['수행원가', '변경 이력'], go:'exec',
    need:'없음', min:'약 1분', note:'버전별 변경 전/후와 승인자를 함께 볼 수 있어요.' },
  { k:/(현황|조회|얼마)/, t:'원가 현황 조회', path:['수행원가', '원가현황'], go:'exec',
    need:'없음', min:'약 2분', note:'계정별 계획·실적·잔여를 한 화면에서 봐요.' },
  { k:/(레포트|보고서|리포트)/, t:'맞춤 레포트 작성', path:['인사이트', '맞춤 레포트'], go:'exec',
    need:'보고 대상·기간', min:'약 3분', note:'필요한 항목만 골라 보고서 형태로 뽑을 수 있어요.' },
];
function naviRouteHtml(text) {
  const t = String(text).replace(/\s/g, '');
  const r = NAVI_ROUTES.find(x => x.k.test(t)) || NAVI_ROUTES[0];
  const crumb = r.path.map((p, i) => `<span class="ai-nav-crumb${i === r.path.length - 1 ? ' on' : ''}">${p}</span>`).join('<i>›</i>');
  return `<div class="ai-result">
    <div class="ai-r-lead"><b>${r.t}</b> 화면으로 안내할게요.</div>
    <div class="ai-nav-path">${crumb}</div>
    <div class="ai-navi-meta">
      <div><span>준비할 것</span><strong>${r.need}</strong></div>
      <div><span>예상 소요</span><strong>${r.min}</strong></div>
    </div>
    <p class="ai-r-note">${r.note}</p>
    <div class="ai-steps"><span class="on">1 화면 이동</span><i>→</i><span>2 내용 입력</span><i>→</i><span>3 저장·상신</span></div>
    <div class="ai-actions">
      <button class="ai-act" onclick="closeAiChat(); openCostHistory('budgetMock')">버전 이력 확인</button>
      <button class="ai-act pri" onclick="agentGoto('${r.go}')">${r.t} 시작</button>
    </div>
  </div>`;
}

// ── Budget Pilot — 오늘 브리핑 (자동 처리 결과와 연결) ──
function pilotBriefingHtml() {
  const items = (typeof HOME_FEED !== 'undefined') ? HOME_FEED : [];
  const open = (typeof homeOpenCount === 'function') ? homeOpenCount() : items.length;
  const auto = (typeof HOME_AUTO_COUNT !== 'undefined') ? HOME_AUTO_COUNT : 12;
  const total = (typeof HOME_EVENT_TOTAL !== 'undefined') ? HOME_EVENT_TOTAL : auto + open;
  const urgent = items.filter(i => i.sev === 'danger').length;
  const rows = items.map((it, i) => {
    const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
    return `<button class="ai-brief-item" onclick="pilotAlert(${i})">
      <span class="ai-brief-dot ${it.sev}"></span>
      <span class="ai-brief-tt">${escHtml(it.title)}</span>
      ${ai ? `<span class="ai-brief-imp">${escHtml(ai.impact)}</span><span class="ai-brief-due">D-${ai.dueDays}</span>` : ''}
      <span class="ai-brief-arrow">›</span>
    </button>`;
  }).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ink">오늘의 Project Briefing</span></div>
    <div class="ai-r-cause">선행 시스템 이벤트 <b>${total}건</b> 중 <b>${auto}건</b>은 AI가 자동 반영했고, <b>${open}건</b>만 확인이 필요해요.</div>
    <div class="ai-brief-sum"><b class="red">긴급 ${urgent}건</b> · <b class="amber">권장·확인 ${Math.max(0, items.length - urgent)}건</b></div>
    ${rows}
    <div class="ai-actions">
      <button class="ai-act" onclick="aiAgentMsg('pilot', pilotAutoHtml())">자동 처리 내역</button>
      <button class="ai-act" onclick="aiAgentMsg('pilot', pilotTrustHtml())">위임 등급 보기</button>
    </div>
  </div>`;
}

// ── Budget Pilot — 자동 처리 내역 ──
function pilotAutoHtml() {
  const log = (typeof HOME_AUTO_LOG !== 'undefined') ? HOME_AUTO_LOG : [];
  const auto = (typeof HOME_AUTO_COUNT !== 'undefined') ? HOME_AUTO_COUNT : 12;
  const per = (typeof HOME_AUTO_MIN_PER !== 'undefined') ? HOME_AUTO_MIN_PER : 8;
  const saved = auto * per;
  const rows = log.map(a => `<div class="ai-evi-step"><span>${a.time} · ${escHtml(a.sys)}</span>${escHtml(a.title)} — ${escHtml(a.desc)}</div>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ink">자동 처리</span> 오늘 <b>${auto}건</b>을 사람 확인 없이 반영했어요.</div>
    <div class="ai-r-cause">원천 IF가 확정(D)이거나 계정 총액이 변하지 않는 규칙기반(R) 건이 대상이에요 · 절약 약 ${Math.floor(saved / 60)}시간 ${saved % 60}분</div>
    ${rows}
    <div class="ai-actions">
      <button class="ai-act pri" onclick="closeAiChat(); if(typeof openAutoDrawer==='function') openAutoDrawer()">전체 내역 열기 →</button>
    </div>
  </div>`;
}

// ── Budget Pilot — 위임 등급 (검증된 만큼만 자동화) ──
const PILOT_TRUST = [
  { n:'인건비',   g:'AUTO',   c:'ok',   p:'95.8', s:'24', e:'2.1' },
  { n:'외주비',   g:'AUTO',   c:'ok',   p:'91.2', s:'18', e:'4.4' },
  { n:'재료비',   g:'REVIEW', c:'warn', p:'74.0', s:'12', e:'18.6' },
  { n:'경비',     g:'AUTO',   c:'ok',   p:'96.4', s:'31', e:'1.2' },
  { n:'A/S Cost', g:'MANUAL', c:'mute', p:'—',    s:'2',  e:'—' },
];
function pilotTrustHtml() {
  const rows = PILOT_TRUST.map(t => `<div class="ai-trust-row">
      <span class="ai-trust-n">${t.n}</span>
      <span class="ai-trust-g ${t.c}">${t.g}</span>
      <span class="ai-trust-p">무수정 채택률 <b>${t.p}${t.p === '—' ? '' : '%'}</b> · 표본 ${t.s}건 · 평균 수정폭 ${t.e}${t.e === '—' ? '' : '%'}</span>
    </div>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag ink">위임 등급</span> AI를 무조건 믿지 않고 <b>검증된 만큼만</b> 위임합니다.</div>
    <div class="ai-r-cause">AUTO 3계정 · REVIEW 1계정 · MANUAL 1계정 — 채택률은 확인 큐에서 [반영]/[수정]/[보류]를 누르는 순간 자동 기록돼요.</div>
    ${rows}
    <p class="ai-r-note">2026-06 재료비 <b>AUTO → REVIEW</b> (3개월 연속 수정률 30% 초과) · 2026-05 경비 <b>REVIEW → AUTO</b> (채택률 90% 이상)</p>
  </div>`;
}

// ── Budget Pilot — What-if 시뮬레이션 ──
function pilotWhatIfHtml(text) {
  const t = String(text).replace(/\s/g, '');
  let head = '개발자 2명 · 3~6월 추가 투입', rows, note;
  if (/외주/.test(t)) {
    head = '외주비 2,000만원 → AI 예비비 대체';
    rows = [['외주비', '2.72억', '2.52억', '-2,000만원', 'down'], ['AI 예비비', '3,200만원', '5,200만원', '+2,000만원', 'up'], ['계정 총액', '변동 없음', '변동 없음', '-', '']];
    note = '계정 총액이 변하지 않아 자가전결 가능합니다.';
  } else if (/줄이|철수|감축/.test(t)) {
    head = '인력 2명 조기 철수';
    rows = [['인건비', '9.20억', '8.84억', '-3,600만원', 'down'], ['예산 여력(인건비)', '32%', '36%', '+4%p', 'down'], ['일정 리스크', '보통', '높음', '주의', 'up']];
    note = '원가는 개선되지만 일정 지연 리스크가 올라갑니다.';
  } else {
    rows = [['인건비', '9.20억', '9.88억', '+6,800만원', 'up'], ['예산 여력(인건비)', '32%', '24%', '-8%p', 'up'], ['예상 원가율', '88.3%', '90.5%', '+2.2%p', 'up']];
    note = 'CP 한도 내이며 자가전결 가능합니다. 다만 원가율이 관리 기준선 85%를 넘습니다.';
  }
  const body = rows.map(r => `<div class="ai-break-row2"><span>${r[0]}</span><i>${r[1]}</i><em>→</em><i>${r[2]}</i><b class="${r[4]}">${r[3]}</b></div>`).join('');
  return `<div class="ai-result">
    <div class="ai-r-lead"><span class="ai-r-tag amber">가정 시뮬레이션</span> ${head}</div>
    <div class="ai-r-cause">확정 전까지 <b>실제 예산에 반영되지 않고</b> ERP로도 전송되지 않아요.</div>
    ${body}
    <p class="ai-r-note">${note}</p>
    <div class="ai-actions">
      <button class="ai-act" onclick="agentGoto('exec')">실행예산에서 검토</button>
      <button class="ai-act pri" onclick="agentHandoffNavi()">변경 절차로 이동 →</button>
    </div>
  </div>`;
}

// ============================================================
//  6차-2 — 우측 고정 채팅 패널 + 메인 복귀
//  ※ 공유 파일(app.js)의 기존 줄은 건드리지 않고 여기서 override 한다.
//
//  · 메인 chatbot으로 상세 화면에 진입하면 대화창이 닫히지 않고
//    우측 레일로 "도킹"되어 같은 대화를 이어갈 수 있다.
//  · 메인(s-main)으로 복귀하면 우측 레일은 자동으로 사라진다.
//  · 도킹 상태에서는 헤더에 "메인으로" 버튼을 넣어 복귀 동선을 만든다.
//    (상단 GNB 메뉴가 숨겨져 있어 로고 클릭과 함께 유일한 버튼 동선)
// ============================================================

function dockAiChat() {
  const ov = document.getElementById('ai-chat-overlay');
  if (!ov) return;
  ov.classList.add('open', 'docked');
  document.body.classList.add('chat-docked');
  const head = ov.querySelector('.ai-chat-head');
  if (head && !head.querySelector('.ai-chat-home')) {
    const b = document.createElement('button');
    b.className = 'ai-chat-home';
    b.type = 'button';
    b.textContent = '‹ 메인으로';
    b.setAttribute('aria-label', '메인 화면으로 돌아가기');
    b.onclick = function () { if (typeof showMain === 'function') showMain(); };
    head.insertBefore(b, head.querySelector('.ai-chat-close'));
  }
  const inp = document.getElementById('ai-chat-query');
  if (inp) setTimeout(() => inp.focus(), 60);
}

function undockAiChat() {
  const ov = document.getElementById('ai-chat-overlay');
  document.body.classList.remove('chat-docked');
  if (!ov) return;
  ov.classList.remove('docked');
  const b = ov.querySelector('.ai-chat-home');
  if (b) b.remove();
}

// 닫기는 도킹 해제까지 함께
function closeAiChat() {
  const ov = document.getElementById('ai-chat-overlay');
  if (ov) ov.classList.remove('open');
  undockAiChat();
}

// 채팅에서 화면으로 이동 — 대화를 닫지 않고 우측 레일로 유지
function agentGoto(dest) {
  if (dest === 'exec' || dest === 'exec-outsource') {
    if (typeof showBudget === 'function') showBudget();
    if (typeof openBudgetProjectScreen === 'function') openBudgetProjectScreen('budgetMock');
    if (typeof goBudgetSetupStage === 'function') goBudgetSetupStage('edit');
    if (dest === 'exec-outsource' && typeof openBudgetAccountEditor === 'function') openBudgetAccountEditor('외주비');
  }
  dockAiChat();
}

// Navi 길안내의 "버전 이력 확인"도 대화를 유지한 채 이동
function chatGotoHistory() {
  if (typeof openCostHistory === 'function') openCostHistory('budgetMock');
  dockAiChat();
}

// 메인 복귀 감지 — s-main이 활성화되면 우측 레일을 자동으로 걷는다.
// 공유 함수 setScreen을 덮지 않고 클래스 변화만 관찰한다.
(function watchMainScreen() {
  function bind() {
    const main = document.getElementById('s-main');
    if (!main) { setTimeout(bind, 300); return; }
    new MutationObserver(function () {
      if (main.classList.contains('active') && document.body.classList.contains('chat-docked')) closeAiChat();
    }).observe(main, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── Intent 라우팅 — 메인 복귀 의도를 앞단에 추가 (4차 라우팅 규칙 유지) ──
function routeIntent(text) {
  const t = text.replace(/\s/g, '');

  // 메인 복귀 (대화로도 복귀 가능해야 함)
  if (/(메인|홈|처음|첫화면|대시보드)/.test(t) && /(가|이동|보여|복귀|돌아|줘)/.test(t)) {
    return { agent:'navi', render: () => {
      aiAgentMsg('navi', '<div class="ai-result"><div class="ai-r-lead">메인 화면으로 이동합니다.</div></div>');
      setTimeout(function () { if (typeof showMain === 'function') showMain(); }, 450);
    } };
  }

  // Pilot — What-if 가정 시뮬레이션
  if (/(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotWhatIfHtml(text)) };
  // Pilot — 자동 처리 내역
  if (/(자동|자동반영|자동처리|AI가처리|알아서)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotAutoHtml()) };
  // Pilot — 위임 등급 / 신뢰도
  if (/(위임|자동조종|등급|얼마나믿|신뢰|정확)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotTrustHtml()) };
  // Pilot — 오늘 브리핑
  if (/(오늘|처리|해야|확인할|업무|리스크|브리핑|briefing)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotBriefingHtml()) };

  // Q — 외주비 증가 원인
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐|초과)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  // Q — 원가율
  if (/원가율/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qCostRateHtml()) };
  // Q — 계획 대비 실적
  if (/(계획대비|실적|차이|비교|대비)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qComparePlanHtml()) };

  // Navi — 화면/절차 길안내
  if (/(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴)/.test(t) || /(변경|수정).*(시작|하고싶|할래|할게|화면)/.test(t)) {
    return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };
  }

  if (/(왜|늘|줄|증가|감소|얼마|달라|초과|이유)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
  return { agent:'q', render: () => aiAgentMsg('q', qGenericHtml(text)) };
}

// ============================================================
//  7차 — PJT 문맥 대화 · 이슈 팝업 트리거 · 실제 LLM 응답
//  ※ 공유 파일 app.js의 기존 줄은 건드리지 않고 파일 끝 override.
//
//  라우팅 우선순위
//   ① 메인 복귀  ② 이슈·확인사항 → 팝업  ③ Pilot(가정/자동/위임/브리핑)
//   ④ Q(원가율/외주비/비교)  ⑤ Navi(화면·절차)  ⑥ 그 외 → 서버 경유 LLM
// ============================================================

// 선택된 PJT를 대화 문맥으로 넘긴다 (숫자 근거를 함께 보내 LLM이 추측하지 않게 함)
function chatPjtContext() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  const name = (id && id !== 'all' && typeof homeProjName === 'function') ? homeProjName(id) : null;
  const ctx = { project: name };
  try {
    if (typeof homeFinOf === 'function') {
      const f = homeFinOf(id);
      ctx.finance = {
        cp: +f.cp.toFixed(2), plan: +f.plan.toFixed(2),
        act: +f.act.toFixed(2), left: +f.left.toFixed(2),
        rate: +f.rate.toFixed(1), mgap: +f.mgap.toFixed(3),
        accounts: f.acc.filter(a => a.plan > 0).map(a => ({
          name: a.name, plan: +a.plan.toFixed(2), act: +a.act.toFixed(2),
          left: +a.left.toFixed(2), pct: +a.pct.toFixed(1),
        })),
      };
    }
    if (typeof HOME_FEED !== 'undefined') {
      ctx.todos = HOME_FEED
        .filter(i => (id === 'all' || i.proj === id) && !homeFeedState[feedKey(i)])
        .map(i => i.title);
    }
  } catch (e) { /* 문맥 없이도 답변은 가능하다 */ }
  return ctx;
}

// 이슈·확인사항 질의 → 팝업으로 보여주고 하단 버튼으로 화면 이동
function chatOpenPjtIssues() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  if (id === 'all' || typeof openHomePjtModal !== 'function') {
    aiAgentMsg('pilot', pilotBriefingHtml());
    return;
  }
  const n = (typeof homeOpenCountOf === 'function') ? homeOpenCountOf(id) : 0;
  aiAgentMsg('pilot', `<div class="ai-result">
      <div class="ai-r-lead"><span class="ai-r-tag ink">확인 항목</span> ${escHtml(homeProjName(id))} · <b>${n}건</b>을 띄웠어요.</div>
      <div class="ai-r-cause">팝업 하단 버튼으로 원가 현황 · 원가 조정 화면으로 바로 이동할 수 있어요.</div>
    </div>`);
  setTimeout(function () { openHomePjtModal(id); }, 320);
}

// ── 서버 경유 LLM 응답 (키가 없으면 서버가 규칙 기반으로 폴백) ──
function llmAnswerHtml(j, fallbackText) {
  const src = j && j.source === 'ai'
    ? '<span class="ai-r-tag ink">AI 답변</span>'
    : '<span class="ai-r-tag amber">규칙 기반 답변</span>';
  const note = (j && j.source !== 'ai')
    ? '<p class="ai-r-note">LLM 키가 설정되지 않아 서버의 규칙 기반 요약으로 답했어요.</p>'
    : '';
  const body = (j && j.answer) ? escHtml(j.answer).replace(/\n/g, '<br>') : escHtml(fallbackText || '답변을 만들지 못했어요.');
  return `<div class="ai-result">
      <div class="ai-r-lead">${src}</div>
      <div class="ai-llm-body">${body}</div>
      ${note}
      <div class="ai-actions">
        <button class="ai-act" onclick="agentGoto('exec')">수행원가에서 보기</button>
      </div>
    </div>`;
}

function askLLMAnswer(text) {
  const t = aiTyping('q');
  const payload = { question: text, context: chatPjtContext() };
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(function (r) { return r.json(); })
    .then(function (j) { t.remove(); aiAgentMsg('q', llmAnswerHtml(j, null)); })
    .catch(function () { t.remove(); aiAgentMsg('q', qGenericHtml(text)); });
}

// ── 채팅 네비게이터: 자연어 → 화면 딥링크 이동 ──
// 이동 가능한 화면 목록(설명 포함) — LLM이 이 중에서 고른다.
const NAV_ROUTES = [
  { key:'insights-overview', label:'인사이트 · 종합 현황', desc:'프로젝트 KPI, 월별 원가 트렌드, AI 인사이트 종합' },
  { key:'insights-progress', label:'인사이트 · 원가 소진율', desc:'원가(Cost)/계획/실적 비교, 소진율·진척, 계정별 원가 vs 계획 vs 실적, 합의 Cost 분해' },
  { key:'insights-version',  label:'인사이트 · 버전별 예산', desc:'실행예산 버전별 계정 배분 변동(예산 돌려쓰기)' },
  { key:'ai-report',         label:'AI 레포트',        desc:'자연어로 물어보면 SQL로 데이터를 조회' },
  { key:'custom-report',     label:'맞춤 레포트',       desc:'필드를 골라 프로젝트/실행예산 데이터 조회' },
  { key:'budget-status',     label:'수행원가 · 원가현황', desc:'프로젝트 수행원가 계획/실적 현황' },
  { key:'budget-adjust',     label:'수행원가 · 원가조정', desc:'인건비/외주비/재료비/경비 계정별 예산 조정' },
  { key:'budget-history',    label:'수행원가 · 변경이력', desc:'실행예산 버전 변경 이력' },
  { key:'si-project',        label:'수주형 프로젝트',    desc:'수주형 프로젝트 목록/상세' },
  { key:'dashboard',         label:'메인 / 홈',         desc:'내 업무 홈 화면' },
];
// 홈 프로젝트 id → 인사이트 프로젝트 id (이름이 달라 수동 매핑, 없으면 인사이트 기본 프로젝트)
const HOME_TO_INS = { skon:'pj7f3a9c', logi:'pj2b8e14', migr:'pj9c4d7a', erp:'pj61e2d8' };
function homeSelInsightsId() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  return HOME_TO_INS[id] || null;
}
// 홈 프로젝트 id → 수행원가 프로젝트 키 (원가 데이터가 키별로 있어 매핑, 없으면 목록)
const HOME_TO_BUDGET = { skon:'cloud', logi:'mobile', migr:'erp', erp:'erp', sec:'sec', cloud:'cloud', mob:'mobile', dw:'budgetMock', aidoc:'budgetMock' };
function homeSelBudgetKey() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  return HOME_TO_BUDGET[id] || null;
}
function navGo(key) {
  const insId = homeSelInsightsId();
  const insHash = tab => `#/insights/${tab}${insId ? `?pj=${insId}` : ''}`;
  const bKey = homeSelBudgetKey();
  const budgetHash = base => `#/${base}${bKey ? `?pj=${bKey}` : ''}`;  // 선택 프로젝트 있으면 그 상세로, 없으면 목록
  switch (key) {
    case 'insights-overview': location.hash = insHash('overview'); break;
    case 'insights-progress': location.hash = insHash('progress'); break;
    case 'insights-version':  location.hash = insHash('version');  break;
    case 'ai-report':      if (typeof showAiReport === 'function') showAiReport(); break;
    case 'custom-report':  if (typeof showCustomReport === 'function') showCustomReport(); break;
    case 'budget-status':  location.hash = budgetHash('budget-status');  break;
    case 'budget-adjust':  location.hash = budgetHash('budget-adjust');  break;
    case 'budget-history': location.hash = budgetHash('budget-history'); break;
    case 'si-project':     if (typeof showSIProject === 'function') showSIProject(); break;
    case 'dashboard':      if (typeof showMain === 'function') showMain(); break;
    default: if (typeof showMain === 'function') showMain();
  }
}
// 네비게이터 진입 — 채팅을 열고 화면 목록 카드를 띄운다
function openNavigator() {
  if (typeof openAiChat === 'function') openAiChat('navi');
}
// 칩 클릭으로 바로 이동 (이동 후 채팅은 우측에 도킹 유지)
function naviPick(key) {
  navGo(key);
  if (typeof dockAiChat === 'function') dockAiChat();
}
// 화면 목록 카드 (뭘 갈 수 있는지 힌트 + 칩 클릭 이동)
function naviCardHtml() {
  const selId = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  const projName = (selId && selId !== 'all' && typeof homeProjName === 'function') ? homeProjName(selId) : null;
  const projLine = projName
    ? `<div class="ai-r-cause">현재 <b>${escHtml(projName)}</b> 기준으로 이동해요. (홈 상단에서 프로젝트를 바꾸면 그 프로젝트로 이동)</div>`
    : `<div class="ai-r-cause">홈 상단에서 프로젝트를 먼저 고르면 해당 프로젝트 화면으로 이동해요.</div>`;
  const chips = NAV_ROUTES.map(r => `<button class="navi-chip" onclick="naviPick('${r.key}')"><b>${escHtml(r.label)}</b><span>${escHtml(r.desc)}</span></button>`).join('');
  return `<div class="ai-result">
      <div class="ai-r-lead"><span class="ai-r-tag ink">화면 이동</span> 어디로 갈까요? 아래에서 고르거나 자연어로 말해도 돼요.</div>
      ${projLine}
      <div class="navi-chips">${chips}</div>
      <div class="ai-r-cause" style="margin-top:8px">예) "<b>Cost랑 실적 비교 화면 가고싶어</b>" · "<b>버전별 예산 화면으로 가줘</b>"</div>
    </div>`;
}
// 질문(답변형)에 대해 "관련 화면"으로도 이동 + 우측 도킹 (메시지는 추가하지 않음)
function navToRelevant(text) {
  fetch('/api/navigate', { method:'POST', headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ message: text, routes: NAV_ROUTES.map(r => ({ key:r.key, label:r.label, desc:r.desc })) }) })
    .then(r => r.json())
    .then(j => {
      const route = NAV_ROUTES.find(r => r.key === j.key);
      if (!route) return;
      navGo(route.key);
      if (typeof dockAiChat === 'function') dockAiChat();
    })
    .catch(function () {});
}
function chatNavigate(text) {
  const t = aiTyping('navi');
  fetch('/api/navigate', { method:'POST', headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ message: text, routes: NAV_ROUTES.map(r => ({ key:r.key, label:r.label, desc:r.desc })) }) })
    .then(r => r.json())
    .then(j => {
      t.remove();
      const route = NAV_ROUTES.find(r => r.key === j.key);
      if (!route) { aiAgentMsg('navi', naviRouteHtml(text)); return; }
      const selId = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
      const projName = (selId && selId !== 'all' && typeof homeProjName === 'function') ? homeProjName(selId) : null;
      const projTxt = (projName && /^insights-/.test(route.key)) ? `<b>${escHtml(projName)}</b>의 ` : '';
      const srcTag = j.source === 'ai' ? '<span class="ai-r-tag ink">AI 길안내</span>' : '<span class="ai-r-tag amber">길안내</span>';
      aiAgentMsg('navi', `<div class="ai-result">
          <div class="ai-r-lead">${srcTag} ${projTxt}<b>${escHtml(route.label)}</b> 화면으로 이동할게요.</div>
          ${j.reply ? `<div class="ai-r-cause">${escHtml(j.reply)}</div>` : ''}
          <div class="ai-actions"><button class="ai-act" onclick="navGo('${route.key}')">지금 이동 →</button></div>
        </div>`);
      setTimeout(function () { navGo(route.key); if (typeof dockAiChat === 'function') dockAiChat(); }, 850);
    })
    .catch(function () { t.remove(); aiAgentMsg('navi', naviRouteHtml(text)); });
}

// ── Intent 라우팅 ──
function routeIntent(text) {
  const t = text.replace(/\s/g, '');

  // ① 메인 복귀
  if (/(메인|홈|처음|첫화면|대시보드)/.test(t) && /(가|이동|보여|복귀|돌아|줘)/.test(t)) {
    return { agent:'navi', render: () => {
      aiAgentMsg('navi', '<div class="ai-result"><div class="ai-r-lead">메인 화면으로 이동합니다.</div></div>');
      setTimeout(function () { if (typeof showMain === 'function') showMain(); }, 450);
    } };
  }

  // ①.5 화면 이동(네비게이터) — 선택 프로젝트 + 자연어 → 딥링크 이동
  if (/(가고싶|가고 싶|가줘|데려가|이동하|이동해|이동시|열어줘|화면으로|화면 보여|바로가|네비게|navigate)/.test(t)
      && /(화면|인사이트|레포트|보고서|원가|실적|계획|비교|소진|버전|예산|현황|조정|프로젝트|cost|Cost|COST|SQL|sql)/.test(t)) {
    return { agent:'navi', render: () => chatNavigate(text) };
  }

  // ② 이슈·확인사항 → 팝업
  if (/(이슈|확인할것|확인사항|확인해야|확인필요|해야할|해야하는|처리할|점검할|투두|todo|to-do)/i.test(t)) {
    return { agent:'pilot', render: () => chatOpenPjtIssues() };
  }

  // ③ Pilot
  if (/(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotWhatIfHtml(text)) };
  if (/(자동|자동반영|자동처리|AI가처리|알아서)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotAutoHtml()) };
  if (/(위임|자동조종|등급|얼마나믿|신뢰|정확)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotTrustHtml()) };
  if (/(오늘|브리핑|briefing|리스크)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotBriefingHtml()) };

  // ④ Q — 정해진 분석 화면이 있는 질의
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐|초과)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  if (/원가율/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qCostRateHtml()) };
  if (/(계획대비|실적|차이|비교|대비)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qComparePlanHtml()) };

  // ⑤ Navi — 화면·절차 길안내
  if (/(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴)/.test(t) || /(변경|수정).*(시작|하고싶|할래|할게|화면)/.test(t)) {
    return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };
  }

  // ⑥ 그 외 단순 질의 → 서버 경유 LLM
  return { agent:'q', render: () => askLLMAnswer(text) };
}

// ============================================================
//  8차 — 확인 항목을 AI 어시스턴트 대화 안으로 병합
//  · 별도 팝업을 없애고 대화창 하나에서 여러 질의를 이어간다
//  · 이슈 카드를 누르면 상세(AI 추천 변경안 제외)가 대화에 붙고,
//    그 이슈의 액션 버튼으로 해당 화면으로 넘어간다
// ============================================================

// ── 이슈 목록 (대화 메시지로 렌더) ──
function chatIssueListHtml(id) {
  const all = id === 'all';
  const items = HOME_FEED.filter(i => (all || i.proj === id) && !homeFeedState[feedKey(i)]);
  const who = all ? '담당 전체 프로젝트' : homeProjName(id);
  if (!items.length) {
    return `<div class="ai-result">
        <div class="ai-r-lead"><span class="ai-r-tag ink">확인 항목</span> ${escHtml(who)}</div>
        <div class="ai-r-cause">지금 확인할 항목이 없어요. 정상 범위입니다.</div>
      </div>`;
  }
  const cards = items.map(it => {
    const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
    const sev = it.sev === 'danger' ? 'danger' : it.sev === 'warning' ? 'warning' : 'info';
    return `
      <button class="ai-iss ${sev}" onclick="chatIssueDetail('${escAttr(feedKey(it))}')">
        <span class="ai-iss-top">
          <span class="ai-iss-tag ${sev}">${escHtml(it.cat === 'budget' ? '예산 점검' : '업무 반영')} · ${escHtml(it.sub)}</span>
          ${ai ? `<span class="hm-chip impact ${/^-/.test(ai.impact) ? 'down' : 'up'}">임팩트 ${escHtml(ai.impact)}</span>
                  <span class="hm-chip due ${ai.dueDays <= 3 ? 'near' : ''}">D-${ai.dueDays}</span>` : ''}
          ${all ? `<span class="ai-iss-proj">${escHtml(homeProjName(it.proj))}</span>` : ''}
        </span>
        <span class="ai-iss-t">${escHtml(it.title)}</span>
        <span class="ai-iss-go">자세히 ›</span>
      </button>`;
  }).join('');
  return `<div class="ai-result">
      <div class="ai-r-lead"><span class="ai-r-tag ink">확인이 필요한 것</span> ${escHtml(who)} · <b>${items.length}가지</b></div>
      <div class="ai-r-cause">항목을 누르면 상세와 조치 버튼이 나와요.</div>
      <div class="ai-iss-list">${cards}</div>
    </div>`;
}

// ── 이슈 상세 (AI 추천 변경안 제외) — 대화에 이어 붙인다 ──
function chatIssueDetail(key) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it) return;
  aiAgentMsg('pilot', chatIssueDetailHtml(it));
}

function chatIssueDetailHtml(it) {
  const key = feedKey(it);
  const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
  const sev = it.sev === 'danger' ? 'danger' : it.sev === 'warning' ? 'warning' : 'info';

  // 수치 요약
  let nums = '';
  if (it.change) {
    const c = it.change;
    nums = `<div class="ai-iss-kpis">
        <div><span>${escHtml(c.fromL)}</span><strong>${escHtml(c.from)}</strong></div>
        <div><span>${escHtml(c.toL)}</span><strong>${escHtml(c.to)}</strong></div>
        <div><span>${escHtml(c.deltaL)}</span><strong class="up">${escHtml(c.delta)} (${escHtml(c.pct)})</strong></div>
      </div>`;
  } else if (it.dual) {
    const d = it.dual;
    nums = `<div class="ai-iss-kpis">
        <div><span>${escHtml(d.leftL)}</span><strong>${escHtml(d.left)}</strong></div>
        <div><span>${escHtml(d.rightL)}</span><strong>${escHtml(d.right)} <em class="up">${escHtml(d.delta)}</em></strong></div>
        <div><span>${escHtml(d.extraL)}</span><strong>${escHtml(d.extra)}</strong></div>
      </div>`;
  } else if (it.flow) {
    const f = it.flow;
    nums = `<div class="ai-iss-kpis">
        <div><span>${escHtml(f.sL)} · ${escHtml(f.sSub)}</span><strong>${escHtml(f.sVal)}</strong></div>
        <div><span>${escHtml(f.iL)}</span><strong class="${/-/.test(f.iVal) ? 'down' : 'up'}">${escHtml(f.iVal)}</strong></div>
        <div><span>${escHtml(f.aL)}</span><strong>${escHtml(f.aVal)}</strong></div>
      </div>`;
  }

  const note = it.note ? `<p class="ai-r-note">${escHtml(it.note)}</p>`
    : (it.impact ? `<p class="ai-r-note">${escHtml(it.impact.note)} · ${escHtml(it.impact.label)} <b class="up">${escHtml(it.impact.value)}</b> ${escHtml(it.impact.tail)}</p>` : '');

  // 변경 전/후 (있을 때만) — AI 추천 변경안은 넣지 않는다
  let pv = '';
  if (it.preview) {
    const p = it.preview;
    const rows = p.rows.map(r => `<tr><td class="l">${escHtml(r[0])}</td><td class="n">${escHtml(r[1])}</td><td class="n">${escHtml(r[2])}</td><td class="n ${/^[+]/.test(r[3]) ? 'up' : /^-/.test(r[3]) ? 'down' : ''}">${escHtml(r[3])}</td></tr>`).join('');
    const fc = p.forecast;
    pv = `<div class="ai-iss-sec">변경내용</div>
      <table class="hm-drawer-tbl"><tr class="h"><td>항목</td><td class="n">현재 계획</td><td class="n">확정</td><td class="n">증감</td></tr>${rows}</table>
      <div class="ai-iss-sec">반영 후 Project Forecast</div>
      <div class="hm-fc">
        <div class="hm-fc-item"><span>예상원가</span><div class="hm-fc-v">${escHtml(fc.cost[0])} <i>→</i> <b>${escHtml(fc.cost[1])}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.cost[2]) ? 'up' : /^-/.test(fc.cost[2]) ? 'down' : ''}">${escHtml(fc.cost[2])}</span></div>
        <div class="hm-fc-item"><span>예상 원가율</span><div class="hm-fc-v">${escHtml(fc.rate[0])} <i>→</i> <b>${escHtml(fc.rate[1])}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.rate[2]) ? 'up' : /^-/.test(fc.rate[2]) ? 'down' : ''}">${escHtml(fc.rate[2])}</span></div>
      </div>
      ${p.warning ? `<div class="hm-drawer-warn">⚠ ${escHtml(p.warning)}</div>` : ''}`;
  }

  // 이 이슈의 조치 버튼 — 누르면 해당 화면으로 이동한다
  const acts = [it.primary].concat(it.secondaries || []);
  const btns = acts.map((a, i) => `<button class="ai-act ${i === 0 ? 'pri' : ''}" onclick="chatIssueAct('${escAttr(key)}','${a.act}')">${escHtml(a.label)}</button>`).join('');

  return `<div class="ai-result">
      <div class="ai-r-lead">
        <span class="ai-r-tag ${sev === 'danger' ? 'red' : sev === 'warning' ? 'amber' : 'ink'}">${escHtml(it.sub)}</span>
        ${escHtml(it.title)}
      </div>
      <div class="ai-r-cause">${escHtml(homeProjName(it.proj))}${ai ? ` · 임팩트 ${escHtml(ai.impact)} · D-${ai.dueDays}` : ''}</div>
      ${nums}
      ${note}
      ${pv}
      <div class="ai-actions">${btns}</div>
    </div>`;
}

// ── 이슈 조치 — 화면 이동 시 대화는 우측 레일로 유지 ──
function chatIssueAct(key, act) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it) return;
  const goto = fn => { fn(); dockAiChat(); };
  switch (act) {
    case 'status':
    case 'impact':
      goto(() => openCostStatus('budgetMock')); break;
    case 'adjust':
      goto(() => openCostAdjust('budgetMock')); break;
    case 'history':
    case 'detail':
      goto(() => openCostHistory('budgetMock')); break;
    case 'cause': {
      const inp = document.getElementById('ai-chat-query');
      if (inp) { inp.value = it.primary.q || (it.title + ' 원인 분석해줘'); sendAiChat(); }
      break;
    }
    case 'reflect':
      homeFeedState[key] = 'reflected';
      if (typeof rerenderHomeFeed === 'function') rerenderHomeFeed();
      aiAgentMsg('pilot', `<div class="ai-result">
          <div class="ai-r-lead"><span class="ai-r-tag ink">반영 완료</span> 원가 조정안(Draft ${escHtml(it.preview && it.preview.draft ? it.preview.draft : 'V5')})에 반영했어요.</div>
          <div class="ai-actions"><button class="ai-act pri" onclick="chatIssueAct('${escAttr(key)}','adjust')">원가 조정 계속하기 →</button></div>
        </div>`);
      break;
    case 'done':
      homeFeedState[key] = 'done';
      if (typeof rerenderHomeFeed === 'function') rerenderHomeFeed();
      aiAgentMsg('pilot', chatIssueListHtml(typeof homeSelectedProject !== 'undefined' ? homeSelectedProject : 'all'));
      break;
    case 'later':
      aiAgentMsg('pilot', '<div class="ai-result"><div class="ai-r-lead">나중에 다시 알려드릴게요.</div></div>');
      break;
    default:
      goto(() => openCostStatus('budgetMock'));
  }
}

// ── 이슈 질의 → 별도 팝업 대신 대화 안에서 처리 ──
function chatOpenPjtIssues() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  aiAgentMsg('pilot', chatIssueListHtml(id));
}

// ============================================================
//  10차 — 자동 처리 내역을 대화창으로 · 닫은 도킹 채팅 다시 열기
//  ※ openAiChat은 함수 선언 호이스팅 때문에 래핑하면 무한 재귀가 되므로
//    덮지 않고, 대화창이 열리는 순간을 MutationObserver로 관찰해 처리한다.
// ============================================================

// ── 대화창 헤더의 "자동 처리 내역" 버튼 (메인화면에서는 제거되어 여기로 옮김) ──
function ensureChatAutoBtn() {
  const head = document.querySelector('#ai-chat-overlay .ai-chat-head');
  if (!head || head.querySelector('.ai-chat-auto')) return;
  const b = document.createElement('button');
  b.className = 'ai-chat-auto';
  b.type = 'button';
  const n = (typeof HOME_AUTO_COUNT !== 'undefined') ? HOME_AUTO_COUNT : 12;
  b.innerHTML = '<span class="ai-chat-auto-ic">⚡</span>자동 처리 <b>' + n + '건</b>';
  b.title = 'AI가 사람 확인 없이 반영한 내역 보기';
  b.onclick = function () { aiAgentMsg('pilot', pilotAutoHtml()); };
  const close = head.querySelector('.ai-chat-close');
  if (close) head.insertBefore(b, close); else head.appendChild(b);
}

// ── 닫은 도킹 채팅을 다시 여는 플로팅 버튼 ──
function ensureChatFab() {
  let f = document.getElementById('ai-chat-fab');
  if (f) return f;
  f = document.createElement('button');
  f.id = 'ai-chat-fab';
  f.className = 'ai-chat-fab';
  f.type = 'button';
  f.innerHTML = '<span aria-hidden="true">💬</span>';
  f.title = '대화 이어서 열기';
  f.setAttribute('aria-label', '대화 이어서 열기');
  f.onclick = function () { dockAiChat(); };
  document.body.appendChild(f);
  return f;
}
function showChatFab() { ensureChatFab().classList.add('on'); }
function hideChatFab() { const f = document.getElementById('ai-chat-fab'); if (f) f.classList.remove('on'); }

// 도킹할 때 헤더 버튼을 갖추고 FAB은 숨긴다
function dockAiChat() {
  const ov = document.getElementById('ai-chat-overlay');
  if (!ov) return;
  ov.classList.add('open', 'docked');
  document.body.classList.add('chat-docked');
  const head = ov.querySelector('.ai-chat-head');
  if (head && !head.querySelector('.ai-chat-home')) {
    const b = document.createElement('button');
    b.className = 'ai-chat-home';
    b.type = 'button';
    b.textContent = '‹ 메인으로';
    b.setAttribute('aria-label', '메인 화면으로 돌아가기');
    b.onclick = function () { if (typeof showMain === 'function') showMain(); };
    head.insertBefore(b, head.querySelector('.ai-chat-close'));
  }
  ensureChatAutoBtn();
  hideChatFab();
  const inp = document.getElementById('ai-chat-query');
  if (inp) setTimeout(function () { inp.focus(); }, 60);
}

// 상세 화면에서 닫으면 대화를 지우지 않고 FAB으로 남긴다 (눌러서 이어감)
function closeAiChat() {
  const ov = document.getElementById('ai-chat-overlay');
  const wasDocked = ov && ov.classList.contains('docked');
  const onMain = !!document.querySelector('#s-main.active');
  const hasTalk = !!(ov && ov.querySelector('#ai-chat-body .ai-msg'));
  if (ov) ov.classList.remove('open');
  undockAiChat();
  if (wasDocked && !onMain && hasTalk) showChatFab(); else hideChatFab();
}

// 대화창이 열리는 순간을 관찰 — 자동 처리 버튼 주입 + FAB 정리
(function watchChatOpen() {
  function bind() {
    const ov = document.getElementById('ai-chat-overlay');
    const main = document.getElementById('s-main');
    if (!ov || !main) { setTimeout(bind, 300); return; }
    new MutationObserver(function () {
      if (ov.classList.contains('open')) { ensureChatAutoBtn(); hideChatFab(); }
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    // 메인으로 돌아오면 FAB도 정리
    new MutationObserver(function () {
      if (main.classList.contains('active')) hideChatFab();
    }).observe(main, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ============================================================
//  10차 — 화면 길안내 전면 개편
//  기존 문제: 등록된 경로가 4개뿐이고 못 찾으면 무조건 첫 항목(수행원가 조정)으로
//  떨어져서, "인사이트로 이동" 같은 요청이 전부 오답이었다.
//  → 상단 메뉴 전체를 실제 진입 함수와 함께 등록하고, 못 찾으면 되묻는다.
// ============================================================

// go: 실제 화면 진입 함수 이름 (index.html의 메뉴가 호출하는 것과 동일)
const NAVI_SCREENS = [
  { id:'main',      k:/(메인|홈|첫화면|대시보드|myworkㅇ?)/i, t:'My Work',
    path:['My Work'], go:'showMain',
    need:'없음', min:'즉시', note:'담당 프로젝트와 확인할 항목을 한눈에 봐요.' },

  { id:'cost-status', k:/(원가현황|원가\s*현황|현황조회|집행현황|계정별현황)/, t:'원가 현황',
    path:['수행원가','원가현황'], go:'showCostStatus',
    need:'없음', min:'약 2분', note:'계정별 계획·실적·잔여를 한 화면에서 봐요.' },
  { id:'cost-adjust', k:/(원가조정|조정|변경입력|예산변경|편성)/, t:'원가 조정',
    path:['수행원가','원가조정'], go:'showCostAdjust',
    need:'변경 사유 · 근거 자료(계약서·확정 인력)', min:'약 5분',
    note:'승인된 예산은 조정 시 새 버전(Draft)으로 남고, 확정 전까지 ERP에 전송되지 않아요.' },
  { id:'cost-history', k:/(변경이력|이력|버전|히스토리|변경내역)/, t:'변경 이력',
    path:['수행원가','변경 이력'], go:'showCostHistory',
    need:'없음', min:'약 1분', note:'버전별 변경 전/후와 승인자를 함께 볼 수 있어요.' },

  { id:'insights', k:/(인사이트|종합현황|종합\s*현황|분석화면|추이|trend)/i, t:'인사이트 종합현황',
    path:['인사이트','종합 현황'], go:'showInsights',
    need:'없음', min:'약 3분', note:'월별 원가 추이와 계획 대비 실적을 차트로 봐요.' },
  { id:'report', k:/(레포트|리포트|보고서|보고자료)/, t:'맞춤 레포트',
    path:['인사이트','맞춤 레포트'], go:'showCustomReport',
    need:'보고 대상·기간', min:'약 3분', note:'필요한 항목만 골라 보고서 형태로 뽑을 수 있어요.' },

  { id:'si', k:/(수주형|수주|SI프로젝트|si)/i, t:'수주형 프로젝트',
    path:['프로젝트','수주형 프로젝트'], go:'showSIProject',
    need:'없음', min:'약 2분', note:'계약·IF 이력 중심으로 수주 사업을 봐요.' },
  { id:'proposal', k:/(제안)/, t:'제안 프로젝트',
    path:['프로젝트','제안 프로젝트'], go:'showProposalProject',
    need:'없음', min:'약 2분', note:'제안 단계 프로젝트를 관리해요.' },
  { id:'wg', k:/(wg|w\/g|워킹그룹)/i, t:'W/G 프로젝트',
    path:['프로젝트','W/G 프로젝트'], go:'showWGProject',
    need:'없음', min:'약 2분', note:'W/G 프로젝트를 관리해요.' },
  { id:'internal', k:/(사내)/, t:'사내 프로젝트',
    path:['프로젝트','사내 프로젝트'], go:'showInternalProject',
    need:'없음', min:'약 2분', note:'사내 프로젝트를 관리해요.' },
  { id:'invest', k:/(투자)/, t:'투자 프로젝트',
    path:['프로젝트','투자프로젝트'], go:'showInvestmentProject',
    need:'없음', min:'약 2분', note:'투자 프로젝트를 관리해요.' },
  { id:'advance', k:/(선투입)/, t:'선투입 프로젝트',
    path:['프로젝트','선투입 프로젝트'], go:'showAdvanceProject',
    need:'없음', min:'약 2분', note:'선투입 집행과 본 PJT 승계를 관리해요.' },

  { id:'close', k:/(프로젝트종료|종료보고|사업종료)/, t:'프로젝트 종료',
    path:['프로젝트','프로젝트 종료'], go:'showProjectClose',
    need:'없음', min:'약 3분', note:'종료 단계 산출물과 정산을 확인해요.' },
  { id:'monthly', k:/(월마감|마감)/, t:'월 마감',
    path:['수행원가','월 마감'], go:'showMonthlyClose',
    need:'없음', min:'약 3분', note:'당월 계획과 실적의 gap을 맞추는 단계예요.' },
];

// 실제 화면 이동 — 함수가 없으면 이동하지 않고 false를 돌려준다(엉뚱한 화면 방지)
function naviGo(id) {
  const s = NAVI_SCREENS.find(x => x.id === id);
  if (!s) return false;
  const fn = window[s.go];
  if (typeof fn !== 'function') return false;
  if (s.id === 'insights') fn('overview'); else fn();
  if (typeof dockAiChat === 'function') dockAiChat();
  return true;
}

function naviMatch(text) {
  const t = String(text).replace(/\s/g, '');
  return NAVI_SCREENS.find(x => x.k.test(t)) || null;
}

// 못 찾으면 엉뚱한 화면을 안내하지 않고 되묻는다
function naviAskHtml(text) {
  const picks = ['cost-status', 'cost-adjust', 'insights', 'report', 'si', 'monthly']
    .map(id => NAVI_SCREENS.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `<button class="ai-act" onclick="naviGo('${s.id}')">${escHtml(s.path.join(' › '))}</button>`)
    .join('');
  return `<div class="ai-result">
      <div class="ai-r-lead">"${escHtml(String(text).slice(0, 40))}" — 어느 화면을 찾으시는지 정확히 모르겠어요.</div>
      <div class="ai-r-cause">아래에서 골라주시거나, 화면 이름을 조금 더 구체적으로 말씀해 주세요.</div>
      <div class="ai-actions">${picks}</div>
    </div>`;
}

function naviRouteHtml(text) {
  const s = naviMatch(text);
  if (!s) return naviAskHtml(text);
  const crumb = s.path.map((p, i) => `<span class="ai-nav-crumb${i === s.path.length - 1 ? ' on' : ''}">${escHtml(p)}</span>`).join('<i>›</i>');
  const ok = typeof window[s.go] === 'function';
  return `<div class="ai-result">
      <div class="ai-r-lead"><b>${escHtml(s.t)}</b> 화면으로 안내할게요.</div>
      <div class="ai-nav-path">${crumb}</div>
      <div class="ai-navi-meta">
        <div><span>준비할 것</span><strong>${escHtml(s.need)}</strong></div>
        <div><span>예상 소요</span><strong>${escHtml(s.min)}</strong></div>
      </div>
      <p class="ai-r-note">${escHtml(s.note)}</p>
      <div class="ai-actions">
        ${ok ? `<button class="ai-act pri" onclick="naviGo('${s.id}')">${escHtml(s.t)} 열기 →</button>`
             : `<span class="ai-r-note">이 화면은 아직 준비 중이라 바로 이동할 수 없어요.</span>`}
      </div>
    </div>`;
}

// 라우팅 — 화면 이동 의도를 다른 규칙보다 먼저 판정한다
// (예: "인사이트 메뉴로 이동" 이 '이동' 때문에 엉뚱한 곳으로 가던 문제 해결)
function routeIntent(text) {
  const t = text.replace(/\s/g, '');

  // ① 메인 복귀
  if (/(메인|홈|처음|첫화면|대시보드)/.test(t) && /(가|이동|보여|복귀|돌아|줘)/.test(t)) {
    return { agent:'navi', render: () => {
      aiAgentMsg('navi', '<div class="ai-result"><div class="ai-r-lead">메인 화면으로 이동합니다.</div></div>');
      setTimeout(function () { if (typeof showMain === 'function') showMain(); }, 450);
    } };
  }

  // ② 화면 이동 의도 — 화면 이름이 잡히면 길안내가 최우선
  const wantsNav = /(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴|열어|가줘|보여줘|이동해)/.test(t);
  const hit = naviMatch(t);
  if (wantsNav && hit) return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };

  // ③ 이슈·확인사항 → 대화 안 목록
  if (/(이슈|확인할것|확인사항|확인해야|확인필요|해야할|해야하는|처리할|점검할|투두|todo|to-do)/i.test(t)) {
    return { agent:'pilot', render: () => chatOpenPjtIssues() };
  }

  // ④ Pilot
  if (/(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotWhatIfHtml(text)) };
  if (/(자동반영|자동처리|AI가처리|알아서)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotAutoHtml()) };
  if (/(위임|자동조종|얼마나믿|신뢰도)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotTrustHtml()) };
  if (/(오늘|브리핑|briefing|리스크)/.test(t)) return { agent:'pilot', render: () => aiAgentMsg('pilot', pilotBriefingHtml()) };

  // ⑤ Q — 정해진 분석 화면이 있는 질의
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐|초과)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  if (/원가율/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qCostRateHtml()) };
  if (/(계획대비|계획\s*대비)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qComparePlanHtml()) };

  // ⑥ 화면 이름만 말한 경우(동사 없이)도 길안내
  if (hit) return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };

  // ⑦ 이동 의도인데 화면을 특정 못한 경우 → 되묻기 (엉뚱한 화면 안내 금지)
  if (wantsNav) return { agent:'navi', render: () => aiAgentMsg('navi', naviAskHtml(text)) };

  // ⑧ 그 외 → 서버 경유 LLM
  return { agent:'q', render: () => askLLMAnswer(text) };
}

// ============================================================
//  11차 — Agent 재정의 (한글 역할명) · 이상징후 / 할 일 분리 · 오케스트레이터 노출
//
//  구성: 오케스트레이터 1 + 상세 Agent 4
//   · AI 어시스턴트   — 질의 유형을 판정해 담당 Agent에 배정 (칩으로 노출)
//   · 화면 길잡이     — 어디서 · 무엇을 준비해서 · 몇 분
//   · 데이터 분석     — 숫자의 의미와 원인을 근거와 함께 (What-if 포함)
//   · 이상징후 감시   — MIS 데이터에서 발견한 위험 신호 경고 (cat:'budget')
//   · 할 일 도우미    — 선행 이벤트로 생긴 조치 업무 제시 (cat:'work', 자동처리·위임등급)
// ============================================================

Object.assign(AGENTS.navi, {
  name: '화면 길잡이', role: '화면·절차 안내', desc: '어디서 어떻게 하는지 안내해요',
  ex2: ['원가 조정 어디서 해?', '인사이트 화면 열어줘', '변경 이력 보고싶어'],
});
Object.assign(AGENTS.q, {
  name: '데이터 분석', role: '숫자의 이유', desc: '숫자의 의미와 원인을 근거와 함께 설명해요',
  ex2: ['외주비 왜 늘었어?', '원가율 높은 프로젝트 알려줘', '개발자 2명 더 투입하면?'],
});
AGENTS.risk = {
  name: '이상징후 감시', role: '위험 신호 경고', desc: 'MIS 데이터에서 발견한 이상을 먼저 알려드려요',
  ex: '이상징후 있어?', ex2: ['이상징후 있어?', '계약금액 정합성 확인해줘', '급증한 계정 알려줘'],
};
AGENTS.todo = {
  name: '할 일 도우미', role: '조치 업무 제시', desc: '선행 시스템 이벤트로 생긴 해야 할 일을 제시해요',
  ex: '오늘 할 일 알려줘', ex2: ['오늘 할 일 알려줘', 'AI가 자동 처리한 내역', '위임 등급 보여줘'],
};
// 기존 pilot 키를 참조하는 코드가 남아 있어도 깨지지 않게 할 일 도우미로 흡수
Object.assign(AGENTS.pilot, {
  name: '할 일 도우미', role: '조치 업무 제시', desc: '선행 시스템 이벤트로 생긴 해야 할 일을 제시해요',
  ex2: AGENTS.todo.ex2,
});

// ── 오케스트레이터 — 어느 Agent가 담당하는지 한 줄로 보여준다 ──
const ORCH = { name: 'AI 어시스턴트', role: '질의 유형 판정' };

function aiOrchestratorMsg(agentKey, agents) {
  const body = document.getElementById('ai-chat-body');
  if (!body) return;
  const keys = (Array.isArray(agents) && agents.length) ? agents : [agentKey];
  const names = keys.filter(k => AGENTS[k])
    .map(k => `<b class="ag-${k}">${escHtml(AGENTS[k].name)}</b>`);
  if (!names.length) return;
  const who = names.length > 1
    ? names.join(' · ') + '가 함께 답합니다'
    : names[0] + '가 담당합니다';
  const d = document.createElement('div');
  d.className = 'ai-msg ai-orch';
  d.innerHTML = `<div class="ai-orch-line">
      <span class="ai-orch-tag">${escHtml(ORCH.name)}</span>이 질문은 ${who}
    </div>`;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
}

function sendAiChat() {
  const input = document.getElementById('ai-chat-query');
  const text = (input.value || '').trim();
  if (!text) return;
  aiUserMsg(text); input.value = '';
  const route = routeIntent(text);
  aiOrchestratorMsg(route.agent, route.agents);
  const t = aiTyping(route.agent);
  setTimeout(function () { t.remove(); route.render(); }, 560);
}

// ── 확인 항목 — 이상징후(budget) / 할 일(work) 분리 ──
// cat 을 주면 그 갈래만, 안 주면 둘 다 각각의 Agent 메시지로 나눠 보여준다.
function chatIssueListHtml(id, cat) {
  const all = id === 'all';
  const items = HOME_FEED.filter(i =>
    (all || i.proj === id) && !homeFeedState[feedKey(i)] && (!cat || i.cat === cat));
  const who = all ? '담당 전체 프로젝트' : homeProjName(id);
  const isRisk = cat === 'budget';
  const label = cat ? (isRisk ? '이상징후' : '해야 할 일') : '확인이 필요한 것';
  const desc = cat
    ? (isRisk ? 'MIS 데이터에서 발견한 위험 신호예요.' : '선행 시스템 이벤트로 생긴 조치 업무예요.')
    : '항목을 누르면 상세와 조치 버튼이 나와요.';
  if (!items.length) {
    return `<div class="ai-result">
        <div class="ai-r-lead"><span class="ai-r-tag ink">${escHtml(label)}</span> ${escHtml(who)}</div>
        <div class="ai-r-cause">지금 ${escHtml(cat ? label : '확인할 항목')}은 없어요. 정상 범위입니다.</div>
      </div>`;
  }
  const cards = items.map(it => {
    const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
    const sev = it.sev === 'danger' ? 'danger' : it.sev === 'warning' ? 'warning' : 'info';
    return `
      <button class="ai-iss ${sev}" onclick="chatIssueDetail('${escAttr(feedKey(it))}')">
        <span class="ai-iss-top">
          <span class="ai-iss-tag ${sev}">${escHtml(it.sub)}</span>
          ${ai ? `<span class="hm-chip impact ${/^-/.test(ai.impact) ? 'down' : 'up'}">임팩트 ${escHtml(ai.impact)}</span>
                  <span class="hm-chip due ${ai.dueDays <= 3 ? 'near' : ''}">D-${ai.dueDays}</span>` : ''}
          ${all ? `<span class="ai-iss-proj">${escHtml(homeProjName(it.proj))}</span>` : ''}
        </span>
        <span class="ai-iss-t">${escHtml(it.title)}</span>
        <span class="ai-iss-go">자세히 ›</span>
      </button>`;
  }).join('');
  return `<div class="ai-result">
      <div class="ai-r-lead"><span class="ai-r-tag ${isRisk ? 'red' : 'ink'}">${escHtml(label)}</span> ${escHtml(who)} · <b>${items.length}건</b></div>
      <div class="ai-r-cause">${escHtml(desc)}</div>
      <div class="ai-iss-list">${cards}</div>
    </div>`;
}

// 이상징후만 / 할 일만 / 둘 다
function chatOpenRisks() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  aiAgentMsg('risk', chatIssueListHtml(id, 'budget'));
}
function chatOpenTodos() {
  const id = (typeof homeSelectedProject !== 'undefined') ? homeSelectedProject : 'all';
  aiAgentMsg('todo', chatIssueListHtml(id, 'work'));
}
function chatOpenPjtIssues() {
  chatOpenRisks();
  chatOpenTodos();
}

// 상세는 항목 성격에 맞는 Agent가 답한다
function chatIssueDetail(key) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it) return;
  aiAgentMsg(it.cat === 'budget' ? 'risk' : 'todo', chatIssueDetailHtml(it));
}

// ── 라우팅 — 이상징후 / 할 일을 구분해 배정 ──
function routeIntent(text) {
  const t = text.replace(/\s/g, '');

  // ① 메인 복귀
  if (/(메인|홈|처음|첫화면|대시보드)/.test(t) && /(가|이동|보여|복귀|돌아|줘)/.test(t)) {
    return { agent:'navi', render: () => {
      aiAgentMsg('navi', '<div class="ai-result"><div class="ai-r-lead">메인 화면으로 이동합니다.</div></div>');
      setTimeout(function () { if (typeof showMain === 'function') showMain(); }, 450);
    } };
  }

  // ② 화면 이동 의도
  const wantsNav = /(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴|열어|가줘|보여줘|이동해)/.test(t);
  const hit = naviMatch(t);
  if (wantsNav && hit) return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };

  // ③ 이상징후 감시 — 위험 신호
  if (/(이상징후|이상|징후|리스크|위험|경고|급증|초과|정합성|알림)/.test(t)) {
    return { agent:'risk', render: () => chatOpenRisks() };
  }

  // ④ 할 일 도우미 — 조치 업무 / 자동처리 / 위임등급
  if (/(자동반영|자동처리|AI가처리|알아서)/.test(t)) return { agent:'todo', render: () => aiAgentMsg('todo', pilotAutoHtml()) };
  if (/(위임|자동조종|얼마나믿|신뢰도)/.test(t)) return { agent:'todo', render: () => aiAgentMsg('todo', pilotTrustHtml()) };
  // 확인 요청은 이상징후와 할 일을 함께 봐야 하므로 먼저 판정한다
  if (/(확인할것|확인사항|확인해야|확인필요|점검할|다보여|전부보여|모두보여)/.test(t)) {
    return { agent:'todo', agents:['risk','todo'], render: () => chatOpenPjtIssues() };
  }
  if (/(할일|해야할|해야하는|처리할|투두|todo|to-do|오늘|브리핑|briefing)/i.test(t)) {
    return { agent:'todo', render: () => chatOpenTodos() };
  }

  // ⑤ 데이터 분석 — What-if 포함
  if (/(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', pilotWhatIfHtml(text)) };
  if (/외주비/.test(t) && /(왜|늘|증가|많|올랐)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qOutsourceHtml()) };
  if (/원가율/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qCostRateHtml()) };
  if (/(계획대비|계획\s*대비)/.test(t)) return { agent:'q', render: () => aiAgentMsg('q', qComparePlanHtml()) };

  // ⑥ 화면 이름만 말한 경우
  if (hit) return { agent:'navi', render: () => aiAgentMsg('navi', naviRouteHtml(text)) };
  // ⑦ 이동 의도인데 화면 특정 불가 → 되묻기
  if (wantsNav) return { agent:'navi', render: () => aiAgentMsg('navi', naviAskHtml(text)) };

  // ⑧ 그 외 → 서버 경유 LLM
  return { agent:'q', render: () => askLLMAnswer(text) };
}

// ── 진입 인사 — 4개 Agent 소개 ──
function openAiChat(entry, initialQuery) {
  document.getElementById('ai-chat-title').textContent = 'AI 어시스턴트';
  document.getElementById('ai-chat-sub').textContent = '물어보면 담당 AI가 알아서 답해요';
  setChatAvatar(entry);
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');

  const key = (entry === 'navi' || entry === 'q' || entry === 'risk' || entry === 'todo') ? entry : null;
  if (key) {
    document.getElementById('ai-chat-title').textContent = AGENTS[key].name;
    document.getElementById('ai-chat-sub').textContent = AGENTS[key].desc;
    aiAgentMsg(key, agentIntroHtml(key));
    if (key === 'todo') chatOpenTodos();
    if (key === 'risk') chatOpenRisks();
    if (key === 'navi') aiAgentMsg('navi', naviCardHtml());
  } else {
    aiAgentMsg('ai', `<div class="ai-result">
        <div class="ai-r-lead">무엇을 도와드릴까요?</div>
        <div class="ai-r-cause">질문을 하시면 <b>AI 어시스턴트</b>가 유형을 판단해 담당 AI에게 넘깁니다.</div>
        <div class="ai-roster">
          ${['navi','q','risk','todo'].map(k => `<div class="ai-roster-i"><b class="ag-${k}">${escHtml(AGENTS[k].name)}</b><span>${escHtml(AGENTS[k].desc)}</span></div>`).join('')}
        </div>
      </div>` + examplesHtml(['원가 조정 어디서 해?', '외주비 왜 늘었어?', '이상징후 있어?', '오늘 할 일 알려줘']));
  }
  const input = document.getElementById('ai-chat-query');
  input.value = '';
  setTimeout(function () { input.focus(); }, 50);
  if (initialQuery) { input.value = initialQuery; sendAiChat(); }
}

// ============================================================
//  12차 — 멀티 에이전트 응답 · 팝업에 첫 질의 고정
//
//  기존: routeIntent가 "가장 먼저 걸린 규칙 하나"만 돌려줘서
//        "이상징후 있는지, 그리고 할 일 알려줘" 같은 복합 질의에 한 쪽만 답했다.
//  변경: 규칙을 개별 판정기로 나눠 걸리는 것을 모두 모으고, 담당 Agent가
//        차례로 답한다. (최대 3개까지 — 그 이상은 대화가 산만해짐)
// ============================================================

const INTENT_MAX = 3;

// 개별 판정기 — key로 중복을 제거한다
const INTENT_RULES = [
  { key:'nav', agent:'navi',
    test: t => /(찾아줘|어디서|어디로|바로가기|화면으로|화면열|화면 열|메뉴로|열어줘|가줘|데려가|가고싶|이동하|이동해|이동시|네비게)/.test(t),
    render: text => chatNavigate(text) },

  { key:'risk', agent:'risk',
    test: t => /(이상징후|이상|징후|리스크|위험|경고|급증|정합성|알림)/.test(t),
    render: () => chatOpenRisks() },

  { key:'auto', agent:'todo',
    test: t => /(자동반영|자동처리|AI가처리|알아서)/.test(t),
    render: () => aiAgentMsg('todo', pilotAutoHtml()) },

  { key:'trust', agent:'todo',
    test: t => /(위임|자동조종|얼마나믿|신뢰도)/.test(t),
    render: () => aiAgentMsg('todo', pilotTrustHtml()) },

  { key:'todo', agent:'todo',
    test: t => /(할일|해야할|해야하는|처리할|투두|todo|to-?do|오늘|브리핑|briefing)/i.test(t),
    render: () => chatOpenTodos() },

  { key:'whatif', agent:'q',
    test: t => /(하면|한다면|투입하면|늘리면|줄이면|시뮬|가정|만약)/.test(t),
    render: text => aiAgentMsg('q', pilotWhatIfHtml(text)) },

  { key:'outsource', agent:'q',
    test: t => /외주비/.test(t) && /(왜|늘|증가|많|올랐)/.test(t),
    render: () => aiAgentMsg('q', qOutsourceHtml()) },

  { key:'rate', agent:'q',
    test: t => /원가율/.test(t),
    render: () => aiAgentMsg('q', qCostRateHtml()) },

  { key:'compare', agent:'q',
    test: t => /계획대비/.test(t),
    render: () => aiAgentMsg('q', qComparePlanHtml()) },
];

// 걸리는 판정기를 모두 모아 담당 Agent 목록을 만든다
function routeIntents(text) {
  const t = String(text).replace(/\s/g, '');

  // 메인 복귀는 단독 처리 (다른 것과 섞이면 안 됨)
  if (/(메인|홈|처음|첫화면|대시보드)/.test(t) && /(가|이동|보여|복귀|돌아|줘)/.test(t)) {
    return [{ agent:'navi', render: () => {
      aiAgentMsg('navi', '<div class="ai-result"><div class="ai-r-lead">메인 화면으로 이동합니다.</div></div>');
      setTimeout(function () { if (typeof showMain === 'function') showMain(); }, 450);
    } }];
  }

  // 화면 이동(네비게이터) — 단독 처리: 선택 프로젝트 + 자연어 → 딥링크 실제 이동
  if (/(가고싶|가고 싶|가줘|데려가|이동하|이동해|이동시|열어줘|화면으로|화면 보여|보여줘|바로가|네비게|navigate)/.test(t)
      && /(화면|인사이트|레포트|보고서|원가|실적|계획|비교|소진|버전|예산|현황|조정|프로젝트|cost|Cost|COST|SQL|sql)/.test(t)) {
    return [{ agent:'navi', render: () => chatNavigate(text) }];
  }

  const hits = [];
  const seen = {};

  // "확인해야 할 것"류는 이상징후 + 할 일을 함께 본다
  if (/(확인할것|확인사항|확인해야|확인필요|점검할|다보여|전부보여|모두보여)/.test(t)) {
    hits.push({ agent:'risk', render: () => chatOpenRisks() });
    hits.push({ agent:'todo', render: () => chatOpenTodos() });
    seen.risk = seen.todo = true;
  }

  INTENT_RULES.forEach(function (r) {
    if (hits.length >= INTENT_MAX) return;
    if (seen[r.key]) return;
    // risk/todo 목록은 위에서 이미 담았으면 중복하지 않는다
    if (r.key === 'risk' && seen.risk) return;
    if (r.key === 'todo' && seen.todo) return;
    let ok = false;
    try { ok = !!r.test(t); } catch (e) { ok = false; }
    if (!ok) return;
    seen[r.key] = true;
    if (r.key === 'risk') seen.risk = true;
    if (r.key === 'todo') seen.todo = true;
    hits.push({ agent: r.agent, render: function () { r.render(text); } });
  });

  if (hits.length) return hits.slice(0, INTENT_MAX);

  // 이동 의도인데 위에서 안 잡힌 경우 → 네비게이터가 화면을 판단해 이동
  if (/(찾아|어디|어떻게|화면|이동|바로가기|절차|방법|메뉴|열어|가줘|보여줘|이동해|가고싶|데려가)/.test(t)) {
    return [{ agent:'navi', render: () => chatNavigate(text) }];
  }
  // 그 외 → 서버 경유 LLM
  return [{ agent:'q', render: () => askLLMAnswer(text) }];
}

// 기존 호출부 호환 — 첫 담당만 돌려준다
function routeIntent(text) {
  const list = routeIntents(text);
  const first = list[0];
  return { agent: first.agent, agents: list.map(x => x.agent), render: first.render };
}

// 담당 Agent가 차례로 답한다
function sendAiChat() {
  const input = document.getElementById('ai-chat-query');
  const text = (input.value || '').trim();
  if (!text) return;
  aiUserMsg(text); input.value = '';
  setChatAskBar(text);

  const routes = routeIntents(text);
  aiOrchestratorMsg(routes[0].agent, routes.map(r => r.agent));

  routes.forEach(function (r, i) {
    const t = aiTyping(r.agent);
    setTimeout(function () { t.remove(); r.render(); }, 560 + i * 640);
  });

  // 답변형 질문(q)이면 관련 화면으로도 이동 + 우측 도킹 (네비 인텐트는 이미 이동하므로 제외)
  if (routes.some(r => r.agent === 'q') && !routes.some(r => r.agent === 'navi')) {
    navToRelevant(text);
  }
}

// ── 팝업 상단에 첫 질의 고정 ──
// 대화가 길어져도 "무엇을 물었는지"가 계속 보이게 한다.
let chatAskText = '';

function setChatAskBar(text) {
  if (chatAskText) return;           // 첫 질의만 고정
  chatAskText = String(text || '').trim();
  renderChatAskBar();
}
function clearChatAskBar() {
  chatAskText = '';
  const el = document.getElementById('ai-chat-ask');
  if (el) el.remove();
}
function renderChatAskBar() {
  const modal = document.querySelector('#ai-chat-overlay .ai-chat-modal');
  const head = modal && modal.querySelector('.ai-chat-head');
  if (!modal || !head || !chatAskText) return;
  let el = document.getElementById('ai-chat-ask');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ai-chat-ask';
    el.className = 'ai-chat-ask';
    head.insertAdjacentElement('afterend', el);
  }
  el.innerHTML = `<span class="ai-chat-ask-l">질문</span>
    <span class="ai-chat-ask-t">${escHtml(chatAskText)}</span>`;
}

// 대화를 새로 열면 고정된 질의도 초기화한다
function openAiChat(entry, initialQuery) {
  clearChatAskBar();
  document.getElementById('ai-chat-title').textContent = 'AI 어시스턴트';
  document.getElementById('ai-chat-sub').textContent = '물어보면 담당 AI가 알아서 답해요';
  setChatAvatar(entry);
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');

  const key = (entry === 'navi' || entry === 'q' || entry === 'risk' || entry === 'todo') ? entry : null;
  if (key) {
    document.getElementById('ai-chat-title').textContent = AGENTS[key].name;
    document.getElementById('ai-chat-sub').textContent = AGENTS[key].desc;
    aiAgentMsg(key, agentIntroHtml(key));
    if (key === 'todo') chatOpenTodos();
    if (key === 'risk') chatOpenRisks();
    if (key === 'navi') aiAgentMsg('navi', naviCardHtml());
  } else {
    aiAgentMsg('ai', `<div class="ai-result">
        <div class="ai-r-lead">무엇을 도와드릴까요?</div>
        <div class="ai-r-cause">질문을 하시면 <b>AI 어시스턴트</b>가 유형을 판단해 담당 AI에게 넘깁니다. 두 가지를 함께 물으면 담당 AI가 각각 답합니다.</div>
        <div class="ai-roster">
          ${['navi','q','risk','todo'].map(k => `<div class="ai-roster-i"><b class="ag-${k}">${escHtml(AGENTS[k].name)}</b><span>${escHtml(AGENTS[k].desc)}</span></div>`).join('')}
        </div>
      </div>` + examplesHtml(['원가 조정 어디서 해?', '외주비 왜 늘었어?', '이상징후 있어?', '이상징후랑 할 일 같이 알려줘']));
  }
  const input = document.getElementById('ai-chat-query');
  input.value = '';
  setTimeout(function () { input.focus(); }, 50);
  if (initialQuery) { input.value = initialQuery; sendAiChat(); }
}
