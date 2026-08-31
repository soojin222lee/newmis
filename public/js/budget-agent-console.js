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
    legs: [{ acct: '인건비', delta: 66250000 }],
    why: 'SCM에서 투입계획이 확정(승인)된 인력 2명 · 10.5MM이 I/F로 수신되었습니다. 인건비 예산에 등록하지 않으면 실제 투입 시점에 집행할 예산이 없습니다.',
    evidence: [
      '김도윤 P4 · 5.5MM · 2026-09 ~ 2027-01 · 단가 7,500,000원 → 41,250,000원',
      '박서연 P3 · 5.0MM · 2026-09 ~ 2027-01 · 단가 5,000,000원 → 25,000,000원',
      'SCM 확정 상태 · 승인일 2026-08-26 · I/F 수신 2026-08-27 09:05',
    ],
    persons: [
      { name: '김도윤', grade: 'P4', mm: 5.5, period: '2026-09 ~ 2027-01', unit: 7500000, amount: 41250000 },
      { name: '박서연', grade: 'P3', mm: 5.0, period: '2026-09 ~ 2027-01', unit: 5000000, amount: 25000000 },
    ],
    monthly: [
      { m: '2026-09', delta: 13250000 }, { m: '2026-10', delta: 13250000 },
      { m: '2026-11', delta: 13250000 }, { m: '2026-12', delta: 13250000 },
      { m: '2027-01', delta: 13250000 },
    ],
    impact: '인건비 CP한도(770,000,000원) 이내이며, 전 계정 합계도 CP총액을 넘지 않습니다.',
  },
  {
    id: 'ap-02', acct: '인건비', status: 'pending', confidence: 0.87,
    detectedAt: '2026-08-27 09:12', trigger: 'SCM 투입계획 변경',
    title: '설계 인력 2명이 예정보다 1개월 조기 철수합니다',
    legs: [{ acct: '인건비', delta: -12000000 }],
    why: 'SCM에서 이서준 P3, 정하윤 P2의 투입 종료가 10월 → 9월로 변경 수신되었습니다. 10월 인건비 계획 12,000,000원이 집행되지 않습니다.',
    evidence: [
      '이서준 P3 · 투입종료 2026-10-31 → 2026-09-30 (1.0MM 감소)',
      '정하윤 P2 · 투입종료 2026-10-31 → 2026-09-30 (0.8MM 감소)',
      '10월 인건비 계획 18,236,842원 중 해당 인력분 12,000,000원',
    ],
    monthly: [{ m: '2026-10', delta: -12000000 }],
    impact: '감액분 12,000,000원은 CP총액 여유로 환원됩니다. 잔여 인력의 투입계획에는 영향이 없습니다.',
  },
  {
    id: 'ap-03', acct: '외주비', status: 'pending', confidence: 0.94,
    detectedAt: '2026-08-27 09:12', trigger: '구매견적 수신 (PO 발행 전)',
    title: '현재 예산으로는 4분기 확정 견적대로 구매할 수 없습니다',
    legs: [{ acct: '외주비', delta: 4500000 }],
    why: '확정된 견적 24,500,000원을 지금 예산으로는 계약할 수 없습니다. 아크로디자인랩 4분기 계획 라인 12,000,000원에 업체 미계획 잔액 8,000,000원을 합쳐도 20,000,000원이라 4,500,000원이 모자랍니다. 예산을 먼저 올려야 그 견적대로 구매를 진행할 수 있습니다.',
    evidence: [
      '구매시스템 견적확정 I/F 수신 · 2026-08-27 09:05 · 아크로디자인랩 24,500,000원 (2026-10-01 ~ 12-31)',
      '해당 외주구매 계획 라인 12,000,000원 + 업체 미계획 잔액 8,000,000원 = 20,000,000원',
      '부족액 4,500,000원 — 예산을 올리기 전에는 구매를 진행할 수 없습니다',
    ],
    basis: {
      main: '견적확정 I/F 수신 (실시간)',
      alt: '견적이 오기 전이라도 3분기와 동일 규모 구매를 전제하면 같은 결론이 나옵니다 — 3분기 PO 실적 24,000,000원 기준으로 4분기에도 약 4,000,000원 부족이 예상됩니다. Agent는 견적이 확정되면 실제 값으로 다시 계산합니다.',
    },
    monthly: [{ m: '2026-10', delta: 1500000 }, { m: '2026-11', delta: 1500000 }, { m: '2026-12', delta: 1500000 }],
    impact: '외주비 CP한도(1,195,000,000원) 이내입니다. 승인하시면 확정된 견적대로 구매를 진행할 수 있습니다.',
  },
  {
    // [2026.08.31] 실적은 릴리즈된 예산 한도 안에서만 발생합니다(집행 시점에 가용예산 체크).
    //   → Agent가 감지하는 것은 "이미 초과한 실적"이 아니라 "집행 전에 확보해야 할 부족액"입니다.
    id: 'ap-04', acct: '경비', status: 'pending', confidence: 0.98, urgent: true,
    detectedAt: '2026-08-31 09:10', trigger: 'ERP 가용예산 체크 (집행 전)',
    title: '연말 행사비 집행 예정액이 26년 릴리즈 예산을 624,642원 넘습니다',
    legs: [{ acct: '경비', delta: 624642 }],
    why: '지금 남은 예산으로는 연말 행사비까지 쓸 수 없습니다. 의욕관리비 26년 예산 10,488,000원에서 7~8월에 296,642원을 썼으니 남은 금액은 10,191,358원인데, 9~12월에 쓸 예정이 연말 행사비 4,000,000원을 포함해 10,816,000원입니다. 예산을 먼저 확보해야 12월에 집행할 수 있습니다.',
    evidence: [
      '의욕관리비 26년 릴리즈 예산 10,488,000원 · 7~8월 실적 296,642원 → 잔여 가용 10,191,358원',
      '9~12월 집행 예정 6,816,000원 + 연말 행사비 추가 소요 4,000,000원 = 10,816,000원',
      '부족액 624,642원 — 예산을 확보하기 전에는 12월 집행이 승인되지 않습니다',
    ],
    monthly: [{ m: '2026-12', delta: 624642 }],
    breakdown: {
      title: '9~12월 집행 예정액 산출 근거',
      rows: [
        { label: '9월 · 정기 조직활동비', amount: 1872000, src: '수립 계획 (확정)' },
        { label: '10월 · 정기 조직활동비', amount: 1872000, src: '수립 계획 (확정)' },
        { label: '11월 · 정기 조직활동비', amount: 1872000, src: '수립 계획 (확정)' },
        { label: '12월 · 정기 조직활동비', amount: 1200000, src: '수립 계획 (확정)' },
        { label: '12월 · 연말 행사비', amount: 4000000, src: '조직장 요청 접수 2026-08-29 · 미편성' },
      ],
      total: 10816000,
      availLabel: '26년 릴리즈 예산 10,488,000원 − 7~8월 실적 296,642원',
      avail: 10191358,
      short: 624642,
    },
    impact: '경비 CP한도(92,000,000원) 이내입니다. 확보하지 않으면 12월 행사비 집행이 불가합니다.',
  },
  {
    // [2026.08.31] 계정 간 이관 — 총액 변동 ±0원. 직책자가 "왜?"를 묻게 되는 케이스입니다.
    id: 'ap-05', acct: '재료비', status: 'pending', confidence: 0.83, transfer: true,
    detectedAt: '2026-08-31 09:10', trigger: '집행 추세 분석 (월 마감 실적)',
    title: '재료비 여유분을 외주비로 이관해야 합니다 (총액 변동 없음)',
    legs: [{ acct: '재료비', delta: -20000000 }, { acct: '외주비', delta: 20000000 }],
    why: '재료비는 집행률 21.9%로 잔여 기간 대비 계획이 과다하고, 외주비는 4분기 계약이 몰려 계획(미집행)이 부족해집니다. 총액은 그대로 두고 계정 간에만 옮기면 CP총액을 건드리지 않고 해결됩니다.',
    items: [
      { name: 'DB 서버 2식', kind: 'H/W', amount: 62000000, plan: '2026-09 발주 · 10월 검수 예정' },
      { name: '스토리지 증설', kind: 'H/W', amount: 41000000, plan: '2026-10 발주 · 11월 검수 예정' },
      { name: 'DBMS 라이선스', kind: 'S/W', amount: 28363333, plan: '2026-11 발주 · 12월 검수 예정' },
    ],
    cycle: {
      pick: '분기',
      why: '3건 모두 발주와 검수가 같은 분기 안에서 끝납니다. 월별로 잡으면 발주·검수 시차 때문에 월 편차가 커지고, 반기로 잡으면 4분기 집행이 한 번에 몰려 보입니다. Agent는 과거 12개 프로젝트의 H/W·S/W 검수 리드타임(평균 32일)을 학습해 분기 인식을 제안합니다.',
    },
    evidence: [
      '확정 구매 3건 합계 131,363,333원 = 변경 후 재료비 계획과 일치 (나머지 20,000,000원은 미확정분)',
      '재료비 · 계획 151,363,333원 · 실적 33,100,000원 · 잔여 기간 대비 20,000,000원 과다',
      '외주비 · 4분기 계약 예정 3건 합계가 계획(미집행) 대비 20,000,000원 부족',
      '이관 후에도 재료비 CP한도(155,000,000원) · 외주비 CP한도(1,195,000,000원) 모두 이내',
      '예산은 연단위로 릴리즈되므로 26년 릴리즈분 안에서 계정 간에만 옮깁니다',
    ],
    monthly: [],
    impact: 'CP총액과 전체 수립 예산은 변하지 않습니다(±0원). 계정 간 배분만 조정됩니다.',
  },
];

