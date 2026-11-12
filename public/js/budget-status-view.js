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
    if (c.m && c.kind === 'past' && v && typeof summaryActualCell === 'function') {
      const it = row.months[c.idx[0]];
      const h = String(summaryActualCell(row, it));
      if (/<\/button>|<\/a>/.test(h)) return h.replace(/>[^<]*<\/(button|a)>/, function (m0, tag) { return '>' + bmvNum(v) + '</' + tag + '>'; });
    }
    return v ? bmvNum(v) : '<span class="bmv-zero">–</span>';
  };
  const head = bmvHead(cols, [['계정', 'bmv-fix bmv-c0'], ['계획', 'bmv-fix bmv-c1'], ['실적', 'bmv-fix bmv-c2'], ['잔여예산', 'bmv-fix bmv-c3'], ['진행률', 'bmv-fix bsv-c4']]);
  const body = rows.map(function (row) {
    const icon = row.level === 2 ? '○' : '⊟';
    return `<tr class="bsv-lv${row.level}${row.level === 0 ? ' bmv-total' : ''}">
      <td class="bmv-fix bmv-c0"><span class="bsv-ico">${icon}</span>${escHtml(row.name)}</td>
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
        <div class="pps-actions">
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
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
        ${bmvTools(cv, "bxeMonthly('전체 현황', this)")}
        <div class="bmv-scroll">
          <table class="bmv-table bsv-table">
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p class="bmv-note"><b class="act"></b>확정 실적 <b class="plan"></b>계획 <b class="sum"></b>합계 · 지난 달은 실적, 이후 달은 계획 · 실적 금액(밑줄)을 누르면 계정별 상세 실적 내역을 볼 수 있습니다.</p>
      </div>
    </div>`;
}

function bsvInjectStyle() {
  if (document.getElementById('bsv-style')) return;
  const st = document.createElement('style');
  st.id = 'bsv-style';
  st.textContent = `
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
  .bsv-table tr.bsv-lv1 td.bmv-c0 { padding-left:22px; }
  .bsv-table tr.bsv-lv2 td.bmv-c0 { padding-left:38px; font-weight:600; color:#334155; }
  .bsv-table tr.bsv-lv1 td { border-top:1px solid #e2e8f0; }
  .bsv-table tr.bsv-lv1 td:not(.sum):not(.act):not(.past) { background:#fcfdff; }
  `;
  document.head.appendChild(st);
}
