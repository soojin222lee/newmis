// AI GUIDE: 화면 설명 기능입니다.
// - 헤더의 '📖 화면 설명' 버튼(toggleScreenDesc)을 누르면 현재 활성 화면(.screen.active)의 설명 패널을 띄웁니다.
// - 화면별 설명은 SCREEN_DESC 사전에 정의합니다(목적·주요기능·연계시스템). AS-IS 시스템 분석 관점의 설명 톤.
// - 반드시 다른 스크립트 뒤에 로드합니다. 공유 CSS를 건드리지 않고 자체 스타일(.sdsc-*)을 주입합니다.

const SCREEN_DESC = {
  's-main': {
    menu: '메인 · My Work', title: '메인 (My Work)',
    purpose: '로그인 후 첫 화면. 내가 담당한 프로젝트와 확인할 항목, 재무 요약을 한눈에 보고 다음 행동으로 이동한다.',
    features: ['담당 프로젝트 카드(이름 클릭=선택, 빨간 배지 클릭=확인항목 팝업)', '확인 항목 · 재무 요약(총액/실집행/소진율)', 'AI 채팅 + 화면 네비게이터(질문→답변+화면 자동 이동)'],
    systems: ['-'],
  },
  's-budget': {
    menu: '수행원가', title: '수행원가 (실행예산)',
    purpose: '프로젝트의 실행예산을 조회·수립·조정하고 변경 이력을 관리하는 핵심 화면. 원가현황 / 원가조정 / 변경이력 3개 소메뉴를 공유한다.',
    features: ['원가현황: 월별 계획/실적 그리드 (기준월 이전=ERP 실적, 이후=계획)', '원가조정: 계정별 편집 · 3단계(이력→작성→결재) · 예산 이관(총액 내)', '변경이력: 실행예산 버전 이력 · 이관 변경 로그', '5대 계정: 인건비 · 외주비 · 재료비 · 경비 · A/S Cost'],
    systems: ['SCM(인건비 확정 인력)', 'POP(외주·재료 PO/검수)', 'ERP(경비 가용예산·실적)'],
  },
  's-insights': {
    menu: '인사이트', title: '인사이트',
    purpose: '프로젝트 원가를 종합 분석한다. 계획 대비 소진율·진척 편차, 버전별 변화를 시각화하고 AI가 해석한다.',
    features: ['종합현황: KPI + AI Insight 자동 생성', '원가 소진율: 계획율/소진율/진척편차/예상최종 · S-커브 · Cost 4분할', '버전별 예산: 버전 간 계정 변동 · AI 요약', 'AI 보고서(3탭 종합 생성)'],
    systems: ['LLM(AI 분석·보고서)'],
  },
  's-ai-report': {
    menu: '인사이트 · AI 레포트', title: 'AI 레포트',
    purpose: '자연어로 질문하면 LLM이 SQL로 변환해 실제 데이터를 조회, 표로 보여준다.',
    features: ['자연어 질의 → SQL 생성·실행 → 결과 표', '조건 칩(프로젝트 유형·매출귀속부문 등) 결합', 'SQL은 일반 사용자 비노출, 운영자 토글로만 표시', 'SELECT 전용 가드(쓰기·DDL·다중문 차단)'],
    systems: ['LLM → SQL', 'node:sqlite(인메모리)'],
  },
  's-custom-report': {
    menu: '인사이트 · 맞춤 레포트', title: '맞춤 레포트',
    purpose: '레포트에 담을 필드를 직접 선택해 조회한다. AI 도우미가 목적에 맞는 필드를 추천·자동 선택해준다.',
    features: ['레포트 유형·필드 선택', 'AI 도우미 채팅(필요 정보 설명 → 필드 추천/자동 선택)', '조회 결과 표'],
    systems: ['LLM(필드 추천)'],
  },
  's-system-desc': {
    menu: '시스템 설명', title: '운영 가이드 (프로세스 안내)',
    purpose: '시스템 컨셉·업무 프로세스·데이터 흐름·부서별 R&R을 설명하는 정적 안내 화면(읽기용).',
    features: ['프로젝트 운영 컨셉(As-Is → To-Be)', '프로세스: 등록 → 수행(월마감 순환) → 종료', '유관시스템 데이터 흐름(CRM·AI PMO·SCM·구매·ERP·BIX)', '유관부서 확인 필요사항(R&R)'],
    systems: ['-'],
  },
  's-monthly-close': {
    menu: '월 마감', title: '월 마감',
    purpose: '매월 말 실행예산을 현행화하고 실적을 확정해 ERP·BIX로 전송하는 마감 처리 화면.',
    features: ['당월 실행예산 현행화', '마감 중 외부 IF 일시 차단', '마감 완료 후 ERP·BIX 자동 전송'],
    systems: ['ERP', 'BIX'],
  },
  's-initiation': { menu:'착수 보고', title:'착수 보고', purpose:'프로젝트 착수 단계의 계획·리스크를 정리해 보고한다.', features:['단계별 기간·예상 소진율','전체 원가·마진 계획','리스크 사전 분석(AI)'], systems:['-'] },
  's-interim':   { menu:'중간 보고', title:'중간 보고', purpose:'단계 전환 시점의 실적 vs 계획을 비교해 보고한다.', features:['실적 vs 계획 비교','AI 초안 작성 후 PM 검토','팀장 승인 및 다음 단계 확정'], systems:['-'] },
  's-closure':   { menu:'종료 보고', title:'종료 보고', purpose:'프로젝트 종료 시 최종 원가·마진·교훈을 정리해 보고한다.', features:['단계별 실적 vs 계획','최종 원가·마진·소진율','이슈 및 교훈(AI 자동 정리)'], systems:['-'] },
  's-project-close': { menu:'프로젝트 종료', title:'프로젝트 종료', purpose:'종료선언 선행조건(구매 검수·빌링 완료 등)을 확인하고 프로젝트를 종료한다.', features:['구매 검수완료·빌링 완료 확인','종료선언(이후 청구·구매요청 불가)','종료연기(기간 연장) 결재'], systems:['POP(검수)','ERP'] },
};

