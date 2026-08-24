// AI GUIDE: 수행원가 > 원가조정 > 경비(CATS[3]) 계정 전용 렌더 소스입니다.
// - URL: #/budget-adjust/expense
// - budget-status-4.js에 있던 경비 데이터/그리드/검증/패널/편집기 데코레이터를 이 파일로 이관했습니다.
// - EXPENSE_PLAN_MONTHS는 인건비 OT와 공유하는 데이터라 budget-status.js에 그대로 두고 참조만 합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).

// 경비 계정 편집기 데코레이터 (원래 budget-status-4.js:1211~1225)
var renderBudgetAccountEditorBeforeExpenseSingleFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[3]) return renderBudgetAccountEditorBeforeExpenseSingleFinal(data, account);
  return `
    <div class="setup-editor expense-single-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">경비 수정</div>
          <div class="setup-editor-sub">경비는 자원계획 그리드에서 소계정별 월별 계획을 직접 작성하며, 이 화면이 경비 예산내역 요약 역할을 함께 합니다.</div>
        </div>
      </div>
      ${renderExpensePlanPanel(data)}
    </div>`;
};

// 경비 데이터/그리드/검증/패널 (원래 budget-status-4.js:2066~2249)
const EXPENSE_MIDDLE_ACCOUNTS_FINAL = [
  { code:'C700000', name:'일반비통제성', control:'비통제' },
  { code:'C700001', name:'일반통제성', control:'통제' },
  { code:'C700002', name:'우편송', control:'통제' },
  { code:'C705501', name:'조직운영비', control:'통제' },
  { code:'C700100', name:'소모품비', control:'통제' },
  { code:'C701101', name:'인건비', control:'비통제' },
  { code:'C723101', name:'교육훈련비', control:'통제' },
  { code:'C734101', name:'접대비', control:'통제' },
  { code:'C700003', name:'일반비', control:'통제' },
];

