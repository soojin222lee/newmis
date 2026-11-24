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
// - [2026.11.16 합침 · 남주] 수진 버전(W/G 상세 정보관리 · 비용승인 2탭, 신규 등록폼, 돋보기 검색, 번호 자동생성)을 기준으로
//   남주 버전(feature/nj, 현행 W/G관리 기준)에만 있던 기능을 붙였습니다.
//     · 목록: 체크박스 · 엑셀 업로드(오류 행 표시 · 오류 팝업) · ⬇ 엑셀 · 템플릿 · 선택삭제 · 선택등록(등록 후 올린 행 정리) · 확인창
//     · 정보관리 / 비용승인 탭: 저장 · 삭제 · 비용변경(새 버전) · 승인요청(메모 필수) · 기안취소 를 실제로 동작(이전엔 안내 토스트만)
// - [2026.11.24 · 남주] W/G 담당 부서 개선의견 회신(구현 예정 항목) 반영
//     · 5번 검색 조건에 Account 담당자 추가 (popenF.acc · popenAccMgr)
//     · 6번 목록에 프로젝트 상태(수행/종료) 표시 — 등록 완료된 프로젝트만, 종료일 기준 (popenPrjSts)
//     · 9번 목록에 최종승인일자 추가 — 개설 승인·비용변경 승인 중 가장 최근 승인일 (popenLastApproval)

let popenView = 'list';    // 'list' | 'detail' | 'new'
let popenChecked = {};     // 목록 체크 (엑셀 업로드 행은 'U0', 'U1' …)
let popenUploaded = [];    // 엑셀로 올렸지만 아직 등록 안 한 행
let popenErrPopup = null;  // 업로드 오류 팝업 대상 행 index
let popenConfirm = null;   // 확인 창 { msg, ok }
let popenSelectedId = null;
let popenSearch = '';
let popenF = popenFBlank();   // 검색 패널 — [조회] 시 적용된 조건
let popenKind = 'W/G';     // [석완 로컬] 목록 탭: 'W/G' | '사내-전사IT운영' | '사내-활동관리'
let popenStatusFilter = '';
let popenTypeFilter = '';
let popenNewType = 'W/G';  // 신규 신청 유형 — POPEN_KINDS 중 하나
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
    approvalStatus:'개설 승인 대기', regStatus:'미등록', projectNo:'(승인 완료 후 부여)', accMgr:'장재호(15025)',
    steps:[
      { role:'기안', part:'PM',               name:'류준서(21043)', date:'2026-10-02 10:14', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'장재호(15025)', date:'2026-10-02 11:20', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'',                 status:'대기' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'',                 status:'대기' },
    ],
    rejectReason:'',
  },
  'OPN-002': {
    type:'사내', sub:'전사IT운영', name:'26년 사내 AI 지식검색 플랫폼', reqDept:'(전사)IT운영팀',
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
    approvalStatus:'개설 승인 완료', regStatus:'미등록', projectNo:'(등록 처리 중)', accMgr:'이강혁(09753)',
    steps:[
      { role:'기안', part:'PM',               name:'한지민(21088)', date:'2026-09-20 09:05', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'이강혁(09753)', date:'2026-09-20 10:40', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'2026-09-21 09:12', status:'승인' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'2026-09-22 15:30', status:'승인' },
    ],
    rejectReason:'',
  },
  'OPN-004': {
    type:'사내', sub:'전사IT운영', name:'26년 사내 그룹웨어 개편', reqDept:'(전사)IT운영팀',
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
    approvalStatus:'개설 승인 완료', regStatus:'등록완료', projectNo:'70007588-D031', accMgr:'장재호(15025)',
    steps:[
      { role:'기안', part:'PM',               name:'이수연(21055)', date:'2026-08-28 11:02', status:'기안' },
      { role:'협조', part:'Account WG담당자', name:'장재호(15025)', date:'2026-08-28 13:15', status:'승인' },
      { role:'검토', part:'팀장',              name:'신성호(13016)', date:'2026-08-29 10:05', status:'승인' },
      { role:'승인', part:'담당임원',          name:'권재준(60521)', date:'2026-08-30 14:48', status:'승인' },
    ],
    rejectReason:'',
  },
  // [석완 로컬] 프로젝트 상태 '종료' 예시용 W/G
  'OPN-006': {
    type:'W/G', name:'2025년_MES 운영 안정화 W/G', reqDept:'AI사업부',
    requester:'송하경(03749)', requestDate:'2025-06-02 09:30',
    period:'2025-07-01 ~ 2026-06-30', overview:'MES 운영 안정화 W/G 수행을 위한 개설 신청.',
    approvalStatus:'개설 승인 완료', regStatus:'등록완료', projectNo:'70007411-D002',
    steps:[], rejectReason:'',
  },
  // [석완 로컬] 사내-활동관리 예시
  'OPN-007': {
    type:'사내', sub:'활동관리', name:'26년 제조 AI PreSales 활동', reqDept:'AI사업부',
    requester:'이수연(21055)', requestDate:'2026-11-10 15:20',
    period:'2026-11-17 ~ 2027-01-31', overview:'제조 고객 대상 AI 제안 PreSales 활동 비용 관리를 위한 사내 프로젝트 개설 신청.',
    approvalStatus:'개설 승인 대기', regStatus:'미등록', projectNo:'(승인 완료 후 부여)',
    steps:[
      { role:'기안', part:'신청자',  name:'이수연(21055)', date:'2026-11-10 15:20', status:'기안' },
      { role:'협조', part:'운영팀장', name:'김도현(13004)', date:'2026-11-11 09:10', status:'승인' },
      { role:'승인', part:'담당임원', name:'권재준(60521)', date:'',                 status:'대기' },
    ],
    rejectReason:'',
  },
};

// ── [2026.11.24] 목록 표시값 — Account 담당자 · 프로젝트 상태 · 최종승인일자 ──
// 결재선 행 펼치기 — 상세 결재선은 [{rows:[…]}] 묶음과 행 배열 두 모양이 섞여 있음
function popenWho(v) {
  const m = /^(.*?)\((.+)\)$/.exec(String(v || ''));
  return m ? m[1] + '<span class="popen-l2">' + m[2] + '</span>' : String(v || '');
}
function popenWhen(v) {
  const p = String(v || '').split(' ');
  return p[0] + (p[1] ? '<span class="popen-l2">' + p[1] + '</span>' : '');
}
function popenLineRows(id) {
  const w = (typeof POPEN_WGX !== 'undefined' && POPEN_WGX[id]) || null;
  if (!w || !w.lines) return [];
  return w.lines.reduce(function (acc, l) { return acc.concat(l.rows || [l]); }, []);
}
// Account 담당자 — 신청 데이터 → 개설 결재선 → 상세 결재선 순으로 찾음. 사내 프로젝트는 없음('')
function popenAccMgr(a, id) {
  if (a.accMgr) return a.accMgr;
  const s = (a.steps || []).find(function (x) { return /Account/.test(x.part || ''); });
  if (s) return s.name;
  const r = popenLineRows(id).find(function (x) { return /Account WG/.test(x.unit || ''); });
  return r ? r.approver : '';
}
// 프로젝트 상태(TC) — 등록 완료된 프로젝트만. 종료일이 지났으면 '종료', 아니면 '수행'. 등록 전이면 ''
function popenPrjSts(a, id) {
  if (a.regStatus !== '등록완료') return '';
  const w = (typeof POPEN_WGX !== 'undefined' && POPEN_WGX[id]) || {};
  const end = String(w.end || String(a.period || '').split('~')[1] || '').trim();
  const today = new Date().toISOString().slice(0, 10);
  return (end && end < today) ? '종료' : '수행';
}
// 최종승인일자 — 개설 승인 · 비용변경 승인 중 '승인' 단계가 승인된 가장 최근 날짜. 없으면 ''
function popenLastApproval(a, id) {
  const ds = (a.steps || []).filter(function (x) { return x.role === '승인' && x.status === '승인' && x.date; }).map(function (x) { return x.date; })
    .concat(popenLineRows(id).filter(function (x) { return x.role === '승인' && x.status === '승인' && x.date; }).map(function (x) { return x.date; }));
  return ds.length ? ds.sort().pop().slice(0, 10) : '';
}

