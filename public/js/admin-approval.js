// ════════════════════════════════════════
//  관리자 > 결재라인 관리                               작성: 수진
// ════════════════════════════════════════
//
// admin.js 를 고치지 않고, 그 뒤에 로드되어 메뉴와 화면을 끼워 넣습니다(golden 패턴).
//   · ADMIN_SECTIONS 에 'apvline' 메뉴를 기준정보(master) 그룹으로 추가
//   · admSectionBody 를 데코레이터로 감싸 'apvline' 만 여기서 그립니다
//
// 결재라인의 '기준'을 관리하는 화면. 업무구분(실행예산·사내·W/G)별로
// 금액 구간·조직·서비스기획 여부 등 조건에 따라 결재선이 다르게 생성되는데, 그 규칙을 관리.

// ── 목업 데이터: 결재라인 기준 규칙 ──
var ADM_APVLINE = [
  // 실행예산 — 금액 구간별 전결
  { id: 'AL-01', type: '실행예산', cond: '금액 1억원 미만',        line: '기안(작성 PM) → 승인(팀장)', use: '사용', note: '팀장 전결' },
  { id: 'AL-02', type: '실행예산', cond: '금액 1억 ~ 5억원',       line: '기안(PM) → 검토(팀장) → 승인(담당임원)', use: '사용', note: '' },
  { id: 'AL-03', type: '실행예산', cond: '금액 5억원 이상',        line: '기안(PM) → 검토(팀장) → 승인(담당임원) → 승인(본부장)', use: '사용', note: '본부장 전결' },
  // 사내 개설
  { id: 'AL-04', type: '사내',    cond: '기본 (사내 개설)',        line: '기안(신청자) → 협조(운영팀장) → 승인(담당임원)', use: '사용', note: '' },
  { id: 'AL-05', type: '사내',    cond: '조직: 전사 공통과제',     line: '기안(신청자) → 협조(운영팀장) → 협조(기획팀) → 승인(담당임원)', use: '사용', note: '공통조직 협조 추가' },
  // W/G 개설 — 비용 규모 · 서비스기획 여부
  { id: 'AL-06', type: 'W/G',    cond: 'W/G 비용 30억 미만 · 서비스기획 N', line: '기안(수행PM) → 협조(부문기획 담당자) → 검토(팀장) → 승인(담당임원)', use: '사용', note: '' },
  { id: 'AL-07', type: 'W/G',    cond: 'W/G 비용 30억 미만 · 서비스기획 Y', line: '기안(수행PM) → 협조(Account WG담당자) → 협조(Account 팀장) → 검토(팀장) → 승인(담당임원)', use: '사용', note: '서비스기획 시 Account 협조 추가' },
  { id: 'AL-08', type: 'W/G',    cond: 'W/G 비용 30억 이상',       line: '기안(수행PM) → 협조(Account WG담당자) → 검토(팀장) → 승인(담당임원) → 승인(본부장)', use: '사용', note: '본부장 승인 추가' },
];
var ADM_APVLINE_TYPES = ['실행예산', '사내', 'W/G'];

// ── 화면 상태 ──
var admApvTab = '실행예산';
var ADM_APVLINE_KEY = 'budgetai.admin.apvline.v1';
function admApvLoad() {
  try { var s = JSON.parse(localStorage.getItem(ADM_APVLINE_KEY) || 'null'); if (Array.isArray(s)) ADM_APVLINE = s; } catch (e) {}
}
function admApvPersist() { try { localStorage.setItem(ADM_APVLINE_KEY, JSON.stringify(ADM_APVLINE)); } catch (e) {} }
function admApvEsc(s) { return (typeof admEsc === 'function') ? admEsc(s) : String(s == null ? '' : s); }
function admApvLineChips(line) {
  return String(line || '').split('→').map(function (p) {
    p = p.trim(); if (!p) return '';
    return '<span class="adm-apv-step">' + admApvEsc(p) + '</span>';
  }).join('<span class="adm-apv-arr">→</span>');
}

