// AI GUIDE: 화면 업무 가이드 챗봇 목업입니다.
// - 목적: 사용자가 현재 보고 있는 화면 기준으로 프론트 파일, 백엔드/API 후보, 업무 로직을 질문할 수 있게 합니다.
// - 현재 구현: 화면별 지식(screenGuideKnowledge)을 하드코딩하고, .screen.active 값을 읽어 답변 범위를 제한합니다.
// - 운영 구현 방향: 이 객체를 서버의 화면 메타데이터 API 또는 소스/주석 인덱스 검색 결과로 대체하면 됩니다.
// - 중요한 규칙: URL만 믿지 않고 active screen id, active nav id, 화면 내부 상태값을 함께 사용해야 SPA 화면을 정확히 식별할 수 있습니다.
// - 답변 품질을 높이려면 각 화면 JS 상단의 "AI GUIDE" 주석, 주요 함수 주석, 백엔드 API 명세를 함께 인덱싱합니다.

// 화면별 메타데이터 사전입니다.
// 실제 서비스에서는 이 정보를 정적 JS가 아니라 백엔드의 "화면 지식베이스"에서 내려받는 구조가 적합합니다.
const screenGuideKnowledge = {
  's-main': {
    title: 'NEW MIS 메인',
    route: '/ 또는 #main',
    frontend: ['public/js/dashboard.js', 'public/js/app.js'],
    backend: ['/api/projects', '/api/schedules', '/api/ai/guide'],
    logic: ['PM/팀장 역할 전환', '내 프로젝트 바로 이동', '일정 요약'],
    comments: ['메인은 업무 시작점이므로 상세 데이터보다 다음 행동을 안내하는 답변이 우선입니다.'],
    faqs: {
      '프로젝트': '메인 화면의 내 프로젝트 행을 선택하면 실행예산 상세 수립 화면으로 바로 이동합니다.',
      '일정': '오른쪽 상단 일정 확인에서 이번 달 마감, 검수, 승인 요청 일정을 확인하는 흐름입니다.',
    },
  },
  's-budget': {
    title: '실행예산',
    route: '#budget',
    frontend: ['public/js/budget-status.js', 'public/css/initiation-extra2.css'],
    backend: ['/api/budget/projects', '/api/budget/{projectNo}/versions', '/api/budget/{projectNo}/details', '/api/scm/assignments', '/api/purchase/quotes', '/api/erp/actuals'],
    logic: [
      '프로젝트 선택 후 상세예산 수립으로 진입',
      '인건비/외주비/재료비/경비/A/S비 5대 비용 영역 관리',
      '기준월 이전은 ERP 실적, 이후는 실행예산 계획으로 수행비용 계산',
      '버전별 실행예산 데이터를 조회하고 작성중 버전은 이전 버전 대비 차이를 확인',
    ],
    comments: [
      'Detail과 Summary는 승인 시 재집계되어 동일해야 합니다.',
      '총액 변경은 이 화면에서 직접 처리하지 않고 AI PMO Cost 재산정 프로세스로 유도합니다.',
      '통제 경비는 ERP 가용예산 확인이 선행되어야 합니다.',
    ],
    faqs: {
      '인건비': '인건비는 SCM에서 확정 완료된 투입가능 인력을 조회한 뒤 선택 등록합니다. 월별 MM은 SCM 확정 데이터를 기준으로 예산에 반영됩니다.',
      '외주비': '외주비는 실투입대상, 전문직수수료/제안/기타, 외주출장비, 공사MA, 이관외주비, 기타외주비로 나뉩니다.',
      '재료비': '재료비는 상품재료비, 감가상각비, 이관재료비로 관리합니다. 상품재료비는 구매 견적 항번 기준 상세를 확인하고 검수 계획을 등록합니다.',
      '경비': '경비는 자원계획 그리드에서 소계정/월별로 입력합니다. 통제 계정은 ERP의 매출귀속부서 가용예산을 초과할 수 없습니다.',
      '버전': '상단 버전 탭을 선택하면 해당 시점의 실행예산 데이터를 조회합니다. 작성중 버전은 확정 전 이전 버전 대비 증감 확인이 필요합니다.',
      '승인': '승인 시 입력 Detail을 그대로 믿지 않고 비용 영역별로 다시 집계한 뒤 수행비용과 Summary 정합성을 확인합니다.',
    },
  },
  's-custom-report': {
    title: '맞춤 레포트',
    route: '#custom-report',
    frontend: ['public/js/custom-report.js', 'public/css/initiation-extra2.css'],
    backend: ['/api/reports/projects', '/api/reports/budget-status', '/api/reports/export'],
    logic: ['레포트 유형 선택', '필드 선택 순서 기반 컬럼 구성', '프로젝트번호 키값 고정', '조회 결과 추출'],
    comments: ['프로젝트번호는 조인 키이므로 해제할 수 없고, 나머지 필드는 선택 순서가 컬럼 순서가 됩니다.'],
    faqs: {
      '필드': '필드는 행 형태로 선택하며, 선택한 순서가 조회 결과와 다운로드 컬럼 순서로 유지됩니다.',
      '실행예산': '실행예산 현황 유형은 예산버전, 승인일, 전버전 금액, 현재 수행비용, 5대 비용 항목을 조회합니다.',
      '다운로드': '화면에 조회된 컬럼 순서 그대로 엑셀 추출되는 컨셉입니다.',
    },
  },
  's-project-close': {
    title: '프로젝트 종료',
    route: '#project-close',
    frontend: ['public/js/project-close.js'],
    backend: ['/api/projects/closing', '/api/erp/project-close', '/api/purchase/contracts'],
    logic: ['종료 대상 프로젝트 조회', '구매 검수 완료 확인', '산출물 등록', '종료 승인'],
    comments: ['구매 검수 완료와 산출물 등록 여부가 종료 가능 조건을 판단하는 핵심입니다.'],
    faqs: {
      '구매': '구매 검수 완료 여부와 미완료 계약이 있는지 확인한 뒤 프로젝트 종료 처리를 진행합니다.',
      '산출물': '산출물 등록 후 프로젝트 종료 가능 상태로 전환하는 흐름입니다.',
    },
  },
  's-si-project': {
    title: '수주형 프로젝트',
    route: '#si-project',
    frontend: ['public/js/si-project.js'],
    backend: ['/api/projects/si', '/api/if/project-master'],
    logic: ['수주형 프로젝트 목록', '기본정보 등록', 'IF 변경이력 조회'],
    comments: ['단계별 기간 정보는 제거되어 기본정보와 IF 변경이력만 관리합니다.'],
    faqs: {
      'IF': 'IF 변경이력은 외부 시스템에서 프로젝트 기본정보가 변경된 흐름을 확인하는 용도입니다.',
    },
  },
  's-wg-project': {
    title: 'W/G 프로젝트',
    route: '#wg-project',
    frontend: ['public/js/wg-project.js'],
    backend: ['/api/projects/wg'],
    logic: ['W/G 프로젝트 목록', '등록/결재', '예산 항목 관리'],
    comments: ['사내성 프로젝트와 유사하지만 W/G 프로젝트 기준의 승인 흐름을 갖습니다.'],
    faqs: {},
  },
  's-internal-project': {
    title: '사내 프로젝트',
    route: '#internal-project',
    frontend: ['public/js/internal-project.js'],
    backend: ['/api/projects/internal'],
    logic: ['사내 프로젝트 목록', '등록/상세', '승인 처리'],
    comments: ['투자 프로젝트 화면과 동일한 구조를 공유할 수 있습니다.'],
    faqs: {},
  },
  's-investment-project': {
    title: '투자프로젝트',
    route: '#investment-project',
    frontend: ['public/js/investment-project.js'],
    backend: ['/api/projects/investment'],
    logic: ['투자프로젝트 목록', '등록/상세', '승인 처리'],
    comments: ['사내 프로젝트와 같은 화면 구조이며 라벨만 투자프로젝트 기준으로 표시합니다.'],
    faqs: {},
  },
  's-system-desc': {
    title: '운영 가이드',
    route: '#system-desc',
    frontend: ['public/js/system-desc.js'],
    backend: ['/api/docs/system-guide'],
    logic: ['운영 컨셉', '업무 프로세스', '데이터 흐름', 'R&R 안내'],
    comments: ['업무 정의와 시스템 경계 설명을 제공하는 정적 가이드 영역입니다.'],
    faqs: {},
  },
  's-monthly-close': {
    title: '월 마감',
    route: '#monthly-close',
    frontend: ['public/js/monthly-close.js'],
    backend: ['/api/monthly-close', '/api/erp/monthly-actuals'],
    logic: ['월별 마감 대상 조회', '실적/계획 비교', '마감 이력 확인'],
    comments: ['현재 메뉴는 숨김 처리될 수 있지만 화면 로직은 유지되어 있습니다.'],
    faqs: {},
  },
};

