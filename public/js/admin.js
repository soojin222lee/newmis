// ════════════════════════════════════════
//  관리자(Admin) — 독립 사이트 + 메인앱 진입 버튼        작성: 수진
// ════════════════════════════════════════
//
// 두 가지 맥락에서 로드됩니다.
//  ① 메인 앱(index.html): 우측 상단 '⚙ Admin' 버튼만 주입 → 누르면 /admin.html 로 이동.
//  ② 관리자 사이트(admin.html): 자체 상단바 + 좌측 메뉴 + 콘텐츠로 된 독립 화면을 렌더.
// 관리자는 예산 앱의 레일/탭과 분리된 '다른 사이트'입니다.

// ── 관리 영역 정의 ──
var ADMIN_SECTIONS = [
  { key: 'user',  icon: '👤', title: '사용자 관리', desc: '사용자 계정·역할·소속·활성 상태를 관리합니다.' },
  { key: 'perm',  icon: '🔑', title: '권한 관리',   desc: '역할별 메뉴 접근·CRUD 권한을 설정합니다.' },
  { key: 'org',   icon: '🏢', title: '조직도 관리', desc: '본부·사업부·팀 조직 구조를 관리합니다.' },
  { key: 'menu',  icon: '🗂', title: '메뉴 관리',   desc: '메뉴 노출/순서/역할 매핑을 관리합니다.' },
  { key: 'price', icon: '💲', title: 'P단가 관리',  desc: '직급·등급별 표준 인건비 단가(P단가)를 관리합니다.' },
  { key: 'fx',    icon: '💱', title: '환율 관리',   desc: '통화별 매매기준율과 적용일을 관리합니다.' },
  { key: 'code',   icon: '🔖', title: '코드 관리',   desc: '공통 코드·분류 체계를 관리합니다.',          tbd: true },
  { key: 'notify', icon: '🔔', title: '알림 설정',   desc: '시스템 알림·수신 대상을 설정합니다.',        tbd: true },
  { key: 'log',    icon: '📜', title: '로그·이력',   desc: '사용자 활동·변경 이력을 조회합니다.',        tbd: true },
  { key: 'integ',  icon: '🔌', title: '외부 연동',   desc: 'ERP·CRM·SCM 등 연계 시스템 설정을 관리합니다.', tbd: true },
  { key: 'batch',  icon: '⏱', title: '배치/스케줄', desc: '정기 배치·스케줄 작업을 관리합니다.',        tbd: true },
];

