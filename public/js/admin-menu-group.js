// ════════════════════════════════════════
//  관리자 — 메뉴 25개 → 11개 묶음(탭으로 구분)                작성: 남주
// ════════════════════════════════════════
//
// [2026.11.27] 관리자 메뉴를 11개로 줄이고, 묶인 메뉴는 화면 안 탭으로 나눕니다.
// admin.js(수진) · admin-golden(석완) · closedate · mail · approval(수진) · admin-asis(남주)는 고치지 않습니다.
// 모든 관리자 스크립트 **맨 뒤**에 로드되어:
//   · ADMIN_SECTIONS 를 11개 묶음으로 바꿔 끼움(원래 메뉴 정의는 AMG_ORIG 에 보관 → 탭 이름 · 설명 · 데이터 출처에 씀)
//   · admSectionBody 를 감싸 묶음 키면 [탭 줄 + 지금 탭의 원래 화면]을 그림(원래 화면 함수는 그대로 호출)
//   · adminGo 를 감싸 옛 메뉴 키(#fx · #closedate …)로 와도 그 묶음의 그 탭으로 엶
// 탭이 1개인 묶음(결재라인 · Golden)은 탭 줄 없이 원래 화면 그대로.

var AMG_GROUPS = [
  { key: 'user',    icon: '👤', title: '사용자 관리',     group: 'master', tabs: ['user', 'member', 'ugroup'],
    desc: '사용자 계정 · 구성원 조회 · 사용자 그룹을 탭으로 나눠 관리합니다.' },
  { key: 'org',     icon: '🏢', title: '조직 관리',       group: 'master', tabs: ['org', 'sgna'],
    desc: 'HR 조직도(조회)와 SG&A 집계 조직을 관리합니다.' },
  { key: 'base',    icon: '🔖', title: '기준정보 관리',   group: 'master', tabs: ['code', 'acct', 'price', 'fx', 'closedate'],
    desc: '공통코드 · 계정과목 · P단가 · 환율 · 회계결산일자 등 업무 기준값을 관리합니다.' },
  { key: 'bp',      icon: '🤝', title: '거래처 관리',     group: 'master', tabs: ['client', 'partner'],
    desc: '고객사 · 협력사 마스터를 조회합니다.' },
  { key: 'apvline', icon: '🧾', title: '결재라인 관리',   group: 'master', tabs: ['apvline'] },
  { key: 'perm',    icon: '🔑', title: '권한 · 보안 관리', group: 'access', tabs: ['perm', 'ip', 'log'],
    desc: '역할별 메뉴 권한, 운영모드 접속 허용 IP, 사용자 활동 기록(로그 · 이력)을 관리합니다.' },
  { key: 'menu',    icon: '🗂', title: '메뉴 · 화면 관리', group: 'access', tabs: ['menu', 'page'],
    desc: '메뉴 노출 · 순서와 메뉴가 연결하는 화면(페이지)을 관리합니다.' },
  { key: 'notify',  icon: '🔔', title: '알림 · 메일 관리', group: 'ops',    tabs: ['notify', 'mail'],
    desc: '운영 알림 설정과 메일 발송 이력을 관리합니다.' },
  // [2026.11.27] 로그 · 이력은 권한 · 보안 관리로 옮김 — 조회 전용 감사 기록과 배치(실행 도구 · 자체 실행 이력)를 한 메뉴에 두면 헷갈림
  { key: 'sysops',  icon: '⚙', title: '시스템 운영',      group: 'ops',    tabs: ['integ', 'batch'],
    desc: '외부 시스템 연동과 배치 · 스케줄 작업을 관리합니다.' },
  { key: 'board',   icon: '📋', title: '게시판 · 자료 관리', group: 'ops',  tabs: ['notice', 'qna', 'manual', 'file'],
    desc: '공지사항 · Q&A · 매뉴얼 게시판과 첨부파일을 관리합니다.' },
  { key: 'golden',  icon: '🏅', title: 'Golden Data set 관리', group: 'agent', tabs: ['golden'] },
];

