// ════════════════════════════════════════
//  프로젝트 개설 관리 — W/G·사내 개설 신청·승인       작성: 수진
// ════════════════════════════════════════
//
// AI GUIDE: 프로젝트 개설 관리 화면입니다.
// - W/G·사내 프로젝트를 시작하기 위한 '개설 신청 → 기안·승인 → 등록' 절차를 처리합니다.
// - 수주형·제안·투자·선투입은 선행 시스템에서 자동 연계·등록되므로 이 화면에 개설 신청 버튼이 없습니다.
// - 용어 구분:
//     · 프로젝트 개설 = 승인을 요청하는 '업무 절차'
//     · 프로젝트 등록 = MIS에 정식 생성·등록되는 '결과'
//   → 승인 상태와 등록 상태는 별개 필드로 관리합니다.
// - 개설 신청 상태(5): 개설 신청 / 개설 승인 대기 / 개설 승인 완료 / 반려 / 프로젝트 등록 완료
// - 미확정 정책(승인 권한·결재 단계·프로젝트 번호 생성 시점)은 임시 구성이며 추후 변경 가능하도록 둡니다.

let popenView = 'list';    // 'list' | 'detail' | 'new'
let popenSelectedId = null;
let popenSearch = '';
let popenStatusFilter = '';
let popenTypeFilter = '';
let popenNewType = 'W/G';  // 신규 신청 유형
let popenNewSub = 'IV60_01';
let popenTab = 'info';     // 상세 탭: 'info' | 'approval'

// 신규 등록 세부 유형 — 리스트 박스에 1개만 노출
const POPEN_SUBTYPES = {
  'W/G':  [ ['WG00_01', 'WG00_01 운영 W/G'] ],
  '사내': [ ['IV60_01', 'IV60_01 사내-활동관리 (PreSales)'] ],
};

// 승인 상태(별개) — 등록 상태(별개)
const POPEN_APPROVAL = ['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려'];
const POPEN_STATUS_STYLE = {
  '개설 신청':       { bg:'#eff6ff', color:'#1d4ed8' },
  '개설 승인 대기':   { bg:'#fef3c7', color:'#b45309' },
  '개설 승인 완료':   { bg:'#dcfce7', color:'#166534' },
  '반려':            { bg:'#fee2e2', color:'#991b1b' },
  '프로젝트 등록 완료':{ bg:'#e0e7ff', color:'#3730a3' },
};

// 표시 상태 = 등록 완료면 '프로젝트 등록 완료', 아니면 승인 상태
function popenDisplayStatus(a) {
  return (a.regStatus === '등록완료') ? '프로젝트 등록 완료' : a.approvalStatus;
}

// ── 개설 신청 목업 데이터 (W/G·사내, 5개 상태 모두 포함) ──
const POPEN_APPS = {
  'OPN-001': {
    type:'W/G', name:'2026년_차세대 ERP 고도화 W/G', reqDept:'AX ERP사업부 1팀',
    requester:'류준서(21043)', requestDate:'2026-10-02 10:14',
    period:'2026-11-01 ~ 2027-10-31', overview:'차세대 ERP 전환 대비 W/G 선행 과제 수행을 위한 개설 신청.',
    approvalStatus:'개설 승인 대기', regStatus:'미등록', projectNo:'(승인 완료 후 부여)',
    steps:[
      { role:'기안', part:'PM',               name:'류준서(21043)', date:'2026-10-02 10:14', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'장재호(15025)', date:'2026-10-02 11:20', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'',                 status:'대기' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'',                 status:'대기' },
    ],
    rejectReason:'',
  },
  'OPN-002': {
    type:'사내', name:'26년 사내 AI 지식검색 플랫폼', reqDept:'(전사)IT운영팀',
    requester:'오세훈(13052)', requestDate:'2026-10-04 14:33',
    period:'2026-11-15 ~ 2027-06-30', overview:'사내 임직원 대상 AI 지식검색 플랫폼 구축을 위한 사내 프로젝트 개설 신청.',
    approvalStatus:'개설 신청', regStatus:'미등록', projectNo:'(승인 완료 후 부여)',
    steps:[
      { role:'기안', part:'신청자',  name:'오세훈(13052)', date:'2026-10-04 14:33', status:'기안' },
      { role:'협조', part:'운영팀장', name:'김도현(13004)', date:'',                 status:'대기' },
      { role:'승인', part:'담당임원', name:'권재준(60521)', date:'',                 status:'대기' },
    ],
    rejectReason:'',
  },
  'OPN-003': {
    type:'W/G', name:'2026년_보안관제 자동화 W/G', reqDept:'보안사업부',
    requester:'한지민(21088)', requestDate:'2026-09-20 09:05',
    period:'2026-10-15 ~ 2027-09-30', overview:'보안관제 업무 자동화 W/G 수행을 위한 개설 신청.',
    approvalStatus:'개설 승인 완료', regStatus:'미등록', projectNo:'(등록 처리 중)',
    steps:[
      { role:'기안', part:'PM',               name:'한지민(21088)', date:'2026-09-20 09:05', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'장재호(15025)', date:'2026-09-20 10:40', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'2026-09-21 09:12', status:'승인' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'2026-09-22 15:30', status:'승인' },
    ],
    rejectReason:'',
  },
  'OPN-004': {
    type:'사내', name:'26년 사내 그룹웨어 개편', reqDept:'(전사)IT운영팀',
    requester:'정우성(13071)', requestDate:'2026-09-12 16:20',
    period:'2026-10-01 ~ 2027-03-31', overview:'사내 그룹웨어 UX 개편을 위한 사내 프로젝트 개설 신청.',
    approvalStatus:'반려', regStatus:'미등록', projectNo:'-',
    steps:[
      { role:'기안', part:'신청자',  name:'정우성(13071)', date:'2026-09-12 16:20', status:'기안' },
      { role:'협조', part:'운영팀장', name:'김도현(13004)', date:'2026-09-13 09:40', status:'반려' },
      { role:'승인', part:'담당임원', name:'권재준(60521)', date:'',                 status:'대기' },
    ],
    rejectReason:'사업 범위·예산 규모 재검토 필요. 투자심의 선행 후 재신청 바랍니다.',
  },
  'OPN-005': {
    type:'W/G', name:'2026년_데이터레이크 구축 W/G', reqDept:'데이터사업부',
    requester:'이수연(21055)', requestDate:'2026-08-28 11:02',
    period:'2026-09-10 ~ 2027-08-31', overview:'전사 데이터레이크 구축 선행 W/G 수행을 위한 개설 신청.',
    approvalStatus:'개설 승인 완료', regStatus:'등록완료', projectNo:'70007588-D031',
    steps:[
      { role:'기안', part:'PM',               name:'이수연(21055)', date:'2026-08-28 11:02', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'장재호(15025)', date:'2026-08-28 13:15', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'2026-08-29 10:05', status:'승인' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'2026-08-30 14:48', status:'승인' },
    ],
    rejectReason:'',
  },
};

