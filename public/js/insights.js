// ============================================================
//  Insights — 프로젝트 중심 분석 (실행예산과 동일 디자인 톤)
//  종합 현황 진입 → 프로젝트 선택 → 해당 프로젝트 분석
//  탭: 종합 현황 / 계획 vs 실적 / 원가
// ============================================================

let insTab = 'overview';
let insProject = 0;
let insSort = { key: 'forecast', dir: 'desc' };
let insCols = { plan: true, actual: true, forecast: true, share: true };
let insCurTrend = null;

const INS_CUR = 8; // 현재 월(8월)
const MW = [0.062, 0.07, 0.075, 0.08, 0.085, 0.088, 0.092, 0.094, 0.086, 0.08, 0.075, 0.068];
const COST_CATS = [
  { key:'인건비', c:'#2f6bed' }, { key:'외주비', c:'#ea002c' }, { key:'구매', c:'#f5a623' },
  { key:'경비', c:'#22b07d' }, { key:'기타', c:'#9aa2b5' },
];

// base=원가(계약 시 수립 기준) · budget=계획(실행예산) · actual=실적 · forecast=예상원가
const INS_PROJECTS = [
  { name:'SKON 통합관제', pm:'김OO', contract:32.0, base:26.5, budget:27.2, actual:18.4, forecast:28.1, rate:87.8, diff:+3.2, status:'관리필요',
    cost:{ 인건비:11.2, 외주비:9.5, 구매:4.1, 경비:2.3, 기타:1.0 }, cause:'개발 외주 인력 3명 투입기간 연장' },
  { name:'차세대 물류', pm:'이OO', contract:21.5, base:17.5, budget:17.8, actual:10.2, forecast:16.9, rate:78.6, diff:-1.1, status:'정상',
    cost:{ 인건비:7.0, 외주비:5.2, 구매:2.6, 경비:1.5, 기타:0.6 }, cause:'계획 범위 내 정상 집행' },
  { name:'Data Migration', pm:'박OO', contract:14.2, base:11.2, budget:11.6, actual:8.1, forecast:12.4, rate:87.3, diff:+4.7, status:'관리필요',
    cost:{ 인건비:5.1, 외주비:4.0, 구매:1.9, 경비:1.0, 기타:0.4 }, cause:'데이터 정합성 검증 외주 확대' },
  { name:'AI Platform', pm:'최OO', contract:18.7, base:14.5, budget:14.3, actual:9.8, forecast:13.9, rate:74.3, diff:-0.8, status:'정상',
    cost:{ 인건비:6.6, 외주비:3.5, 구매:2.3, 경비:1.1, 기타:0.4 }, cause:'GPU 구매 지연으로 원가 하향' },
  { name:'ERP Renewal', pm:'정OO', contract:9.8, base:7.8, budget:7.9, actual:5.1, forecast:7.2, rate:73.5, diff:-0.4, status:'정상',
    cost:{ 인건비:3.4, 외주비:1.8, 구매:1.3, 경비:0.5, 기타:0.2 }, cause:'표준화 모듈 재사용으로 절감' },
];

// ── 파생 데이터 ──
function projAccounts(p) {
  const fcSum = Object.values(p.cost).reduce((a, b) => a + b, 0);
  return COST_CATS.map(c => {
    const fc = p.cost[c.key] || 0; const sh = fc / fcSum;
    const base = +(p.base * sh).toFixed(1);
    const plan = +(p.budget * sh).toFixed(1);
    const actual = +(p.actual * sh).toFixed(1);
    return { name: c.key, color: c.c, base, plan, actual, forecast: fc, share: Math.round(sh * 100), delta: +(fc - plan).toFixed(1), deltaBase: +(fc - base).toFixed(1) };
  });
}
function projTrend(p) {
  const sum = MW.reduce((a, b) => a + b, 0);
  const w = MW.map(x => x / sum);
  const plan = w.map(x => +(p.budget * x).toFixed(2));
  const r = p.forecast / p.budget;
  const actual = plan.map((v, i) => i < INS_CUR ? +(v * (1 + (r - 1) * 1.15)).toFixed(2) : null);
  const forecast = plan.map((v, i) => i >= INS_CUR - 1 ? +(v * r).toFixed(2) : null);
  return { plan, actual, forecast };
}
function projKpis(p) {
  const profit = +(p.contract - p.forecast).toFixed(1);
  const prog = Math.round(p.actual / p.forecast * 100);
  const overCost = +(p.forecast - p.budget).toFixed(1);
  return [
    { label:'계약금액', val:p.contract.toFixed(1) + '억', chg:'기준', dir:'flat', base:'수주 계약' },
    { label:'실행예산', val:p.budget.toFixed(1) + '억', chg:'승인', dir:'flat', base:'승인 실행예산' },
    { label:'실적', val:p.actual.toFixed(1) + '억', chg:'진행 ' + prog + '%', dir:'flat', base:'누적 집행' },
    { label:'예상원가', val:p.forecast.toFixed(1) + '억', chg:(overCost >= 0 ? '▲ ' : '▼ ') + Math.abs(overCost).toFixed(1) + '억', dir:(overCost >= 0 ? 'bad' : 'good'), base:'vs 실행예산' },
    { label:'예상 원가율', val:p.rate.toFixed(1) + '%', chg:(p.diff >= 0 ? '▲ ' : '▼ ') + Math.abs(p.diff).toFixed(1) + '%p', dir:(p.diff >= 0 ? 'bad' : 'good'), base:'vs 계획' },
  ];
}
function projAI(p) {
  const arr = [];
  if (p.diff >= 0) arr.push({ sev:'danger', title:'예상원가 초과', body:`예상 원가율이 계획 대비 <b class="up">+${p.diff.toFixed(1)}%p</b> 상승했습니다. 주요 원인: ${p.cause}.`, q:`${p.name} 원가 왜 올랐어?`, act:'왜 올랐나요?' });
  else arr.push({ sev:'info', title:'원가 절감', body:`예상 원가율이 계획 대비 <b class="down">${p.diff.toFixed(1)}%p</b> 개선됐습니다. ${p.cause}.`, q:`${p.name} 원가 절감 요인 알려줘`, act:'요인 확인' });
  arr.push({ sev:'warning', title:'외주비 비중 주의', body:`외주비가 예상원가의 <b>${Math.round(p.cost.외주비 / p.forecast * 100)}%</b>를 차지합니다.`, q:`${p.name} 외주비 상세 알려줘`, act:'외주비 분석' });
  return arr;
}

