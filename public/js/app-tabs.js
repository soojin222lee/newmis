// ════════════════════════════════════════
//  화면 탭 — 브라우저 탭 방식 (최대 5개)          작성: 수진
// ════════════════════════════════════════
//
// PM이 여러 프로젝트를 오가며 작업할 때 화면을 탭으로 열어 두고 전환한다.
// - .main 상단에 탭 바를 주입하고, 공유 라우터 setScreen() 을 감싸(override) 활성 탭을 추적한다.
// - 현재 탭에서 메뉴 이동 = 그 탭 내용 변경(브라우저처럼). ＋ 로 새 탭을 열어 다른 프로젝트 화면을 띄운다.
// - 탭 전환 시 각 탭의 화면 DOM을 스냅샷·복원해 "왔다갔다해도 그대로" 유지한다.
// - 프로젝트 상세를 열면 탭에 "프로젝트번호 + 명칭"을 표시한다(tabTagProject). 같은 화면도 프로젝트별 탭.
// - 좌측 '전체 닫기'(휴지통)로 모든 탭을 닫고 홈 한 탭으로 초기화. 최대 5개.
// - 각 탭은 재진입 서술자(openDesc)를 보관해 즐겨찾기(favorites.js)가 저장·복원에 쓴다.

(function () {
  if (window.__APP_TABS_INIT) return;
  window.__APP_TABS_INIT = true;

  var MAX = 5;
  var tabs = [];            // { id, screenId, label, projNo, projName, openDesc, snap, scroll }
  var activeId = null;
  var seq = 0;
  var switching = false;

  var TAB_LABELS = {
    's-main': '홈',
    's-project-status': '프로젝트 현황',
    's-project-open': '프로젝트 개설 관리',
    's-si-project': '수주형 프로젝트',
    's-proposal-project': '제안 프로젝트',
    's-wg-project': 'W/G 프로젝트',
    's-internal-project': '사내 프로젝트',
    's-investment-project': '투자 프로젝트',
    's-advance-project': '선투입 프로젝트',
    's-ai-report': 'AI 레포트',
    's-custom-report': '맞춤 레포트',
    's-project-close': '프로젝트 종료',
    's-system-desc': '운영 가이드',
    's-master-config': '마스터 설정',
  };
  function labelFor(id) {
    if (id === 's-budget') {
      var m = (typeof costMode !== 'undefined') ? costMode : '';
      return m === 'adjust' ? '원가 조정' : m === 'history' ? '변경 이력' : '원가 현황';
    }
    return TAB_LABELS[id] || '화면';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(msg) { if (typeof showToast === 'function') showToast(msg); }

  function injectStyle() {
    if (document.getElementById('app-tabs-style')) return;
    var st = document.createElement('style'); st.id = 'app-tabs-style';
    st.textContent = `
     .app-tabbar{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:4px;padding:7px 12px 0;
       background:var(--sk-page,#f2f2ee);border-bottom:1px solid #dfe3ea;overflow-x:auto;scrollbar-width:thin}
     .app-tabbar::-webkit-scrollbar{height:5px}
     .app-tabbar::-webkit-scrollbar-thumb{background:#d4d8e0;border-radius:3px}
     .aptab-clear{flex:none;width:28px;height:28px;margin-right:4px;border:1px solid #e3e7ec;border-radius:8px;
       background:#fff;color:#94a3b8;cursor:pointer;font-size:13px;line-height:1;display:grid;place-items:center;font-family:inherit}
     .aptab-clear:hover{border-color:#dc2626;color:#dc2626;background:#fef2f2}
     .aptab{display:inline-flex;align-items:center;gap:7px;flex:1 1 auto;min-width:0;max-width:230px;
       border:1px solid #e3e7ec;border-bottom:none;border-radius:10px 10px 0 0;background:#f3f5f8;
       padding:8px 10px 8px 13px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:#5b6472;
       transition:background .12s,color .12s}
     .aptab:hover{background:#eaedf2}
     .aptab.on{background:#fff;color:#0f172a;border-color:#dfe3ea;box-shadow:0 -2px 6px -4px rgba(16,24,40,.12)}
     .aptab-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
     .aptab-no{font-weight:900;color:#1d4ed8;margin-right:5px}
     .aptab.on .aptab-no{color:#1d4ed8}
     .aptab-x{flex:none;width:17px;height:17px;border:0;border-radius:5px;background:transparent;color:#9aa3b2;
       cursor:pointer;font-size:13px;line-height:1;display:grid;place-items:center;font-family:inherit}
     .aptab-x:hover{background:#e2e6ec;color:#334155}
     .aptab.solo .aptab-x{display:none}
     .aptab-new{flex:none;width:30px;height:30px;margin-left:2px;border:1px solid #e3e7ec;border-radius:8px;
       background:#fff;color:#64748b;cursor:pointer;font-size:17px;line-height:1;display:grid;place-items:center;font-family:inherit}
     .aptab-new:hover{border-color:#1d4ed8;color:#1d4ed8}
     .aptab-new:disabled{opacity:.4;cursor:not-allowed;border-color:#e3e7ec;color:#9aa3b2}
    `;
    document.head.appendChild(st);
  }

  function ensureBar() {
    var bar = document.getElementById('app-tabbar');
    if (bar) return bar;
    var main = document.querySelector('.main') || document.querySelector('.content');
    if (!main) return null;
    bar = document.createElement('div');
    bar.id = 'app-tabbar';
    bar.className = 'app-tabbar';
    var content = main.querySelector('.content') || main.firstChild;
    main.insertBefore(bar, content);
    return bar;
  }

  function tabDisplay(t) {
    if (t.projName) {
      return (t.projNo ? '<b class="aptab-no">' + esc(t.projNo) + '</b>' : '') + esc(t.projName);
    }
    return esc(t.label);
  }

  function render() {
    var bar = ensureBar();
    if (!bar) return;
    var seen = {};
    var chips = tabs.map(function (t) {
      var key = t.projName ? ('p:' + t.projName) : ('s:' + t.label);
      seen[key] = (seen[key] || 0) + 1;
      var inner = tabDisplay(t);
      if (seen[key] > 1) inner += ' (' + seen[key] + ')';
      var on = t.id === activeId ? ' on' : '';
      var solo = tabs.length <= 1 ? ' solo' : '';
      return '<div class="aptab' + on + solo + '" onclick="__appTabsActivate(' + t.id + ')">'
        + '<span class="aptab-name">' + inner + '</span>'
        + '<button class="aptab-x" onclick="event.stopPropagation();__appTabsClose(' + t.id + ')" aria-label="탭 닫기">✕</button>'
        + '</div>';
    }).join('');
    var clear = '<button class="aptab-clear" onclick="__appTabsClearAll()" title="모든 탭 닫기" aria-label="모든 탭 닫기">🗑</button>';
    var plusDis = tabs.length >= MAX ? ' disabled' : '';
    var plus = '<button class="aptab-new" onclick="__appTabsNew()"' + plusDis + ' title="새 탭 (최대 ' + MAX + '개)" aria-label="새 탭">＋</button>';
    bar.innerHTML = clear + chips + plus;
  }

  function saveActive() {
    var t = tabs.find(function (x) { return x.id === activeId; });
    if (!t) return;
    var el = document.getElementById(t.screenId);
    if (el) { t.snap = el.innerHTML; t.scroll = el.scrollTop || 0; }
  }
  function restore(t) {
    var el = document.getElementById(t.screenId);
    if (el && t.snap != null) { el.innerHTML = t.snap; el.scrollTop = t.scroll || 0; }
  }

  function activate(id) {
    if (id === activeId) return;
    var t = tabs.find(function (x) { return x.id === id; });
    if (!t) return;
    saveActive();
    activeId = id;
    switching = true;
    if (typeof origSetScreen === 'function') origSetScreen(t.screenId);
    switching = false;
    restore(t);
    render();
  }

  function openNew() {
    if (tabs.length >= MAX) { toast('탭은 최대 ' + MAX + '개까지 열 수 있어요.'); return; }
    saveActive();
    var t = { id: ++seq, screenId: 's-main', label: '홈', projNo: null, projName: null, openDesc: { kind: 'screen', screenId: 's-main' }, snap: null, scroll: 0 };
    tabs.push(t);
    activeId = t.id;
    if (typeof showMain === 'function') showMain();
    else if (typeof origSetScreen === 'function') origSetScreen('s-main');
    render();
  }

  function closeTab(id) {
    if (tabs.length <= 1) return;
    var idx = tabs.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    var wasActive = (id === activeId);
    tabs.splice(idx, 1);
    if (wasActive) {
      var next = tabs[Math.min(idx, tabs.length - 1)];
      activeId = next.id;
      switching = true;
      if (typeof origSetScreen === 'function') origSetScreen(next.screenId);
      switching = false;
      restore(next);
    }
    render();
  }

  function clearAll() {
    tabs = [];
    seq = 0;
    switching = true;
    if (typeof origSetScreen === 'function') origSetScreen('s-main');
    switching = false;
    if (typeof showMain === 'function') { /* 홈 새로 렌더 */ }
    var t = { id: ++seq, screenId: 's-main', label: '홈', projNo: null, projName: null, openDesc: { kind: 'screen', screenId: 's-main' }, snap: null, scroll: 0 };
    tabs = [t];
    activeId = t.id;
    if (typeof showMain === 'function') showMain();
    render();
  }

  // ── setScreen 래핑 ──
  var origSetScreen = window.setScreen;
  window.setScreen = function (id) {
    if (switching || !tabs.length) { if (typeof origSetScreen === 'function') origSetScreen(id); return; }
    var t = tabs.find(function (x) { return x.id === activeId; });
    if (t) {
      t.screenId = id;
      t.label = labelFor(id);
      t.projNo = null; t.projName = null;          // 새 화면 이동 = 프로젝트 태그 해제
      t.openDesc = { kind: 'screen', screenId: id };
      t.snap = null;
    }
    if (typeof origSetScreen === 'function') origSetScreen(id);
    render();
  };

  // ── 외부 연동 API ──
  // 프로젝트 상세를 열 때 활성 탭에 번호+명칭 태깅 + 재진입 서술자 저장
  window.tabTagProject = function (no, name, openDesc) {
    var t = tabs.find(function (x) { return x.id === activeId; });
    if (!t) return;
    t.projNo = no || null;
    t.projName = name || null;
    if (openDesc) t.openDesc = openDesc;
    render();
  };
  // 활성 탭의 현재 서술자/라벨 (즐겨찾기 '현재 화면 추가' 용)
  window.tabCurrentDesc = function () {
    var t = tabs.find(function (x) { return x.id === activeId; });
    if (!t) return null;
    var label = t.projName ? ((t.projNo ? t.projNo + ' ' : '') + t.projName) : t.label;
    return { label: label, openDesc: t.openDesc || { kind: 'screen', screenId: t.screenId } };
  };
  // 서술자로 화면 재진입 (즐겨찾기 열기) — 현재 탭에서 이동
  window.tabReopen = function (desc) {
    if (!desc) return;
    try {
      if (desc.kind === 'psvDetail' && typeof psvOpenDetail === 'function') { psvOpenDetail(desc.type, desc.key); return; }
      if (desc.kind === 'popenDetail') { if (typeof showProjectOpen === 'function') showProjectOpen(); if (typeof popenOpenDetail === 'function') popenOpenDetail(desc.id); return; }
      if (desc.kind === 'budget') {
        var OPEN = { adjust: 'openCostAdjust', history: 'openCostHistory', status: 'openCostStatus' };
        var ofn = OPEN[desc.costMode] || 'openCostStatus';
        if (typeof window[ofn] === 'function') { window[ofn](desc.key); return; }
      }
      if (desc.kind === 'screen') {
        var SHOW = {
          's-main': 'showMain', 's-project-status': 'showProjectStatus', 's-project-open': 'showProjectOpen',
          's-ai-report': 'showAiReport', 's-custom-report': 'showCustomReport', 's-project-close': 'showProjectClose',
          's-si-project': 'showSIProject', 's-proposal-project': 'showProposalProject', 's-wg-project': 'showWGProject',
          's-internal-project': 'showInternalProject', 's-investment-project': 'showInvestmentProject', 's-advance-project': 'showAdvanceProject',
        };
        var fn = SHOW[desc.screenId];
        if (fn && typeof window[fn] === 'function') { window[fn](); return; }
        if (typeof origSetScreen === 'function') origSetScreen(desc.screenId);
      }
    } catch (e) {}
  };

  window.__appTabsActivate = activate;
  window.__appTabsClose = closeTab;
  window.__appTabsNew = openNew;
  window.__appTabsClearAll = clearAll;

  // ── 원가(예산) 화면은 setScreen 대신 activateBudgetScreenFinal 로 전환하므로
  //    최종 openBudgetProjectScreen 을 감싸(데코레이터) 활성 탭을 s-budget + 프로젝트명으로 갱신 ──
  function budgetProjInfo(k) {
    try {
      if (typeof HOME_PROJECTS !== 'undefined') { var hp = HOME_PROJECTS.find(function (p) { return p.id === k; }); if (hp) return { no: hp.no, name: hp.name }; }
      if (typeof BUDGET_PROJ_META !== 'undefined' && BUDGET_PROJ_META[k]) return { no: '', name: BUDGET_PROJ_META[k].name };
    } catch (e) {}
    return null;
  }
  // ── 프로젝트 열기 힌트 ──
  // 같은 프로젝트 탭이 이미 있으면 그 탭을 포커스, 없으면 새 탭을 띄운다(최대치면 현재 탭 사용).
  // 호출 뒤 호출자가 실제 화면을 렌더(show*/setScreen/orig)하면 활성 탭이 그 화면으로 채워진다.
  function tabOpenProjectHint(desc) {
    if (!desc) return;
    var sig = JSON.stringify(desc);
    var existing = null;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].openDesc && JSON.stringify(tabs[i].openDesc) === sig) { existing = tabs[i]; break; }
    }
    if (existing) {
      if (existing.id !== activeId) {
        saveActive();
        activeId = existing.id;
        switching = true;
        if (typeof origSetScreen === 'function') origSetScreen(existing.screenId);
        switching = false;
      }
      return;
    }
    var cur = tabs.find(function (t) { return t.id === activeId; });
    var freshHome = cur && cur.screenId === 's-main' && !cur.projName;   // 갓 연 홈 탭이면 재사용
    if (freshHome) return;
    if (tabs.length < MAX) {
      saveActive();
      var t = { id: ++seq, screenId: 's-main', label: '홈', projNo: null, projName: null, openDesc: null, snap: null, scroll: 0 };
      tabs.push(t);
      activeId = t.id;
      render();
      return;
    }
    toast('탭 ' + MAX + '개가 모두 열려 있어 현재 탭에서 엽니다.');
  }
  window.tabOpenProjectHint = tabOpenProjectHint;

  function wrapBudgetOpener() {
    if (window.__tabsBudgetWrapped || typeof window.openBudgetProjectScreen !== 'function') return;
    var orig = window.openBudgetProjectScreen;
    window.openBudgetProjectScreen = function (k) {
      var desc = { kind: 'budget', key: k, costMode: (typeof costMode !== 'undefined' ? costMode : 'status') };
      if (!switching) tabOpenProjectHint(desc);
      var ret = orig.apply(this, arguments);
      try {
        if (!switching) {
          var t = tabs.find(function (x) { return x.id === activeId; });
          if (t) {
            t.screenId = 's-budget';
            t.snap = null;
            var info = budgetProjInfo(k);
            if (info) { t.projNo = info.no || null; t.projName = info.name; }
            else { t.projNo = null; t.projName = null; t.label = labelFor('s-budget'); }
            t.openDesc = desc;
            render();
          }
        }
      } catch (e) {}
      return ret;
    };
    window.__tabsBudgetWrapped = true;
  }

  function init() {
    injectStyle();
    wrapBudgetOpener();
    var cur = document.querySelector('.screen.active');
    var sid = cur ? cur.id : 's-main';
    tabs = [{ id: ++seq, screenId: sid, label: labelFor(sid), projNo: null, projName: null, openDesc: { kind: 'screen', screenId: sid }, snap: null, scroll: 0 }];
    activeId = tabs[0].id;
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
