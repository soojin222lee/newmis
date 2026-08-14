// ════════════════════════════════════════
//  착수보고 (Initiation Report)
// ════════════════════════════════════════

let initView = 'list';   // 'list' | 'detail'
let initProj = 'cloud';
let initSearchQuery = '';
let initStatusFilter = '';

const DEV_ENV_OPTIONS = {
  dtTech:      { label:'적용 DT기술', options:['AI','Big Data','Cloud','BlockChain','기타'] },
  methodology: { label:'방법론',      options:['RUP','SKPE','UKEY','CNAPS','기타'] },
  dbms:        { label:'DBMS',        options:['Oracle','Vertica','MySQL','Mongo','기타'] },
  framework:   { label:'Framework',   options:['.NET','Spring','NEXCORE','J2EE','iBATIS','ERP','기타'] },
  language:    { label:'Language',    options:['C#','java','C++','Android','iOS','기타'] },
  solution:    { label:'Solution',    options:['JDK','HTML5','Visual Basic','Visual java','기타'] },
  tool:        { label:'Tool',        options:['FLEX','MF','Vue.js','javascript','기타'] },
};

const PROJ_TYPES   = ['SI-AD','SI-컨설팅','SI-Hw/SW설치','OS-AD','OS-운영','기타'];
const CONTRACT_TYPES = ['총액계약','단가계약','혼합계약','기타'];