// ── 진입 ──
function showInsights(tab) {
  insTab = (tab === 'overview' || tab === 'planactual' || tab === 'cost') ? tab : 'overview';
  setScreen('s-insights');
  setNav('ngbtn-sub-insight');
  renderInsights();
}
function selectInsProject(i) { insProject = i; renderInsights(); }
function scrollInsProj(dir) {
  const t = document.getElementById('ins-proj-track');
  if (!t) return;
  const max = t.scrollWidth - t.clientWidth;
  t.scrollLeft = Math.max(0, Math.min(max, t.scrollLeft + dir * 240));
}
function renderInsights() {
  const el = document.getElementById('s-insights');
  if (el) el.innerHTML = insightsHtml();
}

// ── 렌더 ──
function insightsHtml() {
  const TABS = [['overview', '종합 현황'], ['planactual', '계획 vs 실적'], ['cost', 'Cost 분석']];
  const p = INS_PROJECTS[insProject];
  return `
    <div class="ins-wrap">
      <div class="ins-topbar">
        <span class="ins-live"><i></i>AI 판독 · 08:50 갱신</span>
        <div class="ins-topbtns">
          <button class="ins-act ghost" onclick="showToast('데이터 내보내기 (준비)')">데이터 내보내기</button>
          <button class="ins-act pri" onclick="insGenerateReport()">AI 보고서 생성</button>
        </div>
      </div>
      <div class="ins-head">
        <div>
          <h1 class="ins-title">Insights</h1>
          <p class="ins-sub">프로젝트와 조직의 손익·원가·실적을 AI가 해석하고, 원인과 다음 행동까지 제안합니다.</p>
        </div>
      </div>

      <div class="hm-ptabs-carousel ins-proj-carousel">
        <button class="hm-ptabs-arrow" onclick="scrollInsProj(-1)" aria-label="이전 프로젝트">‹</button>
        <div class="hm-ptabs-track" id="ins-proj-track">
          ${INS_PROJECTS.map((pp, i) => `<button class="hm-ptab ${i === insProject ? 'active' : ''}" onclick="selectInsProject(${i})"><span class="hm-ptab-name">${pp.name}</span></button>`).join('')}
        </div>
        <button class="hm-ptabs-arrow" onclick="scrollInsProj(1)" aria-label="다음 프로젝트">›</button>
      </div>

      <div class="ins-tabs">
        ${TABS.map(([k, v]) => `<button class="ins-tab ${insTab === k ? 'on' : ''}" onclick="showInsights('${k}')">${v}</button>`).join('')}
      </div>

      ${insTab === 'overview' ? insOverviewHtml(p) : insTab === 'planactual' ? insPlanActualHtml(p) : insCostHtml(p)}
    </div>
    ${insBuilderHtml()}
    ${insReportHtml()}`;
}

