// ════════════════════════════════════════
//  프로젝트 월마감 — ERP 전송 결과 조회
// ════════════════════════════════════════

let mcProj              = 'cloud';
let mcGungbiOpen        = true;
let mcView              = 'projects';  // 'projects' | 'list' | 'detail'
let mcSelectedMonth     = null;
let mcProjectSearchQuery = '';

const MC_MAIN_CATS    = ['인건비', '외주비', '재료비', '경비', 'A/S Cost'];
const MC_EXPENSE_SUBS = ['사무용품비','시내교통비','전산소모품비','현지숙소임차관리비','의복관리비','국내출장비','석식대','PJT운영비'];
const EXP_RATIO = { 사무용품비:0.08, 시내교통비:0.15, 전산소모품비:0.10, 현지숙소임차관리비:0.35, 의복관리비:0.07, 국내출장비:0.15, 석식대:0.10, 'PJT운영비':0.00 };

function distExp(total) {
  const r = {}; let rem = total;
  MC_EXPENSE_SUBS.slice(0,-1).forEach(k => { r[k] = Math.round(total * EXP_RATIO[k]); rem -= r[k]; });
  r['PJT운영비'] = Math.max(0, rem);
  return r;
}

// ── 데이터 ──
const MC_DETAIL = {
  cloud: {
    plan: { 인건비:500000000, 외주비:529301838, 재료비:30000000, 경비:8000000, 'A/S Cost':0 },
    planSub: { 사무용품비:640000, 시내교통비:1200000, 전산소모품비:800000, 현지숙소임차관리비:2800000, 의복관리비:560000, 국내출장비:1200000, 석식대:800000, 'PJT운영비':0 },
    current: '2026-04',
    months: [
      { m:'2025-01', t:'actual',  인건비:22000000,  외주비:0,         재료비:0,       경비:210000,  'A/S Cost':0 },
      { m:'2025-02', t:'actual',  인건비:22000000,  외주비:0,         재료비:0,       경비:180000,  'A/S Cost':0 },
      { m:'2025-03', t:'actual',  인건비:22000000,  외주비:12000000,  재료비:0,       경비:240000,  'A/S Cost':0 },
      { m:'2025-04', t:'actual',  인건비:44000000,  외주비:0,         재료비:0,       경비:320000,  'A/S Cost':0 },
      { m:'2025-05', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:1500000, 경비:350000,  'A/S Cost':0 },
      { m:'2025-06', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:0,       경비:280000,  'A/S Cost':0 },
      { m:'2025-07', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:0,       경비:310000,  'A/S Cost':0 },
      { m:'2025-08', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:0,       경비:290000,  'A/S Cost':0 },
      { m:'2025-09', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:0,       경비:320000,  'A/S Cost':0 },
      { m:'2025-10', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:300000,  경비:310000,  'A/S Cost':0 },
      { m:'2025-11', t:'actual',  인건비:44000000,  외주비:35000000,  재료비:0,       경비:270000,  'A/S Cost':0 },
      { m:'2025-12', t:'actual',  인건비:18200000,  외주비:12000000,  재료비:1500000, 경비:320000,  'A/S Cost':0 },
      { m:'2026-01', t:'actual',  인건비:81400000,  외주비:80242833,  재료비:2800000, 경비:850000,  'A/S Cost':0 },
      { m:'2026-02', t:'actual',  인건비:79200000,  외주비:79597343,  재료비:3200000, 경비:780000,  'A/S Cost':0 },
      { m:'2026-03', t:'actual',  인건비:76500000,  외주비:79602608,  재료비:2900000, 경비:920000,  'A/S Cost':0 },
      { m:'2026-04', t:'current', 인건비:82300000,  외주비:80309059,  재료비:3100000, 경비:850000,  'A/S Cost':0 },
      { m:'2026-05', t:'plan', q:{인건비:true,외주비:true}, 인건비:78000000, 외주비:79800000, 재료비:3000000, 경비:800000, 'A/S Cost':0 },
      { m:'2026-06', t:'plan', 인건비:25000000, 외주비:29549995, 재료비:2000000, 경비:500000, 'A/S Cost':0 },
      { m:'2026-07', t:'plan', 인건비:20000000, 외주비:5000000,  재료비:2500000, 경비:400000, 'A/S Cost':0 },
      { m:'2026-08', t:'plan', 인건비:15000000, 외주비:3000000,  재료비:2000000, 경비:350000, 'A/S Cost':0 },
    ]
  },
  erp: {
    plan: { 인건비:320000000, 외주비:250000000, 재료비:20000000, 경비:10000000, 'A/S Cost':20000000 },
    planSub: { 사무용품비:800000, 시내교통비:1500000, 전산소모품비:1000000, 현지숙소임차관리비:3500000, 의복관리비:700000, 국내출장비:1500000, 석식대:1000000, 'PJT운영비':0 },
    current: '2026-04',
    months: [
      { m:'2025-06', t:'actual',  인건비:15000000, 외주비:0,        재료비:0,       경비:1200000, 'A/S Cost':0 },
      { m:'2025-07', t:'actual',  인건비:18000000, 외주비:15000000, 재료비:0,       경비:1500000, 'A/S Cost':0 },
      { m:'2025-08', t:'actual',  인건비:20000000, 외주비:15000000, 재료비:0,       경비:1800000, 'A/S Cost':0 },
      { m:'2025-09', t:'actual',  인건비:20000000, 외주비:30000000, 재료비:0,       경비:2200000, 'A/S Cost':0 },
      { m:'2025-10', t:'actual',  인건비:20000000, 외주비:30000000, 재료비:0,       경비:2000000, 'A/S Cost':0 },
      { m:'2025-11', t:'actual',  인건비:20000000, 외주비:30000000, 재료비:0,       경비:1900000, 'A/S Cost':0 },
      { m:'2025-12', t:'actual',  인건비:22000000, 외주비:0,        재료비:0,       경비:2400000, 'A/S Cost':0 },
      { m:'2026-01', t:'actual',  인건비:22000000, 외주비:40000000, 재료비:0,       경비:2800000, 'A/S Cost':0 },
      { m:'2026-02', t:'actual',  인건비:22000000, 외주비:40000000, 재료비:0,       경비:2500000, 'A/S Cost':0 },
      { m:'2026-03', t:'actual',  인건비:24000000, 외주비:40000000, 재료비:0,       경비:3100000, 'A/S Cost':0 },
      { m:'2026-04', t:'current', 인건비:25000000, 외주비:40000000, 재료비:500000,  경비:3200000, 'A/S Cost':0 },
      { m:'2026-05', t:'plan', 인건비:25000000, 외주비:40000000, 재료비:2000000, 경비:2800000, 'A/S Cost':0 },
      { m:'2026-06', t:'plan', 인건비:25000000, 외주비:30000000, 재료비:5000000, 경비:2500000, 'A/S Cost':5000000 },
      { m:'2026-07', t:'plan', 인건비:22000000, 외주비:5000000,  재료비:5000000, 경비:2000000, 'A/S Cost':8000000 },
      { m:'2026-08', t:'plan', 인건비:18000000, 외주비:5000000,  재료비:3000000, 경비:1500000, 'A/S Cost':5000000 },
      { m:'2026-09', t:'plan', 인건비:10000000, 외주비:5000000,  재료비:2000000, 경비:800000,  'A/S Cost':2000000 },
    ]
  },
  mobile: {
    plan: { 인건비:200000000, 외주비:150000000, 재료비:5000000, 경비:5000000, 'A/S Cost':20000000 },
    planSub: { 사무용품비:400000, 시내교통비:750000, 전산소모품비:500000, 현지숙소임차관리비:1750000, 의복관리비:350000, 국내출장비:750000, 석식대:500000, 'PJT운영비':0 },
    current: '2026-04',
    months: [
      { m:'2025-08', t:'actual',  인건비:8000000,  외주비:0,        재료비:0,       경비:1200000, 'A/S Cost':0 },
      { m:'2025-09', t:'actual',  인건비:10000000, 외주비:15000000, 재료비:0,       경비:1500000, 'A/S Cost':0 },
      { m:'2025-10', t:'actual',  인건비:12000000, 외주비:15000000, 재료비:0,       경비:1800000, 'A/S Cost':0 },
      { m:'2025-11', t:'actual',  인건비:14000000, 외주비:15000000, 재료비:0,       경비:2000000, 'A/S Cost':0 },
      { m:'2025-12', t:'actual',  인건비:16000000, 외주비:25000000, 재료비:0,       경비:2200000, 'A/S Cost':0 },
      { m:'2026-01', t:'actual',  인건비:18000000, 외주비:25000000, 재료비:0,       경비:2400000, 'A/S Cost':0 },
      { m:'2026-02', t:'actual',  인건비:18000000, 외주비:25000000, 재료비:0,       경비:2100000, 'A/S Cost':0 },
      { m:'2026-03', t:'actual',  인건비:18000000, 외주비:25000000, 재료비:0,       경비:2300000, 'A/S Cost':0 },
      { m:'2026-04', t:'current', 인건비:18000000, 외주비:25000000, 재료비:500000,  경비:2100000, 'A/S Cost':0 },
      { m:'2026-05', t:'plan', 인건비:15000000, 외주비:10000000, 재료비:2000000, 경비:1500000, 'A/S Cost':5000000 },
      { m:'2026-06', t:'plan', 인건비:10000000, 외주비:5000000,  재료비:1000000, 경비:800000,  'A/S Cost':10000000 },
    ]
  },
  sec: {
    plan: { 인건비:150000000, 외주비:120000000, 재료비:3000000, 경비:5000000, 'A/S Cost':12000000 },
    planSub: { 사무용품비:400000, 시내교통비:750000, 전산소모품비:500000, 현지숙소임차관리비:1750000, 의복관리비:350000, 국내출장비:750000, 석식대:500000, 'PJT운영비':0 },
    current: '2026-04',
    months: [
      { m:'2025-04', t:'actual',  인건비:7000000,  외주비:0,        재료비:0,       경비:1000000, 'A/S Cost':0 },
      { m:'2025-05', t:'actual',  인건비:8000000,  외주비:0,        재료비:0,       경비:1200000, 'A/S Cost':0 },
      { m:'2025-06', t:'actual',  인건비:8000000,  외주비:15000000, 재료비:0,       경비:1500000, 'A/S Cost':0 },
      { m:'2025-07', t:'actual',  인건비:10000000, 외주비:15000000, 재료비:1500000, 경비:1800000, 'A/S Cost':0 },
      { m:'2025-08', t:'actual',  인건비:10000000, 외주비:15000000, 재료비:0,       경비:2000000, 'A/S Cost':0 },
      { m:'2025-09', t:'actual',  인건비:12000000, 외주비:20000000, 재료비:0,       경비:2200000, 'A/S Cost':0 },
      { m:'2025-10', t:'actual',  인건비:12000000, 외주비:20000000, 재료비:0,       경비:2400000, 'A/S Cost':0 },
      { m:'2025-11', t:'actual',  인건비:12000000, 외주비:25000000, 재료비:0,       경비:2600000, 'A/S Cost':0 },
      { m:'2025-12', t:'actual',  인건비:14000000, 외주비:25000000, 재료비:0,       경비:2800000, 'A/S Cost':0 },
      { m:'2026-01', t:'actual',  인건비:14000000, 외주비:30000000, 재료비:0,       경비:3000000, 'A/S Cost':0 },
      { m:'2026-02', t:'actual',  인건비:14000000, 외주비:30000000, 재료비:0,       경비:3200000, 'A/S Cost':0 },
      { m:'2026-03', t:'actual',  인건비:16000000, 외주비:30000000, 재료비:0,       경비:3500000, 'A/S Cost':0 },
      { m:'2026-04', t:'current', 인건비:16000000, 외주비:30000000, 재료비:1500000, 경비:3600000, 'A/S Cost':0 },
      { m:'2026-05', t:'plan', 인건비:10000000, 외주비:5000000,  재료비:1000000, 경비:1800000, 'A/S Cost':6000000 },
    ]
  },
};