// ── 목업 데이터 ──
var ADM_ROLES = ['시스템관리자', '운영자', '개발자', 'BA', 'PM', '팀장', '담당자', '뷰어'];
var ADM_PERM_MENUS = ['프로젝트', '수행원가', '인사이트', '관리자'];
var ADM_PERM_CRUD = ['조회', '등록', '수정', '삭제', '승인'];
var ADM_PERM = {
  '시스템관리자': { '프로젝트': 'CRUDA', '수행원가': 'CRUDA', '인사이트': 'R', '관리자': 'CRUDA' },
  '운영자':       { '프로젝트': 'R',     '수행원가': 'CRU',   '인사이트': 'R', '관리자': 'R' },
  '개발자':       { '프로젝트': 'R',     '수행원가': 'R',     '인사이트': 'R', '관리자': 'CRUDA' },
  'BA':          { '프로젝트': 'CRU',   '수행원가': 'R',     '인사이트': 'R', '관리자': '' },
  'PM':          { '프로젝트': 'CRU',   '수행원가': 'CRUDA', '인사이트': 'R', '관리자': '' },
  '팀장':         { '프로젝트': 'R',     '수행원가': 'RA',    '인사이트': 'R', '관리자': '' },
  '담당자':       { '프로젝트': 'CR',    '수행원가': 'CRU',   '인사이트': 'R', '관리자': '' },
  '뷰어':         { '프로젝트': 'R',     '수행원가': 'R',     '인사이트': 'R', '관리자': '' },
};
var ADM_USERS = [
  { name: '이봄',   emp: '21043', role: 'PM',          dept: 'AX ERP사업부 1팀', status: '활성' },
  { name: '한민석', emp: '21055', role: 'PM',          dept: '데이터사업부',      status: '활성' },
  { name: '신성호', emp: '13016', role: '팀장',        dept: 'AX ERP사업부 1팀', status: '활성' },
  { name: '장재호', emp: '15025', role: '담당자',      dept: 'AX ERP사업부 2팀', status: '활성' },
  { name: '오재민', emp: '13083', role: '팀장',        dept: 'AX ERP사업부',     status: '활성' },
  { name: '권재준', emp: '60521', role: '시스템관리자', dept: '(전사)IT운영팀',   status: '활성' },
  { name: '정우성', emp: '13071', role: '뷰어',        dept: '(전사)IT운영팀',   status: '비활성' },
];
var ADM_MENUS = [
  { name: '프로젝트 현황', path: '#/project-status', show: true,  order: 1, roles: '전체' },
  { name: '프로젝트 개설 관리', path: '#/project-open', show: true, order: 2, roles: 'PM·담당자' },
  { name: '수행원가', path: '#/budget-status', show: true,  order: 3, roles: 'PM·팀장·담당자' },
  { name: 'AI 레포트', path: '#/ai-report', show: true,  order: 4, roles: '전체' },
  { name: '맞춤 레포트', path: '#/custom-report', show: true, order: 5, roles: '전체' },
  { name: '관리자', path: '/admin.html', show: true, order: 99, roles: '시스템관리자' },
];
var ADM_ORG = [
  { name: 'AX 사업본부', lv: 0, head: '김본부(임원)' },
  { name: 'AX ERP사업부', lv: 1, head: '오재민' },
  { name: 'AX ERP사업부 1팀', lv: 2, head: '신성호' },
  { name: 'AX ERP사업부 2팀', lv: 2, head: '장재호' },
  { name: '데이터사업부', lv: 1, head: '한민석' },
  { name: '데이터플랫폼팀', lv: 2, head: '이수연' },
  { name: '(전사)IT운영팀', lv: 1, head: '김도현' },
];
var ADM_PRICE = [
  { grade: 'S', pos: '수석', unit: 12500000, apply: '2026-01-01' },
  { grade: 'A', pos: '책임', unit: 9800000,  apply: '2026-01-01' },
  { grade: 'B', pos: '선임', unit: 7600000,  apply: '2026-01-01' },
  { grade: 'C', pos: '전임', unit: 6100000,  apply: '2026-01-01' },
  { grade: 'D', pos: '사원', unit: 4800000,  apply: '2026-01-01' },
];
var ADM_FX = [
  { cur: 'USD', name: '미국 달러', rate: 1385.20, apply: '2026-10-14' },
  { cur: 'EUR', name: '유로',      rate: 1498.60, apply: '2026-10-14' },
  { cur: 'JPY', name: '일본 엔(100)', rate: 925.40, apply: '2026-10-14' },
  { cur: 'CNY', name: '중국 위안',  rate: 194.30, apply: '2026-10-14' },
];

