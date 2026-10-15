// 업무 프로세스 맵 — 좌측 레일 '업무 프로세스' 버튼에서 연다.
// 전체 프로세스 중 "예산관리 시스템에서 처리하는 단계"만 노출하고,
// 각 노드를 누르면 그 업무를 하는 화면으로 이동한다.

// 단계 정의 — label(노드명) + nav(이동 함수). nav 없는 노드는 설명용(비클릭).
var PROCESS_MAP_PHASES = [
  {
    key: 'reg', title: '① 프로젝트 개설·등록', sub: '개설 신청 · 승인 · 통합 조회',
    nodes: [
      { label: '프로젝트 개설 관리', nav: 'showProjectOpen', desc: 'W/G·사내 개설 신청→승인→등록' },
      { label: '프로젝트 현황', nav: 'showProjectStatus', desc: '수주형·제안·투자·선투입 자동연계 + 전 유형 통합 조회' },
    ],
    tutorials: [
      { name: '수주형 프로젝트 등록', file: 'tutorial-si.html', dl: 'AiBudget-튜토리얼-수주형등록.html' },
      { name: 'WG · 사내 개설', file: 'tutorial-wg.html', dl: 'AiBudget-튜토리얼-WG사내개설.html' },
    ],
  },
  {
    key: 'bgt', title: '② 실행예산 수립', sub: '편성 · 상신 · 승인',
    nodes: [
      { label: '예산 편성', nav: 'showCostAdjust', desc: '인건·외주·재료·경비·A/S 편성' },
      { label: '실행예산 승인(상신)', nav: 'showCostAdjust', desc: 'CP총액 검증 후 결재 상신' },
    ],
    tutorials: [
      { name: '인건비 계획 수립', file: 'tutorial-labor.html', dl: 'AiBudget-튜토리얼-인건비.html' },
      { name: '외주비 계획(실투입)', file: 'tutorial-outsource.html', dl: 'AiBudget-튜토리얼-외주비.html' },
      { name: '경비 계획', file: 'tutorial-expense.html', dl: 'AiBudget-튜토리얼-경비.html' },
      { name: '재료비 계획', file: 'tutorial-material.html', dl: 'AiBudget-튜토리얼-재료비.html' },
      { name: '실행예산 버전 관리', file: 'tutorial-version.html', dl: 'AiBudget-튜토리얼-실행예산버전.html' },
    ],
  },
  {
    key: 'act', title: '③ 수행 실적 · 마감', sub: '집행 · 마감 · 종료',
    nodes: [
      { label: '실적 현황', nav: 'showCostStatus', desc: '실투입·검수 실적 집행 현황' },
      { label: '변경 이력', nav: 'showCostHistory', desc: '버전별 변경 이력' },
      { label: '프로젝트 종료', nav: 'showProjectClose', desc: '기간+30일 자동 배치 종료·사후점검' },
    ],
    tutorials: [
      { name: '프로젝트 종료 (자동 종료)', file: 'tutorial-close.html', dl: 'AiBudget-튜토리얼-프로젝트종료.html' },
    ],
  },
];

function procmapInjectStyle() {
  if (document.getElementById('procmap-style')) return;
  var st = document.createElement('style'); st.id = 'procmap-style';
  st.textContent = `
   .procmap-ov{position:fixed;inset:0;z-index:200;background:rgba(11,18,32,.45);display:flex;align-items:center;justify-content:center;padding:24px}
   .procmap-modal{background:#fff;border-radius:16px;max-width:1040px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 24px 60px -20px rgba(11,18,32,.5);font-family:'Noto Sans KR','Malgun Gothic',sans-serif}
   .procmap-head{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #eef2ff;position:sticky;top:0;background:#fff;z-index:1}
   .procmap-head strong{font-size:16px;font-weight:900;color:#0f172a}
   .procmap-head span{font-size:12px;color:#6b7280;flex:1}
   .procmap-x{border:0;background:#f1f5f9;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;color:#475569}
   .procmap-flow{display:flex;gap:10px;align-items:stretch;padding:20px;flex-wrap:nowrap;overflow-x:auto}
   .procmap-phase{flex:1;min-width:220px;background:#f8faff;border:1px solid #e5e7eb;border-radius:14px;padding:14px}
   .procmap-phase.reg{background:#fff5f5;border-color:#fed7d7}
   .procmap-phase.bgt{background:#fffaf0;border-color:#feebc8}
   .procmap-phase.act{background:#f0fff4;border-color:#c6f6d5}
   .procmap-ptitle{font-size:14px;font-weight:900;color:#0f172a}
   .procmap-psub{font-size:11px;color:#6b7280;margin:2px 0 12px}
   .procmap-nodes{display:flex;flex-direction:column;gap:8px}
   .procmap-phase.reg .procmap-nodes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
   .procmap-node{display:flex;flex-direction:column;gap:3px;text-align:left;border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:9px 11px;cursor:pointer;font-family:inherit;transition:border-color .12s,transform .08s}
   .procmap-node:hover{border-color:#1d4ed8;transform:translateY(-1px);box-shadow:0 4px 12px -8px rgba(29,78,216,.5)}
   .procmap-node b{font-size:12.5px;font-weight:800;color:#0f172a}
   .procmap-node em{font-size:10.5px;color:#6b7280;font-style:normal;line-height:1.35}
   .procmap-arrow{align-self:center;color:#cbd5e1;font-size:22px;font-weight:900;flex:0 0 auto}
   .procmap-tuts{margin-top:12px;padding-top:11px;border-top:1px dashed #e5e7eb}
   .procmap-tuts-t{font-size:11px;font-weight:900;color:#1d4ed8;margin-bottom:7px;letter-spacing:.2px}
   .procmap-tut{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d1d5db;border-radius:9px;padding:6px 7px 6px 10px;margin-bottom:6px}
   .procmap-tut>b{flex:1;font-size:11.5px;font-weight:800;color:#0f172a;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
   .procmap-tut a{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:800;text-decoration:none;border-radius:7px;padding:4px 8px;white-space:nowrap}
   .procmap-tut .run{background:#1d4ed8;color:#fff}
   .procmap-tut .run:hover{background:#1742a8}
   .procmap-tut .dl{background:#eef2ff;color:#1d4ed8;border:1px solid #c7d2fe}
   .procmap-tut .dl:hover{background:#dde6ff}
   .procmap-foot{padding:10px 20px 18px;font-size:11.5px;color:#9ca3af}
   @media(max-width:760px){.procmap-flow{flex-wrap:wrap}.procmap-arrow{display:none}.procmap-phase{min-width:100%}}
  `;
  document.head.appendChild(st);
}

