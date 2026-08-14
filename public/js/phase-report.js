// ════════════════════════════════════════
//  프로젝트 단계보고
// ════════════════════════════════════════

let currentPhaseProj = 'cloud';
let selectedPhase    = null;

// in-memory approval state
const phaseReports = {};

// ── Data ──
const PHASE_SRC = {
  cloud: {
    name:'클라우드 인프라 고도화', pm:'김은지', team:'인프라팀',
    planStart:'25.01', planEnd:'26.08',
    targetMargin:22.0, currentMargin:19.3,
    budget:850000000, spent:552500000,
    overallStatus:'주의', currentPhaseIdx:3,
    phases:[
      { name:'착수',   planS:'25.01', planE:'25.01', actS:'25.01', actE:'25.01', status:'완료',   delay:0,  budget:30000000,  spent:28000000,  comment:'' },
      { name:'분석',   planS:'25.02', planE:'25.03', actS:'25.02', actE:'25.04', status:'완료',   delay:30, budget:80000000,  spent:87000000,  comment:'고객 추가 요건으로 분석 기간 1개월 연장, 인건비 초과 발생' },
      { name:'설계',   planS:'25.04', planE:'25.06', actS:'25.04', actE:'25.07', status:'완료',   delay:30, budget:120000000, spent:131000000, comment:'인프라 아키텍처 재검토로 설계 1개월 지연, 외주 추가 투입' },
      { name:'개발',   planS:'25.07', planE:'26.03', actS:'25.07', actE:null,    status:'진행중', delay:0,  budget:420000000, spent:306500000, comment:'현재 정상 진행 중. ATS 납품 일정 모니터링 필요' },
      { name:'테스트', planS:'26.04', planE:'26.05', actS:null,    actE:null,    status:'예정',   delay:0,  budget:120000000, spent:0,         comment:'' },
      { name:'안정화', planS:'26.06', planE:'26.07', actS:null,    actE:null,    status:'예정',   delay:0,  budget:60000000,  spent:0,         comment:'' },
      { name:'종료',   planS:'26.08', planE:'26.08', actS:null,    actE:null,    status:'예정',   delay:0,  budget:20000000,  spent:0,         comment:'' },
    ],
    risks:[
      { level:'높음', title:'외주비 집행률 77.7%',    status:'미조치' },
      { level:'주의', title:'인건비 MM 투입 19.9MM', status:'검토중' },
      { level:'주의', title:'서버 비용 월 초과 가능성', status:'조치완료' },
    ],
    issues:[
      { date:'26.04.15', title:'ATS 납품 일정 2주 지연', action:'4/29 부분 납품 협의 완료. 잔여 납품 5/10 예정', status:'처리중' },
      { date:'26.03.28', title:'클라우드 서버 비용 월 초과', action:'인스턴스 12개 중지, 월 320만원 절감 완료', status:'완료' },
    ],
    initReports:{
      0:{ status:'승인완료', approver:'이봄', approvedAt:'25.01.28', generatedAt:'25.01.25' },
      1:{ status:'승인완료', approver:'이봄', approvedAt:'25.04.10', generatedAt:'25.04.07' },
      2:{ status:'승인완료', approver:'이봄', approvedAt:'25.07.22', generatedAt:'25.07.19' },
      3:{ status:'검토중',   approver:null,   approvedAt:null,       generatedAt:'26.04.01' },
    }
  },
  erp: {
    name:'ERP 고도화', pm:'이강혁', team:'시스템팀',
    planStart:'25.06', planEnd:'26.09',
    targetMargin:18.0, currentMargin:17.2,
    budget:620000000, spent:297600000,
    overallStatus:'정상', currentPhaseIdx:3,
    phases:[
      { name:'착수',   planS:'25.06', planE:'25.06', actS:'25.06', actE:'25.06', status:'완료',   delay:0,  budget:20000000,  spent:19000000,  comment:'' },
      { name:'분석',   planS:'25.07', planE:'25.08', actS:'25.07', actE:'25.08', status:'완료',   delay:0,  budget:60000000,  spent:58000000,  comment:'' },
      { name:'설계',   planS:'25.09', planE:'25.11', actS:'25.09', actE:'25.12', status:'완료',   delay:30, budget:90000000,  spent:96000000,  comment:'AS-IS 분석 추가 요건으로 일정 소폭 연장' },
      { name:'개발',   planS:'25.12', planE:'26.05', actS:'25.12', actE:null,    status:'진행중', delay:0,  budget:310000000, spent:124600000, comment:'정상 진행 중. 1차 검수 일정 준비 필요' },
      { name:'테스트', planS:'26.05', planE:'26.07', actS:null,    actE:null,    status:'예정',   delay:0,  budget:100000000, spent:0,         comment:'' },
      { name:'안정화', planS:'26.07', planE:'26.08', actS:null,    actE:null,    status:'예정',   delay:0,  budget:30000000,  spent:0,         comment:'' },
      { name:'종료',   planS:'26.09', planE:'26.09', actS:null,    actE:null,    status:'예정',   delay:0,  budget:10000000,  spent:0,         comment:'' },
    ],
    risks:[
      { level:'중간', title:'일정 지연 가능성',      status:'검토중' },
      { level:'중간', title:'외부 연동 API 응답 지연', status:'조치완료' },
    ],
    issues:[
      { date:'26.04.18', title:'1차 검수 일정 사전 준비 부족', action:'체크리스트 초안 작성 완료, 담당자 배포 예정', status:'처리중' },
    ],
    initReports:{
      0:{ status:'승인완료', approver:'이봄', approvedAt:'25.06.30', generatedAt:'25.06.27' },
      1:{ status:'승인완료', approver:'이봄', approvedAt:'25.08.28', generatedAt:'25.08.25' },
      2:{ status:'승인완료', approver:'이봄', approvedAt:'25.12.05', generatedAt:'25.12.02' },
    }
  },
  mobile: {
    name:'모바일 앱 리뉴얼', pm:'최우진', team:'서비스팀',
    planStart:'25.08', planEnd:'26.06',
    targetMargin:20.0, currentMargin:21.4,
    budget:380000000, spent:273600000,
    overallStatus:'정상', currentPhaseIdx:4,
    phases:[
      { name:'착수',   planS:'25.08', planE:'25.08', actS:'25.08', actE:'25.08', status:'완료',   delay:0, budget:10000000,  spent:9500000,  comment:'' },
      { name:'분석',   planS:'25.09', planE:'25.09', actS:'25.09', actE:'25.09', status:'완료',   delay:0, budget:30000000,  spent:29000000, comment:'' },
      { name:'설계',   planS:'25.10', planE:'25.11', actS:'25.10', actE:'25.11', status:'완료',   delay:0, budget:50000000,  spent:48000000, comment:'' },
      { name:'개발',   planS:'25.12', planE:'26.03', actS:'25.12', actE:'26.03', status:'완료',   delay:0, budget:200000000, spent:197000000, comment:'정상 완료' },
      { name:'테스트', planS:'26.03', planE:'26.04', actS:'26.03', actE:null,    status:'진행중', delay:0, budget:60000000,  spent:24600000, comment:'iOS 심사 반려 이슈 해결 후 정상 진행 중' },
      { name:'안정화', planS:'26.05', planE:'26.05', actS:null,    actE:null,    status:'예정',   delay:0, budget:20000000,  spent:0,        comment:'' },
      { name:'종료',   planS:'26.06', planE:'26.06', actS:null,    actE:null,    status:'예정',   delay:0, budget:10000000,  spent:0,        comment:'' },
    ],
    risks:[
      { level:'낮음', title:'QA 인력 부족 우려',   status:'조치완료' },
      { level:'높음', title:'iOS 심사 반려 위험', status:'조치완료' },
    ],
    issues:[
      { date:'26.04.08', title:'iOS 심사 반려 → 개인정보 방침 미업데이트', action:'방침 업데이트 및 심사 재제출 완료', status:'완료' },
      { date:'26.04.22', title:'QA 외부 리소스 투입 결정', action:'A업체 계약 확정, 7/22부터 투입 예정', status:'완료' },
    ],
    initReports:{
      0:{ status:'승인완료', approver:'이봄', approvedAt:'25.08.30', generatedAt:'25.08.28' },
      1:{ status:'승인완료', approver:'이봄', approvedAt:'25.09.28', generatedAt:'25.09.26' },
      2:{ status:'승인완료', approver:'이봄', approvedAt:'25.11.28', generatedAt:'25.11.25' },
      3:{ status:'승인완료', approver:'이봄', approvedAt:'26.03.05', generatedAt:'26.03.03' },
    }
  },
  sec: {
    name:'보안 시스템 구축', pm:'정미래', team:'보안팀',
    planStart:'25.04', planEnd:'26.05',
    targetMargin:15.0, currentMargin:12.8,
    budget:290000000, spent:258100000,
    overallStatus:'위험', currentPhaseIdx:5,
    phases:[
      { name:'착수',   planS:'25.04', planE:'25.04', actS:'25.04', actE:'25.04', status:'완료',   delay:0,  budget:8000000,   spent:7500000,  comment:'' },
      { name:'분석',   planS:'25.05', planE:'25.06', actS:'25.05', actE:'25.06', status:'완료',   delay:0,  budget:25000000,  spent:24000000, comment:'' },
      { name:'설계',   planS:'25.07', planE:'25.08', actS:'25.07', actE:'25.09', status:'완료',   delay:30, budget:40000000,  spent:46000000, comment:'보안 규격 변경으로 설계 재작업 발생' },
      { name:'개발',   planS:'25.09', planE:'26.01', actS:'25.09', actE:'26.02', status:'완료',   delay:30, budget:130000000, spent:143000000, comment:'규격 변경 영향으로 개발 범위 확대' },
      { name:'테스트', planS:'26.01', planE:'26.02', actS:'26.02', actE:'26.03', status:'완료',   delay:30, budget:50000000,  spent:52600000, comment:'취약점 재스캔으로 일정 연장' },
      { name:'안정화', planS:'26.03', planE:'26.04', actS:'26.03', actE:null,    status:'진행중', delay:0,  budget:27000000,  spent:21600000, comment:'납품 D-1 최종 점검 진행 중' },
      { name:'종료',   planS:'26.05', planE:'26.05', actS:null,    actE:null,    status:'예정',   delay:0,  budget:10000000,  spent:0,        comment:'' },
    ],
    risks:[
      { level:'높음', title:'납품 D-1 최종 점검 미완료', status:'미조치' },
    ],
    issues:[
      { date:'26.04.28', title:'납품 전 보안 취약점 스캔 미완료', action:'스캔 툴 구동 중, 26.04.29 완료 예정', status:'처리중' },
      { date:'26.03.15', title:'예산 초과 가능성 검토', action:'범위 재협의로 일부 항목 다음 단계 이관 합의', status:'완료' },
    ],
    initReports:{
      0:{ status:'승인완료', approver:'이봄', approvedAt:'25.04.28', generatedAt:'25.04.25' },
      1:{ status:'승인완료', approver:'이봄', approvedAt:'25.06.28', generatedAt:'25.06.25' },
      2:{ status:'승인완료', approver:'이봄', approvedAt:'25.09.05', generatedAt:'25.09.03' },
      3:{ status:'승인완료', approver:'이봄', approvedAt:'26.02.10', generatedAt:'26.02.07' },
      4:{ status:'승인완료', approver:'이봄', approvedAt:'26.03.08', generatedAt:'26.03.05' },
    }
  }
};

