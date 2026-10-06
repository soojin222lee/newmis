// AI GUIDE: 제안 프로젝트 — 수주형 프로젝트에 딸린 제안(P00N 채번) 프로젝트입니다.
// - 코드: 수주형 base + -P00N (예: 30142101-P001), 프로젝트 유형 = 제안프로젝트
// - 자동 등록 / 예산 수립 동작은 수주형과 동일하므로, 상세는 수주형 IF 대시보드(siDetailHtml)를 그대로 재사용합니다.
// - 반드시 si-project.js 뒤에 로드되어야 합니다(siDetailHtml · siActiveProject · siBuildDetail 등 공용 함수 참조).

let ppView = 'list';       // 'list' | 'detail'
let ppSelectedId = null;
let ppSearchQuery = '';

const PROPOSAL_PROJECTS = {
  'PP-001': {
    code:'30142101-P001', name:'클라우드 인프라 전환 확장 제안',
    parent:'30142101-D001', parentName:'2026년 클라우드 인프라 전환',
    start:'2026-08-01', end:'2026-10-31', pm:'한민석', revOrg:'NOVA PMO팀',
    projType:'제안프로젝트', stage:'수행중', contractType:'제안', mainDept:'NOVA PMO팀',
    customer:'SK C&C', ifSource:'ERP', lastSync:'2026-08-18 09:30',
    ifDetail:{
      asOf:'2026-08-19 09:40',
      sync:[
        { sys:'ERP', when:'2026-08-18 09:30', cnt:1, flag:'ok' },
        { sys:'SCM', when:'2026-08-17 14:12', cnt:1, flag:'ok' },
        { sys:'CRM', when:'2026-08-16 09:00', cnt:1, flag:'ok' },
        { sys:'PUR', when:'2026-08-15 06:00', cnt:1, flag:'지연 4일' },
      ],
      basic:[
        { k:'제안 예상금액', v:'320,000,000 원', sys:'ERP', changed:'1일 전 변경', num:true },
        { k:'투입 인원', v:'6 명', sys:'SCM', changed:'2일 전 변경', num:true },
        { k:'제안 기간', v:'2026-08-01 ~ 2026-10-31', sys:'ERP', num:true },
        { k:'수행 PM', v:'한민석', sys:'SCM' },
        { k:'매출귀속조직', v:'NOVA PMO팀', sys:'ERP' },
        { k:'프로젝트 유형', v:'제안프로젝트', sys:'ERP' },
        { k:'고객 담당자', v:'박서준', sys:'CRM' },
        { k:'외주 발주금액', v:'80,000,000 원', sys:'PUR', changed:'4일 전 변경', num:true },
        { k:'주수행부서', v:'NOVA PMO팀', sys:'ETC' },
        { k:'계약형태', v:'제안', sys:'ERP' },
      ],
      log:[
        { date:'2026-08-18', rel:'어제', time:'09:30', sys:'ERP', field:'제안 예상금액', before:'300,000,000', after:'320,000,000', delta:'+20,000,000', num:true },
        { date:'2026-08-17', rel:'2일 전', time:'14:12', sys:'SCM', field:'투입 인원', before:'4 명', after:'6 명', delta:'+2명', num:true },
        { date:'2026-08-16', rel:'3일 전', time:'09:00', sys:'CRM', field:'고객 담당자', before:'미등록', after:'박서준' },
        { date:'2026-08-15', rel:'4일 전', time:'06:00', sys:'PUR', field:'외주 발주금액', before:'미등록', after:'80,000,000', num:true, note:'이후 수신 없음 — 구매 IF 4일 지연' },
        { date:'2026-07-28', rel:'3주 전', time:'10:00', sys:'ERP', field:'프로젝트 유형', before:'미등록', after:'제안프로젝트' },
      ],
    },
  },
  'PP-002': {
    code:'30142101-P002', name:'클라우드 통합 관제 제안',
    parent:'30142101-D001', parentName:'2026년 클라우드 인프라 전환',
    start:'2026-09-01', end:'2026-11-30', pm:'한민석', revOrg:'NOVA PMO팀',
    projType:'제안프로젝트', stage:'등록완료', contractType:'제안', mainDept:'NOVA PMO팀',
    customer:'SK C&C', ifSource:'ERP', lastSync:'2026-08-14 08:10',
    ifHistory:[
      { date:'2026-08-14 08:10', field:'프로젝트 유형', before:'—', after:'제안프로젝트', source:'ERP' },
      { date:'2026-08-14 08:10', field:'수행 PM',       before:'—', after:'한민석',       source:'SCM' },
    ],
  },
  'PP-003': {
    code:'30142102-P001', name:'ERP 운영 고도화 제안',
    parent:'30142102-D001', parentName:'2026년 ERP 유지보수 운영',
    start:'2026-08-20', end:'2026-12-15', pm:'이강혁', revOrg:'AX ERP사업부',
    projType:'제안프로젝트', stage:'착수', contractType:'제안', mainDept:'시스템팀',
    customer:'SK하이닉스', ifSource:'ERP', lastSync:'2026-08-12 09:00',
    ifHistory:[
      { date:'2026-08-12 09:00', field:'프로젝트 상태', before:'등록완료', after:'착수',          source:'ERP' },
      { date:'2026-08-10 17:30', field:'수행 PM',       before:'—',        after:'이강혁',         source:'SCM' },
      { date:'2026-08-08 09:00', field:'프로젝트코드',  before:'—',        after:'30142102-P001',  source:'ERP' },
    ],
  },
};

