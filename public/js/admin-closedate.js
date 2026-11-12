// ════════════════════════════════════════
//  관리자 > 회계결산일자 관리                          작성: 수진
// ════════════════════════════════════════
//
// admin.js(수진) 를 고치지 않고, 그 뒤에 로드되어 메뉴와 화면을 끼워 넣습니다(golden 패턴과 동일).
//   · ADMIN_SECTIONS 에 'closedate' 메뉴를 추가(부트 렌더 전)
//   · admSectionBody 를 데코레이터로 감싸 'closedate' 만 여기서 그리고 나머지는 원래 함수로 넘깁니다
//
// 적용연도 선택 → 그 해 월별 회계 결산/마감 일시를 조회(조회 전용). ERP 월마감 일정 수신값(목업).
//   컬럼: 적용 연월 · 회계 결산 일시 · 이전 회계 결산 일시 · 회계 마감 일시 · 이전 회계 마감 일시
//   '이전' 두 컬럼은 직전 월(적용연월 −1)의 결산/마감 일시를 그대로 보여 줍니다.

// ── 목업 데이터: 적용연월(YYYYMM) → { s: 회계결산일, c: 회계마감일 } ──
//    '이전' 값은 직전 월 키에서 파생하므로, 1월의 '이전'을 위해 전년 12월도 둡니다.
var ADM_CLOSEDATE = {
  // 2025년 (전년 12월은 2026년 1월의 '이전' 근거)
  '202501': { s: '2025-01-27', c: '2025-01-28' },
  '202502': { s: '2025-02-24', c: '2025-02-25' },
  '202503': { s: '2025-03-28', c: '2025-03-31' },
  '202504': { s: '2025-04-28', c: '2025-04-29' },
  '202505': { s: '2025-05-27', c: '2025-05-28' },
  '202506': { s: '2025-06-27', c: '2025-06-30' },
  '202507': { s: '2025-07-28', c: '2025-07-29' },
  '202508': { s: '2025-08-27', c: '2025-08-28' },
  '202509': { s: '2025-09-26', c: '2025-09-29' },
  '202510': { s: '2025-10-28', c: '2025-10-29' },
  '202511': { s: '2025-11-27', c: '2025-11-28' },
  '202512': { s: '2025-12-31', c: '2026-01-05' },
  // 2026년 (캡처 기준)
  '202601': { s: '2026-01-27', c: '2026-01-28' },
  '202602': { s: '2026-02-24', c: '2026-02-25' },
  '202603': { s: '2026-03-30', c: '2026-03-31' },
  '202604': { s: '2026-04-27', c: '2026-04-28' },
  '202605': { s: '2026-05-26', c: '2026-05-27' },
  '202606': { s: '2026-06-29', c: '2026-06-30' },
  '202607': { s: '2026-07-28', c: '2026-07-29' },
  '202608': { s: '2026-08-26', c: '2026-08-27' },
  '202609': { s: '2026-09-29', c: '2026-09-30' },
  '202610': { s: '2026-10-27', c: '2026-10-28' },
};

// ── 화면 상태 ──
var admCloseYear = '2026';

// ── 운영자 입력 영속화(localStorage) — 입력/수정/삭제분 유지 ──
var ADM_CLOSEDATE_KEY = 'budgetai.admin.closedate.v1';
function admCloseDateLoad() {
  try { var s = JSON.parse(localStorage.getItem(ADM_CLOSEDATE_KEY) || 'null'); if (s && typeof s === 'object') ADM_CLOSEDATE = s; } catch (e) {}
}
function admCloseDatePersist() { try { localStorage.setItem(ADM_CLOSEDATE_KEY, JSON.stringify(ADM_CLOSEDATE)); } catch (e) {} }

// ── 유틸 ──
function admCdPrevYm(ym) {
  var y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(4), 10);
  m -= 1; if (m < 1) { m = 12; y -= 1; }
  return '' + y + ('0' + m).slice(-2);
}
function admCdTime(d) { return d ? d + ' 00:00' : '-'; }
function admCdYears() {
  var set = {};
  Object.keys(ADM_CLOSEDATE).forEach(function (k) { set[k.slice(0, 4)] = 1; });
  set['2027'] = 1;   // 미래연도(미생성) 선택지도 노출
  return Object.keys(set).sort().reverse();
}

