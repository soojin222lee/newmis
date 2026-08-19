// ════════════════════════════════════════
//  수주형 프로젝트
// ════════════════════════════════════════

// AI GUIDE: 수주형 프로젝트 정보 화면입니다.
// - CRM/IF에서 받은 수주형 프로젝트 기본정보를 목록, 등록, 상세 형태로 보여줍니다.
// - 현재 화면에서는 단계별 기간 정보는 제거하고 기본정보와 IF 변경이력만 남기는 방향입니다.
// - AI 화면 가이드는 프로젝트 코드, 고객사, 매출귀속조직, 계약유형, IF 변경이력 의미를 우선 설명해야 합니다.
// - 신규 등록은 외부 시스템에서 계약 완료 프로젝트를 조회한 뒤 선택 등록하는 목업 흐름입니다.

let siView = 'list';   // 'list' | 'detail' | 'register'
let siSelectedId = null;
let siSearchQuery = '';
let siStageFilter = '';
let siRegResults  = [];
let siRegSelected = null;

// ── CRM 계약완료 프로젝트 풀 (조회 대상) ──
const CRM_PROJECTS_POOL = [
  { code:'30142601-D001', name:'2026년 보안시스템 고도화',      pm:'이봄',  revOrg:'보안사업부',   projType:'SI-AD',       start:'2026-07-01', end:'2027-06-30', contractType:'총액계약', mainDept:'보안팀',   customer:'SK브로드밴드', status:'최종계약완료' },
  { code:'30142602-D001', name:'데이터 분석 플랫폼 구축',       pm:'이봄',  revOrg:'데이터사업부', projType:'원가-선투입', start:'2026-08-01', end:'2027-03-31', contractType:'IV',       mainDept:'AI팀',    customer:'SK텔레시스',  status:'최종계약완료' },
  { code:'30142603-D001', name:'클라우드 마이그레이션 2차',     pm:'한민석', revOrg:'NOVA PMO팀',  projType:'원가-선투입', start:'2026-09-01', end:'2027-08-31', contractType:'단가계약', mainDept:'인프라팀', customer:'SK C&C',      status:'최종계약완료' },
  { code:'30142604-D001', name:'사내 AI 자동화 솔루션 도입',    pm:'한민석', revOrg:'AI사업부',    projType:'SI-AD',       start:'2026-10-01', end:'2027-04-30', contractType:'총액계약', mainDept:'AI팀',    customer:'SK텔레콤',    status:'최종계약완료' },
  { code:'30142605-D001', name:'2026년 ERP 추가모듈 개발',      pm:'이강혁', revOrg:'AX ERP사업부', projType:'SI-AD',      start:'2026-07-01', end:'2026-12-31', contractType:'총액계약', mainDept:'시스템팀', customer:'SK하이닉스',  status:'최종계약완료' },
];

const SI_STAGES = ['등록완료','착수','수행중','마감준비','종료완료'];

const SI_STATUS_STYLE = {
  '등록완료': { bg:'#f1f5f9', color:'#475569' },
  '착수':     { bg:'#ede9fe', color:'#5b21b6' },
  '수행중':   { bg:'#dbeafe', color:'#1d4ed8' },
  '마감준비': { bg:'#fef3c7', color:'#b45309' },
  '종료완료': { bg:'#dcfce7', color:'#166534' },
};

const SI_PHASE_NAMES = ['착수','분석','설계','개발','테스트','운영인계','종료'];

const SI_PHASE_STYLE = {
  '예정':   { bg:'#f1f5f9', color:'#64748b' },
  '진행중': { bg:'#dbeafe', color:'#1d4ed8' },
  '완료':   { bg:'#dcfce7', color:'#166534' },
};