// ── 초기화 ──
function initPhaseReport() {
  Object.keys(PHASE_SRC).forEach(proj => {
    phaseReports[proj] = {};
    PHASE_SRC[proj].phases.forEach((_, i) => {
      phaseReports[proj][i] = PHASE_SRC[proj].initReports[i] || { status:'미생성' };
    });
  });

  document.getElementById('s-phase-report').innerHTML = `
    <div class="page-header-row" style="margin-bottom:20px">
      <div>
        <div class="page-title">프로젝트 단계보고</div>
        <div class="page-sub">단계별 AI 보고서 생성 및 직책자 승인 관리</div>
      </div>
    </div>
    <div id="pr-proj-tabs"></div>
    <div id="pr-content"></div>
  `;
}

// ── 렌더링 ──
function renderPhaseReport() {
  const d = PHASE_SRC[currentPhaseProj];
  if (selectedPhase === null || selectedPhase === undefined) {
    selectedPhase = d.currentPhaseIdx;
  }
  renderProjTabs();
  renderPhasePage();
}

function renderProjTabs() {
  const STATUS_COLOR = { '위험':'#dc2626', '주의':'#d97706', '정상':'#166534' };
  const tabs = Object.entries(PHASE_SRC).map(([k, v]) => {
    const active  = k === currentPhaseProj ? 'active' : '';
    const sc      = STATUS_COLOR[v.overallStatus] || '#64748b';
    const shortName = v.name.replace('인프라 고도화','인프라').replace('시스템 구축','구축').replace('앱 리뉴얼','리뉴얼');
    return `<button class="pr-proj-tab ${active}" onclick="selectPhaseProj('${k}')">
      <span class="pr-tab-name">${shortName}</span>
      <span class="pr-tab-pm">${v.pm}</span>
      <span class="pr-tab-status" style="color:${sc}">${v.overallStatus}</span>
    </button>`;
  }).join('');
  document.getElementById('pr-proj-tabs').innerHTML = `<div class="pr-tabs-wrap">${tabs}</div>`;
}