// ── 렌더 ──
function admCloseDateHtml() {
  var yearOpts = admCdYears().map(function (y) {
    return '<option' + (y === admCloseYear ? ' selected' : '') + '>' + y + '</option>';
  }).join('');
  return '<div class="acd-bar">'
    + '<button class="adm-btn pri acd-add" onclick="admCloseDateForm(null)">＋ 결산일자 등록</button>'
    + '<span class="acd-spacer"></span>'
    + '<label class="acd-yl" for="acd-year">적용연도</label>'
    + '<select class="acd-year" id="acd-year" onchange="admCloseDateYear(this.value)">' + yearOpts + '</select>'
    + '<button class="adm-btn acd-search" onclick="admCloseDateSearch()">검색</button>'
    + '</div>'
    + '<div class="acd-title">' + admCloseYear + ' 년도 회계결산일자</div>'
    + '<table class="adm-table acd-table"><thead><tr>'
    + '<th style="text-align:center">적용 연월</th>'
    + '<th class="num">회계 결산 일시</th><th class="num">이전 회계 결산 일시</th>'
    + '<th class="num">회계 마감 일시</th><th class="num">이전 회계 마감 일시</th>'
    + '<th style="text-align:center">관리</th>'
    + '</tr></thead><tbody>' + admCloseDateRows(admCloseYear) + '</tbody></table>'
    + '<div class="adm-note">※ 회계 결산·마감 일시는 <b>운영자가 직접 입력</b>합니다([＋ 결산일자 등록]). 경비 등 실적 마감월 판단의 기준값입니다.<br>'
    + '※ \'이전\' 두 컬럼은 직전 월(적용연월 −1개월)의 결산·마감 일시로 자동 계산됩니다.</div>';
}
function admCloseDateRows(year) {
  var keys = Object.keys(ADM_CLOSEDATE).filter(function (k) { return k.slice(0, 4) === year; }).sort().reverse();
  if (!keys.length) {
    return '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:26px">' + admEsc(year) + '년도의 회계결산일자가 없습니다. [＋ 결산일자 등록]으로 입력하세요.</td></tr>';
  }
  return keys.map(function (k) {
    var cur = ADM_CLOSEDATE[k];
    var prev = ADM_CLOSEDATE[admCdPrevYm(k)] || null;
    return '<tr><td style="text-align:center"><b>' + k + '</b></td>'
      + '<td class="num">' + admCdTime(cur.s) + '</td>'
      + '<td class="num adm-muted">' + (prev ? admCdTime(prev.s) : '-') + '</td>'
      + '<td class="num">' + admCdTime(cur.c) + '</td>'
      + '<td class="num adm-muted">' + (prev ? admCdTime(prev.c) : '-') + '</td>'
      + '<td style="white-space:nowrap;text-align:center"><button class="adm-btn sm" onclick="admCloseDateForm(\'' + k + '\')">수정</button> <button class="adm-btn sm del" onclick="admCloseDateAskDelete(\'' + k + '\')">삭제</button></td></tr>';
  }).join('');
}

// ── 이벤트 ──
function admCloseDateYear(y) { admCloseYear = y; asiteRender(); }
function admCloseDateSearch() {
  var el = document.getElementById('acd-year');
  if (el) admCloseYear = el.value;
  asiteRender();
  admToast(admCloseYear + '년도 회계결산일자를 조회했습니다.');
}

