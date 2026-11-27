// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 인건비 — 월별 투입계획 팝업 (AS-IS 칸)    작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 회의(2026.11.24) 원칙 "AS-IS 필드는 삭제 합의 전까지 유지" — AS-IS 인건비 화면의 [월별 투입계획] 팝업을 목업에 더합니다.
//   근거(AS-IS its-front performance/components/personnelExpenses)
//     popup/MonthResourcePlanPopup.vue ('(내부) 월별투입계획'), grid/_colsOption.ts monthResourcePlanGrid
//     인력자원계획 표 위 [월별 투입계획] 버튼으로 열림. 투입년월 기간 검색 · 엑셀
//     AS-IS 칸: 투입년월 · 인력구분 · 성명 · Assign Type · 직위 · 팀명 · M/H · M/D · M/M · 단가(M/M) · 금액(KRW) + 총 합계
//     [2026.11.26] M/H · M/D 는 빼기로 함(사용자 결정) → 목업 칸: 투입년월 · 인력구분 · 성명 · Assign Type · 직위 · 팀명 · M/M · 단가(M/M) · 금액(KRW)
//     [2026.11.27] 인력구분 칸도 빼기로 함(사용자 결정, 이 팝업은 내부 인력만이라 늘 '내부') → 목업 칸: 투입년월 · 성명 · Assign Type · 직위 · 팀명 · M/M · 단가(M/M) · 금액(KRW)
//     AS-IS 인력자원 투입계획 팝업(WorkingBudgetMonthManagerPopup.vue)은 넣지 않기로 함(사용자 결정).
//   목업에서 여는 곳: 실투입인건비 탭 인력표 위 버튼 줄([전체 펼치기] 왼쪽)
//   모양은 외주비 · 재료비 · 인건비 실적조회와 같은 틀(budget-insp-history.js .bih-*).
//   데이터(목업): 인력표와 같은 사람 · 같은 월별 MM(agentLaborRowsFinal · agentLaborMonthsFinal), 단가는 그 달 단가(laborMonthUnitFinal).
//   공유 파일은 고치지 않고 renderAgentLaborDetailFinal 출력만 감쌉니다. budget-labor-fields.js 뒤에 로드.
// ═══════════════════════════════════════════════════════════════════════════

var blpState = null;   // { from, to, min, max }

function blpEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }
function blpNum(n) { return Number(n || 0).toLocaleString('ko-KR'); }
function blpInfo(name) { return (typeof blfInfo === 'function') ? blfInfo(name) : {}; }
function blpRows() { return (typeof agentLaborRowsFinal === 'function') ? agentLaborRowsFinal() : []; }
function blpMonths(r) { return (typeof agentLaborMonthsFinal === 'function') ? agentLaborMonthsFinal(r) : []; }
function blpUnit(r, m) { return (typeof laborMonthUnitFinal === 'function') ? laborMonthUnitFinal(r, m) : Number(r.unitPrice || 0); }
function blpPrj() {
  const list = (typeof EXEC_BUDGET_PROJECTS !== 'undefined') ? EXEC_BUDGET_PROJECTS : [];
  const k = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  return list.find(x => x.key === k) || list.find(x => x.key === 'budgetMock') || { no: '', name: '' };
}

function blpMonthData() {
  const out = [];
  blpRows().forEach(r => {
    const info = blpInfo(r.name);
    blpMonths(r).forEach(x => {
      if (!x.mm) return;
      const unit = blpUnit(r, x.m);
      out.push({ m: x.m, name: r.name, assign: info.assign || 'Full Time', pos: info.pos || '', org: r.org || '',
        mm: x.mm, unit: unit, amt: Math.round(x.mm * unit) });
    });
  });
  return out.sort((a, b) => a.m === b.m ? 0 : a.m < b.m ? -1 : 1);
}
function blpMonthOpen() {                                // crud R — 월별 투입계획 팝업 열기(조회)
  const ms = blpMonthData().map(x => x.m);
  blpState = { from: ms[0] || '', to: ms[ms.length - 1] || '', min: ms[0] || '', max: ms[ms.length - 1] || '' };
  blpPaint();
}
function blpMonthSet(k, v) {                             // crud R — 투입년월 기간으로 다시 조회
  if (!blpState || !/^\d{4}-\d{2}$/.test(v)) return;
  blpState[k] = v;
  if (blpState.from > blpState.to) { const t = blpState.from; blpState.from = blpState.to; blpState.to = t; }
  blpPaint();
}
function blpExcel() {                                    // crud R — 지금 보는 표를 엑셀(.xlsx)로 다운로드
  const t = document.querySelector('#blp-pop .blp-xls');
  if (!t || typeof bxeSave !== 'function') { if (typeof showToast === 'function') showToast('내려받을 표가 없습니다.'); return; }
  const p = blpPrj(), today = typeof bxeToday === 'function' ? bxeToday() : '';
  bxeSave(`${p.no}_(내부) 월별투입계획_${today}.xlsx`, [bxeSheet('월별 투입계획', `(내부) 월별투입계획 — ${p.name}`, '단위: 원 · 내려받은 날: ' + today, bxeTableRows(t))]);
}
function blpClose() {                                    // crud N — 팝업 닫기
  blpState = null;
  const el = document.getElementById('blp-pop');
  if (el) el.remove();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && blpState) blpClose(); });