function popenInjectStyle() {
  if (document.getElementById('popen-style')) return;
  const st = document.createElement('style'); st.id = 'popen-style';
  st.textContent = `
   .popen-wrap{max-width:1120px;margin:0 auto;padding:4px 2px 40px}
   .popen-head{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px}
   .popen-title{font-size:21px;font-weight:900;color:#0f172a}
   .popen-sub{font-size:12.5px;color:#64748b;margin:2px 0 0;line-height:1.55}
   .popen-flow{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px}
   .popen-fstep{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#64748b;background:#f8fafc;border:1px solid #e5e7eb;border-radius:99px;padding:4px 11px}
   .popen-fstep i{font-style:normal;color:#cbd5e1}
   .popen-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:12px 0}
   .popen-toolbar input,.popen-toolbar select{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12.5px;font-family:inherit;color:#0f172a;background:#fff}
   .popen-toolbar input{flex:1;min-width:180px}
   .popen-btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 13px;font-size:12.5px;font-weight:700;color:#334155;cursor:pointer;font-family:inherit}
   .popen-btn:hover{border-color:#1d4ed8;color:#1d4ed8}
   .popen-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
   .popen-btn.pri:hover{background:#1742b0}
   .popen-btn.warn{background:#fff;border-color:#f59e0b;color:#b45309}
   .popen-btn.warn:hover{background:#fffbeb}
   .popen-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:12.5px}
   .popen-table th{background:#f8fafc;text-align:left;padding:11px 12px;font-weight:800;color:#475569;border-bottom:1px solid #e5e7eb;white-space:nowrap}
   .popen-table td{padding:11px 12px;border-bottom:1px solid #f1f5f9;color:#1f2937}
   .popen-table tr:last-child td{border-bottom:0}
   .popen-table tr:hover td{background:#f8faff}
   .popen-tbadge{display:inline-block;font-size:11px;font-weight:800;padding:2px 9px;border-radius:99px;white-space:nowrap}
   .popen-sbadge{display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;white-space:nowrap}
   .popen-regbadge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;background:#f1f5f9;color:#475569}
   .popen-regbadge.done{background:#e0e7ff;color:#3730a3}
   .popen-pname{font-weight:800;color:#0f172a}
   .popen-link{border:1px solid #d1d5db;background:#fff;border-radius:7px;padding:5px 11px;font-size:12px;font-weight:700;color:#1d4ed8;cursor:pointer;font-family:inherit}
   .popen-link:hover{background:#eff6ff;border-color:#1d4ed8}
   .popen-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
   .popen-note{font-size:11.5px;color:#94a3b8;margin-top:12px;line-height:1.6}
   /* 상세 */
   .popen-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px 22px;margin-top:14px}
   .popen-dtop{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;justify-content:space-between}
   .popen-dname{font-size:18px;font-weight:900;color:#0f172a}
   .popen-dmeta{display:grid;grid-template-columns:140px 1fr;gap:8px 14px;margin-top:16px;font-size:12.5px}
   .popen-dmeta dt{color:#64748b;font-weight:700}
   .popen-dmeta dd{color:#0f172a;margin:0;font-weight:600}
   .popen-steps{display:flex;flex-direction:column;gap:0;margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
   .popen-step{display:grid;grid-template-columns:70px 1fr 150px 80px;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px}
   .popen-step:last-child{border-bottom:0}
   .popen-step .r{font-weight:800;color:#334155}
   .popen-step .d{color:#94a3b8;font-size:11.5px}
   .popen-stt{font-weight:800;text-align:center;border-radius:99px;padding:3px 0;font-size:11px}
   .popen-stt.기안{background:#eff6ff;color:#1d4ed8}
   .popen-stt.승인{background:#dcfce7;color:#166534}
   .popen-stt.반려{background:#fee2e2;color:#991b1b}
   .popen-stt.대기{background:#f1f5f9;color:#94a3b8}
   .popen-reject{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;margin-top:14px;font-size:12.5px;color:#991b1b}
   .popen-sec{font-size:13px;font-weight:900;color:#0f172a;margin:18px 0 8px}
   /* 신규 폼 */
   .popen-form{display:grid;grid-template-columns:150px 1fr;gap:12px 14px;margin-top:14px;font-size:12.5px;align-items:center}
   .popen-form label{color:#475569;font-weight:700}
   .popen-form input,.popen-form select,.popen-form textarea{border:1px solid #d1d5db;border-radius:8px;padding:9px 11px;font-size:12.5px;font-family:inherit;color:#0f172a;width:100%;box-sizing:border-box}
   .popen-form textarea{min-height:72px;resize:vertical;grid-column:2}
   .popen-policy{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:11px 14px;margin-top:16px;font-size:12px;color:#92400e;line-height:1.6}
  `;
  document.head.appendChild(st);
}

const POPEN_TYPE_COLOR = { 'W/G':'#b45309', '사내':'#be185d' };