// 프로젝트 관리 화면 공통 설명
['s-si-project','s-proposal-project','s-wg-project','s-internal-project','s-investment-project','s-advance-project'].forEach(id => {
  const nm = { 's-si-project':'수주형','s-proposal-project':'제안','s-wg-project':'W/G','s-internal-project':'사내','s-investment-project':'투자','s-advance-project':'선투입' }[id];
  SCREEN_DESC[id] = {
    menu: `프로젝트 · ${nm}`, title: `${nm} 프로젝트`,
    purpose: `${nm} 유형 프로젝트의 목록을 검색·조회하고, 상세 화면에서 계약·일정·예산 정보를 확인한다.`,
    features: ['유형별 프로젝트 목록·검색', '상세: 계약·일정·수행원가 연결', '수주형은 실행예산 편성과 직접 연동'],
    systems: ['CRM(계약)', 'SCM', 'POP', 'ERP'],
  };
});

// ── 원가조정 계정별 설명 (탭 + 소계정) ──
const ACCOUNT_DESC = {
  '인건비': {
    menu: '수행원가 · 원가조정 · 인건비', title: '인건비',
    purpose: 'SCM에서 확정된 인력만 예산에 반영한다. 월 MM(투입시간÷8÷근무일) × 단가로 산정하며, 실투입/이관/OT 3개 상세계정으로 나뉜다.',
    subs: ['실투입인건비 — SCM 확정 인력의 계획월별 투입확정(MM×단가)', '이관인건비 — 타 프로젝트와 주고받은 인건비(받은=실적 반영, 보낸=차감)', 'OT비 — 초과근무 수당(종업원급여-OT), 월별 금액 직접 입력'],
    systems: ['SCM(투입 확정 인력)'],
  },
  '외주비': {
    menu: '수행원가 · 원가조정 · 외주비', title: '외주비',
    purpose: '협력사 인력·계약을 6종으로 나눠 관리한다. 업체예산 1행 아래 PO N건 + 월별 검수계획 구조이며, 검수완료 시 실투입으로 확정된다.',
    subs: ['① 실투입 외주비 — 업체예산 + PO + 월별 검수', '② 전문직수수료·제안·기타', '③ 외주출장비', '④ 공사 MA', '⑤ 이관외주비(Receiver만 신규)', '⑥ 기타외주비'],
    systems: ['POP(구매·PO·검수)'],
  },
  '재료비': {
    menu: '수행원가 · 원가조정 · 재료비', title: '재료비',
    purpose: '상품 구매·감가상각·이관을 관리한다. 상품은 구매 견적 기반, 감가상각은 IT자산의 월 상각액으로 계획만 반영된다(실적 미반영).',
    subs: ['상품재료비 — 구매 견적 기반 HW/SW·상품 구매', '감가상각비 — IT자산 월 상각(713801~ 장비/Tool/공기구/시설물)', '기타·이관재료비 — 그 외 / 프로젝트 간 이관분'],
    systems: ['POP(견적·PO)', 'ERP(자산)'],
  },
  '경비': {
    menu: '수행원가 · 원가조정 · 경비', title: '경비 (예산통)',
    purpose: '예산은 중계정(예산통) 단위로 한 통이고, 사용자는 소계정 단위로 작업한다. 통제 계정은 ERP 가용예산 한도 내에서만 계획 가능(초과 시 저장 차단), 계획은 연단위로 입력한다.',
    subs: ['[통제] 의욕관리비 · 회의비 · 소모품비 · 접대비 · 교육비 등 — ERP 가용예산 한도', '[비통제] PJ운영예비비 · 기타임차료 등 — 한도 미적용(예비비 성격)', '→ 같은 통(중계정) 소계정은 가용예산을 함께 사용 (총 9개 예산통)'],
    systems: ['ERP(가용예산·실적)'],
  },
  'A/S Cost': {
    menu: '수행원가 · 원가조정 · A/S', title: 'A/S Cost',
    purpose: '무상 A/S 프로젝트의 원가를 인건/외주/재료/경비 유형별로 직접 입력해 합산한다. 본 프로젝트 종료 후 종료월에 편성된다.',
    subs: ['인건비 · 외주비(예약인건비+공사MA) · 재료비 · 경비 4~5블록 직접 입력', '합계 = 각 블록 합 (인건=인건비+간접비)'],
    systems: ['-'],
  },
};

