// ════════════════════════════════════════
//  수행원가 > 원가조정 — [월별 계획/실적 보기] 팝업 보기 좋게       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 Agent 화면 계정 상세의 [월별 계획/실적 보기] 팝업(renderAgentAcctMonthlyPopFinal)을 다시 그리는 전용 파일입니다.
// - 문제: 기존 표는 프로젝트 기간의 모든 달(2026-01, 2026-02 …)을 한 줄로 늘어놔 옆으로 너무 길었습니다.
// - 바꾸는 것(공유 렌더러 renderAccountMonthlyBudgetTable 은 고치지 않고, 같은 데이터 getMonthlyBudgetRows 로 새로 그림)
//   · 보기  : [월별] [분기별] [연도별] 로 묶어서 보기
//             [기간](2026.11.17) — 시작 월 ~ 끝 월(input type=month, 일은 고르지 않음)을 골라 그 달만 월별로 + 맨 앞 '기간 합계'.
//             처음엔 올해(프로젝트 기간 안), 거꾸로 고르면 바꿔 줌. 기간 보기에선 연도 선택 · 실적 접기 대신 기간 칸
//   · 연도  : 전체 / 연도 하나만 골라 보기
//   · 단위  : 원 / 만원(기본) / 억원 — 숫자 폭을 줄임 (억원은 소수 둘째 자리)
//   · 실적  : 지난 달(확정 실적)은 기본으로 "실적 합계" 한 칸으로 접고, [펼치기]로 월별 표시
//   · 월별 보기에서는 연도 머리줄 + "11월"처럼 짧게, 연도마다 "연도 합계" 칸
//   · 구분 · 계획 요약 열은 가로 스크롤해도 왼쪽에 고정
//   · 지난 달 금액을 누르면 기존과 같은 실적 상세(actualCellHtml → showActualDetailModal)
// - 공유 파일은 고치지 않고, 이 파일이 뒤에 로드되어 renderAgentAcctMonthlyPopFinal 을 덮어씁니다.

var bmvMode = 'month';      // month | quarter | year | range
var bmvYear = 'all';        // all | '2026' …
// [2026.11.17] 기간 보기 — 시작 월 ~ 끝 월(YYYY-MM, 일은 고르지 않음). 처음 [기간]을 누르면 올해(프로젝트 기간 안)로 채움
var bmvFrom = '';
var bmvTo = '';
var BMV_UNITS = [[1, '원', 0], [10000, '만원', 0], [100000000, '억원', 2]];   // [나눌 값, 이름, 소수 자리]
var bmvUnit = 10000;        // 1 | 10000 | 100000000
function bmvUnitInfo() { return BMV_UNITS.find(function (u) { return u[0] === bmvUnit; }) || BMV_UNITS[0]; }
var bmvActOpen = false;     // 지난 달(실적) 월별로 펼치기

function bmvSet(k, v) {
  if (k === 'mode') bmvMode = v;
  if (k === 'year') bmvYear = v;
  if (k === 'unit') bmvUnit = Number(v) || 1;
  if (k === 'act') bmvActOpen = !bmvActOpen;
  if (k === 'from' && /^\d{4}-\d{2}$/.test(v)) bmvFrom = v;
  if (k === 'to' && /^\d{4}-\d{2}$/.test(v)) bmvTo = v;
  bmvRerender();
}
// [2026.11.17] 마감 전 당월(close-month.js CUR_YM) — 칸 제목 아래 "진행 중"
function bmvCurSub(m) { return (typeof CUR_YM !== 'undefined' && m === CUR_YM) ? '진행 중' : ''; }
function bmvIsPast(m) {
  return (typeof isPastActualMonth === 'function') ? !!isPastActualMonth(m) : false;
}
function bmvNum(v) {
  const n = Number(v) || 0;
  const d = Math.pow(10, bmvUnitInfo()[2]);
  const x = Math.round(n / bmvUnit * d) / d;
  return fmt(x);
}

