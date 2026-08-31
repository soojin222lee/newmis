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

// Agent가 감지한 예산 변경 제안. status: pending(대기) | approved(검토승인) | rejected(반려)
// [2026.08.27 위클리 피드백 반영 #1] 예산을 초과한 PO는 발생할 수 없습니다.
//   → PO는 잔여예산 한도 내에서만 발행되므로, Agent가 감지하는 것은 "초과한 PO"가 아니라
//     "계획이 부족해서 PO를 발행할 수 없는 상태"입니다. 계획 증액이 계약보다 먼저 와야 합니다.
// [2026.08.27 위클리 피드백 반영 #2] 안내 순서는 인건비 → 외주비 → 재료비 → 경비 → A/S비(CATS 순).
var AGENT_PROPOSALS_FINAL = [
  {
    id: 'ap-01', acct: '인건비', status: 'pending', confidence: 0.96,
    detectedAt: '2026-08-27 09:12', trigger: 'SCM 인력 확정(승인) 수신',
    title: 'SCM에서 확정된 인력 2명을 인건비에 추가 편성해야 합니다',
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
    from: 650499999, to: 716749999,
    monthly: [
      { m: '2026-09', delta: 13250000 }, { m: '2026-10', delta: 13250000 },
      { m: '2026-11', delta: 13250000 }, { m: '2026-12', delta: 13250000 },
      { m: '2027-01', delta: 13250000 },
    ],
    impact: 'CP총액 여유 519,889,089원 → 453,639,089원. 인건비 CP한도(770,000,000원) 이내이며 전 계정 합계도 CP총액을 넘지 않습니다.',
  },
  {
    id: 'ap-02', acct: '인건비', status: 'pending', confidence: 0.87,
    detectedAt: '2026-08-27 09:12', trigger: 'SCM 투입계획 변경',
    title: '설계 인력 2명이 예정보다 1개월 조기 철수합니다',
    why: 'SCM에서 이서준 P3, 정하윤 P2의 투입 종료가 10월 → 9월로 변경 수신되었습니다. 10월 인건비 계획 12,000,000원이 집행되지 않습니다.',
    evidence: [
      '이서준 P3 · 투입종료 2026-10-31 → 2026-09-30 (1.0MM 감소)',
      '정하윤 P2 · 투입종료 2026-10-31 → 2026-09-30 (0.8MM 감소)',
      '10월 인건비 계획 18,236,842원 중 해당 인력분 12,000,000원',
    ],
    from: 650499999, to: 638499999,
    monthly: [{ m: '2026-10', delta: -12000000 }],
    impact: '감액분 12,000,000원은 CP총액 여유로 환원됩니다. 잔여 인력의 투입계획에는 영향이 없습니다.',
  },
  {
    id: 'ap-03', acct: '외주비', status: 'pending', confidence: 0.94,
    detectedAt: '2026-08-27 09:12', trigger: '구매견적 수신 (PO 발행 전)',
    title: '4분기 구매견적이 계획을 넘어 PO를 발행할 수 없습니다',
    why: 'PO는 잔여 예산 한도 내에서만 발행되므로 예산을 초과한 PO는 발생하지 않습니다. 아크로디자인랩 4분기 계획 라인 12,000,000원과 업체 미계획 잔액 8,000,000원을 합쳐도 견적 24,500,000원에 미달해, 계획을 4,500,000원 먼저 올려야 계약이 가능합니다.',
    evidence: [
      '아크로디자인랩 4분기 구매견적 24,500,000원 (2026-10-01 ~ 12-31)',
      '해당 외주구매 계획 라인 12,000,000원 + 업체 미계획 잔액 8,000,000원 = 20,000,000원',
      '부족액 4,500,000원 — 계획 증액 전에는 PO 발행 자체가 막힙니다',
    ],
    from: 865250000, to: 869750000,
    monthly: [{ m: '2026-10', delta: 1500000 }, { m: '2026-11', delta: 1500000 }, { m: '2026-12', delta: 1500000 }],
    impact: 'CP총액 여유 519,889,089원 → 515,389,089원. 외주비 CP한도(1,195,000,000원) 이내입니다. 승인 후 계획이 올라가면 구매시스템에서 PO 발행이 가능해집니다.',
  },
  {
    id: 'ap-04', acct: '경비', status: 'pending', confidence: 0.71,
    detectedAt: '2026-08-27 09:12', trigger: 'ERP 가용예산 변동',
    title: '의욕관리비 공동예산 잔액이 0원이 되었습니다',
    why: '같은 예산통을 쓰는 소계정의 집행이 늘어 의욕관리비 가용잔액이 0원입니다. 27년 계획 1,500,000원을 그대로 두면 저장 시 한도 초과로 막힙니다.',
    evidence: [
      '의욕관리비 · 계획 11,988,000원 · 가용잔액 0원',
      '같은 통의 전산소모품비 실적 22,910원 증가',
      '27년(1월~4월) 계획 1,500,000원이 한도를 넘는 구간',
    ],
    from: 24997578, to: 23497578,
    monthly: [{ m: '2027-01', delta: -1500000 }],
    impact: '경비는 연단위 계획이므로 27년 연도 금액에서 차감됩니다. ERP 가용예산 범위 안으로 들어옵니다.',
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
    reason: 'Agent 제안 승인 — 2분기 PO 정산 차액 반영',
    dialog: [
      { who: 'pm', text: '외주비를 왜 2천만원 올려야 해요?' },
      { who: 'agent', text: '2분기 PO 45000091의 검수 정산액이 견적보다 20,000,000원 많았습니다. 이미 검수가 끝난 금액이라 계획을 올리지 않으면 실적이 계획을 초과합니다.' },
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

var agentViewFinal = 'tabs';           // 'tabs' | 'console' | 'legacy' — 화면 골격 3안 비교용
var agentTabFinal = 'proposal';        // 'proposal' | 'history' | 'draft'
var agentOpenProposalFinal = 'ap-01';  // 펼쳐진 제안
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

// 각 안의 컨셉과 핵심 포인트 한 줄 — 안을 고를 때마다 스위치 아래에 바뀝니다.
var AGENT_VIEW_NOTE_FINAL = {
  draft: {
    concept: 'PM이 직접 예산을 편성하는 개편 이전 화면',
    point: '계정 타일 → 계정 편집기에서 PM이 값을 입력. Agent 제안·열람전용 없음 (2026-08-27 오후 이전 기준)',
  },
  tabs: {
    concept: 'Agent 제안을 탭으로 나눠 검토 흐름을 단계로 안내',
    point: '제안 → 변경 이력 → 기안·결재 3탭. 제안마다 근거·금액·영향을 펼쳐 보고 Y/N',
  },
  console: {
    concept: '한 화면에서 제안과 이력을 동시에 대조',
    point: '좌측 제안·기안, 우측 변경 이력(Agent↔PM 대화 포함)을 2단으로 병렬 노출',
  },
  legacy: {
    concept: '기존 화면을 그대로 두고 제안만 얹기',
    point: '변화 최소. 상단 배너로 제안 건수·금액만 알리고 나머지는 손대지 않음',
  },
  split: {
    concept: '예산 정보·해야 할 일·Agent 대화를 나눠 배치',
    point: '화면별 3단계 개폐(접기·분할·전체화면). 열린 개수에 따라 3분할/2분할/전체폭 자동 전환',
  },
  mini: {
    concept: 'PM은 검토자 — 첫 화면을 판단할 것만 남김',
    point: '해야 할 일 한 박스에 4건, 상세·예산현황·대화는 전부 클릭 뒤로. 줄에서 바로 Y/N',
  },
};
function renderAgentViewNoteFinal() {
  const n = AGENT_VIEW_NOTE_FINAL[agentViewFinal];
  if (!n) return '';
  return `
    <div class="agent-view-note">
      <span class="avn-k">Concept</span><b>${escHtml(n.concept)}</b>
      <i class="avn-sep">·</i>
      <span class="avn-k point">핵심 Point</span><em>${escHtml(n.point)}</em>
    </div>`;
}

// 화면 골격 비교 스위치 (설계 확정되면 이 블록만 지우면 됩니다)
function renderAgentViewSwitchFinal() {
  const opt = (k, label) =>
    `<button class="agv-btn ${agentViewFinal === k ? 'on' : ''}" onclick="agentSetViewFinal('${k}')">${label}</button>`;
  return `
    <div class="agent-view-switch">
      <span class="agv-tag">[2026.08.27 위클리 피드백 반영] 원가조정 화면안</span>
      ${opt('draft', '초안 (8/27 이전)')}
      ${opt('tabs', '① Agent 제안 중심 3탭')}
      ${opt('console', '② 단일 Agent 콘솔')}
      ${opt('legacy', '③ 기존 화면 + 제안 배너')}
      ${opt('split', '④ 3분할(예산·할일·대화)')}
      ${opt('mini', '⑤ 간소화(검토자 화면)')}
    </div>
    ${renderAgentViewNoteFinal()}`;
}

// 항목 1)·7) Agent가 무엇을 했는지 중심의 상태 스트립 (PM이 만든 예산 관점이 아님)
function renderAgentStatusStripFinal(roll) {
  const pend = agentProposalsFinal('pending');
  const appr = agentProposalsFinal('approved');
  const rej = agentProposalsFinal('rejected');
  const netDelta = appr.reduce((s, p) => s + (p.to - p.from), 0);
  const kpi = (label, value, sub, cls) => `
    <div class="ags-kpi ${cls || ''}">
      <span class="ags-kpi-label">${label}</span>
      <strong class="ags-kpi-val">${value}</strong>
      <span class="ags-kpi-sub">${sub}</span>
    </div>`;
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
      <div class="ags-kpis">
        ${kpi('내 승인 대기', pend.length + '건', pend.length ? 'Y/N 선택이 필요합니다' : '확인할 것이 없습니다', pend.length ? 'warn' : '')}
        ${kpi('Agent 자율처리', AGENT_AUTO_FINAL.length + '건', '총액 변동 없는 조정은 자동 반영', 'auto')}
        ${kpi('승인 완료', appr.length + '건', appr.length ? '순증감 ' + agentDeltaFinal(netDelta) : '기안 대기 없음', 'ok')}
        ${kpi('반려', rej.length + '건', '다음 감지 시점에 재검토', '')}
        ${kpi('CP총액 여유', agentWonFinal(roll.cpRemain), '수립 ' + agentWonFinal(roll.plan), roll.overCp ? 'bad' : '')}
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

// 제안 상세 본문 — 1안 카드와 5안 간소화 화면이 함께 씁니다.
function renderAgentProposalBodyFinal(p) {
  const delta = p.to - p.from;
  const decided = p.status !== 'pending';
  return `
          <div class="agp-block">
            <b>Agent가 이렇게 판단했습니다</b>
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
          <div class="agp-amt">
            <div class="agp-amt-cell"><span>현재 계획</span><b>${agentWonFinal(p.from)}</b></div>
            <div class="agp-arrow">→</div>
            <div class="agp-amt-cell to"><span>Agent 제안</span><b>${agentWonFinal(p.to)}</b></div>
            <div class="agp-amt-cell d"><span>변동</span><b class="${delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(delta)}</b></div>
            <div class="agp-months">${p.monthly.map(m => `<em>${m.m} ${agentDeltaFinal(m.delta)}</em>`).join('')}</div>
          </div>
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
              <button class="agp-no" onclick="agentDecideFinal('${p.id}','rejected')">✗ 반려 (N)</button>
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
          <button class="aga-view" onclick="openBudgetAccountEditor('${r.acct}')">내역 보기</button>
          <button class="aga-manual ${unlocked ? 'on' : ''}" onclick="agentToggleManualFinal('${r.acct}')">
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
       좌: 예산 정보 / 우상(50%): 해야 할 일(PM 검토 항목) / 우하(50%): Agent 대화창
   ========================================================================== */

// [2026.08.28 위클리 피드백 반영] 세 화면은 각각 3단계로 접고 폅니다.
//   collapsed(제목줄만) → normal(분할 안에서 보임) → full(전체 폭) → 다시 collapsed
// 배치는 normal 인 화면 수로 정해집니다.
//   3개 → 좌(예산) / 우(할일·대화)     2개 → 좌 / 우 2분할
//   1개 → 전체 폭                      0개 → 제목줄 3개만
var AGENT_PANES_FINAL = ['budget', 'todo', 'chat'];
var agentPaneStateMapFinal = { budget: 'normal', todo: 'normal', chat: 'collapsed' };

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
// 혼자만 열려 있으면 이미 전체 폭이므로 '전체화면' 단계가 필요 없습니다.
function agentPaneSoloFinal(k) {
  const norm = agentNormalPanesFinal();
  return norm.length === 1 && norm[0] === k;
}
function agentPaneCycleFinal(k) {
  const cur = agentPaneStateFinal(k);
  const next = cur === 'collapsed' ? 'normal'
    : cur === 'normal' ? (agentPaneSoloFinal(k) ? 'collapsed' : 'full')
    : 'collapsed';
  // 전체 폭은 한 번에 하나만 — 다른 화면의 full 은 normal 로 되돌립니다.
  AGENT_PANES_FINAL.forEach(x => { if (x !== k && agentPaneStateMapFinal[x] === 'full') agentPaneStateMapFinal[x] = 'normal'; });
  agentPaneStateMapFinal[k] = next;
  renderBudgetPage();
}
function agentPaneToggleBtnFinal(k) {
  const st = agentPaneStateFinal(k);
  const solo = st === 'normal' && agentPaneSoloFinal(k);   // 이미 전체 폭이면 접기만 남깁니다
  const label = st === 'collapsed' ? '⤢ 펼치기' : (st === 'full' || solo) ? '⤡ 접기' : '⛶ 전체화면';
  const title = st === 'collapsed' ? '분할 화면에 표시' : (st === 'full' || solo) ? '제목줄로 접기' : '이 화면만 전체 폭으로';
  return `<button class="agpane-toggle st-${st}" title="${title}" onclick="agentPaneCycleFinal('${k}')">${label}</button>`;
}

var AGENT_CHAT_FINAL = [
  { who: 'agent', text: '오늘 4개 소스를 점검했습니다. PM 확인이 필요한 변경 4건을 왼쪽에 정리해 두었습니다. 인건비 2건, 외주비 1건, 경비 1건입니다.' },
  { who: 'pm', text: '외주비 건은 왜 지금 올려야 해요?' },
  { who: 'agent', text: '계획을 먼저 올리지 않으면 구매시스템에서 PO 발행 자체가 막힙니다. PO는 잔여예산 한도 안에서만 발행되기 때문에, 견적 24,500,000원을 계약하려면 4,500,000원 증액이 선행되어야 합니다.' },
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

// 우측 상단 — PM이 해야 할 일만 압축해서 보여줍니다(항목 7: 리포트 수준 변화).
function renderAgentTodoFinal() {
  const pend = agentProposalsFinal('pending');
  const appr = agentProposalsFinal('approved');
  return `
    <div class="agent-pane todo ${agentPaneStateFinal('todo')}">
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>해야 할 일</strong>
          <span>PM이 검토할 항목 ${pend.length}건${appr.length ? ` · 기안 대기 ${appr.length}건` : ''}</span>
        </div>
        ${agentPaneToggleBtnFinal('todo')}
      </div>
      <div class="agpane-body">
        ${pend.length ? pend.map(renderAgentProposalCardFinal).join('')
          : '<div class="ag-empty">검토할 항목이 없습니다.</div>'}
        ${appr.length ? `
          <div class="agent-todo draft">
            <div class="agtd-top"><b>기안 대기 ${appr.length}건</b>
              <em>${agentDeltaFinal(appr.reduce((s, p) => s + (p.to - p.from), 0))}</em></div>
            <div class="agtd-why">${appr.map(p => `${p.acct} ${agentDeltaFinal(p.to - p.from)}`).join(' · ')}</div>
            <div class="agtd-acts"><button class="agtd-y" onclick="agentCreateDraftFinal()">직책자에게 기안 →</button></div>
          </div>` : ''}
      </div>
    </div>`;
}

// 우측 하단 — Agent와의 대화창
function renderAgentChatPaneFinal() {
  return `
    <div class="agent-pane chat ${agentPaneStateFinal('chat')}">
      <div class="agpane-head">
        <div class="agpane-title">
          <strong>Agent 대화</strong>
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

// ④ 3분할 — 좌 예산 정보 / 우상 해야 할 일 / 우하 Agent 대화
function renderAgentSplitViewFinal(viewData, data, projInfo, roll) {
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell split">
      ${projInfo}
      <div class="agent-split n${agentNormalPanesFinal().length} ${agentPaneStateFinal('budget') === 'normal' ? 'budget-on' : ''}">
        <div class="agent-pane budget ${agentPaneStateFinal('budget')}">
          <div class="agpane-head">
            <div class="agpane-title">
              <strong>예산 정보</strong>
              <span>Agent가 관리하는 계정 현황과 CP총액 한도</span>
            </div>
            ${agentPaneToggleBtnFinal('budget')}
          </div>
          <div class="agpane-body">
            ${renderAgentStatusStripFinal(roll)}
            ${renderAgentAccountRailFinal(viewData, data, roll)}
          </div>
        </div>
        ${renderAgentTodoFinal()}
        ${renderAgentChatPaneFinal()}
      </div>
    </div>`;
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
var agentMiniPanelFinal = '';       // '' | 'chat' | 'budget' — 하단 보조 패널

function agentMiniToggleFinal(id) {
  agentMiniOpenFinal = agentMiniOpenFinal === id ? '' : id;
  renderBudgetPage();
}
function agentMiniPanelToggleFinal(k) {
  agentMiniPanelFinal = agentMiniPanelFinal === k ? '' : k;
  renderBudgetPage();
}
// 남은 제안을 한 번에 처리 — 검토자가 개별 확인 없이 일괄 결정할 때
function agentMiniBulkFinal(decision) {
  const pend = agentProposalsFinal('pending');
  if (!pend.length) { showToast('검토할 항목이 없습니다.'); return; }
  pend.forEach(p => agentDecideFinal(p.id, decision));
  showToast(decision === 'approved'
    ? `${pend.length}건을 제안대로 검토 완료했습니다. 직책자 기안에 함께 담깁니다.`
    : `${pend.length}건을 반려했습니다.`);
}

// 검토 한 줄 — 계정 / 무엇을 / 얼마 / Y·N. 더 알고 싶으면 줄을 눌러 펼칩니다.
function renderAgentMiniRowFinal(p) {
  const open = agentMiniOpenFinal === p.id;
  const delta = p.to - p.from;
  return `
    <div class="agm-row ${open ? 'open' : ''} ${p.status}">
      <div class="agm-line">
        <button class="agm-open" onclick="agentMiniToggleFinal('${p.id}')" title="${open ? '접기' : '근거·상세 보기'}">
          <span class="agp-acct sm ${agentAcctColorFinal(p.acct)}">${p.acct}</span>
          <b>${escHtml(p.title)}</b>
          <em class="agm-delta ${delta > 0 ? 'up' : 'down'}">${agentDeltaFinal(delta)}</em>
          <i class="agm-caret">${open ? '∧' : '∨'}</i>
        </button>
        ${p.status === 'pending' ? `
          <div class="agm-yn">
            <button class="agm-y" title="제안대로 검토 완료 — 직책자 기안에 포함" onclick="agentDecideFinal('${p.id}','approved')">Y</button>
            <button class="agm-n" title="반려" onclick="agentDecideFinal('${p.id}','rejected')">N</button>
          </div>`
          : `<span class="agm-done ${p.status}">${p.status === 'approved' ? '검토 완료' : '반려'}</span>`}
      </div>
      ${open ? `<div class="agp-body agm-detail">${renderAgentProposalBodyFinal(p)}</div>` : ''}
    </div>`;
}

// 하단 보조 패널 — 기본은 닫혀 있고, 필요할 때만 엽니다.
function renderAgentMiniChatFinal() {
  return `
    <div class="agm-panel ${agentMiniPanelFinal === 'chat' ? 'open' : ''}">
      <button class="agm-panel-head" onclick="agentMiniPanelToggleFinal('chat')">
        <span class="agm-panel-ic">💬</span>
        <b>Agent에게 물어보기</b>
        <em>왜 이렇게 판단했는지, 다른 방법은 없는지 물어보세요</em>
        <i>${agentMiniPanelFinal === 'chat' ? '∧' : '∨'}</i>
      </button>
      ${agentMiniPanelFinal === 'chat' ? `
        <div class="agm-panel-body">
          ${AGENT_CHAT_FINAL.map(d => `
            <div class="agc-msg ${d.who}">
              <span class="agc-who">${d.who === 'pm' ? '이봄(PM)' : 'Agent'}</span>
              <div class="agc-text ${d.pending ? 'pending' : ''}">${escHtml(d.text)}</div>
            </div>`).join('')}
          <div class="agpane-foot">
            <input id="agent-chat-input" type="text" placeholder="예: 외주비 왜 올려야 해요? 다른 계정에서 당겨올 수 없나요?"
              onkeydown="if(event.key==='Enter') agentChatSendFinal()">
            <button onclick="agentChatSendFinal()">보내기</button>
          </div>
        </div>` : ''}
    </div>`;
}

function renderAgentMiniBudgetFinal(viewData, data, roll) {
  const open = agentMiniPanelFinal === 'budget';
  return `
    <div class="agm-panel ${open ? 'open' : ''}">
      <button class="agm-panel-head" onclick="agentMiniPanelToggleFinal('budget')">
        <span class="agm-panel-ic">📊</span>
        <b>예산 현황 보기</b>
        <em>수립 ${fmt(roll.plan)}원 · 집행률 ${roll.plan > 0 ? Math.round((roll.done / roll.plan) * 1000) / 10 : 0}% · CP총액 여유 ${fmt(roll.cpRemain)}원</em>
        <i>${open ? '∧' : '∨'}</i>
      </button>
      ${open ? `
        <div class="agm-panel-body">
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
          </div>
        </div>` : ''}
    </div>`;
}

// ⑤ 간소화 검토자 화면
function renderAgentMiniViewFinal(viewData, data, projInfo, roll) {
  // 진입 첫 렌더에서만 URL이 지정한 계정을 해제합니다(클릭으로 연 계정은 그대로 둡니다).
  if (!agentMiniEnteredFinal) {
    agentMiniEnteredFinal = true;
    if (budgetSetupEditAccount) {
      budgetSetupEditAccount = null;
      if (typeof updateHashForScreen === 'function') updateHashForScreen('s-budget');
    }
  }
  const pend = agentProposalsFinal('pending');
  const done = AGENT_PROPOSALS_FINAL.filter(p => p.status !== 'pending');
  const net = pend.reduce((t, p) => t + (p.to - p.from), 0);
  return `
    ${renderAgentViewSwitchFinal()}
    <div class="setup-overview compact agent-shell mini">
      ${projInfo}

      <div class="agm-hero ${pend.length ? 'todo' : 'clear'}">
        <span class="agm-hero-ic" aria-hidden="true">🤖</span>
        <div class="agm-hero-txt">
          <strong>${pend.length
            ? `검토해 주실 것이 ${pend.length}건 있습니다`
            : '지금은 검토하실 것이 없습니다'}</strong>
          <span>예산은 Agent가 관리합니다. ${pend.length
            ? `합계 ${agentDeltaFinal(net)} · 판단만 해주시면 나머지는 Agent가 처리합니다.`
            : `마지막 점검 ${agentLastCheckFinal} · 변경 요인이 생기면 여기에 올려 드립니다.`}</span>
        </div>
        ${pend.length ? `
          <div class="agm-hero-acts">
            <button class="agm-all-y" onclick="agentMiniBulkFinal('approved')">모두 제안대로 (Y)</button>
          </div>` : ''}
      </div>

      <div class="agm-box">
        <div class="agm-box-head">
          <strong>해야 할 일</strong>
          <span>${pend.length
            ? `검토할 항목 ${pend.length}건 · 합계 ${agentDeltaFinal(net)}`
            : '검토할 항목 없음'}</span>
        </div>
        <div class="agm-list">
          ${pend.length ? pend.map(renderAgentMiniRowFinal).join('')
            : `<div class="ag-empty">Agent가 구매시스템 PO · SCM 투입계획 · ERP 가용예산 · 월 마감 실적을 계속 보고 있습니다.</div>`}
        </div>
      </div>

      ${done.length ? `
        <div class="agm-donebar">
          <b>검토 완료 ${done.filter(p => p.status === 'approved').length}건 · 반려 ${done.filter(p => p.status === 'rejected').length}건</b>
          <button onclick="agentSetViewFinal('tabs');agentSetTabFinal('draft')">기안 내용 보기 →</button>
        </div>` : ''}

      ${renderAgentMiniChatFinal()}
      ${renderAgentMiniBudgetFinal(viewData, data, roll)}

      ${budgetSetupEditAccount ? `
        <div class="agm-acct-detail">
          <div class="agm-acct-detail-head">
            <b>${budgetSetupEditAccount} 내역</b>
            <span>검토자가 직접 열어 본 상세입니다.</span>
            <button onclick="closeBudgetAccountEditor()">닫기</button>
          </div>
          <div class="setup-expanded-detail">${renderBudgetAccountEditor(viewData, budgetSetupEditAccount)}</div>
        </div>` : ''}
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
  .agent-view-note { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;
    margin:0 0 12px; padding:9px 13px; border:1px solid #e5e7eb; border-left:3px solid #6366f1;
    border-radius:10px; background:#fbfcfe; }
  .agent-view-note .avn-k { flex:0 0 auto; font-size:10.5px; font-weight:900; letter-spacing:.04em;
    color:#4338ca; background:#eef2ff; border-radius:5px; padding:3px 7px; white-space:nowrap; }
  .agent-view-note .avn-k.point { color:#a45b06; background:#fff5e5; }
  .agent-view-note b { font-size:13px; font-weight:800; color:#0f172a; }
  .agent-view-note em { font-style:normal; font-size:12.5px; color:#64748b; line-height:1.6; }
  .agent-view-note .avn-sep { font-style:normal; color:#cbd5e1; font-weight:900; }

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
  .agpane-toggle { flex:0 0 auto; border:1px solid #cbd5e1; background:#fff; color:#475569;
    border-radius:999px; padding:5px 11px; font-size:11.5px; font-weight:800; cursor:pointer; white-space:nowrap; }
  .agpane-toggle:hover { border-color:#0f172a; color:#0f172a; }

  /* 좌측 예산 정보도 패널 — 3분할 기본에서는 본문 스크롤 */
  .agent-split .agent-pane.budget .agpane-body { padding:12px 14px; }

  /* 3단계 개폐 배치 — 세 패널이 하나의 그리드 직계 자식입니다.
     normal 개수로 열 수를 정하고, collapsed/full 은 전체 폭을 차지합니다. */
  .agent-split { display:grid; gap:14px; align-items:start; grid-auto-flow:row; }
  .agent-split.n3 { grid-template-columns:minmax(0,1.12fr) minmax(0,1fr); }
  .agent-split.n3 .agent-pane.budget.normal { grid-row:span 2; }
  .agent-split.n2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .agent-split.n1, .agent-split.n0 { grid-template-columns:1fr; }

  /* 접힌 화면 = 제목줄만. 항상 전체 폭으로 아래에 쌓입니다 */
  /* 접힌 화면은 제목줄만 남기고 항상 맨 위에 모아 둡니다 */
  .agent-pane.collapsed { grid-column:1 / -1; order:-1; height:auto !important; }
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

  /* 토글 버튼 3단계 */
  .agpane-toggle.st-collapsed { border-color:#c7d2fe; background:#eef2ff; color:#4338ca; }
  .agpane-toggle.st-full { border-color:#0f172a; background:#0f172a; color:#fff; }

  /* [#2] 해야 할 일 = 1안 제안 카드 재사용. 좁은 패널에서는 버튼을 세로로 */
  .agent-pane.todo .agpane-body .agent-prop { margin-bottom:9px; }
  .agent-pane.todo .agp-head { padding:11px 12px; gap:9px; }
  .agent-pane.todo .agp-title strong { font-size:14px; white-space:normal; }
  .agent-pane.todo .agp-body { padding:0 12px 13px; }
  .agent-pane.todo .agp-actions { flex-direction:column; }
  .agent-pane.todo .agp-actions button { width:100%; }
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
  .agm-hero { display:flex; align-items:center; gap:14px; margin:0 0 16px;
    border:1px solid #d9def0; border-radius:16px; padding:18px 20px;
    background:linear-gradient(180deg,#f7f8ff,#fff 70%); }
  .agm-hero.todo { border-color:#fcd34d; background:linear-gradient(180deg,#fffbeb,#fff 70%); }
  .agm-hero-ic { flex:0 0 auto; width:44px; height:44px; border-radius:13px; background:#fff;
    border:1px solid #e5e7eb; display:inline-flex; align-items:center; justify-content:center; font-size:23px; }
  .agm-hero-txt { flex:1 1 auto; min-width:0; }
  .agm-hero-txt strong { display:block; font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-.4px; }
  .agm-hero-txt span { display:block; margin-top:4px; font-size:13px; color:#64748b; line-height:1.65; }
  .agm-hero-acts { flex:0 0 auto; }
  .agm-all-y { border:1px solid #0f9d63; background:#0f9d63; color:#fff; border-radius:11px;
    padding:11px 18px; font-size:14px; font-weight:900; cursor:pointer; white-space:nowrap; }
  .agm-all-y:hover { background:#0b7f50; }

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
    .agm-hero { flex-wrap:wrap; }
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
