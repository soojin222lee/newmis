// ════════════════════════════════════════
//  관리자 > 메일관리                                   작성: 수진
// ════════════════════════════════════════
//
// admin.js 를 고치지 않고, 그 뒤에 로드되어 메뉴와 화면을 끼워 넣습니다(golden 패턴).
//   · ADMIN_SECTIONS 에 'mail' 메뉴를 운영·연계 그룹으로 추가
//   · admSectionBody 를 데코레이터로 감싸 'mail' 만 여기서 그리고 나머지는 원래 함수로 넘깁니다
//
// 운영모니터링(알림 설정)에서 메일 관련은 이 화면으로 분리.
// 메일 발송 성공/실패 이력을 관리하고, 실패 건은 재발송합니다. (목업)

// ── 목업 데이터: 메일 발송 이력 ──
var ADM_MAIL = [
  { id: 'M-2041', dt: '2026-10-19 09:15', type: '예산 승인요청 도착', to: '신성호(13016)', subject: '[결재요청] 2026 차세대 ERP 실행예산 상신', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2040', dt: '2026-10-19 09:02', type: '예산 승인완료',      to: '한민석(20011)', subject: '[승인완료] 데이터레이크 W/G 비용 V2.0', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2039', dt: '2026-10-19 08:31', type: '프로젝트 종료 임박',  to: '이봄(21043)',   subject: '[알림] 보안관제 자동화 종료 30일 전', channel: '이메일', status: '실패', reason: '메일 서버 응답 지연(timeout)' },
  { id: 'M-2038', dt: '2026-10-19 08:00', type: 'ERP 전송 실패 경보',  to: '권재준(60521)', subject: '[경보] ERP 예산 전송 실패 — 재시도 필요', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2037', dt: '2026-10-18 21:00', type: 'Finance 연계 실패',   to: '권재준(60521)', subject: '[경보] Finance 경비 전표 연계 오류', channel: '이메일', status: '실패', reason: '수신 주소 오류(반송)' },
  { id: 'M-2036', dt: '2026-10-18 17:40', type: '권한 변경 통지',      to: '정우성(13071)', subject: '[안내] PM 역할 권한이 변경되었습니다', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2035', dt: '2026-10-18 15:22', type: '환율 갱신 통지',      to: '운영팀',        subject: '[안내] 2026-10-18 환율 동기화 완료', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2034', dt: '2026-10-18 10:05', type: '재료비 검수 알림',    to: '장재호(15025)', subject: '[알림] IV107812 재료비 검수 요청', channel: '이메일', status: '실패', reason: '첨부파일 용량 초과(25MB)' },
  { id: 'M-2033', dt: '2026-10-18 09:10', type: '예산 반려 통지',      to: '한민석(20011)', subject: '[반려] 차세대 ERP W/G 비용 보완 요청', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2032', dt: '2026-10-17 18:44', type: 'P단가 변경 통지',     to: '운영팀',        subject: '[안내] P레벨 표준단가 변경 적용', channel: '이메일', status: '성공', reason: '' },
  { id: 'M-2031', dt: '2026-10-17 09:18', type: '로그인 실패 경보',    to: '권재준(60521)', subject: '[보안] 로그인 실패 임계 초과 — 정우성', channel: '이메일', status: '실패', reason: 'SMTP 인증 거부(5.7.1)' },
  { id: 'M-2030', dt: '2026-10-17 03:00', type: '월마감 인건비 반영',  to: 'PM·담당자',     subject: '[안내] 10월 인건비 실적 생성 완료', channel: '이메일', status: '성공', reason: '' },
];

// ── 화면 상태 ──
var admMailFilter = '전체';   // 전체 | 성공 | 실패

function admMailEsc(s) { return (typeof admEsc === 'function') ? admEsc(s) : String(s == null ? '' : s); }
function admMailNow() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function admMailFiltered() {
  var q = (admSearch.mail || '').trim().toLowerCase();
  return ADM_MAIL.filter(function (m) {
    if (admMailFilter !== '전체' && m.status !== admMailFilter) return false;
    if (q && [m.id, m.type, m.to, m.subject, m.status, m.reason].join(' ').toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

function admMailHtml() {
  var total = ADM_MAIL.length;
  var ok = ADM_MAIL.filter(function (m) { return m.status === '성공'; }).length;
  var fail = ADM_MAIL.filter(function (m) { return m.status === '실패'; }).length;
  var rows = admMailFiltered();
  var body = rows.length ? rows.map(function (m) {
    var pill = m.status === '성공' ? '<span class="adm-pill green">성공</span>' : '<span class="adm-pill red">실패</span>';
    var act = m.status === '실패'
      ? '<button class="adm-btn sm pri" onclick="admMailResend(\'' + m.id + '\')">재발송</button>'
      : '<span class="adm-muted">-</span>';
    return '<tr><td class="adm-code">' + admMailEsc(m.dt) + '</td>'
      + '<td>' + admMailEsc(m.type) + '</td>'
      + '<td>' + admMailEsc(m.to) + '</td>'
      + '<td class="adm-muted">' + admMailEsc(m.subject) + '</td>'
      + '<td><span class="adm-tag">' + admMailEsc(m.channel) + '</span></td>'
      + '<td>' + pill + '</td>'
      + '<td class="adm-muted">' + admMailEsc(m.reason || '-') + '</td>'
      + '<td style="white-space:nowrap;text-align:center">' + act + '</td></tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:22px">조건에 맞는 메일 발송 이력이 없습니다.</td></tr>';

  var opts = ['전체', '성공', '실패'].map(function (s) { return '<option' + (s === admMailFilter ? ' selected' : '') + '>' + s + '</option>'; }).join('');
  return '<div class="adm-mail-sum">'
    + '<div><span>총 발송</span><b>' + total + '</b>건</div>'
    + '<div><span>성공</span><b class="ok">' + ok + '</b>건</div>'
    + '<div><span>실패</span><b class="fail">' + fail + '</b>건</div></div>'
    + '<div class="adm-toolbar">'
    + '<select class="adm-filter" onchange="admMailSetFilter(this.value)">' + opts + '</select>'
    + '<input class="adm-search" placeholder="유형·수신자·제목·사유 검색…" value="' + admMailEsc(admSearch.mail || '') + '" oninput="admMailSearch(this.value)">'
    + '<button class="adm-btn" onclick="admMailResendAllFailed()"' + (fail ? '' : ' disabled') + '>⟳ 실패 전체 재발송 (' + fail + ')</button>'
    + '<span class="adm-count">' + rows.length + '건</span></div>'
    + '<table class="adm-table"><thead><tr><th>발송일시</th><th>유형</th><th>수신자</th><th>제목</th><th>채널</th><th>상태</th><th>실패 사유</th><th>재발송</th></tr></thead>'
    + '<tbody>' + body + '</tbody></table>'
    + '<div class="adm-note">※ 시스템이 발송한 메일의 성공/실패를 기록합니다. <b>실패 건은 [재발송]</b>으로 다시 보낼 수 있습니다(반송·주소 오류는 수신자 확인 후 재발송).<br>'
    + '※ 알림 트리거·채널·수신 대상 설정은 [운영모니터링]에서 관리합니다.</div>';
}

// ── 이벤트 ──
function admMailSetFilter(v) { admMailFilter = v; asiteRender(); }
function admMailSearch(v) { admSearch.mail = v; asiteRender(); }
function admMailResend(id) {
  var m = ADM_MAIL.filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  admToast(m.type + ' 메일 재발송 중…');
  setTimeout(function () {
    m.status = '성공'; m.reason = ''; m.dt = admMailNow();
    asiteRender();
    admToast(m.to + ' 에게 메일을 재발송했습니다. (성공)');
  }, 700);
}
function admMailResendAllFailed() {
  var fails = ADM_MAIL.filter(function (m) { return m.status === '실패'; });
  if (!fails.length) { admToast('재발송할 실패 건이 없습니다.'); return; }
  admToast('실패 ' + fails.length + '건 재발송 중…');
  setTimeout(function () {
    fails.forEach(function (m) { m.status = '성공'; m.reason = ''; m.dt = admMailNow(); });
    asiteRender();
    admToast('실패 ' + fails.length + '건을 모두 재발송했습니다.');
  }, 800);
}

// ── 메뉴 · 화면 끼워 넣기 ──
(function admMailInstall() {
  if (typeof ADMIN_SECTIONS === 'undefined' || ADMIN_SECTIONS.some(function (s) { return s.key === 'mail'; })) return;
  // 운영·연계 그룹의 운영모니터링(notify) 바로 뒤에 배치
  var at = ADMIN_SECTIONS.findIndex(function (s) { return s.key === 'notify'; });
  var sec = { key: 'mail', icon: '✉️', title: '메일관리', group: 'ops', desc: '시스템 발송 메일의 성공/실패 이력을 관리하고, 실패 건을 재발송합니다.', src: '메일 서버 발송 결과(SMTP) 수신 · 실패 시 수동 재발송' };
  ADMIN_SECTIONS.splice(at < 0 ? ADMIN_SECTIONS.length : at + 1, 0, sec);
  if (typeof admSectionBody === 'function') {
    var admSectionBodyBeforeMail = admSectionBody;
    admSectionBody = function (key) {
      if (key === 'mail') return admMailHtml();
      return admSectionBodyBeforeMail(key);
    };
  }
  if (!document.getElementById('adm-mail-style')) {
    var st = document.createElement('style'); st.id = 'adm-mail-style';
    st.textContent = [
      '.adm-mail-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 14px}',
      '.adm-mail-sum div{background:#fff;border:1px solid var(--sk-border);border-radius:10px;padding:10px 12px;font-size:12px;color:#64748b}',
      '.adm-mail-sum span{display:block;font-weight:700;margin-bottom:2px}',
      '.adm-mail-sum b{font-size:18px;font-weight:900;color:var(--sk-ink);margin-right:2px;font-variant-numeric:tabular-nums}',
      '.adm-mail-sum b.ok{color:#167a4a}.adm-mail-sum b.fail{color:#c40025}',
    ].join('\n');
    document.head.appendChild(st);
  }
})();