// ── 보고서 생성 (3초 로딩 → 레포트 팝업) ──
function insGenerateReport() {
  const ov = document.getElementById('ins-report');
  const load = document.getElementById('ins-report-loading');
  const page = document.getElementById('ins-report-page');
  if (!ov) return;
  ov.classList.add('open');
  load.removeAttribute('hidden');
  page.setAttribute('hidden', '');
  page.innerHTML = '';
  setTimeout(() => {
    page.innerHTML = insReportPageHtml(INS_PROJECTS[insProject]);
    load.setAttribute('hidden', '');
    page.removeAttribute('hidden');
  }, 2000);
}
function insCloseReport() { const ov = document.getElementById('ins-report'); if (ov) ov.classList.remove('open'); }
function insReportHtml() {
  return `
    <div class="ins-report-overlay" id="ins-report" onclick="if(event.target===this)insCloseReport()">
      <div class="ins-report-loading" id="ins-report-loading" hidden>
        <div class="ins-spin"></div>
        <p>보고서를 생성하고 있어요…</p>
        <span>실적·원가 데이터를 취합하는 중입니다</span>
      </div>
      <div class="ins-report-page" id="ins-report-page" hidden></div>
    </div>`;
}
function insReportPageHtml(p) {
  const prog = Math.round(p.actual / p.forecast * 100);
  const profit = +(p.contract - p.forecast).toFixed(1);
  const marginRate = +(profit / p.contract * 100).toFixed(1);
  const planVsBase = +(p.budget - p.base).toFixed(1);
  const fcVsPlan = +(p.forecast - p.budget).toFixed(1);
  const osPct = Math.round(p.cost.외주비 / p.forecast * 100);
  const m = [
    ['계약금액', p.contract.toFixed(1) + '억', '', ''],
    ['원가(계약)', p.base.toFixed(1) + '억', '', ''],
    ['실행예산(계획)', p.budget.toFixed(1) + '억', (planVsBase >= 0 ? '+' : '') + planVsBase.toFixed(1), planVsBase >= 0 ? 'up' : 'down'],
    ['실적', p.actual.toFixed(1) + '억', '진행 ' + prog + '%', 'flat'],
    ['예상원가', p.forecast.toFixed(1) + '억', (fcVsPlan >= 0 ? '▲' : '▼') + Math.abs(fcVsPlan).toFixed(1), fcVsPlan >= 0 ? 'up' : 'down'],
    ['예상 원가율', p.rate.toFixed(1) + '%', (p.diff >= 0 ? '▲' : '▼') + Math.abs(p.diff).toFixed(1) + '%p', p.diff >= 0 ? 'up' : 'down'],
    ['예상이익', profit.toFixed(1) + '억', marginRate.toFixed(1) + '%', 'flat'],
  ];
  const rows = m.map(r => `<tr><td class="rp-m-l">${r[0]}</td><td class="rp-m-v">${r[1]}</td><td class="rp-m-c ${r[3]}">${r[2]}</td></tr>`).join('');
  const p1 = `${p.name}은 계약금액 <b>${p.contract.toFixed(1)}억</b> 규모의 프로젝트로, 계약 시 수립한 원가 기준은 <b>${p.base.toFixed(1)}억</b>입니다. 현재까지 실적은 <b>${p.actual.toFixed(1)}억</b>(진행률 ${prog}%)이며, 실행예산(계획)은 <b>${p.budget.toFixed(1)}억</b>, 현재 예상원가는 <b>${p.forecast.toFixed(1)}억</b>으로 예상 원가율은 <b>${p.rate.toFixed(1)}%</b>입니다.`;
  const p2 = p.diff >= 0
    ? `예상 원가율이 계획 대비 <b class="rp-red">+${p.diff.toFixed(1)}%p</b> 상승하여 수익성 저하가 우려됩니다. 주요 원인은 ${p.cause}이며, 현재 추세가 유지될 경우 <b>실행예산 변경 검토</b>가 필요합니다. 외주비 비중이 <b>${osPct}%</b>로 가장 유의해야 할 항목이며, 예상이익은 <b>${profit.toFixed(1)}억</b>(마진율 ${marginRate.toFixed(1)}%)으로 예상됩니다.`
    : `예상 원가율이 계획 대비 <b class="rp-blue">${p.diff.toFixed(1)}%p</b> 개선되어 계획 범위 내에서 안정적으로 관리되고 있습니다. 주요 요인은 ${p.cause}이며, 예상이익은 <b>${profit.toFixed(1)}억</b>(마진율 ${marginRate.toFixed(1)}%)으로 예상됩니다.`;
  const tr = projTrend(p);
  const accts = projAccounts(p);
  const acctRows = accts.map(a => `<tr><td class="nm"><span class="rp-dot" style="background:${a.color}"></span>${a.name}</td><td>${a.plan.toFixed(1)}억</td><td>${a.actual.toFixed(1)}억</td><td>${a.forecast.toFixed(1)}억</td><td class="${a.delta >= 0 ? 'up' : 'down'}">${a.delta >= 0 ? '+' : ''}${a.delta.toFixed(1)}억</td><td>${a.share}%</td></tr>`).join('');
  const varRows = accts.map(a => { const w = Math.min(100, Math.abs(a.delta) / p.budget * 260); return `<div class="ins-var-row"><span class="ins-var-n">${a.name}</span><div class="ins-var-bar"><em class="${a.delta >= 0 ? 'up' : 'down'}" style="width:${w}%"></em></div><b class="${a.delta >= 0 ? 'up' : 'down'}">${a.delta >= 0 ? '+' : ''}${a.delta.toFixed(1)}억</b></div>`; }).join('');
  const cost3 = `
    <div class="rp-c3"><span class="rp-c3-t"><i class="base"></i>원가(계약)</span><b>${p.base.toFixed(1)}억</b></div>
    <div class="rp-c3"><span class="rp-c3-t"><i class="plan"></i>계획(실행)</span><b>${p.budget.toFixed(1)}억</b><em class="${planVsBase >= 0 ? 'up' : 'down'}">${planVsBase >= 0 ? '+' : ''}${planVsBase.toFixed(1)}억</em></div>
    <div class="rp-c3"><span class="rp-c3-t"><i class="act"></i>실적</span><b>${p.actual.toFixed(1)}억</b><em class="flat">진행 ${prog}%</em></div>`;
  return `
    <div class="rp-page rp-v2">
      <div class="rp-header">
        <div class="rp-logo"><span class="rp-mark">SK</span><span class="rp-corp">주식회사<br>AX</span></div>
        <div class="rp-hd-r"><div class="rp-report">Report</div><div class="rp-hd-date">2026.08.01</div></div>
        <button class="rp-close" onclick="insCloseReport()" aria-label="닫기">✕</button>
      </div>
      <div class="rp-body">
        <div class="rp-titlerow">
          <h1 class="rp-title">${p.name}</h1>
          <span class="rp-badge ${p.status === '관리필요' ? 'warn' : 'ok'}">${p.status}</span>
        </div>

        <h2 class="rp-h2">요약</h2>
        <p class="rp-p">${p1}</p>
        <p class="rp-p">${p2}</p>

        <h2 class="rp-h2">당월 누계 실적</h2>
        <table class="rp-metrics">
          <tr class="rp-mhead"><td>구분</td><td>값</td><td>계획대비</td></tr>
          ${rows}
        </table>

        <h2 class="rp-h2">월별 원가 Trend</h2>
        <div class="rp-legend"><span><i class="lg plan"></i>Plan</span><span><i class="lg act"></i>Actual</span><span><i class="lg fc"></i>Forecast</span></div>
        <div class="rp-chart">${insTrendSvg(tr, true)}</div>

        <h2 class="rp-h2">계획 vs 실적</h2>
        <div class="rp-chart">${insPlanActualSvg(tr)}</div>
        <div class="ins-var-list rp-var">${varRows}</div>

        <h2 class="rp-h2">Cost 분석 · 원가 vs 계획 vs 실적</h2>
        <div class="rp-cost3">${cost3}</div>
        <div class="rp-two">
          <div class="rp-card"><div class="rp-sub">계정별 비교</div><div class="ins-grp-legend"><span><i class="base"></i>원가</span><span><i class="plan"></i>계획</span><span><i class="act"></i>실적</span></div>${insGroupedBarSvg(p)}</div>
          <div class="rp-card"><div class="rp-sub">Cost Variance</div>${insWaterfallSvg(p)}</div>
        </div>

        <h2 class="rp-h2">계정별 원가</h2>
        <table class="rp-acct">
          <tr><th>계정</th><th>계획</th><th>실적</th><th>예상원가</th><th>계획대비</th><th>비중</th></tr>
          ${acctRows}
        </table>

        <div class="rp-foot">
          <button class="ins-act" onclick="showToast('PDF 저장 (준비)')">PDF 저장</button>
          <button class="ins-act pri" onclick="insCloseReport()">닫기</button>
        </div>
      </div>
    </div>`;
}