function renderPhasePage() {
  const d  = PHASE_SRC[currentPhaseProj];
  const ph = d.phases[selectedPhase];
  const rpt = phaseReports[currentPhaseProj][selectedPhase];

  const spentPct    = Math.round(d.spent / d.budget * 100);
  const marginDiff  = d.currentMargin - d.targetMargin;
  const marginColor = marginDiff >= 0 ? '#166534' : marginDiff > -2 ? '#d97706' : '#dc2626';

  // ① 프로젝트 KPI row
  const kpiRow = `
    <div class="phase-kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">현재 단계</div>
        <div class="kpi-value" style="font-size:24px">${d.phases[d.currentPhaseIdx].name}</div>
        <div class="kpi-sub">${d.phases[d.currentPhaseIdx].status}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">전체 일정</div>
        <div class="kpi-value" style="font-size:20px">${d.planStart} ~ ${d.planEnd}</div>
        <div class="kpi-sub">계획 기준</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">현재 마진율</div>
        <div class="kpi-value" style="color:${marginColor}">${d.currentMargin.toFixed(1)}<span class="unit">%</span></div>
        <div class="kpi-sub" style="color:${marginColor}">목표 ${d.targetMargin.toFixed(1)}% (${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)}%p)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">예산 소진율</div>
        <div class="kpi-value" style="color:${spentPct>90?'#dc2626':spentPct>75?'#d97706':'#1e293b'}">${spentPct}<span class="unit">%</span></div>
        <div class="kpi-sub">${fmt(d.spent)}원 / ${fmt(d.budget)}원</div>
      </div>
    </div>`;

  // ② 단계 타임라인
  const timelineHtml = d.phases.map((p, i) => {
    let cls = 'upcoming';
    if (p.status === '완료')   cls = p.delay > 0 ? 'caution' : 'done';
    if (p.status === '진행중') cls = 'active';
    const selCls    = i === selectedPhase ? ' selected' : '';
    const curMark   = i === d.currentPhaseIdx ? '<span class="ph-cur-mark">▶</span>' : '';
    const delayBadge = p.delay > 0 ? `<span class="ph-delay">+${p.delay}일</span>` : '';
    const rStatus   = (phaseReports[currentPhaseProj][i] || {}).status || '미생성';
    const rDot      = rStatus === '승인완료' ? '✅' : rStatus === '검토중' ? '🔵' : '';
    return `<div class="phase-pill ${cls}${selCls}" onclick="selectPhaseIdx(${i})">
      ${delayBadge}
      <div class="ph-name">${curMark}${p.name}</div>
      <div class="ph-status">${p.status}</div>
      ${rDot ? `<div style="font-size:13px;margin-top:2px">${rDot}</div>` : ''}
    </div>`;
  }).join('');

  // ② 일정 점검 테이블
  const schedRows = d.phases.map((p, i) => {
    const rowBg = i === selectedPhase ? 'style="background:#eff6ff"' : '';
    let badge = '';
    if      (p.status === '완료'   && p.delay > 0) badge = `<span class="phase-badge delay">지연 +${p.delay}일</span>`;
    else if (p.status === '완료')                  badge = `<span class="phase-badge normal">정상</span>`;
    else if (p.status === '진행중')                badge = `<span class="phase-badge inprogress">진행중</span>`;
    else                                            badge = `<span class="phase-badge upcoming-b">예정</span>`;
    const actPeriod = p.actS ? `${p.actS} ~ ${p.actE || '진행중'}` : '—';
    return `<tr ${rowBg}>
      <td style="font-weight:600">${p.name}</td>
      <td>${p.planS} ~ ${p.planE}</td>
      <td>${actPeriod}</td>
      <td>${badge}</td>
      <td style="color:#64748b;font-size:14px">${p.comment || '—'}</td>
    </tr>`;
  }).join('');

  // ③ 손익 점검 - 단계별 예산
  const plRows = d.phases.map((p, i) => {
    const rowBg  = i === selectedPhase ? 'style="background:#eff6ff"' : '';
    const rate   = p.budget > 0 && p.spent > 0 ? Math.round(p.spent / p.budget * 100) : 0;
    const barClr = rate > 110 ? '#ef4444' : rate > 95 ? '#f59e0b' : '#10b981';
    return `<tr ${rowBg}>
      <td style="font-weight:600">${p.name}</td>
      <td class="td-amount" style="font-size:15px">${fmt(p.budget)}</td>
      <td class="td-amount" style="font-size:15px;color:${p.spent>0?'#1e293b':'#94a3b8'}">${p.spent > 0 ? fmt(p.spent) : '—'}</td>
      <td>${p.spent > 0
        ? `<div style="display:flex;align-items:center;gap:6px">
            <div style="width:64px;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="width:${Math.min(rate,100)}%;height:100%;background:${barClr};border-radius:3px"></div></div>
            <span style="font-size:14px;font-weight:600;color:${rate>100?'#ef4444':'#475569'}">${rate}%</span>
          </div>`
        : '<span style="color:#94a3b8;font-size:14px">—</span>'
      }</td>
    </tr>`;
  }).join('');

  // ④ 리스크 요약
  const risksHtml = d.risks.length
    ? d.risks.map(r => {
        const ls = LEVEL_STYLE[r.level] || {bg:'#f1f5f9',color:'#64748b'};
        const sc = r.status==='조치완료' ? 'badge-done' : r.status==='검토중' ? 'badge-review' : 'badge-pending';
        return `<div class="risk-row">
          <span class="badge" style="background:${ls.bg};color:${ls.color};min-width:44px;text-align:center">${r.level}</span>
          <span style="flex:1;font-size:15px">${r.title}</span>
          <span class="badge ${sc}">${r.status}</span>
        </div>`;
      }).join('')
    : '<div style="color:#94a3b8;font-size:15px;padding:8px 0">해당 단계 리스크 없음</div>';

  // ⑤ 주요 이슈
  const issuesHtml = d.issues.length
    ? d.issues.map(iss => {
        const sc = iss.status === '완료' ? '#166534' : '#d97706';
        return `<div class="issue-row">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div class="issue-title">${iss.title}</div>
            <span style="font-size:13px;color:${sc};font-weight:700;white-space:nowrap;margin-left:12px">${iss.status}</span>
          </div>
          <div class="issue-action">▷ ${iss.action}</div>
          <div class="issue-meta">${iss.date}</div>
        </div>`;
      }).join('')
    : '<div style="color:#94a3b8;font-size:15px;padding:8px 0">주요 이슈 없음</div>';

  // AI 보고서 섹션1 텍스트 생성
  const s1 = genSection1(d);

  // 승인 바
  const approvalHtml = buildApprovalBar(rpt, selectedPhase);

  const approvalHistoryHtml = buildApprovalHistory(d);

  document.getElementById('pr-content').innerHTML = `
    <div style="margin-bottom:20px">${kpiRow}</div>

    <div class="card" style="margin-bottom:20px;padding:20px 24px">
      <div class="card-head" style="margin-bottom:14px">
        <span class="card-title">단계별 진행 현황</span>
        <span style="font-size:14px;color:#94a3b8">단계를 클릭하면 해당 단계 보고서를 확인합니다</span>
      </div>
      <div class="phase-timeline">${timelineHtml}</div>
    </div>

    <div class="card" style="margin-bottom:20px;padding:20px 24px">
      <div class="card-head" style="margin-bottom:16px">
        <span class="card-title">승인 이력</span>
        <span style="font-size:14px;color:#94a3b8">단계보고 생성 및 직책자 승인 기록</span>
      </div>
      ${approvalHistoryHtml}
    </div>

    <div class="report-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:19px;font-weight:800;color:#1e293b">${ph.name} 단계 보고서</div>
          <div style="font-size:15px;color:#64748b;margin-top:4px">계획 기간: ${ph.planS} ~ ${ph.planE} · 상태: <strong>${ph.status}</strong></div>
        </div>
      </div>

      <div class="report-section-title"><span class="rnum">1</span> 한눈에 보는 프로젝트 상태</div>
      <div class="report-ai-box">${s1}</div>

      <hr class="report-divider"/>
      <div class="report-section-title"><span class="rnum">2</span> 일정 점검</div>
      <table class="sched-table" style="margin-bottom:16px">
        <thead><tr><th>단계</th><th>계획 기간</th><th>실적 기간</th><th>지연 여부</th><th>지연 원인</th></tr></thead>
        <tbody>${schedRows}</tbody>
      </table>

      <hr class="report-divider"/>
      <div class="report-section-title"><span class="rnum">3</span> 손익 점검</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <table class="sched-table">
            <thead><tr><th>단계</th><th style="text-align:right">예산(원)</th><th style="text-align:right">실적(원)</th><th>소진율</th></tr></thead>
            <tbody>${plRows}</tbody>
          </table>
        </div>
        <div class="margin-panel">
          <div style="font-size:15px;color:#64748b;font-weight:600;margin-bottom:12px">마진율 현황</div>
          <div class="margin-compare">
            <div>
              <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">현재 마진율</div>
              <div class="margin-val" style="color:${marginColor}">${d.currentMargin.toFixed(1)}%</div>
            </div>
            <div style="font-size:30px;color:#cbd5e1;padding-top:10px">→</div>
            <div>
              <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">목표 마진율</div>
              <div class="margin-val" style="color:#1e293b">${d.targetMargin.toFixed(1)}%</div>
            </div>
          </div>
          <div style="margin-top:12px;font-size:14px;color:${marginColor};font-weight:600">
            ${marginDiff >= 0 ? `✅ 목표 대비 +${marginDiff.toFixed(1)}%p 초과` : `⚠️ 목표 대비 ${Math.abs(marginDiff).toFixed(1)}%p 미달`}
          </div>
          <div style="margin-top:8px;font-size:14px;color:#64748b">
            예산 소진율 <strong>${spentPct}%</strong> · ${fmt(d.spent)}원 / ${fmt(d.budget)}원
          </div>
        </div>
      </div>

      <hr class="report-divider"/>
      <div class="report-section-title"><span class="rnum">4</span> 리스크 요약</div>
      <div style="margin-bottom:16px">${risksHtml}</div>

      <hr class="report-divider"/>
      <div class="report-section-title"><span class="rnum">5</span> 주요 이슈 및 조치 내용</div>
      <div style="margin-bottom:20px">${issuesHtml}</div>

      ${approvalHtml}
    </div>
  `;
}