function popenInjectStyle() {
  if (document.getElementById('popen-style')) return;
  const st = document.createElement('style'); st.id = 'popen-style';
  st.textContent = `
   .popen-wrap{max-width:none;margin:0;padding:4px 2px 40px}   /* [석완 로컬] 폭 제한(1120px) 해제 — 화면 전체 폭 사용 */
   .popen-head{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px}
   .popen-title{font-size:21px;font-weight:900;color:#0f172a}
   .popen-sub{font-size:12.5px;color:#64748b;margin:2px 0 0;line-height:1.55}
   .popen-flow{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px}
   .popen-fstep{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#64748b;background:#f8fafc;border:1px solid #e5e7eb;border-radius:99px;padding:4px 11px}
   .popen-fstep i{font-style:normal;color:#cbd5e1}
   .popen-search{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:12px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto;gap:10px 14px;align-items:end}
   .popen-sf label{display:block;font-size:11.5px;font-weight:800;color:#475569;margin-bottom:4px}
   .popen-sf input,.popen-sf select{width:100%;height:34px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:0 10px;font-size:12.5px;font-family:inherit;color:#0f172a;background:#fff}
   .popen-sf input[readonly]{cursor:pointer}
   .popen-sfin{display:flex;gap:6px}
   .popen-sfic{flex:0 0 34px;height:34px;border:1px solid #d1d5db;border-radius:8px;background:#f8fafc;color:#475569;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
   .popen-sfic:hover{background:#eef2f7}
   .popen-psts{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:800;white-space:nowrap}
   .popen-psts.run{background:#e0f2fe;color:#0369a1}
   .popen-psts.end{background:#f1f5f9;color:#475569}
   .popen-dash{color:#cbd5e1}
   #s-project-open .popen-table td{padding:10px 9px;white-space:nowrap;vertical-align:middle}
   #s-project-open .popen-table th{padding:11px 9px}
   #s-project-open .popen-table td.popen-tdname{white-space:normal;min-width:190px}
   .popen-l2{display:block;font-size:12px;color:#94a3b8;margin-top:2px;font-weight:500}
   .popen-sbtns{display:flex;flex-direction:column;gap:6px;grid-column:5;grid-row:1 / span 2;align-self:center}
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
   /* [합침] 엑셀 업로드 · 선택등록/삭제 · 확인창 (남주 버전) */
   .popen-btn.del{border-color:#fca5a5;color:#b91c1c}
   .popen-btn.xls{border-color:#86efac;color:#166534}
   .popen-gbar{display:flex;align-items:center;gap:6px;margin:4px 0 8px;flex-wrap:wrap}
   .popen-gbar .cnt{font-size:12.5px;color:#475569;margin-right:auto}
   .popen-gbar .cnt b{color:#1d4ed8}
   .popen-guide{font-size:11.5px;color:#64748b;margin:0 0 8px}
   .popen-table tr.err td{background:#fef9c3}
   .popen-table tr.new td{background:#f0fdf4}
   .popen-errbtn{border:1px solid #f59e0b;background:#fff7ed;color:#b45309;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:800;cursor:pointer}
   .popen-mask{position:fixed;inset:0;background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;z-index:9000}
   .popen-modal{background:#fff;border-radius:12px;min-width:340px;max-width:620px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
   .popen-mhead{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:900;font-size:14px}
   .popen-mhead button{margin-left:auto;border:0;background:none;font-size:16px;cursor:pointer;color:#64748b}
   .popen-mbody{padding:16px;font-size:13px;color:#0f172a;line-height:1.6}
   .popen-mbody ul{margin:0;padding-left:18px}
   .popen-mfoot{display:flex;justify-content:center;gap:8px;padding:0 16px 16px}
   /* [석완 로컬] W/G · 사내 탭 */
   .popen-ktabs{display:flex;gap:4px;border-bottom:1px solid #e2e8f0;margin:14px 0 4px}
   .popen-ktab{padding:10px 22px;font-size:13.5px;font-weight:800;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-bottom:none;border-radius:10px 10px 0 0;cursor:pointer}
   .popen-ktab.on{color:#1d4ed8;background:#fff;border-color:#cdd9f5;box-shadow:inset 0 -3px 0 #1d4ed8}
   .popen-table td.num,.popen-table th.num{text-align:right;white-space:nowrap}
   .popen-pstat{display:inline-block;font-size:11px;font-weight:800;padding:2px 9px;border-radius:99px;white-space:nowrap}
   .popen-pstat.run{background:#dcfce7;color:#166534}
   .popen-pstat.end{background:#e5e7eb;color:#374151}
   /* W/G 목록 — 가로 스크롤 없음: 고정 칸 너비 + 줄바꿈 + 작은 글자 */
   .popen-wgt{table-layout:fixed;width:100%;font-size:11.5px}
   .popen-wgt th,.popen-wgt td{padding:7px 4px !important;font-size:11px !important;line-height:1.4;white-space:normal !important;word-break:keep-all;overflow-wrap:anywhere;vertical-align:middle}
   .popen-wgt th{font-size:10.5px !important}
   .popen-wgt td.nb{white-space:nowrap !important;overflow-wrap:normal;letter-spacing:-.2px}
   .popen-wgt td:first-child,.popen-wgt th:first-child{text-align:center}
   .popen-wgt .popen-pname{font-size:11.5px}
   .popen-wgt .popen-sbadge,.popen-wgt .popen-pstat,.popen-wgt .popen-regbadge{white-space:normal;font-size:10.5px;padding:2px 7px;line-height:1.3}
   .popen-wgt .popen-link{padding:3px 6px;font-size:11px;white-space:nowrap}
   .popen-wgt td.code{overflow-wrap:normal;word-break:normal;letter-spacing:-.2px}
   @media(max-width:880px){ .popen-wgt td.nb{white-space:normal !important;overflow-wrap:anywhere;font-size:10.5px !important} .popen-wgt .popen-link{padding:2px 2px;font-size:10px} .popen-wgt td:last-child,.popen-wgt th:last-child{padding-left:2px !important;padding-right:2px !important} }
   .popen-wgt .popen-btn.warn{margin-top:4px}
   /* [석완 로컬] 목록 데이터 가운데 정렬 (W/G · 사내 공통) */
   .popen-wgt th,.popen-wgt td,.popen-inht th,.popen-inht td{text-align:center !important}
   /* 사내 2탭(전사IT운영·활동관리) — 칸 너비 고정으로 탭을 바꿔도 필드 위치 동일 */
   .popen-inht{table-layout:fixed;width:100%}
   .popen-inht th,.popen-inht td{vertical-align:middle;word-break:keep-all;overflow-wrap:anywhere}
   .popen-inht th{white-space:normal;font-size:12px}
   .popen-inht td{font-size:12.5px}   /* main.css 전역 tbody td 17px 덮기 — W/G 목록과 글자 크기 맞춤 */
   .popen-inht .popen-pname{font-size:13px}
   .popen-search,.popen-gbar{min-width:0}
   .popen-search .popen-sf{min-width:0}
   .popen-search4{grid-template-columns:repeat(4,minmax(0,1fr)) auto}
   .popen-search4 .popen-sbtns{grid-column:5}
   .popen-range{display:flex;align-items:center;gap:4px}
   .popen-range input{min-width:0}
   .popen-range span{color:#94a3b8;font-weight:700}
   @media(max-width:1100px){ .popen-search4{grid-template-columns:repeat(2,minmax(0,1fr)) auto} .popen-search4 .popen-sbtns{grid-column:3;grid-row:1 / span 4} }
   /* [석완 로컬] 프로젝트 개설 관리 화면에서는 우측 하단 AI 플로팅 아이콘 숨김 (공유 app.js 미수정) */
   body:has(#s-project-open.active) #ai-chat-fab{display:none !important}
  `;
  document.head.appendChild(st);
}

const POPEN_TYPE_COLOR = { 'W/G':'#b45309', '사내':'#be185d' };

function popenFilter() {
  const f = popenF, low = function (s) { return String(s || '').toLowerCase(); };
  return Object.keys(POPEN_APPS).map(function (k) {
    return Object.assign({ id: k }, POPEN_APPS[k]);
  }).filter(function (a) {
    const wg = (typeof POPEN_WGX !== 'undefined' && POPEN_WGX[a.id]) || {};
    if (f.no && !low((wg.code || '') + ' ' + a.projectNo).includes(low(f.no.trim()))) return false;
    if (f.nm && !low(a.name).includes(low(f.nm.trim()))) return false;
    if (popenKind && popenTypeOf(a) !== popenKind) return false;   // [석완 로컬] W/G · 사내-전사IT운영 · 사내-활동관리 탭 분리
    if (f.pm && !low((wg.pm || '') + ' ' + a.requester).includes(low(f.pm.trim()))) return false;
    if (f.acc && !low(wg.accMgr || popenAccMgr(a, a.id)).includes(low(f.acc.trim()))) return false;   // 목록 표시값과 같은 순서(상세 → 신청 → 결재선)
    if (f.date && String(a.requestDate || '').slice(0, 10) !== f.date) return false;
    // [석완 로컬] W/G 목록 — 등록일·최종승인일자 기간, 프로젝트 상태
    const regD = wg.regDate || String(a.requestDate || '').slice(0, 10);
    if (f.dFrom && regD < f.dFrom) return false;
    if (f.dTo && regD > f.dTo) return false;
    if (f.aFrom || f.aTo) {
      const apv = popenFinalApvDate(a.id);
      if (!apv || (f.aFrom && apv < f.aFrom) || (f.aTo && apv > f.aTo)) return false;
    }
    if (f.pst && popenProjState(wg.end || String(a.period || '').split('~')[1]) !== f.pst) return false;
    if (f.type && a.type !== f.type) return false;
    if (f.sts && popenDisplayStatus(a) !== f.sts) return false;
    return true;
  });
}

