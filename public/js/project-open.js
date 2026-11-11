// ════════════════════════════════════════
//  프로젝트 개설 관리 — W/G·사내 개설 (현행 W/G관리 기준)       작성: 수진
// ════════════════════════════════════════
//
// AI GUIDE: 프로젝트 개설 관리 화면입니다.
// - 현행 W/G관리(WorkingGroup.vue · WorkingGroupDetail.vue · WorkingGroupApprovalDetail.vue) 동작에 맞춘 목업입니다.
// - 화면 3개 + 신규 등록:
//     목록(검색 · 엑셀 업로드/다운로드 · 템플릿 · 선택삭제 · 선택등록)
//     정보관리(기본정보 · 비용 버전 · 비용/손익 · 상태별 버튼)
//     비용승인(결재선 지정 · 메모 · 승인요청 · 기안취소)
// - 상태(TC_예산_진행_상태_코드): 저장 / 승인요청 / 승인완료 / 반려 / 기안취소
// - 목업 로그인 사용자는 각 건의 수행PM으로 가정합니다.

let popenView = 'list';    // 'list' | 'detail' | 'appr' | 'new'
let popenSelectedId = null;
let popenVer = null;       // 보고 있는 비용 버전 번호
let popenDraft = null;     // 정보관리 편집 값
let popenMemo = '';
let popenChecked = {};
let popenUploaded = [];    // 엑셀로 올렸지만 아직 등록 안 한 행
let popenErrPopup = null;  // 업로드 오류 팝업 대상 행
let popenConfirm = null;   // 확인 창 { msg, ok }
let popenPick = null;      // 검색 팝업 { kind, target }
let popenNewForm = null;

const POPEN_STS = ['저장', '승인요청', '승인완료', '반려', '기안취소'];
const POPEN_STS_STYLE = {
  '저장':     { bg:'#f1f5f9', color:'#475569' },
  '승인요청': { bg:'#fef3c7', color:'#b45309' },
  '승인완료': { bg:'#dcfce7', color:'#166534' },
  '반려':     { bg:'#fee2e2', color:'#991b1b' },
  '기안취소': { bg:'#e5e7eb', color:'#374151' },
};
const POPEN_TYPE_COLOR = { 'W/G':'#b45309', '사내':'#be185d' };
// 사내 세부 유형 (현행 프로젝트_유형_코드). TO-BE 세션 자료(11.11) "사내 유형은 직접 생성" → 모두 이 화면에서 등록
const POPEN_INCO_TYPES = [
  { code:'IV58',    name:'사내-전사IT운영' },
  { code:'IV59',    name:'사내-사업지원 전사비용' },
  { code:'IV60_01', name:'사내-활동관리 (PreSales)' },
  { code:'IV60_02', name:'사내-활동관리 (과제)' },
];
function popenIncoType(code) { return POPEN_INCO_TYPES.find(function (t) { return t.code === code; }) || POPEN_INCO_TYPES[0]; }
function popenTypeLabel(a) { return a.type === '사내' ? a.incoType + ' ' + popenIncoType(a.incoType).name : 'TC27 (W/G)'; }

let popenFilterDraft = { no:'', nm:'', pm:'', date:'', type:'', sts:'' };
let popenFilter = Object.assign({}, popenFilterDraft);

const POPEN_MEMBERS = ['한민석(20011)', '류준서(21043)', '이수연(21055)', '정우성(13071)', '오세훈(13052)', '장재호(15025)', '김가은(15031)', '신성호(13016)', '권재준(60521)', '박지훈(14022)'];
const POPEN_ORGS = ['AX ERP사업부 1팀', 'AX ERP사업부', '보안사업부', '데이터사업부', '(전사)IT운영팀', 'Cloud사업부', 'NOVA PMO팀'];

function popenCost(lbrMM, lbr, otsMM, ots, mat, exp, sale, saleCst) {
  return { lbrMM:lbrMM, lbr:lbr, otsMM:otsMM, ots:ots, mat:mat, exp:exp, sale:sale, saleCst:saleCst };
}
function popenLines(svc, pm, done) {
  // done: 처리된 단계 수 (기안 포함), rej: 반려 단계
  const all = [
    { type:'기안', unit:'수행PM',          name:pm },
    { type:'협조', unit:'Account WG담당자', name:'장재호(15025)', svc:true },
    { type:'협조', unit:'Account 팀장',     name:'김가은(15031)', svc:true },
    { type:'협조', unit:'부문기획 담당자',  name:'박지훈(14022)', svc:false },
    { type:'검토', unit:'팀장',             name:'신성호(13016)' },
    { type:'승인', unit:'담당임원',         name:'권재준(60521)' },
  ];
  // 서비스기획 Y → 부문기획 담당자 제외 / N → Account 팀장 · Account WG담당자 제외
  return all.filter(function (l) { return l.svc === undefined || l.svc === svc; })
    .map(function (l) { return Object.assign({ status:'대기', date:'', comment:'' }, l); });
}

// ── 목업 데이터 (현행 W/G 구조) ──
const POPEN_APPS = {
  'WG-001': {
    type:'W/G', no:'70007601-D001', name:'2026년_차세대 ERP 고도화 W/G', svc:true,
    cnrcType:'TC', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'AX ERP사업부 1팀', rodrOrg:'AX ERP사업부', saleOrg:'AX ERP사업부 1팀',
    ldr:'류준서(21043)', pm:'한민석(20011)', acct:'장재호(15025)', acctLdr:'김가은(15031)',
    start:'2026-11-01', end:'2027-10-31', regDate:'2026-10-02', erpReg:true,
    versions:[ { ver:1, date:'2026-10-02', status:'승인요청', cost:popenCost(24, 192000000, 12, 108000000, 15000000, 8000000, 380000000, 323000000) } ],
    memo:'차세대 ERP 전환 대비 W/G 선행 과제. 고객사: 공통 / 서비스: ERP 고도화',
  },
  'WG-002': {
    type:'W/G', no:'70007602-D001', name:'2026년_보안관제 자동화 W/G', svc:false,
    cnrcType:'TC', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'보안사업부', rodrOrg:'보안사업부', saleOrg:'보안사업부',
    ldr:'정우성(13071)', pm:'한민석(20011)', acct:'', acctLdr:'',
    start:'2026-11-15', end:'2027-09-30', regDate:'2026-10-20', erpReg:false,
    versions:[ { ver:1, date:'2026-10-20', status:'저장', cost:popenCost(18, 144000000, 6, 54000000, 0, 6000000, 230000000, 204000000) } ],
    memo:'',
  },
  'WG-003': {
    type:'W/G', no:'70007588-D031', name:'2026년_데이터레이크 구축 W/G', svc:true,
    cnrcType:'TC', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'데이터사업부', rodrOrg:'데이터사업부', saleOrg:'데이터사업부',
    ldr:'이수연(21055)', pm:'한민석(20011)', acct:'장재호(15025)', acctLdr:'김가은(15031)',
    start:'2026-09-10', end:'2027-08-31', regDate:'2026-08-28', erpReg:true,
    versions:[
      { ver:2, date:'2026-10-11', status:'승인완료', cost:popenCost(30, 240000000, 10, 90000000, 20000000, 10000000, 420000000, 360000000) },
      { ver:1, date:'2026-08-30', status:'승인완료', cost:popenCost(24, 192000000, 10, 90000000, 20000000, 8000000, 360000000, 310000000) },
    ],
    memo:'데이터레이크 범위 확대에 따른 인건비 증액. 고객사: 공통 / 서비스: 데이터 플랫폼',
  },
  'WG-004': {
    type:'사내', incoType:'IV58', no:'70007610-D002', name:'26년 사내 그룹웨어 개편', svc:false,
    cnrcType:'IV', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'(전사)IT운영팀', rodrOrg:'(전사)IT운영팀', saleOrg:'(전사)IT운영팀',
    ldr:'오세훈(13052)', pm:'한민석(20011)', acct:'', acctLdr:'',
    start:'2026-10-01', end:'2027-03-31', regDate:'2026-09-12', erpReg:true,
    versions:[ { ver:1, date:'2026-09-13', status:'반려', cost:popenCost(10, 80000000, 4, 36000000, 30000000, 4000000, 0, 0) } ],
    memo:'사내 그룹웨어 UX 개편. 고객사: 사내 / 서비스: 그룹웨어',
  },
  'WG-005': {
    type:'사내', incoType:'IV59', no:'70007615-D001', name:'26년 전사 사업지원 공통 운영', svc:false,
    cnrcType:'IV', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'(전사)IT운영팀', rodrOrg:'(전사)IT운영팀', saleOrg:'(전사)IT운영팀',
    ldr:'오세훈(13052)', pm:'한민석(20011)', acct:'', acctLdr:'',
    start:'2026-11-15', end:'2027-06-30', regDate:'2026-10-04', erpReg:true,
    versions:[ { ver:1, date:'2026-10-05', status:'기안취소', cost:popenCost(8, 64000000, 0, 0, 12000000, 2000000, 0, 0) } ],
    memo:'',
  },
};
// 결재선 (버전별)
(function () {
  const a1 = POPEN_APPS['WG-001'];
  a1.versions[0].lines = popenLines(true, a1.pm);
  a1.versions[0].lines[0].status = '기안'; a1.versions[0].lines[0].date = '2026-10-02 10:14'; a1.versions[0].lines[0].comment = a1.memo;
  a1.versions[0].lines[1].status = '승인'; a1.versions[0].lines[1].date = '2026-10-02 11:20';
  POPEN_APPS['WG-002'].versions[0].lines = popenLines(false, POPEN_APPS['WG-002'].pm);
  const a3 = POPEN_APPS['WG-003'];
  a3.versions.forEach(function (v) {
    v.lines = popenLines(true, a3.pm);
    v.lines.forEach(function (l, i) { l.status = i === 0 ? '기안' : '승인'; l.date = v.date + ' 1' + i + ':00'; });
  });
  const a4 = POPEN_APPS['WG-004'];
  a4.versions[0].lines = popenLines(false, a4.pm);
  a4.versions[0].lines[0].status = '기안'; a4.versions[0].lines[0].date = '2026-09-12 16:20'; a4.versions[0].lines[0].comment = a4.memo;
  a4.versions[0].lines[1].status = '반려'; a4.versions[0].lines[1].date = '2026-09-13 09:40';
  a4.versions[0].lines[1].comment = '사업 범위/예산 규모 재검토 필요. 재료비 산정 근거 보완 후 다시 올려 주세요.';
  const a5 = POPEN_APPS['WG-005'];
  a5.versions[0].lines = popenLines(false, a5.pm);
  a5.versions[0].lines[0].status = '기안취소'; a5.versions[0].lines[0].date = '2026-10-05 09:30';
})();

