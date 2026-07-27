// ════════════════════════════════════════
//  프로젝트 예산 현황 페이지
// ════════════════════════════════════════

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
  plan:{ 인건비:760000000, 외주비:1160000000, 재료비:150000000, 경비:90000000, 'A/S Cost':0 },
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
    budgetMockMonth('2026-09','plan',{ labor:35000000, outsource:56000000, material:7300000, expense:4100000 }),
    budgetMockMonth('2026-10','plan',{ labor:35000000, outsource:57000000, material:7400000, expense:4200000 }),
    budgetMockMonth('2026-11','plan',{ labor:36000000, outsource:58000000, material:7500000, expense:4300000 }),
    budgetMockMonth('2026-12','plan',{ labor:36000000, outsource:59000000, material:7600000, expense:4400000 }),
    budgetMockMonth('2027-01','plan',{ labor:37000000, outsource:60000000, material:7800000, expense:4500000 }),
    budgetMockMonth('2027-02','plan',{ labor:37000000, outsource:61000000, material:7900000, expense:4600000 }),
    budgetMockMonth('2027-03','plan',{ labor:38000000, outsource:62000000, material:8000000, expense:4700000 }),
    budgetMockMonth('2027-04','plan',{ labor:38000000, outsource:62000000, material:8000000, expense:4700000 }),
    budgetMockMonth('2027-05','plan',{ labor:39000000, outsource:61000000, material:7800000, expense:4600000 }),
    budgetMockMonth('2027-06','plan',{ labor:39000000, outsource:60000000, material:7600000, expense:4500000 }),
    budgetMockMonth('2027-07','plan',{ labor:38000000, outsource:57000000, material:7200000, expense:4300000 }),
    budgetMockMonth('2027-08','plan',{ labor:36000000, outsource:52000000, material:6500000, expense:4000000 }),
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
    <div style="display:grid;grid-template-columns:${gridCols};gap:12px;padding:8px 20px;font-size:11px;font-weight:600;color:#94a3b8;border-bottom:1px solid #f1f5f9;background:#fafbfd">
      <div>프로젝트</div><div style="padding-left:4px">일정 / 예산 소진율</div>
      <div style="text-align:center">단계</div><div style="text-align:center">리스크</div><div style="text-align:right">편차</div>
    </div>` : '';

  return `
    <div class="card bov-card">
      <div class="card-head">
        <span class="card-title">예산 통합 현황</span>
        <div style="display:flex;align-items:center;gap:14px;font-size:12px;color:#64748b">
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
      <div style="padding:8px 20px;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;background:#fafbfc">
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

