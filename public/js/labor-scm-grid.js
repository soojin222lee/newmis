// [2026.11.18 남주] 원가조정 > 인건비 — "SCM 확정 인력 등록" 팝업 표 개편
// - 원본(budget-agent-console.js renderAgentScmPopupFinal)은 "월별 MM" 한 칸 안에 작은 표(월/값 2줄)를 또 넣어
//   사람마다 월 위치가 달라 비교가 어렵고 글씨가 10.5px로 작았음.
// - 월을 바깥 표의 칸으로 바로 펼침: 연도/월 2줄 머리 + 사람별 같은 달이 세로로 정렬. 투입 없는 달은 "·".
// - 투입기간 칸은 뺌(숫자가 있는 달 = 기간, 이름 칸 아래에 작게 남김). 이름+사번 / 역할+P레벨은 한 칸 두 줄.
// - "변경" 인력은 현재 계획과 MM이 다른 달만 주황으로 강조(마우스를 올리면 현재 계획 → SCM 값).
// - 데이터·선택·반영 함수(AGENT_SCM_TEAMING_FINAL, agentScm*Final)는 원본 그대로 재사용. 렌더러만 재정의.
// - budget-agent-console.js 뒤에 로드.

function lsgMonthsFinal() {
  var set = {};
  (typeof AGENT_SCM_TEAMING_FINAL !== 'undefined' ? AGENT_SCM_TEAMING_FINAL : []).forEach(function (r) {
    Object.keys(r.monthly || {}).forEach(function (m) { set[m] = 1; });
  });
  return Object.keys(set).sort();
}

function lsgPlanMmFinal(r, m) {
  var p = (typeof agentScmPlanRowFinal === 'function') ? agentScmPlanRowFinal(r.name) : null;
  if (!p || !p.monthly) return null;
  return Number(p.monthly[m] || 0);
}

function lsgFmtMm(v) { return (Math.round(Number(v) * 10) / 10).toFixed(1); }

renderAgentScmPopupFinal = function () {
  var esc = (typeof escHtml === 'function') ? escHtml : function (s) { return String(s); };
  var months = lsgMonthsFinal();

  // 연도 묶음 머리 (2026 | 2027)
  var years = [];
  months.forEach(function (m) {
    var y = m.slice(0, 4);
    if (!years.length || years[years.length - 1].y !== y) years.push({ y: y, n: 0 });
    years[years.length - 1].n++;
  });
  var yearHead = years.map(function (g, i) {
    return '<th class="lsg-yr' + (i === 0 ? ' lsg-first' : '') + '" colspan="' + g.n + '">' + g.y + '년</th>';
  }).join('');
  var monthHead = months.map(function (m, i) {
    var y0 = i === 0 || months[i - 1].slice(0, 4) !== m.slice(0, 4);
    return '<th class="lsg-mo' + (y0 ? ' lsg-first' : '') + '">' + Number(m.slice(5)) + '월</th>';
  }).join('');

  var rowsHtml = AGENT_SCM_TEAMING_FINAL.map(function (r) {
    var stt = agentScmStatusFinal(r);
    var same = stt === '동일';
    var mm = agentScmTotalMmFinal(r);
    var badge = stt === '신규' ? '<span class="ascm-b new">신규</span>'
      : stt === '변경' ? '<span class="ascm-b chg">변경</span>'
      : '<span class="ascm-b same">동일</span>';
    var checked = agentScmSelFinal[r.emp] ? 'checked' : '';
    var cells = months.map(function (m, i) {
      var y0 = i === 0 || months[i - 1].slice(0, 4) !== m.slice(0, 4);
      var has = Object.prototype.hasOwnProperty.call(r.monthly || {}, m) && Number(r.monthly[m]) > 0;
      var v = has ? Number(r.monthly[m]) : 0;
      var cls = 'lsg-v' + (y0 ? ' lsg-first' : '');
      var title = '';
      if (stt === '변경') {
        var pv = lsgPlanMmFinal(r, m);
        if (pv !== null && Math.round(pv * 10) !== Math.round(v * 10)) {
          cls += ' lsg-diff';
          title = ' title="현재 계획 ' + lsgFmtMm(pv) + ' → SCM ' + lsgFmtMm(v) + '"';
        }
      }
      return '<td class="' + cls + '"' + title + '>' + (has ? lsgFmtMm(v) : '<span class="lsg-none">·</span>') + '</td>';
    }).join('');
    return '<tr class="' + (same ? 'ascm-same' : '') + '">'
      + '<td class="lsg-c">' + (same ? '<span class="ascm-done">반영됨</span>'
        : '<input type="checkbox" class="lsg-chk" ' + checked + ' onclick="agentScmToggleSelFinal(\'' + r.emp + '\')" aria-label="' + esc(r.name) + ' 선택">') + '</td>'
      + '<td class="lsg-c">' + badge + '</td>'
      + '<td><b class="lsg-nm">' + esc(r.name) + '</b> <span class="lsg-sub">' + r.emp + '</span>'
      + '<div class="lsg-sub">' + r.start.slice(2).replace(/-/g, '.') + ' ~ ' + r.end.slice(2).replace(/-/g, '.') + '</div></td>'
      + '<td>' + esc(r.role) + '<div class="lsg-sub">' + r.pLevel + '</div></td>'
      + '<td class="num lsg-tot">' + lsgFmtMm(mm)
      + (stt === '변경' && agentScmPlanRowFinal(r.name)
        ? '<div class="lsg-sub lsg-was">계획 ' + lsgFmtMm(agentScmPlanRowFinal(r.name).totalMm || 0) + '</div>' : '')
      + '</td>'
      + cells
      + '<td class="lsg-ap">' + esc(String(r.approvedAt).slice(0, 10)) + '</td></tr>';
  }).join('');

  var selCnt = AGENT_SCM_TEAMING_FINAL.filter(function (r) { return agentScmSelFinal[r.emp] && agentScmStatusFinal(r) !== '동일'; }).length;

  return '<div class="ascm-ov" onclick="if(event.target===this)agentScmCloseFinal()">'
    + '<div class="ascm-card lsg-card">'
    + '<div class="ascm-head"><b>SCM 확정 인력 등록 — 프로젝트 티밍 인력</b><button onclick="agentScmCloseFinal()" aria-label="닫기">✕</button></div>'
    + '<div class="ascm-note lsg-note">현재 프로젝트에 <b>SCM 티밍(최종 확정)</b>된 사내 인력입니다. 지금 실행예산과 비교해 '
    + '<span class="ascm-b new">신규</span> <span class="ascm-b chg">변경</span>을 표시하고, 변경된 달은 <span class="lsg-diff-key">주황</span>으로 보여 줍니다. '
    + '반영할 인력을 선택해 [인력계획에 반영]을 누르세요.</div>'
    + '<div class="ascm-tblwrap"><table class="ascm-tbl lsg-tbl"><thead>'
    + '<tr><th rowspan="2" class="lsg-c">선택</th><th rowspan="2" class="lsg-c">구분</th><th rowspan="2">이름 / 사번</th><th rowspan="2">역할 / P레벨</th>'
    + '<th rowspan="2" class="num">총MM</th>' + yearHead + '<th rowspan="2">SCM 승인일</th></tr>'
    + '<tr>' + monthHead + '</tr>'
    + '</thead><tbody>' + rowsHtml + '</tbody></table></div>'
    + '<div class="ascm-foot"><span class="ascm-cnt">선택 ' + selCnt + '건</span>'
    + '<button class="ascm-sub" onclick="agentScmCloseFinal()">닫기</button>'
    + '<button class="ascm-pri" onclick="agentScmApplyFinal()">인력계획에 반영</button></div>'
    + '</div></div>';
};

