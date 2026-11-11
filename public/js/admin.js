// ════════════════════════════════════════
//  관리자(Admin) — 독립 사이트 + 메인앱 진입 버튼        작성: 수진
// ════════════════════════════════════════
//
// 두 가지 맥락에서 로드됩니다.
//  ① 메인 앱(index.html): 우측 상단 '⚙ Admin' 버튼만 주입 → 누르면 /admin.html 로 이동.
//  ② 관리자 사이트(admin.html): 자체 상단바 + 좌측 메뉴 + 콘텐츠로 된 독립 화면을 렌더.
// 관리자는 예산 앱의 레일/탭과 분리된 '다른 사이트'입니다.
//
// [2026.10.19] 전면 보강 — 실제 앱 수준 CRUD 엔진(추가/수정/삭제 모달 + 검색 + localStorage 영속화)
//              + 11개 섹션 전부 구현(TBD 제거), 섹션별 상세 관리 포인트/데이터.
//              버튼은 인라인 onclick + CRUD 동사(등록/수정/삭제/저장/조회)로 달아 지니 CRUD 감지에 맞춥니다.

// ── 관리 영역 정의 (TBD 없음) ──
var ADMIN_SECTIONS = [
  { key: 'user',   icon: '👤', title: '사용자 관리', desc: '사용자 계정·역할·소속·연락처·활성 상태를 관리합니다.' },
  { key: 'perm',   icon: '🔑', title: '권한 관리',   desc: '역할별 메뉴 접근·CRUD 권한(C·R·U·D·승인)을 설정합니다.' },
  { key: 'org',    icon: '🏢', title: '조직도 관리', desc: '본부·사업부·팀 조직 구조와 조직장·인원을 관리합니다.' },
  { key: 'menu',   icon: '🗂', title: '메뉴 관리',   desc: '메뉴 노출/순서/경로/노출 역할을 관리합니다.' },
  { key: 'price',  icon: '💲', title: 'P단가 관리',  desc: 'P레벨(P0~P10)별 표준 인건비 단가(P단가)와 적용일을 관리합니다.' },
  { key: 'fx',     icon: '💱', title: '환율 관리',   desc: '통화별 매매기준율·적용일·출처를 관리합니다.' },
  { key: 'code',   icon: '🔖', title: '코드 관리',   desc: '공통 코드 그룹·코드값·정렬·사용여부를 관리합니다.' },
  { key: 'notify', icon: '🔔', title: '알림 설정',   desc: '이벤트별 알림 채널·수신 대상·사용여부를 설정합니다.' },
  { key: 'log',    icon: '📜', title: '로그·이력',   desc: '사용자 활동·시스템 변경 이력을 조회·다운로드합니다.' },
  { key: 'integ',  icon: '🔌', title: '외부 연동',   desc: 'ERP·CRM·SCM·구매·Finance 연계 설정과 연결 상태를 관리합니다.' },
  { key: 'batch',  icon: '⏱', title: '배치/스케줄', desc: '정기 배치·스케줄 작업의 주기·상태를 관리하고 즉시 실행합니다.' },
];

var ADM_ROLES = ['시스템관리자', '운영자', '개발자', 'BA', 'PM', '팀장', '담당자', '뷰어'];
var ADM_PERM_MENUS = ['프로젝트', '수행원가', '인사이트', '관리자'];
var ADM_PERM_CRUD = [['C', '등록'], ['R', '조회'], ['U', '수정'], ['D', '삭제'], ['A', '승인']];

