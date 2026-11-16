// ════════════════════════════════════════
//  수행원가 > 원가조정 — 계정 상세 직접 수정 (A/S Cost)       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 예산을 바꾸는 방법은 3가지입니다.
//   1) 직접 수정 — 계정 상세에서 사용자가 등록 · 수정 · 삭제   ← 이 파일이 빠져 있던 계정을 채움
//   2) Agent 제안 — [예산 조정안]의 제안을 [반영]
//   3) Agent 대화 — "외주비 3천만원 늘려줘" 처럼 말로 지시
// - 외주비 · 재료비 · 경비 · 이관인건비 · OT비는 이미 직접 수정이 있고(budget-agent-console.js),
//   A/S Cost(보기 전용)만 없어서 이 파일에서 더합니다. 실투입인건비는 SCM 선행이라 직접 수정 대상이 아닙니다.
// - 저장하면 다른 계정과 똑같이 agentHandRecordFinal 로 [예산 조정안]에 "✎ 수기 입력" 조정안이 생기고 바로 [반영] 상태가 됩니다.
//   승인된 실행예산(기준선)은 결재가 끝나야 바뀝니다.
// - 입력 양식은 다른 계정과 같은 등록/수정 팝업(agv-pop)입니다.
// - 공유 파일은 고치지 않고, 이 파일이 뒤에 로드되어 데코레이터 · 재정의로 덮어씁니다.
//   · renderAgentAsDetailFinal   : A/S Cost 상세를 다시 그림(관리 열 · 등록 버튼 · 입력 팝업)

