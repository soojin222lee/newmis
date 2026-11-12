// ════════════════════════════════════════
//  수행원가 > 원가조정 — 계정 상세 표 안에서 행추가 · 칸 수정 · 체크 선택삭제       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 계정 상세(이관인건비 · OT비 · 외주비 · 재료비 · 경비 · A/S Cost)의 등록/수정/삭제 방식을 바꾸는 전용 파일입니다.
//   (실투입인건비는 SCM 선행이라 직접 수정 대상이 아니므로 그대로 둡니다)
// - 등록 : 팝업 대신 표 맨 위에 입력 행을 추가합니다. 여러 번 누르면 여러 행이 쌓이고(최근 행이 맨 위),
//          화면이 아래로 내려가 있어도 새 행으로 올라가 첫 칸에 커서를 둡니다.
// - 수정 : 팝업 대신 그 행의 칸이 바로 입력칸으로 바뀝니다. 여러 행을 동시에 고칠 수 있습니다.
//          (경비는 월별 편성이라 그 행 바로 아래에 월 입력칸을 펼침)
// - 입력 중인 행은 "임시 행(BIE_DRAFTS)"으로 들고 있어서, 다른 행을 추가 · 수정하거나 화면이 다시 그려져도 입력값이 남습니다.
// - 삭제 : 행마다 있던 [삭제]를 없애고, 맨 앞 체크박스로 고른 뒤 표 위 [선택삭제]로 한 번에 지웁니다.
//          (경비는 삭제 대신 "남은 달 비우기"라 [선택 비우기])
// - 저장 : 입력 행의 [저장](그 행만) 또는 표 위 [저장](화면의 입력 행 전부)으로 저장합니다.
// - 방법 : 공유 파일(budget-agent-console.js · budget-direct-edit.js)은 고치지 않습니다.
//          ① [＋ 등록] · [수정]을 누르면 원래 함수가 정한 편집 상태(예: agentLabEditFinal)를 받아 임시 행으로 옮기고 상태는 비웁니다.
//          ② 계정 상세를 그릴 때 임시 행마다 상태를 잠깐 되살려 원래 팝업 양식을 그리고, 그 입력칸을 표 행 안으로 옮깁니다
//             (같은 id 가 여러 행에 생기지 않게 id 뒤에 __임시행번호 를 붙이고 원래 id 는 data-oid 에 둡니다).
//          ③ 저장할 때는 행마다 원래 id 로 숨은 입력칸을 만들고 상태를 되살려 원래 저장 함수를 부릅니다
//             — 검증 · [예산 조정안] 수기 입력 기록은 원래 함수 그대로입니다. 검증에 걸린 행에서 멈추고 그 행을 빨갛게 표시합니다.
// - Enter = 그 행 저장, Esc = 그 행 취소.

var bieSeq = 0;              // 체크박스 묶음(scope) 번호
var BIE_DRAFTS = [];         // 입력 중인 행 { id, flow, state, isNew, values, err }
var bieDraftSeq = 0;
var bieMute = false;         // 원래 함수가 부르는 renderBudgetPage 를 잠시 막음(열기 · 일괄 저장 중)
var bieShown = [];           // 이번에 화면에 그린 임시 행 id

/* ── 열기 흐름 — 원래 열기 함수 · 편집 상태 · 팝업 렌더 · 저장 함수 ───────────── */
function bieAsPop(vd) {   // A/S 는 지금 보고 있는 그룹일 때만 양식을 그립니다(원래 renderAgentAsDetailFinal 규칙)
  const gs = bdeAsGroups();
  const g = gs[agentAcctKindIdxFinal('A/S Cost', gs.length)];
  return (g && bdeAsEdit && g.key === bdeAsEdit.group) ? bdeAsPanel(vd, g) : '';
}
var BIE_FLOWS = [
  { open: 'agentLabEditOpenFinal', state: 'agentLabEditFinal', save: function () { agentLabEditSaveFinal(); },
    render: function (vd) { return renderAgentLabEditPopFinal(vd); },
    key: function (s) { return ['agentLabEditOpenFinal', s.kind, s.id || '']; }, isNew: function (s) { return !s.id; } },
  { open: 'agentOsEdOpenFinal', state: 'agentOsEdFinal', save: function () { agentOsEdSaveFinal(); },
    render: function (vd) { return renderAgentOsEdPopFinal(vd); },
    key: function (s) { return ['agentOsEdOpenFinal', s.sub, s.id || '']; }, isNew: function (s) { return !s.id; } },
  { open: 'agentOsPoOpenFinal', state: 'agentOsPoEdFinal', save: function () { agentOsPoSaveFinal(); },
    render: function () { return renderAgentOsPoPopFinal(); },
    key: function (s) { return ['agentOsPoOpenFinal', s.vid, s.i]; }, isNew: function (s) { return s.i < 0; } },
  { open: 'agentMatEdOpenFinal', state: 'agentMatEdFinal', save: function () { agentMatEdSaveFinal(); },
    render: function (vd) { return renderAgentMatEdPopFinal(vd); },
    key: function (s) { return ['agentMatEdOpenFinal', s.sub, s.id || '']; }, isNew: function (s) { return !s.id; } },
  { open: 'agentExpEdOpenFinal', state: 'agentExpEdFinal', save: function () { agentExpEdSaveFinal(false); },
    render: function () { return renderAgentExpEdPopFinal(); },
    key: function (s) { return ['agentExpEdOpenFinal', s.id || '']; }, isNew: function (s) { return !s.id; } },
  { open: 'bdeAsOpen', state: 'bdeAsEdit', save: function () { bdeAsSave(); },
    render: function (vd) { return bieAsPop(vd); },
    key: function (s) { return ['bdeAsOpen', s.group, s.key || '']; }, isNew: function (s) { return !s.key; } },
];