// 원래 메뉴에 없는 탭(게시판 3종은 admin-asis 의 board 화면 안 탭) · 탭 이름 · 설명 · 출처 보정
var AMG_SUB = {
  notice: { title: '공지사항', icon: '📢', desc: '공지 · 작업공지 · 안내 · 긴급작업공지를 등록하고 메인팝업 여부를 정합니다.', src: '운영자 작성', render: function () { return aasStdHtml('notice'); } },
  qna:    { title: 'Q&A',     icon: '💬', desc: '사용자 질문에 답변을 등록하고 상태를 바꿉니다.',                         src: '사용자 질문 · 운영자 답변', render: function () { return aasStdHtml('qna'); } },
  manual: { title: '매뉴얼',  icon: '📘', desc: '화면별 매뉴얼을 등록하고 메인 매뉴얼을 정합니다.',                       src: '운영자 작성', render: function () { return aasStdHtml('manual'); } },
  org:    { title: '조직도',  desc: '본부 · 사업부 · 팀 조직 구조를 조회합니다.', src: 'HR 조직 마스터 연동 (조회 전용)' },
  user:   { title: '사용자' }, ugroup: { title: '사용자 그룹' }, sgna: { title: 'SG&A 조직' },
  code:   { title: '공통코드' }, acct: { title: '계정과목' }, price: { title: 'P단가' }, fx: { title: '환율' }, closedate: { title: '회계결산일자' },
  client: { title: '고객사' }, partner: { title: '협력사' }, perm: { title: '역할별 권한' }, ip: { title: 'IP접근제어' },
  menu:   { title: '메뉴' }, page: { title: '화면' }, notify: { title: '운영 알림' }, mail: { title: '메일 발송 이력' },
  log:    { title: '로그 · 이력' }, integ: { title: '외부 연동' }, batch: { title: '배치 / 스케줄' }, file: { title: '첨부파일' },
};

var AMG_ORIG = {};          // 원래 메뉴 정의(key → section)
var AMG_TAB = {};           // 묶음별 지금 탭
var AMG_SUB2GRP = {};       // 탭 키 → 묶음 키
function amgIsGroup(k) { return AMG_GROUPS.some(function (g) { return g.key === k; }); }
function amgGroup(k) { return AMG_GROUPS.find(function (g) { return g.key === k; }); }
function amgSubMeta(k) {
  var o = AMG_ORIG[k] || {}, s = AMG_SUB[k] || {};
  var src = s.src || (typeof admSrcOf === 'function' ? admSrcOf(o) : o.src) || '';
  return { key: k, title: s.title || o.title || k, icon: s.icon || o.icon || '', desc: s.desc || o.desc || '', src: src };
}

// ── 탭 전환 ──
function amgTab(grp, sub) {
  AMG_TAB[grp] = sub;
  asiteRender();
  var m = document.getElementById('asite-main'); if (m) m.scrollTop = 0;
}

// ── 묶음 화면 = 탭 줄 + 탭 설명 줄 + 원래 화면 ──
function amgBody(grp, inner) {
  var g = amgGroup(grp);
  var cur = AMG_TAB[grp] || g.tabs[0];
  if (g.tabs.indexOf(cur) < 0) cur = g.tabs[0];
  var meta = amgSubMeta(cur);
  var body = AMG_SUB[cur] && AMG_SUB[cur].render ? AMG_SUB[cur].render() : inner(cur);
  if (g.tabs.length < 2) return body;
  var tabs = '<div class="amg-tabs">' + g.tabs.map(function (k) {
    var m = amgSubMeta(k);
    return '<button class="amg-tab' + (k === cur ? ' on' : '') + '" onclick="amgTab(\'' + grp + '\',\'' + k + '\')">' + m.title + '</button>';
  }).join('') + '</div>';
  var sub = '<div class="amg-sub"><span class="amg-sub-d">' + meta.desc + '</span>'
    + (meta.src ? '<span class="amg-sub-src">🔗 데이터 출처 · ' + (typeof admEsc === 'function' ? admEsc(meta.src) : meta.src) + '</span>' : '') + '</div>';
  return tabs + sub + body;
}

(function amgInstall() {
  if (typeof ADMIN_SECTIONS === 'undefined' || typeof admSectionBody !== 'function') return;
  ADMIN_SECTIONS.forEach(function (s) { AMG_ORIG[s.key] = s; });
  AMG_GROUPS.forEach(function (g) {
    g.tabs.forEach(function (k) { AMG_SUB2GRP[k] = g.key; });
    if (g.tabs.length === 1) {                          // 탭 1개 묶음은 원래 설명 · 출처를 그대로
      var o = AMG_ORIG[g.tabs[0]] || {};
      g.desc = g.desc || o.desc; g.src = o.src;
    } else {
      g.src = '';                                       // 출처는 탭마다 달라 탭 설명 줄에서 보여 줌
    }
  });
  ADMIN_SECTIONS.length = 0;
  AMG_GROUPS.forEach(function (g) { ADMIN_SECTIONS.push(g); });

  var inner = admSectionBody;
  admSectionBody = function (key) { return amgIsGroup(key) ? amgBody(key, inner) : inner(key); };

  var goBefore = adminGo;
  adminGo = function (key) {
    if (!amgIsGroup(key) && AMG_SUB2GRP[key]) { AMG_TAB[AMG_SUB2GRP[key]] = key; key = AMG_SUB2GRP[key]; }
    return goBefore(key);
  };

  // 옛 주소(#fx 등)로 처음 들어온 경우 — initAdminSite 가 읽기 전에 묶음 주소로 바꿔 둠
  var h = (location.hash || '').replace('#', '');
  if (h && !amgIsGroup(h) && AMG_SUB2GRP[h]) {
    AMG_TAB[AMG_SUB2GRP[h]] = h;
    try { history.replaceState(null, '', '#' + AMG_SUB2GRP[h]); } catch (e) {}
  }
  window.addEventListener('hashchange', function () {
    var k = (location.hash || '').replace('#', '');
    if (k && !amgIsGroup(k) && AMG_SUB2GRP[k]) adminGo(k);
  });
})();