function admFmt(n) { return (n || 0).toLocaleString('ko-KR'); }
function admToast(m) {
  if (typeof showToast === 'function') { try { showToast(m); return; } catch (e) {} }
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m; t.classList.add('show');
  clearTimeout(admToast._t); admToast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

// ── 섹션 콘텐츠 렌더러(목업) ──
function admUserHtml() {
  var rows = ADM_USERS.map(function (u, i) {
    var on = u.status === '활성';
    return '<tr><td><b>' + u.name + '</b></td><td>' + u.emp + '</td>'
      + '<td><span class="adm-tag">' + u.role + '</span></td><td>' + u.dept + '</td>'
      + '<td><button class="adm-toggle ' + (on ? 'on' : 'off') + '" onclick="admUserToggle(' + i + ')">' + (on ? '활성' : '비활성') + '</button></td>'
      + '<td><button class="adm-btn" onclick="admToast(\'사용자 수정 (목업)\')">수정</button></td></tr>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'사용자\')">저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'사용자 추가 (목업)\')">+ 사용자 추가</button></div>'
    + '<table class="adm-table"><thead><tr><th>이름</th><th>사번</th><th>역할</th><th>소속</th><th>상태</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ 역할은 권한 관리의 역할 체계와 연동됩니다. 비활성 사용자는 로그인이 차단됩니다.</div>';
}
function admPermHtml() {
  var head = '<tr><th>역할</th>' + ADM_PERM_MENUS.map(function (m) { return '<th style="text-align:center">' + m + '</th>'; }).join('') + '</tr>';
  var rows = ADM_ROLES.map(function (role) {
    var cells = ADM_PERM_MENUS.map(function (menu) {
      var have = (ADM_PERM[role] && ADM_PERM[role][menu]) || '';
      var chips = ADM_PERM_CRUD.map(function (c) {
        var code = c === '조회' ? 'R' : c === '등록' ? 'C' : c === '수정' ? 'U' : c === '삭제' ? 'D' : 'A';
        var on = have.indexOf(code) >= 0;
        return '<label style="display:inline-flex;align-items:center;gap:2px;margin:0 4px;font-size:11px;color:#64748b">'
          + '<input type="checkbox" class="adm-chk" ' + (on ? 'checked' : '') + '> ' + c + '</label>';
      }).join('');
      return '<td style="text-align:center">' + chips + '</td>';
    }).join('');
    return '<tr><td><b>' + role + '</b></td>' + cells + '</tr>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'권한\')">저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'역할 추가 (목업)\')">+ 역할 추가</button></div>'
    + '<table class="adm-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ 체크 = 해당 역할이 그 메뉴에서 수행할 수 있는 권한 (C등록·R조회·U수정·D삭제·A승인)</div>';
}
function admMenuHtml() {
  var rows = ADM_MENUS.map(function (m, i) {
    return '<tr><td class="num">' + m.order + '</td><td><b>' + m.name + '</b></td><td><code style="font-size:11px;color:#64748b">' + m.path + '</code></td>'
      + '<td><span class="adm-tag">' + m.roles + '</span></td>'
      + '<td><button class="adm-toggle ' + (m.show ? 'on' : 'off') + '" onclick="admMenuToggle(' + i + ')">' + (m.show ? '노출' : '숨김') + '</button></td>'
      + '<td><button class="adm-btn" onclick="admToast(\'메뉴 수정 (목업)\')">수정</button></td></tr>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'메뉴\')">순서 저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'메뉴 추가 (목업)\')">+ 메뉴 추가</button></div>'
    + '<table class="adm-table"><thead><tr><th class="num">순서</th><th>메뉴명</th><th>경로</th><th>노출 역할</th><th>노출</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>';
}
function admOrgHtml() {
  var rows = ADM_ORG.map(function (o) {
    var pad = 10 + o.lv * 22;
    var mark = o.lv === 0 ? '🏢' : o.lv === 1 ? '📂' : '👥';
    return '<div class="adm-org-row" style="padding-left:' + pad + 'px">'
      + '<span>' + mark + '</span><span class="adm-org-name">' + o.name + '</span>'
      + '<span class="adm-org-head">조직장 · ' + o.head + '</span></div>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'조직도\')">저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'부서 추가 (목업)\')">+ 부서 추가</button></div>'
    + '<div class="adm-org">' + rows + '</div>';
}
function admPriceHtml() {
  var rows = ADM_PRICE.map(function (p) {
    return '<tr><td><b>' + p.grade + '</b></td><td>' + p.pos + '</td>'
      + '<td class="num">' + admFmt(p.unit) + ' 원</td><td>' + p.apply + '</td>'
      + '<td><button class="adm-btn" onclick="admToast(\'단가 수정 (목업)\')">수정</button></td></tr>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'P단가\')">저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'등급 추가 (목업)\')">+ 등급 추가</button></div>'
    + '<table class="adm-table"><thead><tr><th>등급</th><th>직급</th><th class="num">월 표준단가(P단가)</th><th>적용일</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ P단가 = 인건비 산정 기준 직급·등급별 월 표준단가. 적용일 이후 신규 편성에 반영됩니다.</div>';
}
function admFxHtml() {
  var rows = ADM_FX.map(function (f) {
    return '<tr><td><b>' + f.cur + '</b></td><td>' + f.name + '</td>'
      + '<td class="num">' + f.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2 }) + '</td><td>' + f.apply + '</td>'
      + '<td><button class="adm-btn" onclick="admToast(\'환율 수정 (목업)\')">수정</button></td></tr>';
  }).join('');
  return '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admSave(\'환율\')">저장</button>'
    + '<button class="adm-btn" onclick="admToast(\'통화 추가 (목업)\')">+ 통화 추가</button></div>'
    + '<table class="adm-table"><thead><tr><th>통화</th><th>통화명</th><th class="num">매매기준율(원)</th><th>적용일</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ 매매기준율은 외화 포함 계약·경비 환산에 사용됩니다.</div>';
}
function admTbdHtml(meta) {
  return '<div class="adm-tbd-box">'
    + '<div class="adm-tbd-ic">' + (meta.icon || '🧩') + '</div>'
    + '<div class="adm-tbd-t">' + (meta.title || '') + ' <span class="adm-tbd">TBD</span></div>'
    + '<div class="adm-tbd-d">' + (meta.desc || '') + '<br>이 기능은 <b>준비 중(TBD)</b>입니다. 요구사항 확정 후 구현 예정입니다.</div>'
    + '</div>';
}
function admSectionBody(key) {
  var meta = ADMIN_SECTIONS.find(function (s) { return s.key === key; }) || {};
  if (meta.tbd) return admTbdHtml(meta);
  if (key === 'user')  return admUserHtml();
  if (key === 'perm')  return admPermHtml();
  if (key === 'menu')  return admMenuHtml();
  if (key === 'org')   return admOrgHtml();
  if (key === 'price') return admPriceHtml();
  if (key === 'fx')    return admFxHtml();
  return admUserHtml();
}

// ── 공통 이벤트(목업) ──
function admSave(what) { admToast(what + ' 설정을 저장했습니다. (목업)'); }
function admMenuToggle(i) { if (ADM_MENUS[i]) { ADM_MENUS[i].show = !ADM_MENUS[i].show; asiteRender(); } }
function admUserToggle(i) { if (ADM_USERS[i]) { ADM_USERS[i].status = ADM_USERS[i].status === '활성' ? '비활성' : '활성'; asiteRender(); } }

// ════════ ① 관리자 독립 사이트 (admin.html) ════════
var adminCur = 'user';
function asiteRender() {
  var nav = document.getElementById('asite-nav');
  var main = document.getElementById('asite-main');
  if (!nav || !main) return;
  nav.innerHTML = '<div class="asite-nav-lbl">관리 메뉴</div>' + ADMIN_SECTIONS.map(function (s) {
    var on = s.key === adminCur ? ' on' : '';
    var tbd = s.tbd ? '<span class="adm-tbd">TBD</span>' : '';
    return '<button class="asite-navi' + on + '" onclick="adminGo(\'' + s.key + '\')">'
      + '<span class="asite-navi-ic">' + s.icon + '</span><span class="asite-navi-t">' + s.title + tbd + '</span></button>';
  }).join('');
  var meta = ADMIN_SECTIONS.find(function (s) { return s.key === adminCur; }) || {};
  main.innerHTML = '<div class="asite-head"><div class="asite-h-ic">' + (meta.icon || '') + '</div><div>'
    + '<div class="asite-h-t">' + (meta.title || '') + '</div>'
    + '<div class="asite-h-d">' + (meta.desc || '') + '</div></div></div>'
    + '<div class="asite-content">' + admSectionBody(adminCur) + '</div>';
}
function adminGo(key) {
  if (!ADMIN_SECTIONS.some(function (s) { return s.key === key; })) key = 'user';
  adminCur = key;
  try { if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key); } catch (e) {}
  asiteRender();
  var m = document.getElementById('asite-main'); if (m) m.scrollTop = 0;
}
function initAdminSite() {
  var h = (location.hash || '').replace('#', '');
  if (h && ADMIN_SECTIONS.some(function (s) { return s.key === h; })) adminCur = h;
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