function insOverviewHtml(p) {
  const kpis = projKpis(p);
  const ai = projAI(p);
  insCurTrend = projTrend(p);
  return `
    <div class="ins-kpi-panel">
      ${kpis.map(k => `
        <div class="ins-kpi2">
          <div class="ins-kpi-l">${k.label}</div>
          <div class="ins-kpi-v">${k.val}</div>
          <div class="ins-kpi-c"><span class="chg ${k.dir}">${k.chg}</span> <span class="base">${k.base}</span></div>
        </div>`).join('')}
    </div>

    <div class="ins-main-grid">
      <section class="ins-panel ins-trend">
        <div class="ins-panel-head">
          <h2>월별 원가 Trend</h2>
          <div class="ins-legend"><span><i class="lg plan"></i>Plan</span><span><i class="lg act"></i>Actual</span><span><i class="lg fc"></i>Forecast</span></div>
        </div>
        <div class="ins-trend-foot" style="margin:0 0 8px">8월 이전은 실적, 이후는 AI 예측입니다. 월에 마우스를 올리면 상세가 표시됩니다.</div>
        <div class="ins-trend-wrap">${insTrendSvg(insCurTrend)}<div class="ins-trend-tip" id="ins-trend-tip" hidden></div></div>
      </section>
      <aside class="ins-ai">
        <div class="ins-ai-head"><span class="ins-ai-badge">AI</span>AI Insight<span class="ins-ai-conf">신뢰도 92%</span></div>
        ${ai.map(a => `
          <div class="ins-ai-item">
            <div class="ins-ai-t"><span class="ins-ai-sev ${a.sev}"></span>${a.title}</div>
            <div class="ins-ai-b">${a.body}</div>
            <button class="ins-ai-act" onclick="openAiChat('main','${a.q}')">${a.act} →</button>
          </div>`).join('')}
        <div class="ins-ask">
          <div class="ins-ask-t">ASK AI</div>
          <p class="ins-ask-d">이 화면의 데이터를 근거로 질문하면 원인 분석과 시나리오를 계산해 드립니다.</p>
          <button class="ins-ask-btn" onclick="insAskBudgetQ()">이 화면에 대해 질문하기 →</button>
        </div>
      </aside>
    </div>

    <section class="ins-panel">
      <div class="ins-table-head">
        <h2>계정별 원가</h2>
        <div class="ins-table-tools">
          <button class="ins-tbtn" onclick="showToast('Excel 다운로드 (준비)')">Excel</button>
        </div>
      </div>
      ${insAccountTableHtml(p)}
    </section>`;
}

