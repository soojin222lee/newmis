// ════════════════════════════════════════
//  프로젝트 현황 — 전 유형 통합 조회            작성: 수진
// ════════════════════════════════════════
//
// AI GUIDE: 프로젝트 현황 화면입니다.
// - 수주형·제안·W/G·사내·투자·선투입 6개 유형의 프로젝트를 한 목록에서 통합 조회합니다.
// - 유형·상태·등록경로별 검색/필터를 제공하고, [상세]를 누르면 해당 유형의 상세 화면으로 이동합니다.
// - 등록경로는 두 갈래입니다.
//     · 선행 자동연계 : 수주형·제안·투자·선투입 (CRM 등 선행 시스템에서 완료 후 MIS 자동 등록)
//     · 개설 승인     : W/G·사내 (MIS에서 개설 신청→승인 완료 후 등록 / '프로젝트 개설 관리'에서 처리)
// - W/G·사내는 개설 승인 완료 전까지 수행원가 예산 수립이 불가합니다(현황에서 예산수립 가능 여부 표시).
// - 데이터는 각 유형 전용 파일의 전역 상수(SI_PROJECTS·PROPOSAL_PROJECTS·WG_PROJECTS·
//   INTERNAL_PROJECTS·INVESTMENT_PROJECTS·ADVANCE_PROJECTS)를 읽어 정규화합니다(단일 출처 유지).

let psvSearch = '';
let psvTypeFilter = '';   // '' | 수주형 | 제안 | W/G | 사내 | 투자 | 선투입
let psvStatusFilter = ''; // '' | 등록대기 | 진행 | 완료 | 반려 등 (표시 상태)
let psvPathFilter = '';   // '' | 선행연계 | 개설승인

// 유형 메타 — 데이터 상수 · 상세 진입 함수 · 등록경로 · 색상
const PSV_TYPES = [
  { type:'수주형', data:'SI_PROJECTS',         show:'showSIProject',         detail:'openSIDetail',       path:'선행연계', color:'#1d4ed8' },
  { type:'제안',   data:'PROPOSAL_PROJECTS',   show:'showProposalProject',   detail:'openProposalDetail', path:'선행연계', color:'#7c3aed' },
  { type:'투자',   data:'INVESTMENT_PROJECTS', show:'showInvestmentProject', detail:'openInvDetail',      path:'선행연계', color:'#0891b2' },
  { type:'선투입', data:'ADVANCE_PROJECTS',    show:'showAdvanceProject',    detail:'openAdvDetail',      path:'선행연계', color:'#0d9488' },
  { type:'W/G',   data:'WG_PROJECTS',         show:'showWGProject',         detail:'openWGDetail',       path:'개설승인', color:'#b45309' },
  { type:'사내',   data:'INTERNAL_PROJECTS',   show:'showInternalProject',   detail:'openIPDetail',       path:'개설승인', color:'#be185d' },
];

// 등록경로 라벨/색
const PSV_PATH_META = {
  '선행연계': { label:'선행 자동연계', bg:'#eef2ff', color:'#4338ca' },
  '개설승인': { label:'개설 승인',     bg:'#fff7ed', color:'#c2410c' },
};

// 표시 상태 → 색 (유형별 원본 상태값을 그대로 노출)
const PSV_STATUS_STYLE = {
  '승인완료':'#1d4ed8', '승인':'#1d4ed8', '수행중':'#1d4ed8', '진행중':'#1d4ed8',
  '등록완료':'#475569', '착수':'#5b21b6',
  '마감준비':'#b45309', '검토중':'#b45309', '기안중':'#b45309',
  '종료완료':'#166534', '반려':'#991b1b',
};

