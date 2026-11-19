// [2026.11.18 남주] 원가조정(Agent 화면) — "카드 안의 카드" 걷어 내기 (중간안)
// - 바깥 카드(요약 .agai-top / 예산 조정안 .agga-col.todo / 계정 상세 .agga-col.detail / 오른쪽 .b2c-side)는 그대로 두고
//   그 안쪽 작은 카드만 구분선·표·밑줄 탭으로 바꾼다. 색·글꼴은 기존 그대로.
//   ① 요약 계정 카드 5개 → 세로선으로 나눈 한 줄. 보는 중인 계정 = 계정색을 아주 옅게 깐 칸 + 계정색 윗선
//   ② 예산 조정안 카드 → 한 건 = 한 행(구분선). 상태 탭(전체/검토 대기/반영)은 밑줄 탭
//   ③ 계정 상세 패널의 굵은 색 테두리 → 옅은 테두리
//   ④ 인건비 01~03 · 외주비 01~06 큰 카드 → 제목 줄에 붙은 탭(연한 세로선, 고른 탭 = 옅은 계정색 칸 + 계정색 윗선 + 진한 글자)
//   ⑤ 인력표 · 인력 투입 일정을 감싸던 둥근 상자 제거
// - 대부분 CSS만 바꾸고 마크업·동작은 손대지 않는다(⑩ 요약 계정 칸 금액만 렌더 결과를 고침). budget-agent-console.js 등 원가조정 파일들 뒤에 로드.

