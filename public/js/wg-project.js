// ════════════════════════════════════════
//  W/G 프로젝트
// ════════════════════════════════════════

// AI GUIDE: W/G 프로젝트 정보 화면입니다.
// - W/G 프로젝트 목록, 상세, 등록, 결재 상태를 목업으로 관리합니다.
// - 사내/투자 프로젝트와 유사하지만 W/G 프로젝트 전용 승인 흐름과 예산 항목을 보여줍니다.
// - AI 화면 가이드는 프로젝트 유형, 승인 상태, 예산 항목 입력 흐름을 중심으로 설명해야 합니다.

let wgView = 'list';
let wgSelectedId = 'WG-001';
let wgSearchQuery = '';
let wgStatusFilter = '';

const WG_STATUS_STYLE = {
  '승인완료': { bg:'#dbeafe', color:'#1d4ed8' },
  '검토중':   { bg:'#fef3c7', color:'#b45309' },
  '기안중':   { bg:'#fef3c7', color:'#b45309' },
  '반려':     { bg:'#fee2e2', color:'#991b1b' },
};

const WG_PROJECTS = {
  'WG-001': {
    code:'70007571-D022', name:'2026년_ES1운영030(SW)',
    salesDept:'AX ERP사업부 1팀', revDept:'AX ERP사업부 1팀',
    wgLeader:'장재호', pm:'류준서',
    start:'2026-05-01', end:'2027-04-30', status:'승인완료',
    version:'V1.0', versionDate:'2026-04-15',
    approval:[
      { role:'기안', type:'PM',               name:'류준서(21043)', date:'2026-04-15 09:17', status:'기안' },
      { role:'협조', type:'Account WG담당자', name:'장재호(15025)', date:'2026-04-15 09:39', status:'승인' },
      { role:'협조', type:'Account담장',      name:'오재민(13083)', date:'2026-04-15 09:41', status:'승인' },
      { role:'검토', type:'팀장',              name:'신성호(13016)', date:'2026-04-15 09:45', status:'승인' },
      { role:'승인', type:'담당원',            name:'권재준(60521)', date:'2026-04-15 14:02', status:'승인' },
    ],
    costs:{
      인건비:{ base:{mm:0,   amt:0},         prevA:{mm:0,   amt:0},         afterB:{mm:0,   amt:0} },
      외주비:{ base:{mm:0,   amt:0},         prevA:{mm:0,   amt:0},         afterB:{mm:0,   amt:0} },
      재료비:{ base:{mm:'-', amt:0},         prevA:{mm:'-', amt:0},         afterB:{mm:'-', amt:28599409} },
      경비:  { base:{mm:'-', amt:0},         prevA:{mm:'-', amt:0},         afterB:{mm:'-', amt:0} },
    },
    pnl:{
      매출액:    { base:0,    prevA:0,    afterB:0 },
      매출원가:  { base:0,    prevA:0,    afterB:0 },
      '매출마진':{ base:'0%', prevA:'0%', afterB:'0%', isPct:true },
    },
  },
  'WG-002': {
    code:'70008832-C015', name:'2026년_클라우드운영020(Infra)',
    salesDept:'클라우드사업부', revDept:'인프라운영팀',
    wgLeader:'임민재', pm:'김은지',
    start:'2026-03-01', end:'2027-02-28', status:'검토중',
    version:'V1.0', versionDate:'2026-02-20',
    approval:[
      { role:'기안', type:'PM',               name:'김은지(20823)', date:'2026-02-20 10:11', status:'기안' },
      { role:'협조', type:'Account WG담당자', name:'임민재(16081)', date:'2026-02-20 14:22', status:'승인' },
      { role:'협조', type:'Account담장',      name:'석호준(14057)', date:'',                 status:'대기' },
      { role:'검토', type:'팀장',              name:'전재민(13036)', date:'',                 status:'대기' },
      { role:'승인', type:'담당원',            name:'엄준호(60922)', date:'',                 status:'대기' },
    ],
    costs:{
      인건비:{ base:{mm:12,  amt:180000000}, prevA:{mm:12,  amt:180000000}, afterB:{mm:12,  amt:180000000} },
      외주비:{ base:{mm:0,   amt:45000000},  prevA:{mm:0,   amt:45000000},  afterB:{mm:0,   amt:52000000} },
      재료비:{ base:{mm:'-', amt:0},         prevA:{mm:'-', amt:0},         afterB:{mm:'-', amt:0} },
      경비:  { base:{mm:'-', amt:3200000},   prevA:{mm:'-', amt:3200000},   afterB:{mm:'-', amt:3800000} },
    },
    pnl:{
      매출액:    { base:320000000,  prevA:320000000,  afterB:340000000 },
      매출원가:  { base:228200000,  prevA:228200000,  afterB:235800000 },
      '매출마진':{ base:'28.7%', prevA:'28.7%', afterB:'30.6%', isPct:true },
    },
  },
  'WG-003': {
    code:'70009143-A007', name:'2026년_ERP운영015(APP)',
    salesDept:'ERP사업부', revDept:'시스템팀',
    wgLeader:'황성준', pm:'이강혁',
    start:'2026-04-01', end:'2027-03-31', status:'기안중',
    version:'V1.0', versionDate:'2026-03-28',
    approval:[
      { role:'기안', type:'PM',               name:'이강혁(21203)', date:'2026-03-28 09:05', status:'기안' },
      { role:'협조', type:'Account WG담당자', name:'황성준(17042)', date:'',                 status:'대기' },
      { role:'협조', type:'Account담장',      name:'배재현(15008)', date:'',                 status:'대기' },
      { role:'검토', type:'팀장',              name:'나성준(13512)', date:'',                 status:'대기' },
      { role:'승인', type:'담당원',            name:'주재혁(60299)', date:'',                 status:'대기' },
    ],
    costs:{
      인건비:{ base:{mm:8,   amt:120000000}, prevA:{mm:8,   amt:120000000}, afterB:{mm:8,   amt:120000000} },
      외주비:{ base:{mm:0,   amt:28000000},  prevA:{mm:0,   amt:28000000},  afterB:{mm:0,   amt:28000000} },
      재료비:{ base:{mm:'-', amt:0},         prevA:{mm:'-', amt:0},         afterB:{mm:'-', amt:0} },
      경비:  { base:{mm:'-', amt:1500000},   prevA:{mm:'-', amt:1500000},   afterB:{mm:'-', amt:1500000} },
    },
    pnl:{
      매출액:    { base:190000000,  prevA:190000000,  afterB:190000000 },
      매출원가:  { base:149500000,  prevA:149500000,  afterB:149500000 },
      '매출마진':{ base:'21.3%', prevA:'21.3%', afterB:'21.3%', isPct:true },
    },
  },
};

