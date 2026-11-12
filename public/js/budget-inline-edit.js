// ════════════════════════════════════════
//  수행원가 > 원가조정 — 계정 상세 표 안에서 행추가 · 칸 수정 · 체크 선택삭제       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 계정 상세(이관인건비 · OT비 · 외주비 · 재료비 · 경비 · A/S Cost)의 등록/수정/삭제 방식을 바꾸는 전용 파일입니다.
//   (실투입인건비는 SCM 선행이라 직접 수정 대상이 아니므로 그대로 둡니다)
// - 등록 : 팝업 대신 표 맨 위에 입력 행을 추가합니다. 화면이 아래로 내려가 있어도 그 행으로 올라가 첫 칸에 커서를 둡니다.
// - 수정 : 팝업 대신 그 행의 칸이 바로 입력칸으로 바뀝니다. (경비는 월별 편성이라 그 행 바로 아래에 월 입력칸을 펼침)
// - 삭제 : 행마다 있던 [삭제]를 없애고, 맨 앞 체크박스로 고른 뒤 표 위 [선택삭제]로 한 번에 지웁니다.
//          (경비는 삭제 대신 "남은 달 비우기"라 [선택 비우기])
// - 방법 : 공유 파일(budget-agent-console.js · budget-direct-edit.js)은 고치지 않습니다.
//          계정 상세 렌더러를 데코레이터로 감싸, 그려진 HTML 안의 팝업 입력칸(같은 id)을 표 행 안으로 옮깁니다.
//          저장 · 검증 · [예산 조정안] 수기 입력 기록은 원래 저장 함수가 같은 id 를 읽어 그대로 처리합니다.
// - Enter = 저장, Esc = 취소.

var bieSeq = 0;              // 체크박스 묶음(scope) 번호


/* ── 폼 정의 — 팝업 입력칸(id)을 표의 몇 번째 칸에 놓을지 ───────────────────────
   cols: 표 열 순서대로. 배열 = 그 칸에 놓을 입력칸 id(또는 .클래스), 'k' = 원래 칸 유지(신규는 –), 'a' = 저장/취소,
         { t: '글자' } = 신규 행에 보일 고정 글자. 입력칸을 못 찾으면 'k' 처럼 원래 칸을 둡니다. */
var BIE_FORMS = [
  { probe: '#aglb-ed-type',   // 인건비 › 이관인건비
    key: function () { const e = agentLabEditFinal; return ['agentLabEditOpenFinal', e.kind, e.id || '']; },
    cols: [['aglb-ed-type'], ['aglb-ed-month'], ['aglb-ed-desc'], ['aglb-ed-amount'], 'k', 'k', 'a'] },
  { probe: '#aglb-ed-month',  // 인건비 › OT비
    key: function () { const e = agentLabEditFinal; return ['agentLabEditOpenFinal', e.kind, e.id || '']; },
    cols: [{ t: 'OT' }, ['aglb-ed-month'], ['aglb-ed-desc'], ['aglb-ed-amount'], 'k', 'a'] },
  { probe: '#agos-ed-vendor', // 외주비 › 실투입대상 외주비(업체별 예산)
    key: function () { const e = agentOsEdFinal; return ['agentOsEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agos-ed-vendor', 'agos-ed-contract', 'agos-ed-start', 'agos-ed-end'], ['agos-ed-amount'], 'k', 'k', 'k', 'k', 'a'] },
  { probe: '#agos-ed-type',   // 외주비 › 이관외주비
    key: function () { const e = agentOsEdFinal; return ['agentOsEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agos-ed-type'], ['agos-ed-month'], ['agos-ed-desc'], ['agos-ed-amount'], 'k', 'k', 'a'] },
  { probe: '#agos-ed-name',   // 외주비 › 그 외 소계정
    key: function () { const e = agentOsEdFinal; return ['agentOsEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agos-ed-name'], ['agos-ed-party'], ['agos-ed-start', 'agos-ed-end'], ['agos-ed-amount'], 'k', 'k', 'k', 'a'] },
  { probe: '#agos-po-start',  // 외주비 › 업체별 구매계획
    key: function () { const e = agentOsPoEdFinal; return ['agentOsPoOpenFinal', e.vid, e.i]; },
    isNew: function () { return agentOsPoEdFinal.i < 0; },
    cols: [['.agos-qs'], ['agos-po-start', 'agos-po-end'], ['agos-po-amount', 'agos-po-hint'], 'k', 'k', 'k', 'k', 'a'] },
  { probe: '#agmt-large',     // 재료비 › 상품재료비
    key: function () { const e = agentMatEdFinal; return ['agentMatEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agmt-name'], ['agmt-large', 'agmt-middle'], ['agmt-model'], ['agmt-qty', 'agmt-unit'], ['agmt-start', 'agmt-end'], 'k', ['agmt-amount'], 'k', 'a'] },
  { probe: '#agmt-acq',       // 재료비 › 감가상각비
    key: function () { const e = agentMatEdFinal; return ['agentMatEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agmt-name'], ['agmt-acq'], ['agmt-life'], ['agmt-monthly'], ['agmt-smonth', 'agmt-emonth'], 'k', 'k', 'a'] },
  { probe: '#agmt-type',      // 재료비 › 이관재료비
    key: function () { const e = agentMatEdFinal; return ['agentMatEdOpenFinal', e.sub, e.id || '']; },
    cols: [['agmt-type'], ['agmt-month'], ['agmt-name'], ['agmt-amount'], 'k', 'k', 'a'] },
  { probe: '#bde-as-name',    // A/S Cost (budget-direct-edit.js)
    key: function () { const e = bdeAsEdit; return ['bdeAsOpen', e.group, e.key || '']; },
    cols: [['bde-as-name'], ['bde-as-sub'], ['bde-as-qty'], ['bde-as-unit'], ['bde-as-amt', 'bde-as-month'], 'k', 'a'] },
  { probe: '.agexe',          // 경비 — 월별 편성(한 행 전체 폭)
    key: function () { const e = agentExpEdFinal; return ['agentExpEdOpenFinal', e.id || '']; },
    full: true },
];

