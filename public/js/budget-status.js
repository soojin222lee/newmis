/* ============================================================
   [budget-status 분할본 1/5] — 로드 순서 필수(앞 파트 뒤에 로드)
   원본 budget-status.js를 병렬작업용으로 5분할. 전역 스코프 공유.
   주요 영역: 예산 코어(계산/총액바) + 인건비(labor) + 재료비 아이템 시작
   ============================================================ */
// ════════════════════════════════════════
//  프로젝트 예산 현황 페이지
// ════════════════════════════════════════

// AI GUIDE: 실행예산 화면의 핵심 업무 로직 파일입니다.
// - 프로젝트 목록, 실행예산 상세 수립, 버전 조회, 확정/승인 목업을 담당합니다.
// - 비용 영역은 인건비, 외주비, 재료비, 경비, A/S비 5개로 관리합니다.
// - 기준월(STAC) 이전은 ERP 실적, 이후는 실행예산 계획을 반영해 수행비용을 계산하는 컨셉입니다.
// - 외주비는 실투입대상 외주비, 전문직수수료/제안/기타, 외주출장비, 공사MA, 이관외주비, 기타외주비로 분리합니다.
// - 재료비는 상품재료비, 감가상각비, 이관재료비로 분리합니다.
// - 경비는 소계정/월별 자원계획 그리드가 요약이자 입력 화면이며, 통제 계정은 ERP 가용예산 확인이 필요합니다.
// - AI 화면 가이드가 이 파일을 설명할 때는 비용영역, 상세계정, 구매/SCM/ERP 연동 지점을 우선 답변해야 합니다.

let budgetView = 'summary';
let budgetScreenView = 'list';   // 'list' | 'detail'
let budgetDetailStep = 'setup'; // 'setup' | 'summaryGrid' | 'confirm'
let budgetSetupEditAccount = null;
let currentBudgetProj = 'cloud';

// ── 상세 컬럼 스키마 ──
const DETAIL_SCHEMA = {
  인건비: {
    cols: ['구분','이름','조직','역할','MM','단가','금액'],
    row : (r) => `
      <td>${typeBadge(r.type)}</td>
      <td style="font-weight:600">${r.name}</td>
      <td>${r.org}</td>
      <td style="color:#64748b">${r.role}</td>
      <td class="td-num">${r.mm}</td>
      <td class="td-num">${fmt(r.unitPrice)} 원</td>
      <td class="td-amount">${fmt(r.amount)} 원</td>`,
    total: rows => rows.reduce((s,r)=>s+r.amount, 0),
    totalCols: 7, hasPO: false,
  },
  외주비: {
    cols: ['구분','업체명','실적금액','PO금액'],
    row : (r, poAmts) => `
      <td>${typeBadge(r.type)}</td>
      <td style="font-weight:600">${r.vendor}</td>
      <td class="td-amount">${fmt(r.amount)} 원</td>
      <td class="td-amount" style="color:#475569">${poAmts&&poAmts[r.po] ? fmt(poAmts[r.po])+' 원' : '—'}</td>`,
    total   : rows => rows.reduce((s,r)=>s+r.amount, 0),
    totalPO : (rows, poAmts) => rows.reduce((s,r)=>s+(poAmts&&poAmts[r.po]||0), 0),
    totalCols: 4, hasPO: true,
  },
  재료비: {
    cols: ['구분','품목','실적금액','PO금액'],
    row : (r, poAmts) => `
      <td>${typeBadge(r.type)}</td>
      <td style="font-weight:600">${r.item}</td>
      <td class="td-amount">${fmt(r.amount)} 원</td>
      <td class="td-amount" style="color:#475569">${poAmts&&poAmts[r.po] ? fmt(poAmts[r.po])+' 원' : '—'}</td>`,
    total   : rows => rows.reduce((s,r)=>s+r.amount, 0),
    totalPO : (rows, poAmts) => rows.reduce((s,r)=>s+(poAmts&&poAmts[r.po]||0), 0),
    totalCols: 4, hasPO: true,
  },
  경비: {
    cols: ['구분','항목','금액'],
    row : (r) => `
      <td>${typeBadge(r.type)}</td>
      <td style="font-weight:600">${r.item}</td>
      <td class="td-amount">${fmt(r.amount)} 원</td>`,
    total: rows => rows.reduce((s,r)=>s+r.amount, 0),
    totalCols: 3, hasPO: false,
  },
  'A/S Cost': {
    cols: ['구분','업체명','실적금액','PO금액'],
    row : (r, poAmts) => `
      <td>${typeBadge(r.type)}</td>
      <td style="font-weight:600">${r.vendor}</td>
      <td class="td-amount">${fmt(r.amount)} 원</td>
      <td class="td-amount" style="color:#475569">${poAmts&&poAmts[r.po] ? fmt(poAmts[r.po])+' 원' : '—'}</td>`,
    total   : rows => rows.reduce((s,r)=>s+r.amount, 0),
    totalPO : (rows, poAmts) => rows.reduce((s,r)=>s+(poAmts&&poAmts[r.po]||0), 0),
    totalCols: 4, hasPO: true,
  },
};

// ── PO 계약금액 조회 테이블 ──
const PO_AMOUNTS = {
  cloud: {
    'PO-2025-001':12000000,
    'PO-2026-001':210000000, 'PO-2026-002':150000000,
    'PO-2026-003':52000000,  'PO-2026-004':52000000,
    'PO-2026-005':52000000,  'PO-2026-006':52000000,
    'PO-2026-007':35000000,  'PO-2026-008':28000000,  'PO-2026-009':17000000,
    'PO-M-2025-001':1500000,
    'PO-M-2026-001':1800000, 'PO-M-2026-002':1000000,
    'PO-M-2026-003':2000000, 'PO-M-2026-004':1200000,
    'PO-M-2026-005':2000000, 'PO-M-2026-006':900000,
    'PO-M-2026-007':2100000, 'PO-M-2026-008':1000000,
  },
  erp: {
    'PO-E-2025-001':200000000, 'PO-E-2025-002':120000000, 'PO-E-2025-003':100000000,
    'PO-E-2026-001':180000000, 'PO-E-2026-002':100000000,
    'PO-E-2026-003':80000000,  'PO-E-2026-004':100000000, 'PO-E-2026-005':80000000,
    'PO-EM-2025-001':1200000, 'PO-EM-2025-002':1500000,
    'PO-EM-2025-003':2000000, 'PO-EM-2025-004':3000000,
    'PO-EM-2026-001':2500000, 'PO-EM-2026-002':2000000,
    'PO-EM-2026-003':2500000, 'PO-EM-2026-004':2000000,
  },
  mobile: {
    'PO-M-2025-001':80000000, 'PO-M-2025-002':80000000,
    'PO-M-2026-001':60000000, 'PO-M-2026-002':40000000, 'PO-M-2026-003':18000000,
    'PO-AS-2026-001':20000000,
    'PO-MM-2025-001':500000,  'PO-MM-2025-002':800000,  'PO-MM-2025-003':1000000,
    'PO-MM-2025-004':1000000, 'PO-MM-2025-005':1200000, 'PO-MM-2025-006':1500000,
    'PO-MM-2025-007':1500000, 'PO-MM-2026-001':1500000, 'PO-MM-2026-002':1500000,
    'PO-MM-2026-003':1800000, 'PO-MM-2026-004':2000000,
  },
  sec: {
    'PO-S-2025-001':100000000, 'PO-S-2025-002':50000000,
    'PO-S-2025-003':80000000,  'PO-S-2025-004':60000000,
    'PO-S-2025-005':90000000,  'PO-S-2025-006':60000000,
    'PO-S-2026-001':100000000, 'PO-S-2026-002':50000000,
    'PO-S-2026-003':60000000,  'PO-S-2026-004':50000000, 'PO-S-2026-005':10000000,
    'PO-AS-S-001':5000000,
    'PO-SM-2025-001':2000000,  'PO-SM-2025-002':2500000,
    'PO-SM-2025-003':3000000,  'PO-SM-2025-004':3000000,
    'PO-SM-2025-005':3000000,  'PO-SM-2025-006':3200000,
    'PO-SM-2025-007':3500000,  'PO-SM-2025-008':3500000,
    'PO-SM-2025-009':3800000,  'PO-SM-2025-010':4000000, 'PO-SM-2025-011':4000000,
    'PO-SM-2026-001':4200000,  'PO-SM-2026-002':4200000,
    'PO-SM-2026-003':4300000,  'PO-SM-2026-004':4500000, 'PO-SM-2026-005':3000000,
  },
};

function typeBadge(type) {
  const cls = type==='실적'?'bdetail-type-actual': type==='투입확정'?'bdetail-type-quasi':'bdetail-type-plan';
  return `<span class="bdetail-type-badge ${cls}">${type}</span>`;
}

