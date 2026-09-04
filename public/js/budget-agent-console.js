// AI GUIDE: 수행원가 > 원가조정 — 예산관리전문Agent 콘솔입니다.
//
// [2026.08.27 위클리 피드백 반영]
// 컨셉 전환: AI는 "어시스턴트"가 아니라 예산을 직접 관리하는 "예산관리전문Agent"입니다.
//   1) Agent가 예산 변경이 필요한 시점과 값을 스스로 인지해 제안합니다.
//   2) PM은 제안을 눈으로 확인하고 Y/N만 선택합니다(직접 편성하지 않습니다).
//   3) 실행예산 변경 기안 시, Agent가 PM과의 대화를 계정별 변경내역 이력으로 남깁니다.
//   4) 직책자는 PM에게 묻지 않고 Agent에게 질의하고 답변받습니다.
//   5) Agent는 스스로 판단한 변경값을 근거로 타 사용자 질의에도 응답합니다.
//   6) PM은 더 이상 예산을 관리하지 않습니다 → 계정 편집기는 열람 전용 + [수동 개입]으로만.
//   7) PM이 보는 리포트 수준도 "내가 만든 예산"이 아니라 "Agent가 한 일"로 바뀝니다.
//
// 이 파일은 원가조정 화면의 표현만 소유하고, 금액 계산은 기존 budgetRollupFinal 등을 그대로 씁니다.
// 화면 골격 3안을 모두 넣고 상단 스위치로 전환해 비교할 수 있게 했습니다(agentViewFinal).

/* ==========================================================================
   1. Agent 상태 · 제안 · 이력 목업 데이터
   ========================================================================== */

// Agent가 감지한 예산 변경 제안.
// status: pending(PM 검토) | submitted(직책자 결재 대기) | confirmed(승인) | returned(반려·재기안 대기) | rejected(PM 반려)
//
// [2026.08.31] 금액은 하드코딩하지 않고 legs 의 delta 만 갖습니다.
//   변경 전 금액은 매 렌더에서 계정별 실제 수립 예산(budgetRollupFinal)에서 가져오므로,
//   화면 어디서 보든 상세 내역과 숫자가 항상 일치합니다.  → agentSyncProposalsFinal()
var AGENT_PROPOSALS_FINAL = [
  {
    id: 'ap-01', acct: '인건비', status: 'pending', confidence: 0.96,
    detectedAt: '2026-08-27 09:12', trigger: 'SCM 인력 확정(승인) 수신',
    title: 'SCM에서 확정된 인력 2명을 인건비에 추가 편성해야 합니다',
    legs: [{ acct: '인건비', delta: 70000000 }],
    why: 'SCM에서 투입계획이 확정(승인)된 인력 2명 · 11.0MM이 I/F로 수신되었습니다. 인건비 예산에 등록하지 않으면 실제 투입 시점에 집행할 예산이 없습니다.',
    evidence: [
      '김도윤 P4 · 6.0MM · 2026-09 ~ 2027-01 · 단가 7,500,000원 → 45,000,000원',
      '박서연 P3 · 5.0MM · 2026-09 ~ 2027-01 · 단가 5,000,000원 → 25,000,000원',
      'SCM 확정 상태 · 승인일 2026-08-26 · I/F 수신 2026-08-27 09:05',
    ],
    persons: [
      { name: '김도윤', grade: 'P4', org: 'NOVA PMO팀', role: 'PM/분석설계',
        mm: 6.0, period: '2026-09 ~ 2027-01', unit: 7500000, amount: 45000000 },
      { name: '박서연', grade: 'P3', org: 'AX 개발1팀', role: 'Vue Front',
        mm: 5.0, period: '2026-09 ~ 2027-01', unit: 5000000, amount: 25000000 },
    ],
    monthly: [
      { m: '2026-09', delta: 14000000 }, { m: '2026-10', delta: 14000000 },
      { m: '2026-11', delta: 14000000 }, { m: '2026-12', delta: 14000000 },
      { m: '2027-01', delta: 14000000 },
    ],
    impact: '인건비 CP한도(800,000,000원) 이내이며, 전 계정 합계도 CP총액을 넘지 않습니다.',
  },
  {
    id: 'ap-02', acct: '인건비', status: 'pending', confidence: 0.87,
    detectedAt: '2026-08-27 09:12', trigger: 'SCM 투입계획 변경',
    leaves: [
      { name: '이서준', org: 'AX 개발2팀', role: '설계', grade: 'P3', unit: 5000000,
        start: '2026-04-01', end: '2026-10-31', newEnd: '2026-09-30', mm: 1.0, amount: 5000000 },
      { name: '정하윤', org: 'AX 개발1팀', role: '설계', grade: 'P2', unit: 5000000,
        start: '2026-04-01', end: '2026-10-31', newEnd: '2026-09-30', mm: 1.0, amount: 5000000 },
    ],
    title: '설계 인력 2명이 예정보다 1개월 조기 철수합니다',
    legs: [{ acct: '인건비', delta: -10000000 }],
    why: 'SCM에서 이서준 P3, 정하윤 P2의 투입 종료가 10월 → 9월로 변경 수신되었습니다. 10월 인건비 계획 10,000,000원이 집행되지 않습니다.',
    evidence: [
      '이서준 P3 · 투입종료 2026-10-31 → 2026-09-30 (1.0MM 감소 · 단가 5,000,000원 → 5,000,000원)',
      '정하윤 P2 · 투입종료 2026-10-31 → 2026-09-30 (1.0MM 감소 · 단가 5,000,000원 → 5,000,000원)',
      '10월 인건비 계획 18,236,842원 중 해당 인력분 10,000,000원',
    ],
    monthly: [{ m: '2026-10', delta: -10000000 }],
    impact: '감액분 10,000,000원은 CP총액 여유로 환원됩니다. 잔여 인력의 투입계획에는 영향이 없습니다.',
  },
  {
    id: 'ap-03', acct: '외주비', status: 'pending', confidence: 0.94,
    detectedAt: '2026-08-27 09:12', trigger: '구매견적 수신 (PO 발행 전)',
    title: '현재 예산으로는 4분기 확정 견적대로 구매할 수 없습니다',
    legs: [{ acct: '외주비', delta: 10000000 }],
    why: '확정된 견적 30,000,000원을 지금 예산으로는 계약할 수 없습니다. 아크로디자인랩 4분기 계획 라인 12,000,000원에 업체 미계획 잔액 8,000,000원을 합쳐도 20,000,000원이라 10,000,000원이 모자랍니다. 예산을 먼저 올려야 그 견적대로 구매를 진행할 수 있습니다.',
    evidence: [
      '구매시스템 견적확정 I/F 수신 · 2026-08-27 09:05 · 아크로디자인랩 30,000,000원 (2026-10-01 ~ 12-31)',
      '해당 외주구매 계획 라인 12,000,000원 + 업체 미계획 잔액 8,000,000원 = 20,000,000원',
      '부족액 10,000,000원 — 예산을 올리기 전에는 구매를 진행할 수 없습니다',
    ],
    monthly: [{ m: '2026-10', delta: 4000000 }, { m: '2026-11', delta: 3000000 }, { m: '2026-12', delta: 3000000 }],
    impact: '외주비 CP한도(1,200,000,000원) 이내입니다. 승인하시면 확정된 견적대로 구매를 진행할 수 있습니다.',
  },
  {
    // [2026.08.31] 실적은 릴리즈된 예산 한도 안에서만 발생합니다(집행 시점에 가용예산 체크).
    //   → Agent가 감지하는 것은 "이미 초과한 실적"이 아니라 "집행 전에 확보해야 할 부족액"입니다.
    id: 'ap-04', acct: '경비', status: 'pending', confidence: 0.98, urgent: true,
    detectedAt: '2026-08-31 09:10', trigger: 'ERP 가용예산 체크 (집행 전)',
    title: '연말 행사비를 집행하려면 경비 예산 600,000원을 먼저 확보해야 합니다',
    legs: [{ acct: '경비', delta: 600000 }],
    why: '지금 남은 예산으로는 연말 행사비까지 쓸 수 없습니다. 의욕관리비 26년 예산 10,600,000원에서 7~8월에 300,000원을 썼으니 남은 금액은 10,300,000원인데, 9~12월에 쓸 예정이 연말 행사비 4,000,000원을 포함해 10,900,000원입니다. 부족한 600,000원을 먼저 확보해야 12월에 집행할 수 있습니다.',
    evidence: [
      '의욕관리비 26년 릴리즈 예산 10,600,000원 · 7~8월 실적 300,000원 → 잔여 가용 10,300,000원',
      '9~12월 집행 예정 6,900,000원 + 연말 행사비 추가 소요 4,000,000원 = 10,900,000원',
      '부족액 600,000원 — 확보하기 전에는 12월 집행이 승인되지 않습니다',
    ],
    monthly: [{ m: '2026-12', delta: 600000 }],
    breakdown: {
      title: '9~12월 집행 예정액 산출 근거',
      rows: [
        { label: '9월 · 정기 조직활동비', amount: 1900000, src: '수립 계획 (확정)' },
        { label: '10월 · 정기 조직활동비', amount: 1900000, src: '수립 계획 (확정)' },
        { label: '11월 · 정기 조직활동비', amount: 1900000, src: '수립 계획 (확정)' },
        { label: '12월 · 정기 조직활동비', amount: 1200000, src: '수립 계획 (확정)' },
        { label: '12월 · 연말 행사비', amount: 4000000, src: '조직장 요청 접수 2026-08-29 · 미편성' },
      ],
      total: 10900000,
      availLabel: '26년 릴리즈 예산 10,600,000원 − 7~8월 실적 300,000원',
      avail: 10300000,
      short: 600000,
    },
    impact: '경비 CP한도(100,000,000원) 이내입니다. 확보하지 않으면 12월 행사비 집행이 불가합니다.',
  },
  {
    // [2026.08.31] 계정 간 이관 — 총액 변동 ±0원. 직책자가 "왜?"를 묻게 되는 케이스입니다.
    id: 'ap-05', acct: '재료비', status: 'pending', confidence: 0.83, transfer: true,
    detectedAt: '2026-08-31 09:10', trigger: '집행 추세 분석 (월 마감 실적)',
    title: '재료비 10,000,000원을 외주비로 이관해야 합니다 (총액 변동 없음)',
    legs: [{ acct: '재료비', delta: -10000000 }, { acct: '외주비', delta: 10000000 }],
    why: '외주비 부족액 10,000,000원을 CP 여유가 아니라 재료비 여유분에서 옮겨 메우는 방법입니다. 재료비는 집행률 22.0%로 잔여 기간 대비 계획이 과다합니다. 금액은 1안과 같고 재원만 다릅니다 — 총액이 그대로라 CP총액을 건드리지 않습니다.',
    items: [
      { name: 'DB 서버 2식', kind: 'H/W', amount: 62000000, plan: '2026-09 발주 · 10월 검수 예정' },
      { name: '스토리지 증설', kind: 'H/W', amount: 48000000, plan: '2026-10 발주 · 11월 검수 예정' },
      { name: 'DBMS 라이선스', kind: 'S/W', amount: 30000000, plan: '2026-11 발주 · 12월 검수 예정' },
    ],
    cycle: {
      pick: '분기',
      why: '3건 모두 발주와 검수가 같은 분기 안에서 끝납니다. 월별로 잡으면 발주·검수 시차 때문에 월 편차가 커지고, 반기로 잡으면 4분기 집행이 한 번에 몰려 보입니다. Agent는 과거 12개 프로젝트의 H/W·S/W 검수 리드타임(평균 32일)을 학습해 분기 인식을 제안합니다.',
    },
    evidence: [
      '확정 구매 3건 합계 140,000,000원 = 변경 후 재료비 계획과 일치 (나머지 10,000,000원은 미확정분)',
      '재료비 · 계획 150,000,000원 · 실적 33,000,000원 · 잔여 기간 대비 10,000,000원 과다',
      '외주비 · 확정 견적 30,000,000원 대비 가용 20,000,000원 — 부족액 10,000,000원 (1안과 같은 금액)',
      '이관 후에도 재료비 CP한도(160,000,000원) · 외주비 CP한도(1,200,000,000원) 모두 이내',
      '예산은 연단위로 릴리즈되므로 26년 릴리즈분 안에서 계정 간에만 옮깁니다',
    ],
    monthly: [],
    impact: 'CP총액과 전체 수립 예산은 변하지 않습니다(±0원). 외주비 부족액 10,000,000원을 재료비에서 옮겨 메웁니다.',
  },
];

// Agent가 PM 확인 없이 스스로 반영한 내역 — 총액이 바뀌지 않는 조정만 자율처리합니다.
// (총액이 바뀌는 변경은 반드시 PM 검토 → 기안을 거칩니다)
var AGENT_AUTO_FINAL = [
  { at: '2026-08-25 09:05', acct: '인건비', what: '월별 배분 보정', detail: '8월 실적 확정에 맞춰 9~12월 인건비 계획을 재배분했습니다(총액 650,000,000원 불변).' },
  { at: '2026-08-26 18:40', acct: '외주비', what: '미계획 잔액 균등 배분', detail: '아크로디자인랩 미계획 8,000,000원을 잔여 6개월에 월 1,333,333원씩 배분했습니다.' },
  { at: '2026-08-27 09:12', acct: '재료비', what: '월별 배분 재조정', detail: '8월 실적 확정에 맞춰 9~11월 계획을 재배분했습니다(총액 150,000,000원 불변).' },
  { at: '2026-08-26 18:40', acct: 'A/S Cost', what: '반올림 보정', detail: '상세계정 비율 배분에서 생긴 1원 차이를 마지막 월에 보정했습니다.' },
];

// 계정별 변경내역 이력 — 항목 3) Agent와 PM의 대화가 근거로 함께 남습니다.
var AGENT_LOG_FINAL = [
  {
    at: '2026-08-26 14:22', acct: '외주비', actor: '이봄(PM)', decision: 'approved',
    from: 848000000, to: 868000000,
    reason: 'Agent 제안 승인 — 2분기 PO 검수 차액 사전 확보',
    dialog: [
      { who: 'pm', text: '외주비를 왜 2천만원 올려야 해요?' },
      { who: 'agent', text: '2분기 PO 45000091의 검수 예정액이 견적보다 20,000,000원 많습니다. 검수(집행) 시점에 가용예산을 체크하므로, 계획을 먼저 올리지 않으면 검수가 진행되지 않습니다.' },
      { who: 'pm', text: '다른 계정에서 당겨올 수는 없나요?' },
      { who: 'agent', text: '가능합니다. 다만 CP총액 여유가 539,889,089원 남아 있어 이관 없이 증액하는 편이 통제상 단순합니다. 이관을 원하시면 재료비에서 20,000,000원을 옮기는 안을 만들어 드리겠습니다.' },
      { who: 'pm', text: '그냥 증액으로 갑시다.' },
    ],
  },
  {
    at: '2026-08-24 11:05', acct: '경비', actor: '이봄(PM)', decision: 'rejected',
    from: 25000000, to: 28200000,
    reason: '반려 — 하반기 집행 계획이 아직 확정되지 않아 보류',
    dialog: [
      { who: 'agent', text: '조직관리비 27년 계획이 ERP 가용예산보다 3,200,000원 부족합니다. 증액을 제안합니다.' },
      { who: 'pm', text: '27년 조직 개편안이 아직 안 나왔어요. 다음 달에 다시 봅시다.' },
      { who: 'agent', text: '보류로 기록했습니다. 9월 말 ERP 가용예산 갱신 시점에 다시 감지해 알려드리겠습니다.' },
    ],
  },
];

// 항목 4)·5) — 직책자/타 사용자가 PM이 아니라 Agent에게 직접 질의한 기록
var AGENT_QA_FINAL = [
  {
    at: '2026-08-27 08:40', asker: '박정우 담당임원',
    q: '외주비가 지난주보다 늘어난 이유가 뭔가요?',
    a: '3분기 PO 2건(45000104, 45000119)이 신규 수신되어 36,750,000원 증액을 제안한 상태입니다. 아직 PM 승인 대기이며, 승인되면 외주비 계획은 902,000,000원이 됩니다. CP총액 한도는 넘지 않습니다.',
  },
  {
    at: '2026-08-26 17:10', asker: '최민서 팀장',
    q: '이 프로젝트 예산이 CP총액을 넘을 위험이 있나요?',
    a: '현재 수립 1,743,000,000원 / CP총액 2,310,000,000원으로 여유 567,000,000원입니다. 대기 중인 제안을 모두 승인해도 486,300,000원이 남아 초과 위험은 없습니다.',
  },
];

/* ==========================================================================
   2. 상태
   ========================================================================== */

// [2026.08.31] 기본 화면은 ⑤ 간소화(검토자 화면). 다른 안은 상단 스위치로 전환합니다.
var agentViewFinal = 'agent';          // 'draft' | 'tabs' | 'console' | 'legacy' | 'split' | 'mini' | 'sim' | 'ai' | 'agent'
var agentSimEnteredFinal = false;      // 6안 첫 진입에 한 번 계정 선택을 비웁니다
var agentSimPjtSeenFinal = '';         // 6안에서 마지막으로 본 프로젝트
var agentSimAcctPickedFinal = false;   // 계정 행을 사용자가 직접 눌렀는지
var agentTabFinal = 'proposal';        // 'proposal' | 'history' | 'draft'
var agentOpenProposalFinal = '';  // 펼쳐진 제안 (기본: 전부 접힘)
var agentAskDraftFinal = {};           // 제안별 PM 입력 중인 질문
var agentManualUnlockFinal = {};       // 항목 6) 수동 개입으로 잠금 해제한 계정
var agentLastCheckFinal = '2026-08-27 09:12';

// [2026.08.27 위클리 피드백 반영 #2] 계정 안내 순서는 항상 인건비 → 외주비 → 재료비 → 경비 → A/S비.
function agentAcctOrderFinal(acct) {
  const i = CATS.indexOf(acct);
  return i < 0 ? 99 : i;
}
function agentByAcctFinal(list) {
  return list.slice().sort((a, b) => agentAcctOrderFinal(a.acct) - agentAcctOrderFinal(b.acct));
}
function agentProposalsFinal(status) {
  const list = status ? AGENT_PROPOSALS_FINAL.filter(p => p.status === status) : AGENT_PROPOSALS_FINAL;
  return agentByAcctFinal(list);
}
function agentFindProposalFinal(id) {
  return AGENT_PROPOSALS_FINAL.find(p => p.id === id) || null;
}
function agentWonFinal(v) {
  return fmt(Math.round(Number(v || 0))) + '원';
}
function agentDeltaFinal(v) {
  const n = Math.round(Number(v || 0));
  return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)) + '원';
}
function agentAcctColorFinal(acct) {
  return ({ '인건비': 'a-blue', '외주비': 'a-red', '재료비': 'a-yellow', '경비': 'a-green', 'A/S Cost': 'a-sky' })[acct] || 'a-blue';
}

/* ==========================================================================
   3. 액션 — PM은 Y/N만, 대화는 이력으로
   ========================================================================== */

function agentSetViewFinal(view) {
  if (view !== 'mini') agentMiniEnteredFinal = false;   // 5안을 벗어나면 다음 진입 때 다시 비웁니다
  if (view !== 'sim' && view !== 'ai' && view !== 'agent') {
    agentSimAcctPickedFinal = false;
    const sc = document.getElementById('s-budget');
    if (sc && sc.style.overflow) sc.style.overflow = '';
    if (document.body) document.body.classList.remove('agent-sim-on');
  }
  if (view !== 'sim') agentSimEnteredFinal = false;
  // 6안의 기본 화면은 전체 계정 표입니다 — URL로 계정이 지정돼 있어도 표부터 보여 줍니다.
  if (view === 'sim' && agentViewFinal !== 'sim') budgetSetupEditAccount = null;
  agentViewFinal = view;
  renderBudgetPage();
}
function agentSetTabFinal(tab) { agentTabFinal = tab; renderBudgetPage(); }
function agentToggleProposalFinal(id) {
  agentOpenProposalFinal = agentOpenProposalFinal === id ? '' : id;
  renderBudgetPage();
}

// 항목 2) PM은 Y/N만 선택합니다. 승인분은 기안 대기로 넘어갑니다(즉시 반영이 아니라 기안·결재를 거칩니다).
/* ── [2026.08.31] 반려(N) 확인 팝업 — 누르면 Agent 제안이 목록에서 사라집니다 ── */
var agentRejectAskIdFinal = '';
function agentRejectAskOpenFinal(id) { agentRejectAskIdFinal = id; renderBudgetPage(); }
function agentRejectAskCloseFinal() { agentRejectAskIdFinal = ''; renderBudgetPage(); }
function agentRejectConfirmFinal() {
  const id = agentRejectAskIdFinal;
  agentRejectAskIdFinal = '';
  if (id) agentDecideFinal(id, 'rejected');
  else renderBudgetPage();
}
function renderAgentRejectAskFinal() {
  if (!agentRejectAskIdFinal) return '';
  const p = agentFindProposalFinal(agentRejectAskIdFinal);
  if (!p) return '';
  const delta = agentNetFinal(p);
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentRejectAskCloseFinal()">
      <div class="agv-pop narrow" role="dialog" aria-modal="true" aria-label="반려 확인">
        <div class="agv-pop-head">
          <div>
            <strong>"Agent" 제안 내역이 사라집니다.</strong>
            <span>반려하면 이 제안은 해야 할 일 목록에서 없어집니다. Agent가 다음 감지 시점에 다시 검토합니다.</span>
          </div>
          <button class="agv-pop-x" onclick="agentRejectAskCloseFinal()">✕</button>
        </div>
        <div class="agv-pop-body">
          <div class="agv-item">
            <span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
            <b>${escHtml(p.title)}</b>
            <em class="agm-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'}">${delta === 0 ? '±0원' : agentDeltaFinal(delta)}</em>
          </div>
        </div>
        <div class="agv-pop-foot">
          <button class="agv-ok" onclick="agentRejectConfirmFinal()">확인</button>
          <button class="agv-cancel" onclick="agentRejectAskCloseFinal()">닫음</button>
        </div>
      </div>
    </div>`;
}

function agentDecideFinal(id, decision) {
  const p = agentFindProposalFinal(id);
  if (!p) return;
  p.status = decision;
  p.decidedAt = '2026-08-27 09:40';
  AGENT_LOG_FINAL.unshift({
    at: p.decidedAt, acct: p.acct, actor: '이봄(PM)', decision,
    from: p.from, to: p.to,
    reason: (decision === 'approved' ? 'Agent 제안 승인 — ' : '반려 — ') + p.title,
    dialog: (p.dialog || []).slice(),
  });
  showToast(decision === 'approved'
    ? `${p.acct} 제안을 검토 완료했습니다. [기안·결재]에서 직책자에게 올릴 기안에 포함됩니다.`
    : `${p.acct} 제안을 반려했습니다. Agent가 다음 감지 시점에 다시 검토합니다.`);
  renderBudgetPage();
}

// 항목 3) 제안별 PM ↔ Agent 대화. 실제 답변은 /api/chat, 실패하면 제안 데이터로 만든 근거 답변을 씁니다.
function agentAskFinal(id) {
  const p = agentFindProposalFinal(id);
  const el = document.getElementById('agent-ask-' + id);
  const q = el ? el.value.trim() : '';
  if (!p || !q) { showToast('Agent에게 물어볼 내용을 입력하세요.'); return; }
  p.dialog = p.dialog || [];
  p.dialog.push({ who: 'pm', text: q });
  if (el) el.value = '';

  // [2026.09.02] 계정 상세의 대화도 "근거 창구"입니다 — 앞으로의 계획을 남기면
  //   질문 답변이 아니라 계획을 실제로 늘리고, 그 결과를 이 대화에 적습니다.
  const ev = (typeof agentReadEvidenceFinal === 'function') ? agentReadEvidenceFinal(q, id) : null;
  if (ev) {
    const r = agentAddEvidenceProposalFinal(ev);
    const who = r.ev.all ? `확정 견적 ${r.vendors.length}개 업체` : r.ev.targets.map(v => v.vendor).join(', ');
    const msg = `${who}의 확정 견적 단가를 그대로 적용해 ${r.ev.toQ}분기까지 계획 라인을 이어 붙였습니다. `
      + `이 제안이 ${fmt(r.before)}원 → ${fmt(r.total)}원(${agentDeltaFinal(r.added)})으로 늘었습니다 — `
      + `제안을 나누지 않았으니 한 번만 기안하시면 ${r.ev.toQ}분기까지 계획이 함께 수립됩니다. `
      + `견적이 실제로 확정되면 확정 금액으로 다시 계산해 차액만 알려드리겠습니다.`;
    p.dialog.push({ who: 'agent', text: msg });
    AGENT_CHAT_FINAL.push({ who: 'pm', text: q });
    AGENT_CHAT_FINAL.push({ who: 'agent', text: msg });
    showToast(`대화를 근거로 외주비 계획을 ${r.ev.toQ}분기까지 늘렸습니다 — ${fmt(r.total)}원 (기안 1건)`);
    renderBudgetPage();
    return;
  }

  p.dialog.push({ who: 'agent', text: '…' , pending: true });
  renderBudgetPage();

  const finish = (text) => {
    const slot = p.dialog.find(d => d.pending);
    if (slot) { slot.text = text; delete slot.pending; }
    renderBudgetPage();
  };
  const local = `${p.acct} 제안 근거입니다. ${p.why} 금액은 ${agentWonFinal(p.from)} → ${agentWonFinal(p.to)}(${agentDeltaFinal(p.to - p.from)})이며, ${p.impact}`;

  fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: `[예산관리Agent] ${p.acct} 예산 변경 제안에 대한 PM 질문: ${q}\n제안 근거: ${p.why}\n금액: ${p.from} → ${p.to}\n영향: ${p.impact}`,
    }),
  })
    .then(r => r.json())
    .then(j => finish((j && j.answer) ? j.answer : local))
    .catch(() => finish(local));
}

// 항목 4)·5) 직책자 질의 — Agent가 자기 판단값을 근거로 답합니다.
function agentQaSendFinal() {
  const el = document.getElementById('agent-qa-input');
  const q = el ? el.value.trim() : '';
  if (!q) { showToast('질의 내용을 입력하세요.'); return; }
  const pend = agentProposalsFinal('pending');
  const appr = agentProposalsFinal('approved');
  const local = `현재 Agent가 감지한 대기 제안 ${pend.length}건, 승인 완료 ${appr.length}건입니다. `
    + (pend.length ? `가장 큰 항목은 ${pend[0].acct} ${agentDeltaFinal(pend[0].to - pend[0].from)}이며, ${pend[0].impact}` : '추가 변경 요인은 감지되지 않았습니다.');
  const row = { at: '2026-08-27 09:40', asker: '질의자', q, a: '…', pending: true };
  AGENT_QA_FINAL.unshift(row);
  if (el) el.value = '';
  renderBudgetPage();

  fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: `[예산관리Agent] 직책자 질의: ${q}\n대기 제안: ${JSON.stringify(pend.map(p => ({ 계정: p.acct, 변경: p.to - p.from, 근거: p.title })))}` }),
  })
    .then(r => r.json())
    .then(j => { row.a = (j && j.answer) ? j.answer : local; delete row.pending; renderBudgetPage(); })
    .catch(() => { row.a = local; delete row.pending; renderBudgetPage(); });
}

// 항목 6) 기본은 열람 전용. 예외 상황에만 PM이 직접 개입하고, 그 사실이 이력에 남습니다.
// [2026.08.31] 4안에서 예산내역·수동 개입은 전체폭이 필요합니다 — 누르는 순간 그 칸을 넓힙니다.
function agentBudgetPaneFullFinal() {
  if (agentViewFinal !== 'split' && agentViewFinal !== 'sim') return;
  if (agentPaneStateMapFinal.budget === 'full') return;
  AGENT_PANES_FINAL.forEach(k => { if (agentPaneStateMapFinal[k] === 'full') agentPaneStateMapFinal[k] = 'normal'; });
  agentPaneStateMapFinal.budget = 'full';
}
function agentBudgetFullOpenFinal(acct) {
  agentSimAcctPickedFinal = true;        // 사용자가 직접 고른 것입니다
  agentBudgetPaneFullFinal();
  openBudgetAccountEditor(acct);
}
function agentBudgetFullManualFinal(acct) {
  agentBudgetPaneFullFinal();
  agentToggleManualFinal(acct);
}

/* ── [2026.09.02] 반려 알림 ────────────────────────────────────────────────
   반려 사유를 [해야 할 일] 줄에 붙이면 목록이 무거워지고, 매번 눈에 밟힙니다.
   PM이 다시 접속했을 때 한 번 알려 주고, 상세는 결재 이력에서 보게 합니다. */
var AGENT_RETURN_NOTICE_FINAL = [];      // 아직 PM이 확인하지 않은 반려 건
function agentReturnNoticePendingFinal() {
  return AGENT_RETURN_NOTICE_FINAL.filter(n => !n.seen);
}
function agentReturnNoticeAckFinal(go) {
  AGENT_RETURN_NOTICE_FINAL.forEach(n => { n.seen = true; });
  if (go) agentHistOpenFinal('approval');
  else renderBudgetPage();
}
function renderAgentReturnNoticeFinal() {
  if (agentIsExecFinal()) return '';
  const list = agentReturnNoticePendingFinal();
  if (!list.length) return '';
  const n = list[0];
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentReturnNoticeAckFinal(false)">
      <div class="agv-pop narrow" role="dialog" aria-modal="true" aria-label="반려 알림">
        <div class="agv-pop-head">
          <div>
            <strong>↩ 기안 ${escHtml(n.no)}이 반려되었습니다</strong>
            <span>${escHtml(n.actor)} · ${escHtml(n.at)}</span>
          </div>
          <button class="agv-pop-x" onclick="agentReturnNoticeAckFinal(false)">✕</button>
        </div>
        <div class="agv-pop-body">
          <div class="agrn-reason">
            <b>반려 코멘트</b>
            <p>${escHtml(n.reason)}</p>
          </div>
          <div class="agrn-items">
            <b>되돌아온 항목 ${n.items.length}건</b>
            ${n.items.map(i => `
              <div class="agrn-item">
                <span class="agp-acct sm ${agentAcctColorFinal(i.acct)}">${i.acct}</span>
                <em>${escHtml(i.title)}</em>
                <i class="${i.delta > 0 ? 'up' : i.delta < 0 ? 'down' : ''}">${i.delta === 0 ? '±0원' : agentDeltaFinal(i.delta)}</i>
              </div>`).join('')}
          </div>
          <p class="agrn-hint">이 항목들은 [해야 할 일]로 되돌아가 있습니다. 변경 전/후와 판단 근거는 결재 이력에서 볼 수 있습니다.</p>
        </div>
        <div class="agv-pop-foot">
          <button class="agv-ok" onclick="agentReturnNoticeAckFinal(true)">결재 이력 보기</button>
          <button class="agv-cancel" onclick="agentReturnNoticeAckFinal(false)">확인</button>
        </div>
      </div>
    </div>`;
}

/* [2026.09.02] 수동 개입 근거 ─────────────────────────────────────────────
   PM이 직접 고친 이유는 PM 머릿속에만 남습니다. 그 근거를 여기서 받아 두면
   ① Agent가 다음 편성 제안의 근거로 쓰고 ② 직책자·담당자가 PM에게 묻지 않고
   Agent에게 물어 확인할 수 있습니다. */
var agentManualReasonFinal = {};        // { 계정: { text, at, by } }
var AGENT_MANUAL_PRESET_FINAL = [
  '고객 요청으로 범위가 바뀌어 계획을 먼저 반영했습니다',
  'SCM 확정 전이지만 투입이 확실해 선반영했습니다',
  '견적이 아직 안 왔지만 직전 분기와 같은 조건으로 잡았습니다',
  '상세 내역은 PM에게 문의해 주세요',
];
function agentManualReasonSetFinal(acct, text) {
  const t = String(text || '').trim();
  if (!t) { showToast('수동 개입 근거를 입력해 주세요.'); return false; }
  agentManualReasonFinal[acct] = { text: t, at: '2026-09-02 11:20', by: '이봄(PM)' };
  return true;
}
function agentManualReasonSaveFinal(acct) {
  const el = document.getElementById('agent-manual-why-' + acct);
  if (!agentManualReasonSetFinal(acct, el ? el.value : '')) return;
  AGENT_LOG_FINAL.unshift({
    at: agentManualReasonFinal[acct].at, acct, actor: '이봄(PM)', decision: 'manual',
    reason: `수동 개입 근거 — ${agentManualReasonFinal[acct].text}`,
    dialog: [{ who: 'agent', text: '근거를 기록했습니다. 다음 편성 제안에 반영하고, 직책자 질의에도 이 내용으로 답하겠습니다.' }],
  });
  agentManualSyncProposalFinal(acct);
  showToast(`${acct} 수동 개입 근거를 기록했습니다. 직책자·담당자가 Agent에게 물어 확인할 수 있습니다.`);
  renderBudgetPage();
}
function agentManualPresetFinal(acct, i) {
  const el = document.getElementById('agent-manual-why-' + acct);
  if (!el) return;
  el.value = AGENT_MANUAL_PRESET_FINAL[i] || '';
  el.focus();
}

/* [2026.09.03] 수동 개입 편집 ──────────────────────────────────────────────
   PM이 계정의 월별 계획을 직접 고칩니다.
   · 기준값(base) = 현재 계획 + 반영 대상 Agent 제안
   · 고친 차액은 [해야 할 일]에 ✎ 수동 개입 항목으로 따로 올라갑니다 (요구 2)
   · 기안하면 계정 한 줄로 합쳐져 승인자에게는 구분 없이 갑니다 (요구 3)
   최초 편성(차세대 여신심사)과 수행 중(예산관리시스템 목업용)에 같은 방식으로 붙습니다. */
var agentViewDataCacheFinal = null;
var agentManualEditFinal = {};          // { 'pjt|계정': { '2026-01': 값, … } }

function agentManualKeyFinal(acct) {
  return (typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : '') + '|' + acct;
}
function agentManualProposalIdFinal(acct) {
  return 'mn-' + (typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : '') + '-' + acct;
}
function agentManualNumFinal(raw) {
  const n = Math.round(Number(String(raw).replace(/[^0-9]/g, '')) || 0);
  return n < 0 ? 0 : n;
}

// 계정의 기준 월별 = 현재 계획 + 반영 대상 Agent 제안(수동 개입 제외)
function agentManualBaseFinal(data, account) {
  const months = ((data && data.months) || []).map(mo => mo.m);
  const base = {}, plan = {};
  months.forEach(m => { base[m] = 0; plan[m] = 0; });
  try {
    (getMonthlyBudgetRows(data, account) || []).forEach(r => {
      (r.months || []).forEach((x, i) => {
        const m = months[i];
        if (m !== undefined) { plan[m] += (x || 0); base[m] += (x || 0); }
      });
    });
  } catch (e) { /* 계정 상세가 없는 프로젝트는 0에서 시작합니다 */ }
  let agentDelta = 0;
  agentProposalsFinal('pending').forEach(p => {
    if (p.manual || p.acct !== account) return;
    const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(p.id) : null;
    if (g && !agentMiniSelFinal[p.id]) return;          // 택1은 고른 것만 반영합니다
    (p.monthly || []).forEach(x => {
      if (base[x.m] === undefined) return;
      base[x.m] += x.delta; agentDelta += x.delta;
    });
  });
  return { months, base, plan, agentDelta };
}

// 편집 후 현재값
function agentManualCurFinal(data, account) {
  const b = agentManualBaseFinal(data, account);
  const edit = agentManualEditFinal[agentManualKeyFinal(account)] || null;
  const cur = {};
  b.months.forEach(m => { cur[m] = (edit && edit[m] !== undefined) ? edit[m] : b.base[m]; });
  const sum = o => b.months.reduce((t, m) => t + (o[m] || 0), 0);
  const baseSum = sum(b.base), curSum = sum(cur);
  return {
    months: b.months, base: b.base, cur, planSum: sum(b.plan), agentDelta: b.agentDelta,
    baseSum, curSum, diff: curSum - baseSum, edited: !!edit,
  };
}

function agentManualEditSetFinal(account, m, raw) {
  const d = agentManualCurFinal(agentViewDataCacheFinal, account);
  const key = agentManualKeyFinal(account);
  const map = agentManualEditFinal[key] || (agentManualEditFinal[key] = {});
  d.months.forEach(x => { if (map[x] === undefined) map[x] = d.base[x]; });
  map[m] = agentManualNumFinal(raw);
  agentManualSyncProposalFinal(account);
  renderBudgetPage();
}
function agentManualResetFinal(account) {
  delete agentManualEditFinal[agentManualKeyFinal(account)];
  agentManualSyncProposalFinal(account);
  showToast(account + ' 편집 내용을 Agent 초안으로 되돌렸습니다.');
  renderBudgetPage();
}

/* 편집 차액을 [해야 할 일]의 ✎ 수동 개입 항목으로 만들어 둡니다.
   from 은 "제안 반영 전 계획"이라 Agent 제안 항목과 같은 기준선을 씁니다.
   → 기안 시 계정별로 합산되면 변경 전/후가 정확히 맞습니다. */
function agentManualSyncProposalFinal(account) {
  const id = agentManualProposalIdFinal(account);
  let idx = -1;
  for (let i = 0; i < AGENT_PROPOSALS_FINAL.length; i++) {
    if (AGENT_PROPOSALS_FINAL[i].id === id) { idx = i; break; }
  }
  const old = idx >= 0 ? AGENT_PROPOSALS_FINAL[idx] : null;
  if (old && old.status !== 'pending') return;      // 이미 기안된 건은 건드리지 않습니다
  const d = agentManualCurFinal(agentViewDataCacheFinal, account);
  if (!d.edited || d.diff === 0) {
    if (idx >= 0) AGENT_PROPOSALS_FINAL.splice(idx, 1);
    return;
  }
  const why = agentManualReasonFinal[account];
  const monthly = d.months.filter(m => d.cur[m] !== d.base[m])
    .map(m => ({ m, delta: d.cur[m] - d.base[m] }));
  const from = d.planSum;
  const np = {
    id, pjt: (typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : ''),
    acct: account, status: 'pending', manual: true, confidence: 1,
    detectedAt: '2026-09-03 11:20', trigger: 'PM 수동 개입',
    title: account + ' 월별 계획을 PM이 직접 조정했습니다',
    legs: [{ acct: account, from: from, to: from + d.diff, delta: d.diff }],
    monthly: monthly,
    why: why ? why.text
       : 'PM이 직접 조정했습니다. 아직 근거가 입력되지 않았습니다 — [예산 현황 보기]의 수동 개입 화면에서 남겨 주세요.',
    impact: 'Agent 초안 ' + fmt(d.baseSum) + '원을 ' + fmt(d.curSum) + '원으로 조정했습니다. 차액 '
          + agentDeltaFinal(d.diff) + '은 PM 판단입니다.',
    manualAt: '2026-09-03 11:20', manualBy: '이봄(PM)',
    agentBase: d.baseSum, agentAfter: d.curSum,
  };
  if (idx >= 0) AGENT_PROPOSALS_FINAL[idx] = np; else AGENT_PROPOSALS_FINAL.push(np);
}

// 수동 개입 중인 모든 계정을 렌더마다 현행화합니다.
function agentManualSyncAllFinal() {
  Object.keys(agentManualEditFinal).forEach(function (key) {
    const parts = key.split('|');
    if (parts[0] !== (typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : '')) return;
    agentManualSyncProposalFinal(parts[1]);
  });
}

/* ── 수동 개입 편집기 — 월별 계획을 직접 고칩니다 ── */
function renderAgentManualEditorFinal(data, account) {
  const d = agentManualCurFinal(data, account);
  if (!d.months.length) {
    return '<div class="agme empty">이 계정은 월별 계획이 없어 직접 편집할 항목이 없습니다.</div>';
  }
  const cells = d.months.map(function (m) {
    const ch = d.cur[m] - d.base[m];
    return '<label class="agme-cell ' + (ch > 0 ? 'up' : ch < 0 ? 'down' : '') + '">'
      + '<em>' + m + '</em>'
      + '<input type="text" inputmode="numeric" value="' + fmt(d.cur[m]) + '"'
      + ' onchange="agentManualEditSetFinal(\'' + account + '\',\'' + m + '\',this.value)"'
      + ' onkeydown="if(event.key===\'Enter\')this.blur()">'
      + '<i>' + (ch ? agentDeltaFinal(ch) : '초안 그대로') + '</i>'
      + '</label>';
  }).join('');
  return `
    <div class="agme ${d.diff ? 'on' : ''}">
      <div class="agme-head">
        <div class="agme-t">
          <b>✎ ${account} 월별 계획 직접 편집</b>
          <span>칸에는 Agent 초안 금액이 들어 있습니다. 고치면 차액이 [해야 할 일]에 <i>✎ 수동 개입</i>으로 따로 올라갑니다.</span>
        </div>
        <button class="agme-reset" onclick="agentManualResetFinal('${account}')" ${d.edited ? '' : 'disabled'}>Agent 초안으로 되돌리기</button>
      </div>
      <div class="agme-grid">${cells}</div>
      <div class="agme-foot">
        <span>Agent 초안 합계</span><b>${fmt(d.baseSum)}원</b>
        <i class="agme-ar">→</i>
        <span>편집 후 합계</span><b class="to">${fmt(d.curSum)}원</b>
        <em class="${d.diff > 0 ? 'up' : d.diff < 0 ? 'down' : 'zero'}">${d.diff === 0 ? '±0원' : agentDeltaFinal(d.diff)}</em>
      </div>
      ${d.diff ? `
        <p class="agme-note">차액 <b>${agentDeltaFinal(d.diff)}</b>이 [해야 할 일]에 <b>✎ 수동 개입</b> 항목으로 올라갔습니다.
          기안하면 ${account} 한 줄로 합쳐져 승인자에게는 구분 없이 갑니다.</p>` : ''}
    </div>`;
}

/* [2026.09.02] 수동 개입 임시저장 — 다른 계정으로 넘어가도 편집분이 남습니다. */
var agentManualSavedFinal = {};
function agentManualSaveFinal(acct) {
  agentManualSavedFinal[acct] = '2026-09-02 11:20';
  showToast(`${acct} 편집 내용을 임시저장했습니다. 다른 계정을 열어도 남아 있습니다.`);
  renderBudgetPage();
}
// 저장하지 않은 채 다른 계정으로 넘어가면 한 번 알려 줍니다.
if (typeof openBudgetAccountEditor === 'function') {
  var openBudgetAccountEditorBeforeAgentFinal = openBudgetAccountEditor;
  openBudgetAccountEditor = function (acct) {
    const cur = budgetSetupEditAccount;
    if (cur && cur !== acct && agentManualUnlockFinal[cur] && !agentManualSavedFinal[cur]) {
      showToast(`${cur}는 수동 개입 중이고 임시저장되지 않았습니다. 돌아가 [임시저장]을 눌러 주세요.`);
    }
    return openBudgetAccountEditorBeforeAgentFinal(acct);
  };
  window.openBudgetAccountEditor = openBudgetAccountEditor;
}

// [2026.09.02] 해야 할 일에서 [수동 개입]을 누르면 예산 현황 보기의 그 계정이 펼쳐집니다.
function agentGoManualFinal(acct) {
  agentSimAcctPickedFinal = true;
  if (agentViewFinal === 'mini' && typeof agentMiniSecFinal === 'object') agentMiniSecFinal.budget = true;
  agentBudgetPaneFullFinal();                                   // 3분할이면 예산 칸을 전체폭으로
  if (typeof openBudgetAccountEditor === 'function') openBudgetAccountEditor(acct);
  if (!agentManualUnlockFinal[acct]) agentToggleManualFinal(acct);   // 잠금 해제 + 이력 기록
  else renderBudgetPage();
}

function agentToggleManualFinal(acct) {
  agentManualUnlockFinal[acct] = !agentManualUnlockFinal[acct];
  if (agentManualUnlockFinal[acct]) {
    AGENT_LOG_FINAL.unshift({
      at: '2026-08-27 09:40', acct, actor: '이봄(PM)', decision: 'manual',
      reason: '수동 개입 — PM이 Agent 관리 예산을 직접 편집하기 위해 잠금을 해제했습니다.',
      dialog: [{ who: 'agent', text: '수동 개입을 기록했습니다. 편집이 끝나면 Agent가 변경분을 다시 검증합니다.' }],
    });
    showToast(`${acct} 수동 개입을 시작했습니다. 이 사실은 변경 이력에 남습니다.`);
  } else {
    // 항목 3) 수동으로 고친 내용도 직책자 기안으로 올라갑니다.
    if (!AGENT_MANUAL_DRAFTS_FINAL.some(d => d.acct === acct)) {
      const cur = (typeof budgetRollupFinal === 'function')
        ? (budgetRollupFinal(applyExecBudgetVersionSnapshotFinal(BUDGET_SOURCE[currentBudgetProj],
            getSelectedExecBudgetVersionFinal(BUDGET_SOURCE[currentBudgetProj])), BUDGET_SOURCE[currentBudgetProj])
            .rows.find(r => r.acct === acct) || {}) : {};
      AGENT_MANUAL_DRAFTS_FINAL.push({
        acct, manual: true, from: cur.plan || 0, to: cur.plan || 0,
        title: 'PM 수동 수정 — Agent 제안을 따르지 않고 직접 편집했습니다',
      });
    }
    showToast(`${acct} 수동 개입을 종료했습니다. 수정분이 [기안·결재]에 수동 개입 건으로 담깁니다.`);
  }
  renderBudgetPage();
}

function agentCreateDraftFinal() {
  const appr = agentProposalsFinal('approved').concat(AGENT_MANUAL_DRAFTS_FINAL);
  if (!appr.length) { showToast('검토 완료된 항목이 없습니다. [Agent 제안]에서 검토하거나 수동 개입으로 수정해 주세요.'); return; }
  const man = appr.filter(p => p.manual).length;
  showToast(`${appr.length}건(제안대로 ${appr.length - man}건 · 수동 수정 ${man}건)으로 실행예산 변경 기안을 직책자에게 상신했습니다. 계정별 변경내역과 Agent 대화가 첨부됩니다.`);
}

/* ==========================================================================
   4. 공통 블록 렌더러
   ========================================================================== */

// 화면 골격 비교 스위치 (설계 확정되면 이 블록만 지우면 됩니다)
var agentDevOpenFinal = false;      // 화면안·PERSONA 전환 줄 (테스트용)
function agentDevToggleFinal() { agentDevOpenFinal = !agentDevOpenFinal; renderBudgetPage(); }

function renderAgentViewSwitchFinal() {
  const opt = (k, label) =>
    `<button class="agv-btn ${agentViewFinal === k ? 'on' : ''}" onclick="agentSetViewFinal('${k}')">${label}</button>`;
  const open = agentDevOpenFinal;
  return `
    <div class="agent-view-switch ${open ? 'open' : ''}">
      <button class="agv-dev ${open ? 'on' : ''}" onclick="agentDevToggleFinal()"
        title="${open ? '테스트 설정 접기' : '테스트 설정 — 화면안·PERSONA 전환'}"
        aria-expanded="${open}" aria-label="테스트 설정">${open ? '⚙ 접기' : '⚙'}</button>
      ${open ? `
        ${opt('draft', '초안 (8/27 이전)')}
        ${opt('split', '3분할 화면')}
        ${opt('mini', '간소화 화면')}
        ${opt('sim', '3분할 간소화')}
        ${opt('ai', 'AI구상안')}
        ${opt('agent', '대화형 Agent')}
        <div class="agv-right">${renderAgentPersonaSwitchFinal()}</div>` : ''}
    </div>`;
}

// 항목 1)·7) Agent가 예산을 보고 있음을 알리는 한 줄 — KPI 타일은 중복이라 제거했습니다.
function renderAgentStatusStripFinal(roll) {
  return `
    <div class="agent-status">
      <div class="ags-head">
        <span class="ags-avatar" aria-hidden="true">🤖</span>
        <div class="ags-id">
          <strong>예산관리전문Agent<em>가 이 프로젝트 예산을 관리합니다</em></strong>
          <span>마지막 점검 ${agentLastCheckFinal} · 감지 소스: 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적</span>
        </div>
        <button class="ags-recheck" onclick="showToast('Agent가 4개 소스를 다시 점검했습니다. 새로 감지된 변경 요인은 없습니다.')">↻ 지금 점검</button>
      </div>
    </div>`;
}

function renderAgentDialogFinal(dialog, compact) {
  if (!dialog || !dialog.length) return '';
  return `
    <div class="agent-dialog ${compact ? 'compact' : ''}">
      ${dialog.map(d => `
        <div class="agd-row ${d.who}">
          <span class="agd-who">${d.who === 'pm' ? '이봄(PM)' : 'Agent'}</span>
          <div class="agd-text ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
        </div>`).join('')}
    </div>`;
}

// [2026.08.31] 감지 소스는 판단 근거 안에 둡니다 — 하단에 따로 두면 있는 줄도 모릅니다.
function renderAgentBasisFinal(p) {
  if (!p.basis) return '';
  return `
    <div class="agx-basis">
      <div class="agx-basis-row"><em class="agx-k main">감지 소스</em><span>${escHtml(p.basis.main)}</span></div>
      <div class="agx-basis-row"><em class="agx-k alt">추세 기반 대안</em><span>${escHtml(p.basis.alt)}</span></div>
    </div>`;
}

// 제안 상세 본문 — 1안 카드와 5안 간소화 화면이 함께 씁니다.
function renderAgentProposalBodyFinal(p) {
  const delta = p.to - p.from;
  const decided = p.status !== 'pending';
  return `
          <div class="agp-block">
            <b>Agent가 이렇게 판단했습니다</b>
            ${p.source ? renderAgentExSourceFinal(p.source) : renderAgentBasisFinal(p)}
            <p>${escHtml(p.why)}</p>
            ${(p.evidence && p.evidence.length)
              ? `<ul class="agp-ev">${p.evidence.map(e => `<li>${escHtml(e)}</li>`).join('')}</ul>` : ''}
          </div>
          ${p.persons ? `
            <div class="agp-block">
              <b>SCM 확정 인력</b>
              <table class="agent-person-table">
                <thead><tr><th>인력</th><th>등급</th><th class="num">MM</th><th>투입기간</th><th class="num">단가</th><th class="num">금액</th></tr></thead>
                <tbody>${p.persons.map(m => `
                  <tr><td><b>${m.name}</b></td><td>${m.grade}</td><td class="num">${m.mm.toFixed(1)}</td>
                  <td>${m.period}</td><td class="num">${fmt(m.unit)}</td><td class="num"><b>${fmt(m.amount)}</b></td></tr>`).join('')}</tbody>
                <tfoot><tr><td colspan="2">합계 ${p.persons.length}명</td>
                  <td class="num">${p.persons.reduce((t, m) => t + m.mm, 0).toFixed(1)}</td>
                  <td colspan="2"></td>
                  <td class="num">${fmt(p.persons.reduce((t, m) => t + m.amount, 0))}</td></tr></tfoot>
              </table>
            </div>` : ''}
          ${(p.legs && p.legs.length > 1) ? `
            <div class="agp-block">
              <b>계정별 변경 전 / 변경 후</b>
              ${renderAgentLegsTableFinal(p)}
            </div>`
          : `
            <div class="agp-amt">
              <div class="agp-amt-cell"><span>현재 계획</span><b>${agentWonFinal(p.from)}</b></div>
              <div class="agp-arrow">→</div>
              <div class="agp-amt-cell to"><span>Agent 제안</span><b>${agentWonFinal(p.to)}</b></div>
              <div class="agp-amt-cell d"><span>변동</span><b class="${delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(delta)}</b></div>
              <div class="agp-months">${(p.monthly || []).map(m => `<em>${m.m} ${agentDeltaFinal(m.delta)}</em>`).join('')}</div>
            </div>`}
          ${renderAgentEvidenceExtraFinal(p)}
          <div class="agp-block impact"><b>영향</b><p>${escHtml(p.impact)}</p></div>
          ${renderAgentDialogFinal(p.dialog)}
          <div class="agp-ask">
            <input id="agent-ask-${p.id}" type="text" placeholder="Agent에게 물어보세요 — 예: 다른 계정에서 당겨올 수 없나요?"
              onkeydown="if(event.key==='Enter') agentAskFinal('${p.id}')">
            <button class="agp-ask-btn" onclick="agentAskFinal('${p.id}')">질문</button>
          </div>
          ${decided ? `
            <div class="agp-decided">${p.status === 'approved' ? '승인' : '반려'}됨 · ${p.decidedAt || ''} — 결정과 대화가 변경 이력에 기록되었습니다.</div>` : ''}
`;
}

function renderAgentProposalCardFinal(p) {
  const open = agentOpenProposalFinal === p.id;
  const delta = p.to - p.from;
  const decided = p.status !== 'pending';
  return `
    <div class="agent-prop ${p.status} ${open ? 'open' : ''}">
      <button class="agp-head" onclick="agentToggleProposalFinal('${p.id}')">
        <span class="agp-acct ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
        <div class="agp-title">
          <strong>${p.title}</strong>
          <span>${p.detectedAt} · 감지: ${p.trigger} · 확신도 ${Math.round(p.confidence * 100)}%</span>
        </div>
        <span class="agp-delta ${delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(delta)}</span>
        ${decided ? `<span class="agp-stamp ${p.status}">${p.status === 'approved' ? '✓ 승인' : '✗ 반려'}</span>` : ''}
        <span class="agp-caret">${open ? '∧' : '∨'}</span>
      </button>
      ${open ? `
        <div class="agp-body">${renderAgentProposalBodyFinal(p)}</div>` : ''}
    </div>`;
}

function renderAgentProposalListFinal() {
  const pend = agentProposalsFinal('pending');
  const done = AGENT_PROPOSALS_FINAL.filter(p => p.status !== 'pending');
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>내 승인 대기 ${pend.length}건</strong>
        <span>Agent가 감지한 변경입니다. 내용을 확인하고 Y/N만 선택하세요.</span>
      </div>
      ${pend.length ? pend.map(renderAgentProposalCardFinal).join('')
        : '<div class="ag-empty">승인 대기 중인 제안이 없습니다. Agent가 계속 감지하고 있습니다.</div>'}
    </div>
    ${done.length ? `
      <div class="agent-section">
        <div class="ag-sec-head"><strong>결정 완료 ${done.length}건</strong><span>승인분은 [기안·결재]에서 변경 기안에 포함됩니다.</span></div>
        ${done.map(renderAgentProposalCardFinal).join('')}
      </div>` : ''}
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>Agent 자율처리 ${AGENT_AUTO_FINAL.length}건</strong>
        <span>총액이 바뀌지 않는 조정은 PM 확인 없이 Agent가 반영합니다.</span>
      </div>
      <table class="agent-auto-table">
        <thead><tr><th>시각</th><th>계정</th><th>처리</th><th>내용</th></tr></thead>
        <tbody>${agentByAcctFinal(AGENT_AUTO_FINAL).map(a => `
          <tr><td class="num">${a.at}</td><td><span class="agp-acct sm ${agentAcctColorFinal(a.acct)}">${a.acct}</span></td>
          <td><b>${a.what}</b></td><td class="agt-detail">${escHtml(a.detail)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderAgentHistoryFinal() {
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>계정별 변경 이력</strong>
        <span>변경 금액뿐 아니라, 그 결정에 이르기까지의 Agent ↔ PM 대화가 근거로 함께 남습니다.</span>
      </div>
      ${AGENT_LOG_FINAL.map(l => `
        <div class="agent-log ${l.decision}">
          <div class="agl-head">
            <span class="agp-acct sm ${agentAcctColorFinal(l.acct)}">${l.acct}</span>
            <b>${escHtml(l.reason)}</b>
            <em class="agl-badge ${l.decision}">${l.decision === 'approved' ? '승인' : l.decision === 'rejected' ? '반려' : '수동 개입'}</em>
            <span class="agl-meta">${l.at} · ${l.actor}</span>
          </div>
          ${(l.from != null && l.to != null) ? `
            <div class="agl-amt">${agentWonFinal(l.from)} → <b>${agentWonFinal(l.to)}</b>
              <em class="${l.to - l.from > 0 ? 'up' : 'down'}">${agentDeltaFinal(l.to - l.from)}</em></div>` : ''}
          ${renderAgentDialogFinal(l.dialog, true)}
        </div>`).join('')}
    </div>`;
}

// 항목 4)·5) 직책자 질의 창구
function renderAgentQaFinal() {
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>직책자 · 타 사용자 질의</strong>
        <span>직책자는 PM에게 묻지 않고 Agent에게 직접 질의합니다. Agent가 스스로 판단한 변경값을 근거로 답합니다.</span>
      </div>
      <div class="agent-qa-input">
        <input id="agent-qa-input" type="text" placeholder="Agent에게 질의 — 예: 외주비가 왜 늘었나요? CP총액 초과 위험 있나요?"
          onkeydown="if(event.key==='Enter') agentQaSendFinal()">
        <button onclick="agentQaSendFinal()">질의</button>
      </div>
      ${AGENT_QA_FINAL.map(r => `
        <div class="agent-qa">
          <div class="agq-q"><span>${escHtml(r.asker)}</span>${escHtml(r.q)}<em>${r.at}</em></div>
          <div class="agq-a ${r.pending ? 'pending' : ''}"><span>Agent</span>${escHtml(r.a)}</div>
        </div>`).join('')}
    </div>`;
}

// 항목 3) 기안·결재 — 승인된 제안이 계정별 변경내역으로 묶입니다.
function renderAgentDraftFinal(roll) {
  // 항목 3) 기안에는 "제안대로 검토 완료"분과 "수동 개입해 직접 수정"분이 함께 담깁니다.
  const appr = agentProposalsFinal('approved').concat(AGENT_MANUAL_DRAFTS_FINAL);
  const byAcct = {};
  appr.forEach(p => { byAcct[p.acct] = (byAcct[p.acct] || 0) + (p.to - p.from); });
  const accts = Object.keys(byAcct);
  const net = appr.reduce((s, p) => s + (p.to - p.from), 0);
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>실행예산 변경 기안</strong>
        <span>PM이 승인한 Agent 제안만 기안에 담깁니다. 계정별 변경내역과 Agent 대화가 그대로 첨부됩니다.</span>
      </div>
      ${appr.length ? `
        <table class="agent-draft-table">
          <thead><tr><th>계정</th><th>출처</th><th class="num">변경 전</th><th class="num">변경 후</th><th class="num">변동</th><th>근거</th></tr></thead>
          <tbody>${agentByAcctFinal(appr).map(p => `
            <tr>
              <td><span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span></td>
              <td><em class="agd-src ${p.manual ? 'manual' : ''}">${p.manual ? '수동 개입' : 'Agent 제안'}</em></td>
              <td class="num">${agentWonFinal(p.from)}</td>
              <td class="num"><b>${agentWonFinal(p.to)}</b></td>
              <td class="num ${p.to - p.from > 0 ? 'up' : 'down'}">${agentDeltaFinal(p.to - p.from)}</td>
              <td class="agt-detail">${escHtml(p.title)}</td>
            </tr>`).join('')}</tbody>
          <tfoot><tr><td>합계 ${accts.length}계정</td><td></td><td class="num">—</td><td class="num">—</td>
            <td class="num ${net > 0 ? 'up' : 'down'}">${agentDeltaFinal(net)}</td><td></td></tr></tfoot>
        </table>
        <div class="agent-draft-foot">
          <span>기안 후 수립 예산 ${agentWonFinal(roll.plan + net)} / CP총액 ${agentWonFinal(roll.cp)}</span>
          <button class="agd-submit" onclick="agentCreateDraftFinal()">변경 기안 생성 →</button>
        </div>`
        : `<div class="ag-empty">승인된 제안이 없습니다. [Agent 제안] 탭에서 Y/N을 선택하면 여기에 모입니다.</div>`}
    </div>
    ${renderAgentQaFinal()}`;
}

/* ==========================================================================
   5. 화면 골격 3안
   ========================================================================== */

// ① Agent 제안 중심 3탭 — 기존 [이력/계정별 작성/결재]를 [Agent 제안/변경 이력/기안·결재]로 교체
function renderAgentTabsViewFinal(viewData, data, projInfo, roll) {
  const tab = (k, label, badge) => `
    <button class="agt-tab ${agentTabFinal === k ? 'active' : ''}" onclick="agentSetTabFinal('${k}')">
      ${label}${badge ? `<em class="agt-badge">${badge}</em>` : ''}
    </button>`;
  const pend = agentProposalsFinal('pending').length;
  const appr = agentProposalsFinal('approved').length;
  let body = '';
  if (agentTabFinal === 'history') body = renderAgentHistoryFinal();
  else if (agentTabFinal === 'draft') body = renderAgentDraftFinal(roll);
  else body = renderAgentProposalListFinal();
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell">
      ${projInfo}
      <div class="agent-tabs">
        ${tab('proposal', 'Agent 제안', pend)}
        ${tab('history', '변경 이력')}
        ${tab('draft', '기안·결재', appr)}
      </div>
      ${renderAgentStatusStripFinal(roll)}
      ${body}
      ${renderAgentAccountRailFinal(viewData, data, roll)}
    </div>`;
}

// ② 단일 Agent 콘솔 — 탭 없이 상태 → 제안 → 대화 → 이력을 하나의 스트림으로
function renderAgentConsoleViewFinal(viewData, data, projInfo, roll) {
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell console">
      ${projInfo}
      ${renderAgentStatusStripFinal(roll)}
      <div class="agent-console-grid">
        <div class="agc-main">
          ${renderAgentProposalListFinal()}
          ${renderAgentDraftFinal(roll)}
        </div>
        <div class="agc-side">
          ${renderAgentHistoryFinal()}
        </div>
      </div>
      ${renderAgentAccountRailFinal(viewData, data, roll)}
    </div>`;
}

// ③ 기존 화면 + 제안 배너 — 기존 원가조정 화면을 그대로 두고 최상단에 Agent 요약만 얹음
function renderAgentLegacyViewFinal(viewData, data, roll) {
  const pend = agentProposalsFinal('pending');
  const legacy = renderBudgetSetupOverviewBeforeAgentFinal(data,
    CATS.reduce((o, c) => Object.assign(o, { [c]: calcActual(data, c) }), {}),
    CATS.reduce((o, c) => Object.assign(o, { [c]: calcQuasi(data, c) }), {}));
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="agent-banner ${pend.length ? 'warn' : ''}">
      <span class="agb-avatar" aria-hidden="true">🤖</span>
      <div class="agb-text">
        <strong>예산관리전문Agent 제안 ${pend.length}건</strong>
        <span>${pend.length
          ? pend.map(p => `${p.acct} ${agentDeltaFinal(p.to - p.from)}`).join(' · ')
          : '감지된 변경 요인이 없습니다.'}</span>
      </div>
      <button class="agb-go" onclick="agentSetViewFinal('tabs')">제안 확인하기 →</button>
    </div>
    ${legacy}`;
}

/* ==========================================================================
   6. 항목 6) 계정은 Agent가 관리 — 열람 전용 레일 + 수동 개입
   ========================================================================== */

// CP총액 — 막대 없이 "여유 / ▣ CP총액" 두 조각만 한 줄로 붙입니다.
function renderAgentCpChipFinal(roll) {
  const ref = agentReflectFinal();
  const after = roll.cpRemain - ref.net;
  // 6안은 CP총액 버튼만 둡니다 — 여유·반영 후는 표와 대화가 알려 줍니다.
  if (agentViewFinal === 'sim') {
    return `
      <span class="agcp-chip">
        <button class="cp-ref-btn ${roll.overCp ? 'over' : ''}" onclick="openCpTotalPopupFinal()"
          title="선행 시스템에서 승인받은 계정별 편성 한도 — 계정별로 펼쳐 봅니다">
          <b>CP총액</b><span>${fmt(roll.cp)}원</span><u aria-hidden="true">⌄</u>
        </button>
      </span>`;
  }
  return `
    <span class="agcp-chip">
      <em class="${roll.overCp ? 'bad' : ''}">
        <i>${roll.overCp ? '초과' : '여유'}</i>${fmt(roll.overCp ? -roll.cpRemain : roll.cpRemain)}원
      </em>
      ${ref.net ? `<em class="agcp-after ${after < 0 ? 'bad' : ''}"><i>반영 후</i>${fmt(after)}원</em>` : ''}
      <button class="cp-ref-btn ${roll.overCp ? 'over' : ''}" onclick="openCpTotalPopupFinal()"
        title="선행 시스템에서 승인받은 계정별 편성 한도 — 계정별로 펼쳐 봅니다">
        <b>CP총액</b><span>${fmt(roll.cp)}원</span><u aria-hidden="true">⌄</u>
      </button>
    </span>`;
}

/* [2026.09.02] 제안 반영 ─────────────────────────────────────────────────
   해야 할 일의 Agent 제안을 예산 현황에 미리 반영해 보여 줍니다.
   · 일반 제안은 그대로 반영합니다.
   · 택1(1안·2안) 그룹은 PM이 고른 것만 반영합니다 — 고르기 전에는 반영하지 않습니다.
   · legs 를 더하므로 계정 간 이관(재료비 −, 외주비 +)도 양쪽에 반영됩니다. */
function agentReflectFinal() {
  const by = {};
  let cnt = 0, pickedGroups = {}, waitGroups = {};
  agentProposalsFinal('pending').forEach(p => {
    const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(p.id) : null;
    if (g) {
      if (!agentMiniSelFinal[p.id]) { waitGroups[g.key] = g; return; }   // 아직 고르지 않음
      pickedGroups[g.key] = true;
    }
    cnt += 1;
    (p.legs || []).forEach(l => { by[l.acct] = (by[l.acct] || 0) + l.delta; });
  });
  Object.keys(pickedGroups).forEach(k => { delete waitGroups[k]; });
  const net = Object.keys(by).reduce((t, k) => t + by[k], 0);
  return { by, net, cnt, wait: Object.keys(waitGroups).map(k => waitGroups[k]) };
}
function agentReflectOfFinal(ref, acct) { return ref.by[acct] || 0; }

// PM이 편성하는 "계정 타일"이 아니라, Agent가 관리 중인 계정의 상태를 보여주는 레일입니다.
function renderAgentAccountRailFinal(viewData, data, roll) {
  const ref = agentReflectFinal();
  const cards = roll.rows.map(r => {
    const unlocked = !!agentManualUnlockFinal[r.acct];
    const pend = agentProposalsFinal('pending').filter(p => p.acct === r.acct);
    const rate = r.plan > 0 ? Math.round((r.done / r.plan) * 1000) / 10 : 0;
    const d = agentReflectOfFinal(ref, r.acct);
    const after = r.plan + d;
    return `
      <div class="agent-acct ${unlocked ? 'unlocked' : ''} ${budgetSetupEditAccount === r.acct ? 'active' : ''}"
        role="button" tabindex="0" title="${r.acct} 내역 보기"
        onclick="agentBudgetFullOpenFinal('${r.acct}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();agentBudgetFullOpenFinal('${r.acct}')}">
        <div class="aga-top">
          <span class="agp-acct sm ${agentAcctColorFinal(r.acct)}">${r.acct}</span>
          ${unlocked
            ? '<em class="aga-lock open">수동 개입 중</em>'
            : '<em class="aga-lock">🤖 Agent 관리</em>'}
        </div>
        <strong class="aga-val">${fmt(r.plan)}<i>원</i></strong>
        <div class="aga-sub">집행률 ${rate}% · 실적(확정) ${fmt(r.done)}원</div>
        ${d ? `
          <div class="aga-after ${d > 0 ? 'up' : 'down'}">
            <em>반영 후</em><b>${fmt(after)}<i>원</i></b>
          </div>` : ''}
        ${pend.length ? `<div class="aga-pend">제안 ${pend.length}건 · ${agentDeltaFinal(pend.reduce((s, p) => s + (p.to - p.from), 0))}</div>` : ''}
        <div class="aga-acts">
          <button class="aga-manual wide ${unlocked ? 'on' : ''}"
            onclick="event.stopPropagation();agentBudgetFullManualFinal('${r.acct}')">
            ${unlocked ? '✎ 개입 종료' : '✎ 수동 개입'}
          </button>
        </div>
      </div>`;
  }).join('');
  // [2026.08.28 위클리 피드백 반영 #4] 계정 전체를 한 번에 보는 박스를 맨 앞에 둡니다.
  const allPend = agentProposalsFinal('pending');
  const allCard = `
    <div class="agent-acct all ${budgetSetupEditAccount === null ? 'active' : ''}"
      role="button" tabindex="0" title="전체 계정 현황 보기"
      onclick="budgetSetupEditAccount=null;renderBudgetPage()">
      <div class="aga-top">
        <span class="agp-acct sm all">전체 계정</span>
        <em class="aga-lock">🤖 Agent 관리 ${roll.rows.length}계정</em>
      </div>
      <strong class="aga-val">${fmt(roll.plan)}<i>원</i></strong>
      <div class="aga-sub">집행률 ${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}% · 실적(확정) ${fmt(roll.done)}원</div>
      ${ref.net ? `
        <div class="aga-after ${ref.net > 0 ? 'up' : 'down'}">
          <em>반영 후</em><b>${fmt(roll.plan + ref.net)}<i>원</i></b>
        </div>` : ''}
      ${ref.wait.length ? `
        <div class="aga-wait">${ref.wait.map(g => `${g.acct} 1안·2안 선택 대기 — 고르면 반영됩니다`).join(' · ')}</div>` : ''}
      ${allPend.length ? `<div class="aga-pend">제안 ${allPend.length}건 · ${agentDeltaFinal(allPend.reduce((t, p) => t + (p.to - p.from), 0))}</div>` : ''}
      <div class="aga-acts">
        <button class="aga-view" onclick="event.stopPropagation();budgetSetupEditAccount=null;renderBudgetPage()">전체 현황 보기</button>
      </div>
    </div>`;
  const expanded = budgetSetupEditAccount
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, budgetSetupEditAccount)}</div>`
    : `<div class="setup-expanded-detail">${renderAgentInsightFinal(viewData, data, roll)}</div>`;
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <div class="ag-sec-top">
          <strong>Agent가 관리 중인 계정</strong>
          ${renderAgentCpChipFinal(roll)}
        </div>
        <span>PM은 예산을 직접 편성하지 않습니다. 내역은 열람 전용이며, 예외 상황에만 [수동 개입]으로 편집할 수 있고 그 사실이 이력에 남습니다.</span>
      </div>
      <div class="agent-acct-rail">${allCard}${cards}</div>
    </div>
    ${expanded}`;
}

/* ==========================================================================
   7. 원가조정 화면 진입점 교체
   ========================================================================== */

var renderBudgetSetupOverviewBeforeAgentFinal = renderBudgetSetupOverview;
renderBudgetSetupOverview = function (data, actual, quasi) {
  // 이력/결재 단계는 기존 화면을 그대로 씁니다. 개편 대상은 예산을 다루는 본문입니다.
  if (budgetSetupStage === 'history' || budgetSetupStage === 'approval') {
    return renderBudgetSetupOverviewBeforeAgentFinal(data, actual, quasi);
  }
  if (typeof agentEnsureCreditFinal === 'function') agentEnsureCreditFinal();
  agentSeedLaborFinal();                  // 승인 완료된 인건비 기준선을 맞춥니다
  agentSeedSubDataFinal();                // 금액만 있던 상세계정에 내역을 채웁니다
  ensureAsCostPlanAmount(data);
  const viewData = applyExecBudgetVersionSnapshotFinal(data, getSelectedExecBudgetVersionFinal(data));
  const roll = budgetRollupFinal(viewData, data);
  agentRollCacheFinal = roll;             // 결재선 팝업·결재자 화면이 CP 비교에 씁니다
  agentViewDataCacheFinal = viewData;     // 수동 개입 편집기가 월별 기준값을 읽습니다
  agentManualSyncAllFinal();              // 편집분을 [해야 할 일]에 현행화합니다
  agentSyncProposalsFinal(roll);          // 제안 금액을 상세 내역과 맞춥니다
  const projInfo = renderBudgetProjectInfoFinal(data);

  // 초안 = 2026-08-27 오후 개편 이전의 원가조정 화면(Agent 요소 없음).
  // 개편분이 전부 override 로 덧붙여져 있어, 원본 함수를 그대로 호출하면 그 화면이 복원됩니다.
  if (agentViewFinal === 'draft') {
    return renderAgentViewSwitchFinal()
      + renderBudgetSetupOverviewBeforeAgentFinal(data, actual, quasi);
  }
  if (agentViewFinal === 'legacy') return renderAgentLegacyViewFinal(viewData, data, roll);
  if (agentViewFinal === 'console') return renderAgentConsoleViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'agent') return renderAgentGaViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'ai') return renderAgentAiViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'sim') return renderAgentSimViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'split') return renderAgentSplitViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'mini') return renderAgentMiniViewFinal(viewData, data, projInfo, roll);
  return renderAgentTabsViewFinal(viewData, data, projInfo, roll);
};

/* [2026.09.02] 이 계정에서 Agent 제안으로 바뀔 항목을 계정 내역 맨 위에 알려 줍니다.
   어느 달이 얼마나 바뀌는지까지 보여, 표의 어느 칸이 달라질지 바로 알 수 있습니다. */
function renderAgentAcctChangeNoticeFinal(account) {
  if (typeof agentProposalsFinal !== 'function') return '';
  const ref = (typeof agentReflectFinal === 'function') ? agentReflectFinal() : { by: {}, wait: [] };
  const mine = agentProposalsFinal('pending').filter(p =>
    (p.legs || []).some(l => l.acct === account));
  if (!mine.length) return '';
  const d = ref.by[account] || 0;
  const waiting = (ref.wait || []).some(g => g.ids.some(id => mine.some(p => p.id === id)));
  const cur = (typeof budgetRollupFinal === 'function' && typeof BUDGET_SOURCE !== 'undefined')
    ? null : null;
  return `
    <div class="agchg ${d ? 'on' : 'wait'}">
      <div class="agchg-head">
        <b>🤖 Agent 제안으로 바뀔 항목</b>
        <span>${account} · 제안 ${mine.length}건</span>
        ${d ? `<em class="${d > 0 ? 'up' : 'down'}">${agentDeltaFinal(d)}</em>`
            : '<em class="hold">택1 선택 대기 — 1안·2안 중 하나를 고르면 반영됩니다</em>'}
      </div>
      ${mine.map(p => {
        const leg = (p.legs || []).find(l => l.acct === account) || { delta: 0 };
        const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(p.id) : null;
        const picked = !g || agentMiniSelFinal[p.id];
        const ms = (p.monthly || []).filter(m => !g || picked);
        return `
          <div class="agchg-row ${picked ? '' : 'off'}">
            <em class="agchg-n">${g ? (g.ids.indexOf(p.id) + 1) + '안' : '제안'}</em>
            <b>${escHtml(p.title)}</b>
            <i class="${leg.delta > 0 ? 'up' : leg.delta < 0 ? 'down' : ''}">${leg.delta === 0 ? '±0원' : agentDeltaFinal(leg.delta)}</i>
            ${picked ? '' : '<u>미선택 — 반영 안 됨</u>'}
            ${(picked && ms.length) ? `
              <div class="agchg-months">${ms.map(m => `<span>${m.m} ${agentDeltaFinal(m.delta)}</span>`).join('')}</div>` : ''}
          </div>`;
      }).join('')}
      <div class="agchg-foot">${waiting
        ? '아직 고르지 않은 항목이 있어 아래 표에는 반영되지 않았습니다. [해야 할 일]에서 1안·2안을 고르면 여기에 표시됩니다.'
        : '아래 표는 현재 확정 계획입니다. 위 금액은 기안·승인 후 반영됩니다.'}</div>
    </div>`;
}

/* [2026.09.02] 재료비 상품계획 목록 문구 정리 — 검수계획 → 검수 예상 주기.
   공통 파일을 건드리지 않고 결과 HTML에서 라벨만 바꿉니다. */
if (typeof renderMaterialItemPanel === 'function') {
  var renderMaterialItemPanelBeforeAgentFinal = renderMaterialItemPanel;
  renderMaterialItemPanel = function () {
    const html = renderMaterialItemPanelBeforeAgentFinal();
    if (agentViewFinal === 'draft') return html;
    return html.replace(/<span>검수계획<\/span>/g, '<span>검수 예상 주기</span>')
               .replace(/검수 계획을 확인합니다/g, '검수 예상 주기를 확인합니다');
  };
  window.renderMaterialItemPanel = renderMaterialItemPanel;
}

/* [2026.09.02] 재료비 상세계정 탭을 외주비와 같은 모양으로 맞춥니다.
   sk-theme.css:602 의 "풀폭 그리드 + 번호칩 + 계정별 shade + 선택 시 컬러 테두리" 재정의가
   .bpo-kind-tabs 에만 걸려 있어, 컨테이너 클래스 한 개만 더 붙입니다. */
if (typeof renderMaterialKindTabs === 'function') {
  var renderMaterialKindTabsBeforeAgentFinal = renderMaterialKindTabs;
  renderMaterialKindTabs = function () {
    const html = renderMaterialKindTabsBeforeAgentFinal();
    if (agentViewFinal === 'draft') return html;      // 초안은 개편 이전 모양 그대로
    return html.replace('class="os-kind-tabs os-kind-tabs-strong',
      'class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs');
  };
  window.renderMaterialKindTabs = renderMaterialKindTabs;
}

// 항목 6) 계정 편집기는 기본 열람 전용. 수동 개입을 켜지 않으면 입력이 잠깁니다.
var renderBudgetAccountEditorBeforeAgentFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function (data, account) {
  // 초안은 개편 이전 화면 그대로 — Agent 열람전용 처리를 걸지 않습니다.
  if (agentViewFinal === 'draft') return renderBudgetAccountEditorBeforeAgentFinal(data, account);
  // 최초 편성 프로젝트는 계정 상세 데이터가 없습니다 — 초안 편성 화면을 보여 줍니다.
  const firstDraft = (typeof AGENT_PJT_CP_FINAL !== 'undefined'
    && !!AGENT_PJT_CP_FINAL[typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : '']);
  // 6안(3분할 간소화)은 변경 예정 안내를 계정 상세에 두지 않습니다 — 표와 대화가 그 역할을 합니다.
  const notice = (agentViewFinal === 'sim' || agentViewFinal === 'agent' || agentViewFinal === 'ai')
    ? '' : renderAgentAcctChangeNoticeFinal(account);
  const html = firstDraft
    ? renderAgentFirstDraftAccountFinal(data, account)
    : notice + renderBudgetAccountEditorBeforeAgentFinal(data, account);
  if (agentManualUnlockFinal[account]) {
    const saved = agentManualSavedFinal[account];
    const why = agentManualReasonFinal[account];
    return `
      <div class="agent-manual-note">
        <div class="agmn-txt">
          <b>수동 개입 중</b> — ${account} 예산을 PM이 직접 편집하고 있습니다. 편집 내용은 변경 이력에 기록되고, Agent가 다시 검증합니다.
          <span class="agmn-hint ${saved ? 'ok' : ''}">${saved
            ? `임시저장됨 · ${saved} — 다른 계정을 열어도 이 내용은 남아 있습니다.`
            : '다른 계정으로 넘어가기 전에 [임시저장]을 눌러 주세요. 저장하지 않으면 편집 중인 내용이 사라집니다.'}</span>
        </div>
        <button class="agmn-save" onclick="agentManualSaveFinal('${account}')">임시저장</button>
        <button onclick="agentToggleManualFinal('${account}')">개입 종료</button>
      </div>
      <div class="agent-manual-why ${why ? 'done' : ''}">
        <div class="agmw-head">
          <b>✎ 왜 직접 고치시나요?</b>
          <span>남겨 주시면 Agent가 다음 편성 제안의 근거로 씁니다. 직책자·담당자도 PM에게 묻지 않고 Agent에게 물어 확인합니다.</span>
        </div>
        ${why ? `
          <div class="agmw-saved">
            <p>${escHtml(why.text)}</p>
            <em>${escHtml(why.at)} · ${escHtml(why.by)} · 기록됨</em>
            <button onclick="agentManualReasonFinal['${account}']=null;renderBudgetPage()">다시 쓰기</button>
          </div>` : `
          <div class="agmw-presets">
            ${AGENT_MANUAL_PRESET_FINAL.map((t, i) =>
              `<button onclick="agentManualPresetFinal('${account}',${i})">${escHtml(t)}</button>`).join('')}
          </div>
          <div class="agmw-input">
            <textarea id="agent-manual-why-${account}" rows="2"
              placeholder="예: 고객이 2분기 범위를 늘려 달라고 해서 인력 1명을 먼저 반영했습니다. 확정 공문은 다음 주에 옵니다."></textarea>
            <button class="agmw-save" onclick="agentManualReasonSaveFinal('${account}')">근거 남기기</button>
          </div>`}
      </div>
      ${renderAgentManualEditorFinal(data, account)}
      ${html}`;
  }
  // [2026.09.01] 안내 박스는 제거하고, 편집 잠금과 [수동 개입] 진입만 남깁니다.
  return `
    <div class="agent-readonly">
      <div class="agr-veil">${html}</div>
    </div>`;
};


/* ==========================================================================
   9. [2026.08.27 위클리 피드백 반영 #3] PM 프로세스 — 검토 후 기안
      Agent 감지 → PM 검토 → ① 제안대로 기안  또는  ② 수동 개입 후 기안 → 직책자 결재
      두 경로 모두 "직책자에게 올리는 기안"으로 수렴합니다.
   ========================================================================== */

// 수동 개입으로 PM이 직접 수정한 건 — 기안에 [수동 개입] 출처로 함께 담깁니다.
var AGENT_MANUAL_DRAFTS_FINAL = [];

// [2026.08.28] 1안·4안에서 제거 요청 — 화면에서는 쓰지 않습니다(되살릴 때 각 뷰에서 호출하면 됩니다).
function renderAgentProcessStripFinal() {
  const pend = agentProposalsFinal('pending').length;
  const appr = agentProposalsFinal('approved').length;
  const man = AGENT_MANUAL_DRAFTS_FINAL.length;
  return `
    <div class="agent-process">
      <div class="agpr-step done"><span>1</span><b>Agent 감지</b><em>예산 변경 시점·값을 스스로 인지</em></div>
      <i class="agpr-arrow">→</i>
      <div class="agpr-step ${pend ? 'now' : 'done'}"><span>2</span><b>PM 검토</b><em>${pend ? `대기 ${pend}건` : '대기 없음'}</em></div>
      <i class="agpr-arrow">→</i>
      <div class="agpr-step ${appr + man ? 'now' : ''}">
        <span>3</span><b>기안</b>
        <em>제안대로 ${appr}건${man ? ` · 수동 수정 ${man}건` : ''}</em>
      </div>
      <i class="agpr-arrow">→</i>
      <div class="agpr-step"><span>4</span><b>직책자 결재</b><em>Agent가 근거·대화를 첨부</em></div>
    </div>`;
}

/* ==========================================================================
   10. [2026.08.27 위클리 피드백 반영 #5] 4안 — 3분할
       좌(절반): 예산 현황 보기 / 우상: 해야 할 일 / 우하: Agent와 대화하기
   ========================================================================== */

// [2026.08.28 위클리 피드백 반영] 세 화면은 각각 3단계로 접고 폅니다.
//   collapsed(제목줄만) → normal(분할 안에서 보임) → full(전체 폭) → 다시 collapsed
// 배치는 normal 인 화면 수로 정해집니다.
//   3개 → 좌(예산 현황) / 우(할일·대화)   2개 → 좌 / 우 2분할
//   1개 → 전체 폭                      0개 → 제목줄 3개만
var AGENT_PANES_FINAL = ['todo', 'chat', 'budget'];
var agentPaneStateMapFinal = { todo: 'normal', chat: 'normal', budget: 'normal' };

// full 인 화면이 있으면 나머지는 제목줄로 내려갑니다(각자의 저장된 상태는 유지).
function agentFullPaneFinal() {
  return AGENT_PANES_FINAL.find(k => agentPaneStateMapFinal[k] === 'full') || '';
}
function agentPaneStateFinal(k) {
  const full = agentFullPaneFinal();
  if (full) return k === full ? 'full' : 'collapsed';
  return agentPaneStateMapFinal[k] === 'full' ? 'normal' : agentPaneStateMapFinal[k];
}
// 확정 버전을 조회할 때는 해야 할 일 칸을 두지 않습니다(그 버전 내역은 결재 이력에서 봅니다).
function agentPaneHiddenFinal(k) {
  return k === 'todo' && typeof agentVerIsPastFinal === 'function' && agentVerIsPastFinal();
}
function agentNormalPanesFinal() {
  return AGENT_PANES_FINAL.filter(k => !agentPaneHiddenFinal(k) && agentPaneStateFinal(k) === 'normal');
}
// 그리드 자리 계산 — 열린 개수에 따라 세 가지 배치만 나옵니다.
//   3개: 좌(예산, 2행) / 우상(해야 할 일) / 우하(대화)
//   2개: 무조건 좌우 분할. 예산 현황 보기가 포함되면 예산이 항상 좌측입니다.
//   1개 이하: 탭 순서대로 한 줄씩 전체 폭
function agentSplitPlanFinal() {
  const norm = agentNormalPanesFinal();
  const plan = {};
  if (norm.length === 3) {
    // 6안은 대화가 주 작업 창구라 우측을 통째로 내줍니다.
    // 좌측(예산 현황 + 해야 할 일)은 .agsim-left 래퍼 안에서 흐름 배치하므로
    // grid 좌표를 주지 않습니다 — 그래야 예산 칸을 sticky 로 붙일 수 있습니다.
    if (agentViewFinal === 'sim') {
      plan.chat = { col: '2', row: '1' };
      return plan;
    }
    plan.budget = { col: '1', row: '1 / span 2' };
    plan.todo = { col: '2', row: '1' };
    plan.chat = { col: '2', row: '2' };
    return plan;
  }
  if (norm.length === 2) {
    const left = norm.indexOf('budget') >= 0 ? 'budget' : norm[0];
    const right = norm.filter(k => k !== left)[0];
    const splitAt = Math.min.apply(null, norm.map(k => AGENT_PANES_FINAL.indexOf(k)));
    const rows = {};
    let row = 0;
    AGENT_PANES_FINAL.forEach((k, i) => {
      if (i === splitAt) { row += 1; rows.__split = row; }
      if (norm.indexOf(k) >= 0) return;   // 분할 두 칸은 같은 행을 씁니다
      row += 1; rows[k] = row;
    });
    plan[left] = { col: '1', row: String(rows.__split) };
    plan[right] = { col: '2', row: String(rows.__split) };
    AGENT_PANES_FINAL.forEach(k => { if (!plan[k]) plan[k] = { col: '1 / -1', row: String(rows[k]) }; });
    return plan;
  }
  AGENT_PANES_FINAL.forEach((k, i) => { plan[k] = { col: '1 / -1', row: String(i + 1) }; });
  return plan;
}
function agentPaneGridStyleFinal(plan, k) {
  const g = plan[k];
  return g ? ` style="grid-column:${g.col};grid-row:${g.row}"` : '';
}
// 혼자만 열려 있으면 이미 전체 폭이므로 '전체화면' 단계가 필요 없습니다.
function agentPaneSoloFinal(k) {
  const norm = agentNormalPanesFinal();
  return norm.length === 1 && norm[0] === k;
}
// [2026.08.31] 윈도우 창 제어를 그대로 빌려옵니다 — 접기(─) / 분할(⊞) / 전체화면(□).
// 순환 버튼 하나보다, 세 상태를 나란히 두고 바로 고르는 편이 예측 가능합니다.
function agentPaneSetStateFinal(k, st) {
  // 전체 폭은 한 번에 하나만 — 다른 화면의 full 은 normal 로 되돌립니다.
  AGENT_PANES_FINAL.forEach(x => { if (x !== k && agentPaneStateMapFinal[x] === 'full') agentPaneStateMapFinal[x] = 'normal'; });
  agentPaneStateMapFinal[k] = st;
  renderBudgetPage();
}
const AGWIN_ICON_FINAL = {
  // 접기 — 가운데 가로선
  collapsed: '<line x1="3" y1="8" x2="13" y2="8"/>',
  // 분할 — 같은 사각형 + 십자 분할선
  normal: '<rect x="3" y="3" width="10" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>',
  // 전체폭 — 좌우로 펼치는 양방향 화살표
  full: '<line x1="3" y1="8" x2="13" y2="8"/><polyline points="6 5 3 8 6 11"/><polyline points="10 5 13 8 10 11"/>',
};
// CP총액 팝업(계정별 한도 표) 마운트 — 상태·렌더러는 budget-status-4.js 것을 그대로 씁니다.
function renderAgentCpPopFinal(data, roll) {
  if (typeof cpTotalPopupOpenFinal === 'undefined' || !cpTotalPopupOpenFinal) return '';
  if (typeof renderCpTotalPopupFinal !== 'function') return '';
  const v = (typeof getSelectedExecBudgetVersionFinal === 'function'
    ? getSelectedExecBudgetVersionFinal(data) : null) || { label: '작성중 버전' };
  return renderCpTotalPopupFinal(roll, v);
}

function agentPaneToggleBtnFinal(k) {
  const st = agentPaneStateFinal(k);
  const b = (state, title) => `
    <button class="agwin-b g-${state} ${st === state ? 'on' : ''}" title="${title}" aria-pressed="${st === state}"
      onclick="agentPaneSetStateFinal('${k}','${state}')" aria-label="${title}">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${AGWIN_ICON_FINAL[state]}</svg>
    </button>`;
  return `
    <div class="agwin" role="group" aria-label="화면 크기">
      ${b('collapsed', '접기 — 제목줄만 남깁니다')}
      ${b('normal', '분할 — 다른 화면과 나눠 봅니다')}
      ${b('full', '전체폭 보기 — 이 화면만 전체 폭으로')}
    </div>`;
}

var AGENT_CHAT_FINAL = [
  { who: 'agent', text: '오늘 4개 소스를 점검했습니다. PM 확인이 필요한 변경 4건을 왼쪽 예산 조정안에 정리해 두었습니다. 인건비 2건, 외주비 1건, 경비 1건입니다.' },
  { who: 'pm', text: '외주비 건은 왜 지금 올려야 해요?' },
  { who: 'agent', text: '지금 예산으로는 확정된 견적 24,500,000원대로 계약할 수 없습니다. 4,500,000원이 모자라서, 예산을 먼저 올려야 구매가 진행됩니다.' },
];

function agentChatSendFinal() {
  const el = document.getElementById('agent-chat-input');
  const q = el ? el.value.trim() : '';
  if (!q) { showToast('Agent에게 남길 내용을 입력하세요.'); return; }
  AGENT_CHAT_FINAL.push({ who: 'pm', text: q });
  if (el) el.value = '';

  // [2026.09.04] 외주비 필수값(업체·기간)을 묻는 중이면 그 답변부터 받습니다.
  if (agentSlotFinal && agentSlotFillFinal(q)) { renderBudgetPage(); return; }

  // [2026.09.03] 6안 — 대화로 예산을 조정(시뮬레이션)합니다. 표에 바로 반영됩니다.
  const sim = (typeof agentSimReadFinal === 'function') ? agentSimReadFinal(q) : null;
  if (sim && agentSimApplyFinal(sim)) { renderBudgetPage(); return; }

  // [2026.09.01] 대화는 질문 창구이기도 하고, Agent가 편성할 "근거" 창구이기도 합니다.
  //   앞으로의 계획을 남기면 그 문장을 근거로 삼아 제안을 만들어 올립니다.
  const ev = (typeof agentReadEvidenceFinal === 'function') ? agentReadEvidenceFinal(q, 'cr-02') : null;
  if (ev) {
    const r = agentAddEvidenceProposalFinal(ev);
    const who = r.ev.all ? `확정 견적 ${r.vendors.length}개 업체` : r.ev.targets.map(v => v.vendor).join(', ');
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `근거로 접수했습니다. ${who}의 확정 견적 단가를 그대로 적용해 ${r.ev.toQ}분기까지 계획 라인을 이어 붙였습니다. `
      + `외주비 제안이 ${fmt(r.before)}원 → ${fmt(r.total)}원(${agentDeltaFinal(r.added)})으로 늘었습니다 — `
      + `제안을 나누지 않았으니 한 번만 기안하시면 ${r.ev.toQ}분기까지 계획이 함께 수립됩니다. `
      + `견적이 실제로 확정되면 확정 금액으로 다시 계산해 차액만 알려드리겠습니다.` });
    showToast(`대화를 근거로 외주비 계획을 ${r.ev.toQ}분기까지 늘렸습니다 — ${fmt(r.total)}원 (기안 1건)`);
    renderBudgetPage();
    return;
  }

  const row = { who: 'agent', text: '…', pending: true };
  AGENT_CHAT_FINAL.push(row);
  renderBudgetPage();

  const pend = agentProposalsFinal('pending');
  const local = pend.length
    ? `현재 검토 대기 ${pend.length}건입니다. ` + pend.map(p => `${p.acct} ${agentDeltaFinal(p.to - p.from)}`).join(' · ')
      + `. 가장 시급한 건은 ${pend[0].acct} — ${pend[0].title}입니다.`
    : '검토 대기 중인 변경은 없습니다. 감지 소스 4곳을 계속 보고 있습니다.';
  fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: `[예산관리Agent] PM 질문: ${q}\n대기 제안: ${JSON.stringify(pend.map(p => ({ 계정: p.acct, 변동: p.to - p.from, 근거: p.title })))}` }),
  })
    .then(r => r.json())
    .then(j => { row.text = (j && j.answer) ? j.answer : local; delete row.pending; renderBudgetPage(); })
    .catch(() => { row.text = local; delete row.pending; renderBudgetPage(); });
}

// 우측 상단 — 해야 할 일. [2026.08.31] 5안과 완전히 같은 목록·기안 흐름을 씁니다.
//   PM   : 체크박스로 골라 [선택 N건 기안 →] 또는 [모두 제안대로 (Y)] → 결재선 지정 팝업 → 상신
//   직책자: 상신된 기안을 기안건 단위로 전체 승인 / 전체 반려, 반려 건은 PM이 재기안
function renderAgentTodoFinal() {
  if (agentPaneHiddenFinal('todo')) return '';
  const exec = agentIsExecFinal();
  const pend = agentByStatusFinal('pending');
  const subD = agentDraftsFinal('submitted');
  const retD = agentDraftsFinal('returned');
  // 직책자 반려로 [해야 할 일]로 되돌아온 건수
  const backCnt = pend.filter(p => p.returnReason).length;
  const confD = agentDraftsFinal('confirmed');

  // 결재 건수는 계정 수와 무관하게 기안 1건 = 1건으로 셉니다.
  const mineCnt = exec ? subD.length : pend.length + retD.length;
  const net = exec
    ? subD.reduce((t, d) => t + agentDraftNetFinal(d), 0)
    : pend.reduce((t, p) => t + agentNetFinal(p), 0) + retD.reduce((t, d) => t + agentDraftNetFinal(d), 0);
  const selN = agentSelCountFinal(pend.map(x => x.id));        // 기안 건수(계정 기준)
  const selRaw = agentSelectedFinal(pend.map(x => x.id)).length; // 체크된 항목 수
  const past = (typeof agentVerIsPastFinal === 'function') && agentVerIsPastFinal();
  // 결재자는 "이 기안들이 CP를 얼마나 쓰는가"를 목록 머리에서 바로 봅니다
  const cpSub = agentTodoCpSubFinal(exec ? subD : null);

  const list = mineCnt
    ? (exec
        ? subD.map(d => renderAgentDraftRowFinal(d, 'exec')).join('')
        : retD.map(d => renderAgentDraftRowFinal(d, 'pm')).join('') + renderAgentPendingListFinal(pend))
    : `<div class="ag-empty">${exec
        ? 'PM이 상신하면 여기에서 결재하실 수 있습니다.'
        : 'Agent가 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적을 계속 보고 있습니다.'}</div>`;

  return `
    <div class="agent-pane todo ${agentPaneStateFinal('todo')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'todo')}>
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>${exec ? '결재할 일' : '해야 할 일'}</strong>
          ${(agentViewFinal === 'sim' || agentPaneStateFinal('todo') === 'collapsed') ? '' : `
            <span>${mineCnt
              ? `${exec ? '기안 ' : ''}${mineCnt}건 · 합계 ${net === 0 ? '±0원' : agentDeltaFinal(net)}${cpSub}`
              : '처리할 항목 없음'}</span>`}
        </div>
        ${(agentViewFinal === 'sim' && !exec && pend.length && !past
            && agentPaneStateFinal('todo') !== 'collapsed') ? `
          <label class="agm-check all inline" title="전체 선택">
            <input type="checkbox" ${pend.length && selRaw === pend.length ? 'checked' : ''}
              onchange="agentSelAllFinal([${pend.map(x => `'${x.id}'`).join(',')}], this.checked)">
            <span>전체</span>
          </label>
          <button class="agm-box-draft sm" onclick="agentMiniBulkFinal()">${
            selN ? `선택 ${selN}건 기안 →` : '기안 →'}</button>` : ''}
        ${agentPaneToggleBtnFinal('todo')}
      </div>
      ${(agentViewFinal !== 'sim' && !exec && pend.length && !past) ? `
        <div class="agpane-actbar">
          <label class="agm-check all" title="전체 선택">
            <input type="checkbox" ${pend.length && selRaw === pend.length ? 'checked' : ''}
              onchange="agentSelAllFinal([${pend.map(x => `'${x.id}'`).join(',')}], this.checked)">
            <span>전체</span>
          </label>
          <button class="agm-box-draft" onclick="agentMiniBulkFinal()">${
            selN ? `선택 ${selN}건 기안 →` : '모두 제안대로 (Y)'}</button>
        </div>` : ''}
      <div class="agpane-body">
        <div class="agm-list">${list}</div>
        ${(agentViewFinal === 'sim' && !past && agentPaneStateFinal('todo') === 'full')
          ? renderAgentTodoAcctFinal() : ''}
      </div>
      ${(subD.length && !exec) || confD.length || backCnt ? `
        <div class="agpane-foot done">
          <b>${[
            subD.length && !exec ? `결재 대기 기안 ${subD.length}건` : '',
            confD.length ? `승인 완료 기안 ${confD.length}건` : '',
            backCnt ? `반려 원복 ${backCnt}건 — 다시 검토가 필요합니다` : '',
          ].filter(Boolean).join(' · ')}</b>
          <button onclick="agentHistOpenFinal('approval')">결재 이력 보기 →</button>
        </div>` : ''}
    </div>`;
}

/* [2026.09.04] Agent 답변에 붙는 동작 버튼.
   "이 방안으로 확정해줘"라고 되받아 쓰게 하지 않고 바로 누르게 합니다. */
function renderAgentChatActionFinal(d) {
  if (!d || d.action !== 'commit') return '';
  // 이미 확정했거나 되돌렸으면 버튼을 지웁니다.
  if (typeof agentSimActiveFinal === 'function' && !agentSimActiveFinal()) return '';
  return `
    <div class="agc-act">
      <button class="agc-act-go" onclick="agentSimCommitFinal()">해야 할 일로 반영</button>
      <button onclick="agentSimDraftFinal()">바로 기안 →</button>
      <button onclick="agentSimClearFinal()">되돌리기</button>
    </div>`;
}

/* [2026.09.04] 대화가 오가면 대화창을 최신 메시지로 내려 줍니다.
   렌더가 끝난 뒤에 스크롤해야 하므로 한 틱 뒤에 처리합니다.
   대화가 늘지 않은 렌더(반영 클릭 등)에서는 건드리지 않아, PM이 위로 올려 읽던 위치를 지킵니다. */
var agentChatSeenFinal = '';
function agentChatKeepBottomFinal() {
  const last = AGENT_CHAT_FINAL[AGENT_CHAT_FINAL.length - 1] || {};
  const sig = AGENT_CHAT_FINAL.length + '|' + String(last.text || '').length;
  if (sig === agentChatSeenFinal) return;
  agentChatSeenFinal = sig;
  setTimeout(function () {
    ['.agga-col-body.chat', '.agent-pane.chat .agpane-body', '.agai-stream']
      .forEach(function (sel) {
        const el = document.querySelector(sel);
        if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
      });
    // AI구상안은 스트림이 페이지째 흐르므로 문서를 내립니다
    if (agentViewFinal === 'ai') {
      const y = document.documentElement.scrollHeight;
      window.scrollTo(0, y);
      const sc = document.getElementById('s-budget');
      if (sc && sc.scrollHeight > sc.clientHeight) sc.scrollTop = sc.scrollHeight;
    }
  }, 0);
}

/* 채팅으로 일하는 화면이라, 자주 쓰는 명령을 입력창 바로 위에 둡니다.
   조정 중일 때와 아닐 때 필요한 명령이 다릅니다. */
function renderAgentChatQuickFinal() {
  const on = (typeof agentSimActiveFinal === 'function') && agentSimActiveFinal();
  const acct = (typeof budgetSetupEditAccount !== 'undefined' && budgetSetupEditAccount) || '외주비';
  // [문구, 바로 실행할지]
  const items = on
    ? [['기안해줘', 1], ['방안 저장해줘', 1], ['되돌려줘', 1],
       [`${acct} 1천만원 더 늘려줘`, 0]]
    : [[`${acct} 3천만원 늘려줘`, 0], ['재료비에서 외주비로 1천만원 옮겨줘', 0],
       ['경비 300만원 줄여줘', 0], ['기안해줘', 1], ['지금 CP 여유 얼마야?', 1]];
  return `
    <div class="agcq">
      ${items.map(x => `<button class="${x[1] ? 'run' : ''}"
        onclick="agentSimAskFinal('${x[0]}',${x[1]})">${escHtml(x[0])}</button>`).join('')}
    </div>`;
}

// 우측 하단 — Agent와의 대화창
function renderAgentChatPaneFinal() {
  return `
    <div class="agent-pane chat ${agentPaneStateFinal('chat')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'chat')}>
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>Agent와 대화하기</strong>
          ${agentViewFinal === 'sim' ? '' : `
            <span>궁금한 것을 묻고, 앞으로의 계획을 남기면 Agent가 그 근거로 편성을 제안합니다.</span>`}
        </div>
        ${agentPaneToggleBtnFinal('chat')}
      </div>
      <div class="agpane-body">
        ${AGENT_CHAT_FINAL.map(d => `
          <div class="agc-msg ${d.who}">
            <span class="agc-who">${d.who === 'pm' ? '이봄(PM)' : 'Agent'}</span>
            <div class="agc-text ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
            ${renderAgentChatActionFinal(d)}
          </div>`).join('')}
      </div>
      ${agentViewFinal === 'sim' ? renderAgentChatQuickFinal() : ''}
      <div class="agpane-foot">
        <input id="agent-chat-input" type="text" placeholder="${agentViewFinal === 'sim'
          ? '무엇을 하시겠어요? — 예: 외주비 3천만원 늘려줘'
          : '질문하거나, 편성 근거를 남겨 주세요 — 예: 테크노아이티는 4분기까지 동일한 견적으로 진행됩니다'}"
          onkeydown="if(event.key==='Enter') agentChatSendFinal()">
        <button onclick="agentChatSendFinal()">보내기</button>
      </div>
    </div>`;
}

// ④ 3분할 — 탭 순서는 할일·대화·예산, 3분할 배치는 좌 예산 / 우상 할일 / 우하 대화
function renderAgentSplitViewFinal(viewData, data, projInfo, roll) {
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell split ${agentIsExecFinal() ? 'as-exec' : ''}">
      ${projInfo}
      ${renderAgentVersionBarFinal()}
      ${renderAgentPastNoticeFinal()}
      <div class="agent-split n${agentNormalPanesFinal().length}">
        ${renderAgentTodoFinal()}
        ${renderAgentChatPaneFinal()}
        <div class="agent-pane budget ${agentPaneStateFinal('budget')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'budget')}>
          <div class="agpane-head">
            <div class="agpane-title">
              <strong>예산 현황 보기</strong>
              <span>Agent가 관리하는 계정 현황과 CP총액 한도</span>
            </div>
            ${agentPaneToggleBtnFinal('budget')}
          </div>
          <div class="agpane-body">
            ${renderAgentAccountRailFinal(viewData, data, roll)}
          </div>
        </div>
      </div>

      <!-- [2026.08.31] 4안에도 이력 — 5안과 같은 방식으로 필요할 때 찾아 들어가 봅니다. -->
      ${renderAgentHistLinkFinal()}
    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentReturnNoticeFinal()}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}


/* ==========================================================================
   11. [2026.08.28 위클리 피드백 반영 #5] 전체 계정 현황
       월별 계정별 합계 나열 대신, Agent가 전 계정을 보고 판단한 것을 보여줍니다.
       (월별 금액은 계정을 선택하면 그 계정 예산내역 표에서 볼 수 있습니다)
   ========================================================================== */

// 계정 하나의 상태 판정 — 집행률과 기간 경과율을 비교합니다.
function agentAcctHealthFinal(r, elapsed) {
  const rate = r.plan > 0 ? r.done / r.plan : 0;
  const gap = rate - elapsed;
  if (r.plan <= 0) return { key: 'none', label: '미편성', desc: '계획이 없습니다' };
  if (gap > 0.15) return { key: 'fast', label: '집행 과속', desc: `기간 경과보다 ${Math.round(gap * 100)}%p 앞섬` };
  if (gap < -0.25) return { key: 'slow', label: '집행 지연', desc: `기간 경과보다 ${Math.round(-gap * 100)}%p 뒤짐` };
  return { key: 'ok', label: '정상', desc: '기간 경과와 보조를 맞춤' };
}

function renderAgentInsightFinal(viewData, data, roll) {
  // 기간 경과율 — 프로젝트 전체 개월 수 대비 지난 달 수
  const months = viewData.months.map(m => m.m);
  const today = (typeof osv3TodayMonthV3 === 'function') ? osv3TodayMonthV3() : '2026-08';
  const passed = months.filter(m => m <= today).length;
  const elapsed = months.length ? passed / months.length : 0;

  const pend = agentProposalsFinal('pending');
  const ref = agentReflectFinal();
  const pendByAcct = {};
  pend.forEach(p => { pendByAcct[p.acct] = (pendByAcct[p.acct] || 0) + (p.to - p.from); });

  const rows = roll.rows.map(r => {
    const h = agentAcctHealthFinal(r, elapsed);
    const rate = r.plan > 0 ? (r.done / r.plan) * 100 : 0;
    const delta = pendByAcct[r.acct] || 0;
    return { r, h, rate, delta };
  });

  // Agent가 짚어주는 문장 — 데이터에서 뽑아 만듭니다.
  const notes = [];
  const fast = rows.filter(x => x.h.key === 'fast');
  const slow = rows.filter(x => x.h.key === 'slow');
  if (pend.length) {
    const net = pend.reduce((t, p) => t + (p.to - p.from), 0);
    notes.push(`검토 대기 ${pend.length}건을 모두 반영하면 수립 예산은 ${agentWonFinal(roll.plan + net)}이 되고, CP총액 여유는 ${agentWonFinal(roll.cpRemain - net)}이 남습니다.`);
  }
  if (fast.length) notes.push(`${fast.map(x => x.r.acct).join(', ')}는 기간 경과보다 집행이 앞서 있습니다. 잔여 기간에 쓸 예산이 부족해질 수 있어 Agent가 집중 감시 중입니다.`);
  if (slow.length) notes.push(`${slow.map(x => x.r.acct).join(', ')}는 집행이 계획보다 뒤처져 있습니다. 남은 기간에 몰릴 경우 월 마감에서 편차가 커집니다.`);
  const biggest = rows.slice().sort((a, b) => b.r.remain - a.r.remain)[0];
  if (biggest) notes.push(`미집행 계획이 가장 많은 계정은 ${biggest.r.acct} ${agentWonFinal(biggest.r.remain)}으로, 전체 미집행의 ${roll.plan - roll.done > 0 ? Math.round((biggest.r.remain / (roll.plan - roll.done)) * 100) : 0}%를 차지합니다.`);
  notes.push(`총액이 바뀌지 않는 조정 ${AGENT_AUTO_FINAL.length}건은 Agent가 확인 없이 반영했습니다. PM 검토가 필요한 것은 금액이 바뀌는 변경뿐입니다.`);

  return `
    <div class="agent-insight">
      <div class="agin-head">
        <strong>전체 계정 현황</strong>
        <span>기간 경과율 ${Math.round(elapsed * 100)}% (${passed}/${months.length}개월) 기준으로 Agent가 ${roll.rows.length}개 계정을 판단한 결과입니다.</span>
      </div>

      <div class="agin-scroll">
      <table class="agin-table">
        <thead>
          <tr><th>계정</th><th class="num">수립</th><th class="num">실적(확정)</th><th class="num">계획(미집행)</th>
            <th>집행률 vs 기간</th><th class="num">대기 제안</th><th class="num">반영 후 수립</th><th>Agent 판단</th></tr>
        </thead>
        <tbody>${rows.map(x => `
          <tr>
            <td><span class="agp-acct sm ${agentAcctColorFinal(x.r.acct)}">${x.r.acct}</span></td>
            <td class="num">${fmt(x.r.plan)}</td>
            <td class="num done">${fmt(x.r.done)}</td>
            <td class="num open">${fmt(x.r.remain)}</td>
            <td class="agin-bar-cell">
              <div class="agin-bar">
                <i style="width:${Math.min(x.rate, 100)}%"></i>
                <u style="left:${Math.min(elapsed * 100, 100)}%" title="기간 경과율 ${Math.round(elapsed * 100)}%"></u>
              </div>
              <span>${Math.round(x.rate * 10) / 10}%</span>
            </td>
            <td class="num ${x.delta > 0 ? 'up' : x.delta < 0 ? 'down' : ''}">${x.delta ? agentDeltaFinal(x.delta) : '–'}</td>
            <td class="num after">${agentReflectOfFinal(ref, x.r.acct)
              ? `<b>${fmt(x.r.plan + agentReflectOfFinal(ref, x.r.acct))}</b>` : fmt(x.r.plan)}</td>
            <td><em class="agin-health ${x.h.key}">${x.h.label}</em><span class="agin-health-desc">${x.h.desc}</span></td>
          </tr>`).join('')}</tbody>
        <tfoot>
          <tr><td>합계</td><td class="num">${fmt(roll.plan)}</td><td class="num done">${fmt(roll.done)}</td>
            <td class="num open">${fmt(roll.plan - roll.done)}</td>
            <td class="agin-bar-cell"><span>${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}%</span></td>
            <td class="num">${pend.length ? agentDeltaFinal(pend.reduce((t, p) => t + (p.to - p.from), 0)) : '–'}</td>
            <td class="num after"><b>${fmt(roll.plan + ref.net)}</b></td>
            <td></td></tr>
        </tfoot>
      </table>
      </div>

      <div class="agin-notes">
        <b>🤖 Agent가 짚는 포인트</b>
        <ul>${notes.map(n => `<li>${escHtml(n)}</li>`).join('')}</ul>
      </div>
      <p class="agin-foot">※ 계정별 월별 금액은 위 [Agent가 관리 중인 계정]에서 계정을 선택하면 해당 계정 예산내역 표에서 확인할 수 있습니다.</p>
    </div>`;
}





/* ==========================================================================
   [2026.09.03] 대화형 Agent — 두 안의 장점만 남긴 구성 (원가조정 기본 화면)
     · 상단  : AI구상안의 LIVE 바 그대로 (스크롤해도 붙어 있습니다)
     · 좌 30%: 해야 할 일 — [반영]을 누르면 그 즉시 위 숫자가 움직입니다
     · 우 70%: Agent와 대화하기 — 조정·조회·기안을 여기서 끝냅니다
     3분할 간소화의 표 형식은 쓰지 않습니다. 숫자는 상단 바 하나로 충분합니다.
   ========================================================================== */

/* [2026.09.04] 좌측 칸 이름 ────────────────────────────────────────────────
   이 칸은 "해야 할 일" 목록이 아닙니다.
     · Agent 제안과 PM이 대화로 지시한 것이 함께 모입니다
     · [반영]으로 예산 증·감을 눈으로 확인합니다
     · 최종적으로 승인자에게 기안합니다
   즉 이번 버전에 담을 "안"을 만드는 칸이라 [예산 조정안]으로 부릅니다.
   (다른 이름 후보는 아래 상수를 바꾸면 화면·대화 문구가 함께 따라갑니다) */
var AGENT_TODO_LABEL_FINAL = '예산 조정안';
function agentTodoLabelFinal() {
  return agentIsExecFinal() ? '결재할 일' : AGENT_TODO_LABEL_FINAL;
}

/* ── 좌측 30% — 예산 조정안 (좁은 칸용 세로 카드) ── */
function renderAgentGaCardFinal(p) {
  const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(p.id) : null;
  const sel = g ? g.ids.find(x => agentMiniSelFinal[x]) : null;
  const cur = sel ? agentFindProposalFinal(sel) : p;
  const on = g ? !!sel : !!agentMiniSelFinal[p.id];
  const open = !!agentAiCardOpenFinal[p.id];
  const src = (g && g.source) ? g.source : (cur.source || {});
  const net = agentNetFinal(cur);
  const legs = cur.legs || [];
  const title = g ? g.problem : cur.title;
  const tag = cur.sim ? ['sim', '✍ PM 판단'] : cur.manual ? ['manual', '✎ 수동 개입'] : ['agent', '🤖 Agent 제안'];
  const at = src.ifAt || cur.detectedAt || '';

  const amount = (g && !sel)
    ? `<em class="agga-hint">${escHtml(g.detected || '')}</em>`
    : legs.length > 1
      ? `<em class="agga-legs">${legs.map(l => `${l.acct} ${agentDeltaFinal(l.delta)}`).join('<br>')}</em>`
      : `<em class="agga-amt ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${net === 0 ? '±0원' : agentDeltaFinal(net)}</em>`;

  const acts = `
    ${g ? g.ids.map((x, i) => {
        const o = agentFindProposalFinal(x); const n = agentNetFinal(o);
        const lab = (n === 0 && (o.legs || []).length > 1) ? '이관 ±0' : agentDeltaFinal(n);
        return `<button class="agai-seg ${agentMiniSelFinal[x] ? 'on' : ''}"
          title="${escHtml((g.titles || {})[x] || '')}"
          onclick="agentAiPickFinal('${x}',true)">${i + 1}안 ${lab}</button>`;
      }).join('')
      : `<button class="agai-yes ${on ? 'on' : ''}"
           onclick="agentAiPickFinal('${p.id}',${on ? 'false' : 'true'})">${on ? '✓ 반영됨' : '반영'}</button>`}
    ${(g && sel) ? `<button class="agga-no" onclick="agentAiPickFinal('${sel}',false)">보류</button>` : ''}
    <button class="agga-why ${open ? 'on' : ''}" onclick="agentAiCardToggleFinal('${p.id}')">근거 ${open ? '∧' : '∨'}</button>`;

  return `
    <div class="agga-card ${on ? 'on' : ''} ${tag[0]}">
      <div class="agga-body">
        <div class="agga-left">
          <div class="agga-head">
            <span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
            <i class="agai-tag ${tag[0]}">${tag[1]}</i>
          </div>
          <b class="agga-title">${escHtml(title)}</b>
          ${(g && sel) ? `<div class="agga-opt">${g.ids.indexOf(sel) + 1}안 — ${escHtml((g.titles || {})[sel] || '')}</div>` : ''}
          ${at ? `<div class="agga-at">${escHtml(at)}</div>` : ''}
        </div>
        <div class="agga-right">
          ${amount}
          <div class="agga-acts">${acts}</div>
        </div>
      </div>
      ${open ? `
        <div class="agga-whybox">
          ${g ? `<p class="agai-gwhy">${escHtml(g.why || '')}</p>` : ''}
          <p>${escHtml(cur.why || '')}</p>
          ${src.main ? `
            <div class="agai-src">
              <b>${escHtml(src.main)}</b>
              ${src.ifFrom ? `<span>${escHtml(src.ifFrom)}</span>` : ''}
              ${src.ifBody ? `<span>${escHtml(src.ifBody)}</span>` : ''}
              ${(src.facts || []).map(f => `<span>· ${escHtml(f)}</span>`).join('')}
            </div>` : ''}
          ${cur.impact ? `<p class="agai-impact">영향 — ${escHtml(cur.impact)}</p>` : ''}
        </div>` : ''}
    </div>`;
}

function renderAgentGaTodoFinal(roll) {
  const pend = agentProposalsFinal('pending');
  const subD = agentDraftsFinal('submitted');
  const confD = agentDraftsFinal('confirmed');
  const retD = agentDraftsFinal('returned');
  const past = (typeof agentVerIsPastFinal === 'function') && agentVerIsPastFinal();
  const exec = agentIsExecFinal();      // 직책자는 결재할 기안만 봅니다

  // 택1은 문제 하나 = 카드 하나
  const gDone = {}, cards = [];
  pend.forEach(x => {
    const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(x.id) : null;
    if (!g) { cards.push({ p: x, picked: !!agentMiniSelFinal[x.id] }); return; }
    if (gDone[g.key]) return;
    gDone[g.key] = true;
    cards.push({ p: x, picked: g.ids.some(y => agentMiniSelFinal[y]) });
  });
  const waiting = cards.filter(c => !c.picked);
  const picked = cards.filter(c => c.picked);
  const selN = agentSelCountFinal(pend.filter(x => agentMiniSelFinal[x.id]).map(x => x.id));

  return `
    <div class="agga-col todo">
      <div class="agga-col-head">
        <strong>${agentTodoLabelFinal()}</strong>
        ${(!exec && !past && cards.length) ? `
          <button class="agga-all" onclick="agentPickAllBtnFinal()">전부 반영</button>
          <button class="agga-all" ${picked.length ? '' : 'disabled'}
            onclick="agentPickClearBtnFinal()">전부 해제</button>
          <button class="agga-draft" ${selN ? '' : 'disabled'} onclick="agentSimDraftFinal()">기안 ${selN || ''}${selN ? '건 ' : ''}→</button>` : ''}
        ${(exec && subD.length) ? `<em class="agga-simtag">결재 대기 ${subD.length}건</em>` : ''}
      </div>
      <div class="agga-col-body">
        ${past ? '<div class="ag-empty">과거 확정 버전에는 처리할 일이 없습니다.</div>' : ''}
        ${(exec && !past) ? (subD.length
          ? subD.map(d => renderAgentDraftRowFinal(d, 'exec')).join('')
          : '<div class="ag-empty">PM이 상신하면 여기에서 결재하실 수 있습니다.</div>') : ''}
        ${(!exec && !past && !cards.length) ? `<div class="ag-empty">검토가 필요한 건이 없습니다.<br>Agent가 구매 PO · SCM 투입계획 · ERP 가용예산 · 월 마감을 계속 보고 있습니다.</div>` : ''}
        ${(!exec && cards.length) ? `
          <div class="agga-group">
            <div class="agga-group-head">
              <b>검토 대기</b><em>${waiting.length}</em>
              ${picked.length ? `<b class="on">반영</b><em class="on">${picked.length}</em>` : ''}
            </div>
            ${cards.map(c => renderAgentGaCardFinal(c.p)).join('')}
          </div>` : ''}
        ${(!exec && (subD.length || confD.length || retD.length)) ? `
          <div class="agga-flow">
            ${retD.map(d => `<div class="agai-flow-row bad">↩ ${d.no} 반려
              <button onclick="agentDraftRedraftFinal('${d.id}')">재기안</button></div>`).join('')}
            ${subD.map(d => `<div class="agai-flow-row sub">${d.no} 결재 대기<em>${agentDeltaFinal(agentDraftNetFinal(d))}</em></div>`).join('')}
            ${confD.map(d => `<div class="agai-flow-row ok">${d.no} 승인<em>${agentDeltaFinal(agentDraftNetFinal(d))}</em></div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
}


/* ==========================================================================
   [2026.09.04] 계정 상세 — 팝업이 아니라 해야 할 일 자리(좌 70%)에 펼칩니다.
     우측 30% 에는 Agent와 대화하기가 그대로 남아, 보면서 바로 지시할 수 있습니다.
   ========================================================================== */

var agentLabKindFinal = 'direct';   // direct | transfer | ot
function agentLabKindSetFinal(k) { agentLabKindFinal = k; renderBudgetPage(); }

/* 인건비 표 한 줄 — 등록 인력에 "반영하기로 고른" 제안의 변동을 얹습니다. */
/* 승인 완료된 기준 인력 — 투입계획이 0MM 인 인력은 계획에 잡지 않습니다. */
function agentLaborBaseRowsFinal() {
  const base = (typeof getLaborRows === 'function' ? getLaborRows() : []) || [];
  return base.filter(r => Number(r.totalMm || 0) > 0);
}

function agentLaborRowsFinal() {
  const base = agentLaborBaseRowsFinal();
  const rows = base.map(r => ({
    name: r.name, org: r.org, role: r.role, unit: r.unitPrice,
    start: r.startDate, end: r.endDate, mm: r.totalMm, amount: r.amount,
    state: '', dMm: 0, dAmt: 0,
  }));

  // 고른 제안만 반영합니다 — 상단 LIVE 바와 같은 규칙입니다.
  agentProposalsFinal('pending').forEach(p => {
    if (p.acct !== '인건비' || !agentMiniSelFinal[p.id]) return;
    (p.persons || []).forEach(x => {
      rows.push({
        name: x.name, org: x.org || '—', role: x.role || 'SCM 확정 인력', unit: x.unit,
        start: String(x.period || '').split('~')[0].trim(),
        end: String(String(x.period || '').split('~')[1] || '').trim(),
        mm: x.mm, amount: x.amount, state: '신규추가', dMm: x.mm, dAmt: x.amount,
      });
    });
    (p.leaves || []).forEach(x => {
      const hit = rows.find(r => r.name === x.name);
      if (hit) {
        hit.state = '철수'; hit.dMm = -Math.abs(x.mm || 0); hit.dAmt = -Math.abs(x.amount || 0);
        hit.mm = Math.max(hit.mm + hit.dMm, 0); hit.amount = Math.max(hit.amount + hit.dAmt, 0);
        if (x.newEnd) hit.end = x.newEnd;
      } else {
        rows.push({
          name: x.name, org: x.org || '—', role: x.role || '설계', unit: x.unit,
          start: x.start || '', end: x.newEnd || x.end || '',
          mm: 0, amount: 0, state: '철수', dMm: -Math.abs(x.mm || 0), dAmt: -Math.abs(x.amount || 0),
        });
      }
    });
  });
  return rows;
}

/* 간트 — 프로젝트 전체 일정 위에 인력별 투입 구간을 그립니다. */
function agentLaborGanttFinal(viewData, rows) {
  const months = (viewData.months || []).map(m => m.m);
  if (!months.length || !rows.length) return '';
  const idx = m => months.indexOf(String(m || '').slice(0, 7));
  const today = (typeof osv3TodayMonthV3 === 'function') ? osv3TodayMonthV3() : '2026-08';
  const tIdx = months.indexOf(today);
  const N = months.length;
  // 연도 머리 — 12개월이 넘으면 연도로 묶어 보여 줍니다
  const yr = [];
  months.forEach(m => {
    const y = m.slice(0, 4);
    if (yr.length && yr[yr.length - 1].y === y) yr[yr.length - 1].n += 1;
    else yr.push({ y, n: 1 });
  });
  return `
    <div class="aglg">
      <div class="aglg-head">
        <b>인력 투입 일정</b>
        <span>${months[0]} ~ ${months[N - 1]} · ${N}개월</span>
        <i class="aglg-key"><u class="on"></u>투입 <u class="new"></u>신규추가 <u class="out"></u>철수</i>
      </div>
      <div class="aglg-scroll">
        <div class="aglg-grid" style="--n:${N}">
          <div class="aglg-corner"></div>
          <div class="aglg-years">${yr.map(v => `<span style="grid-column:span ${v.n}">${v.y}</span>`).join('')}</div>
          <div class="aglg-corner"></div>
          <div class="aglg-months">${months.map((m, i) =>
            `<span class="${i === tIdx ? 'now' : ''}">${m.slice(5)}</span>`).join('')}</div>
          ${rows.map(r => {
            const a = Math.max(idx(r.start), 0);
            const b = r.end ? idx(r.end) : N - 1;
            const from = Math.min(a, N - 1);
            const to = b < 0 ? N - 1 : Math.max(b, from);
            const cls = r.state === '신규추가' ? 'new' : r.state === '철수' ? 'out' : 'on';
            return `
              <div class="aglg-name" title="${escHtml(r.role || '')}">
                <b>${escHtml(r.name)}</b><span>${escHtml(r.org || '')}</span>
              </div>
              <div class="aglg-track">
                ${months.map((m, i) => `<i class="${i === tIdx ? 'now' : ''}"></i>`).join('')}
                <u class="${cls}" style="grid-column:${from + 1} / ${to + 2}">
                  ${r.mm ? r.mm.toFixed(1) + 'MM' : ''}</u>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* 인건비 상세 — 탭 · 인력표 · 합계 · 간트 */
function renderAgentLaborDetailFinal(viewData, roll) {
  const kinds = [
    { k: 'direct', label: '실투입인건비' },
    { k: 'transfer', label: '이관인건비' },
    { k: 'ot', label: 'OT비' },
  ];
  const planRows = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, '인건비') : []) || [];
  const kindNames = kinds.map(x => x.label);
  const tabs = `
    <div class="aglb-tabs">
      ${kinds.map((x, i) => {
        const dir = agentSubDirectiveAtFinal('인건비', kindNames, i);
        const base = (planRows[i] || {}).plan || 0;
        return `
        <button class="${agentLabKindFinal === x.k ? 'on' : ''}" onclick="agentLabKindSetFinal('${x.k}')">
          <em>${('0' + (i + 1)).slice(-2)}</em><span class="aglb-tabname">${x.label}</span>
          <i>${fmt(base + (dir ? dir.amount : 0))}${dir ? `<u>${agentDeltaFinal(dir.amount)}</u>` : ''}</i>
        </button>`;
      }).join('')}
    </div>`;

  if (agentLabKindFinal === 'transfer' || agentLabKindFinal === 'ot') {
    const isT = agentLabKindFinal === 'transfer';
    const list = isT
      ? ((typeof getLaborTransferRowsFinal === 'function' ? getLaborTransferRowsFinal() : []) || [])
      : ((typeof getLaborOtRowsFinal === 'function' ? getLaborOtRowsFinal() : []) || []);
    const tot = list.reduce((t, x) => t + (x.amount || 0), 0);
    const dir = agentSubDirectiveAtFinal('인건비', kindNames, isT ? 1 : 2);
    return `
      ${tabs}
      <div class="aglb-wrap">
        <table class="aglb">
          <thead><tr>
            <th>${isT ? '이관 구분' : '구분'}</th><th>${isT ? '발생 예정월' : '대상 월'}</th>
            <th>내용</th><th class="num">금액</th><th>상태</th>
          </tr></thead>
          <tbody>${list.map(x => `
            <tr>
              <td><b>${escHtml(x.transferType || x.kind || 'OT')}</b></td>
              <td>${escHtml(x.expectedMonth || x.month || '')}</td>
              <td>${escHtml(x.description || x.memo || '')}</td>
              <td class="num ${(x.amount || 0) < 0 ? 'down' : ''}">${fmt(x.amount || 0)}원</td>
              <td><em class="aglb-st">${escHtml(x.status || '계획')}</em></td>
            </tr>`).join('')}
            ${renderAgentDirRowFinal(dir, 5)}
            ${(!list.length && !dir) ? '<tr><td colspan="5" class="aglb-empty">등록된 내역이 없습니다.</td></tr>' : ''}</tbody>
          ${(list.length || dir) ? `<tfoot><tr>
            <td>합계 ${list.length + (dir ? 1 : 0)}건</td><td></td><td></td>
            <td class="num">${fmt(tot + (dir ? dir.amount : 0))}원</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
      ${renderAgentAcctCpFinal('인건비', planRows.reduce((a, r) => a + r.plan, 0)
        + agentAcctPickedDeltaFinal('인건비'))}`;
  }

  const rows = agentLaborRowsFinal();
  const sum = rows.reduce((a, r) => ({ mm: a.mm + (r.mm || 0), amt: a.amt + (r.amount || 0),
    dMm: a.dMm + (r.dMm || 0), dAmt: a.dAmt + (r.dAmt || 0) }), { mm: 0, amt: 0, dMm: 0, dAmt: 0 });
  const st = r => {
    if (!r.state) return '<td class="aglb-state">–</td>';
    const cls = r.state === '신규추가' ? 'new' : r.state === '철수' ? 'out' : 'chg';
    return `<td class="aglb-state ${cls}">
      <em>${r.state}</em>
      <span>${r.dMm ? (r.dMm > 0 ? '+' : '−') + Math.abs(r.dMm).toFixed(1) + 'MM' : ''}
        ${r.dAmt ? agentDeltaFinal(r.dAmt) : ''}</span></td>`;
  };

  return `
    ${tabs}
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>인력</th><th>조직명</th><th>역할</th><th class="num">단가</th>
          <th>투입기간</th><th class="num">총MM</th><th class="num">금액</th><th>상태</th>
        </tr></thead>
        <tbody>${rows.map(r => `
          <tr class="${r.state === '신규추가' ? 'new' : r.state === '철수' ? 'out' : ''}">
            <td><b>${escHtml(r.name)}</b></td>
            <td>${escHtml(r.org || '')}</td>
            <td>${escHtml(r.role || '')}</td>
            <td class="num">${fmt(r.unit || 0)}</td>
            <td>${escHtml(r.start || '')} ~ ${escHtml(r.end || '')}</td>
            <td class="num">${(r.mm || 0).toFixed(1)}MM</td>
            <td class="num"><b>${fmt(r.amount || 0)}원</b></td>
            ${st(r)}
          </tr>`).join('')}
          ${(function () {
            const dir = agentSubDirectiveAtFinal('인건비', kindNames, 0);
            if (!dir) return '';
            return `
              <tr class="aglb-dir">
                <td><b>PM 지시</b></td>
                <td></td><td>${escHtml(dir.kind || agentDirSrcFinal(dir))}</td><td></td><td></td><td></td>
                <td class="num up"><b>${agentDeltaFinal(dir.amount)}</b></td>
                <td><em class="aglb-st dir">지시 반영 중</em></td>
              </tr>`;
          })()}</tbody>
        <tfoot><tr>
          <td>합계 ${rows.length}명</td><td></td><td></td><td></td><td></td>
          <td class="num">${sum.mm.toFixed(1)}MM</td>
          <td class="num"><b>${fmt(sum.amt + ((agentSubDirectiveAtFinal('인건비', kindNames, 0) || {}).amount || 0))}원</b></td>
          <td class="aglb-state">${(sum.dMm || sum.dAmt) ? `
            <span>${sum.dMm ? (sum.dMm > 0 ? '+' : '−') + Math.abs(sum.dMm).toFixed(1) + 'MM' : ''}
              ${sum.dAmt ? agentDeltaFinal(sum.dAmt) : ''}</span>` : '–'}</td>
        </tr></tfoot>
      </table>
    </div>
    ${renderAgentAcctCpFinal('인건비', ((typeof getMonthlyBudgetRows === 'function'
       ? getMonthlyBudgetRows(viewData, '인건비') : []).reduce((a, r) => a + r.plan, 0))
       + agentAcctPickedDeltaFinal('인건비'))}
    ${agentLaborGanttFinal(viewData, rows)}`;
}



/* [2026.09.04] 승인 완료된 인건비 기준선 ────────────────────────────────
   화면에 보이는 인력을 "이미 승인받은 인건비"로 봅니다.
   · 박지훈·김서린 : SCM 확정 인력 — 지금까지는 화면에서 등록해야만 생겼습니다
   · 이서준·정하윤 : 조기 철수 제안(ap-02)의 대상 인력 — 이미 투입 중인 승인 인력입니다
   공통 데이터(budget-status.js)는 건드리지 않고, 없을 때만 여기서 채워 넣습니다. */
var AGENT_LABOR_SEED_FINAL = {
  budgetMock: {
    head: [
      { id:'lb-2001', personId:'emp-parkjh', name:'박지훈', org:'NOVA PMO팀', role:'PM/분석설계',
        pLevel:'P4', unitPrice:18000000, startDate:'2026-07-01', endDate:'2026-12-31',
        workType:'Full', totalMm:6, amount:108000000, status:'SCM 승인완료',
        requestedAt:'2026. 6. 24. 09:30', approvedAt:'2026. 6. 25. 16:10', scmDocNo:'SCM-HR-202607-001',
        monthly:{ '2026-07':1, '2026-08':1, '2026-09':1, '2026-10':1, '2026-11':1, '2026-12':1 } },
      { id:'lb-2002', personId:'emp-kimsr', name:'김서린', org:'AX 개발1팀', role:'Vue Front',
        pLevel:'P3', unitPrice:14500000, startDate:'2026-08-01', endDate:'2027-02-28',
        workType:'Part', totalMm:3.5, amount:50750000, status:'SCM 승인완료',
        requestedAt:'2026. 6. 24. 09:30', approvedAt:'2026. 6. 25. 16:10', scmDocNo:'SCM-HR-202607-002',
        monthly:{ '2026-08':0.5, '2026-09':0.5, '2026-10':0.5, '2026-11':0.5, '2026-12':0.5,
                  '2027-01':0.5, '2027-02':0.5 } },
    ],
    tail: [
      // 2026-04 ~ 2026-10 · 7개월 × 1.0MM · 단가 5,000,000원 = 35,000,000원
      { id:'lb-2003', personId:'emp-leesj', name:'이서준', org:'AX 개발2팀', role:'설계',
        pLevel:'P3', unitPrice:5000000, startDate:'2026-04-01', endDate:'2026-10-31',
        workType:'Full', totalMm:7, amount:35000000, status:'SCM 승인완료',
        requestedAt:'2026. 3. 18. 10:20', approvedAt:'2026. 3. 20. 14:05', scmDocNo:'SCM-HR-202603-011',
        monthly:{ '2026-04':1, '2026-05':1, '2026-06':1, '2026-07':1, '2026-08':1, '2026-09':1, '2026-10':1 } },
      { id:'lb-2004', personId:'emp-junghy', name:'정하윤', org:'AX 개발1팀', role:'설계',
        pLevel:'P2', unitPrice:5000000, startDate:'2026-04-01', endDate:'2026-10-31',
        workType:'Full', totalMm:7, amount:35000000, status:'SCM 승인완료',
        requestedAt:'2026. 3. 18. 10:20', approvedAt:'2026. 3. 20. 14:05', scmDocNo:'SCM-HR-202603-012',
        monthly:{ '2026-04':1, '2026-05':1, '2026-06':1, '2026-07':1, '2026-08':1, '2026-09':1, '2026-10':1 } },
    ],
  },
};

function agentSeedLaborFinal() {
  if (typeof getLaborRows !== 'function') return;
  const pj = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  const seed = AGENT_LABOR_SEED_FINAL[pj];
  if (!seed) return;
  const rows = getLaborRows(pj);
  const has = n => rows.some(r => r.name === n);
  (seed.head || []).slice().reverse().forEach(x => {
    if (!has(x.name)) rows.unshift(JSON.parse(JSON.stringify(x)));
  });
  (seed.tail || []).forEach(x => {
    if (!has(x.name)) rows.push(JSON.parse(JSON.stringify(x)));
  });
}


/* [2026.09.04] 금액만 잡혀 있던 상세계정의 실제 내역 ─────────────────────
   외주비·재료비의 2번 이후 상세계정은 계정 계획에서 비율로 내려온 금액만 있고
   내역이 없었습니다. 그 금액에 정확히 맞는 내역을 만들어 둡니다.
   공통 데이터는 건드리지 않고 이 파일에서만 들고 있습니다. */
var AGENT_OS_SUB_FINAL = {
  // 전문직수수료/제안/기타 = 144,000,000
  '전문직수수료/제안/기타': [
    { name:'제안 컨설팅 (수행 전략 수립)', party:'미래정보기술', start:'2026-02-01', end:'2026-04-30',
      amount:54000000, actual:54000000, planned:0, status:'집행완료' },
    { name:'전문직 기술자문 (아키텍처 검증)', party:'테크노아이티', start:'2026-05-01', end:'2026-10-31',
      amount:60000000, actual:30000000, planned:30000000, status:'계약' },
    { name:'보안 취약점 진단 수수료', party:'시큐어아이', start:'2026-11-01', end:'2027-01-31',
      amount:30000000, actual:0, planned:0, status:'계획' },
  ],
  // 외주출장비 = 60,000,000
  '외주출장비': [
    { name:'고객사 상주 출장 (1차)', party:'아크로디자인랩', start:'2026-03-01', end:'2026-06-30',
      amount:24000000, actual:24000000, planned:0, status:'집행완료' },
    { name:'고객사 상주 출장 (2차)', party:'펜타시스템테크놀러지(주)', start:'2026-07-01', end:'2026-12-31',
      amount:26000000, actual:12000000, planned:14000000, status:'계약' },
    { name:'해외 벤더 기술 협의 출장', party:'(주)인젠트', start:'2027-02-01', end:'2027-03-31',
      amount:10000000, actual:0, planned:0, status:'계획' },
  ],
  // 공사MA = 300,000,000
  '공사MA': [
    { name:'전산실 증설 공사', party:'대한설비', start:'2026-04-01', end:'2026-09-30',
      amount:180000000, actual:120000000, planned:60000000, status:'계약' },
    { name:'네트워크 배선 공사', party:'한빛네트웍스', start:'2026-08-01', end:'2026-11-30',
      amount:80000000, actual:20000000, planned:60000000, status:'계약' },
    { name:'항온항습 유지보수 (MA)', party:'대한설비', start:'2026-12-01', end:'2027-11-30',
      amount:40000000, actual:0, planned:0, status:'계획' },
  ],
  // 이관외주비 = 60,000,000
  '이관외주비': [
    { name:'선행 PMO 외주비 이관 수취', party:'Receiver Project', start:'2026-05-01', end:'2026-05-31',
      amount:36000000, actual:36000000, planned:0, status:'집행완료' },
    { name:'공통 플랫폼 외주비 이관 수취', party:'Receiver Project', start:'2026-10-01', end:'2026-10-31',
      amount:24000000, actual:0, planned:0, status:'계획' },
  ],
  // 기타외주비 = 96,000,000
  '기타외주비': [
    { name:'번역·현지화 용역', party:'글로벌링크', start:'2026-06-01', end:'2026-09-30',
      amount:36000000, actual:18000000, planned:18000000, status:'계약' },
    { name:'사용자 교육 위탁', party:'러닝브릿지', start:'2027-03-01', end:'2027-05-31',
      amount:36000000, actual:0, planned:0, status:'계획' },
    { name:'기타 단기 용역', party:'기타거래처', start:'2026-01-01', end:'2027-11-30',
      amount:24000000, actual:6000000, planned:0, status:'계약' },
  ],
};

// 감가상각비 = 58,200,000 · 이관재료비 = 11,500,000
var AGENT_MAT_SUB_FINAL = {
  '감가상각비': [
    { name:'개발 서버 4식', acquired:'2026-01-15', life:'5년', monthly:600000,
      start:'2026-02-01', end:'2027-11-30', amount:36000000, status:'상각중' },
    { name:'스토리지 · 백업 장비', acquired:'2026-03-01', life:'5년', monthly:400000,
      start:'2026-04-01', end:'2027-11-30', amount:14400000, status:'상각중' },
    { name:'테스트 단말 · 계측 장비', acquired:'2026-06-01', life:'4년', monthly:300000,
      start:'2026-07-01', end:'2027-11-30', amount:7800000, status:'상각중' },
  ],
  '이관재료비': [
    { name:'공통 라이선스 이관 수취', party:'Receiver Project', month:'2026-07',
      amount:8000000, status:'집행완료' },
    { name:'테스트 장비 이관 수취', party:'Receiver Project', month:'2027-01',
      amount:3500000, status:'계획' },
  ],
};

/* 상품재료비 = 80,300,000 에 맞춰 부족한 1건을 채웁니다 (기존 2건 61,000,000). */
var AGENT_MAT_SEED_FINAL = [
  { id:'mi-seed-19300', large:'솔루션', middle:'라이선스', small:'모니터링',
    model:'MON-ENT-50', productDetail:'운영 모니터링 도구 라이선스', quantity:1, unit:'식',
    revenueBasis:'월', deliveryStart:'2027-01-01', deliveryEnd:'2027-03-31',
    quoteNo:'MQ-202612-014', amount:19300000, status:'계획', actualized:false },
];

function agentSeedSubDataFinal() {
  const pj = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  if (pj !== 'budgetMock') return;
  // 재료비 상품재료비
  if (typeof getMaterialRows === 'function') {
    const rows = getMaterialRows(pj);
    AGENT_MAT_SEED_FINAL.forEach(x => {
      if (!rows.some(r => r.id === x.id)) rows.push(JSON.parse(JSON.stringify(x)));
    });
  }
  // A/S Cost — 산출 내역 합계를 계정 계획(50,000,000원)과 맞춥니다.
  // 구성별 금액 계산 방식이 달라 화면과 같은 규칙으로 더합니다
  //   인건비 = 노무비 + 간접비 · 외주 인력 = 단가 × MM · 그 외 = 금액
  if (typeof asCostRows !== 'undefined' && asCostRows.labor && asCostRows.labor[0]
      && !asCostRows.__agentAligned) {
    const sum = () =>
      (asCostRows.labor || []).reduce((t, r) => t + (r.laborAmount || 0) + (r.indirectAmount || 0), 0)
      + (asCostRows.outsourcePeople || []).reduce((t, r) => t + Math.round((r.unitPrice || 0) * (r.mm || 0)), 0)
      + (asCostRows.outsourceMa || []).reduce((t, r) => t + (r.amount || 0), 0)
      + (asCostRows.material || []).reduce((t, r) => t + (r.amount || 0), 0)
      + (asCostRows.expense || []).reduce((t, r) => t + (r.amount || 0), 0);
    const gap = 50000000 - sum();
    if (gap > 0) asCostRows.labor[0].indirectAmount = (asCostRows.labor[0].indirectAmount || 0) + gap;
    asCostRows.__agentAligned = true;
  }
}

/* ── 공통 조각 ─────────────────────────────────────────────────────────── */

/* 상세계정 탭 — 계정별 상세계정 이름을 그대로 쓰고 가로폭을 꽉 채웁니다 */
var agentAcctKindFinal = {};      // { 계정: index }
function agentAcctKindSetFinal(acct, i) { agentAcctKindFinal[acct] = i; renderBudgetPage(); }
function agentAcctKindIdxFinal(acct, n) {
  return Math.min(agentAcctKindFinal[acct] || 0, Math.max(n - 1, 0));
}
function renderAgentKindTabsFinal(acct, names, planOf) {
  if (!names.length) return '';
  const cur = agentAcctKindIdxFinal(acct, names.length);
  const per = Math.min(names.length, 6);   // 한 줄에 최대 6개, 넘으면 다음 줄로
  return `
    <div class="aglb-tabs" style="grid-template-columns:repeat(${per},minmax(0,1fr))">
      ${names.map((n, i) => `
        <button class="${cur === i ? 'on' : ''}" onclick="agentAcctKindSetFinal('${acct}',${i})">
          <em>${('0' + (i + 1)).slice(-2)}</em><span class="aglb-tabname">${escHtml(n)}</span>
          ${planOf ? `<i>${fmt(planOf(i))}</i>` : ''}</button>`).join('')}
    </div>`;
}

/* 계획과 등록 내역의 차이 — "계획은 있으나 아직 등록되지 않은 몫"을 드러냅니다.
   목업의 계정 계획은 월별 예산에서 내려오고, 아래 표는 실제 등록 행에서 올라옵니다.
   두 값이 다른 것이 정상이라, 감추지 않고 한 줄로 밝힙니다. */
/* [2026.09.04] 계정 상세 하단 — 통제는 CP 기준으로만 봅니다.
   · 계정별 CP 승인액은 참고선입니다. CP총액 안이면 계정 초과는 허용됩니다.
   · 실제로 막히는 것은 전 계정 합계가 CP총액을 넘을 때뿐입니다.
   계획과 등록 내역의 차이는 예산을 추가 편성하는 중이면 당연하므로 따로 적지 않습니다. */
function renderAgentGapFinal(planTotal, listTotal, what) { return ''; }

/* [2026.09.04] 계정 상세 하단의 CP 편성 줄은 두지 않습니다.
   상단 LIVE 바가 계정 금액과 CP총액을 이미 들고 있어 중복입니다. */
function renderAgentAcctCpFinal(acct, acctAfter) { return ''; }
function renderAgentAcctCpUnusedFinal(acct, acctAfter) {
  const roll = agentRollCacheFinal;
  if (!roll || !roll.cp) return '';
  const row = (roll.rows || []).find(r => r.acct === acct) || { cp: 0, plan: 0 };
  const ref = agentSimReflectFinal();
  const sim = (typeof agentSimNetFinal === 'function') ? agentSimNetFinal() : 0;
  const totAfter = roll.plan + ref.net + sim;
  const cpTot = roll.cp;
  const overTot = totAfter - cpTot >= 1000;
  const acctPct = row.cp > 0 ? (acctAfter / row.cp) * 100 : 0;
  const overAcct = row.cp > 0 && acctAfter - row.cp >= 1000;
  return `
    <div class="aglb-cp ${overTot ? 'over' : ''}">
      <div class="aglb-cp-row">
        <span>${escHtml(acct)} CP 승인액</span>
        <b>${fmt(row.cp)}원</b>
        <i>→</i>
        <span>편성</span>
        <b class="${overAcct ? 'warn' : ''}">${fmt(acctAfter)}원</b>
        <em class="${overAcct ? 'warn' : ''}">${agentPctFinal(acctPct)}</em>
        ${overAcct ? `<u class="warn">승인액 ${agentDeltaFinal(acctAfter - row.cp)} · CP총액 안이면 허용됩니다</u>` : ''}
      </div>
      <div class="aglb-cp-row tot">
        <span>CP총액</span>
        <b>${fmt(cpTot)}원</b>
        <i>→</i>
        <span>전 계정 편성</span>
        <b class="${overTot ? 'bad' : ''}">${fmt(totAfter)}원</b>
        <em class="${overTot ? 'bad' : ''}">${agentPctFinal(cpTot > 0 ? (totAfter / cpTot) * 100 : 0)}</em>
        <u class="${overTot ? 'bad' : ''}">${overTot
          ? `한도 초과 ${fmt(totAfter - cpTot)}원 — 이 상태로는 기안할 수 없습니다`
          : `여유 ${fmt(cpTot - totAfter)}원`}</u>
      </div>
    </div>`;
}

/* 간트 — 기간이 있는 행이면 어느 계정이든 같은 모양으로 그립니다 */
function agentGanttFinal(viewData, rows, title) {
  const months = (viewData.months || []).map(m => m.m);
  const list = (rows || []).filter(r => r.start || r.end);
  if (!months.length || !list.length) return '';
  const idx = m => months.indexOf(String(m || '').slice(0, 7));
  const today = (typeof osv3TodayMonthV3 === 'function') ? osv3TodayMonthV3() : '2026-08';
  const tIdx = months.indexOf(today);
  const N = months.length;
  const yr = [];
  months.forEach(m => {
    const y = m.slice(0, 4);
    if (yr.length && yr[yr.length - 1].y === y) yr[yr.length - 1].n += 1;
    else yr.push({ y, n: 1 });
  });
  return `
    <div class="aglg">
      <div class="aglg-head">
        <b>${escHtml(title)}</b>
        <span>${months[0]} ~ ${months[N - 1]} · ${N}개월</span>
        <i class="aglg-key"><u class="on"></u>계획 <u class="new"></u>신규추가 <u class="out"></u>감액·철수</i>
      </div>
      <div class="aglg-scroll">
        <div class="aglg-grid" style="--n:${N}">
          <div class="aglg-corner"></div>
          <div class="aglg-years">${yr.map(v => `<span style="grid-column:span ${v.n}">${v.y}</span>`).join('')}</div>
          <div class="aglg-corner"></div>
          <div class="aglg-months">${months.map((m, i) =>
            `<span class="${i === tIdx ? 'now' : ''}">${m.slice(5)}</span>`).join('')}</div>
          ${list.map(r => {
            const a = Math.max(idx(r.start), 0);
            const b = r.end ? idx(r.end) : N - 1;
            const from = Math.min(a, N - 1);
            const to = b < 0 ? N - 1 : Math.max(b, from);
            const cls = r.state === '신규추가' ? 'new' : (r.state === '철수' || r.state === '감액') ? 'out' : 'on';
            return `
              <div class="aglg-name" title="${escHtml(r.sub || '')}">
                <b>${escHtml(r.name)}</b><span>${escHtml(r.sub || '')}</span>
              </div>
              <div class="aglg-track">
                ${months.map((m, i) => `<i class="${i === tIdx ? 'now' : ''}"></i>`).join('')}
                <u class="${cls}" style="grid-column:${from + 1} / ${to + 2}">${escHtml(r.label || '')}</u>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* [2026.09.04] 대화로 지시한 상세계정 편성 —
   "OT비 천만원 편성해줘 → 인건비를 늘려줘" 처럼 상세계정을 지목한 지시는
   그 상세계정 탭과 표에 그대로 보여야 합니다. */
function agentSubDirectiveFinal(acct, subName) {
  const d = agentSimDetailFinal[acct];
  if (!d || !d.kind || !d.amount) return null;
  return String(d.kind) === String(subName) ? d : null;
}
// 지시가 어느 상세계정도 지목하지 않았으면(계정만 말한 경우) 첫 상세계정으로 봅니다.
function agentSubDirectiveAtFinal(acct, names, i) {
  const d = agentSimDetailFinal[acct];
  if (!d || !d.amount) return null;
  const at = names.indexOf(d.kind);
  return (at < 0 ? i === 0 : at === i) ? d : null;
}
function agentDirSrcFinal(d) {
  return [d.vendor, d.period].filter(Boolean).join(' · ')
    || (d.from ? d.from + '에서 이관' : 'CP총액 여유에서 증액');
}
function renderAgentDirRowFinal(d, cols, label) {
  if (!d) return '';
  const mid = Math.max(cols - 3, 0);
  return `
    <tr class="aglb-dir">
      <td><b>${escHtml(label || 'PM 지시')}</b></td>
      ${Array.from({ length: mid }).map((x, i) =>
        i === mid - 1 ? `<td>${escHtml(agentDirSrcFinal(d))}</td>` : '<td></td>').join('')}
      <td class="num up"><b>${agentDeltaFinal(d.amount)}</b></td>
      <td><em class="aglb-st dir">지시 반영 중</em></td>
    </tr>`;
}

/* 고른 제안이 이 계정에 만드는 변동 — 표 아래 한 줄로 */
function agentAcctPickedDeltaFinal(acct) {
  let d = 0;
  agentProposalsFinal('pending').forEach(p => {
    if (!agentMiniSelFinal[p.id]) return;
    (p.legs || []).forEach(l => { if (l.acct === acct) d += l.delta; });
  });
  return d;
}
function renderAgentPickedRowFinal(acct, cols) {
  const d = agentAcctPickedDeltaFinal(acct);
  if (!d) return '';
  return `
    <tr class="aglb-picked">
      <td colspan="${cols - 1}">반영하기로 고른 제안</td>
      <td class="num ${d > 0 ? 'up' : 'down'}">${agentDeltaFinal(d)}</td>
    </tr>`;
}

/* ── 외주비 ──────────────────────────────────────────────────────────────
   업체 라인 = 프로젝트 전체 기간에 걸쳐 그 업체의 투입계획·금액을 실행예산으로 잡아 둔 것.
   그 아래 분기별 구매 계획을 세워야 구매요청(PO)이 그 라인 범위 안에서 나갑니다.
     전체기간 예산  ≥  분기별 계획 합계   ← 이 관계가 깨지면 계획을 세울 수 없습니다
   ────────────────────────────────────────────────────────────────────── */
var agentOsOpenFinal = {};        // 펼친 업체
function agentOsToggleFinal(id) { agentOsOpenFinal[id] = !agentOsOpenFinal[id]; renderBudgetPage(); }
function agentOsAddLineFinal(id) {
  const v = (typeof osv3VendorsV3 !== 'undefined') ? osv3VendorsV3.find(x => x.id === id) : null;
  if (!v) return;
  const used = (v.pos || []).reduce((t, x) => t + (x.amount || 0), 0);
  const left = (v.budget || 0) - used;
  if (left <= 0) {
    showToast(`${v.vendor}는 전체기간 예산 ${fmt(v.budget)}원을 이미 계획으로 다 잡았습니다. 예산을 늘려야 계획 라인을 더할 수 있습니다.`);
    return;
  }
  const last = (v.pos || [])[(v.pos || []).length - 1];
  let from = last && last.end ? agentOsNextDayFinal(last.end) : (v.start || '');
  let to = v.end || from;
  if (from && to && from > to) to = from;      // 계약기간이 다 찼으면 시작일에 맞춥니다
  v.pos = (v.pos || []).concat([{ poNo: '', start: from, end: to, amount: left,
    mm: 0, actual: 0, planned: 0, plan: {} }]);
  agentOsOpenFinal[id] = true;
  showToast(`${v.vendor}에 계획 라인을 추가했습니다 — 남은 미계획 ${fmt(left)}원을 담았습니다.`);
  renderBudgetPage();
}
function agentOsDelLineFinal(id, i) {
  const v = (typeof osv3VendorsV3 !== 'undefined') ? osv3VendorsV3.find(x => x.id === id) : null;
  if (!v || !v.pos || !v.pos[i]) return;
  if (v.pos[i].poNo) { showToast('구매계약(PO)이 발행된 계획 라인은 지울 수 없습니다.'); return; }
  v.pos.splice(i, 1);
  renderBudgetPage();
}
/* 계약 전 라인은 PM이 직접 고칩니다 — 기간과 금액.
   금액은 "전체기간 예산 >= 분기별 계획 합계"를 넘지 못하게 막습니다. */
function agentOsSetLineFinal(id, i, field, value) {
  const v = (typeof osv3VendorsV3 !== 'undefined') ? osv3VendorsV3.find(x => x.id === id) : null;
  if (!v || !v.pos || !v.pos[i] || v.pos[i].poNo) return;
  const line = v.pos[i];
  if (field === 'amount') {
    const want = Math.max(Math.round(Number(String(value).replace(/[^0-9]/g, '')) || 0), 0);
    const others = v.pos.reduce((t, x, k) => t + (k === i ? 0 : (x.amount || 0)), 0);
    const room = Math.max((v.budget || 0) - others, 0);
    if (want > room) {
      line.amount = room;
      showToast(v.vendor + ' 전체기간 예산은 ' + fmt(v.budget) + '원입니다. 이 라인에 담을 수 있는 최대 '
        + fmt(room) + '원으로 맞췄습니다.');
    } else line.amount = want;
  } else if (field === 'start') {
    line.start = value;
    if (line.end && line.start && line.start > line.end) line.end = line.start;
  } else if (field === 'end') {
    line.end = value;
    if (line.start && line.end && line.end < line.start) line.start = line.end;
  }
  renderBudgetPage();
}

function agentOsNextDayFinal(ymd) {
  const d = new Date(String(ymd) + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  const z = n => ('0' + n).slice(-2);
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}

function renderAgentOutsourceDetailFinal(viewData, roll) {
  const rowsPlan = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, '외주비') : []) || [];
  const names = rowsPlan.map(r => r.name);
  const cur = agentAcctKindIdxFinal('외주비', names.length);
  const tabs = renderAgentKindTabsFinal('외주비', names, i => (rowsPlan[i] || {}).plan || 0);

  // 첫 상세계정(실투입대상 외주비)만 업체 라인을 가집니다.
  const vend = (cur === 0 && typeof osv3VendorsV3 !== 'undefined') ? osv3VendorsV3 : [];
  const d = agentSimDetailFinal['외주비'];
  const extra = (cur === 0 && d && d.vendor) ? [{
    id: 'sim-os', vendor: d.vendor, contract: d.kind, budget: d.amount,
    start: String(d.period || '').split('~')[0].trim(),
    end: String(String(d.period || '').split('~')[1] || '').trim(),
    pos: [], sim: true,
  }] : [];
  const list = vend.concat(extra);

  const calc = v => {
    const pos = v.pos || [];
    const planned = pos.reduce((t, x) => t + (x.amount || 0), 0);
    return {
      budget: v.budget || 0, planned,
      unplanned: (v.budget || 0) - planned,
      act: pos.reduce((t, x) => t + (x.actual || 0), 0),
      todo: pos.reduce((t, x) => t + (x.planned || 0), 0),
      over: planned - (v.budget || 0) >= 1,
    };
  };
  const tot = list.reduce((a, v) => {
    const c = calc(v);
    return { b: a.b + c.budget, pl: a.pl + c.planned, un: a.un + c.unplanned,
             ac: a.ac + c.act, td: a.td + c.todo };
  }, { b: 0, pl: 0, un: 0, ac: 0, td: 0 });

  const lineRows = v => {
    const pos = v.pos || [];
    const c = calc(v);
    return `
      <tr class="agos-sub"><td colspan="7">
        <div class="agos-panel">
          <div class="agos-panel-head">
            <b>외주구매 계획</b>
            <button class="agos-add" onclick="event.stopPropagation();agentOsAddLineFinal('${v.id}')">+ 계획 라인</button>
            <span>계획 ${pos.length}건(계약 ${pos.filter(x => x.poNo).length}건)
              · 합계 ${fmt(c.planned)}원 · 미계획 ${fmt(Math.max(c.unplanned, 0))}원</span>
          </div>
          ${pos.length ? `
            <table class="agos-lines">
              <thead><tr>
                <th>투입 기간</th><th class="num">금액</th><th>PO번호</th>
                <th class="num">실적(검수)</th><th class="num">집행예정(미검수)</th><th>관리</th>
              </tr></thead>
              <tbody>${pos.map((x, i) => `
                <tr class="${x.poNo ? '' : 'wait'}">
                  <td>${x.poNo
                    ? `${escHtml(x.start || '')} ~ ${escHtml(x.end || '')}`
                    : `<span class="agos-dates">
                        <input type="date" value="${escHtml(x.start || '')}"
                          onclick="event.stopPropagation()"
                          onchange="agentOsSetLineFinal('${v.id}',${i},'start',this.value)">
                        <i>~</i>
                        <input type="date" value="${escHtml(x.end || '')}"
                          onclick="event.stopPropagation()"
                          onchange="agentOsSetLineFinal('${v.id}',${i},'end',this.value)">
                      </span>`}</td>
                  <td class="num">${x.poNo
                    ? `<b>${fmt(x.amount || 0)}원</b>`
                    : `<input class="agos-amt" type="text" inputmode="numeric" value="${fmt(x.amount || 0)}"
                        onclick="event.stopPropagation()"
                        onchange="agentOsSetLineFinal('${v.id}',${i},'amount',this.value)">`}</td>
                  <td>${x.poNo
                    ? `<b>${escHtml(x.poNo)}</b>${x.fx ? `<span class="aglb-sub">${escHtml(x.fx)}</span>` : ''}`
                    : '<em class="agos-wait">계약 대기</em>'}</td>
                  <td class="num">${x.poNo ? fmt(x.actual || 0) + '원' : '–'}</td>
                  <td class="num">${x.poNo ? fmt(x.planned || 0) + '원' : '–'}</td>
                  <td>${x.poNo
                    ? '<span class="agos-lock" title="구매계약이 발행된 라인입니다">계약됨</span>'
                    : `<button class="agos-del" onclick="event.stopPropagation();agentOsDelLineFinal('${v.id}',${i})">✕</button>`}</td>
                </tr>`).join('')}</tbody>
            </table>`
            : '<div class="agos-empty">아직 계획 라인이 없습니다. [+ 계획 라인]으로 분기별 구매 계획을 세워 주세요.</div>'}
          ${c.over ? `
            <p class="agos-warn">계획 합계가 전체기간 예산을 ${fmt(c.planned - c.budget)}원 넘었습니다.
              업체 라인 예산을 먼저 늘려야 합니다 — 전체기간 예산 ≥ 분기별 계획 합계.</p>` : ''}
        </div>
      </td></tr>`;
  };

  const table = list.length ? `
    <div class="aglb-wrap">
      <table class="aglb agos">
        <thead><tr>
          <th>업체명</th><th class="num">전체기간 예산</th><th class="num">계획 금액</th>
          <th class="num">미계획 금액</th><th class="num">실적(검수)</th>
          <th class="num">집행예정(미검수)</th><th>관리</th>
        </tr></thead>
        <tbody>${list.map(v => {
          const c = calc(v);
          const open = !!agentOsOpenFinal[v.id];
          const pct = c.budget > 0 ? Math.min((c.planned / c.budget) * 100, 100) : 0;
          return `
            <tr class="agos-row ${open ? 'open' : ''} ${v.sim ? 'new' : ''}"
              onclick="agentOsToggleFinal('${v.id}')" title="${open ? '접기' : '분기별 구매 계획 보기'}">
              <td>
                <span class="agos-caret">${open ? '∧' : '∨'}</span>
                <b>${escHtml(v.vendor)}</b>
                <span class="aglb-sub">${escHtml(v.contract || '')}
                  · 계획 ${(v.pos || []).length}건(계약 ${(v.pos || []).filter(x => x.poNo).length}건)
                  · ${escHtml(v.start || '')} ~ ${escHtml(v.end || '')}</span>
              </td>
              <td class="num">${fmt(c.budget)}원</td>
              <td class="num agos-plan">
                <b>${fmt(c.planned)}원</b>
                <i class="agos-bar"><u style="width:${pct}%" class="${c.over ? 'bad' : ''}"></u></i>
              </td>
              <td class="num ${c.unplanned < 0 ? 'bad' : ''}">${fmt(c.unplanned)}원</td>
              <td class="num">${fmt(c.act)}원</td>
              <td class="num">${fmt(c.todo)}원</td>
              <td>${v.sim ? '<em class="aglb-st">신규</em>' : `
                <button class="agos-add sm" onclick="event.stopPropagation();agentOsAddLineFinal('${v.id}')">+ 계획</button>`}</td>
            </tr>
            ${open ? lineRows(v) : ''}`;
        }).join('')}</tbody>
        <tfoot>
          <tr>
            <td>합계 ${list.length}개 업체</td>
            <td class="num"><b>${fmt(tot.b)}원</b></td>
            <td class="num"><b>${fmt(tot.pl)}원</b></td>
            <td class="num">${fmt(tot.un)}원</td>
            <td class="num">${fmt(tot.ac)}원</td>
            <td class="num">${fmt(tot.td)}원</td><td></td>
          </tr>
          ${renderAgentPickedRowFinal('외주비', 7)}
        </tfoot>
      </table>
    </div>`
    : renderAgentSubItemsFinal('외주비', names[cur], cur, viewData);

  if (cur !== 0) return `${tabs}${table}`;
  return `${tabs}${table}${agentGanttFinal(viewData,
    list.map(v => ({ name: v.vendor, sub: v.contract, start: v.start, end: v.end,
      label: fmt(v.budget || 0) + '원', state: v.sim ? '신규추가' : '' })), '업체별 계약 일정')}`;
}

/* 업체 라인이 아닌 상세계정의 내역 표 — 금액에 맞춰 만들어 둔 데이터를 씁니다. */
function renderAgentSubItemsFinal(acct, subName, idx, viewData) {
  const dir = (function () {
    const rowsPlan = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, acct) : []) || [];
    return agentSubDirectiveAtFinal(acct, rowsPlan.map(r => r.name), idx);
  })();

  // ① 감가상각비 — 자산 단위
  if (subName === '감가상각비') {
    const list = (AGENT_MAT_SUB_FINAL['감가상각비'] || []);
    const tot = list.reduce((t, x) => t + (x.amount || 0), 0);
    return `
      <div class="aglb-wrap">
        <table class="aglb">
          <thead><tr>
            <th>자산</th><th>취득일</th><th>내용연수</th><th class="num">월 상각액</th>
            <th>상각 기간</th><th class="num">금액</th><th>상태</th>
          </tr></thead>
          <tbody>${list.map(x => `
            <tr>
              <td><b>${escHtml(x.name)}</b></td>
              <td>${escHtml(x.acquired)}</td>
              <td>${escHtml(x.life)}</td>
              <td class="num">${fmt(x.monthly)}원</td>
              <td>${escHtml(x.start)} ~ ${escHtml(x.end)}</td>
              <td class="num"><b>${fmt(x.amount)}원</b></td>
              <td><em class="aglb-st">${escHtml(x.status)}</em></td>
            </tr>`).join('')}
            ${renderAgentDirRowFinal(dir, 7)}</tbody>
          <tfoot><tr>
            <td>합계 ${list.length + (dir ? 1 : 0)}건</td><td></td><td></td><td></td><td></td>
            <td class="num"><b>${fmt(tot + (dir ? dir.amount : 0))}원</b></td><td></td>
          </tr></tfoot>
        </table>
      </div>
      ${agentGanttFinal(viewData, list.map(x => ({ name: x.name, sub: x.life + ' · 월 ' + fmt(x.monthly) + '원',
        start: x.start, end: x.end, label: fmt(x.amount) + '원' })), '자산별 상각 기간')}`;
  }

  // ② 이관 계정 — 발생 예정월 단위
  const isTransfer = /이관/.test(subName || '');
  const src = (AGENT_OS_SUB_FINAL[subName] || AGENT_MAT_SUB_FINAL[subName] || []);
  if (isTransfer) {
    const tot = src.reduce((t, x) => t + (x.amount || 0), 0);
    return `
      <div class="aglb-wrap">
        <table class="aglb">
          <thead><tr>
            <th>이관 구분</th><th>발생 예정월</th><th>내용</th><th class="num">금액</th><th>상태</th>
          </tr></thead>
          <tbody>${src.map(x => `
            <tr>
              <td><b>${escHtml(x.party || 'Receiver Project')}</b></td>
              <td>${escHtml(x.month || String(x.start || '').slice(0, 7))}</td>
              <td>${escHtml(x.name)}</td>
              <td class="num"><b>${fmt(x.amount)}원</b></td>
              <td><em class="aglb-st">${escHtml(x.status)}</em></td>
            </tr>`).join('')}
            ${renderAgentDirRowFinal(dir, 5)}</tbody>
          <tfoot><tr>
            <td>합계 ${src.length + (dir ? 1 : 0)}건</td><td></td><td></td>
            <td class="num"><b>${fmt(tot + (dir ? dir.amount : 0))}원</b></td><td></td>
          </tr></tfoot>
        </table>
      </div>`;
  }

  // ③ 그 외 — 항목 단위 (전문직수수료 · 외주출장비 · 공사MA · 기타외주비)
  if (!src.length) {
    return `<div class="aglb-wrap"><table class="aglb"><tbody>
      <tr><td class="aglb-empty">${escHtml(subName || '')}에 등록된 내역이 없습니다.</td></tr>
    </tbody></table></div>`;
  }
  const tot = src.reduce((a, x) => ({
    am: a.am + (x.amount || 0), ac: a.ac + (x.actual || 0), pl: a.pl + (x.planned || 0),
  }), { am: 0, ac: 0, pl: 0 });
  return `
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>항목</th><th>거래처</th><th>기간</th><th class="num">금액</th>
          <th class="num">실적(검수)</th><th class="num">집행예정(미검수)</th><th>상태</th>
        </tr></thead>
        <tbody>${src.map(x => `
          <tr class="${x.status === '집행완료' ? 'done' : ''}">
            <td><b>${escHtml(x.name)}</b></td>
            <td>${escHtml(x.party || '')}</td>
            <td>${escHtml(x.start || '')} ~ ${escHtml(x.end || '')}</td>
            <td class="num"><b>${fmt(x.amount)}원</b></td>
            <td class="num">${fmt(x.actual || 0)}원</td>
            <td class="num">${fmt(x.planned || 0)}원</td>
            <td><em class="aglb-st">${escHtml(x.status)}</em></td>
          </tr>`).join('')}
          ${renderAgentDirRowFinal(dir, 7)}</tbody>
        <tfoot><tr>
          <td>합계 ${src.length + (dir ? 1 : 0)}건</td><td></td><td></td>
          <td class="num"><b>${fmt(tot.am + (dir ? dir.amount : 0))}원</b></td>
          <td class="num">${fmt(tot.ac)}원</td>
          <td class="num">${fmt(tot.pl)}원</td><td></td>
        </tr></tfoot>
      </table>
    </div>
    ${agentGanttFinal(viewData, src.map(x => ({ name: x.name, sub: x.party,
      start: x.start, end: x.end, label: fmt(x.amount) + '원' })), subName + ' 집행 일정')}`;
}

/* ── 재료비 ────────────────────────────────────────────────────────────── */
function renderAgentMaterialDetailFinal(viewData, roll) {
  const rowsPlan = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, '재료비') : []) || [];
  const names = rowsPlan.map(r => r.name);
  const cur = agentAcctKindIdxFinal('재료비', names.length);
  const tabs = renderAgentKindTabsFinal('재료비', names, i => (rowsPlan[i] || {}).plan || 0);
  const plan = (rowsPlan[cur] || {}).plan || 0;

  const all = (cur === 0 && typeof getMaterialRows === 'function') ? (getMaterialRows() || []) : [];
  const tot = all.reduce((t, r) => t + (r.amount || 0), 0);
  const act = all.filter(r => r.actualized).reduce((t, r) => t + (r.amount || 0), 0);

  const table = all.length ? `
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>품목</th><th>분류</th><th>모델</th><th class="num">수량</th>
          <th>납품기간</th><th>견적번호</th><th class="num">금액</th><th>상태</th>
        </tr></thead>
        <tbody>${all.map(r => `
          <tr class="${r.actualized ? 'done' : ''}">
            <td><b>${escHtml(r.productDetail || r.small || '')}</b></td>
            <td>${escHtml([r.large, r.middle].filter(Boolean).join(' · '))}</td>
            <td>${escHtml(r.model || '')}</td>
            <td class="num">${r.quantity || 0}${escHtml(r.unit || '')}</td>
            <td>${escHtml(r.deliveryStart || '')} ~ ${escHtml(r.deliveryEnd || '')}</td>
            <td>${escHtml(r.quoteNo || '')}</td>
            <td class="num"><b>${fmt(r.amount || 0)}원</b></td>
            <td class="aglb-state"><em>${escHtml(r.status || '계획')}</em></td>
          </tr>`).join('')}</tbody>
        <tfoot>
          <tr>
            <td>합계 ${all.length}건</td><td></td><td></td><td></td><td></td>
            <td>실적 ${fmt(act)}원</td>
            <td class="num"><b>${fmt(tot)}원</b></td><td></td>
          </tr>
          ${renderAgentPickedRowFinal('재료비', 8)}
        </tfoot>
      </table>
    </div>
    ${renderAgentAcctCpFinal('재료비', (roll.rows.find(r => r.acct === '재료비') || {}).plan + agentAcctPickedDeltaFinal('재료비'))}`
    : renderAgentSubItemsFinal('재료비', names[cur], cur, viewData);

  if (cur !== 0) return `${tabs}${table}`;
  return `${tabs}${table}${agentGanttFinal(viewData,
    all.map(r => ({ name: r.productDetail || r.small, sub: r.model,
      start: r.deliveryStart, end: r.deliveryEnd, label: fmt(r.amount || 0) + '원' })),
    '품목별 납품·검수 일정')}`;
}

/* ── 경비 ──────────────────────────────────────────────────────────────── */
function renderAgentExpenseDetailFinal(viewData, roll) {
  const src = (typeof EXPENSE_ACCOUNT_ROWS_FINAL !== 'undefined') ? EXPENSE_ACCOUNT_ROWS_FINAL : [];
  // 상세계정 탭은 세부계정의 실제 중분류로 묶습니다(계정 상세계정 목록과 어긋나지 않게).
  const mid = [];
  src.forEach(r => { if (mid.indexOf(r.middleName) < 0) mid.push(r.middleName); });
  const names = ['전체'].concat(mid);
  const cur = agentAcctKindIdxFinal('경비', names.length);
  const sumOf = arr => arr.reduce((t, r) => t + (r.monthly || []).reduce((a, v) => a + (v || 0), 0), 0);
  const tabs = renderAgentKindTabsFinal('경비', names,
    i => (i === 0 ? sumOf(src) : sumOf(src.filter(r => r.middleName === names[i]))));
  const list = cur === 0 ? src.slice() : src.filter(r => r.middleName === names[cur]);
  const acctPlan = (roll.rows.find(r => r.acct === '경비') || {}).plan || 0;
  const plan = cur === 0 ? acctPlan : sumOf(list);
  const sum = list.reduce((a, r) => {
    const mp = (r.monthly || []).reduce((t, v) => t + (v || 0), 0);
    return { plan: a.plan + mp, act: a.act + (r.actual || 0), avail: a.avail + (r.erpAvailable || 0) };
  }, { plan: 0, act: 0, avail: 0 });

  return `
    ${tabs}
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>중분류</th><th>세부계정</th><th>계정코드</th>
          <th class="num">계획</th><th class="num">실적</th><th class="num">ERP 가용</th>
        </tr></thead>
        <tbody>${list.length ? list.map(r => {
          const mp = (r.monthly || []).reduce((t, v) => t + (v || 0), 0);
          return `
            <tr>
              <td>${escHtml(r.middleName || '')}</td>
              <td><b>${escHtml(r.name || '')}</b></td>
              <td>${escHtml(r.code || '')}</td>
              <td class="num"><b>${fmt(mp)}원</b></td>
              <td class="num">${fmt(r.actual || 0)}원</td>
              <td class="num">${fmt(r.erpAvailable || 0)}원</td>
            </tr>`;
        }).join('') : '<tr><td colspan="6" class="aglb-empty">등록된 세부계정이 없습니다.</td></tr>'}</tbody>
        ${list.length ? `<tfoot>
          <tr>
            <td>합계 ${list.length}건</td><td></td><td></td>
            <td class="num"><b>${fmt(sum.plan)}원</b></td>
            <td class="num">${fmt(sum.act)}원</td>
            <td class="num">${fmt(sum.avail)}원</td>
          </tr>
          ${renderAgentPickedRowFinal('경비', 6)}
        </tfoot>` : ''}
      </table>
    </div>
    ${renderAgentAcctCpFinal('경비', (roll.rows.find(r => r.acct === '경비') || {}).plan + agentAcctPickedDeltaFinal('경비'))}`;
}

/* ── A/S Cost ──────────────────────────────────────────────────────────── */
function renderAgentAsDetailFinal(viewData, roll) {
  const R = (typeof asCostRows !== 'undefined') ? asCostRows : { labor: [], outsourcePeople: [], outsourceMa: [], material: [], expense: [] };
  const groups = [
    { key: 'labor', label: '인건비', rows: (R.labor || []).map(x => ({
        name: x.role, sub: x.grade, qty: (x.mm || 0).toFixed(3) + 'MM',
        unit: x.unitPrice, amount: (x.laborAmount || 0) + (x.indirectAmount || 0) })) },
    { key: 'outsourcePeople', label: '외주 인력', rows: (R.outsourcePeople || []).map(x => ({
        name: x.role, sub: x.vendor + ' · ' + x.grade, qty: (x.mm || 0) + 'MM',
        unit: x.unitPrice, amount: Math.round((x.unitPrice || 0) * (x.mm || 0)) })) },
    { key: 'material', label: '재료비', rows: (R.material || []).map(x => ({
        name: [x.major, x.middle, x.minor].filter(Boolean).join(' · '), sub: x.expectedDate,
        qty: '', unit: 0, amount: x.amount })) },
    { key: 'expense', label: '경비', rows: (R.expense || []).map(x => ({
        name: x.account, sub: '', qty: '', unit: 0, amount: x.amount })) },
  ].filter(g => g.rows.length);

  const names = groups.map(g => g.label);
  const cur = agentAcctKindIdxFinal('A/S Cost', names.length);
  const g = groups[cur] || { rows: [] };
  const tabs = renderAgentKindTabsFinal('A/S Cost', names,
    i => (groups[i] || { rows: [] }).rows.reduce((t, r) => t + (r.amount || 0), 0));
  const tot = g.rows.reduce((t, r) => t + (r.amount || 0), 0);
  const all = groups.reduce((t, x) => t + x.rows.reduce((a, r) => a + (r.amount || 0), 0), 0);
  const plan = (roll.rows.find(r => r.acct === 'A/S Cost') || {}).plan || 0;

  return `
    ${tabs}
    <div class="aglb-wrap">
      <table class="aglb">
        <thead><tr>
          <th>항목</th><th>구분</th><th class="num">수량</th><th class="num">단가</th><th class="num">금액</th>
        </tr></thead>
        <tbody>${g.rows.length ? g.rows.map(r => `
          <tr>
            <td><b>${escHtml(r.name || '')}</b></td>
            <td>${escHtml(r.sub || '')}</td>
            <td class="num">${escHtml(r.qty || '')}</td>
            <td class="num">${r.unit ? fmt(r.unit) : '–'}</td>
            <td class="num"><b>${fmt(r.amount || 0)}원</b></td>
          </tr>`).join('') : '<tr><td colspan="5" class="aglb-empty">등록된 내역이 없습니다.</td></tr>'}</tbody>
        ${g.rows.length ? `<tfoot>
          <tr><td>합계 ${g.rows.length}건</td><td></td><td></td><td></td>
            <td class="num"><b>${fmt(tot)}원</b></td></tr>
          ${renderAgentPickedRowFinal('A/S Cost', 5)}
        </tfoot>` : ''}
      </table>
    </div>
    ${renderAgentAcctCpFinal('A/S Cost', (roll.rows.find(r => r.acct === 'A/S Cost') || {}).plan + agentAcctPickedDeltaFinal('A/S Cost'))}`;
}

/* 계정 상세 칸 — 좌 70% */
function renderAgentGaDetailFinal(viewData, data, roll) {
  const acct = agentAiSheetFinal;
  const r = (roll.rows || []).find(x => x.acct === acct) || { plan: 0, done: 0, cp: 0 };
  const body = acct === '인건비' ? renderAgentLaborDetailFinal(viewData, roll)
    : acct === '외주비' ? renderAgentOutsourceDetailFinal(viewData, roll)
    : acct === '재료비' ? renderAgentMaterialDetailFinal(viewData, roll)
    : acct === '경비' ? renderAgentExpenseDetailFinal(viewData, roll)
    : acct === 'A/S Cost' ? renderAgentAsDetailFinal(viewData, roll)
    : renderBudgetAccountEditor(viewData, acct);
  return `
    <div class="agga-col detail">
      <div class="agga-col-head">
        <button class="agga-back" onclick="agentAiSheetOpenFinal('')">←</button>
        <strong>${acct} 예산내역</strong>
        <em class="agga-dnum">${fmt(r.plan)}원</em>
        <span class="agga-dsub">실적(확정) ${fmt(r.done)}원 · CP 승인액 ${fmt(r.cp)}원</span>
      </div>
      <div class="agga-col-body detail">${body}</div>
    </div>`;
}

/* ── 우측 70% — Agent와 대화하기 ── */
function renderAgentGaChatFinal(roll) {
  const ref = agentSimReflectFinal();
  const on = agentSimActiveFinal();
  const n = ref.cnt;
  const items = on
    ? [['기안해줘', 1], ['방안 저장해줘', 1], ['되돌려줘', 1]]
    : n
      ? [['기안해줘', 1], ['외주비 3천만원 늘려줘', 0], ['재료비에서 외주비로 1천만원 옮겨줘', 0], ['지금 CP 여유 얼마야?', 1]]
      : [['전부 반영해줘', 1], ['외주비 3천만원 늘려줘', 0], ['경비 300만원 줄여줘', 0], ['인건비 상세 보여줘', 1]];
  if (n) items.splice(1, 0, ['전부 해제해줘', 1]);
  return `
    <div class="agga-col chat">
      <div class="agga-col-head">
        <strong>Agent와 대화하기</strong>
        ${on ? `<em class="agga-simtag">✍ 지시 반영 중 ${agentDeltaFinal(agentSimNetFinal())}</em>` : ''}
      </div>
      <div class="agga-col-body chat">
        ${AGENT_CHAT_FINAL.map(d => `
          <div class="agai-say ${d.who}">
            <span class="agai-who">${d.who === 'pm' ? '이봄(PM)' : '🤖 Agent'}</span>
            <div class="agai-bubble ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
            ${renderAgentChatActionFinal(d)}
          </div>`).join('')}
      </div>
      <div class="agga-col-foot">
        <div class="agga-chips">
          ${items.map(x => `<button class="${x[1] ? 'run' : ''}"
            onclick="agentSimAskFinal('${x[0]}',${x[1]})">${escHtml(x[0])}</button>`).join('')}
        </div>
        <div class="agga-input">
          <input id="agent-chat-input" type="text"
            placeholder="무엇이든 말씀하세요 — 금액 조정 · 계정 조회 · 기안까지 이 한 줄로 합니다"
            onkeydown="if(event.key==='Enter') agentChatSendFinal()">
          <button class="agai-send" onclick="agentChatSendFinal()">보내기</button>
        </div>
      </div>
    </div>`;
}

/* ── 대화형 Agent 화면 ── */
function renderAgentGaViewFinal(viewData, data, projInfo, roll) {
  agentSimFixScrollerFinal();
  agentManualSyncAllFinal();
  agentChatKeepBottomFinal();
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="agent-shell agent-ai agent-ga">
      ${renderAgentAiTopFinal(viewData, data, roll)}
      <div class="agga-grid ${agentAiSheetFinal ? 'detail' : ''}">
        ${agentAiSheetFinal
          ? renderAgentGaDetailFinal(viewData, data, roll)
          : renderAgentGaTodoFinal(roll)}
        ${renderAgentGaChatFinal(roll)}
      </div>
      ${renderAgentHistLinkFinal()}
    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentReturnNoticeFinal()}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}

/* ==========================================================================
   [2026.09.03] AI구상안 — 화면이 곧 대화입니다
     기존 화면은 "데이터 그리드 + 옆에 붙은 대화창"입니다.
     여기서는 그 관계를 뒤집습니다.

       · 패널을 없앱니다.        3분할 → 한 줄기 스트림
       · 목록을 없앱니다.        Agent 제안은 "대화 속 결정 카드"가 됩니다
       · 표를 상단 한 줄로 눌러 담습니다. 상세는 필요할 때만 시트로 올라옵니다
       · 이력을 따로 찾지 않습니다. 결정한 카드가 그 자리에 접혀 남습니다
       · 버튼 대신 한 줄 입력으로 전부 합니다 (조정·조회·기안)

     PM이 이 화면에서 하는 일은 세 가지뿐입니다 — 고르고, 말하고, 올립니다.
   ========================================================================== */

var agentAiSheetFinal = '';        // 시트로 올라온 계정
var agentAiCardOpenFinal = {};     // 근거를 펼친 카드
var agentAiDoneOpenFinal = false;  // 처리된 카드 묶음 펼침

function agentAiSheetOpenFinal(acct) {
  agentAiSheetFinal = (agentAiSheetFinal === acct) ? '' : acct;
  renderBudgetPage();
}
function agentAiCardToggleFinal(id) {
  agentAiCardOpenFinal[id] = !agentAiCardOpenFinal[id];
  renderBudgetPage();
}
function agentAiDoneToggleFinal() {
  agentAiDoneOpenFinal = !agentAiDoneOpenFinal;
  renderBudgetPage();
}
/* [2026.09.03] 선택 상태를 바꾸는 순수 동작 — 대화창에는 남기지 않습니다.
   대화로 지시했을 때만 대화 기록이 생깁니다(아래 pickall/pickclear 처리부). */
function agentPickAllFinal() {
  const pend = agentProposalsFinal('pending');
  const done = {};
  pend.forEach(x => {
    const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(x.id) : null;
    if (!g) { agentMiniSelFinal[x.id] = true; return; }
    // 택1은 첫 번째 안만 골라 둡니다 — 둘 다 반영하면 중복 증액이 됩니다.
    if (done[g.key]) { agentMiniSelFinal[x.id] = false; return; }
    done[g.key] = true; agentMiniSelFinal[x.id] = true;
  });
  return { n: pend.length, pick1: Object.keys(done).length };
}
function agentPickClearFinal() {
  agentProposalsFinal('pending').forEach(x => { agentMiniSelFinal[x.id] = false; });
}
// 해야 할 일 머리의 버튼 — 화면만 바꾸고 대화창은 건드리지 않습니다.
function agentPickAllBtnFinal() { agentPickAllFinal(); renderBudgetPage(); }
function agentPickClearBtnFinal() { agentPickClearFinal(); renderBudgetPage(); }

// 반영 / 보류 — 표(상단 바)에 즉시 반영됩니다
function agentAiPickFinal(id, on) {
  const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(id) : null;
  if (g && on) g.ids.forEach(x => { agentMiniSelFinal[x] = (x === id); });
  else agentMiniSelFinal[id] = !!on;
  renderBudgetPage();
}

/* ── 상단 LIVE 바 — 지금 예산이 어떤 상태이고, 고른 것을 반영하면 어떻게 되는지 ── */
function renderAgentAiTopFinal(viewData, data, roll) {
  const ref = agentSimReflectFinal();
  const sim = agentSimMapFinal();
  const simNet = agentSimNetFinal();
  const before = roll.plan;
  const after = before + ref.net + simNet;
  const cp = roll.cp || 0;
  const pctB = cp ? (before / cp) * 100 : 0;
  const pctA = cp ? (after / cp) * 100 : 0;
  const moved = after !== before;
  const over = cp && after - cp >= 1000;

  const chips = roll.rows.map(r => {
    const d = (ref.by[r.acct] || 0) + (sim[r.acct] || 0);
    return `
      <button class="agai-acct ${d ? (d > 0 ? 'up' : 'down') : ''} ${agentAiSheetFinal === r.acct ? 'on' : ''}"
        onclick="agentAiSheetOpenFinal('${r.acct}')"
        title="${r.acct} 상세 — CP 승인액 ${fmt(r.cp)}원">
        <em class="${agentAcctColorFinal(r.acct)}">${r.acct}</em>
        <b>${fmt(r.plan + d)}</b>
        <span>${d ? agentDeltaFinal(d) : ''}</span>
      </button>`;
  }).join('');

  const vs = (typeof agentVersionsFinal === 'function') ? agentVersionsFinal() : null;
  const cur = vs && agentVerSelFinal ? agentVerSelFinal() : null;
  const conf = vs && agentVerConfirmedFinal ? agentVerConfirmedFinal() : null;
  const row = (typeof EXEC_BUDGET_PROJECTS !== 'undefined')
    ? EXEC_BUDGET_PROJECTS.find(x => x.key === currentBudgetProj) : null;

  return `
    <div class="agai-top ${over ? 'over' : ''}">
      <div class="agai-top-line">
        <strong>${escHtml((row && row.name) || (data.projName || ''))}</strong>
        ${cur ? `<button class="agai-ver" onclick="agentVerPopToggleFinal()">
          실행예산 <b>${cur.label}</b><em class="${cur.status === '작성중' ? 'draft' : ''}">${cur.status}</em><u>⌄</u></button>` : ''}
        ${conf && cur && cur.key !== conf.key ? `<span class="agai-conf">확정 ${conf.label}</span>` : ''}
        <button class="agai-cpbtn ${over ? 'over' : ''}" onclick="openCpTotalPopupFinal()"
          title="선행 시스템에서 승인받은 계정별 편성 한도 — 계정별로 펼쳐 봅니다">
          CP총액 <b>${fmt(cp)}원</b><u aria-hidden="true">⌄</u></button>
        ${over ? `<span class="agai-over">한도 초과 ${fmt(after - cp)}원</span>` : ''}
        <span class="agai-sp"></span>
        <button class="agai-hist" onclick="agentHistOpenFinal('approval')">이력</button>
      </div>
      ${agentVerPopFinal ? `<div class="agai-verwrap">${renderAgentVersionBarFinal()}</div>` : ''}

      <div class="agai-figs">
        <div class="agai-fig">
          <span>지금 수립</span>
          <b>${fmt(before)}<i>원</i></b>
          <em class="ph">&nbsp;</em>
        </div>
        <div class="agai-arrow ${moved ? 'on' : ''}">→</div>
        <div class="agai-fig ${moved ? 'after' : 'idle'}">
          <span>${moved ? (ref.cnt || simNet ? `고른 ${ref.cnt}건${simNet ? ' + 대화 조정' : ''} 반영 시` : '반영 시') : '고른 것 없음'}</span>
          <b>${fmt(after)}<i>원</i></b>
          ${moved
            ? `<em class="${after > before ? 'up' : 'down'}">${agentDeltaFinal(after - before)}</em>`
            : '<em class="ph">&nbsp;</em>'}
        </div>
        <div class="agai-accts">${chips}</div>
      </div>
    </div>`;
}

/* ── 결정 카드 — Agent 제안 하나가 대화 속 카드 하나입니다 ── */
function renderAgentAiCardFinal(p, roll) {
  const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(p.id) : null;
  // 택1은 "문제 하나"가 카드 하나입니다 — 1안·2안은 세그먼트로만 고릅니다.
  const sel = g ? g.ids.find(x => agentMiniSelFinal[x]) : null;
  const cur = sel ? agentFindProposalFinal(sel) : p;
  const on = g ? !!sel : !!agentMiniSelFinal[p.id];
  const open = !!agentAiCardOpenFinal[p.id];
  const src = (g && g.source) ? g.source : (cur.source || {});
  const legs = cur.legs || [];
  const conf = cur.confidence != null ? Math.round(cur.confidence * 100) : null;
  const tag = cur.sim ? ['sim', '✍ PM 지시'] : cur.manual ? ['manual', '✎ 수동 개입'] : ['agent', '🤖 Agent 제안'];
  const title = g ? g.problem : cur.title;
  const net = agentNetFinal(cur);

  return `
    <div class="agai-card ${on ? 'on' : ''} ${tag[0]}">
      <div class="agai-card-top">
        <span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
        <b>${escHtml(title)}</b>
        ${(g && !sel)
          ? `<em class="agai-legs">${escHtml(g.detected || '')}</em>`
          : legs.length > 1
            ? `<em class="agai-legs">${legs.map(l => `${l.acct} ${agentDeltaFinal(l.delta)}`).join(' · ')}</em>`
            : `<em class="agai-amt ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${
                net === 0 ? '±0원' : agentDeltaFinal(net)}</em>`}
      </div>
      ${(g && sel) ? `<div class="agai-card-opt">${g.ids.indexOf(sel) + 1}안 — ${escHtml((g.titles || {})[sel] || '')}</div>` : ''}
      <div class="agai-card-meta">
        <i class="agai-tag ${tag[0]}">${tag[1]}</i>
        ${cur.trigger ? `<span>${escHtml(cur.trigger)}</span>` : ''}
        ${src.ifAt ? `<span>수신 ${escHtml(src.ifAt)}</span>` : cur.detectedAt ? `<span>감지 ${escHtml(cur.detectedAt)}</span>` : ''}
        ${conf != null ? `<span class="agai-conf-n ${conf >= 90 ? 'hi' : conf >= 80 ? 'mid' : 'lo'}">확신 ${conf}%</span>` : ''}
        ${g ? '<span class="agai-pick1">택1 — 하나만 고릅니다</span>' : ''}
      </div>

      <div class="agai-card-acts">
        ${g ? g.ids.map((x, i) => `
            <button class="agai-seg ${agentMiniSelFinal[x] ? 'on' : ''}" onclick="agentAiPickFinal('${x}',true)"
              title="${escHtml((g.titles || {})[x] || '')}">${i + 1}안 ${(() => {
                const o = agentFindProposalFinal(x); const n = agentNetFinal(o);
                // 이관 건은 총액이 ±0이라 금액만 쓰면 "0원"으로 읽힙니다 — 성격을 씁니다.
                return n === 0 && (o.legs || []).length > 1 ? '이관 ±0' : agentDeltaFinal(n);
              })()}</button>`).join('')
          : `<button class="agai-yes ${on ? 'on' : ''}" onclick="agentAiPickFinal('${p.id}',${on ? 'false' : 'true'})">
               ${on ? '✓ 반영됨' : '반영'}</button>`}
        ${(g && sel) ? `<button class="agai-no" onclick="agentAiPickFinal('${sel}',false)">보류</button>` : ''}
        <button class="agai-why ${open ? 'on' : ''}" onclick="agentAiCardToggleFinal('${p.id}')">근거 ${open ? '∧' : '∨'}</button>
        <span class="agai-sp"></span>
        <button class="agai-ask" onclick="agentSimAskFinal('${p.acct} 왜 이렇게 판단했어?',1)">Agent에게 묻기</button>
      </div>

      ${open ? `
        <div class="agai-card-why">
          ${g ? `<p class="agai-gwhy">${escHtml(g.why || '')}</p>` : ''}
          <p>${escHtml(cur.why || '')}</p>
          ${src.main ? `
            <div class="agai-src">
              <b>${escHtml(src.main)}</b>
              ${src.ifFrom ? `<span>${escHtml(src.ifFrom)}</span>` : ''}
              ${src.ifBody ? `<span>${escHtml(src.ifBody)}</span>` : ''}
              ${(src.facts || []).map(f => `<span>· ${escHtml(f)}</span>`).join('')}
            </div>` : ''}
          ${cur.impact ? `<p class="agai-impact">영향 — ${escHtml(cur.impact)}</p>` : ''}
        </div>` : ''}
    </div>`;
}

/* ── 스트림 — 브리핑 · 결정 카드 · 처리된 것 · 대화가 한 줄기로 흐릅니다 ── */
function renderAgentAiStreamFinal(viewData, data, roll) {
  const pend = agentProposalsFinal('pending');
  const subD = agentDraftsFinal('submitted');
  const confD = agentDraftsFinal('confirmed');
  const retD = agentDraftsFinal('returned');
  // 택1은 문제 하나 = 카드 하나로 묶습니다.
  const gDone = {}, cards = [];
  pend.forEach(x => {
    const g = (typeof agentExGroupFinal === 'function') ? agentExGroupFinal(x.id) : null;
    if (!g) { cards.push({ p: x, picked: !!agentMiniSelFinal[x.id] }); return; }
    if (gDone[g.key]) return;
    gDone[g.key] = true;
    cards.push({ p: x, picked: g.ids.some(y => agentMiniSelFinal[y]) });
  });
  const picked = cards.filter(c => c.picked);
  const waiting = cards.filter(c => !c.picked);
  const srcN = new Set(pend.map(p => (p.source && p.source.main) || p.trigger || '')).size;

  const brief = cards.length
    ? `선행 시스템 ${srcN || 4}곳을 점검했습니다. 검토가 필요한 건이 ${cards.length}건입니다. `
      + `반영할 것을 고르시거나, 아래에 바로 말씀하셔도 됩니다.`
    : '결정이 필요한 건이 없습니다. 감지 소스를 계속 보고 있습니다.';

  return `
    <div class="agai-stream">
      <div class="agai-say agent">
        <span class="agai-who">🤖 Agent</span>
        <div class="agai-bubble">${escHtml(brief)}</div>
      </div>

      ${cards.length ? `
        <div class="agai-deck">
          <div class="agai-deck-head">
            <b>결정 대기</b><em>${waiting.length}건</em>
            ${picked.length ? `<b class="on">반영</b><em class="on">${picked.length}건</em>` : ''}
            ${picked.length ? `<button class="agai-deck-draft" onclick="agentSimDraftFinal()">이대로 기안 →</button>` : ''}
          </div>
          ${cards.map(c => renderAgentAiCardFinal(c.p, roll)).join('')}
        </div>` : ''}

      ${(subD.length || confD.length || retD.length) ? `
        <div class="agai-flow">
          ${retD.map(d => `<div class="agai-flow-row bad">↩ 기안 ${d.no} 반려 — ${escHtml(d.returnReason || '')}
            <button onclick="agentDraftRedraftFinal('${d.id}')">재기안</button></div>`).join('')}
          ${subD.map(d => `<div class="agai-flow-row sub">기안 ${d.no} 결재 대기 · ${d.approver ? escHtml(d.approver.title + ' ' + d.approver.name) : ''}
            <em>${agentDeltaFinal(agentDraftNetFinal(d))}</em></div>`).join('')}
          ${confD.map(d => `<div class="agai-flow-row ok">기안 ${d.no} 승인 완료 <em>${agentDeltaFinal(agentDraftNetFinal(d))}</em></div>`).join('')}
        </div>` : ''}

      ${AGENT_CHAT_FINAL.map(d => `
        <div class="agai-say ${d.who}">
          <span class="agai-who">${d.who === 'pm' ? '이봄(PM)' : '🤖 Agent'}</span>
          <div class="agai-bubble ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
          ${renderAgentChatActionFinal(d)}
        </div>`).join('')}
    </div>`;
}

/* ── 한 줄 입력 — 조정·조회·기안을 모두 여기서 합니다 ── */
function renderAgentAiComposerFinal(roll) {
  const ref = agentSimReflectFinal();
  const on = agentSimActiveFinal();
  const n = ref.cnt;
  const items = on
    ? [['기안해줘', 1], ['되돌려줘', 1]]
    : n
      ? [['기안해줘', 1], ['전부 반영해줘', 1], ['외주비 3천만원 늘려줘', 0], ['지금 CP 여유 얼마야?', 1]]
      : [['전부 반영해줘', 1], ['외주비 3천만원 늘려줘', 0], ['재료비에서 외주비로 1천만원 옮겨줘', 0], ['인건비 상세 보여줘', 1]];
  if (n) items.splice(1, 0, ['전부 해제해줘', 1]);
  return `
    <div class="agai-composer">
      <div class="agai-chips">
        ${items.map(x => `<button class="${x[1] ? 'run' : ''}"
          onclick="agentSimAskFinal('${x[0]}',${x[1]})">${escHtml(x[0])}</button>`).join('')}
      </div>
      <div class="agai-input">
        <input id="agent-chat-input" type="text"
          placeholder="무엇이든 말씀하세요 — 금액 조정 · 계정 조회 · 기안까지 이 한 줄로 합니다"
          onkeydown="if(event.key==='Enter') agentChatSendFinal()">
        <button class="agai-send" onclick="agentChatSendFinal()">보내기</button>
        <button class="agai-draft" ${(n || on) ? '' : 'disabled'} onclick="agentSimDraftFinal()">
          ${n ? `기안 ${agentSelCountFinal(agentProposalsFinal('pending').filter(p => agentMiniSelFinal[p.id]).map(p => p.id))}건 →` : '기안 →'}
        </button>
      </div>
    </div>`;
}

/* ── 계정 상세 시트 — 필요할 때만 위로 올라옵니다 ── */
function renderAgentAiSheetFinal(viewData, data, roll) {
  if (!agentAiSheetFinal) return '';
  const acct = agentAiSheetFinal;
  const r = (roll.rows || []).find(x => x.acct === acct) || { plan: 0, done: 0, cp: 0 };
  return `
    <div class="agai-sheet-dim" onclick="if(event.target===this)agentAiSheetOpenFinal('')">
      <div class="agai-sheet">
        <div class="agai-sheet-head">
          <span class="agp-acct sm ${agentAcctColorFinal(acct)}">${acct}</span>
          <b>${fmt(r.plan)}원</b>
          <span class="agai-sheet-sub">집행률 ${r.plan > 0 ? Math.round((r.done / r.plan) * 1000) / 10 : 0}%
            · 실적/확정 ${fmt(r.done)}원 · CP한도 ${fmt(r.cp)}원</span>
          <span class="agai-sp"></span>
          <button class="agai-sheet-ask" onclick="agentAiSheetOpenFinal('');agentSimAskFinal('${acct} 어떻게 조정하면 좋을까?',1)">Agent에게 묻기</button>
          <button class="agai-sheet-x" onclick="agentAiSheetOpenFinal('')">✕</button>
        </div>
        <div class="agai-sheet-body">${renderBudgetAccountEditor(viewData, acct)}</div>
      </div>
    </div>`;
}

/* ── AI구상안 화면 ── */
function renderAgentAiViewFinal(viewData, data, projInfo, roll) {
  agentSimFixScrollerFinal();
  agentManualSyncAllFinal();
  agentChatKeepBottomFinal();
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="agent-shell agent-ai">
      ${renderAgentAiTopFinal(viewData, data, roll)}
      ${renderAgentAiStreamFinal(viewData, data, roll)}
      ${renderAgentAiComposerFinal(roll)}
    </div>
    ${renderAgentAiSheetFinal(viewData, data, roll)}
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentReturnNoticeFinal()}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}

/* ==========================================================================
   [2026.09.03] 6안 — 3분할 간소화 (대화 시뮬레이션)
     흐름:  Agent 제안  →  Agent와 대화로 조정(시뮬레이션)  →  Agent 확정  →  기안
     · 예산 현황 보기는 전체 계정 표 하나만 둡니다. 계정 행을 누르면 상세로 들어갑니다.
     · 조정은 [수동 개입]이 아니라 대화로 합니다. 대화로 만든 값이 왼쪽 표에 바로 반영됩니다.
     · PM은 여러 방안을 저장해 비교하고, Agent에게 확정을 받은 뒤 기안합니다.
   ========================================================================== */

var agentSimFinal = {};             // { 'pjt|계정': delta }  — 대화로 만든 조정값
var AGENT_SIM_PLANS_FINAL = [];     // 저장한 방안 [{ no, by, at, note }]
var agentSimSeqFinal = 0;

function agentSimPjtFinal() { return typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : ''; }
function agentSimKeyFinal(acct) { return agentSimPjtFinal() + '|' + acct; }
function agentSimOfFinal(acct) { return agentSimFinal[agentSimKeyFinal(acct)] || 0; }
function agentSimMapFinal() {
  const pj = agentSimPjtFinal(), by = {};
  Object.keys(agentSimFinal).forEach(k => {
    const parts = k.split('|');
    if (parts[0] === pj && agentSimFinal[k]) by[parts[1]] = agentSimFinal[k];
  });
  return by;
}
function agentSimNetFinal() {
  const by = agentSimMapFinal();
  return Object.keys(by).reduce((t, k) => t + by[k], 0);
}
function agentSimActiveFinal() { return Object.keys(agentSimMapFinal()).length > 0; }

function agentSimSetFinal(acct, delta) {
  const k = agentSimKeyFinal(acct);
  const v = (agentSimFinal[k] || 0) + delta;
  if (v === 0) delete agentSimFinal[k]; else agentSimFinal[k] = v;
}
function agentSimClearFinal(quiet) {
  const pj = agentSimPjtFinal();
  Object.keys(agentSimFinal).forEach(k => { if (k.split('|')[0] === pj) delete agentSimFinal[k]; });
  agentSimDetailFinal = {};
  agentSlotFinal = null;
  if (!quiet) { showToast('시뮬레이션을 초기화했습니다. 표는 Agent 제안 기준으로 돌아갑니다.'); renderBudgetPage(); }
}

/* ── 금액 읽기 ────────────────────────────────────────────────────────────
   "12,000,000원" · "3천만원" 뿐 아니라 숫자를 아예 쓰지 않는
   "천만원" · "이천만원" · "일억 이천만원" 도 읽습니다.
   단위(억·만·천·백·원)를 하나도 만나지 못하면 금액으로 보지 않습니다
   — "4분기까지", "2026-10" 같은 숫자를 금액으로 오해하지 않기 위해서입니다. */
function agentSimAmountFinal(text) {
  const t = String(text || '').replace(/\s+/g, '');
  const D = { '일':1, '한':1, '이':2, '두':2, '삼':3, '세':3, '사':4, '네':4,
              '오':5, '육':6, '륙':6, '칠':7, '팔':8, '구':9 };
  const S = { '십':10, '백':100, '천':1000 };
  const B = { '만':10000, '억':100000000 };
  let total = 0, section = 0, cur = 0, hasUnit = false, seen = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (/[0-9]/.test(c)) {
      let j = i, num = '';
      while (j < t.length && /[0-9,]/.test(t[j])) { num += t[j]; j++; }
      cur = Number(num.replace(/,/g, '')) || 0; i = j - 1; seen = true; continue;
    }
    if (D[c] !== undefined) { cur = D[c]; seen = true; continue; }
    if (S[c] !== undefined) { section += (cur || 1) * S[c]; cur = 0; hasUnit = true; seen = true; continue; }
    if (B[c] !== undefined) { total += (section + cur) * B[c]; section = 0; cur = 0; hasUnit = true; seen = true; continue; }
    if (c === '원') { hasUnit = true; break; }
    // 단위와 무관한 글자를 만나면 지금까지 모인 조각은 버립니다
    if (!hasUnit) { cur = 0; section = 0; seen = false; }
  }
  const v = total + section + cur;
  return (seen && hasUnit && v > 0) ? Math.round(v) : 0;
}

var AGENT_SIM_ACCTS_FINAL = [
  { acct: '인건비', keys: ['인건비'] },
  { acct: '외주비', keys: ['외주비'] },
  { acct: '재료비', keys: ['재료비'] },
  { acct: '경비', keys: ['경비'] },
  { acct: 'A/S Cost', keys: ['a/s cost', 'a/s', 'as비', 'as 비용', '에이에스'] },
];
// 문장에 등장한 계정을 등장 순서대로 뽑습니다.
function agentSimAcctsFinal(text) {
  const low = String(text).toLowerCase();
  const hits = [];
  AGENT_SIM_ACCTS_FINAL.forEach(a => {
    let at = -1;
    a.keys.forEach(k => { const i = low.indexOf(k); if (i >= 0 && (at < 0 || i < at)) at = i; });
    if (at >= 0) hits.push({ acct: a.acct, at });
  });
  return hits.sort((x, y) => x.at - y.at).map(x => x.acct);
}



/* [2026.09.04] 상세계정 편성 요청 ─────────────────────────────────────────
   "OT비 천만원 편성해줘" 처럼 상세계정을 말씀하시는 경우입니다.
   OT비는 인건비 아래 상세계정이라, 그 자체로 예산이 늘어나는 것이 아닙니다.
   돈을 어디서 가져오는지가 정해져야 합니다 —
     ① 상위 계정을 그만큼 늘린다 (CP총액 여유에서)
     ② 다른 계정에서 감액해 옮겨 온다
   그래서 금액만 오면 반영하지 않고 PM의 의사를 먼저 여쭙니다. */
var AGENT_SUB_ALIAS_FINAL = {
  'ot비': 'OT비', 'ot': 'OT비', '오티비': 'OT비', '오티': 'OT비',
  '증업일급여-ot': 'OT비', '초과근무수당': 'OT비',
};

// 상세계정 이름 → 상위 계정
function agentSubMapFinal() {
  const map = {};
  if (typeof getAccountDetailRows !== 'function') return map;
  ['인건비', '외주비', '재료비', '경비', 'A/S Cost'].forEach(acct => {
    (getAccountDetailRows(acct) || []).forEach(d => {
      if (d && d.name) map[String(d.name).toLowerCase()] = { acct, sub: d.name };
    });
  });
  // 인건비 OT 는 화면마다 이름이 달라 별칭을 함께 둡니다
  Object.keys(AGENT_SUB_ALIAS_FINAL).forEach(k => {
    map[k] = { acct: '인건비', sub: AGENT_SUB_ALIAS_FINAL[k] };
  });
  return map;
}

// 문장에서 상세계정을 찾습니다 (대분류 계정명이 함께 있으면 그쪽이 우선입니다)
function agentSubFindFinal(text) {
  const t = String(text || '').toLowerCase();
  const map = agentSubMapFinal();
  let best = null;
  Object.keys(map).forEach(k => {
    const i = t.indexOf(k);
    if (i < 0) return;
    if (!best || k.length > best.key.length) best = { key: k, at: i, hit: map[k] };
  });
  if (!best) return null;
  return { acct: best.hit.acct, sub: best.hit.sub, key: best.key };
}

function agentSubStartFinal(cmd) {
  agentSlotFinal = {
    mode: 'sub', acct: cmd.acct, kind: cmd.sub, amount: cmd.amount,
    from: '', vendor: '', period: '', at: '2026-09-04 11:10',
  };
  const others = ['인건비', '외주비', '재료비', '경비', 'A/S Cost'].filter(a => a !== cmd.acct);
  AGENT_CHAT_FINAL.push({ who: 'agent', text:
    `${cmd.sub}는 ${cmd.acct} 아래 상세계정입니다. ${cmd.sub}를 ${fmt(cmd.amount)}원 편성한다는 것은 `
    + `${cmd.acct}가 그만큼 늘어난다는 뜻이라, 그 돈을 어디서 가져올지 정해야 합니다. `
    + `① ${cmd.acct}를 ${fmt(cmd.amount)}원 늘릴까요(CP총액 여유 사용)? `
    + `② 아니면 다른 계정(${others.join(' · ')})에서 같은 금액을 줄여 옮겨올까요? `
    + '"늘려줘" 또는 "외주비에서 옮겨줘"처럼 알려 주세요.' });
  return true;
}

/* 재원이 정해지면 그때 반영합니다. */
function agentSubFillFinal(text) {
  const sl = agentSlotFinal;
  const t = String(text || '');
  if (/(취소|그만|됐어|아니야)/.test(t)) {
    agentSlotFinal = null;
    AGENT_CHAT_FINAL.push({ who: 'agent', text: `${sl.kind} 편성을 취소했습니다. 예산은 그대로입니다.` });
    return true;
  }
  const amt = agentSimAmountFinal(t);
  if (amt) sl.amount = amt;

  // 어느 계정에서 가져올지
  const accts = agentSimAcctsFinal(t).filter(a => a !== sl.acct);
  const move = /(에서|이관|옮겨|옮기|가져|빼서|줄여서)/.test(t);
  if (accts.length && move) sl.from = accts[0];
  else if (/(늘려|증액|추가|올려|여유|새로|신규)/.test(t)) sl.from = '증액';

  if (!sl.from) {
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `아직 재원이 정해지지 않았습니다. ${sl.acct}를 늘릴지, 어느 계정에서 옮겨올지 알려 주세요.` });
    return true;
  }

  // 외주비 상세계정이면 업체·기간이 더 필요합니다 — 이어서 묻습니다.
  if (sl.acct === '외주비') {
    const keep = { acct: '외주비', kind: sl.kind, amount: sl.amount, vendor: '', period: '',
                   at: sl.at, srcFrom: sl.from };
    agentSlotFinal = keep;
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      (sl.from === '증액' ? `외주비를 ${fmt(sl.amount)}원 늘리는 것으로 잡겠습니다. `
        : `${sl.from}에서 ${fmt(sl.amount)}원을 옮겨 오는 것으로 잡겠습니다. `)
      + `이어서 ${sl.kind} 계획 라인을 만들려면 업체와 기간이 필요합니다. `
      + '예: "아크로디자인랩 2026-10 ~ 2026-12"' });
    return true;
  }

  if (sl.from === '증액') {
    agentSimSetFinal(sl.acct, sl.amount);
    agentSimDetailFinal[sl.acct] = { kind: sl.kind, vendor: '', period: '', amount: sl.amount };
    const done = sl; agentSlotFinal = null;
    agentSimSayImpactFinal(
      `${done.acct}를 ${fmt(done.amount)}원 늘려 ${done.kind}로 편성하는 것으로 계산했습니다.`);
    return true;
  }
  agentSimSetFinal(sl.from, -sl.amount);
  agentSimSetFinal(sl.acct, sl.amount);
  agentSimDetailFinal[sl.acct] = { kind: sl.kind, vendor: '', period: '', amount: sl.amount, from: sl.from };
  const done = sl; agentSlotFinal = null;
  agentSimSayImpactFinal(
    `${done.from}에서 ${fmt(done.amount)}원을 줄여 ${done.acct}의 ${done.kind}로 옮긴 것으로 계산했습니다. 총액은 바뀌지 않습니다.`);
  return true;
}

/* [2026.09.04] 외주비 증액은 금액만으로 세울 수 없습니다 ──────────────────
   · "외주비"라고만 하면 통상 실투입 외주비를 뜻합니다(90% 이상). 그렇게 읽되 밝힙니다.
   · 시스템상 외주비 계획 라인에는 업체 · 기간 · 금액이 모두 있어야 합니다.
     계획 라인이 있어야 그 범위 안에서 PO가 발행되기 때문입니다.
   · 그래서 금액만 오면 바로 반영하지 않고, 모자란 값을 대화로 받아냅니다. */
var agentSlotFinal = null;   // { acct, kind, amount, vendor, period, at }

function agentSlotVendorsFinal() {
  const list = [];
  // ① 이 프로젝트의 외주 제안에 담긴 업체 (최초 편성 프로젝트)
  agentProposalsFinal('pending').forEach(p => {
    (p.vendors || []).forEach(v => { if (list.indexOf(v.vendor) < 0) list.push(v.vendor); });
  });
  // ② 외주비 화면에 이미 등록된 업체
  if (typeof osv3VendorsV3 !== 'undefined' && Array.isArray(osv3VendorsV3)) {
    osv3VendorsV3.forEach(v => { if (v && v.vendor && list.indexOf(v.vendor) < 0) list.push(v.vendor); });
  }
  return list;
}

// 문장에서 업체를 찾습니다 — 등록된 업체명이 먼저, 없으면 "업체명 :" 같은 표기를 봅니다.
function agentSlotReadVendorFinal(t) {
  const known = agentSlotVendorsFinal();
  for (let i = 0; i < known.length; i++) {
    const k = known[i];
    if (t.indexOf(k) >= 0) return k;
    const bare = k.replace(/\(주\)|주식회사|㈜/g, '').trim();
    if (bare && bare.length >= 2 && t.indexOf(bare) >= 0) return k;
  }
  const m = /(?:업체|벤더|협력사)\s*[:은는이가]?\s*([^\s,·]{2,20})/.exec(t);
  return m ? m[1] : '';
}

// 기간 — "2026-10 ~ 2026-12" · "4분기" · "10월부터 3개월" · "2026-10부터 12월까지"
function agentSlotReadPeriodFinal(t) {
  let m = /(\d{4})[-.\/](\d{1,2})\s*(?:~|-|부터|에서)\s*(?:(\d{4})[-.\/])?(\d{1,2})/.exec(t);
  if (m) {
    const y1 = m[1], m1 = ('0' + m[2]).slice(-2);
    const y2 = m[3] || m[1], m2 = ('0' + m[4]).slice(-2);
    return `${y1}-${m1} ~ ${y2}-${m2}`;
  }
  m = /([1-4])\s*분기/.exec(t);
  if (m) return `${m[1]}분기`;
  m = /(\d{1,2})\s*월\s*(?:~|-|부터|에서)\s*(\d{1,2})\s*월/.exec(t);
  if (m) return `${m[1]}월 ~ ${m[2]}월`;
  m = /(\d{1,2})\s*개월/.exec(t);
  if (m) return `${m[1]}개월`;
  return '';
}

function agentSlotNeedFinal(sl) {
  const need = [];
  if (!sl.vendor) need.push('업체');
  if (!sl.period) need.push('기간');
  if (!sl.amount) need.push('금액');
  return need;
}

/* 외주비 증액 요청을 받으면 슬롯을 열고 모자란 값을 묻습니다. */
function agentSlotStartFinal(cmd) {
  agentSlotFinal = {
    acct: '외주비', kind: '실투입대상 외주비',
    amount: cmd.amount, vendor: '', period: '', at: '2026-09-04 10:20',
  };
  const known = agentSlotVendorsFinal().slice(0, 4);
  AGENT_CHAT_FINAL.push({ who: 'agent', text:
    `외주비는 통상 실투입 외주비를 말씀하시는 것으로 보고 ${agentSlotFinal.kind}로 잡겠습니다 — 다른 상세계정이면 알려 주세요. `
    + `다만 금액만으로는 계획 라인을 만들 수 없습니다. 외주비는 계획 라인이 있어야 그 범위 안에서 PO가 나가기 때문에 `
    + `업체 · 기간 · 금액이 모두 필요합니다. 금액 ${fmt(cmd.amount)}원은 확인했고, 업체와 기간을 알려 주세요. `
    + (known.length ? `등록된 업체는 ${known.join(', ')} 입니다. ` : '')
    + '예: "아크로디자인랩 2026-10 ~ 2026-12"' });
  return true;
}

/* 슬롯이 열려 있는 동안의 답변을 채워 넣습니다. */
function agentSlotFillFinal(text) {
  const sl = agentSlotFinal;
  if (!sl) return false;
  if (sl.mode === 'sub') return agentSubFillFinal(text);
  const t = String(text || '');
  if (/(취소|그만|됐어|안 할래|아니야)/.test(t)) {
    agentSlotFinal = null;
    AGENT_CHAT_FINAL.push({ who: 'agent', text: '외주비 증액을 취소했습니다. 예산은 그대로입니다.' });
    return true;
  }
  // 상세계정을 바꿔 말하면 그대로 받습니다
  const kinds = (typeof getAccountDetailRows === 'function' ? getAccountDetailRows('외주비') : []) || [];
  kinds.forEach(k => { if (t.indexOf(k.name) >= 0) sl.kind = k.name; });

  const v = agentSlotReadVendorFinal(t); if (v) sl.vendor = v;
  const pr = agentSlotReadPeriodFinal(t); if (pr) sl.period = pr;
  const amt = agentSimAmountFinal(t); if (amt) sl.amount = amt;

  const need = agentSlotNeedFinal(sl);
  if (need.length) {
    const got = [
      sl.vendor ? `업체 ${sl.vendor}` : '', sl.period ? `기간 ${sl.period}` : '',
      sl.amount ? `금액 ${fmt(sl.amount)}원` : '',
    ].filter(Boolean).join(' · ');
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      (got ? `${got} 확인했습니다. ` : '')
      + `${need.join('와 ')}이(가) 아직 없습니다. 알려 주시면 계획 라인을 만들겠습니다.`
      + (need.indexOf('기간') >= 0 ? ' 기간은 "2026-10 ~ 2026-12" 또는 "4분기"처럼 주시면 됩니다.' : '') });
    return true;
  }

  // 다 모였습니다 — 그때 비로소 반영합니다
  agentSimSetFinal(sl.acct, sl.amount);
  agentSimDetailFinal[sl.acct] = { kind: sl.kind, vendor: sl.vendor, period: sl.period, amount: sl.amount };
  const done = sl;
  agentSlotFinal = null;
  agentSimSayImpactFinal(
    `${done.vendor} · ${done.period} · ${fmt(done.amount)}원으로 ${done.kind} 계획 라인을 잡았습니다.`);
  return true;
}

var agentSimDetailFinal = {};   // 대화로 받은 계정별 상세(업체·기간)

/* ── 대화 한 줄을 시뮬레이션 명령으로 읽습니다 ── */
function agentSimReadFinal(text) {
  const t = String(text || '');
  if (/(초기화|되돌려|되돌리|원래대로|리셋)/.test(t)) return { kind: 'reset' };
  if (/(방안).*(저장|담아|보관)|저장해\s*줘/.test(t)) return { kind: 'save' };
  if (/(방안|안)\s*([1-9])\s*(번)?\s*(불러|적용|로 해|으로 해|로가|보여)/.test(t)) {
    return { kind: 'load', no: Number(RegExp.$2) };
  }
  if (/(비교)/.test(t) && AGENT_SIM_PLANS_FINAL.length) return { kind: 'compare' };
  if (/(전부|모두|다)\s*(반영|선택|골라|적용)/.test(t) || /^(전부|모두)\s*반영/.test(t)) {
    return { kind: 'pickall' };
  }
  if (/(보류|해제|고르지\s*마|취소)/.test(t) && /(전부|모두|다)/.test(t)) {
    return { kind: 'pickclear' };
  }
  if (/(기안|상신|올려|결재)/.test(t)) return { kind: 'draft' };
  if (/(확정|적용|반영해)/.test(t)) return { kind: 'commit' };

  // 상세계정을 말씀하신 경우 — 재원을 먼저 여쭙니다 ("OT비 천만원 편성해줘")
  const sub = agentSubFindFinal(t);
  const subAmt = agentSimAmountFinal(t);
  if (sub && subAmt && !/(줄여|감액|빼|삭감|축소)/.test(t)) {
    // "이관인건비"처럼 상세계정 이름 안에 상위 계정명이 들어 있는 경우가 있어,
    // 상세계정 이름을 지운 문장에서 다시 계정을 찾아 판단합니다.
    const rest = t.split(sub.key).join(' ');
    if (agentSimAcctsFinal(rest).indexOf(sub.acct) < 0) {
      return { kind: 'sub', acct: sub.acct, sub: sub.sub, amount: subAmt };
    }
  }

  const accts = agentSimAcctsFinal(t);
  const amt = agentSimAmountFinal(t);

  // 금액 없이 계정만 말하면 상세를 엽니다 — "인건비 상세 보여줘"
  if (accts.length && !amt && /(상세|보여|열어|내역|알려)/.test(t)) {
    return { kind: 'open', acct: accts[0] };
  }
  if (!accts.length || !amt) return null;

  const move = /(이관|옮겨|옮기|이동|돌려|가져)/.test(t) || /에서.*(으로|로)/.test(t);
  if (move && accts.length >= 2) {
    return { kind: 'move', from: accts[0], to: accts[1], amount: amt };
  }
  const down = /(줄여|감액|빼|삭감|내려|축소|덜어)/.test(t);
  const up = /(늘려|증액|추가|올려|더|확대|키워|잡아)/.test(t);
  if (!down && !up) return null;
  return { kind: 'delta', acct: accts[0], amount: down ? -amt : amt };
}

/* ── 시뮬레이션 결과 요약 — Agent가 이 문장으로 답합니다 ── */
function agentSimImpactFinal() {
  const roll = agentRollCacheFinal;
  const ref = (typeof agentSimReflectFinal === 'function') ? agentSimReflectFinal() : { by: {}, net: 0 };
  const by = agentSimMapFinal();
  const cp = roll ? roll.cp : 0;
  const planBase = roll ? roll.plan : 0;
  const rows = (roll && roll.rows ? roll.rows : []).map(r => {
    const rd = (ref.by && ref.by[r.acct]) || 0;
    const sd = by[r.acct] || 0;
    return { acct: r.acct, cp: r.cp || 0, plan: r.plan, after: r.plan + rd + sd, refD: rd, simD: sd };
  });
  const after = rows.reduce((t, r) => t + r.after, 0);
  const overs = rows.filter(r => r.cp && r.after - r.cp >= 1000)
    .map(r => ({ acct: r.acct, cp: r.cp, after: r.after, over: r.after - r.cp }));
  return {
    cp, planBase, before: planBase + (ref.net || 0), after, rows, overs,
    simNet: agentSimNetFinal(),
    remain: cp - after,
    overTotal: cp > 0 && after - cp >= 1000,
    pct: cp > 0 ? (after / cp) * 100 : 0,
  };
}

function agentSimSayImpactFinal(head) {
  const c = agentSimImpactFinal();
  const lines = [head];
  lines.push(`수립 예산 ${fmt(c.before)}원 → ${fmt(c.after)}원 (${agentDeltaFinal(c.after - c.before)}).`);
  if (c.cp) {
    lines.push(`CP총액 ${fmt(c.cp)}원 대비 소진율 ${agentPctFinal(c.pct)}, `
      + (c.overTotal ? `한도를 ${fmt(-c.remain)}원 초과합니다.` : `여유 ${fmt(c.remain)}원.`));
  }
  if (c.overs.length) {
    lines.push('계정 한도를 넘는 계정 — '
      + c.overs.map(x => `${x.acct} ${fmt(x.after)}원(한도 ${fmt(x.cp)}원 · ${agentDeltaFinal(x.over)})`).join(', ')
      + '. 계정 단위 초과는 허용되지만 합계는 넘을 수 없습니다.');
  }
  if (c.overTotal) {
    lines.push('이 상태로는 확정할 수 없습니다. 다른 계정에서 옮겨 오거나 금액을 줄여 주세요 — 예: "재료비에서 외주비로 1천만원 옮겨줘".');
    AGENT_CHAT_FINAL.push({ who: 'agent', text: lines.join(' ') });
    return;
  }
  // 문구로 답하게 하지 않고, 바로 누를 수 있는 버튼을 답변에 붙입니다.
  AGENT_CHAT_FINAL.push({ who: 'agent', text: lines.join(' '), action: 'commit' });
}

/* ── 명령 실행 ── */
function agentSimApplyFinal(cmd) {
  if (cmd.kind === 'reset') {
    agentSimClearFinal(true);
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      '시뮬레이션을 초기화했습니다. 왼쪽 표는 다시 Agent 제안 기준으로 돌아갔습니다.' });
    return true;
  }
  if (cmd.kind === 'save') {
    const by = agentSimMapFinal();
    if (!Object.keys(by).length) {
      AGENT_CHAT_FINAL.push({ who: 'agent', text: '저장할 조정 내용이 없습니다. 먼저 금액을 조정해 주세요 — 예: "외주비 3천만원 늘려줘".' });
      return true;
    }
    agentSimSeqFinal += 1;
    AGENT_SIM_PLANS_FINAL.push({ no: agentSimSeqFinal, by: by, at: '2026-09-03 14:20',
      pjt: agentSimPjtFinal(), net: agentSimNetFinal() });
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `방안 ${agentSimSeqFinal}로 저장했습니다 (${Object.keys(by).map(k => k + ' ' + agentDeltaFinal(by[k])).join(', ')}). `
      + '다른 방안을 만들어 보시고 "비교해줘"라고 하시면 나란히 보여드리겠습니다.' });
    return true;
  }
  if (cmd.kind === 'load') {
    const pl = AGENT_SIM_PLANS_FINAL.find(x => x.no === cmd.no && x.pjt === agentSimPjtFinal());
    if (!pl) {
      AGENT_CHAT_FINAL.push({ who: 'agent', text: `방안 ${cmd.no}은 저장되어 있지 않습니다.` });
      return true;
    }
    agentSimClearFinal(true);
    Object.keys(pl.by).forEach(k => agentSimSetFinal(k, pl.by[k]));
    agentSimSayImpactFinal(`방안 ${cmd.no}을 불러왔습니다.`);
    return true;
  }
  if (cmd.kind === 'compare') {
    const mine = AGENT_SIM_PLANS_FINAL.filter(x => x.pjt === agentSimPjtFinal());
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      '저장한 방안 비교 — ' + mine.map(x =>
        `방안 ${x.no}: ${Object.keys(x.by).map(k => k + ' ' + agentDeltaFinal(x.by[k])).join(' / ')} (합계 ${agentDeltaFinal(x.net)})`
      ).join(' ∥ ') + '. "방안 N 적용해줘"라고 하시면 그 방안으로 표를 바꿉니다.' });
    return true;
  }
  if (cmd.kind === 'commit') return agentSimCommitFinal();
  if (cmd.kind === 'draft') return agentSimDraftFinal();
  if (cmd.kind === 'sub') return agentSubStartFinal(cmd);
  if (cmd.kind === 'pickall') {
    if (!agentProposalsFinal('pending').length) {
      AGENT_CHAT_FINAL.push({ who: 'agent', text: '반영할 제안이 없습니다.' });
      return true;
    }
    const r = agentPickAllFinal();
    const ref = agentSimReflectFinal();
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `${ref.cnt}건을 반영으로 골랐습니다${r.pick1 ? ` (택1은 1안으로 잡아 두었습니다 — 바꾸시려면 카드에서 2안을 눌러 주세요)` : ''}. `
      + `수립 예산은 ${fmt((agentRollCacheFinal || {}).plan || 0)}원 → ${fmt(((agentRollCacheFinal || {}).plan || 0) + ref.net)}원이 됩니다. `
      + '아래 [기안해줘]를 누르시면 결재선 지정으로 넘어갑니다.' });
    return true;
  }
  if (cmd.kind === 'pickclear') {
    agentPickClearFinal();
    AGENT_CHAT_FINAL.push({ who: 'agent', text: '고른 것을 모두 보류로 되돌렸습니다. 표에는 변동이 반영되지 않습니다.' });
    return true;
  }
  if (cmd.kind === 'open') {
    if (agentViewFinal === 'ai') agentAiSheetFinal = cmd.acct;
    else if (typeof agentBudgetFullOpenFinal === 'function') agentBudgetFullOpenFinal(cmd.acct);
    const r = ((agentRollCacheFinal || {}).rows || []).find(x => x.acct === cmd.acct) || { plan: 0, done: 0, cp: 0 };
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `${cmd.acct} 상세를 열었습니다. 수립 ${fmt(r.plan)}원 · 실적(확정) ${fmt(r.done)}원`
      + `(집행률 ${r.plan > 0 ? Math.round((r.done / r.plan) * 1000) / 10 : 0}%) · CP한도 ${fmt(r.cp)}원입니다.` });
    return true;
  }
  if (cmd.kind === 'move') {
    agentSimSetFinal(cmd.from, -cmd.amount);
    agentSimSetFinal(cmd.to, cmd.amount);
    agentSimDetailFinal[cmd.to] = { kind: '', vendor: '', period: '', amount: cmd.amount, from: cmd.from };
    agentSimSayImpactFinal(`${cmd.from}에서 ${cmd.to}로 ${fmt(cmd.amount)}원을 옮긴 것으로 계산했습니다. 총액은 바뀌지 않습니다.`);
    return true;
  }
  if (cmd.kind === 'delta') {
    // 외주비 증액은 업체·기간이 있어야 계획 라인을 만들 수 있습니다 — 먼저 물어봅니다.
    if (cmd.acct === '외주비' && cmd.amount > 0) return agentSlotStartFinal(cmd);
    agentSimSetFinal(cmd.acct, cmd.amount);
    // 상세계정을 지목하지 않은 지시입니다 — 첫 상세계정 표에 그대로 보여 줍니다.
    if (cmd.amount > 0) agentSimDetailFinal[cmd.acct] = { kind: '', vendor: '', period: '', amount: cmd.amount };
    agentSimSayImpactFinal(`${cmd.acct}를 ${agentDeltaFinal(cmd.amount)} 조정한 것으로 계산했습니다.`);
    return true;
  }
  return false;
}

/* ── Agent 확정 → [해야 할 일]에 올립니다 ── */
function agentSimCommitFinal() {
  const by = agentSimMapFinal();
  if (!Object.keys(by).length) {
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      '반영할 조정 내용이 없습니다. 먼저 대화로 금액을 조정해 주세요 — 예: "외주비 3천만원 늘려줘".' });
    renderBudgetPage();
    return true;
  }
  const c = agentSimImpactFinal();
  if (c.overTotal) {
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `확정할 수 없습니다. 이 방안은 수립 예산이 CP총액을 ${fmt(-c.remain)}원 초과합니다. `
      + 'CP총액은 선행 시스템이 승인한 한도라 합계 초과는 처리되지 않습니다. 금액을 줄이거나 다른 계정에서 옮겨 와 주세요.' });
    renderBudgetPage();
    return true;
  }
  const pj = agentSimPjtFinal();
  const rows = (agentRollCacheFinal && agentRollCacheFinal.rows) || [];
  const ref = (typeof agentSimReflectFinal === 'function') ? agentSimReflectFinal() : { by: {} };
  let n = 0;
  Object.keys(by).forEach(acct => {
    const r = rows.find(x => x.acct === acct) || { plan: 0 };
    const from = r.plan + ((ref.by && ref.by[acct]) || 0);
    const id = 'sm-' + pj + '-' + acct;
    const np = {
      id, pjt: pj, acct, status: 'pending', sim: true, confidence: 1,
      detectedAt: '2026-09-03 14:20', trigger: 'PM 대화 시뮬레이션 → Agent 확정',
      title: `${acct} 예산을 ${agentDeltaFinal(by[acct])} 조정합니다 (대화 시뮬레이션 확정)`,
      legs: [{ acct, from, to: from + by[acct], delta: by[acct] }],
      monthly: [],
      why: (agentSimDetailFinal[acct]
          ? `대화로 받은 ${agentSimDetailFinal[acct].kind} 계획입니다 — 업체 ${agentSimDetailFinal[acct].vendor} · `
            + `기간 ${agentSimDetailFinal[acct].period} · 금액 ${fmt(agentSimDetailFinal[acct].amount)}원. `
          : '')
         + 'PM이 [Agent와 대화하기]에서 시뮬레이션한 뒤 Agent가 검증해 확정한 조정입니다. '
         + `확정 시점 기준으로 CP총액 ${fmt(c.cp)}원 대비 소진율 ${agentPctFinal(c.pct)}, 여유 ${fmt(c.remain)}원입니다.`,
      impact: `${acct} ${fmt(from)}원 → ${fmt(from + by[acct])}원.`
         + (agentSimDetailFinal[acct]
             ? ` ${agentSimDetailFinal[acct].vendor} 계획 라인이 생겨 그 범위 안에서 PO를 발행할 수 있습니다.`
             : ' 월 배분은 계정 내역에서 확정합니다.'),
      simAt: '2026-09-03 14:20', simBy: '이봄(PM)',
    };
    let idx = -1;
    for (let i = 0; i < AGENT_PROPOSALS_FINAL.length; i++) {
      if (AGENT_PROPOSALS_FINAL[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) {
      if (AGENT_PROPOSALS_FINAL[idx].status !== 'pending') return;
      AGENT_PROPOSALS_FINAL[idx] = np;
    } else AGENT_PROPOSALS_FINAL.push(np);
    agentMiniSelFinal[id] = true;
    n += 1;
  });
  agentSimClearFinal(true);
  AGENT_LOG_FINAL.unshift({
    at: '2026-09-03 14:20', acct: Object.keys(by).join(', '), actor: 'Agent', decision: 'manual',
    reason: `대화 시뮬레이션 확정 — ${Object.keys(by).map(k => k + ' ' + agentDeltaFinal(by[k])).join(', ')}`,
    dialog: [{ who: 'agent', text: 'PM이 시뮬레이션한 방안을 검증해 확정했습니다. 기안 후 직책자 결재로 넘어갑니다.' }],
  });
  AGENT_CHAT_FINAL.push({ who: 'agent', text:
    `확정했습니다. ${n}건을 [${agentTodoLabelFinal()}]에 올려 두었고 반영으로 체크해 두었습니다 — `
    + `[기안 ${n}건 →]을 누르면 결재선 지정으로 넘어갑니다. `
    + `확정 기준 수립 예산 ${fmt(c.after)}원 · CP총액 여유 ${fmt(c.remain)}원입니다.` });
  showToast(`대화 시뮬레이션 ${n}건을 확정해 [해야 할 일]에 올렸습니다.`);
  renderBudgetPage();
  return true;
}

/* [2026.09.03] 대화로 기안 (요구 6·7)
   ① 대화로 조정한 것이 있으면 먼저 확정해 [해야 할 일]에 올립니다.
   ② 선택된 항목으로 무엇을 기안하는지 요약해 알려 줍니다.
   ③ 결재선 지정 팝업을 띄웁니다. */
function agentSimDraftFinal() {
  if (agentSimActiveFinal()) {
    agentSimCommitFinal();
    // 확정이 막혔으면(CP총액 초과) 그대로 멈춥니다 — 안내는 확정 쪽에서 이미 했습니다.
    if (agentSimActiveFinal()) return true;
  }
  const pend = agentProposalsFinal('pending');
  if (!pend.length) {
    AGENT_CHAT_FINAL.push({ who: 'agent', text: `기안할 항목이 없습니다. [${agentTodoLabelFinal()}]이 비어 있습니다.` });
    renderBudgetPage();
    return true;
  }
  let ids = pend.filter(p => agentMiniSelFinal[p.id]).map(p => p.id);
  let usedAll = false;
  if (!ids.length) { ids = pend.map(p => p.id); usedAll = true; }

  const conflicts = agentExConflictsFinal(ids);
  if (conflicts.length) {
    const g = conflicts[0].g;
    AGENT_CHAT_FINAL.push({ who: 'agent', text:
      `${g.acct}는 1안·2안 중 하나만 기안할 수 있습니다. [${agentTodoLabelFinal()}]에서 하나를 보류로 바꾸신 뒤 다시 [기안해줘]를 누르시면 바로 올리겠습니다.` });
    agentOpenApprovalPopupFinal(ids);        // 어디를 고쳐야 하는지 화면에서 알려 줍니다
    return true;
  }

  const items = ids.map(agentFindProposalFinal).filter(Boolean);
  const legs = agentAggregateLegsFinal(items);
  const imp = agentCpImpactFinal(legs);
  const bySrc = { agent: 0, sim: 0, manual: 0 };
  items.forEach(p => { bySrc[p.sim ? 'sim' : p.manual ? 'manual' : 'agent'] += 1; });
  const src = [
    bySrc.agent ? `🤖 Agent 제안 ${bySrc.agent}건` : '',
    bySrc.sim ? `✍ PM 지시 ${bySrc.sim}건` : '',
    bySrc.manual ? `✎ 수동 개입 ${bySrc.manual}건` : '',
  ].filter(Boolean).join(' · ');

  AGENT_CHAT_FINAL.push({ who: 'agent', text:
    `${usedAll ? '고르신 항목이 없어 대기 중인 ' : '고르신 '}${items.length}건(${src})을 이런 내역으로 기안하겠습니다. `
    + legs.map(e => `${e.acct} ${fmt(e.from)}원 → ${fmt(e.to)}원(${agentDeltaFinal(e.delta)})`).join(', ')
    + `. 합계 ${fmt(imp.before)}원 → ${fmt(imp.after)}원`
    + (imp.cp ? ` · CP총액 소진율 ${agentPctFinal(imp.pctBefore)} → ${agentPctFinal(imp.pctAfter)}` : '')
    + '. 결재선 지정 창을 띄웠습니다 — 승인자를 확인하고 상신해 주세요.' });
  agentOpenApprovalPopupFinal(ids);
  return true;
}

// 버튼용
function agentSimCommitBtnFinal() { agentSimCommitFinal(); }
function agentSimDraftBtnFinal() { agentSimDraftFinal(); }
function agentSimSaveBtnFinal() { agentSimApplyFinal({ kind: 'save' }); renderBudgetPage(); }
function agentSimLoadBtnFinal(no) { agentSimApplyFinal({ kind: 'load', no: no }); renderBudgetPage(); }
function agentSimAskFinal(text, run) {
  const el = document.getElementById('agent-chat-input');
  if (!el) return;
  el.value = text;
  if (run) { agentChatSendFinal(); return; }
  el.focus();
}

/* [2026.09.03] 6안 반영 규칙 — PM이 [해야 할 일]에서 고른 것만 표에 반영합니다.
   고르기 전에는 변동을 보여주지 않습니다(요구 2). */
function agentSimReflectFinal() {
  const by = {};
  let cnt = 0, pendN = 0;
  agentProposalsFinal('pending').forEach(p => {
    pendN += 1;
    if (!agentMiniSelFinal[p.id]) return;
    cnt += 1;
    (p.legs || []).forEach(l => { by[l.acct] = (by[l.acct] || 0) + l.delta; });
  });
  const net = Object.keys(by).reduce((t, k) => t + by[k], 0);
  return { by, net, cnt, pendN, wait: [] };
}

/* ── 전체 계정 표 — 6안 예산 현황 보기의 본체 ──────────────────────────────
   정보의 양을 세 단계로 고를 수 있습니다.
     간단 : 계정 · 수립 · 반영 후 수립 · 변동 · 판단          (금액 변화만)
     기본 : 집행 정보를 한 칸(금액 + 집행률 + 막대)으로 합쳐 넣습니다  ← 기본값
     상세 : 실적(확정) · 계획(미집행) · 집행률 vs 기간을 따로 펼칩니다
   계획(미집행) = 수립 − 실적이라 '간단·기본'에서는 파생값으로 보고 빼둡니다. */
var agentSimDensityFinal = 'lite';       // 'lite' | 'mid' | 'full'
function agentSimDensitySetFinal(k) { agentSimDensityFinal = k; renderBudgetPage(); }

// 표 정보량은 '간단' 하나만 씁니다(전환 버튼을 두지 않습니다).
function renderAgentSimDensityFinal() { return ''; }

function renderAgentSimTableFinal(viewData, data, roll) {
  const months = viewData.months.map(m => m.m);
  const today = (typeof osv3TodayMonthV3 === 'function') ? osv3TodayMonthV3() : '2026-08';
  const passed = months.filter(m => m <= today).length;
  const elapsed = months.length ? passed / months.length : 0;

  const den = agentSimDensityFinal;
  const lite = den === 'lite', full = den === 'full', mid = den === 'mid';

  const pend = agentProposalsFinal('pending');
  const ref = agentSimReflectFinal();          // 고른 것만 반영합니다
  const sim = agentSimMapFinal();
  const hasSim = Object.keys(sim).length > 0;
  const rows = roll.rows.map(r => {
    const rate = r.plan > 0 ? (r.done / r.plan) * 100 : 0;
    const rd = agentReflectOfFinal(ref, r.acct);      // 고르지 않은 제안은 빠집니다
    const sd = sim[r.acct] || 0;
    const after = r.plan + rd + sd;
    const h = agentAcctHealthFinal({ plan: after || r.plan, done: r.done }, elapsed);
    return { r, h, rate, delta: rd, rd, sd, after, move: after - r.plan };
  });
  const totAfter = rows.reduce((t, x) => t + x.after, 0);
  const totPend = rows.reduce((t, x) => t + x.delta, 0);
  const totSim = rows.reduce((t, x) => t + x.sd, 0);
  const totRate = roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0;

  const head = `
    <tr>
      <th>계정</th>
      <th class="num">변경 전</th>
      ${full ? '<th class="num">실적(확정)</th><th class="num">계획(미집행)</th>' : ''}
      ${mid ? '<th class="agsim-run">집행</th>' : ''}
      ${lite ? '<th class="num">변동</th>' : '<th class="num">대기 제안</th>'}
      ${(hasSim && !lite) ? '<th class="num sim">시뮬레이션</th>' : ''}
      <th class="num">변경 후</th>
      ${lite ? '' : `<th class="agsim-judge">${full ? 'Agent 판단' : '판단'}</th>`}
    </tr>`;

  const body = rows.map(x => `
    <tr class="agsim-row ${x.sd ? 'simmed' : ''} ${budgetSetupEditAccount === x.r.acct ? 'on' : ''}"
      role="button" tabindex="0" title="${x.r.acct} 내역 보기"
      onclick="agentBudgetFullOpenFinal('${x.r.acct}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();agentBudgetFullOpenFinal('${x.r.acct}')}">
      <td><span class="agp-acct sm ${agentAcctColorFinal(x.r.acct)}">${x.r.acct}</span></td>
      <td class="num">${fmt(x.r.plan)}</td>
      ${full ? `
        <td class="num done">${fmt(x.r.done)}</td>
        <td class="num open">${fmt(x.r.remain)}</td>` : ''}
      ${mid ? `
        <td class="agsim-run">
          <b>${fmt(x.r.done)}</b>
          <span>${Math.round(x.rate * 10) / 10}%</span>
        </td>` : ''}
      ${lite
        ? `<td class="num ${x.move > 0 ? 'up' : x.move < 0 ? 'down' : ''}">${x.move ? agentDeltaFinal(x.move) : '–'}</td>`
        : `<td class="num ${x.delta > 0 ? 'up' : x.delta < 0 ? 'down' : ''}">${x.delta ? agentDeltaFinal(x.delta) : '–'}</td>`}
      ${(hasSim && !lite) ? `<td class="num sim ${x.sd > 0 ? 'up' : x.sd < 0 ? 'down' : ''}">${x.sd ? agentDeltaFinal(x.sd) : '–'}</td>` : ''}
      <td class="num after">${x.move ? `<b>${fmt(x.after)}</b>` : fmt(x.r.plan)}</td>
      ${lite ? '' : `
        <td class="agsim-judge">
          <em class="agin-health ${x.h.key}" title="${x.h.desc}">${x.h.label}</em>
          ${full ? `<span class="agin-health-desc">${x.h.desc}</span>` : ''}
        </td>`}
    </tr>`).join('');

  const totMove = totAfter - roll.plan;
  const foot = `
    <tr>
      <td>합계</td>
      <td class="num">${fmt(roll.plan)}</td>
      ${full ? `
        <td class="num done">${fmt(roll.done)}</td>
        <td class="num open">${fmt(roll.plan - roll.done)}</td>` : ''}
      ${mid ? `<td class="agsim-run"><b>${fmt(roll.done)}</b><span>${totRate}%</span></td>` : ''}
      ${lite
        ? `<td class="num ${totMove > 0 ? 'up' : totMove < 0 ? 'down' : ''}">${totMove ? agentDeltaFinal(totMove) : '–'}</td>`
        : `<td class="num">${totPend ? agentDeltaFinal(totPend) : '–'}</td>`}
      ${(hasSim && !lite) ? `<td class="num sim ${totSim > 0 ? 'up' : totSim < 0 ? 'down' : ''}">${totSim ? agentDeltaFinal(totSim) : '±0원'}</td>` : ''}
      <td class="num after"><b>${fmt(totAfter)}</b></td>
      ${lite ? '' : '<td></td>'}
    </tr>`;

  return `
    ${renderAgentSimDensityFinal()}
    <div class="agsim-table-wrap">
      <table class="agin-table agsim-table den-${den}">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
        <tfoot>${foot}</tfoot>
      </table>
    </div>
    ${(ref.pendN && ref.cnt < ref.pendN) ? `
      <p class="agsim-wait">${ref.cnt
        ? `선택한 ${ref.cnt}건만 반영했습니다. 남은 ${ref.pendN - ref.cnt}건은 [해야 할 일]에서 고르면 이 표에 바로 반영됩니다.`
        : `[해야 할 일]의 ${ref.pendN}건을 고르면 이 표에 바로 반영됩니다.`}</p>` : ''}`;
}

/* ── 시뮬레이션 상태 배너 ── */
function renderAgentSimBannerFinal() {
  const by = agentSimMapFinal();
  const keys = Object.keys(by);
  const plans = AGENT_SIM_PLANS_FINAL.filter(x => x.pjt === agentSimPjtFinal());
  if (!keys.length && !plans.length) return '';   // 조정 중이 아니면 표만 둡니다
  const c = agentSimImpactFinal();
  return `
    <div class="agsim-state ${c.overTotal ? 'over' : ''}">
      <div class="agsim-state-top">
        <b>🧪 시뮬레이션 중</b>
        ${keys.length ? `<span>${keys.map(k => `${k} ${agentDeltaFinal(by[k])}`).join(' · ')}</span>`
          : '<span>조정 없음 — 저장한 방안만 있습니다</span>'}
        <em class="${c.simNet > 0 ? 'up' : c.simNet < 0 ? 'down' : 'zero'}">합계 ${c.simNet === 0 ? '±0원' : agentDeltaFinal(c.simNet)}</em>
      </div>
      <div class="agsim-state-kv">
        <span>수립 예산</span><b>${fmt(c.before)}원 <i>→</i> ${fmt(c.after)}원</b>
        <span>CP총액 소진율</span><b>${agentPctFinal(c.pct)}</b>
        <span>${c.overTotal ? 'CP총액 초과' : 'CP총액 여유'}</span>
        <b class="${c.overTotal ? 'bad' : ''}">${fmt(Math.abs(c.remain))}원</b>
      </div>
      ${c.overs.length ? `
        <p class="agsim-warn">⚠ 계정 한도 초과 — ${c.overs.map(x =>
          `<b>${x.acct}</b> ${fmt(x.after)}원 (한도 ${fmt(x.cp)}원)`).join(' · ')} · 계정 초과는 허용되나 합계는 넘을 수 없습니다.</p>` : ''}
      ${c.overTotal ? `
        <p class="agsim-warn big">⚠ 합계가 CP총액을 ${fmt(-c.remain)}원 초과해 확정할 수 없습니다. 대화로 금액을 줄이거나 계정 간 이관으로 바꿔 주세요.</p>` : ''}
      <div class="agsim-acts">
        ${keys.length ? `
          <button class="agsim-commit" ${c.overTotal ? 'disabled' : ''} onclick="agentSimCommitBtnFinal()">해야 할 일로 반영</button>
          <button class="agsim-draft" ${c.overTotal ? 'disabled' : ''} onclick="agentSimDraftBtnFinal()">바로 기안 →</button>
          <button onclick="agentSimSaveBtnFinal()">방안 저장</button>
          <button onclick="agentSimClearFinal()">초기화</button>` : ''}
        ${plans.length ? `
          <span class="agsim-plans">저장한 방안
            ${plans.map(x => `<button class="agsim-plan" onclick="agentSimLoadBtnFinal(${x.no})"
              title="${Object.keys(x.by).map(k => k + ' ' + agentDeltaFinal(x.by[k])).join(', ')}">방안 ${x.no} <i>${agentDeltaFinal(x.net)}</i></button>`).join('')}
          </span>` : ''}
      </div>
    </div>`;
}

/* 상단 한 줄 — 프로젝트 정보 줄 안(기간·PM·유형 앞)에 실행예산 버전을 끼워 넣습니다.
   공통 렌더러를 고치지 않고 결과 HTML에서 자리만 잡아 줍니다. */
function agentSimTopLineFinal(projInfo) {
  const ver = renderAgentVersionBarFinal();
  const html = String(projInfo || '');
  if (!ver) return html;
  const at = html.indexOf('<div class="bpi-item">');       // 기간부터는 우측 정렬입니다
  if (at < 0) return html.replace('</div>', ver + '</div>');
  return html.slice(0, at) + ver + html.slice(at);
}

/* [2026.09.03] sticky 가 동작하도록 화면의 overflow 를 정리합니다.
   .screen 의 overflow-y:auto 가 sticky 의 기준 스크롤 컨테이너가 되는데
   실제 스크롤은 문서가 하므로, 6안이 떠 있는 동안만 그 화면의 overflow 를 풉니다. */
function agentSimFixScrollerFinal() {
  const on = agentViewFinal === 'sim' || agentViewFinal === 'ai' || agentViewFinal === 'agent';
  if (document.body) document.body.classList.toggle('agent-sim-on', on);
  const sc = document.getElementById('s-budget');
  if (!sc) return;
  if (on) { if (sc.style.overflow !== 'visible') sc.style.overflow = 'visible'; }
  else if (sc.style.overflow) { sc.style.overflow = ''; }
}

/* 3칸이 모두 펼쳐진 상태에서는 좌측을 하나의 컬럼으로 묶습니다.
   그 안에서 예산 칸을 sticky 로 붙여, 대화를 쓰려고 내려도 표가 따라옵니다.
   한 칸을 전체폭으로 키운 상태에서는 기존 순차 배치를 그대로 씁니다. */
function agentSimBudgetPaneFinal(roll, body) {
  return `
    <div class="agent-pane budget ${agentPaneStateFinal('budget')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'budget')}>
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>예산 현황 보기</strong>
        </div>
        ${renderAgentCpChipFinal(roll)}
        ${agentPaneToggleBtnFinal('budget')}
      </div>
      <div class="agpane-body">${body}</div>
    </div>`;
}

function agentSimGridFinal(roll, body) {
  agentSimFixScrollerFinal();
  const n = agentNormalPanesFinal().length;
  if (n !== 3) {
    return `
      <div class="agent-split n${n}">
        ${renderAgentTodoFinal()}
        ${renderAgentChatPaneFinal()}
        ${agentSimBudgetPaneFinal(roll, body)}
      </div>`;
  }
  return `
    <div class="agent-split n3 agsim-grid">
      <div class="agsim-left">
        ${agentSimBudgetPaneFinal(roll, body)}
        ${renderAgentTodoFinal()}
      </div>
      ${renderAgentChatPaneFinal()}
    </div>`;
}

// 계정 상세를 닫고 3분할 배치로 되돌립니다.
function agentSimBackFinal() {
  agentSimAcctPickedFinal = false;
  agentPaneStateMapFinal.budget = 'normal';
  if (typeof closeBudgetAccountEditor === 'function') closeBudgetAccountEditor();
  else { budgetSetupEditAccount = null; renderBudgetPage(); }
}

/* ── 6안 화면 ── */
function renderAgentSimViewFinal(viewData, data, projInfo, roll) {
  agentChatKeepBottomFinal();
  // 기본 화면은 언제나 전체 계정 현황입니다.
  //  · 딥링크(#/budget-adjust/outsource)로 들어와도 표부터 보여 줍니다.
  //  · 프로젝트가 바뀌면 다시 표로 되돌립니다.
  //  · 계정이 선택돼 있지 않은데 예산 칸이 전체폭으로 남아 있으면 3분할로 복구합니다.
  const pjNow = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  if (!agentSimEnteredFinal || agentSimPjtSeenFinal !== pjNow) {
    agentSimEnteredFinal = true;
    agentSimPjtSeenFinal = pjNow;
    agentSimAcctPickedFinal = false;
    agentPaneStateMapFinal.budget = 'normal';
  }
  // 사용자가 계정 행을 누른 게 아니라면(딥링크·라우팅으로 들어온 값) 전체 계정 표로 되돌립니다.
  if (budgetSetupEditAccount && !agentSimAcctPickedFinal) {
    budgetSetupEditAccount = null;
    if (typeof updateHashForScreen === 'function') updateHashForScreen('s-budget');
  }
  if (!budgetSetupEditAccount && agentPaneStateMapFinal.budget === 'full') {
    agentPaneStateMapFinal.budget = 'normal';
  }
  const acct = budgetSetupEditAccount;
  const body = acct
    ? `<div class="agsim-detail">
         <div class="agsim-detail-head">
           <button class="agsim-back" onclick="agentSimBackFinal()">← 전체 계정 표로</button>
           <b>${acct} 상세</b>
         </div>
         ${renderBudgetAccountEditor(viewData, acct)}
       </div>`
    : `${renderAgentSimBannerFinal()}
       ${renderAgentSimTableFinal(viewData, data, roll)}`;

  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell split agent-sim ${agentIsExecFinal() ? 'as-exec' : ''}">
      ${agentSimTopLineFinal(projInfo)}
      ${renderAgentPastNoticeFinal()}
      ${agentSimGridFinal(roll, body)}
      ${renderAgentHistLinkFinal()}
    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentReturnNoticeFinal()}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}

/* ==========================================================================
   12. [2026.08.28 위클리 피드백 반영] ⑤ 간소화 — 검토자 화면
       1) 예산관리는 Agent(= 이 시스템)가 수행합니다.
       2) PM은 검토자일 뿐입니다.
       3) 상세는 필요할 때 열어 보거나 Agent와 대화로 알아냅니다.
       4) 첫 화면에는 "무엇을 판단해야 하는가"만 남기고, 나머지는 전부 클릭 뒤로 숨깁니다.
   ========================================================================== */

var agentMiniOpenFinal = '';        // 펼쳐 본 제안 id (기본: 전부 접힘)
// 5안은 "첫 화면 최소"가 원칙이라, URL(#/budget-adjust/outsource)로 지정된 계정을 진입 시 한 번 비웁니다.
// 검토자가 [예산 현황 보기]에서 계정을 직접 누른 경우에만 하단에 내역이 열립니다.
var agentMiniEnteredFinal = false;

function agentMiniToggleFinal(id) {
  agentMiniOpenFinal = agentMiniOpenFinal === id ? '' : id;
  renderBudgetPage();
}
// 남은 제안을 한 번에 처리 — 검토자가 개별 확인 없이 일괄 결정할 때
// [#5] 일괄 처리도 반드시 결재선 지정 팝업을 거칩니다.
function agentMiniBulkFinal() {
  const pend = agentProposalsFinal('pending').map(p => p.id);
  const sel = agentSelectedFinal(pend);
  const targets = sel.length ? sel : pend;
  if (!targets.length) { showToast('기안할 항목이 없습니다.'); return; }
  agentOpenApprovalPopupFinal(targets);
}

/* ── 5안 목록 행 — PERSONA 에 따라 우측 액션이 달라집니다 ── */
// 이관 건은 합계가 ±0이라 "변동 없음"으로 읽힙니다. 계정별 증감을 그대로 보여줍니다.
function renderAgentDeltaCellFinal(p) {
  const legs = p.legs || [];
  if (legs.length > 1) {
    return `<em class="agm-delta multi">${legs.map(l => `
      <span class="agmd-leg"><i class="${agentAcctColorFinal(l.acct)}">${l.acct}</i>${agentDeltaFinal(l.delta)}</span>`).join('')}</em>`;
  }
  const d = agentNetFinal(p);
  return `<em class="agm-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}">${d === 0 ? '±0원' : agentDeltaFinal(d)}</em>`;
}

// 같은 계정에 수동 개입 항목이 함께 올라와 있는지 — 두 출처가 섞일 때만 배지를 붙입니다
function agentHasManualSiblingFinal(p) {
  return agentProposalsFinal('pending').some(x => x.manual && x.acct === p.acct);
}

function renderAgentMiniRowFinal(p, optLabel, optHint, optTitle) {
  const open = agentMiniOpenFinal === p.id;
  const delta = agentNetFinal(p);
  const exec = agentIsExecFinal();
  let right = '';
  if (p.status === 'pending') {
    right = exec
      ? '<span class="agm-done wait">PM 검토 중</span>'
      : p.manual
        ? `<div class="agm-yn">
             <button class="agm-n" title="편집을 취소하고 Agent 초안으로 되돌립니다"
               onclick="agentManualResetFinal('${p.acct}')">되돌리기</button>
             <button class="agm-manual" title="${p.acct} 편집 화면으로 이동합니다"
               onclick="agentGoManualFinal('${p.acct}')">✎ 계속 편집</button>
           </div>`
        : `<div class="agm-yn">
             <button class="agm-n" title="반려 — 확인 후 제안이 사라집니다" onclick="agentRejectAskOpenFinal('${p.id}')">N</button>
             <button class="agm-manual" title="예산 현황 보기에서 ${p.acct} 내역을 열어 직접 수정합니다"
               onclick="agentGoManualFinal('${p.acct}')">✎ 수동 개입</button>
           </div>`;
  } else if (p.status === 'submitted') {
    right = exec
      ? `<div class="agm-yn wide">
           <button class="agm-y" onclick="agentExecApproveFinal('${p.id}')">승인</button>
           <button class="agm-n" onclick="agentReturnToggleFinal('${p.id}')">반려</button>
         </div>`
      : `<span class="agm-done sub">결재 대기 · ${p.approver ? p.approver.title + ' ' + p.approver.name : ''}</span>`;
  } else if (p.status === 'confirmed') {
    right = '<span class="agm-done approved">승인 완료</span>';
  } else if (p.status === 'returned') {
    right = exec
      ? '<span class="agm-done returned">반려 · PM 재기안 대기</span>'
      : `<div class="agm-yn wide">
           <button class="agm-y" title="내용을 다시 확인하고 재상신" onclick="agentRedraftFinal('${p.id}')">재기안</button>
         </div>`;
  } else {
    right = '<span class="agm-done rejected">반려</span>';
  }
  return `
    <div class="agm-row ${open ? 'open' : ''} ${p.status} ${optLabel ? 'as-opt' : ''} ${(p.manual && !exec) ? 'is-manual' : ''}">
      <div class="agm-line">
        ${(!agentIsExecFinal() && p.status === 'pending') ? `
          <label class="agm-check" title="선택해서 함께 기안">
            <input type="checkbox" ${agentMiniSelFinal[p.id] ? 'checked' : ''} onchange="agentSelToggleFinal('${p.id}')">
          </label>` : ''}
        <button class="agm-open" onclick="agentMiniToggleFinal('${p.id}')" title="${open ? '접기' : '근거·상세 보기'}">
          ${optLabel
            ? `<span class="agm-opt">${optLabel}</span>`
            : `<span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>`}
          <b>${escHtml(optTitle || p.title)}</b>
          ${renderAgentDeltaCellFinal(p)}
          ${(p.manual && !exec) ? '<i class="agm-tag manual">✎ 수동 개입</i>'
            : (!p.manual && !exec && agentHasManualSiblingFinal(p)) ? '<i class="agm-tag agent">🤖 Agent 제안</i>' : ''}
          ${p.transfer ? '<i class="agm-tag">계정 간 이관</i>' : ''}
          ${p.urgent ? '<i class="agm-tag urgent">실적 초과</i>' : ''}
        </button>
        ${right}
        <button class="agm-caret-btn" onclick="agentMiniToggleFinal('${p.id}')"
          title="${open ? '접기' : '근거·상세 보기'}" aria-label="${open ? '접기' : '펼치기'}"
          aria-expanded="${open}">${open ? '∧' : '∨'}</button>
      </div>
      ${optHint ? `<div class="agm-opthint">${escHtml(optHint)}</div>` : ''}
      ${p.status === 'returned' && p.returnReason ? `
        <div class="agm-return">↩ 직책자 반려 — ${escHtml(p.returnReason)}<span>${p.returnedAt || ''}</span></div>` : ''}
      ${p.status === 'submitted' && p.draftNote ? `
        <div class="agm-draftnote">✎ 기안 의견 — ${escHtml(p.draftNote)}</div>` : ''}
      ${agentReturnOpenFinal === p.id ? `
        <div class="agm-returnbox">
          <b>반려 사유</b>
          <input id="agent-return-${p.id}" type="text" placeholder="예: 27년 조직 개편안 확정 후 다시 올려주세요"
            onkeydown="if(event.key==='Enter') agentExecReturnFinal('${p.id}')">
          <button onclick="agentExecReturnFinal('${p.id}')">반려하고 PM에게 반송</button>
        </div>` : ''}
      ${(agentIsExecFinal() && (p.status === 'submitted' || p.status === 'confirmed' || p.status === 'returned')) ? `
        <div class="agm-legs ${open ? 'open' : ''}" onclick="agentMiniToggleFinal('${p.id}')"
          title="${open ? '접기' : 'Agent 판단 근거와 상세 내역 보기'}">
          ${renderAgentLegsTableFinal(p, true)}
          <div class="agm-legs-more">${open ? '∧ 근거 접기' : '∨ 이 변경의 Agent 판단 근거·상세 보기'}</div>
        </div>` : ''}
      ${open ? `<div class="agp-body agm-detail">${agentIsExecFinal()
        ? renderAgentExecBodyFinal(p)
        : renderAgentProposalBodyFinal(p)}</div>` : ''}
    </div>`;
}

/* ── ⑤ 간소화 — PM / 직책자 두 화면 ── */
/* ── [2026.08.31] 5안은 다섯 항목을 같은 Depth 의 접이식 섹션으로 둡니다.
      해야 할 일 · 결재 이력 · 변경 이력 · Agent와 대화하기 · 예산 현황 보기
      (탭이 아니라 각각 자기 버튼을 갖고, 여러 개를 동시에 열 수 있습니다) ── */
var agentMiniSecFinal = { todo: true, chat: false, budget: false };

// 이력은 상위 화면에 두지 않습니다 — 필요할 때 하단 링크로 찾아 들어가 봅니다.
var agentHistPopFinal = '';         // '' | 'approval' | 'history'
function agentHistOpenFinal(k) { agentHistPopFinal = k; renderBudgetPage(); }
function agentHistCloseFinal() { agentHistPopFinal = ''; renderBudgetPage(); }
function renderAgentHistPopFinal() {
  if (!agentHistPopFinal) return '';
  const isApv = agentHistPopFinal === 'approval';
  const v = (typeof agentVerSelFinal === 'function') ? agentVerSelFinal() : null;
  if (v && !v.live) return renderAgentVerHistPopFinal(v, isApv);
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentHistCloseFinal()">
      <div class="agv-pop wide" role="dialog" aria-modal="true" aria-label="이력">
        <div class="agv-pop-head">
          <div class="agh-tabs">
            <button class="agh-tab ${isApv ? 'on' : ''}" onclick="agentHistOpenFinal('approval')">
              결재 이력${AGENT_APPROVAL_LOG_FINAL.length ? ` (${AGENT_APPROVAL_LOG_FINAL.length})` : ''}</button>
            <button class="agh-tab ${!isApv ? 'on' : ''}" onclick="agentHistOpenFinal('history')">
              변경 이력 (${AGENT_LOG_FINAL.length})</button>
          </div>
          <button class="agv-pop-x" onclick="agentHistCloseFinal()">✕</button>
        </div>
        <div class="agv-pop-body scroll">
          ${isApv ? renderAgentApprovalHistoryFinal() : renderAgentHistoryFinal()}
        </div>
      </div>
    </div>`;
}
function agentMiniSecToggleFinal(k) {
  agentMiniSecFinal[k] = !agentMiniSecFinal[k];
  renderBudgetPage();
}
function agentMiniSecOpenFinal(k) {
  agentMiniSecFinal[k] = true;
  renderBudgetPage();
}

// 다섯 항목이 모두 이 틀을 씁니다 — 아이콘 · 제목 · 배지 · 부제 · (우측 액션) · 펼침 표시
function renderAgentMiniSectionFinal(sec) {
  const open = !!agentMiniSecFinal[sec.key];
  return `
    <div class="agm-sec ${open ? 'open' : ''} sec-${sec.key}">
      <div class="agm-sec-head">
        <button class="agm-sec-btn" onclick="agentMiniSecToggleFinal('${sec.key}')"
          title="${open ? '접기' : '펼치기'}" aria-expanded="${open}">
          <span class="agm-sec-ic" aria-hidden="true">${sec.ic}</span>
          <b>${sec.title}</b>
          ${sec.badge ? `<em class="agm-sec-n ${sec.badgeMute ? 'mute' : ''}">${sec.badge}</em>` : ''}
          <span class="agm-sec-sub">${sec.sub || ''}</span>
        </button>
        ${open && sec.actions ? `<div class="agm-sec-acts">${sec.actions}</div>` : ''}
        <button class="agm-sec-caret" onclick="agentMiniSecToggleFinal('${sec.key}')"
          title="${open ? '접기' : '펼치기'}" aria-label="${open ? '접기' : '펼치기'}"
          aria-expanded="${open}">${open ? '∧' : '∨'}</button>
      </div>
      ${open ? `<div class="agm-sec-body">${sec.body}</div>` : ''}
    </div>`;
}

/* ── 각 섹션 본문 ── */
function renderAgentChatBodyFinal() {
  return `
    ${AGENT_CHAT_FINAL.map(d => `
      <div class="agc-msg ${d.who}">
        <span class="agc-who">${d.who === 'pm' ? '이봄(PM)' : 'Agent'}</span>
        <div class="agc-text ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
      </div>`).join('')}
    <div class="agpane-foot">
      <input id="agent-chat-input" type="text" placeholder="질문하거나, 편성 근거를 남겨 주세요 — 예: 테크노아이티는 4분기까지 동일한 견적으로 진행됩니다"
        onkeydown="if(event.key==='Enter') agentChatSendFinal()">
      <button onclick="agentChatSendFinal()">보내기</button>
    </div>`;
}

// [2026.09.01] 간소화 화면도 3분할 화면과 같은 구성을 씁니다 —
//   계정 레일(CP총액 칩 포함) + 선택한 계정 내역 / 미선택 시 전체 계정 현황.
function renderAgentBudgetBodyFinal(viewData, data, roll) {
  return renderAgentAccountRailFinal(viewData, data, roll);
}

/* [2026.09.03] 해야 할 일을 전체폭으로 키우면 5개 대계정 탭이 붙습니다.
   계정을 골라 그 자리에서 상세를 조회합니다(요구 3). */
var agentTodoAcctFinal = '';
function agentTodoAcctPickFinal(acct) {
  agentTodoAcctFinal = (agentTodoAcctFinal === acct) ? '' : acct;
  renderBudgetPage();
}

function renderAgentTodoAcctFinal() {
  const viewData = agentViewDataCacheFinal;
  const roll = agentRollCacheFinal;
  if (!viewData || !roll || !roll.rows || typeof renderAcctTile !== 'function') return '';
  const pend = agentProposalsFinal('pending');
  const total = roll.plan;
  const tiles = roll.rows.map(r => {
    const n = pend.filter(x => (x.legs || []).some(l => l.acct === r.acct)).length;
    return renderAcctTile({
      label: r.acct,
      value: r.plan,
      total: total,
      maxVal: 1,
      rate: r.plan > 0 ? (r.done / r.plan) * 100 : 0,
      rateTip: `집행률 = 실적/확정 ${fmt(r.done)}원 ÷ 수립 예산 ${fmt(r.plan)}원`
        + ` · CP한도 ${fmt(r.cp)}원` + (n ? ` · 대기 제안 ${n}건` : ''),
      active: agentTodoAcctFinal === r.acct,
      onclick: `agentTodoAcctPickFinal('${r.acct}')`,
    });
  }).join('');
  const body = agentTodoAcctFinal
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, agentTodoAcctFinal)}</div>`
    : '';
  return `
    <div class="agtd-acct">
      <div class="acct-tile-group">
        ${renderAcctTile({
          label: '프로젝트 총 실행 비용', value: total, isTotal: true,
          foot: `집행률 ${total > 0 ? Math.round((roll.done / total) * 1000) / 10 : 0}% · 실적/확정 ${fmt(roll.done)}원`,
          active: !agentTodoAcctFinal,
          onclick: `agentTodoAcctPickFinal('')` })}
        ${tiles}
      </div>
      ${body}
    </div>`;
}

/* ── ⑤ 간소화 — PM / 직책자 두 화면 ── */
function renderAgentMiniViewFinal(viewData, data, projInfo, roll) {
  if (!agentMiniEnteredFinal) {
    agentMiniEnteredFinal = true;
    const deepAcct = (location.hash || '').indexOf('/budget-adjust/') >= 0;
    if (budgetSetupEditAccount && !deepAcct) {
      budgetSetupEditAccount = null;
      if (typeof updateHashForScreen === 'function') updateHashForScreen('s-budget');
    }
  }
  const exec = agentIsExecFinal();
  const pend = agentByStatusFinal('pending');
  const subD = agentDraftsFinal('submitted');
  const retD = agentDraftsFinal('returned');
  // 직책자 반려로 [해야 할 일]로 되돌아온 건수
  const backCnt = pend.filter(p => p.returnReason).length;
  const confD = agentDraftsFinal('confirmed');

  // 결재 건수는 계정 수와 무관하게 기안 1건 = 1건으로 셉니다.
  const mineCnt = exec ? subD.length : pend.length + retD.length;
  const net = exec
    ? subD.reduce((t, d) => t + agentDraftNetFinal(d), 0)
    : pend.reduce((t, p) => t + agentNetFinal(p), 0) + retD.reduce((t, d) => t + agentDraftNetFinal(d), 0);
  const boxLabel = exec ? '결재할 일' : '해야 할 일';
  const selN = agentSelCountFinal(pend.map(x => x.id));        // 기안 건수(계정 기준)
  const selRaw = agentSelectedFinal(pend.map(x => x.id)).length; // 체크된 항목 수
  const past = (typeof agentVerIsPastFinal === 'function') && agentVerIsPastFinal();
  // 결재자는 "이 기안들이 CP를 얼마나 쓰는가"를 목록 머리에서 바로 봅니다
  const cpSub = agentTodoCpSubFinal(exec ? subD : null);

  const todoBody = mineCnt
    ? (exec
        ? subD.map(d => renderAgentDraftRowFinal(d, 'exec')).join('')
        : retD.map(d => renderAgentDraftRowFinal(d, 'pm')).join('') + renderAgentPendingListFinal(pend))
    : `<div class="ag-empty">${exec
        ? 'PM이 상신하면 여기에서 결재하실 수 있습니다.'
        : 'Agent가 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적을 계속 보고 있습니다.'}</div>`;

  const todoActions = (!exec && pend.length && !past) ? `
    <label class="agm-check all" title="전체 선택">
      <input type="checkbox" ${pend.length && selRaw === pend.length ? 'checked' : ''}
        onchange="agentSelAllFinal([${pend.map(x => `'${x.id}'`).join(',')}], this.checked)">
      <span>전체</span>
    </label>
    <button class="agm-box-draft" onclick="agentMiniBulkFinal()">${
      selN ? `선택 ${selN}건 기안 →` : '모두 제안대로 (Y)'}</button>` : '';

  const SECTIONS = [
    (typeof agentVerIsPastFinal === 'function' && agentVerIsPastFinal()) ? null : {
      key: 'todo', ic: exec ? '🧑‍💼' : '📌', title: boxLabel,
      badge: mineCnt || '', actions: todoActions,
      sub: mineCnt ? `${exec ? '기안 ' : ''}${mineCnt}건 · 합계 ${net === 0 ? '±0원' : agentDeltaFinal(net)}${cpSub}` : '처리할 항목 없음',
      body: `<div class="agm-list">${todoBody}</div>`,
    },
    {
      key: 'chat', ic: '💬', title: 'Agent와 대화하기',
      sub: '판단 근거를 묻거나, 앞으로의 계획을 남기면 Agent가 편성을 제안합니다',
      body: renderAgentChatBodyFinal(),
    },
    {
      key: 'budget', ic: '📊', title: '예산 현황 보기',
      sub: (() => {
        const ref = agentReflectFinal();
        return `수립 ${fmt(roll.plan)}원${ref.net ? ` → 반영 후 ${fmt(roll.plan + ref.net)}원` : ''}`
          + ` · 집행률 ${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}%`
          + ` · CP총액 여유 ${fmt(roll.cpRemain - ref.net)}원`;
      })(),
      body: renderAgentBudgetBodyFinal(viewData, data, roll),
    },
  ];

  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell mini ${exec ? 'as-exec' : ''}">
      ${projInfo}
      ${renderAgentVersionBarFinal()}
      ${renderAgentPastNoticeFinal()}

      <div class="agm-secs">
        ${SECTIONS.filter(Boolean).map(renderAgentMiniSectionFinal).join('')}
      </div>

      ${renderAgentHistLinkFinal()}

      ${(subD.length && !exec) || confD.length || backCnt ? `
        <div class="agm-donebar">
          <b>${[
            subD.length && !exec ? `결재 대기 기안 ${subD.length}건` : '',
            confD.length ? `승인 완료 기안 ${confD.length}건` : '',
            backCnt ? `반려 원복 ${backCnt}건 — 다시 검토가 필요합니다` : '',
          ].filter(Boolean).join(' · ')}</b>
          <button onclick="agentHistOpenFinal('approval')">결재 이력 보기 →</button>
        </div>` : ''}

    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentReturnNoticeFinal()}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}

/* ==========================================================================
   14. [2026.08.31] 결재선 · PERSONA(PM / 직책자) · 재기안
       흐름:  Agent 감지 → PM 검토(Y) → 결재선 지정 → 상신
              → 직책자 결재(승인/반려) → 반려면 PM 재기안
   ========================================================================== */

// 테스트 데이터 — 승인자는 1명입니다.
var AGENT_APPROVERS_FINAL = [
  { id: 'apv-1', name: '박정우', title: '담당임원', org: 'AX사업담당', limit: '전결 한도 5억원' },
];

var AGENT_PERSONAS_FINAL = {
  pm:   { key: 'pm',   name: '이봄',   role: 'PM',     desc: '검토자 — Agent 제안을 확인하고 결재 상신' },
  exec: { key: 'exec', name: '박정우', role: '직책자', desc: '승인자 — 상신된 건을 Agent에게 물어보고 결재' },
};
var agentPersonaFinal = 'pm';           // 'pm' | 'exec'
var agentApprovalPopupFinal = [];       // 결재선 지정 팝업 대상 제안 id 목록(복수 상신 지원)
var agentReturnOpenFinal = '';          // 반려 사유 입력이 열린 제안 id

function agentIsExecFinal() { return agentPersonaFinal === 'exec'; }
function agentMeFinal() { return AGENT_PERSONAS_FINAL[agentPersonaFinal]; }

function agentSetPersonaFinal(k) {
  agentPersonaFinal = k;
  agentMiniOpenFinal = '';
  agentApprovalPopupFinal = [];
  agentReturnOpenFinal = '';
  agentMiniSelFinal = {};
  showToast(`${AGENT_PERSONAS_FINAL[k].role} ${AGENT_PERSONAS_FINAL[k].name} 화면으로 전환했습니다.`);
  renderBudgetPage();
}

/* ── 상태별 목록 ── */
function agentCurPjtFinal() {
  if (typeof currentBudgetProj !== 'undefined' && currentBudgetProj) return currentBudgetProj;
  if (typeof MOCK_PJT !== 'undefined' && MOCK_PJT) return MOCK_PJT.key;
  return '';
}
function agentInCurPjtFinal(p) {
  const cur = agentCurPjtFinal();
  if (!cur) return true;
  const own = p.pjt || (typeof MOCK_PJT !== 'undefined' && MOCK_PJT ? MOCK_PJT.key : cur);
  return own === cur;
}
// agentProposalsFinal 에는 PJT 필터가 걸려 있을 수 있으므로 그대로 위임합니다.
function agentByStatusFinal(st) {
  return agentProposalsFinal(st);
}

/* ── [#2][#3] PM: Y → 결재선 지정 팝업 → 상신 ── */
function agentOpenApprovalPopupFinal(ids) {
  const list = Array.isArray(ids) ? ids.slice() : [ids];
  const conflicts = agentExConflictsFinal(list);
  if (conflicts.length) {
    const c = conflicts[0];
    agentExAlertFinal = c.g.key;
    agentExOpenFinal[c.g.key] = true;   // 해제하러 들어온 김에 계속 펼쳐 둡니다
    c.g.ids.forEach(x => { if (list.indexOf(x) >= 0) agentMiniSelFinal[x] = true; });
    showToast(`${c.g.acct} 부족은 1안·2안 중 하나만 기안할 수 있습니다. 둘 중 하나의 체크를 해제해 주세요.`);
    renderBudgetPage();
    return;
  }
  agentExAlertFinal = '';
  agentApprovalPopupFinal = list;
  renderBudgetPage();
}
function agentCloseApprovalPopupFinal() { agentApprovalPopupFinal = []; renderBudgetPage(); }

function agentSubmitApprovalFinal(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(agentFindProposalFinal).filter(Boolean);
  if (!list.length) return;
  const sel = document.querySelector('input[name="agent-approver"]:checked');
  const apv = AGENT_APPROVERS_FINAL.find(a => a.id === (sel ? sel.value : '')) || AGENT_APPROVERS_FINAL[0];
  const noteEl = document.getElementById('agent-draft-note');
  const note = noteEl ? noteEl.value.trim() : '';
  agentDraftSeqFinal += 1;
  const did = 'dr-' + agentDraftSeqFinal;
  const dno = 'D' + String(agentDraftSeqFinal).padStart(3, '0');
  list.forEach(p => {
    p.status = 'submitted';
    p.draftId = did;
    p.draftNo = dno;
    p.approver = apv;
    p.submittedAt = '2026-08-31 10:20';
    p.draftNote = note;
    p.returnReason = '';
    p.returnedAt = null;
    p.returnedFrom = null;
    agentMiniSelFinal[p.id] = false;
    AGENT_LOG_FINAL.unshift({
      at: p.submittedAt, acct: p.acct, actor: '이봄(PM)', decision: 'approved',
      from: p.from, to: p.to,
      reason: `결재 상신 — ${apv.title} ${apv.name}` + (note ? ` · 기안의견: ${note}` : ''),
      dialog: (p.dialog || []).slice(),
    });
    agentApprovalLogFinal(p, 'submitted', '이봄(PM)', `${apv.title} ${apv.name}에게 상신` + (note ? ` · ${note}` : ''));
  });
  agentApprovalPopupFinal = [];
  showToast(list.length === 1
    ? `${list[0].acct} 건을 ${apv.title} ${apv.name}에게 상신했습니다.`
    : `${list.length}건을 ${apv.title} ${apv.name}에게 함께 상신했습니다.`);
  renderBudgetPage();
}

/* ── [#4] 직책자: Agent에게 묻고 승인/반려 ── */
function agentExecApproveFinal(id) {
  const p = agentFindProposalFinal(id);
  if (!p) return;
  p.status = 'confirmed';
  p.decidedAt = '2026-08-31 10:35';
  AGENT_LOG_FINAL.unshift({
    at: p.decidedAt, acct: p.acct, actor: `${agentMeFinal().name}(${agentMeFinal().role})`, decision: 'approved',
    from: p.from, to: p.to, reason: '직책자 승인 — ' + p.title, dialog: (p.dialog || []).slice(),
  });
  agentApprovalLogFinal(p, 'confirmed', `${agentMeFinal().name}(${agentMeFinal().role})`, '승인 — 예산 반영');
  showToast(`${p.acct} 건을 승인했습니다. 예산에 반영됩니다.`);
  renderBudgetPage();
}
function agentReturnToggleFinal(id) {
  agentReturnOpenFinal = agentReturnOpenFinal === id ? '' : id;
  renderBudgetPage();
}
/* ── [#6] 반려 → PM 재기안 가능 상태 ── */
function agentExecReturnFinal(id) {
  const p = agentFindProposalFinal(id);
  if (!p) return;
  const el = document.getElementById('agent-return-' + id);
  const reason = el ? el.value.trim() : '';
  if (!reason) { showToast('반려 사유를 입력해 주세요. PM이 재기안할 때 근거가 됩니다.'); return; }
  p.status = 'returned';
  p.returnReason = reason;
  p.returnedAt = '2026-08-31 10:35';
  AGENT_LOG_FINAL.unshift({
    at: p.returnedAt, acct: p.acct, actor: `${agentMeFinal().name}(${agentMeFinal().role})`, decision: 'rejected',
    from: p.from, to: p.to, reason: '직책자 반려 — ' + reason,
    dialog: [{ who: 'agent', text: `반려 사유를 기록했습니다. PM이 재기안할 수 있는 상태로 되돌렸습니다: ${reason}` }],
  });
  agentApprovalLogFinal(p, 'returned', `${agentMeFinal().name}(${agentMeFinal().role})`, reason);
  agentReturnOpenFinal = '';
  showToast(`${p.acct} 건을 반려했습니다. PM이 재기안할 수 있습니다.`);
  renderBudgetPage();
}
function agentRedraftFinal(id) {
  const p = agentFindProposalFinal(id);
  if (!p) return;
  p.status = 'pending';
  p.approver = null;
  agentApprovalLogFinal(p, 'redraft', '이봄(PM)', '반려 건 재기안');
  showToast(`${p.acct} 건을 재기안 상태로 되돌렸습니다. 내용을 확인하고 다시 상신하세요.`);
  renderBudgetPage();
}

/* [2026.09.03] CP총액 대비 영향 ────────────────────────────────────────────
   결재선 지정 팝업과 결재자 화면에서 "이 기안이 CP를 얼마나 쓰는가"를 같은 모양으로 봅니다.
   · 총액 기준 : 수립 예산 변경 전/후 · CP총액 소진율 · 남는 여유
   · 계정 기준 : 계정별 CP 한도 대비 소진율 (계정 단위 초과는 허용, 합계 초과는 불가)
   roll 은 화면이 그려질 때마다 renderBudgetSetupOverview 에서 캐시해 둡니다. */
var agentRollCacheFinal = null;

function agentCpMapFinal() {
  const roll = agentRollCacheFinal;
  const m = {};
  if (roll && roll.rows) roll.rows.forEach(r => { m[r.acct] = r.cp || 0; });
  return m;
}

// legs(계정별 변경 전/후) → CP 영향 요약
function agentCpImpactFinal(legs) {
  const roll = agentRollCacheFinal;
  const rows = legs || [];
  const net = rows.reduce((t, e) => t + (e.delta || 0), 0);
  const cp = roll ? roll.cp : 0;
  const before = roll ? roll.plan : rows.reduce((t, e) => t + (e.from || 0), 0);
  const after = before + net;
  const pct = v => (cp > 0 ? (v / cp) * 100 : 0);
  const cpm = agentCpMapFinal();
  // 계정 한도를 넘는 계정 — 반올림 오차(1,000원 미만)는 초과로 보지 않습니다
  const overs = rows
    .filter(e => cpm[e.acct] && e.to - cpm[e.acct] >= 1000)
    .map(e => ({ acct: e.acct, cp: cpm[e.acct], to: e.to, over: e.to - cpm[e.acct] }));
  return {
    cp, net, before, after, cpm,
    remainBefore: cp - before,
    remainAfter: cp - after,
    pctBefore: pct(before), pctAfter: pct(after), pctNet: pct(net),
    overTotal: cp > 0 && after - cp >= 1000,
    overs,
  };
}

// 계정 한 줄의 CP 한도 대비 소진율 — 결재자 표의 오른쪽 두 칸에 씁니다
function agentCpAcctPctFinal(e, cpm) {
  const cap = (cpm || agentCpMapFinal())[e.acct] || 0;
  if (!cap) return null;
  return {
    cap,
    before: (e.from / cap) * 100,
    after: (e.to / cap) * 100,
    over: e.to - cap >= 1000,
    overBy: e.to - cap,
  };
}

function agentPctFinal(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }
function agentPpFinal(v) {
  const n = Math.round(v * 10) / 10;
  return (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toFixed(1) + '%p';
}

/* CP 영향 블록 — 팝업과 결재자 화면이 같은 것을 씁니다 */
function renderAgentCpImpactFinal(legs, opt) {
  const c = agentCpImpactFinal(legs);
  if (!c.cp) return '';
  const o = opt || {};
  const clamp = v => Math.max(0, Math.min(100, v));
  const base = clamp(Math.min(c.pctBefore, c.pctAfter));
  const seg = clamp(Math.abs(c.pctAfter - c.pctBefore));
  // CP총액은 애초에 초과할 수 없으므로 "한도 안"이라는 안내는 두지 않습니다.
  // 남기는 것은 ① 이관이라 총액이 안 바뀐다는 설명 ② 만에 하나 초과했을 때의 경고뿐입니다.
  const note = c.overTotal
    ? `⚠ 승인하면 수립 예산이 CP총액을 ${fmt(-c.remainAfter)}원 초과합니다. CP총액은 선행 시스템 승인 한도라 합계 초과는 처리할 수 없습니다.`
    : c.net === 0
      ? '계정 간 이관이라 CP총액 소진율은 그대로입니다. 계정별 배분만 바뀝니다.'
      : '';
  return `
    <div class="agcpd ${c.overTotal ? 'over' : ''} ${o.compact ? 'compact' : ''}">
      <div class="agcpd-t">
        <b>${o.title || 'CP총액 대비 이 기안의 영향'}</b>
        <span>CP총액 ${fmt(c.cp)}원</span>
      </div>
      <ul class="agcpd-kv">
        <li>
          <span>수립 예산</span>
          <b>${fmt(c.before)}원 <i>→</i> ${fmt(c.after)}원</b>
          <em class="${c.net > 0 ? 'up' : c.net < 0 ? 'down' : 'zero'}">${c.net === 0 ? '±0원' : agentDeltaFinal(c.net)}</em>
        </li>
        <li>
          <span>CP총액 소진율</span>
          <b>${agentPctFinal(c.pctBefore)} <i>→</i> ${agentPctFinal(c.pctAfter)}</b>
          <em class="${c.pctNet > 0 ? 'up' : c.pctNet < 0 ? 'down' : 'zero'}">${agentPpFinal(c.pctNet)}</em>
        </li>
        <li>
          <span>CP총액 여유</span>
          <b>${fmt(c.remainBefore)}원 <i>→</i> ${fmt(Math.abs(c.remainAfter))}원${c.remainAfter < 0 ? ' 초과' : ''}</b>
          <em class="${c.remainAfter < 0 ? 'up' : 'zero'}">${c.remainAfter < 0 ? '한도 초과' : '한도 내'}</em>
        </li>
      </ul>
      <div class="agcpd-bar" aria-hidden="true">
        <i style="width:${base}%"></i>
        <u class="${c.net > 0 ? 'up' : 'down'}" style="width:${seg}%"></u>
      </div>
      ${note ? `<p class="agcpd-note">${note}</p>` : ''}
      ${c.overs.length ? `
        <p class="agcpd-acct">
          ⚠ 계정 한도 초과 — ${c.overs.map(x =>
            `<b>${x.acct}</b> ${fmt(x.to)}원 (한도 ${fmt(x.cp)}원 · ${agentDeltaFinal(x.over)})`).join(' · ')}
          <i>계정 단위 초과는 허용되며, 전 계정 합계가 CP총액을 넘지 않으면 결재할 수 있습니다.</i>
        </p>` : ''}
    </div>`;
}

// 결재할 일 머리 — 상신된 기안 전부를 승인했을 때의 CP총액 소진율
function agentTodoCpSubFinal(drafts) {
  if (!drafts || !drafts.length) return '';
  const legs = agentAggregateLegsFinal(drafts.reduce((a, d) => a.concat(d.items), []));
  const c = agentCpImpactFinal(legs);
  if (!c.cp) return '';
  return ` · CP총액 대비 ${agentPctFinal(c.pctBefore)} → ${agentPctFinal(c.pctAfter)}`
    + (c.overTotal ? ' (한도 초과)' : '');
}

/* ── 결재선 지정 팝업 ── */
function renderAgentApprovalPopupFinal() {
  const list = agentApprovalPopupFinal.map(agentFindProposalFinal).filter(Boolean);
  if (!list.length) return '';
  const net = list.reduce((t, x) => t + agentNetFinal(x), 0);
  const legs = agentAggregateLegsFinal(list);
  const imp = agentCpImpactFinal(legs);   // 합계 행과 CP 블록이 같은 값을 씁니다
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentCloseApprovalPopupFinal()">
      <div class="agv-pop" role="dialog" aria-modal="true" aria-label="결재선 지정">
        <div class="agv-pop-head">
          <div>
            <strong>결재선 지정</strong>
            <span>${list.length > 1 ? `선택한 ${list.length}건을 한 번에 상신합니다.` : '검토 완료한 건을 직책자에게 상신합니다.'}</span>
          </div>
          <button class="agv-pop-x" onclick="agentCloseApprovalPopupFinal()">✕</button>
        </div>
        <div class="agv-pop-body">
          <table class="agv-legs">
            <thead><tr><th>계정</th><th class="num">변경 전</th><th class="num">변경 후</th><th class="num">증감</th></tr></thead>
            <tbody>${legs.map(e => `
              <tr>
                <td><span class="agp-acct sm ${agentAcctColorFinal(e.acct)}">${e.acct}</span></td>
                <td class="num">${fmt(e.from)}</td>
                <td class="num to">${fmt(e.to)}</td>
                <td class="num ${e.delta > 0 ? 'up' : e.delta < 0 ? 'down' : ''}">${e.delta === 0 ? '±0원' : agentDeltaFinal(e.delta)}</td>
              </tr>`).join('')}</tbody>
          </table>
          ${renderAgentCpImpactFinal(legs)}
          <div class="agv-line">
            <div class="agv-node me">
              <span>기안자</span><b>이봄</b><em>PM</em>
            </div>
            <i class="agv-arrow">→</i>
            <div class="agv-node">
              <span>승인자</span><b>${AGENT_APPROVERS_FINAL[0].name}</b><em>${AGENT_APPROVERS_FINAL[0].title}</em>
            </div>
          </div>
          <div class="agv-pick">
            <b>승인자 선택</b>
            ${AGENT_APPROVERS_FINAL.map((a, i) => `
              <label class="agv-apv">
                <input type="radio" name="agent-approver" value="${a.id}" ${i === 0 ? 'checked' : ''}>
                <span class="agv-apv-txt"><b>${a.name}</b> ${a.title}<em>${a.org} · ${a.limit}</em></span>
              </label>`).join('')}
          </div>
          <div class="agv-note">
            <b>기안 의견 <i>(선택)</i></b>
            <textarea id="agent-draft-note" rows="2" placeholder="예: Agent 제안대로 진행합니다. 3분기 계약 일정상 이번 주 결재가 필요합니다."></textarea>
          </div>
          <p class="agv-hint">🤖 Agent가 판단 근거와 PM 대화 내용을 기안서에 함께 첨부합니다.</p>
        </div>
        <div class="agv-pop-foot">
          <button class="agv-cancel" onclick="agentCloseApprovalPopupFinal()">취소</button>
          <button class="agv-submit" onclick='agentSubmitApprovalFinal(${JSON.stringify(list.map(x => x.id))})'>${list.length > 1 ? list.length + '건 함께 ' : ''}결재 상신 →</button>
        </div>
      </div>
    </div>`;
}

/* ── PERSONA 전환 ── */
function renderAgentPersonaSwitchFinal() {
  const chip = k => {
    const p = AGENT_PERSONAS_FINAL[k];
    const on = agentPersonaFinal === k;
    const n = k === 'pm'
      ? agentByStatusFinal('pending').length + agentDraftsFinal('returned').length
      : agentDraftsFinal('submitted').length;
    return `
      <button class="agpsn ${on ? 'on' : ''}" onclick="agentSetPersonaFinal('${k}')" title="${p.desc}">
        <span class="agpsn-role">${p.role}</span>
        <b>${p.name}</b>
        ${n ? `<em class="agpsn-n">${n}</em>` : ''}
      </button>`;
  };
  return `
    <div class="agent-persona">
      <span class="agpsn-k">PERSONA</span>
      ${chip('pm')}${chip('exec')}
    </div>`;
}

/* ==========================================================================
   15. [2026.08.31] 제안 금액을 상세 내역과 동기화 · 결재 이력 · 직책자용 축약 상세
   ========================================================================== */

// 매 렌더 첫머리에서 호출 — 변경 전 금액을 계정별 실제 수립 예산에서 다시 읽어옵니다.
// 하드코딩이 없으므로 상세 내역(계정별 예산내역/현황)과 숫자가 항상 일치합니다.
function agentSyncProposalsFinal(roll) {
  const plan = {};
  roll.rows.forEach(r => { plan[r.acct] = r.plan; });
  AGENT_PROPOSALS_FINAL.forEach(p => {
    (p.legs || []).forEach(l => {
      l.from = plan[l.acct] || 0;
      l.to = l.from + l.delta;
    });
    const main = (p.legs && p.legs[0]) || { from: 0, to: 0, delta: 0 };
    p.from = main.from;
    p.to = main.to;
    p.net = (p.legs || []).reduce((t, l) => t + l.delta, 0);
  });
}
function agentNetFinal(p) { return (p.legs || []).reduce((t, l) => t + l.delta, 0); }

/* ── [2026.09.01] 서로 배타인 제안 ─────────────────────────────────────
   같은 부족을 다른 방법으로 메우는 제안은 함께 처리하면 과다 증액이 됩니다.
   외주비 부족을 ①CP 여유로 증액 ②재료비 여유분 이관 두 가지로 풀 수 있는데,
   둘 다 승인하면 외주비가 30,000,000원 늘어 필요한 것보다 많아집니다. */
var AGENT_EXCLUSIVE_FINAL = [
  {
    key: 'ex-outsource', acct: '외주비', ids: ['ap-03', 'ap-05'],
    problem: '현재 예산으로는 4분기 확정 견적대로 구매할 수 없습니다',
    detected: '부족액 10,000,000원',
    // 1안·2안이 공유하는 감지 근거 — 무엇을 보고 알았는지가 방법 선택보다 먼저입니다.
    source: {
      main: '견적확정 I/F 수신 (실시간)',
      ifAt: '2026-08-27 09:05',
      ifFrom: '구매시스템 → 예산관리 Agent',
      ifBody: '아크로디자인랩 30,000,000원 · 계약기간 2026-10-01 ~ 12-31',
      judgedAt: '2026-08-27 09:12',
      facts: [
        '해당 외주구매 계획 라인 12,000,000원 + 업체 미계획 잔액 8,000,000원 = 가용 20,000,000원',
        '확정 견적 30,000,000원 − 가용 20,000,000원 = 부족액 10,000,000원',
      ],
      alt: '견적이 오기 전이라도 4분기 마감 물량을 전제하면 같은 결론이 나옵니다 — 아크로디자인랩 1~3분기 PO 평균 계약액 15,000,000원에 과거 3개 프로젝트의 4분기 산출물 검수 증가분(평균 +95%)을 반영하면 약 29,000,000원으로, 계획 20,000,000원 대비 약 9,000,000원 부족이 예상됩니다. Agent는 견적이 확정되면 실제 값으로 다시 계산합니다.',
    },
    why: '두 방법 모두 외주비를 10,000,000원 늘립니다 — 다른 것은 그 돈을 어디서 가져오는지입니다. 함께 기안하면 20,000,000원이 늘어 필요한 금액의 두 배가 되니, 하나만 남기고 체크를 해제해 주세요.',
    titles: {
      'ap-03': 'CP 여유에서 외주비 10,000,000원을 증액합니다',
      'ap-05': '재료비에서 외주비로 10,000,000원을 이관합니다 (총액 변동 없음)',
    },
    options: {
      'ap-03': 'CP 여유에서 씁니다. 재료비는 그대로 두고 전체 수립 예산이 10,000,000원 늘어납니다.',
      'ap-05': '집행률이 낮은 재료비에서 옮겨 옵니다. 전체 수립 예산은 그대로이고 CP 여유도 줄지 않습니다.',
    },
  },
];
function agentExGroupFinal(id) {
  return AGENT_EXCLUSIVE_FINAL.find(g => g.ids.indexOf(id) >= 0) || null;
}
function agentExPartnersFinal(id) {
  const g = agentExGroupFinal(id);
  return g ? g.ids.filter(x => x !== id) : [];
}
// 목록에 함께 떠 있는(검토 대기) 상대만 실제 충돌입니다.
function agentExLivePartnersFinal(id) {
  return agentExPartnersFinal(id).filter(x => {
    const q = agentFindProposalFinal(x);
    return q && q.status === 'pending';
  });
}
// 여러 건을 한 번에 처리할 때 배타 그룹당 앞선 1건만 남깁니다.
/* 검토 대기 목록 — 배타 그룹은 "문제 한 줄 + 1안/2안" 한 덩어리로 내려갑니다. */
function renderAgentPendingListFinal(list) {
  const done = {};
  return list.map(p => {
    const g = agentExGroupFinal(p.id);
    if (!g) return renderAgentMiniRowFinal(p);
    if (done[g.key]) return '';
    const members = g.ids.map(id => list.find(x => x.id === id)).filter(Boolean);
    if (members.length < 2) return renderAgentMiniRowFinal(p);
    done[g.key] = true;
    return renderAgentExGroupFinal(g, members);
  }).join('');
}

// 감지 소스 — I/F 수신 시각과 그때 받은 값을 그대로 보여줍니다.
function renderAgentExSourceFinal(src) {
  return `
    <div class="agex-src">
      <div class="agex-src-row">
        <span class="agex-src-k">감지 소스</span>
        <div class="agex-src-v">
          <b>${escHtml(src.main)}</b>
          <span class="agex-src-if">
            <i>I/F 수신 ${escHtml(src.ifAt)}</i> · ${escHtml(src.ifFrom)} · ${escHtml(src.ifBody)}
          </span>
          ${(src.facts || []).map(f => `<span class="agex-src-fact">· ${escHtml(f)}</span>`).join('')}
          <span class="agex-src-judge">Agent 판단 ${escHtml(src.judgedAt)}</span>
        </div>
      </div>
      ${src.alt ? `
        <div class="agex-src-row alt">
          <span class="agex-src-k alt">추세 기반 대안</span>
          <div class="agex-src-v"><span class="agex-src-alt">${escHtml(src.alt)}</span></div>
        </div>` : ''}
    </div>`;
}

// 다른 항목처럼 접었다 펼 수 있습니다. 기본은 접힘, 택1 경고가 뜨면 자동으로 펼칩니다.
var agentExOpenFinal = {};
function agentExToggleFinal(key) {
  agentExOpenFinal[key] = !agentExOpenFinal[key];
  renderBudgetPage();
}
function renderAgentExGroupFinal(g, members) {
  const alert = agentExAlertFinal === g.key;
  const selN = members.filter(m => agentMiniSelFinal[m.id]).length;
  const open = !!agentExOpenFinal[g.key] || alert;
  return `
    <div class="agex-group ${alert ? 'alert' : ''} ${open ? 'open' : ''}">
      <div class="agex-glead">
        ${!agentIsExecFinal() ? `
          <label class="agm-check" title="이 항목을 기안에 담습니다 (1안·2안 중 하나를 골라야 합니다)">
            <input type="checkbox" ${agentExSelStateFinal(g).on ? 'checked' : ''}
              onchange="agentExToggleSelFinal('${g.key}')">
          </label>` : ''}
        <button class="agex-gopen" onclick="agentExToggleFinal('${g.key}')"
          title="${open ? '접기' : '감지 근거와 방법 2개 보기'}" aria-expanded="${open}">
          <span class="agp-acct sm ${agentAcctColorFinal(g.acct)}">${g.acct}</span>
          <div class="agex-gtitle">
            <b>${escHtml(g.problem)}</b>
            <span>${escHtml(g.detected)}${open ? '' : ' · 방법 ' + members.length + '개'}</span>
          </div>
          ${selN ? `<i class="agm-tag ${selN > 1 ? 'urgent' : ''}">${selN > 1 ? selN + '개 선택' : (members.findIndex(m => agentMiniSelFinal[m.id]) + 1) + '안 선택'}</i>` : ''}
          <i class="agm-tag pick1">택1</i>
          <i class="agm-caret">${open ? '∧' : '∨'}</i>
        </button>
      </div>
      ${(!open && (alert || selN > 1)) ? `
        <div class="agex-warn">1안·2안이 모두 선택되어 있습니다. 펼쳐서 하나만 남겨 주세요.</div>` : ''}
      ${open ? `
        ${g.source ? renderAgentExSourceFinal(g.source) : ''}
        <p class="agex-gwhy">${escHtml(g.why)}</p>
        ${alert ? `
          <div class="agex-alert">
            ⚠ 1안과 2안이 모두 선택되어 있습니다. 기안하려면 <b>하나의 체크를 해제</b>해 주세요.
          </div>` : (selN > 1 ? `
          <div class="agex-warn">1안·2안이 모두 선택되어 있습니다. 기안 전에 하나만 남겨 주세요.</div>` : '')}
        <div class="agex-opts">
          ${members.map((m, i) => renderAgentMiniRowFinal(m, (i + 1) + '안', g.options[m.id], (g.titles || {})[m.id])).join('')}
        </div>` : ''}
    </div>`;
}

// 함께 기안할 수 없는 조합이 담겼는지 검사합니다. 자동으로 빼지 않습니다.
var agentExAlertFinal = '';        // 경고를 띄울 그룹 key
function agentExConflictsFinal(ids) {
  return AGENT_EXCLUSIVE_FINAL
    .map(g => ({ g, hit: g.ids.filter(x => ids.indexOf(x) >= 0) }))
    .filter(x => x.hit.length > 1);
}


/* ── [#3] 계정별 변경 전 / 변경 후 표 — 직책자가 가장 먼저 봐야 하는 것 ── */
function renderAgentLegsTableFinal(p, compact) {
  const net = agentNetFinal(p);
  return `
    <table class="agleg ${compact ? 'compact' : ''}">
      <thead><tr><th>계정</th><th class="num">변경 전</th><th></th><th class="num">변경 후</th><th class="num">증감</th></tr></thead>
      <tbody>${(p.legs || []).map(l => `
        <tr>
          <td><span class="agp-acct sm ${agentAcctColorFinal(l.acct)}">${l.acct}</span></td>
          <td class="num">${fmt(l.from)}</td>
          <td class="agleg-ar">→</td>
          <td class="num to">${fmt(l.to)}</td>
          <td class="num ${l.delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(l.delta)}</td>
        </tr>`).join('')}</tbody>
      <tfoot>
        <tr class="${net === 0 ? 'zero' : ''}">
          <td>합계</td><td class="num"></td><td></td><td class="num"></td>
          <td class="num ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${net === 0 ? '±0원' : agentDeltaFinal(net)}</td>
        </tr>
      </tfoot>
    </table>
    ${net === 0 ? `
      <div class="agleg-zero">
        <b>총액 변동 없음 (±0원)</b>
        <span>계정 간 이관입니다. 프로젝트 총 실행 비용과 CP총액은 그대로이고, 계정별 배분만 바뀝니다.</span>
      </div>` : ''}`;
}

/* ── [#5] 직책자용 축약 상세 — 월별 내역·인력표는 빼고, 궁금하면 Agent에게 묻습니다 ── */
function renderAgentExecBodyFinal(p) {
  return `
    <div class="agexec-body">
      <div class="agexec-why">
        <b>🤖 Agent 판단 근거</b>
        ${renderAgentBasisFinal(p)}
        <p>${escHtml(p.why)}</p>
      </div>
      ${renderAgentEvidenceExtraFinal(p)}
      <div class="agexec-impact"><b>영향</b><span>${escHtml(p.impact)}</span></div>
      ${p.draftNote ? `<div class="agexec-note"><b>PM 기안 의견</b><span>${escHtml(p.draftNote)}</span></div>` : ''}
      ${renderAgentDialogFinal(p.dialog, true)}
      <div class="agp-ask">
        <input id="agent-ask-${p.id}" type="text" placeholder="Agent에게 물어보세요 — 예: 월별로 어떻게 나눠 쓰나요? 왜 재료비에서 옮기나요?"
          onkeydown="if(event.key==='Enter') agentAskFinal('${p.id}')">
        <button class="agp-ask-btn" onclick="agentAskFinal('${p.id}')">질문</button>
      </div>
      <p class="agexec-hint">※ 월별 상세는 이 화면에 두지 않았습니다. 필요하시면 위에서 Agent에게 물어보세요.</p>
    </div>`;
}

/* ── [#2] 결재 이력 ── */
var AGENT_APPROVAL_LOG_FINAL = [];
function agentApprovalLogFinal(p, act, actor, memo) {
  AGENT_APPROVAL_LOG_FINAL.unshift({
    at: '2026-08-31 10:20', acct: p.acct, title: p.title, act, actor, memo: memo || '',
    net: agentNetFinal(p), legs: (p.legs || []).map(l => ({ acct: l.acct, from: l.from, to: l.to, delta: l.delta })),
  });
}
function renderAgentApprovalHistoryFinal() {
  const ACT = {
    submitted: { label: '상신', cls: 'sub' },
    confirmed: { label: '승인', cls: 'ok' },
    returned: { label: '반려', cls: 'bad' },
    redraft: { label: '재기안', cls: 'redraft' },
  };
  if (!AGENT_APPROVAL_LOG_FINAL.length) {
    return `<div class="ag-empty">아직 결재 이력이 없습니다. PM이 상신하면 여기에 쌓입니다.</div>`;
  }
  return `
    <div class="agm-list plain">
      ${AGENT_APPROVAL_LOG_FINAL.map(r => `
        <div class="agapl ${ACT[r.act].cls}">
          <div class="agapl-head">
            <em class="agapl-act ${ACT[r.act].cls}">${ACT[r.act].label}</em>
            <span class="agp-acct sm ${agentAcctColorFinal(r.acct)}">${r.acct}</span>
            <b>${escHtml(r.title)}</b>
            <i class="agapl-net ${r.net > 0 ? 'up' : r.net < 0 ? 'down' : ''}">${r.net === 0 ? '±0원' : agentDeltaFinal(r.net)}</i>
          </div>
          <div class="agapl-meta">${r.at} · ${escHtml(r.actor)}${r.memo ? ' · ' + escHtml(r.memo) : ''}</div>
          <div class="agapl-legs">${r.legs.map(l =>
            `<span>${l.acct} ${fmt(l.from)} → <b>${fmt(l.to)}</b></span>`).join('')}</div>
        </div>`).join('')}
    </div>`;
}

/* ==========================================================================
   16. [2026.08.31] 근거 보강 블록 · 선택 기안 · 복수 상신
   ========================================================================== */

/* [2026.09.02] 직책자가 PM에게 묻지 않고 스스로 확인할 수 있게, 제안의 근거를 모두 펼칩니다.
   감지 소스 · 구매 품목 · 산출 내역 · 인력표 · 월별 배분까지 한자리에 둡니다. */
function renderAgentExecEvidenceFinal(pid) {
  const p = agentFindProposalFinal(pid);
  if (!p) return '';
  let html = '';
  if (p.source) html += renderAgentExSourceFinal(p.source);
  else if (p.basis) html += renderAgentBasisFinal(p);
  if (p.evidence && p.evidence.length) {
    html += `<ul class="agp-ev">${p.evidence.map(e => `<li>${escHtml(e)}</li>`).join('')}</ul>`;
  }
  if (p.persons) {
    html += `
      <div class="agp-block">
        <b>SCM 확정 인력</b>
        <table class="agent-person-table">
          <thead><tr><th>인력</th><th>등급</th><th class="num">MM</th><th>투입기간</th><th class="num">단가</th><th class="num">금액</th></tr></thead>
          <tbody>${p.persons.map(m => `
            <tr><td><b>${m.name}</b></td><td>${m.grade}</td><td class="num">${m.mm.toFixed(1)}</td>
            <td>${m.period}</td><td class="num">${fmt(m.unit)}</td><td class="num"><b>${fmt(m.amount)}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }
  html += renderAgentEvidenceExtraFinal(p);
  if (p.monthly && p.monthly.length) {
    html += `<div class="agp-months exec">${p.monthly.map(m => `<em>${m.m} ${agentDeltaFinal(m.delta)}</em>`).join('')}</div>`;
  }
  if (p.impact) html += `<p class="agleg-impact"><b>영향</b> ${escHtml(p.impact)}</p>`;
  return html;
}

// PM이 수동 개입한 계정이면 그 근거를 함께 보여 줍니다.
function renderAgentManualReasonFinal(acct) {
  const r = agentManualReasonFinal[acct];
  if (!r) return '';
  return `
    <div class="agexec-note manual">
      <b>✎ PM 수동 개입 근거</b>
      <span>${escHtml(r.text)}<i>${escHtml(r.at)} · ${escHtml(r.by)}</i></span>
    </div>`;
}

// 제안별 추가 근거 — 감지 소스(basis) / 구매 품목(items) / 산출 내역(breakdown)
function renderAgentEvidenceExtraFinal(p) {
  let html = '';

  // [#2] 재료비 — H/W·S/W 구매 품목과 실적 인식 주기
  if (p.items) {
    html += `
      <div class="agp-block">
        <b>확정 구매 품목 (H/W · S/W)</b>
        <table class="agx-items">
          <thead><tr><th>품목</th><th>구분</th><th class="num">금액</th><th>발주·검수 일정</th></tr></thead>
          <tbody>${p.items.map(i => `
            <tr><td><b>${escHtml(i.name)}</b></td>
              <td><em class="agx-kind ${i.kind === 'S/W' ? 'sw' : 'hw'}">${i.kind}</em></td>
              <td class="num">${fmt(i.amount)}</td><td>${escHtml(i.plan)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">확정 합계 ${p.items.length}건</td>
            <td class="num">${fmt(p.items.reduce((t, i) => t + i.amount, 0))}</td><td></td></tr></tfoot>
        </table>
      </div>`;
  }
  if (p.cycle) {
    html += `
      <div class="agx-cycle">
        <b>실적 인식 주기 제안 — <i>${escHtml(p.cycle.pick)} 단위</i></b>
        <span>${escHtml(p.cycle.why)}</span>
      </div>`;
  }

  // [#3] 금액이 어떻게 나왔는지 — 한 줄씩 근거와 출처
  if (p.breakdown) {
    const b = p.breakdown;
    html += `
      <div class="agp-block">
        <b>${escHtml(b.title)}</b>
        <table class="agx-bd">
          <thead><tr><th>항목</th><th class="num">금액</th><th>출처</th></tr></thead>
          <tbody>${b.rows.map(r => `
            <tr class="${/미편성|요청/.test(r.src) ? 'new' : ''}">
              <td>${escHtml(r.label)}</td><td class="num">${fmt(r.amount)}</td><td>${escHtml(r.src)}</td>
            </tr>`).join('')}</tbody>
          <tfoot>
            <tr><td>집행 예정 합계</td><td class="num">${fmt(b.total)}</td><td></td></tr>
            <tr><td>사용 가능액</td><td class="num">${fmt(b.avail)}</td><td>${escHtml(b.availLabel)}</td></tr>
            <tr class="short"><td>부족액</td><td class="num">${fmt(b.short)}</td><td>집행 전 확보 필요</td></tr>
            ${b.ask ? `<tr class="short"><td>증액 신청액</td><td class="num">${fmt(b.ask)}</td><td>${escHtml(b.askLabel || '')}</td></tr>` : ''}
          </tfoot>
        </table>
      </div>`;
  }
  return html;
}

/* ── [#4] 선택 기안 ── */
var agentMiniSelFinal = {};
function agentSelToggleFinal(id) {
  agentMiniSelFinal[id] = !agentMiniSelFinal[id];
  const g = agentExGroupFinal(id);
  // 택1 그룹에서 한 안을 고르면 다른 안은 자동으로 풀립니다(개별 클릭 기준).
  if (g && agentMiniSelFinal[id]) {
    g.ids.forEach(x => {
      if (x === id || !agentMiniSelFinal[x]) return;
      agentMiniSelFinal[x] = false;
      const n = g.ids.indexOf(x) + 1;
      showToast(`${g.acct}는 하나만 기안할 수 있어 ${n}안 선택을 해제했습니다.`);
    });
  }
  if (g && agentExAlertFinal === g.key) {
    const sel = g.ids.filter(x => agentMiniSelFinal[x]);
    if (sel.length < 2) agentExAlertFinal = '';
  }
  renderBudgetPage();
}
function agentSelAllFinal(ids, on) {
  ids.forEach(id => { agentMiniSelFinal[id] = !!on; });
  if (!on) { agentExAlertFinal = ''; renderBudgetPage(); return; }
  // 택1 그룹은 둘 다 담기므로, 펼쳐 두고 하나를 고르도록 알려 줍니다.
  const hit = agentExConflictsFinal(ids);
  hit.forEach(c => { agentExOpenFinal[c.g.key] = true; });
  if (hit.length) {
    showToast(`${hit.map(c => c.g.acct).join(', ')}는 1안·2안 중 하나만 기안할 수 있습니다. 펼친 목록에서 하나를 골라 주세요.`);
  }
  renderBudgetPage();
}
function agentSelectedFinal(ids) {
  return ids.filter(id => agentMiniSelFinal[id]);
}
// 기안 건수 — 1안·2안이 함께 선택돼도 같은 문제이므로 1건으로 셉니다.
function agentSelCountFinal(ids) {
  const seen = {};
  let n = 0;
  agentSelectedFinal(ids).forEach(id => {
    const g = agentExGroupFinal(id);
    if (!g) { n += 1; return; }
    if (!seen[g.key]) { seen[g.key] = true; n += 1; }
  });
  return n;
}
// 그룹(문제) 앞 체크박스 — 1안·2안 중 하나라도 선택되면 체크로 봅니다.
function agentExSelStateFinal(g) {
  const live = g.ids.filter(x => {
    const q = agentFindProposalFinal(x);
    return q && q.status === 'pending';
  });
  const sel = live.filter(x => agentMiniSelFinal[x]);
  return { live, sel, on: sel.length > 0, all: live.length > 0 && sel.length === live.length };
}
function agentExToggleSelFinal(key) {
  const g = AGENT_EXCLUSIVE_FINAL.find(x => x.key === key);
  if (!g) return;
  const st = agentExSelStateFinal(g);
  if (st.on) {
    st.live.forEach(x => { agentMiniSelFinal[x] = false; });
    if (agentExAlertFinal === g.key) agentExAlertFinal = '';
  } else {
    st.live.forEach(x => { agentMiniSelFinal[x] = true; });
    agentExOpenFinal[g.key] = true;                 // 골라야 하니 펼쳐 둡니다
    showToast(`${g.acct}는 1안·2안 중 하나만 기안할 수 있습니다. 펼친 목록에서 하나를 골라 주세요.`);
  }
  renderBudgetPage();
}

/* ==========================================================================
   19. [2026.09.02] 실행예산 버전 ─────────────────────────────────────────────
       · Agent가 예산 조정을 제안하면 "작성중" 버전이 새로 생깁니다.
       · 직책자 결재로 그 버전이 "확정"되고, 다음 조정을 위한 작성중 버전이 열립니다.
       · PM이 보는 기준은 언제나 가장 마지막 "확정" 버전입니다.
       · 버전마다 결재이력·변경이력을 따로 갖습니다.
   ========================================================================== */

var AGENT_VERSIONS_FINAL = {
  budgetMock: [
    {
      key: 'v4.0', label: 'v4.0', date: '2026-08-31', status: '작성중', owner: '이봄',
      memo: 'Agent 감지 5건 검토 중 — 직책자 결재를 받으면 확정됩니다',
      budgets: { 인건비: 800000000, 외주비: 1200000000, 재료비: 160000000, 경비: 100000000, 'A/S Cost': 50000000 },
      live: true,          // 이 버전의 이력은 화면에서 쌓이는 실제 로그를 씁니다
    },
    {
      key: 'v3.0', label: 'v3.0', date: '2026-07-28', status: '확정', owner: '이봄',
      approver: '박정우(직책자)', decidedAt: '2026-07-28 16:40',
      memo: 'SCM 확정 인력과 A/S비 반영 — 현재 확정 실행예산',
      budgets: { 인건비: 800000000, 외주비: 1200000000, 재료비: 160000000, 경비: 100000000, 'A/S Cost': 50000000 },
      approvals: [
        { at: '2026-07-28 16:40', act: 'confirmed', by: '박정우(직책자)', memo: 'v3.0 승인 — 인건비 +40,000,000 / 외주비 +60,000,000' },
        { at: '2026-07-28 11:05', act: 'submitted', by: '이봄(PM)', memo: 'v3.0 상신 — Agent 제안 3건 검토 완료' },
      ],
      changes: [
        { at: '2026-07-28 10:50', acct: '인건비', from: 760000000, to: 800000000, actor: '이봄(PM)', decision: 'approved',
          reason: 'SCM 확정 인력 3명 추가 편성',
          dialog: [
            { who: 'pm', text: '인건비를 4,000만원 올려야 하는 이유가 뭔가요?' },
            { who: 'agent', text: 'SCM에서 확정(승인)된 인력 3명 · 8.0MM이 I/F로 수신되었습니다. 등록하지 않으면 투입 시점에 집행할 예산이 없습니다.' },
            { who: 'pm', text: '제안대로 갑시다.' },
          ],
          detail: {
            why: 'SCM에서 투입계획이 확정(승인)된 인력 3명 · 8.0MM이 I/F로 수신되었습니다. 인건비 예산에 등록하지 않으면 실제 투입 시점에 집행할 예산이 없습니다.',
            source: {
              main: 'SCM 인력 확정 I/F (승인 건만 수신)', ifAt: '2026-07-28 09:05',
              ifFrom: 'SCM → 예산관리 Agent', ifBody: '확정 인력 3명 · 8.0MM · 투입 2026-08 ~ 2026-12',
              judgedAt: '2026-07-28 09:12',
              facts: ['P레벨 단가는 2026년 확정 단가표를 적용했습니다', '미확정 인력은 편성하지 않았습니다'],
            },
            persons: [
              { name: '김도윤', grade: 'P4', mm: 3.0, period: '2026-08 ~ 2026-10', unit: 7500000, amount: 22500000 },
              { name: '박서연', grade: 'P3', mm: 3.0, period: '2026-08 ~ 2026-10', unit: 5000000, amount: 15000000 },
              { name: '정하윤', grade: 'P2', mm: 2.0, period: '2026-11 ~ 2026-12', unit: 1250000, amount: 2500000 },
            ],
            monthly: [{ m: '2026-08', delta: 12500000 }, { m: '2026-09', delta: 12500000 },
                      { m: '2026-10', delta: 12500000 }, { m: '2026-11', delta: 1250000 }, { m: '2026-12', delta: 1250000 }],
            impact: '인건비 CP한도 800,000,000원 이내였습니다(잔여 0원).',
          } },
        { at: '2026-07-28 10:52', acct: '외주비', from: 1140000000, to: 1200000000, actor: '이봄(PM)', decision: 'approved',
          reason: '4분기 검수 계획 보정',
          dialog: [
            { who: 'pm', text: '4분기 검수가 왜 늘어나요?' },
            { who: 'agent', text: '3분기 PO의 검수 예정액이 견적보다 60,000,000원 많습니다. 검수 시점에 가용예산을 체크하므로 계획을 먼저 올려야 검수가 진행됩니다.' },
          ],
          detail: {
            why: '3분기 PO 검수 예정액이 견적보다 60,000,000원 많아, 검수 전에 계획을 올려야 했습니다. 계획이 없으면 검수 자체가 진행되지 않습니다.',
            source: {
              main: '구매시스템 검수예정 I/F (실시간)', ifAt: '2026-07-27 17:20',
              ifFrom: '구매시스템 → 예산관리 Agent', ifBody: '검수 예정 3건 · 합계 60,000,000원 (2026-10 ~ 12)',
              judgedAt: '2026-07-28 09:12',
              facts: ['PO는 계획 라인 범위에서만 발행되므로 계획을 먼저 올렸습니다', '업체별 계획 라인에 나눠 반영했습니다'],
            },
            items: [
              { name: '아크로디자인랩 · UI/UX', kind: '검수예정', amount: 25000000, plan: '2026-10 검수' },
              { name: '펜타시스템 · 백엔드', kind: '검수예정', amount: 20000000, plan: '2026-11 검수' },
              { name: 'BP Korea · 프론트', kind: '검수예정', amount: 15000000, plan: '2026-12 검수' },
            ],
            monthly: [{ m: '2026-10', delta: 25000000 }, { m: '2026-11', delta: 20000000 }, { m: '2026-12', delta: 15000000 }],
            impact: '외주비 CP한도 1,200,000,000원 이내였습니다(잔여 0원).',
          } },
        { at: '2026-07-28 10:55', acct: 'A/S Cost', from: 47500000, to: 50000000, actor: '이봄(PM)', decision: 'approved',
          reason: '무상 하자보수 원가 반영',
          dialog: [
            { who: 'agent', text: '계약서 하자보수 조항(12개월)에 대응하는 원가가 CP 상세정보에 들어왔습니다. 2,500,000원을 추가 편성했습니다.' },
          ],
          detail: {
            why: '계약서 무상 하자보수 12개월 조항에 대응하는 원가가 CP 상세정보로 수신되어 그대로 반영했습니다.',
            source: {
              main: 'PMO 계약원가(CP) 상세정보', ifAt: '2026-07-27 09:00',
              ifFrom: 'PMO → 예산관리 Agent', ifBody: 'A/S Cost 50,000,000원 (기존 47,500,000원)',
              judgedAt: '2026-07-28 09:12',
              facts: ['CP 상세정보에 없는 항목은 Agent가 만들지 않습니다'],
            },
            monthly: [{ m: '2027-11', delta: 2500000 }],
            impact: 'A/S Cost CP한도 50,000,000원과 일치합니다(잔여 0원).',
          } },
      ],
    },
    {
      key: 'v2.0', label: 'v2.0', date: '2026-05-18', status: '확정', owner: '이봄',
      approver: '박정우(직책자)', decidedAt: '2026-05-18 15:20',
      memo: '외주비 검수계획과 재료비 상품계획 보정',
      budgets: { 인건비: 760000000, 외주비: 1140000000, 재료비: 152000000, 경비: 95000000, 'A/S Cost': 47500000 },
      approvals: [
        { at: '2026-05-18 15:20', act: 'confirmed', by: '박정우(직책자)', memo: 'v2.0 승인 — 전 계정 CP 한도 이내' },
        { at: '2026-05-18 09:30', act: 'returned', by: '박정우(직책자)', memo: 'v2.0 반려 — 재료비 근거 보완 요청' },
        { at: '2026-05-17 17:10', act: 'submitted', by: '이봄(PM)', memo: 'v2.0 상신 — Agent 제안 2건' },
      ],
      changes: [
        { at: '2026-05-17 16:40', acct: '외주비', from: 1080000000, to: 1140000000, actor: '이봄(PM)', decision: 'approved',
          reason: '2분기 PO 검수 차액 반영',
          dialog: [
            { who: 'pm', text: '외주비를 왜 6천만원 올려야 해요?' },
            { who: 'agent', text: '2분기 PO 45000091의 검수 예정액이 견적보다 60,000,000원 많습니다. 계획을 먼저 올리지 않으면 검수가 진행되지 않습니다.' },
          ],
          detail: {
            why: '2분기 PO 45000091의 검수 예정액이 견적보다 60,000,000원 많아 계획을 먼저 올렸습니다.',
            source: {
              main: '구매시스템 검수예정 I/F (실시간)', ifAt: '2026-05-17 15:05',
              ifFrom: '구매시스템 → 예산관리 Agent', ifBody: 'PO 45000091 검수 예정 60,000,000원 (2026-06)',
              judgedAt: '2026-05-17 16:20',
              facts: ['검수 시점에 가용예산을 체크하므로 계획이 선행되어야 합니다'],
            },
            monthly: [{ m: '2026-06', delta: 60000000 }],
            impact: '외주비 CP한도 1,140,000,000원과 일치합니다(잔여 0원).',
          } },
        { at: '2026-05-18 14:10', acct: '재료비', from: 144000000, to: 152000000, actor: '이봄(PM)', decision: 'approved',
          reason: '반려 사유 보완 후 재상신 — H/W 견적 확정분',
          dialog: [
            { who: 'agent', text: '직책자가 재료비 근거 보완을 요청해 반려되었습니다. 확정 견적서 2건을 근거로 붙여 재상신했습니다.' },
            { who: 'pm', text: '견적서 붙였으니 다시 올려주세요.' },
          ],
          detail: {
            why: '첫 상신에서 근거가 부족해 반려되었습니다. H/W 확정 견적 2건을 근거로 붙여 8,000,000원을 재상신했습니다.',
            source: {
              main: '구매시스템 견적확정 I/F (H/W 2건)', ifAt: '2026-05-18 11:40',
              ifFrom: '구매시스템 → 예산관리 Agent', ifBody: 'H/W 견적 2건 확정 · 합계 8,000,000원',
              judgedAt: '2026-05-18 13:50',
              facts: ['직책자 반려 사유(근거 보완)에 대응해 확정 견적서를 첨부했습니다'],
            },
            items: [
              { name: '테스트 서버 1식', kind: 'H/W', amount: 5000000, plan: '2026-06 발주 · 07월 검수' },
              { name: '네트워크 스위치', kind: 'H/W', amount: 3000000, plan: '2026-06 발주 · 07월 검수' },
            ],
            monthly: [{ m: '2026-07', delta: 8000000 }],
            impact: '재료비 CP한도 152,000,000원과 일치합니다(잔여 0원).',
          } },
      ],
    },
    {
      key: 'v1.0', label: 'v1.0', date: '2026-02-10', status: '확정', owner: '이봄',
      approver: '박정우(직책자)', decidedAt: '2026-02-10 14:00',
      memo: '최초 실행예산 편성 (PMO CP 수신 직후)',
      budgets: { 인건비: 720000000, 외주비: 1080000000, 재료비: 144000000, 경비: 90000000, 'A/S Cost': 45000000 },
      approvals: [
        { at: '2026-02-10 14:00', act: 'confirmed', by: '박정우(직책자)', memo: 'v1.0 승인 — 최초 실행예산 확정' },
        { at: '2026-02-09 18:20', act: 'submitted', by: '이봄(PM)', memo: 'v1.0 상신 — Agent 초안 5건' },
      ],
      changes: [
        { at: '2026-02-09 17:00', acct: '전 계정', from: 0, to: 2079000000, actor: '이봄(PM)', decision: 'approved',
          reason: 'Agent 초안대로 최초 편성 — 5개 계정 일괄',
          dialog: [
            { who: 'agent', text: 'PMO CP와 SCM 확정 인력, 구매 확정 견적을 읽어 5개 계정 초안을 만들었습니다.' },
            { who: 'pm', text: '초안대로 기안하겠습니다.' },
          ],
          detail: {
            why: '프로젝트 등록 직후 PMO CP·SCM 확정 인력·구매 확정 견적을 읽어 5개 계정 초안을 한 번에 편성했습니다.',
            source: {
              main: 'PMO CP + SCM 인력 확정 + 구매 견적확정 I/F', ifAt: '2026-02-09 08:30',
              ifFrom: '선행 시스템 3곳 → 예산관리 Agent',
              ifBody: 'CP 총액 2,079,000,000원 · 확정 인력 12명 · 확정 견적 7건',
              judgedAt: '2026-02-09 16:40',
              facts: ['확정된 값만 편성했고 미확정분은 비워 두었습니다', '경비는 연단위 릴리즈 기준으로 나눠 담았습니다'],
            },
            breakdown: {
              title: '계정별 최초 편성 금액',
              rows: [
                { label: '인건비', amount: 720000000, src: 'SCM 확정 인력 12명' },
                { label: '외주비', amount: 1080000000, src: '확정 견적 5건' },
                { label: '재료비', amount: 144000000, src: '확정 견적 2건 (H/W·S/W)' },
                { label: '경비', amount: 90000000, src: 'CP 상세정보' },
                { label: 'A/S Cost', amount: 45000000, src: 'CP 상세정보' },
              ],
              total: 2079000000, availLabel: 'CP 총액', avail: 2079000000, short: 0,
            },
            monthly: [],
            impact: 'CP 총액 2,079,000,000원을 정확히 채웠습니다(잔여 0원).',
          } },
      ],
    },
  ],
};

function agentVersionsFinal() {
  return AGENT_VERSIONS_FINAL[typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : ''] || null;
}
function agentVerSelFinal() {
  const vs = agentVersionsFinal();
  if (!vs) return null;
  return vs.find(v => v.key === selectedExecBudgetVersionFinal) || vs[0];
}
// PM 기준 = 가장 마지막 확정 버전
function agentVerConfirmedFinal() {
  const vs = agentVersionsFinal();
  return vs ? vs.find(v => v.status === '확정') : null;
}
function agentVerDraftFinal() {
  const vs = agentVersionsFinal();
  return vs ? vs.find(v => v.status === '작성중') : null;
}
function agentVerIsPastFinal() {
  const v = agentVerSelFinal();
  return !!(v && v.status !== '작성중');
}

// 버전 스냅샷 — 이 프로젝트는 위 목록을 그대로 씁니다.
if (typeof getExecBudgetVersionSnapshotsFinal === 'function') {
  var getExecVerBeforeAgentVerFinal = getExecBudgetVersionSnapshotsFinal;
  getExecBudgetVersionSnapshotsFinal = function (data) {
    const vs = agentVersionsFinal();
    if (!vs) return getExecVerBeforeAgentVerFinal(data);
    return vs.map(v => ({
      key: v.key, label: v.label + ' (' + v.date + ')', date: v.date,
      status: v.status, owner: v.owner, memo: v.memo,
      budgets: Object.assign({}, v.budgets),
    }));
  };
}

// 이력 링크 — 선택한 버전의 건수를 보여 줍니다.
function renderAgentHistLinkFinal() {
  const v = (typeof agentVerSelFinal === 'function') ? agentVerSelFinal() : null;
  const a = (v && !v.live) ? (v.approvals || []).length : AGENT_APPROVAL_LOG_FINAL.length;
  const c = (v && !v.live) ? (v.changes || []).length : AGENT_LOG_FINAL.length;
  return `
    <div class="agm-histlink">
      <span>이력${v ? ` · ${v.label}` : ''}</span>
      <button onclick="agentHistOpenFinal('approval')">결재 이력${a ? ` ${a}건` : ''}</button>
      <i>·</i>
      <button onclick="agentHistOpenFinal('history')">변경 이력 ${c}건</button>
    </div>`;
}

var agentVerHistOpenFinal = '';       // 펼쳐 본 이력 행 key
function agentVerHistToggleFinal(key) {
  agentVerHistOpenFinal = agentVerHistOpenFinal === key ? '' : key;
  renderBudgetPage();
}
// 확정된 변경 한 건을 "해야 할 일" 수준으로 펼칩니다 — 근거·감지 소스·상세·월별까지.
function renderAgentVerChangeDetailFinal(c) {
  const d = c.detail || {};
  const fake = { acct: c.acct, why: d.why || c.reason, source: d.source, evidence: d.evidence,
                 persons: d.persons, items: d.items, breakdown: d.breakdown, cycle: d.cycle,
                 monthly: d.monthly, impact: d.impact, from: c.from, to: c.to };
  let html = '<div class="agp-block"><b>Agent가 이렇게 판단했습니다</b>';
  if (d.source) html += renderAgentExSourceFinal(d.source);
  html += `<p>${escHtml(fake.why)}</p></div>`;
  if (d.persons) {
    html += `
      <div class="agp-block">
        <b>SCM 확정 인력</b>
        <table class="agent-person-table">
          <thead><tr><th>인력</th><th>등급</th><th class="num">MM</th><th>투입기간</th><th class="num">단가</th><th class="num">금액</th></tr></thead>
          <tbody>${d.persons.map(m => `
            <tr><td><b>${escHtml(m.name)}</b></td><td>${m.grade}</td><td class="num">${m.mm.toFixed(1)}</td>
              <td>${m.period}</td><td class="num">${fmt(m.unit)}</td><td class="num"><b>${fmt(m.amount)}</b></td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">합계 ${d.persons.length}명</td>
            <td class="num">${d.persons.reduce((t, m) => t + m.mm, 0).toFixed(1)}</td><td colspan="2"></td>
            <td class="num">${fmt(d.persons.reduce((t, m) => t + m.amount, 0))}</td></tr></tfoot>
        </table>
      </div>`;
  }
  html += renderAgentEvidenceExtraFinal(fake);
  html += `
    <div class="agp-amt">
      <div class="agp-amt-cell"><span>변경 전</span><b>${agentWonFinal(c.from)}</b></div>
      <div class="agp-arrow">→</div>
      <div class="agp-amt-cell to"><span>변경 후</span><b>${agentWonFinal(c.to)}</b></div>
      <div class="agp-amt-cell d"><span>증감</span><b class="${c.to - c.from > 0 ? 'up' : 'down'}">${agentDeltaFinal(c.to - c.from)}</b></div>
      ${(d.monthly && d.monthly.length)
        ? `<div class="agp-months">${d.monthly.map(m => `<em>${m.m} ${agentDeltaFinal(m.delta)}</em>`).join('')}</div>` : ''}
    </div>`;
  if (d.impact) html += `<div class="agp-block impact"><b>영향</b><p>${escHtml(d.impact)}</p></div>`;
  html += renderAgentDialogFinal(c.dialog);
  return `<div class="agp-body agver-detail">${html}</div>`;
}

/* 지난 버전의 결재이력·변경이력 — 그 버전에 담긴 기록만 보여 줍니다. */
function renderAgentVerHistPopFinal(v, isApv) {
  const ACT = { confirmed: ['승인', 'ok'], returned: ['반려', 'bad'], submitted: ['상신', 'sub'] };
  const body = isApv
    ? ((v.approvals || []).length
        ? (v.approvals || []).map((a, ai) => {
            const t = ACT[a.act] || ['처리', ''];
            const akey = v.key + '|a' + ai;
            const aopen = agentVerHistOpenFinal === akey;
            return `
              <div class="agapl ${t[1]} ${aopen ? 'open' : ''}">
                <button class="agl-open" onclick="agentVerHistToggleFinal('${akey}')" aria-expanded="${aopen}">
                  <div class="agapl-top"><em class="agapl-act ${t[1]}">${t[0]}</em><b>${escHtml(a.memo)}</b>
                    <i class="agl-caret">${aopen ? '∧' : '∨'}</i></div>
                  <div class="agapl-meta">${a.at} · ${escHtml(a.by)}</div>
                  ${aopen ? '' : '<span class="agl-more">∨ 이 결재에 담긴 계정별 변경 내역 보기</span>'}
                </button>
                ${aopen ? `
                  <div class="agver-detail">
                    ${(v.changes || []).map((c, ci) => `
                      <div class="agver-cline">
                        <span class="agp-acct sm ${agentAcctColorFinal(c.acct)}">${c.acct}</span>
                        <b>${escHtml(c.reason)}</b>
                        <em>${fmt(c.from)} → <b>${fmt(c.to)}</b></em>
                        <button onclick="agentHistOpenFinal('history');agentVerHistToggleFinal('${v.key}|c${ci}')">상세 보기 →</button>
                      </div>`).join('')}
                  </div>` : ''}
              </div>`;
          }).join('')
        : '<div class="ag-empty">이 버전의 결재 이력이 없습니다.</div>')
    : ((v.changes || []).length
        ? (v.changes || []).map((c, i) => {
            const ckey = v.key + '|c' + i;
            const copen = agentVerHistOpenFinal === ckey;
            return `
            <div class="agent-log ${c.decision} ${copen ? 'open' : ''}">
              <button class="agl-open" onclick="agentVerHistToggleFinal('${ckey}')" aria-expanded="${copen}"
                title="${copen ? '접기' : 'Agent 판단 근거와 상세 보기'}">
                <div class="agl-head">
                  <span class="agp-acct sm ${agentAcctColorFinal(c.acct)}">${c.acct}</span>
                  <b>${escHtml(c.reason)}</b>
                  <em class="agl-badge ${c.decision}">${c.decision === 'approved' ? '승인' : c.decision === 'rejected' ? '반려' : '수동'}</em>
                  <i class="agl-caret">${copen ? '∧' : '∨'}</i>
                </div>
                <div class="agl-meta">${c.at} · ${escHtml(c.actor)}</div>
                <div class="agl-amt"><b>${fmt(c.from)}</b> → <b>${fmt(c.to)}</b>
                  <em class="${c.to - c.from > 0 ? 'up' : c.to - c.from < 0 ? 'down' : ''}">${c.to === c.from ? '±0원' : agentDeltaFinal(c.to - c.from)}</em></div>
                ${copen ? '' : '<span class="agl-more">∨ 이 변경의 Agent 판단 근거·상세 보기</span>'}
              </button>
              ${copen ? renderAgentVerChangeDetailFinal(c) : ''}
            </div>`;
          }).join('')
        : '<div class="ag-empty">이 버전의 변경 이력이 없습니다.</div>');
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentHistCloseFinal()">
      <div class="agv-pop wide" role="dialog" aria-modal="true" aria-label="이력">
        <div class="agv-pop-head">
          <div class="agh-tabs">
            <button class="agh-tab ${isApv ? 'on' : ''}" onclick="agentHistOpenFinal('approval')">
              결재 이력 (${(v.approvals || []).length})</button>
            <button class="agh-tab ${!isApv ? 'on' : ''}" onclick="agentHistOpenFinal('history')">
              변경 이력 (${(v.changes || []).length})</button>
          </div>
          <span class="agh-ver">${v.label} · ${v.date} · ${v.status}</span>
          <button class="agv-pop-x" onclick="agentHistCloseFinal()">✕</button>
        </div>
        <div class="agv-pop-body scroll">${body}</div>
      </div>
    </div>`;
}

/* ── 버전 선택 ─────────────────────────────────────────────────────────── */
var agentVerPopFinal = false;
function agentVerPopToggleFinal() { agentVerPopFinal = !agentVerPopFinal; renderBudgetPage(); }
function agentVerPickFinal(key) {
  selectedExecBudgetVersionFinal = key;
  agentVerPopFinal = false;
  budgetSetupEditAccount = null;
  const v = agentVerSelFinal();
  showToast(v.status === '작성중'
    ? `${v.label} 작성중 — Agent 제안을 검토하고 기안할 수 있습니다.`
    : `${v.label} (${v.date}) 확정 버전을 조회합니다. 편집·기안은 작성중 버전에서 합니다.`);
  renderBudgetPage();
}

function renderAgentVersionBarFinal() {
  const vs = agentVersionsFinal();
  if (!vs) return '';
  const cur = agentVerSelFinal();
  const conf = agentVerConfirmedFinal();
  return `
    <div class="agver">
      <button class="agver-btn ${cur.status === '작성중' ? 'draft' : ''}" onclick="agentVerPopToggleFinal()"
        title="실행예산 버전 선택" aria-expanded="${agentVerPopFinal}">
        <b>실행예산</b>
        <span>${cur.label}</span>
        <em class="agver-st ${cur.status === '작성중' ? 'draft' : 'ok'}">${cur.status}</em>
        <i>${cur.date}</i>
        <u>⌄</u>
      </button>
      ${conf && cur.key !== conf.key
        ? `<span class="agver-note">${agentViewFinal === 'sim'
            ? `확정 ${conf.label} · ${conf.date}`
            : `현재 확정 버전은 ${conf.label} (${conf.date})입니다.`}</span>`
        : `<span class="agver-note">${conf ? `확정 기준 ${conf.label} · ${conf.date}` : ''}</span>`}
      ${agentVerPopFinal ? `
        <div class="agver-pop">
          ${vs.map(v => `
            <button class="agver-opt ${v.key === cur.key ? 'on' : ''}" onclick="agentVerPickFinal('${v.key}')">
              <b>${v.label}</b>
              <em class="agver-st ${v.status === '작성중' ? 'draft' : 'ok'}">${v.status}</em>
              <i>${v.date}</i>
              <span>${escHtml(v.memo)}</span>
              <u>결재 ${(v.live ? AGENT_APPROVAL_LOG_FINAL : (v.approvals || [])).length}건 · 변경 ${(v.live ? AGENT_LOG_FINAL : (v.changes || [])).length}건</u>
            </button>`).join('')}
        </div>` : ''}
    </div>`;
}

/* 직책자 결재로 작성중 버전이 확정되고, 다음 조정을 위한 작성중 버전이 열립니다. */
function agentVerConfirmVersionFinal(d) {
  const vs = agentVersionsFinal();
  if (!vs) return null;
  const cur = vs.find(v => v.status === '작성중');
  if (!cur) return null;
  const legs = agentDraftLegsFinal(d);

  cur.status = '확정';
  cur.live = false;
  cur.approver = `${agentMeFinal().name}(${agentMeFinal().role})`;
  cur.decidedAt = '2026-08-31 10:35';
  cur.memo = `Agent 제안 ${d.items.length}건 반영 — 순증감 ${agentDeltaFinal(agentDraftNetFinal(d))}`;
  cur.approvals = AGENT_APPROVAL_LOG_FINAL.map(a => ({ at: a.at, act: a.act, by: a.by, memo: a.memo }));
  cur.changes = legs.map(e => ({
    at: cur.decidedAt, acct: e.acct, from: e.from, to: e.to,
    actor: '이봄(PM)', decision: 'approved',
    reason: e.reasons.map(r => r.title).join(' / '), dialog: [],
  }));

  // 다음 버전 — 여기서부터 새 조정이 쌓입니다.
  const next = {
    key: 'v' + (vs.length + 1) + '.0', label: 'v' + (vs.length + 1) + '.0',
    date: '2026-08-31', status: '작성중', owner: '이봄',
    memo: 'Agent가 다음 조정 시점을 감지하면 여기에 쌓입니다',
    budgets: Object.assign({}, cur.budgets), live: true,
  };
  vs.unshift(next);
  AGENT_APPROVAL_LOG_FINAL = [];
  AGENT_LOG_FINAL = [];
  selectedExecBudgetVersionFinal = next.key;
  return cur;
}

/* ── 확정 버전을 조회할 때는 편집·기안을 막습니다 ── */
function renderAgentPastNoticeFinal() {
  if (!agentVerIsPastFinal()) return '';
  const v = agentVerSelFinal();
  const conf = agentVerConfirmedFinal();
  return `
    <div class="agver-past">
      <b>${v.label} 확정 버전 조회 중</b>
      <span>${v.date} · ${escHtml(v.approver || '')} 승인 · ${escHtml(v.memo)}</span>
      ${v.key === (conf || {}).key
        ? '<em>가장 마지막 확정 실행예산입니다. 조정은 작성중 버전에서 진행합니다.</em>'
        : '<em>지난 버전입니다. 열람만 가능합니다.</em>'}
      <button onclick="agentVerPickFinal('${(agentVerDraftFinal() || {}).key}')">작성중 버전으로 →</button>
    </div>`;
}

/* ==========================================================================
   18. [2026.09.01] 최초 예산 편성 시나리오 — 차세대 여신심사 시스템 구축(credit)
       프로젝트 등록이 끝나고 PMO에서 CP만 내려온 상태입니다. 편성된 예산은 아직 없고,
       Agent가 선행 시스템·SCM·구매 견적을 읽어 "초안"을 제안합니다.

       CP총액 1,500,000,000원
         인건비 300,000,000 / 외주비 800,000,000 / 재료비 350,000,000
         경비    50,000,000 / A/S Cost 0
   ========================================================================== */

var AGENT_PJT_CP_FINAL = {
  credit: {
    label: 'V1', date: '2026-08-01', owner: '이봄',
    memo: 'PMO 계약원가(CP) 수신 직후 · 최초 실행예산 편성 전',
    budgets: { 인건비: 300000000, 외주비: 800000000, 재료비: 350000000, 경비: 50000000, 'A/S Cost': 0 },
  },
};

// CP 스냅샷은 원래 프로젝트 구분이 없습니다. 최초 편성 프로젝트만 자기 CP를 쓰도록 갈라 줍니다.
if (typeof getExecBudgetVersionSnapshotsFinal === 'function') {
  var getExecVerBeforeAgentPjtFinal = getExecBudgetVersionSnapshotsFinal;
  getExecBudgetVersionSnapshotsFinal = function (data) {
    const cp = AGENT_PJT_CP_FINAL[typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : ''];
    if (!cp) return getExecVerBeforeAgentPjtFinal(data);
    // 최초 편성이라 버전 이력이 없습니다 — 작성중 한 건만 둡니다.
    return [{
      key: 'v3', label: cp.label, date: cp.date, status: '작성중', owner: cp.owner,
      memo: cp.memo, budgets: Object.assign({}, cp.budgets),
    }];
  };
}

/* ── 프로젝트 데이터 — 12개월(4분기) · 편성 전이라 모든 월이 0원 ────────────
   실적은 예산 내에서만 발생하므로, 편성 전 프로젝트의 실적도 0입니다. */
var AGENT_CREDIT_MONTHS_FINAL = [
  '2026-08', '2026-09', '2026-10',   // 1분기
  '2026-11', '2026-12', '2027-01',   // 2분기
  '2027-02', '2027-03', '2027-04',   // 3분기
  '2027-05', '2027-06', '2027-07',   // 4분기
];
function agentCreditQuarterFinal(m) {
  const i = AGENT_CREDIT_MONTHS_FINAL.indexOf(m);
  return i < 0 ? 0 : Math.floor(i / 3) + 1;
}
function agentCreditMonthsOfQFinal(q) {
  return AGENT_CREDIT_MONTHS_FINAL.slice((q - 1) * 3, q * 3);
}

/* ── Agent 초안 제안 ──────────────────────────────────────────────────────
   근거 소스를 명시합니다. 최초 편성이라 "Agent가 무엇을 읽어 판단했는지"가 핵심입니다. */
function agentCreditProposalsFinal() {
  // perMonth = 확정 견적의 월 단가. 세 업체 합 50,000,000원/월 → 1분기 150,000,000원
  //   toQ = 지금 편성한 마지막 분기. PM이 대화로 근거를 주면 여기가 늘어납니다.
  const osVendors = [
    { vendor: '테크노아이티', part: '여신심사 화면 개발', perMonth: 20000000, toQ: 1, quoteNo: 'QT-2608-0031', at: '2026-08-03 10:12' },
    { vendor: '엔코아컨설팅', part: '심사 룰 엔진 이관', perMonth: 20000000, toQ: 1, quoteNo: 'QT-2608-0044', at: '2026-08-04 09:40' },
    { vendor: '위즈데이터', part: '신용정보 I/F 개발', perMonth: 10000000, toQ: 1, quoteNo: 'QT-2608-0052', at: '2026-08-04 16:25' },
  ];

  return [
    /* ① 인건비 — SCM 확정 인력 */
    {
      id: 'cr-01', pjt: 'credit', acct: '인건비', status: 'pending', confidence: 0.97,
      detectedAt: '2026-08-05 09:10', trigger: 'SCM 인력 확정(승인) I/F 수신',
      title: '확정된 SCM 인력 5명을 인건비로 편성합니다',
      legs: [{ acct: '인건비', delta: 250000000 }],
      why: '아직 편성된 인건비가 없습니다. SCM에서 투입계획이 확정(승인)된 인력 5명 · 50.0MM을 그대로 읽어 초안을 만들었습니다. 확정 인력만 담았으므로 CP한도 300,000,000원 안에 50,000,000원이 남습니다 — 추가 인력이 확정되면 그때 다시 제안합니다.',
      source: {
        main: 'SCM 인력 확정 I/F (승인 건만 수신)',
        ifAt: '2026-08-05 09:05', ifFrom: 'SCM → 예산관리 Agent',
        ifBody: '확정 인력 5명 · 50.0MM · 투입 2026-08 ~ 2027-05',
        judgedAt: '2026-08-05 09:10',
        facts: [
          '인력별 P레벨 단가는 2026년 확정 단가표를 적용했습니다',
          '2027-06 이후는 SCM 확정 인력이 없어 편성하지 않았습니다 (미확정)',
        ],
      },
      persons: [
        { name: '이봄', grade: 'P4', mm: 10.0, period: '2026-08 ~ 2027-05', unit: 7500000, amount: 75000000 },
        { name: '김도윤', grade: 'P3', mm: 10.0, period: '2026-08 ~ 2027-05', unit: 5000000, amount: 50000000 },
        { name: '박서연', grade: 'P3', mm: 10.0, period: '2026-08 ~ 2027-05', unit: 5000000, amount: 50000000 },
        { name: '정하윤', grade: 'P2', mm: 10.0, period: '2026-08 ~ 2027-05', unit: 4000000, amount: 40000000 },
        { name: '한민석', grade: 'P2', mm: 10.0, period: '2026-08 ~ 2027-05', unit: 3500000, amount: 35000000 },
      ],
      monthly: AGENT_CREDIT_MONTHS_FINAL.slice(0, 10).map(m => ({ m, delta: 25000000 })),
      impact: '인건비 CP한도 300,000,000원 이내(잔여 50,000,000원). 승인하면 8월부터 인력 투입 실적을 받을 수 있습니다.',
    },

    /* ② 외주비 — 견적 확정 3개 업체 · 1분기 */
    {
      id: 'cr-02', pjt: 'credit', acct: '외주비', status: 'pending', confidence: 0.95,
      detectedAt: '2026-08-05 09:10', trigger: '구매 견적확정 I/F 수신 (3개 업체)',
      title: '확정된 외주 견적 3건(1분기)을 외주비로 편성합니다',
      legs: [{ acct: '외주비', delta: 150000000 }],
      why: '견적이 확정된 3개 업체의 1분기(2026-08~10) 계획 라인만 편성했습니다. 외주비는 계획 라인이 있어야 PO를 발행할 수 있어, 확정된 견적부터 먼저 세웁니다. 2분기 이후는 견적이 오지 않아 비워 두었습니다.',
      source: {
        main: '구매시스템 견적확정 I/F (실시간)',
        ifAt: '2026-08-04 16:25', ifFrom: '구매시스템 → 예산관리 Agent',
        ifBody: '견적 3건 확정 · 합계 150,000,000원 · 수행기간 2026-08-01 ~ 10-31',
        judgedAt: '2026-08-05 09:10',
        facts: [
          '업체별 계획 라인을 각각 만들어야 PO가 그 범위 안에서 발행됩니다',
          '2·3·4분기는 견적 미수신 — 편성하지 않았습니다 (CP 잔여 650,000,000원)',
        ],
        alt: '견적확정이 늦어지더라도 [Agent와 대화하기]에 예상되는 외주 계획을 남겨 주시면, Agent가 그 대화를 근거로 편성을 제안합니다. 예: "테크노아이티는 4분기까지 동일한 견적으로 구매 진행될 예정입니다."',
      },
      items: [], monthly: [], impact: '',
      vendors: osVendors,
    },

    /* ③ 재료비 — 전액 편성 (구매 일괄 · 검수 분기) */
    {
      id: 'cr-03', pjt: 'credit', acct: '재료비', status: 'pending', confidence: 0.93,
      detectedAt: '2026-08-05 09:10', trigger: '구매 견적확정 I/F 수신 (H/W·S/W)',
      title: '확정된 H/W·S/W 견적 4건을 재료비로 편성합니다',
      legs: [{ acct: '재료비', delta: 350000000 }],
      why: '재료비도 외주비와 같은 기준입니다 — 견적이 확정된 건만 편성합니다. 구매시스템에서 H/W 2건·S/W 2건, 합계 350,000,000원이 확정되어 그대로 편성했습니다. 구매는 일괄 발주라 계획 금액을 나누지 않았고, 검수 계획만 납품·설치 일정에 맞춰 분기 단위로 배분했습니다.',
      source: {
        main: '구매시스템 견적확정 I/F (H/W 2건 · S/W 2건)',
        ifAt: '2026-08-04 11:30', ifFrom: '구매시스템 → 예산관리 Agent',
        ifBody: 'H/W 2건 · S/W 2건 견적 확정 · 합계 350,000,000원',
        judgedAt: '2026-08-05 09:10',
        facts: [
          '확정된 견적 금액을 그대로 편성했습니다 — 견적이 없는 품목은 편성하지 않았습니다',
          '구매는 일괄 발주라 계획 금액을 쪼개지 않았습니다 (쪼개면 발주액이 계획 라인을 넘어 PO가 막힙니다)',
          '검수 계획만 분기 단위로 배분했습니다 (과거 12개 프로젝트 평균 검수 리드타임 32일 기준)',
        ],
      },
      items: [
        { name: '심사서버 4식', kind: 'H/W', amount: 140000000, plan: '2026-08 발주 · 10월 검수' },
        { name: '스토리지 · 백업', kind: 'H/W', amount: 70000000, plan: '2026-08 발주 · 2027-01 검수' },
        { name: 'DBMS 라이선스', kind: 'S/W', amount: 90000000, plan: '2026-08 발주 · 2027-04 검수' },
        { name: '심사엔진 라이선스', kind: 'S/W', amount: 50000000, plan: '2026-08 발주 · 2027-07 검수' },
      ],
      cycle: {
        pick: '분기',
        why: '발주는 8월에 한 번이지만 검수는 품목별 납품·설치가 끝나는 시점에 잡힙니다. 월별로 쪼개면 검수 시점과 어긋나 월 편차가 커지고, 반기로 묶으면 집행이 한쪽에 몰려 보입니다. 견적서의 납품 예정일을 분기로 묶어 배분했습니다.',
      },
      monthly: [
        { m: '2026-10', delta: 140000000 },
        { m: '2027-01', delta: 70000000 },
        { m: '2027-04', delta: 90000000 },
        { m: '2027-07', delta: 50000000 },
      ],
      impact: '확정 견적 합계가 재료비 CP한도 350,000,000원과 같아 잔여가 0원이 됩니다. 견적이 추가로 확정되면 다른 계정에서 이관해야 합니다.',
    },

    /* ④ 경비 — CP 상세정보를 읽어 편성 */
    {
      id: 'cr-04', pjt: 'credit', acct: '경비', status: 'pending', confidence: 0.9,
      detectedAt: '2026-08-05 09:10', trigger: 'PMO CP 상세정보 수신',
      title: '확정된 CP 상세정보 4항목을 경비로 편성합니다 (연단위)',
      legs: [{ acct: '경비', delta: 50000000 }],
      why: '경비는 PM이 항목을 새로 만드는 것이 아니라, 선행 시스템이 CP를 수립할 때 입력한 상세정보를 Agent가 읽어 옮겨 담는 구조입니다. 예산은 연단위로 릴리즈되므로 2026년분과 2027년분을 나눠 편성했습니다.',
      source: {
        main: 'PMO 계약원가(CP) 상세정보',
        ifAt: '2026-08-01 08:30', ifFrom: 'PMO → 예산관리 Agent',
        ifBody: '경비 50,000,000원 · 세부계정 4건 (조직운영비 · 회의비 · 여비교통비 · 소모품비)',
        judgedAt: '2026-08-05 09:10',
        facts: [
          '2026년(8~12월) 20,000,000원 · 2027년(1~7월) 30,000,000원 — 연단위 릴리즈 기준',
          'CP 상세정보에 없는 항목은 Agent가 임의로 만들지 않습니다',
        ],
      },
      breakdown: {
        title: 'CP 상세정보에서 읽어 온 경비 세부계정',
        rows: [
          { label: '조직운영비', amount: 20000000, src: 'CP 상세정보 (PMO 입력)' },
          { label: '회의비', amount: 12000000, src: 'CP 상세정보 (PMO 입력)' },
          { label: '여비교통비', amount: 12000000, src: 'CP 상세정보 (PMO 입력)' },
          { label: '소모품비', amount: 6000000, src: 'CP 상세정보 (PMO 입력)' },
        ],
        total: 50000000,
        availLabel: '경비 CP한도',
        avail: 50000000,
        short: 0,
      },
      monthly: [
        { m: '2026-08', delta: 4000000 }, { m: '2026-09', delta: 4000000 },
        { m: '2026-10', delta: 4000000 }, { m: '2026-11', delta: 4000000 },
        { m: '2026-12', delta: 4000000 },
        { m: '2027-01', delta: 5000000 }, { m: '2027-02', delta: 5000000 },
        { m: '2027-03', delta: 5000000 }, { m: '2027-04', delta: 5000000 },
        { m: '2027-05', delta: 5000000 }, { m: '2027-06', delta: 3000000 },
        { m: '2027-07', delta: 2000000 },
      ],
      impact: '경비 CP한도 50,000,000원을 정확히 채웁니다(잔여 0원).',
    },

    /* ⑤ A/S비 — 편성할 것이 없음을 알려 줍니다 */
    {
      id: 'cr-05', pjt: 'credit', acct: 'A/S Cost', status: 'pending', confidence: 1,
      detectedAt: '2026-08-05 09:10', trigger: 'PMO CP 상세정보 수신', notice: true,
      title: 'A/S비는 CP가 0원이라 편성할 것이 없습니다',
      legs: [{ acct: 'A/S Cost', delta: 0 }],
      why: '선행 시스템에서 A/S비 CP가 0원으로 내려왔습니다. 이 계약에는 무상 하자보수 기간의 원가가 반영되지 않았다는 뜻입니다. 편성할 것이 없으니 확인만 해 주시면 이 항목은 목록에서 내려갑니다. A/S가 실제로 필요해지면 다른 계정에서 이관하거나 CP 변경을 선행 시스템에 요청해야 합니다.',
      source: {
        main: 'PMO 계약원가(CP) 상세정보',
        ifAt: '2026-08-01 08:30', ifFrom: 'PMO → 예산관리 Agent',
        ifBody: 'A/S Cost 0원 · 세부정보 없음',
        judgedAt: '2026-08-05 09:10',
        facts: [
          'CP가 0원인 계정은 Agent가 임의로 금액을 만들지 않습니다',
          '집행이 필요해지면 계정 간 이관 또는 CP 변경 요청이 선행되어야 합니다',
        ],
      },
      monthly: [],
      impact: '금액 변동 없음(±0원). 확인 처리만 하는 항목입니다.',
    },
  ];
}

/* ── 외주비 제안은 업체별 편성 분기(toQ)에서 파생됩니다 ────────────────────
   PM이 대화로 "4분기까지" 근거를 주면 toQ 만 늘리고 이 함수가 금액·월별·품목·
   문구를 다시 만듭니다. 제안이 한 건으로 유지되므로 기안도 한 번이면 됩니다. */
function agentOsRebuildFinal() {
  const p = agentFindProposalFinal('cr-02');
  if (!p || !p.vendors) return null;
  const vs = p.vendors;
  const maxQ = Math.max.apply(null, vs.map(v => v.toQ));
  const perMonth = {};
  AGENT_CREDIT_MONTHS_FINAL.forEach(m => { perMonth[m] = 0; });
  vs.forEach(v => {
    for (let q = 1; q <= v.toQ; q++) {
      agentCreditMonthsOfQFinal(q).forEach(m => { perMonth[m] += v.perMonth; });
    }
  });
  const monthly = AGENT_CREDIT_MONTHS_FINAL
    .filter(m => perMonth[m] > 0).map(m => ({ m, delta: perMonth[m] }));
  const total = monthly.reduce((t, x) => t + x.delta, 0);
  const cp = AGENT_PJT_CP_FINAL.credit.budgets['외주비'];
  const qLabel = maxQ > 1 ? `1~${maxQ}분기` : '1분기';

  p.legs = [{ acct: '외주비', delta: total }];
  p.monthly = monthly;
  p.items = vs.map(v => ({
    name: v.vendor + ' · ' + v.part,
    kind: v.toQ > 1 ? '견적확정 + 대화 근거' : '견적확정',
    amount: v.perMonth * 3 * v.toQ,
    plan: `월 ${fmt(v.perMonth)}원 × 1~${v.toQ}분기 · ${v.quoteNo}`,
  }));
  p.title = `확정된 외주 견적 ${vs.length}건(${qLabel})을 외주비로 편성합니다`;
  p.detectedAt = maxQ > 1 ? '2026-08-05 09:40' : '2026-08-05 09:10';
  p.trigger = maxQ > 1 ? '구매 견적확정 I/F + PM 대화 근거' : '구매 견적확정 I/F 수신 (3개 업체)';
  p.confidence = maxQ > 1 ? 0.82 : 0.95;
  p.impact = `외주비 CP한도 ${fmt(cp)}원 이내(잔여 ${fmt(cp - total)}원). 승인하면 ${vs.length}개 업체 PO를 ${qLabel} 범위에서 발행할 수 있습니다.`;
  p.why = maxQ > 1
    ? `견적이 확정된 ${vs.length}개 업체의 1분기 계획을 세운 뒤, PM이 남긴 근거로 ${maxQ}분기까지 같은 단가로 이어 붙였습니다. 계획 라인이 있어야 PO를 발행할 수 있어 분기별로 라인을 나눠 두었습니다. 견적이 실제로 확정되면 확정 금액으로 다시 계산해 차액만 알려드립니다.`
    : `견적이 확정된 ${vs.length}개 업체의 1분기(2026-08~10) 계획 라인만 편성했습니다. 외주비는 계획 라인이 있어야 PO를 발행할 수 있어, 확정된 견적부터 먼저 세웁니다. 2분기 이후는 견적이 오지 않아 비워 두었습니다.`;
  p.source.facts = [
    '업체별 계획 라인을 각각 만들어야 PO가 그 범위 안에서 발행됩니다',
  ].concat(vs.map(v => `${v.vendor} · 월 ${fmt(v.perMonth)}원 × 1~${v.toQ}분기 = ${fmt(v.perMonth * 3 * v.toQ)}원`))
   .concat([maxQ >= 4
      ? '4분기까지 편성 완료 — 견적확정 I/F가 도착하면 확정 금액으로 자동 재계산됩니다'
      : `${maxQ + 1}분기 이후는 견적 미수신 — 편성하지 않았습니다 (CP 잔여 ${fmt(cp - total)}원)`]);
  if (p.chatBasis) {
    p.source.main = '구매시스템 견적확정 I/F + PM 대화 근거';
    p.source.ifAt = p.chatBasis.at;
    p.source.ifFrom = 'PM 이봄 → 예산관리 Agent';
    p.source.ifBody = `"${p.chatBasis.text}"`;
    p.source.judgedAt = p.chatBasis.at;
  }
  return { p, total, maxQ, vendors: vs };
}

/* ── 프로젝트 데이터를 "편성 전" 상태로 세팅 ─────────────────────────────── */
var agentCreditReadyFinal = false;
function agentEnsureCreditFinal() {
  if (agentCreditReadyFinal) return;
  if (typeof BUDGET_SOURCE === 'undefined' || typeof budgetMockMonth !== 'function') return;
  // dashboard.js 가 아직 이 프로젝트를 만들지 않았으면 여기서 만듭니다(로드 순서 의존 제거).
  if (!BUDGET_SOURCE.credit) {
    BUDGET_SOURCE.credit = { projName: '차세대 여신심사 시스템 구축', stage: '편성', dplus: 5,
      start: '2026-08', end: '2027-07', current: '2026-08',
      plan: {}, transfer: {}, months: [] };
    if (typeof EXEC_BUDGET_PROJECTS !== 'undefined'
        && !EXEC_BUDGET_PROJECTS.some(x => x.key === 'credit')) {
      EXEC_BUDGET_PROJECTS.unshift({ key: 'credit', no: '30130020-D001',
        name: '차세대 여신심사 시스템 구축', type: 'SI-AD', status: '수행', pm: '이봄',
        salesOrg: '금융·데이터사업본부', customer: 'KB국민은행', period: '2026-08-01 ~ 2027-07-31' });
    }
  }
  agentCreditReadyFinal = true;

  const cp = AGENT_PJT_CP_FINAL.credit.budgets;
  const src = BUDGET_SOURCE.credit;
  src.stage = '편성';
  src.dplus = 5;
  src.start = AGENT_CREDIT_MONTHS_FINAL[0];
  src.end = AGENT_CREDIT_MONTHS_FINAL[AGENT_CREDIT_MONTHS_FINAL.length - 1];
  src.current = '2026-08';
  // 배율 왜곡을 없애려면 원천 plan 과 CP 가 같아야 합니다(budget-status-4 의 스냅샷 적용 규칙).
  src.plan = Object.assign({}, cp);
  src.transfer = { 인건비: 0, 외주비: 0, 재료비: 0, 경비: 0, 'A/S Cost': 0 };
  // 편성 전이므로 모든 월이 0원 — 예산이 없으면 실적도 발생할 수 없습니다.
  src.months = AGENT_CREDIT_MONTHS_FINAL.map(m =>
    budgetMockMonth(m, 'plan', { labor: 0, outsource: 0, material: 0, expense: 0 }));

  // 프로젝트 목록에 표기된 기간도 12개월(4분기)로 맞춥니다.
  if (typeof EXEC_BUDGET_PROJECTS !== 'undefined') {
    const row = EXEC_BUDGET_PROJECTS.find(x => x.key === 'credit');
    if (row) { row.period = '2026-08-01 ~ 2027-07-31'; row.status = '수행'; }
  }

  // 정진 님 시나리오 To-Do 는 Agent 콘솔 제안으로 대체합니다(같은 화면에 두 벌이 뜨지 않게).
  for (let i = AGENT_PROPOSALS_FINAL.length - 1; i >= 0; i--) {
    if (AGENT_PROPOSALS_FINAL[i].pjt === 'credit') AGENT_PROPOSALS_FINAL.splice(i, 1);
  }
  agentCreditProposalsFinal().forEach(p => AGENT_PROPOSALS_FINAL.push(p));
  agentOsRebuildFinal();
}

// 시나리오 To-Do 재동기화가 돌아도 credit 제안을 덮어쓰지 않게 막습니다.
if (typeof syncScenProposals === 'function') {
  var syncScenProposalsBeforeAgentFinal = syncScenProposals;
  syncScenProposals = function () {
    if (agentCreditReadyFinal) return;      // Agent 콘솔이 이미 credit 제안을 소유
    return syncScenProposalsBeforeAgentFinal();
  };
  window.syncScenProposals = syncScenProposals;
}

/* ── 최초 편성 프로젝트의 계정 금액은 "승인된 제안"에서만 나옵니다 ──────────
   계정 탭 상세 데이터(외주 업체·경비 세부계정 등)는 프로젝트 구분이 없어서
   그대로 쓰면 편성 전인데도 금액이 잡힙니다. 이 프로젝트는 BUDGET_SOURCE 와
   승인된 제안만 보고 계산합니다 — 편성 전에는 전부 0원입니다. */
function agentCreditMonthlyFinal(acct) {
  const m = {};
  AGENT_CREDIT_MONTHS_FINAL.forEach(x => { m[x] = 0; });
  AGENT_PROPOSALS_FINAL.forEach(p => {
    if (p.pjt !== 'credit' || p.status !== 'confirmed' || p.acct !== acct) return;
    (p.monthly || []).forEach(x => { if (m[x.m] !== undefined) m[x.m] += x.delta; });
  });
  return m;
}
if (typeof getMonthlyBudgetRows === 'function') {
  var getMonthlyBudgetRowsBeforeCreditFinal = getMonthlyBudgetRows;
  getMonthlyBudgetRows = function (data, account) {
    const first = AGENT_PJT_CP_FINAL[typeof currentBudgetProj !== 'undefined' ? currentBudgetProj : ''];
    if (!first) return getMonthlyBudgetRowsBeforeCreditFinal(data, account);
    const mm = agentCreditMonthlyFinal(account);
    const months = (data.months || []).map(mo => mm[mo.m] || 0);
    const plan = months.reduce((s, v) => s + v, 0);
    return [{ name: account + ' 편성', plan, actual: 0, remain: plan, months }];
  };
}

/* ── 원가현황에서 이 프로젝트를 고르면 바로 원가조정으로 ────────────────────
   최초 편성 프로젝트는 볼 이력이 없습니다. 목록에서 누르면 조정 화면으로 보냅니다. */
if (typeof openBudgetProjectScreen === 'function') {
  var openBudgetProjectScreenBeforeAgentFinal = openBudgetProjectScreen;
  openBudgetProjectScreen = function (projectKey) {
    if (AGENT_PJT_CP_FINAL[projectKey]) {
      costMode = 'adjust';                      // 이력이 아니라 편성(조정) 화면으로
      if (typeof agentEnsureCreditFinal === 'function') agentEnsureCreditFinal();
    }
    return openBudgetProjectScreenBeforeAgentFinal(projectKey);
  };
  window.openBudgetProjectScreen = openBudgetProjectScreen;
}

/* ── 계정 내역 보기 — 최초 편성 프로젝트 전용 ─────────────────────────────
   편성 전이라 보여 줄 "내역"이 없습니다. 대신 CP 한도와, Agent 초안이 이 계정을
   어떻게 채우는지(근거·품목·월별 배분)를 그대로 펼쳐 보여 줍니다. */
/* 최초 편성 프로젝트의 계정 내역 — 일반 예산내역과 완전히 같은 양식을 씁니다.
   금액은 Agent 초안(기안에 담길 내역)을 그대로 반영합니다. 근거·감지 소스는 여기에 두지 않습니다
   (해야 할 일에서 보는 것이 제자리입니다). */
var agentFdKindFinal = {};        // { 계정: 선택된 상세계정 index }
var agentFdTreeFinal = {};        // { 계정: 상세계정 행 펼침 }
function agentFdKindSetFinal(acct, i) { agentFdKindFinal[acct] = i; renderBudgetPage(); }
function agentFdTreeToggleFinal(acct) { agentFdTreeFinal[acct] = !agentFdTreeFinal[acct]; renderBudgetPage(); }

function renderAgentFirstDraftAccountFinal(data, account) {
  const mine = AGENT_PROPOSALS_FINAL.filter(p => p.pjt === currentBudgetProj && p.acct === account
    && (p.status === 'pending' || p.status === 'submitted' || p.status === 'confirmed'));
  const months = (data.months || []).map(mo => mo.m);
  const m = {};
  months.forEach(x => { m[x] = 0; });
  mine.forEach(p => (p.monthly || []).forEach(x => { if (m[x.m] !== undefined) m[x.m] += x.delta; }));
  const plan = months.reduce((t, x) => t + m[x], 0);
  const drafting = mine.some(p => p.status !== 'confirmed');
  const stateChip = !mine.length ? '' : drafting
    ? `<span class="labor-acct-count agfd-chip">${mine.some(p => p.status === 'submitted') ? '결재 대기' : '기안 예정'}</span>`
    : '<span class="labor-acct-count agfd-chip ok">편성 완료</span>';

  // 상세계정 탭 — 계정의 상세계정 이름을 그대로 씁니다(초안은 첫 상세계정에 담깁니다).
  const kinds = (typeof getAccountDetailRows === 'function' ? getAccountDetailRows(account) : []) || [];
  const kIdx = Math.min(agentFdKindFinal[account] || 0, Math.max(kinds.length - 1, 0));
  const tabs = kinds.length ? `
    <div class="os-kind-tabs os-kind-tabs-strong bpo-kind-tabs">
      ${kinds.map((k, i) => `
        <button class="${i === kIdx ? 'active' : ''}" onclick="agentFdKindSetFinal('${account}',${i})">
          <em>0${i + 1}</em><strong>${escHtml(k.name)}</strong>
          <span>${i === 0 ? (plan ? fmt(plan) + '원' : '편성 없음') : '편성 없음'}</span>
        </button>`).join('')}
    </div>` : '';

  /* ── 계정별 요약 + 목록 ── */
  const p1 = mine.find(p => p.persons);
  const p2 = mine.find(p => p.vendors);
  const p3 = mine.find(p => p.items && !p.vendors);
  const p4 = mine.find(p => p.breakdown);
  let sum = '', list = '', monthly = '';

  const summary = (cells, note) => `
    <div class="os-sub-summary labor-scm-summary">
      ${cells.map(c => `<div><strong>${c[0]}</strong><span>${c[1]}</span></div>`).join('')}
      <p>${escHtml(note)}</p>
    </div>`;
  const table = (head, body, foot) => `
    <div class="account-monthly-scroll" style="border-radius:12px">
      <table class="agfd-list" style="background:#fff">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        ${foot ? `<tfoot><tr>${foot}</tr></tfoot>` : ''}
      </table>
    </div>`;

  if (p1) {
    const mm = p1.persons.reduce((t, x) => t + x.mm, 0);
    sum = summary([[p1.persons.length, '등록 인력'], [mm.toFixed(1) + 'MM', '총 MM'],
                   [fmt(agentNetFinal(p1)) + '원', 'SCM 확정 금액']],
      '인건비 신규 등록은 SCM 확정완료 인력만 가능합니다. Agent가 수신한 확정 인력을 그대로 담았습니다.');
    list = table(
      '<th>인력</th><th>P레벨</th><th>투입기간</th><th class="num">총MM</th><th class="num">단가</th><th class="num">금액</th><th>상태</th>',
      p1.persons.map(x => `
        <tr><td class="acct-name"><b>${escHtml(x.name)}</b></td><td>${x.grade}</td><td>${x.period}</td>
          <td class="num">${x.mm.toFixed(1)}MM</td><td class="num">${fmt(x.unit)}</td>
          <td class="num"><b>${fmt(x.amount)}원</b></td>
          <td><em class="agfd-badge ok">SCM 확정완료</em></td></tr>`).join(''),
      `<td>합계 ${p1.persons.length}명</td><td></td><td></td><td class="num">${mm.toFixed(1)}MM</td><td></td>
       <td class="num">${fmt(agentNetFinal(p1))}원</td><td></td>`);
  } else if (p2) {
    const maxQ = Math.max.apply(null, p2.vendors.map(v => v.toQ));
    sum = summary([[p2.vendors.length, '등록 업체'], [maxQ > 1 ? `1~${maxQ}분기` : '1분기', '편성 분기'],
                   [fmt(agentNetFinal(p2)) + '원', '계획 라인 합계']],
      '외주비는 계획 라인이 있어야 그 범위 안에서 PO를 발행할 수 있습니다. 업체별로 라인을 나눠 담았습니다.');
    list = table(
      '<th>업체</th><th>계약 내용</th><th class="num">월 단가</th><th>편성 분기</th><th class="num">금액</th><th>견적번호</th>',
      p2.vendors.map(v => `
        <tr><td class="acct-name"><b>${escHtml(v.vendor)}</b></td><td>${escHtml(v.part)}</td>
          <td class="num">${fmt(v.perMonth)}원</td><td>1~${v.toQ}분기</td>
          <td class="num"><b>${fmt(v.perMonth * 3 * v.toQ)}원</b></td>
          <td>${v.quoteNo}</td></tr>`).join(''),
      `<td>합계 ${p2.vendors.length}개 업체</td><td></td><td></td><td></td>
       <td class="num">${fmt(agentNetFinal(p2))}원</td><td></td>`);
  } else if (p3) {
    sum = summary([[p3.items.length, '구매 품목'], ['일괄 발주', '구매 방식'],
                   [fmt(agentNetFinal(p3)) + '원', '확정 견적 합계']],
      '구매는 일괄 발주라 계획을 쪼개지 않았고, 검수만 납품·설치 일정에 맞춰 분기로 배분했습니다.');
    list = table(
      '<th>품목</th><th>구분</th><th class="num">금액</th><th>발주·검수 일정</th>',
      p3.items.map(x => `
        <tr><td class="acct-name"><b>${escHtml(x.name)}</b></td>
          <td><em class="agfd-badge">${escHtml(x.kind)}</em></td>
          <td class="num"><b>${fmt(x.amount)}원</b></td><td>${escHtml(x.plan)}</td></tr>`).join(''),
      `<td>합계 ${p3.items.length}건</td><td></td><td class="num">${fmt(agentNetFinal(p3))}원</td><td></td>`);
  } else if (p4) {
    const b = p4.breakdown;
    sum = summary([[b.rows.length, '세부계정'], ['연단위', '릴리즈 단위'],
                   [fmt(b.total) + '원', 'CP 상세정보 합계']],
      '경비는 선행 시스템이 CP를 수립할 때 입력한 상세정보를 Agent가 읽어 옮겨 담습니다.');
    list = table(
      '<th>세부계정</th><th class="num">금액</th><th>출처</th>',
      b.rows.map(x => `
        <tr><td class="acct-name"><b>${escHtml(x.label)}</b></td>
          <td class="num"><b>${fmt(x.amount)}원</b></td><td>${escHtml(x.src)}</td></tr>`).join(''),
      `<td>합계 ${b.rows.length}건</td><td class="num">${fmt(b.total)}원</td><td></td>`);
  } else {
    sum = summary([['0원', 'CP 한도'], ['0원', 'Agent 초안'], ['0건', '편성 내역']],
      'CP가 0원인 계정은 Agent가 임의로 금액을 만들지 않습니다. 집행이 필요해지면 계정 간 이관이나 CP 변경이 선행되어야 합니다.');
  }

  // 첫 상세계정 외의 탭을 고르면 그 상세계정의 내역(아직 비어 있음)을 보여 줍니다.
  if (kinds.length && kIdx > 0) {
    const kn = kinds[kIdx].name;
    sum = summary([['0건', '등록 내역'], ['0원', '계획(전체)'], ['0원', '계획(미집행)']],
      `${kn}에는 아직 편성된 내역이 없습니다. Agent 초안은 ${kinds[0].name}에 담겨 있습니다 — 01 탭에서 확인하세요.`);
    list = `<div class="ag-empty">${escHtml(kn)} 내역이 없습니다.</div>`;
    monthly = '';
  }

  // 월별 반영 내역 — 계정마다 같은 카드 형태로 둡니다.
  const span = months.filter(x => m[x] > 0);
  if (span.length) {
    const mmPer = p1 ? (p1.persons.reduce((t, x) => t + x.mm, 0) / span.length) : 0;
    monthly = `
      <div class="labor-card labor-scm-detail-card">
        <div class="labor-flow-title">
          <strong>${account} 월별 반영 내역</strong>
          <span class="os-kind-caption">Agent 초안 기준 · ${span.length}개월 · 합계 ${fmt(plan)}원</span>
        </div>
        <div class="agfd-mcards">
          ${span.map(x => `
            <div class="agfd-mcard"><em>${x}</em>${p1 ? `<b>${mmPer.toFixed(1)}MM</b>` : ''}<span>${fmt(m[x])}원</span></div>`).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="account-monthly-card" style="border:0 !important;background:transparent !important;padding:0 !important;border-radius:0 !important">
      <div class="account-monthly-head">
        <div><span></span><strong>${account} 예산내역</strong></div>
        <div class="account-monthly-actions">
          <button class="labor-sub-btn" onclick="showToast('편성 후 내려받을 수 있습니다.')">엑셀</button>
          <button class="labor-main-btn teal" onclick="showToast('편성 전이라 조회할 실적이 없습니다.')">${account} 실적조회</button>
        </div>
      </div>
      <div class="account-monthly-scroll" style="border-top:0 !important;border-radius:0 !important">
        <table class="account-monthly-table" style="background:#fff">
          <thead>
            <tr><th>구분</th><th>계획(전체)</th><th>실적(확정)</th><th>계획(미집행)</th>
              ${months.map(x => `<th>${x}</th>`).join('')}</tr>
          </thead>
          <tbody>
            <tr class="labor-acct-parent">
              <td class="acct-name" onclick="agentFdTreeToggleFinal('${account}')">
                ${kinds.length ? `<button class="labor-acct-toggle" aria-expanded="${!!agentFdTreeFinal[account]}"
                  title="${agentFdTreeFinal[account] ? '접기' : '펼치기'}"
                  onclick="event.stopPropagation();agentFdTreeToggleFinal('${account}')">${agentFdTreeFinal[account] ? '∧' : '∨'}</button>` : ''}
                ${account}
                ${kinds.length ? `<span class="labor-acct-count">상세계정 ${kinds.length}</span>` : ''}${stateChip}</td>
              <td class="num">${fmt(plan)}</td>
              <td class="num">0</td>
              <td class="num">${fmt(plan)}</td>
              ${months.map(x => `<td class="num">${m[x] ? fmt(m[x]) : '0'}</td>`).join('')}
            </tr>
            ${agentFdTreeFinal[account] ? kinds.map((k, i) => `
              <tr class="labor-acct-child ${i === kIdx ? 'on' : ''}" onclick="agentFdKindSetFinal('${account}',${i})">
                <td class="acct-name">${escHtml(k.name)}</td>
                <td class="num">${i === 0 ? fmt(plan) : '0'}</td>
                <td class="num">0</td>
                <td class="num">${i === 0 ? fmt(plan) : '0'}</td>
                ${months.map(x => `<td class="num">${i === 0 && m[x] ? fmt(m[x]) : '0'}</td>`).join('')}
              </tr>`).join('') : ''}
          </tbody>
        </table>
      </div>
      ${tabs}
      ${sum}
      ${list}
      ${monthly}
    </div>`;
}

/* ── [Agent와 대화하기] 를 편성 근거 창구로 ───────────────────────────────
   PM이 "테크노아이티는 4분기까지 동일한 견적으로 구매 진행될 예정입니다" 처럼
   앞으로의 계획을 남기면, Agent가 그 대화를 근거로 편성 제안을 만들어 올립니다. */

// 대화에서 "어느 업체를 어느 분기까지" 인지를 읽습니다.
//   · 업체명을 쓰면 그 업체만, "3개 업체 / 모든 업체 / 전체" 면 확정 견적 전체
//   · "N분기까지" / "끝까지" 로 목표 분기를 잡습니다
function agentReadEvidenceFinal(text, ctxId) {
  const cr = agentFindProposalFinal('cr-02');
  const vs = (cr && cr.vendors) || [];
  if (!vs.length) return null;
  // 계정 상세의 대화창에서 물으면 그 제안이 문맥입니다 — "해당 외주계획"이 곧 이 업체들입니다.

  const qm = text.match(/([1-4])\s*분기/);
  let toQ = qm ? Number(qm[1]) : 0;
  if (!toQ && /(끝|종료|만료|전체\s*기간|프로젝트\s*끝)/.test(text)) toQ = 4;
  if (!toQ) return null;

  const named = vs.filter(v => text.indexOf(v.vendor) >= 0);
  const allWord = /(\d\s*개\s*업체|모든\s*업체|전체\s*업체|업체\s*전체|확정된?\s*업체|세\s*업체|모두)/.test(text);
  // 다른 계정을 콕 집어 말한 경우는 외주비 계획으로 오해하지 않습니다.
  const otherAcct = /(인건비|재료비|경비|A\/S|AS비)/.test(text) && !/외주/.test(text);
  const ctxWord = !otherAcct
    && /(해당|이|위|지금).{0,4}(외주|계획|건|제안)|외주\s*계획|계획을?\s*수립|예산\s*수립|편성/.test(text);
  const targets = named.length ? named : ((allWord || ctxWord) ? vs.slice() : []);
  if (!targets.length) return null;
  if (!targets.some(v => toQ > v.toQ)) return null;      // 이미 그 분기까지 편성됨

  return { targets, toQ, text, all: !named.length };
}

// 대화 근거로 편성 분기를 늘립니다 — 제안은 한 건으로 유지됩니다(기안 1회).
function agentAddEvidenceProposalFinal(ev) {
  const before = agentNetFinal(agentFindProposalFinal('cr-02'));
  ev.targets.forEach(v => { if (ev.toQ > v.toQ) v.toQ = ev.toQ; });
  const cr = agentFindProposalFinal('cr-02');
  cr.chatBasis = { text: ev.text, at: '2026-08-05 09:40' };
  AGENT_LOG_FINAL.unshift({
    at: cr.chatBasis.at, acct: '외주비', actor: '이봄(PM)', decision: 'manual',
    reason: `대화 근거 접수 — ${ev.text}`,
    dialog: [{ who: 'agent', text: `근거를 반영해 외주비 계획을 ${ev.toQ}분기까지 늘렸습니다.` }],
  });
  const r = agentOsRebuildFinal();
  r.before = before;
  r.added = r.total - before;
  r.ev = ev;
  return r;
}

/* ── [2026.09.01] 인건비 계정 내역의 PM 안내 배너 제거 ────────────────────
   SCM 인력 확정 수신 / OT비 실적 발생 / P레벨 단가 확정 — 세 배너는
   "PM이 알아채고 처리하라"는 안내입니다. 지금은 Agent가 같은 신호를 먼저 감지해
   [해야 할 일] 제안으로 올리므로 중복이라 띄우지 않습니다.
   초안(8/27 이전) 화면은 개편 전 모습이라 그대로 둡니다. */
if (typeof renderLaborAlertsFinal === 'function') {
  var renderLaborAlertsBeforeAgentFinal = renderLaborAlertsFinal;
  renderLaborAlertsFinal = function () {
    if (agentViewFinal === 'draft') return renderLaborAlertsBeforeAgentFinal();
    return '';
  };
}

/* ==========================================================================
   17. [2026.08.31] 기안(상신 묶음) 단위 결재
       · 같은 계정이 여러 건 올라오면 변경 전/후를 합산해 한 줄로 보여줍니다.
       · 결재 건수는 계정 수와 무관하게 기안 1건 = 1건으로 셉니다.
       · 승인·반려는 계정별이 아니라 기안건 전체에 대해 한 번에 처리합니다.
   ========================================================================== */

var agentDraftSeqFinal = 0;
var agentExecOpenFinal = '';        // 펼쳐 본 "기안id|계정"

function agentDraftToggleFinal(key) {
  agentExecOpenFinal = agentExecOpenFinal === key ? '' : key;
  renderBudgetPage();
}

// 상태별 기안 묶음 — 상신 시 부여한 draftId 로 묶습니다.
function agentDraftsFinal(status) {
  const map = {};
  AGENT_PROPOSALS_FINAL.forEach(p => {
    if (p.status !== status || !p.draftId || !agentInCurPjtFinal(p)) return;
    if (!map[p.draftId]) {
      map[p.draftId] = {
        id: p.draftId, no: p.draftNo, items: [],
        approver: p.approver, at: p.submittedAt, note: p.draftNote,
        returnReason: p.returnReason, returnedAt: p.returnedAt, decidedAt: p.decidedAt,
      };
    }
    map[p.draftId].items.push(p);
  });
  return Object.keys(map).map(k => map[k]);
}

// 계정별 합산 — 같은 계정에 여러 건이면 delta 를 더해 변경 후를 한 번만 계산합니다.
// 기안 묶음과 결재선 팝업(선택한 건들)이 같은 함수를 씁니다.
function agentAggregateLegsFinal(items) {
  const by = {};
  (items || []).forEach(p => {
    (p.legs || []).forEach(l => {
      if (!by[l.acct]) by[l.acct] = { acct: l.acct, from: l.from, delta: 0, reasons: [], manual: null };
      by[l.acct].delta += l.delta;
      // 수동 개입은 계정 금액에만 합산합니다 — 승인자에게 Agent/수동을 나눠 보여주지 않습니다.
      if (p.manual) by[l.acct].manual = { id: p.id, delta: l.delta, why: p.why, dialog: p.dialog };
      else by[l.acct].reasons.push({ id: p.id, title: p.title, delta: l.delta, why: p.why, dialog: p.dialog });
    });
  });
  // 수동 개입만 올라온 계정은 근거가 비므로, 중립적인 한 줄을 만들어 둡니다.
  Object.keys(by).forEach(k => {
    const e = by[k];
    if (e.reasons.length || !e.manual) return;
    e.reasons.push({ id: e.manual.id, title: e.acct + ' 예산을 조정합니다',
      delta: e.delta, why: e.manual.why, dialog: e.manual.dialog });
  });
  const list = Object.keys(by).map(k => by[k]);
  list.forEach(e => { e.to = e.from + e.delta; });
  return agentByAcctFinal(list);
}
function agentDraftLegsFinal(d) { return agentAggregateLegsFinal(d.items); }
function agentDraftNetFinal(d) {
  return agentDraftLegsFinal(d).reduce((t, e) => t + e.delta, 0);
}

/* ── 기안건 단위 승인 / 반려 / 재기안 ── */
function agentDraftApproveFinal(did) {
  const d = agentDraftsFinal('submitted').find(x => x.id === did);
  if (!d) return;
  d.items.forEach(p => { p.status = 'confirmed'; p.decidedAt = '2026-08-31 10:35'; });
  AGENT_LOG_FINAL.unshift({
    at: '2026-08-31 10:35', acct: agentDraftLegsFinal(d).map(e => e.acct).join(', '),
    actor: `${agentMeFinal().name}(${agentMeFinal().role})`, decision: 'approved',
    reason: `기안 ${d.no} 승인 — 계정 ${agentDraftLegsFinal(d).length}개 · 순증감 ${agentDeltaFinal(agentDraftNetFinal(d))}`,
    dialog: [],
  });
  agentApprovalLogFinal(d.items[0], 'confirmed', `${agentMeFinal().name}(${agentMeFinal().role})`,
    `기안 ${d.no} 전체 승인 (${d.items.length}건 · ${agentDraftLegsFinal(d).length}계정)`);
  const ver = (typeof agentVerConfirmVersionFinal === 'function') ? agentVerConfirmVersionFinal(d) : null;
  showToast(ver
    ? `기안 ${d.no}을 승인했습니다. 실행예산 ${ver.label}이 확정되었습니다 (${d.items.length}건 반영).`
    : `기안 ${d.no}을 승인했습니다. ${d.items.length}건이 예산에 반영됩니다.`);
  renderBudgetPage();
}
function agentDraftReturnToggleFinal(did) {
  agentReturnOpenFinal = agentReturnOpenFinal === did ? '' : did;
  renderBudgetPage();
}
function agentDraftReturnFinal(did) {
  const d = agentDraftsFinal('submitted').find(x => x.id === did);
  if (!d) return;
  const el = document.getElementById('agent-return-' + did);
  const reason = el ? el.value.trim() : '';
  if (!reason) { showToast('반려 사유를 입력해 주세요. PM이 다시 검토할 때 근거가 됩니다.'); return; }
  const legs = agentDraftLegsFinal(d);
  const cnt = d.items.length;
  const no = d.no;
  // 기안을 풀고 항목을 검토 대기로 원복합니다 — 반려 사유는 항목에 붙여 둡니다.
  d.items.forEach(p => {
    p.status = 'pending';
    p.approver = null;
    p.draftId = null;
    p.draftNo = null;
    p.draftNote = null;
    p.decidedAt = null;
    p.returnReason = reason;
    p.returnedAt = '2026-08-31 10:35';
    p.returnedFrom = no;
    agentMiniSelFinal[p.id] = false;   // 선택 상태까지 초기화
  });
  AGENT_LOG_FINAL.unshift({
    at: '2026-08-31 10:35', acct: legs.map(e => e.acct).join(', '),
    actor: `${agentMeFinal().name}(${agentMeFinal().role})`, decision: 'rejected',
    reason: `기안 ${no} 반려 — ${reason}`,
    dialog: [{ who: 'agent', text: `반려 사유를 기록하고 ${cnt}건을 [해야 할 일]로 되돌렸습니다: ${reason}` }],
  });
  agentApprovalLogFinal(d.items[0], 'returned', `${agentMeFinal().name}(${agentMeFinal().role})`,
    `기안 ${no} 전체 반려 · ${cnt}건을 검토 대기로 원복 · ${reason}`);
  AGENT_RETURN_NOTICE_FINAL.unshift({
    no, reason, at: '2026-08-31 10:35', seen: false,
    actor: `${agentMeFinal().name}(${agentMeFinal().role})`,
    items: d.items.map(x => ({ acct: x.acct, title: x.title, delta: agentNetFinal(x) })),
  });
  agentReturnOpenFinal = '';
  agentExAlertFinal = '';
  showToast(`기안 ${no}을 반려했습니다. ${cnt}건이 [해야 할 일]로 돌아갔습니다.`);
  renderBudgetPage();
}
function agentDraftRedraftFinal(did) {
  const d = agentDraftsFinal('returned').find(x => x.id === did);
  if (!d) return;
  d.items.forEach(p => { p.status = 'pending'; p.approver = null; p.draftId = null; });
  agentApprovalLogFinal(d.items[0], 'redraft', '이봄(PM)', `기안 ${d.no} 재기안 — ${d.items.length}건 검토 대기로 복귀`);
  showToast(`기안 ${d.no}을 재기안 상태로 되돌렸습니다. 내용을 확인하고 다시 상신하세요.`);
  renderBudgetPage();
}

/* [2026.09.03] 승인자용 — 어떤 계정의 몇 월 금액이 바뀌는지 (요구 5)
   계정을 행, 변동이 있는 월을 열로 둡니다. Agent 제안과 수동 개입은 합산합니다.
   월 배분이 지정되지 않은 건(계정 간 이관 등)은 [월 미지정] 열에 남겨 사실대로 보여 줍니다. */
function agentDraftMonthlyMatrixFinal(d, legs) {
  const by = {}, mset = {};
  (legs || []).forEach(e => { by[e.acct] = { acct: e.acct, months: {}, total: e.delta, sum: 0 }; });
  (d.items || []).forEach(p => {
    (p.monthly || []).forEach(x => {
      const a = by[p.acct];
      if (!a || !x.delta) return;
      a.months[x.m] = (a.months[x.m] || 0) + x.delta;
      a.sum += x.delta;
      mset[x.m] = true;
    });
  });
  const months = Object.keys(mset).sort();
  const rows = Object.keys(by).map(k => by[k]);
  rows.forEach(r => { r.rest = r.total - r.sum; });
  const hasRest = rows.some(r => r.rest !== 0);
  return { months, rows, hasRest };
}

var agentDraftMonOpenFinal = {};
function agentDraftMonToggleFinal(id) {
  agentDraftMonOpenFinal[id] = !agentDraftMonOpenFinal[id];
  renderBudgetPage();
}

function renderAgentDraftMonthlyFinal(d, legs) {
  const mx = agentDraftMonthlyMatrixFinal(d, legs);
  if (!mx.months.length && !mx.hasRest) return '';
  const open = agentDraftMonOpenFinal[d.id] !== false;   // 기본 펼침
  const cell = v => v
    ? `<td class="num ${v > 0 ? 'up' : 'down'}">${agentDeltaFinal(v)}</td>`
    : '<td class="num zero">·</td>';
  return `
    <div class="agdm ${open ? 'open' : ''}">
      <button class="agdm-head" onclick="agentDraftMonToggleFinal('${d.id}')">
        <b>📅 어떤 계정의 몇 월이 바뀌나요</b>
        <span>${mx.rows.length}계정 · 변동 ${mx.months.length}개월</span>
        <i>${open ? '∧' : '∨'}</i>
      </button>
      ${open ? `
        <div class="agdm-scroll">
          <table class="agdm-table">
            <thead><tr>
              <th>계정</th>
              ${mx.months.map(m => `<th class="num">${m}</th>`).join('')}
              ${mx.hasRest ? '<th class="num rest">월 미지정</th>' : ''}
              <th class="num tot">계정 합계</th>
            </tr></thead>
            <tbody>
              ${mx.rows.map(r => `
                <tr>
                  <td><span class="agp-acct sm ${agentAcctColorFinal(r.acct)}">${r.acct}</span></td>
                  ${mx.months.map(m => cell(r.months[m] || 0)).join('')}
                  ${mx.hasRest ? cell(r.rest) : ''}
                  <td class="num tot ${r.total > 0 ? 'up' : r.total < 0 ? 'down' : 'zero'}">${r.total === 0 ? '±0원' : agentDeltaFinal(r.total)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${mx.hasRest ? `
          <p class="agdm-note">[월 미지정]은 아직 월 배분을 정하지 않은 금액입니다. 계정 간 이관처럼 총액만 옮기는 건이 여기에 잡히며, 월 배분은 계정 내역에서 확정합니다.</p>` : ''}` : ''}
    </div>`;
}

/* ── 기안 카드 ── */
function renderAgentDraftRowFinal(d, mode) {
  const legs = agentDraftLegsFinal(d);
  const net = agentDraftNetFinal(d);
  const exec = mode === 'exec';
  const imp = agentCpImpactFinal(legs);   // CP총액·계정 한도 대비 변동
  return `
    <div class="agdr ${d.items[0].status}">
      <div class="agdr-head">
        <div class="agdr-id">
          <b>기안 ${d.no}</b>
          <span>${d.at || ''} · 기안자 이봄(PM) · ${d.items.length}건 / ${legs.length}계정</span>
        </div>
        <em class="agdr-net ${net > 0 ? 'up' : net < 0 ? 'down' : 'zero'}">${net === 0 ? '±0원' : agentDeltaFinal(net)}</em>
        ${exec ? `
          <div class="agdr-acts">
            <button class="agdr-y" onclick="agentDraftApproveFinal('${d.id}')">기안 전체 승인</button>
            <button class="agdr-n" onclick="agentDraftReturnToggleFinal('${d.id}')">기안 전체 반려</button>
          </div>`
        : d.items[0].status === 'returned' ? `
          <div class="agdr-acts">
            <button class="agdr-y" onclick="agentDraftRedraftFinal('${d.id}')">재기안</button>
          </div>`
        : `<span class="agdr-wait">결재 대기 · ${d.approver ? d.approver.title + ' ' + d.approver.name : ''}</span>`}
      </div>

      ${d.items[0].status === 'returned' && d.returnReason ? `
        <div class="agm-return">↩ 직책자 반려 사유 — ${escHtml(d.returnReason)}<span>${d.returnedAt || ''}</span></div>` : ''}

      ${agentReturnOpenFinal === d.id ? `
        <div class="agm-returnbox">
          <b>반려 사유</b>
          <input id="agent-return-${d.id}" type="text" placeholder="예: 27년 조직 개편안 확정 후 다시 올려주세요"
            onkeydown="if(event.key==='Enter') agentDraftReturnFinal('${d.id}')">
          <button onclick="agentDraftReturnFinal('${d.id}')">반려하고 PM에게 반송</button>
        </div>` : ''}

      ${renderAgentCpImpactFinal(legs, { compact: true })}

      <table class="agleg agdr-leg${imp.cp ? ' withcp' : ''}">
        <thead><tr>
          <th>계정</th><th class="num">변경 전</th><th></th><th class="num">변경 후</th><th class="num">증감</th>
          ${imp.cp ? '<th class="num">CP 한도</th><th class="num">한도 대비</th>' : ''}
        </tr></thead>
        <tbody>${legs.map(e => {
          const key = d.id + '|' + e.acct;
          const open = agentExecOpenFinal === key;
          return `
            <tr class="agleg-line ${open ? 'open' : ''}" onclick="agentDraftToggleFinal('${key}')"
              title="${open ? '접기' : 'Agent 판단 근거와 PM 코멘트 보기'}">
              <td><span class="agp-acct sm ${agentAcctColorFinal(e.acct)}">${e.acct}</span>
                ${e.reasons.length > 1 ? `<em class="agleg-cnt">${e.reasons.length}건 합산</em>` : ''}
              </td>
              <td class="num">${fmt(e.from)}</td>
              <td class="agleg-ar">→</td>
              <td class="num to">${fmt(e.to)}</td>
              <td class="num ${e.delta > 0 ? 'up' : e.delta < 0 ? 'down' : ''}">${e.delta === 0 ? '±0원' : agentDeltaFinal(e.delta)}</td>
              ${imp.cp ? (() => {
                const c = agentCpAcctPctFinal(e, imp.cpm);
                if (!c) return '<td class="num agleg-cp">—</td><td class="num agleg-cpr">—</td>';
                return `
                  <td class="num agleg-cp">${fmt(c.cap)}</td>
                  <td class="num agleg-cpr ${c.over ? 'bad' : ''}">
                    ${agentPctFinal(c.before)} <i>→</i> <b>${agentPctFinal(c.after)}</b>
                    ${c.over ? `<em>한도 ${agentDeltaFinal(c.overBy)}</em>` : ''}
                  </td>`;
              })() : ''}
            </tr>
            <tr class="agleg-sub"><td colspan="${imp.cp ? 7 : 5}">
              ${e.reasons.map(r => `
                <div class="agleg-item">
                  <div class="agleg-why">
                    <span>· ${escHtml(r.title)}</span>
                    <em class="${r.delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(r.delta)}</em>
                  </div>
                  ${open ? `
                    <div class="agleg-ground">
                      <p><b>🤖 Agent 판단 근거</b> ${escHtml(r.why)}</p>
                      ${renderAgentExecEvidenceFinal(r.id)}
                      ${renderAgentDialogFinal(r.dialog, true)}
                    </div>` : ''}
                </div>`).join('')}
              ${open ? `
                ${d.note ? `<div class="agexec-note"><b>PM 기안 의견</b><span>${escHtml(d.note)}</span></div>` : ''}
                ${renderAgentManualReasonFinal(e.acct)}
                <div class="agexec-selfhelp">PM에게 따로 묻지 않아도 됩니다 — 위 근거로 부족하면 아래에서 Agent에게 바로 물어보세요.</div>
                <div class="agp-ask">
                  <input id="agent-ask-${e.reasons[0].id}" type="text" placeholder="Agent에게 물어보세요 — 예: 월별로 어떻게 나눠 쓰나요?"
                    onkeydown="if(event.key==='Enter') agentAskFinal('${e.reasons[0].id}')">
                  <button class="agp-ask-btn" onclick="agentAskFinal('${e.reasons[0].id}')">질문</button>
                </div>
                <button type="button" class="agleg-more up" onclick="event.stopPropagation();agentDraftToggleFinal('${key}')">∧ 접기</button>`
              : `<button type="button" class="agleg-more" onclick="event.stopPropagation();agentDraftToggleFinal('${key}')">∨ 이 계정의 Agent 판단 근거·PM 코멘트 보기</button>`}
            </td></tr>`;
        }).join('')}</tbody>
      </table>
      ${renderAgentDraftMonthlyFinal(d, legs)}
    </div>`;
}

/* ==========================================================================
   8. 전용 스타일 주입 (공유 CSS 미변경 — CLAUDE.md 우회 기법 4)
   ========================================================================== */

(function injectAgentStyleFinal() {
  if (document.getElementById('budget-agent-style')) return;
  const style = document.createElement('style');
  style.id = 'budget-agent-style';
  style.textContent = `
  .agent-shell { --agc-line:#e5e7eb; --agc-ink:#0f172a; --agc-mute:#64748b; }

  /* 3안 비교 스위치 */
  /* 스위치는 흰 카드(.setup-overview) 바깥에 놓입니다 — 카드와 시작선을 맞추기 위해 좌우 여백 없이 둡니다 */
  .agent-view-switch { display:flex; align-items:center; gap:2px; flex-wrap:wrap; margin:2px 0 10px; }
  .agent-view-switch:not(.open) { margin:0 0 4px; }
  /* 테스트 설정 토글 — 평소엔 톱니 하나만 */
  .agv-dev { flex:0 0 auto; border:0; background:transparent; color:#dbe1e9;
    border-radius:7px; padding:2px 6px; font:inherit; font-size:12px; font-weight:800;
    line-height:1.4; cursor:pointer; }
  .agv-dev:hover { color:#64748b; background:#f1f5f9; }
  .agv-dev.on { color:#475569; background:#eef2f7; margin-right:6px; }
  .agent-view-switch .agv-tag { font-size:11.5px; font-weight:800; color:#b45309;
    background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:4px 9px; white-space:nowrap; }
  .agv-btn { border:0; background:transparent; color:#d3dae4; border-radius:7px;
    padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; }
  .agv-btn:first-child { padding-left:0; }
  .agv-btn:hover { color:#64748b; background:#f1f5f9; }
  .agv-btn.on { color:#475569; background:#eef2f7; }
  /* PERSONA 는 안 선택 버튼과 같은 행 우측 끝 */
  .agv-right { margin-left:auto; display:flex; align-items:center; }
  .agv-right .agent-persona { margin:0; }

  .agv-btn:first-of-type.on { color:#a45b06; background:#fff7e6; }

  /* 탭 */
  .agent-tabs { display:inline-flex; gap:4px; background:#fff; border:1px solid var(--agc-line);
    border-radius:12px; padding:6px; margin:0 0 14px; }
  .agt-tab { border:0; background:transparent; border-radius:9px; padding:9px 18px;
    font-size:15px; font-weight:800; color:#6b7480; cursor:pointer; white-space:nowrap; }
  .agt-tab:hover { background:#f3f6fb; color:var(--agc-ink); }
  .agt-tab.active { background:var(--agc-ink); color:#fff; }
  .agt-badge { margin-left:7px; font-style:normal; font-size:11px; font-weight:800;
    background:#ea002c; color:#fff; border-radius:999px; padding:2px 7px; }
  .agt-tab.active .agt-badge { background:#fff; color:var(--agc-ink); }

  /* Agent 상태 스트립 */
  .agent-status { border:1px solid #d9def0; border-radius:16px; background:linear-gradient(180deg,#f7f8ff,#fff 70%); padding:14px 16px; margin:0 0 16px; }
  .ags-head { display:flex; align-items:center; gap:12px; }
  .ags-avatar { flex:0 0 auto; width:38px; height:38px; border-radius:12px; background:#eef2ff;
    border:1px solid #c7d2fe; display:inline-flex; align-items:center; justify-content:center; font-size:20px; }
  .ags-id strong { display:block; font-size:16px; font-weight:900; color:var(--agc-ink); }
  .ags-id strong em { font-style:normal; font-weight:700; color:#4338ca; margin-left:2px; }
  .ags-id span { display:block; margin-top:3px; font-size:12.5px; color:var(--agc-mute); line-height:1.6; }
  .ags-recheck { margin-left:auto; flex:0 0 auto; border:1px solid #c7d2fe; background:#fff; color:#4338ca;
    border-radius:999px; padding:7px 14px; font-size:13px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .ags-recheck:hover { background:#eef2ff; }

  /* 섹션 */
  .agent-section { margin:0 0 16px; }
  .ag-sec-head { display:flex; flex-direction:column; gap:4px; margin:0 0 9px; }
  .ag-sec-top { display:flex; align-items:center; gap:10px; min-width:0; }
  .ag-sec-head strong { flex:0 0 auto; font-size:15px; font-weight:900; color:var(--agc-ink); }
  .ag-sec-head > span { font-size:12.5px; color:var(--agc-mute); line-height:1.6; }
  /* CP총액 — 제목 줄 우측 끝에 여유·버튼 두 조각만 */
  .agcp-chip { flex:0 1 auto; min-width:0; margin-left:auto; display:inline-flex; align-items:center;
    gap:9px; flex-wrap:nowrap; }
  .agcp-chip .cp-ref-btn { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .agcp-chip em { flex:0 0 auto; display:inline-flex; align-items:baseline; gap:5px;
    font-style:normal; font-size:13px; font-weight:900; color:#12724f;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agcp-chip em i { font-style:normal; font-size:10.5px; font-weight:900; letter-spacing:.04em; color:#94a3b8; }
  .agcp-chip em.bad { color:#b91c1c; }
  .agcp-chip em.bad i { color:#fca5a5; }
  /* 최초 편성 프로젝트의 계정 내역 — 일반 예산내역 양식을 그대로 씁니다.
     추가로 필요한 것만 몇 줄 얹습니다. */
  .agfd-chip { background:#fff7e6 !important; color:#a45b06 !important; border:1px solid #fde68a !important; }
  .labor-acct-child { cursor:pointer; }
  .labor-acct-child.on td { background:#f5f6ff; font-weight:800; }
  .agfd-chip.ok { background:#e9f8f1 !important; color:#12724f !important; border-color:#bfe8d8 !important; }
  .agfd-list td.num, .agfd-list th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agfd-list tfoot td { background:#fbfcfe; font-weight:900; color:var(--agc-ink); }
  .agfd-badge { font-style:normal; font-size:10.5px; font-weight:900; color:#3730a3;
    background:#eef2ff; border-radius:6px; padding:3px 7px; white-space:nowrap; }
  .agfd-badge.ok { color:#12724f; background:#e9f8f1; }
  .agfd-mcards { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:9px; padding:12px 0 0; }
  .agfd-mcard { border:1px solid #fde68a; border-radius:11px; background:#fffdf5; padding:10px 12px; }
  .agfd-mcard em { display:block; font-style:normal; font-size:11.5px; font-weight:800; color:#a45b06; }
  .agfd-mcard b { display:block; margin:4px 0 2px; font-size:17px; font-weight:900; color:var(--agc-ink); }
  .agfd-mcard span { display:block; font-size:11.5px; font-weight:700; color:#c2410c;
    font-variant-numeric:tabular-nums; }

  /* 실행예산 버전 */
  .agver { position:relative; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px; }
  .agver-btn { display:inline-flex; align-items:center; gap:8px; border:1px solid #cbd5e1;
    background:#fff; border-radius:10px; padding:7px 12px; font:inherit; cursor:pointer; }
  .agver-btn:hover { border-color:#6366f1; }
  .agver-btn.draft { border-color:#c7d2fe; background:#f5f6ff; }
  .agver-btn b { font-size:10.5px; font-weight:900; letter-spacing:.04em; color:#94a3b8; }
  .agver-btn > span { font-size:14px; font-weight:900; color:#0f172a; }
  .agver-btn i { font-style:normal; font-size:11.5px; color:#94a3b8; font-variant-numeric:tabular-nums; }
  .agver-btn u { text-decoration:none; font-size:11px; color:#cbd5e1; }
  .agver-st { font-style:normal; font-size:10.5px; font-weight:900; border-radius:6px; padding:2px 7px; white-space:nowrap; }
  .agver-st.ok { color:#12724f; background:#e9f8f1; }
  .agver-st.draft { color:#3730a3; background:#eef2ff; }
  .agver-note { font-size:12px; color:var(--agc-mute); }
  .agver-pop { position:absolute; top:100%; left:0; z-index:60; margin-top:6px; width:min(460px,92vw);
    border:1px solid #e2e8f0; border-radius:14px; background:#fff; padding:7px;
    box-shadow:0 22px 48px -22px rgba(15,23,42,.4); display:flex; flex-direction:column; gap:3px; }
  .agver-opt { display:grid; grid-template-columns:auto auto auto 1fr; grid-auto-rows:auto; gap:4px 8px;
    align-items:center; border:0; background:transparent; border-radius:10px; padding:9px 11px;
    font:inherit; text-align:left; cursor:pointer; }
  .agver-opt:hover { background:#f8fafc; }
  .agver-opt.on { background:#f5f6ff; }
  .agver-opt b { font-size:14px; font-weight:900; color:#0f172a; }
  .agver-opt i { font-style:normal; font-size:11.5px; color:#94a3b8; font-variant-numeric:tabular-nums; }
  .agver-opt > span { grid-column:1/-1; font-size:12px; color:#475569; line-height:1.6; }
  .agver-opt u { grid-column:1/-1; text-decoration:none; font-size:11px; color:#94a3b8; }
  .agver-past { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px;
    border:1px solid #c7d2fe; border-radius:12px; background:#f5f6ff; padding:10px 13px; }
  .agver-past b { font-size:13.5px; font-weight:900; color:#3730a3; }
  .agver-past span { font-size:12px; color:#475569; }
  .agver-past em { font-style:normal; font-size:12px; font-weight:700; color:#4338ca; }
  .agver-past button { margin-left:auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:9px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; }
  .agh-ver { margin-left:auto; font-size:12px; font-weight:800; color:#94a3b8; white-space:nowrap; }
  /* [2026.09.02] 상세 계정 선택을 감싸는 박스는 걷어냅니다 — 제목·설명·탭은 그대로.
     initiation-extra2.css 는 공통 파일이라 이 화면에서만 인라인으로 덮습니다. */
  .agent-shell .cost-category-board {
    margin:0 0 12px !important; padding:0 !important;
    border:0 !important; border-radius:0 !important;
    background:transparent !important; box-shadow:none !important;
  }
  .agent-shell .cost-category-board-head {
    border:0 !important; background:transparent !important; padding:0 0 8px !important;
  }
  .agent-shell .cost-category-board .os-kind-tabs { margin:0 !important; }
  /* 상세 계정 선택·재료비 등록 안내 문구는 없앱니다(탭만 남깁니다) */
  .agent-shell .cost-category-board-head,
  .agent-shell .material-panel > .labor-panel-head { display:none !important; }
  /* 재료비 예산내역 / 상세 계정 선택 / 상품계획 목록·상세를 감싸는 박스 테두리 제거 */
  .agent-shell .outsource-panel.material-panel,
  .agent-shell .material-plan-list-card,
  .agent-shell .material-detail-card,
  .agent-shell .material-panel .account-monthly-card {
    border:0 !important; border-radius:0 !important; box-shadow:none !important;
    background:transparent !important; padding:0 !important;
  }
  .agent-shell .material-plan-list-card,
  .agent-shell .material-detail-card { margin-top:14px !important; }
  /* PO번호·견적번호 길이에 맞춘 열폭 + 수정 열 제거 */
  .agent-shell .os-ma-head.material-item-head,
  .agent-shell .os-ma-row.material-item-row {
    grid-template-columns: 118px 128px minmax(180px,1.4fr) minmax(130px,1fr)
      minmax(140px,1fr) 76px 130px 130px 84px 76px 0 !important;
  }
  .agent-shell .material-item-head > span:last-child,
  .agent-shell .material-item-row .labor-reg-actions { display:none !important; }
  .agent-shell .os-ma-table-wrap { overflow-x:auto; }
  /* 계정 내역을 감싸는 겉박스도 걷어냅니다(인건비는 이미 인라인으로 제거되어 있습니다) */
  .agent-shell .setup-expanded-detail,
  .agent-shell .setup-editor {
    border:0 !important; border-radius:0 !important; box-shadow:none !important;
    background:transparent !important; padding:0 !important;
  }
  /* Agent 제안으로 바뀔 항목 */
  .agchg { border:1px solid #c7d2fe; border-radius:12px; background:#f7f8ff; padding:11px 13px; margin:0 0 12px; }
  .agchg.wait { border-color:#fde68a; background:#fffdf5; }
  .agchg-head { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
  .agchg-head b { font-size:13.5px; font-weight:900; color:#3730a3; }
  .agchg.wait .agchg-head b { color:#a45b06; }
  .agchg-head span { font-size:12px; color:var(--agc-mute); }
  .agchg-head em { margin-left:auto; font-style:normal; font-size:14px; font-weight:900;
    font-variant-numeric:tabular-nums; }
  .agchg-head em.up { color:#c1122f; }
  .agchg-head em.down { color:#1d4ed8; }
  .agchg-head em.hold { font-size:11.5px; font-weight:800; color:#a45b06; }
  .agchg-row { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:8px;
    border:1px solid #e2e8f0; border-radius:10px; background:#fff; padding:8px 11px; }
  .agchg-row.off { opacity:.55; }
  .agchg-n { flex:0 0 auto; font-style:normal; font-size:10.5px; font-weight:900; color:#3730a3;
    background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:2px 7px; }
  .agchg-row b { flex:1 1 auto; min-width:0; font-size:12.5px; font-weight:700; color:#0f172a; }
  .agchg-row i { flex:0 0 auto; font-style:normal; font-size:13px; font-weight:900;
    font-variant-numeric:tabular-nums; color:#64748b; }
  .agchg-row i.up { color:#c1122f; }
  .agchg-row i.down { color:#1d4ed8; }
  .agchg-row u { flex:0 0 auto; text-decoration:none; font-size:11px; font-weight:800; color:#a45b06; }
  .agchg-months { flex:1 1 100%; display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; }
  .agchg-months span { font-size:11px; font-weight:700; color:#4338ca; background:#eef2ff;
    border-radius:6px; padding:3px 7px; font-variant-numeric:tabular-nums; }
  .agchg-foot { margin-top:9px; font-size:11.5px; color:var(--agc-mute); line-height:1.6; }
  /* 제안 반영 후 */
  .aga-after { display:flex; align-items:baseline; gap:6px; margin-top:7px; min-width:0;
    border-top:1px dashed #e2e8f0; padding-top:7px; }
  .aga-after em { flex:0 0 auto; font-style:normal; font-size:10.5px; font-weight:900; color:#94a3b8; white-space:nowrap; }
  .aga-after b { flex:0 1 auto; min-width:0; font-size:15px; font-weight:900; color:#3730a3;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .aga-after b i { font-style:normal; font-size:10.5px; font-weight:700; color:#94a3b8; margin-left:2px; }
  .aga-wait { margin-top:7px; font-size:11px; font-weight:700; color:#a45b06;
    background:#fff7e6; border:1px solid #fde68a; border-radius:7px; padding:5px 8px; line-height:1.5; }
  .agcp-after { color:#3730a3 !important; }
  .agcp-after.bad { color:#b91c1c !important; }
  .agin-table td.after b { color:#3730a3; }
  /* 이력 항목 펼치기 */
  .agl-open { width:100%; border:0; background:transparent; padding:0; font:inherit;
    text-align:left; cursor:pointer; display:block; }
  .agl-open:hover .agl-head b { color:#4338ca; }
  .agl-caret { margin-left:auto; font-style:normal; font-size:13px; font-weight:900; color:#94a3b8; }
  .agl-more { display:block; margin-top:7px; font-size:11.5px; font-weight:800; color:#4338ca; }
  .agent-log.open, .agapl.open { border-color:#c7d2fe; background:#fcfcff; }
  .agver-detail { margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:11px; }
  .agver-cline { display:flex; align-items:center; gap:9px; padding:8px 10px; border:1px solid var(--agc-line);
    border-radius:9px; background:#fff; margin-bottom:5px; }
  .agver-cline b { flex:1 1 auto; min-width:0; font-size:12.5px; font-weight:700; color:#0f172a;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agver-cline em { flex:0 0 auto; font-style:normal; font-size:12px; color:#64748b;
    font-variant-numeric:tabular-nums; }
  .agver-cline button { flex:0 0 auto; border:1px solid #c7d2fe; background:#eef2ff; color:#3730a3;
    border-radius:8px; padding:5px 10px; font:inherit; font-size:11.5px; font-weight:800; cursor:pointer; }

  /* CP총액 — 눌러서 계정별 한도를 펼쳐 보는 참고 칩 */
  .agcp-chip .cp-ref-btn { display:inline-flex; align-items:baseline; gap:7px;
    border:1px solid #e2e8f0; border-radius:9px; background:#fff; color:#0f172a;
    padding:5px 10px; font:inherit; font-size:13px; font-weight:900;
    font-variant-numeric:tabular-nums; cursor:pointer; }
  .agcp-chip .cp-ref-btn b { font-size:10.5px; font-weight:900; letter-spacing:.04em; color:#94a3b8; }
  .agcp-chip .cp-ref-btn u { text-decoration:none; font-size:11px; color:#cbd5e1; }
  .agcp-chip .cp-ref-btn:hover { border-color:#6366f1; background:#f5f6ff; color:#3730a3; }
  .agcp-chip .cp-ref-btn:hover b, .agcp-chip .cp-ref-btn:hover u { color:#6366f1; }
  .agcp-chip .cp-ref-btn.over { border-color:#fca5a5; background:#fef2f2; color:#b91c1c; }
  .ag-empty { border:1px dashed var(--agc-line); border-radius:12px; background:#fbfcfe;
    padding:20px; text-align:center; font-size:13.5px; font-weight:700; color:#94a3b8; }

  /* 계정 배지 */
  .agp-acct { flex:0 0 auto; border-radius:7px; padding:4px 10px; font-size:13px; font-weight:900; white-space:nowrap; }
  .agp-acct.sm { font-size:12px; padding:3px 8px; }
  .agp-acct.a-blue { background:#eaf1ff; color:#1d4ed8; }
  .agp-acct.a-red { background:#ffecef; color:#c1122f; }
  .agp-acct.a-yellow { background:#fff5e5; color:#a45b06; }
  .agp-acct.a-green { background:#e9f8f1; color:#12724f; }
  .agp-acct.a-sky { background:#e8f6ff; color:#0d6f9e; }

  /* 제안 카드 */
  .agent-prop { border:1px solid var(--agc-line); border-radius:14px; background:#fff; margin-bottom:10px; overflow:hidden; }
  .agent-prop.open { border-color:#c7d2fe; box-shadow:0 6px 20px -14px rgba(67,56,202,.45); }
  .agent-prop.approved { background:#fbfefc; }
  .agent-prop.rejected { background:#fcfcfd; opacity:.85; }
  .agp-head { display:flex; align-items:center; gap:12px; width:100%; border:0; background:transparent;
    padding:13px 16px; cursor:pointer; text-align:left; }
  .agp-head:hover { background:#f8fafc; }
  .agp-title { flex:1 1 auto; min-width:0; }
  .agp-title strong { display:block; font-size:15px; font-weight:800; color:var(--agc-ink);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agp-title span { display:block; margin-top:3px; font-size:12px; color:var(--agc-mute); }
  .agp-delta { flex:0 0 auto; font-size:16px; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agp-delta.up { color:#c1122f; }
  .agp-delta.down { color:#1d4ed8; }
  .agp-stamp { flex:0 0 auto; font-size:12px; font-weight:800; border-radius:999px; padding:3px 10px; }
  .agp-stamp.approved { background:#e9f8f1; color:#12724f; }
  .agp-stamp.rejected { background:#f1f5f9; color:#64748b; }
  .agp-caret { flex:0 0 auto; color:#94a3b8; font-weight:900; }
  .agp-body { padding:0 16px 16px; border-top:1px dashed var(--agc-line); }
  .agp-block { margin-top:13px; }
  .agp-block b { display:block; font-size:13px; font-weight:900; color:#4338ca; margin-bottom:5px; }
  .agp-block p { margin:0; font-size:13.5px; color:#334155; line-height:1.7; }
  .agp-block.impact b { color:#0d6f9e; }
  .agp-ev { margin:8px 0 0; padding-left:18px; }
  .agp-ev li { font-size:12.5px; color:var(--agc-mute); line-height:1.8; }
  .agp-amt { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:13px;
    padding:12px 14px; border:1px solid var(--agc-line); border-radius:12px; background:#fbfcfe; }
  .agp-amt-cell span { display:block; font-size:11.5px; font-weight:800; color:#94a3b8; }
  .agp-amt-cell b { display:block; margin-top:3px; font-size:16px; font-weight:900; color:var(--agc-ink); font-variant-numeric:tabular-nums; }
  .agp-amt-cell.to b { color:#4338ca; }
  .agp-amt-cell.d b.up { color:#c1122f; }
  .agp-amt-cell.d b.down { color:#1d4ed8; }
  .agp-arrow { color:#94a3b8; font-weight:900; font-size:18px; }
  .agp-months { margin-left:auto; display:flex; gap:6px; flex-wrap:wrap; }
  .agp-months em { font-style:normal; font-size:11.5px; font-weight:800; color:#475569;
    background:#eef2f7; border-radius:6px; padding:4px 9px; white-space:nowrap; }
  .agp-ask { display:flex; gap:8px; margin-top:13px; }
  .agp-ask input { flex:1 1 auto; min-width:0; height:38px; border:1px solid #cbd5e1; border-radius:10px;
    padding:0 12px; font:inherit; font-size:13.5px; background:#fff; color:var(--agc-ink); }
  .agp-ask input:focus { outline:none; border-color:#6366f1; }
  .agp-ask-btn { flex:0 0 auto; border:1px solid #c7d2fe; background:#eef2ff; color:#4338ca;
    border-radius:10px; padding:0 18px; font-size:13.5px; font-weight:800; cursor:pointer; }
  .agp-decided { margin-top:13px; font-size:12.5px; font-weight:700; color:var(--agc-mute);
    background:#f8fafc; border-radius:9px; padding:9px 12px; }

  /* 대화 */
  .agent-dialog { margin-top:13px; display:flex; flex-direction:column; gap:8px;
    padding:12px 14px; border-radius:12px; background:#f8fafc; border:1px solid var(--agc-line); }
  .agent-dialog.compact { margin-top:9px; padding:10px 12px; }
  .agd-row { display:flex; gap:9px; align-items:flex-start; }
  .agd-who { flex:0 0 68px; font-size:11.5px; font-weight:900; color:#94a3b8; padding-top:3px; }
  .agd-row.agent .agd-who { color:#4338ca; }
  .agd-text { flex:1 1 auto; min-width:0; font-size:13px; line-height:1.7; color:#334155;
    background:#fff; border:1px solid var(--agc-line); border-radius:10px; padding:8px 11px; }
  .agd-row.agent .agd-text { background:#f5f6ff; border-color:#dcdffb; }
  .agd-text.pending { color:#94a3b8; }

  /* 자율처리 · 기안 표 */
  .agent-auto-table, .agent-draft-table { width:100%; border-collapse:collapse; background:#fff;
    border:1px solid var(--agc-line); border-radius:12px; overflow:hidden; }
  .agent-auto-table th, .agent-auto-table td,
  .agent-draft-table th, .agent-draft-table td {
    padding:10px 14px; font-size:13px; text-align:left; border-bottom:1px solid #eef2f7; }
  .agent-auto-table th, .agent-draft-table th { background:#f8fafc; font-size:12px; color:var(--agc-mute); font-weight:900; white-space:nowrap; }
  .agent-auto-table td.num, .agent-draft-table td.num,
  .agent-auto-table th.num, .agent-draft-table th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agt-detail { color:var(--agc-mute); line-height:1.6; }
  .agent-draft-table td.up { color:#c1122f; font-weight:800; }
  .agent-draft-table td.down { color:#1d4ed8; font-weight:800; }
  .agent-draft-table tfoot td { background:#f8fafc; font-weight:900; color:var(--agc-ink); border-bottom:0; }
  .agent-draft-foot { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:11px; }
  .agent-draft-foot span { font-size:13px; font-weight:700; color:var(--agc-mute); }
  .agd-submit { margin-left:auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:11px; padding:11px 20px; font-size:14px; font-weight:900; cursor:pointer; }

  /* 이력 */
  .agent-log { border:1px solid var(--agc-line); border-left:3px solid #cbd5e1; border-radius:12px;
    background:#fff; padding:12px 14px; margin-bottom:9px; }
  .agent-log.approved { border-left-color:#0f9d63; }
  .agent-log.rejected { border-left-color:#94a3b8; }
  .agent-log.manual { border-left-color:#f5a623; }
  .agl-head { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
  .agl-head b { font-size:13.5px; font-weight:800; color:var(--agc-ink); }
  .agl-badge { font-style:normal; font-size:11px; font-weight:900; border-radius:999px; padding:3px 9px; }
  .agl-badge.approved { background:#e9f8f1; color:#12724f; }
  .agl-badge.rejected { background:#f1f5f9; color:#64748b; }
  .agl-badge.manual { background:#fff5e5; color:#a45b06; }
  .agl-meta { margin-left:auto; font-size:11.5px; color:#94a3b8; white-space:nowrap; }
  .agl-amt { margin-top:7px; font-size:13px; color:var(--agc-mute); font-variant-numeric:tabular-nums; }
  .agl-amt b { color:var(--agc-ink); font-weight:900; }
  .agl-amt em { font-style:normal; margin-left:7px; font-weight:900; }
  .agl-amt em.up { color:#c1122f; }
  .agl-amt em.down { color:#1d4ed8; }

  /* 직책자 질의 */
  .agent-qa-input { display:flex; gap:8px; margin:0 0 11px; }
  .agent-qa-input input { flex:1 1 auto; min-width:0; height:40px; border:1px solid #cbd5e1;
    border-radius:11px; padding:0 13px; font:inherit; font-size:13.5px; background:#fff; }
  .agent-qa-input input:focus { outline:none; border-color:#6366f1; }
  .agent-qa-input button { flex:0 0 auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:11px; padding:0 20px; font-size:13.5px; font-weight:800; cursor:pointer; }
  .agent-qa { border:1px solid var(--agc-line); border-radius:12px; background:#fff; padding:12px 14px; margin-bottom:9px; }
  .agq-q { font-size:13.5px; font-weight:800; color:var(--agc-ink); line-height:1.6; }
  .agq-q span { display:inline-block; font-size:11.5px; font-weight:900; color:#a45b06;
    background:#fff5e5; border-radius:6px; padding:3px 8px; margin-right:8px; }
  .agq-q em { font-style:normal; margin-left:8px; font-size:11.5px; font-weight:700; color:#94a3b8; }
  .agq-a { margin-top:9px; font-size:13px; color:#334155; line-height:1.75;
    background:#f5f6ff; border:1px solid #dcdffb; border-radius:10px; padding:10px 12px; }
  .agq-a span { display:inline-block; font-size:11.5px; font-weight:900; color:#4338ca; margin-right:8px; }
  .agq-a.pending { color:#94a3b8; }

  /* 계정 레일 (열람 전용) */
  .agent-acct-rail { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; }
  .agent-acct { border:1px solid var(--agc-line); border-radius:14px; background:#fff; padding:12px 13px;
    min-width:0; cursor:pointer; text-align:left; }
  .agent-acct:hover { border-color:#94a3b8; }
  .agent-acct:focus-visible { outline:2px solid #6366f1; outline-offset:2px; }
  .aga-manual.wide { width:100%; }
  .agent-acct.active { border-color:#0f172a; box-shadow:0 0 0 2px rgba(15,23,42,.08); }
  .agent-acct.unlocked { border-color:#fcd34d; background:#fffdf5; }
  .aga-top { display:flex; align-items:center; gap:7px; }
  .aga-lock { margin-left:auto; font-style:normal; font-size:10.5px; font-weight:800; color:#4338ca;
    background:#eef2ff; border-radius:6px; padding:3px 7px; white-space:nowrap; }
  .aga-lock.open { color:#a45b06; background:#fff5e5; }
  .aga-val { display:block; margin:9px 0 3px; font-size:19px; font-weight:900; color:var(--agc-ink);
    letter-spacing:-.5px; font-variant-numeric:tabular-nums; }
  .aga-val i { font-style:normal; font-size:12px; font-weight:700; color:#94a3b8; margin-left:2px; }
  .aga-sub { font-size:11.5px; color:var(--agc-mute); }
  .aga-pend { margin-top:6px; font-size:11.5px; font-weight:800; color:#b45309;
    background:#fffbeb; border:1px solid #fde68a; border-radius:7px; padding:4px 8px; }
  .aga-acts { display:flex; gap:6px; margin-top:10px; }
  .agent-manual-note { display:flex; align-items:flex-start; gap:10px; }
  .agmn-txt { flex:1 1 auto; min-width:0; }
  .agmn-hint { display:block; margin-top:5px; font-size:12px; font-weight:700; color:#a45b06; line-height:1.6; }
  .agmn-hint.ok { color:#12724f; }
  .agmn-save { flex:0 0 auto; border:1px solid #0f9d63 !important; background:#0f9d63 !important; color:#fff !important; }
  .agmn-save:hover { background:#0b7f50 !important; }
  /* 수동 개입 근거 */
  .agent-manual-why { margin:0 0 12px; border:1px solid #fde68a; background:#fffdf5;
    border-radius:12px; padding:11px 13px; }
  .agent-manual-why.done { border-color:#bfe8d8; background:#f7fdfa; }
  .agmw-head b { font-size:13px; font-weight:900; color:#a45b06; }
  .agent-manual-why.done .agmw-head b { color:#12724f; }
  .agmw-head span { display:block; margin-top:3px; font-size:12px; color:#7c5310; line-height:1.6; }
  .agent-manual-why.done .agmw-head span { color:#166f52; }
  .agmw-presets { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
  .agmw-presets button { border:1px solid #e5e7eb; background:#fff; color:#64748b;
    border-radius:999px; padding:5px 11px; font:inherit; font-size:11.5px; font-weight:700; cursor:pointer; }
  .agmw-presets button:hover { border-color:#a45b06; color:#a45b06; background:#fff7e6; }
  .agmw-input { display:flex; gap:8px; margin-top:8px; }
  .agmw-input textarea { flex:1 1 auto; min-width:0; border:1px solid #e5e7eb; border-radius:10px;
    padding:9px 11px; font:inherit; font-size:12.5px; line-height:1.6; resize:vertical; background:#fff; }
  .agmw-input textarea:focus { outline:none; border-color:#f5a623; }
  .agmw-save { flex:0 0 auto; align-self:flex-start; border:1px solid #a45b06; background:#a45b06;
    color:#fff; border-radius:10px; padding:9px 15px; font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; }
  .agmw-save:hover { background:#8a4c05; }
  .agmw-saved { margin-top:8px; display:flex; align-items:flex-start; gap:10px; }
  .agmw-saved p { flex:1 1 auto; margin:0; font-size:13px; font-weight:700; color:#0f172a; line-height:1.7; }
  .agmw-saved em { flex:0 0 auto; font-style:normal; font-size:11px; color:#94a3b8; }
  .agmw-saved button { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:8px; padding:5px 10px; font:inherit; font-size:11.5px; font-weight:700; cursor:pointer; }
  /* 직책자 상세 */
  .agexec-note.manual { border-color:#fde68a; background:#fffdf5; }
  .agexec-note.manual b { color:#a45b06; }
  .agexec-note.manual span i { display:block; margin-top:3px; font-style:normal; font-size:11px; color:#94a3b8; }
  .agexec-selfhelp { margin:9px 0 6px; font-size:11.5px; font-weight:700; color:#4338ca; }
  .agleg-impact { margin:8px 0 0; font-size:12px; color:#64748b; line-height:1.7; }
  .agleg-impact b { font-weight:900; color:#475569; margin-right:5px; }
  .agp-months.exec { margin-top:8px; }

  .agp-months.exec { margin-top:8px; }
  .aga-acts button { flex:1 1 0; border-radius:8px; padding:7px 0; font-size:12px; font-weight:800; cursor:pointer; }
  .aga-view { border:1px solid #cbd5e1; background:#fff; color:#475569; }
  .aga-view:hover { border-color:#0f172a; color:#0f172a; }
  .aga-manual { border:1px solid #e5e7eb; background:#f8fafc; color:#94a3b8; }
  .aga-manual:hover { border-color:#f5a623; color:#a45b06; background:#fffdf5; }
  .aga-manual.on { border-color:#f5a623; background:#fff5e5; color:#a45b06; }

  /* 열람 전용 편집기 */
  .agent-readonly { position:relative; }
  /* [2026.09.02] 열람 전용이지만 조회는 됩니다 — 전체를 덮는 대신 입력만 잠급니다.
     탭 전환·펼치기·실적조회 같은 조회 동작은 그대로 쓸 수 있습니다. */
  .agr-veil { position:relative; }
  .agr-veil input, .agr-veil select, .agr-veil textarea { pointer-events:none !important; background:#f4f6fa !important; color:#94a3b8 !important; }
  .agr-veil .labor-main-btn:not(.teal), .agr-veil .os-main-btn, .agr-veil .exp-main-btn,
  .agr-veil .mat-main-btn, .agr-veil .as-main-btn { pointer-events:none !important; opacity:.45; }
  .agent-manual-note { display:flex; align-items:center; gap:10px; margin-bottom:12px;
    border:1px solid #fcd34d; border-radius:13px; background:#fffbeb; padding:11px 14px;
    font-size:13px; color:#78350f; line-height:1.6; }
  .agent-manual-note b { font-weight:900; color:#a45b06; }
  .agent-manual-note button { margin-left:auto; flex:0 0 auto; border:1px solid #f5a623;
    background:#fff; color:#a45b06; border-radius:999px; padding:7px 14px; font-size:12.5px; font-weight:800; cursor:pointer; }

  /* ③안 배너 */
  .agent-banner { display:flex; align-items:center; gap:12px; margin:0 0 14px;
    border:1px solid #c7d2fe; border-radius:14px; background:linear-gradient(180deg,#f5f6ff,#fff 70%); padding:13px 16px; }
  .agent-banner.warn { border-color:#fcd34d; background:linear-gradient(180deg,#fffbeb,#fff 70%); }
  .agb-avatar { flex:0 0 auto; font-size:22px; }
  .agb-text strong { display:block; font-size:15px; font-weight:900; color:var(--agc-ink); }
  .agb-text span { display:block; margin-top:3px; font-size:12.5px; color:var(--agc-mute); }
  .agb-go { margin-left:auto; flex:0 0 auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:999px; padding:9px 18px; font-size:13.5px; font-weight:800; cursor:pointer; white-space:nowrap; }

  /* ②안 2단 */
  .agent-console-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(0,1fr); gap:16px; }


  /* [#3] PM 프로세스 스트립 */
  .agent-process { display:flex; align-items:stretch; gap:8px; flex-wrap:wrap; margin:0 0 14px;
    border:1px solid var(--agc-line); border-radius:14px; background:#fff; padding:11px 14px; }
  .agpr-step { flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:2px;
    padding:8px 12px; border-radius:11px; background:#f8fafc; border:1px solid transparent; }
  .agpr-step span { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px;
    border-radius:50%; background:#e2e8f0; color:#64748b; font-size:11px; font-weight:900; }
  .agpr-step b { font-size:13.5px; font-weight:900; color:#475569; white-space:nowrap; }
  .agpr-step em { font-style:normal; font-size:11.5px; color:#94a3b8; }
  .agpr-step.done { background:#eefaf5; border-color:#bfe8d8; }
  .agpr-step.done span { background:#0f9d63; color:#fff; }
  .agpr-step.done b { color:#12724f; }
  .agpr-step.done em { color:#12724f; }
  .agpr-step.now { background:#fffbeb; border-color:#fcd34d; }
  .agpr-step.now span { background:#b45309; color:#fff; }
  .agpr-step.now b, .agpr-step.now em { color:#b45309; }
  .agpr-arrow { flex:0 0 auto; align-self:center; color:#cbd5e1; font-weight:900; }

  /* [#3] 제안 카드 세 번째 액션 · 기안 출처 */
  .agd-src { font-style:normal; font-size:11px; font-weight:900; border-radius:6px; padding:3px 8px;
    background:#eef2ff; color:#4338ca; white-space:nowrap; }
  .agd-src.manual { background:#fff5e5; color:#a45b06; }

  /* [#4] SCM 확정 인력 표 */
  .agent-person-table { width:100%; border-collapse:collapse; margin-top:7px;
    border:1px solid var(--agc-line); border-radius:10px; overflow:hidden; background:#fff; }
  .agent-person-table th, .agent-person-table td { padding:8px 11px; font-size:12.5px;
    text-align:left; border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agent-person-table th { background:#f8fafc; font-size:11.5px; color:var(--agc-mute); font-weight:900; }
  .agent-person-table th.num, .agent-person-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agent-person-table tfoot td { background:#f8fafc; font-weight:900; color:var(--agc-ink); border-bottom:0; }

  /* [#5] 4안 3분할 */
  .agent-split { display:grid; grid-template-columns:minmax(0,1.12fr) minmax(0,1fr); gap:14px; align-items:start; }
  .agent-pane { flex:1 1 50%; min-height:0; display:flex; flex-direction:column;
    border:1px solid var(--agc-line); border-radius:14px; background:#fff; overflow:hidden; }
  .agpane-head { flex:0 0 auto; padding:11px 14px; border-bottom:1px solid #eef2f7; background:#fbfcfe; }
  .agpane-head strong { font-size:14.5px; font-weight:900; color:var(--agc-ink); }
  .agpane-head span { display:block; margin-top:2px; font-size:11.5px; color:var(--agc-mute); }
  .agpane-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:12px 14px; }
  .agpane-foot { flex:0 0 auto; display:flex; gap:8px; padding:10px 12px; border-top:1px solid #eef2f7; background:#fbfcfe; }
  .agpane-foot input { flex:1 1 auto; min-width:0; height:36px; border:1px solid #cbd5e1;
    border-radius:10px; padding:0 12px; font:inherit; font-size:13px; background:#fff; }
  .agpane-foot input:focus { outline:none; border-color:#6366f1; }
  .agpane-foot button { flex:0 0 auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:10px; padding:0 16px; font-size:13px; font-weight:800; cursor:pointer; }

  /* 패널 헤더 — 제목 + 펼치기 토글 */
  .agpane-head { display:flex; align-items:flex-start; gap:10px; }
  .agpane-title { flex:1 1 auto; min-width:0; }
  /* [2026.08.31] 윈도우 창 제어형 — 접기(─) / 분할(⊞) / 전체화면(□) */
  .agwin { flex:0 0 auto; display:inline-flex; gap:1px; border:1px solid #e2e8f0;
    border-radius:8px; overflow:hidden; background:#e2e8f0; }
  .agwin-b { width:34px; height:28px; border:0; background:#fff; color:#64748b;
    line-height:1; cursor:pointer; display:grid; place-items:center; padding:0; }
  /* 세 아이콘 모두 같은 16×16 SVG — 사각형 크기가 정확히 같습니다 */
  .agwin-b svg { display:block; width:16px; height:16px;
    fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
  .agwin-b:hover { background:#f1f5f9; color:#0f172a; }
  .agwin-b.on { background:#0f172a; color:#fff; }
  .agwin-b.on:hover { background:#1e293b; }

  /* 예산 현황 보기 패널 — 3분할 기본에서는 본문 스크롤 */
  .agent-split .agent-pane.budget .agpane-body { padding:12px 14px; }

  /* 3단계 개폐 배치 — 세 패널이 하나의 그리드 직계 자식입니다.
     normal 개수로 열 수를 정하고, collapsed/full 은 전체 폭을 차지합니다. */
  .agent-split { display:grid; gap:14px; align-items:start; grid-auto-flow:row; }
  .agent-split.n3 { grid-template-columns:minmax(0,1.12fr) minmax(0,1fr); }
  .agent-split.n2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .agent-split.n1, .agent-split.n0 { grid-template-columns:1fr; }

  /* 접힌 화면 = 제목줄만. 항상 전체 폭으로 아래에 쌓입니다 */
  /* 접힌 화면은 제목줄만 남기고 항상 맨 위에 모아 둡니다 */
  .agent-pane.collapsed { grid-column:1 / -1; height:auto !important; }
  .agpane-actbar { display:flex; align-items:center; gap:10px; padding:8px 14px;
    border-bottom:1px solid var(--agc-line); background:#fbfcfe; flex:0 0 auto; }
  .agpane-actbar .agm-box-draft { margin-left:auto; }
  .agpane-foot.done { justify-content:space-between; align-items:center; font-size:12.5px; }
  .agpane-foot.done b { color:var(--agc-ink); font-weight:800; }
  .agpane-foot.done button { border:1px solid #c7d2fe; background:#eef2ff; color:#3730a3;
    border-radius:8px; padding:5px 10px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  /* 좁은 칸에 5안 목록을 넣으므로 표는 칸 안에서 가로 스크롤합니다. */
  .agent-pane.todo .agleg-wrap, .agent-pane.todo .agp-table-wrap { overflow-x:auto; }
  .agent-pane.todo table { min-width:0; }
  .agent-pane.collapsed .agpane-actbar { display:none; }
  .agent-pane.collapsed .agpane-body,
  .agent-pane.collapsed .agpane-foot { display:none; }
  .agent-pane.collapsed .agpane-head { background:#f8fafc; }
  .agent-pane.collapsed .agpane-title span { display:none; }
  .agent-pane.collapsed .agpane-title strong { color:#94a3b8; }

  /* 전체화면 = 전체 폭 + 내부 스크롤 해제 */
  .agent-pane.full { grid-column:1 / -1; height:auto !important; }
  .agent-pane.full .agpane-body { max-height:none !important; min-height:420px; overflow-y:visible; }
  .agent-pane.full .agpane-head { background:#eef2ff; border-bottom-color:#c7d2fe; }
  .agent-pane.full .agpane-title strong { color:#3730a3; }

  /* normal 높이 — 3분할일 때만 고정해 좌우 균형을 맞춥니다 */
  .agent-split.n3 .agent-pane.budget.normal { height:894px; }
  .agent-split.n3 .agent-pane.todo.normal,
  .agent-split.n3 .agent-pane.chat.normal { height:440px; }
  .agent-split.n2 .agent-pane.normal { height:820px; }
  /* 혼자 열린 화면은 전체화면과 똑같이 보여야 합니다(버튼을 누르지 않아도) */
  .agent-split.n1 .agent-pane.normal { height:auto; }
  .agent-split.n1 .agent-pane.normal .agpane-body { max-height:none !important; overflow-y:visible; min-height:420px; }
  .agent-split.n1 .agent-pane.normal .agpane-head { background:#eef2ff; border-bottom-color:#c7d2fe; }
  .agent-split.n1 .agent-pane.normal .agpane-title strong { color:#3730a3; }


  /* [#2] 해야 할 일 = 1안 제안 카드 재사용. 좁은 패널에서는 버튼을 세로로 */
  .agent-pane.todo .agpane-body .agent-prop { margin-bottom:9px; }
  .agent-pane.todo .agp-head { padding:11px 12px; gap:9px; }
  .agent-pane.todo .agp-title strong { font-size:14px; white-space:normal; }
  .agent-pane.todo .agp-body { padding:0 12px 13px; }
  .agent-pane.todo .agp-months { margin-left:0; }
  .agent-pane.todo .agent-person-table th,
  .agent-pane.todo .agent-person-table td { padding:6px 8px; font-size:11.5px; }

  /* [#3] 수동 개입 버튼 — 비활성처럼 보이지 않게 */
  .aga-manual { border:1px solid #f5a623; background:#fff7ea; color:#a45b06; font-weight:800; }
  .aga-manual:hover { border-color:#d98a10; background:#ffefd6; color:#8a4a05; }
  .aga-manual.on { border-color:#d98a10; background:#f5a623; color:#fff; }

  /* [#4] 전체 계정 박스 */
  .agent-acct.all { border-color:#0f172a; background:linear-gradient(180deg,#f8fafc,#fff 70%); }
  .agent-acct.all.active { box-shadow:0 0 0 2px rgba(15,23,42,.10); }
  .agp-acct.all { background:#0f172a; color:#fff; }
  .agent-acct.all .aga-view { border-color:#0f172a; background:#0f172a; color:#fff; }
  .agent-acct.all .aga-view:hover { background:#1e293b; }

  /* [#5] 전체 계정 현황 */
  .agent-insight { border:1px solid var(--agc-line); border-radius:14px; background:#fff; overflow:hidden; }
  .agin-head { padding:13px 16px; border-bottom:1px solid #eef2f7; }
  .agin-head strong { font-size:15px; font-weight:900; color:var(--agc-ink); }
  .agin-head span { display:block; margin-top:3px; font-size:12.5px; color:var(--agc-mute); line-height:1.6; }

  .agin-table { width:100%; border-collapse:collapse; }
  .agin-table th, .agin-table td { padding:10px 14px; font-size:13px; text-align:left;
    border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agin-table th { background:#f8fafc; font-size:12px; color:var(--agc-mute); font-weight:900; }
  .agin-table th.num, .agin-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agin-table td.done { color:#12724f; font-weight:800; }
  .agin-table td.open { color:#1d4ed8; font-weight:800; }
  .agin-table td.up { color:#c1122f; font-weight:800; }
  .agin-table td.down { color:#1d4ed8; font-weight:800; }
  .agin-table tfoot td { background:#f8fafc; font-weight:900; color:var(--agc-ink); border-bottom:0; }
  .agin-bar-cell { display:flex; align-items:center; gap:9px; min-width:160px; }
  .agin-bar { position:relative; flex:1 1 auto; height:7px; border-radius:4px; background:#e9edf4; overflow:visible; }
  .agin-bar > i { display:block; height:100%; border-radius:4px; background:#0f9d63; }
  .agin-bar > u { position:absolute; top:-4px; width:2px; height:15px; background:#0f172a; border-radius:1px; }
  .agin-bar-cell span { flex:0 0 auto; font-size:12px; font-weight:800; color:#475569; font-variant-numeric:tabular-nums; }
  .agin-health { font-style:normal; font-size:11.5px; font-weight:900; border-radius:999px; padding:3px 9px; }
  .agin-health.ok { background:#e9f8f1; color:#12724f; }
  .agin-health.fast { background:#fdecef; color:#c1122f; }
  .agin-health.slow { background:#fff5e5; color:#a45b06; }
  .agin-health.none { background:#f1f5f9; color:#64748b; }
  .agin-health-desc { display:block; margin-top:3px; font-size:11px; color:#94a3b8; }
  .agin-notes { margin:0; padding:13px 16px; border-top:1px solid #eef2f7; background:#f8fafc; }
  .agin-notes b { display:block; font-size:13px; font-weight:900; color:#4338ca; margin-bottom:6px; }
  .agin-notes ul { margin:0; padding-left:18px; }
  .agin-notes li { font-size:12.5px; color:#334155; line-height:1.85; }
  .agin-foot { margin:0; padding:10px 16px; border-top:1px solid #eef2f7; font-size:11.5px; color:#94a3b8; }

  .agin-scroll { overflow-x:auto; }

  .agent-split .ags-head { flex-wrap:wrap; }
  .agent-split .ags-recheck { margin-left:auto; }

  /* [#5] 해야 할 일 카드 */
  .agent-todo { border:1px solid var(--agc-line); border-radius:12px; background:#fff;
    padding:11px 12px; margin-bottom:9px; }
  .agent-todo.draft { border-color:#bfe8d8; background:#f7fdfa; }
  .agtd-top { display:flex; align-items:center; gap:8px; }
  .agtd-top b { flex:1 1 auto; min-width:0; font-size:13.5px; font-weight:800; color:var(--agc-ink);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agtd-top em { flex:0 0 auto; font-style:normal; font-size:13.5px; font-weight:900;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agtd-top em.up { color:#c1122f; }
  .agtd-top em.down { color:#1d4ed8; }
  .agtd-why { margin-top:6px; font-size:12px; color:var(--agc-mute); line-height:1.65;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .agtd-acts { display:flex; gap:6px; margin-top:9px; }
  .agtd-acts button { flex:1 1 0; border-radius:9px; padding:8px 0; font-size:12px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .agtd-y { border:1px solid #0f9d63; background:#0f9d63; color:#fff; }
  .agtd-y:hover { background:#0b7f50; }
  .agtd-m { border:1px solid #f5a623; background:#fff; color:#a45b06; }
  .agtd-m:hover { background:#fff5e5; }
  .agtd-n { border:1px solid #cbd5e1; background:#fff; color:#64748b; }
  .agtd-n:hover { border-color:#ea002c; color:#ea002c; }

  /* [#5] Agent 대화 메시지 */
  .agc-msg { display:flex; gap:8px; margin-bottom:9px; align-items:flex-start; }
  .agc-who { flex:0 0 62px; font-size:11px; font-weight:900; color:#94a3b8; padding-top:4px; }
  .agc-msg.agent .agc-who { color:#4338ca; }
  .agc-text { flex:1 1 auto; min-width:0; font-size:12.5px; line-height:1.7; color:#334155;
    background:#f8fafc; border:1px solid var(--agc-line); border-radius:10px; padding:8px 11px; }
  .agc-msg.agent .agc-text { background:#f5f6ff; border-color:#dcdffb; }
  .agc-msg.pm .agc-text { background:#fff; }
  .agc-text.pending { color:#94a3b8; }

  /* 3분할에서는 좌측 폭이 줄어드니 계정 레일을 3열로 접고 카드 내부를 압축합니다 */
  .agent-shell.split .agent-acct-rail { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .agent-shell.split .aga-val { font-size:16px; white-space:nowrap; }
  .agent-shell.split .aga-sub { font-size:11px; line-height:1.5; }
  .agent-shell.split .aga-lock { font-size:9.5px; padding:2px 6px; overflow:hidden; text-overflow:ellipsis; }
  .agent-shell.split .aga-top { min-width:0; }
  .agent-shell.split .agp-acct.sm { flex:0 0 auto; }
  .agent-shell.split .aga-pend { font-size:11px; }
  .aga-val { white-space:nowrap; }

  /* 전체화면이면 폭이 넉넉하므로 계정 레일을 5열로 되돌립니다 */
  .agent-pane.full .agent-acct-rail,
  .agent-split.n1 .agent-pane.normal .agent-acct-rail { grid-template-columns:repeat(6,minmax(0,1fr)); }
  .agent-pane.full .aga-val,
  .agent-split.n1 .agent-pane.normal .aga-val { font-size:19px; }


  /* ===== ⑤ 간소화(검토자 화면) ===== */
  .agent-shell.mini { --agm-line:#e5e7eb; }

  /* 첫 화면의 유일한 헤드라인 — "무엇을 판단해야 하는가" */

  /* 검토 목록 — "해야 할 일" 한 박스 안의 행들 */
  .agm-box { border:1px solid var(--agm-line); border-radius:14px; background:#fff; overflow:hidden; }
  .agm-box-head { display:flex; align-items:baseline; gap:10px; padding:13px 16px;
    border-bottom:1px solid #eef2f7; background:#fbfcfe; }
  .agm-box-head strong { font-size:15px; font-weight:900; color:#0f172a; }
  .agm-box-head span { font-size:12.5px; color:#64748b; }
  .agm-list { display:flex; flex-direction:column; }
  .agm-row { border-bottom:1px solid #eef2f7; background:#fff; }
  .agm-row:last-child { border-bottom:0; }
  .agm-row.open { background:#fcfcff; }
  .agm-row.open .agm-line { border-left:3px solid #6366f1; padding-left:1px; }
  .agm-line { display:flex; align-items:center; gap:10px; padding:4px 12px 4px 4px; }
  .agm-open { flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:11px;
    border:0; background:transparent; padding:13px 8px 13px 12px; cursor:pointer; text-align:left; }
  .agm-open:hover { background:#f8fafc; }
  .agm-open b { flex:1 1 auto; min-width:0; font-size:15px; font-weight:800; color:#0f172a;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agm-delta { flex:0 0 auto; font-style:normal; font-size:15px; font-weight:900;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agm-delta.up { color:#c1122f; }
  .agm-delta.down { color:#1d4ed8; }
  .agm-caret { flex:0 0 auto; font-style:normal; color:#94a3b8; font-weight:900; }
  /* 줄의 펼치기/접기 — 행 가장 오른쪽 */
  .agm-caret-btn { flex:0 0 auto; order:9; border:0; background:transparent; color:#94a3b8;
    font:inherit; font-size:15px; font-weight:900; line-height:1;
    padding:0 4px; height:38px; min-width:22px; cursor:pointer; }
  .agm-caret-btn:hover { color:#0f172a; }
  .agex-opts .agm-caret-btn { height:28px; font-size:13px; }
  .agm-yn { flex:0 0 auto; display:flex; gap:6px; }
  .agm-yn button { width:44px; height:38px; border-radius:10px; font-size:15px; font-weight:900; cursor:pointer; }
  .agm-y { border:1px solid #0f9d63; background:#0f9d63; color:#fff; }
  .agm-y:hover { background:#0b7f50; }
  .agm-n { border:1px solid #cbd5e1; background:#fff; color:#64748b; }
  .agm-n:hover { border-color:#ea002c; color:#ea002c; }
  .agm-done { flex:0 0 auto; font-size:12px; font-weight:900; border-radius:999px; padding:6px 12px; }
  .agm-done.approved { background:#e9f8f1; color:#12724f; }
  .agm-done.rejected { background:#f1f5f9; color:#64748b; }
  .agm-detail { border-top:1px dashed var(--agm-line); padding:0 16px 16px; }

  .agm-donebar { display:flex; align-items:center; gap:12px; margin-top:12px;
    border:1px solid #bfe8d8; border-radius:12px; background:#f7fdfa; padding:11px 14px; }
  .agm-donebar b { font-size:13.5px; font-weight:800; color:#12724f; }
  .agm-donebar button { margin-left:auto; border:1px solid #0f172a; background:#fff; color:#0f172a;
    border-radius:999px; padding:7px 14px; font-size:12.5px; font-weight:800; cursor:pointer; }

  /* 하단 보조 패널 — 기본 닫힘. 필요할 때만 클릭해서 엽니다 */
  .agm-panel { margin-top:10px; border:1px solid var(--agm-line); border-radius:13px; background:#fff; overflow:hidden; }
  .agm-panel.open { border-color:#c7d2fe; }
  .agm-panel-head { display:flex; align-items:center; gap:11px; width:100%; border:0; background:transparent;
    padding:14px 16px; cursor:pointer; text-align:left; }
  .agm-panel-head:hover { background:#f8fafc; }
  .agm-panel.open .agm-panel-head { background:#f5f6ff; }
  .agm-panel-ic { flex:0 0 auto; font-size:18px; }
  .agm-panel-head b { flex:0 0 auto; font-size:14.5px; font-weight:800; color:#0f172a; }
  .agm-panel-head em { flex:1 1 auto; min-width:0; font-style:normal; font-size:12.5px; color:#94a3b8;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agm-panel-head i { flex:0 0 auto; font-style:normal; color:#94a3b8; font-weight:900; }
  .agm-panel-body { padding:14px 16px; border-top:1px solid #eef2f7; }
  .agm-panel-body .agpane-foot { border:0; background:transparent; padding:10px 0 0; }


/* ===== PERSONA 전환 (PM / 직책자) ===== */
  .agent-persona { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 12px; }
  .agpsn-k { font-size:10.5px; font-weight:900; letter-spacing:.06em; color:#64748b;
    background:#f1f5f9; border-radius:5px; padding:4px 8px; white-space:nowrap; }
  .agpsn { display:inline-flex; align-items:center; gap:7px; border:1px solid #e5e7eb; background:#fff;
    border-radius:999px; padding:6px 14px; cursor:pointer; white-space:nowrap; }
  .agpsn:hover { border-color:#6366f1; }
  .agpsn-role { font-size:11px; font-weight:800; color:#94a3b8; }
  .agpsn b { font-size:13.5px; font-weight:900; color:#0f172a; }
  .agpsn.on { background:#0f172a; border-color:#0f172a; }
  .agpsn.on .agpsn-role { color:#cbd5e1; }
  .agpsn.on b { color:#fff; }
  .agpsn-n { font-style:normal; font-size:11px; font-weight:900; background:#ea002c; color:#fff;
    border-radius:999px; padding:2px 7px; }

  /* ===== 결재선 지정 팝업 ===== */
  /* [2026.09.03] 팝업이 화면 세로폭을 넘어도 [상신] 버튼이 늘 보이게 합니다.
     머리와 바닥은 고정하고 가운데 본문만 스크롤합니다. */
  .agv-pop-dim { position:fixed; inset:0; z-index:95; display:flex; align-items:center; justify-content:center;
    background:rgba(15,23,42,.42); padding:20px; }
  .agv-pop { width:min(560px,100%); background:#fff; border:1px solid #e2e8f0; border-radius:16px;
    box-shadow:0 24px 60px -28px rgba(15,23,42,.5); overflow:hidden;
    display:flex; flex-direction:column; max-height:calc(100vh - 40px); max-height:calc(100dvh - 40px); }
  .agv-pop-head { flex:0 0 auto; display:flex; align-items:flex-start; gap:12px; padding:16px 18px; border-bottom:1px solid #eef2f7; }
  .agv-pop-head strong { display:block; font-size:16px; font-weight:900; color:#0f172a; }
  .agv-pop-head span { display:block; margin-top:3px; font-size:12.5px; color:#64748b; }
  .agv-pop-x { margin-left:auto; flex:0 0 auto; border:0; background:transparent; color:#94a3b8;
    font-size:16px; cursor:pointer; padding:2px 6px; }
  .agv-pop-body { flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:16px 18px; }
  .agv-pop.narrow { width:min(460px,100%); }
  .agrn-reason { border:1px solid #fde68a; background:#fffbeb; border-radius:11px; padding:10px 13px; }
  .agrn-reason b { font-size:11.5px; font-weight:900; color:#a45b06; }
  .agrn-reason p { margin:5px 0 0; font-size:13.5px; font-weight:700; color:#0f172a; line-height:1.6; }
  .agrn-items { margin-top:12px; }
  .agrn-items > b { display:block; margin-bottom:6px; font-size:11.5px; font-weight:900; color:#94a3b8; }
  .agrn-item { display:flex; align-items:center; gap:9px; padding:8px 10px; border:1px solid var(--agc-line);
    border-radius:9px; background:#fbfcfe; margin-bottom:5px; }
  .agrn-item em { flex:1 1 auto; min-width:0; font-style:normal; font-size:12.5px; font-weight:700;
    color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agrn-item i { flex:0 0 auto; font-style:normal; font-size:12.5px; font-weight:900;
    font-variant-numeric:tabular-nums; color:#64748b; }
  .agrn-item i.up { color:#c1122f; }
  .agrn-item i.down { color:#1d4ed8; }
  .agrn-hint { margin:12px 0 0; font-size:12px; color:var(--agc-mute); line-height:1.7; }
  .agv-pop-foot { flex:0 0 auto; display:flex; gap:8px; padding:12px 18px 14px;
    border-top:1px solid #eef2f7; background:#fff; }
  .agv-pop-foot button { flex:1 1 0; border-radius:11px; padding:11px 0;
    font:inherit; font-size:14px; font-weight:900; cursor:pointer; }
  .agv-ok { border:1px solid #ea002c; background:#ea002c; color:#fff; }
  .agv-ok:hover { background:#c40025; }
  .agv-cancel { border:1px solid #cbd5e1; background:#fff; color:#475569; }
  .agv-cancel:hover { border-color:#94a3b8; }
  .agv-item { display:flex; align-items:center; gap:9px; padding:11px 13px; border:1px solid #e5e7eb;
    border-radius:11px; background:#fbfcfe; }
  .agv-item b { flex:1 1 auto; min-width:0; font-size:13.5px; font-weight:800; color:#0f172a;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agv-item em { flex:0 0 auto; font-style:normal; font-size:14px; font-weight:900; font-variant-numeric:tabular-nums; }
  .agv-item em.up { color:#c1122f; }
  .agv-item em.down { color:#1d4ed8; }
  .agv-line { display:flex; align-items:center; gap:10px; margin:14px 0; }
  .agv-node { flex:1 1 0; border:1px solid #e5e7eb; border-radius:11px; padding:10px 13px; background:#fff; }
  .agv-node.me { background:#f5f6ff; border-color:#c7d2fe; }
  .agv-node span { display:block; font-size:11px; font-weight:800; color:#94a3b8; }
  .agv-node b { display:block; margin-top:3px; font-size:15px; font-weight:900; color:#0f172a; }
  .agv-node em { display:block; font-style:normal; font-size:11.5px; color:#64748b; }
  .agv-arrow { flex:0 0 auto; color:#cbd5e1; font-weight:900; }
  .agv-pick b { display:block; font-size:12.5px; font-weight:900; color:#0f172a; margin-bottom:7px; }
  .agv-apv { display:flex; align-items:flex-start; gap:10px; border:1px solid #e5e7eb; border-radius:11px;
    padding:11px 13px; cursor:pointer; background:#fff; }
  .agv-apv:hover { border-color:#6366f1; }
  .agv-apv input { margin-top:3px; }
  .agv-apv-txt b { display:inline; font-size:14px; }
  .agv-apv-txt em { display:block; margin-top:3px; font-style:normal; font-size:11.5px; color:#94a3b8; }
  .agv-note { margin-top:14px; }
  .agv-note b { display:block; font-size:12.5px; font-weight:900; color:#0f172a; margin-bottom:6px; }
  .agv-note b i { font-style:normal; font-weight:700; color:#94a3b8; }
  .agv-note textarea { width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:10px;
    padding:9px 11px; font:inherit; font-size:13px; resize:vertical; background:#fff; color:#0f172a; }
  .agv-note textarea:focus { outline:none; border-color:#6366f1; }
  .agv-hint { margin:12px 0 0; font-size:12px; color:#4338ca; background:#f5f6ff; border:1px solid #dcdffb;
    border-radius:9px; padding:9px 11px; line-height:1.6; }
  .agv-pop-foot { display:flex; gap:8px; padding:14px 18px; border-top:1px solid #eef2f7; background:#fbfcfe; }
  .agv-cancel { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:11px; padding:11px 18px; font-size:13.5px; font-weight:800; cursor:pointer; }
  .agv-submit { flex:1 1 auto; border:1px solid #0f172a; background:#0f172a; color:#fff;
    border-radius:11px; padding:11px 18px; font-size:14px; font-weight:900; cursor:pointer; }
  .agv-submit:hover { background:#1e293b; }

  .agm-box-draft { flex:0 0 auto; border:1px solid #0f9d63; background:#0f9d63; color:#fff;
    border-radius:9px; padding:8px 14px; font-size:12.5px; font-weight:900; cursor:pointer; white-space:nowrap; }
  .agm-box-draft:hover { background:#0b7f50; }

  /* [#4] 선택 기안 체크박스 */
  .agm-check { flex:0 0 auto; display:inline-flex; align-items:center; gap:6px; padding:0 2px 0 10px; cursor:pointer; }
  .agm-check input { width:17px; height:17px; cursor:pointer; accent-color:#0f9d63; }
  .agm-check.all { padding:0 8px; border:1px solid #e5e7eb; border-radius:8px; height:30px; background:#fff; }
  .agm-check.all span { font-size:12px; font-weight:800; color:#64748b; }

  /* [#1] 감지 소스 / 추세 기반 대안 */
  .agx-basis { margin:0 0 9px; border:1px solid #dcdffb; border-radius:10px; background:#f7f8ff; padding:9px 12px; }
  .agx-basis-row { display:flex; gap:9px; align-items:flex-start; }
  .agx-basis-row + .agx-basis-row { margin-top:8px; padding-top:8px; border-top:1px dashed #dcdffb; }
  .agx-k { flex:0 0 auto; font-style:normal; font-size:10.5px; font-weight:900; border-radius:5px; padding:3px 8px; white-space:nowrap; }
  .agx-k.main { background:#4338ca; color:#fff; }
  .agx-k.alt { background:#fff5e5; color:#a45b06; border:1px solid #fde68a; }
  .agx-basis-row span { font-size:12.5px; color:#334155; line-height:1.7; }

  /* [#2] 구매 품목 · 실적 인식 주기 */
  .agx-items, .agx-bd { width:100%; border-collapse:collapse; margin-top:7px;
    border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff; }
  .agx-items th, .agx-items td, .agx-bd th, .agx-bd td {
    padding:8px 11px; font-size:12.5px; text-align:left; border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agx-items th, .agx-bd th { background:#f8fafc; font-size:11.5px; color:#64748b; font-weight:900; }
  .agx-items th.num, .agx-items td.num, .agx-bd th.num, .agx-bd td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agx-items tfoot td, .agx-bd tfoot td { background:#f8fafc; font-weight:900; color:#0f172a; border-bottom:0; }
  .agx-kind { font-style:normal; font-size:10.5px; font-weight:900; border-radius:5px; padding:2px 7px; }
  .agx-kind.hw { background:#eaf1ff; color:#1d4ed8; }
  .agx-kind.sw { background:#f3ecff; color:#6d28d9; }
  .agx-bd tr.new td { background:#fffbeb; color:#a45b06; font-weight:700; }
  .agx-bd tfoot tr.short td { background:#fdecef; color:#c1122f; }
  .agx-cycle { margin-top:11px; border:1px solid #bfe8d8; border-radius:11px; background:#f7fdfa; padding:11px 13px; }
  .agx-cycle b { display:block; font-size:12.5px; font-weight:900; color:#12724f; margin-bottom:5px; }
  .agx-cycle b i { font-style:normal; background:#0f9d63; color:#fff; border-radius:5px; padding:2px 8px; margin-left:4px; }
  .agx-cycle span { font-size:12.5px; color:#334155; line-height:1.7; }

  /* [2026.08.31] 결재선 팝업 내역 — 계정 | 변경 전 | 변경 후 (계정별 합산) */
  .agv-legs { width:100%; border-collapse:collapse; border:1px solid #e5e7eb;
    border-radius:11px; overflow:hidden; background:#fff; }
  .agv-legs th, .agv-legs td { padding:10px 13px; font-size:13.5px; text-align:left;
    border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agv-legs tr:last-child td { border-bottom:0; }
  .agv-legs th { background:#f8fafc; font-size:11.5px; color:#64748b; font-weight:900; }
  .agv-legs th.num, .agv-legs td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agv-legs td.to { font-weight:900; color:#0f172a; }
  .agv-legs td.up { color:#c1122f; font-weight:900; }
  .agv-legs td.down { color:#1d4ed8; font-weight:900; }
  .agv-legs tfoot td { background:#f8fafc; font-weight:900; color:#0f172a; border-bottom:0; }
  .agv-legs tfoot tr.zero td { background:#fffbeb; color:#a45b06; }
  .agv-legs + .agcpd { margin:12px 0 0; }
  @media (max-height:820px) {
    .agv-pop-dim { padding:12px; }
    .agv-pop { max-height:calc(100vh - 24px); max-height:calc(100dvh - 24px); }
    .agv-pop-head { padding:12px 16px; }
    .agv-pop-body { padding:12px 16px; }
    .agv-pop-foot { padding:10px 16px 12px; }
    .agv-legs th, .agv-legs td { padding:7px 12px; }
    .agv-line, .agv-pick, .agv-note { margin-top:10px !important; }
    .agv-note textarea { min-height:auto; }
  }

  /* [#6] 직책자 — 변경 전/후 라인을 눌러 근거 열기 */
  .agm-legs { cursor:pointer; border-radius:10px; }
  .agm-legs:hover { background:#f8fafc; }
  .agm-legs.open { background:#fcfcff; }
  .agm-legs-more { margin-top:7px; text-align:center; font-size:11.5px; font-weight:800; color:#4338ca; }
  /* ===== [2026.08.31] 기안 단위 결재 카드 ===== */
  .agdr { border-bottom:1px solid #eef2f7; background:#fff; padding:12px; }
  .agdr:last-child { border-bottom:0; }
  .agdr.returned { background:#fffdf5; }
  .agdr.confirmed { background:#f8fdfa; }
  .agdr-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:9px; }
  .agdr-id b { font-size:14px; font-weight:900; color:#0f172a; }
  .agdr-id span { display:block; margin-top:2px; font-size:11.5px; color:#94a3b8; }
  .agdr-net { margin-left:auto; font-style:normal; font-size:17px; font-weight:900;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agdr-net.up { color:#c1122f; } .agdr-net.down { color:#1d4ed8; } .agdr-net.zero { color:#a45b06; }
  .agdr-acts { display:flex; gap:6px; flex:0 0 auto; }
  .agdr-acts button { border-radius:9px; padding:9px 15px; font-size:13px; font-weight:900; cursor:pointer; white-space:nowrap; }
  .agdr-y { border:1px solid #0f9d63; background:#0f9d63; color:#fff; }
  .agdr-y:hover { background:#0b7f50; }
  .agdr-n { border:1px solid #cbd5e1; background:#fff; color:#64748b; }
  .agdr-n:hover { border-color:#ea002c; color:#ea002c; }
  .agdr-wait { flex:0 0 auto; font-size:12px; font-weight:800; color:#4338ca;
    background:#eef2ff; border-radius:999px; padding:6px 12px; white-space:nowrap; }

  /* 계정 합산 라인 — 금액이 먼저, 근거는 그 아래 한 줄씩 */
  .agdr-leg { margin-top:2px; }
  .agleg-line { cursor:pointer; }
  .agleg-line:hover td { background:#f8fafc; }
  .agleg-line.open td { background:#f5f6ff; }
  .agleg-line td { font-size:13.5px; }
  .agleg-line td.to { font-size:14.5px; }
  .agleg-cnt { margin-left:7px; font-style:normal; font-size:10.5px; font-weight:800;
    color:#a45b06; background:#fff5e5; border:1px solid #fde68a; border-radius:5px; padding:2px 6px; }
  .agleg-sub td { padding:0 12px 9px !important; border-bottom:1px solid #eef2f7; white-space:normal !important; }
  .agleg-item + .agleg-item { margin-top:7px; }
  .agleg-why { display:flex; gap:7px; align-items:baseline; flex-wrap:wrap;
    font-size:12.5px; color:#475569; line-height:1.65; }
  .agleg-why > span { min-width:0; }
  /* 금액은 제목 바로 옆에 붙입니다 — 우측 끝으로 밀면 어느 문구의 금액인지 읽기 어렵습니다 */
  .agleg-why em { font-style:normal; font-weight:900; font-variant-numeric:tabular-nums;
    white-space:nowrap; padding:1px 7px; border-radius:5px; }
  .agleg-why em.up { color:#c1122f; background:#fdecef; }
  .agleg-why em.down { color:#1d4ed8; background:#e9f0fd; }
  /* 근거 펼치기 — 문구 자체가 버튼입니다(예전에는 눌러도 반응이 없었습니다) */
  .agleg-more { display:inline-flex; align-items:center; gap:4px; margin-top:8px;
    border:1px solid #dcdffb; background:#f5f6ff; color:#4338ca; border-radius:8px;
    padding:6px 11px; font:inherit; font-size:11.5px; font-weight:800; cursor:pointer; }
  .agleg-more:hover { background:#eef2ff; border-color:#c7d2fe; color:#312e81; }
  .agleg-more.up { color:#64748b; background:#f8fafc; border-color:#e5e7eb; }
  .agleg-more.up:hover { color:#0f172a; background:#f1f5f9; }

  /* ═══════════════════════════════════════════════════════════════════
     AI구상안 — 패널을 없애고 한 줄기로 흐르는 화면
       · 상단 LIVE 바가 유일한 "표"입니다 (항상 붙어 있습니다)
       · 가운데는 결정 카드와 대화가 섞인 스트림 하나
       · 하단 한 줄 입력이 모든 버튼을 대신합니다
     ═══════════════════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════════════════
     대화형 Agent — 상단 LIVE 바 + 좌 30% 해야 할 일 + 우 70% 대화
     ═══════════════════════════════════════════════════════════════════ */
  /* 좌우 폭을 끝까지 씁니다 — 폭 제한을 두지 않습니다 */
  .agent-shell.agent-ga { max-width:none; padding-bottom:16px; }
  .agent-ga .agai-top { border-radius:16px; padding:13px 20px 11px; }
  .agent-ga .agga-grid { gap:14px; }
  .agent-ga .agai-top { top:66px; }
  .agga-grid { display:grid; grid-template-columns:minmax(320px,30%) minmax(0,1fr);
    gap:12px; align-items:start; }
  .agga-col { display:flex; flex-direction:column; min-width:0;
    border:1px solid var(--ai-line); border-radius:16px; background:#fff; overflow:hidden;
    height:clamp(430px, calc(100vh - 372px), 900px);
    height:clamp(430px, calc(100dvh - 372px), 900px); }
  .agga-col-head { flex:0 0 auto; display:flex; align-items:center; gap:8px;
    padding:11px 14px; border-bottom:1px solid var(--ai-line); background:#fbfcfe; }
  .agga-col-head strong { font-size:14px; font-weight:900; color:var(--ai-ink); white-space:nowrap; }
  /* 좌 = Agent 가 근거로 제안 · 우 = PM 이 판단으로 지시 */
  .agga-role { flex:0 0 auto; font-style:normal; font-size:10px; font-weight:900;
    border-radius:5px; padding:2px 7px; white-space:nowrap; }
  .agga-role.agent { color:#3730a3; background:#eef2ff; }
  .agga-role.pm { color:#0b1220; background:#eef1f7; }
  .agga-simtag { margin-left:auto; font-style:normal; font-size:11px; font-weight:900;
    color:#a45b06; background:#fff5e5; border:1px solid #fde68a; border-radius:999px; padding:3px 9px;
    font-variant-numeric:tabular-nums; }
  .agga-all { border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:8px; padding:5px 10px; font:inherit; font-size:11px; font-weight:800; cursor:pointer;
    white-space:nowrap; }
  .agga-all:first-of-type { margin-left:auto; }
  .agga-all:hover:not(:disabled) { border-color:#c7d2fe; color:#3730a3; }
  .agga-all:disabled { opacity:.4; cursor:default; }
  .agga-draft { flex:0 0 auto; border:0; background:#0f9d63; color:#fff; border-radius:8px;
    padding:6px 11px; font:inherit; font-size:11.5px; font-weight:900; cursor:pointer; white-space:nowrap; }
  .agga-draft:hover:not(:disabled) { background:#0b7f50; }
  .agga-draft:disabled { opacity:.35; cursor:default; }
  .agga-col-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:12px; }
  .agga-col-body.chat { display:flex; flex-direction:column; gap:12px; padding:16px 18px; }
  .agga-col-foot { flex:0 0 auto; border-top:1px solid var(--ai-line); padding:10px 14px 12px;
    background:#fbfcfe; }

  /* 좌측 카드 */
  .agga-group + .agga-group, .agga-group + .agga-flow { margin-top:12px; }
  .agga-group-head { display:flex; align-items:center; gap:7px; padding:0 2px 7px; }
  .agga-group-head b { font-size:10.5px; font-weight:900; color:#94a3b8; letter-spacing:.05em; }
  .agga-group-head em { font-style:normal; font-size:10px; font-weight:900; color:#fff;
    background:#ea002c; border-radius:999px; padding:1px 7px; }
  .agga-group-head em.on { background:#0f9d63; }
  .agga-group-head b.on { color:#0f9d63; margin-left:5px; }
  .agga-card { border:1px solid var(--ai-line); border-left:3px solid #cbd5e1; border-radius:12px;
    background:#fff; padding:10px 12px 9px; }
  .agga-card + .agga-card { margin-top:7px; }
  .agga-card.agent { border-left-color:#6366f1; }
  .agga-card.sim { border-left-color:#f5a623; }
  .agga-card.manual { border-left-color:#a45b06; }
  .agga-card.on { background:#f8fdfa; border-left-color:#0f9d63; }
  /* 좌측은 정보, 우측은 금액과 그 바로 아래 버튼 */
  .agga-body { display:flex; align-items:flex-start; gap:10px; }
  .agga-left { flex:1 1 auto; min-width:0; }
  .agga-right { flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
  .agga-head { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .agga-amt { font-style:normal; font-size:15px; font-weight:900;
    font-variant-numeric:tabular-nums; color:#64748b; white-space:nowrap; }
  .agga-amt.up { color:#c1122f; } .agga-amt.down { color:#1d4ed8; }
  .agga-legs, .agga-hint { font-style:normal; font-size:10.5px; font-weight:800;
    color:#94a3b8; text-align:right; line-height:1.5; }
  .agga-title { display:block; margin-top:5px; font-size:13px; font-weight:800; color:var(--ai-ink);
    line-height:1.5; }
  .agga-opt { margin-top:4px; font-size:11.5px; font-weight:800; color:#0f9d63; line-height:1.45; }
  .agga-at { margin-top:5px; font-size:10px; font-weight:700; color:#b9c2ce;
    font-variant-numeric:tabular-nums; }
  .agga-acts { display:flex; align-items:center; justify-content:flex-end; gap:4px;
    flex-wrap:wrap; margin-top:0; }
  .agga-acts button { border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:8px; padding:5px 9px; font:inherit; font-size:11px; font-weight:800; cursor:pointer; }
  .agga-acts button:hover { border-color:#94a3b8; color:var(--ai-ink); }
  .agga-acts .agai-seg { min-width:0; }
  .agga-why.on { background:#f5f6ff !important; border-color:#c7d2fe !important; color:#3730a3 !important; }
  .agga-whybox { margin-top:9px; padding-top:9px; border-top:1px dashed var(--ai-line); }
  .agga-whybox p { margin:0; font-size:12px; color:#334155; line-height:1.75; }
  .agga-whybox p.agai-impact { margin-top:7px; font-size:11.5px; }
  .agga-whybox .agai-src span, .agga-whybox .agai-src b { font-size:11px; }
  .agga-whybox .agai-detail { display:block; margin-top:8px; font-size:11.5px; }
  .agga-flow { display:flex; flex-direction:column; gap:5px; }
  .agga-flow .agai-flow-row { padding:8px 11px; font-size:11.5px; }

  /* ── 계정 상세(좌 70%) ── */
  .agga-grid.detail { grid-template-columns:minmax(0,1fr) minmax(300px,30%); }
  .agga-col.detail .agga-col-head { gap:9px; flex-wrap:wrap; }
  .agga-back { flex:0 0 auto; border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:8px; width:28px; height:28px; font:inherit; font-size:14px; font-weight:900;
    cursor:pointer; line-height:1; }
  .agga-back:hover { border-color:#94a3b8; color:var(--ai-ink); }
  .agga-dnum { font-style:normal; font-size:17px; font-weight:900; color:var(--ai-ink);
    font-variant-numeric:tabular-nums; }
  .agga-dsub { font-size:11px; color:#94a3b8; }
  .agga-col-body.detail { padding:14px 16px 18px; }

  /* 상세계정 탭 — 가로폭을 꽉 채웁니다 */
  .aglb-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:0 0 14px; }
  .aglb-tabs button { display:flex; align-items:center; justify-content:center; gap:8px;
    border:1px solid var(--ai-line); background:#fff; color:#64748b; border-radius:12px;
    padding:12px 10px; font:inherit; font-size:13.5px; font-weight:800; cursor:pointer; }
  .aglb-tabs button:hover { border-color:#c7d2fe; color:#3730a3; }
  .aglb-tabs button.on { border-color:#1c2432; background:#1c2432; color:#fff; }
  .aglb-tabs button em { font-style:normal; font-size:10.5px; font-weight:900; color:#94a3b8;
    border:1px solid var(--ai-line); border-radius:5px; padding:1px 5px; }
  .aglb-tabs button.on em { color:#fff; border-color:rgba(255,255,255,.45); }

  /* 인력 표 */
  .aglb-wrap { overflow-x:auto; border:1px solid var(--ai-line); border-radius:12px; background:#fff; }
  .aglb { width:100%; border-collapse:collapse; }
  .aglb th, .aglb td { padding:11px 12px; font-size:13px; text-align:left;
    border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .aglb th { background:#fbfcfe; font-size:11px; font-weight:900; color:#64748b; }
  .aglb th.num, .aglb td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .aglb td b { font-weight:900; color:var(--ai-ink); }
  .aglb td.down { color:#1d4ed8; }
  .aglb tbody tr:hover td { background:#f8fafc; }
  .aglb tbody tr.new td { background:#f4fbf7; }
  .aglb tbody tr.out td { background:#fbfbfd; color:#94a3b8; }
  .aglb tbody tr.out td b { color:#64748b; }
  .aglb tfoot td { background:#f6f8fc; font-weight:900; color:var(--ai-ink); border-bottom:0; }
  .aglb-empty { text-align:center !important; color:#94a3b8; padding:26px 0 !important; }
  .aglb-state { white-space:nowrap; }
  .aglb-state em { font-style:normal; font-size:10.5px; font-weight:900; border-radius:5px;
    padding:2px 8px; background:#eef1f7; color:#64748b; }
  .aglb-state.new em { background:#e9f8f1; color:#12724f; }
  .aglb-state.out em { background:#fff5e5; color:#a45b06; }
  .aglb-state.chg em { background:#eef2ff; color:#3730a3; }
  .aglb-state span { display:block; margin-top:3px; font-size:10.5px; font-weight:800;
    color:#64748b; font-variant-numeric:tabular-nums; }
  .aglb-st { font-style:normal; font-size:10.5px; font-weight:900; border-radius:5px;
    padding:2px 8px; background:#eef1f7; color:#64748b; }
  .aglb-sub { display:block; margin-top:2px; font-size:10px; font-weight:700; color:#94a3b8; }

  /* 대화로 지시한 편성 — 아직 확정 전이라 점선으로 구분합니다 */
  .aglb tbody tr.aglb-dir td { background:#fffdf5; border-top:1px dashed #f5a623; }
  .aglb tbody tr.aglb-dir td.up { color:#a45b06; }
  .aglb-st.dir { background:#fff5e5; color:#a45b06; }
  .aglb-tabs button i u { display:block; margin-top:1px; text-decoration:none;
    font-size:10px; font-weight:900; color:#a45b06; }
  .aglb-tabs button.on i u { color:#ffd7a1; }

  /* 외주비 — 업체 라인과 분기별 구매 계획 */
  .agos-row { cursor:pointer; }
  .agos-row:hover td { background:#f8fafc; }
  .agos-row.open td { background:#fffdf5; }
  .agos-row.new td { background:#f4fbf7; }
  .agos-caret { display:inline-block; width:16px; color:#94a3b8; font-weight:900; }
  .agos-plan { position:relative; }
  .agos-bar { display:block; height:3px; margin-top:4px; border-radius:999px;
    background:#eef1f7; overflow:hidden; }
  .agos-bar u { display:block; height:100%; background:#f5a623; text-decoration:none; }
  .agos-bar u.bad { background:#ea002c; }
  .aglb td.bad, .aglb td.num.bad { color:#c1122f; font-weight:900; }
  .agos-add { border:1px solid var(--ai-line); background:#fff; color:#3730a3; border-radius:8px;
    padding:5px 11px; font:inherit; font-size:11.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .agos-add:hover { border-color:#c7d2fe; background:#f5f6ff; }
  .agos-add.sm { padding:4px 9px; font-size:11px; }
  .agos-sub td { padding:0 !important; background:#fbfcfe !important; }
  .agos-panel { padding:12px 14px 14px 34px; border-left:3px solid #f5a623; }
  .agos-panel-head { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-bottom:9px; }
  .agos-panel-head b { font-size:11.5px; font-weight:900; color:#a45b06;
    background:#fff5e5; border:1px solid #fde68a; border-radius:6px; padding:3px 9px; }
  .agos-panel-head span { margin-left:auto; font-size:11px; color:#94a3b8;
    font-variant-numeric:tabular-nums; }
  .agos-lines { width:100%; border-collapse:collapse; background:#fff;
    border:1px solid var(--ai-line); border-radius:10px; overflow:hidden; }
  .agos-lines th, .agos-lines td { padding:9px 11px; font-size:12.5px; text-align:left;
    border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agos-lines tr:last-child td { border-bottom:0; }
  .agos-lines th { background:#fbfcfe; font-size:10.5px; font-weight:900; color:#64748b; }
  .agos-lines th.num, .agos-lines td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agos-lines tr.wait td { background:#fffdf5; }
  .agos-wait { font-style:normal; font-size:10.5px; font-weight:900; color:#a45b06;
    background:#fff5e5; border-radius:5px; padding:2px 8px; }
  .agos-lock { font-size:10.5px; font-weight:800; color:#94a3b8; }
  .agos-dates { display:inline-flex; align-items:center; gap:5px; }
  .agos-dates input { border:1px solid #fde68a; background:#fff; border-radius:7px;
    padding:4px 7px; font:inherit; font-size:11.5px; color:var(--ai-ink); }
  .agos-dates input:focus { outline:none; border-color:#f5a623; }
  .agos-dates i { font-style:normal; color:#cbd5e1; }
  .agos-amt { width:120px; border:1px solid #fde68a; background:#fff; border-radius:7px;
    padding:5px 8px; font:inherit; font-size:12.5px; font-weight:900; color:var(--ai-ink);
    text-align:right; font-variant-numeric:tabular-nums; }
  .agos-amt:focus { outline:none; border-color:#f5a623; }
  .agos-del { border:1px solid var(--ai-line); background:#fff; color:#94a3b8; border-radius:7px;
    width:24px; height:24px; font:inherit; font-size:11px; cursor:pointer; line-height:1; }
  .agos-del:hover { border-color:#ea002c; color:#ea002c; }
  .agos-empty { padding:16px; text-align:center; font-size:12px; color:#94a3b8;
    border:1px dashed var(--ai-line); border-radius:10px; background:#fff; }
  .agos-warn { margin:9px 0 0; padding:8px 11px; border:1px solid #f6c3ce; border-radius:9px;
    background:#fff6f7; font-size:11.5px; font-weight:800; color:#c1122f; line-height:1.6; }
  .aglb tbody tr.done td { background:#fbfcfe; }
  .aglb tfoot tr.aglb-picked td { background:#eef2ff; color:#3730a3; font-size:12px; }
  .aglb tfoot tr.aglb-picked td.up { color:#c1122f; }
  .aglb tfoot tr.aglb-picked td.down { color:#1d4ed8; }
  .aglb-tabs button i { font-style:normal; font-size:11px; font-weight:900; color:#94a3b8;
    font-variant-numeric:tabular-nums; }
  .aglb-tabs button.on i { color:rgba(255,255,255,.75); }
  .aglb-tabname { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* 계정 상세 하단 — CP 기준 통제 */
  .aglb-cp { margin-top:12px; border:1px solid var(--ai-line); border-radius:11px;
    background:#fbfcfe; padding:9px 13px; display:flex; flex-direction:column; gap:5px; }
  .aglb-cp.over { border-color:#f6b8b8; background:#fff6f7; }
  .aglb-cp-row { display:flex; align-items:baseline; gap:7px; flex-wrap:wrap; }
  .aglb-cp-row span { font-size:11px; font-weight:800; color:#94a3b8; }
  .aglb-cp-row b { font-size:13.5px; font-weight:900; color:var(--ai-ink);
    font-variant-numeric:tabular-nums; }
  .aglb-cp-row b.warn { color:#a45b06; }
  .aglb-cp-row b.bad { color:#c1122f; }
  .aglb-cp-row i { font-style:normal; color:#cbd5e1; font-weight:900; }
  .aglb-cp-row em { font-style:normal; font-size:11.5px; font-weight:900; color:#64748b;
    background:#eef1f7; border-radius:5px; padding:2px 7px; font-variant-numeric:tabular-nums; }
  .aglb-cp-row em.warn { color:#a45b06; background:#fff5e5; }
  .aglb-cp-row em.bad { color:#c1122f; background:#fdecef; }
  .aglb-cp-row u { text-decoration:none; margin-left:auto; font-size:11px; font-weight:800;
    color:#94a3b8; font-variant-numeric:tabular-nums; }
  .aglb-cp-row u.warn { color:#a45b06; }
  .aglb-cp-row u.bad { color:#c1122f; }
  .aglb-cp-row.tot { padding-top:5px; border-top:1px dashed var(--ai-line); }

  /* (사용하지 않음) 계획과 등록 내역의 차이 */
  .aglb-gap { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; margin-top:10px;
    padding:10px 13px; border:1px solid #fde68a; border-radius:11px; background:#fffbeb; }
  .aglb-gap.over { border-color:#f6c3ce; background:#fff6f7; }
  .aglb-gap b { font-size:11.5px; font-weight:900; color:#a45b06; }
  .aglb-gap.over b { color:#c1122f; }
  .aglb-gap em { font-style:normal; font-size:15px; font-weight:900; color:#a45b06;
    font-variant-numeric:tabular-nums; }
  .aglb-gap.over em { color:#c1122f; }
  .aglb-gap span { flex:1 1 260px; min-width:0; font-size:11px; color:#7c5310; line-height:1.6; }
  .aglb-gap.over span { color:#8c3a44; }

  /* 인력 투입 일정(간트) */
  .aglg { margin-top:16px; border:1px solid var(--ai-line); border-radius:12px; background:#fff;
    overflow:hidden; }
  .aglg-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    padding:11px 14px; border-bottom:1px solid var(--ai-line); background:#fbfcfe; }
  .aglg-head b { font-size:12.5px; font-weight:900; color:var(--ai-ink); }
  .aglg-head span { font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; }
  .aglg-key { margin-left:auto; font-style:normal; font-size:10.5px; font-weight:800; color:#94a3b8;
    display:flex; align-items:center; gap:5px; }
  .aglg-key u { display:inline-block; width:14px; height:8px; border-radius:3px; text-decoration:none; }
  .aglg-key u.on { background:#6366f1; } .aglg-key u.new { background:#0f9d63; }
  .aglg-key u.out { background:#f5a623; }
  .aglg-scroll { overflow-x:auto; }
  .aglg-grid { display:grid; grid-template-columns:170px 1fr; align-items:center; min-width:640px; }
  .aglg-corner { }
  .aglg-years, .aglg-months { display:grid; grid-template-columns:repeat(var(--n),minmax(28px,1fr)); }
  .aglg-years span { font-size:10px; font-weight:900; color:#94a3b8; text-align:center;
    padding:7px 0 2px; border-left:1px solid #f1f5f9; }
  .aglg-months span { font-size:10px; font-weight:800; color:#94a3b8; text-align:center;
    padding:0 0 7px; border-left:1px solid #f1f5f9; }
  .aglg-months span.now { color:#ea002c; }
  .aglg-name { display:flex; flex-direction:column; gap:1px; padding:7px 12px 7px 14px;
    border-top:1px solid #f1f5f9; }
  .aglg-name b { font-size:12.5px; font-weight:800; color:var(--ai-ink); }
  .aglg-name span { font-size:10px; color:#94a3b8; }
  .aglg-track { position:relative; display:grid;
    grid-template-columns:repeat(var(--n),minmax(28px,1fr)); align-items:center;
    height:100%; min-height:38px; border-top:1px solid #f1f5f9; }
  .aglg-track i { height:100%; border-left:1px solid #f1f5f9; }
  .aglg-track i.now { background:#fff7f8; }
  .aglg-track u { grid-row:1; height:20px; border-radius:6px; text-decoration:none;
    display:flex; align-items:center; justify-content:center; margin:0 2px;
    font-size:10px; font-weight:900; color:#fff; }
  .aglg-track u.on { background:#6366f1; }
  .aglg-track u.new { background:#0f9d63; }
  .aglg-track u.out { background:#f5a623; }

  /* 우측 대화 */
  .agent-ga .agai-bubble { max-width:82%; font-size:13.5px; }
  .agga-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:9px; }
  .agga-chips button { border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:999px; padding:6px 12px; font:inherit; font-size:11.5px; font-weight:800;
    cursor:pointer; white-space:nowrap; }
  .agga-chips button:hover { border-color:#c7d2fe; color:#3730a3; }
  .agga-chips button.run { border-color:#c7d2fe; background:#f5f6ff; color:#3730a3; }
  .agga-input { display:flex; align-items:center; gap:8px; border:1px solid #d8dfea;
    border-radius:14px; background:#fff; padding:6px 6px 6px 15px; }
  .agga-input input { flex:1 1 auto; min-width:0; border:0; background:transparent; height:40px;
    font:inherit; font-size:14px; color:var(--ai-ink); }
  .agga-input input:focus { outline:none; }
  .agga-input input::placeholder { color:#a9b4c4; }
  .agga-input .agai-send { height:40px; padding:0 17px; font-size:13.5px; border-radius:10px; }

  @media (max-width:1100px) {
    .agga-grid { grid-template-columns:1fr; }
    .agga-col { height:auto; max-height:620px; }
  }

  .agent-ai { --ai-ink:#0b1220; --ai-line:#e7ebf3; --ai-soft:#f6f8fc;
    max-width:1240px; margin:0 auto !important; padding:0 0 132px;
    display:flex; flex-direction:column; gap:0; }

  /* ── 상단 LIVE 바 ── */
  .agai-top { position:sticky; top:66px; z-index:20; margin-bottom:18px;
    border:1px solid var(--ai-line); border-radius:20px; background:#fff;
    box-shadow:0 18px 44px -30px rgba(11,18,32,.5); padding:14px 18px 12px; }
  .agai-top.over { border-color:#f6b8b8; }
  .agai-top-line { display:flex; align-items:center; gap:9px; }
  .agai-top-line > strong { font-size:14px; font-weight:900; color:var(--ai-ink);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agai-sp { flex:1 1 auto; }
  .agai-ver { display:inline-flex; align-items:center; gap:5px; border:1px solid var(--ai-line);
    background:#fff; border-radius:999px; padding:4px 10px; font:inherit; font-size:11.5px;
    font-weight:800; color:#64748b; cursor:pointer; white-space:nowrap; }
  .agai-ver:hover { border-color:#c7d2fe; color:#3730a3; }
  .agai-ver b { color:var(--ai-ink); font-weight:900; }
  .agai-ver em { font-style:normal; font-size:10px; font-weight:900; color:#64748b; }
  .agai-ver em.draft { color:#3730a3; }
  .agai-conf { font-size:11px; font-weight:700; color:#94a3b8; white-space:nowrap; }
  .agai-hist { border:0; background:transparent; color:#94a3b8; font:inherit; font-size:11.5px;
    font-weight:800; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
  .agai-hist:hover { color:var(--ai-ink); }
  .agai-verwrap { margin-top:8px; }
  .agai-verwrap .agver { margin:0; }

  /* CP총액 버튼 — 버전 옆 */
  .agai-cpbtn { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--ai-line);
    background:#fff; border-radius:999px; padding:4px 12px; font:inherit; font-size:11.5px;
    font-weight:800; color:#64748b; cursor:pointer; white-space:nowrap; }
  .agai-cpbtn:hover { border-color:#c7d2fe; color:#3730a3; }
  .agai-cpbtn b { font-size:12.5px; font-weight:900; color:var(--ai-ink); font-variant-numeric:tabular-nums; }
  .agai-cpbtn u { text-decoration:none; color:#cbd5e1; font-size:10px; }
  .agai-cpbtn.over { border-color:#f6b8b8; color:#c1122f; }
  .agai-cpbtn.over b { color:#c1122f; }
  .agai-over { font-size:11px; font-weight:900; color:#c1122f; white-space:nowrap; }

  /* 숫자 — 지금 → 반영 후 (좌) · 계정 5칩 (우) */
  .agai-figs { display:flex; align-items:flex-start; gap:16px; margin-top:12px; }
  /* 반영 전후로 높이가 흔들리지 않게 증감 줄 자리를 늘 잡아 둡니다 */
  .agai-fig { display:flex; flex-direction:column; gap:2px; flex:0 0 auto; }
  .agai-fig > em.ph { visibility:hidden; }
  .agai-fig > span { font-size:10.5px; font-weight:800; color:#94a3b8; letter-spacing:.02em; }
  .agai-fig > b { font-size:26px; font-weight:900; color:var(--ai-ink); line-height:1.1;
    font-variant-numeric:tabular-nums; letter-spacing:-.6px; }
  .agai-fig > b i { font-style:normal; font-size:13px; font-weight:800; color:#94a3b8; margin-left:2px; }
  .agai-fig.after > b { color:#3730a3; }
  .agai-fig.idle > b { color:#cbd5e1; }
  .agai-fig > em { font-style:normal; font-size:12px; font-weight:900; font-variant-numeric:tabular-nums;
    min-height:17px; line-height:17px; }
  .agai-fig > em.up { color:#c1122f; } .agai-fig > em.down { color:#1d4ed8; }
  .agai-arrow { flex:0 0 auto; font-size:20px; font-weight:900; color:#dbe1ea;
    line-height:1.1; margin-top:17px; }
  .agai-arrow.on { color:#6366f1; }
  /* 계정 5칩 — 누르면 상세 시트가 올라옵니다 */
  .agai-accts { flex:1 1 auto; min-width:0; display:grid;
    grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin-top:0; margin-left:auto; }
  .agent-ga .agai-accts { gap:10px; }
  .agent-ga .agai-acct { padding:9px 13px 8px; }
  .agent-ga .agai-acct b { font-size:15.5px; }
  .agai-acct { display:flex; flex-direction:column; gap:2px; border:1px solid var(--ai-line);
    background:#fff; border-radius:12px; padding:8px 10px 7px; font:inherit; cursor:pointer;
    text-align:left; min-width:0; }
  .agai-acct:hover { border-color:#c7d2fe; background:#fbfcff; }
  .agai-acct.on { border-color:#6366f1; background:#f5f6ff; }
  .agai-acct.up { border-color:#f6c3ce; } .agai-acct.down { border-color:#bfd3f5; }
  .agai-acct em { font-style:normal; font-size:10.5px; font-weight:900; border-radius:5px;
    padding:1px 6px; align-self:flex-start; }
  .agai-acct b { font-size:14px; font-weight:900; color:var(--ai-ink);
    font-variant-numeric:tabular-nums; letter-spacing:-.3px; }
  .agai-mini { display:block; height:3px; border-radius:999px; background:#eef1f7; overflow:hidden; }
  .agai-mini u { display:block; height:100%; background:#94a3b8; text-decoration:none; }
  .agai-acct span { font-size:10.5px; font-weight:800; color:#94a3b8; font-variant-numeric:tabular-nums;
    min-height:15px; line-height:15px; }
  .agai-acct.up span { color:#c1122f; } .agai-acct.down span { color:#1d4ed8; }

  /* ── 스트림 ── */
  .agai-stream { display:flex; flex-direction:column; gap:14px; }
  .agai-say { display:flex; flex-direction:column; gap:4px; }
  .agai-say.pm { align-items:flex-end; }
  .agai-who { font-size:10.5px; font-weight:900; color:#94a3b8; padding:0 4px; }
  .agai-bubble { max-width:76%; border-radius:16px; padding:11px 15px; font-size:14px;
    line-height:1.75; color:#1e2938; background:var(--ai-soft); border:1px solid var(--ai-line); }
  .agai-say.pm .agai-bubble { background:var(--ai-ink); border-color:var(--ai-ink); color:#fff; }
  .agai-bubble.pending { color:#94a3b8; }
  /* Agent 답변에 붙는 동작 버튼 */
  .agc-act { display:flex; gap:6px; flex-wrap:wrap; margin-top:7px; }
  .agc-act button { border:1px solid var(--ai-line, #e7ebf3); background:#fff; color:#475569;
    border-radius:9px; padding:7px 13px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agc-act button:hover { border-color:#94a3b8; color:#0b1220; }
  .agc-act-go { border-color:#0f9d63 !important; background:#0f9d63 !important; color:#fff !important; }
  .agc-act-go:hover { background:#0b7f50 !important; }

  /* 결정 덱 */
  .agai-deck { display:flex; flex-direction:column; gap:8px; }
  .agai-deck-head { display:flex; align-items:center; gap:8px; padding:0 4px; }
  .agai-deck-head b { font-size:11px; font-weight:900; color:#64748b; letter-spacing:.04em; }
  .agai-deck-head em { font-style:normal; font-size:10.5px; font-weight:900; color:#fff;
    background:#ea002c; border-radius:999px; padding:2px 8px; }
  .agai-deck-head em.on { background:#0f9d63; }
  .agai-deck-head b.on { color:#0f9d63; margin-left:6px; }
  .agai-deck-draft { margin-left:auto; border:0; background:var(--ai-ink); color:#fff;
    border-radius:9px; padding:7px 14px; font:inherit; font-size:12px; font-weight:900; cursor:pointer; }
  .agai-deck-draft:hover { background:#000; }

  /* 결정 카드 */
  .agai-card { border:1px solid var(--ai-line); border-left:3px solid #cbd5e1; border-radius:14px;
    background:#fff; padding:12px 15px 11px; }
  .agai-card.agent { border-left-color:#6366f1; }
  .agai-card.sim { border-left-color:#f5a623; }
  .agai-card.manual { border-left-color:#a45b06; }
  .agai-card.on { background:#f8fdfa; border-left-color:#0f9d63; }
  .agai-card-top { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
  .agai-card-top b { flex:1 1 auto; min-width:0; font-size:14.5px; font-weight:800; color:var(--ai-ink);
    line-height:1.5; }
  .agai-amt { flex:0 0 auto; font-style:normal; font-size:16px; font-weight:900;
    font-variant-numeric:tabular-nums; color:#64748b; }
  .agai-amt.up { color:#c1122f; } .agai-amt.down { color:#1d4ed8; }
  .agai-legs { flex:0 0 auto; font-style:normal; font-size:12px; font-weight:800; color:#475569;
    font-variant-numeric:tabular-nums; }
  .agai-card-opt { margin-top:5px; font-size:12.5px; font-weight:800; color:#0f9d63; }
  .agai-gwhy { margin:0 0 7px !important; padding-bottom:7px; border-bottom:1px dashed var(--ai-line);
    color:#475569 !important; }
  .agai-card-meta { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:6px; }
  .agai-card-meta span { font-size:10.5px; color:#94a3b8; }
  .agai-tag { font-style:normal; font-size:10px; font-weight:900; border-radius:5px; padding:2px 7px; }
  .agai-tag.agent { color:#3730a3; background:#eef2ff; }
  .agai-tag.sim { color:#a45b06; background:#fff5e5; }
  .agai-tag.manual { color:#a45b06; background:#fff5e5; }
  .agai-conf-n { font-weight:800 !important; }
  .agai-conf-n.hi { color:#12724f !important; } .agai-conf-n.mid { color:#a45b06 !important; }
  .agai-conf-n.lo { color:#c1122f !important; }
  .agai-pick1 { font-weight:900 !important; color:#3730a3 !important; background:#eef2ff;
    border-radius:5px; padding:2px 7px; }
  .agai-card-acts { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:10px; }
  .agai-card-acts button { border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:9px; padding:7px 13px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agai-card-acts button:hover { border-color:#94a3b8; color:var(--ai-ink); }
  .agai-yes { border-color:#0f9d63 !important; color:#0f9d63 !important; }
  .agai-yes:hover { background:#e9f8f1 !important; }
  .agai-yes.on { background:#0f9d63 !important; border-color:#0f9d63 !important; color:#fff !important; }
  .agai-seg { min-width:52px; text-align:center; }
  .agai-seg.on { background:#0f9d63 !important; border-color:#0f9d63 !important; color:#fff !important; }
  .agai-why.on { background:#f5f6ff !important; border-color:#c7d2fe !important; color:#3730a3 !important; }
  .agai-ask { border-color:#dbe3f5 !important; background:#f8faff !important; color:#3730a3 !important; }
  .agai-card-why { margin-top:11px; padding-top:10px; border-top:1px dashed var(--ai-line); }
  .agai-card-why p { margin:0; font-size:13px; color:#334155; line-height:1.8; }
  .agai-card-why p.agai-impact { margin-top:8px; font-size:12px; color:#0d6f9e; }
  .agai-src { display:flex; flex-direction:column; gap:3px; margin-top:9px; padding:9px 12px;
    border-radius:10px; background:var(--ai-soft); }
  .agai-src b { font-size:11.5px; font-weight:900; color:#3730a3; }
  .agai-src span { font-size:11.5px; color:#475569; line-height:1.65; }
  .agai-months { display:flex; gap:5px; flex-wrap:wrap; margin-top:9px; }
  .agai-months span { display:inline-flex; flex-direction:column; gap:1px; border:1px solid var(--ai-line);
    border-radius:8px; padding:5px 9px; font-size:10px; color:#94a3b8; }
  .agai-months b { font-size:11.5px; font-weight:900; color:var(--ai-ink);
    font-variant-numeric:tabular-nums; }
  .agai-detail { margin-top:10px; border:0; background:transparent; color:#3730a3;
    font:inherit; font-size:12px; font-weight:900; cursor:pointer; padding:0; }
  .agai-detail:hover { text-decoration:underline; }

  /* 결재 흐름 줄 */
  .agai-flow { display:flex; flex-direction:column; gap:6px; }
  .agai-flow-row { display:flex; align-items:center; gap:9px; border-radius:11px; padding:10px 14px;
    font-size:12.5px; font-weight:800; }
  .agai-flow-row em { margin-left:auto; font-style:normal; font-variant-numeric:tabular-nums; }
  .agai-flow-row button { border:1px solid currentColor; background:transparent; color:inherit;
    border-radius:8px; padding:5px 11px; font:inherit; font-size:11.5px; font-weight:800; cursor:pointer; }
  .agai-flow-row.sub { background:#eef2ff; color:#3730a3; }
  .agai-flow-row.ok { background:#e9f8f1; color:#12724f; }
  .agai-flow-row.bad { background:#fff5e5; color:#a45b06; }

  /* ── 하단 한 줄 입력 ── */
  .agai-composer { position:fixed; left:0; right:0; bottom:0; z-index:30;
    padding:12px 24px 16px; background:linear-gradient(180deg,rgba(246,248,252,0) 0%,#f4f6f8 42%); }
  .agai-chips { display:flex; gap:6px; flex-wrap:wrap; justify-content:center;
    max-width:1240px; margin:0 auto 8px; }
  .agai-chips button { border:1px solid var(--ai-line); background:#fff; color:#475569;
    border-radius:999px; padding:7px 14px; font:inherit; font-size:12px; font-weight:800;
    cursor:pointer; white-space:nowrap; box-shadow:0 4px 14px -10px rgba(11,18,32,.4); }
  .agai-chips button:hover { border-color:#c7d2fe; color:#3730a3; }
  .agai-chips button.run { border-color:#c7d2fe; background:#f5f6ff; color:#3730a3; }
  .agai-input { display:flex; align-items:center; gap:8px; max-width:1240px; margin:0 auto;
    border:1px solid #d8dfea; border-radius:18px; background:#fff; padding:8px 8px 8px 18px;
    box-shadow:0 20px 48px -26px rgba(11,18,32,.45); }
  .agai-input input { flex:1 1 auto; min-width:0; border:0; background:transparent; height:44px;
    font:inherit; font-size:15px; color:var(--ai-ink); }
  .agai-input input:focus { outline:none; }
  .agai-input input::placeholder { color:#a9b4c4; }
  .agai-send { flex:0 0 auto; border:0; background:var(--ai-ink); color:#fff; border-radius:12px;
    height:44px; padding:0 20px; font:inherit; font-size:14px; font-weight:900; cursor:pointer; }
  .agai-send:hover { background:#000; }
  .agai-draft { flex:0 0 auto; border:1px solid #0f9d63; background:#0f9d63; color:#fff;
    border-radius:12px; height:44px; padding:0 18px; font:inherit; font-size:14px; font-weight:900;
    cursor:pointer; white-space:nowrap; }
  .agai-draft:hover:not(:disabled) { background:#0b7f50; }
  .agai-draft:disabled { opacity:.35; cursor:default; }

  /* ── 계정 상세 시트 ── */
  .agai-sheet-dim { position:fixed; inset:0; z-index:80; display:flex; align-items:flex-end;
    justify-content:center; background:rgba(11,18,32,.4); padding:40px 20px 0; }
  .agai-sheet { width:min(1180px,100%); max-height:calc(100dvh - 40px); background:#fff;
    border:1px solid var(--ai-line); border-radius:22px 22px 0 0; overflow:hidden;
    display:flex; flex-direction:column; box-shadow:0 -20px 60px -30px rgba(11,18,32,.6); }
  .agai-sheet-head { flex:0 0 auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    padding:15px 20px; border-bottom:1px solid var(--ai-line); }
  .agai-sheet-head > b { font-size:19px; font-weight:900; color:var(--ai-ink);
    font-variant-numeric:tabular-nums; }
  .agai-sheet-sub { font-size:11.5px; color:#94a3b8; }
  .agai-sheet-ask { border:1px solid #dbe3f5; background:#f8faff; color:#3730a3; border-radius:9px;
    padding:7px 13px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agai-sheet-x { border:0; background:transparent; color:#94a3b8; font-size:17px; cursor:pointer;
    padding:2px 6px; }
  .agai-sheet-x:hover { color:var(--ai-ink); }
  .agai-sheet-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:16px 20px 24px; }
  .agai-sheet-body .setup-expanded-detail,
  .agai-sheet-body .setup-editor { border:0 !important; padding:0 !important;
    background:transparent !important; border-radius:0 !important; }

  @media (max-width:1360px) {
    .agai-figs { flex-wrap:wrap; }
    .agai-accts { flex:1 1 100%; margin-top:12px; margin-left:0; }
  }
  @media (max-width:1100px) {
    .agai-accts { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .agai-bubble { max-width:92%; }
  }

  /* ===== [2026.09.03] 6안 — 3분할 간소화 (대화 시뮬레이션) ===== */
  /* 예산 현황 칸은 표 하나만 둡니다 — 카드 레일과 인사이트 블록을 쓰지 않습니다 */
  .agent-sim .agsim-table-wrap { overflow-x:auto; border:1px solid var(--agc-line);
    border-radius:12px; background:#fff; }
  .agent-sim .agsim-table { margin:0; border:0; }
  .agsim-row { cursor:pointer; }
  .agsim-row:hover td { background:#f8fafc; }
  .agsim-row.on td { background:#f5f6ff; }
  .agsim-row.simmed td { background:#fffdf5; }
  .agsim-row.simmed:hover td { background:#fff9ea; }
  .agin-table th.sim, .agin-table td.sim { background:#fffdf5; }
  .agin-table td.sim.up { color:#c1122f; font-weight:900; }
  .agin-table td.sim.down { color:#1d4ed8; font-weight:900; }

  /* 시뮬레이션 상태 배너 */
  .agsim-state { margin:0 0 11px; border:1px solid #f5a623; border-radius:12px;
    background:linear-gradient(180deg,#fffdf5,#fff); padding:11px 13px 10px; }
  .agsim-state.over { border-color:#fca5a5; background:linear-gradient(180deg,#fff6f6,#fff); }
  .agsim-state-top { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
  .agsim-state-top b { flex:0 0 auto; font-size:13px; font-weight:900; color:#a45b06; }
  .agsim-state.over .agsim-state-top b { color:#b91c1c; }
  .agsim-state-top span { flex:1 1 auto; min-width:0; font-size:12px; font-weight:700; color:#7c5310; }
  .agsim-state-top em { flex:0 0 auto; font-style:normal; font-size:13px; font-weight:900;
    font-variant-numeric:tabular-nums; border-radius:6px; padding:2px 9px; }
  .agsim-state-top em.up { color:#c1122f; background:#fdecef; }
  .agsim-state-top em.down { color:#1d4ed8; background:#e9f0fd; }
  .agsim-state-top em.zero { color:#64748b; background:#f1f5f9; }
  .agsim-state-kv { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-top:9px;
    padding-top:9px; border-top:1px solid #f2e6c8; }
  .agsim-state-kv span { font-size:11px; font-weight:800; color:#94a3b8; }
  .agsim-state-kv b { margin-right:10px; font-size:13.5px; font-weight:900; color:#0f172a;
    font-variant-numeric:tabular-nums; }
  .agsim-state-kv b i { font-style:normal; color:#cbd5e1; margin:0 3px; }
  .agsim-state-kv b.bad { color:#c1122f; }
  .agsim-warn { margin:8px 0 0; font-size:11.5px; color:#7c5310; line-height:1.6; }
  .agsim-warn b { font-weight:900; color:#a45b06; }
  .agsim-warn.big { font-weight:800; color:#b91c1c; }
  .agsim-acts { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:10px; }
  .agsim-acts button { border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:9px; padding:8px 13px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agsim-acts button:hover { border-color:#94a3b8; color:#0f172a; }
  .agsim-commit { border-color:#0f9d63 !important; background:#0f9d63 !important; color:#fff !important; }
  .agsim-commit:hover:not(:disabled) { background:#0b7f50 !important; }
  .agsim-commit:disabled { opacity:.45; cursor:default; }
  .agsim-plans { display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-left:auto;
    font-size:11px; font-weight:800; color:#94a3b8; }
  .agsim-plan { border-color:#c7d2fe !important; background:#eef2ff !important; color:#3730a3 !important;
    padding:6px 11px !important; font-size:11.5px !important; }
  .agsim-plan i { font-style:normal; margin-left:5px; font-weight:900; font-variant-numeric:tabular-nums; }

  /* 계정 상세 진입 */
  .agsim-detail-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:11px;
    padding-bottom:9px; border-bottom:1px solid var(--agc-line); }
  .agsim-back { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:9px; padding:7px 12px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agsim-back:hover { border-color:#94a3b8; color:#0f172a; }
  .agsim-detail-head b { flex:0 0 auto; font-size:14px; font-weight:900; color:#0f172a; }
  .agsim-detail-head span { flex:1 1 auto; min-width:0; font-size:11.5px; color:#94a3b8; }

  /* 대화 칸은 6안에서 주 작업 창구라 조금 더 높게 */
  .agent-sim .agent-pane.chat .agpane-body { min-height:220px; }

  /* 상단 한 줄 — 프로젝트 정보 + 실행예산 버전 */
  /* 공통 CSS 의 overflow-x:auto 를 풀어 줍니다 — 버전 드롭박스가 줄 안에 갇혀
     스크롤 영역이 되어 버립니다. 대신 좁은 화면에서는 아래에서 두 줄로 접습니다. */
  .agent-sim .budget-proj-info { flex-wrap:nowrap; row-gap:8px; margin-bottom:12px;
    overflow:visible !important; }
  .agent-sim .budget-proj-info .agver { margin:0 0 0 14px; padding-left:14px;
    border-left:1px solid #e5e7eb; gap:8px; flex-wrap:nowrap; }
  .agent-sim .budget-proj-info .agver-btn { padding:5px 10px; }
  .agent-sim .budget-proj-info .agver-note { white-space:nowrap; }
  .agent-sim .budget-proj-info .bpi-item:first-of-type { margin-left:auto; }
  @media (max-width:1360px) {
    .agent-sim .budget-proj-info { flex-wrap:wrap; }
    .agent-sim .budget-proj-info .agver { margin-left:0; padding-left:0; border-left:0; }
  }

  /* 표 정보량 전환 (간단 / 기본 / 상세) */
  .agsim-density { display:flex; align-items:center; gap:3px; margin:0 0 8px; }
  .agsim-density > span { margin-right:5px; font-size:10.5px; font-weight:800; color:#94a3b8;
    letter-spacing:.03em; }
  .agsd-btn { border:1px solid #e5e7eb; background:#fff; color:#94a3b8; border-radius:8px;
    padding:5px 11px; font:inherit; font-size:11.5px; font-weight:800; cursor:pointer; }
  .agsd-btn:hover { color:#475569; background:#f8fafc; }
  .agsd-btn.on { border-color:#1c2432; background:#1c2432; color:#fff; }

  /* '기본' 단계의 집행 칸 — 금액 · 집행률 · 막대를 한 셀에 */
  .agsim-run { min-width:132px; }
  .agsim-table td.agsim-run { white-space:nowrap; }
  .agsim-table td.agsim-run b { font-size:12.5px; font-weight:800; color:#12724f;
    font-variant-numeric:tabular-nums; }
  .agsim-table td.agsim-run span { margin-left:6px; font-size:11px; font-weight:800; color:#94a3b8;
    font-variant-numeric:tabular-nums; }
  .agsim-table td.agsim-run .agin-bar { margin-top:4px; min-width:110px; }
  .agsim-table tfoot td.agsim-run b { color:#0f172a; }
  .agsim-judge { min-width:60px; }
  .agsim-wait { margin:8px 0 0; padding:7px 11px; border:1px solid #fde68a; border-radius:9px;
    background:#fffbeb; font-size:11.5px; color:#7c5310; line-height:1.55; }
  .agsim-table.den-lite td.after b, .agsim-table.den-mid td.after b { color:#3730a3; }

  /* 배치 — 좌측 30%(예산 현황 + 해야 할 일) · 우측 70% Agent와 대화하기 */
  .agent-sim .agsim-grid { grid-template-columns:minmax(340px,30%) minmax(0,1fr);
    grid-template-rows:auto; align-items:start; gap:12px; }
  /* 스크롤을 내려도 예산 현황이 따라오게 하는 가장 확실한 방법은
     세 칸을 화면 안에 다 담아 스크롤 자체를 없애는 것입니다.
     · 위/아래 여백을 줄이고
     · 좌우 두 컬럼을 같은 높이(뷰포트에 맞춤)로 잡고
     · 각 칸은 넘치면 자기 안에서만 스크롤합니다.
     그래도 창이 아주 짧아 페이지 스크롤이 생기면 좌측 컬럼이 sticky 로 따라옵니다. */
  body.agent-sim-on #s-budget { padding:16px 22px; }
  body.agent-sim-on .content { padding:10px 12px 14px; }
  .agent-sim { margin-bottom:4px !important; }
  /* 대화 칸은 화면 높이에 맞춥니다 — 입력창이 늘 보여서, 대화를 쓰려고
     스크롤을 내릴 일이 없습니다. 대화 내용은 칸 안에서만 스크롤합니다. */
  .agent-sim .agsim-grid > .agent-pane.chat.normal {
    height:clamp(460px, calc(100vh - 296px), 980px);
    height:clamp(460px, calc(100dvh - 296px), 980px);
  }
  /* 좌측은 표를 절대 자르지 않습니다. 화면이 넉넉해 대화 칸이 더 길 때는
     sticky 로 따라붙고, 좁을 때는 표가 위에 온전히 보이는 상태로 시작합니다. */
  .agent-sim .agsim-grid > .agsim-left { position:sticky; top:72px; z-index:5;
    display:flex; flex-direction:column; gap:14px; min-width:0; height:auto; }
  .agent-sim .agsim-left > .agent-pane.budget.normal { height:auto; flex:0 0 auto; }
  .agent-sim .agsim-left > .agent-pane.budget.normal .agpane-body { max-height:none; overflow-y:visible; }
  /* 해야 할 일은 목록이 길면 칸 안에서만 스크롤합니다 */
  .agent-sim .agsim-left > .agent-pane.todo.normal { height:auto; flex:0 1 auto;
    max-height:clamp(320px, calc(100dvh - 452px), 600px); min-height:320px; }
  .agent-sim .agsim-left > .agent-pane.todo.normal .agpane-body { min-height:0; overflow-y:auto; }
  @media (max-width:1100px) {
    .agent-sim .agsim-grid > .agsim-left,
    .agent-sim .agsim-grid > .agent-pane.chat.normal { height:auto; }
    .agent-sim .agsim-grid > .agsim-left { position:static; }
  }
  .agent-sim .agent-pane.budget .agpane-body { padding:12px 12px; }
  /* 좌측이 30% 로 좁아졌으니 표는 조밀하게 — 4열이 스크롤 없이 들어갑니다 */
  .agent-sim .agsim-table th { padding:8px 7px; font-size:10.5px; }
  .agent-sim .agsim-table td { padding:9px 7px; font-size:13px; }
  .agent-sim .agsim-table td.num { font-weight:700; }
  .agent-sim .agsim-table td.after, .agent-sim .agsim-table tfoot td { font-size:13.5px; }
  .agent-sim .agsim-table th:first-child, .agent-sim .agsim-table td:first-child { padding-left:11px; }
  .agent-sim .agsim-table th:last-child, .agent-sim .agsim-table td:last-child { padding-right:11px; }
  .agent-sim .agsim-table .agp-acct.sm { font-size:11px; padding:2px 6px; }
  .agent-sim .agsim-wait { font-size:10.5px; padding:6px 9px; }
  .agent-sim .agent-pane.budget .agpane-body { padding:10px 10px; }
  .agent-sim .agent-pane.budget .agpane-head { padding:10px 12px; }
  .agent-sim .agent-pane.budget .agpane-title strong { font-size:14px; }
  /* CP 칩은 좁은 칸에서 줄바꿈되도록 */
  .agent-sim .agent-pane.budget .agpane-head { flex-wrap:wrap; row-gap:6px; }
  .agent-sim .agent-pane.budget .agcp-chip { font-size:11px; }

  /* 해야 할 일 — 계정 5건이 한눈에 들어가도록 한 건을 2줄로 압축합니다.
     1줄: 계정 배지 + 제목(넘치면 …)   2줄: 증감 금액        우측: N · 펼치기 */
  .agent-sim .agsim-left .agm-line { align-items:center; gap:3px; padding:3px 5px 3px 3px; }
  .agent-sim .agsim-left .agm-open { flex:1 1 auto; min-width:0; flex-wrap:wrap;
    row-gap:1px; column-gap:7px; padding:5px 4px; }
  .agent-sim .agsim-left .agm-open b { flex:1 1 0; min-width:0; font-size:12.5px; line-height:1.4;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agent-sim .agsim-left .agm-delta { flex:1 1 100%; font-size:12.5px; }
  .agent-sim .agsim-left .agm-delta.multi { font-size:11.5px; gap:7px; }
  .agent-sim .agsim-left .agm-tag { font-size:9.5px; padding:2px 6px; }
  .agent-sim .agsim-left .agm-yn { flex:0 0 auto; gap:4px; }
  .agent-sim .agsim-left .agm-yn button { height:30px; min-width:32px; font-size:12px; }
  /* 조정은 대화로 합니다 — 수동 개입 버튼은 6안 목록에 두지 않습니다 */
  .agent-sim .agsim-left .agm-yn .agm-manual { display:none; }
  .agent-sim .agsim-left .agm-done { font-size:10.5px; padding:4px 8px; }
  .agent-sim .agsim-left .agm-caret-btn { flex:0 0 auto; padding:0 6px; }
  .agent-sim .agsim-left .agm-check { padding:0 1px; }
  /* 택1 그룹도 같은 밀도로 */
  .agent-sim .agsim-left .agex-group { padding:7px 9px 6px; }
  .agent-sim .agsim-left .agex-gopen { gap:7px; }
  .agent-sim .agsim-left .agex-gtitle b { font-size:12.5px; line-height:1.4;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agent-sim .agsim-left .agex-gtitle span { font-size:10.5px; margin-top:2px; }
  .agent-sim .agsim-left .agm-list { gap:5px; }
  .agent-sim .agsim-left .agpane-head { padding:10px 12px; }
  .agent-sim .agsim-left .agpane-title strong { font-size:14px; }
  .agent-sim .agsim-left .agpane-actbar { padding:6px 10px; }

  /* 채팅 — 이 화면의 주 작업 공간 */
  .agent-sim .agent-pane.chat .agpane-title strong { font-size:16px; }
  .agent-sim .agent-pane.chat .agc-text { font-size:14px; line-height:1.75; }
  .agent-sim .agent-pane.chat .agpane-foot input { height:46px; font-size:14.5px; }
  .agent-sim .agent-pane.chat .agpane-foot button { height:46px; font-size:14px; padding:0 20px; }
  .agcq { display:flex; gap:6px; flex-wrap:wrap; padding:9px 14px 0; }
  .agcq button { border:1px solid #dbe3f5; background:#f8faff; color:#3730a3;
    border-radius:999px; padding:7px 13px; font:inherit; font-size:12px; font-weight:800;
    cursor:pointer; white-space:nowrap; }
  .agcq button:hover { background:#eef2ff; border-color:#c7d2fe; }
  .agcq button.run { border-color:#c7d2fe; background:#eef2ff; }
  .agcq button.run:hover { background:#e0e7ff; }

  /* 해야 할 일 제목 줄에 올린 전체선택 · 기안 버튼 */
  .agent-sim .agsim-left .agpane-head { gap:8px; }
  .agm-check.all.inline { flex:0 0 auto; display:flex; align-items:center; gap:5px;
    margin-left:auto; font-size:11px; font-weight:800; color:#64748b; cursor:pointer;
    white-space:nowrap; padding:0; }
  .agm-check.all.inline { border:0 !important; background:transparent !important; height:auto !important; }
  .agm-check.all.inline input { width:15px; height:15px; }

  /* 접힌 칸 — 제목과 창 버튼만 남깁니다 */
  .agent-pane.collapsed .agpane-title span,
  .agent-pane.collapsed .agpane-actbar,
  .agent-pane.collapsed .agcp-chip,
  .agent-pane.collapsed .agm-check,
  .agent-pane.collapsed .agm-box-draft,
  .agent-pane.collapsed .agpane-foot,
  .agent-pane.collapsed .agcq { display:none !important; }

  /* 해야 할 일 전체폭 — 5개 대계정 탭 + 상세 */
  .agtd-acct { margin-top:14px; padding-top:14px; border-top:1px solid var(--agc-line); }
  .agtd-acct .acct-tile-group { margin:0 0 12px; }
  .agtd-acct .setup-expanded-detail { border:0 !important; padding:0 !important;
    background:transparent !important; border-radius:0 !important; }
  .agm-box-draft.sm { flex:0 0 auto; border:0; background:#0f9d63; color:#fff;
    border-radius:8px; padding:6px 11px; font:inherit; font-size:11.5px; font-weight:800;
    cursor:pointer; white-space:nowrap; }
  .agm-box-draft.sm:hover { background:#0b7f50; }
  .agsim-draft { border-color:#1c2432 !important; background:#1c2432 !important; color:#fff !important; }
  .agsim-draft:hover:not(:disabled) { background:#0b1220 !important; }
  .agsim-draft:disabled { opacity:.45; cursor:default; }
  @media (max-width:1420px) {
    .agent-sim .agsim-table.den-full .agin-health-desc { display:none; }
  }

  /* ===== [2026.09.03] 수동 개입 편집기 ===== */
  .agme { margin:0 0 12px; border:1px solid #fde68a; border-radius:13px;
    background:linear-gradient(180deg,#fffdf5,#fff); padding:12px 14px 11px; }
  .agme.on { border-color:#f5a623; }
  .agme.empty { color:#94a3b8; font-size:12.5px; }
  .agme-head { display:flex; align-items:flex-start; gap:12px; }
  .agme-t { flex:1 1 auto; min-width:0; }
  .agme-t b { display:block; font-size:13.5px; font-weight:900; color:#a45b06; }
  .agme-t span { display:block; margin-top:3px; font-size:11.5px; color:#7c5310; line-height:1.6; }
  .agme-t span i { font-style:normal; font-weight:900; }
  .agme-reset { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:9px; padding:8px 13px; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
  .agme-reset:hover:not(:disabled) { border-color:#94a3b8; color:#0f172a; }
  .agme-reset:disabled { opacity:.4; cursor:default; }
  .agme-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr));
    gap:7px; margin-top:11px; }
  .agme-cell { display:flex; flex-direction:column; gap:3px; border:1px solid #e5e7eb;
    border-radius:10px; background:#fff; padding:7px 9px 6px; }
  .agme-cell em { font-style:normal; font-size:10.5px; font-weight:800; color:#94a3b8; }
  .agme-cell input { width:100%; border:0; border-bottom:1px solid #e5e7eb; background:transparent;
    padding:2px 0 3px; font:inherit; font-size:14px; font-weight:900; color:#0f172a;
    text-align:right; font-variant-numeric:tabular-nums; }
  .agme-cell input:focus { outline:none; border-bottom-color:#f5a623; }
  .agme-cell i { font-style:normal; font-size:10.5px; font-weight:800; color:#cbd5e1;
    text-align:right; font-variant-numeric:tabular-nums; }
  .agme-cell.up { border-color:#f6c3ce; background:#fffafb; }
  .agme-cell.up i { color:#c1122f; }
  .agme-cell.down { border-color:#bfd3f5; background:#fafcff; }
  .agme-cell.down i { color:#1d4ed8; }
  .agme-foot { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-top:11px;
    padding-top:10px; border-top:1px solid #f2e6c8; }
  .agme-foot span { font-size:11.5px; font-weight:800; color:#7c5310; }
  .agme-foot b { font-size:14px; font-weight:900; color:#0f172a; font-variant-numeric:tabular-nums; }
  .agme-foot b.to { color:#a45b06; }
  .agme-ar { font-style:normal; color:#d6c08a; font-weight:900; }
  .agme-foot em { margin-left:auto; font-style:normal; font-size:13px; font-weight:900;
    font-variant-numeric:tabular-nums; border-radius:6px; padding:3px 9px; }
  .agme-foot em.up { color:#c1122f; background:#fdecef; }
  .agme-foot em.down { color:#1d4ed8; background:#e9f0fd; }
  .agme-foot em.zero { color:#64748b; background:#f1f5f9; }
  .agme-note { margin:9px 0 0; font-size:11.5px; color:#7c5310; line-height:1.65; }
  .agme-note b { font-weight:900; color:#a45b06; }

  /* 해야 할 일 — Agent 제안 / 수동 개입 구분 */
  .agm-tag.manual { border-color:#f5a623; background:#fff5e5; color:#a45b06; }
  .agm-tag.agent { border-color:#c7d2fe; background:#eef2ff; color:#3730a3; }
  .agm-row.is-manual { background:#fffdf5; }
  .agm-row.is-manual .agm-line { border-left:3px solid #f5a623; border-radius:3px 0 0 3px; }
  /* [되돌리기]는 글자가 길어 고정 폭(44px)을 풀어 줍니다 */
  .agm-row.is-manual .agm-yn .agm-n { width:auto; padding:0 13px; white-space:nowrap; }

  /* ===== [2026.09.03] CP총액 대비 영향 ===== */
  .agcpd { margin:0 0 10px; border:1px solid #dbe3f5; border-radius:12px;
    background:linear-gradient(180deg,#f8faff,#fff); padding:11px 13px 10px; }
  .agcpd.over { border-color:#fca5a5; background:linear-gradient(180deg,#fff6f6,#fff); }
  .agcpd-t { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
  .agcpd-t b { font-size:12.5px; font-weight:900; color:#1e3a8a; }
  .agcpd.over .agcpd-t b { color:#b91c1c; }
  .agcpd-t span { margin-left:auto; font-size:11.5px; font-weight:800; color:#64748b;
    font-variant-numeric:tabular-nums; }
  .agcpd-kv { list-style:none; margin:9px 0 0; padding:0; display:flex; flex-direction:column; gap:5px; }
  .agcpd-kv li { display:flex; align-items:baseline; gap:9px; }
  .agcpd-kv li > span { flex:0 0 96px; font-size:11.5px; font-weight:800; color:#64748b; }
  .agcpd-kv li > b { flex:1 1 auto; min-width:0; font-size:13.5px; font-weight:900; color:#0f172a;
    font-variant-numeric:tabular-nums; }
  .agcpd-kv li > b i { font-style:normal; color:#cbd5e1; margin:0 3px; font-weight:900; }
  .agcpd-kv li > em { flex:0 0 auto; font-style:normal; font-size:12.5px; font-weight:900;
    font-variant-numeric:tabular-nums; border-radius:6px; padding:2px 8px; white-space:nowrap; }
  .agcpd-kv li > em.up { color:#c1122f; background:#fdecef; }
  .agcpd-kv li > em.down { color:#1d4ed8; background:#e9f0fd; }
  .agcpd-kv li > em.zero { color:#64748b; background:#f1f5f9; }
  .agcpd-bar { display:flex; height:8px; margin-top:10px; border-radius:999px;
    background:#e8edf6; overflow:hidden; }
  .agcpd-bar i { background:#94a3b8; }
  .agcpd-bar u { text-decoration:none; }
  .agcpd-bar u.up { background:#ea002c; }
  .agcpd-bar u.down { background:#2563eb; }
  .agcpd.over .agcpd-bar i { background:#f19aa6; }
  .agcpd-note { margin:8px 0 0; font-size:11.5px; color:#475569; line-height:1.6; }
  .agcpd.over .agcpd-note { font-weight:800; color:#b91c1c; }
  .agcpd-acct { margin:7px 0 0; padding:7px 10px; border:1px solid #fde68a; border-radius:8px;
    background:#fffbeb; font-size:11.5px; color:#7c5310; line-height:1.65; }
  .agcpd-acct b { font-weight:900; color:#a45b06; }
  .agcpd-acct i { display:block; margin-top:3px; font-style:normal; font-size:11px; color:#a08350; }
  /* 승인자 화면 — 3항목을 가로로 (요구 4) */
  .agcpd.compact { padding:11px 13px 10px; }
  .agcpd.compact .agcpd-kv { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  .agcpd.compact .agcpd-kv li { flex-direction:column; align-items:flex-start; gap:2px;
    border:1px solid #e3eaf7; border-radius:10px; background:#fff; padding:9px 11px 8px; }
  .agcpd.compact .agcpd-kv li > span { flex:0 0 auto; }
  .agcpd.compact .agcpd-kv li > b { flex:0 0 auto; font-size:14px; }
  .agcpd.compact .agcpd-kv li > em { margin-left:0; margin-top:2px; font-size:12px; padding:2px 7px; }
  .agcpd.compact.over .agcpd-kv li { border-color:#f6d0d0; }
  @media (max-width:900px) {
    .agcpd.compact .agcpd-kv { grid-template-columns:1fr; }
    .agcpd.compact .agcpd-kv li { flex-direction:row; align-items:baseline; gap:9px; }
    .agcpd.compact .agcpd-kv li > b { flex:1 1 auto; }
    .agcpd.compact .agcpd-kv li > em { margin-left:auto; margin-top:0; }
  }

  /* ===== [2026.09.03] 결재할 일 — 계정 × 월 변동 (요구 5) ===== */
  .agdm { margin:10px 0 0; border:1px solid #e5e7eb; border-radius:12px; background:#fff; overflow:hidden; }
  .agdm.open { border-color:#dbe3f5; }
  .agdm-head { display:flex; align-items:center; gap:10px; width:100%; border:0; background:#f8fafc;
    padding:10px 13px; font:inherit; text-align:left; cursor:pointer; }
  .agdm-head:hover { background:#f1f5f9; }
  .agdm-head b { flex:0 0 auto; font-size:12.5px; font-weight:900; color:#0f172a; }
  .agdm-head span { flex:1 1 auto; min-width:0; font-size:11.5px; color:#94a3b8;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agdm-head i { flex:0 0 auto; font-style:normal; font-size:13px; font-weight:900; color:#94a3b8; }
  .agdm-scroll { overflow-x:auto; }
  .agdm-table { width:100%; border-collapse:collapse; background:#fff; }
  .agdm-table th, .agdm-table td { padding:8px 11px; font-size:12.5px; text-align:left;
    border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agdm-table tr:last-child td { border-bottom:0; }
  .agdm-table th { background:#fbfcfe; font-size:11px; color:#64748b; font-weight:900; }
  .agdm-table th.num, .agdm-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agdm-table td.up { color:#c1122f; font-weight:900; }
  .agdm-table td.down { color:#1d4ed8; font-weight:900; }
  .agdm-table td.zero { color:#dbe1e9; }
  .agdm-table th.tot, .agdm-table td.tot { background:#f8fafc; font-weight:900; }
  .agdm-table th.rest, .agdm-table td.rest { background:#fffdf5; }
  .agdm-note { margin:0; padding:9px 13px 10px; font-size:11px; color:#7c5310;
    background:#fffdf5; border-top:1px solid #f2e6c8; line-height:1.6; }

  /* 결재자 표 — CP 한도 두 칸 */
  .agleg.withcp th, .agleg.withcp td { padding:9px 10px; }
  .agleg-cp { color:#64748b; font-weight:700; }
  .agleg-cpr { font-size:12px !important; color:#475569; }
  .agleg-cpr i { font-style:normal; color:#cbd5e1; }
  .agleg-cpr b { font-weight:900; color:#0f172a; }
  .agleg-cpr.bad b { color:#c1122f; }
  .agleg-cpr em { display:block; margin-top:2px; font-style:normal; font-size:10.5px;
    font-weight:900; color:#c1122f; }
  .agleg-ground { margin:5px 0 0 12px; padding-left:10px; border-left:2px solid #dcdffb; }
  .agleg-ground p { margin:0; font-size:12.5px; color:#334155; line-height:1.7; }
  .agleg-ground p b { font-weight:900; color:#4338ca; margin-right:5px; }

  /* ===== [2026.08.31] 5안 — 같은 Depth 의 다섯 섹션 ===== */
  .agm-secs { display:flex; flex-direction:column; gap:9px; }
  .agm-sec { border:1px solid var(--agm-line); border-radius:13px; background:#fff; overflow:hidden; }
  .agm-sec.open { border-color:#c7d2fe; }
  .agm-sec-head { display:flex; align-items:center; gap:8px; }
  .agm-sec-btn { flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:11px;
    border:0; background:transparent; padding:14px 16px; cursor:pointer; text-align:left; }
  .agm-sec-btn:hover { background:#f8fafc; }
  .agm-sec.open .agm-sec-btn { background:#f5f6ff; }
  .agm-sec-ic { flex:0 0 auto; font-size:17px; }
  .agm-sec-btn b { flex:0 0 auto; font-size:14.5px; font-weight:900; color:#0f172a; white-space:nowrap; }
  .agm-sec-n { flex:0 0 auto; font-style:normal; font-size:11px; font-weight:900;
    background:#ea002c; color:#fff; border-radius:999px; padding:2px 7px; }
  .agm-sec-n.mute { background:#cbd5e1; color:#475569; }
  .agm-sec-sub { flex:1 1 auto; min-width:0; font-size:12.5px; color:#94a3b8;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agm-sec-caret { flex:0 0 auto; margin-left:auto; border:0; background:transparent;
    color:#94a3b8; font:inherit; font-size:15px; font-weight:900; line-height:1;
    padding:0 16px 0 10px; height:52px; cursor:pointer; }
  .agm-sec-caret:hover { color:#0f172a; }
  .agm-sec-acts { flex:0 0 auto; display:flex; align-items:center; gap:7px; padding-right:0; }
  .agm-sec-body { border-top:1px solid #eef2f7; }
  /* 목록형 섹션은 여백 없이, 글 섹션은 여백을 줍니다 */
  .agm-sec.sec-todo .agm-sec-body { padding:0; }
  .agm-sec.sec-chat .agm-sec-body,
  .agm-sec.sec-budget .agm-sec-body { padding:13px 15px; }

  /* 이력은 상위 화면에 두지 않고, 하단 링크로 찾아 들어갑니다 */
  .agm-histlink { display:flex; align-items:center; gap:8px; margin-top:12px;
    padding:9px 4px; font-size:12.5px; color:#94a3b8; }
  .agm-histlink > span { font-weight:800; letter-spacing:.04em; }
  .agm-histlink i { font-style:normal; color:#cbd5e1; }
  .agm-histlink button { border:0; background:transparent; color:#4338ca;
    font-size:12.5px; font-weight:800; cursor:pointer; text-decoration:underline;
    text-underline-offset:2px; padding:2px 0; }
  .agm-histlink button:hover { color:#312e81; }

  /* 이력 팝업 */
  .agv-pop.wide { width:min(900px,100%); }
  .agv-pop-body.scroll { max-height:70vh; overflow-y:auto; }
  .agh-tabs { display:inline-flex; gap:3px; background:#eef2f7; border-radius:10px; padding:3px; }
  .agh-tab { border:0; background:transparent; border-radius:8px; padding:8px 16px;
    font-size:13.5px; font-weight:800; color:#64748b; cursor:pointer; white-space:nowrap; }
  .agh-tab:hover { color:#0f172a; }
  .agh-tab.on { background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .agm-sec.sec-chat .agpane-foot { border:0; background:transparent; padding:10px 0 0; }

/* ===== [#2] 5안 탭 (해야 할 일 / 결재 이력 / 변경 이력) ===== */
  .agm-box-head.as-tabs { display:flex; align-items:center; gap:10px; padding:8px 10px 8px 8px; }
  .agm-tabs { display:inline-flex; gap:3px; background:#eef2f7; border-radius:10px; padding:3px; }
  .agm-tab { border:0; background:transparent; border-radius:8px; padding:8px 14px;
    font-size:13.5px; font-weight:800; color:#64748b; cursor:pointer; white-space:nowrap; }
  .agm-tab:hover { color:#0f172a; }
  .agm-tab.on { background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .agm-tab em { font-style:normal; margin-left:6px; font-size:11px; font-weight:900;
    background:#ea002c; color:#fff; border-radius:999px; padding:2px 6px; }
  .agm-tab em.mute { background:#cbd5e1; color:#475569; }
  .agm-box-sub { flex:1 1 auto; min-width:0; font-size:12.5px; color:#64748b;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agm-box-head .agm-box-caret { flex:0 0 auto; border:1px solid #e5e7eb; background:#fff; color:#64748b;
    border-radius:8px; width:30px; height:30px; font-weight:900; cursor:pointer; }
  .agm-body { }
  .agm-histwrap { padding:12px 14px; }
  .agm-histwrap .agent-section { margin:0; }
  .agm-list.plain { padding:12px 14px; gap:8px; }

  /* ===== [#3][#4] 계정별 변경 전 / 변경 후 ===== */
  .agm-legs { padding:0 12px 12px; }
  .agleg { width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:10px;
    overflow:hidden; background:#fff; }
  .agleg th, .agleg td { padding:9px 12px; font-size:13px; text-align:left; border-bottom:1px solid #eef2f7; white-space:nowrap; }
  .agleg th { background:#f8fafc; font-size:11.5px; color:#64748b; font-weight:900; }
  .agleg th.num, .agleg td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .agleg td.to { font-weight:900; color:#0f172a; }
  .agleg td.up { color:#c1122f; font-weight:900; }
  .agleg td.down { color:#1d4ed8; font-weight:900; }
  .agleg-ar { color:#cbd5e1; font-weight:900; text-align:center !important; width:26px; }
  .agleg tfoot td { background:#f8fafc; font-weight:900; color:#0f172a; border-bottom:0; }
  .agleg tfoot tr.zero td { background:#fffbeb; color:#a45b06; }
  .agleg.compact th, .agleg.compact td { padding:7px 10px; font-size:12.5px; }
  .agleg-zero { margin-top:8px; padding:10px 12px; border:1px solid #fde68a; border-radius:10px;
    background:#fffbeb; }
  .agleg-zero b { display:block; font-size:13px; font-weight:900; color:#a45b06; }
  .agleg-zero span { display:block; margin-top:3px; font-size:12px; color:#8a6a1f; line-height:1.6; }

  /* ===== [#5] 직책자용 축약 상세 ===== */
  .agexec-body { padding-top:12px; }
  .agexec-why { margin-top:12px; }
  .agexec-why b { display:block; font-size:12.5px; font-weight:900; color:#4338ca; margin-bottom:5px; }
  .agexec-why p { margin:0; font-size:13.5px; color:#334155; line-height:1.75; }
  .agexec-impact, .agexec-note { display:flex; gap:9px; margin-top:10px; padding:10px 12px;
    border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb; }
  .agexec-impact b, .agexec-note b { flex:0 0 auto; font-size:12px; font-weight:900; color:#0d6f9e; }
  .agexec-note b { color:#a45b06; }
  .agexec-impact span, .agexec-note span { font-size:12.5px; color:#475569; line-height:1.65; }
  .agexec-hint { margin:10px 0 0; font-size:11.5px; color:#94a3b8; }

  /* ===== 결재 이력 ===== */
  .agapl { border:1px solid #e5e7eb; border-left:3px solid #cbd5e1; border-radius:11px;
    background:#fff; padding:11px 13px; }
  .agapl.sub { border-left-color:#6366f1; }
  .agapl.ok { border-left-color:#0f9d63; }
  .agapl.bad { border-left-color:#ea002c; }
  .agapl.redraft { border-left-color:#f5a623; }
  .agapl-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .agapl-act { font-style:normal; font-size:11px; font-weight:900; border-radius:999px; padding:3px 9px; }
  .agapl-act.sub { background:#eef2ff; color:#4338ca; }
  .agapl-act.ok { background:#e9f8f1; color:#12724f; }
  .agapl-act.bad { background:#fdecef; color:#c1122f; }
  .agapl-act.redraft { background:#fff5e5; color:#a45b06; }
  .agapl-head b { flex:1 1 auto; min-width:0; font-size:13.5px; font-weight:800; color:#0f172a;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agapl-net { flex:0 0 auto; font-style:normal; font-size:13.5px; font-weight:900; font-variant-numeric:tabular-nums; }
  .agapl-net.up { color:#c1122f; }
  .agapl-net.down { color:#1d4ed8; }
  .agapl-meta { margin-top:5px; font-size:11.5px; color:#94a3b8; line-height:1.6; }
  .agapl-legs { display:flex; gap:8px; flex-wrap:wrap; margin-top:7px; }
  .agapl-legs span { font-size:11.5px; color:#475569; background:#f1f5f9; border-radius:6px; padding:4px 9px;
    font-variant-numeric:tabular-nums; }
  .agapl-legs b { color:#0f172a; font-weight:900; }

  .agm-delta.zero { color:#a45b06; }
  .agm-yn .agm-manual { flex:0 0 auto; width:auto; height:38px; padding:0 13px;
    border:1px solid #f5a623; border-radius:10px; background:#fff; color:#a45b06;
    font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .agm-yn .agm-manual:hover { background:#fff5e5; }
  .agex-opts .agm-yn .agm-manual { height:28px; padding:0 9px; font-size:11.5px; }
  /* 이관 건 — 계정별 증감을 나란히 */
  .agm-delta.multi { display:inline-flex; align-items:center; gap:10px; font-size:13.5px; }
  .agmd-leg { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
  .agmd-leg i { font-style:normal; font-size:11px; font-weight:800; border-radius:5px; padding:2px 6px; }
  .agmd-leg:first-child { color:#1d4ed8; }
  .agmd-leg:last-child { color:#c1122f; }
  /* 택1 안내 */
  .agm-tag.pick1 { border-color:#c7d2fe; background:#eef2ff; color:#3730a3; }
  /* 배타 그룹 — 문제 한 줄 + 1안/2안 */
  .agex-group { border:1px solid #fde68a; background:#fffdf5; border-radius:12px;
    margin:0 0 2px; padding:11px 13px 9px; }
  .agex-group.alert { border-color:#fca5a5; background:#fef6f6; }
  .agex-glead { display:flex; align-items:flex-start; gap:4px; padding:2px 0 0; }
  .agex-gopen { flex:1 1 auto; min-width:0; display:flex; align-items:flex-start; gap:11px;
    border:0; background:transparent; padding:0; cursor:pointer; text-align:left; font:inherit; }
  .agex-gopen:hover .agex-gtitle b { color:#4338ca; }
  .agex-gopen .agm-caret { align-self:center; }
  .agex-glead .agm-check { flex:0 0 auto; align-self:center; }
  .agex-group:not(.open) .agex-glead { padding-bottom:1px; }
  .agex-gtitle { flex:1 1 auto; min-width:0; }
  .agex-gtitle b { display:block; font-size:15px; font-weight:800; color:#0f172a; }
  .agex-gtitle span { display:block; margin-top:3px; font-size:11.5px; color:var(--agc-mute); }
  .agex-gwhy { margin:9px 0 0; font-size:12px; color:#7c5310; line-height:1.6; }
  .agex-src { margin-top:9px; border:1px solid #e5e7eb; border-radius:10px; background:#fff;
    padding:9px 11px; display:flex; flex-direction:column; gap:8px; }
  .agex-src-row { display:flex; align-items:flex-start; gap:9px; }
  .agex-src-k { flex:0 0 auto; font-size:10.5px; font-weight:900; color:#3730a3;
    background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:3px 8px; white-space:nowrap; }
  .agex-src-k.alt { color:#a45b06; background:#fff7e6; border-color:#fde68a; }
  .agex-src-v { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .agex-src-v b { font-size:12.5px; font-weight:800; color:#0f172a; }
  .agex-src-if { font-size:11.5px; color:#334155; }
  .agex-src-if i { font-style:normal; font-weight:800; color:#1d4ed8;
    font-variant-numeric:tabular-nums; }
  .agex-src-fact { font-size:11.5px; color:var(--agc-mute); line-height:1.6; }
  .agex-src-judge { font-size:11px; color:#94a3b8; }
  .agex-src-alt { font-size:11.5px; color:#7c5310; line-height:1.65; }
  .agex-warn { margin-top:8px; font-size:12px; font-weight:800; color:#a45b06;
    background:#fff7e6; border:1px solid #fde68a; border-radius:8px; padding:7px 10px; }
  .agex-alert { margin-top:8px; font-size:12.5px; font-weight:800; color:#b91c1c;
    background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:8px 11px; }
  .agex-opts { margin-top:8px; display:flex; flex-direction:column; gap:5px; }
  .agex-opts .agm-row { border:1px solid var(--agc-line); border-radius:10px; background:#fff; }
  .agex-opts .agm-line { gap:7px; padding:2px 9px 2px 3px; }
  .agex-opts .agm-open { gap:8px; padding:7px 6px 7px 8px; }
  .agex-opts .agm-open b { font-size:13px; font-weight:800; }
  .agex-opts .agm-delta { font-size:13px; }
  .agex-opts .agm-delta.multi { font-size:12px; gap:8px; }
  .agex-opts .agm-yn button { height:28px; min-width:38px; font-size:12.5px; }
  .agex-opts .agm-check { padding:0 2px; }
  .agex-opts .agm-tag { font-size:10.5px; padding:2px 6px; }
  .agm-opt { flex:0 0 auto; font-size:11px; font-weight:900; color:#3730a3;
    background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:2px 7px; white-space:nowrap; }
  .agm-opthint { padding:0 10px 7px 40px; font-size:11px; color:var(--agc-mute); line-height:1.55; }
  .agm-tag { flex:0 0 auto; font-style:normal; font-size:10.5px; font-weight:900; border-radius:6px;
    padding:3px 8px; background:#fffbeb; color:#a45b06; border:1px solid #fde68a; white-space:nowrap; }
  .agm-tag.urgent { background:#fdecef; color:#c1122f; border-color:#f6c3ce; }

  /* ===== 해야 할 일 박스 접기 ===== */
  .agm-box-head { width:100%; border:0; text-align:left; cursor:pointer; }
  .agm-box-head:hover { background:#f5f7fb; }
  .agm-box-caret { margin-left:auto; font-style:normal; color:#94a3b8; font-weight:900; }

  /* ===== 상태 배지 · 반려 · 기안의견 ===== */
  .agm-yn.wide button { width:auto; padding:0 14px; font-size:13px; }
  .agm-done.wait { background:#f1f5f9; color:#64748b; }
  .agm-done.sub { background:#eef2ff; color:#4338ca; }
  .agm-done.returned { background:#fff5e5; color:#a45b06; }
  .agm-row.submitted { background:#fbfcff; }
  .agm-row.returned { background:#fffdf5; }
  .agm-row.confirmed { background:#f8fdfa; }
  .agm-return { margin:0 12px 10px 12px; padding:9px 12px; border-radius:9px; background:#fff5e5;
    border:1px solid #fde68a; font-size:12.5px; font-weight:700; color:#a45b06; line-height:1.6; }
  .agm-return span { display:block; margin-top:3px; font-size:11px; font-weight:600; color:#c08a3a; }
  .agm-draftnote { margin:0 12px 10px 12px; padding:9px 12px; border-radius:9px; background:#f5f6ff;
    border:1px solid #dcdffb; font-size:12.5px; color:#4338ca; line-height:1.6; }
  .agm-returnbox { display:flex; align-items:center; gap:8px; margin:0 12px 10px 12px; padding:10px 12px;
    border:1px solid #fca5a5; border-radius:10px; background:#fef2f2; flex-wrap:wrap; }
  .agm-returnbox b { flex:0 0 auto; font-size:12.5px; font-weight:900; color:#b91c1c; }
  .agm-returnbox input { flex:1 1 auto; min-width:200px; height:36px; border:1px solid #fca5a5;
    border-radius:9px; padding:0 11px; font:inherit; font-size:13px; background:#fff; }
  .agm-returnbox input:focus { outline:none; border-color:#ea002c; }
  .agm-returnbox button { flex:0 0 auto; border:1px solid #ea002c; background:#ea002c; color:#fff;
    border-radius:9px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer; }

  /* 직책자 화면 톤 */


  @media (max-width:1100px) {
  }

  @media (max-width:1100px) {
    .agent-split.n2, .agent-split.n3 { grid-template-columns:1fr; }
    .agent-split .agent-pane.normal { height:auto; }
    .agent-split .agent-pane.normal .agpane-body { max-height:480px; }
  }

  @media (max-width:1200px) {
    .agent-acct-rail { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .agent-console-grid { grid-template-columns:1fr; }
  }
  `;
  document.head.appendChild(style);
})();

/* ==========================================================================
   13. 해시 갱신 합치기 — 원가조정 딥링크 무한 루프 방지
   증상: #/budget-adjust  ⇄  #/budget-adjust/outsource?pj=budgetMock 가 계속 깜빡임.
   원인: openCostArea() 한 번에 해시가 두 번 갱신됩니다.
         ① openBudgetProjectScreen → setScreen → updateHashForScreen  (계정 미선택 → #/budget-adjust?pj=…)
         ② openBudgetAccountEditor → updateHashForScreen              (계정 선택   → #/budget-adjust/outsource?pj=…)
         두 번 다 동기로 쓰이므로 hashchange 가 2번 큐에 쌓이는데, app.js 의 _suppressNextHash 는
         불리언이라 한 번만 막습니다. 두 번째 이벤트가 라우터를 다시 태워 ①②가 반복됩니다.
   조치: 같은 작업 안에서 들어온 갱신 요청을 하나로 합쳐 마지막 값만 한 번 씁니다.
         (공유 파일을 고치지 않고, 이 파일에서 updateHashForScreen 만 감쌉니다)
   ========================================================================== */
if (typeof updateHashForScreen === 'function') {
  var updateHashForScreenBeforeAgentFinal = updateHashForScreen;
  var agentHashPendingFinal = null;
  var agentHashTimerFinal = 0;
  updateHashForScreen = function (id) {
    agentHashPendingFinal = id;
    if (agentHashTimerFinal) return;
    agentHashTimerFinal = setTimeout(function () {
      agentHashTimerFinal = 0;
      var last = agentHashPendingFinal;
      agentHashPendingFinal = null;
      if (last != null) updateHashForScreenBeforeAgentFinal(last);
    }, 0);
  };
}



/* [2026.09.04] 인건비 계획 = 등록 내역 합계 ───────────────────────────────
   지금까지 인건비 계정 계획은 월별 예산값에서 내려오고(top-down),
   화면의 인력·이관·OT 표는 등록 행에서 올라와(bottom-up) 서로 달랐습니다.
   Agent 화면에서는 등록 내역을 기준으로 삼아 두 값을 일치시킵니다.
     실투입인건비 = 승인 인력의 월별 MM × 단가   (0MM 인력 제외)
     이관인건비   = 이관 등록 내역
     OT비        = 등록 내역 (없으면 0원)
   초안(8/27 이전) 화면은 기존 계산을 그대로 씁니다. */
if (typeof getMonthlyBudgetRows === 'function') {
  var getMonthlyBudgetRowsBeforeLaborSumFinal = getMonthlyBudgetRows;
  getMonthlyBudgetRows = function (data, account) {
    const prev = getMonthlyBudgetRowsBeforeLaborSumFinal(data, account);
    if (account !== '인건비' || agentViewFinal === 'draft') return prev;
    const months = ((data && data.months) || []).map(mo => mo.m);
    if (!months.length) return prev;

    const people = agentLaborBaseRowsFinal();
    const direct = months.map(m => people.reduce((t, x) =>
      t + Math.round(((x.monthly && x.monthly[m]) || 0) * (x.unitPrice || 0)), 0));

    const trRows = (typeof getLaborTransferRowsFinal === 'function' ? getLaborTransferRowsFinal() : []) || [];
    const transfer = months.map(m => trRows
      .filter(r => String(r.expectedMonth || '').slice(0, 7) === m)
      .reduce((t, r) => t + (r.amount || 0), 0));

    const otRows = (typeof getLaborOtRowsFinal === 'function' ? getLaborOtRowsFinal() : []) || [];
    const ot = months.map(m => otRows
      .filter(r => String(r.month || r.expectedMonth || '').slice(0, 7) === m)
      .reduce((t, r) => t + (r.amount || 0), 0));

    const sum = a => a.reduce((t, v) => t + v, 0);
    const keep = (name, fallback) => (prev.find(r => r.name === name) || fallback || {});
    const mk = (name, arr) => {
      const plan = sum(arr);
      const actual = keep(name).actual || 0;
      return { name, plan, actual, remain: Math.max(plan - actual, 0), months: arr };
    };
    return [mk('실투입인건비', direct), mk('이관인건비', transfer), mk('OT비', ot)];
  };
  window.getMonthlyBudgetRows = getMonthlyBudgetRows;
}
