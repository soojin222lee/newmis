// ════════════════════════════════════════
//  관리자 > AS-IS 관리자 메뉴 10종                       작성: 남주
// ════════════════════════════════════════
//
// AS-IS 관리자(base-front src/views/admin · shared)에 있고 목업 어드민에 없던 화면 10개를 옮깁니다.
// admin.js(수진)는 고치지 않고 그 뒤에 로드되어 메뉴와 화면을 끼워 넣습니다(apvline · closedate 패턴).
//   · ADMIN_SECTIONS 에 10개 메뉴 추가(부트 렌더 전 — admin.js 는 DOMContentLoaded 에 그림)
//   · admSectionBody 를 데코레이터로 감싸 이 파일의 메뉴만 여기서 그리고 나머지는 원래 함수로 넘깁니다
//   · 모달 · 토스트 · 표 · 버튼은 admin.js 공용(admModal · admToast · .adm-*)을 그대로 씁니다
//
//  메뉴(키)            AS-IS 원본
//  구성원 조회(member)     admin/member/MemberManagement.vue           — 조회 전용
//  SG&A 조직 관리(sgna)    admin/organization/SgnaOrganizationManagement.vue
//  계정과목 조회(acct)     admin/accountTitle/AccountTitleManagement.vue — 조회 전용
//  고객사 조회(client)     admin/client/ClientManagement.vue           — 조회 전용 + 상세
//  협력사 조회(partner)    admin/partner/PartnerManagement.vue         — 조회 전용 + 상세
//  사용자 그룹 관리(ugroup) shared/userGroup/UserGroupManagement.vue
//  화면 관리(page)         admin/page/PageManagement.vue
//  IP접근제어 관리(ip)     admin/ipAccessControl/IPAccessControlManagement.vue
//  게시판 관리(board)      admin/board/ (공지사항 · Q&A · 매뉴얼 탭)
//  첨부파일 관리(file)     admin/attachedFile/AttachedFileManagement.vue
//
// AS-IS 의 '행추가 → 그리드에서 바로 입력 → 저장' 방식은 목업 어드민 공통 방식(등록/수정 팝업 + 행별 삭제)으로 바꿨습니다.

// ── 목업 데이터 ──
var AAS_DEF = {
  memberOrg: [
    { name: '전체', lv: 0 },
    { name: 'AX사업본부', lv: 1 }, { name: 'AX ERP사업부 1팀', lv: 2, up: 'AX사업본부' }, { name: 'AX ERP사업부 2팀', lv: 2, up: 'AX사업본부' },
    { name: '데이터사업본부', lv: 1 }, { name: '데이터사업부', lv: 2, up: '데이터사업본부' }, { name: '데이터플랫폼팀', lv: 2, up: '데이터사업본부' },
    { name: '경영지원본부', lv: 1 }, { name: '재무팀', lv: 2, up: '경영지원본부' }, { name: '구매팀', lv: 2, up: '경영지원본부' },
  ],
  member: [
    { name: '이봄',   emp: '21043', pos: '책임', duty: 'PM',   dept: 'AX ERP사업부 1팀' },
    { name: '신성호', emp: '13016', pos: '수석', duty: '팀장', dept: 'AX ERP사업부 1팀' },
    { name: '윤가은', emp: '22071', pos: '선임', duty: '팀원', dept: 'AX ERP사업부 1팀' },
    { name: '장재호', emp: '15025', pos: '책임', duty: '팀원', dept: 'AX ERP사업부 2팀' },
    { name: '문태경', emp: '12008', pos: '수석', duty: '팀장', dept: 'AX ERP사업부 2팀' },
    { name: '한민석', emp: '21055', pos: '책임', duty: 'PM',   dept: '데이터사업부' },
    { name: '오세린', emp: '19032', pos: '수석', duty: '팀장', dept: '데이터사업부' },
    { name: '배준우', emp: '23014', pos: '선임', duty: '팀원', dept: '데이터플랫폼팀' },
    { name: '정다희', emp: '18047', pos: '책임', duty: '팀원', dept: '재무팀' },
    { name: '고현수', emp: '11003', pos: '수석', duty: '팀장', dept: '재무팀' },
    { name: '임채윤', emp: '20066', pos: '책임', duty: '팀원', dept: '구매팀' },
  ],
  sgna: [
    { id: 100, name: '경영지원부문',   cc: 'CC1000', real: 'O1000', abbr: '경영지원', eng: 'Management Support', start: '2020-01-01', end: '9999-12-31', parent: '',  phase: 1, sort: 1 },
    { id: 110, name: '재무실',         cc: 'CC1100', real: 'O1100', abbr: '재무',     eng: 'Finance Office',     start: '2020-01-01', end: '9999-12-31', parent: 100, phase: 2, sort: 1 },
    { id: 111, name: '회계팀',         cc: 'CC1110', real: 'O1110', abbr: '회계',     eng: 'Accounting Team',    start: '2020-01-01', end: '9999-12-31', parent: 110, phase: 3, sort: 1 },
    { id: 112, name: '자금팀',         cc: 'CC1120', real: 'O1120', abbr: '자금',     eng: 'Treasury Team',      start: '2021-07-01', end: '9999-12-31', parent: 110, phase: 3, sort: 2 },
    { id: 120, name: '인사실',         cc: 'CC1200', real: 'O1200', abbr: '인사',     eng: 'HR Office',          start: '2020-01-01', end: '9999-12-31', parent: 100, phase: 2, sort: 2 },
    { id: 121, name: '인사운영팀',     cc: 'CC1210', real: 'O1210', abbr: '인사운영', eng: 'HR Operation Team',  start: '2020-01-01', end: '9999-12-31', parent: 120, phase: 3, sort: 1 },
    { id: 200, name: '사업지원부문',   cc: 'CC2000', real: 'O2000', abbr: '사업지원', eng: 'Business Support',   start: '2020-01-01', end: '9999-12-31', parent: '',  phase: 1, sort: 2 },
    { id: 210, name: '구매실',         cc: 'CC2100', real: 'O2100', abbr: '구매',     eng: 'Procurement Office', start: '2020-01-01', end: '9999-12-31', parent: 200, phase: 2, sort: 1 },
    { id: 211, name: '외주관리팀',     cc: 'CC2110', real: 'O2110', abbr: '외주',     eng: 'Outsourcing Team',   start: '2022-01-01', end: '2025-12-31', parent: 210, phase: 3, sort: 1 },
  ],
  acct: [
    { code: '41110100', name: '용역매출',       mid: '매출액',     ci: '매출' },
    { code: '51110100', name: '급여',           mid: '인건비',     ci: '인건비' },
    { code: '51110300', name: '상여금',         mid: '인건비',     ci: '인건비' },
    { code: '51210100', name: '외주용역비',     mid: '외주비',     ci: '외주비' },
    { code: '51310100', name: '소프트웨어구입비', mid: '재료비',   ci: '재료비' },
    { code: '51310200', name: '하드웨어구입비', mid: '재료비',     ci: '재료비' },
    { code: '52110100', name: '여비교통비',     mid: '경비',       ci: '경비' },
    { code: '52110300', name: '회의비',         mid: '경비',       ci: '경비' },
    { code: '52120100', name: '지급수수료',     mid: '경비',       ci: '경비' },
    { code: '52130100', name: '하자보수비',     mid: 'A/S비',      ci: 'A/S비' },
  ],
  client: [
    { code: 'C10021', name: '한빛전자(주)',   erp: '100021', ceo: '김한빛', credit: 'AA',  brn: '214-81-10021', type: '전자부품 제조', cond: '제조업', rel: 'N', addr: '서울특별시 영등포구 국제금융로 10', zip: '07326', pub: '민간', limit: 5000000000 },
    { code: 'C10045', name: '대한물류(주)',   erp: '100045', ceo: '박대한', credit: 'A+',  brn: '120-86-10045', type: '화물 운송',     cond: '운수업', rel: 'N', addr: '인천광역시 중구 공항로 272',      zip: '22382', pub: '민간', limit: 2000000000 },
    { code: 'C10087', name: '미래에너지(주)', erp: '100087', ceo: '최미래', credit: 'A',   brn: '305-81-10087', type: '전력 공급',     cond: '전기업', rel: 'Y', addr: '울산광역시 남구 산업로 400',      zip: '44776', pub: '민간', limit: 8000000000 },
    { code: 'C20003', name: '한국공공데이터원', erp: '200003', ceo: '정공공', credit: '-', brn: '107-82-20003', type: '공공 행정',     cond: '서비스업', rel: 'N', addr: '세종특별자치시 도움6로 11',     zip: '30103', pub: '공공', limit: 0 },
    { code: 'C10112', name: '그린리테일(주)', erp: '100112', ceo: '윤그린', credit: 'BBB+', brn: '211-87-10112', type: '종합 소매',    cond: '도소매업', rel: 'N', addr: '서울특별시 송파구 올림픽로 300', zip: '05551', pub: '민간', limit: 1500000000 },
  ],
  partner: [
    { code: 'P30011', name: '코드웨이브(주)', abbr: '코드웨이브', ceo: '이코드', credit: 'A',   brn: '220-88-30011', l1: 'J', l2: 'J62', l3: 'J620', cond: '서비스업', type: '소프트웨어 개발', url: 'www.codewave.example', rel: 'N', addr: '경기도 성남시 분당구 판교로 235', zip: '13494' },
    { code: 'P30024', name: '데이터온(주)',   abbr: '데이터온',   ceo: '서데이', credit: 'BBB', brn: '135-86-30024', l1: 'J', l2: 'J63', l3: 'J631', cond: '서비스업', type: '데이터 처리',     url: 'www.dataon.example',   rel: 'N', addr: '서울특별시 강남구 테헤란로 427',  zip: '06159' },
    { code: 'P30037', name: '넥스트인프라(주)', abbr: '넥스트인프라', ceo: '한인프', credit: 'A-', brn: '214-87-30037', l1: 'F', l2: 'F42', l3: 'F423', cond: '건설업', type: '정보통신 공사', url: 'www.nextinfra.example', rel: 'N', addr: '서울특별시 구로구 디지털로 300', zip: '08378' },
    { code: 'P30052', name: '에이원솔루션(주)', abbr: '에이원', ceo: '김에이', credit: 'AA-', brn: '101-81-30052', l1: 'J', l2: 'J58', l3: 'J582', cond: '서비스업', type: '패키지 소프트웨어', url: 'www.a1sol.example', rel: 'Y', addr: '서울특별시 중구 을지로 65', zip: '04539' },
  ],
  ugroup: [
    { id: 1, type: '공용 그룹', name: '원가 마감 담당자', note: '월마감 알림 메일 수신 그룹', owner: '고현수', members: ['18047', '11003'] },
    { id: 2, type: '공용 그룹', name: 'AX사업본부 PM',    note: '실행예산 기안 안내 수신',     owner: '신성호', members: ['21043', '15025'] },
    { id: 3, type: '개인 그룹', name: '내 프로젝트 팀원', note: '',                            owner: '이봄',   members: ['22071', '15025'] },
  ],
  page: [
    { svc: '수주형 서비스',   name: '실행예산 원가현황', route: 'budget-status',          path: '/its/budget/status',   mode: 'OFF' },
    { svc: '수주형 서비스',   name: '실행예산 원가조정', route: 'budget-adjust',          path: '/its/budget/adjust',   mode: 'OFF' },
    { svc: '수주형 서비스',   name: '변경 이력',         route: 'budget-history',         path: '/its/budget/history',  mode: 'OFF' },
    { svc: '기반관리 서비스', name: '프로젝트 현황',     route: 'project-status',         path: '/base/project/status', mode: 'ON'  },
    { svc: '기반관리 서비스', name: '공지사항',          route: 'board/notice',           path: '/base/board/notice',   mode: 'ON'  },
    { svc: '데이터 인사이트', name: 'AI 레포트',         route: 'ai-report',              path: '/dataInsight/ai-report', mode: 'OFF' },
    { svc: '투자 서비스',     name: '투자 프로젝트',     route: 'investment-project',     path: '/invest/project',      mode: 'OFF' },
  ],
  ip: [
    { reg: '2026-03-02 09:10', mod: '2026-03-02 09:10', ip: '10.20.31.15',  owner: '11003', by: '13016' },
    { reg: '2026-03-02 09:11', mod: '2026-06-18 14:22', ip: '10.20.31.16',  owner: '18047', by: '13016' },
    { reg: '2026-05-11 17:40', mod: '2026-05-11 17:40', ip: '10.20.44.102', owner: '21043', by: '13016' },
    { reg: '2026-09-01 10:05', mod: '2026-09-01 10:05', ip: '172.16.8.21',  owner: '23014', by: '19032' },
  ],
  notice: [
    { type: '긴급작업공지', title: '11/29(토) 02:00~06:00 시스템 정기 점검', pop: 'Y', org: '데이터플랫폼팀', writer: '배준우', date: '2026-11-25', views: 412, body: '점검 시간 동안 로그인이 제한됩니다.' },
    { type: '공지',         title: '2026년 12월 실행예산 마감 일정 안내',     pop: 'N', org: '재무팀',         writer: '고현수', date: '2026-11-20', views: 286, body: '12월 마감은 12/26(금) 18시입니다.' },
    { type: '안내',         title: '원가조정 화면 Agent 제안 기능 사용 안내', pop: 'N', org: 'AX ERP사업부 1팀', writer: '신성호', date: '2026-11-12', views: 198, body: '예산 조정안 카드의 출처 태그를 확인하세요.' },
    { type: '작업공지',     title: 'ERP 환율 연동 배치 시간 변경',            pop: 'N', org: '데이터플랫폼팀', writer: '배준우', date: '2026-10-30', views: 77,  body: '매일 07:00 → 06:30 으로 변경됩니다.' },
  ],
  qna: [
    { type: '수주',     title: '외주비 PO가 원가현황에 안 보입니다',        org: 'AX ERP사업부 2팀', writer: '장재호', date: '2026-11-26', views: 14, state: '답변예정', q: 'PO 발행 후 하루가 지났는데 실적에 반영되지 않습니다.', a: '' },
    { type: '수주',     title: 'P레벨 단가가 바뀌면 계획 MM 금액도 바뀌나요?', org: 'AX ERP사업부 1팀', writer: '윤가은', date: '2026-11-21', views: 31, state: '답변완료', q: '단가 변경 시점 이후 계획에도 적용되는지 궁금합니다.', a: '적용일 이후 월부터 새 단가로 다시 계산됩니다.' },
    { type: '플랫폼',   title: '데이터 다운로드 권한 요청',                  org: '데이터사업부',     writer: '한민석', date: '2026-11-18', views: 9,  state: '확인 중',  q: '원가현황 엑셀 다운로드가 안 됩니다.', a: '' },
    { type: '투자',     title: '투자 프로젝트 종료 후 실적 수정 가능 여부',   org: '재무팀',           writer: '정다희', date: '2026-11-04', views: 22, state: '조치 중',  q: '종료된 투자 프로젝트의 실적을 정정해야 합니다.', a: '' },
  ],
  manual: [
    { type: '메인',   title: '실행예산 원가조정',   remark: '예산 조정안 작성 · 기안 · 결재 흐름', org: 'AX ERP사업부 1팀', writer: '신성호', date: '2026-11-10', views: 532, body: '' },
    { type: '매뉴얼', title: '실행예산 원가현황',   remark: '계정별 계획 · 실적 조회',             org: 'AX ERP사업부 1팀', writer: '신성호', date: '2026-10-28', views: 301, body: '' },
    { type: '매뉴얼', title: '프로젝트 개설 관리',  remark: 'W/G · 사내 프로젝트 개설 신청',       org: '데이터사업부',     writer: '오세린', date: '2026-10-15', views: 144, body: '' },
  ],
  folder: [
    { id: 1, name: 'board',    up: 0 }, { id: 2, name: 'notice', up: 1 }, { id: 3, name: 'manual', up: 1 },
    { id: 4, name: 'budget',   up: 0 }, { id: 5, name: 'po',     up: 4 }, { id: 6, name: 'approval', up: 4 },
  ],
  file: [
    { folder: 2, name: '정기점검_안내.pdf',          real: 'f8a1c2e4.pdf',  size: 248320,  ext: 'pdf',  date: '2026-11-25 10:02' },
    { folder: 3, name: '원가조정_매뉴얼_v3.pptx',     real: '0b77de19.pptx', size: 5321984, ext: 'pptx', date: '2026-11-10 16:40' },
    { folder: 3, name: '원가현황_매뉴얼.pdf',         real: '91c0aa3e.pdf',  size: 1880064, ext: 'pdf',  date: '2026-10-28 09:15' },
    { folder: 5, name: 'PO_2026-1102_코드웨이브.xlsx', real: '5d2e8f01.xlsx', size: 64512,   ext: 'xlsx', date: '2026-11-02 13:21' },
    { folder: 6, name: '실행예산_기안_첨부.zip',      real: 'c4f3b8a2.zip',  size: 9437184, ext: 'zip',  date: '2026-11-19 18:05' },
  ],
};