(function injectLaborScmGridStyle() {
  if (typeof document === 'undefined' || document.getElementById('lsg-style')) return;
  var st = document.createElement('style');
  st.id = 'lsg-style';
  st.textContent = [
    '.lsg-card{width:1120px !important}',
    '.lsg-note{font-size:13px !important;color:#475569 !important}',
    '.lsg-tbl{font-size:13px !important}',
    '.lsg-tbl th{vertical-align:middle;padding:7px 10px !important}',
    '.lsg-tbl thead tr:nth-child(2) th{top:31px}',
    '.lsg-tbl td{vertical-align:middle;padding:9px 10px !important;font-size:13.5px !important;line-height:1.45}',
    '.lsg-tbl th{font-size:13px !important}',
    '.lsg-tbl .lsg-sub{font-size:12px !important}',
    '.lsg-was{color:#b45309 !important;font-weight:700 !important}',
    '.lsg-tbl .lsg-c{text-align:center}',
    '.lsg-tbl th.lsg-yr{text-align:center;border-bottom:1px solid #dfe3ea;color:#334155}',
    '.lsg-tbl th.lsg-mo{text-align:center;min-width:46px;font-weight:700;color:#475569;background:#f8fafc}',
    '.lsg-tbl .lsg-first{border-left:1px solid #dfe3ea}',
    '.lsg-tbl td.lsg-v{text-align:center;font-variant-numeric:tabular-nums;font-weight:700;color:#1f2937;padding:9px 6px !important}',
    '.lsg-tbl td.lsg-diff{background:#fff3e0;color:#b45309;font-weight:800}',
    '.lsg-none{color:#cbd5e1;font-weight:400}',
    '.lsg-tbl .lsg-tot{font-weight:800;color:#0f172a}',
    '.lsg-nm{font-size:13.5px;color:#0f172a}',
    '.lsg-sub{font-size:12px;color:#64748b;font-weight:500}',
    '.lsg-ap{color:#475569;font-variant-numeric:tabular-nums}',
    '.lsg-chk{width:16px;height:16px;cursor:pointer}',
    '.lsg-diff-key{background:#fff3e0;color:#b45309;font-weight:800;padding:1px 6px;border-radius:4px}',
    '.lsg-tbl .ascm-b{font-size:12px}',
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
