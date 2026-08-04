// ════════════════════════════════════════
//  리스크 인사이트 — 월간 캘린더 뷰
// ════════════════════════════════════════

// ── 서명 상태 ──
let sigCanvas, sigCtx, drawing = false, hasSig = false;
let currentId = null;

// ── 캘린더 필터 상태 ──
let riskCalYear   = new Date().getFullYear();
let riskCalMonth  = new Date().getMonth(); // 0-indexed
let riskCalProj   = 'all';
let riskCalLevel  = 'all';
let riskCalStatus = 'all';
let riskCalQuery  = '';

// ── 하위 호환 변수 (dashboard.js / app.js 등에서 참조) ──
let riskView = 'calendar';
let riskCurrentProj = 'all';
let riskSearchQuery = '';

// ── 색상 상수 ──
const RIC_PROJ_COLOR = { cloud:'#1d4ed8', erp:'#0f766e', mobile:'#d97706', sec:'#dc2626' };
const RIC_LEVEL_COLOR = {
  '높음': { bg:'#fee2e2', color:'#991b1b' },
  '주의': { bg:'#fef3c7', color:'#92400e' },
  '중간': { bg:'#fef3c7', color:'#92400e' },
  '낮음': { bg:'#dcfce7', color:'#166534' },
};
const RIC_STATUS_COLOR = {
  '조치완료': { bg:'#dcfce7', color:'#166534' },
  '검토중':   { bg:'#fef3c7', color:'#92400e' },
  '미조치':   { bg:'#fee2e2', color:'#991b1b' },
};

