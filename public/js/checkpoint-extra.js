// ════════════════════════════════════════
//  프로젝트 체크포인트 — 브리핑 / 대응현황 / 조치이력
//  + 단계 보고 이력 조회
// ════════════════════════════════════════

const CP_PROJ_COLOR = { cloud:'#1d4ed8', erp:'#0f766e', mobile:'#d97706', sec:'#dc2626' };

// ── 브리핑 선택 상태 ──
let cpBriefingSelected = new Set();

// ── 대응 현황 필터 ──
let cpStatusProj = 'all';

// ── 조치 이력 필터 ──
let cpHistProj   = 'all';
let cpHistLevel  = 'all';
let cpHistStatus = 'all';
let cpHistQuery  = '';

// ── 브리핑 mock 이력 ──
const mockBriefings = [
  { id:'b1', date:'25.05.01 09:30', recipients:'팀장 · 본부장', proj:'cloud',
    items:['외주비 초과 위험', '인력 공백 발생 가능성', '납기 지연 위험'] },
  { id:'b2', date:'25.04.15 14:00', recipients:'PM · 팀장',    proj:'sec',
    items:['보안 취약점 대응 필요', '예산 소진율 급증'] },
  { id:'b3', date:'25.04.01 10:00', recipients:'본부장',        proj:'erp',
    items:['ERP 개발 일정 지연'] },
];