function popenInjectStyle() {
  if (document.getElementById('popen-style')) return;
  const st = document.createElement('style'); st.id = 'popen-style';
  st.textContent = `
   .popen-wrap{max-width:1180px;margin:0 auto;padding:4px 2px 40px}
   .popen-title{font-size:21px;font-weight:900;color:#0f172a}
   .popen-sub{font-size:12.5px;color:#64748b;margin:2px 0 0;line-height:1.55}
   .popen-flow{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 4px;align-items:center}
   .popen-fstep{font-size:11.5px;font-weight:700;color:#64748b;background:#f8fafc;border:1px solid #e5e7eb;border-radius:99px;padding:4px 11px}
   .popen-flow i{font-style:normal;color:#cbd5e1}
   .popen-search{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:12px 0;display:grid;grid-template-columns:repeat(3,1fr) auto;gap:10px 14px;align-items:end}
   .popen-sf label{display:block;font-size:11.5px;font-weight:800;color:#475569;margin-bottom:4px}
   .popen-sf input,.popen-sf select{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px;font-size:12.5px;font-family:inherit;color:#0f172a;background:#fff}
   .popen-sbtns{display:flex;gap:6px;grid-row:1 / span 2;grid-column:4;align-self:center;flex-direction:column}
   .popen-inwrap{display:flex;gap:4px}
   .popen-btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:7px 12px;font-size:12.5px;font-weight:700;color:#334155;cursor:pointer;font-family:inherit;white-space:nowrap}
   .popen-btn:hover{border-color:#1d4ed8;color:#1d4ed8}
   .popen-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
   .popen-btn.del{border-color:#fca5a5;color:#b91c1c}
   .popen-btn.xls{border-color:#86efac;color:#166534}
   .popen-btn.sm{padding:4px 9px;font-size:11.5px}
   .popen-gbar{display:flex;align-items:center;gap:6px;margin:4px 0 8px;flex-wrap:wrap}
   .popen-gbar .cnt{font-size:12.5px;color:#475569;margin-right:auto}
   .popen-gbar .cnt b{color:#1d4ed8}
   .popen-guide{font-size:11.5px;color:#64748b;margin:0 0 8px}
   .popen-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;font-size:12.5px}
   .popen-table th{background:#f8fafc;text-align:center;padding:9px 10px;font-weight:800;color:#475569;border-bottom:1px solid #e5e7eb;white-space:nowrap}
   .popen-table td{padding:9px 10px;border-bottom:1px solid #f1f5f9;color:#1f2937;text-align:center}
   .popen-table td.l{text-align:left}.popen-table td.r{text-align:right}
   .popen-table tr.click{cursor:pointer}
   .popen-table tr.click:hover td{background:#f8faff}
   .popen-table tr.err td{background:#fef9c3}
   .popen-table tr.new td{background:#f0fdf4}
   .popen-tbadge{display:inline-block;font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:99px;margin-left:6px}
   .popen-sbadge{display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;white-space:nowrap}
   .popen-errbtn{border:1px solid #f59e0b;background:#fff7ed;color:#b45309;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:800;cursor:pointer}
   .popen-empty{padding:30px;text-align:center;color:#94a3b8}
   .popen-wf{display:flex;gap:0;margin:10px 0 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff}
   .popen-wf span{flex:1;text-align:center;padding:8px;font-size:12px;font-weight:800;color:#94a3b8;border-right:1px solid #e5e7eb}
   .popen-wf span:last-child{border-right:0}
   .popen-wf span.on{background:#eff6ff;color:#1d4ed8}
   .popen-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;margin-top:12px}
   .popen-dtop{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
   .popen-dno{font-size:13px;font-weight:800;color:#64748b}
   .popen-dname{font-size:18px;font-weight:900;color:#0f172a}
   .popen-nameinput{font-size:16px;font-weight:800;border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;min-width:380px;font-family:inherit}
   .popen-dbtns{margin-left:auto;display:flex;gap:6px}
   .popen-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #e5e7eb;border-left:1px solid #e5e7eb;margin-top:14px}
   .popen-cell{display:grid;grid-template-columns:110px 1fr;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;min-height:38px}
   .popen-cell .k{background:#f8fafc;font-size:12px;font-weight:800;color:#475569;padding:9px 10px}
   .popen-cell .k em{color:#dc2626;font-style:normal}
   .popen-cell .v{font-size:12.5px;color:#0f172a;padding:6px 10px;display:flex;align-items:center;gap:4px}
   .popen-cell .v input,.popen-cell .v select{flex:1;min-width:0;border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;font-size:12.5px;font-family:inherit;background:#fff}
   .popen-ver{display:flex;gap:6px;margin:16px 0 10px;flex-wrap:wrap}
   .popen-chip{border:1px solid #d1d5db;background:#fff;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700;color:#475569;cursor:pointer}
   .popen-chip.on{border-color:#1d4ed8;background:#eff6ff;color:#1d4ed8}
   .popen-sec{font-size:13px;font-weight:900;color:#0f172a;margin:16px 0 8px;display:flex;align-items:center;gap:8px}
   .popen-total{display:inline-flex;gap:10px;align-items:center;border:1px solid #e5e7eb;border-radius:8px;padding:7px 12px;font-size:12.5px;background:#f8fafc}
   .popen-total b{font-size:14px;color:#0f172a}
   .popen-ct td input{width:100%;box-sizing:border-box;border:1px solid #93c5fd;border-radius:5px;padding:4px 6px;text-align:right;font-size:12.5px;font-weight:800;font-family:inherit;background:#eff6ff}
   .popen-ct{table-layout:fixed}
   .popen-ct td.b{font-weight:800}
   .popen-ct tr.sum td{background:#f8fafc;font-weight:800}
   .popen-up{color:#dc2626}.popen-dn{color:#16a34a}
   .popen-lines{width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #e5e7eb}
   .popen-lines th{background:#f8fafc;padding:8px;font-weight:800;color:#475569;border-bottom:1px solid #e5e7eb}
   .popen-lines td{padding:8px;border-bottom:1px solid #f1f5f9;text-align:center}
   .popen-lines td.l{text-align:left}
   .popen-stt{display:inline-block;min-width:56px;font-weight:800;border-radius:99px;padding:2px 8px;font-size:11px}
   .popen-stt.기안{background:#eff6ff;color:#1d4ed8}.popen-stt.승인{background:#dcfce7;color:#166534}
   .popen-stt.반려{background:#fee2e2;color:#991b1b}.popen-stt.대기{background:#f1f5f9;color:#94a3b8}
   .popen-stt.기안취소{background:#e5e7eb;color:#374151}
   .popen-memo{width:100%;box-sizing:border-box;min-height:64px;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12.5px;font-family:inherit}
   .popen-rule{font-size:11.5px;color:#475569;background:#f8fafc;border:1px solid #e5e7eb;border-radius:99px;padding:3px 10px;font-weight:700}
   .popen-reject{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12.5px;color:#991b1b}
   .popen-mask{position:fixed;inset:0;background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;z-index:9000}
   .popen-modal{background:#fff;border-radius:12px;min-width:340px;max-width:620px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
   .popen-mhead{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:900;font-size:14px}
   .popen-mhead button{margin-left:auto;border:0;background:none;font-size:16px;cursor:pointer;color:#64748b}
   .popen-mbody{padding:16px;font-size:13px;color:#0f172a;line-height:1.6}
   .popen-mbody ul{margin:0;padding-left:18px}
   .popen-mfoot{display:flex;justify-content:center;gap:8px;padding:0 16px 16px}
   .popen-pick{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:9px 6px;font-size:12.5px;cursor:pointer;font-family:inherit}
   .popen-pick:hover{background:#eff6ff}
   .popen-form{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid #e5e7eb;border-left:1px solid #e5e7eb;margin-top:12px}
   #s-project-open .popen-table td,#s-project-open .popen-lines td{font-size:12.5px}
   #s-project-open .popen-table th,#s-project-open .popen-lines th{font-size:12px}
  `;
  document.head.appendChild(st);
}