function popenFilter() {
  const q = popenSearch.trim().toLowerCase();
  return Object.keys(POPEN_APPS).map(function (k) {
    return Object.assign({ id: k }, POPEN_APPS[k]);
  }).filter(function (a) {
    if (popenTypeFilter && a.type !== popenTypeFilter) return false;
    if (popenStatusFilter && popenDisplayStatus(a) !== popenStatusFilter) return false;
    if (q && !((a.name + ' ' + a.reqDept + ' ' + a.requester).toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProjectOpen() {
  popenInjectStyle();
  const host = document.getElementById('s-project-open');
  if (!host) return;
  if (popenView === 'detail') { host.innerHTML = popenDetailHtml(); return; }
  if (popenView === 'new')    { host.innerHTML = popenNewHtml();    return; }

  const rows = popenFilter();
  const flow = ['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려 / 재신청', '프로젝트 등록 완료']
    .map(function (s, i) { return '<span class="popen-fstep">' + s + '</span>' + (i < 4 ? '<i>→</i>' : ''); }).join('');

  const statusOpts = ['<option value="">전체 상태</option>']
    .concat(['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려', '프로젝트 등록 완료'].map(function (s) {
      return '<option value="' + s + '"' + (s === popenStatusFilter ? ' selected' : '') + '>' + s + '</option>';
    })).join('');
  const typeOpts = [['', '전체 유형'], ['W/G', 'W/G'], ['사내', '사내']]
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === popenTypeFilter ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');

  const body = rows.length ? rows.map(function (a) {
    const disp = popenDisplayStatus(a);
    const ss = POPEN_STATUS_STYLE[disp] || POPEN_STATUS_STYLE['개설 신청'];
    const tc = POPEN_TYPE_COLOR[a.type] || '#64748b';
    const reg = a.regStatus === '등록완료'
      ? '<span class="popen-regbadge done">등록완료 · ' + a.projectNo + '</span>'
      : '<span class="popen-regbadge">미등록</span>';
    const reApply = a.approvalStatus === '반려'
      ? '<button class="popen-btn warn" style="padding:5px 10px;font-size:11.5px" onclick="popenReapply(\'' + a.id + '\')">재신청</button>' : '';
    return '<tr>'
      + '<td><div class="popen-pname">' + a.name + '</div><div style="font-size:11px;color:#94a3b8">' + a.reqDept + '</div></td>'
      + '<td><span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + a.type + '</span></td>'
      + '<td>' + a.requester + '</td>'
      + '<td style="color:#64748b">' + a.requestDate + '</td>'
      + '<td><span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + '">' + disp + '</span></td>'
      + '<td>' + reg + '</td>'
      + '<td style="white-space:nowrap"><button class="popen-link" onclick="popenOpenDetail(\'' + a.id + '\')">상세</button> ' + reApply + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="7" class="popen-empty">조건에 맞는 개설 신청이 없습니다.</td></tr>';

  host.innerHTML =
    '<div class="popen-wrap">'
    + '<div class="popen-head"><div><div class="popen-title">프로젝트 개설 관리</div>'
    + '<div class="popen-sub">W/G·사내 프로젝트의 개설 신청과 기안·승인을 처리합니다. 수주형·제안·투자·선투입은 선행 시스템에서 자동 등록되어 이 화면 대상이 아닙니다.</div></div></div>'
    + '<div class="popen-flow">' + flow + '</div>'
    + '<div class="popen-toolbar">'
    + '<input type="text" placeholder="프로젝트명·신청부서·신청자 검색" value="' + popenSearch.replace(/"/g, '&quot;') + '" oninput="popenOnSearch(this.value)">'
    + '<select onchange="popenOnType(this.value)">' + typeOpts + '</select>'
    + '<select onchange="popenOnStatus(this.value)">' + statusOpts + '</select>'
    + '<button class="popen-btn" onclick="popenResetFilter()">초기화</button>'
    + '<button class="popen-btn pri" onclick="popenNewApply()">+ 신규 개설 신청</button>'
    + '</div>'
    + '<table class="popen-table"><thead><tr>'
    + '<th>프로젝트</th><th>유형</th><th>신청자</th><th>신청일시</th><th>승인 상태</th><th>등록 상태</th><th></th>'
    + '</tr></thead><tbody>' + body + '</tbody></table>'
    + '<div class="popen-note">※ <b>개설</b>은 승인을 요청하는 업무 절차, <b>등록</b>은 MIS에 정식 생성되는 결과입니다. 두 상태는 별개로 관리됩니다.<br>'
    + '※ 승인 권한·결재 단계·프로젝트 번호 생성 시점은 정책 확정 전 임시 구성이며 추후 변경될 수 있습니다.</div>'
    + '</div>';
}

// ════════════════════════════════════════
//  W/G 상세 — 정보관리 / 비용승인 2탭 (캡처 반영)
// ════════════════════════════════════════
const POPEN_WGX_SEARCH = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const POPEN_WGV_STYLE = { '승인완료':{bg:'#dbeafe',color:'#1d4ed8'}, '승인요청':{bg:'#e0f2fe',color:'#0369a1'}, '저장':{bg:'#f1f5f9',color:'#64748b'} };
const POPEN_APV_STYLE = { '기안':{bg:'#dcfce7',color:'#166534'}, '승인':{bg:'#dcfce7',color:'#166534'}, '대기':{bg:'#f1f5f9',color:'#94a3b8'}, '반려':{bg:'#fef3c7',color:'#b45309'} };

// W/G 유형 3건의 비용·손익·결재선 상세 데이터
const POPEN_WGX = {
  // 보안관제 — 정보관리 캡처(작성/저장)
  'OPN-003': {
    code:'70007602-D001', name:'2026년_보안관제 자동화 W/G',
    contractType:'TC', contractDone:'Yes', customer:'공통(9999999999)',
    mainDept:'보안사업부', salesDept:'보안사업부', revDept:'보안사업부',
    wgLeader:'정우성', wgLeaderCode:'13071', pm:'한민석', pmCode:'20011',
    start:'2026-11-15', end:'2027-09-30', regDate:'2026-10-20', erpSend:'미전송', submitted:false,
    versions:[{v:'V1.0',date:'2026-10-20',status:'저장'}],
    costs:{
      인건비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:18,amt:144000000}},
      외주비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:6,amt:54000000}},
      재료비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:0}},
      경비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:6000000}},
    },
    pnl:{ 매출액:{base:0,prevA:0,afterB:230000000}, 매출원가:{base:0,prevA:0,afterB:204000000} },
    lines:[{rule:'W/G 비용 30억 미만',service:'N',rows:[
      {role:'기안',unit:'수행PM',approver:'한민석(20011)',status:'대기',date:'',opinion:'',fixed:true},
      {role:'협조',unit:'부문기획 담당자',approver:'박지훈(14022)',status:'대기',date:'',opinion:''},
      {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'대기',date:'',opinion:''},
      {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'대기',date:'',opinion:''},
    ]}],
    memo:'',
  },
  // 데이터레이크 — 정보관리 캡처(승인완료·비용변경, V2/V1)
  'OPN-005': {
    code:'70007588-D031', name:'2026년_데이터레이크 구축 W/G',
    contractType:'TC', contractDone:'Yes', customer:'공통(9999999999)',
    mainDept:'데이터사업부', salesDept:'데이터사업부', revDept:'데이터사업부',
    wgLeader:'이수연', wgLeaderCode:'21055', pm:'한민석', pmCode:'20011',
    start:'2026-09-10', end:'2027-08-31', regDate:'2026-08-28', erpSend:'전송', submitted:true,
    versions:[{v:'V2.0',date:'2026-10-11',status:'승인완료'},{v:'V1.0',date:'2026-08-30',status:'승인완료'}],
    costs:{
      인건비:{base:{mm:24,amt:192000000},prevA:{mm:24,amt:192000000},afterB:{mm:30,amt:240000000}},
      외주비:{base:{mm:10,amt:90000000},prevA:{mm:10,amt:90000000},afterB:{mm:10,amt:90000000}},
      재료비:{base:{mm:'-',amt:20000000},prevA:{mm:'-',amt:20000000},afterB:{mm:'-',amt:20000000}},
      경비:{base:{mm:'-',amt:8000000},prevA:{mm:'-',amt:8000000},afterB:{mm:'-',amt:10000000}},
    },
    pnl:{ 매출액:{base:470000000,prevA:470000000,afterB:520000000}, 매출원가:{base:310000000,prevA:310000000,afterB:360000000} },
    lines:[{rule:'W/G 비용 30억 미만',service:'Y',rows:[
      {role:'기안',unit:'수행PM',approver:'한민석(20011)',status:'기안',date:'2026-10-11 09:20',opinion:'데이터레이크 2차 확장 반영',fixed:true},
      {role:'협조',unit:'Account WG담당자',approver:'장재호(15025)',status:'승인',date:'2026-10-11 10:02',opinion:''},
      {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'승인',date:'2026-10-11 11:15',opinion:''},
      {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'승인',date:'2026-10-11 14:30',opinion:''},
    ]}],
    memo:'데이터레이크 2차 확장(인건비 6MM 증액). 고객사: 공통 / 서비스: 데이터플랫폼',
  },
  // 차세대 ERP — 비용승인 캡처(승인요청 + 반려 이력)
  'OPN-001': {
    code:'70007601-D001', name:'2026년_차세대 ERP 고도화 W/G',
    contractType:'TC', contractDone:'Yes', customer:'공통(9999999999)',
    mainDept:'AX ERP사업부', salesDept:'AX ERP사업부', revDept:'AX ERP사업부 1팀',
    wgLeader:'류준서', wgLeaderCode:'21043', pm:'한민석', pmCode:'20011',
    start:'2026-11-01', end:'2027-10-31', regDate:'2026-10-02', erpSend:'미전송', submitted:true,
    versions:[{v:'V1.0',date:'2026-10-02',status:'승인요청'}],
    costs:{
      인건비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:20,amt:160000000}},
      외주비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:4,amt:36000000}},
      재료비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:0}},
      경비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:4000000}},
    },
    pnl:{ 매출액:{base:0,prevA:0,afterB:240000000}, 매출원가:{base:0,prevA:0,afterB:200000000} },
    lines:[
      {rule:'W/G 비용 30억 미만',service:'Y',rows:[
        {role:'기안',unit:'수행PM',approver:'한민석(20011)',status:'기안',date:'2026-10-02 10:14',opinion:'차세대 ERP 전환 대비 W/G 선행 과제. 고객사: 공통 / 서비스: ERP 고도화',fixed:true},
        {role:'협조',unit:'Account WG담당자',approver:'장재호(15025)',status:'승인',date:'2026-10-02 11:20',opinion:''},
        {role:'협조',unit:'Account 팀장',approver:'김기선(15031)',status:'대기',date:'',opinion:''},
        {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'대기',date:'',opinion:''},
        {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'대기',date:'',opinion:''},
      ]},
      {rule:'W/G 비용 30억 미만',service:'N',reject:{by:'박지훈(14022)',text:'사업 범위/예산 규모 재검토 필요. 재료비 산정 근거 보완 후 다시 올려 주세요.'},rows:[
        {role:'기안',unit:'수행PM',approver:'한민석(20011)',status:'기안',date:'2026-09-12 16:20',opinion:'사내 그룹웨어 UX 개편. 고객사: 사내 / 서비스: 그룹웨어',fixed:true},
        {role:'협조',unit:'부문기획 담당자',approver:'박지훈(14022)',status:'반려',date:'2026-09-13 09:40',opinion:'사업 범위/예산 규모 재검토 필요. 재료비 산정 근거 보완 후 다시 올려 주세요.'},
        {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'대기',date:'',opinion:''},
        {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'대기',date:'',opinion:''},
      ]},
    ],
    memo:'사내 그룹웨어 UX 개편. 고객사: 사내 / 서비스: 그룹웨어',
  },
};