// ── 예산관리전문 Agent(대화형) 설명 ──
const AGENT_DESC = {
  menu: '수행원가 · 원가조정', title: '예산관리전문 Agent (대화형)',
  purpose: 'AI가 어시스턴트가 아니라 예산을 직접 관리하는 "전문 Agent"다. 변경이 필요한 시점·값을 스스로 인지해 제안하고, PM은 확인 후 Y/N만 선택한다(직접 편성하지 않음).',
  features: [
    '왼쪽 「예산 조정안 · 검토 대기」 — Agent 제안 목록(계정·증감액·근거). [반영]으로 승인, [기안 →]으로 결재 상신',
    '오른쪽 「Agent와 대화하기」 — 자연어로 금액 조정·계정 조회·기안 지시 (예: "경비 300만원 줄여줘", "인건비 상세 보여줘")',
    '상단 요약 — 지금 수립 금액 · CP총액 · 계정별(인건/외주/재료/경비) 금액',
    '계정 카드/타일 클릭 = 해당 계정 상세 열람 · [수동 개입]으로만 직접 편집',
    'PM과의 대화는 계정별 변경내역 이력으로 자동 기록 · 직책자는 Agent에게 직접 질의·답변',
  ],
  systems: ['LLM(제안·질의응답)', 'SCM·POP·ERP(집행 근거)'],
};