function admApvHtml() {
  var tabs = '<div class="adm-apv-tabs">' + ADM_APVLINE_TYPES.map(function (t) {
    var n = ADM_APVLINE.filter(function (r) { return r.type === t; }).length;
    return '<button class="' + (admApvTab === t ? 'on' : '') + '" onclick="admApvTabSet(\'' + t + '\')">' + t + ' <b>' + n + '</b></button>';
  }).join('') + '</div>';

  var list = ADM_APVLINE.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return x.r.type === admApvTab; });
  var body = list.length ? list.map(function (x) {
    var r = x.r, i = x.i;
    return '<tr><td style="min-width:11em"><b>' + admApvEsc(r.cond) + '</b>' + (r.note ? '<div class="adm-muted" style="margin-top:3px">' + admApvEsc(r.note) + '</div>' : '') + '</td>'
      + '<td>' + admApvLineChips(r.line) + '</td>'
      + '<td><button class="adm-pill ' + (r.use === '사용' ? 'green' : 'gray') + '" style="cursor:pointer" onclick="admApvToggle(' + i + ')">' + admApvEsc(r.use) + '</button></td>'
      + '<td style="white-space:nowrap;text-align:right"><button class="adm-btn sm" onclick="admApvForm(' + i + ')">수정</button> <button class="adm-btn sm del" onclick="admApvAskDelete(' + i + ')">삭제</button></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:22px">' + admApvEsc(admApvTab) + ' 결재라인 기준이 없습니다. [＋ 기준 등록]으로 추가하세요.</td></tr>';

  return tabs
    + '<div class="adm-toolbar"><button class="adm-btn pri" onclick="admApvForm(null)">＋ 기준 등록</button>'
    + '<button class="adm-btn" onclick="admSave(\'결재라인 기준\')">저장</button>'
    + '<span class="adm-count">' + list.length + '건</span></div>'
    + '<table class="adm-table"><thead><tr><th>적용 조건</th><th>결재선</th><th>사용</th><th></th></tr></thead>'
    + '<tbody>' + body + '</tbody></table>'
    + '<div class="adm-note">※ 결재라인은 <b>업무구분(실행예산·사내·W/G)</b>에 따라 다르고, 같은 업무 안에서도 <b>금액 구간·조직·서비스기획 여부</b> 등 조건에 맞춰 자동 생성됩니다. 이 화면은 그 <b>생성 기준</b>을 관리합니다.<br>'
    + '※ 결재선은 <code>기안(…) → 협조(…) → 검토(…) → 승인(…)</code> 형식으로 입력합니다(단계는 → 로 구분).</div>';
}

// ── 이벤트 ──
function admApvTabSet(t) { admApvTab = t; asiteRender(); }
function admApvToggle(i) { var r = ADM_APVLINE[i]; if (!r) return; r.use = (r.use === '사용' ? '미사용' : '사용'); admApvPersist(); asiteRender(); }
function admApvAskDelete(i) {
  var r = ADM_APVLINE[i]; if (!r) return;
  admModal('<div class="adm-modal" style="width:420px">'
    + '<div class="adm-modal-head"><b>삭제 확인</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div style="padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.6"><b>' + admApvEsc(r.type) + ' · ' + admApvEsc(r.cond) + '</b> 결재라인 기준을 삭제하시겠습니까?<br><span class="adm-muted">삭제 후에는 되돌릴 수 없습니다.</span></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" style="background:#dc2626;border-color:#dc2626;color:#fff" onclick="admApvDelete(' + i + ')">삭제</button></div></div>');
}
function admApvDelete(i) { if (ADM_APVLINE[i] != null) ADM_APVLINE.splice(i, 1); admApvPersist(); admCloseModal(); asiteRender(); admToast('결재라인 기준을 삭제했습니다.'); }
function admApvForm(i) {
  i = (i == null || i === 'null') ? null : Number(i);
  var r = i != null ? ADM_APVLINE[i] : { type: admApvTab, use: '사용' };
  var typeSel = ADM_APVLINE_TYPES.map(function (t) { return '<option' + (r.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
  admModal('<div class="adm-modal wide">'
    + '<div class="adm-modal-head"><b>' + (i != null ? '결재라인 기준 수정' : '결재라인 기준 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">'
    + '<div class="adm-field"><label>업무구분<span class="req">*</span></label><select id="adm-al-type">' + typeSel + '</select></div>'
    + '<div class="adm-field"><label>적용 조건<span class="req">*</span></label><input id="adm-al-cond" value="' + admApvEsc(r.cond || '') + '" placeholder="예: 금액 1억 ~ 5억원 / 서비스기획 Y"></div>'
    + '<div class="adm-field full"><label>결재선<span class="req">*</span></label><input id="adm-al-line" value="' + admApvEsc(r.line || '') + '" placeholder="기안(PM) → 검토(팀장) → 승인(담당임원)"></div>'
    + '<div class="adm-field"><label>사용여부</label><select id="adm-al-use"><option' + (r.use !== '미사용' ? ' selected' : '') + '>사용</option><option' + (r.use === '미사용' ? ' selected' : '') + '>미사용</option></select></div>'
    + '<div class="adm-field"><label>비고</label><input id="adm-al-note" value="' + admApvEsc(r.note || '') + '"></div>'
    + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="admApvSave(' + (i != null ? i : 'null') + ')">' + (i != null ? '수정' : '등록') + '</button></div></div>');
}
function admApvSave(i) {
  i = (i == null || i === 'null') ? null : Number(i);
  var g = function (id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; };
  var obj = { type: g('adm-al-type'), cond: g('adm-al-cond'), line: g('adm-al-line'), use: g('adm-al-use'), note: g('adm-al-note') };
  if (!obj.cond || !obj.line) { admToast('적용 조건과 결재선은 필수입니다.'); return; }
  if (i != null) { obj.id = ADM_APVLINE[i].id; ADM_APVLINE[i] = obj; }
  else {
    var max = ADM_APVLINE.reduce(function (m, r) { return Math.max(m, Number(String(r.id).split('-')[1]) || 0); }, 0);
    obj.id = 'AL-' + ('0' + (max + 1)).slice(-2);
    ADM_APVLINE.push(obj);
  }
  admApvTab = obj.type;
  admApvPersist(); admCloseModal(); asiteRender(); admToast('결재라인 기준을 ' + (i != null ? '수정' : '등록') + '했습니다.');
}

// ── 메뉴 · 화면 끼워 넣기 ──
(function admApvInstall() {
  if (typeof ADMIN_SECTIONS === 'undefined' || ADMIN_SECTIONS.some(function (s) { return s.key === 'apvline'; })) return;
  admApvLoad();
  // 기준정보 그룹 — 코드 관리 바로 뒤에 배치
  var at = ADMIN_SECTIONS.findIndex(function (s) { return s.key === 'code'; });
  var sec = { key: 'apvline', icon: '🧾', title: '결재라인 관리', group: 'master', desc: '업무구분(실행예산·사내·W/G)별 금액·조직·서비스기획 조건에 따른 결재선 생성 기준을 관리합니다.', src: '관리자 직접 설정 (전결규정·조직 기준)' };
  ADMIN_SECTIONS.splice(at < 0 ? ADMIN_SECTIONS.length : at + 1, 0, sec);
  if (typeof admSectionBody === 'function') {
    var admSectionBodyBeforeApv = admSectionBody;
    admSectionBody = function (key) {
      if (key === 'apvline') return admApvHtml();
      return admSectionBodyBeforeApv(key);
    };
  }
  if (!document.getElementById('adm-apv-style')) {
    var st = document.createElement('style'); st.id = 'adm-apv-style';
    st.textContent = [
      '.adm-apv-tabs{display:inline-flex;gap:2px;padding:3px;margin:0 0 14px;background:#eef1f6;border-radius:10px}',
      '.adm-apv-tabs button{border:0;background:none;padding:7px 16px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:800;color:#64748b;cursor:pointer}',
      '.adm-apv-tabs button.on{background:#fff;color:var(--sk-ink);box-shadow:0 1px 3px rgba(15,23,42,.12)}',
      '.adm-apv-tabs button b{margin-left:5px;color:var(--sk-blue);font-variant-numeric:tabular-nums}',
      '.adm-apv-step{display:inline-block;background:var(--sk-blue-soft);color:var(--sk-blue-deep);border:1px solid #cfe0fb;border-radius:7px;padding:2px 9px;font-size:11.5px;font-weight:700;margin:2px 0;white-space:nowrap}',
      '.adm-apv-arr{color:#94a3b8;margin:0 5px;font-weight:800}',
    ].join('\n');
    document.head.appendChild(st);
  }
})();