// Final outsource rebuild override - keep this block at EOF so older mock variants cannot overwrite it.
var BPO_OUTSOURCE_KINDS_V2 = [
  { id:'direct', no:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'professional', no:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', no:'03', label:'외주출장비', desc:'출장비/집행월' },
  { id:'construction', no:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', no:'05', label:'이관외주비', desc:'이관월/금액/사유' },
  { id:'other', no:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

var bpoFormOpenV2 = false;
var bpoEditingIdV2 = null;
var bpoQuoteConfirmedV2 = 'Y';
var bpoSelectedQuoteV2 = 'Q-202607-001';
var bpoPoPopupOpenV2 = false;
var bpoMaQuoteNoV2 = 'MA-Q-202607-001';
var bpoInspectionFilterV2 = { month:'', grade:'', voucher:'' };
var bpoMonthlyCostReadyV2 = { direct:false, professional:false };
var bpoInspectionAdjustKindV2 = 'direct';

var bpoVendorRowsV2 = [
  { id:'bp', name:'BP Korea', owner:'최성훈', grade:'A', specialty:'Java/Vue/Oracle' },
  { id:'mirae', name:'미래정보기술', owner:'박지훈', grade:'A-', specialty:'전문직 컨설팅' },
  { id:'global', name:'Global AX Partners', owner:'Tran Minh', grade:'B+', specialty:'운영/유지보수' },
];

var bpoQuoteRowsV2 = {
  direct: [
    { quoteNo:'Q-202607-001', vendor:'BP Korea', contract:'예산관리시스템 구축 실투입 외주', poNo:'4500123456', start:'2026-09-01', end:'2027-10-31', amount:675350000, status:'견적확정' },
  ],
  professional: [
    { quoteNo:'Q-202607-901', vendor:'미래정보기술', contract:'전문직수수료/제안/기타 계획', poNo:'4500987654', start:'2026-08-01', end:'2026-12-31', amount:125000000, status:'견적확정' },
  ],
};

var bpoDirectQuoteDetailsV2 = [
  { workType:'개발/운영', grade:'특급기술자', start:'2026-09-01', end:'2027-03-31', mm:7.000, amount:77000000 },
  { workType:'개발/운영', grade:'고급기술자-상', start:'2026-09-01', end:'2027-03-31', mm:27.300, amount:259350000 },
  { workType:'개발/운영', grade:'고급기술자-하', start:'2026-11-01', end:'2027-10-31', mm:37.000, amount:339000000 },
];

var bpoProfessionalQuoteDetailsV2 = [
  { role:'PMO', start:'2026-08-01', end:'2026-12-31', assignType:'Full', people:1, mm:5.0, amount:55000000 },
  { role:'제안전략', start:'2026-08-01', end:'2026-10-31', assignType:'Part', people:2, mm:3.0, amount:36000000 },
  { role:'품질검토', start:'2026-09-01', end:'2026-12-31', assignType:'Part', people:1, mm:2.5, amount:34000000 },
];

var bpoDirectPlansV2 = [
  { id:'dir-1', vendor:'BP Korea', contract:'예산관리시스템 구축 실투입 외주', period:'2026.09 ~ 2027.10', amount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료' },
  { id:'dir-2', vendor:'Vietnam Front Team', contract:'Vue 화면 개발 1차', period:'2026.08 ~ 2027.02', amount:240000000, quoteNo:'Q-202607-002', poNo:'', status:'계획작성중' },
];

var bpoProfessionalPlansV2 = [
  { id:'pro-1', vendor:'미래정보기술', contract:'전문직수수료/제안/기타 계획', period:'2026.08 ~ 2026.12', amount:125000000, quoteNo:'Q-202607-901', poNo:'4500987654', status:'계획확정' },
];

var bpoTravelPlansV2 = [
  { id:'tr-1', requestNo:'7000003088', status:'요청', contractNo:'4500311570', buyer:'최성훈', person:'이승우 차장', detail:'Wuxi 출장', month:'2026-08', amount:4935405, air:831000, hotel:1654163, traffic:0, day:2285242, etc:165000, etcText:'비자수수료', actualized:false },
  { id:'tr-2', requestNo:'7000003112', status:'계획', contractNo:'4500123456', buyer:'최성훈', person:'김도윤 책임', detail:'베트남 개발센터 점검', month:'2026-10', amount:3280000, air:1200000, hotel:980000, traffic:250000, day:700000, etc:150000, etcText:'통역지원', actualized:false },
];

var bpoTransferPlansV2 = [
  { id:'tf-1', direction:'Receiver Project', month:'2026-09', amount:12000000, reason:'타 프로젝트 잔여 외주비 이관 수취', status:'계획' },
  { id:'tf-2', direction:'Sender Project', month:'2026-07', amount:-4500000, reason:'공통 개발센터 비용 타 프로젝트 배부', status:'집행완료' },
];

var bpoOtherPlansV2 = [
  { id:'ot-1', month:'2026-10', amount:6800000, description:'단기 기술지원 외주비 계획', status:'계획', actualized:false },
  { id:'ot-2', month:'2027-02', amount:4500000, description:'고객사 검수 대응 기타 외주성 비용', status:'계획', actualized:false },
];

var bpoMaQuoteRowsV2 = [
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-01-01', end:'2026-03-31', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-04-01', end:'2026-06-30', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-07-01', end:'2026-09-30', cycle:'분기', unitPrice:870000, amount:870000 },
  { quoteNo:'MA-Q-202607-001', standard:'SW 유지보수', unit:'AU', qty:1, start:'2026-10-01', end:'2026-12-31', cycle:'분기', unitPrice:870000, amount:870000 },
];

var bpoMaPlansV2 = [
  { id:'ma-1', vendor:'BP Korea', contract:'AI 원가관리 모듈 MA', quoteNo:'MA-Q-202607-001', period:'2026.01 ~ 2026.12', amount:3480000 },
  { id:'ma-2', vendor:'Global AX Partners', contract:'운영 안정화 MA', quoteNo:'MA-Q-202607-002', period:'2026.07 ~ 2027.06', amount:96000000 },
];

function bpoWonV2(value) {
  return `${fmt(Number(value || 0))}원`;
}

function bpoMonthRangeByDateV2(start, end) {
  if (typeof monthRangeByDate === 'function') return monthRangeByDate(start, end);
  const months = [];
  let d = new Date(`${start.slice(0, 7)}-01T00:00:00`);
  const e = new Date(`${end.slice(0, 7)}-01T00:00:00`);
  while (d <= e) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function bpoKindMetaV2(kind = outsourceKind) {
  return BPO_OUTSOURCE_KINDS_V2.find(item => item.id === kind) || BPO_OUTSOURCE_KINDS_V2[0];
}

function switchBpoKindV2Final(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS_V2.some(item => item.id === kind) ? kind : 'direct';
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  renderBudgetPage();
}

function renderBpoKindTabsV2Final() {
  return `
    <div class="cost-category-board bpo-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>외주비 상세 계정을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
        <b>견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</b>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
        ${BPO_OUTSOURCE_KINDS_V2.map(item => `
          <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchBpoKindV2Final('${item.id}')">
            <em>${item.no}</em>
            <strong>${item.label}</strong>
            <span>${item.desc}</span>
            ${outsourceKind === item.id ? '<i>선택됨</i>' : ''}
          </button>`).join('')}
      </div>
    </div>`;
}

function renderBpoOutsourcePanelFinal(data) {
  const meta = bpoKindMetaV2();
  let title = '실투입대상 외주비 계획 등록';
  let body = renderBpoContractPanelV2('direct');
  if (outsourceKind === 'professional') {
    title = '전문직수수료/제안/기타 계획 등록';
    body = renderBpoContractPanelV2('professional');
  } else if (outsourceKind === 'travel') {
    title = '외주출장비 계획 등록';
    body = renderBpoTravelPanelV2();
  } else if (outsourceKind === 'construction') {
    title = '공사MA 계획 등록';
    body = renderBpoMaPanelV2();
  } else if (outsourceKind === 'transfer') {
    title = '이관외주비 계획 등록';
    body = renderBpoTransferPanelV2();
  } else if (outsourceKind === 'other') {
    title = '기타외주비 계획 등록';
    body = renderBpoOtherPanelV2();
  }
  return `
    <div class="outsource-panel bpo-panel">
      <div class="labor-panel-head bpo-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact"><span class="os-kind-caption">${meta.desc}</span></div>
      </div>
      ${renderBpoKindTabsV2Final()}
      <div class="cost-selected-detail bpo-detail">
        <div class="bpo-detail-title">
          <div>
            <div class="cost-selected-title">${title}</div>
            <span>선택한 상세계정의 신규 계획을 등록하거나 기존 내역을 수정합니다.</span>
          </div>
          <button class="labor-main-btn" onclick="bpoOpenNewV2('${outsourceKind}')">신규등록</button>
        </div>
        ${body}
      </div>
    </div>`;
}

function bpoOpenNewV2(kind = outsourceKind) {
  outsourceKind = kind || 'direct';
  bpoFormOpenV2 = true;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  if (outsourceKind === 'direct' || outsourceKind === 'professional') bpoMonthlyCostReadyV2[outsourceKind] = false;
  renderBudgetPage();
}

function bpoEditV2(kind, id) {
  outsourceKind = kind || outsourceKind;
  bpoFormOpenV2 = true;
  bpoEditingIdV2 = id || null;
  renderBudgetPage();
}

function bpoCloseFormV2() {
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  bpoMonthlyCostReadyV2.direct = false;
  bpoMonthlyCostReadyV2.professional = false;
  renderBudgetPage();
}

function switchOutsourceKind(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS_V2.some(item => item.id === kind) ? kind : 'direct';
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  bpoPoPopupOpenV2 = false;
  renderBudgetPage();
}

function renderOutsourceKindTabs() {
  return `
    <div class="cost-category-board bpo-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>외주비 상세 계정을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
        <b>견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</b>
      </div>
      <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
        ${BPO_OUTSOURCE_KINDS_V2.map(item => `
          <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
            <em>${item.no}</em>
            <strong>${item.label}</strong>
            <span>${item.desc}</span>
            ${outsourceKind === item.id ? '<i>선택됨</i>' : ''}
          </button>`).join('')}
      </div>
    </div>`;
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  const meta = bpoKindMetaV2();
  return `
    <div class="outsource-panel bpo-panel">
      <div class="labor-panel-head bpo-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle || meta.desc}</span>
        </div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail bpo-detail">
        <div class="bpo-detail-title">
          <div>
            <div class="cost-selected-title">${title}</div>
            <span>선택한 상세계정의 신규 계획을 등록하거나 기존 내역을 수정합니다.</span>
          </div>
          <button class="labor-main-btn" onclick="bpoOpenNewV2('${outsourceKind}')">신규등록</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderOutsourceContractPanel(data) {
  const meta = bpoKindMetaV2();
  if (outsourceKind === 'direct') return renderOutsourceShell('실투입대상 외주비 계획 등록', meta.desc, renderBpoContractPanelV2('direct'));
  if (outsourceKind === 'professional') return renderOutsourceShell('전문직수수료/제안/기타 계획 등록', meta.desc, renderBpoContractPanelV2('professional'));
  if (outsourceKind === 'travel') return renderOutsourceShell('외주출장비 계획 등록', meta.desc, renderBpoTravelPanelV2());
  if (outsourceKind === 'construction') return renderOutsourceShell('공사MA 계획 등록', meta.desc, renderBpoMaPanelV2());
  if (outsourceKind === 'transfer') return renderOutsourceShell('이관외주비 계획 등록', meta.desc, renderBpoTransferPanelV2());
  return renderOutsourceShell('기타외주비 계획 등록', meta.desc, renderBpoOtherPanelV2());
}

function renderBpoListTableV2(kind, rows) {
  const headers = kind === 'travel'
    ? ['요청번호','계약번호','출장내역','집행예정월','출장금액','상태','']
    : kind === 'transfer'
      ? ['구분','이관예정월','계획금액','사유','상태','']
      : kind === 'other'
        ? ['집행예정월','계획금액','설명','상태','']
        : kind === 'construction'
          ? ['업체/계약명','계약기간','계약금액','견적번호','']
          : ['업체 / 계약명','계약기간','계약금액','견적번호','PO번호','상태',''];
  const body = rows.map(row => {
    if (kind === 'travel') return `<tr><td>${row.requestNo}</td><td>${row.contractNo}</td><td>${row.detail}</td><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('travel','${row.id}')">수정</button></td></tr>`;
    if (kind === 'transfer') {
      const locked = row.direction === 'Sender Project' || row.status === '집행완료';
      return `<tr><td>${row.direction}</td><td>${row.month}</td><td class="num ${row.amount < 0 ? 'danger' : 'good'}">${bpoWonV2(row.amount)}</td><td>${row.reason}</td><td>${row.status}</td><td>${locked ? '<span class="bpo-readonly-text">조회</span>' : `<button class="labor-sub-btn" onclick="bpoEditV2('transfer','${row.id}')">수정</button>`}</td></tr>`;
    }
    if (kind === 'other') return `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.description}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('other','${row.id}')">수정</button></td></tr>`;
    if (kind === 'construction') return `<tr><td><b>${row.vendor}</b><br><span>${row.contract}</span></td><td>${row.period}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.quoteNo}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('construction','${row.id}')">수정</button></td></tr>`;
    return `<tr><td><b>${row.vendor}</b><br><span>${row.contract}</span></td><td>${row.period}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.quoteNo}</td><td>${row.poNo || '-'}</td><td>${row.status}</td><td><button class="labor-sub-btn" onclick="bpoEditV2('${kind}','${row.id}')">수정</button></td></tr>`;
  }).join('');
  return `
    <div class="bpo-list-card">
      <table class="bpo-list-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${body || `<tr><td colspan="${headers.length}" class="labor-empty">등록된 계획이 없습니다.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function renderBpoContractPanelV2(kind) {
  const isProfessional = kind === 'professional';
  const rows = isProfessional ? bpoProfessionalPlansV2 : bpoDirectPlansV2;
  const form = bpoFormOpenV2 ? renderBpoContractFormV2(kind) : '';
  return `
    ${renderBpoListTableV2(kind, rows)}
    ${form}`;
}

function bpoSelectedQuoteV2(kind) {
  const quoteNo = kind === 'professional' ? 'Q-202607-901' : bpoSelectedQuoteV2;
  const pool = kind === 'professional' ? bpoQuoteRowsV2.professional : bpoQuoteRowsV2.direct;
  return pool.find(q => q.quoteNo === quoteNo) || pool[0];
}

function renderBpoContractFormV2(kind) {
  const isProfessional = kind === 'professional';
  const title = isProfessional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입대상 외주 계약 등록';
  const quote = isProfessional ? bpoQuoteRowsV2.professional[0] : bpoQuoteRowsV2.direct[0];
  const readonly = bpoQuoteConfirmedV2 === 'Y' ? 'readonly' : '';
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head">
        <div><strong>${title}</strong><span>견적 확정 여부를 먼저 선택한 뒤 계획을 수립합니다.</span></div>
        <button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button>
      </div>
      <div class="bpo-choice-line">
        <span>1. 견적선정 여부</span>
        <label><input type="radio" name="bpo-quote-yn" value="Y" ${bpoQuoteConfirmedV2 === 'Y' ? 'checked' : ''} onchange="bpoSetQuoteConfirmedV2('Y')"> Y</label>
        <label><input type="radio" name="bpo-quote-yn" value="N" ${bpoQuoteConfirmedV2 === 'N' ? 'checked' : ''} onchange="bpoSetQuoteConfirmedV2('N')"> N</label>
      </div>
      <div class="bpo-contract-grid">
        <label><span>업체명</span><input value="${quote.vendor}" ${readonly}></label>
        <label><span>계약명</span><input value="${quote.contract}" ${readonly}></label>
        <label><span>계약기간</span><input value="${quote.start} ~ ${quote.end}" ${readonly}></label>
        <label><span>계약금액</span><input value="${bpoWonV2(quote.amount)}" ${readonly}></label>
        <label><span>견적번호</span><div class="bpo-input-button"><input value="${quote.quoteNo}" ${readonly}><button title="구매시스템 견적 검색">⌕</button></div></label>
        <label><span>PO번호</span><input value="${quote.poNo || '-'}" ${readonly}></label>
      </div>
      ${renderBpoQuoteBreakdownV2(kind)}
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function bpoSetQuoteConfirmedV2(value) {
  bpoQuoteConfirmedV2 = value === 'N' ? 'N' : 'Y';
  renderBudgetPage();
}

function renderBpoQuoteBreakdownV2(kind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const quoteTotal = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '견적 총액을 기간 내 월별로 N분할하고 확정금액을 직접 보정합니다.' : '견적 산출내역 기준으로 월별 원가 등록대상 금액을 계산합니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showBpoInspectionAdjustV2('${kind}')">월별 검수계획금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead>
            <tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액(VAT별도)'] : ['업무구분','기술등급','투입시작일','투입종료일','투입MM','견적금액(VAT별도)']).map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${quoteRows.map(row => isProfessional
              ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${row.mm.toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
              : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${row.mm.toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="${isProfessional ? 6 : 5}">합계</td><td class="num">${bpoWonV2(quoteTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="os-inspection-title">월별 원가 등록 대상 <em>월별 1줄 기준</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr>${(isProfessional ? ['검수월','월별 원가금액','검수금액'] : ['검수월','월별 원가금액','실투입 전표번호','검수상태']).map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${monthly.map(row => isProfessional
              ? `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
              : `<tr><td><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`).join('')}
            <tr class="total"><td>합계</td><td class="num">${bpoWonV2(monthly.reduce((s,r)=>s+r.amount,0))}</td><td colspan="${isProfessional ? 1 : 2}"></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderBpoQuoteBreakdownV2(kind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const monthlyCostReady = bpoMonthlyCostReadyV2[isProfessional ? 'professional' : 'direct'];
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '견적 총액을 월별 금액으로 배분하고 확정금액을 직접 보정합니다.' : '견적 산출내역을 월 단위 금액으로 풀어 확인하고, 월별 확정금액을 보정합니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showBpoInspectionAdjustV2('${kind}')">월별 검수계획금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead>
            <tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액(VAT별도)'] : ['업무구분','기술등급','투입시작일','투입종료일','투입MM','견적금액(VAT별도)']).map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${quoteRows.map(row => isProfessional
              ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${Number(row.mm).toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
              : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${Number(row.mm).toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="${isProfessional ? 6 : 5}">합계</td><td class="num">${bpoWonV2(quoteTotal)}</td></tr>
          </tbody>
        </table>
      </div>
      ${monthlyCostReady ? `
        <div class="os-inspection-title">월별 원가 등록 대상 <em>${isProfessional ? '월별 금액 기준' : '월별 검수계획금액 확정 후 조회'}</em></div>
        <div class="bpo-table-scroll">
          <table class="bpo-list-table">
            <thead><tr>${(isProfessional ? ['검수월','기본 배분금액','확정금액','검수금액'] : ['검수월','월별 원가금액','실투입 전표번호','검수상태']).map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${monthly.map(row => {
                const confirmed = Number(row.confirmedAmount || row.amount || 0);
                return isProfessional
                  ? `<tr><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(confirmed)}</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
                  : `<tr><td><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></td><td class="num">${bpoWonV2(confirmed)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`;
              }).join('')}
              <tr class="total"><td>합계</td><td class="num">${bpoWonV2(monthly.reduce((s,r)=>s+Number(r.confirmedAmount || r.amount || 0),0))}</td><td colspan="${isProfessional ? 2 : 2}"></td></tr>
            </tbody>
          </table>
        </div>`
        : `<div class="bpo-cost-pending">
            <strong>월별 원가 등록 대상은 아직 생성되지 않았습니다.</strong>
            <span>[월별 검수계획금액 확정] 버튼을 눌러 견적 산출내역을 월별로 확정하면 아래에 월별 원가 등록 대상 표가 조회됩니다.</span>
          </div>`}
    </div>`;
}

function bpoDirectMonthlyRowsV2() {
  const months = ['2026-09','2026-10','2026-11','2026-12'];
  const amounts = [48050000, 48050000, 76300000, 76300000];
  return months.map((month, idx) => ({ month, amount:amounts[idx], voucher: idx === 0 ? '880012345' : '', status: idx === 0 ? '검수완료' : '미완료' }));
}

function bpoProfessionalMonthlyRowsV2() {
  const months = ['2026-08','2026-09','2026-10','2026-11','2026-12'];
  return months.map(month => ({ month, amount:25000000, inspectionAmount:0, ratio:20 }));
}

function bpoDirectMonthlyRowsV2() {
  const grouped = {};
  bpoDirectQuoteDetailsV2.forEach(row => {
    const months = bpoMonthRangeByDateV2(row.start, row.end);
    const monthlyAmount = months.length ? Math.round(Number(row.amount || 0) / months.length) : Number(row.amount || 0);
    months.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, amount:0, confirmedAmount:0, details:[], voucher:'', status:'미완료' };
      grouped[month].amount += monthlyAmount;
      grouped[month].confirmedAmount += monthlyAmount;
      grouped[month].details.push({ ...row, monthlyAmount });
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

function showBpoMonthDetailV2(month) {
  const rows = bpoDirectQuoteDetailsV2.map((row, idx) => ({
    ...row,
    month,
    amount: idx < 2 && ['2026-09','2026-10'].includes(month) ? Math.round(row.amount / 7) : Math.round(row.amount / 12),
    voucher: month === '2026-09' ? '880012345' : '',
    status: month === '2026-09' ? '검수완료' : '미완료',
  }));
  let modal = document.getElementById('bpo-month-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bpo-month-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head"><strong>${month} 검수계획 상세</strong><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">×</button></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>업무구분</th><th>기술등급</th><th>MM</th><th>금액</th><th>실투입 전표번호</th><th>검수상태</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.mm.toFixed(2)}</td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.voucher || '-'}</td><td>${row.status}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  bpoInspectionAdjustKindV2 = kind || outsourceKind || 'direct';
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head">
        <strong>월별 검수계획금액 확정</strong>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="bpo-modal-summary">
        <b>견적내용</b>
        <span>견적번호 ${isProfessional ? 'Q-202607-901' : 'Q-202607-001'} · 총액 ${bpoWonV2(quoteRows.reduce((s,r)=>s+r.amount,0))}</span>
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table compact">
          <thead><tr>${(isProfessional ? ['역할(L1)','시작일','종료일','AssignType','인원수','총MM','견적금액'] : ['업무구분','기술등급','시작일','종료일','MM','견적금액']).map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${quoteRows.map(row => isProfessional
            ? `<tr><td>${row.role}</td><td>${row.start}</td><td>${row.end}</td><td>${row.assignType}</td><td>${row.people}</td><td>${row.mm.toFixed(1)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`
            : `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start}</td><td>${row.end}</td><td>${row.mm.toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="bpo-filter-row">
        <label>검수월 <select onchange="filterBpoInspectionRowsV2(this.value)"><option value="">전체</option>${monthly.map(r=>`<option>${r.month}</option>`).join('')}</select></label>
        ${isProfessional ? '<label>검수금액 <select><option>전체</option><option>0원</option></select></label>' : '<label>실투입 생성여부 <select><option>전체</option><option>880012345</option><option>N</option></select></label>'}
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr>${(isProfessional ? ['월','기본 배분금액','확정금액','비중','검수금액'] : ['검수월','실투입 생성여부','MM','확정금액','검수상태']).map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody id="bpo-inspection-adjust-rows">
            ${monthly.map(row => isProfessional
              ? `<tr data-month="${row.month}"><td>${row.month}</td><td class="num">${bpoWonV2(row.amount)}</td><td><input value="${row.amount}" inputmode="numeric"></td><td>${row.ratio}%</td><td class="num">${bpoWonV2(row.inspectionAmount)}</td></tr>`
              : `<tr data-month="${row.month}"><td>${row.month}</td><td>${row.voucher || 'N'}</td><td><input ${row.voucher ? 'disabled' : ''} value="${row.month === '2026-09' ? '4.90' : '7.98'}"></td><td class="num">${bpoWonV2(row.amount)}</td><td>${row.status}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button class="labor-main-btn" onclick="bpoConfirmInspectionV2()">저장 및 확정</button></div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>${isProfessional ? '전문직수수료/제안/기타' : '실투입대상 외주비'}</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${isProfessional ? 'Q-202607-901' : 'Q-202607-001'}</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 내용</div>
        <div class="os-inspection-table quote ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>시작일</span><span>종료일</span><span>총MM</span><span>견적금액</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span>`
                : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span>`}
            </div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 확정</div>
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRowsV2(this.value)">
            <option value="">월 전체</option>
            ${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}
          </select>
          ${isProfessional
            ? '<select><option>검수금액 전체</option><option>0원</option></select>'
            : '<select><option>실투입 생성여부 전체</option><option>880012345</option><option>N</option></select>'}
        </div>
        <div class="os-inspection-table plan monthly-cost ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}
          </div>
          <div id="bpo-inspection-adjust-rows">
            ${monthly.map(row => `
              <div class="os-inspection-row" data-month="${row.month}">
                ${isProfessional
                  ? `<span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span>`
                  : `<span>${row.month}</span><span>${row.voucher || 'N'}</span><span><input class="restore-amount-input" ${row.voucher ? 'disabled' : ''} value="${row.month === '2026-09' ? '4.90' : '7.98'}"></span><span>${bpoWonV2(row.amount)}</span><span>${row.status}</span>`}
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  const quoteRows = isProfessional ? bpoProfessionalQuoteDetailsV2 : bpoDirectQuoteDetailsV2;
  const monthly = isProfessional ? bpoProfessionalMonthlyRowsV2() : bpoDirectMonthlyRowsV2();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>${isProfessional ? '전문직수수료/제안/기타' : '실투입대상 외주비'}</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${isProfessional ? 'Q-202607-901' : 'Q-202607-001'}</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '월별 금액 직접 보정' : '견적 월배분 금액 직접 보정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 산출내역</div>
        <div class="os-inspection-table quote ${isProfessional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span>`
                : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span>`}
            </div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 검수계획금액 확정</div>
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRowsV2(this.value)">
            <option value="">월 전체</option>
            ${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}
          </select>
          ${isProfessional
            ? '<select><option>검수금액 전체</option><option>0원</option></select>'
            : '<select><option>실투입 생성여부 전체</option><option>N</option><option>880012345</option></select>'}
        </div>
        <div class="os-inspection-table plan monthly-cost ${isProfessional ? 'professional' : 'direct-amount'}">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>견적기준 월금액</span><span>확정금액</span><span>실투입 생성여부</span><span>검수상태</span>'}
          </div>
          <div id="bpo-inspection-adjust-rows">
            ${monthly.map(row => {
              return `
                <div class="os-inspection-row" data-month="${row.month}">
                  ${isProfessional
                    ? `<span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span>`
                    : `<span><button class="os-month-link" onclick="showBpoMonthDetailV2('${row.month}')">${row.month}</button></span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" ${row.voucher ? 'disabled' : ''} value="${row.confirmedAmount || row.amount}" inputmode="numeric"></span><span>${row.voucher || 'N'}</span><span>${row.status}</span>`}
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBpoMonthDetailV2(month) {
  const summary = bpoDirectMonthlyRowsV2().find(row => row.month === month);
  const rows = summary ? summary.details : [];
  const total = rows.reduce((sum, row) => sum + Number(row.monthlyAmount || 0), 0);
  let modal = document.getElementById('bpo-month-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bpo-month-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal bpo-adjust-modal">
      <div class="actual-detail-head">
        <strong>${month} 견적기준 월금액 상세</strong>
        <button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>업무구분</th><th>기술등급</th><th>투입기간</th><th>견적MM</th><th>견적총액</th><th>해당월 금액</th></tr></thead>
          <tbody>
            ${rows.map(row => `<tr><td>${row.workType}</td><td>${row.grade}</td><td>${row.start} ~ ${row.end}</td><td>${Number(row.mm).toFixed(3)}</td><td class="num">${bpoWonV2(row.amount)}</td><td class="num">${bpoWonV2(row.monthlyAmount)}</td></tr>`).join('')}
            <tr class="total"><td colspan="5">합계</td><td class="num">${bpoWonV2(total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('bpo-month-detail-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function filterBpoInspectionRowsV2(month) {
  document.querySelectorAll('#bpo-inspection-adjust-rows [data-month]').forEach(row => {
    row.style.display = !month || row.dataset.month === month ? '' : 'none';
  });
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  showToast('월별 검수계획금액이 저장 및 확정되었습니다.');
  renderBudgetPage();
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  showToast('월별 검수계획금액이 확정되었습니다.');
  renderBudgetPage();
}

function bpoDirectInspectionRowsFromQuoteV22() {
  const rows = [];
  bpoDirectQuoteDetailsV2.forEach((quote, quoteIndex) => {
    const months = bpoMonthRangeByDateV2(quote.start, quote.end);
    const monthlyMm = months.length ? Number(quote.mm || 0) / months.length : Number(quote.mm || 0);
    const monthlyAmount = months.length ? Math.round(Number(quote.amount || 0) / months.length) : Number(quote.amount || 0);
    months.forEach((month, monthIndex) => {
      const hasVoucher = quoteIndex === 0 && monthIndex === 0;
      rows.push({
        key: `${quoteIndex}-${month}`,
        month,
        workType: quote.workType,
        grade: quote.grade,
        quoteStart: quote.start,
        quoteEnd: quote.end,
        quoteMm: Number(quote.mm || 0),
        quoteAmount: Number(quote.amount || 0),
        monthMm: Math.round(monthlyMm * 100) / 100,
        monthAmount: monthlyAmount,
        confirmedAmount: monthlyAmount,
        voucher: hasVoucher ? '880012345' : '',
        inspectionStatus: hasVoucher ? '검수완료' : '미완료',
      });
    });
  });
  return rows.sort((a, b) => a.month.localeCompare(b.month) || a.grade.localeCompare(b.grade));
}

function filterBpoInspectionRowsV22() {
  const work = (document.getElementById('bpo-filter-work')?.value || '').toLowerCase();
  const grade = (document.getElementById('bpo-filter-grade')?.value || '').toLowerCase();
  const month = (document.getElementById('bpo-filter-month')?.value || '').toLowerCase();
  const voucher = document.getElementById('bpo-filter-voucher')?.value || '';
  const status = document.getElementById('bpo-filter-status')?.value || '';
  document.querySelectorAll('#bpo-inspection-adjust-rows [data-os-adjust-row]').forEach(row => {
    const matchesWork = !work || row.dataset.work === work;
    const matchesGrade = !grade || row.dataset.grade === grade;
    const matchesMonth = !month || row.dataset.month === month;
    const matchesVoucher = !voucher || (voucher === '88' ? row.dataset.voucher.startsWith('88') : row.dataset.voucher === 'n');
    const matchesStatus = !status || row.dataset.status === status;
    row.style.display = matchesWork && matchesGrade && matchesMonth && matchesVoucher && matchesStatus ? '' : 'none';
  });
}

function recalcBpoInspectionAmountV22(input) {
  const row = input.closest('[data-os-adjust-row]');
  if (!row) return;
  const unit = Number(row.dataset.unit || 0);
  const mm = Math.max(0, Number(input.value || 0));
  const amount = Math.round(unit * mm);
  const amountEl = row.querySelector('[data-confirmed-amount]');
  if (amountEl) amountEl.textContent = bpoWonV2(amount);
}

function showBpoInspectionAdjustV2(kind = outsourceKind) {
  const isProfessional = kind === 'professional';
  if (isProfessional) {
    const quoteRows = bpoProfessionalQuoteDetailsV2;
    const monthly = bpoProfessionalMonthlyRowsV2();
    const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    let modal = document.getElementById('outsource-inspection-adjust-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'outsource-inspection-adjust-modal';
      modal.className = 'aipmo-link-overlay';
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
        <div class="labor-process-guide-head">
          <div><span>전문직수수료/제안/기타</span><strong>월별 검수계획금액 확정</strong></div>
          <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
        </div>
        <div class="labor-process-guide-body">
          <div class="os-adjust-summary">
            <div><span>견적번호</span><strong>Q-202607-901</strong></div>
            <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
            <div><span>보정방식</span><strong>금액 직접 보정</strong></div>
          </div>
          <div class="os-inspection-title">견적 산출내역</div>
          <div class="os-inspection-table quote professional">
            <div class="os-inspection-row head"><span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span></div>
            ${quoteRows.map(row => `<div class="os-inspection-row"><span>${row.role}</span><span>${row.start}</span><span>${row.end}</span><span>${row.assignType}</span><span>${row.people}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoWonV2(row.amount)}</span></div>`).join('')}
          </div>
          <div class="os-inspection-title">월별 확정</div>
          <div class="os-adjust-filterbar month-only">
            <label><span>검수월</span><select onchange="filterBpoInspectionRowsV2(this.value)"><option value="">전체</option>${monthly.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select></label>
          </div>
          <div class="os-inspection-table plan monthly-cost professional">
            <div class="os-inspection-row head"><span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span></div>
            <div id="bpo-inspection-adjust-rows">
              ${monthly.map(row => `<div class="os-inspection-row" data-month="${row.month}"><span>${row.month}</span><span>${bpoWonV2(row.amount)}</span><span><input class="restore-amount-input" value="${row.amount}" inputmode="numeric"></span><span>${row.ratio}%</span><span>${bpoWonV2(row.inspectionAmount)}</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="labor-process-guide-actions"><button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button></div>
      </div>`;
    modal.classList.add('open');
    return;
  }

  const quoteRows = bpoDirectQuoteDetailsV2;
  const rows = bpoDirectInspectionRowsFromQuoteV22();
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const baseTotal = rows.reduce((sum, row) => sum + Number(row.monthAmount || 0), 0);
  const workOptions = [...new Set(rows.map(row => row.workType))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  const gradeOptions = [...new Set(rows.map(row => row.grade))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  const monthOptions = [...new Set(rows.map(row => row.month))].map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('');
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>실투입대상 외주비</span>
          <strong>월별 검수계획금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>Q-202607-001</strong></div>
          <div><span>견적총액</span><strong>${bpoWonV2(quoteTotal)}</strong></div>
          <div><span>월별 배분합계</span><strong>${bpoWonV2(baseTotal)}</strong></div>
          <div><span>보정방식</span><strong>월 MM 보정 후 금액 자동산정</strong></div>
        </div>
        <div class="os-inspection-title">견적 산출내역</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액</span></div>
          ${quoteRows.map(row => `<div class="os-inspection-row"><span>${row.workType}</span><span>${row.grade}</span><span>${row.start}</span><span>${row.end}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoWonV2(row.amount)}</span></div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 검수계획금액 확정</div>
        <div class="os-adjust-filterbar">
          <label><span>업무구분</span><select id="bpo-filter-work" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${workOptions}</select></label>
          <label><span>기술등급</span><select id="bpo-filter-grade" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${gradeOptions}</select></label>
          <label><span>검수월</span><select id="bpo-filter-month" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option>${monthOptions}</select></label>
          <label><span>실투입</span><select id="bpo-filter-voucher" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option><option value="88">전표 있음</option><option value="n">전표 없음</option></select></label>
          <label><span>검수상태</span><select id="bpo-filter-status" onchange="filterBpoInspectionRowsV22()"><option value="">전체</option><option value="검수완료">검수완료</option><option value="미완료">미완료</option></select></label>
        </div>
        <div class="os-inspection-table plan monthly-cost">
          <div class="os-inspection-row head"><span>검수월</span><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수계획금액</span><span>실투입 전표</span><span>검수상태</span></div>
          <div id="bpo-inspection-adjust-rows">
            ${rows.map((row, index) => {
              const unit = row.monthMm ? Math.round(row.monthAmount / row.monthMm) : 0;
              return `
                <div class="os-inspection-row" data-os-adjust-row data-work="${row.workType.toLowerCase()}" data-grade="${row.grade.toLowerCase()}" data-month="${row.month.toLowerCase()}" data-voucher="${row.voucher ? row.voucher : 'n'}" data-status="${row.inspectionStatus}" data-base-amount="${row.monthAmount}" data-unit="${unit}">
                  <span>${row.month}</span>
                  <span>${row.workType}</span>
                  <span>${row.grade}</span>
                  <span><input class="restore-amount-input" value="${row.monthMm.toFixed(2)}" ${row.voucher ? 'disabled' : ''} oninput="recalcBpoInspectionAmountV22(this)"></span>
                  <span data-confirmed-amount>${bpoWonV2(row.confirmedAmount)}</span>
                  <span>${row.voucher || '-'}</span>
                  <span>${row.inspectionStatus}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="labor-sub-btn" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">닫기</button>
        <button class="budget-cost-primary" onclick="bpoConfirmInspectionV2()">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function bpoConfirmInspectionV2() {
  const modal = document.getElementById('outsource-inspection-adjust-modal');
  if (modal) modal.classList.remove('open');
  if (bpoInspectionAdjustKindV2 === 'direct' || bpoInspectionAdjustKindV2 === 'professional') {
    bpoMonthlyCostReadyV2[bpoInspectionAdjustKindV2] = true;
  }
  showToast('월별 검수계획금액이 저장 및 확정되었습니다. 월별 외주비 원가 등록 대상에 반영되었습니다.');
  renderBudgetPage();
}

function renderBpoTravelPanelV2() {
  return `${renderBpoListTableV2('travel', bpoTravelPlansV2)}${bpoFormOpenV2 ? renderBpoTravelFormV2() : ''}`;
}

function renderBpoTravelFormV2() {
  const row = bpoEditingIdV2 ? bpoTravelPlansV2.find(r => r.id === bpoEditingIdV2) : bpoTravelPlansV2[0];
  return `
    <div class="bpo-form-card full">
      <div class="bpo-form-head"><div><strong>외주출장비 계획 입력</strong><span>프로젝트에 매핑된 PO를 선택하고 출장비 확보 계획을 등록합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid wide travel-fields">
        <label><span>계약번호</span><div class="bpo-input-button"><input value="${row.contractNo || '4500311570'}"><button onclick="bpoTogglePoPopupV2()" title="PO 리스트 검색">⌕</button></div></label>
        <label><span>출장내역</span><input value="${row.detail || ''}" placeholder="예: Wuxi 출장"></label>
        <label><span>집행 예정월</span><input type="month" value="${row.month || '2026-08'}"></label>
        <label><span>출장금액</span><input value="${row.amount || ''}" placeholder="예: 4935405"></label>
      </div>
      ${bpoPoPopupOpenV2 ? renderBpoPoPopupInlineV2() : ''}
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function bpoTogglePoPopupV2() {
  bpoPoPopupOpenV2 = !bpoPoPopupOpenV2;
  renderBudgetPage();
}

function renderBpoPoPopupInlineV2() {
  const rows = ['4500311570','4500123456','4500987654'].map((po, idx) => ({ po, vendor:['BP Korea','BP Korea','미래정보기술'][idx], amount:[930300000,675350000,125000000][idx] }));
  return `<div class="bpo-popup-list"><strong>프로젝트 매핑 PO 리스트</strong>${rows.map(r=>`<button onclick="bpoPoPopupOpenV2=false;showToast('PO ${r.po}가 선택되었습니다.');renderBudgetPage()"><b>${r.po}</b><span>${r.vendor} · ${bpoWonV2(r.amount)}</span></button>`).join('')}</div>`;
}

function renderBpoTransferPanelV2() {
  return `
    <div class="bpo-rule-note">
      <strong>이관외주비 등록 기준</strong>
      <span>신규 계획 등록은 Receiver Project만 가능합니다. Sender Project는 타 시스템에서 집행이 완료된 뒤 이관 결과로 수신되어 리스트에서 조회만 가능합니다.</span>
    </div>
    ${renderBpoListTableV2('transfer', bpoTransferPlansV2)}
    ${bpoFormOpenV2 ? renderBpoTransferFormV2() : ''}`;
}

function renderBpoTransferFormV2() {
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>이관외주비 계획 입력</strong><span>신규 등록은 Receiver Project만 가능하며, Sender Project는 집행완료 후 조회 전용으로 반영됩니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid">
        <label><span>Project Type</span><input value="Receiver Project" readonly></label>
        <label><span>이관예정월</span><input type="month" value="2026-09"></label>
        <label><span>계획금액</span><input value="12000000"></label>
        <label><span>이관 사유</span><input value="타 프로젝트 잔여 외주비 이관"></label>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>`;
}

function renderBpoOtherPanelV2() {
  return `${renderBpoListTableV2('other', bpoOtherPlansV2)}${bpoFormOpenV2 ? `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>기타외주비 계획 입력</strong><span>실적 발생 전 계획만 수정 가능합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-contract-grid">
        <label><span>집행예정월</span><input type="month" value="2026-10"></label>
        <label><span>계획금액</span><input value="6800000"></label>
        <label><span>예산 설명</span><input value="단기 기술지원 외주비 계획"></label>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">등록</button></div>
    </div>` : ''}`;
}

function renderBpoMaPanelV2() {
  return `${renderBpoListTableV2('construction', bpoMaPlansV2)}${bpoFormOpenV2 ? renderBpoMaFormV2() : ''}`;
}

function renderBpoMaFormV2() {
  const lockedRows = bpoMaQuoteRowsV2.map((row, idx) => ({ ...row, month:row.end.slice(0,7), inspected:idx === 0 }));
  return `
    <div class="bpo-form-card">
      <div class="bpo-form-head"><div><strong>공사MA 계획 상세</strong><span>구매시스템에서 전송받은 견적데이터 중 선택해 계획을 수립합니다.</span></div><button class="labor-sub-btn" onclick="bpoCloseFormV2()">닫기</button></div>
      <div class="bpo-choice-line">
        <span>1. 견적 선택</span>
        <select onchange="bpoMaQuoteNoV2=this.value;renderBudgetPage()"><option>MA-Q-202607-001</option><option>MA-Q-202607-002</option></select>
      </div>
      <div class="os-inspection-title">2. 공사MA 계획 상세 <em>검수 이력이 있으면 검수집행월 수정 불가</em></div>
      <div class="bpo-table-scroll">
        <table class="bpo-list-table">
          <thead><tr><th>표준품명</th><th>단위</th><th>수량</th><th>유지보수 시작일</th><th>유지보수 종료일</th><th>공급단가</th><th>검수집행월</th><th>검수여부</th></tr></thead>
          <tbody>${lockedRows.map(row => `<tr><td>${row.standard}</td><td>${row.unit}</td><td>${row.qty}</td><td>${row.start}</td><td>${row.end}</td><td class="num">${bpoWonV2(row.unitPrice)}</td><td><input type="month" value="${row.month}" ${row.inspected ? 'disabled' : ''}></td><td>${row.inspected ? '검수완료' : '미검수'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="bpo-form-actions"><button class="labor-main-btn" onclick="bpoSaveMockV2()">최종확정</button></div>
    </div>`;
}

function bpoSaveMockV2() {
  bpoFormOpenV2 = false;
  bpoEditingIdV2 = null;
  showToast('목업 계획이 등록되었습니다.');
  renderBudgetPage();
}

// ---------------------------------------------------------------------------
// Final outsource rebuild override
// ---------------------------------------------------------------------------
var BPO_OUTSOURCE_KINDS = [
  { id:'direct', step:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'indirect', step:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', step:'03', label:'외주출장비', desc:'출장비/집행월' },
  { id:'construction', step:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', step:'05', label:'이관외주비', desc:'Sender/Receiver' },
  { id:'other', step:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

var bpoOutsourceState = {
  mode: null,
  editId: null,
  selectedQuoteDirect: 'Q-202607-001',
  selectedQuoteIndirect: 'Q-202607-P01',
  selectedQuoteMa: 'Q-202607-MA01',
  vendorPopup: false,
  quotePopup: false,
  filterMonth: '',
};

var bpoOutsourceRows = {
  direct: [
    { id:'direct-001', vendorName:'BP Korea', title:'예산관리시스템 외주 실투입', startDate:'2026-09-01', endDate:'2027-03-31', amount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계획확정' },
  ],
  indirect: [
    { id:'indirect-001', vendorName:'NOVA Partners', title:'전문직수수료/제안/기타 계획', startDate:'2026-09-01', endDate:'2026-12-31', amount:102000000, quoteNo:'Q-202607-P01', poNo:'4500678901', status:'계획확정' },
  ],
  travel: [
    { id:'travel-001', requestNo:'7000003088', poNo:'4500311570', buyer:'최성훈', inputPerson:'이승우 차장', expectedMonth:'2026-08', amount:4935405, air:831000, lodging:1654163, traffic:0, daily:2285242, etc:165000, description:'Wuxi 출장', status:'계획' },
  ],
  construction: [
    { id:'ma-001', vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-MA01', amount:3480000, status:'계획확정' },
  ],
  transfer: [
    { id:'transfer-001', transferType:'Receiver Project', expectedMonth:'2026-11', amount:12000000, description:'타 프로젝트 잔여 외주비 이관', status:'계획' },
  ],
  other: [
    { id:'other-001', expectedMonth:'2027-02', amount:4500000, description:'검수 대응 외부 지원 비용', status:'계획' },
  ],
};

var bpoVendors = [
  { id:'bp', name:'BP Korea', owner:'김민재', grade:'A', specialty:'Java/Vue 구축' },
  { id:'nova', name:'NOVA Partners', owner:'이정민', grade:'A', specialty:'전문직수수료/제안 컨설팅' },
  { id:'vn', name:'Vietnam Front Team', owner:'Tran Minh', grade:'A-', specialty:'Vue 화면개발' },
];

var bpoDirectQuoteRows = [
  { workType:'개발/운영', grade:'특급기술자', startDate:'2026-09-01', endDate:'2027-03-31', mm:7, amount:77000000 },
  { workType:'개발/운영', grade:'고급기술자-상', startDate:'2026-09-01', endDate:'2027-03-31', mm:27.3, amount:259350000 },
  { workType:'개발/운영', grade:'고급기술자-하', startDate:'2026-11-01', endDate:'2027-10-31', mm:37, amount:339000000 },
];

var bpoIndirectQuoteRows = [
  { role:'PMO 자문', startDate:'2026-09-01', endDate:'2026-12-31', assignType:'Full', headCount:1, mm:4, amount:48000000 },
  { role:'원가관리 컨설팅', startDate:'2026-10-01', endDate:'2026-12-31', assignType:'Part', headCount:1, mm:2, amount:36000000 },
  { role:'제안/검수 지원', startDate:'2026-11-01', endDate:'2026-12-31', assignType:'Part', headCount:2, mm:2, amount:18000000 },
];

var bpoMaQuoteRows = [
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-01-01', endDate:'2026-03-31', unitPrice:870000, executionMonth:'2026-03', inspected:true },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-04-01', endDate:'2026-06-30', unitPrice:870000, executionMonth:'2026-06', inspected:true },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-07-01', endDate:'2026-09-30', unitPrice:870000, executionMonth:'2026-09', inspected:false },
  { item:'SW 유지보수', unit:'AU', qty:1, startDate:'2026-10-01', endDate:'2026-12-31', unitPrice:870000, executionMonth:'2026-12', inspected:false },
];

function bpoKindMeta(kind) {
  return BPO_OUTSOURCE_KINDS.find(k => k.id === kind) || BPO_OUTSOURCE_KINDS[0];
}

function bpoMoney(value) {
  return `${fmt(Math.round(Number(value || 0)))}원`;
}

function bpoRows(kind = outsourceKind) {
  if (!bpoOutsourceRows[kind]) bpoOutsourceRows[kind] = [];
  return bpoOutsourceRows[kind];
}

function bpoQuoteRows(kind = outsourceKind) {
  return kind === 'indirect' ? bpoIndirectQuoteRows : bpoDirectQuoteRows;
}

function bpoMonthsBetween(startDate, endDate) {
  if (typeof monthRangeByDate === 'function') return monthRangeByDate(startDate, endDate);
  const result = [];
  let [y, m] = String(startDate).slice(0, 7).split('-').map(Number);
  const end = String(endDate).slice(0, 7);
  while (`${y}-${String(m).padStart(2, '0')}` <= end) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { y += 1; m = 1; }
  }
  return result;
}

function bpoMonthlyRows(kind = outsourceKind) {
  const quoteRows = bpoQuoteRows(kind);
  if (kind === 'indirect') {
    const starts = quoteRows.map(r => r.startDate).sort();
    const ends = quoteRows.map(r => r.endDate).sort();
    const months = bpoMonthsBetween(starts[0], ends[ends.length - 1]);
    const total = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const base = months.length ? Math.floor(total / months.length) : 0;
    return months.map((month, idx) => {
      const amount = idx === months.length - 1 ? total - base * (months.length - 1) : base;
      return {
        month,
        baseAmount: amount,
        confirmedAmount: amount,
        percent: total ? Math.round(amount / total * 1000) / 10 : 0,
        inspectionAmount: month < '2026-07' ? amount : 0,
      };
    });
  }

  const grouped = {};
  quoteRows.forEach(row => {
    const months = bpoMonthsBetween(row.startDate, row.endDate);
    months.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, mm:0, amount:0, detailCount:0, voucherNo:'', inspectionStatus:'미완료' };
      grouped[month].mm += Number(row.mm || 0) / months.length;
      grouped[month].amount += Number(row.amount || 0) / months.length;
      grouped[month].detailCount += 1;
      if (month < '2026-07') {
        grouped[month].voucherNo = '880012345';
        grouped[month].inspectionStatus = '검수완료';
      }
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).map(row => ({
    ...row,
    mm: Math.round(row.mm * 100) / 100,
    amount: Math.round(row.amount),
  }));
}

function renderOutsourceKindTabs() {
  return `
    <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
      ${BPO_OUTSOURCE_KINDS.map(item => `
        <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
          <span class="os-kind-step">${item.step}</span>
          <strong>${item.label}</strong>
          <em>${item.desc}</em>
          ${outsourceKind === item.id ? '<b>선택됨</b>' : ''}
        </button>`).join('')}
    </div>`;
}

function switchOutsourceKind(kind) {
  outsourceKind = BPO_OUTSOURCE_KINDS.some(item => item.id === kind) ? kind : 'direct';
  bpoOutsourceState.mode = null;
  bpoOutsourceState.editId = null;
  bpoOutsourceState.vendorPopup = false;
  bpoOutsourceState.quotePopup = false;
  renderBudgetPage();
}

function openNewOutsourceContract() {
  bpoOutsourceState.mode = 'new';
  bpoOutsourceState.editId = null;
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  bpoOutsourceState.mode = null;
  bpoOutsourceState.editId = null;
  renderBudgetPage();
}

function editBpoOutsourceRow(kind, id) {
  bpoOutsourceState.mode = 'edit';
  bpoOutsourceState.editId = id;
  outsourceKind = kind;
  renderBudgetPage();
}

function toggleBpoVendorPopup() {
  bpoOutsourceState.vendorPopup = !bpoOutsourceState.vendorPopup;
  renderBudgetPage();
}

function toggleBpoQuotePopup() {
  bpoOutsourceState.quotePopup = !bpoOutsourceState.quotePopup;
  renderBudgetPage();
}

function selectBpoQuote(kind, quoteNo) {
  if (kind === 'indirect') bpoOutsourceState.selectedQuoteIndirect = quoteNo;
  else if (kind === 'construction') bpoOutsourceState.selectedQuoteMa = quoteNo;
  else bpoOutsourceState.selectedQuoteDirect = quoteNo;
  bpoOutsourceState.quotePopup = false;
  showToast('구매시스템 견적 데이터가 반영되었습니다.');
  renderBudgetPage();
}

function renderBpoRegisteredList(kind) {
  const rows = bpoRows(kind);
  if (kind === 'travel' || kind === 'transfer' || kind === 'other') {
    return `
      <div class="bpo-list-card">
        <div class="bpo-list-head"><span>예정월</span><span>금액</span><span>구분/설명</span><span>상태</span><span></span></div>
        ${rows.map(row => `
          <div class="bpo-list-row">
            <span>${row.expectedMonth || '-'}</span>
            <strong>${bpoMoney(row.amount)}</strong>
            <span>${row.transferType ? `${row.transferType} / ` : ''}${row.description || ''}</span>
            <em>${row.status}</em>
            <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
          </div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
      </div>`;
  }
  if (kind === 'construction') {
    return `
      <div class="bpo-list-card">
        <div class="bpo-list-head contract"><span>업체 / 계약명</span><span>견적번호</span><span>금액</span><span>상태</span><span></span></div>
        ${rows.map(row => `
          <div class="bpo-list-row contract">
            <span><strong>${row.vendorName}</strong><i>${row.title}</i></span>
            <span>${row.quoteNo}</span>
            <strong>${bpoMoney(row.amount)}</strong>
            <em>${row.status}</em>
            <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
          </div>`).join('')}
      </div>`;
  }
  return `
    <div class="bpo-list-card">
      <div class="bpo-list-head contract"><span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span><span></span></div>
      ${rows.map(row => `
        <div class="bpo-list-row contract">
          <span><strong>${row.vendorName}</strong><i>${row.title}</i></span>
          <span>${row.startDate} ~ ${row.endDate}</span>
          <strong>${bpoMoney(row.amount)}</strong>
          <span>${row.quoteNo || '-'}</span>
          <span>${row.poNo || '-'}</span>
          <em>${row.status}</em>
          <button onclick="editBpoOutsourceRow('${kind}','${row.id}')">수정</button>
        </div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>`;
}

function renderBpoQuoteTable(kind) {
  const rows = bpoQuoteRows(kind);
  const professional = kind === 'indirect';
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="os-inspection-table-wrap">
      <div class="os-inspection-title">견적 산출내역 <em>Results : ${rows.length}</em></div>
      <div class="os-inspection-table quote ${professional ? 'professional' : ''}">
        <div class="os-inspection-row head">
          ${professional
            ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
            : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span>'}
        </div>
        ${rows.map(row => `
          <div class="os-inspection-row">
            ${professional
              ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${bpoMoney(row.amount)}</span>`
              : `<span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(3)}</span><span>${bpoMoney(row.amount)}</span>`}
          </div>`).join('')}
        <div class="os-inspection-row total">${professional ? '<span>합계</span><span></span><span></span><span></span><span></span><span></span>' : '<span>합계</span><span></span><span></span><span></span><span></span>'}<span>${bpoMoney(total)}</span></div>
      </div>
    </div>`;
}

function renderBpoMonthlyTarget(kind) {
  const professional = kind === 'indirect';
  const rows = bpoMonthlyRows(kind);
  return `
    <div class="os-inspection-table-wrap">
      <div class="os-inspection-title">월별 원가 등록 대상 <em>${professional ? '검수금액 기준' : '검수월 기준 1줄 합계'}</em></div>
      <div class="os-inspection-table plan monthly-cost ${professional ? 'professional' : ''}">
        <div class="os-inspection-row head">
          ${professional
            ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
            : '<span>검수월</span><span>월별 원가금액</span><span>실투입 전표 번호</span><span>검수상태</span>'}
        </div>
        ${rows.map(row => `
          <div class="os-inspection-row">
            ${professional
              ? `<span>${row.month}</span><span>${bpoMoney(row.baseAmount)}</span><span>${bpoMoney(row.confirmedAmount)}</span><span>${row.percent}%</span><span>${bpoMoney(row.inspectionAmount)}</span>`
              : `<span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${kind}','${row.month}')">${row.month}</button></span><span>${bpoMoney(row.amount)}</span><span>${row.voucherNo || '-'}</span><span>${row.inspectionStatus}</span>`}
          </div>`).join('')}
      </div>
    </div>`;
}

function renderBpoContractForm(kind) {
  const professional = kind === 'indirect';
  const quoteNo = professional ? bpoOutsourceState.selectedQuoteIndirect : bpoOutsourceState.selectedQuoteDirect;
  const title = professional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입 외주 계약 등록';
  return `
    <div class="labor-card bpo-form-card">
      <div class="labor-flow-title">
        <strong>${title}</strong>
        <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
      </div>
      <div class="bpo-step-note">1. 견적확정 여부를 먼저 선택한 뒤, 확정 견적이면 구매시스템 데이터를 불러오고 미확정이면 직접 입력합니다.</div>
      <div class="labor-form os-contract-form bpo-contract-form">
        <label><span>견적확정 여부</span><select id="bpo-quote-confirmed"><option>Y</option><option>N</option></select></label>
        <label><span>견적번호</span><div class="bpo-input-button"><input id="bpo-quote-no" value="${quoteNo}" ${professional ? '' : 'readonly'}><button type="button" onclick="toggleBpoQuotePopup()">⌕</button></div></label>
        <label><span>업체</span><div class="bpo-input-button"><input id="bpo-vendor" value="${professional ? 'NOVA Partners' : 'BP Korea'}" ${professional ? '' : 'readonly'}><button type="button" onclick="toggleBpoVendorPopup()">⌕</button></div></label>
        <label class="wide"><span>계약명</span><input id="bpo-title" value="${professional ? '전문직수수료/제안/기타 계획' : '예산관리시스템 외주 실투입'}" ${professional ? '' : 'readonly'}></label>
        <label><span>시작일</span><input id="bpo-start" type="date" value="2026-09-01" ${professional ? '' : 'readonly'}></label>
        <label><span>종료일</span><input id="bpo-end" type="date" value="${professional ? '2026-12-31' : '2027-03-31'}" ${professional ? '' : 'readonly'}></label>
        <label><span>계약금액</span><input id="bpo-amount" value="${professional ? '102000000' : '675350000'}" ${professional ? '' : 'readonly'}></label>
        <label><span>PO번호</span><input id="bpo-po" value="${professional ? '4500678901' : '4500123456'}"></label>
      </div>
      ${bpoOutsourceState.vendorPopup ? `
        <div class="bpo-popup-list">
          ${bpoVendors.map(v => `<button onclick="toggleBpoVendorPopup()"><strong>${v.name}</strong><span>${v.specialty} / ${v.owner} / ${v.grade}</span></button>`).join('')}
        </div>` : ''}
      ${bpoOutsourceState.quotePopup ? `
        <div class="bpo-popup-list">
          <button onclick="selectBpoQuote('${kind}','${professional ? 'Q-202607-P01' : 'Q-202607-001'}')"><strong>${professional ? 'Q-202607-P01' : 'Q-202607-001'}</strong><span>${professional ? '전문직수수료/제안/기타 견적' : '외주 실투입 견적'}</span></button>
        </div>` : ''}
      <div class="os-inspection-card">
        <div class="os-inspection-head">
          <div>
            <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
            <span>${professional ? '견적 전체 금액을 기간 월수로 N등분하고 확정금액은 사용자가 직접 보정합니다.' : '견적 산출내역으로 월별 원가 등록 대상이 계산됩니다.'}</span>
          </div>
          <div class="os-inspection-actions">
            <button class="labor-main-btn" onclick="showOutsourceInspectionAdjustGuide('${kind}')">월별 검수금액 확정</button>
          </div>
        </div>
        ${renderBpoQuoteTable(kind)}
        ${renderBpoMonthlyTarget(kind)}
      </div>
      <div class="labor-actions">
        <button class="labor-main-btn" onclick="saveBpoContract('${kind}')">등록</button>
      </div>
    </div>`;
}

function saveBpoContract(kind) {
  const rows = bpoRows(kind);
  rows.unshift({
    id:`${kind}-${Date.now()}`,
    vendorName: document.getElementById('bpo-vendor')?.value || (kind === 'indirect' ? 'NOVA Partners' : 'BP Korea'),
    title: document.getElementById('bpo-title')?.value || bpoKindMeta(kind).label,
    startDate: document.getElementById('bpo-start')?.value || '2026-09-01',
    endDate: document.getElementById('bpo-end')?.value || '2026-12-31',
    amount: parseBudgetAmount(document.getElementById('bpo-amount')?.value || 0),
    quoteNo: document.getElementById('bpo-quote-no')?.value || '',
    poNo: document.getElementById('bpo-po')?.value || '',
    status:'계획',
  });
  bpoOutsourceState.mode = null;
  showToast(`${bpoKindMeta(kind).label} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderBpoDirectIndirectPanel(kind) {
  return `
    <div class="bpo-section-head">
      <div>
        <h3>${bpoKindMeta(kind).label} 계획 등록</h3>
        <p>기등록 계획을 확인하고, 신규등록 버튼으로 구매시스템 견적 기반 계획을 추가합니다.</p>
      </div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList(kind)}
    ${bpoOutsourceState.mode ? renderBpoContractForm(kind) : ''}`;
}

function renderBpoTravelPanel() {
  const rows = bpoRows('travel');
  return `
    <div class="bpo-section-head">
      <div><h3>외주출장비 계획 등록</h3><p>프로젝트에 매핑된 PO를 검색해 출장비 확보 계획을 등록합니다.</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList('travel')}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-form os-contract-form bpo-contract-form">
          <label><span>요청번호</span><input value="7000003088"></label>
          <label><span>진행상태</span><input value="요청"></label>
          <label><span>계약번호</span><div class="bpo-input-button"><input id="bpo-travel-po" value="4500311570"><button type="button">⌕</button></div></label>
          <label><span>구매담당자</span><input value="최성훈"></label>
          <label><span>투입인력</span><input value="이승우 차장"></label>
          <label class="wide"><span>출장내역</span><input id="bpo-travel-desc" value="Wuxi 출장"></label>
          <label><span>집행 예정월</span><input id="bpo-simple-month" type="month" value="2026-08"></label>
          <label><span>출장금액</span><input id="bpo-simple-amount" value="4935405"></label>
          <label><span>항공료</span><input value="831000"></label>
          <label><span>숙박비</span><input value="1654163"></label>
          <label><span>교통비</span><input value="0"></label>
          <label><span>일비</span><input value="2285242"></label>
          <label><span>기타비용</span><input value="165000"></label>
          <label><span>기타비용내역</span><input value="비자수수료"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoSimple('travel')">등록</button></div>
      </div>` : ''}`;
}

function saveBpoSimple(kind) {
  const month = document.getElementById('bpo-simple-month')?.value || '2026-09';
  const rawAmount = parseBudgetAmount(document.getElementById('bpo-simple-amount')?.value || 0);
  const transferType = document.getElementById('bpo-transfer-type')?.value || '';
  const amount = kind === 'transfer' && transferType === 'Sender Project' ? -Math.abs(rawAmount) : rawAmount;
  bpoRows(kind).unshift({
    id:`${kind}-${Date.now()}`,
    expectedMonth: month,
    amount,
    transferType,
    description: document.getElementById('bpo-simple-desc')?.value || bpoKindMeta(kind).label,
    status:'계획',
  });
  bpoOutsourceState.mode = null;
  showToast(`${bpoKindMeta(kind).label} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderBpoSimplePanel(kind) {
  const isTransfer = kind === 'transfer';
  return `
    <div class="bpo-section-head">
      <div><h3>${bpoKindMeta(kind).label} 계획 등록</h3><p>${isTransfer ? 'Sender Project는 마이너스, Receiver Project는 플러스 금액으로 계획에 반영합니다.' : '집행 예정월과 금액, 설명 중심으로 계획을 등록합니다.'}</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList(kind)}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-form os-contract-form bpo-contract-form">
          ${isTransfer ? '<label><span>Sender/Receiver</span><select id="bpo-transfer-type"><option>Receiver Project</option><option>Sender Project</option></select></label>' : ''}
          <label><span>${isTransfer ? '이관예정월' : '집행 예정월'}</span><input id="bpo-simple-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="bpo-simple-amount" value="${isTransfer ? '12000000' : '4500000'}"></label>
          <label class="wide"><span>설명</span><input id="bpo-simple-desc" value="${isTransfer ? '타 프로젝트 잔여 외주비 이관' : '검수 대응 외부 지원 비용'}"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoSimple('${kind}')">등록</button></div>
      </div>` : ''}`;
}

function renderBpoConstructionPanel() {
  return `
    <div class="bpo-section-head">
      <div><h3>공사MA 계획 등록</h3><p>구매시스템에서 전송받은 MA 견적데이터를 선택해 검수집행월 기준 계획을 수립합니다.</p></div>
      ${bpoOutsourceState.mode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}
    </div>
    ${renderBpoRegisteredList('construction')}
    ${bpoOutsourceState.mode ? `
      <div class="labor-card bpo-form-card">
        <div class="labor-flow-title"><strong>1. 구매 견적 선택</strong><button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button></div>
        <div class="bpo-popup-list static">
          <button onclick="selectBpoQuote('construction','Q-202607-MA01')"><strong>Q-202607-MA01</strong><span>SW 유지보수 / 분기 검수 / 총 ${bpoMoney(3480000)}</span></button>
        </div>
        <div class="labor-section-title">2. 공사MA 계획 상세</div>
        <div class="os-inspection-table quote ma">
          <div class="os-inspection-row head"><span>표준품명</span><span>단위</span><span>수량</span><span>유지보수 시작일</span><span>유지보수 종료일</span><span>공급단가</span><span>검수집행월</span><span>검수여부</span></div>
          ${bpoMaQuoteRows.map((row, idx) => `
            <div class="os-inspection-row">
              <span>${row.item}</span><span>${row.unit}</span><span>${row.qty}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${bpoMoney(row.unitPrice)}</span>
              <span><input type="month" value="${row.executionMonth}" ${row.inspected ? 'disabled' : ''}></span><span>${row.inspected ? '검수완료' : '미검수'}</span>
            </div>`).join('')}
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveBpoMa()">등록</button></div>
      </div>` : ''}`;
}

function saveBpoMa() {
  bpoRows('construction').unshift({ id:`ma-${Date.now()}`, vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-MA01', amount:3480000, status:'계획' });
  bpoOutsourceState.mode = null;
  showToast('공사MA 계획이 등록되었습니다.');
  renderBudgetPage();
}

function renderOutsourceContractPanel(data) {
  const meta = bpoKindMeta(outsourceKind);
  let body = '';
  if (outsourceKind === 'direct' || outsourceKind === 'indirect') body = renderBpoDirectIndirectPanel(outsourceKind);
  else if (outsourceKind === 'travel') body = renderBpoTravelPanel();
  else if (outsourceKind === 'construction') body = renderBpoConstructionPanel();
  else body = renderBpoSimplePanel(outsourceKind);
  return `
    <div class="outsource-panel bpo-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact"><span class="os-kind-caption">견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</span></div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail bpo-selected-detail">
        <div class="cost-selected-title">${meta.label} 계획 등록</div>
        ${body}
      </div>
    </div>`;
}

function showOutsourceInspectionMonthDetail(kind, month) {
  const rows = bpoQuoteRows(kind).filter(row => bpoMonthsBetween(row.startDate, row.endDate).includes(month));
  let modal = document.getElementById('outsource-inspection-month-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-month-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal os-inspection-detail-modal">
      <div class="actual-detail-head"><strong>${month} 검수계획 상세</strong><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">×</button></div>
      <div class="actual-detail-body">
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>해당월 금액</span><span>실투입 전표</span><span>검수상태</span></div>
          ${rows.map(row => {
            const months = bpoMonthsBetween(row.startDate, row.endDate);
            const amount = months.length ? Math.round(row.amount / months.length) : row.amount;
            return `<div class="os-inspection-row"><span>${row.workType}</span><span>${row.grade}</span><span>${bpoMoney(amount)}</span><span>${month < '2026-07' ? '880012345' : '-'}</span><span>${month < '2026-07' ? '검수완료' : '미완료'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showOutsourceInspectionAdjustGuide(kind = outsourceKind) {
  const professional = kind === 'indirect';
  const quoteRows = bpoQuoteRows(kind);
  const monthlyRows = bpoMonthlyRows(kind);
  const total = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide bpo-adjust-modal">
      <div class="labor-process-guide-head">
        <div><span>${bpoKindMeta(kind).label}</span><strong>월별 검수금액 확정</strong></div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${professional ? bpoOutsourceState.selectedQuoteIndirect : bpoOutsourceState.selectedQuoteDirect}</strong></div>
          <div><span>견적총액</span><strong>${bpoMoney(total)}</strong></div>
          <div><span>보정방식</span><strong>${professional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        ${renderBpoQuoteTable(kind)}
        <div class="os-filter-row">
          <select onchange="filterBpoInspectionRows(this.value)"><option value="">월 전체</option>${monthlyRows.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select>
        </div>
        <div class="os-inspection-table plan monthly-cost ${professional ? 'professional' : ''}">
          <div class="os-inspection-row head">
            ${professional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}
          </div>
          ${monthlyRows.map(row => `
            <div class="os-inspection-row" data-bpo-month="${row.month}">
              ${professional
                ? `<span>${row.month}</span><span>${bpoMoney(row.baseAmount)}</span><span><input value="${Math.round(row.confirmedAmount)}"></span><span>${row.percent}%</span><span>${bpoMoney(row.inspectionAmount)}</span>`
                : `<span>${row.month}</span><span>${row.voucherNo || 'N'}</span><span><input value="${row.mm}" ${row.voucherNo ? 'disabled' : ''}></span><span>${bpoMoney(row.amount)}</span><span>${row.inspectionStatus}</span>`}
            </div>`).join('')}
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open');showToast('월별 검수금액이 저장 및 확정되었습니다.');">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function filterBpoInspectionRows(month) {
  document.querySelectorAll('#outsource-inspection-adjust-modal [data-bpo-month]').forEach(row => {
    row.style.display = !month || row.dataset.bpoMonth === month ? '' : 'none';
  });
}

// ---------------------------------------------------------------------------
// 2026-07-23 restore patch
// Re-applies the outsource detail-account flow that was lost during recovery.
// ---------------------------------------------------------------------------
const RESTORE_OUTSOURCE_KINDS = [
  { id:'direct', step:'01', label:'실투입대상 외주비', desc:'업체/계약/PO/검수' },
  { id:'indirect', step:'02', label:'전문직수수료/제안/기타', desc:'업체/계약/PO' },
  { id:'travel', step:'03', label:'외주출장비', desc:'출장기간/출장금액' },
  { id:'construction', step:'04', label:'공사MA', desc:'공사/MA 계약' },
  { id:'transfer', step:'05', label:'이관외주비', desc:'이관월/금액/사유' },
  { id:'other', step:'06', label:'기타외주비', desc:'집행월/금액/설명' },
];

const restoreProfessionalQuoteRows = [
  { role:'PMO 자문', grade:'고급', assignType:'Full', startDate:'2026-09-01', endDate:'2026-12-31', headCount:1, mm:4, amount:48000000 },
  { role:'원가관리 컨설팅', grade:'특급', assignType:'Part', startDate:'2026-10-01', endDate:'2026-12-31', headCount:1, mm:2, amount:36000000 },
  { role:'제안/검수 지원', grade:'중급', assignType:'Part', startDate:'2026-11-01', endDate:'2026-12-31', headCount:2, mm:2, amount:18000000 },
];

function getRestoreOutsourceLabel(kind = outsourceKind) {
  return (RESTORE_OUTSOURCE_KINDS.find(item => item.id === kind) || RESTORE_OUTSOURCE_KINDS[0]).label;
}

function getRestoreOutsourceRows(kind = outsourceKind) {
  if (!window.restoreOutsourcePlanRows) {
    window.restoreOutsourcePlanRows = {
      direct: [
        { id:'rd-1001', vendorName:'BP Korea', title:'예산관리시스템 외주 실투입', startDate:'2026-09-01', endDate:'2027-03-31', contractAmount:675350000, quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료', inspectionConfirmed:true },
      ],
      indirect: [
        { id:'ri-1001', vendorName:'NOVA Partners', title:'전문직수수료/제안 지원', startDate:'2026-09-01', endDate:'2026-12-31', contractAmount:102000000, quoteNo:'Q-202607-P01', poNo:'4500678901', status:'계획확정', inspectionConfirmed:true },
      ],
      travel: [
        { id:'rt-1001', expectedMonth:'2026-08', amount:4935405, description:'Wuxi 출장비', status:'계획' },
      ],
      transfer: [
        { id:'rf-1001', transferType:'Receiver Project', expectedMonth:'2026-11', amount:12000000, description:'타 프로젝트 잔여 외주비 이관', status:'계획' },
      ],
      construction: [
        { id:'rc-1001', vendorName:'BP Korea', title:'SW 유지보수 MA', quoteNo:'Q-202607-004', amount:3480000, executionMonth:'2026-12', status:'계획확정' },
      ],
      other: [],
    };
  }
  if (!window.restoreOutsourcePlanRows[kind]) window.restoreOutsourcePlanRows[kind] = [];
  return window.restoreOutsourcePlanRows[kind];
}

function renderOutsourceKindTabs() {
  return `
    <div class="os-kind-tabs os-kind-tabs-strong">
      ${RESTORE_OUTSOURCE_KINDS.map(item => `
        <button class="${outsourceKind === item.id ? 'active' : ''}" onclick="switchOutsourceKind('${item.id}')">
          <span class="os-kind-step">${item.step}</span>
          <strong>${item.label}</strong>
          <em>${item.desc}</em>
          ${outsourceKind === item.id ? '<b>선택됨</b>' : ''}
        </button>
      `).join('')}
    </div>`;
}

function switchOutsourceKind(kind) {
  outsourceKind = RESTORE_OUTSOURCE_KINDS.some(item => item.id === kind) ? kind : 'direct';
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  editingOtherOutsourceId = null;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function openNewOutsourceContract() {
  outsourceRegistrationMode = 'new';
  editingOutsourceContractId = null;
  selectedOutsourceContractId = '';
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceInspectionPreviewStartDate = '';
  outsourceInspectionPreviewEndDate = '';
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  renderBudgetPage();
}

function getRestoreDirectQuoteRows(kind = outsourceKind) {
  if (kind === 'indirect') return restoreProfessionalQuoteRows;
  return (outsourceQuoteBreakdownData[selectedOutsourceQuoteNo] || outsourceQuoteBreakdownData['Q-202607-001'] || []).map(row => ({
    role: row.workType || '개발/운영',
    grade: row.grade || '고급',
    assignType: 'Full',
    startDate: row.startDate,
    endDate: row.endDate,
    headCount: 1,
    mm: row.mm,
    amount: row.amount,
  }));
}

function getRestoreInspectionMonths(kind = outsourceKind) {
  const rows = getRestoreDirectQuoteRows(kind);
  if (!rows.length) return [];
  const starts = rows.map(row => row.startDate).sort();
  const ends = rows.map(row => row.endDate).sort();
  const months = monthRangeByDate(starts[0], ends[ends.length - 1]);
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (kind === 'indirect') {
    const base = months.length ? Math.floor(total / months.length) : 0;
    return months.map((month, idx) => {
      const amount = idx === months.length - 1 ? total - base * (months.length - 1) : base;
      return { month, baseAmount: amount, confirmedAmount: month < '2026-07' ? amount : 0, percent: total ? Math.round(amount / total * 1000) / 10 : 0, inspectionAmount: month < '2026-07' ? amount : 0 };
    });
  }
  const grouped = {};
  rows.forEach(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const mmPerMonth = rowMonths.length ? row.mm / rowMonths.length : 0;
    const amountPerMonth = rowMonths.length ? row.amount / rowMonths.length : 0;
    rowMonths.forEach(month => {
      if (!grouped[month]) grouped[month] = { month, mm:0, baseAmount:0, confirmedAmount:0, voucherNo:'', inspectionStatus:'미완료' };
      grouped[month].mm += mmPerMonth;
      grouped[month].baseAmount += amountPerMonth;
      grouped[month].confirmedAmount += amountPerMonth;
      if (month <= '2026-06') {
        grouped[month].voucherNo = '880012345';
        grouped[month].inspectionStatus = '검수완료';
      }
    });
  });
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).map(row => ({
    ...row,
    mm: Math.round(row.mm * 100) / 100,
    baseAmount: Math.round(row.baseAmount),
    confirmedAmount: Math.round(row.confirmedAmount),
  }));
}

function renderRestoreQuoteBreakdown(kind = outsourceKind) {
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const monthlyRows = getRestoreInspectionMonths(kind);
  const isProfessional = kind === 'indirect';
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 원가 반영</strong>
          <span>${isProfessional ? '전문직수수료는 견적 전체 금액을 기간 월수로 배분하고, 사용자가 확정금액을 직접 보정합니다.' : '견적 산출내역 기준으로 월별 검수금액 확정 대상이 계산됩니다.'}</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-main-btn" onclick="showOutsourceInspectionAdjustGuide('${kind}')">월별 검수금액 확정</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>'
              : '<span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span>'}
          </div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>`
                : `<span>${row.role}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(3)}</span><span>${fmt(row.amount)}원</span>`}
            </div>
          `).join('')}
          <div class="os-inspection-row total">${isProfessional ? '<span>합계</span><span></span><span></span><span></span><span></span><span></span>' : '<span>합계</span><span></span><span></span><span></span><span></span>'}<span>${fmt(quoteTotal)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">월별 원가 등록 대상 <em>${isProfessional ? '검수금액 기준' : '검수월 기준 합계'}</em></div>
        <div class="os-inspection-table plan monthly-summary">
          <div class="os-inspection-row head">
            ${isProfessional
              ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>'
              : '<span>검수월</span><span>월별 원가금액</span><span>실투입 전표 번호</span><span>검수상태</span>'}
          </div>
          ${monthlyRows.map(row => `
            <div class="os-inspection-row">
              ${isProfessional
                ? `<span>${row.month}</span><span>${fmt(row.baseAmount)}원</span><span>${fmt(row.confirmedAmount)}원</span><span>${row.percent}%</span><span>${row.inspectionAmount ? fmt(row.inspectionAmount) + '원' : '0원'}</span>`
                : `<span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${kind}','${row.month}')">${row.month}</button></span><span>${fmt(row.confirmedAmount)}원</span><span>${row.voucherNo || '-'}</span><span>${row.inspectionStatus}</span>`}
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function showOutsourceInspectionMonthDetail(kind, month) {
  const isProfessional = kind === 'indirect';
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const rows = isProfessional ? getRestoreInspectionMonths(kind).filter(row => row.month === month) : quoteRows.filter(row => monthRangeByDate(row.startDate, row.endDate).includes(month));
  let modal = document.getElementById('outsource-inspection-month-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-month-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal os-inspection-detail-modal">
      <div class="actual-detail-head">
        <strong>${month} 검수계획 상세</strong>
        <button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-body">
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head">${isProfessional ? '<span>월</span><span>확정금액</span><span>검수금액</span>' : '<span>업무구분</span><span>기술등급</span><span>해당월 금액</span><span>검수상태</span>'}</div>
          ${rows.map(row => {
            if (isProfessional) return `<div class="os-inspection-row"><span>${row.month}</span><span>${fmt(row.confirmedAmount)}원</span><span>${fmt(row.inspectionAmount)}원</span></div>`;
            const months = monthRangeByDate(row.startDate, row.endDate);
            const amount = months.length ? Math.round(row.amount / months.length) : row.amount;
            return `<div class="os-inspection-row"><span>${row.role}</span><span>${row.grade}</span><span>${fmt(amount)}원</span><span>${month <= '2026-06' ? '검수완료' : '미완료'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="actual-detail-foot"><button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button></div>
    </div>`;
  modal.classList.add('open');
}

function showOutsourceInspectionAdjustGuide(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const quoteRows = getRestoreDirectQuoteRows(kind);
  const monthlyRows = getRestoreInspectionMonths(kind);
  const quoteTotal = quoteRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal wide">
      <div class="labor-process-guide-head">
        <div>
          <span>${getRestoreOutsourceLabel(kind)}</span>
          <strong>월별 검수금액 확정</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="os-adjust-summary">
          <div><span>견적번호</span><strong>${kind === 'indirect' ? 'Q-202607-P01' : (selectedOutsourceQuoteNo || 'Q-202607-001')}</strong></div>
          <div><span>견적총액</span><strong>${fmt(quoteTotal)}원</strong></div>
          <div><span>보정방식</span><strong>${isProfessional ? '금액 직접 보정' : 'MM 보정 후 금액 자동산정'}</strong></div>
        </div>
        <div class="os-inspection-title">견적 내용</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head">${isProfessional ? '<span>역할(L1)</span><span>시작일</span><span>종료일</span><span>AssignType</span><span>인원수</span><span>총MM</span><span>견적금액</span>' : '<span>업무구분</span><span>기술등급</span><span>시작일</span><span>종료일</span><span>총MM</span><span>견적금액</span>'}</div>
          ${quoteRows.map(row => `<div class="os-inspection-row">${isProfessional ? `<span>${row.role}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.assignType}</span><span>${row.headCount}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>` : `<span>${row.role}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${Number(row.mm).toFixed(2)}</span><span>${fmt(row.amount)}원</span>`}</div>`).join('')}
        </div>
        <div class="os-inspection-title">월별 확정</div>
        <div class="os-filter-row">
          <select onchange="filterRestoreInspectionRows(this.value)"><option value="">월 전체</option>${monthlyRows.map(row => `<option value="${row.month}">${row.month}</option>`).join('')}</select>
        </div>
        <div class="os-inspection-table plan">
          <div class="os-inspection-row head">${isProfessional ? '<span>월</span><span>기본 배분금액</span><span>확정금액</span><span>비중</span><span>검수금액</span>' : '<span>검수월</span><span>실투입 생성여부</span><span>MM</span><span>확정금액</span><span>검수상태</span>'}</div>
          ${monthlyRows.map(row => `<div class="os-inspection-row" data-restore-month="${row.month}">${isProfessional ? `<span>${row.month}</span><span>${fmt(row.baseAmount)}원</span><span><input class="restore-amount-input" value="${row.confirmedAmount}"></span><span>${row.percent}%</span><span>${row.inspectionAmount ? fmt(row.inspectionAmount) + '원' : '0원'}</span>` : `<span>${row.month}</span><span>${row.voucherNo || 'N'}</span><span><input class="restore-amount-input" ${row.voucherNo ? 'disabled' : ''} value="${row.mm}"></span><span>${fmt(row.confirmedAmount)}원</span><span>${row.inspectionStatus}</span>`}</div>`).join('')}
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open');showToast('월별 검수금액이 저장 및 확정되었습니다.');">저장 및 확정</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function filterRestoreInspectionRows(month) {
  document.querySelectorAll('#outsource-inspection-adjust-modal [data-restore-month]').forEach(row => {
    row.style.display = !month || row.dataset.restoreMonth === month ? '' : 'none';
  });
}

function saveRestoreOutsourceContract(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const rows = getRestoreOutsourceRows(kind);
  rows.unshift({
    id:`r-${kind}-${Date.now()}`,
    vendorName: document.getElementById('restore-os-vendor')?.value || (isProfessional ? 'NOVA Partners' : 'BP Korea'),
    title: document.getElementById('restore-os-title')?.value || (isProfessional ? '전문직수수료/제안/기타 계획' : '실투입대상 외주비 계획'),
    startDate: document.getElementById('restore-os-start')?.value || '2026-09-01',
    endDate: document.getElementById('restore-os-end')?.value || '2026-12-31',
    contractAmount: parseBudgetAmount(document.getElementById('restore-os-amount')?.value || (isProfessional ? 102000000 : 675350000)),
    quoteNo: document.getElementById('restore-os-quote')?.value || (isProfessional ? 'Q-202607-P01' : 'Q-202607-001'),
    poNo: document.getElementById('restore-os-po')?.value || '',
    status:'계획',
  });
  outsourceRegistrationMode = null;
  showToast(`${getRestoreOutsourceLabel(kind)} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderRestoreDirectProfessionalPanel(kind = outsourceKind) {
  const isProfessional = kind === 'indirect';
  const rows = getRestoreOutsourceRows(kind);
  const title = isProfessional ? '전문직수수료/제안/기타 계획 등록' : '실투입대상 외주비 계획 등록';
  const button = `<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>`;
  return `
    <div class="labor-panel-head restore-os-head">
      <div>
        <div class="labor-title">${title}</div>
        <div class="setup-editor-sub">선택한 상세계정의 신규 계획을 등록하거나 기존 내역을 수정합니다.</div>
      </div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : button}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-contract-grid-head"><span>업체 / 계약명</span><span>계약기간</span><span>계약금액</span><span>견적번호</span><span>PO번호</span><span>상태</span></div>
      ${rows.map(row => `
        <div class="os-contract-grid-row">
          <span><strong>${row.vendorName}</strong><em>${row.title}</em></span>
          <span>${row.startDate} ~ ${row.endDate}</span>
          <span>${fmt(row.contractAmount)}원</span>
          <span>${row.quoteNo || '-'}</span>
          <span>${row.poNo || '-'}</span>
          <span><i class="labor-status saved">${row.status}</i></span>
        </div>
      `).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card restore-os-form-card">
        <div class="labor-flow-title">
          <strong>${isProfessional ? '전문직수수료/제안/기타 계획 등록' : '신규 실투입 외주 계약 등록'}</strong>
          <button class="labor-sub-btn" onclick="closeOutsourceContractEditor()">닫기</button>
        </div>
        <div class="labor-form os-contract-form">
          <label><span>1. 견적확정 여부</span><select id="restore-os-quote-confirmed"><option>Y</option><option>N</option></select></label>
          <label><span>견적번호</span><input id="restore-os-quote" value="${isProfessional ? 'Q-202607-P01' : 'Q-202607-001'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>업체</span><input id="restore-os-vendor" value="${isProfessional ? 'NOVA Partners' : 'BP Korea'}" ${isProfessional ? '' : 'readonly'}></label>
          <label class="wide"><span>계약명</span><input id="restore-os-title" value="${isProfessional ? '전문직수수료/제안/기타 계획' : '예산관리시스템 외주 실투입'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>시작일</span><input id="restore-os-start" type="date" value="2026-09-01" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>종료일</span><input id="restore-os-end" type="date" value="2026-12-31" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>계약금액</span><input id="restore-os-amount" value="${isProfessional ? '102000000' : '675350000'}" ${isProfessional ? '' : 'readonly'}></label>
          <label><span>PO번호</span><input id="restore-os-po" value="${isProfessional ? '4500678901' : '4500123456'}"></label>
        </div>
        ${renderRestoreQuoteBreakdown(kind)}
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreOutsourceContract('${kind}')">등록</button></div>
      </div>` : ''}
  `;
}

function saveRestoreSimpleOutsource(kind) {
  const rows = getRestoreOutsourceRows(kind);
  const amount = parseBudgetAmount(document.getElementById('restore-simple-amount')?.value || 0);
  const month = document.getElementById('restore-simple-month')?.value || '2026-09';
  if (!amount) {
    showToast('금액을 입력해 주세요.');
    return;
  }
  rows.unshift({
    id:`rs-${kind}-${Date.now()}`,
    expectedMonth: month,
    amount: kind === 'transfer' && document.getElementById('restore-transfer-type')?.value === 'Sender Project' ? -Math.abs(amount) : amount,
    description: document.getElementById('restore-simple-desc')?.value || getRestoreOutsourceLabel(kind),
    transferType: document.getElementById('restore-transfer-type')?.value || '',
    status:'계획',
  });
  outsourceRegistrationMode = null;
  showToast(`${getRestoreOutsourceLabel(kind)} 계획이 등록되었습니다.`);
  renderBudgetPage();
}

function renderRestoreSimplePanel(kind) {
  const rows = getRestoreOutsourceRows(kind);
  const label = getRestoreOutsourceLabel(kind);
  const isTransfer = kind === 'transfer';
  return `
    <div class="labor-panel-head restore-os-head">
      <div><div class="labor-title">${label} 계획 등록</div><div class="setup-editor-sub">${label} 계획을 등록하거나 기등록 내역을 확인합니다.</div></div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-other-header with-action"><span>예정월</span><span>금액</span><span>설명</span><span>상태</span><span></span></div>
      ${rows.map(row => `<div class="os-other-row with-action"><strong>${row.expectedMonth || row.executionMonth || '-'}</strong><b>${fmt(row.amount || 0)}원</b><span>${row.transferType ? row.transferType + ' / ' : ''}${row.description || row.title || ''}</span><i class="labor-status saved">${row.status}</i><span></span></div>`).join('') || '<div class="labor-empty">등록된 계획이 없습니다.</div>'}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card">
        <div class="labor-card-title">${label} 신규 등록</div>
        <div class="labor-form os-other-form">
          ${isTransfer ? '<label><span>Sender/Receiver</span><select id="restore-transfer-type"><option>Receiver Project</option><option>Sender Project</option></select></label>' : ''}
          <label><span>${isTransfer ? '이관예정월' : '집행 예정월'}</span><input id="restore-simple-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="restore-simple-amount" inputmode="numeric" placeholder="예: 12000000"></label>
          <label class="wide"><span>설명</span><input id="restore-simple-desc" placeholder="${label} 계획 설명"></label>
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreSimpleOutsource('${kind}')">등록</button></div>
      </div>` : ''}
  `;
}

function renderRestoreConstructionPanel() {
  const rows = getRestoreOutsourceRows('construction');
  return `
    <div class="labor-panel-head restore-os-head">
      <div><div class="labor-title">공사MA 계획 등록</div><div class="setup-editor-sub">구매시스템 견적데이터를 선택해 검수집행월 기준으로 MA 계획을 수립합니다.</div></div>
      <div class="labor-actions compact">${outsourceRegistrationMode ? '' : '<button class="labor-main-btn" onclick="openNewOutsourceContract()">신규등록</button>'}</div>
    </div>
    <div class="os-registered-card">
      <div class="os-contract-grid-head"><span>업체 / 계약명</span><span>견적번호</span><span>금액</span><span>상태</span><span></span><span></span></div>
      ${rows.map(row => `<div class="os-contract-grid-row"><span><strong>${row.vendorName}</strong><em>${row.title}</em></span><span>${row.quoteNo}</span><span>${fmt(row.amount)}원</span><span><i class="labor-status saved">${row.status}</i></span><span></span><span></span></div>`).join('')}
    </div>
    ${outsourceRegistrationMode ? `
      <div class="labor-card">
        <div class="labor-card-title">2. 공사MA 계획 상세</div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>표준품명</span><span>단위</span><span>수량</span><span>유지보수 시작일</span><span>유지보수 종료일</span><span>공급단가</span><span>검수집행월</span></div>
          ${['2026-03','2026-06','2026-09','2026-12'].map((m, idx) => `<div class="os-inspection-row"><span>SW 유지보수</span><span>AU</span><span>1</span><span>2026-${String(idx*3+1).padStart(2,'0')}-01</span><span>${m}-30</span><span>${fmt(870000)}원</span><span><input type="month" value="${m}"></span></div>`).join('')}
        </div>
        <div class="labor-actions"><button class="labor-main-btn" onclick="saveRestoreSimpleOutsource('construction')">등록</button></div>
      </div>` : ''}
  `;
}

function renderOutsourceContractPanel(data) {
  const meta = RESTORE_OUTSOURCE_KINDS.find(item => item.id === outsourceKind) || RESTORE_OUTSOURCE_KINDS[0];
  let body = '';
  if (outsourceKind === 'direct' || outsourceKind === 'indirect') body = renderRestoreDirectProfessionalPanel(outsourceKind);
  else if (outsourceKind === 'construction') body = renderRestoreConstructionPanel();
  else body = renderRestoreSimplePanel(outsourceKind);
  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact"><span class="os-kind-caption">견적 확정 여부를 먼저 선택하고 업체, 계약, PO, 월별 검수계획을 등록합니다.</span></div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${meta.label} 계획 등록</div>
        ${body}
      </div>
    </div>`;
}

function showBudgetSummaryGrid() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  const actual = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const totBudget = CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual = CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain = totBudget - totActual - totQuasi;
  budgetDetailStep = 'summaryGrid';
  budgetSetupEditAccount = null;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage)}
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
      <div>
        <div class="budget-process-title">전체 현황</div>
        <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
      </div>
    </div>
    ${renderProjectPlanSummary(data, actual, quasi)}
  `;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }
  if (budgetDetailStep === 'overview') budgetDetailStep = 'setup';

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const setupBody = renderBudgetSetupOverview(data, actual, quasi);

  const setupHeader = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 상세 계획을 선택해 수정합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-sub-btn" onclick="showBudgetSummaryGrid()">전체 현황 보기</button>
      </div>
    </div>`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage)}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 예산 집행 현황을 확인한 뒤 필요한 계정의 상세 계획을 수정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : budgetDetailStep === 'summaryGrid'
          ? `
          <div class="budget-process-head">
            <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
            <div>
              <div class="budget-process-title">전체 현황</div>
              <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
            </div>
            <div class="budget-process-actions">
              <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
            </div>
          </div>
          ${renderProjectPlanSummary(data, actual, quasi)}`
        : budgetDetailStep === 'summaryGrid'
          ? `
            <div class="budget-process-head">
              <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
              <div>
                <div class="budget-process-title">전체 현황</div>
                <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
              </div>
              <div class="budget-process-actions">
                <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
              </div>
            </div>
            ${renderProjectPlanSummary(data, actual, quasi)}`
          : `${setupHeader}${setupBody}`}
  `;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const setupBody = renderBudgetSetupOverview(data, actual, quasi);

  const setupHeader = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 상세 계획을 선택해 수정합니다.</div>
      </div>
      <div class="budget-process-actions">
        <button class="labor-sub-btn" onclick="budgetDetailStep='summaryGrid';budgetSetupEditAccount=null;renderBudgetPage()">프로젝트 수행비용 보기</button>
      </div>
    </div>`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='setup';renderBudgetPage()">← 목록으로</button>
    ${renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage)}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 예산 집행 현황을 확인한 뒤 필요한 계정의 상세 계획을 수정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : budgetDetailStep === 'summaryGrid'
          ? `
            <div class="budget-process-head">
              <button class="budget-process-back" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 상세 예산 수립</button>
              <div>
                <div class="budget-process-title">프로젝트 수행비용</div>
                <div class="budget-process-sub">전체 프로젝트의 월별 계획/실적과 상세 계정 집행 내역을 검토합니다.</div>
              </div>
              <div class="budget-process-actions">
                <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
              </div>
            </div>
            ${renderProjectPlanSummary(data, actual, quasi)}`
          : `${setupHeader}${setupBody}`}
  `;
}

function renderProjectPlanSummary(data, actual, quasi) {
  const rows = getProjectSummaryGridRows(data, actual, quasi);
  const total = rows[0];
  const monthHeaders = data.months.map(mo => `<th colspan="2">${mo.m}</th>`).join('');
  const monthSubHeaders = data.months.map(() => '<th>계획</th><th>실적</th>').join('');
  const body = rows.map(row => `
    <tr class="pps-level-${row.level}">
      <td class="pps-name"><span>${row.level === 0 ? '⊟' : row.level === 1 ? '⊟' : '○'}</span>${row.name}</td>
      <td class="num">${fmt(row.totalPlan)}</td>
      <td class="num">${fmt(row.totalActual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      <td>
        <div class="pps-progress"><i style="width:${Math.min(row.rate, 100)}%"></i></div>
        <b class="pps-rate">${row.rate}%</b>
      </td>
      ${row.months.map(item => `
        <td class="num">${fmt(item.plan)}</td>
        <td class="num">${summaryActualCell(row, item)}</td>
      `).join('')}
    </tr>`).join('');

  return `
    <div class="project-plan-summary">
      <div class="pps-titlebar">
        <div><span></span><strong>프로젝트 수행비용</strong></div>
        <div class="pps-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-sub-btn">월별</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="pps-top">
        <div>
          <span>총 계획예산</span>
          <strong>${fmt(total.totalPlan)}원</strong>
        </div>
        <div class="pps-top-progress">
          <span>실행예산 진행률</span>
          <div><i style="width:${Math.min(total.rate, 100)}%"></i><b>${total.rate}%</b></div>
        </div>
        <ul>
          <li><span>실적</span><strong>${fmt(total.totalActual)}원</strong></li>
          <li><span>잔여예산</span><strong>${fmt(total.remain)}원</strong></li>
        </ul>
      </div>
      <div class="pps-grid-wrap">
        <table class="pps-grid">
          <thead>
            <tr>
              <th rowspan="2">계정</th>
              <th colspan="4">종합</th>
              ${monthHeaders}
            </tr>
            <tr>
              <th>계획</th><th>실적</th><th>잔여예산</th><th>진행률</th>
              ${monthSubHeaders}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="pps-note">※ 실적 구간의 파란색 금액을 클릭하면 계정별 상세 실적 내역을 확인할 수 있습니다.</p>
    </div>`;
}

function actualCellHtml(account, month, rowName, value) {
  if (isPastActualMonth(month)) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${account}','${month}','${rowName}')">${fmt(value)}</button>`;
  }
  if (account === CATS[0] && value > 0) {
    return `<button class="actual-month-link plan" onclick="showLaborPlanDetailModal('${month}','${rowName}')">${fmt(value)}</button>`;
  }
  return fmt(value);
}

function getSummaryMonthValue(data, account, monthData, kind) {
  const bucket = monthData?.[account] || {};
  if (kind === 'actual') {
    return (bucket.a || 0) + (bucket.q || 0);
  }
  if (monthData.type === 'actual') {
    return bucket.a || 0;
  }
  return bucket.p || bucket.q || 0;
}

function makeSummaryRow(name, level, account, ratio, data, actual, quasi) {
  const totalPlan = account
    ? Math.round(getBudgetAdjusted(data, account) * ratio)
    : CATS.reduce((sum, cat) => sum + getBudgetAdjusted(data, cat), 0);
  const totalActual = account
    ? Math.round(((actual[account] || 0) + (quasi[account] || 0)) * ratio)
    : CATS.reduce((sum, cat) => sum + (actual[cat] || 0) + (quasi[cat] || 0), 0);
  const remain = Math.max(totalPlan - totalActual, 0);
  const rate = totalPlan ? Math.round(totalActual / totalPlan * 10000) / 100 : 0;
  const months = data.months.map(mo => {
    if (!account) {
      return {
        month: mo.m,
        plan: CATS.reduce((sum, cat) => sum + getSummaryMonthValue(data, cat, mo, 'plan'), 0),
        actual: CATS.reduce((sum, cat) => sum + getSummaryMonthValue(data, cat, mo, 'actual'), 0),
      };
    }
    return {
      month: mo.m,
      plan: Math.round(getSummaryMonthValue(data, account, mo, 'plan') * ratio),
      actual: Math.round(getSummaryMonthValue(data, account, mo, 'actual') * ratio),
    };
  });
  return { name, level, account, ratio, totalPlan, totalActual, remain, rate, months };
}

function getProjectSummaryGridRows(data, actual, quasi) {
  const rows = [makeSummaryRow('프로젝트 총 실행비용', 0, null, 1, data, actual, quasi)];
  const defs = [
    { account:CATS[0], children:[['실투입인건비', .72], ['이관인건비', .18], ['증업일급여-OT', .10]] },
    { account:CATS[1], children:[['실투입외주비', .62], ['공사/MA외주비', .25], ['기타외주비', .13]] },
    { account:CATS[2], children:[['재료비', .78], ['감가상각비', .22]] },
    { account:CATS[3], children:[['A/S Cost', .12]] },
  ];
  defs.forEach(def => {
    rows.push(makeSummaryRow(def.account, 1, def.account, 1, data, actual, quasi));
    def.children.forEach(([name, ratio]) => rows.push(makeSummaryRow(name, 2, def.account, ratio, data, actual, quasi)));
  });
  return rows;
}

function summaryActualCell(row, item) {
  if (row.account && isPastActualMonth(item.month) && item.actual > 0) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${row.account}','${item.month}','${row.name}')">${fmt(item.actual)}</button>`;
  }
  return fmt(item.actual);
}

function renderProjectPlanSummary(data, actual, quasi) {
  const rows = getProjectSummaryGridRows(data, actual, quasi);
  const total = rows[0];
  const monthHeaders = data.months.map(mo => `<th colspan="2">${mo.m}</th>`).join('');
  const monthSubHeaders = data.months.map(() => '<th>계획</th><th>실적</th>').join('');
  const body = rows.map(row => `
    <tr class="pps-level-${row.level}">
      <td class="pps-name"><span>${row.level === 0 ? '⊟' : row.level === 1 ? '⊟' : '○'}</span>${row.name}</td>
      <td class="num">${fmt(row.totalPlan)}</td>
      <td class="num">${fmt(row.totalActual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      <td>
        <div class="pps-progress"><i style="width:${Math.min(row.rate, 100)}%"></i></div>
        <b class="pps-rate">${row.rate}%</b>
      </td>
      ${row.months.map(item => `
        <td class="num">${fmt(item.plan)}</td>
        <td class="num">${summaryActualCell(row, item)}</td>
      `).join('')}
    </tr>`).join('');

  return `
    <div class="project-plan-summary">
      <div class="pps-titlebar">
        <div><span></span><strong>프로젝트 수행비용</strong></div>
        <div class="pps-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-sub-btn">월별</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="pps-top">
        <div>
          <span>총 계획예산</span>
          <strong>${fmt(total.totalPlan)}원</strong>
        </div>
        <div class="pps-top-progress">
          <span>실행예산 진행률</span>
          <div><i style="width:${Math.min(total.rate, 100)}%"></i><b>${total.rate}%</b></div>
        </div>
        <ul>
          <li><span>실적</span><strong>${fmt(total.totalActual)}원</strong></li>
          <li><span>잔여예산</span><strong>${fmt(total.remain)}원</strong></li>
        </ul>
      </div>
      <div class="pps-grid-wrap">
        <table class="pps-grid">
          <thead>
            <tr>
              <th rowspan="2">계정</th>
              <th colspan="4">종합</th>
              ${monthHeaders}
            </tr>
            <tr>
              <th>계획</th><th>실적</th><th>잔여예산</th><th>진행률</th>
              ${monthSubHeaders}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="pps-note">※ 실적 구간의 파란색 금액을 클릭하면 계정별 상세 실적 내역을 확인할 수 있습니다.</p>
    </div>`;
}

function getLaborPlanDetailRows(month) {
  const rows = getLaborRows()
    .filter(row => row.monthly && Number(row.monthly[month] || 0) > 0)
    .map((row, idx) => {
      const mm = Number(row.monthly[month] || 0);
      const amount = Math.round(mm * Number(row.unitPrice || 0));
      return [
        idx + 1,
        month,
        row.org || '-',
        row.name || '-',
        row.role || '-',
        row.pLevel || '-',
        row.workType || 'Full',
        mm,
        row.unitPrice || 0,
        amount,
        getLaborStatusLabel(row.status || 'MM 입력중'),
      ];
    });

  if (rows.length) return rows;
  return [
    [1, month, 'AI Architect팀', '손성호', 'Backend', 'P3', 'Full', 1, 13500000, 13500000, '계획'],
    [2, month, 'AX서비스1팀', '박혜리', 'Frontend', 'P2', 'Part', 0.6, 11200000, 6720000, '계획'],
    [3, month, 'AI UX팀', '전현영', 'UI/UX', 'P2', 'Part', 0.4, 10800000, 4320000, '계획'],
  ];
}

function showLaborPlanDetailModal(month, detailName) {
  let modal = document.getElementById('actual-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'actual-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  const columns = ['NO', '계획월', '조직', '성명', '역할', 'P레벨', '투입유형', '월 MM', '기준단가', '계획금액', '상태'];
  const rows = getLaborPlanDetailRows(month);
  const totalMm = rows.reduce((sum, row) => sum + Number(row[7] || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row[9] || 0), 0);
  modal.innerHTML = `
    <div class="actual-detail-modal">
      <div class="actual-detail-head">
        <strong>인건비 투입계획 조회</strong>
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-filter">
        <label><span>계획월</span><input value="${month}" readonly></label>
        <label><span>상세구분</span><input value="${detailName || '전체'}" readonly></label>
        <button class="labor-sub-btn">초기화</button>
        <button class="labor-main-btn teal">검색</button>
      </div>
      <div class="actual-detail-tabs">
        <button class="active">투입계획</button>
        <button>승인요청</button>
        <button>SCM 승인완료</button>
      </div>
      <div class="actual-detail-toolbar"><button class="labor-sub-btn">엑셀</button></div>
      <div class="actual-detail-table-wrap">
        <table class="actual-detail-table">
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, idx) => {
                  const numeric = [7, 8, 9].includes(idx);
                  const value = idx === 7 ? cell : numeric ? fmt(cell) : cell;
                  return `<td class="${numeric ? 'num' : ''}">${value}</td>`;
                }).join('')}
              </tr>`).join('')}
            <tr class="total">
              <td colspan="7">합계</td>
              <td class="num">${Math.round(totalMm * 100) / 100}</td>
              <td></td>
              <td class="num">${fmt(totalAmount)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot">
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function actualCellHtml(account, month, rowName, value) {
  if (isPastActualMonth(month)) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${account}','${month}','${rowName}')">${fmt(value)}</button>`;
  }
  if (account === CATS[0] && value > 0) {
    return `<button class="actual-month-link plan" onclick="showLaborPlanDetailModal('${month}','${rowName}')">${fmt(value)}</button>`;
  }
  return fmt(value);
}

function getLaborStatusLabel(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

function renderBudgetAccountEditorOldA(data, account) {
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
            <div class="setup-editor-sub">상품재료비와 기타재료비를 구분해 계획을 등록합니다.</div>
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

let outsourceRegistrationMode = null;
let outsourceSearchQuery = '';
let selectedOutsourceVendorId = 'vd-bp';
let selectedOutsourceContractId = 'os-1001';
let editingOutsourceContractId = null;
let purchaseQuoteLastSyncedAt = '';
let outsourceVendorLookupOpen = false;
let outsourceQuoteLookupOpen = false;
let outsourceQuoteRequired = 'Y';
let selectedOutsourceQuoteNo = 'Q-202607-001';
let outsourceInspectionPlanPreviewQuoteNo = '';
let outsourceInspectionPreviewStartDate = '';
let outsourceInspectionPreviewEndDate = '';
let outsourceKind = 'direct';
let editingOtherOutsourceId = null;
let maQuoteNo = 'Q-202607-004';
let maQuoteAmount = 145000000;
let maQuoteTitle = 'MA service estimate';
let materialKind = 'item';
let editingMaterialItemId = null;
let editingOtherMaterialId = null;
let materialQuoteNo = 'MQ-202607-001';
let materialQuoteAmount = 52000000;
let materialQuoteTitle = '개발/테스트 솔루션 라이선스';
let materialQuoteSelectedYn = 'Y';

const outsourceVendorPool = [
  { id:'vd-bp', name:'BP Korea', grade:'A', owner:'김민재', specialty:'Java/Vue 구축' },
  { id:'vd-vn', name:'Vietnam Front Team', grade:'A-', owner:'Tran Minh', specialty:'Vue 화면개발' },
  { id:'vd-ats', name:'ATS 주식회사', grade:'A', owner:'박소연', specialty:'인터페이스 개발' },
  { id:'vd-ags', name:'AGS 솔루션', grade:'B+', owner:'이준호', specialty:'Oracle/배치' },
];

const purchaseQuoteData = {
  'vd-bp': [
    { quoteNo:'Q-202607-001', title:'국내 분석/설계 및 Java 개발', amount:380000000, receivedAt:'2026-07-01 14:20' },
    { quoteNo:'Q-202607-004', title:'현장대리인 및 품질관리 지원', amount:145000000, receivedAt:'2026-07-02 10:05' },
  ],
  'vd-vn': [
    { quoteNo:'Q-202607-002', title:'Vue 화면개발 1차', amount:240000000, receivedAt:'2026-07-01 16:40' },
    { quoteNo:'Q-202607-005', title:'퍼블리싱 및 화면 수정', amount:90000000, receivedAt:'2026-07-02 13:10' },
  ],
  'vd-ats': [
    { quoteNo:'Q-202607-003', title:'인터페이스 10종 개발', amount:210000000, receivedAt:'2026-07-01 17:30' },
  ],
  'vd-ags': [
    { quoteNo:'Q-202607-006', title:'Oracle 배치/마이그레이션 지원', amount:180000000, receivedAt:'2026-07-02 15:45' },
  ],
};

const outsourceQuoteBreakdownData = {
  'Q-202607-001': [
    { workType:'개발/운영', grade:'특급기술자', startDate:'2026-09-01', endDate:'2027-03-31', mm:7, amount:77000000 },
    { workType:'개발/운영', grade:'고급기술자-상', startDate:'2026-09-01', endDate:'2027-03-31', mm:27.3, amount:259350000 },
    { workType:'개발/운영', grade:'고급기술자-하', startDate:'2026-11-01', endDate:'2027-10-31', mm:37, amount:339000000 },
  ],
  'Q-202607-002': [
    { workType:'화면개발', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-02-28', mm:18, amount:162000000 },
    { workType:'화면개발', grade:'중급기술자', startDate:'2026-08-01', endDate:'2027-02-28', mm:14, amount:78000000 },
  ],
  'Q-202607-003': [
    { workType:'인터페이스', grade:'특급기술자', startDate:'2026-08-01', endDate:'2027-01-31', mm:6, amount:66000000 },
    { workType:'인터페이스', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-04-30', mm:16, amount:144000000 },
  ],
  'Q-202607-004': [
    { workType:'현장지원', grade:'고급기술자-상', startDate:'2026-07-01', endDate:'2027-06-30', mm:12, amount:108000000 },
    { workType:'현장지원', grade:'중급기술자', startDate:'2026-07-01', endDate:'2027-06-30', mm:7.4, amount:37000000 },
  ],
  'Q-202607-005': [
    { workType:'리블리싱', grade:'고급기술자-하', startDate:'2026-09-01', endDate:'2027-01-31', mm:8, amount:68000000 },
    { workType:'리블리싱', grade:'중급기술자', startDate:'2026-09-01', endDate:'2027-01-31', mm:4, amount:22000000 },
  ],
  'Q-202607-006': [
    { workType:'Oracle/배치', grade:'특급기술자', startDate:'2026-08-01', endDate:'2027-03-31', mm:8, amount:88000000 },
    { workType:'Oracle/배치', grade:'고급기술자-상', startDate:'2026-08-01', endDate:'2027-03-31', mm:10, amount:92000000 },
  ],
};

const budgetOutsourceContracts = {
  budgetMock: [
    {
      id:'os-1001', vendorId:'vd-bp', vendorName:'BP Korea', title:'국내 분석/설계 및 Java 개발',
      startDate:'2026-07-01', endDate:'2027-03-31', contractAmount:380000000,
      quoteNo:'Q-202607-001', poNo:'4500123456', status:'계약완료',
    },
    {
      id:'os-1002', vendorId:'vd-vn', vendorName:'Vietnam Front Team', title:'Vue 화면개발 1차',
      startDate:'2026-08-01', endDate:'2027-02-28', contractAmount:240000000,
      quoteNo:'Q-202607-002', poNo:'', status:'계약작성중',
    },
  ],
};

const budgetOtherOutsourceExpenses = {
  budgetMock: [
    { id:'oo-actual-1000', expectedMonth:'2026-06', amount:3900000, description:'고객사 검수 출장비 실적 반영분', status:'실적', actualized:true },
    { id:'oo-1001', expectedMonth:'2026-09', amount:6800000, description:'출장비 비용 - 베트남 개발팀 온사이트 지원', status:'계획' },
    { id:'oo-1002', expectedMonth:'2026-11', amount:12000000, description:'30131234-D001 프로젝트에서 이관 예정 예산', status:'계획' },
    { id:'oo-1003', expectedMonth:'2027-02', amount:4500000, description:'고객사 검수 대응 교통/숙박성 경비', status:'계획' },
  ],
};

const purchaseMaterialQuoteData = [
  { quoteNo:'MQ-202607-001', itemNo:'10', itemCode:'SW00014', categoryName:'소프트웨어-경영/인사', standardName:'HRMS(인사관리)', manufacturer:'휴먼컨설팅그룹', modelName:'hunel', title:'HRMS(인사관리)', amount:52000000, receivedAt:'2026-07-01 11:10', poNo:'' },
  { quoteNo:'MQ-202607-002', itemNo:'20', itemCode:'SW00021', categoryName:'소프트웨어-개발도구', standardName:'테스트 자동화 도구', manufacturer:'QA Tech', modelName:'QA-AUTO-STD', title:'테스트 자동화 도구', amount:28000000, receivedAt:'2026-07-02 09:35', poNo:'' },
  { quoteNo:'MQ-202607-003', itemNo:'30', itemCode:'SW00033', categoryName:'소프트웨어-보안', standardName:'보안 점검 패키지', manufacturer:'SecureOne', modelName:'SEC-PACK-PRO', title:'보안 점검 패키지', amount:17000000, receivedAt:'2026-07-02 16:20', poNo:'' },
];

const budgetMaterialItems = {
  budgetMock: [
    {
      id:'mi-actual-1000',
      large:'솔루션',
      middle:'라이선스',
      small:'테스트도구',
      model:'QA-AUTO-STD',
      productDetail:'검수 자동화 도구 실적 반영분',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-06-01',
      deliveryEnd:'2026-06-30',
      quoteNo:'MQ-202606-009',
      amount:9000000,
      status:'실적',
      actualized:true,
    },
    {
      id:'mi-1001',
      large:'솔루션',
      middle:'라이선스',
      small:'개발도구',
      model:'DEV-CLOUD-PRO',
      productDetail:'개발/테스트 솔루션 라이선스',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-08-01',
      deliveryEnd:'2027-07-31',
      quoteNo:'MQ-202607-001',
      amount:52000000,
      status:'계획',
    },
  ],
};

const budgetOtherMaterialExpenses = {
  budgetMock: [
    { id:'om-actual-1000', expectedMonth:'2026-06', amount:1800000, description:'PoC 장비 임대 실적 반영분', status:'실적', actualized:true },
    { id:'om-1001', expectedMonth:'2026-10', amount:6500000, description:'타 프로젝트 잔여 재료비 이관 예정', status:'계획' },
    { id:'om-1002', expectedMonth:'2027-03', amount:3200000, description:'최종 검수용 임시 라이선스 구매 계획', status:'계획' },
  ],
};

const budgetMaOutsourceItems = {
  budgetMock: [
    {
      id:'ma-1001',
      large:'솔루션',
      middle:'MA',
      small:'유지보수',
      model:'NOVA-COST-AI',
      productDetail:'AI 원가관리 모듈 MA',
      quantity:1,
      unit:'식',
      revenueBasis:'월',
      deliveryStart:'2026-07-01',
      deliveryEnd:'2027-06-30',
      quoteNo:'Q-202607-004',
      amount:145000000,
      status:'견적반영',
    },
  ],
};

function getOutsourceRows(proj = currentBudgetProj) {
  if (!budgetOutsourceContracts[proj]) budgetOutsourceContracts[proj] = [];
  return budgetOutsourceContracts[proj];
}

function getOtherOutsourceRows(proj = currentBudgetProj) {
  if (!budgetOtherOutsourceExpenses[proj]) budgetOtherOutsourceExpenses[proj] = [];
  return budgetOtherOutsourceExpenses[proj];
}

function getMaOutsourceRows(proj = currentBudgetProj) {
  if (!budgetMaOutsourceItems[proj]) budgetMaOutsourceItems[proj] = [];
  return budgetMaOutsourceItems[proj];
}

function getMaterialRows(proj = currentBudgetProj) {
  if (!budgetMaterialItems[proj]) budgetMaterialItems[proj] = [];
  return budgetMaterialItems[proj];
}

function getOtherMaterialRows(proj = currentBudgetProj) {
  if (!budgetOtherMaterialExpenses[proj]) budgetOtherMaterialExpenses[proj] = [];
  return budgetOtherMaterialExpenses[proj];
}

function switchOutsourceKind(kind) {
  outsourceKind = kind || 'direct';
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  editingOtherOutsourceId = null;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function switchMaterialKind(kind) {
  materialKind = kind || 'item';
  editingMaterialItemId = null;
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function renderOutsourceKindTabs() {
  const tabs = [
    { id:'direct', label:'실투입외주비', desc:'업체/계약/PO' },
    { id:'other', label:'기타외주비', desc:'집행월/금액' },
    { id:'ma', label:'MA', desc:'견적/납기/손익' },
  ];
  return `
    <div class="os-kind-tabs">
      ${tabs.map(tab => `
        <button class="${outsourceKind === tab.id ? 'active' : ''}" onclick="switchOutsourceKind('${tab.id}')">
          <strong>${tab.label}</strong>
          <span>${tab.desc}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
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
      ${renderOutsourceKindTabs()}
      ${bodyHtml}
    </div>`;
}

function getSelectedOutsourceVendor() {
  return outsourceVendorPool.find(v => v.id === selectedOutsourceVendorId) || outsourceVendorPool[0];
}

function getSelectedOutsourceContract() {
  const rows = getOutsourceRows();
  return rows.find(r => r.id === selectedOutsourceContractId) || rows[0] || null;
}

function updateOutsourceSearch(value) {
  outsourceSearchQuery = value || '';
  renderBudgetPage();
}

function selectOutsourceVendor(id) {
  selectedOutsourceVendorId = id;
  outsourceVendorLookupOpen = false;
  outsourceQuoteLookupOpen = false;
  renderBudgetPage();
}

function toggleOutsourceVendorLookup() {
  outsourceVendorLookupOpen = !outsourceVendorLookupOpen;
  renderBudgetPage();
}

function toggleOutsourceQuoteLookup() {
  outsourceQuoteLookupOpen = !outsourceQuoteLookupOpen;
  if (outsourceQuoteLookupOpen) refreshPurchaseQuotes();
  else renderBudgetPage();
}

function setOutsourceQuoteRequired(value) {
  outsourceQuoteRequired = value === 'N' ? 'N' : 'Y';
  outsourceQuoteLookupOpen = outsourceQuoteRequired === 'Y';
  if (outsourceQuoteRequired === 'N') {
    selectedOutsourceQuoteNo = '';
    outsourceInspectionPlanPreviewQuoteNo = '';
  }
  renderBudgetPage();
}

function openNewOutsourceContract() {
  outsourceRegistrationMode = 'new';
  editingOutsourceContractId = null;
  selectedOutsourceContractId = '';
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceInspectionPreviewStartDate = '';
  outsourceInspectionPreviewEndDate = '';
  renderBudgetPage();
}

function editOutsourceContract(id) {
  selectedOutsourceContractId = id;
  editingOutsourceContractId = id;
  outsourceRegistrationMode = 'edit';
  const row = getOutsourceRows().find(r => r.id === id);
  if (row) selectedOutsourceVendorId = row.vendorId;
  renderBudgetPage();
}

function closeOutsourceContractEditor() {
  outsourceRegistrationMode = null;
  editingOutsourceContractId = null;
  renderBudgetPage();
}

function refreshPurchaseQuotes() {
  purchaseQuoteLastSyncedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  showToast('구매시스템에서 최종 수취 견적 데이터를 불러왔습니다.');
  renderBudgetPage();
}

function applyPurchaseQuote(quoteNo, amount, title) {
  const amountEl = document.getElementById('outsource-contract-amount');
  const titleEl = document.getElementById('outsource-contract-title');
  const quoteEl = document.getElementById('outsource-quote-no');
  if (amountEl) amountEl.value = amount;
  if (titleEl) titleEl.value = title;
  if (quoteEl) quoteEl.value = quoteNo;
  selectedOutsourceQuoteNo = quoteNo;
  outsourceInspectionPlanPreviewQuoteNo = '';
  outsourceQuoteLookupOpen = false;
  showToast('견적 금액을 계약정보에 반영했습니다.');
  renderBudgetPage();
}

function getSelectedOutsourceQuote(vendor, editing) {
  const quotes = purchaseQuoteData[vendor?.id] || [];
  const quoteNo = editing?.quoteNo || selectedOutsourceQuoteNo || quotes[0]?.quoteNo || '';
  return quotes.find(q => q.quoteNo === quoteNo) || quotes[0] || null;
}

function getOutsourceInspectionRows(quoteNo, startDate, endDate) {
  const rows = outsourceQuoteBreakdownData[quoteNo] || [];
  const contractMonths = monthRangeByDate(startDate, endDate);
  return rows.map(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const targetMonths = rowMonths.filter(m => contractMonths.includes(m));
    const ratio = rowMonths.length ? targetMonths.length / rowMonths.length : 0;
    const planAmount = Math.round(row.amount * ratio);
    const planMm = Math.round(row.mm * ratio * 100) / 100;
    return {
      ...row,
      planStart: targetMonths[0] || row.startDate.slice(0, 7),
      planEnd: targetMonths[targetMonths.length - 1] || row.endDate.slice(0, 7),
      planMm,
      planAmount,
      status: targetMonths.length ? '생성대상' : '계약기간 외',
    };
  });
}

function generateOutsourceInspectionPlanPreview() {
  const quoteNo = document.getElementById('outsource-quote-no')?.value || selectedOutsourceQuoteNo;
  const startDate = document.getElementById('outsource-start')?.value || '';
  const endDate = document.getElementById('outsource-end')?.value || '';
  if (!quoteNo || !outsourceQuoteBreakdownData[quoteNo]) {
    showToast('검수계획을 생성할 견적 산출내역이 없습니다.');
    return;
  }
  if (!monthRangeByDate(startDate, endDate).length) {
    showToast('계약 시작일과 종료일을 먼저 입력해 주세요.');
    return;
  }
  selectedOutsourceQuoteNo = quoteNo;
  outsourceInspectionPlanPreviewQuoteNo = quoteNo;
  outsourceInspectionPreviewStartDate = startDate;
  outsourceInspectionPreviewEndDate = endDate;
  showToast('견적 산출내역 기준 실투입(검수)계획을 생성했습니다.');
  renderBudgetPage();
}

function showOutsourceInspectionAdjustGuide() {
  let modal = document.getElementById('outsource-inspection-adjust-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-adjust-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="labor-process-guide-modal outsource-adjust-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>검수 금액 보정</span>
          <strong>자동 생성된 검수계획 금액을 구매 전송 전에 보정합니다</strong>
        </div>
        <button onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="labor-process-guide-rules">
          <strong>보정 기준</strong>
          <p>견적 산출내역으로 생성된 기술등급별 금액은 기본 검수계획입니다.</p>
          <p>검수 금액 보정은 월별 검수금액, 반올림 차액, 계약 범위 조정이 필요한 경우에만 수행합니다.</p>
          <p>보정 이력은 구매 전송 시 함께 남기고, 전송 후에는 구매시스템 기준 데이터로 관리합니다.</p>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-primary" onclick="document.getElementById('outsource-inspection-adjust-modal').classList.remove('open')">확인</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function renderOutsourceQuoteBreakdownPanel(quoteNo, startDate, endDate, generated, savedRows) {
  if (!quoteNo) {
    return `
      <div class="os-inspection-card muted">
        <div class="os-inspection-head">
          <div><strong>4. 견적 산출내역 / 검수계획</strong><span>견적번호를 선택하면 기술등급별 산출내역이 표시됩니다.</span></div>
        </div>
      </div>`;
  }
  const quoteRows = outsourceQuoteBreakdownData[quoteNo] || [];
  const planRows = savedRows || (generated ? getOutsourceInspectionRows(quoteNo, startDate, endDate) : []);
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = planRows.reduce((sum, row) => sum + row.planAmount, 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 실투입(검수)계획</strong>
          <span>견적 산출내역을 기준으로 계약 시작월~종료월에 해당하는 검수계획 금액을 생성합니다.</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-sub-btn" onclick="showOutsourceInspectionAdjustGuide()">검수 금액 보정</button>
          <button class="labor-main-btn" onclick="generateOutsourceInspectionPlanPreview()">실투입(검수)계획 생성</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span></div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.mm.toFixed(3)}</span><span>${fmt(row.amount)}원</span>
            </div>
          `).join('') || '<div class="labor-empty">견적 산출내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalQuote)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">생성된 실투입(검수)계획 <em>${generated || savedRows ? '구매 전송 예정 데이터' : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan">
            <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>시작월</span><span>종료월</span><span>계획MM</span><span>검수계획금액</span><span>상태</span></div>
            ${planRows.map(row => `
              <div class="os-inspection-row">
                <span>${row.workType}</span><span>${row.grade}</span><span>${row.planStart}</span><span>${row.planEnd}</span><span>${row.planMm.toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalPlan)}원</span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 기술등급별 계획이 생성됩니다.</div>'}
      </div>
    </div>`;
}

function getOutsourceInspectionRows(quoteNo, startDate, endDate) {
  const rows = outsourceQuoteBreakdownData[quoteNo] || [];
  const contractMonths = monthRangeByDate(startDate, endDate);
  return rows.flatMap(row => {
    const rowMonths = monthRangeByDate(row.startDate, row.endDate);
    const targetMonths = rowMonths.filter(m => contractMonths.includes(m));
    const monthlyAmount = rowMonths.length ? Math.round(row.amount / rowMonths.length) : 0;
    const monthlyMm = rowMonths.length ? Math.round((row.mm / rowMonths.length) * 100) / 100 : 0;
    return targetMonths.map(month => ({
      ...row,
      month,
      planMm: monthlyMm,
      planAmount: monthlyAmount,
      status: '구매전송 대기',
    }));
  });
}

function renderOutsourceQuoteBreakdownPanel(quoteNo, startDate, endDate, generated, savedRows) {
  if (!quoteNo) {
    return `
      <div class="os-inspection-card muted">
        <div class="os-inspection-head">
          <div><strong>4. 견적 산출내역 / 검수계획</strong><span>견적번호를 선택하면 기술등급별 산출내역이 표시됩니다.</span></div>
        </div>
      </div>`;
  }
  const quoteRows = outsourceQuoteBreakdownData[quoteNo] || [];
  const planRows = savedRows || (generated ? getOutsourceInspectionRows(quoteNo, startDate, endDate) : []);
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = planRows.reduce((sum, row) => sum + row.planAmount, 0);
  const planMonths = [...new Set(planRows.map(row => row.month))];
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 실투입(검수)계획</strong>
          <span>실투입(검수)계획 생성 시 견적 라인을 월별 검수계획으로 펼쳐서 생성합니다.</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-sub-btn" onclick="showOutsourceInspectionAdjustGuide()">검수 금액 보정</button>
          <button class="labor-main-btn" onclick="generateOutsourceInspectionPlanPreview()">실투입(검수)계획 생성</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span></div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.mm.toFixed(3)}</span><span>${fmt(row.amount)}원</span>
            </div>
          `).join('') || '<div class="labor-empty">견적 산출내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalQuote)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">생성된 월별 실투입(검수)계획 <em>${generated || savedRows ? `${planMonths.join(', ')} / 구매 전송 예정` : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan monthly">
            <div class="os-inspection-row head"><span>검수월</span><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수금액</span><span>상태</span></div>
            ${planRows.map(row => `
              <div class="os-inspection-row">
                <span>${row.month}</span><span>${row.workType}</span><span>${row.grade}</span><span>${row.planMm.toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span>${fmt(totalPlan)}원</span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 견적 라인의 월별 계획 금액이 생성됩니다.</div>'}
      </div>
    </div>`;
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺' || r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      if (inspectionPlan.length) {
        inspectionPlan.filter(plan => plan.month === mo.m).forEach(plan => {
          amount += plan.planAmount;
          nextDetails.push({
            type:'투입확정',
            vendor:row.vendorName,
            grade:plan.grade,
            amount:plan.planAmount,
            po:row.poNo,
            source:'outsourceContract',
          });
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function saveOtherOutsourceExpense() {
  const expectedMonth = document.getElementById('other-os-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-os-amount')?.value || 0);
  const description = document.getElementById('other-os-desc')?.value || '';

  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  getOtherOutsourceRows().unshift({
    id:`oo-${Date.now()}`,
    expectedMonth,
    amount,
    description,
    status:'계획',
  });
  showToast('기타외주비 계획이 등록되었습니다.');
  renderBudgetPage();
}

function applyMaPurchaseQuote(quoteNo, amount, title) {
  maQuoteNo = quoteNo;
  maQuoteAmount = amount;
  maQuoteTitle = title;
  const quoteEl = document.getElementById('ma-quote-no');
  const amountEl = document.getElementById('ma-amount');
  const detailEl = document.getElementById('ma-product-detail');
  if (quoteEl) quoteEl.value = quoteNo;
  if (amountEl) amountEl.value = amount;
  if (detailEl) detailEl.value = title;
  showToast('MA 견적 데이터가 입력값에 반영되었습니다.');
}

function saveMaOutsourceItem() {
  const item = {
    id:`ma-${Date.now()}`,
    large:document.getElementById('ma-large')?.value || '',
    middle:document.getElementById('ma-middle')?.value || '',
    small:document.getElementById('ma-small')?.value || '',
    model:document.getElementById('ma-model')?.value || '',
    productDetail:document.getElementById('ma-product-detail')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('ma-qty')?.value || 0),
    unit:document.getElementById('ma-unit')?.value || '',
    revenueBasis:document.getElementById('ma-revenue-basis')?.value || '',
    deliveryStart:document.getElementById('ma-start')?.value || '',
    deliveryEnd:document.getElementById('ma-end')?.value || '',
    quoteNo:document.getElementById('ma-quote-no')?.value || '',
    amount:parseBudgetAmount(document.getElementById('ma-amount')?.value || 0),
    status:'견적반영',
  };

  if (!item.large || !item.middle || !item.small || !item.quantity || !item.revenueBasis || !item.deliveryStart || !item.deliveryEnd || !item.amount) {
    showToast('MA 필수값과 견적 금액을 입력해 주세요.');
    return;
  }

  getMaOutsourceRows().unshift(item);
  showToast('MA 외주비 계획이 등록되었습니다.');
  renderBudgetPage();
}

function renderOtherOutsourcePanel() {
  const rows = getOtherOutsourceRows();
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>기타외주비 계획</span></div>
      <p>출장비, 예산 이관, 일회성 지원비처럼 계약/PO보다 집행 예정월 중심으로 관리할 비용입니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-card-title">기타외주비 계획 입력</div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-os-month" type="month" value="2026-09"></label>
          <label><span>금액</span><input id="other-os-amount" inputmode="numeric" placeholder="예: 6800000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-os-desc" rows="4" placeholder="예: 어느 프로젝트로부터 이관, 출장비 비용, 고객사 검수 대응비"></textarea></label>
        </div>
        <div class="labor-mm-guide">
          <strong>설명은 일단 텍스트로 쌓습니다.</strong>
          <span>데이터가 충분히 쌓이면 AI가 출장/이관/검수/기타 등으로 카테고리를 제안하는 흐름으로 확장할 수 있습니다.</span>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherOutsourceExpense()">기타외주비 저장</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status saved">${row.status}</i>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타외주비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function saveOtherOutsourceExpense() {
  const expectedMonth = document.getElementById('other-os-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-os-amount')?.value || 0);
  const description = document.getElementById('other-os-desc')?.value || '';

  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  const rows = getOtherOutsourceRows();
  const editing = editingOtherOutsourceId ? rows.find(row => row.id === editingOtherOutsourceId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 기타외주비는 수정할 수 없습니다.');
    return;
  }
  if (editing) {
    Object.assign(editing, { expectedMonth, amount, description, status:'계획' });
    showToast('기타외주비 계획이 수정되었습니다.');
  } else {
    rows.unshift({
      id:`oo-${Date.now()}`,
      expectedMonth,
      amount,
      description,
      status:'계획',
    });
    showToast('기타외주비 계획이 등록되었습니다.');
  }
  editingOtherOutsourceId = null;
  renderBudgetPage();
}

function editOtherOutsourceExpense(id) {
  const row = getOtherOutsourceRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 기타외주비는 수정할 수 없습니다.');
    return;
  }
  editingOtherOutsourceId = id;
  renderBudgetPage();
}

function cancelOtherOutsourceEdit() {
  editingOtherOutsourceId = null;
  renderBudgetPage();
}

function renderOtherOutsourcePanel() {
  const rows = getOtherOutsourceRows();
  const editing = editingOtherOutsourceId ? rows.find(row => row.id === editingOtherOutsourceId) : null;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(total)}원</strong><span>기타외주비 계획</span></div>
      <p>실적이 발생한 건은 잠기고, 아직 실적이 없는 계획 건만 신규 등록 또는 수정할 수 있습니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '기타외주비 계획 수정' : '기타외주비 계획 입력'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelOtherOutsourceEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-os-month" type="month" value="${editing ? editing.expectedMonth : '2026-09'}"></label>
          <label><span>금액</span><input id="other-os-amount" inputmode="numeric" value="${editing ? editing.amount : ''}" placeholder="예: 6800000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-os-desc" rows="4" placeholder="예: 어느 프로젝트로부터 이관, 출장비 비용, 고객사 검수 대응비">${editing ? editing.description : ''}</textarea></label>
        </div>
        <div class="labor-mm-guide">
          <strong>설명은 일단 텍스트로 쌓습니다.</strong>
          <span>추후 데이터가 쌓이면 AI가 이관/출장/검수/기타 카테고리를 제안하는 흐름으로 확장할 수 있습니다.</span>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherOutsourceExpense()">${editing ? '수정 저장' : '기타외주비 저장'}</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header with-action"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span><span></span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row with-action ${editingOtherOutsourceId === row.id ? 'active' : ''}">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status ${row.actualized ? 'done' : 'saved'}">${row.status}</i>
              <div class="labor-reg-actions">
                ${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editOtherOutsourceExpense('${row.id}')">수정</button>`}
              </div>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타외주비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function renderMaOutsourcePanel() {
  const rows = getMaOutsourceRows();
  const vendor = getSelectedOutsourceVendor();
  const quotes = (purchaseQuoteData[vendor?.id] || purchaseQuoteData['vd-bp'] || []).slice(0, 3);
  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>MA 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>MA 계획 금액</span></div>
      <p>MA는 견적 데이터를 불러온 뒤 대/중/소 분류, 손익인식 기준, 예상 납기일을 확정합니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 구매 견적 불러오기</div>
            <p>실투입 외주비처럼 최종 수취된 견적을 참고 데이터로 사용합니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="refreshPurchaseQuotes()">견적 새로고침</button>
        </div>
        <div class="os-quote-list compact">
          ${quotes.map(q => `
            <button class="os-quote-item" onclick="applyMaPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
              <strong>${q.quoteNo}</strong>
              <span>${q.title}</span>
              <b>${fmt(q.amount)}원</b>
              <em>수취 ${q.receivedAt}</em>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-card-title">2. MA 기본정보</div>
        <div class="labor-form os-ma-form">
          <label><span>대분류 *</span><input id="ma-large" value="솔루션"></label>
          <label><span>중분류 *</span><input id="ma-middle" value="MA"></label>
          <label><span>소분류 *</span><input id="ma-small" value="유지보수"></label>
          <label><span>모델명</span><input id="ma-model" value="NOVA-COST-AI"></label>
          <label class="wide"><span>제품상세</span><input id="ma-product-detail" value="${maQuoteTitle}"></label>
          <label><span>수량 *</span><input id="ma-qty" inputmode="numeric" value="1"></label>
          <label><span>단위</span><input id="ma-unit" value="식"></label>
          <label><span>손익인식기준 *</span>
            <select id="ma-revenue-basis">
              <option>월</option>
              <option>분기</option>
              <option>반기</option>
              <option>연</option>
            </select>
          </label>
          <label><span>시작일 *</span><input id="ma-start" type="date" value="2026-07-01"></label>
          <label><span>종료일 *</span><input id="ma-end" type="date" value="2027-06-30"></label>
          <label><span>견적번호</span><input id="ma-quote-no" value="${maQuoteNo}" readonly></label>
          <label><span>견적금액</span><input id="ma-amount" inputmode="numeric" value="${maQuoteAmount}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaOutsourceItem()">MA 등록</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head">
          <span>대분류</span><span>중분류</span><span>소분류</span><span>모델명</span><span>제품상세</span><span>수량</span><span>단위</span><span>손익인식기준</span><span>시작일</span><span>종료일</span><span>견적/금액</span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row">
            <span>${row.large}</span><span>${row.middle}</span><span>${row.small}</span><span>${row.model || '-'}</span><span>${row.productDetail || '-'}</span><span>${row.quantity}</span><span>${row.unit || '-'}</span><span>${row.revenueBasis}</span><span>${row.deliveryStart}</span><span>${row.deliveryEnd}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 MA 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function saveOutsourceContractDraft() {
  const rows = getOutsourceRows();
  const editing = editingOutsourceContractId ? rows.find(r => r.id === editingOutsourceContractId) : null;
  const vendor = editing ? outsourceVendorPool.find(v => v.id === editing.vendorId) : getSelectedOutsourceVendor();
  const title = document.getElementById('outsource-contract-title')?.value || '';
  const startDate = document.getElementById('outsource-start')?.value || '';
  const endDate = document.getElementById('outsource-end')?.value || '';
  const quoteNo = document.getElementById('outsource-quote-no')?.value || '';
  const contractAmount = parseBudgetAmount(document.getElementById('outsource-contract-amount')?.value || 0);
  const quoteYn = document.querySelector('input[name="outsource-quote-yn"]:checked')?.value || outsourceQuoteRequired;
  outsourceQuoteRequired = quoteYn === 'N' ? 'N' : 'Y';

  if (!vendor || !title || !startDate || !endDate || !contractAmount) {
    showToast('업체, 계약명, 기간, 계약금액을 입력해주세요.');
    return;
  }
  if (outsourceQuoteRequired === 'Y' && !quoteNo) {
    showToast('견적 있음(Y)인 경우 구매시스템 견적번호를 조회해 선택해주세요.');
    return;
  }
  if (!monthRangeByDate(startDate, endDate).length) {
    showToast('계약 시작일과 종료일을 올바르게 입력해주세요.');
    return;
  }

  const target = editing || {
    id:`os-${Date.now()}`,
    poNo:'',
    status:'계약작성중',
  };

  Object.assign(target, {
    vendorId: vendor.id,
    vendorName: vendor.name,
    title,
    startDate,
    endDate,
    quoteNo,
    contractAmount,
    inspectionPlan: quoteNo && outsourceQuoteBreakdownData[quoteNo]
      ? getOutsourceInspectionRows(quoteNo, startDate, endDate)
      : [],
  });

  if (!editing) rows.unshift(target);
  selectedOutsourceContractId = target.id;
  editingOutsourceContractId = target.id;
  outsourceRegistrationMode = 'edit';
  syncOutsourceContractsToBudget(currentBudgetProj);
  showToast('외주 계약 기본정보가 저장되었습니다.');
  renderBudgetPage();
}

function completeOutsourceContract(id) {
  const row = getOutsourceRows().find(r => r.id === id);
  if (!row) return;
  if (!row.poNo) {
    row.poNo = `4500${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  }
  row.status = '계약완료';
  syncOutsourceContractsToBudget(currentBudgetProj);
  showToast(`계약완료 처리되었습니다. PO번호 ${row.poNo}가 매핑되었습니다.`);
  renderBudgetPage();
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      if (inspectionPlan.length) {
        inspectionPlan.forEach(plan => {
          const planMonths = monthRangeByDate(`${plan.planStart}-01`, `${plan.planEnd}-01`);
          if (!planMonths.includes(mo.m)) return;
          const monthlyAmount = Math.round(plan.planAmount / planMonths.length);
          amount += monthlyAmount;
          nextDetails.push({
            type:'투입확정',
            vendor:row.vendorName,
            grade:plan.grade,
            amount:monthlyAmount,
            po:row.poNo,
            source:'outsourceContract',
          });
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function renderOutsourceContractPanelLegacyInline(data) {
  const rows = getOutsourceRows();
  const formOpen = outsourceRegistrationMode === 'new' || outsourceRegistrationMode === 'edit';
  const editing = editingOutsourceContractId ? rows.find(r => r.id === editingOutsourceContractId) : null;
  const vendor = editing ? outsourceVendorPool.find(v => v.id === editing.vendorId) : getSelectedOutsourceVendor();
  const query = outsourceSearchQuery.trim().toLowerCase();
  const vendors = outsourceVendorPool.filter(v => !query || `${v.name} ${v.specialty} ${v.owner}`.toLowerCase().includes(query));
  const quotes = purchaseQuoteData[vendor?.id] || [];
  const quoteYn = editing && !editing.quoteNo ? 'N' : outsourceQuoteRequired;
  const quoteSearchDisabled = quoteYn === 'N';

  const contractRows = rows.map(row => `
    <div class="os-reg-row ${selectedOutsourceContractId === row.id ? 'active' : ''}">
      <div class="os-reg-main"><strong>${row.vendorName}</strong><span>${row.title}</span></div>
      <div>${row.startDate} ~ ${row.endDate}</div>
      <div class="os-reg-num">${fmt(row.contractAmount)}원</div>
      <div>${row.quoteNo || '-'}</div>
      <div><b class="os-po">${row.poNo || 'PO 미매핑'}</b></div>
      <div><i class="labor-status ${row.status === '계약완료' ? 'done' : 'saved'}">${row.status}</i></div>
      <div class="labor-reg-actions">
        <button onclick="editOutsourceContract('${row.id}')">수정</button>
      </div>
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
            <span>업체검색</span><span>계약정보 입력</span><span>견적 참고</span><span>계약완료</span><span>PO 매핑</span>
          </div>

          <div class="os-edit-grid">
            <div class="labor-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">1. 업체 선택</div>
                  <p>구매/SCM 기준 등록 업체를 검색해 선택합니다.</p>
                </div>
              </div>
              <div class="os-lookup-field">
                <div>
                  <strong>${vendor ? vendor.name : '업체를 선택해주세요'}</strong>
                  <span>${vendor ? `${vendor.specialty} · 담당 ${vendor.owner} · 등급 ${vendor.grade}` : '구매시스템 등록 BP만 선택할 수 있습니다.'}</span>
                </div>
                <button type="button" onclick="toggleOutsourceVendorLookup()" title="구매시스템 BP 검색">⌕</button>
              </div>
              ${outsourceVendorLookupOpen ? `
                <input class="labor-search-input" value="${outsourceSearchQuery}" placeholder="구매시스템 BP 검색"
                  oninput="updateOutsourceSearch(this.value)">
                <div class="labor-candidates">
                  ${vendors.map(v => `
                    <button class="labor-candidate ${vendor && vendor.id === v.id ? 'active' : ''}" onclick="selectOutsourceVendor('${v.id}')">
                      <strong>${v.name}</strong>
                      <span>${v.specialty} · 담당 ${v.owner}</span>
                      <em>평가등급 ${v.grade}</em>
                    </button>
                  `).join('') || '<div class="labor-empty">구매시스템에 등록된 BP가 없습니다.</div>'}
                </div>` : ''}
            </div>

            <div class="labor-card">
              <div class="labor-card-title">2. 계약 기본정보</div>
              <div class="labor-form">
                <label><span>계약 시작일</span><input id="outsource-start" type="date" value="${editing ? editing.startDate : '2026-07-01'}"></label>
                <label><span>계약 종료일</span><input id="outsource-end" type="date" value="${editing ? editing.endDate : '2026-12-31'}"></label>
                <label><span>계약명</span><input id="outsource-contract-title" value="${editing ? editing.title : (quoteYn === 'Y' ? (quotes[0]?.title || '') : '')}"></label>
                <label><span>계약금액</span><input id="outsource-contract-amount" inputmode="numeric" value="${editing ? editing.contractAmount : (quoteYn === 'Y' ? (quotes[0]?.amount || '') : '')}"></label>
                <label class="os-quote-yn"><span>견적 여부</span>
                  <div class="os-radio-row">
                    <label><input type="radio" name="outsource-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('Y')"> Y</label>
                    <label><input type="radio" name="outsource-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="setOutsourceQuoteRequired('N')"> N</label>
                  </div>
                </label>
                <label><span>견적번호</span>
                  <div class="os-lookup-input">
                    <input id="outsource-quote-no" value="${editing ? editing.quoteNo : (quoteYn === 'Y' ? (quotes[0]?.quoteNo || '') : '')}" ${quoteYn === 'Y' ? 'readonly' : ''} placeholder="${quoteYn === 'Y' ? '돋보기로 견적 선택' : '견적 없음'}">
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

            <div class="labor-card os-quote-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">3. 구매시스템 견적 참고</div>
                  <p>최종 수취된 견적 데이터를 참고해 계약금액에 반영합니다.</p>
                </div>
                <button class="labor-sync-btn" onclick="refreshPurchaseQuotes()">견적 불러오기</button>
              </div>
              <div class="labor-sync-note">${quoteYn === 'N' ? '견적 없음(N) 단계에서는 계약 정보를 직접 입력합니다.' : (purchaseQuoteLastSyncedAt ? `최근 조회 ${purchaseQuoteLastSyncedAt}` : '돋보기 또는 견적 불러오기로 구매시스템 견적을 선택합니다.')}</div>
              ${quoteYn === 'Y' && outsourceQuoteLookupOpen ? `
                <div class="os-quote-list">
                  ${quotes.map(q => `
                    <button class="os-quote-item" onclick="applyPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
                      <strong>${q.quoteNo}</strong>
                      <span>${q.title}</span>
                      <b>${fmt(q.amount)}원</b>
                      <em>수취 ${q.receivedAt}</em>
                    </button>
                  `).join('') || '<div class="labor-empty">구매시스템에 수취된 견적이 없습니다.</div>'}
                </div>` : ''}
            </div>
          </div>
        </div>` : ''}
    </div>`;
}

function renderMaterialKindTabs() {
  const tabs = [
    { id:'item', label:'재료비', desc:'견적/품목/납기' },
    { id:'other', label:'기타재료비', desc:'이관/임시/기타' },
  ];
  return `
    <div class="os-kind-tabs material">
      ${tabs.map(tab => `
        <button class="${materialKind === tab.id ? 'active' : ''}" onclick="switchMaterialKind('${tab.id}')">
          <strong>${tab.label}</strong>
          <span>${tab.desc}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
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
      ${renderMaterialKindTabs()}
      ${bodyHtml}
    </div>`;
}

function switchMaterialQuoteSelectedYn(value) {
  materialQuoteSelectedYn = value === 'N' ? 'N' : 'Y';
  if (materialQuoteSelectedYn === 'N') {
    materialQuoteNo = '';
    materialQuoteAmount = 0;
    materialQuoteTitle = '';
  }
  renderBudgetPage();
}

function applyMaterialPurchaseQuote(quoteNo, amount, title) {
  const quote = purchaseMaterialQuoteData.find(q => q.quoteNo === quoteNo) || {};
  materialQuoteSelectedYn = 'Y';
  materialQuoteNo = quoteNo;
  materialQuoteAmount = amount;
  materialQuoteTitle = title;
  const quoteEl = document.getElementById('material-quote-no');
  const amountEl = document.getElementById('material-amount');
  const detailEl = document.getElementById('material-product-detail');
  const itemNoEl = document.getElementById('material-item-no');
  const itemCodeEl = document.getElementById('material-item-code');
  const categoryEl = document.getElementById('material-category-name');
  const standardEl = document.getElementById('material-standard-name');
  const manufacturerEl = document.getElementById('material-manufacturer');
  const modelEl = document.getElementById('material-model');
  if (quoteEl) quoteEl.value = quoteNo;
  if (amountEl) amountEl.value = amount;
  if (detailEl) detailEl.value = title;
  if (itemNoEl) itemNoEl.value = quote.itemNo || '';
  if (itemCodeEl) itemCodeEl.value = quote.itemCode || '';
  if (categoryEl) categoryEl.value = quote.categoryName || '';
  if (standardEl) standardEl.value = quote.standardName || title || '';
  if (manufacturerEl) manufacturerEl.value = quote.manufacturer || '';
  if (modelEl) modelEl.value = quote.modelName || '';
  showToast('재료비 견적 데이터가 입력값에 반영되었습니다.');
}

function editMaterialItem(id) {
  const row = getMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 재료비는 수정할 수 없습니다.');
    return;
  }
  editingMaterialItemId = id;
  renderBudgetPage();
}

function cancelMaterialItemEdit() {
  editingMaterialItemId = null;
  renderBudgetPage();
}

function saveMaterialItem() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 재료비는 수정할 수 없습니다.');
    return;
  }

  const item = {
    id: editing?.id || `mi-${Date.now()}`,
    quoteSelectedYn:document.querySelector('input[name="material-quote-yn"]:checked')?.value || materialQuoteSelectedYn,
    itemNo:document.getElementById('material-item-no')?.value || '',
    itemCode:document.getElementById('material-item-code')?.value || '',
    categoryName:document.getElementById('material-category-name')?.value || '',
    standardName:document.getElementById('material-standard-name')?.value || '',
    manufacturer:document.getElementById('material-manufacturer')?.value || '',
    large:document.getElementById('material-large')?.value || '',
    middle:document.getElementById('material-middle')?.value || '',
    small:document.getElementById('material-small')?.value || '',
    model:document.getElementById('material-model')?.value || '',
    productDetail:document.getElementById('material-product-detail')?.value || '',
    quantity:parseBudgetAmount(document.getElementById('material-qty')?.value || 0),
    unit:document.getElementById('material-unit')?.value || '',
    revenueBasis:document.getElementById('material-revenue-basis')?.value || '',
    deliveryStart:document.getElementById('material-start')?.value || '',
    deliveryEnd:document.getElementById('material-end')?.value || '',
    quoteNo:document.getElementById('material-quote-no')?.value || '',
    poNo:document.getElementById('material-po-no')?.value || '',
    amount:parseBudgetAmount(document.getElementById('material-amount')?.value || 0),
    status:'계획',
  };

  if (item.quoteSelectedYn === 'Y' && !item.quoteNo) {
    showToast('견적선정유무가 Y이면 구매시스템 견적 데이터를 선택해 주세요.');
    return;
  }

  if (!item.itemCode || !item.categoryName || !item.standardName || !item.manufacturer || !item.model || !item.quantity || !item.amount) {
    showToast('물품정보 필수값과 견적 금액을 입력해 주세요.');
    return;
  }

  if (editing) {
    Object.assign(editing, item);
    showToast('재료비 계획이 수정되었습니다.');
  } else {
    rows.unshift(item);
    showToast('재료비 계획이 등록되었습니다.');
  }
  editingMaterialItemId = null;
  renderBudgetPage();
}

function editOtherMaterialExpense(id) {
  const row = getOtherMaterialRows().find(item => item.id === id);
  if (!row) return;
  if (row.actualized) {
    showToast('이미 실적이 발생한 기타재료비는 수정할 수 없습니다.');
    return;
  }
  editingOtherMaterialId = id;
  renderBudgetPage();
}

function cancelOtherMaterialEdit() {
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function saveOtherMaterialExpense() {
  const expectedMonth = document.getElementById('other-material-month')?.value || '';
  const amount = parseBudgetAmount(document.getElementById('other-material-amount')?.value || 0);
  const description = document.getElementById('other-material-desc')?.value || '';
  if (!expectedMonth || !amount || !description.trim()) {
    showToast('집행 예정월, 금액, 예산 설명을 입력해 주세요.');
    return;
  }

  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  if (editing?.actualized) {
    showToast('이미 실적이 발생한 기타재료비는 수정할 수 없습니다.');
    return;
  }
  if (editing) {
    Object.assign(editing, { expectedMonth, amount, description, status:'계획' });
    showToast('기타재료비 계획이 수정되었습니다.');
  } else {
    rows.unshift({ id:`om-${Date.now()}`, expectedMonth, amount, description, status:'계획' });
    showToast('기타재료비 계획이 등록되었습니다.');
  }
  editingOtherMaterialId = null;
  renderBudgetPage();
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const source = editing || {
    large:'솔루션',
    middle:'라이선스',
    small:'개발도구',
    model:'DEV-CLOUD-PRO',
    productDetail:materialQuoteTitle,
    quantity:1,
    unit:'식',
    revenueBasis:'월',
    deliveryStart:'2026-08-01',
    deliveryEnd:'2027-07-31',
    quoteNo:materialQuoteNo,
    amount:materialQuoteAmount,
  };
  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>상품재료비 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>상품재료비 계획 금액</span></div>
      <p>외주비 MA와 동일한 방식으로 견적 데이터를 불러오고, 분류/상품/손익인식 기준/납기 정보를 확정합니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 구매 견적 불러오기</div>
            <p>구매시스템에 수취된 재료비 견적을 선택해 기본 정보를 채웁니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="showToast('재료비 견적 데이터를 새로 조회했습니다.')">견적 새로고침</button>
        </div>
        <div class="os-quote-list compact">
          ${purchaseMaterialQuoteData.map(q => `
            <button class="os-quote-item" onclick="applyMaterialPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
              <strong>${q.quoteNo}</strong>
              <span>${q.title}</span>
              <b>${fmt(q.amount)}원</b>
              <em>수취 ${q.receivedAt}</em>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '상품재료비 수정' : '상품재료비 등록'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-ma-form">
          <label><span>대분류 *</span><input id="material-large" value="${source.large}"></label>
          <label><span>중분류 *</span><input id="material-middle" value="${source.middle}"></label>
          <label><span>소분류 *</span><input id="material-small" value="${source.small}"></label>
          <label><span>모델명</span><input id="material-model" value="${source.model || ''}"></label>
          <label class="wide"><span>제품상세</span><input id="material-product-detail" value="${source.productDetail || ''}"></label>
          <label><span>수량 *</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}"></label>
          <label><span>단위</span><input id="material-unit" value="${source.unit || '식'}"></label>
          <label><span>손익인식기준 *</span>
            <select id="material-revenue-basis">
              ${['월','분기','반기','연'].map(v => `<option ${source.revenueBasis === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
          <label><span>시작일 *</span><input id="material-start" type="date" value="${source.deliveryStart}"></label>
          <label><span>종료일 *</span><input id="material-end" type="date" value="${source.deliveryEnd}"></label>
          <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" readonly></label>
          <label><span>견적금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '상품재료비 등록'}</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head with-action">
          <span>대분류</span><span>중분류</span><span>소분류</span><span>모델명</span><span>제품상세</span><span>수량</span><span>단위</span><span>손익인식기준</span><span>시작일</span><span>종료일</span><span>견적/금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action ${editingMaterialItemId === row.id ? 'active' : ''}">
            <span>${row.large}</span><span>${row.middle}</span><span>${row.small}</span><span>${row.model || '-'}</span><span>${row.productDetail || '-'}</span><span>${row.quantity}</span><span>${row.unit || '-'}</span><span>${row.revenueBasis}</span><span>${row.deliveryStart}</span><span>${row.deliveryEnd}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function renderMaterialItemPanel() {
  const rows = getMaterialRows();
  const editing = editingMaterialItemId ? rows.find(row => row.id === editingMaterialItemId) : null;
  const defaultQuote = purchaseMaterialQuoteData.find(q => q.quoteNo === materialQuoteNo) || purchaseMaterialQuoteData[0] || {};
  const source = editing || {
    quoteSelectedYn: materialQuoteSelectedYn,
    itemNo: defaultQuote.itemNo || '10',
    itemCode: defaultQuote.itemCode || 'SW00014',
    categoryName: defaultQuote.categoryName || '소프트웨어-경영/인사',
    standardName: defaultQuote.standardName || 'HRMS(인사관리)',
    manufacturer: defaultQuote.manufacturer || '휴먼컨설팅그룹',
    model: defaultQuote.modelName || 'hunel',
    productDetail: defaultQuote.standardName || materialQuoteTitle,
    quantity: 1,
    unit: '식',
    revenueBasis: '월',
    deliveryStart: '2026-08-01',
    deliveryEnd: '2027-07-31',
    quoteNo: materialQuoteNo || defaultQuote.quoteNo || '',
    poNo: '',
    amount: materialQuoteAmount || defaultQuote.amount || 0,
  };
  const quoteYn = editing ? (editing.quoteSelectedYn || (editing.quoteNo ? 'Y' : 'N')) : materialQuoteSelectedYn;

  return `
    <div class="os-sub-summary ma">
      <div><strong>${rows.length}</strong><span>상품재료비 품목</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>상품재료비 계획 금액</span></div>
      <p>견적선정유무를 먼저 선택하고, Y인 경우 구매시스템 물품정보를 불러와 재료비 예산을 등록합니다. PO번호는 추후 구매 계약 확정 시 매핑됩니다.</p>
    </div>
    <div class="os-ma-grid">
      <div class="labor-card">
        <div class="labor-card-headline">
          <div>
            <div class="labor-card-title">1. 견적선정유무 선택</div>
            <p>Y를 선택하면 구매시스템에 수취된 물품정보를 조회해 입력값에 자동 세팅합니다.</p>
          </div>
          <button class="labor-sync-btn" onclick="showToast('구매시스템 재료비 견적 데이터를 새로 조회했습니다.')">견적 새로고침</button>
        </div>
        <div class="os-quote-decision-card ma-new-quote-panel">
          <div class="os-quote-choice-row">
            <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="Y" ${quoteYn === 'Y' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('Y')"><span>Y · 구매시스템 견적 사용</span></label>
            <label class="os-quote-yn"><input type="radio" name="material-quote-yn" value="N" ${quoteYn === 'N' ? 'checked' : ''} onchange="switchMaterialQuoteSelectedYn('N')"><span>N · 직접 입력</span></label>
          </div>
          ${quoteYn === 'Y' ? `
            <div class="os-quote-list compact ma-quote-choice">
              ${purchaseMaterialQuoteData.map(q => `
                <button class="os-quote-item ${source.quoteNo === q.quoteNo ? 'active' : ''}" onclick="applyMaterialPurchaseQuote('${q.quoteNo}', ${q.amount}, '${q.title}')">
                  <strong>${q.quoteNo}</strong>
                  <span>${q.itemNo} · ${q.itemCode} · ${q.categoryName}</span>
                  <b>${q.standardName}</b>
                  <em>${q.manufacturer} / ${q.modelName} · ${fmt(q.amount)}원</em>
                </button>
              `).join('')}
            </div>` : `
            <div class="bpo-rule-note">
              <strong>직접 입력</strong>
              <span>견적이 아직 확정되지 않은 단계입니다. 물품정보와 금액을 직접 입력하고 PO번호는 추후 매핑합니다.</span>
            </div>`}
        </div>
      </div>

      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '상품재료비 수정' : '상품재료비 등록'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelMaterialItemEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-ma-form">
          <label><span>항번</span><input id="material-item-no" value="${source.itemNo || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>품목코드 *</span><input id="material-item-code" value="${source.itemCode || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>분류명 *</span><input id="material-category-name" value="${source.categoryName || source.large || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>표준품명 *</span><input id="material-standard-name" value="${source.standardName || source.productDetail || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>제조사 *</span><input id="material-manufacturer" value="${source.manufacturer || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>모델명 *</span><input id="material-model" value="${source.model || source.modelName || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <input type="hidden" id="material-large" value="${source.large || source.categoryName || ''}">
          <input type="hidden" id="material-middle" value="${source.middle || ''}">
          <input type="hidden" id="material-small" value="${source.small || source.standardName || ''}">
          <input type="hidden" id="material-product-detail" value="${source.productDetail || source.standardName || ''}">
          <label><span>수량 *</span><input id="material-qty" inputmode="numeric" value="${source.quantity || 1}"></label>
          <label><span>단위</span><input id="material-unit" value="${source.unit || '식'}"></label>
          <label><span>손익인식기준</span>
            <select id="material-revenue-basis">
              ${['월','분기','반기','연'].map(v => `<option ${source.revenueBasis === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
          <label><span>예산 시작일</span><input id="material-start" type="date" value="${source.deliveryStart || ''}"></label>
          <label><span>예산 종료일</span><input id="material-end" type="date" value="${source.deliveryEnd || ''}"></label>
          <label><span>견적번호</span><input id="material-quote-no" value="${source.quoteNo || ''}" ${quoteYn === 'Y' ? 'readonly' : ''}></label>
          <label><span>PO번호</span><input id="material-po-no" value="${source.poNo || ''}" placeholder="추후 PO 매핑"></label>
          <label><span>견적/예산금액</span><input id="material-amount" inputmode="numeric" value="${source.amount || ''}"></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveMaterialItem()">${editing ? '수정 저장' : '상품재료비 등록'}</button>
        </div>
      </div>
    </div>

    <div class="os-ma-table-wrap">
      <div class="os-ma-table">
        <div class="os-ma-head with-action material-item-head">
          <span>견적</span><span>항번</span><span>품목코드</span><span>분류명</span><span>표준품명</span><span>제조사</span><span>모델명</span><span>수량</span><span>PO번호</span><span>견적/금액</span><span></span>
        </div>
        ${rows.map(row => `
          <div class="os-ma-row with-action material-item-row ${editingMaterialItemId === row.id ? 'active' : ''}">
            <span>${row.quoteSelectedYn || (row.quoteNo ? 'Y' : 'N')}</span><span>${row.itemNo || '-'}</span><span>${row.itemCode || '-'}</span><span>${row.categoryName || row.large || '-'}</span><span>${row.standardName || row.productDetail || '-'}</span><span>${row.manufacturer || '-'}</span><span>${row.model || '-'}</span><span>${row.quantity}</span><span>${row.poNo || '-'}</span><span><b>${row.quoteNo || '-'}</b><em>${fmt(row.amount)}원</em></span>
            <span class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editMaterialItem('${row.id}')">수정</button>`}</span>
          </div>
        `).join('') || '<div class="labor-empty">등록된 재료비 계획이 없습니다.</div>'}
      </div>
    </div>`;
}

function renderOtherMaterialPanel() {
  const rows = getOtherMaterialRows();
  const editing = editingOtherMaterialId ? rows.find(row => row.id === editingOtherMaterialId) : null;
  return `
    <div class="os-sub-summary">
      <div><strong>${rows.length}</strong><span>등록 건수</span></div>
      <div><strong>${fmt(rows.reduce((sum, row) => sum + row.amount, 0))}원</strong><span>기타재료비 계획</span></div>
      <p>이관, 임시 라이선스, 검수용 소모품처럼 품목 견적과 별도로 잡아야 하는 재료비 계획입니다.</p>
    </div>
    <div class="os-other-layout">
      <div class="labor-card">
        <div class="labor-flow-title">
          <strong>${editing ? '기타재료비 계획 수정' : '기타재료비 계획 입력'}</strong>
          ${editing ? '<button class="labor-sub-btn" onclick="cancelOtherMaterialEdit()">수정취소</button>' : ''}
        </div>
        <div class="labor-form os-other-form">
          <label><span>실적 집행 예정월</span><input id="other-material-month" type="month" value="${editing ? editing.expectedMonth : '2026-10'}"></label>
          <label><span>금액</span><input id="other-material-amount" inputmode="numeric" value="${editing ? editing.amount : ''}" placeholder="예: 6500000"></label>
          <label class="wide"><span>예산 설명</span><textarea id="other-material-desc" rows="4" placeholder="예: 타 프로젝트에서 이관, 검수용 임시 라이선스, 소모품 구매">${editing ? editing.description : ''}</textarea></label>
        </div>
        <div class="labor-actions">
          <button class="labor-main-btn" onclick="saveOtherMaterialExpense()">${editing ? '수정 저장' : '기타재료비 저장'}</button>
        </div>
      </div>
      <div class="os-registered-card">
        <div class="os-other-header with-action"><span>집행 예정월</span><span>금액</span><span>예산 설명</span><span>상태</span><span></span></div>
        <div>
          ${rows.map(row => `
            <div class="os-other-row with-action ${editingOtherMaterialId === row.id ? 'active' : ''}">
              <strong>${row.expectedMonth}</strong>
              <b>${fmt(row.amount)}원</b>
              <span>${row.description}</span>
              <i class="labor-status ${row.actualized ? 'done' : 'saved'}">${row.status}</i>
              <div class="labor-reg-actions">${row.actualized ? '<button disabled>수정불가</button>' : `<button onclick="editOtherMaterialExpense('${row.id}')">수정</button>`}</div>
            </div>
          `).join('') || '<div class="labor-empty">등록된 기타재료비 계획이 없습니다.</div>'}
        </div>
      </div>
    </div>`;
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('재료비 품목 등록', 'MA와 동일한 견적/품목/납기 방식으로 관리합니다.', renderMaterialItemPanel());
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
            <div class="setup-editor-sub">업체별 계약금액과 PO 매핑 상태를 관리합니다.</div>
          </div>
        </div>
        ${renderBpoOutsourcePanelFinal(data)}
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

  const personView = getLaborPersonView(person);
  const target = editing || {
    id: `lb-${Date.now()}`,
    personId: person.id,
    requestedAt: '',
    approvedAt: '',
    scmDocNo: '',
  };

  Object.assign(target, {
    name: personView.name,
    org: personView.org,
    role: personView.role,
    pLevel: person.pLevel,
    unitPrice: person.unitPrice,
    startDate,
    endDate,
    workType,
    monthly,
    totalMm: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0),
    amount: Object.values(monthly).reduce((s, v) => s + Number(v || 0), 0) * person.unitPrice,
    status: 'MM 입력중',
  });

  if (!editing) rows.unshift(target);
  selectedLaborAssignmentId = target.id;
  editingLaborAssignmentId = target.id;
  laborRegistrationMode = 'edit';
  persistBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  showToast('투입 기본정보가 저장되었습니다. 월별 MM을 입력해주세요.');
  renderBudgetPage();
}

function renderLaborAssignmentPanel(data) {
  const rows = getLaborRows();
  const formOpen = laborRegistrationMode === 'new' || laborRegistrationMode === 'edit';
  const selectedRaw = formOpen ? getSelectedLaborAssignment() : null;
  const selected = getLaborRowView(selectedRaw);
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const personRaw = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  const person = getLaborPersonView(personRaw);
  const query = laborSearchQuery.trim().toLowerCase();
  const candidates = laborCandidatePool
    .map(getLaborPersonView)
    .filter(p => !query || `${p.name} ${p.org} ${p.role} ${p.pLevel}`.toLowerCase().includes(query));
  const defaultStart = editing ? editing.startDate : '2026-07-01';
  const defaultEnd = editing ? editing.endDate : '2026-12-31';
  const defaultType = editing ? editing.workType : 'Full';
  const draftMonths = monthRangeByDate(defaultStart, defaultEnd).length;

  const registeredRows = rows.map(row => {
    const view = getLaborRowView(row);
    const isActive = selectedLaborAssignmentId === view.id;
    return `
      <div class="labor-reg-row ${isActive ? 'active' : ''}" onclick="selectLaborAssignment('${view.id}')">
        <div class="labor-reg-person">
          <strong>${view.name}</strong>
          <span>${view.org}</span>
        </div>
        <div>${view.role}</div>
        <div>${view.pLevel}</div>
        <div>${view.startDate} ~ ${view.endDate}</div>
        <div class="labor-reg-num">${view.totalMm || 0}MM</div>
        <div class="labor-reg-num">${fmt(view.amount || 0)}원</div>
        <div><i class="labor-status ${laborStatusClass(view.status)}">${getLaborStatusLabel(view.status)}</i></div>
        <div class="labor-reg-actions">
          <button onclick="event.stopPropagation();editLaborAssignment('${view.id}')">수정</button>
        </div>
      </div>`;
  }).join('');

  const monthInputs = selectedRaw
    ? Object.keys(selectedRaw.monthly || {}).map(month => `
      <label class="labor-mm-cell">
        <span>${month}</span>
        <input id="labor-mm-${selectedRaw.id}-${month}" type="number" min="0" max="1" step="0.1" value="${selectedRaw.monthly[month]}">
      </label>
    `).join('')
    : '';

  const selectedStatusClass = selectedRaw ? laborStatusClass(selectedRaw.status) : '';
  const canRequest = selectedRaw && selectedStatusClass === 'saved';
  const canApprove = selectedRaw && selectedStatusClass === 'wait';

  return `
    <div class="labor-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">등록 인력 현황</div>
        </div>
        <div class="labor-actions compact">
          <button class="labor-sub-btn labor-process-guide-btn" onclick="showLaborProcessGuide()">프로세스 안내</button>
          <button class="labor-main-btn" onclick="openNewLaborRegistration()">신규 인력 등록</button>
        </div>
      </div>

      <div class="labor-registered-card top">
        <div class="labor-reg-header">
          <span>인력</span><span>역할</span><span>P레벨</span><span>투입기간</span><span>총 MM</span><span>금액</span><span>상태</span><span></span>
        </div>
        <div class="labor-reg-list">${registeredRows || '<div class="labor-empty">등록된 인력이 없습니다.</div>'}</div>
      </div>

      ${formOpen ? `
        <div class="labor-edit-flow-card">
          <div class="labor-flow-title">
            <strong>${laborRegistrationMode === 'new' ? '신규 인력 등록' : '등록 인력 수정'}</strong>
            <button class="labor-sub-btn" onclick="cancelLaborEdit()">닫기</button>
          </div>
          <div class="labor-flow">
            <span>SCM 조회</span><span>인력선택</span><span>기본정보 저장</span><span>월별 MM</span><span>승인요청</span><span>승인완료</span>
          </div>

          ${renderLaborScmIfPanel(selectedRaw, selected, person)}

          <div class="labor-top-grid">
            <div class="labor-card labor-search-card">
              <div class="labor-card-headline">
                <div>
                  <div class="labor-card-title">1. 인력 선택</div>
                  <p>SCM 기준 인력 리스트에서 투입 대상을 선택합니다.</p>
                </div>
                <button class="labor-sync-btn" onclick="refreshLaborCandidatesFromScm()">SCM 실시간 조회</button>
              </div>
              <input class="labor-search-input" value="${laborSearchQuery}" placeholder="이름, 조직, 역할, P레벨 검색"
                oninput="updateLaborSearch(this.value)">
              <div class="labor-sync-note">${laborScmLastSyncedAt ? `최근 조회 ${laborScmLastSyncedAt}` : 'SCM 조회 버튼으로 최신 인력 리스트를 불러올 수 있습니다.'}</div>
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
              <div class="labor-summary labor-summary-basic">
                <div><span>P레벨</span><strong>${person ? person.pLevel : '-'}</strong></div>
                <div><span>단가</span><strong>${person ? fmt(person.unitPrice) : '-'}원</strong></div>
                <div><span>월 범위</span><strong>${draftMonths}개월</strong></div>
              </div>
              <div class="labor-mm-guide">
                <strong>총 MM / 금액은 4번 월별 MM 입력 후 자동 합산됩니다.</strong>
                <span>기본정보 저장 단계에서는 기간과 투입유형만 확정합니다.</span>
              </div>
              <div class="labor-actions">
                <button class="labor-main-btn" onclick="saveLaborAssignmentDraft()">${editing ? '기본정보 수정 저장' : '투입 기본정보 저장'}</button>
              </div>
            </div>
          </div>

          ${selectedRaw ? `
            <div class="labor-month-card">
              <div class="labor-month-head">
                <div>
                  <div class="labor-card-title">4. 월별 MM 입력 및 승인</div>
                  <div class="labor-selected">${selected.name} · ${selected.startDate} ~ ${selected.endDate} · ${selected.workType}</div>
                </div>
                <div class="labor-selected-total">
                  <small>월별 MM 합계</small>
                  <span>${selected.totalMm || 0}MM</span>
                  <strong>${fmt(selected.amount || 0)}원</strong>
                  <i class="labor-status ${selectedStatusClass}">${getLaborStatusLabel(selected.status)}</i>
                </div>
              </div>
              <div class="labor-mm-grid">${monthInputs}</div>
              <div class="labor-approval-line">
                <span class="${selectedStatusClass !== 'draft' ? 'on' : ''}">MM 저장</span>
                <span class="${['wait','done'].includes(selectedStatusClass) ? 'on' : ''}">SCM 전송</span>
                <span class="${selectedStatusClass === 'done' ? 'on' : ''}">승인완료</span>
                <em>${selected.scmDocNo || 'SCM 문서번호 미생성'}</em>
              </div>
              <div class="labor-actions right">
                <button class="labor-sub-btn" onclick="saveLaborMonthlyMm('${selected.id}')">월별 MM 저장</button>
                <button class="labor-main-btn" ${canRequest ? '' : 'disabled'} onclick="requestLaborApproval('${selected.id}')">승인요청</button>
                <button class="labor-main-btn teal" ${canApprove ? '' : 'disabled'} onclick="completeLaborScmApproval('${selected.id}')">SCM 승인완료 반영</button>
              </div>
            </div>` : ''}
        </div>` : ''}
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

function renderCategoryChoiceBoard(kind, tabs) {
  const label = kind === 'material' ? '재료비 상세 계정' : '외주비 상세 계정';
  return `
    <div class="cost-category-board">
      <div class="cost-category-board-head">
        <div>
          <strong>상세 계정 선택</strong>
          <span>${label}을 먼저 선택한 뒤 아래에서 계획을 등록하거나 수정합니다.</span>
        </div>
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
    { step:'01', label:'실투입 외주비', desc:'업체/계약/PO', active:outsourceKind === 'direct', action:"switchOutsourceKind('direct')" },
    { step:'02', label:'기타외주비', desc:'출장비/이관/기타', active:outsourceKind === 'other', action:"switchOutsourceKind('other')" },
    { step:'03', label:'MA', desc:'견적/납기/손익', active:outsourceKind === 'ma', action:"switchOutsourceKind('ma')" },
  ]);
}

function renderOutsourceShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">외주비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderOutsourceKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${title}</div>
        ${bodyHtml}
      </div>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적등록/납기', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'기타재료비', desc:'이관/임시/기타', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ]);
}

function renderMaterialShell(title, subtitle, bodyHtml) {
  return `
    <div class="outsource-panel material-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">재료비 등록 / 수정</div>
          <div class="labor-title">상세 계정 선택</div>
        </div>
        <div class="labor-actions compact">
          <span class="os-kind-caption">${subtitle}</span>
        </div>
      </div>
      ${renderMaterialKindTabs()}
      <div class="cost-selected-detail">
        <div class="cost-selected-title">${title}</div>
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

const renderOutsourceContractPanelWithSelector = renderOutsourceContractPanel;
renderOutsourceContractPanel = function(data) {
  const html = renderOutsourceContractPanelWithSelector(data);
  if (outsourceKind !== 'direct') return html;
  return html.replace(
    '<div class="os-registered-card">',
    '<div class="cost-selected-detail"><div class="cost-selected-title">실투입 외주비 계획 등록</div></div><div class="os-registered-card">'
  );
};

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺' || r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      if (inspectionPlan.length) {
        inspectionPlan.filter(plan => plan.month === mo.m).forEach(plan => {
          amount += plan.planAmount;
          nextDetails.push({
            type:'투입확정',
            vendor:row.vendorName,
            grade:plan.grade,
            amount:plan.planAmount,
            po:row.poNo,
            source:'outsourceContract',
          });
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function getOutsourceInspectionMonthSummary(planRows) {
  const grouped = {};
  planRows.forEach(row => {
    if (!row.month) return;
    if (!grouped[row.month]) {
      grouped[row.month] = { month: row.month, planMm: 0, planAmount: 0, count: 0 };
    }
    grouped[row.month].planMm += Number(row.planMm || 0);
    grouped[row.month].planAmount += Number(row.planAmount || 0);
    grouped[row.month].count += 1;
  });
  return Object.values(grouped)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => ({
      ...row,
      planMm: Math.round(row.planMm * 100) / 100,
    }));
}

function getOutsourceInspectionDetailRows(quoteNo, month, startDate, endDate) {
  const selected = getOutsourceRows().find(row => row.id === selectedOutsourceContractId);
  const savedRows = selected && selected.quoteNo === quoteNo && selected.inspectionPlan && selected.inspectionPlan.length
    ? selected.inspectionPlan
    : null;
  const rows = savedRows || getOutsourceInspectionRows(quoteNo, startDate, endDate);
  return rows.filter(row => row.month === month);
}

function showOutsourceInspectionMonthDetail(quoteNo, month, startDate, endDate) {
  const rows = getOutsourceInspectionDetailRows(quoteNo, month, startDate, endDate);
  const total = rows.reduce((sum, row) => sum + Number(row.planAmount || 0), 0);
  let modal = document.getElementById('outsource-inspection-month-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'outsource-inspection-month-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="actual-detail-modal os-inspection-detail-modal">
      <div class="actual-detail-head">
        <strong>${month} 검수계획 상세</strong>
        <button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-body">
        <div class="os-inspection-title">기술등급별 월별 검수금액 <em>합계 ${fmt(total)}원</em></div>
        <div class="os-inspection-table plan detail">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>월 MM</span><span>월별 검수금액</span><span>상태</span></div>
          ${rows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${Number(row.planMm || 0).toFixed(2)}</span><span>${fmt(row.planAmount)}원</span><span><b>${row.status}</b></span>
            </div>
          `).join('') || '<div class="os-inspection-empty">상세 내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span>${fmt(total)}원</span><span></span></div>
        </div>
      </div>
      <div class="actual-detail-actions">
        <button onclick="document.getElementById('outsource-inspection-month-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function renderOutsourceQuoteBreakdownPanel(quoteNo, startDate, endDate, generated, savedRows) {
  if (!quoteNo) {
    return `
      <div class="os-inspection-card muted">
        <div class="os-inspection-head">
          <div><strong>4. 견적 산출내역 / 검수계획</strong><span>견적번호를 선택하면 기술등급별 산출내역이 표시됩니다.</span></div>
        </div>
      </div>`;
  }
  const quoteRows = outsourceQuoteBreakdownData[quoteNo] || [];
  const planRows = savedRows || (generated ? getOutsourceInspectionRows(quoteNo, startDate, endDate) : []);
  const monthlyRows = getOutsourceInspectionMonthSummary(planRows);
  const totalQuote = quoteRows.reduce((sum, row) => sum + row.amount, 0);
  const totalPlan = monthlyRows.reduce((sum, row) => sum + row.planAmount, 0);
  return `
    <div class="os-inspection-card">
      <div class="os-inspection-head">
        <div>
          <strong>4. 견적 산출내역 / 월별 실투입(검수)계획</strong>
          <span>최종 검수계획은 검수월 기준 합계 1줄로 관리하고, 월 클릭 시 기술등급별 상세를 확인합니다.</span>
        </div>
        <div class="os-inspection-actions">
          <button class="labor-sub-btn" onclick="showOutsourceInspectionAdjustGuide()">검수 금액 보정</button>
          <button class="labor-main-btn" onclick="generateOutsourceInspectionPlanPreview()">실투입(검수)계획 생성</button>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">견적 산출내역 <em>Results : ${quoteRows.length}</em></div>
        <div class="os-inspection-table quote">
          <div class="os-inspection-row head"><span>업무구분</span><span>기술등급</span><span>투입시작일</span><span>투입종료일</span><span>투입MM</span><span>견적금액(VAT별도)</span></div>
          ${quoteRows.map(row => `
            <div class="os-inspection-row">
              <span>${row.workType}</span><span>${row.grade}</span><span>${row.startDate}</span><span>${row.endDate}</span><span>${row.mm.toFixed(3)}</span><span>${fmt(row.amount)}원</span>
            </div>
          `).join('') || '<div class="labor-empty">견적 산출내역이 없습니다.</div>'}
          <div class="os-inspection-row total"><span>합계</span><span></span><span></span><span></span><span></span><span>${fmt(totalQuote)}원</span></div>
        </div>
      </div>
      <div class="os-inspection-table-wrap">
        <div class="os-inspection-title">생성된 월별 실투입(검수)계획 <em>${generated || savedRows ? '월별 합계 / 구매 전송 예정' : '생성 전'}</em></div>
        ${generated || savedRows ? `
          <div class="os-inspection-table plan monthly-summary">
            <div class="os-inspection-row head"><span>검수월</span><span>월별 검수금액</span><span>상세건수</span><span>상태</span></div>
            ${monthlyRows.map(row => `
              <div class="os-inspection-row">
                <span><button class="os-month-link" onclick="showOutsourceInspectionMonthDetail('${quoteNo}','${row.month}','${startDate}','${endDate}')">${row.month}</button></span>
                <span>${fmt(row.planAmount)}원</span><span>${row.count}건</span><span><b>구매전송 대기</b></span>
              </div>
            `).join('')}
            <div class="os-inspection-row total"><span>합계</span><span>${fmt(totalPlan)}원</span><span></span><span>구매전송 대기</span></div>
          </div>` : '<div class="os-inspection-empty">실투입(검수)계획 생성 버튼을 누르면 검수월별 합계 계획이 생성됩니다.</div>'}
      </div>
    </div>`;
}

function syncOutsourceContractsToBudget(proj = currentBudgetProj) {
  const data = BUDGET_SOURCE[proj];
  if (!data) return;
  const account = '외주비';
  const completed = getOutsourceRows(proj).filter(r => r.status === '怨꾩빟?꾨즺' || r.status === '계약완료');
  data.months.filter(m => m.type === 'plan' && m[account]).forEach(mo => {
    const baseDetails = (mo[account].details || []).filter(d => d.source !== 'outsourceContract');
    let amount = 0;
    const nextDetails = [];
    completed.forEach(row => {
      const inspectionPlan = row.inspectionPlan && row.inspectionPlan.length
        ? row.inspectionPlan
        : getOutsourceInspectionRows(row.quoteNo, row.startDate, row.endDate);
      const monthlyRows = getOutsourceInspectionMonthSummary(inspectionPlan);
      const monthly = monthlyRows.find(plan => plan.month === mo.m);
      if (monthly) {
        amount += monthly.planAmount;
        nextDetails.push({
          type:'투입확정',
          vendor:row.vendorName,
          amount:monthly.planAmount,
          po:row.poNo,
          source:'outsourceContract',
        });
        return;
      }
      const months = monthRangeByDate(row.startDate, row.endDate);
      if (!months.includes(mo.m)) return;
      const monthlyAmount = Math.round(row.contractAmount / months.length);
      amount += monthlyAmount;
      nextDetails.push({
        type:'투입확정',
        vendor:row.vendorName,
        amount:monthlyAmount,
        po:row.poNo,
        source:'outsourceContract',
      });
    });
    mo[account].q = amount;
    mo[account].details = [...baseDetails, ...nextDetails];
  });
}

function openBudgetAccountEditor(account) {
  budgetSetupEditAccount = account;
  renderBudgetPage();
}

function closeBudgetAccountEditor() {
  budgetSetupEditAccount = null;
  editingLaborAssignmentId = null;
  renderBudgetPage();
}

function renderBudgetSetupOverview(data, actual, quasi) {
  const accounts = [
    { key:'인건비' },
    { key:'외주비' },
    { key:'재료비' },
    { key:'경비' },
  ];

  const totalBudget = accounts.reduce((sum, { key }) => sum + (data.plan[key] || 0), 0);
  const rows = accounts.map(({ key }) => {
    const budget = data.plan[key] || 0;
    return `
      <button class="setup-account-row ${budgetSetupEditAccount === key ? 'active' : ''}" onclick="openBudgetAccountEditor('${key}')">
        <span>${key}<b>›</b></span>
        <strong>${fmt(budget)}원</strong>
      </button>`;
  }).join('');
  const expanded = budgetSetupEditAccount
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(data, budgetSetupEditAccount)}</div>`
    : '';

  return `
    <div class="setup-overview compact">
      <div class="setup-version-pill">
        <strong>V1.0 2026-07-21</strong>
        <span>승인완료</span>
      </div>
      <div class="setup-simple-line">
        <button class="setup-total-row" onclick="showBudgetSummaryGrid()">
          <span>프로젝트 총 실행 비용 <b>›</b></span>
          <strong>${fmt(totalBudget)}원</strong>
        </button>
        <div class="setup-account-row-group">${rows}</div>
      </div>
      ${expanded}
    </div>`;
}

function renderBudgetAccountEditorOldC(data, account) {
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

  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">미래월 계획 금액만 간단히 수정합니다.</div>
        </div>
      </div>
      ${renderSimpleAccountPlanEditor(data, account)}
    </div>`;
}

function renderSimpleAccountPlanEditor(data, account) {
  const rows = data.months
    .map((mo, idx) => ({ mo, idx }))
    .filter(({ mo }) => mo.type === 'plan' && mo[account])
    .map(({ mo, idx }) => {
      const plan = mo[account].p || 0;
      const confirmed = mo[account].q || 0;
      const status = confirmed > 0 ? '투입확정 포함' : '계획';
      return `
        <tr>
          <td>${mo.m}</td>
          <td><input class="setup-plan-input" id="simple-plan-${idx}" value="${plan}" inputmode="numeric"></td>
          <td>${fmt(confirmed)}원</td>
          <td><span class="setup-status ${confirmed > 0 ? 'fixed' : ''}">${status}</span></td>
        </tr>`;
    }).join('');

  return `
    <div class="setup-plan-card">
      <table class="setup-plan-table">
        <thead>
          <tr>
            <th>월</th>
            <th>계획금액</th>
            <th>투입확정</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="setup-plan-actions">
        <button class="labor-main-btn" onclick="saveSimpleAccountPlan('${account}')">${account} 계획 저장</button>
      </div>
    </div>`;
}

function saveSimpleAccountPlan(account) {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  let changed = 0;
  let invalidMessage = '';
  data.months.forEach((mo, idx) => {
    if (mo.type !== 'plan' || !mo[account]) return;
    if (invalidMessage) return;
    const el = document.getElementById(`simple-plan-${idx}`);
    if (!el) return;
    const next = parseBudgetAmount(el.value);
    const confirmed = mo[account].q || 0;
    if (next < confirmed) {
      invalidMessage = `${mo.m} ${account} 계획은 투입확정 ${fmt(confirmed)}원보다 작을 수 없습니다.`;
      return;
    }
    if ((mo[account].p || 0) !== next) {
      mo[account].p = next;
      changed++;
    }
  });
  if (invalidMessage) {
    showToast(invalidMessage);
    return;
  }
  if (!changed) {
    showToast('변경된 계획 금액이 없습니다.');
    return;
  }
  persistBudgetPlanState();
  showToast(`${account} 계획 금액 ${changed}건이 저장되었습니다.`);
  renderBudgetPage();
}

function initBudgetStatus() {
  restoreBudgetTransferState();
  restoreBudgetPlanState();
  restoreBudgetLaborState();
  syncLaborAssignmentsToBudget(currentBudgetProj);
  document.getElementById('s-budget').innerHTML = `
    <div id="budget-body"></div>
  `;
  // 상세 모달 주입
  const m = document.createElement('div');
  m.className = 'budget-detail-overlay';
  m.id = 'budget-detail-overlay';
  m.onclick = e => { if(e.target===m) closeBudgetDetail(); };
  m.innerHTML = `
    <div class="budget-detail-modal">
      <div class="bdetail-head">
        <div class="bdetail-title" id="bdetail-title"></div>
        <div class="bdetail-right">
          <span class="bdetail-cat-tag" id="bdetail-cat"></span>
          <button class="bdetail-close" onclick="closeBudgetDetail()">닫기</button>
        </div>
      </div>
      <div class="bdetail-body" id="bdetail-body"></div>
    </div>`;
  document.body.appendChild(m);
}

// ════════════════════════════════════════
//  메인 렌더
// ════════════════════════════════════════

function buildBudgetProjectCards() {
  return Object.entries(BUDGET_PROJ_META).map(([k, m]) => {
    const src = Object.values(BUDGET_SOURCE).find(s => s.projName === m.name) ||
                Object.values(BUDGET_SOURCE)[Object.keys(BUDGET_PROJ_META).indexOf(k)];
    const budget  = m.budget;
    const spent   = m.spent;
    const remain  = Math.max(0, budget - spent);
    const rate    = budget > 0 ? Math.round(spent / budget * 100) : 0;
    const barColor = rate >= 90 ? '#dc2626' : rate >= 70 ? '#d97706' : '#1d4ed8';
    return `
      <div class="init-proj-card" onclick="openBudgetProjectScreen('${k}')" style="cursor:pointer">
        <div class="ipc-header">
          <div class="ipc-name">${m.name}</div>
          <span class="ipc-stage" style="${m.stageSt}">${m.stage}</span>
        </div>
        <div style="margin:12px 0 4px;font-size:12px;color:#64748b;display:flex;justify-content:space-between">
          <span>집행률</span><span style="font-weight:700;color:${barColor}">${rate}%</span>
        </div>
        <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:14px">
          <div style="height:100%;width:${rate}%;background:${barColor};border-radius:3px;transition:width .3s"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">총예산</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b">${fmt(budget)}원</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">집행액</div>
            <div style="font-size:13px;font-weight:700;color:#1d4ed8">${fmt(spent)}원</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">투입미정</div>
            <div style="font-size:13px;font-weight:700;color:${remain < budget*0.1 ? '#dc2626' : '#166534'}">${fmt(remain)}원</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:#94a3b8">${m.start} ~ ${m.end}</span>
          <span style="font-size:11px;padding:3px 8px;border-radius:20px;${m.riskSt}">${m.riskChip}</span>
        </div>
      </div>`;
  }).join('');
}

function renderBudgetListView() {
  const q = budgetSearchQuery.trim().toLowerCase();
  const customerQ = budgetCustomerQuery.trim().toLowerCase();
  const salesOrgQ = budgetSalesOrgQuery.trim().toLowerCase();
  const pmQ = budgetPmQuery.trim().toLowerCase();
  const entries = EXEC_BUDGET_PROJECTS.filter(p => {
    const matchText = !q || p.no.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    const matchType = !budgetTypeFilter || p.type === budgetTypeFilter;
    const matchStatus = !budgetStatusFilter || p.status === budgetStatusFilter;
    const matchCustomer = !customerQ || p.customer.toLowerCase().includes(customerQ);
    const matchSalesOrg = !salesOrgQ || p.salesOrg.toLowerCase().includes(salesOrgQ);
    const matchPm = !pmQ || p.pm.toLowerCase().includes(pmQ);
    return matchText && matchType && matchStatus && matchCustomer && matchSalesOrg && matchPm;
  });

  const typeOptions = ['', ...new Set(EXEC_BUDGET_PROJECTS.map(p => p.type))].map(v =>
    `<option value="${v}" ${v===budgetTypeFilter?'selected':''}>${v || '전체'}</option>`
  ).join('');
  const statusOptions = ['', ...new Set(EXEC_BUDGET_PROJECTS.map(p => p.status))].map(v =>
    `<option value="${v}" ${v===budgetStatusFilter?'selected':''}>${v || '전체'}</option>`
  ).join('');

  const rows = entries.map(p => {
    return `
      <tr onclick="openBudgetProjectScreen('${p.key}')">
        <td class="eb-no">${p.no}</td>
        <td><div class="pt-name">${p.name}</div></td>
        <td class="pt-center"><span class="exec-chip type-${execTypeClass(p.type)}">${p.type}</span></td>
        <td class="pt-center"><span class="exec-chip status-${execStatusClass(p.status)}">${p.status}</span></td>
        <td class="pt-center">${p.pm}</td>
        <td class="pt-center">${p.salesOrg}</td>
        <td class="pt-center">${p.customer || ''}</td>
        <td class="pt-center">${p.period}</td>
      </tr>`;
  }).join('');

  const noResult = entries.length === 0
    ? `<tr><td colspan="8"><div class="proj-no-result">검색 결과가 없습니다.</div></td></tr>` : '';

  document.getElementById('budget-body').innerHTML = `
    <div class="exec-budget-page">
      <div class="exec-budget-title"><span class="exec-title-dot"></span>실행예산</div>
      <div class="exec-filter-panel">
        <label class="exec-filter-field exec-filter-code">
          <span>프로젝트 번호/명</span>
          <input type="text" value="${budgetSearchQuery}"
            oninput="budgetSearchQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>프로젝트 유형</span>
          <select onchange="budgetTypeFilter=this.value;renderBudgetListView()">${typeOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>프로젝트 상태</span>
          <select onchange="budgetStatusFilter=this.value;renderBudgetListView()">${statusOptions}</select>
        </label>
        <label class="exec-filter-field">
          <span>고객사</span>
          <input type="text" value="${budgetCustomerQuery}"
            oninput="budgetCustomerQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>매출귀속조직</span>
          <input type="text" value="${budgetSalesOrgQuery}"
            oninput="budgetSalesOrgQuery=this.value;renderBudgetListView()">
        </label>
        <label class="exec-filter-field">
          <span>수행PM</span>
          <input type="text" value="${budgetPmQuery}"
            oninput="budgetPmQuery=this.value;renderBudgetListView()">
        </label>
        <div class="exec-filter-actions">
          <button class="exec-reset-btn" onclick="resetBudgetListFilters()" title="초기화">↻</button>
          <button class="exec-search-btn" onclick="renderBudgetListView()">검색</button>
        </div>
      </div>
      <div class="exec-list-head">
        <div class="exec-total">총 <strong>${fmt(40624)}</strong> 건</div>
        <div class="exec-actions">
          <button class="exec-text-btn">엑셀</button>
          <button class="exec-primary-btn">프로젝트 등록</button>
          <button class="exec-icon-btn">＋</button>
        </div>
      </div>
    </div>
    <div class="proj-table-card exec-table-card">
      <table class="proj-table exec-budget-table">
        <thead>
          <tr>
            <th class="pt-center">프로젝트번호</th>
            <th>프로젝트명</th>
            <th class="pt-center">프로젝트유형</th>
            <th class="pt-center">상태</th>
            <th class="pt-center">수행PM</th>
            <th class="pt-center">매출귀속조직</th>
            <th class="pt-center">고객사</th>
            <th class="pt-center">프로젝트기간</th>
          </tr>
        </thead>
        <tbody>${rows || noResult}</tbody>
      </table>
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

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const planTot  = CATS.reduce((o,c)=>({...o,[c]:calcPlanTotal(data,c)}),{});
  const planQ    = CATS.reduce((o,c)=>({...o,[c]:calcPlanQuasi(data,c)}),{});
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const projOpts = Object.entries(BUDGET_SOURCE).map(([k,v])=>
    `<option value="${k}" ${k===currentBudgetProj?'selected':''}>${v.projName}</option>`
  ).join('');

  const detailTable = `
    <div class="budget-process-head">
      <button class="budget-process-back" onclick="budgetDetailStep='overview';budgetSetupEditAccount=null;renderBudgetPage()">← 예산 집행 현황</button>
      <div>
        <div class="budget-process-title">상세 예산 수립</div>
        <div class="budget-process-sub">인건비, 외주비, 재료비, 경비의 핵심 현황만 확인하고 필요한 계정만 수정합니다.</div>
      </div>
    </div>

    ${budgetSetupEditAccount
      ? renderBudgetAccountEditor(data, budgetSetupEditAccount)
      : renderBudgetSetupOverview(data, actual, quasi)}`;

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='overview';renderBudgetPage()">← 목록으로</button>

    ${renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage)}

    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">계정별 집행 현황 확인 후 월별 실행예산 상세를 수립합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : detailTable}
  `;
}

// ── 총합 예산 배너 (컴팩트 가로형) ──
function renderTotalBudgetBar(budget, actual, quasi, remain, projName='', dplus=0, stage='') {
  const rate     = budget > 0 ? (actual / budget * 100).toFixed(1) : 0;
  const quaRate  = budget > 0 ? (quasi  / budget * 100).toFixed(1) : 0;
  const rateColor = rate >= 90 ? '#dc2626' : rate >= 70 ? '#d97706' : '#1d4ed8';

  // 프로그레스바 너비 (실집행 + 투입확정 합산이 100% 초과 안 하도록 클램프)
  const actW = Math.min(parseFloat(rate),   100);
  const quaW = Math.min(parseFloat(quaRate), 100 - actW);

  return `
    <div class="tbb-card">
      <!-- 상단: 타이틀 -->
      <div class="tbb-top">
        <div class="tbb-top-left">
          <div class="tbb-proj-info">
            <span class="tbb-proj-name">${projName}</span>
            <span class="tbb-stage-badge">${stage}</span>
            <span class="tbb-dplus">D+${dplus}일</span>
          </div>
        </div>
      </div>

      <!-- 하단: 4개 지표 + 프로그레스바 + 집행률 -->
      <div class="tbb-body">
        <div class="tbb-metrics">
          <div class="tbb-metric">
            <span class="tbb-mlabel">계획예산</span>
            <span class="tbb-mval">${fmt(budget)}<span class="tbb-unit">원</span></span>
          </div>
          <div class="tbb-arrow">→</div>
          <div class="tbb-metric tbb-metric-act">
            <span class="tbb-mlabel">실집행</span>
            <span class="tbb-mval tbb-act">${fmt(actual)}<span class="tbb-unit">원</span></span>
          </div>
          <div class="tbb-metric tbb-metric-qua">
            <span class="tbb-mlabel">투입확정</span>
            <span class="tbb-mval tbb-qua">${fmt(quasi)}<span class="tbb-unit">원</span></span>
          </div>
          <div class="tbb-metric tbb-metric-rem">
            <span class="tbb-mlabel">투입미정</span>
            <span class="tbb-mval tbb-rem">${fmt(Math.max(remain,0))}<span class="tbb-unit">원</span></span>
          </div>
        </div>
        <div class="tbb-right">
          <div class="tbb-rate-num" style="color:${rateColor}">${rate}<span class="tbb-rate-pct">%</span></div>
          <div class="tbb-rate-label">실적집행률</div>
        </div>
      </div>

      <!-- 프로그레스바 -->
      <div class="tbb-bar-wrap">
        <div class="tbb-bar-fill tbb-bar-act" style="width:${actW}%"></div>
        <div class="tbb-bar-fill tbb-bar-qua" style="width:${quaW}%"></div>
      </div>
      <div class="tbb-bar-legend">
        <span><span class="tbb-dot tbb-dot-act"></span>실집행 ${rate}%</span>
        <span><span class="tbb-dot tbb-dot-qua"></span>투입확정 ${quaRate}%</span>
      </div>
    </div>`;
}

// ── 계정별 예산 이관현황 테이블 ──
function renderAccountTransferTable(data, actual, quasi, remain) {
  const ACCT_LABELS = ['인건비', '외주비', '재료비', '경비'];
  const transfer = data.transfer || {};

  const rows = ACCT_LABELS.map(acct => {
    const init     = data.plan[acct] || 0;
    const tr       = transfer[acct] || 0;
    const adjusted = init + tr;
    const act      = actual[acct]  || 0;
    const qua      = quasi[acct]   || 0;
    const rem      = adjusted - act - qua;

    const trSign   = tr > 0 ? '+' : '';
    const trColor  = tr > 0 ? '#16a34a' : tr < 0 ? '#dc2626' : '#94a3b8';
    const trVal    = tr !== 0
      ? `<span style="color:${trColor};font-weight:600">${trSign}${fmt(tr)}</span>`
      : `<span style="color:#94a3b8">—</span>`;

    const remColor = rem < 0 ? '#dc2626' : '#1e293b';

    const isExpense = acct === '경비';
    const rowExtra  = isExpense
      ? ` class="actr-row actr-row-clickable" onclick="showExpenseDetailModal(${act + qua})" title="경비 소계정 상세 조회"`
      : ` class="actr-row"`;
    const labelExtra = isExpense
      ? `<span class="actr-expense-hint">상세 ▾</span>`
      : '';

    return `
      <tr${rowExtra}>
        <td class="actr-td actr-label">${acct}${labelExtra}</td>
        <td class="actr-td actr-num">${fmt(init)}</td>
        <td class="actr-td actr-num actr-transfer">${trVal}</td>
        <td class="actr-td actr-num actr-adjusted">${fmt(adjusted)}</td>
        <td class="actr-td actr-num">${fmt(act)}</td>
        <td class="actr-td actr-num actr-quasi">${fmt(qua)}</td>
        <td class="actr-td actr-num" style="color:${remColor}">${fmt(Math.max(rem,0))}</td>
      </tr>`;
  }).join('');

  // 합계 행
  const sumInit     = ACCT_LABELS.reduce((s,c) => s+(data.plan[c]||0), 0);
  const sumTr       = ACCT_LABELS.reduce((s,c) => s+(transfer[c]||0), 0);
  const sumAdj      = sumInit + sumTr;
  const sumAct      = ACCT_LABELS.reduce((s,c) => s+(actual[c]||0), 0);
  const sumQua      = ACCT_LABELS.reduce((s,c) => s+(quasi[c]||0), 0);
  const sumRem      = sumAdj - sumAct - sumQua;
  const sumTrSign   = sumTr > 0 ? '+' : '';
  const sumTrColor  = sumTr > 0 ? '#16a34a' : sumTr < 0 ? '#dc2626' : '#94a3b8';

  return `
    <div class="actr-wrap">
      <div class="actr-header">
        <span class="actr-title">계정별 예산 집행 현황</span>
        <span class="actr-notice">ℹ️ 계정 간 예산 이관이 가능합니다. 초기배분은 참고치이며 조정배분이 실질 기준입니다.</span>
      </div>
      <div class="actr-table-wrap">
        <table class="actr-table">
          <thead>
            <tr>
              <th class="actr-th actr-th-label">계정</th>
              <th class="actr-th actr-th-num">초기배분(Cost)</th>
              <th class="actr-th actr-th-num actr-th-transfer">이관(+/-)</th>
              <th class="actr-th actr-th-num actr-th-adjusted">조정배분</th>
              <th class="actr-th actr-th-num">실집행</th>
              <th class="actr-th actr-th-num">투입확정</th>
              <th class="actr-th actr-th-num">투입미정</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="actr-sum-row">
              <td class="actr-td actr-label" style="font-weight:700">합 계</td>
              <td class="actr-td actr-num">${fmt(sumInit)}</td>
              <td class="actr-td actr-num actr-transfer">
                ${sumTr !== 0
                  ? `<span style="color:${sumTrColor};font-weight:700">${sumTrSign}${fmt(sumTr)}</span>`
                  : `<span style="color:#94a3b8">—</span>`}
              </td>
              <td class="actr-td actr-num actr-adjusted" style="font-weight:700">${fmt(sumAdj)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(sumAct)}</td>
              <td class="actr-td actr-num actr-quasi" style="font-weight:700">${fmt(sumQua)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(Math.max(sumRem,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="actr-transfer-log">
        <span class="actr-log-title">📋 이관 내역</span>
        ${ACCT_LABELS.filter(c => (transfer[c]||0) !== 0).map(c => {
          const v = transfer[c];
          const sign = v > 0 ? '+' : '';
          const color = v > 0 ? '#16a34a' : '#dc2626';
          const dir = v > 0 ? '← 이관 수취' : '→ 이관 지급';
          return `<span class="actr-log-chip" style="color:${color};border-color:${color}">${c} <strong>${sign}${fmt(v)}</strong> <span class="actr-log-dir">${dir}</span></span>`;
        }).join('')}
        ${ACCT_LABELS.every(c => (transfer[c]||0) === 0)
          ? '<span style="color:#94a3b8;font-size:13px">이관 내역 없음</span>' : ''}
      </div>
    </div>`;
}

// ── KPI 카드 ──
function renderAccountTransferTable(data, actual, quasi, remain) {
  const ACCT_LABELS = BUDGET_ACCT_LABELS;
  const transfer = data.transfer || {};

  const rows = ACCT_LABELS.map((acct, idx) => {
    const init = data.plan[acct] || 0;
    const tr = transfer[acct] || 0;
    const adjusted = init + tr;
    const act = actual[acct] || 0;
    const qua = quasi[acct] || 0;
    const min = act + qua;
    const rem = adjusted - min;
    const trSign = tr > 0 ? '+' : '';
    const trColor = tr > 0 ? '#16a34a' : tr < 0 ? '#dc2626' : '#94a3b8';
    const trVal = tr !== 0
      ? `<span style="color:${trColor};font-weight:700">${trSign}${fmt(tr)}</span>`
      : `<span style="color:#94a3b8">-</span>`;
    const adjustedCell = budgetTransferEditMode
      ? `<input class="actr-edit-input" id="actr-adjust-${idx}" value="${adjusted}" inputmode="numeric">`
      : fmt(adjusted);
    const rowExtra = acct === '경비' && !budgetTransferEditMode
      ? ` class="actr-row actr-row-clickable" onclick="showExpenseDetailModal(${min})" title="경비 회계별 상세 조회"`
      : ` class="actr-row"`;
    const labelExtra = acct === '경비' && !budgetTransferEditMode
      ? `<span class="actr-expense-hint">상세</span>`
      : '';

    return `
      <tr${rowExtra}>
        <td class="actr-td actr-label">${acct}${labelExtra}</td>
        <td class="actr-td actr-num">${fmt(init)}</td>
        <td class="actr-td actr-num actr-transfer">${trVal}</td>
        <td class="actr-td actr-num actr-adjusted">${adjustedCell}${budgetTransferEditMode ? `<div class="actr-min-hint">최소 ${fmt(min)}</div>` : ''}</td>
        <td class="actr-td actr-num">${fmt(act)}</td>
        <td class="actr-td actr-num actr-quasi">${fmt(qua)}</td>
        <td class="actr-td actr-num" style="color:${rem < 0 ? '#dc2626' : '#1e293b'}">${fmt(Math.max(rem, 0))}</td>
      </tr>`;
  }).join('');

  const sumInit = ACCT_LABELS.reduce((s,c) => s + (data.plan[c] || 0), 0);
  const sumTr = ACCT_LABELS.reduce((s,c) => s + (transfer[c] || 0), 0);
  const sumAdj = sumInit + sumTr;
  const sumAct = ACCT_LABELS.reduce((s,c) => s + (actual[c] || 0), 0);
  const sumQua = ACCT_LABELS.reduce((s,c) => s + (quasi[c] || 0), 0);
  const sumRem = sumAdj - sumAct - sumQua;
  const sumTrSign = sumTr > 0 ? '+' : '';
  const sumTrColor = sumTr > 0 ? '#16a34a' : sumTr < 0 ? '#dc2626' : '#94a3b8';
  const history = budgetTransferHistory[currentBudgetProj] || [];
  const actionButtons = budgetTransferEditMode
    ? `<div class="actr-actions">
        <button class="actr-cancel-btn" onclick="cancelBudgetTransferEdit()">취소</button>
        <button class="actr-save-btn" onclick="saveBudgetTransfer()">저장</button>
      </div>`
    : `<button class="actr-edit-btn" onclick="startBudgetTransferEdit()">예산 이관 수정</button>`;

  const transferLog = ACCT_LABELS.filter(c => (transfer[c] || 0) !== 0).map(c => {
    const v = transfer[c];
    const sign = v > 0 ? '+' : '';
    const color = v > 0 ? '#16a34a' : '#dc2626';
    const dir = v > 0 ? '수취' : '지급';
    return `<span class="actr-log-chip" style="color:${color};border-color:${color}">${c} <strong>${sign}${fmt(v)}</strong> <span class="actr-log-dir">${dir}</span></span>`;
  }).join('');

  const selectedHistory = history.find(h => h.version === budgetHistorySelectedVersion) || history[0];
  const historyRows = history.length
    ? `
      <div class="actr-history-tabs">
        ${history.map(h => `
          <button class="actr-history-tab ${selectedHistory && h.version === selectedHistory.version ? 'active' : ''}"
            onclick="selectBudgetHistoryVersion(${h.version})">
            <span class="actr-tab-version">v${h.version}</span>
            <span class="actr-tab-meta">${h.changedBy}</span>
            <span class="actr-tab-date">${h.changedAt}</span>
          </button>
        `).join('')}
      </div>
      <div class="actr-history-panel">
        <div class="actr-history-panel-head">
          <span class="actr-version">v${selectedHistory.version}</span>
          <strong>${selectedHistory.changedBy}</strong>
          <span>${selectedHistory.changedAt}</span>
        </div>
        <div class="actr-history-change-table">
          <div class="actr-hrow actr-hhead">
            <span>계정</span><span>변경 전</span><span>변경 후</span><span>증감</span>
          </div>
          ${selectedHistory.changes.map(c => {
            const diffSign = c.diff > 0 ? '+' : '';
            const diffColor = c.diff > 0 ? '#16a34a' : '#dc2626';
            return `
              <div class="actr-hrow">
                <span class="actr-hacct">${c.acct}</span>
                <span>${fmt(c.oldAdjusted)}</span>
                <span>${fmt(c.newAdjusted)}</span>
                <span style="color:${diffColor};font-weight:900">${diffSign}${fmt(c.diff)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`
    : `<div class="actr-history-empty">아직 저장된 이관 변경 이력이 없습니다.</div>`;

  return `
    <div class="actr-wrap">
      <div class="actr-header">
        <div>
          <span class="actr-title">계정별 예산 집행 현황</span>
          <div class="actr-rule">PM은 총액 내에서 계정 간 예산을 이관할 수 있으며, 조정배분은 실집행+투입확정보다 작을 수 없습니다.</div>
        </div>
        ${actionButtons}
      </div>
      <div class="actr-cost-guide">
        <div>
          <strong>총액 변경이 필요하다면?</strong>
          <span>이 화면에서는 총액 내 계정 간 이관만 가능합니다. 프로젝트 전체 Cost가 바뀌는 경우 AI PMO로 돌아가 Cost 산정부터 다시 진행해야 합니다.</span>
        </div>
        <button class="actr-cost-guide-btn" onclick="showBudgetCostGuide()">AI PMO Cost 재산정</button>
      </div>
      <div class="actr-table-wrap">
        <table class="actr-table">
          <thead>
            <tr>
              <th class="actr-th actr-th-label">계정</th>
              <th class="actr-th actr-th-num">초기배분(Cost)</th>
              <th class="actr-th actr-th-num actr-th-transfer">이관(+/-)</th>
              <th class="actr-th actr-th-num actr-th-adjusted">조정배분</th>
              <th class="actr-th actr-th-num">실집행</th>
              <th class="actr-th actr-th-num">투입확정</th>
              <th class="actr-th actr-th-num">투입미정</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="actr-sum-row">
              <td class="actr-td actr-label" style="font-weight:700">합계</td>
              <td class="actr-td actr-num">${fmt(sumInit)}</td>
              <td class="actr-td actr-num actr-transfer">${sumTr !== 0 ? `<span style="color:${sumTrColor};font-weight:700">${sumTrSign}${fmt(sumTr)}</span>` : `<span style="color:#94a3b8">-</span>`}</td>
              <td class="actr-td actr-num actr-adjusted" style="font-weight:700">${fmt(sumAdj)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(sumAct)}</td>
              <td class="actr-td actr-num actr-quasi" style="font-weight:700">${fmt(sumQua)}</td>
              <td class="actr-td actr-num" style="font-weight:700">${fmt(Math.max(sumRem,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${budgetTransferEditMode ? `<div class="actr-edit-guide">조정배분 금액을 수정한 뒤 저장하세요. 합계는 ${fmt(sumInit)}원으로 유지되어야 합니다.</div>` : ''}
      <div class="actr-transfer-log">
        <span class="actr-log-title">이관 내역</span>
        ${transferLog || '<span style="color:#94a3b8;font-size:13px">이관 내역 없음</span>'}
      </div>
      <div class="actr-history">
        <div class="actr-history-title">버전 변경 히스토리</div>
        ${historyRows}
      </div>
    </div>`;
}

function kpiCard(title, budget, actual, quasi, remain, isTotal=false, extraBtn='') {
  const tc = isTotal ? ' total-card' : '';
  const rate = budget > 0 ? (actual / budget * 100).toFixed(1) : 0;
  const rateColor = rate >= 90 ? '#dc2626' : rate >= 70 ? '#d97706' : '#1d4ed8';
  const rateZero  = rate == 0;
  const bigEl = `
    <div class="bkpi-rate-wrap">
      <span class="bkpi-rate-label">실적집행률</span>
      <span class="bkpi-total${rateZero?' zero':''}" style="${rateZero?'':'color:'+rateColor}">${rate}%</span>
    </div>`;
  return `
    <div class="budget-kpi-card${tc}">
      <div class="bkpi-header">
        <span class="bkpi-title">${title}</span>
        ${extraBtn}
      </div>
      <div class="bkpi-rows">
        <div class="bkpi-row"><span class="bkpi-row-label">계획예산</span><span class="bkpi-row-val">${fmt(budget)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">실적</span><span class="bkpi-row-val">${fmt(actual)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">투입확정</span><span class="bkpi-row-val quasi">${fmt(quasi)}원</span></div>
        <div class="bkpi-row"><span class="bkpi-row-label">투입미정</span><span class="bkpi-row-val remain">${fmt(Math.max(remain,0))}원</span></div>
      </div>
      <hr class="bkpi-divider">
      ${bigEl}
    </div>`;
}

// ── 경비 소계정 상세 모달 ──
function showExpenseDetailModal(expTotal) {
  const CATS = [
    { key:'비통제',   ratio:0.35, color:'#ef4444', bg:'#fee2e2', desc:'통제 불가 발생 비용' },
    { key:'통제',     ratio:0.30, color:'#3b82f6', bg:'#dbeafe', desc:'절감 가능 관리 비용' },
    { key:'인비례성', ratio:0.22, color:'#8b5cf6', bg:'#ede9fe', desc:'인력 규모 비비례 비용' },
    { key:'WLB',      ratio:0.13, color:'#10b981', bg:'#d1fae5', desc:'구성원 복지 관련 비용' },
  ];

  // 마지막 항목에 나머지 금액 배분 (반올림 오차 처리)
  let rem = expTotal;
  const items = CATS.slice(0,-1).map(c => {
    const v = Math.round(expTotal * c.ratio);
    rem -= v;
    return { ...c, v };
  });
  items.push({ ...CATS[CATS.length-1], v: Math.max(0, rem) });

  const rows = items.map(({key, color, bg, desc, v}) => {
    const pct = expTotal > 0 ? (v / expTotal * 100).toFixed(0) : 0;
    return `
      <div class="expm-row">
        <div class="expm-name-wrap">
          <span class="expm-cat-badge" style="background:${bg};color:${color}">${key}</span>
          <span class="expm-desc">${desc}</span>
        </div>
        <div class="expm-bar-bg">
          <div class="expm-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="expm-pct" style="color:${color}">${pct}%</span>
        <span class="expm-val">${fmt(v)}원</span>
      </div>`;
  }).join('');

  let modal = document.getElementById('expense-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'expense-detail-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="expm-box">
      <div class="expm-header">
        <div>
          <div class="expm-title">경비 소계정 상세</div>
          <div class="expm-total">총 집행액 ${fmt(expTotal)}원</div>
        </div>
        <button class="expm-close" onclick="document.getElementById('expense-detail-modal').classList.remove('open')">✕</button>
      </div>
      <div class="expm-body">${rows}</div>
    </div>`;
  modal.classList.add('open');
}

// ── 외부 시스템 바로가기 팝업 ──
function showExtLink(label, sysFullName) {
  let modal = document.getElementById('extlink-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'extlink-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="aipmo-link-box">
      <div class="aipmo-link-icon">🔗</div>
      <div class="aipmo-link-msg">
        <strong>${sysFullName}</strong> 바로가기입니다.<br>
        해당 시스템으로 연결됩니다.
      </div>
      <button class="aipmo-link-close" onclick="document.getElementById('extlink-modal').classList.remove('open')">확인</button>
    </div>`;
  modal.classList.add('open');
}

// ── 5Tier 모달 ──
function showLaborProcessGuide() {
  let modal = document.getElementById('labor-process-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'labor-process-guide-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="labor-process-guide-modal">
      <div class="labor-process-guide-head">
        <div>
          <span>인건비 등록 프로세스</span>
          <strong>SCM 연동 기준으로 인력 투입 계획을 확정합니다</strong>
        </div>
        <button onclick="document.getElementById('labor-process-guide-modal').classList.remove('open')">×</button>
      </div>
      <div class="labor-process-guide-body">
        <div class="labor-process-guide-flow">
          <div><i>1</i><b>SCM 인력 조회</b><em>SCM 기준 인력 리스트를 실시간으로 불러오고 투입 대상을 선택합니다.</em></div>
          <div><i>2</i><b>투입 기본정보 저장</b><em>투입 시작일, 종료일, Full/Part 여부를 입력합니다. P레벨과 단가는 HR/SCM 기준 정보를 사용합니다.</em></div>
          <div><i>3</i><b>월별 MM 입력</b><em>저장된 투입 기간 기준으로 월별 MM이 열리고, PM이 계획 MM을 입력합니다.</em></div>
          <div><i>4</i><b>SCM 결재요청</b><em>월별 MM 저장 후 승인요청을 누르면 SCM으로 결재 요청 데이터가 전송됩니다.</em></div>
          <div><i>5</i><b>SCM 확정 반영</b><em>SCM에서 승인 완료되면 실행예산의 투입확정 금액으로 반영됩니다.</em></div>
        </div>
        <div class="labor-process-guide-rules">
          <strong>확정 룰</strong>
          <p>SCM 확정 전 데이터는 계획 상태이며, 변경 시 다시 저장 후 SCM 결재요청을 진행합니다.</p>
          <p>SCM 확정 완료된 투입 건만 예산 집행/잔여예산 계산의 투입확정 금액으로 반영합니다.</p>
          <p>실적이 발생한 과거월은 수정하지 않고, 미래월 계획 MM 중심으로 조정합니다.</p>
        </div>
      </div>
      <div class="labor-process-guide-actions">
        <button class="budget-cost-secondary" onclick="document.getElementById('labor-process-guide-modal').classList.remove('open')">닫기</button>
        <button class="budget-cost-primary" onclick="showExtLink('AI SCM','AI SCM 시스템')">SCM 바로가기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function showBudgetCostGuide() {
  const data = BUDGET_SOURCE[currentBudgetProj] || {};
  let modal = document.getElementById('budget-cost-guide-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'budget-cost-guide-modal';
    modal.className = 'aipmo-link-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="budget-cost-guide-modal">
      <div class="budget-cost-guide-head">
        <span>AI PMO</span>
        <button onclick="document.getElementById('budget-cost-guide-modal').classList.remove('open')">×</button>
      </div>
      <div class="budget-cost-guide-body">
        <strong>총액 변경은 Cost 재산정 프로세스로 진행합니다.</strong>
        <p>계정별 이관은 현재 총액 안에서만 가능합니다. 인력, 외주, 재료, 기간 변경으로 프로젝트 총액이 달라지면 AI PMO에서 Cost를 다시 산정한 뒤 실행예산으로 재반영해야 합니다.</p>
        <div class="budget-cost-guide-project">
          <span>대상 프로젝트</span>
          <b>${data.projNo || '-'} ${data.projName || ''}</b>
        </div>
        <div class="budget-cost-guide-steps">
          <div><span>1</span><b>AI PMO 복귀</b><em>변경 사유와 기준 정보를 확인</em></div>
          <div><span>2</span><b>Cost 재산정</b><em>총액, 계정별 배분, 기간 기준 재계산</em></div>
          <div><span>3</span><b>실행예산 재수립</b><em>승인된 Cost 기준으로 예산 상세 재작성</em></div>
        </div>
      </div>
      <div class="budget-cost-guide-actions">
        <button class="budget-cost-secondary" onclick="document.getElementById('budget-cost-guide-modal').classList.remove('open')">현재 화면 유지</button>
        <button class="budget-cost-primary" onclick="showExtLink('AI PMO','AI PMO Cost 산정')">AI PMO로 이동</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function show5Tier() {
  let overlay = document.getElementById('fivetier-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fivetier-overlay';
    overlay.className = 'fivetier-overlay';
    overlay.onclick = e => { if (e.target === overlay) close5Tier(); };
    document.body.appendChild(overlay);
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  const projName = data ? data.projName : '';

  // 5tier 구성 (stub — 기준 확정 후 실데이터 연결 예정)
  const tiers = [
    { no:'1', tier:'정직원',  구분:'인건비', budgetNote:'계획 기준', mmNote:'투입 계획 기준', color:'#1d4ed8', bg:'#eff6ff' },
    { no:'2', tier:'ATS',    구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#0f766e', bg:'#f0fdfa' },
    { no:'3', tier:'AGS',    구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#7c3aed', bg:'#f5f3ff' },
    { no:'4', tier:'K-BP',   구분:'외주비', budgetNote:'PO 계약 기준', mmNote:'계약 MM 기준', color:'#d97706', bg:'#fffbeb' },
    { no:'5', tier:'AI',     구분:'외주비', budgetNote:'계획 기준',    mmNote:'투입 계획 기준', color:'#dc2626', bg:'#fff1f2' },
  ];

  const rows = tiers.map(t => `
    <tr>
      <td style="text-align:center">
        <span class="fivetier-num" style="background:${t.bg};color:${t.color}">${t.no}</span>
      </td>
      <td><span class="fivetier-name" style="color:${t.color}">${t.tier}</span></td>
      <td style="text-align:center">
        <span class="fivetier-cat">${t.구분}</span>
      </td>
      <td class="fivetier-stub">
        <span class="fivetier-stub-val">— 원</span>
        <span class="fivetier-stub-note">${t.budgetNote}</span>
      </td>
      <td class="fivetier-stub">
        <span class="fivetier-stub-val">— MM</span>
        <span class="fivetier-stub-note">${t.mmNote}</span>
      </td>
    </tr>`).join('');

  overlay.innerHTML = `
    <div class="fivetier-modal">
      <div class="fivetier-head">
        <div>
          <div class="fivetier-tag">인건비 + 외주비</div>
          <div class="fivetier-title">5Tier 예산·MM 조회</div>
          <div class="fivetier-sub">${projName} · Tier별 예산 및 투입 인력 현황</div>
        </div>
        <button class="fivetier-close" onclick="close5Tier()">닫기</button>
      </div>
      <div class="fivetier-notice">
        ⚠️ 5Tier 기준이 확정되지 않아 현재 조회 기능 구성 단계입니다. 기준 확정 후 실데이터가 연결됩니다.
      </div>
      <table class="fivetier-table">
        <thead>
          <tr>
            <th style="width:60px">No.</th>
            <th style="width:130px">Tier</th>
            <th style="width:100px">구분</th>
            <th style="width:260px">예산</th>
            <th style="width:200px">MM</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  overlay.classList.add('open');
}

function close5Tier() {
  const overlay = document.getElementById('fivetier-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ════════════════════════════════════════
//  요약 테이블 — 과거 월별 + 잔여계획 1컬럼
// ════════════════════════════════════════
function renderSummaryTable(data, actual, planTot, planQ) {
  const pastMs = data.months.filter(m => m.type === 'actual');
  const rows   = [...CATS, '합계'];
  const proj   = currentBudgetProj;

  const monthHeaders = pastMs.map(m => {
    const cls = m.m === data.current ? 'mh-current' : 'mh-past';
    return `<th class="${cls}">${m.m}</th>`;
  }).join('');

  const subrow = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastMs.map(m=>`<th class="${m.m===data.current?'th-future':'th-past'}">${m.m===data.current?'당월':'실적'}</th>`).join('')}
      <th class="th-future">계획 (잔여)</th>
    </tr>`;

  const thead = `
    <tr class="month-head-row">
      <th class="mh-cat">구분</th>
      <th class="mh-plan">예산계획</th>
      ${monthHeaders}
      <th class="mh-remain">잔여계획</th>
    </tr>
    ${subrow}`;

  const tbody = rows.map(cat => {
    const isTotal = cat === '합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);

    const pastCells = pastMs.map(mo => {
      const isCur = mo.m === data.current;
      const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
      const cls2 = isCur ? 'td-current' : 'td-actual';
      const z = v===0 ? ' zero' : '';
      // clickable only for non-total, non-zero cells (or zero with details)
      const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length > 0;
      const clickAttr = hasDetail ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"` : `class="${cls2}${z}"`;
      return `<td ${clickAttr}>${v===0?'—':fmt(v)}</td>`;
    }).join('');

    const rPlan = isTotal ? CATS.reduce((s,c)=>s+planTot[c],0) : (planTot[cat]||0);
    const rQ    = isTotal ? CATS.reduce((s,c)=>s+planQ[c],0)   : (planQ[cat]||0);
    const remainCell = rPlan===0
      ? `<td class="td-remain" style="color:#d6d3d1">—</td>`
      : `<td class="td-remain">${fmt(rPlan)}${rQ>0?`<span class="quasi-badge">투입확정 ${fmt(rQ)}원</span>`:''}</td>`;

    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'—':fmt(planV)}</td>
        ${pastCells}
        ${remainCell}
      </tr>`;
  }).join('');

  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ════════════════════════════════════════
//  상세 테이블 — 전 월 개별 컬럼
// ════════════════════════════════════════
function renderDetailTable(data) {
  const allMs   = data.months;
  const rows    = [...CATS, '합계'];
  const proj    = currentBudgetProj;
  const pastCnt = allMs.filter(m=>m.type==='actual').length;
  const futCnt  = allMs.filter(m=>m.type==='plan').length;

  const typeSubhead = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastCnt>0?`<th class="th-past" colspan="${pastCnt}">실 적</th>`:''}
      ${futCnt>0?`<th class="th-future" colspan="${futCnt}">계 획</th>`:''}
    </tr>`;

  const monthCols = allMs.map(m=>{
    const cls = m.type==='plan'?(m[CATS[0]]&&m[CATS[0]].q>0?'mh-remain':'mh-future'):'mh-past';
    return `<th class="${m.m===data.current?'mh-current':cls}">${m.m}</th>`;
  }).join('');

  const thead = `
    ${typeSubhead}
    <tr class="month-head-row">
      <th class="mh-cat">구분</th>
      <th class="mh-plan">예산계획</th>
      ${monthCols}
    </tr>`;

  const tbody = rows.map(cat => {
    const isTotal = cat==='합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);

    const moCells = allMs.map(mo => {
      const isCur = mo.m === data.current;
      let v, q;
      if (mo.type === 'actual') {
        v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
        q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
        const cls2 = isCur ? 'td-current' : 'td-actual';
        const z = v===0&&q===0 ? ' zero' : '';
        const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length>0;
        const clickAttr = hasDetail
          ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="${cls2}${z}"`;
        return `<td ${clickAttr}>${v===0?'—':fmt(v)}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
      } else {
        v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].p||0:0),0) : (mo[cat]?mo[cat].p||0:0);
        q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
        const z = v===0 ? ' zero' : '';
        const allQuasi = q>0 && q===v;
        const bg = allQuasi ? 'background:#fffbeb;' : '';
        const hasDetail = !isTotal && q>0 && mo[cat] && (mo[cat].details||[]).length>0;
        const clickAttr = hasDetail
          ? `class="td-future${z} clickable" style="${bg}" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="td-future${z}" style="${bg}"`;
        return `<td ${clickAttr}>${v===0?'—':fmt(v)}${q>0?`<span class="quasi-indicator">▶ 투입확정 ${fmt(q)}</span>`:''}</td>`;
      }
    }).join('');

    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'—':fmt(planV)}</td>
        ${moCells}
      </tr>`;
  }).join('');

  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ════════════════════════════════════════
//  상세 드릴다운 모달
// ════════════════════════════════════════
function renderDetailTable(data) {
  const allMs = data.months;
  const rows = [...CATS, '합계'];
  const proj = currentBudgetProj;
  const pastCnt = allMs.filter(m=>m.type==='actual').length;
  const futCnt = allMs.filter(m=>m.type==='plan').length;
  const typeSubhead = `
    <tr class="type-subhead">
      <th colspan="2" style="background:#1e293b;border-bottom:1px solid #334155"></th>
      ${pastCnt>0?`<th class="th-past" colspan="${pastCnt}">실적</th>`:''}
      ${futCnt>0?`<th class="th-future" colspan="${futCnt}">계획</th>`:''}
    </tr>`;
  const monthCols = allMs.map(m => `<th class="${m.type==='plan'?'mh-future':m.m===data.current?'mh-current':'mh-past'}">${m.m}</th>`).join('');
  const thead = `
    ${typeSubhead}
    <tr class="month-head-row">
      <th class="mh-cat">계정</th>
      <th class="mh-plan">계획예산</th>
      ${monthCols}
    </tr>`;
  const tbody = rows.map(cat => {
    const isTotal = cat === '합계';
    const cls = isTotal ? 'total-row' : 'data-row';
    const planV = isTotal ? CATS.reduce((s,c)=>s+(data.plan[c]||0),0) : (data.plan[cat]||0);
    const moCells = allMs.map((mo, mi) => {
      if (mo.type === 'actual') {
        const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].a||0:0),0) : (mo[cat]?mo[cat].a||0:0);
        const cls2 = mo.m === data.current ? 'td-current' : 'td-actual';
        const z = v === 0 ? ' zero' : '';
        const hasDetail = !isTotal && mo[cat] && (mo[cat].details||[]).length > 0;
        const clickAttr = hasDetail
          ? `class="${cls2}${z} clickable" onclick="openBudgetDetail('${mo.m}','${cat}','${proj}')"`
          : `class="${cls2}${z}"`;
        return `<td ${clickAttr}>${v===0?'-':fmt(v)}</td>`;
      }
      const v = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].p||0:0),0) : (mo[cat]?mo[cat].p||0:0);
      const q = isTotal ? CATS.reduce((s,c)=>s+(mo[c]?mo[c].q||0:0),0) : (mo[cat]?mo[cat].q||0:0);
      if (isTotal) {
        return `<td class="td-future">${v===0?'-':fmt(v)}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
      }
      const input = `<input class="budget-plan-input" id="plan-${mi}-${CATS.indexOf(cat)}" value="${v}" inputmode="numeric" title="${mo.m} ${cat} 계획">`;
      return `<td class="td-future editable-plan">${input}${q>0?`<span class="quasi-indicator">투입확정 ${fmt(q)}</span>`:''}</td>`;
    }).join('');
    return `
      <tr class="${cls}">
        <td class="td-cat">${cat}</td>
        <td class="td-plan">${planV===0?'-':fmt(planV)}</td>
        ${moCells}
      </tr>`;
  }).join('');
  return `<table class="budget-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function saveBudgetPlanEdits() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;
  let changed = 0;
  for (let mi = 0; mi < data.months.length; mi++) {
    const mo = data.months[mi];
    if (mo.type !== 'plan') continue;
    for (let ci = 0; ci < CATS.length; ci++) {
      const cat = CATS[ci];
      const el = document.getElementById(`plan-${mi}-${ci}`);
      if (!el || !mo[cat]) continue;
      const next = parseBudgetAmount(el.value);
      const confirmed = mo[cat].q || 0;
      if (next < confirmed) {
        showToast(`${mo.m} ${cat} 계획은 투입확정 ${fmt(confirmed)}원보다 작을 수 없습니다.`);
        return;
      }
      if ((mo[cat].p || 0) !== next) {
        mo[cat].p = next;
        changed++;
      }
    }
  }
  if (!changed) {
    showToast('변경된 계획 금액이 없습니다.');
    return;
  }
  persistBudgetPlanState();
  showToast(`계획 금액 ${changed}건이 저장되었습니다.`);
  renderBudgetPage();
}

function openBudgetDetail(month, cat, proj) {
  const data = BUDGET_SOURCE[proj || currentBudgetProj];
  const mo   = data && data.months.find(m => m.m === month);
  if (!mo || !mo[cat]) return;

  const details = mo[cat].details || [];
  const schema  = DETAIL_SCHEMA[cat];

  document.getElementById('bdetail-title').textContent = `${month} 상세`;
  document.getElementById('bdetail-cat').textContent   = cat;

  if (!details.length) {
    document.getElementById('bdetail-body').innerHTML =
      `<div class="bdetail-empty">📭 상세 내역이 없습니다.</div>`;
  } else {
    const poAmts  = PO_AMOUNTS[proj || currentBudgetProj] || {};
    const total   = schema.total(details);
    const colsHtml = schema.cols.map(c => {
      const isNum = ['MM','단가','금액','실적금액','PO금액'].includes(c);
      return `<th class="${isNum?'num':''}">${c}</th>`;
    }).join('');
    const rowsHtml = details.map(r=>`<tr>${schema.row(r, poAmts)}</tr>`).join('');
    const totalHtml = schema.hasPO
      ? `<tr class="bdetail-total-row">
          <td colspan="2" style="text-align:right;font-weight:700;padding-right:12px">합계</td>
          <td class="td-amount">${fmt(total)} 원</td>
          <td class="td-amount" style="color:#475569">${fmt(schema.totalPO(details, poAmts))} 원</td>
        </tr>`
      : `<tr class="bdetail-total-row">
          <td colspan="${schema.totalCols-1}" style="text-align:right;font-weight:700;padding-right:12px">합계</td>
          <td class="td-amount">${fmt(total)} 원</td>
        </tr>`;

    document.getElementById('bdetail-body').innerHTML = `
      <table class="bdetail-table">
        <thead><tr>${colsHtml}</tr></thead>
        <tbody>${rowsHtml}${totalHtml}</tbody>
      </table>`;
  }

  document.getElementById('budget-detail-overlay').classList.add('open');
}

function closeBudgetDetail() {
  document.getElementById('budget-detail-overlay').classList.remove('open');
}

// ── 이벤트 핸들러 ──
function selectBudgetProj(proj) { openBudgetProjectScreen(proj); }
function switchBudgetView(view) { budgetView = view; renderBudgetPage(); }

function getLaborStatusLabel(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

let laborScmLastSyncedAt = '';

const laborPersonDisplay = {
  'emp-lee': { name:'이봄', org:'NOVA PMO팀', role:'PM/분석설계' },
  'emp-kim': { name:'김서린', org:'AX 개발1팀', role:'Vue Front' },
  'emp-park': { name:'박정우', org:'AX 개발2팀', role:'Java Backend' },
  'emp-choi': { name:'최유진', org:'품질혁신팀', role:'QA/검증' },
  'emp-jung': { name:'정다온', org:'Data Platform팀', role:'Oracle DBA' },
  'emp-han': { name:'한지훈', org:'SCM 등록인력', role:'Java Backend' },
};

function getLaborPersonView(person) {
  if (!person) return null;
  const clean = laborPersonDisplay[person.id] || {};
  return {
    ...person,
    name: clean.name || person.name,
    org: clean.org || person.org,
    role: clean.role || person.role,
  };
}

function getLaborRowView(row) {
  if (!row) return null;
  const clean = laborPersonDisplay[row.personId] || {};
  return {
    ...row,
    name: clean.name || row.name,
    org: clean.org || row.org,
    role: clean.role || row.role,
  };
}

function getLaborStatusLabelLegacy2(status) {
  const cls = laborStatusClass(status);
  if (cls === 'done') return 'SCM 승인완료';
  if (cls === 'wait') return 'SCM 승인대기';
  if (cls === 'saved') return 'MM 저장완료';
  return 'MM 입력중';
}

function refreshLaborCandidatesFromScm() {
  if (!laborCandidatePool.some(p => p.id === 'emp-han')) {
    laborCandidatePool.push({
      id:'emp-han',
      name:'한지훈',
      org:'SCM 등록인력',
      role:'Java Backend',
      pLevel:'P4',
      unitPrice:17500000,
    });
  }
  selectedLaborCandidateId = 'emp-han';
  laborScmLastSyncedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  showToast('SCM에서 최신 인력 리스트를 불러왔습니다.');
  renderBudgetPage();
}

function renderLaborAssignmentPanelLegacy2(data) {
  const rows = getLaborRows();
  const selectedRaw = getSelectedLaborAssignment();
  const selected = getLaborRowView(selectedRaw);
  const editing = editingLaborAssignmentId ? rows.find(r => r.id === editingLaborAssignmentId) : null;
  const personRaw = editing ? laborCandidatePool.find(p => p.id === editing.personId) : getSelectedLaborCandidate();
  const person = getLaborPersonView(personRaw);
  const query = laborSearchQuery.trim().toLowerCase();
  const candidates = laborCandidatePool
    .map(getLaborPersonView)
    .filter(p => !query || `${p.name} ${p.org} ${p.role} ${p.pLevel}`.toLowerCase().includes(query));
  const defaultStart = editing ? editing.startDate : '2026-07-01';
  const defaultEnd = editing ? editing.endDate : '2026-12-31';
  const defaultType = editing ? editing.workType : 'Full';
  const draftMonths = monthRangeByDate(defaultStart, defaultEnd).length;

  const assignmentRows = rows.map(row => {
    const view = getLaborRowView(row);
    const isActive = selected && selected.id === view.id;
    return `
      <button class="labor-row ${isActive ? 'active' : ''}" onclick="selectLaborAssignment('${view.id}')">
        <span>
          <strong>${view.name}</strong>
          <em>${view.org} · ${view.role} · ${view.pLevel}</em>
        </span>
        <span class="labor-row-right">
          <b>${view.totalMm || 0}MM</b>
          <i class="labor-status ${laborStatusClass(view.status)}">${getLaborStatusLabel(view.status)}</i>
        </span>
      </button>`;
  }).join('');

  const monthInputs = selectedRaw
    ? Object.keys(selectedRaw.monthly || {}).map(month => `
      <label class="labor-mm-cell">
        <span>${month}</span>
        <input id="labor-mm-${selectedRaw.id}-${month}" type="number" min="0" max="1" step="0.1" value="${selectedRaw.monthly[month]}">
      </label>
    `).join('')
    : '';

  const selectedStatusClass = selectedRaw ? laborStatusClass(selectedRaw.status) : '';
  const canRequest = selectedRaw && selectedStatusClass === 'saved';
  const canApprove = selectedRaw && selectedStatusClass === 'wait';

  return `
    <div class="labor-panel">
      <div class="labor-panel-head">
        <div>
          <div class="labor-eyebrow">인건비 등록 / 수정</div>
          <div class="labor-title">SCM 인력 조회부터 승인완료까지</div>
        </div>
        <div class="labor-flow">
          <span>SCM 조회</span><span>인력선택</span><span>기본정보 저장</span><span>월별 MM</span><span>승인요청</span><span>승인완료</span>
        </div>
      </div>

      <div class="labor-top-grid">
        <div class="labor-card labor-search-card">
          <div class="labor-card-headline">
            <div>
              <div class="labor-card-title">1. 인력 선택</div>
              <p>SCM 기준 인력 리스트에서 투입 대상을 선택합니다.</p>
            </div>
            <button class="labor-sync-btn" onclick="refreshLaborCandidatesFromScm()">SCM 실시간 조회</button>
          </div>
          <input class="labor-search-input" value="${laborSearchQuery}" placeholder="이름, 조직, 역할, P레벨 검색"
            oninput="updateLaborSearch(this.value)">
          <div class="labor-sync-note">${laborScmLastSyncedAt ? `최근 조회 ${laborScmLastSyncedAt}` : 'SCM 조회 버튼으로 최신 인력 리스트를 불러올 수 있습니다.'}</div>
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
          <div class="labor-summary labor-summary-basic">
            <div><span>P레벨</span><strong>${person ? person.pLevel : '-'}</strong></div>
            <div><span>단가</span><strong>${person ? fmt(person.unitPrice) : '-'}원</strong></div>
            <div><span>월 범위</span><strong>${draftMonths}개월</strong></div>
          </div>
          <div class="labor-mm-guide">
            <strong>총 MM / 금액은 4번 월별 MM 입력 후 자동 합산됩니다.</strong>
            <span>기본정보 저장 단계에서는 기간과 투입유형만 확정합니다.</span>
          </div>
          <div class="labor-actions">
            ${editing ? '<button class="labor-sub-btn" onclick="cancelLaborEdit()">수정취소</button>' : ''}
            <button class="labor-main-btn" onclick="saveLaborAssignmentDraft()">${editing ? '기본정보 수정 저장' : '투입 기본정보 저장'}</button>
          </div>
        </div>
      </div>

      <div class="labor-registered-card">
        <div class="labor-card-title">3. 등록 인력</div>
        <div class="labor-registered-grid">${assignmentRows || '<div class="labor-empty">등록된 인력이 없습니다.</div>'}</div>
      </div>

      ${selectedRaw ? `
        <div class="labor-month-card">
          <div class="labor-month-head">
            <div>
              <div class="labor-card-title">4. 월별 MM 입력 및 승인</div>
              <div class="labor-selected">${selected.name} · ${selected.startDate} ~ ${selected.endDate} · ${selected.workType}</div>
            </div>
            <div class="labor-selected-total">
              <small>월별 MM 합계</small>
              <span>${selected.totalMm || 0}MM</span>
              <strong>${fmt(selected.amount || 0)}원</strong>
              <i class="labor-status ${selectedStatusClass}">${getLaborStatusLabel(selected.status)}</i>
            </div>
          </div>
          <div class="labor-mm-grid">${monthInputs}</div>
          <div class="labor-approval-line">
            <span class="${selectedStatusClass !== 'draft' ? 'on' : ''}">MM 저장</span>
            <span class="${['wait','done'].includes(selectedStatusClass) ? 'on' : ''}">SCM 전송</span>
            <span class="${selectedStatusClass === 'done' ? 'on' : ''}">승인완료</span>
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

let budgetSummaryExpanded = { labor:true, outsource:true, material:false, expense:false };
const budgetConfirmState = {};

function getBudgetConfirm(proj = currentBudgetProj) {
  if (!budgetConfirmState[proj]) {
    budgetConfirmState[proj] = {
      version: 2,
      status: '작성중',
      erpStatus: '미전송',
      confirmedAt: '',
      sentAt: '',
      mailTo: '팀장 김도윤',
      mailStatus: '대기',
    };
  }
  return budgetConfirmState[proj];
}

function toggleBudgetSummaryAccount(key) {
  budgetSummaryExpanded[key] = !budgetSummaryExpanded[key];
  renderBudgetPage();
}

function getExecPlanAccounts(data, actual, quasi) {
  const defs = [
    { key:'labor', acct:'인건비', desc:'실투입 인건비, 이관 인건비, 증업/OT', edit:'인건비' },
    { key:'outsource', acct:'외주비', desc:'실투입대상, 전문직수수료, 출장비, 공사MA, 이관, 기타', edit:'외주비' },
    { key:'material', acct:'재료비', desc:'상품재료비, 감가상각비', edit:'재료비' },
    { key:'expense', acct:'경비', desc:'통제/비통제 경비, A/S Cost', edit:'경비' },
  ];
  return defs.map(def => {
    const budget = getBudgetAdjusted(data, def.acct);
    const used = (actual[def.acct] || 0) + (quasi[def.acct] || 0);
    const remain = Math.max(budget - used, 0);
    const months = data.months.filter(m => m.type === 'plan' && m[def.acct]).length;
    return { ...def, budget, used, remain, months, rate: budget ? Math.round(used / budget * 100) : 0 };
  });
}

function splitAccountChildren(account) {
  const b = account.budget;
  const u = account.used;
  const r = account.remain;
  const mk = (name, ratio, note) => ({
    name,
    budget: Math.round(b * ratio),
    used: Math.round(u * ratio),
    remain: Math.round(r * ratio),
    note,
  });
  if (account.key === 'labor') {
    return [mk('실투입인건비', .72, 'SCM 승인/투입확정 기준'), mk('이관인건비', .18, '타 프로젝트 이관 인건비'), mk('증업일급여-OT', .10, '월별 OT 계획')];
  }
  if (account.key === 'outsource') {
    return [
      mk('실투입대상 외주비', .45, '업체/계약/PO/검수'),
      mk('전문직수수료/제안/기타', .12, '업체/계약/PO'),
      mk('외주출장비', .05, '출장비/집행월'),
      mk('공사MA', .25, '공사/MA 계약'),
      mk('이관외주비', .05, '이관월/금액/사유'),
      mk('기타외주비', .08, '집행월/금액/설명'),
    ];
  }
  if (account.key === 'material') {
    return [mk('상품재료비', .78, '견적 기반 상품재료비'), mk('감가상각비', .22, '장비/라이선스 상각')];
  }
  return [mk('통제 경비', .64, 'ERP 가용예산 체크'), mk('비통제 경비', .24, '프로젝트 운영성 비용'), mk('A/S Cost', .12, '사후지원 예산')];
}

function renderProjectPlanSummaryLegacyCards(data, actual, quasi) {
  const accounts = getExecPlanAccounts(data, actual, quasi);
  const totalBudget = accounts.reduce((s, a) => s + a.budget, 0);
  const totalUsed = accounts.reduce((s, a) => s + a.used, 0);
  const totalRemain = accounts.reduce((s, a) => s + a.remain, 0);
  const rows = accounts.map(acc => {
    const open = !!budgetSummaryExpanded[acc.key];
    const children = splitAccountChildren(acc).map(child => `
      <div class="bps-child-row">
        <span class="bps-child-indent"></span>
        <span class="bps-child-name"><i></i><strong>${child.name}</strong></span>
        <b>${fmt(child.budget)}원</b>
        <b>${fmt(child.used)}원</b>
        <b>${fmt(child.remain)}원</b>
        <em>${child.note}</em>
      </div>`).join('');
    return `
      <div class="bps-account-block">
        <div class="bps-parent-row">
          <button class="bps-toggle" onclick="toggleBudgetSummaryAccount('${acc.key}')">${open ? '−' : '+'}</button>
          <div>
            <strong>${acc.acct}</strong>
            <span>${acc.desc}</span>
          </div>
          <b>${fmt(acc.budget)}원</b>
          <b>${fmt(acc.used)}원</b>
          <b>${fmt(acc.remain)}원</b>
          <button class="bps-edit-btn" onclick="openBudgetAccountEditor('${acc.edit}')">${acc.acct} 수정</button>
        </div>
        ${open ? `<div class="bps-child-list">${children}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="budget-plan-summary">
      <div class="bps-head">
        <div>
          <div class="setup-eyebrow">전체 프로젝트 실행예산 수립</div>
          <div class="setup-title">전체 계획 요약을 확인하세요</div>
          <p>4대 계정을 펼쳐 상세 항목까지 확인한 뒤, 확정 화면에서 버전 비교 후 ERP로 전송합니다.</p>
        </div>
        <div class="bps-actions">
          <button class="labor-sub-btn" onclick="Object.keys(budgetSummaryExpanded).forEach(k=>budgetSummaryExpanded[k]=true);renderBudgetPage()">전체 펼침</button>
          <button class="labor-main-btn" onclick="budgetDetailStep='confirm';renderBudgetPage()">예산 확정 화면 →</button>
        </div>
      </div>
      <div class="bps-total-strip">
        <div><span>실행예산</span><strong>${fmt(totalBudget)}원</strong></div>
        <div><span>확정/실적</span><strong>${fmt(totalUsed)}원</strong></div>
        <div><span>잔여예산</span><strong>${fmt(totalRemain)}원</strong></div>
        <div><span>확정 버전</span><strong>v${getBudgetConfirm().version}</strong></div>
      </div>
      <div class="bps-table-head">
        <span></span><span>구분</span><span>실행예산</span><span>ERP 실적/확정</span><span>잔여예산</span><span></span>
      </div>
      <div class="bps-table">${rows}</div>
    </div>`;
}

function getConfirmCompareRows(data, actual, quasi) {
  const accounts = getExecPlanAccounts(data, actual, quasi);
  const rows = [];
  accounts.forEach((acc, idx) => {
    const delta = [6084954, 9791533, -3706579, 0][idx] || 0;
    rows.push({ name:acc.acct, level:0, before:acc.budget - delta, after:acc.budget, erp:actual[acc.acct] || 0, remainBefore:acc.remain - delta, remainAfter:acc.remain });
    splitAccountChildren(acc).forEach((c, cidx) => {
      const childDelta = cidx === 0 ? delta : 0;
      rows.push({ name:c.name, level:1, before:c.budget - childDelta, after:c.budget, erp:Math.round((actual[acc.acct] || 0) * (c.budget / Math.max(acc.budget, 1))), remainBefore:c.remain - childDelta, remainAfter:c.remain });
    });
  });
  return rows.map(r => ({ ...r, diff:r.after - r.before, remainDiff:r.remainAfter - r.remainBefore }));
}

function confirmBudgetVersion() {
  const state = getBudgetConfirm();
  state.status = '확정완료';
  state.confirmedAt = new Date().toLocaleString('ko-KR', { hour12:false });
  state.version += 1;
  showToast(`실행예산 v${state.version}이 확정되었습니다. ERP 전송 대기 상태입니다.`);
  renderBudgetPage();
}

function sendBudgetToErp() {
  const state = getBudgetConfirm();
  if (state.status !== '확정완료') {
    showToast('예산 확정 후 ERP 전송이 가능합니다.');
    return;
  }
  state.erpStatus = '전송완료';
  state.sentAt = new Date().toLocaleString('ko-KR', { hour12:false });
  state.mailStatus = '팀장 메일 발송완료';
  showToast(`${state.mailTo}에게 확정/ERP 전송 안내 메일을 발송했습니다.`);
  renderBudgetPage();
}

function renderBudgetConfirmScreen(data, actual, quasi) {
  const state = getBudgetConfirm();
  const rows = getConfirmCompareRows(data, actual, quasi).map(r => {
    const sign = r.diff > 0 ? '+' : '';
    const color = r.diff > 0 ? '#0284c7' : r.diff < 0 ? '#dc2626' : '#64748b';
    return `
      <tr class="${r.level ? 'child' : 'parent'}">
        <td>${r.level ? '└ ' : ''}${r.name}</td>
        <td class="num">${fmt(r.before)}</td>
        <td class="num">${fmt(r.after)}</td>
        <td class="num" style="color:${color};font-weight:900">${sign}${fmt(r.diff)}</td>
        <td class="num">${fmt(r.erp)}</td>
        <td class="num">${fmt(r.remainBefore)}</td>
        <td class="num">${fmt(r.remainAfter)}</td>
        <td class="num" style="color:${color};font-weight:900">${sign}${fmt(r.remainDiff)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="budget-confirm-page">
      <div class="bcp-head">
        <button class="budget-process-back" onclick="budgetDetailStep='setup';renderBudgetPage()">← 전체 계획 요약</button>
        <div>
          <div class="setup-eyebrow">실행예산 확정</div>
          <div class="setup-title">이전 버전 대비 변동 내역 확인</div>
          <p>확정 전 변경전/변경후/증감과 ERP 실적, 잔여예산 변동을 확인합니다.</p>
        </div>
        <div class="bcp-status">
          <span>v${state.version}</span>
          <strong>${state.status}</strong>
          <em>ERP ${state.erpStatus}</em>
        </div>
      </div>
      <div class="bcp-flow">
        <div class="on"><b>1</b><span>계획 요약 확인</span></div>
        <div class="${state.status === '확정완료' || state.erpStatus === '전송완료' ? 'on' : ''}"><b>2</b><span>예산 확정</span></div>
        <div class="${state.erpStatus === '전송완료' ? 'on' : ''}"><b>3</b><span>ERP 전송/팀장 메일</span></div>
      </div>
      <div class="bcp-mail-card">
        <div><span>메일 수신</span><strong>${state.mailTo}</strong></div>
        <div><span>메일 상태</span><strong>${state.mailStatus}</strong></div>
        <div><span>확정일시</span><strong>${state.confirmedAt || '-'}</strong></div>
        <div><span>ERP 전송일시</span><strong>${state.sentAt || '-'}</strong></div>
      </div>
      <div class="bcp-table-wrap">
        <table class="bcp-table">
          <thead>
            <tr>
              <th rowspan="2">구분</th>
              <th colspan="3">실행예산</th>
              <th rowspan="2">ERP 실적<br>(누계)</th>
              <th colspan="3">잔여예산</th>
            </tr>
            <tr>
              <th>변경전(A)</th><th>변경후(B)</th><th>증감(B-A)</th>
              <th>변경전(A)</th><th>변경후(B)</th><th>증감(B-A)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="bcp-actions">
        <button class="labor-sub-btn" onclick="budgetDetailStep='setup';renderBudgetPage()">계획 다시 보기</button>
        <button class="labor-main-btn" onclick="confirmBudgetVersion()">예산 확정</button>
        <button class="labor-main-btn teal" onclick="sendBudgetToErp()">ERP 전송 및 팀장 메일</button>
      </div>
    </div>`;
}

function renderBudgetPage() {
  if (budgetScreenView === 'list') {
    renderBudgetListView();
    return;
  }

  const data = BUDGET_SOURCE[currentBudgetProj];
  if (!data) return;

  const actual   = CATS.reduce((o,c)=>({...o,[c]:calcActual(data,c)}),{});
  const quasi    = CATS.reduce((o,c)=>({...o,[c]:calcQuasi(data,c)}),{});
  const remain   = CATS.reduce((o,c)=>({...o,[c]:calcRemain(data,c)}),{});
  const totBudget= CATS.reduce((s,c)=>s+(data.plan[c]||0),0);
  const totActual= CATS.reduce((s,c)=>s+actual[c],0);
  const totQuasi = CATS.reduce((s,c)=>s+quasi[c],0);
  const totRemain= totBudget - totActual - totQuasi;

  const setupBody = budgetSetupEditAccount
    ? renderBudgetAccountEditor(data, budgetSetupEditAccount)
    : renderBudgetSetupOverview(data, actual, quasi);

  document.getElementById('budget-body').innerHTML = `
    <button class="mc-back-btn" onclick="budgetScreenView='list';budgetDetailStep='overview';renderBudgetPage()">← 목록으로</button>
    ${renderTotalBudgetBar(totBudget, totActual, totQuasi, totRemain, data.projName, data.dplus, data.stage)}
    ${budgetDetailStep === 'overview'
      ? `
        ${renderAccountTransferTable(data, actual, quasi, remain)}
        <div class="budget-next-process">
          <div>
            <div class="budget-next-eyebrow">Next Process</div>
            <div class="budget-next-title">상세 예산 수립</div>
            <div class="budget-next-sub">전체 프로젝트 계획 요약과 상세 계정 계획을 확인한 뒤 예산을 확정합니다.</div>
          </div>
          <button class="budget-next-btn" onclick="budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">상세 예산 수립 →</button>
        </div>`
      : budgetDetailStep === 'confirm'
        ? renderBudgetConfirmScreen(data, actual, quasi)
        : `
          <div class="budget-process-head">
            <button class="budget-process-back" onclick="budgetScreenView='list';budgetDetailStep='setup';budgetSetupEditAccount=null;renderBudgetPage()">← 목록으로</button>
            <div>
              <div class="budget-process-title">상세 예산 수립</div>
              <div class="budget-process-sub">전체 프로젝트 계획을 확인하고, 4대 계정을 펼쳐 상세 항목까지 검토합니다.</div>
            </div>
          </div>
          ${setupBody}`}
  `;
}

var materialDepreciationPlans = [
  { id:'dep-001', asset:'개발서버 장비 감가상각', start:'2026-07', end:'2027-06', monthly:2600000, status:'계획', note:'개발/테스트 서버 자산 월상각' },
  { id:'dep-002', asset:'테스트 자동화 라이선스 상각', start:'2026-09', end:'2027-11', monthly:1800000, status:'계획', note:'프로젝트 전용 라이선스 상각' },
];
var editingDepreciationPlanId = null;

function getAccountDetailRows(account) {
  if (account === CATS[0]) return [
    { name:'실투입인건비', ratio:.72 },
    { name:'이관인건비', ratio:.18 },
    { name:'증업일급여-OT', ratio:.10 },
  ];
  if (account === CATS[1]) return [
    { name:'실투입대상 외주비', ratio:.45 },
    { name:'전문직수수료/제안/기타', ratio:.12 },
    { name:'외주출장비', ratio:.05 },
    { name:'공사MA', ratio:.25 },
    { name:'이관외주비', ratio:.05 },
    { name:'기타외주비', ratio:.08 },
  ];
  if (account === CATS[2]) return [
    { name:'상품재료비', ratio:null },
    { name:'감가상각비', ratio:null },
  ];
  return [
    { name:'통제 경비', ratio:.64 },
    { name:'비통제 경비', ratio:.24 },
    { name:'A/S Cost', ratio:.12 },
  ];
}

function getMonthAccountValue(monthData, account) {
  const bucket = monthData?.[account] || {};
  return monthData.type === 'actual' ? (bucket.a || 0) : ((bucket.q || 0) || (bucket.p || 0));
}

function getDepreciationAmountForMonth(month) {
  return materialDepreciationPlans.reduce((sum, row) => {
    if (month >= row.start && month <= row.end) return sum + (row.monthly || 0);
    return sum;
  }, 0);
}

function getMonthlyBudgetRows(data, account) {
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  return getAccountDetailRows(account).map(detail => {
    const months = data.months.map(mo => {
      const base = getMonthAccountValue(mo, account);
      if (account === CATS[2]) {
        const depreciation = getDepreciationAmountForMonth(mo.m);
        return detail.name === '감가상각비' ? depreciation : Math.max(base - depreciation, 0);
      }
      return Math.round(base * detail.ratio);
    });
    const plan = account === CATS[2]
      ? (detail.name === '감가상각비'
          ? months.reduce((s, v) => s + v, 0)
          : Math.max(totalPlan - months.reduce((s, v) => s + v, 0), 0))
      : Math.round(totalPlan * detail.ratio);
    const actual = account === CATS[2]
      ? (detail.name === '감가상각비' ? 0 : totalActual)
      : Math.round(totalActual * detail.ratio);
    return { name:detail.name, plan, actual, remain:Math.max(plan - actual, 0), months };
  });
}

function renderAccountMonthlyBudgetTable(data, account) {
  const rows = getMonthlyBudgetRows(data, account);
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  const totalRemain = Math.max(totalPlan - totalActual, 0);
  const monthTotals = data.months.map(mo => getMonthAccountValue(mo, account));
  const headMonths = data.months.map(mo => `<th>${mo.m}</th>`).join('');
  const bodyRows = rows.map(row => `
    <tr>
      <td class="acct-name">${row.name}</td>
      <td class="num">${fmt(row.plan)}</td>
      <td class="num">${fmt(row.actual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      ${row.months.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
    </tr>`).join('');

  return `
    <div class="account-monthly-card">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-main-btn teal">${account} 실적조회</button>
        </div>
      </div>
      <div class="account-monthly-scroll">
        <table class="account-monthly-table">
          <thead>
            <tr>
              <th>구분</th><th>계획</th><th>실적/확정</th><th>잔여예산</th>${headMonths}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            <tr class="total">
              <td>합계</td>
              <td class="num">${fmt(totalPlan)}</td>
              <td class="num">${fmt(totalActual)}</td>
              <td class="num">${fmt(totalRemain)}</td>
              ${monthTotals.map(v => `<td class="num">${fmt(v)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="account-monthly-note">※ 7월 이전은 실적/확정 기준, 이후는 현재 수립된 계획 기준으로 표시됩니다.</p>
    </div>`;
}

function renderMaterialKindTabs() {
  return renderCategoryChoiceBoard('material', [
    { step:'01', label:'상품재료비', desc:'견적등록/납기', active:materialKind === 'item', action:"switchMaterialKind('item')" },
    { step:'02', label:'감가상각비', desc:'자산/라이선스 월상각', active:materialKind === 'depreciation', action:"switchMaterialKind('depreciation')" },
    { step:'03', label:'기타재료비', desc:'이관/임시/기타', active:materialKind === 'other', action:"switchMaterialKind('other')" },
  ], 'material');
}

function renderMaterialDepreciationPanel() {
  const editing = materialDepreciationPlans.find(r => r.id === editingDepreciationPlanId);
  const rows = materialDepreciationPlans.map(row => `
    <tr>
      <td>${row.asset}</td>
      <td>${row.start} ~ ${row.end}</td>
      <td class="num">${fmt(row.monthly)}원</td>
      <td>${row.status}</td>
      <td>${row.note}</td>
      <td><button class="labor-sub-btn" onclick="editDepreciationPlan('${row.id}')">수정</button></td>
    </tr>`).join('');

  return `
    <div class="material-dep-grid">
      <div class="material-dep-list">
        <div class="labor-section-title">등록된 감가상각 계획</div>
        <table class="material-dep-table">
          <thead><tr><th>자산/비용명</th><th>상각기간</th><th>월상각액</th><th>상태</th><th>설명</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="material-dep-form">
        <div class="labor-section-title">${editing ? '감가상각비 수정' : '감가상각비 등록'}</div>
        <div class="os-form-grid">
          <label class="wide"><span>자산/비용명</span><input id="dep-asset" value="${editing ? editing.asset : ''}" placeholder="예: 개발서버 장비 감가상각"></label>
          <label><span>시작월</span><input id="dep-start" type="month" value="${editing ? editing.start : '2026-07'}"></label>
          <label><span>종료월</span><input id="dep-end" type="month" value="${editing ? editing.end : '2027-11'}"></label>
          <label><span>월상각액</span><input id="dep-monthly" inputmode="numeric" value="${editing ? editing.monthly : ''}" placeholder="예: 2500000"></label>
          <label class="wide"><span>설명</span><textarea id="dep-note" rows="3" placeholder="예: 견적 데이터 기반 라이선스 월상각">${editing ? editing.note : ''}</textarea></label>
        </div>
        <div class="os-form-actions">
          <button class="labor-main-btn" onclick="saveDepreciationPlan()">${editing ? '수정 저장' : '감가상각비 등록'}</button>
          ${editing ? `<button class="labor-sub-btn" onclick="editingDepreciationPlanId=null;renderBudgetPage()">취소</button>` : ''}
        </div>
      </div>
    </div>`;
}

function editDepreciationPlan(id) {
  editingDepreciationPlanId = id;
  materialKind = 'depreciation';
  renderBudgetPage();
}

function saveDepreciationPlan() {
  const payload = {
    id: editingDepreciationPlanId || `dep-${Date.now()}`,
    asset: document.getElementById('dep-asset')?.value || '감가상각비 계획',
    start: document.getElementById('dep-start')?.value || '2026-07',
    end: document.getElementById('dep-end')?.value || '2027-11',
    monthly: parseBudgetAmount(document.getElementById('dep-monthly')?.value || 0),
    status: '계획',
    note: document.getElementById('dep-note')?.value || '',
  };
  if (!payload.monthly) {
    showToast('월상각액을 입력해 주세요.');
    return;
  }
  const idx = materialDepreciationPlans.findIndex(r => r.id === payload.id);
  if (idx >= 0) materialDepreciationPlans[idx] = payload;
  else materialDepreciationPlans.push(payload);
  editingDepreciationPlanId = null;
  showToast('감가상각비 계획이 저장되었습니다.');
  renderBudgetPage();
}

function renderMaterialPlanPanel(data) {
  if (materialKind === 'depreciation') {
    return renderMaterialShell('감가상각비 계획 등록', '자산/라이선스 기준으로 월상각액을 입력하고 재료비 월별 예산에 반영합니다.', renderMaterialDepreciationPanel());
  }
  if (materialKind === 'other') {
    return renderMaterialShell('기타재료비 계획 등록', '실적 발생 전 계획 건만 수정 가능합니다.', renderOtherMaterialPanel());
  }
  return renderMaterialShell('상품재료비 계획 등록', '견적 데이터를 불러와 상품재료비 계획을 수립합니다.', renderMaterialItemPanel());
}

function renderBudgetAccountEditor(data, account) {
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  const subtitles = {
    [CATS[0]]:'인력 투입, MM, 승인요청 상태를 관리합니다.',
    [CATS[1]]:'실투입 외주비, 기타외주비, MA를 구분해 계획을 등록합니다.',
    [CATS[2]]:'상품재료비, 감가상각비, 기타재료비를 구분해 계획을 등록합니다.',
    [CATS[3]]:'계정별 월별 경비 계획을 입력하고 ERP 가용예산을 체크합니다.',
  };
  const body = account === CATS[0]
    ? renderLaborAssignmentPanel(data)
    : account === CATS[1]
      ? renderBpoOutsourcePanelFinal(data)
      : account === CATS[2]
        ? renderMaterialPlanPanel(data)
        : account === CATS[3]
          ? renderExpensePlanPanel(data)
          : renderSimpleAccountPlanEditor(data, account);

  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">${account} 수정</div>
          <div class="setup-editor-sub">${subtitles[account] || '미래 계획 금액을 수정합니다.'}</div>
        </div>
      </div>
      ${monthly}
      ${body}
    </div>`;
}

function isPastActualMonth(month) {
  return month < '2026-07';
}

function actualCellHtml(account, month, rowName, value) {
  if (isPastActualMonth(month)) {
    return `<button class="actual-month-link" onclick="showActualDetailModal('${account}','${month}','${rowName}')">${fmt(value)}</button>`;
  }
  if (account === CATS[0] && value > 0) {
    return `<button class="actual-month-link plan" onclick="showLaborPlanDetailModal('${month}','${rowName}')">${fmt(value)}</button>`;
  }
  return fmt(value);
}

function renderAccountMonthlyBudgetTable(data, account) {
  const rows = getMonthlyBudgetRows(data, account);
  const totalPlan = getBudgetAdjusted(data, account);
  const totalActual = calcActual(data, account) + calcQuasi(data, account);
  const totalRemain = Math.max(totalPlan - totalActual, 0);
  const monthTotals = data.months.map(mo => getMonthAccountValue(mo, account));
  const headMonths = data.months.map(mo => `<th>${mo.m}</th>`).join('');
  const bodyRows = rows.map(row => `
    <tr>
      <td class="acct-name">${row.name}</td>
      <td class="num">${fmt(row.plan)}</td>
      <td class="num">${fmt(row.actual)}</td>
      <td class="num">${fmt(row.remain)}</td>
      ${row.months.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, row.name, v)}</td>`).join('')}
    </tr>`).join('');

  return `
    <div class="account-monthly-card">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn">엑셀</button>
          <button class="labor-main-btn teal" onclick="showActualDetailModal('${account}','2026-06','전체')">${account} 실적조회</button>
        </div>
      </div>
      <div class="account-monthly-scroll">
        <table class="account-monthly-table">
          <thead>
            <tr>
              <th>구분</th><th>계획</th><th>실적/확정</th><th>잔여예산</th>${headMonths}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            <tr class="total">
              <td>합계</td>
              <td class="num">${fmt(totalPlan)}</td>
              <td class="num">${fmt(totalActual)}</td>
              <td class="num">${fmt(totalRemain)}</td>
              ${monthTotals.map((v, idx) => `<td class="num">${actualCellHtml(account, data.months[idx].m, '합계', v)}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="account-monthly-note">※ 이전월 실적 금액은 파란색 링크로 표시되며, 클릭하면 전표/인력/계정 상세를 확인할 수 있습니다.</p>
    </div>`;
}

function getActualTabs(account) {
  if (account === CATS[0]) return ['사내인건비/사내간접비', '증업일급여-OT', '이관인건비'];
  if (account === CATS[1]) return ['실투입대상 외주비', '전문직수수료/제안/기타', '외주출장비', '공사MA', '이관외주비', '기타외주비'];
  if (account === CATS[2]) return ['상품재료비', '감가상각비', '기타재료비'];
  return ['경비 전체'];
}

function getActualDetailColumns(account) {
  if (account === CATS[0]) return ['NO', '실적발생월', '부서', '인건비전표번호', '간접비전표번호', '사번', '성명', '직위', '금액'];
  if (account === CATS[1]) return ['NO', '실적발생월', '전표번호', '성명', '기술등급', '회사', '소급여부', '실제 투입월', '금액'];
  if (account === CATS[2]) return ['NO', '실적발생월', '전표번호', '품목', '모델명', '수량', '상호', '금액'];
  return ['NO', '실적발생월', '계정', 'SAP전표번호', '요청자', '실적반영금액', '상호'];
}

function getActualDetailRows(account, month, detailName) {
  if (account === CATS[0]) {
    const people = [
      ['AI Architect팀','0300375522','0300375523','04490','손성호','Manager', 45800000],
      ['AI Architect팀','0300378442','0300378443','09744','전현영','Manager', 39200000],
      ['AI UX팀','0300378326','0300378327','09556','박혜리','Manager', 28400000],
      ['AX서비스1팀','0300376670','0300376671','06880','조인수','Manager', 33100000],
    ];
    return people.map((p, i) => [i + 1, month, ...p]);
  }
  if (account === CATS[1]) {
    const vouchers = [
      ['8800466220','TBD','고급상','펜타시스템테크놀러지(주)','정상','2026-06', 82000000],
      ['8800466223','TBD','특급','(주)인젠트','정상','2026-06', 64000000],
      ['8800466222','TBD','고급상','(주)디리아','정상','2026-06', 41000000],
      ['8800466219','TBD','고급상','(주)인픽스','정상','2026-06', 24968792],
    ];
    return vouchers.map((v, i) => [i + 1, month, ...v]);
  }
  if (account === CATS[2]) {
    const items = [
      ['7806057711','개발서버 장비','SRV-AX-01', 1, '한국델테크놀로지스', 3200000],
      ['7806057712','테스트 자동화 라이선스','QA-AUTO', 10, '에이아이솔루션', 1800000],
      ['7806057713','검수용 소프트웨어','SW-TEMP', 3, '오픈소프트', 1500000],
    ];
    return items.map((v, i) => [i + 1, month, ...v]);
  }
  const expenses = [
    ['석식대','7806056116','홍길표', 36091, '홍길표'],
    ['시내교통비','7806057671','문태기', 10100, '티머니택시'],
    ['의욕관리비','7806057670','문태기', 80913, '그랩오피스'],
    ['전산소모품비','7806058794','서주영', 22910, '서주영'],
  ];
  return expenses.map((v, i) => [i + 1, month, ...v]);
}

function showActualDetailModal(account, month, detailName) {
  let modal = document.getElementById('actual-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'actual-detail-modal';
    modal.className = 'actual-detail-overlay';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  const columns = getActualDetailColumns(account);
  const rows = getActualDetailRows(account, month, detailName);
  const tabs = getActualTabs(account);
  const total = rows.reduce((sum, row) => sum + Number(row[row.length - 1] || 0), 0);
  modal.innerHTML = `
    <div class="actual-detail-modal">
      <div class="actual-detail-head">
        <strong>${account} 실적조회</strong>
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">×</button>
      </div>
      <div class="actual-detail-filter">
        <label><span>${account === CATS[3] ? '경비계정' : '실적발생월'}</span><input value="${account === CATS[3] ? '- 전체 -' : month}" readonly></label>
        <label><span>조회기간</span><input value="${month}" readonly></label>
        <button class="labor-sub-btn">초기화</button>
        <button class="labor-main-btn teal">검색</button>
      </div>
      <div class="actual-detail-tabs">
        ${tabs.map((tab, idx) => `<button class="${idx === 0 || tab === detailName ? 'active' : ''}">${tab}</button>`).join('')}
      </div>
      <div class="actual-detail-toolbar"><button class="labor-sub-btn">엑셀</button></div>
      <div class="actual-detail-table-wrap">
        <table class="actual-detail-table">
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === row.length - 1 ? 'num' : ''}">${idx === row.length - 1 ? fmt(cell) : cell}</td>`).join('')}</tr>`).join('')}
            <tr class="total"><td colspan="${columns.length - 1}">합계</td><td class="num">${fmt(total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="actual-detail-foot">
        <button onclick="document.getElementById('actual-detail-modal').classList.remove('open')">닫기</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function selectLaborAssignment(id) {
  selectedLaborAssignmentId = id;
  editingLaborAssignmentId = id;
  laborRegistrationMode = 'edit';
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