const INIT_STATE = {
  cloud: {
    status: 'ERP전송완료',
    pot: 850000000,
    erpTransmittedAt: '2025-01-29 09:15',
    approvedAt: '2025-01-28', approver: '이봄', generatedAt: '2025-01-25',
    // 기본정보
    location: '서울시 강남구 테헤란로 본사 데이터센터 및 DR센터',
    department: '인프라운영팀',
    projectType: 'SI-AD',
    contractType: '총액계약',
    // 보고서 내용
    methodology: '폭포수', sprintMonths: 3,
    overview: '레거시 온프레미스 인프라를 클라우드로 전면 전환하여 시스템 안정성 강화 및 운영비 절감을 목표로 합니다. 전사 서버 99.9% 가용성 달성, 연간 IT 운영비 20% 절감을 핵심 KPI로 설정합니다.',
    objectives: '① 전사 서버 클라우드 전환 완료 ② 재해복구(DR) 체계 구축 ③ 보안 컴플라이언스 강화 ④ 운영 자동화 파이프라인 구축',
    scope: '전사 서버 인프라, 네트워크, 보안시스템, 모니터링 체계 전면 전환. SI 파트너 3사 협업 포함.',
    risks: ['클라우드 벤더 의존도 증가','마이그레이션 중 서비스 중단 리스크','클라우드 비용 예측 불확실성'],
    phases: [
      { name:'분석',   months:2, budgetPct:10 },
      { name:'설계',   months:2, budgetPct:15 },
      { name:'개발',   months:9, budgetPct:45 },
      { name:'테스트', months:2, budgetPct:18 },
      { name:'안정화', months:2, budgetPct:12 },
    ],
    // 개발환경
    devEnv: {
      dtTech:      { checked:['Cloud'],         etc:'' },
      methodology: { checked:['SKPE'],          etc:'' },
      dbms:        { checked:['기타'],           etc:'MSSQL' },
      framework:   { checked:['.NET'],          etc:'' },
      language:    { checked:['C#'],            etc:'' },
      solution:    { checked:['Visual Basic'],  etc:'' },
      tool:        { checked:['Vue.js'],        etc:'' },
    },
    // 결재선
    approval: {
      stages: [
        { role:'기안',   name:'김은지', title:'PM',    status:'완료', date:'2025-01-24' },
        { role:'검토',   name:'박준석', title:'팀장',  status:'승인', date:'2025-01-25' },
        { role:'승인',   name:'전재민', title:'본부장',status:'승인', date:'2025-01-27' },
        { role:'최종승인',name:'최재원',title:'대표이사',status:'승인',date:'2025-01-28' },
      ]
    },
  },
  erp: {
    status: 'ERP전송완료',
    pot: 620000000,
    erpTransmittedAt: '2025-06-30 10:02',
    approvedAt: '2025-06-29', approver: '이봄', generatedAt: '2025-06-27',
    location: '서울시 중구 을지로 본사 IT센터',
    department: '시스템팀',
    projectType: 'SI-AD',
    contractType: '총액계약',
    methodology: '폭포수', sprintMonths: 3,
    overview: 'ERP 시스템 전면 고도화를 통해 업무 프로세스 효율화 및 데이터 정합성을 확보합니다. 그룹 표준 프로세스 반영 및 실시간 경영정보 제공이 핵심입니다.',
    objectives: '① ERP 표준 모듈 전환 ② 그룹 공통 코드 정비 ③ 인터페이스 재구축 ④ 실시간 대시보드 연계',
    scope: '재무, 구매, 생산, 인사 모듈 전환. 외부 협력사 인터페이스 포함.',
    risks: ['데이터 마이그레이션 정합성 오류','기간 내 사용자 교육 미흡','외부 연동 시스템 응답 지연'],
    phases: [
      { name:'분석',   months:2, budgetPct:10 },
      { name:'설계',   months:3, budgetPct:15 },
      { name:'개발',   months:6, budgetPct:50 },
      { name:'테스트', months:2, budgetPct:18 },
      { name:'안정화', months:1, budgetPct:7  },
    ],
    devEnv: {
      dtTech:      { checked:['Big Data'],      etc:'' },
      methodology: { checked:['UKEY'],          etc:'' },
      dbms:        { checked:['Oracle'],        etc:'' },
      framework:   { checked:['ERP','iBATIS'],  etc:'' },
      language:    { checked:['java'],          etc:'' },
      solution:    { checked:['JDK','HTML5'],   etc:'' },
      tool:        { checked:['javascript'],    etc:'' },
    },
    approval: {
      stages: [
        { role:'기안',   name:'이강혁', title:'PM',    status:'완료', date:'2025-06-27' },
        { role:'검토',   name:'박준석', title:'팀장',  status:'승인', date:'2025-06-28' },
        { role:'승인',   name:'전재민', title:'본부장',status:'승인', date:'2025-06-29' },
        { role:'최종승인',name:'최재원',title:'대표이사',status:'승인',date:'2025-06-30' },
      ]
    },
  },
  mobile: {
    status: '승인완료',
    pot: 380000000,
    erpTransmittedAt: null,
    approvedAt: '2025-08-27', approver: '이봄', generatedAt: '2025-08-25',
    location: '서울시 마포구 상암동 서비스센터',
    department: '서비스팀',
    projectType: 'SI-컨설팅',
    contractType: '단가계약',
    methodology: '애자일', sprintMonths: 3,
    overview: '모바일 앱 전면 리뉴얼을 통해 사용자 경험 혁신 및 신규 고객 유입률 증대를 목표로 합니다. 애자일 방법론으로 빠른 피드백 사이클을 운영합니다.',
    objectives: '① UX 전면 개편 ② 성능 최적화(로딩 50% 개선) ③ 신기능 3종 출시 ④ App Rating 4.5+ 달성',
    scope: 'iOS/Android 네이티브 앱, API 서버, CMS 관리자 포함.',
    risks: ['앱스토어 심사 지연','디자인 변경에 따른 QA 범위 확대','외부 결제 모듈 연동 이슈'],
    phases: [
      { name:'Sprint 1', months:3, budgetPct:25 },
      { name:'Sprint 2', months:3, budgetPct:30 },
      { name:'Sprint 3', months:3, budgetPct:30 },
      { name:'Sprint 4', months:3, budgetPct:15 },
    ],
    devEnv: {
      dtTech:      { checked:['AI','Cloud'],     etc:'' },
      methodology: { checked:['기타'],           etc:'Agile/Scrum' },
      dbms:        { checked:['MySQL'],          etc:'' },
      framework:   { checked:['Spring'],        etc:'' },
      language:    { checked:['java','Android','iOS'], etc:'' },
      solution:    { checked:['HTML5'],         etc:'' },
      tool:        { checked:['Vue.js','MF'],   etc:'' },
    },
    approval: {
      stages: [
        { role:'기안',   name:'최우진', title:'PM',    status:'완료', date:'2025-08-25' },
        { role:'검토',   name:'박준석', title:'팀장',  status:'승인', date:'2025-08-26' },
        { role:'승인',   name:'전재민', title:'본부장',status:'승인', date:'2025-08-27' },
        { role:'최종승인',name:'최재원',title:'대표이사',status:'대기',date:'' },
      ]
    },
  },
  sec: {
    status: 'AI생성',
    pot: 290000000,
    erpTransmittedAt: null,
    approvedAt: null, approver: null, generatedAt: '2026-04-25',
    location: '서울시 강남구 역삼동 보안관제센터',
    department: '보안팀',
    projectType: 'SI-Hw/SW설치',
    contractType: '혼합계약',
    methodology: '폭포수', sprintMonths: 3,
    overview: '전사 보안 인프라 강화 및 제로트러스트 아키텍처 도입을 통해 사이버 위협에 대한 대응 체계를 구축합니다.',
    objectives: '① 제로트러스트 아키텍처 도입 ② 보안관제 24/7 운영 ③ 임직원 보안 교육 체계 구축 ④ ISMS 인증 갱신',
    scope: '네트워크 보안, 엔드포인트 보안, 통합보안관제(SOC) 구축.',
    risks: ['제로트러스트 전환 중 서비스 영향','보안 솔루션 커스터마이징 공수 초과','임직원 보안 정책 저항'],
    phases: [
      { name:'분석',   months:1, budgetPct:8  },
      { name:'설계',   months:2, budgetPct:17 },
      { name:'개발',   months:5, budgetPct:50 },
      { name:'테스트', months:2, budgetPct:18 },
      { name:'안정화', months:1, budgetPct:7  },
    ],
    devEnv: {
      dtTech:      { checked:['AI','BlockChain'],etc:'' },
      methodology: { checked:['RUP'],           etc:'' },
      dbms:        { checked:['Oracle','기타'],  etc:'ElasticSearch' },
      framework:   { checked:['Spring'],        etc:'' },
      language:    { checked:['java','C++'],    etc:'' },
      solution:    { checked:['기타'],          etc:'SIEM' },
      tool:        { checked:['javascript'],    etc:'' },
    },
    approval: {
      stages: [
        { role:'기안',   name:'정미래', title:'PM',    status:'완료', date:'2026-04-25' },
        { role:'검토',   name:'박준석', title:'팀장',  status:'대기', date:'' },
        { role:'승인',   name:'전재민', title:'본부장',status:'대기', date:'' },
        { role:'최종승인',name:'최재원',title:'대표이사',status:'대기',date:'' },
      ]
    },
  },
};