// [석완 로컬] 사내 목록 칸 너비(%) — 합 100: 체크 · 프로젝트 · 유형 · 신청자 · 신청일시 · 승인 상태 · 등록 상태 · 상세
const POPEN_INHT_COLS = ['4%', '28%', '12%', '12%', '13%', '11%', '12%', '8%'];
function renderProjectOpen() {
  popenInjectStyle();
  const host = document.getElementById('s-project-open');
  if (!host) return;
  if (popenView === 'detail') { host.innerHTML = popenDetailHtml() + popenModalHtml(); return; }
  if (popenView === 'new')    { host.innerHTML = popenNewHtml() + popenModalHtml();    return; }
  if (popenKind === 'W/G')    { host.innerHTML = popenWgListHtml() + popenModalHtml(); return; }

  const rows = popenFilter();
  const flow = ['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려 / 재신청', '프로젝트 등록 완료']
    .map(function (s, i) { return '<span class="popen-fstep">' + s + '</span>' + (i < 4 ? '<i>→</i>' : ''); }).join('');

  const statusOpts = ['<option value="">전체</option>']
    .concat(['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려', '프로젝트 등록 완료'].map(function (s) {
      return '<option value="' + s + '"' + (s === popenF.sts ? ' selected' : '') + '>' + s + '</option>';
    })).join('');

  const body = rows.length ? rows.map(function (a) {
    const disp = popenDisplayStatus(a);
    const ss = POPEN_STATUS_STYLE[disp] || POPEN_STATUS_STYLE['개설 신청'];
    const tc = POPEN_TYPE_COLOR[a.type] || '#64748b';
    const reg = a.regStatus === '등록완료'
      ? '<span class="popen-regbadge done">등록완료</span><span class="popen-l2">' + a.projectNo + '</span>'
      : '<span class="popen-regbadge">미등록</span>';
    const reApply = a.approvalStatus === '반려'
      ? '<button class="popen-btn warn" style="padding:5px 10px;font-size:11.5px" onclick="popenReapply(\'' + a.id + '\')">재신청</button>' : '';
    return '<tr>'
      + '<td><input type="checkbox"' + (popenChecked[a.id] ? ' checked' : '') + ' onclick="popenCheck(\'' + a.id + '\',this.checked)"></td>'
      + '<td class="popen-tdname"><div class="popen-pname">' + a.name + '</div><div style="font-size:11px;color:#94a3b8">' + a.reqDept + '</div></td>'
      + '<td><span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + popenTypeOf(a) + '</span></td>'
      + '<td>' + popenWho(a.requester) + '</td>'
      + '<td style="color:#64748b">' + popenWhen(a.requestDate) + '</td>'
      + '<td><span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + '">' + disp + '</span></td>'
      + '<td>' + reg + '</td>'
      + '<td style="white-space:nowrap"><button class="popen-link" onclick="popenOpenDetail(\'' + a.id + '\')">상세</button> ' + reApply + '</td>'
      + '</tr>';
  }).join('') : (popenUploaded.length ? '' : '<tr><td colspan="8" class="popen-empty">조건에 맞는 개설 신청이 없습니다.</td></tr>');
  // [합침] 엑셀로 올린 행 — 목록 맨 위. 오류 행도 체크해 [선택삭제]할 수 있고, [선택등록]은 오류 행을 건너뜀
  const up = popenUploaded.map(function (r, i) {
    const err = r.errors.length > 0;
    return '<tr class="' + (err ? 'err' : 'new') + '">'
      + '<td><input type="checkbox"' + (popenChecked['U' + i] ? ' checked' : '') + ' onclick="popenCheck(\'U' + i + '\',this.checked)"></td>'
      + '<td class="popen-tdname"><div class="popen-pname">' + popenEsc(r.name) + '</div><div style="font-size:11px;color:#94a3b8">엑셀 업로드 · ' + popenEsc(r.no) + '</div></td>'
      + '<td><span class="popen-tbadge" style="background:#b4530922;color:#b45309">W/G</span></td>'
      + '<td>' + popenEsc(r.pm) + (r.pmNo ? '(' + popenEsc(r.pmNo) + ')' : '') + '</td><td style="color:#64748b">-</td><td style="color:#64748b">-</td>'
      + '<td>' + (err ? '<button class="popen-errbtn" onclick="popenShowErr(' + i + ')">오류</button>' : '<span class="popen-regbadge">등록 전</span>') + '</td>'
      + '<td></td><td></td><td></td><td></td></tr>';
  }).join('');
  // [석완 로컬] 엑셀 업로드 행은 W/G 전용 — 사내 탭에서는 숨김 (W/G 목록 popenWgListHtml에서 표시)
  const total = rows.length;

  host.innerHTML =
    '<div class="popen-wrap">'
    + '<div class="popen-head"><div><div class="popen-title">프로젝트 개설 관리</div>'
    + '<div class="popen-sub">W/G·사내 프로젝트의 개설 신청과 기안·승인을 처리합니다. 수주형·제안·투자·선투입은 선행 시스템에서 자동 등록되어 이 화면 대상이 아닙니다.</div></div></div>'
    + popenKindTabsHtml()
    + '<div class="popen-flow">' + flow + '</div>'
    // [복원 2026.11.17] 검색 패널 — 프로젝트번호 · 프로젝트명 · PM(사원 검색) / 등록일 · 유형 · 상태 + [조회][초기화]
    + '<div class="popen-search">'
    + '<div class="popen-sf"><label>프로젝트번호</label><input id="popen-f-no" value="' + popenEsc(popenF.no) + '" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + '<div class="popen-sf"><label>프로젝트명</label><input id="popen-f-nm" value="' + popenEsc(popenF.nm) + '" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + '<div class="popen-sf"><label>PM</label><div class="popen-sfin"><input id="popen-f-pm" readonly placeholder="사원 검색" value="' + popenEsc(popenF.pm) + '" onclick="popenOpenMemberSearch(\'popen-f-pm\')">'
    + '<button class="popen-sfic" title="사원 검색" onclick="popenOpenMemberSearch(\'popen-f-pm\')">' + POPEN_WGX_SEARCH + '</button></div></div>'
    + '<div class="popen-sbtns"><button class="popen-btn pri" onclick="popenDoSearch()">조회</button><button class="popen-btn" onclick="popenResetFilter()">초기화</button></div>'
    + '<div class="popen-sf"><label>등록일</label><input id="popen-f-date" type="date" value="' + popenEsc(popenF.date) + '"></div>'
    + '<div class="popen-sf"><label>상태</label><select id="popen-f-sts">' + statusOpts + '</select></div>'
    + '</div>'
    + '<div class="popen-gbar"><span class="cnt">총 <b>' + total + '</b> 건</span>'
    + '<button class="popen-btn pri" onclick="popenNewType=popenKind;popenNewApply()">+ 신규 개설 신청</button></div>'
    + '<table class="popen-table popen-inht"><colgroup>' + POPEN_INHT_COLS.map(function (w) { return '<col style="width:' + w + '">'; }).join('') + '</colgroup><thead><tr>'
    + '<th></th><th>프로젝트</th><th>유형</th><th>신청자</th><th>신청일시</th><th>승인 상태</th><th>등록 상태</th><th></th>'
    + '</tr></thead><tbody>' + (rows.length ? body : '<tr><td colspan="8" class="popen-empty">조건에 맞는 개설 신청이 없습니다.</td></tr>') + '</tbody></table>'
    + '<div class="popen-note">※ <b>개설</b>은 승인을 요청하는 업무 절차, <b>등록</b>은 MIS에 정식 생성되는 결과입니다. 두 상태는 별개로 관리됩니다.<br>'
    + '※ 승인 권한·결재 단계·프로젝트 번호 생성 시점은 정책 확정 전 임시 구성이며 추후 변경될 수 있습니다.</div>'
    + '</div>' + popenModalHtml();
}

// ════════════════════════════════════════
//  W/G 상세 — 정보관리 / 비용승인 2탭 (캡처 반영)
// ════════════════════════════════════════
const POPEN_WGX_SEARCH = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const POPEN_WGV_STYLE = { '승인완료':{bg:'#dbeafe',color:'#1d4ed8'}, '승인요청':{bg:'#e0f2fe',color:'#0369a1'}, '저장':{bg:'#f1f5f9',color:'#64748b'}, '기안취소':{bg:'#e5e7eb',color:'#374151'}, '반려':{bg:'#fee2e2',color:'#991b1b'} };
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
    accMgr:'이봄', accMgrCode:'10822', execBudget:null,
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
    accMgr:'이충섭', accMgrCode:'04794', execBudget:352000000,
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
    accMgr:'이강혁', accMgrCode:'09753', execBudget:null,
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
        {role:'기안',unit:'수행PM',approver:'한민석(20011)',status:'기안',date:'2026-09-12 16:20',opinion:'차세대 ERP 전환 대비 W/G 선행 과제(1차 상신). 고객사: 공통 / 서비스: ERP 고도화',fixed:true},
        {role:'협조',unit:'부문기획 담당자',approver:'박지훈(14022)',status:'반려',date:'2026-09-13 09:40',opinion:'사업 범위/예산 규모 재검토 필요. 재료비 산정 근거 보완 후 다시 올려 주세요.'},
        {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'대기',date:'',opinion:''},
        {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'대기',date:'',opinion:''},
      ]},
    ],
    memo:'차세대 ERP 전환 대비 W/G 선행 과제. 고객사: 공통 / 서비스: ERP 고도화',
  },  // [석완 로컬] 프로젝트 상태 '종료' 예시 — 종료일이 지난 등록 완료 W/G
  'OPN-006': {
    code:'70007411-D002', name:'2025년_MES 운영 안정화 W/G',
    contractType:'TC', contractDone:'Yes', customer:'공통(9999999999)',
    mainDept:'AI사업부', salesDept:'AI사업부', revDept:'AI사업부',
    wgLeader:'송하경', wgLeaderCode:'03749', pm:'김종원', pmCode:'11108',
    start:'2025-07-01', end:'2026-06-30', regDate:'2025-06-02', erpSend:'전송', submitted:true,
    accMgr:'송하경', accMgrCode:'03749', execBudget:128000000,
    versions:[{v:'V1.0',date:'2025-06-04',status:'승인완료'}],
    costs:{
      인건비:{base:{mm:12,amt:96000000},prevA:{mm:12,amt:96000000},afterB:{mm:12,amt:96000000}},
      외주비:{base:{mm:3,amt:27000000},prevA:{mm:3,amt:27000000},afterB:{mm:3,amt:27000000}},
      재료비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:0}},
      경비:{base:{mm:'-',amt:5000000},prevA:{mm:'-',amt:5000000},afterB:{mm:'-',amt:5000000}},
    },
    pnl:{ 매출액:{base:150000000,prevA:150000000,afterB:150000000}, 매출원가:{base:128000000,prevA:128000000,afterB:128000000} },
    lines:[{rule:'W/G 비용 30억 미만',service:'N',rows:[
      {role:'기안',unit:'수행PM',approver:'김종원(11108)',status:'기안',date:'2025-06-02 09:30',opinion:'MES 운영 안정화 W/G',fixed:true},
      {role:'협조',unit:'Account WG담당자',approver:'송하경(03749)',status:'승인',date:'2025-06-02 13:10',opinion:''},
      {role:'검토',unit:'팀장',approver:'신성호(13016)',status:'승인',date:'2025-06-03 10:00',opinion:''},
      {role:'승인',unit:'담당임원',approver:'권재준(60521)',status:'승인',date:'2025-06-04 16:20',opinion:''},
    ]}],
    memo:'MES 운영 안정화 W/G. 고객사: 공통 / 서비스: MES',
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
  // [합침] 버튼 실제 동작 — 저장(작성 중) · 삭제(최신 버전) · 비용변경(새 버전) · 결재선생성
  const btns = p.submitted
    ? '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgCostChange(\'' + id + '\')">비용변경</button><button class="pwx-btn pri" onclick="popenWgTab(\'approval\')">결재선생성</button>'
    : '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgDelete(\'' + id + '\')">삭제</button><button class="pwx-btn pri" onclick="popenWgSave(\'' + id + '\')">저장</button><button class="pwx-btn pri" onclick="popenWgTab(\'approval\')">결재선생성</button>';

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
  // [합침] 승인요청(메모 필수) · 기안취소(승인요청 상태일 때만) 실제 동작
  const st = (p.versions[0] || {}).status;
  const btns = p.submitted
    ? '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgTab(\'info\')">← 정보관리</button>'
      + (st === '승인요청' ? '<button class="pwx-btn" onclick="popenWgCancel(\'' + id + '\')">기안취소</button>' : '')
    : '<button class="pwx-btn" onclick="popenBackToList()">목록</button><button class="pwx-btn" onclick="popenWgTab(\'info\')">← 정보관리</button><button class="pwx-btn pri" onclick="popenWgRequest(\'' + id + '\')">승인요청</button>';

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
    + '<div class="pwx-memo"><div class="pwx-sec">메모</div><textarea placeholder="비용총액 신규등록 및 변경 사유 (해당 고객사 및 서비스 명시)"' + (p.submitted ? ' readonly' : '') + ' oninput="POPEN_WGX[\'' + id + '\'].memo=this.value">' + (p.memo||'') + '</textarea></div>';
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
    + '<span class="pwx-chip">전결 규정: ' + line.rule + '</span>' + (line.service ? '<span class="pwx-chip">서비스기획 ' + line.service + '</span>' : '') + '</div>'
    + '<div class="pwx-tblwrap" style="margin-bottom:0;border:none"><table class="pwx-apv">'
    + '<thead><tr><th>구분</th><th>결재 단위</th><th>결재자</th><th>상태</th><th>처리일시</th><th>의견</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>' + reject + '</div>';
}

