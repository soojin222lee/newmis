// ════════════════════════════════════════
//  사내 프로젝트
// ════════════════════════════════════════

// AI GUIDE: 사내 프로젝트 정보 화면입니다.
// - 사내 프로젝트 목록, 등록, 상세, 승인 처리 목업을 담당합니다.
// - 투자프로젝트 화면과 유사한 구조를 가지며 예산 항목 입력/결재 흐름을 확인할 수 있습니다.
// - AI 화면 가이드는 사내 프로젝트와 투자프로젝트의 차이, 등록 필드, 승인 상태를 중심으로 설명해야 합니다.

let ipView = 'list';
let ipSelectedId = 'IP-001';
let ipBudgetRows = [{ name:'', materials:0, labor:0, outsource:0, expense:0 }];
let ipSearchQuery = '';
let ipStatusFilter = '';

const IP_STATUS_STYLE = {
  '승인':   { bg:'#dcfce7', color:'#166534' },
  '기안중': { bg:'#fef3c7', color:'#b45309' },
  '완료':   { bg:'#dbeafe', color:'#1d4ed8' },
  '반려':   { bg:'#fee2e2', color:'#991b1b' },
};

const INTERNAL_PROJECTS = {
  'IP-001': {
    code:'IV107639', name:'26년 SKAX GCP 사용료',
    status:'승인', version:'V1.0', versionDate:'2026-04-13',
    period:'2026-04-13 ~ 2026-12-31',
    projType:'사내·전사IT운영',
    requestDept:'(전사)IT운영팀', responseDept:'(전사)IT운영팀',
    overview:'2026년도 SKAX GCP(Google Cloud Platform) 사용료 집행을 위한 예산 확보.',
    approval:[
      { role:'기안', type:'기안', name:'차민준(17073)', date:'2026-04-13 09:09', status:'기안' },
      { role:'승인', type:'팀장', name:'연성호(16485)', date:'2026-04-13 09:15', status:'승인' },
    ],
    budget:[
      { name:'26년 SKAX GCP 사용료', subtotal:31983120, materials:0, labor:0, outsource:0, expense:31983120 },
    ],
  },
  'IP-002': {
    code:'IV107512', name:'사무용 소프트웨어 라이선스 갱신',
    status:'승인', version:'V1.0', versionDate:'2026-03-05',
    period:'2026-03-01 ~ 2026-12-31',
    projType:'사내·IT지원',
    requestDept:'IT운영팀', responseDept:'IT운영팀',
    overview:'Adobe, Microsoft Office 등 사무용 소프트웨어 연간 라이선스 갱신 비용 처리.',
    approval:[
      { role:'기안', type:'기안', name:'고민준(18231)', date:'2026-03-05 10:14', status:'기안' },
      { role:'승인', type:'팀장', name:'연성호(16485)', date:'2026-03-05 11:02', status:'승인' },
    ],
    budget:[
      { name:'Adobe Creative Cloud', subtotal:4800000,  materials:0, labor:0, outsource:0, expense:4800000 },
      { name:'MS Office 365',        subtotal:12600000, materials:0, labor:0, outsource:0, expense:12600000 },
    ],
  },
  'IP-003': {
    code:'IV107688', name:'개발서버 노후장비 교체',
    status:'기안중', version:'V1.0', versionDate:'2026-04-22',
    period:'2026-05-01 ~ 2026-08-31',
    projType:'사내·인프라',
    requestDept:'인프라운영팀', responseDept:'인프라운영팀',
    overview:'노후화된 개발서버 3대 교체를 통해 개발 생산성 향상 및 장애 리스크 해소.',
    approval:[
      { role:'기안', type:'기안', name:'도재석(19102)', date:'2026-04-22 14:30', status:'기안' },
      { role:'승인', type:'팀장', name:'전재민(13036)', date:'',                 status:'대기' },
    ],
    budget:[
      { name:'서버 장비 구매 (3대)', subtotal:18000000, materials:18000000, labor:0, outsource:0, expense:0 },
      { name:'설치 및 이전 공사',    subtotal:2500000,  materials:0,        labor:0, outsource:2500000, expense:0 },
    ],
  },
};

// ── 진입점 ──
function renderInternalProject() {
  if (ipView === 'list')          renderIPList();
  else if (ipView === 'register') renderIPRegister();
  else renderIPDetail();
}

