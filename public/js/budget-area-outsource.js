// AI GUIDE: 수행원가 > 원가조정 > 외주비(CATS[1]) 계정 전용 진입 소스입니다.
// - URL: #/budget-adjust/outsource
// - 외주비 계정 편집기 진입점(데코레이터)과 상세계정 분기(renderBpoOutsourcePanelFinal)를 이 파일이 소유합니다.
// - 상세계정 패널(실투입 renderBpoContractPanelV2 / 외주출장 renderBpoTravelPanelV2 / 공사MA renderBpoMaPanelV2 /
//   이관 renderBpoTransferPanelV2 / 기타 renderBpoOtherPanelV2 / 탭 renderBpoKindTabsV2Final 등)은
//   budget-status-2.js에 있는 공유 코어를 런타임 호출합니다.
// - 반드시 budget-status-*.js 전부 뒤에 로드되어야 합니다(데코레이터 체인 + 활성 override).

// 외주비 계정 편집기 데코레이터: 자기 계정(CATS[1])만 처리하고 나머지는 이전 정의로 위임
var renderBudgetAccountEditorBeforeOutsource = renderBudgetAccountEditor;
renderBudgetAccountEditor = function(data, account) {
  if (account !== CATS[1]) return renderBudgetAccountEditorBeforeOutsource(data, account);
  const monthly = renderAccountMonthlyBudgetTable(data, account);
  return `
    <div class="setup-editor">
      <div class="setup-editor-head">
        <button class="budget-process-back" onclick="closeBudgetAccountEditor()">← 계정 선택</button>
        <div>
          <div class="setup-title">외주비 수정</div>
          <div class="setup-editor-sub">실투입 외주비, 기타외주비, MA를 구분해 계획을 등록합니다.</div>
        </div>
      </div>
      ${monthly}
      ${renderBpoOutsourcePanelFinal(data)}
    </div>`;
};

// 외주비 상세계정 분기(실투입/전문직/출장/공사MA/이관/기타) — 원래 budget-status-2.js:403
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
