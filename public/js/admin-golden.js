// ════════════════════════════════════════
//  관리자 > Golden Data set 관리                       작성: 석완
// ════════════════════════════════════════
//
// admin.js(수진) 를 고치지 않고, 그 뒤에 로드되어 메뉴와 화면을 끼워 넣습니다.
//   · ADMIN_SECTIONS 에 'golden' 메뉴를 추가(부트 렌더 전 — admin.js 는 DOMContentLoaded 에 그림)
//   · admSectionBody 를 데코레이터로 감싸 'golden' 만 여기서 그리고 나머지는 원래 함수로 넘깁니다
//
// 탭 두 개로 나눕니다.
//   ① 질문·정답 셋 — 예산관리 Agent 평가용. 질문 · 기대 의도 · 기대 답변 요지 · 근거 데이터 · 최근 결과
//   ② 기준 데이터 셋 — Agent 제안·답변의 근거가 되는 기준값(CP총액 · 계정 한도 · 마감월 등)과 출처 시스템
// 목업 데이터이며 저장·평가 실행은 화면 상태만 바꿉니다.

// ── 목업 데이터 ──
var ADM_GOLDEN_INTENTS = [
  { v: 'cpgap',   t: 'CP 여유(GAP) 조회' },
  { v: 'delta',   t: '계정 증감' },
  { v: 'move',    t: '계정 간 이관' },
  { v: 'sub',     t: '상세계정 편성' },
  { v: 'pickall', t: '조정안 전부 반영' },
  { v: 'restore', t: '삭제한 제안 다시 불러오기' },
  { v: 'draft',   t: '기안' },
  { v: 'open',    t: '계정 상세 열기' },
];
var ADM_GOLDEN_QA = [
  { id: 'GQ-001', intent: 'cpgap', q: '지금 CP 여유 얼마야?',
    a: '① 최종 승인 실행예산 대비 GAP ② 반영해 둔 조정안 승인 시 GAP ③ 조정안 모두 반영 시 GAP 을 CP총액과 함께 답한다',
    data: 'CP총액(버전 budgets 합) · 승인 실행예산 · 예산 조정안 반영 여부', on: true, last: 'pass' },
  { id: 'GQ-002', intent: 'cpgap', q: '조정안 다 반영하면 CP 넘어?',
    a: '③ 모두 반영 시 GAP 이 음수면 초과 금액과 함께 일부 반영 또는 CP 증액을 안내한다',
    data: 'CP총액 · 예산 조정안 전체(택1 묶음은 1안)', on: true, last: 'pass' },
  { id: 'GQ-003', intent: 'delta', q: '외주비 3천만원 늘려줘',
    a: '외주비 +30,000,000원을 시뮬레이션하고 수립 예산 변동과 CP총액 소진율을 답한다',
    data: '외주비 수립 예산 · CP총액', on: true, last: 'pass' },
  { id: 'GQ-004', intent: 'move', q: '재료비에서 외주비로 1천만원 옮겨줘',
    a: '재료비 −10,000,000원 · 외주비 +10,000,000원, 총액 ±0원으로 답한다',
    data: '재료비 · 외주비 수립 예산', on: true, last: 'pass' },
  { id: 'GQ-005', intent: 'sub', q: 'OT비 천만원 편성해줘',
    a: '재원(CP 여유 증액 / 다른 계정 이관)을 먼저 묻는다',
    data: '인건비 상세계정 OT비', on: true, last: 'fail' },
  { id: 'GQ-006', intent: 'restore', q: '삭제한 제안 다시 불러와줘',
    a: '삭제했던 Agent 제안 건수를 알리고 예산 조정안에 되살린다(반영은 하지 않음)',
    data: '예산 조정안(삭제된 Agent 제안)', on: true, last: 'none' },
  { id: 'GQ-007', intent: 'pickall', q: '전부 반영해줘',
    a: '조정안을 모두 반영하되 택1 묶음은 1안만 고른다',
    data: '예산 조정안 · 택1 묶음', on: false, last: 'none' },
];
var ADM_GOLDEN_REF = [
  { id: 'GD-001', item: 'CP총액',              pjt: 'AI 기반 예산관리 시스템 구축', val: 2310000000, unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-002', item: '계정 CP한도 · 인건비',  pjt: 'AI 기반 예산관리 시스템 구축', val: 800000000,  unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-003', item: '계정 CP한도 · 외주비',  pjt: 'AI 기반 예산관리 시스템 구축', val: 1200000000, unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-004', item: '계정 CP한도 · 재료비',  pjt: 'AI 기반 예산관리 시스템 구축', val: 160000000,  unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-005', item: '계정 CP한도 · 경비',    pjt: 'AI 기반 예산관리 시스템 구축', val: 100000000,  unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-006', item: '계정 CP한도 · A/S Cost', pjt: 'AI 기반 예산관리 시스템 구축', val: 50000000,   unit: '원', src: 'AI PMO', base: '2026-10-01', on: true },
  { id: 'GD-007', item: '경비 실적 마감월',      pjt: '전사 공통', val: 202608, unit: 'YYYYMM', src: 'ERP', base: '2026-09-05', on: true },
  { id: 'GD-008', item: '택1 묶음 · 외주비 부족', pjt: 'AI 기반 예산관리 시스템 구축', val: 2, unit: '안', src: 'BMS Agent', base: '2026-09-01', on: true },
];
var ADM_GOLDEN_SRC = ['AI PMO', 'ERP', '구매', 'SCM', 'CRM', 'BMS Agent'];

// ── 화면 상태 ──
var admGoldenTab = 'qa';         // 'qa' | 'ref'
var admGoldenEdit = null;        // { tab, idx } — idx -1 = 새 항목
var admGoldenDelArm = null;      // { tab, idx } — 삭제 확인 대기
var admGoldenRunAt = '2026-10-27 18:20';

function admGoldenEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function admGoldenIntentLabel(v) {
  var f = ADM_GOLDEN_INTENTS.find(function (x) { return x.v === v; });
  return f ? f.t : v;
}
function admGoldenRefVal(r) {
  return r.unit === '원' ? admFmt(r.val) + ' 원' : admGoldenEsc(r.val) + (r.unit && r.unit !== 'YYYYMM' ? ' ' + admGoldenEsc(r.unit) : '');
}

// ── 렌더 ──
function admGoldenHtml() {
  var tabs = '<div class="agd-tabs" role="tablist">'
    + '<button role="tab" aria-selected="' + (admGoldenTab === 'qa') + '" class="' + (admGoldenTab === 'qa' ? 'on' : '') + '" onclick="admGoldenTabSet(\'qa\')">질문·정답 셋 <b>' + ADM_GOLDEN_QA.length + '</b></button>'
    + '<button role="tab" aria-selected="' + (admGoldenTab === 'ref') + '" class="' + (admGoldenTab === 'ref' ? 'on' : '') + '" onclick="admGoldenTabSet(\'ref\')">기준 데이터 셋 <b>' + ADM_GOLDEN_REF.length + '</b></button>'
    + '</div>';
  return tabs + (admGoldenTab === 'qa' ? admGoldenQaHtml() : admGoldenRefHtml());
}

function admGoldenQaHtml() {
  var act = ADM_GOLDEN_QA.filter(function (x) { return x.on; });
  var pass = act.filter(function (x) { return x.last === 'pass'; }).length;
  var fail = act.filter(function (x) { return x.last === 'fail'; }).length;
  var editing = admGoldenEdit && admGoldenEdit.tab === 'qa';
  var rows = ADM_GOLDEN_QA.map(function (x, i) {
    if (editing && admGoldenEdit.idx === i) return '<tr><td colspan="7">' + admGoldenQaForm(x) + '</td></tr>';
    var res = x.last === 'pass' ? '<span class="agd-res pass">통과</span>'
      : x.last === 'fail' ? '<span class="agd-res fail">실패</span>' : '<span class="agd-res none">미실행</span>';
    return '<tr><td><code class="agd-id">' + x.id + '</code></td>'
      + '<td><b>' + admGoldenEsc(x.q) + '</b><div class="agd-sub">' + admGoldenEsc(x.a) + '</div></td>'
      + '<td><span class="adm-tag">' + admGoldenEsc(admGoldenIntentLabel(x.intent)) + '</span></td>'
      + '<td class="agd-data">' + admGoldenEsc(x.data) + '</td>'
      + '<td>' + res + '</td>'
      + '<td><button class="adm-toggle ' + (x.on ? 'on' : 'off') + '" onclick="admGoldenToggle(\'qa\',' + i + ')">' + (x.on ? '사용' : '제외') + '</button></td>'
      + '<td class="agd-acts">' + admGoldenRowActs('qa', i) + '</td></tr>';
  }).join('');
  return '<div class="agd-sum">'
    + '<div><span>평가 대상</span><b>' + act.length + '</b>건</div>'
    + '<div><span>통과</span><b class="pass">' + pass + '</b>건</div>'
    + '<div><span>실패</span><b class="fail">' + fail + '</b>건</div>'
    + '<div><span>최근 실행</span><b class="at">' + admGoldenRunAt + '</b></div></div>'
    + '<div class="adm-toolbar">'
    + '<button class="adm-btn pri" onclick="admGoldenRun()">평가 실행</button>'
    + '<button class="adm-btn" onclick="admGoldenAdd(\'qa\')">+ 질문 등록</button>'
    + '<button class="adm-btn" onclick="admSave(\'Golden 질문·정답 셋\')">저장</button></div>'
    + (editing && admGoldenEdit.idx < 0 ? admGoldenQaForm(null) : '')
    + '<table class="adm-table agd-table"><thead><tr><th>ID</th><th>질문 · 기대 답변</th><th>기대 의도</th><th>근거 데이터</th><th>최근 결과</th><th>사용</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ 평가 실행은 사용 중인 질문을 예산관리 Agent에 보내 응답의 의도·핵심 수치가 기대 답변과 맞는지 판정합니다. (목업: 저장된 판정을 다시 표시)<br>'
    + '※ 기대 답변의 수치는 [기준 데이터 셋]의 값을 근거로 합니다. 기준값이 바뀌면 관련 질문을 다시 평가하세요.</div>';
}

function admGoldenRefHtml() {
  var editing = admGoldenEdit && admGoldenEdit.tab === 'ref';
  var rows = ADM_GOLDEN_REF.map(function (r, i) {
    if (editing && admGoldenEdit.idx === i) return '<tr><td colspan="8">' + admGoldenRefForm(r) + '</td></tr>';
    return '<tr><td><code class="agd-id">' + r.id + '</code></td>'
      + '<td><b>' + admGoldenEsc(r.item) + '</b></td>'
      + '<td>' + admGoldenEsc(r.pjt) + '</td>'
      + '<td class="num">' + admGoldenRefVal(r) + '</td>'
      + '<td><span class="adm-tag">' + admGoldenEsc(r.src) + '</span></td>'
      + '<td>' + admGoldenEsc(r.base) + '</td>'
      + '<td><button class="adm-toggle ' + (r.on ? 'on' : 'off') + '" onclick="admGoldenToggle(\'ref\',' + i + ')">' + (r.on ? '사용' : '제외') + '</button></td>'
      + '<td class="agd-acts">' + admGoldenRowActs('ref', i) + '</td></tr>';
  }).join('');
  return '<div class="adm-toolbar">'
    + '<button class="adm-btn pri" onclick="admSave(\'Golden 기준 데이터 셋\')">저장</button>'
    + '<button class="adm-btn" onclick="admGoldenAdd(\'ref\')">+ 기준 데이터 등록</button></div>'
    + (editing && admGoldenEdit.idx < 0 ? admGoldenRefForm(null) : '')
    + '<table class="adm-table agd-table"><thead><tr><th>ID</th><th>항목</th><th>프로젝트</th><th class="num">기준값</th><th>출처 시스템</th><th>기준일</th><th>사용</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div class="adm-note">※ Agent 제안과 답변이 근거로 쓰는 기준값입니다. 출처 시스템의 값이 바뀌면 기준일과 함께 갱신하고, 질문·정답 셋을 다시 평가합니다.</div>';
}

function admGoldenRowActs(tab, i) {
  var arm = admGoldenDelArm && admGoldenDelArm.tab === tab && admGoldenDelArm.idx === i;
  if (arm) {
    return '<span class="agd-delask">삭제할까요?</span>'
      + '<button class="adm-btn agd-danger" onclick="admGoldenDelete(\'' + tab + '\',' + i + ')">삭제</button>'
      + '<button class="adm-btn" onclick="admGoldenDelCancel()">취소</button>';
  }
  return '<button class="adm-btn" onclick="admGoldenEditOpen(\'' + tab + '\',' + i + ')">수정</button>'
    + '<button class="adm-btn agd-del" onclick="admGoldenDelAsk(\'' + tab + '\',' + i + ')">삭제</button>';
}

function admGoldenQaForm(x) {
  var opts = ADM_GOLDEN_INTENTS.map(function (o) {
    return '<option value="' + o.v + '"' + (x && x.intent === o.v ? ' selected' : '') + '>' + o.t + '</option>';
  }).join('');
  return '<div class="agd-form">'
    + '<div class="agd-form-t">' + (x ? x.id + ' 수정' : '새 질문 등록') + '</div>'
    + '<div class="agd-grid">'
    + '<label class="wide">질문<input id="agd-q" type="text" value="' + admGoldenEsc(x && x.q) + '" placeholder="예: 지금 CP 여유 얼마야?"></label>'
    + '<label>기대 의도<select id="agd-intent">' + opts + '</select></label>'
    + '<label class="full">기대 답변 요지<textarea id="agd-a" rows="3" placeholder="답변에 반드시 들어가야 할 내용과 수치">' + admGoldenEsc(x && x.a) + '</textarea></label>'
    + '<label class="full">근거 데이터<input id="agd-data" type="text" value="' + admGoldenEsc(x && x.data) + '" placeholder="예: CP총액 · 승인 실행예산 · 예산 조정안"></label>'
    + '</div><div class="agd-form-bar">'
    + '<button class="adm-btn" onclick="admGoldenEditClose()">취소</button>'
    + '<button class="adm-btn pri" onclick="admGoldenSaveQa()">' + (x ? '수정' : '등록') + '</button></div></div>';
}

function admGoldenRefForm(r) {
  var srcs = ADM_GOLDEN_SRC.map(function (s) {
    return '<option' + (r && r.src === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');
  return '<div class="agd-form">'
    + '<div class="agd-form-t">' + (r ? r.id + ' 수정' : '새 기준 데이터 등록') + '</div>'
    + '<div class="agd-grid">'
    + '<label class="wide">항목<input id="agd-item" type="text" value="' + admGoldenEsc(r && r.item) + '" placeholder="예: 계정 CP한도 · 외주비"></label>'
    + '<label>출처 시스템<select id="agd-src">' + srcs + '</select></label>'
    + '<label class="wide">프로젝트<input id="agd-pjt" type="text" value="' + admGoldenEsc(r && r.pjt) + '" placeholder="프로젝트명 또는 전사 공통"></label>'
    + '<label>기준일<input id="agd-base" type="date" value="' + admGoldenEsc(r && r.base) + '"></label>'
    + '<label>기준값<input id="agd-val" type="text" value="' + admGoldenEsc(r ? r.val : '') + '" placeholder="숫자"></label>'
    + '<label>단위<input id="agd-unit" type="text" value="' + admGoldenEsc(r ? r.unit : '원') + '"></label>'
    + '</div><div class="agd-form-bar">'
    + '<button class="adm-btn" onclick="admGoldenEditClose()">취소</button>'
    + '<button class="adm-btn pri" onclick="admGoldenSaveRef()">' + (r ? '수정' : '등록') + '</button></div></div>';
}

// ── 이벤트 ──
function admGoldenTabSet(t) { admGoldenTab = t; admGoldenEdit = null; admGoldenDelArm = null; asiteRender(); }
function admGoldenAdd(tab) { admGoldenEdit = { tab: tab, idx: -1 }; admGoldenDelArm = null; asiteRender(); admGoldenFocus(); }
function admGoldenEditOpen(tab, i) { admGoldenEdit = { tab: tab, idx: i }; admGoldenDelArm = null; asiteRender(); admGoldenFocus(); }
function admGoldenEditClose() { admGoldenEdit = null; asiteRender(); }
function admGoldenFocus() {
  var f = document.querySelector('.agd-form input, .agd-form textarea');
  if (f) f.focus();
}
function admGoldenToggle(tab, i) {
  var list = tab === 'qa' ? ADM_GOLDEN_QA : ADM_GOLDEN_REF;
  if (list[i]) { list[i].on = !list[i].on; asiteRender(); }
}
function admGoldenDelAsk(tab, i) { admGoldenDelArm = { tab: tab, idx: i }; asiteRender(); }
function admGoldenDelCancel() { admGoldenDelArm = null; asiteRender(); }
function admGoldenDelete(tab, i) {
  var list = tab === 'qa' ? ADM_GOLDEN_QA : ADM_GOLDEN_REF;
  var gone = list.splice(i, 1)[0];
  admGoldenDelArm = null; admGoldenEdit = null;
  asiteRender();
  if (gone) admToast(gone.id + ' 를 삭제했습니다.');
}
function admGoldenVal(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}
function admGoldenNextId(list, prefix) {
  var max = list.reduce(function (m, x) { return Math.max(m, Number(String(x.id).split('-')[1]) || 0); }, 0);
  return prefix + '-' + ('00' + (max + 1)).slice(-3);
}
function admGoldenSaveQa() {
  var q = admGoldenVal('agd-q'), a = admGoldenVal('agd-a');
  if (!q || !a) { admToast('질문과 기대 답변 요지를 입력해 주세요.'); return; }
  var body = { q: q, a: a, intent: admGoldenVal('agd-intent'), data: admGoldenVal('agd-data') };
  var i = admGoldenEdit ? admGoldenEdit.idx : -1;
  if (i >= 0 && ADM_GOLDEN_QA[i]) {
    Object.assign(ADM_GOLDEN_QA[i], body, { last: 'none' });   // 기대 답변이 바뀌면 다시 평가해야 합니다
    admToast(ADM_GOLDEN_QA[i].id + ' 를 수정했습니다. 다시 평가해 주세요.');
  } else {
    var id = admGoldenNextId(ADM_GOLDEN_QA, 'GQ');
    ADM_GOLDEN_QA.push(Object.assign({ id: id, on: true, last: 'none' }, body));
    admToast(id + ' 를 등록했습니다.');
  }
  admGoldenEdit = null; asiteRender();
}
function admGoldenSaveRef() {
  var item = admGoldenVal('agd-item'), raw = admGoldenVal('agd-val').replace(/,/g, '');
  if (!item || raw === '') { admToast('항목과 기준값을 입력해 주세요.'); return; }
  var num = Number(raw);
  var body = { item: item, pjt: admGoldenVal('agd-pjt') || '전사 공통', val: isNaN(num) ? raw : num,
    unit: admGoldenVal('agd-unit'), src: admGoldenVal('agd-src'), base: admGoldenVal('agd-base') };
  var i = admGoldenEdit ? admGoldenEdit.idx : -1;
  if (i >= 0 && ADM_GOLDEN_REF[i]) {
    Object.assign(ADM_GOLDEN_REF[i], body);
    admToast(ADM_GOLDEN_REF[i].id + ' 를 수정했습니다. 관련 질문을 다시 평가해 주세요.');
  } else {
    var id = admGoldenNextId(ADM_GOLDEN_REF, 'GD');
    ADM_GOLDEN_REF.push(Object.assign({ id: id, on: true }, body));
    admToast(id + ' 를 등록했습니다.');
  }
  admGoldenEdit = null; asiteRender();
}
// 평가 실행(목업) — 미실행 질문을 통과로 채우고 실행 시각만 갱신합니다
function admGoldenRun() {
  var n = 0;
  ADM_GOLDEN_QA.forEach(function (x) { if (!x.on) return; n += 1; if (x.last === 'none') x.last = 'pass'; });
  var d = new Date(), z = function (v) { return ('0' + v).slice(-2); };
  admGoldenRunAt = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  asiteRender();
  admToast('질문 ' + n + '건을 평가했습니다. (목업)');
}

// ── 메뉴 · 화면 끼워 넣기 ──
(function admGoldenInstall() {
  if (typeof ADMIN_SECTIONS === 'undefined' || ADMIN_SECTIONS.some(function (s) { return s.key === 'golden'; })) return;
  // 운영 화면(TBD 아님) 맨 뒤 — 환율 관리 다음에 둡니다
  var at = ADMIN_SECTIONS.findIndex(function (s) { return s.tbd; });
  ADMIN_SECTIONS.splice(at < 0 ? ADMIN_SECTIONS.length : at, 0,
    { key: 'golden', icon: '🏅', title: 'Golden Data set 관리', desc: '예산관리 Agent 평가용 질문·정답 셋과 답변 근거가 되는 기준 데이터를 관리합니다.' });
  if (typeof admSectionBody === 'function') {
    var admSectionBodyBeforeGolden = admSectionBody;
    admSectionBody = function (key) {
      if (key === 'golden') return admGoldenHtml();
      return admSectionBodyBeforeGolden(key);
    };
  }
  if (!document.getElementById('agd-style')) {
    var st = document.createElement('style'); st.id = 'agd-style';
    st.textContent = [
      '.agd-tabs{display:inline-flex;gap:2px;padding:3px;margin:0 0 14px;background:#eef1f6;border-radius:10px}',
      '.agd-tabs button{border:0;background:none;padding:7px 16px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:800;color:#64748b;cursor:pointer}',
      '.agd-tabs button.on{background:#fff;color:var(--sk-ink);box-shadow:0 1px 3px rgba(15,23,42,.12)}',
      '.agd-tabs button b{margin-left:6px;color:var(--sk-blue);font-variant-numeric:tabular-nums}',
      '.agd-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 14px}',
      '.agd-sum div{background:#fff;border:1px solid var(--sk-border);border-radius:10px;padding:10px 12px;font-size:12px;color:#64748b}',
      '.agd-sum span{display:block;font-weight:700;margin-bottom:2px}',
      '.agd-sum b{font-size:18px;font-weight:900;color:var(--sk-ink);margin-right:2px;font-variant-numeric:tabular-nums}',
      '.agd-sum b.pass{color:#167a4a}.agd-sum b.fail{color:#c40025}.agd-sum b.at{font-size:13px}',
      '.agd-table td{vertical-align:top}',
      '.agd-id{font-size:11px;color:#64748b}',
      '.agd-sub{margin-top:3px;font-size:11.5px;color:#64748b;line-height:1.55}',
      '.agd-data{font-size:11.5px;color:#475569;line-height:1.55;min-width:12em}',
      '.agd-res{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap}',
      '.agd-res.pass{background:#e8f3ec;color:#167a4a}.agd-res.fail{background:#fff1f3;color:#c40025}.agd-res.none{background:#f1f3f6;color:#94a3b8}',
      '.agd-acts{white-space:nowrap;text-align:right}',
      '.agd-acts .adm-btn{padding:5px 10px;font-size:11.5px;margin-left:4px}',
      '.agd-acts .agd-del{color:#94a3b8}.agd-acts .agd-del:hover{color:#c40025;border-color:#f6c3ce}',
      '.agd-acts .agd-danger{background:#c40025;border-color:#c40025;color:#fff}',
      '.agd-delask{font-size:11.5px;font-weight:800;color:#c40025}',
      '.agd-form{background:#f8fafc;border:1px solid var(--sk-border);border-radius:12px;padding:14px;margin:0 0 14px}',
      '.agd-table .agd-form{margin:4px 0}',
      '.agd-form-t{font-size:13px;font-weight:900;color:var(--sk-ink);margin-bottom:10px}',
      '.agd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.agd-grid label{display:grid;gap:4px;font-size:11.5px;font-weight:700;color:#64748b}',
      '.agd-grid label.wide{grid-column:span 2}.agd-grid label.full{grid-column:1/-1}',
      '.agd-grid input,.agd-grid select,.agd-grid textarea{font:inherit;font-size:12.5px;color:#1f2937;border:1px solid var(--sk-border-strong);border-radius:8px;padding:7px 9px;background:#fff;min-width:0}',
      '.agd-grid textarea{resize:vertical}',
      '.agd-grid input:focus,.agd-grid select:focus,.agd-grid textarea:focus{outline:2px solid var(--sk-blue);outline-offset:0;border-color:var(--sk-blue)}',
      '.agd-form-bar{display:flex;justify-content:flex-end;gap:6px;margin-top:10px}',
      '@media (max-width:720px){.agd-grid{grid-template-columns:1fr}.agd-grid label.wide{grid-column:auto}}',
    ].join('\n');
    document.head.appendChild(st);
  }
})();
