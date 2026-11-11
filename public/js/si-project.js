// ════════════════════════════════════════
//  수주형 프로젝트
// ════════════════════════════════════════

// AI GUIDE: 수주형 프로젝트 정보 화면입니다.
// - CRM/IF에서 받은 수주형 프로젝트 기본정보를 목록, 등록, 상세 형태로 보여줍니다.
// - 현재 화면에서는 단계별 기간 정보는 제거하고 기본정보와 IF 변경이력만 남기는 방향입니다.
// - AI 화면 가이드는 프로젝트 코드, 고객사, 매출귀속조직, 계약유형, IF 변경이력 의미를 우선 설명해야 합니다.
// - IF 등록은 외부 시스템(CRM)에서 계약 완료 프로젝트를 조회한 뒤 선택 등록하는 목업 흐름입니다.

let siView = 'list';   // 'list' | 'detail' | 'register'
let siSelectedId = null;
let siSearchQuery = '';
let siStageFilter = '';
let siRegResults  = [];
let siRegSelected = null;

// ── CRM 계약완료 프로젝트 풀 (조회 대상) ──
const CRM_PROJECTS_POOL = [
  { code:'30142601-D001', name:'2026년 보안시스템 고도화',      pm:'이봄',  revOrg:'보안사업부',   projType:'SI-AD',       start:'2026-07-01', end:'2027-06-30', contractType:'SI', mainDept:'보안팀',   customer:'SK브로드밴드', status:'최종계약완료' },
  { code:'30142602-D001', name:'데이터 분석 플랫폼 구축',       pm:'이봄',  revOrg:'데이터사업부', projType:'원가-선투입', start:'2026-08-01', end:'2027-03-31', contractType:'SI',       mainDept:'AI팀',    customer:'SK텔레시스',  status:'최종계약완료' },
  { code:'30142603-D001', name:'클라우드 마이그레이션 2차',     pm:'한민석', revOrg:'NOVA PMO팀',  projType:'원가-선투입', start:'2026-09-01', end:'2027-08-31', contractType:'OS', mainDept:'인프라팀', customer:'SK C&C',      status:'최종계약완료' },
  { code:'30142604-D001', name:'사내 AI 자동화 솔루션 도입',    pm:'한민석', revOrg:'AI사업부',    projType:'SI-AD',       start:'2026-10-01', end:'2027-04-30', contractType:'SI', mainDept:'AI팀',    customer:'SK텔레콤',    status:'최종계약완료' },
  { code:'30142605-D001', name:'2026년 ERP 추가모듈 개발',      pm:'이강혁', revOrg:'AX ERP사업부', projType:'SI-AD',      start:'2026-07-01', end:'2026-12-31', contractType:'OT', mainDept:'시스템팀', customer:'SK하이닉스',  status:'최종계약완료' },
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
    contractType:'SI', mainDept:'NOVA PMO팀',
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
      { date:'2026-04-01 08:05', field:'수행PM',       before:'이강혁',        after:'한민석',      source:'ERP' },
      { date:'2026-03-15 10:22', field:'종료일',       before:'2026-12-31',    after:'2027-04-30',  source:'ERP' },
      { date:'2026-02-01 09:00', field:'계약형태',     before:'—',             after:'SI',          source:'ERP' },
      { date:'2026-01-20 08:00', field:'매출귀속조직', before:'—',             after:'NOVA PMO팀',  source:'ERP' },
    ],
    // IF 이력 개선안 데이터(선행 시스템 동기화 · 출처배지 기본정보 · 상세 변경로그)
    ifDetail:{
      asOf:'2026-08-19 09:40',
      sync:[
        { sys:'ERP', when:'2026-08-18 09:30', cnt:2, flag:'ok' },
        { sys:'SCM', when:'2026-08-17 14:12', cnt:2, flag:'ok' },
        { sys:'CRM', when:'2026-08-17 09:00', cnt:1, flag:'ok' },
        { sys:'PUR', when:'2026-08-16 06:00', cnt:2, flag:'지연 3일' },
      ],
      basic:[
        { k:'계약금액',     v:'1,920,000,000 원', sys:'ERP', changed:'1일 전 변경', num:true },
        { k:'투입 인원',    v:'14 명',            sys:'SCM', changed:'2일 전 변경', num:true },
        { k:'프로젝트 기간', v:'2026-05-01 ~ 2027-04-30', sys:'ERP', num:true },
        { k:'수행 PM',      v:'한민석',           sys:'SCM' },
        { k:'매출귀속조직', v:'NOVA PMO팀',       sys:'ERP' },
        { k:'프로젝트 유형', v:'원가-선투입',      sys:'ERP' },
        { k:'고객 담당자',  v:'박서준',           sys:'CRM', changed:'2일 전 변경' },
        { k:'외주 발주금액', v:'465,000,000 원',  sys:'PUR', changed:'3일 전 변경', num:true },
        { k:'주수행부서',   v:'NOVA PMO팀',       sys:'ETC' },
        { k:'계약형태',     v:'SI',               sys:'ERP' },
      ],
      log:[
        { date:'2026-08-18', rel:'어제',    time:'09:30', sys:'ERP', field:'계약금액',    before:'1,850,000,000', after:'1,920,000,000', delta:'+70,000,000', num:true },
        { date:'2026-08-17', rel:'2일 전',  time:'14:12', sys:'SCM', field:'투입 인원',   before:'12 명', after:'14 명', delta:'+2명', num:true },
        { date:'2026-08-17', rel:'2일 전',  time:'09:00', sys:'CRM', field:'고객 담당자', before:'김도현', after:'박서준', note:'고객사 조직개편 반영' },
        { date:'2026-08-16', rel:'3일 전',  time:'06:00', sys:'PUR', field:'외주 발주금액', before:'420,000,000', after:'465,000,000', delta:'+45,000,000', num:true, note:'이후 수신 없음 — 구매 IF 3일 지연' },
        { date:'2026-08-11', rel:'1주 전',  time:'10:40', sys:'SCM', field:'투입 인원',   before:'10 명', after:'12 명', delta:'+2명', num:true },
        { date:'2026-07-30', rel:'3주 전',  time:'17:05', sys:'ERP', field:'계약금액',    before:'1,800,000,000', after:'1,850,000,000', delta:'+50,000,000', num:true },
        { date:'2026-07-30', rel:'3주 전',  time:'06:00', sys:'PUR', field:'외주 발주금액', before:'미등록', after:'420,000,000', num:true },
        { date:'2026-06-15', rel:'2개월 전', time:'11:20', sys:'SCM', field:'투입 인원',   before:'미등록', after:'10 명', num:true },
        { date:'2026-04-15', rel:'4개월 전', time:'09:30', sys:'ERP', field:'프로젝트 상태', before:'착수', after:'수행중' },
        { date:'2026-04-01', rel:'4개월 전', time:'08:05', sys:'ERP', io:'out', field:'수행 PM',    before:'이강혁', after:'한민석', note:'MIS에서 수행PM 변경 → ERP 송신' },
        { date:'2026-03-15', rel:'5개월 전', time:'10:22', sys:'ERP', field:'종료일',      before:'2026-12-31', after:'2027-04-30', delta:'+4개월', num:true },
        { date:'2026-02-01', rel:'6개월 전', time:'09:00', sys:'ERP', field:'계약형태',    before:'—', after:'SI' },
      ],
    },
    // 현행 프로젝트 상세 기준 값 (영업정보 · 개발환경정보 · 시큐어 코딩 · 고객정보) · MIS 변경이력
    cur:{ cnrcCmpl:'Y', cnrcNo:'CT-2026-0412', bztp:'정보통신업', openDt:'2027-02-01', lastYn:'Y', lastDt:'2027-04-15',
      focYn:'Y', focMcnt:'12', ovseYn:'N', natn:'대한민국', cnstmYn:'N', mnbizrYn:'N', erpYn:'N', ltmCntnYn:'N', prioIvs:'',
      place:'SK C&C 판교 캠퍼스', undtake:'김태윤', wkg:'박서준',
      dev:{ tech:['CLOUD'], mthy:['SKPE'], dbms:['ORACLE'], frwk:['SPRING'], lang:['JAVA'], slut:['JDK'], tool:['VUE','ETC'] }, devEtc:{ tool:'Terraform' },
      secDgn:{ sast:'Y', dast:'N' } },
    misHistory:[
      { field:'프로젝트수행장소', before:'SK C&C 본사 (서울 중구)', after:'SK C&C 판교 캠퍼스', by:'한민석 (수행PM)', date:'2026-07-02 10:14' },
      { field:'오픈예정일',       before:'2027-01-15',             after:'2027-02-01',         by:'한민석 (수행PM)', date:'2026-06-20 16:40' },
      { field:'실무담당자',       before:'',                       after:'박서준',              by:'한민석 (수행PM)', date:'2026-05-08 09:05' },
    ],
  },
  'SI-002': {
    code:'30142102-D001', name:'2026년 ERP 유지보수 운영',
    start:'2026-03-01', end:'2026-12-31',
    pm:'이강혁', revOrg:'AX ERP사업부',
    projType:'OS-운영', stage:'착수',
    contractType:'OS', mainDept:'시스템팀',
    customer:'SK하이닉스', ifSource:'ERP', lastSync:'2026-03-02 08:10',
    cur:{ cnrcNo:'CT-2026-0207', erpYn:'Y', ltmCntnYn:'Y', ltmOsYn:'Y', place:'SK하이닉스 이천 캠퍼스', undtake:'정민호' },
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
    contractType:'SI', mainDept:'HR팀',
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
      { date:'2026-04-20 10:05', field:'계약형태',     before:'—',           after:'SI',          source:'ERP' },
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
// 행 "수정" = 그 프로젝트 상세를 수정 모드로 바로 연다 (상세 "수정"과 같은 화면)
function siEditRow(id, ev) { if (ev) ev.stopPropagation(); siSelectedId = id; siView = 'detail'; siEditStart(); }
function siDeleteRow(id, ev) {
  if (ev) ev.stopPropagation();
  const p = SI_PROJECTS[id]; if (!p) return;
  if (!confirm(`수주형 프로젝트 "${p.name}"을(를) 삭제하시겠습니까?`)) return;
  delete SI_PROJECTS[id];
  if (typeof showToast === 'function') showToast('수주형 프로젝트를 삭제했습니다.');
  renderSIList();
}
function renderSIList() {
  if (typeof projCrudStyleInject === 'function') projCrudStyleInject();
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
        <td class="pt-center" style="white-space:nowrap">
          ${siCanEdit(p) ? `<button class="row-act-btn" onclick="siEditRow('${id}', event)" title="수정">✏️ 수정</button>` : ''}
          <button class="row-act-btn del" onclick="siDeleteRow('${id}', event)" title="삭제">🗑 삭제</button>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="9" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">수주형 프로젝트</div>
        <div class="page-sub">CRM 연동 프로젝트 기본정보 등록 및 변경이력 조회</div>
      </div>
      <button class="save-btn" onclick="siView='register';renderSIProject()" style="margin-top:4px;font-size:14px;padding:6px 14px">+ IF 등록</button>
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
            <th class="pt-center">관리</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── IF 등록 뷰 ───────────────────────────
function renderSIRegister() {
  siRegResults  = [];
  siRegSelected = null;
  const el = document.getElementById('s-si-project');
  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="siView='list';renderSIList()">← 목록</button>
      <div>
        <div style="font-size:20px;font-weight:800;color:#1e293b">수주형 프로젝트 IF 등록</div>
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

// ── IF 이력 개선안: 선행 시스템 메타 ──
// dir: IF 방향(MIS 기준) — 'both' 송수신(송신 위주) · 'in' 수신 · 'out' 송신 · 'none' 없음
const SI_SYS = {
  ERP: { label:'ERP',      c:'#2563EB', cb:'#EBF1FE', dir:'both' },
  SCM: { label:'AI SCM',   c:'#7C3AED', cb:'#F2ECFE', dir:'in' },
  CRM: { label:'AI CRM',   c:'#C2410C', cb:'#FDF0E7', dir:'in' },
  PUR: { label:'구매',     c:'#0E7490', cb:'#E6F4F7', dir:'in' },
  ETC: { label:'수동입력', c:'#475569', cb:'#EEF1F4', dir:'none' },
};
function siSys(code) { return SI_SYS[code] || SI_SYS.ETC; }

// IF 방향 배지 메타
const SI_DIR = {
  both: { t:'송수신', arrow:'⇄', hint:'MIS ⇄ ERP · 송신 위주' },
  in:   { t:'수신',   arrow:'←', hint:'선행 시스템 → MIS 수신' },
  out:  { t:'송신',   arrow:'→', hint:'MIS → 선행 시스템 송신' },
};

// 이력 1건의 송수신 판정: 건별 io가 있으면 우선, 없으면 시스템 방향 기준
// (ERP는 송신 위주 → 송신, 수신 시스템은 수신)
function siIo(e) {
  if (e.io === 'in' || e.io === 'out') return e.io;
  return siSys(e.sys).dir === 'in' ? 'in' : 'out';
}
const SI_IO = { out:{ t:'송신', arrow:'→' }, in:{ t:'수신', arrow:'←' } };

// ifDetail이 없는 프로젝트는 기존 필드/ifHistory에서 개선안 데이터 구조를 파생한다.
function siBuildDetail(p) {
  if (p.ifDetail) return p.ifDetail;
  const map = { ERP:'ERP', SCM:'SCM', BIX:'CRM', CRM:'CRM', PUR:'PUR', '구매':'PUR' };
  const log = (p.ifHistory || []).map(h => {
    const parts = (h.date || '').split(' ');
    return { date: parts[0] || '', time: parts[1] || '', sys: map[h.source] || 'ETC', field: h.field, before: h.before, after: h.after };
  });
  const bySys = {};
  log.forEach(e => { (bySys[e.sys] = bySys[e.sys] || []).push(e); });
  const sync = Object.keys(bySys).map(sys => {
    const first = bySys[sys][0];
    return { sys, when: (first.date + (first.time ? ' ' + first.time : '')).trim(), cnt: bySys[sys].length, flag: 'ok' };
  });
  const basic = [
    { k:'프로젝트 기간', v:`${p.start} ~ ${p.end}`, sys:'ERP', num:true },
    { k:'수행 PM', v:p.pm, sys:'SCM' },
    { k:'매출귀속조직', v:p.revOrg, sys:'ERP' },
    { k:'프로젝트 유형', v:p.projType, sys:'ERP' },
    { k:'프로젝트 상태', v:p.tobeStatus || p.stage, sys:'ERP' },
    { k:'계약형태', v:p.contractType, sys:'ERP' },
    { k:'주수행부서', v:p.mainDept, sys:'ETC' },
    { k:'고객사', v:p.customer, sys:'ERP' },
  ];
  return { asOf: p.lastSync || '', sync, basic, log };
}

// TO-BE 진행 단계(착수완료 / 수행 / 종료) — 프로젝트 현황과 같은 상태(psvTobeOf) 기준
function siTobeStepper(st) {
  const order = { '착수완료':0, '수행':1, '수행(임시종료)':1, '종료':2 };
  const cur = order[st] == null ? 0 : order[st];
  const keys = ['착수완료', st === '수행(임시종료)' ? '수행(임시종료)' : '수행', '종료'];
  let html = '';
  keys.forEach((k, i) => {
    const done = i < cur || (i === 2 && cur === 2), now = i === cur && cur !== 2;
    html += `<div class="sifr-step${(done || now) ? ' active' : ''}"><div class="sifr-node ${done ? 'done' : (now ? 'now' : '')}">${done ? '✓' : (i + 1)}</div><small>${k}</small></div>`;
    if (i < 2) html += `<div class="sifr-bar${done ? ' done' : ''}"></div>`;
  });
  return html;
}

// 진행 3단계(착수/수행/종료) — stage 기준
function siStepper(stage) {
  const steps = [
    { key:'착수', done:['수행중','마감준비','종료완료'].includes(stage), now: stage === '착수' },
    { key:'수행', done:['마감준비','종료완료'].includes(stage), now: stage === '수행중' },
    { key:'종료', done: stage === '종료완료', now: stage === '마감준비' },
  ];
  let html = '';
  steps.forEach((s, i) => {
    const cls = s.done ? 'done' : (s.now ? 'now' : '');
    html += `<div class="sifr-step${(s.done || s.now) ? ' active' : ''}"><div class="sifr-node ${cls}">${s.done ? '✓' : (i + 1)}</div><small>${s.key}</small></div>`;
    if (i < 2) html += `<div class="sifr-bar${s.done ? ' done' : ''}"></div>`;
  });
  return html;
}

// 상세 대시보드/팝업이 현재 보고 있는 프로젝트 (수주형·제안 공용)
let siActiveProject = null;

// 프로젝트 상세 IF 대시보드 HTML — 수주형/제안 프로젝트가 공용으로 사용
// backOnclick: 목록으로 돌아가는 onclick 문자열 · extraMeta: 메타줄에 덧붙일 HTML(제안=원 수주 링크 등)
// backType · backKey: 프로젝트 현황 복귀 버튼 판단용 (유형명 · 데이터 키)
function siDetailHtml(p, backOnclick, extraMeta, backType, backKey) {
  // TO-BE 상태 (착수완료 / 수행 / 수행(임시종료) / 종료) — 현황과 같은 계산. 기본정보 "프로젝트상태" 칸도 이 값
  const tobe = (typeof psvTobeOf === 'function') ? psvTobeOf(backType, backKey) : null;
  p.tobeStatus = tobe ? tobe.status : p.stage;
  const d = siBuildDetail(p);
  const syncHtml = d.sync.map(s => {
    const m = siSys(s.sys), ok = s.flag === 'ok';
    const dir = SI_DIR[m.dir];
    const dirChip = dir ? `<span class="sifr-dir ${m.dir}" title="${dir.hint}"><b>${dir.arrow}</b>${dir.t}</span>` : '';
    const whenWord = m.dir === 'both' ? '최근 동기화' : (m.dir === 'out' ? '송신' : '수신');
    return `<div class="sifr-sync-item" style="--c:${m.c};--cb:${m.cb}" role="button" tabindex="0" onclick="siOpenSyncPopup('${s.sys}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();siOpenSyncPopup('${s.sys}')}">
      <div class="sifr-sync-top"><span class="sifr-sync-badges"><span class="sifr-sysbadge" style="--c:${m.c};--cb:${m.cb}"><i></i>${m.label}</span>${dirChip}</span><span class="sifr-flag ${ok?'ok':'warn'}">${ok?'정상':s.flag}</span></div>
      <div class="sifr-sync-when">${s.when} ${whenWord}</div>
      <div class="sifr-sync-cnt">최근 30일 변경 <b>${s.cnt}</b>건 <span class="sifr-sync-go">이력 보기 ›</span></div>
    </div>`;
  }).join('');

  // 수정 기능은 수주형 상세에만 (제안은 조회만)
  const editable = backType === '수주형';
  const canEdit = editable && siCanEdit(p);
  const editing = editable && siEdit && siEdit.key === backKey;

  // 제안 프로젝트(조회만): IF 대시보드 기본정보
  const basicHtml = d.basic.map(f => {
    const m = siSys(f.sys);
    return `<div class="sifr-field${f.changed?' changed':''}" style="--c:${m.c};--cb:${m.cb}">
      <div class="sifr-field-k">${f.k} <span class="sifr-src${f.sys==='ETC'?' manual':''}" style="--c:${m.c};--cb:${m.cb}">${m.label}</span>${f.changed?`<span class="sifr-new-tag">${f.changed}</span>`:''}</div>
      <div class="sifr-field-v${f.num?' num':''}">${f.v}</div>
    </div>`;
  }).join('');
  // 수주형: 현행 프로젝트 상세 기준 섹션 (기본정보 ~ 변경이력)
  const infoHtml = editable ? siCurHtml(p, editing, canEdit) : `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>기본정보</h2><div class="sifr-sub">값 옆 배지 = 데이터 출처 시스템 · 노란 배경 = 최근 변경</div></div>
      <div class="sifr-info">${basicHtml}</div>
    </div>`;
  const nameHtml = editing
    ? `<input class="sifr-input sifr-name-input" value="${siEsc(siEdit.draft.prjNm)}" placeholder="프로젝트명을 등록해주세요." oninput="siEdit.draft.prjNm=this.value">`
    : `<h1 class="sifr-h1">${p.name}</h1>`;

  return `<div class="sifr">
    <div class="sifr-head-row">
      <div>
        <div class="sifr-code">${p.code}</div>
        ${nameHtml}
        <div class="sifr-meta-line">
          <span class="sifr-pill"><i class="dot"></i>${p.tobeStatus}</span>
          <span>${p.customer} · ${p.revOrg}</span>
          <span class="sifr-sep">|</span>
          <span>${p.start} ~ ${p.end}</span>
          ${extraMeta || ''}
        </div>
      </div>
      <div class="sifr-head-btns">
        ${editing ? `
        <button class="sifr-btn" onclick="siEditCancel()">취소</button>
        <button class="sifr-btn sifr-btn-primary" onclick="siEditSave()">저장</button>` : `
        <button class="sifr-btn" onclick="${backOnclick}">← 목록</button>
        <button class="sifr-btn sifr-btn-primary" onclick="showProjectClose()">종료 처리 →</button>`}
      </div>
    </div>
    ${editing ? `<div class="sifr-edit-banner"><b>수정 중</b> 입력 칸이 있는 항목만 고칠 수 있습니다 (🔒 = 수정 불가). <span class="sifr-req">*</span> 필수 항목이 비어 있으면 저장되지 않습니다.</div>` : ''}

    <div class="sifr-card sifr-steps-card">
      <div class="sifr-steps">${siTobeStepper(p.tobeStatus)}</div>
      <div class="sifr-steps-note">착수완료 = 선행 시스템에서 자동 등록 후 첫 실행예산 승인 전 / 수행 = 첫 실행예산 승인완료(ERP Active) / 종료일 +30일이 지나면 수행(임시종료), +60일이 지나면 종료 조건을 확인해 자동종료됩니다.${tobe && tobe.next ? ' <b>다음 할 일: ' + tobe.next + '</b>' : ''}</div>
    </div>

    <div class="sifr-sec">
      <div class="sifr-sec-head"><h2>선행 시스템 동기화 상태</h2><div class="sifr-sub">기준 시각 ${d.asOf||'-'}</div></div>
      <div class="sifr-sync">${syncHtml}</div>
      <div class="sifr-note">IF는 <b>송수신 양방향</b>입니다 — <b class="sifr-dir-ink both">⇄ ERP</b>는 MIS가 보내는 <b>송신 위주</b>, <b class="sifr-dir-ink in">← AI SCM · AI CRM · 구매</b>는 MIS가 받는 <b>수신</b>입니다. 각 시스템의 마지막 교환 시각과 변경 건수로 어느 채널이 멈췄는지 판단하고, <b>카드를 클릭하면 해당 시스템의 IF 이력</b>을 팝업으로 봅니다.</div>
    </div>

    ${infoHtml}
  </div>`;
}

// ── 프로젝트 정보 조회 · 수정 (수주형) ──────────────────
// 항목 · 섹션 순서 · 계약형태별 표시 · 잠금 · 필수 · 변경이력은 현행 프로젝트 상세(ProjectDetail.vue)를 따른다.
// 계약형태: SI · OT · OS (수주형). 수정은 [수정] 버튼으로 들어가는 수정 모드에서만.
let siEdit = null;   // { key, draft, err }

// 개발환경정보 선택값 (현행 enum.properties DevelopmentEnvironment*)
const SI_DEV_ROWS = [
  { key:'tech', k:'적용DT기술', opts:[['AI','AI'],['BIG_DATA','Big Data'],['CLOUD','Cloud'],['BLK_CHN','BlockChain'],['ETC','기타']] },
  { key:'mthy', k:'방법론',     opts:[['RUP','RUP'],['SKPE','SKPE'],['UKEY','UKEY'],['CNAPS','CNAPS'],['ETC','기타']] },
  { key:'dbms', k:'DBMS',       opts:[['ORACLE','Oracle'],['VERTICA','Vertica'],['MYSQL','MySQL'],['MONGO','Mongo'],['ETC','기타']] },
  { key:'frwk', k:'Framework',  opts:[['DNET','.NET'],['SPRING','Spring'],['NEXCORE','NEXCORE'],['J2EE','J2EE'],['IBATIS','iBATIS'],['ERP','ERP'],['ETC','기타']] },
  { key:'lang', k:'Language',   opts:[['CSHARP','C#'],['JAVA','java'],['CPP','C++'],['ANDROID','Android'],['IOS','iOS'],['ETC','기타']] },
  { key:'slut', k:'Solution',   opts:[['JDK','JDK'],['HTML5','HTML5'],['VB','Visual Basic'],['VJ','Visual java'],['ETC','기타']] },
  { key:'tool', k:'Tool',       opts:[['FLEX','FLEX'],['MF','MF'],['VUE','Vue.js'],['JS','javascript'],['ETC','기타']] },
];

// edit: 수정 모드에서 입력 칸 · divs: 보이는 계약형태 · req: 저장 때 검사하는 계약형태 · star: * 표시만 · hist: 변경이력 구분명
const SI_CUR_FIELDS = [
  // 기본정보
  { key:'prid',     k:'프로젝트기간',     sec:'basic', sys:'ERP' },
  { key:'pm',       k:'수행PM',           sec:'basic', edit:true, type:'pick', pick:'member', hist:'수행PM' },
  { key:'revOrg',   k:'매출귀속조직',     sec:'basic', sys:'ERP' },
  { key:'projType', k:'프로젝트유형',     sec:'basic', sys:'ERP' },
  { key:'sts',      k:'프로젝트상태',     sec:'basic', sys:'ERP' },
  { key:'cnrcCmpl', k:'계약완료여부',     sec:'basic', sys:'CRM', type:'yn' },
  { key:'cnrcNo',   k:'계약번호',         sec:'basic', sys:'CRM' },
  { key:'div',      k:'계약형태',         sec:'basic', sys:'ERP' },
  { key:'mainDept', k:'주수행부서',       sec:'basic', edit:true, type:'pick', pick:'org', req:['OS'], hist:'주수행부서' },
  // 영업정보
  { key:'bztp',     k:'업종분류체계',     sec:'sales', sys:'CRM', divs:['SI','OT'] },
  { key:'openDt',   k:'오픈예정일',       sec:'sales', edit:true, type:'date', hist:'오픈예정일' },
  { key:'lastYn',   k:'최종인수여부',     sec:'sales', edit:true, type:'yn', star:true, divs:['SI','OT'], hist:'최종인수여부' },
  { key:'lastDt',   k:'최종인수예정일',   sec:'sales', edit:true, type:'date', star:true, dep:'lastYn', divs:['SI','OT'], hist:'최종인수예정일' },
  { key:'focYn',    k:'무상하자보증여부', sec:'sales', sys:'CRM', type:'yn', star:true, divs:['SI','OT'] },
  { key:'focMcnt',  k:'무상하자보증기간', sec:'sales', sys:'CRM', unit:'개월', star:true, divs:['SI','OT'] },
  { key:'ovseYn',   k:'해외프로젝트여부', sec:'sales', sys:'CRM', type:'yn', divs:['SI','OT'] },
  { key:'natn',     k:'수행국가',         sec:'sales', sys:'CRM', divs:['SI','OT'] },
  { key:'cnstmYn',  k:'컨소시엄여부',     sec:'sales', sys:'CRM', type:'yn', divs:['SI','OT'] },
  { key:'mnbizrYn', k:'주사업자여부',     sec:'sales', sys:'CRM', type:'yn', divs:['SI','OT'] },
  { key:'erpYn',    k:'ERP사업여부',      sec:'sales', edit:true, type:'yn', star:true, hist:'ERP사업여부' },
  { key:'ltmCntnYn',k:'장기연속사업여부', sec:'sales', sys:'CRM', type:'yn' },
  { key:'ltmOsYn',  k:'장기OS사업여부',   sec:'sales', edit:true, type:'yn', divs:['OS'], hist:'장기OS사업여부' },
  { key:'prioIvs',  k:'선투입프로젝트',   sec:'sales', edit:true, type:'pick', pick:'prio', hist:'선투입프로젝트' },
  { key:'place',    k:'프로젝트수행장소', sec:'sales', edit:true, type:'text', req:['SI','OT','OS'], hist:'프로젝트수행장소' },
  // 고객정보 (발주)
  { key:'cust',     k:'고객사',           sec:'cust', sys:'ERP' },
  { key:'undtake',  k:'인수책임자',       sec:'cust', edit:true, type:'text', star:true, hist:'인수책임자' },
  { key:'wkg',      k:'실무담당자',       sec:'cust', edit:true, type:'text', star:true, hist:'실무담당자' },
];
const SI_CUR_SECS = [
  { sec:'sales', h:'영업정보', sub:'계약형태(SI · OT / OS)에 따라 보이는 항목이 다름' },
  { sec:'cust',  h:'고객정보', sub:'(발주)' },
];
const SI_CUR_DEFAULT = { cnrcCmpl:'Y', cnrcNo:'', bztp:'', openDt:'', lastYn:'N', lastDt:'', focYn:'N', focMcnt:'0', ovseYn:'N', natn:'대한민국',
  cnstmYn:'N', mnbizrYn:'N', erpYn:'N', ltmCntnYn:'N', ltmOsYn:'N', prioIvs:'', place:'', undtake:'', wkg:'', secDgn:null };
// 검색 팝업 (현행: 사원 검색 · 조직 검색 · 선투입 프로젝트 검색)
const SI_PICK = {
  member: { t:'사원 검색',            list:['한민석','이강혁','윤도준','이봄','정하늘','최유진'] },
  org:    { t:'조직 검색',            list:['NOVA PMO팀','AX ERP사업부','HR사업부','보안팀','AI팀','인프라팀','시스템팀'] },
  prio:   { t:'선투입 프로젝트 검색', list:['P2026-0101 클라우드 전환 선투입','P2026-0233 ERP 고도화 선투입','P2026-0315 AI 플랫폼 선투입'] },
};
const SI_SEC_SYS = { label:'보안진단', c:'#B91C1C', cb:'#FDECEC' };

function siEsc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
// 목업: 로그인 사용자를 그 프로젝트 수행PM(또는 시스템관리자)으로 보고, 종료된 프로젝트만 막는다
function siCanEdit(p) { return p.stage !== '종료완료'; }
function siCur(p) {
  if (!p.cur) p.cur = {};
  Object.keys(SI_CUR_DEFAULT).forEach(k => { if (p.cur[k] === undefined) p.cur[k] = SI_CUR_DEFAULT[k]; });
  if (!p.cur.dev) p.cur.dev = {};
  if (!p.cur.devEtc) p.cur.devEtc = {};
  return p.cur;
}
// 프로젝트 공통 필드(목록에도 쓰는 값)는 p에서, 나머지는 p.cur에서 읽고 쓴다
const SI_CUR_ON_P = { prjNm:'name', pm:'pm', mainDept:'mainDept', revOrg:'revOrg', projType:'projType', sts:'tobeStatus', div:'contractType', cust:'customer' };
function siCurGet(p, key) {
  if (key === 'prid') return `${p.start} ~ ${p.end}`;
  if (SI_CUR_ON_P[key]) return p[SI_CUR_ON_P[key]] || '';
  return siCur(p)[key];
}
function siCurSet(p, key, v) { if (SI_CUR_ON_P[key]) p[SI_CUR_ON_P[key]] = v; else siCur(p)[key] = v; }
function siCurShown(f, div) { return !f.divs || f.divs.includes(div); }
function siCurReq(f, div) { return !!(f.req && f.req.includes(div)); }
function siCurText(f, v) {
  if (f.type === 'yn') return v === 'Y' ? '예' : '아니오';
  if (v === '' || v == null) return '<span class="sifr-empty">미입력</span>';
  return siEsc(v) + (f.unit ? ' ' + f.unit : '');
}

function siCurInput(f, v) {
  if (f.type === 'yn') return `<div class="sifr-yn">${['Y','N'].map(o => `<button type="button" class="${v===o?'on':''}" onclick="siEditSet('${f.key}','${o}')">${o==='Y'?'예':'아니오'}</button>`).join('')}</div>`;
  if (f.type === 'pick') return `<div class="sifr-pick"><input class="sifr-input" value="${siEsc(v)}" readonly placeholder="검색해서 선택"><button type="button" class="sifr-btn sifr-btn-sm" onclick="siPickOpen('${f.key}')">🔍 검색</button></div>`;
  const off = f.dep && siEdit.draft[f.dep] !== 'Y';
  return `<input class="sifr-input" type="${f.type==='date'?'date':'text'}" value="${siEsc(v)}"${off?' disabled':''} oninput="siEdit.draft['${f.key}']=this.value">`;
}

function siCurCell(p, f, editing) {
  const div = siCurGet(p, 'div');
  const m = f.edit ? siSys('ETC') : siSys(f.sys);
  const v = editing && f.edit ? siEdit.draft[f.key] : siCurGet(p, f.key);
  const star = siCurReq(f, div) || f.star;
  const err = editing && siEdit.err && siEdit.err[f.key];
  let body;
  if (editing && f.edit) body = siCurInput(f, v);
  else if (editing) body = `<div class="sifr-field-v locked">${siCurText(f, v)}<span class="sifr-lock">🔒 수정 불가</span></div>`;
  else body = `<div class="sifr-field-v">${siCurText(f, v)}</div>`;
  return `<div class="sifr-field${editing && f.edit ? ' editing' : ''}${err ? ' err' : ''}" style="--c:${m.c};--cb:${m.cb}">
      <div class="sifr-field-k">${f.k}${star ? ' <b class="sifr-req">*</b>' : ''} <span class="sifr-src${f.edit ? ' manual' : ''}" style="--c:${m.c};--cb:${m.cb}">${m.label}</span></div>
      ${body}${err ? '<div class="sifr-err">필수 항목입니다.</div>' : ''}
    </div>`;
}
function siCurGrid(p, sec, editing) {
  const div = siCurGet(p, 'div');
  return `<div class="sifr-info c3">${SI_CUR_FIELDS.filter(f => f.sec === sec && siCurShown(f, div)).map(f => siCurCell(p, f, editing)).join('')}</div>`;
}

function siDevHtml(p, editing) {
  const div = siCurGet(p, 'div');
  if (!['SI', 'OT'].includes(div)) return '';
  const cur = siCur(p);
  const dv = editing ? siEdit.draft.dev : cur.dev, de = editing ? siEdit.draft.devEtc : cur.devEtc;
  const rows = SI_DEV_ROWS.map(r => {
    const sel = dv[r.key] || [];
    const err = editing && siEdit.err && siEdit.err['dev:' + r.key];
    const body = editing
      ? `<div class="sifr-chk">${r.opts.map(([c, t]) => `<label><input type="checkbox"${sel.includes(c) ? ' checked' : ''} onchange="siDevToggle('${r.key}','${c}')"> ${t}</label>`).join('')}
           <input class="sifr-input sifr-dev-etc" placeholder="기타 적용기술을 작성해 주세요." value="${siEsc(de[r.key] || '')}"${sel.includes('ETC') ? '' : ' disabled'} oninput="siEdit.draft.devEtc['${r.key}']=this.value"></div>`
      : `<div class="sifr-chips">${sel.length ? sel.map(c => { const t = (r.opts.find(o => o[0] === c) || [c, c])[1]; return `<span class="sifr-chip">${c === 'ETC' ? '기타: ' + siEsc(de[r.key] || '') : t}</span>`; }).join('') : '<span class="sifr-empty">미입력</span>'}</div>`;
    return `<div class="sifr-dev-row${err ? ' err' : ''}"><div class="sifr-dev-k">${r.k} <b class="sifr-req">*</b></div><div class="sifr-dev-v">${body}${err ? '<div class="sifr-err">필수 항목입니다.</div>' : ''}</div></div>`;
  }).join('');
  return `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>개발환경정보</h2><div class="sifr-sub">(프로젝트 적용기술) · SI · OT만 · 줄마다 1개 이상, "기타"면 내용 필수</div></div>
      <div class="sifr-card sifr-dev">${rows}</div>
    </div>`;
}

function siSecDgnHtml(p, editing) {
  const s = siCur(p).secDgn;
  if (!s) return '';
  const cell = (k, v) => `<div class="sifr-field" style="--c:${SI_SEC_SYS.c};--cb:${SI_SEC_SYS.cb}">
      <div class="sifr-field-k">${k} <b class="sifr-req">*</b> <span class="sifr-src" style="--c:${SI_SEC_SYS.c};--cb:${SI_SEC_SYS.cb}">${SI_SEC_SYS.label}</span></div>
      <div class="sifr-field-v${editing ? ' locked' : ''}">${v === 'Y' ? '예' : '아니오'}${editing ? '<span class="sifr-lock">🔒 수정 불가</span>' : ''}</div>
    </div>`;
  return `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>시큐어 코딩 기준</h2><div class="sifr-sub">보안진단 대상 프로젝트만 · 조회만</div></div>
      <div class="sifr-info">${cell('정적 진단', s.sast)}${cell('동적진단 (모의해킹)', s.dast)}</div>
    </div>`;
}

function siHstHtml(p) {
  const list = p.misHistory || [];
  const rows = list.map((h, i) => `<tr><td class="c">${list.length - i}</td><td>${h.field}</td><td class="old">${siEsc(h.before)}</td><td class="new">${siEsc(h.after)}</td><td>${h.by}</td><td class="c num">${h.date}</td></tr>`).join('');
  return `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>변경이력</h2><div class="sifr-sub">(총 ${list.length}건) · MIS에서 저장할 때 바뀐 항목 · 선행 시스템 변경은 위 동기화 카드에서 확인</div></div>
      <div class="sifr-card sifr-hist">
        <table><thead><tr><th class="c">NO</th><th>구분</th><th>변경 전 내용</th><th>변경 후 내용</th><th>변경자</th><th class="c">변경일</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="sifr-modal-empty">변경이력이 없습니다.</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

// 기본정보 ~ 변경이력 (현행 화면 순서: 기본 → 영업정보 → 개발환경정보 → 시큐어 코딩 기준 → 고객정보 → 변경이력)
function siCurHtml(p, editing, canEdit) {
  const salesCust = sec => { const s = SI_CUR_SECS.find(x => x.sec === sec); return `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>${s.h}</h2><div class="sifr-sub">${s.sub}</div></div>
      ${siCurGrid(p, sec, editing)}
    </div>`; };
  return `<div class="sifr-sec">
      <div class="sifr-sec-head"><h2>기본정보</h2><div class="sifr-sec-tools"><div class="sifr-sub">값 옆 배지 = 데이터 출처 · <b class="sifr-req">*</b> 필수 · 수정 권한: 수행PM · 시스템관리자</div>${canEdit && !editing ? `<button class="sifr-btn sifr-btn-sm" onclick="siEditStart()">✏️ 수정</button>` : ''}</div></div>
      ${siCurGrid(p, 'basic', editing)}
    </div>
    ${salesCust('sales')}
    ${siDevHtml(p, editing)}
    ${siSecDgnHtml(p, editing)}
    ${salesCust('cust')}
    ${siHstHtml(p)}`;
}

function siEditStart() {
  const p = SI_PROJECTS[siSelectedId]; if (!p) return;
  const cur = siCur(p), draft = { prjNm: p.name, dev: {}, devEtc: Object.assign({}, cur.devEtc) };
  SI_CUR_FIELDS.filter(f => f.edit).forEach(f => { draft[f.key] = siCurGet(p, f.key); });
  SI_DEV_ROWS.forEach(r => { draft.dev[r.key] = (cur.dev[r.key] || []).slice(); });
  siEdit = { key: siSelectedId, draft, err: null };
  renderSIDetail();
}
function siEditSet(k, v) {
  siEdit.draft[k] = v;
  if (siEdit.err) delete siEdit.err[k];
  renderSIDetail();
}
function siDevToggle(key, c) {
  const arr = siEdit.draft.dev[key], i = arr.indexOf(c);
  if (i >= 0) { arr.splice(i, 1); if (c === 'ETC') siEdit.draft.devEtc[key] = ''; } else arr.push(c);
  if (siEdit.err) delete siEdit.err['dev:' + key];
  renderSIDetail();
}
function siPickOpen(key) {
  const f = SI_CUR_FIELDS.find(x => x.key === key), pk = SI_PICK[f.pick];
  let modal = document.getElementById('sifr-pick-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sifr-pick-modal';
    modal.className = 'sifr-modal-overlay';
    modal.onclick = e => { if (e.target === modal) siPickClose(); };
    document.body.appendChild(modal);
  }
  const items = pk.list.map(t => { const v = f.pick === 'prio' ? t.split(' ')[0] : t; return `<button type="button" class="sifr-pick-item" onclick="siPickClose();siEditSet('${key}','${v}')">${t}</button>`; }).join('');
  modal.innerHTML = `<div class="sifr sifr-modal sifr-pick-modal">
    <div class="sifr-modal-head"><div class="sifr-modal-title"><b>${pk.t}</b><span class="sifr-modal-cnt">${f.k}</span></div><button class="sifr-modal-x" onclick="siPickClose()" aria-label="닫기">✕</button></div>
    <div class="sifr-modal-body">${items}</div>
  </div>`;
  modal.classList.add('open');
}
function siPickClose() { const m = document.getElementById('sifr-pick-modal'); if (m) m.classList.remove('open'); }

// 바뀐 항목 [{ field, before, after, hist, apply }] — hist가 있는 항목만 변경이력에 남김 (현행과 같음)
function siEditChanges() {
  const p = SI_PROJECTS[siSelectedId], cur = siCur(p), dr = siEdit.draft, out = [];
  const yn = (f, v) => f.type === 'yn' ? (v === 'Y' ? 'Y' : 'N') : v;
  const nm = String(dr.prjNm || '').trim();
  if (nm !== p.name) out.push({ field:'프로젝트명', before:p.name, after:nm, hist:true, apply:() => { p.name = nm; } });
  SI_CUR_FIELDS.filter(f => f.edit).forEach(f => {
    const ov = String(siCurGet(p, f.key) || ''), nv = String(dr[f.key] || '').trim();
    if (nv !== ov) out.push({ field:f.hist, before:yn(f, ov), after:yn(f, nv), hist:!!f.hist, apply:() => siCurSet(p, f.key, nv) });
  });
  SI_DEV_ROWS.forEach(r => {
    const ov = (cur.dev[r.key] || []).join(','), nv = (dr.dev[r.key] || []).join(','), oe = cur.devEtc[r.key] || '', ne = String(dr.devEtc[r.key] || '').trim();
    if (ov !== nv || oe !== ne) out.push({ field:r.k, hist:false, apply:() => { cur.dev[r.key] = dr.dev[r.key].slice(); cur.devEtc[r.key] = ne; } });
  });
  return out;
}
function siEditCancel() {
  if (siEditChanges().length && !confirm('수정한 내용을 저장하지 않고 나가시겠습니까?')) return;
  siEdit = null;
  renderSIDetail();
}
// 저장 — 현행 validateSave와 같은 규칙: 계약형태별 필수 + 개발환경 7종(SI · OT). 걸리면 "필수 항목 확인해 주세요."
function siEditSave() {
  const p = SI_PROJECTS[siSelectedId], dr = siEdit.draft, div = siCurGet(p, 'div'), err = {};
  SI_CUR_FIELDS.filter(f => f.edit && siCurShown(f, div) && siCurReq(f, div)).forEach(f => { if (!String(dr[f.key] || '').trim()) err[f.key] = 1; });
  if (['SI', 'OT'].includes(div)) SI_DEV_ROWS.forEach(r => {
    const s = dr.dev[r.key] || [];
    if (!s.length || (s.includes('ETC') && !String(dr.devEtc[r.key] || '').trim())) err['dev:' + r.key] = 1;
  });
  if (Object.keys(err).length) { siEdit.err = err; renderSIDetail(); showToast('필수 항목 확인해 주세요.'); return; }
  const now = new Date(), z = n => String(n).padStart(2, '0');
  const stamp = now.getFullYear() + '-' + z(now.getMonth() + 1) + '-' + z(now.getDate()) + ' ' + z(now.getHours()) + ':' + z(now.getMinutes());
  const by = p.pm;
  p.misHistory = p.misHistory || [];
  siEditChanges().forEach(c => { c.apply(); if (c.hist) p.misHistory.unshift({ field: c.field, before: c.before, after: c.after, by, date: stamp }); });
  siEdit = null;
  renderSIDetail();
  showToast('수정했습니다.');
}

// Final override: 수주형 프로젝트 상세 — 공용 대시보드 사용
renderSIDetail = function() {
  const el = document.getElementById('s-si-project');
  const p = SI_PROJECTS[siSelectedId];
  if (!el || !p) return;
  siActiveProject = p;
  el.innerHTML = siDetailHtml(p, "closeSIDetail()", '', '수주형', siSelectedId);
};

// ── 파견법 준수 Guide 팝업 ──────────────────
// 현행(ProjectDetail · DispatchComplianceRequirementsPopup)처럼 상세를 열 때
// 수행PM이 아직 Guide를 확인하지 않았으면 자동으로 띄운다. 끝까지 스크롤해야 [확인] 가능.
const SI_GUIDE_RULES = [
  ['업무지시', '직접 지시', 'BP 인력에 대한 직접적인 업무지시 금지 — 현장대리인을 통해 요청', '긴급한 장애 등 급박한 상황에서만 개별 인력과 직접 소통 (근거자료 보존)'],
  ['', '현장대리인', 'BP사별 1명의 현장대리인 선임, 업무배분 · 근태 · 평가 권한은 현장대리인이 보유', '부득이하게 여러 명을 선임하면 합리적인 사유와 근거를 남김 (예: 업무단위(Module)별)'],
  ['', 'SNS 활용', '카톡 · 메일 · 메신저로 업무지시 금지, BP 인력이 포함된 단체 SNS방 개설 금지', 'PM과 현장대리인 1:1 대화방만 업무협조 수단으로 사용'],
  ['', '전산시스템', 'Jira · Confluence · ITSM 등에서 BP 작업내용 검토 · 결재 금지', '작업 결과물 검수는 가능 (사전에 정한 일정 또는 최종 결과물)'],
  ['', '업무매뉴얼', '작업방법 · 순서 · 배치에 관한 매뉴얼이나 작업지시서를 BP에게 제공 금지', '꼭 필요하면 BP가 자체적으로 매뉴얼을 작성 (당사는 최소한의 Guide만)'],
  ['', '업무회의', '작업방식 · 계획 논의를 위한 상시 회의 금지, "보고"라는 용어 사용 금지', '월 1~2회, 결과 공유 · 진행 점검 · 이슈 공유로 제한, 현장대리인만 참석'],
  ['인력운영', '인력 채용', 'BP가 자체적으로 진행, 관여 금지', '—'],
  ['', '인력 투입 · 배치', 'BP가 자체적으로 결정, 당사와 협의 · 보고 금지', '적정 인원을 제시하는 것은 가능 (BP가 결정한 근거를 남김)'],
  ['', '인력 교육', 'BP 인력 대상 교육 금지', '신규 장비 교육은 BP가 자료를 편집해 자체적으로 진행'],
  ['', '인력 변경', 'BP 인력 교체 · 해고 요구 금지', 'BP가 스스로 결정했다는 BP사 내부품의를 증빙으로 보존'],
  ['근무환경', '근무시간', 'BP가 근무시간 · 근무형태를 독자적으로 결정', '당사 시간에 맞춰야 하면 BP가 결정한 근거(내부 품의 등)를 구비'],
  ['', '근무장소', '당사 · BP 혼재근무 금지 — 독립된 업무공간 마련', '어려우면 업무 Zone 구분, 업체 표식 · 명패 부착 ("SK AX" 표식 금지)'],
  ['', '근태관리', '출퇴근 · 근무시간 관리, 휴가 승인, 연장 · 야간 · 휴일근로 강제 금지', 'BP가 자발적으로 출퇴근 내역을 공유하는 것만 가능'],
  ['기타', '안전사고', 'SHE 보고체계로 공유받는 것은 가능, 사고조사 · 원인 규명 · 재발방지는 BP와 협의해 마련', ''],
  ['', '조직도', '당사와 BP 인원이 함께 들어간 조직도 작성 금지', ''],
  ['', '1인 BP', '직접 소통 구조가 되므로 불가피한 경우가 아니면 지양', ''],
  ['', 'M/M 계약', '가급적 Turnkey(물량도급)로 체결, M/M(임률도급)은 점진적으로 축소', ''],
  ['', '재하도 계약', '제한적 허용 유지, 프리랜서는 최소화', ''],
  ['', '고객사', '고객사가 BP에게 직접 지시하면 "고객사 > 당사 > BP 현장대리인" 채널을 지키도록 요청', ''],
  ['', '용어 사용', '"인력 소싱" · "인력 교체" · "주간보고" · "업무보고" · "휴가 컨펌" 등 오해될 용어 사용 금지', ''],
];

function siGuideNeeded(p) { return siCanEdit(p) && !p.guideChk; }

function siOpenGuide() {
  const p = SI_PROJECTS[siSelectedId]; if (!p) return;
  let modal = document.getElementById('sifr-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sifr-guide-modal';
    modal.className = 'sifr-modal-overlay';
    document.body.appendChild(modal);
  }
  const groupSpan = {};
  SI_GUIDE_RULES.forEach((r, i) => { if (r[0]) { let n = 1; while (SI_GUIDE_RULES[i + n] && !SI_GUIDE_RULES[i + n][0]) n++; groupSpan[i] = n; } });
  const rules = SI_GUIDE_RULES.map((r, i) => `<tr${r[0] && i ? ' class="grp"' : ''}>
      ${r[0] ? `<td class="g" rowspan="${groupSpan[i]}">${r[0]}</td>` : ''}
      <td class="k">${r[1]}</td>
      ${r[3] === '' ? `<td colspan="2">${r[2]}</td>` : `<td>${r[2]}</td><td>${r[3]}</td>`}
    </tr>`).join('');
  modal.innerHTML = `<div class="sifr sifr-modal sifr-guide">
    <div class="sifr-modal-head">
      <div class="sifr-modal-title"><b>파견법 준수 Guide</b><span class="sifr-modal-cnt">${p.code} · 수행PM ${p.pm}</span></div>
      <button class="sifr-modal-x" onclick="siCloseGuide()" aria-label="닫기">✕</button>
    </div>
    <div class="sifr-guide-notice">이 프로젝트의 수행PM은 Guide를 <b>처음 한 번</b> 끝까지 읽고 [확인]해야 합니다. 확인 전에는 상세에 들어올 때마다 이 창이 다시 뜹니다.</div>
    <div class="sifr-guide-body" id="sifr-guide-body" onscroll="siGuideScroll(this)">
      <p>□ 본 Guide는 프로젝트 현장에서 BP와 협업할 때 불법파견 Issue가 생기지 않도록 하기 위한 참고용 매뉴얼입니다.</p>
      <p>□ 현장 여건상 원칙을 지키기 어려운 경우를 위해 예외 방안을 함께 적었습니다. 반드시 원칙을 먼저 지키고, 예외가 일반화되지 않도록 합니다.</p>
      <p>□ 지키기 어렵거나 고객사가 협조하지 않으면 유관부서(RM팀 / 상생협력기획팀 / LegalAI2팀 / ER팀)로 연락 주세요.</p>
      <h4>Ⅰ. 불법파견 판단 기준</h4>
      <p class="sub">계약의 이름 · 형식이 아니라 근로관계의 실질로 판단하며, 아래 5개 요소를 종합적으로 고려합니다.</p>
      <table class="sifr-guide-tbl"><thead><tr><th style="width:32%">판단기준</th><th>내용</th></tr></thead><tbody>
        <tr><td>① 업무상 상당한 지휘 · 명령</td><td>당사가 BP 인력의 업무수행(작업방법 · 순서 · 속도 등)에 구속력 있는 지시를 하는지</td></tr>
        <tr><td>② 원청 사업에의 실질적 편입</td><td>BP 인력이 당사 근로자와 섞여 일하거나 당사 조직의 일원처럼 편입되어 있는지</td></tr>
        <tr><td>③ 인사노무 결정 권한 행사</td><td>BP가 투입 인력의 채용 · 교육 · 휴가 · 근태 등을 스스로 결정하는지</td></tr>
        <tr><td>④ 업무의 구별 · 전문성</td><td>BP 업무가 당사 업무와 구별되고 전문성 · 기술성을 갖는지</td></tr>
        <tr><td>⑤ 독립적 조직 · 설비</td><td>BP가 독립적인 조직 · 설비 · 기술을 갖추고 경영상 독립성이 있는지</td></tr>
      </tbody></table>
      <h4>Ⅱ. 항목별 준수사항</h4>
      <table class="sifr-guide-tbl"><thead><tr><th colspan="2" style="width:22%">구분</th><th>원칙</th><th>예외</th></tr></thead><tbody>${rules}</tbody></table>
      <div class="sifr-guide-end">— Guide 끝 —</div>
    </div>
    <div class="sifr-guide-foot">
      <span class="sifr-guide-hint" id="sifr-guide-hint">↓ 끝까지 내려야 [확인]을 누를 수 있습니다</span>
      <button class="sifr-btn" onclick="siCloseGuide()">닫기</button>
      <button class="sifr-btn sifr-btn-primary is-off" id="sifr-guide-ok" onclick="siConfirmGuide()">확인</button>
    </div>
  </div>`;
  modal.classList.add('open');
}

function siGuideScroll(el) {
  if (el.scrollTop + el.clientHeight < el.scrollHeight - 5) return;
  const ok = document.getElementById('sifr-guide-ok'); if (ok) ok.classList.remove('is-off');
  const hint = document.getElementById('sifr-guide-hint'); if (hint) hint.textContent = '✓ 끝까지 확인했습니다';
}

function siConfirmGuide() {
  const ok = document.getElementById('sifr-guide-ok');
  if (ok && ok.classList.contains('is-off')) { showToast('가이드 내용을 끝까지 확인한 후 확인 버튼을 클릭할 수 있습니다.'); return; }
  const p = SI_PROJECTS[siSelectedId];
  if (p) p.guideChk = { by: p.pm, at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  siCloseGuide();
}

function siCloseGuide() {
  const m = document.getElementById('sifr-guide-modal');
  if (m) m.classList.remove('open');
}

// 상세를 열 때만 확인 (수정 · 저장으로 다시 그릴 때는 띄우지 않음)
const siOpenDetailBase = openSIDetail;
openSIDetail = function(id) {
  siOpenDetailBase(id);
  const p = SI_PROJECTS[id];
  if (p && siGuideNeeded(p)) siOpenGuide();
};

// ── 동기화 카드 클릭 → 해당 시스템 이력 팝업 ──
function siSyncPopupBody(items) {
  const miss = v => ['미등록','—','',null,undefined].includes(v);
  const byDate = [];
  items.forEach(e => { let g = byDate.find(x => x.date === e.date); if (!g) { g = { date:e.date, rel:e.rel||'', items:[] }; byDate.push(g); } g.items.push(e); });
  return byDate.map(g => {
    const rows = g.items.map(e => {
      const io = siIo(e), iom = SI_IO[io], m = siSys(e.sys);
      return `<div class="sifr-row" style="--c:${m.c};--cb:${m.cb}">
        <div class="sifr-time">${e.time||''}</div><div class="sifr-rail"><i></i></div>
        <div class="sifr-rbody">
          <div class="sifr-b1"><span class="sifr-io ${io}"><b>${iom.arrow}</b>${iom.t}</span><span class="sifr-fname">${e.field}</span>${e.delta?`<span class="sifr-delta">${e.delta}</span>`:''}</div>
          <div class="sifr-diff"><span class="sifr-old${e.num&&!miss(e.before)?' num':''}">${miss(e.before)?'미등록':e.before}</span><span class="sifr-arrow">→</span><span class="sifr-new${e.num?' num':''}">${e.after}</span></div>
          ${e.note?`<div class="sifr-actor">${e.note}</div>`:''}
        </div>
      </div>`;
    }).join('');
    return `<div class="sifr-day"><b>${g.date}</b><span>${g.rel?g.rel+' · ':''}${g.items.length}건</span></div>${rows}`;
  }).join('');
}
function siOpenSyncPopup(sys) {
  const p = siActiveProject || SI_PROJECTS[siSelectedId]; if (!p) return;
  const d = siBuildDetail(p);
  const m = siSys(sys), dir = SI_DIR[m.dir];
  const items = d.log.filter(e => e.sys === sys);
  const s = d.sync.find(x => x.sys === sys) || {};
  let modal = document.getElementById('sifr-sync-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sifr-sync-modal';
    modal.className = 'sifr-modal-overlay';
    modal.onclick = e => { if (e.target === modal) siCloseSyncPopup(); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="sifr sifr-modal">
    <div class="sifr-modal-head">
      <div class="sifr-modal-title"><span class="sifr-sysbadge" style="--c:${m.c};--cb:${m.cb}"><i></i>${m.label}</span>${dir?`<span class="sifr-dir ${m.dir}"><b>${dir.arrow}</b>${dir.t}</span>`:''}<b>IF 변경이력</b><span class="sifr-modal-cnt">${items.length}건</span></div>
      <button class="sifr-modal-x" onclick="siCloseSyncPopup()" aria-label="닫기">✕</button>
    </div>
    <div class="sifr-modal-sub">${s.when?`${s.when} ${m.dir==='both'?'최근 동기화':'수신'}`:''}${s.cnt!=null?` · 최근 30일 <b>${s.cnt}</b>건`:''}</div>
    <div class="sifr-modal-body">${items.length?siSyncPopupBody(items):'<div class="sifr-modal-empty">이 시스템의 변경이력이 없습니다.</div>'}</div>
  </div>`;
  modal.classList.add('open');
}
function siCloseSyncPopup() {
  const m = document.getElementById('sifr-sync-modal');
  if (m) m.classList.remove('open');
}