const SI_PROJECTS = {
  'SI-001': {
    code:'30142101-D001', name:'2026년 클라우드 인프라 전환',
    start:'2026-05-01', end:'2027-04-30',
    pm:'한민석', revOrg:'NOVA PMO팀',
    projType:'원가-선투입', stage:'수행중',
    contractType:'IV', mainDept:'NOVA PMO팀',
    customer:'SK C&C', ifSource:'ERP', lastSync:'2026-04-15 09:30',
    phases:[
      { name:'착수',    start:'2026-05-01', end:'2026-05-15', status:'완료',   source:'ERP' },
      { name:'분석',    start:'2026-05-16', end:'2026-07-31', status:'완료',   source:'ERP' },
      { name:'설계',    start:'2026-08-01', end:'2026-10-31', status:'진행중', source:'PM'  },
      { name:'개발',    start:'2026-11-01', end:'2027-01-31', status:'예정',   source:'PM'  },
      { name:'테스트',  start:'2027-02-01', end:'2027-03-15', status:'예정',   source:'PM'  },
      { name:'운영인계',start:'2027-03-16', end:'2027-04-15', status:'예정',   source:'PM'  },
      { name:'종료',    start:'2027-04-16', end:'2027-04-30', status:'예정',   source:'PM'  },
    ],
    ifHistory:[
      { date:'2026-04-15 09:30', field:'프로젝트상태', before:'착수',         after:'수행중',      source:'ERP' },
      { date:'2026-04-01 08:05', field:'수행PM',       before:'이강혁',        after:'한민석',      source:'SCM' },
      { date:'2026-03-15 10:22', field:'종료일',       before:'2026-12-31',    after:'2027-04-30',  source:'ERP' },
      { date:'2026-02-01 09:00', field:'계약형태',     before:'—',             after:'IV',          source:'ERP' },
      { date:'2026-01-20 08:00', field:'매출귀속조직', before:'—',             after:'NOVA PMO팀',  source:'ERP' },
    ],
  },
  'SI-002': {
    code:'30142102-D001', name:'2026년 ERP 유지보수 운영',
    start:'2026-03-01', end:'2026-12-31',
    pm:'이강혁', revOrg:'AX ERP사업부',
    projType:'OS-운영', stage:'착수',
    contractType:'단가계약', mainDept:'시스템팀',
    customer:'SK하이닉스', ifSource:'ERP', lastSync:'2026-03-02 08:10',
    phases:[
      { name:'착수',    start:'2026-03-01', end:'2026-03-31', status:'진행중', source:'PM' },
      { name:'분석',    start:'',           end:'',           status:'예정',   source:'PM' },
      { name:'설계',    start:'',           end:'',           status:'예정',   source:'PM' },
      { name:'개발',    start:'',           end:'',           status:'예정',   source:'PM' },
      { name:'테스트',  start:'',           end:'',           status:'예정',   source:'PM' },
      { name:'운영인계',start:'',           end:'',           status:'예정',   source:'PM' },
      { name:'종료',    start:'',           end:'',           status:'예정',   source:'PM' },
    ],
    ifHistory:[
      { date:'2026-03-02 08:10', field:'프로젝트상태', before:'등록완료',    after:'착수',          source:'ERP' },
      { date:'2026-02-28 17:30', field:'수행PM',       before:'—',           after:'이강혁',        source:'SCM' },
      { date:'2026-02-20 09:00', field:'프로젝트코드', before:'—',           after:'30142102-D001', source:'ERP' },
    ],
  },
  'SI-003': {
    code:'30142103-D001', name:'HR 시스템 개선 2차',
    start:'2026-06-01', end:'2026-11-30',
    pm:'윤도준', revOrg:'HR사업부',
    projType:'SI-AD', stage:'등록완료',
    contractType:'총액계약', mainDept:'HR팀',
    customer:'SK텔레콤', ifSource:'ERP', lastSync:'2026-04-20 10:05',
    phases:[
      { name:'착수',    start:'', end:'', status:'예정', source:'PM' },
      { name:'분석',    start:'', end:'', status:'예정', source:'PM' },
      { name:'설계',    start:'', end:'', status:'예정', source:'PM' },
      { name:'개발',    start:'', end:'', status:'예정', source:'PM' },
      { name:'테스트',  start:'', end:'', status:'예정', source:'PM' },
      { name:'운영인계',start:'', end:'', status:'예정', source:'PM' },
      { name:'종료',    start:'', end:'', status:'예정', source:'PM' },
    ],
    ifHistory:[
      { date:'2026-04-20 10:05', field:'프로젝트코드', before:'—',           after:'30142103-D001', source:'ERP' },
      { date:'2026-04-20 10:05', field:'계약형태',     before:'—',           after:'총액계약',    source:'ERP' },
    ],
  },
};

// ── 진입점 ──────────────────────────────
function renderSIProject() {
  if (siView === 'list')     renderSIList();
  else if (siView === 'register') renderSIRegister();
  else renderSIDetail();
}