/* ── 양식 정의 — 팝업 입력칸(원래 id)을 표의 몇 번째 칸에 놓을지 ───────────────────
   cols: 표 열 순서대로. 배열 = 그 칸에 놓을 입력칸 id(또는 .클래스), 'k' = 원래 칸 유지(신규는 –), 'a' = 저장/취소,
         { t: '글자' } = 신규 행에 보일 고정 글자. 입력칸을 못 찾으면 'k' 처럼 원래 칸을 둡니다. full = 한 행 전체 폭(경비) */
var BIE_FORMS = [
  { probe: '#aglb-ed-type',   cols: [['aglb-ed-type'], ['aglb-ed-month'], ['aglb-ed-desc'], ['aglb-ed-amount'], 'k', 'k', 'a'] },   // 이관인건비
  { probe: '#aglb-ed-month',  cols: [{ t: 'OT' }, ['aglb-ed-month'], ['aglb-ed-desc'], ['aglb-ed-amount'], 'k', 'a'] },             // OT비
  { probe: '#agos-ed-vendor', cols: [['agos-ed-vendor', 'agos-ed-contract', 'agos-ed-start', 'agos-ed-end'], ['agos-ed-amount'], 'k', 'k', 'k', 'k', 'a'] },  // 외주비 업체
  { probe: '#agos-ed-type',   cols: [['agos-ed-type'], ['agos-ed-month'], ['agos-ed-desc'], ['agos-ed-amount'], 'k', 'k', 'a'] },   // 이관외주비
  { probe: '#agos-ed-name',   cols: [['agos-ed-name'], ['agos-ed-party'], ['agos-ed-start', 'agos-ed-end'], ['agos-ed-amount'], 'k', 'k', 'k', 'a'] },  // 외주비 소계정
  { probe: '#agos-po-start',  cols: [['.agos-qs'], ['agos-po-start', 'agos-po-end'], ['agos-po-amount', 'agos-po-hint'], 'k', 'k', 'k', 'k', 'a'] },  // 구매계획
  { probe: '#agmt-large',     cols: [['agmt-name'], ['agmt-large', 'agmt-middle'], ['agmt-model'], ['agmt-qty', 'agmt-unit'], ['agmt-start', 'agmt-end'], 'k', ['agmt-amount'], 'k', 'a'] },  // 상품재료비
  { probe: '#agmt-acq',       cols: [['agmt-name'], ['agmt-acq'], ['agmt-life'], ['agmt-monthly'], ['agmt-smonth', 'agmt-emonth'], 'k', 'k', 'a'] },  // 감가상각비
  { probe: '#agmt-type',      cols: [['agmt-type'], ['agmt-month'], ['agmt-name'], ['agmt-amount'], 'k', 'k', 'a'] },   // 이관재료비
  { probe: '#bde-as-name',    cols: [['bde-as-name'], ['bde-as-sub'], ['bde-as-qty'], ['bde-as-unit'], ['bde-as-amt', 'bde-as-month'], 'k', 'a'] },  // A/S Cost
  { probe: '.agexe',          full: true },                                                                              // 경비
];

/* ── [＋ 등록] · [수정] → 임시 행 추가 ──────────────────────────────────────── */
BIE_FLOWS.forEach(function (F) {
  const before = window[F.open];
  if (typeof before !== 'function') return;
  window[F.open] = function () {
    bieCapture();
    bieMute = true;
    let r;
    try { r = before.apply(this, arguments); } finally { bieMute = false; }
    const s = window[F.state];
    window[F.state] = null;                 // 편집 상태는 임시 행이 들고, 원래 팝업은 그리지 않습니다
    let focusId = '';
    if (s) {
      const isNew = F.isNew(s);
      const k = F.key(s).join('|');
      const hit = isNew ? null : BIE_DRAFTS.find(function (d) { return !d.isNew && d.flow === F && F.key(d.state).join('|') === k; });
      if (hit) focusId = hit.id;
      else {
        const d = { id: 'd' + (++bieDraftSeq), flow: F, state: JSON.parse(JSON.stringify(s)), isNew: isNew, values: null, err: false };
        BIE_DRAFTS.push(d);
        focusId = d.id;
      }
    }
    renderBudgetPage();
    if (focusId) bieFocusRow(focusId);
    return r;
  };
});