// ── 전용 스타일 (.amg-*) ──
(function amgStyle() {
  if (document.getElementById('amg-style')) return;
  var st = document.createElement('style'); st.id = 'amg-style';
  st.textContent = ''
    + '.amg-tabs{display:flex;gap:2px;border-bottom:1px solid var(--sk-border,#e5e7eb);margin:-4px 0 0;flex-wrap:wrap}'
    + '.amg-tab{border:0;background:none;font-family:inherit;font-size:13.5px;font-weight:700;color:#64748b;padding:10px 16px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}'
    + '.amg-tab:hover{color:#334155}.amg-tab.on{color:var(--sk-blue,#2563eb);border-bottom-color:var(--sk-blue,#2563eb)}'
    + '.amg-sub{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:12.5px;color:#64748b;padding:10px 2px 14px}'
    + '.amg-sub-src{color:var(--sk-blue-deep,#1d4ed8);font-weight:700;font-size:12px}'
    // [2026.11.27] 화면이 작고 옆 · 아래가 비어 답답함 → 본문 폭 제한(1040px) 해제 + 흰 판이 화면 아래까지 + 글자 · 줄 간격 키움
    //   (admin.html 공용 CSS 는 고치지 않고 뒤에 주입한 이 규칙이 덮음)
    + '.asite-page{padding:20px 28px 24px;display:flex;flex-direction:column;min-height:calc(100vh - 47px);box-sizing:border-box}'
    + '.asite-content{max-width:none;min-width:0;flex:1 1 auto;margin-top:14px;background:#fff;border:1px solid var(--sk-border,#e5e7eb);border-radius:14px;padding:6px 24px 24px;box-shadow:0 1px 2px rgba(16,24,40,.04)}'
    + '.asite-h-t{font-size:22px}.asite-h-d{font-size:13.5px}.asite-h-src{font-size:12.5px}'
    + '.asite-content>:first-child:not(.amg-tabs){margin-top:18px}'
    + '.amg-tabs{margin:0 -24px;padding:0 16px}.amg-tab{font-size:14.5px;padding:13px 18px}'
    + '.amg-sub{font-size:13.5px}.amg-sub-src{font-size:13px}'
    + '.asite-content .adm-table{font-size:13.5px}.asite-content .adm-table th{padding:12px 14px;font-size:13px}.asite-content .adm-table td{padding:12px 14px}'
    + '.asite-content .adm-btn{font-size:13px}.asite-content .adm-btn.sm{font-size:12.5px}'
    + '.asite-content .adm-search,.asite-content .adm-filter{font-size:13.5px}.asite-content .adm-note{font-size:12.5px;line-height:1.7}'
    + '.asite-content .aas-cnt{font-size:13.5px}.asite-content .aas-sf label{font-size:12.5px}.asite-content .aas-radio{font-size:13.5px}'
    + '.asite-content .aas-tree-i{font-size:13.5px}.asite-content .aas-dl{font-size:13.5px}'
    + '.asite-content .aas-side{flex-basis:230px}.asite-content .aas-detail{flex-basis:340px}'
    + '.asite-content .adm-pill,.asite-content .adm-tag,.asite-content .adm-code,.asite-content .adm-btn{white-space:nowrap}'
    + '@media (max-width:1500px){.asite-content .adm-table{font-size:13px}.asite-content .adm-table th{padding:11px 10px;font-size:12.5px}.asite-content .adm-table td{padding:11px 10px}.asite-page{padding:18px 20px 20px}.asite-content{padding:4px 18px 20px}.amg-tabs{margin:0 -18px;padding:0 10px}}'
    + '@media (max-width:900px){.asite-page{padding:16px 12px}.asite-content{padding:4px 12px 16px}.amg-tabs{margin:0 -12px;padding:0 6px}}';
  document.head.appendChild(st);
})();