(function injectBudgetFlatLayers() {
  if (typeof document === 'undefined' || document.getElementById('bfl-style')) return;
  var S = '#s-budget .agent-ga';
  var st = document.createElement('style');
  st.id = 'bfl-style';
  st.textContent = [
    // ── ① 요약: 계정 카드 → 세로선 한 줄 ──
    S + ' .agai-accts{gap:0 !important;align-self:stretch}',
    S + ' .agai-acct{border:0 !important;border-left:1px solid #e5e8ed !important;border-radius:0 !important;box-shadow:none !important;background:transparent !important;padding:8px 16px 8px !important}',
    S + ' .agai-acct:hover{background:#f8fafc !important}',
    S + ' .agai-accts.has-view .agai-acct:not(.viewing){opacity:.72 !important}',
    S + ' .agai-accts.has-view .agai-acct:not(.viewing):hover{opacity:1 !important}',
    //   보는 중인 계정 = 계정색을 아주 옅게 깐 칸 + 계정색(--acc) 윗선 — 아래 상세 탭과 같은 방식
    S + ' .agai-acct.on, ' + S + ' .agai-acct.viewing{background:var(--acc-bg,#fff) !important;box-shadow:inset 0 3px 0 var(--acc,#1d4ed8) !important}',

    // ── ② 예산 조정안: 카드 → 행 ──
    S + ' .agga-col.todo .agga-card{border:0 !important;border-bottom:1px solid #eef0f3 !important;border-radius:0 !important;box-shadow:none !important;background:transparent !important;margin:0 !important;padding:13px 6px !important}',
    S + ' .agga-col.todo .agga-card:last-child{border-bottom:0 !important}',
    S + ' .agga-col.todo .agga-card:hover{background:#fafbfc !important}',
    //   반영한 행 = 옅은 초록 배경만(왼쪽 세로선은 위 「전체」 탭 밑줄과 이어져 보여 뺌). 「✔ 반영됨」 버튼이 상태를 알려 줌
    S + ' .agga-col.todo .agga-card.on{background:#f3fbf7 !important;box-shadow:none !important}',
    //   계정 배지는 알약 배경을 빼고 색 점 + 글자색만
    S + ' .agga-card .agp-acct{background:transparent !important;padding:0 !important;border-radius:0 !important;font-size:13px !important;display:inline-flex;align-items:center;gap:6px}',
    S + ' .agga-card .agp-acct::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;flex:0 0 auto}',
    S + ' .agga-card .agai-tag.agent{background:transparent !important;border:0 !important;padding:0 !important;color:#64748b !important;font-weight:600 !important}',
    //   상태 탭: 회색 알약 묶음 → 밑줄 탭
    S + ' .bap-tabs{background:transparent !important;padding:0 !important;border-radius:0 !important;gap:22px !important;border-bottom:1px solid #e5e8ed;margin:0 0 2px !important}',
    S + ' .bap-tab{background:transparent !important;box-shadow:none !important;border-radius:0 !important;flex:0 0 auto !important;padding:9px 2px 8px !important;border-bottom:3px solid transparent !important;margin-bottom:-1px}',
    S + ' .bap-tab.sel{background:transparent !important;box-shadow:none !important;border-bottom-color:#64748b !important;font-weight:800}',

    // ── ③ 계정 상세 패널: 굵은 색 테두리 → 옅은 테두리 ──
    S + ' .agga-col.detail.acc{border:1px solid #dde2e9 !important;box-shadow:none !important}',
    S + ' .agga-col.detail.acc > .agga-col-head{background:#fff !important;border-bottom-color:#e5e8ed !important}',

    // ── ④ 인건비 01~03 · 외주비 01~06 큰 카드 → 폴더 탭 ──
    //   제목 줄(인건비 예산내역) 바로 아래 패널 폭 전체에 붙인 회색 띠. 고른 탭만 흰색이 되어 아래 표와 한 장으로 이어지고 계정색 윗선
    //   탭은 연한 세로선으로 나누고, 많아도(외주비 6개) 가로 스크롤 없이 칸을 나눠 한 줄에 맞춘다 (budget-ui-unify.js 의 5개 이상 가로 스크롤을 덮음)
    S + ' .agga-col .aglb-tabs{display:flex !important;gap:0 !important;background:#fff !important;border-bottom:1px solid #e5e8ed;margin:0 0 14px !important;grid-template-columns:none !important;overflow:visible !important;padding-bottom:0 !important}',
    S + ' .agga-col.detail .agga-col-body > .aglb-tabs{margin:-14px -15px 14px !important}',
    S + ' .agga-col .aglb-tabs > button{flex:1 1 0 !important;min-width:0 !important;border:0 !important;border-bottom:1px solid #e5e8ed !important;border-radius:0 !important;background:transparent !important;box-shadow:none !important;padding:11px 14px 9px !important;margin-bottom:-1px;color:#475569 !important;display:flex !important;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;height:auto !important;text-align:left}',
    S + ' .agga-col .aglb-tabs > button:first-child{padding-left:16px !important}',
    S + ' .agga-col .aglb-tabs > button + button{border-left:1px solid #e5e8ed !important}',
    S + ' .agga-col .aglb-tabs > button em{display:none !important}',
    S + ' .agga-col .aglb-tabs > button .aglb-tabname{font-size:14px;font-weight:700;line-height:1.3;word-break:keep-all}',
    S + ' .agga-col .aglb-tabs > button i{color:#64748b !important;font-style:normal;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}',
    S + ' .agga-col .aglb-tabs > button:hover{color:#1c2432 !important;background:#f8fafc !important}',
    S + ' .agga-col .aglb-tabs > button:not(.on) .aglb-tabname, ' + S + ' .agga-col .aglb-tabs > button:not(.on) i{color:#8590a2 !important}',
    S + ' .agga-col .aglb-tabs > button.on{background:var(--acc-bg,#fff) !important;color:#0f172a !important;border-bottom-color:transparent !important;box-shadow:inset 0 3px 0 var(--acc,#1d4ed8) !important}',
    S + ' .agga-col .aglb-tabs > button.on + button, ' + S + ' .agga-col .aglb-tabs > button + button.on{border-left-color:#dfe3e9 !important}',
    S + ' .agga-col .aglb-tabs > button.on .aglb-tabname{font-weight:900}',
    S + ' .agga-col .aglb-tabs > button.on i{color:#1c2432 !important;font-weight:900}',

    // ── ⑤ 인력표 · 투입 일정 상자 제거 ──
    S + ' .aglb-wrap{border:0 !important;border-radius:0 !important;background:transparent !important;box-shadow:none !important;border-top:1px solid #e5e8ed !important}',
    S + ' table.aglb tfoot td{border-top:1.5px solid #475569 !important}',
    S + ' .aglg{border:0 !important;border-radius:0 !important;background:transparent !important;box-shadow:none !important;margin-top:22px !important}',
    //   표 칸 옆 여백을 조금 줄여 외주비 표(8칸)도 가로 스크롤 없이 들어가게
    S + ' .agga-col.detail table.aglb th, ' + S + ' .agga-col.detail table.aglb td{padding-left:8px !important;padding-right:8px !important}',
    S + ' .aglg-head{border-bottom:1px solid #e5e8ed !important;background:transparent !important;padding-left:2px !important;padding-right:2px !important}',

    // ── ⑦ 색 정리 — 계정마다 입히던 색(인건비 파랑 · 외주비 빨강 …)은 빼고, 증감 색은 화면 전체에서 한 규칙으로 ──
    //   파랑이 앱 주 색과, 빨강이 경고와 겹쳐 보이던 문제. 고른 계정 = 계정색을 아주 옅게 깐 칸 + 계정색 윗선
    //   선택 표시 = 계정색 윗선 + 계정색을 아주 옅게(6%) 깐 칸 — 원가현황 계정 타일과 같은 5대 계정 색 규칙. 금액 글자는 증감 색과 헷갈리지 않게 검정 유지
    S + ' .agai-acct, ' + S + ' .agga-col.detail.acc{--acc-bg:color-mix(in srgb, var(--acc,#64748b) 6%, #fff) !important}',
    S + ' .agai-acct em{color:#475569 !important}',
    S + ' .agai-top b{color:#1c2432 !important}',
    S + ' .agai-top .agai-arrow{color:#94a3b8 !important}',
    S + ' .agga-col.detail .agga-col-head strong{color:#1c2432 !important}',
    S + ' .agga-col.detail .agga-home{color:#334155 !important;border-color:#cbd5e1 !important}',
    S + ' .agga-card .agp-acct{color:#1c2432 !important}',
    //   계정 색은 「계정이 섞여 보이는 곳」에만 작은 점으로 — 예산 조정안 목록 · 상단 요약의 계정 이름 앞. 칸 · 탭 · 제목 · 선택선은 무채색
    S + ' .agai-acct em{display:inline-flex !important;align-items:center;gap:6px}',
    S + ' .agai-acct em::before{content:"";width:8px;height:8px;border-radius:50%;background:#94a3b8;flex:0 0 auto}',
    S + ' .agga-card .agp-acct.a-blue::before, ' + S + ' .agai-acct em.a-blue::before{background:#2f6bed !important}',
    S + ' .agga-card .agp-acct.a-red::before, ' + S + ' .agai-acct em.a-red::before{background:#d6334f !important}',
    S + ' .agga-card .agp-acct.a-yellow::before, ' + S + ' .agai-acct em.a-yellow::before{background:#e09a1a !important}',
    S + ' .agga-card .agp-acct.a-green::before, ' + S + ' .agai-acct em.a-green::before{background:#1f9d6b !important}',
    S + ' .agga-card .agp-acct.a-sky::before, ' + S + ' .agai-acct em.a-sky::before{background:#1f9fd6 !important}',
    //   증감 = 한국식으로 통일: 증액(+) 빨강 · 감액(−) 파랑 (원래는 요약은 + 빨강, 예산 조정안은 + 파랑으로 서로 반대였음)
    S + ' .agai-top em.up, ' + S + ' .agai-acct.up span, ' + S + ' .agga-amt.up{color:#d1242f !important}',
    S + ' .agai-top em.down, ' + S + ' .agai-acct.down span, ' + S + ' .agga-amt.down{color:#1d5bd8 !important}',

    // ── ⑧ 엑셀 다운로드는 모든 계정에서 오른쪽 [등록] · [저장] 옆 (외주비 · 재료비 · A/S 는 왼쪽에 있었음). 선택삭제는 왼쪽 그대로 ──
    S + ' .aglb-bar:has(> .bie-delsel) > .bie-delsel{order:1}',
    S + ' .aglb-bar:has(> .bie-delsel) > .bxe-btn{order:2;margin-left:auto !important}',
    S + ' .aglb-bar:has(> .bie-delsel) > .aglb-add{order:3;margin-left:0 !important}',
    S + ' .aglb-bar:has(> .bie-delsel) > .bie-savebar{order:4}',

    // ── ⑨ 「상세 보는 중」 뱃지 숨김 — 고른 칸(옅은 계정색 + 윗선)과 아래 패널 제목이 이미 알려 줌. 다시 누르면 돌아간다는 안내는 마우스 말풍선(title)에 남아 있음 ──
    S + ' .agai-acct .agai-viewing{display:none !important}',

    // ── ⑥ 「← 목록」 버튼이 요약 카드 테두리에 겹치던 것 → 카드 위 빈 줄로 올림 ──
    '#s-budget:has(.agent-ga) > #budget-body > .mc-back-btn{top:-24px !important}',
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();

// ── ⑩ 요약 금액 — 큰 숫자 = 반영 후 금액(계정 5칸을 더하면 왼쪽 「반영 시」 합계와 맞음) ──
//   그 아래 바뀐 계정만 한 줄: 「+70,000,000원」(빨강) / 「−10,000,000원」(파랑). 기존 금액은 마우스 말풍선.
//   왼쪽 「반영 시」 합계 아래 증감도 같은 모양(「+60,600,000원」)으로 맞춤. [2026.11.19] 「증액/감액」 글자 → 부호로 변경.
//   원래는 큰 숫자 아래에 부호만 붙은 「+70,000,000원」이 있어 "588,800,000 에 또 더해진다"로 읽힐 수 있었음.
//   증감 줄 자리는 늘 잡아 둬(아래 CSS min-height) 반영해도 칸 높이가 출렁이지 않게 함.
//   원본 renderAgentAiTopFinal 의 결과 HTML만 고침(데코레이터).
if (typeof renderAgentAiTopFinal === 'function') {
  var bflRenderAgentAiTopBefore = renderAgentAiTopFinal;
  //   [2026.11.19] 「증액/감액」 글자 대신 부호로 — 「+70,000,000원」(빨강) / 「−10,000,000원」(파랑)
  var bflDelta = function (sign, d) { return (sign === '+' ? '+' : '−') + d + '원'; };
  renderAgentAiTopFinal = function () {
    var html = bflRenderAgentAiTopBefore.apply(this, arguments);
    var at = html.indexOf('agai-accts');
    if (at < 0) return html;
    var head = html.slice(0, at), tail = html.slice(at);
    //   왼쪽 「반영 시」 합계 아래: <em class="up">+60,600,000원</em> → <em class="up">60,600,000원 증액</em>
    head = head.replace(/<em class="(up|down)">([+−-])([\d,]+)원<\/em>/, function (m, cls, sign, d) {
      return '<em class="' + cls + '">' + bflDelta(sign, d) + '</em>';
    });
    tail = tail.replace(/<b>([\d,]+)<\/b>(\s*)<span>([+−-])([\d,]+)원<\/span>/g, function (m, after, sp, sign, d) {
      var a = Number(after.replace(/,/g, '')), dv = Number(d.replace(/,/g, ''));
      if (!isFinite(a) || !isFinite(dv)) return m;
      var up = sign === '+';
      var was = up ? a - dv : a + dv;
      return '<b>' + after + '</b>' + sp
        + '<span class="bfl-after" title="기존 ' + fmt(was) + '원 → 반영 후 ' + after + '원">'
        + '<u class="bfl-d ' + (up ? 'up' : 'down') + '">' + bflDelta(sign, d) + '</u></span>';
    });
    return head + tail;
  };
}

(function injectBudgetFlatAfterStyle() {
  if (typeof document === 'undefined' || document.getElementById('bfl-after-style')) return;
  var st = document.createElement('style');
  st.id = 'bfl-after-style';
  st.textContent = [
    //   증감 줄 자리를 늘 한 줄 잡아 둠 — 반영 전후로 칸 높이가 바뀌지 않게
    '#s-budget .agent-ga .agai-top:not(.compact) .agai-accts .agai-acct > span{display:block !important;min-height:17px}',
    '#s-budget .agent-ga .agai-accts .agai-acct span.bfl-after{font-size:12px !important;line-height:17px}',
    '#s-budget .agent-ga .agai-accts .agai-acct span.bfl-after u{text-decoration:none;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '#s-budget .agent-ga .agai-accts .agai-acct span.bfl-after u.bfl-d{font-weight:800}',
    '#s-budget .agent-ga .agai-accts .agai-acct span.bfl-after u.bfl-d.up{color:#d1242f !important}',
    '#s-budget .agent-ga .agai-accts .agai-acct span.bfl-after u.bfl-d.down{color:#1d5bd8 !important}',
    // ⑯ 이미 반영한 「✓ 반영됨」(·고른 1안/2안) 버튼에 마우스를 올리면 배경이 연초록으로 바뀌는데 글자는 흰색이라 안 보이던 것 → 진한 초록 유지
    '#s-budget .agent-ga .agga-col.todo .agai-yes.on:hover, #s-budget .agent-ga .agga-col.todo .agai-seg.on:hover{background:#0b6b43 !important;border-color:#0b6b43 !important;color:#fff !important}',
    // ⑫ 스크롤하면 위에 붙는 접힌 줄 — 계정 이름만 가운데 있던 것을 「● 인건비 …… 588,800,000 ▲」 한 줄로
    //   (상세 제목 줄 금액을 뺐으니 스크롤 중에도 계정 금액이 보이게). 증액/기존 두 줄은 접힌 줄에선 숨기고 ▲(증액 빨강) ▼(감액 파랑)만
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct{justify-content:space-between !important;padding:12px 16px !important;gap:10px}',
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct em{padding:0 !important;font-size:13px !important}',
    //   접힌 줄에선 계정 색 점을 빼서 ● 와 ▲ 가 한 칸에 같이 있지 않게 (도형은 증감 ▲▼ 하나만)
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct em::before{display:none !important}',
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct b{display:inline-flex !important;align-items:center;gap:4px;font-size:14px !important;font-variant-numeric:tabular-nums}',
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct span, #s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct span.bfl-after{display:none !important}',
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct.up b::after{content:"▲";color:#d1242f;font-size:10px}',
    '#s-budget .agent-ga .agai-top.compact .agai-accts .agai-acct.down b::after{content:"▼";color:#1d5bd8;font-size:10px}',
    // ⑬ 좁은 화면(1366px 노트북)에서 표 · 탭이 잘리지 않게 — 글자 칸은 필요할 때 줄바꿈(금액 · 버튼 칸은 한 줄 유지)
    '#s-budget .agent-ga .agga-col.detail table.aglb{word-break:keep-all}',
    '@media (max-width:1500px){#s-budget .agent-ga .agga-col.detail table.aglb td:not(.num):not(.aglb-act){white-space:normal !important}}',
    '#s-budget .agent-ga .agga-col.detail table.aglb th, #s-budget .agent-ga .agga-col.detail table.aglb .aglb-st, #s-budget .agent-ga .agga-col.detail table.aglb .aglb-lock, #s-budget .agent-ga .agga-col.detail table.aglb td button{white-space:nowrap !important}',
    '#s-budget .agent-ga .agga-col.detail table.aglb .aglb-sub{white-space:normal !important}',
    //   업체명 칸(외주비): 펼침 화살표를 왼쪽에 고정해 이름이 줄바꿈돼도 화살표만 한 줄에 남지 않게
    '#s-budget .agent-ga .agga-col.detail table.aglb td:has(> .agos-caret){position:relative;padding-left:28px !important}',
    '#s-budget .agent-ga .agga-col.detail table.aglb td > .agos-caret{position:absolute;left:8px;top:15px}',
    //   글자 칸 낱말 = 끊기지 않는 덩어리(아래 bflWrapTokens) → 날짜 · 품번의 하이픈(-)이나 단어 중간에서 줄이 끊기지 않음
    '#s-budget .agent-ga .agga-col.detail table.aglb .bfl-tok{white-space:nowrap}',
    //   탭: 똑같은 폭으로 나누면 긴 이름(전문직수수료/제안/기타)이 옆 탭으로 넘쳐 겹침 → 이름 길이만큼 폭을 갖고 남는 폭을 나눔. 좁은 화면은 여백 · 글씨 조금 줄임
    '#s-budget .agent-ga .agga-col .aglb-tabs > button{flex:1 1 auto !important;min-width:auto !important}',
    '#s-budget .agent-ga .agga-col .aglb-tabs > button .aglb-tabname, #s-budget .agent-ga .agga-col .aglb-tabs > button i{white-space:nowrap}',
    '@media (max-width:1500px){#s-budget .agent-ga .agga-col .aglb-tabs > button{padding:10px 10px 9px !important}#s-budget .agent-ga .agga-col .aglb-tabs > button:first-child{padding-left:14px !important}#s-budget .agent-ga .agga-col .aglb-tabs > button .aglb-tabname, #s-budget .agent-ga .agga-col .aglb-tabs > button i{font-size:13px !important}}',
    // ⑭ 아무것도 고르지 않았을 때 회색 「고른 것 없음 1,614,256,000」(왼쪽 「지금 수립」과 같은 숫자)과 화살표를 숨김 — 반영하면 나타남
    //   자리는 그대로 두고 안 보이게만(visibility) — 반영할 때 나타나도 옆 계정 칸들이 밀리지 않게
    '#s-budget .agent-ga .agai-figs .agai-fig.idle, #s-budget .agent-ga .agai-figs .agai-arrow:not(.on){visibility:hidden !important}',
    // ⑮ 작은 글씨 키우기 — 10~11px 연회색 글씨를 12px 이상 + 조금 진한 회색으로 (30대 후반 이상 PM 가독성)
    '#s-budget .agent-ga .agai-accts .agai-acct em{font-size:12.5px !important}',
    '#s-budget .agent-ga .agai-fig > span{font-size:12px !important;color:#64748b !important}',
    '#s-budget .agent-ga .agai-ver, #s-budget .agent-ga .agai-cpbtn{font-size:12.5px !important}',
    '#s-budget .agent-ga .agai-conf{font-size:12px !important;color:#64748b !important}',
    '#s-budget .agent-ga .agai-ver em.draft{font-size:11.5px !important}',
    '#s-budget .agent-ga .agga-card .agai-tag.agent, #s-budget .agent-ga .agga-card .b2c-imp{font-size:12px !important}',
    '#s-budget .agent-ga .agga-at{font-size:12px !important;color:#8590a2 !important}',
    '#s-budget .agent-ga .agga-hint, #s-budget .agent-ga .agai-who{font-size:12px !important;color:#64748b !important}',
    '#s-budget .agent-ga .agai-yes, #s-budget .agent-ga .agga-why, #s-budget .agent-ga .agga-del, #s-budget .agent-ga .agai-seg{font-size:12.5px !important}',
    '#s-budget .agent-ga .agga-col.detail .agga-col-head .agga-dsub{font-size:12.5px !important;color:#64748b !important}',
    '#s-budget .agent-ga .agga-col.detail table.aglb th{font-size:12px !important;color:#475569 !important}',
    '#s-budget .agent-ga .agga-col.detail table.aglb .aglb-sub{font-size:12px !important;color:#64748b !important}',
    '#s-budget .agent-ga .agga-col.detail table.aglb td button{font-size:12px !important}',
    '#s-budget .agent-ga .agga-col.detail .aglb-st, #s-budget .agent-ga .agga-col.detail .aglb-lock{font-size:12px !important}',
    '#s-budget .agent-ga .agga-col.detail .agex-idle{font-size:12.5px !important;color:#64748b !important}',
    '#s-budget .agent-ga .bui-more{font-size:12px !important}',
    // ③ 상세 제목 줄의 금액(인건비 예산내역 518,800,000원 · 반영 후 …)은 위 요약 계정 칸과 같은 내용이라 숨김. 실적 · CP 승인액은 남김
    '#s-budget .agent-ga .agga-col.detail .agga-col-head .agga-dnum, #s-budget .agent-ga .agga-col.detail .agga-col-head .agga-dafter{display:none !important}',  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();

// ⑬-2 표 글자 칸의 낱말을 nowrap 덩어리로 감싼다 — 줄은 띄어쓰기에서만 바뀌게(예: "2026-06-01 ~ 2026-06-30" 은 "~" 앞뒤에서만).
//   원가조정 상세 표(.agga-col.detail table.aglb)의 글자만 있는 칸(또는 <b> 하나)만 다룸. 금액(.num) · 버튼 칸은 손대지 않음.
(function bflWrapTokens() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  var esc = function (t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var wrapEl = function (el) {
    var txt = el.textContent;
    if (!/\s/.test(txt.trim())) { el.classList.add("bfl-tok"); return; }
    el.innerHTML = txt.trim().split(/\s+/).map(function (w) { return "<span class=\"bfl-tok\">" + esc(w) + "</span>"; }).join(" ");
  };
  var run = function () {
    var tds = document.querySelectorAll("#s-budget .agent-ga .agga-col.detail table.aglb td:not(.num):not(.aglb-act):not([data-bfl-tok])");
    for (var i = 0; i < tds.length; i++) {
      var td = tds[i]; td.setAttribute("data-bfl-tok", "1");
      var kids = td.children;
      if (kids.length === 0 && td.textContent.trim()) wrapEl(td);
      else if (kids.length === 1 && kids[0].tagName === "B" && td.textContent.trim() === kids[0].textContent.trim()) wrapEl(kids[0]);
    }
    //   외주비 업체 설명 줄(.aglb-sub)도 같은 방식 — 「2026-01-」처럼 날짜 중간에서 끊기지 않게
    var subs = document.querySelectorAll("#s-budget .agent-ga .agga-col.detail table.aglb .aglb-sub:not([data-bfl-tok])");
    for (var j = 0; j < subs.length; j++) {
      subs[j].setAttribute("data-bfl-tok", "1");
      if (subs[j].children.length === 0 && subs[j].textContent.trim()) wrapEl(subs[j]);
    }  };
  var queued = false;
  var mo = new MutationObserver(function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; run(); }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); run(); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
