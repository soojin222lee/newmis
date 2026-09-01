// AI GUIDE: 메인 화면 대시보드와 AI 업무 시작 화면을 렌더링합니다.
// - PM/팀장 관점의 첫 화면이며 프로젝트 바로가기, 일정, AI 검색 입력을 제공합니다.
// - 프로젝트명을 클릭하면 실행예산 상세 수립 화면으로 이동하는 흐름이 핵심입니다.
// - AI 화면 가이드는 사용자의 다음 행동을 안내하고, 상세 업무 질문은 실행예산/레포트 등 해당 화면으로 연결해야 합니다.

function initDashboard() {
  const now  = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;

  document.getElementById('s-main').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">NEW MIS는.</div>
        <div class="page-sub">${dateStr}</div>
      </div>
      <span class="role-badge pm-badge">👤 PM · 일반 구성원</span>
    </div>

    <div class="main-split-row">
      <div class="main-split-panel">
        ${renderBudgetOverviewGraph(true)}
      </div>
      <div class="main-split-panel">
        ${buildTaskStatus()}
      </div>
    </div>
  `;

  updateKpiMain();
}

function renderAiShortcut(title, sub, action) {
  return `
    <button class="ai-shortcut" onclick="${action}">
      <span class="ai-shortcut-icon">${title.slice(0, 1)}</span>
      <strong>${title}</strong>
      <em>${sub}</em>
    </button>`;
}

function openPurchaseReference() {
  const popup = window.open('/purchase-reference-list.html', 'purchaseReferenceList', 'width=920,height=720');
  if (!popup) {
    showToast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
  } else {
    popup.opener = null;
  }
}

function openAiBudgetMock(account) {
  openBudgetProjectScreen('budgetMock');
  budgetDetailStep = 'setup';
  budgetSetupEditAccount = account;
  renderBudgetPage();
}

function openAiProjectBudget(projectKey) {
  openBudgetProjectScreen(projectKey || 'budgetMock');
}

function askCostAi(forceText) {
  const input = document.getElementById('ai-main-query');
  const text = (forceText || (input ? input.value : '') || '').trim();
  if (input && forceText) input.value = forceText;
  if (!text) {
    showToast('궁금한 원가관리 업무를 입력해주세요.');
    return;
  }
  if (text.includes('인건비')) {
    openAiBudgetMock('인건비');
    return;
  }
  if (text.includes('외주비')) {
    openAiBudgetMock('외주비');
    return;
  }
  if (text.includes('재료비')) {
    openAiBudgetMock('재료비');
    return;
  }
  if (text.includes('월마감') || text.includes('정산')) {
    showMonthlyClose();
    return;
  }
  if (text.includes('운영') || text.includes('기준') || text.includes('가이드')) {
    showSysDescConcept();
    return;
  }
  showBudget();
}

function initDashboard() {
  document.getElementById('s-main').innerHTML = `
    <div class="ai-home">
      <div class="ai-home-shortcuts">
        ${renderAiShortcut('실행예산', '예산 조회', 'showBudget()')}
        ${renderAiShortcut('인건비', '투입/승인', "openAiBudgetMock('인건비')")}
        ${renderAiShortcut('외주비', '계획 수정', "openAiBudgetMock('외주비')")}
        ${renderAiShortcut('월마감', '정산 확인', 'showMonthlyClose()')}
        ${renderAiShortcut('가이드', '운영 기준', 'showSysDescConcept()')}
        ${renderAiShortcut('전체메뉴', '업무 찾기', 'showBudget()')}
      </div>

      <section class="ai-hero">
        <div class="ai-robot" aria-hidden="true">
          <div class="ai-robot-head"><span></span><span></span></div>
          <div class="ai-robot-body"></div>
        </div>
        <h1>사용은 가볍게, 데이터는 단단하게.<br><span class="ai-hero-line-sub">편리한 업무 환경과 신뢰할 수 있는 데이터의 연결.</span></h1>
        <div class="ai-search">
          <div class="ai-search-mark">AI</div>
          <input id="ai-main-query" type="text" placeholder="프로젝트, 실행예산, 인건비, 외주비, 월마감에 대해 질문해보세요"
            onkeydown="if(event.key==='Enter') askCostAi()">
          <button class="ai-send-btn" onclick="askCostAi()" title="질문하기">↑</button>
          <button class="ai-menu-btn" onclick="showBudget()" title="실행예산 바로가기">☰</button>
        </div>
        <div class="ai-prompt-chips">
          <button onclick="askCostAi('예산관리시스템 목업용 실행예산 보여줘')">예산관리시스템 목업용</button>
          <button onclick="askCostAi('인건비 수정하고 싶어')">인건비 수정</button>
          <button onclick="askCostAi('외주비 계획을 수정하고 싶어')">외주비 계획</button>
          <button onclick="askCostAi('월마감 상태 확인')">월마감</button>
          <button onclick="askCostAi('운영 기준 알려줘')">운영 기준</button>
        </div>
      </section>
    </div>
  `;

  updateKpiMain();
}

function projRows() {
  const rows = [
    { name:'클라우드 인프라 고도화', pm:'PM 김은지 · 인프라팀', pct:65, pctColor:'#f59e0b', stat:'주의', statColor:'#d97706', stage:'진행중', stageStyle:'background:#dcfce7;color:#166534', chip:'높음 2건', chipStyle:'background:#fee2e2;color:#991b1b', proj:'cloud' },
    { name:'ERP 고도화',             pm:'PM 이강혁 · 시스템팀', pct:48, pctColor:'#3b82f6',  stat:'정상', statColor:'#94a3b8', stage:'진행중', stageStyle:'background:#dbeafe;color:#1d4ed8', chip:'중간 2건', chipStyle:'background:#fef3c7;color:#92400e', proj:'erp' },
    { name:'모바일 앱 리뉴얼',        pm:'PM 최우진 · 서비스팀', pct:72, pctColor:'#10b981', stat:'정상', statColor:'#94a3b8', stage:'진행중', stageStyle:'background:#dcfce7;color:#166534', chip:'낮음 2건', chipStyle:'background:#dcfce7;color:#166534', proj:'mobile' },
    { name:'데이터 분석 플랫폼',      pm:'PM 박지수 · 데이터팀', pct:31, pctColor:'#3b82f6',  stat:'정상', statColor:'#94a3b8', stage:'착수보고', stageStyle:'background:#ede9fe;color:#4c1d95', chip:null, proj:null },
    { name:'보안 시스템 구축',        pm:'PM 정미래 · 보안팀',   pct:89, pctColor:'#ef4444', stat:'초과임박', statColor:'#dc2626', stage:'종료보고', stageStyle:'background:#ffedd5;color:#9a3412', chip:'높음 1건', chipStyle:'background:#fee2e2;color:#991b1b', proj:'sec' },
    { name:'HR 시스템 개선',          pm:'PM 윤도준 · HR팀',     pct:100, pctColor:'#22c55e', stat:'완료',  statColor:'#166534', stage:'종료보고', stageStyle:'background:#dcfce7;color:#166534', chip:null, proj:null },
  ];
  return rows.map(r => `
    <div class="proj-row">
      <div><div class="proj-name">${r.name}</div><div class="proj-pm">${r.pm}</div></div>
      <div>
        <div class="bar-info">
          <span class="bar-pct">${r.pct}%</span>
          <span class="bar-stat" style="color:${r.statColor}">${r.stat}</span>
        </div>
        <div class="bar-bg"><div class="bar-fill" style="width:${r.pct}%;background:${r.pctColor}"></div></div>
      </div>
      <div><span class="stage-pill" style="${r.stageStyle}">${r.stage}</span></div>
      <div style="text-align:right">
        ${r.chip
          ? `<button class="risk-chip" style="${r.chipStyle}" onclick="goHistory('${r.proj}')">${r.chip}</button>`
          : `<span class="risk-chip none" style="background:#f1f5f9;color:#94a3b8">${r.pct === 100 ? '—' : '없음'}</span>`}
      </div>
    </div>`).join('');
}

// ── 프로젝트 Task 현황 ──────────────────────────────────────────
// 타시스템(구매, SCM, Finance 등)에서 수신한 할 일 목록
// 상세 내용은 각 시스템에서 확인 / 건수만 표시
function buildTaskStatus() {
  const PROJ_COLOR = { cloud:'#1d4ed8', erp:'#0f766e', mobile:'#d97706', sec:'#dc2626' };

  // Mock 데이터 — 실제 운영 시 각 시스템 IF로 대체 예정
  const TASK_DATA = [
    { proj:'cloud',  name:'클라우드 인프라 고도화', 검수:3, 인력확정필요:2, 비용정산:1 },
    { proj:'erp',    name:'ERP 고도화',             검수:1, 인력확정필요:3, 비용정산:2 },
    { proj:'mobile', name:'모바일 앱 리뉴얼',        검수:2, 인력확정필요:1, 비용정산:0 },
    { proj:'sec',    name:'보안 시스템 구축',        검수:0, 인력확정필요:0, 비용정산:3 },
  ];

  const TASK_TYPES = [
    { key:'검수',       label:'검수',        src:'구매시스템', color:'#1d4ed8', bg:'#dbeafe', clickable:true },
    { key:'인력확정필요', label:'인력확정필요', src:'SCM',       color:'#0f766e', bg:'#ccfbf1', clickable:true },
    { key:'비용정산',   label:'비용정산',    src:'Finance',   color:'#d97706', bg:'#fef3c7', clickable:true },
  ];

  // 전체 합계
  const totals = {};
  TASK_TYPES.forEach(t => {
    totals[t.key] = TASK_DATA.reduce((s, p) => s + (p[t.key] || 0), 0);
  });
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  // 상단 요약 타일
  const summaryTiles = TASK_TYPES.map(t => {
    const countColor = totals[t.key] > 0 ? t.color : '#94a3b8';
    return `
    <div class="ts-tile">
      <div class="ts-tile-count" style="color:${countColor}">${totals[t.key]}<span class="ts-tile-unit">건</span></div>
      <div class="ts-tile-label">${t.label}</div>
      <div class="ts-tile-src" style="background:${t.bg};color:${t.color}">${t.src}</div>
    </div>`;
  }).join('');

  // 프로젝트별 행
  const projRows = TASK_DATA.map(p => {
    const pc = PROJ_COLOR[p.proj] || '#94a3b8';
    const rowTotal = TASK_TYPES.reduce((s, t) => s + (p[t.key] || 0), 0);
    const cells = TASK_TYPES.map(t => {
      const v = p[t.key] || 0;
      return `<td class="ts-td">
        ${v > 0
          ? `<span class="ts-count-badge" style="background:${t.bg};color:${t.color};cursor:pointer"
               onclick="showSysLink('${t.src}')">${v}건</span>`
          : `<span class="ts-count-none">—</span>`}
      </td>`;
    }).join('');
    return `
      <tr>
        <td class="ts-proj-cell">
          <span class="ts-proj-dot" style="background:${pc}"></span>
          <span class="ts-proj-name">${p.name}</span>
        </td>
        ${cells}
        <td class="ts-td ts-total-cell">${rowTotal > 0 ? rowTotal + '건' : '—'}</td>
      </tr>`;
  }).join('');

  // 합계 행
  const sumCells = TASK_TYPES.map(t =>
    `<td class="ts-td ts-sum-cell">${totals[t.key]}건</td>`
  ).join('');

  return `
    <div class="card">
      <div class="card-head">
        <span class="card-title">프로젝트 Task 현황</span>
        <span class="card-badge">구매 · SCM · Finance 수신 기준</span>
      </div>

      <!-- 안내 -->
      <div class="ts-notice">
        <span>ℹ️</span>
        <span>타 시스템에서 수신한 처리 필요 항목입니다. 건수만 제공되며 상세 내용은 해당 시스템에서 직접 확인하세요.</span>
      </div>

      <!-- 요약 타일 -->
      <div class="ts-tiles">
        <div class="ts-tile ts-tile-total">
          <div class="ts-tile-count">${grandTotal}<span class="ts-tile-unit">건</span></div>
          <div class="ts-tile-label">전체</div>
          <div class="ts-tile-src" style="background:#f1f5f9;color:#475569">전체 시스템</div>
        </div>
        <div class="ts-tile-divider"></div>
        ${summaryTiles}
      </div>

      <!-- 프로젝트별 테이블 -->
      <div class="ts-table-wrap">
        <table class="ts-table">
          <thead>
            <tr>
              <th class="ts-th-proj">프로젝트</th>
              ${TASK_TYPES.map(t => `<th class="ts-th"><span class="ts-th-src" style="background:${t.bg};color:${t.color}">${t.src}</span><br>${t.label}</th>`).join('')}
              <th class="ts-th">합계</th>
            </tr>
          </thead>
          <tbody>${projRows}</tbody>
          <tfoot>
            <tr class="ts-sum-row">
              <td class="ts-proj-cell" style="font-weight:700;color:#1e293b">합 계</td>
              ${sumCells}
              <td class="ts-td ts-sum-cell ts-grand-total">${grandTotal}건</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

/*
──────────────────────────────────────────────────
 buildRiskCalendar — 주석 처리 (체크포인트 캘린더)
 리스크 기반 2주 캘린더. 높음/미조치/검토중/조치완료 등
 체크포인트 화면으로 이동 후 해당 화면에서 유지됨.
──────────────────────────────────────────────────
function buildRiskCalendar() {
  const PROJ_COLOR = { cloud:'#1d4ed8', erp:'#0f766e', mobile:'#d97706', sec:'#dc2626' };
  const LEVEL_COLOR = {
    '높음': { bg:'#fee2e2', color:'#991b1b' },
    '주의': { bg:'#fef3c7', color:'#92400e' },
    '중간': { bg:'#fef3c7', color:'#92400e' },
    '낮음': { bg:'#dcfce7', color:'#166534' },
  };
  const STATUS_COLOR = {
    '조치완료': { bg:'#dcfce7', color:'#166534' },
    '검토중':   { bg:'#fef3c7', color:'#92400e' },
    '미조치':   { bg:'#fee2e2', color:'#991b1b' },
  };
  // ... 2주 날짜 배열, 리스크 배분, 셀/주별 렌더, 요약(높음/검토중/미조치/조치완료) ...
  // 원본 전체 코드는 git 이력 또는 주석 아카이브 참조
}
*/

function updateKpiMain() {
  // KPI 카드 제거됨 — 유지
}

function showSysLink(sysName) {
  let modal = document.getElementById('syslink-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'syslink-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="aipmo-link-box">
      <div class="aipmo-link-icon">🔗</div>
      <div class="aipmo-link-msg">
        <strong>${sysName}</strong>으로<br>
        연결됩니다.
      </div>
      <button class="aipmo-link-close" onclick="document.getElementById('syslink-modal').classList.remove('open')">확인</button>
    </div>`;
  modal.classList.add('open');
}

function initDashboard() {
  document.getElementById('s-main').innerHTML = `
    <div class="ai-workspace">
      <div class="ai-home-top">
        <div class="ai-brand">
          <strong>SKAX 원가관리 AI</strong>
          <span>실행예산 · 투입 · 정산 업무 도우미</span>
        </div>
        <button class="schedule-open-btn" onclick="openSchedulePanel()">일정 확인</button>
      </div>

      <section class="ai-work-hero">
        <div class="ai-greeting">NEW MIS는.</div>
        <h1>사용은 가볍게, 데이터는 단단하게.<br><span class="ai-hero-line-sub">편리한 업무 환경과 신뢰할 수 있는 데이터의 연결.</span></h1>
        <div class="ai-helper-card">
          <div class="ai-robot compact" aria-hidden="true">
            <div class="ai-robot-head"><span></span><span></span></div>
            <div class="ai-robot-body"></div>
          </div>
          <div>
            <strong>이번 달 원가관리 포인트</strong>
            <span>실행예산 조정, 인건비 승인요청, 월마감 일정을 같이 확인할 수 있어요.</span>
          </div>
        </div>
        <div class="ai-chatbox">
          <input id="ai-main-query" type="text" placeholder="메시지를 입력하세요..."
            onkeydown="if(event.key==='Enter') askCostAi()">
          <button class="ai-attach-btn" title="파일 첨부">⌕</button>
          <button class="ai-send-btn light" onclick="askCostAi()" title="질문하기">➜</button>
        </div>
        <div class="home-work-grid">
          <div class="my-project-card">
            <div class="home-section-title">내 프로젝트</div>
            <div class="my-project-table">
              <div class="my-project-head">
                <span>프로젝트번호</span>
                <span>프로젝트명</span>
              </div>
              <button onclick="openAiProjectBudget('budgetMock')">
                <strong>30131234-D001</strong>
                <span>예산관리시스템 목업용</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  updateKpiMain();
}

function openSchedulePanel() {
  let overlay = document.getElementById('schedule-panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'schedule-panel-overlay';
    overlay.className = 'schedule-overlay';
    overlay.onclick = e => { if (e.target === overlay) closeSchedulePanel(); };
    document.body.appendChild(overlay);
  }

  const events = {
    3: ['예산관리시스템 목업용 착수 점검'],
    8: ['외주비 계획 검토'],
    15: ['검수 마지막날', '인건비 MM 입력 마감'],
    22: ['SCM 승인대기 건 확인'],
    29: ['월마감일', '실행예산 변경 히스토리 점검'],
  };
  const scheduleRows = Object.entries(events)
    .map(([day, titles]) => ({ day: Number(day), title: titles.join(' / ') }))
    .sort((a, b) => a.day - b.day)
    .map(item => `
      <div class="${item.day === 15 ? 'urgent' : item.day === 29 ? 'closing' : ''}">
        <b>${item.day}일</b>
        <span><strong>${item.title}</strong><em>월간 일정 알림입니다.</em></span>
        <i>알림</i>
      </div>
    `).join('');
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const blanks = Array.from({ length: 3 }, () => '<div class="schedule-day blank"></div>').join('');
  const cells = days.map(day => `
    <div class="schedule-day ${events[day] ? 'has-event' : ''}">
      <strong>${day}</strong>
      ${(events[day] || []).slice(0, 2).map(text => `<span>${text}</span>`).join('')}
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="schedule-panel">
      <div class="schedule-head">
        <div>
          <div class="schedule-eyebrow">이번달 일정</div>
          <div class="schedule-title">2026년 7월</div>
        </div>
        <button onclick="closeSchedulePanel()">닫기</button>
      </div>
      <div class="schedule-week">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="schedule-calendar">${blanks}${cells}</div>
      <div class="schedule-task-head">
        <strong>이번 달 내 할 일</strong>
        <span>마감이 가까운 순서</span>
      </div>
      <div class="schedule-list">${scheduleRows}</div>
    </div>`;
  overlay.classList.add('open');
}

function closeSchedulePanel() {
  const overlay = document.getElementById('schedule-panel-overlay');
  if (overlay) overlay.classList.remove('open');
}

let dashboardRole = 'pm';

function switchDashboardRole(role) {
  dashboardRole = role;
  initDashboard();
}

function renderRoleSwitch() {
  return `
    <div class="role-switch">
      <button class="${dashboardRole === 'pm' ? 'active' : ''}" onclick="switchDashboardRole('pm')">PM</button>
      <button class="${dashboardRole === 'lead' ? 'active' : ''}" onclick="switchDashboardRole('lead')">팀장</button>
    </div>`;
}

function initDashboard() {
  document.getElementById('s-main').innerHTML = dashboardRole === 'lead'
    ? renderLeadDashboard()
    : renderPmDashboard();
  updateKpiMain();
}

const HOME_PROJECTS = [
  { id:'skon', no:'30131234-D001', name:'SKON 통합 관제 플랫폼' },
  { id:'logi', no:'30140777-D002', name:'차세대 물류 실행계' },
  { id:'migr', no:'30150482-D003', name:'SKON 데이터 마이그레이션' },
  { id:'erp',  no:'30160231-D004', name:'ERP 고도화' },
  { id:'sec',  no:'30160988-D005', name:'보안관제 고도화' },
  { id:'cloud',no:'30170345-D006', name:'클라우드 인프라 전환' },
  { id:'mob',  no:'30170612-D007', name:'모바일 앱 리뉴얼' },
  { id:'dw',   no:'30180129-D008', name:'통합 데이터웨어하우스' },
  { id:'aidoc',no:'30180457-D009', name:'AI 문서관리 POC' },
];

// ── 확인이 필요한 것 = Action-oriented Work Feed ──
// cat:'budget'(예산 점검, MIS 내부 시그널) | 'work'(업무 반영, 외부 이벤트→원가영향→액션)
// act 종류: cause(AI 원인분석) status adjust history impact reflect(미리보기 드로어) done detail later
const HOME_FEED = [
  // ── 예산 점검 ──
  { cat:'budget', proj:'skon', sub:'이상징후', sev:'danger', title:'8월 외주비가 계획 대비 18% 증가했어요',
    change:{ fromL:'계획', from:'2.30억', toL:'현재 예상', to:'2.72억', deltaL:'증가', delta:'+4,200만원', pct:'+18%' },
    impact:{ note:'현재 추세가 유지될 경우', label:'연말 예상원가', value:'+5,400만원', tail:'증가 예상' },
    primary:{ label:'원인 분석', ai:true, act:'cause', q:'SKON 통합 관제 플랫폼 8월 외주비 왜 늘었어?' },
    secondaries:[ { label:'원가 현황', act:'status' }, { label:'확인 완료', act:'done' } ] },
  { cat:'budget', proj:'skon', sub:'정합성', sev:'danger', title:'승인 이후 계약금액이 변경됐어요',
    dual:{ leftL:'승인 당시 계약금액', left:'30.8억', rightL:'현재 계약금액', right:'32.0억', delta:'+1.2억', extraL:'현재 수행원가', extra:'27.2억' },
    note:'계약 변경이 현재 수행원가에 미치는 영향을 검토해야 합니다.',
    preview:{ title:'계약 변경 · 영향 확인', date:'2026.08.18', mode:'impact',
      rows:[ ['계약금액','30.8억','32.0억','+1.2억'], ['수행원가(현재)','27.2억','27.2억','-'] ],
      forecast:{ cost:['27.20억','27.20억','검토 필요'], rate:['84.2%','—','검토 필요'] },
      warning:'계약금액 상향분이 수행원가에 반영되지 않았습니다.' },
    primary:{ label:'영향 확인', act:'impact' },
    secondaries:[ { label:'원가 조정', act:'adjust' }, { label:'변경 이력', act:'history' } ] },
  // ── 업무 반영 ──
  { cat:'work', proj:'migr', sub:'SCM', sev:'info', title:'9월 투입인력이 확정됐어요',
    flow:{ sL:'SCM 확정', sSub:'9월 투입인력', sVal:'12명 → 15명', sDelta:'+3명',
           iL:'수행원가 영향', iSub:'9월 인건비', iVal:'+2,400만원',
           aL:'필요한 업무', aSub:'9월 원가계획', aVal:'반영 필요' },
    preview:{ title:'SCM · 9월 인력계획', date:'2026.08.18', mode:'reflect', draft:'V5',
      rows:[ ['투입인원','12명','15명','+3명'], ['인건비','8,200만원','1억 600만원','+2,400만원'], ['9월 원가','2.10억','2.34억','+2,400만원'] ],
      forecast:{ cost:['27.20억','27.44억','+2,400만원'], rate:['84.2%','84.9%','+0.7%p'] },
      warning:'현재 승인된 수행원가 대비 2,400만원 증가합니다.',
      done:{ sL:'SCM 확정 인력', sVal:'12명 → 15명', iL:'원가 영향', iVal:'+2,400만원' } },
    primary:{ label:'수행원가에 반영', act:'reflect' },
    secondaries:[ { label:'변경내용 보기', act:'detail' }, { label:'나중에', act:'later' } ] },
  { cat:'work', proj:'skon', sub:'구매', sev:'info', title:'외주 계약 3건이 확정됐어요',
    flow:{ sL:'구매 확정', sSub:'외주 계약금액', sVal:'4.8억 → 5.2억', sDelta:'',
           iL:'수행원가 차이', iSub:'현재 외주비 계획 대비', iVal:'+4,000만원',
           aL:'필요한 업무', aSub:'외주비 계획', aVal:'조정 필요' },
    preview:{ title:'구매 · 외주 계약 확정', date:'2026.08.18', mode:'reflect', draft:'V5',
      rows:[ ['외주 계약금액','4.8억','5.2억','+4,000만원'], ['외주비 계획','9.50억','9.90억','+4,000만원'] ],
      forecast:{ cost:['28.10억','28.50억','+4,000만원'], rate:['86.8%','88.0%','+1.2%p'] },
      warning:'외주비 계획이 계약 확정분만큼 증가합니다.',
      done:{ sL:'구매 확정 계약', sVal:'4.8억 → 5.2억', iL:'원가 영향', iVal:'+4,000만원' } },
    primary:{ label:'수행원가에 반영', act:'reflect' },
    secondaries:[ { label:'계약내역 보기', act:'detail' }, { label:'나중에', act:'later' } ] },
  { cat:'work', proj:'logi', sub:'ERP', sev:'warning', title:'7월 경비 실적이 확정됐어요',
    flow:{ sL:'ERP 실적', sSub:'7월 경비', sVal:'4,040만원', sDelta:'',
           iL:'계획 대비', iSub:'계획 3,200만원', iVal:'+840만원',
           aL:'필요한 업무', aSub:'잔여기간 계획', aVal:'재검토 필요' },
    note:'이미 확정된 실적입니다. 잔여계획 영향을 확인한 뒤 필요 시 원가를 조정하세요.',
    preview:{ title:'ERP · 7월 경비 실적', date:'2026.08.18', mode:'impact',
      rows:[ ['7월 경비 계획','3,200만원','3,200만원','-'], ['7월 경비 실적','—','4,040만원','+840만원'] ],
      forecast:{ cost:['16.90억','16.98억','+840만원'], rate:['78.6%','78.9%','+0.3%p'] },
      warning:'실적 초과분만큼 잔여기간 계획 재검토가 필요합니다.' },
    primary:{ label:'원가 영향 확인', act:'impact' },
    secondaries:[ { label:'원가 조정', act:'adjust' }, { label:'확인 완료', act:'done' } ] },
  { cat:'work', proj:'skon', sub:'SCM', sev:'info', title:'8월 투입인력 변경이 확정됐어요',
    flow:{ sL:'SCM 확정', sSub:'8월 투입인력', sVal:'14명 → 13명', sDelta:'-1명',
           iL:'수행원가 영향', iSub:'8월 인건비', iVal:'-1,050만원',
           aL:'필요한 업무', aSub:'8월 원가계획', aVal:'반영 필요' },
    preview:{ title:'SCM · 8월 인력계획', date:'2026.08.18', mode:'reflect', draft:'V5',
      rows:[ ['투입인원','14명','13명','-1명'], ['인건비','9,200만원','8,150만원','-1,050만원'] ],
      forecast:{ cost:['28.10억','28.00억','-1,050만원'], rate:['86.8%','86.5%','-0.3%p'] },
      warning:'',
      done:{ sL:'SCM 확정 인력', sVal:'14명 → 13명', iL:'원가 영향', iVal:'-1,050만원' } },
    primary:{ label:'수행원가에 반영', act:'reflect' },
    secondaries:[ { label:'변경내용 보기', act:'detail' }, { label:'나중에', act:'later' } ] },
];

let homeSelectedProject = 'all';
let homeCat = 'all';
const homeFeedState = {}; // key → 'reflected' | 'done'

// 카드는 기본 접힘. 헤더 클릭 시 펼침(재렌더 없이 클래스 토글).
function toggleFeedCard(el) { const c = el.closest('.hm-card'); if (c) c.classList.toggle('open'); }

function feedKey(it) { return it.proj + '|' + it.title; }
function homeProjName(id) { const p = HOME_PROJECTS.find(x => x.id === id); return p ? p.name : ''; }
function homeFeedByProj() { return HOME_FEED.filter(i => homeSelectedProject === 'all' || i.proj === homeSelectedProject); }
function homeInsightCount(id) { return id === 'all' ? HOME_FEED.length : HOME_FEED.filter(i => i.proj === id).length; }
function homeCatCount(cat) { const b = homeFeedByProj(); return cat === 'all' ? b.length : b.filter(i => i.cat === cat).length; }

function selectHomeProject(id) { homeSelectedProject = id; homeCat = 'all'; rerenderHomeFeed(); }
function selectHomeCat(cat) { homeCat = cat; rerenderHomeFeed(); }
function rerenderHomeFeed() {
  const el = document.getElementById('home-insight-block'); if (el) el.innerHTML = renderHomeInsightBlock();
  const br = document.getElementById('home-brief'); if (br) br.innerHTML = homeBriefHtml();
  const ft = document.getElementById('home-foot');  if (ft) ft.innerHTML = homeFootHtml();
}

function scrollHomeTabs(dir) {
  const t = document.getElementById('hm-ptabs-track');
  if (!t) return;
  const max = t.scrollWidth - t.clientWidth;
  t.scrollLeft = Math.max(0, Math.min(max, t.scrollLeft + dir * 260));
}

// ── 예산 신호 레이어 · Headroom 리본 / Runway / 월마감 타임레일 / 프로젝트 신호등 ──
// 계정별 남은 여력과 소진 속도를 먼저 보여주고, 이번 달 어디까지 왔는지를 한 줄로 잇는다.
// lv: ok(여유) · warn(주의) · risk(임박) · na(해당없음)
const HOME_HEADROOM = [
  { name:'인건비',   lv:'ok',   pct:32, note:'여유' },
  { name:'외주비',   lv:'risk', pct:4,  note:'임박' },
  { name:'재료비',   lv:'ok',   pct:41, note:'여유' },
  { name:'경비',     lv:'warn', pct:12, note:'주의' },
  { name:'A/S Cost', lv:'na',   pct:0,  note:'해당없음' },
];

const HOME_RUNWAY = {
  account:'외주비', month:'11월', months:'2.8개월', delta:'계획 대비 +18%',
  spark:'0,6 20,8 40,7 60,11 80,15 100,20 118,24',
};

// 이번 달 예산 일정 — kind: now(오늘) · auto(AI 자동) · human(사람 확인) · done(완료)
const HOME_RAIL = [
  { at:2,  d:'8/10', l:'계획 확정',      kind:'done'  },
  { at:34, d:'오늘 8/19', l:'',           kind:'now'   },
  { at:55, d:'8/25', l:'검수 마감',      kind:'human' },
  { at:74, d:'8/31', l:'월마감',         kind:'done'  },
  { at:86, d:'9/1',  l:'자동 현행화',    kind:'auto'  },
  { at:97, d:'9/3',  l:'팀장 승인',      kind:'human' },
];

// 프로젝트별 신호등 + 원가 소진률
const HOME_SIGNAL = {
  skon:{ lv:'risk', rate:74 }, logi:{ lv:'warn', rate:41 }, migr:{ lv:'warn', rate:28 },
  erp:{ lv:'ok', rate:55 },    sec:{ lv:'ok', rate:38 },    cloud:{ lv:'ok', rate:62 },
  mob:{ lv:'ok', rate:47 },    dw:{ lv:'ok', rate:33 },     aidoc:{ lv:'ok', rate:21 },
};

function homeHeadroomHtml() {
  const segs = HOME_HEADROOM.map(h => `
      <div class="hm-hr-seg">
        <div class="hm-hr-n"><i class="hm-hr-dot ${h.lv}"></i>${h.name}</div>
        <div class="hm-hr-v ${h.lv}">${h.lv === 'na' ? '해당없음' : h.pct + '%'}</div>
        <div class="hm-hr-bar"><i class="${h.lv}" style="width:${h.pct}%"></i></div>
      </div>`).join('');
  return `<div class="hm-headroom">
      <div class="hm-hr-lbl">예산 여력<em>Headroom</em></div>
      ${segs}
    </div>`;
}

function homeRunwayHtml() {
  const r = HOME_RUNWAY;
  return `<div class="hm-runway">
      <span class="hm-runway-ic">📉</span>
      <div class="hm-runway-t">현재 소진 속도면 <b>${r.account}는 ${r.month}에 바닥납니다</b> · Runway ${r.months} · ${r.delta}</div>
      <svg class="hm-runway-spark" width="120" height="26" viewBox="0 0 120 26" aria-hidden="true">
        <polyline points="${r.spark}" fill="none" stroke="#e39a2a" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>`;
}

function homeRailHtml() {
  const pins = HOME_RAIL.map(p => `
        <div class="hm-rail-p ${p.kind}" style="left:${p.at}%">
          <span class="hm-rail-pin"></span>
          <span class="hm-rail-d">${p.d}</span>
          ${p.l ? `<span class="hm-rail-l">${p.l}</span>` : ''}
        </div>`).join('');
  const now = HOME_RAIL.find(p => p.kind === 'now');
  return `<div class="hm-rail">
      <div class="hm-rail-head">
        <span class="hm-rail-tt">이번 달 예산 일정</span>
        <span class="hm-chip grade r">● 자동</span>
        <span class="hm-chip due near">○ 사람 확인</span>
        <span class="hm-rail-sys">연계 시스템 정상 · ERP 전송 대기 3건</span>
      </div>
      <div class="hm-rail-line">
        <div class="hm-rail-ln"><i style="width:${now ? now.at : 0}%"></i></div>
        ${pins}
      </div>
    </div>`;
}

function homeSignalBlockHtml() {
  return homeHeadroomHtml() + homeRunwayHtml() + homeRailHtml();
}

// 프로젝트 탭 신호등 — 전체 탭은 신호등 없이 진행 평균만
function homeTabSignalHtml(id) {
  if (id === 'all') return '<span class="hm-ptab-bar"><i class="ok" style="width:45%"></i></span>';
  const s = HOME_SIGNAL[id];
  if (!s) return '';
  return `<span class="hm-ptab-bar"><i class="${s.lv}" style="width:${s.rate}%"></i></span>`;
}

function homeTabDotHtml(id) {
  if (id === 'all') return '';
  const s = HOME_SIGNAL[id];
  return s ? `<i class="hm-ptab-dot ${s.lv}"></i>` : '';
}

function renderHomeInsightBlock() {
  const tabs = [{ id:'all', name:'전체' }].concat(HOME_PROJECTS.map(p => ({ id:p.id, name:p.name })))
    .map(t => `
        <button class="hm-ptab ${homeSelectedProject === t.id ? 'active' : ''}" onclick="selectHomeProject('${t.id}')">
          <span class="hm-ptab-row">${homeTabDotHtml(t.id)}<span class="hm-ptab-name">${t.name}</span>
          <span class="hm-ptab-badge">${homeInsightCount(t.id)}</span></span>
          ${homeTabSignalHtml(t.id)}
        </button>`).join('');
  const tabsCarousel = `
    <div class="hm-ptabs-carousel">
      <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
      <div class="hm-ptabs-track" id="hm-ptabs-track">${tabs}</div>
      <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
    </div>`;

  const filtered = homeFeedByProj();
  const shown = homeCat === 'all' ? filtered : filtered.filter(i => i.cat === homeCat);
  const catFilter = `
    <div class="hm-catfilter">
      <button class="hm-cat ${homeCat === 'all' ? 'on' : ''}" onclick="selectHomeCat('all')">전체 <em>${homeCatCount('all')}</em></button>
      <button class="hm-cat budget ${homeCat === 'budget' ? 'on' : ''}" onclick="selectHomeCat('budget')">예산 점검 <em>${homeCatCount('budget')}</em></button>
      <button class="hm-cat work ${homeCat === 'work' ? 'on' : ''}" onclick="selectHomeCat('work')">업무 반영 <em>${homeCatCount('work')}</em></button>
    </div>`;

  let body = '';
  if (!shown.length) body = `<div class="hm-empty">이 프로젝트는 지금 확인할 항목이 없어요. 정상 범위입니다.</div>`;
  else {
    const budgetItems = homeSortFeed(shown.filter(i => i.cat === 'budget'));
    const workItems = homeSortFeed(shown.filter(i => i.cat === 'work'));
    if (budgetItems.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot budget"></span>예산 점검 <em>MIS 데이터에서 발견한 시그널</em></div>` + budgetItems.map(feedCard).join('');
    if (workItems.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot work"></span>업무 반영 <em>외부 이벤트 → 원가 영향 → 필요한 업무</em></div>` + workItems.map(feedCard).join('');
  }

  return `
    ${tabsCarousel}
    <div class="home2-sec-head">
      <h2>확인이 필요한 것 <b>${filtered.length}가지</b></h2>
      <span>업무 이벤트가 수행원가에 미치는 영향과 다음 업무를 연결합니다</span>
      ${homeSortHtml()}
    </div>
    ${catFilter}
    <div class="hm-feed">${body}</div>`;
}

// ── 결정 큐 고도화 · AI 추천 변경안 + 근거 원장 ────────────────────
// HOME_FEED는 건드리지 않고 feedKey(proj|title)로 매핑만 덧붙인다(병합 충돌 최소화).
// grade: D 확정(원천 IF 확정값) · R 규칙기반(산식 적용) · P 예측(확정 전, ERP 미전송)
// impactWon: 정렬용 절대 임팩트(만원) · dueDays: 마감까지 남은 일수
const HOME_AI = {
  'skon|8월 외주비가 계획 대비 18% 증가했어요': {
    grade:'R', src:'구매', impact:'+5,400만원', impactWon:5400, dueDays:2, dueNote:'월마감 전',
    plan:[ ['외주비 8~11월 계획','2.30억','2.72억','+4,200만원'],
           ['AI 예비비 상계','3,200만원','0','-3,200만원'],
           ['연말 예상원가','27.20억','27.74억','+5,400만원'] ],
    guard:[ ['ok','CP 한도 내 · 여유 2.61억'], ['warn','결재 경로 · 팀장 승인 필요'] ],
    evidence:[ ['원천 IF 데이터','구매시스템 PO 확정분 3건 · 2026-08-17 09:12 수신 · 협력사 A/B/C'],
               ['적용 규칙 · 산식','월별 계획 = 확정 PO 금액 × 검수월 배분율 (검수월 미확정분은 균등 배분)'],
               ['계산 과정','① 확정 PO 4,200만원 인식 → ② 8~11월 배분 → ③ AI 예비비 3,200만원 상계 → ④ 연말 예상원가 재산정'],
               ['참조한 유사 PJT','3건 · 동일 사업유형 · 평균 외주비 초과율 14.2% (본 건 18.0%는 상위 25% 구간)'],
               ['데이터 등급','R · 규칙기반 — 산식 공개, 확정 후 ERP 전송 가능'],
               ['신뢰도','92% · 표본 24건 · 최근 6개월 무수정 채택률 95.8%'],
               ['후행 전송','전송 대기 · 팀장 승인 후 ERP 연계 큐 등재'] ] },

  'skon|승인 이후 계약금액이 변경됐어요': {
    grade:'D', src:'CRM', impact:'+1.2억', impactWon:12000, dueDays:2, dueNote:'월마감 전',
    plan:[ ['계약금액','30.8억','32.0억','+1.2억'],
           ['수행원가(현재)','27.2억','27.2억','-'],
           ['예상 원가율','88.3%','85.0%','-3.3%p'] ],
    guard:[ ['ok','원천 IF 확정값 · ERP 전송 가능'], ['ok','자가전결 가능'] ],
    evidence:[ ['원천 IF 데이터','CRM 계약변경 통보 · 2026-08-18 수신 · 변경차수 2차'],
               ['적용 규칙 · 산식','예상 원가율 = 수행원가 ÷ 계약금액'],
               ['계산 과정','① 계약금액 30.8억 → 32.0억 인식 → ② 수행원가 27.2억 고정 → ③ 원가율 88.3% → 85.0% 재계산'],
               ['데이터 등급','D · 확정 — 원천 확정값이므로 즉시 반영 가능'],
               ['신뢰도','100% · 원천 확정값'],
               ['후행 전송','ERP·BIX 전송 가능'] ] },

  'migr|9월 투입인력이 확정됐어요': {
    grade:'D', src:'SCM', impact:'+2,400만원', impactWon:2400, dueDays:9, dueNote:'9월 계획 확정 전',
    plan:[ ['투입인원','12명','15명','+3명'],
           ['9월 인건비','8,200만원','1억 600만원','+2,400만원'],
           ['연말 예상원가','27.20억','27.44억','+2,400만원'] ],
    guard:[ ['ok','SCM 확정 인력 기준 · 자가전결 가능'] ],
    evidence:[ ['원천 IF 데이터','SCM 투입인력 확정 · 2026-08-18 수신 · Roll-in 3명'],
               ['적용 규칙 · 산식','인건비 = Σ(투입 M/M × 등급별 단가)'],
               ['계산 과정','① Roll-in 3명 인식 → ② 9월 M/M 재산정 → ③ 인건비 +2,400만원 → ④ 예상원가 반영'],
               ['데이터 등급','D · 확정 — SCM 확정 인력'],
               ['신뢰도','100% · 원천 확정값'],
               ['후행 전송','원가 반영 후 ERP 연계'] ] },

  'skon|외주 계약 3건이 확정됐어요': {
    grade:'D', src:'구매', impact:'+4,000만원', impactWon:4000, dueDays:5, dueNote:'검수 마감 전',
    plan:[ ['외주 계약금액','4.8억','5.2억','+4,000만원'],
           ['외주비 계획','9.50억','9.90억','+4,000만원'],
           ['연말 예상원가','28.10억','28.50억','+4,000만원'] ],
    guard:[ ['ok','확정 계약 기준 · 계정 내 조정'], ['warn','CP 한도 여유 2.21억으로 감소'] ],
    evidence:[ ['원천 IF 데이터','구매 계약 확정 3건 · 2026-08-18 수신'],
               ['적용 규칙 · 산식','외주비 계획 = 확정 계약금액 × 검수월 배분율'],
               ['계산 과정','① 확정 계약 5.2억 인식 → ② 기존 계획 4.8억 대비 차이 산출 → ③ 외주비 계획 +4,000만원'],
               ['데이터 등급','D · 확정 — 계약 확정분'],
               ['신뢰도','100% · 원천 확정값'],
               ['후행 전송','ERP 전송 가능'] ] },

  'logi|7월 경비 실적이 확정됐어요': {
    grade:'D', src:'ERP', impact:'+840만원', impactWon:840, dueDays:7, dueNote:'잔여계획 재검토',
    plan:[ ['7월 경비 계획','3,200만원','3,200만원','-'],
           ['7월 경비 실적','—','4,040만원','+840만원'],
           ['연말 예상원가','16.90억','16.98억','+840만원'] ],
    guard:[ ['ok','확정 실적 · 이미 기표 완료'], ['warn','잔여기간 계획 재검토 필요'] ],
    evidence:[ ['원천 IF 데이터','ERP 7월 확정 실적 기표 · 월마감 D+1 자동 수신'],
               ['적용 규칙 · 산식','실적 초과분 = 확정 실적 − 당월 계획'],
               ['계산 과정','① 실적 4,040만원 인식 → ② 계획 3,200만원 대비 +840만원 → ③ 연말 예상원가 반영'],
               ['데이터 등급','D · 확정 — 기표 완료분'],
               ['신뢰도','100% · 원천 확정값'],
               ['후행 전송','BIX 손익 반영 완료'] ] },

  'skon|8월 투입인력 변경이 확정됐어요': {
    grade:'D', src:'SCM', impact:'-1,050만원', impactWon:1050, dueDays:4, dueNote:'8월 마감 전',
    plan:[ ['투입인원','14명','13명','-1명'],
           ['8월 인건비','9,200만원','8,150만원','-1,050만원'],
           ['연말 예상원가','28.10억','28.00억','-1,050만원'] ],
    guard:[ ['ok','계정 총액 감소 · 자가전결 가능'] ],
    evidence:[ ['원천 IF 데이터','SCM 투입인력 변경 확정 · Roll-out 1명'],
               ['적용 규칙 · 산식','인건비 = Σ(투입 M/M × 등급별 단가)'],
               ['계산 과정','① Roll-out 1명 인식 → ② 8월 M/M 재산정 → ③ 인건비 -1,050만원'],
               ['데이터 등급','D · 확정 — SCM 확정 인력'],
               ['신뢰도','100% · 원천 확정값'],
               ['후행 전송','원가 반영 후 ERP 연계'] ] },
};

const HOME_GRADE = { D:['d','D · 확정'], R:['r','R · 규칙기반'], P:['p','예측 · ERP 미전송'] };

// 정렬 — 기본값은 기존 노출 순서 유지(비파괴)
let homeSort = 'base';
const HOME_SORTS = [
  ['base','기본순'], ['risk','임팩트 × 마감임박순'], ['impact','임팩트순'], ['due','마감임박순'],
];
function selectHomeSort(v) { homeSort = v; rerenderHomeFeed(); }

function homeAiOf(it) { return HOME_AI[feedKey(it)]; }

function homeSortFeed(list) {
  if (homeSort === 'base') return list;
  const s = list.slice();
  s.sort((a, b) => {
    const x = homeAiOf(a), y = homeAiOf(b);
    if (!x || !y) return 0;
    if (homeSort === 'impact') return y.impactWon - x.impactWon;
    if (homeSort === 'due')    return x.dueDays - y.dueDays;
    return (y.impactWon / y.dueDays) - (x.impactWon / x.dueDays);
  });
  return s;
}

function homeSortHtml() {
  const opts = HOME_SORTS.map(o => `<option value="${o[0]}" ${homeSort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
  return `<select class="hm-sort" onchange="selectHomeSort(this.value)" aria-label="정렬 기준">${opts}</select>`;
}

// 카드 헤더 메타 칩 — 근거등급 · 임팩트 · D-day · 출처 시스템
function feedMetaChipsHtml(it) {
  const ai = homeAiOf(it);
  if (!ai) return '';
  const g = HOME_GRADE[ai.grade] || HOME_GRADE.D;
  const dn = /^-/.test(ai.impact) ? 'down' : 'up';
  return `<span class="hm-meta-chips">
    <span class="hm-chip grade ${g[0]}">${g[1]}</span>
    <span class="hm-chip impact ${dn}">임팩트 ${ai.impact}</span>
    <span class="hm-chip due ${ai.dueDays <= 3 ? 'near' : ''}">D-${ai.dueDays} · ${ai.dueNote}</span>
    <span class="hm-chip src">${ai.src}</span>
  </span>`;
}

// AI 추천 변경안 — 변경 전/후 diff + 반영 조건
function aiPlanHtml(it, key) {
  const ai = homeAiOf(it);
  if (!ai) return '';
  const rows = ai.plan.map(r => {
    const d = r[3];
    const cls = /^\+/.test(d) ? 'up' : /^-/.test(d) ? 'down' : '';
    return `<div class="hm-plan-row">
      <span class="hm-plan-nm">${r[0]}</span>
      <span class="hm-plan-a">${r[1]}</span><span class="hm-plan-ar">→</span><span class="hm-plan-b">${r[2]}</span>
      <span class="hm-plan-d ${cls}">${d}</span>
    </div>`;
  }).join('');
  const guard = ai.guard.map(g => `<span class="hm-plan-ok ${g[0]}"><i></i>${g[1]}</span>`).join('');
  return `<div class="hm-plan">
    <div class="hm-plan-hd">
      <span class="hm-plan-t">✦ AI 추천 변경안</span>
      <span class="hm-plan-ev">근거 ${ai.evidence.length}건</span>
      <button class="hm-plan-why" onclick="event.stopPropagation();openEvidenceDrawer('${key}')">AI 판단 근거 ›</button>
    </div>
    <div class="hm-plan-body">${rows}</div>
    <div class="hm-plan-ft">${guard}</div>
  </div>`;
}

// 근거 원장 드로어
function openEvidenceDrawer(key) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  const ai = it && homeAiOf(it);
  if (!ai) return;
  const ov = document.getElementById('home-impact-drawer');
  if (!ov) return;
  const g = HOME_GRADE[ai.grade] || HOME_GRADE.D;
  const rows = ai.evidence.map(e => `<div class="hm-ev-row"><div class="hm-ev-k">${e[0]}</div><div class="hm-ev-v">${e[1]}</div></div>`).join('');
  ov.innerHTML = `
    <div class="hm-drawer" onclick="event.stopPropagation()">
      <div class="hm-drawer-head">
        <div>
          <div class="hm-drawer-eyebrow">AI 판단 근거 · 근거 원장</div>
          <strong>${it.title}</strong>
          <div class="hm-drawer-meta">${homeProjName(it.proj)} · ${ai.src} · 임팩트 ${ai.impact}</div>
        </div>
        <button class="hm-drawer-x" onclick="closeImpactDrawer()" aria-label="닫기">✕</button>
      </div>
      <div class="hm-drawer-body">
        <div class="hm-auto-note">AI가 <b>어떤 원천 데이터</b>를 <b>어떤 산식</b>으로 계산했는지 그대로 공개합니다.
          등급 <span class="hm-chip grade ${g[0]}">${g[1]}</span> 기준으로 후행 시스템 전송 가능 여부가 결정됩니다.</div>
        ${rows}
      </div>
      <div class="hm-drawer-foot">
        <button class="hm-btn" onclick="closeImpactDrawer()">닫기</button>
        <button class="hm-btn pri" onclick="closeImpactDrawer();openCostStatus('budgetMock')">원가 현황에서 보기 →</button>
      </div>
    </div>`;
  ov.classList.add('open');
}

function feedCard(it) {
  const key = feedKey(it);
  const st = homeFeedState[key];
  if (st === 'reflected') {
    const d = it.preview.done;
    return `<div class="hm-card done">
      <div class="hm-done-t">✓ 수행원가 조정안에 반영했습니다</div>
      <div class="hm-done-meta">${d.sL} <b>${d.sVal}</b> · ${d.iL} <b class="${/-/.test(d.iVal) ? 'down' : 'up'}">${d.iVal}</b> · <b>원가 조정 Draft ${it.preview.draft}</b>에 반영됨</div>
      <div class="hm-card-actions"><button class="hm-btn pri" onclick="openCostAdjust('budgetMock')">원가 조정 계속하기 →</button></div>
    </div>`;
  }
  if (st === 'done') {
    return `<div class="hm-card done grey">
      <div class="hm-done-t">✓ 확인 완료</div>
      <div class="hm-done-meta">${it.title} · ${homeProjName(it.proj)}</div>
    </div>`;
  }
  return it.cat === 'budget' ? feedBudgetCard(it, key) : feedWorkCard(it, key);
}

function feedActionsHtml(it, key) {
  const p = it.primary;
  const plan = aiPlanHtml(it, key);
  const sec = it.secondaries.map(s => `<button class="hm-btn" onclick="feedAct('${key}','${s.act}')">${s.label}</button>`).join('');
  return plan + `<div class="hm-card-actions">
    <button class="hm-btn pri" onclick="feedAct('${key}','${p.act}')">${p.label}${p.ai ? ' <span class="hm-ai-spark">✦</span>' : ''}</button>${sec}
  </div>`;
}

function feedCardHead(it, sum) {
  const tag = it.cat === 'budget'
    ? `<span class="hm-dot hm-${it.sev}"></span><span class="hm-tag hm-${it.sev}">예산 점검 · ${it.sub}</span>`
    : `<span class="hm-tag work">업무 반영 · ${it.sub}</span>`;
  return `<div class="hm-card-head" onclick="toggleFeedCard(this)">
    <div class="hm-card-headmain">
      <div class="hm-card-top">${tag}<span class="hm-card-proj">${homeProjName(it.proj)}</span>${feedMetaChipsHtml(it)}</div>
      <h3 class="hm-card-title">${it.title}</h3>
      <div class="hm-card-sum">${sum}</div>
    </div>
    <span class="hm-chev" aria-hidden="true">⌄</span>
  </div>`;
}

function feedBudgetCard(it, key) {
  let metrics = '', sum = '';
  if (it.change) {
    const c = it.change;
    sum = `<b>${c.from}</b> → <b>${c.to}</b> <em class="up">${c.delta} (${c.pct})</em>`;
    metrics = `<div class="hm-metrics">
      <div class="hm-metric"><span class="hm-m-l">${c.fromL}</span><b class="hm-m-v">${c.from}</b></div>
      <span class="hm-arrow">→</span>
      <div class="hm-metric"><span class="hm-m-l">${c.toL}</span><b class="hm-m-v">${c.to}</b></div>
      <div class="hm-metric hi"><span class="hm-m-l">${c.deltaL}</span><b class="hm-m-v up">${c.delta} <em>(${c.pct})</em></b></div>
    </div>
    <div class="hm-impact"><span class="hm-impact-l">예상 영향</span>${it.impact.note} · ${it.impact.label} <b class="up">${it.impact.value}</b> ${it.impact.tail}</div>`;
  } else if (it.dual) {
    const d = it.dual;
    sum = `<b>${d.left}</b> → <b>${d.right}</b> <em class="up">${d.delta}</em>`;
    metrics = `<div class="hm-metrics">
      <div class="hm-metric"><span class="hm-m-l">${d.leftL}</span><b class="hm-m-v">${d.left}</b></div>
      <span class="hm-arrow">→</span>
      <div class="hm-metric"><span class="hm-m-l">${d.rightL}</span><b class="hm-m-v">${d.right} <em class="up">${d.delta}</em></b></div>
      <div class="hm-metric hi"><span class="hm-m-l">${d.extraL}</span><b class="hm-m-v">${d.extra}</b></div>
    </div>
    <div class="hm-impact">${it.note}</div>`;
  }
  return `<div class="hm-card budget">
    ${feedCardHead(it, sum)}
    <div class="hm-card-body">
      ${metrics}
      ${feedActionsHtml(it, key)}
    </div>
  </div>`;
}

function feedWorkCard(it, key) {
  const f = it.flow;
  const iCls = /-/.test(f.iVal) ? 'down' : 'up';
  const sum = `${f.sVal}${f.sDelta ? ` <em class="${/-/.test(f.sDelta) ? 'down' : 'up'}">${f.sDelta}</em>` : ''} · ${f.iL} <em class="${iCls}">${f.iVal}</em> · <b>${f.aVal}</b>`;
  return `<div class="hm-card work">
    ${feedCardHead(it, sum)}
    <div class="hm-card-body">
      <div class="hm-flow">
        <div class="hm-flow-step"><div class="hm-flow-l">${f.sL}</div><div class="hm-flow-sub">${f.sSub}</div><div class="hm-flow-v">${f.sVal}${f.sDelta ? ` <em class="${/-/.test(f.sDelta) ? 'down' : 'up'}">${f.sDelta}</em>` : ''}</div></div>
        <span class="hm-flow-arrow">→</span>
        <div class="hm-flow-step"><div class="hm-flow-l">${f.iL}</div><div class="hm-flow-sub">${f.iSub}</div><div class="hm-flow-v ${iCls}">${f.iVal}</div></div>
        <span class="hm-flow-arrow">→</span>
        <div class="hm-flow-step accent"><div class="hm-flow-l">${f.aL}</div><div class="hm-flow-sub">${f.aSub}</div><div class="hm-flow-v">${f.aVal}</div></div>
      </div>
      ${it.note ? `<div class="hm-impact">${it.note}</div>` : ''}
      ${feedActionsHtml(it, key)}
    </div>
  </div>`;
}

function feedAct(key, act) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it) return;
  switch (act) {
    case 'cause': openAiChat('main', it.primary.q || (it.title + ' 원인 분석해줘')); break;
    case 'status': openCostStatus('budgetMock'); break;
    case 'adjust': openCostAdjust('budgetMock'); break;
    case 'history': openCostHistory('budgetMock'); break;
    case 'impact': it.preview ? openImpactDrawer(key) : openCostStatus('budgetMock'); break;
    case 'reflect': openImpactDrawer(key); break;
    case 'done': homeFeedState[key] = 'done'; rerenderHomeFeed(); showToast('확인 완료로 처리했어요.'); break;
    case 'detail': showToast('변경 상세 보기 (준비 중)'); break;
    case 'later': showToast('나중에 다시 알려드릴게요.'); break;
  }
}

// ── Impact Preview Drawer ──
let impactDrawerKey = null;
function openImpactDrawer(key) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it || !it.preview) return;
  impactDrawerKey = key;
  const ov = document.getElementById('home-impact-drawer');
  if (!ov) return;
  ov.innerHTML = impactDrawerHtml(it);
  ov.classList.add('open');
}
function closeImpactDrawer() { const ov = document.getElementById('home-impact-drawer'); if (ov) ov.classList.remove('open'); }
function impactDrawerHtml(it) {
  const pv = it.preview;
  const key = feedKey(it);
  const reflectMode = pv.mode === 'reflect';
  const rows = pv.rows.map(r => `<tr><td class="l">${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td><td class="n ${/^[+]/.test(r[3]) ? 'up' : /^-/.test(r[3]) ? 'down' : ''}">${r[3]}</td></tr>`).join('');
  const fc = pv.forecast;
  return `
    <div class="hm-drawer" onclick="event.stopPropagation()">
      <div class="hm-drawer-head">
        <div>
          <div class="hm-drawer-eyebrow">${reflectMode ? '수행원가 반영 미리보기' : '원가 영향 확인'}</div>
          <strong>${pv.title}</strong>
          <div class="hm-drawer-meta">확정일 ${pv.date} · ${homeProjName(it.proj)}</div>
        </div>
        <button class="hm-drawer-x" onclick="closeImpactDrawer()" aria-label="닫기">✕</button>
      </div>
      <div class="hm-drawer-body">
        <div class="hm-drawer-sec-t">변경내용</div>
        <table class="hm-drawer-tbl"><tr class="h"><td>항목</td><td class="n">현재 계획</td><td class="n">확정</td><td class="n">증감</td></tr>${rows}</table>

        <div class="hm-drawer-sec-t">반영 후 Project Forecast</div>
        <div class="hm-fc">
          <div class="hm-fc-item"><span>예상원가</span><div class="hm-fc-v">${fc.cost[0]} <i>→</i> <b>${fc.cost[1]}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.cost[2]) ? 'up' : /^-/.test(fc.cost[2]) ? 'down' : ''}">${fc.cost[2]}</span></div>
          <div class="hm-fc-item"><span>예상 원가율</span><div class="hm-fc-v">${fc.rate[0]} <i>→</i> <b>${fc.rate[1]}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.rate[2]) ? 'up' : /^-/.test(fc.rate[2]) ? 'down' : ''}">${fc.rate[2]}</span></div>
        </div>
        ${pv.warning ? `<div class="hm-drawer-warn">⚠ ${pv.warning}</div>` : ''}
      </div>
      <div class="hm-drawer-foot">
        <button class="hm-btn" onclick="closeImpactDrawer()">취소</button>
        ${reflectMode
          ? `<button class="hm-btn pri" onclick="feedReflectApply('${key}')">원가 조정안에 반영</button>`
          : `<button class="hm-btn pri" onclick="closeImpactDrawer();openCostAdjust('budgetMock')">원가 조정으로 이동 →</button>`}
      </div>
    </div>`;
}
function feedReflectApply(key) {
  closeImpactDrawer();
  homeFeedState[key] = 'reflected';
  rerenderHomeFeed();
  showToast('원가 조정안(Draft V5)에 반영했어요.');
}

// ── AI 자동처리 레이어 ─────────────────────────────────────────────
// 실행예산은 선행(CRM·AI PMO·SCM·구매)에서 IF를 받아 수행 관점으로 편성하고,
// 후행(ERP·BIX)으로 확정 정보를 넘긴다. AI는 그 사이에서 "무엇을 자동 반영했는지"를
// 먼저 보여주고, 그 결과 PM이 확인해야 할 것만 HOME_FEED로 남긴다.
const HOME_EVENT_TOTAL  = 18;   // 오늘 선행 시스템에서 수신한 이벤트 총건
const HOME_AUTO_COUNT   = 12;   // 그중 AI가 자동 반영한 건 (나머지 6건 = HOME_FEED)
const HOME_AUTO_MIN_PER = 8;    // 건당 표준 처리시간(분, 추정)
const HOME_AUTO_WEEK    = 47;   // 이번 주 누적 자동 반영

// grade: 'D' 확정(원천 IF 확정값) | 'R' 규칙기반(산식 적용, 계정 총액 불변)
const HOME_AUTO_LOG = [
  { time:'09:02', sys:'ERP',    grade:'D', title:'월마감 D+1 자동 현행화 · 인건비', desc:'7월 확정 실적 기표 반영 · 이관인건비 포함 8건', proj:'all' },
  { time:'09:02', sys:'ERP',    grade:'D', title:'월마감 D+1 자동 현행화 · 경비',   desc:'잡비·사무용품 실적 반영 · 계획=실적 확정', proj:'all' },
  { time:'10:41', sys:'구매',   grade:'D', title:'외주 PO 확정 반영 · 외주비',      desc:'ATS 2건 · AGS 1건 계획=실적 확정 처리', proj:'skon' },
  { time:'11:15', sys:'SCM',    grade:'R', title:'납기 변경 반영 · 재료비',         desc:'검수월 9월 → 10월 이동 · 계정 총액 불변', proj:'logi' },
  { time:'13:08', sys:'AI PMO', grade:'D', title:'Roll-out 인력 반영 · 인건비',     desc:'1명 철수 · 8월 인건비 -850만원', proj:'migr' },
  { time:'14:22', sys:'CRM',    grade:'D', title:'선투입 집행 자동 승계',           desc:'선투입 4,200만원 → 본 PJT 승계 · 추적 링크 유지', proj:'erp' },
];

const HOME_SYSTEMS = [
  { name:'CRM',    state:'ok',   note:'계약 IF 정상' },
  { name:'AI PMO', state:'ok',   note:'투입계획 IF 정상' },
  { name:'SCM',    state:'ok',   note:'인력·납기 IF 정상' },
  { name:'구매',   state:'ok',   note:'PO·검수 IF 정상' },
  { name:'ERP',    state:'wait', note:'전송 대기 3건' },
  { name:'BIX',    state:'ok',   note:'손익 IF 정상' },
];

function homeOpenCount() { return HOME_FEED.filter(i => !homeFeedState[feedKey(i)]).length; }

function homeBriefHtml() {
  const left = homeOpenCount();
  if (!left) return `<b>오늘 확인할 것이 없어요.</b> 나머지 <b>${HOME_AUTO_COUNT}건</b>은 AI가 자동 반영했습니다.`;
  return `오늘 확인할 것은 <b>${left}건</b>, <em>약 ${Math.round(left * 1.5)}분이면 끝나요.</em> 나머지 <b>${HOME_AUTO_COUNT}건</b>은 AI가 자동 반영했어요.`;
}

function homeAutoStripHtml() {
  return `
    <button class="hm-autostrip" onclick="openAutoDrawer()">
      <span class="hm-autostrip-ic">⚡</span>
      <span class="hm-autostrip-tx">선행 시스템 이벤트 <em>${HOME_EVENT_TOTAL}건 중 ${HOME_AUTO_COUNT}건</em>을 AI가 수행원가에 자동 반영했어요 · <em>월마감 D+1 자동 현행화</em> 포함</span>
      <span class="hm-autostrip-more">자동 처리 내역 보기 ›</span>
    </button>`;
}

function homeFootHtml() {
  const done  = HOME_FEED.length - homeOpenCount();
  const saved = HOME_AUTO_COUNT * HOME_AUTO_MIN_PER;
  const chips = HOME_SYSTEMS.map(s => `<span class="hm-sys-chip ${s.state}"><i></i>${s.name} <em>${s.note}</em></span>`).join('');
  return `
    <div class="hm-foot">
      <div class="hm-foot-card">
        <div class="hm-foot-t">오늘 처리 요약</div>
        <div class="hm-foot-v">확인 처리 <b>${done}</b>건 · 자동 반영 <b>${HOME_AUTO_COUNT}</b>건 · <em>절약한 시간 약 ${Math.floor(saved/60)}시간 ${saved%60}분</em></div>
        <div class="hm-foot-s">이번 주 누적 자동 반영 ${HOME_AUTO_WEEK}건 · 건당 표준 처리시간 ${HOME_AUTO_MIN_PER}분(추정) 기준</div>
      </div>
      <div class="hm-foot-card">
        <div class="hm-foot-t">연계 시스템 상태</div>
        <div class="hm-sys">${chips}</div>
        <div class="hm-foot-s">선행 CRM · AI PMO · SCM · 구매 → <b>실행예산</b> → 후행 ERP · BIX</div>
      </div>
    </div>`;
}

function openAutoDrawer() {
  const ov = document.getElementById('home-impact-drawer');
  if (!ov) return;
  ov.innerHTML = autoDrawerHtml();
  ov.classList.add('open');
}

function autoDrawerHtml() {
  const rows = HOME_AUTO_LOG.map(a => `
    <div class="hm-auto-row">
      <div class="hm-auto-tm">${a.time}</div>
      <div class="hm-auto-ct">
        <div class="hm-auto-t1">${a.title}
          <span class="hm-auto-sys">${a.sys}</span>
          <span class="hm-auto-grade ${a.grade === 'D' ? 'd' : 'r'}">${a.grade === 'D' ? 'D · 확정' : 'R · 규칙기반'}</span>
        </div>
        <div class="hm-auto-t2">${a.desc}${a.proj === 'all' ? '' : ' · ' + homeProjName(a.proj)}</div>
      </div>
    </div>`).join('');
  const saved = HOME_AUTO_COUNT * HOME_AUTO_MIN_PER;
  return `
    <div class="hm-drawer" onclick="event.stopPropagation()">
      <div class="hm-drawer-head">
        <div>
          <div class="hm-drawer-eyebrow">AI 자동 처리 내역</div>
          <strong>오늘 ${HOME_AUTO_COUNT}건 자동 반영</strong>
          <div class="hm-drawer-meta">선행 시스템 IF 수신 ${HOME_EVENT_TOTAL}건 · 사람 확인 없이 처리</div>
        </div>
        <button class="hm-drawer-x" onclick="closeImpactDrawer()" aria-label="닫기">✕</button>
      </div>
      <div class="hm-drawer-body">
        <div class="hm-auto-note">원천 IF가 <b>확정(D)</b>이거나, 계정 총액이 변하지 않는 <b>규칙기반(R)</b> 건은 확인 큐를 거치지 않고 자동 반영됩니다.</div>
        <div class="hm-drawer-sec-t">처리 내역 · 대표 ${HOME_AUTO_LOG.length}건</div>
        ${rows}
        <div class="hm-drawer-sec-t">후행 시스템 전송</div>
        <table class="hm-drawer-tbl">
          <tr class="h"><td>대상</td><td>내용</td><td class="n">상태</td></tr>
          <tr><td class="l">ERP</td><td>확정 실적 기표 연계</td><td class="n">전송 대기 3건</td></tr>
          <tr><td class="l">BIX</td><td>손익관리·보고 데이터</td><td class="n">전송 완료</td></tr>
        </table>
        <div class="hm-drawer-warn">⚠ 자동 반영 결과에서 PM 확인이 필요한 항목 <b>${homeOpenCount()}건</b>이 도출됐어요. 수기 처리 시 약 ${Math.floor(saved/60)}시간 ${saved%60}분이 걸리는 분량입니다.</div>
      </div>
      <div class="hm-drawer-foot">
        <button class="hm-btn" onclick="closeImpactDrawer()">닫기</button>
        <button class="hm-btn pri" onclick="closeImpactDrawer();document.getElementById('home-insight-block').scrollIntoView({behavior:'smooth',block:'start'})">확인이 필요한 것 보기 →</button>
      </div>
    </div>`;
}

function renderPmDashboard() {
  homeSelectedProject = 'all';
  homeCat = 'all';

  return `
    <div class="ai-workspace home2">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, 봄님</h1>
          <p>담당 9개 프로젝트 중 <b>3개</b>에서 계획과 실적이 벌어지고 있어요</p>
          <p class="home2-brief" id="home-brief">${homeBriefHtml()}</p>
        </div>

        ${homeAutoStripHtml()}

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="프로젝트를 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onfocus="showHomeExamples(true)" onblur="setTimeout(function(){showHomeExamples(false)},150)"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>
        <div class="home2-search-ex" id="home-search-ex" hidden>
          <button onmousedown="askExample('SKON 외주비가 왜 늘었어?')"><span class="ex-ag q">Q</span>SKON 외주비가 왜 늘었어?</button>
          <button onmousedown="askExample('실행예산 변경 화면 찾아줘')"><span class="ex-ag navi">N</span>실행예산 변경 화면 찾아줘</button>
          <button onmousedown="askExample('오늘 내가 처리해야 할 업무 알려줘')"><span class="ex-ag pilot">P</span>오늘 내가 처리해야 할 업무 알려줘</button>
          <button onmousedown="askExample('개발자 2명 더 투입하면 어떻게 돼?')"><span class="ex-ag pilot">P</span>개발자 2명 더 투입하면?</button>
        </div>

        <div class="hm-signal">${homeSignalBlockHtml()}</div>

        <div id="home-insight-block">${renderHomeInsightBlock()}</div>

        <div id="home-foot">${homeFootHtml()}</div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>`;
}

function renderLeadDashboard() {
  return `
    <div class="ai-workspace lead-workspace">
      <div class="ai-home-top">
        <div class="ai-brand">
          <strong>팀장 원가관리 뷰</strong>
          <span>팀 내 프로젝트 이슈 · 승인 지연 · 마감 위험 확인</span>
        </div>
        <div class="top-actions">
          ${renderRoleSwitch()}
          <button class="schedule-open-btn purchase-ref-btn" onclick="openPurchaseReference()">구매시스템 참고</button>
          <button class="schedule-open-btn" onclick="openSchedulePanel()">일정 확인</button>
        </div>
      </div>

      <section class="lead-dashboard">
        <div class="lead-headline">
          <div>
            <div class="ai-greeting">팀장 화면</div>
            <h1>팀 내 프로젝트에서<br>지금 봐야 할 문제를 모았습니다.</h1>
          </div>
          <div class="lead-summary-grid">
            <div><span>관리 프로젝트</span><strong>4</strong></div>
            <div><span>주의 필요</span><strong>3</strong></div>
            <div><span>승인 지연</span><strong>2</strong></div>
          </div>
        </div>

        <div class="lead-chatbox ai-chatbox">
          <input id="ai-main-query" type="text" placeholder="팀 프로젝트 이슈, 승인 지연, 마감 위험을 물어보세요..."
            onkeydown="if(event.key==='Enter') askCostAi()">
          <button class="ai-attach-btn" title="파일 첨부">⌕</button>
          <button class="ai-send-btn light" onclick="askCostAi()" title="질문하기">➜</button>
        </div>

        <div class="lead-ai-focus">
          <div class="lead-ai-card primary">
            <span>AI 판단</span>
            <strong>오늘은 승인 지연 2건과 15일 검수 마감을 먼저 보세요.</strong>
            <p>팀 전체 예산 흐름은 정상 범위지만, 인건비 승인요청이 SCM에서 지연되고 있어 월마감 전에 확정 금액이 흔들릴 수 있습니다.</p>
          </div>
          <div class="lead-ai-card">
            <span>위험 신호</span>
            <strong>외주비 계획 대비 투입확정 초과 가능성</strong>
            <p>출입통제 서버 교체 건은 외주비 확정 금액이 계획을 넘어설 가능성이 있어 PM 확인이 필요합니다.</p>
          </div>
          <div class="lead-ai-card">
            <span>마감 알림</span>
            <strong>15일 검수 마감 프로젝트 산출물 확인</strong>
            <p>검수 자료와 미결 이슈를 먼저 확인하면 일정 지연 가능성을 줄일 수 있습니다.</p>
          </div>
        </div>

        <div class="lead-bottom-grid">
          <div class="lead-panel">
            <div class="home-section-title">AI 추천 조치</div>
            <div class="lead-ai-note">
              <strong>PM에게 확인 요청할 항목만 추렸습니다.</strong>
              <span>1. 인건비 승인 지연 사유 확인<br>2. 외주비 투입확정 초과 가능성 검토<br>3. 15일 검수 마감 산출물 누락 여부 확인</span>
            </div>
          </div>
          <div class="lead-panel">
            <div class="home-section-title">바로가기</div>
            <div class="lead-action-list">
              <button onclick="openAiProjectBudget('cloud')">승인 지연 프로젝트 보기</button>
              <button onclick="openAiProjectBudget('erp')">예산 초과 위험 보기</button>
              <button onclick="openSchedulePanel()">이번 달 마감 일정 보기</button>
            </div>
          </div>
        </div>
      </section>
    </div>`;
}

// ============================================================
//  5차 — PJT 재무 현황(절대금액) + 월마감 사이클 워크플로우
//  ※ 앞의 3차 신호 레이어를 여기서 override 한다.
//    (프로젝트 규칙: 뒤에 정의된 코드가 앞을 override)
//  - 예산 여력(%)만으로는 규모 감이 없어 계약·계획·실적·잔여 절대금액을 병기
//  - 프로젝트 탭 선택에 연동 (선택 PJT의 전체 현황)
//  - 월마감 사이클: 계획확정 → 투입원가 입력 → 검수·확정 → 월마감 대사
//    → 자동 현행화 → 팀장 승인 (gap 보전 사이클을 화면에 드러냄)
// ============================================================

// 프로젝트별 계약금액(cp) + 계정별 [계정명, 수행원가 계획, 실적] · 단위: 억원
// 잔여 / 여력% / 원가율은 모두 아래 값에서 파생 계산한다(수치 불일치 방지).
const HOME_FIN = {
  skon:  { cp:30.8, mgap:0.334, acc:[['인건비',12.60,8.57],['외주비',9.90,9.50],['재료비',3.20,1.89],['경비',1.50,1.32],['A/S Cost',0,0]] },
  logi:  { cp:21.42, mgap:0.084, acc:[['인건비',8.20,5.30],['외주비',5.40,4.10],['재료비',2.30,1.40],['경비',1.00,0.82],['A/S Cost',0,0]] },
  migr:  { cp:32.3, mgap:0.052, acc:[['인건비',15.40,9.80],['외주비',7.80,6.30],['재료비',2.60,1.70],['경비',1.40,1.02],['A/S Cost',0,0]] },
  erp:   { cp:18.6, mgap:-0.021, acc:[['인건비',7.40,4.10],['외주비',4.20,2.30],['재료비',1.80,0.90],['경비',0.90,0.50],['A/S Cost',0,0]] },
  sec:   { cp:12.4, mgap:0.008, acc:[['인건비',5.10,1.90],['외주비',2.80,1.10],['재료비',1.20,0.40],['경비',0.60,0.20],['A/S Cost',0,0]] },
  cloud: { cp:24.8, mgap:0.036, acc:[['인건비',9.60,5.90],['외주비',5.80,3.70],['재료비',2.90,1.80],['경비',1.10,0.70],['A/S Cost',0,0]] },
  mob:   { cp:9.8, mgap:-0.012,  acc:[['인건비',4.20,2.00],['외주비',2.10,0.90],['재료비',0.80,0.30],['경비',0.50,0.20],['A/S Cost',0,0]] },
  dw:    { cp:15.2, mgap:0.018, acc:[['인건비',6.30,2.10],['외주비',3.40,1.10],['재료비',1.60,0.50],['경비',0.70,0.20],['A/S Cost',0,0]] },
  aidoc: { cp:4.6, mgap:0.004,  acc:[['인건비',2.10,0.45],['외주비',0.90,0.15],['재료비',0.40,0.05],['경비',0.30,0.05],['A/S Cost',0,0]] },
};

// 억원 → 읽기 쉬운 금액 문자열 (1억 미만은 만원으로)
function finAmt(v) {
  if (!v) return '—';
  if (v >= 1) return v.toFixed(2) + '억';
  return Math.round(v * 10000).toLocaleString() + '만원';
}
function finSigned(v) {
  if (!v) return '±0';
  return (v > 0 ? '+' : '-') + finAmt(Math.abs(v));
}
function finPct(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }

// 여력% → 신호 등급 (10% 미만 임박 · 20% 미만 주의)
function finLv(pct, plan) {
  if (!plan) return 'na';
  if (pct < 10) return 'risk';
  if (pct < 20) return 'warn';
  return 'ok';
}

// 선택된 프로젝트(또는 전체 합산)의 재무 요약을 파생 계산
function homeFinOf(id) {
  const ids = (id === 'all') ? HOME_PROJECTS.map(p => p.id) : [id];
  const names = HOME_FIN[ids[0]] ? HOME_FIN[ids[0]].acc.map(a => a[0]) : [];
  const acc = names.map((nm, i) => {
    let plan = 0, act = 0;
    ids.forEach(k => { const f = HOME_FIN[k]; if (f && f.acc[i]) { plan += f.acc[i][1]; act += f.acc[i][2]; } });
    const left = plan - act;
    const pct = plan ? (left / plan) * 100 : 0;
    return { name:nm, plan, act, left, pct, lv:finLv(pct, plan) };
  });
  let cp = 0, mgap = 0;
  ids.forEach(k => { if (HOME_FIN[k]) { cp += HOME_FIN[k].cp; mgap += (HOME_FIN[k].mgap || 0); } });
  const plan = acc.reduce((s, a) => s + a.plan, 0);
  const act = acc.reduce((s, a) => s + a.act, 0);
  return { cp, plan, act, mgap, left: plan - act, rate: cp ? (plan / cp) * 100 : 0,
           exec: plan ? (act / plan) * 100 : 0, acc, count: ids.length };
}

// ── PJT 전체 현황 요약 (절대금액) ──
function homeFinSummaryHtml() {
  const f = homeFinOf(homeSelectedProject);
  const nm = homeSelectedProject === 'all'
    ? `담당 ${f.count}개 프로젝트 합계`
    : homeProjName(homeSelectedProject);
  const rateLv = f.rate >= 85 ? 'risk' : f.rate >= 80 ? 'warn' : 'ok';
  const tile = (l, v, cls, sub) =>
    `<div class="hm-fin-t"><span class="hm-fin-l">${l}</span><b class="hm-fin-v ${cls || ''}">${v}</b>${sub ? `<span class="hm-fin-s">${sub}</span>` : ''}</div>`;
  return `<div class="hm-fin">
      <div class="hm-fin-head">
        <span class="hm-fin-nm">${nm}</span>
        <span class="hm-fin-tag ${rateLv}">예상 원가율 ${finPct(f.rate)}</span>
        <span class="hm-fin-note">관리 기준선 85% · 계약금액 대비 수행원가 계획</span>
      </div>
      <div class="hm-fin-grid">
        ${tile('계약금액', finAmt(f.cp), '')}
        ${tile('수행원가 계획', finAmt(f.plan), '')}
        ${tile('실적(집행)', finAmt(f.act), '', `집행률 ${finPct(f.exec)}`)}
        ${tile('잔여', finAmt(f.left), f.left / f.plan * 100 < 20 ? 'risk' : '', `여력 ${finPct(f.left / f.plan * 100)}`)}
        ${tile('당월 계획 대비 실적', finSigned(f.mgap), f.mgap > 0 ? 'risk' : '', '8월 마감 보전 대상')}
      </div>
    </div>`;
}

// ── Headroom 리본 — 여력% + 잔여 절대금액 병기 (프로젝트 연동) ──
function homeHeadroomHtml() {
  const f = homeFinOf(homeSelectedProject);
  const segs = f.acc.map(a => `
      <div class="hm-hr-seg">
        <div class="hm-hr-n"><i class="hm-hr-dot ${a.lv}"></i>${a.name}</div>
        <div class="hm-hr-v ${a.lv}">${a.lv === 'na' ? '해당없음' : finPct(a.pct)}</div>
        <div class="hm-hr-amt">${a.lv === 'na' ? '&nbsp;' : `잔여 <b>${finAmt(a.left)}</b>`}</div>
        <div class="hm-hr-bar"><i class="${a.lv}" style="width:${Math.max(0, Math.min(100, a.pct))}%"></i></div>
        <div class="hm-hr-pa">${a.plan ? `계획 ${finAmt(a.plan)} · 실적 ${finAmt(a.act)}` : '&nbsp;'}</div>
      </div>`).join('');
  return `<div class="hm-headroom">
      <div class="hm-hr-lbl">예산 여력<em>Headroom</em></div>
      ${segs}
    </div>`;
}

// ── Runway — 선택 프로젝트에서 가장 먼저 바닥나는 계정 ──
const HOME_RUNWAY_BY = {
  skon: { month:'11월', months:'2.8개월', delta:'계획 대비 +18%' },
  logi: { month:'12월', months:'3.6개월', delta:'계획 대비 +6%' },
  migr: { month:'익년 1월', months:'5.1개월', delta:'계획 대비 +3%' },
};
function homeRunwayHtml() {
  const f = homeFinOf(homeSelectedProject);
  const live = f.acc.filter(a => a.plan > 0);
  if (!live.length) return '';
  const worst = live.reduce((m, a) => (a.pct < m.pct ? a : m), live[0]);
  const key = homeSelectedProject === 'all' ? 'skon' : homeSelectedProject;
  const r = HOME_RUNWAY_BY[key];
  const calm = worst.pct >= 20 || !r;
  const t = calm
    ? `가장 여력이 낮은 계정은 <b>${worst.name} ${finPct(worst.pct)}</b> · 잔여 <b>${finAmt(worst.left)}</b>로 현재 소진 속도에서는 여유가 있어요`
    : `현재 소진 속도면 <b>${worst.name}는 ${r.month}에 바닥납니다</b> · 잔여 ${finAmt(worst.left)} · Runway ${r.months} · ${r.delta}`;
  return `<div class="hm-runway ${calm ? 'calm' : ''}">
      <span class="hm-runway-ic">${calm ? '📈' : '📉'}</span>
      <div class="hm-runway-t">${t}</div>
      <svg class="hm-runway-spark" width="120" height="26" viewBox="0 0 120 26" aria-hidden="true">
        <polyline points="${calm ? '0,20 20,19 40,17 60,16 80,14 100,13 118,11' : HOME_RUNWAY.spark}"
          fill="none" stroke="${calm ? '#12a46b' : '#e39a2a'}" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>`;
}

// ── 월마감 사이클 워크플로우 ──────────────────────────────
// 사용자 업무 개념: 월마감마다 계획-실적 gap을 보전하고, 투입원가를 즉시 입력해
// 계획과 실적을 맞춘다. 각 단계의 담당(PM/AI/팀장)과 남은 건수를 함께 보여준다.
// st: done(완료) · active(진행 중) · wait(대기)
const HOME_CYCLE = [
  { n:'계획 확정',      d:'8/10',  st:'done',   own:'PM',   note:'8월 계획 고정 완료' },
  { n:'투입원가 입력',  d:'~8/24', st:'active', own:'PM',   note:'미입력', cnt:3, go:'adjust' },
  { n:'검수·확정',      d:'8/25',  st:'wait',   own:'PM',   note:'확인 필요', cnt:2, go:'status' },
  { n:'월마감 대사',    d:'8/31',  st:'wait',   own:'시스템', note:'계획-실적 gap 보전' },
  { n:'자동 현행화',    d:'9/1',   st:'wait',   own:'AI',   note:'AI 자동 반영' },
  { n:'팀장 승인',      d:'9/3',   st:'wait',   own:'팀장', note:'승인 대기' },
];
const HOME_CYCLE_OWN = { 'PM':'pm', 'AI':'ai', '팀장':'lead', '시스템':'sys' };

function homeCycleHtml() {
  const f = homeFinOf(homeSelectedProject);
  const gap = f.mgap;
  const doneN = HOME_CYCLE.filter(s => s.st === 'done').length;
  const steps = HOME_CYCLE.map((s, i) => {
    const ic = s.st === 'done' ? '✓' : (i + 1);
    const cnt = s.cnt ? `<span class="hm-cy-cnt">${s.note} ${s.cnt}건</span>` : `<span class="hm-cy-note">${s.n === '월마감 대사' ? 'gap ' + finSigned(gap) : s.note}</span>`;
    const click = s.go ? ` onclick="homeCycleGo('${s.go}')" role="button" tabindex="0"` : '';
    return `<div class="hm-cy-step ${s.st}${s.go ? ' clickable' : ''}"${click}>
        <div class="hm-cy-line"><span class="hm-cy-ic">${ic}</span></div>
        <div class="hm-cy-b">
          <div class="hm-cy-h"><b>${s.n}</b><span class="hm-cy-own ${HOME_CYCLE_OWN[s.own]}">${s.own}</span></div>
          <div class="hm-cy-d">${s.d}</div>
          ${cnt}
        </div>
      </div>`;
  }).join('');
  return `<div class="hm-cycle">
      <div class="hm-cy-head">
        <span class="hm-cy-tt">월마감 사이클 · 8월</span>
        <span class="hm-cy-prog">${doneN}/${HOME_CYCLE.length} 단계 완료</span>
        <span class="hm-cy-sys">당월 계획-실적 gap <b>${finSigned(gap)}</b> · 8월 마감 보전 대상</span>
      </div>
      <div class="hm-cy-track">${steps}</div>
    </div>`;
}
function homeCycleGo(kind) {
  if (kind === 'adjust' && typeof openCostAdjust === 'function') openCostAdjust('budgetMock');
  else if (typeof openCostStatus === 'function') openCostStatus('budgetMock');
}

// ── 신호 레이어 조립 (재무 요약 → 여력 → Runway → 월마감 사이클) ──
function homeSignalBlockHtml() {
  return homeFinSummaryHtml() + homeHeadroomHtml() + homeRunwayHtml() + homeCycleHtml();
}

// ── 프로젝트 전환/카드 처리 시 신호 레이어까지 함께 갱신 ──
function rerenderHomeFeed() {
  const el = document.getElementById('home-insight-block'); if (el) el.innerHTML = renderHomeInsightBlock();
  const br = document.getElementById('home-brief'); if (br) br.innerHTML = homeBriefHtml();
  const ft = document.getElementById('home-foot');  if (ft) ft.innerHTML = homeFootHtml();
  const sg = document.querySelector('.hm-signal');  if (sg) sg.innerHTML = homeSignalBlockHtml();
}

// ============================================================
//  6차 — 메인화면 단순화 (부문장님 지시: 구글 첫 화면처럼)
//  ※ 앞의 렌더 함수들을 여기서 override 한다.
//    (프로젝트 규칙: 뒤에 정의된 코드가 앞을 override)
//
//  · 상단 GNB 메뉴 / 우측 하단 네비 3개 → CSS로 숨김 (마크업은 유지)
//  · 제거: 예시 프롬프트 · 재무 요약 · 월마감 사이클 · 확인이 필요한 것 · 하단 요약
//  · 입력창 아래: 자동 처리 내역 + PJT 캐러셀(To-Do 건수순)
//  · PJT 클릭 → 팝업에서 해당 PJT의 확인 항목 + 상세까지 표시
// ============================================================

// 예산 신호는 Headroom + Runway만 남긴다 (재무 요약·월마감 사이클 제거)
function homeSignalBlockHtml() {
  return homeHeadroomHtml() + homeRunwayHtml();
}

// ── 입력창 아래 영역 — 자동 처리 내역 + PJT 캐러셀 ──
// 처리 완료된 항목은 제외한 "남은 확인 건수" (homeInsightCount는 전체 건수를 세므로 별도 정의)
function homeOpenCountOf(id) {
  return HOME_FEED.filter(i => i.proj === id && !homeFeedState[feedKey(i)]).length;
}

function homePjtStripHtml() {
  // To-Do 많은 순 → 이름순. 담당 전체를 좌우로 훑을 수 있게 전부 노출한다.
  const list = HOME_PROJECTS.slice().sort((a, b) => {
    const d = homeOpenCountOf(b.id) - homeOpenCountOf(a.id);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
  const chips = list.map(p => {
    const n = homeOpenCountOf(p.id);
    return `
        <button class="hm-ptab hm-pjt-chip ${n ? '' : 'calm'}" onclick="openHomePjtModal('${p.id}')"
          title="${p.name} · 확인 필요 ${n}건">
          <span class="hm-ptab-name">${p.name}</span>
          <span class="hm-ptab-badge ${n ? 'on' : ''}">${n}</span>
        </button>`;
  }).join('');
  const total = homeOpenCount();
  return `
    <div class="hm-under">
      <div class="hm-under-bar">
        <button class="hm-under-auto" onclick="openAutoDrawer()">
          <span class="hm-under-auto-ic">⚡</span>자동 처리 내역 <b>${HOME_AUTO_COUNT}건</b> 보기
        </button>
        <span class="hm-under-sum">담당 ${HOME_PROJECTS.length}개 · 확인 필요 <b>${total}건</b></span>
      </div>
      <div class="hm-ptabs-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="hm-ptabs-track">${chips}</div>
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
      </div>
    </div>`;
}

// ── PJT 팝업 ─────────────────────────────────────────────
// list 모드: 해당 PJT의 확인 항목 카드 / detail 모드: 카드 상세 (팝업 안에서 전환)
let homePjtModalProj = null;

function openHomePjtModal(id) {
  homePjtModalProj = id;
  const ov = document.getElementById('home-pjt-modal');
  if (!ov) return;
  ov.innerHTML = homePjtModalHtml(id);
  ov.classList.add('open');
}
function closeHomePjtModal() {
  homePjtModalProj = null;
  const ov = document.getElementById('home-pjt-modal');
  if (ov) ov.classList.remove('open');
}
function homePjtModalRerender() {
  if (!homePjtModalProj) return;
  const ov = document.getElementById('home-pjt-modal');
  if (ov) ov.innerHTML = homePjtModalHtml(homePjtModalProj);
}

function homePjtModalHtml(id) {
  const items = HOME_FEED.filter(i => i.proj === id);
  const open = items.filter(i => !homeFeedState[feedKey(i)]).length;
  const f = (typeof homeFinOf === 'function') ? homeFinOf(id) : null;
  let body;
  if (!items.length) {
    body = `<div class="hm-empty">이 프로젝트는 지금 확인할 항목이 없어요. 정상 범위입니다.</div>`;
  } else {
    const budget = items.filter(i => i.cat === 'budget');
    const work = items.filter(i => i.cat === 'work');
    body = '';
    if (budget.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot budget"></span>예산 점검 <em>MIS 데이터에서 발견한 시그널</em></div>` + budget.map(feedCard).join('');
    if (work.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot work"></span>업무 반영 <em>외부 이벤트 → 원가 영향 → 필요한 업무</em></div>` + work.map(feedCard).join('');
  }
  return `
    <div class="hm-pm" onclick="event.stopPropagation()">
      <div class="hm-pm-head">
        <div>
          <div class="hm-pm-eyebrow">${homeProjName(id)}</div>
          <strong>확인이 필요한 것 ${open}가지</strong>
          ${f ? `<div class="hm-pm-meta">계약 ${finAmt(f.cp)} · 수행원가 계획 ${finAmt(f.plan)} · 예상 원가율 ${finPct(f.rate)}</div>` : ''}
        </div>
        <button class="hm-drawer-x" onclick="closeHomePjtModal()" aria-label="닫기">✕</button>
      </div>
      <div class="hm-pm-body" id="home-pjt-body">${body}</div>
    </div>`;
}

// 카드 상세 — 팝업 안에서 단계 전환 (뒤로 가면 목록 복귀)
function homePjtDetailHtml(it) {
  const pv = it.preview;
  const key = feedKey(it);
  const reflect = pv.mode === 'reflect';
  const rows = pv.rows.map(r => `<tr><td class="l">${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td><td class="n ${/^[+]/.test(r[3]) ? 'up' : /^-/.test(r[3]) ? 'down' : ''}">${r[3]}</td></tr>`).join('');
  const fc = pv.forecast;
  return `
      <button class="hm-pm-back" onclick="homePjtModalRerender()">‹ 확인 항목 목록으로</button>
      <div class="hm-pm-dt">
        <div class="hm-pm-dt-h">
          <span class="hm-pm-dt-eyebrow">${reflect ? '수행원가 반영 미리보기' : '원가 영향 확인'}</span>
          <strong>${pv.title}</strong>
          <span class="hm-pm-dt-meta">확정일 ${pv.date} · ${homeProjName(it.proj)}</span>
        </div>
        <div class="hm-drawer-sec-t">변경내용</div>
        <table class="hm-drawer-tbl"><tr class="h"><td>항목</td><td class="n">현재 계획</td><td class="n">확정</td><td class="n">증감</td></tr>${rows}</table>
        <div class="hm-drawer-sec-t">반영 후 Project Forecast</div>
        <div class="hm-fc">
          <div class="hm-fc-item"><span>예상원가</span><div class="hm-fc-v">${fc.cost[0]} <i>→</i> <b>${fc.cost[1]}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.cost[2]) ? 'up' : /^-/.test(fc.cost[2]) ? 'down' : ''}">${fc.cost[2]}</span></div>
          <div class="hm-fc-item"><span>예상 원가율</span><div class="hm-fc-v">${fc.rate[0]} <i>→</i> <b>${fc.rate[1]}</b></div><span class="hm-fc-d ${/^[+]/.test(fc.rate[2]) ? 'up' : /^-/.test(fc.rate[2]) ? 'down' : ''}">${fc.rate[2]}</span></div>
        </div>
        ${pv.warning ? `<div class="hm-drawer-warn">⚠ ${pv.warning}</div>` : ''}
        <div class="hm-pm-dt-foot">
          <button class="hm-btn" onclick="homePjtModalRerender()">취소</button>
          ${reflect
            ? `<button class="hm-btn pri" onclick="feedReflectApply('${key}')">원가 조정안에 반영</button>`
            : `<button class="hm-btn pri" onclick="closeHomePjtModal();openCostAdjust('budgetMock')">원가 조정으로 이동 →</button>`}
        </div>
      </div>`;
}

// 팝업이 열려 있으면 상세를 드로어가 아니라 팝업 안에 그린다
function openImpactDrawer(key) {
  const it = HOME_FEED.find(i => feedKey(i) === key);
  if (!it || !it.preview) return;
  if (homePjtModalProj) {
    const b = document.getElementById('home-pjt-body');
    if (b) { b.innerHTML = homePjtDetailHtml(it); b.scrollTop = 0; return; }
  }
  impactDrawerKey = key;
  const ov = document.getElementById('home-impact-drawer');
  if (!ov) return;
  ov.innerHTML = impactDrawerHtml(it);
  ov.classList.add('open');
}

// 반영/확인 처리 후 팝업도 함께 갱신
function feedReflectApply(key) {
  homeFeedState[key] = 'reflected';
  rerenderHomeFeed();
  if (homePjtModalProj) homePjtModalRerender(); else closeImpactDrawer();
  showToast('원가 조정안(Draft V5)에 반영했어요.');
}

// 메인 재렌더 — 제거된 영역은 더 이상 갱신하지 않는다
function rerenderHomeFeed() {
  const br = document.getElementById('home-brief'); if (br) br.innerHTML = homeBriefHtml();
  const sg = document.querySelector('.hm-signal'); if (sg) sg.innerHTML = homeSignalBlockHtml();
  const un = document.getElementById('home-under'); if (un) un.innerHTML = homePjtStripHtml();
}

// ── 메인화면 — 단순화 버전 ──
function renderPmDashboard() {
  homeSelectedProject = 'all';
  homeCat = 'all';

  return `
    <div class="ai-workspace home2 home-simple">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, 봄님</h1>
          <p class="home2-brief" id="home-brief">${homeBriefHtml()}</p>
        </div>

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="원하는 업무를 입력하세요 — 화면을 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>

        <div id="home-under">${homePjtStripHtml()}</div>

        <div class="hm-signal">${homeSignalBlockHtml()}</div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

// ── 6차-3 — 메인화면에서 예산 여력(Headroom)·Runway 제거 ──
// 부문장님 지시(구글 첫 화면처럼 단순화)에 따라 메인에서는 걷어낸다.
// 함수 자체는 남겨두어 PJT 팝업/상세화면에서 재사용할 수 있게 한다.
function renderPmDashboard() {
  // 선택된 PJT는 화면을 다녀와도 유지한다 (대화 문맥이므로 초기화하지 않음)
  homeCat = 'all';

  return `
    <div class="ai-workspace home2 home-simple">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, 봄님</h1>
          <p class="home2-brief" id="home-brief">${homeBriefHtml()}</p>
        </div>

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="원하는 업무를 입력하세요 — 화면을 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>

        <div id="home-under">${homePjtStripHtml()}</div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

// ============================================================
//  7차 — 메뉴 토글 · PJT 선택 문맥 · 간결 팝업 · LLM 대화
//  ※ 공유 파일(index.html · app.js)은 수정하지 않고,
//    버튼은 JS로 주입하고 함수는 파일 끝 override로 처리한다.
// ============================================================

// ── ③ 상단 메뉴 토글 버튼 (구매시스템 ▦ 버튼과 동일 사이즈의 회색 버튼) ──
// index.html이 공유 파일이라 마크업을 넣지 않고 .tb-right에 주입한다.
function homeMenuToggle() {
  document.body.classList.toggle('menu-shown');
  const on = document.body.classList.contains('menu-shown');
  const b = document.getElementById('tb-menu-toggle');
  if (b) {
    b.classList.toggle('on', on);
    b.title = on ? '상단 메뉴 숨기기' : '상단 메뉴 보기';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

(function injectMenuToggle() {
  function bind() {
    const right = document.querySelector('.topbar .tb-right');
    if (!right) { setTimeout(bind, 300); return; }
    if (document.getElementById('tb-menu-toggle')) return;
    const b = document.createElement('button');
    b.id = 'tb-menu-toggle';
    b.className = 'tb-menu-toggle';
    b.type = 'button';
    b.textContent = '☰';
    b.title = '상단 메뉴 보기';
    b.setAttribute('aria-label', '상단 메뉴 표시 전환');
    b.setAttribute('aria-pressed', 'false');
    b.onclick = homeMenuToggle;
    const apps = right.querySelector('.tb-apps');
    if (apps) right.insertBefore(b, apps); else right.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── ② PJT 캐러셀 = 선택 (팝업 아님) ──
// 선택된 PJT는 chatbot 질의의 문맥이 된다.
function selectHomePjt(id) {
  homeSelectedProject = (homeSelectedProject === id) ? 'all' : id;
  const un = document.getElementById('home-under');
  if (un) un.innerHTML = homePjtStripHtml();
}
function clearHomePjt() { selectHomePjt(homeSelectedProject); }

function homePjtLabel() {
  return homeSelectedProject === 'all' ? '' : homeProjName(homeSelectedProject);
}

function homePjtStripHtml() {
  const list = HOME_PROJECTS.slice().sort((a, b) => {
    const d = homeOpenCountOf(b.id) - homeOpenCountOf(a.id);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
  const chips = list.map(p => {
    const n = homeOpenCountOf(p.id);
    const on = homeSelectedProject === p.id;
    return `
        <button class="hm-ptab hm-pjt-chip ${on ? 'picked' : ''} ${n ? '' : 'calm'}"
          onclick="selectHomePjt('${p.id}')" aria-pressed="${on}"
          title="${p.name} · 이름 클릭=프로젝트 선택${n ? ` · 숫자 클릭=확인 항목 ${n}건 보기` : ''}">
          ${on ? '<span class="hm-pjt-check">✓</span>' : ''}
          <span class="hm-ptab-name">${p.name}</span>
          <span class="hm-ptab-badge ${n ? 'on clickable' : ''}"${n ? ` role="button" tabindex="0" title="확인 항목 ${n}건 보기" onclick="event.stopPropagation();openHomePjtModal('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openHomePjtModal('${p.id}')}"` : ''}>${n}</span>
        </button>`;
  }).join('');
  const picked = homePjtLabel();
  const ctx = picked
    ? `<div class="hm-ctx"><span class="hm-ctx-l">선택된 프로젝트</span><b>${picked}</b>
         <span class="hm-ctx-d">이 프로젝트를 기준으로 답변해요</span>
         <button class="hm-ctx-x" onclick="clearHomePjt()" aria-label="선택 해제">✕</button></div>`
    : `<div class="hm-ctx off"><span class="hm-ctx-d">프로젝트를 선택하면 그 프로젝트를 기준으로 답변해요</span></div>`;
  return `
    <div class="hm-under">
      ${ctx}
      <div class="hm-under-bar">
        <button class="hm-under-auto" onclick="openAutoDrawer()">
          <span class="hm-under-auto-ic">⚡</span>자동 처리 내역 <b>${HOME_AUTO_COUNT}건</b> 보기
        </button>
        <span class="hm-under-sum">담당 ${HOME_PROJECTS.length}개 · 확인 필요 <b>${homeOpenCount()}건</b></span>
      </div>
      <div class="hm-ptabs-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="hm-ptabs-track">${chips}</div>
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
      </div>
    </div>`;
}

// ── 간결 팝업 — "AI 추천 변경안" 제거, 하단 버튼으로 화면 이동 ──
function homePjtModalHtml(id) {
  const items = HOME_FEED.filter(i => i.proj === id && !homeFeedState[feedKey(i)]);
  let body;
  if (!items.length) {
    body = `<div class="hm-empty">이 프로젝트는 지금 확인할 항목이 없어요. 정상 범위입니다.</div>`;
  } else {
    body = items.map(it => homePjtSlimCard(it)).join('');
  }
  return `
    <div class="hm-pm" onclick="event.stopPropagation()">
      <div class="hm-pm-head">
        <div>
          <div class="hm-pm-eyebrow">${homeProjName(id)}</div>
          <strong>확인이 필요한 것 ${items.length}가지</strong>
        </div>
        <button class="hm-drawer-x" onclick="closeHomePjtModal()" aria-label="닫기">✕</button>
      </div>
      <div class="hm-pm-body" id="home-pjt-body">${body}</div>
      <div class="hm-pm-foot">
        <button class="hm-btn" onclick="closeHomePjtModal()">닫기</button>
        <button class="hm-btn pri" onclick="closeHomePjtModal();openCostStatus('budgetMock')">원가 현황으로 이동 →</button>
        <button class="hm-btn pri" onclick="closeHomePjtModal();openCostAdjust('budgetMock')">원가 조정으로 이동 →</button>
      </div>
    </div>`;
}

// 카드 1장 — 태그 · 제목 · 핵심 수치 한 줄 (추천 변경안 없음)
function homePjtSlimCard(it) {
  const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
  const sev = it.sev === 'danger' ? 'danger' : it.sev === 'warning' ? 'warning' : 'info';
  let line = '';
  if (it.change) line = `${it.change.fromL} ${it.change.from} → ${it.change.toL} ${it.change.to} <b class="up">${it.change.delta}</b>`;
  else if (it.dual) line = `${it.dual.leftL} ${it.dual.left} → ${it.dual.rightL} ${it.dual.right} <b class="up">${it.dual.delta}</b>`;
  else if (it.flow) line = `${it.flow.sSub} ${it.flow.sVal} · ${it.flow.iL} <b class="${/-/.test(it.flow.iVal) ? 'down' : 'up'}">${it.flow.iVal}</b>`;
  return `
      <div class="hm-slim ${sev}">
        <div class="hm-slim-top">
          <span class="hm-slim-tag ${sev}">${it.cat === 'budget' ? '예산 점검' : '업무 반영'} · ${it.sub}</span>
          ${ai ? `<span class="hm-chip impact ${/^-/.test(ai.impact) ? 'down' : 'up'}">임팩트 ${ai.impact}</span>
                  <span class="hm-chip due ${ai.dueDays <= 3 ? 'near' : ''}">D-${ai.dueDays}</span>` : ''}
        </div>
        <div class="hm-slim-t">${it.title}</div>
        ${line ? `<div class="hm-slim-n">${line}</div>` : ''}
      </div>`;
}

// ── 9차 — 상단 메뉴 토글 상태 기억 ─────────────────────────
// 기본은 숨김(부문장님 지시: 단순한 첫 화면)이지만, 실무자가 ☰ 버튼으로 켜면
// 그 선택을 브라우저에 저장해 새로고침·재접속해도 유지한다.
// (메뉴가 없어 작업이 불편하다는 팀 피드백을 기본값을 바꾸지 않고 해소)
const MENU_PREF_KEY = 'newmis.menuShown';

function menuPrefGet() {
  try { return localStorage.getItem(MENU_PREF_KEY) === '1'; } catch (e) { return false; }
}
function menuPrefSet(on) {
  try { localStorage.setItem(MENU_PREF_KEY, on ? '1' : '0'); } catch (e) { /* 사생활 모드 등 */ }
}

function syncMenuToggleBtn() {
  const on = document.body.classList.contains('menu-shown');
  const b = document.getElementById('tb-menu-toggle');
  if (!b) return;
  b.classList.toggle('on', on);
  b.title = on ? '상단 메뉴 숨기기' : '상단 메뉴 보기';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function homeMenuToggle() {
  const on = !document.body.classList.contains('menu-shown');
  document.body.classList.toggle('menu-shown', on);
  menuPrefSet(on);
  syncMenuToggleBtn();
}

// 저장된 선택을 화면에 적용 + 버튼 주입(중복 주입 방지)
(function applyMenuPref() {
  function bind() {
    const right = document.querySelector('.topbar .tb-right');
    if (!right) { setTimeout(bind, 300); return; }
    if (menuPrefGet()) document.body.classList.add('menu-shown');
    if (!document.getElementById('tb-menu-toggle')) {
      const b = document.createElement('button');
      b.id = 'tb-menu-toggle';
      b.className = 'tb-menu-toggle';
      b.type = 'button';
      b.textContent = '☰';
      b.setAttribute('aria-label', '상단 메뉴 표시 전환');
      b.onclick = homeMenuToggle;
      const apps = right.querySelector('.tb-apps');
      if (apps) right.insertBefore(b, apps); else right.appendChild(b);
    }
    syncMenuToggleBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ============================================================
//  10차 — 메인화면 재배치 · 도킹 채팅 재열기
//  배치: PJT 캐러셀 (위) → 선택된 프로젝트 (중간) → chatbot 입력창 (아래)
//  모두 입력창과 같은 720px 폭에 맞춘다.
// ============================================================

// ── 입력창 위 영역 — 캐러셀 + 선택 문맥 (자동 처리 내역 버튼은 대화창으로 이동) ──
function homePjtStripHtml() {
  const list = HOME_PROJECTS.slice().sort((a, b) => {
    const d = homeOpenCountOf(b.id) - homeOpenCountOf(a.id);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
  const chips = list.map(p => {
    const n = homeOpenCountOf(p.id);
    const on = homeSelectedProject === p.id;
    return `
        <button class="hm-ptab hm-pjt-chip ${on ? 'picked' : ''} ${n ? '' : 'calm'}"
          onclick="selectHomePjt('${p.id}')" aria-pressed="${on}"
          title="${p.name} · 이름 클릭=프로젝트 선택${n ? ` · 숫자 클릭=확인 항목 ${n}건 보기` : ''}">
          ${on ? '<span class="hm-pjt-check">✓</span>' : ''}
          <span class="hm-ptab-name">${p.name}</span>
          <span class="hm-ptab-badge ${n ? 'on clickable' : ''}"${n ? ` role="button" tabindex="0" title="확인 항목 ${n}건 보기" onclick="event.stopPropagation();openHomePjtModal('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openHomePjtModal('${p.id}')}"` : ''}>${n}</span>
        </button>`;
  }).join('');
  const picked = homePjtLabel();
  const ctx = picked
    ? `<div class="hm-ctx"><span class="hm-ctx-l">선택된 프로젝트</span><b>${picked}</b>
         <span class="hm-ctx-d">이 프로젝트를 기준으로 답변해요</span>
         <button class="hm-ctx-x" onclick="clearHomePjt()" aria-label="선택 해제">✕</button></div>`
    : `<div class="hm-ctx off"><span class="hm-ctx-d">프로젝트를 선택하면 그 프로젝트를 기준으로 답변해요</span></div>`;
  return `
    <div class="hm-under">
      <div class="hm-under-head">
        <span class="hm-under-t">담당 프로젝트 <b>${HOME_PROJECTS.length}</b></span>
        <span class="hm-under-sum">확인 필요 <b>${homeOpenCount()}건</b></span>
      </div>
      <div class="hm-ptabs-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="hm-ptabs-track">${chips}</div>
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
      </div>
      ${ctx}
    </div>`;
}

// ── 메인화면 — 캐러셀 → 선택 문맥 → 입력창 ──
function renderPmDashboard() {
  // 선택된 PJT는 화면을 다녀와도 유지한다 (대화 문맥이므로 초기화하지 않음)
  homeCat = 'all';

  return `
    <div class="ai-workspace home2 home-simple">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, 봄님</h1>
        </div>

        <div id="home-under">${homePjtStripHtml()}</div>

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="원하는 업무를 입력하세요 — 화면을 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

// 히어로 브리핑 문구를 없앴으므로 갱신 대상에서 제외
function rerenderHomeFeed() {
  const un = document.getElementById('home-under'); if (un) un.innerHTML = homePjtStripHtml();
}

// ============================================================
//  13차 — 메인화면을 "해야 할 일 / 이상징후"로 재구성 · 사용자 전환
//
//  부문장님 지시: 첫 화면에서 PM이 하는 일은 ① 새로운 일의 편성 ② 기존 일의 조정.
//  → 프롬프트로 물어봐야 알 수 있는 게 아니라, 들어오면 바로 보이게 한다.
//
//  데이터 기준: 해야 할 일은 원가조정 화면의 승인 대기 제안(AGENT_PROPOSALS_FINAL)을
//  그대로 쓴다. 메인에서 본 건을 클릭하면 상세 화면에 같은 건이 있어 흐름이 끊기지 않는다.
// ============================================================

const HOME_USERS = {
  pm: { key:'pm', name:'이봄', role:'PM', greet:'봄님', desc:'편성하고 조정할 일' },
};
let homeUser = 'pm';

function homeUserNow() { return HOME_USERS[homeUser] || HOME_USERS.pm; }

function switchHomeUser(key) {
  if (!HOME_USERS[key]) return;
  homeUser = key;
  dashboardRole = (key === 'lead') ? 'lead' : 'pm';
  syncTopUser();
  closeUserMenu();
  if (typeof showMain === 'function') showMain();
  // showMain()은 화면 전환만 하고 대시보드를 다시 그리지 않으므로 직접 재렌더한다
  if (typeof initDashboard === 'function') initDashboard();
  if (typeof showToast === 'function') showToast(HOME_USERS[key].name + ' ' + HOME_USERS[key].role + ' 화면으로 전환했어요.');
}

// 상단 사용자 영역 — 클릭하면 전환 메뉴 (index.html은 공유 파일이라 JS로 붙인다)
function syncTopUser() {
  const u = homeUserNow();
  const n = document.querySelector('.tb-user .tb-user-name');
  const r = document.querySelector('.tb-user .tb-user-role');
  if (n) n.textContent = u.name + ' 님';
  if (r) r.textContent = u.role;
}
function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  const m = document.getElementById('tb-user-menu');
  if (m) m.classList.toggle('open');
}
function closeUserMenu() {
  const m = document.getElementById('tb-user-menu');
  if (m) m.classList.remove('open');
}
(function injectUserSwitch() {
  function bind() {
    const box = document.querySelector('.topbar .tb-user');
    if (!box) { setTimeout(bind, 300); return; }
    if (document.getElementById('tb-user-menu')) return;
    // 전환할 사용자가 하나뿐이면 드롭다운을 만들지 않는다
    if (Object.keys(HOME_USERS).length < 2) { syncTopUser(); return; }
    box.classList.add('switchable');
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.setAttribute('title', '사용자 전환');
    box.onclick = toggleUserMenu;
    const m = document.createElement('div');
    m.id = 'tb-user-menu';
    m.className = 'tb-user-menu';
    m.innerHTML = Object.keys(HOME_USERS).map(function (k) {
      const u = HOME_USERS[k];
      return `<button class="tb-user-opt" onclick="switchHomeUser('${k}')">
          <b>${u.name} 님</b><span>${u.role}</span><em>${u.desc}</em>
        </button>`;
    }).join('');
    box.appendChild(m);
    document.addEventListener('click', function (ev) {
      if (!box.contains(ev.target)) closeUserMenu();
    });
    syncTopUser();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 금액 표기 (원 단위) ──
function homeWon(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(2) + '억';
  if (Math.abs(n) >= 10000) return Math.round(n / 10000).toLocaleString() + '만원';
  return n.toLocaleString() + '원';
}
function homeWonDelta(from, to) {
  const d = (Number(to) || 0) - (Number(from) || 0);
  return (d > 0 ? '+' : d < 0 ? '-' : '') + homeWon(Math.abs(d));
}

// ── PM의 해야 할 일 = 원가조정 승인 대기 제안 (같은 데이터) ──
function homeTodoPm() {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined') return [];
  return AGENT_PROPOSALS_FINAL.filter(function (p) { return p.status === 'pending'; });
}

// ── 팀장의 해야 할 일 = PM이 상신한 결재 대기 ──
const HOME_LEAD_APPROVALS = [
  { id:'la-01', acct:'외주비', by:'이봄 PM', at:'2026-08-27 14:20',
    title:'외주비 4분기 계획 증액 결재 요청',
    why:'구매견적 24,500,000원이 계획을 4,500,000원 넘어 PO 발행이 막혀 있습니다.',
    from:865250000, to:869750000, ctrl:'직책자 승인' },
  { id:'la-02', acct:'인건비', by:'이봄 PM', at:'2026-08-27 11:05',
    title:'SCM 확정 인력 2명 추가 편성 결재 요청',
    why:'SCM에서 확정된 인력 2명(10.5MM)을 인건비에 편성하지 않으면 투입 시점에 집행할 예산이 없습니다.',
    from:650499999, to:716749999, ctrl:'직책자 승인' },
];
function homeTodoLead() { return HOME_LEAD_APPROVALS; }

function homeTodoItems() { return homeUser === 'lead' ? homeTodoLead() : homeTodoPm(); }

// ── 이상징후 = MIS 데이터에서 발견한 위험 신호 ──
function homeRiskItems() {
  return HOME_FEED.filter(function (i) {
    return i.cat === 'budget' && !homeFeedState[feedKey(i)]
      && (homeSelectedProject === 'all' || i.proj === homeSelectedProject);
  });
}

// ── 해야 할 일 카드 ──
function homeTodoCardHtml(it) {
  const lead = homeUser === 'lead';
  const delta = homeWonDelta(it.from, it.to);
  const up = /^\+/.test(delta);
  return `
    <button class="hm-task" onclick="homeTodoGo('${escAttr(it.acct)}')">
      <span class="hm-task-top">
        <span class="hm-task-acct ${homeAcctCls(it.acct)}">${escHtml(it.acct)}</span>
        ${lead ? `<span class="hm-task-by">${escHtml(it.by)}</span>` : `<span class="hm-task-trig">${escHtml(it.trigger || '')}</span>`}
        <span class="hm-task-delta ${up ? 'up' : 'down'}">${escHtml(delta)}</span>
      </span>
      <span class="hm-task-t">${escHtml(it.title)}</span>
      <span class="hm-task-w">${escHtml(it.why || '')}</span>
      <span class="hm-task-go">${lead ? '결재하러 가기' : '처리하러 가기'} ›</span>
    </button>`;
}
function homeAcctCls(a) {
  return a === '인건비' ? 'labor' : a === '외주비' ? 'outsource'
    : a === '재료비' ? 'material' : a === '경비' ? 'expense' : '';
}
// 해당 계정의 원가조정 편집기로 바로 진입 (상세에 같은 건이 있다)
function homeTodoGo(acct) {
  if (typeof openCostArea === 'function') openCostArea(acct, 'budgetMock');
  else if (typeof openCostAdjust === 'function') openCostAdjust('budgetMock');
}

// ── 이상징후 카드 ──
function homeRiskCardHtml(it) {
  const ai = (typeof homeAiOf === 'function') ? homeAiOf(it) : null;
  const sev = it.sev === 'danger' ? 'danger' : 'warning';
  let line = '';
  if (it.change) line = `${it.change.from} → ${it.change.to} <b class="up">${it.change.delta}</b>`;
  else if (it.dual) line = `${it.dual.left} → ${it.dual.right} <b class="up">${it.dual.delta}</b>`;
  return `
    <button class="hm-sig ${sev}" onclick="homeRiskGo('${escAttr(feedKey(it))}')">
      <span class="hm-task-top">
        <span class="hm-sig-tag ${sev}">${escHtml(it.sub)}</span>
        ${ai ? `<span class="hm-chip due ${ai.dueDays <= 3 ? 'near' : ''}">D-${ai.dueDays}</span>` : ''}
        ${ai ? `<span class="hm-task-delta up">임팩트 ${escHtml(ai.impact)}</span>` : ''}
      </span>
      <span class="hm-task-t">${escHtml(it.title)}</span>
      <span class="hm-task-w">${escHtml(homeProjName(it.proj))}${line ? ' · ' : ''}${line}</span>
      <span class="hm-task-go">원인 확인하기 ›</span>
    </button>`;
}
function homeRiskGo(key) {
  const it = HOME_FEED.find(function (i) { return feedKey(i) === key; });
  if (!it) return;
  if (typeof openAiChat === 'function') {
    openAiChat('main', (it.primary && it.primary.q) ? it.primary.q : (it.title + ' 원인 알려줘'));
  }
}

// ── 해야 할 일 / 이상징후 2단 구성 ──
function homeWorkBoardHtml() {
  const u = homeUserNow();
  const todos = homeTodoItems();
  const risks = homeRiskItems();
  const todoBody = todos.length
    ? todos.map(homeTodoCardHtml).join('')
    : `<div class="hm-board-empty">지금 ${homeUser === 'lead' ? '결재할' : '처리할'} 일이 없어요.</div>`;
  const riskBody = risks.length
    ? risks.map(homeRiskCardHtml).join('')
    : `<div class="hm-board-empty">발견된 이상징후가 없어요. 정상 범위입니다.</div>`;
  return `
    <div class="hm-board">
      <section class="hm-col todo">
        <div class="hm-col-h">
          <span class="hm-col-ic">✓</span>
          <b>${homeUser === 'lead' ? '결재해야 할 일' : '해야 할 일'}</b>
          <em>${todos.length}건</em>
          <span class="hm-col-d">${homeUser === 'lead' ? 'PM이 상신한 건' : '편성·조정이 필요한 건'}</span>
        </div>
        <div class="hm-col-b">${todoBody}</div>
      </section>
      <section class="hm-col risk">
        <div class="hm-col-h">
          <span class="hm-col-ic warn">!</span>
          <b>이상징후</b>
          <em>${risks.length}건</em>
          <span class="hm-col-d">데이터에서 발견한 신호</span>
        </div>
        <div class="hm-col-b">${riskBody}</div>
      </section>
    </div>`;
}

// ── 13차 — 메인화면 조립 (캐러셀은 필터로 유지, 아래에 해야 할 일/이상징후) ──
function renderPmDashboard() {
  homeCat = 'all';
  const u = homeUserNow();
  return `
    <div class="ai-workspace home2 home-simple">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, ${escHtml(u.greet)}</h1>
        </div>

        <div id="home-under">${homePjtStripHtml()}</div>

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="원하는 업무를 입력하세요 — 화면을 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>

        <div id="home-board">${homeWorkBoardHtml()}</div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

// 팀장도 같은 화면 구조를 쓴다 (목록 내용만 달라짐)
function initDashboard() {
  document.getElementById('s-main').innerHTML = renderPmDashboard();
  syncTopUser();
  if (typeof updateKpiMain === 'function') updateKpiMain();
}

// 캐러셀 필터·카드 처리 시 보드도 함께 갱신
function rerenderHomeFeed() {
  const un = document.getElementById('home-under'); if (un) un.innerHTML = homePjtStripHtml();
  const bd = document.getElementById('home-board'); if (bd) bd.innerHTML = homeWorkBoardHtml();
}
function selectHomePjt(id) {
  homeSelectedProject = (homeSelectedProject === id) ? 'all' : id;
  rerenderHomeFeed();
}

// ============================================================
//  14차 — 시나리오 PJT(30130020-D001) 일원화 · 월마감 단계별 원가조정
//
//  [메인 ↔ 상세 불일치 해결 방식]
//  기존 목업 프로젝트(key: budgetMock)는 이름만 '예산관리시스템 목업용'인 자리표시자였고,
//  월별 계획/실적·버전이력·인력배치 등 완전한 데이터를 이미 갖고 있다.
//  새 프로젝트를 만들어 데이터를 새로 채우면 이관 이력·인력 저장소가 비어 상세 화면이 깨진다.
//  → 같은 key(budgetMock)를 유지한 채 "표기만" 시나리오 PJT로 맞춘다.
//    이렇게 하면 메인에서 클릭 → 원가조정으로 갈 때 같은 프로젝트·같은 데이터가 그대로 이어진다.
//    (공유 파일을 편집하지 않고 런타임 값만 바꾼다)
// ============================================================

const SCEN_PJT = {
  key:'credit', no:'30130020-D001', name:'차세대 여신심사 시스템 구축',
  client:'KB국민은행', org:'금융·데이터사업본부', pm:'이봄', type:'SI-AD', stage:'본프로젝트',
};
// 팀원이 쓰는 기존 목업 프로젝트 (표기·데이터를 그대로 둔다)
const MOCK_PJT = { key:'budgetMock', no:'30131234-D001', name:'예산관리시스템 목업용' };

// (기존 목업 프로젝트의 표기를 바꾸지 않는다 — 신규 PJT는 아래에서 별도로 생성한다)

// 메인 캐러셀에도 시나리오 PJT를 맨 앞에 놓고 기본 선택으로 둔다
(function registerScenarioInHome() {
  if (typeof HOME_PROJECTS === 'undefined') return;
  if (HOME_PROJECTS.some(function (p) { return p.id === SCEN_PJT.key; })) return;
  HOME_PROJECTS.unshift({ id: SCEN_PJT.key, no: SCEN_PJT.no, name: SCEN_PJT.name });
  if (typeof HOME_FIN !== 'undefined' && !HOME_FIN[SCEN_PJT.key]) {
    // 계약 18.5억 · 수행원가 계획 15.86억 (계정별 계획/실적, 단위 억)
    HOME_FIN[SCEN_PJT.key] = { cp:18.5, mgap:0.152, acc:[
      ['인건비', 6.50, 4.62], ['외주비', 8.65, 6.90],
      ['재료비', 0.46, 0.21], ['경비', 0.25, 0.18], ['A/S Cost', 0, 0],
    ] };
  }
  homeSelectedProject = SCEN_PJT.key;
})();

// ── 월마감 사이클 단계 ─────────────────────────────────────
// budget-ax처럼 "시점마다 무슨 일이 벌어지는가"를 강제로 만들어 두고,
// 단계를 눌러가며 4대계정 원가조정 작업을 확인한다.
// 한 달 안에서 사람이 해야 할 일의 시간 축.
// 날짜와 완료 표시는 박아두지 않고 "현재 월"과 "실제 남은 일"에서 계산한다.
const CLOSE_STAGES = [
  { id:'plan',    n:'계획 확정',     own:'PM' },
  { id:'input',   n:'투입원가 입력', own:'PM' },
  { id:'inspect', n:'검수·확정',     own:'PM' },
  { id:'recon',   n:'월마감 대사',   own:'시스템' },
  { id:'auto',    n:'자동 현행화',   own:'AI' },
  { id:'approve', n:'팀장 승인',     own:'팀장' },
];

// 현재 월 기준 단계 일자 — 마감을 넘기면 자동으로 다음 달 날짜가 된다
function stageDateOf(id) {
  const parts = (typeof scenMonth === 'function' ? scenMonth() : '2026-08').split('-');
  const y = Number(parts[0]), m = Number(parts[1]);
  const last = new Date(y, m, 0).getDate();
  const nm = (m === 12) ? 1 : m + 1;
  switch (id) {
    case 'plan':    return m + '/10';
    case 'input':   return '~' + m + '/' + (last - 7);
    case 'inspect': return m + '/' + (last - 6);
    case 'recon':   return m + '/' + last;
    case 'auto':    return nm + '/1';
    case 'approve': return nm + '/3';
    default:        return '';
  }
}

// 단계 상태 — 남은 일이 있는 첫 단계가 '진행 중', 그 앞은 '완료', 뒤는 '대기'
function stageStateOf(id) {
  const order = CLOSE_STAGES.map(function (x) { return x.id; });
  const active = (typeof firstStageWithWork === 'function') ? firstStageWithWork() : 'input';
  const ai = order.indexOf(active), i = order.indexOf(id);
  if (i === ai) return 'active';
  return i < ai ? 'done' : 'wait';
}
let closeStage = 'plan';
function closeStageOf(id) { return CLOSE_STAGES.find(function (s) { return s.id === id; }) || CLOSE_STAGES[1]; }
function selectCloseStage(id) { closeStage = id; rerenderHomeFeed(); }

// 단계별 4대계정 작업 — 현재 단계(input)는 원가조정 Agent 콘솔의 실제 승인 대기와 동일하다.
// 지난 단계는 완료 기록, 다음 단계는 예정 작업으로 보여준다(상세에 아직 없는 건을 처리 대상처럼 보이지 않게).
const CLOSE_WORK = {
  plan: [
    { acct:'인건비', title:'8월 인건비 계획 확정',   note:'투입계획 기준 6.50억 확정', st:'done' },
    { acct:'외주비', title:'8월 외주비 계획 확정',   note:'외주구매 계획 라인 8.65억 확정', st:'done' },
    { acct:'재료비', title:'8월 재료비 계획 확정',   note:'0.46억 확정', st:'done' },
    { acct:'경비',   title:'8월 경비 계획 확정',     note:'0.25억 확정', st:'done' },
  ],
  inspect: [
    { acct:'외주비', title:'외주 검수 대상 3건 확정 필요', note:'검수 완료분만 실적으로 인식됩니다', st:'next' },
    { acct:'재료비', title:'구매 검수 지연 1건',           note:'검수가 밀리면 월마감 실적에 잡히지 않습니다', st:'next' },
  ],
  recon: [
    { acct:'전 계정', title:'계획 대비 실적 gap 보전',  note:'당월 gap +1,520만원 · 계정 간 이동으로 맞춥니다', st:'next' },
  ],
  auto: [
    { acct:'전 계정', title:'월마감 D+1 자동 현행화',  note:'AI가 확정 실적을 자동 반영합니다 (사람 개입 없음)', st:'next' },
  ],
  approve: [
    { acct:'외주비', title:'외주비 증액 결재',        note:'PM 상신 건을 팀장이 승인합니다', st:'next' },
    { acct:'인건비', title:'인건비 추가 편성 결재',   note:'PM 상신 건을 팀장이 승인합니다', st:'next' },
  ],
};

// ── 강제 이상징후 — budget-ax 시나리오를 이 PJT에서 재현 ──
const SCEN_RISKS = [
  { id:'sr-01', acct:'외주비', sev:'danger', scen:'예산 초과 (Overrun)',
    title:'외주비 누계 조정액이 승인 예산의 20%를 넘었습니다',
    why:'자가전결 한도를 벗어나 직책자 승인이 필요합니다. 승인 전까지 조정안은 Draft로 유지됩니다.',
    impact:'+1.85억', from:865250000, to:1050250000, stage:'input' },
  { id:'sr-02', acct:'인건비', sev:'warning', scen:'외주인력 투입 지연',
    title:'설계 인력 2명 투입이 1개월 지연됐습니다',
    why:'SCM 투입계획이 밀리면서 9월 인건비 계획이 집행되지 않습니다. 잔여 기간 재배치가 필요합니다.',
    impact:'-1,200만원', from:650499999, to:638499999, stage:'input' },
  { id:'sr-03', acct:'경비', sev:'warning', scen:'AI 예비비 감액 (RM 협조)',
    title:'의욕관리비 공동예산 잔액이 0원이 되었습니다',
    why:'같은 예산통을 쓰는 소계정 집행이 늘어 가용잔액이 소진됐습니다. RM 협조 승인이 필요합니다.',
    impact:'-150만원', from:24997578, to:23497578, stage:'input' },
  { id:'sr-04', acct:'재료비', sev:'danger', scen:'구매 검수 지연 · 종료 보류',
    title:'구매 검수가 지연돼 프로젝트 종료가 보류될 수 있습니다',
    why:'검수 미완료분이 월마감 실적에 잡히지 않아 종료 판정에서 미결 항목으로 남습니다.',
    impact:'종료 보류', from:46000000, to:46000000, stage:'inspect' },
];

// ── 14차 — 월마감 단계 레일 + 단계별 보드 ─────────────────

function homeStageRailHtml() {
  const cur = closeStage;
  const steps = CLOSE_STAGES.map(function (s, i) {
    const on = s.id === cur;
    const ic = s.st === 'done' ? '✓' : (i + 1);
    return `<button class="hm-st ${s.st} ${on ? 'on' : ''}" onclick="selectCloseStage('${s.id}')" aria-pressed="${on}">
        <span class="hm-st-ic">${ic}</span>
        <span class="hm-st-b"><b>${escHtml(s.n)}</b><em>${escHtml(s.d)} · ${escHtml(s.own)}</em></span>
      </button>`;
  }).join('');
  return `
    <div class="hm-stage">
      <div class="hm-stage-h">
        <span class="hm-stage-t">월마감 사이클 · 8월</span>
        <span class="hm-stage-pjt">${escHtml(SCEN_PJT.no)} · ${escHtml(SCEN_PJT.name)}</span>
      </div>
      <div class="hm-stage-track">${steps}</div>
    </div>`;
}

// 현재 단계(투입원가 입력)의 작업 = 원가조정 승인 대기와 동일한 건
function homeStageTodo() {
  if (closeStage === 'input') {
    return homeTodoPm().map(function (p) {
      return { acct:p.acct, title:p.title, note:p.why, trigger:p.trigger,
               from:p.from, to:p.to, st:'now' };
    });
  }
  return (CLOSE_WORK[closeStage] || []).slice();
}

function homeStageRisks() {
  return SCEN_RISKS.filter(function (r) { return r.stage === closeStage; });
}

function homeStageCardHtml(it) {
  const now = it.st === 'now';
  const delta = (it.from != null) ? homeWonDelta(it.from, it.to) : '';
  const up = /^\+/.test(delta);
  const cls = it.st === 'done' ? 'done' : it.st === 'next' ? 'next' : '';
  return `
    <button class="hm-task ${cls}" ${now ? `onclick="homeTodoGo('${escAttr(it.acct)}')"` : 'disabled'}>
      <span class="hm-task-top">
        <span class="hm-task-acct ${homeAcctCls(it.acct)}">${escHtml(it.acct)}</span>
        ${it.trigger ? `<span class="hm-task-trig">${escHtml(it.trigger)}</span>` : ''}
        ${it.st === 'done' ? '<span class="hm-task-st done">완료</span>' : ''}
        ${it.st === 'next' ? '<span class="hm-task-st next">예정</span>' : ''}
        ${delta ? `<span class="hm-task-delta ${up ? 'up' : 'down'}">${escHtml(delta)}</span>` : ''}
      </span>
      <span class="hm-task-t">${escHtml(it.title)}</span>
      <span class="hm-task-w">${escHtml(it.note || '')}</span>
      ${it.guide ? `<span class="hm-guide">
          <span class="hm-guide-r"><i>어디서</i>${escHtml(it.guide.where)}</span>
          <span class="hm-guide-r"><i>무엇을</i>${escHtml(it.guide.do)}</span>
          <span class="hm-guide-r"><i>확정 기준</i>${escHtml(it.guide.decide)}</span>
        </span>` : ''}
      ${now ? '<span class="hm-task-go">처리하러 가기 ›</span>' : ''}
    </button>`;
}

function homeScenRiskCardHtml(r) {
  const delta = (r.from !== r.to) ? homeWonDelta(r.from, r.to) : r.impact;
  return `
    <button class="hm-sig ${r.sev}" onclick="homeTodoGo('${escAttr(r.acct)}')">
      <span class="hm-task-top">
        <span class="hm-sig-tag ${r.sev}">${escHtml(r.scen)}</span>
        <span class="hm-task-acct ${homeAcctCls(r.acct)}">${escHtml(r.acct)}</span>
        <span class="hm-task-delta up">${escHtml(delta)}</span>
      </span>
      <span class="hm-task-t">${escHtml(r.title)}</span>
      <span class="hm-task-w">${escHtml(r.why)}</span>
      <span class="hm-task-go">원가조정에서 확인 ›</span>
    </button>`;
}

// ── 보드 — 단계 레일 + 해야 할 일 / 이상징후 ──
function homeWorkBoardHtml() {
  const lead = homeUser === 'lead';
  const todos = lead ? homeTodoLead() : homeStageTodo();
  const risks = homeStageRisks();
  const st = closeStageOf(closeStage);

  const todoBody = todos.length
    ? (lead ? todos.map(homeTodoCardHtml).join('') : todos.map(homeStageCardHtml).join(''))
    : `<div class="hm-board-empty">이 단계에서 ${lead ? '결재할' : '처리할'} 일이 없어요.</div>`;
  const riskBody = risks.length
    ? risks.map(homeScenRiskCardHtml).join('')
    : `<div class="hm-board-empty">이 단계에서 발견된 이상징후가 없어요.</div>`;

  return `
    ${lead ? '' : homeStageRailHtml()}
    <div class="hm-board">
      <section class="hm-col todo">
        <div class="hm-col-h">
          <span class="hm-col-ic">✓</span>
          <b>${lead ? '결재해야 할 일' : '해야 할 일'}</b>
          <em>${todos.length}건</em>
          <span class="hm-col-d">${lead ? 'PM이 상신한 건' : escHtml(st.n) + ' 단계 · 4대계정'}</span>
        </div>
        <div class="hm-col-b">${todoBody}</div>
      </section>
      <section class="hm-col risk">
        <div class="hm-col-h">
          <span class="hm-col-ic warn">!</span>
          <b>이상징후</b>
          <em>${risks.length}건</em>
          <span class="hm-col-d">시나리오로 발생시킨 신호</span>
        </div>
        <div class="hm-col-b">${riskBody}</div>
      </section>
    </div>`;
}

// 시나리오 PJT를 항상 대상으로 삼는다 (메인에서 클릭 → 같은 프로젝트 상세)
function homeTodoGo(acct) {
  const a = (acct === '전 계정') ? '인건비' : acct;
  if (typeof openCostArea === 'function') openCostArea(a, SCEN_PJT.key);
  else if (typeof openCostAdjust === 'function') openCostAdjust(SCEN_PJT.key);
}

// ── 14차 — 캐러셀: 시나리오 PJT를 맨 앞에 고정 ──
// 시나리오 PJT는 HOME_FEED가 아니라 월마감 단계 데이터로 건수를 센다.
function homeOpenCountOf(id) {
  if (id === SCEN_PJT.key) {
    return (homeUser === 'lead' ? homeTodoLead().length : homeStageTodo().filter(function (t) { return t.st === 'now'; }).length)
      + homeStageRisks().length;
  }
  return HOME_FEED.filter(function (i) { return i.proj === id && !homeFeedState[feedKey(i)]; }).length;
}

function homePjtStripHtml() {
  const rest = HOME_PROJECTS.filter(function (p) { return p.id !== SCEN_PJT.key; })
    .sort(function (a, b) {
      const d = homeOpenCountOf(b.id) - homeOpenCountOf(a.id);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
  const scen = HOME_PROJECTS.find(function (p) { return p.id === SCEN_PJT.key; });
  const list = scen ? [scen].concat(rest) : rest;

  const chips = list.map(function (p) {
    const n = homeOpenCountOf(p.id);
    const on = homeSelectedProject === p.id;
    const isScen = p.id === SCEN_PJT.key;
    return `
        <button class="hm-ptab hm-pjt-chip ${on ? 'picked' : ''} ${n ? '' : 'calm'} ${isScen ? 'scen' : ''}"
          onclick="selectHomePjt('${p.id}')" aria-pressed="${on}"
          title="${escHtml(p.name)} · 확인 필요 ${n}건">
          ${on ? '<span class="hm-pjt-check">✓</span>' : ''}
          ${isScen ? '<span class="hm-pjt-star" title="시나리오 프로젝트">★</span>' : ''}
          <span class="hm-ptab-name">${escHtml(p.name)}</span>
          <span class="hm-ptab-badge ${n ? 'on' : ''}">${n}</span>
        </button>`;
  }).join('');

  const picked = homePjtLabel();
  const ctx = picked
    ? `<div class="hm-ctx"><span class="hm-ctx-l">선택된 프로젝트</span><b>${escHtml(picked)}</b>
         <span class="hm-ctx-d">이 프로젝트를 기준으로 답변해요</span>
         <button class="hm-ctx-x" onclick="clearHomePjt()" aria-label="선택 해제">✕</button></div>`
    : `<div class="hm-ctx off"><span class="hm-ctx-d">프로젝트를 선택하면 그 프로젝트를 기준으로 답변해요</span></div>`;

  return `
    <div class="hm-under">
      <div class="hm-under-head">
        <span class="hm-under-t">담당 프로젝트 <b>${HOME_PROJECTS.length}</b></span>
        <span class="hm-under-sum">확인 필요 <b>${homeOpenCountOf(homeSelectedProject === 'all' ? SCEN_PJT.key : homeSelectedProject)}건</b></span>
      </div>
      <div class="hm-ptabs-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="hm-ptabs-track">${chips}</div>
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
      </div>
      ${ctx}
    </div>`;
}

// 시나리오 PJT가 아닌 프로젝트를 고르면 기존 HOME_FEED 기반 보드로 돌아간다
function homeStageTodo() {
  if (homeSelectedProject !== SCEN_PJT.key) {
    return HOME_FEED.filter(function (i) {
      return i.proj === homeSelectedProject && i.cat === 'work' && !homeFeedState[feedKey(i)];
    }).map(function (i) {
      return { acct: i.sub, title: i.title, note: (i.flow ? i.flow.aSub + ' ' + i.flow.aVal : ''), st: 'now' };
    });
  }
  if (closeStage === 'input') {
    return homeTodoPm().map(function (p) {
      return { acct:p.acct, title:p.title, note:p.why, trigger:p.trigger, from:p.from, to:p.to, st:'now' };
    });
  }
  return (CLOSE_WORK[closeStage] || []).slice();
}

function homeStageRisks() {
  if (homeSelectedProject !== SCEN_PJT.key) {
    return HOME_FEED.filter(function (i) {
      return i.proj === homeSelectedProject && i.cat === 'budget' && !homeFeedState[feedKey(i)];
    }).map(function (i) {
      const ai = (typeof homeAiOf === 'function') ? homeAiOf(i) : null;
      return { id:feedKey(i), acct:i.sub, sev:(i.sev === 'danger' ? 'danger' : 'warning'), scen:i.sub,
               title:i.title, why:(i.note || ''), impact:(ai ? ai.impact : ''), from:0, to:0, stage:closeStage };
    });
  }
  return SCEN_RISKS.filter(function (r) { return r.stage === closeStage; });
}

// ============================================================
//  15차 — 신규 시나리오 PJT 생성 (30130020-D001 차세대 여신심사 시스템 구축)
//
//  · 기존 '예산관리시스템 목업용'(budgetMock)은 팀원 작업이므로 그대로 둔다.
//  · CRM/PMO에서 넘어와 자동 생성된 직후 상태(실행예산 편성 대기)부터 시작해,
//    편성 → 조정 → 이상징후 → 승인 → 월마감 → 종료까지 전 case를 담는다.
//  · 수행원가 상세 화면이 정상 동작하도록 프로젝트별 저장소를 모두 채운다.
//    (EXEC_BUDGET_PROJECTS · BUDGET_SOURCE · budgetTransferHistory)
// ============================================================

(function createScenarioProject() {
  function bind() {
    try {
      if (typeof EXEC_BUDGET_PROJECTS === 'undefined' || typeof BUDGET_SOURCE === 'undefined'
          || typeof budgetMockMonth !== 'function') { setTimeout(bind, 300); return; }
      if (BUDGET_SOURCE[SCEN_PJT.key]) return;   // 이미 생성됨

      // ① 프로젝트 목록 (수행원가 화면의 프로젝트 선택에 나타난다)
      if (!EXEC_BUDGET_PROJECTS.some(function (x) { return x.key === SCEN_PJT.key; })) {
        EXEC_BUDGET_PROJECTS.unshift({
          key: SCEN_PJT.key, no: SCEN_PJT.no, name: SCEN_PJT.name, type: SCEN_PJT.type,
          status: '수행', pm: SCEN_PJT.pm, salesOrg: SCEN_PJT.org,
          customer: SCEN_PJT.client, period: '2026-08-01 ~ 2026-12-31',
        });
      }

      // ② 예산 데이터 — 계약 18.5억, 착수 2026-08, 현재 2026-08 (편성 직후)
      //    8월만 실적이 있고 9월 이후는 계획. 신규 PJT라 실적 누계가 적다.
      // CRM/PMO/SCM에서 IF로 넘어온 직후 상태 — 계약원가만 수신됐고 실적은 아직 없다.
      // PM이 실행예산을 편성하고 승인받은 뒤, 월마감을 돌리며 실적이 쌓인다.
      BUDGET_SOURCE[SCEN_PJT.key] = {
        projName: SCEN_PJT.name, stage: '편성', dplus: 0,
        start: '2026-08', end: '2026-12', current: '2026-08',
        plan: { 인건비: 650000000, 외주비: 865000000, 재료비: 46000000, 경비: 25000000, 'A/S Cost': 0 },
        transfer: { 인건비: 0, 외주비: 0, 재료비: 0, 경비: 0, 'A/S Cost': 0 },
        months: [
          budgetMockMonth('2026-08', 'plan', { labor: 130000000, outsource: 173000000, material: 9200000, expense: 5000000 }),
          budgetMockMonth('2026-09', 'plan', { labor: 130000000, outsource: 173000000, material: 9200000, expense: 5000000 }),
          budgetMockMonth('2026-10', 'plan', { labor: 130000000, outsource: 173000000, material: 9200000, expense: 5000000 }),
          budgetMockMonth('2026-11', 'plan', { labor: 130000000, outsource: 173000000, material: 9200000, expense: 5000000 }),
          budgetMockMonth('2026-12', 'plan', { labor: 130000000, outsource: 173000000, material: 9200000, expense: 5000000 }),
        ],
      };

      // ③ 버전 이력 — 신규 PJT라 최초 편성(v1) 한 건만 있다
      if (typeof budgetTransferHistory !== 'undefined' && !budgetTransferHistory[SCEN_PJT.key]) {
        // 최초 생성 직후라 승인된 버전이 아직 없다 (PM이 편성·상신하면 v1이 생긴다)
        budgetTransferHistory[SCEN_PJT.key] = [];
      }
      console.log('[시나리오] ' + SCEN_PJT.no + ' 생성 완료');
    } catch (e) { setTimeout(bind, 400); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 메인 캐러셀: 시나리오 PJT + 기존 목업 PJT를 함께 노출 ──
(function registerHomeProjects() {
  if (typeof HOME_PROJECTS === 'undefined') return;
  if (!HOME_PROJECTS.some(function (p) { return p.id === MOCK_PJT.key; })) {
    HOME_PROJECTS.unshift({ id: MOCK_PJT.key, no: MOCK_PJT.no, name: MOCK_PJT.name });
  }
  if (!HOME_PROJECTS.some(function (p) { return p.id === SCEN_PJT.key; })) {
    HOME_PROJECTS.unshift({ id: SCEN_PJT.key, no: SCEN_PJT.no, name: SCEN_PJT.name });
  }
  if (typeof HOME_FIN !== 'undefined') {
    if (!HOME_FIN[SCEN_PJT.key]) {
      HOME_FIN[SCEN_PJT.key] = { cp:18.5, mgap:0.152, acc:[
        ['인건비', 6.50, 0.46], ['외주비', 8.65, 0.69],
        ['재료비', 0.46, 0.02], ['경비', 0.25, 0.02], ['A/S Cost', 0, 0] ] };
    }
    if (!HOME_FIN[MOCK_PJT.key]) {
      HOME_FIN[MOCK_PJT.key] = { cp:23.0, mgap:0.088, acc:[
        ['인건비', 7.60, 5.20], ['외주비', 11.60, 8.65],
        ['재료비', 1.50, 0.68], ['경비', 0.90, 0.52], ['A/S Cost', 0, 0] ] };
    }
  }
  homeSelectedProject = SCEN_PJT.key;
})();

// ============================================================
//  15차 — 프로젝트별 To-Do / 이상징후 (상세 화면과 동일 데이터)
//
//  · budgetMock  : 원가조정 Agent 콘솔의 기존 승인 대기 4건 (팀원 데이터 그대로)
//  · credit(신규): CRM/PMO 자동 생성 직후부터의 전 case
//  · 상세 화면(Agent 콘솔)도 현재 프로젝트 것만 보이도록 필터를 건다.
// ============================================================

// 기존 제안 4건은 목업 PJT 소유임을 표시 (필드만 추가 — 내용은 건드리지 않는다)
(function tagExistingProposals() {
  function bind() {
    if (typeof AGENT_PROPOSALS_FINAL === 'undefined') { setTimeout(bind, 300); return; }
    AGENT_PROPOSALS_FINAL.forEach(function (p) { if (!p.pjt) p.pjt = MOCK_PJT.key; });
    // 시나리오 PJT 제안을 같은 배열에 합쳐 상세 화면이 그대로 렌더하게 한다
    if (!AGENT_PROPOSALS_FINAL.some(function (p) { return p.pjt === SCEN_PJT.key; })) {
      SCEN_PROPOSALS.forEach(function (p) { AGENT_PROPOSALS_FINAL.push(p); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 시나리오 PJT의 단계별 제안 (상세 화면과 메인이 공유) ──
// stage: 월마감 사이클 단계 · CRM/PMO 자동 생성 직후(plan)부터 종료(close)까지
const SCEN_PROPOSALS = [
  // ① 계획 확정 — CRM 계약원가 수신 직후 최초 편성
  { id:'sp-01', pjt:'credit', stage:'plan', acct:'인건비', status:'pending', confidence:0.95,
    detectedAt:'2026-08-04 09:05', trigger:'CRM 계약원가 수신 · PJT 자동 생성',
    title:'CRM 계약원가를 인건비 실행예산으로 초안 편성해야 합니다',
    why:'CRM에서 계약 원가 1,850,000,000원이 수신되어 프로젝트가 자동 생성됐습니다. 계정별 실행예산을 편성해야 집행이 시작됩니다.',
    from:0, to:650000000,
    impact:'CP총액 1,850,000,000원 한도 내. 인건비 CP한도 이내입니다.' },
  { id:'sp-02', pjt:'credit', stage:'plan', acct:'외주비', status:'pending', confidence:0.92,
    detectedAt:'2026-08-04 09:05', trigger:'CRM 계약원가 수신 · PJT 자동 생성',
    title:'외주구매 계획 라인을 편성해야 합니다',
    why:'외주 배분액 865,000,000원에 대한 업체별 계획 라인이 아직 없습니다. 계획 라인이 없으면 PO를 발행할 수 없습니다.',
    from:0, to:865000000,
    impact:'외주비 CP한도 이내. 편성 후 구매시스템에서 PO 발행이 가능해집니다.' },

  // ② 투입원가 입력 — 선투입 승계 · SCM 인력 확정
  { id:'sp-03', pjt:'credit', stage:'input', acct:'인건비', status:'pending', confidence:0.94,
    detectedAt:'2026-08-19 10:22', trigger:'선투입 PJT 집행분 I/F 수신',
    title:'선투입 집행분 42,000,000원을 본 프로젝트로 승계해야 합니다',
    why:'착수 전 선투입 프로젝트에서 집행된 인건비가 본 PJT로 넘어와야 실적이 이어집니다. 승계하지 않으면 실적 누락으로 원가율이 낮게 보입니다.',
    from:650000000, to:650000000,
    impact:'계획 총액은 변하지 않고 실적 42,000,000원이 승계됩니다. 추적 링크가 유지됩니다.' },
  { id:'sp-04', pjt:'credit', stage:'input', acct:'외주비', status:'pending', confidence:0.90,
    detectedAt:'2026-08-21 14:40', trigger:'SCM 외주인력 투입 지연 통보',
    title:'외주 인력 3명 투입이 9월로 지연됩니다',
    why:'SCM에서 투입 개시가 8월 → 9월로 변경 수신되었습니다. 8월 외주비 계획 34,000,000원이 집행되지 않아 잔여 기간 재배치가 필요합니다.',
    from:865000000, to:865000000,
    impact:'계정 총액은 불변, 월별 배치만 8월 → 9~10월로 이동합니다.' },

  // ③ 검수·확정 — 구매 검수
  { id:'sp-05', pjt:'credit', stage:'inspect', acct:'재료비', status:'pending', confidence:0.88,
    detectedAt:'2026-08-25 09:00', trigger:'구매 검수 지연',
    title:'장비 검수 2건이 지연돼 8월 실적에 반영되지 않습니다',
    why:'검수 완료분만 실적으로 인식됩니다. 검수가 밀리면 월마감 실적에서 빠지고 프로젝트 종료 판정에서도 미결로 남습니다.',
    from:46000000, to:46000000,
    impact:'금액 변동은 없으나 8월 실적 인식이 9월로 이월됩니다.' },

  // ④ 월마감 대사 — 예비비 전환
  { id:'sp-06', pjt:'credit', stage:'recon', acct:'경비', status:'pending', confidence:0.86,
    detectedAt:'2026-08-31 18:00', trigger:'월마감 대사 · 계획-실적 gap',
    title:'미집행 경비를 AI 예비비로 전환할 수 있습니다',
    why:'8월 경비 계획 대비 실적이 3,200,000원 미달했습니다. 정산 진입 전에는 예비비로 전환해 두면 잔여 기간에 활용할 수 있습니다.',
    from:25000000, to:21800000,
    impact:'경비 21,800,000원 · AI 예비비 3,200,000원. 계정 총액은 불변입니다.' },
];

// ── 시나리오 PJT의 강제 이상징후 (budget-ax case 이식) ──
const SCEN_RISKS_BY_PJT = {
  credit: [
    { id:'cr-01', stage:'plan', acct:'외주비', sev:'danger', scen:'CP 총액 초과 위험',
      title:'계정별 편성 합계가 CP 총액에 근접했습니다',
      why:'인건비·외주비·재료비·경비 합계 1,586,000,000원으로 CP 총액 1,850,000,000원의 85.7%입니다. 추가 편성 여력이 264,000,000원 남았습니다.',
      impact:'여력 2.64억' },
    { id:'cr-02', stage:'input', acct:'인건비', sev:'warning', scen:'선투입 승계 미처리',
      title:'선투입 집행분이 아직 본 프로젝트에 반영되지 않았습니다',
      why:'승계하지 않으면 실적이 누락돼 원가율이 실제보다 낮게 보입니다. 월마감 전에 처리해야 합니다.',
      impact:'실적 +4,200만원' },
    { id:'cr-03', stage:'inspect', acct:'재료비', sev:'danger', scen:'구매 검수 지연 · 종료 보류',
      title:'검수 지연 2건이 종료 판정에서 미결로 남습니다',
      why:'검수 미완료분은 월마감 실적에 잡히지 않아, 프로젝트 종료 시 미결 항목으로 분류됩니다.',
      impact:'종료 보류' },
    { id:'cr-04', stage:'recon', acct:'전 계정', sev:'warning', scen:'계획-실적 gap',
      title:'8월 계획 대비 실적이 1,520만원 미달했습니다',
      why:'투입 지연과 검수 이월이 겹쳐 실적이 계획에 못 미쳤습니다. 잔여 기간 계획 재배치가 필요합니다.',
      impact:'-1,520만원' },
    { id:'cr-05', stage:'approve', acct:'외주비', sev:'danger', scen:'예산 초과 (Overrun)',
      title:'외주비 조정액이 자가전결 한도를 넘었습니다',
      why:'승인 예산의 20%를 초과해 직책자 승인이 필요합니다. 승인 전까지 조정안은 Draft로 유지됩니다.',
      impact:'직책자 승인 필요' },
  ],
  budgetMock: [
    { id:'mr-01', stage:'input', acct:'외주비', sev:'danger', scen:'예산 초과 (Overrun)',
      title:'외주비 누계 조정액이 승인 예산의 20%를 넘었습니다',
      why:'자가전결 한도를 벗어나 직책자 승인이 필요합니다.',
      impact:'+1.85억' },
    { id:'mr-02', stage:'input', acct:'경비', sev:'warning', scen:'AI 예비비 감액 (RM 협조)',
      title:'의욕관리비 공동예산 잔액이 0원이 되었습니다',
      why:'같은 예산통을 쓰는 소계정 집행이 늘어 가용잔액이 소진됐습니다.',
      impact:'-150만원' },
  ],
};

// ── 상세 화면(Agent 콘솔)도 현재 프로젝트 것만 보이게 한다 ──
// dashboard.js가 budget-agent-console.js보다 먼저 로드되므로, 함수 선언으로 덮으면
// 콘솔 쪽 정의가 나중에 다시 이긴다. 스크립트가 모두 올라온 뒤 런타임에 할당한다.
(function overrideAgentProposals() {
  function bind() {
    if (typeof agentProposalsFinal !== 'function' || typeof agentByAcctFinal !== 'function') {
      setTimeout(bind, 300); return;
    }
    window.agentProposalsFinal = function (status) {
      const pj = (typeof currentBudgetProj !== 'undefined' && currentBudgetProj) ? currentBudgetProj : MOCK_PJT.key;
      let list = AGENT_PROPOSALS_FINAL.filter(function (p) { return (p.pjt || MOCK_PJT.key) === pj; });
      if (status) list = list.filter(function (p) { return p.status === status; });
      return agentByAcctFinal(list);
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ============================================================
//  15차 — 메인 보드를 프로젝트별로 분기
//  선택된 PJT의 To-Do / 이상징후 = 그 PJT 상세 화면이 보여주는 것과 동일
// ============================================================

// 현재 선택 PJT (전체 선택 시 시나리오 PJT를 기본으로 본다)
function homeBoardPjt() {
  return (homeSelectedProject && homeSelectedProject !== 'all') ? homeSelectedProject : SCEN_PJT.key;
}
function homeIsScenPjt() { return homeBoardPjt() === SCEN_PJT.key; }
function homeIsMockPjt() { return homeBoardPjt() === MOCK_PJT.key; }
function homeHasDetail() { return homeIsScenPjt() || homeIsMockPjt(); }

// 상세 화면과 같은 제안 목록 (프로젝트 + 단계 기준)
function homeProposalsOf(pj, stage) {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined') return [];
  return AGENT_PROPOSALS_FINAL.filter(function (p) {
    if ((p.pjt || MOCK_PJT.key) !== pj) return false;
    if (p.status !== 'pending') return false;
    // 목업 PJT의 기존 제안은 단계 구분이 없으므로 투입원가 입력 단계에 놓는다
    const st = p.stage || 'input';
    return !stage || st === stage;
  });
}

function homeStageTodo() {
  const pj = homeBoardPjt();
  if (!homeHasDetail()) {
    // 상세 화면이 없는 프로젝트는 기존 메인 데이터로 보여준다
    return HOME_FEED.filter(function (i) {
      return i.proj === pj && i.cat === 'work' && !homeFeedState[feedKey(i)];
    }).map(function (i) {
      return { acct:i.sub, title:i.title, note:(i.flow ? i.flow.aSub + ' ' + i.flow.aVal : ''), st:'now' };
    });
  }
  const now = homeProposalsOf(pj, closeStage).map(function (p) {
    return { acct:p.acct, title:p.title, note:p.why, trigger:p.trigger, guide:p.guide,
             from:p.from, to:p.to, st:'now' };
  });
  if (now.length) return now;
  // 이 단계에 제안이 없으면 단계별 안내 작업을 보여준다
  return (CLOSE_WORK[closeStage] || []).slice();
}

function homeStageRisks() {
  const pj = homeBoardPjt();
  if (!homeHasDetail()) {
    return HOME_FEED.filter(function (i) {
      return i.proj === pj && i.cat === 'budget' && !homeFeedState[feedKey(i)];
    }).map(function (i) {
      const ai = (typeof homeAiOf === 'function') ? homeAiOf(i) : null;
      return { id:feedKey(i), acct:i.sub, sev:(i.sev === 'danger' ? 'danger' : 'warning'), scen:i.sub,
               title:i.title, why:(i.note || ''), impact:(ai ? ai.impact : '') };
    });
  }
  const list = (SCEN_RISKS_BY_PJT[pj] || []);
  return list.filter(function (r) { return (r.stage || 'input') === closeStage; });
}

// 건수 — 캐러셀 뱃지
function homeOpenCountOf(id) {
  if (id === SCEN_PJT.key || id === MOCK_PJT.key) {
    if (homeUser === 'lead') return homeTodoLead().length;
    const props = homeProposalsOf(id, null).length;
    const risks = (SCEN_RISKS_BY_PJT[id] || []).length;
    return props + risks;
  }
  return HOME_FEED.filter(function (i) { return i.proj === id && !homeFeedState[feedKey(i)]; }).length;
}

// 캐러셀 — 시나리오 PJT, 목업 PJT를 앞에 고정
function homePjtStripHtml() {
  const pinned = [SCEN_PJT.key, MOCK_PJT.key];
  const head = pinned.map(function (k) { return HOME_PROJECTS.find(function (p) { return p.id === k; }); }).filter(Boolean);
  const rest = HOME_PROJECTS.filter(function (p) { return pinned.indexOf(p.id) < 0; })
    .sort(function (a, b) {
      const d = homeOpenCountOf(b.id) - homeOpenCountOf(a.id);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
  const chips = head.concat(rest).map(function (p) {
    const n = homeOpenCountOf(p.id);
    const on = homeSelectedProject === p.id;
    const isScen = p.id === SCEN_PJT.key;
    return `
        <button class="hm-ptab hm-pjt-chip ${on ? 'picked' : ''} ${n ? '' : 'calm'} ${isScen ? 'scen' : ''}"
          onclick="selectHomePjt('${p.id}')" aria-pressed="${on}"
          title="${escHtml(p.name)} · 확인 필요 ${n}건">
          ${on ? '<span class="hm-pjt-check">✓</span>' : ''}
          ${isScen ? '<span class="hm-pjt-star" title="시나리오 프로젝트">★</span>' : ''}
          <span class="hm-ptab-name">${escHtml(p.name)}</span>
          <span class="hm-ptab-badge ${n ? 'on' : ''}">${n}</span>
        </button>`;
  }).join('');
  const picked = homePjtLabel();
  const ctx = picked
    ? `<div class="hm-ctx"><span class="hm-ctx-l">선택된 프로젝트</span><b>${escHtml(picked)}</b>
         <span class="hm-ctx-d">이 프로젝트를 기준으로 답변해요</span>
         <button class="hm-ctx-x" onclick="clearHomePjt()" aria-label="선택 해제">✕</button></div>`
    : `<div class="hm-ctx off"><span class="hm-ctx-d">프로젝트를 선택하면 그 프로젝트를 기준으로 답변해요</span></div>`;
  return `
    <div class="hm-under">
      <div class="hm-under-head">
        <span class="hm-under-t">담당 프로젝트 <b>${HOME_PROJECTS.length}</b></span>
        <span class="hm-under-sum">확인 필요 <b>${homeOpenCountOf(homeBoardPjt())}건</b></span>
      </div>
      <div class="hm-ptabs-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="hm-ptabs-track">${chips}</div>
        <button class="hm-ptabs-arrow" onclick="scrollHomeTabs(1)" aria-label="다음 프로젝트">›</button>
      </div>
      ${ctx}
    </div>`;
}

// 단계 레일 — 선택된 PJT 이름과 단계별 건수를 함께 보여준다
function homeStageRailHtml() {
  const pj = homeBoardPjt();
  const p = HOME_PROJECTS.find(function (x) { return x.id === pj; });
  const steps = CLOSE_STAGES.map(function (s, i) {
    const on = s.id === closeStage;
    const cnt = homeProposalsOf(pj, s.id).length + (SCEN_RISKS_BY_PJT[pj] || []).filter(function (r) { return (r.stage || 'input') === s.id; }).length;
    const st = stageStateOf(s.id);
    const ic = st === 'done' ? '✓' : (i + 1);
    return `<button class="hm-st ${st} ${on ? 'on' : ''}" onclick="selectCloseStage('${s.id}')" aria-pressed="${on}"
        title="${escHtml(s.n)} · ${escHtml(stageDateOf(s.id))} · ${st === 'done' ? '완료' : st === 'active' ? '진행 중' : '대기'}">
        <span class="hm-st-ic">${ic}</span>
        <span class="hm-st-b"><b>${escHtml(s.n)}</b><em>${escHtml(stageDateOf(s.id))} · ${escHtml(s.own)}</em></span>
        ${cnt ? `<span class="hm-st-n">${cnt}</span>` : ''}
      </button>`;
  }).join('');
  return `
    <div class="hm-stage">
      <div class="hm-stage-track">${steps}</div>
    </div>`;
}

// 상세 화면으로 이동 — 항상 현재 선택된 프로젝트로
function homeTodoGo(acct) {
  const a = (acct === '전 계정') ? '인건비' : acct;
  const pj = homeBoardPjt();
  if (typeof openCostArea === 'function') openCostArea(a, pj);
  else if (typeof openCostAdjust === 'function') openCostAdjust(pj);
}

// 상세 화면이 없는 프로젝트에서는 단계 레일을 숨긴다
function homeWorkBoardHtml() {
  const lead = homeUser === 'lead';
  const todos = lead ? homeTodoLead() : homeStageTodo();
  const risks = homeStageRisks();
  const st = closeStageOf(closeStage);
  const showRail = !lead && homeHasDetail();

  const todoBody = todos.length
    ? (lead ? todos.map(homeTodoCardHtml).join('') : todos.map(homeStageCardHtml).join(''))
    : `<div class="hm-board-empty">이 단계에서 ${lead ? '결재할' : '처리할'} 일이 없어요.</div>`;
  const fresh = homeIsScenPjt() && (typeof BUDGET_SOURCE !== 'undefined')
    && BUDGET_SOURCE[SCEN_PJT.key] && !BUDGET_SOURCE[SCEN_PJT.key].months.some(function (x) { return x.type === 'actual'; });
  const riskBody = risks.length
    ? risks.map(homeScenRiskCardHtml).join('')
    : `<div class="hm-board-empty">${fresh
        ? '방금 생성된 프로젝트라 아직 실적이 없습니다. 월 마감을 돌려 실적이 쌓이면 이상징후를 감지합니다.'
        : '이 단계에서 발견된 이상징후가 없어요.'}</div>`;

  return `
    ${showRail ? homeStageRailHtml() : ''}
    <div class="hm-board">
      <section class="hm-col todo">
        <div class="hm-col-h">
          <span class="hm-col-ic">✓</span>
          <b>${lead ? '결재해야 할 일' : '해야 할 일'}</b>
          <em>${todos.length}건</em>
          <span class="hm-col-d">${lead ? 'PM이 상신한 건'
            : (showRail
                ? (closeStage === 'plan' && homeIsScenPjt()
                    ? 'CP 총액 ' + homeWon(SCEN_CP) + ' 이내로 편성'
                    : escHtml(st.n) + ' 단계 · 4대계정')
                : '조치가 필요한 건')}</span>
        </div>
        <div class="hm-col-b">${todoBody}</div>
      </section>
      <section class="hm-col risk">
        <div class="hm-col-h">
          <span class="hm-col-ic warn">!</span>
          <b>이상징후</b>
          <em>${risks.length}건</em>
          <span class="hm-col-d">AI가 감지한 신호</span>
        </div>
        <div class="hm-col-b">${riskBody}</div>
      </section>
    </div>`;
}

// ============================================================
//  16차 — 월 마감 실행 (budget-ax 월마감 프로세스 참고)
//
//  budget-ax의 월마감 컨셉만 가져온다:
//   ① 월마감 익일 자동 트리거 → ② 실적 수신(계정별 구분) → ③ 실적 IF 방향
//   → ④ 추정 Rawdata 제공(BIX) → ⑤ 현행화 조정안 자동 확정 (팀장 승인 불요)
//  원가 계획/반영 처리 방식은 budget-cowork(현 목업) 기준을 따른다.
//
//  월마감을 돌리면 그 달 계획이 실적으로 확정되고, 다음 달 이벤트로 넘어간다.
//  → 최초 생성(편성 전)부터 종료까지 한 프로젝트로 전 과정을 돌려볼 수 있다.
// ============================================================

const SCEN_MONTHS = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
let scenMonthIdx = 0;
function scenMonth() { return SCEN_MONTHS[scenMonthIdx] || SCEN_MONTHS[SCEN_MONTHS.length - 1]; }
function scenMonthLabel(m) { return (m || scenMonth()).split('-')[1].replace(/^0/, '') + '월'; }

// budget-ax 월마감 5단계
const CLOSE_RUN_STEPS = [
  { t:'월마감 익일 자동 트리거', d:'익일 06:00 현행화 배치 실행' },
  { t:'실적 수신 (계정별 구분)', d:'인건비 SCM Teaming · 외주비 실투입/검수 · 재료비·경비 구분 수신' },
  { t:'실적 I/F 방향 확인',      d:'외주비·재료비 ERP 수신 / 인건비·경비 ERP 전송 · 변경 PO 재수신' },
  { t:'추정 Rawdata 제공',       d:'계획+실적 Rawdata를 추정 시스템·BIX로 이관' },
  { t:'현행화 조정안 자동 확정', d:'실적 반영 조정 · 팀장 승인 없이 자동 확정 (Process MAP)' },
];

const SCEN_CP = 1850000000;          // PMO에서 넘어온 CP 총액 (이 금액 이하로 편성해야 한다)
const SCEN_CP_BY_ACCT = { 인건비: 770000000, 외주비: 1195000000, 재료비: 60000000, 경비: 40000000 };

// ── 월별 이벤트 — 최초 생성(8월)부터 종료(12월)까지 ──
// guide: 사용자가 실제로 무엇을 눌러 무엇을 확정하고 어떤 판단을 해야 하는지
//        (where 어디서 · do 무엇을 · decide 무엇을 보고 확정)
// 신규 생성 직후에는 실적이 없으므로 이상징후가 나올 수 없다 → 8월은 To-Do만 둔다.
const SCEN_BY_MONTH = {
  '2026-08': {
    note:'CRM/PMO/SCM에서 IF 수신 · 실행예산 편성 전',
    todos:[
      { stage:'plan', acct:'인건비', trigger:'PMO 계약원가(CP) 수신 · PJT 자동 생성',
        title:'인건비 실행예산을 편성해야 합니다',
        why:'CP 총액 1,850,000,000원 중 인건비 한도는 770,000,000원입니다. 편성하지 않으면 인력을 투입해도 집행할 예산이 없습니다.',
        from:0, to:650000000,
        guide:{ where:'수행원가 › 원가조정 › 인건비',
          do:'[인력 추가]로 SCM 확정 인력을 불러오고 월별 M/M·단가를 입력합니다',
          decide:'합계가 인건비 CP한도 770,000,000원 이내인지 확인하고 [저장]을 누릅니다' } },
      { stage:'plan', acct:'외주비', trigger:'PMO 계약원가(CP) 수신 · PJT 자동 생성',
        title:'외주비 실행예산을 편성해야 합니다',
        why:'외주비 CP 한도는 1,195,000,000원입니다. 업체별 계획 라인이 없으면 구매시스템에서 PO를 발행할 수 없습니다.',
        from:0, to:865000000,
        guide:{ where:'수행원가 › 원가조정 › 외주비',
          do:'[외주구매 계획 추가]로 업체·수행기간·금액 라인을 등록합니다',
          decide:'계획 라인 합계가 1,195,000,000원 이내인지 확인합니다. PO는 이 계획 범위 안에서만 발행됩니다' } },
      { stage:'plan', acct:'재료비', trigger:'PMO 산출물 계획 수신',
        title:'재료비 실행예산을 편성해야 합니다',
        why:'장비·라이선스 구매분입니다. 재료비 CP 한도는 60,000,000원입니다.',
        from:0, to:46000000,
        guide:{ where:'수행원가 › 원가조정 › 재료비',
          do:'구매 예정 품목과 검수 예정월을 등록합니다',
          decide:'검수 예정월에 맞춰 월별로 나눠 편성했는지 확인 후 [저장]합니다' } },
      { stage:'plan', acct:'경비', trigger:'PMO 산출물 계획 수신',
        title:'경비 실행예산을 편성해야 합니다',
        why:'여비·회의비 등 운영 경비입니다. 경비 CP 한도는 40,000,000원입니다.',
        from:0, to:25000000,
        guide:{ where:'수행원가 › 원가조정 › 경비',
          do:'소계정(여비교통비·회의비·잡비)별로 월 배분액을 입력합니다',
          decide:'공동예산을 쓰는 소계정은 가용잔액을 함께 확인합니다' } },
      { stage:'input', acct:'인건비', trigger:'SCM 인력 확정 I/F 수신',
        title:'SCM 확정 인력 8명을 인건비 계획에 반영해야 합니다',
        why:'SCM에서 투입계획이 확정된 인력 8명이 수신되었습니다. 등록하지 않으면 실제 투입 시점에 집행할 예산이 없습니다.',
        from:650000000, to:650000000,
        guide:{ where:'수행원가 › 원가조정 › 인건비',
          do:'[SCM 확정 인력 불러오기]에서 8명을 선택해 계획에 반영합니다',
          decide:'등급·단가가 SCM 확정값과 같은지 대조한 뒤 확정합니다' } },
      { stage:'approve', acct:'전 계정', trigger:'4대계정 편성 완료',
        title:'실행예산 최초 편성안을 팀장에게 상신해야 합니다',
        why:'승인을 받아야 Baseline이 확정되고 ERP로 전송됩니다. 승인 전에는 Draft 상태로만 남습니다.',
        from:0, to:1586000000,
        guide:{ where:'수행원가 › 원가조정',
          do:'4대계정 합계를 확인하고 [승인 요청]을 누릅니다',
          decide:'합계 1,586,000,000원이 CP 총액 1,850,000,000원 이내인지(여력 264,000,000원) 확인합니다' } },
    ],
    risks:[],   // 신규 생성 직후 — 실적이 없어 감지할 이상징후가 없다
  },

  '2026-09': {
    note:'편성 승인 완료 · 첫 실적 발생',
    todos:[
      { stage:'input', acct:'인건비', trigger:'선투입 PJT 집행분 I/F 수신',
        title:'선투입 집행분 42,000,000원을 본 프로젝트로 승계해야 합니다',
        why:'착수 전 선투입에서 집행된 인건비 42,000,000원이 승계되어야 실적이 이어집니다. 누락하면 원가율이 실제보다 낮게 보입니다.',
        from:650000000, to:650000000,
        guide:{ where:'수행원가 › 원가조정 › 인건비',
          do:'[선투입 승계] 목록에서 해당 건을 선택해 본 PJT 실적으로 옮깁니다',
          decide:'계획 총액은 변하지 않고 실적만 42,000,000원 늘어납니다. 추적 링크가 유지되는지 확인합니다' } },
      { stage:'input', acct:'외주비', trigger:'SCM 외주인력 투입 지연 통보',
        title:'외주 인력 3명 투입 지연분 34,000,000원을 재배치해야 합니다',
        why:'투입 개시가 9월 → 10월로 변경 수신되었습니다. 9월 외주비 계획 34,000,000원이 집행되지 않습니다.',
        from:865000000, to:865000000,
        guide:{ where:'수행원가 › 원가조정 › 외주비',
          do:'9월 계획 라인의 34,000,000원을 10~11월로 나눠 옮깁니다',
          decide:'계정 총액 865,000,000원은 그대로 두고 월별 배치만 바꿉니다 (총액 불변 시 자가전결)' } },
    ],
    risks:[
      { stage:'input', acct:'인건비', sev:'warning', scen:'선투입 승계 미처리',
        title:'선투입 집행분 42,000,000원이 아직 반영되지 않았습니다',
        why:'월마감 전에 승계하지 않으면 9월 실적에서 누락되어 원가율이 낮게 보입니다.', impact:'실적 +4,200만원' },
    ],
  },

  '2026-10': {
    note:'구매 검수 · 계획 조정',
    todos:[
      { stage:'input', acct:'외주비', trigger:'구매견적 수신 (PO 발행 전)',
        title:'외주비 계획을 4,500,000원 증액해야 PO를 발행할 수 있습니다',
        why:'아크로디자인랩 4분기 견적 24,500,000원이 계획 라인 20,000,000원을 초과합니다. 계획을 먼저 올려야 계약이 가능합니다.',
        from:865000000, to:869500000,
        guide:{ where:'수행원가 › 원가조정 › 외주비',
          do:'해당 업체 계획 라인 금액을 20,000,000 → 24,500,000원으로 수정합니다',
          decide:'증액 후에도 외주비 CP한도 1,195,000,000원 이내인지 확인합니다. 자가전결 범위면 바로 저장됩니다' } },
      { stage:'inspect', acct:'재료비', trigger:'구매 검수 지연',
        title:'장비 검수 2건(9,200,000원)이 10월 실적에서 빠집니다',
        why:'검수 완료분만 실적으로 인식됩니다. 검수가 밀리면 월마감 실적에 잡히지 않습니다.',
        from:46000000, to:46000000,
        guide:{ where:'수행원가 › 원가조정 › 재료비',
          do:'검수 예정 목록에서 지연 2건의 검수 예정월을 10월 → 11월로 조정합니다',
          decide:'금액은 그대로 두고 인식 시점만 옮깁니다. 종료 전까지 검수가 끝나는지 확인합니다' } },
    ],
    risks:[
      { stage:'inspect', acct:'재료비', sev:'danger', scen:'구매 검수 지연',
        title:'검수 지연 2건이 실적 인식에서 빠집니다',
        why:'검수 미완료분은 월마감 실적에 잡히지 않아 원가율이 실제보다 낮게 보입니다.', impact:'인식 이월' },
    ],
  },

  '2026-11': {
    note:'예산 초과 · 직책자 결재',
    todos:[
      { stage:'approve', acct:'외주비', trigger:'누계 조정액 한도 초과',
        title:'외주비 증액 180,500,000원을 직책자에게 상신해야 합니다',
        why:'누계 조정액이 승인 예산의 20%를 넘어 자가전결 한도를 벗어났습니다. 직책자 승인 전까지 Draft로 유지됩니다.',
        from:869500000, to:1050000000,
        guide:{ where:'수행원가 › 원가조정 › 외주비',
          do:'증액 사유를 입력하고 [승인 요청]을 눌러 직책자에게 올립니다',
          decide:'증액 후 1,050,000,000원이 외주비 CP한도 1,195,000,000원 이내인지 확인합니다' } },
      { stage:'recon', acct:'경비', trigger:'월마감 대사 · 미집행 발생',
        title:'미집행 경비 3,200,000원을 AI 예비비로 전환할 수 있습니다',
        why:'정산 단계에 들어가면 계정 간 이동이 제한됩니다. 그 전에 전환해 두면 잔여 기간에 쓸 수 있습니다.',
        from:25000000, to:21800000,
        guide:{ where:'수행원가 › 원가조정 › 경비',
          do:'미집행 3,200,000원을 선택해 [AI 예비비로 전환]합니다',
          decide:'계정 총액은 변하지 않습니다(경비 21,800,000 + 예비비 3,200,000). 자가전결로 처리됩니다' } },
    ],
    risks:[
      { stage:'approve', acct:'외주비', sev:'danger', scen:'예산 초과 (Overrun)',
        title:'외주비 조정액이 자가전결 한도를 넘었습니다',
        why:'승인 예산의 20%를 초과해 직책자 승인이 필요합니다. 승인 전까지는 계획이 확정되지 않습니다.', impact:'직책자 승인' },
      { stage:'recon', acct:'전 계정', sev:'warning', scen:'계획-실적 gap',
        title:'11월 계획 대비 실적이 15,200,000원 미달했습니다',
        why:'투입 지연과 검수 이월이 겹쳐 실적이 계획에 못 미쳤습니다. 잔여 기간 계획을 재배치해야 합니다.', impact:'-1,520만원' },
    ],
  },

  '2026-12': {
    note:'종료 판정 · 정산',
    todos:[
      { stage:'inspect', acct:'재료비', trigger:'종료 판정 사전 점검',
        title:'미검수 1건(4,600,000원)을 정리해야 종료할 수 있습니다',
        why:'검수 미완료분이 남으면 종료 판정에서 미결 항목으로 분류돼 종료가 보류됩니다.',
        from:46000000, to:46000000,
        guide:{ where:'수행원가 › 원가조정 › 재료비',
          do:'미검수 1건의 검수를 완료 처리하거나 계획에서 제외합니다',
          decide:'12월 내 검수가 불가하면 계획에서 빼야 종료 판정을 통과합니다' } },
      { stage:'recon', acct:'전 계정', trigger:'정산 진입 전 점검',
        title:'정산 진입 전 계정 간 이동을 마무리해야 합니다',
        why:'정산 단계에 들어가면 계정 간 이동이 제한됩니다. 남은 미집행분을 지금 정리해야 합니다.',
        from:1586000000, to:1586000000,
        guide:{ where:'수행원가 › 원가조정',
          do:'계정별 잔여를 확인하고 필요한 이동을 처리합니다',
          decide:'이동 후에도 각 계정이 CP 한도 이내인지 확인합니다' } },
      { stage:'approve', acct:'전 계정', trigger:'프로젝트 종료',
        title:'종료 보고와 최종 원가를 확정해야 합니다',
        why:'최종 실적을 확정하고 BIX로 손익 데이터를 이관하면 프로젝트가 종료됩니다.',
        from:1586000000, to:1586000000,
        guide:{ where:'프로젝트 › 프로젝트 종료',
          do:'미결 항목이 없는지 확인하고 [종료 보고]를 상신합니다',
          decide:'미검수·미승인 건이 하나라도 남아 있으면 종료가 보류됩니다' } },
    ],
    risks:[
      { stage:'inspect', acct:'재료비', sev:'danger', scen:'종료 보류',
        title:'미검수 1건으로 종료가 보류될 수 있습니다',
        why:'검수 미완료분은 종료 판정에서 미결로 남습니다.', impact:'종료 보류' },
    ],
  },
};

// 현재 월의 이벤트를 상세 화면(Agent 콘솔)에 반영 — 메인과 상세가 항상 같은 내용
function syncScenProposals() {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined') return;
  for (let i = AGENT_PROPOSALS_FINAL.length - 1; i >= 0; i--) {
    if (AGENT_PROPOSALS_FINAL[i].pjt === SCEN_PJT.key) AGENT_PROPOSALS_FINAL.splice(i, 1);
  }
  const m = scenMonth();
  const ev = SCEN_BY_MONTH[m] || { todos: [] };
  ev.todos.forEach(function (t, i) {
    AGENT_PROPOSALS_FINAL.push({
      id: 'sc-' + m + '-' + i, pjt: SCEN_PJT.key, stage: t.stage, acct: t.acct,
      status: 'pending', confidence: 0.92, detectedAt: m + '-01 09:00',
      trigger: t.trigger, title: t.title, why: t.why, guide: t.guide,
      from: t.from, to: t.to,
      impact: '월마감 ' + scenMonthLabel(m) + ' 기준 · 계정별 CP 한도 이내입니다.',
    });
  });
}
function scenRisks() {
  const ev = SCEN_BY_MONTH[scenMonth()];
  return ev ? ev.risks.slice() : [];
}

// 시나리오 PJT의 이상징후는 월별 이벤트에서 가져온다
(function overrideScenRisks() {
  SCEN_RISKS_BY_PJT[SCEN_PJT.key] = [];
  function refresh() { SCEN_RISKS_BY_PJT[SCEN_PJT.key] = scenRisks(); }
  window.__scenRefresh = function () { syncScenProposals(); refresh(); };
  function bind() {
    if (typeof AGENT_PROPOSALS_FINAL === 'undefined') { setTimeout(bind, 300); return; }
    window.__scenRefresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 16차 — 월 마감 버튼 · 실행 패널 ─────────────────────────

function closeRunOpen() {
  const ov = document.getElementById('close-run-overlay');
  if (!ov) return;
  ov.innerHTML = closeRunHtml();
  ov.classList.add('open');
}
function closeRunClose() {
  const ov = document.getElementById('close-run-overlay');
  if (ov) ov.classList.remove('open');
}

function closeRunHtml() {
  const m = scenMonth();
  const ev = SCEN_BY_MONTH[m] || { note: '', todos: [], risks: [] };
  const last = scenMonthIdx >= SCEN_MONTHS.length - 1;
  const openTodo = homeProposalsOf(SCEN_PJT.key, null).length;
  const steps = CLOSE_RUN_STEPS.map(function (s, i) {
    return `<div class="cr-step"><span class="cr-n">${i + 1}</span>
        <div><b>${escHtml(s.t)}</b><em>${escHtml(s.d)}</em></div></div>`;
  }).join('');
  const months = SCEN_MONTHS.map(function (x, i) {
    const cls = i < scenMonthIdx ? 'done' : i === scenMonthIdx ? 'now' : '';
    return `<span class="cr-m ${cls}">${scenMonthLabel(x)}</span>`;
  }).join('<i>›</i>');
  return `
    <div class="cr-panel" onclick="event.stopPropagation()">
      <div class="cr-head">
        <div>
          <div class="cr-eyebrow">월 마감</div>
          <strong>${escHtml(scenMonthLabel(m))} 마감 실행</strong>
          <div class="cr-meta">${escHtml(SCEN_PJT.no)} · ${escHtml(SCEN_PJT.name)} — ${escHtml(ev.note)}</div>
        </div>
        <button class="hm-drawer-x" onclick="closeRunClose()" aria-label="닫기">✕</button>
      </div>
      <div class="cr-body">
        <div class="cr-months">${months}</div>
        ${openTodo ? `<div class="cr-warn">아직 처리하지 않은 항목이 <b>${openTodo}건</b> 있습니다. 마감하면 이 달 계획이 실적으로 확정되고 다음 달로 넘어갑니다.</div>` : ''}
        <div class="cr-sec">마감 처리 순서</div>
        ${steps}
        <div class="cr-note">현행화 조정안은 Process MAP상 <b>팀장 승인 없이 자동 확정</b>됩니다.
          원가 계획·반영 규칙은 현재 목업(수행원가 &gt; 원가조정) 기준을 따릅니다.</div>
      </div>
      <div class="cr-foot">
        <button class="hm-btn" onclick="closeRunClose()">닫기</button>
        ${last
          ? `<button class="hm-btn pri" onclick="runMonthlyClose()">12월 마감 · 프로젝트 종료 →</button>`
          : `<button class="hm-btn pri" onclick="runMonthlyClose()">${escHtml(scenMonthLabel(m))} 마감 실행 →</button>`}
      </div>
    </div>`;
}

// 마감 실행 — 그 달 계획을 실적으로 확정하고 다음 달 이벤트로 넘어간다
function runMonthlyClose() {
  const m = scenMonth();
  try {
    const src = (typeof BUDGET_SOURCE !== 'undefined') ? BUDGET_SOURCE[SCEN_PJT.key] : null;
    if (src && Array.isArray(src.months) && typeof budgetMockMonth === 'function') {
      const i = src.months.findIndex(function (x) { return x.m === m; });
      if (i >= 0 && src.months[i].type !== 'actual') {
        const r0 = src.months[i];
        const pick = function (k) { return (r0[k] && r0[k].p) ? r0[k].p : 0; };
        // 실적은 계획과 조금 다르게 확정된다 (월마감 대사에서 gap이 생기는 이유)
        src.months[i] = budgetMockMonth(m, 'actual', {
          labor: Math.round(pick('인건비') * 0.97),
          outsource: Math.round(pick('외주비') * 1.02),
          material: Math.round(pick('재료비') * 0.90),
          expense: Math.round(pick('경비') * 0.95),
        });
      }
      const next = SCEN_MONTHS[scenMonthIdx + 1];
      if (next) src.current = next;
      if (src.stage === '편성') src.stage = '수행';
    }
  } catch (e) { /* 데이터 구조가 달라도 화면 흐름은 유지 */ }

  const last = scenMonthIdx >= SCEN_MONTHS.length - 1;
  if (!last) scenMonthIdx += 1;
  if (typeof window.__scenRefresh === 'function') window.__scenRefresh();
  closeStage = firstStageWithWork();
  closeRunClose();
  if (typeof rerenderHomeFeed === 'function') rerenderHomeFeed();
  if (typeof showToast === 'function') {
    showToast(last
      ? '12월 마감 완료 · 최종 원가를 확정하고 BIX로 이관했습니다.'
      : scenMonthLabel(m) + ' 마감 완료 · ' + scenMonthLabel(scenMonth()) + ' 업무로 넘어갑니다.');
  }
}

// 이 달에 할 일이 있는 첫 단계를 찾는다 (빈 단계가 먼저 열리지 않게)
function firstStageWithWork() {
  const pj = SCEN_PJT.key;
  const risks = SCEN_RISKS_BY_PJT[pj] || [];
  const hit = CLOSE_STAGES.find(function (s) {
    return homeProposalsOf(pj, s.id).length > 0
      || risks.some(function (r) { return (r.stage || 'input') === s.id; });
  });
  return hit ? hit.id : 'input';
}

// 우측 하단 작은 월 마감 버튼 (대화 FAB 위에 배치)
(function injectCloseFab() {
  function bind() {
    if (document.getElementById('close-run-fab')) return;
    const b = document.createElement('button');
    b.id = 'close-run-fab';
    b.className = 'close-run-fab';
    b.type = 'button';
    b.innerHTML = '<span class="crf-ic">📅</span><span class="crf-t">월 마감</span>';
    b.title = '월 마감 실행';
    b.onclick = closeRunOpen;
    document.body.appendChild(b);
    const ov = document.createElement('div');
    ov.id = 'close-run-overlay';
    ov.className = 'cr-overlay';
    ov.onclick = function (e) { if (e.target === ov) closeRunClose(); };
    document.body.appendChild(ov);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ============================================================
//  18차 — 메인화면을 PJT 카드 그리드로 재구성
//  · 캐러셀 · 월마감 단계 레일 · 월 마감 버튼 · 인사말 → 화면에서 제거
//  · PJT 단위 카드에 해야 할 일 / 이상징후를 함께 요약
//  · 카드의 항목을 누르면 수행원가 › 원가조정의 해당 PJT·계정 화면으로 이동
//
//  ※ 제거한 기능의 코드는 지우지 않고 호출만 끊었다. 되살릴 때 다시 붙이면 된다.
// ============================================================

// 카드로 보여줄 PJT 2건 추가 (상세 화면이 열리도록 예산 데이터까지 만든다)
const EXTRA_PJTS = [
  { key:'smart', no:'30140055-D001', name:'스마트팩토리 MES 고도화',
    client:'SK실트론', org:'제조AX사업본부', pm:'이봄', period:'2026-03-01 ~ 2026-12-31',
    plan:{ 인건비: 420000000, 외주비: 510000000, 재료비: 88000000, 경비: 32000000, 'A/S Cost': 0 },
    months:[
      ['2026-03','actual',{ labor:38000000, outsource:44000000, material:8000000, expense:2800000 }],
      ['2026-04','actual',{ labor:41000000, outsource:47000000, material:8400000, expense:3000000 }],
      ['2026-05','actual',{ labor:43000000, outsource:51000000, material:8800000, expense:3200000 }],
      ['2026-06','actual',{ labor:44000000, outsource:53000000, material:9000000, expense:3300000 }],
      ['2026-07','actual',{ labor:45000000, outsource:55000000, material:9200000, expense:3400000 }],
      ['2026-08','plan',  { labor:46000000, laborQ:46000000, outsource:57000000, outsourceQ:30000000, material:9400000, expense:3400000 }],
      ['2026-09','plan',  { labor:46000000, outsource:57000000, material:9400000, expense:3400000 }],
      ['2026-10','plan',  { labor:46000000, outsource:57000000, material:9400000, expense:3400000 }],
      ['2026-11','plan',  { labor:36000000, outsource:47000000, material:8200000, expense:3200000 }],
      ['2026-12','plan',  { labor:35000000, outsource:42000000, material:8200000, expense:2900000 }],
    ],
    todos:[
      { acct:'외주비', title:'외주 검수 지연 2건을 확정해야 합니다',
        why:'검수 완료분만 실적으로 인식됩니다. 8월 마감 전에 확정하지 않으면 실적이 9월로 밀립니다.',
        from:510000000, to:510000000,
        guide:{ where:'수행원가 › 원가조정 › 외주비', do:'검수 대기 2건의 검수 완료를 처리합니다',
                decide:'금액 변동 없이 인식 시점만 바뀝니다' } },
      { acct:'재료비', title:'설비 자재 계획을 9,000,000원 증액해야 합니다',
        why:'구매 견적이 계획을 초과해 PO를 발행할 수 없습니다.',
        from:88000000, to:97000000,
        guide:{ where:'수행원가 › 원가조정 › 재료비', do:'해당 품목 계획 금액을 수정합니다',
                decide:'증액 후 CP 한도 이내인지 확인합니다' } },
    ],
    risks:[
      { acct:'인건비', sev:'warning', scen:'투입 초과', title:'인건비 집행이 계획보다 4.2% 빠릅니다',
        why:'현재 소진 속도가 유지되면 11월에 계정 한도에 도달합니다.', impact:'+1,760만원' },
    ] },

  { key:'aidoc2', no:'30150210-D001', name:'AI 문서심사 자동화',
    client:'신한카드', org:'금융·데이터사업본부', pm:'이봄', period:'2026-05-01 ~ 2027-02-28',
    plan:{ 인건비: 310000000, 외주비: 240000000, 재료비: 26000000, 경비: 18000000, 'A/S Cost': 0 },
    months:[
      ['2026-05','actual',{ labor:28000000, outsource:20000000, material:2400000, expense:1600000 }],
      ['2026-06','actual',{ labor:30000000, outsource:22000000, material:2500000, expense:1700000 }],
      ['2026-07','actual',{ labor:31000000, outsource:24000000, material:2600000, expense:1800000 }],
      ['2026-08','plan',  { labor:32000000, laborQ:32000000, outsource:25000000, material:2600000, expense:1800000 }],
      ['2026-09','plan',  { labor:32000000, outsource:25000000, material:2600000, expense:1800000 }],
      ['2026-10','plan',  { labor:32000000, outsource:25000000, material:2600000, expense:1800000 }],
      ['2026-11','plan',  { labor:32000000, outsource:25000000, material:2600000, expense:1800000 }],
      ['2026-12','plan',  { labor:31000000, outsource:24000000, material:2500000, expense:1800000 }],
      ['2027-01','plan',  { labor:31000000, outsource:25000000, material:2600000, expense:1800000 }],
      ['2027-02','plan',  { labor:31000000, outsource:25000000, material:2600000, expense:1900000 }],
    ],
    todos:[
      { acct:'인건비', title:'SCM 확정 인력 1명을 인건비에 반영해야 합니다',
        why:'9월 합류 인력 1명(3.0MM)이 확정 수신되었습니다. 등록하지 않으면 집행할 예산이 없습니다.',
        from:310000000, to:325000000,
        guide:{ where:'수행원가 › 원가조정 › 인건비', do:'[인력 추가]로 확정 인력을 반영합니다',
                decide:'등급·단가가 SCM 확정값과 같은지 대조합니다' } },
    ],
    risks:[] },
];

(function createExtraProjects() {
  function bind() {
    if (typeof EXEC_BUDGET_PROJECTS === 'undefined' || typeof BUDGET_SOURCE === 'undefined'
        || typeof budgetMockMonth !== 'function') { setTimeout(bind, 300); return; }
    EXTRA_PJTS.forEach(function (x) {
      if (BUDGET_SOURCE[x.key]) return;
      if (!EXEC_BUDGET_PROJECTS.some(function (e) { return e.key === x.key; })) {
        EXEC_BUDGET_PROJECTS.push({ key:x.key, no:x.no, name:x.name, type:'SI-AD', status:'수행',
          pm:x.pm, salesOrg:x.org, customer:x.client, period:x.period });
      }
      BUDGET_SOURCE[x.key] = {
        projName: x.name, stage: '수행', dplus: 120,
        start: x.months[0][0], end: x.months[x.months.length - 1][0], current: '2026-08',
        plan: x.plan, transfer: { 인건비:0, 외주비:0, 재료비:0, 경비:0, 'A/S Cost':0 },
        months: x.months.map(function (m) { return budgetMockMonth(m[0], m[1], m[2]); }),
      };
      if (typeof budgetTransferHistory !== 'undefined' && !budgetTransferHistory[x.key]) budgetTransferHistory[x.key] = [];
      // 상세 화면(Agent 콘솔)에도 같은 건이 보이도록 제안으로 등록
      if (typeof AGENT_PROPOSALS_FINAL !== 'undefined') {
        x.todos.forEach(function (t, i) {
          AGENT_PROPOSALS_FINAL.push({ id:'ex-' + x.key + '-' + i, pjt:x.key, stage:'input', acct:t.acct,
            status:'pending', confidence:0.9, detectedAt:'2026-08-20 09:00', trigger:'I/F 수신',
            title:t.title, why:t.why, guide:t.guide, from:t.from, to:t.to, impact:'CP 한도 이내입니다.' });
        });
      }
      if (typeof SCEN_RISKS_BY_PJT !== 'undefined') SCEN_RISKS_BY_PJT[x.key] = x.risks.slice();
      if (typeof HOME_PROJECTS !== 'undefined' && !HOME_PROJECTS.some(function (p) { return p.id === x.key; })) {
        HOME_PROJECTS.push({ id:x.key, no:x.no, name:x.name });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 18차 — PJT 카드 그리드 ────────────────────────────────

// 카드에 올릴 PJT 순서 (앞 4개가 기본 노출)
function homeCardPjts() {
  const order = [SCEN_PJT.key, MOCK_PJT.key, 'smart', 'aidoc2'];
  const list = order.map(function (k) { return HOME_PROJECTS.find(function (p) { return p.id === k; }); }).filter(Boolean);
  // 그 외 프로젝트는 상세 데이터가 있고, 실제로 볼 것(할 일·이상징후)이 있을 때만 카드로 띄운다.
  // 팀원이 수행원가에 프로젝트를 추가하면 여기로 자동 편입된다.
  HOME_PROJECTS.forEach(function (p) {
    if (order.indexOf(p.id) >= 0) return;
    if (typeof BUDGET_SOURCE === 'undefined' || !BUDGET_SOURCE[p.id]) return;
    if (pjtTodosOf(p.id).length + pjtRisksOf(p.id).length === 0) return;
    list.push(p);
  });
  return list;
}

// PJT 단위 해야 할 일 / 이상징후 (단계 구분 없이 전부)
function pjtTodosOf(pj) {
  return homeProposalsOf(pj, null).map(function (p) {
    return { acct:p.acct, title:p.title, from:p.from, to:p.to };
  });
}
function pjtRisksOf(pj) {
  return (SCEN_RISKS_BY_PJT[pj] || []).map(function (r) {
    return { acct:r.acct, title:r.title, sev:r.sev, scen:r.scen, impact:r.impact };
  });
}

function pjtCardHtml(p) {
  const todos = pjtTodosOf(p.id);
  const risks = pjtRisksOf(p.id);
  const src = (typeof BUDGET_SOURCE !== 'undefined') ? BUDGET_SOURCE[p.id] : null;
  const stage = src ? src.stage : '';
  const line = function (acct, title, cls) {
    return `<button class="pc-row ${cls || ''}" onclick="event.stopPropagation();homePjtGo('${escAttr(p.id)}','${escAttr(acct)}')">
        <span class="pc-acct ${homeAcctCls(acct)}">${escHtml(acct)}</span>
        <span class="pc-t">${escHtml(title)}</span>
      </button>`;
  };
  const todoRows = todos.slice(0, 3).map(function (t) { return line(t.acct, t.title); }).join('');
  const riskRows = risks.slice(0, 2).map(function (r) { return line(r.acct, r.title, 'risk'); }).join('');
  const moreT = todos.length > 3 ? `<span class="pc-more">+${todos.length - 3}건 더</span>` : '';
  const moreR = risks.length > 2 ? `<span class="pc-more">+${risks.length - 2}건 더</span>` : '';

  return `
    <article class="pc" onclick="homePjtGo('${escAttr(p.id)}')">
      <div class="pc-head">
        <div class="pc-no">${escHtml(p.no || '')}${stage ? ` · <em>${escHtml(stage)}</em>` : ''}</div>
        <h3 class="pc-name">${escHtml(p.name)}</h3>
      </div>
      <div class="pc-kpi">
        <span class="pc-k todo"><i>✓</i>해야 할 일 <b>${todos.length}</b></span>
        <span class="pc-k risk"><i>!</i>이상징후 <b>${risks.length}</b></span>
      </div>
      <div class="pc-body">
        ${todos.length ? `<div class="pc-sec">해야 할 일</div>${todoRows}${moreT}` : '<div class="pc-empty">해야 할 일이 없습니다.</div>'}
        ${risks.length ? `<div class="pc-sec risk">이상징후</div>${riskRows}${moreR}` : ''}
      </div>
    </article>`;
}

// 카드/항목 클릭 → 수행원가 › 원가조정의 그 PJT(·계정) 화면
function homePjtGo(pj, acct) {
  const a = (!acct || acct === '전 계정') ? '인건비' : acct;
  if (typeof openCostArea === 'function') openCostArea(a, pj);
  else if (typeof openCostAdjust === 'function') openCostAdjust(pj);
}

// 6개까지는 2×3 그리드, 7개부터는 6개씩 페이지를 넘긴다
let pjtPage = 0;
function pjtPageCount() { return Math.max(1, Math.ceil(homeCardPjts().length / 6)); }
function movePjtPage(d) {
  const n = pjtPageCount();
  pjtPage = (pjtPage + d + n) % n;
  const el = document.getElementById('home-board');
  if (el) el.innerHTML = homeWorkBoardHtml();
}

function homeWorkBoardHtml() {
  const all = homeCardPjts();
  const n = pjtPageCount();
  if (pjtPage >= n) pjtPage = 0;
  const page = all.slice(pjtPage * 6, pjtPage * 6 + 6);
  const cards = page.map(pjtCardHtml).join('');
  const pager = n > 1
    ? `<div class="pc-pager">
         <button class="pc-arrow" onclick="movePjtPage(-1)" aria-label="이전">‹</button>
         <span class="pc-page">${pjtPage + 1} / ${n}</span>
         <button class="pc-arrow" onclick="movePjtPage(1)" aria-label="다음">›</button>
       </div>`
    : '';
  return `
    <div class="pc-head-row">
      <span class="pc-h-t">담당 프로젝트 <b>${all.length}</b></span>
      <span class="pc-h-d">해야 할 일과 이상징후를 프로젝트별로 봅니다 · 항목을 누르면 해당 계정 화면으로 이동합니다</span>
      ${pager}
    </div>
    <div class="pc-grid">${cards}</div>`;
}

// ── 메인화면 — 입력창 + PJT 카드 그리드 ──
function renderPmDashboard() {
  return `
    <div class="ai-workspace home2 home-simple home-cards">
      <section class="home2-main centered">
        <div class="home2-title">실행예산 에이전트</div>

        <div class="home2-search">
          <span class="home2-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f6bed" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3.2"/>
              <path d="M12 4.4V8"/>
              <circle cx="12" cy="3.2" r="1.3" fill="#2f6bed" stroke="none"/>
              <circle cx="9.2" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <circle cx="14.8" cy="13.4" r="1.2" fill="#2f6bed" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </span>
          <input id="ai-main-query" type="text" placeholder="질문을 남겨주세요"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>

        <div id="home-board">${homeWorkBoardHtml()}</div>
      </section>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}

function rerenderHomeFeed() {
  const bd = document.getElementById('home-board'); if (bd) bd.innerHTML = homeWorkBoardHtml();
}

// ============================================================
//  20차 — 상세 화면의 처리 상태를 메인 카드에 연동
//
//  원가조정 Agent 콘솔의 제안 상태(budget-agent-console.js 기준)
//    pending   PM 검토 대기        → 해야 할 일
//    approved  PM 검토 완료(기안 대상) → 진행 중
//    submitted 직책자 결재 대기        → 진행 중
//    confirmed 승인 완료 · 예산 반영    → [처리완료] · 회색
//    returned  반려 · PM 재기안 대기    → 해야 할 일(다시)
//    rejected  PM 반려                 → 목록에서 제외
//
//  상세 화면에서 승인이 끝나면 같은 데이터를 읽는 메인 카드도 함께 바뀐다.
// ============================================================

// 상태별 표시 규칙
const PJT_ITEM_STATE = {
  pending:   { open:true,  label:'',        cls:'' },
  returned:  { open:true,  label:'[재기안]', cls:'ret' },
  approved:  { open:false, label:'[결재중]', cls:'prog' },
  submitted: { open:false, label:'[결재중]', cls:'prog' },
  confirmed: { open:false, label:'[처리완료]', cls:'done' },
};
function pjtItemState(st) { return PJT_ITEM_STATE[st] || PJT_ITEM_STATE.pending; }

// 반려(rejected)만 감추고 나머지는 상태와 함께 보여준다
function homeProposalsOf(pj, stage) {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined') return [];
  return AGENT_PROPOSALS_FINAL.filter(function (p) {
    if ((p.pjt || MOCK_PJT.key) !== pj) return false;
    if (p.status === 'rejected') return false;
    const st = p.stage || 'input';
    return !stage || st === stage;
  });
}

function pjtTodosOf(pj) {
  return homeProposalsOf(pj, null).map(function (p) {
    const s = pjtItemState(p.status);
    return { acct:p.acct, title:p.title, status:p.status, open:s.open, label:s.label, cls:s.cls,
             from:p.from, to:p.to };
  });
}

// 이상징후는 같은 계정의 제안이 승인 완료되면 해소된 것으로 본다
function pjtRisksOf(pj) {
  const confirmedAccts = homeProposalsOf(pj, null)
    .filter(function (p) { return p.status === 'confirmed'; })
    .map(function (p) { return p.acct; });
  return (SCEN_RISKS_BY_PJT[pj] || []).map(function (r) {
    const done = confirmedAccts.indexOf(r.acct) >= 0;
    return { acct:r.acct, title:r.title, sev:r.sev, scen:r.scen, impact:r.impact,
             open:!done, label:done ? '[처리완료]' : '', cls:done ? 'done' : '' };
  });
}

// ── 카드 렌더 — 처리완료는 회색 + [처리완료] 표기 ──
function pjtCardHtml(p) {
  const todos = pjtTodosOf(p.id);
  const risks = pjtRisksOf(p.id);
  const openTodo = todos.filter(function (t) { return t.open; }).length;
  const openRisk = risks.filter(function (r) { return r.open; }).length;
  const doneCnt = todos.filter(function (t) { return t.cls === 'done'; }).length
                + risks.filter(function (r) { return r.cls === 'done'; }).length;
  const src = (typeof BUDGET_SOURCE !== 'undefined') ? BUDGET_SOURCE[p.id] : null;
  const stage = src ? src.stage : '';

  const line = function (it, isRisk) {
    return `<button class="pc-row ${isRisk ? 'risk' : ''} ${it.cls || ''}"
        onclick="event.stopPropagation();homePjtGo('${escAttr(p.id)}','${escAttr(it.acct)}')">
        <span class="pc-acct ${homeAcctCls(it.acct)}">${escHtml(it.acct)}</span>
        <span class="pc-t">${it.label ? `<em class="pc-flag ${it.cls}">${escHtml(it.label)}</em>` : ''}${escHtml(it.title)}</span>
      </button>`;
  };
  // 남은 일을 먼저, 처리된 건은 아래로
  const sortOpen = function (a, b) { return (b.open ? 1 : 0) - (a.open ? 1 : 0); };
  const tSorted = todos.slice().sort(sortOpen);
  const rSorted = risks.slice().sort(sortOpen);
  const todoRows = tSorted.slice(0, 3).map(function (t) { return line(t, false); }).join('');
  const riskRows = rSorted.slice(0, 2).map(function (r) { return line(r, true); }).join('');
  const moreT = todos.length > 3 ? `<span class="pc-more">+${todos.length - 3}건 더</span>` : '';
  const moreR = risks.length > 2 ? `<span class="pc-more">+${risks.length - 2}건 더</span>` : '';

  return `
    <article class="pc" onclick="homePjtGo('${escAttr(p.id)}')">
      <div class="pc-head">
        <div class="pc-no">${escHtml(p.no || '')}${stage ? ` · <em>${escHtml(stage)}</em>` : ''}</div>
        <h3 class="pc-name">${escHtml(p.name)}</h3>
      </div>
      <div class="pc-kpi">
        <span class="pc-k todo"><i>✓</i>해야 할 일 <b>${openTodo}</b></span>
        <span class="pc-k risk"><i>!</i>이상징후 <b>${openRisk}</b></span>
        ${doneCnt ? `<span class="pc-k done"><i>✓</i>처리완료 <b>${doneCnt}</b></span>` : ''}
      </div>
      <div class="pc-body">
        ${todos.length ? `<div class="pc-sec">해야 할 일</div>${todoRows}${moreT}` : '<div class="pc-empty">해야 할 일이 없습니다.</div>'}
        ${risks.length ? `<div class="pc-sec risk">이상징후</div>${riskRows}${moreR}` : ''}
      </div>
    </article>`;
}

// 카드에 띄울 프로젝트 판단도 "남은 일"이 아니라 "표시할 항목" 기준으로
function homeCardPjts() {
  const order = [SCEN_PJT.key, MOCK_PJT.key, 'smart', 'aidoc2'];
  const list = order.map(function (k) { return HOME_PROJECTS.find(function (p) { return p.id === k; }); }).filter(Boolean);
  HOME_PROJECTS.forEach(function (p) {
    if (order.indexOf(p.id) >= 0) return;
    if (typeof BUDGET_SOURCE === 'undefined' || !BUDGET_SOURCE[p.id]) return;
    if (pjtTodosOf(p.id).length + pjtRisksOf(p.id).length === 0) return;
    list.push(p);
  });
  return list;
}

// 상세 화면에서 승인/반려하면 메인 카드도 최신 상태로 다시 그린다
(function watchDetailDecisions() {
  function bind() {
    const main = document.getElementById('s-main');
    if (!main) { setTimeout(bind, 300); return; }
    // 메인으로 돌아올 때 카드 갱신
    new MutationObserver(function () {
      if (main.classList.contains('active') && typeof rerenderHomeFeed === 'function') rerenderHomeFeed();
    }).observe(main, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