// ── 초기화 ──
function initMonthlyClose() {
  document.getElementById('s-monthly-close').innerHTML = `
    <div id="mc-projects-view"></div>
    <div id="mc-list-view" style="display:none"></div>
    <div id="mc-detail-view" style="display:none"></div>
  `;
}

function renderMonthlyClose() {
  mcView = 'projects';
  mcSelectedMonth = null;
  renderMcProjectList();
}

// ══════════════════════════════════════
//  프로젝트 목록 뷰
// ══════════════════════════════════════
function renderMcProjectList() {
  document.getElementById('mc-projects-view').style.display = '';
  document.getElementById('mc-list-view').style.display = 'none';
  document.getElementById('mc-detail-view').style.display = 'none';

  const q = mcProjectSearchQuery.toLowerCase();
  const keys = Object.keys(PROJ_NAMES);
  const filtered = keys.filter(k =>
    !q || [PROJ_NAMES[k], PM_NAMES[k]].some(v => v && v.toLowerCase().includes(q))
  );

  const rows = filtered.map(k => {
    const d = MC_DETAIL[k];
    const closedMonths = d.months.filter(m => m.t === 'actual' || m.t === 'current');
    const lastM = closedMonths[closedMonths.length - 1];
    const cumActual = closedMonths.reduce((s, m) => s + MC_MAIN_CATS.reduce((ss,c) => ss+(m[c]||0), 0), 0);
    const totalPlan = MC_MAIN_CATS.reduce((s,c) => s+(d.plan[c]||0), 0);
    const execRate = totalPlan > 0 ? (cumActual / totalPlan * 100).toFixed(1) : 0;
    const rateColor = execRate > 90 ? '#ef4444' : execRate > 70 ? '#f59e0b' : '#22c55e';
    const hasCurrent = closedMonths.some(m => m.t === 'current');
    const statusBg = hasCurrent ? '#dbeafe' : '#dcfce7';
    const statusColor = hasCurrent ? '#1d4ed8' : '#166534';
    const statusLabel = hasCurrent ? '당월 마감중' : '전월 완료';
    return `
      <tr onclick="openMcProjectMonths('${k}')">
        <td>
          <div class="pt-name">${PROJ_NAMES[k]}</div>
          <div class="pt-sub">PM ${PM_NAMES[k]}</div>
        </td>
        <td class="pt-center">${closedMonths.length}<span style="color:#94a3b8;font-size:11px">회</span></td>
        <td class="pt-center" style="font-size:12px">${lastM ? lastM.m : '—'}</td>
        <td style="text-align:right;font-weight:700;white-space:nowrap">${fmt(cumActual)}<span style="font-weight:400;color:#94a3b8;font-size:11px">원</span></td>
        <td style="min-width:110px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,execRate)}%;background:${rateColor};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:${rateColor};font-weight:700;white-space:nowrap">${execRate}%</span>
          </div>
        </td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${statusBg};color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('mc-projects-view').innerHTML = `
    <div class="page-header">
      <div class="page-title">프로젝트 월마감</div>
      <div class="page-sub">ERP 실적 전송 결과 조회 · 매월 말일 23:59 시스템 자동 전송</div>
    </div>
    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, PM 검색…" value="${mcProjectSearchQuery}"
          oninput="mcProjectSearchQuery=this.value;renderMcProjectList()">
      </div>
      <span class="proj-count-tag">${filtered.length}건</span>
    </div>
    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>프로젝트명</th>
            <th class="pt-center">마감 횟수</th>
            <th class="pt-center">최근 마감월</th>
            <th style="text-align:right">누적 전송액</th>
            <th>예산 집행률</th>
            <th class="pt-center">상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openMcProjectMonths(k) {
  mcProj = k;
  mcView = 'list';
  document.getElementById('mc-projects-view').style.display = 'none';
  document.getElementById('mc-list-view').style.display = '';
  renderMcListView();
}

function closeMcMonths() {
  mcView = 'projects';
  renderMcProjectList();
}

// ══════════════════════════════════════
//  목록 뷰 — 월마감 이력 요약
// ══════════════════════════════════════
function renderMcListView() {
  document.getElementById('mc-list-view').style.display = '';
  document.getElementById('mc-detail-view').style.display = 'none';

  const d = MC_DETAIL[mcProj];
  const closedMonths = d.months.filter(m => m.t === 'actual' || m.t === 'current');

  // KPI
  let cumActual = 0;
  closedMonths.forEach(m => { cumActual += MC_MAIN_CATS.reduce((s,c) => s+(m[c]||0), 0); });
  const lastM = closedMonths[closedMonths.length - 1];
  const totalPlan = MC_MAIN_CATS.reduce((s,c) => s+(d.plan[c]||0), 0);

  const kpi = `
    <div class="kpi-row kpi-4" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-label">총 마감 횟수</div>
        <div class="kpi-value">${closedMonths.length}<span class="unit">회</span></div>
        <div class="kpi-sub">ERP 전송 완료</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">누적 전송액</div>
        <div class="kpi-value" style="font-size:20px">${fmt(cumActual)}<span class="unit" style="font-size:13px">원</span></div>
        <div class="kpi-sub">실적 + 당월 합계</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">최종 마감월</div>
        <div class="kpi-value" style="font-size:20px">${lastM ? lastM.m.slice(2).replace('-','.') : '—'}</div>
        <div class="kpi-sub">${lastM ? lastM.m + ' 23:59 자동전송' : ''}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">총 예산 대비 집행률</div>
        <div class="kpi-value" style="font-size:20px;color:${cumActual/totalPlan > 0.9 ? '#ef4444' : '#1e293b'}">${totalPlan > 0 ? (cumActual/totalPlan*100).toFixed(1) : 0}<span class="unit">%</span></div>
        <div class="kpi-sub">예산 ${fmt(totalPlan)}원</div>
      </div>
    </div>`;

  // 이력 테이블
  const listRows = closedMonths.slice().reverse().map((m, idx) => {
    const total = MC_MAIN_CATS.reduce((s,c) => s+(m[c]||0), 0);
    const isCurrent = m.t === 'current';
    const statusBadge = isCurrent
      ? `<span class="mc-hist-badge current">당월 마감</span>`
      : `<span class="mc-hist-badge done">전송 완료</span>`;

    // 주요 계정 중 가장 큰 두 개 표시
    const topCats = MC_MAIN_CATS
      .map(c => ({ c, v: m[c]||0 }))
      .filter(x => x.v > 0)
      .sort((a,b) => b.v - a.v)
      .slice(0, 3);

    const catBars = topCats.map(({c,v}) => {
      const pct = total > 0 ? Math.round(v/total*100) : 0;
      const colors = { '인건비':'#3b82f6', '외주비':'#8b5cf6', '재료비':'#10b981', '경비':'#f59e0b', 'A/S Cost':'#ef4444' };
      return `<div class="mc-hist-bar-row">
        <span class="mc-hist-bar-label">${c}</span>
        <div class="mc-hist-bar-bg">
          <div class="mc-hist-bar-fill" style="width:${pct}%;background:${colors[c]||'#64748b'}"></div>
        </div>
        <span class="mc-hist-bar-val">${fmt(v)}</span>
      </div>`;
    }).join('');

    return `<tr class="mc-hist-row" onclick="openMcDetail('${m.m}')">
      <td class="mc-hist-month">
        <div class="mc-hist-m-label">${m.m.replace('-','년 ')}월</div>
        <div class="mc-hist-m-sub">${m.m} 23:59</div>
      </td>
      <td>${statusBadge}</td>
      <td class="mc-hist-total">${fmt(total)}<span style="font-size:11px;color:#94a3b8;font-weight:400">원</span></td>
      <td class="mc-hist-cats">${catBars}</td>
      <td class="mc-hist-action">
        <button class="mc-detail-btn" onclick="event.stopPropagation();openMcDetail('${m.m}')">상세 보기 →</button>
      </td>
    </tr>`;
  }).join('');

  const listTable = `
    <div class="card">
      <div class="card-head">
        <span class="card-title">월마감 전송 이력</span>
        <span class="card-badge">${closedMonths.length}건 · ERP 자동 전송 완료</span>
      </div>
      <table class="mc-hist-table">
        <thead>
          <tr>
            <th>마감월</th>
            <th>상태</th>
            <th>총 전송액</th>
            <th>계정별 비중</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${listRows || '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8">마감 이력이 없습니다</td></tr>'}</tbody>
      </table>
    </div>`;

  document.getElementById('mc-list-view').innerHTML = `
    <div class="page-header-row" style="margin-bottom:16px;align-items:center">
      <button class="back-btn" onclick="closeMcMonths()">← 목록으로</button>
    </div>
    <div class="page-header" style="margin-bottom:20px">
      <div class="page-title">${PROJ_NAMES[mcProj]}</div>
      <div class="page-sub">월마감 이력 · 마감월 클릭 시 계정별 상세 조회</div>
    </div>
    ${kpi}
    ${listTable}
  `;
}

// ══════════════════════════════════════
//  상세 뷰 — 특정 마감월 계정별 내역
// ══════════════════════════════════════
function openMcDetail(month) {
  mcSelectedMonth = month;
  mcView = 'detail';
  mcGungbiOpen = true;
  renderMcDetailView();
  document.getElementById('mc-list-view').style.display = 'none';
  document.getElementById('mc-detail-view').style.display = '';
}

function closeMcDetail() {
  mcView = 'list';
  mcSelectedMonth = null;
  document.getElementById('mc-detail-view').style.display = 'none';
  document.getElementById('mc-list-view').style.display = '';
  renderMcListView();
}

function renderMcDetailView() {
  const d = MC_DETAIL[mcProj];
  const selMonth = d.months.find(m => m.m === mcSelectedMonth);
  if (!selMonth) return;

  const mLabel = mcSelectedMonth.replace('-','년 ') + '월';
  const isCurrentMonth = selMonth.t === 'current';
  const total = MC_MAIN_CATS.reduce((s,c) => s+(selMonth[c]||0), 0);

  // ── 스냅샷 타입: 조회 시점(현재)이 아닌 마감 시점 기준으로 결정 ──
  // 마감월 이전 → 실적, 마감월 당월 → 당월, 마감월 이후 → 계획
  function snapType(monthStr) {
    if (monthStr < mcSelectedMonth) return 'actual';
    if (monthStr === mcSelectedMonth) return 'current';
    return 'plan';
  }
  function snapThCls(monthStr) {
    const t = snapType(monthStr);
    return t === 'current' ? 'th-current' : t === 'actual' ? 'th-past' : 'th-future';
  }
  function snapTdCls(monthStr) {
    const t = snapType(monthStr);
    return t === 'current' ? 'td-current' : t === 'actual' ? 'td-actual' : 'td-future';
  }

  // 계정별 요약 카드
  const catCards = MC_MAIN_CATS.filter(c => (selMonth[c]||0) > 0).map(c => {
    const v = selMonth[c] || 0;
    const pct = total > 0 ? (v/total*100).toFixed(1) : 0;
    const colors = { '인건비':'#3b82f6', '외주비':'#8b5cf6', '재료비':'#10b981', '경비':'#f59e0b', 'A/S Cost':'#ef4444' };
    return `<div class="mc-cat-card">
      <div class="mc-cat-dot" style="background:${colors[c]||'#64748b'}"></div>
      <div class="mc-cat-name">${c}</div>
      <div class="mc-cat-val">${fmt(v)}</div>
      <div class="mc-cat-pct">${pct}%</div>
    </div>`;
  }).join('');

  // 스냅샷 기준 테이블 헤더
  const monthLabel = m => m.m.slice(2).replace('-','.');

  const monthHeads = d.months.map(m =>
    `<th class="${snapThCls(m.m)}${m.m === mcSelectedMonth ? ' th-selected' : ''}" style="min-width:100px">${monthLabel(m)}</th>`
  ).join('');

  const subHeads = d.months.map(m => {
    const t = snapType(m.m);
    const isSel = m.m === mcSelectedMonth;
    const selCls = isSel ? ' th-selected' : '';
    if (t === 'current') return `<th class="th-current${selCls}">당월</th>`;
    if (t === 'actual')  return `<th class="th-past${selCls}">실적</th>`;
    // 계획: 투입확정 여부는 마감 시점 이후이므로 단순 계획으로 표시
    return `<th class="th-future${selCls}">계획</th>`;
  }).join('');

  function catCells(cat) {
    return d.months.map(m => {
      const v    = m[cat] || 0;
      const cls  = snapTdCls(m.m);
      const isSel = m.m === mcSelectedMonth;
      // 투입확정 표시는 마감 시점 이전 월에서 m.q가 있을 때만 (마감 당시 투입확정이었던 경우)
      const isQ  = snapType(m.m) === 'actual' && m.q && m.q[cat];
      const quasi = isQ ? `<div class="quasi-indicator">▶ 투입확정 ${fmt(v)}</div>` : '';
      return `<td class="${cls}${isSel ? ' td-selected' : ''}">${v > 0 ? fmt(v) : '—'}${quasi}</td>`;
    }).join('');
  }

  function subCells(sub) {
    return d.months.map(m => {
      const exp  = m['경비'] || 0;
      const v    = exp > 0 ? Math.round(exp * (EXP_RATIO[sub] || 0)) : 0;
      const cls  = snapTdCls(m.m);
      const isSel = m.m === mcSelectedMonth;
      return `<td class="${cls}${isSel ? ' td-selected' : ''}" style="font-size:12px;color:#64748b">${v > 0 ? fmt(v) : '—'}</td>`;
    }).join('');
  }

  function totalCells() {
    return d.months.map(m => {
      const v    = MC_MAIN_CATS.reduce((s,c) => s+(m[c]||0), 0);
      const cls  = snapTdCls(m.m);
      const isSel = m.m === mcSelectedMonth;
      return `<td class="${cls}${isSel ? ' td-selected' : ''}" style="font-weight:800">${v > 0 ? fmt(v) : '—'}</td>`;
    }).join('');
  }

  const rows = [];
  MC_MAIN_CATS.forEach(cat => {
    const planV = d.plan[cat] || 0;
    if (cat === '경비') {
      rows.push(`<tr class="data-row">
        <td class="td-cat" style="cursor:pointer" onclick="toggleMcGungbi()">
          <span class="mc-toggle-btn">${mcGungbiOpen ? '−' : '＋'}</span> ${cat}
        </td>
        <td class="td-plan">${planV > 0 ? fmt(planV) : '—'}</td>
        ${catCells(cat)}
      </tr>`);
      MC_EXPENSE_SUBS.forEach(sub => {
        const subPlan = d.planSub[sub] || 0;
        rows.push(`<tr class="data-row mc-sub-row${mcGungbiOpen ? '' : ' mc-sub-hidden'}">
          <td class="td-cat mc-sub-cat">↳ ${sub}</td>
          <td class="td-plan" style="font-size:12px;color:#94a3b8">${subPlan > 0 ? fmt(subPlan) : '—'}</td>
          ${subCells(sub)}
        </tr>`);
      });
    } else {
      rows.push(`<tr class="data-row">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV > 0 ? fmt(planV) : '—'}</td>
        ${catCells(cat)}
      </tr>`);
    }
  });

  const totalPlan = MC_MAIN_CATS.reduce((s,c) => s+(d.plan[c]||0), 0);
  rows.push(`<tr class="total-row">
    <td class="td-cat">합계</td>
    <td class="td-plan">${fmt(totalPlan)}</td>
    ${totalCells()}
  </tr>`);

  document.getElementById('mc-detail-view').innerHTML = `
    <div class="page-header-row" style="margin-bottom:20px;align-items:center">
      <div>
        <button class="back-btn" onclick="closeMcDetail()">← 이력 목록으로</button>
      </div>
    </div>

    <div class="mc-detail-header">
      <div>
        <div class="page-title">${mLabel} 마감 내역</div>
        <div class="page-sub">${PROJ_NAMES[mcProj]} · ${mcSelectedMonth} 23:59 시스템 자동 전송</div>
      </div>
      <div class="mc-detail-badge-wrap">
        ${isCurrentMonth
          ? `<span class="mc-hist-badge current" style="font-size:13px;padding:6px 16px">당월 마감</span>`
          : `<span class="mc-hist-badge done" style="font-size:13px;padding:6px 16px">✓ 전송 완료</span>`}
        <div style="font-size:22px;font-weight:900;color:#1e293b;margin-top:4px">${fmt(total)}<span style="font-size:14px;color:#94a3b8;font-weight:400">원</span></div>
      </div>
    </div>

    <!-- 계정별 요약 -->
    <div class="mc-cat-summary">${catCards}</div>

    <!-- 경비 소계정 상세 -->
    ${(selMonth['경비']||0) > 0 ? buildExpenseDetail(selMonth['경비']) : ''}

    <!-- 전체 기간 비교 테이블 -->
    <div class="card">
      <div class="card-head">
        <span class="card-title">마감 시점 기준 전체 현황</span>
        <div style="display:flex;align-items:center;gap:16px">
          <span style="font-size:12px;color:#94a3b8">📅 ${mcSelectedMonth} 23:59 스냅샷</span>
          <div class="budget-legend">
            <div class="legend-item"><div class="legend-dot" style="background:#dbeafe"></div>실적</div>
            <div class="legend-item"><div class="legend-dot" style="background:#fca5a5"></div>당월</div>
            <div class="legend-item"><div class="legend-dot" style="background:#fef3c7"></div>계획</div>
            <div class="legend-item"><div class="legend-dot" style="background:#fbbf24;opacity:.5"></div>선택월</div>
          </div>
        </div>
      </div>
      <div class="budget-table-wrap">
        <table class="budget-table">
          <thead>
            <tr class="month-head-row">
              <th class="mh-cat">구분</th>
              <th class="mh-plan">예산계획</th>
              ${monthHeads}
            </tr>
            <tr class="type-subhead">
              <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
              ${subHeads}
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
      <div class="mc-erp-note">※ 단위: 원 · 실적은 ERP 전송 완료 금액이며 PM이 직접 수정할 수 없습니다.</div>
    </div>
  `;

  // 선택된 월 컬럼으로 자동 스크롤
  setTimeout(() => {
    const selTh = document.querySelector('.th-selected');
    if (selTh) selTh.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, 100);
}

function buildExpenseDetail(expTotal) {
  const items = MC_EXPENSE_SUBS.map(sub => {
    const v = Math.round(expTotal * (EXP_RATIO[sub] || 0));
    const pct = expTotal > 0 ? (v/expTotal*100).toFixed(0) : 0;
    return { sub, v, pct };
  }).filter(x => x.v > 0);

  const rows = items.map(({sub, v, pct}) => `
    <div class="exp-detail-row">
      <span class="exp-detail-name">↳ ${sub}</span>
      <div class="exp-detail-bar-bg">
        <div class="exp-detail-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="exp-detail-pct">${pct}%</span>
      <span class="exp-detail-val">${fmt(v)}원</span>
    </div>`).join('');

  return `
    <div class="card" style="margin-bottom:20px">
      <div class="card-head">
        <span class="card-title">경비 소계정 상세</span>
        <span class="card-badge">총 ${fmt(expTotal)}원</span>
      </div>
      <div style="padding:16px 24px">${rows}</div>
    </div>`;
}

// ── 인터랙션 ──
function selectMcProjList(proj) {
  mcProj = proj;
  renderMcListView();
}

function selectMcProj(proj) {
  mcProj = proj;
  if (mcView === 'list') renderMcListView();
  else renderMcDetailView();
}

function toggleMcGungbi() {
  mcGungbiOpen = !mcGungbiOpen;
  document.querySelectorAll('.mc-sub-row').forEach(r => r.classList.toggle('mc-sub-hidden'));
  const btn = document.querySelector('.mc-toggle-btn');
  if (btn) btn.textContent = mcGungbiOpen ? '−' : '＋';
}
