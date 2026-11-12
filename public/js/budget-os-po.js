// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 외주비 — 구매계획 등록: 분기 / 월별 선택                작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 업체 행 아래 [+ 구매계획] 입력(renderAgentOsPoPopFinal · agentOsPoSaveFinal)을 다시 정의합니다.
//   - [분기 | 월별] 단위를 고른 뒤 기간 버튼을 여러 개 고르면, 고른 기간마다 같은 금액으로 한 번에 등록합니다.
//   - 이미 구매계획이 있는 기간은 ✓ 표시만 하고 고를 수 있습니다(같은 기간에 계획 추가 가능 — 이전엔 disabled).
//   - 기본값: 기간을 고르면 금액 = 등록 가능 금액 ÷ 고른 개수(만원 단위 내림), 시작·종료일 = 고른 기간 범위.
//     금액을 직접 고치면(agos-po-touched=1) 그 뒤로는 금액을 바꾸지 않습니다. 기간 버튼을 모두 풀면 다시 직접 입력.
//   - 팝업(.agv-pop)과 표 안 입력 행(budget-inline-edit.js · tr.bie-row) 어디서든 같은 함수로 동작합니다
//     (id 대신 data-oid 도 찾음). 저장은 원래처럼 #agos-po-* 값과 .agv-pop .agos-q.on 을 읽습니다.
//   공유 파일(budget-agent-console.js)은 고치지 않습니다. budget-agent-console.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

/* ── 기간 목록 ─────────────────────────────────────────────────────────── */
function bopZ(n) { return ('0' + n).slice(-2); }
function bopOverlap(v, from, to) {
  return (v.pos || []).some(function (x) { return x.start && x.end && x.start <= to && x.end >= from; });
}
// 업체 전체기간과 겹치는 분기(q) · 달(m) — { key, label, year, from, to, taken }
function bopPeriods(v, unit) {
  const out = [];
  if (!v || !v.start || !v.end) return out;
  const y0 = Number(v.start.slice(0, 4)), y1 = Number(v.end.slice(0, 4));
  const multi = y0 !== y1;
  for (let y = y0; y <= y1; y++) {
    const n = unit === 'm' ? 12 : 4;
    for (let k = 1; k <= n; k++) {
      const m1 = unit === 'm' ? k : k * 3 - 2, m2 = unit === 'm' ? k : k * 3;
      const ps = y + '-' + bopZ(m1) + '-01';
      const pe = y + '-' + bopZ(m2) + '-' + bopZ(new Date(y, m2, 0).getDate());
      const from = ps < v.start ? v.start : ps, to = pe > v.end ? v.end : pe;
      if (from > to) continue;
      out.push({
        key: unit === 'm' ? y + '-' + bopZ(k) : y + 'Q' + k,
        label: unit === 'm' ? k + '월' : (multi ? String(y).slice(2) + '년 ' : '') + k + '분기',
        year: y, from: from, to: to, taken: bopOverlap(v, from, to),
      });
    }
  }
  return out;
}
// 원래 이름도 맞춰 둡니다(다른 코드가 분기 목록을 부를 때 ✓ 정보 포함)
agentOsQuartersFinal = function (v) { return bopPeriods(v, 'q'); };

/* ── 입력 칸 찾기(팝업 · 표 안 행 공통) ───────────────────────────────── */
function bopBox(el) { return el ? (el.closest('tr.bie-row') || el.closest('.agv-pop')) : null; }
function bopEl(box, k) { return box ? (box.querySelector('[data-oid="' + k + '"]') || box.querySelector('#' + k)) : null; }