// ── 목록 뷰 ─────────────────────────────
function renderSIList() {
  const el = document.getElementById('s-si-project');
  const q  = siSearchQuery.toLowerCase();

  const filtered = Object.entries(SI_PROJECTS).filter(([, p]) => {
    const matchQ = !q || [p.name, p.code, p.pm, p.revOrg, p.customer, p.projType, p.contractType, p.mainDept]
      .some(v => v && v.toLowerCase().includes(q));
    const matchS = !siStageFilter || p.stage === siStageFilter;
    return matchQ && matchS;
  });

  const stageOpts = ['', ...SI_STAGES].map(s =>
    `<option value="${s}" ${s===siStageFilter?'selected':''}>${s||'전체 단계'}</option>`
  ).join('');

  const rows = filtered.length ? filtered.map(([id, p]) => {
    const st = SI_STATUS_STYLE[p.stage] || SI_STATUS_STYLE['등록완료'];
    return `
      <tr onclick="openSIDetail('${id}')">
        <td class="pt-code">${p.code}</td>
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${p.customer} · ${p.projType} · ${p.contractType}</div>
        </td>
        <td>${p.pm}</td>
        <td>${p.revOrg}</td>
        <td>${p.mainDept}</td>
        <td style="white-space:nowrap;font-size:14px">${p.start}<br><span style="color:#94a3b8">~ ${p.end}</span></td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${st.bg};color:${st.color}">${p.stage}</span>
        </td>
        <td style="font-size:13px;color:#94a3b8;white-space:nowrap">🔄 ${p.lastSync}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="8" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">수주형 프로젝트</div>
        <div class="page-sub">CRM 연동 프로젝트 기본정보 등록 및 변경이력 조회</div>
      </div>
      <button class="save-btn" onclick="siView='register';renderSIProject()" style="margin-top:4px;font-size:14px;padding:6px 14px">+ 신규 등록</button>
    </div>

    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM, 고객사, 매출귀속조직 검색…"
          value="${siSearchQuery}"
          oninput="siSearchQuery=this.value;renderSIList()">
      </div>
      <select class="proj-filter-select" onchange="siStageFilter=this.value;renderSIList()">${stageOpts}</select>
      <span class="proj-count-tag">총 <strong>${filtered.length}</strong>건</span>
    </div>

    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트코드</th>
            <th>프로젝트명 / 고객사</th>
            <th>수행 PM</th>
            <th>매출귀속조직</th>
            <th>주관부서</th>
            <th>기간</th>
            <th class="pt-center">단계</th>
            <th>마지막 IF</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── 신규 등록 뷰 ─────────────────────────
function renderSIRegister() {
  siRegResults  = [];
  siRegSelected = null;
  const el = document.getElementById('s-si-project');
  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="siView='list';renderSIList()">← 목록</button>
      <div>
        <div style="font-size:20px;font-weight:800;color:#1e293b">수주형 프로젝트 신규 등록</div>
        <div style="font-size:15px;color:#64748b;margin-top:2px">CRM 계약완료 프로젝트를 조회하여 등록합니다.</div>
      </div>
    </div>

    <!-- 안내 배너 -->
    <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;margin-bottom:20px">
      <span style="font-size:22px;flex-shrink:0">ℹ️</span>
      <span style="font-size:15px;font-weight:600;color:#1d4ed8">CRM에서 최종계약완료 된 프로젝트만 수행 프로젝트 등록이 가능합니다.</span>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">CRM 프로젝트 조회</span></div>
      <div style="padding:20px 24px">
        <div style="font-size:14px;font-weight:600;color:#64748b;margin-bottom:8px">프로젝트 코드 또는 수행 PM 이름 <span style="color:#ef4444">*</span></div>
        <div style="display:flex;gap:10px;max-width:560px">
          <input id="si-reg-code" class="reg-input" placeholder="예: PJ2026-N004  " style="flex:1"
            onkeydown="if(event.key==='Enter')siMockFetch()">
          <button class="save-btn" style="white-space:nowrap;padding:9px 22px" onclick="siMockFetch()">조회</button>
        </div>
        <div style="font-size:14px;color:#94a3b8;margin-top:6px">
          프로젝트 코드 또는 CRM에 등록된 수행 PM 이름으로 조회 가능합니다.
        </div>
        <div id="si-results-area" style="margin-top:16px"></div>
        <div id="si-fetched"      style="margin-top:4px;display:none"></div>
      </div>
    </div>`;
}

function siMockFetch() {
  const val = document.getElementById('si-reg-code').value.trim();
  if (!val) { showToast('코드 또는 PM 이름을 입력하세요.'); return; }

  const q = val.toLowerCase();
  siRegResults = CRM_PROJECTS_POOL.filter(p =>
    p.code.toLowerCase().includes(q) || p.pm.toLowerCase().includes(q)
  );

  const area    = document.getElementById('si-results-area');
  const fetched = document.getElementById('si-fetched');
  fetched.style.display = 'none';
  fetched.innerHTML = '';

  if (!siRegResults.length) {
    area.innerHTML = `
      <div style="padding:14px 18px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;font-size:15px;color:#991b1b">
        ⚠️ CRM에서 최종계약완료 된 프로젝트를 찾을 수 없습니다. 코드 또는 PM 이름을 다시 확인해주세요.
      </div>`;
    return;
  }

  if (siRegResults.length === 1) {
    area.innerHTML = '';
    siRegSelectProject(0);
    return;
  }

  // 복수 결과 → 선택 목록
  area.innerHTML = `
    <div style="font-size:15px;font-weight:600;color:#475569;margin-bottom:10px">
      총 <strong>${siRegResults.length}건</strong> 조회되었습니다. 등록할 프로젝트를 선택하세요.
    </div>
    <div style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden">
      ${siRegResults.map((p, i) => `
        <div onclick="siRegSelectProject(${i})"
          style="padding:14px 18px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.12s;display:flex;align-items:center;justify-content:space-between;gap:12px"
          onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <div>
            <div style="font-weight:700;font-size:16px;color:#1e293b">${p.name}</div>
            <div style="font-size:14px;color:#94a3b8;margin-top:4px">${p.code} &nbsp;·&nbsp; PM: <strong style="color:#475569">${p.pm}</strong> &nbsp;·&nbsp; ${p.customer}</div>
          </div>
          <span style="font-size:13px;padding:4px 12px;background:#dcfce7;color:#166534;border-radius:99px;white-space:nowrap;flex-shrink:0">${p.status}</span>
        </div>`).join('')}
    </div>`;
}

function siRegSelectProject(idx) {
  siRegSelected = siRegResults[idx];
  const p = siRegSelected;

  document.getElementById('si-results-area').innerHTML = `
    <div style="padding:10px 16px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;font-size:15px;color:#166534;margin-bottom:2px">
      ✅ <strong>${p.name}</strong> (${p.code}) — CRM 기본정보를 가져왔습니다. 내용을 확인 후 등록하세요.
    </div>`;

  const fetched = document.getElementById('si-fetched');
  fetched.style.display = 'block';
  fetched.innerHTML = `
    <div class="si-basic-grid" style="margin-top:14px">
      ${buildSIFieldReadonly([
        ['프로젝트 코드',  p.code,                    'ERP'],
        ['프로젝트명',     p.name,                    'ERP'],
        ['프로젝트 기간',  p.start + ' ~ ' + p.end,   'ERP'],
        ['수행PM',         p.pm,                      'ERP'],
        ['매출귀속조직',   p.revOrg,                  'ERP'],
        ['프로젝트유형',   p.projType,                'ERP'],
        ['프로젝트상태',   p.status,                  'ERP'],
        ['계약형태',       p.contractType,            'ERP'],
        ['주수행부서',     p.mainDept,                '수동'],
        ['고객사',         p.customer,                'ERP'],
      ])}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
      <button class="reset-btn" onclick="siView='list';renderSIList()">취소</button>
      <button class="save-btn" onclick="siConfirmRegister()">✅ 등록 완료</button>
    </div>`;
}

function siConfirmRegister() {
  if (!siRegSelected) return;
  const p     = siRegSelected;
  const idx   = Object.keys(SI_PROJECTS).length + 1;
  const newId = `SI-${String(idx).padStart(3,'0')}`;
  const now   = new Date().toISOString().slice(0,10) + ' ' + new Date().toTimeString().slice(0,5);

  SI_PROJECTS[newId] = {
    code: p.code, name: p.name,
    start: p.start, end: p.end,
    pm: p.pm, revOrg: p.revOrg,
    projType: p.projType, stage: '등록완료',
    contractType: p.contractType, mainDept: p.mainDept,
    customer: p.customer, ifSource: 'CRM', lastSync: now,
    ifHistory: [
      { date: now, field:'프로젝트상태', before:'최종계약완료', after:'등록완료', source:'CRM' },
    ],
  };

  siSelectedId = newId;
  siView = 'detail';
  renderSIDetail();
  showToast('✅ 프로젝트가 등록되었습니다.');
}

function buildSIFieldReadonly(fields) {
  return fields.map(([label, value, src]) => `
    <div class="si-field-item">
      <div class="si-field-label">${label}
        ${src === 'ERP' ? '<span class="si-if-badge">IF·ERP</span>' : '<span class="si-if-badge si-if-manual">수동입력</span>'}
      </div>
      <div class="si-field-val">${value}</div>
    </div>`).join('');
}

// ── 상세 뷰 ─────────────────────────────
function openSIDetail(id) {
  siSelectedId = id;
  siView = 'detail';
  renderSIDetail();
}

function closeSIDetail() {
  siView = 'list';
  renderSIList();
}

function renderSIDetail() {
  const el = document.getElementById('s-si-project');
  const p = SI_PROJECTS[siSelectedId];
  const st = SI_STATUS_STYLE[p.stage] || SI_STATUS_STYLE['등록완료'];

  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="closeSIDetail()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:14px;color:#94a3b8;margin-bottom:2px">${p.code}</div>
        <div style="font-size:20px;font-weight:800;color:#1e293b">${p.name}</div>
      </div>
      <span class="ipc-status-badge" style="background:${st.bg};color:${st.color};font-size:15px;padding:6px 14px">${p.stage}</span>
    </div>

    <!-- 프로젝트 진행 단계: 착수 / 수행 / 종료 -->
    ${buildSIProgressV2(p, siSelectedId)}

    <!-- 기본정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">기본정보</span>
        <span style="font-size:14px;color:#94a3b8">🔄 마지막 동기화: ${p.lastSync} (${p.ifSource})</span>
      </div>
      <div class="si-basic-grid" style="padding:16px 24px 20px">
        ${buildSIFieldReadonly([
          ['프로젝트 기간', `${p.start} ~ ${p.end}`, 'ERP'],
          ['수행PM',        p.pm,           'ERP'],
          ['매출귀속조직',  p.revOrg,        'ERP'],
          ['프로젝트유형',  p.projType,      'ERP'],
          ['프로젝트상태',  p.stage,         'ERP'],
          ['계약형태',      p.contractType,  'ERP'],
          ['주수행부서',    p.mainDept,      '수동'],
          ['고객사',        p.customer,      'ERP'],
        ])}
      </div>
    </div>

    <!-- 단계별 기간 정보 -->
    ${buildSIPhaseSection(p, siSelectedId)}

    <!-- IF 변경이력 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">IF 변경이력</span>
        <span class="card-badge">선행 시스템에서 수신한 데이터 변경 기록</span>
      </div>
      <div style="padding:0 20px 20px">${buildSIHistory(p.ifHistory)}</div>
    </div>`;
}

// ── 프로그레스 바 ────────────────────────
function buildSIProgressBar(currentStage) {
  const currentIdx = SI_STAGES.indexOf(currentStage);
  const items = SI_STAGES.map((s, i) => {
    const isDone    = i < currentIdx;
    const isCurrent = i === currentIdx;
    const dotClass  = isCurrent ? 'si-prog-dot si-prog-dot--current'
                    : isDone    ? 'si-prog-dot si-prog-dot--done'
                    :             'si-prog-dot';
    const labelClass = isCurrent ? 'si-prog-label si-prog-label--current'
                     : isDone    ? 'si-prog-label si-prog-label--done'
                     :             'si-prog-label';
    const icon = isDone ? '✓' : isCurrent ? '●' : '';
    const line = i < SI_STAGES.length - 1
      ? `<div class="si-prog-line ${isDone ? 'si-prog-line--done' : ''}"></div>`
      : '';
    return `
      <div class="si-prog-step">
        <div class="${dotClass}">${icon}</div>
        <div class="${labelClass}">${s}</div>
      </div>
      ${line}`;
  }).join('');
  return items;
}

// ── 착수 / 수행 / 종료 3단계 진행 + 수동(자동) 처리 ──
function siPhase(stage) {
  if (stage === '종료완료') return 2;                                   // 종료
  if (stage === '착수' || stage === '수행중' || stage === '마감준비') return 1; // 수행(착수 완료)
  return 0;                                                            // 등록완료 = 착수 대기
}
function buildSIProgressV2(p, id) {
  const phase = siPhase(p.stage);
  const stages = ['착수', '수행', '종료'];
  const state = i => {
    if (i === 0) return phase >= 1 ? 'done' : 'active';
    if (i === 1) return phase >= 2 ? 'done' : (phase === 1 ? 'active' : 'pending');
    return phase === 2 ? 'done' : 'pending';
  };
  const steps = stages.map((s, i) => {
    const st = state(i);
    const icon = st === 'done' ? '✓' : (st === 'active' ? '●' : (i + 1));
    const line = i < 2 ? `<div class="si-p3-line ${i < phase ? 'on' : ''}"></div>` : '';
    return `<div class="si-p3-step ${st}"><div class="si-p3-dot">${icon}</div><div class="si-p3-lbl">${s}</div></div>${line}`;
  }).join('');
  let actions;
  if (phase === 0) actions = `<button class="labor-main-btn" onclick="siManualStart('${id}')">착수(등록) →</button><span class="si-p3-hint">CRM 최종계약완료 조건 충족 시 자동 착수됩니다.</span>`;
  else if (phase === 1) actions = `<button class="labor-main-btn" onclick="siManualClose('${id}')">종료 처리 →</button><span class="si-p3-hint">정산·검수 완료 조건 충족 시 자동 종료됩니다.</span>`;
  else actions = `<span class="si-p3-done-tag">✓ 프로젝트 종료 완료</span>`;
  return `
    <div class="card si-prog2-card" style="margin-bottom:16px">
      <div class="si-prog2-in">
        <div class="si-prog2-head">
          <span class="si-prog2-title">Project Progress</span>
          <span class="si-prog2-sub">착수·종료는 조건 충족 시 자동 실행되며, 필요 시 수동으로도 처리할 수 있습니다.</span>
        </div>
        <div class="si-p3">${steps}</div>
        <div class="si-p3-actions">${actions}</div>
      </div>
    </div>`;
}
function siManualStart(id) {
  const p = SI_PROJECTS[id];
  if (p.ifHistory) p.ifHistory.unshift({ date:'2026-08-18 09:00', field:'프로젝트상태', before: p.stage, after:'착수', source:'수동' });
  p.stage = '착수';
  renderSIDetail();
  showToast('착수(등록)를 수동으로 처리했어요. 수행 단계로 진행합니다.');
}
function siManualClose(id) {
  const p = SI_PROJECTS[id];
  if (p.ifHistory) p.ifHistory.unshift({ date:'2026-08-18 09:00', field:'프로젝트상태', before: p.stage, after:'종료완료', source:'수동' });
  p.stage = '종료완료';
  renderSIDetail();
  showToast('프로젝트를 종료 처리했어요.');
}

function buildSIStageDots(currentStage, mini = false) {
  const currentIdx = SI_STAGES.indexOf(currentStage);
  return SI_STAGES.map((s, i) => {
    const isDone    = i <= currentIdx;
    return `<div class="apv-stage-item">
      <div class="apv-stage-dot ${isDone ? 'done' : ''}"></div>
      <div class="apv-stage-role" style="font-size:11px">${s.replace('완료','')}</div>
    </div>${i < SI_STAGES.length - 1 ? '<div class="apv-stage-line"></div>' : ''}`;
  }).join('');
}

// ── 단계별 기간 정보 ────────────────────
function buildSIPhaseSection(p, projId) {
  const phases = p.phases || SI_PHASE_NAMES.map(n => ({ name:n, start:'', end:'', status:'예정', source:'PM' }));

  const hasIfPhase = phases.some(ph => ph.source === 'ERP' || ph.source === 'IF');

  const PHASE_COLOR = {
    '착수':    { bg:'#ede9fe', color:'#5b21b6', dot:'#7c3aed' },
    '분석':    { bg:'#dbeafe', color:'#1d4ed8', dot:'#3b82f6' },
    '설계':    { bg:'#ccfbf1', color:'#0f766e', dot:'#14b8a6' },
    '개발':    { bg:'#fef3c7', color:'#92400e', dot:'#f59e0b' },
    '테스트':  { bg:'#ffedd5', color:'#c2410c', dot:'#f97316' },
    '운영인계':{ bg:'#fce7f3', color:'#9d174d', dot:'#ec4899' },
    '종료':    { bg:'#f1f5f9', color:'#475569', dot:'#94a3b8' },
  };

  const rows = phases.map((ph, i) => {
    const pc  = PHASE_COLOR[ph.name] || { bg:'#f1f5f9', color:'#475569', dot:'#94a3b8' };
    const ps  = SI_PHASE_STYLE[ph.status] || SI_PHASE_STYLE['예정'];
    const isIf = ph.source === 'ERP' || ph.source === 'IF';
    const srcBadge = isIf
      ? `<span class="si-if-badge">IF·${ph.source}</span>`
      : `<span class="si-if-badge si-if-manual">PM 입력</span>`;

    const dateCell = isIf
      ? `<span class="si-phase-date">${ph.start || '—'}</span>
         <span class="si-phase-date-sep">~</span>
         <span class="si-phase-date">${ph.end || '—'}</span>`
      : `<input type="date" class="si-phase-input" id="ph-start-${i}" value="${ph.start}"
           onchange="siPhaseChanged('${projId}',${i},'start',this.value)">
         <span class="si-phase-date-sep">~</span>
         <input type="date" class="si-phase-input" id="ph-end-${i}" value="${ph.end}"
           onchange="siPhaseChanged('${projId}',${i},'end',this.value)">`;

    const statusSel = isIf
      ? `<span class="si-phase-status-badge" style="background:${ps.bg};color:${ps.color}">${ph.status}</span>`
      : `<select class="si-phase-select" onchange="siPhaseChanged('${projId}',${i},'status',this.value)">
           ${['예정','진행중','완료'].map(s => `<option value="${s}" ${s===ph.status?'selected':''}>${s}</option>`).join('')}
         </select>`;

    return `
      <div class="si-phase-row">
        <div class="si-phase-name-cell">
          <span class="si-phase-dot" style="background:${pc.dot}"></span>
          <span class="si-phase-name" style="color:${pc.color}">${ph.name}</span>
          ${srcBadge}
        </div>
        <div class="si-phase-dates">${dateCell}</div>
        <div class="si-phase-status">${statusSel}</div>
      </div>`;
  }).join('');

  const noticeBg  = hasIfPhase ? '#eff6ff' : '#fffbeb';
  const noticeBdr = hasIfPhase ? '#bfdbfe' : '#fde68a';
  const noticeClr = hasIfPhase ? '#1d4ed8' : '#92400e';
  const noticeIcon = hasIfPhase ? 'ℹ️' : '⚠️';
  const noticeMsg  = hasIfPhase
    ? '일부 단계는 선행 시스템(ERP 등)에서 인터페이스로 수신된 데이터입니다. PM 입력 항목은 직접 수정할 수 있습니다.'
    : '선행 시스템과의 인터페이스 협의가 완료되면 자동 수신될 수 있습니다. 협의 전까지는 PM이 직접 입력하여 관리하세요.';

  return `
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <span class="card-title">단계별 기간 정보</span>
      <span class="card-badge">착수 · 분석 · 설계 · 개발 · 테스트 · 운영인계 · 종료</span>
    </div>
    <div style="padding:16px 24px 20px">

      <!-- 안내 배너 -->
      <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;background:${noticeBg};border:1.5px solid ${noticeBdr};border-radius:10px;margin-bottom:18px">
        <span style="font-size:18px;flex-shrink:0;margin-top:1px">${noticeIcon}</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:${noticeClr};margin-bottom:3px">데이터 입력 방식 안내</div>
          <div style="font-size:14px;color:${noticeClr};line-height:1.6">${noticeMsg}</div>
          <div style="margin-top:8px;font-size:13px;color:#64748b;line-height:1.6">
            <span class="si-if-badge" style="margin-right:6px">IF·ERP</span> 선행 시스템 인터페이스 수신 (읽기전용) &nbsp;|&nbsp;
            <span class="si-if-badge si-if-manual" style="margin-right:6px">PM 입력</span> PM 직접 입력 (편집 가능)
          </div>
        </div>
      </div>

      <!-- 헤더 -->
      <div class="si-phase-header">
        <div style="flex:0 0 160px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase">단계</div>
        <div style="flex:1;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase">기간 (시작일 ~ 종료일)</div>
        <div style="flex:0 0 120px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase">진행상태</div>
      </div>

      <!-- 단계 행 목록 -->
      <div class="si-phase-list">${rows}</div>

      <div id="si-phase-save-msg-${projId}" style="display:none;font-size:14px;color:#166534;margin-top:10px">✓ 저장되었습니다</div>
    </div>
  </div>`;
}

function siPhaseChanged(projId, idx, field, value) {
  const p = SI_PROJECTS[projId];
  if (!p || !p.phases) return;
  p.phases[idx][field] = value;
  p.phases[idx].source = 'PM';

  const msgEl = document.getElementById(`si-phase-save-msg-${projId}`);
  if (msgEl) {
    msgEl.style.display = 'block';
    clearTimeout(msgEl._t);
    msgEl._t = setTimeout(() => { msgEl.style.display = 'none'; }, 2000);
  }
}

// ── IF 변경이력 테이블 ───────────────────
function buildSIHistory(history) {
  if (!history || !history.length) return '<div style="padding:20px;color:#94a3b8;text-align:center">변경이력이 없습니다.</div>';

  const SOURCE_STYLE = {
    'ERP': { bg:'#dbeafe', color:'#1d4ed8' },
    'SCM': { bg:'#dcfce7', color:'#166534' },
    'BIX': { bg:'#fce7f3', color:'#9d174d' },
  };

  const rows = history.map(h => {
    const ss = SOURCE_STYLE[h.source] || { bg:'#f1f5f9', color:'#475569' };
    return `
      <div class="si-hist-row">
        <div class="si-hist-date">${h.date}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="si-if-badge" style="background:${ss.bg};color:${ss.color}">${h.source}</span>
          <span class="si-hist-field">${h.field}</span>
        </div>
        <div class="si-hist-change">
          <span class="si-hist-before">${h.before}</span>
          <span style="color:#94a3b8;padding:0 6px">→</span>
          <span class="si-hist-after">${h.after}</span>
        </div>
      </div>`;
  }).join('');

  return `<div class="si-hist-list" style="margin-top:12px">${rows}</div>`;
}

// Final override: 수주형 프로젝트 상세는 기본정보와 IF 변경이력만 노출한다.
renderSIDetail = function() {
  const el = document.getElementById('s-si-project');
  const p = SI_PROJECTS[siSelectedId];
  if (!el || !p) return;
  const st = SI_STATUS_STYLE[p.stage] || SI_STATUS_STYLE['등록완료'] || { bg:'#f1f5f9', color:'#475569' };

  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="closeSIDetail()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:14px;color:#94a3b8;margin-bottom:2px">${p.code}</div>
        <div style="font-size:20px;font-weight:800;color:#1e293b">${p.name}</div>
      </div>
      <span class="ipc-status-badge" style="background:${st.bg};color:${st.color};font-size:15px;padding:6px 14px">${p.stage}</span>
      <button class="labor-sub-btn si-back-btn" onclick="closeSIDetail()">목록으로 ↩</button>
    </div>

    ${buildSIProgressV2(p, siSelectedId)}

    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">기본정보</span>
        <span style="font-size:14px;color:#94a3b8">마지막 동기화 ${p.lastSync} (${p.ifSource})</span>
      </div>
      <div class="si-basic-grid" style="padding:16px 24px 20px">
        ${buildSIFieldReadonly([
          ['프로젝트 기간', `${p.start} ~ ${p.end}`, 'ERP'],
          ['수행PM', p.pm, 'ERP'],
          ['매출귀속조직', p.revOrg, 'ERP'],
          ['프로젝트유형', p.projType, 'ERP'],
          ['프로젝트상태', p.stage, 'ERP'],
          ['계약형태', p.contractType, 'ERP'],
          ['주수행부서', p.mainDept, '수동'],
          ['고객사', p.customer, 'ERP'],
        ])}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">IF 변경이력</span>
        <span class="card-badge">선행 시스템에서 수신한 데이터 변경 기록</span>
      </div>
      <div style="padding:0 20px 20px">${buildSIHistory(p.ifHistory)}</div>
    </div>`;
};