/* ── 계정 상세 렌더러 감싸기 ─────────────────────────────────────────────── */
['renderAgentLaborDetailFinal', 'renderAgentOutsourceDetailFinal', 'renderAgentMaterialDetailFinal',
 'renderAgentExpenseDetailFinal', 'renderAgentAsDetailFinal'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function () { return bieTransform(before.apply(this, arguments)); };
});

function bieTransform(html) {
  if (!html || typeof document === 'undefined' || !document.createElement) return html;
  const tpl = document.createElement('template');
  if (!tpl.content) return html;
  bieInjectStyle();
  tpl.innerHTML = html;
  const root = tpl.content;
  try {
    bieAddChecks(root);
    Array.prototype.slice.call(root.querySelectorAll('.agv-pop-dim')).forEach(function (pop) { bieInline(root, pop); });
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

/* ── 팝업 → 표 안 입력 행 ───────────────────────────────────────────────── */
function bieInline(root, pop) {
  const form = BIE_FORMS.find(function (f) { return pop.querySelector(f.probe); });
  if (!form) return;                       // 모르는 팝업은 그대로 둡니다
  const key = form.key();
  const isNew = form.isNew ? form.isNew() : !key[key.length - 1];
  const target = isNew ? null : bieFindRow(root, key);
  const acts = bieActions(pop);

  if (form.full) return bieInlineFull(root, pop, target, acts);

  let table = target ? target.closest('table') : bieNewTable(root, key);
  if (!table) return;                      // 놓을 표가 없으면 팝업 그대로
  const hasCk = !!(table.tHead && table.tHead.querySelector('.bie-ckc'));
  const tr = document.createElement('tr');
  tr.className = 'bie-row' + (isNew ? ' new' : '');
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
        return pop.querySelector(s.charAt(0) === '.' ? s : '#' + s);
      }).filter(Boolean);
      if (els.length) bieFillCell(td, els);
      else if (orig) td.innerHTML = orig.innerHTML;
      else td.innerHTML = '<span class="bie-na">–</span>';
    }
    tr.appendChild(td);
  });
  // 칸에 못 놓은 입력칸이 남았으면 첫 입력 칸에 덧붙입니다(빠뜨리면 저장이 값을 못 읽음)
  const left = Array.prototype.slice.call(pop.querySelectorAll('input[id], select[id]'));
  if (left.length) bieFillCell(tr.cells[off], left);

  if (target) target.parentNode.replaceChild(tr, target);
  else {
    const body = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
    Array.prototype.slice.call(body.querySelectorAll('td.aglb-empty')).forEach(function (td) {
      if (td.closest('table') === table) td.parentNode.remove();
    });
    body.insertBefore(tr, body.firstChild);
  }
  pop.remove();
}