/* ── 동작 ──────────────────────────────────────────────────────────────── */
// [분기 | 월별] 전환 — 다른 단위에서 고른 기간은 풉니다
function agentOsPoUnitFinal(btn, unit) {             // crud N
  const box = bopBox(btn);
  if (!box) return;
  const qs = box.querySelector('.agos-qs');
  if (qs) qs.setAttribute('data-unit', unit);
  const u = bopEl(box, 'agos-po-unit');
  if (u) u.value = unit;
  box.querySelectorAll('.agos-unit button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-unit') === unit); });
  box.querySelectorAll('.agos-q.on').forEach(function (b) { if (b.getAttribute('data-unit') !== unit) b.classList.remove('on'); });
  bopSync(box);
}
// 기간 버튼 고르기/풀기
function agentOsPoPickFinal(btn) {                   // crud N
  btn.classList.toggle('on');
  bopSync(bopBox(btn));
}
// 금액을 직접 고치면 그 뒤로 기본값을 넣지 않습니다
function agentOsPoAmtFinal(el) {                     // crud N
  const box = bopBox(el);
  const t = bopEl(box, 'agos-po-touched');
  if (t) t.value = '1';
  bopSync(box, true);
}
// 고른 기간에 맞춰 시작·종료일 · 금액 기본값 · 안내 문구
function bopSync(box, keepAmt) {
  if (!box) return;
  const qs = box.querySelector('.agos-qs');
  const on = Array.prototype.slice.call(box.querySelectorAll('.agos-q.on'));
  const n = on.length;
  const unitName = (qs && qs.getAttribute('data-unit') === 'm') ? '달' : '분기';
  const st = bopEl(box, 'agos-po-start'), en = bopEl(box, 'agos-po-end'), amt = bopEl(box, 'agos-po-amount');
  [st, en].forEach(function (x) { if (x) x.disabled = n > 0; });
  if (n) {
    const froms = on.map(function (b) { return b.getAttribute('data-from'); }).sort();
    const tos = on.map(function (b) { return b.getAttribute('data-to'); }).sort();
    if (st) st.value = froms[0];
    if (en) en.value = tos[tos.length - 1];
  }
  const room = Number(qs && qs.getAttribute('data-room')) || 0;
  const touched = (bopEl(box, 'agos-po-touched') || {}).value === '1';
  if (amt && !keepAmt && !touched && room) {
    const each = n ? (Math.floor(room / n / 10000) * 10000 || Math.floor(room / n)) : room;
    amt.value = each;
  }
  const lab = bopEl(box, 'agos-po-amt-lab');
  if (lab) lab.textContent = n ? unitName + '별 금액(원) — 고른 ' + n + '개 ' + unitName + '에 같은 금액으로 등록' : '계획 금액(원)';
  const hint = bopEl(box, 'agos-po-hint');
  const a = Math.abs(parseBudgetAmount((amt || {}).value || 0));
  if (hint) {
    hint.textContent = n ? '합계 ' + fmt(a * n) + '원 = ' + fmt(a) + '원 × ' + n + '개 ' + unitName + (room && a * n > room ? ' · 등록 가능 ' + fmt(room) + '원 초과' : '') : '';
    hint.classList.toggle('over', !!(room && a * n > room));
  }
}
// 표 안 행이 다시 그려진 뒤(입력값 복원 후) 단위 · 날짜 · 안내를 맞춥니다 — budget-inline-edit.js bieApplyValues 가 부릅니다
function bopRestore(pop) {
  const u = bopEl(pop, 'agos-po-unit');
  const qs = pop.querySelector('.agos-qs');
  if (!qs || !u) return;
  const unit = u.getAttribute('value') || u.value || 'q';
  qs.setAttribute('data-unit', unit);
  pop.querySelectorAll('.agos-unit button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-unit') === unit); });
  if (pop.querySelectorAll('.agos-q.on').length) {
    const hint = bopEl(pop, 'agos-po-hint');
    if (hint) hint.textContent = '';
  }
}