// ── 저장소(localStorage) ──
var AAS_KEY = 'budgetai.admin.asis.v1';
var AAS = {};
function aasLoad() {
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(AAS_KEY) || '{}') || {}; } catch (e) { saved = {}; }
  Object.keys(AAS_DEF).forEach(function (k) { AAS[k] = saved[k] != null ? saved[k] : JSON.parse(JSON.stringify(AAS_DEF[k])); });
}
function aasPersist() { try { localStorage.setItem(AAS_KEY, JSON.stringify(AAS)); } catch (e) {} }
aasLoad();

// ── 유틸 ──
function aasE(s) { return (typeof admEsc === 'function') ? admEsc(s) : String(s == null ? '' : s); }
function aasNow() { return (typeof admNowStr === 'function') ? admNowStr() : new Date().toISOString().slice(0, 16).replace('T', ' '); }
function aasToday() { return aasNow().slice(0, 10); }
function aasMoney(n) { return (Number(n) || 0).toLocaleString('ko-KR'); }
function aasSize(b) { b = Number(b) || 0; return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function aasEmpty(cols, msg) { return '<tr><td colspan="' + cols + '" class="aas-empty">' + (msg || '조회된 데이터가 없습니다.') + '</td></tr>'; }
function aasMemberName(emp) { var m = (AAS.member || []).find(function (x) { return x.emp === emp; }); return m ? m.name : ''; }

// ── 화면 정의 (조회 조건 · 컬럼 · 입력 항목 · 상세) ──
// search: { t:'radio', opts:[[라벨, 필드]] } = AS-IS 라디오 + 검색어 / { t:'text'|'select', k, label, opts }
var AAS_SC = {
  member: {
    noun: '구성원', ro: true,
    search: [{ t: 'radio', opts: [['이름', 'name'], ['사번', 'emp']] }],
    cols: [{ k: 'name', label: '이름', b: true }, { k: 'emp', label: '사번', code: true }, { k: 'pos', label: '직위' }, { k: 'duty', label: '직책' }, { k: 'dept', label: '부서' }],
    note: '※ HR 인사 마스터에서 받은 구성원을 조회만 합니다. 왼쪽 조직을 누르면 그 조직 구성원만 봅니다.',
  },
  acct: {
    noun: '계정과목', ro: true,
    search: [{ t: 'radio', opts: [['계정코드', 'code'], ['계정명', 'name']] }],
    cols: [{ k: 'code', label: '계정코드', code: true }, { k: 'name', label: '계정명', b: true }, { k: 'mid', label: '중계정명' }, { k: 'ci', label: 'CI명', tag: true }],
    note: '※ ERP 계정과목을 조회만 합니다. CI명은 수행원가 계정(인건비 · 외주비 · 재료비 · 경비 · A/S비) 묶음입니다.',
  },
  client: {
    noun: '고객사', ro: true,
    search: [{ t: 'radio', opts: [['회사명', 'name'], ['사업자 등록번호', 'brn'], ['업종', 'type']] }],
    cols: [{ k: 'code', label: '코드', code: true }, { k: 'name', label: '회사명', b: true }, { k: 'ceo', label: '대표자' }, { k: 'credit', label: '신용등급' },
      { k: 'brn', label: '사업자등록번호' }, { k: 'type', label: '업종' }, { k: 'cond', label: '업태' }, { k: 'rel', label: '관계사여부' }, { k: 'pub', label: '공공구분', tag: true }],
    detail: [['회사명', 'name'], ['ERP코드', 'erp'], ['고객사ID', 'code'], ['대표자', 'ceo'], ['신용등급', 'credit'], ['사업자등록번호', 'brn'], ['업태', 'cond'], ['업종', 'type'],
      ['관계사여부', 'rel'], ['주소', 'addr'], ['우편번호', 'zip'], ['공공구분', 'pub'], ['여신금액', 'limit', aasMoney]],
    note: '※ ERP 고객 마스터를 조회만 합니다. 줄을 누르면 오른쪽에 상세가 열립니다.',
  },
  partner: {
    noun: '협력사', ro: true,
    search: [{ t: 'radio', opts: [['회사명', 'name'], ['사업자 등록번호', 'brn'], ['업종', 'type']] }],
    cols: [{ k: 'code', label: '코드', code: true }, { k: 'name', label: '회사명', b: true }, { k: 'ceo', label: '대표자' }, { k: 'brn', label: '사업자등록번호' },
      { k: 'type', label: '업종' }, { k: 'cond', label: '업태' }, { k: 'rel', label: '관계사여부' }, { k: 'addr', label: '주소', muted: true }],
    detail: [['회사명', 'name'], ['협력사코드', 'code'], ['회사명약어', 'abbr'], ['대표자', 'ceo'], ['신용등급', 'credit'], ['사업자등록번호', 'brn'], ['업종대분류코드', 'l1'], ['업종중분류코드', 'l2'],
      ['업종소분류코드', 'l3'], ['업태', 'cond'], ['업종', 'type'], ['URL', 'url'], ['관계사여부', 'rel'], ['주소', 'addr'], ['우편번호', 'zip']],
    note: '※ 구매 협력사 마스터를 조회만 합니다. 줄을 누르면 오른쪽에 상세가 열립니다.',
  },
  page: {
    noun: '화면', add: '＋ 화면 등록',
    search: [
      { t: 'select', k: 'svc', label: '서비스 구분', opts: ['기반관리 서비스', '수주형 서비스', '플랫폼 서비스', '추정 서비스', '투자 서비스', '데이터 인사이트', 'UI 가이드'] },
      { t: 'select', k: 'mode', label: '서비스 모드', opts: ['ON', 'OFF'] },
      { t: 'text', k: 'name', label: '화면이름' }, { t: 'text', k: 'route', label: '라우팅 경로' }, { t: 'text', k: 'path', label: '서비스 경로' },
    ],
    cols: [{ k: 'svc', label: '서비스구분', tag: true }, { k: 'name', label: '화면이름', b: true }, { k: 'route', label: '라우팅경로', code: true }, { k: 'path', label: '서비스경로', code: true },
      { k: 'mode', label: '서비스모드', fmt: function (v) { return '<span class="adm-pill ' + (v === 'ON' ? 'amber' : 'gray') + '">' + aasE(v) + '</span>'; } }],
    fields: [
      { k: 'svc', label: '서비스구분', type: 'select', opts: ['기반관리 서비스', '수주형 서비스', '플랫폼 서비스', '추정 서비스', '투자 서비스', '데이터 인사이트', 'UI 가이드'], def: '기반관리 서비스' },
      { k: 'mode', label: '서비스모드', type: 'select', opts: ['ON', 'OFF'], def: 'ON' },
      { k: 'name', label: '화면이름', req: '화면이름을 입력해 주세요.' },
      { k: 'route', label: '라우팅경로', req: '라우팅경로를 입력해 주세요.' },
      { k: 'path', label: '서비스경로', full: true },
    ],
    note: '※ 메뉴 관리의 메뉴는 여기 등록한 화면을 연결합니다. 서비스모드 ON = 운영모드(긴급) 전환 중에도 열리는 화면입니다.',
  },
  ip: {
    noun: 'IP', add: '＋ IP 등록',
    search: [{ t: 'text', k: 'ip', label: 'IP주소' }, { t: 'text', k: 'owner', label: 'IP소유자사번' }, { t: 'text', k: 'by', label: '등록자사번' }],
    cols: [{ k: 'reg', label: '등록일', muted: true }, { k: 'mod', label: '수정일', muted: true }, { k: 'ip', label: 'IP 주소', code: true },
      { k: 'owner', label: 'IP 소유자 사번', fmt: function (v) { return aasE(v) + ' <span class="adm-muted">' + aasE(aasMemberName(v)) + '</span>'; } },
      { k: 'by', label: '등록자 사번', fmt: function (v) { return aasE(v) + ' <span class="adm-muted">' + aasE(aasMemberName(v)) + '</span>'; } }],
    fields: [
      { k: 'ip', label: 'IP 주소', req: 'IP 주소를 입력해 주세요.', valid: /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/, validMsg: 'IP 주소 형식이 올바르지 않습니다. (예: 10.20.31.15)' },
      { k: 'owner', label: 'IP 소유자 사번', req: 'IP 소유자 사번을 입력해 주세요.' },
      { k: 'by', label: '등록자 사번', def: '13016' },
    ],
    stamp: true,
    note: '※ 운영모드(긴급) 전환 시 여기 등록된 IP에서만 접속할 수 있습니다. [운영모드 전환]을 누르면 접속 중인 모든 사용자가 로그아웃됩니다.',
  },
  notice: {
    noun: '공지사항', add: '＋ 공지사항 등록',
    search: [{ t: 'select', k: 'type', label: '구분', opts: ['공지', '작업공지', '안내', '긴급작업공지'] }, { t: 'text', k: 'title', label: '제목' }],
    cols: [{ k: 'type', label: '구분', fmt: function (v) { return '<span class="adm-pill ' + (v === '긴급작업공지' ? 'red' : v === '작업공지' ? 'amber' : 'blue') + '">' + aasE(v) + '</span>'; } },
      { k: 'title', label: '제목', b: true }, { k: 'pop', label: '메인팝업' }, { k: 'org', label: '조직' }, { k: 'writer', label: '작성자' }, { k: 'date', label: '등록일', muted: true }, { k: 'views', label: '조회수', num: true }],
    fields: [
      { k: 'type', label: '구분', type: 'select', opts: ['', '공지', '작업공지', '안내', '긴급작업공지'], req: '구분을 선택해 주세요.' },
      { k: 'pop', label: '메인팝업', type: 'select', opts: ['N', 'Y'], def: 'N' },
      { k: 'title', label: '제목', req: '제목을 입력해 주세요.', full: true },
      { k: 'body', label: '내용', type: 'textarea', req: '내용을 입력해 주세요.', full: true },
    ],
    writer: true,
    note: '※ 메인팝업 Y 인 공지는 사용자가 로그인하면 메인 화면에 팝업으로 뜹니다.',
  },
  qna: {
    noun: 'Q&A', ro: true, del: true,
    search: [{ t: 'select', k: 'type', label: '구분', opts: ['수주', '플랫폼', '투자', '인력추정'] }, { t: 'select', k: 'state', label: 'Q&A상태', opts: ['답변예정', '답변완료', '확인 중', '조치 중'] },
      { t: 'text', k: 'title', label: '제목' }, { t: 'text', k: 'writer', label: '작성자' }],
    cols: [{ k: 'type', label: '구분', tag: true }, { k: 'title', label: '제목', b: true }, { k: 'org', label: '조직' }, { k: 'writer', label: '작성자' }, { k: 'date', label: '등록일', muted: true }, { k: 'views', label: '조회수', num: true },
      { k: 'state', label: 'Q&A상태', fmt: function (v, r, i) { return '<button class="adm-pill ' + (v === '답변완료' ? 'green' : v === '답변예정' ? 'red' : 'amber') + ' aas-pillbtn" onclick="event.stopPropagation();aasQnaAnswer(' + i + ')" title="답변 등록">' + aasE(v) + '</button>'; } }],
    note: '※ 질문은 사용자가 Q&A 화면에서 올립니다. 관리자는 상태 칸을 눌러 답변을 등록하고 상태를 바꿉니다.',
  },
  manual: {
    noun: '매뉴얼', add: '＋ 매뉴얼 등록',
    search: [{ t: 'text', k: 'title', label: '화면명' }],
    cols: [{ k: 'type', label: '구분', fmt: function (v) { return '<span class="adm-pill ' + (v === '메인' ? 'green' : 'blue') + '">' + aasE(v) + '</span>'; } },
      { k: 'title', label: '화면명', b: true }, { k: 'remark', label: '화면설명' }, { k: 'org', label: '조직' }, { k: 'writer', label: '작성자' }, { k: 'date', label: '등록일', muted: true }, { k: 'views', label: '조회수', num: true }],
    fields: [
      { k: 'title', label: '화면명', req: '화면명을 입력해 주세요.' },
      { k: 'type', label: '구분', type: 'select', opts: ['매뉴얼', '메인'], def: '매뉴얼' },
      { k: 'remark', label: '화면설명', req: '화면설명을 입력해 주세요.', full: true },
      { k: 'body', label: '내용', type: 'textarea', req: '내용을 입력해 주세요.', full: true },
    ],
    writer: true,
    rowBtns: function (r, i) { return r.type === '메인' ? '' : '<button class="adm-btn sm ghost" onclick="event.stopPropagation();aasManualMain(' + i + ')">메인 등록</button>'; },
    note: '※ [메인 등록]한 매뉴얼은 사용자 메인 화면의 매뉴얼 바로가기에 걸립니다(한 건).',
  },
};

// ── 조회 조건 상태: draft(입력 중) → [조회] 누르면 applied ──
var aasDraft = {}, aasApplied = {}, aasSel = {};
function aasDraftOf(key) { return aasDraft[key] || (aasDraft[key] = { _type: (AAS_SC[key].search || []).filter(function (s) { return s.t === 'radio'; }).map(function (s) { return s.opts[0][1]; })[0] || '' }); }
function aasSetDraft(key, k, v) { aasDraftOf(key)[k] = v; }
function aasSearch(key) {
  aasApplied[key] = JSON.parse(JSON.stringify(aasDraftOf(key)));
  aasSel[key] = null;
  asiteRender();
}
function aasReset(key) { aasDraft[key] = null; aasApplied[key] = null; aasSel[key] = null; asiteRender(); }

function aasMatch(key, r) {
  var sc = AAS_SC[key], q = aasApplied[key];
  if (!q) return true;
  return (sc.search || []).every(function (s) {
    if (s.t === 'radio') { var w = (q._q || '').trim().toLowerCase(); return !w || String(r[q._type] || '').toLowerCase().indexOf(w) >= 0; }
    var v = (q[s.k] || '').trim();
    if (!v) return true;
    if (s.t === 'select') return String(r[s.k]) === v;
    return String(r[s.k] || '').toLowerCase().indexOf(v.toLowerCase()) >= 0;
  });
}

// ── 공통 렌더: 조회 조건 패널 ──
function aasSearchHtml(key) {
  var sc = AAS_SC[key], d = aasDraftOf(key);
  if (!sc.search) return '';
  var parts = sc.search.map(function (s) {
    if (s.t === 'radio') {
      return '<div class="aas-sf aas-sf-radio">' + s.opts.map(function (o) {
        return '<label class="aas-radio"><input type="radio" name="aas-r-' + key + '"' + (d._type === o[1] ? ' checked' : '') + ' onclick="aasSetDraft(\'' + key + '\',\'_type\',\'' + o[1] + '\')"> ' + o[0] + '</label>';
      }).join('') + '<input class="adm-search aas-q" placeholder="검색어" value="' + aasE(d._q || '') + '" oninput="aasSetDraft(\'' + key + '\',\'_q\',this.value)" onkeydown="if(event.key===\'Enter\')aasSearch(\'' + key + '\')"></div>';
    }
    if (s.t === 'select') {
      return '<div class="aas-sf"><label>' + s.label + '</label><select class="adm-filter" onchange="aasSetDraft(\'' + key + '\',\'' + s.k + '\',this.value)"><option value="">전체</option>'
        + s.opts.map(function (o) { return '<option' + (d[s.k] === o ? ' selected' : '') + '>' + aasE(o) + '</option>'; }).join('') + '</select></div>';
    }
    return '<div class="aas-sf"><label>' + s.label + '</label><input class="adm-search" value="' + aasE(d[s.k] || '') + '" oninput="aasSetDraft(\'' + key + '\',\'' + s.k + '\',this.value)" onkeydown="if(event.key===\'Enter\')aasSearch(\'' + key + '\')"></div>';
  }).join('');
  return '<div class="aas-searchbox">' + parts + '<div class="aas-sbtns"><button class="adm-btn" onclick="aasReset(\'' + key + '\')">초기화</button>'
    + '<button class="adm-btn pri" onclick="aasSearch(\'' + key + '\')">조회</button></div></div>';
}

// ── 공통 렌더: 표 ──
function aasCell(c, r, i) {
  var v = r[c.k];
  if (c.fmt) return c.fmt(v, r, i);
  if (c.code) return '<span class="adm-code">' + aasE(v) + '</span>';
  if (c.tag) return v ? '<span class="adm-tag">' + aasE(v) + '</span>' : '';
  if (c.muted) return '<span class="adm-muted">' + aasE(v == null || v === '' ? '-' : v) + '</span>';
  if (c.num) return aasMoney(v);
  if (c.b) return '<b>' + aasE(v) + '</b>';
  return aasE(v == null || v === '' ? '-' : v);
}
// rows: [{r, i}] (i = 원본 인덱스) / opt: { extraBtns, filterFn }
function aasTableHtml(key, opt) {
  opt = opt || {};
  var sc = AAS_SC[key], all = AAS[key] || [];
  var rows = all.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return aasMatch(key, x.r) && (!opt.filterFn || opt.filterFn(x.r)); });
  var manage = !sc.ro || sc.del || sc.rowBtns;
  var heads = '<th class="num">No</th>' + sc.cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + c.label + '</th>'; }).join('') + (manage ? '<th style="text-align:center">관리</th>' : '');
  var ncol = sc.cols.length + 1 + (manage ? 1 : 0);
  var body = rows.length ? rows.map(function (x, n) {
    var on = aasSel[key] === x.i ? ' class="aas-on"' : '';
    var click = sc.detail ? ' onclick="aasPick(\'' + key + '\',' + x.i + ')" style="cursor:pointer"' : '';
    var btns = '';
    if (manage) {
      btns = '<td style="white-space:nowrap;text-align:center">' + (sc.rowBtns ? sc.rowBtns(x.r, x.i) + ' ' : '')
        + (!sc.ro ? '<button class="adm-btn sm" onclick="event.stopPropagation();aasForm(\'' + key + '\',' + x.i + ')">수정</button> ' : '')
        + '<button class="adm-btn sm del" onclick="event.stopPropagation();aasAskDel(\'' + key + '\',' + x.i + ')">삭제</button></td>';
    }
    return '<tr' + on + click + '><td class="num adm-muted">' + (n + 1) + '</td>'
      + sc.cols.map(function (c) { return '<td' + (c.num ? ' class="num"' : '') + '>' + aasCell(c, x.r, x.i) + '</td>'; }).join('') + btns + '</tr>';
  }).join('') : aasEmpty(ncol);
  var bar = '<div class="adm-toolbar aas-bar">'
    + '<span class="aas-cnt">검색결과 <b>' + rows.length + '</b>건 <span class="adm-muted">/ 총 ' + all.length + '건</span></span><span class="aas-sp"></span>'
    + (opt.extraBtns || '')
    + (!sc.ro ? '<button class="adm-btn" onclick="aasSaveAll(\'' + sc.noun + '\')">저장</button><button class="adm-btn pri" onclick="aasForm(\'' + key + '\',null)">' + (sc.add || '＋ 등록') + '</button>' : '')
    + '</div>';
  return bar + '<table class="adm-table aas-table"><thead><tr>' + heads + '</tr></thead><tbody>' + body + '</tbody></table>';
}
function aasDetailHtml(key) {
  var sc = AAS_SC[key], i = aasSel[key];
  if (!sc.detail || i == null || !AAS[key][i]) return '';
  var r = AAS[key][i];
  return '<div class="aas-detail"><div class="aas-detail-h"><b>' + aasE(r.name) + '</b><button class="adm-modal-x" onclick="aasPick(\'' + key + '\',null)" title="상세 닫기">✕</button></div>'
    + '<div class="aas-dl">' + sc.detail.map(function (d) {
      var v = r[d[1]]; v = d[2] ? d[2](v) : v;
      return '<div class="aas-dt">' + d[0] + '</div><div class="aas-dd">' + aasE(v == null || v === '' ? '-' : v) + '</div>';
    }).join('') + '</div></div>';
}
function aasPick(key, i) { aasSel[key] = (i == null || aasSel[key] === i) ? null : i; asiteRender(); }

