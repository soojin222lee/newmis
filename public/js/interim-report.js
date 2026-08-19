// ════════════════════════════════════════
//  중간보고 (Interim Report)
// ════════════════════════════════════════

let interimView = 'list';   // 'list' | 'detail'
let interimProj = 'cloud';
let interimPhaseIdx = 0;
let interimSearchQuery = '';
let interimStatusFilter = '';

// In-memory report state per project per phase-index
const INTERIM_REPORTS = {
  cloud: {
    0: { status:'승인완료', generatedAt:'25.04.07', approvedAt:'25.04.10', approver:'이봄',
         summary:'고객 추가 요건 발생으로 분석 범위 확대. 1개월 연장 및 예산 7,000만원 증가.',
         schedule:'계획 대비 30일 지연. 추가 요건 반영 완료. 설계 단계 일정 조정 협의 완료.',
         budget:'배분 예산 8,000만원 대비 집행 8,700만원 (+700만원 초과). 외주비 추가 발생.',
         risk:'고객 요건 변경 리스크 지속 모니터링. 설계 단계 scope creep 방지 조치 수립.',
         issues:'신규 요건 12건 접수 → 8건 반영, 4건 차기 단계 이관.' },
    1: { status:'승인완료', generatedAt:'25.07.19', approvedAt:'25.07.22', approver:'이봄',
         summary:'인프라 아키텍처 재검토로 설계 1개월 연장. 멀티클라우드 전략으로 방향 전환.',
         schedule:'계획 대비 30일 지연. 아키텍처 확정 완료. 개발 착수 준비 완료.',
         budget:'배분 예산 1.2억 대비 1.31억 집행 (+1,100만원 초과).',
         risk:'아키텍처 변경에 따른 개발 공수 재산정 완료. 리스크 수준 하향.',
         issues:'멀티클라우드 전환 결정 → 벤더사 추가 계약 완료.' },
    2: { status:'검토중', generatedAt:'26.04.01', approvedAt:null, approver:null,
         summary:'개발 단계 정상 진행 중. ATS 납품 일정 모니터링 필요. 현재까지 실적 집행률 73%.',
         schedule:'26.03 기준 정상 진행. ATS 납품 2주 지연 리스크 존재.',
         budget:'배분 예산 4.2억 중 3.065억 집행 (73%). 투입미정 관리 중.',
         risk:'ATS 납품 지연 시 테스트 단계 영향 가능. 대응 방안 수립 완료.',
         issues:'ATS 납품 4/29 부분 납품 협의 완료. 잔여 5/10 예정.' },
  },
  erp: {
    0: { status:'승인완료', generatedAt:'25.08.25', approvedAt:'25.08.28', approver:'이봄',
         summary:'분석 단계 계획 내 완료. 현행 업무 프로세스 분석 완료 및 TO-BE 설계 기반 확보.',
         schedule:'계획 대비 정상 완료.', budget:'예산 6,000만원 대비 5,800만원 집행 (정상).',
         risk:'데이터 이관 복잡도 추가 확인 필요.', issues:'없음' },
    1: { status:'승인완료', generatedAt:'25.12.02', approvedAt:'25.12.05', approver:'이봄',
         summary:'AS-IS 분석 추가 요건으로 1개월 연장. 설계 산출물 확정 완료.',
         schedule:'30일 지연. 개발 착수 준비 완료.', budget:'예산 9,000만원 대비 9,600만원 집행 (+600만원).',
         risk:'설계 변경 사항 개발 반영 일정 주의.', issues:'AS-IS 추가 분석 요건 13건 처리 완료.' },
    2: { status:'미생성', generatedAt:null, approvedAt:null, approver:null,
         summary:'', schedule:'', budget:'', risk:'', issues:'' },
  },
  mobile: {
    0: { status:'승인완료', generatedAt:'25.11.01', approvedAt:'25.11.05', approver:'이봄',
         summary:'Sprint 1 완료. 핵심 화면 UI 개발 완료. 사용자 피드백 15건 반영.',
         schedule:'계획 내 완료.', budget:'Sprint 1 배분 25% 예산 정상 집행.',
         risk:'디자인 변경 요청 증가 모니터링 필요.', issues:'디자인 수정 7건 처리 완료.' },
    1: { status:'승인완료', generatedAt:'26.02.02', approvedAt:'26.02.06', approver:'이봄',
         summary:'Sprint 2 완료. 결제 모듈 연동 완료. 성능 최적화 1차 완료.',
         schedule:'계획 내 완료.', budget:'Sprint 2 배분 30% 예산 정상 집행.',
         risk:'앱스토어 심사 지연 가능성 확인 필요.', issues:'결제 모듈 이슈 2건 해결 완료.' },
    2: { status:'검토중', generatedAt:'26.04.20', approvedAt:null, approver:null,
         summary:'Sprint 3 진행 중. 신기능 3종 중 2종 개발 완료. App Rating 4.3 달성.',
         schedule:'정상 진행 중.', budget:'Sprint 3 배분 예산 60% 집행.',
         risk:'앱스토어 심사 지연 시 출시 일정 영향.', issues:'심사 제출 준비 완료.' },
    3: { status:'미생성', generatedAt:null, approvedAt:null, approver:null,
         summary:'', schedule:'', budget:'', risk:'', issues:'' },
  },
  sec: {
    0: { status:'미생성', generatedAt:null, approvedAt:null, approver:null,
         summary:'', schedule:'', budget:'', risk:'', issues:'' },
  },
};