function genSection1(d) {
  const marginDiff  = d.currentMargin - d.targetMargin;
  const spentPct    = Math.round(d.spent / d.budget * 100);
  const delayPhases = d.phases.filter(p => p.delay > 0).map(p => p.name);
  const statusText  = d.overallStatus === '정상' ? '전반적으로 <strong>정상 진행</strong> 중입니다.'
                    : d.overallStatus === '주의' ? '일부 영역에서 <strong>주의</strong>가 필요합니다.'
                    : '<strong>즉각적인 조치</strong>가 필요한 상황입니다.';
  const marginText  = marginDiff >= 0
    ? `마진율은 목표(${d.targetMargin}%) 대비 <strong style="color:#166534">+${marginDiff.toFixed(1)}%p 초과</strong> 달성 중입니다.`
    : `마진율이 목표(${d.targetMargin}%) 대비 <strong style="color:#dc2626">${marginDiff.toFixed(1)}%p 미달</strong> 중입니다. 비용 구조 점검이 필요합니다.`;
  const schedText   = delayPhases.length
    ? `<strong style="color:#d97706">${delayPhases.join(', ')} 단계에서 일정 지연</strong>이 발생하였습니다.`
    : '일정 지연 없이 진행 중입니다.';
  return `📌 ${d.name} 프로젝트는 현재 <strong>${d.phases[d.currentPhaseIdx].name}</strong> 단계로, ${statusText}
    <br>📅 ${schedText}
    <br>💰 전체 예산 소진율은 <strong>${spentPct}%</strong>이며, ${marginText}`;
}