const screenGuideDefault = {
  title: '현재 화면',
  route: window.location.pathname,
  frontend: ['public/index.html', 'public/js/app.js'],
  backend: ['/api/ai/guide'],
  logic: ['현재 활성 화면 식별', '화면 컨텍스트 기반 답변'],
  comments: ['등록되지 않은 화면은 공통 앱 구조를 기준으로 안내합니다.'],
  faqs: {},
};

let screenGuideMessages = [];

// 현재 사용자가 보고 있는 화면을 판별합니다.
// 이 앱은 SPA라서 URL만으로 화면을 특정하기 어렵기 때문에 active screen/nav 상태를 함께 사용합니다.
function getActiveScreenGuide() {
  const activeScreen = document.querySelector('.screen.active');
  const activeNav = document.querySelector('.nav-group-btn.active, .nav-sub-item.active, .nav-item.active');
  const screenId = activeScreen ? activeScreen.id : 's-main';
  const meta = screenGuideKnowledge[screenId] || screenGuideDefault;
  return {
    ...meta,
    screenId,
    navId: activeNav ? activeNav.id : '-',
    url: `${window.location.pathname}${window.location.search}${window.location.hash || ''}`,
  };
}

// 실행예산 화면은 내부 탭과 상세계정 상태가 중요합니다.
// 예: 외주비 > 공사MA, 재료비 > 감가상각비처럼 같은 화면 id 안에서도 답변 범위가 달라집니다.
function getBudgetSubContext() {
  if (typeof budgetScreenView === 'undefined') return '';
  const parts = [`view=${budgetScreenView}`];
  if (typeof selectedBudgetAccount !== 'undefined' && selectedBudgetAccount) parts.push(`account=${selectedBudgetAccount}`);
  if (typeof selectedOutsourceSubAccount !== 'undefined' && selectedOutsourceSubAccount) parts.push(`outsourceSub=${selectedOutsourceSubAccount}`);
  if (typeof selectedMaterialSubAccount !== 'undefined' && selectedMaterialSubAccount) parts.push(`materialSub=${selectedMaterialSubAccount}`);
  return parts.join(' / ');
}

