// ════════════════════════════════════════
//  프로젝트 현황 — 전 유형 통합 조회            작성: 수진
// ════════════════════════════════════════
//
// AI GUIDE: 프로젝트 현황 화면입니다.
// - 수주형·제안·W/G·사내·투자·선투입 6개 유형의 프로젝트를 한 목록에서 통합 조회합니다.
// - 유형·상태·들어온 곳별 검색/필터를 제공하고, [상세]를 누르면 해당 유형의 상세 화면으로 이동합니다.
// - TO-BE(PM 답변 11.05): 모든 프로젝트는 선행 단계가 끝나면 I/F로 자동 등록됩니다(수기 등록 없음).
//     수주형 = CRM 계약 / 제안 = 사업기회 / 사내 일부·투자·선투입 = 플랫폼 / W/G·사내 MIS 유형 = 개설 관리 승인완료
// - 상태는 착수완료 → 수행 → 수행(임시종료) → 종료 4가지로 통일합니다.
//     착수완료 : 자동 등록된 상태. 첫 실행예산 승인 전(ERP 예산 I/F 전)
//     수행     : 첫 실행예산 승인완료(ERP I/F 완료, ERP 상태 Active)
//     수행(임시종료) : 종료일 +30일 경과. ERP에는 종료를 보내지 않음(현행 ProjectList.vue:612-629 와 같은 기준)
//     종료     : 수동 종료 또는 종료일 +60일 자동종료(ERP 종료 전송)
// - W/G·사내 개설 신청 중(기안중/검토중/반려)인 건은 아직 프로젝트가 아니므로 현황에 나오지 않습니다(개설 관리에서만 보임).
// - 데이터는 각 유형 전용 파일의 전역 상수를 읽고, TO-BE 상태/세부 유형/들어온 곳은 PSV_TOBE 로 덮어씁니다.
// - 유형별 상세 화면은 psvTobeOf / psvStatusBadge / psvRegisteredBar 로 같은 TO-BE 상태를 보여줍니다.

let psvCodeQ = '';        // 프로젝트 번호
let psvNameQ = '';        // 프로젝트 명
let psvCustomerQ = '';    // 고객사
let psvOrgQ = '';         // 매출귀속조직/신청부서
let psvPmQ = '';          // 수행PM
let psvTypeFilter = '';   // '' | 수주형 | 제안 | W/G | 사내 | 투자 | 선투입
let psvStatusFilter = ''; // '' | 착수완료 | 수행 | 수행(임시종료) | 종료
let psvPathFilter = '';   // '' | CRM 계약 | 사업기회 | 플랫폼 | 개설 관리 (들어온 곳)

// 목업 기준일 (임시종료 / 자동종료 계산용)
const PSV_TODAY = '2026-11-05';

// 유형 메타 — 데이터 상수 · 상세 진입 함수 · 들어온 곳(기본값) · 색상
const PSV_TYPES = [
  { type:'수주형', data:'SI_PROJECTS',         show:'showSIProject',         detail:'openSIDetail',       from:'CRM 계약',  color:'#1d4ed8' },
  { type:'제안',   data:'PROPOSAL_PROJECTS',   show:'showProposalProject',   detail:'openProposalDetail', from:'사업기회',   color:'#7c3aed' },
  { type:'W/G',   data:'WG_PROJECTS',         show:'showWGProject',         detail:'openWGDetail',       from:'개설 관리',  color:'#b45309' },
  { type:'사내',   data:'INTERNAL_PROJECTS',   show:'showInternalProject',   detail:'openIPDetail',       from:'개설 관리',  color:'#be185d' },
  { type:'투자',   data:'INVESTMENT_PROJECTS', show:'showInvestmentProject', detail:'openInvDetail',      from:'플랫폼',     color:'#0891b2' },
  { type:'선투입', data:'ADVANCE_PROJECTS',    show:'showAdvanceProject',    detail:'openAdvDetail',      from:'플랫폼',     color:'#0d9488' },
];
const PSV_FROM_LIST = ['CRM 계약', '사업기회', '플랫폼', '개설 관리'];

// 검색 필드용 돋보기 아이콘
const PSV_SEARCH_ICON = '<svg class="psv-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

// TO-BE 덮어쓰기 ('유형:키') — 세부 유형 / 들어온 곳 / 상태 / 종료일 / 번호
// (사내·투자·선투입 목업 데이터가 같은 번호를 써서 번호도 나눠 둠)
const PSV_TOBE = {
  '수주형:SI-001': { sub:'SI  SI-AD',            status:'수행' },
  '수주형:SI-002': { sub:'OS  OS-운영',           status:'착수완료' },
  '수주형:SI-003': { sub:'SI  SI-AD',            status:'착수완료' },
  '제안:PP-001':   { sub:'PR99  제안',            status:'수행' },
  '제안:PP-002':   { sub:'PR99  제안',            status:'착수완료' },
  '제안:PP-003':   { sub:'PR98  제안(정부)',       status:'수행' },
  'W/G:WG-001':    { sub:'TC27  W/G' },
  '사내:IP-001':   { sub:'IV58  전사IT운영',       status:'수행' },
  '사내:IP-002':   { sub:'IV59  사업지원 전사비용',  status:'종료', end:'2026-06-30' },
  '사내:IP-003':   { sub:'IV60_01  활동관리(PreSales)', status:'착수완료', code:'IV107780' },
  '투자:INV-001':  { sub:'투자  사내IT',           status:'수행', code:'IV107785', end:'2026-08-31' },
  '투자:INV-002':  { sub:'투자  사내IT',           status:'착수완료', code:'IV107790' },
  '투자:INV-003':  { sub:'투자  인프라',           status:'수행', code:'IV107791' },
  '선투입:ADV-001': { sub:'IV62  원가-선투입',      status:'수행', code:'IV107779', end:'2026-07-31', exc:'2026-12-31' },
  '선투입:ADV-002': { sub:'IV62  원가-선투입',      status:'착수완료', code:'IV107781' },
  '선투입:ADV-003': { sub:'IV62  원가-선투입',      status:'수행', code:'IV107782', end:'2026-10-01' },
};

// 원래 상태값 → TO-BE 상태 (null = 아직 프로젝트 아님, 현황에서 뺌)
function psvTobeStatus(orig) {
  if (['종료완료', '종료'].indexOf(orig) >= 0) return '종료';
  if (['승인', '승인완료', '수행중', '진행중', '마감준비'].indexOf(orig) >= 0) return '수행';
  if (['등록완료', '착수', '등록대기', '최종계약완료'].indexOf(orig) >= 0) return '착수완료';
  return null;
}