function buildApprovalBar(rpt, idx) {
  if (!rpt || rpt.status === '미생성') {
    return `<div class="approval-bar">
      <div class="approval-status">
        <span class="ap-label">보고서 상태</span>
        <span class="ap-value ap-none">미생성</span>
      </div>
      <button class="ap-generate-btn" onclick="generatePhaseReport(${idx})">🤖 AI 보고서 생성</button>
    </div>`;
  }
  if (rpt.status === '검토중') {
    return `<div class="approval-bar">
      <div class="approval-status">
        <span class="ap-label">보고서 상태</span>
        <span class="ap-value ap-review">검토중</span>
        <span style="font-size:14px;color:#94a3b8;margin-left:8px">AI 생성 ${rpt.generatedAt}</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="ap-generate-btn" style="background:#f1f5f9;color:#475569" onclick="generatePhaseReport(${idx})">재생성</button>
        <button class="ap-approve-btn" onclick="openApproveModal(${idx})">✅ 승인</button>
      </div>
    </div>`;
  }
  return `<div class="approval-bar">
    <div class="approval-status">
      <span class="ap-label">보고서 상태</span>
      <span class="ap-value ap-approved">승인완료</span>
      <span style="font-size:14px;color:#94a3b8;margin-left:8px">승인자: ${rpt.approver} · ${rpt.approvedAt}</span>
    </div>
    <span class="ap-approved-badge">✅ 승인완료</span>
  </div>`;
}