function blpPaint() {
  const s = blpState;
  if (!s) return;
  let el = document.getElementById('blp-pop');
  if (!el) { el = document.createElement('div'); el.id = 'blp-pop'; document.body.appendChild(el); }
  const p = blpPrj();
  const rows = blpMonthData().filter(x => x.m >= s.from && x.m <= s.to);
  const sum = k => rows.reduce((t, x) => t + x[k], 0);
  const body = rows.map(x => `<tr>
      <td class="ctr">${x.m}</td><td class="ctr">${blpEsc(x.name)}</td>
      <td class="ctr ${x.assign === 'Part Time' ? 'blp-part' : ''}">${blpEsc(x.assign)}</td><td class="ctr">${blpEsc(x.pos)}</td><td>${blpEsc(x.org)}</td>
      <td class="num">${x.mm.toFixed(2)}</td><td class="num">${blpNum(x.unit)}</td><td class="num"><b>${blpNum(x.amt)}</b></td></tr>`).join('');
  el.innerHTML = `
    <div class="bih-dim" onclick="if(event.target===this)blpClose()">
      <div class="bih-pop blp-pop" role="dialog" aria-modal="true" aria-label="(내부) 월별 투입계획">
        <div class="bih-head">
          <div><strong>(내부) 월별 투입계획</strong><span>${blpEsc(p.name)} · ${blpEsc(p.no)}</span></div>
          <button class="bih-x" onclick="blpClose()" aria-label="닫기">✕</button>
        </div>
        <div class="bih-body">
          <div class="bih-bar">
            <span class="blp-range"><span>투입년월</span>
              <input type="month" value="${s.from}" min="${s.min}" max="${s.max}" onchange="blpMonthSet('from', this.value)" aria-label="조회 시작 월">
              <i>~</i>
              <input type="month" value="${s.to}" min="${s.min}" max="${s.max}" onchange="blpMonthSet('to', this.value)" aria-label="조회 끝 월"></span>
            <span class="bih-hint">내부 인력의 달마다 투입 계획입니다. 기간을 바꾸면 바로 다시 조회됩니다.</span>
            <button type="button" class="bih-excel" onclick="blpExcel()">엑셀 다운로드</button>
          </div>
          <div class="bih-wrap"><table class="bih-table blp-xls">
            <thead><tr><th class="ctr">투입년월</th><th class="ctr">성명</th><th class="ctr">Assign Type</th><th class="ctr">직위</th><th>팀명</th>
              <th class="num">M/M</th><th class="num">단가(M/M)</th><th class="num">금액(KRW)</th></tr></thead>
            <tbody>${body || '<tr><td colspan="8" class="bih-empty">그 기간에 투입 계획이 없습니다.</td></tr>'}</tbody>
            ${rows.length ? `<tfoot><tr class="total"><td colspan="5" class="ctr">총 합계 ${rows.length}건</td>
              <td class="num">${sum('mm').toFixed(2)}</td><td></td><td class="num">${blpNum(sum('amt'))}</td></tr></tfoot>` : ''}
          </table></div>
          <p class="bih-note">외부(외주) 인력은 외주비 화면에서 봅니다.</p>
        </div>
        <div class="bih-foot"><button type="button" class="bih-close" onclick="blpClose()">닫기</button></div>
      </div>
    </div>`;
}

// ── 인건비 상세 화면에 [월별 투입계획] 버튼 넣기 — 인력표 위 버튼 줄, [전체 펼치기] 왼쪽 ──
function blpApply(html) {
  if (!html || typeof document === 'undefined') return html;
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    const xp = root.querySelector('.aglb-bar .aglb-xpand-btn');
    if (!xp || root.querySelector('.blp-month-btn')) return html;
    xp.insertAdjacentHTML('beforebegin', '<button class="bxe-btn blp-month-btn" onclick="blpMonthOpen()" title="내부 인력의 달마다 투입 계획(M/M · 단가 · 금액)을 조회합니다">월별 투입계획</button>');
    return tpl.innerHTML;
  } catch (e) { return html; }
}
(function () {
  const before = window.renderAgentLaborDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentLaborDetailFinal = function () { return blpApply(before.apply(this, arguments)); };
})();

(function blpStyle() {
  if (typeof document === 'undefined' || document.getElementById('blp-style')) return;
  const st = document.createElement('style');
  st.id = 'blp-style';
  st.textContent = `
  .blp-range { display:inline-flex; align-items:center; gap:6px; font-size:13.5px; font-weight:600; color:#4b5563; }
  .blp-range input { height:34px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:8px; padding:0 8px; font:inherit; font-size:14px; color:#111827; background:#fff; }
  .blp-range i { font-style:normal; color:#9aa3af; }
  .blp-part { color:#b45309 !important; font-weight:700; }`;
  document.head.appendChild(st);
})();