function psvDaysAfter(dateStr) {
  if (!dateStr) return -1;
  return Math.floor((new Date(PSV_TODAY) - new Date(dateStr)) / 86400000);
}
function psvAddDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// 유형 상세 화면에서 쓰는 TO-BE 상태 ('수주형', 'SI-001' 등) — 현황 목록과 같은 계산
function psvTobeOf(type, key) {
  const meta = PSV_TYPES.find(function (m) { return m.type === type; });
  const store = meta && psvStore(meta.data);
  if (!store || !store[key]) return null;
  return psvNormalize(meta, key, store[key]);
}

// 유형 상세 오른쪽 위 배지 — 프로젝트 상태(TO-BE) + 들어온 곳 / 세부 유형. 결재 상태는 각 화면의 버전 칩에 남김
function psvStatusBadge(type, key) {
  psvInjectStyle();
  const r = psvTobeOf(type, key);
  if (!r) return '';
  return '<span class="psv-dbadge-wrap"><span class="psv-dbadge" style="color:' + (PSV_STATUS_STYLE[r.status] || '#475569') + ';border-color:' + (PSV_STATUS_STYLE[r.status] || '#cbd5e1') + '">' + r.status + '</span>'
    + '<span class="psv-dfrom">' + r.from + ' / ' + r.sub + '</span></span>';
}

// 유형 상세 맨 아래 안내 — 결재(승인 처리)는 개설 관리 / 플랫폼에서 끝난 뒤 자동 등록된 것이므로 상세에는 승인 버튼을 두지 않음
function psvRegisteredBar(type, key) {
  const r = psvTobeOf(type, key);
  if (!r) return '';
  const where = r.from === '개설 관리' ? '프로젝트 개설 관리(비용 결재)' : r.from;
  return '<div class="reg-erp-bar reg-erp-done" style="margin-bottom:24px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">✅</span><div>'
    + '<div style="font-size:15px;font-weight:700;color:#1d4ed8">자동 등록 완료 / 현재 상태 ' + r.status + '</div>'
    + '<div style="font-size:14px;color:#64748b;margin-top:2px">' + where + '에서 결재가 끝나 MIS에 자동 등록됐습니다 (처음 상태 착수완료). 결재 이력은 ' + where + '에서 확인합니다.'
    + (r.next ? ' 다음 할 일: <b>' + r.next + '</b>' : '') + '</div></div></div></div>';
}

// 상태 표시 → 색
const PSV_STATUS_STYLE = {
  '착수완료':'#5b21b6', '수행':'#1d4ed8', '수행(임시종료)':'#b45309', '종료':'#166534',
};

// 한 건을 통합 행으로 정규화 (현황에 안 나오는 건은 null)
function psvNormalize(meta, key, p) {
  const ov = PSV_TOBE[meta.type + ':' + key] || {};
  const base = ov.status || psvTobeStatus(p.stage || p.status);
  if (!base) return null;
  const start = p.start || String(p.period || '').split('~')[0].trim();
  const end = ov.end || p.end || (String(p.period || '').split('~')[1] || '').trim();
  const pm = p.pm || p.wgLeader || '-';
  const org = p.revOrg || p.salesDept || p.requestDept || p.mainDept || '-';
  // 수행 건만 종료일 기준으로 임시종료 / 자동종료 대상 계산
  let status = base, next = '', warn = false;
  const passed = psvDaysAfter(end);
  if (base === '착수완료') next = '첫 실행예산 작성 / 승인';
  if (base === '수행' && passed >= 30) {
    status = '수행(임시종료)'; warn = true;
    next = passed >= 60 ? '자동종료 대상 (종료 조건 확인 중)' : '종료일 연장 또는 종료 / ' + psvAddDays(end, 60) + ' 자동종료 예정';
    if (ov.exc) next = '자동종료 예외 (' + ov.exc + '까지 ERP 유지)';
  }
  return {
    type: meta.type, key, code: ov.code || p.code || '-', name: p.name || '(이름없음)',
    sub: ov.sub || p.projType || '-', from: ov.from || meta.from,
    pm, org, customer: p.customer || p.client || p.custName || p.고객사 || '', status, next, warn, period: (start && end) ? (start + ' ~ ' + end) : '-', color: meta.color,
    show: meta.show, detail: meta.detail,
  };
}


// 전역 const 데이터 바인딩 해석 (최상위 const는 window 프로퍼티가 아니므로 직접 참조)
function psvStore(name) {
  switch (name) {
    case 'SI_PROJECTS':         return (typeof SI_PROJECTS !== 'undefined') ? SI_PROJECTS : null;
    case 'PROPOSAL_PROJECTS':   return (typeof PROPOSAL_PROJECTS !== 'undefined') ? PROPOSAL_PROJECTS : null;
    case 'WG_PROJECTS':         return (typeof WG_PROJECTS !== 'undefined') ? WG_PROJECTS : null;
    case 'INTERNAL_PROJECTS':   return (typeof INTERNAL_PROJECTS !== 'undefined') ? INTERNAL_PROJECTS : null;
    case 'INVESTMENT_PROJECTS': return (typeof INVESTMENT_PROJECTS !== 'undefined') ? INVESTMENT_PROJECTS : null;
    case 'ADVANCE_PROJECTS':    return (typeof ADVANCE_PROJECTS !== 'undefined') ? ADVANCE_PROJECTS : null;
    default: return null;
  }
}

// 전 유형 집계 (데이터 없는 유형은 건너뜀)
function psvCollect() {
  const rows = [];
  PSV_TYPES.forEach(function (meta) {
    const store = psvStore(meta.data);
    if (!store) return;
    Object.keys(store).forEach(function (key) {
      const r = psvNormalize(meta, key, store[key]);
      if (r) rows.push(r);   // 아직 프로젝트가 아닌 건(개설 신청 중)은 null → 제외
    });
  });
  return rows;
}

function psvApplyFilter(rows) {
  const code = psvCodeQ.trim().toLowerCase();
  const name = psvNameQ.trim().toLowerCase();
  const cust = psvCustomerQ.trim().toLowerCase();
  const org  = psvOrgQ.trim().toLowerCase();
  const pm   = psvPmQ.trim().toLowerCase();
  const has = function (val, q) { return String(val == null ? '' : val).toLowerCase().includes(q); };
  return rows.filter(function (r) {
    if (psvTypeFilter && r.type !== psvTypeFilter) return false;
    if (psvPathFilter && r.from !== psvPathFilter) return false;
    if (psvStatusFilter && r.status !== psvStatusFilter) return false;
    if (code && !has(r.code, code)) return false;
    if (name && !has(r.name, name)) return false;
    if (cust && !has(r.customer, cust)) return false;
    if (org  && !has(r.org, org)) return false;
    if (pm   && !has(r.pm, pm)) return false;
    return true;
  });
}