// ── 인터랙션 ──
function selectPhaseProj(proj) {
  currentPhaseProj = proj;
  selectedPhase    = PHASE_SRC[proj].currentPhaseIdx;
  renderProjTabs();
  renderPhasePage();
}

function selectPhaseIdx(idx) {
  selectedPhase = idx;
  renderPhasePage();
}

function generatePhaseReport(idx) {
  phaseReports[currentPhaseProj][idx].status      = '검토중';
  phaseReports[currentPhaseProj][idx].generatedAt = '26.04.29';
  showToast('🤖 AI 보고서가 생성되었습니다. 검토 후 승인해 주세요.');
  renderPhasePage();
}

function openApproveModal(idx) {
  const d = PHASE_SRC[currentPhaseProj];
  document.getElementById('apr-phase-name').textContent = `${d.name} · ${d.phases[idx].name} 단계 보고서`;
  document.getElementById('apr-idx').value = idx;
  document.getElementById('phase-approve-overlay').classList.add('open');
}

function closeApproveModal() {
  document.getElementById('phase-approve-overlay').classList.remove('open');
}

function confirmApprove() {
  const idx = parseInt(document.getElementById('apr-idx').value);
  const rpt = phaseReports[currentPhaseProj][idx];
  rpt.status     = '승인완료';
  rpt.approver   = '이봄';
  rpt.approvedAt = '26.04.29';
  closeApproveModal();
  showToast('✅ 보고서가 최종 승인되었습니다.');
  renderPhasePage();
}

