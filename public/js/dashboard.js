function initDashboard() {
  const now  = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;

  document.getElementById('s-main').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">안녕하세요, 이봄 님 👋</div>
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

function openAiBudgetMock(account) {
  openBudgetProjectScreen('budgetMock');
  budgetDetailStep = 'setup';
  budgetSetupEditAccount = account;
  renderBudgetPage();
}

function openAiProjectBudget(projectKey) {
  openBudgetProjectScreen(projectKey || 'budgetMock');
}

const workDiaryItems = [
  { day: 15, title: '검수 마지막날 준비', memo: '고객 검수 체크리스트와 미결 이슈를 확인합니다.' },
  { day: 29, title: '월마감 전 실행예산 점검', memo: '실적/투입확정 금액과 변경 히스토리를 확인합니다.' },
];

function getWorkDiaryItems() {
  try {
    const saved = JSON.parse(localStorage.getItem('workDiaryItems') || '[]');
    return [...workDiaryItems, ...saved];
  } catch (e) {
    return workDiaryItems;
  }
}

function saveWorkDiary() {
  const dayEl = document.getElementById('diary-day');
  const titleEl = document.getElementById('diary-title');
  const memoEl = document.getElementById('diary-memo');
  const day = Number(dayEl ? dayEl.value : 0);
  const title = (titleEl ? titleEl.value : '').trim();
  const memo = (memoEl ? memoEl.value : '').trim();
  if (!day || !title) {
    showToast('업무일지 날짜와 할 일을 입력해주세요.');
    return;
  }
  const saved = JSON.parse(localStorage.getItem('workDiaryItems') || '[]');
  saved.unshift({ day, title, memo });
  localStorage.setItem('workDiaryItems', JSON.stringify(saved));
  if (titleEl) titleEl.value = '';
  if (memoEl) memoEl.value = '';
  showToast(`${day}일 일정에 업무일지를 추가했습니다.`);
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
        <h1>원가 관리 어렵지 않아요.<br>궁금하게 있다면 저에게 물어보세요</h1>
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
        <div class="ai-greeting">안녕하세요, 이봄님.</div>
        <h1>원가 관리 어렵지 않아요.<br>궁금하게 있다면 저에게 물어보세요</h1>
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
              <button onclick="openAiProjectBudget('cloud')">
                <strong>IV107786</strong>
                <span>26년 AX Solution서비스팀 그룹웨어 사업개발 활동 관리</span>
              </button>
              <button onclick="openAiProjectBudget('erp')">
                <strong>IV107785</strong>
                <span>출입통제 시스템 노후 서버 교체</span>
              </button>
              <button onclick="openAiProjectBudget('mobile')">
                <strong>IV107784</strong>
                <span>SK에코플랜트 배터리얼즈 26년 현업 주도 SOP 체계 구축 지원</span>
              </button>
            </div>
          </div>
          <div class="work-diary-card">
            <div class="home-section-title">업무일지</div>
            <div class="work-diary-helper">할일을 메모해두면 AI가 업무를 처리해드려요.</div>
            <label>
              <span>알림 날짜</span>
              <select id="diary-day">
                <option value="15">7월 15일</option>
                <option value="22">7월 22일</option>
                <option value="29">7월 29일</option>
              </select>
            </label>
            <label>
              <span>해야 할 일</span>
              <input id="diary-title" placeholder="예: 검수 마지막날 자료 확인">
            </label>
            <label>
              <span>메모</span>
              <textarea id="diary-memo" placeholder="달력 알림에 같이 표시할 내용을 입력하세요."></textarea>
            </label>
            <button onclick="saveWorkDiary()">업무일지 저장</button>
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
  getWorkDiaryItems().forEach(item => {
    events[item.day] = events[item.day] || [];
    events[item.day].push(item.title);
  });
  const diaryRows = getWorkDiaryItems()
    .sort((a, b) => a.day - b.day)
    .map(item => `
      <div class="${item.day === 15 ? 'urgent' : item.day === 29 ? 'closing' : ''}">
        <b>${item.day}일</b>
        <span><strong>${item.title}</strong><em>${item.memo || '업무일지에서 등록한 할 일입니다.'}</em></span>
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
      <div class="schedule-list">${diaryRows}</div>
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

function renderPmDashboard() {
  return `
    <div class="ai-workspace">
      <div class="ai-home-top">
        <div class="ai-brand">
          <strong>SKAX 원가관리 AI</strong>
          <span>실행예산 · 투입 · 정산 업무 도우미</span>
        </div>
        <div class="top-actions">
          ${renderRoleSwitch()}
          <button class="schedule-open-btn" onclick="openSchedulePanel()">일정 확인</button>
        </div>
      </div>

      <section class="ai-work-hero">
        <div class="ai-greeting">안녕하세요, 이봄님.</div>
        <h1>원가 관리 어렵지 않아요.<br>궁금하게 있다면 저에게 물어보세요</h1>
        <div class="ai-helper-card">
          <div class="ai-robot compact" aria-hidden="true">
            <div class="ai-robot-head"><span></span><span></span></div>
            <div class="ai-robot-body"></div>
          </div>
          <div>
            <strong>이번 달 원가관리 포인트</strong>
            <span>실행예산 조정, 인건비 승인요청, 일정 알림을 같이 확인할 수 있어요.</span>
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
              <button onclick="openAiProjectBudget('cloud')">
                <strong>IV107786</strong>
                <span>26년 AX Solution서비스팀 그룹웨어 사업개발 활동 관리</span>
              </button>
              <button onclick="openAiProjectBudget('erp')">
                <strong>IV107785</strong>
                <span>출입통제 시스템 노후 서버 교체</span>
              </button>
              <button onclick="openAiProjectBudget('mobile')">
                <strong>IV107784</strong>
                <span>SK에코플랜트 배터리얼즈 26년 현업 주도 SOP 체계 구축 지원</span>
              </button>
            </div>
          </div>
          <div class="work-diary-card">
            <div class="home-section-title">업무일지</div>
            <div class="work-diary-helper">할일을 메모해두면 AI가 업무를 처리해드려요.</div>
            <label>
              <span>알림 날짜</span>
              <select id="diary-day">
                <option value="15">7월 15일</option>
                <option value="22">7월 22일</option>
                <option value="29">7월 29일</option>
              </select>
            </label>
            <label>
              <span>해야 할 일</span>
              <input id="diary-title" placeholder="예: 검수 마지막날 자료 확인">
            </label>
            <label>
              <span>메모</span>
              <textarea id="diary-memo" placeholder="달력 알림에 같이 표시할 내용을 입력하세요."></textarea>
            </label>
            <button onclick="saveWorkDiary()">업무일지 저장</button>
          </div>
        </div>
      </section>
    </div>`;
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
