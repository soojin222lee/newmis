// ════════════════════════════════════════
//  수행원가 > 원가조정 — [월별 계획/실적 보기] 팝업 보기 좋게       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 Agent 화면 계정 상세의 [월별 계획/실적 보기] 팝업(renderAgentAcctMonthlyPopFinal)을 다시 그리는 전용 파일입니다.
// - 문제: 기존 표는 프로젝트 기간의 모든 달(2026-01, 2026-02 …)을 한 줄로 늘어놔 옆으로 너무 길었습니다.
// - 바꾸는 것(공유 렌더러 renderAccountMonthlyBudgetTable 은 고치지 않고, 같은 데이터 getMonthlyBudgetRows 로 새로 그림)
//   · 보기  : [월별] [분기별] [연도별] 로 묶어서 보기
//   · 연도  : 전체 / 연도 하나만 골라 보기
//   · 단위  : 원 / 만원(기본) / 억원 — 숫자 폭을 줄임 (억원은 소수 둘째 자리)
//   · 실적  : 지난 달(확정 실적)은 기본으로 "실적 합계" 한 칸으로 접고, [펼치기]로 월별 표시
//   · 월별 보기에서는 연도 머리줄 + "11월"처럼 짧게, 연도마다 "연도 합계" 칸
//   · 구분 · 계획 요약 열은 가로 스크롤해도 왼쪽에 고정
//   · 지난 달 금액을 누르면 기존과 같은 실적 상세(actualCellHtml → showActualDetailModal)
// - 공유 파일은 고치지 않고, 이 파일이 뒤에 로드되어 renderAgentAcctMonthlyPopFinal 을 덮어씁니다.

var bmvMode = 'month';      // month | quarter | year
var bmvYear = 'all';        // all | '2026' …
var BMV_UNITS = [[1, '원', 0], [10000, '만원', 0], [100000000, '억원', 2]];   // [나눌 값, 이름, 소수 자리]
var bmvUnit = 10000;        // 1 | 10000 | 100000000
function bmvUnitInfo() { return BMV_UNITS.find(function (u) { return u[0] === bmvUnit; }) || BMV_UNITS[0]; }
var bmvActOpen = false;     // 지난 달(실적) 월별로 펼치기

function bmvSet(k, v) {
  if (k === 'mode') bmvMode = v;
  if (k === 'year') bmvYear = v;
  if (k === 'unit') bmvUnit = Number(v) || 1;
  if (k === 'act') bmvActOpen = !bmvActOpen;
  bmvRerender();
}
function bmvIsPast(m) {
  return (typeof isPastActualMonth === 'function') ? !!isPastActualMonth(m) : false;
}
function bmvNum(v) {
  const n = Number(v) || 0;
  const d = Math.pow(10, bmvUnitInfo()[2]);
  const x = Math.round(n / bmvUnit * d) / d;
  return fmt(x);
}