// ── 운영자 입력(등록/수정/삭제) ──
function admCloseDateForm(ym) {
  ym = (ym == null || ym === 'null') ? null : String(ym);
  var cur = ym ? (ADM_CLOSEDATE[ym] || {}) : {};
  admModal('<div class="adm-modal">'
    + '<div class="adm-modal-head"><b>' + (ym ? '회계결산일자 수정' : '회계결산일자 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">'
    + '<div class="adm-field full"><label>적용연월 (YYYYMM)<span class="req">*</span></label>'
    + '<input id="acd-f-ym" type="text" maxlength="6" value="' + admEsc(ym || '') + '" placeholder="예: 202611"' + (ym ? ' readonly' : '') + '></div>'
    + '<div class="adm-field"><label>회계 결산일<span class="req">*</span></label><input id="acd-f-s" type="date" value="' + admEsc(cur.s || '') + '"></div>'
    + '<div class="adm-field"><label>회계 마감일<span class="req">*</span></label><input id="acd-f-c" type="date" value="' + admEsc(cur.c || '') + '"></div>'
    + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="admCloseDateSave(' + (ym ? '\'' + ym + '\'' : 'null') + ')">' + (ym ? '수정' : '등록') + '</button></div></div>');
}
function admCloseDateSave(ym) {
  ym = (ym == null || ym === 'null') ? null : String(ym);
  var g = function (id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; };
  var key = ym || g('acd-f-ym');
  var s = g('acd-f-s'), c = g('acd-f-c');
  if (!/^\d{6}$/.test(key)) { admToast('적용연월은 YYYYMM 6자리로 입력하세요.'); return; }
  if (!s || !c) { admToast('회계 결산일과 마감일을 입력하세요.'); return; }
  var isNew = !ADM_CLOSEDATE[key];
  ADM_CLOSEDATE[key] = { s: s, c: c };
  admCloseDatePersist();
  admCloseYear = key.slice(0, 4);
  admCloseModal(); asiteRender();
  admToast('회계결산일자(' + key + ')를 ' + (isNew ? '등록' : '수정') + '했습니다.');
}
function admCloseDateAskDelete(ym) {
  ym = String(ym);
  admModal('<div class="adm-modal" style="width:400px">'
    + '<div class="adm-modal-head"><b>삭제 확인</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div style="padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.6"><b>' + admEsc(ym) + '</b> 회계결산일자를 삭제하시겠습니까?<br><span class="adm-muted">삭제 후에는 되돌릴 수 없습니다.</span></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" style="background:#dc2626;border-color:#dc2626;color:#fff" onclick="admCloseDateDelete(\'' + ym + '\')">삭제</button></div></div>');
}
function admCloseDateDelete(ym) {
  ym = String(ym);
  if (ADM_CLOSEDATE[ym]) delete ADM_CLOSEDATE[ym];
  admCloseDatePersist(); admCloseModal(); asiteRender();
  admToast(ym + ' 회계결산일자를 삭제했습니다.');
}

// ── 메뉴 · 화면 끼워 넣기 ──
(function admCloseDateInstall() {
  if (typeof ADMIN_SECTIONS === 'undefined' || ADMIN_SECTIONS.some(function (s) { return s.key === 'closedate'; })) return;
  admCloseDateLoad();
  var at = ADMIN_SECTIONS.findIndex(function (s) { return s.tbd; });
  ADMIN_SECTIONS.splice(at < 0 ? ADMIN_SECTIONS.length : at, 0,
    { key: 'closedate', icon: '📅', title: '회계결산일자 관리', group: 'master', desc: '적용연도별 회계 결산·마감 일시를 운영자가 입력·관리합니다. (적용연월 · 결산/마감 일시 · 이전 결산/마감 일시)', src: '운영자 직접 입력 (회계 결산·마감 일자)' });
  if (typeof admSectionBody === 'function') {
    var admSectionBodyBeforeCloseDate = admSectionBody;
    admSectionBody = function (key) {
      if (key === 'closedate') return admCloseDateHtml();
      return admSectionBodyBeforeCloseDate(key);
    };
  }
  if (!document.getElementById('acd-style')) {
    var st = document.createElement('style'); st.id = 'acd-style';
    st.textContent = [
      '.acd-bar{display:flex;align-items:center;gap:10px;justify-content:flex-end;background:#f7f9fc;border:1px solid var(--sk-border);border-radius:12px;padding:14px 16px;margin:0 0 16px}',
      '.acd-spacer{flex:1}',
      '.acd-yl{font-size:12.5px;font-weight:800;color:#475569}',
      '.acd-year{border:1px solid var(--sk-border-strong);border-radius:8px;padding:8px 12px;font:inherit;font-size:12.5px;min-width:240px;background:#fff;color:#1f2937;cursor:pointer}',
      '.acd-year:focus{outline:none;border-color:var(--sk-blue);box-shadow:0 0 0 3px var(--sk-blue-soft)}',
      '.acd-search{min-width:68px;text-align:center}',
      '.acd-title{font-size:14px;font-weight:900;color:#0f172a;margin:0 0 10px;padding-left:10px;border-left:3px solid var(--sk-blue);line-height:1.2}',
      '.acd-table th,.acd-table td{white-space:nowrap}',
      '@media (max-width:620px){.acd-bar{flex-wrap:wrap;justify-content:flex-start}.acd-year{min-width:0;flex:1 1 140px}}',
    ].join('\n');
    document.head.appendChild(st);
  }
})();
