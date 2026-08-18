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
}
function setNav(id) {
  document.querySelectorAll('.nav-item, .nav-sub-item, .nav-sub2-item, .nav-group-btn').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

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

// ── 우측 하단 바로가기 → AI 대화 팝업 ──
const AI_CHAT_META = {
  navi:  { title:'Budget Navi',  sub:'단계별 프로젝트 수행 가이드',
           greet:'안녕하세요, Budget Navi예요. 지금 프로젝트 수행 단계를 기준으로 다음 할 일을 단계별로 안내해 드릴게요. 무엇부터 볼까요?' },
  q:     { title:'Budget Q',     sub:'예산 Q&A',
           greet:'안녕하세요, Budget Q예요. 예산·계정·정산 무엇이든 물어보세요.' },
  pilot: { title:'Budget Pilot', sub:'AI 예산 편성 도우미',
           greet:'안녕하세요, Budget Pilot이에요. 프로젝트 규모와 기간을 알려주시면 계정별 실행예산 초안을 제안해 드릴게요.' },
};
let aiChatKind = 'q';

function openQuickShortcut(kind) { openAiChat(kind); }

// 메인 "무엇이든 물어보세요"와 연결 — 같은 대화 팝업으로 이어짐
function askFromHome() {
  const input = document.getElementById('ai-main-query');
  const q = input ? input.value.trim() : '';
  if (input) input.value = '';
  openAiChat('q', q || undefined);
}

function openAiChat(kind, initialQuery) {
  aiChatKind = AI_CHAT_META[kind] ? kind : 'q';
  const meta = AI_CHAT_META[aiChatKind];
  document.getElementById('ai-chat-title').textContent = meta.title;
  document.getElementById('ai-chat-sub').textContent = meta.sub;
  const body = document.getElementById('ai-chat-body');
  body.innerHTML = '';
  appendChatMsg('ai', meta.greet);
  document.getElementById('ai-chat-overlay').classList.add('open');
  const input = document.getElementById('ai-chat-query');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  if (initialQuery) { input.value = initialQuery; sendAiChat(); }
}

function closeAiChat() { document.getElementById('ai-chat-overlay').classList.remove('open'); }

function appendChatMsg(who, text) {
  const body = document.getElementById('ai-chat-body');
  const div = document.createElement('div');
  div.className = 'ai-chat-msg ' + (who === 'user' ? 'me' : 'ai');
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function sendAiChat() {
  const input = document.getElementById('ai-chat-query');
  const text = (input.value || '').trim();
  if (!text) return;
  appendChatMsg('user', text);
  input.value = '';
  const body = document.getElementById('ai-chat-body');
  const typing = document.createElement('div');
  typing.className = 'ai-chat-msg ai typing';
  typing.textContent = '● ● ●';
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;
  setTimeout(() => { typing.remove(); appendChatMsg('ai', aiChatReply(aiChatKind, text)); }, 550);
}

// 목업 응답 (추후 실제 LLM 호출로 교체 가능한 지점)
function aiChatReply(kind, text) {
  if (/외주비|인건비|재료비|경비|예산|계정/.test(text)) {
    return '관련 실행예산 내역을 확인할 수 있어요. 실행예산 화면에서 해당 계정을 열면 계획·실적·잔여를 바로 보여드립니다.';
  }
  if (/마감|정산/.test(text)) {
    return '이번 달 마감 일정과 미결 항목을 정리해 드릴게요. 월 마감 화면에서 확인할 수 있습니다.';
  }
  const byKind = {
    navi:  '현재 단계 기준 다음 할 일은 "8월 실적 마감 확정"입니다. 이어서 단계별로 안내해 드릴까요?',
    q:     '질문을 이해했어요. 근거가 필요한 수치는 원문 전표까지 연결해 답변드릴 수 있습니다.',
    pilot: '프로젝트 규모·기간을 알려주시면 인건비·외주비 등 계정별 초안 금액을 제안해 드릴게요.',
  };
  return byKind[kind] || '무엇을 도와드릴까요?';
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
    showMain();
  })();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