// 사용자의 질문을 현재 화면 메타데이터에 맞춰 간단히 라우팅합니다.
// 운영 AI 버전에서는 이 함수가 LLM 호출부가 되고, meta/frontend/backend/comments를 system context로 넘기면 됩니다.
function buildScreenGuideAnswer(question) {
  const meta = getActiveScreenGuide();
  const q = (question || '').toLowerCase();
  const matchedFaq = Object.entries(meta.faqs || {}).find(([key]) => q.includes(key.toLowerCase()));
  const budgetContext = meta.screenId === 's-budget' ? getBudgetSubContext() : '';

  if (q.includes('소스') || q.includes('파일') || q.includes('프론트')) {
    return `이 화면의 프론트 후보는 ${meta.frontend.join(', ')} 입니다. 공통 화면 전환은 public/js/app.js의 setScreen/show* 함수가 담당하고, 현재 화면 id는 ${meta.screenId}입니다.`;
  }
  if (q.includes('백엔드') || q.includes('api') || q.includes('if') || q.includes('연동')) {
    return `이 화면에서 연결될 백엔드/API 후보는 ${meta.backend.join(', ')} 입니다. 실제 구현 시에는 화면 id와 업무 구분을 함께 넘겨 화면 한정 답변을 만들면 됩니다.`;
  }
  if (q.includes('로직') || q.includes('규칙') || q.includes('프로세스')) {
    return `핵심 로직은 ${meta.logic.join(' → ')} 입니다.${budgetContext ? ` 현재 상세 컨텍스트는 ${budgetContext} 입니다.` : ''}`;
  }
  if (q.includes('주석') || q.includes('개발자')) {
    return `개발 주석 요약: ${meta.comments.join(' ')}`;
  }
  if (matchedFaq) return matchedFaq[1];

  return `${meta.title} 화면 기준으로 답변할게요. 담당 프론트는 ${meta.frontend[0]}이고, 주요 업무는 ${meta.logic.join(', ')} 입니다. 더 구체적으로 “소스”, “백엔드”, “로직”, “승인”, “외주비”처럼 물어보면 화면 범위 안에서 좁혀서 답할 수 있어요.`;
}