const EXPENSE_ACCOUNT_ROWS_FINAL = [
  { id:'exf-01', middleCode:'C705501', middleName:'조직운영비', controlled:true, code:'705501', name:'의욕관리비', carried:12024000, actual:296642, erpAvailable:11456642, monthly:[1800000,1872000,1872000,1872000,1872000,1200000,900000,600000,0,0] },
  { id:'exf-02', middleCode:'C700001', middleName:'일반통제성', controlled:true, code:'735901', name:'회의비', carried:3173000, actual:337400, erpAvailable:2945000, monthly:[500000,520000,520000,520000,520000,365000,0,0,0,0] },
  { id:'exf-03', middleCode:'C700002', middleName:'우편송', controlled:true, code:'743901', name:'잡비', carried:3173000, actual:0, erpAvailable:2945000, monthly:[300000,300000,300000,300000,300000,300000,300000,300000,245000,0] },
  { id:'exf-04', middleCode:'C700003', middleName:'일반비', controlled:true, code:'705502', name:'조직관리비', carried:0, actual:0, erpAvailable:5473239, monthly:[0,700000,700000,700000,700000,700000,700000,700000,573239,0] },
  { id:'exf-05', middleCode:'C700100', middleName:'소모품비', controlled:true, code:'710301', name:'사무용품비', carried:501000, actual:0, erpAvailable:1093339, monthly:[75000,78000,78000,78000,78000,78000,78000,78000,78000,472339] },
  { id:'exf-06', middleCode:'C700100', middleName:'소모품비', controlled:true, code:'710901', name:'전산소모품비', carried:835000, actual:22910, erpAvailable:775000, monthly:[125000,130000,130000,130000,130000,130000,0,0,0,0] },
  { id:'exf-07', middleCode:'C734101', middleName:'접대비', controlled:true, code:'734101', name:'접대비', carried:0, actual:0, erpAvailable:0, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exf-08', middleCode:'C700000', middleName:'일반비통제성', controlled:false, code:'NCTRL-01', name:'기타입차료', carried:245714000, actual:0, erpAvailable:null, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exf-09', middleCode:'C700000', middleName:'일반비통제성', controlled:false, code:'NCTRL-02', name:'PJ운영예비비', carried:1640967367, actual:0, erpAvailable:null, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exf-10', middleCode:'C723101', middleName:'교육훈련비', controlled:true, code:'723101', name:'팀별교육비', carried:0, actual:0, erpAvailable:0, monthly:[0,0,0,0,0,0,0,0,0,0] },
  { id:'exf-11', middleCode:'C701101', middleName:'인건비', controlled:false, code:'701101', name:'외부교육 강사료', carried:0, actual:0, erpAvailable:null, monthly:[0,0,0,0,0,0,0,0,0,0] },
];

getExpenseRows = function() {
  return EXPENSE_ACCOUNT_ROWS_FINAL;
};

function getExpenseMiddleRowsFinal() {
  return EXPENSE_MIDDLE_ACCOUNTS_FINAL.map(mid => {
    const children = getExpenseRows().filter(row => row.middleCode === mid.code && row.middleName === mid.name);
    const months = EXPENSE_PLAN_MONTHS.map((_, idx) => children.reduce((sum, row) => sum + Number(row.monthly[idx] || 0), 0));
    const plan = months.reduce((sum, value) => sum + value, 0);
    const actual = children.reduce((sum, row) => sum + Number(row.actual || 0), 0);
    const erpAvailable = children.reduce((sum, row) => sum + Number(row.erpAvailable || 0), 0);
    return { ...mid, controlled:mid.control === '통제', children, months, plan, actual, erpAvailable };
  }).filter(row => row.children.length || row.plan || row.actual);
}

function expensePlanTotalFinal(row) {
  return row.monthly.reduce((sum, value) => sum + Number(value || 0), 0);
}

// 경비 계획은 연단위로 수립한다. 월별 입력은 의미가 없어 연도(2026/2027)로 통합.
// EXPENSE_PLAN_MONTHS(예: 2026-07~2027-04)에서 연도별 월 인덱스 구간을 도출한다.
function expensePlanYearsFinal() {
  const map = {};
  EXPENSE_PLAN_MONTHS.forEach((m, idx) => {
    const y = m.slice(0, 4);
    (map[y] = map[y] || []).push(idx);
  });
  return Object.keys(map).sort().map(y => ({ year: y, idxs: map[y] }));
}

// 특정 연도(월 인덱스 구간)의 계획 합계
function expenseYearPlan(row, idxs) {
  return idxs.reduce((sum, i) => sum + Number(row.monthly[i] || 0), 0);
}

// 연도 헤더 라벨 — 예: "26년 (7월~12월)". 월 범위는 데이터에서 자동 계산.
function expenseYearLabel(year, idxs) {
  const yy = year.slice(2);
  const mNum = i => parseInt(EXPENSE_PLAN_MONTHS[i].slice(5, 7), 10);
  const first = mNum(idxs[0]);
  const last = mNum(idxs[idxs.length - 1]);
  return `${yy}년 (${first}월~${last}월)`;
}

validateExpenseErpAvailability = function(rows = getExpenseRows()) {
  const invalid = rows.find(row => row.controlled && expensePlanTotalFinal(row) > Number(row.erpAvailable || 0));
  if (!invalid) return { ok:true };
  return {
    ok:false,
    message:`${invalid.middleName} > ${invalid.name} 계획금액 ${fmt(expensePlanTotalFinal(invalid))}원이 ERP 가용예산 ${fmt(invalid.erpAvailable || 0)}원을 초과했습니다.`,
  };
};

getExpenseTransferLimit = function() {
  return getExpenseRows().reduce((sum, row) => {
    if (row.controlled) return sum + Number(row.erpAvailable || 0);
    return sum + expensePlanTotalFinal(row);
  }, 0);
};

saveExpensePlan = function() {
  const years = expensePlanYearsFinal();
  getExpenseRows().forEach(row => {
    const next = row.monthly.slice();
    years.forEach(({ year, idxs }) => {
      const el = document.getElementById(`expense-plan-${row.id}-${year}`);
      const amount = parseBudgetAmount(el ? el.value : expenseYearPlan(row, idxs));
      // 연간 계획은 월별로 분배하지 않고 해당 연도 첫 월 슬롯에 통합 저장(합계는 동일하게 유지)
      idxs.forEach((i, k) => { next[i] = k === 0 ? amount : 0; });
    });
    row.monthly = next;
  });
  const validation = validateExpenseErpAvailability();
  if (!validation.ok) {
    showToast(validation.message);
    renderBudgetPage();
    return;
  }
  showToast('경비 연도별 계획이 저장되었습니다. 통제 중계정의 ERP 가용예산도 확인했습니다.');
  renderBudgetPage();
};

showExpenseErpAvailabilityModal = function() {
  const middleRows = getExpenseMiddleRowsFinal().filter(row => row.controlled);
  const bodyRows = middleRows.map(group => {
    const diff = group.plan - group.erpAvailable;
    return `
      ${group.children.map((row, idx) => `
        <tr>
          ${idx === 0 ? `<td rowspan="${group.children.length}">${group.code}</td><td rowspan="${group.children.length}">${group.name}</td><td rowspan="${group.children.length}" class="center">통제</td><td rowspan="${group.children.length}" class="num">${fmt(group.erpAvailable)}</td>` : ''}
          <td>${row.code}</td>
          <td>${row.name}</td>
          <td class="num">${fmt(row.carried)}</td>
          <td class="num">${fmt(expensePlanTotalFinal(row))}</td>
          ${idx === 0 ? `<td rowspan="${group.children.length}" class="num ${diff > 0 ? 'danger' : ''}">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>` : ''}
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
    <div class="expense-erp-box wide">
      <div class="expense-erp-head">
        <strong>ERP 가용예산조회</strong>
        <button onclick="document.getElementById('expense-erp-modal').classList.remove('open')">×</button>
      </div>
      <div class="expense-erp-note">* 통제 중계정은 해당 프로젝트의 매출귀속부서에 ERP 가용예산이 있어야 계획을 수립할 수 있습니다. 소계정별 계획 합계가 중계정 가용예산을 초과하면 저장할 수 없습니다.</div>
      <div class="expense-erp-table-wrap">
        <table class="expense-erp-table">
          <thead>
            <tr><th>중계정코드</th><th>중계정명</th><th>통제여부</th><th>ERP 가용예산</th><th>소계정코드</th><th>소계정명</th><th>이전예산(A)</th><th>현재계획(B)</th><th>차이(B-A)</th></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
  modal.classList.add('open');
};

// 실적 열 펼침 상태 — 실적 헤더의 [+]로 지난 26년 월별 실적 열을 펼친다.
let expenseActualExpanded = false;

// 지난 실적 월(2026년 1월~7월)
const EXPENSE_ACTUAL_MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
// 후반월 가중 배분(합계 1.0) — 마지막 월에서 잔여를 보정해 row.actual과 정확히 일치시킨다.
const EXPENSE_ACTUAL_WEIGHTS = [0.05, 0.08, 0.12, 0.15, 0.18, 0.20, 0.22];

// 월별 실적(목업) — 합계는 row.actual과 정확히 일치
function expenseMonthlyActual(row) {
  const a = Number(row.actual || 0);
  if (a <= 0) return EXPENSE_ACTUAL_MONTHS.map(() => 0);
  let acc = 0;
  return EXPENSE_ACTUAL_WEIGHTS.map((w, i) => {
    if (i === EXPENSE_ACTUAL_WEIGHTS.length - 1) return a - acc; // 마지막 월 잔여 보정
    const v = Math.round(a * w);
    acc += v;
    return v;
  });
}

function expenseActualMonthLabel(m) {
  return `'${m.slice(2, 4)}.${parseInt(m.slice(5, 7), 10)}월`;
}

// 실적 헤더 [+] 토글 — 지난 26년 월별 실적 열 펼침/접힘
function toggleExpenseActualCols() {
  expenseActualExpanded = !expenseActualExpanded;
  renderBudgetPage();
}

// 입력 시 계획합계·가용잔액을 실시간 재계산 (한눈에 작성)
function expenseRecalcRow(id) {
  const row = getExpenseRows().find(r => r.id === id);
  if (!row) return;
  let total = 0;
  expensePlanYearsFinal().forEach(({ year }) => {
    const el = document.getElementById(`expense-plan-${id}-${year}`);
    total += parseBudgetAmount(el ? el.value : 0);
  });
  const totalCell = document.getElementById(`expense-total-${id}`);
  if (totalCell) totalCell.textContent = fmt(total);
  if (row.controlled) {
    const bal = Number(row.erpAvailable || 0) - total;
    const balCell = document.getElementById(`expense-bal-${id}`);
    if (balCell) { balCell.textContent = fmt(Math.max(bal, 0)); balCell.classList.toggle('danger', bal < 0); }
    const tr = document.getElementById(`expense-tr-${id}`);
    if (tr) tr.classList.toggle('expense-over', bal < 0);
  }
}

renderExpensePlanPanel = function(data) {
  const rows = getExpenseRows();
  const totalRows = rows.length;
  const years = expensePlanYearsFinal();
  const body = rows.map(row => {
    const plan = expensePlanTotalFinal(row);
    const balance = row.controlled ? Number(row.erpAvailable || 0) - plan : null;
    const monthlyActual = expenseActualExpanded ? expenseMonthlyActual(row) : null;
    return `
      <tr id="expense-tr-${row.id}" class="${row.controlled && balance < 0 ? 'expense-over' : ''}">
        <td class="exp-acct">
          <strong>${row.name}</strong>
          <span class="exp-acct-sub">${row.middleName}<i class="expense-control-badge ${row.controlled ? 'control' : 'free'}">${row.controlled ? '통제' : '비통제'}</i></span>
        </td>
        <td class="num">${fmt(row.carried)}</td>
        ${expenseActualExpanded ? monthlyActual.map(v => `<td class="num exp-am-col">${v ? fmt(v) : '-'}</td>`).join('') : ''}
        <td class="num exp-actual-sum">${fmt(row.actual)}</td>
        ${years.map(({ year, idxs }) => `
          <td class="num exp-in-col"><input class="exp-year-input" id="expense-plan-${row.id}-${year}" value="${expenseYearPlan(row, idxs)}" inputmode="numeric" oninput="expenseRecalcRow('${row.id}')"></td>
        `).join('')}
        <td class="num exp-total" id="expense-total-${row.id}">${fmt(plan)}</td>
        <td class="num ${row.controlled && balance < 0 ? 'danger' : ''}" id="expense-bal-${row.id}">${row.controlled ? fmt(Math.max(balance, 0)) : '-'}</td>
      </tr>`;
  }).join('');

  const actualToggleBtn = `<button class="exp-actual-toggle ${expenseActualExpanded ? 'open' : ''}" title="${expenseActualExpanded ? '월별 실적 접기' : '지난 26년 월별 실적 펼치기'}" onclick="toggleExpenseActualCols()">${expenseActualExpanded ? '－' : '＋'}</button>`;
  const actualMonthHeads = expenseActualExpanded
    ? EXPENSE_ACTUAL_MONTHS.map(m => `<th class="num exp-am-col">${expenseActualMonthLabel(m)}</th>`).join('')
    : '';

  return `
    <div class="sifr expense-plan-sifr ${expenseActualExpanded ? 'actual-expanded' : ''}">
      <div class="exp-plan-head">
        <div>
          <h2>경비 자원계획 <span class="exp-plan-cnt">총 ${totalRows}건</span></h2>
          <p>계획은 소계정별로 <strong>연단위</strong>로 작성합니다(연두 칸). 실적 열의 <strong>＋</strong>를 누르면 지난 <strong>26년 1월~7월 월별 실적</strong>이 펼쳐집니다. 통제 중계정은 ERP 매출귀속부서 가용예산 내에서만 수립할 수 있습니다.</p>
        </div>
        <div class="exp-plan-actions">
          <button class="exp-btn" onclick="showExpenseActualLookup()">경비 실적조회</button>
          <button class="exp-btn teal" onclick="showExpenseErpAvailabilityModal()">가용예산조회</button>
          <button class="exp-btn primary" onclick="saveExpensePlan()">계획 저장</button>
        </div>
      </div>
      <div class="exp-table-wrap">
        <table>
          <thead>
            <tr>
              <th>계정</th>
              <th class="num">이전계획</th>
              ${actualMonthHeads}
              <th class="num exp-actual-sumhead">실적${expenseActualExpanded ? ' 합계' : ''} ${actualToggleBtn}</th>
              ${years.map(({ year, idxs }) => `<th class="num exp-in-col">${expenseYearLabel(year, idxs)}</th>`).join('')}
              <th class="num">계획 합계</th>
              <th class="num">가용잔액</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div class="exp-comment">통제 중계정은 매출귀속부서 기준 ERP 가용예산을 초과할 수 없습니다. 계정별 예산 이관에서 경비 조정배분을 변경할 때도 동일한 한도를 체크합니다.</div>
    </div>`;
};