// 다시 그리기 직전에 입력 중인 값을 임시 행에 담아 둡니다(다시 그려도 입력값 유지)
var bieRenderBefore = renderBudgetPage;
renderBudgetPage = function () {
  if (bieMute) return;
  bieCapture();
  return bieRenderBefore.apply(this, arguments);
};
function bieCapture() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  Array.prototype.slice.call(document.querySelectorAll('tr.bie-row[data-bie-key]')).forEach(function (tr) {
    const d = BIE_DRAFTS.find(function (x) { return x.id === tr.getAttribute('data-bie-key'); });
    if (!d) return;
    const v = {};
    tr.querySelectorAll('[data-oid]').forEach(function (el) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) v[el.getAttribute('data-oid')] = el.value;
    });
    v.__q = Array.prototype.slice.call(tr.querySelectorAll('.agos-q.on')).map(function (b) { return b.getAttribute('data-q'); });
    d.values = v;
  });
}
function bieDropDraft(id) {
  bieCapture();
  BIE_DRAFTS = BIE_DRAFTS.filter(function (d) { return d.id !== id; });
  renderBudgetPage();
}

/* ── 계정 상세 렌더러 감싸기 ─────────────────────────────────────────────── */
['renderAgentLaborDetailFinal', 'renderAgentOutsourceDetailFinal', 'renderAgentMaterialDetailFinal',
 'renderAgentExpenseDetailFinal', 'renderAgentAsDetailFinal'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function (viewData) { return bieTransform(before.apply(this, arguments), viewData); };
});

function bieTransform(html, viewData) {
  if (!html || typeof document === 'undefined' || !document.createElement) return html;
  const tpl = document.createElement('template');
  if (!tpl.content) return html;
  bieInjectStyle();
  tpl.innerHTML = html;
  const root = tpl.content;
  bieShown = [];
  try {
    bieAddChecks(root);
    BIE_DRAFTS.forEach(function (d) { bieDraftRow(root, d, viewData); });
    bieAddSaveButton(root);
  } catch (e) { if (typeof console !== 'undefined') console.warn('[budget-inline-edit]', e); }
  return tpl.innerHTML;
}

/* ── 체크박스 열 + [선택삭제] ───────────────────────────────────────────── */
function bieParseCall(s) {
  const m = String(s || '').replace(/event\.stopPropagation\(\);?/g, '').trim().match(/^(\w+)\((.*)\)$/);
  if (!m) return null;
  const args = [];
  m[2].replace(/'([^']*)'|(-?\d+)/g, function (_, q, n) { args.push(q !== undefined ? q : n); return ''; });
  return { fn: m[1], args: args, text: m[0] };
}
function bieOwnButtons(tr) {
  return Array.prototype.slice.call(tr.querySelectorAll('button')).filter(function (b) { return b.closest('tr') === tr; });
}
function bieAddChecks(root) {
  const rootScope = 'bie' + (++bieSeq);
  const isExp = !!root.querySelector('.agex-bar');
  let rootCount = 0;
  Array.prototype.slice.call(root.querySelectorAll('table')).forEach(function (tb) {
    if (!tb.tHead) return;
    const hasMgmt = Array.prototype.some.call(tb.tHead.querySelectorAll('th'), function (th) { return th.textContent.trim() === '관리'; });
    if (!hasMgmt) return;
    // 외주비 구매계획처럼 업체 행 안에 따로 있는 표는 그 머리에 [선택삭제]를 따로 둡니다
    const panel = tb.closest('.agos-panel');
    const head = (panel && !panel.classList.contains('agex-panel')) ? panel.querySelector('.agos-panel-head') : null;
    const scope = head ? 'bie' + (++bieSeq) : rootScope;
    let cnt = 0;
    Array.prototype.slice.call(tb.rows).forEach(function (r) {
      const sec = r.parentNode.tagName;
      if (sec === 'THEAD') {
        const th = document.createElement('th');
        th.className = 'bie-ckc';
        th.innerHTML = `<input type="checkbox" class="bie-all" title="전체 선택" onclick="bieCheckAll(this,'${scope}')">`;
        r.insertBefore(th, r.firstChild);
        return;
      }
      if (r.cells.length === 1 && r.cells[0].colSpan > 1) { r.cells[0].colSpan += 1; return; }
      const td = document.createElement('td');
      td.className = 'bie-ckc';
      td.setAttribute('onclick', 'event.stopPropagation()');
      if (sec === 'TBODY') {
        const btns = bieOwnButtons(r);
        const del = btns.find(function (b) { return b.classList.contains('del') && /삭제/.test(b.textContent); });
        const exp = btns.map(function (b) { return bieParseCall(b.getAttribute('onclick')); })
          .find(function (c) { return c && c.fn === 'agentExpEdOpenFinal'; });
        let call = '';
        if (del) { call = (bieParseCall(del.getAttribute('onclick')) || {}).text || ''; del.remove(); }
        else if (exp) call = `bieExpClear('${exp.args[0]}')`;
        if (call) {
          td.innerHTML = `<input type="checkbox" class="bie-ck" data-scope="${scope}" title="선택">`;
          td.firstChild.setAttribute('data-del', call);
          cnt++;
        }
      }
      r.insertBefore(td, r.firstChild);
    });
    if (head) { if (cnt) head.appendChild(bieDelButton(scope, false)); }
    else rootCount += cnt;
  });
  const bar = root.querySelector('.aglb-bar, .agex-bar');
  if (bar && rootCount) {
    const add = bar.querySelector('.aglb-add');
    bar.insertBefore(bieDelButton(rootScope, isExp), add || null);
  }
}
function bieDelButton(scope, isExp) {
  const b = document.createElement('button');
  b.className = 'bie-delsel';
  b.setAttribute('onclick', `event.stopPropagation();bieDeleteChecked('${scope}',${isExp ? 'true' : 'false'})`);
  b.textContent = isExp ? '선택 비우기' : '선택삭제';
  b.title = isExp ? '체크한 세부계정의 남은 달 계획을 0원으로 비웁니다' : '체크한 행을 삭제합니다';
  return b;
}
function bieCheckAll(el, scope) {
  const tb = el.closest('table');
  if (!tb) return;
  tb.querySelectorAll(`input.bie-ck[data-scope="${scope}"]`).forEach(function (c) { c.checked = el.checked; });
}
function bieDeleteChecked(scope, isExp) {
  const boxes = Array.prototype.slice.call(document.querySelectorAll(`input.bie-ck[data-scope="${scope}"]:checked`));
  if (!boxes.length) { showToast(isExp ? '비울 세부계정을 체크해 주세요.' : '삭제할 행을 체크해 주세요.'); return; }
  const n = boxes.length;
  if (!confirm(isExp ? `체크한 ${n}개 세부계정의 남은 달 계획을 0원으로 비울까요? 마감된 달(실적)은 그대로 둡니다.`
                     : `체크한 ${n}건을 삭제할까요?`)) return;
  // 뒤에서부터 지웁니다(구매계획처럼 순번으로 지우는 건 앞을 먼저 지우면 순번이 밀림)
  const calls = boxes.map(function (b) { return b.getAttribute('data-del'); }).reverse();
  const keep = window.confirm;
  window.confirm = function () { return true; };   // 건별 확인창은 위에서 한 번에 받았습니다
  try {
    calls.forEach(function (c) { try { (new Function(c))(); } catch (e) { if (typeof console !== 'undefined') console.warn(e); } });
  } finally { window.confirm = keep; }
  renderBudgetPage();
  const msg = isExp ? `${n}개 세부계정의 남은 달 계획을 비웠습니다` : `${n}건을 삭제했습니다`;
  if (typeof agentHandToastFinal === 'function') agentHandToastFinal(msg); else showToast(msg);
}
// 경비 — 세부계정 남은 달 비우기(원래 [남은 달 비우기]와 같은 저장 함수)
function bieExpClear(id) {
  agentExpEdFinal = { id: id };
  agentExpEdSaveFinal(true);
  agentExpEdFinal = null;
}

