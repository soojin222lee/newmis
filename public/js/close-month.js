// ============================================================
//  close-month.js — 실적 / 계획 월 구분을 회계 마감일 기준으로              작성: 남주
//
//  PM 답변(2026.11.17)
//    · 매월 마감일자를 관리한다. 회계팀이 매달 말 전사 공지 → 관리자 > 회계결산일자에서 운영자가 입력.
//    · 마감일 기준으로 지난 달(마감된 달)까지 = 실적,
//      마감이 안 된 당월 = 실적과 계획 둘 다(실적 ≤ 계획), 그 다음 달부터 = 계획.
//      예) 11월 2일 기준 최종 마감일 2026-10-28 → 10월까지 실적, 11월 실적+계획, 12월부터 계획
//
//  지금까지 목업은 화면마다 기준이 달랐습니다(2026-06 고정 · 2026-07 미만 · 2026-08 · 프로젝트별 current 2026-04~08).
//  이 파일이 모든 예산 스크립트 뒤에 로드되어 기준을 하나로 맞춥니다(공유 파일은 고치지 않음).
//    1) 마감월 CLOSE_YM 계산 — 회계결산일자 표(관리자 화면과 같은 값, 운영자가 고치면 localStorage 값 우선)
//    2) isPastActualMonth · osv3TodayMonthV3 · AGENT_EXP_CLOSED_THRU_FINAL · EXPENSE_ACTUAL_MONTHS 를 마감월로
//    3) BUDGET_SOURCE 의 월 데이터 — 마감월까지 실적으로 바꾸고(목업 실적 = 계획의 88~100%),
//       당월은 계획을 두고 실적 일부(계획의 45%)를 함께 둠
// ============================================================

// 관리자 > 회계결산일자 관리(admin-closedate.js)와 같은 목업 값 — { s: 회계 결산일, c: 회계 마감일 }
var CM_CLOSEDATE = {
  '202601': { s: '2026-01-27', c: '2026-01-28' }, '202602': { s: '2026-02-24', c: '2026-02-25' },
  '202603': { s: '2026-03-30', c: '2026-03-31' }, '202604': { s: '2026-04-27', c: '2026-04-28' },
  '202605': { s: '2026-05-26', c: '2026-05-27' }, '202606': { s: '2026-06-29', c: '2026-06-30' },
  '202607': { s: '2026-07-28', c: '2026-07-29' }, '202608': { s: '2026-08-26', c: '2026-08-27' },
  '202609': { s: '2026-09-29', c: '2026-09-30' }, '202610': { s: '2026-10-27', c: '2026-10-28' }
};
(function cmLoadAdmin() {   // 관리자 화면에서 운영자가 입력·수정한 값이 있으면 그 값
  try {
    var s = JSON.parse(localStorage.getItem('budgetai.admin.closedate.v1') || 'null');
    if (s && typeof s === 'object') CM_CLOSEDATE = s;
  } catch (e) { /* 저장소 막힘 — 기본값 */ }
})();