renderAgentAcctMonthlyPopFinal = function (viewData, acct) {
  if (!agentAcctMonthlyFinal || agentAcctMonthlyFinal !== acct) return '';
  bmvInjectStyle();
  let body = '';
  try { body = bmvTable(viewData, acct); } catch (e) {
    body = (typeof renderAccountMonthlyBudgetTable === 'function') ? renderAccountMonthlyBudgetTable(viewData, acct) : '';
  }
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentAcctMonthlySetFinal('')">
      <div class="agv-pop aglm-pop bmv-pop" role="dialog" aria-modal="true" aria-label="${escHtml(acct)} 월별 계획/실적">
        <div class="agv-pop-head">
          <div>
            <strong>${escHtml(acct)} 월별 계획 / 실적</strong>
            <span>지난 달은 실적(확정), 이후 달은 계획입니다. 지난 달 금액을 누르면 그 달 실적 상세를 볼 수 있습니다.</span>
          </div>
          <button class="agv-pop-x" onclick="agentAcctMonthlySetFinal('')">✕</button>
        </div>
        <div class="agv-pop-body">${body}</div>
        <div class="agv-pop-foot">
          <button class="agv-cancel" onclick="agentAcctMonthlySetFinal('')">닫음</button>
        </div>
      </div>
    </div>`;
};

function bmvRerender() {
  // 원가 현황 '전체 현황'은 renderBudgetPage가 아니라 showBudgetSummaryGrid로 그립니다
  if (typeof budgetDetailStep !== 'undefined' && budgetDetailStep === 'summaryGrid' && typeof showBudgetSummaryGrid === 'function') showBudgetSummaryGrid();
  else renderBudgetPage();
}

/* ── 공통: 달 → 열 묶기 ─────────────────────────────────────────────────
   원가조정 월별 팝업과 원가 현황(전체 현황 · 계정 예산내역)이 같이 씁니다.
   반환 { cols:[{ label, sub, group(연도 머리), idx:[달 index], kind: past|plan|sum|act, m(단일 달) }], years, pastList, pastLabel } */
function bmvColumns(months) {
  const years = [];
  months.forEach(function (m) { const y = m.slice(0, 4); if (years.indexOf(y) < 0) years.push(y); });
  if (bmvYear !== 'all' && years.indexOf(bmvYear) < 0) bmvYear = 'all';
  const pastList = months.filter(bmvIsPast);
  const pastLabel = pastList.length ? (pastList[0] + (pastList.length > 1 ? '~' + pastList[pastList.length - 1].slice(5) : '')) : '';

  // 보이는 달(연도 필터)
  const vis = months.map(function (m, i) { return { m: m, i: i, y: m.slice(0, 4), past: bmvIsPast(m) }; })
    .filter(function (x) { return bmvYear === 'all' || x.y === bmvYear; });

  const cols = [];
  if (bmvMode === 'year') {
    years.filter(function (y) { return bmvYear === 'all' || y === bmvYear; }).forEach(function (y) {
      const idx = vis.filter(function (x) { return x.y === y; });
      const allPast = idx.every(function (x) { return x.past; }), anyPast = idx.some(function (x) { return x.past; });
      cols.push({ label: y + '년', sub: allPast ? '실적' : anyPast ? '실적+계획' : '계획', group: '', idx: idx.map(function (x) { return x.i; }), kind: allPast ? 'past' : 'sum' });
    });
  } else {
    // 실적 접기: 보이는 지난 달을 한 칸으로
    const past = vis.filter(function (x) { return x.past; });
    const rest = bmvActOpen ? vis : vis.filter(function (x) { return !x.past; });
    if (!bmvActOpen && past.length) {
      cols.push({ label: '실적 합계', sub: past[0].m.slice(2) + (past.length > 1 ? '~' + past[past.length - 1].m.slice(5) : ''), group: '확정 실적', idx: past.map(function (x) { return x.i; }), kind: 'act' });
    }
    const byYear = {};
    rest.forEach(function (x) { (byYear[x.y] = byYear[x.y] || []).push(x); });
    Object.keys(byYear).sort().forEach(function (y) {
      const list = byYear[y];
      if (bmvMode === 'quarter') {
        [1, 2, 3, 4].forEach(function (q) {
          const qs = list.filter(function (x) { return Math.floor((Number(x.m.slice(5, 7)) - 1) / 3) + 1 === q; });
          if (!qs.length) return;
          const allPast = qs.every(function (x) { return x.past; });
          cols.push({ label: q + '분기', sub: Number(qs[0].m.slice(5)) + (qs.length > 1 ? '~' + Number(qs[qs.length - 1].m.slice(5)) : '') + '월', group: y + '년', idx: qs.map(function (x) { return x.i; }), kind: allPast ? 'past' : 'plan' });
        });
      } else {
        list.forEach(function (x) { cols.push({ label: Number(x.m.slice(5)) + '월', group: y + '년', idx: [x.i], kind: x.past ? 'past' : 'plan', m: x.m }); });
      }
      // 연도 합계(그 해의 보이는 달 전부 — 접힌 실적 포함)
      if (years.length > 1 || bmvMode !== 'month') {
        const all = vis.filter(function (x) { return x.y === y; });
        cols.push({ label: y + ' 합계', group: y + '년', idx: all.map(function (x) { return x.i; }), kind: 'sum' });
      }
    });
  }
  return { cols: cols, years: years, pastList: pastList, pastLabel: pastLabel };
}
function bmvSumIdx(arr, idx) { return idx.reduce(function (t, i) { return t + (Number(arr[i]) || 0); }, 0); }
// 공통: 연도 묶음 머리줄. fixed = [[머리 글자, 고정 열 class], …]
function bmvHead(cols, fixed) {
  const groups = [];
  cols.forEach(function (c) {
    const g = c.group || '';
    if (groups.length && groups[groups.length - 1].g === g) groups[groups.length - 1].n++;
    else groups.push({ g: g, n: 1 });
  });
  const hasGroups = groups.some(function (g) { return g.g; });
  const fx = function (rs) { return fixed.map(function (f) { return `<th class="${f[1]}"${rs ? ' rowspan="2"' : ''}>${f[0]}</th>`; }).join(''); };
  const head1 = hasGroups ? `<tr class="bmv-yr">${fx(true)}
      ${groups.map(function (g) { return `<th colspan="${g.n}" class="${g.g === '확정 실적' ? 'act' : ''}">${escHtml(g.g)}</th>`; }).join('')}</tr>` : '';
  const head2 = `<tr>${hasGroups ? '' : fx(false)}
      ${cols.map(function (c) { return `<th class="${c.kind}">${escHtml(c.label)}${c.sub ? `<i>${escHtml(c.sub)}</i>` : ''}</th>`; }).join('')}</tr>`;
  return head1 + head2;
}
// 공통: 도구줄. xlsCall = 엑셀 버튼 onclick(없으면 버튼 없음)
function bmvTools(cv, xlsCall) {
  const seg = function (k, v, label) { return `<button class="${bmvMode === v ? 'on' : ''}" onclick="bmvSet('${k}','${v}')">${label}</button>`; };
  return `
    <div class="bmv-tools">
      <div class="bmv-seg" role="tablist" aria-label="보기">${seg('mode', 'month', '월별')}${seg('mode', 'quarter', '분기별')}${seg('mode', 'year', '연도별')}</div>
      <label class="bmv-sel"><span>연도</span><select onchange="bmvSet('year',this.value)">
        <option value="all" ${bmvYear === 'all' ? 'selected' : ''}>전체</option>
        ${cv.years.map(function (y) { return `<option value="${y}" ${bmvYear === y ? 'selected' : ''}>${y}년</option>`; }).join('')}</select></label>
      <label class="bmv-sel"><span>단위</span><select onchange="bmvSet('unit',this.value)">
        ${BMV_UNITS.map(function (u) { return `<option value="${u[0]}" ${bmvUnit === u[0] ? 'selected' : ''}>${u[1]}</option>`; }).join('')}</select></label>
      ${(bmvMode !== 'year' && cv.pastList.length) ? `<button class="bmv-act ${bmvActOpen ? 'on' : ''}" onclick="bmvSet('act')"
        title="지난 달(확정 실적)을 ${bmvActOpen ? '실적 합계 한 칸으로 접습니다' : '월별로 펼칩니다'}">실적 ${cv.pastLabel} ${bmvActOpen ? '접기 ▴' : '펼치기 ▾'}</button>` : ''}
      <em class="bmv-unit">단위: ${bmvUnitInfo()[1]}</em>
      ${(xlsCall && typeof bxeMonthly === 'function') ? `<button class="bxe-btn" onclick="${xlsCall}" title="지금 보이는 표(보기 · 연도 · 단위 그대로)를 엑셀(.xlsx)로 내려받습니다">⬇ 엑셀 다운로드</button>` : ''}
    </div>`;
}
function bmvNote() {
  return '<p class="bmv-note"><b class="act"></b>확정 실적 <b class="plan"></b>계획 <b class="sum"></b>합계 · 계획(전체) = 실적 + 계획(미집행)</p>';
}

function bmvTable(viewData, acct) {
  const months = ((viewData && viewData.months) || []).map(function (x) { return x.m; });
  const rows = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, acct) : []) || [];
  if (!months.length || !rows.length) throw new Error('no data');
  const cv = bmvColumns(months);
  const cols = cv.cols;

  const total = { name: '합계', plan: 0, actual: 0, remain: 0, months: months.map(function () { return 0; }) };
  rows.forEach(function (r) {
    total.plan += Number(r.plan) || 0; total.actual += Number(r.actual) || 0; total.remain += Number(r.remain) || 0;
    (r.months || []).forEach(function (v, i) { total.months[i] += Number(v) || 0; });
  });
  const cell = function (r, c, isTotal) {
    const v = bmvSumIdx(r.months || [], c.idx);
    // 지난 달 한 칸이면 기존처럼 실적 상세 링크(숫자만 고른 단위로 바꿔 넣음)
    if (c.m && c.kind === 'past' && !isTotal && typeof actualCellHtml === 'function' && v) {
      return actualCellHtml(acct, c.m, r.name, v).replace(/>[^<]*<\/button>/, '>' + bmvNum(v) + '</button>');
    }
    return v ? bmvNum(v) : '<span class="bmv-zero">–</span>';
  };
  const head = bmvHead(cols, [['구분', 'bmv-fix bmv-c0'], ['계획(전체)', 'bmv-fix bmv-c1'], ['실적(확정)', 'bmv-fix bmv-c2'], ['계획(미집행)', 'bmv-fix bmv-c3']]);
  const line = function (r, isTotal) {
    return `<tr class="${isTotal ? 'bmv-total' : ''}">
      <td class="bmv-fix bmv-c0">${escHtml(r.name)}</td>
      <td class="bmv-fix bmv-c1 num">${bmvNum(r.plan)}</td>
      <td class="bmv-fix bmv-c2 num">${bmvNum(r.actual)}</td>
      <td class="bmv-fix bmv-c3 num">${bmvNum(r.remain)}</td>
      ${cols.map(function (c) { return `<td class="num ${c.kind}">${cell(r, c, isTotal)}</td>`; }).join('')}</tr>`;
  };
  const q = escHtml(String(acct).replace(/'/g, "\\'"));
  return `<div class="bmv-wrap">${bmvTools(cv, "bxeMonthly('" + q + "', this)")}
    <div class="bmv-scroll">
      <table class="bmv-table">
        <thead>${head}</thead>
        <tbody>${rows.map(function (r) { return line(r, false); }).join('')}${line(total, true)}</tbody>
      </table>
    </div>
    ${bmvNote()}</div>`;
}

function bmvInjectStyle() {
  if (document.getElementById('bmv-style')) return;
  const st = document.createElement('style');
  st.id = 'bmv-style';
  st.textContent = `
  .agv-pop.bmv-pop { width:min(1180px, 96vw) !important; }
  .bmv-tools { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 10px; }
  .bmv-seg { display:inline-flex; gap:3px; padding:3px; background:#f1f5f9; border-radius:9px; }
  .bmv-seg button { border:0; background:transparent; border-radius:7px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; color:#64748b; cursor:pointer; }
  .bmv-seg button.on { background:#fff; color:#0b1220; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .bmv-sel { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#64748b; }
  .bmv-sel select { border:1px solid #cbd5e1; border-radius:8px; padding:6px 8px; font:inherit; font-size:12.5px; color:#0b1220; background:#fff; }
  .bmv-act { border:1px solid #cbd5e1; background:#fff; color:#334155; border-radius:8px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; }
  .bmv-act.on { border-color:#94a3b8; background:#f8fafc; }
  .bmv-unit { margin-left:auto; font-style:normal; font-size:11.5px; font-weight:800; color:#94a3b8; }
  .bmv-scroll { overflow:auto; max-height:min(62vh, 560px); border:1px solid #e2e8f0; border-radius:12px; }
  .bmv-table { border-collapse:separate; border-spacing:0; width:max-content; min-width:100%; font-size:12.5px; }
  .bmv-table th, .bmv-table td { padding:7px 10px; border-bottom:1px solid #eef2f7; white-space:nowrap; background:#fff; }
  .bmv-table thead th { position:sticky; top:0; z-index:2; background:#f8fafc; color:#475569; font-weight:800; font-size:11.5px; text-align:center; border-bottom:1px solid #e2e8f0; }
  .bmv-table thead tr.bmv-yr th { top:0; }
  .bmv-table thead tr.bmv-yr + tr th { top:31px; }
  .bmv-table thead th i { display:block; font-style:normal; font-weight:700; font-size:10px; color:#94a3b8; margin-top:1px; }
  .bmv-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .bmv-fix { position:sticky; z-index:1; }
  .bmv-table thead .bmv-fix { z-index:3; }
  .bmv-c0 { left:0; min-width:120px; text-align:left !important; font-weight:800; color:#1c2432; }
  .bmv-c1 { left:120px; min-width:96px; } .bmv-c2 { left:216px; min-width:96px; } .bmv-c3 { left:312px; min-width:96px; box-shadow:inset -1px 0 0 #e2e8f0; }
  .bmv-table td.bmv-c1 { font-weight:800; color:#0b1220; }
  .bmv-table th.act, .bmv-table td.act, .bmv-table th.past, .bmv-table td.past { background:#f6f7f9; color:#64748b; }
  .bmv-table thead th.act, .bmv-table thead th.past { background:#eef1f5; }
  .bmv-table th.sum, .bmv-table td.sum { background:#f2f7ff; font-weight:800; color:#1d4ed8; }
  .bmv-table thead th.sum { background:#e6f0ff; }
  .bmv-table tr.bmv-total td { background:#f8fafc; font-weight:900; color:#0b1220; border-top:1px solid #cbd5e1; }
  .bmv-table tr.bmv-total td.sum { background:#e6f0ff; color:#1d4ed8; }
  .bmv-table tbody tr:hover td { background:#fbfdff; }
  .bmv-table .actual-month-link { border:0; background:none; padding:0; font:inherit; color:inherit; text-decoration:underline dotted; cursor:pointer; }
  .bmv-zero { color:#cbd5e1; }
  .bmv-note { margin:8px 2px 0; font-size:11.5px; color:#94a3b8; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .bmv-note b { display:inline-block; width:10px; height:10px; border-radius:3px; border:1px solid #e2e8f0; }
  .bmv-note b.act { background:#f6f7f9; } .bmv-note b.plan { background:#fff; } .bmv-note b.sum { background:#e6f0ff; margin-left:6px; }
  `;
  document.head.appendChild(st);
}