/* ── 표 위 [저장] — 화면의 입력 행을 모두 저장 ─────────────────────────────── */
function bieAddSaveButton(root) {
  const bar = root.querySelector('.aglb-bar, .agex-bar');
  if (!bar || !bar.querySelector('.aglb-add')) return;      // 편집 권한이 없으면(버튼 없음) 두지 않습니다
  const n = bieShown.length;
  const b = document.createElement('button');
  b.className = 'bie-savebar' + (n ? '' : ' off');
  b.setAttribute('onclick', 'event.stopPropagation();bieSaveAll()');
  b.title = n ? `입력 중인 ${n}개 행을 저장합니다` : '[＋ 등록]이나 [수정]으로 행을 연 뒤 저장할 수 있습니다';
  b.innerHTML = '저장' + (n ? ` <em>${n}</em>` : '');
  bar.appendChild(b);
}
function bieSaveAll() {
  if (!bieShown.length) { showToast('저장할 입력 행이 없습니다. [＋ 등록]이나 [수정]을 먼저 눌러 주세요.'); return; }
  bieSaveDrafts(bieShown.slice());
}
// 임시 행들을 차례로 원래 저장 함수로 저장합니다. 검증에 걸린 행에서 멈추고 나머지는 그대로 남깁니다.
function bieSaveDrafts(ids) {
  bieCapture();
  // 화면 위쪽 행부터(표에 보이는 순서) 저장합니다
  const order = Array.prototype.slice.call(document.querySelectorAll('tr.bie-row[data-bie-key]')).map(function (tr) { return tr.getAttribute('data-bie-key'); });
  const list = ids.map(function (id) { return BIE_DRAFTS.find(function (d) { return d.id === id; }); }).filter(Boolean)
    .sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
  if (!list.length) return;
  BIE_DRAFTS.forEach(function (d) { d.err = false; });
  let ok = 0, fail = null;
  bieMute = true;
  try {
    for (let i = 0; i < list.length; i++) {
      const d = list[i], F = d.flow;
      const box = bieShadow(d);
      window[F.state] = JSON.parse(JSON.stringify(d.state));
      try { F.save(); } catch (e) { if (typeof console !== 'undefined') console.warn(e); }
      const still = window[F.state];      // 원래 저장 함수는 성공하면 편집 상태를 비웁니다
      window[F.state] = null;
      box.remove();
      if (still) { fail = d; d.err = true; break; }
      BIE_DRAFTS = BIE_DRAFTS.filter(function (x) { return x !== d; });
      ok++;
    }
  } finally { bieMute = false; }
  renderBudgetPage();
  if (fail) {
    bieFocusRow(fail.id);
    if (ok) setTimeout(function () { showToast(`${ok}개 행을 저장했고, 빨간 행에서 멈췄습니다. 고친 뒤 다시 저장해 주세요.`); }, 1200);
  } else if (ok > 1) {
    const msg = `${ok}개 행을 저장했습니다 — [예산 조정안]에 ✎ 수기 입력으로 반영`;
    if (typeof agentHandToastFinal === 'function') agentHandToastFinal(msg); else showToast(msg);
  }
}
// 원래 저장 함수가 읽는 id 로 숨은 입력칸을 만듭니다(구매계획 분기 버튼 · 경비 월 칸 포함)
function bieShadow(d) {
  const box = document.createElement('div');
  box.className = 'agv-pop bie-shadow';
  box.style.display = 'none';
  const v = d.values || {};
  Object.keys(v).forEach(function (k) {
    if (k === '__q') return;
    const i = document.createElement('input');
    i.type = 'hidden'; i.id = k; i.value = v[k];
    box.appendChild(i);
  });
  (v.__q || []).forEach(function (q) {
    const b = document.createElement('button');
    b.className = 'agos-q on'; b.setAttribute('data-q', q);
    box.appendChild(b);
  });
  document.body.appendChild(box);
  return box;
}

