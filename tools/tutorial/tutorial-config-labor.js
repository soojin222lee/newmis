/* 인건비 계획 수립 — 설정 (TutovEngine 사용)
   원가조정 › 인건비 상세 시트(실투입/이관/OT) 위에 오버레이. */
(function () {
  function ensureSheet(kind) {
    if (!document.querySelector('.aglb-tabs')) {
      location.hash = '#/budget-adjust/labor?pj=budgetMock';
      setTimeout(function () {
        try { agentAiSheetOpenFinal('인건비'); } catch (e) {}
        setTimeout(function () { try { agentLabKindSetFinal(kind); } catch (e) {} }, 280);
      }, 480);
    } else {
      try { agentLabKindSetFinal(kind); } catch (e) {}
    }
  }
  const tabs = () => document.querySelector('.aglb-tabs');
  const table = () => document.querySelector('.aglb-wrap');
  const otBtn = () => [...document.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '').indexOf("agentLabEditOpenFinal('ot'") > -1);

  TutovEngine({
    ready: () => typeof window.agentAiSheetOpenFinal === 'function' && typeof window.agentLabKindSetFinal === 'function',
    hud: '실행예산 <em>인건비</em> · 계획 수립 가이드',
    steps: [
      { ensure: () => ensureSheet('direct'), wait: 1000,
        target: () => tabs(), pos: 'bottom', title: '인건비는 상세 3종',
        text: '인건비는 <b>① 실투입 · ② 이관 · ③ OT</b> 세 가지로 나뉩니다. 하나씩 살펴볼게요.', mode: 'next' },
      { ensure: () => ensureSheet('direct'), wait: 420,
        target: () => table(), pos: 'top', title: '① 실투입 — SCM 인력 기반',
        text: '<b>SCM</b>에서 티밍·확정된 인력 리스트를 <b>조회→선택→저장</b>하면 그 사람의 <b>투입 계획</b>이 세워집니다. 월별 <b>MM(공수)</b>와 <b>P등급 단가</b>로 금액이 산정돼 최종 인건비 예산이 됩니다.', mode: 'next' },
      { ensure: () => ensureSheet('transfer'), wait: 420,
        target: () => table(), pos: 'top', title: '② 이관 인건비 — 프로젝트 간 전표',
        text: '다른 프로젝트와 인건비를 <b>주고받는 전표</b> 처리입니다. 받는 쪽은 “실적을 받을 것”이라고 <b>어느 프로젝트에서·왜 받는지</b>를 적어 계획을 세웁니다.', mode: 'next' },
      { ensure: () => ensureSheet('ot'), wait: 420,
        target: () => otBtn(), pos: 'top', title: '③ OT비 — PM이 미래월 입력',
        text: 'OT(초과근무)비는 <b>PM이 직접</b> 입력합니다. 프로젝트 <b>WBS</b>를 보고 야근이 몰릴 것 같은 <b>미래월</b>에 <b>[＋ OT비 등록]</b>으로 예산 계획을 잡아둬요.', mode: 'next' },
      { ensure: () => ensureSheet('direct'), wait: 420,
        target: () => table(), pos: 'top', title: '실투입 수정 제약 · 소급',
        text: '이미 <b>실적이 발생한 부분은 수정 불가</b>입니다. SCM에서 과거 인력계획이 <b>소급 수정</b>되어 넘어오면, 먼저 <b class="lock">과거 전표를 취소</b>해야 다시 투입할 수 있어요. <span class="tbd">※ 소급·취소는 SCM과 추가 협의 필요(미확정)</span>', mode: 'done' },
    ],
    intro: { html:
      '<div class="intro-ic">👥</div>' +
      '<div class="eb" style="text-align:center">실행예산 · 인건비</div>' +
      '<h2 style="text-align:center">인건비 계획 수립</h2>' +
      '<p>SCM이 확정한 인력으로 <b>투입 계획</b>을 세우고, 월별 MM·P등급으로 인건비가 산정되는 과정을 실제 화면에서 짚어봅니다. 실투입·이관·OT와 소급 제약까지 다룹니다.</p>' },
    done: { html:
      '<div style="text-align:center"><div class="chk">✓</div><div class="eb">실행예산 · 인건비</div><h2>SCM 인력 기반 투입계획</h2></div>' +
      '<div class="vlife" style="margin-top:16px">' +
        '<div class="s" style="background:#eaf1fd;border-color:#bcd3f7"><b>SCM 확정 인력</b><span>조회·선택·저장</span></div>' +
        '<div class="ar">→</div>' +
        '<div class="s save"><b>투입 계획</b><span>월별 MM</span></div>' +
        '<div class="ar">→</div>' +
        '<div class="s fix"><b>인건비 산정</b><span>P등급 단가 × MM</span></div>' +
      '</div>' +
      '<p style="margin-top:14px;font-weight:800;color:#16151f">상세 3종</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<span style="font-size:12px;font-weight:800;color:#1746a0;background:#eaf1fd;border:1px solid #bcd3f7;border-radius:999px;padding:5px 11px">실투입 (SCM 인력)</span>' +
        '<span style="font-size:12px;font-weight:800;color:#1746a0;background:#eaf1fd;border:1px solid #bcd3f7;border-radius:999px;padding:5px 11px">이관 (프로젝트 간 전표)</span>' +
        '<span style="font-size:12px;font-weight:800;color:#1746a0;background:#eaf1fd;border:1px solid #bcd3f7;border-radius:999px;padding:5px 11px">OT (PM 미래월 입력)</span>' +
      '</div>' +
      '<p style="margin-top:14px;font-size:13px;line-height:1.6;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:11px 13px;color:#7c4a12">' +
        '⚠ <b>실투입 수정 제약</b> — 실적 발생분은 수정 불가. SCM <b>소급 수정</b> 시 <b>과거 전표 취소 후</b> 재투입. <b>(소급·취소는 SCM과 협의 필요 · 추후 확정)</b></p>' },
  });
})();