function insPlanActualHtml(p) {
  const tr = projTrend(p);
  const accts = projAccounts(p);
  return `
    ${insTabIntro('계획 vs 실적', p.name + ' · 월별 계획 대비 실적/예상을 비교합니다.')}
    <section class="ins-panel">
      <div class="ins-panel-head"><h3>월별 계획 vs 실적</h3><span class="ins-panel-sub">막대=계획 · 선=실적/예상</span></div>
      ${insPlanActualSvg(tr)}
    </section>
    <section class="ins-panel">
      <div class="ins-panel-head"><h3>계정별 계획 대비 차이</h3><span class="ins-panel-sub">예상원가 − 계획</span></div>
      <div class="ins-var-list">
        ${accts.map(a => {
          const w = Math.min(100, Math.abs(a.delta) / p.budget * 260);
          return `<div class="ins-var-row"><span class="ins-var-n">${a.name}</span><div class="ins-var-bar"><em class="${a.delta >= 0 ? 'up' : 'down'}" style="width:${w}%"></em></div><b class="${a.delta >= 0 ? 'up' : 'down'}">${a.delta >= 0 ? '+' : ''}${a.delta.toFixed(1)}억</b></div>`;
        }).join('')}
      </div>
    </section>`;
}

function insCostHtml(p) {
  const prog = Math.round(p.actual / p.forecast * 100);
  const planVsBase = +(p.budget - p.base).toFixed(1);
  const fcVsBase = +(p.forecast - p.base).toFixed(1);
  return `
    ${insTabIntro('원가 분석', '계약 시 수립한 원가 기준 · 수행 중 세운 계획 · 실제 실적을 비교합니다.')}
    <div class="ins-cost3">
      <div class="ins-c3">
        <div class="ins-c3-t"><span class="ins-c3-dot base"></span>원가 <em>계약 기준</em></div>
        <b>${p.base.toFixed(1)}억</b>
        <div class="ins-c3-s">수주 계약 시 수립한 원가</div>
      </div>
      <div class="ins-c3">
        <div class="ins-c3-t"><span class="ins-c3-dot plan"></span>계획 <em>실행예산</em></div>
        <b>${p.budget.toFixed(1)}억</b>
        <div class="ins-c3-s">원가 대비 <b class="${planVsBase >= 0 ? 'up' : 'down'}">${planVsBase >= 0 ? '+' : ''}${planVsBase.toFixed(1)}억</b></div>
      </div>
      <div class="ins-c3">
        <div class="ins-c3-t"><span class="ins-c3-dot act"></span>실적 <em>진행 ${prog}%</em></div>
        <b>${p.actual.toFixed(1)}억</b>
        <div class="ins-c3-s">예상원가 ${p.forecast.toFixed(1)}억 · 원가 대비 <b class="${fcVsBase >= 0 ? 'up' : 'down'}">${fcVsBase >= 0 ? '+' : ''}${fcVsBase.toFixed(1)}억</b></div>
      </div>
    </div>
    <div class="ins-two">
      <section class="ins-panel">
        <div class="ins-panel-head"><h3>계정별 원가 vs 계획 vs 실적</h3><span class="ins-panel-sub">계약 원가 · 실행 계획 · 실제 실적</span></div>
        <div class="ins-grp-legend"><span><i class="base"></i>원가(계약)</span><span><i class="plan"></i>계획(실행)</span><span><i class="act"></i>실적</span></div>
        ${insGroupedBarSvg(p)}
      </section>
      <section class="ins-panel">
        <div class="ins-panel-head"><h3>Cost Variance</h3><span class="ins-panel-sub">계약 원가 → 예상원가</span></div>
        ${insWaterfallSvg(p)}
        <div class="ins-trend-foot">주요 원인 · ${p.cause}</div>
      </section>
    </div>`;
}