// ════════════════════════════════════════
//  예산 데이터
// ════════════════════════════════════════
const BUDGET_SOURCE = {

  // ── 클라우드 인프라 고도화 ──────────────
  cloud: {
    projName:'클라우드 인프라 고도화', stage:'설계', dplus:124,
    start:'2025-12', end:'2026-10', current:'2026-04',
    plan:{ 인건비:500000000, 외주비:529301838, 재료비:30000000, 경비:8000000, 'A/S Cost':0 },
    transfer:{ 인건비:-30000000, 외주비:30000000, 재료비:0, 경비:0, 'A/S Cost':0 },
    months:[
      // ────────── 2025-12 ──────────
      { m:'2025-12', type:'actual',
        인건비:{ a:18200000, q:0, details:[
          { type:'실적', name:'브라운', org:'PMO',      role:'PM 리딩',        mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'실적', name:'코니',  org:'아키텍처', role:'아키텍처 분석',   mm:0.4, unitPrice:18000000, amount:7200000  },
        ]},
        외주비:{ a:12000000, q:0, details:[
          { type:'실적', vendor:'ATS 주식회사', amount:12000000, po:'PO-2025-001' },
        ]},
        재료비:{ a:1500000, q:0, details:[
          { type:'실적', item:'서버 SSD 256GB (2EA)', amount:1500000, po:'PO-M-2025-001' },
        ]},
        경비:{ a:320000, q:0, details:[
          { type:'실적', item:'교통비', amount:120000 },
          { type:'실적', item:'식비',   amount:200000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      // ────────── 2026-01 ──────────
      { m:'2026-01', type:'actual',
        인건비:{ a:81400000, q:0, details:[
          { type:'실적', name:'브라운', org:'PMO',      role:'PM 리딩',              mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'코니',  org:'아키텍처', role:'클라우드 아키텍처',    mm:1.5, unitPrice:22000000, amount:33000000 },
          { type:'실적', name:'샐리',  org:'개발',     role:'백엔드',               mm:1.2, unitPrice:22000000, amount:26400000 },
        ]},
        외주비:{ a:80242833, q:0, details:[
          { type:'실적', vendor:'ATS 주식회사',    amount:35000000, po:'PO-2026-001' },
          { type:'실적', vendor:'AGS 솔루션',      amount:28000000, po:'PO-2026-002' },
          { type:'실적', vendor:'KBP 테크놀로지', amount:17242833, po:'PO-2026-003' },
        ]},
        재료비:{ a:2800000, q:0, details:[
          { type:'실적', item:'네트워크 스위치 24포트', amount:1800000, po:'PO-M-2026-001' },
          { type:'실적', item:'UTP 케이블 Cat6 100m',  amount:1000000, po:'PO-M-2026-002' },
        ]},
        경비:{ a:850000, q:0, details:[
          { type:'실적', item:'출장비', amount:450000 },
          { type:'실적', item:'교통비', amount:200000 },
          { type:'실적', item:'식비',   amount:200000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      // ────────── 2026-02 ──────────
      { m:'2026-02', type:'actual',
        인건비:{ a:79200000, q:0, details:[
          { type:'실적', name:'브라운', org:'PMO',      role:'PM 리딩',           mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'코니',  org:'아키텍처', role:'클라우드 아키텍처', mm:1.2, unitPrice:22000000, amount:26400000 },
          { type:'실적', name:'샐리',  org:'개발',     role:'백엔드',            mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'다니',  org:'개발',     role:'프론트엔드',        mm:0.4, unitPrice:22000000, amount:8800000  },
        ]},
        외주비:{ a:79597343, q:0, details:[
          { type:'실적', vendor:'ATS 주식회사',    amount:35000000, po:'PO-2026-001' },
          { type:'실적', vendor:'AGS 솔루션',      amount:27500000, po:'PO-2026-002' },
          { type:'실적', vendor:'KBP 테크놀로지', amount:17097343, po:'PO-2026-004' },
        ]},
        재료비:{ a:3200000, q:0, details:[
          { type:'실적', item:'서버 메모리 32GB (2EA)',  amount:2000000, po:'PO-M-2026-003' },
          { type:'실적', item:'라우터 설정 부품',        amount:1200000, po:'PO-M-2026-004' },
        ]},
        경비:{ a:780000, q:0, details:[
          { type:'실적', item:'교통비', amount:280000 },
          { type:'실적', item:'식비',   amount:350000 },
          { type:'실적', item:'소모품', amount:150000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      // ────────── 2026-03 ──────────
      { m:'2026-03', type:'actual',
        인건비:{ a:76500000, q:0, details:[
          { type:'실적', name:'브라운', org:'PMO',      role:'PM 리딩',           mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'코니',  org:'아키텍처', role:'클라우드 아키텍처', mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'샐리',  org:'개발',     role:'백엔드',            mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'다니',  org:'개발',     role:'프론트엔드',        mm:0.5, unitPrice:21000000, amount:10500000 },
        ]},
        외주비:{ a:79602608, q:0, details:[
          { type:'실적', vendor:'ATS 주식회사',    amount:34000000, po:'PO-2026-001' },
          { type:'실적', vendor:'AGS 솔루션',      amount:28500000, po:'PO-2026-002' },
          { type:'실적', vendor:'KBP 테크놀로지', amount:17102608, po:'PO-2026-005' },
        ]},
        재료비:{ a:2900000, q:0, details:[
          { type:'실적', item:'방화벽 라이선스 갱신', amount:2000000, po:'PO-M-2026-005' },
          { type:'실적', item:'냉각 팬 교체 부품',    amount:900000,  po:'PO-M-2026-006' },
        ]},
        경비:{ a:920000, q:0, details:[
          { type:'실적', item:'출장비', amount:550000 },
          { type:'실적', item:'교통비', amount:220000 },
          { type:'실적', item:'식비',   amount:150000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      // ────────── 2026-04 (당월) ──────────
      { m:'2026-04', type:'actual',
        인건비:{ a:82300000, q:0, details:[
          { type:'실적', name:'브라운', org:'PMO',      role:'PM 리딩',           mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'코니',  org:'아키텍처', role:'클라우드 아키텍처', mm:1.5, unitPrice:22000000, amount:33000000 },
          { type:'실적', name:'샐리',  org:'개발',     role:'백엔드',            mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'실적', name:'오민',  org:'QA',       role:'품질관리',          mm:0.3, unitPrice:17666667, amount:5300000  },
        ]},
        외주비:{ a:80309059, q:0, details:[
          { type:'실적', vendor:'ATS 주식회사',    amount:35500000, po:'PO-2026-001' },
          { type:'실적', vendor:'AGS 솔루션',      amount:27500000, po:'PO-2026-002' },
          { type:'실적', vendor:'KBP 테크놀로지', amount:17309059, po:'PO-2026-006' },
        ]},
        재료비:{ a:3100000, q:0, details:[
          { type:'실적', item:'모니터링 장비',  amount:2100000, po:'PO-M-2026-007' },
          { type:'실적', item:'케이블 트레이', amount:1000000, po:'PO-M-2026-008' },
        ]},
        경비:{ a:850000, q:0, details:[
          { type:'실적', item:'교통비', amount:350000 },
          { type:'실적', item:'식비',   amount:300000 },
          { type:'실적', item:'소모품', amount:200000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      // ────────── 2026-05 (투입확정 확정) ──────────
      { m:'2026-05', type:'plan',
        인건비:{ p:78000000, q:78000000, details:[
          { type:'투입확정', name:'브라운', org:'PMO',      role:'PM 리딩',           mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'투입확정', name:'코니',  org:'아키텍처', role:'클라우드 아키텍처', mm:1.5, unitPrice:22000000, amount:33000000 },
          { type:'투입확정', name:'샐리',  org:'개발',     role:'백엔드',            mm:1.0, unitPrice:22000000, amount:22000000 },
          { type:'투입확정', name:'오민',  org:'QA',       role:'품질관리',          mm:0.05, unitPrice:20000000, amount:1000000  },
        ]},
        외주비:{ p:79800000, q:79800000, details:[
          { type:'투입확정', vendor:'ATS 주식회사',    amount:35000000, po:'PO-2026-007' },
          { type:'투입확정', vendor:'AGS 솔루션',      amount:28000000, po:'PO-2026-008' },
          { type:'투입확정', vendor:'KBP 테크놀로지', amount:16800000, po:'PO-2026-009' },
        ]},
        재료비:{ p:3000000, q:0, details:[
          { type:'계획', item:'로드밸런서 부품',  amount:2000000, po:'PO-TBD' },
          { type:'계획', item:'UPS 배터리',       amount:1000000, po:'PO-TBD' },
        ]},
        경비:{ p:800000, q:0, details:[
          { type:'계획', item:'출장비', amount:400000 },
          { type:'계획', item:'교통비', amount:200000 },
          { type:'계획', item:'식비',   amount:200000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      // ────────── 2026-06 ──────────
      { m:'2026-06', type:'plan',
        인건비:{ p:25000000, q:0, details:[
          { type:'계획', name:'브라운', org:'PMO',  role:'PM 리딩', mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'계획', name:'샐리',  org:'개발',  role:'백엔드',  mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'계획', name:'다니',  org:'개발',  role:'마무리',  mm:0.14, unitPrice:21428571, amount:3000000  },
        ]},
        외주비:{ p:29549995, q:0, details:[
          { type:'계획', vendor:'ATS 주식회사',    amount:15000000, po:'PO-TBD' },
          { type:'계획', vendor:'AGS 솔루션',      amount:14549995, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'소프트웨어 라이선스', amount:2000000, po:'PO-TBD' },
        ]},
        경비:{ p:500000, q:0, details:[
          { type:'계획', item:'교통비', amount:200000 },
          { type:'계획', item:'식비',   amount:300000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      // ────────── 2026-07 ──────────
      { m:'2026-07', type:'plan',
        인건비:{ p:20000000, q:0, details:[
          { type:'계획', name:'브라운', org:'PMO', role:'PM 종료보고', mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'계획', name:'샐리',  org:'개발', role:'인수인계',    mm:0.41, unitPrice:22000000, amount:9000000  },
        ]},
        외주비:{ p:5000000, q:0, details:[
          { type:'계획', vendor:'ATS 주식회사', amount:5000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2500000, q:0, details:[
          { type:'계획', item:'검수 장비 반납 처리', amount:2500000, po:'PO-TBD' },
        ]},
        경비:{ p:400000, q:0, details:[
          { type:'계획', item:'교통비', amount:180000 },
          { type:'계획', item:'식비',   amount:220000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      // ────────── 2026-08 ──────────
      { m:'2026-08', type:'plan',
        인건비:{ p:15000000, q:0, details:[
          { type:'계획', name:'브라운', org:'PMO', role:'PM 최종보고', mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'계획', name:'오민',  org:'QA',   role:'최종 검수',   mm:0.22, unitPrice:18000000, amount:4000000  },
        ]},
        외주비:{ p:3000000, q:0, details:[
          { type:'계획', vendor:'KBP 테크놀로지', amount:3000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'최종 납품 패키지', amount:2000000, po:'PO-TBD' },
        ]},
        경비:{ p:350000, q:0, details:[
          { type:'계획', item:'교통비', amount:150000 },
          { type:'계획', item:'식비',   amount:200000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      // ────────── 2026-09 ──────────
      { m:'2026-09', type:'plan',
        인건비:{ p:12000000, q:0, details:[
          { type:'계획', name:'브라운', org:'PMO', role:'종료보고 작성', mm:0.5, unitPrice:22000000, amount:11000000 },
          { type:'계획', name:'코니',  org:'아키텍처', role:'문서화',  mm:0.05, unitPrice:22000000, amount:1000000  },
        ]},
        외주비:{ p:2000000, q:0, details:[
          { type:'계획', vendor:'AGS 솔루션', amount:2000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'문서 인쇄 및 제본', amount:800000,  po:'PO-TBD' },
          { type:'계획', item:'보안 매체 폐기',    amount:1200000, po:'PO-TBD' },
        ]},
        경비:{ p:300000, q:0, details:[
          { type:'계획', item:'교통비', amount:120000 },
          { type:'계획', item:'식비',   amount:180000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      // ────────── 2026-10 ──────────
      { m:'2026-10', type:'plan',
        인건비:{ p:8000000, q:0, details:[
          { type:'계획', name:'브라운', org:'PMO', role:'최종 완료보고', mm:0.36, unitPrice:22000000, amount:8000000 },
        ]},
        외주비:{ p:2000000, q:0, details:[
          { type:'계획', vendor:'ATS 주식회사', amount:2000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'최종 검수 비용', amount:2000000, po:'PO-TBD' },
        ]},
        경비:{ p:280000, q:0, details:[
          { type:'계획', item:'교통비', amount:130000 },
          { type:'계획', item:'식비',   amount:150000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
    ]
  },

  // ── ERP 고도화 ─────────────────────────
  erp: {
    projName:'ERP 고도화', stage:'진행중', dplus:245,
    start:'2025-09', end:'2026-12', current:'2026-04',
    plan:{ 인건비:150000000, 외주비:520000000, 재료비:22000000, 경비:8000000, 'A/S Cost':0 },
    transfer:{ 인건비:0, 외주비:20000000, 재료비:-20000000, 경비:0, 'A/S Cost':0 },
    months:[
      { m:'2025-09', type:'actual',
        인건비:{ a:8500000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM', role:'PM 리딩', mm:0.5, unitPrice:17000000, amount:8500000 },
        ]},
        외주비:{ a:25000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:15000000, po:'PO-E-2025-001' },
          { type:'실적', vendor:'LG CNS',  amount:10000000, po:'PO-E-2025-002' },
        ]},
        재료비:{ a:1200000, q:0, details:[
          { type:'실적', item:'ERP 모듈 라이선스', amount:1200000, po:'PO-EM-2025-001' },
        ]},
        경비:{ a:500000, q:0, details:[
          { type:'실적', item:'교통비', amount:200000 },
          { type:'실적', item:'식비',   amount:300000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2025-10', type:'actual',
        인건비:{ a:9000000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',  role:'PM 리딩',   mm:0.5, unitPrice:17000000, amount:8500000 },
          { type:'실적', name:'박준',   org:'개발', role:'백엔드',   mm:0.03, unitPrice:16666667, amount:500000  },
        ]},
        외주비:{ a:28000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:16000000, po:'PO-E-2025-001' },
          { type:'실적', vendor:'LG CNS',  amount:12000000, po:'PO-E-2025-002' },
        ]},
        재료비:{ a:1500000, q:0, details:[
          { type:'실적', item:'DB 서버 증설 비용', amount:1500000, po:'PO-EM-2025-002' },
        ]},
        경비:{ a:600000, q:0, details:[
          { type:'실적', item:'교통비', amount:250000 },
          { type:'실적', item:'식비',   amount:350000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2025-11', type:'actual',
        인건비:{ a:9200000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',  role:'PM 리딩', mm:0.5, unitPrice:17000000, amount:8500000 },
          { type:'실적', name:'박준',   org:'개발', role:'백엔드', mm:0.04, unitPrice:17500000, amount:700000  },
        ]},
        외주비:{ a:30000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:18000000, po:'PO-E-2025-001' },
          { type:'실적', vendor:'LG CNS',  amount:12000000, po:'PO-E-2025-003' },
        ]},
        재료비:{ a:2000000, q:0, details:[
          { type:'실적', item:'데이터 마이그레이션 도구', amount:2000000, po:'PO-EM-2025-003' },
        ]},
        경비:{ a:500000, q:0, details:[
          { type:'실적', item:'교통비', amount:200000 },
          { type:'실적', item:'식비',   amount:300000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2025-12', type:'actual',
        인건비:{ a:9500000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',    role:'PM 리딩',  mm:0.5, unitPrice:17000000, amount:8500000 },
          { type:'실적', name:'박준',   org:'개발',  role:'백엔드',   mm:0.06, unitPrice:16666667, amount:1000000 },
        ]},
        외주비:{ a:32000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:19000000, po:'PO-E-2025-001' },
          { type:'실적', vendor:'LG CNS',  amount:13000000, po:'PO-E-2025-003' },
        ]},
        재료비:{ a:3000000, q:0, details:[
          { type:'실적', item:'연말 시스템 점검 비용', amount:3000000, po:'PO-EM-2025-004' },
        ]},
        경비:{ a:700000, q:0, details:[
          { type:'실적', item:'출장비', amount:350000 },
          { type:'실적', item:'교통비', amount:200000 },
          { type:'실적', item:'식비',   amount:150000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2026-01', type:'actual',
        인건비:{ a:10000000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',    role:'PM 리딩',  mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'실적', name:'박준',   org:'개발',  role:'백엔드',   mm:0.05, unitPrice:20000000, amount:1000000 },
        ]},
        외주비:{ a:35000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:20000000, po:'PO-E-2026-001' },
          { type:'실적', vendor:'LG CNS',  amount:15000000, po:'PO-E-2026-002' },
        ]},
        재료비:{ a:2500000, q:0, details:[
          { type:'실적', item:'ERP 인터페이스 모듈', amount:2500000, po:'PO-EM-2026-001' },
        ]},
        경비:{ a:600000, q:0, details:[
          { type:'실적', item:'교통비', amount:250000 },
          { type:'실적', item:'식비',   amount:350000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2026-02', type:'actual',
        인건비:{ a:10200000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',    role:'PM 리딩',   mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'실적', name:'박준',   org:'개발',  role:'백엔드',    mm:0.06, unitPrice:20000000, amount:1200000 },
        ]},
        외주비:{ a:36000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:21000000, po:'PO-E-2026-001' },
          { type:'실적', vendor:'LG CNS',  amount:15000000, po:'PO-E-2026-002' },
        ]},
        재료비:{ a:2000000, q:0, details:[
          { type:'실적', item:'결제 모듈 라이선스', amount:2000000, po:'PO-EM-2026-002' },
        ]},
        경비:{ a:500000, q:0, details:[
          { type:'실적', item:'교통비', amount:200000 },
          { type:'실적', item:'식비',   amount:300000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2026-03', type:'actual',
        인건비:{ a:10500000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',    role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'실적', name:'박준',   org:'개발',  role:'백엔드',  mm:0.075, unitPrice:20000000, amount:1500000 },
        ]},
        외주비:{ a:37000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:22000000, po:'PO-E-2026-001' },
          { type:'실적', vendor:'LG CNS',  amount:15000000, po:'PO-E-2026-003' },
        ]},
        재료비:{ a:2500000, q:0, details:[
          { type:'실적', item:'API 게이트웨이 설정', amount:2500000, po:'PO-EM-2026-003' },
        ]},
        경비:{ a:600000, q:0, details:[
          { type:'실적', item:'출장비', amount:300000 },
          { type:'실적', item:'교통비', amount:150000 },
          { type:'실적', item:'식비',   amount:150000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2026-04', type:'actual',
        인건비:{ a:10800000, q:0, details:[
          { type:'실적', name:'이강혁', org:'PM',    role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'실적', name:'박준',   org:'개발',  role:'백엔드',  mm:0.09, unitPrice:20000000, amount:1800000 },
        ]},
        외주비:{ a:38000000, q:0, details:[
          { type:'실적', vendor:'삼성SDS', amount:22000000, po:'PO-E-2026-001' },
          { type:'실적', vendor:'LG CNS',  amount:16000000, po:'PO-E-2026-003' },
        ]},
        재료비:{ a:2000000, q:0, details:[
          { type:'실적', item:'1차 검수 도구',amount:2000000, po:'PO-EM-2026-004' },
        ]},
        경비:{ a:700000, q:0, details:[
          { type:'실적', item:'교통비', amount:300000 },
          { type:'실적', item:'식비',   amount:400000 },
        ]},
        'A/S Cost':{ a:0, q:0, details:[] },
      },
      { m:'2026-05', type:'plan',
        인건비:{ p:11000000, q:11000000, details:[
          { type:'투입확정', name:'이강혁', org:'PM',   role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'투입확정', name:'박준',   org:'개발', role:'백엔드',  mm:0.1, unitPrice:20000000, amount:2000000 },
        ]},
        외주비:{ p:40000000, q:40000000, details:[
          { type:'투입확정', vendor:'삼성SDS', amount:24000000, po:'PO-E-2026-004' },
          { type:'투입확정', vendor:'LG CNS',  amount:16000000, po:'PO-E-2026-005' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'2차 검수 도구', amount:2000000, po:'PO-TBD' },
        ]},
        경비:{ p:600000, q:0, details:[
          { type:'계획', item:'교통비', amount:250000 },
          { type:'계획', item:'식비',   amount:350000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-06', type:'plan',
        인건비:{ p:11000000, q:0, details:[
          { type:'계획', name:'이강혁', org:'PM',   role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'계획', name:'박준',   org:'개발', role:'백엔드',  mm:0.1, unitPrice:20000000, amount:2000000 },
        ]},
        외주비:{ p:40000000, q:0, details:[
          { type:'계획', vendor:'삼성SDS', amount:24000000, po:'PO-TBD' },
          { type:'계획', vendor:'LG CNS',  amount:16000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[
          { type:'계획', item:'통합테스트 환경', amount:2000000, po:'PO-TBD' },
        ]},
        경비:{ p:600000, q:0, details:[
          { type:'계획', item:'교통비', amount:250000 },
          { type:'계획', item:'식비',   amount:350000 },
        ]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-07', type:'plan',
        인건비:{ p:11000000, q:0, details:[
          { type:'계획', name:'이강혁', org:'PM',   role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'계획', name:'박준',   org:'개발', role:'최종개발', mm:0.1, unitPrice:20000000, amount:2000000 },
        ]},
        외주비:{ p:38000000, q:0, details:[
          { type:'계획', vendor:'삼성SDS', amount:23000000, po:'PO-TBD' },
          { type:'계획', vendor:'LG CNS',  amount:15000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[{ type:'계획', item:'테스트 라이선스', amount:2000000, po:'PO-TBD' }]},
        경비:{ p:600000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:600000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-08', type:'plan',
        인건비:{ p:10000000, q:0, details:[
          { type:'계획', name:'이강혁', org:'PM', role:'PM 리딩', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'계획', name:'박준',   org:'개발', role:'인수인계', mm:0.05, unitPrice:20000000, amount:1000000 },
        ]},
        외주비:{ p:35000000, q:0, details:[
          { type:'계획', vendor:'삼성SDS', amount:20000000, po:'PO-TBD' },
          { type:'계획', vendor:'LG CNS',  amount:15000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[{ type:'계획', item:'최종 납품 비용', amount:2000000, po:'PO-TBD' }]},
        경비:{ p:500000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:500000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-09', type:'plan',
        인건비:{ p:10000000, q:0, details:[
          { type:'계획', name:'이강혁', org:'PM', role:'종료보고', mm:0.5, unitPrice:18000000, amount:9000000 },
          { type:'계획', name:'박준',   org:'개발', role:'문서화', mm:0.05, unitPrice:20000000, amount:1000000 },
        ]},
        외주비:{ p:35000000, q:0, details:[
          { type:'계획', vendor:'삼성SDS', amount:20000000, po:'PO-TBD' },
          { type:'계획', vendor:'LG CNS',  amount:15000000, po:'PO-TBD' },
        ]},
        재료비:{ p:2000000, q:0, details:[{ type:'계획', item:'문서 인쇄/제본', amount:2000000, po:'PO-TBD' }]},
        경비:{ p:500000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:500000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-10', type:'plan',
        인건비:{ p:9000000, q:0, details:[
          { type:'계획', name:'이강혁', org:'PM', role:'최종완료', mm:0.5, unitPrice:18000000, amount:9000000 },
        ]},
        외주비:{ p:30000000, q:0, details:[
          { type:'계획', vendor:'삼성SDS', amount:17000000, po:'PO-TBD' },
          { type:'계획', vendor:'LG CNS',  amount:13000000, po:'PO-TBD' },
        ]},
        재료비:{ p:1000000, q:0, details:[{ type:'계획', item:'최종 검수 비용', amount:1000000, po:'PO-TBD' }]},
        경비:{ p:400000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:400000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-11', type:'plan',
        인건비:{ p:9000000, q:0, details:[{ type:'계획', name:'이강혁', org:'PM', role:'종료 지원', mm:0.5, unitPrice:18000000, amount:9000000 }]},
        외주비:{ p:30000000, q:0, details:[{ type:'계획', vendor:'삼성SDS', amount:30000000, po:'PO-TBD' }]},
        재료비:{ p:1000000, q:0, details:[{ type:'계획', item:'마무리 소모품', amount:1000000, po:'PO-TBD' }]},
        경비:{ p:400000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:400000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
      { m:'2026-12', type:'plan',
        인건비:{ p:8300000, q:0, details:[{ type:'계획', name:'이강혁', org:'PM', role:'종료완료', mm:0.46, unitPrice:18000000, amount:8300000 }]},
        외주비:{ p:27000000, q:0, details:[{ type:'계획', vendor:'삼성SDS', amount:27000000, po:'PO-TBD' }]},
        재료비:{ p:1000000, q:0, details:[{ type:'계획', item:'최종 정산 비용', amount:1000000, po:'PO-TBD' }]},
        경비:{ p:400000, q:0, details:[{ type:'계획', item:'교통비/식비', amount:400000 }]},
        'A/S Cost':{ p:0, q:0, details:[] },
      },
    ]
  },

  // ── 모바일 앱 리뉴얼 ──────────────────
  mobile: {
    projName:'모바일 앱 리뉴얼', stage:'진행중', dplus:328,
    start:'2025-06', end:'2026-06', current:'2026-04',
    plan:{ 인건비:80000000, 외주비:180000000, 재료비:15000000, 경비:5000000, 'A/S Cost':20000000 },
    transfer:{ 인건비:0, 외주비:15000000, 재료비:0, 경비:-15000000, 'A/S Cost':0 },
    months:[
      { m:'2025-06', type:'actual', 인건비:{a:5000000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.29,unitPrice:17000000,amount:5000000}]}, 외주비:{a:12000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:12000000,po:'PO-M-2025-001'}]}, 재료비:{a:500000,q:0,details:[{type:'실적',item:'디자인 툴 라이선스',amount:500000,po:'PO-MM-2025-001'}]}, 경비:{a:200000,q:0,details:[{type:'실적',item:'교통비/식비',amount:200000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-07', type:'actual', 인건비:{a:5500000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.32,unitPrice:17000000,amount:5500000}]}, 외주비:{a:14000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:14000000,po:'PO-M-2025-001'}]}, 재료비:{a:800000,q:0,details:[{type:'실적',item:'UI 컴포넌트 라이선스',amount:800000,po:'PO-MM-2025-002'}]}, 경비:{a:300000,q:0,details:[{type:'실적',item:'교통비/식비',amount:300000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-08', type:'actual', 인건비:{a:6000000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.35,unitPrice:17000000,amount:6000000}]}, 외주비:{a:15000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:15000000,po:'PO-M-2025-001'}]}, 재료비:{a:1000000,q:0,details:[{type:'실적',item:'앱스토어 심사 비용',amount:1000000,po:'PO-MM-2025-003'}]}, 경비:{a:300000,q:0,details:[{type:'실적',item:'교통비/식비',amount:300000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-09', type:'actual', 인건비:{a:6200000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.36,unitPrice:17000000,amount:6200000}]}, 외주비:{a:15500000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:15500000,po:'PO-M-2025-002'}]}, 재료비:{a:1000000,q:0,details:[{type:'실적',item:'테스트 기기 구매',amount:1000000,po:'PO-MM-2025-004'}]}, 경비:{a:400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-10', type:'actual', 인건비:{a:6500000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.38,unitPrice:17000000,amount:6500000}]}, 외주비:{a:16000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:16000000,po:'PO-M-2025-002'}]}, 재료비:{a:1200000,q:0,details:[{type:'실적',item:'QA 도구 라이선스',amount:1200000,po:'PO-MM-2025-005'}]}, 경비:{a:400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-11', type:'actual', 인건비:{a:6800000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.4,unitPrice:17000000,amount:6800000}]}, 외주비:{a:16500000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:16500000,po:'PO-M-2025-002'}]}, 재료비:{a:1500000,q:0,details:[{type:'실적',item:'iOS 개발자 계정',amount:1500000,po:'PO-MM-2025-006'}]}, 경비:{a:400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-12', type:'actual', 인건비:{a:7000000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.41,unitPrice:17000000,amount:7000000}]}, 외주비:{a:17000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:17000000,po:'PO-M-2026-001'}]}, 재료비:{a:1500000,q:0,details:[{type:'실적',item:'성능 테스트 도구',amount:1500000,po:'PO-MM-2025-007'}]}, 경비:{a:400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-01', type:'actual', 인건비:{a:7200000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.42,unitPrice:17000000,amount:7200000}]}, 외주비:{a:17500000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:17500000,po:'PO-M-2026-001'}]}, 재료비:{a:1500000,q:0,details:[{type:'실적',item:'앱 분석 도구',amount:1500000,po:'PO-MM-2026-001'}]}, 경비:{a:500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-02', type:'actual', 인건비:{a:7000000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.41,unitPrice:17000000,amount:7000000}]}, 외주비:{a:17000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:17000000,po:'PO-M-2026-001'}]}, 재료비:{a:1500000,q:0,details:[{type:'실적',item:'보안 취약점 스캔',amount:1500000,po:'PO-MM-2026-002'}]}, 경비:{a:500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-03', type:'actual', 인건비:{a:7200000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.42,unitPrice:17000000,amount:7200000}]}, 외주비:{a:17500000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:17500000,po:'PO-M-2026-002'}]}, 재료비:{a:1800000,q:0,details:[{type:'실적',item:'개인정보 처리방침 업데이트',amount:1800000,po:'PO-MM-2026-003'}]}, 경비:{a:500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-04', type:'actual', 인건비:{a:7500000,q:0,details:[{type:'실적',name:'최우진',org:'PM',role:'PM 리딩',mm:0.44,unitPrice:17000000,amount:7500000}]}, 외주비:{a:18000000,q:0,details:[{type:'실적',vendor:'앱코리아',amount:18000000,po:'PO-M-2026-002'}]}, 재료비:{a:2000000,q:0,details:[{type:'실적',item:'앱스토어 재심사 비용',amount:2000000,po:'PO-MM-2026-004'}]}, 경비:{a:500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-05', type:'plan', 인건비:{p:7500000,q:7500000,details:[{type:'투입확정',name:'최우진',org:'PM',role:'PM 리딩',mm:0.44,unitPrice:17000000,amount:7500000}]}, 외주비:{p:18000000,q:18000000,details:[{type:'투입확정',vendor:'앱코리아',amount:18000000,po:'PO-M-2026-003'}]}, 재료비:{p:1200000,q:0,details:[{type:'계획',item:'최종 QA 도구',amount:1200000,po:'PO-TBD'}]}, 경비:{p:500000,q:0,details:[{type:'계획',item:'교통비/식비',amount:500000}]}, 'A/S Cost':{p:10000000,q:10000000,details:[{type:'투입확정',vendor:'앱코리아 A/S팀',amount:10000000,po:'PO-AS-2026-001'}]} },
      { m:'2026-06', type:'plan', 인건비:{p:5600000,q:0,details:[{type:'계획',name:'최우진',org:'PM',role:'종료보고',mm:0.33,unitPrice:17000000,amount:5600000}]}, 외주비:{p:5000000,q:0,details:[{type:'계획',vendor:'앱코리아',amount:5000000,po:'PO-TBD'}]}, 재료비:{p:700000,q:0,details:[{type:'계획',item:'최종 납품 비용',amount:700000,po:'PO-TBD'}]}, 경비:{p:300000,q:0,details:[{type:'계획',item:'교통비/식비',amount:300000}]}, 'A/S Cost':{p:10000000,q:0,details:[{type:'계획',vendor:'앱코리아 A/S팀',amount:10000000,po:'PO-TBD'}]} },
    ]
  },

  // ── 보안 시스템 구축 ──────────────────
  sec: {
    projName:'보안 시스템 구축', stage:'종료보고', dplus:452,
    start:'2025-02', end:'2026-06', current:'2026-04',
    plan:{ 인건비:120000000, 외주비:270000000, 재료비:40000000, 경비:15000000, 'A/S Cost':5000000 },
    transfer:{ 인건비:-10000000, 외주비:10000000, 재료비:0, 경비:0, 'A/S Cost':0 },
    months:[
      { m:'2025-02', type:'actual', 인건비:{a:8000000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.47,unitPrice:17000000,amount:8000000}]}, 외주비:{a:18000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:18000000,po:'PO-S-2025-001'}]}, 재료비:{a:2000000,q:0,details:[{type:'실적',item:'방화벽 장비',amount:2000000,po:'PO-SM-2025-001'}]}, 경비:{a:800000,q:0,details:[{type:'실적',item:'교통비/식비',amount:800000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-03', type:'actual', 인건비:{a:8500000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.5,unitPrice:17000000,amount:8500000}]}, 외주비:{a:19000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:19000000,po:'PO-S-2025-001'}]}, 재료비:{a:2500000,q:0,details:[{type:'실적',item:'IDS/IPS 장비',amount:2500000,po:'PO-SM-2025-002'}]}, 경비:{a:900000,q:0,details:[{type:'실적',item:'교통비/식비',amount:900000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-04', type:'actual', 인건비:{a:9000000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.53,unitPrice:17000000,amount:9000000}]}, 외주비:{a:20000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:12000000,po:'PO-S-2025-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-002'}]}, 재료비:{a:3000000,q:0,details:[{type:'실적',item:'침입탐지 솔루션',amount:3000000,po:'PO-SM-2025-003'}]}, 경비:{a:1000000,q:0,details:[{type:'실적',item:'출장비/교통비/식비',amount:1000000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-05', type:'actual', 인건비:{a:9200000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.54,unitPrice:17000000,amount:9200000}]}, 외주비:{a:21000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:13000000,po:'PO-S-2025-003'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-002'}]}, 재료비:{a:3000000,q:0,details:[{type:'실적',item:'보안 취약점 스캔 도구',amount:3000000,po:'PO-SM-2025-004'}]}, 경비:{a:1000000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1000000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-06', type:'actual', 인건비:{a:9500000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.56,unitPrice:17000000,amount:9500000}]}, 외주비:{a:22000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:14000000,po:'PO-S-2025-003'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-004'}]}, 재료비:{a:3000000,q:0,details:[{type:'실적',item:'SIEM 솔루션 라이선스',amount:3000000,po:'PO-SM-2025-005'}]}, 경비:{a:1100000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1100000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-07', type:'actual', 인건비:{a:9500000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.56,unitPrice:17000000,amount:9500000}]}, 외주비:{a:22000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:14000000,po:'PO-S-2025-003'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-004'}]}, 재료비:{a:3200000,q:0,details:[{type:'실적',item:'보안 패치 적용 비용',amount:3200000,po:'PO-SM-2025-006'}]}, 경비:{a:1100000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1100000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-08', type:'actual', 인건비:{a:9800000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.58,unitPrice:17000000,amount:9800000}]}, 외주비:{a:23000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:15000000,po:'PO-S-2025-005'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-004'}]}, 재료비:{a:3500000,q:0,details:[{type:'실적',item:'침투테스트 도구',amount:3500000,po:'PO-SM-2025-007'}]}, 경비:{a:1200000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1200000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-09', type:'actual', 인건비:{a:10000000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.59,unitPrice:17000000,amount:10000000}]}, 외주비:{a:24000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:16000000,po:'PO-S-2025-005'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-006'}]}, 재료비:{a:3500000,q:0,details:[{type:'실적',item:'로그 분석 시스템',amount:3500000,po:'PO-SM-2025-008'}]}, 경비:{a:1200000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1200000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-10', type:'actual', 인건비:{a:10200000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.6,unitPrice:17000000,amount:10200000}]}, 외주비:{a:25000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:17000000,po:'PO-S-2025-005'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-006'}]}, 재료비:{a:3800000,q:0,details:[{type:'실적',item:'보안 감사 비용',amount:3800000,po:'PO-SM-2025-009'}]}, 경비:{a:1300000,q:0,details:[{type:'실적',item:'출장비/교통비/식비',amount:1300000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-11', type:'actual', 인건비:{a:10500000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.62,unitPrice:17000000,amount:10500000}]}, 외주비:{a:25000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:17000000,po:'PO-S-2026-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2025-006'}]}, 재료비:{a:4000000,q:0,details:[{type:'실적',item:'취약점 보고서 작성',amount:4000000,po:'PO-SM-2025-010'}]}, 경비:{a:1300000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1300000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2025-12', type:'actual', 인건비:{a:10500000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.62,unitPrice:17000000,amount:10500000}]}, 외주비:{a:26000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:18000000,po:'PO-S-2026-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2026-002'}]}, 재료비:{a:4000000,q:0,details:[{type:'실적',item:'연말 보안 점검',amount:4000000,po:'PO-SM-2025-011'}]}, 경비:{a:1400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-01', type:'actual', 인건비:{a:10800000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.64,unitPrice:17000000,amount:10800000}]}, 외주비:{a:27000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:19000000,po:'PO-S-2026-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2026-002'}]}, 재료비:{a:4200000,q:0,details:[{type:'실적',item:'납품 전 최종 스캔',amount:4200000,po:'PO-SM-2026-001'}]}, 경비:{a:1400000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1400000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-02', type:'actual', 인건비:{a:11000000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.65,unitPrice:17000000,amount:11000000}]}, 외주비:{a:27000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:19000000,po:'PO-S-2026-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2026-003'}]}, 재료비:{a:4200000,q:0,details:[{type:'실적',item:'보안 문서 작성 비용',amount:4200000,po:'PO-SM-2026-002'}]}, 경비:{a:1500000,q:0,details:[{type:'실적',item:'출장비/교통비/식비',amount:1500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-03', type:'actual', 인건비:{a:11000000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.65,unitPrice:17000000,amount:11000000}]}, 외주비:{a:27000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:19000000,po:'PO-S-2026-001'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2026-003'}]}, 재료비:{a:4300000,q:0,details:[{type:'실적',item:'검수 장비 임대',amount:4300000,po:'PO-SM-2026-003'}]}, 경비:{a:1500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-04', type:'actual', 인건비:{a:11200000,q:0,details:[{type:'실적',name:'정미래',org:'PM',role:'PM 리딩',mm:0.66,unitPrice:17000000,amount:11200000}]}, 외주비:{a:27000000,q:0,details:[{type:'실적',vendor:'시큐어넷',amount:19000000,po:'PO-S-2026-002'},{type:'실적',vendor:'보안전문가 그룹',amount:8000000,po:'PO-S-2026-004'}]}, 재료비:{a:4500000,q:0,details:[{type:'실적',item:'최종 납품 패키지',amount:4500000,po:'PO-SM-2026-004'}]}, 경비:{a:1500000,q:0,details:[{type:'실적',item:'교통비/식비',amount:1500000}]}, 'A/S Cost':{a:0,q:0,details:[]} },
      { m:'2026-05', type:'plan', 인건비:{p:11300000,q:11300000,details:[{type:'투입확정',name:'정미래',org:'PM',role:'종료보고',mm:0.66,unitPrice:17000000,amount:11300000}]}, 외주비:{p:10000000,q:10000000,details:[{type:'투입확정',vendor:'시큐어넷',amount:10000000,po:'PO-S-2026-005'}]}, 재료비:{p:3000000,q:3000000,details:[{type:'투입확정',item:'최종 보안 보고서',amount:3000000,po:'PO-SM-2026-005'}]}, 경비:{p:1000000,q:0,details:[{type:'계획',item:'교통비/식비',amount:1000000}]}, 'A/S Cost':{p:2500000,q:2500000,details:[{type:'투입확정',vendor:'시큐어넷 A/S',amount:2500000,po:'PO-AS-S-001'}]} },
      { m:'2026-06', type:'plan', 인건비:{p:8300000,q:0,details:[{type:'계획',name:'정미래',org:'PM',role:'완료보고',mm:0.49,unitPrice:17000000,amount:8300000}]}, 외주비:{p:8000000,q:0,details:[{type:'계획',vendor:'시큐어넷',amount:8000000,po:'PO-TBD'}]}, 재료비:{p:1300000,q:0,details:[{type:'계획',item:'최종 정산',amount:1300000,po:'PO-TBD'}]}, 경비:{p:800000,q:0,details:[{type:'계획',item:'교통비/식비',amount:800000}]}, 'A/S Cost':{p:2500000,q:0,details:[{type:'계획',vendor:'시큐어넷 A/S',amount:2500000,po:'PO-TBD'}]} },
    ]
  },
};

// ════════════════════════════════════════
//  집계 헬퍼
// ════════════════════════════════════════
BUDGET_SOURCE.budgetMock = {
  projName:'예산관리시스템 목업용', stage:'수행', dplus:62,
  start:'2026-06', end:'2026-12', current:'2026-06',
  plan:{ 인건비:240000000, 외주비:320000000, 재료비:50000000, 경비:30000000, 'A/S Cost':0 },
  transfer:{ 인건비:-20000000, 외주비:25000000, 재료비:-10000000, 경비:5000000, 'A/S Cost':0 },
  months:[
    { m:'2026-06', type:'actual',
      인건비:{ a:38000000, q:0, details:[
        { type:'실적', name:'한민석', org:'PMO', role:'PM/현장대리', mm:1.0, unitPrice:18000000, amount:18000000 },
        { type:'실적', name:'이봄', org:'분석설계', role:'업무 분석', mm:1.0, unitPrice:20000000, amount:20000000 },
      ]},
      외주비:{ a:42000000, q:0, details:[
        { type:'실적', vendor:'BP Korea', amount:42000000, po:'PO-BM-2026-001' },
      ]},
      재료비:{ a:4500000, q:0, details:[
        { type:'실적', item:'디자인/프로토타입 툴 라이선스', amount:4500000, po:'PO-BM-M-001' },
      ]},
      경비:{ a:2500000, q:0, details:[
        { type:'실적', item:'워크숍/회의비', amount:1500000 },
        { type:'실적', item:'출장/교통비', amount:1000000 },
      ]},
      'A/S Cost':{ a:0, q:0, details:[] },
    },
    { m:'2026-07', type:'plan',
      인건비:{ p:42000000, q:42000000, details:[
        { type:'투입확정', name:'한민석', org:'PMO', role:'PM/현장대리', mm:1.0, unitPrice:18000000, amount:18000000 },
        { type:'투입확정', name:'이봄', org:'분석설계', role:'화면/업무 설계', mm:1.0, unitPrice:20000000, amount:20000000 },
        { type:'투입확정', name:'정다은', org:'QA', role:'테스트 설계', mm:0.25, unitPrice:16000000, amount:4000000 },
      ]},
      외주비:{ p:62000000, q:62000000, details:[
        { type:'투입확정', vendor:'BP Korea', amount:38000000, po:'PO-BM-2026-002' },
        { type:'투입확정', vendor:'Vietnam Front Team', amount:24000000, po:'PO-BM-2026-003' },
      ]},
      재료비:{ p:6000000, q:0, details:[{ type:'계획', item:'개발 서버/테스트 계정', amount:6000000, po:'PO-TBD' }]},
      경비:{ p:3500000, q:0, details:[{ type:'계획', item:'회의/출장 예비비', amount:3500000 }]},
      'A/S Cost':{ p:0, q:0, details:[] },
    },
    { m:'2026-08', type:'plan',
      인건비:{ p:40000000, q:0, details:[
        { type:'계획', name:'이봄', org:'분석설계', role:'UAT 대응', mm:1.0, unitPrice:20000000, amount:20000000 },
        { type:'계획', name:'정다은', org:'QA', role:'통합 테스트', mm:1.25, unitPrice:16000000, amount:20000000 },
      ]},
      외주비:{ p:70000000, q:0, details:[{ type:'계획', vendor:'BP Korea', amount:70000000, po:'PO-TBD' }]},
      재료비:{ p:7000000, q:0, details:[{ type:'계획', item:'성능 테스트 도구', amount:7000000, po:'PO-TBD' }]},
      경비:{ p:4000000, q:0, details:[{ type:'계획', item:'교육/전환 준비비', amount:4000000 }]},
      'A/S Cost':{ p:0, q:0, details:[] },
    },
  ],
};

const CATS = ['인건비','외주비','재료비','경비','A/S Cost'];

function budgetMockMonth(month, type, vals) {
  if (type === 'actual') {
    return {
      m: month, type,
      인건비:{ a:vals.labor, q:0, details:[{ type:'실적', name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계', mm:1, unitPrice:vals.labor, amount:vals.labor }] },
      외주비:{ a:vals.outsource, q:0, details:[{ type:'실적', vendor:'BP Korea', amount:vals.outsource, po:`PO-BM-${month}` }] },
      재료비:{ a:vals.material, q:0, details:[{ type:'실적', item:'개발/테스트 도구', amount:vals.material, po:`PO-BM-M-${month}` }] },
      경비:{ a:vals.expense, q:0, details:[{ type:'실적', item:'회의/출장/운영비', amount:vals.expense }] },
      'A/S Cost':{ a:0, q:0, details:[] },
    };
  }
  return {
    m: month, type,
    인건비:{ p:vals.labor, q:vals.laborQ || 0, details:[{ type:vals.laborQ ? '투입확정' : '계획', name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계', mm:1, unitPrice:vals.labor, amount:vals.labor }] },
    외주비:{ p:vals.outsource, q:vals.outsourceQ || 0, details:[{ type:vals.outsourceQ ? '투입확정' : '계획', vendor:'BP Korea / Vietnam Front Team', amount:vals.outsource, po:vals.outsourceQ ? `PO-BM-${month}` : 'PO-TBD' }] },
    재료비:{ p:vals.material, q:vals.materialQ || 0, details:[{ type:vals.materialQ ? '투입확정' : '계획', item:'개발/테스트 도구', amount:vals.material, po:vals.materialQ ? `PO-BM-M-${month}` : 'PO-TBD' }] },
    경비:{ p:vals.expense, q:vals.expenseQ || 0, details:[{ type:vals.expenseQ ? '투입확정' : '계획', item:'회의/출장/운영비', amount:vals.expense }] },
    'A/S Cost':{ p:0, q:0, details:[] },
  };
}

BUDGET_SOURCE.budgetMock = {
  projName:'예산관리시스템 목업용', stage:'수행', dplus:180,
  start:'2026-01', end:'2027-11', current:'2026-06',
  // [2026.09.01] V3 CP총액과 같은 값으로 둡니다. 버전 스냅샷이 월별 금액을 CP/plan 배율로
  //   다시 곱하는데, 두 값이 다르면 1.0131… 같은 배율이 생겨 화면에 잔돈이 남습니다.
  plan:{ 인건비:800000000, 외주비:1200000000, 재료비:160000000, 경비:100000000, 'A/S Cost':50000000 },
  transfer:{ 인건비:-30000000, 외주비:45000000, 재료비:-10000000, 경비:-5000000, 'A/S Cost':0 },
  months:[
    budgetMockMonth('2026-01','actual',{ labor:18000000, outsource:26000000, material:3500000, expense:2200000 }),
    budgetMockMonth('2026-02','actual',{ labor:21000000, outsource:31000000, material:4200000, expense:2500000 }),
    budgetMockMonth('2026-03','actual',{ labor:24000000, outsource:35000000, material:4800000, expense:2800000 }),
    budgetMockMonth('2026-04','actual',{ labor:26000000, outsource:39000000, material:5200000, expense:3000000 }),
    budgetMockMonth('2026-05','actual',{ labor:29000000, outsource:43000000, material:5800000, expense:3300000 }),
    budgetMockMonth('2026-06','actual',{ labor:32000000, outsource:48000000, material:6500000, expense:3600000 }),
    budgetMockMonth('2026-07','plan',{ labor:33000000, laborQ:33000000, outsource:52000000, outsourceQ:52000000, material:7000000, materialQ:3000000, expense:3800000 }),
    budgetMockMonth('2026-08','plan',{ labor:34000000, outsource:55000000, outsourceQ:30000000, material:7200000, expense:4000000 }),
    budgetMockMonth('2026-09','plan',{ labor:36000000, outsource:56000000, material:7500000, expense:4100000 }),
    budgetMockMonth('2026-10','plan',{ labor:35000000, outsource:57000000, material:7400000, expense:4200000 }),
    budgetMockMonth('2026-11','plan',{ labor:36000000, outsource:58000000, material:7500000, expense:4300000 }),
    budgetMockMonth('2026-12','plan',{ labor:36000000, outsource:59000000, material:7600000, expense:4400000 }),
    budgetMockMonth('2027-01','plan',{ labor:37000000, outsource:60000000, material:7800000, expense:4500000 }),
    budgetMockMonth('2027-02','plan',{ labor:37000000, outsource:61000000, material:7900000, expense:4600000 }),
    budgetMockMonth('2027-03','plan',{ labor:39000000, outsource:62000000, material:9000000, expense:4700000 }),
    budgetMockMonth('2027-04','plan',{ labor:39000000, outsource:62000000, material:9000000, expense:4700000 }),
    budgetMockMonth('2027-05','plan',{ labor:40000000, outsource:61000000, material:7800000, expense:4600000 }),
    budgetMockMonth('2027-06','plan',{ labor:40000000, outsource:60000000, material:7600000, expense:4500000 }),
    budgetMockMonth('2027-07','plan',{ labor:39000000, outsource:57000000, material:7200000, expense:4300000 }),
    budgetMockMonth('2027-08','plan',{ labor:37000000, outsource:52000000, material:6500000, expense:4000000 }),
    budgetMockMonth('2027-09','plan',{ labor:32000000, outsource:46000000, material:5500000, expense:3600000 }),
    budgetMockMonth('2027-10','plan',{ labor:28000000, outsource:38000000, material:4500000, expense:3200000 }),
    budgetMockMonth('2027-11','plan',{ labor:24000000, outsource:28000000, material:3500000, expense:2800000 }),
  ],
};

function catVal(mo, cat) {
  const c = mo[cat]; if (!c) return { a:0, q:0, p:0 };
  return mo.type === 'actual' ? { a: c.a||0, q: c.q||0, p:0 } : { a:0, q: c.q||0, p: c.p||0 };
}
function calcActual(data, cat)    { return data.months.reduce((s,m)=>s+catVal(m,cat).a, 0); }
function calcQuasi(data, cat)     { return data.months.reduce((s,m)=>s+catVal(m,cat).q, 0); }
function calcPlanTotal(data, cat) { return data.months.filter(m=>m.type==='plan').reduce((s,m)=>s+(m[cat]?m[cat].p||0:0), 0); }
function calcPlanQuasi(data, cat) { return data.months.filter(m=>m.type==='plan').reduce((s,m)=>s+(m[cat]?m[cat].q||0:0), 0); }
function calcRemain(data, cat)    { return (data.plan[cat]||0) - calcActual(data,cat) - calcQuasi(data,cat); }

// ════════════════════════════════════════
//  초기화
// ════════════════════════════════════════
// 프로젝트 일정 기준 정보 (그래프용)
const BUDGET_PROJ_META = {
  cloud:  { name:'클라우드 인프라 고도화', start:'2025-01', end:'2026-08', budget:1067301838, spent:552500000,
            stage:'진행중',  stageSt:'background:#dbeafe;color:#1d4ed8', riskChip:'높음 2건', riskSt:'background:#fee2e2;color:#991b1b' },
  erp:    { name:'ERP 고도화',            start:'2025-06', end:'2026-09', budget:620000000,  spent:297600000,
            stage:'진행중',  stageSt:'background:#dbeafe;color:#1d4ed8', riskChip:'중간 2건', riskSt:'background:#fef3c7;color:#92400e' },
  mobile: { name:'모바일 앱 리뉴얼',      start:'2025-08', end:'2026-06', budget:380000000,  spent:273600000,
            stage:'진행중',  stageSt:'background:#dcfce7;color:#166534', riskChip:'낮음 2건', riskSt:'background:#dcfce7;color:#166534' },
  sec:    { name:'보안 시스템 구축',       start:'2026-04', end:'2026-12', budget:290000000,  spent:151100000,
            stage:'종료보고', stageSt:'background:#ffedd5;color:#9a3412', riskChip:'높음 1건', riskSt:'background:#fee2e2;color:#991b1b' },
};

function monthDiff(a, b) {
  // a, b: 'YYYY-MM' strings — returns months from a to b
  const [ay,am] = a.split('-').map(Number);
  const [by,bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

function renderBudgetOverviewGraph(forMain = false, filterKey = null) {
  const TODAY = '2026-04';
  const allStarts = Object.values(BUDGET_PROJ_META).map(m => m.start);
  const allEnds   = Object.values(BUDGET_PROJ_META).map(m => m.end);
  const minStart  = allStarts.sort()[0];
  const maxEnd    = allEnds.sort().reverse()[0];
  const totalSpan = monthDiff(minStart, maxEnd) + 1;
  const todayOff  = monthDiff(minStart, TODAY);
  const todayPct  = Math.min(100, Math.max(0, (todayOff / totalSpan) * 100));

  const namePx = forMain ? 170 : 200;
  const gridCols = forMain
    ? `${namePx}px 1fr 80px 106px 118px`
    : `${namePx}px 1fr 130px`;

  // 분기별 눈금
  const tickMonths = [];
  let cur = minStart;
  while (cur <= maxEnd) {
    tickMonths.push(cur);
    const [y, mo] = cur.split('-').map(Number);
    const nm = mo + 3 > 12
      ? `${y+1}-${String(mo+3-12).padStart(2,'0')}`
      : `${y}-${String(mo+3).padStart(2,'0')}`;
    cur = nm;
  }
  const ticks = tickMonths.map(t => {
    const pct = (monthDiff(minStart, t) / totalSpan) * 100;
    return `<div class="bov-tick" style="left:${pct.toFixed(1)}%">${t.slice(2).replace('-','.')}</div>`;
  }).join('');

  const entries = filterKey
    ? Object.entries(BUDGET_PROJ_META).filter(([k]) => k === filterKey)
    : Object.entries(BUDGET_PROJ_META);

  const rows = entries.map(([k, m]) => {
    const startPct  = (monthDiff(minStart, m.start) / totalSpan) * 100;
    const durPct    = (monthDiff(m.start, m.end) / totalSpan) * 100;
    const elapsed   = Math.max(0, Math.min(monthDiff(m.start, TODAY), monthDiff(m.start, m.end)));
    const schedPct  = Math.round((elapsed / monthDiff(m.start, m.end)) * 100);
    const budgetPct = Math.round((m.spent / m.budget) * 100);
    const isCurProj = k === currentBudgetProj;

    const diff = budgetPct - schedPct;
    const diffColor = diff > 10 ? '#ef4444' : diff > 0 ? '#f59e0b' : '#22c55e';
    const diffLabel = diff > 0 ? `+${diff}%p 과다` : diff < 0 ? `${diff}%p 여유` : '일치';

    const onclick = `openBudgetProjectScreen('${k}')`;

    const stageRiskCols = forMain ? `
        <div style="display:flex;align-items:center;justify-content:center">
          <span class="stage-pill" style="${m.stageSt}">${m.stage}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:center">
          <span class="risk-chip" style="${m.riskSt}">${m.riskChip}</span>
        </div>` : '';

    return `
      <div class="bov-proj-row ${isCurProj && !forMain ? 'bov-active' : ''}"
           style="grid-template-columns:${gridCols}"
           onclick="${onclick}">
        <div>
          <div class="bov-name">${m.name}</div>
          <div class="bov-meta">${m.start} ~ ${m.end}</div>
        </div>

        <div class="bov-bars-col">
          <div class="bov-bar-label">일정 <span class="bov-pct-badge">${schedPct}%</span></div>
          <div class="bov-timeline-bg">
            <div class="bov-proj-bar" style="left:${startPct.toFixed(1)}%;width:${durPct.toFixed(1)}%">
              <div class="bov-proj-elapsed" style="width:${schedPct}%"></div>
            </div>
            <div class="bov-today-line" style="left:${todayPct.toFixed(1)}%"></div>
          </div>
          <div class="bov-bar-label" style="margin-top:6px">예산 소진율 <span class="bov-pct-badge" style="background:${diff>10?'#fee2e2':diff>0?'#fef3c7':'#dcfce7'};color:${diffColor}">${budgetPct}%</span></div>
          <div class="bov-budget-bg">
            <div class="bov-budget-fill" style="width:${Math.min(100,budgetPct)}%;background:${diff>10?'#ef4444':diff>0?'#f59e0b':'#3b82f6'}"></div>
            <div class="bov-budget-sched-marker" style="left:${schedPct}%" title="일정 기준 ${schedPct}%"></div>
          </div>
        </div>

        ${stageRiskCols}

        <div class="bov-diff-col">
          <div class="bov-diff-val" style="color:${diffColor}">${diffLabel}</div>
          <div class="bov-diff-sub">예산 ${fmt(m.spent)}원<br>/ ${fmt(m.budget)}원</div>
        </div>
      </div>`;
  }).join('');

  const colHead = forMain ? `
    <div style="display:grid;grid-template-columns:${gridCols};gap:12px;padding:8px 20px;font-size:13px;font-weight:600;color:#94a3b8;border-bottom:1px solid #f1f5f9;background:#fafbfd">
      <div>프로젝트</div><div style="padding-left:4px">일정 / 예산 소진율</div>
      <div style="text-align:center">단계</div><div style="text-align:center">리스크</div><div style="text-align:right">편차</div>
    </div>` : '';

  return `
    <div class="card bov-card">
      <div class="card-head">
        <span class="card-title">예산 통합 현황</span>
        <div style="display:flex;align-items:center;gap:14px;font-size:14px;color:#64748b">
          <div style="display:flex;align-items:center;gap:5px"><div style="width:28px;height:4px;background:#3b82f6;border-radius:2px"></div>일정 진행</div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:28px;height:4px;background:#94a3b8;border-radius:2px;border:1px dashed #94a3b8"></div>예산 소진</div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:2px;height:14px;background:#ef4444"></div>오늘</div>
        </div>
      </div>
      ${colHead}
      <div class="bov-body">
        <div class="bov-tick-row" style="padding-left:${namePx}px;position:relative;height:20px;margin-bottom:4px">
          ${ticks}
        </div>
        ${rows}
      </div>
      <div style="padding:8px 20px;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9;background:#fafbfc">
        ※ 예산 소진율이 일정 진행률보다 높으면 과다 집행 위험. 세로 점선(│)은 일정 기준 선입니다. ${forMain ? '클릭 시 예산현황 상세 조회.' : '프로젝트 클릭 시 상세 조회.'}
      </div>
    </div>`;
}

function renderOutsourceContractPanel(data) {
  const rows = getOutsourceRows();
  const formOpen = outsourceRegistrationMode === 'new' || outsourceRegistrationMode === 'edit';
  const editing = editingOutsourceContractId ? rows.find(r => r.id === editingOutsourceContractId) : null;
  const vendor = editing ? outsourceVendorPool.find(v => v.id === editing.vendorId) : getSelectedOutsourceVendor();
  const query = outsourceSearchQuery.trim().toLowerCase();
  const vendors = outsourceVendorPool.filter(v => !query || `${v.name} ${v.specialty} ${v.owner}`.toLowerCase().includes(query));
  const quotes = purchaseQuoteData[vendor?.id] || [];
  const selectedQuote = getSelectedOutsourceQuote(vendor, editing);
  const quoteYn = editing && !editing.quoteNo ? 'N' : outsourceQuoteRequired;
  const quoteSearchDisabled = quoteYn === 'N';
  const defaultStartDate = editing ? editing.startDate : (outsourceInspectionPreviewStartDate || '2026-07-01');
  const defaultEndDate = editing ? editing.endDate : (outsourceInspectionPreviewEndDate || '2026-12-31');
  const defaultQuoteNo = editing ? editing.quoteNo : (quoteYn === 'Y' ? (selectedQuote?.quoteNo || '') : '');
  const inspectionGenerated = !!(editing?.inspectionPlan?.length || outsourceInspectionPlanPreviewQuoteNo === defaultQuoteNo);

  if (outsourceKind === 'other') {
    return renderOutsourceShell('기타외주비 계획 등록', '집행 예정월과 금액 중심으로 관리합니다.', renderOtherOutsourcePanel());
  }
  if (outsourceKind === 'ma') {
    return renderOutsourceShell('MA 외주비 등록', '견적 데이터와 손익인식 기준을 함께 관리합니다.', renderMaOutsourcePanel());
  }

  const contractRows = rows.map(row => `
    <div class="os-reg-row ${selectedOutsourceContractId === row.id ? 'active' : ''}">
      <div class="os-reg-main"><strong>${row.vendorName}</strong><span>${row.title}</span></div>
      <div>${row.startDate} ~ ${row.endDate}</div>
      <div class="os-reg-num">${fmt(row.contractAmount)}원</div>
      <div>${row.quoteNo || '-'}</div>
      <div><b class="os-po">${row.poNo || 'PO 미매핑'}</b></div>
      <div><i class="labor-status ${row.status === '계약완료' ? 'done' : 'saved'}">${row.status}</i></div>
      <div class="labor-reg-actions"><button onclick="editOutsourceContract('${row.id}')">수정</button></div>
    </div>
  `).join('');

  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">업체별 계약 및 PO 매핑 현황</div>
        </div>
        <div class="labor-actions compact">
          <button class="labor-main-btn" onclick="openNewOutsourceContract()">신규 외주 계약 등록</button>
        </div>
      </div>

      ${renderOutsourceKindTabs()}

      <div class="os-registered-card">
        <div class="os-reg-header">
          <span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span><span></span>
        </div>
        <div class="os-reg-list">${contractRows || '<div class="labor-empty">등록된 외주 계약이 없습니다.</div>'}</div>
      </div>

      ${formOpen ? `
        <div class="labor-edit-flow-card">
          <div class="labor-flow-title">
            <strong>${outsourceRegistrationMode === 'new' ? '신규 외주 계약 등록' : '외주 계약 수정'}</strong>
            <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
          </div>
          <div class="labor-flow">
            <span>업체검색</span><span>계약정보 입력</span><span>견적 확인</span><span>계약완료</span><span>PO 매핑</span>
          </div>

          <div class="os-edit-grid two">
            <div class="labor-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">1. 업체 선택</div>
                  <p>구매시스템에 등록된 BP만 선택할 수 있습니다.</p>
                </div>
              </div>
              <div class="os-lookup-field">
                <div>
                  <strong>${vendor ? vendor.name : '업체를 선택해주세요'}</strong>
                  <span>${vendor ? `${vendor.specialty} · 담당 ${vendor.owner} · 등급 ${vendor.grade}` : '돋보기를 눌러 구매시스템 BP를 검색하세요.'}</span>
                </div>
                <button type="button" onclick="toggleOutsourceVendorLookup()" title="구매시스템 BP 검색">⌕</button>
              </div>
            </div>

            <div class="labor-card">
              <div class="labor-card-title">2. 외주계약 기본정보</div>
              <div class="labor-form">
                <label><span>계약 시작일</span><input id="outsource-start" type="date" value="${defaultStartDate}"></label>
                <label><span>계약 종료일</span><input id="outsource-end" type="date" value="${defaultEndDate}"></label>
                <label><span>계약명</span><input id="outsource-contract-title" value="${editing ? editing.title : (quoteYn === 'Y' ? (selectedQuote?.title || '') : '')}"></label>
                <label><span>계약금액</span><input id="outsource-contract-amount" inputmode="numeric" value="${editing ? editing.contractAmount : (quoteYn === 'Y' ? (selectedQuote?.amount || '') : '')}"></label>
                <label class="os-quote-yn"><span>견적 여부</span>
                  <div class="os-radio-row">
                    <label><input type="radio" name="outsource-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('Y')"> Y</label>
                    <label><input type="radio" name="outsource-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('N')"> N</label>
                  </div>
                </label>
                <label><span>견적번호</span>
                  <div class="os-lookup-input">
                    <input id="outsource-quote-no" value="${defaultQuoteNo}" ${quoteYn === 'Y' ? 'readonly' : ''} placeholder="${quoteYn === 'Y' ? '돋보기로 견적 선택' : '견적 없음'}">
                    <button type="button" ${quoteSearchDisabled ? 'disabled' : ''} onclick="toggleOutsourceQuoteLookup()" title="구매시스템 견적 검색">⌕</button>
                  </div>
                </label>
              </div>
              <div class="labor-mm-guide">
                <strong>계약금액이 등록 외주비 금액입니다.</strong>
                <span>계약완료 시 4500으로 시작하는 10자리 PO번호가 매핑됩니다.</span>
              </div>
              <div class="labor-actions">
                <button class="labor-main-btn" onclick="saveOutsourceContractDraft()">계약 기본정보 저장</button>
                ${editing ? `<button class="labor-main-btn teal" onclick="completeOutsourceContract('${editing.id}')">계약완료 / PO 매핑</button>` : ''}
              </div>
            </div>
          </div>

          ${renderOutsourceQuoteBreakdownPanel(defaultQuoteNo, defaultStartDate, defaultEndDate, inspectionGenerated, editing?.inspectionPlan)}
        </div>` : ''}

      ${outsourceVendorLookupOpen ? `
        <div class="os-popup-backdrop" onclick="if(event.target===this)toggleOutsourceVendorLookup()">
          <div class="os-popup">
            <div class="os-popup-head">
              <strong>구매시스템 BP 검색</strong>
              <button onclick="toggleOutsourceVendorLookup()">×</button>
            </div>
            <input class="labor-search-input" value="${outsourceSearchQuery}" placeholder="업체명, 담당자, 수행영역 검색" oninput="updateOutsourceSearch(this.value)">
            <div class="os-popup-list">
              ${vendors.map(v => `
                <button class="labor-candidate ${vendor && vendor.id === v.id ? 'active' : ''}" onclick="selectOutsourceVendor('${v.id}')">
                  <strong>${v.name}</strong>
                  <span>${v.specialty} · 담당 ${v.owner}</span>
                  <em>평가등급 ${v.grade}</em>
                </button>
              `).join('') || '<div class="labor-empty">구매시스템에 등록된 BP가 없습니다.</div>'}
            </div>
          </div>
        </div>` : ''}

      ${quoteYn === 'Y' && outsourceQuoteLookupOpen ? `
        <div class="os-popup-backdrop" onclick="if(event.target===this)toggleOutsourceQuoteLookup()">
          <div class="os-popup">
            <div class="os-popup-head">
              <strong>구매시스템 견적 검색</strong>
              <button onclick="toggleOutsourceQuoteLookup()">×</button>
            </div>
            <div class="labor-sync-note">${purchaseQuoteLastSyncedAt ? `최근 조회 ${purchaseQuoteLastSyncedAt}` : '구매시스템 최종 수취 견적입니다.'}</div>
            <div class="os-popup-list">
              ${quotes.map(q => `
                <button class="os-quote-item" onclick="applyPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
                  <strong>${q.quoteNo}</strong>
                  <span>${q.title}</span>
                  <b>${fmt(q.amount)}원</b>
                  <em>수취 ${q.receivedAt}</em>
                </button>
              `).join('') || '<div class="labor-empty">구매시스템에 수취된 견적이 없습니다.</div>'}
            </div>
          </div>
        </div>` : ''}
    </div>`;
}

function renderBudgetAccountEditorLegacyBroken(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">업체별 계약금액과 PO 매핑 상태를 관리합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">견적 기반 품목 등록과 기타재료비 계획을 관리합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  if (account === '경비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">경비 수정</div>
            <div class="setup-editor-sub">계정별/월별 경비 계획을 입력하고, 통제 계정은 ERP 가용예산을 체크합니다.</div>
          </div>
        </div>
        ${renderExpensePlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function openBudgetProjectScreen(k) {
  currentBudgetProj = k;
  budgetScreenView = 'detail';
  budgetDetailStep = 'setup';
  budgetSetupStage = 'history';
  budgetSetupEditAccount = null;
  budgetTransferEditMode = false;
  budgetHistorySelectedVersion = (budgetTransferHistory[k] || [])[0]?.version || null;
  selectedLaborAssignmentId = (getLaborRows(k)[0] || {}).id || null;
  editingLaborAssignmentId = null;
  syncLaborAssignmentsToBudget(k);
  openNavGroup('sub-situation');
  setScreen('s-budget');
  setNav('nav-budget');
  renderBudgetPage();
}

function selectBudgetProjFull(k) { openBudgetProjectScreen(k); }

let budgetSearchQuery = '';
let budgetTypeFilter = '';
let budgetStatusFilter = '';
let budgetCustomerQuery = '';
let budgetSalesOrgQuery = '';
let budgetPmQuery = '';

const EXEC_BUDGET_PROJECTS = [
  { key:'budgetMock', no:'30131234-D001', name:'예산관리시스템 목업용', type:'SI-AD', status:'수행', pm:'이봄', salesOrg:'NOVA PMO팀', customer:'내부 목업', period:'2026-01-01 ~ 2027-11-30' },
  { key:'cloud',  no:'IV107786', name:'26년 AX Solution서비스5팀 그룹웨어 사업개발 활동 관리', type:'사내-활동관리', status:'착수완료', pm:'김민구', salesOrg:'AX Solution서비스5팀', customer:'', period:'2026-06-01 ~ 2026-12-31' },
  { key:'erp',    no:'IV107785', name:'출입통제 시스템 노후 서버 교체', type:'투자-사내IT', status:'수행', pm:'안세원', salesOrg:'스마트워크팀', customer:'', period:'2026-06-22 ~ 2026-08-31' },
  { key:'mobile', no:'IV107784', name:'SK에코플랜트 배터리얼즈 26년 현업 주도 SOP 체계 구축 지원 및 자문_선투입', type:'원가-선투입', status:'착수완료', pm:'김종원', salesOrg:'AIM본부(제조컨설팅)', customer:'SK에코플랜트', period:'2026-06-22 ~ 2026-08-21' },
  { key:'sec',    no:'IV107783', name:'CSWIND WAIV 고도화 사업 선투입', type:'원가-선투입', status:'착수완료', pm:'김보경', salesOrg:'AI Product1팀', customer:'CSWIND', period:'2026-06-19 ~ 2026-07-19' },
  { key:'erp',    no:'IV107782', name:'SKC_26년 HRIS 조직/인사 기능확대 프로젝트', type:'원가-선투입', status:'수행', pm:'박용준', salesOrg:'AX ERP서비스3팀', customer:'SKC', period:'2026-06-22 ~ 2026-07-31' },
  { key:'cloud',  no:'IV107781', name:'SKC_26년_AI_PMO_선투입', type:'원가-선투입', status:'착수완료', pm:'안정준', salesOrg:'Ackerton Partners', customer:'SKC', period:'2026-06-15 ~ 2026-08-14' },
  { key:'mobile', no:'IV107780', name:'Talent AX 사업지원 및 Pre-sales 활동', type:'사내-활동관리', status:'착수완료', pm:'송하경', salesOrg:'Talent AX사업팀', customer:'', period:'2026-07-01 ~ 2026-09-30' },
  { key:'sec',    no:'IV107779', name:'SKB 26년 ADAMS 운영 유지보수_선투입', type:'원가-선투입', status:'수행', pm:'전종희', salesOrg:'OSS서비스2팀', customer:'SK브로드밴드', period:'2026-06-21 ~ 2026-07-31' },
  { key:'mobile', no:'IV107778', name:'SKHy 26년 AI Agent 개발을 통한 TEST 운영 효율화 및 혁신 시스템_선투자', type:'원가-선투입', status:'수행', pm:'김화진', salesOrg:'AI서비스2팀', customer:'SK하이닉스', period:'2026-06-15 ~ 2026-07-15' },
  { key:'cloud',  no:'IV107777', name:'SKHy 26년 용인 Y1(M17) 제조 DT 시스템 Ph1', type:'원가-선투입', status:'착수완료', pm:'이충섭', salesOrg:'제조AX서비스5팀', customer:'SK하이닉스', period:'2026-07-01 ~ 2026-07-31' },
  { key:'erp',    no:'IV107776', name:'선투입_SKHy 26년 Inline EDC(Early Detect & Control) System 구축', type:'원가-선투입', status:'수행', pm:'전정상', salesOrg:'제조AX서비스4팀', customer:'SK하이닉스', period:'2026-06-22 ~ 2026-07-31' },
  { key:'sec',    no:'IV107775', name:'SKHy 26년 설비(Private)망 현황 파악 및 IDS 구성', type:'원가-선투입', status:'수행', pm:'차호열', salesOrg:'Hi-Tech Cloud PM팀', customer:'SK하이닉스', period:'2026-06-22 ~ 2026-07-19' },
  { key:'mobile', no:'IV107774', name:'SKHy 26년 업무자동화 및 위험예방을 위한 Agent개발(영상기반위험평가, ChatOps)', type:'원가-선투입', status:'수행', pm:'김종호', salesOrg:'AI Workforce2팀', customer:'SK하이닉스', period:'2026-06-18 ~ 2026-08-17' },
  { key:'cloud',  no:'IV107773', name:'SKHy 26년 업무자동화 및 위험예방을 위한 Agent개발(통합환경가문서)', type:'원가-선투입', status:'수행', pm:'김종호', salesOrg:'AI Workforce2팀', customer:'SK하이닉스', period:'2026-06-18 ~ 2026-08-17' },
  { key:'erp',    no:'IV107772', name:'SKHY ITO PMO', type:'원가-선투입', status:'착수완료', pm:'류홍규', salesOrg:'제조AX서비스3팀', customer:'SK하이닉스', period:'2026-07-01 ~ 2026-07-31' },
];

function resetBudgetListFilters() {
  budgetSearchQuery = '';
  budgetTypeFilter = '';
  budgetStatusFilter = '';
  budgetCustomerQuery = '';
  budgetSalesOrgQuery = '';
  budgetPmQuery = '';
  renderBudgetListView();
}

function execTypeClass(type) {
  if (type.includes('SI')) return 'si';
  if (type.includes('원가')) return 'cost';
  if (type.includes('투자')) return 'invest';
  if (type.includes('사내')) return 'inside';
  return 'default';
}

function execStatusClass(status) {
  if (status === '수행') return 'active';
  if (status === '착수완료') return 'ready';
  return 'default';
}

const BUDGET_ACCT_LABELS = ['인건비', '외주비', '재료비', '경비'];
let budgetTransferEditMode = false;
let budgetHistorySelectedVersion = null;
let laborSearchQuery = '';
let selectedLaborCandidateId = 'emp-lee';
let selectedLaborAssignmentId = 'lb-1001';
let editingLaborAssignmentId = null;
const laborCandidatePool = [
  { id:'emp-lee', name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계', pLevel:'P4', unitPrice:18000000 },
  { id:'emp-kim', name:'김하린', org:'AX 개발1팀', role:'Vue Front', pLevel:'P3', unitPrice:14500000 },
  { id:'emp-park', name:'박준서', org:'AX 개발2팀', role:'Java Backend', pLevel:'P3', unitPrice:15000000 },
  { id:'emp-choi', name:'최유진', org:'품질혁신팀', role:'QA/검증', pLevel:'P2', unitPrice:12000000 },
  { id:'emp-jung', name:'정민재', org:'Data Platform팀', role:'Oracle DBA', pLevel:'P5', unitPrice:21000000 },
];
const budgetLaborAssignments = {
  budgetMock: [
    {
      id:'lb-1001', personId:'emp-lee', name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계', pLevel:'P4', unitPrice:18000000,
      startDate:'2026-07-01', endDate:'2026-12-31', workType:'Full', totalMm:6, amount:108000000,
      status:'SCM 승인완료', requestedAt:'2026. 6. 24. 09:30', approvedAt:'2026. 6. 25. 16:10', scmDocNo:'SCM-LAB-20260624-001',
      monthly:{ '2026-07':1, '2026-08':1, '2026-09':1, '2026-10':1, '2026-11':1, '2026-12':1 },
    },
    {
      id:'lb-1002', personId:'emp-kim', name:'김하린', org:'AX 개발1팀', role:'Vue Front', pLevel:'P3', unitPrice:14500000,
      startDate:'2026-08-01', endDate:'2027-02-28', workType:'Part', totalMm:3.5, amount:50750000,
      status:'MM 저장완료', requestedAt:'', approvedAt:'', scmDocNo:'',
      monthly:{ '2026-08':0.5, '2026-09':0.5, '2026-10':0.5, '2026-11':0.5, '2026-12':0.5, '2027-01':0.5, '2027-02':0.5 },
    },
    {
      id:'lb-1003', personId:'emp-park', name:'박준서', org:'AX 개발2팀', role:'Java Backend', pLevel:'P3', unitPrice:15000000,
      startDate:'2026-07-15', endDate:'2026-11-30', workType:'Full', totalMm:0, amount:0,
      status:'MM 입력중', requestedAt:'', approvedAt:'', scmDocNo:'',
      monthly:{ '2026-07':0, '2026-08':0, '2026-09':0, '2026-10':0, '2026-11':0 },
    },
  ],
};
const budgetTransferHistory = {
  budgetMock: [
    {
      version: 3,
      changedAt: '2026. 6. 28. 15:20:00',
      changedBy: '이봄',
      changes: [
        { acct:'외주비', oldAdjusted:330000000, newAdjusted:345000000, diff:15000000, transfer:25000000 },
        { acct:'재료비', oldAdjusted:55000000, newAdjusted:40000000, diff:-15000000, transfer:-10000000 },
      ],
    },
    {
      version: 2,
      changedAt: '2026. 6. 20. 10:35:00',
      changedBy: '이봄',
      changes: [
        { acct:'인건비', oldAdjusted:235000000, newAdjusted:220000000, diff:-15000000, transfer:-20000000 },
        { acct:'경비', oldAdjusted:20000000, newAdjusted:35000000, diff:15000000, transfer:5000000 },
      ],
    },
    {
      version: 1,
      changedAt: '2026. 6. 10. 09:05:00',
      changedBy: '한민석',
      changes: [
        { acct:'인건비', oldAdjusted:240000000, newAdjusted:235000000, diff:-5000000, transfer:-5000000 },
        { acct:'외주비', oldAdjusted:320000000, newAdjusted:330000000, diff:10000000, transfer:10000000 },
        { acct:'경비', oldAdjusted:30000000, newAdjusted:20000000, diff:-10000000, transfer:-10000000 },
        { acct:'재료비', oldAdjusted:50000000, newAdjusted:55000000, diff:5000000, transfer:5000000 },
      ],
    },
  ],
};
let budgetTransferStateRestored = false;

function getBudgetProjectPm(projKey) {
  const row = EXEC_BUDGET_PROJECTS.find(p => p.key === projKey);
  return row ? row.pm : 'PM';
}

function getBudgetAdjusted(data, acct) {
  const transfer = data.transfer || {};
  return (data.plan[acct] || 0) + (transfer[acct] || 0);
}

function parseBudgetAmount(value) {
  return Number(String(value || '').replace(/[^\d-]/g, '')) || 0;
}

function startBudgetTransferEdit() {
  budgetTransferEditMode = true;
  renderBudgetPage();
}

function cancelBudgetTransferEdit() {
  budgetTransferEditMode = false;
  renderBudgetPage();
}

function saveBudgetTransfer() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual = BUDGET_ACCT_LABELS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi  = BUDGET_ACCT_LABELS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const oldTransfer = { ...(data.transfer || {}) };
  const totalBudget = BUDGET_ACCT_LABELS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const nextAdjusted = {};

  BUDGET_ACCT_LABELS.forEach((acct, idx) => {
    const el = document.getElementById(`actr-adjust-${idx}`);
    nextAdjusted[acct] = parseBudgetAmount(el ? el.value : getBudgetAdjusted(data, acct));
  });

  const nextTotal = BUDGET_ACCT_LABELS.reduce((s,c)=>s+nextAdjusted[c],0);
  if (nextTotal !== totalBudget) {
    showToast(`조정배분 합계는 총액 ${fmt(totalBudget)}원과 같아야 합니다.`);
    return;
  }

  const invalid = BUDGET_ACCT_LABELS.find(acct => nextAdjusted[acct] < (actual[acct] || 0) + (quasi[acct] || 0));
  if (invalid) {
    showToast(`${invalid} 조정배분은 실집행+투입확정 금액보다 작게 설정할 수 없습니다.`);
    return;
  }

  const changes = BUDGET_ACCT_LABELS.map(acct => {
    const oldAdjusted = (data.plan[acct] || 0) + (oldTransfer[acct] || 0);
    const newAdjusted = nextAdjusted[acct];
    return {
      acct,
      oldAdjusted,
      newAdjusted,
      diff: newAdjusted - oldAdjusted,
      transfer: newAdjusted - (data.plan[acct] || 0),
    };
  }).filter(c => c.oldAdjusted !== c.newAdjusted);

  if (!changes.length) {
    showToast('변경된 예산 이관 내역이 없습니다.');
    return;
  }

  data.transfer = data.transfer || {};
  changes.forEach(c => { data.transfer[c.acct] = c.transfer; });

  const hist = budgetTransferHistory[currentBudgetProj] || [];
  const nextVersion = hist.length + 1;
  hist.unshift({
    version: nextVersion,
    changedAt: new Date().toLocaleString('ko-KR', { hour12:false }),
    changedBy: getBudgetProjectPm(currentBudgetProj),
    changes,
  });
  budgetTransferHistory[currentBudgetProj] = hist;
  budgetHistorySelectedVersion = nextVersion;

  budgetTransferEditMode = false;
  persistBudgetTransferState();
  showToast('예산 이관 내역이 저장되었습니다.');
  renderBudgetPage();
}

function selectBudgetHistoryVersion(version) {
  budgetHistorySelectedVersion = Number(version);
  renderBudgetPage();
}

function persistBudgetTransferState() {
  const payload = {
    transfers: Object.fromEntries(Object.entries(BUDGET_SOURCE).map(([k, v]) => [k, v.transfer || {}])),
    history: budgetTransferHistory,
  };
  localStorage.setItem('budgetTransferState', JSON.stringify(payload));
}

function restoreBudgetTransferState() {
  if (budgetTransferStateRestored) return;
  budgetTransferStateRestored = true;
  try {
    const raw = localStorage.getItem('budgetTransferState');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.entries(saved.transfers || {}).forEach(([k, transfer]) => {
      if (BUDGET_SOURCE[k]) BUDGET_SOURCE[k].transfer = transfer;
    });
    Object.entries(saved.history || {}).forEach(([k, hist]) => {
      budgetTransferHistory[k] = hist;
    });
  } catch (e) {}
}

function persistBudgetPlanState() {
  const payload = Object.fromEntries(Object.entries(BUDGET_SOURCE).map(([k, data]) => [
    k,
    data.months.map(m => ({
      m: m.m,
      type: m.type,
      plan: Object.fromEntries(CATS.map(cat => [cat, m[cat] ? m[cat].p || 0 : 0])),
    })),
  ]));
  localStorage.setItem('budgetPlanState', JSON.stringify(payload));
}

function restoreBudgetPlanState() {
  try {
    const raw = localStorage.getItem('budgetPlanState');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.entries(saved || {}).forEach(([proj, months]) => {
      const data = BUDGET_SOURCE[proj];
      if (!data) return;
      months.forEach(savedMonth => {
        const mo = data.months.find(m => m.m === savedMonth.m && m.type === 'plan');
        if (!mo) return;
        CATS.forEach(cat => {
          if (mo[cat] && savedMonth.plan && typeof savedMonth.plan[cat] === 'number') {
            mo[cat].p = savedMonth.plan[cat];
          }
        });
      });
    });
  } catch (e) {}
}

function persistBudgetLaborState() {
  localStorage.setItem('budgetLaborState', JSON.stringify(budgetLaborAssignments));
}

function restoreBudgetLaborState() {
  try {
    const raw = localStorage.getItem('budgetLaborState');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.entries(saved || {}).forEach(([proj, rows]) => {
      budgetLaborAssignments[proj] = rows;
    });
  } catch (e) {}
}

function monthRangeByDate(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const [sy, sm] = startDate.slice(0, 7).split('-').map(Number);
  const [ey, em] = endDate.slice(0, 7).split('-').map(Number);
  const months = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      y += 1;
      m = 1;
    }
  }
  return months;
}

function getLaborRows(proj = currentBudgetProj) {
  if (!budgetLaborAssignments[proj]) budgetLaborAssignments[proj] = [];
  return budgetLaborAssignments[proj];
}

function getSelectedLaborCandidate() {
  return laborCandidatePool.find(p => p.id === selectedLaborCandidateId) || laborCandidatePool[0];
}

function getSelectedLaborAssignment() {
  const rows = getLaborRows();
  return rows.find(r => r.id === selectedLaborAssignmentId) || rows[0] || null;
}

function laborStatusClass(status) {
  if (status === 'SCM 승인완료') return 'done';
  if (status === 'SCM 승인대기') return 'wait';
  if (status === 'MM 저장완료') return 'saved';
  return 'draft';
}

function updateLaborSearch(value) {
  laborSearchQuery = value || '';
  renderBudgetPage();
}

function selectLaborCandidate(id) {
  selectedLaborCandidateId = id;
  renderBudgetPage();
}

function selectLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = null;
  renderBudgetPage();
}

function editLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = id;
  renderBudgetPage();
}

function cancelLaborEdit() {
  editingLaborAssignmentId = null;
  renderBudgetPage();
}

function renderCategoryChoiceBoard(kind, tabs) {
  return `
    <div class="cost-category-board">
      <div class="cost-category-board-head">
        <strong>등록 구분 선택</strong>
        <span>먼저 비용 성격을 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong ${kind === 'material' ? 'material' : ''}">
        ${tabs.map(tab => `
          <button class="${tab.active ? 'active' : ''}" onclick="${tab.action}">
            <em>${tab.step}</em>
            <strong>${tab.label}</strong>
            <span>${tab.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

function renderOutsourceKindTabs() {
  return renderCategoryChoiceBoard('outsource', [
    { step:'01', label:'실투입 외주비', desc:'업체 선택, 계약기간, 계약금액, PO 매핑', active:outsourceKind === 'direct', action:"switchOutsourceKind('direct')" },
    { step:'02', label:'기타외주비', desc:'출장비, 예산 이관, 일회성 외주성 비용', active:outsourceKind === 'other', action:"switchOutsourceKind('other')" },
    { step:'03', label:'MA', desc:'견적 기반 MA 품목, 납기, 손익인식 관리', active:outsourceKind === 'ma', action:"switchOutsourceKind('ma')" },
  ]);
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
    <div class="cost-category-layout">
      ${renderOutsourceKindTabs()}
      <div class="outsource-panel">
        <div class="labor-panel-head">
          <div>
            <div class="labor-eyebrow">외주비 등록 / 수정</div>
            <div class="labor-title">${title}</div>
          </div>
          <div class="labor-actions compact">
            <span class="os-kind-caption">${subtitle}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적 데이터 기반 상품/품목/납기 계획', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'기타재료비', desc:'이관, 임시 라이선스, 소모품성 계획', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ]);
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
    <div class="cost-category-layout">
      ${renderMaterialKindTabs()}
      <div class="outsource-panel material-panel">
        <div class="labor-panel-head">
          <div>
            <div class="labor-eyebrow">재료비 등록 / 수정</div>
            <div class="labor-title">${title}</div>
          </div>
          <div class="labor-actions compact">
            <span class="os-kind-caption">${subtitle}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', 'MA와 동일하게 견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

let selectedMaterialQuoteLineId = '';
let materialDirectInputOpen = false;

const materialQuoteLineRows = [
  { lineId:'MQ-202607-001-10', quoteNo:'MQ-202607-001', itemNo:'10', itemCode:'SW00014', categoryName:'소프트웨어-경영/인사', standardName:'HRMS(인사관리)', manufacturer:'휴먼컨설팅그룹', model:'hunel', quantity:1, unit:'EA', amount:52000000, inspectionDueMonth:'2026-08', receivedAt:'2026-07-01 11:10', poNo:'' },
  { lineId:'MQ-202607-001-20', quoteNo:'MQ-202607-001', itemNo:'20', itemCode:'SW00018', categoryName:'소프트웨어-경영/인사', standardName:'근태/인력 투입 관리 모듈', manufacturer:'휴먼컨설팅그룹', model:'hunel-TM', quantity:1, unit:'EA', amount:26000000, inspectionDueMonth:'2026-09', receivedAt:'2026-07-01 11:10', poNo:'' },
  { lineId:'MQ-202607-002-10', quoteNo:'MQ-202607-002', itemNo:'10', itemCode:'SW00021', categoryName:'소프트웨어-개발도구', standardName:'테스트 자동화 도구', manufacturer:'QA Tech', model:'QA-AUTO-STD', quantity:3, unit:'EA', amount:28000000, inspectionDueMonth:'2026-10', receivedAt:'2026-07-02 09:35', poNo:'' },
];

function getMaterialQuoteLine(lineId) {
  return materialQuoteLineRows.find(row => row.lineId === lineId) || null;
}

function monthStartDate(month) {
  return month ? `${month}-01` : '';
}

function monthEndDate(month) {
  if (!month) return '';
  const [year, monthNo] = month.split('-').map(Number);
  if (!year || !monthNo) return '';
  return new Date(year, monthNo, 0).toISOString().slice(0, 10);
}

function monthRange(startMonth, endMonth) {
  if (!startMonth || !endMonth || startMonth > endMonth) return [];
  const [startYear, startNo] = startMonth.split('-').map(Number);
  const [endYear, endNo] = endMonth.split('-').map(Number);
  const months = [];
  let y = startYear;
  let m = startNo;
  while (y < endYear || (y === endYear && m <= endNo)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function buildMaterialAllocations(startMonth, endMonth, amount) {
  const months = monthRange(startMonth, endMonth);
  if (!months.length || !amount) return [];
  const base = Math.floor(amount / months.length);
  const remainder = amount - base * months.length;
  return months.map((month, index) => ({ month, amount: base + (index === months.length - 1 ? remainder : 0) }));
}

function selectMaterialQuoteLine(lineId) {
  selectedMaterialQuoteLineId = lineId;
  materialDirectInputOpen = false;
  materialQuoteSelectedYn = 'Y';
  const line = getMaterialQuoteLine(lineId);
  if (line) {
    materialQuoteNo = line.quoteNo;
    materialQuoteAmount = line.amount;
    materialQuoteTitle = line.standardName;
  }
  editingMaterialItemId = null;
  renderBudgetPage();
}

function startMaterialDirectInput() {
  selectedMaterialQuoteLineId = '';
  materialDirectInputOpen = true;
  materialQuoteSelectedYn = 'N';
  materialQuoteNo = '';
  materialQuoteAmount = 0;
  materialQuoteTitle = '';
  editingMaterialItemId = null;
  renderBudgetPage();
}

function switchMaterialQuoteSelectedYn(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpen = false;
  materialQuoteSelectedYn = 'Y';
  if (!selectedMaterialQuoteLineId) selectedMaterialQuoteLineId = materialQuoteLineRows[0]?.lineId || '';
  renderBudgetPage();
}

function applyMaterialPurchaseQuote(quoteNo) {
  const line = materialQuoteLineRows.find(row => row.quoteNo === quoteNo) || materialQuoteLineRows[0];
  if (line) selectMaterialQuoteLine(line.lineId);
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  materialDirectInputOpen = row.quoteSelectedYn === 'N';
  selectedMaterialQuoteLineId = row.quoteLineId || '';
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  materialDirectInputOpen = false;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }

  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpen ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;

  if (quoteYn === 'Y' && !document.getElementById('material-quote-line-id')?.value) {
    showToast('구매시스템에서 수신된 견적 라인을 먼저 선택해 주세요.');
    return;
  }
  if (!amount) {
    showToast('견적/예산 금액을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'Y' && !inspectionDueMonth) {
    showToast('검수예정일을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'N' && (!startMonth || !endMonth || startMonth > endMonth)) {
    showToast('직접입력은 예산 시작월과 종료월을 올바르게 입력해 주세요.');
    return;
  }

  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn: quoteYn,
    quoteLineId: document.getElementById('material-quote-line-id')?.value || '',
    itemNo: document.getElementById('material-item-no')?.value || '',
    itemCode: document.getElementById('material-item-code')?.value || '',
    categoryName: document.getElementById('material-category-name')?.value || '',
    standardName: document.getElementById('material-standard-name')?.value || '',
    manufacturer: document.getElementById('material-manufacturer')?.value || '',
    large: document.getElementById('material-category-name')?.value || '',
    middle: '',
    small: document.getElementById('material-standard-name')?.value || '',
    model: document.getElementById('material-model')?.value || '',
    productDetail: document.getElementById('material-standard-name')?.value || '',
    quantity: parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
    unit: document.getElementById('material-unit')?.value || 'EA',
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    quoteNo: document.getElementById('material-quote-no')?.value || '',
    poNo: document.getElementById('material-po-no')?.value || '',
    amount,
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
    status: '계획',
  };

  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) {
    showToast('품목코드, 분류명, 표준품명, 제조사, 모델명을 입력해 주세요.');
    return;
  }

  if (editing) {
    Object.assign(editing, item);
    showToast('상품재료비 계획을 수정했습니다.');
  } else {
    rows.unshift(item);
    showToast('상품재료비 계획을 등록했습니다.');
  }
  editingMaterialItemId = null;
  selectedMaterialQuoteLineId = '';
  materialDirectInputOpen = false;
  renderBudgetPage();
}

function renderMaterialAllocationPreview(source = {}) {
  const startMonth = source.startMonth || '';
  const endMonth = source.endMonth || '';
  const amount = Number(source.amount || 0);
  const allocations = source.allocations || buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    return '<div class="material-allocation-preview empty" id="material-allocation-preview">예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.</div>';
  }
  return `
    <div class="material-allocation-preview" id="material-allocation-preview">
      <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
      ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}
    </div>`;
}

function refreshMaterialAllocationPreview() {
  const target = document.getElementById('material-allocation-preview');
  if (!target) return;
  const startMonth = document.getElementById('material-budget-start')?.value || '';
  const endMonth = document.getElementById('material-budget-end')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const allocations = buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    target.className = 'material-allocation-preview empty';
    target.innerHTML = '예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.';
    return;
  }
  target.className = 'material-allocation-preview';
  target.innerHTML = `
    <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
    ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}`;
}

function renderMaterialItemForm(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const inspectionDueMonth = source.inspectionDueMonth || source.revenueBasis || source.deliveryEnd?.slice(0, 7) || '2026-08';
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
  const readonly = isQuote ? 'readonly' : '';
  return `
    <div class="labor-card material-entry-card">
      <div class="labor-flow-title">
        <strong>${editing ? '상품재료비 계획 수정' : '상품재료비 계획 등록'}</strong>
        ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
      </div>
      <input type="hidden" id="material-quote-line-id" value="${source.quoteLineId || selectedMaterialQuoteLineId || ''}">
      <div class="labor-form os-ma-form material-item-form">
        <label><span>견적선정유무</span><input value="${quoteYn}" readonly></label>
        <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" readonly></label>
        <label><span>항번</span><input id="material-item-no" value="${source.itemNo || ''}" ${readonly}></label>
        <label><span>품목코드 *</span><input id="material-item-code" value="${source.itemCode || ''}" ${readonly}></label>
        <label><span>분류명 *</span><input id="material-category-name" value="${source.categoryName || ''}" ${readonly}></label>
        <label><span>표준품명 *</span><input id="material-standard-name" value="${source.standardName || source.productDetail || ''}" ${readonly}></label>
        <label><span>제조사 *</span><input id="material-manufacturer" value="${source.manufacturer || ''}" ${readonly}></label>
        <label><span>모델명 *</span><input id="material-model" value="${source.model || ''}" ${readonly}></label>
        <label><span>수량</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${source.unit || 'EA'}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label><span>검수예정일 *</span><input id="material-inspection-due" type="month" value="${inspectionDueMonth}"></label>
          <input type="hidden" id="material-budget-start" value="${inspectionDueMonth}">
          <input type="hidden" id="material-budget-end" value="${inspectionDueMonth}">
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" readonly></label>
        ` : `
          <label><span>예산 시작월 *</span><input id="material-budget-start" type="month" value="${startMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산 종료월 *</span><input id="material-budget-end" type="month" value="${endMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산금액 *</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" oninput="refreshMaterialAllocationPreview()"></label>
          <input type="hidden" id="material-inspection-due" value="${endMonth}">
        `}
      </div>
      ${isQuote ? `
        <div class="bpo-rule-note">
          <strong>견적 사용 등록</strong>
          <span>구매시스템에서 받은 물품정보는 수정하지 않고, 실행예산에서는 검수예정일만 조정합니다.</span>
        </div>` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>`;
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedLine = selectedMaterialQuoteLineId ? getMaterialQuoteLine(selectedMaterialQuoteLineId) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpen ? 'N' : 'Y');
  const source = editing || (quoteYn === 'Y' && selectedLine ? {
    ...selectedLine,
    quoteLineId:selectedLine.lineId,
    model:selectedLine.model,
    deliveryStart:monthStartDate(selectedLine.inspectionDueMonth),
    deliveryEnd:monthEndDate(selectedLine.inspectionDueMonth),
    revenueBasis:selectedLine.inspectionDueMonth,
  } : {
    quoteSelectedYn:'N',
    itemNo:'',
    itemCode:'',
    categoryName:'',
    standardName:'',
    manufacturer:'',
    model:'',
    quantity:1,
    unit:'EA',
    deliveryStart:'2026-08-01',
    deliveryEnd:'2026-12-31',
    quoteNo:'',
    poNo:'',
    amount:0,
  });
  const shouldShowForm = !!editing || materialDirectInputOpen || !!selectedLine;

  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 계획</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매시스템에서 수신된 견적 라인 단위로 등록합니다. 견적 없이 등록하는 경우에는 예산 기간과 금액을 입력해 월별 계획을 배분합니다.</p>
    </div>

    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div>
          <div class="labor-card-title">1. 견적선정유무 선택</div>
          <p>Y는 구매시스템 견적 라인을 선택해서 등록하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p>
        </div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `
        <div class="material-quote-line-table">
          <div class="material-quote-line-head">
            <span>견적번호</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>금액</span>
          </div>
          ${materialQuoteLineRows.map(line => `
            <button class="material-quote-line ${selectedMaterialQuoteLineId === line.lineId ? 'active' : ''}" onclick="selectMaterialQuoteLine('${line.lineId}')">
              <span>${line.quoteNo}</span><span>${line.itemNo}</span><span>${line.itemCode}</span><span>${line.categoryName}</span><span>${line.standardName}</span><span>${line.manufacturer}</span><span>${line.model}</span><strong>${fmt(line.amount)}원</strong>
            </button>
          `).join('')}
        </div>` : `
        <div class="bpo-rule-note">
          <strong>직접입력 등록</strong>
          <span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span>
        </div>`}
    </div>

    ${shouldShowForm ? renderMaterialItemForm(source, quoteYn, editing) : '<div class="labor-empty material-form-empty">견적 라인을 선택하면 상품재료비 등록 영역이 열립니다.</div>'}

    <div class="os-ma-table-wrap">
      <div class="os-ma-table material-item-plan-table">
        <div class="os-ma-head with-action material-item-head">
          <span>구분</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>검수예정일</span><span>PO번호</span><span>금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}" onclick="editMaterialItem('${row.id}')">
            <span>${row.quoteSelectedYn === 'N' ? '직접' : '견적'}</span><span>${row.itemNo || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.categoryName || row.large || '-'}</span><span>${row.standardName || row.productDetail || '-'}</span><span>${row.manufacturer || '-'}</span><span>${row.model || '-'}</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span>${row.poNo || '-'}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">실투입외주비, 기타외주비, MA를 구분해 등록합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">견적 기반 품목 등록과 기타재료비 계획을 관리합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  if (account === '경비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">경비 수정</div>
            <div class="setup-editor-sub">계정별/월별 경비 계획을 입력하고, 통제 계정은 ERP 가용예산을 체크합니다.</div>
          </div>
        </div>
        ${renderExpensePlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderCategoryChoiceBoard(kind, tabs) {
  return `
    <div class="cost-category-board">
      <div class="cost-category-board-head">
        <strong>등록 구분 선택</strong>
        <span>먼저 비용 성격을 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong ${kind === 'material' ? 'material' : ''}">
        ${tabs.map(tab => `
          <button class="${tab.active ? 'active' : ''}" onclick="${tab.action}">
            <em>${tab.step}</em>
            <strong>${tab.label}</strong>
            <span>${tab.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

function renderOutsourceKindTabs() {
  return renderCategoryChoiceBoard('outsource', [
    { step:'01', label:'실투입 외주비', desc:'업체 선택, 계약기간, 계약금액, PO 매핑', active:outsourceKind === 'direct', action:"switchOutsourceKind('direct')" },
    { step:'02', label:'기타외주비', desc:'출장비, 예산 이관, 일회성 외주성 비용', active:outsourceKind === 'other', action:"switchOutsourceKind('other')" },
    { step:'03', label:'MA', desc:'견적 기반 MA 품목, 납기, 손익인식 관리', active:outsourceKind === 'ma', action:"switchOutsourceKind('ma')" },
  ]);
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
    <div class="cost-category-layout">
      ${renderOutsourceKindTabs()}
      <div class="outsource-panel">
        <div class="labor-panel-head">
          <div>
            <div class="labor-eyebrow">외주비 등록 / 수정</div>
            <div class="labor-title">${title}</div>
          </div>
          <div class="labor-actions compact">
            <span class="os-kind-caption">${subtitle}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적 데이터 기반 상품/품목/납기 계획', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'기타재료비', desc:'이관, 임시 라이선스, 소모품성 계획', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ]);
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
    <div class="cost-category-layout">
      ${renderMaterialKindTabs()}
      <div class="outsource-panel material-panel">
        <div class="labor-panel-head">
          <div>
            <div class="labor-eyebrow">재료비 등록 / 수정</div>
            <div class="labor-title">${title}</div>
          </div>
          <div class="labor-actions compact">
            <span class="os-kind-caption">${subtitle}</span>
          </div>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '외주비 MA처럼 견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

const EXPENSE_PLAN_MONTHS = ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04'];
const EXPENSE_ACCOUNT_ROWS = [
  { id:'exp-01', group:'조직운영비', code:'705501', name:'의욕관리비', controlled:true, carried:12024000, actual:296642, erpAvailable:11456642, monthly:[1800000,1872000,1872000,1872000,1872000,1200000,900000,600000,0,0] },
  { id:'exp-02', group:'조직운영비', code:'735901', name:'회의비', controlled:true, carried:3173000, actual:337400, erpAvailable:2945000, monthly:[500000,520000,520000,520000,520000,365000,0,0,0,0] },
  { id:'exp-03', group:'조직운영비', code:'743901', name:'잡비', controlled:true, carried:3173000, actual:0, erpAvailable:2945000, monthly:[300000,300000,300000,300000,300000,300000,300000,300000,245000,0] },
  { id:'exp-04', group:'조직관리비', code:'705502', name:'조직관리비', controlled:true, carried:0, actual:0, erpAvailable:5473239, monthly:[0,700000,700000,700000,700000,700000,700000,700000,573239,0] },
  { id:'exp-05', group:'소모품비', code:'710301', name:'사무용품비', controlled:true, carried:501000, actual:0, erpAvailable:1093339, monthly:[75000,78000,78000,78000,78000,78000,78000,78000,78000,472339] },
  { id:'exp-06', group:'소모품비', code:'710901', name:'전산소모품비', controlled:true, carried:835000, actual:22910, erpAvailable:775000, monthly:[125000,130000,130000,130000,130000,130000,0,0,0,0] },
  { id:'exp-07', group:'접대비', code:'734101', name:'접대비', controlled:true, carried:0, actual:0, erpAvailable:0, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exp-08', group:'비통제', code:'NCTRL-01', name:'기타입차료', controlled:false, carried:245714000, actual:0, erpAvailable:null, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exp-09', group:'비통제', code:'NCTRL-02', name:'PJ운영예비비', controlled:false, carried:1640967367, actual:0, erpAvailable:null, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exp-10', group:'교육훈련비', code:'723101', name:'팀빌교육비', controlled:true, carried:0, actual:0, erpAvailable:0, monthly:[0,0,0,0,0,0,0,0,0,0] },
];

function getExpenseRows() {
  return EXPENSE_ACCOUNT_ROWS;
}

function expensePlanTotal(row) {
  return row.monthly.reduce((sum, v) => sum + Number(v || 0), 0);
}

function getExpenseTransferLimit() {
  return getExpenseRows().reduce((sum, row) => {
    if (row.controlled) return sum + Number(row.erpAvailable || 0);
    return sum + expensePlanTotal(row);
  }, 0);
}

function validateExpenseErpAvailability(rows = getExpenseRows()) {
  const invalid = rows.find(row => row.controlled && expensePlanTotal(row) > Number(row.erpAvailable || 0));
  if (!invalid) return { ok:true };
  return {
    ok:false,
    message:`${invalid.name} 계획금액 ${fmt(expensePlanTotal(invalid))}원이 ERP 가용예산 ${fmt(invalid.erpAvailable || 0)}원을 초과했습니다.`,
  };
}

function saveExpensePlan() {
  getExpenseRows().forEach(row => {
    row.monthly = EXPENSE_PLAN_MONTHS.map((month, idx) => {
      const el = document.getElementById(`expense-plan-${row.id}-${idx}`);
      return parseBudgetAmount(el ? el.value : row.monthly[idx] || 0);
    });
  });
  const validation = validateExpenseErpAvailability();
  if (!validation.ok) {
    showToast(validation.message);
    renderBudgetPage();
    return;
  }
  showToast('경비 월별 계획이 저장되었습니다. 통제 계정 ERP 가용예산도 확인했습니다.');
  renderBudgetPage();
}

function showExpenseActualLookup() {
  showToast('경비 실적조회: ERP에서 2026-07 기준 실적 데이터를 조회했습니다.');
}

function showExpenseErpAvailabilityModal() {
  const rows = getExpenseRows().filter(row => row.controlled);
  const groups = [...new Set(rows.map(row => row.group))];
  const bodyRows = groups.map(group => {
    const items = rows.filter(row => row.group === group);
    const groupAvail = items.reduce((sum, row) => sum + Number(row.erpAvailable || 0), 0);
    const groupCarried = items.reduce((sum, row) => sum + Number(row.carried || 0), 0);
    const groupCurrent = items.reduce((sum, row) => sum + expensePlanTotal(row), 0);
    const diff = groupCurrent - groupCarried;
    return `
      ${items.map((row, idx) => `
        <tr>
          ${idx === 0 ? `<td rowspan="${items.length}">${group}</td>` : ''}
          <td>${row.code}</td>
          <td>${row.name}</td>
          ${idx === 0 ? `<td rowspan="${items.length}" class="num">${fmt(groupAvail)}</td>` : ''}
          <td class="num">${fmt(row.carried)}</td>
          <td class="num">${fmt(expensePlanTotal(row))}</td>
          ${idx === 0 ? `<td rowspan="${items.length}" class="num ${diff > groupAvail ? 'danger' : ''}">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>` : ''}
        </tr>
      `).join('')}`;
  }).join('');

  let modal = document.getElementById('expense-erp-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'expense-erp-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="expense-erp-box">
      <div class="expense-erp-head">
        <strong>가용예산조회</strong>
        <button onclick="document.getElementById('expense-erp-modal').classList.remove('open')">×</button>
      </div>
      <div class="expense-erp-note">* 통제 계정은 계획금액이 ERP 가용예산을 넘지 않아야 합니다. 계정별 예산 이관 저장 시에도 동일하게 체크됩니다.</div>
      <div class="expense-erp-table-wrap">
        <table class="expense-erp-table">
          <thead>
            <tr><th>중계정</th><th>계정코드</th><th>계정명</th><th>가용예산</th><th>이전예산(A)</th><th>현재계획(B)</th><th>차이(B-A)</th></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
  modal.classList.add('open');
}

function renderExpensePlanPanel(data) {
  const rows = getExpenseRows();
  const totalRows = rows.length;
  const controlledTotal = rows.filter(r => r.controlled).reduce((sum, row) => sum + expensePlanTotal(row), 0);
  const erpTotal = rows.filter(r => r.controlled).reduce((sum, row) => sum + Number(row.erpAvailable || 0), 0);
  const body = rows.map(row => {
    const plan = expensePlanTotal(row);
    const balance = row.controlled ? Number(row.erpAvailable || 0) - plan : null;
    return `
      <tr class="${row.controlled && balance < 0 ? 'expense-over' : ''}">
        <td><input type="checkbox" class="expense-check"></td>
        <td>
          <strong>${row.name}</strong>
          <span>${row.code} · ${row.group}</span>
        </td>
        <td><i class="expense-control-badge ${row.controlled ? 'control' : 'free'}">${row.controlled ? '통제' : '비통제'}</i></td>
        <td class="num">${fmt(row.carried)}</td>
        <td class="num">${fmt(plan)}</td>
        <td class="num">${fmt(row.actual)}</td>
        <td class="num ${row.controlled && balance < 0 ? 'danger' : ''}">${row.controlled ? fmt(Math.max(balance, 0)) : '-'}</td>
        ${EXPENSE_PLAN_MONTHS.map((month, idx) => `
          <td>
            <input class="expense-month-input" id="expense-plan-${row.id}-${idx}" value="${row.monthly[idx] || 0}" inputmode="numeric">
          </td>
        `).join('')}
      </tr>`;
  }).join('');

  return `
    <div class="expense-plan-panel">
      <div class="expense-plan-head">
        <div>
          <div class="expense-plan-title">경비 자원계획 <span>총 ${totalRows}건</span></div>
          <p>계정별/월별로 계획을 입력합니다. 통제 계정은 ERP 가용예산을 초과할 수 없습니다.</p>
        </div>
        <div class="expense-plan-actions">
          <button class="labor-sub-btn" onclick="showExpenseActualLookup()">경비 실적조회</button>
          <button class="labor-sub-btn teal" onclick="showExpenseErpAvailabilityModal()">가용예산조회</button>
          <button class="labor-main-btn" onclick="saveExpensePlan()">계획 저장</button>
        </div>
      </div>
      <div class="expense-erp-summary">
        <div><span>통제계정 계획</span><strong>${fmt(controlledTotal)}원</strong></div>
        <div><span>ERP 가용예산</span><strong>${fmt(erpTotal)}원</strong></div>
        <div class="${controlledTotal > erpTotal ? 'danger' : ''}"><span>가용 잔액</span><strong>${fmt(Math.max(erpTotal - controlledTotal, 0))}원</strong></div>
        <p>계정별 예산 이관에서 경비 조정배분을 변경할 때도 이 ERP 가용예산 한도를 함께 체크합니다.</p>
      </div>
      <div class="expense-grid-wrap">
        <table class="expense-grid-table">
          <thead>
            <tr>
              <th rowspan="2">선택</th>
              <th rowspan="2">계정</th>
              <th rowspan="2">구분</th>
              <th rowspan="2">이전계획</th>
              <th rowspan="2">계획</th>
              <th rowspan="2">실적</th>
              <th rowspan="2">잔여예산</th>
              <th colspan="${EXPENSE_PLAN_MONTHS.length}">월별 계획</th>
            </tr>
            <tr>${EXPENSE_PLAN_MONTHS.map(m => `<th>${m}</th>`).join('')}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

function saveBudgetTransfer() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual = BUDGET_ACCT_LABELS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi  = BUDGET_ACCT_LABELS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const oldTransfer = { ...(data.transfer || {}) };
  const totalBudget = BUDGET_ACCT_LABELS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const nextAdjusted = {};

  BUDGET_ACCT_LABELS.forEach((acct, idx) => {
    const el = document.getElementById(`actr-adjust-${idx}`);
    nextAdjusted[acct] = parseBudgetAmount(el ? el.value : getBudgetAdjusted(data, acct));
  });

  const nextTotal = BUDGET_ACCT_LABELS.reduce((s,c)=>s+nextAdjusted[c],0);
  if (nextTotal !== totalBudget) {
    showToast(`조정배분 합계는 총액 ${fmt(totalBudget)}원과 같아야 합니다.`);
    return;
  }

  const invalid = BUDGET_ACCT_LABELS.find(acct => nextAdjusted[acct] < (actual[acct] || 0) + (quasi[acct] || 0));
  if (invalid) {
    showToast(`${invalid} 조정배분은 실적+투입확정 금액보다 작게 설정할 수 없습니다.`);
    return;
  }

  const expenseLimit = getExpenseTransferLimit();
  if (nextAdjusted['경비'] > expenseLimit) {
    showToast(`경비 조정배분 ${fmt(nextAdjusted['경비'])}원이 ERP 기준 가용 한도 ${fmt(expenseLimit)}원을 초과했습니다. 가용예산조회 후 통제 계정을 조정해 주세요.`);
    return;
  }

  const expenseValidation = validateExpenseErpAvailability();
  if (!expenseValidation.ok) {
    showToast(`경비 통제 계정 확인 필요: ${expenseValidation.message}`);
    return;
  }

  const changes = BUDGET_ACCT_LABELS.map(acct => {
    const oldAdjusted = (data.plan[acct] || 0) + (oldTransfer[acct] || 0);
    const newAdjusted = nextAdjusted[acct];
    return {
      acct,
      oldAdjusted,
      newAdjusted,
      diff: newAdjusted - oldAdjusted,
      transfer: newAdjusted - (data.plan[acct] || 0),
    };
  }).filter(c => c.oldAdjusted !== c.newAdjusted);

  if (!changes.length) {
    showToast('변경된 예산 이관 내역이 없습니다.');
    return;
  }

  data.transfer = data.transfer || {};
  changes.forEach(c => { data.transfer[c.acct] = c.transfer; });

  const hist = budgetTransferHistory[currentBudgetProj] || [];
  const nextVersion = hist.length + 1;
  hist.unshift({
    version: nextVersion,
    changedAt: new Date().toLocaleString('ko-KR', { hour12:false }),
    changedBy: getBudgetProjectPm(currentBudgetProj),
    changes,
  });
  budgetTransferHistory[currentBudgetProj] = hist;
  budgetHistorySelectedVersion = nextVersion;

  budgetTransferEditMode = false;
  persistBudgetTransferState();
  showToast('예산 이관 내역이 저장되었습니다. 경비 통제 계정 ERP 가용예산도 확인했습니다.');
  renderBudgetPage();
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">실투입 외주비, 기타외주비, MA를 먼저 구분한 뒤 등록합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">상품재료비와 기타재료비를 구분해 계획을 등록합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '외주비 MA처럼 견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

function renderBudgetAccountEditor(data, account) {
  if (account === '인건비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">인건비 수정</div>
            <div class="setup-editor-sub">인력 검색, 투입기간, 월별 MM, 승인요청을 처리합니다.</div>
          </div>
        </div>
        ${renderLaborAssignmentPanel(data)}
      </div>`;
  }
  if (account === '외주비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">외주비 수정</div>
            <div class="setup-editor-sub">실투입 외주비, 기타외주비, MA를 먼저 구분한 뒤 등록합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
      </div>`;
  }
  if (account === '재료비') {
    return `
      <div class="setup-editor">
        <div class="setup-editor-head">
          <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
          <div>
            <div class="setup-title">재료비 수정</div>
            <div class="setup-editor-sub">상품재료비와 기타재료비를 구분해 계획을 등록합니다.</div>
          </div>
        </div>
        ${renderMaterialPlanPanel(data)}
      </div>`;
  }
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획금액을 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function saveLaborAssignmentDraft() {
  const rows = getLaborRows();
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const person = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  if (!person) return;

  const startEl = document.getElementById('labor-start');
  const endEl = document.getElementById('labor-end');
  const typeEl = document.getElementById('labor-work-type');
  const startDate = startEl ? startEl.value : '';
  const endDate = endEl ? endEl.value : '';
  const workType = typeEl ? typeEl.value : 'Full';
  const months = monthRangeByDate(startDate, endDate);

  if (!startDate || !endDate || !months.length) {
    showToast('투입 시작일과 종료일을 올바르게 입력해주세요.');
    return;
  }

  const monthly = {};
  months.forEach(m => {
    monthly[m] = editing && editing.monthly && typeof editing.monthly[m] === 'number'
      ? editing.monthly[m]
      : 0;
  });

  const target = editing || {
    id: `lb-${Date.now()}`,
    personId: person.id,
    name: person.name,
    org: person.org,
    role: person.role,
    pLevel: person.pLevel,
    unitPrice: person.unitPrice,
    requestedAt: '',
    approvedAt: '',
    scmDocNo: '',
  };

  Object.assign(target, {
    startDate,
    endDate,
    workType,
    monthly,
    totalMm: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0),
    amount: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0) * target.unitPrice,
    status: 'MM 입력중',
  });

  if (!editing) rows.unshift(target);
  selectedLaborAssignmentId = target.id;
  editingLaborAssignmentId = null;
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('인건비 투입 기본정보가 저장되었습니다. 월별 MM을 입력해주세요.');
  renderBudgetPage();
}

function renderLaborScmIfPanel(selectedRaw, selected, person) {
  const statusClass = selectedRaw ? laborStatusClass(selectedRaw.status) : 'draft';
  const hasAssignment = !!selectedRaw;
  const isSaved = ['saved','wait','done'].includes(statusClass);
  const isRequested = ['wait','done'].includes(statusClass);
  const isDone = statusClass === 'done';
  const target = selected || person || {};
  const period = selected ? `${selected.startDate} ~ ${selected.endDate}` : '기간 저장 전';
  const amount = selected ? selected.amount || 0 : 0;
  const scmDocNo = selectedRaw && selectedRaw.scmDocNo ? selectedRaw.scmDocNo : 'SCM 문서번호 생성 전';
  const canRequest = selectedRaw && statusClass === 'saved';
  const canApprove = selectedRaw && statusClass === 'wait';
  const steps = [
    { label:'계획수립', meta:'인력/기간 저장', on:hasAssignment, done:hasAssignment },
    { label:'계획확정', meta:'월별 MM 저장', on:isSaved, done:isSaved },
    { label:'SCM 결재요청', meta:'IF 전송', on:isRequested, done:isRequested },
    { label:'SCM 확정', meta:'투입확정 반영', on:isDone, done:isDone },
  ];

  return `
    <div class="labor-scm-if-panel">
      <div class="labor-scm-if-head">
        <div>
          <span class="labor-if-badge">SCM IF</span>
          <strong>SCM 연동 진행상태</strong>
          <p>계획수립 → 계획확정 → SCM 결재요청 → SCM 확정 순으로 진행됩니다.</p>
        </div>
        <button class="labor-sub-btn" onclick="showExtLink('AI SCM','AI SCM 시스템')">SCM 바로가기</button>
      </div>
      <div class="labor-scm-step-grid">
        ${steps.map((step, index) => `
          <div class="labor-scm-step ${step.on ? 'on' : ''} ${step.done ? 'done' : ''}">
            <i>${index + 1}</i>
            <span>${step.label}</span>
            <em>${step.meta}</em>
          </div>
        `).join('')}
      </div>
      <div class="labor-scm-summary">
        <div>
          <span>대상 인력</span>
          <strong>${target.name || '인력 선택 전'}</strong>
          <em>${target.org || '-'} · ${target.role || '-'}</em>
        </div>
        <div>
          <span>투입 기간 / MM</span>
          <strong>${period}</strong>
          <em>${selected ? `${selected.totalMm || 0}MM · ${selected.workType}` : '기본정보 저장 후 산정'}</em>
        </div>
        <div>
          <span>SCM 문서 / 금액</span>
          <strong>${scmDocNo}</strong>
          <em>${fmt(amount)}원</em>
        </div>
        <div class="labor-scm-actions">
          <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestLaborApproval('${selectedRaw ? selectedRaw.id : ''}')">SCM 결재요청</button>
          <button class="labor-main-btn teal" ${canApprove ? '' : 'disabled'} onclick="completeLaborScmApproval('${selectedRaw ? selectedRaw.id : ''}')">SCM 확정 반영</button>
        </div>
      </div>
      <div class="labor-scm-note">SCM 확정 후에만 투입확정 금액으로 반영되며, 확정 전 변경 건은 SCM 재요청 대상입니다.</div>
    </div>`;
}

function saveLaborMonthlyMm(id) {
  const row = getLaborRows().find(r => r.id === id);
  if (!row) return;
  let totalMm = 0;
  Object.keys(row.monthly || {}).forEach(month => {
    const el = document.getElementById(`labor-mm-${id}-${month}`);
    const mm = Math.max(0, Number(el ? el.value : row.monthly[month]) || 0);
    row.monthly[month] = mm;
    totalMm += mm;
  });
  row.totalMm = Math.round(totalMm * 100) / 100;
  row.amount = Math.round(row.totalMm * row.unitPrice);
  row.status = 'MM 저장완료';
  row.requestedAt = '';
  row.approvedAt = '';
  row.scmDocNo = '';
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('월별 MM이 저장되었습니다. 승인요청을 진행할 수 있습니다.');
  renderBudgetPage();
}

function requestLaborApproval(id) {
  const row = getLaborRows().find(r => r.id === id);
  if (!row) return;
  if (!row.totalMm || row.totalMm <= 0) {
    showToast('월별 MM을 먼저 입력하고 저장해주세요.');
    return;
  }
  row.status = 'SCM 승인대기';
  row.requestedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  row.approvedAt = '';
  row.scmDocNo = `SCM-LAB-${Date.now().toString().slice(-8)}`;
  persistBudgetLaborState();
  showToast('승인요청 내역이 SCM으로 전송되었습니다.');
  renderBudgetPage();
}

function completeLaborScmApproval(id) {
  const row = getLaborRows().find(r => r.id === id);
  if (!row) return;
  row.status = 'SCM 승인완료';
  row.approvedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('SCM 승인완료 상태로 변경되었습니다.');
  renderBudgetPage();
}

function syncLaborAssignmentsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const laborCat = BUDGET_ACCT_LABELS[0];
  const approved = getLaborRows(proj).filter(r => r.status === 'SCM 승인완료');
  data.months.filter(m => m.type === 'plan' && m[laborCat]).forEach(mo => {
    const baseDetails = (mo[laborCat].details || []).filter(d => d.source !== 'laborAssignment');
    let amount = 0;
    const nextDetails = [];
    approved.forEach(row => {
      const mm = row.monthly && row.monthly[mo.m] ? Number(row.monthly[mo.m]) : 0;
      if (!mm) return;
      const rowAmount = Math.round(mm * row.unitPrice);
      amount += rowAmount;
      nextDetails.push({
        type:'투입확정',
        name:row.name,
        org:row.org,
        role:row.role,
        mm,
        unitPrice:row.unitPrice,
        amount:rowAmount,
        source:'laborAssignment',
      });
    });
    mo[laborCat].q = amount;
    mo[laborCat].details = [...baseDetails, ...nextDetails];
  });
}

function renderLaborAssignmentPanelLegacy0(data) {
  const rows = getLaborRows();
  const selected = getSelectedLaborAssignment();
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const person = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  const query = laborSearchQuery.trim().toLowerCase();
  const candidates = laborCandidatePool.filter(p =>
    !query || `${p.name} ${p.org} ${p.role} ${p.pLevel}`.toLowerCase().includes(query)
  );
  const defaultStart = editing ? editing.startDate : '2026-07-01';
  const defaultEnd = editing ? editing.endDate : '2026-12-31';
  const defaultType = editing ? editing.workType : 'Full';
  const months = monthRangeByDate(defaultStart, defaultEnd);
  const draftMm = editing
    ? editing.totalMm
    : months.length * (defaultType === 'Full' ? 1 : 0.5);
  const draftAmount = Math.round(draftMm * (person ? person.unitPrice : 0));
  const assignmentRows = rows.map(row => `
    <button class="labor-row ${selected && selected.id === row.id ? 'active' : ''}" onclick="selectLaborAssignment('${row.id}')">
      <span>
        <strong>${row.name}</strong>
        <em>${row.role} · ${row.pLevel}</em>
      </span>
      <span class="labor-row-right">
        <b>${row.totalMm}MM</b>
        <i class="labor-status ${laborStatusClass(row.status)}">${row.status}</i>
      </span>
    </button>
  `).join('');

  const monthInputs = selected
    ? Object.keys(selected.monthly || {}).map(month => `
      <label class="labor-mm-cell">
        <span>${month}</span>
        <input id="labor-mm-${selected.id}-${month}" type="number" min="0" max="1" step="0.1" value="${selected.monthly[month]}">
      </label>
    `).join('')
    : '';

  const canRequest = selected && selected.status === 'MM 저장완료';
  const canApprove = selected && selected.status === 'SCM 승인대기';

  return `
    <div class="labor-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">인력 검색부터 SCM 승인완료까지</div>
        </div>
        <div class="labor-flow">
          <span>인력선택</span><span>기본정보 저장</span><span>월별 MM</span><span>승인요청</span><span>SCM 승인완료</span>
        </div>
      </div>
      <div class="labor-grid">
        <div class="labor-card labor-search-card">
          <div class="labor-card-title">1. 인력 선택</div>
          <input class="labor-search-input" value="${laborSearchQuery}" placeholder="이름, 조직, 역할, P레벨 검색"
            oninput="updateLaborSearch(this.value)">
          <div class="labor-candidates">
            ${candidates.map(p => `
              <button class="labor-candidate ${person && person.id === p.id ? 'active' : ''}" onclick="selectLaborCandidate('${p.id}')">
                <strong>${p.name}</strong>
                <span>${p.org} · ${p.role}</span>
                <em>${p.pLevel} / ${fmt(p.unitPrice)}원</em>
              </button>
            `).join('') || '<div class="labor-empty">검색된 인력이 없습니다.</div>'}
          </div>
        </div>
        <div class="labor-card">
          <div class="labor-card-title">2. 투입 기본정보</div>
          <div class="labor-form">
            <label><span>투입 시작일</span><input id="labor-start" type="date" value="${defaultStart}"></label>
            <label><span>투입 종료일</span><input id="labor-end" type="date" value="${defaultEnd}"></label>
            <label><span>투입유형</span>
              <select id="labor-work-type">
                <option value="Full" ${defaultType === 'Full' ? 'selected' : ''}>Full</option>
                <option value="Part" ${defaultType === 'Part' ? 'selected' : ''}>Part</option>
              </select>
            </label>
          </div>
          <div class="labor-summary">
            <div><span>P레벨</span><strong>${person ? person.pLevel : '-'}</strong></div>
            <div><span>총 MM</span><strong>${draftMm}MM</strong></div>
            <div><span>예상금액</span><strong>${fmt(draftAmount)}원</strong></div>
          </div>
          <div class="labor-actions">
            ${editing ? '<button class="labor-sub-btn" onclick="cancelLaborEdit()">수정취소</button>' : ''}
            <button class="labor-main-btn" onclick="saveLaborAssignmentDraft()">${editing ? '기본정보 수정 저장' : '투입 기본정보 저장'}</button>
          </div>
        </div>
        <div class="labor-card">
          <div class="labor-card-title">3. 등록 인력</div>
          <div class="labor-list">${assignmentRows || '<div class="labor-empty">등록된 인력이 없습니다.</div>'}</div>
        </div>
      </div>
      ${selected ? `
        <div class="labor-month-card">
          <div class="labor-month-head">
            <div>
              <div class="labor-card-title">4. 월별 MM 입력 및 승인</div>
              <div class="labor-selected">${selected.name} · ${selected.startDate} ~ ${selected.endDate} · ${selected.workType}</div>
            </div>
            <div class="labor-selected-total">
              <span>${selected.totalMm}MM</span>
              <strong>${fmt(selected.amount)}원</strong>
              <i class="labor-status ${laborStatusClass(selected.status)}">${selected.status}</i>
            </div>
          </div>
          <div class="labor-mm-grid">${monthInputs}</div>
          <div class="labor-approval-line">
            <span class="${selected.status !== 'MM 입력중' ? 'on' : ''}">MM 저장</span>
            <span class="${['SCM 승인대기','SCM 승인완료'].includes(selected.status) ? 'on' : ''}">SCM 전송</span>
            <span class="${selected.status === 'SCM 승인완료' ? 'on' : ''}">승인완료</span>
            <em>${selected.scmDocNo || 'SCM 문서번호 미생성'}</em>
          </div>
          <div class="labor-actions right">
            <button class="labor-sub-btn" onclick="editLaborAssignment('${selected.id}')">기본정보 수정</button>
            <button class="labor-sub-btn" onclick="saveLaborMonthlyMm('${selected.id}')">월별 MM 저장</button>
            <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestLaborApproval('${selected.id}')">승인요청</button>
            <button class="labor-main-btn teal" ${canApprove ? '' : 'disabled'} onclick="completeLaborScmApproval('${selected.id}')">SCM 승인완료 반영</button>
          </div>
        </div>` : ''}
    </div>`;
}

let laborRegistrationMode = null;

function openNewLaborRegistration() {
  laborRegistrationMode = 'new';
  editingLaborAssignmentId = null;
  selectedLaborAssignmentId = '';
  renderBudgetPage();
}

function selectLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = null;
  renderBudgetPage();
}

function editLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = id;
  laborRegistrationMode = 'edit';
  renderBudgetPage();
}

function cancelLaborEdit() {
  editingLaborAssignmentId = null;
  laborRegistrationMode = null;
  renderBudgetPage();
}

function selectMaterialQuoteLine(quoteNo) {
  const group = getMaterialQuoteGroupFinal(quoteNo);
  if (!group) return;
  materialSelectedQuoteNoFinal = group.quoteNo;
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = group.quoteNo;
  materialQuoteAmount = materialQuoteAmountFinal(group);
  materialQuoteTitle = group.purchaseName;
  editingMaterialItemId = null;
  renderBudgetPage();
}

function startMaterialDirectInput() {
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = true;
  materialQuoteSelectedYn = 'N';
  materialQuoteNo = '';
  materialQuoteAmount = 0;
  materialQuoteTitle = '';
  editingMaterialItemId = null;
  renderBudgetPage();
}

function switchMaterialQuoteSelectedYn(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  if (!materialSelectedQuoteNoFinal) materialSelectedQuoteNoFinal = materialPurchaseQuoteGroupsFinal[0]?.quoteNo || '';
  renderBudgetPage();
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  materialDirectInputOpenFinal = row.quoteSelectedYn === 'N';
  materialSelectedQuoteNoFinal = row.quoteNo || '';
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpenFinal ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;
  const group = quoteYn === 'Y' ? getMaterialQuoteGroupFinal(document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || [];
  const main = lines[0] || {};
  if (quoteYn === 'Y' && !group) return showToast('구매시스템에서 수신된 견적 1건을 먼저 선택해 주세요.');
  if (!amount) return showToast('견적/예산 금액을 입력해 주세요.');
  if (quoteYn === 'Y' && !inspectionDueMonth) return showToast('검수예정일을 입력해 주세요.');
  if (quoteYn === 'N' && (!startMonth || !endMonth || startMonth > endMonth)) return showToast('예산 시작월과 종료월을 확인해 주세요.');

  const directLine = {
    itemNo:document.getElementById('material-item-no')?.value || '10',
    itemCode:document.getElementById('material-item-code')?.value || '',
    categoryName:document.getElementById('material-category-name')?.value || '',
    standardName:document.getElementById('material-standard-name')?.value || '',
    manufacturer:document.getElementById('material-manufacturer')?.value || '',
    model:document.getElementById('material-model')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
    unit:document.getElementById('material-unit')?.value || 'EA',
    amount,
  };
  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn: quoteYn,
    quoteLineId: group?.quoteNo || '',
    quoteNo: group?.quoteNo || '',
    purchaseName: group?.purchaseName || directLine.standardName || '직접입력 상품재료비',
    vendor: group?.vendor || directLine.manufacturer,
    poNo: document.getElementById('material-po-no')?.value || group?.poNo || '',
    itemNo: quoteYn === 'Y' ? '복수' : directLine.itemNo,
    itemCode: main.itemCode || directLine.itemCode,
    categoryName: main.categoryName || directLine.categoryName,
    standardName: group?.purchaseName || directLine.standardName,
    manufacturer: group?.vendor || directLine.manufacturer,
    large: main.categoryName || directLine.categoryName,
    small: group?.purchaseName || directLine.standardName,
    model: quoteYn === 'Y' ? `${lines.length}개 품목` : directLine.model,
    productDetail: group?.purchaseName || directLine.standardName,
    quantity: quoteYn === 'Y' ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : directLine.quantity,
    unit: quoteYn === 'Y' ? 'SET' : directLine.unit,
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    amount,
    itemCount: quoteYn === 'Y' ? lines.length : 1,
    detailLines: quoteYn === 'Y' ? lines : [directLine],
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
    status:'계획',
  };
  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) return showToast('품목 정보를 입력해 주세요.');
  if (editing) Object.assign(editing, item);
  else rows.unshift(item);
  showToast(editing ? '상품재료비 계획을 수정했습니다.' : '상품재료비 계획을 등록했습니다.');
  editingMaterialItemId = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
}

function renderMaterialItemForm(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const group = isQuote ? getMaterialQuoteGroupFinal(source.quoteNo || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || source.detailLines || [];
  const main = lines[0] || source;
  const inspectionDueMonth = source.inspectionDueMonth || source.revenueBasis || group?.inspectionDueMonth || source.deliveryEnd?.slice(0, 7) || '2026-08';
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
  const readonly = isQuote ? 'readonly' : '';
  return `
    <div class="labor-card material-entry-card">
      <div class="labor-flow-title">
        <strong>${editing ? '상품재료비 계획 수정' : '상품재료비 계획 등록'}</strong>
        ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
      </div>
      <div class="labor-form os-ma-form material-item-form">
        <label><span>견적선정유무</span><input value="${quoteYn}" readonly></label>
        <label><span>견적번호</span><input id="material-quote-no" value="${group?.quoteNo || source.quoteNo || ''}" readonly></label>
        <label><span>구매건명</span><input id="material-standard-name" value="${group?.purchaseName || source.purchaseName || source.standardName || ''}" ${readonly}></label>
        <label><span>업체</span><input id="material-manufacturer" value="${group?.vendor || source.vendor || source.manufacturer || ''}" ${readonly}></label>
        <label><span>대표 품목코드</span><input id="material-item-code" value="${main.itemCode || source.itemCode || ''}" ${readonly}></label>
        <label><span>대표 분류명</span><input id="material-category-name" value="${main.categoryName || source.categoryName || ''}" ${readonly}></label>
        <label><span>품목 수</span><input id="material-model" value="${isQuote ? `${lines.length}개 품목` : (source.model || '')}" ${readonly}></label>
        <label><span>수량 합계</span><input id="material-qty" inputmode="numeric" value="${isQuote ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : (source.quantity || 1)}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${isQuote ? 'SET' : (source.unit || 'EA')}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || group?.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label><span>검수예정일 *</span><input id="material-inspection-due" type="month" value="${inspectionDueMonth}"></label>
          <input type="hidden" id="material-budget-start" value="${inspectionDueMonth}">
          <input type="hidden" id="material-budget-end" value="${inspectionDueMonth}">
          <input type="hidden" id="material-item-no" value="복수">
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || materialQuoteAmountFinal(group)}" readonly></label>
        ` : `
          <label><span>항번</span><input id="material-item-no" value="${source.itemNo || '10'}"></label>
          <label><span>예산 시작월 *</span><input id="material-budget-start" type="month" value="${startMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산 종료월 *</span><input id="material-budget-end" type="month" value="${endMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산금액 *</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" oninput="refreshMaterialAllocationPreview()"></label>
          <input type="hidden" id="material-inspection-due" value="${endMonth}">
        `}
      </div>
      ${isQuote ? `<div class="bpo-rule-note"><strong>견적 1건 기준 등록</strong><span>1개의 견적/구매건 아래 여러 항번이 존재합니다. 실행예산에는 구매건 1건으로 등록하고 상세 물품 라인은 아래에서 확인합니다.</span></div>${renderMaterialQuoteDetailFinal(lines)}` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions"><button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button></div>
    </div>`;
}

function renderMaterialItemPanel() {
  ensureMaterialItemMockRowsFinal();
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedGroup = materialSelectedQuoteNoFinal ? getMaterialQuoteGroupFinal(materialSelectedQuoteNoFinal) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpenFinal ? 'N' : 'Y');
  const source = editing || (quoteYn === 'Y' && selectedGroup ? {
    quoteSelectedYn:'Y',
    quoteNo:selectedGroup.quoteNo,
    purchaseName:selectedGroup.purchaseName,
    vendor:selectedGroup.vendor,
    poNo:selectedGroup.poNo,
    inspectionDueMonth:selectedGroup.inspectionDueMonth,
    detailLines:selectedGroup.lines,
    ...materialQuoteMainLineFinal(selectedGroup),
    deliveryStart:monthStartDate(selectedGroup.inspectionDueMonth),
    deliveryEnd:monthEndDate(selectedGroup.inspectionDueMonth),
    amount:materialQuoteAmountFinal(selectedGroup),
  } : { quoteSelectedYn:'N', itemNo:'10', itemCode:'', categoryName:'', standardName:'', manufacturer:'', model:'', quantity:1, unit:'EA', deliveryStart:'2026-08-01', deliveryEnd:'2026-12-31', quoteNo:'', poNo:'', amount:0 });
  const shouldShowForm = !!editing || materialDirectInputOpenFinal || !!selectedGroup;
  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 구매건</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매건/PO 단위로 등록하고, 1개의 견적 안에 여러 항번의 물품 상세가 포함됩니다.</p>
    </div>
    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div><div class="labor-card-title">1. 견적선정유무 선택</div><p>Y는 구매시스템 견적 1건을 선택하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p></div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `<div class="material-quote-line-table quote-group">
        <div class="material-quote-group-head"><span>견적번호</span><span>구매건명</span><span>업체</span><span>항번 수</span><span>PO번호</span><span>수신일시</span><span>총 금액</span></div>
        ${materialPurchaseQuoteGroupsFinal.map(group => `<button class="material-quote-group ${materialSelectedQuoteNoFinal === group.quoteNo ? 'active' : ''}" onclick="selectMaterialQuoteLine('${group.quoteNo}')"><span>${group.quoteNo}</span><span>${group.purchaseName}</span><span>${group.vendor}</span><span>${group.lines.length}줄</span><span>${group.poNo || '-'}</span><span>${group.receivedAt}</span><strong>${fmt(materialQuoteAmountFinal(group))}원</strong></button>`).join('')}
      </div>` : `<div class="bpo-rule-note"><strong>직접입력 등록</strong><span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span></div>`}
    </div>
    ${shouldShowForm ? renderMaterialItemForm(source, quoteYn, editing) : '<div class="labor-empty material-form-empty">견적 1건을 선택하면 상품재료비 등록 영역과 상세 항번이 열립니다.</div>'}
    <div class="os-ma-table-wrap"><div class="os-ma-table material-item-plan-table">
      <div class="os-ma-head with-action material-item-head"><span>구분</span><span>견적번호</span><span>구매건명</span><span>업체</span><span>대표 품목</span><span>항번 수</span><span>검수예정일</span><span>PO번호</span><span>금액</span><span>상태</span><span></span></div>
      ${rows.map(row => `<div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}" onclick="editMaterialItem('${row.id}')"><span>${row.quoteSelectedYn === 'N' ? '직접' : '견적'}</span><span>${row.quoteNo || '-'}</span><span>${row.purchaseName || row.standardName || row.productDetail || '-'}</span><span>${row.vendor || row.manufacturer || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.itemCount || row.detailLines?.length || 1}줄</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span>${row.poNo || '-'}</span><span><b>${fmt(row.amount)}원</b></span><span>${row.status || '계획'}</span><span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span></div>`).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
    </div></div>`;
}

var materialSelectedQuoteNoFinal = '';
var materialDirectInputOpenFinal = false;

const materialPurchaseQuoteGroupsFinal = [
  {
    quoteNo:'MQ-202607-001',
    purchaseName:'HRMS 상품재료비 구매',
    vendor:'휴먼컨설팅그룹',
    receivedAt:'2026-07-01 11:10',
    poNo:'4500870148',
    inspectionDueMonth:'2026-08',
    lines:[
      { itemNo:'10', itemCode:'SW00014', categoryName:'소프트웨어-경영/인사', standardName:'HRMS(인사관리)', manufacturer:'휴먼컨설팅그룹', model:'hunel', quantity:1, unit:'EA', amount:52000000 },
      { itemNo:'20', itemCode:'SW00018', categoryName:'소프트웨어-경영/인사', standardName:'근태/인력 투입 관리 모듈', manufacturer:'휴먼컨설팅그룹', model:'hunel-TM', quantity:1, unit:'EA', amount:26000000 },
      { itemNo:'30', itemCode:'SW00019', categoryName:'소프트웨어-경영/인사', standardName:'인력 원가 리포트 모듈', manufacturer:'휴먼컨설팅그룹', model:'hunel-RPT', quantity:1, unit:'EA', amount:18000000 },
    ],
  },
  {
    quoteNo:'MQ-202607-002',
    purchaseName:'개발/검수 도구 구매',
    vendor:'QA Tech',
    receivedAt:'2026-07-02 09:35',
    poNo:'4500870152',
    inspectionDueMonth:'2026-10',
    lines:[
      { itemNo:'10', itemCode:'SW00021', categoryName:'소프트웨어-개발도구', standardName:'테스트 자동화 도구', manufacturer:'QA Tech', model:'QA-AUTO-STD', quantity:3, unit:'EA', amount:28000000 },
      { itemNo:'20', itemCode:'SW00022', categoryName:'소프트웨어-개발도구', standardName:'API Mock 서버 라이선스', manufacturer:'QA Tech', model:'API-MOCK-PRO', quantity:1, unit:'EA', amount:11000000 },
      { itemNo:'30', itemCode:'SW00023', categoryName:'소프트웨어-개발도구', standardName:'성능 테스트 에이전트', manufacturer:'QA Tech', model:'LOAD-AGENT', quantity:2, unit:'EA', amount:14000000 },
    ],
  },
  {
    quoteNo:'MQ-202607-003',
    purchaseName:'보안 패키지 구매',
    vendor:'SecureOne',
    receivedAt:'2026-07-02 16:20',
    poNo:'',
    inspectionDueMonth:'2026-11',
    lines:[
      { itemNo:'10', itemCode:'SW00033', categoryName:'소프트웨어-보안', standardName:'보안 점검 패키지', manufacturer:'SecureOne', model:'SEC-PACK-PRO', quantity:1, unit:'EA', amount:17000000 },
      { itemNo:'20', itemCode:'SW00034', categoryName:'소프트웨어-보안', standardName:'취약점 스캐너', manufacturer:'SecureOne', model:'VULN-SCAN', quantity:1, unit:'EA', amount:9000000 },
      { itemNo:'30', itemCode:'SW00035', categoryName:'소프트웨어-보안', standardName:'리포팅 템플릿', manufacturer:'SecureOne', model:'SEC-RPT', quantity:1, unit:'EA', amount:3000000 },
    ],
  },
];

function getMaterialQuoteGroupFinal(quoteNo) {
  return materialPurchaseQuoteGroupsFinal.find(group => group.quoteNo === quoteNo) || null;
}

function materialQuoteAmountFinal(group) {
  return (group?.lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0);
}

function materialQuoteMainLineFinal(group) {
  return group?.lines?.[0] || {};
}

function selectMaterialQuoteLine(lineId) {
  const group = materialPurchaseQuoteGroupsFinal.find(item => item.quoteNo === lineId || item.lines.some(line => `${item.quoteNo}-${line.itemNo}` === lineId));
  if (!group) return;
  materialSelectedQuoteNoFinal = group.quoteNo;
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = group.quoteNo;
  materialQuoteAmount = materialQuoteAmountFinal(group);
  materialQuoteTitle = group.purchaseName;
  editingMaterialItemId = null;
  renderBudgetPage();
}

function startMaterialDirectInput() {
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = true;
  materialQuoteSelectedYn = 'N';
  materialQuoteNo = '';
  materialQuoteAmount = 0;
  materialQuoteTitle = '';
  editingMaterialItemId = null;
  renderBudgetPage();
}

function switchMaterialQuoteSelectedYn(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpenFinal = false;
  materialQuoteSelectedYn = 'Y';
  if (!materialSelectedQuoteNoFinal) materialSelectedQuoteNoFinal = materialPurchaseQuoteGroupsFinal[0]?.quoteNo || '';
  renderBudgetPage();
}

function applyMaterialPurchaseQuote(quoteNo) {
  selectMaterialQuoteLine(quoteNo);
}

function ensureMaterialItemMockRowsFinal() {
  const rows = getMaterialRows();
  if (rows.some(row => row.id === 'mi-mock-quote-001')) return;
  const group1 = materialPurchaseQuoteGroupsFinal[0];
  const group2 = materialPurchaseQuoteGroupsFinal[1];
  rows.unshift(
    {
      id:'mi-mock-quote-001',
      quoteSelectedYn:'Y',
      quoteNo:group1.quoteNo,
      quoteLineId:group1.quoteNo,
      purchaseName:group1.purchaseName,
      vendor:group1.vendor,
      poNo:group1.poNo,
      inspectionDueMonth:'2026-08',
      itemCount:group1.lines.length,
      detailLines:group1.lines,
      ...materialQuoteMainLineFinal(group1),
      large:materialQuoteMainLineFinal(group1).categoryName,
      small:materialQuoteMainLineFinal(group1).standardName,
      productDetail:group1.purchaseName,
      revenueBasis:'2026-08',
      deliveryStart:'2026-08-01',
      deliveryEnd:'2026-08-31',
      amount:materialQuoteAmountFinal(group1),
      status:'계획',
    },
    {
      id:'mi-mock-quote-002',
      quoteSelectedYn:'Y',
      quoteNo:group2.quoteNo,
      quoteLineId:group2.quoteNo,
      purchaseName:group2.purchaseName,
      vendor:group2.vendor,
      poNo:group2.poNo,
      inspectionDueMonth:'2026-10',
      itemCount:group2.lines.length,
      detailLines:group2.lines,
      ...materialQuoteMainLineFinal(group2),
      large:materialQuoteMainLineFinal(group2).categoryName,
      small:materialQuoteMainLineFinal(group2).standardName,
      productDetail:group2.purchaseName,
      revenueBasis:'2026-10',
      deliveryStart:'2026-10-01',
      deliveryEnd:'2026-10-31',
      amount:materialQuoteAmountFinal(group2),
      status:'계획',
    }
  );
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  materialDirectInputOpenFinal = row.quoteSelectedYn === 'N';
  materialSelectedQuoteNoFinal = row.quoteNo || '';
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 상품재료비는 수정할 수 없습니다.');
    return;
  }

  const quoteYn = document.querySelector('input[name="material-quote-yn"]:checked')?.value || (materialDirectInputOpenFinal ? 'N' : 'Y');
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const inspectionDueMonth = document.getElementById('material-inspection-due')?.value || '';
  const startMonth = document.getElementById('material-budget-start')?.value || inspectionDueMonth;
  const endMonth = document.getElementById('material-budget-end')?.value || inspectionDueMonth;
  const group = quoteYn === 'Y' ? getMaterialQuoteGroupFinal(document.getElementById('material-quote-no')?.value || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || [];
  const mainLine = lines[0] || {};

  if (quoteYn === 'Y' && !group) {
    showToast('구매시스템에서 수신된 견적 1건을 먼저 선택해 주세요.');
    return;
  }
  if (!amount) {
    showToast('견적/예산 금액을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'Y' && !inspectionDueMonth) {
    showToast('검수예정일을 입력해 주세요.');
    return;
  }
  if (quoteYn === 'N' && (!startMonth || !endMonth || startMonth > endMonth)) {
    showToast('직접입력은 예산 시작월과 종료월을 올바르게 입력해 주세요.');
    return;
  }

  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn: quoteYn,
    quoteLineId: group?.quoteNo || '',
    quoteNo: group?.quoteNo || '',
    purchaseName: group?.purchaseName || document.getElementById('material-standard-name')?.value || '직접입력 상품재료비',
    vendor: group?.vendor || document.getElementById('material-manufacturer')?.value || '',
    poNo: document.getElementById('material-po-no')?.value || group?.poNo || '',
    itemNo: quoteYn === 'Y' ? '복수' : (document.getElementById('material-item-no')?.value || ''),
    itemCode: mainLine.itemCode || document.getElementById('material-item-code')?.value || '',
    categoryName: mainLine.categoryName || document.getElementById('material-category-name')?.value || '',
    standardName: group?.purchaseName || document.getElementById('material-standard-name')?.value || '',
    manufacturer: group?.vendor || document.getElementById('material-manufacturer')?.value || '',
    large: mainLine.categoryName || document.getElementById('material-category-name')?.value || '',
    middle: '',
    small: group?.purchaseName || document.getElementById('material-standard-name')?.value || '',
    model: quoteYn === 'Y' ? `${lines.length}개 품목` : (document.getElementById('material-model')?.value || ''),
    productDetail: group?.purchaseName || document.getElementById('material-standard-name')?.value || '',
    quantity: quoteYn === 'Y' ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
    unit: quoteYn === 'Y' ? 'SET' : (document.getElementById('material-unit')?.value || 'EA'),
    revenueBasis: inspectionDueMonth,
    inspectionDueMonth,
    deliveryStart: monthStartDate(startMonth),
    deliveryEnd: monthEndDate(endMonth),
    amount,
    itemCount: quoteYn === 'Y' ? lines.length : 1,
    detailLines: quoteYn === 'Y' ? lines : [{
      itemNo:document.getElementById('material-item-no')?.value || '10',
      itemCode:document.getElementById('material-item-code')?.value || '',
      categoryName:document.getElementById('material-category-name')?.value || '',
      standardName:document.getElementById('material-standard-name')?.value || '',
      manufacturer:document.getElementById('material-manufacturer')?.value || '',
      model:document.getElementById('material-model')?.value || '',
      quantity:parseBudgetAmount(document.getElementById('material-qty')?.value || 1),
      unit:document.getElementById('material-unit')?.value || 'EA',
      amount,
    }],
    monthlyAllocations: quoteYn === 'N' ? buildMaterialAllocations(startMonth, endMonth, amount) : [{ month:inspectionDueMonth, amount }],
    status:'계획',
  };

  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model) {
    showToast('품목코드, 분류명, 표준품명, 제조사, 모델명을 입력해 주세요.');
    return;
  }

  if (editing) {
    Object.assign(editing, item);
    showToast('상품재료비 계획을 수정했습니다.');
  } else {
    rows.unshift(item);
    showToast('상품재료비 계획을 등록했습니다.');
  }
  editingMaterialItemId = null;
  materialSelectedQuoteNoFinal = '';
  materialDirectInputOpenFinal = false;
  renderBudgetPage();
}

function renderMaterialQuoteDetailFinal(lines = []) {
  return `
    <div class="material-detail-line-table">
      <div class="material-detail-line-head">
        <span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>수량</span><span>단위</span><span>금액</span>
      </div>
      ${lines.map(line => `
        <div class="material-detail-line-row">
          <span>${line.itemNo}</span><span>${line.itemCode}</span><span>${line.categoryName}</span><span>${line.standardName}</span><span>${line.manufacturer}</span><span>${line.model}</span><span>${line.quantity}</span><span>${line.unit}</span><strong>${fmt(line.amount)}원</strong>
        </div>
      `).join('')}
    </div>`;
}

function renderMaterialAllocationPreview(source = {}) {
  const startMonth = source.startMonth || '';
  const endMonth = source.endMonth || '';
  const amount = Number(source.amount || 0);
  const allocations = source.allocations || buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    return '<div class="material-allocation-preview empty" id="material-allocation-preview">예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.</div>';
  }
  return `
    <div class="material-allocation-preview" id="material-allocation-preview">
      <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
      ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}
    </div>`;
}

function refreshMaterialAllocationPreview() {
  const target = document.getElementById('material-allocation-preview');
  if (!target) return;
  const startMonth = document.getElementById('material-budget-start')?.value || '';
  const endMonth = document.getElementById('material-budget-end')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('material-amount')?.value || 0);
  const allocations = buildMaterialAllocations(startMonth, endMonth, amount);
  if (!allocations.length) {
    target.className = 'material-allocation-preview empty';
    target.innerHTML = '예산 시작월, 종료월, 금액을 입력하면 월별 배분 계획이 표시됩니다.';
    return;
  }
  target.className = 'material-allocation-preview';
  target.innerHTML = `
    <div class="material-allocation-head"><span>월</span><span>배분금액</span></div>
    ${allocations.map(row => `<div class="material-allocation-row"><span>${row.month}</span><strong>${fmt(row.amount)}원</strong></div>`).join('')}`;
}

function renderMaterialItemForm(source, quoteYn, editing) {
  const isQuote = quoteYn === 'Y';
  const group = isQuote ? getMaterialQuoteGroupFinal(source.quoteNo || materialSelectedQuoteNoFinal) : null;
  const lines = group?.lines || source.detailLines || [];
  const mainLine = lines[0] || source;
  const inspectionDueMonth = source.inspectionDueMonth || source.revenueBasis || group?.inspectionDueMonth || source.deliveryEnd?.slice(0, 7) || '2026-08';
  const startMonth = source.deliveryStart?.slice(0, 7) || '2026-08';
  const endMonth = source.deliveryEnd?.slice(0, 7) || '2026-12';
  const readonly = isQuote ? 'readonly' : '';
  return `
    <div class="labor-card material-entry-card">
      <div class="labor-flow-title">
        <strong>${editing ? '상품재료비 계획 수정' : '상품재료비 계획 등록'}</strong>
        ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
      </div>
      <input type="hidden" id="material-quote-line-id" value="${group?.quoteNo || source.quoteLineId || ''}">
      <div class="labor-form os-ma-form material-item-form">
        <label><span>견적선정유무</span><input value="${quoteYn}" readonly></label>
        <label><span>견적번호</span><input id="material-quote-no" value="${group?.quoteNo || source.quoteNo || ''}" readonly></label>
        <label><span>구매건명</span><input id="material-standard-name" value="${group?.purchaseName || source.purchaseName || source.standardName || ''}" ${readonly}></label>
        <label><span>업체</span><input id="material-manufacturer" value="${group?.vendor || source.vendor || source.manufacturer || ''}" ${readonly}></label>
        <label><span>대표 품목코드</span><input id="material-item-code" value="${mainLine.itemCode || source.itemCode || ''}" ${readonly}></label>
        <label><span>대표 분류명</span><input id="material-category-name" value="${mainLine.categoryName || source.categoryName || ''}" ${readonly}></label>
        <label><span>품목 수</span><input id="material-model" value="${isQuote ? `${lines.length}개 품목` : (source.model || '')}" ${readonly}></label>
        <label><span>수량 합계</span><input id="material-qty" inputmode="numeric" value="${isQuote ? lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0) : (source.quantity || 1)}" ${readonly}></label>
        <label><span>단위</span><input id="material-unit" value="${isQuote ? 'SET' : (source.unit || 'EA')}" ${readonly}></label>
        <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || group?.poNo || ''}" placeholder="추후 PO 매핑" ${isQuote ? 'readonly' : ''}></label>
        ${isQuote ? `
          <label><span>검수예정일 *</span><input id="material-inspection-due" type="month" value="${inspectionDueMonth}"></label>
          <input type="hidden" id="material-budget-start" value="${inspectionDueMonth}">
          <input type="hidden" id="material-budget-end" value="${inspectionDueMonth}">
          <input type="hidden" id="material-item-no" value="복수">
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || materialQuoteAmountFinal(group)}" readonly></label>
        ` : `
          <label><span>항번</span><input id="material-item-no" value="${source.itemNo || '10'}"></label>
          <label><span>예산 시작월 *</span><input id="material-budget-start" type="month" value="${startMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산 종료월 *</span><input id="material-budget-end" type="month" value="${endMonth}" onchange="refreshMaterialAllocationPreview()"></label>
          <label><span>예산금액 *</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}" oninput="refreshMaterialAllocationPreview()"></label>
          <input type="hidden" id="material-inspection-due" value="${endMonth}">
        `}
      </div>
      ${isQuote ? `
        <div class="bpo-rule-note">
          <strong>견적 1건 기준 등록</strong>
          <span>1개의 견적/구매건 아래 여러 항번이 존재합니다. 실행예산에는 구매건 1건으로 등록하고, 상세 물품 라인은 아래에서 확인합니다.</span>
        </div>
        ${renderMaterialQuoteDetailFinal(lines)}
      ` : renderMaterialAllocationPreview({ startMonth, endMonth, amount:source.amount, allocations:source.monthlyAllocations })}
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>`;
}

function renderMaterialItemPanel() {
  ensureMaterialItemMockRowsFinal();
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const selectedGroup = materialSelectedQuoteNoFinal ? getMaterialQuoteGroupFinal(materialSelectedQuoteNoFinal) : null;
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : (materialDirectInputOpenFinal ? 'N' : 'Y');
  const source = editing || (quoteYn === 'Y' && selectedGroup ? {
    quoteSelectedYn:'Y',
    quoteNo:selectedGroup.quoteNo,
    quoteLineId:selectedGroup.quoteNo,
    purchaseName:selectedGroup.purchaseName,
    vendor:selectedGroup.vendor,
    poNo:selectedGroup.poNo,
    inspectionDueMonth:selectedGroup.inspectionDueMonth,
    detailLines:selectedGroup.lines,
    ...materialQuoteMainLineFinal(selectedGroup),
    deliveryStart:monthStartDate(selectedGroup.inspectionDueMonth),
    deliveryEnd:monthEndDate(selectedGroup.inspectionDueMonth),
    amount:materialQuoteAmountFinal(selectedGroup),
  } : {
    quoteSelectedYn:'N',
    itemNo:'10',
    itemCode:'',
    categoryName:'',
    standardName:'',
    manufacturer:'',
    model:'',
    quantity:1,
    unit:'EA',
    deliveryStart:'2026-08-01',
    deliveryEnd:'2026-12-31',
    quoteNo:'',
    poNo:'',
    amount:0,
  });
  const shouldShowForm = !!editing || materialDirectInputOpenFinal || !!selectedGroup;

  return `
    <div class="os-sub-summary ma material-item-summary">
      <div><strong>${rows.length}</strong><span>상품재료비 구매건</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>등록 금액</span></div>
      <p>상품재료비는 구매건/PO 단위로 등록하고, 1개의 견적 안에 여러 항번의 물품 상세가 포함됩니다.</p>
    </div>

    <div class="labor-card material-quote-line-card">
      <div class="labor-card-headline">
        <div>
          <div class="labor-card-title">1. 견적선정유무 선택</div>
          <p>Y는 구매시스템 견적 1건을 선택하고, N은 직접입력으로 예산 기간 내 금액을 배분합니다.</p>
        </div>
        <button class="labor-sync-btn" onclick="showToast('구매시스템 상품재료비 견적 데이터를 새로 조회했습니다.')">견적 실시간 조회</button>
      </div>
      <div class="os-quote-choice-row material-choice-row">
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 견적 사용</span></label>
        <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
      </div>
      ${quoteYn === 'Y' ? `
        <div class="material-quote-line-table quote-group">
          <div class="material-quote-group-head">
            <span>견적번호</span><span>구매건명</span><span>업체</span><span>항번 수</span><span>PO번호</span><span>수신일시</span><span>총 금액</span>
          </div>
          ${materialPurchaseQuoteGroupsFinal.map(group => `
            <button class="material-quote-group ${materialSelectedQuoteNoFinal === group.quoteNo ? 'active' : ''}" onclick="selectMaterialQuoteLine('${group.quoteNo}')">
              <span>${group.quoteNo}</span><span>${group.purchaseName}</span><span>${group.vendor}</span><span>${group.lines.length}줄</span><span>${group.poNo || '-'}</span><span>${group.receivedAt}</span><strong>${fmt(materialQuoteAmountFinal(group))}원</strong>
            </button>
          `).join('')}
        </div>` : `
        <div class="bpo-rule-note">
          <strong>직접입력 등록</strong>
          <span>견적이 확정되지 않은 단계에서는 예산 시작월~종료월과 예산금액을 입력해 월별 계획을 작성합니다.</span>
        </div>`}
    </div>

    ${shouldShowForm ? renderMaterialItemForm(source, quoteYn, editing) : '<div class="labor-empty material-form-empty">견적 1건을 선택하면 상품재료비 등록 영역과 상세 항번이 열립니다.</div>'}

    <div class="os-ma-table-wrap">
      <div class="os-ma-table material-item-plan-table">
        <div class="os-ma-head with-action material-item-head">
          <span>구분</span><span>견적번호</span><span>구매건명</span><span>업체</span><span>대표 품목</span><span>항번 수</span><span>검수예정일</span><span>PO번호</span><span>금액</span><span>상태</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}" onclick="editMaterialItem('${row.id}')">
            <span>${row.quoteSelectedYn === 'N' ? '직접' : '견적'}</span><span>${row.quoteNo || '-'}</span><span>${row.purchaseName || row.standardName || row.productDetail || '-'}</span><span>${row.vendor || row.manufacturer || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.itemCount || row.detailLines?.length || 1}줄</span><span>${row.inspectionDueMonth || row.revenueBasis || '-'}</span><span>${row.poNo || '-'}</span><span><b>${fmt(row.amount)}원</b></span><span>${row.status || '계획'}</span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="event.stopPropagation(); editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 상품재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function switchMaterialQuoteSelectedYn(value) {
  if (value === 'N') {
    startMaterialDirectInput();
    return;
  }
  materialDirectInputOpen = false;
  materialQuoteSelectedYn = 'Y';
  if (!selectedMaterialQuoteLineId) selectedMaterialQuoteLineId = materialQuoteLineRows[0]?.lineId || '';
  renderBudgetPage();
}