// [2026.11.19] 실적 상세를 팝업 위 팝업 대신 같은 팝업 안에서 — 지난 달 금액을 누르면 표 자리에 실적 상세가 들어오고
//   [← 월별 표로]로 돌아감(보기 · 연도 · 단위 · 실적 펼침 · 가로 스크롤 위치는 그대로).
//   원가 현황 등 다른 화면의 실적 상세(showActualDetailModal 팝업)는 그대로입니다 — 이 팝업 안 링크만 바꿈.
var bmvDrill = null;        // null | { acct, m, name } — 팝업 안에서 보고 있는 실적 상세
var bmvDrillScroll = 0;     // 들어가기 전 월별 표 가로 스크롤 위치
function bmvDrillOpen(acct, m, name) {      // crud R — 월별 팝업 안에서 그 달 실적 상세 조회
  const sc = document.querySelector('.bmv-pop .bmv-scroll');
  bmvDrillScroll = sc ? sc.scrollLeft : 0;
  bmvDrill = { acct: acct, m: m, name: name };
  bmvRerender();
}
function bmvDrillBack() {                   // crud N — 실적 상세 → 월별 표로 돌아가기
  bmvDrill = null;
  bmvRerender();
  const x = bmvDrillScroll;
  requestAnimationFrame(function () { const sc = document.querySelector('.bmv-pop .bmv-scroll'); if (sc) sc.scrollLeft = x; });
}
// 실적 상세 내용 — 공유 실적조회(showActualDetailModal)를 그대로 그려 그 안쪽(조회 조건 · 탭 · 엑셀 · 표)만 가져옴
//   (공유 팝업은 열자마자 닫아 화면에 뜨지 않음. [엑셀]은 엑셀 파일(budget-excel-export.js)이 그 숨은 팝업 표로 내려받음)
function bmvDrillHtml(d) {
  if (typeof showActualDetailModal !== 'function') return '<p class="bmv-note">실적 상세를 불러올 수 없습니다.</p>';
  showActualDetailModal(d.acct, d.m, d.name);
  const modal = document.getElementById('actual-detail-modal');
  if (!modal) return '';
  modal.classList.remove('open');
  const box = modal.querySelector('.actual-detail-modal');
  const parts = box ? Array.prototype.filter.call(box.children, function (el) {
    return !el.classList.contains('actual-detail-head') && !el.classList.contains('actual-detail-foot');
  }) : [];
  return '<div class="bmv-drill">' + parts.map(function (el) { return el.outerHTML; }).join('') + '</div>';
}