// ── 기본 데이터(시드) — 저장된 값이 있으면 그걸 우선 사용 ──
var ADM_DEFAULTS = {
  user: [
    { name: '이봄',   emp: '21043', role: 'PM',          dept: 'AX ERP사업부 1팀', email: 'bom.lee@sk.com',   phone: '010-2143-0043', lastLogin: '2026-10-19 09:12', status: '활성' },
    { name: '한민석', emp: '21055', role: 'PM',          dept: '데이터사업부',      email: 'ms.han@sk.com',    phone: '010-2155-0055', lastLogin: '2026-10-18 17:40', status: '활성' },
    { name: '신성호', emp: '13016', role: '팀장',        dept: 'AX ERP사업부 1팀', email: 'sh.shin@sk.com',   phone: '010-1316-0016', lastLogin: '2026-10-19 08:31', status: '활성' },
    { name: '장재호', emp: '15025', role: '담당자',      dept: 'AX ERP사업부 2팀', email: 'jh.jang@sk.com',   phone: '010-1525-0025', lastLogin: '2026-10-17 11:05', status: '활성' },
    { name: '오재민', emp: '13083', role: '팀장',        dept: 'AX ERP사업부',     email: 'jm.oh@sk.com',     phone: '010-1383-0083', lastLogin: '2026-10-19 09:02', status: '활성' },
    { name: '권재준', emp: '60521', role: '시스템관리자', dept: '(전사)IT운영팀',   email: 'jj.kwon@sk.com',   phone: '010-6052-0521', lastLogin: '2026-10-19 09:12', status: '활성' },
    { name: '정우성', emp: '13071', role: '뷰어',        dept: '(전사)IT운영팀',   email: 'ws.jung@sk.com',   phone: '010-1307-0071', lastLogin: '2026-09-30 14:22', status: '비활성' },
  ],
  perm: {
    '시스템관리자': { '프로젝트': 'CRUDA', '수행원가': 'CRUDA', '인사이트': 'R', '관리자': 'CRUDA' },
    '운영자':       { '프로젝트': 'R',     '수행원가': 'CRU',   '인사이트': 'R', '관리자': 'R' },
    '개발자':       { '프로젝트': 'R',     '수행원가': 'R',     '인사이트': 'R', '관리자': 'CRUDA' },
    'BA':          { '프로젝트': 'CRU',   '수행원가': 'R',     '인사이트': 'R', '관리자': '' },
    'PM':          { '프로젝트': 'CRU',   '수행원가': 'CRUDA', '인사이트': 'R', '관리자': '' },
    '팀장':         { '프로젝트': 'R',     '수행원가': 'RA',    '인사이트': 'R', '관리자': '' },
    '담당자':       { '프로젝트': 'CR',    '수행원가': 'CRU',   '인사이트': 'R', '관리자': '' },
    '뷰어':         { '프로젝트': 'R',     '수행원가': 'R',     '인사이트': 'R', '관리자': '' },
  },
  org: [
    { name: 'AX 사업본부',       lv: 0, head: '김본부(임원)', code: 'AX00', count: 142 },
    { name: 'AX ERP사업부',      lv: 1, head: '오재민',       code: 'AX10', count: 58 },
    { name: 'AX ERP사업부 1팀',  lv: 2, head: '신성호',       code: 'AX11', count: 21 },
    { name: 'AX ERP사업부 2팀',  lv: 2, head: '장재호',       code: 'AX12', count: 18 },
    { name: '데이터사업부',       lv: 1, head: '한민석',       code: 'AX20', count: 47 },
    { name: '데이터플랫폼팀',     lv: 2, head: '이수연',       code: 'AX21', count: 24 },
    { name: '(전사)IT운영팀',     lv: 1, head: '김도현',       code: 'IT00', count: 15 },
  ],
  menu: [
    { order: 1,  name: '프로젝트 현황',      path: '#/project-status', roles: '전체',          vis: '노출' },
    { order: 2,  name: '프로젝트 개설 관리', path: '#/project-open',   roles: 'PM·담당자',      vis: '노출' },
    { order: 3,  name: '수행원가',          path: '#/budget-status',  roles: 'PM·팀장·담당자', vis: '노출' },
    { order: 4,  name: 'AI 레포트',         path: '#/ai-report',      roles: '전체',          vis: '노출' },
    { order: 5,  name: '맞춤 레포트',        path: '#/custom-report',  roles: '전체',          vis: '노출' },
    { order: 99, name: '관리자',            path: '/admin.html',      roles: '시스템관리자',   vis: '노출' },
  ],
  price: [
    { grade: 'P10', pos: '수석 컨설턴트', unit: 13500000, apply: '2026-01-01', note: '전사 수석/아키텍트' },
    { grade: 'P9',  pos: '책임 컨설턴트', unit: 12000000, apply: '2026-01-01', note: '프로젝트 총괄' },
    { grade: 'P8',  pos: '수석',          unit: 10800000, apply: '2026-01-01', note: '핵심 설계/리딩' },
    { grade: 'P7',  pos: '책임',          unit: 9600000,  apply: '2026-01-01', note: '설계/리딩' },
    { grade: 'P6',  pos: '선임',          unit: 8500000,  apply: '2026-01-01', note: '주요 개발/분석' },
    { grade: 'P5',  pos: '선임',          unit: 7500000,  apply: '2026-01-01', note: '개발/분석' },
    { grade: 'P4',  pos: '전임',          unit: 6600000,  apply: '2026-01-01', note: '개발 실무' },
    { grade: 'P3',  pos: '전임',          unit: 5800000,  apply: '2026-01-01', note: '개발 실무' },
    { grade: 'P2',  pos: '초급',          unit: 5100000,  apply: '2026-01-01', note: '개발 보조' },
    { grade: 'P1',  pos: '초급',          unit: 4500000,  apply: '2026-01-01', note: '지원/보조' },
    { grade: 'P0',  pos: '신입',          unit: 4000000,  apply: '2026-01-01', note: '신입/보조' },
  ],
  fx: [
    { cur: 'USD', name: '미국 달러',     rate: 1385.20, apply: '2026-10-14', source: '하나은행 매매기준율' },
    { cur: 'EUR', name: '유로',          rate: 1498.60, apply: '2026-10-14', source: '하나은행 매매기준율' },
    { cur: 'JPY', name: '일본 엔(100)',  rate: 925.40,  apply: '2026-10-14', source: '하나은행 매매기준율' },
    { cur: 'CNY', name: '중국 위안',      rate: 194.30,  apply: '2026-10-14', source: '하나은행 매매기준율' },
  ],
  code: [
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'SI',    name: '수주형(SI)', sort: 1, use: '사용' },
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'PROP',  name: '제안',       sort: 2, use: '사용' },
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'INV',   name: '투자',       sort: 3, use: '사용' },
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'ADV',   name: '선투입',     sort: 4, use: '사용' },
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'WG',    name: 'W/G',        sort: 5, use: '사용' },
    { group: 'PROJ_TYPE',   groupName: '프로젝트 유형', code: 'INT',   name: '사내',       sort: 6, use: '사용' },
    { group: 'BUDGET_ACCT', groupName: '예산 계정',     code: 'LABOR', name: '인건비',     sort: 1, use: '사용' },
    { group: 'BUDGET_ACCT', groupName: '예산 계정',     code: 'OUT',   name: '외주비',     sort: 2, use: '사용' },
    { group: 'BUDGET_ACCT', groupName: '예산 계정',     code: 'MAT',   name: '재료비',     sort: 3, use: '사용' },
    { group: 'BUDGET_ACCT', groupName: '예산 계정',     code: 'EXP',   name: '경비',       sort: 4, use: '사용' },
    { group: 'BUDGET_ACCT', groupName: '예산 계정',     code: 'AS',    name: 'A/S Cost',   sort: 5, use: '사용' },
    { group: 'PROJ_STATUS', groupName: '프로젝트 상태', code: 'START', name: '착수완료',   sort: 1, use: '사용' },
    { group: 'PROJ_STATUS', groupName: '프로젝트 상태', code: 'RUN',   name: '수행중',     sort: 2, use: '사용' },
    { group: 'PROJ_STATUS', groupName: '프로젝트 상태', code: 'CLOSE', name: '종료',       sort: 3, use: '사용' },
  ],
  notify: [
    { type: '예산 승인요청 도착',   event: '실행예산 상신',       channel: '시스템·이메일', target: '팀장·PM',     use: '사용' },
    { type: '예산 승인완료',        event: '결재 완료',           channel: '시스템',        target: 'PM·담당자',   use: '사용' },
    { type: '프로젝트 종료 임박',   event: '종료 30일 전 배치',   channel: '이메일',        target: 'PM',          use: '사용' },
    { type: 'ERP 전송 실패',        event: 'ERP 연계 오류',       channel: '시스템·SMS',    target: '운영자',      use: '사용' },
    { type: '월마감 인건비 반영',   event: '월마감 배치 완료',    channel: '시스템',        target: 'PM·담당자',   use: '미사용' },
  ],
  log: [
    { ts: '2026-10-19 09:12:41', user: '권재준', action: '로그인',         target: '-',        result: '성공', ip: '10.20.1.33' },
    { ts: '2026-10-19 09:15:03', user: '이봄',   action: '실행예산 상신',   target: 'IV107813', result: '성공', ip: '10.20.4.11' },
    { ts: '2026-10-19 09:02:55', user: '오재민', action: '예산 승인',       target: 'IV107813', result: '성공', ip: '10.20.3.08' },
    { ts: '2026-10-19 08:31:20', user: '신성호', action: '사용자 수정',     target: '정우성',   result: '성공', ip: '10.20.4.02' },
    { ts: '2026-10-19 08:00:12', user: 'SYSTEM', action: 'ERP 예산 전송',   target: '배치',     result: '성공', ip: '-' },
    { ts: '2026-10-19 01:00:09', user: 'SYSTEM', action: '실적 집계(STAC)', target: '배치',     result: '실패', ip: '-' },
    { ts: '2026-10-18 21:00:03', user: 'SYSTEM', action: 'Finance 연계',    target: '배치',     result: '실패', ip: '-' },
    { ts: '2026-10-18 17:40:33', user: '한민석', action: '권한 수정',       target: 'PM 역할',  result: '성공', ip: '10.20.2.19' },
    { ts: '2026-10-18 15:22:47', user: '권재준', action: '환율 수정',       target: 'USD',      result: '성공', ip: '10.20.1.33' },
    { ts: '2026-10-18 10:05:11', user: '장재호', action: '재료비 검수',     target: 'IV107812', result: '성공', ip: '10.20.4.21' },
    { ts: '2026-10-17 18:44:02', user: '권재준', action: 'P단가 수정',      target: '등급 A',   result: '성공', ip: '10.20.1.33' },
    { ts: '2026-10-17 09:18:39', user: '정우성', action: '로그인 실패',     target: '-',        result: '실패', ip: '10.20.5.77' },
  ],
  integ: [
    { system: 'ERP',           type: '전표/실적 연계',   endpoint: 'https://erp.internal/api/v2',   auth: 'OAuth2',  status: '연결', lastSync: '2026-10-19 08:00' },
    { system: 'CRM',           type: '계약리뷰 Cost',    endpoint: 'https://crm.internal/api',      auth: 'API Key', status: '연결', lastSync: '2026-10-19 06:30' },
    { system: 'SCM',           type: '티밍 인력 리스트', endpoint: 'https://scm.internal/teaming',  auth: 'OAuth2',  status: '연결', lastSync: '2026-10-18 23:10' },
    { system: '구매시스템(POP)', type: 'PO/검수/실투입',  endpoint: 'https://pop.internal/po',       auth: 'mTLS',    status: '연결', lastSync: '2026-10-19 07:45' },
    { system: 'Finance',       type: '경비 전표 승인',   endpoint: 'https://fin.internal/voucher',  auth: 'API Key', status: '오류', lastSync: '2026-10-18 21:00' },
  ],
  batch: [
    { name: '프로젝트 자동 종료',      schedule: '매일 02:00',    lastRun: '2026-10-19 02:00', nextRun: '2026-10-20 02:00', status: '정상', use: '사용', hist: [
      { ts: '2026-10-19 02:00', result: '정상', dur: '4.2s', detail: '종료 3건' },
      { ts: '2026-10-18 02:00', result: '정상', dur: '3.8s', detail: '종료 1건' },
      { ts: '2026-10-17 02:00', result: '정상', dur: '4.0s', detail: '종료 0건' },
    ] },
    { name: '월마감 인건비 실적 생성', schedule: '매월 1일 03:00', lastRun: '2026-10-01 03:00', nextRun: '2026-11-01 03:00', status: '정상', use: '사용', hist: [
      { ts: '2026-10-01 03:00', result: '정상', dur: '58.1s', detail: '실적 1,204건 생성' },
      { ts: '2026-09-01 03:00', result: '정상', dur: '55.7s', detail: '실적 1,176건 생성' },
    ] },
    { name: 'ERP 예산 전송',          schedule: '매일 08:00',    lastRun: '2026-10-19 08:00', nextRun: '2026-10-20 08:00', status: '정상', use: '사용', hist: [
      { ts: '2026-10-19 08:00', result: '정상', dur: '12.4s', detail: '전송 18건' },
      { ts: '2026-10-18 08:00', result: '정상', dur: '11.9s', detail: '전송 16건' },
    ] },
    { name: '환율 동기화',            schedule: '매일 09:00',    lastRun: '2026-10-19 09:00', nextRun: '2026-10-20 09:00', status: '정상', use: '사용', hist: [
      { ts: '2026-10-19 09:00', result: '정상', dur: '1.1s', detail: '4개 통화 갱신' },
      { ts: '2026-10-18 09:00', result: '정상', dur: '1.0s', detail: '4개 통화 갱신' },
    ] },
    { name: '실적 집계(STAC)',        schedule: '매일 01:00',    lastRun: '2026-10-19 01:00', nextRun: '2026-10-20 01:00', status: '실패', use: '사용', hist: [
      { ts: '2026-10-19 01:00', result: '실패', dur: '2.3s', detail: 'ERP 응답 지연(timeout)' },
      { ts: '2026-10-18 01:00', result: '정상', dur: '33.5s', detail: '집계 완료' },
      { ts: '2026-10-17 01:00', result: '정상', dur: '31.8s', detail: '집계 완료' },
    ] },
  ],
};