// 계정별 원가/계획/실적 grouped bar
function insGroupedBarSvg(p) {
  const accts = projAccounts(p);
  const W = 420, H = 250, L = 28, R = 14, T = 14, B = 42;
  const yMax = Math.max(...accts.map(a => Math.max(a.base, a.plan, a.actual))) * 1.25 || 1;
  const y = v => (H - B) - v / yMax * (H - B - T);
  const gap = (W - L - R) / accts.length; const bw = gap * 0.18; const ig = 3;
  const cluster = 3 * bw + 2 * ig;
  let out = '';
  accts.forEach((a, i) => {
    const cx = L + gap * i + gap / 2;
    [['#b7c0cc', a.base, '원가'], ['#2f6bed', a.plan, '계획'], ['#17161f', a.actual, '실적']].forEach((t, j) => {
      const bx = cx - cluster / 2 + j * (bw + ig);
      out += `<rect x="${bx.toFixed(1)}" y="${y(t[1]).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - B - y(t[1])).toFixed(1)}" fill="${t[0]}" rx="1.5"><title>${a.name} ${t[2]} ${t[1]}억</title></rect>`;
    });
    out += `<text x="${cx}" y="${H - 22}" class="ins-ax" text-anchor="middle">${a.name}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="ins-svg">${out}</svg>`;
}

function insTabIntro(title, desc) {
  return `<div class="ins-tab-intro"><strong>${title}</strong><span>${desc}</span></div>`;
}

// ── 월별 Trend (line) ──
function insTrendSvg(tr, noHover) {
  const W = 660, H = 250, L = 40, R = 16, T = 16, B = 34;
  const yMax = Math.ceil(Math.max(...tr.plan, ...tr.forecast.filter(v => v != null), ...tr.actual.filter(v => v != null)) * 1.2);
  const x = m => L + (m - 1) / 11 * (W - L - R);
  const y = v => (H - B) - (v / yMax) * (H - B - T);
  const line = (arr, from, to) => arr.map((v, i) => (v == null || i + 1 < from || i + 1 > to) ? null : `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(' ');
  const yt = [0, yMax / 2, yMax];
  const grid = yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eef0f3"/><text x="${L - 6}" y="${y(v) + 3}" class="ins-ax" text-anchor="end">${v.toFixed(0)}</text>`).join('');
  const xlab = tr.plan.map((_, i) => `<text x="${x(i + 1)}" y="${H - 12}" class="ins-ax" text-anchor="middle">${i + 1}</text>`).join('');
  const dots = tr.plan.map((_, i) => {
    const m = i + 1; let d = '';
    if (tr.actual[i] != null) d += `<circle cx="${x(m)}" cy="${y(tr.actual[i])}" r="3" fill="#17161f"/>`;
    else if (tr.forecast[i] != null) d += `<circle cx="${x(m)}" cy="${y(tr.forecast[i])}" r="3" fill="#22b07d"/>`;
    return d;
  }).join('');
  const areaPts = tr.plan.map((_, i) => { const v = (i + 1 <= INS_CUR) ? tr.actual[i] : tr.forecast[i]; return v == null ? null : `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`; }).filter(Boolean);
  const area = areaPts.length ? `<polygon points="${x(1).toFixed(1)},${(H - B).toFixed(1)} ${areaPts.join(' ')} ${x(12).toFixed(1)},${(H - B).toFixed(1)}" fill="#22b07d" fill-opacity="0.08"/>` : '';
  const hovers = tr.plan.map((_, i) => {
    const m = i + 1; const cx = x(m);
    return `<rect x="${cx - (W - L - R) / 24}" y="${T}" width="${(W - L - R) / 12}" height="${H - B - T}" fill="transparent" style="cursor:pointer" onmouseenter="insTrendShow(${m}, this)" onmouseleave="insTrendHide()" onclick="insTrendClick(${m})"></rect>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ins-svg ins-trend-svg" preserveAspectRatio="none">
    ${grid}
    ${area}
    <line x1="${x(INS_CUR)}" x2="${x(INS_CUR)}" y1="${T}" y2="${H - B}" stroke="#d3d9e2" stroke-dasharray="3 3"/>
    <text x="${x(INS_CUR)}" y="${T + 2}" class="ins-ax cur" text-anchor="middle">현재</text>
    <polyline points="${line(tr.plan, 1, 12)}" fill="none" stroke="#9ab4e8" stroke-width="1.6" stroke-dasharray="4 3"/>
    <polyline points="${line(tr.actual, 1, INS_CUR)}" fill="none" stroke="#17161f" stroke-width="2.4"/>
    <polyline points="${line(tr.forecast, INS_CUR, 12)}" fill="none" stroke="#22b07d" stroke-width="2.2" stroke-dasharray="5 3"/>
    ${dots}${xlab}${noHover ? '' : hovers}
  </svg>`;
}
function insTrendShow(m, el) {
  const tip = document.getElementById('ins-trend-tip'); if (!tip || !insCurTrend) return;
  const plan = insCurTrend.plan[m - 1];
  const act = insCurTrend.actual[m - 1] != null ? insCurTrend.actual[m - 1] : insCurTrend.forecast[m - 1];
  const isFc = insCurTrend.actual[m - 1] == null;
  const diff = act != null ? (act - plan) : 0;
  const pct = plan ? (diff / plan * 100) : 0;
  tip.innerHTML = `<div class="tt-h">${m}월 ${isFc ? '<span class="tt-fc">예상</span>' : ''}</div>
    <div class="tt-r"><span>계획</span><b>${plan.toFixed(2)}억</b></div>
    <div class="tt-r"><span>${isFc ? '예상' : '실적'}</span><b>${act != null ? act.toFixed(2) + '억' : '-'}</b></div>
    <div class="tt-r"><span>차이</span><b class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}억 (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)</b></div>
    <button class="tt-btn" onmousedown="insTrendClick(${m})">원인 분석 →</button>`;
  const wrap = el.closest('.ins-trend-wrap'); const rect = el.getBoundingClientRect(); const wr = wrap.getBoundingClientRect();
  tip.style.left = Math.min(wr.width - 190, Math.max(0, rect.left - wr.left + rect.width / 2 - 90)) + 'px';
  tip.removeAttribute('hidden');
}
function insTrendHide() { const tip = document.getElementById('ins-trend-tip'); if (tip) tip.setAttribute('hidden', ''); }
function insTrendClick(m) { openAiChat('main', INS_PROJECTS[insProject].name + ' ' + m + '월 외주비 왜 늘었어?'); }

// ── 계획 vs 실적 (bar + line) ──
function insPlanActualSvg(tr) {
  const W = 660, H = 240, L = 40, R = 16, T = 16, B = 34;
  const yMax = Math.ceil(Math.max(...tr.plan, ...tr.forecast.filter(v => v != null), ...tr.actual.filter(v => v != null)) * 1.2);
  const x = m => L + (m - 0.5) / 12 * (W - L - R);
  const y = v => (H - B) - (v / yMax) * (H - B - T);
  const bw = (W - L - R) / 12 * 0.5;
  const bars = tr.plan.map((v, i) => `<rect x="${(x(i + 1) - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - B - y(v)).toFixed(1)}" fill="#dbe6fb" rx="2"/>`).join('');
  const actLine = tr.plan.map((_, i) => { const v = tr.actual[i] != null ? tr.actual[i] : tr.forecast[i]; return v == null ? null : `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`; }).filter(Boolean).join(' ');
  const xlab = tr.plan.map((_, i) => `<text x="${x(i + 1)}" y="${H - 12}" class="ins-ax" text-anchor="middle">${i + 1}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ins-svg" preserveAspectRatio="none">
    <line x1="${x(INS_CUR) - bw}" x2="${x(INS_CUR) - bw}" y1="${T}" y2="${H - B}" stroke="#e7eaef" stroke-dasharray="3 3"/>
    ${bars}
    <polyline points="${actLine}" fill="none" stroke="#17161f" stroke-width="2.2"/>
    ${xlab}
  </svg>`;
}

// ── Cost Variance Waterfall ──
function insWaterfallSvg(p) {
  const accts = projAccounts(p);
  const steps = [{ label:'원가(계약)', v:p.base, type:'base' }]
    .concat(accts.filter(a => Math.abs(a.deltaBase) >= 0.05).map(a => ({ label:a.name, v:a.deltaBase, type:a.deltaBase >= 0 ? 'up' : 'down' })))
    .concat([{ label:'예상원가', v:p.forecast, type:'total' }]);
  const W = 420, H = 250, L = 30, R = 14, T = 22, B = 42;
  const lo = Math.min(p.base, p.forecast) * 0.985, hi = Math.max(p.base, p.forecast) * 1.015;
  const y = v => (H - B) - (v - lo) / (hi - lo) * (H - B - T);
  const gap = (W - L - R) / steps.length; const bw = gap * 0.5;
  let run = 0; let out = '';
  steps.forEach((s, i) => {
    const cx = L + gap * i + gap / 2; let y0, y1, col, label;
    if (s.type === 'base' || s.type === 'total') { y0 = y(lo); y1 = y(s.v); col = '#17161f'; run = s.v; label = s.v.toFixed(1); }
    else { const st = run, en = run + s.v; y0 = y(Math.max(st, en)); y1 = y(Math.min(st, en)); col = s.type === 'up' ? '#ea002c' : '#22b07d'; run = en; label = (s.v >= 0 ? '+' : '') + s.v.toFixed(1); }
    out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, y1 - y0).toFixed(1)}" fill="${col}" rx="2"/>
      <text x="${cx}" y="${(y0 - 5).toFixed(1)}" class="ins-ax wf" text-anchor="middle">${label}</text>
      <text x="${cx}" y="${H - 22}" class="ins-ax" text-anchor="middle">${s.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="ins-svg">${out}</svg>`;
}

// ── 비용 구성 Donut ──
function insDonutSvg(p) {
  const accts = projAccounts(p);
  const total = accts.reduce((a, b) => a + b.forecast, 0);
  const cx = 110, cy = 120, r = 74, sw = 26;
  let a0 = -90; let arcs = '';
  accts.forEach(a => {
    const ang = a.forecast / total * 360; const a1 = a0 + ang;
    const rad = d => (d * Math.PI) / 180;
    const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    const large = ang > 180 ? 1 : 0;
    arcs += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${a.color}" stroke-width="${sw}"/>`;
    a0 = a1;
  });
  const legend = accts.map(a => `<div class="ins-donut-lg"><i style="background:${a.color}"></i><span>${a.name}</span><b>${a.share}%</b></div>`).join('');
  return `<div class="ins-donut-wrap">
    <svg viewBox="0 0 220 240" class="ins-donut">${arcs}<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="ins-donut-c">${p.forecast.toFixed(1)}억</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="ins-donut-s">예상원가</text></svg>
    <div class="ins-donut-legend">${legend}</div>
  </div>`;
}

// ── 계정별 원가 테이블 ──
function insAccountTableHtml(p) {
  let rows = projAccounts(p).map((a, i) => ({ ...a, _i: i }));
  rows.sort((a, b) => { const d = a[insSort.key] < b[insSort.key] ? -1 : a[insSort.key] > b[insSort.key] ? 1 : 0; return insSort.dir === 'asc' ? d : -d; });
  const th = (k, label) => `<th class="num ${insSort.key === k ? 'sorted' : ''}" onclick="insSortBy('${k}')">${label}${insSort.key === k ? (insSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`;
  const head = `<tr><th onclick="insSortBy('name')">계정</th>
    ${insCols.plan ? th('plan', '계획') : ''}${insCols.actual ? th('actual', '실적') : ''}${insCols.forecast ? th('forecast', '예상원가') : ''}
    <th class="num">계획 대비</th>${insCols.share ? `<th class="num">비중</th>` : ''}</tr>`;
  const body = rows.map(a => `<tr class="ins-row">
    <td class="nm"><span class="ins-dot" style="background:${a.color}"></span>${a.name}</td>
    ${insCols.plan ? `<td class="num">${a.plan.toFixed(1)}억</td>` : ''}
    ${insCols.actual ? `<td class="num">${a.actual.toFixed(1)}억</td>` : ''}
    ${insCols.forecast ? `<td class="num">${a.forecast.toFixed(1)}억</td>` : ''}
    <td class="num ${a.delta >= 0 ? 'up' : 'down'}">${a.delta >= 0 ? '+' : ''}${a.delta.toFixed(1)}억</td>
    ${insCols.share ? `<td class="num">${a.share}%</td>` : ''}
  </tr>`).join('');
  return `<div class="ins-table-scroll"><table class="ins-table">${head}${body}</table></div>`;
}
function insSortBy(k) { if (insSort.key === k) insSort.dir = insSort.dir === 'asc' ? 'desc' : 'asc'; else { insSort.key = k; insSort.dir = 'desc'; } renderInsights(); }
function insToggleCol(k) { insCols[k] = !insCols[k]; const tbl = document.querySelector('#s-insights .ins-table-scroll'); if (tbl) tbl.outerHTML = insAccountTableHtml(INS_PROJECTS[insProject]); }
function insToggleColMenu(e) { e.stopPropagation(); const m = document.getElementById('ins-col-menu'); if (m) m.toggleAttribute('hidden'); }
document.addEventListener('click', function (e) { const m = document.getElementById('ins-col-menu'); if (m && !m.hasAttribute('hidden') && !e.target.closest('.ins-colset')) m.setAttribute('hidden', ''); });

// ── Budget Q 연계 ──
function insAskBudgetQ() {
  const p = INS_PROJECTS[insProject];
  openAiChat('q');
  setTimeout(() => { if (typeof aiAgentMsg === 'function') aiAgentMsg('q', `지금 보고 계신 <b>${p.name}</b> 분석 데이터를 기준으로 답변할게요.` + (typeof examplesHtml === 'function' ? examplesHtml([`${p.name} 원가 왜 올랐어?`, `${p.name} 외주비 상세 알려줘`]) : '')); }, 120);
}

// ── 맞춤 View Builder Drawer ──
function insOpenBuilder() { const d = document.getElementById('ins-builder'); if (d) d.classList.add('open'); }
function insCloseBuilder() { const d = document.getElementById('ins-builder'); if (d) d.classList.remove('open'); }
function insCreateView() { insCloseBuilder(); showToast('나만의 분석 View를 생성했어요. (프로토타입)'); }
function insBuilderHtml() {
  const chk = (c, l) => `<label class="ins-chk"><input type="checkbox" ${c ? 'checked' : ''}>${l}</label>`;
  const rad = (n, c, l) => `<label class="ins-rad"><input type="radio" name="${n}" ${c ? 'checked' : ''}>${l}</label>`;
  return `
  <div class="ins-drawer-overlay" id="ins-builder" onclick="if(event.target===this)insCloseBuilder()">
    <aside class="ins-drawer">
      <div class="ins-drawer-head"><strong>나만의 분석 만들기</strong><button class="ins-drawer-x" onclick="insCloseBuilder()">✕</button></div>
      <div class="ins-drawer-body">
        <div><div class="ins-dr-t">분석 대상</div>${chk(true, '프로젝트')}${chk(true, '조직')}${chk(false, 'PM')}</div>
        <div><div class="ins-dr-t">지표 선택</div>${chk(true, '계약금액')}${chk(true, '실행예산')}${chk(true, '실적')}${chk(true, '예상원가')}${chk(true, '원가율')}${chk(false, '예상이익')}${chk(false, '이익률')}</div>
        <div><div class="ins-dr-t">비교 기준</div>${rad('cmp', true, '계획 vs 실적')}${rad('cmp', false, '최초 vs 현재')}${rad('cmp', false, '전월 vs 당월')}${rad('cmp', false, '프로젝트 간 비교')}</div>
        <div><div class="ins-dr-t">표현 방식</div><div class="ins-dr-viz">${['Table', 'Bar', 'Line', 'Waterfall', 'Donut'].map(v => `<button class="ins-viz ${v === 'Table' ? 'on' : ''}" onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${v}</button>`).join('')}</div></div>
        <div><div class="ins-dr-t">저장</div><label class="ins-dr-name">View 이름<input type="text" value="나의 원가관리 View"></label>${chk(true, '기본 View로 설정')}</div>
      </div>
      <div class="ins-drawer-foot"><button class="ins-act pri" onclick="insCreateView()">분석 생성</button></div>
    </aside>
  </div>`;
}