function psvInjectStyle() {
  if (document.getElementById('psv-style')) return;
  const st = document.createElement('style'); st.id = 'psv-style';
  st.textContent = `
   .psv-wrap{max-width:1180px;margin:0 auto;padding:4px 2px 40px}
   .psv-head{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px}
   .psv-title{font-size:21px;font-weight:900;color:#0f172a}
   .psv-sub{font-size:12.5px;color:#64748b;margin:2px 0 0}
   .psv-chips{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0 10px}
   .psv-chip{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700;color:#334155}
   .psv-chip b{font-weight:900}
   .psv-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin-bottom:12px}
   .psv-toolbar input,.psv-toolbar select{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12.5px;font-family:inherit;color:#0f172a;background:#fff}
   .psv-toolbar input{flex:1 1 130px;min-width:112px}
   .psv-toolbar .psv-sel{flex:0 0 auto;min-width:120px;cursor:pointer}
   .psv-search{position:relative;display:flex;flex:1 1 150px;min-width:128px}
   .psv-search input{flex:1 1 auto;min-width:0;padding-right:32px}
   .psv-search .psv-ic-btn{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;background:transparent;color:#94a3b8;cursor:pointer;border-radius:6px;padding:0}
   .psv-search .psv-ic-btn:hover{background:#eef2ff;color:#1d4ed8}
   .psv-ic{display:block}
   .psv-toolbar input:focus,.psv-toolbar select:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.12)}
   .psv-btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 13px;font-size:12.5px;font-weight:700;color:#334155;cursor:pointer;font-family:inherit}
   .psv-btn:hover{border-color:#1d4ed8;color:#1d4ed8}
   .psv-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
   .psv-btn.pri:hover{background:#1742b0}
   .psv-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:12.5px}
   .psv-table th{background:#f8fafc;text-align:left;padding:11px 12px;font-weight:800;color:#475569;border-bottom:1px solid #e5e7eb;white-space:nowrap}
   .psv-table td{padding:11px 12px;border-bottom:1px solid #f1f5f9;color:#1f2937;vertical-align:middle}
   .psv-table tr:last-child td{border-bottom:0}
   .psv-table tr:hover td{background:#f8faff}
   .psv-tbadge{display:inline-block;font-size:11px;font-weight:800;padding:2px 9px;border-radius:99px;color:#fff;white-space:nowrap}
   .psv-pbadge{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:6px;white-space:nowrap}
   .psv-sbadge{display:inline-block;font-size:11.5px;font-weight:800;white-space:nowrap}
   .psv-pname{font-weight:800;color:#0f172a}
   .psv-code{font-size:11px;color:#94a3b8}
   .psv-sub2{font-size:11px;color:#64748b;margin-top:3px;white-space:nowrap}
   .psv-from{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:6px;white-space:nowrap;background:#f1f5f9;color:#334155}
   .psv-from.ext{background:#eef2ff;color:#4338ca}
   .psv-next{font-size:11.5px;color:#475569}
   .psv-next.warn{color:#b45309;font-weight:700}
   .psv-flow{display:flex;align-items:stretch;gap:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;margin:0 0 12px;flex-wrap:wrap}
   .psv-st{flex:1;min-width:150px;padding:6px 10px;border-radius:8px;cursor:pointer}
   .psv-st:hover,.psv-st.on{background:#f1f5ff}
   .psv-st b{display:block;font-size:13px}
   .psv-st b i{font-style:normal;font-weight:900;margin-left:6px}
   .psv-st span{display:block;font-size:11px;color:#64748b;line-height:1.45;margin-top:2px}
   .psv-sa{display:flex;align-items:center;color:#cbd5e1;font-weight:900;padding:0 2px}
   .psv-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
   .psv-link{border:1px solid #d1d5db;background:#fff;border-radius:7px;padding:5px 11px;font-size:12px;font-weight:700;color:#1d4ed8;cursor:pointer;font-family:inherit}
   .psv-link:hover{background:#eff6ff;border-color:#1d4ed8}
   .psv-note{font-size:11.5px;color:#94a3b8;margin-top:12px;line-height:1.6}
   .psv-dbadge-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
   .psv-dbadge{display:inline-block;font-size:15px;font-weight:800;padding:5px 14px;border-radius:99px;border:1.5px solid;background:#fff;white-space:nowrap}
   .psv-dfrom{font-size:11.5px;color:#64748b;white-space:nowrap}
  `;
  document.head.appendChild(st);
}