// ── 날짜 키 ──
const toRicKey = d =>
  `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;

// ── mock 배분 (날짜가 없을 때) ──
const RIC_MOCK_DAYS = [1,3,5,8,10,12,15,18,20,22,25,27,28,29];

// ════════════════════════════════════════
//  초기화
// ════════════════════════════════════════
function initRiskHistory() {
  riskCalYear  = new Date().getFullYear();
  riskCalMonth = new Date().getMonth();
  document.getElementById('s-hist').innerHTML = `<div id="risk-body"></div>`;
  renderRiskInsightCalendar();
}

// ── 하위 호환: openRiskDetail, renderRiskProjectList ──
function openRiskDetail(proj) {
  riskCalProj = proj;
  riskCurrentProj = proj;
  renderRiskInsightCalendar();
}
function renderRiskProjectList() {
  riskCalProj = 'all';
  renderRiskInsightCalendar();
}

// ════════════════════════════════════════
//  메인 렌더
// ════════════════════════════════════════
function renderRiskInsightCalendar() {
  riskCurrentProj = riskCalProj;

  // ── 필터 적용 ──
  const q = riskCalQuery.trim().toLowerCase();
  const filtered = risks.filter(r => {
    if (riskCalProj   !== 'all' && r.proj   !== riskCalProj)   return false;
    if (riskCalLevel  !== 'all' && r.level  !== riskCalLevel)  return false;
    if (riskCalStatus !== 'all' && r.status !== riskCalStatus) return false;
    if (q && !r.title.toLowerCase().includes(q) &&
             !r.sub.toLowerCase().includes(q) &&
             !(PROJ_NAMES[r.proj]||'').toLowerCase().includes(q)) return false;
    return true;
  });

  // ── KPI ──
  const total   = filtered.length;
  const high    = filtered.filter(r => r.level  === '높음').length;
  const pending = filtered.filter(r => r.status === '미조치').length;
  const review  = filtered.filter(r => r.status === '검토중').length;
  const done    = filtered.filter(r => r.status === '조치완료').length;

  // ── 캘린더 계산 ──
  const year = riskCalYear;
  const mon  = riskCalMonth;
  const today = new Date();
  const monthLabel = `${year}년 ${mon+1}월`;

  const firstDow   = new Date(year, mon, 1).getDay();           // 0=Sun
  const daysInMon  = new Date(year, mon+1, 0).getDate();
  const startPad   = firstDow === 0 ? 6 : firstDow - 1;        // Mon-based pad

  // 이 달의 모든 날짜 키
  const monthKeys = [];
  for (let d = 1; d <= daysInMon; d++) {
    monthKeys.push(toRicKey(new Date(year, mon, d)));
  }

  // 날짜별 리스크 버킷
  const risksByDate = {};
  monthKeys.forEach(k => risksByDate[k] = []);

  filtered.forEach((r, i) => {
    let key = null;
    if (r.memos && r.memos.length > 0) {
      const candidate = r.memos[0].when.slice(0, 5);
      if (risksByDate.hasOwnProperty(candidate)) key = candidate;
    }
    if (!key) {
      const dayNum  = RIC_MOCK_DAYS[i % RIC_MOCK_DAYS.length];
      const clamped = Math.min(dayNum, daysInMon);
      key = toRicKey(new Date(year, mon, clamped));
    }
    if (risksByDate[key]) risksByDate[key].push(r);
  });

  // ── 셀 렌더 ──
  function renderChip(r) {
    const lc = RIC_LEVEL_COLOR[r.level]   || { bg:'#f1f5f9', color:'#64748b' };
    const sc = RIC_STATUS_COLOR[r.status] || { bg:'#f1f5f9', color:'#64748b' };
    const pc = RIC_PROJ_COLOR[r.proj] || '#94a3b8';
    const pname = PROJ_NAMES[r.proj] || r.proj || '';
    return `
      <div class="ric-chip" onclick="openMo('${r.id}')" title="${pname} · ${r.title}">
        <div class="ric-chip-top">
          <span class="ric-chip-dot" style="background:${pc}"></span>
          <span class="ric-chip-proj" style="color:${pc}">${pname}</span>
        </div>
        <div class="ric-chip-title">${r.title}</div>
        <div class="ric-chip-btm">
          <span class="ric-chip-lv" style="background:${lc.bg};color:${lc.color}">${r.level}</span>
          <span class="ric-chip-st" style="background:${sc.bg};color:${sc.color}">${r.status}</span>
        </div>
      </div>`;
  }

  function renderCell(day) {
    if (!day) return `<div class="ric-cell ric-cell-pad"></div>`;
    const dt = new Date(year, mon, day);
    const key = toRicKey(dt);
    const dayRisks = risksByDate[key] || [];
    const isToday  = dt.toDateString() === today.toDateString();
    const dow      = (dt.getDay() + 6) % 7; // Mon=0 … Sun=6
    const isWe     = dow >= 5;
    const chips    = dayRisks.map(renderChip).join('');
    return `
      <div class="ric-cell${isToday?' ric-today':''}${isWe?' ric-we':''}">
        <div class="ric-cell-hd">
          <span class="ric-day-num${isToday?' ric-today-num':''}">${day}</span>
          ${dayRisks.length ? `<span class="ric-cnt">${dayRisks.length}</span>` : ''}
        </div>
        <div class="ric-cell-bd">${chips}</div>
      </div>`;
  }

  // 그리드 셀 생성
  const rows  = Math.ceil((startPad + daysInMon) / 7);
  let   cells = '';
  for (let i = 0; i < rows * 7; i++) {
    const day = (i < startPad || i - startPad + 1 > daysInMon) ? null : i - startPad + 1;
    cells += renderCell(day);
  }

  // ── 프로젝트 필터 Pills ──
  const projPills = [
    { key:'all',    name:'전체',   color:'#475569' },
    { key:'cloud',  name:'클라우드 인프라 고도화', color: RIC_PROJ_COLOR.cloud  },
    { key:'erp',    name:'ERP 고도화',             color: RIC_PROJ_COLOR.erp    },
    { key:'mobile', name:'모바일 앱 리뉴얼',       color: RIC_PROJ_COLOR.mobile },
    { key:'sec',    name:'보안 시스템 구축',        color: RIC_PROJ_COLOR.sec    },
  ].map(p => {
    const active = riskCalProj === p.key;
    const style  = active
      ? `background:${p.color};color:#fff;border-color:${p.color}`
      : `color:${p.color};border-color:${p.color}`;
    return `<button class="ric-proj-pill${active?' active':''}" style="${style}"
      onclick="riskCalProj='${p.key}';renderRiskInsightCalendar()">${p.name}</button>`;
  }).join('');

  const hasFilter = riskCalLevel !== 'all' || riskCalStatus !== 'all' || riskCalQuery;
  const dayNames  = ['월','화','수','목','금','토','일'];

  // ── DOM 출력 ──
  document.getElementById('risk-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">체크포인트 현황</div>
        <div class="page-sub">AI가 감지한 주요 운영 포인트</div>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-row kpi-5" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-label">전체 체크포인트</div><div class="kpi-value">${total}건</div></div>
      <div class="kpi-card"><div class="kpi-label">높음</div><div class="kpi-value" style="color:#991b1b">${high}건</div></div>
      <div class="kpi-card"><div class="kpi-label">미조치</div><div class="kpi-value" style="color:#dc2626">${pending}건</div></div>
      <div class="kpi-card"><div class="kpi-label">검토 중</div><div class="kpi-value" style="color:#92400e">${review}건</div></div>
      <div class="kpi-card"><div class="kpi-label">조치 완료</div><div class="kpi-value" style="color:#166534">${done}건</div></div>
    </div>

    <!-- 툴바 -->
    <div class="ric-toolbar">
      <div class="ric-pills-wrap">${projPills}</div>
      <div class="ric-filter-wrap">
        <input class="ric-search" type="text" placeholder="🔍  체크포인트 검색"
          value="${riskCalQuery}"
          oninput="riskCalQuery=this.value;renderRiskInsightCalendar()">
        <select class="ric-select" onchange="riskCalLevel=this.value;renderRiskInsightCalendar()">
          <option value="all" ${riskCalLevel==='all'?'selected':''}>등급 전체</option>
          <option value="높음" ${riskCalLevel==='높음'?'selected':''}>높음</option>
          <option value="주의" ${riskCalLevel==='주의'?'selected':''}>주의</option>
          <option value="중간" ${riskCalLevel==='중간'?'selected':''}>중간</option>
          <option value="낮음" ${riskCalLevel==='낮음'?'selected':''}>낮음</option>
        </select>
        <select class="ric-select" onchange="riskCalStatus=this.value;renderRiskInsightCalendar()">
          <option value="all"    ${riskCalStatus==='all'?'selected':''}>상태 전체</option>
          <option value="조치완료" ${riskCalStatus==='조치완료'?'selected':''}>조치완료</option>
          <option value="검토중"   ${riskCalStatus==='검토중'?'selected':''}>검토중</option>
          <option value="미조치"   ${riskCalStatus==='미조치'?'selected':''}>미조치</option>
        </select>
        ${hasFilter ? `<button class="ric-reset-btn"
          onclick="riskCalLevel='all';riskCalStatus='all';riskCalQuery='';renderRiskInsightCalendar()">초기화</button>` : ''}
      </div>
    </div>

    <!-- 캘린더 카드 -->
    <div class="card ric-cal-card">
      <!-- 월 네비게이션 -->
      <div class="ric-cal-nav">
        <button class="ric-nav-btn" onclick="
          riskCalMonth--;
          if(riskCalMonth<0){riskCalMonth=11;riskCalYear--;}
          renderRiskInsightCalendar()">‹</button>
        <span class="ric-month-label">${monthLabel}</span>
        <button class="ric-nav-btn" onclick="
          riskCalMonth++;
          if(riskCalMonth>11){riskCalMonth=0;riskCalYear++;}
          renderRiskInsightCalendar()">›</button>
        <button class="ric-today-btn" onclick="
          riskCalYear=new Date().getFullYear();
          riskCalMonth=new Date().getMonth();
          renderRiskInsightCalendar()">오늘</button>
        <span class="ric-cal-total">${total > 0 ? `이 달 ${total}건` : ''}</span>
      </div>

      <!-- 그리드 -->
      <div class="ric-grid">
        ${dayNames.map((d,i)=>`<div class="ric-dow${i>=5?' ric-dow-we':''}">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
}

// ════════════════════════════════════════
//  모달
// ════════════════════════════════════════
function openMo(id) {
  const r = risks.find(x => x.id === id);
  if (!r) return;
  currentId = id;
  const ls = LEVEL_STYLE[r.level] || {bg:'#f1f5f9',color:'#64748b'};
  document.getElementById('mo-tag').textContent          = 'AI 리스크 · ' + PROJ_NAMES[r.proj];
  document.getElementById('mo-title').textContent        = r.title;
  document.getElementById('mo-level-badge').textContent  = r.level;
  document.getElementById('mo-level-badge').style.cssText= `background:${ls.bg};color:${ls.color}`;
  document.getElementById('mo-action').textContent       = r.action;
  document.getElementById('mo-guide').textContent        = r.guide;
  document.getElementById('mc1').checked = r.checks[0];
  document.getElementById('mc2').checked = r.checks[1];
  document.getElementById('mc3').checked = r.checks[2];
  document.getElementById('mo-memo').value = '';
  document.getElementById('mo-confirmer').textContent = PM_NAMES[r.proj];
  document.getElementById('mo-saved-msg').style.display = 'none';
  renderMoHist(r);
  document.getElementById('action-overlay').classList.add('open');
  setTimeout(initSig, 80);
}

function renderMoHist(r) {
  const el = document.getElementById('mo-hist-body');
  if (!r.memos.length) { el.innerHTML = '<div class="no-memo">이력 없음</div>'; return; }
  el.innerHTML = '<div class="memo-thread">' +
    [...r.memos].reverse().map(m => `
      <div class="memo-bubble">
        <div class="memo-meta">
          <span class="memo-who">${m.who}</span>
          <span class="memo-when">${m.when}</span>
        </div>
        <div class="memo-txt">${m.txt}</div>
        ${m.sig ? '<div class="memo-sig-tag">✍ 서명 완료</div>' : ''}
      </div>`).join('') + '</div>';
}

function closeMo() {
  document.getElementById('action-overlay').classList.remove('open');
  currentId = null;
}
function closeMoIfBg(e) {
  if (e.target === document.getElementById('action-overlay')) closeMo();
}

async function saveAction() {
  const r = risks.find(x => x.id === currentId);
  if (!r) return;
  const memo = document.getElementById('mo-memo').value.trim();
  if (!memo) { alert('확인 의견을 입력해 주세요.'); return; }
  const chks = [
    document.getElementById('mc1').checked,
    document.getElementById('mc2').checked,
    document.getElementById('mc3').checked,
  ];
  const d = new Date();
  const nowStr = `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const newMemo   = { who: PM_NAMES[r.proj], when: nowStr, txt: memo, sig: hasSig };
  const newStatus = chks.every(Boolean) ? '조치완료'
                  : (r.memos.length > 0 || chks.some(Boolean)) ? '검토중' : '미조치';

  try {
    const res = await fetch(`/api/risks/${r.id}/memo`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ memo: newMemo, checks: chks, status: newStatus })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch(e) {
    showToast('⚠️ 저장에 실패했습니다. 다시 시도해 주세요.');
    return;
  }

  r.memos.push(newMemo);
  r.checks = chks;
  r.status  = newStatus;
  document.getElementById('mo-memo').value = '';
  document.getElementById('mo-saved-msg').style.display = 'block';
  setTimeout(() => document.getElementById('mo-saved-msg').style.display='none', 2500);
  clearSig();
  renderMoHist(r);
  refreshCurrentCpScreen();
  showToast('✅ 조치 내역이 저장되었습니다');
}

// ── 서명 ──
function initSig() {
  sigCanvas = document.getElementById('sig-canvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  const W = sigCanvas.parentElement.clientWidth;
  sigCanvas.width  = W * 2; sigCanvas.height = 200;
  sigCanvas.style.width  = W + 'px'; sigCanvas.style.height = '100px';
  sigCtx.scale(2, 2);
  sigCtx.strokeStyle = '#1e293b'; sigCtx.lineWidth = 2;
  sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round';
  hasSig = false;
  document.getElementById('sig-status').textContent = '서명 전';
  document.getElementById('sig-status').style.color = '#94a3b8';
  const gp = e => { const r=sigCanvas.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; };
  const tp = e => { const r=sigCanvas.getBoundingClientRect(),t=e.touches[0]; return { x:t.clientX-r.left, y:t.clientY-r.top }; };
  sigCanvas.onmousedown  = e => { drawing=true; sigCtx.beginPath(); const p=gp(e); sigCtx.moveTo(p.x,p.y); };
  sigCanvas.onmousemove  = e => { if(!drawing)return; const p=gp(e); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); markSig(); };
  sigCanvas.onmouseup    = () => drawing=false;
  sigCanvas.onmouseleave = () => drawing=false;
  sigCanvas.ontouchstart = e => { e.preventDefault(); drawing=true; sigCtx.beginPath(); const p=tp(e); sigCtx.moveTo(p.x,p.y); };
  sigCanvas.ontouchmove  = e => { e.preventDefault(); if(!drawing)return; const p=tp(e); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); markSig(); };
  sigCanvas.ontouchend   = () => drawing=false;
}
function markSig() {
  if (!hasSig) {
    hasSig = true;
    document.getElementById('sig-status').textContent = '✍ 서명 완료';
    document.getElementById('sig-status').style.color = '#3b5bdb';
  }
}
function clearSig() {
  if (sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSig = false;
  document.getElementById('sig-status').textContent = '서명 전';
  document.getElementById('sig-status').style.color = '#94a3b8';
}