// 현재 '계정 상세가 실제로 펼쳐졌는지'를 뷰에 맞는 신호로 판별한다(스태일 값 방지).
//   - 대화형/AI 뷰(agent·ai·sim·mini): agentAiSheetFinal(상세 시트가 열린 계정)만 유효
//   - 콘솔/편집기 뷰: budgetSetupEditAccount
//   ※ 할일 목록 하이라이트(agentTodoAcctFinal)는 '화면=그 계정'이 아니므로 쓰지 않는다.
function sdscPickAccount() {
  const keys = Object.keys(ACCOUNT_DESC);
  const av = (typeof agentViewFinal !== 'undefined') ? agentViewFinal : null;
  let acct = '';
  if (av === 'agent' || av === 'ai' || av === 'sim' || av === 'mini') {
    acct = (typeof agentAiSheetFinal !== 'undefined') ? agentAiSheetFinal : '';
  } else {
    acct = (typeof budgetSetupEditAccount !== 'undefined') ? budgetSetupEditAccount : '';
  }
  return (acct && keys.includes(acct)) ? acct : null;
}

function resolveScreenDesc() {
  const id = currentActiveScreenId();
  if (id === 's-budget') {
    const cm = (typeof costMode !== 'undefined') ? costMode : null;
    // 원가조정(Agent 기본)에서만 계정/Agent 설명을 판정한다.
    if (cm === 'adjust') {
      const acct = sdscPickAccount();
      if (acct) return ACCOUNT_DESC[acct];   // 선택된 계정 있으면 그 계정 설명
      return AGENT_DESC;                       // 없으면 전체/Agent
    }
    // 원가현황·변경이력은 일반 수행원가 설명
    return SCREEN_DESC['s-budget'];
  }
  return id ? SCREEN_DESC[id] : null;
}

function currentActiveScreenId() {
  const el = document.querySelector('.screen.active');
  return el ? el.id : null;
}

(function injectScreenDescStyle() {
  if (document.getElementById('sdsc-style')) return;
  const style = document.createElement('style');
  style.id = 'sdsc-style';
  style.textContent = `
    .sdsc-panel{position:fixed; top:64px; right:18px; width:390px; max-width:calc(100vw - 36px); max-height:calc(100vh - 90px);
      overflow:auto; background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 16px 44px rgba(20,30,60,.22);
      z-index:1200; font-family:'Noto Sans KR','Malgun Gothic',sans-serif; animation:sdscIn .18s ease;}
    @keyframes sdscIn{from{opacity:0; transform:translateY(-6px);} to{opacity:1; transform:none;}}
    .sdsc-head{display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:16px 18px 12px; border-bottom:1px solid #eef1f6;
      background:linear-gradient(135deg,#1d4ed8,#2f6bff); border-radius:14px 14px 0 0;}
    .sdsc-head .sdsc-menu{font-size:11.5px; font-weight:700; color:#bcd0ff; letter-spacing:.3px;}
    .sdsc-head .sdsc-title{font-size:18px; font-weight:900; color:#fff; margin-top:3px; line-height:1.3;}
    .sdsc-x{background:rgba(255,255,255,.18); border:none; color:#fff; width:28px; height:28px; border-radius:8px; font-size:16px; cursor:pointer; flex-shrink:0;}
    .sdsc-x:hover{background:rgba(255,255,255,.3);}
    .sdsc-body{padding:16px 18px 18px;}
    .sdsc-sec{margin-bottom:14px;}
    .sdsc-lbl{font-size:11.5px; font-weight:800; color:#1d4ed8; text-transform:uppercase; letter-spacing:.4px; margin-bottom:6px;}
    .sdsc-purpose{font-size:14px; color:#374151; line-height:1.65;}
    .sdsc-feats{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px;}
    .sdsc-feats li{font-size:13px; color:#374151; line-height:1.5; padding-left:16px; position:relative;}
    .sdsc-feats li::before{content:''; position:absolute; left:2px; top:7px; width:6px; height:6px; border-radius:50%; background:#2f6bff;}
    .sdsc-sys{display:flex; flex-wrap:wrap; gap:6px;}
    .sdsc-sys span{font-size:11.5px; font-weight:700; color:#1e40af; background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:3px 10px;}
    .sdsc-empty{font-size:13.5px; color:#6b7280; line-height:1.6;}
    .tb-guide.tb-desc-on{background:#1d4ed8 !important; color:#fff !important; border-color:#1d4ed8 !important;}
    .tb-guide.tb-desc-on .tb-guide-ic{filter:none;}
  `;
  document.head.appendChild(style);
})();