function renderProjectStatus() {
  psvInjectStyle();
  const host = document.getElementById('s-project-status');
  if (!host) return;
  const all = psvCollect();
  const rows = psvApplyFilter(all);

  // 유형별 건수 칩
  const counts = {};
  all.forEach(function (r) { counts[r.type] = (counts[r.type] || 0) + 1; });
  const chips = PSV_TYPES.map(function (m) {
    return '<span class="psv-chip"><span class="psv-tbadge" style="background:' + m.color + '">' + m.type + '</span><b>' + (counts[m.type] || 0) + '</b>건</span>';
  }).join('');

  // 필터 옵션
  const typeOpts = ['', '수주형', '제안', 'W/G', '사내', '투자', '선투입']
    .map(function (t) { return '<option value="' + t + '"' + (t === psvTypeFilter ? ' selected' : '') + '>' + (t || '전체 유형') + '</option>'; }).join('');
  const statusList = ['착수완료', '수행', '수행(임시종료)', '종료'];
  const statusOpts = ['<option value="">전체 상태</option>'].concat(statusList.map(function (s) {
    return '<option value="' + s + '"' + (s === psvStatusFilter ? ' selected' : '') + '>' + s + '</option>';
  })).join('');
  const pathOpts = [['', '전체 들어온 곳']].concat(PSV_FROM_LIST.map(function (f) { return [f, f]; }))
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === psvPathFilter ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');

  // 상태 흐름 (누르면 그 상태로 거름)
  const scount = {};
  all.forEach(function (r) { scount[r.status] = (scount[r.status] || 0) + 1; });
  const stDesc = {
    '착수완료': '선행 단계 완료 후 자동 등록<br>첫 실행예산 승인 전 (ERP 예산 전송 전)',
    '수행': '첫 실행예산 승인완료<br>ERP 예산 전송 완료, ERP 상태 Active',
    '수행(임시종료)': '종료일 +30일 경과<br>ERP에는 종료를 보내지 않음',
    '종료': '수동 종료 또는 종료일 +60일 자동종료<br>ERP 종료 전송',
  };
  const flow = statusList.map(function (s, i) {
    return (i ? '<div class="psv-sa">→</div>' : '')
      + '<div class="psv-st' + (psvStatusFilter === s ? ' on' : '') + '" onclick="psvOnStatus(psvStatusFilter===\'' + s + '\'?\'\':\'' + s + '\')">'
      + '<b style="color:' + PSV_STATUS_STYLE[s] + '">' + s + '<i>' + (scount[s] || 0) + '</i></b><span>' + stDesc[s] + '</span></div>';
  }).join('');

  const body = rows.length ? rows.map(function (r) {
    const scolor = PSV_STATUS_STYLE[r.status] || '#475569';
    const ext = (r.from !== '개설 관리');
    return '<tr>'
      + '<td><div class="psv-pname">' + r.name + '</div><div class="psv-code">' + r.code + '</div></td>'
      + '<td><span class="psv-tbadge" style="background:' + r.color + '">' + r.type + '</span><div class="psv-sub2">' + r.sub + '</div></td>'
      + '<td><span class="psv-from' + (ext ? ' ext' : '') + '">' + r.from + '</span></td>'
      + '<td>' + r.pm + '</td>'
      + '<td>' + r.org + '</td>'
      + '<td style="white-space:nowrap;color:#64748b">' + r.period + '</td>'
      + '<td><span class="psv-sbadge" style="color:' + scolor + '">' + r.status + '</span></td>'
      + '<td><span class="psv-next' + (r.warn ? ' warn' : '') + '">' + (r.next || '-') + '</span></td>'
      + '<td><button class="psv-link" onclick="psvOpenDetail(\'' + r.type + '\',\'' + r.key + '\')">상세 조회</button></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="9" class="psv-empty">조건에 맞는 프로젝트가 없습니다.</td></tr>';

  host.innerHTML =
    '<div class="psv-wrap">'
    + '<div class="psv-head"><div><div class="psv-title">프로젝트 현황</div>'
    + '<div class="psv-sub">선행 단계(CRM 계약 / 사업기회 / 플랫폼 / 개설 관리)가 끝나 자동 등록된 전 유형 프로젝트를 한 곳에서 조회합니다.</div></div></div>'
    + '<div class="psv-chips">' + chips + '</div>'
    + '<div class="psv-flow">' + flow + '</div>'
    + '<div class="psv-toolbar">'
    + '<input class="psv-in" type="text" placeholder="프로젝트 번호" value="' + psvEsc(psvCodeQ) + '" oninput="psvSet(\'code\',this.value)" onkeydown="psvKey(event)">'
    + '<input class="psv-in" type="text" placeholder="프로젝트 명" value="' + psvEsc(psvNameQ) + '" oninput="psvSet(\'name\',this.value)" onkeydown="psvKey(event)">'
    + '<select class="psv-sel" onchange="psvSet(\'type\',this.value)">' + typeOpts + '</select>'
    + '<select class="psv-sel" onchange="psvSet(\'status\',this.value)">' + statusOpts + '</select>'
    + '<span class="psv-search"><input type="text" placeholder="고객사" value="' + psvEsc(psvCustomerQ) + '" oninput="psvSet(\'customer\',this.value)" onkeydown="psvKey(event)"><button type="button" class="psv-ic-btn" title="고객사 검색" onclick="psvOpenCustomer()">' + PSV_SEARCH_ICON + '</button></span>'
    + '<span class="psv-search"><input type="text" placeholder="매출귀속조직" value="' + psvEsc(psvOrgQ) + '" oninput="psvSet(\'org\',this.value)" onkeydown="psvKey(event)"><button type="button" class="psv-ic-btn" title="조직 검색" onclick="psvOpenOrg()">' + PSV_SEARCH_ICON + '</button></span>'
    + '<span class="psv-search"><input type="text" placeholder="수행PM" value="' + psvEsc(psvPmQ) + '" oninput="psvSet(\'pm\',this.value)" onkeydown="psvKey(event)"><button type="button" class="psv-ic-btn" title="구성원 검색" onclick="psvOpenMember()">' + PSV_SEARCH_ICON + '</button></span>'
    + '<select class="psv-sel" onchange="psvSet(\'path\',this.value)">' + pathOpts + '</select>'
    + '<button class="psv-btn pri" onclick="psvSearchGo()">조회</button>'
    + '<button class="psv-btn" onclick="psvResetFilter()">초기화</button>'
    + '</div>'
    + '<div class="psv-listhead"><div class="psv-total">총 <strong>' + rows.length + '</strong> 건</div>'
    + '<div class="psv-listact">'
    + '<button class="psv-btn" onclick="psvExcel()">엑셀 다운로드</button>'
    + '<button class="psv-btn psv-fsbtn" onclick="psvToggleFs()" title="' + (psvListFs ? '원래 크기로' : '전체화면으로 보기') + '" aria-label="' + (psvListFs ? '전체화면 종료' : '전체화면으로 보기') + '">' + (psvListFs ? PSV_FS_ICON_IN : PSV_FS_ICON_OUT) + '</button>'
    + '</div></div>'
    + '<div class="psv-tablewrap" id="psv-tablewrap">'
    + '<table class="psv-table"><thead><tr>'
    + '<th>프로젝트</th><th>유형 / 세부 유형</th><th>들어온 곳</th><th>PM</th><th>매출귀속부서</th><th>수행기간</th><th>상태</th><th>다음 할 일</th><th></th>'
    + '</tr></thead><tbody>' + body + '</tbody></table>'
    + '<button class="psv-fsexit" onclick="psvToggleFs()" title="원래 크기로" aria-label="전체화면 종료">' + PSV_FS_ICON_IN + '<span>닫기</span></button>'
    + '</div>'
    + '<div class="psv-note">※ 프로젝트는 선행 단계가 끝나면 자동 등록되고, 처음 상태는 모두 <b>착수완료</b>입니다. 이 화면에서 직접 등록하지 않습니다.<br>'
    + '※ W/G / 사내(MIS 등록 유형)는 <b>프로젝트 개설 관리</b>에서 비용 결재가 승인완료되면 자동 등록됩니다. 신청 중인 건은 개설 관리에서만 보입니다.<br>'
    + '※ 수행(임시종료) 건은 종료일 +60일이 되면 종료 조건을 확인해 자동종료됩니다. 연장이 필요하면 프로젝트 종료 화면에서 종료일을 바꾸거나 자동종료 예외를 등록하세요.</div>'
    + '</div>';

  psvInjectFsStyle();
  const tw = document.getElementById('psv-tablewrap');
  if (tw) tw.classList.toggle('psv-fs', !!psvListFs);
  document.body.classList.toggle('psv-fs-lock', !!psvListFs);
}

// ── 이벤트 핸들러 ──
// 입력은 값만 저장(포커스 유지), [조회] 클릭 또는 Enter 시 적용
function psvEsc(v) { return String(v == null ? '' : v).replace(/"/g, '&quot;'); }
function psvSet(field, v) {
  switch (field) {
    case 'code':     psvCodeQ = v; break;
    case 'name':     psvNameQ = v; break;
    case 'customer': psvCustomerQ = v; break;
    case 'org':      psvOrgQ = v; break;
    case 'pm':       psvPmQ = v; break;
    case 'type':     psvTypeFilter = v; break;
    case 'status':   psvStatusFilter = v; break;
    case 'path':     psvPathFilter = v; break;
  }
}
function psvKey(e) { if (e && e.key === 'Enter') psvSearchGo(); }
function psvSearchGo() { renderProjectStatus(); }
// 상태 흐름 칸 클릭 — 그 상태로 바로 거름 (같은 칸을 다시 누르면 해제)
function psvOnStatus(v) { psvStatusFilter = v; renderProjectStatus(); }
function psvResetFilter() {
  psvCodeQ = ''; psvNameQ = ''; psvCustomerQ = ''; psvOrgQ = ''; psvPmQ = '';
  psvTypeFilter = ''; psvStatusFilter = ''; psvPathFilter = '';
  renderProjectStatus();
}

// 상세 조회 — 해당 유형 전용 화면으로 이동 후 상세 열기
function psvOpenDetail(type, key) {
  const meta = PSV_TYPES.find(function (m) { return m.type === type; });
  if (!meta) return;
  psvExitFs();
  const desc = { kind: 'psvDetail', type: type, key: key };
  // 프로젝트는 새 탭으로(이미 열린 프로젝트면 그 탭 포커스) — 인터넷 새 탭처럼
  if (typeof window.tabOpenProjectHint === 'function') window.tabOpenProjectHint(desc);
  if (typeof window[meta.show] === 'function') window[meta.show]();
  if (typeof window[meta.detail] === 'function') window[meta.detail](key);
  // 이 상세는 '프로젝트 현황'에서 진입 → [목록] 클릭 시 프로젝트 현황으로 복귀
  window.psvFromStatus = true;
  // 탭에 "프로젝트번호 + 명칭" 태깅 (+ 즐겨찾기용 재진입 서술자)
  try {
    const store = psvStore(meta.data);
    const p = store && store[key];
    if (p && typeof window.tabTagProject === 'function') {
      window.tabTagProject(p.code || '', p.name || '', desc);
    }
  } catch (e) {}
}

// 목록 다운로드 — 목업 스텁
function psvDownload() {
  if (typeof showToast === 'function') showToast('프로젝트 현황 목록을 내려받습니다. (목업)');
}

// ── 엑셀 다운로드 · 리스트 전체화면 ──
const PSV_FS_ICON_OUT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const PSV_FS_ICON_IN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
let psvListFs = false;

function psvExcel() {
  if (typeof showToast === 'function') showToast('프로젝트 현황을 엑셀 파일로 내려받습니다. (목업)');
}
function psvToggleFs() {
  psvListFs = !psvListFs;
  renderProjectStatus();
}
function psvExitFs() {
  if (!psvListFs) return;
  psvListFs = false;
  document.body.classList.remove('psv-fs-lock');
}
function psvInjectFsStyle() {
  if (document.getElementById('psv-fs-style')) return;
  const st = document.createElement('style'); st.id = 'psv-fs-style';
  st.textContent = `
   .psv-listhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 10px}
   .psv-total{font-size:13px;color:#475569}
   .psv-total strong{color:#1d4ed8;font-weight:800}
   .psv-listact{display:flex;gap:8px;align-items:center}
   .psv-fsbtn{display:inline-flex;align-items:center;justify-content:center}
   .psv-fsbtn svg{display:block}
   .psv-tablewrap{position:relative}
   .psv-tablewrap.psv-fs{position:fixed;inset:0;z-index:1200;background:#fff;overflow:auto;padding:16px clamp(16px,3vw,40px);animation:psvFsIn .18s ease}
   @keyframes psvFsIn{from{opacity:.5}to{opacity:1}}
   body.psv-fs-lock{overflow:hidden}
   .psv-fsexit{display:none}
   .psv-tablewrap.psv-fs .psv-fsexit{display:inline-flex;align-items:center;gap:6px;position:fixed;top:14px;right:18px;z-index:1300;padding:8px 14px;border:1px solid #d7deea;border-radius:8px;background:#fff;color:#1e293b;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 12px rgba(15,23,42,.14)}
   .psv-fsexit:hover{background:#f1f5f9}
   .psv-fsexit svg{display:block}
  `;
  document.head.appendChild(st);
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && psvListFs) psvToggleFs();
});

// 진입점
function showProjectStatus() {
  if (typeof setNav === 'function') setNav('nav-project-status');
  if (typeof setScreen === 'function') setScreen('s-project-status');
  renderProjectStatus();
}

// ════════════════════════════════════════════════════════════════
//  검색 팝업 (돋보기) — 고객사 / 조직 / 구성원
//  돋보기 클릭 → 팝업 → 선택 → 해당 입력칸에 값 채움 (목업 데이터)
// ════════════════════════════════════════════════════════════════

// ── 목업 데이터 ──
const PSV_CUSTOMERS = [
  { name:'SK텔레콤',      rep:'유영상', grade:'AAA', bizno:'104-81-37225', sector:'통신업',     affil:'Y' },
  { name:'SK하이닉스',    rep:'곽노정', grade:'AAA', bizno:'130-81-25029', sector:'반도체',     affil:'Y' },
  { name:'SK C&C',       rep:'윤풍영', grade:'AA+', bizno:'214-87-00556', sector:'IT서비스',   affil:'Y' },
  { name:'SK브로드밴드',  rep:'박진효', grade:'AA',  bizno:'110-81-39215', sector:'통신업',     affil:'Y' },
  { name:'SK텔레시스',    rep:'정철순', grade:'A',   bizno:'621-81-00001', sector:'전자기기',   affil:'Y' },
  { name:'SK에코플랜트',  rep:'장동현', grade:'AA-', bizno:'120-81-45678', sector:'건설·환경',  affil:'Y' },
  { name:'SKC',          rep:'박원철', grade:'AA',  bizno:'134-81-12345', sector:'소재·화학',  affil:'Y' },
  { name:'KB국민은행',    rep:'이재근', grade:'AAA', bizno:'201-81-68693', sector:'은행',       affil:'N' },
  { name:'CSWIND',       rep:'김성권', grade:'A-',  bizno:'312-81-55667', sector:'풍력설비',   affil:'N' },
  { name:'메가물류',      rep:'김상대', grade:'B+',  bizno:'105-22-37920', sector:'운수·물류',  affil:'N' },
  { name:'서부주유소',    rep:'김상수', grade:'B',   bizno:'441-58-00861', sector:'주유소',     affil:'N' },
  { name:'한빛데이터',    rep:'이승엽', grade:'BBB', bizno:'612-81-54157', sector:'응용SW개발', affil:'N' },
];

const PSV_ORG_TREE = {
  name:'SK주식회사 AX', children:[
    { name:'AX 사장', children:[
      { name:'CAIO', children:[
        { name:'AI IT추진팀' },
        { name:'AI Architect팀' },
        { name:'AI Innovation Lab', children:[
          { name:'AI Tech Innovation팀' },
          { name:'AI ITS혁신팀' },
          { name:'AIOps TF' },
        ] },
        { name:'(전사)IT운영팀' },
      ] },
      { name:'SHE추진단', children:[ { name:'SHE추진팀' } ] },
      { name:'NOVA PMO팀' },
      { name:'AX ERP사업부' },
      { name:'데이터사업부' },
      { name:'보안사업부' },
      { name:'AI사업부' },
      { name:'HR사업부' },
      { name:'스마트워크팀' },
      { name:'인프라운영팀' },
    ] },
  ],
};

const PSV_MEMBERS = [
  { name:'한민석', empno:'08288', title:'팀장', dept:'NOVA PMO팀' },
  { name:'이강혁', empno:'09753', title:'팀원', dept:'AX ERP사업부' },
  { name:'이봄',   empno:'10822', title:'팀원', dept:'보안사업부' },
  { name:'윤도준', empno:'11327', title:'팀원', dept:'HR사업부' },
  { name:'김민구', empno:'08751', title:'팀장', dept:'AI Architect팀' },
  { name:'안세원', empno:'08203', title:'팀원', dept:'스마트워크팀' },
  { name:'김종원', empno:'11108', title:'팀원', dept:'AI ITS혁신팀' },
  { name:'김보경', empno:'06330', title:'팀원', dept:'AI Innovation Lab' },
  { name:'박용준', empno:'03116', title:'팀장', dept:'AX ERP사업부' },
  { name:'안정준', empno:'06835', title:'팀원', dept:'(전사)IT운영팀' },
  { name:'송하경', empno:'03749', title:'팀원', dept:'AI사업부' },
  { name:'전종희', empno:'10306', title:'팀원', dept:'인프라운영팀' },
  { name:'김화진', empno:'07954', title:'팀원', dept:'AI IT추진팀' },
  { name:'이충섭', empno:'04794', title:'팀장', dept:'데이터사업부' },
];

// ── 팝업 공통 ──
function psvInjectModalStyle() {
  if (document.getElementById('psv-modal-style')) return;
  const st = document.createElement('style'); st.id = 'psv-modal-style';
  st.textContent = `
   .psv-mo{position:fixed;inset:0;z-index:4000;background:rgba(15,23,42,.5);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:20px}
   .psv-md{background:#fff;border-radius:16px;border:1px solid #e8ecf3;width:min(820px,96vw);max-height:86vh;display:flex;flex-direction:column;overflow:hidden;animation:psvModalIn .2s ease;font-family:inherit}
   @keyframes psvModalIn{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
   .psv-md-head{display:flex;align-items:center;justify-content:space-between;background:#fff;color:#1e293b;padding:18px 22px;border-bottom:1px solid #f1f5f9}
   .psv-md-title{font-size:18px;font-weight:900;color:#1e293b;letter-spacing:-.3px}
   .psv-md-x{background:#f1f5f9;border:none;color:#64748b;border-radius:8px;padding:7px 12px;font-size:14px;font-weight:700;cursor:pointer;line-height:1}
   .psv-md-x:hover{background:#e2e8f0;color:#1e293b}
   .psv-md-body{padding:16px 22px;overflow:auto;flex:1}
   .psv-md-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 22px;border-top:1px solid #f1f5f9}
   .psv-md-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
   .psv-md-radio{display:flex;gap:12px;font-size:12.5px;color:#334155}
   .psv-md-radio label{display:flex;gap:4px;align-items:center;cursor:pointer}
   .psv-md-radio input{accent-color:#1d4ed8}
   .psv-md-srch{position:relative;flex:1;min-width:180px;display:flex}
   .psv-md-srch input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 32px 8px 10px;font-size:12.5px;font-family:inherit;color:#0f172a}
   .psv-md-srch input:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.12)}
   .psv-md-srch button{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:24px;height:24px;border:none;background:transparent;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:6px}
   .psv-md-srch button:hover{background:#eef2ff;color:#1d4ed8}
   .psv-mt{width:100%;border-collapse:collapse;font-size:12.5px}
   .psv-mt th{background:#f8faff;text-align:left;padding:9px 12px;font-weight:800;color:#64748b;border-bottom:2px solid #e8ecf3;position:sticky;top:0}
   .psv-mt td{padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#1f2937;white-space:nowrap}
   .psv-mt tr{cursor:pointer}
   .psv-mt tr:hover td{background:#f8faff}
   .psv-mt tr.sel td{background:#eff6ff;box-shadow:inset 2px 0 0 #1d4ed8}
   .psv-tree{font-size:13px;color:#1f2937}
   .psv-tnode{display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:8px;cursor:pointer}
   .psv-tnode:hover{background:#f8faff}
   .psv-tnode.sel{background:#eff6ff;color:#1d4ed8;font-weight:800;box-shadow:inset 2px 0 0 #1d4ed8}
   .psv-ttog{width:16px;height:16px;flex:0 0 16px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;line-height:1;background:#fff;color:#475569}
   .psv-tspace{width:16px;flex:0 0 16px;display:inline-block}
   .psv-mcols{display:flex;gap:12px}
   .psv-mcol-l{width:40%;max-height:48vh;overflow:auto;border:1px solid #e8ecf3;border-radius:12px;padding:8px;background:#fcfdff}
   .psv-mcol-r{flex:1;min-width:0;max-height:48vh;overflow:auto;border:1px solid #e8ecf3;border-radius:12px}
   .psv-deptitem{padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;color:#334155}
   .psv-deptitem:hover{background:#eef2ff}
   .psv-deptitem.sel{background:#1d4ed8;color:#fff;font-weight:700}
   .psv-md-empty{padding:28px;text-align:center;color:#94a3b8;font-size:13px}
  `;
  document.head.appendChild(st);
}

function psvModalHost() {
  let o = document.getElementById('psv-modal-overlay');
  if (!o) {
    o = document.createElement('div');
    o.id = 'psv-modal-overlay'; o.className = 'psv-mo';
    o.onclick = function (e) { if (e.target === o) psvCloseModal(); };
    o.innerHTML = '<div class="psv-md" role="dialog" aria-modal="true">'
      + '<div class="psv-md-head"><span class="psv-md-title" id="psv-md-title"></span>'
      + '<button class="psv-md-x" onclick="psvCloseModal()" aria-label="닫기">닫기</button></div>'
      + '<div class="psv-md-body" id="psv-md-body"></div>'
      + '<div class="psv-md-foot" id="psv-md-foot"></div></div>';
    document.body.appendChild(o);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { const ov = document.getElementById('psv-modal-overlay'); if (ov && ov.style.display === 'flex') psvCloseModal(); }
    });
  }
  return o;
}
function psvCloseModal() { const o = document.getElementById('psv-modal-overlay'); if (o) o.style.display = 'none'; }
function psvShowModal(title) { psvInjectModalStyle(); const o = psvModalHost(); o.style.display = 'flex'; document.getElementById('psv-md-title').textContent = title; }
function psvFootHtml(onSelect) {
  return '<button class="psv-btn pri" onclick="' + onSelect + '">선택</button>'
       + '<button class="psv-btn" onclick="psvCloseModal()">취소</button>';
}