function popenWgTab(t) { popenTab = t; renderProjectOpen(); }
function popenWgCostEdit(id, acct, field, val) {
  const p = (id === '__NEW__') ? popenWgNewCapture() : POPEN_WGX[id]; if (!p) return;
  p.costs[acct].afterB[field] = Number(String(val).replace(/,/g,'')) || 0;
  renderProjectOpen();
}
function popenWgPnlEdit(id, key, val) {
  const p = (id === '__NEW__') ? popenWgNewCapture() : POPEN_WGX[id]; if (!p) return;
  p.pnl[key].afterB = Number(String(val).replace(/,/g,'')) || 0;
  renderProjectOpen();
}
function popenWgStub(label) { if (typeof showToast === 'function') showToast(label + ' (목업)'); }

// ── [합침 · 남주 버전] 정보관리 / 비용승인 버튼 실제 동작 ──
function popenNow() { const d = new Date(), z = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
function popenWgSync(id) {                       // 목록 상태(POPEN_APPS)를 W/G 상세 버전 상태에 맞춤
  const p = POPEN_WGX[id], a = POPEN_APPS[id];
  if (!p || !a) return;
  a.name = p.name;
  const st = (p.versions[0] || {}).status;
  if (a.regStatus !== '등록완료') a.approvalStatus = st === '승인요청' ? '개설 승인 대기' : st === '승인완료' ? '개설 승인 완료' : st === '반려' ? '반려' : '개설 신청';
}
// 저장 — 작성 중(저장 상태) 프로젝트명 · 비용을 그대로 저장
function popenWgSave(id) {
  const p = POPEN_WGX[id]; if (!p) return;
  const nm = document.querySelector('#s-project-open .pwx-name');
  if (nm && 'value' in nm) {
    if (!String(nm.value).trim()) { popenToast('프로젝트명은 필수입니다.'); return; }
    p.name = nm.value.trim();
  }
  popenWgSync(id);
  popenToast('저장했습니다.'); renderProjectOpen();
}
// 삭제 — 최신 비용 버전을 지움(현행). 버전이 1개면 이 개설 신청을 삭제
function popenWgDelete(id) {
  const p = POPEN_WGX[id]; if (!p) return;
  if (p.versions.length > 1) {
    p.versions.shift();
    p.submitted = ['승인요청', '승인완료'].indexOf(p.versions[0].status) >= 0;
    popenWgSync(id); popenToast('최신 비용 버전을 삭제했습니다.'); renderProjectOpen(); return;
  }
  popenConfirm = { msg: '이 개설 신청을 삭제하시겠습니까?', ok: function () {
    delete POPEN_WGX[id]; delete POPEN_APPS[id];
    popenView = 'list'; popenToast('삭제 되었습니다.');
  } };
  renderProjectOpen();
}
// 비용변경 — 새 비용 버전(저장 상태)을 만들고, 변경 전(A) = 지금 금액으로 둠
function popenWgCostChange(id) {
  const p = POPEN_WGX[id]; if (!p) return;
  const n = p.versions.length + 1;
  p.versions.unshift({ v: 'V' + n + '.0', date: popenNow().slice(0, 10), status: '저장' });
  Object.keys(p.costs).forEach(function (k) { const c = p.costs[k]; c.prevA = Object.assign({}, c.afterB); c.afterB = Object.assign({}, c.afterB); });
  Object.keys(p.pnl).forEach(function (k) { p.pnl[k].prevA = p.pnl[k].afterB; });
  const tpl = p.lines[0];
  p.lines.unshift({ rule: tpl.rule, service: tpl.service, rows: tpl.rows.map(function (r) { return { role: r.role, unit: r.unit, approver: r.approver, status: '대기', date: '', opinion: '', fixed: r.fixed }; }) });
  p.submitted = false; p.memo = '';
  popenWgSync(id);
  popenToast('비용 버전 V' + n + '.0(저장)을 만들었습니다. 변경 후(B) 금액을 고친 뒤 결재선생성 → 승인요청하세요.'); renderProjectOpen();
}
// 승인요청 — 메모(변경 사유) 필수
function popenWgRequest(id) {
  const p = POPEN_WGX[id]; if (!p) return;
  if (!String(p.memo || '').trim()) { popenToast('비용총액 신규등록 및 변경 사유를 메모에 입력바랍니다. (해당 고객사 및 서비스 명시 필수)'); return; }
  p.versions[0].status = '승인요청'; p.submitted = true;
  const r0 = p.lines[0].rows[0]; r0.status = '기안'; r0.date = popenNow(); r0.opinion = p.memo;
  popenWgSync(id);
  popenToast('승인요청했습니다.'); renderProjectOpen();
}
// 기안취소 — 승인요청 상태에서만. 다시 결재선생성 → 승인요청 가능
function popenWgCancel(id) {
  popenConfirm = { msg: '기안을 취소하시겠습니까?', ok: function () {
    const p = POPEN_WGX[id]; if (!p) return;
    p.versions[0].status = '기안취소'; p.submitted = false;
    p.lines[0].rows.forEach(function (r) { r.status = '대기'; r.date = ''; });
    popenWgSync(id);
    popenToast('기안을 취소했습니다.');
  } };
  renderProjectOpen();
}

// ── [합침 · 남주 버전] 목록 — 엑셀 업로드 · 선택등록 · 선택삭제 · 확인창 ──
function popenToast(m) { if (typeof showToast === 'function') showToast(m); }
function popenEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function popenCheck(id, v) { popenChecked[id] = v; }
function popenShowErr(i) { popenErrPopup = i; renderProjectOpen(); }
function popenConfirmOk() { const f = popenConfirm.ok; popenConfirm = null; if (f) f(); renderProjectOpen(); }
function popenModalHtml() {
  if (popenConfirm) {
    return '<div class="popen-mask"><div class="popen-modal"><div class="popen-mbody" style="text-align:center;font-weight:800;padding:24px 20px">' + popenConfirm.msg + '</div>'
      + '<div class="popen-mfoot">' + (popenConfirm.ok ? '<button class="popen-btn pri" onclick="popenConfirmOk()">확인</button><button class="popen-btn" onclick="popenConfirm=null;renderProjectOpen()">취소</button>'
        : '<button class="popen-btn pri" onclick="popenConfirm=null;renderProjectOpen()">확인</button>') + '</div></div></div>';
  }
  if (popenErrPopup !== null && popenUploaded[popenErrPopup]) {
    const r = popenUploaded[popenErrPopup];
    return '<div class="popen-mask"><div class="popen-modal" style="width:560px"><div class="popen-mhead">업로드 오류 메시지<button onclick="popenErrPopup=null;renderProjectOpen()">✕</button></div>'
      + '<div class="popen-mbody"><ul>' + r.errors.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul></div>'
      + '<div class="popen-mfoot"><button class="popen-btn" onclick="popenErrPopup=null;renderProjectOpen()">닫기</button></div></div></div>';
  }
  return '';
}
// 엑셀 업로드 (목업: 정상 1행 + 오류 1행이 올라온 것으로 표시)
function popenUpload() {
  popenUploaded = [
    { no:'70007620-D001', name:'2026년_클라우드 운영 자동화 W/G', pm:'류준서', pmNo:'21043', dept:'Cloud사업부', bgt:186000000, start:'2026-12-01', end:'2027-11-30', errors:[] },
    { no:'7000762-D01', name:'2026년_보안관제 자동화 W/G', pm:'이수연', pmNo:'', dept:'', bgt:0, start:'2027-03-01', end:'2026-12-31',
      errors:['프로젝트번호 형식을 확인해 주세요.', '수행PM사번을 입력해 주세요.', 'PJT 시작일/종료일을 확인해 주세요', '예산금액을 입력해 주세요.'] },
  ];
  popenChecked = { U0: true };
  renderProjectOpen();
  const errCnt = popenUploaded.filter(function (r) { return r.errors.length; }).length;
  popenToast('엑셀 ' + popenUploaded.length + '행을 읽었습니다 (정상 ' + (popenUploaded.length - errCnt) + ' / 오류 ' + errCnt + '). [선택등록]을 눌러야 등록됩니다.');
}
// 선택등록 — 정상 행만 개설 신청(W/G 상세 포함)으로 만들고, 이번에 올린 행은 모두 목록에서 정리(오류 행도 남기지 않음)
function popenRegChecked() {
  const idx = popenUploaded.map(function (r, i) { return i; }).filter(function (i) { return popenChecked['U' + i] && !popenUploaded[i].errors.length; });
  if (!idx.length) {
    const errOnly = popenUploaded.some(function (r, i) { return popenChecked['U' + i] && r.errors.length; });
    popenConfirm = { msg: errOnly ? '오류가 있는 행은 등록할 수 없습니다.<br>엑셀을 고쳐 다시 올리거나 [선택삭제]하세요.' : '등록할 엑셀 업로드 행을 선택하세요.' };
    renderProjectOpen(); return;
  }
  popenConfirm = { msg: "'" + idx.length + "'건의 WG프로젝트를 등록하시겠습니까?", ok: function () {
    const dup = idx.some(function (i) { return Object.keys(POPEN_WGX).some(function (k) { return POPEN_WGX[k].code === popenUploaded[i].no; }); });
    if (dup) { popenConfirm = { msg: '중복된 프로젝트가 있습니다.<br>확인후 다시 등록 바랍니다.' }; return; }
    const today = popenNow();
    idx.forEach(function (i, n) {
      const r = popenUploaded[i], id = 'OPN-U' + Date.now() + n;
      POPEN_APPS[id] = { type:'W/G', name:r.name, reqDept:r.dept || '-', requester:r.pm + '(' + r.pmNo + ')', requestDate:today,
        period:r.start + ' ~ ' + r.end, overview:'엑셀 업로드로 등록한 W/G 개설 신청.', approvalStatus:'개설 신청', regStatus:'미등록',
        projectNo:'(승인 완료 후 부여)', steps:[], rejectReason:'' };
      POPEN_WGX[id] = { code:r.no, name:r.name, contractType:'TC', contractDone:'Yes', customer:'공통(9999999999)',
        mainDept:r.dept || '-', salesDept:r.dept || '-', revDept:r.dept || '-', wgLeader:r.pm, wgLeaderCode:r.pmNo, pm:r.pm, pmCode:r.pmNo,
        start:r.start, end:r.end, regDate:today.slice(0, 10), erpSend:'미전송', submitted:false,
        versions:[{ v:'V1.0', date:today.slice(0, 10), status:'저장' }],
        costs:{ 인건비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:0,amt:r.bgt}}, 외주비:{base:{mm:0,amt:0},prevA:{mm:0,amt:0},afterB:{mm:0,amt:0}},
          재료비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:0}}, 경비:{base:{mm:'-',amt:0},prevA:{mm:'-',amt:0},afterB:{mm:'-',amt:0}} },
        pnl:{ 매출액:{base:0,prevA:0,afterB:0}, 매출원가:{base:0,prevA:0,afterB:0} },
        lines:[{ rule:'W/G 비용 30억 미만', service:'Y', rows:[
          { role:'기안', unit:'수행PM', approver:r.pm + '(' + r.pmNo + ')', status:'대기', date:'', opinion:'', fixed:true },
          { role:'협조', unit:'Account WG담당자', approver:'장재호(15025)', status:'대기', date:'', opinion:'' },
          { role:'검토', unit:'팀장', approver:'신성호(13016)', status:'대기', date:'', opinion:'' },
          { role:'승인', unit:'담당임원', approver:'권재준(60521)', status:'대기', date:'', opinion:'' } ] }],
        memo:'' };
    });
    const left = popenUploaded.length - idx.length;
    popenUploaded = []; popenChecked = {};
    popenToast(idx.length + '건을 저장했습니다.' + (left ? ' 등록하지 않은 ' + left + '행(오류 포함)은 목록에서 뺐습니다 — 엑셀을 고쳐 다시 올려 주세요.' : ''));
  } };
  renderProjectOpen();
}
// 선택삭제 — 엑셀로 올린(아직 등록 전) 행만
function popenDelChecked() {
  const keys = Object.keys(popenChecked).filter(function (k) { return popenChecked[k]; });
  if (!keys.length) { popenConfirm = { msg: '삭제할 W/G을 선택하세요.' }; renderProjectOpen(); return; }
  if (keys.some(function (k) { return k.charAt(0) !== 'U'; })) { popenConfirm = { msg: '새로 엑셀 업로드된 프로젝트만 선택삭제 가능합니다.<br>등록된 신청은 상세에서 삭제하세요.' }; renderProjectOpen(); return; }
  popenUploaded = popenUploaded.filter(function (r, i) { return !popenChecked['U' + i]; });
  popenChecked = {};
  renderProjectOpen();
}

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
    + '<div class="popen-dtop"><div><span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + popenTypeOf(a) + '</span> '
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