function pwNum(v){ return (typeof v==='number')?v:0; }
function pwAmt(v){ return (typeof v==='number' && v)?fmt(v):'0'; }
function pwMm(v){ return (v==='-'||v===''||v==null)?'-':v; }
function pwTotal(p){ return Object.keys(p.costs).reduce(function(s,k){return s+pwNum(p.costs[k].afterB.amt);},0); }

function popenWgxInjectStyle() {
  if (document.getElementById('popen-wgx-style')) return;
  const st = document.createElement('style'); st.id = 'popen-wgx-style';
  st.textContent = `
   .pwx-tabs{display:flex;gap:4px;border-bottom:1px solid #e2e8f0;margin-bottom:16px}
   .pwx-tab{flex:1;text-align:center;padding:12px 14px;font-size:14px;font-weight:700;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-bottom:none;cursor:pointer;border-radius:10px 10px 0 0}
   .pwx-tab.on{color:#1d4ed8;background:#fff;border-color:#cdd9f5;box-shadow:inset 0 -3px 0 #1d4ed8}
   .pwx-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;flex-wrap:wrap}
   .pwx-code{font-size:14px;font-weight:800;color:#64748b;padding-top:9px;white-space:nowrap}
   .pwx-name-wrap{flex:1;display:flex;align-items:center;gap:8px;min-width:200px}
   .pwx-name{flex:1;min-width:0;font-size:19px;font-weight:800;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-family:inherit}
   .pwx-name:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.12)}
   .pwx-badge{flex:0 0 auto;font-size:11px;font-weight:800;color:#6d28d9;background:#ede9fe;border-radius:6px;padding:4px 9px}
   .pwx-hbtns{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding-top:2px}
   .pwx-btn{font-size:13px;font-weight:700;border-radius:8px;padding:8px 14px;cursor:pointer;font-family:inherit;border:1px solid #d1d5db;background:#fff;color:#374151}
   .pwx-btn:hover{border-color:#1d4ed8;color:#1d4ed8}
   .pwx-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
   .pwx-btn.pri:hover{background:#1742b0;color:#fff}
   .pwx-info{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e8ecf3;border:1px solid #e8ecf3;border-radius:12px;overflow:hidden;margin-bottom:14px}
   .pwx-cell{background:#fff;padding:11px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
   .pwx-k{font-size:12px;color:#64748b;font-weight:600}
   .pwx-k .req{color:#94a3b8;margin-left:2px}
   .pwx-v{font-size:13.5px;color:#1e293b;font-weight:600;word-break:break-all}
   .pwx-vfield{display:flex;align-items:center;gap:6px}
   .pwx-vfield input{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:7px;padding:6px 9px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff}
   .pwx-vfield input:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.1)}
   .pwx-sbtn{flex:0 0 auto;width:28px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;background:#f8fafc;color:#94a3b8;border-radius:7px;cursor:pointer}
   .pwx-sbtn:hover{border-color:#1d4ed8;color:#1d4ed8}
   .pwx-vers{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
   .pwx-vchip{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#334155;background:#fff;border:1px solid #cdd9f5;border-radius:99px;padding:5px 12px}
   .pwx-vchip .vb{font-size:11px;font-weight:800;border-radius:99px;padding:2px 8px}
   .pwx-total{font-size:15px;color:#334155;margin:4px 0 12px}
   .pwx-total b{font-size:20px;color:#1e293b;font-weight:900;margin:0 4px}
   .pwx-sec{font-size:14px;font-weight:800;color:#0f172a;margin:0 0 8px}
   .pwx-tblwrap{overflow-x:auto;border:1px solid #e8ecf3;border-radius:12px;margin-bottom:18px}
   .pwx-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}
   .pwx-tbl th,.pwx-tbl td{border-bottom:1px solid #eef1f6;border-right:1px solid #eef1f6;padding:9px 10px;text-align:right}
   .pwx-tbl th:last-child,.pwx-tbl td:last-child{border-right:none}
   .pwx-tbl thead th{background:#f3f6fc;color:#475569;font-weight:800;text-align:center;border-bottom:1px solid #e2e8f0}
   .pwx-tbl .lab{text-align:left;font-weight:700;color:#334155;background:#fafbfe}
   .pwx-tbl .grp-b{background:#f6f9ff}
   .pwx-tbl td.grp-b{background:#fbfdff}
   .pwx-tbl .diff{color:#1e293b;font-weight:700}
   .pwx-tbl .muted{color:#cbd5e1}
   .pwx-tbl .total td{background:#eef2fb;font-weight:900;color:#0f172a;border-top:2px solid #cdd9f5}
   .pwx-cin{width:92px;max-width:100%;text-align:right;border:1px solid #cdd9f5;border-radius:6px;padding:5px 7px;font-size:12.5px;font-family:inherit;background:#f6f9ff;color:#1e293b}
   .pwx-cin.mm{width:52px}
   .pwx-cin:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 2px rgba(29,78,216,.14)}
   .pwx-apvblock{border:1px solid #e8ecf3;border-radius:12px;padding:12px 14px;margin-bottom:14px}
   .pwx-apv-head{display:flex;gap:8px;align-items:center;margin:2px 0 8px;flex-wrap:wrap}
   .pwx-apv-label{font-size:13px;font-weight:800;color:#0f172a;margin-right:4px}
   .pwx-chip{font-size:12px;font-weight:700;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:99px;padding:4px 10px}
   .pwx-apv{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}
   .pwx-apv th,.pwx-apv td{border-bottom:1px solid #eef1f6;padding:9px 12px;text-align:left}
   .pwx-apv thead th{background:#f3f6fc;color:#475569;font-weight:800;border-bottom:1px solid #e2e8f0}
   .pwx-stbadge{display:inline-block;font-size:11px;font-weight:800;border-radius:99px;padding:2px 10px}
   .pwx-chg{font-size:11px;font-weight:700;border:1px solid #d1d5db;background:#fff;color:#475569;border-radius:6px;padding:3px 8px;margin-left:6px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;vertical-align:middle}
   .pwx-chg:hover{border-color:#1d4ed8;color:#1d4ed8}
   .pwx-reject{margin-top:8px;font-size:12.5px;color:#b45309;background:#fff8ed;border:1px solid #fde4bf;border-radius:8px;padding:10px 12px}
   .pwx-memo textarea{width:100%;min-height:72px;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;color:#1e293b;resize:vertical;box-sizing:border-box}
   .pwx-memo textarea:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.1)}
   @media(max-width:720px){ .pwx-info{grid-template-columns:1fr 1fr} }
  `;
  document.head.appendChild(st);
}