// ════════════════════════════════════════
//  1. 체크포인트 브리핑
// ════════════════════════════════════════
function renderCpBriefing() {
  const ls  = l => LEVEL_STYLE[l] || { bg:'#f1f5f9', color:'#64748b' };
  const scS = s => s === '미조치' ? { bg:'#fee2e2', color:'#991b1b' }
                 : s === '검토중'  ? { bg:'#fef3c7', color:'#92400e' }
                 :                   { bg:'#dcfce7', color:'#166534' };

  const cpRows = risks.map(r => {
    const pc  = CP_PROJ_COLOR[r.proj] || '#94a3b8';
    const sel = cpBriefingSelected.has(r.id);
    const lv  = ls(r.level);
    const sc  = scS(r.status);
    return `
      <tr class="${sel ? 'cp-brief-row-sel' : ''}" onclick="cpToggleSelect('${r.id}')">
        <td style="width:40px;text-align:center">
          <input type="checkbox" ${sel ? 'checked' : ''}
            onclick="event.stopPropagation();cpToggleSelect('${r.id}')">
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="cp-dot" style="background:${pc}"></span>
            <span style="font-size:15px;font-weight:700;color:${pc}">${PROJ_NAMES[r.proj]||''}</span>
          </div>
        </td>
        <td>
          <div class="cell-name">${r.title}</div>
          <div class="cell-sub">${r.sub}</div>
        </td>
        <td><span class="badge" style="background:${lv.bg};color:${lv.color}">${r.level}</span></td>
        <td><span class="badge" style="background:${sc.bg};color:${sc.color}">${r.status}</span></td>
      </tr>`;
  }).join('');

  const selCount = cpBriefingSelected.size;

  const briefCards = mockBriefings.map(b => {
    const pc = CP_PROJ_COLOR[b.proj] || '#94a3b8';
    return `
      <div class="cp-brief-card">
        <div class="cp-brief-card-head">
          <span class="cp-brief-date">📅 ${b.date}</span>
          <span class="cp-brief-rcpt">👤 ${b.recipients}</span>
        </div>
        <div class="cp-brief-items">
          ${b.items.map(i => `<div class="cp-brief-item">
            <span class="cp-dot" style="background:${pc}"></span>${i}
          </div>`).join('')}
        </div>
        <div class="cp-brief-card-foot">
          <span class="cp-brief-cnt">${b.items.length}건 선별</span>
          <span class="cp-brief-done">✅ 공유완료</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('s-cp-briefing').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">체크포인트 브리핑</div>
        <div class="page-sub">PM이 중요 항목 선별 후 직책자 공유</div>
      </div>
    </div>

    <div class="cp-brief-layout">
      <!-- 선별 테이블 -->
      <div class="card cp-brief-main">
        <div class="card-head">
          <span class="card-title">체크포인트 선별</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="card-badge">${selCount > 0 ? selCount + '건 선택됨' : '브리핑할 항목을 선택하세요'}</span>
            ${selCount > 0
              ? `<button class="cp-send-btn" onclick="cpSendBriefing()">📤 브리핑 공유</button>`
              : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px"></th>
              <th style="width:160px">프로젝트</th>
              <th>체크포인트 항목</th>
              <th style="width:70px">등급</th>
              <th style="width:80px">상태</th>
            </tr>
          </thead>
          <tbody>${cpRows}</tbody>
        </table>
      </div>

      <!-- 브리핑 이력 -->
      <div class="cp-brief-side">
        <div class="card">
          <div class="card-head">
            <span class="card-title">브리핑 이력</span>
            <span class="card-badge">${mockBriefings.length}건</span>
          </div>
          <div class="cp-brief-hist">${briefCards}</div>
        </div>
      </div>
    </div>`;
}

function cpToggleSelect(id) {
  if (cpBriefingSelected.has(id)) cpBriefingSelected.delete(id);
  else cpBriefingSelected.add(id);
  renderCpBriefing();
}

function cpSendBriefing() {
  const count = cpBriefingSelected.size;
  const sel   = [...cpBriefingSelected];
  const items = sel.map(id => {
    const r = risks.find(x => x.id === id);
    return r ? r.title : '';
  }).filter(Boolean);
  mockBriefings.unshift({
    id: 'b' + Date.now(),
    date: (() => {
      const d = new Date();
      return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    })(),
    recipients: 'PM · 팀장',
    proj: (() => { const r = risks.find(x => x.id === sel[0]); return r ? r.proj : 'cloud'; })(),
    items,
  });
  cpBriefingSelected.clear();
  renderCpBriefing();
  showToast(`📤 ${count}건의 브리핑이 공유되었습니다`);
}

// ════════════════════════════════════════
//  2. 체크포인트 대응 현황
// ════════════════════════════════════════
function renderCpStatus() {
  const filtered = cpStatusProj === 'all'
    ? risks
    : risks.filter(r => r.proj === cpStatusProj);

  const groups = {
    '미조치':   filtered.filter(r => r.status === '미조치'),
    '검토중':   filtered.filter(r => r.status === '검토중'),
    '조치완료': filtered.filter(r => r.status === '조치완료'),
  };

  const COLS = [
    { key:'미조치',   icon:'🔴', color:'#dc2626', bg:'#fee2e2' },
    { key:'검토중',   icon:'🟡', color:'#d97706', bg:'#fef3c7' },
    { key:'조치완료', icon:'🟢', color:'#16a34a', bg:'#dcfce7' },
  ];

  function renderCard(r) {
    const pc  = CP_PROJ_COLOR[r.proj] || '#94a3b8';
    const lv  = LEVEL_STYLE[r.level] || { bg:'#f1f5f9', color:'#64748b' };
    const last = r.memos.length ? r.memos[r.memos.length - 1] : null;
    return `
      <div class="cp-status-card" onclick="openMo('${r.id}')">
        <div class="cp-status-card-head">
          <span class="cp-dot" style="background:${pc}"></span>
          <span class="cp-status-proj" style="color:${pc}">${PROJ_NAMES[r.proj]||''}</span>
          <span class="badge" style="background:${lv.bg};color:${lv.color};margin-left:auto">${r.level}</span>
        </div>
        <div class="cp-status-title">${r.title}</div>
        <div class="cp-status-sub">${r.sub}</div>
        ${last ? `<div class="cp-status-last">최종: ${last.who} · ${last.when.slice(0,5)}</div>` : ''}
      </div>`;
  }

  const columns = COLS.map(col => {
    const items = groups[col.key] || [];
    const cards = items.map(renderCard).join('')
      || `<div class="cp-status-empty">항목 없음</div>`;
    return `
      <div class="cp-status-col" style="border-top:3px solid ${col.color}">
        <div class="cp-status-col-head">
          <span>${col.icon} ${col.key}</span>
          <span class="cp-status-cnt" style="background:${col.bg};color:${col.color}">${items.length}</span>
        </div>
        <div class="cp-status-col-body">${cards}</div>
      </div>`;
  }).join('');

  const pills = [
    { key:'all',    name:'전체',   color:'#475569' },
    { key:'cloud',  name:'클라우드 인프라 고도화', color: CP_PROJ_COLOR.cloud  },
    { key:'erp',    name:'ERP 고도화',             color: CP_PROJ_COLOR.erp    },
    { key:'mobile', name:'모바일 앱 리뉴얼',       color: CP_PROJ_COLOR.mobile },
    { key:'sec',    name:'보안 시스템 구축',        color: CP_PROJ_COLOR.sec    },
  ].map(p => {
    const active = cpStatusProj === p.key;
    const style  = active
      ? `background:${p.color};color:#fff;border-color:${p.color}`
      : `color:${p.color};border-color:${p.color}`;
    return `<button class="ric-proj-pill${active?' active':''}" style="${style}"
      onclick="cpStatusProj='${p.key}';renderCpStatus()">${p.name}</button>`;
  }).join('');

  const total   = filtered.length;
  const pending = groups['미조치'].length;
  const review  = groups['검토중'].length;
  const done    = groups['조치완료'].length;

  document.getElementById('s-cp-status').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">체크포인트 대응 현황</div>
        <div class="page-sub">현재 대응 진행 상태</div>
      </div>
    </div>

    <div class="kpi-row kpi-4" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-label">전체</div><div class="kpi-value">${total}건</div></div>
      <div class="kpi-card"><div class="kpi-label">미조치</div><div class="kpi-value" style="color:#dc2626">${pending}건</div></div>
      <div class="kpi-card"><div class="kpi-label">검토 중</div><div class="kpi-value" style="color:#d97706">${review}건</div></div>
      <div class="kpi-card"><div class="kpi-label">조치 완료</div><div class="kpi-value" style="color:#16a34a">${done}건</div></div>
    </div>

    <div class="ric-pills-wrap" style="margin-bottom:16px">${pills}</div>

    <div class="cp-status-board">${columns}</div>`;
}

// ════════════════════════════════════════
//  3. 체크포인트 조치 이력
// ════════════════════════════════════════
function renderCpHistory() {
  const q = cpHistQuery.trim().toLowerCase();
  const filtered = risks.filter(r => {
    if (cpHistProj   !== 'all' && r.proj   !== cpHistProj)   return false;
    if (cpHistLevel  !== 'all' && r.level  !== cpHistLevel)  return false;
    if (cpHistStatus !== 'all' && r.status !== cpHistStatus) return false;
    if (q && !r.title.toLowerCase().includes(q) && !r.sub.toLowerCase().includes(q)) return false;
    return true;
  });

  const sc = s => s === '조치완료' ? 'badge-done' : s === '검토중' ? 'badge-review' : 'badge-pending';
  const lv = l => LEVEL_STYLE[l] || { bg:'#f1f5f9', color:'#64748b' };

  const rows = filtered.length === 0
    ? `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">📭</span>해당하는 이력이 없습니다.</div></td></tr>`
    : filtered.map(r => {
        const last = r.memos.length ? r.memos[r.memos.length - 1] : null;
        const pc   = CP_PROJ_COLOR[r.proj] || '#94a3b8';
        const lvS  = lv(r.level);
        return `
          <tr onclick="openMo('${r.id}')">
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="cp-dot" style="background:${pc}"></span>
                <div>
                  <div class="cell-name">${PROJ_NAMES[r.proj]||''}</div>
                  <div class="cell-pm">PM ${PM_NAMES[r.proj]||''}</div>
                </div>
              </div>
            </td>
            <td><div class="cell-name">${r.title}</div><div class="cell-sub">${r.sub}</div></td>
            <td><span class="badge" style="background:${lvS.bg};color:${lvS.color}">${r.level}</span></td>
            <td><span class="badge ${sc(r.status)}">${r.status}</span></td>
            <td style="font-size:16px">${last ? last.who : '—'}</td>
            <td style="font-size:16px;color:#64748b">${last ? last.when.slice(0,5) : '—'}</td>
            <td style="font-size:14px;color:#94a3b8;text-align:center">${r.memos.length}건</td>
          </tr>`;
      }).join('');

  const hasFilter = cpHistProj !== 'all' || cpHistLevel !== 'all' || cpHistStatus !== 'all' || cpHistQuery;

  const total   = risks.length;
  const done    = risks.filter(r => r.status === '조치완료').length;
  const review  = risks.filter(r => r.status === '검토중').length;
  const pending = risks.filter(r => r.status === '미조치').length;

  document.getElementById('s-cp-history').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">체크포인트 조치 이력</div>
        <div class="page-sub">최종 처리 및 이력 관리</div>
      </div>
    </div>

    <div class="kpi-row kpi-4" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-label">전체</div><div class="kpi-value">${total}건</div></div>
      <div class="kpi-card"><div class="kpi-label">조치 완료</div><div class="kpi-value" style="color:#166534">${done}건</div></div>
      <div class="kpi-card"><div class="kpi-label">검토 중</div><div class="kpi-value" style="color:#92400e">${review}건</div></div>
      <div class="kpi-card"><div class="kpi-label">미조치</div><div class="kpi-value" style="color:#991b1b">${pending}건</div></div>
    </div>

    <div class="filter-bar" style="margin-bottom:16px">
      <input class="ric-search" type="text" placeholder="🔍  체크포인트 항목 검색"
        value="${cpHistQuery}"
        oninput="cpHistQuery=this.value;renderCpHistory()" style="flex:1;min-width:200px">
      <select class="ric-select" onchange="cpHistProj=this.value;renderCpHistory()">
        <option value="all"   ${cpHistProj==='all'?'selected':''}>프로젝트 전체</option>
        <option value="cloud" ${cpHistProj==='cloud'?'selected':''}>클라우드 인프라 고도화</option>
        <option value="erp"   ${cpHistProj==='erp'?'selected':''}>ERP 고도화</option>
        <option value="mobile"${cpHistProj==='mobile'?'selected':''}>모바일 앱 리뉴얼</option>
        <option value="sec"   ${cpHistProj==='sec'?'selected':''}>보안 시스템 구축</option>
      </select>
      <select class="ric-select" onchange="cpHistLevel=this.value;renderCpHistory()">
        <option value="all" ${cpHistLevel==='all'?'selected':''}>등급 전체</option>
        <option value="높음" ${cpHistLevel==='높음'?'selected':''}>높음</option>
        <option value="주의" ${cpHistLevel==='주의'?'selected':''}>주의</option>
        <option value="중간" ${cpHistLevel==='중간'?'selected':''}>중간</option>
        <option value="낮음" ${cpHistLevel==='낮음'?'selected':''}>낮음</option>
      </select>
      <select class="ric-select" onchange="cpHistStatus=this.value;renderCpHistory()">
        <option value="all"    ${cpHistStatus==='all'?'selected':''}>상태 전체</option>
        <option value="조치완료"${cpHistStatus==='조치완료'?'selected':''}>조치완료</option>
        <option value="검토중"  ${cpHistStatus==='검토중'?'selected':''}>검토중</option>
        <option value="미조치"  ${cpHistStatus==='미조치'?'selected':''}>미조치</option>
      </select>
      ${hasFilter
        ? `<button class="ric-reset-btn"
            onclick="cpHistProj='all';cpHistLevel='all';cpHistStatus='all';cpHistQuery='';renderCpHistory()">초기화</button>`
        : ''}
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">조치 이력 목록</span>
        <span class="card-badge">총 ${filtered.length}건</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:190px">프로젝트</th>
            <th>체크포인트 항목</th>
            <th style="width:70px">등급</th>
            <th style="width:80px">상태</th>
            <th style="width:110px">최종 확인자</th>
            <th style="width:90px">최종 조치일</th>
            <th style="width:60px;text-align:center">이력</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ════════════════════════════════════════
//  보고 이력 조회
// ════════════════════════════════════════
const PHASE_HISTORY = [
  { proj:'cloud',  type:'착수보고', title:'클라우드 인프라 고도화 착수보고', date:'25.01.08', status:'승인완료', approver:'본부장 이현우' },
  { proj:'erp',    type:'착수보고', title:'ERP 고도화 착수보고',             date:'25.01.15', status:'승인완료', approver:'본부장 이현우' },
  { proj:'mobile', type:'착수보고', title:'모바일 앱 리뉴얼 착수보고',       date:'25.02.03', status:'승인완료', approver:'팀장 강민석' },
  { proj:'sec',    type:'착수보고', title:'보안 시스템 구축 착수보고',        date:'25.02.10', status:'승인완료', approver:'본부장 이현우' },
  { proj:'cloud',  type:'중간보고', title:'클라우드 인프라 고도화 중간보고',  date:'25.03.20', status:'승인완료', approver:'본부장 이현우' },
  { proj:'erp',    type:'중간보고', title:'ERP 고도화 중간보고',              date:'25.03.28', status:'검토중',  approver:'팀장 강민석' },
  { proj:'mobile', type:'중간보고', title:'모바일 앱 리뉴얼 중간보고',        date:'25.04.10', status:'승인완료', approver:'팀장 강민석' },
  { proj:'sec',    type:'종료보고', title:'보안 시스템 구축 종료보고',         date:'25.04.25', status:'검토중',  approver:'—' },
];

let phHistProj = 'all';
let phHistType = 'all';
let phHistQuery = '';

function renderPhaseHistory() {
  const q = phHistQuery.trim().toLowerCase();
  const filtered = PHASE_HISTORY.filter(h => {
    if (phHistProj !== 'all' && h.proj !== phHistProj) return false;
    if (phHistType !== 'all' && h.type !== phHistType) return false;
    if (q && !h.title.toLowerCase().includes(q) && !(PROJ_NAMES[h.proj]||'').toLowerCase().includes(q)) return false;
    return true;
  });

  const TYPE_STYLE = {
    '착수보고': { bg:'#ede9fe', color:'#5b21b6' },
    '중간보고': { bg:'#dbeafe', color:'#1e40af' },
    '종료보고': { bg:'#dcfce7', color:'#166534' },
  };
  const STATUS_STYLE = {
    '승인완료': { bg:'#dcfce7', color:'#166534' },
    '검토중':   { bg:'#fef3c7', color:'#92400e' },
    '반려':     { bg:'#fee2e2', color:'#991b1b' },
  };

  const rows = filtered.length === 0
    ? `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">📭</span>해당하는 이력이 없습니다.</div></td></tr>`
    : filtered.map(h => {
        const pc  = CP_PROJ_COLOR[h.proj] || '#94a3b8';
        const ts  = TYPE_STYLE[h.type]   || { bg:'#f1f5f9', color:'#64748b' };
        const ss  = STATUS_STYLE[h.status] || { bg:'#f1f5f9', color:'#64748b' };
        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="cp-dot" style="background:${pc}"></span>
                <div>
                  <div class="cell-name">${PROJ_NAMES[h.proj]||''}</div>
                  <div class="cell-pm">PM ${PM_NAMES[h.proj]||''}</div>
                </div>
              </div>
            </td>
            <td><span class="badge" style="background:${ts.bg};color:${ts.color}">${h.type}</span></td>
            <td><div class="cell-name">${h.title}</div></td>
            <td style="font-size:16px;color:#64748b">${h.date}</td>
            <td><span class="badge" style="background:${ss.bg};color:${ss.color}">${h.status}</span></td>
            <td style="font-size:15px;color:#475569">${h.approver}</td>
          </tr>`;
      }).join('');

  const total    = PHASE_HISTORY.length;
  const approved = PHASE_HISTORY.filter(h => h.status === '승인완료').length;
  const inReview = PHASE_HISTORY.filter(h => h.status === '검토중').length;
  const hasFilter = phHistProj !== 'all' || phHistType !== 'all' || phHistQuery;

  document.getElementById('s-phase-history').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">보고 이력 조회</div>
        <div class="page-sub">착수 · 중간 · 종료 보고 제출 및 승인 이력</div>
      </div>
    </div>

    <div class="kpi-row kpi-3" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-label">전체 보고</div><div class="kpi-value">${total}건</div></div>
      <div class="kpi-card"><div class="kpi-label">승인 완료</div><div class="kpi-value" style="color:#166534">${approved}건</div></div>
      <div class="kpi-card"><div class="kpi-label">검토 중</div><div class="kpi-value" style="color:#92400e">${inReview}건</div></div>
    </div>

    <div class="filter-bar" style="margin-bottom:16px">
      <input class="ric-search" type="text" placeholder="🔍  보고명 또는 프로젝트 검색"
        value="${phHistQuery}"
        oninput="phHistQuery=this.value;renderPhaseHistory()" style="flex:1;min-width:200px">
      <select class="ric-select" onchange="phHistProj=this.value;renderPhaseHistory()">
        <option value="all"   ${phHistProj==='all'?'selected':''}>프로젝트 전체</option>
        <option value="cloud" ${phHistProj==='cloud'?'selected':''}>클라우드 인프라 고도화</option>
        <option value="erp"   ${phHistProj==='erp'?'selected':''}>ERP 고도화</option>
        <option value="mobile"${phHistProj==='mobile'?'selected':''}>모바일 앱 리뉴얼</option>
        <option value="sec"   ${phHistProj==='sec'?'selected':''}>보안 시스템 구축</option>
      </select>
      <select class="ric-select" onchange="phHistType=this.value;renderPhaseHistory()">
        <option value="all"   ${phHistType==='all'?'selected':''}>보고 유형 전체</option>
        <option value="착수보고"${phHistType==='착수보고'?'selected':''}>착수 보고</option>
        <option value="중간보고"${phHistType==='중간보고'?'selected':''}>중간 보고</option>
        <option value="종료보고"${phHistType==='종료보고'?'selected':''}>종료 보고</option>
      </select>
      ${hasFilter
        ? `<button class="ric-reset-btn"
            onclick="phHistProj='all';phHistType='all';phHistQuery='';renderPhaseHistory()">초기화</button>`
        : ''}
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">보고 이력 목록</span>
        <span class="card-badge">총 ${filtered.length}건</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:190px">프로젝트</th>
            <th style="width:90px">보고 유형</th>
            <th>보고명</th>
            <th style="width:90px">제출일</th>
            <th style="width:90px">상태</th>
            <th style="width:130px">승인자</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