function renderProposalProject() {
  if (ppView === 'detail') renderProposalDetail();
  else if (ppView === 'register') renderProposalRegister();
  else renderProposalList();
}

// ── C/U/D 액션 (일반 SI 방식 — 사용자가 직접 신규/수정/삭제) ──
let ppEditId = null;   // null=신규, 값=수정 대상
function ppStartRegister() { ppEditId = null; ppView = 'register'; renderProposalProject(); }
function ppEditRow(id, ev) { if (ev) ev.stopPropagation(); ppEditId = id; ppView = 'register'; renderProposalProject(); }
function ppDeleteRow(id, ev) {
  if (ev) ev.stopPropagation();
  const p = PROPOSAL_PROJECTS[id]; if (!p) return;
  if (!confirm(`제안 프로젝트 "${p.name}"을(를) 삭제하시겠습니까?`)) return;
  delete PROPOSAL_PROJECTS[id];
  if (typeof showToast === 'function') showToast('제안 프로젝트를 삭제했습니다.');
  renderProposalProject();
}
function ppCancelRegister() { ppView = 'list'; ppEditId = null; renderProposalProject(); }
function ppSaveRegister() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const code = g('pp-f-code').trim(), name = g('pp-f-name').trim();
  if (!name) { if (typeof showToast === 'function') showToast('제안명을 입력하세요.'); return; }
  const data = {
    code: code || ('신규-' + Date.now()), name,
    parent: g('pp-f-parent'), parentName: g('pp-f-parentName'),
    start: g('pp-f-start'), end: g('pp-f-end'), pm: g('pp-f-pm'), revOrg: g('pp-f-revOrg'),
    customer: g('pp-f-customer'), projType: '제안프로젝트', contractType: '제안',
    stage: g('pp-f-stage') || '등록완료', mainDept: g('pp-f-revOrg'), ifSource: 'ERP', lastSync: '방금',
  };
  if (ppEditId && PROPOSAL_PROJECTS[ppEditId]) {
    PROPOSAL_PROJECTS[ppEditId] = Object.assign({}, PROPOSAL_PROJECTS[ppEditId], data);
    if (typeof showToast === 'function') showToast('제안 프로젝트를 수정했습니다.');
  } else {
    PROPOSAL_PROJECTS['PP-' + Date.now()] = data;
    if (typeof showToast === 'function') showToast('제안 프로젝트를 신규 등록했습니다.');
  }
  ppView = 'list'; ppEditId = null; renderProposalProject();
}

