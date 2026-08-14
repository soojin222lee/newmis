// ════════════════════════════════════════
//  기준정보 설정 — 스텝 / 관리자 전용
// ════════════════════════════════════════

// AI GUIDE: 기준정보 설정 화면입니다.
// - 예산 투입 기준, 보고서 레이아웃, 개발방법론, 개발환경, MM 단가, 리스크 기준을 관리하는 관리자용 목업입니다.
// - 실제 운영에서는 실행예산 계산과 보고서 생성의 기준 데이터가 이 화면에서 관리됩니다.
// - AI 화면 가이드는 어떤 기준정보가 어떤 업무 계산에 영향을 주는지 설명해야 합니다.

const MC_MENUS = {
  'budget-rate':    { icon:'📊', title:'예산 소진율 기준',    sub:'프로젝트 유형별 경고·위험 임계값 설정' },
  'report-layout':  { icon:'📋', title:'보고서 레이아웃',     sub:'착수·중간·종료보고 항목 구성 및 필수 여부 설정' },
  'methodology':    { icon:'🔧', title:'개발방법론',          sub:'프로젝트에 적용 가능한 개발방법론 목록 관리' },
  'dev-env':        { icon:'💻', title:'개발환경',            sub:'개발·운영 환경 유형 및 기술 스택 기준 관리' },
  'mm-rate':        { icon:'💰', title:'인건비 단가 기준',     sub:'P레벨별 인건비 월단가 및 직접비·간접비 산정 기준 관리' },
  'phase-def':      { icon:'📐', title:'예산 사용 기준 정의',  sub:'프로젝트 세부 유형별 단계·기간에 따른 표준 예산 소진 패턴 및 경고 기준 설정' },
  'risk-criteria':  { icon:'⚠️', title:'리스크 분류 기준',   sub:'AI 리스크 감지 임계값 및 위험도 분류 기준 관리' },
};

