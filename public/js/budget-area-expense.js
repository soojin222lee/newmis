// AI GUIDE: 수행원가 > 원가조정 > 경비(CATS[3]) 계정 전용 렌더 소스입니다.
// - URL: #/budget-adjust/expense
// - budget-status-4.js에 있던 경비 데이터/그리드/검증/패널/편집기 데코레이터를 이 파일로 이관했습니다.
// - EXPENSE_PLAN_MONTHS는 인건비 OT와 공유하는 데이터라 budget-status.js에 그대로 두고 참조만 합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).

// 경비 계정 편집기 데코레이터 (원래 budget-status-4.js:1211~1225)
var renderBudgetAccountEditorBeforeExpenseSingleFinal = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[3]) return renderBudgetAccountEditorBeforeExpenseSingleFinal(data, account);
  // 편집기 헤드([← 계정 선택] 버튼 + "경비 수정" 제목/설명)는 제거했습니다(5개 계정 공통 정책).
  // 계정 선택으로 돌아가는 경로는 브라우저 뒤로가기(#/budget-adjust)로 유지됩니다.
  return `
    <div class="setup-editor expense-single-editor">
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
  showToast('경비 월별 계획이 저장되었습니다. 통제 중계정의 ERP 가용예산도 확인했습니다.');
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

renderExpensePlanPanel = function(data) {
  const rows = getExpenseRows();
  const totalRows = rows.length;
  const body = rows.map(row => {
    const plan = expensePlanTotalFinal(row);
    const balance = row.controlled ? Number(row.erpAvailable || 0) - plan : null;
    return `
      <tr class="${row.controlled && balance < 0 ? 'expense-over' : ''}">
        <td>${row.middleCode}</td>
        <td>
          <strong>${row.middleName}</strong>
          <i class="expense-control-badge ${row.controlled ? 'control' : 'free'}">${row.controlled ? '통제' : '비통제'}</i>
        </td>
        <td>${row.code}</td>
        <td><strong>${row.name}</strong></td>
        <td class="num">${fmt(row.carried)}</td>
        <td class="num">${fmt(plan)}</td>
        <td class="num">${fmt(row.actual)}</td>
        <td class="num ${row.controlled && balance < 0 ? 'danger' : ''}">${row.controlled ? fmt(Math.max(balance, 0)) : '-'}</td>
        ${EXPENSE_PLAN_MONTHS.map((month, idx) => `
          <td><input class="expense-month-input" id="expense-plan-${row.id}-${idx}" value="${row.monthly[idx] || 0}" inputmode="numeric"></td>
        `).join('')}
      </tr>`;
  }).join('');

  return `
    <div class="expense-plan-panel">
      <div class="expense-plan-head">
        <div>
          <div class="expense-plan-title">경비 자원계획 <span>총 ${totalRows}건</span></div>
          <p>경비 구분은 중계정명으로 관리하고, 전체 계획은 소계정별 월별 금액으로 작성합니다. 통제 중계정은 ERP에 해당 프로젝트의 매출귀속부서 가용예산이 있어야만 계획 수립이 가능합니다.</p>
        </div>
        <div class="expense-plan-actions">
          <button class="labor-sub-btn" onclick="showExpenseActualLookup()">경비 실적조회</button>
          <button class="labor-sub-btn teal" onclick="showExpenseErpAvailabilityModal()">가용예산조회</button>
          <button class="labor-main-btn" onclick="saveExpensePlan()">계획 저장</button>
        </div>
      </div>
      <div class="expense-plan-comment">
        통제 중계정은 매출귀속부서 기준 ERP 가용예산을 초과할 수 없습니다. 계정별 예산 이관에서 경비 조정배분을 변경할 때도 동일한 한도를 체크합니다.
      </div>
      <div class="expense-grid-wrap">
        <table class="expense-grid-table expense-grid-table-final">
          <thead>
            <tr>
              <th rowspan="2">중계정코드</th>
              <th rowspan="2">중계정명/통제</th>
              <th rowspan="2">소계정코드</th>
              <th rowspan="2">소계정명</th>
              <th rowspan="2">이전계획</th>
              <th rowspan="2">계획</th>
              <th rowspan="2">실적</th>
              <th rowspan="2">가용잔액</th>
              <th colspan="${EXPENSE_PLAN_MONTHS.length}">월별 계획</th>
            </tr>
            <tr>${EXPENSE_PLAN_MONTHS.map(m => `<th>${m}</th>`).join('')}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
};