function procNav(fn) {
  closeProcessMap();
  if (typeof window[fn] === 'function') window[fn]();
  else if (typeof showToast === 'function') showToast('해당 화면으로 이동합니다. (' + fn + ')');
}

function renderProcMapNode(n) {
  var desc = n.desc ? '<em>' + n.desc + '</em>' : '';
  return '<button class="procmap-node" onclick="procNav(\'' + n.nav + '\')" title="' + n.label + ' 화면으로 이동">'
    + '<b>' + n.label + '</b>' + desc + '</button>';
}

function renderProcMapTuts(p) {
  if (!p.tutorials || !p.tutorials.length) return '';
  var rows = p.tutorials.map(function (t) {
    return '<div class="procmap-tut"><b>' + t.name + '</b>'
      + '<a class="run" href="/tutorials/' + t.file + '" target="_blank" rel="noopener" title="새 탭에서 체험">▶ 체험</a>'
      + '<a class="dl" href="/tutorials/' + t.file + '" download="' + t.dl + '" title="HTML 파일 다운로드">⬇ 다운로드</a></div>';
  }).join('');
  return '<div class="procmap-tuts"><div class="procmap-tuts-t">📘 인터랙티브 튜토리얼</div>' + rows + '</div>';
}

function openProcessMap() {
  procmapInjectStyle();
  var ov = document.getElementById('procmap-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'procmap-ov'; document.body.appendChild(ov); }
  ov.className = 'procmap-ov';
  var phases = PROCESS_MAP_PHASES.map(function (p, i) {
    var arrow = i < PROCESS_MAP_PHASES.length - 1 ? '<div class="procmap-arrow">›</div>' : '';
    return '<div class="procmap-phase ' + p.key + '">'
      + '<div class="procmap-ptitle">' + p.title + '</div>'
      + '<div class="procmap-psub">' + p.sub + '</div>'
      + '<div class="procmap-nodes">' + p.nodes.map(renderProcMapNode).join('') + '</div>'
      + renderProcMapTuts(p)
      + '</div>' + arrow;
  }).join('');
  ov.innerHTML = '<div class="procmap-modal" role="dialog" aria-modal="true" aria-label="업무 프로세스 맵">'
    + '<div class="procmap-head"><strong>🗺 업무 프로세스</strong>'
    + '<span>예산관리 시스템에서 처리하는 단계 · 누르면 해당 화면으로 이동</span>'
    + '<button class="procmap-x" onclick="closeProcessMap()" aria-label="닫기">✕</button></div>'
    + '<div class="procmap-flow">' + phases + '</div>'
    + '<div class="procmap-foot">※ 영업·계약(CRM)·ERP·구매·회계 등 연계 시스템 단계는 제외하고, 예산관리 화면이 있는 단계만 표시합니다.</div>'
    + '</div>';
  ov.onclick = function (e) { if (e.target === ov) closeProcessMap(); };
  document.addEventListener('keydown', procmapEsc);
}
function closeProcessMap() {
  var ov = document.getElementById('procmap-ov');
  if (ov) ov.remove();
  document.removeEventListener('keydown', procmapEsc);
}
function procmapEsc(e) { if (e.key === 'Escape') closeProcessMap(); }
