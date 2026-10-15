/* 실행예산 '버전' 개념 가이드 — 설정 (TutovEngine 사용) */
(function () {
  const pill = v => [...document.querySelectorAll('.setup-version-pill')].find(p => (p.getAttribute('onclick') || '').indexOf(v) > -1);
  const stepTab = stage => [...document.querySelectorAll('.bfs-step')].find(s => (s.getAttribute('onclick') || '').indexOf("'" + stage + "'") > -1);
  const newVerBtn = () => [...document.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '') === 'createBudgetVersionFinal()');

  TutovEngine({
    ready: () => typeof window.openBudgetProjectScreen === 'function',
    hud: '실행예산 <em>버전 관리</em> · 개념 가이드',
    steps: [
      { ensure: () => openBudgetProjectScreen('budgetMock'), wait: 450,
        target: () => pill('v1.0'), pos: 'right', title: '최초 버전은 v1',
        text: '모든 실행예산은 <b>버전</b>으로 관리됩니다. 처음 수립한 예산이 <b>버전 1(v1.0)</b>이에요.', mode: 'next' },
      { target: () => pill('v3.0'), pos: 'right', title: '확정 버전 = 수정 불가',
        text: '<b>확정</b>된 버전은 <b class="lock">수정할 수 없습니다</b>. 그 시점의 예산을 그대로 박제한 <b>스냅샷(읽기 전용)</b>이에요.', mode: 'next' },
      { target: () => newVerBtn(), pos: 'left', title: '수정하려면 버전 업',
        text: '확정본은 못 고치니, 바꾸려면 <b>[＋ 신규 버전 생성]</b>으로 <b>새 버전</b>을 올려야 합니다. 이전 버전은 그대로 보존돼요.', mode: 'next' },
      { target: () => pill('v4.0'), pos: 'right', title: '작성중(저장) = 수시 수정',
        text: '새로 만든 최신 버전은 <b class="ok">작성중(저장)</b> 상태입니다. 이 상태에서는 <b>언제든 데이터를 수정</b>할 수 있어요.', mode: 'next' },
      { target: () => stepTab('edit'), pos: 'bottom', title: '계정별 작성 — 과거는 실적, 미래는 계획',
        text: '‘계정별 작성’에서 금액을 입력합니다. <b>과거월은 실적(=계획 확정)</b>, <b>미래월은 계획</b>으로 관리돼요.', mode: 'next' },
      { target: () => stepTab('approval'), pos: 'bottom', title: '승인요청 = 잠김',
        text: '작성을 마치고 <b>승인요청(상신)</b>하면 데이터가 <b class="lock">잠겨 더 이상 수정할 수 없습니다</b>. 다시 고치려면 또 <b>새 버전</b>을 올려야 해요.', mode: 'done' },
    ],
    intro: { html:
      '<div class="intro-ic">🗂️</div>' +
      '<div class="eb" style="text-align:center">실행예산 버전 관리</div>' +
      '<h2 style="text-align:center">신규 실행예산 버전, 어떻게 동작하나</h2>' +
      '<p>실행예산이 <b>버전</b>으로 어떻게 관리되는지 — 확정 스냅샷, 버전 업, 수정 가능/잠김 상태, 과거월·미래월 — 실제 화면에서 직접 짚어봅니다.</p>' },
    done: { html:
      '<div style="text-align:center"><div class="chk">✓</div><div class="eb">실행예산 버전 관리</div><h2>버전 라이프사이클 정리</h2></div>' +
      '<div class="vlife">' +
        '<div class="s save"><b>저장(작성중)</b><span>언제든 수정 가능</span></div>' +
        '<div class="ar">→</div>' +
        '<div class="s lock"><b>승인요청</b><span>잠김 · 수정 불가</span></div>' +
        '<div class="ar">→</div>' +
        '<div class="s fix"><b>확정</b><span>스냅샷 · 읽기 전용</span></div>' +
      '</div>' +
      '<p style="margin-top:12px"><b>v1 = 최초</b> · 확정 버전은 못 고치고, 수정하려면 <b>＋ 신규 버전</b>으로 버전을 올립니다.</p>' +
      '<p style="margin-top:16px;font-weight:800;color:#16151f">월별: 과거는 실적, 미래는 계획</p>' +
      '<div class="mstrip">' +
        '<div class="m past"><div class="mm">7월</div>실적</div><div class="m past"><div class="mm">8월</div>실적</div>' +
        '<div class="m past"><div class="mm">9월</div>실적</div><div class="m fut"><div class="mm">10월</div>계획</div>' +
        '<div class="m fut"><div class="mm">11월</div>계획</div><div class="m fut"><div class="mm">12월</div>계획</div>' +
      '</div>' +
      '<div class="mlegend"><i><span class="d" style="background:#c3cbd6"></span>과거월 = 실적(=계획 확정)</i><i><span class="d" style="background:#2f6bed"></span>미래월 = 계획</i></div>' },
  });
})();