function popenWgDetailHtml(id) {
  popenWgxInjectStyle();
  const p = POPEN_WGX[id];
  return '<div class="popen-wrap">'
    + '<div class="pwx-tabs">'
    + '<div class="pwx-tab ' + (popenTab==='info'?'on':'') + '" onclick="popenWgTab(\'info\')">◉ W/G 정보관리</div>'
    + '<div class="pwx-tab ' + (popenTab==='approval'?'on':'') + '" onclick="popenWgTab(\'approval\')">◉ W/G 비용승인</div>'
    + '</div>'
    + (popenTab==='info' ? popenWgInfoTab(id,p) : popenWgApprovalTab(id,p))
    + '</div>';
}

function popenWgInfoTab(id, p) {
  const btns = p.submitted
    ? '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgStub(\'비용변경\')">비용변경</button><button class="pwx-btn pri" onclick="popenWgTab(\'approval\')">결재선생성</button>'
    : '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgStub(\'삭제\')">삭제</button><button class="pwx-btn pri" onclick="popenWgStub(\'저장\')">저장</button><button class="pwx-btn pri" onclick="popenWgTab(\'approval\')">결재생성</button>';

  const fld = function (k, v, req, search) {
    return '<div class="pwx-cell"><div class="pwx-k">' + k + (req?'<span class="req">*</span>':'') + '</div>'
      + (search
        ? '<div class="pwx-vfield"><input value="' + String(v||'').replace(/"/g,'&quot;') + '"><button class="pwx-sbtn" onclick="popenWgStub(\'' + k + ' 검색\')">' + POPEN_WGX_SEARCH + '</button></div>'
        : '<div class="pwx-v">' + (v||'-') + '</div>') + '</div>';
  };
  const info = [
    fld('계약유형', p.contractType), fld('계약완료여부', p.contractDone), fld('고객사', p.customer),
    fld('주 수행부서', p.mainDept, false, true), fld('영업부서', p.salesDept, false, true), fld('매출귀속부서', p.revDept, true, true),
    fld('W/G리더', p.wgLeader+'('+p.wgLeaderCode+')', false, true), fld('수행PM', p.pm+'('+p.pmCode+')', true, true), fld('프로젝트착수일', p.start),
    fld('프로젝트종료일', p.end), fld('등록일', p.regDate), fld('ERP 전송', p.erpSend),
  ].join('');

  const vers = p.versions.map(function (v,i) {
    const vs = POPEN_WGV_STYLE[v.status] || {bg:'#eef2fb',color:'#1d4ed8'};
    return '<span class="pwx-vchip"' + (i===0?'':' style="border-color:#e2e8f0;color:#64748b"') + '>' + v.v + ' &nbsp;' + v.date
      + '<span class="vb" style="background:' + vs.bg + ';color:' + vs.color + '">' + v.status + '</span></span>';
  }).join('');

  return '<div class="pwx-head"><div class="pwx-code">' + p.code + '</div>'
    + '<div class="pwx-name-wrap"><input class="pwx-name" value="' + p.name.replace(/"/g,'&quot;') + '"><span class="pwx-badge">W/G</span></div>'
    + '<div class="pwx-hbtns">' + btns + '</div></div>'
    + '<div class="pwx-info">' + info + '</div>'
    + '<div class="pwx-vers">' + vers + '</div>'
    + '<div class="pwx-total">총 비용 <b>' + fmt(pwTotal(p)) + '</b> 원</div>'
    + '<div class="pwx-sec">W/G 비용정보</div>' + popenWgCostTable(id,p)
    + '<div class="pwx-sec">W/G 손익정보</div>' + popenWgPnlTable(id,p);
}

function popenWgCostTable(id, p) {
  const accts = Object.keys(p.costs);
  const rowHtml = accts.map(function (a) {
    const c = p.costs[a];
    const diffMm = (typeof c.afterB.mm==='number' && typeof c.prevA.mm==='number') ? (c.afterB.mm-c.prevA.mm) : '-';
    const diffAmt = pwNum(c.afterB.amt) - pwNum(c.prevA.amt);
    const mmEd = (c.afterB.mm!=='-');
    return '<tr><td class="lab">' + a + '</td>'
      + '<td>' + pwMm(c.base.mm) + '</td><td>' + pwAmt(c.base.amt) + '</td>'
      + '<td>' + pwMm(c.prevA.mm) + '</td><td>' + pwAmt(c.prevA.amt) + '</td>'
      + '<td class="grp-b">' + (mmEd ? '<input class="pwx-cin mm" value="' + c.afterB.mm + '" onchange="popenWgCostEdit(\'' + id + '\',\'' + a + '\',\'mm\',this.value)">' : '<span class="muted">-</span>') + '</td>'
      + '<td class="grp-b"><input class="pwx-cin" value="' + pwNum(c.afterB.amt) + '" onchange="popenWgCostEdit(\'' + id + '\',\'' + a + '\',\'amt\',this.value)"></td>'
      + '<td class="diff">' + (diffMm==='-'?'<span class="muted">-</span>':diffMm) + '</td>'
      + '<td class="diff">' + fmt(diffAmt) + '</td></tr>';
  }).join('');
  const sum = function (k) { return accts.reduce(function (s,a) { return s+pwNum(p.costs[a][k].amt); },0); };
  const sumMm = function (k) { return accts.reduce(function (s,a) { return s+(typeof p.costs[a][k].mm==='number'?p.costs[a][k].mm:0); },0); };
  const tB=sum('base'),tP=sum('prevA'),tA=sum('afterB'), tBm=sumMm('base'),tPm=sumMm('prevA'),tAm=sumMm('afterB');
  return '<div class="pwx-tblwrap"><table class="pwx-tbl">'
    + '<thead><tr><th rowspan="2" class="lab">구분</th><th colspan="2">최초</th><th colspan="2">변경 전(A)</th><th colspan="2" class="grp-b">변경 후(B)</th><th colspan="2">증감(B-A)</th></tr>'
    + '<tr><th>M/M</th><th>금액</th><th>M/M</th><th>금액</th><th class="grp-b">M/M</th><th class="grp-b">금액</th><th>M/M</th><th>금액</th></tr></thead>'
    + '<tbody>' + rowHtml
    + '<tr class="total"><td class="lab">합계</td><td>' + (tBm||'-') + '</td><td>' + fmt(tB) + '</td><td>' + (tPm||'-') + '</td><td>' + fmt(tP) + '</td>'
    + '<td class="grp-b">' + (tAm||'-') + '</td><td class="grp-b">' + fmt(tA) + '</td><td>' + ((tAm-tPm)||'-') + '</td><td>' + fmt(tA-tP) + '</td></tr>'
    + '</tbody></table></div>';
}

function popenWgPnlTable(id, p) {
  const rev=p.pnl.매출액, cogs=p.pnl.매출원가;
  const pct = function (r,c) { return r>0 ? ((r-c)/r*100) : 0; };
  const mrow = function (label, v, key) {
    return '<tr><td class="lab">' + label + '</td><td>' + pwAmt(v.base) + '</td><td>' + pwAmt(v.prevA) + '</td>'
      + '<td class="grp-b"><input class="pwx-cin" value="' + pwNum(v.afterB) + '" onchange="popenWgPnlEdit(\'' + id + '\',\'' + key + '\',this.value)"></td>'
      + '<td class="diff">' + fmt(pwNum(v.afterB)-pwNum(v.prevA)) + '</td></tr>';
  };
  return '<div class="pwx-tblwrap"><table class="pwx-tbl" style="min-width:560px">'
    + '<thead><tr><th class="lab">구분</th><th>최초</th><th>변경 전(A)</th><th class="grp-b">변경 후(B)</th><th>증감(B-A)</th></tr></thead>'
    + '<tbody>' + mrow('매출액',rev,'매출액') + mrow('매출원가',cogs,'매출원가')
    + '<tr class="total"><td class="lab">매출마진</td><td>' + pct(rev.base,cogs.base).toFixed(1) + '%</td><td>' + pct(rev.prevA,cogs.prevA).toFixed(1) + '%</td>'
    + '<td class="grp-b">' + pct(rev.afterB,cogs.afterB).toFixed(1) + '%</td><td class="diff">' + (pct(rev.afterB,cogs.afterB)-pct(rev.prevA,cogs.prevA)).toFixed(1) + '%p</td></tr>'
    + '</tbody></table></div>';
}

function popenWgApprovalTab(id, p) {
  const btns = p.submitted
    ? '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgTab(\'info\')">← 정보관리</button><button class="pwx-btn" onclick="popenWgStub(\'기안취소\')">기안취소</button>'
    : '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgTab(\'info\')">← 정보관리</button><button class="pwx-btn pri" onclick="popenWgStub(\'승인요청\')">승인요청</button>';

  const mini = '<div class="pwx-info">'
    + '<div class="pwx-cell"><div class="pwx-k">영업부서</div><div class="pwx-v">' + p.salesDept + '</div></div>'
    + '<div class="pwx-cell"><div class="pwx-k">매출귀속부서</div><div class="pwx-v">' + p.revDept + '</div></div>'
    + '<div class="pwx-cell"><div class="pwx-k">W/G리더</div><div class="pwx-v">' + p.wgLeader + '(' + p.wgLeaderCode + ')</div></div>'
    + '<div class="pwx-cell"><div class="pwx-k">수행PM</div><div class="pwx-v">' + p.pm + '(' + p.pmCode + ')</div></div>'
    + '<div class="pwx-cell"><div class="pwx-k">프로젝트시작일</div><div class="pwx-v">' + p.start + '</div></div>'
    + '<div class="pwx-cell"><div class="pwx-k">프로젝트종료일</div><div class="pwx-v">' + p.end + '</div></div></div>';

  const vers = p.versions.map(function (v) {
    const vs = POPEN_WGV_STYLE[v.status] || {bg:'#eef2fb',color:'#1d4ed8'};
    return '<span class="pwx-vchip">' + v.v + ' &nbsp;' + v.date + '<span class="vb" style="background:' + vs.bg + ';color:' + vs.color + '">' + v.status + '</span></span>';
  }).join('');

  const blocks = p.lines.map(popenWgApvLine).join('');

  return '<div class="pwx-head"><div class="pwx-code">' + p.code + '</div>'
    + '<div class="pwx-name-wrap"><div class="pwx-name" style="border:none;padding-left:0">' + p.name + '</div><span class="pwx-badge">W/G</span></div>'
    + '<div class="pwx-hbtns">' + btns + '</div></div>'
    + mini + '<div class="pwx-vers">' + vers + '</div>' + blocks
    + '<div class="pwx-memo"><div class="pwx-sec">메모</div><textarea placeholder="비용출예 신규등록 및 변경 사유 (해당 고객사 및 서비스 명시)">' + (p.memo||'') + '</textarea></div>';
}

function popenWgApvLine(line) {
  const rows = line.rows.map(function (r) {
    const s = POPEN_APV_STYLE[r.status] || POPEN_APV_STYLE['대기'];
    const chg = (!r.fixed && r.status==='대기') ? '<button class="pwx-chg" onclick="popenWgStub(\'결재자 변경\')">' + POPEN_WGX_SEARCH + ' 변경</button>' : '';
    return '<tr><td>' + r.role + '</td><td>' + r.unit + '</td><td>' + r.approver + chg + '</td>'
      + '<td><span class="pwx-stbadge" style="background:' + s.bg + ';color:' + s.color + '">' + r.status + '</span></td>'
      + '<td>' + (r.date||'-') + '</td><td style="color:#475569">' + (r.opinion||'-') + '</td></tr>';
  }).join('');
  const reject = line.reject ? '<div class="pwx-reject"><b>반려</b> ' + line.reject.by + ' — ' + line.reject.text + '</div>' : '';
  return '<div class="pwx-apvblock"><div class="pwx-apv-head"><span class="pwx-apv-label">결재선</span>'
    + '<span class="pwx-chip">전결 규정: ' + line.rule + '</span><span class="pwx-chip">서비스기획 ' + line.service + '</span></div>'
    + '<div class="pwx-tblwrap" style="margin-bottom:0;border:none"><table class="pwx-apv">'
    + '<thead><tr><th>구분</th><th>결재 단위</th><th>결재자</th><th>상태</th><th>처리일시</th><th>의견</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>' + reject + '</div>';
}

function popenWgTab(t) { popenTab = t; renderProjectOpen(); }
function popenWgCostEdit(id, acct, field, val) {
  const p = POPEN_WGX[id]; if (!p) return;
  p.costs[acct].afterB[field] = Number(String(val).replace(/,/g,'')) || 0;
  renderProjectOpen();
}
function popenWgPnlEdit(id, key, val) {
  const p = POPEN_WGX[id]; if (!p) return;
  p.pnl[key].afterB = Number(String(val).replace(/,/g,'')) || 0;
  renderProjectOpen();
}
function popenWgStub(label) { if (typeof showToast === 'function') showToast(label + ' (목업)'); }

function popenDetailHtml() {
  const a = POPEN_APPS[popenSelectedId];
  if (!a) { popenView = 'list'; return ''; }
  // W/G 유형이면서 상세 데이터가 있으면 정보관리/비용승인 2탭으로 표시
  if (a.type === 'W/G' && POPEN_WGX[popenSelectedId]) return popenWgDetailHtml(popenSelectedId);
  const disp = popenDisplayStatus(a);
  const ss = POPEN_STATUS_STYLE[disp] || POPEN_STATUS_STYLE['개설 신청'];
  const tc = POPEN_TYPE_COLOR[a.type] || '#64748b';
  const steps = a.steps.map(function (s) {
    return '<div class="popen-step"><span class="r">' + s.role + '</span>'
      + '<span>' + s.part + ' · ' + s.name + '</span>'
      + '<span class="d">' + (s.date || '—') + '</span>'
      + '<span class="popen-stt ' + s.status + '">' + s.status + '</span></div>';
  }).join('');
  const reject = a.approvalStatus === '반려'
    ? '<div class="popen-reject"><b>반려 사유</b><br>' + (a.rejectReason || '(사유 미기재)') + '</div>' : '';
  const reApplyBtn = a.approvalStatus === '반려'
    ? '<button class="popen-btn warn" onclick="popenReapply(\'' + a.id + '\')">반려 건 재신청</button>' : '';
  const reg = a.regStatus === '등록완료'
    ? '<span class="popen-regbadge done">등록완료 · ' + a.projectNo + '</span>'
    : '<span class="popen-regbadge">미등록 (' + a.projectNo + ')</span>';

  return '<div class="popen-wrap">'
    + '<button class="popen-btn" onclick="popenBackToList()">← 목록</button>'
    + '<div class="popen-card">'
    + '<div class="popen-dtop"><div><span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + a.type + '</span> '
    + '<span class="popen-dname">' + a.name + '</span></div>'
    + '<span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + ';font-size:12.5px;padding:5px 14px">' + disp + '</span></div>'
    + '<dl class="popen-dmeta">'
    + '<dt>신청부서</dt><dd>' + a.reqDept + '</dd>'
    + '<dt>신청자</dt><dd>' + a.requester + '</dd>'
    + '<dt>신청일시</dt><dd>' + a.requestDate + '</dd>'
    + '<dt>수행기간</dt><dd>' + a.period + '</dd>'
    + '<dt>승인 상태</dt><dd>' + a.approvalStatus + '</dd>'
    + '<dt>등록 상태</dt><dd>' + reg + '</dd>'
    + '<dt>개요</dt><dd>' + a.overview + '</dd>'
    + '</dl>'
    + reject
    + '<div class="popen-sec">기안·승인 진행</div>'
    + '<div class="popen-steps">' + steps + '</div>'
    + '<div class="popen-policy">※ 승인 권한·결재 단계 구성, 프로젝트 번호 생성 시점은 <b>정책 확정 전 임시 구성</b>입니다. '
    + '현재는 개설 승인 완료 후 등록 처리 시점에 프로젝트 번호를 부여하는 흐름으로 가정합니다(추후 변경 가능).</div>'
    + '<div style="display:flex;gap:8px;margin-top:16px">' + reApplyBtn + '</div>'
    + '</div></div>';
}

function popenNewHtml() {
  const req = ' <span style="color:#94a3b8">*</span>';
  const EMPTY = '<div></div><div></div>';
  const typeSel = '<select id="popen-f-type" onchange="popenNewType=this.value;renderProjectOpen()"><option' + (popenNewType==='W/G'?' selected':'') + '>W/G</option><option' + (popenNewType==='사내'?' selected':'') + '>사내</option></select>';
  const svcSel = '<select id="popen-f-service"><option>Y</option><option>N</option></select>';
  const srch = function (id, kind) {
    const opener = (kind === 'org') ? 'popenOpenOrgSearch' : 'popenOpenMemberSearch';
    return '<div style="display:flex;gap:6px;align-items:center">'
      + '<input type="text" id="' + id + '" style="flex:1;min-width:0">'
      + '<button class="popen-btn" style="flex:0 0 auto;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0;color:#94a3b8" onclick="' + opener + '(\'' + id + '\')">' + POPEN_WGX_SEARCH + '</button></div>';
  };
  const txt = function (id, ph) { return '<input type="text" id="' + id + '"' + (ph?' placeholder="'+ph+'"':'') + '>'; };
  const cell = function (label, field) { return '<label>' + label + '</label>' + field; };

  // 유형(W/G·사내) 선택 — 사내면 세부유형 추가
  const cells = [ cell('유형' + req, typeSel) ];
  if (popenNewType === '사내') {
    const subs = POPEN_SUBTYPES['사내'];
    const subOpts = subs.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
    cells.push(cell('사내 세부 유형' + req, '<select id="popen-f-sub">' + subOpts + '</select>'));
  }
  // 상세 정보 입력
  cells.push(cell('서비스기획여부' + req, svcSel));
  cells.push(cell('프로젝트번호', '<input type="text" id="popen-f-code" value="' + popenNextWgNo() + '" readonly title="시스템 자동 생성" style="background:#f1f5f9;color:#64748b;cursor:not-allowed">'));
  cells.push(cell('프로젝트명' + req, txt('popen-f-name', '프로젝트명 입력')));
  cells.push(cell('수행PM' + req, srch('popen-f-pm', 'member')));
  cells.push(cell('매출귀속부서' + req, srch('popen-f-revdept', 'org')));
  cells.push(cell('PJT 시작일' + req, '<input type="date" id="popen-f-start">'));
  cells.push(cell('PJT 종료일' + req, '<input type="date" id="popen-f-end">'));
  cells.push(cell('영업부서', srch('popen-f-salesdept', 'org')));
  cells.push(EMPTY);
  cells.push(cell('Account담당자', srch('popen-f-accmgr', 'member')));
  cells.push(cell('Account팀장', srch('popen-f-accteam', 'member')));
  cells.push(cell('인건비 투입MM', txt('popen-f-laborMM', '0')));
  cells.push(cell('인건비', txt('popen-f-labor', '0')));
  cells.push(cell('외주비 투입MM', txt('popen-f-outMM', '0')));
  cells.push(cell('외주비', txt('popen-f-out', '0')));
  cells.push(cell('재료비', txt('popen-f-material', '0')));
  cells.push(cell('경비', txt('popen-f-expense', '0')));
  cells.push(cell('예산금액', txt('popen-f-budget', '0')));

  const grid = '<div class="popen-form" style="grid-template-columns:116px 1fr 116px 1fr;gap:12px 18px;align-items:center;margin-top:2px">' + cells.join('') + '</div>';

  return '<div class="popen-wrap">'
    + '<div class="popen-head" style="display:flex;justify-content:space-between;align-items:flex-start;width:100%">'
    + '<div><div class="popen-title">W/G / 사내 프로젝트 신규 등록</div>'
    + '<div class="popen-sub">유형(W/G·사내)을 고르면 상세 정보를 입력합니다. 등록하면 상태 \'저장\'으로 만들어지고, 정보관리에서 결재선생성 → 승인요청을 합니다.</div></div>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="popen-btn" onclick="popenBackToList()">취소</button>'
    + '<button class="popen-btn pri" onclick="popenRegisterNew()">등록</button>'
    + '</div></div>'
    + '<div class="popen-card">' + grid + '</div></div>';
}

// 프로젝트번호 — 시스템 자동 시퀀스(사용자 입력 아님)
function popenNextWgNo() {
  let max = 70007602;
  try {
    Object.keys(POPEN_WGX).forEach(function (k) { const m = /^(\d+)/.exec(POPEN_WGX[k].code || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  } catch (e) {}
  return (max + 1) + '-D001';
}

function popenRegisterNew() {
  const name = (document.getElementById('popen-f-name') || {}).value || '';
  if (!name.trim()) { if (typeof showToast === 'function') showToast('프로젝트명은 필수입니다.'); return; }
  if (typeof showToast === 'function') showToast('신규 W/G/사내 프로젝트가 등록(상태 \'저장\')되었습니다. 정보관리에서 결재선생성 → 승인요청하세요. (목업)');
  popenView = 'list'; renderProjectOpen();
}

// ── 등록 폼 돋보기 검색 팝업 (project-status.js의 PSV 데이터·모달 재사용) ──
let popenSrchTarget = null;
let popenMemKw = '', popenMemMode = 'name', popenMemPick = '', popenMemFiltered = [];
let popenOrgKw = '', popenOrgPick = '', popenOrgExpanded = null;

function popenPickField(name) { const el = document.getElementById(popenSrchTarget); if (el) el.value = name; psvCloseModal(); }

// 구성원 검색 (수행PM / Account담당자 / Account팀장)
function popenOpenMemberSearch(targetId) {
  popenSrchTarget = targetId; popenMemKw = ''; popenMemMode = 'name'; popenMemPick = '';
  psvShowModal('구성원 검색'); popenRenderMember();
}
function popenMemKwSet(v) { popenMemKw = v; }
function popenMemModeSet(m) { popenMemMode = m; popenRenderMember(); }
function popenMemClick(i) { const r = popenMemFiltered[i]; if (r) { popenMemPick = r.empno; popenRenderMember(); } }
function popenMemConfirm(i) { const r = popenMemFiltered[i]; if (r) popenPickField(r.name); }
function popenMemSelect() { const r = popenMemFiltered.find(function (m) { return m.empno === popenMemPick; }); if (!r) { if (typeof showToast === 'function') showToast('구성원을 선택하세요.'); return; } popenPickField(r.name); }
function popenRenderMember() {
  const kw = popenMemKw.trim().toLowerCase();
  const field = popenMemMode === 'empno' ? 'empno' : 'name';
  popenMemFiltered = PSV_MEMBERS.filter(function (m) { return !kw || String(m[field]).toLowerCase().includes(kw); });
  const rows = popenMemFiltered.length ? popenMemFiltered.map(function (m, i) {
    return '<tr class="' + (m.empno === popenMemPick ? 'sel' : '') + '" onclick="popenMemClick(' + i + ')" ondblclick="popenMemConfirm(' + i + ')"><td>' + m.name + '</td><td>' + m.empno + '</td><td>' + m.title + '</td><td>' + m.dept + '</td></tr>';
  }).join('') : '<tr><td colspan="4" class="psv-md-empty">검색 결과가 없습니다.</td></tr>';
  document.getElementById('psv-md-body').innerHTML =
    '<div class="psv-md-tools"><div class="psv-md-radio">'
    + '<label><input type="radio" name="popmm" ' + (popenMemMode==='name'?'checked':'') + ' onclick="popenMemModeSet(\'name\')">이름</label>'
    + '<label><input type="radio" name="popmm" ' + (popenMemMode==='empno'?'checked':'') + ' onclick="popenMemModeSet(\'empno\')">사번</label>'
    + '</div><div class="psv-md-srch"><input id="psv-md-search" type="text" placeholder="검색어 입력 후 Enter" value="' + psvEsc(popenMemKw) + '" oninput="popenMemKwSet(this.value)" onkeydown="if(event.key===\'Enter\')popenRenderMember()"><button onclick="popenRenderMember()">' + PSV_SEARCH_ICON + '</button></div></div>'
    + '<table class="psv-mt"><thead><tr><th>이름</th><th>사번</th><th>직책</th><th>부서</th></tr></thead><tbody>' + rows + '</tbody></table>';
  document.getElementById('psv-md-foot').innerHTML = '<button class="popen-btn pri" onclick="popenMemSelect()">선택</button><button class="popen-btn" onclick="psvCloseModal()">취소</button>';
}

// 조직 검색 (매출귀속부서 / 영업부서)
function popenOpenOrgSearch(targetId) {
  popenSrchTarget = targetId; popenOrgKw = ''; popenOrgPick = '';
  popenOrgExpanded = { 'SK주식회사 AX': true, 'AX 사장': true, 'CAIO': true };
  psvShowModal('조직 검색'); popenRenderOrg();
}
function popenOrgKwSet(v) { popenOrgKw = v; }
function popenOrgToggle(name) { popenOrgExpanded[name] = !popenOrgExpanded[name]; popenRenderOrg(); }
function popenOrgClick(name) { popenOrgPick = name; popenRenderOrg(); }
function popenOrgDbl(name) { popenPickField(name); }
function popenOrgSelect() { if (!popenOrgPick) { if (typeof showToast === 'function') showToast('조직을 선택하세요.'); return; } popenPickField(popenOrgPick); }
function popenOrgNodeHtml(node, depth, kw) {
  if (!psvOrgMatch(node, kw)) return '';
  const hasKids = node.children && node.children.length;
  const expanded = kw ? true : !!popenOrgExpanded[node.name];
  const safe = node.name.replace(/'/g, "\\'");
  const tog = hasKids
    ? '<span class="psv-ttog" onclick="event.stopPropagation();popenOrgToggle(\'' + safe + '\')">' + (expanded ? '−' : '+') + '</span>'
    : '<span class="psv-tspace"></span>';
  let html = '<div class="psv-tnode ' + (node.name === popenOrgPick ? 'sel' : '') + '" style="padding-left:' + (depth*16+4) + 'px" onclick="popenOrgClick(\'' + safe + '\')" ondblclick="popenOrgDbl(\'' + safe + '\')">' + tog + '<span>' + node.name + '</span></div>';
  if (hasKids && expanded) html += node.children.map(function (c) { return popenOrgNodeHtml(c, depth+1, kw); }).join('');
  return html;
}
function popenRenderOrg() {
  const kw = popenOrgKw.trim().toLowerCase();
  const tree = popenOrgNodeHtml(PSV_ORG_TREE, 0, kw) || '<div class="psv-md-empty">검색 결과가 없습니다.</div>';
  document.getElementById('psv-md-body').innerHTML =
    '<div class="psv-md-tools"><div class="psv-md-srch"><input id="psv-md-search" type="text" placeholder="조직명 검색 후 Enter" value="' + psvEsc(popenOrgKw) + '" oninput="popenOrgKwSet(this.value)" onkeydown="if(event.key===\'Enter\')popenRenderOrg()"><button onclick="popenRenderOrg()">' + PSV_SEARCH_ICON + '</button></div></div>'
    + '<div class="psv-tree">' + tree + '</div>';
  document.getElementById('psv-md-foot').innerHTML = '<button class="popen-btn pri" onclick="popenOrgSelect()">선택</button><button class="popen-btn" onclick="psvCloseModal()">취소</button>';
}

// ── 이벤트 핸들러 ──
function popenOnSearch(v) { popenSearch = v; renderProjectOpen(); }
function popenOnStatus(v) { popenStatusFilter = v; renderProjectOpen(); }
function popenOnType(v)   { popenTypeFilter = v; renderProjectOpen(); }
function popenResetFilter() { popenSearch = ''; popenStatusFilter = ''; popenTypeFilter = ''; renderProjectOpen(); }
function popenOpenDetail(id) {
  const desc = { kind: 'popenDetail', id: id };
  // 프로젝트는 새 탭으로(이미 열린 프로젝트면 그 탭 포커스)
  if (typeof window.tabOpenProjectHint === 'function') window.tabOpenProjectHint(desc);
  if (typeof setScreen === 'function') setScreen('s-project-open');
  popenSelectedId = id; popenView = 'detail'; popenTab = 'info'; renderProjectOpen();
  // 탭에 "프로젝트번호 + 명칭" 태깅 (등록 전이면 번호 자리에 신청유형 표시)
  try {
    const a = POPEN_APPS[id];
    if (a && typeof window.tabTagProject === 'function') {
      const no = (a.regStatus === '등록완료' && a.projectNo) ? a.projectNo : ('개설·' + a.type);
      window.tabTagProject(no, a.name || '', desc);
    }
  } catch (e) {}
}
function popenBackToList() { popenView = 'list'; renderProjectOpen(); }
function popenNewApply() { popenView = 'new'; renderProjectOpen(); }

function popenSubmitNew() {
  const name = (document.getElementById('popen-f-name') || {}).value || '';
  if (!name.trim()) { if (typeof showToast === 'function') showToast('프로젝트명을 입력하세요.'); return; }
  // 목업 스텁: 실제 저장 없이 안내만
  if (typeof showToast === 'function') showToast('개설 신청이 등록되었습니다. 기안·승인 절차가 진행됩니다. (목업)');
  popenView = 'list'; renderProjectOpen();
}
function popenReapply(id) {
  if (typeof showToast === 'function') showToast('반려 건을 재신청합니다. 신청 내용을 수정해 다시 상신하세요. (목업)');
  popenNewType = (POPEN_APPS[id] && POPEN_APPS[id].type) || 'W/G';
  popenView = 'new'; renderProjectOpen();
}

// 진입점
function showProjectOpen() {
  if (typeof setNav === 'function') setNav('nav-project-open');
  if (typeof setScreen === 'function') setScreen('s-project-open');
  popenView = 'list';
  renderProjectOpen();
}

// 라우트 등록 (app.js 로드 뒤 실행)
if (typeof SCREEN_ROUTES !== 'undefined') SCREEN_ROUTES['s-project-open'] = 'project-open';
if (typeof ROUTE_ACTIONS !== 'undefined') ROUTE_ACTIONS['project-open'] = function () { showProjectOpen(); };