/* ── 입력 양식 ─────────────────────────────────────────────────────────── */
renderAgentOsPoPopFinal = function () {
  const e = agentOsPoEdFinal;
  const v = e ? agentOsFindVendorFinal(e.vid) : null;
  if (!v || agentAiSheetFinal !== '외주비') return '';
  bopInjectStyle();
  const x = e.i >= 0 ? v.pos[e.i] : null;
  const others = (v.pos || []).reduce(function (t, y, k) { return t + (k === e.i ? 0 : (y.amount || 0)); }, 0);
  const room = Math.max((v.budget || 0) - others, 0);
  const d = x ? { from: x.start, to: x.end } : agentOsNextQuarterFinal(v);
  const btns = function (unit) {
    const list = bopPeriods(v, unit);
    const years = [];
    list.forEach(function (p) { if (years.indexOf(p.year) < 0) years.push(p.year); });
    return years.map(function (y) {
      const ps = list.filter(function (p) { return p.year === y; });
      return '<div class="agos-qrow">' + (unit === 'm' && years.length > 1 ? '<b>' + String(y).slice(2) + '년</b>' : '')
        + ps.map(function (p) {
          return '<button type="button" class="agos-q' + (p.taken ? ' taken' : '') + '" data-q="' + p.key + '" data-unit="' + unit + '"'
            + ' data-from="' + p.from + '" data-to="' + p.to + '"'
            + (p.taken ? ' title="이미 구매계획이 있는 기간입니다(추가 등록 가능)"' : '')
            + ' onclick="agentOsPoPickFinal(this)">' + p.label + (p.taken ? ' <i>✓</i>' : '') + '</button>';
        }).join('') + '</div>';
    }).join('');
  };
  const picker = x ? '' : `
    <div class="agos-qs" data-unit="q" data-room="${room}">
      <div class="agos-qhead">
        <span>기간마다 같은 금액이면 기간을 고르세요</span>
        <div class="agos-unit" role="tablist" aria-label="기간 단위">
          <button type="button" class="on" data-unit="q" onclick="agentOsPoUnitFinal(this,'q')">분기</button>
          <button type="button" data-unit="m" onclick="agentOsPoUnitFinal(this,'m')">월별</button>
        </div>
      </div>
      <div class="agos-plist" data-unit="q">${btns('q')}</div>
      <div class="agos-plist" data-unit="m">${btns('m')}</div>
      <input type="hidden" id="agos-po-unit" value="q"><input type="hidden" id="agos-po-touched" value="">
    </div>`;
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentOsPoCloseFinal()">
      <div class="agv-pop" role="dialog" aria-modal="true" aria-label="구매계획 ${x ? '수정' : '등록'}">
        <div class="agv-pop-head">
          <div>
            <strong>${escHtml(v.vendor)} 구매계획 ${x ? '수정' : '등록'}</strong>
            <span>등록 가능 금액 ${fmt(room)}원 (전체기간 예산 ${fmt(v.budget || 0)}원 · ${escHtml(v.start || '')} ~ ${escHtml(v.end || '')})</span>
          </div>
          <button class="agv-pop-x" onclick="agentOsPoCloseFinal()">✕</button>
        </div>
        <div class="agv-pop-body">
          ${picker}
          <div class="aglb-form">
            <label><span>계획 시작일</span><input id="agos-po-start" type="date" value="${escHtml(d.from || '')}"
              min="${escHtml(v.start || '')}" max="${escHtml(v.end || '')}"></label>
            <label><span>계획 종료일</span><input id="agos-po-end" type="date" value="${escHtml(d.to || '')}"
              min="${escHtml(v.start || '')}" max="${escHtml(v.end || '')}"></label>
            <label class="wide"><span id="agos-po-amt-lab">계획 금액(원)</span><input id="agos-po-amount" inputmode="numeric"
              value="${x ? (x.amount || 0) : room}" placeholder="예: 12000000" oninput="agentOsPoAmtFinal(this)">
              <em id="agos-po-hint" class="agos-po-hint"></em></label>
          </div>
        </div>
        <div class="agv-pop-foot">
          <button class="agv-ok" onclick="agentOsPoSaveFinal()">${x ? '수정 저장' : '저장'}</button>
          <button class="agv-cancel" onclick="agentOsPoCloseFinal()">닫음</button>
        </div>
      </div>
    </div>`;
};

/* ── 저장 — 고른 기간(분기 · 달)마다 같은 금액으로 등록 ─────────────────── */
agentOsPoSaveFinal = function () {
  const e = agentOsPoEdFinal;
  const v = e ? agentOsFindVendorFinal(e.vid) : null;
  if (!v) return;
  const val = function (id) { return ((document.getElementById(id) || {}).value || '').trim(); };
  const amount = Math.abs(parseBudgetAmount(val('agos-po-amount') || 0));
  const picked = Array.prototype.slice.call(document.querySelectorAll('.agv-pop .agos-q.on')).map(function (b) { return b.dataset.q; });
  const all = bopPeriods(v, 'q').concat(bopPeriods(v, 'm'));
  const ps = all.filter(function (p) { return picked.indexOf(p.key) >= 0; });
  const unitName = ps.length && /-/.test(ps[0].key) ? '달' : '분기';
  const spans = ps.length ? ps.map(function (p) { return { from: p.from, to: p.to }; })
    : [{ from: val('agos-po-start'), to: val('agos-po-end') }];
  for (let k = 0; k < spans.length; k++) {
    const sp = spans[k];
    if (!sp.from || !sp.to) { showToast('계획 기간을 입력하거나 분기 · 달을 골라 주세요.'); return; }
    if (sp.to < sp.from) { showToast('계획 종료일이 시작일보다 앞설 수 없습니다.'); return; }
    if ((v.start && sp.from < v.start) || (v.end && sp.to > v.end)) {
      showToast('계획 기간은 업체 전체기간(' + v.start + ' ~ ' + v.end + ') 안이어야 합니다.'); return;
    }
  }
  if (!amount) { showToast('금액을 입력해 주세요.'); return; }
  const others = (v.pos || []).reduce(function (t, x, k) { return t + (k === e.i ? 0 : (x.amount || 0)); }, 0);
  const room = Math.max((v.budget || 0) - others, 0);
  const need = amount * spans.length;
  if (need > room) {
    showToast(v.vendor + ' 전체기간 예산 ' + fmt(v.budget) + '원 중 남은 금액은 ' + fmt(room) + '원입니다. '
      + (spans.length > 1 ? spans.length + '개 ' + unitName + ' 합계 ' + fmt(need) + '원은' : '그 이상은') + ' 등록할 수 없습니다.');
    return;
  }
  const label = function (sp) { return unitName === '달' ? sp.from.slice(0, 7) : agentOsQuarterFinal(sp.from); };
  const before = agentCloneFinal(v);
  let rows = [], what;
  if (e.i >= 0) {
    Object.assign(v.pos[e.i], { start: spans[0].from, end: spans[0].to, amount: amount, plan: {} });
    rows = [v.pos[e.i]];
    what = '구매계획 수정 · ' + v.vendor + ' ' + agentOsQuarterFinal(spans[0].from) + ' ' + fmt(amount) + '원';
  } else {
    rows = spans.map(function (sp) { return { poNo: '', start: sp.from, end: sp.to, amount: amount, mm: 0, actual: 0, planned: 0, plan: {} }; });
    v.pos = (v.pos || []).concat(rows);
    what = '구매계획 등록 · ' + v.vendor + ' ' + spans.map(label).join(', ') + ' ' + fmt(amount) + '원' + (spans.length > 1 ? ' × ' + spans.length : '');
  }
  agentHandRecordFinal('외주비', '실투입대상 외주비', what,
    agentMonthsDiffFinal(agentOsVendorMonthsFinal(v), agentOsVendorMonthsFinal(before)), rows);
  agentOsPoEdFinal = null;
  agentHandToastFinal(e.i >= 0 ? v.vendor + ' 구매계획을 수정했습니다' : v.vendor + ' 구매계획 ' + rows.length + '건을 등록했습니다');
  renderBudgetPage();
};

function bopInjectStyle() {
  if (document.getElementById('bop-style')) return;
  const st = document.createElement('style');
  st.id = 'bop-style';
  st.textContent = `
  .agos-qs .agos-qhead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 6px; }
  .agos-qs .agos-qhead > span { font-size:11.5px; font-weight:800; color:#64748b; }
  .agos-unit { display:inline-flex; gap:2px; padding:2px; background:#f1f5f9; border-radius:8px; }
  .agos-unit button { border:0; background:transparent; border-radius:6px; padding:3px 10px; font:inherit; font-size:11.5px; font-weight:800; color:#64748b; cursor:pointer; }
  .agos-unit button.on { background:#fff; color:#0b1220; box-shadow:0 1px 2px rgba(15,23,42,.12); }
  .agos-qs[data-unit="q"] .agos-plist[data-unit="m"], .agos-qs[data-unit="m"] .agos-plist[data-unit="q"] { display:none; }
  .agos-plist { display:flex; flex-direction:column; gap:4px; }
  .agos-qrow { display:flex; flex-wrap:wrap; align-items:center; gap:4px; }
  .agos-qrow > b { font-size:11px; color:#94a3b8; min-width:30px; }
  .agos-q.taken { border-style:dashed !important; }
  .agos-q.taken i { font-style:normal; color:#0f9d63; font-weight:900; }
  .agos-q.on.taken i { color:inherit; }
  .agos-po-hint.over { color:#c40025 !important; }
  tr.bie-row .agos-qs .agos-qhead { margin:0 0 2px; }
  tr.bie-row .agos-qs .agos-qhead > span { font-size:10.5px; }
  tr.bie-row .agos-po-hint { white-space:normal; word-break:keep-all; }`;
  document.head.appendChild(st);
}

/* ── 구매계획 목록 — 한 달짜리 계획은 "2026 Q1" 대신 "2026-01"로 ───────────────
   목록의 기간 이름(agentOsQuarterFinal)은 시작일만 보고 분기로 붙입니다. 월별로 등록한 계획(시작 · 종료가 같은 달)은
   달 이름으로 바꾸고, 머리도 "분기 · 월"로 바꿉니다(공유 렌더러 출력만 고침). */
(function () {
  const before = window.renderAgentOutsourceDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentOutsourceDetailFinal = function () {
    const html = before.apply(this, arguments);
    if (typeof html !== 'string') return html;
    return html
      .replace(/<th>분기<\/th>(\s*<th>계획 기간<\/th>)/g, '<th>분기 · 월</th>$1')
      .replace(/<b>\d{4} Q\d<\/b><\/td>(\s*)<td>(\d{4}-\d{2})-(\d{2}) ~ (\d{4}-\d{2})-(\d{2})<\/td>/g,
        function (m, sp, a, d1, b, d2) { return a === b ? '<b>' + a + '</b></td>' + sp + '<td>' + a + '-' + d1 + ' ~ ' + b + '-' + d2 + '</td>' : m; });
  };
})();
