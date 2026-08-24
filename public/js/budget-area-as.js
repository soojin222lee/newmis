// AI GUIDE: 수행원가 > 원가조정 > A/S비(A/S Cost) 계정 전용 렌더 소스입니다.
// - URL: #/budget-adjust/as
// - budget-status-4.js에 흩어져 있던 A/S 데이터/패널/데코레이터를 이 파일로 이관했습니다.
// - 데코레이터(계정편집기/월별표/집행계획/상세행)는 "자기 계정(CATS[4])만 처리하고 나머지는 이전 정의로 위임"하는
//   체인 패턴이라, 반드시 budget-status-*.js 전부 뒤에 로드되어야 최종 버전을 감싸며 동작합니다.

var asCostRows = {
  labor: [
    { role:'프로젝트 관리', grade:'P10', unitPrice:18871496, mm:1.454, laborAmount:24282439, indirectAmount:3156715 },
  ],
  outsourcePeople: [
    { role:'사업관리/ILS', contractStatus:'미확정', vendor:'기타거래처(예약정거래처)', grade:'고급-상', unitPrice:7440000, mm:1.5 },
  ],
  outsourceMa: [],
  material: [
    { major:'기타', middle:'기타', minor:'기타', expectedDate:'2027-12-07', amount:2304000 },
  ],
  expense: [
    { account:'의욕관리비', amount:515197 },
    { account:'회의비', amount:300000 },
    { account:'잡비', amount:200000 },
    { account:'석식대', amount:500000 },
    { account:'국내출장비', amount:3000000 },
    { account:'중앙장비', amount:1500000 },
    { account:'자가차량지원비', amount:2000000 },
  ],
};

function ensureAsCostPlanAmount(data) {
  if (!data || !data.plan) return;
  if (!data.plan[CATS[4]]) data.plan[CATS[4]] = 48918351;
}

Object.values(BUDGET_SOURCE || {}).forEach(ensureAsCostPlanAmount);

function asNumber(value) {
  return Number(String(value || '').replace(/,/g, '')) || 0;
}

function sumAsCostRows(kind) {
  if (kind === 'labor') {
    return asCostRows.labor.reduce((sum, row) => sum + asNumber(row.laborAmount) + asNumber(row.indirectAmount), 0);
  }
  if (kind === 'outsourcePeople') {
    return asCostRows.outsourcePeople.reduce((sum, row) => sum + Math.round(asNumber(row.unitPrice) * asNumber(row.mm)), 0);
  }
  if (kind === 'outsourceMa') {
    return asCostRows.outsourceMa.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }
  if (kind === 'material') {
    return asCostRows.material.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }
  if (kind === 'expense') {
    return asCostRows.expense.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }
  return 0;
}

function getAsCostTotal() {
  return sumAsCostRows('labor') + sumAsCostRows('outsourcePeople') + sumAsCostRows('outsourceMa') + sumAsCostRows('material') + sumAsCostRows('expense');
}

function updateAsCostInput(kind, idx, field, value) {
  if (!asCostRows[kind] || !asCostRows[kind][idx]) return;
  asCostRows[kind][idx][field] = value;
}

function addAsCostRow(kind) {
  const templates = {
    labor: { role:'', grade:'', unitPrice:0, mm:0, laborAmount:0, indirectAmount:0 },
    outsourcePeople: { role:'', contractStatus:'미확정', vendor:'', grade:'', unitPrice:0, mm:0 },
    outsourceMa: { major:'', middle:'', minor:'', expectedDate:'', amount:0 },
    material: { major:'', middle:'', minor:'', expectedDate:'', amount:0 },
    expense: { account:'', amount:0 },
  };
  asCostRows[kind].push({ ...templates[kind] });
  renderBudgetPage();
}

function removeAsCostRow(kind, idx) {
  if (!asCostRows[kind] || asCostRows[kind].length <= 0) return;
  asCostRows[kind].splice(idx, 1);
  renderBudgetPage();
}