renderAgentAcctMonthlyPopFinal = function (viewData, acct) {
  if (!agentAcctMonthlyFinal || agentAcctMonthlyFinal !== acct) {
    if (!agentAcctMonthlyFinal) bmvDrill = null;           // 팝업을 닫으면 다음엔 월별 표부터
    return '';
  }
  bmvInjectStyle();
  if (bmvDrill && bmvDrill.acct !== acct) bmvDrill = null;
  const d = bmvDrill;
  let body = '';
  if (d) {
    try { body = bmvDrillHtml(d); } catch (e) { body = ''; }
  } else {
    try { body = bmvTable(viewData, acct); } catch (e) {
      body = (typeof renderAccountMonthlyBudgetTable === 'function') ? renderAccountMonthlyBudgetTable(viewData, acct) : '';
    }
    body = body.replace(/showActualDetailModal\(/g, 'bmvDrillOpen(');   // 이 팝업 안에서는 새 팝업 대신 안에서 전환
  }
  const title = d
    ? `<button type="button" class="bmv-back" onclick="bmvDrillBack()">← 월별 표로</button>
       <strong>${escHtml(acct)} 월별 계획 / 실적 <em class="bmv-crumb">› ${escHtml(d.m)} 실적 상세${d.name ? ' · ' + escHtml(d.name) : ''}</em></strong>`
    : `<strong>${escHtml(acct)} 월별 계획 / 실적</strong>`;
  const sub = d
    ? '그 달에 확정된 실적 내역입니다. [← 월별 표로]를 누르면 보던 표로 돌아갑니다.'
    : '지난 달은 실적(확정), 이후 달은 계획입니다. 지난 달 금액을 누르면 그 달 실적 상세를 볼 수 있습니다.';
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentAcctMonthlySetFinal('')">
      <div class="agv-pop aglm-pop bmv-pop ${d ? 'bmv-pop-drill' : ''}" role="dialog" aria-modal="true" aria-label="${escHtml(acct)} 월별 계획/실적">
        <div class="agv-pop-head">
          <div>
            <div class="bmv-title">${title}</div>
            <span>${sub}</span>
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
  if (bmvMode === 'range') {
    // 기간: 고른 달만 월별로(실적 접기 · 연도 필터 없이), 맨 앞에 기간 합계
    const r = bmvRangeFix(months);
    const inR = months.map(function (m, i) { return { m: m, i: i, y: m.slice(0, 4), past: bmvIsPast(m) }; })
      .filter(function (x) { return x.m >= r.from && x.m <= r.to; });
    if (inR.length) {
      cols.push({ label: '기간 합계', sub: r.from.slice(2).replace('-', '.') + (inR.length > 1 ? '~' + r.to.slice(2).replace('-', '.') : '') + ' · ' + inR.length + '개월',
        group: '', idx: inR.map(function (x) { return x.i; }), kind: 'sum' });
    }
    inR.forEach(function (x) { cols.push({ label: Number(x.m.slice(5)) + '월', group: x.y + '년', idx: [x.i], kind: x.past ? 'past' : 'plan', m: x.m, sub: bmvCurSub(x.m) }); });
    return { cols: cols, years: years, pastList: pastList, pastLabel: pastLabel, range: r };
  }
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
        list.forEach(function (x) { cols.push({ label: Number(x.m.slice(5)) + '월', group: y + '년', idx: [x.i], kind: x.past ? 'past' : 'plan', m: x.m, sub: bmvCurSub(x.m) }); });
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
// 기간 보기 — 시작 · 끝 월을 프로젝트 기간 안으로 맞춤(비어 있으면 올해, 거꾸로면 바꿈)
function bmvRangeFix(months) {
  const first = months[0], last = months[months.length - 1];
  if (!bmvFrom || !bmvTo) {
    const past = months.filter(bmvIsPast);
    const y = (past.length ? past[past.length - 1] : first).slice(0, 4);
    bmvFrom = bmvFrom || (y + '-01' < first ? first : y + '-01');
    bmvTo = bmvTo || (y + '-12' > last ? last : y + '-12');
  }
  if (bmvFrom > bmvTo) { const t = bmvFrom; bmvFrom = bmvTo; bmvTo = t; }
  if (bmvFrom < first) bmvFrom = first;
  if (bmvTo > last) bmvTo = last;
  if (bmvFrom > last) bmvFrom = last;
  if (bmvTo < first) bmvTo = first;
  return { from: bmvFrom, to: bmvTo, min: first, max: last };
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
      <div class="bmv-seg" role="tablist" aria-label="보기">${seg('mode', 'month', '월별')}${seg('mode', 'quarter', '분기별')}${seg('mode', 'year', '연도별')}${seg('mode', 'range', '기간')}</div>
      ${cv.range ? `<span class="bmv-range"><span>기간</span>
        <input type="month" value="${cv.range.from}" min="${cv.range.min}" max="${cv.range.max}" onchange="bmvSet('from',this.value)" aria-label="조회 시작 월">
        <i>~</i>
        <input type="month" value="${cv.range.to}" min="${cv.range.min}" max="${cv.range.max}" onchange="bmvSet('to',this.value)" aria-label="조회 끝 월"></span>`
      : `<label class="bmv-sel"><span>연도</span><select onchange="bmvSet('year',this.value)">
        <option value="all" ${bmvYear === 'all' ? 'selected' : ''}>전체</option>
        ${cv.years.map(function (y) { return `<option value="${y}" ${bmvYear === y ? 'selected' : ''}>${y}년</option>`; }).join('')}</select></label>`}
      <label class="bmv-sel"><span>단위</span><select onchange="bmvSet('unit',this.value)">
        ${BMV_UNITS.map(function (u) { return `<option value="${u[0]}" ${bmvUnit === u[0] ? 'selected' : ''}>${u[1]}</option>`; }).join('')}</select></label>
      ${(bmvMode !== 'year' && bmvMode !== 'range' && cv.pastList.length) ? `<button class="bmv-act ${bmvActOpen ? 'on' : ''}" onclick="bmvSet('act')"
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
  /* 팝업 안 실적 상세 — 제목 줄: [← 월별 표로] 계정 월별 계획 / 실적 › 2026-10 실적 상세 */
  .bmv-pop .bmv-title { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .bmv-pop .bmv-title strong { display:inline; }
  .bmv-pop .bmv-crumb { font-style:normal; font-weight:800; color:#2f5bea; margin-left:4px; }
  .bmv-pop .bmv-back { height:32px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; font:inherit;
    font-size:13px; font-weight:800; color:#334155; cursor:pointer; white-space:nowrap; }
  .bmv-pop .bmv-back:hover { border-color:#2f5bea; color:#2f5bea; background:#f5f8ff; }
  .bmv-pop .bmv-drill { display:flex; flex-direction:column; gap:10px; }
  .bmv-pop .bmv-drill .actual-detail-filter { margin:0; }
  .bmv-pop .bmv-drill .actual-detail-tabs { padding:0; }
  .bmv-pop .bmv-drill .actual-detail-tabs button { width:auto; padding:0 16px; white-space:nowrap; }
  .bmv-pop .bmv-drill .actual-detail-toolbar { margin:0; padding:0; }
  .bmv-pop .bmv-drill .actual-detail-table-wrap { max-height:none; margin:0; padding:0; }
  .bmv-tools { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 10px; }
  .bmv-seg { display:inline-flex; gap:3px; padding:3px; background:#f1f5f9; border-radius:9px; }
  .bmv-seg button { border:0; background:transparent; border-radius:7px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; color:#64748b; cursor:pointer; }
  .bmv-seg button.on { background:#fff; color:#0b1220; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .bmv-sel { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#64748b; }
  .bmv-sel select { border:1px solid #cbd5e1; border-radius:8px; padding:6px 8px; font:inherit; font-size:12.5px; color:#0b1220; background:#fff; }
  .bmv-range { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#64748b; }
  .bmv-range input { height:30px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:8px; padding:0 8px; font:inherit; font-size:12.5px; color:#0b1220; background:#fff; }
  .bmv-range input:focus { outline:2px solid #bfdbfe; border-color:#2563eb; }
  .bmv-range i { font-style:normal; color:#94a3b8; }
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