// Agent가 PM 확인 없이 스스로 반영한 내역 — 총액이 바뀌지 않는 조정만 자율처리합니다.
// (총액이 바뀌는 변경은 반드시 PM 검토 → 기안을 거칩니다)
var AGENT_AUTO_FINAL = [
  { at: '2026-08-25 09:05', acct: '인건비', what: '월별 배분 보정', detail: '8월 실적 확정에 맞춰 9~12월 인건비 계획을 재배분했습니다(총액 650,499,999원 불변).' },
  { at: '2026-08-26 18:40', acct: '외주비', what: '미계획 잔액 균등 배분', detail: '아크로디자인랩 미계획 8,000,000원을 잔여 6개월에 월 1,333,333원씩 배분했습니다.' },
  { at: '2026-08-27 09:12', acct: '재료비', what: '월별 배분 재조정', detail: '8월 실적 확정에 맞춰 9~11월 계획을 재배분했습니다(총액 151,363,333원 불변).' },
  { at: '2026-08-26 18:40', acct: 'A/S Cost', what: '반올림 보정', detail: '상세계정 비율 배분에서 생긴 1원 차이를 마지막 월에 보정했습니다.' },
];

// 계정별 변경내역 이력 — 항목 3) Agent와 PM의 대화가 근거로 함께 남습니다.
var AGENT_LOG_FINAL = [
  {
    at: '2026-08-26 14:22', acct: '외주비', actor: '이봄(PM)', decision: 'approved',
    from: 845250000, to: 865250000,
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
    from: 24997578, to: 28197578,
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
    a: '현재 수립 1,741,029,262원 / CP총액 2,260,918,351원으로 여유 519,889,089원입니다. 대기 중인 제안 3건을 모두 승인해도 483,139,089원이 남아 초과 위험은 없습니다.',
  },
];

/* ==========================================================================
   2. 상태
   ========================================================================== */

