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

function popenDetailHtml() {
  const a = POPEN_APPS[popenSelectedId];
  if (!a) { popenView = 'list'; return ''; }
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
  return '<div class="popen-wrap">'
    + '<button class="popen-btn" onclick="popenBackToList()">← 목록</button>'
    + '<div class="popen-card">'
    + '<div class="popen-dname">신규 프로젝트 개설 신청</div>'
    + '<div class="popen-sub" style="margin-top:4px">W/G·사내 프로젝트만 개설 신청할 수 있습니다. 신청 후 기안·승인 절차가 진행됩니다.</div>'
    + '<div class="popen-form">'
    + '<label>프로젝트 유형</label><select id="popen-f-type"><option value="W/G"' + (popenNewType === 'W/G' ? ' selected' : '') + '>W/G</option><option value="사내"' + (popenNewType === '사내' ? ' selected' : '') + '>사내</option></select>'
    + '<label>프로젝트명</label><input type="text" id="popen-f-name" placeholder="예: 2026년_○○ 고도화 W/G">'
    + '<label>신청부서</label><input type="text" id="popen-f-dept" placeholder="예: AX ERP사업부 1팀">'
    + '<label>수행기간</label><input type="text" id="popen-f-period" placeholder="예: 2026-11-01 ~ 2027-10-31">'
    + '<label>개설 사유/개요</label><textarea id="popen-f-overview" placeholder="개설 배경과 수행 범위를 입력하세요."></textarea>'
    + '</div>'
    + '<div class="popen-policy">※ 프로젝트 번호는 개설 승인 완료 후 등록 시점에 부여됩니다(정책 확정 전 임시). 승인 단계·권한은 추후 변경될 수 있습니다.</div>'
    + '<div style="display:flex;gap:8px;margin-top:18px">'
    + '<button class="popen-btn pri" onclick="popenSubmitNew()">개설 신청 등록</button>'
    + '<button class="popen-btn" onclick="popenBackToList()">취소</button>'
    + '</div></div></div>';
}

// ── 이벤트 핸들러 ──
function popenOnSearch(v) { popenSearch = v; renderProjectOpen(); }
function popenOnStatus(v) { popenStatusFilter = v; renderProjectOpen(); }
function popenOnType(v)   { popenTypeFilter = v; renderProjectOpen(); }
function popenResetFilter() { popenSearch = ''; popenStatusFilter = ''; popenTypeFilter = ''; renderProjectOpen(); }
function popenOpenDetail(id) {
  popenSelectedId = id; popenView = 'detail'; renderProjectOpen();
  // 탭에 "프로젝트번호 + 명칭" 태깅 (등록 전이면 번호 자리에 신청유형 표시)
  try {
    const a = POPEN_APPS[id];
    if (a && typeof window.tabTagProject === 'function') {
      const no = (a.regStatus === '등록완료' && a.projectNo) ? a.projectNo : ('개설·' + a.type);
      window.tabTagProject(no, a.name || '', { kind: 'popenDetail', id: id });
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