// 기본 화면 = 조회 조건 + (표 | 표 + 상세)
function aasStdHtml(key, opt) {
  var sc = AAS_SC[key];
  var det = aasDetailHtml(key);
  var table = aasTableHtml(key, opt);
  return aasSearchHtml(key)
    + (det ? '<div class="aas-split aas-split-detail"><div class="aas-main aas-scroll">' + table.replace('aas-table"', 'aas-table aas-nowrap"') + '</div>' + det + '</div>' : table)
    + (sc.note ? '<div class="adm-note">' + sc.note + '</div>' : '');
}

// ── 공통 등록/수정/삭제 ──
function aasForm(key, i) {
  var sc = AAS_SC[key];
  i = (i == null || i === 'null') ? null : Number(i);
  var r = i != null ? AAS[key][i] : {};
  var body = sc.fields.map(function (f) {
    var v = r[f.k] != null ? r[f.k] : (f.def != null ? f.def : '');
    var inp;
    if (f.type === 'select') inp = '<select id="aas-f-' + f.k + '">' + f.opts.map(function (o) { return '<option value="' + aasE(o) + '"' + (String(o) === String(v) ? ' selected' : '') + '>' + (o === '' ? '선택' : aasE(o)) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'textarea') inp = '<textarea id="aas-f-' + f.k + '" rows="5">' + aasE(v) + '</textarea>';
    else inp = '<input id="aas-f-' + f.k + '" value="' + aasE(v) + '">';
    return '<div class="adm-field' + (f.full ? ' full' : '') + '"><label>' + f.label + (f.req ? '<span class="req">*</span>' : '') + '</label>' + inp + '</div>';
  }).join('');
  admModal('<div class="adm-modal wide">'
    + '<div class="adm-modal-head"><b>' + sc.noun + (i != null ? ' 수정' : ' 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">' + body + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="aasFormSave(\'' + key + '\',' + (i != null ? i : 'null') + ')">' + (i != null ? '수정' : '등록') + '</button></div></div>');
}
function aasFormSave(key, i) {
  var sc = AAS_SC[key];
  i = (i == null || i === 'null') ? null : Number(i);
  var o = i != null ? JSON.parse(JSON.stringify(AAS[key][i])) : {};
  for (var n = 0; n < sc.fields.length; n++) {
    var f = sc.fields[n], el = document.getElementById('aas-f-' + f.k);
    if (!el) continue;
    var v = String(el.value).trim();
    if (f.req && !v) { admToast(f.req); el.focus(); return; }
    if (f.valid && v && !f.valid.test(v)) { admToast(f.validMsg); el.focus(); return; }
    o[f.k] = v;
  }
  if (sc.stamp) { o.mod = aasNow(); if (i == null) o.reg = o.mod; }
  if (sc.writer && i == null) { o.org = '데이터플랫폼팀'; o.writer = '관리자'; o.date = aasToday(); o.views = 0; }
  if (i != null) AAS[key][i] = o; else AAS[key].unshift(o);
  aasPersist(); admCloseModal(); asiteRender();
  admToast(sc.noun + (i != null ? '을(를) 수정했습니다.' : '을(를) 등록했습니다.'));
}
function aasConfirm(title, msg, okLabel, okCall) {
  admModal('<div class="adm-modal" style="width:420px">'
    + '<div class="adm-modal-head"><b>' + title + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-confirm">' + msg + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri aas-danger" onclick="' + okCall + '">' + okLabel + '</button></div></div>');
}
function aasAskDel(key, i) {
  var r = AAS[key][i]; if (!r) return;
  aasConfirm('삭제 확인', '<b>' + aasE(r.title || r.name || r.ip || ('항목 ' + (i + 1))) + '</b> 을(를) 삭제하시겠습니까?<br><span class="adm-muted">삭제 후에는 되돌릴 수 없습니다.</span>', '삭제', 'aasDel(\'' + key + '\',' + i + ')');
}
function aasDel(key, i) {
  AAS[key].splice(i, 1);
  if (aasSel[key] === i) aasSel[key] = null;
  aasPersist(); admCloseModal(); asiteRender(); admToast('삭제했습니다.');
}
function aasSaveAll(noun) { aasPersist(); admToast((noun || '') + ' 변경 내용을 저장했습니다.'); }

// ════ ① 구성원 조회 — 왼쪽 조직 + 오른쪽 구성원 ════
var aasMemberOrg = '전체';
function aasMemberOrgPick(name) { aasMemberOrg = name; asiteRender(); }
function aasMemberHtml() {
  var orgs = AAS.memberOrg.map(function (o) {
    var cnt = AAS.member.filter(function (m) { return aasMemberInOrg(m, o.name); }).length;
    return '<button class="aas-tree-i lv' + o.lv + (aasMemberOrg === o.name ? ' on' : '') + '" onclick="aasMemberOrgPick(\'' + aasE(o.name) + '\')">'
      + aasE(o.name) + ' <span class="adm-muted">' + cnt + '</span></button>';
  }).join('');
  return aasSearchHtml('member')
    + '<div class="aas-split"><div class="aas-side"><div class="aas-side-h">조직</div>' + orgs + '</div>'
    + '<div class="aas-main">' + aasTableHtml('member', { filterFn: function (m) { return aasMemberInOrg(m, aasMemberOrg); } }) + '</div></div>'
    + '<div class="adm-note">' + AAS_SC.member.note + '</div>';
}
function aasMemberInOrg(m, org) {
  if (org === '전체') return true;
  if (m.dept === org) return true;
  var d = AAS.memberOrg.find(function (o) { return o.name === m.dept; });
  return !!(d && d.up === org);
}

// ════ ② SG&A 조직 관리 — 트리 표(접기/펼치기) ════
var aasSgnaSel = null, aasSgnaFold = {};
function aasSgnaKids(pid) { return AAS.sgna.filter(function (o) { return String(o.parent) === String(pid); }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }); }
function aasSgnaOrder() {
  var out = [];
  (function walk(pid, hidden) {
    aasSgnaKids(pid).forEach(function (o) { if (!hidden) out.push(o); walk(o.id, hidden || aasSgnaFold[o.id]); });
  })('', false);
  return out;
}
function aasSgnaHtml() {
  var q = aasApplied.sgna, w = q && (q._q || '').trim().toLowerCase();
  var list = w ? AAS.sgna.filter(function (o) { return String(o[q._type] || '').toLowerCase().indexOf(w) >= 0; }) : aasSgnaOrder();
  var cols = ['ID', '조직명', 'CC조직 코드', '실제 조직 코드', '조직 약어 명', '조직 영문 명', '조직 시작 일자', '조직 종료 일자', '상위 조직 ID', '조직단계', '조직 정렬 ID'];
  var body = list.length ? list.map(function (o) {
    var kids = aasSgnaKids(o.id).length;
    var tog = kids ? '<button class="aas-fold" onclick="event.stopPropagation();aasSgnaToggle(' + o.id + ')">' + (aasSgnaFold[o.id] ? '▸' : '▾') + '</button>' : '<span class="aas-fold-sp"></span>';
    var ended = o.end && o.end < aasToday();
    return '<tr class="' + (aasSgnaSel === o.id ? 'aas-on' : '') + (ended ? ' aas-ended' : '') + '" onclick="aasSgnaPick(' + o.id + ')" style="cursor:pointer">'
      + '<td class="num adm-muted">' + o.id + '</td>'
      + '<td><span style="padding-left:' + (w ? 0 : (o.phase - 1) * 18) + 'px">' + tog + '<b>' + aasE(o.name) + '</b></span>' + (ended ? ' <span class="adm-pill gray">종료</span>' : '') + '</td>'
      + '<td class="adm-code">' + aasE(o.cc) + '</td><td class="adm-code">' + aasE(o.real) + '</td><td>' + aasE(o.abbr) + '</td><td class="adm-muted">' + aasE(o.eng) + '</td>'
      + '<td class="adm-muted">' + aasE(o.start) + '</td><td class="adm-muted">' + aasE(o.end) + '</td><td class="num">' + aasE(o.parent || '-') + '</td>'
      + '<td class="num">' + o.phase + '</td><td class="num">' + aasE(o.sort) + '</td></tr>';
  }).join('') : aasEmpty(cols.length);
  var selName = aasSgnaSel != null ? ((AAS.sgna.find(function (o) { return o.id === aasSgnaSel; }) || {}).name || '') : '';
  return aasSearchHtml('sgna')
    + '<div class="adm-toolbar aas-bar"><button class="adm-btn sm ghost" onclick="aasSgnaFoldAll(true)">모두 접기</button><button class="adm-btn sm ghost" onclick="aasSgnaFoldAll(false)">모두 펼침</button>'
    + '<span class="aas-cnt">' + (selName ? '선택: <b>' + aasE(selName) + '</b>' : '<span class="adm-muted">조직을 누르면 선택됩니다</span>') + '</span><span class="aas-sp"></span>'
    + '<button class="adm-btn" onclick="aasSgnaForm(\'top\')">＋ 최상위 조직 등록</button>'
    + '<button class="adm-btn" onclick="aasSgnaForm(\'child\')">＋ 하위 조직 등록</button>'
    + '<button class="adm-btn" onclick="aasSgnaForm(\'edit\')">수정</button>'
    + '<button class="adm-btn del" onclick="aasSgnaAskDel()">삭제</button>'
    + '<button class="adm-btn pri" onclick="aasSaveAll(\'SG&A 조직\')">저장</button></div>'
    + '<div class="aas-scroll"><table class="adm-table aas-table aas-nowrap"><thead><tr>' + cols.map(function (c, n) { return '<th' + (n === 0 || n >= 8 ? ' class="num"' : '') + '>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>'
    + '<div class="adm-note">※ SG&A(판매비와 관리비) 집계용 조직 트리입니다. HR 조직과 별도로 관리합니다. 종료 일자가 지난 조직은 회색으로 보입니다.</div>';
}
AAS_SC.sgna = { noun: 'SG&A 조직', search: [{ t: 'radio', opts: [['조직명', 'name'], ['조직영문명', 'eng'], ['조직별칭', 'abbr']] }], cols: [] };
function aasSgnaPick(id) { aasSgnaSel = aasSgnaSel === id ? null : id; asiteRender(); }
function aasSgnaToggle(id) { aasSgnaFold[id] = !aasSgnaFold[id]; asiteRender(); }
function aasSgnaFoldAll(fold) { aasSgnaFold = {}; if (fold) AAS.sgna.forEach(function (o) { if (aasSgnaKids(o.id).length) aasSgnaFold[o.id] = true; }); asiteRender(); }
function aasSgnaForm(mode) {
  var sel = AAS.sgna.find(function (o) { return o.id === aasSgnaSel; });
  if ((mode === 'child' || mode === 'edit') && !sel) { admToast(mode === 'child' ? '상위 조직을 먼저 선택해 주세요.' : '수정할 조직을 선택해 주세요.'); return; }
  var r = mode === 'edit' ? sel : { start: aasToday(), end: '9999-12-31' };
  var F = [['name', '조직명', 1], ['cc', 'CC조직 코드', 1], ['real', '실제 조직 코드'], ['abbr', '조직 약어 명'], ['eng', '조직 영문 명'], ['sort', '조직 정렬 ID'], ['start', '조직 시작 일자'], ['end', '조직 종료 일자']];
  var up = mode === 'top' ? '최상위' : mode === 'child' ? sel.name : (r.parent ? (AAS.sgna.find(function (o) { return o.id === r.parent; }) || {}).name : '최상위');
  admModal('<div class="adm-modal wide"><div class="adm-modal-head"><b>' + (mode === 'edit' ? 'SG&A 조직 수정' : 'SG&A 조직 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form"><div class="adm-field full"><label>상위 조직</label><input value="' + aasE(up) + '" readonly></div>'
    + F.map(function (f) { return '<div class="adm-field"><label>' + f[1] + (f[2] ? '<span class="req">*</span>' : '') + '</label><input id="aas-sg-' + f[0] + '" ' + (f[0] === 'start' || f[0] === 'end' ? 'type="date" ' : '') + 'value="' + aasE(r[f[0]] == null ? '' : r[f[0]]) + '"></div>'; }).join('')
    + '</div><div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasSgnaSave(\'' + mode + '\')">' + (mode === 'edit' ? '수정' : '등록') + '</button></div></div>');
}
function aasSgnaSave(mode) {
  var g = function (k) { var el = document.getElementById('aas-sg-' + k); return el ? el.value.trim() : ''; };
  if (!g('name')) { admToast('조직명을 입력해 주세요.'); return; }
  if (!g('cc')) { admToast('CC조직 코드를 입력해 주세요.'); return; }
  var sel = AAS.sgna.find(function (o) { return o.id === aasSgnaSel; });
  var o = mode === 'edit' ? sel : { id: Math.max.apply(null, AAS.sgna.map(function (x) { return x.id; }).concat([0])) + 1, parent: mode === 'child' ? sel.id : '', phase: mode === 'child' ? sel.phase + 1 : 1 };
  ['name', 'cc', 'real', 'abbr', 'eng', 'start', 'end'].forEach(function (k) { o[k] = g(k); });
  o.sort = Number(g('sort')) || (aasSgnaKids(o.parent).length + (mode === 'edit' ? 0 : 1));
  if (mode !== 'edit') { AAS.sgna.push(o); if (mode === 'child') aasSgnaFold[sel.id] = false; aasSgnaSel = o.id; }
  aasPersist(); admCloseModal(); asiteRender(); admToast('SG&A 조직을 ' + (mode === 'edit' ? '수정' : '등록') + '했습니다.');
}
function aasSgnaAskDel() {
  var sel = AAS.sgna.find(function (o) { return o.id === aasSgnaSel; });
  if (!sel) { admToast('삭제할 데이터를 선택해 주세요.'); return; }
  var n = 0; (function cnt(id) { aasSgnaKids(id).forEach(function (k) { n++; cnt(k.id); }); })(sel.id);
  aasConfirm('삭제 확인', '<b>' + aasE(sel.name) + '</b> 을(를) 삭제하시겠습니까?' + (n ? '<br><span style="color:#c40025">하위 조직 ' + n + '개도 함께 삭제됩니다.</span>' : ''), '삭제', 'aasSgnaDel()');
}
function aasSgnaDel() {
  var ids = [aasSgnaSel]; (function c(id) { aasSgnaKids(id).forEach(function (k) { ids.push(k.id); c(k.id); }); })(aasSgnaSel);
  AAS.sgna = AAS.sgna.filter(function (o) { return ids.indexOf(o.id) < 0; });
  aasSgnaSel = null; aasPersist(); admCloseModal(); asiteRender(); admToast('삭제했습니다.');
}

// ════ ③ 사용자 그룹 관리 — 왼쪽 그룹 + 오른쪽 그룹 멤버 ════
var aasUgSel = null, aasUgChk = {};
function aasUgHtml() {
  if (aasUgSel == null && AAS.ugroup.length) aasUgSel = AAS.ugroup[0].id;
  var g = AAS.ugroup.find(function (x) { return x.id === aasUgSel; });
  var left = AAS.ugroup.length ? AAS.ugroup.map(function (x, n) {
    return '<tr class="' + (x.id === aasUgSel ? 'aas-on' : '') + '" onclick="aasUgPick(' + x.id + ')" style="cursor:pointer"><td class="num adm-muted">' + (n + 1) + '</td>'
      + '<td><span class="adm-pill ' + (x.type === '공용 그룹' ? 'blue' : 'gray') + '">' + aasE(x.type) + '</span></td><td><b>' + aasE(x.name) + '</b></td>'
      + '<td class="adm-muted">' + aasE(x.note || '-') + '</td><td>' + aasE(x.owner) + '</td></tr>';
  }).join('') : aasEmpty(5, '사용자 그룹이 없습니다.');
  var mem = g ? g.members.map(function (emp, n) {
    var m = AAS.member.find(function (x) { return x.emp === emp; }) || { emp: emp, name: '-', dept: '-' };
    return '<tr><td style="text-align:center"><input type="checkbox"' + (aasUgChk[emp] ? ' checked' : '') + ' onclick="aasUgCheck(\'' + emp + '\',this.checked)"></td><td class="num adm-muted">' + (n + 1) + '</td>'
      + '<td class="adm-code">' + aasE(m.emp) + '</td><td><b>' + aasE(m.name) + '</b></td><td>' + aasE(m.dept) + '</td></tr>';
  }).join('') : '';
  return '<div class="aas-split aas-split-half">'
    + '<div class="aas-main"><div class="adm-toolbar aas-bar"><span class="aas-cnt"><b>사용자 그룹</b> <span class="adm-muted">' + AAS.ugroup.length + '건</span></span><span class="aas-sp"></span>'
    + '<button class="adm-btn sm" onclick="aasUgForm(null)">＋ 그룹 등록</button><button class="adm-btn sm" onclick="aasUgForm(aasUgSel)">수정</button>'
    + '<button class="adm-btn sm del" onclick="aasUgAskDel()">그룹 삭제</button><button class="adm-btn sm pri" onclick="aasSaveAll(\'사용자 그룹\')">그룹 저장</button></div>'
    + '<table class="adm-table aas-table"><thead><tr><th class="num">No.</th><th>그룹 유형</th><th>그룹 명</th><th>그룹 설명</th><th>생성자</th></tr></thead><tbody>' + left + '</tbody></table></div>'
    + '<div class="aas-main"><div class="adm-toolbar aas-bar"><span class="aas-cnt"><b>' + (g ? aasE(g.name) : '그룹 멤버') + '</b> <span class="adm-muted">' + (g ? g.members.length + '명' : '') + '</span></span><span class="aas-sp"></span>'
    + '<button class="adm-btn sm" onclick="aasUgAddMember()">＋ 사용자 추가</button><button class="adm-btn sm del" onclick="aasUgDelMember()">사용자 삭제</button>'
    + '<button class="adm-btn sm pri" onclick="aasSaveAll(\'사용자 목록\')">사용자 목록 저장</button></div>'
    + '<table class="adm-table aas-table"><thead><tr><th style="width:34px"></th><th class="num">No.</th><th>사번</th><th>이름</th><th>조직</th></tr></thead><tbody>'
    + (g ? (mem || aasEmpty(5, '멤버가 없습니다. [＋ 사용자 추가]로 넣으세요.')) : aasEmpty(5, '사용자그룹을 선택해 주세요.')) + '</tbody></table></div></div>'
    + '<div class="adm-note">※ 공용 그룹은 메일 수신자 · 결재 협조 대상 등에서 한 번에 고를 때 씁니다. 개인 그룹은 만든 사람만 씁니다.</div>';
}
function aasUgPick(id) { aasUgSel = id; aasUgChk = {}; asiteRender(); }
function aasUgCheck(emp, on) { aasUgChk[emp] = on; }
function aasUgForm(id) {
  var g = id != null ? AAS.ugroup.find(function (x) { return x.id === id; }) : null;
  if (id != null && !g) { admToast('사용자그룹을 선택해 주세요.'); return; }
  g = g || { type: '공용 그룹', name: '', note: '' };
  admModal('<div class="adm-modal"><div class="adm-modal-head"><b>' + (id != null ? '사용자 그룹 수정' : '사용자 그룹 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form"><div class="adm-field"><label>그룹 유형</label><select id="aas-ug-type">' + ['공용 그룹', '개인 그룹'].map(function (t) { return '<option' + (t === g.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>'
    + '<div class="adm-field"><label>그룹 명<span class="req">*</span></label><input id="aas-ug-name" value="' + aasE(g.name) + '"></div>'
    + '<div class="adm-field full"><label>그룹 설명</label><input id="aas-ug-note" value="' + aasE(g.note) + '"></div></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasUgSave(' + (id != null ? id : 'null') + ')">' + (id != null ? '수정' : '등록') + '</button></div></div>');
}
function aasUgSave(id) {
  var name = document.getElementById('aas-ug-name').value.trim();
  if (!name) { admToast('그룹 명을 입력해 주세요.'); return; }
  var g = id != null ? AAS.ugroup.find(function (x) { return x.id === id; }) : { id: Math.max.apply(null, AAS.ugroup.map(function (x) { return x.id; }).concat([0])) + 1, owner: '관리자', members: [] };
  g.type = document.getElementById('aas-ug-type').value; g.name = name; g.note = document.getElementById('aas-ug-note').value.trim();
  if (id == null) { AAS.ugroup.push(g); aasUgSel = g.id; }
  aasPersist(); admCloseModal(); asiteRender(); admToast('사용자 그룹을 ' + (id != null ? '수정' : '등록') + '했습니다.');
}
function aasUgAskDel() {
  var g = AAS.ugroup.find(function (x) { return x.id === aasUgSel; });
  if (!g) { admToast('사용자그룹을 선택해 주세요.'); return; }
  aasConfirm('사용자 그룹 삭제', '<b>' + aasE(g.name) + '</b> 그룹을 삭제하시겠습니까?<br><span class="adm-muted">멤버 ' + g.members.length + '명의 그룹 연결도 함께 지워집니다.</span>', '삭제', 'aasUgDel()');
}
function aasUgDel() { AAS.ugroup = AAS.ugroup.filter(function (x) { return x.id !== aasUgSel; }); aasUgSel = null; aasPersist(); admCloseModal(); asiteRender(); admToast('사용자 그룹을 삭제했습니다.'); }
function aasUgAddMember() {
  var g = AAS.ugroup.find(function (x) { return x.id === aasUgSel; });
  if (!g) { admToast('사용자그룹을 선택해 주세요.'); return; }
  var cand = AAS.member.filter(function (m) { return g.members.indexOf(m.emp) < 0; });
  admModal('<div class="adm-modal"><div class="adm-modal-head"><b>사용자 추가 — ' + aasE(g.name) + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-pick">' + (cand.length ? cand.map(function (m) {
      return '<label class="aas-pick-i"><input type="checkbox" value="' + m.emp + '" class="aas-ug-cand"> <b>' + aasE(m.name) + '</b> <span class="adm-code">' + m.emp + '</span> <span class="adm-muted">' + aasE(m.dept) + '</span></label>';
    }).join('') : '<div class="aas-empty">추가할 구성원이 없습니다.</div>') + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasUgAddMemberSave()">추가</button></div></div>');
}
function aasUgAddMemberSave() {
  var g = AAS.ugroup.find(function (x) { return x.id === aasUgSel; });
  var pick = Array.prototype.slice.call(document.querySelectorAll('.aas-ug-cand:checked')).map(function (el) { return el.value; });
  if (!pick.length) { admToast('추가할 사용자를 선택해 주세요.'); return; }
  g.members = g.members.concat(pick);
  aasPersist(); admCloseModal(); asiteRender(); admToast(pick.length + '명을 추가했습니다. [사용자 목록 저장]으로 확정하세요.');
}
function aasUgDelMember() {
  var g = AAS.ugroup.find(function (x) { return x.id === aasUgSel; });
  var del = Object.keys(aasUgChk).filter(function (k) { return aasUgChk[k]; });
  if (!g || !del.length) { admToast('삭제할 사용자를 선택해 주세요.'); return; }
  g.members = g.members.filter(function (e) { return del.indexOf(e) < 0; });
  aasUgChk = {}; aasPersist(); asiteRender(); admToast(del.length + '명을 그룹에서 뺐습니다.');
}

// ════ ④ IP접근제어 — 운영모드 전환 · 엑셀 업로드 ════
function aasIpHtml() {
  return aasStdHtml('ip', { extraBtns: '<button class="adm-btn" onclick="aasIpUpload()">⬆ 엑셀 업로드</button>' })
    .replace('<div class="aas-searchbox">', '<div class="aas-modebar"><span>운영모드(긴급)</span><span class="adm-muted">장애 · 보안 사고 때 등록 IP 외 접속을 막습니다.</span><span class="aas-sp"></span>'
      + '<button class="adm-btn aas-danger-o" onclick="aasIpMode()">운영모드 전환</button></div><div class="aas-searchbox">');
}
function aasIpUpload() {
  admModal('<div class="adm-modal"><div class="adm-modal-head"><b>IP 엑셀 업로드</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-confirm">엑셀 칸 순서: <b>IP 주소 · IP 소유자 사번 · 등록자 사번</b><br><input type="file" accept=".xlsx,.xls,.csv" style="margin-top:12px"><br>'
    + '<span class="adm-muted">업로드하면 IP 형식 · 사번을 검사(데이터 검사)한 뒤 목록에 더합니다. (목업: 실제 파일은 읽지 않음)</span></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="admCloseModal();admToast(\'목업: 엑셀 업로드는 동작하지 않습니다.\')">업로드</button></div></div>');
}
function aasIpMode() {
  aasConfirm('운영모드 전환', '운영모드 전환 하시겠습니까?<br><b style="color:#c40025">접속된 모든 사용자가 로그아웃 됩니다.</b>', '전환', 'aasIpMode2()');
}
function aasIpMode2() {
  aasConfirm('한 번 더 확인', '한번 더 체크 합니다.<br>정말로 운영모드 전환 하시겠습니까?<br><b style="color:#c40025">접속된 모든 사용자가 로그아웃 됩니다.</b>', '운영모드 전환', 'admCloseModal();admToast(\'운영모드로 전환했습니다. (목업: 실제 로그아웃 없음)\')');
}

// ════ ⑤ 게시판 관리 — 공지사항 · Q&A · 매뉴얼 탭 ════
var aasBoardTab = 'notice';
var AAS_BOARD_TABS = [['notice', '공지사항'], ['qna', 'Q&A'], ['manual', '매뉴얼']];
function aasBoardGo(t) { aasBoardTab = t; asiteRender(); }
function aasBoardHtml() {
  return '<div class="aas-tabs">' + AAS_BOARD_TABS.map(function (t) {
    return '<button class="aas-tab' + (aasBoardTab === t[0] ? ' on' : '') + '" onclick="aasBoardGo(\'' + t[0] + '\')">' + t[1] + ' <span class="adm-muted">' + AAS[t[0]].length + '</span></button>';
  }).join('') + '</div>' + aasStdHtml(aasBoardTab);
}
function aasQnaAnswer(i) {
  var r = AAS.qna[i]; if (!r) return;
  admModal('<div class="adm-modal wide"><div class="adm-modal-head"><b>답변 등록</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-qa"><div class="aas-qa-t"><span class="adm-tag">' + aasE(r.type) + '</span> <b>' + aasE(r.title) + '</b></div>'
    + '<div class="adm-muted">' + aasE(r.org) + ' · ' + aasE(r.writer) + ' · ' + aasE(r.date) + '</div><div class="aas-qa-q">' + aasE(r.q) + '</div></div>'
    + '<div class="adm-form"><div class="adm-field"><label>Q&A상태</label><select id="aas-qa-st">' + ['답변완료', '확인 중', '조치 중'].map(function (s) { return '<option' + (s === (r.state === '답변예정' ? '답변완료' : r.state) ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>'
    + '<div class="adm-field full"><label>답변<span class="req">*</span></label><textarea id="aas-qa-a" rows="5">' + aasE(r.a) + '</textarea></div></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasQnaSave(' + i + ')">답변 등록</button></div></div>');
}
function aasQnaSave(i) {
  var a = document.getElementById('aas-qa-a').value.trim();
  if (!a) { admToast('내용을 입력해 주세요.'); return; }
  AAS.qna[i].a = a; AAS.qna[i].state = document.getElementById('aas-qa-st').value;
  aasPersist(); admCloseModal(); asiteRender(); admToast('답변을 등록했습니다.');
}
function aasManualMain(i) {
  AAS.manual.forEach(function (r, n) { r.type = n === i ? '메인' : '매뉴얼'; });
  aasPersist(); asiteRender(); admToast('「' + AAS.manual[i].title + '」을(를) 메인 매뉴얼로 등록했습니다.');
}

// ════ ⑥ 첨부파일 관리 — 왼쪽 폴더 + 오른쪽 파일 ════
var aasFolderSel = null;
function aasFolderPath(id) {
  var p = [], f = AAS.folder.find(function (x) { return x.id === id; });
  while (f) { p.unshift(f.name); var up = f.up; f = AAS.folder.find(function (x) { return x.id === up; }); }
  return '/' + p.join('/');
}
function aasFolderUnder(fid, root) { var f = AAS.folder.find(function (x) { return x.id === fid; }); while (f) { if (f.id === root) return true; var up = f.up; f = AAS.folder.find(function (x) { return x.id === up; }); } return false; }
function aasFileHtml() {
  var tree = [];
  (function walk(up, lv) { AAS.folder.filter(function (f) { return f.up === up; }).forEach(function (f) { tree.push({ f: f, lv: lv }); walk(f.id, lv + 1); }); })(0, 0);
  var side = '<button class="aas-tree-i lv0' + (aasFolderSel == null ? ' on' : '') + '" onclick="aasFolderPick(null)">전체 <span class="adm-muted">' + AAS.file.length + '</span></button>'
    + tree.map(function (t) {
      var cnt = AAS.file.filter(function (x) { return aasFolderUnder(x.folder, t.f.id); }).length;
      return '<button class="aas-tree-i lv' + (t.lv + 1) + (aasFolderSel === t.f.id ? ' on' : '') + '" onclick="aasFolderPick(' + t.f.id + ')">📁 ' + aasE(t.f.name) + ' <span class="adm-muted">' + cnt + '</span></button>';
    }).join('');
  var q = aasApplied.file, w = q && (q.name || '').trim().toLowerCase();
  var rows = AAS.file.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) {
    return (aasFolderSel == null || aasFolderUnder(x.r.folder, aasFolderSel)) && (!w || x.r.name.toLowerCase().indexOf(w) >= 0);
  });
  var body = rows.length ? rows.map(function (x, n) {
    return '<tr><td class="num adm-muted">' + (n + 1) + '</td><td class="adm-code">' + aasE(aasFolderPath(x.r.folder)) + '</td><td><b>' + aasE(x.r.name) + '</b></td>'
      + '<td class="adm-muted">' + aasE(x.r.date) + '</td><td style="white-space:nowrap;text-align:center"><button class="adm-btn sm" onclick="aasFileDetail(' + x.i + ')">상세 조회</button> '
      + '<button class="adm-btn sm ghost" onclick="aasFileDown(' + x.i + ')">⬇ 다운로드</button> <button class="adm-btn sm del" onclick="aasAskDel(\'file\',' + x.i + ')">삭제</button></td></tr>';
  }).join('') : aasEmpty(5);
  return aasSearchHtml('file')
    + '<div class="aas-split"><div class="aas-side"><div class="aas-side-h">폴더</div>' + side
    + '<div class="aas-side-btns"><button class="adm-btn sm" onclick="aasFolderForm(0)">＋ 상위 폴더</button><button class="adm-btn sm" onclick="aasFolderForm(aasFolderSel)">＋ 하위 폴더</button></div></div>'
    + '<div class="aas-main"><div class="adm-toolbar aas-bar"><span class="aas-cnt">검색결과 <b>' + rows.length + '</b>건 <span class="adm-muted">/ 총 ' + AAS.file.length + '건</span></span><span class="aas-sp"></span>'
    + '<button class="adm-btn" onclick="aasSaveAll(\'첨부파일\')">저장</button><button class="adm-btn pri" onclick="aasFileUpload()">⬆ 파일 업로드</button></div>'
    + '<table class="adm-table aas-table"><thead><tr><th class="num">No.</th><th>폴더경로</th><th>파일명</th><th>등록일</th><th style="text-align:center">관리</th></tr></thead><tbody>' + body + '</tbody></table></div></div>'
    + '<div class="adm-note">※ 공지 · 매뉴얼 · 결재 첨부 등 시스템에 올라온 파일을 폴더별로 봅니다. 폴더 이름의 공백은 지우고 저장됩니다.</div>';
}
AAS_SC.file = { noun: '첨부파일', search: [{ t: 'text', k: 'name', label: '파일명' }], cols: [] };
function aasFolderPick(id) { aasFolderSel = id; asiteRender(); }
function aasFolderForm(up) {
  if (up == null) { admToast('하위 폴더를 만들 폴더를 먼저 선택해 주세요.'); return; }
  admModal('<div class="adm-modal" style="width:420px"><div class="adm-modal-head"><b>' + (up ? '하위 폴더 등록 — ' + aasE(aasFolderPath(up)) : '상위 폴더 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form"><div class="adm-field full"><label>폴더명<span class="req">*</span></label><input id="aas-fd-name" placeholder="영문 · 숫자 권장"></div></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasFolderSave(' + up + ')">등록</button></div></div>');
}
function aasFolderSave(up) {
  var n = document.getElementById('aas-fd-name').value.replace(/\s+/g, '');
  if (!n) { admToast('폴더명을 입력해 주세요.'); return; }
  var id = Math.max.apply(null, AAS.folder.map(function (f) { return f.id; }).concat([0])) + 1;
  AAS.folder.push({ id: id, name: n, up: up || 0 }); aasFolderSel = id;
  aasPersist(); admCloseModal(); asiteRender(); admToast('폴더를 등록했습니다.');
}
function aasFileDetail(i) {
  var r = AAS.file[i]; if (!r) return;
  var D = [['파일명', r.name], ['실제파일명', r.real], ['파일크기', aasSize(r.size)], ['확장자', r.ext], ['폴더경로', aasFolderPath(r.folder)], ['업로드일자', r.date], ['다운로드URL', '/files/download/' + r.real]];
  admModal('<div class="adm-modal"><div class="adm-modal-head"><b>첨부파일 상세</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-dl aas-dl-pop">' + D.map(function (d) { return '<div class="aas-dt">' + d[0] + '</div><div class="aas-dd">' + aasE(d[1]) + '</div>'; }).join('') + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="aasFileDown(' + i + ')">⬇ 다운로드</button><button class="adm-btn pri" onclick="admCloseModal()">닫기</button></div></div>');
}
function aasFileDown(i) { var r = AAS.file[i]; if (r) admToast('목업: 「' + r.name + '」 다운로드는 동작하지 않습니다.'); }
function aasFileUpload() {
  var fid = aasFolderSel || (AAS.folder[0] && AAS.folder[0].id);
  admModal('<div class="adm-modal"><div class="adm-modal-head"><b>첨부파일 업로드</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-confirm">파일 선택 후, [업로드]를 클릭하세요.<br>올릴 폴더: <b>' + aasE(aasFolderPath(fid)) + '</b><br><input type="file" id="aas-up-file" style="margin-top:12px"></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="aasFileUploadSave(' + fid + ')">업로드</button></div></div>');
}
function aasFileUploadSave(fid) {
  var el = document.getElementById('aas-up-file'), f = el && el.files && el.files[0];
  if (!f) { admToast('업로드할 파일을 선택해 주세요.'); return; }
  var ext = (f.name.split('.').pop() || '').toLowerCase();
  AAS.file.unshift({ folder: fid, name: f.name, real: Math.random().toString(16).slice(2, 10) + '.' + ext, size: f.size, ext: ext, date: aasNow() });
  aasPersist(); admCloseModal(); asiteRender(); admToast('「' + f.name + '」을(를) 업로드했습니다. (목업: 이름 · 크기만 기록)');
}

// ════ ⑦ 조직도 — AS-IS(OrganizationManagement.vue)처럼 조회 전용 ════
// 수진 admin.js 의 admOrgHtml(등록/수정/삭제)을 AAS_RENDER.org 로 덮는다. 데이터(ADM.org)는 그대로 쓰고
// AS-IS 칸(조직영문명 · 조직별칭)은 이름으로 붙인다(AAS_ORG_EXTRA).
var AAS_ORG_EXTRA = {
  'AX 사업본부':      { eng: 'AX Business Division',  alias: 'AX본부' },
  'AX ERP사업부':     { eng: 'AX ERP Business Unit',  alias: 'ERP사업부' },
  'AX ERP사업부 1팀': { eng: 'AX ERP Team 1',         alias: 'ERP1팀' },
  'AX ERP사업부 2팀': { eng: 'AX ERP Team 2',         alias: 'ERP2팀' },
  '데이터사업부':      { eng: 'Data Business Unit',    alias: '데이터BU' },
  '데이터플랫폼팀':    { eng: 'Data Platform Team',    alias: '데이터PF팀' },
  '(전사)IT운영팀':    { eng: 'IT Operation Team',     alias: 'IT운영' },
};
AAS_SC.org = { noun: '조직', search: [{ t: 'radio', opts: [['조직명', 'name'], ['조직영문명', 'eng'], ['조직별칭', 'alias']] }], cols: [] };
function aasOrgHtml() {
  var all = ((typeof ADM !== 'undefined' && ADM.org) || []).map(function (o) {
    var x = AAS_ORG_EXTRA[o.name] || {};
    return { name: o.name, lv: o.lv || 0, eng: x.eng || '-', alias: x.alias || '-' };
  });
  var q = aasApplied.org, w = q && (q._q || '').trim().toLowerCase();
  var rows = w ? all.filter(function (o) { return String(o[q._type] || '').toLowerCase().indexOf(w) >= 0; }) : all;
  var body = rows.length ? rows.map(function (o) {
    return '<tr><td><span style="padding-left:' + (w ? 0 : o.lv * 20) + 'px">' + (o.lv === 0 ? '🏢 ' : o.lv === 1 ? '📂 ' : '👥 ') + '<b>' + aasE(o.name) + '</b></span></td>'
      + '<td class="adm-muted">' + aasE(o.eng) + '</td><td>' + aasE(o.alias) + '</td></tr>';
  }).join('') : aasEmpty(3);
  return aasSearchHtml('org')
    + '<div class="adm-toolbar aas-bar"><span class="aas-cnt">검색결과 <b>' + rows.length + '</b>건 <span class="adm-muted">/ 총 ' + all.length + '건</span></span></div>'
    + '<table class="adm-table aas-table"><thead><tr><th>조직명</th><th>조직영문명</th><th>조직별칭</th></tr></thead><tbody>' + body + '</tbody></table>'
    + '<div class="adm-note">※ HR 조직 마스터에서 받은 조직을 조회만 합니다(AS-IS 와 같이 등록 · 수정 · 삭제 없음). 계층만큼 들여쓰고, 검색 중에는 맞는 조직만 보입니다.</div>';
}

// ── 메뉴 등록 ──
var AAS_MENUS = [
  { key: 'member',  icon: '🧑‍🤝‍🧑', title: '구성원 조회',     group: 'master', desc: '조직별 구성원(이름 · 사번 · 직위 · 직책 · 부서)을 조회합니다.', src: 'HR 인사 마스터 연동 (조회 전용)' },
  { key: 'sgna',    icon: '🏛', title: 'SG&A 조직 관리',  group: 'master', desc: 'SG&A(판관비) 집계용 조직 트리와 CC조직 · 실제 조직 코드 · 사용 기간을 관리합니다.', src: '관리자 직접 관리 (HR 조직과 별도)' },
  { key: 'acct',    icon: '📒', title: '계정과목 조회',   group: 'master', desc: '계정코드 · 계정명 · 중계정 · CI(수행원가 계정 묶음)를 조회합니다.', src: 'ERP 계정과목 연동 (조회 전용)' },
  { key: 'client',  icon: '🏬', title: '고객사 조회',     group: 'master', desc: '고객사 기본정보 · 신용등급 · 여신금액을 조회합니다.', src: 'ERP 고객 마스터 연동 (조회 전용)' },
  { key: 'partner', icon: '🤝', title: '협력사 조회',     group: 'master', desc: '협력사 기본정보 · 업종 분류 · 신용등급을 조회합니다.', src: '구매 협력사 마스터 연동 (조회 전용)' },
  { key: 'ugroup',  icon: '👥', title: '사용자 그룹 관리', group: 'access', desc: '메일 수신 · 결재 협조 등에 쓰는 사용자 묶음(공용 · 개인 그룹)과 멤버를 관리합니다.', src: '관리자 · 사용자 직접 등록' },
  { key: 'page',    icon: '🖥', title: '화면 관리',       group: 'access', desc: '서비스별 화면과 라우팅 · 서비스 경로, 운영모드 중 열리는 화면(서비스모드)을 관리합니다.', src: '관리자 직접 등록 (메뉴 관리가 연결)' },
  { key: 'ip',      icon: '🛡', title: 'IP접근제어 관리', group: 'access', desc: '운영모드(긴급) 때 접속을 허용할 IP를 등록하고, 운영모드로 전환합니다.', src: '관리자 직접 등록 · 엑셀 업로드' },
  { key: 'board',   icon: '📋', title: '게시판 관리',     group: 'ops',    desc: '공지사항 · Q&A · 매뉴얼 게시판을 관리합니다. Q&A 는 답변을 등록합니다.', src: '운영자 작성 · 사용자 질문' },
  { key: 'file',    icon: '📎', title: '첨부파일 관리',   group: 'ops',    desc: '시스템에 올라온 첨부파일을 폴더별로 조회 · 업로드 · 다운로드합니다.', src: '시스템 파일 저장소' },
];
var AAS_RENDER = {
  org: aasOrgHtml, member: aasMemberHtml, sgna: aasSgnaHtml, ugroup: aasUgHtml, ip: aasIpHtml, board: aasBoardHtml, file: aasFileHtml,
  acct: function () { return aasStdHtml('acct'); }, client: function () { return aasStdHtml('client'); },
  partner: function () { return aasStdHtml('partner'); }, page: function () { return aasStdHtml('page'); },
};
(function aasRegister() {
  if (typeof ADMIN_SECTIONS === 'undefined' || typeof admSectionBody !== 'function') return;
  AAS_MENUS.forEach(function (m) { if (!ADMIN_SECTIONS.some(function (s) { return s.key === m.key; })) ADMIN_SECTIONS.push(m); });
  var before = admSectionBody;
  admSectionBody = function (key) { return AAS_RENDER[key] ? AAS_RENDER[key]() : before(key); };
})();

// ── 전용 스타일 (.aas-*) ──
(function aasStyle() {
  if (document.getElementById('aas-style')) return;
  var st = document.createElement('style'); st.id = 'aas-style';
  st.textContent = ''
    + '.aas-searchbox{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 14px;background:#f5f7fb;border:1px solid var(--sk-border,#e5e7eb);border-radius:10px;padding:12px 14px;margin:0 0 14px}'
    + '.aas-sf{display:flex;flex-direction:column;gap:5px}.aas-sf label{font-size:12px;font-weight:800;color:#475569}'
    + '.aas-sf .adm-search{flex:none;width:190px;max-width:190px;min-width:150px;height:36px;box-sizing:border-box;background:#fff}'
    + '.aas-sf .adm-filter{height:36px}.aas-sf-radio .aas-q{width:260px;max-width:260px}.aas-sf-radio{flex-direction:row;align-items:center;gap:12px}'
    + '.aas-radio{font-size:12.5px;font-weight:700;color:#334155;display:inline-flex;align-items:center;gap:4px;cursor:pointer}'
    + '.aas-sf-radio .aas-q{min-width:240px}.aas-sbtns{margin-left:auto;display:flex;gap:6px}'
    + '.aas-bar{margin-bottom:10px}.aas-sp{flex:1}.aas-cnt{font-size:12.5px;color:#334155}.aas-cnt b{color:var(--sk-blue,#2563eb)}'
    + '.aas-table tr.aas-on td{background:#eef4ff!important}.aas-table tr.aas-ended td{color:#94a3b8}'
    + '.aas-empty{text-align:center;color:#94a3b8;padding:26px!important}'
    + '.aas-split{display:flex;gap:14px;align-items:flex-start}.aas-main{flex:1 1 auto;min-width:0}'
    + '.aas-split-half>.aas-main{flex:1 1 50%}'
    + '.aas-side{flex:0 0 210px;background:#fff;border:1px solid var(--sk-border,#e5e7eb);border-radius:12px;padding:8px}'
    + '.aas-side-h{font-size:11.5px;font-weight:800;color:#64748b;padding:4px 8px 6px}'
    + '.aas-tree-i{display:flex;justify-content:space-between;width:100%;border:0;background:none;text-align:left;font-family:inherit;font-size:12.5px;color:#334155;padding:7px 8px;border-radius:7px;cursor:pointer}'
    + '.aas-tree-i:hover{background:#f5f7fb}.aas-tree-i.on{background:var(--sk-blue-soft,#e8f0fe);color:var(--sk-blue-deep,#1d4ed8);font-weight:800}'
    + '.aas-tree-i.lv0{font-weight:800}.aas-tree-i.lv2{padding-left:22px}.aas-tree-i.lv3{padding-left:36px}'
    + '.aas-side-btns{display:flex;gap:6px;padding:8px 4px 2px;border-top:1px solid #f1f3f6;margin-top:6px}'
    + '.aas-detail{flex:0 0 300px;background:#fff;border:1px solid var(--sk-border,#e5e7eb);border-radius:12px;padding:12px 14px}'
    + '.aas-detail-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:14px}'
    + '.aas-dl{display:grid;grid-template-columns:96px 1fr;gap:7px 10px;font-size:12.5px}.aas-dt{color:#64748b;font-weight:700}.aas-dd{color:#1f2937;word-break:break-all}'
    + '.aas-dl-pop{padding:16px 20px}'
    + '.aas-scroll{overflow-x:auto}.aas-nowrap td{white-space:nowrap}'
    + '.aas-fold{border:0;background:none;cursor:pointer;color:#64748b;width:18px;padding:0;font-size:12px}.aas-fold-sp{display:inline-block;width:18px}'
    + '.aas-tabs{display:flex;gap:4px;border-bottom:1px solid var(--sk-border,#e5e7eb);margin:0 0 14px}'
    + '.aas-tab{border:0;background:none;font-family:inherit;font-size:13px;font-weight:700;color:#64748b;padding:9px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}'
    + '.aas-tab.on{color:var(--sk-blue,#2563eb);border-bottom-color:var(--sk-blue,#2563eb)}'
    + '.aas-pillbtn{cursor:pointer;font-family:inherit}'
    + '.aas-confirm{padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.65}'
    + '.aas-danger{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important}'
    + '.aas-danger-o{color:#c40025;border-color:#f3c2cc}.aas-danger-o:hover{background:#fef2f2;border-color:#dc2626;color:#dc2626}'
    + '.aas-modebar{display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:800;color:#334155;border:1px dashed #f3c2cc;background:#fffafa;border-radius:10px;padding:9px 12px;margin:0 0 12px}'
    + '.aas-modebar .adm-muted{font-weight:500}'
    + '.aas-pick{max-height:340px;overflow:auto;padding:10px 18px}.aas-pick-i{display:flex;gap:8px;align-items:center;font-size:12.5px;padding:6px 0;border-bottom:1px solid #f1f3f6;cursor:pointer}'
    + '.aas-qa{padding:14px 20px 4px}.aas-qa-t{font-size:14px;margin-bottom:4px}.aas-qa-q{margin-top:10px;background:#f5f7fb;border-radius:8px;padding:10px 12px;font-size:13px;color:#334155}';
  document.head.appendChild(st);
})();