// [2026.08.31] 기본 화면은 ⑤ 간소화(검토자 화면). 다른 안은 상단 스위치로 전환합니다.
var agentViewFinal = 'mini';           // 'draft' | 'tabs' | 'console' | 'legacy' | 'split' | 'mini'
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
  p.dialog.push({ who: 'agent', text: '…' , pending: true });
  if (el) el.value = '';
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
  if (agentViewFinal !== 'split') return;
  if (agentPaneStateMapFinal.budget === 'full') return;
  AGENT_PANES_FINAL.forEach(k => { if (agentPaneStateMapFinal[k] === 'full') agentPaneStateMapFinal[k] = 'normal'; });
  agentPaneStateMapFinal.budget = 'full';
}
function agentBudgetFullOpenFinal(acct) {
  agentBudgetPaneFullFinal();
  openBudgetAccountEditor(acct);
}
function agentBudgetFullManualFinal(acct) {
  agentBudgetPaneFullFinal();
  agentToggleManualFinal(acct);
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
function renderAgentViewSwitchFinal() {
  const opt = (k, label) =>
    `<button class="agv-btn ${agentViewFinal === k ? 'on' : ''}" onclick="agentSetViewFinal('${k}')">${label}</button>`;
  return `
    <div class="agent-view-switch">
      ${opt('draft', '초안 (8/27 이전)')}
      ${opt('split', '3분할 화면')}
      ${opt('mini', '간소화 화면')}
      <div class="agv-right">${renderAgentPersonaSwitchFinal()}</div>
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
            ${renderAgentBasisFinal(p)}
            <p>${escHtml(p.why)}</p>
            <ul class="agp-ev">${p.evidence.map(e => `<li>${escHtml(e)}</li>`).join('')}</ul>
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
              <div class="agp-months">${p.monthly.map(m => `<em>${m.m} ${agentDeltaFinal(m.delta)}</em>`).join('')}</div>
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
            <div class="agp-decided">${p.status === 'approved' ? '승인' : '반려'}됨 · ${p.decidedAt || ''} — 결정과 대화가 변경 이력에 기록되었습니다.</div>`
            : `
            <div class="agp-actions">
              <button class="agp-yes" onclick="agentDecideFinal('${p.id}','approved')">✓ 제안대로 검토 완료 — 기안 포함 (Y)</button>
              <button class="agp-no" onclick="agentRejectAskOpenFinal('${p.id}')">✗ 반려 (N)</button>
              <button class="agp-manual2" onclick="agentToggleManualFinal('${p.acct}')">✎ 수동 개입해 직접 수정</button>
            </div>`}
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

// PM이 편성하는 "계정 타일"이 아니라, Agent가 관리 중인 계정의 상태를 보여주는 레일입니다.
function renderAgentAccountRailFinal(viewData, data, roll) {
  const cards = roll.rows.map(r => {
    const unlocked = !!agentManualUnlockFinal[r.acct];
    const pend = agentProposalsFinal('pending').filter(p => p.acct === r.acct);
    const rate = r.plan > 0 ? Math.round((r.done / r.plan) * 1000) / 10 : 0;
    return `
      <div class="agent-acct ${unlocked ? 'unlocked' : ''} ${budgetSetupEditAccount === r.acct ? 'active' : ''}">
        <div class="aga-top">
          <span class="agp-acct sm ${agentAcctColorFinal(r.acct)}">${r.acct}</span>
          ${unlocked
            ? '<em class="aga-lock open">수동 개입 중</em>'
            : '<em class="aga-lock">🤖 Agent 관리</em>'}
        </div>
        <strong class="aga-val">${fmt(r.plan)}<i>원</i></strong>
        <div class="aga-sub">집행률 ${rate}% · 실적(확정) ${fmt(r.done)}원</div>
        ${pend.length ? `<div class="aga-pend">제안 ${pend.length}건 · ${agentDeltaFinal(pend.reduce((s, p) => s + (p.to - p.from), 0))}</div>` : ''}
        <div class="aga-acts">
          <button class="aga-view" onclick="agentBudgetFullOpenFinal('${r.acct}')">내역 보기</button>
          <button class="aga-manual ${unlocked ? 'on' : ''}" onclick="agentBudgetFullManualFinal('${r.acct}')">
            ${unlocked ? '개입 종료' : '수동 개입'}
          </button>
        </div>
      </div>`;
  }).join('');
  // [2026.08.28 위클리 피드백 반영 #4] 계정 전체를 한 번에 보는 박스를 맨 앞에 둡니다.
  const allPend = agentProposalsFinal('pending');
  const allCard = `
    <div class="agent-acct all ${budgetSetupEditAccount === null ? 'active' : ''}">
      <div class="aga-top">
        <span class="agp-acct sm all">전체 계정</span>
        <em class="aga-lock">🤖 Agent 관리 ${roll.rows.length}계정</em>
      </div>
      <strong class="aga-val">${fmt(roll.plan)}<i>원</i></strong>
      <div class="aga-sub">집행률 ${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}% · 실적(확정) ${fmt(roll.done)}원</div>
      ${allPend.length ? `<div class="aga-pend">제안 ${allPend.length}건 · ${agentDeltaFinal(allPend.reduce((t, p) => t + (p.to - p.from), 0))}</div>` : ''}
      <div class="aga-acts">
        <button class="aga-view" onclick="budgetSetupEditAccount=null;renderBudgetPage()">전체 인사이트 보기</button>
      </div>
    </div>`;
  const expanded = budgetSetupEditAccount
    ? `<div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, budgetSetupEditAccount)}</div>`
    : `<div class="setup-expanded-detail">${renderAgentInsightFinal(viewData, data, roll)}</div>`;
  return `
    <div class="agent-section">
      <div class="ag-sec-head">
        <strong>Agent가 관리 중인 계정</strong>
        <span>PM은 예산을 직접 편성하지 않습니다. 내역은 열람 전용이며, 예외 상황에만 [수동 개입]으로 편집할 수 있고 그 사실이 이력에 남습니다.</span>
      </div>
      <div class="agent-acct-rail">${allCard}${cards}</div>
      ${renderCpLimitBarFinal(roll)}
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
  ensureAsCostPlanAmount(data);
  const viewData = applyExecBudgetVersionSnapshotFinal(data, getSelectedExecBudgetVersionFinal(data));
  const roll = budgetRollupFinal(viewData, data);
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
  if (agentViewFinal === 'split') return renderAgentSplitViewFinal(viewData, data, projInfo, roll);
  if (agentViewFinal === 'mini') return renderAgentMiniViewFinal(viewData, data, projInfo, roll);
  return renderAgentTabsViewFinal(viewData, data, projInfo, roll);
};

// 항목 6) 계정 편집기는 기본 열람 전용. 수동 개입을 켜지 않으면 입력이 잠깁니다.
var renderBudgetAccountEditorBeforeAgentFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function (data, account) {
  const html = renderBudgetAccountEditorBeforeAgentFinal(data, account);
  // 초안은 개편 이전 화면 그대로 — Agent 열람전용 처리를 걸지 않습니다.
  if (agentViewFinal === 'draft') return html;
  if (agentManualUnlockFinal[account]) {
    return `
      <div class="agent-manual-note">
        <b>수동 개입 중</b> — ${account} 예산을 PM이 직접 편집하고 있습니다. 편집 내용은 변경 이력에 기록되고, Agent가 다시 검증합니다.
        <button onclick="agentToggleManualFinal('${account}')">개입 종료</button>
      </div>
      ${html}`;
  }
  return `
    <div class="agent-readonly">
      <div class="agr-note">
        <span aria-hidden="true">🤖</span>
        <div>
          <b>${account}는 예산관리전문Agent가 관리합니다</b>
          <span>PM은 값을 직접 고치지 않습니다. 변경이 필요하면 Agent가 감지해 제안하고, 승인/반려만 선택하세요.</span>
        </div>
        <button class="agr-manual" onclick="agentToggleManualFinal('${account}')">수동 개입</button>
      </div>
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
       좌(절반): 예산 현황 보기 / 우상: 해야 할 일 / 우하: Agent에게 물어보기
   ========================================================================== */

// [2026.08.28 위클리 피드백 반영] 세 화면은 각각 3단계로 접고 폅니다.
//   collapsed(제목줄만) → normal(분할 안에서 보임) → full(전체 폭) → 다시 collapsed
// 배치는 normal 인 화면 수로 정해집니다.
//   3개 → 좌(예산 현황) / 우(할일·물어보기)   2개 → 좌 / 우 2분할
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
function agentNormalPanesFinal() {
  return AGENT_PANES_FINAL.filter(k => agentPaneStateFinal(k) === 'normal');
}
// 그리드 자리 계산 — 열린 개수에 따라 세 가지 배치만 나옵니다.
//   3개: 좌(예산, 2행) / 우상(해야 할 일) / 우하(물어보기)
//   2개: 무조건 좌우 분할. 예산 현황 보기가 포함되면 예산이 항상 좌측입니다.
//   1개 이하: 탭 순서대로 한 줄씩 전체 폭
function agentSplitPlanFinal() {
  const norm = agentNormalPanesFinal();
  const plan = {};
  if (norm.length === 3) {
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
  { who: 'agent', text: '오늘 4개 소스를 점검했습니다. PM 확인이 필요한 변경 4건을 왼쪽에 정리해 두었습니다. 인건비 2건, 외주비 1건, 경비 1건입니다.' },
  { who: 'pm', text: '외주비 건은 왜 지금 올려야 해요?' },
  { who: 'agent', text: '지금 예산으로는 확정된 견적 24,500,000원대로 계약할 수 없습니다. 4,500,000원이 모자라서, 예산을 먼저 올려야 구매가 진행됩니다.' },
];

function agentChatSendFinal() {
  const el = document.getElementById('agent-chat-input');
  const q = el ? el.value.trim() : '';
  if (!q) { showToast('Agent에게 물어볼 내용을 입력하세요.'); return; }
  AGENT_CHAT_FINAL.push({ who: 'pm', text: q });
  const row = { who: 'agent', text: '…', pending: true };
  AGENT_CHAT_FINAL.push(row);
  if (el) el.value = '';
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
  const exec = agentIsExecFinal();
  const pend = agentByStatusFinal('pending');
  const subD = agentDraftsFinal('submitted');
  const retD = agentDraftsFinal('returned');
  const confD = agentDraftsFinal('confirmed');

  // 결재 건수는 계정 수와 무관하게 기안 1건 = 1건으로 셉니다.
  const mineCnt = exec ? subD.length : pend.length + retD.length;
  const net = exec
    ? subD.reduce((t, d) => t + agentDraftNetFinal(d), 0)
    : pend.reduce((t, p) => t + agentNetFinal(p), 0) + retD.reduce((t, d) => t + agentDraftNetFinal(d), 0);
  const selN = agentSelectedFinal(pend.map(x => x.id)).length;

  const list = mineCnt
    ? (exec
        ? subD.map(d => renderAgentDraftRowFinal(d, 'exec')).join('')
        : retD.map(d => renderAgentDraftRowFinal(d, 'pm')).join('') + pend.map(renderAgentMiniRowFinal).join(''))
    : `<div class="ag-empty">${exec
        ? 'PM이 상신하면 여기에서 결재하실 수 있습니다.'
        : 'Agent가 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적을 계속 보고 있습니다.'}</div>`;

  return `
    <div class="agent-pane todo ${agentPaneStateFinal('todo')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'todo')}>
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>${exec ? '결재할 일' : '해야 할 일'}</strong>
          <span>${mineCnt
            ? `${exec ? '기안 ' : ''}${mineCnt}건 · 합계 ${net === 0 ? '±0원' : agentDeltaFinal(net)}`
            : '처리할 항목 없음'}</span>
        </div>
        ${agentPaneToggleBtnFinal('todo')}
      </div>
      ${(!exec && pend.length) ? `
        <div class="agpane-actbar">
          <label class="agm-check all" title="전체 선택">
            <input type="checkbox" ${selN === pend.length ? 'checked' : ''}
              onchange="agentSelAllFinal(${JSON.stringify(pend.map(x => x.id))}, this.checked)">
            <span>전체</span>
          </label>
          <button class="agm-box-draft" onclick="agentMiniBulkFinal()">${
            selN ? `선택 ${selN}건 기안 →` : '모두 제안대로 (Y)'}</button>
        </div>` : ''}
      <div class="agpane-body">
        <div class="agm-list">${list}</div>
      </div>
      ${(subD.length && !exec) || confD.length || (retD.length && exec) ? `
        <div class="agpane-foot done">
          <b>${[
            subD.length && !exec ? `결재 대기 기안 ${subD.length}건` : '',
            confD.length ? `승인 완료 기안 ${confD.length}건` : '',
            retD.length && exec ? `반려 기안 ${retD.length}건` : '',
          ].filter(Boolean).join(' · ')}</b>
          <button onclick="agentHistOpenFinal('approval')">결재 이력 보기 →</button>
        </div>` : ''}
    </div>`;
}

// 우측 하단 — Agent와의 대화창
function renderAgentChatPaneFinal() {
  return `
    <div class="agent-pane chat ${agentPaneStateFinal('chat')}"${agentPaneGridStyleFinal(agentSplitPlanFinal(), 'chat')}>
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>Agent에게 물어보기</strong>
          <span>예산 근거를 바로 물어보세요. 직책자 질의도 같은 창구를 씁니다.</span>
        </div>
        ${agentPaneToggleBtnFinal('chat')}
      </div>
      <div class="agpane-body">
        ${AGENT_CHAT_FINAL.map(d => `
          <div class="agc-msg ${d.who}">
            <span class="agc-who">${d.who === 'pm' ? '이봄(PM)' : 'Agent'}</span>
            <div class="agc-text ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
          </div>`).join('')}
      </div>
      <div class="agpane-foot">
        <input id="agent-chat-input" type="text" placeholder="Agent에게 질문 — 예: 외주비 왜 올려야 해요?"
          onkeydown="if(event.key==='Enter') agentChatSendFinal()">
        <button onclick="agentChatSendFinal()">보내기</button>
      </div>
    </div>`;
}

// ④ 3분할 — 탭 순서는 할일·물어보기·예산, 3분할 배치는 좌 예산 / 우상 할일 / 우하 물어보기
function renderAgentSplitViewFinal(viewData, data, projInfo, roll) {
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell split ${agentIsExecFinal() ? 'as-exec' : ''}">
      ${projInfo}
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
            ${renderAgentStatusStripFinal(roll)}
            ${renderAgentAccountRailFinal(viewData, data, roll)}
          </div>
        </div>
      </div>

      <!-- [2026.08.31] 4안에도 이력 — 5안과 같은 방식으로 필요할 때 찾아 들어가 봅니다. -->
      <div class="agm-histlink">
        <span>이력</span>
        <button onclick="agentHistOpenFinal('approval')">결재 이력${AGENT_APPROVAL_LOG_FINAL.length ? ` ${AGENT_APPROVAL_LOG_FINAL.length}건` : ''}</button>
        <i>·</i>
        <button onclick="agentHistOpenFinal('history')">변경 이력 ${AGENT_LOG_FINAL.length}건</button>
      </div>
    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
    ${renderAgentRejectAskFinal()}
    ${renderAgentCpPopFinal(data, roll)}
    ${renderAgentHistPopFinal()}`;
}


/* ==========================================================================
   11. [2026.08.28 위클리 피드백 반영 #5] 전체 계정 인사이트
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
  const appr = agentProposalsFinal('approved');
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

  const kpi = (label, value, sub, cls) => `
    <div class="agin-kpi ${cls || ''}"><span>${label}</span><strong>${value}</strong><em>${sub}</em></div>`;

  return `
    <div class="agent-insight">
      <div class="agin-head">
        <strong>전체 계정 인사이트</strong>
        <span>기간 경과율 ${Math.round(elapsed * 100)}% (${passed}/${months.length}개월) 기준으로 Agent가 ${roll.rows.length}개 계정을 판단한 결과입니다.</span>
      </div>

      <div class="agin-kpis">
        ${kpi('수립 예산', fmt(roll.plan) + '원', 'CP총액 대비 ' + (roll.cp > 0 ? Math.round((roll.plan / roll.cp) * 100) : 0) + '%', '')}
        ${kpi('실적(확정)', fmt(roll.done) + '원', '집행률 ' + (roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0) + '%', 'ok')}
        ${kpi('계획(미집행)', fmt(roll.plan - roll.done) + '원', '남은 기간에 집행할 금액', 'open')}
        ${kpi('CP총액 여유', fmt(roll.cpRemain) + '원', pend.length ? `대기 ${pend.length}건 반영 시 ${fmt(roll.cpRemain - pend.reduce((t, p) => t + (p.to - p.from), 0))}원` : '추가 편성 가능액', roll.overCp ? 'bad' : '')}
        ${kpi('Agent 처리', AGENT_AUTO_FINAL.length + '건 자율 / ' + pend.length + '건 대기', appr.length ? `검토 완료 ${appr.length}건` : 'PM 검토 대기 중', 'auto')}
      </div>

      <div class="agin-scroll">
      <table class="agin-table">
        <thead>
          <tr><th>계정</th><th class="num">수립</th><th class="num">실적(확정)</th><th class="num">계획(미집행)</th>
            <th>집행률 vs 기간</th><th class="num">대기 제안</th><th>Agent 판단</th></tr>
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
            <td><em class="agin-health ${x.h.key}">${x.h.label}</em><span class="agin-health-desc">${x.h.desc}</span></td>
          </tr>`).join('')}</tbody>
        <tfoot>
          <tr><td>합계</td><td class="num">${fmt(roll.plan)}</td><td class="num done">${fmt(roll.done)}</td>
            <td class="num open">${fmt(roll.plan - roll.done)}</td>
            <td class="agin-bar-cell"><span>${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}%</span></td>
            <td class="num">${pend.length ? agentDeltaFinal(pend.reduce((t, p) => t + (p.to - p.from), 0)) : '–'}</td>
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
function renderAgentMiniRowFinal(p) {
  const open = agentMiniOpenFinal === p.id;
  const delta = agentNetFinal(p);          // 이관 건은 계정 합계(±0)로 표시합니다
  const exec = agentIsExecFinal();
  let right = '';
  if (p.status === 'pending') {
    right = exec
      ? '<span class="agm-done wait">PM 검토 중</span>'
      : `<div class="agm-yn">
           <button class="agm-y" title="검토 완료 — 결재선을 지정해 상신" onclick="agentOpenApprovalPopupFinal(['${p.id}'])">Y</button>
           <button class="agm-n" title="반려 — 확인 후 제안이 사라집니다" onclick="agentRejectAskOpenFinal('${p.id}')">N</button>
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
    <div class="agm-row ${open ? 'open' : ''} ${p.status}">
      <div class="agm-line">
        ${(!agentIsExecFinal() && p.status === 'pending') ? `
          <label class="agm-check" title="선택해서 함께 기안">
            <input type="checkbox" ${agentMiniSelFinal[p.id] ? 'checked' : ''} onchange="agentSelToggleFinal('${p.id}')">
          </label>` : ''}
        <button class="agm-open" onclick="agentMiniToggleFinal('${p.id}')" title="${open ? '접기' : '근거·상세 보기'}">
          <span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
          <b>${escHtml(p.title)}</b>
          <em class="agm-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'}">${delta === 0 ? '±0원' : agentDeltaFinal(delta)}</em>
          ${p.transfer ? '<i class="agm-tag">계정 간 이관</i>' : ''}
          ${p.urgent ? '<i class="agm-tag urgent">실적 초과</i>' : ''}
          <i class="agm-caret">${open ? '∧' : '∨'}</i>
        </button>
        ${right}
      </div>
      ${p.status === 'returned' && p.returnReason ? `
        <div class="agm-return">↩ 직책자 반려 사유 — ${escHtml(p.returnReason)}<span>${p.returnedAt || ''}</span></div>` : ''}
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
      해야 할 일 · 결재 이력 · 변경 이력 · Agent에게 물어보기 · 예산 현황 보기
      (탭이 아니라 각각 자기 버튼을 갖고, 여러 개를 동시에 열 수 있습니다) ── */
var agentMiniSecFinal = { todo: true, chat: false, budget: false };

// 이력은 상위 화면에 두지 않습니다 — 필요할 때 하단 링크로 찾아 들어가 봅니다.
var agentHistPopFinal = '';         // '' | 'approval' | 'history'
function agentHistOpenFinal(k) { agentHistPopFinal = k; renderBudgetPage(); }
function agentHistCloseFinal() { agentHistPopFinal = ''; renderBudgetPage(); }
function renderAgentHistPopFinal() {
  if (!agentHistPopFinal) return '';
  const isApv = agentHistPopFinal === 'approval';
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
          <i class="agm-sec-caret">${open ? '∧' : '∨'}</i>
        </button>
        ${open && sec.actions ? `<div class="agm-sec-acts">${sec.actions}</div>` : ''}
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
      <input id="agent-chat-input" type="text" placeholder="예: 외주비 왜 올려야 해요? 다른 계정에서 당겨올 수 없나요?"
        onkeydown="if(event.key==='Enter') agentChatSendFinal()">
      <button onclick="agentChatSendFinal()">보내기</button>
    </div>`;
}

function renderAgentBudgetBodyFinal(viewData, data, roll) {
  return `
    <div class="agm-accts">
      ${roll.rows.map(r => {
        const rate = r.plan > 0 ? (r.done / r.plan) * 100 : 0;
        return `
          <button class="agm-acct" onclick="openBudgetAccountEditor('${r.acct}')" title="${r.acct} 예산내역 열기">
            <span class="agp-acct sm ${agentAcctColorFinal(r.acct)}">${r.acct}</span>
            <b>${fmt(r.plan)}<i>원</i></b>
            <div class="agm-acct-bar"><u style="width:${Math.min(rate, 100)}%"></u></div>
            <em>집행률 ${Math.round(rate * 10) / 10}% · 미집행 ${fmt(r.remain)}원</em>
          </button>`;
      }).join('')}
    </div>
    ${renderCpLimitBarFinal(roll)}
    <div class="agm-more">
      <button onclick="agentSetViewFinal('split')">자세한 인사이트·이력은 4안 화면에서 →</button>
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
  const confD = agentDraftsFinal('confirmed');

  // 결재 건수는 계정 수와 무관하게 기안 1건 = 1건으로 셉니다.
  const mineCnt = exec ? subD.length : pend.length + retD.length;
  const net = exec
    ? subD.reduce((t, d) => t + agentDraftNetFinal(d), 0)
    : pend.reduce((t, p) => t + agentNetFinal(p), 0) + retD.reduce((t, d) => t + agentDraftNetFinal(d), 0);
  const boxLabel = exec ? '결재할 일' : '해야 할 일';
  const selN = agentSelectedFinal(pend.map(x => x.id)).length;

  const todoBody = mineCnt
    ? (exec
        ? subD.map(d => renderAgentDraftRowFinal(d, 'exec')).join('')
        : retD.map(d => renderAgentDraftRowFinal(d, 'pm')).join('') + pend.map(renderAgentMiniRowFinal).join(''))
    : `<div class="ag-empty">${exec
        ? 'PM이 상신하면 여기에서 결재하실 수 있습니다.'
        : 'Agent가 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적을 계속 보고 있습니다.'}</div>`;

  const todoActions = (!exec && pend.length) ? `
    <label class="agm-check all" title="전체 선택">
      <input type="checkbox" ${selN === pend.length ? 'checked' : ''}
        onchange="agentSelAllFinal(${JSON.stringify(pend.map(x => x.id))}, this.checked)">
      <span>전체</span>
    </label>
    <button class="agm-box-draft" onclick="agentMiniBulkFinal()">${
      selN ? `선택 ${selN}건 기안 →` : '모두 제안대로 (Y)'}</button>` : '';

  const SECTIONS = [
    {
      key: 'todo', ic: exec ? '🧑‍💼' : '📌', title: boxLabel,
      badge: mineCnt || '', actions: todoActions,
      sub: mineCnt ? `${exec ? '기안 ' : ''}${mineCnt}건 · 합계 ${net === 0 ? '±0원' : agentDeltaFinal(net)}` : '처리할 항목 없음',
      body: `<div class="agm-list">${todoBody}</div>`,
    },
    {
      key: 'chat', ic: '💬', title: 'Agent에게 물어보기',
      sub: '왜 이렇게 판단했는지, 다른 방법은 없는지 물어보세요',
      body: renderAgentChatBodyFinal(),
    },
    {
      key: 'budget', ic: '📊', title: '예산 현황 보기',
      sub: `수립 ${fmt(roll.plan)}원 · 집행률 ${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}% · CP총액 여유 ${fmt(roll.cpRemain)}원`,
      body: renderAgentBudgetBodyFinal(viewData, data, roll),
    },
  ];

  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell mini ${exec ? 'as-exec' : ''}">
      ${projInfo}

      <div class="agm-secs">
        ${SECTIONS.map(renderAgentMiniSectionFinal).join('')}
      </div>

      <div class="agm-histlink">
        <span>이력</span>
        <button onclick="agentHistOpenFinal('approval')">결재 이력${AGENT_APPROVAL_LOG_FINAL.length ? ` ${AGENT_APPROVAL_LOG_FINAL.length}건` : ''}</button>
        <i>·</i>
        <button onclick="agentHistOpenFinal('history')">변경 이력 ${AGENT_LOG_FINAL.length}건</button>
      </div>

      ${(subD.length && !exec) || (confD.length) || (retD.length && exec) ? `
        <div class="agm-donebar">
          <b>${[
            subD.length && !exec ? `결재 대기 기안 ${subD.length}건` : '',
            confD.length ? `승인 완료 기안 ${confD.length}건` : '',
            retD.length && exec ? `반려 기안 ${retD.length}건` : '',
          ].filter(Boolean).join(' · ')}</b>
          <button onclick="agentHistOpenFinal('approval')">결재 이력 보기 →</button>
        </div>` : ''}

      ${budgetSetupEditAccount ? `
        <div class="agm-acct-detail">
          <div class="agm-acct-detail-head">
            <b>${budgetSetupEditAccount} 내역</b>
            <span>${exec ? '직책자' : '검토자'}가 직접 열어 본 상세입니다.</span>
            <button onclick="closeBudgetAccountEditor()">닫기</button>
          </div>
          <div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, budgetSetupEditAccount)}</div>
        </div>` : ''}
    </div>
    ${agentApprovalPopupFinal.length ? renderAgentApprovalPopupFinal() : ''}
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
function agentByStatusFinal(st) {
  return agentByAcctFinal(AGENT_PROPOSALS_FINAL.filter(p => p.status === st));
}

/* ── [#2][#3] PM: Y → 결재선 지정 팝업 → 상신 ── */
function agentOpenApprovalPopupFinal(ids) {
  agentApprovalPopupFinal = Array.isArray(ids) ? ids.slice() : [ids];
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

/* ── 결재선 지정 팝업 ── */
function renderAgentApprovalPopupFinal() {
  const list = agentApprovalPopupFinal.map(agentFindProposalFinal).filter(Boolean);
  if (!list.length) return '';
  const net = list.reduce((t, x) => t + agentNetFinal(x), 0);
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
            <thead><tr><th>계정</th><th class="num">변경 전</th><th class="num">변경 후</th></tr></thead>
            <tbody>${agentAggregateLegsFinal(list).map(e => `
              <tr>
                <td><span class="agp-acct sm ${agentAcctColorFinal(e.acct)}">${e.acct}</span></td>
                <td class="num">${fmt(e.from)}</td>
                <td class="num to">${fmt(e.to)}</td>
              </tr>`).join('')}</tbody>
          </table>
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
// 하드코딩이 없으므로 상세 내역(계정별 예산내역/인사이트)과 숫자가 항상 일치합니다.
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
  renderBudgetPage();
}
function agentSelAllFinal(ids, on) {
  ids.forEach(id => { agentMiniSelFinal[id] = on; });
  renderBudgetPage();
}
function agentSelectedFinal(ids) {
  return ids.filter(id => agentMiniSelFinal[id]);
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
    if (p.status !== status || !p.draftId) return;
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
      if (!by[l.acct]) by[l.acct] = { acct: l.acct, from: l.from, delta: 0, reasons: [] };
      by[l.acct].delta += l.delta;
      by[l.acct].reasons.push({ id: p.id, title: p.title, delta: l.delta, why: p.why, dialog: p.dialog });
    });
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
  showToast(`기안 ${d.no}을 승인했습니다. ${d.items.length}건이 예산에 반영됩니다.`);
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
  if (!reason) { showToast('반려 사유를 입력해 주세요. PM이 재기안할 때 근거가 됩니다.'); return; }
  d.items.forEach(p => { p.status = 'returned'; p.returnReason = reason; p.returnedAt = '2026-08-31 10:35'; });
  AGENT_LOG_FINAL.unshift({
    at: '2026-08-31 10:35', acct: agentDraftLegsFinal(d).map(e => e.acct).join(', '),
    actor: `${agentMeFinal().name}(${agentMeFinal().role})`, decision: 'rejected',
    reason: `기안 ${d.no} 반려 — ${reason}`,
    dialog: [{ who: 'agent', text: `반려 사유를 기록했습니다. PM이 기안 ${d.no} 전체를 재기안할 수 있습니다: ${reason}` }],
  });
  agentApprovalLogFinal(d.items[0], 'returned', `${agentMeFinal().name}(${agentMeFinal().role})`, `기안 ${d.no} 전체 반려 · ${reason}`);
  agentReturnOpenFinal = '';
  showToast(`기안 ${d.no}을 반려했습니다. PM이 재기안할 수 있습니다.`);
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

/* ── 기안 카드 ── */
function renderAgentDraftRowFinal(d, mode) {
  const legs = agentDraftLegsFinal(d);
  const net = agentDraftNetFinal(d);
  const exec = mode === 'exec';
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

      <table class="agleg agdr-leg">
        <thead><tr><th>계정</th><th class="num">변경 전</th><th></th><th class="num">변경 후</th><th class="num">증감</th></tr></thead>
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
            </tr>
            <tr class="agleg-sub"><td colspan="5">
              ${e.reasons.map(r => `
                <div class="agleg-item">
                  <div class="agleg-why">
                    <span>· ${escHtml(r.title)}</span>
                    <em class="${r.delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(r.delta)}</em>
                  </div>
                  ${open ? `
                    <div class="agleg-ground">
                      <p><b>🤖 Agent 판단 근거</b> ${escHtml(r.why)}</p>
                      ${renderAgentDialogFinal(r.dialog, true)}
                    </div>` : ''}
                </div>`).join('')}
              ${open ? `
                ${d.note ? `<div class="agexec-note"><b>PM 기안 의견</b><span>${escHtml(d.note)}</span></div>` : ''}
                <div class="agp-ask">
                  <input id="agent-ask-${e.reasons[0].id}" type="text" placeholder="Agent에게 물어보세요 — 예: 월별로 어떻게 나눠 쓰나요?"
                    onkeydown="if(event.key==='Enter') agentAskFinal('${e.reasons[0].id}')">
                  <button class="agp-ask-btn" onclick="agentAskFinal('${e.reasons[0].id}')">질문</button>
                </div>`
              : `<div class="agleg-more">∨ 이 계정의 Agent 판단 근거·PM 코멘트 보기</div>`}
            </td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="${net === 0 ? 'zero' : ''}">
          <td>합계 ${legs.length}계정</td><td class="num"></td><td></td><td class="num"></td>
          <td class="num ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${net === 0 ? '±0원' : agentDeltaFinal(net)}</td>
        </tr></tfoot>
      </table>
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
  .agent-view-switch { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:6px 0 10px; }
  .agent-view-switch .agv-tag { font-size:11.5px; font-weight:800; color:#b45309;
    background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:4px 9px; white-space:nowrap; }
  .agv-btn { border:1px solid #e5e7eb; background:#fff; color:#64748b; border-radius:999px;
    padding:6px 14px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
  .agv-btn:hover { border-color:#6366f1; color:#4338ca; }
  .agv-btn.on { background:#0f172a; border-color:#0f172a; color:#fff; }
  /* PERSONA 는 안 선택 버튼과 같은 행 우측 끝 */
  .agv-right { margin-left:auto; display:flex; align-items:center; }
  .agv-right .agent-persona { margin:0; }

  .agv-btn:first-of-type { border-style:dashed; color:#a45b06; }
  .agv-btn:first-of-type.on { background:#a45b06; border-color:#a45b06; color:#fff; border-style:solid; }

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
  .ags-kpis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-top:13px; }
  .ags-kpi { border:1px solid var(--agc-line); border-radius:12px; background:#fff; padding:11px 13px; min-width:0; }
  .ags-kpi-label { display:block; font-size:12px; font-weight:800; color:#94a3b8; white-space:nowrap; }
  .ags-kpi-val { display:block; margin:4px 0 2px; font-size:21px; font-weight:900; color:var(--agc-ink); letter-spacing:-.5px; }
  .ags-kpi-sub { display:block; font-size:11.5px; color:var(--agc-mute); line-height:1.5; }
  .ags-kpi.warn { border-color:#fcd34d; background:#fffbeb; }
  .ags-kpi.warn .ags-kpi-val { color:#b45309; }
  .ags-kpi.auto .ags-kpi-val { color:#4338ca; }
  .ags-kpi.ok .ags-kpi-val { color:#15803d; }
  .ags-kpi.bad { border-color:#fca5a5; background:#fef2f2; }
  .ags-kpi.bad .ags-kpi-val { color:#b91c1c; }

  /* 섹션 */
  .agent-section { margin:0 0 16px; }
  .ag-sec-head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin:0 0 9px; }
  .ag-sec-head strong { font-size:15px; font-weight:900; color:var(--agc-ink); }
  .ag-sec-head span { font-size:12.5px; color:var(--agc-mute); line-height:1.6; }
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
  .agp-actions { display:flex; gap:10px; margin-top:14px; }
  .agp-yes, .agp-no { flex:1 1 0; border-radius:11px; padding:12px 0; font-size:15px; font-weight:900; cursor:pointer; }
  .agp-yes { border:1px solid #0f9d63; background:#0f9d63; color:#fff; }
  .agp-yes:hover { background:#0b7f50; }
  .agp-no { border:1px solid #cbd5e1; background:#fff; color:#475569; }
  .agp-no:hover { border-color:#ea002c; color:#ea002c; }
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
  .agent-acct-rail { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; }
  .agent-acct { border:1px solid var(--agc-line); border-radius:14px; background:#fff; padding:12px 13px; min-width:0; }
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
  .aga-acts button { flex:1 1 0; border-radius:8px; padding:7px 0; font-size:12px; font-weight:800; cursor:pointer; }
  .aga-view { border:1px solid #cbd5e1; background:#fff; color:#475569; }
  .aga-view:hover { border-color:#0f172a; color:#0f172a; }
  .aga-manual { border:1px solid #e5e7eb; background:#f8fafc; color:#94a3b8; }
  .aga-manual:hover { border-color:#f5a623; color:#a45b06; background:#fffdf5; }
  .aga-manual.on { border-color:#f5a623; background:#fff5e5; color:#a45b06; }

  /* 열람 전용 편집기 */
  .agent-readonly { position:relative; }
  .agr-note { display:flex; align-items:center; gap:12px; margin-bottom:12px;
    border:1px solid #c7d2fe; border-radius:13px; background:#f5f6ff; padding:12px 14px; }
  .agr-note > span { font-size:20px; }
  .agr-note b { display:block; font-size:14px; font-weight:900; color:#3730a3; }
  .agr-note div span { display:block; margin-top:3px; font-size:12.5px; color:#4b5563; line-height:1.6; }
  .agr-manual { margin-left:auto; flex:0 0 auto; border:1px solid #f5a623; background:#fff;
    color:#a45b06; border-radius:999px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer; }
  .agr-manual:hover { background:#fff5e5; }
  .agr-veil { position:relative; }
  .agr-veil::after { content:''; position:absolute; inset:0; z-index:5; background:rgba(248,250,252,.35); cursor:not-allowed; }
  .agr-veil input, .agr-veil select, .agr-veil textarea { pointer-events:none !important; background:#f4f6fa !important; color:#94a3b8 !important; }
  .agr-veil button { pointer-events:none !important; opacity:.5; }
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
  .agp-manual2 { flex:0 0 auto; border:1px solid #f5a623; background:#fff; color:#a45b06;
    border-radius:11px; padding:12px 16px; font-size:13.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .agp-manual2:hover { background:#fff5e5; }
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
  /* [2026.08.31] 검토 완료 · 반려 · 수동 개입은 항상 한 줄 수평 배치.
     좌우로 나뉜 좁은 칸(2·3분할)에서만 글자를 줄여 세 개가 한 줄에 들어가게 합니다. */
  .agent-split.n2 .agent-pane.todo .agp-actions,
  .agent-split.n3 .agent-pane.todo .agp-actions { flex-wrap:nowrap; gap:7px; }
  .agent-split.n2 .agent-pane.todo .agp-actions button,
  .agent-split.n3 .agent-pane.todo .agp-actions button {
    flex:1 1 auto; min-width:0; width:auto; padding:10px 8px;
    font-size:12px; white-space:nowrap; }
  .agent-split.n2 .agent-pane.todo .agp-no,
  .agent-split.n2 .agent-pane.todo .agp-manual2,
  .agent-split.n3 .agent-pane.todo .agp-no,
  .agent-split.n3 .agent-pane.todo .agp-manual2 { flex:0 1 auto; }
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

  /* [#5] 전체 계정 인사이트 */
  .agent-insight { border:1px solid var(--agc-line); border-radius:14px; background:#fff; overflow:hidden; }
  .agin-head { padding:13px 16px; border-bottom:1px solid #eef2f7; }
  .agin-head strong { font-size:15px; font-weight:900; color:var(--agc-ink); }
  .agin-head span { display:block; margin-top:3px; font-size:12.5px; color:var(--agc-mute); line-height:1.6; }
  .agin-kpis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:9px; padding:13px 16px; }
  .agin-kpi { border:1px solid var(--agc-line); border-radius:11px; background:#fbfcfe; padding:10px 12px; min-width:0; }
  .agin-kpi span { display:block; font-size:11.5px; font-weight:800; color:#94a3b8; white-space:nowrap; }
  .agin-kpi strong { display:block; margin:4px 0 2px; font-size:17px; font-weight:900; color:var(--agc-ink);
    letter-spacing:-.4px; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agin-kpi em { display:block; font-style:normal; font-size:11px; color:var(--agc-mute); line-height:1.5; }
  .agin-kpi.ok strong { color:#12724f; }
  .agin-kpi.open strong { color:#1d4ed8; }
  .agin-kpi.auto strong { color:#4338ca; }
  .agin-kpi.bad { border-color:#fca5a5; background:#fef2f2; }
  .agin-kpi.bad strong { color:#b91c1c; }

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

  /* 분할 화면 안에서는 폭이 좁으므로 KPI를 여러 줄로 접어 숫자가 잘리지 않게 합니다 */
  .agent-split .ags-kpis { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .agent-split.n3 .ags-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .agent-split .agin-kpis { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .agent-split.n3 .agin-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .agent-pane.full .ags-kpis, .agent-pane.full .agin-kpis,
  .agent-split.n1 .agent-pane.normal .ags-kpis,
  .agent-split.n1 .agent-pane.normal .agin-kpis { grid-template-columns:repeat(5,minmax(0,1fr)); }
  .agent-split .ags-kpi-val { font-size:18px; }
  .agent-split .ags-head { flex-wrap:wrap; }
  .agent-split .ags-recheck { margin-left:auto; }

  @media (max-width:1280px) {
    .agin-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }

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

  .agm-accts { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:9px; margin-bottom:12px; }
  .agm-acct { border:1px solid var(--agm-line); border-radius:11px; background:#fff; padding:11px 12px;
    text-align:left; cursor:pointer; min-width:0; }
  .agm-acct:hover { border-color:#0f172a; }
  .agm-acct b { display:block; margin:8px 0 0; font-size:16px; font-weight:900; color:#0f172a;
    font-variant-numeric:tabular-nums; white-space:nowrap; }
  .agm-acct b i { font-style:normal; font-size:11px; font-weight:700; color:#94a3b8; margin-left:2px; }
  .agm-acct-bar { height:5px; margin:7px 0 6px; border-radius:3px; background:#e9edf4; overflow:hidden; }
  .agm-acct-bar > u { display:block; height:100%; border-radius:3px; background:#0f9d63; }
  .agm-acct em { display:block; font-style:normal; font-size:11px; color:#94a3b8; white-space:nowrap;
    overflow:hidden; text-overflow:ellipsis; }
  .agm-more { margin-top:10px; text-align:right; }
  .agm-more button { border:0; background:transparent; color:#4338ca; font-size:12.5px;
    font-weight:800; cursor:pointer; text-decoration:underline; }

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
  .agv-pop-dim { position:fixed; inset:0; z-index:95; display:flex; align-items:center; justify-content:center;
    background:rgba(15,23,42,.42); padding:20px; }
  .agv-pop { width:min(560px,100%); background:#fff; border:1px solid #e2e8f0; border-radius:16px;
    box-shadow:0 24px 60px -28px rgba(15,23,42,.5); overflow:hidden; }
  .agv-pop-head { display:flex; align-items:flex-start; gap:12px; padding:16px 18px; border-bottom:1px solid #eef2f7; }
  .agv-pop-head strong { display:block; font-size:16px; font-weight:900; color:#0f172a; }
  .agv-pop-head span { display:block; margin-top:3px; font-size:12.5px; color:#64748b; }
  .agv-pop-x { margin-left:auto; flex:0 0 auto; border:0; background:transparent; color:#94a3b8;
    font-size:16px; cursor:pointer; padding:2px 6px; }
  .agv-pop-body { padding:16px 18px; }
  .agv-pop.narrow { width:min(460px,100%); }
  .agv-pop-foot { display:flex; gap:8px; padding:0 18px 16px; }
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
  .agleg-more { margin-top:8px; font-size:11.5px; font-weight:800; color:#4338ca; }
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
  .agm-sec-caret { flex:0 0 auto; font-style:normal; color:#94a3b8; font-weight:900; }
  .agm-sec-acts { flex:0 0 auto; display:flex; align-items:center; gap:7px; padding-right:14px; }
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

  .agm-acct-detail { margin-top:12px; border:1px solid #c7d2fe; border-radius:13px; background:#fff; overflow:hidden; }
  .agm-acct-detail-head { display:flex; align-items:center; gap:10px; padding:12px 16px;
    background:#f5f6ff; border-bottom:1px solid #e5e7eb; }
  .agm-acct-detail-head b { font-size:14.5px; font-weight:900; color:#3730a3; }
  .agm-acct-detail-head span { flex:1 1 auto; font-size:12.5px; color:#94a3b8; }
  .agm-acct-detail-head button { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:999px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; }
  .agm-acct-detail-head button:hover { border-color:#0f172a; color:#0f172a; }
  .agm-acct-detail .setup-expanded-detail { padding:14px 16px; }

  @media (max-width:1100px) {
    .agm-accts { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }

  @media (max-width:1100px) {
    .agent-split.n2, .agent-split.n3 { grid-template-columns:1fr; }
    .agent-split .agent-pane.normal { height:auto; }
    .agent-split .agent-pane.normal .agpane-body { max-height:480px; }
  }

  @media (max-width:1200px) {
    .ags-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .agent-acct-rail { grid-template-columns:repeat(2,minmax(0,1fr)); }
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