// ── 목록 뷰 ──
function renderIPList() {
  const el = document.getElementById('s-internal-project');
  const q  = ipSearchQuery.toLowerCase();

  const filtered = Object.entries(INTERNAL_PROJECTS).filter(([, p]) => {
    const matchQ = !q || [p.name, p.code, p.projType, p.requestDept, p.responseDept, p.overview]
      .some(v => v && v.toLowerCase().includes(q));
    const matchS = !ipStatusFilter || p.status === ipStatusFilter;
    return matchQ && matchS;
  });

  const allStatuses = [...new Set(Object.values(INTERNAL_PROJECTS).map(p => p.status))];
  const statusOpts = ['', ...allStatuses].map(s =>
    `<option value="${s}" ${s===ipStatusFilter?'selected':''}>${s||'전체 상태'}</option>`
  ).join('');

  const rows = filtered.length ? filtered.map(([id, p]) => {
    const st    = IP_STATUS_STYLE[p.status] || IP_STATUS_STYLE['기안중'];
    const total = p.budget.reduce((s, r) => s + r.subtotal, 0);
    const done  = p.approval.filter(a => a.status === '승인' || a.status === '기안').length;
    const pct   = Math.round(done / p.approval.length * 100);
    const barColor = pct === 100 ? '#22c55e' : '#3b82f6';
    return `
      <tr onclick="openIPDetail('${id}')">
        <td class="pt-code">${p.code}</td>
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${p.projType}</div>
        </td>
        <td>${p.requestDept}</td>
        <td>${p.responseDept}</td>
        <td style="font-weight:700;color:#1d4ed8;text-align:right;white-space:nowrap">${fmt(total)}원</td>
        <td style="white-space:nowrap;font-size:12px">${p.period.replace(' ~ ','<br><span style="color:#94a3b8">~ ') + '</span>'}</td>
        <td class="pt-center">
          <span class="ipc-status-badge" style="background:${st.bg};color:${st.color}">${p.status}</span>
        </td>
        <td style="min-width:80px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:#64748b;white-space:nowrap">${done}/${p.approval.length}</span>
          </div>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="8" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">사내 프로젝트</div>
        <div class="page-sub">사내 운영 및 IT 지원 프로젝트 등록·조회</div>
      </div>
      <button class="save-btn" onclick="ipBudgetRows=[{name:'',materials:0,labor:0,outsource:0,expense:0}];ipView='register';renderIPRegister()" style="margin-top:4px;font-size:12px;padding:6px 14px">+ 프로젝트 등록</button>
    </div>

    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="프로젝트명, 유형, 요청부서, 개요 검색…"
          value="${ipSearchQuery}"
          oninput="ipSearchQuery=this.value;renderIPList()">
      </div>
      <select class="proj-filter-select" onchange="ipStatusFilter=this.value;renderIPList()">${statusOpts}</select>
      <span class="proj-count-tag">총 <strong>${filtered.length}</strong>건</span>
    </div>

    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>코드</th>
            <th>프로젝트명 / 유형</th>
            <th>요청부서</th>
            <th>책임부서</th>
            <th class="pt-right">총예산</th>
            <th>기간</th>
            <th class="pt-center">상태</th>
            <th>결재 진행</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── 상세 뷰 ──
function openIPDetail(id) {
  ipSelectedId = id;
  ipView = 'detail';
  renderIPDetail();
}

function closeIPDetail() {
  ipView = 'list';
  renderIPList();
}

function renderIPDetail() {
  const el = document.getElementById('s-internal-project');
  const p = INTERNAL_PROJECTS[ipSelectedId];
  const st = IP_STATUS_STYLE[p.status] || IP_STATUS_STYLE['기안중'];

  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="closeIPDetail()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:2px">${p.code}</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b">${p.name}</div>
      </div>
      <span class="ipc-status-badge" style="background:${st.bg};color:${st.color};font-size:13px;padding:6px 14px">${p.status}</span>
    </div>

    <!-- 버전 바 -->
    <div class="wg-version-bar">
      <span class="wg-version-chip active">${p.version} &nbsp; ${p.versionDate} &nbsp;
        <span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:99px;font-size:11px">${p.status}</span>
      </span>
    </div>

    <!-- 결재정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">결재정보</span></div>
      <div style="padding:16px 20px">${buildIPApproval(p.approval)}</div>
    </div>

    <!-- 기본정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">기본정보</span></div>
      <div class="wg-basic-grid" style="padding:16px 20px">
        ${[['기간',p.period],['프로젝트 유형',p.projType],['요청부서',p.requestDept],['책임부서',p.responseDept]]
          .map(([k,v])=>`<div class="wg-basic-item"><div class="wg-basic-key">${k}</div><div class="wg-basic-val">${v}</div></div>`).join('')}
      </div>
    </div>

    <!-- 프로젝트 개요 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">프로젝트 개요</span></div>
      <div style="padding:16px 20px;font-size:14px;color:#475569;line-height:1.8">${p.overview}</div>
    </div>

    <!-- 총예산액 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span class="card-title">총예산액</span>
        <span class="card-badge">단위: 원</span>
      </div>
      <div style="padding:0 20px 20px;overflow-x:auto">${buildIPBudgetTable(p.budget)}</div>
    </div>

    ${p.status === '기안중' ? `
    <div class="reg-erp-bar">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⏳</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#166534">결재 진행 중</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">승인이 완료되면 ERP IF를 통해 프로젝트가 자동 생성됩니다.</div>
        </div>
      </div>
      <button class="save-btn" onclick="approveIPProject('${ipSelectedId}')">✅ 승인 처리</button>
    </div>` : p.status === '승인' ? `
    <div class="reg-erp-bar reg-erp-done" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">✅</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#1d4ed8">ERP 등록 완료</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">승인 완료 후 ERP IF를 통해 프로젝트가 생성되었습니다.</div>
        </div>
      </div>
    </div>` : ''}`;
}

function buildIPApproval(approval) {
  const statusStyle = {
    '기안': { bg:'#e0f2fe', color:'#0369a1' },
    '승인': { bg:'#dcfce7', color:'#166534' },
    '대기': { bg:'#f1f5f9', color:'#94a3b8' },
  };
  const boxes = approval.map(a => {
    const s = statusStyle[a.status] || statusStyle['대기'];
    return `
      <div class="apv-doc-box">
        <div class="apv-doc-role">${a.role}</div>
        <div class="apv-doc-title" style="font-size:11px;color:#94a3b8;margin-bottom:6px">${a.type}</div>
        <div class="apv-doc-name">${a.name}</div>
        <div class="apv-doc-status" style="background:${s.bg};color:${s.color};margin:6px auto 4px">${a.status}</div>
        <div class="apv-doc-date">${a.date || '—'}</div>
      </div>`;
  }).join('');
  return `<div class="apv-doc-boxes" style="max-width:400px">${boxes}</div>`;
}

function buildIPBudgetTable(budget) {
  const rows = budget.map(r => `
    <tr>
      <td style="font-weight:600;color:#1e293b;padding:12px 14px">${r.name}</td>
      <td class="wg-tbl-num ip-tbl-cur">${fmt(r.subtotal)}</td>
      <td class="wg-tbl-num">${r.materials ? fmt(r.materials) : '—'}</td>
      <td class="wg-tbl-num">${r.labor     ? fmt(r.labor)     : '—'}</td>
      <td class="wg-tbl-num">${r.outsource ? fmt(r.outsource) : '—'}</td>
      <td class="wg-tbl-num">${r.expense   ? fmt(r.expense)   : '—'}</td>
    </tr>`).join('');

  const total = budget.reduce((s,r)=>s+r.subtotal,0);
  const cols = ['materials','labor','outsource','expense'].map(k =>
    budget.reduce((s,r)=>s+r[k],0)
  );

  return `
    <table class="wg-cost-table" style="min-width:600px;margin-top:12px">
      <thead>
        <tr>
          <th class="wg-th-label" style="width:200px">구분</th>
          <th class="wg-th-cur">소계</th>
          <th>재료비</th><th>인건비</th><th>외주비</th><th>경비</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="wg-tbl-total">
          <td class="wg-tbl-label">합계</td>
          <td class="wg-tbl-num ip-tbl-cur">${fmt(total)}</td>
          ${cols.map(c=>`<td class="wg-tbl-num">${c?fmt(c):'—'}</td>`).join('')}
        </tr>
      </tbody>
    </table>`;
}

// ════════════════════════════════════════
//  사내 프로젝트 등록 폼
// ════════════════════════════════════════
function renderIPRegister() {
  const el = document.getElementById('s-internal-project');
  el.innerHTML = `
    <div class="wg-detail-topbar">
      <button class="mc-back-btn" onclick="ipView='list';renderIPList()">← 목록</button>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:800;color:#1e293b">사내 프로젝트 등록</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">결재 상신 후 ERP IF를 통해 프로젝트가 생성됩니다.</div>
      </div>
    </div>

    <!-- 기본정보 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">기본정보</span></div>
      <div class="reg-fields-grid" style="padding:20px">
        <div class="reg-field-group">
          <label class="reg-label">프로젝트명 <span class="reg-required">*</span></label>
          <input class="reg-input" id="ip-reg-name" placeholder="프로젝트명 입력">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">프로젝트 유형 <span class="reg-required">*</span></label>
          <select class="reg-select" id="ip-reg-type">
            <option value="">선택</option>
            <option>사내·전사IT운영</option>
            <option>사내·IT지원</option>
            <option>사내·인프라</option>
            <option>사내·보안</option>
            <option>사내·기타</option>
          </select>
        </div>
        <div class="reg-field-group">
          <label class="reg-label">요청부서 <span class="reg-required">*</span></label>
          <input class="reg-input" id="ip-reg-req" placeholder="요청부서명">
        </div>
        <div class="reg-field-group">
          <label class="reg-label">책임부서</label>
          <input class="reg-input" id="ip-reg-res" placeholder="미입력 시 요청부서와 동일">
        </div>
        <div class="reg-field-group" style="grid-column:1/-1">
          <label class="reg-label">프로젝트 기간 <span class="reg-required">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="date" class="reg-input" id="ip-reg-start" style="flex:1">
            <span style="color:#94a3b8">~</span>
            <input type="date" class="reg-input" id="ip-reg-end" style="flex:1">
          </div>
        </div>
      </div>
    </div>

    <!-- 프로젝트 개요 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="card-title">프로젝트 개요</span></div>
      <div style="padding:16px 20px">
        <textarea class="reg-textarea" id="ip-reg-overview" rows="3" placeholder="프로젝트 목적 및 내용을 간략히 입력하세요."></textarea>
      </div>
    </div>

    <!-- 총예산액 -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-head"><span class="card-title">총예산액</span><span class="card-badge">단위: 원</span></div>
      <div style="padding:16px 20px;overflow-x:auto">
        <table class="wg-cost-table" style="min-width:620px" id="ip-budget-input-table">
          <thead>
            <tr>
              <th class="wg-th-label" style="min-width:160px">항목명 <span class="reg-required">*</span></th>
              <th>재료비</th><th>인건비</th><th>외주비</th><th>경비</th>
              <th class="wg-th-cur">소계</th>
              <th style="width:36px"></th>
            </tr>
          </thead>
          <tbody id="ip-budget-tbody"></tbody>
        </table>
        <button class="reg-budget-add-btn" onclick="addIPBudgetRow()">＋ 항목 추가</button>
      </div>
    </div>

    <div class="reg-footer-bar">
      <button class="reset-btn" onclick="ipView='list';renderIPList()">취소</button>
      <button class="save-btn" onclick="submitIPDraft()">📨 결재 상신</button>
    </div>`;

  renderIPBudgetInputRows();
}

function renderIPBudgetInputRows() {
  const tbody = document.getElementById('ip-budget-tbody');
  if (!tbody) return;
  tbody.innerHTML = ipBudgetRows.map((r, i) => `
    <tr>
      <td style="padding:4px 8px">
        <input class="reg-input reg-input-sm" id="ipb-name-${i}" value="${r.name}" placeholder="항목명" style="min-width:140px">
      </td>
      ${['materials','labor','outsource','expense'].map(k => `
      <td style="padding:4px 8px">
        <input class="reg-input reg-input-sm" id="ipb-${k}-${i}" type="number" min="0" value="${r[k]||''}"
          placeholder="0" oninput="updateIPSubtotal(${i})" style="width:100px;text-align:right">
      </td>`).join('')}
      <td class="wg-tbl-num wg-tbl-cur" id="ipb-sub-${i}" style="min-width:90px">
        ${r.materials||r.labor||r.outsource||r.expense ? fmt(r.materials+r.labor+r.outsource+r.expense) : '—'}
      </td>
      <td style="padding:4px 6px;text-align:center">
        ${ipBudgetRows.length > 1 ? `<button class="reg-del-btn" onclick="removeIPBudgetRow(${i})">✕</button>` : ''}
      </td>
    </tr>`).join('');
}

function updateIPSubtotal(i) {
  const keys = ['materials','labor','outsource','expense'];
  const sum = keys.reduce((s, k) => s + (Number(document.getElementById(`ipb-${k}-${i}`)?.value) || 0), 0);
  const cell = document.getElementById(`ipb-sub-${i}`);
  if (cell) cell.textContent = sum ? fmt(sum) : '—';
  ipBudgetRows[i] = {
    name: document.getElementById(`ipb-name-${i}`)?.value || '',
    ...Object.fromEntries(keys.map(k => [k, Number(document.getElementById(`ipb-${k}-${i}`)?.value) || 0])),
  };
}

function addIPBudgetRow() {
  // 현재 입력값 저장
  ipBudgetRows.forEach((_, i) => {
    ipBudgetRows[i] = {
      name: document.getElementById(`ipb-name-${i}`)?.value || '',
      materials: Number(document.getElementById(`ipb-materials-${i}`)?.value) || 0,
      labor:     Number(document.getElementById(`ipb-labor-${i}`)?.value)     || 0,
      outsource: Number(document.getElementById(`ipb-outsource-${i}`)?.value) || 0,
      expense:   Number(document.getElementById(`ipb-expense-${i}`)?.value)   || 0,
    };
  });
  ipBudgetRows.push({ name:'', materials:0, labor:0, outsource:0, expense:0 });
  renderIPBudgetInputRows();
}

function removeIPBudgetRow(idx) {
  if (ipBudgetRows.length <= 1) return;
  ipBudgetRows.splice(idx, 1);
  renderIPBudgetInputRows();
}

function submitIPDraft() {
  const name  = document.getElementById('ip-reg-name').value.trim();
  const type  = document.getElementById('ip-reg-type').value;
  const req   = document.getElementById('ip-reg-req').value.trim();
  const start = document.getElementById('ip-reg-start').value;
  const end   = document.getElementById('ip-reg-end').value;
  if (!name || !type || !req || !start || !end) {
    showToast('필수 항목(*)을 모두 입력해주세요.'); return;
  }

  // 예산 행 수집
  const budget = ipBudgetRows.map((_, i) => {
    const rowName = document.getElementById(`ipb-name-${i}`)?.value.trim() || `항목${i+1}`;
    const mat = Number(document.getElementById(`ipb-materials-${i}`)?.value) || 0;
    const lab = Number(document.getElementById(`ipb-labor-${i}`)?.value)     || 0;
    const out = Number(document.getElementById(`ipb-outsource-${i}`)?.value) || 0;
    const exp = Number(document.getElementById(`ipb-expense-${i}`)?.value)   || 0;
    return { name:rowName, subtotal:mat+lab+out+exp, materials:mat, labor:lab, outsource:out, expense:exp };
  }).filter(r => r.subtotal > 0 || r.name.trim());

  if (!budget.length) { showToast('총예산액 항목을 1개 이상 입력해주세요.'); return; }

  const res     = document.getElementById('ip-reg-res').value.trim()      || req;
  const overview= document.getElementById('ip-reg-overview').value.trim() || '';
  const idx     = Object.keys(INTERNAL_PROJECTS).length + 1;
  const newId   = `IP-${String(idx).padStart(3,'0')}`;
  const code    = `IV${108000 + idx}`;
  const today   = new Date().toISOString().slice(0,10);
  const now     = today + ' ' + new Date().toTimeString().slice(0,5);

  INTERNAL_PROJECTS[newId] = {
    code, name, status:'기안중', version:'V1.0', versionDate:today,
    period:`${start} ~ ${end}`,
    projType: type,
    requestDept: req, responseDept: res,
    overview,
    approval:[
      { role:'기안', type:'기안', name:'이봄(PM)', date:now, status:'기안' },
      { role:'승인', type:'팀장', name:'(팀장)',   date:'',  status:'대기' },
    ],
    budget,
  };

  ipSelectedId = newId;
  ipView = 'detail';
  renderIPDetail();
  showToast('결재가 상신되었습니다. 승인 완료 후 ERP에 등록됩니다.');
}

function approveIPProject(id) {
  const p = INTERNAL_PROJECTS[id];
  if (!p) return;
  const now = new Date().toISOString().slice(0,10) + ' ' + new Date().toTimeString().slice(0,5);
  p.status = '승인';
  p.approval.forEach(a => { if (a.status === '대기') { a.status = '승인'; a.date = now; } });
  renderIPDetail();
  showToast('✅ 승인 완료 · ERP IF를 통해 프로젝트가 등록되었습니다.');
}
