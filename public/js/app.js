// ── 공통 상수 ──
const PROJ_NAMES = { cloud:'클라우드 인프라 고도화', erp:'ERP 고도화', mobile:'모바일 앱 리뉴얼', sec:'보안 시스템 구축' };
const PM_NAMES   = { cloud:'김은지', erp:'이강혁', mobile:'최우진', sec:'정미래' };
const LEVEL_STYLE = {
  '높음': { bg:'#fee2e2', color:'#991b1b' },
  '주의': { bg:'#fef3c7', color:'#92400e' },
  '중간': { bg:'#fef3c7', color:'#92400e' },
  '낮음': { bg:'#dcfce7', color:'#166534' },
};

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
  document.getElementById(id).classList.add('active');
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
(async function init() {
  await loadRisks();
  initDashboard();
  initRiskHistory();
  initBudgetStatus();
  initMonthlyClose();
  showMain();
})();
