// 메뉴 보기 — 좌측 레일 '메뉴 보기' 버튼에서 연다.
// 버전2 는 상단 메뉴 바를 쓰지 않으므로, 전체 메뉴를 이 팝업으로 따로 보여 주고 바로 이동한다.

var MENU_PANEL_GROUPS = [
  { title: 'My Work', items: [
    { label: '메인 홈', nav: 'showMain' },
  ] },
  { title: '프로젝트', items: [
    { label: '프로젝트 현황', nav: 'showProjectStatus' },
    { label: '프로젝트 개설 관리', nav: 'showProjectOpen' },
  ] },
  { title: '수행원가', items: [
    { label: '원가 현황', nav: 'showCostStatus' },
    { label: '원가 조정', nav: 'showCostAdjust' },
    { label: '변경 이력', nav: 'showCostHistory' },
  ] },
  { title: '인사이트', items: [
    { label: 'AI 레포트', nav: 'showAiReport' },
    { label: '맞춤 레포트', nav: 'showCustomReport' },
  ] },
];

function menuPanelInjectStyle() {
  if (document.getElementById('menupanel-style')) return;
  var st = document.createElement('style'); st.id = 'menupanel-style';
  st.textContent = `
   .menupanel-ov{position:fixed;inset:0;z-index:200;background:rgba(11,18,32,.45);display:flex;align-items:center;justify-content:center;padding:24px}
   .menupanel-modal{background:#fff;border-radius:16px;max-width:760px;width:100%;max-height:86vh;overflow:auto;box-shadow:0 24px 60px -20px rgba(11,18,32,.5);font-family:'Noto Sans KR','Malgun Gothic',sans-serif}
   .menupanel-head{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #eef2ff;position:sticky;top:0;background:#fff}
   .menupanel-head strong{font-size:16px;font-weight:900;color:#0f172a}
   .menupanel-head span{font-size:12px;color:#6b7280;flex:1}
   .menupanel-x{border:0;background:#f1f5f9;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;color:#475569}
   .menupanel-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px}
   .menupanel-group{background:#f8faff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px}
   .menupanel-gt{font-size:12.5px;font-weight:900;color:#1d4ed8;margin-bottom:8px}
   .menupanel-items{display:flex;flex-direction:column;gap:5px}
   .menupanel-item{display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;background:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:#0f172a}
   .menupanel-item:hover{border-color:#1d4ed8;background:#f0f6ff}
   .menupanel-item i{color:#94a3b8;font-style:normal;margin-left:auto}
   @media(max-width:620px){.menupanel-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
}

function menuNav(fn) {
  closeMenuPanel();
  if (typeof window[fn] === 'function') window[fn]();
  else if (typeof showToast === 'function') showToast('이동: ' + fn);
}

function openMenuPanel() {
  menuPanelInjectStyle();
  var ov = document.getElementById('menupanel-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'menupanel-ov'; document.body.appendChild(ov); }
  ov.className = 'menupanel-ov';
  var groups = MENU_PANEL_GROUPS.map(function (g) {
    var items = g.items.map(function (it) {
      return '<button class="menupanel-item" onclick="menuNav(\'' + it.nav + '\')">' + it.label + '<i>›</i></button>';
    }).join('');
    return '<div class="menupanel-group"><div class="menupanel-gt">' + g.title + '</div>'
      + '<div class="menupanel-items">' + items + '</div></div>';
  }).join('');
  ov.innerHTML = '<div class="menupanel-modal" role="dialog" aria-modal="true" aria-label="메뉴">'
    + '<div class="menupanel-head"><strong>☰ 메뉴</strong>'
    + '<span>원하는 화면을 선택하면 바로 이동합니다</span>'
    + '<button class="menupanel-x" onclick="closeMenuPanel()" aria-label="닫기">✕</button></div>'
    + '<div class="menupanel-grid">' + groups + '</div></div>';
  ov.onclick = function (e) { if (e.target === ov) closeMenuPanel(); };
  document.addEventListener('keydown', menuPanelEsc);
}
function closeMenuPanel() {
  var ov = document.getElementById('menupanel-ov');
  if (ov) ov.remove();
  document.removeEventListener('keydown', menuPanelEsc);
}
function menuPanelEsc(e) { if (e.key === 'Escape') closeMenuPanel(); }