/* ── 임시 행 하나를 표 안에 그리기 ──────────────────────────────────────── */
function bieDraftRow(root, d, viewData) {
  const F = d.flow;
  window[F.state] = JSON.parse(JSON.stringify(d.state));
  let html = '';
  try { html = F.render(viewData) || ''; } catch (e) { html = ''; }
  window[F.state] = null;
  if (!html) return;                        // 지금 보고 있는 탭의 행이 아님(다른 탭으로 가면 그 탭에서 다시 보임)
  const t = document.createElement('template');
  t.innerHTML = html;
  const pop = t.content.querySelector('.agv-pop-dim') || t.content.firstElementChild;
  if (!pop) return;
  const form = BIE_FORMS.find(function (f) { return pop.querySelector(f.probe); });
  if (!form) return;
  bieRekey(pop, d);
  bieApplyValues(pop, d.values);
  const acts = bieActions(pop, d);
  const target = d.isNew ? null : bieFindRow(root, F.key(d.state));
  if (!d.isNew && !target) return;          // 고칠 행이 지금 안 보임(접힌 업체 · 중분류 등)
  const tr = form.full ? bieFullRow(root, pop, target, acts) : bieCellRow(root, pop, form, target, acts, F.key(d.state));
  if (!tr) return;
  tr.setAttribute('data-bie-key', d.id);
  if (d.err) tr.classList.add('bie-err');
  bieShown.push(d.id);
}
// 같은 id 가 여러 행에 생기지 않게 바꾸고, 원래 id 는 data-oid 에 둡니다. 행 안에서만 도는 보조 함수로 바꿔 답니다.
function bieRekey(pop, d) {
  pop.querySelectorAll('[id]').forEach(function (el) {
    el.setAttribute('data-oid', el.id);
    el.id = el.id + '__' + d.id;
  });
  pop.querySelectorAll('[onclick],[oninput],[onchange]').forEach(function (el) {
    ['onclick', 'oninput', 'onchange'].forEach(function (a) {
      const s = el.getAttribute(a);
      if (!s) return;
      el.setAttribute(a, s
        .replace('agentOsPoQFinal(this)', 'bieQuarter(this)')
        .replace('agentOsPoAmtInputFinal(this)', 'biePoHint(this)')
        .replace('bdeAsCalc()', 'bieAsCalc(this)')
        .replace(/agentExpEdFillFinal\(/, 'bieExpFill(this,')
        .replace('agentExpEdSumFinal()', 'bieExpSum(this)')
        .replace('agentExpEdPickFinal(this.value)', `bieExpPick(this,'${d.id}')`));
    });
  });
}
function bieApplyValues(pop, v) {
  if (!v) return;
  pop.querySelectorAll('[data-oid]').forEach(function (el) {
    const k = el.getAttribute('data-oid');
    if (!(k in v)) return;
    if (el.tagName === 'SELECT') {
      Array.prototype.forEach.call(el.options, function (o) { if (o.value === v[k]) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    } else if (el.tagName === 'INPUT') el.setAttribute('value', v[k]);
  });
  const qs = v.__q || [];
  pop.querySelectorAll('.agos-q').forEach(function (b) { b.classList.toggle('on', qs.indexOf(b.getAttribute('data-q')) >= 0); });
  if (qs.length) {
    pop.querySelectorAll('[data-oid="agos-po-start"],[data-oid="agos-po-end"]').forEach(function (el) { el.setAttribute('disabled', ''); });
  }
}
function bieOid(box, k) { return box ? box.querySelector(`[data-oid="${k}"]`) : null; }

function bieCellRow(root, pop, form, target, acts, key) {
  const table = target ? target.closest('table') : bieNewTable(root, key);
  if (!table) return null;
  const hasCk = !!(table.tHead && table.tHead.querySelector('.bie-ckc'));
  const tr = document.createElement('tr');
  tr.className = 'bie-row' + (target ? '' : ' new');
  tr.setAttribute('onkeydown', 'bieKey(event,this)');
  tr.setAttribute('onclick', 'event.stopPropagation()');
  if (hasCk) { const c = document.createElement('td'); c.className = 'bie-ckc'; tr.appendChild(c); }
  const off = hasCk ? 1 : 0;
  form.cols.forEach(function (spec, i) {
    const td = document.createElement('td');
    const orig = target ? target.cells[i + off] : null;
    const hc = (table.tHead && table.tHead.rows[0]) ? table.tHead.rows[0].cells[i + off] : null;
    td.className = orig ? orig.className : (hc ? hc.className : '');
    if (spec === 'a') {
      td.className = 'aglb-act bie-act';
      td.appendChild(acts);
    } else if (spec && spec.t !== undefined) {
      if (orig) td.innerHTML = orig.innerHTML; else td.innerHTML = `<b>${escHtml(spec.t)}</b>`;
    } else {
      const els = (spec === 'k' ? [] : spec).map(function (s) {
        return s.charAt(0) === '.' ? pop.querySelector(s) : bieOid(pop, s);
      }).filter(Boolean);
      if (els.length) bieFillCell(td, els);
      else if (orig) td.innerHTML = orig.innerHTML;
      else td.innerHTML = '<span class="bie-na">–</span>';
    }
    tr.appendChild(td);
  });
  // 칸에 못 놓은 입력칸이 남았으면 첫 입력 칸에 덧붙입니다(빠뜨리면 저장이 값을 못 읽음)
  const left = Array.prototype.slice.call(pop.querySelectorAll('input[data-oid], select[data-oid]'));
  if (left.length) bieFillCell(tr.cells[off], left);

  if (target) target.parentNode.replaceChild(tr, target);
  else {
    const body = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
    Array.prototype.slice.call(body.querySelectorAll('td.aglb-empty')).forEach(function (td) {
      if (td.closest('table') === table) td.parentNode.remove();
    });
    body.insertBefore(tr, body.firstChild);     // 새 행은 맨 위(가장 최근 행이 제일 위)
  }
  return tr;
}

// 경비 — 월 입력칸이 12개라 한 행 전체 폭으로 펼칩니다(수정: 그 세부계정 행 바로 아래, 편성: 표 맨 위)
function bieFullRow(root, pop, target, acts) {
  const table = target ? target.closest('table') : root.querySelector('table.agex, table.aglb');
  if (!table) return null;
  const n = table.rows[0] ? Array.prototype.reduce.call(table.rows[0].cells, function (t, c) { return t + (c.colSpan || 1); }, 0) : 6;
  const tr = document.createElement('tr');
  tr.className = 'bie-row bie-full' + (target ? '' : ' new');
  tr.setAttribute('onkeydown', 'bieKey(event,this)');
  tr.setAttribute('onclick', 'event.stopPropagation()');
  const td = document.createElement('td');
  td.colSpan = n;
  const box = document.createElement('div');
  box.className = 'agexe bie-exp';
  const head = pop.querySelector('.agv-pop-head > div');
  if (head) { head.className = 'bie-exp-head'; box.appendChild(head); }
  const body = pop.querySelector('.agv-pop-body');
  if (body) while (body.firstChild) box.appendChild(body.firstChild);
  acts.classList.add('bie-exp-acts');
  box.appendChild(acts);
  td.appendChild(box);
  tr.appendChild(td);
  if (target) { target.classList.add('bie-editing'); target.parentNode.insertBefore(tr, target.nextSibling); }
  else {
    const tb = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
    tb.insertBefore(tr, tb.firstChild);
  }
  return tr;
}

function bieFindRow(root, key) {
  const want = key.slice(1).map(String).join('|');
  const btn = Array.prototype.slice.call(root.querySelectorAll('button[onclick]')).find(function (b) {
    const c = bieParseCall(b.getAttribute('onclick'));
    return c && c.fn === key[0] && c.args.join('|') === want;
  });
  return btn ? btn.closest('tr') : null;
}
// 신규 행을 넣을 표 — 구매계획은 그 업체 행 아래 표, 나머지는 첫 번째 표
function bieNewTable(root, key) {
  if (key[0] !== 'agentOsPoOpenFinal') return root.querySelector('table.aglb');
  const vrow = bieFindRow(root, ['agentOsPoOpenFinal', key[1], -1]);
  const sub = vrow && vrow.nextElementSibling;
  const panel = sub && sub.querySelector('.agos-panel');
  if (!panel) return null;
  let tb = panel.querySelector('table.agos-lines');
  if (!tb) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<table class="agos-lines"><thead><tr><th class="bie-ckc"></th>
      <th>분기</th><th>계획 기간</th><th class="num">계획 금액</th><th>PO번호</th>
      <th class="num">실적(검수)</th><th class="num">집행예정(미검수)</th><th>상태</th><th class="ctr">관리</th></tr></thead><tbody></tbody></table>`;
    tb = wrap.firstChild;
    const empty = panel.querySelector('.agos-empty');
    if (empty) panel.replaceChild(tb, empty); else panel.appendChild(tb);
  }
  return tb;
}
// 칸 하나에 입력칸 여러 개면 작은 이름표를 붙여 쌓습니다
function bieFillCell(td, els) {
  td.classList.add('bie-cell');
  const multi = els.filter(function (el) { return /^(INPUT|SELECT)$/.test(el.tagName); }).length > 1;
  let lastCap = null;
  els.forEach(function (el) {
    const lab = el.closest('label');
    const cap = lab ? lab.querySelector(':scope > span') : null;
    if (/^(INPUT|SELECT)$/.test(el.tagName)) {
      if (!el.getAttribute('placeholder') && cap) el.setAttribute('placeholder', cap.textContent.trim());
      if (cap && el.tagName !== 'SELECT') el.setAttribute('aria-label', cap.textContent.trim());
    }
    if (multi && cap && cap !== lastCap && /^(INPUT|SELECT)$/.test(el.tagName)) {
      const f = document.createElement('label');
      f.className = 'bie-f';
      cap.classList.add('bie-cap');
      f.appendChild(cap);           // 이름표 요소째 옮김(구매계획 금액 이름표처럼 글자가 바뀌는 이름표 유지)
      f.appendChild(el);
      td.appendChild(f);
      lastCap = cap;
    } else if (multi && lastCap && td.lastChild && td.lastChild.className === 'bie-f') {
      td.lastChild.appendChild(el);   // 수량 / 단위처럼 이름표 하나에 입력칸 둘
    } else td.appendChild(el);
  });
}
// 행 안 버튼 — [저장](이 행만) · [취소](이 행 버리기)
function bieActions(pop, d) {
  const box = document.createElement('div');
  box.className = 'bie-acts';
  const ok = pop.querySelector('.agv-pop-foot .agv-ok');
  const s = document.createElement('button');
  s.className = 'bie-save';
  s.setAttribute('onclick', `bieSaveDrafts(['${d.id}'])`);
  s.textContent = ok ? ok.textContent.trim() : '저장';
  const c = document.createElement('button');
  c.className = 'bie-cancel';
  c.setAttribute('onclick', `bieDropDraft('${d.id}')`);
  c.textContent = '취소';
  box.appendChild(s);
  box.appendChild(c);
  return box;
}
function bieKey(ev, tr) {
  if (ev.key === 'Enter' && ev.target && ev.target.tagName === 'INPUT') {
    ev.preventDefault();
    const b = tr.querySelector('.bie-save'); if (b) b.click();
  } else if (ev.key === 'Escape') {
    const b = tr.querySelector('.bie-cancel'); if (b) b.click();
  }
}

/* ── 열리면 그 행으로 올라가 첫 칸에 커서 ──────────────────────────────── */
function bieFocusRow(id) {
  setTimeout(function () {
    const tr = document.querySelector(`tr.bie-row[data-bie-key="${id}"]`);
    if (!tr) return;
    const wrap = tr.closest('.aglb-wrap');
    if (wrap && tr.classList.contains('new')) wrap.scrollTop = 0;
    if (tr.scrollIntoView) tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const f = tr.querySelector('input:not([disabled]):not([readonly]):not([type="checkbox"]), select');
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }, 0);
}

/* ── 행 안에서만 도는 보조 함수(원래 함수는 팝업 · 원래 id 를 찾음) ────────────── */
// 외주비 구매계획 — 분기 버튼 · 금액 안내
function bieQuarter(btn) {
  if (btn.disabled) return;
  btn.classList.toggle('on');
  biePoHint(btn);
}
function biePoHint(el) {
  const box = el.closest('tr.bie-row');
  if (!box) return;
  const n = box.querySelectorAll('.agos-q.on').length;
  [bieOid(box, 'agos-po-start'), bieOid(box, 'agos-po-end')].forEach(function (x) { if (x) x.disabled = n > 0; });
  const lab = bieOid(box, 'agos-po-amt-lab');
  if (lab) lab.textContent = n ? `분기별 금액(원) — 선택한 ${n}개 분기에 같은 금액으로 등록` : '계획 금액(원)';
  const hint = bieOid(box, 'agos-po-hint');
  const amt = Math.abs(parseBudgetAmount((bieOid(box, 'agos-po-amount') || {}).value || 0));
  if (hint) hint.textContent = n ? `합계 ${fmt(amt * n)}원 = ${fmt(amt)}원 × ${n}개 분기` : '';
}
// A/S — 수량 × 단가
function bieAsCalc(el) {
  const box = el.closest('tr.bie-row');
  const out = bieOid(box, 'bde-as-amt'), q = bieOid(box, 'bde-as-qty'), u = bieOid(box, 'bde-as-unit');
  if (out && q && u) out.value = String(Math.round(bdeNum(q.value) * bdeNum(u.value)));
}
// 경비 — 세부계정 고르기 · 남은 달 같은 금액 채우기 · 연간 합계
function bieExpPick(sel, id) {
  bieCapture();
  const d = BIE_DRAFTS.find(function (x) { return x.id === id; });
  if (d) { d.state = { id: sel.value || '' }; d.values = null; }   // 계정이 바뀌면 월 칸도 새로
  renderBudgetPage();
  if (d) bieFocusRow(d.id);
}
function bieExpFill(btn, y) {
  const box = btn.closest('tr.bie-row');
  if (!box) return;
  const v = Math.abs(parseBudgetAmount((bieOid(box, 'agexe-fill-' + y) || {}).value || 0));
  box.querySelectorAll('.agexe-m input:not([disabled])').forEach(function (el) {
    if (el.dataset.m.slice(0, 4) === y) el.value = v ? fmt(v) : '0';
  });
  bieExpSum(btn);
}
function bieExpSum(el) {
  const box = el.closest('tr.bie-row');
  if (!box) return;
  const by = {};
  box.querySelectorAll('.agexe-m input').forEach(function (x) {
    const y = x.dataset.m.slice(0, 4);
    by[y] = (by[y] || 0) + Math.abs(parseBudgetAmount(x.value || 0));
  });
  Object.keys(by).forEach(function (y) { const t = bieOid(box, 'agexe-sum-' + y); if (t) t.textContent = fmt(by[y]) + '원'; });
}

function bieInjectStyle() {
  if (document.getElementById('bie-style')) return;
  const st = document.createElement('style');
  st.id = 'bie-style';
  st.textContent = `
  .bie-ckc { width:34px; text-align:center !important; padding-left:6px !important; padding-right:6px !important; }
  .bie-ckc input { width:15px; height:15px; cursor:pointer; accent-color:#2563eb; vertical-align:middle; }
  .bie-delsel { border:1px solid #f3c2cc; background:#fff; color:#c40025; border-radius:8px; padding:7px 12px;
    font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .bie-delsel:hover { background:#fff1f3; }
  .bie-savebar { border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px; padding:7px 16px;
    font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .bie-savebar:hover { background:#1d4ed8; }
  .bie-savebar em { font-style:normal; margin-left:4px; padding:0 6px; border-radius:999px; background:#fff; color:#2563eb; font-size:11px; }
  .bie-savebar.off { background:#fff; color:#94a3b8; border-color:#cbd5e1; cursor:default; }
  .agos-panel-head .bie-delsel { margin-left:auto; padding:4px 10px; font-size:11.5px; }
  .agos-panel-head:has(.bie-delsel) { display:flex; align-items:center; gap:10px; }
  tr.bie-row > td { background:#eef5ff !important; vertical-align:top; padding-top:7px !important; padding-bottom:7px !important; }
  tr.bie-row > td:first-child { box-shadow:inset 3px 0 0 #2563eb; }
  tr.bie-row.bie-err > td { background:#fff1f3 !important; }
  tr.bie-row.bie-err > td:first-child { box-shadow:inset 3px 0 0 #c40025; }
  tr.bie-row .bie-cell input, tr.bie-row .bie-cell select {
    width:100%; min-width:84px; box-sizing:border-box; height:30px; border:1px solid #93c5fd; border-radius:7px;
    padding:0 8px; background:#fff; font:inherit; font-size:12.5px; color:#0b1220; }
  tr.bie-row .bie-cell input[type="date"], tr.bie-row .bie-cell input[type="month"] { min-width:128px; }
  tr.bie-row .bie-cell input:focus, tr.bie-row .bie-cell select:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15); }
  tr.bie-row .bie-cell input[readonly], tr.bie-row .bie-cell input[disabled] { background:#f1f5f9; color:#475569; }
  tr.bie-row td.num .bie-cell input, tr.bie-row td.num input { text-align:right; }
  .bie-f { display:flex; flex-direction:column; gap:2px; margin:0 0 5px; }
  .bie-f:last-child { margin-bottom:0; }
  .bie-f .bie-cap { font-size:10.5px; font-weight:800; color:#64748b; text-align:left; }
  .bie-f .bie-cap + input + input { margin-top:4px; }
  tr.bie-row .agos-qs { display:flex; flex-direction:column; gap:4px; margin:0; }
  tr.bie-row .agos-qs > span { font-size:10.5px; font-weight:800; color:#64748b; }
  tr.bie-row .agos-qs > div { display:flex; flex-wrap:wrap; gap:4px; }
  tr.bie-row .agos-po-hint { display:block; margin-top:3px; font-size:11px; font-style:normal; color:#2563eb; }
  .bie-na { color:#94a3b8; }
  .bie-acts { display:flex; gap:4px; justify-content:center; flex-wrap:wrap; }
  .bie-acts button { border-radius:7px; padding:5px 10px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .bie-acts .bie-save { border:1px solid #2563eb; background:#2563eb; color:#fff; }
  .bie-acts .bie-save:hover { background:#1d4ed8; }
  .bie-acts .bie-cancel { border:1px solid #cbd5e1; background:#fff; color:#334155; }
  .aglb td.aglb-act.bie-act button + button { margin-left:0; }
  tr.bie-editing > td { background:#f5f9ff !important; }
  tr.bie-full > td { padding:12px 14px !important; }
  .bie-exp-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin:0 0 10px; }
  .bie-exp-head strong { font-size:13.5px; font-weight:900; color:#0b1220; }
  .bie-exp-head span { font-size:12px; color:#64748b; }
  .bie-exp .bie-exp-acts { justify-content:flex-end; margin-top:12px; }
  `;
  document.head.appendChild(st);
}