function closeScreenDesc() {
  const p = document.getElementById('sdsc-panel');
  if (p) p.remove();
  document.querySelectorAll('.tb-desc-on').forEach(b => b.classList.remove('tb-desc-on'));
  document.removeEventListener('keydown', sdscEsc);
}
function sdscEsc(e) { if (e.key === 'Escape') closeScreenDesc(); }

function toggleScreenDesc(btn) {
  const existing = document.getElementById('sdsc-panel');
  if (existing) { closeScreenDesc(); return; }

  const id = currentActiveScreenId();
  const d = resolveScreenDesc();

  const panel = document.createElement('div');
  panel.id = 'sdsc-panel';
  panel.className = 'sdsc-panel';

  if (d) {
    panel.innerHTML = `
      <div class="sdsc-head">
        <div>
          <div class="sdsc-menu">${d.menu || '화면 설명'}</div>
          <div class="sdsc-title">${d.title}</div>
        </div>
        <button class="sdsc-x" onclick="closeScreenDesc()" aria-label="닫기">✕</button>
      </div>
      <div class="sdsc-body">
        <div class="sdsc-sec"><div class="sdsc-lbl">이 화면은</div><div class="sdsc-purpose">${d.purpose}</div></div>
        ${d.subs && d.subs.length ? `<div class="sdsc-sec"><div class="sdsc-lbl">탭 · 소계정</div><ul class="sdsc-feats">${d.subs.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
        ${d.features && d.features.length ? `<div class="sdsc-sec"><div class="sdsc-lbl">주요 기능</div><ul class="sdsc-feats">${d.features.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
        ${d.systems && d.systems.length && d.systems[0] !== '-' ? `<div class="sdsc-sec"><div class="sdsc-lbl">연계 시스템</div><div class="sdsc-sys">${d.systems.map(s => `<span>${s}</span>`).join('')}</div></div>` : ''}
      </div>`;
  } else {
    panel.innerHTML = `
      <div class="sdsc-head">
        <div><div class="sdsc-menu">화면 설명</div><div class="sdsc-title">${id || '현재 화면'}</div></div>
        <button class="sdsc-x" onclick="closeScreenDesc()" aria-label="닫기">✕</button>
      </div>
      <div class="sdsc-body"><div class="sdsc-empty">이 화면의 상세 설명은 준비 중입니다. 상단 메뉴로 주요 화면(수행원가·인사이트·프로젝트 등)으로 이동하면 설명을 볼 수 있어요.</div></div>`;
  }

  document.body.appendChild(panel);
  if (btn && btn.classList) btn.classList.add('tb-desc-on');
  setTimeout(() => document.addEventListener('keydown', sdscEsc), 0);
  setTimeout(() => {
    document.addEventListener('click', function outside(e) {
      const p = document.getElementById('sdsc-panel');
      if (!p) { document.removeEventListener('click', outside); return; }
      if (!p.contains(e.target) && !(btn && btn.contains(e.target))) { closeScreenDesc(); document.removeEventListener('click', outside); }
    });
  }, 0);
}