// ── 영속화(localStorage) ──
var ADM_KEY = 'budgetai.admin.v1';
var ADM = {};
function admLoad() {
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(ADM_KEY) || '{}') || {}; } catch (e) { saved = {}; }
  Object.keys(ADM_DEFAULTS).forEach(function (k) {
    ADM[k] = (saved[k] != null) ? saved[k] : JSON.parse(JSON.stringify(ADM_DEFAULTS[k]));
  });
}
function admPersist() { try { localStorage.setItem(ADM_KEY, JSON.stringify(ADM)); } catch (e) {} }
function admResetAll() {
  try { localStorage.removeItem(ADM_KEY); } catch (e) {}
  admLoad(); asiteRender(); admToast('초기 데이터로 되돌렸습니다.');
}

// ── 유틸 ──
function admFmt(n) { return (Number(n) || 0).toLocaleString('ko-KR'); }
function admEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function admResolve(o) { return typeof o === 'function' ? o() : (o || []); }
function admDeptOpts() { return (ADM.org || []).filter(function (o) { return o.lv >= 1; }).map(function (o) { return o.name; }); }
function admToast(m) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m; t.classList.add('show');
  clearTimeout(admToast._t); admToast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
}
var ADM_PILL_MAP = {
  '활성': 'green', '노출': 'green', '사용': 'green', '연결': 'green', '정상': 'green', '성공': 'green',
  '비활성': 'gray', '숨김': 'gray', '미사용': 'gray', '중단': 'gray', '대기': 'gray',
  '오류': 'red', '실패': 'red',
};
function admPill(v) { return '<span class="adm-pill ' + (ADM_PILL_MAP[v] || 'blue') + '">' + admEsc(v) + '</span>'; }