function cmYm(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function cmNextYm(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0'); }
// 오늘까지 마감이 끝난 가장 최근 달(YYYY-MM)과 그 마감일
function cmCloseInfo() {
  var today = cmYm(new Date()) + '-' + String(new Date().getDate()).padStart(2, '0');
  var best = null;
  Object.keys(CM_CLOSEDATE).forEach(function (k) {
    var c = CM_CLOSEDATE[k] && CM_CLOSEDATE[k].c;
    if (!c || c > today) return;
    if (!best || k > best) best = k;
  });
  if (!best) return { ym: '', date: '' };
  return { ym: best.slice(0, 4) + '-' + best.slice(4, 6), date: CM_CLOSEDATE[best].c };
}
var CM_INFO = cmCloseInfo();
var CLOSE_YM = CM_INFO.ym || '2026-10';          // 마감된 마지막 달
var CLOSE_DATE = CM_INFO.date || '';             // 그 달의 회계 마감일
var CUR_YM = cmNextYm(CLOSE_YM);                 // 마감 전 당월(실적 + 계획)

// ── 2) 공유 기준 함수 · 값 ──────────────────────────────────────────────
isPastActualMonth = function (month) { return String(month) <= CLOSE_YM; };
if (typeof osv3TodayMonthV3 === 'function') osv3TodayMonthV3 = function () { return CLOSE_YM; };
if (typeof AGENT_EXP_CLOSED_THRU_FINAL !== 'undefined') AGENT_EXP_CLOSED_THRU_FINAL = CLOSE_YM;
if (typeof EXPENSE_ACTUAL_MONTHS !== 'undefined' && Array.isArray(EXPENSE_ACTUAL_MONTHS)) {
  var cmLast = EXPENSE_ACTUAL_MONTHS[EXPENSE_ACTUAL_MONTHS.length - 1] || '2026-01';
  while (cmLast < CLOSE_YM) { cmLast = cmNextYm(cmLast); EXPENSE_ACTUAL_MONTHS.push(cmLast); }
}

// ── 3) 월 데이터 ────────────────────────────────────────────────────────
function cmHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function cmRound(v) { return Math.round(v / 1000) * 1000; }
function cmApplyProject(key, data) {
  if (!data || !Array.isArray(data.months)) return;
  data.current = CLOSE_YM;
  data.months.forEach(function (mo) {
    if (!mo || !mo.m) return;
    var cats = Object.keys(mo).filter(function (k) { return mo[k] && typeof mo[k] === 'object' && !Array.isArray(mo[k]); });
    if (mo.m <= CLOSE_YM && mo.type !== 'actual') {
      // 마감된 달 — 계획을 실적으로 (목업 실적 = 계획의 88~100%)
      cats.forEach(function (c) {
        var x = mo[c], p = x.p || 0;
        x.a = p ? cmRound(p * (0.88 + (cmHash(key + mo.m + c) % 13) / 100)) : 0;
        x.q = 0;
        (x.details || []).forEach(function (d) { if (d && d.type === '계획') d.type = '실적'; });
      });
      mo.type = 'actual';
      mo.cmClosed = true;
    } else if (mo.m === CUR_YM && mo.type !== 'actual') {
      // 마감 전 당월 — 계획은 그대로, 실적 일부(계획의 45%)를 함께 (실적 ≤ 계획)
      cats.forEach(function (c) { var x = mo[c]; x.a = x.p ? cmRound(x.p * 0.45) : 0; });
      mo.cmCurrent = true;
    }
  });
}
if (typeof BUDGET_SOURCE !== 'undefined') Object.keys(BUDGET_SOURCE).forEach(function (k) { cmApplyProject(k, BUDGET_SOURCE[k]); });

// 당월은 실적과 계획을 함께 셈 — 실적 합에는 당월 실적을, 계획 쪽에는 당월 계획을 넣습니다
if (typeof catVal === 'function') {
  var cmCatValBefore = catVal;
  catVal = function (mo, cat, data) {
    if (mo && mo.cmCurrent && mo[cat]) { var c = mo[cat]; return { a: c.a || 0, q: c.q || 0, p: c.p || 0 }; }
    return cmCatValBefore.apply(this, arguments);
  };
}

// 경비 이월 제안(ap-06)은 로드할 때 옛 마감월(8월)로 만들어졌으므로, 같은 규칙으로 새 마감월 기준으로 다시 만듭니다
(function cmRebuildExpCarry() {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined' || typeof agentExpStatFinal !== 'function') return;
  const i = AGENT_PROPOSALS_FINAL.findIndex(function (p) { return p.id === 'ap-06'; });
  if (i < 0 || AGENT_PROPOSALS_FINAL[i].status !== 'pending') return;
  AGENT_PROPOSALS_FINAL.splice(i, 1);
  const year = CLOSE_YM.slice(0, 4);
  const st = agentExpStatFinal(year);
  const u = st.tot.unused;
  if (!u || !st.restMonths.length) return;
  const pastL = agentExpMonthLabelFinal(st.closedMonths), restL = agentExpMonthLabelFinal(st.restMonths);
  const n = st.restMonths.length, unit = Math.round(u / n);
  const monthly = [{ m: st.closedMonths[st.closedMonths.length - 1], delta: -u }]
    .concat(st.restMonths.map(function (m, k) { return { m: m, delta: k === n - 1 ? u - unit * (n - 1) : unit }; }));
  const groups = st.live.filter(function (g) { return g.unused; });
  AGENT_PROPOSALS_FINAL.splice(i, 0, {
    id: 'ap-06', acct: '경비', status: 'pending', confidence: 0.97, carry: true,
    detectedAt: (CLOSE_DATE || (CLOSE_YM + '-28')) + ' 09:10', trigger: '월 마감(' + Number(CLOSE_YM.slice(5, 7)) + '월) · 경비 중분류 연간 예산 점검',
    title: pastL + '에 쓰지 않은 경비 ' + fmt(u) + '원이 재수립 때 감액되지 않게 ' + restL + '로 이월해야 합니다',
    legs: [{ acct: '경비', delta: 0 }],
    why: '경비는 중분류 단위 연간 예산입니다. 재수립하면 마감된 ' + pastL + '은 실적으로 확정되어, '
      + '계획했지만 쓰지 않은 ' + fmt(u) + '원이 ' + restL + '에 다시 편성되지 않는 한 감액된 채로 기안됩니다. '
      + '같은 해 남은 달로 그대로 넘기면 ' + year.slice(2) + '년 연간 예산 ' + fmt(st.tot.annual) + '원이 유지됩니다.',
    evidence: groups.map(function (g) { return g.name + ' · ' + pastL + ' 계획 ' + fmt(g.past) + '원 − 실적 ' + fmt(g.actual) + '원 = 미사용 ' + fmt(g.unused) + '원'; })
      .concat([restL + ' ' + n + '개월에 균등 이월 · 연간 예산 ' + fmt(st.tot.annual) + '원 그대로(±0원)']),
    monthly: monthly,
    impact: '총액 변동이 없어 CP한도에 영향이 없습니다. 반영하지 않으면 재수립 기안에서 경비 ' + fmt(u) + '원이 감액됩니다.'
  });
})();

// 경비 행사비 제안(ap-04)도 8월 마감 기준으로 손으로 쓴 문장이라, 같은 이야기(부족액 600,000원)를 새 마감월 기준 숫자로 다시 씁니다
//   의욕관리비: 연간 예산 − 마감월까지 실적 = 남은 가용, 남은 달 계획 + 연말 행사비 = 집행 예정 → 부족 600,000원
(function cmRebuildExpEvent() {
  if (typeof AGENT_PROPOSALS_FINAL === 'undefined' || typeof agentExpStatFinal !== 'function') return;
  const p = AGENT_PROPOSALS_FINAL.find(function (x) { return x.id === 'ap-04'; });
  if (!p || p.status !== 'pending' || !p.breakdown) return;
  const st = agentExpStatFinal(CLOSE_YM.slice(0, 4));
  let row = null; st.live.forEach(function (g) { g.rows.forEach(function (r) { if (r.name === '의욕관리비') row = r; }); });
  if (!row || !st.restMonths.length) return;
  const src = (EXPENSE_ACCOUNT_ROWS_FINAL || []).find(function (r) { return r.id === row.id; }) || {};
  const ms = EXPENSE_PLAN_MONTHS || [];
  const short = 600000, avail = row.annual - row.actual, event = Math.max(avail + short - row.rest, 0);
  const pastL = agentExpMonthLabelFinal(st.closedMonths), restL = agentExpMonthLabelFinal(st.restMonths);
  const lastM = st.restMonths[st.restMonths.length - 1];
  const yy = CLOSE_YM.slice(2, 4);
  p.detectedAt = (CLOSE_DATE || (CLOSE_YM + '-28')) + ' 09:10';
  p.why = '지금 남은 예산으로는 연말 행사비까지 쓸 수 없습니다. 의욕관리비 ' + yy + '년 예산 ' + fmt(row.annual) + '원에서 ' + pastL + '에 ' + fmt(row.actual) + '원을 썼으니 남은 금액은 ' + fmt(avail) + '원인데, '
    + restL + '에 쓸 예정이 정기 조직활동비 ' + fmt(row.rest) + '원과 연말 행사비 ' + fmt(event) + '원을 합쳐 ' + fmt(row.rest + event) + '원이라 ' + fmt(short) + '원이 모자랍니다. 집행 전에 먼저 확보해야 합니다.';
  p.evidence = [
    '의욕관리비 ' + yy + '년 릴리즈 예산 ' + fmt(row.annual) + '원 · ' + pastL + ' 실적 ' + fmt(row.actual) + '원 → 잔여 가용 ' + fmt(avail) + '원',
    restL + ' 집행 예정 ' + fmt(row.rest) + '원 + 연말 행사비 추가 소요 ' + fmt(event) + '원 = ' + fmt(row.rest + event) + '원',
    '부족액 ' + fmt(short) + '원 — 확보하기 전에는 ' + Number(lastM.slice(5)) + '월 집행이 승인되지 않습니다'
  ];
  const rows = st.restMonths.map(function (m) {
    const i = ms.indexOf(m); return { label: Number(m.slice(5)) + '월 · 정기 조직활동비', amount: Number((src.monthly || [])[i] || 0), src: '수립 계획 (확정)' };
  }).filter(function (r) { return r.amount; });
  rows.push({ label: Number(lastM.slice(5)) + '월 · 연말 행사비', amount: event, src: '조직장 요청 접수 ' + CLOSE_YM + '-26 · 미편성' });
  p.breakdown = { title: restL + ' 집행 예정액 산출 근거', rows: rows, total: row.rest + event,
    availLabel: yy + '년 릴리즈 예산 ' + fmt(row.annual) + '원 − ' + pastL + ' 실적 ' + fmt(row.actual) + '원', avail: avail, short: short };
  p.monthly = [{ m: lastM, delta: short }];
})();
