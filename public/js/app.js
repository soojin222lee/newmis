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
  's-budget': 'budget-status',
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
  'budget-status': () => (typeof showCostStatus === 'function' ? showCostStatus() : showBudget()),
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
  const r = SCREEN_ROUTES[id];
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
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  document.getElementById('ai-chat-overlay').classList.add('open');

  if (entry === 'pilot') {
    aiAgentMsg('pilot', pilotBriefingHtml());
  } else if (entry === 'navi') {
    aiAgentMsg('navi', '어떤 업무를 하시려고 하나요? 하고 싶은 일을 말씀하시면 화면과 절차로 안내해 드릴게요.'
      + examplesHtml(['SKON 외주 실행예산 변경하고 싶어', '구매요청 화면 찾아줘']));
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