// ── 승인 이력 패널 ──
function buildApprovalHistory(d) {
  const rows = d.phases.map((ph, i) => {
    const rpt = phaseReports[currentPhaseProj][i] || { status: '미생성' };
    const isCur = i === selectedPhase;

    let statusBadge, timeline, rowStyle;
    if (rpt.status === '승인완료') {
      statusBadge = `<span class="ah-badge ah-done">✅ 승인완료</span>`;
      timeline    = `<span class="ah-date">생성 ${rpt.generatedAt}</span>
                     <span class="ah-arrow">→</span>
                     <span class="ah-date">승인 ${rpt.approvedAt}</span>
                     <span class="ah-approver">by ${rpt.approver}</span>`;
      rowStyle    = isCur ? 'background:#f0fdf4' : '';
    } else if (rpt.status === '검토중') {
      statusBadge = `<span class="ah-badge ah-review">🔵 검토중</span>`;
      timeline    = `<span class="ah-date">생성 ${rpt.generatedAt}</span>
                     <span class="ah-arrow">→</span>
                     <span class="ah-date" style="color:#92400e">승인 대기</span>`;
      rowStyle    = isCur ? 'background:#fffbeb' : '';
    } else {
      statusBadge = `<span class="ah-badge ah-none">미생성</span>`;
      timeline    = `<span class="ah-date" style="color:#cbd5e1">—</span>`;
      rowStyle    = '';
    }

    const phBadge = `<span class="ah-phase ${isCur ? 'ah-phase-sel' : ''}">${ph.name}</span>`;

    return `<tr style="${rowStyle}">
      <td>${phBadge}</td>
      <td>${statusBadge}</td>
      <td style="font-size:14px;color:#475569">${timeline}</td>
      <td style="text-align:right">
        ${rpt.status === '미생성'
          ? `<button class="ap-generate-btn" style="padding:5px 12px;font-size:14px" onclick="selectPhaseIdx(${i});generatePhaseReport(${i})">AI 생성</button>`
          : rpt.status === '검토중'
            ? `<button class="ap-approve-btn" style="padding:5px 12px;font-size:14px" onclick="selectPhaseIdx(${i});openApproveModal(${i})">승인</button>`
            : ''
        }
      </td>
    </tr>`;
  }).join('');

  return `<table class="ah-table">
    <thead>
      <tr>
        <th style="width:80px">단계</th>
        <th style="width:110px">상태</th>
        <th>승인 이력</th>
        <th style="width:80px;text-align:right">액션</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
