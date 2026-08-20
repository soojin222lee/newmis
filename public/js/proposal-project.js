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
  else renderProposalList();
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
      </tr>`;
  }).join('') : `<tr><td colspan="7" class="proj-no-result">🔍 검색 결과가 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">제안 프로젝트</div>
        <div class="page-sub">수주형 프로젝트에 딸린 제안(P00N 채번) · 자동 등록·예산 수립은 수주형과 동일</div>
      </div>
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