// ── 진입점 ──
function renderWGProject() {
  if (wgView === 'list')     renderWGList();
  else if (wgView === 'register') renderWGRegister();
  else renderWGDetail();
}

// ── 목록 뷰 ──
function renderWGList() {
  const el = document.getElementById('s-wg-project');
  const q  = wgSearchQuery.toLowerCase();

  const filtered = Object.entries(WG_PROJECTS).filter(([, p]) => {
    const matchQ = !q || [p.name, p.code, p.pm, p.wgLeader, p.salesDept, p.revDept]
      .some(v => v && v.toLowerCase().includes(q));
    const matchS = !wgStatusFilter || p.status === wgStatusFilter;
    return matchQ && matchS;
  });

  const allStatuses = [...new Set(Object.values(WG_PROJECTS).map(p => p.status))];
  const statusOpts = ['', ...allStatuses].map(s =>
    `<option value="${s}" ${s===wgStatusFilter?'selected':''}>${s||'전체 상태'}</option>`
  ).join('');

  const rows = filtered.length ? filtered.map(([id, p]) => {
    const st   = WG_STATUS_STYLE[p.status] || WG_STATUS_STYLE['기안중'];
    const done  = p.approval.filter(a => a.status === '승인' || a.status === '기안').length;
    const total = p.approval.length;
    const pct   = Math.round(done / total * 100);
    const barColor = pct === 100 ? '#22c55e' : '#3b82f6';
    return `
      <tr onclick="openWGDetail('${id}')">
        <td class="pt-code">${p.code}</td>
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${p.salesDept}</div>
        </td>
        <td>${p.pm}</td>
        <td>${p.wgLeader}</td>
        <td>${p.revDept}</td>
        <td style="white-space:nowrap;font-size:12px">${p.start}<br><span style="color:#94a3b8">~ ${p.end}</span></td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${st.bg};color:${st.color}">${p.status}</span>
        </td>
        <td style="min-width:80px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:#64748b;white-space:nowrap">${done}/${total}</span>
          </div>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="8" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">W/G 프로젝트</div>
        <div class="page-sub">운영 W/G 등록 및 비용·손익 현황 조회</div>
      </div>
      <button class="save-btn" onclick="wgView='register';renderWGRegister()" style="margin-top:4px;font-size:12px;padding:6px 14px">+ 프로젝트 등록</button>
    </div>

    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM, W/G리더, 영업부서 검색…"
          value="${wgSearchQuery}"
          oninput="wgSearchQuery=this.value;renderWGList()">
      </div>
      <select class="proj-filter-select" onchange="wgStatusFilter=this.value;renderWGList()">${statusOpts}</select>
      <span class="proj-count-tag">총 <strong>${filtered.length}</strong>건</span>
    </div>

    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트코드</th>
            <th>프로젝트명 / 영업부서</th>
            <th>수행 PM</th>
            <th>W/G 리더</th>
            <th>매출관계부서</th>
            <th>기간</th>
            <th class="pt-center">상태</th>
            <th>결재 진행</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── 상세 뷰 ──
function openWGDetail(id) {
  wgSelectedId = id;
  wgView = 'detail';
  renderWGDetail();
}

function closeWGDetail() {
  wgView = 'list';
  renderWGList();
}

function renderWGDetail() {
  const el = document.getElementById('s-wg-project');
  const p = WG_PROJECTS[wgSelectedId];
  const st = WG_STATUS_STYLE[p.status] || WG_STATUS_STYLE['기안중'];
  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="closeWGDetail()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:2px">${p.code}</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b">${p.name}</div>
      </div>
      <span class="ipc-status-badge" style="background:${st.bg};color:${st.color};font-size:13px;padding:6px 14px">${p.status}</span>
    </div>

    <!-- 버전 바 -->
    <div class="wg-version-bar">
      <span class="wg-version-chip active">${p.version} &nbsp; ${p.versionDate} &nbsp;
        <span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:99px;font-size:11px">${p.status}</span>
      </span>
    </div>

    <!-- 기본정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">기본정보</span></div>
      <div class="wg-basic-grid">
        ${[['영업부서',p.salesDept],['매출관계부서',p.revDept],['W/G 리더',p.wgLeader],['수행 PM',p.pm],['프로젝트 시작일',p.start],['프로젝트 종료일',p.end]]
          .map(([k,v])=>`<div class="wg-basic-item"><div class="wg-basic-key">${k}</div><div class="wg-basic-val">${v}</div></div>`).join('')}
      </div>
    </div>

    <!-- 결재정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">결재정보</span></div>
      <div style="padding:16px 20px">${buildWGApproval(p.approval)}</div>
    </div>

    <!-- W/G 비용정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">W/G 비용정보</span></div>
      <div style="padding:0 20px 20px;overflow-x:auto">${buildWGCostTable(p.costs)}</div>
    </div>

    <!-- W/G 손익정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">W/G 손익정보</span></div>
      <div style="padding:0 20px 20px;overflow-x:auto">${buildWGPnlTable(p.pnl)}</div>
    </div>

    ${p.status === '기안중' ? `
    <div class="reg-erp-bar">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⏳</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#166534">결재 진행 중</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">승인이 완료되면 ERP IF를 통해 프로젝트가 자동 생성됩니다.</div>
        </div>
      </div>
      <button class="save-btn" onclick="approveWGProject('${wgSelectedId}')">✅ 승인 처리</button>
    </div>` : p.status === '승인완료' ? `
    <div class="reg-erp-bar reg-erp-done" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">✅</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#1d4ed8">ERP 등록 완료</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">승인 완료 후 ERP IF를 통해 프로젝트가 생성되었습니다.</div>
        </div>
      </div>
    </div>` : ''}`;
}

function buildWGApproval(approval) {
  const statusStyle = {
    '기안': { bg:'#e0f2fe', color:'#0369a1', label:'기안' },
    '승인': { bg:'#dcfce7', color:'#166534', label:'승인' },
    '대기': { bg:'#f1f5f9', color:'#94a3b8', label:'대기' },
    '반려': { bg:'#fee2e2', color:'#991b1b', label:'반려' },
  };
  const boxes = approval.map(a => {
    const s = statusStyle[a.status] || statusStyle['대기'];
    return `
      <div class="apv-doc-box">
        <div class="apv-doc-role">${a.role}</div>
        <div class="apv-doc-title" style="font-size:11px;color:#94a3b8;margin-bottom:6px">${a.type}</div>
        <div class="apv-doc-name">${a.name}</div>
        <div class="apv-doc-status" style="background:${s.bg};color:${s.color};margin:6px auto 4px">${s.label}</div>
        <div class="apv-doc-date">${a.date || '—'}</div>
      </div>`;
  }).join('');
  return `<div class="apv-doc-boxes">${boxes}</div>`;
}

function buildWGCostTable(costs) {
  const rows = Object.keys(costs);
  const calcDiff = (b, a) => typeof b === 'number' && typeof a === 'number' ? b - a : '-';

  const bodyRows = rows.map(r => {
    const c = costs[r];
    const diffMm  = calcDiff(c.afterB.mm,  c.prevA.mm);
    const diffAmt = calcDiff(c.afterB.amt, c.prevA.amt);
    const diffColor = typeof diffAmt === 'number' && diffAmt > 0 ? '#ef4444' : diffAmt < 0 ? '#22c55e' : '#1e293b';
    return `<tr>
      <td class="wg-tbl-label">${r}</td>
      <td class="wg-tbl-num">${c.base.mm}</td>  <td class="wg-tbl-num">${typeof c.base.amt==='number'&&c.base.amt?fmt(c.base.amt):c.base.amt||0}</td>
      <td class="wg-tbl-num">${c.prevA.mm}</td> <td class="wg-tbl-num">${typeof c.prevA.amt==='number'&&c.prevA.amt?fmt(c.prevA.amt):c.prevA.amt||0}</td>
      <td class="wg-tbl-num wg-tbl-cur">${c.afterB.mm}</td> <td class="wg-tbl-num wg-tbl-cur">${typeof c.afterB.amt==='number'&&c.afterB.amt?fmt(c.afterB.amt):c.afterB.amt||0}</td>
      <td class="wg-tbl-num" style="color:${diffColor}">${typeof diffMm==='number'&&diffMm?diffMm:diffMm}</td>
      <td class="wg-tbl-num" style="color:${diffColor}">${typeof diffAmt==='number'&&diffAmt?fmt(Math.abs(diffAmt))+(diffAmt>0?'▲':'▼'):0}</td>
    </tr>`;
  }).join('');

  const totals = ['base','prevA','afterB'].map(k =>
    rows.reduce((s,r)=>s+(typeof costs[r][k].amt==='number'?costs[r][k].amt:0),0)
  );
  const diffTotalAmt = totals[2] - totals[1];
  const diffTotalColor = diffTotalAmt > 0 ? '#ef4444' : diffTotalAmt < 0 ? '#22c55e' : '#1e293b';

  return `
    <table class="wg-cost-table">
      <thead>
        <tr>
          <th rowspan="2" class="wg-th-label">구분</th>
          <th colspan="2">최초</th>
          <th colspan="2">변경전(A)</th>
          <th colspan="2" class="wg-th-cur">변경후(B)</th>
          <th colspan="2">증감(B-A)</th>
        </tr>
        <tr>
          <th>M/M</th><th>금액</th>
          <th>M/M</th><th>금액</th>
          <th class="wg-th-cur">M/M</th><th class="wg-th-cur">금액</th>
          <th>M/M</th><th>금액</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr class="wg-tbl-total">
          <td class="wg-tbl-label">합계</td>
          <td class="wg-tbl-num">—</td><td class="wg-tbl-num">${fmt(totals[0])}</td>
          <td class="wg-tbl-num">—</td><td class="wg-tbl-num">${fmt(totals[1])}</td>
          <td class="wg-tbl-num wg-tbl-cur">—</td><td class="wg-tbl-num wg-tbl-cur">${fmt(totals[2])}</td>
          <td class="wg-tbl-num">—</td>
          <td class="wg-tbl-num" style="color:${diffTotalColor}">${diffTotalAmt?fmt(Math.abs(diffTotalAmt))+(diffTotalAmt>0?'▲':'▼'):0}</td>
        </tr>
      </tbody>
    </table>`;
}

function buildWGPnlTable(pnl) {
  const rows = Object.keys(pnl).map(k => {
    const r = pnl[k];
    const diff = r.isPct ? '—' : r.afterB - r.prevA;
    const diffColor = typeof diff === 'number' && diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#1e293b';
    const fmtV = (v, isPct) => isPct ? v : (v ? fmt(v) : 0);
    return `<tr>
      <td class="wg-tbl-label">${k}</td>
      <td class="wg-tbl-num">${fmtV(r.base, r.isPct)}</td>
      <td class="wg-tbl-num">${fmtV(r.prevA, r.isPct)}</td>
      <td class="wg-tbl-num wg-tbl-cur">${fmtV(r.afterB, r.isPct)}</td>
      <td class="wg-tbl-num" style="color:${diffColor}">${typeof diff==='number'&&diff?fmt(Math.abs(diff))+(diff>0?'▲':'▼'):r.isPct?'—':0}</td>
    </tr>`;
  }).join('');

  return `
    <table class="wg-cost-table" style="min-width:500px">
      <thead>
        <tr>
          <th class="wg-th-label">구분</th>
          <th>최초</th>
          <th>변경전(A)</th>
          <th class="wg-th-cur">변경후(B)</th>
          <th>증감(B-A)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ════════════════════════════════════════
//  W/G 프로젝트 등록 폼
// ════════════════════════════════════════
function renderWGRegister() {
  const el = document.getElementById('s-wg-project');
  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="wgView='list';renderWGList()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:800;color:#1e293b">W/G 프로젝트 등록</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">결재 상신 후 ERP IF를 통해 프로젝트가 생성됩니다.</div>
      </div>
    </div>

    <!-- 기본정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">기본정보</span></div>
      <div class="reg-fields-grid" style="padding:20px">
        <div class="reg-field-group">
          <label class="reg-label">프로젝트명 <span class="reg-required">*</span></label>
          <input class="reg-input" id="wg-reg-name" placeholder="예) 2026년_ES1운영030(SW)">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">수행 PM <span class="reg-required">*</span></label>
          <input class="reg-input" id="wg-reg-pm" placeholder="PM 이름">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">영업부서 <span class="reg-required">*</span></label>
          <input class="reg-input" id="wg-reg-sales" placeholder="영업부서명">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">매출관계부서</label>
          <input class="reg-input" id="wg-reg-rev" placeholder="미입력 시 영업부서와 동일">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">W/G 리더</label>
          <input class="reg-input" id="wg-reg-leader" placeholder="W/G 리더 이름">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">프로젝트 기간 <span class="reg-required">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="date" class="reg-input" id="wg-reg-start" style="flex:1">
            <span style="color:#94a3b8">~</span>
            <input type="date" class="reg-input" id="wg-reg-end" style="flex:1">
          </div>
        </div>
      </div>
    </div>

    <!-- 비용정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">비용정보 (최초)</span><span class="card-badge">단위: 원</span></div>
      <div style="padding:16px 20px;overflow-x:auto">
        <table class="wg-cost-table" style="min-width:380px">
          <thead>
            <tr><th class="wg-th-label">구분</th><th style="min-width:80px">M/M</th><th style="min-width:160px">금액 (원)</th></tr>
          </thead>
          <tbody>
            ${['인건비','외주비','재료비','경비'].map(c => `
            <tr>
              <td class="wg-tbl-label">${c}</td>
              <td style="padding:6px 10px">
                ${(c==='재료비'||c==='경비')
                  ? `<span style="color:#94a3b8">—</span>`
                  : `<input class="reg-input reg-input-sm" id="wg-reg-mm-${c}" type="number" min="0" step="0.5" placeholder="0" style="width:72px;text-align:right">`}
              </td>
              <td style="padding:6px 10px">
                <input class="reg-input reg-input-sm" id="wg-reg-amt-${c}" type="number" min="0" placeholder="0" style="width:160px;text-align:right">
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 손익정보 -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-head"><span class="card-title">손익정보</span><span class="card-badge">단위: 원</span></div>
      <div class="reg-fields-grid" style="padding:20px">
        <div class="reg-field-group">
          <label class="reg-label">매출액</label>
          <input class="reg-input" id="wg-reg-revenue" type="number" min="0" placeholder="0">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">매출원가</label>
          <input class="reg-input" id="wg-reg-cogs" type="number" min="0" placeholder="0">
        </div>
      </div>
    </div>

    <div class="reg-footer-bar">
      <button class="reset-btn" onclick="wgView='list';renderWGList()">취소</button>
      <button class="save-btn" onclick="submitWGDraft()">📨 결재 상신</button>
    </div>`;
}

function submitWGDraft() {
  const name  = document.getElementById('wg-reg-name').value.trim();
  const pm    = document.getElementById('wg-reg-pm').value.trim();
  const sales = document.getElementById('wg-reg-sales').value.trim();
  const start = document.getElementById('wg-reg-start').value;
  const end   = document.getElementById('wg-reg-end').value;
  if (!name || !pm || !sales || !start || !end) {
    showToast('필수 항목(*)을 모두 입력해주세요.'); return;
  }
  const rev    = document.getElementById('wg-reg-rev').value.trim()    || sales;
  const leader = document.getElementById('wg-reg-leader').value.trim() || '(미지정)';
  const revenue = Number(document.getElementById('wg-reg-revenue').value) || 0;
  const cogs    = Number(document.getElementById('wg-reg-cogs').value)    || 0;
  const margin  = revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(1) + '%' : '0%';

  const costs = {};
  ['인건비','외주비','재료비','경비'].forEach(c => {
    const mmEl = document.getElementById(`wg-reg-mm-${c}`);
    const mm   = mmEl ? (Number(mmEl.value) || 0) : '-';
    const amt  = Number(document.getElementById(`wg-reg-amt-${c}`).value) || 0;
    costs[c] = { base:{mm,amt}, prevA:{mm,amt}, afterB:{mm,amt} };
  });

  const idx   = Object.keys(WG_PROJECTS).length + 1;
  const newId = `WG-${String(idx).padStart(3,'0')}`;
  const code  = `7000${9000+idx}-X${String(idx).padStart(3,'0')}`;
  const today = new Date().toISOString().slice(0,10);
  const now   = today + ' ' + new Date().toTimeString().slice(0,5);

  WG_PROJECTS[newId] = {
    code, name, salesDept:sales, revDept:rev, wgLeader:leader, pm,
    start, end, status:'기안중',
    version:'V1.0', versionDate:today,
    approval:[
      { role:'기안', type:'PM',               name:pm,      date:now, status:'기안' },
      { role:'협조', type:'Account WG담당자', name:leader,  date:'',  status:'대기' },
      { role:'협조', type:'Account담장',      name:'(담당자)', date:'', status:'대기' },
      { role:'검토', type:'팀장',              name:'(팀장)', date:'',  status:'대기' },
      { role:'승인', type:'담당원',            name:'(담당원)', date:'', status:'대기' },
    ],
    costs,
    pnl:{
      매출액:    { base:revenue, prevA:revenue, afterB:revenue },
      매출원가:  { base:cogs,    prevA:cogs,    afterB:cogs    },
      '매출마진':{ base:margin,  prevA:margin,  afterB:margin, isPct:true },
    },
  };

  wgSelectedId = newId;
  wgView = 'detail';
  renderWGDetail();
  showToast('결재가 상신되었습니다. 승인 완료 후 ERP에 등록됩니다.');
}

function approveWGProject(id) {
  const p = WG_PROJECTS[id];
  if (!p) return;
  const now = new Date().toISOString().slice(0,10) + ' ' + new Date().toTimeString().slice(0,5);
  p.status = '승인완료';
  p.approval.forEach(a => { if (a.status === '대기') { a.status = '승인'; a.date = now; } });
  renderWGDetail();
  showToast('✅ 승인 완료 · ERP IF를 통해 프로젝트가 등록되었습니다.');
}