function saveAsCostPlan() {
  const data = BUDGET_SOURCE[currentBudgetProj];
  ensureAsCostPlanAmount(data);
  data.plan[CATS[4]] = getAsCostTotal();
  showToast('A/S비 계획이 저장되었습니다.');
  renderBudgetPage();
}

function renderAsInput(value, attrs = '') {
  return `<input class="as-cost-input" value="${value ?? ''}" ${attrs}>`;
}

function renderAsCostTable(title, count, columns, rows, total, addAction) {
  return `
    <div class="as-cost-section">
      <div class="as-cost-section-head">
        <strong>${title} <span>총 ${count}건</span></strong>
        <button class="labor-sub-btn" onclick="${addAction}">항목 추가</button>
      </div>
      <div class="as-cost-scroll">
        <table class="as-cost-table">
          <thead><tr>${columns.map(col => `<th>${col}</th>`).join('')}<th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="${columns.length + 1}" class="as-cost-empty">등록된 데이터가 없습니다.</td></tr>`}
            <tr class="total"><td colspan="${Math.max(columns.length - 1, 1)}">합계</td><td class="num">${fmt(total)}</td><td></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderAsCostPanel(data) {
  ensureAsCostPlanAmount(data);
  const laborRows = asCostRows.labor.map((row, idx) => {
    const amount = asNumber(row.laborAmount) + asNumber(row.indirectAmount);
    return `<tr>
      <td>${idx + 1}</td>
      <td>${renderAsInput(row.role, `oninput="updateAsCostInput('labor',${idx},'role',this.value)"`)}</td>
      <td>${renderAsInput(row.grade, `oninput="updateAsCostInput('labor',${idx},'grade',this.value)"`)}</td>
      <td>${renderAsInput(row.unitPrice, `inputmode="numeric" oninput="updateAsCostInput('labor',${idx},'unitPrice',this.value)"`)}</td>
      <td>${renderAsInput(row.mm, `inputmode="decimal" oninput="updateAsCostInput('labor',${idx},'mm',this.value)"`)}</td>
      <td>${renderAsInput(row.laborAmount, `inputmode="numeric" oninput="updateAsCostInput('labor',${idx},'laborAmount',this.value)"`)}</td>
      <td>${renderAsInput(row.indirectAmount, `inputmode="numeric" oninput="updateAsCostInput('labor',${idx},'indirectAmount',this.value)"`)}</td>
      <td class="num">${fmt(amount)}</td>
      <td><button class="labor-sub-btn" onclick="removeAsCostRow('labor',${idx})">삭제</button></td>
    </tr>`;
  }).join('');

  const outsourceRows = asCostRows.outsourcePeople.map((row, idx) => {
    const amount = Math.round(asNumber(row.unitPrice) * asNumber(row.mm));
    return `<tr>
      <td>${idx + 1}</td>
      <td>${renderAsInput(row.role, `oninput="updateAsCostInput('outsourcePeople',${idx},'role',this.value)"`)}</td>
      <td>${renderAsInput(row.contractStatus, `oninput="updateAsCostInput('outsourcePeople',${idx},'contractStatus',this.value)"`)}</td>
      <td>${renderAsInput(row.vendor, `oninput="updateAsCostInput('outsourcePeople',${idx},'vendor',this.value)"`)}</td>
      <td>${renderAsInput(row.grade, `oninput="updateAsCostInput('outsourcePeople',${idx},'grade',this.value)"`)}</td>
      <td>${renderAsInput(row.unitPrice, `inputmode="numeric" oninput="updateAsCostInput('outsourcePeople',${idx},'unitPrice',this.value)"`)}</td>
      <td>${renderAsInput(row.mm, `inputmode="decimal" oninput="updateAsCostInput('outsourcePeople',${idx},'mm',this.value)"`)}</td>
      <td class="num">${fmt(amount)}</td>
      <td><button class="labor-sub-btn" onclick="removeAsCostRow('outsourcePeople',${idx})">삭제</button></td>
    </tr>`;
  }).join('');

  const outsourceMaRows = asCostRows.outsourceMa.map((row, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${renderAsInput(row.major, `oninput="updateAsCostInput('outsourceMa',${idx},'major',this.value)"`)}</td>
      <td>${renderAsInput(row.middle, `oninput="updateAsCostInput('outsourceMa',${idx},'middle',this.value)"`)}</td>
      <td>${renderAsInput(row.minor, `oninput="updateAsCostInput('outsourceMa',${idx},'minor',this.value)"`)}</td>
      <td>${renderAsInput(row.expectedDate, `type="date" oninput="updateAsCostInput('outsourceMa',${idx},'expectedDate',this.value)"`)}</td>
      <td>${renderAsInput(row.amount, `inputmode="numeric" oninput="updateAsCostInput('outsourceMa',${idx},'amount',this.value)"`)}</td>
      <td><button class="labor-sub-btn" onclick="removeAsCostRow('outsourceMa',${idx})">삭제</button></td>
    </tr>`).join('');

  const materialRows = asCostRows.material.map((row, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${renderAsInput(row.major, `oninput="updateAsCostInput('material',${idx},'major',this.value)"`)}</td>
      <td>${renderAsInput(row.middle, `oninput="updateAsCostInput('material',${idx},'middle',this.value)"`)}</td>
      <td>${renderAsInput(row.minor, `oninput="updateAsCostInput('material',${idx},'minor',this.value)"`)}</td>
      <td>${renderAsInput(row.expectedDate, `type="date" oninput="updateAsCostInput('material',${idx},'expectedDate',this.value)"`)}</td>
      <td>${renderAsInput(row.amount, `inputmode="numeric" oninput="updateAsCostInput('material',${idx},'amount',this.value)"`)}</td>
      <td><button class="labor-sub-btn" onclick="removeAsCostRow('material',${idx})">삭제</button></td>
    </tr>`).join('');

  const expenseRows = asCostRows.expense.map((row, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${renderAsInput(row.account, `oninput="updateAsCostInput('expense',${idx},'account',this.value)"`)}</td>
      <td>${renderAsInput(row.amount, `inputmode="numeric" oninput="updateAsCostInput('expense',${idx},'amount',this.value)"`)}</td>
      <td><button class="labor-sub-btn" onclick="removeAsCostRow('expense',${idx})">삭제</button></td>
    </tr>`).join('');

  return `
    <div class="as-cost-panel">
      <div class="as-cost-summary">
        <div><span>A/S 인건비</span><strong>${fmt(sumAsCostRows('labor'))}원</strong></div>
        <div><span>A/S 외주비</span><strong>${fmt(sumAsCostRows('outsourcePeople') + sumAsCostRows('outsourceMa'))}원</strong></div>
        <div><span>A/S 재료비</span><strong>${fmt(sumAsCostRows('material'))}원</strong></div>
        <div><span>A/S 경비</span><strong>${fmt(sumAsCostRows('expense'))}원</strong></div>
        <div class="total"><span>A/S비 합계</span><strong>${fmt(getAsCostTotal())}원</strong></div>
      </div>
      <p class="as-cost-guide">A/S 프로젝트에 수립할 인건비, 외주비, 재료비, 경비 계정을 직접 입력합니다. 입력 후 저장하면 A/S비 총액에 반영됩니다.</p>
      ${renderAsCostTable('인건비', asCostRows.labor.length, ['번호','단위업무','직급','단가','투입공수(M/M)','인건비금액','간접비금액','금액'], laborRows, sumAsCostRows('labor'), "addAsCostRow('labor')")}
      ${renderAsCostTable('외주비 (예약 인건비)', asCostRows.outsourcePeople.length, ['번호','단위업무','협력업체 확정여부','협력업체','직급','단가','투입공수(M/M)','금액'], outsourceRows, sumAsCostRows('outsourcePeople'), "addAsCostRow('outsourcePeople')")}
      ${renderAsCostTable('외주비 (공사/MA)', asCostRows.outsourceMa.length, ['번호','대분류','중분류','소분류','예상납기일자','금액'], outsourceMaRows, sumAsCostRows('outsourceMa'), "addAsCostRow('outsourceMa')")}
      ${renderAsCostTable('재료비', asCostRows.material.length, ['번호','대분류','중분류','소분류','예상납기일자','금액'], materialRows, sumAsCostRows('material'), "addAsCostRow('material')")}
      ${renderAsCostTable('경비', asCostRows.expense.length, ['번호','계정','금액'], expenseRows, sumAsCostRows('expense'), "addAsCostRow('expense')")}
      <div class="labor-actions as-cost-actions">
        <button class="labor-main-btn" onclick="saveAsCostPlan()">A/S비 계획 저장</button>
      </div>
    </div>`;
}

// ── A/S 데코레이터: 계정편집기 / 월별표 라벨 (원래 budget-status-4.js:1931~1954) ──
var renderBudgetAccountEditorBeforeAsCost = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  ensureAsCostPlanAmount(data);
  if (account !== CATS[4]) return renderBudgetAccountEditorBeforeAsCost(data, account);
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  // 편집기 헤드([← 계정 선택] 버튼 + "A/S비 수정" 제목/설명)는 제거했습니다(5개 계정 공통 정책).
  // 계정 선택으로 돌아가는 경로는 브라우저 뒤로가기(#/budget-adjust)로 유지됩니다.
  return `
    <div class="setup-editor">
      ${monthly}
      ${renderAsCostPanel(data)}
    </div>`;
};

var renderAccountMonthlyBudgetTableBeforeAsCost = renderAccountMonthlyBudgetTable;
renderAccountMonthlyBudgetTable = function(data, account) {
  const html = renderAccountMonthlyBudgetTableBeforeAsCost(data, account);
  if (account !== CATS[4]) return html;
  // 라벨 치환 + 예산내역 겉박스 제거(5개 계정 공통 정책).
  // .account-monthly-card 는 인건비·재료비도 함께 쓰므로 공유 CSS 대신 인라인 !important 로 자기 계정만 처리합니다.
  return html.replaceAll(CATS[4], 'A/S비')
    .replace('class="account-monthly-card"',
      'class="account-monthly-card" style="border:0 !important;background:transparent !important;padding:0 !important;border-radius:0 !important"')
    .replace('class="account-monthly-table"', 'class="account-monthly-table" style="background:#fff"');
};

// ── A/S 데코레이터: 집행계획 행 / 상세행 (원래 budget-status-4.js:2274~2297) ──
var getExecPlanAccountsBeforeAsCost = getExecPlanAccounts;
getExecPlanAccounts = function(data, actual, quasi) {
  ensureAsCostPlanAmount(data);
  const rows = getExecPlanAccountsBeforeAsCost(data, actual, quasi);
  if (!rows.some(row => row.acct === CATS[4])) {
    const budget = getBudgetAdjusted(data, CATS[4]);
    const used = (actual[CATS[4]] || 0) + (quasi[CATS[4]] || 0);
    rows.push({ key:'asCost', acct:CATS[4], desc:'A/S 프로젝트 인건비, 외주비, 재료비, 경비', edit:CATS[4], budget, used, remain:Math.max(budget - used, 0), months:data.months.filter(m => m[CATS[4]]).length, rate:budget ? Math.round(used / budget * 100) : 0 });
  }
  return rows;
};

var getAccountDetailRowsBeforeAsCost = getAccountDetailRows;
getAccountDetailRows = function(account) {
  if (account === CATS[4]) {
    return [
      { name:'A/S 인건비', ratio:.56 },
      { name:'A/S 외주비', ratio:.23 },
      { name:'A/S 재료비', ratio:.05 },
      { name:'A/S 경비', ratio:.16 },
    ];
  }
  return getAccountDetailRowsBeforeAsCost(account);
};