function renderScreenGuideContext() {
  const meta = getActiveScreenGuide();
  const context = document.getElementById('screen-guide-context');
  if (!context) return;
  context.innerHTML = `
    <div>
      <span>현재 화면</span>
      <strong>${meta.title}</strong>
    </div>
    <div>
      <span>프론트</span>
      <strong>${meta.frontend[0]}</strong>
    </div>
    <div>
      <span>백엔드 후보</span>
      <strong>${meta.backend[0]}</strong>
    </div>
    <div>
      <span>화면 ID</span>
      <strong>${meta.screenId}</strong>
    </div>
  `;
}

function renderScreenGuideMessages() {
  const body = document.getElementById('screen-guide-messages');
  if (!body) return;
  body.innerHTML = screenGuideMessages.map(msg => `
    <div class="screen-guide-msg ${msg.role}">
      <span>${msg.role === 'user' ? '질문' : 'AI 가이드'}</span>
      <p>${msg.text}</p>
    </div>
  `).join('');
  body.scrollTop = body.scrollHeight;
}

function sendScreenGuideMessage() {
  const input = document.getElementById('screen-guide-input');
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  screenGuideMessages.push({ role:'user', text:question });
  screenGuideMessages.push({ role:'bot', text:buildScreenGuideAnswer(question) });
  input.value = '';
  renderScreenGuideMessages();
}

function fillScreenGuidePrompt(text) {
  const input = document.getElementById('screen-guide-input');
  if (!input) return;
  input.value = text;
  input.focus();
}

function toggleScreenGuide(forceOpen) {
  const root = document.getElementById('screen-guide-root');
  if (!root) return;
  const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !root.classList.contains('open');
  root.classList.toggle('open', isOpen);
  renderScreenGuideContext();
  if (isOpen && !screenGuideMessages.length) {
    const meta = getActiveScreenGuide();
    screenGuideMessages.push({
      role:'bot',
      text:`${meta.title} 화면 기준으로 안내할게요. 이 화면의 소스, 백엔드 연동, 업무 로직, 개발 주석 관점으로 질문할 수 있습니다.`,
    });
    renderScreenGuideMessages();
  }
}

function refreshScreenGuideContext() {
  renderScreenGuideContext();
}

function initScreenGuideChatbot() {
  if (document.getElementById('screen-guide-root')) return;
  const root = document.createElement('div');
  root.id = 'screen-guide-root';
  root.className = 'screen-guide-root';
  root.innerHTML = `
    <button class="screen-guide-fab" onclick="toggleScreenGuide()" title="화면 업무 가이드">
      <span>AI</span>
    </button>
    <section class="screen-guide-panel" aria-label="화면 업무 가이드 챗봇">
      <header>
        <div>
          <span>화면 업무 가이드</span>
          <strong>이 화면 기준으로 답변해요</strong>
        </div>
        <button onclick="toggleScreenGuide(false)" title="닫기">×</button>
      </header>
      <div class="screen-guide-context" id="screen-guide-context"></div>
      <div class="screen-guide-quick">
        <button onclick="fillScreenGuidePrompt('이 화면 프론트 소스 파일 알려줘')">소스</button>
        <button onclick="fillScreenGuidePrompt('백엔드 연동은 어떻게 돼?')">백엔드</button>
        <button onclick="fillScreenGuidePrompt('업무 로직 설명해줘')">로직</button>
        <button onclick="fillScreenGuidePrompt('개발 주석 요약해줘')">주석</button>
      </div>
      <div class="screen-guide-messages" id="screen-guide-messages"></div>
      <div class="screen-guide-input-row">
        <textarea id="screen-guide-input" rows="2" placeholder="현재 화면에 대해 물어보세요"></textarea>
        <button onclick="sendScreenGuideMessage()">전송</button>
      </div>
    </section>
  `;
  document.body.appendChild(root);
  document.getElementById('screen-guide-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendScreenGuideMessage();
    }
  });

  document.querySelectorAll('.screen').forEach(screen => {
    new MutationObserver(refreshScreenGuideContext).observe(screen, { attributes:true, attributeFilter:['class'] });
  });
  document.addEventListener('click', () => setTimeout(refreshScreenGuideContext, 0));
  refreshScreenGuideContext();
}

document.addEventListener('DOMContentLoaded', initScreenGuideChatbot);
