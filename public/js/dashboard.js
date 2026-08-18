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
function rerenderHomeFeed() { const el = document.getElementById('home-insight-block'); if (el) el.innerHTML = renderHomeInsightBlock(); }

function scrollHomeTabs(dir) {
  const t = document.getElementById('hm-ptabs-track');
  if (!t) return;
  const max = t.scrollWidth - t.clientWidth;
  t.scrollLeft = Math.max(0, Math.min(max, t.scrollLeft + dir * 260));
}

function renderHomeInsightBlock() {
  const tabs = [{ id:'all', name:'전체' }].concat(HOME_PROJECTS.map(p => ({ id:p.id, name:p.name })))
    .map(t => `
        <button class="hm-ptab ${homeSelectedProject === t.id ? 'active' : ''}" onclick="selectHomeProject('${t.id}')">
          <span class="hm-ptab-name">${t.name}</span>
          <span class="hm-ptab-badge">${homeInsightCount(t.id)}</span>
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
    const budgetItems = shown.filter(i => i.cat === 'budget');
    const workItems = shown.filter(i => i.cat === 'work');
    if (budgetItems.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot budget"></span>예산 점검 <em>MIS 데이터에서 발견한 시그널</em></div>` + budgetItems.map(feedCard).join('');
    if (workItems.length) body += `<div class="hm-feed-cat"><span class="hm-feed-cat-dot work"></span>업무 반영 <em>외부 이벤트 → 원가 영향 → 필요한 업무</em></div>` + workItems.map(feedCard).join('');
  }

  return `
    ${tabsCarousel}
    <div class="home2-sec-head">
      <h2>확인이 필요한 것 <b>${filtered.length}가지</b></h2>
      <span>업무 이벤트가 수행원가에 미치는 영향과 다음 업무를 연결합니다</span>
    </div>
    ${catFilter}
    <div class="hm-feed">${body}</div>`;
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
  const sec = it.secondaries.map(s => `<button class="hm-btn" onclick="feedAct('${key}','${s.act}')">${s.label}</button>`).join('');
  return `<div class="hm-card-actions">
    <button class="hm-btn pri" onclick="feedAct('${key}','${p.act}')">${p.label}${p.ai ? ' <span class="hm-ai-spark">✦</span>' : ''}</button>${sec}
  </div>`;
}

function feedCardHead(it, sum) {
  const tag = it.cat === 'budget'
    ? `<span class="hm-dot hm-${it.sev}"></span><span class="hm-tag hm-${it.sev}">예산 점검 · ${it.sub}</span>`
    : `<span class="hm-tag work">업무 반영 · ${it.sub}</span>`;
  return `<div class="hm-card-head" onclick="toggleFeedCard(this)">
    <div class="hm-card-headmain">
      <div class="hm-card-top">${tag}<span class="hm-card-proj">${homeProjName(it.proj)}</span></div>
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

function renderPmDashboard() {
  homeSelectedProject = 'all';
  homeCat = 'all';

  return `
    <div class="ai-workspace home2">
      <section class="home2-main centered">
        <div class="home2-hero center">
          <h1>좋은 아침이에요, 봄님</h1>
          <p>담당 9개 프로젝트 중 <b>3개</b>에서 계획과 실적이 벌어지고 있어요</p>
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
          <input id="ai-main-query" type="text" placeholder="프로젝트를 찾거나, 숫자의 이유를 묻거나, 다음 업무를 요청해보세요"
            onfocus="showHomeExamples(true)" onblur="setTimeout(function(){showHomeExamples(false)},150)"
            onkeydown="if(event.key==='Enter') askFromHome()">
          <button class="home2-search-send" onclick="askFromHome()" aria-label="질문하기">↑</button>
        </div>
        <div class="home2-search-ex" id="home-search-ex" hidden>
          <button onmousedown="askExample('SKON 외주비가 왜 늘었어?')"><span class="ex-ag q">Q</span>SKON 외주비가 왜 늘었어?</button>
          <button onmousedown="askExample('실행예산 변경 화면 찾아줘')"><span class="ex-ag navi">N</span>실행예산 변경 화면 찾아줘</button>
          <button onmousedown="askExample('오늘 내가 처리해야 할 업무 알려줘')"><span class="ex-ag pilot">P</span>오늘 내가 처리해야 할 업무 알려줘</button>
        </div>

        <div id="home-insight-block">${renderHomeInsightBlock()}</div>
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