// ── 테이블 섹션 스키마 (cols / fields / toggle / 부가 버튼) ──
// col: { k, label, align, pill, tag, code, money, muted, fmt }
// field: { k, label, type:text|number|date|select|textarea, opts, req, full, ro, def }
var ADM_SCHEMA = {
  user: {
    noun: '사용자', addLabel: '＋ 사용자 등록', search: true,
    cols: [
      { k: 'name', label: '이름' }, { k: 'emp', label: '사번', code: true },
      { k: 'role', label: '역할', tag: true }, { k: 'dept', label: '소속' },
      { k: 'email', label: '이메일', muted: true }, { k: 'lastLogin', label: '최근 접속', muted: true },
    ],
    toggle: { k: 'status', states: ['활성', '비활성'] },
    fields: [
      { k: 'name', label: '이름', type: 'text', req: true }, { k: 'emp', label: '사번', type: 'text', req: true },
      { k: 'role', label: '역할', type: 'select', opts: function () { return ADM_ROLES; } },
      { k: 'dept', label: '소속', type: 'select', opts: admDeptOpts },
      { k: 'email', label: '이메일', type: 'text' }, { k: 'phone', label: '연락처', type: 'text' },
      { k: 'status', label: '상태', type: 'select', opts: ['활성', '비활성'], def: '활성' },
      { k: 'lastLogin', label: '최근 접속', type: 'text', ro: true, full: true },
    ],
    note: '※ 역할은 권한 관리의 역할 체계와 연동됩니다. 비활성 사용자는 로그인이 차단됩니다.',
  },
  menu: {
    noun: '메뉴', addLabel: '＋ 메뉴 등록', ordered: true,
    cols: [
      { k: 'name', label: '메뉴명' }, { k: 'path', label: '경로', code: true },
      { k: 'roles', label: '노출 역할', tag: true },
    ],
    toggle: { k: 'vis', states: ['노출', '숨김'] },
    fields: [
      { k: 'order', label: '순서', type: 'number', req: true }, { k: 'name', label: '메뉴명', type: 'text', req: true },
      { k: 'path', label: '경로', type: 'text', req: true, full: true },
      { k: 'roles', label: '노출 역할', type: 'text' }, { k: 'vis', label: '노출', type: 'select', opts: ['노출', '숨김'], def: '노출' },
    ],
    note: '※ 순서 ▲▼로 메뉴 노출 순서를 바꿉니다. 노출 역할이 없는 사용자는 해당 메뉴가 숨겨집니다.',
  },
  price: {
    noun: 'P단가', addLabel: '＋ P레벨 등록', search: true,
    cols: [
      { k: 'grade', label: 'P레벨', tag: true }, { k: 'pos', label: '역할' },
      { k: 'unit', label: '월 표준단가(P단가)', align: 'num', money: true, suffix: ' 원' },
      { k: 'apply', label: '적용일' }, { k: 'note', label: '설명', muted: true },
    ],
    fields: [
      { k: 'grade', label: 'P레벨', type: 'text', req: true }, { k: 'pos', label: '역할', type: 'text', req: true },
      { k: 'unit', label: '월 표준단가(원)', type: 'number', req: true }, { k: 'apply', label: '적용일', type: 'date', req: true },
      { k: 'note', label: '설명', type: 'text', full: true },
    ],
    note: '※ P단가 = 인건비 산정 기준 P레벨(P0~P10)별 월 표준단가. 적용일 이후 신규 편성에 반영됩니다.',
  },
  fx: {
    noun: '환율', addLabel: '＋ 통화 등록',
    cols: [
      { k: 'cur', label: '통화', code: true }, { k: 'name', label: '통화명' },
      { k: 'rate', label: '매매기준율(원)', align: 'num', fmt: function (v) { return (Number(v) || 0).toLocaleString('ko-KR', { minimumFractionDigits: 2 }); } },
      { k: 'apply', label: '적용일' }, { k: 'source', label: '출처', muted: true },
    ],
    fields: [
      { k: 'cur', label: '통화 코드', type: 'text', req: true }, { k: 'name', label: '통화명', type: 'text', req: true },
      { k: 'rate', label: '매매기준율(원)', type: 'number', req: true }, { k: 'apply', label: '적용일', type: 'date', req: true },
      { k: 'source', label: '출처', type: 'text', full: true },
    ],
    note: '※ 매매기준율은 외화 포함 계약·경비 환산에 사용됩니다.',
  },
  code: {
    noun: '공통코드', addLabel: '＋ 코드 등록', grouped: 'groupName', search: true,
    cols: [
      { k: 'code', label: '코드', code: true }, { k: 'name', label: '코드명' },
      { k: 'sort', label: '정렬', align: 'num' },
    ],
    toggle: { k: 'use', states: ['사용', '미사용'] },
    fields: [
      { k: 'groupName', label: '코드 그룹', type: 'text', req: true }, { k: 'group', label: '그룹 코드', type: 'text', req: true },
      { k: 'code', label: '코드', type: 'text', req: true }, { k: 'name', label: '코드명', type: 'text', req: true },
      { k: 'sort', label: '정렬', type: 'number', def: 1 }, { k: 'use', label: '사용여부', type: 'select', opts: ['사용', '미사용'], def: '사용' },
    ],
    note: '※ 공통코드는 화면의 드롭다운·분류 체계의 원천입니다. 같은 그룹 코드끼리 묶여 표시됩니다.',
  },
  notify: {
    noun: '알림', addLabel: '＋ 알림 등록',
    cols: [
      { k: 'type', label: '알림 유형' }, { k: 'event', label: '트리거 이벤트', muted: true },
      { k: 'channel', label: '채널', tag: true }, { k: 'target', label: '수신 대상', tag: true },
    ],
    toggle: { k: 'use', states: ['사용', '미사용'] },
    fields: [
      { k: 'type', label: '알림 유형', type: 'text', req: true }, { k: 'event', label: '트리거 이벤트', type: 'text', req: true, full: true },
      { k: 'channel', label: '채널', type: 'select', opts: ['시스템', '이메일', '시스템·이메일', '시스템·SMS', 'SMS'] },
      { k: 'target', label: '수신 대상', type: 'text' }, { k: 'use', label: '사용여부', type: 'select', opts: ['사용', '미사용'], def: '사용' },
    ],
    note: '※ 알림은 트리거 이벤트가 발생하면 선택한 채널로 수신 대상에게 발송됩니다.',
  },
  integ: {
    noun: '연동', addLabel: '＋ 연동 등록',
    cols: [
      { k: 'system', label: '시스템' }, { k: 'type', label: '연동 유형', muted: true },
      { k: 'endpoint', label: '엔드포인트', code: true }, { k: 'auth', label: '인증', tag: true },
      { k: 'status', label: '상태', pill: true }, { k: 'lastSync', label: '최근 동기화', muted: true },
    ],
    rowBtns: function (row, idx) { return '<button class="adm-btn sm ghost" onclick="admIntegTest(' + idx + ')">연결 테스트</button>'; },
    fields: [
      { k: 'system', label: '시스템', type: 'text', req: true }, { k: 'type', label: '연동 유형', type: 'text', req: true },
      { k: 'endpoint', label: '엔드포인트', type: 'text', req: true, full: true },
      { k: 'auth', label: '인증 방식', type: 'select', opts: ['OAuth2', 'API Key', 'mTLS', 'Basic'] },
      { k: 'status', label: '상태', type: 'select', opts: ['연결', '중단', '오류'], def: '연결' },
      { k: 'lastSync', label: '최근 동기화', type: 'text', ro: true },
    ],
    note: '※ 연계 시스템과의 실시간 데이터 연동 설정입니다. [연결 테스트]로 엔드포인트 응답을 확인합니다.',
  },
  batch: {
    noun: '배치', addLabel: '＋ 배치 등록',
    cols: [
      { k: 'name', label: '작업명' }, { k: 'schedule', label: '주기', tag: true },
      { k: 'lastRun', label: '최근 실행', muted: true }, { k: 'nextRun', label: '다음 실행', muted: true },
      { k: 'status', label: '상태', pill: true },
    ],
    toggle: { k: 'use', states: ['사용', '미사용'] },
    rowBtns: function (row, idx) { return '<button class="adm-btn sm ghost" onclick="admBatchRun(' + idx + ')">즉시 실행</button> <button class="adm-btn sm" onclick="admBatchHistory(' + idx + ')">이력</button>'; },
    fields: [
      { k: 'name', label: '작업명', type: 'text', req: true }, { k: 'schedule', label: '주기', type: 'text', req: true },
      { k: 'status', label: '상태', type: 'select', opts: ['정상', '실패', '대기'], def: '대기' },
      { k: 'use', label: '사용여부', type: 'select', opts: ['사용', '미사용'], def: '사용' },
      { k: 'lastRun', label: '최근 실행', type: 'text', ro: true }, { k: 'nextRun', label: '다음 실행', type: 'text', ro: true },
    ],
    note: '※ 정기 배치 작업. [즉시 실행]으로 스케줄과 무관하게 지금 실행할 수 있습니다. 예) 프로젝트 자동 종료·월마감 인건비·ERP 전송.',
  },
};

// ── 검색어 상태 ──
var admSearch = {};
function admSearchInput(key, val) {
  admSearch[key] = val;
  var box = document.getElementById('adm-tbody-' + key);
  if (box) box.innerHTML = admTbodyRows(key);
  var cnt = document.getElementById('adm-count-' + key);
  if (cnt) cnt.textContent = admFilteredRows(key).length + '건';
}
function admFilteredRows(key) {
  var rows = (ADM[key] || []).map(function (r, i) { return { r: r, i: i }; });
  var q = (admSearch[key] || '').trim().toLowerCase();
  if (!q) return rows;
  var sc = ADM_SCHEMA[key];
  return rows.filter(function (x) {
    return sc.cols.some(function (c) { return String(x.r[c.k] == null ? '' : x.r[c.k]).toLowerCase().indexOf(q) >= 0; });
  });
}

