// ════════════════════════════════════════
//  시스템 설명 — 4개 하위 메뉴
// ════════════════════════════════════════

// ── 1. 프로젝트 운영 컨셉 ──────────────
// AI GUIDE: 운영 가이드 화면입니다.
// - 시스템 컨셉, 업무 프로세스, 데이터 흐름, 부서별 R&R을 설명하는 정적 안내 화면입니다.
// - 화면 업무 가이드 챗봇의 기본 업무 지식으로 활용할 수 있는 설명성 콘텐츠가 많습니다.
// - AI 화면 가이드는 이 파일의 프로세스 설명을 근거로 사용자 질문에 업무 기준을 안내해야 합니다.

function renderSysDescConcept() {
  document.getElementById('s-system-desc').innerHTML = `
    <div class="page-header">
      <div class="page-title">프로젝트 운영 컨셉</div>
      <div class="page-sub">수주형 사업 기준 (SI · OS · TC) — 집행 자동화 · AI 통제 중심 예산관리</div>
    </div>
    ${buildConceptSection()}`;
}

// ── 2. 프로세스 ──────────────────────────
function renderSysDescProcess() {
  document.getElementById('s-system-desc').innerHTML = `
    <div class="page-header">
      <div class="page-title">프로세스</div>
      <div class="page-sub">프로젝트 등록 → 프로젝트 수행 (월마감·중간보고 순환) → 종료 전 주기 및 PM 월간 업무 흐름</div>
    </div>
    ${buildProcessSection()}
    ${buildMonthlySection()}`;
}

// ── 3. 데이터 ────────────────────────────
function renderSysDescData() {
  document.getElementById('s-system-desc').innerHTML = `
    <div class="page-header">
      <div class="page-title">데이터</div>
      <div class="page-sub">유관 시스템 간 데이터 흐름(인터페이스) 구성도 — CRM · AI PMO · SCM · ERP · BIX</div>
    </div>
    ${buildDataFlowSection()}`;
}

// ── 4. 유관부서 확인 필요사항 ─────────────────
function renderSysDescDepts() {
  document.getElementById('s-system-desc').innerHTML = `
    <div class="page-header">
      <div class="page-title">유관부서 확인 필요사항</div>
      <div class="page-sub">신규 예산관리 프로세스 전환 시 — 10개 부서별 핵심 확인 요청</div>
    </div>
    ${buildDeptsSection()}`;
}


// ════════════════════════════════════════
//  섹션 빌더
// ════════════════════════════════════════

