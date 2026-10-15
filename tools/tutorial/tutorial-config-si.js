/* 수주형 프로젝트 등록 — 설정 (TutovEngine 사용) */
(function () {
  const siRow = () => { const l = document.querySelector('.psv-link[onclick*="SI-001"]'); return l ? l.closest('tr') : null; };
  TutovEngine({
    ready: () => typeof window.showProjectStatus === 'function',
    hud: 'Chapter <em>01</em> · 프로젝트 등록 및 개설 <i>— 수주형</i>',
    steps: [
      { ensure: () => window.showProjectStatus && showProjectStatus(),
        target: () => siRow() && siRow().children[2], pos: 'bottom', title: '수주형은 자동 등록돼요',
        text: '수주형은 CRM 등 <b>선행 시스템</b>에서 수주가 끝나면 MIS로 <b>자동 연계·등록</b>됩니다. 등록경로가 <b>‘선행 자동연계’</b>인 걸 보세요. MIS에서 개설 신청은 없습니다.', mode: 'next' },
      { ensure: () => window.showProjectStatus && showProjectStatus(),
        target: () => siRow() && siRow().children[7], pos: 'bottom', title: '등록 즉시 예산 수립 가능',
        text: '선행 연계로 등록되면 승인 대기 없이 바로 <b>예산 수립 가능</b> 상태가 됩니다.', mode: 'next' },
      { ensure: () => window.showProjectStatus && showProjectStatus(),
        target: () => siRow() && siRow().querySelector('.psv-link'), pos: 'left', title: '상세를 확인해봅시다',
        text: '프로젝트 <b>[상세 조회]</b>를 눌러 자동 등록된 내용을 확인합니다.', mode: 'realclick' },
      { ensure: () => null, wait: 380,
        target: () => { const a = document.querySelector('.screen.active'); return a && (a.querySelector('[class*="title"]') || a.querySelector('h1,h2')); },
        pos: 'bottom', title: '등록 완료!',
        text: '수주형은 이렇게 <b>개설 신청 없이</b> 등록이 끝납니다. 이후 <b>수행원가 예산 수립</b> 단계로 넘어갑니다.', mode: 'done' },
    ],
    intro: { html:
      '<div class="intro-ic">🤝</div>' +
      '<div class="eb" style="text-align:center">Chapter 01 · 프로젝트 등록 및 개설</div>' +
      '<h2 style="text-align:center">수주형 프로젝트 등록</h2>' +
      '<p>수주형 프로젝트가 <b>어떻게 MIS에 등록되는지</b> 실제 화면을 직접 클릭하며 따라가 봅니다. 강조된 파란 영역을 누르면 다음 단계로 진행돼요.</p>' },
    done: { html:
      '<div style="text-align:center"><div class="chk">✓</div><div class="eb">Chapter 01 완료</div><h2>수주형 등록 흐름 끝!</h2></div>' +
      '<p style="text-align:left">수주형은 <b>CRM 등 선행 시스템에서 완료 → MIS 자동 연계·등록</b>됩니다. 개설 신청·등록 작업이 <b>없고</b>, 등록 즉시 <b>예산 수립</b> 단계로 넘어갑니다.</p>' },
  });
})();