// 한 건을 통합 행으로 정규화
function psvNormalize(meta, key, p) {
  const status = p.stage || p.status || '-';
  const period = (p.start && p.end) ? (p.start + ' ~ ' + p.end) : (p.period || '-');
  const pm = p.pm || p.wgLeader || '-';
  const org = p.revOrg || p.salesDept || p.requestDept || p.mainDept || '-';
  // 예산 수립 가능 여부: 개설승인 유형은 '승인완료/승인'일 때만 가능, 선행연계는 등록되면 가능
  const approved = (status === '승인완료' || status === '승인');
  const budgetReady = (meta.path === '선행연계') ? true : approved;
  return {
    type: meta.type, key, code: p.code || '-', name: p.name || '(이름없음)',
    pm, org, status, period, path: meta.path, color: meta.color,
    show: meta.show, detail: meta.detail, budgetReady,
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
      rows.push(psvNormalize(meta, key, store[key]));
    });
  });
  return rows;
}

function psvApplyFilter(rows) {
  const q = psvSearch.trim().toLowerCase();
  return rows.filter(function (r) {
    if (psvTypeFilter && r.type !== psvTypeFilter) return false;
    if (psvPathFilter && r.path !== psvPathFilter) return false;
    if (psvStatusFilter && r.status !== psvStatusFilter) return false;
    if (q && !((r.name + ' ' + r.code + ' ' + r.pm + ' ' + r.org).toLowerCase().includes(q))) return false;
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
   .psv-toolbar input{flex:1;min-width:180px}
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
   .psv-bgt{font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;white-space:nowrap}
   .psv-bgt.ok{background:#dcfce7;color:#166534}
   .psv-bgt.wait{background:#fef3c7;color:#b45309}
   .psv-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
   .psv-link{border:1px solid #d1d5db;background:#fff;border-radius:7px;padding:5px 11px;font-size:12px;font-weight:700;color:#1d4ed8;cursor:pointer;font-family:inherit}
   .psv-link:hover{background:#eff6ff;border-color:#1d4ed8}
   .psv-note{font-size:11.5px;color:#94a3b8;margin-top:12px;line-height:1.6}
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
  const statusVals = Array.from(new Set(all.map(function (r) { return r.status; }))).filter(Boolean);
  const statusOpts = ['<option value="">전체 상태</option>'].concat(statusVals.map(function (s) {
    return '<option value="' + s + '"' + (s === psvStatusFilter ? ' selected' : '') + '>' + s + '</option>';
  })).join('');
  const pathOpts = [['', '전체 등록경로'], ['선행연계', '선행 자동연계'], ['개설승인', '개설 승인']]
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === psvPathFilter ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');

  const body = rows.length ? rows.map(function (r) {
    const pm = PSV_PATH_META[r.path];
    const scolor = PSV_STATUS_STYLE[r.status] || '#475569';
    const bgt = r.budgetReady
      ? '<span class="psv-bgt ok">예산수립 가능</span>'
      : '<span class="psv-bgt wait">승인 대기</span>';
    return '<tr>'
      + '<td><div class="psv-pname">' + r.name + '</div><div class="psv-code">' + r.code + '</div></td>'
      + '<td><span class="psv-tbadge" style="background:' + r.color + '">' + r.type + '</span></td>'
      + '<td><span class="psv-pbadge" style="background:' + pm.bg + ';color:' + pm.color + '">' + pm.label + '</span></td>'
      + '<td>' + r.pm + '</td>'
      + '<td>' + r.org + '</td>'
      + '<td style="white-space:nowrap;color:#64748b">' + r.period + '</td>'
      + '<td><span class="psv-sbadge" style="color:' + scolor + '">' + r.status + '</span></td>'
      + '<td>' + bgt + '</td>'
      + '<td><button class="psv-link" onclick="psvOpenDetail(\'' + r.type + '\',\'' + r.key + '\')">상세 조회</button></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="9" class="psv-empty">조건에 맞는 프로젝트가 없습니다.</td></tr>';

  host.innerHTML =
    '<div class="psv-wrap">'
    + '<div class="psv-head"><div><div class="psv-title">프로젝트 현황</div>'
    + '<div class="psv-sub">수주형·제안·W/G·사내·투자·선투입 전 유형을 통합 조회합니다. 등록경로·상태로 검색하고 상세로 이동하세요.</div></div></div>'
    + '<div class="psv-chips">' + chips + '</div>'
    + '<div class="psv-toolbar">'
    + '<input type="text" placeholder="프로젝트명·코드·PM·조직 검색" value="' + psvSearch.replace(/"/g, '&quot;') + '" oninput="psvOnSearch(this.value)">'
    + '<select onchange="psvOnType(this.value)">' + typeOpts + '</select>'
    + '<select onchange="psvOnPath(this.value)">' + pathOpts + '</select>'
    + '<select onchange="psvOnStatus(this.value)">' + statusOpts + '</select>'
    + '<button class="psv-btn" onclick="psvResetFilter()">초기화</button>'
    + '<button class="psv-btn pri" onclick="psvDownload()">목록 다운로드</button>'
    + '</div>'
    + '<table class="psv-table"><thead><tr>'
    + '<th>프로젝트</th><th>유형</th><th>등록경로</th><th>PM/담당</th><th>매출조직/신청부서</th><th>기간</th><th>상태</th><th>예산수립</th><th></th>'
    + '</tr></thead><tbody>' + body + '</tbody></table>'
    + '<div class="psv-note">※ W/G·사내 프로젝트는 <b>개설 승인 완료 전까지 수행원가 예산 수립이 불가</b>합니다. 개설 신청·승인은 좌측 메뉴 <b>프로젝트 개설 관리</b>에서 처리합니다.<br>'
    + '※ 상태값은 각 유형 원본 데이터를 그대로 표시하며, 승인 상태와 프로젝트 등록 상태는 별개 개념입니다.</div>'
    + '</div>';
}

// ── 이벤트 핸들러 ──
function psvOnSearch(v) { psvSearch = v; renderProjectStatus(); }
function psvOnType(v)   { psvTypeFilter = v; renderProjectStatus(); }
function psvOnStatus(v) { psvStatusFilter = v; renderProjectStatus(); }
function psvOnPath(v)   { psvPathFilter = v; renderProjectStatus(); }
function psvResetFilter() { psvSearch = ''; psvTypeFilter = ''; psvStatusFilter = ''; psvPathFilter = ''; renderProjectStatus(); }

// 상세 조회 — 해당 유형 전용 화면으로 이동 후 상세 열기
function psvOpenDetail(type, key) {
  const meta = PSV_TYPES.find(function (m) { return m.type === type; });
  if (!meta) return;
  if (typeof window[meta.show] === 'function') window[meta.show]();
  if (typeof window[meta.detail] === 'function') window[meta.detail](key);
  // 탭에 "프로젝트번호 + 명칭" 태깅 (+ 즐겨찾기용 재진입 서술자)
  try {
    const store = psvStore(meta.data);
    const p = store && store[key];
    if (p && typeof window.tabTagProject === 'function') {
      window.tabTagProject(p.code || '', p.name || '', { kind: 'psvDetail', type: type, key: key });
    }
  } catch (e) {}
}

// 목록 다운로드 — 목업 스텁
function psvDownload() {
  if (typeof showToast === 'function') showToast('프로젝트 현황 목록을 내려받습니다. (목업)');
}

// 진입점
function showProjectStatus() {
  if (typeof setNav === 'function') setNav('nav-project-status');
  if (typeof setScreen === 'function') setScreen('s-project-status');
  renderProjectStatus();
}

// 라우트 등록 (app.js 로드 뒤 실행되므로 전역 객체에 직접 추가)
if (typeof SCREEN_ROUTES !== 'undefined') SCREEN_ROUTES['s-project-status'] = 'project-status';
if (typeof ROUTE_ACTIONS !== 'undefined') ROUTE_ACTIONS['project-status'] = function () { showProjectStatus(); };