// ── 공통 계산 ──
function popenWon(n) { return (Number(n) || 0).toLocaleString('ko-KR'); }
function popenMM(n) { return (Math.round((Number(n) || 0) * 1000) / 1000).toString(); }
function popenBgt(c) { return (Number(c.lbr) || 0) + (Number(c.ots) || 0) + (Number(c.mat) || 0) + (Number(c.exp) || 0); }
function popenMargin(c) { return c.sale > 0 ? Math.round((c.sale - c.saleCst) * 1000 / c.sale) / 10 : 0; }
function popenLatest(a) { return a.versions[0]; }
function popenStatus(a) { return popenLatest(a).status; }
function popenZero() { return popenCost(0, 0, 0, 0, 0, 0, 0, 0); }
// 현행 findBfrCst: 지금 버전보다 낮고 반려 · 기안취소가 아닌 가장 가까운 버전
function popenCompare(a, verNo) {
  const cur = a.versions.find(function (v) { return v.ver === verNo; });
  // 비교할 이전 버전이 없으면(첫 등록 V1 등) 최초 / 변경 전(A)은 0 (현행과 같음)
  const ok = a.versions.filter(function (v) { return v.ver < verNo && v.status !== '반려' && v.status !== '기안취소'; });
  if (!ok.length) return { fst: popenZero(), bf: popenZero(), lst: cur.cost };
  return { fst: ok[ok.length - 1].cost, bf: ok[0].cost, lst: cur.cost };
}
function popenRule(a, verNo) {
  const cur = a.versions.find(function (v) { return v.ver === verNo; }) || popenLatest(a);
  const amt = popenBgt(cur.cost);
  if (a.versions.length < 2) return 'W/G 비용 ' + (amt < 3000000000 ? '30억 미만' : '30억 이상');
  const cmp = popenCompare(a, cur.ver);
  const chg = Math.abs(amt - popenBgt(cmp.bf));
  let t;
  if (amt < 1000000000) t = chg < 1000000 ? '1백만원 미만' : (chg < 30000000 ? '1백만~3천만원' : '3천만원 이상');
  else if (amt < 3000000000) t = chg < 10000000 ? '1천만원 미만' : (chg < 50000000 ? '1천만~5천만원' : '5천만원 이상');
  else t = chg < 20000000 ? '2천만원 미만' : (chg < 100000000 ? '2천만~1억원' : '1억원 이상');
  return '변경 ' + t;
}
function popenToast(m) { if (typeof showToast === 'function') showToast(m); }
function popenEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

function renderProjectOpen() {
  popenInjectStyle();
  const host = document.getElementById('s-project-open');
  if (!host) return;
  let html;
  if (popenView === 'detail') html = popenDetailHtml();
  else if (popenView === 'appr') html = popenApprHtml();
  else if (popenView === 'new') html = popenNewHtml();
  else html = popenListHtml();
  host.innerHTML = html + popenModalHtml();
}

