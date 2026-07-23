// ════════════════════════════════════════
//  종료보고 (Closure Report)
// ════════════════════════════════════════

let closureView = 'list';  // 'list' | 'detail'
let closureProj = 'cloud';
let closureSearchQuery = '';
let closureStatusFilter = '';

const CLOSURE_PREREQS = [
  { id: 'billing',    label: '매출 빌링 요청 완료',            desc: '고객사 최종 청구 요청 및 세금계산서 발행 완료' },
  { id: 'ap',         label: 'AP (매입채무) 처리 완료',         desc: '외주·협력사 최종 정산 및 지급 완료' },
  { id: 'inspection', label: '고객 최종 검수 완료',             desc: '납품물 검수 확인서 접수 완료' },
  { id: 'resource',   label: '프로젝트 자원 해제 완료',          desc: '투입 인력 해제 및 장비·라이선스 반납 완료' },
  { id: 'risk',       label: '잔여 리스크 해소 또는 이관 완료', desc: '미결 리스크 운영팀 이관 또는 종결 처리' },
  { id: 'docs',       label: '산출물 최종 등록 완료',           desc: '모든 산출물 프로젝트 문서함 최종 등록 완료' },
];

const CLOSURE_STATE = {
  cloud: {
    status: '미완료',  // 미완료 / AI생성 / 승인완료
    prereqs: { billing:false, ap:false, inspection:false, resource:false, risk:false, docs:false },
    approvedAt: null, approver: null, generatedAt: null,
    lessons: {
      successes: '클라우드 전환 계획 대비 비용 15% 절감 달성. 파트너사 협업 체계 우수.',
      improvements: '초기 요건 정의 부실로 분석·설계 단계 연장 발생. 착수 시 고객 요건 워크숍 강화 필요.',
      risks: '클라우드 벤더 의존도가 예상보다 높음. 차기 프로젝트에서 멀티벤더 전략 검토 필요.',
      recommendations: '① PM 역할 강화(단계별 게이트 리뷰) ② 외주비 집행 조기 모니터링 ③ 고객 소통 채널 정례화',
    },
    finalMetrics: {
      planBudget: 850000000, actualBudget: 0,
      planMonths: 20, actualMonths: 0,
      targetMargin: 22.0, actualMargin: 0,
      qualityScore: 0,
    },
  },
  erp: {
    status: '미완료',
    prereqs: { billing:false, ap:false, inspection:false, resource:false, risk:false, docs:false },
    approvedAt: null, approver: null, generatedAt: null,
    lessons: {
      successes: '표준 ERP 모듈 전환 일정 내 완료. 사용자 교육 만족도 4.2/5.0.',
      improvements: '설계 단계 산출물 품질 편차 발생. 산출물 표준 템플릿 적용 강화 필요.',
      risks: '외부 인터페이스 연동 지연이 개발 일정에 영향. 차기 프로젝트에서 선행 협의 강화.',
      recommendations: '① 인터페이스 설계 단계 별도 킥오프 ② 사용자 교육 E-learning 병행 ③ 운영 전환 체크리스트 강화',
    },
    finalMetrics: {
      planBudget: 620000000, actualBudget: 0,
      planMonths: 16, actualMonths: 0,
      targetMargin: 18.0, actualMargin: 0,
      qualityScore: 0,
    },
  },
  mobile: {
    status: '미완료',
    prereqs: { billing:false, ap:false, inspection:false, resource:false, risk:false, docs:false },
    approvedAt: null, approver: null, generatedAt: null,
    lessons: {
      successes: 'App Rating 4.5+ 달성. 애자일 Sprint 운영으로 고객 피드백 신속 반영.',
      improvements: 'Sprint 4 기간 중 QA 리소스 부족 발생. Sprint별 QA 계획 사전 수립 필요.',
      risks: '앱스토어 심사 정책 변경 리스크 상존. 차기 프로젝트에서 심사 완충 기간 확보 필요.',
      recommendations: '① QA 전담 인력 Sprint 초반 배치 ② 심사 제출 D-14 기준 완료 목표 ③ 사용자 피드백 루프 운영 체계화',
    },
    finalMetrics: {
      planBudget: 380000000, actualBudget: 0,
      planMonths: 11, actualMonths: 0,
      targetMargin: 20.0, actualMargin: 0,
      qualityScore: 0,
    },
  },
  sec: {
    status: '미완료',
    prereqs: { billing:false, ap:false, inspection:false, resource:false, risk:false, docs:false },
    approvedAt: null, approver: null, generatedAt: null,
    lessons: { successes:'', improvements:'', risks:'', recommendations:'' },
    finalMetrics: {
      planBudget: 290000000, actualBudget: 0,
      planMonths: 9, actualMonths: 0,
      targetMargin: 0, actualMargin: 0,
      qualityScore: 0,
    },
  },
};