// ── 테이블 렌더 ──
function admCell(col, row) {
  var v = row[col.k];
  if (col.fmt) return col.fmt(v, row);
  if (col.money) return admFmt(v) + (col.suffix || '');
  if (col.pill) return admPill(v);
  if (col.code) return '<span class="adm-code">' + admEsc(v) + '</span>';
  if (col.tag) return v ? '<span class="adm-tag">' + admEsc(v) + '</span>' : '';
  if (col.muted) return '<span class="adm-muted">' + admEsc(v == null || v === '' ? '-' : v) + '</span>';
  return admEsc(v == null ? '' : v);
}
function admTbodyRows(key) {
  var sc = ADM_SCHEMA[key];
  var rows = admFilteredRows(key);
  if (!rows.length) return '<tr><td colspan="20" style="text-align:center;color:#94a3b8;padding:22px">표시할 데이터가 없습니다.</td></tr>';
  var lastGroup = null;
  return rows.map(function (x) {
    var row = x.r, i = x.i, out = '';
    if (sc.grouped && row[sc.grouped] !== lastGroup) {
      lastGroup = row[sc.grouped];
      out += '<tr class="adm-grp-head"><td colspan="20">' + admEsc(lastGroup) + ' <span class="adm-muted">(' + admEsc(row.group) + ')</span></td></tr>';
    }
    var cells = '';
    if (sc.ordered) {
      cells += '<td class="num"><span class="adm-ord"><button onclick="admMove(\'' + key + '\',' + i + ',-1)" title="위로">▲</button>'
        + '<button onclick="admMove(\'' + key + '\',' + i + ',1)" title="아래로">▼</button></span>' + admEsc(row.order) + '</td>';
    }
    cells += sc.cols.map(function (c) {
      return '<td class="' + (c.align === 'num' ? 'num' : '') + '">' + admCell(c, row) + '</td>';
    }).join('');
    if (sc.toggle) {
      cells += '<td>' + '<button class="adm-pill ' + (ADM_PILL_MAP[row[sc.toggle.k]] || 'blue') + '" style="cursor:pointer" '
        + 'onclick="admCycle(\'' + key + '\',' + i + ')" title="상태 변경">' + admEsc(row[sc.toggle.k]) + '</button></td>';
    }
    cells += '<td style="white-space:nowrap">'
      + (sc.rowBtns ? sc.rowBtns(row, i) + ' ' : '')
      + '<button class="adm-btn sm" onclick="admOpenForm(\'' + key + '\',' + i + ')">수정</button> '
      + '<button class="adm-btn sm del" onclick="admAskDelete(\'' + key + '\',' + i + ')">삭제</button></td>';
    return '<tr>' + cells + '</tr>';
  }).join('');
}
function admTable(key) {
  var sc = ADM_SCHEMA[key];
  var heads = '';
  if (sc.ordered) heads += '<th class="num">순서</th>';
  heads += sc.cols.map(function (c) { return '<th class="' + (c.align === 'num' ? 'num' : '') + '">' + c.label + '</th>'; }).join('');
  if (sc.toggle) heads += '<th>상태</th>';
  heads += '<th></th>';
  var toolbar = '<div class="adm-toolbar">'
    + '<button class="adm-btn pri" onclick="admOpenForm(\'' + key + '\',null)">' + (sc.addLabel || '＋ 등록') + '</button>'
    + (sc.search ? '<input class="adm-search" placeholder="검색…" value="' + admEsc(admSearch[key] || '') + '" oninput="admSearchInput(\'' + key + '\',this.value)">' : '')
    + '<button class="adm-btn" onclick="admSave(\'' + (sc.noun || '') + '\')">저장</button>'
    + '<span class="adm-count" id="adm-count-' + key + '">' + admFilteredRows(key).length + '건</span>'
    + '</div>';
  return toolbar
    + '<table class="adm-table"><thead><tr>' + heads + '</tr></thead>'
    + '<tbody id="adm-tbody-' + key + '">' + admTbodyRows(key) + '</tbody></table>'
    + (sc.note ? '<div class="adm-note">' + sc.note + '</div>' : '');
}

// ── CRUD 공통 동작 ──
function admCycle(key, idx) {
  var sc = ADM_SCHEMA[key]; var row = ADM[key][idx]; if (!sc.toggle || !row) return;
  var st = sc.toggle.states; var cur = st.indexOf(row[sc.toggle.k]);
  row[sc.toggle.k] = st[(cur + 1) % st.length];
  admPersist(); asiteRender();
}
function admMove(key, idx, dir) {
  var arr = ADM[key]; var j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  var t = arr[idx]; arr[idx] = arr[j]; arr[j] = t;
  if (ADM_SCHEMA[key].ordered) arr.forEach(function (r, n) { r.order = (r.order === 99 && n !== arr.length - 1) ? r.order : (n + 1); });
  admPersist(); asiteRender();
}
function admSave(noun) { admPersist(); admToast((noun || '설정') + ' 저장됨'); }

