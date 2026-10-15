/* WG / 사내 프로젝트 개설 — 설정 (TutovEngine 사용) */
(function () {
  const row = id => { const l = document.querySelector('.popen-link[onclick*="' + id + '"]'); return l ? l.closest('tr') : null; };
  function fillForm() {
    const setv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
    setv('popen-f-type', 'W/G');
    setv('popen-f-name', '2026년_차세대 ERP 고도화 W/G');
    setv('popen-f-dept', 'AX ERP사업부 1팀');
    setv('popen-f-period', '2026-11-01 ~ 2027-10-31');
    setv('popen-f-overview', '차세대 ERP 전환 대비 W/G 선행 과제 수행');
  }
  const onNew = () => (typeof popenView !== 'undefined' && popenView === 'new');

  TutovEngine({
    ready: () => typeof window.showProjectOpen === 'function',
    hud: 'Chapter <em>01</em> · 프로젝트 등록 및 개설 <i>— WG / 사내</i>',
    steps: [
      { ensure: () => showProjectOpen(),
        target: () => document.querySelector('[onclick="popenNewApply()"]'), pos: 'left', title: 'WG·사내는 개설 신청부터',
        text: 'WG·사내는 선행 연계가 없어 <b>직접 개설 신청</b>을 해야 합니다. <b>[+ 신규 개설 신청]</b>을 눌러 신청서를 엽니다.', mode: 'realclick' },
      { ensure: () => { if (!onNew()) popenNewApply(); setTimeout(fillForm, 120); }, wait: 300,
        target: () => document.getElementById('popen-f-name'), pos: 'right', title: '필수 항목 입력',
        text: '유형(W/G)·프로젝트명·신청부서·수행기간을 입력합니다. <b>예시 데이터가 입력</b>돼 있어요. <b>프로젝트 번호</b>는 <span class="tbd">승인 후 부여(추후 확정)</span>됩니다.', mode: 'next' },
      { ensure: () => { if (!onNew()) { popenNewApply(); setTimeout(fillForm, 120); } }, wait: 160,
        target: () => document.querySelector('[onclick="popenSubmitNew()"]'), pos: 'top', title: '기안 상신',
        text: '입력을 마치면 <b>[개설 신청 등록]</b>으로 기안을 상신합니다.', mode: 'realclick' },
      { ensure: () => showProjectOpen(), wait: 280,
        target: () => row('OPN-002') && row('OPN-002').children[4], pos: 'bottom', title: '① 개설 신청 접수',
        text: '기안이 올라가면 <b>‘개설 신청’</b> 상태로 접수됩니다. (목록의 승인 상태로 진행 단계를 확인)', mode: 'next' },
      { ensure: () => popenOpenDetail('OPN-001'), wait: 300,
        target: () => document.querySelector('.screen.active .popen-steps'), pos: 'bottom', title: '② 기안·승인 절차',
        text: '결재선은 <b>기안 → 협조 → 검토 → 승인</b> 순으로 진행됩니다. 지금은 <b>개설 승인 대기</b> 상태예요. <span class="tbd">세부 결재 단계는 예시</span>', mode: 'next' },
      { ensure: () => showProjectOpen(), wait: 280,
        target: () => row('OPN-005') && row('OPN-005').children[5], pos: 'bottom', title: '③ 승인 완료 → 등록 완료',
        text: '승인이 완료되면 프로젝트가 <b>정식 등록</b>되고 번호가 부여됩니다(등록경로 <b>‘개설 승인’</b>). 이제 현황·예산 수립이 열립니다.', mode: 'done' },
    ],
    intro: { html:
      '<div class="intro-ic">🗂️</div>' +
      '<div class="eb" style="text-align:center">Chapter 01 · 프로젝트 등록 및 개설</div>' +
      '<h2 style="text-align:center">WG / 사내 프로젝트 개설</h2>' +
      '<p>WG·사내 프로젝트가 <b>개설 신청 → 기안·승인 → 등록</b> 절차를 거치는 과정을 실제 화면에서 직접 따라가 봅니다. 강조된 파란 영역을 누르면 다음 단계로 진행돼요.</p>' },
    done: { html:
      '<div style="text-align:center"><div class="chk">✓</div><div class="eb">Chapter 01 완료</div><h2>WG / 사내 개설 흐름 끝!</h2></div>' +
      '<p style="text-align:left">WG·사내는 <b>개설 신청 → 기안·승인 → 등록</b> 절차를 거칩니다. <b>승인 완료 후에만</b> 프로젝트가 정식 등록되고(번호 부여), 비로소 <b>현황·예산 수립</b>이 열립니다.<br><br>👉 수주형이 ‘선행 자동연계’로 바로 등록되는 것과 달리, WG·사내는 <b>승인 단계</b>가 핵심입니다.</p>' },
  });
})();