function renderProposalList() {
  const el = document.getElementById('s-proposal-project');
  if (!el) return;
  const q = ppSearchQuery.toLowerCase();
  const filtered = Object.entries(PROPOSAL_PROJECTS).filter(([, p]) =>
    !q || [p.name, p.code, p.pm, p.revOrg, p.customer, p.parent, p.parentName].some(v => v && v.toLowerCase().includes(q)));

  const styleOf = st => (typeof SI_STATUS_STYLE !== 'undefined' && SI_STATUS_STYLE[st]) || { bg:'#f1f5f9', color:'#475569' };
  const rows = filtered.length ? filtered.map(([id, p]) => {
    const st = styleOf(p.stage);
    return `
      <tr onclick="openProposalDetail('${id}')">
        <td class="pt-code">${p.code}</td>
        <td>
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">원 수주 ${p.parent} · ${p.parentName}</div>
        </td>
        <td>${p.pm}</td>
        <td>${p.revOrg}</td>
        <td style="white-space:nowrap;font-size:14px">${p.start}<br><span style="color:#94a3b8">~ ${p.end}</span></td>
        <td class="pt-center"><span class="ipc-status-badge" style="background:${st.bg};color:${st.color}">${p.stage}</span></td>
        <td style="font-size:13px;color:#94a3b8;white-space:nowrap">🔄 ${p.lastSync}</td>
        <td class="pt-center" style="white-space:nowrap">
          <button class="row-act-btn" onclick="ppEditRow('${id}', event)" title="수정">✏️ 수정</button>
          <button class="row-act-btn del" onclick="ppDeleteRow('${id}', event)" title="삭제">🗑 삭제</button>
        </td>
      </tr>`;
  }).join('') : `<tr><td colspan="8" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">제안 프로젝트</div>
        <div class="page-sub">수주형 프로젝트에 딸린 제안(P00N 채번) · 자동 등록·예산 수립은 수주형과 동일</div>
      </div>
      <button class="save-btn" onclick="ppStartRegister()" style="font-size:14px;padding:8px 16px">＋ 신규 등록</button>
    </div>

    <div class="proj-list-toolbar">
      <div class="proj-search-wrap">
        <span class="proj-search-icon">🔍</span>
        <input class="proj-search-input" placeholder="제안명, 코드, PM, 원 수주 프로젝트 검색…"
          value="${ppSearchQuery}" oninput="ppSearchQuery=this.value;renderProposalList()">
      </div>
      <span class="proj-count-tag">총 <strong>${filtered.length}</strong>건</span>
    </div>

    <div class="proj-table-card">
      <table class="proj-table">
        <thead>
          <tr>
            <th>제안코드</th>
            <th>제안명 / 원 수주 프로젝트</th>
            <th>수행 PM</th>
            <th>매출귀속조직</th>
            <th>기간</th>
            <th class="pt-center">단계</th>
            <th>마지막 IF</th>
            <th class="pt-center">관리</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openProposalDetail(id) { ppSelectedId = id; ppView = 'detail'; renderProposalProject(); }
function closeProposalDetail() { ppView = 'list'; ppSelectedId = null; renderProposalProject(); }

function renderProposalDetail() {
  const el = document.getElementById('s-proposal-project');
  const p = PROPOSAL_PROJECTS[ppSelectedId];
  if (!el || !p) return;
  siActiveProject = p; // 동기화 팝업이 이 프로젝트를 보도록 지정
  const extraMeta = `<span class="sifr-sep">|</span><span>원 수주 <b style="color:#0B6E55">${p.parent}</b></span>`;
  el.innerHTML = siDetailHtml(p, "closeProposalDetail()", extraMeta);
}

// ── 신규/수정 입력 폼 (저장=U/C · 취소) ──
function renderProposalRegister() {
  ppInjectCrudStyle();
  const el = document.getElementById('s-proposal-project');
  if (!el) return;
  const edit = ppEditId ? PROPOSAL_PROJECTS[ppEditId] : null;
  const v = (k, d) => (edit && edit[k] != null ? edit[k] : (d || ''));
  const field = (id, label, val, ph) =>
    `<label class="pp-f"><span>${label}</span><input id="${id}" value="${String(val).replace(/"/g, '&quot;')}" placeholder="${ph || ''}"></label>`;
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">${edit ? '제안 프로젝트 수정' : '제안 프로젝트 신규 등록'}</div>
        <div class="page-sub">제안(P00N) 프로젝트 정보를 입력하고 저장합니다.</div>
      </div>
    </div>
    <div class="proj-table-card" style="padding:18px;max-width:760px">
      <div class="pp-form-grid">
        ${field('pp-f-code', '제안코드', v('code'), '30142101-P001')}
        ${field('pp-f-name', '제안명 *', v('name'), '클라우드 … 제안')}
        ${field('pp-f-parent', '원 수주 코드', v('parent'), '30142101-D001')}
        ${field('pp-f-parentName', '원 수주명', v('parentName'))}
        ${field('pp-f-pm', '수행 PM', v('pm'))}
        ${field('pp-f-revOrg', '매출귀속조직', v('revOrg'))}
        ${field('pp-f-customer', '고객사', v('customer'))}
        ${field('pp-f-stage', '단계', v('stage', '등록완료'))}
        ${field('pp-f-start', '시작일', v('start'), '2026-08-01')}
        ${field('pp-f-end', '종료일', v('end'), '2026-10-31')}
      </div>
      <div class="pp-form-foot">
        <button class="save-btn" onclick="ppSaveRegister()">💾 저장</button>
        <button class="ghost-btn" onclick="ppCancelRegister()">취소</button>
      </div>
    </div>`;
}

function ppInjectCrudStyle() {
  if (document.getElementById('pp-crud-style')) return;
  const st = document.createElement('style'); st.id = 'pp-crud-style';
  st.textContent = `
   .row-act-btn{font-size:12px;font-weight:700;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:7px;padding:3px 8px;margin:0 2px;cursor:pointer}
   .row-act-btn:hover{border-color:#0B6E55;color:#0B6E55}
   .row-act-btn.del:hover{border-color:#d92d20;color:#d92d20}
   .ghost-btn{font-size:14px;border:1px solid #d1d5db;background:#fff;color:#6b7280;border-radius:8px;padding:8px 16px;cursor:pointer;margin-left:8px}
   .pp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px}
   .pp-f{display:flex;flex-direction:column;gap:5px;font-size:13px;color:#374151;font-weight:600}
   .pp-f input{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:14px}
   .pp-f input:focus{outline:none;border-color:#0B6E55}
   .pp-form-foot{margin-top:20px;display:flex;align-items:center}
  `;
  document.head.appendChild(st);
}
