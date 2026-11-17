// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가현황 — 월별 그리드 보기 좋게 (원가조정 월별 팝업과 같은 UI)   작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 원가 현황의 가로로 긴 월별 그리드를 원가조정 [월별 계획/실적] 팝업과 같은 모양으로 다시 그립니다.
//   - 전체 현황(renderProjectPlanSummary): 달마다 계획/실적 2칸이던 표를
//     지난 달 = 실적, 이후 달 = 계획 1칸으로 바꾸고, 월별 · 분기별 · 연도별 / 연도 / 단위(원 · 만원 · 억원) /
//     실적 접기 / 연도 합계 / 왼쪽 고정 열 / [⬇ 엑셀 다운로드] 를 붙입니다.
//   - 실적 금액 링크(지난 달 펼침 시) · 실적조회 팝업 [⬇ 엑셀 다운로드]는 기존과 같습니다.
//   - 열 묶기 · 도구줄 · 단위는 budget-monthly-view.js(bmvColumns · bmvTools · bmvHead · bmvNum)를 같이 씁니다.
//   공유 파일(budget-status-*.js)은 고치지 않습니다. budget-excel-export.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

/* ── 전체 현황 ─────────────────────────────────────────────────────────── */
// [2026.11.17] 계정 접기/펴기 상태 — { 계정 이름: true(접힘) }. 처음엔 모두 펼침, 다시 그려도 유지
var bsvFold = {};
var bsvAllFolded = false;                     // 지금 모든 계정이 접혀 있나(도구줄 버튼 하나로 [전체 접기] ↔ [전체 펴기])
var BSV_CHEVRON = '<svg class="bsv-chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function bsvToggle(name) {                    // crud N — 계정(인건비 등) 하위 계정 접기/펴기
  bsvFold[name] = !bsvFold[name];
  bmvRerender();
}
function bsvFoldAll(fold) {                   // crud N — 모든 계정 접기(true) / 펴기(false)
  bsvFold = {};
  if (fold) {
    try {
      document.querySelectorAll('.bsv-table tr.bsv-lv1 td.bmv-c0').forEach(function (td) { bsvFold[td.textContent.replace(/^[⊟⊞○\s]+/, '').trim()] = true; });
    } catch (e) { /* 화면에 없으면 무시 */ }
  }
  bmvRerender();
}
var renderProjectPlanSummaryBeforeBsv = (typeof renderProjectPlanSummary === 'function') ? renderProjectPlanSummary : null;
renderProjectPlanSummary = function (data, actual, quasi) {
  try { return bsvSummary(data, actual, quasi); } catch (e) {
    if (typeof console !== 'undefined') console.warn('[budget-status-view]', e);
    return renderProjectPlanSummaryBeforeBsv ? renderProjectPlanSummaryBeforeBsv.apply(this, arguments) : '';
  }
};
function bsvSummary(data, actual, quasi) {
  bmvInjectStyle(); bsvInjectStyle();
  const rows = getProjectSummaryGridRows(data, actual, quasi);
  const months = (data.months || []).map(function (x) { return x.m; });
  if (!rows.length || !months.length) throw new Error('no data');
  const total = rows[0];
  const cv = bmvColumns(months);
  const cols = cv.cols;
  // 달마다 한 값 — 지난 달은 실적, 이후 달은 계획
  const vals = function (row) { return (row.months || []).map(function (it, i) { return bmvIsPast(months[i]) ? Number(it.actual) || 0 : Number(it.plan) || 0; }); };
  const cell = function (row, c) {
    const v = bmvSumIdx(vals(row), c.idx);
    // [2026.11.17] 마감 전 당월 — 칸을 넓히지 않고 두 줄로: 위 계획 · 아래 실적(작게, 파랑). 실적 ≤ 계획
    if (c.m && typeof CUR_YM !== 'undefined' && c.m === CUR_YM) {
      const it = (row.months || [])[c.idx[0]] || {};
      const p = Number(it.plan) || 0, a = Number(it.actual) || 0;
      if (!p && !a) return '<span class="bmv-zero">–</span>';
      return '<span class="bsv-cur">' + bmvNum(p) + '<em title="이번 달 지금까지 실적">실적 ' + bmvNum(a) + '</em></span>';
    }
    if (c.m && c.kind === 'past' && v && typeof summaryActualCell === 'function') {
      const it = row.months[c.idx[0]];
      const h = String(summaryActualCell(row, it));
      if (/<\/button>|<\/a>/.test(h)) return h.replace(/>[^<]*<\/(button|a)>/, function (m0, tag) { return '>' + bmvNum(v) + '</' + tag + '>'; });
    }
    return v ? bmvNum(v) : '<span class="bmv-zero">–</span>';
  };
  const head = bmvHead(cols, [['계정', 'bmv-fix bmv-c0'], ['계획', 'bmv-fix bmv-c1'], ['실적', 'bmv-fix bmv-c2'], ['잔여예산', 'bmv-fix bmv-c3'], ['진행률', 'bmv-fix bsv-c4']]);
  // [2026.11.17] 계정(1단) 접기/펴기 — 접은 계정의 하위(2단) 행은 그리지 않습니다(엑셀도 보이는 그대로)
  const parents = rows.filter(function (r) { return r.level === 1; }).map(function (r) { return r.name; });
  const hasKids = {};
  let cur = null;
  rows.forEach(function (r) { if (r.level === 1) cur = r.name; else if (r.level === 2 && cur) hasKids[cur] = true; });
  cur = null;
  const allFolded = parents.some(function (p) { return hasKids[p]; }) && parents.every(function (p) { return !hasKids[p] || bsvFold[p]; });
  bsvAllFolded = !!allFolded;
  const body = rows.filter(function (row) {
    if (row.level === 1) cur = row.name;
    else if (row.level === 0) cur = null;
    return !(row.level === 2 && cur && bsvFold[cur]);
  }).map(function (row) {
    // [2026.11.17] 트리 표시 — ⊟⊞○ 글자 대신 꺾쇠 아이콘(펼침 = 아래, 접힘 = 오른쪽). 하위 계정은 아이콘 없이 들여쓰기
    let icon = '<span class="bsv-sp"></span>';
    if (row.level === 1 && hasKids[row.name]) {
      const folded = !!bsvFold[row.name];
      const q = escHtml(String(row.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
      icon = `<button type="button" class="bsv-tog${folded ? '' : ' open'}" onclick="bsvToggle('${q}')" aria-expanded="${folded ? 'false' : 'true'}"
        aria-label="${escHtml(row.name)} 하위 계정 ${folded ? '펴기' : '접기'}" title="${escHtml(row.name)} 하위 계정 ${folded ? '펴기' : '접기'}">${BSV_CHEVRON}</button>`;
    } else if (row.level === 0) {
      icon = `<button type="button" class="bsv-tog${allFolded ? '' : ' open'}" onclick="bsvFoldAll(${allFolded ? 'false' : 'true'})" aria-expanded="${allFolded ? 'false' : 'true'}"
        aria-label="모든 계정 ${allFolded ? '펴기' : '접기'}" title="모든 계정 ${allFolded ? '펴기' : '접기'}">${BSV_CHEVRON}</button>`;
    } else if (row.level === 2) {
      icon = '';
    }
    return `<tr class="bsv-lv${row.level}${row.level === 0 ? ' bmv-total' : ''}${row.level === 1 && bsvFold[row.name] ? ' bsv-folded' : ''}">
      <td class="bmv-fix bmv-c0">${icon}${escHtml(row.name)}</td>
      <td class="bmv-fix bmv-c1 num">${bmvNum(row.totalPlan)}</td>
      <td class="bmv-fix bmv-c2 num">${bmvNum(row.totalActual)}</td>
      <td class="bmv-fix bmv-c3 num">${bmvNum(row.remain)}</td>
      <td class="bmv-fix bsv-c4"><div class="bsv-rate"><i style="width:${Math.min(Number(row.rate) || 0, 100)}%"></i></div><b>${row.rate}%</b></td>
      ${cols.map(function (c) { return `<td class="num ${c.kind}">${cell(row, c)}</td>`; }).join('')}</tr>`;
  }).join('');

  return `
    <div class="project-plan-summary">
      <div class="pps-titlebar">
        <div><span></span><strong>프로젝트 수행비용</strong></div>
      </div>
      <div class="pps-top">
        <div>
          <span>총 계획예산</span>
          <strong>${fmt(total.totalPlan)}원</strong>
        </div>
        <div class="pps-top-progress">
          <span>실행예산 진행률</span>
          <div><i style="width:${Math.min(total.rate, 100)}%"></i><b>${total.rate}%</b></div>
        </div>
        <ul>
          <li><span>실적</span><strong>${fmt(total.totalActual)}원</strong></li>
          <li><span>잔여예산</span><strong>${fmt(total.remain)}원</strong></li>
        </ul>
      </div>
      <div class="bmv-wrap bsv-wrap">
        ${bmvTools(cv, "bxeMonthly('전체 현황', this)").replace('<em class="bmv-unit">',
          `<button type="button" class="bmv-act bsv-foldall${bsvAllFolded ? '' : ' open'}" onclick="bsvFoldAll(${bsvAllFolded ? 'false' : 'true'})"
            aria-expanded="${bsvAllFolded ? 'false' : 'true'}" title="${bsvAllFolded ? '모든 계정의 하위 계정을 펼칩니다' : '모든 계정의 하위 계정을 접고 계정 합계만 봅니다'}">${BSV_CHEVRON}${bsvAllFolded ? '전체 펴기' : '전체 접기'}</button><em class="bmv-unit">`)}
        <div class="bmv-scroll">
          <table class="bmv-table bsv-table">
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p class="bmv-note"><b class="act"></b>확정 실적 <b class="plan"></b>계획 <b class="sum"></b>합계 · 회계 마감된 달은 실적, 진행 중인 달은 계획(위) + 지금까지 실적(아래 파랑), 이후 달은 계획 · 실적 금액(밑줄)을 누르면 계정별 상세 실적 내역을 볼 수 있습니다.</p>
      </div>
    </div>`;
}

function bsvInjectStyle() {
  if (document.getElementById('bsv-style')) return;
  const st = document.createElement('style');
  st.id = 'bsv-style';
  st.textContent = `
  #s-budget .bsv-cur { display:inline-flex; flex-direction:column; align-items:flex-end; line-height:1.15; }
  #s-budget .bsv-cur em { font-style:normal; font-size:11.5px; font-weight:700; color:#2563eb; margin-top:2px; white-space:nowrap; }
  .bsv-wrap { margin-top:14px; }
  .bsv-wrap .bmv-scroll { max-height:none; }
  .bsv-table .bmv-c0 { min-width:178px; }
  .bsv-table .bmv-c1 { left:178px; min-width:100px; } .bsv-table .bmv-c2 { left:278px; min-width:100px; }
  .bsv-table .bmv-c3 { left:378px; min-width:100px; box-shadow:none; }
  .bsv-c4 { left:478px; min-width:118px; box-shadow:inset -1px 0 0 #e2e8f0; }
  .bsv-c4 .bsv-rate { display:inline-block; vertical-align:middle; width:54px; height:6px; border-radius:99px; background:#e2e8f0; overflow:hidden; margin-right:6px; }
  .bsv-c4 .bsv-rate i { display:block; height:100%; background:#3b82f6; border-radius:99px; }
  .bsv-c4 b { font-size:11.5px; color:#475569; font-variant-numeric:tabular-nums; }
  .bsv-ico { display:inline-block; width:16px; color:#64748b; font-weight:700; }
  .bsv-tog, .bsv-sp { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; margin:0 6px 0 -4px; vertical-align:-5px; }
  .bsv-tog { padding:0; border:0; border-radius:6px; background:transparent; color:#64748b; cursor:pointer; }
  .bsv-tog:hover { background:#e8eef6; color:#1d4ed8; }
  .bsv-tog:focus-visible { outline:2px solid #93c5fd; outline-offset:1px; }
  .bsv-chev { display:block; transition:transform .15s ease; }
  .bsv-tog.open .bsv-chev, .bsv-foldall.open .bsv-chev { transform:rotate(90deg); }
  .bsv-foldall .bsv-chev { margin-right:2px; }
  .bsv-table tr.bsv-folded td { border-bottom-color:#e2e8f0; }
  .bsv-table tr.bsv-lv1 td.bmv-c0 { padding-left:22px; }
  .bsv-table tr.bsv-lv2 td.bmv-c0 { padding-left:46px; font-weight:600; color:#334155; }
  .bsv-table tr.bsv-lv1 td { border-top:1px solid #e2e8f0; }
  .bsv-table tr.bsv-lv1 td:not(.sum):not(.act):not(.past) { background:#fcfdff; }
  `;
  document.head.appendChild(st);
}