function renderClosure() {
  const el = document.getElementById('s-closure');
  el.innerHTML = closureView === 'list' ? buildClosureListPage() : buildClosurePage();
}

// ── 목록 뷰 ─────────────────────────────
function buildClosureListPage() {
  const q = closureSearchQuery.toLowerCase();
  const statusLabel = { '미완료':'미생성', 'AI생성':'검토 중', '승인완료':'승인 완료' };
  const statusBg    = { '미완료':'#f1f5f9', 'AI생성':'#fef3c7', '승인완료':'#dcfce7' };
  const statusColor = { '미완료':'#94a3b8', 'AI생성':'#b45309', '승인완료':'#166534' };

  const allSt = ['미완료','AI생성','승인완료'];
  const statusOpts = ['', ...allSt].map(s =>
    `<option value="${s}" ${s===closureStatusFilter?'selected':''}>${s ? statusLabel[s] : '전체 상태'}</option>`
  ).join('');

  const keys = ['cloud','erp','mobile','sec'];
  const filtered = keys.filter(k => {
    const p = PROJ_INFO_INIT[k]; const d = CLOSURE_STATE[k];
    const matchQ = !q || [p.name, p.pm].some(v => v && v.toLowerCase().includes(q));
    const matchS = !closureStatusFilter || d.status === closureStatusFilter;
    return matchQ && matchS;
  });

  const rows = filtered.length ? filtered.map(k => {
    const p = PROJ_INFO_INIT[k]; const d = CLOSURE_STATE[k];
    const donePrereqs = Object.values(d.prereqs).filter(Boolean).length;
    const totalPrereqs = CLOSURE_PREREQS.length;
    const prereqPct = Math.round(donePrereqs / totalPrereqs * 100);
    const prereqColor = donePrereqs === totalPrereqs ? '#22c55e' : '#3b82f6';
    return `
      <tr onclick="openClosureDetail('${k}')">
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${p.start} ~ ${p.end}</div>
        </td>
        <td>${p.pm}</td>
        <td style="text-align:right;font-weight:700;white-space:nowrap">${fmt(p.budget)}<span style="font-weight:400;color:#94a3b8;font-size:11px">원</span></td>
        <td style="min-width:100px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${prereqPct}%;background:${prereqColor};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:#64748b;white-space:nowrap">${donePrereqs}/${totalPrereqs}</span>
          </div>
        </td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${statusBg[d.status]};color:${statusColor[d.status]}">${statusLabel[d.status]}</span>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="5" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  return `
    <div class="page-header">
      <div class="page-title">종료보고</div>
      <div class="page-sub">종료보고 제출 전 모든 선행 업무를 완료해야 합니다. AI가 레슨스런드를 포함한 최종 보고서를 생성합니다.</div>
    </div>
    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM 검색…" value="${closureSearchQuery}"
          oninput="closureSearchQuery=this.value;renderClosure()">
      </div>
      <select class="proj-filter-select" onchange="closureStatusFilter=this.value;renderClosure()">${statusOpts}</select>
      <span class="proj-count-tag">${filtered.length}건</span>
    </div>
    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>PM</th>
            <th style="text-align:right">총 예산</th>
            <th>선행업무 완료</th>
            <th class="pt-center">보고서 상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openClosureDetail(proj) {
  closureProj = proj;
  closureView = 'detail';
  renderClosure();
}

function closeClosureDetail() {
  closureView = 'list';
  renderClosure();
}

function buildClosurePage() {
  const tabs = ['cloud','erp','mobile','sec'].map(k => {
    const st = CLOSURE_STATE[k].status;
    const dot = st === '승인완료' ? 'dot-approved' : st === 'AI생성' ? 'dot-review' : 'dot-none';
    return `<div class="pr-proj-tab ${k === closureProj ? 'active' : ''}" onclick="switchClosureProj('${k}')">
      <span class="init-tab-dot ${dot}"></span>${PROJ_INFO_INIT[k].name}
    </div>`;
  }).join('');

  const d = CLOSURE_STATE[closureProj];
  const p = PROJ_INFO_INIT[closureProj];
  const doneCount = Object.values(d.prereqs).filter(Boolean).length;
  const allDone = doneCount === CLOSURE_PREREQS.length;

  return `
<div class="page-header-row" style="margin-bottom:16px;align-items:center">
  <button class="back-btn" onclick="closeClosureDetail()">← 목록으로</button>
</div>
<div class="pr-tabs-wrap" style="margin-bottom:24px">${tabs}</div>

<div class="init-layout">
  <!-- LEFT -->
  <div class="init-main">

    <!-- 선행 업무 체크리스트 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head">
        <span class="card-title">선행 업무 체크리스트</span>
        <span class="prereq-counter ${allDone ? 'all-done' : ''}">${doneCount} / ${CLOSURE_PREREQS.length} 완료</span>
      </div>
      <div style="padding:4px 0">
        ${CLOSURE_PREREQS.map(pr => {
          const checked = d.prereqs[pr.id];
          return `<label class="prereq-row ${checked ? 'checked' : ''}" onclick="togglePrereq('${pr.id}')">
            <div class="prereq-check ${checked ? 'done' : ''}">${checked ? '✓' : ''}</div>
            <div class="prereq-content">
              <div class="prereq-label">${pr.label}</div>
              <div class="prereq-desc">${pr.desc}</div>
            </div>
          </label>`;
        }).join('')}
      </div>
      ${!allDone ? `<div class="prereq-warning">⚠️ 모든 선행 업무를 완료해야 종료보고서를 생성할 수 있습니다. (${CLOSURE_PREREQS.length - doneCount}개 미완료)</div>` : ''}
    </div>

    <!-- 보고서 영역 (선행 완료 후 활성화) -->
    ${allDone ? buildClosureReport(d, p) : buildClosureBlocked()}

  </div>

  <!-- RIGHT: 승인 패널 -->
  <div class="init-side">
    ${buildClosureApprovalPanel(d, p, allDone)}
  </div>
</div>`;
}

function buildClosureBlocked() {
  return `<div class="card">
    <div style="padding:60px 24px;text-align:center;color:#94a3b8">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <div style="font-size:16px;font-weight:700;color:#64748b;margin-bottom:8px">선행 업무 완료 후 보고서를 생성할 수 있습니다</div>
      <div style="font-size:13px">위의 체크리스트를 모두 완료하면 AI 종료보고서 생성이 활성화됩니다.</div>
    </div>
  </div>`;
}

function buildClosureReport(d, p) {
  const isGenerated = d.status !== '미완료';
  const isApproved  = d.status === '승인완료';
  const isEditable  = d.status === 'AI생성';

  if (!isGenerated) {
    return `<div class="card">
      <div style="padding:48px 24px;text-align:center">
        <div style="font-size:36px;margin-bottom:12px">📋</div>
        <div style="font-size:15px;font-weight:600;color:#475569;margin-bottom:6px">선행 업무가 모두 완료되었습니다!</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:20px">AI 종료보고서를 생성하세요.</div>
        <button class="init-action-btn btn-generate" onclick="generateClosureReport()" style="margin:0 auto">🤖 AI 종료보고서 생성</button>
      </div>
    </div>`;
  }

  return `
    <!-- 종합 평가 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head">
        <span class="card-title">프로젝트 종합 평가</span>
        <span class="ai-badge">AI 생성 · ${d.generatedAt}</span>
      </div>
      <div style="padding:20px 24px">
        <div class="closure-metric-grid">
          ${buildMetricCard('예산 집행률', d.status === '승인완료' ? '102.3%' : '-', d.status === '승인완료' ? '계획 대비 +2.3%' : '승인 후 확정', '#f59e0b')}
          ${buildMetricCard('일정 달성률', d.status === '승인완료' ? '94.5%' : '-', d.status === '승인완료' ? '5.5% 지연 완료' : '승인 후 확정', '#3b82f6')}
          ${buildMetricCard('목표 마진율', d.status === '승인완료' ? '19.3%' : '-', d.status === '승인완료' ? `목표 ${p.budget === 850000000 ? 22 : p.budget === 620000000 ? 18 : 20}% 대비 미달` : '승인 후 확정', '#8b5cf6')}
          ${buildMetricCard('고객 만족도', d.status === '승인완료' ? '4.2 / 5.0' : '-', d.status === '승인완료' ? '검수 확인 기준' : '승인 후 확정', '#10b981')}
        </div>
      </div>
    </div>

    <!-- 레슨스런드 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head">
        <span class="card-title">레슨스런드 (Lessons Learned)</span>
        ${isEditable ? '<span class="ai-badge">수정 가능</span>' : '<span class="card-badge">확정</span>'}
      </div>
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px">
        ${[
          ['✅ 잘된 점 (Successes)', 'lessons-success', d.lessons.successes],
          ['🔧 개선 필요 사항 (Improvements)', 'lessons-improve', d.lessons.improvements],
          ['⚠️ 리스크 사후 분석', 'lessons-risk', d.lessons.risks],
          ['💡 차기 프로젝트 권고사항', 'lessons-reco', d.lessons.recommendations],
        ].map(([title, id, val]) => `
          <div>
            <div class="lessons-section-title">${title}</div>
            ${isEditable
              ? `<textarea class="init-textarea" id="${id}" rows="2">${val}</textarea>`
              : `<div class="init-field-val" style="line-height:1.8">${val}</div>`}
          </div>`).join('')}
      </div>
    </div>`;
}

function buildMetricCard(label, value, sub, color) {
  return `<div class="closure-metric-card">
    <div class="cm-label">${label}</div>
    <div class="cm-value" style="color:${color}">${value}</div>
    <div class="cm-sub">${sub}</div>
  </div>`;
}

function buildClosureApprovalPanel(d, p, allDone) {
  const statusLabel = { '미완료':'미생성', 'AI생성':'검토 중', '승인완료':'승인 완료' };
  const statusClass = { '미완료':'ap-none', 'AI생성':'ap-review', '승인완료':'ap-approved' };

  let actionBtn = '';
  if (d.status === '미완료' && allDone) {
    actionBtn = `<button class="init-action-btn btn-generate" onclick="generateClosureReport()">🤖 AI 보고서 생성</button>`;
  } else if (d.status === 'AI생성') {
    actionBtn = `<button class="init-action-btn btn-approve" onclick="approveClosureReport()">✅ 최종 승인 · 프로젝트 종료</button>`;
  }

  const timeline = [
    { label: '선행 업무 완료', done: allDone, date: allDone ? '2026-04-29' : null },
    { label: 'AI 보고서 생성', done: d.status !== '미완료', date: d.generatedAt },
    { label: '최종 승인 완료', done: d.status === '승인완료', date: d.approvedAt },
  ];

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">종료 승인 현황</span></div>
      <div style="padding:20px 22px">
        ${d.status !== '미완료' ? `<div class="ap-status-badge ${statusClass[d.status]}" style="margin-bottom:16px">${statusLabel[d.status]}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:0">
          ${timeline.map((t, i) => `
            <div class="ap-timeline-row">
              <div class="ap-tl-dot ${t.done ? 'done' : ''}"></div>
              ${i < timeline.length - 1 ? `<div class="ap-tl-line ${t.done ? 'done' : ''}"></div>` : ''}
              <div class="ap-tl-content">
                <div class="ap-tl-label ${t.done ? '' : 'pending'}">${t.label}</div>
                ${t.date ? `<div class="ap-tl-date">${t.date}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
        ${actionBtn ? `<div style="margin-top:20px">${actionBtn}</div>` : ''}
        ${d.status === '승인완료' ? `
          <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#166534;font-weight:600;text-align:center">
            🎉 프로젝트 공식 종료 완료
          </div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">프로젝트 정보</span></div>
      <div style="padding:16px 22px;display:flex;flex-direction:column;gap:10px">
        ${[
          ['프로젝트명', p.name],
          ['PM', p.pm],
          ['총 예산', fmt(p.budget) + '원'],
          ['기간', p.start + ' ~ ' + p.end],
        ].map(([k, v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('')}
      </div>
    </div>`;
}

function switchClosureProj(proj) {
  closureProj = proj;
  closureView = 'detail';
  renderClosure();
}

function togglePrereq(id) {
  CLOSURE_STATE[closureProj].prereqs[id] = !CLOSURE_STATE[closureProj].prereqs[id];
  renderClosure();
}

function generateClosureReport() {
  const d = CLOSURE_STATE[closureProj];
  d.status = 'AI생성';
  d.generatedAt = '2026-04-29';
  showToast('AI 종료보고서가 생성되었습니다. 내용을 검토 후 최종 승인하세요.');
  renderClosure();
}

function approveClosureReport() {
  const d = CLOSURE_STATE[closureProj];
  // Save lesson edits
  ['success','improve','risk','reco'].forEach((k, i) => {
    const keys = ['successes','improvements','risks','recommendations'];
    const el = document.getElementById('lessons-' + k);
    if (el) d.lessons[keys[i]] = el.value;
  });
  d.status = '승인완료';
  d.approvedAt = '2026-04-29';
  d.approver = '이봄';
  showToast('종료보고가 최종 승인되었습니다. 프로젝트가 공식 종료됩니다.');
  renderClosure();
}