// ── 컨셉 ────────────────────────────────
function buildConceptSection() {

  // ── PM 기대효과 데이터 ──
  const pmEffects = [
    {
      num:'01', icon:'✂️', title:'반복 계획 입력 및 행정 업무 제거',
      color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe',
      rows:[
        ['이미 확정된 실행 데이터를 PM이 반복 입력', '구매·실적 데이터 기반 자동 운영'],
        ['구매 요청/검수를 위해 실행예산 지속 수정', '별도 계획 입력 및 현행화 업무 제거'],
        ['계획 수정 → 승인 → 재수정 반복', '기준 기반 자동 통제 체계 적용'],
        ['시스템 입력 및 행정 업무 증가', '고객·현장 중심 PM 업무 집중'],
      ],
      quote:'숫자를 맞추는 업무보다 실제 프로젝트 운영에 집중',
    },
    {
      num:'02', icon:'🎯', title:'고객·현장 중심 PM 역할 강화',
      color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4',
      rows:[
        ['실행예산 수정 및 승인 요청 중심 업무', '고객·일정·리스크 중심 운영'],
        ['숫자 정합성 및 행정 처리 중심 운영', '수행 품질 및 프로젝트 운영 집중'],
        ['시스템 운영 보조 역할 수행', 'PM 본연의 역할 강화'],
        ['사후 대응 중심 운영', '현장 중심 선제 대응 가능'],
      ],
      quote:'예산 입력 담당자가 아닌 프로젝트 관리자 역할 강화',
    },
    {
      num:'03', icon:'📅', title:'월말 정산 중심 운영 → 상시 운영 체계 전환',
      color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe',
      rows:[
        ['월말 실적 확인 및 현행화 집중', '월중 상시 운영 체계 전환'],
        ['이슈 발생 후 사후 대응 중심', '리스크 조기 감지 및 선제 대응'],
        ['월말 승인 및 행정 업무 과부하', '운영 업무 분산 및 효율 향상'],
        ['월말 정산 중심 운영', '상시 실행 데이터 기반 운영'],
      ],
      quote:'월말 정산 중심 업무 → 월중 상시 운영 체계 전환',
    },
    {
      num:'04', icon:'🖥️', title:'시스템 기반 운영 효율 강화',
      color:'#d97706', bg:'#fffbeb', border:'#fde68a',
      rows:[
        ['여러 시스템 직접 조회 필요', '월간 업무 흐름 기준 작업 제공'],
        ['업무 흐름 파악 어려움', '필요한 작업 즉시 확인 가능'],
        ['시스템 이동 및 확인 업무 증가', '운영 집중도 및 업무 효율 향상'],
        ['운영보다 시스템 확인 업무 비중 증가', '기준 기반 자동 운영 체계 제공'],
      ],
      quote:'PM이 시스템을 찾아다니지 않는 구조',
    },
  ];

  // ── 전체 방향성 데이터 ──
  const summaryRows = [
    ['사람이 숫자를 반복 입력·검증·승인하는 운영 구조', '시스템은 실행 데이터를 기반으로 자동 운영 수행'],
    ['계획 입력 및 수기 현행화 중심 운영', '실행 데이터 기반 상시 운영 체계'],
    ['행정 및 정합성 확인 중심 업무', '고객·현장·리스크 중심 운영'],
    ['사람 중심 반복 운영 구조', '기준 기반 자동 통제 운영 구조'],
  ];

  function effectCard(e) {
    const tableRows = e.rows.map(([asis, tobe]) => `
      <tr>
        <td class="sd-asis-cell">${asis}</td>
        <td class="sd-tobe-cell">${tobe}</td>
      </tr>`).join('');
    return `
      <div class="sd-effect-card" style="border-top:3px solid ${e.color}">
        <div class="sd-effect-header" style="background:${e.bg}">
          <span class="sd-effect-num" style="background:${e.color}">${e.num}</span>
          <span class="sd-effect-icon">${e.icon}</span>
          <span class="sd-effect-title" style="color:${e.color}">${e.title}</span>
        </div>
        <div class="sd-effect-body">
          <table class="sd-abtable">
            <thead>
              <tr>
                <th class="sd-ab-th sd-asis-th">As-Is</th>
                <th class="sd-ab-th sd-tobe-th">To-Be</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="sd-effect-quote" style="border-left-color:${e.color};color:${e.color}">
            "${e.quote}"
          </div>
        </div>
      </div>`;
  }

  return `
  <div class="card sd-card">
    <div class="card-head">
      <span class="card-title">프로젝트 예산 관리 운영 기준 및 프로세스 안내</span>
      <span class="card-badge">수주형 사업 기준 SI · OS · TC</span>
    </div>
    <div class="sd-concept-body">
      <p class="sd-intro">
        카드 사용 내역이 자동으로 연결되어 가계부 실적이 쌓이듯, 프로젝트 예산도 실제 집행 데이터가 자동으로 반영되는 구조를 지향합니다.<br>
        다만 개인 가계부와 달리 회사 예산은 반드시 관리·통제가 필요하므로, AI가 일정과 프로젝트 유형·집행 패턴을 함께 분석하여
        예산 소진이 비정상적으로 빠르거나 느린 구간에 진입하면 자동으로 경고하고 가이드를 제공합니다.
      </p>
      <div class="sd-compare-grid">
        <div class="sd-compare-col sd-col-before">
          <div class="sd-compare-title">기존 방식</div>
          <ul class="sd-compare-list">
            <li>계획을 상세하게 세워야 함</li>
            <li>어차피 정해진 실적에 꿰맞추는 계획수립</li>
            <li>PM이 계속 입력/수정해야 함</li>
            <li>계획과 실적이 자주 어긋남</li>
            <li>운영이 번거롭고 현행화가 늦음</li>
          </ul>
        </div>
        <div class="sd-compare-arrow">→</div>
        <div class="sd-compare-col sd-col-after">
          <div class="sd-compare-title">제안 방식</div>
          <ul class="sd-compare-list">
            <li>카테고리별 예산 실링만 정의</li>
            <li>실제 집행 데이터 기준으로 자동 반영</li>
            <li>계획 대비 관리보다 한도 내 통제에 집중</li>
            <li>PM은 숫자 입력보다 의사결정에 집중</li>
          </ul>
        </div>
      </div>
      <div class="sd-insight">
        <span class="sd-insight-icon">💡</span>
        <div>
          <strong>대부분 수주형 사업의 예산 소비 패턴은 유형별로 반복 패턴이 존재합니다.</strong><br>
          계획을 과도하게 세분화하지 않아도, 카테고리별 실링과 실제 집행 흐름만으로도 충분히 관리 가능합니다.
        </div>
      </div>
      <div class="sd-scope-note">
        <span style="font-size:15px;font-weight:700;color:#1e293b">📌 적용 범위 안내</span><br>
        <span style="font-size:15px;color:#475569;line-height:1.8">
          현재 메뉴는 <strong>선행 프로세스가 정의된 수주형 사업(SI, OS, TC)</strong> 위주로 구성되어 있습니다.<br>
          Cloud나 투자 프로젝트 등은 관리 포인트·주기가 명확해지는 시점에 해당 유형에 맞게 별도 커스터마이징할 예정입니다.
        </span>
      </div>
    </div>
  </div>

  <!-- ── 기대 효과 ── -->
  <div class="card sd-card" style="margin-top:20px">
    <div class="card-head">
      <span class="card-title">기대 효과</span>
      <span class="card-badge">도입 시 실질적으로 무엇이 좋아지는가</span>
    </div>

    <!-- PM 관점 -->
    <div class="sd-effect-section">
      <div class="sd-effect-section-header">
        <span class="sd-effect-section-icon">👤</span>
        <div>
          <div class="sd-effect-section-title">PM (사업팀) 관점</div>
          <div class="sd-effect-section-sub">프로젝트를 직접 수행하는 PM · 사업팀 구성원 기준</div>
        </div>
      </div>
      <div class="sd-effect-grid sd-effect-grid-2">${pmEffects.map(effectCard).join('')}</div>
    </div>

    <!-- 전체 방향성 요약 -->
    <div class="sd-effect-summary">
      <div class="sd-effect-summary-label">🧭 전체 방향성</div>
      <table class="sd-summary-table">
        <thead>
          <tr>
            <th class="sd-ab-th sd-asis-th">As-Is</th>
            <th class="sd-ab-th sd-tobe-th">To-Be</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows.map(([a, b]) => `
            <tr>
              <td class="sd-asis-cell sd-summary-cell">${a}</td>
              <td class="sd-tobe-cell sd-summary-cell">${b}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── 프로세스 ─────────────────────────────
function buildProcessSection() {
  const phases = [
    {
      num:'01', title:'프로젝트 등록', sub:'Registration',
      headerBg:'#1d4ed8', accentColor:'#1d4ed8', cyclic:false,
      steps:[
        { title:'프로젝트 정보 입력',
          items:['프로젝트명, 고객사, 계약 유형','단계별 기간 설정','담당 PM / 팀원 배정'],
          note:'프로젝트 유형에 따라 data 입력 or I/F' },
        /*
        { title:'착수 보고서 작성 (AI 초안)',
          items:['단계별 기간 / 예상 예산 소진율','전체 원가·마진 계획','리스크 사전 분석 (AI 제공)'] },
        { title:'팀장 승인',
          items:['착수 보고서 검토 및 최종 승인','시스템 등록 완료·예산 확정'] },
        { title:'팀원 공유',
          items:['투입 정직원 전체 착수보고서 공유','프로젝트 목표·범위·역할 인지'],
          note:'구성원 전체가 프로젝트 방향을 함께 인지하는 것이 목적' },
        */
      ],
      tags:[
        { label:'팀장 승인',    color:'#166534', bg:'#dcfce7' },
        { label:'AI 초안 작성', color:'#92400e', bg:'#fef3c7' },
        { label:'팀원 공유',    color:'#1d4ed8', bg:'#dbeafe' },
      ],
    },
    {
      num:'02', title:'프로젝트 수행', sub:'Execution · 순환 반복',
      headerBg:'#0f766e', accentColor:'#0f766e', cyclic:true,
      cadenceGroups:[
        /*
        {
          cadence:'매일', icon:'🔁', color:'#0f766e', bg:'#f0fdfa', border:'#6ee7b7',
          steps:[
            { title:'AI 자동 집행 처리',
              items:['인건비·외주비·경비 자동 집행','Cost 한도 모니터링','일정 대비 집행률 실시간 추적'] },
            { title:'예외 감지·알림',
              items:['예산 초과 예측 시 자동 감지','리스크 항목 AI 분석·등록','집행 이상 시 담당자 알림 발송'] },
          ]
        },
        */
        {
          cadence:'월말', icon:'📅', color:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd',
          steps:[
            { title:'월마감',
              items:['월 실행예산 현행화 처리','마감 중 외부 IF 일시 차단','마감 완료 후 ERP·BIX 자동 전송'],
              note:'매월 말일 기준 · AI 자동 실행 후 PM 확인' },
          ]
        },
        /*
        {
          cadence:'단계마다', icon:'📋', color:'#d97706', bg:'#fffbeb', border:'#fcd34d',
          steps:[
            { title:'중간보고',
              items:['단계 전환 시 실적 vs 계획 비교','AI 초안 작성 후 PM 검토·수정','팀장 최종 승인 및 다음 단계 확정'],
              note:'프로젝트 단계 전환 시점마다 발생' },
          ]
        },
        {
          cadence:'필요 시', icon:'⚡', color:'#64748b', bg:'#f8fafc', border:'#cbd5e1',
          steps:[
            { title:'Cost 변경 승인 요청',
              items:['Cost 변경 AI 초안 작성','담당자 승인 / 반려 / 수정'],
              note:'AI PMO 시스템에서 진행 · Cost 변경이 필요한 경우에만 발생' },
            { title:'체크포인트 브리핑 (직책자 보고)',
              items:['AI 감지 체크포인트 목록 확인','PM이 중요 항목 선별','브리핑 자료 생성 → 팀장 · 본부장 공유'],
              note:'이슈 심각도가 높거나 의사결정이 필요한 경우 직책자에게 추가 보고' },
          ]
        },
        */
      ],
      tags:[
        { label:'AI 자동 처리', color:'#0f766e', bg:'#ccfbf1' },
        { label:'월마감',       color:'#7c3aed', bg:'#f5f3ff' },
        { label:'중간보고',     color:'#d97706', bg:'#fef3c7' },
        { label:'브리핑',       color:'#64748b', bg:'#f1f5f9' },
      ],
    },
    {
      num:'03', title:'프로젝트 종료', sub:'Closure',
      headerBg:'#ea580c', accentColor:'#c2410c', cyclic:false,
      steps:[
        { title:'종료 정산 처리',
          items:['미집행 예산 반납 처리','최종 원가·마진 확정'] },
        /*
        { title:'종료 보고서 작성 (AI 초안)',
          items:['단계별 실적 vs 계획 비교','최종 원가·마진·소진율 정리','이슈 및 교훈 (AI 자동 정리)'] },
        { title:'팀장 최종 승인',
          items:['종료 보고서 검토 및 승인','프로젝트 아카이브 완료'] },
        { title:'팀원 결과 공유',
          items:['레슨스런드 팀 전체 공유','성과·개선점 함께 되짚기'],
          note:'구성원 모두가 레슨스런드를 익히고 다음 프로젝트에 반영하는 것이 목적' },
        */
      ],
      tags:[
        { label:'팀장 승인',      color:'#166534', bg:'#dcfce7' },
        { label:'AI 초안 작성',   color:'#92400e', bg:'#fef3c7' },
        { label:'팀원 결과 공유', color:'#c2410c', bg:'#ffedd5' },
      ],
    },
  ];

  const cols = phases.map((ph, pi) => {
    let bodyHtml = '';

    if (ph.cadenceGroups) {
      // ── 주기별 그룹 렌더링 (순환 컬럼) ──
      const groups = ph.cadenceGroups.map((g, gi) => {
        const stepCards = g.steps.map(s => `
          <div class="sd-step-card sd-step-cadence-card" style="border-left:3px solid ${g.border}">
            <div class="sd-step-title">${s.title}</div>
            <ul class="sd-step-items">${s.items.map(it => `<li>${it}</li>`).join('')}</ul>
            ${s.note ? `<div class="sd-step-note">${s.note}</div>` : ''}
          </div>`).join('');

        const isLast = gi === ph.cadenceGroups.length - 1;
        return `
          <div class="sd-cadence-group" style="border-color:${g.border}">
            <div class="sd-cadence-label" style="background:${g.bg};color:${g.color};border-color:${g.border}">
              <span class="sd-cadence-icon">${g.icon}</span>
              <span class="sd-cadence-text">${g.cadence}</span>
            </div>
            <div class="sd-cadence-body">${stepCards}</div>
          </div>
          ${!isLast ? `<div class="sd-step-arrow">↓</div>` : ''}`;
      }).join('');

      const cycleFooter = `
        <div class="sd-cycle-footer">
          <div class="sd-cycle-arc">
            <span class="sd-cycle-icon">🔄</span>
            <span class="sd-cycle-text">주기에 따라 각 스텝 순환 반복</span>
          </div>
        </div>`;

      bodyHtml = groups + cycleFooter;

    } else {
      // ── 일반 순차 스텝 렌더링 ──
      bodyHtml = ph.steps.map((s, i) => `
        <div class="sd-step-card">
          <div class="sd-step-header-row">
            <div class="sd-step-num" style="color:${ph.accentColor}">STEP ${i+1}</div>
          </div>
          <div class="sd-step-title">${s.title}</div>
          <ul class="sd-step-items">${s.items.map(it => `<li>${it}</li>`).join('')}</ul>
          ${s.note ? `<div class="sd-step-note">${s.note}</div>` : ''}
        </div>
        ${i < ph.steps.length - 1 ? '<div class="sd-step-arrow">↓</div>' : ''}`
      ).join('');
    }

    const tags = ph.tags.map(t =>
      `<span class="sd-legend-tag" style="color:${t.color};background:${t.bg}">${t.label}</span>`
    ).join('');

    const arrow = pi < phases.length - 1
      ? `<div class="sd-phase-connector"><span>→</span></div>` : '';

    return `
      <div class="sd-phase-col${ph.cyclic ? ' sd-phase-col-cyclic' : ''}">
        <div class="sd-phase-header" style="background:${ph.headerBg}">
          <div class="sd-phase-num">${ph.num}</div>
          <div style="flex:1">
            <div class="sd-phase-title">${ph.title}</div>
            <div class="sd-phase-sub">${ph.sub}</div>
          </div>
          ${ph.cyclic ? `<span class="sd-cyclic-badge">↻</span>` : ''}
        </div>
        <div class="sd-phase-body">${bodyHtml}</div>
        <div class="sd-phase-tags">${tags}</div>
      </div>
      ${arrow}`;
  }).join('');

  return `
  <div class="card sd-card">
    <div class="card-head">
      <span class="card-title">프로젝트 관리 프로세스</span>
      <span class="card-badge">등록 → 수행 (순환) → 종료</span>
    </div>
    <div class="sd-process-grid">${cols}</div>
    <div class="sd-footnote">
      ※ 프로젝트 수행 단계는 월마감·중간보고·집행처리가 매월/단계 전환 시마다 순환 반복됩니다. AI 자동 처리 항목은 사람의 개입이 필요한 경우에만 승인 요청이 발생합니다.
    </div>
  </div>`;
}

// ── PM 월간 업무 ──────────────────────────
function buildMonthlySection() {
  const SYS_STYLE = {
    'AI 자동':      { bg:'#dcfce7', color:'#166534' },
    'AI PMO':       { bg:'#ede9fe', color:'#5b21b6' },
    '예산관리시스템': { bg:'#ccfbf1', color:'#0f766e' },
    'SCM':          { bg:'#dbeafe', color:'#1d4ed8' },
    '구매시스템':    { bg:'#ffedd5', color:'#c2410c' },
    '전사 시스템':   { bg:'#f1f5f9', color:'#475569' },
    'ERP':          { bg:'#dbeafe', color:'#1e40af' },
    'BIX':          { bg:'#fce7f3', color:'#9d174d' },
  };
  const pmBadge = `<span class="sd-task-pm">PM</span>`;
  function sysTag(name) {
    const s = SYS_STYLE[name] || { bg:'#f1f5f9', color:'#475569' };
    return `<span class="sd-task-sys" style="background:${s.bg};color:${s.color}">${name}</span>`;
  }
  function task({ sys, text, pm, time, ai }) {
    return `
      <div class="sd-month-task">
        <div class="sd-task-header">
          ${sysTag(sys)}
          ${pm ? pmBadge : (ai ? `<span class="sd-task-pm" style="background:#dcfce7;color:#166534">자동</span>` : '')}
        </div>
        <div class="sd-task-text">${text}</div>
        ${time ? `<div class="sd-task-time">⏱ ${time}</div>` : ''}
      </div>`;
  }
  function alertBox({ title, detail }) {
    return `
      <div class="sd-task-alert">
        <div class="sd-task-alert-title">⚠ ${title}</div>
        <div class="sd-task-alert-detail">${detail}</div>
      </div>`;
  }

  const periods = [
    {
      title:'월초', sub:'1~5일 · 전월 확인', bg:'#1d4ed8',
      html: task({ sys:'AI 자동', text:'전월 실행예산\n현행화 완료 확인' }),
    },
    {
      title:'월중', sub:'6~20일 · 상시 모니터링', bg:'#0f766e',
      html: `
        ${task({ sys:'AI 자동', text:'매일 야간 배치\n리스크 분석 결과 생성', time:'매일 자동' })}
        ${task({ sys:'예산관리시스템', text:'실적 실시간 확인\n(집행 / 소진율)', pm:true, time:'상시' })}
        ${task({ sys:'예산관리시스템', text:'AI 리스크 목록\n확인 및 조치', pm:true, time:'매일 오전' })}
      `,
    },
    {
      title:'마감 준비', sub:'21~24일 · 실투입 확정·검수', bg:'#d97706',
      html: `
        ${task({ sys:'SCM', text:'당월 정직원 투입계획 확정', pm:true })}
        ${task({ sys:'구매시스템', text:'외주 / 상품 구매요청 (PR) 승인', pm:true })}
        ${task({ sys:'구매시스템', text:'외주 / 상품구매\n실투입 검수 처리', pm:true })}
        ${task({ sys:'Finance', text:'전표(실적 이관 등) 처리', pm:true })}
      `,
    },
    {
      title:'월마감', sub:'25일~말일 · 마감 처리', bg:'#7c3aed',
      html: `
        ${task({ sys:'예산관리시스템', text:'당월 내부실투입\nERP 전표 처리 완료' })}
        ${alertBox({ title:'데이터 IF 일시 차단', detail:'Legacy 시스템 → ERP\n데이터 정합성 보장을 위해 마감 중 IF 차단' })}
        ${task({ sys:'전사 시스템', text:'비용마감 (AP / 법인카드 등)' })}
        ${task({ sys:'전사 시스템', text:'AR 발행 마감\nOS 미지급비용' })}
        ${task({ sys:'전사 시스템', text:'수주실적집계 마감' })}
        ${task({ sys:'예산관리시스템', text:'AI 리스크 분석\n결과 최종 확인' })}
      `,
    },
    {
      title:'마감 후', sub:'자동 처리 · 현행화 · 전송', bg:'#166534',
      html: `
        ${task({ sys:'예산관리시스템', text:'PJT단위 예산 현행화 자동 산정', ai:true })}
        ${task({ sys:'ERP', text:'월마감 데이터 ERP로 전송', ai:true })}
        ${task({ sys:'BIX', text:'BIX (추정관리) 전송', ai:true })}
        ${task({ sys:'SCM', text:'인력 확정 데이터 전송', pm:true })}
      `,
    },
  ];

  const cols = periods.map(p => `
    <div class="sd-month-col">
      <div class="sd-month-header" style="background:${p.bg}">
        <div class="sd-month-title">${p.title}</div>
        <div class="sd-month-sub">${p.sub}</div>
      </div>
      ${p.html}
    </div>`).join('');

  return `
  <div class="card sd-card" style="margin-top:20px">
    <div class="card-head">
      <span class="card-title">예산관리 / 통제 — PM 월간 업무</span>
      <span class="card-badge">Budget Control · PM이 한 달 동안 언제, 무엇을, 어떤 시스템에서 처리하는지</span>
    </div>
    <div class="sd-monthly-grid">${cols}</div>
    <div class="sd-footnote">
      ※ AI 자동 처리 항목은 시스템이 직접 집행·감지하며, 사람의 개입이 필요한 경우에만 승인 요청이 발생합니다.
    </div>
  </div>`;
}

// ── 데이터 흐름도 ─────────────────────────
function buildDataFlowSection() {
  function ifBox(dir, items, color) {
    const arrow = dir === 'in' ? '→' : '←';
    return items.map(([sys, data]) => `
      <div class="df-if-row">
        <div class="df-if-sys" style="background:${color.bg};color:${color.col};border-color:${color.col}">${sys}</div>
        <div class="df-if-arrow" style="color:${color.col}">${arrow}</div>
        <div class="df-if-data">${data}</div>
      </div>`).join('');
  }

  const inItems = [
    { sys:'CRM',    col:'#1d4ed8', bg:'#dbeafe',
      data:[['계약완료 프로젝트','프로젝트명·고객사·계약유형·금액·기간'],
            ['수행 PM 정보','PM 및 수행 조직 데이터']] },
    { sys:'AI PMO', col:'#5b21b6', bg:'#ede9fe',
      data:[['Cost 계획 정보','Cost·MM·금액·단계별 배분'],
            ['Cost 변경 요청','변경 조건·변경 후 금액·승인 결과']] },
    { sys:'SCM',    col:'#0f766e', bg:'#ccfbf1',
      data:[['인건비 투입계획','당월 확정 MM·인원별 투입 내역'],
            ['외주 인력 확정','외주인력 투입 확정 정보']] },
    { sys:'구매AX', col:'#c2410c', bg:'#ffedd5',
      data:[['PO 데이터','외주비·재료비 PO 단위 금액·물건 내역'],
            ['검수 완료 정보','검수확인서 기준 실투입 확정']] },
    { sys:'ERP',    col:'#1e40af', bg:'#dbeafe',
      data:[['실적 전표','인건비 배부 전표·경비 처리 실적'],
            ['AP/AR 데이터','비용 마감·매출채권 처리 결과']] },
  ];

  const outItems = [
    { sys:'ERP',    col:'#1e40af', bg:'#dbeafe',
      data:[['실행예산 전송','월 실행예산(POt) ERP 등록 전송'],
            ['월마감 실적','당월 집행 실적 ERP 전송 (말일 자동)']] },
    { sys:'BIX',    col:'#9d174d', bg:'#fce7f3',
      data:[['추정관리 데이터','월별 집행 실적·예산 소진율 전송'],
            ['원가/마진 현황','프로젝트별 손익 현황 전송']] },
    { sys:'AI PMO', col:'#5b21b6', bg:'#ede9fe',
      data:[['리스크 분석 결과','AI 예산 리스크·집행 이상 감지 결과'],
            ['예산 소진 현황','카테고리별 소진율·투입미정 현황']] },
    { sys:'SCM',    col:'#0f766e', bg:'#ccfbf1',
      data:[['인건비 투입확정','매월 말 확정 인건비 투입 데이터 전송']] },
  ];

  const inCols = inItems.map(item => `
    <div class="df-ext-card">
      <div class="df-ext-header" style="background:${item.bg};color:${item.col};border-color:${item.col}">
        ${item.sys}
      </div>
      <div class="df-ext-body">
        ${item.data.map(([label, desc]) => `
          <div class="df-data-item">
            <div class="df-data-label">${label}</div>
            <div class="df-data-desc">${desc}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');

  const outCols = outItems.map(item => `
    <div class="df-ext-card">
      <div class="df-ext-header" style="background:${item.bg};color:${item.col};border-color:${item.col}">
        ${item.sys}
      </div>
      <div class="df-ext-body">
        ${item.data.map(([label, desc]) => `
          <div class="df-data-item">
            <div class="df-data-label">${label}</div>
            <div class="df-data-desc">${desc}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');

  return `
  <div class="card sd-card">
    <div class="card-head">
      <span class="card-title">유관시스템 데이터 흐름 (인터페이스) 구성도</span>
      <span class="card-badge">CRM · AI PMO · SCM · 구매AX · ERP · BIX</span>
    </div>
    <div class="sd-notice">데이터의 SoT 변경 시 송수신 시스템 변경 가능</div>
    <div class="df-wrap">

      <!-- 수신 (IN) -->
      <div class="df-side df-side-in">
        <div class="df-side-label">
          <span class="df-dir-badge df-in">▶ 수신 (Inbound)</span>
          <div class="df-side-sub">외부 시스템 → 예산관리시스템</div>
        </div>
        <div class="df-ext-list">${inCols}</div>
      </div>

      <!-- 중앙: 예산관리시스템 -->
      <div class="df-center">
        <div class="df-center-box">
          <div class="df-center-icon">💰</div>
          <div class="df-center-title">예산관리시스템</div>
          <div class="df-center-sub">New MIS</div>
          <div class="df-center-tags">
            <span class="df-ctag">실행예산 관리</span>
            <span class="df-ctag">AI 리스크 감지</span>
            <span class="df-ctag">Cost 통제</span>
            <span class="df-ctag">월마감 자동 처리</span>
            <span class="df-ctag">보고서 자동 생성</span>
          </div>
        </div>
      </div>

      <!-- 송신 (OUT) -->
      <div class="df-side df-side-out">
        <div class="df-side-label">
          <span class="df-dir-badge df-out">◀ 송신 (Outbound)</span>
          <div class="df-side-sub">예산관리시스템 → 외부 시스템</div>
        </div>
        <div class="df-ext-list">${outCols}</div>
      </div>

    </div>

    <!-- 하단: IF 시점 및 방식 요약 -->
    <div class="df-timing-grid">
      <div class="df-timing-card">
        <div class="df-timing-title">🔄 배치 (시간단위, 혹은 일배치)</div>
        <div class="df-timing-items">
          <div>CRM 계약완료 → 프로젝트 자동 등록</div>
          <div>AI PMO Cost 변경 → 반영</div>
          <div>AI 리스크 감지 → AI PMO 전송</div>
          <div>SCM 투입계획 → 인건비 현행화</div>
          <div>구매AX PO/검수 → 외주비 집행</div>
          <div>ERP 전표 → 실적 동기화</div>
        </div>
      </div>
      <div class="df-timing-card">
        <div class="df-timing-title">📆 월말 일괄</div>
        <div class="df-timing-items">
          <div>월마감 후 → ERP 실행예산 전송</div>
          <div>월마감 후 → BIX 추정관리 전송</div>
          <div>월말 → SCM 인건비 투입확정 전송</div>
          <div>마감 중 → 타 시스템 IF 일시 차단</div>
        </div>
      </div>
      <div class="df-timing-card">
        <div class="df-timing-title">⚠️ IF 제약 사항</div>
        <div class="df-timing-items">
          <div>월마감 기간 중 데이터 IF 일시 차단</div>
          <div>SCM → 확정 데이터만 수신 (계획 제외)</div>
          <div>ERP 전표 정합성 검증 후 반영</div>
        </div>
      </div>
    </div>
    <div class="sd-footnote">
      ※ IF: Interface (시스템 간 데이터 연계) · 점선 화살표는 단방향, 실선은 양방향 연계를 의미합니다.
    </div>
  </div>`;
}

// ── 유관부서 확인 필요사항 ─────────────────────
function buildDeptsSection() {
  const depts = [
    {
      num:'01', name:'회계팀', color:'#dc2626', bg:'#fee2e2', borderColor:'#dc2626',
      items:[
        '예산관리(통제) 구조가 회계 인식 기준과 충돌하는지',
        '예산 수립/현황화 자동화 구조의 회계적 타당성',
        '기존 PROMIS 실행예산 협조 내용 확인 요청',
        '결재 프로세스가 없어질 경우 우려 사항 및 업무 영향도 의견',
        '감가상각에 대한 계획·실적 발생의 명확한 기준·관리 필요',
      ]
    },
    {
      num:'02', name:'경영관리AX', color:'#1d4ed8', bg:'#dbeafe', borderColor:'#1d4ed8',
      items:[
        '예산관리(통제)의 최종 오너십 위치 확정',
        'AI 예산 통제 정책수립 필요 여부',
        '미래 계획 추정 방식 (As-Is 유지? New MIS에서 결정?)',
        '관리 기준 변경 시 KPI 기준 충돌 여부',
        '기존 PROMIS 실행예산 협조 내용 확인 요청',
        '결재 프로세스가 없어질 경우 우려 사항 및 업무 영향도 의견',
        'PJT 내 경비 계정 증·감액에 대한 기준 수립 필요',
      ]
    },
    {
      num:'03', name:'SCM / AI SCM', color:'#0f766e', bg:'#ccfbf1', borderColor:'#0f766e',
      items:[
        '인건비 투입 계획은 SCM에서 관리 (예산관리는 단순 인건비 관리)',
        '투입 계획 시 가용 예산 통제는 SCM 내에서 수행',
        '외주인력 계획 수립 및 관리 수준 (New MIS는 확정 정보만 수신)',
      ]
    },
    {
      num:'04', name:'구매AX', color:'#d97706', bg:'#fef3c7', borderColor:'#d97706',
      items:[
        '견적 데이터로 실투입 기준 수립·직접 생성·관리',
        '예산관리 시스템은 PO 단위 월별/금액/실적만 관리',
      ]
    },
    {
      num:'05', name:'FinAX', color:'#0891b2', bg:'#cffafe', borderColor:'#0891b2',
      items:[
        '예산관리 구조 변경에 따른 데이터 활용가능 범위 확인',
        'New MIS 수신 항목 vs FinAX → New MIS 제공 정보 정의',
      ]
    },
    {
      num:'06', name:'AI PMO', color:'#7c3aed', bg:'#ede9fe', borderColor:'#7c3aed',
      items:[
        'Cost 변경 조건 및 프로세스 확인',
        'Cost 수립 상세화 수준 확인',
        'C/P 상세 내역 (계정/월 단위) 전달 가능 여부',
        '기존 PROMIS 실행예산 협조 내용 확인 요청',
        '결재 프로세스가 없어질 경우 우려 사항 및 업무 영향도 의견',
      ]
    },
    {
      num:'07', name:'PROMIS 운영자', color:'#1e3a5f', bg:'#e0f2fe', borderColor:'#1e3a5f',
      items:[
        '구조 변경 시 실제로 업무가 불가능한 부분 파악',
        '타 시스템 IF 데이터 중 대체 불가능한 기능/데이터',
        '월마감 프로세스 변경에 따른 우려 사항',
      ]
    },
    {
      num:'08', name:'ERP 운영자', color:'#be123c', bg:'#ffe4e6', borderColor:'#be123c',
      items:[
        'ERP 기준에서 구조 변경 시 문제 없는지 확인',
        '월마감 후 전 프로젝트 예산 일괄 자동 현황화 처리',
        '처리 속도 개선 방안 검토 (현재: 병렬 처리 X, 순차 처리 O)',
      ]
    },
    {
      num:'09', name:'AI 개발자', color:'#1e293b', bg:'#f1f5f9', borderColor:'#475569',
      items:[
        'Rule → ML 전환 구조 가능 여부',
        '학습을 위한 데이터 최소 요구 조건',
        '성능/구조 한계',
      ]
    },
    {
      num:'10', name:'IT 기획팀', color:'#374151', bg:'#f3f4f6', borderColor:'#9ca3af',
      items:[
        '이 구조 관리 시 전산 감사 대응이 얼마나 빠질 범위',
        'DB 오라클 사용 가능 여부',
      ]
    },
  ];

  const cards = depts.map(d => `
    <div class="dept-card" style="border-top:4px solid ${d.borderColor}">
      <div class="dept-card-header" style="background:${d.bg}">
        <span class="dept-num" style="background:${d.color}">${d.num}</span>
        <span class="dept-name" style="color:${d.color}">${d.name}</span>
      </div>
      <div class="dept-card-body">
        ${d.items.map(item => `
          <div class="dept-item">
            <span class="dept-item-dot" style="background:${d.color}"></span>
            <span class="dept-item-text">${item}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  return `
  <div class="card sd-card">
    <div class="card-head">
      <span class="card-title">유관부서 업무 R&R 및 운영 기준</span>
      <span class="card-badge">신규 예산관리 프로세스 전환 시 — 10개 부서별 핵심 확인 요청</span>
    </div>
    <div class="dept-grid">${cards}</div>
    <div class="sd-footnote">
      ※ 위 확인사항은 신규 예산관리 시스템 전환 과정에서 각 유관부서와 사전 협의 및 확인이 필요한 항목입니다.
    </div>
  </div>`;
}