/* ── 공통 ─────────────────────────────────────────────────────────────── */
function bdeProj() { return (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : ''; }
function bdeNum(v) { return Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0; }
function bdeVal(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
function bdeToday() { return (typeof osv3TodayMonthV3 === 'function') ? osv3TodayMonthV3() : '2026-08'; }
function bdeAfterSave(msg) {
  if (typeof agentHandToastFinal === 'function') agentHandToastFinal(msg);
  renderBudgetPage();
}
// 입력 팝업 (다른 계정 등록/수정 팝업과 같은 agv-pop 모양)
function bdePanel(title, desc, fields, saveFn, closeFn, isEdit) {
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)${closeFn}">
      <div class="agv-pop" role="dialog" aria-modal="true" aria-label="${escHtml(title)}">
        <div class="agv-pop-head">
          <div><strong>${escHtml(title)}</strong><span>${desc}</span></div>
          <button class="agv-pop-x" onclick="${closeFn}">✕</button>
        </div>
        <div class="agv-pop-body"><div class="aglb-form">${fields}</div></div>
        <div class="agv-pop-foot">
          <button class="agv-ok" onclick="${saveFn}">${isEdit ? '수정 저장' : '등록'}</button>
          <button class="agv-cancel" onclick="${closeFn}">닫음</button>
        </div>
      </div>
    </div>`;
}
function bdeField(label, id, value, opt) {
  opt = opt || {};
  return `<label${opt.wide ? ' class="wide"' : ''}><span>${label}</span>
    <input id="${id}" type="${opt.type || 'text'}" ${opt.numeric ? 'inputmode="numeric"' : ''} value="${escHtml(value == null ? '' : String(value))}"
      placeholder="${escHtml(opt.ph || '')}" ${opt.oninput ? `oninput="${opt.oninput}"` : ''}></label>`;
}
function bdeHandCell(x) {
  return (typeof agentHandBadgeFinal === 'function' && agentHandBadgeFinal(x)) || '<em class="aglb-st hand">수기 입력(결재전)</em>';
}

/* ══ A/S Cost ═══════════════════════════════════════════════════════
   그룹(인건비 · 외주 인력 · 재료비 · 경비)별 항목을 등록 · 수정 · 삭제합니다.
   인력 그룹은 수량(MM) × 단가, 재료비 · 경비는 금액을 바로 입력합니다.
   A/S 기간이 항목마다 없어서, 변동 금액은 사용자가 고른 [반영 월]에 남깁니다. */
var BDE_AS = {};             // 프로젝트별 { add:{그룹:[]}, edit:{그룹:{인덱스:{vals, handPid}}}, del:{그룹:{인덱스:{handPid}}} }
var bdeAsEdit = null;        // { group, key: 'base:인덱스' | 'add:id' | '' }
const BDE_AS_QTY = { labor: true, outsourcePeople: true };   // 수량(MM) × 단가로 계산하는 그룹
function bdeAsStore() {
  const p = bdeProj();
  return BDE_AS[p] || (BDE_AS[p] = { add: {}, edit: {}, del: {} });
}
function bdeAsGroups() {
  const R = (typeof asCostRows !== 'undefined') ? asCostRows : { labor: [], outsourcePeople: [], material: [], expense: [] };
  const s = bdeAsStore();
  const defs = [
    { key: 'labor', label: '인건비', rows: (R.labor || []).map(function (x) { return {
        name: x.role, sub: x.grade, qty: x.mm || 0, unit: x.unitPrice, amount: (x.laborAmount || 0) + (x.indirectAmount || 0) }; }) },
    { key: 'outsourcePeople', label: '외주 인력', rows: (R.outsourcePeople || []).map(function (x) { return {
        name: x.role, sub: x.vendor + ' · ' + x.grade, qty: x.mm || 0, unit: x.unitPrice, amount: Math.round((x.unitPrice || 0) * (x.mm || 0)) }; }) },
    { key: 'material', label: '재료비', rows: (R.material || []).map(function (x) { return {
        name: [x.major, x.middle, x.minor].filter(Boolean).join(' · '), sub: x.expectedDate, qty: 0, unit: 0, amount: x.amount }; }) },
    { key: 'expense', label: '경비', rows: (R.expense || []).map(function (x) { return {
        name: x.account, sub: '', qty: 0, unit: 0, amount: x.amount }; }) },
  ];
  defs.forEach(function (g) {
    const ed = s.edit[g.key] || {}, del = s.del[g.key] || {};
    g.rows.forEach(function (r, i) {
      r.key = 'base:' + i;
      if (ed[i]) { r.before = r.amount; Object.assign(r, ed[i].vals); r.state = '수기수정'; r.handPid = ed[i].handPid; }
      if (del[i]) { r.before = r.amount; r.amount = 0; r.state = '수기삭제'; r.handPid = del[i].handPid; }
    });
    (s.add[g.key] || []).forEach(function (a) {
      g.rows.push(Object.assign({}, a, { key: 'add:' + a.id, state: '수기추가', handPid: a.handPid }));
    });
  });
  return defs.filter(function (g) { return g.rows.length; });
}
function bdeAsOpen(group, key) {
  bdeAsEdit = { group: group, key: key || '' };
  renderBudgetPage();
}
function bdeAsClose() { bdeAsEdit = null; renderBudgetPage(); }
function bdeAsCalc() {
  const out = document.getElementById('bde-as-amt');
  if (out && document.getElementById('bde-as-qty')) out.value = String(Math.round(bdeNum(bdeVal('bde-as-qty')) * bdeNum(bdeVal('bde-as-unit'))));
}
function bdeAsSave() {
  const e = bdeAsEdit;
  if (!e) return;
  const g = bdeAsGroups().find(function (x) { return x.key === e.group; });
  const useQty = !!BDE_AS_QTY[e.group];
  const v = { name: bdeVal('bde-as-name'), sub: bdeVal('bde-as-sub') };
  if (useQty) { v.qty = bdeNum(bdeVal('bde-as-qty')); v.unit = bdeNum(bdeVal('bde-as-unit')); v.amount = Math.round(v.qty * v.unit); }
  else { v.qty = 0; v.unit = 0; v.amount = bdeNum(bdeVal('bde-as-amt')); }
  const month = bdeVal('bde-as-month');
  if (!v.name) { showToast('항목을 입력해 주세요.'); return; }
  if (!(v.amount > 0)) { showToast(useQty ? '수량과 단가를 0보다 크게 입력해 주세요.' : '금액을 0보다 크게 입력해 주세요.'); return; }
  if (!month) { showToast('반영 월을 골라 주세요.'); return; }
  const s = bdeAsStore();
  const before = (e.key && g) ? g.rows.find(function (r) { return r.key === e.key; }) : null;
  const d = v.amount - (before ? (before.amount || 0) : 0);
  const months = {}; if (d) months[month] = d;
  let target;
  if (!e.key) {
    target = Object.assign({ id: 'bde-as-' + Date.now().toString(36) }, v);
    (s.add[e.group] || (s.add[e.group] = [])).push(target);
  } else if (e.key.indexOf('add:') === 0) {
    target = (s.add[e.group] || []).find(function (a) { return 'add:' + a.id === e.key; });
    if (!target) return;
    Object.assign(target, v);
  } else {
    const ed = s.edit[e.group] || (s.edit[e.group] = {});
    target = ed[e.key.slice(5)] || (ed[e.key.slice(5)] = {});
    target.vals = v;
  }
  const label = (g && g.label) || 'A/S';
  const what = `A/S ${label} ${e.key ? '수정' : '등록'} · ${v.name} ${fmt(v.amount)}원`;
  agentHandRecordFinal('A/S Cost', 'A/S ' + label, what, months, [target]);
  bdeAsEdit = null;
  bdeAfterSave(what);
}
function bdeAsDelete(group, key) {
  const g = bdeAsGroups().find(function (x) { return x.key === group; });
  const r = g && g.rows.find(function (x) { return x.key === key; });
  if (!r) return;
  if (!confirm(`${r.name} (${fmt(r.amount || 0)}원)을 삭제할까요?`)) return;
  const s = bdeAsStore();
  let target;
  if (key.indexOf('add:') === 0) {
    s.add[group] = (s.add[group] || []).filter(function (a) { return 'add:' + a.id !== key; });
  } else {
    const del = s.del[group] || (s.del[group] = {});
    target = del[key.slice(5)] = {};
  }
  const months = {}; if (r.amount) months[bdeToday()] = -(r.amount || 0);
  agentHandRecordFinal('A/S Cost', 'A/S ' + g.label, `A/S ${g.label} 삭제 · ${r.name} ${fmt(r.amount || 0)}원`, months, target ? [target] : []);
  if (bdeAsEdit && bdeAsEdit.key === key) bdeAsEdit = null;
  bdeAfterSave(`A/S ${g.label} 삭제 · ${r.name}`);
}
function bdeAsRestore(group, key) {
  const s = bdeAsStore();
  const del = s.del[group] || {};
  const i = key.slice(5);
  if (!del[i]) return;
  delete del[i];
  const g = bdeAsGroups().find(function (x) { return x.key === group; });
  const r = g && g.rows.find(function (x) { return x.key === key; });
  const months = {}; if (r && r.amount) months[bdeToday()] = r.amount;
  agentHandRecordFinal('A/S Cost', 'A/S ' + (g ? g.label : ''), `A/S 삭제 취소 · ${r ? r.name : ''}`, months, []);
  bdeAfterSave(`A/S 삭제 취소 · ${r ? r.name : ''}`);
}
function bdeAsPanel(viewData, g) {
  if (!bdeAsEdit || !g || bdeAsEdit.group !== g.key) return '';
  const e = bdeAsEdit;
  const x = e.key ? g.rows.find(function (r) { return r.key === e.key; }) : null;
  const useQty = !!BDE_AS_QTY[g.key];
  const months = ((viewData && viewData.months) || []).map(function (m) { return m.m; });
  const today = bdeToday();
  const cur = months.indexOf(today) >= 0 ? today : (months[months.length - 1] || today);
  const fields =
      bdeField('항목', 'bde-as-name', x ? x.name : '', { ph: useQty ? '예: 유지보수 개발' : '예: 서버 부품 교체' })
    + bdeField('구분', 'bde-as-sub', x ? x.sub : '', { ph: useQty ? '예: 중급' : '' })
    + (useQty
      ? bdeField('수량(MM)', 'bde-as-qty', x ? x.qty : '', { numeric: true, oninput: 'bdeAsCalc()' })
        + bdeField('단가(원/MM)', 'bde-as-unit', x ? x.unit : '', { numeric: true, oninput: 'bdeAsCalc()' })
        + `<label><span>금액(자동 = 수량 × 단가)</span><input id="bde-as-amt" readonly value="${x ? x.amount || 0 : ''}"></label>`
      : bdeField('금액(원)', 'bde-as-amt', x ? x.amount : '', { numeric: true, ph: '예: 5000000' }))
    + `<label><span>반영 월</span><select id="bde-as-month">${(months.length ? months : [cur]).map(function (m) {
        return `<option value="${m}" ${m === cur ? 'selected' : ''}>${m}</option>`; }).join('')}</select></label>`;
  return bdePanel(`A/S ${g.label} ${x ? '수정' : '등록'}`,
    '저장하면 [예산 조정안]에 ✎ 수기 입력으로 올라가고, 바뀐 금액은 고른 반영 월에 잡힙니다. 결재 승인 후 실행예산이 바뀝니다.',
    fields, 'bdeAsSave()', 'bdeAsClose()', !!x);
}

renderAgentAsDetailFinal = function (viewData, roll) {
  const groups = bdeAsGroups();
  const names = groups.map(function (g) { return g.label; });
  const cur = agentAcctKindIdxFinal('A/S Cost', names.length);
  const g = groups[cur] || { key: '', label: '', rows: [] };
  if (bdeAsEdit && bdeAsEdit.group !== g.key) bdeAsEdit = null;   // 다른 그룹 탭으로 가면 팝업 닫음
  const canEdit = (typeof agentCanEditFinal === 'function') ? agentCanEditFinal() : true;
  const tabs = renderAgentKindTabsFinal('A/S Cost', names, function (i) {
    return (groups[i] || { rows: [] }).rows.reduce(function (t, r) { return t + (r.amount || 0); }, 0);
  });
  const tot = g.rows.reduce(function (t, r) { return t + (r.amount || 0); }, 0);
  const useQty = !!BDE_AS_QTY[g.key];
  const cols = canEdit ? 7 : 6;
  const stCell = function (r) {
    if (!r.state) return '<td>–</td>';
    const kind = r.state === '수기추가' ? '등록' : r.state === '수기삭제' ? '삭제' : '수정';
    const d = r.state === '수기추가' ? (r.amount || 0) : (r.amount || 0) - (r.before || 0);
    return `<td>${bdeHandCell(r)}<div style="font-size:11px;color:#64748b">${kind}${d ? ' ' + agentDeltaFinal(d) : ''}</div></td>`;
  };
  const act = function (r) {
    if (!canEdit) return '';
    if (r.state === '수기삭제') return `<td class="aglb-act"><button onclick="bdeAsRestore('${g.key}','${r.key}')">삭제 취소</button></td>`;
    return `<td class="aglb-act"><button onclick="bdeAsOpen('${g.key}','${r.key}')">수정</button>
      <button class="del" onclick="bdeAsDelete('${g.key}','${r.key}')">삭제</button></td>`;
  };
  return `
    ${tabs}
    ${(canEdit && g.key) ? `
      <div class="aglb-bar">
        <button class="aglb-add" onclick="bdeAsOpen('${g.key}','')">＋ A/S ${escHtml(g.label)} 등록</button>
      </div>` : ''}
    ${canEdit ? bdeAsPanel(viewData, g) : ''}
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>항목</th><th>구분</th><th class="num">수량</th><th class="num">단가</th><th class="num">금액</th><th>상태</th>${canEdit ? '<th class="aglb-act">관리</th>' : ''}
        </tr></thead>
        <tbody>${g.rows.length ? g.rows.map(function (r) { return `
          <tr class="${r.state === '수기추가' ? 'new' : r.state === '수기삭제' ? 'out' : ''}">
            <td><b>${escHtml(r.name || '')}</b></td>
            <td>${escHtml(r.sub || '')}</td>
            <td class="num">${(useQty && r.qty) ? Number(r.qty).toFixed(3).replace(/\.?0+$/, '') + 'MM' : ''}</td>
            <td class="num">${r.unit ? fmt(r.unit) : '–'}</td>
            <td class="num"><b>${fmt(r.amount || 0)}원</b></td>
            ${stCell(r)}${act(r)}
          </tr>`; }).join('') : `<tr><td colspan="${cols}" class="aglb-empty">등록된 내역이 없습니다.${canEdit ? ' [＋ 등록]으로 추가해 주세요.' : ''}</td></tr>`}</tbody>
        ${g.rows.length ? `<tfoot>
          <tr><td>합계 ${g.rows.length}건</td><td></td><td></td><td></td>
            <td class="num"><b>${fmt(tot)}원</b></td><td></td>${canEdit ? '<td></td>' : ''}</tr>
          ${renderAgentPickedRowFinal('A/S Cost', cols)}
        </tfoot>` : ''}
      </table>
    </div>
    ${renderAgentAcctCpFinal('A/S Cost', (roll.rows.find(function (r) { return r.acct === 'A/S Cost'; }) || {}).plan + agentAcctPickedDeltaFinal('A/S Cost'))}`;
};