const PROJ_INFO_INIT = {
  cloud:  { name:'클라우드 인프라 고도화', pm:'김은지', budget:850000000, start:'2025-01', end:'2026-08' },
  erp:    { name:'ERP 고도화',            pm:'이강혁', budget:620000000, start:'2025-06', end:'2026-09' },
  mobile: { name:'모바일 앱 리뉴얼',      pm:'최우진', budget:380000000, start:'2025-08', end:'2026-06' },
  sec:    { name:'보안 시스템 구축',       pm:'정미래', budget:290000000, start:'2026-04', end:'2026-12' },
};

// ══════════════════════════════════════
//  메인 렌더
// ══════════════════════════════════════
function renderInitiation() {
  if (initView === 'list') renderInitiationList();
  else renderInitiationDetail();
}

// ══════════════════════════════════════
//  목록 뷰 — 프로젝트별 결재 현황
// ══════════════════════════════════════
function renderInitiationList() {
  const el = document.getElementById('s-initiation');
  const q = initSearchQuery.toLowerCase();
  const statusLabel = { 'ERP전송완료':'ERP 전송 완료','승인완료':'승인 완료','AI생성':'검토 중','미완료':'미생성' };
  const statusColor = { 'ERP전송완료':'#1d4ed8','승인완료':'#166534','AI생성':'#b45309','미완료':'#64748b' };
  const statusBg    = { 'ERP전송완료':'#dbeafe','승인완료':'#dcfce7','AI생성':'#fef3c7','미완료':'#f1f5f9' };

  const allStatuses = [...new Set(Object.values(INIT_STATE).map(d => d.status))];
  const statusOpts = ['', ...allStatuses].map(s =>
    `<option value="${s}" ${s===initStatusFilter?'selected':''}>${s ? statusLabel[s] : '전체 상태'}</option>`
  ).join('');

  const filtered = Object.keys(INIT_STATE).filter(k => {
    const d = INIT_STATE[k]; const p = PROJ_INFO_INIT[k];
    const matchQ = !q || [p.name, p.pm, d.department, d.projectType, d.contractType]
      .some(v => v && v.toLowerCase().includes(q));
    const matchS = !initStatusFilter || d.status === initStatusFilter;
    return matchQ && matchS;
  });

  const rows = filtered.length ? filtered.map(k => {
    const d = INIT_STATE[k]; const p = PROJ_INFO_INIT[k];
    const stages = d.approval.stages;
    const doneCount = stages.filter(s => s.status === '완료' || s.status === '승인').length;
    const pct = Math.round(doneCount / stages.length * 100);
    const barColor = pct === 100 ? '#22c55e' : '#3b82f6';
    return `
      <tr onclick="openInitDetail('${k}')">
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${d.projectType} · ${d.contractType} · ${d.methodology}</div>
        </td>
        <td>${p.pm}</td>
        <td style="font-size:14px;white-space:nowrap">${p.start}<br><span style="color:#94a3b8">~ ${p.end}</span></td>
        <td style="text-align:right;font-weight:700;white-space:nowrap">${fmt(p.budget)}<span style="font-weight:400;color:#94a3b8;font-size:13px">원</span></td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${statusBg[d.status]};color:${statusColor[d.status]}">${statusLabel[d.status]}</span>
        </td>
        <td style="min-width:90px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
            </div>
            <span style="font-size:13px;color:#64748b;white-space:nowrap">${doneCount}/${stages.length}</span>
          </div>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="6" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">착수보고 현황</div>
      <div class="page-sub">프로젝트별 착수보고 결재 단계 및 ERP 실행예산(POt) 전송 현황을 조회합니다.</div>
    </div>
    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM, 유형 검색…" value="${initSearchQuery}"
          oninput="initSearchQuery=this.value;renderInitiationList()">
      </div>
      <select class="proj-filter-select" onchange="initStatusFilter=this.value;renderInitiationList()">${statusOpts}</select>
      <span class="proj-count-tag">${filtered.length}건</span>
    </div>
    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th>PM</th>
            <th>기간</th>
            <th style="text-align:right">예산</th>
            <th class="pt-center">보고서 상태</th>
            <th>결재 진행</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════
//  상세 뷰 — 착수보고 전체 내용
// ══════════════════════════════════════
function openInitDetail(proj) {
  initProj = proj;
  initView = 'detail';
  renderInitiationDetail();
}

function closeInitDetail() {
  initView = 'list';
  renderInitiationList();
}

function renderInitiationDetail() {
  const el = document.getElementById('s-initiation');
  el.innerHTML = buildInitiationPage();
  bindInitiationEvents();
}

function buildInitiationPage() {
  const d = INIT_STATE[initProj];
  const p = PROJ_INFO_INIT[initProj];
  const isEditable = (d.status === 'AI생성');

  const tabs = Object.keys(PROJ_INFO_INIT).map(k => {
    const st = INIT_STATE[k].status;
    const dot = st==='ERP전송완료'?'dot-erp':st==='승인완료'?'dot-approved':st==='AI생성'?'dot-review':'dot-none';
    return `<div class="pr-proj-tab ${k===initProj?'active':''}" onclick="switchInitProj('${k}')">
      <span class="init-tab-dot ${dot}"></span>${PROJ_INFO_INIT[k].name}
    </div>`;
  }).join('');

  return `
<div class="page-header-row" style="margin-bottom:16px;align-items:center">
  <button class="back-btn" onclick="closeInitDetail()">← 목록으로</button>
</div>
<div class="pr-tabs-wrap" style="margin-bottom:20px">${tabs}</div>

<div class="init-layout">
  <div class="init-main">
    ${buildStatusBanner(d, p)}

    <!-- ① 기본정보 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">① 프로젝트 기본정보</span>${isEditable?'<span class="ai-badge">수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:20px 24px">
        <div class="basic-info-grid">
          ${buildBasicInfoField('프로젝트명', p.name, null, false)}
          ${buildBasicInfoField('담당 PM', p.pm, null, false)}
          ${buildBasicInfoField('담당 부서', d.department, 'in-dept', isEditable)}
          ${buildBasicInfoField('프로젝트 장소', d.location, 'in-location', isEditable)}
          ${buildBasicInfoField('프로젝트 기간', p.start+' ~ '+p.end, null, false)}
          ${buildBasicInfoField('총 예산', fmt(p.budget)+'원', null, false)}
        </div>
        <div class="basic-info-grid" style="margin-top:14px">
          <div>
            <div class="init-field-label">프로젝트 유형</div>
            ${isEditable
              ? `<div class="type-chip-row">${PROJ_TYPES.map(t=>`<label class="type-chip ${d.projectType===t?'selected':''}"><input type="radio" name="ptype" value="${t}" ${d.projectType===t?'checked':''} onchange="onTypeChange('${t}','projectType')">${t}</label>`).join('')}</div>`
              : `<div class="init-field-val" style="display:inline-block">${d.projectType}</div>`}
          </div>
          <div>
            <div class="init-field-label">계약 형태</div>
            ${isEditable
              ? `<div class="type-chip-row">${CONTRACT_TYPES.map(t=>`<label class="type-chip ${d.contractType===t?'selected':''}"><input type="radio" name="ctype" value="${t}" ${d.contractType===t?'checked':''} onchange="onTypeChange('${t}','contractType')">${t}</label>`).join('')}</div>`
              : `<div class="init-field-val" style="display:inline-block">${d.contractType}</div>`}
          </div>
        </div>
      </div>
    </div>

    <!-- ② 추진 배경 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">② 추진 배경 및 목적</span>${isEditable?'<span class="ai-badge">AI 초안 · 수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">
        <div><div class="init-field-label">추진 배경 및 목적</div>
          ${isEditable?`<textarea class="init-textarea" id="in-overview" rows="3">${d.overview}</textarea>`:`<div class="init-field-val">${d.overview}</div>`}</div>
        <div><div class="init-field-label">핵심 목표 (Key Objectives)</div>
          ${isEditable?`<textarea class="init-textarea" id="in-objectives" rows="2">${d.objectives}</textarea>`:`<div class="init-field-val">${d.objectives}</div>`}</div>
        <div><div class="init-field-label">추진 범위 (Scope)</div>
          ${isEditable?`<textarea class="init-textarea" id="in-scope" rows="2">${d.scope}</textarea>`:`<div class="init-field-val">${d.scope}</div>`}</div>
      </div>
    </div>

    <!-- ③ 개발방법론 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">③ 개발방법론</span>${isEditable?'<span class="ai-badge">수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:20px 24px">${buildMethodologySection(d, isEditable)}</div>
    </div>

    <!-- ④ 단계 구성 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">④ 단계 구성 및 예산 배분</span>${isEditable?'<span class="ai-badge">수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:20px 24px">${buildPhaseTable(d, p, isEditable)}</div>
    </div>

    <!-- ⑤ 개발환경 정보 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">⑤ 개발환경 정보</span>${isEditable?'<span class="ai-badge">수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:16px 24px">${buildDevEnvSection(d, isEditable)}</div>
    </div>

    <!-- ⑥ 초기 리스크 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">⑥ 초기 리스크 식별</span>${isEditable?'<span class="ai-badge">수정 가능</span>':'<span class="card-badge">확정</span>'}</div>
      <div style="padding:16px 24px;display:flex;flex-direction:column;gap:10px" id="init-risk-list">
        ${d.risks.map((r,i)=>`
          <div class="init-risk-row" id="risk-row-${i}">
            <span class="init-risk-num">${i+1}</span>
            ${isEditable?`<input class="init-risk-input" id="irisk-${i}" value="${r}">`:`<span class="init-risk-text">${r}</span>`}
            ${isEditable?`<button class="init-risk-del" onclick="removeInitRisk(${i})">✕</button>`:''}
          </div>`).join('')}
        ${isEditable?`<button class="init-add-risk-btn" onclick="addInitRisk()">+ 리스크 추가</button>`:''}
      </div>
    </div>

    <!-- ⑦ 결재 양식 -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><span class="card-title">⑦ 결재 양식</span></div>
      <div style="padding:20px 24px">${buildApprovalDoc(d, p)}</div>
    </div>
  </div>

  <!-- 오른쪽 승인 패널 -->
  <div class="init-side">
    ${buildApprovalPanel(d, p)}
  </div>
</div>`;
}

function buildBasicInfoField(label, value, id, editable) {
  return `<div>
    <div class="init-field-label">${label}</div>
    ${editable && id
      ? `<input class="init-text-input" id="${id}" value="${value}">`
      : `<div class="init-field-val">${value}</div>`}
  </div>`;
}

function buildDevEnvSection(d, isEditable) {
  return Object.entries(DEV_ENV_OPTIONS).map(([key, cfg]) => {
    const current = d.devEnv[key] || { checked:[], etc:'' };
    const hasEtc = current.checked.includes('기타');
    const cells = cfg.options.map(opt => {
      const chk = current.checked.includes(opt);
      if (isEditable) {
        return `<label class="dev-env-check ${chk?'checked':''}">
          <input type="checkbox" data-key="${key}" value="${opt}" ${chk?'checked':''} onchange="onDevEnvChange('${key}','${opt}',this.checked)">
          <span>${opt}</span>
        </label>`;
      } else {
        return `<span class="dev-env-tag ${chk?'active':''}">${opt}</span>`;
      }
    }).join('');

    const etcInput = (isEditable && hasEtc)
      ? `<input class="dev-env-etc-input" id="etc-${key}" value="${current.etc||''}" placeholder="기타 내용 입력">`
      : (current.etc ? `<span class="dev-env-etc-text">${current.etc}</span>` : '');

    return `<div class="dev-env-row">
      <div class="dev-env-label">${cfg.label}<span class="dev-env-required">*</span></div>
      <div class="dev-env-options">${cells}${etcInput}</div>
    </div>`;
  }).join('');
}

function buildApprovalDoc(d, p) {
  const stages = d.approval.stages;
  const statusIcon = { '완료':'✓','승인':'✓','대기':'—' };
  const statusColor = { '완료':'#166534','승인':'#1d4ed8','대기':'#94a3b8' };
  const statusBg    = { '완료':'#f0fdf4','승인':'#eff6ff','대기':'#f8fafc' };

  const boxes = stages.map(s => `
    <div class="apv-doc-box">
      <div class="apv-doc-role">${s.role}</div>
      <div class="apv-doc-name">${s.name}</div>
      <div class="apv-doc-title">${s.title}</div>
      <div class="apv-doc-status" style="background:${statusBg[s.status]};color:${statusColor[s.status]}">
        ${statusIcon[s.status]} ${s.status}
      </div>
      <div class="apv-doc-date">${s.date || '—'}</div>
    </div>`).join('');

  const allApproved = stages.every(s => s.status==='완료'||s.status==='승인');

  return `
    <div class="apv-doc-header">착수보고서</div>
    <div class="apv-doc-proj">${p.name}</div>
    <div class="apv-doc-boxes">${boxes}</div>
    <div class="apv-doc-meta">
      <div><span class="apv-doc-meta-key">문서번호</span> <span>IT-${initProj.toUpperCase()}-2025-001</span></div>
      <div><span class="apv-doc-meta-key">기안일</span> <span>${stages[0].date || '—'}</span></div>
      <div><span class="apv-doc-meta-key">결재완료</span> <span>${allApproved ? stages[stages.length-1].date : '결재 진행 중'}</span></div>
      <div><span class="apv-doc-meta-key">보존기간</span> <span>준영구</span></div>
    </div>
    ${d.status === 'AI생성' ? `
    <div style="margin-top:16px">
      <button class="init-action-btn btn-generate" style="width:auto;padding:10px 20px;font-size:15px" onclick="requestApproval()">
        📋 결재 요청 발송
      </button>
    </div>` : ''}`;
}

function buildStatusBanner(d, p) {
  const cfg = {
    '미완료':     { bg:'#f8fafc', border:'#e2e8f0', icon:'⏳', color:'#64748b', label:'보고서 미생성', desc:'AI 보고서를 생성하여 착수 계획을 수립하세요.' },
    'AI생성':     { bg:'#fffbeb', border:'#fcd34d', icon:'✏️', color:'#b45309', label:'AI 초안 생성됨 · 검토 중', desc:'AI가 생성한 초안을 검토하고 수정 후 결재 요청하세요.' },
    '승인완료':   { bg:'#f0fdf4', border:'#86efac', icon:'✅', color:'#166534', label:'결재 승인 완료', desc:`${d.approvedAt} · 승인 완료. ERP 전송 대기 중입니다.` },
    'ERP전송완료':{ bg:'#eff6ff', border:'#93c5fd', icon:'📤', color:'#1d4ed8', label:'ERP 전송 완료', desc:`최초 실행예산(POt) ${fmt(d.pot)}원이 ${d.erpTransmittedAt}에 ERP로 전송되었습니다.` },
  };
  const c = cfg[d.status] || cfg['미완료'];
  return `<div class="init-status-banner" style="background:${c.bg};border-color:${c.border}">
    <span class="isb-icon">${c.icon}</span>
    <div><div class="isb-label" style="color:${c.color}">${c.label}</div><div class="isb-desc">${c.desc}</div></div>
  </div>`;
}

function buildMethodologySection(d, isEditable) {
  const methods = ['폭포수','애자일','하이브리드'];
  const desc = {
    '폭포수':'분석→설계→개발→테스트→안정화 순으로 순차 진행합니다.',
    '애자일':'Sprint 단위로 반복 개발하며 고객 피드백을 빠르게 반영합니다.',
    '하이브리드':'착수·분석·설계는 폭포수, 개발·테스트는 애자일 Sprint 방식으로 운영합니다.',
  };
  if (isEditable) {
    return `
      <div style="display:flex;gap:12px;margin-bottom:16px">
        ${methods.map(m=>`<label class="method-option ${d.methodology===m?'selected':''}">
          <input type="radio" name="init-method" value="${m}" ${d.methodology===m?'checked':''} onchange="onMethodChange('${m}')">
          <span class="method-label">${m}</span></label>`).join('')}
      </div>
      <div class="method-desc" id="method-desc">${desc[d.methodology]}</div>
      <div id="sprint-config" style="${d.methodology==='폭포수'?'display:none':''}; margin-top:14px">
        <label class="init-field-label">Sprint 주기 (개월)</label>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          ${[1,2,3,6].map(n=>`<label class="sprint-chip ${d.sprintMonths===n?'selected':''}">
            <input type="radio" name="sprint-m" value="${n}" ${d.sprintMonths===n?'checked':''} onchange="onSprintChange(${n})">${n}개월</label>`).join('')}
        </div>
      </div>`;
  } else {
    const mIcon={'폭포수':'🌊','애자일':'⚡','하이브리드':'🔀'};
    return `<div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:26px">${mIcon[d.methodology]}</span>
      <div><div style="font-size:18px;font-weight:700">${d.methodology}</div>
      ${d.methodology!=='폭포수'?`<div style="font-size:15px;color:#64748b;margin-top:3px">Sprint 주기: ${d.sprintMonths}개월</div>`:''}</div>
    </div>
    <div class="method-desc" style="margin-top:12px">${desc[d.methodology]}</div>`;
  }
}

function buildPhaseTable(d, p, isEditable) {
  const totalPct    = d.phases.reduce((s,ph)=>s+ph.budgetPct,0);
  const totalMonths = d.phases.reduce((s,ph)=>s+ph.months,0);
  const rows = d.phases.map((ph,i)=>{
    const amt=Math.round(p.budget*ph.budgetPct/100);
    return `<tr class="phase-tbl-row">
      <td class="phase-tbl-name">${ph.name}</td>
      <td class="phase-tbl-cell">${isEditable
        ?`<div class="month-stepper"><button onclick="adjPhaseMonths(${i},-1)">−</button><span id="pm-${i}">${ph.months}</span><button onclick="adjPhaseMonths(${i},1)">+</button></div>`
        :`${ph.months}개월`}</td>
      <td class="phase-tbl-cell">${isEditable
        ?`<div style="display:flex;align-items:center;gap:8px"><input class="pct-input" id="pct-${i}" type="number" min="0" max="100" value="${ph.budgetPct}" onchange="onPctChange()"><span style="font-size:15px;color:#64748b">%</span></div>`
        :`${ph.budgetPct}%`}</td>
      <td class="phase-tbl-amt">${fmt(amt)}원</td>
      <td class="phase-tbl-bar"><div class="phase-bar-bg"><div class="phase-bar-fill" id="pbar-${i}" style="width:${ph.budgetPct}%"></div></div></td>
    </tr>`;
  }).join('');
  const ok=totalPct===100;
  return `<table class="phase-alloc-tbl">
    <thead><tr><th>단계</th><th>기간</th><th>예산 비율</th><th>배분 금액</th><th style="width:130px">시각화</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr class="phase-tbl-total">
      <td>합계</td><td>${totalMonths}개월</td>
      <td id="total-pct" style="color:${ok?'#166534':'#991b1b'};font-weight:700">${totalPct}% ${ok?'✓':'⚠'}</td>
      <td>${fmt(p.budget)}원</td><td></td>
    </tr></tfoot>
  </table>
  <div style="margin-top:10px;font-size:15px;color:#64748b">기간: ${p.start} ~ ${p.end} · 총 예산: ${fmt(p.budget)}원</div>`;
}

function buildApprovalPanel(d, p) {
  const statusLabel={'미완료':'미생성','AI생성':'검토 중','승인완료':'승인 완료','ERP전송완료':'ERP 전송 완료'};
  const statusClass={'미완료':'ap-none','AI생성':'ap-review','승인완료':'ap-approved','ERP전송완료':'ap-erp'};

  let actionBtn='';
  if(d.status==='미완료')       actionBtn=`<button class="init-action-btn btn-generate" onclick="generateInitReport()">🤖 AI 보고서 생성</button>`;
  else if(d.status==='AI생성')  actionBtn=`<button class="init-action-btn btn-approve" onclick="approveInitReport()">✅ 승인 요청 · 확정</button>`;
  else if(d.status==='승인완료') actionBtn=`<button class="init-action-btn btn-erp" onclick="transmitERP()">📤 ERP 전송 (POt ${fmt(d.pot)}원)</button>`;

  const timeline=[
    {label:'AI 보고서 생성', done:d.status!=='미완료', date:d.generatedAt},
    {label:'결재 승인 완료', done:d.status==='승인완료'||d.status==='ERP전송완료', date:d.approvedAt},
    {label:'ERP 전송 완료', done:d.status==='ERP전송완료', date:d.erpTransmittedAt},
  ];

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">승인 현황</span></div>
      <div style="padding:20px 22px">
        <div class="ap-status-badge ${statusClass[d.status]}">${statusLabel[d.status]}</div>
        <div style="margin-top:18px">
          ${timeline.map((t,i)=>`<div class="ap-timeline-row">
            <div class="ap-tl-dot ${t.done?'done':''}"></div>
            ${i<timeline.length-1?`<div class="ap-tl-line ${t.done?'done':''}"></div>`:''}
            <div class="ap-tl-content">
              <div class="ap-tl-label ${t.done?'':'pending'}">${t.label}</div>
              ${t.date?`<div class="ap-tl-date">${t.date}</div>`:''}
            </div>
          </div>`).join('')}
        </div>
        ${actionBtn?`<div style="margin-top:20px">${actionBtn}</div>`:''}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">프로젝트 정보</span></div>
      <div style="padding:14px 22px;display:flex;flex-direction:column;gap:9px">
        ${[['프로젝트명',p.name],['PM',p.pm],['부서',d.department],['장소',d.location.split(' ').slice(0,3).join(' ')],['유형',d.projectType],['계약',d.contractType],['예산',fmt(p.budget)+'원']].map(([k,v])=>`
          <div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('')}
      </div>
    </div>

    ${d.status==='ERP전송완료'?`
    <div class="card">
      <div class="card-head"><span class="card-title">ERP 전송 내역</span></div>
      <div style="padding:14px 22px;display:flex;flex-direction:column;gap:9px">
        ${[['전송금액',fmt(d.pot)+'원'],['전송일시',d.erpTransmittedAt],['항목','착수보고 확정 POt'],['상태','✅ 완료']].map(([k,v])=>`
          <div class="info-row"><span class="info-key">${k}</span><span class="info-val" style="font-weight:600">${v}</span></div>`).join('')}
      </div>
    </div>`:''}`;
}

// ── 이벤트 ──
function bindInitiationEvents() {}

function switchInitProj(proj) { initProj=proj; renderInitiationDetail(); }

function onTypeChange(val, field) {
  INIT_STATE[initProj][field] = val;
  document.querySelectorAll(`input[name="${field==='projectType'?'ptype':'ctype'}"]`).forEach(el=>{
    el.closest('label').classList.toggle('selected', el.value===val);
  });
}

function onDevEnvChange(key, opt, checked) {
  const env = INIT_STATE[initProj].devEnv[key];
  if(checked) { if(!env.checked.includes(opt)) env.checked.push(opt); }
  else { env.checked = env.checked.filter(o=>o!==opt); }
  if(opt==='기타') {
    const etcEl = document.getElementById('etc-'+key);
    if(checked && !etcEl) renderInitiationDetail();
    else if(!checked && etcEl) etcEl.remove();
  }
  document.querySelectorAll(`[data-key="${key}"]`).forEach(el=>{
    el.closest('label')?.classList.toggle('checked', el.checked);
  });
}

function onMethodChange(m) {
  const d=INIT_STATE[initProj]; d.methodology=m;
  const descs={'폭포수':'분析→설계→개발→테스트→안정화 순으로 순차 진행합니다.','애자일':'Sprint 단위로 반복 개발하며 고객 피드백을 빠르게 반영합니다.','하이브리드':'착수·분析·설계는 폭포수, 개발·테스트는 애자일 Sprint 방식으로 운영합니다.'};
  const el=document.getElementById('method-desc'); if(el) el.textContent=descs[m];
  const sc=document.getElementById('sprint-config'); if(sc) sc.style.display=m==='폭포수'?'none':'';
  document.querySelectorAll('.method-option').forEach(el=>el.classList.toggle('selected',el.querySelector('input').value===m));
  if(m==='애자일'&&!d.phases[0].name.startsWith('Sprint')) d.phases=[{name:'Sprint 1',months:3,budgetPct:25},{name:'Sprint 2',months:3,budgetPct:30},{name:'Sprint 3',months:3,budgetPct:30},{name:'Sprint 4',months:3,budgetPct:15}];
  else if(m!=='애자일'&&d.phases[0].name.startsWith('Sprint')) d.phases=[{name:'분析',months:2,budgetPct:10},{name:'설계',months:2,budgetPct:15},{name:'개발',months:6,budgetPct:50},{name:'테스트',months:2,budgetPct:18},{name:'안정화',months:1,budgetPct:7}];
  renderInitiationDetail();
}

function onSprintChange(n) { INIT_STATE[initProj].sprintMonths=n; }
function adjPhaseMonths(idx,delta) { const ph=INIT_STATE[initProj].phases[idx]; ph.months=Math.max(1,ph.months+delta); const el=document.getElementById('pm-'+idx); if(el) el.textContent=ph.months; }
function onPctChange() {
  const d=INIT_STATE[initProj]; let total=0;
  d.phases.forEach((ph,i)=>{ const inp=document.getElementById('pct-'+i); if(inp){ph.budgetPct=parseInt(inp.value)||0; total+=ph.budgetPct;} });
  const ok=total===100; const tp=document.getElementById('total-pct');
  if(tp){tp.textContent=`${total}% ${ok?'✓':'⚠'}`; tp.style.color=ok?'#166534':'#991b1b';}
  d.phases.forEach((ph,i)=>{ const bar=document.getElementById('pbar-'+i); if(bar) bar.style.width=ph.budgetPct+'%'; });
}
function removeInitRisk(idx) { INIT_STATE[initProj].risks.splice(idx,1); renderInitiationDetail(); }
function addInitRisk() { INIT_STATE[initProj].risks.push('새 리스크를 입력하세요'); renderInitiationDetail(); const inputs=document.querySelectorAll('.init-risk-input'); if(inputs.length) inputs[inputs.length-1].focus(); }

function saveInitEdits() {
  const d=INIT_STATE[initProj];
  ['in-overview','in-objectives','in-scope'].forEach(id=>{ const el=document.getElementById(id); if(el) { if(id==='in-overview') d.overview=el.value; else if(id==='in-objectives') d.objectives=el.value; else d.scope=el.value; }});
  document.querySelectorAll('.init-risk-input').forEach((inp,i)=>{ if(d.risks[i]!==undefined) d.risks[i]=inp.value; });
  const dept=document.getElementById('in-dept'); if(dept) d.department=dept.value;
  const loc=document.getElementById('in-location'); if(loc) d.location=loc.value;
  Object.keys(DEV_ENV_OPTIONS).forEach(key=>{ const etcEl=document.getElementById('etc-'+key); if(etcEl) d.devEnv[key].etc=etcEl.value; });
}

function generateInitReport() { INIT_STATE[initProj].status='AI생성'; INIT_STATE[initProj].generatedAt='2026-04-30'; showToast('AI 보고서가 생성되었습니다.'); renderInitiationDetail(); }
function approveInitReport() {
  saveInitEdits();
  const total=INIT_STATE[initProj].phases.reduce((s,ph)=>s+ph.budgetPct,0);
  if(total!==100){showToast('예산 배분 합계가 100%가 되어야 합니다.');return;}
  INIT_STATE[initProj].status='승인완료'; INIT_STATE[initProj].approvedAt='2026-04-30'; INIT_STATE[initProj].approver='이봄';
  showToast('착수보고가 승인 완료되었습니다.'); renderInitiationDetail();
}
function transmitERP() { INIT_STATE[initProj].status='ERP전송완료'; INIT_STATE[initProj].erpTransmittedAt='2026-04-30 '+new Date().toTimeString().slice(0,5); showToast('POt이 ERP로 전송되었습니다.'); renderInitiationDetail(); }
function requestApproval() { showToast('결재 요청이 발송되었습니다. 팀장에게 알림이 전송됩니다.'); }