// ── 고객사 검색 ──
let psvCustMode = 'name', psvCustKw = '', psvCustPick = '', psvCustFiltered = [];
function psvOpenCustomer() { psvCustMode = 'name'; psvCustKw = ''; psvCustPick = ''; psvShowModal('고객사 검색'); psvRenderCustomer(); }
function psvCustModeSet(m) { psvCustMode = m; psvRenderCustomer(); }
function psvCustKwSet(v) { psvCustKw = v; }
function psvCustClick(i) { const r = psvCustFiltered[i]; if (r) { psvCustPick = r.name; psvRenderCustomer(); } }
function psvCustConfirm(i) { const r = psvCustFiltered[i]; if (r) psvPickCustomer(r.name); }
function psvCustSelectBtn() { if (!psvCustPick) { if (typeof showToast === 'function') showToast('목록에서 고객사를 선택하세요.'); return; } psvPickCustomer(psvCustPick); }
function psvPickCustomer(name) { psvCustomerQ = name; psvCloseModal(); renderProjectStatus(); }
function psvRenderCustomer() {
  const kw = psvCustKw.trim().toLowerCase();
  const field = psvCustMode === 'bizno' ? 'bizno' : (psvCustMode === 'sector' ? 'sector' : 'name');
  psvCustFiltered = PSV_CUSTOMERS.filter(function (c) { return !kw || String(c[field]).toLowerCase().includes(kw); });
  const rows = psvCustFiltered.length ? psvCustFiltered.map(function (c, i) {
    return '<tr class="' + (c.name === psvCustPick ? 'sel' : '') + '" onclick="psvCustClick(' + i + ')" ondblclick="psvCustConfirm(' + i + ')">'
      + '<td>' + c.name + '</td><td>' + c.rep + '</td><td>' + c.grade + '</td><td>' + c.bizno + '</td><td>' + c.sector + '</td><td style="text-align:center">' + c.affil + '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="psv-md-empty">검색 결과가 없습니다.</td></tr>';
  document.getElementById('psv-md-body').innerHTML =
    '<div class="psv-md-tools"><div class="psv-md-radio">'
    + '<label><input type="radio" name="psvcm" ' + (psvCustMode==='name'?'checked':'') + ' onclick="psvCustModeSet(\'name\')">회사명</label>'
    + '<label><input type="radio" name="psvcm" ' + (psvCustMode==='bizno'?'checked':'') + ' onclick="psvCustModeSet(\'bizno\')">사업자등록번호</label>'
    + '<label><input type="radio" name="psvcm" ' + (psvCustMode==='sector'?'checked':'') + ' onclick="psvCustModeSet(\'sector\')">업종</label>'
    + '</div><div class="psv-md-srch"><input id="psv-md-search" type="text" placeholder="검색어 입력 후 Enter" value="' + psvEsc(psvCustKw) + '" oninput="psvCustKwSet(this.value)" onkeydown="if(event.key===\'Enter\')psvRenderCustomer()"><button onclick="psvRenderCustomer()">' + PSV_SEARCH_ICON + '</button></div></div>'
    + '<table class="psv-mt"><thead><tr><th>회사명</th><th>대표자명</th><th>신용등급</th><th>사업자등록번호</th><th>업종</th><th style="text-align:center">관계사여부</th></tr></thead><tbody>' + rows + '</tbody></table>';
  document.getElementById('psv-md-foot').innerHTML = psvFootHtml('psvCustSelectBtn()');
}

// ── 조직 검색 ──
let psvOrgKw = '', psvOrgPick = '', psvOrgExpanded = null, psvOrgFlat = [];
function psvOpenOrg() {
  psvOrgKw = ''; psvOrgPick = '';
  psvOrgExpanded = { 'SK주식회사 AX': true, 'AX 사장': true, 'CAIO': true };
  psvShowModal('조직 검색'); psvRenderOrg();
}
function psvOrgKwSet(v) { psvOrgKw = v; }
function psvOrgToggle(name) { psvOrgExpanded[name] = !psvOrgExpanded[name]; psvRenderOrg(); }
function psvOrgClick(name) { psvOrgPick = name; psvRenderOrg(); }
function psvOrgDbl(name) { psvPickOrg(name); }
function psvOrgSelectBtn() { if (!psvOrgPick) { if (typeof showToast === 'function') showToast('조직을 선택하세요.'); return; } psvPickOrg(psvOrgPick); }
function psvPickOrg(name) { psvOrgQ = name; psvCloseModal(); renderProjectStatus(); }
function psvOrgMatch(node, kw) {
  if (!kw) return true;
  if (node.name.toLowerCase().includes(kw)) return true;
  return (node.children || []).some(function (c) { return psvOrgMatch(c, kw); });
}
function psvOrgNodeHtml(node, depth, kw) {
  if (!psvOrgMatch(node, kw)) return '';
  const hasKids = node.children && node.children.length;
  const expanded = kw ? true : !!psvOrgExpanded[node.name];
  const safe = node.name.replace(/'/g, "\\'");
  const tog = hasKids
    ? '<span class="psv-ttog" onclick="event.stopPropagation();psvOrgToggle(\'' + safe + '\')">' + (expanded ? '−' : '+') + '</span>'
    : '<span class="psv-tspace"></span>';
  let html = '<div class="psv-tnode ' + (node.name === psvOrgPick ? 'sel' : '') + '" style="padding-left:' + (depth * 16 + 4) + 'px" '
    + 'onclick="psvOrgClick(\'' + safe + '\')" ondblclick="psvOrgDbl(\'' + safe + '\')">' + tog + '<span>' + node.name + '</span></div>';
  if (hasKids && expanded) {
    html += node.children.map(function (c) { return psvOrgNodeHtml(c, depth + 1, kw); }).join('');
  }
  return html;
}
function psvRenderOrg() {
  const kw = psvOrgKw.trim().toLowerCase();
  const tree = psvOrgNodeHtml(PSV_ORG_TREE, 0, kw) || '<div class="psv-md-empty">검색 결과가 없습니다.</div>';
  document.getElementById('psv-md-body').innerHTML =
    '<div class="psv-md-tools"><div class="psv-md-srch"><input id="psv-md-search" type="text" placeholder="조직명 검색 후 Enter" value="' + psvEsc(psvOrgKw) + '" oninput="psvOrgKwSet(this.value)" onkeydown="if(event.key===\'Enter\')psvRenderOrg()"><button onclick="psvRenderOrg()">' + PSV_SEARCH_ICON + '</button></div></div>'
    + '<div class="psv-tree">' + tree + '</div>';
  document.getElementById('psv-md-foot').innerHTML = psvFootHtml('psvOrgSelectBtn()');
}

// ── 구성원 검색 ──
let psvMemMode = 'name', psvMemKw = '', psvMemDept = '', psvMemPick = '', psvMemFiltered = [];
function psvOpenMember() { psvMemMode = 'name'; psvMemKw = ''; psvMemDept = ''; psvMemPick = ''; psvShowModal('구성원 검색'); psvRenderMember(); }
function psvMemModeSet(m) { psvMemMode = m; psvRenderMember(); }
function psvMemKwSet(v) { psvMemKw = v; }
function psvMemDeptSet(d) { psvMemDept = (psvMemDept === d ? '' : d); psvRenderMember(); }
function psvMemClick(i) { const r = psvMemFiltered[i]; if (r) { psvMemPick = r.empno; psvRenderMember(); } }
function psvMemConfirm(i) { const r = psvMemFiltered[i]; if (r) psvPickMember(r.name); }
function psvMemSelectBtn() { const r = psvMemFiltered.find(function (m) { return m.empno === psvMemPick; }); if (!r) { if (typeof showToast === 'function') showToast('구성원을 선택하세요.'); return; } psvPickMember(r.name); }
function psvPickMember(name) { psvPmQ = name; psvCloseModal(); renderProjectStatus(); }
function psvRenderMember() {
  const kw = psvMemKw.trim().toLowerCase();
  const field = psvMemMode === 'empno' ? 'empno' : 'name';
  psvMemFiltered = PSV_MEMBERS.filter(function (m) {
    if (psvMemDept && m.dept !== psvMemDept) return false;
    return !kw || String(m[field]).toLowerCase().includes(kw);
  });
  const depts = Array.from(new Set(PSV_MEMBERS.map(function (m) { return m.dept; })));
  const deptList = depts.map(function (d) {
    return '<div class="psv-deptitem ' + (d === psvMemDept ? 'sel' : '') + '" onclick="psvMemDeptSet(\'' + d.replace(/'/g, "\\'") + '\')">' + d + '</div>';
  }).join('');
  const rows = psvMemFiltered.length ? psvMemFiltered.map(function (m, i) {
    return '<tr class="' + (m.empno === psvMemPick ? 'sel' : '') + '" onclick="psvMemClick(' + i + ')" ondblclick="psvMemConfirm(' + i + ')">'
      + '<td>' + m.name + '</td><td>' + m.empno + '</td><td>' + m.title + '</td><td>' + m.dept + '</td></tr>';
  }).join('') : '<tr><td colspan="4" class="psv-md-empty">검색 결과가 없습니다.</td></tr>';
  document.getElementById('psv-md-body').innerHTML =
    '<div class="psv-md-tools"><div class="psv-md-radio">'
    + '<label><input type="radio" name="psvmm" ' + (psvMemMode==='name'?'checked':'') + ' onclick="psvMemModeSet(\'name\')">이름</label>'
    + '<label><input type="radio" name="psvmm" ' + (psvMemMode==='empno'?'checked':'') + ' onclick="psvMemModeSet(\'empno\')">사번</label>'
    + '</div><div class="psv-md-srch"><input id="psv-md-search" type="text" placeholder="검색어 입력 후 Enter" value="' + psvEsc(psvMemKw) + '" oninput="psvMemKwSet(this.value)" onkeydown="if(event.key===\'Enter\')psvRenderMember()"><button onclick="psvRenderMember()">' + PSV_SEARCH_ICON + '</button></div></div>'
    + '<div class="psv-mcols"><div class="psv-mcol-l">' + deptList + '</div>'
    + '<div class="psv-mcol-r"><table class="psv-mt"><thead><tr><th>이름</th><th>사번</th><th>직책</th><th>부서</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  document.getElementById('psv-md-foot').innerHTML = psvFootHtml('psvMemSelectBtn()');
}

// ── 상세 '목록' 버튼 분기 ──
// '프로젝트 현황'에서 상세로 진입한 경우에만 [목록] 클릭 시 #/project-status 로 복귀.
// 유형 자체 리스트에서 진입하면 기존 동작(해당 유형 리스트)을 그대로 유지.
// (project-status.js 는 모든 유형 파일 뒤에 로드되므로 close/open 함수를 감쌀 수 있다.)
(function psvWireDetailBack() {
  window.psvFromStatus = window.psvFromStatus || false;
  const types = [
    { open: 'openSIDetail',       close: 'closeSIDetail' },
    { open: 'openProposalDetail', close: 'closeProposalDetail' },
    { open: 'openWGDetail',       close: 'closeWGDetail' },
    { open: 'openIPDetail',       close: 'closeIPDetail' },
    { open: 'openInvDetail',      close: 'closeInvDetail' },
    { open: 'openAdvDetail',      close: 'closeAdvDetail' },
  ];
  types.forEach(function (t) {
    const origOpen = window[t.open];
    if (typeof origOpen === 'function') {
      window[t.open] = function () { window.psvFromStatus = false; return origOpen.apply(this, arguments); };
    }
    const origClose = window[t.close];
    if (typeof origClose === 'function') {
      window[t.close] = function () {
        if (window.psvFromStatus) { window.psvFromStatus = false; showProjectStatus(); return; }
        return origClose.apply(this, arguments);
      };
    }
  });
})();

// 라우트 등록 (app.js 로드 뒤 실행되므로 전역 객체에 직접 추가)
if (typeof SCREEN_ROUTES !== 'undefined') SCREEN_ROUTES['s-project-status'] = 'project-status';
if (typeof ROUTE_ACTIONS !== 'undefined') ROUTE_ACTIONS['project-status'] = function () { showProjectStatus(); };
