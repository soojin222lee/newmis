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

// ── URL 라우팅 (해시 = 소스파일명) ──
const SCREEN_ROUTES = {
  's-main': 'dashboard',
  // 수행원가는 한 화면(s-budget)에 3개 하위 메뉴가 있으므로 costMode로 라우트명을 결정한다.
  // 각 하위 메뉴의 라우트 액션은 전용 파일(budget-cost-*.js)에서 ROUTE_ACTIONS에 등록한다.
  // 원가조정(adjust)은 선택된 비용계정(budgetSetupEditAccount)에 따라 한 뎁스 더 내려간다:
  //   #/budget-adjust/labor · /outsource · /material · /expense · /as
  //   (계정↔슬러그 매핑 BUDGET_AREA_SLUGS와 라우트 액션은 budget-area-*.js가 소유한다.)
  's-budget': () => {
    if (typeof costMode !== 'undefined' && costMode === 'adjust') {
      const acc = (typeof budgetSetupEditAccount !== 'undefined') ? budgetSetupEditAccount : null;
      const slug = (acc && typeof BUDGET_AREA_SLUGS !== 'undefined') ? BUDGET_AREA_SLUGS[acc] : null;
      return slug ? ('budget-adjust/' + slug) : 'budget-adjust';
    }
    return (typeof costMode !== 'undefined' && costMode === 'history') ? 'budget-history' : 'budget-status';
  },
  's-insights': 'insights',
  's-custom-report': 'custom-report',
  's-si-project': 'si-project',
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
  'insights': () => (typeof showInsights === 'function' ? showInsights('overview') : null),
  'custom-report': () => showCustomReport(),
  'si-project': () => showSIProject(),
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
function routeFromHash() {
  if (_suppressNextHash) { _suppressNextHash = false; return; }
  const action = ROUTE_ACTIONS[routeName()];
  if (action) action();
}
function routeInitial() {
  const action = ROUTE_ACTIONS[routeName()];
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