// 프로젝트번호 — 시스템 자동 시퀀스(사용자 입력 아님)
function popenNextWgNo() {
  let max = 70007602;
  try {
    Object.keys(POPEN_WGX).forEach(function (k) { const m = /^(\d+)/.exec(POPEN_WGX[k].code || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  } catch (e) {}
  return (max + 1) + '-D001';
}

// ════════════════════════════════════════
//  [석완 로컬] 신규 등록 — 3개 유형(W/G · 사내-전사IT운영 · 사내-활동관리) 공통 화면
//  공통: 헤더(프로젝트번호·명·유형 배지·목록/등록) + 기본정보 6열 — 유형은 목록 탭에서 정해짐(등록 화면엔 유형 선택 없음)
//  유형별: W/G → 버전·총 비용·W/G 비용정보·손익정보
//          사내 2종(공용) → 투자기간·요청부서·책임부서 + 투자목적·총투자액(행추가/행삭제)·정성적 효과
//  W/G 비용/손익 표는 popenWgCostTable·popenWgPnlTable을 id '__NEW__'로 재사용
// ════════════════════════════════════════
const POPEN_KINDS = ['W/G', '사내-전사IT운영', '사내-활동관리'];
const POPEN_INV_ACCTS = ['재료비', '인건비', '외주비', '경비'];
const POPEN_INV = {};   // 사내 신규 등록 건의 투자 정보 (id → { revDept, purpose, effect, rows })
// 신청 건의 3분류 유형 — 사내는 sub(전사IT운영 / 활동관리)로 구분, 없으면 전사IT운영
function popenTypeOf(a) { return (a && a.type === '사내') ? '사내-' + (a.sub || '전사IT운영') : 'W/G'; }
function popenIsInhouse(t) { return String(t || '').indexOf('사내') === 0; }

let popenWgDraft = null;
function popenInvBlankRow() { return { name:'', 재료비:0, 인건비:0, 외주비:0, 경비:0 }; }
function popenWgNewBlank() {
  const z = function () { return { mm:0, amt:0 }; }, d = function () { return { mm:'-', amt:0 }; };
  return {
    code: popenNextWgNo(), name:'', contractType:'TC', contractDone:'Yes', customer:'',
    mainDept:'', salesDept:'', revDept:'', wgLeader:'', pm:'', start:'', end:'',
    regDate: popenNow().slice(0, 10),
    costs:{
      인건비:{ base:z(), prevA:z(), afterB:z() }, 외주비:{ base:z(), prevA:z(), afterB:z() },
      재료비:{ base:d(), prevA:d(), afterB:d() }, 경비:{ base:d(), prevA:d(), afterB:d() },
    },
    pnl:{ 매출액:{ base:0, prevA:0, afterB:0 }, 매출원가:{ base:0, prevA:0, afterB:0 } },
    // 사내 전용
    reqDept:'', purpose:'', effect:'', inv:[ popenInvBlankRow() ],
  };
}
// 공통 + 유형별 입력칸 id (유형을 바꿔도 공통 입력값은 유지)
const POPEN_WGN_FIELDS = { name:'pwn-name', contractDone:'pwn-done', customer:'pwn-customer', mainDept:'pwn-maindept', salesDept:'pwn-salesdept',
  revDept:'pwn-revdept', wgLeader:'pwn-leader', pm:'pwn-pm', start:'pwn-start', end:'pwn-end',
  reqDept:'pwn-reqdept', purpose:'pwn-purpose', effect:'pwn-effect' };
// 다시 그리기 전에 입력값을 초안에 담아 둠 (비용 칸 수정·행추가 시 입력이 지워지지 않게)
function popenWgNewCapture() {
  if (!popenWgDraft) popenWgDraft = popenWgNewBlank();
  const p = popenWgDraft;
  Object.keys(POPEN_WGN_FIELDS).forEach(function (k) {
    const el = document.getElementById(POPEN_WGN_FIELDS[k]); if (el) p[k] = el.value;
  });
  p.inv.forEach(function (r, i) {
    const nm = document.getElementById('pin-' + i + '-name'); if (nm) r.name = nm.value;
    const ck = document.getElementById('pin-' + i + '-chk'); r._chk = !!(ck && ck.checked);
  });
  return p;
}

function popenNewHtml() {
  popenWgxInjectStyle();
  if (POPEN_KINDS.indexOf(popenNewType) < 0) popenNewType = 'W/G';
  if (!popenWgDraft) popenWgDraft = popenWgNewBlank();
  const p = popenWgDraft, F = POPEN_WGN_FIELDS, t = popenNewType, inh = popenIsInhouse(t);
  const cell = function (k, inner, req, span) {
    return '<div class="pwx-cell"' + (span ? ' style="grid-column:span ' + span + '"' : '') + '><div class="pwx-k">' + k + (req ? '<span class="req">*</span>' : '') + '</div>' + inner + '</div>';
  };
  const inp = function (key, type) { return '<div class="pwx-vfield"><input id="' + F[key] + '" type="' + (type || 'text') + '" value="' + popenEsc(p[key]) + '"></div>'; };
  const srch = function (key, kind) {
    const opener = (kind === 'org') ? 'popenOpenOrgSearch' : 'popenOpenMemberSearch';
    return '<div class="pwx-vfield"><input id="' + F[key] + '" value="' + popenEsc(p[key]) + '" readonly placeholder="' + (kind === 'org' ? '조직 검색' : '사원 검색') + '" onclick="' + opener + '(\'' + F[key] + '\')">'
      + '<button class="pwx-sbtn" title="검색" onclick="' + opener + '(\'' + F[key] + '\')">' + POPEN_WGX_SEARCH + '</button></div>';
  };
  const sel = function (id, opts, cur, onchg) {
    return '<div class="pwx-vfield"><select id="' + id + '" class="pwn-sel"' + (onchg ? ' onchange="' + onchg + '"' : '') + '>'
      + opts.map(function (v) { return '<option' + (cur === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></div>';
  };
  const ro = function (v) { return '<div class="pwx-v">' + v + '</div>'; };

  // 유형은 목록 탭(W/G · 사내-전사IT운영 · 사내-활동관리)에서 정해짐 — 등록 화면에 유형 선택 없음
  const info = inh
    ? [ cell('투자기간', '<div class="pwx-vfield pwn-period"><input id="' + F.start + '" type="date" value="' + popenEsc(p.start) + '"><span>~</span><input id="' + F.end + '" type="date" value="' + popenEsc(p.end) + '"></div>', true, 2),
        cell('요청부서', srch('reqDept', 'org'), true),
        cell('책임부서(매출귀속부서)', srch('revDept', 'org'), true),
        cell('수행PM', srch('pm', 'member'), true),
        cell('등록일', ro(p.regDate)),
      ].join('')
    : [ cell('계약유형', ro(p.contractType)),
        cell('계약완료여부', sel(F.contractDone, ['Yes', 'No'], p.contractDone)),
        cell('고객사', inp('customer')),
        cell('주 수행부서', srch('mainDept', 'org')),
        cell('영업부서', srch('salesDept', 'org')),
        cell('매출귀속부서', srch('revDept', 'org'), true),
        cell('W/G리더', srch('wgLeader', 'member')),
        cell('수행PM', srch('pm', 'member'), true),
        cell('프로젝트시작일', inp('start', 'date'), true),
        cell('프로젝트종료일', inp('end', 'date'), true),
        cell('등록일', ro(p.regDate)),
        '<div class="pwx-cell"></div>',
      ].join('');

  const body = inh
    ? '<div class="pwx-total">총 투자액 <b>' + fmt(popenInvTotal(p)) + '</b> 원</div>'
      + '<div class="pwx-sec">투자목적</div>'
      + '<div class="pwx-memo pwn-txt"><textarea id="' + F.purpose + '" placeholder="투자 목적을 입력하세요">' + popenEsc(p.purpose) + '</textarea></div>'
      + '<div class="pwn-secbar"><div class="pwx-sec">총투자액(단위: 원)</div>'
      + '<div style="display:flex;gap:6px"><button class="pwx-btn pwn-sm" onclick="popenInvAddRow()">⊕ 행추가</button><button class="pwx-btn pwn-sm" onclick="popenInvDelRows()">⊖ 행삭제</button></div></div>'
      + popenInvTableHtml(p)
      + '<div class="pwx-sec">정성적 효과</div>'
      + '<div class="pwx-memo pwn-txt"><textarea id="' + F.effect + '" placeholder="정성적 효과를 입력하세요">' + popenEsc(p.effect) + '</textarea></div>'
    : '<div class="pwx-vers"><span class="pwx-vchip pwn-vchip">V1.0 &nbsp;' + p.regDate + '<span class="vb" style="background:#f1f5f9;color:#64748b">신규</span></span></div>'
      + '<div class="pwx-total">총 비용 <b>' + fmt(pwTotal(p)) + '</b> 원</div>'
      + '<div class="pwx-sec">W/G 비용정보</div>' + popenWgCostTable('__NEW__', p)
      + '<div class="pwx-sec">W/G 손익정보</div>' + popenWgPnlTable('__NEW__', p);

  const note = inh
    ? '※ 프로젝트번호는 개설 승인 완료 후 시스템이 부여합니다. 등록하면 \'개설 신청\' 상태로 목록에 추가되고 기안·승인이 진행됩니다.'
    : '※ 프로젝트번호는 시스템이 자동 생성합니다. 등록하면 상태 \'저장\'(V1.0)으로 만들어지고, 상세 > 정보관리에서 결재선생성 → 승인요청을 합니다.';

  return '<div class="popen-wrap">'
    + '<style>.pwn-info{grid-template-columns:repeat(6,1fr)}@media(max-width:1100px){.pwn-info{grid-template-columns:repeat(3,1fr)}.pwn-info>.pwx-cell{grid-column:auto !important}}@media(max-width:720px){.pwn-info{grid-template-columns:1fr 1fr}}'
    + '.pwn-sel{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:7px;padding:6px 9px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff}'
    + '.pwn-vchip{border-style:dashed}.pwn-period span{color:#94a3b8;font-weight:700}'
    + '.pwn-badge.inh{color:#be185d;background:#fce7f3}'
    + '.pwn-txt textarea{min-height:56px;margin-bottom:16px}'
    + '.pwn-secbar{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px}.pwn-secbar .pwx-sec{margin:0}'
    + '.pwx-btn.pwn-sm{font-size:12px;padding:5px 10px}'
    + '.pwn-inv td{text-align:right}.pwn-inv td.c{text-align:center}.pwn-inv .pwx-cin{width:100%;box-sizing:border-box}.pwn-inv .pwx-cin.nm{text-align:left}'
    + '</style>'
    + '<div class="pwx-head"><div class="pwx-code" title="' + (inh ? '승인 완료 후 부여' : '시스템 자동 생성') + '">' + (inh ? '(번호 자동 부여)' : p.code) + '</div>'
    + '<div class="pwx-name-wrap"><input id="' + F.name + '" class="pwx-name" placeholder="프로젝트명 입력 *" value="' + popenEsc(p.name) + '"><span class="pwx-badge pwn-badge' + (inh ? ' inh' : '') + '">' + t + '</span></div>'
    + '<div class="pwx-hbtns"><button class="pwx-btn" onclick="popenWgNewCancel()">목록</button>'
    + '<button class="pwx-btn pri" onclick="popenNewRegister()">등록</button></div></div>'
    + '<div class="pwx-info pwn-info">' + info + '</div>'
    + body
    + '<div class="popen-note" style="margin-top:0">' + note + '</div>'
    + '</div>';
}

// ── 사내 총투자액 표 ──
function popenInvSub(r) { return POPEN_INV_ACCTS.reduce(function (s, k) { return s + (Number(r[k]) || 0); }, 0); }
function popenInvTotal(p) { return (p.inv || []).reduce(function (s, r) { return s + popenInvSub(r); }, 0); }
function popenInvTableHtml(p) {
  const num = function (v) { return v ? fmt(v) : ''; };
  const rows = p.inv.map(function (r, i) {
    return '<tr><td class="c"><input type="checkbox" id="pin-' + i + '-chk"' + (r._chk ? ' checked' : '') + '></td>'
      + '<td><input class="pwx-cin nm" id="pin-' + i + '-name" placeholder="구분 입력" value="' + popenEsc(r.name) + '"></td>'
      + '<td class="diff">' + fmt(popenInvSub(r)) + '</td>'
      + POPEN_INV_ACCTS.map(function (k) {
        return '<td class="grp-b"><input class="pwx-cin" value="' + num(r[k]) + '" onchange="popenInvEdit(' + i + ',\'' + k + '\',this.value)"></td>';
      }).join('') + '</tr>';
  }).join('');
  const colSum = function (k) { return p.inv.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0); };
  return '<div class="pwx-tblwrap"><table class="pwx-tbl pwn-inv">'
    + '<colgroup><col style="width:40px"><col style="width:22%"><col><col><col><col><col></colgroup>'
    + '<thead><tr><th></th><th>구분</th><th>소계 <span style="color:#94a3b8">*</span></th>'
    + POPEN_INV_ACCTS.map(function (k) { return '<th class="grp-b">' + k + '</th>'; }).join('') + '</tr></thead>'
    + '<tbody>' + (rows || '<tr><td colspan="7" class="c" style="color:#94a3b8">행추가로 투자 항목을 입력하세요.</td></tr>')
    + '<tr class="total"><td></td><td class="lab" style="text-align:center">합계</td><td>' + fmt(popenInvTotal(p)) + '</td>'
    + POPEN_INV_ACCTS.map(function (k) { return '<td>' + fmt(colSum(k)) + '</td>'; }).join('') + '</tr>'
    + '</tbody></table></div>';
}
function popenInvEdit(i, k, val) {
  const p = popenWgNewCapture(); if (!p.inv[i]) return;
  p.inv[i][k] = Number(String(val).replace(/,/g, '')) || 0;
  renderProjectOpen();
}
function popenInvAddRow() { const p = popenWgNewCapture(); p.inv.push(popenInvBlankRow()); renderProjectOpen(); }
function popenInvDelRows() {
  const p = popenWgNewCapture();
  const left = p.inv.filter(function (r) { return !r._chk; });
  if (left.length === p.inv.length) { popenToast('삭제할 행을 선택하세요.'); return; }
  p.inv = left; renderProjectOpen();
}

function popenWgNewCancel() { popenWgDraft = null; popenBackToList(); }
// 사원 이름 → 사번 (검색 팝업은 이름만 넣어 줌)
function popenEmpNo(name) {
  try { const m = PSV_MEMBERS.find(function (x) { return x.name === name; }); return m ? m.empno : ''; } catch (e) { return ''; }
}
function popenNextAppId() { let n = 1; while (POPEN_APPS['OPN-' + String(n).padStart(3, '0')]) n++; return 'OPN-' + String(n).padStart(3, '0'); }

// [등록] — 유형별 필수값 확인 후 목록에 추가 (목업 메모리 데이터)
function popenNewRegister() {
  const p = popenWgNewCapture(), t = popenNewType, inh = popenIsInhouse(t);
  const miss = [];
  if (!String(p.name).trim()) miss.push('프로젝트명');
  if (inh) {
    if (!p.start || !p.end) miss.push('투자기간');
    if (!p.reqDept) miss.push('요청부서');
    if (!p.revDept) miss.push('책임부서(매출귀속부서)');
    if (!p.pm) miss.push('수행PM');
    if (!popenInvTotal(p)) miss.push('총투자액');
  } else {
    if (!p.revDept) miss.push('매출귀속부서');
    if (!p.pm) miss.push('수행PM');
    if (!p.start) miss.push('프로젝트시작일');
    if (!p.end) miss.push('프로젝트종료일');
  }
  if (miss.length) { popenToast(miss.join(', ') + '을(를) 입력하세요.'); return; }
  if (p.end < p.start) { popenToast((inh ? '투자기간' : '프로젝트') + ' 종료일이 시작일보다 빠릅니다.'); return; }
  if (inh && p.inv.some(function (r) { return popenInvSub(r) && !String(r.name).trim(); })) { popenToast('총투자액의 구분을 입력하세요.'); return; }

  const id = popenNextAppId();
  const pmNo = popenEmpNo(p.pm), pmTxt = p.pm + (pmNo ? '(' + pmNo + ')' : '');
  if (inh) {
    POPEN_INV[id] = { revDept:p.revDept, purpose:p.purpose, effect:p.effect,
      rows:p.inv.filter(function (r) { return popenInvSub(r); }).map(function (r) { const c = Object.assign({}, r); delete c._chk; return c; }) };
    POPEN_APPS[id] = {
      type:'사내', sub:t.replace('사내-', ''), name:p.name.trim(), reqDept:p.reqDept, requester:pmTxt,
      requestDate:popenNow(), period:p.start + ' ~ ' + p.end, overview:p.purpose || '-',
      approvalStatus:'개설 신청', regStatus:'미등록', projectNo:'(승인 완료 후 부여)',
      steps:[
        { role:'기안', part:'신청자',  name:pmTxt, date:popenNow(), status:'기안' },
        { role:'협조', part:'운영팀장', name:'김도현(13004)', date:'', status:'대기' },
        { role:'승인', part:'담당임원', name:'권재준(60521)', date:'', status:'대기' },
      ],
      rejectReason:'',
    };
    popenToast(t + ' 개설 신청이 등록되었습니다. 기안·승인 절차가 진행됩니다. (목업)');
  } else {
    const leadNo = popenEmpNo(p.wgLeader);
    const w = Object.assign({}, p);
    ['reqDept', 'purpose', 'effect', 'inv'].forEach(function (k) { delete w[k]; });
    POPEN_WGX[id] = Object.assign(w, {
      name: p.name.trim(), customer: p.customer || '-', mainDept: p.mainDept || '-', salesDept: p.salesDept || '-',
      wgLeader: p.wgLeader || '-', wgLeaderCode: leadNo || '-', pmCode: pmNo || '-',
      erpSend:'미전송', submitted:false, accMgr:'', accMgrCode:'', execBudget:null,
      versions:[{ v:'V1.0', date:p.regDate, status:'저장' }],
      lines:[{ rule:'W/G 비용 30억 미만', rows:[
        { role:'기안', unit:'수행PM', approver:pmTxt, status:'대기', date:'', opinion:'', fixed:true },
        { role:'협조', unit:'부문기획 담당자', approver:'박지훈(14022)', status:'대기', date:'', opinion:'' },
        { role:'검토', unit:'팀장', approver:'신성호(13016)', status:'대기', date:'', opinion:'' },
        { role:'승인', unit:'담당임원', approver:'권재준(60521)', status:'대기', date:'', opinion:'' },
      ] }],
      memo:'',
    });
    POPEN_APPS[id] = {
      type:'W/G', name:p.name.trim(), reqDept:p.revDept, requester:pmTxt,
      requestDate:popenNow(), period:p.start + ' ~ ' + p.end, overview:'', approvalStatus:'개설 신청', regStatus:'',
      projectNo:'', steps:[], rejectReason:'',
    };
    popenToast('W/G 신규 등록(상태 \'저장\') 완료. 상세 > 정보관리에서 결재선생성 → 승인요청하세요.');
  }
  popenWgDraft = null;
  popenKind = t; popenChecked = {};       // 등록한 유형의 목록 탭으로 이동
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

// ════════════════════════════════════════
//  [석완 로컬] W/G · 사내 탭 분리 + W/G 목록
// ════════════════════════════════════════
function popenKindTabsHtml() {
  return '<div class="popen-ktabs">'
    + POPEN_KINDS.map(function (k) {
      return '<div class="popen-ktab' + (popenKind === k ? ' on' : '') + '" onclick="popenSetKind(\'' + k + '\')">' + k + '</div>';
    }).join('') + '</div>';
}
// 탭 전환 — 검색 조건·체크는 탭마다 새로 시작
function popenSetKind(k) {
  if (popenKind === k) return;
  popenKind = k; popenChecked = {};
  popenF = popenFBlank();
  renderProjectOpen();
}
// 프로젝트 상태 — 종료일이 지났으면 '종료', 아니면 '수행'
// [석완 로컬] 검색 조건 초기값
function popenFBlank() { return { no:'', nm:'', pm:'', acc:'', date:'', type:'', sts:'', dFrom:'', dTo:'', aFrom:'', aTo:'', pst:'' }; }
// 최종승인일자 — 최신 결재선(lines[0])에서 '승인' 단계가 승인된 날짜, 없으면 ''
function popenFinalApvDate(id) {
  const wg = POPEN_WGX[id]; if (!wg || !wg.lines || !wg.lines[0]) return '';
  const r = wg.lines[0].rows.filter(function (x) { return x.role === '승인' && x.status === '승인' && x.date; }).pop();
  return r ? String(r.date).slice(0, 10) : '';
}
function popenRangeField(label, idFrom, idTo, vFrom, vTo) {
  return '<div class="popen-sf"><label>' + label + '</label><div class="popen-range">'
    + '<input id="' + idFrom + '" type="date" value="' + popenEsc(vFrom) + '"><span>~</span>'
    + '<input id="' + idTo + '" type="date" value="' + popenEsc(vTo) + '"></div></div>';
}
function popenProjState(end) {
  const today = popenNow().slice(0, 10);
  return (end && end < today) ? '종료' : '수행';
}
function popenWgSubName(wg) {
  const sub = (wg && wg.subType) || POPEN_SUBTYPES['W/G'][0][1];   // 'WG00_01 운영 W/G'
  return sub.replace(/^\S+\s+/, '');
}

// 칸 너비(%) — 합 100. 가로 스크롤 없이 화면 폭에 맞춰 줄바꿈
const POPEN_WGT_COLS = ['3%', '10%', '11.5%', '5%', '7%', '7%', '7%', '5%', '8.5%', '8.5%', '7.5%', '7.5%', '6.5%', '6%'];
function popenWgListHtml() {
  const rows = popenFilter();
  const flow = ['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려 / 재신청', '프로젝트 등록 완료']
    .map(function (s, i) { return '<span class="popen-fstep">' + s + '</span>' + (i < 4 ? '<i>→</i>' : ''); }).join('');
  const statusOpts = ['<option value="">전체</option>']
    .concat(['개설 신청', '개설 승인 대기', '개설 승인 완료', '반려', '프로젝트 등록 완료'].map(function (s) {
      return '<option value="' + s + '"' + (s === popenF.sts ? ' selected' : '') + '>' + s + '</option>';
    })).join('');
  const pstOpts = [['', '전체'], ['수행', '수행'], ['종료', '종료']]
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === popenF.pst ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  const amt = function (v) { return (typeof v === 'number') ? fmt(v) : '<span style="color:#cbd5e1">-</span>'; };
  const COLS = 14;

  const body = rows.map(function (a) {
    const wg = POPEN_WGX[a.id] || {};
    const disp = popenDisplayStatus(a);
    const ss = POPEN_STATUS_STYLE[disp] || POPEN_STATUS_STYLE['개설 신청'];
    const ps = popenProjState(wg.end || String(a.period || '').split('~')[1]);
    const code = wg.code || (a.regStatus === '등록완료' ? a.projectNo : '-');
    const reApply = a.approvalStatus === '반려'
      ? ' <button class="popen-btn warn" style="padding:5px 10px;font-size:11.5px" onclick="popenReapply(\'' + a.id + '\')">재신청</button>' : '';
    return '<tr>'
      + '<td><input type="checkbox"' + (popenChecked[a.id] ? ' checked' : '') + ' onclick="popenCheck(\'' + a.id + '\',this.checked)"></td>'
      + '<td class="code" style="color:#475569">' + popenEsc(code).replace('-', '-<wbr>') + '</td>'
      + '<td><div class="popen-pname">' + popenEsc(a.name) + '</div></td>'
      + '<td>' + popenEsc(popenWgSubName(wg)) + '</td>'
      + '<td>' + popenEsc(wg.revDept || a.reqDept) + '</td>'
      + '<td>' + (wg.pm ? popenEsc(wg.pm) + '(' + popenEsc(wg.pmCode) + ')' : popenEsc(a.requester)) + '</td>'
      + '<td>' + (wg.accMgr ? popenEsc(wg.accMgr) + '(' + popenEsc(wg.accMgrCode) + ')' : (popenEsc(popenAccMgr(a, a.id)) || '-')) + '</td>'
      + '<td><span class="popen-pstat ' + (ps === '종료' ? 'end' : 'run') + '">' + ps + '</span></td>'
      + '<td class="num nb">' + (wg.costs ? fmt(pwTotal(wg)) : amt(null)) + '</td>'
      + '<td class="num nb">' + amt(wg.execBudget) + '</td>'
      + '<td class="nb" style="color:#64748b">' + popenEsc(wg.regDate || String(a.requestDate || '').slice(0, 10)) + '</td>'
      + '<td class="nb" style="color:#64748b">' + (popenFinalApvDate(a.id) || '-') + '</td>'
      + '<td><span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + '">' + disp + '</span></td>'
      + '<td><button class="popen-link" onclick="popenOpenDetail(\'' + a.id + '\')">상세</button>' + reApply + '</td>'
      + '</tr>';
  }).join('');
  // 엑셀로 올린 행 — 목록 맨 위. 오류 행도 체크해 [선택삭제]할 수 있고, [선택등록]은 오류 행을 건너뜀
  const up = popenUploaded.map(function (r, i) {
    const err = r.errors.length > 0;
    return '<tr class="' + (err ? 'err' : 'new') + '">'
      + '<td><input type="checkbox"' + (popenChecked['U' + i] ? ' checked' : '') + ' onclick="popenCheck(\'U' + i + '\',this.checked)"></td>'
      + '<td class="code" style="color:#475569">' + popenEsc(r.no).replace('-', '-<wbr>') + '</td>'
      + '<td><div class="popen-pname">' + popenEsc(r.name) + '</div><div style="font-size:11px;color:#94a3b8">엑셀 업로드</div></td>'
      + '<td>' + popenEsc(popenWgSubName(null)) + '</td>'
      + '<td>' + (popenEsc(r.dept) || '-') + '</td>'
      + '<td>' + popenEsc(r.pm) + (r.pmNo ? '(' + popenEsc(r.pmNo) + ')' : '') + '</td>'
      + '<td>-</td><td>-</td>'
      + '<td class="num nb">' + (r.bgt ? fmt(r.bgt) : '-') + '</td><td class="num nb">-</td><td class="nb" style="color:#64748b">-</td><td class="nb" style="color:#64748b">-</td>'
      + '<td>' + (err ? '<button class="popen-errbtn" onclick="popenShowErr(' + i + ')">오류</button>' : '<span class="popen-regbadge">등록 전</span>') + '</td>'
      + '<td></td></tr>';
  }).join('');
  const total = rows.length + popenUploaded.length;
  const empty = total ? '' : '<tr><td colspan="' + COLS + '" class="popen-empty">조건에 맞는 W/G 개설 신청이 없습니다.</td></tr>';
  const memberField = function (id, label, val) {
    return '<div class="popen-sf"><label>' + label + '</label><div class="popen-sfin"><input id="' + id + '" readonly placeholder="사원 검색" value="' + popenEsc(val) + '" onclick="popenOpenMemberSearch(\'' + id + '\')">'
      + '<button class="popen-sfic" title="사원 검색" onclick="popenOpenMemberSearch(\'' + id + '\')">' + POPEN_WGX_SEARCH + '</button></div></div>';
  };

  return '<div class="popen-wrap" style="overflow-x:hidden">'
    + '<div class="popen-head"><div><div class="popen-title">프로젝트 개설 관리</div>'
    + '<div class="popen-sub">W/G·사내 프로젝트의 개설 신청과 기안·승인을 처리합니다. 수주형·제안·투자·선투입은 선행 시스템에서 자동 등록되어 이 화면 대상이 아닙니다.</div></div></div>'
    + popenKindTabsHtml()
    + '<div class="popen-flow">' + flow + '</div>'
    // 검색 — 프로젝트 코드 · 프로젝트명 · PM · Account담당자 / 등록일(기간) · 최종승인일자(기간) · 프로젝트 상태 · W/G 개설 상태 + [조회][초기화]
    + '<div class="popen-search popen-search4">'
    + '<div class="popen-sf"><label>프로젝트 코드</label><input id="popen-f-no" value="' + popenEsc(popenF.no) + '" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + '<div class="popen-sf"><label>프로젝트명</label><input id="popen-f-nm" value="' + popenEsc(popenF.nm) + '" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + memberField('popen-f-pm', 'PM', popenF.pm)
    + memberField('popen-f-acc', 'Account담당자', popenF.acc)
    + '<div class="popen-sbtns"><button class="popen-btn pri" onclick="popenDoSearch()">조회</button><button class="popen-btn" onclick="popenResetFilter()">초기화</button></div>'
    + popenRangeField('등록일', 'popen-f-dfrom', 'popen-f-dto', popenF.dFrom, popenF.dTo)
    + popenRangeField('최종승인일자', 'popen-f-afrom', 'popen-f-ato', popenF.aFrom, popenF.aTo)
    + '<div class="popen-sf"><label>프로젝트 상태</label><select id="popen-f-pst">' + pstOpts + '</select></div>'
    + '<div class="popen-sf"><label>W/G 개설 상태</label><select id="popen-f-sts">' + statusOpts + '</select></div>'
    + '</div>'
    + '<div class="popen-gbar"><span class="cnt">총 <b>' + total + '</b> 건</span>'
    + '<button class="popen-btn pri" onclick="popenNewType=\'W/G\';popenNewApply()">+ 단건 개설 신청</button>'
    + '<button class="popen-btn xls" onclick="popenUpload()">⬆ 대량 개설 신청(엑셀 업로드)</button>'
    + '<button class="popen-btn xls" onclick="popenToast(\'WG.xlsx 파일을 내려받았습니다. (목업)\')">⬇ 엑셀 다운로드</button>'
    + '<button class="popen-btn" onclick="popenToast(\'WorkingGroup템플릿.xlsx 파일을 내려받았습니다. (목업)\')">템플릿</button>'
    + '<button class="popen-btn del" onclick="popenDelChecked()">선택삭제</button>'
    + '<button class="popen-btn pri" onclick="popenRegChecked()">선택등록</button></div>'
    + '<div class="popen-guide">※ 여러 건은 템플릿을 내려받아 작성한 뒤 대량 개설 신청(엑셀 업로드) → 선택등록. 한 건은 "+ 단건 개설 신청"</div>'
    + '<table class="popen-table popen-wgt"><colgroup>' + POPEN_WGT_COLS.map(function (w) { return '<col style="width:' + w + '">'; }).join('') + '</colgroup><thead><tr>'
    + '<th style="width:34px"></th><th>프로젝트 코드</th><th>프로젝트 명</th><th>유형</th><th>매출귀속부서</th><th>PM</th><th>Account담당자</th>'
    + '<th>프로젝트 상태</th><th class="num">W/G비용총액</th><th class="num">실행예산 총액</th><th>등록일</th><th>최종승인일자</th><th>W/G 개설 상태</th><th>상세</th>'
    + '</tr></thead><tbody>' + up + body + empty + '</tbody></table>'
    + '<div class="popen-note">※ <b>W/G비용총액</b>은 W/G 비용정보 최신 버전의 변경 후(B) 합계, <b>실행예산 총액</b>은 프로젝트 등록 후 수립된 실행예산입니다(등록 전 "-").<br>'
    + '※ <b>프로젝트 상태</b>는 종료일 기준 수행 / 종료입니다. <b>W/G 개설 상태</b>는 승인 상태(등록 완료 시 "프로젝트 등록 완료")입니다.</div>'
    + '</div>';
}

// ── 이벤트 핸들러 ──
function popenOnSearch(v) { popenSearch = v; renderProjectOpen(); }
function popenOnStatus(v) { popenStatusFilter = v; renderProjectOpen(); }
function popenOnType(v)   { popenTypeFilter = v; renderProjectOpen(); }
function popenResetFilter() { popenF = popenFBlank(); renderProjectOpen(); }
// [조회] — 입력칸 값을 읽어 조건 적용 (PM 칸은 사원 검색 팝업이 이름을 넣음)
function popenDoSearch() {
  const v = function (id) { const el = document.getElementById(id); return el ? el.value : ''; };
  popenF = { no: v('popen-f-no'), nm: v('popen-f-nm'), pm: v('popen-f-pm'), acc: v('popen-f-acc'), date: v('popen-f-date'), type: v('popen-f-type'), sts: v('popen-f-sts'),
    dFrom: v('popen-f-dfrom'), dTo: v('popen-f-dto'), aFrom: v('popen-f-afrom'), aTo: v('popen-f-ato'), pst: v('popen-f-pst') };
  if ((popenF.dFrom && popenF.dTo && popenF.dFrom > popenF.dTo) || (popenF.aFrom && popenF.aTo && popenF.aFrom > popenF.aTo)) {
    popenToast('기간의 시작일이 종료일보다 늦습니다.'); return;
  }
  renderProjectOpen();
}
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
function popenNewApply() { popenWgDraft = null; popenView = 'new'; renderProjectOpen(); }

function popenSubmitNew() {
  const name = (document.getElementById('popen-f-name') || {}).value || '';
  if (!name.trim()) { if (typeof showToast === 'function') showToast('프로젝트명을 입력하세요.'); return; }
  // 목업 스텁: 실제 저장 없이 안내만
  if (typeof showToast === 'function') showToast('개설 신청이 등록되었습니다. 기안·승인 절차가 진행됩니다. (목업)');
  popenView = 'list'; renderProjectOpen();
}
function popenReapply(id) {
  if (typeof showToast === 'function') showToast('반려 건을 재신청합니다. 신청 내용을 수정해 다시 상신하세요. (목업)');
  popenNewType = popenTypeOf(POPEN_APPS[id]);
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