function renderMasterConfig(section) {
  const m = MC_MENUS[section];
  document.getElementById('s-master-config').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">${m.icon} ${m.title}</div>
        <div class="page-sub">${m.sub}</div>
      </div>
      <span class="role-badge admin-badge">🔒 스텝 · 관리자 전용</span>
    </div>
    <div class="mc-admin-banner">
      ⚠️ 이 메뉴는 <strong>스텝 부서 및 시스템 관리자</strong>만 설정 변경이 가능합니다.
      변경 내용은 전체 프로젝트에 즉시 반영됩니다.
    </div>
    ${buildMcSection(section)}
  `;
}

// ── 섹션 라우터 ──────────────────────────
function buildMcSection(section) {
  switch (section) {
    case 'budget-rate':   return buildBudgetRateSection();
    case 'report-layout': return buildReportLayoutSection();
    case 'methodology':   return buildMethodologySection();
    case 'dev-env':       return buildDevEnvSection();
    case 'mm-rate':       return buildMMRateSection();
    case 'phase-def':     return buildPhaseDefSection();
    case 'risk-criteria': return buildRiskCriteriaSection();
    default: return '';
  }
}

// ════════════════════════════════════════
//  1. 예산 소진율 기준
// ════════════════════════════════════════
function buildBudgetRateSection() {
  const rows = [
    { type:'SI (수주형)', caution:70, danger:90, note:'계약금액 기준 적용' },
    { type:'OS (운영지원)', caution:75, danger:92, note:'월 투입 기준 적용' },
    { type:'TC (기술컨설팅)', caution:65, danger:88, note:'계획 MM 기준 적용' },
    { type:'W/G 프로젝트', caution:80, danger:95, note:'내부 배정 예산 기준' },
    { type:'사내 프로젝트', caution:80, danger:95, note:'내부 배정 예산 기준' },
  ];

  const trs = rows.map(r => `
    <tr>
      <td><span class="mc-type-badge">${r.type}</span></td>
      <td>
        <div class="mc-threshold-row">
          <span class="mc-badge caution">${r.caution}%</span>
          <span class="mc-thresh-label">이상 → 주의</span>
        </div>
      </td>
      <td>
        <div class="mc-threshold-row">
          <span class="mc-badge danger">${r.danger}%</span>
          <span class="mc-thresh-label">이상 → 위험</span>
        </div>
      </td>
      <td class="mc-note">${r.note}</td>
      <td><button class="mc-edit-btn" disabled>수정</button></td>
    </tr>`).join('');

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">프로젝트 유형별 예산 소진율 임계값</span>
      <span class="mc-section-desc">소진율이 설정값 이상이면 대시보드에 경고 표시</span>
    </div>
    <table class="mc-table">
      <thead>
        <tr>
          <th>프로젝트 유형</th>
          <th>주의 기준</th>
          <th>위험 기준</th>
          <th>적용 기준</th>
          <th style="width:60px"></th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 유형 추가</button>
      <span class="mc-readonly-note">※ 수정은 시스템 관리자 계정으로 로그인 후 가능합니다.</span>
    </div>
  </div>
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">소진율 계산 기준</span>
    </div>
    <div class="mc-rule-grid">
      <div class="mc-rule-card">
        <div class="mc-rule-label">계산식</div>
        <div class="mc-rule-value">실집행액 ÷ 실행예산(POt) × 100</div>
      </div>
      <div class="mc-rule-card">
        <div class="mc-rule-label">갱신 주기</div>
        <div class="mc-rule-value">일 배치 기준 (익일 반영)</div>
      </div>
      <div class="mc-rule-card">
        <div class="mc-rule-label">예외 처리</div>
        <div class="mc-rule-value">POt 미등록 시 계약금액으로 대체 적용</div>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  2. 보고서 레이아웃
// ════════════════════════════════════════
function buildReportLayoutSection() {
  const reports = [
    {
      key: 'initiation', label: '착수보고', icon: '🚀',
      items: [
        { name:'프로젝트 개요', required: true,  visible: true },
        { name:'수행 조직 / PM 정보', required: true,  visible: true },
        { name:'일정 계획 (WBS)', required: true,  visible: true },
        { name:'예산 계획', required: true,  visible: true },
        { name:'개발방법론 및 환경', required: false, visible: true },
        { name:'리스크 사전 식별', required: false, visible: true },
        { name:'이해관계자 목록', required: false, visible: false },
        { name:'품질 계획', required: false, visible: false },
      ]
    },
    {
      key: 'interim', label: '중간보고', icon: '📊',
      items: [
        { name:'진행 현황 요약', required: true,  visible: true },
        { name:'단계별 완료 현황', required: true,  visible: true },
        { name:'예산 집행 현황', required: true,  visible: true },
        { name:'리스크 현황 및 조치', required: true,  visible: true },
        { name:'잔여 일정 계획', required: false, visible: true },
        { name:'이슈 목록', required: false, visible: false },
      ]
    },
    {
      key: 'closure', label: '종료보고', icon: '🏁',
      items: [
        { name:'프로젝트 결과 요약', required: true,  visible: true },
        { name:'최종 예산 집행 내역', required: true,  visible: true },
        { name:'산출물 목록', required: true,  visible: true },
        { name:'교훈 및 개선 사항', required: false, visible: true },
        { name:'고객 만족도', required: false, visible: false },
      ]
    },
  ];

  const cards = reports.map(r => `
    <div class="mc-layout-card">
      <div class="mc-layout-head">
        <span class="mc-layout-icon">${r.icon}</span>
        <span class="mc-layout-title">${r.label}</span>
        <span class="mc-layout-count">${r.items.filter(i=>i.visible).length}개 항목 표시 중</span>
      </div>
      <table class="mc-layout-table">
        <thead>
          <tr><th>항목명</th><th>표시</th><th>필수</th></tr>
        </thead>
        <tbody>
          ${r.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td><input type="checkbox" ${item.visible ? 'checked' : ''} disabled></td>
              <td>${item.required ? '<span class="mc-required-dot">●</span>' : '<span style="color:#cbd5e1">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="mc-layout-foot">
        <button class="mc-edit-btn" disabled>항목 편집</button>
      </div>
    </div>`).join('');

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">보고서 유형별 레이아웃 구성</span>
      <span class="mc-section-desc">각 보고서에 포함할 항목 및 필수 여부를 설정합니다</span>
    </div>
    <div class="mc-layout-grid">${cards}</div>
    <div class="mc-table-foot">
      <span class="mc-readonly-note">※ 수정은 시스템 관리자 계정으로 로그인 후 가능합니다.</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  3. 개발방법론
// ════════════════════════════════════════
function buildMethodologySection() {
  const methods = [
    { name:'Waterfall', code:'WF', desc:'순차적 단계 수행 — 요구사항→설계→구현→테스트→배포', projectTypes:['SI','OS'], active:true },
    { name:'Agile (Scrum)', code:'AG', desc:'스프린트 기반 반복 개발 — 2~4주 단위 릴리즈', projectTypes:['SI','W/G'], active:true },
    { name:'Hybrid', code:'HB', desc:'Waterfall 계획 + Agile 실행 혼합 방식', projectTypes:['SI','OS','TC'], active:true },
    { name:'DevOps', code:'DO', desc:'개발·운영 통합 — CI/CD 파이프라인 중심', projectTypes:['OS'], active:true },
    { name:'Kanban', code:'KB', desc:'흐름 기반 작업 관리 — WIP 제한으로 병목 최소화', projectTypes:['W/G','사내'], active:false },
    { name:'RUP', code:'RU', desc:'반복적·점진적 개발 프로세스 — 4단계(도입·정련·구축·전환)', projectTypes:['SI'], active:false },
  ];

  const rows = methods.map(m => `
    <tr class="${m.active ? '' : 'mc-row-inactive'}">
      <td><span class="mc-code-badge">${m.code}</span></td>
      <td><span class="mc-method-name">${m.name}</span></td>
      <td class="mc-method-desc">${m.desc}</td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${m.projectTypes.map(t=>`<span class="mc-type-mini">${t}</span>`).join('')}
        </div>
      </td>
      <td><span class="mc-status-dot ${m.active ? 'active' : 'inactive'}">${m.active ? '사용' : '미사용'}</span></td>
      <td><button class="mc-edit-btn" disabled>수정</button></td>
    </tr>`).join('');

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">개발방법론 목록</span>
      <span class="mc-section-desc">프로젝트 등록 시 선택 가능한 방법론을 관리합니다</span>
    </div>
    <table class="mc-table">
      <thead>
        <tr>
          <th style="width:60px">코드</th>
          <th style="width:140px">방법론명</th>
          <th>설명</th>
          <th style="width:160px">적용 유형</th>
          <th style="width:70px">상태</th>
          <th style="width:60px"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 방법론 추가</button>
      <span class="mc-readonly-note">※ 수정은 시스템 관리자 계정으로 로그인 후 가능합니다.</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  4. 개발환경
// ════════════════════════════════════════
function buildDevEnvSection() {
  const envGroups = [
    {
      category: '개발 단계', icon: '🛠',
      envs: [
        { name:'Local', desc:'개발자 개인 로컬 환경', useCase:'단위 기능 개발' },
        { name:'Development (DEV)', desc:'통합 개발 서버', useCase:'통합 빌드·기능 검증' },
        { name:'Quality Assurance (QA)', desc:'테스트 전용 서버', useCase:'시스템·인수 테스트' },
      ]
    },
    {
      category: '운영 단계', icon: '🚀',
      envs: [
        { name:'Staging (STG)', desc:'운영 환경과 동일한 사전 검증 서버', useCase:'배포 전 최종 검증' },
        { name:'Production (PRD)', desc:'실제 서비스 운영 서버', useCase:'라이브 서비스' },
        { name:'DR (재해복구)', desc:'재해 대비 이중화 환경', useCase:'비상 운영 전환' },
      ]
    },
    {
      category: '기술 스택 기준', icon: '📦',
      envs: [
        { name:'Frontend', desc:'React / Vue / Vanilla JS', useCase:'프로젝트 유형별 선택' },
        { name:'Backend', desc:'Java (Spring) / Node.js / Python', useCase:'프로젝트 유형별 선택' },
        { name:'DB', desc:'Oracle / PostgreSQL / MySQL', useCase:'인프라 정책 기준 적용' },
        { name:'Infra', desc:'On-Premise / Cloud (AWS·Azure)', useCase:'계약 기준 결정' },
      ]
    },
  ];

  const sections = envGroups.map(g => `
    <div class="mc-env-group">
      <div class="mc-env-group-title">${g.icon} ${g.category}</div>
      <table class="mc-table">
        <thead>
          <tr>
            <th style="width:200px">환경명</th>
            <th>설명</th>
            <th style="width:200px">활용 목적</th>
            <th style="width:60px"></th>
          </tr>
        </thead>
        <tbody>
          ${g.envs.map(e => `
            <tr>
              <td><span class="mc-env-name">${e.name}</span></td>
              <td class="mc-method-desc">${e.desc}</td>
              <td class="mc-note">${e.useCase}</td>
              <td><button class="mc-edit-btn" disabled>수정</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">개발환경 기준 정보</span>
      <span class="mc-section-desc">프로젝트 등록 및 보고서에 사용되는 환경 기준을 관리합니다</span>
    </div>
    ${sections}
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 환경 추가</button>
      <span class="mc-readonly-note">※ 수정은 시스템 관리자 계정으로 로그인 후 가능합니다.</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  5. 인건비 단가 기준
// ════════════════════════════════════════
function buildMMRateSection() {
  const pLevels = [
    { lv:'P0',  monthly:5048261,  direct:4467488,  indirect:580773  },
    { lv:'P1',  monthly:7106194,  direct:6288667,  indirect:817527  },
    { lv:'P2',  monthly:8633475,  direct:7640244,  indirect:993231  },
    { lv:'P3',  monthly:9861588,  direct:8727070,  indirect:1134518 },
    { lv:'P4',  monthly:10793856, direct:9552085,  indirect:1241771 },
    { lv:'P5',  monthly:12369134, direct:10946137, indirect:1422997 },
    { lv:'P6',  monthly:13553357, direct:11994121, indirect:1559236 },
    { lv:'P7',  monthly:14689575, direct:12999624, indirect:1689951 },
    { lv:'P8',  monthly:15603036, direct:13807996, indirect:1795040 },
    { lv:'P9',  monthly:16379361, direct:14495010, indirect:1884351 },
    { lv:'P10', monthly:18871496, direct:16700440, indirect:2171056 },
  ];
  const apLevels = [
    { lv:'AP0', monthly:4065739,  direct:3388116,  indirect:677623  },
    { lv:'AP1', monthly:4108091,  direct:3423409,  indirect:684682  },
    { lv:'AP2', monthly:7747143,  direct:6455953,  indirect:1291190 },
    { lv:'AP3', monthly:9046415,  direct:7538680,  indirect:1507735 },
    { lv:'AP4', monthly:10459884, direct:8716570,  indirect:1743314 },
    { lv:'AP5', monthly:12410518, direct:10342098, indirect:2068420 },
    { lv:'AP6', monthly:15775295, direct:13146080, indirect:2629215 },
    { lv:'AP7', monthly:19012975, direct:15844146, indirect:3168829 },
    { lv:'AP8', monthly:20877129, direct:17397608, indirect:3479521 },
    { lv:'AP9', monthly:32734353, direct:27278628, indirect:5455725 },
  ];

  function fmt(n) { return n.toLocaleString('ko-KR'); }

  function buildRows(data, colorClass) {
    return data.map(r => `
      <tr>
        <td><span class="mc-level-badge ${colorClass}">${r.lv}</span></td>
        <td class="mc-rate-num">${fmt(r.monthly)}</td>
        <td class="mc-rate-num">${fmt(r.direct)}</td>
        <td class="mc-rate-num mc-rate-indirect">${fmt(r.indirect)}</td>
        <td><button class="mc-edit-btn" disabled>수정</button></td>
      </tr>`).join('');
  }

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">P 레벨별 인건비 단가</span>
      <span class="mc-section-desc">인건비(월단가) = 직접비 + 간접비 · 연 1회 경영관리AX 승인 후 갱신</span>
    </div>
    <div class="mc-rate-grid">
      <div>
        <div class="mc-rate-group-title mc-rate-p">P 레벨 (P0 ~ P10)</div>
        <table class="mc-table">
          <thead>
            <tr>
              <th style="width:70px">구분</th>
              <th class="mc-th-num">인건비 (월단가)</th>
              <th class="mc-th-num">직접비</th>
              <th class="mc-th-num">간접비</th>
              <th style="width:55px"></th>
            </tr>
          </thead>
          <tbody>${buildRows(pLevels, 'lvp')}</tbody>
        </table>
      </div>
      <div>
        <div class="mc-rate-group-title mc-rate-ap">AP 레벨 (AP0 ~ AP9)</div>
        <table class="mc-table">
          <thead>
            <tr>
              <th style="width:70px">구분</th>
              <th class="mc-th-num">인건비 (월단가)</th>
              <th class="mc-th-num">직접비</th>
              <th class="mc-th-num">간접비</th>
              <th style="width:55px"></th>
            </tr>
          </thead>
          <tbody>${buildRows(apLevels, 'lvap')}</tbody>
        </table>
      </div>
    </div>
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 레벨 추가</button>
      <span class="mc-readonly-note">※ 단가 변경은 회계연도 기준으로 경영관리AX 승인 후 적용됩니다.</span>
    </div>
  </div>
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">공수 산정 규칙</span>
    </div>
    <div class="mc-rule-grid">
      <div class="mc-rule-card">
        <div class="mc-rule-label">1MM 기준</div>
        <div class="mc-rule-value">월 160시간 (1일 8시간 × 20일)</div>
      </div>
      <div class="mc-rule-card">
        <div class="mc-rule-label">인건비 산정</div>
        <div class="mc-rule-value">SCM 확정 MM × 해당 P레벨 월단가</div>
      </div>
      <div class="mc-rule-card">
        <div class="mc-rule-label">내부 실적</div>
        <div class="mc-rule-value">ERP 실적 전표 자동 반영 (직접비 기준)</div>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  6. 예산 사용 기준 정의
// ════════════════════════════════════════
function buildPhaseDefSection() {
  const subtypes = [
    {
      code:'SI-AD', label:'SI · 개발 (AD)', color:'#1d4ed8', bg:'#dbeafe',
      desc:'수주형 신규 개발 — 단계 완료율 기준', basis:'단계 완료율',
      phases:[
        { name:'착수',      cumMin:2,  cumMax:8,   note:'계약금 수령 후 PM·조직 확정' },
        { name:'분석',      cumMin:12, cumMax:22,  note:'요구사항 확정 후 분석비 정산' },
        { name:'설계',      cumMin:28, cumMax:42,  note:'설계 완료 기성 청구 시점' },
        { name:'구현',      cumMin:58, cumMax:75,  note:'구현 완료 기성 청구 시점' },
        { name:'테스트',    cumMin:78, cumMax:92,  note:'인수테스트 완료 기준' },
        { name:'이행·종료', cumMin:95, cumMax:100, note:'최종 납품 및 종료' },
      ]
    },
    {
      code:'SI-MA', label:'SI · 유지보수 (MA)', color:'#0369a1', bg:'#e0f2fe',
      desc:'수주형 유지보수 — 월별 균등 소진', basis:'경과 기간 (월별)',
      phases:[
        { name:'1분기', cumMin:22, cumMax:28,  note:'인력 투입 안정화 기간' },
        { name:'2분기', cumMin:47, cumMax:53,  note:'정기 패치·변경 포함' },
        { name:'3분기', cumMin:72, cumMax:78,  note:'추가 변경 반영' },
        { name:'4분기', cumMin:95, cumMax:100, note:'연간 종료 정산' },
      ]
    },
    {
      code:'OS-AD', label:'OS · 개발 (AD)', color:'#0f766e', bg:'#ccfbf1',
      desc:'운영지원 내 개발 과제 — 과제 완료율 기준', basis:'과제 완료율',
      phases:[
        { name:'요건 접수·분석', cumMin:5,  cumMax:15,  note:'CR 승인 기준' },
        { name:'개발',           cumMin:40, cumMax:60,  note:'코드 완료 기준' },
        { name:'테스트·배포',    cumMin:75, cumMax:88,  note:'운영 반영 완료 기준' },
        { name:'안정화·종료',    cumMin:95, cumMax:100, note:'안정화 기간 포함' },
      ]
    },
    {
      code:'OS-인력공급', label:'OS · 인력공급', color:'#0891b2', bg:'#cffafe',
      desc:'인력 상주 운영 — MM 기준 월별 균등', basis:'경과 기간 (월별)',
      phases:[
        { name:'1분기', cumMin:23, cumMax:27,  note:'MM 확정 후 월별 정산' },
        { name:'2분기', cumMin:48, cumMax:52,  note:'SCM 투입 확정 기준' },
        { name:'3분기', cumMin:73, cumMax:77,  note:'SCM 투입 확정 기준' },
        { name:'4분기', cumMin:97, cumMax:100, note:'잔여 정산 포함' },
      ]
    },
    {
      code:'OS-기술지원', label:'OS · 기술지원', color:'#0e7490', bg:'#ecfeff',
      desc:'기술지원·컨설팅 성격 운영 — 지원 건수 기준', basis:'기간 + 지원 건수',
      phases:[
        { name:'상반기', cumMin:40, cumMax:55,  note:'지원 건수·MM 병행 관리' },
        { name:'하반기', cumMin:90, cumMax:100, note:'연간 계약 종료 정산' },
      ]
    },
    {
      code:'TC', label:'TC · 기술컨설팅', color:'#7c3aed', bg:'#ede9fe',
      desc:'기술 컨설팅 — 산출물 납품 기준', basis:'산출물 납품',
      phases:[
        { name:'착수·현황 파악', cumMin:10, cumMax:20,  note:'착수보고 완료 기준' },
        { name:'분석·과제 도출', cumMin:35, cumMax:50,  note:'중간보고 완료 기준' },
        { name:'TO-BE 설계',     cumMin:65, cumMax:80,  note:'초안 납품 기준' },
        { name:'최종 보고·종료', cumMin:95, cumMax:100, note:'최종 보고서 납품' },
      ]
    },
    {
      code:'WG', label:'W/G 프로젝트', color:'#ea580c', bg:'#ffedd5',
      desc:'워킹그룹 과제 — 분기 단위 예산 소진', basis:'경과 기간 (분기)',
      phases:[
        { name:'1분기', cumMin:20, cumMax:30,  note:'과제 착수 및 초기 투입' },
        { name:'2분기', cumMin:45, cumMax:55,  note:'주요 과제 진행' },
        { name:'3분기', cumMin:70, cumMax:80,  note:'과제 완료 및 검토' },
        { name:'4분기', cumMin:95, cumMax:100, note:'최종 결과 정리' },
      ]
    },
    {
      code:'INT', label:'사내 프로젝트', color:'#475569', bg:'#f1f5f9',
      desc:'사내 내부 프로젝트 — 분기 단위 집행', basis:'경과 기간 (분기)',
      phases:[
        { name:'1분기', cumMin:20, cumMax:30,  note:'예산 집행 개시' },
        { name:'2분기', cumMin:45, cumMax:55,  note:'주요 비용 집행' },
        { name:'3분기', cumMin:68, cumMax:78,  note:'투입미정 집행' },
        { name:'4분기', cumMin:95, cumMax:100, note:'연말 정산' },
      ]
    },
  ];

  function buildCard(t) {
    const rows = t.phases.map(p => `
      <tr>
        <td style="white-space:nowrap;font-size:14px;font-weight:600;color:#1e293b;width:110px">${p.name}</td>
        <td>
          <div class="mc-budget-bar-wrap">
            <div class="mc-budget-bar-range" style="left:${p.cumMin}%;width:${p.cumMax - p.cumMin}%;background:${t.color}30;border:1px solid ${t.color}70"></div>
            <span class="mc-budget-bar-label" style="left:${Math.max(p.cumMin - 1, 0)}%;color:${t.color}">${p.cumMin}%</span>
            <span class="mc-budget-bar-label" style="left:${Math.min(p.cumMax - 3, 94)}%;color:${t.color}">${p.cumMax}%</span>
          </div>
        </td>
        <td style="text-align:center;font-size:13px;font-weight:700;color:${t.color};white-space:nowrap;width:100px">${p.cumMin}% ~ ${p.cumMax}%</td>
        <td class="mc-note">${p.note}</td>
        <td><button class="mc-edit-btn" disabled>수정</button></td>
      </tr>`).join('');

    return `
    <div class="mc-budget-type-card">
      <div class="mc-budget-type-head" style="background:${t.bg};border-left:4px solid ${t.color}">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="mc-code-badge" style="background:${t.color};color:#fff">${t.code}</span>
          <span style="font-size:15px;font-weight:700;color:${t.color}">${t.label}</span>
          <span class="mc-type-mini" style="background:${t.color}18;color:${t.color}">${t.basis}</span>
        </div>
        <span class="mc-note">${t.desc}</span>
      </div>
      <table class="mc-table">
        <thead>
          <tr>
            <th style="width:110px">단계 / 기간</th>
            <th>누적 소진율 허용 범위 (← 0% ─────────────────── 100% →)</th>
            <th style="width:100px;text-align:center">기준값</th>
            <th>비고</th>
            <th style="width:55px"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">프로젝트 유형별 예산 사용 기준 정의</span>
      <span class="mc-section-desc">각 세부 유형·단계에서 허용되는 누적 예산 소진율 범위 — 범위 이탈 시 AI가 이상 소진으로 감지</span>
    </div>
    <div class="mc-budget-type-list">
      ${subtypes.map(buildCard).join('')}
    </div>
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 유형 추가</button>
      <span class="mc-readonly-note">※ 기준값은 스텝 부서 협의 후 경영관리AX 승인을 거쳐 확정됩니다.</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════
//  7. 리스크 분류 기준
// ════════════════════════════════════════
function buildRiskCriteriaSection() {
  const levels = [
    { level:'높음', color:'#991b1b', bg:'#fee2e2', conditions:['예산 소진율 90% 초과','일정 지연 2주 이상','핵심 인력 이탈 발생','고객 클레임 공식 접수'], action:'즉시 PM 알림 + 경영진 보고' },
    { level:'주의', color:'#92400e', bg:'#fef3c7', conditions:['예산 소진율 70~90%','일정 지연 1~2주','외주 인력 변경 발생','요구사항 범위 변경'], action:'PM 확인 및 조치 계획 수립 (3영업일 내)' },
    { level:'낮음', color:'#166534', bg:'#dcfce7', conditions:['예산 소진율 70% 미만','경미한 일정 조정','내부 이슈 자체 해소 가능'], action:'모니터링 유지 (조치 불요)' },
  ];

  const categories = [
    { cat:'예산', icon:'💰', rules:['실집행액 / POt 기준 소진율 자동 계산','POt 미등록 시 계약금액 기준 적용','카테고리별(인건비·외주비 등) 개별 소진율 병행 감지'] },
    { cat:'일정', icon:'📅', rules:['현재일 기준 WBS 잔여 일정 자동 비교','마일스톤 D-7, D-3, D-Day 알림 발송','단계 승인 미완료 시 다음 단계 진입 경고'] },
    { cat:'인력', icon:'👥', rules:['SCM 투입 계획 대비 실투입 차이 ±20% 이상 감지','PM 교체 시 자동 높음 리스크 등록','핵심 인력(특급·고급) 복수 이탈 감지'] },
    { cat:'품질', icon:'🔍', rules:['테스트 단계 결함 밀도 기준 초과 시 경고','인수테스트 미승인 상태로 이행 단계 진입 차단'] },
    { cat:'계약·범위', icon:'📝', rules:['요구사항 변경 요청(CR) 누적 5건 이상 경고','계약 변경 미처리 상태 30일 초과 알림'] },
  ];

  const levelCards = levels.map(l => `
    <div class="mc-risk-level-card" style="border-top:4px solid ${l.color}">
      <div class="mc-risk-level-head" style="background:${l.bg}">
        <span class="mc-badge" style="background:${l.bg};color:${l.color};font-size:15px">${l.level}</span>
      </div>
      <div class="mc-risk-level-body">
        <div class="mc-rule-label" style="margin-bottom:6px">감지 조건</div>
        ${l.conditions.map(c=>`<div class="mc-risk-cond">· ${c}</div>`).join('')}
        <div class="mc-rule-label" style="margin-top:10px;margin-bottom:4px">조치 기준</div>
        <div style="font-size:14px;color:#475569;font-weight:600">${l.action}</div>
      </div>
    </div>`).join('');

  const catRows = categories.map(c => `
    <tr>
      <td><span style="font-size:18px">${c.icon}</span> <strong>${c.cat}</strong></td>
      <td>
        ${c.rules.map(r=>`<div class="mc-risk-cond">· ${r}</div>`).join('')}
      </td>
      <td><button class="mc-edit-btn" disabled>수정</button></td>
    </tr>`).join('');

  return `
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">위험도 레벨 정의</span>
      <span class="mc-section-desc">AI가 자동 판단하는 리스크 레벨 기준값</span>
    </div>
    <div class="mc-risk-level-grid">${levelCards}</div>
  </div>
  <div class="mc-section-card">
    <div class="mc-section-head">
      <span class="mc-section-title">리스크 카테고리별 자동 감지 규칙</span>
      <span class="mc-section-desc">각 카테고리에서 AI가 모니터링하는 조건 목록</span>
    </div>
    <table class="mc-table">
      <thead>
        <tr><th style="width:120px">카테고리</th><th>감지 규칙</th><th style="width:60px"></th></tr>
      </thead>
      <tbody>${catRows}</tbody>
    </table>
    <div class="mc-table-foot">
      <button class="mc-add-btn" disabled>+ 규칙 추가</button>
      <span class="mc-readonly-note">※ 감지 규칙 변경은 AI 모델 재학습이 필요할 수 있습니다.</span>
    </div>
  </div>`;
}