// 중간 단계 목록 (착수/종료 제외)
function getInterimPhases(proj) {
  const d = INIT_STATE[proj];
  return d.phases; // already excludes 착수/종료
}

function renderInterim() {
  const el = document.getElementById('s-interim');
  el.innerHTML = interimView === 'list' ? buildInterimListPage() : buildInterimPage();
}

// ── 목록 뷰 ─────────────────────────────
function buildInterimListPage() {
  const q = interimSearchQuery.toLowerCase();
  const statusLabel = { '승인완료':'승인 완료', '검토중':'검토 중', '미생성':'미생성' };
  const statusBg    = { '승인완료':'#dcfce7', '검토중':'#fef3c7', '미생성':'#f1f5f9' };
  const statusColor = { '승인완료':'#166534', '검토중':'#b45309', '미생성':'#94a3b8' };

  function projOverallStatus(k) {
    const phases = getInterimPhases(k);
    const reports = INTERIM_REPORTS[k] || {};
    const statuses = phases.map((_, i) => (reports[i] || {}).status || '미생성');
    if (statuses.some(s => s === '검토중')) return '검토중';
    if (statuses.every(s => s === '승인완료')) return '승인완료';
    return '미생성';
  }

  const allSt = ['검토중','승인완료','미생성'];
  const statusOpts = ['', ...allSt].map(s =>
    `<option value="${s}" ${s===interimStatusFilter?'selected':''}>${s ? statusLabel[s] : '전체 상태'}</option>`
  ).join('');

  const keys = ['cloud','erp','mobile','sec'];
  const filtered = keys.filter(k => {
    const p = PROJ_INFO_INIT[k]; const d = INIT_STATE[k];
    const matchQ = !q || [p.name, p.pm, d.methodology].some(v => v && v.toLowerCase().includes(q));
    const matchS = !interimStatusFilter || projOverallStatus(k) === interimStatusFilter;
    return matchQ && matchS;
  });

  const rows = filtered.length ? filtered.map(k => {
    const p = PROJ_INFO_INIT[k]; const d = INIT_STATE[k];
    const phases = getInterimPhases(k);
    const reports = INTERIM_REPORTS[k] || {};
    const doneCount   = phases.filter((_, i) => (reports[i]||{}).status === '승인완료').length;
    const reviewCount = phases.filter((_, i) => (reports[i]||{}).status === '검토중').length;
    const st = projOverallStatus(k);
    const phaseBadges = phases.map((ph, i) => {
      const r = (reports[i] || {});
      const bg  = r.status==='승인완료'?'#dcfce7':r.status==='검토중'?'#fef3c7':'#f1f5f9';
      const col = r.status==='승인완료'?'#166534':r.status==='검토중'?'#b45309':'#94a3b8';
      return `<span style="background:${bg};color:${col};font-size:12px;padding:2px 8px;border-radius:20px;white-space:nowrap">${ph.name}</span>`;
    }).join('');
    return `
      <tr onclick="openInterimDetail('${k}')">
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${d.methodology}</div>
        </td>
        <td>${p.pm}</td>
        <td><div style="display:flex;flex-wrap:wrap;gap:4px">${phaseBadges}</div></td>
        <td class="pt-center" style="white-space:nowrap">
          <span style="font-weight:700;color:#1d4ed8">${doneCount}</span>/<span style="color:#64748b">${phases.length}</span> 승인
          ${reviewCount > 0 ? `<br><span style="font-size:13px;color:#b45309">${reviewCount}건 검토중</span>` : ''}
        </td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${statusBg[st]};color:${statusColor[st]}">${statusLabel[st]}</span>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="5" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  return `
    <div class="page-header">
      <div class="page-title">중간보고</div>
      <div class="page-sub">각 단계(또는 Sprint) 완료 시 AI가 보고서를 생성합니다. PM 검토 후 승인하면 해당 단계가 공식 완료 처리됩니다.</div>
    </div>
    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM, 방법론 검색…" value="${interimSearchQuery}"
          oninput="interimSearchQuery=this.value;renderInterim()">
      </div>
      <select class="proj-filter-select" onchange="interimStatusFilter=this.value;renderInterim()">${statusOpts}</select>
      <span class="proj-count-tag">${filtered.length}건</span>
    </div>
    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>PM</th>
            <th>단계별 현황</th>
            <th class="pt-center">승인 현황</th>
            <th class="pt-center">상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openInterimDetail(proj) {
  interimProj = proj;
  interimPhaseIdx = 0;
  interimView = 'detail';
  renderInterim();
}

function closeInterimDetail() {
  interimView = 'list';
  renderInterim();
}

function buildInterimPage() {
  const tabs = ['cloud','erp','mobile','sec'].map(k => {
    const phases = getInterimPhases(k);
    const reports = INTERIM_REPORTS[k] || {};
    const hasReview = phases.some((_, i) => (reports[i] || {}).status === '검토중');
    return `<div class="pr-proj-tab ${k === interimProj ? 'active' : ''}" onclick="switchInterimProj('${k}')">
      ${hasReview ? '<span class="init-tab-dot dot-review"></span>' : ''}
      ${PROJ_INFO_INIT[k].name}
    </div>`;
  }).join('');

  const phases = getInterimPhases(interimProj);
  const reports = INTERIM_REPORTS[interimProj] || {};
  const method  = INIT_STATE[interimProj].methodology;

  // Sidebar phase list
  const phaseList = phases.map((ph, i) => {
    const rpt = reports[i] || { status: '미생성' };
    const dotCls = rpt.status === '승인완료' ? 'dot-approved' : rpt.status === '검토중' ? 'dot-review' : 'dot-none';
    return `<div class="interim-phase-item ${i === interimPhaseIdx ? 'active' : ''}" onclick="switchInterimPhase(${i})">
      <span class="init-tab-dot ${dotCls}" style="margin-right:8px"></span>
      <div>
        <div class="ipitem-name">${ph.name}</div>
        <div class="ipitem-status">${rpt.status}</div>
      </div>
    </div>`;
  }).join('');

  const selPhase = phases[interimPhaseIdx];
  const selReport = reports[interimPhaseIdx] || { status: '미생성' };
  const p = PROJ_INFO_INIT[interimProj];

  return `
<div class="page-header-row" style="margin-bottom:16px;align-items:center">
  <button class="back-btn" onclick="closeInterimDetail()">← 목록으로</button>
</div>
<div class="pr-tabs-wrap" style="margin-bottom:24px">${tabs}</div>

<div class="interim-layout">
  <!-- 단계 목록 사이드바 -->
  <div class="interim-sidebar">
    <div class="interim-sb-head">
      <div class="interim-sb-title">${p.name}</div>
      <div class="interim-sb-method">${method}</div>
    </div>
    <div class="interim-phase-list">${phaseList}</div>
  </div>

  <!-- 보고서 본문 -->
  <div class="interim-main">
    ${buildInterimReport(selPhase, selReport, interimPhaseIdx)}
  </div>
</div>`;
}

function buildInterimReport(ph, rpt, idx) {
  const p = PROJ_INFO_INIT[interimProj];
  const phases = getInterimPhases(interimProj);
  const budgetAmt = Math.round(p.budget * ph.budgetPct / 100);

  const statusCfg = {
    '미생성':  { label:'보고서 미생성', cls:'ap-none',     icon:'⏳' },
    '검토중':  { label:'검토 중',       cls:'ap-review',   icon:'✏️' },
    '승인완료':{ label:'승인 완료',      cls:'ap-approved', icon:'✅' },
  };
  const sc = statusCfg[rpt.status] || statusCfg['미생성'];

  let actionBtn = '';
  if (rpt.status === '미생성') {
    actionBtn = `<button class="init-action-btn btn-generate" onclick="generateInterimReport(${idx})">🤖 AI 보고서 생성</button>`;
  } else if (rpt.status === '검토중') {
    actionBtn = `<button class="init-action-btn btn-approve" onclick="approveInterimReport(${idx})">✅ 승인 완료</button>`;
  }

  const sections = rpt.status === '미생성' ? '' : `
    <div class="report-section-grid">
      ${[
        ['📅 일정 점검', rpt.schedule],
        ['💰 예산 점검', rpt.budget],
        ['⚠️ 리스크 현황', rpt.risk],
        ['🔧 주요 이슈 및 조치', rpt.issues],
      ].map(([title, body]) => `
        <div class="interim-section-card">
          <div class="interim-section-title">${title}</div>
          <div class="interim-section-body">${body}</div>
        </div>`).join('')}
    </div>`;

  return `
    <!-- 단계 헤더 -->
    <div class="interim-phase-header">
      <div>
        <div class="interim-phase-title">${ph.name} 보고</div>
        <div class="interim-phase-meta">기간 ${ph.months}개월 · 배분 예산 ${fmt(budgetAmt)}원 (${ph.budgetPct}%)</div>
      </div>
      <div class="ap-status-badge ${sc.cls}">${sc.icon} ${sc.label}</div>
    </div>

    ${rpt.status !== '미생성' ? `
    <!-- AI 요약 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">한눈에 보는 단계 현황</span>
        <span class="ai-badge">AI 생성 · ${rpt.generatedAt}</span>
      </div>
      <div style="padding:20px 24px">
        <div class="report-ai-box">${rpt.summary}</div>
      </div>
    </div>` : `
    <div class="card" style="margin-bottom:16px">
      <div style="padding:48px 24px;text-align:center;color:#94a3b8">
        <div style="font-size:38px;margin-bottom:12px">📋</div>
        <div style="font-size:17px;font-weight:600;margin-bottom:6px">아직 보고서가 생성되지 않았습니다</div>
        <div style="font-size:15px">단계 완료 후 AI 보고서를 생성하세요.</div>
      </div>
    </div>`}

    ${sections}

    <!-- 승인 액션 -->
    <div class="card">
      <div class="card-head"><span class="card-title">승인 처리</span></div>
      <div style="padding:20px 24px">
        ${rpt.status === '승인완료' ? `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="font-size:26px">✅</span>
            <div>
              <div style="font-size:17px;font-weight:700;color:#166534">승인 완료</div>
              <div style="font-size:15px;color:#64748b;margin-top:2px">${rpt.approvedAt} · ${rpt.approver} 승인</div>
            </div>
          </div>
          <div style="font-size:15px;color:#475569">이 단계는 공식 완료 처리되었습니다.</div>` :
          actionBtn || '<div style="font-size:15px;color:#94a3b8">보고서를 먼저 생성하세요.</div>'}
      </div>
    </div>

    <!-- 전체 단계 진행 현황 -->
    <div class="card" style="margin-top:16px">
      <div class="card-head"><span class="card-title">전체 단계 진행 현황</span></div>
      <div style="padding:16px 24px">
        <div class="interim-overview-row">
          ${phases.map((p, i) => {
            const r = (INTERIM_REPORTS[interimProj] || {})[i] || { status:'미생성' };
            const cls = r.status === '승인완료' ? 'io-done' : r.status === '검토중' ? 'io-review' : 'io-none';
            return `<div class="interim-overview-item ${cls} ${i === idx ? 'current' : ''}" onclick="switchInterimPhase(${i})">
              <div class="io-name">${p.name}</div>
              <div class="io-status">${r.status}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function switchInterimProj(proj) {
  interimProj = proj;
  interimPhaseIdx = 0;
  interimView = 'detail';
  renderInterim();
}

function switchInterimPhase(idx) {
  interimPhaseIdx = idx;
  renderInterim();
}

function generateInterimReport(idx) {
  if (!INTERIM_REPORTS[interimProj]) INTERIM_REPORTS[interimProj] = {};
  INTERIM_REPORTS[interimProj][idx] = {
    status: '검토중',
    generatedAt: '26.04.29',
    approvedAt: null,
    approver: null,
    summary: 'AI가 분석한 단계 현황입니다. 전반적으로 계획 대비 정상 진행 중이며 주요 리스크 항목을 확인하세요.',
    schedule: '계획 일정 내 진행 중.',
    budget: '배분 예산 대비 집행 현황 정상.',
    risk: 'AI 식별 리스크 없음. 지속 모니터링 권고.',
    issues: '미결 이슈 없음.',
  };
  showToast('AI 보고서가 생성되었습니다. 내용을 검토 후 승인하세요.');
  renderInterim();
}

function approveInterimReport(idx) {
  INTERIM_REPORTS[interimProj][idx].status = '승인완료';
  INTERIM_REPORTS[interimProj][idx].approvedAt = '26.04.29';
  INTERIM_REPORTS[interimProj][idx].approver = '이봄';
  showToast('중간보고가 승인 완료되었습니다.');
  renderInterim();
}