function admOpenForm(key, idx) {
  var sc = ADM_SCHEMA[key]; if (!sc || !sc.fields) return;
  idx = (idx === 'null' || idx == null) ? null : Number(idx);
  var row = idx != null ? ADM[key][idx] : {};
  var body = sc.fields.map(function (f) {
    var val = row[f.k] != null ? row[f.k] : (f.def != null ? f.def : '');
    var inp;
    if (f.type === 'select') {
      inp = '<select id="adm-f-' + f.k + '"' + (f.ro ? ' disabled' : '') + '>'
        + admResolve(f.opts).map(function (o) { return '<option' + (String(o) === String(val) ? ' selected' : '') + '>' + admEsc(o) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      inp = '<textarea id="adm-f-' + f.k + '" rows="3">' + admEsc(val) + '</textarea>';
    } else {
      var t = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
      inp = '<input id="adm-f-' + f.k + '" type="' + t + '" value="' + admEsc(val) + '"' + (f.ro ? ' readonly' : '') + '>';
    }
    return '<div class="adm-field' + (f.full ? ' full' : '') + '"><label>' + f.label + (f.req ? '<span class="req">*</span>' : '') + '</label>' + inp + '</div>';
  }).join('');
  var title = (idx != null ? (sc.noun || '') + ' 수정' : (sc.noun || '') + ' 등록');
  admModal('<div class="adm-modal' + (sc.fields.length > 5 ? ' wide' : '') + '">'
    + '<div class="adm-modal-head"><b>' + title + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">' + body + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="admSaveForm(\'' + key + '\',' + (idx != null ? idx : 'null') + ')">' + (idx != null ? '수정' : '등록') + '</button></div></div>');
}
function admSaveForm(key, idx) {
  var sc = ADM_SCHEMA[key];
  idx = (idx === 'null' || idx == null) ? null : Number(idx);
  var obj = idx != null ? JSON.parse(JSON.stringify(ADM[key][idx])) : {};
  for (var n = 0; n < sc.fields.length; n++) {
    var f = sc.fields[n]; var el = document.getElementById('adm-f-' + f.k);
    if (!el) continue;
    var v = el.value;
    if (f.type === 'number') v = Number(String(v).replace(/[, ]/g, '')) || 0;
    if (f.req && (v === '' || v == null)) { admToast(f.label + '은(는) 필수입니다.'); return; }
    obj[f.k] = v;
  }
  if (idx != null) ADM[key][idx] = obj; else ADM[key].push(obj);
  if (sc.ordered) ADM[key].sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  admPersist(); admCloseModal(); asiteRender();
  admToast((sc.noun || '') + (idx != null ? ' 수정됨' : ' 등록됨'));
}
function admAskDelete(key, idx) {
  var sc = ADM_SCHEMA[key]; var row = ADM[key][idx]; if (!row) return;
  var label = row.name || row.type || row.system || row.cur || row.grade || row.code || ('항목 ' + (idx + 1));
  admModal('<div class="adm-modal" style="width:400px">'
    + '<div class="adm-modal-head"><b>삭제 확인</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div style="padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.6"><b>' + admEsc(label) + '</b> 을(를) 삭제하시겠습니까?<br><span class="adm-muted">삭제 후에는 되돌릴 수 없습니다.</span></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri del" style="background:#dc2626;border-color:#dc2626;color:#fff" onclick="admDoDelete(\'' + key + '\',' + idx + ')">삭제</button></div></div>');
}
function admDoDelete(key, idx) {
  if (ADM[key] && ADM[key][idx] != null) ADM[key].splice(idx, 1);
  admPersist(); admCloseModal(); asiteRender(); admToast('삭제되었습니다.');
}

// 외부 연동 / 배치 전용 동작
function admIntegTest(idx) {
  var row = ADM.integ[idx]; if (!row) return;
  admToast(row.system + ' 연결 테스트 중…');
  setTimeout(function () {
    row.status = row.status === '오류' ? '오류' : '연결';
    row.lastSync = admNowStr();
    admPersist(); asiteRender();
    admToast(row.system + (row.status === '오류' ? ' 연결 실패 — 엔드포인트 확인 필요' : ' 연결 정상'));
  }, 700);
}
function admBatchRun(idx) {
  var row = ADM.batch[idx]; if (!row) return;
  admToast(row.name + ' 즉시 실행…');
  setTimeout(function () {
    var ts = admNowStr();
    row.lastRun = ts; row.status = '정상';
    if (!row.hist) row.hist = [];
    row.hist.unshift({ ts: ts, result: '정상', dur: (Math.random() * 20 + 2).toFixed(1) + 's', detail: '수동 실행' });
    admPersist(); asiteRender();
    admToast(row.name + ' 실행 완료');
  }, 700);
}
function admBatchHistory(idx) {
  var row = ADM.batch[idx]; if (!row) return;
  var hist = row.hist || [];
  var body = hist.length ? hist.map(function (h) {
    return '<tr><td class="adm-code">' + admEsc(h.ts) + '</td><td>' + admPill(h.result) + '</td>'
      + '<td class="num">' + admEsc(h.dur) + '</td><td class="adm-muted">' + admEsc(h.detail || '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:22px">실행 이력이 없습니다.</td></tr>';
  admModal('<div class="adm-modal wide">'
    + '<div class="adm-modal-head"><b>⏱ ' + admEsc(row.name) + ' — 실행 이력</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div style="padding:4px 20px 2px"><span class="adm-muted">주기 ' + admEsc(row.schedule) + ' · 최근 실행 ' + admEsc(row.lastRun || '-') + ' · 다음 실행 ' + admEsc(row.nextRun || '-') + '</span></div>'
    + '<div style="padding:12px 20px 4px"><table class="adm-table"><thead><tr><th>실행 일시</th><th>결과</th><th class="num">소요</th><th>비고</th></tr></thead>'
    + '<tbody>' + body + '</tbody></table></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">닫기</button>'
    + '<button class="adm-btn pri" onclick="admCloseModal();admBatchRun(' + idx + ')">지금 실행</button></div></div>');
}
function admNowStr() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// ── 모달 공통 ──
function admModal(html) {
  var ov = document.getElementById('adm-modal-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'adm-modal-ov'; document.body.appendChild(ov); }
  ov.className = 'adm-modal-ov';
  ov.innerHTML = html;
  ov.onclick = function (e) { if (e.target === ov) admCloseModal(); };
  document.addEventListener('keydown', admModalEsc);
}
function admCloseModal() {
  var ov = document.getElementById('adm-modal-ov');
  if (ov) ov.remove();
  document.removeEventListener('keydown', admModalEsc);
}
function admModalEsc(e) { if (e.key === 'Escape') admCloseModal(); }

// ── 권한 관리 (역할 × 메뉴 매트릭스) ──
function admPermHtml() {
  var head = '<tr><th>역할</th>' + ADM_PERM_MENUS.map(function (m) { return '<th style="text-align:center;min-width:170px">' + m + '</th>'; }).join('') + '<th></th></tr>';
  var rows = ADM_ROLES.map(function (role) {
    var cells = ADM_PERM_MENUS.map(function (menu) {
      var have = (ADM.perm[role] && ADM.perm[role][menu]) || '';
      var chips = ADM_PERM_CRUD.map(function (c) {
        var code = c[0], on = have.indexOf(code) >= 0;
        return '<button class="adm-pchip' + (on ? ' on' : '') + '" title="' + c[1] + '" '
          + 'onclick="admPermFlip(this,\'' + role + '\',\'' + menu + '\',\'' + code + '\')">' + code + '</button>';
      }).join('');
      return '<td style="text-align:center"><div class="adm-pchips">' + chips + '</div></td>';
    }).join('');
    var delBtn = (role === '시스템관리자') ? '<span class="adm-muted">기본</span>'
      : '<button class="adm-btn sm del" onclick="admPermDelRole(\'' + role + '\')">삭제</button>';
    return '<tr><td><b>' + role + '</b></td>' + cells + '<td style="white-space:nowrap">' + delBtn + '</td></tr>';
  }).join('');
  var legend = '<div class="adm-perm-legend">'
    + ADM_PERM_CRUD.map(function (c) { return '<span><b>' + c[0] + '</b> ' + c[1] + '</span>'; }).join('')
    + '<em>칩을 눌러 켜고 끕니다 · 변경 즉시 저장</em></div>';
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admPermAddRole()">＋ 역할 등록</button>'
    + '<button class="adm-btn" onclick="admSave(\'권한\')">저장</button>'
    + '<span class="adm-count">' + ADM_ROLES.length + '개 역할</span></div>'
    + legend
    + '<table class="adm-table adm-perm-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ 역할이 각 메뉴에서 수행할 수 있는 권한을 칩으로 설정합니다 (C 등록·R 조회·U 수정·D 삭제·A 승인).</div>';
}
function admPermSet(role, menu, code, on) {
  if (!ADM.perm[role]) ADM.perm[role] = {};
  var cur = ADM.perm[role][menu] || '';
  var set = {};
  cur.split('').forEach(function (c) { set[c] = true; });
  if (on) set[code] = true; else delete set[code];
  ADM.perm[role][menu] = 'CRUDA'.split('').filter(function (c) { return set[c]; }).join('');
  admPersist();
}
// 칩 클릭 — 데이터 토글 + 자기 자신 스타일만 반전(리렌더 없이 가볍게)
function admPermFlip(btn, role, menu, code) {
  var on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  admPermSet(role, menu, code, on);
}
function admPermAddRole() {
  admModal('<div class="adm-modal" style="width:400px">'
    + '<div class="adm-modal-head"><b>역할 등록</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form"><div class="adm-field full"><label>역할명<span class="req">*</span></label><input id="adm-f-role" type="text" placeholder="예) 감사"></div></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="admPermAddRoleSave()">등록</button></div></div>');
}
function admPermAddRoleSave() {
  var el = document.getElementById('adm-f-role'); var v = el ? el.value.trim() : '';
  if (!v) { admToast('역할명은 필수입니다.'); return; }
  if (ADM_ROLES.indexOf(v) >= 0) { admToast('이미 있는 역할입니다.'); return; }
  ADM_ROLES.push(v);
  ADM.perm[v] = { '프로젝트': 'R', '수행원가': 'R', '인사이트': 'R', '관리자': '' };
  admPersist(); admCloseModal(); asiteRender(); admToast('역할 등록됨: ' + v);
}
function admPermDelRole(role) {
  var i = ADM_ROLES.indexOf(role);
  if (i >= 0) ADM_ROLES.splice(i, 1);
  delete ADM.perm[role];
  admPersist(); asiteRender(); admToast('역할 삭제됨: ' + role);
}

// ── 조직도 관리 (트리 + CRUD) ──
function admOrgHtml() {
  var rows = ADM.org.map(function (o, i) {
    var pad = 10 + o.lv * 22;
    var mark = o.lv === 0 ? '🏢' : o.lv === 1 ? '📂' : '👥';
    return '<div class="adm-org-row" style="padding-left:' + pad + 'px">'
      + '<span>' + mark + '</span><span class="adm-org-name">' + admEsc(o.name) + '</span>'
      + '<span class="adm-code" style="margin-left:8px">' + admEsc(o.code || '') + '</span>'
      + '<span class="adm-org-head">조직장 · ' + admEsc(o.head || '-') + ' · 인원 ' + admFmt(o.count) + '명</span>'
      + '<span style="margin-left:12px;white-space:nowrap"><button class="adm-btn sm" onclick="admOrgForm(' + i + ')">수정</button> '
      + '<button class="adm-btn sm del" onclick="admAskDeleteOrg(' + i + ')">삭제</button></span></div>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admOrgForm(null)">＋ 부서 등록</button>'
    + '<button class="adm-btn" onclick="admSave(\'조직도\')">저장</button>'
    + '<span class="adm-count">' + ADM.org.length + '개 조직</span></div>'
    + '<div class="adm-org">' + rows + '</div>'
    + '<div class="adm-note">※ 계층(본부 0 · 사업부 1 · 팀 2)에 따라 들여쓰기됩니다. 조직은 사용자 소속·매출귀속부서의 원천입니다.</div>';
}
function admOrgForm(idx) {
  idx = (idx == null || idx === 'null') ? null : Number(idx);
  var o = idx != null ? ADM.org[idx] : { lv: 2, count: 0 };
  var lvOpts = [['0', '본부'], ['1', '사업부'], ['2', '팀']].map(function (p) {
    return '<option value="' + p[0] + '"' + (String(o.lv) === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
  }).join('');
  admModal('<div class="adm-modal">'
    + '<div class="adm-modal-head"><b>' + (idx != null ? '조직 수정' : '조직 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">'
    + '<div class="adm-field"><label>조직명<span class="req">*</span></label><input id="adm-o-name" value="' + admEsc(o.name || '') + '"></div>'
    + '<div class="adm-field"><label>계층</label><select id="adm-o-lv">' + lvOpts + '</select></div>'
    + '<div class="adm-field"><label>조직 코드</label><input id="adm-o-code" value="' + admEsc(o.code || '') + '"></div>'
    + '<div class="adm-field"><label>조직장</label><input id="adm-o-head" value="' + admEsc(o.head || '') + '"></div>'
    + '<div class="adm-field"><label>인원</label><input id="adm-o-count" type="number" value="' + admEsc(o.count || 0) + '"></div>'
    + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="admOrgSave(' + (idx != null ? idx : 'null') + ')">' + (idx != null ? '수정' : '등록') + '</button></div></div>');
}
function admOrgSave(idx) {
  idx = (idx == null || idx === 'null') ? null : Number(idx);
  var name = (document.getElementById('adm-o-name').value || '').trim();
  if (!name) { admToast('조직명은 필수입니다.'); return; }
  var obj = {
    name: name, lv: Number(document.getElementById('adm-o-lv').value) || 0,
    code: document.getElementById('adm-o-code').value.trim(),
    head: document.getElementById('adm-o-head').value.trim(),
    count: Number(document.getElementById('adm-o-count').value) || 0,
  };
  if (idx != null) ADM.org[idx] = obj; else ADM.org.push(obj);
  admPersist(); admCloseModal(); asiteRender(); admToast('조직 ' + (idx != null ? '수정됨' : '등록됨'));
}
function admAskDeleteOrg(idx) {
  var o = ADM.org[idx]; if (!o) return;
  admModal('<div class="adm-modal" style="width:400px">'
    + '<div class="adm-modal-head"><b>삭제 확인</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div style="padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.6"><b>' + admEsc(o.name) + '</b> 조직을 삭제하시겠습니까?</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" style="background:#dc2626;border-color:#dc2626;color:#fff" onclick="admDoDeleteOrg(' + idx + ')">삭제</button></div></div>');
}
function admDoDeleteOrg(idx) { ADM.org.splice(idx, 1); admPersist(); admCloseModal(); asiteRender(); admToast('조직이 삭제되었습니다.'); }

// ── 로그·이력 (읽기 전용 + 필터 + 다운로드) ──
var admLogFilter = '전체';
function admLogHtml() {
  var actions = ['전체'].concat(ADM.log.map(function (l) { return l.action; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
  var q = (admSearch.log || '').trim().toLowerCase();
  var rows = ADM.log.filter(function (l) {
    if (admLogFilter !== '전체' && l.action !== admLogFilter) return false;
    if (q && [l.user, l.action, l.target, l.result, l.ip].join(' ').toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var body = rows.length ? rows.map(function (l) {
    return '<tr><td class="adm-code">' + admEsc(l.ts) + '</td><td><b>' + admEsc(l.user) + '</b></td>'
      + '<td><span class="adm-tag">' + admEsc(l.action) + '</span></td><td>' + admEsc(l.target) + '</td>'
      + '<td>' + admPill(l.result) + '</td><td class="adm-muted">' + admEsc(l.ip) + '</td></tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:22px">조건에 맞는 로그가 없습니다.</td></tr>';
  var opts = actions.map(function (a) { return '<option' + (a === admLogFilter ? ' selected' : '') + '>' + admEsc(a) + '</option>'; }).join('');
  return '<div class="adm-toolbar">'
    + '<select class="adm-filter" onchange="admLogSetFilter(this.value)">' + opts + '</select>'
    + '<input class="adm-search" placeholder="사용자·대상·IP 검색…" value="' + admEsc(admSearch.log || '') + '" oninput="admLogSearch(this.value)">'
    + '<button class="adm-btn" onclick="admLogDownload()">⬇ CSV 다운로드</button>'
    + '<span class="adm-count">' + rows.length + '건</span></div>'
    + '<table class="adm-table"><thead><tr><th>일시</th><th>사용자</th><th>액션</th><th>대상</th><th>결과</th><th>IP</th></tr></thead>'
    + '<tbody>' + body + '</tbody></table>'
    + '<div class="adm-note">※ 로그는 시스템이 자동 기록합니다(읽기 전용). 액션 필터·검색으로 추적하고 CSV로 내려받을 수 있습니다.</div>';
}
function admLogSetFilter(v) { admLogFilter = v; asiteRender(); }
function admLogSearch(v) { admSearch.log = v; asiteRender(); }
function admLogDownload() {
  var head = ['일시', '사용자', '액션', '대상', '결과', 'IP'];
  var lines = [head.join(',')].concat(ADM.log.map(function (l) { return [l.ts, l.user, l.action, l.target, l.result, l.ip].join(','); }));
  var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = '관리자-로그이력.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  admToast('로그 이력을 CSV로 내려받았습니다.');
}

// ── 섹션 디스패치 ──
function admSectionBody(key) {
  if (key === 'perm') return admPermHtml();
  if (key === 'org') return admOrgHtml();
  if (key === 'log') return admLogHtml();
  if (ADM_SCHEMA[key]) return admTable(key);
  return admTable('user');
}

// ════════ ① 관리자 독립 사이트 (admin.html) ════════
var adminCur = 'user';
var adminTabs = [];          // [{ id, key }]
var adminActiveId = null;
var adminTabSeq = 0;
var ADMIN_MAX_TABS = 5;

function asiteRender() {
  var nav = document.getElementById('asite-nav');
  var main = document.getElementById('asite-main');
  if (!nav || !main) return;
  nav.innerHTML = '<div class="asite-nav-lbl">관리 메뉴</div>' + ADMIN_SECTIONS.map(function (s) {
    var on = s.key === adminCur ? ' on' : '';
    return '<button class="asite-navi' + on + '" onclick="adminGo(\'' + s.key + '\')">'
      + '<span class="asite-navi-ic">' + s.icon + '</span><span class="asite-navi-t">' + s.title + '</span></button>';
  }).join('');
  var meta = ADMIN_SECTIONS.find(function (s) { return s.key === adminCur; }) || {};
  main.innerHTML = asiteTabsHtml()
    + '<div class="asite-page"><div class="asite-head"><div class="asite-h-ic">' + (meta.icon || '') + '</div><div>'
    + '<div class="asite-h-t">' + (meta.title || '') + '</div>'
    + '<div class="asite-h-d">' + (meta.desc || '') + '</div></div></div>'
    + '<div class="asite-content">' + admSectionBody(adminCur) + '</div></div>';
}

// 콘텐츠 상단 탭 바 (여러 관리 화면을 동시에 띄움)
function asiteTabsHtml() {
  if (!adminTabs.length) return '';
  var chips = adminTabs.map(function (t) {
    var meta = ADMIN_SECTIONS.find(function (s) { return s.key === t.key; }) || {};
    var on = t.id === adminActiveId ? ' on' : '';
    var solo = adminTabs.length <= 1 ? ' solo' : '';
    return '<div class="asite-tab' + on + solo + '" onclick="adminActivateTab(' + t.id + ')" title="' + (meta.title || '') + '">'
      + '<span class="asite-tab-ic">' + (meta.icon || '') + '</span><span class="asite-tab-t">' + (meta.title || '') + '</span>'
      + '<button class="asite-tab-x" onclick="event.stopPropagation();adminCloseTab(' + t.id + ')" aria-label="탭 닫기">✕</button></div>';
  }).join('');
  var clear = '<button class="asite-tab-clear" onclick="adminClearTabs()" title="모든 탭 닫기" aria-label="모든 탭 닫기">🗑</button>';
  var newb = '<button class="asite-tab-new" onclick="adminOpenMenu()" title="새 탭 — 메뉴에서 선택" aria-label="새 탭">＋</button>';
  return '<div class="asite-tabbar">' + clear + chips + newb + '</div>';
}
function adminClearTabs() {
  adminTabs = [{ id: ++adminTabSeq, key: 'user' }];
  adminActiveId = adminTabSeq;
  adminCur = 'user';
  try { history.replaceState(null, '', '#user'); } catch (e) {}
  asiteRender();
}

// 메뉴 선택 = 해당 탭이 있으면 포커스, 없으면 새 탭(최대 5)
function adminGo(key) {
  if (!ADMIN_SECTIONS.some(function (s) { return s.key === key; })) key = 'user';
  var ex = adminTabs.find(function (t) { return t.key === key; });
  if (ex) {
    adminActiveId = ex.id;
  } else if (adminTabs.length >= ADMIN_MAX_TABS) {
    admToast('탭은 최대 ' + ADMIN_MAX_TABS + '개까지 열 수 있어 현재 탭에서 엽니다.');
    var at = adminTabs.find(function (t) { return t.id === adminActiveId; });
    if (at) { at.key = key; } else { adminTabs.push({ id: ++adminTabSeq, key: key }); adminActiveId = adminTabSeq; }
  } else {
    adminTabs.push({ id: ++adminTabSeq, key: key });
    adminActiveId = adminTabSeq;
  }
  adminCur = key;
  try { if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key); } catch (e) {}
  asiteRender();
  var m = document.getElementById('asite-main'); if (m) m.scrollTop = 0;
}
function adminActivateTab(id) {
  var t = adminTabs.find(function (x) { return x.id === id; });
  if (!t) return;
  adminActiveId = id; adminCur = t.key;
  try { if (location.hash !== '#' + t.key) history.replaceState(null, '', '#' + t.key); } catch (e) {}
  asiteRender();
}
function adminCloseTab(id) {
  if (adminTabs.length <= 1) return;
  var idx = adminTabs.findIndex(function (t) { return t.id === id; });
  if (idx < 0) return;
  var wasActive = id === adminActiveId;
  adminTabs.splice(idx, 1);
  if (wasActive) {
    var next = adminTabs[Math.min(idx, adminTabs.length - 1)];
    adminActiveId = next.id; adminCur = next.key;
    try { history.replaceState(null, '', '#' + next.key); } catch (e) {}
  }
  asiteRender();
}
// 레일 접기/펴기(아이콘 모드)
function adminToggleRail() {
  var min = document.body.classList.toggle('asite-min');
  try { localStorage.setItem('newmis.adminRailMin', min ? '1' : '0'); } catch (e) {}
}
function adminApplyRail() {
  try { if (localStorage.getItem('newmis.adminRailMin') === '1') document.body.classList.add('asite-min'); } catch (e) {}
}

// 메뉴 보기 팝업
function adminOpenMenu() {
  var ov = document.getElementById('amenu-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'amenu-ov'; document.body.appendChild(ov); }
  ov.className = 'amenu-ov';
  var items = ADMIN_SECTIONS.map(function (s) {
    return '<button class="amenu-item' + (s.key === adminCur ? ' on' : '') + '" onclick="adminMenuGo(\'' + s.key + '\')">'
      + '<span class="amenu-ic">' + s.icon + '</span><span>' + s.title + '</span></button>';
  }).join('');
  ov.innerHTML = '<div class="amenu-panel" role="dialog" aria-modal="true" aria-label="관리 메뉴">'
    + '<div class="amenu-head"><strong>☰ 관리 메뉴</strong><button class="amenu-x" onclick="adminCloseMenu()" aria-label="닫기">✕</button></div>'
    + '<div class="amenu-list">' + items + '</div></div>';
  ov.onclick = function (e) { if (e.target === ov) adminCloseMenu(); };
  document.addEventListener('keydown', adminMenuEsc);
}
function adminCloseMenu() {
  var ov = document.getElementById('amenu-ov');
  if (ov) ov.remove();
  document.removeEventListener('keydown', adminMenuEsc);
}
function adminMenuEsc(e) { if (e.key === 'Escape') adminCloseMenu(); }
function adminMenuGo(key) { adminCloseMenu(); adminGo(key); }

// 관리자 사이트 우측 상단 '메인' 버튼 — 메인앱 Admin 버튼과 동일 디자인
function adminInjectMainBtn() {
  if (document.getElementById('asite-main-btn')) return;
  if (!document.getElementById('asite-mainbtn-style')) {
    var st = document.createElement('style'); st.id = 'asite-mainbtn-style';
    st.textContent = '#asite-main-btn{position:fixed;top:12px;right:18px;z-index:120;display:inline-flex;align-items:center;gap:6px;'
      + 'border:1px solid #d7a3a3;background:#fff;color:#b23b3b;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:800;'
      + 'cursor:pointer;font-family:inherit;text-decoration:none;box-shadow:0 4px 12px -6px rgba(178,59,59,.35)}'
      + '#asite-main-btn:hover{background:#fff5f5;border-color:#b23b3b}';
    document.head.appendChild(st);
  }
  var a = document.createElement('a');
  a.id = 'asite-main-btn'; a.href = '/'; a.title = '메인으로';
  a.innerHTML = '<span aria-hidden="true">⬅</span> 메인';
  document.body.appendChild(a);
}

function initAdminSite() {
  admLoad();
  adminInjectMainBtn();
  adminApplyRail();
  var h = (location.hash || '').replace('#', '');
  if (h && ADMIN_SECTIONS.some(function (s) { return s.key === h; })) adminCur = h;
  adminTabs = [{ id: ++adminTabSeq, key: adminCur }];   // 첫 탭
  adminActiveId = adminTabSeq;
  asiteRender();
  window.addEventListener('hashchange', function () {
    var k = (location.hash || '').replace('#', '');
    if (k && k !== adminCur) adminGo(k);
  });
}

// ════════ ② 메인 앱 진입 버튼 (index.html) ════════
function adminInjectEntry() {
  if (document.getElementById('admin-entry')) return;
  if (!document.getElementById('admin-entry-style')) {
    var st = document.createElement('style'); st.id = 'admin-entry-style';
    st.textContent = '#admin-entry{position:fixed;top:12px;right:18px;z-index:120;display:inline-flex;align-items:center;gap:6px;'
      + 'border:1px solid #d7a3a3;background:#fff;color:#b23b3b;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:800;'
      + 'cursor:pointer;font-family:inherit;box-shadow:0 4px 12px -6px rgba(178,59,59,.35)}'
      + '#admin-entry:hover{background:#fff5f5;border-color:#b23b3b}';
    document.head.appendChild(st);
  }
  var b = document.createElement('button');
  b.id = 'admin-entry';
  b.innerHTML = '<span aria-hidden="true">⚙</span> Admin';
  b.title = '관리자 사이트 열기';
  b.setAttribute('aria-label', '관리자 사이트로 이동');
  b.onclick = function () { window.location.href = '/admin.html'; };
  document.body.appendChild(b);
}

// ── 부트: 맥락 감지 ──
(function bootAdmin() {
  function run() {
    if (document.getElementById('asite-main')) initAdminSite();   // 관리자 사이트
    else adminInjectEntry();                                      // 메인 앱 → 진입 버튼
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