// 경비 — 월 입력칸이 12개라 한 행 전체 폭으로 펼칩니다(수정: 그 세부계정 행 바로 아래, 편성: 표 맨 위)
function bieInlineFull(root, pop, target, acts) {
  const table = target ? target.closest('table') : root.querySelector('table.agex, table.aglb');
  if (!table) return;
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
  pop.remove();
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
      f.appendChild(cap);           // 이름표 요소째 옮김(구매계획 금액 이름표처럼 id 로 바뀌는 글자 유지)
      f.appendChild(el);
      td.appendChild(f);
      lastCap = cap;
    } else if (multi && lastCap && td.lastChild && td.lastChild.className === 'bie-f') {
      td.lastChild.appendChild(el);   // 수량 / 단위처럼 이름표 하나에 입력칸 둘
    } else td.appendChild(el);
  });
}
// 팝업 아래 버튼(저장 · 남은 달 비우기 · 닫음)을 행 안 버튼으로
function bieActions(pop) {
  const box = document.createElement('div');
  box.className = 'bie-acts';
  Array.prototype.slice.call(pop.querySelectorAll('.agv-pop-foot button')).forEach(function (b) {
    const isOk = b.classList.contains('agv-ok');
    const isClear = b.classList.contains('agexe-del');
    b.className = isOk ? 'bie-save' : isClear ? 'bie-clear' : 'bie-cancel';
    if (!isOk && !isClear && b.textContent.trim() === '닫음') b.textContent = '취소';
    box.appendChild(b);
  });
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
function bieFocusRow() {
  setTimeout(function () {
    const tr = document.querySelector('tr.bie-row');
    if (!tr) return;
    const wrap = tr.closest('.aglb-wrap');
    if (wrap && tr.classList.contains('new')) wrap.scrollTop = 0;
    if (tr.scrollIntoView) tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const f = tr.querySelector('input:not([disabled]):not([readonly]):not([type="checkbox"]), select');
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }, 0);
}
['agentLabEditOpenFinal', 'agentOsEdOpenFinal', 'agentOsPoOpenFinal', 'agentMatEdOpenFinal',
 'agentExpEdOpenFinal', 'agentExpEdPickFinal', 'bdeAsOpen'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function () { const r = before.apply(this, arguments); bieFocusRow(); return r; };
});

/* ── 팝업(.agv-pop)을 찾던 보조 함수들이 표 안 입력 행도 찾도록 ─────────────── */
// 외주비 구매계획 — 분기 버튼 · 금액 안내
agentOsPoQFinal = function (btn) {
  if (btn.disabled) return;
  btn.classList.toggle('on');
  agentOsPoHintFinal(btn.closest('.agv-pop, .bie-row'));
};
agentOsPoAmtInputFinal = function (el) { agentOsPoHintFinal(el.closest('.agv-pop, .bie-row')); };
var bieOsPoSaveBefore = agentOsPoSaveFinal;
agentOsPoSaveFinal = function () {
  // 원래 저장은 '.agv-pop .agos-q.on' 으로 고른 분기를 읽습니다 → 저장하는 동안만 행에 표시를 붙입니다
  const tr = document.querySelector('tr.bie-row');
  if (tr) tr.classList.add('agv-pop');
  try { return bieOsPoSaveBefore.apply(this, arguments); }
  finally { if (tr) tr.classList.remove('agv-pop'); }
};
// 경비 — 남은 달 같은 금액 채우기 · 연간 합계
agentExpEdFillFinal = function (y) {
  const box = document.querySelector('.agv-pop.agexe, .bie-exp');
  if (!box) return;
  const v = Math.abs(parseBudgetAmount((box.querySelector('#agexe-fill-' + y) || {}).value || 0));
  box.querySelectorAll('.agexe-m input:not([disabled])').forEach(function (el) {
    if (el.dataset.m.slice(0, 4) === y) el.value = v ? fmt(v) : '0';
  });
  agentExpEdSumFinal();
};
agentExpEdSumFinal = function () {
  const box = document.querySelector('.agv-pop.agexe, .bie-exp');
  if (!box) return;
  const by = {};
  box.querySelectorAll('.agexe-m input').forEach(function (el) {
    const y = el.dataset.m.slice(0, 4);
    by[y] = (by[y] || 0) + Math.abs(parseBudgetAmount(el.value || 0));
  });
  Object.keys(by).forEach(function (y) { const t = box.querySelector('#agexe-sum-' + y); if (t) t.textContent = fmt(by[y]) + '원'; });
};

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
  .agos-panel-head .bie-delsel { margin-left:auto; padding:4px 10px; font-size:11.5px; }
  .agos-panel-head:has(.bie-delsel) { display:flex; align-items:center; gap:10px; }
  tr.bie-row > td { background:#eef5ff !important; vertical-align:top; padding-top:7px !important; padding-bottom:7px !important; }
  tr.bie-row > td:first-child { box-shadow:inset 3px 0 0 #2563eb; }
  tr.bie-row .bie-cell input, tr.bie-row .bie-cell select {
    width:100%; min-width:84px; box-sizing:border-box; height:30px; border:1px solid #93c5fd; border-radius:7px;
    padding:0 8px; background:#fff; font:inherit; font-size:12.5px; color:#0b1220; }
  tr.bie-row .bie-cell input[type="date"], tr.bie-row .bie-cell input[type="month"] { min-width:128px; }
  tr.bie-row .bie-cell input:focus, tr.bie-row .bie-cell select:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15); }
  tr.bie-row .bie-cell input[readonly] { background:#f1f5f9; color:#475569; }
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
  .bie-acts .bie-clear { border:1px solid #f3c2cc; background:#fff; color:#c40025; }
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
