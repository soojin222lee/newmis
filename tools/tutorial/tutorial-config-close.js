/* 프로젝트 종료 (자동 종료) — 설정 (TutovEngine 사용) */
(function () {
  const closeRow = () => document.querySelector('#s-project-close tbody tr');
  const field = i => document.querySelectorAll('.pcd-field')[i];
  const declareBtn = () => [...document.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '').indexOf('pcDeclareClose') > -1);

  TutovEngine({
    ready: () => typeof window.showProjectClose === 'function',
    hud: '프로젝트 <em>종료</em> · 자동 종료 가이드',
    steps: [
      { ensure: () => { var _m = document.querySelector('.ai-chat-modal'); if (typeof openAiChat === 'function' && (!_m || _m.getBoundingClientRect().width < 50)) openAiChat('navi'); }, wait: 600,
        target: () => document.querySelector('[onclick*="askExample"]') || document.querySelector('.ai-chat-modal'),
        pos: 'bottom', title: 'AI 네비게이터로 분기',
        text: '<b>AI 네비게이터</b>에 자연어로 물으면 입력 내용에 따라 원하는 화면으로 <b>분기·안내</b>합니다. (예: “프로젝트 종료 어디서 해?” → 프로젝트 종료)', mode: 'next' },
      { ensure: () => { if (typeof closeAiChat === 'function') closeAiChat(); if (!document.querySelector('#s-project-close tbody tr')) showProjectClose(); }, wait: 340,
        target: () => closeRow() && closeRow().children[3], pos: 'bottom', title: '종료 대상 조회',
        text: '프로젝트 기간이 끝나면 <b>종료 대상</b>이 됩니다. 상태가 <b>종료준비</b>인 건을 눌러 상세를 확인합니다.', mode: 'realclick' },
      { ensure: () => openProjectCloseDetail('credit'), wait: 420,
        target: () => field(0), pos: 'right', title: '종료 조건 ① 구매 검수완료',
        text: '남은 구매·외주 건의 <b>검수가 모두 완료</b>돼야 합니다. 미완료 건이 있으면 종료되지 않아요.', mode: 'next' },
      { target: () => field(1), pos: 'right', title: '종료 조건 ② 산출물 등록',
        text: '<b>산출물(사후점검 결과보고서 등)</b>을 등록해야 합니다. 여기에 <b>프로젝트 평가완료</b>까지 더해져 종료 조건이 됩니다.', mode: 'next' },
      { target: () => declareBtn(), pos: 'top', title: '수동 종료 신청도 가능',
        text: '조건을 충족하면 담당자가 <b>[💾 종료 신청]</b>으로 직접 종료를 선언할 수도 있습니다. 하지만 대부분은 <b>자동</b>으로 종료돼요 →', mode: 'done' },
    ],
    intro: { html:
      '<div class="intro-ic">🏁</div>' +
      '<div class="eb" style="text-align:center">프로젝트 종료</div>' +
      '<h2 style="text-align:center">프로젝트는 대부분 자동으로 종료돼요</h2>' +
      '<p>프로젝트 기간이 끝나고 <b>+30일 후 자동 배치</b>가 종료 조건(검수완료·산출물 등록·프로젝트 평가완료)을 검사해 <b>자동 종료</b>합니다. 실제 종료 화면에서 조건과 흐름을 직접 짚어봅니다.</p>' },
    done: { html:
      '<div style="text-align:center"><div class="chk">✓</div><div class="eb">프로젝트 종료</div><h2>+30일 자동 배치로 종료</h2></div>' +
      '<div class="vlife" style="margin-top:16px">' +
        '<div class="s fix"><b>기간 종료</b><span>프로젝트 종료일</span></div>' +
        '<div class="ar">+30일<br>→</div>' +
        '<div class="s" style="background:#fff7ed;border-color:#fed7aa"><b>자동 배치</b><span>종료 조건 검사</span></div>' +
        '<div class="ar">→</div>' +
        '<div class="s save"><b>✓ 자동 종료</b><span>조건 충족 시</span></div>' +
      '</div>' +
      '<p style="margin-top:14px;font-weight:800;color:#16151f">자동 배치가 검사하는 종료 조건</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<span style="font-size:12px;font-weight:800;color:#166534;background:#eef7f1;border:1px solid #bbe7cc;border-radius:999px;padding:5px 11px">✅ 구매 검수완료</span>' +
        '<span style="font-size:12px;font-weight:800;color:#166534;background:#eef7f1;border:1px solid #bbe7cc;border-radius:999px;padding:5px 11px">✅ 산출물 등록</span>' +
        '<span style="font-size:12px;font-weight:800;color:#166534;background:#eef7f1;border:1px solid #bbe7cc;border-radius:999px;padding:5px 11px">✅ 프로젝트 평가완료</span>' +
      '</div>' +
      '<p style="margin-top:14px">조건을 <b>충족하면 +30일 배치에서 자동 종료</b>됩니다. 미충족이면 종료되지 않고 <b>보류·알림</b>되며, 필요 시 담당자가 <b>수동 종료 신청(선언)</b>도 할 수 있어요.</p>' },
  });
})();