// ── 목록 (현행 W/G관리) ──
function popenRows() {
  const f = popenFilter;
  return Object.keys(POPEN_APPS).map(function (k) { return Object.assign({ id: k }, POPEN_APPS[k]); }).filter(function (a) {
    if (f.no && a.no.toLowerCase().indexOf(f.no.trim().toLowerCase()) < 0) return false;
    if (f.nm && a.name.toLowerCase().indexOf(f.nm.trim().toLowerCase()) < 0) return false;
    if (f.pm && a.pm !== f.pm) return false;
    if (f.date && a.regDate !== f.date) return false;
    if (f.type && a.type !== f.type) return false;
    if (f.sts && popenStatus(a) !== f.sts) return false;
    return true;
  });
}
function popenListHtml() {
  const rows = popenRows();
  const fd = popenFilterDraft;
  const flow = ['저장 (등록)', '결재선 지정 → 승인요청', '승인완료', '반려 / 기안취소 → 비용변경 후 다시 승인요청']
    .map(function (s, i) { return '<span class="popen-fstep">' + s + '</span>' + (i < 3 ? '<i>→</i>' : ''); }).join('');
  const typeOpts = [['', '전체'], ['W/G', 'W/G'], ['사내', '사내']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === fd.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  const stsOpts = ['<option value="">전체</option>'].concat(POPEN_STS.map(function (s) { return '<option' + (s === fd.sts ? ' selected' : '') + '>' + s + '</option>'; })).join('');
  const up = popenUploaded.map(function (r, i) {
    const err = r.errors.length > 0;
    return '<tr class="' + (err ? 'err' : 'new') + '">'
      // 오류 행도 체크 가능 — [선택삭제]로 지울 수 있게. [선택등록]에서는 오류 행을 건너뜀
      + '<td><input type="checkbox"' + (popenChecked['U' + i] ? ' checked' : '') + ' onclick="event.stopPropagation();popenCheck(\'U' + i + '\',this.checked)"></td>'
      + '<td>' + popenEsc(r.no) + '</td><td class="l">' + popenEsc(r.name) + '<span class="popen-tbadge" style="background:#b4530922;color:#b45309">W/G</span></td>'
      + '<td>' + popenEsc(r.pm) + '</td><td>' + popenEsc(r.acct) + '</td><td class="r">' + popenWon(r.bgt) + '</td><td></td>'
      + '<td>' + (err ? '<button class="popen-errbtn" onclick="popenShowErr(' + i + ')">오류</button>' : '') + '</td><td></td></tr>';
  }).join('');
  const body = rows.map(function (a) {
    const st = popenStatus(a), ss = POPEN_STS_STYLE[st];
    const tc = POPEN_TYPE_COLOR[a.type];
    return '<tr class="click" onclick="popenOpenDetail(\'' + a.id + '\')">'
      + '<td><input type="checkbox"' + (popenChecked[a.id] ? ' checked' : '') + ' onclick="event.stopPropagation();popenCheck(\'' + a.id + '\',this.checked)"></td>'
      + '<td>' + a.no + '</td>'
      + '<td class="l"><b>' + a.name + '</b><span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + a.type + '</span>' + (a.type === '사내' ? '<div style="font-size:11px;color:#94a3b8">' + popenTypeLabel(a) + '</div>' : '') + '</td>'
      + '<td>' + a.pm.replace(/\(.*/, '') + '</td><td>' + (a.acct ? a.acct.replace(/\(.*/, '') : '') + '</td>'
      + '<td class="r">' + popenWon(popenBgt(popenLatest(a).cost)) + '</td><td>' + a.regDate + '</td>'
      + '<td><span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + '">' + st + '</span></td>'
      + '<td style="white-space:nowrap"><button class="popen-btn sm" onclick="event.stopPropagation();popenOpenDetail(\'' + a.id + '\')">상세</button>'
      + ((st === '반려' || st === '기안취소') ? ' <button class="popen-btn sm del" onclick="event.stopPropagation();popenReapply(\'' + a.id + '\')">재신청</button>' : '') + '</td></tr>';
  }).join('');
  const total = rows.length + popenUploaded.length;
  return '<div class="popen-wrap">'
    + '<div class="popen-title">프로젝트 개설 관리</div>'
    + '<div class="popen-sub">W/G / 사내 프로젝트를 등록하고 비용 결재를 받는 화면입니다. 비용 결재가 승인완료되면 MIS 프로젝트로 자동 등록됩니다.</div>'
    + '<div class="popen-flow">' + flow + '</div>'
    + '<div class="popen-search">'
    + '<div class="popen-sf"><label>프로젝트번호</label><input value="' + popenEsc(fd.no) + '" oninput="popenFilterDraft.no=this.value" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + '<div class="popen-sf"><label>프로젝트명</label><input value="' + popenEsc(fd.nm) + '" oninput="popenFilterDraft.nm=this.value" onkeydown="if(event.key===\'Enter\')popenDoSearch()"></div>'
    + '<div class="popen-sf"><label>PM</label><div class="popen-inwrap"><input readonly placeholder="사원 검색" value="' + popenEsc(fd.pm) + '" onclick="popenPickOpen(\'member\',\'filterPm\')"><button class="popen-btn sm" onclick="popenPickOpen(\'member\',\'filterPm\')">🔍</button></div></div>'
    + '<div class="popen-sbtns"><button class="popen-btn pri" onclick="popenDoSearch()">조회</button><button class="popen-btn" onclick="popenResetFilter()">초기화</button></div>'
    + '<div class="popen-sf"><label>등록일</label><input type="date" value="' + fd.date + '" onchange="popenFilterDraft.date=this.value"></div>'
    + '<div class="popen-sf"><label>유형</label><select onchange="popenFilterDraft.type=this.value">' + typeOpts + '</select></div>'
    + '<div class="popen-sf"><label>상태</label><select onchange="popenFilterDraft.sts=this.value">' + stsOpts + '</select></div>'
    + '</div>'
    + '<div class="popen-gbar"><span class="cnt">총 <b>' + total + '</b> 건</span>'
    + '<button class="popen-btn pri" onclick="popenNewOpen()">+ 신규 등록</button>'
    + '<button class="popen-btn xls" onclick="popenUpload()">⬆ 엑셀</button>'
    + '<button class="popen-btn xls" onclick="popenToast(\'WG.xlsx 파일을 내려받았습니다. (목업)\')">⬇ 엑셀</button>'
    + '<button class="popen-btn" onclick="popenToast(\'WorkingGroup템플릿.xlsx 파일을 내려받았습니다. (목업)\')">템플릿</button>'
    + '<button class="popen-btn del" onclick="popenDelChecked()">선택삭제</button>'
    + '<button class="popen-btn pri" onclick="popenRegChecked()">선택등록</button></div>'
    + '<div class="popen-guide">※ 여러 건은 템플릿을 내려받아 작성한 뒤 엑셀 업로드 → 선택등록. 한 건은 "+ 신규 등록"</div>'
    + '<table class="popen-table"><thead><tr><th style="width:34px"></th><th>프로젝트 번호</th><th>프로젝트명</th><th>PM</th><th>Account담당자</th><th>등록비용</th><th>등록일</th><th>상태</th><th></th></tr></thead><tbody>'
    + up + (body || (up ? '' : '<tr><td colspan="9" class="popen-empty">데이터가 없습니다.</td></tr>')) + '</tbody></table>'
    + '</div>';
}

// ── 정보관리 (현행 WorkingGroupDetail) ──
function popenCan(a, ver) {
  // 현행 setBtnView. 목업 로그인 = 수행PM
  const st = ver.status, latest = ver === popenLatest(a);
  if (st === '저장' && latest) return { del:true, save:true, appr:true, cost:false, cancel:false, edit:true };
  if (st === '승인요청' || !latest) return { del:false, save:false, appr:true, cost:false, cancel: st === '승인요청' && latest, edit:false };
  return { del:false, save:false, appr:true, cost:true, cancel:false, edit:false };
}
function popenVerChips(a) {
  return '<div class="popen-ver">' + a.versions.map(function (v) {
    const ss = POPEN_STS_STYLE[v.status];
    return '<span class="popen-chip' + (v.ver === popenVer ? ' on' : '') + '" onclick="popenPickVer(' + v.ver + ')">V' + v.ver + '.0 ' + v.date
      + ' <span class="popen-sbadge" style="background:' + ss.bg + ';color:' + ss.color + ';padding:1px 7px">' + v.status + '</span></span>';
  }).join('') + '</div>';
}
function popenCostHtml(a, ver, edit) {
  const cmp = popenCompare(a, ver.ver), c = edit ? popenDraft.cost : cmp.lst;
  function cell(key, isMM) {
    if (edit) return '<input value="' + (c[key] || 0) + '" oninput="popenSetCost(\'' + key + '\',this.value)">';
    return isMM ? popenMM(c[key]) : popenWon(c[key]);
  }
  function d(n, isMM) { const v = isMM ? Math.round(n * 1000) / 1000 : n; return '<span class="' + (v > 0 ? 'popen-up' : (v < 0 ? 'popen-dn' : '')) + '">' + (isMM ? popenMM(v) : popenWon(v)) + '</span>'; }
  const mmv = function (x, k) { return k ? popenMM(x[k]) : '-'; };
  const wonv = function (v) { return popenWon(v); };
  function row(label, mmKey, amtKey) {
    const f = cmp.fst, b = cmp.bf;
    return '<tr><td><b>' + label + '</b></td>'
      + '<td>' + mmv(f, mmKey) + '</td><td class="r">' + wonv(f[amtKey]) + '</td>'
      + '<td>' + mmv(b, mmKey) + '</td><td class="r">' + wonv(b[amtKey]) + '</td>'
      + '<td class="b">' + (mmKey ? cell(mmKey, true) : '-') + '</td><td class="r b">' + cell(amtKey, false) + '</td>'
      + '<td>' + (mmKey ? d((Number(c[mmKey]) || 0) - (b[mmKey] || 0), true) : '-') + '</td><td class="r">' + d((Number(c[amtKey]) || 0) - (b[amtKey] || 0)) + '</td></tr>';
  }
  const sumMM = function (x) { return (Number(x.lbrMM) || 0) + (Number(x.otsMM) || 0); };
  const sum = '<tr class="sum"><td>합계</td><td>' + popenMM(sumMM(cmp.fst)) + '</td><td class="r">' + wonv(popenBgt(cmp.fst)) + '</td>'
    + '<td>' + popenMM(sumMM(cmp.bf)) + '</td><td class="r">' + wonv(popenBgt(cmp.bf)) + '</td>'
    + '<td>' + popenMM(sumMM(c)) + '</td><td class="r">' + popenWon(popenBgt(c)) + '</td>'
    + '<td>' + d(sumMM(c) - sumMM(cmp.bf), true) + '</td><td class="r">' + d(popenBgt(c) - popenBgt(cmp.bf)) + '</td></tr>';
  const m = function (x) { return popenMargin(x); };
  function prow(label, key, pct) {
    const f = pct ? m(cmp.fst) : cmp.fst[key], b = pct ? m(cmp.bf) : cmp.bf[key], l = pct ? m(c) : c[key];
    const lv = pct ? l + '%' : (edit ? '<input value="' + (c[key] || 0) + '" oninput="popenSetCost(\'' + key + '\',this.value)">' : popenWon(l));
    const diff = Math.round(((Number(l) || 0) - (b || 0)) * 10) / 10;
    return '<tr><td><b>' + label + '</b></td><td class="r">' + (pct ? f + '%' : popenWon(f)) + '</td><td class="r">' + (pct ? b + '%' : popenWon(b)) + '</td>'
      + '<td class="r b">' + lv + '</td><td class="r"><span class="' + (diff > 0 ? 'popen-up' : (diff < 0 ? 'popen-dn' : '')) + '">' + (pct ? diff + '%p' : popenWon(diff)) + '</span></td></tr>';
  }
  return '<div class="popen-sec">총 비용 <span class="popen-total"><b>' + popenWon(popenBgt(c)) + '</b> 원</span></div>'
    + '<div class="popen-sec">W/G 비용정보</div>'    + '<table class="popen-table popen-ct"><thead><tr><th rowspan="2">구분</th><th colspan="2">최초</th><th colspan="2">변경 전(A)</th><th colspan="2">변경 후(B)</th><th colspan="2">증감(B-A)</th></tr>'
    + '<tr><th>M/M</th><th>금액</th><th>M/M</th><th>금액</th><th>M/M</th><th>금액</th><th>M/M</th><th>금액</th></tr></thead><tbody>'
    + row('인건비', 'lbrMM', 'lbr') + row('외주비', 'otsMM', 'ots') + row('재료비', null, 'mat') + row('경비', null, 'exp') + sum + '</tbody></table>'
    + '<div class="popen-sec">W/G 손익정보</div>'
    + '<table class="popen-table popen-ct"><thead><tr><th>구분</th><th>최초</th><th>변경 전(A)</th><th>변경 후(B)</th><th>증감(B-A)</th></tr></thead><tbody>'
    + prow('매출액', 'sale') + prow('매출원가', 'saleCst') + prow('매출마진', null, true) + '</tbody></table>';
}
function popenField(k, req, val, editKind, key) {
  let v = popenEsc(val || '');
  if (editKind === 'text') v = '<input value="' + v + '" oninput="popenDraft.' + key + '=this.value">';
  else if (editKind === 'date') v = '<input type="date" value="' + v + '" onchange="popenDraft.' + key + '=this.value">';
  else if (editKind === 'member' || editKind === 'org') v = '<input readonly value="' + v + '" onclick="popenPickOpen(\'' + editKind + '\',\'' + key + '\')"><button class="popen-btn sm" onclick="popenPickOpen(\'' + editKind + '\',\'' + key + '\')">🔍</button>';
  return '<div class="popen-cell"><div class="k">' + k + (req ? ' <em>*</em>' : '') + '</div><div class="v">' + v + '</div></div>';
}
function popenWfHtml(step) {
  return '<div class="popen-wf"><span class="' + (step === 1 ? 'on' : '') + '">① W/G 정보관리</span><span class="' + (step === 2 ? 'on' : '') + '">② W/G 비용승인</span></div>';
}
function popenDetailHtml() {
  const a = POPEN_APPS[popenSelectedId];
  if (!a) { popenView = 'list'; return popenListHtml(); }
  const ver = a.versions.find(function (v) { return v.ver === popenVer; }) || popenLatest(a);
  const can = popenCan(a, ver), e = can.edit, D = e ? popenDraft : a;
  const tc = POPEN_TYPE_COLOR[a.type];
  const btns = '<button class="popen-btn" onclick="popenBackToList()">목록</button>'
    + (can.del ? '<button class="popen-btn del" onclick="popenDelete()">삭제</button>' : '')
    + (can.cost ? '<button class="popen-btn pri" onclick="popenModifyCost()">비용변경</button>' : '')
    + (can.save ? '<button class="popen-btn pri" onclick="popenSave()">저장</button>' : '')
    + (can.cancel ? '<button class="popen-btn del" onclick="popenCancelDraft()">기안취소</button>' : '')
    + (can.appr ? '<button class="popen-btn pri" onclick="popenGoAppr()">결재선생성</button>' : '');
  return '<div class="popen-wrap">' + popenWfHtml(1)
    + '<div class="popen-card">'
    + '<div class="popen-dtop"><span class="popen-dno">' + a.no + '</span>'
    + (e ? '<input class="popen-nameinput" value="' + popenEsc(popenDraft.name) + '" placeholder="사업기회명을 등록해주세요." oninput="popenDraft.name=this.value">' : '<span class="popen-dname">' + a.name + '</span>')
    + '<span class="popen-tbadge" style="background:' + tc + '22;color:' + tc + '">' + a.type + '</span>'
    + '<div class="popen-dbtns">' + btns + '</div></div>'
    // 승인완료된 버전이 하나라도 있으면 MIS 프로젝트로 자동 등록된 상태 (PM 답변 11.05: 선행 단계 완료 → I/F 자동 등록, 처음 상태 착수완료)
    + (a.versions.some(function (v) { return v.status === '승인완료'; })
      ? '<div class="popen-reject" style="background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        + '<span><b>MIS 프로젝트 자동 등록됨</b> 비용 결재가 승인완료되어 MIS 프로젝트로 자동 등록됐습니다 (처음 상태 착수완료). 이후 비용변경 승인도 프로젝트에 반영됩니다.</span>'
        + '<button class="popen-btn" style="margin-left:auto" onclick="showProjectStatus()">프로젝트 현황에서 보기</button></div>'
      : '')
    + '<div class="popen-grid">'
    + popenField('계약유형', false, a.cnrcType)
    + popenField('계약완료여부', false, a.cnrcCmpl ? 'Yes' : 'No')
    + popenField('고객사', false, a.cstco)
    + popenField('주 수행부서', false, D.mainOrg, e ? 'org' : '', 'mainOrg')
    + popenField('영업부서', false, D.rodrOrg, e ? 'org' : '', 'rodrOrg')
    + popenField('매출귀속부서', true, D.saleOrg, e ? 'org' : '', 'saleOrg')
    + popenField('W/G리더', false, D.ldr, e ? 'member' : '', 'ldr')
    + popenField('수행PM', true, D.pm, e ? 'member' : '', 'pm')
    + popenField('프로젝트시작일', false, D.start, e ? 'date' : '', 'start')
    + popenField('프로젝트종료일', false, D.end, e ? 'date' : '', 'end')
    + popenField('등록일', false, a.regDate)
    + popenField('프로젝트 유형', false, popenTypeLabel(a))
    + '</div>'
    + popenVerChips(a)
    + popenCostHtml(a, ver, e)
    + '</div></div>';
}

// ── 비용승인 · 결재선 지정 (현행 WorkingGroupApprovalDetail) ──
function popenApprHtml() {
  const a = POPEN_APPS[popenSelectedId];
  if (!a) { popenView = 'list'; return popenListHtml(); }
  const ver = a.versions.find(function (v) { return v.ver === popenVer; }) || popenLatest(a);
  const editable = ver.status === '저장' && ver === popenLatest(a);
  const lines = ver.lines || [];
  const rejected = lines.find(function (l) { return l.status === '반려'; });
  const btns = '<button class="popen-btn" onclick="popenBackToList()">목록</button>'
    + '<button class="popen-btn" onclick="popenGoDetail()">← 정보관리</button>'
    + (ver.status === '승인요청' && ver === popenLatest(a) ? '<button class="popen-btn del" onclick="popenCancelDraft()">기안취소</button>' : '')
    + (editable ? '<button class="popen-btn pri" onclick="popenRequest()">승인요청</button>' : '');
  const lineRows = lines.map(function (l, i) {
    const chg = editable && i > 0 ? ' <button class="popen-btn sm" onclick="popenPickOpen(\'member\',\'line' + i + '\')">🔍 변경</button>' : '';
    return '<tr><td>' + l.type + '</td><td>' + l.unit + '</td><td class="l">' + l.name + chg + '</td>'
      + '<td><span class="popen-stt ' + l.status + '">' + l.status + '</span></td><td>' + (l.date || '-') + '</td><td class="l">' + popenEsc(l.comment || '') + '</td></tr>';
  }).join('');
  return '<div class="popen-wrap">' + popenWfHtml(2)
    + '<div class="popen-card">'
    + '<div class="popen-dtop"><span class="popen-dno">' + a.no + '</span><span class="popen-dname">' + a.name + '</span>'
    + '<div class="popen-dbtns">' + btns + '</div></div>'
    + '<div class="popen-grid">'
    + popenField('영업부서', false, a.rodrOrg) + popenField('매출귀속부서', false, a.saleOrg) + popenField('W/G리더', false, a.ldr)
    + popenField('수행PM', false, a.pm) + popenField('프로젝트시작일', false, a.start) + popenField('프로젝트종료일', false, a.end)
    + '</div>'
    + popenVerChips(a)
    + '<div class="popen-sec">결재선 <span class="popen-rule">전결 규정: ' + popenRule(a, ver.ver) + '</span>'
    + '<span class="popen-rule">서비스기획 ' + (a.svc ? 'Y' : 'N') + '</span></div>'
    + '<table class="popen-lines"><thead><tr><th style="width:60px">구분</th><th style="width:150px">결재 단위</th><th>결재자</th><th style="width:80px">상태</th><th style="width:130px">처리일시</th><th>의견</th></tr></thead><tbody>' + lineRows + '</tbody></table>'
    + (rejected ? '<div class="popen-reject"><b>반려</b> ' + rejected.name + ' — ' + popenEsc(rejected.comment || '') + '</div>' : '')
    + '<div class="popen-sec">메모</div>'
    + (editable
      ? '<textarea class="popen-memo" placeholder="비용총액 신규등록 및 변경 사유 (해당 고객사 및 서비스 명시)" oninput="popenMemo=this.value">' + popenEsc(popenMemo) + '</textarea>'
      : '<div class="popen-memo" style="min-height:0;background:#f8fafc">' + popenEsc((lines[0] && lines[0].comment) || '-') + '</div>')
    + popenCostHtml(a, ver, false)
    + '</div></div>';
}

// ── 신규 등록 (엑셀 템플릿과 같은 항목, 1건) ──
function popenNewHtml() {
  const f = popenNewForm;
  function inp(k, req, key, kind) {
    let v;
    if (kind === 'member' || kind === 'org') v = '<input readonly value="' + popenEsc(f[key]) + '" onclick="popenPickOpen(\'' + kind + '\',\'new.' + key + '\')"><button class="popen-btn sm" onclick="popenPickOpen(\'' + kind + '\',\'new.' + key + '\')">🔍</button>';
    else if (kind === 'yn') v = '<select onchange="popenNewForm.' + key + '=this.value;renderProjectOpen()"><option' + (f[key] === 'Y' ? ' selected' : '') + '>Y</option><option' + (f[key] === 'N' ? ' selected' : '') + '>N</option></select>';
    else if (kind === 'type') v = '<select onchange="popenNewForm.type=this.value;renderProjectOpen()"><option' + (f.type === 'W/G' ? ' selected' : '') + '>W/G</option><option' + (f.type === '사내' ? ' selected' : '') + '>사내</option></select>';
    else v = '<input' + (kind === 'date' ? ' type="date"' : '') + ' value="' + popenEsc(f[key]) + '" placeholder="' + (key === 'no' ? '예: 70007620-D001' : '') + '" oninput="popenNewForm.' + key + '=this.value">';
    return '<div class="popen-cell"><div class="k">' + k + (req ? ' <em>*</em>' : '') + '</div><div class="v">' + v + '</div></div>';
  }
  const inco = f.type === '사내' ? popenIncoType(f.incoType) : null;
  const incoSel = '<div class="popen-cell"><div class="k">사내 세부 유형 <em>*</em></div><div class="v"><select onchange="popenNewForm.incoType=this.value;renderProjectOpen()">'
    + POPEN_INCO_TYPES.map(function (t) { return '<option value="' + t.code + '"' + (t.code === f.incoType ? ' selected' : '') + '>' + t.code + ' ' + t.name + '</option>'; }).join('')
    + '</select></div></div>';
  const head = '<div class="popen-wrap">'
    + '<div class="popen-card">'
    + '<div class="popen-dtop"><span class="popen-dname">W/G / 사내 프로젝트 신규 등록</span>'
    + '<div class="popen-dbtns"><button class="popen-btn" onclick="popenBackToList()">취소</button>'
    + '<button class="popen-btn pri" onclick="popenNewSubmit()">등록</button>'
    + '</div></div>';
  return head
    + '<div class="popen-sub" style="margin-top:4px">엑셀 템플릿과 같은 항목을 한 건씩 입력합니다. 등록하면 상태 "저장"으로 만들어지고, 정보관리에서 결재선생성 → 승인요청을 합니다.</div>'
    + '<div class="popen-form">'
    + inp('유형', true, 'type', 'type') + (inco ? incoSel : inp('서비스기획여부', true, 'svc', 'yn'))
    + (inco ? inp('서비스기획여부', true, 'svc', 'yn') + '<div class="popen-cell"></div>' : '')
    + inp('프로젝트번호', true, 'no') + inp('프로젝트명', true, 'name')
    + inp('수행PM', true, 'pm', 'member') + inp('매출귀속부서', true, 'saleOrg', 'org')
    + inp('PJT 시작일', true, 'start', 'date') + inp('PJT 종료일', true, 'end', 'date')
    + inp('영업부서', false, 'rodrOrg', 'org') + '<div class="popen-cell"></div>'
    + (f.svc === 'Y' ? inp('Account담당자', false, 'acct', 'member') + inp('Account팀장', false, 'acctLdr', 'member') : '')
    + inp('인건비 투입MM', false, 'lbrMM') + inp('인건비', false, 'lbr')
    + inp('외주비 투입MM', false, 'otsMM') + inp('외주비', false, 'ots')
    + inp('재료비', false, 'mat') + inp('경비', false, 'exp')
    + inp('예산금액', true, 'bgt') + '<div class="popen-cell"></div>'
    + '</div></div></div>';
}

// ── 팝업 (확인 · 오류 · 검색) ──
function popenModalHtml() {
  if (popenConfirm) {
    return '<div class="popen-mask"><div class="popen-modal"><div class="popen-mbody" style="text-align:center;font-weight:800;padding:24px 20px">' + popenConfirm.msg + '</div>'
      + '<div class="popen-mfoot">' + (popenConfirm.ok ? '<button class="popen-btn pri" onclick="popenConfirmOk()">확인</button><button class="popen-btn" onclick="popenConfirm=null;renderProjectOpen()">취소</button>'
        : '<button class="popen-btn pri" onclick="popenConfirm=null;renderProjectOpen()">확인</button>') + '</div></div></div>';
  }
  if (popenErrPopup !== null) {
    const r = popenUploaded[popenErrPopup];
    return '<div class="popen-mask"><div class="popen-modal" style="width:560px"><div class="popen-mhead">업로드 오류 메시지<button onclick="popenErrPopup=null;renderProjectOpen()">✕</button></div>'
      + '<div class="popen-mbody"><ul>' + r.errors.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul></div>'
      + '<div class="popen-mfoot"><button class="popen-btn" onclick="popenErrPopup=null;renderProjectOpen()">닫기</button></div></div></div>';
  }
  if (popenPick) {
    const list = popenPick.kind === 'org' ? POPEN_ORGS : POPEN_MEMBERS;
    return '<div class="popen-mask" onclick="if(event.target===this){popenPick=null;renderProjectOpen()}"><div class="popen-modal" style="width:380px"><div class="popen-mhead">' + (popenPick.kind === 'org' ? '조직 검색' : '사원 검색') + '<button onclick="popenPick=null;renderProjectOpen()">✕</button></div>'
      + '<div class="popen-mbody" style="max-height:320px;overflow:auto;padding:8px 12px">' + list.map(function (x) { return '<button class="popen-pick" onclick="popenPickSet(\'' + x + '\')">' + x + '</button>'; }).join('') + '</div></div></div>';
  }
  return '';
}

// ── 이벤트 ──
function popenDoSearch() { popenFilter = Object.assign({}, popenFilterDraft); renderProjectOpen(); }
function popenResetFilter() { popenFilterDraft = { no:'', nm:'', pm:'', date:'', type:'', sts:'' }; popenFilter = Object.assign({}, popenFilterDraft); renderProjectOpen(); }
function popenCheck(id, v) { popenChecked[id] = v; }
function popenShowErr(i) { popenErrPopup = i; renderProjectOpen(); }
function popenPickOpen(kind, target) { popenPick = { kind: kind, target: target }; renderProjectOpen(); }
function popenPickSet(v) {
  const t = popenPick.target; popenPick = null;
  if (t === 'filterPm') popenFilterDraft.pm = v;
  else if (t.indexOf('line') === 0) { const a = POPEN_APPS[popenSelectedId]; popenLatest(a).lines[+t.substring(4)].name = v; }
  else if (t.indexOf('new.') === 0) popenNewForm[t.substring(4)] = v;
  else if (popenDraft) popenDraft[t] = v;
  renderProjectOpen();
}
function popenConfirmOk() { const f = popenConfirm.ok; popenConfirm = null; f(); renderProjectOpen(); }

// 엑셀 업로드 (목업: 정상 1행 + 오류 1행이 올라온 것으로 표시)
function popenUpload() {
  popenUploaded = [
    { no:'70007620-D001', name:'2026년_클라우드 운영 자동화 W/G', pm:'류준서', pmNo:'21043', acct:'장재호', bgt:186000000, start:'2026-12-01', end:'2027-11-30', errors:[] },
    { no:'7000762-D01', name:'2026년_보안관제 자동화 W/G', pm:'이수연', pmNo:'', acct:'', bgt:0, start:'2027-03-01', end:'2026-12-31',
      errors:['프로젝트번호 형식을 확인해 주세요.', '수행PM사번을 입력해 주세요.', 'PJT 시작일/종료일을 확인해 주세요', '예산금액을 입력해 주세요.'] },
  ];
  popenChecked['U0'] = true;
  renderProjectOpen();
  const errCnt = popenUploaded.filter(function (r) { return r.errors.length; }).length;
  popenToast('엑셀 ' + popenUploaded.length + '행을 읽었습니다 (정상 ' + (popenUploaded.length - errCnt) + ' / 오류 ' + errCnt + '). [선택등록]을 눌러야 등록됩니다.');
}
function popenRegChecked() {
  const idx = popenUploaded.map(function (r, i) { return i; }).filter(function (i) { return popenChecked['U' + i] && !popenUploaded[i].errors.length; });
  if (!idx.length) {
    // 오류 행만 체크했으면 안내 (체크한 행이 아예 없으면 현행처럼 아무것도 하지 않음)
    const errOnly = popenUploaded.some(function (r, i) { return popenChecked['U' + i] && r.errors.length; });
    if (errOnly) { popenConfirm = { msg: '오류가 있는 행은 등록할 수 없습니다.<br>엑셀을 고쳐 다시 올리거나 [선택삭제]하세요.' }; renderProjectOpen(); }
    return;
  }
  popenConfirm = { msg: "'" + idx.length + "'건의 WG프로젝트를 등록하시겠습니까?", ok: function () {
    const dup = idx.some(function (i) { return Object.keys(POPEN_APPS).some(function (k) { return POPEN_APPS[k].no === popenUploaded[i].no; }); });
    if (dup) { popenConfirm = { msg: '중복된 프로젝트가 있습니다.<br>확인후 다시 등록 바랍니다.' }; return; }
    idx.forEach(function (i) {
      const r = popenUploaded[i], id = 'WG-N' + Date.now() + i;
      POPEN_APPS[id] = { type:'W/G', no:r.no, name:r.name, svc:true, cnrcType:'TC', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'', rodrOrg:'', saleOrg:'Cloud사업부',
        ldr:'', pm:r.pm + '(' + r.pmNo + ')', acct:r.acct ? r.acct + '(15025)' : '', acctLdr:'', start:r.start, end:r.end, regDate:'2026-11-04', erpReg:false,
        versions:[ { ver:1, date:'2026-11-04', status:'저장', cost:popenCost(12, 120000000, 6, 54000000, 0, 12000000, 0, 0) } ], memo:'' };
      POPEN_APPS[id].versions[0].lines = popenLines(true, POPEN_APPS[id].pm);
    });
    popenUploaded = popenUploaded.filter(function (r, i) { return idx.indexOf(i) < 0; });
    popenChecked = {};
    const left = popenUploaded.length;   // 등록 안 된 행(오류 행)은 고쳐서 다시 올리거나 선택삭제할 때까지 남김
    popenToast(left ? '저장했습니다. 오류 ' + left + '행은 등록되지 않았습니다 — 엑셀을 고쳐 다시 올리거나 [선택삭제]하세요.' : '저장했습니다.');
  } };
  renderProjectOpen();
}
function popenDelChecked() {
  const keys = Object.keys(popenChecked).filter(function (k) { return popenChecked[k]; });
  if (!keys.length) { popenConfirm = { msg: '삭제할 W/G을 선택하세요.' }; renderProjectOpen(); return; }
  if (keys.some(function (k) { return k.charAt(0) !== 'U'; })) { popenConfirm = { msg: '새로 엑셀 업로드된 프로젝트만 선택삭제 가능합니다.' }; renderProjectOpen(); return; }
  popenUploaded = popenUploaded.filter(function (r, i) { return !popenChecked['U' + i]; });
  popenChecked = {};
  renderProjectOpen();
}

function popenOpenDetail(id) {
  const desc = { kind: 'popenDetail', id: id };
  if (typeof window.tabOpenProjectHint === 'function') window.tabOpenProjectHint(desc);
  if (typeof setScreen === 'function') setScreen('s-project-open');
  popenSelectedId = id;
  const a = POPEN_APPS[id];
  popenVer = popenLatest(a).ver;
  popenStartDraft();
  // 현행: 저장 상태면 정보관리, 그 밖이면 워크플로 진행 단계(비용승인) 화면
  popenView = popenStatus(a) === '저장' ? 'detail' : 'appr';
  renderProjectOpen();
  try { if (typeof window.tabTagProject === 'function') window.tabTagProject(a.no, a.name || '', desc); } catch (e) {}
}
function popenStartDraft() {
  const a = POPEN_APPS[popenSelectedId];
  popenDraft = { name:a.name, mainOrg:a.mainOrg, rodrOrg:a.rodrOrg, saleOrg:a.saleOrg, ldr:a.ldr, pm:a.pm, start:a.start, end:a.end, cost:Object.assign({}, popenLatest(a).cost) };
  popenMemo = '';
}
// 재신청: 현행처럼 정보관리에서 비용변경(새 비용 버전)을 만든 뒤 다시 결재선생성 → 승인요청
function popenReapply(id) { popenOpenDetail(id); popenView = 'detail'; popenModifyCost(); }
function popenPickVer(v) { popenVer = v; renderProjectOpen(); }
function popenSetCost(k, v) { popenDraft.cost[k] = v; }
function popenGoDetail() { popenView = 'detail'; renderProjectOpen(); }
function popenBackToList() { popenView = 'list'; renderProjectOpen(); }

function popenValidate() {
  const c = popenDraft.cost;
  if (['lbr', 'ots', 'mat', 'exp'].some(function (k) { return !/^[0-9]*$/.test(String(c[k] || 0)); })) { popenToast('정수만 입력 가능합니다.'); return false; }
  if (!String(popenDraft.name || '').trim()) { popenToast('프로젝트명은 필수입니다.'); return false; }
  if (!popenDraft.saleOrg) { popenToast('매출귀속부서는 필수입니다.'); return false; }
  if (!popenDraft.pm) { popenToast('수행PM은 필수입니다.'); return false; }
  ['lbrMM', 'lbr', 'otsMM', 'ots', 'mat', 'exp', 'sale', 'saleCst'].forEach(function (k) { c[k] = Number(c[k]) || 0; });
  if (c.saleCst > popenBgt(c)) { popenToast('매출원가가 비용합계를 초과할 수 없습니다.'); return false; }
  if (Math.abs(popenMargin(c)) > 999.99) { popenToast('매출마진이 입력 허용범위(-999.99 ~ 999.99)를 초과합니다.'); return false; }
  return true;
}
function popenApplyDraft() {
  const a = POPEN_APPS[popenSelectedId];
  ['name', 'mainOrg', 'rodrOrg', 'saleOrg', 'ldr', 'pm', 'start', 'end'].forEach(function (k) { a[k] = popenDraft[k]; });
  popenLatest(a).cost = Object.assign({}, popenDraft.cost);
}
function popenSave() {
  if (!popenValidate()) return;
  popenApplyDraft(); popenStartDraft();
  popenToast('저장했습니다.'); renderProjectOpen();
}
function popenDelete() {
  // 현행: 최신 비용 버전만 지움. 버전이 1개면 지워지는 것 없음
  const a = POPEN_APPS[popenSelectedId];
  if (a.versions.length > 1) a.versions.shift();
  popenVer = popenLatest(a).ver; popenStartDraft();
  popenToast('삭제 되었습니다.'); renderProjectOpen();
}
function popenModifyCost() {
  // 현행: 새 비용 버전(저장 상태, 금액 0)을 만들고 다시 조회
  const a = POPEN_APPS[popenSelectedId];
  const nv = { ver: popenLatest(a).ver + 1, date: '2026-11-04', status: '저장', cost: popenZero() };
  nv.lines = popenLines(a.svc, a.pm);
  a.versions.unshift(nv);
  popenVer = nv.ver; popenStartDraft(); renderProjectOpen();
}
function popenGoAppr() {
  const a = POPEN_APPS[popenSelectedId];
  const ver = popenLatest(a);
  if (ver.status === '저장' && popenVer === ver.ver) {
    if (!popenValidate()) return;
    popenApplyDraft();
    ver.lines = popenLines(a.svc, a.pm);   // 저장 상태면 결재선을 지우고 다시 만듦
  }
  popenView = 'appr'; renderProjectOpen();
}
function popenRequest() {
  if (!String(popenMemo).trim()) { popenToast('비용총액 신규등록 및 변경 사유를 메모에 입력바랍니다. (해당 고객사 및 서비스 명시 필수)'); return; }
  const a = POPEN_APPS[popenSelectedId], ver = popenLatest(a);
  ver.status = '승인요청'; a.erpReg = true;
  ver.lines[0].status = '기안'; ver.lines[0].date = '2026-11-04 10:00'; ver.lines[0].comment = popenMemo;
  popenToast('승인요청했습니다.'); renderProjectOpen();
}
function popenCancelDraft() {
  popenConfirm = { msg: '기안을 취소하시겠습니까?', ok: function () {
    const a = POPEN_APPS[popenSelectedId], ver = popenLatest(a);
    ver.status = '기안취소';
    ver.lines.forEach(function (l, i) { if (i === 0) { l.status = '기안취소'; l.date = '2026-11-04 11:00'; } else { l.status = '대기'; l.date = ''; } });
    popenToast('기안을 취소했습니다.');
  } };
  renderProjectOpen();
}

function popenNewOpen() {
  popenNewForm = { type:'W/G', incoType:'IV58', svc:'Y', no:'', name:'', pm:'', saleOrg:'', start:'', end:'', rodrOrg:'', acct:'', acctLdr:'', lbrMM:'', lbr:'', otsMM:'', ots:'', mat:'', exp:'', bgt:'' };
  popenView = 'new'; renderProjectOpen();
}
function popenNewSubmit() {
  const f = popenNewForm, need = [['svc', '서비스기획여부'], ['no', '프로젝트번호'], ['name', '프로젝트명'], ['pm', '수행PM'], ['saleOrg', '매출귀속부서'], ['start', 'PJT 시작일'], ['end', 'PJT 종료일'], ['bgt', '예산금액']];
  for (let i = 0; i < need.length; i++) if (!String(f[need[i][0]] || '').trim()) { popenToast(need[i][1] + '을 입력해 주세요.'); return; }
  if (!/^[0-9]{8}-D[0-9]{3}$/.test(f.no)) { popenToast('프로젝트번호 형식을 확인해 주세요.'); return; }
  if (f.end < f.start) { popenToast('PJT 시작일/종료일을 확인해 주세요'); return; }
  const nums = [['lbrMM', '인건비 투입MM'], ['lbr', '인건비'], ['otsMM', '외주비 투입MM'], ['ots', '외주비'], ['mat', '재료비'], ['exp', '경비'], ['bgt', '예산금액']];
  for (let i = 0; i < nums.length; i++) if (f[nums[i][0]] !== '' && !isFinite(f[nums[i][0]])) { popenToast(nums[i][1] + '에 수량을 입력해 주세요.'); return; }
  if (Object.keys(POPEN_APPS).some(function (k) { return POPEN_APPS[k].no === f.no; })) { popenConfirm = { msg: '중복된 프로젝트가 있습니다.<br>확인후 다시 등록 바랍니다.' }; renderProjectOpen(); return; }
  const id = 'WG-N' + Date.now();
  POPEN_APPS[id] = { type:f.type, incoType:f.type === '사내' ? f.incoType : undefined, no:f.no, name:f.name, svc:f.svc === 'Y', cnrcType:f.type === '사내' ? 'IV' : 'TC', cnrcCmpl:true, cstco:'공통(9999999999)', mainOrg:'', rodrOrg:f.rodrOrg, saleOrg:f.saleOrg,
    ldr:'', pm:f.pm, acct:f.acct, acctLdr:f.acctLdr, start:f.start, end:f.end, regDate:'2026-11-04', erpReg:false,
    versions:[ { ver:1, date:'2026-11-04', status:'저장', cost:popenCost(+f.lbrMM || 0, +f.lbr || 0, +f.otsMM || 0, +f.ots || 0, +f.mat || 0, +f.exp || 0, 0, 0) } ], memo:'' };
  POPEN_APPS[id].versions[0].lines = popenLines(f.svc === 'Y', f.pm);
  popenToast('저장했습니다.');
  popenOpenDetail(id);
}

// 진입점
function showProjectOpen() {
  if (typeof setNav === 'function') setNav('nav-project-open');
  if (typeof setScreen === 'function') setScreen('s-project-open');
  popenView = 'list';
  renderProjectOpen();
}

if (typeof SCREEN_ROUTES !== 'undefined') SCREEN_ROUTES['s-project-open'] = 'project-open';
if (typeof ROUTE_ACTIONS !== 'undefined') ROUTE_ACTIONS['project-open'] = function () { showProjectOpen(); };
